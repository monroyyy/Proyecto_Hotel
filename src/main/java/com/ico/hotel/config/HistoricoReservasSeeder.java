package com.ico.hotel.config;

import com.ico.hotel.models.*;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HuespedRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Seeder de datos históricos de reservaciones para el periodo 2020 a 2026.
 * Genera histórico únicamente hasta hoy - 1 usando el bean Clock, dejando
 * 2-3 reservaciones futuras Confirmada / Pre-reserva sin marcarlas como Finalizada.
 */
@Component
@Order(20)
@RequiredArgsConstructor
@Slf4j
public class HistoricoReservasSeeder implements ApplicationRunner {

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final HuespedRepository huespedRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired(required = false)
    private Clock clock;

    private Clock clockActual() {
        return clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
    }

    private static final String[] NOMBRES_HUESPEDES = {
            "Carlos Mendoza Garza", "Lucía Fernández Ríos", "Mateo Gómez Navarro",
            "Valentina Ortiz Silva", "Santiago Herrera Paz", "Camila Castro Morales",
            "Alejandro Vega Domínguez", "Sofía Rivas Cordero", "Diego Morales Peña",
            "Mariana Reyes Salgado", "Emiliano Lozano Cruz", "Renata Guzmán Flores",
            "Leonardo Aguilar Pineda", "Daniela Vargas Fuentes", "Sebastián Romero Soto",
            "Valeria Méndez Téllez", "Rodrigo Castillo Parra", "Natalia Guerrero Bravo",
            "Gabriel Paredes Lara", "Fernanda Ponce Ochoa", "Esteban Delgado Prieto",
            "Isabella Medina Carrillo", "Javier Bustamante Cano", "Paulina Serrano Beltrán"
    };

    private static final String[] METODOS_PAGO = {
            "TARJETA_CREDITO", "TARJETA_DEBITO", "TRANSFERENCIA", "EFECTIVO"
    };

    private static final String[] BANCOS = {
            "BBVA Bancomer", "Santander", "Banorte", "Citibanamex", "HSBC", "Scotiabank"
    };

    private static final String[] RECEPCIONISTAS = {
            "Javier Morales", "Mariana Vega", "Alejandro Ruiz", "Don Roberto"
    };

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        long conteoActual = reservaRepository.count();
        if (conteoActual >= 40) {
            log.info("HistoricoReservasSeeder: Ya existen {} reservaciones registradas. Se omite carga histórica.", conteoActual);
            return;
        }

        Usuario adminUsuario = usuarioRepository.findByEmailIgnoreCase("admin@hotelparaiso.com").orElse(null);
        Usuario huespedUsuario = usuarioRepository.findByEmailIgnoreCase("huesped@hotelparaiso.com").orElse(null);

        List<Habitacion> habitaciones = habitacionRepository.findAll();
        if (habitaciones.isEmpty()) {
            log.warn("HistoricoReservasSeeder: No hay habitaciones disponibles en el catálogo. Se omite seeder.");
            return;
        }

        LocalDate hoy = LocalDate.now(clockActual());
        LocalDateTime ahora = LocalDateTime.now(clockActual());
        LocalDate limiteHistorico = hoy.minusDays(1);

        List<Huesped> catalogoHuespedes = asegurarHuespedes();
        log.info("HistoricoReservasSeeder: Generando histórico hasta {} (Clock {})...", limiteHistorico, clockActual().getZone());

        Random rnd = new Random(20260815L);
        List<Reserva> historico = new ArrayList<>();
        List<Reserva> activasFuturas = new ArrayList<>();
        int folioSecuencia = 1;
        int confirmadasFuturas = 0;
        int preReservasFuturas = 0;

        double[] factoresMes = {
                1.15, 0.85, 1.25, 1.30, 0.75, 1.00,
                1.40, 1.45, 0.70, 0.80, 1.10, 1.50
        };

        Map<Integer, Double> factorAno = Map.of(
                2020, 0.55,
                2021, 0.70,
                2022, 0.85,
                2023, 1.00,
                2024, 1.15,
                2025, 1.25,
                2026, 1.35
        );

        int anioFin = Math.max(2026, hoy.getYear());
        for (int ano = 2020; ano <= anioFin; ano++) {
            double baseAno = factorAno.getOrDefault(ano, 1.35);

            for (int mes = 1; mes <= 12; mes++) {
                double factorTotal = factoresMes[mes - 1] * baseAno;
                int cantidadReservas = (int) Math.round(5.0 + factorTotal * 4.0);

                for (int i = 0; i < cantidadReservas; i++) {
                    int diaEntrada = 1 + rnd.nextInt(24);
                    LocalDate fechaEntrada = LocalDate.of(ano, mes, diaEntrada);
                    int noches = 2 + rnd.nextInt(4);
                    LocalDate fechaSalida = fechaEntrada.plusDays(noches);

                    Habitacion hab = habitaciones.get(rnd.nextInt(habitaciones.size()));
                    Huesped huesped = catalogoHuespedes.get(rnd.nextInt(catalogoHuespedes.size()));
                    TipoHabitacion tipo = hab.getTipoHabitacion();

                    BigDecimal precioBase = (tipo != null && tipo.getPrecioBase() != null)
                            ? tipo.getPrecioBase()
                            : BigDecimal.valueOf(1200.00);

                    boolean esAlta = (mes == 12 || mes == 7 || mes == 8 || mes == 3 || mes == 4);
                    BigDecimal tarifaNoche = esAlta
                            ? precioBase.multiply(BigDecimal.valueOf(1.25)).setScale(2, RoundingMode.HALF_UP)
                            : precioBase;

                    BigDecimal total = tarifaNoche.multiply(BigDecimal.valueOf(noches));
                    BigDecimal anticipo = total.multiply(BigDecimal.valueOf(0.50)).setScale(2, RoundingMode.HALF_UP);
                    String metodo = METODOS_PAGO[rnd.nextInt(METODOS_PAGO.length)];

                    Reserva r = new Reserva();
                    r.setFolio(String.format("HP-%04d-%05d", ano, folioSecuencia++));
                    r.setHabitacion(hab);
                    r.setHuesped(huesped);
                    r.setUsuario(adminUsuario);
                    r.setFechaEntrada(fechaEntrada);
                    r.setFechaSalida(fechaSalida);
                    r.setNoches(noches);
                    r.setAdultos(1 + rnd.nextInt(Math.max(tipo != null ? tipo.getCapacidad() : 2, 2)));
                    r.setNinos(rnd.nextInt(2));
                    r.setCuna(rnd.nextDouble() < 0.15);
                    r.setCamaExtra(rnd.nextDouble() < 0.20);
                    r.setPlantaBajaSolicitada(hab.getPiso() != null && hab.getPiso() == 1 && rnd.nextDouble() < 0.4);
                    r.setTotal(total);
                    r.setAnticipo(anticipo);
                    r.setMetodoPago(metodo);
                    r.setRecepcionista(RECEPCIONISTAS[rnd.nextInt(RECEPCIONISTAS.length)]);

                    LocalDateTime creacion = fechaEntrada.minusDays(5 + rnd.nextInt(20))
                            .atTime(9 + rnd.nextInt(10), rnd.nextInt(60));
                    if (creacion.isAfter(ahora)) {
                        creacion = ahora.minusDays(1);
                    }
                    r.setFechaCreacion(creacion);

                    // Solo histórico pasado (fecha_salida <= hoy - 1) puede quedar Finalizada / Cancelada / No-Show
                    if (!fechaSalida.isAfter(limiteHistorico)) {
                        double prob = rnd.nextDouble();
                        if (prob < 0.78) {
                            r.setEstado(Reserva.FINALIZADA);
                            r.setSaldo(BigDecimal.ZERO);
                            r.setMetodoPagoSaldo(METODOS_PAGO[rnd.nextInt(METODOS_PAGO.length)]);
                            r.setCheckInAt(fechaEntrada.atTime(15, 0));
                            r.setCheckOutAt(fechaSalida.atTime(12, 0));
                        } else if (prob < 0.92) {
                            r.setEstado(Reserva.CANCELADA);
                            r.setFechaCancelacion(fechaEntrada.minusDays(1 + rnd.nextInt(6)).atTime(10, 0));
                            r.setTitularReembolso(huesped.getNombre());
                            r.setBancoReembolso(BANCOS[rnd.nextInt(BANCOS.length)]);
                            r.setClabeReembolso(String.format("012%015d", Math.abs(rnd.nextLong()) % 1_000_000_000_000_000L));
                            r.setReembolsoAutorizadoPor("Don Roberto (Gerente General)");

                            double tipoCanc = rnd.nextDouble();
                            if (tipoCanc < 0.50) {
                                r.setMontoReembolso(anticipo);
                                r.setSaldo(BigDecimal.ZERO);
                                r.setMotivoCancelacion("Cancelación con más de 72 hrs de anticipación (reembolso 100%).");
                            } else if (tipoCanc < 0.80) {
                                BigDecimal devuelto = anticipo.multiply(BigDecimal.valueOf(0.50)).setScale(2, RoundingMode.HALF_UP);
                                r.setMontoReembolso(devuelto);
                                r.setSaldo(anticipo.subtract(devuelto));
                                r.setMotivoCancelacion("Cancelación entre 48 y 72 hrs (penalización 50%, reembolso 50%).");
                            } else {
                                r.setMontoReembolso(BigDecimal.ZERO);
                                r.setSaldo(anticipo);
                                r.setMotivoCancelacion("Cancelación con menos de 48 hrs (sin derecho a reembolso).");
                            }
                        } else {
                            r.setEstado(Reserva.NO_SHOW);
                            r.setSaldo(anticipo);
                            r.setObservaciones("Declarado No-Show formal a las 22:00 hrs por inasistencia sin notificación.");
                        }
                        historico.add(r);
                    } else if (fechaEntrada.isAfter(hoy)
                            && (confirmadasFuturas < 1 || preReservasFuturas < 1)
                            && !traslapaConExistentes(activasFuturas, hab.getIdHabitacion(), fechaEntrada, fechaSalida)) {
                        // Dejar únicamente 2 reservas futuras en este bloque (1 Confirmada + 1 Pre-reserva) más HP-DEMO-0001
                        if (confirmadasFuturas < 1) {
                            r.setEstado(Reserva.CONFIRMADA);
                            r.setSaldo(total.subtract(anticipo));
                            confirmadasFuturas++;
                        } else {
                            r.setEstado(Reserva.PRE_RESERVA);
                            r.setAnticipo(BigDecimal.ZERO);
                            r.setSaldo(total);
                            r.setMetodoPago(null);
                            r.setFechaExpiracion(ahora.plusHours(36));
                            preReservasFuturas++;
                        }
                        activasFuturas.add(r);
                        historico.add(r);
                    }
                }
            }
        }

        // Asegurar al menos una Confirmada y una Pre-reserva futuras aunque la fecha del reloj esté cerca de fin de año
        if (confirmadasFuturas == 0) {
            Habitacion habLibre = habitaciones.stream()
                    .filter(h -> !"Mantenimiento".equalsIgnoreCase(h.getEstado()))
                    .findFirst().orElse(habitaciones.get(0));
            LocalDate in = hoy.plusDays(10);
            LocalDate out = in.plusDays(3);
            if (!traslapaConExistentes(activasFuturas, habLibre.getIdHabitacion(), in, out)) {
                Reserva conf = construirReservaFuturaBase(
                        String.format("HP-%04d-%05d", hoy.getYear(), folioSecuencia++),
                        habLibre, catalogoHuespedes.get(0), adminUsuario, in, out, ahora, true
                );
                activasFuturas.add(conf);
                historico.add(conf);
            }
        }
        if (preReservasFuturas == 0) {
            Habitacion habPre = habitaciones.stream()
                    .filter(h -> !"Mantenimiento".equalsIgnoreCase(h.getEstado()))
                    .filter(h -> !traslapaConExistentes(activasFuturas, h.getIdHabitacion(), hoy.plusDays(15), hoy.plusDays(18)))
                    .findFirst().orElse(habitaciones.get(0));
            LocalDate in = hoy.plusDays(15);
            LocalDate out = hoy.plusDays(18);
            if (!traslapaConExistentes(activasFuturas, habPre.getIdHabitacion(), in, out)) {
                Reserva pre = construirReservaFuturaBase(
                        String.format("HP-%04d-%05d", hoy.getYear(), folioSecuencia++),
                        habPre, catalogoHuespedes.get(Math.min(1, catalogoHuespedes.size() - 1)),
                        adminUsuario, in, out, ahora, false
                );
                activasFuturas.add(pre);
                historico.add(pre);
            }
        }

        reservaRepository.saveAll(historico);
        asegurarReservaDemoHuesped(huespedUsuario, habitaciones, activasFuturas, hoy, ahora);
        log.info("HistoricoReservasSeeder: Generadas {} reservaciones (histórico hasta {} y futuras activas).",
                historico.size(), limiteHistorico);
    }

    private boolean traslapaConExistentes(List<Reserva> existentes, Integer idHabitacion, LocalDate entrada, LocalDate salida) {
        return existentes.stream().anyMatch(e ->
                e.getHabitacion() != null
                        && Objects.equals(e.getHabitacion().getIdHabitacion(), idHabitacion)
                        && e.getFechaEntrada().isBefore(salida)
                        && e.getFechaSalida().isAfter(entrada)
        );
    }

    private Reserva construirReservaFuturaBase(String folio, Habitacion hab, Huesped huesped, Usuario usuario,
                                               LocalDate entrada, LocalDate salida, LocalDateTime ahora, boolean confirmada) {
        int noches = (int) java.time.temporal.ChronoUnit.DAYS.between(entrada, salida);
        BigDecimal precio = (hab.getTipoHabitacion() != null && hab.getTipoHabitacion().getPrecioBase() != null)
                ? hab.getTipoHabitacion().getPrecioBase()
                : BigDecimal.valueOf(1200.00);
        BigDecimal total = precio.multiply(BigDecimal.valueOf(noches));
        BigDecimal anticipo = confirmada
                ? total.multiply(BigDecimal.valueOf(0.50)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Reserva r = new Reserva();
        r.setFolio(folio);
        r.setHabitacion(hab);
        r.setHuesped(huesped);
        r.setUsuario(usuario);
        r.setFechaEntrada(entrada);
        r.setFechaSalida(salida);
        r.setNoches(noches);
        r.setAdultos(2);
        r.setNinos(0);
        r.setCuna(false);
        r.setCamaExtra(false);
        r.setPlantaBajaSolicitada(false);
        r.setTotal(total);
        r.setAnticipo(anticipo);
        r.setSaldo(total.subtract(anticipo));
        r.setRecepcionista("Javier Morales");
        r.setFechaCreacion(ahora.minusDays(1));
        if (confirmada) {
            r.setEstado(Reserva.CONFIRMADA);
            r.setMetodoPago("TARJETA_CREDITO");
        } else {
            r.setEstado(Reserva.PRE_RESERVA);
            r.setFechaExpiracion(ahora.plusHours(36));
        }
        return r;
    }

    private void asegurarReservaDemoHuesped(Usuario huespedUsuario, List<Habitacion> habs,
                                            List<Reserva> activasFuturas, LocalDate hoy, LocalDateTime ahora) {
        if (huespedUsuario == null) return;
        if (reservaRepository.existsByFolioIgnoreCase("HP-DEMO-0001")) return;
        List<Reserva> propias = reservaRepository.findByUsuarioOrHuespedEmail(huespedUsuario.getIdUsuario(), huespedUsuario.getEmail());
        if (!propias.isEmpty()) return;
        if (habs.isEmpty()) return;

        Huesped hDemo = huespedRepository.findByEmailIgnoreCase(huespedUsuario.getEmail()).orElseGet(() -> {
            Huesped nh = new Huesped();
            nh.setNombre("Jorge Monroy");
            nh.setEmail(huespedUsuario.getEmail());
            nh.setTelefono("5541239876");
            return huespedRepository.save(nh);
        });

        LocalDate entrada = hoy.plusDays(5);
        LocalDate salida = hoy.plusDays(8);
        Habitacion hab = habs.stream()
                .filter(h -> "Disponible".equalsIgnoreCase(h.getEstado()))
                .filter(h -> !traslapaConExistentes(activasFuturas, h.getIdHabitacion(), entrada, salida))
                .findFirst()
                .orElse(habs.get(0));

        Reserva demo = construirReservaFuturaBase("HP-DEMO-0001", hab, hDemo, huespedUsuario, entrada, salida, ahora, true);
        reservaRepository.save(demo);
    }

    private List<Huesped> asegurarHuespedes() {
        List<Huesped> lista = new ArrayList<>();
        Random r = new Random(42L);
        for (String nombre : NOMBRES_HUESPEDES) {
            String email = normalizarEmail(nombre);
            var opt = huespedRepository.findByEmailIgnoreCase(email);
            if (opt.isPresent()) {
                lista.add(opt.get());
            } else {
                Huesped h = new Huesped();
                h.setNombre(nombre);
                h.setEmail(email);
                h.setTelefono(String.format("55%08d", 10000000 + r.nextInt(89999999)));
                lista.add(huespedRepository.save(h));
            }
        }
        return lista;
    }

    private String normalizarEmail(String nombre) {
        String base = nombre.toLowerCase()
                .replace(" ", ".")
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .replace("ñ", "n");
        return base + "@correo.com";
    }
}
