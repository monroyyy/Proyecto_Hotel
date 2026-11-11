package com.ico.hotel.services;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.dto.ReservaRequest;
import com.ico.hotel.exceptions.ConflictoEstanciaException;
import com.ico.hotel.exceptions.ReglaEstanciaException;
import com.ico.hotel.exceptions.TransicionEstadoInvalidaException;
import com.ico.hotel.models.EstadoReserva;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Huesped;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.ReservaEvento;
import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HuespedRepository;
import com.ico.hotel.repository.ReservaEventoRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.repository.UsuarioRepository;
import com.ico.hotel.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Lógica de negocio de reservaciones (docs/03_reglas_de_negocio.md)
 * con control de acceso y propiedad por rol (HUESPED vs ADMINISTRADOR).
 */
@Service
public class ReservaService {

    private static final BigDecimal FACTOR_TEMPORADA_ALTA = new BigDecimal("1.25");
    private static final BigDecimal CARGO_CUNA = new BigDecimal("100");
    private static final BigDecimal CARGO_CAMA_EXTRA = new BigDecimal("250");
    private static final LocalTime HORA_CHECKIN = LocalTime.of(15, 0);
    private static final LocalTime HORA_CHECKOUT = LocalTime.of(12, 0);

    @Autowired
    private ReservaRepository reservaRepository;
    @Autowired
    private HabitacionRepository habitacionRepository;
    @Autowired
    private HuespedRepository huespedRepository;
    @Autowired
    private com.ico.hotel.repository.RecepcionistaRepository recepcionistaRepository;
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private ReservaEventoRepository reservaEventoRepository;
    @Autowired(required = false)
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;
    @Autowired(required = false)
    private Clock clock;

    public static final String ESTADO_PENDIENTE = "Pendiente";
    public static final String ESTADO_OCUPADA = "Ocupada";
    public static final String ESTADO_DISPONIBLE = "Disponible";
    private static final LocalTime HORA_LIMITE_NOSHOW = LocalTime.of(22, 0);

    private Clock clockActual() {
        return clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
    }

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    private void registrarEvento(Integer idReserva, String tipo, String estadoAnterior, String estadoNuevo, String detalle) {
        CustomUserDetails actual = obtenerUsuarioActual();
        String actor = (actual != null && actual.getEmail() != null) ? actual.getEmail() : "SISTEMA";
        registrarEvento(idReserva, tipo, estadoAnterior, estadoNuevo, actor, LocalDateTime.now(clockActual()), detalle);
    }

    private void registrarEvento(Integer idReserva, String tipo, String estadoAnterior, String estadoNuevo,
                                 String actor, LocalDateTime fechaHora, String detalle) {
        if (reservaEventoRepository == null || idReserva == null) return;
        ReservaEvento ev = ReservaEvento.builder()
                .idReserva(idReserva)
                .tipo(tipo)
                .estadoAnterior(estadoAnterior)
                .estadoNuevo(estadoNuevo)
                .usuario(actor != null ? actor : "SISTEMA")
                .fechaHora(fechaHora != null ? fechaHora : LocalDateTime.now(clockActual()))
                .detalle(detalle)
                .build();
        reservaEventoRepository.save(ev);
    }

    /**
     * Obtiene el usuario autenticado actual desde el SecurityContext (si existe).
     */
    public CustomUserDetails obtenerUsuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        return null;
    }

    /**
     * Verifica si el usuario autenticado es dueño de la reservación o es ADMINISTRADOR.
     * Lanza AccessDeniedException (403 Forbidden) si un HUESPED intenta acceder a una reserva ajena.
     */
    public void validarAccesoReserva(Reserva r, CustomUserDetails user) {
        if (user == null) {
            user = obtenerUsuarioActual();
        }
        if (user == null) {
            throw new AccessDeniedException("Debe iniciar sesión para acceder a esta reservación.");
        }
        if (user.isStaff()) {
            return;
        }
        boolean coincideIdUsuario = r.getUsuario() != null
                && r.getUsuario().getIdUsuario() != null
                && r.getUsuario().getIdUsuario().equals(user.getIdUsuario());
        boolean coincideEmailHuesped = r.getHuesped() != null
                && r.getHuesped().getEmail() != null
                && r.getHuesped().getEmail().trim().equalsIgnoreCase(user.getEmail().trim());

        if (!coincideIdUsuario && !coincideEmailHuesped) {
            throw new AccessDeniedException("No tiene permiso para consultar o modificar una reservación que pertenece a otro huésped.");
        }
    }

    /**
     * Refleja el estado de las reservas activas hoy en el estado físico de la habitación:
     * - Ocupada o Confirmada vigente hoy (fechaEntrada <= hoy < fechaSalida) -> "Ocupada"
     * - Pre-reserva vigente hoy (fechaEntrada <= hoy < fechaSalida) -> "Pendiente"
     * - Reservas futuras no marcan la habitación como Ocupada hoy, pero siguen bloqueando periodosOcupados/findTraslapes.
     * - Mantenimiento nunca se sobrescribe.
     */
    private void sincronizarEstadoHabitacion(Habitacion h) {
        if (h == null) return;
        String actual = h.getEstado() == null ? "" : h.getEstado();
        if ("Mantenimiento".equalsIgnoreCase(actual)) return;
        List<Reserva> activas = reservaRepository.findActivasByHabitacion(h.getIdHabitacion());
        LocalDate hoy = LocalDate.now(clockActual());

        boolean ocupadaAhora = activas.stream().anyMatch(r ->
                Reserva.OCUPADA.equals(r.getEstado())
                || (Reserva.CONFIRMADA.equals(r.getEstado())
                    && r.getFechaEntrada() != null && r.getFechaSalida() != null
                    && !hoy.isBefore(r.getFechaEntrada()) && hoy.isBefore(r.getFechaSalida()))
        );

        boolean pendienteAhora = !ocupadaAhora && activas.stream().anyMatch(r ->
                Reserva.PRE_RESERVA.equals(r.getEstado())
                && r.getFechaEntrada() != null && r.getFechaSalida() != null
                && !hoy.isBefore(r.getFechaEntrada()) && hoy.isBefore(r.getFechaSalida())
        );

        String nuevo = ocupadaAhora ? ESTADO_OCUPADA
                : (pendienteAhora ? ESTADO_PENDIENTE : ESTADO_DISPONIBLE);
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

    /**
     * Enriquecer una lista de habitaciones con sus fechas de ocupación, desocupación y periodos reservados activos.
     */
    @Transactional(readOnly = true)
    public void enriquecerHabitaciones(List<Habitacion> habitaciones) {
        if (habitaciones == null || habitaciones.isEmpty()) return;
        LocalDate hoy = LocalDate.now(clockActual());
        List<Reserva> activas = reservaRepository.findAllActivasOrdenadas();
        Map<Integer, List<Reserva>> porHabitacion = new HashMap<>();
        for (Reserva r : activas) {
            if (r.getHabitacion() == null || r.getHabitacion().getIdHabitacion() == null) continue;
            if (r.getFechaSalida() != null && r.getFechaSalida().isBefore(hoy)) continue;
            porHabitacion.computeIfAbsent(r.getHabitacion().getIdHabitacion(), k -> new ArrayList<>()).add(r);
        }

        for (Habitacion h : habitaciones) {
            List<Reserva> reservasHab = porHabitacion.getOrDefault(h.getIdHabitacion(), List.of());
            aplicarEnriquecimiento(h, reservasHab, hoy);
        }
    }

    @Transactional(readOnly = true)
    public void enriquecerHabitacion(Habitacion h) {
        if (h == null || h.getIdHabitacion() == null) return;
        LocalDate hoy = LocalDate.now(clockActual());
        List<Reserva> reservasHab = reservaRepository.findActivasByHabitacion(h.getIdHabitacion()).stream()
                .filter(r -> r.getFechaSalida() == null || !r.getFechaSalida().isBefore(hoy))
                .toList();
        aplicarEnriquecimiento(h, reservasHab, hoy);
    }

    private void aplicarEnriquecimiento(Habitacion h, List<Reserva> reservasHab, LocalDate hoy) {
        if (reservasHab == null || reservasHab.isEmpty()) {
            h.setFechaOcupacionInicio(null);
            h.setFechaOcupacionFin(null);
            h.setOcupadaHoy(false);
            h.setEstadoReservaActiva(null);
            h.setFolioActivo(null);
            h.setIdReservaActiva(null);
            h.setDiaExtraDisponible(false);
            h.setCostoDiaExtra(BigDecimal.ZERO);
            h.setNuevaFechaDesocupacion(null);
            h.setPeriodosOcupados(List.of());
            return;
        }

        List<Map<String, Object>> periodos = new ArrayList<>();
        for (Reserva r : reservasHab) {
            boolean enCurso = r.getFechaEntrada() != null && r.getFechaSalida() != null
                    && !hoy.isBefore(r.getFechaEntrada()) && hoy.isBefore(r.getFechaSalida());
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("idReserva", r.getIdReserva());
            p.put("folio", r.getFolio());
            p.put("estado", r.getEstado());
            p.put("fechaEntrada", r.getFechaEntrada() != null ? r.getFechaEntrada().toString() : null);
            p.put("fechaSalida", r.getFechaSalida() != null ? r.getFechaSalida().toString() : null);
            p.put("noches", r.getNoches());
            p.put("enCursoHoy", enCurso);
            periodos.add(p);
        }
        h.setPeriodosOcupados(periodos);

        Reserva principal = reservasHab.stream()
                .filter(r -> (Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))
                        && r.getFechaEntrada() != null && r.getFechaSalida() != null
                        && !hoy.isBefore(r.getFechaEntrada()) && hoy.isBefore(r.getFechaSalida()))
                .findFirst()
                .orElseGet(() -> reservasHab.stream()
                        .filter(r -> Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))
                        .findFirst()
                        .orElse(reservasHab.get(0)));

        boolean enCursoHoy = principal.getFechaEntrada() != null && principal.getFechaSalida() != null
                && !hoy.isBefore(principal.getFechaEntrada()) && hoy.isBefore(principal.getFechaSalida());

        h.setFechaOcupacionInicio(principal.getFechaEntrada());
        h.setFechaOcupacionFin(principal.getFechaSalida());
        h.setOcupadaHoy(enCursoHoy);
        h.setEstadoReservaActiva(principal.getEstado());
        h.setFolioActivo(principal.getFolio());
        h.setIdReservaActiva(principal.getIdReserva());

        boolean esHabitacionOcupada = ESTADO_OCUPADA.equalsIgnoreCase(h.getEstado())
                && (Reserva.CONFIRMADA.equals(principal.getEstado()) || Reserva.OCUPADA.equals(principal.getEstado()))
                && principal.getFechaSalida() != null;

        if (esHabitacionOcupada) {
            LocalDate salidaActual = principal.getFechaSalida();
            LocalDate diaSiguiente = salidaActual.plusDays(1);
            boolean traslapeDiaSiguiente = reservasHab.stream()
                    .anyMatch(otra -> !Objects.equals(otra.getIdReserva(), principal.getIdReserva())
                            && otra.getFechaEntrada() != null && otra.getFechaSalida() != null
                            && otra.getFechaEntrada().isBefore(diaSiguiente)
                            && otra.getFechaSalida().isAfter(salidaActual));
            h.setDiaExtraDisponible(!traslapeDiaSiguiente);
            h.setNuevaFechaDesocupacion(diaSiguiente);
            if (h.getTipoHabitacion() != null) {
                Map<String, Object> tarifaExtra = calcularTarifa(
                        h,
                        salidaActual,
                        diaSiguiente,
                        Boolean.TRUE.equals(principal.getCuna()),
                        Boolean.TRUE.equals(principal.getCamaExtra())
                );
                h.setCostoDiaExtra((BigDecimal) tarifaExtra.get("total"));
            } else {
                h.setCostoDiaExtra(BigDecimal.ZERO);
            }
        } else {
            h.setDiaExtraDisponible(false);
            h.setCostoDiaExtra(BigDecimal.ZERO);
            h.setNuevaFechaDesocupacion(null);
        }
    }

    /**
     * Enriquecer una lista de reservaciones con disponibilidad de día extra, costo de día extra y avisos de desocupación.
     */
    @Transactional(readOnly = true)
    public void enriquecerReservas(List<Reserva> reservas) {
        if (reservas == null || reservas.isEmpty()) return;
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        List<Reserva> activas = reservaRepository.findAllActivasOrdenadas();
        Map<Integer, List<Reserva>> porHabitacion = new HashMap<>();
        for (Reserva act : activas) {
            if (act.getHabitacion() == null || act.getHabitacion().getIdHabitacion() == null) continue;
            if (act.getFechaSalida() != null && act.getFechaSalida().isBefore(hoy)) continue;
            porHabitacion.computeIfAbsent(act.getHabitacion().getIdHabitacion(), k -> new ArrayList<>()).add(act);
        }

        for (Reserva r : reservas) {
            Habitacion hab = r.getHabitacion();
            List<Reserva> reservasHab = (hab != null && hab.getIdHabitacion() != null)
                    ? porHabitacion.getOrDefault(hab.getIdHabitacion(), List.of())
                    : List.of();
            if (hab != null) {
                aplicarEnriquecimiento(hab, reservasHab, hoy);
            }
            aplicarEnriquecimientoReserva(r, reservasHab, ahora);
        }
    }

    @Transactional(readOnly = true)
    public void enriquecerReserva(Reserva r) {
        if (r == null) return;
        enriquecerReservas(List.of(r));
    }

    private void aplicarEnriquecimientoReserva(Reserva r, List<Reserva> reservasHab, LocalDateTime ahora) {
        boolean esActiva = Reserva.PRE_RESERVA.equals(r.getEstado())
                || Reserva.CONFIRMADA.equals(r.getEstado())
                || Reserva.OCUPADA.equals(r.getEstado());
        Habitacion hab = r.getHabitacion();

        if (!esActiva || hab == null || r.getFechaSalida() == null || r.getFechaEntrada() == null) {
            r.setDiaExtraDisponible(false);
            r.setCostoDiaExtra(BigDecimal.ZERO);
            r.setNuevaFechaSalidaSugerida(null);
            r.setPorDesocuparse(false);
            r.setHorasParaDesocupar(null);
            r.setSalidaPendiente(false);
            return;
        }

        boolean enMantenimiento = "Mantenimiento".equalsIgnoreCase(hab.getEstado());
        LocalDate salidaActual = r.getFechaSalida();
        LocalDate nuevaSalida = salidaActual.plusDays(1);

        boolean traslapeDiaSiguiente = reservasHab.stream()
                .anyMatch(otra -> !Objects.equals(otra.getIdReserva(), r.getIdReserva())
                        && otra.getFechaEntrada() != null && otra.getFechaSalida() != null
                        && otra.getFechaEntrada().isBefore(nuevaSalida)
                        && otra.getFechaSalida().isAfter(salidaActual));

        boolean disponibleExtra = !enMantenimiento && !traslapeDiaSiguiente && !salidaActual.isBefore(ahora.toLocalDate());
        r.setDiaExtraDisponible(disponibleExtra);
        r.setNuevaFechaSalidaSugerida(nuevaSalida);

        if (hab.getTipoHabitacion() != null) {
            Map<String, Object> tarifaExtra = calcularTarifa(
                    hab,
                    salidaActual,
                    nuevaSalida,
                    Boolean.TRUE.equals(r.getCuna()),
                    Boolean.TRUE.equals(r.getCamaExtra())
            );
            r.setCostoDiaExtra((BigDecimal) tarifaExtra.get("total"));
        } else {
            r.setCostoDiaExtra(BigDecimal.ZERO);
        }

        LocalDateTime momentoCheckout = salidaActual.atTime(HORA_CHECKOUT);
        long horasRestantes = Duration.between(ahora, momentoCheckout).toHours();
        r.setHorasParaDesocupar(horasRestantes);
        r.setPorDesocuparse(horasRestantes >= 0 && horasRestantes <= 72);

        LocalDate hoy = ahora.toLocalDate();
        boolean salidaVencida = Reserva.OCUPADA.equals(r.getEstado()) && (
                salidaActual.isBefore(hoy)
                || (salidaActual.isEqual(hoy) && !ahora.toLocalTime().isBefore(HORA_CHECKOUT))
        );
        r.setSalidaPendiente(salidaVencida);
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
        if (entrada.isBefore(LocalDate.now(clockActual()))) {
            throw new IllegalArgumentException("La fecha de entrada no puede estar en el pasado.");
        }
    }

    public List<Map<String, Object>> buscarDisponibles(Integer idHotel, LocalDate entrada, LocalDate salida,
                                                       int ocupantes, boolean camaExtra, boolean plantaBaja,
                                                       boolean cuna) {
        validarFechas(entrada, salida);
        Set<Integer> ocupadas = new HashSet<>(reservaRepository.findHabitacionesOcupadas(entrada, salida));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Habitacion h : habitacionRepository.findAll()) {
            if (h.getHotel() == null || Boolean.FALSE.equals(h.getHotel().getActivo())) continue;
            if (idHotel != null && !h.getHotel().getIdHotel().equals(idHotel)) continue;
            if (ocupadas.contains(h.getIdHabitacion())) continue;
            if (!habitacionVendible(h, entrada)) continue;
            int capacidad = h.getTipoHabitacion().getCapacidad() + (camaExtra ? 1 : 0);
            if (ocupantes > capacidad) continue;
            boolean esPlantaBaja = h.getPiso() != null && h.getPiso() == 1;
            if (plantaBaja && !esPlantaBaja) continue;

            Map<String, Object> item = new LinkedHashMap<>();
            enriquecerHabitacion(h);
            item.put("habitacion", h);
            item.put("plantaBaja", esPlantaBaja);
            item.put("tarifa", calcularTarifa(h, entrada, salida, cuna, camaExtra));
            resultado.add(item);
        }
        resultado.sort(Comparator.comparing(m -> ((Habitacion) m.get("habitacion")).getTipoHabitacion().getPrecioBase()));
        return resultado;
    }

    private boolean habitacionVendible(Habitacion h, LocalDate entrada) {
        String e = h.getEstado() == null ? "" : h.getEstado();
        return !"Mantenimiento".equalsIgnoreCase(e);
    }

    // ------------------------------------------------------------------
    // Crear reservación (HU-05, HU-06)
    // ------------------------------------------------------------------

    @Transactional
    public Reserva crear(ReservaRequest req) {
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual != null && actual.getRol() == Rol.HUESPED) {
            // Un huésped siempre reserva para su propia cuenta verificada
            req.setEmail(actual.getEmail());
            if (req.getNombre() == null || req.getNombre().isBlank()) {
                req.setNombre(actual.getNombre());
            }
            if (req.getRecepcionista() == null || req.getRecepcionista().isBlank()) {
                req.setRecepcionista("Javier");
            }
        }

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

        String recepcionistaNombre;
        if (req.getRecepcionista() == null || req.getRecepcionista().isBlank()) {
            recepcionistaNombre = "Javier";
        } else {
            recepcionistaNombre = recepcionistaRepository.findByNombreIgnoreCase(req.getRecepcionista().trim())
                    .filter(x -> !Boolean.FALSE.equals(x.getActivo()))
                    .map(com.ico.hotel.models.Recepcionista::getNombre)
                    .orElseGet(() -> actual != null && actual.getRol() == Rol.HUESPED
                            ? "Autoservicio Web"
                            : req.getRecepcionista().trim());
        }

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

        // REGLA DE NEGOCIO Y SEGURIDAD: Un huésped NUNCA puede crear directamente una reserva confirmada
        boolean esHuesped = actual != null && actual.getRol() == Rol.HUESPED;
        boolean confirmada = !esHuesped && "CONFIRMADA".equalsIgnoreCase(req.getModalidad());
        Reserva r = new Reserva();
        LocalDateTime ahoraCreacion = LocalDateTime.now(clockActual());
        r.setFechaCreacion(ahoraCreacion);
        r.setHuesped(obtenerHuesped(req, tel));

        // Asociar la reservación con la cuenta de Usuario (del huésped autenticado o buscando por correo)
        if (actual != null && actual.getRol() == Rol.HUESPED) {
            usuarioRepository.findById(actual.getIdUsuario()).ifPresent(r::setUsuario);
        } else {
            usuarioRepository.findByEmailIgnoreCase(req.getEmail().trim()).ifPresent(r::setUsuario);
        }

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
        r.setRecepcionista(recepcionistaNombre);

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
            r.setFechaExpiracion(ahoraCreacion.plusHours(horas));
        }

        if (req.getFolio() != null && !req.getFolio().isBlank()) {
            String folioCustom = req.getFolio().trim();
            if (reservaRepository.existsByFolioIgnoreCase(folioCustom)) {
                throw new ConflictoEstanciaException("Ya existe una reservación registrada con el folio " + folioCustom + ".");
            }
            r.setFolio(folioCustom);
            r = reservaRepository.save(r);
        } else {
            r.setFolio("TMP-" + UUID.randomUUID());
            r = reservaRepository.save(r);
            r.setFolio(String.format("HP-%d-%05d", LocalDate.now(clockActual()).getYear(), r.getIdReserva()));
            r = reservaRepository.save(r);
        }
        registrarEvento(r.getIdReserva(), "CREACION", null, r.getEstado(),
                confirmada ? "Reservación confirmada al crear." : "Pre-reserva creada.");
        sincronizarEstadoHabitacion(hab);
        return r;
    }

    private Huesped obtenerHuesped(ReservaRequest req, String tel) {
        String email = req.getEmail().trim().toLowerCase();
        Huesped h = null;
        if (req.getIdHuesped() != null) {
            h = huespedRepository.findById(req.getIdHuesped()).orElse(null);
            if (h != null && huespedRepository.existsByEmailIgnoreCaseAndIdHuespedNot(email, h.getIdHuesped())) {
                throw new ConflictoEstanciaException("Ya existe otro huésped registrado con ese correo electrónico.");
            }
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
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual == null || !actual.isStaff()) {
            throw new AccessDeniedException("Solo el personal autorizado (recepción, gerencia o administración) puede confirmar reservaciones tras verificar el comprobante de pago del anticipo.");
        }
        Reserva r = reservaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        validarAccesoReserva(r, actual);
        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.CONFIRMADA);
        if (r.getFechaExpiracion() != null && r.getFechaExpiracion().isBefore(LocalDateTime.now(clockActual()))) {
            expirarPreReservas();
            throw new ConflictoEstanciaException("La pre-reserva ya venció y la habitación fue liberada.");
        }
        BigDecimal minimo = r.getTotal().multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal pagado = validarAnticipo(anticipo, minimo, r.getTotal(), metodoPago);
        r.setEstado(Reserva.CONFIRMADA);
        r.setAnticipo(pagado);
        r.setSaldo(r.getTotal().subtract(pagado));
        r.setMetodoPago(metodoPago);
        r.setFechaExpiracion(null);
        r = reservaRepository.save(r);
        registrarEvento(r.getIdReserva(), "CONFIRMACION", estadoActual.getValor(), Reserva.CONFIRMADA,
                "Anticipo registrado (" + metodoPago + "): $" + pagado);
        sincronizarEstadoHabitacion(r.getHabitacion());
        return r;
    }

    // ------------------------------------------------------------------
    // Ciclo operativo de estancia: Check-In, Check-Out, No-Show y Reversión
    // ------------------------------------------------------------------

    @Transactional
    public Reserva checkIn(Integer id) {
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual == null || !actual.isStaff()) {
            throw new AccessDeniedException("Solo el personal autorizado (recepción, gerencia o administración) puede registrar el Check-In.");
        }
        Reserva r = reservaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.OCUPADA);

        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        if (r.getFechaEntrada() == null || r.getFechaSalida() == null || hoy.isBefore(r.getFechaEntrada())) {
            throw new ReglaEstanciaException("No se permite realizar Check-In antes de la fecha de entrada programada (" + r.getFechaEntrada() + ").");
        }
        if (!hoy.isBefore(r.getFechaSalida())) {
            throw new ReglaEstanciaException("No se permite realizar Check-In porque la fecha de salida (" + r.getFechaSalida() + ") ya venció o es hoy.");
        }

        Habitacion hab = r.getHabitacion();
        if (hab != null && "Mantenimiento".equalsIgnoreCase(hab.getEstado())) {
            throw new ConflictoEstanciaException("No se puede registrar Check-In porque la habitación se encuentra en Mantenimiento.");
        }

        r.setEstado(Reserva.OCUPADA);
        r.setCheckInAt(ahora);
        r = reservaRepository.save(r);
        registrarEvento(r.getIdReserva(), "CHECK_IN", estadoActual.getValor(), Reserva.OCUPADA,
                "Check-In completado en mostrador.");
        sincronizarEstadoHabitacion(hab);
        enriquecerReserva(r);
        return r;
    }

    @Transactional
    public Reserva checkOut(Integer id, String metodoPagoSaldo) {
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual == null || !actual.isStaff()) {
            throw new AccessDeniedException("Solo el personal autorizado (recepción, gerencia o administración) puede registrar el Check-Out.");
        }
        Reserva r = reservaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.FINALIZADA);

        if (metodoPagoSaldo == null || metodoPagoSaldo.isBlank()) {
            throw new ReglaEstanciaException("Debe indicar el método de pago del saldo restante para finalizar la estancia.");
        }

        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        BigDecimal saldoPrevio = r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO;
        boolean salidaAnticipada = r.getFechaSalida() != null && hoy.isBefore(r.getFechaSalida());

        r.setMetodoPagoSaldo(metodoPagoSaldo.trim());
        r.setSaldo(BigDecimal.ZERO);
        r.setCheckOutAt(ahora);
        r.setEstado(Reserva.FINALIZADA);
        if (salidaAnticipada) {
            String obs = r.getObservaciones() == null || r.getObservaciones().isBlank() ? "" : r.getObservaciones() + " | ";
            r.setObservaciones(obs + "Salida anticipada registrada el " + hoy + " sin reembolso.");
        }

        r = reservaRepository.save(r);
        registrarEvento(r.getIdReserva(), "CHECK_OUT", estadoActual.getValor(), Reserva.FINALIZADA,
                "Check-Out registrado (" + r.getMetodoPagoSaldo() + ", saldo liquidado: $" + saldoPrevio + (salidaAnticipada ? ", salida anticipada" : "") + ").");
        sincronizarEstadoHabitacion(r.getHabitacion());
        enriquecerReserva(r);
        return r;
    }

    @Transactional
    public Reserva noShow(Integer id) {
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual == null || !actual.isStaff()) {
            throw new AccessDeniedException("Solo el personal autorizado (recepción, gerencia o administración) puede declarar No-Show.");
        }
        Reserva r = reservaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.NO_SHOW);

        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        boolean enVentanaNoShow = r.getFechaEntrada() != null && (
                hoy.isAfter(r.getFechaEntrada())
                || (hoy.isEqual(r.getFechaEntrada()) && !ahora.toLocalTime().isBefore(HORA_LIMITE_NOSHOW))
        );
        if (!enVentanaNoShow) {
            throw new ReglaEstanciaException("El No-Show solo puede declararse a partir de las 22:00 hrs del día de entrada (" + r.getFechaEntrada() + ") o en días posteriores.");
        }

        r.setEstado(Reserva.NO_SHOW);
        r = reservaRepository.save(r);
        registrarEvento(r.getIdReserva(), "NO_SHOW", estadoActual.getValor(), Reserva.NO_SHOW,
                "No-Show declarado tras las 22:00 hrs; anticipo retenido.");
        sincronizarEstadoHabitacion(r.getHabitacion());
        enriquecerReserva(r);
        return r;
    }

    @Transactional
    public Reserva revertirNoShow(Integer id) {
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual == null || (actual.getRol() != Rol.GERENTE && actual.getRol() != Rol.ADMINISTRADOR)) {
            throw new AccessDeniedException("Solo Gerencia o Administración pueden revertir un estado No-Show.");
        }
        Reserva r = reservaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.CONFIRMADA);

        LocalDateTime ahora = LocalDateTime.now(clockActual());
        final Integer idReserva = r.getIdReserva();
        ReservaEvento eventoNoShow = reservaEventoRepository
                .findTopByIdReservaAndTipoOrderByFechaHoraDesc(idReserva, "NO_SHOW")
                .or(() -> reservaEventoRepository.findTopByIdReservaAndEstadoNuevoOrderByFechaHoraDesc(idReserva, Reserva.NO_SHOW))
                .orElseThrow(() -> new ConflictoEstanciaException("No existe registro de evento NO_SHOW para validar la ventana de 24 horas."));

        if (ahora.isAfter(eventoNoShow.getFechaHora().plusHours(24))) {
            throw new ConflictoEstanciaException("La ventana máxima de 24 horas desde el evento NO_SHOW ya expiró.");
        }

        Habitacion hab = r.getHabitacion();
        if (hab != null && hab.getIdHabitacion() != null) {
            hab = habitacionRepository.findByIdForUpdate(hab.getIdHabitacion()).orElse(hab);
            if ("Mantenimiento".equalsIgnoreCase(hab.getEstado())) {
                throw new ConflictoEstanciaException("No se puede revertir el No-Show porque la habitación está en Mantenimiento.");
            }
            List<Reserva> traslapes = reservaRepository.findTraslapesExcluyendo(
                    hab.getIdHabitacion(), r.getIdReserva(), r.getFechaEntrada(), r.getFechaSalida()
            );
            if (!traslapes.isEmpty()) {
                throw new ConflictoEstanciaException("No se puede revertir el No-Show porque la habitación ya tiene otra reservación activa en esas fechas.");
            }
        }

        r.setEstado(Reserva.CONFIRMADA);
        r = reservaRepository.save(r);
        registrarEvento(r.getIdReserva(), "REVERTIR_NO_SHOW", estadoActual.getValor(), Reserva.CONFIRMADA,
                "No-Show revertido dentro de la ventana de 24 h.");
        sincronizarEstadoHabitacion(hab);
        enriquecerReserva(r);
        return r;
    }

    // ------------------------------------------------------------------
    // Cancelación y reembolso (HU-03, RN políticas)
    // ------------------------------------------------------------------

    public int porcentajeReembolso(Reserva r) {
        long horas = Duration.between(LocalDateTime.now(clockActual()), r.getFechaEntrada().atTime(HORA_CHECKIN)).toHours();
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
        Reserva r = reservaRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        validarAccesoReserva(r, obtenerUsuarioActual());
        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.CANCELADA);
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
        r.setFechaCancelacion(LocalDateTime.now(clockActual()));
        r.setFechaExpiracion(null);
        r = reservaRepository.save(r);
        registrarEvento(r.getIdReserva(), "CANCELACION", estadoActual.getValor(), Reserva.CANCELADA,
                "Reservación cancelada. Reembolso: $" + reembolso);
        sincronizarEstadoHabitacion(r.getHabitacion());
        return r;
    }

    /**
     * Libera las reservas o pre-reservas activas asociadas a una habitación cuando
     * la administración libera o cambia manualmente el estado de la habitación a Disponible o Mantenimiento.
     */
    @Transactional
    public int cancelarPreReservasDeHabitacion(Integer idHabitacion, String motivo) {
        if (idHabitacion == null) return 0;
        List<Reserva> activas = reservaRepository.findActivasByHabitacion(idHabitacion);
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        int afectadas = 0;
        for (Reserva r : activas) {
            if (Reserva.PRE_RESERVA.equals(r.getEstado())) {
                r.setEstado(Reserva.CANCELADA);
                r.setFechaCancelacion(ahora);
                r.setMontoReembolso(BigDecimal.ZERO);
                r.setFechaExpiracion(null);
                String obs = r.getObservaciones() == null ? "" : r.getObservaciones() + " | ";
                r.setObservaciones(obs + (motivo != null ? motivo : "Cancelada por administración al liberar la habitación."));
                reservaRepository.save(r);
                afectadas++;
            } else if (Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado())) {
                r.setEstado(Reserva.FINALIZADA);
                r.setCheckOutAt(ahora);
                r.setSaldo(BigDecimal.ZERO);
                String obs = r.getObservaciones() == null ? "" : r.getObservaciones() + " | ";
                r.setObservaciones(obs + (motivo != null ? motivo : "Estancia finalizada manualmente por administración al liberar la habitación."));
                reservaRepository.save(r);
                afectadas++;
            }
        }
        return afectadas;
    }

    // ------------------------------------------------------------------
    // Actualizar reservación
    // ------------------------------------------------------------------

    @Transactional
    public Reserva actualizar(Integer id, ReservaRequest req) {
        Reserva r = reservaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        CustomUserDetails actual = obtenerUsuarioActual();
        validarAccesoReserva(r, actual);

        if (actual != null && actual.getRol() == Rol.HUESPED) {
            req.setEmail(actual.getEmail());
        }

        if (Reserva.CANCELADA.equals(r.getEstado()) || Reserva.FINALIZADA.equals(r.getEstado())) {
            throw new IllegalStateException("No se puede modificar una reservación con estado " + r.getEstado() + ".");
        }

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

        int adultos = req.getAdultos() == null ? 1 : req.getAdultos();
        int ninos = req.getNinos() == null ? 0 : req.getNinos();
        if (adultos < 1) {
            throw new IllegalArgumentException("Debe haber al menos un adulto.");
        }

        Habitacion hab = (req.getIdHabitacion() != null)
                ? habitacionRepository.findByIdForUpdate(req.getIdHabitacion())
                        .orElseThrow(() -> new IllegalArgumentException("La habitación seleccionada no existe."))
                : r.getHabitacion();

        Habitacion habAnterior = r.getHabitacion();

        boolean camaExtra = Boolean.TRUE.equals(req.getCamaExtra());
        boolean cuna = Boolean.TRUE.equals(req.getCuna());
        int capacidad = hab.getTipoHabitacion().getCapacidad() + (camaExtra ? 1 : 0);
        if (adultos + ninos > capacidad) {
            throw new IllegalArgumentException("La habitación admite máximo " + capacidad + " ocupantes.");
        }

        expirarPreReservas();
        if (!reservaRepository.findTraslapesExcluyendo(hab.getIdHabitacion(), r.getIdReserva(), req.getFechaEntrada(), req.getFechaSalida()).isEmpty()) {
            throw new IllegalStateException("La habitación ya está ocupada o reservada en esas fechas por otra reservación.");
        }

        Huesped h = r.getHuesped();
        String emailNorm = req.getEmail().trim().toLowerCase();
        if (h.getIdHuesped() != null && huespedRepository.existsByEmailIgnoreCaseAndIdHuespedNot(emailNorm, h.getIdHuesped())) {
            throw new ConflictoEstanciaException("Ya existe otro huésped registrado con ese correo electrónico.");
        }
        h.setNombre(req.getNombre().trim());
        h.setTelefono(tel);
        h.setEmail(emailNorm);
        huespedRepository.save(h);

        Map<String, Object> tarifa = calcularTarifa(hab, req.getFechaEntrada(), req.getFechaSalida(), cuna, camaExtra);
        BigDecimal nuevoTotal = (BigDecimal) tarifa.get("total");

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
        r.setTotal(nuevoTotal);

        if (req.getRecepcionista() != null && !req.getRecepcionista().isBlank()
                && (actual == null || actual.isStaff())) {
            r.setRecepcionista(req.getRecepcionista().trim());
        }

        BigDecimal anticipoActual = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
        r.setSaldo(nuevoTotal.subtract(anticipoActual));

        r = reservaRepository.save(r);

        if (habAnterior != null && !habAnterior.getIdHabitacion().equals(hab.getIdHabitacion())) {
            sincronizarEstadoHabitacion(habAnterior);
        }
        sincronizarEstadoHabitacion(hab);
        enriquecerReserva(r);

        return r;
    }

    // ------------------------------------------------------------------
    // Agregar día(s) extra a una reservación (solo si el día siguiente está disponible)
    // ------------------------------------------------------------------

    @Transactional
    public Reserva extenderDiaExtra(Integer id, int diasExtra) {
        if (diasExtra < 1) diasExtra = 1;
        if (diasExtra > 14) {
            throw new IllegalArgumentException("Solo se puede extender hasta 14 días adicionales por operación.");
        }

        Reserva r = reservaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));
        CustomUserDetails actual = obtenerUsuarioActual();
        validarAccesoReserva(r, actual);

        if (!Reserva.PRE_RESERVA.equals(r.getEstado())
                && !Reserva.CONFIRMADA.equals(r.getEstado())
                && !Reserva.OCUPADA.equals(r.getEstado())) {
            throw new IllegalStateException("Solo se puede agregar un día extra a reservaciones activas (Pre-reserva, Confirmada u Ocupada).");
        }

        Habitacion hab = r.getHabitacion();
        if (hab == null) {
            throw new IllegalStateException("La reservación no tiene una habitación asignada.");
        }
        if ("Mantenimiento".equalsIgnoreCase(hab.getEstado())) {
            throw new IllegalStateException("La habitación se encuentra en mantenimiento y no puede extenderse.");
        }

        expirarPreReservas();

        LocalDate salidaActual = r.getFechaSalida();
        LocalDate nuevaSalida = salidaActual.plusDays(diasExtra);

        List<Reserva> traslapes = reservaRepository.findTraslapesExcluyendo(
                hab.getIdHabitacion(), r.getIdReserva(), salidaActual, nuevaSalida
        );
        if (!traslapes.isEmpty()) {
            Reserva conflicto = traslapes.get(0);
            throw new IllegalStateException(
                    "No es posible agregar un día extra: la habitación #" + hab.getNumero()
                    + " ya está reservada del " + conflicto.getFechaEntrada() + " al " + conflicto.getFechaSalida() + "."
            );
        }

        boolean cuna = Boolean.TRUE.equals(r.getCuna());
        boolean camaExtra = Boolean.TRUE.equals(r.getCamaExtra());
        Map<String, Object> tarifa = calcularTarifa(hab, r.getFechaEntrada(), nuevaSalida, cuna, camaExtra);
        BigDecimal nuevoTotal = (BigDecimal) tarifa.get("total");
        BigDecimal anticipoActual = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;

        r.setFechaSalida(nuevaSalida);
        r.setNoches((Integer) tarifa.get("noches"));
        r.setTotal(nuevoTotal);
        r.setSaldo(nuevoTotal.subtract(anticipoActual));

        String obs = r.getObservaciones() == null || r.getObservaciones().isBlank() ? "" : r.getObservaciones() + " | ";
        r.setObservaciones(obs + "Día extra agregado (+" + diasExtra + " noche" + (diasExtra > 1 ? "s" : "") + ", nueva fecha de desocupación: " + nuevaSalida + " 12:00 hrs).");

        r = reservaRepository.save(r);
        sincronizarEstadoHabitacion(hab);
        enriquecerReserva(r);
        return r;
    }

    /**
     * Agrega 1 día extra directamente a una habitación que ya se encuentra Ocupada,
     * únicamente si el día siguiente está disponible en esa habitación.
     */
    @Transactional
    public Habitacion agregarDiaExtraHabitacionOcupada(Integer idHabitacion, int diasExtra) {
        if (diasExtra < 1) diasExtra = 1;
        Habitacion hab = habitacionRepository.findByIdForUpdate(idHabitacion)
                .orElseThrow(() -> new NoSuchElementException("Habitación no encontrada con ID: " + idHabitacion));

        if (!ESTADO_OCUPADA.equalsIgnoreCase(hab.getEstado())) {
            throw new IllegalStateException("El día extra solo puede aplicarse a habitaciones que actualmente están Ocupadas.");
        }

        LocalDate hoy = LocalDate.now(clockActual());
        List<Reserva> activas = reservaRepository.findActivasByHabitacion(idHabitacion).stream()
                .filter(r -> r.getFechaSalida() == null || !r.getFechaSalida().isBefore(hoy))
                .toList();

        Reserva principal = activas.stream()
                .filter(r -> (Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))
                        && r.getFechaEntrada() != null && r.getFechaSalida() != null
                        && !hoy.isBefore(r.getFechaEntrada()) && hoy.isBefore(r.getFechaSalida()))
                .findFirst()
                .orElseGet(() -> activas.stream()
                        .filter(r -> Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))
                        .findFirst()
                        .orElse(null));

        if (principal == null) {
            throw new IllegalStateException("La habitación #" + hab.getNumero() + " no tiene una estancia ocupada activa para extender.");
        }

        extenderDiaExtra(principal.getIdReserva(), diasExtra);
        Habitacion actualizada = habitacionRepository.findById(idHabitacion).orElse(hab);
        enriquecerHabitacion(actualizada);
        return actualizada;
    }

    /**
     * Genera avisos en tiempo real sobre habitaciones próximas a desocuparse y estancias recién concluidas.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerNotificacionesDesocupacion(CustomUserDetails user) {
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();

        List<Reserva> activas = reservaRepository.findAllActivasOrdenadas();
        enriquecerReservas(activas);

        List<Map<String, Object>> notificaciones = new ArrayList<>();

        for (Reserva r : activas) {
            if (r.getHabitacion() == null || r.getFechaSalida() == null) continue;
            Habitacion hab = r.getHabitacion();
            LocalDateTime checkoutDt = r.getFechaSalida().atTime(HORA_CHECKOUT);
            long horasRestantes = Duration.between(ahora, checkoutDt).toHours();
            long diasRestantes = java.time.temporal.ChronoUnit.DAYS.between(hoy, r.getFechaSalida());

            boolean esMiReserva = user != null && (
                    (r.getUsuario() != null && Objects.equals(r.getUsuario().getIdUsuario(), user.getIdUsuario()))
                    || (r.getHuesped() != null && r.getHuesped().getEmail() != null
                        && user.getEmail() != null && r.getHuesped().getEmail().trim().equalsIgnoreCase(user.getEmail().trim()))
            );

            // Solo generar avisos cuando la desocupación sea verdaderamente inminente (HOY o MAÑANA)
            // Esto evita saturar el centro de notificaciones con estancias que apenas comienzan o vencen en muchos días
            boolean venceHoy = r.getFechaSalida().isEqual(hoy) || (diasRestantes <= 0 && horasRestantes <= 18);
            boolean venceManana = r.getFechaSalida().isEqual(hoy.plusDays(1)) || (diasRestantes == 1 && horasRestantes <= 36);

            if (venceHoy || venceManana || (esMiReserva && diasRestantes <= 2)) {
                String nivel;
                String titulo;
                String mensaje;

                if (venceHoy) {
                    nivel = "HOY";
                    titulo = "Check-out HOY · Hab. #" + hab.getNumero();
                    mensaje = (hab.getHotel() != null ? hab.getHotel().getNombre() : "Hotel")
                            + " · Desocupa hoy a las 12:00 hrs. "
                            + (horasRestantes > 0 ? "(quedan " + horasRestantes + " h)" : "(horario de salida)")
                            + ". Verificar entrega o solicitar +1 día si está disponible.";
                } else if (venceManana) {
                    nivel = "MANANA";
                    titulo = "Desocupa MAÑANA · Hab. #" + hab.getNumero();
                    mensaje = (hab.getHotel() != null ? hab.getHotel().getNombre() : "Hotel")
                            + " · Salida programada para mañana " + r.getFechaSalida() + " a las 12:00 hrs. Preparar camaristas y recepción.";
                } else {
                    nivel = "PROXIMA";
                    titulo = "Estancia por concluir · Hab. #" + hab.getNumero();
                    mensaje = (hab.getHotel() != null ? hab.getHotel().getNombre() : "Hotel")
                            + " · Fecha de salida: " + r.getFechaSalida() + " a las 12:00 hrs.";
                }

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("idNotificacion", "desocupacion-" + r.getIdReserva() + "-" + r.getFechaSalida());
                item.put("idReserva", r.getIdReserva());
                item.put("folio", r.getFolio());
                item.put("idHabitacion", hab.getIdHabitacion());
                item.put("numeroHabitacion", hab.getNumero());
                item.put("tipoHabitacion", hab.getTipoHabitacion() != null ? hab.getTipoHabitacion().getNombre() : "Suite");
                item.put("idHotel", hab.getHotel() != null ? hab.getHotel().getIdHotel() : null);
                item.put("nombreHotel", hab.getHotel() != null ? hab.getHotel().getNombre() : "Hotel Paraíso");
                item.put("ciudadHotel", hab.getHotel() != null ? hab.getHotel().getCiudad() : "");
                item.put("huespedNombre", (user != null && user.isStaff() && r.getHuesped() != null) ? r.getHuesped().getNombre() : null);
                item.put("estadoReserva", r.getEstado());
                item.put("fechaEntrada", r.getFechaEntrada().toString());
                item.put("fechaSalida", r.getFechaSalida().toString());
                item.put("horaCheckout", "12:00 hrs");
                item.put("horasRestantes", Math.max(horasRestantes, 0));
                item.put("diasRestantes", Math.max(diasRestantes, 0));
                item.put("nivel", nivel);
                item.put("titulo", titulo);
                item.put("mensaje", mensaje);
                item.put("esMiReserva", esMiReserva);
                item.put("diaExtraDisponible", Boolean.TRUE.equals(r.getDiaExtraDisponible()));
                item.put("costoDiaExtra", r.getCostoDiaExtra());
                item.put("nuevaFechaSalidaSugerida", r.getNuevaFechaSalidaSugerida() != null ? r.getNuevaFechaSalidaSugerida().toString() : null);
                notificaciones.add(item);
            }
        }

        notificaciones.sort(Comparator.comparingLong(m -> ((Number) m.get("horasRestantes")).longValue()));
        return notificaciones;
    }

    // ------------------------------------------------------------------
    // Eliminar reservación permanentemente (Solo ADMINISTRADOR)
    // ------------------------------------------------------------------

    @Transactional
    public void eliminar(Integer id) {
        CustomUserDetails actual = obtenerUsuarioActual();
        if (actual == null || actual.getRol() != Rol.ADMINISTRADOR) {
            throw new AccessDeniedException("Solo el administrador puede eliminar reservaciones permanentemente.");
        }
        Reserva r = reservaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Reservación no encontrada."));

        if (Reserva.OCUPADA.equals(r.getEstado())) {
            throw new IllegalStateException("No se puede eliminar una reservación que se encuentra actualmente en curso (Ocupada). Realice el check-out primero.");
        }

        Habitacion hab = r.getHabitacion();
        reservaRepository.delete(r);

        if (hab != null) {
            sincronizarEstadoHabitacion(hab);
        }
    }

    @Scheduled(fixedRate = 5 * 60 * 1000)
    public int expirarPreReservas() {
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        int procesadas = 0;

        List<Integer> idsVencidas = reservaRepository.findPreReservasVencidas(ahora, hoy).stream()
                .map(Reserva::getIdReserva)
                .filter(Objects::nonNull)
                .toList();

        for (Integer idRes : idsVencidas) {
            Boolean hecha = ejecutarEnTransaccion(() -> procesarExpiracionPreReserva(idRes));
            if (Boolean.TRUE.equals(hecha)) {
                procesadas++;
            }
        }

        List<Integer> idsConfirmadasNoShow = reservaRepository.findConfirmadasParaNoShow(hoy).stream()
                .filter(r -> r.getFechaEntrada() != null && (
                        hoy.isAfter(r.getFechaEntrada())
                        || (hoy.isEqual(r.getFechaEntrada()) && !ahora.toLocalTime().isBefore(HORA_LIMITE_NOSHOW))
                ))
                .map(Reserva::getIdReserva)
                .filter(Objects::nonNull)
                .toList();

        for (Integer idRes : idsConfirmadasNoShow) {
            Boolean hecha = ejecutarEnTransaccion(() -> procesarNoShowAutomatico(idRes));
            if (Boolean.TRUE.equals(hecha)) {
                procesadas++;
            }
        }

        ejecutarEnTransaccion(() -> {
            for (Habitacion h : habitacionRepository.findAll()) {
                sincronizarEstadoHabitacion(h);
            }
            return Boolean.TRUE;
        });

        return procesadas;
    }

    private Boolean ejecutarEnTransaccion(java.util.function.Supplier<Boolean> accion) {
        if (transactionTemplate != null) {
            return transactionTemplate.execute(status -> accion.get());
        }
        return accion.get();
    }

    private boolean procesarExpiracionPreReserva(Integer idReserva) {
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        Reserva r = reservaRepository.findByIdForUpdate(idReserva).orElse(null);
        if (r == null || !Reserva.PRE_RESERVA.equals(r.getEstado())) {
            return false;
        }
        boolean sigueVencida = (r.getFechaExpiracion() != null && r.getFechaExpiracion().isBefore(ahora))
                || (r.getFechaSalida() != null && !r.getFechaSalida().isAfter(hoy));
        if (!sigueVencida) {
            return false;
        }

        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.CANCELADA);

        r.setEstado(Reserva.CANCELADA);
        r.setFechaCancelacion(ahora);
        r.setMontoReembolso(BigDecimal.ZERO);
        r.setFechaExpiracion(null);
        String obs = r.getObservaciones() == null || r.getObservaciones().isBlank() ? "" : r.getObservaciones() + " | ";
        r.setObservaciones(obs + "Liberada automáticamente por vencimiento de pre-reserva.");
        reservaRepository.save(r);

        registrarEvento(r.getIdReserva(), "EXPIRACION", estadoActual.getValor(), Reserva.CANCELADA,
                "SISTEMA", ahora, "Pre-reserva expirada automáticamente por el sistema.");
        sincronizarEstadoHabitacion(r.getHabitacion());
        return true;
    }

    private boolean procesarNoShowAutomatico(Integer idReserva) {
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate hoy = ahora.toLocalDate();
        Reserva r = reservaRepository.findByIdForUpdate(idReserva).orElse(null);
        if (r == null || !Reserva.CONFIRMADA.equals(r.getEstado())) {
            return false;
        }
        boolean enVentanaNoShow = r.getFechaEntrada() != null && (
                hoy.isAfter(r.getFechaEntrada())
                || (hoy.isEqual(r.getFechaEntrada()) && !ahora.toLocalTime().isBefore(HORA_LIMITE_NOSHOW))
        );
        if (!enVentanaNoShow) {
            return false;
        }

        EstadoReserva estadoActual = EstadoReserva.desdeTexto(r.getEstado());
        estadoActual.validarTransicion(EstadoReserva.NO_SHOW);

        r.setEstado(Reserva.NO_SHOW);
        String obs = r.getObservaciones() == null || r.getObservaciones().isBlank() ? "" : r.getObservaciones() + " | ";
        r.setObservaciones(obs + "No-Show automático tras las 22:00 hrs sin Check-In.");
        reservaRepository.save(r);

        registrarEvento(r.getIdReserva(), "NO_SHOW", estadoActual.getValor(), Reserva.NO_SHOW,
                "SISTEMA", ahora, "No-Show automático declarado por el sistema a partir de las 22:00 hrs.");
        sincronizarEstadoHabitacion(r.getHabitacion());
        return true;
    }
}
