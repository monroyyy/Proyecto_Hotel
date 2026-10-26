package com.ico.hotel.services;

import com.ico.hotel.dto.ReservaRequest;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Huesped;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HuespedRepository;
import com.ico.hotel.repository.ReservaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Lógica de negocio de reservaciones (docs/03_reglas_de_negocio.md).
 */
@Service
public class ReservaService {

    private static final BigDecimal FACTOR_TEMPORADA_ALTA = new BigDecimal("1.25");
    private static final BigDecimal CARGO_CUNA = new BigDecimal("100");
    private static final BigDecimal CARGO_CAMA_EXTRA = new BigDecimal("250");
    private static final LocalTime HORA_CHECKIN = LocalTime.of(15, 0);

    @Autowired
    private ReservaRepository reservaRepository;
    @Autowired
    private HabitacionRepository habitacionRepository;
    @Autowired
    private HuespedRepository huespedRepository;
    @Autowired
    private com.ico.hotel.repository.RecepcionistaRepository recepcionistaRepository;

    public static final String ESTADO_PENDIENTE = "Pendiente";
    public static final String ESTADO_OCUPADA = "Ocupada";
    public static final String ESTADO_DISPONIBLE = "Disponible";

    /**
     * Refleja el estado de las reservas activas en el estado de la habitación:
     * Confirmada/Ocupada -> "Ocupada"; Pre-reserva -> "Pendiente"; sin reservas -> "Disponible".
     * Mantenimiento nunca se sobrescribe.
     */
    private void sincronizarEstadoHabitacion(Habitacion h) {
        String actual = h.getEstado() == null ? "" : h.getEstado();
        if ("Mantenimiento".equalsIgnoreCase(actual)) return;
        List<Reserva> activas = reservaRepository.findActivasByHabitacion(h.getIdHabitacion());
        String nuevo;
        if (activas.stream().anyMatch(r -> Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))) {
            nuevo = ESTADO_OCUPADA;
        } else if (!activas.isEmpty()) {
            nuevo = ESTADO_PENDIENTE;
        } else {
            nuevo = ESTADO_DISPONIBLE;
        }
        if (!nuevo.equals(actual)) {
            h.setEstado(nuevo);
            habitacionRepository.save(h);
        }
    }

    @jakarta.annotation.PostConstruct
    @Transactional
    public void sincronizarAlIniciar() {
        for (Habitacion h : habitacionRepository.findAll()) {
            sincronizarEstadoHabitacion(h);
        }
    }

    // ------------------------------------------------------------------
    // Tarifas (RN-14)
    // ------------------------------------------------------------------

    /** Temporada alta: julio, agosto, diciembre y semana santa aproximada (no incluida). */
    public boolean esTemporadaAlta(LocalDate noche) {
        int m = noche.getMonthValue();
        return m == 7 || m == 8 || m == 12;
    }

    public Map<String, Object> calcularTarifa(Habitacion hab, LocalDate entrada, LocalDate salida,
                                              boolean cuna, boolean camaExtra) {
        BigDecimal base = hab.getTipoHabitacion().getPrecioBase();
        BigDecimal subtotal = BigDecimal.ZERO;
        int nochesAltas = 0;
        int noches = 0;
        for (LocalDate d = entrada; d.isBefore(salida); d = d.plusDays(1)) {
            noches++;
            if (esTemporadaAlta(d)) {
                nochesAltas++;
                subtotal = subtotal.add(base.multiply(FACTOR_TEMPORADA_ALTA));
            } else {
                subtotal = subtotal.add(base);
            }
        }
        BigDecimal extras = BigDecimal.ZERO;
        if (cuna) extras = extras.add(CARGO_CUNA.multiply(BigDecimal.valueOf(noches)));
        if (camaExtra) extras = extras.add(CARGO_CAMA_EXTRA.multiply(BigDecimal.valueOf(noches)));

        BigDecimal total = subtotal.add(extras).setScale(2, RoundingMode.HALF_UP);
        BigDecimal anticipo = total.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("noches", noches);
        r.put("nochesTemporadaAlta", nochesAltas);
        r.put("tarifaBase", base);
        r.put("subtotalHospedaje", subtotal.setScale(2, RoundingMode.HALF_UP));
        r.put("extras", extras.setScale(2, RoundingMode.HALF_UP));
        r.put("total", total);
        r.put("anticipoRequerido", anticipo);
        return r;
    }

    // ------------------------------------------------------------------
    // Disponibilidad (HU-04, RN-13)
    // ------------------------------------------------------------------

    public void validarFechas(LocalDate entrada, LocalDate salida) {
        if (entrada == null || salida == null) {
            throw new IllegalArgumentException("Debe indicar fecha de entrada y de salida.");
        }
        if (!salida.isAfter(entrada)) {
            throw new IllegalArgumentException("La fecha de salida debe ser posterior a la de entrada.");
        }
        if (entrada.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("La fecha de entrada no puede estar en el pasado.");
        }
    }

    public List<Map<String, Object>> buscarDisponibles(Integer idHotel, LocalDate entrada, LocalDate salida,
                                                       int ocupantes, boolean camaExtra, boolean plantaBaja,
                                                       boolean cuna) {
        validarFechas(entrada, salida);
        expirarPreReservas();
        Set<Integer> ocupadas = new HashSet<>(reservaRepository.findHabitacionesOcupadas(entrada, salida));
        Set<Integer> conReserva = new HashSet<>(reservaRepository.findHabitacionesConReservaActiva());

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Habitacion h : habitacionRepository.findAll()) {
            if (h.getHotel() == null || Boolean.FALSE.equals(h.getHotel().getActivo())) continue;
            if (idHotel != null && !h.getHotel().getIdHotel().equals(idHotel)) continue;
            if (ocupadas.contains(h.getIdHabitacion())) continue;
            if (!habitacionVendible(h, entrada)) continue;
            int capacidad = h.getTipoHabitacion().getCapacidad() + (camaExtra ? 1 : 0);
            if (ocupantes > capacidad) continue;
            // RN-13: planta baja con prioridad para movilidad reducida / adultos mayores.
            // Si se solicita, solo se muestran las de piso 1; si no, se muestran todas marcando las de planta baja.
            boolean esPlantaBaja = h.getPiso() != null && h.getPiso() == 1;
            if (plantaBaja && !esPlantaBaja) continue;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("habitacion", h);
            item.put("plantaBaja", esPlantaBaja);
            item.put("tarifa", calcularTarifa(h, entrada, salida, cuna, camaExtra));
            resultado.add(item);
        }
        resultado.sort(Comparator.comparing(m -> ((Habitacion) m.get("habitacion")).getTipoHabitacion().getPrecioBase()));
        return resultado;
    }

    /**
     * Determina si la fecha de entrada corresponde al horizonte operativo inmediato (hoy y próximas 48 horas).
     * En esta ventana, las habitaciones con estado 'Mantenimiento' u 'Ocupada' sin reservación activa están fuera de servicio.
     * Para fechas futuras (ej. 30 de octubre), los mantenimientos temporales habrán concluido y la habitación estará
     * lista para recibir huéspedes salvo que exista un traslape con otra reservación.
     */
    private boolean esHorizonteInmediato(LocalDate entrada) {
        LocalDate hoyLocal = LocalDate.now();
        LocalDate hoyUtc = LocalDate.now(java.time.ZoneOffset.UTC);
        LocalDate hoyBase = hoyLocal.isAfter(hoyUtc) ? hoyLocal : hoyUtc;
        // Ventana inmediata de 48 horas (cubre el día de hoy, el turno actual y la siguiente jornada de mantenimiento)
        LocalDate limiteInmediato = hoyBase.plusDays(1);
        return !entrada.isAfter(limiteInmediato);
    }

    private boolean habitacionVendible(Habitacion h, LocalDate entrada) {
        String e = h.getEstado() == null ? "" : h.getEstado();
        boolean inmediata = esHorizonteInmediato(entrada);
        if (inmediata && ("Mantenimiento".equalsIgnoreCase(e) || ESTADO_OCUPADA.equalsIgnoreCase(e) || ESTADO_PENDIENTE.equalsIgnoreCase(e))) {
            return false;
        }
        return true;
    }

    // ------------------------------------------------------------------
    // Crear reservación (HU-05, HU-06)
    // ------------------------------------------------------------------

    @Transactional
    public Reserva crear(ReservaRequest req) {
        validarFechas(req.getFechaEntrada(), req.getFechaSalida());

        if (req.getNombre() == null || req.getNombre().trim().length() < 3) {
            throw new IllegalArgumentException("El nombre completo del huésped es obligatorio.");
        }
        String tel = req.getTelefono() == null ? "" : req.getTelefono().replaceAll("\\D", "");
        if (tel.length() != 10) {
            throw new IllegalArgumentException("El teléfono debe tener exactamente 10 dígitos.");
        }
        if (req.getEmail() == null || !req.getEmail().trim().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new IllegalArgumentException("El correo electrónico no tiene un formato válido.");
        }
        int adultos = req.getAdultos() == null ? 0 : req.getAdultos();
        int ninos = req.getNinos() == null ? 0 : req.getNinos();
        if (adultos < 1) {
            throw new IllegalArgumentException("Debe haber al menos un adulto.");
        }
        if (ninos < 0) {
            throw new IllegalArgumentException("Número de niños inválido.");
        }
        if (req.getIdHabitacion() == null) {
            throw new IllegalArgumentException("Debe seleccionar una habitación.");
        }
        if (req.getRecepcionista() == null || req.getRecepcionista().isBlank()) {
            throw new IllegalArgumentException("Debe seleccionar el recepcionista que registra la reservación.");
        }
        String recepcionista = recepcionistaRepository.findByNombreIgnoreCase(req.getRecepcionista().trim())
                .filter(x -> !Boolean.FALSE.equals(x.getActivo()))
                .orElseThrow(() -> new IllegalArgumentException("El recepcionista seleccionado no existe o está inactivo."))
                .getNombre();

        // Bloqueo pesimista: serializa reservas concurrentes sobre la misma habitación (RNF-02)
        Habitacion hab = habitacionRepository.findByIdForUpdate(req.getIdHabitacion())
                .orElseThrow(() -> new IllegalArgumentException("La habitación seleccionada no existe."));
        if (hab.getHotel() != null && Boolean.FALSE.equals(hab.getHotel().getActivo())) {
            throw new IllegalArgumentException("El hotel de la habitación está inactivo.");
        }
        if (!habitacionVendible(hab, req.getFechaEntrada())) {
            throw new IllegalArgumentException("La habitación no está disponible para venta (" + hab.getEstado() + ").");
        }
        boolean camaExtra = Boolean.TRUE.equals(req.getCamaExtra());
        boolean cuna = Boolean.TRUE.equals(req.getCuna());
        int capacidad = hab.getTipoHabitacion().getCapacidad() + (camaExtra ? 1 : 0);
        if (adultos + ninos > capacidad) {
            throw new IllegalArgumentException("La habitación admite máximo " + capacidad + " ocupantes.");
        }

        expirarPreReservas();
        if (!reservaRepository.findTraslapes(hab.getIdHabitacion(), req.getFechaEntrada(), req.getFechaSalida()).isEmpty()) {
            throw new IllegalStateException("La habitación ya fue reservada en esas fechas. Actualice la disponibilidad.");
        }

        Map<String, Object> tarifa = calcularTarifa(hab, req.getFechaEntrada(), req.getFechaSalida(), cuna, camaExtra);
        BigDecimal total = (BigDecimal) tarifa.get("total");
        BigDecimal minimo = (BigDecimal) tarifa.get("anticipoRequerido");

        boolean confirmada = "CONFIRMADA".equalsIgnoreCase(req.getModalidad());
        Reserva r = new Reserva();
        r.setFechaCreacion(LocalDateTime.now());
        r.setHuesped(obtenerHuesped(req, tel));
        r.setHabitacion(hab);
        r.setFechaEntrada(req.getFechaEntrada());
        r.setFechaSalida(req.getFechaSalida());
        r.setNoches((Integer) tarifa.get("noches"));
        r.setAdultos(adultos);
        r.setNinos(ninos);
        r.setCuna(cuna);
        r.setCamaExtra(camaExtra);
        r.setPlantaBajaSolicitada(Boolean.TRUE.equals(req.getPlantaBajaSolicitada()));
        r.setObservaciones(req.getObservaciones());
        r.setTotal(total);
        r.setRecepcionista(recepcionista);

        if (confirmada) {
            BigDecimal anticipo = validarAnticipo(req.getAnticipo(), minimo, total, req.getMetodoPago());
            r.setEstado(Reserva.CONFIRMADA);
            r.setAnticipo(anticipo);
            r.setSaldo(total.subtract(anticipo));
            r.setMetodoPago(req.getMetodoPago());
        } else {
            int horas = (req.getHorasVigencia() != null && req.getHorasVigencia() == 48) ? 48 : 24;
            r.setEstado(Reserva.PRE_RESERVA);
            r.setAnticipo(BigDecimal.ZERO);
            r.setSaldo(total);
            r.setFechaExpiracion(LocalDateTime.now().plusHours(horas));
        }

        r = reservaRepository.save(r);
        r.setFolio(String.format("HP-%d-%05d", LocalDate.now().getYear(), r.getIdReserva()));
        r = reservaRepository.save(r);
        sincronizarEstadoHabitacion(hab);
        return r;
    }

    private Huesped obtenerHuesped(ReservaRequest req, String tel) {
        String email = req.getEmail().trim().toLowerCase();
        Huesped h = null;
        if (req.getIdHuesped() != null) {
            h = huespedRepository.findById(req.getIdHuesped()).orElse(null);
        }
        if (h == null) {
            h = huespedRepository.findFirstByEmailIgnoreCase(email).orElseGet(Huesped::new);
        }
        h.setNombre(req.getNombre().trim());
        h.setTelefono(tel);
        h.setEmail(email);
        return huespedRepository.save(h);
    }

    private BigDecimal validarAnticipo(BigDecimal anticipo, BigDecimal minimo, BigDecimal total, String metodo) {
        if (anticipo == null) {
            throw new IllegalArgumentException("Debe capturar el monto del anticipo.");
        }
        if (metodo == null || metodo.isBlank()) {
            throw new IllegalArgumentException("Debe indicar el método de pago.");
        }
        anticipo = anticipo.setScale(2, RoundingMode.HALF_UP);
        if (anticipo.compareTo(minimo) < 0) {
            throw new IllegalArgumentException("El anticipo debe cubrir al menos el 50% del total ($" + minimo + ").");
        }
        if (anticipo.compareTo(total) > 0) {
            throw new IllegalArgumentException("El anticipo no puede exceder el total de la estancia.");
        }
        return anticipo;
    }

    // ------------------------------------------------------------------
    // Confirmar pre-reserva con anticipo
    // ------------------------------------------------------------------

    @Transactional
    public Reserva confirmar(Integer id, BigDecimal anticipo, String metodoPago) {
        Reserva r = reservaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        if (!Reserva.PRE_RESERVA.equals(r.getEstado())) {
            throw new IllegalStateException("Solo se pueden confirmar reservaciones en estado Pre-reserva.");
        }
        if (r.getFechaExpiracion() != null && r.getFechaExpiracion().isBefore(LocalDateTime.now())) {
            expirarPreReservas();
            throw new IllegalStateException("La pre-reserva ya venció y la habitación fue liberada.");
        }
        BigDecimal minimo = r.getTotal().multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal pagado = validarAnticipo(anticipo, minimo, r.getTotal(), metodoPago);
        r.setEstado(Reserva.CONFIRMADA);
        r.setAnticipo(pagado);
        r.setSaldo(r.getTotal().subtract(pagado));
        r.setMetodoPago(metodoPago);
        r.setFechaExpiracion(null);
        r = reservaRepository.save(r);
        sincronizarEstadoHabitacion(r.getHabitacion());
        return r;
    }

    // ------------------------------------------------------------------
    // Cancelación y reembolso (HU-03, RN políticas)
    // ------------------------------------------------------------------

    public int porcentajeReembolso(Reserva r) {
        long horas = Duration.between(LocalDateTime.now(), r.getFechaEntrada().atTime(HORA_CHECKIN)).toHours();
        if (horas > 72) return 100;
        if (horas >= 48) return 50;
        return 0;
    }

    public BigDecimal montoReembolso(Reserva r) {
        BigDecimal anticipo = r.getAnticipo() == null ? BigDecimal.ZERO : r.getAnticipo();
        return anticipo.multiply(BigDecimal.valueOf(porcentajeReembolso(r))).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    @Transactional
    public Reserva cancelar(Integer id, String titular, String banco, String clabe) {
        Reserva r = reservaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        if (!Reserva.PRE_RESERVA.equals(r.getEstado()) && !Reserva.CONFIRMADA.equals(r.getEstado())) {
            throw new IllegalStateException("Solo se pueden cancelar reservaciones en Pre-reserva o Confirmada.");
        }
        BigDecimal reembolso = Reserva.CONFIRMADA.equals(r.getEstado()) ? montoReembolso(r) : BigDecimal.ZERO;
        if (reembolso.signum() > 0) {
            if (titular == null || titular.isBlank() || banco == null || banco.isBlank()) {
                throw new IllegalArgumentException("Para tramitar el reembolso capture titular y banco.");
            }
            if (clabe == null || !clabe.matches("\\d{18}")) {
                throw new IllegalArgumentException("La CLABE interbancaria debe tener exactamente 18 dígitos.");
            }
            r.setTitularReembolso(titular.trim());
            r.setBancoReembolso(banco.trim());
            r.setClabeReembolso(clabe);
        }
        r.setMontoReembolso(reembolso);
        r.setEstado(Reserva.CANCELADA);
        r.setFechaCancelacion(LocalDateTime.now());
        r.setFechaExpiracion(null);
        r = reservaRepository.save(r);
        sincronizarEstadoHabitacion(r.getHabitacion());
        return r;
    }

    // ------------------------------------------------------------------
    // Expiración automática de pre-reservas (RN-02, HU-05)
    // ------------------------------------------------------------------

    @Scheduled(fixedRate = 15 * 60 * 1000)
    @Transactional
    public int expirarPreReservas() {
        List<Reserva> vencidas = reservaRepository.findPreReservasVencidas(LocalDateTime.now());
        for (Reserva r : vencidas) {
            r.setEstado(Reserva.CANCELADA);
            r.setFechaCancelacion(LocalDateTime.now());
            r.setMontoReembolso(BigDecimal.ZERO);
            String obs = r.getObservaciones() == null ? "" : r.getObservaciones() + " | ";
            r.setObservaciones(obs + "Liberada automáticamente por vencimiento de pre-reserva.");
        }
        reservaRepository.saveAll(vencidas);
        vencidas.stream().map(Reserva::getHabitacion).distinct().forEach(this::sincronizarEstadoHabitacion);
        return vencidas.size();
    }
}
