package com.ico.hotel;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.controllers.ReservaController;
import com.ico.hotel.exceptions.ConflictoEstanciaException;
import com.ico.hotel.exceptions.ReglaEstanciaException;
import com.ico.hotel.exceptions.TransicionEstadoInvalidaException;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.*;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.ReservaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class ReservaEstanciaTest extends AbstractMysqlTestcontainerTest {

    private static final ZoneId ZONA = ClockConfig.ZONA_MEXICO;

    @Autowired
    private ReservaService reservaService;

    @Autowired
    private ReservaController reservaController;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private ReservaEventoRepository reservaEventoRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private Clock systemClock;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private final List<Integer> reservasTempIds = new ArrayList<>();
    private final List<Integer> huespedesTempIds = new ArrayList<>();
    private Integer habitacionIdRestaurar;
    private String estadoOriginalHabitacion;

    @BeforeEach
    void setup() {
        reservaService.setClock(systemClock);
        reservaService.setExpiracionDryRun(false);
    }

    @AfterEach
    void cleanup() {
        reservaService.setClock(systemClock);
        reservaService.setExpiracionDryRun(true);
        SecurityContextHolder.clearContext();

        transactionTemplate.executeWithoutResult(status -> {
            for (Integer idRes : reservasTempIds) {
                List<ReservaEvento> evs = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(idRes);
                if (!evs.isEmpty()) {
                    reservaEventoRepository.deleteAll(evs);
                }
                reservaRepository.findById(idRes).ifPresent(reservaRepository::delete);
            }
            for (Integer idHue : huespedesTempIds) {
                huespedRepository.findById(idHue).ifPresent(huespedRepository::delete);
            }
            if (habitacionIdRestaurar != null && estadoOriginalHabitacion != null) {
                habitacionRepository.findById(habitacionIdRestaurar).ifPresent(h -> {
                    h.setEstado(estadoOriginalHabitacion);
                    habitacionRepository.save(h);
                });
            }
        });
        reservasTempIds.clear();
        huespedesTempIds.clear();
        habitacionIdRestaurar = null;
        estadoOriginalHabitacion = null;
    }

    private void autenticarComo(Rol rol, String email) {
        Usuario u = Usuario.builder()
                .idUsuario(rol == Rol.GERENTE ? 21 : (rol == Rol.ADMINISTRADOR ? 1 : 22))
                .nombre("Test " + rol.name())
                .email(email)
                .passwordHash("hash")
                .rol(rol)
                .verificado(true)
                .activo(true)
                .build();
        CustomUserDetails cud = new CustomUserDetails(u);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(cud, null, cud.getAuthorities())
        );
    }

    private Habitacion obtenerHabitacionLibreParaPrueba() {
        Habitacion h = habitacionRepository.findAll().stream()
                .filter(hab -> hab.getHotel() != null && !Boolean.FALSE.equals(hab.getHotel().getActivo()))
                .filter(hab -> "Disponible".equalsIgnoreCase(hab.getEstado()))
                .filter(hab -> reservaRepository.findActivasByHabitacion(hab.getIdHabitacion()).isEmpty())
                .findFirst()
                .orElseGet(() -> habitacionRepository.findAll().stream()
                        .filter(hab -> hab.getHotel() != null && !Boolean.FALSE.equals(hab.getHotel().getActivo()))
                        .filter(hab -> "Disponible".equalsIgnoreCase(hab.getEstado()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("No hay habitación disponible para pruebas.")));
        habitacionIdRestaurar = h.getIdHabitacion();
        estadoOriginalHabitacion = h.getEstado();
        return h;
    }

    private Reserva crearReservaBaseEnMysql(Habitacion hab, String estado, LocalDate entrada, LocalDate salida) {
        return transactionTemplate.execute(status -> {
            Huesped hue = new Huesped();
            hue.setNombre("Huésped Test Estancia");
            hue.setTelefono("5599887766");
            hue.setEmail("test.estancia." + System.nanoTime() + "@correo.com");
            hue = huespedRepository.saveAndFlush(hue);
            huespedesTempIds.add(hue.getIdHuesped());

            Reserva r = new Reserva();
            r.setFolio("HP-TEST-" + System.nanoTime());
            r.setHabitacion(hab);
            r.setHuesped(hue);
            r.setFechaEntrada(entrada);
            r.setFechaSalida(salida);
            r.setNoches(2);
            r.setAdultos(2);
            r.setNinos(0);
            r.setTotal(new BigDecimal("2400.00"));
            r.setAnticipo(Reserva.PRE_RESERVA.equals(estado) ? BigDecimal.ZERO : new BigDecimal("1200.00"));
            r.setSaldo(Reserva.PRE_RESERVA.equals(estado) ? new BigDecimal("2400.00") : new BigDecimal("1200.00"));
            r.setEstado(estado);
            r.setMetodoPago(Reserva.PRE_RESERVA.equals(estado) ? null : "Efectivo");
            r.setRecepcionista("Javier Morales");
            r.setFechaCreacion(LocalDateTime.now(ZONA));
            r = reservaRepository.saveAndFlush(r);
            reservasTempIds.add(r.getIdReserva());
            return r;
        });
    }

    @Test
    @DisplayName("1. Transiciones inválidas en máquina de estados devuelven HTTP 409 Conflict")
    void testTransicionesInvalidasDevuelven409() {
        autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        LocalDate hoy = LocalDate.of(2026, 11, 10);
        Clock relojFijo = Clock.fixed(hoy.atTime(16, 0).atZone(ZONA).toInstant(), ZONA);
        reservaService.setClock(relojFijo);

        Reserva preReserva = crearReservaBaseEnMysql(hab, Reserva.PRE_RESERVA, hoy, hoy.plusDays(2));

        // Direct check-in desde Pre-reserva -> 409
        ResponseEntity<?> resCheckIn = reservaController.checkIn(preReserva.getIdReserva());
        assertThat(resCheckIn.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // Check-out desde Pre-reserva -> 409
        ResponseEntity<?> resCheckOut = reservaController.checkOut(preReserva.getIdReserva(), java.util.Map.of("metodoPagoSaldo", "Efectivo"));
        assertThat(resCheckOut.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // Finalizada es terminal -> 409
        Reserva finalizada = crearReservaBaseEnMysql(hab, Reserva.FINALIZADA, hoy.minusDays(3), hoy.minusDays(1));
        assertThatThrownBy(() -> EstadoReserva.FINALIZADA.validarTransicion(EstadoReserva.CONFIRMADA))
                .isInstanceOf(TransicionEstadoInvalidaException.class);
        ResponseEntity<?> resFinalizada = reservaController.checkIn(finalizada.getIdReserva());
        assertThat(resFinalizada.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    @DisplayName("2. Check-In con fecha futura es rechazado y reserva futura no marca habitación como Ocupada")
    void testCheckInFechaFuturaRechazadoYHabitacionSigueDisponibleHoy() {
        autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
        Habitacion hab = obtenerHabitacionLibreParaPrueba();

        LocalDate hoy = LocalDate.of(2026, 11, 10);
        reservaService.setClock(Clock.fixed(hoy.atTime(15, 30).atZone(ZONA).toInstant(), ZONA));

        // Reserva futura (entra dentro de 5 días)
        Reserva futura = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, hoy.plusDays(5), hoy.plusDays(7));

        // Check-In antes de fechaEntrada debe rechazarse con ReglaEstanciaException
        assertThatThrownBy(() -> reservaService.checkIn(futura.getIdReserva()))
                .isInstanceOf(ReglaEstanciaException.class)
                .hasMessageContaining("antes de la fecha de entrada");

        // Verificar que la habitación sigue Disponible hoy, pero periodosOcupados sí incluye la reserva futura
        Habitacion habActualizada = habitacionRepository.findById(hab.getIdHabitacion()).orElseThrow();
        reservaService.enriquecerHabitacion(habActualizada);
        assertThat(habActualizada.getEstado()).isEqualTo("Disponible");
        assertThat(habActualizada.getPeriodosOcupados())
                .anySatisfy(p -> assertThat(p.get("folio")).isEqualTo(futura.getFolio()));
    }

    @Test
    @DisplayName("3. No-Show rechazado a las 21:59 y aceptado a las 22:00 (America/Mexico_City)")
    void testNoShowHoraLimite2200() {
        autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        LocalDate entrada = LocalDate.of(2026, 11, 10);
        Reserva r = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, entrada, entrada.plusDays(2));

        // 21:59 -> rechazado
        Clock reloj2159 = Clock.fixed(entrada.atTime(21, 59).atZone(ZONA).toInstant(), ZONA);
        reservaService.setClock(reloj2159);
        assertThatThrownBy(() -> reservaService.noShow(r.getIdReserva()))
                .isInstanceOf(ReglaEstanciaException.class)
                .hasMessageContaining("22:00");

        // 22:00 -> aceptado, conserva anticipo y registra evento NO_SHOW
        Clock reloj2200 = Clock.fixed(entrada.atTime(22, 0).atZone(ZONA).toInstant(), ZONA);
        reservaService.setClock(reloj2200);
        Reserva marcada = reservaService.noShow(r.getIdReserva());

        assertThat(marcada.getEstado()).isEqualTo(Reserva.NO_SHOW);
        assertThat(marcada.getAnticipo()).isEqualByComparingTo("1200.00");

        List<ReservaEvento> eventos = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(r.getIdReserva());
        assertThat(eventos).hasSize(1);
        assertThat(eventos.get(0).getTipo()).isEqualTo("NO_SHOW");
        assertThat(eventos.get(0).getFechaHora()).isEqualTo(entrada.atTime(22, 0));
    }

    @Test
    @DisplayName("4. Check-Out sin método de pago es rechazado; con método válido liquida saldo a 0")
    void testCheckOutMetodoPagoYAnticipada() {
        autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        LocalDate hoy = LocalDate.of(2026, 11, 10);
        Clock relojCheckIn = Clock.fixed(hoy.atTime(15, 0).atZone(ZONA).toInstant(), ZONA);
        reservaService.setClock(relojCheckIn);

        Reserva r = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, hoy, hoy.plusDays(3));
        reservaService.checkIn(r.getIdReserva());

        // Sin método de pago -> rechazado
        assertThatThrownBy(() -> reservaService.checkOut(r.getIdReserva(), "  "))
                .isInstanceOf(ReglaEstanciaException.class)
                .hasMessageContaining("método de pago");

        // Salida anticipada al día siguiente con método TARJETA_CREDITO -> saldo = 0 y Finalizada sin reembolso
        Clock relojCheckOutAnticipado = Clock.fixed(hoy.plusDays(1).atTime(11, 30).atZone(ZONA).toInstant(), ZONA);
        reservaService.setClock(relojCheckOutAnticipado);
        Reserva finalizada = reservaService.checkOut(r.getIdReserva(), "TARJETA_CREDITO");

        assertThat(finalizada.getEstado()).isEqualTo(Reserva.FINALIZADA);
        assertThat(finalizada.getSaldo()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(finalizada.getMetodoPagoSaldo()).isEqualTo("TARJETA_CREDITO");
        assertThat(finalizada.getCheckOutAt()).isEqualTo(hoy.plusDays(1).atTime(11, 30));
        assertThat(finalizada.getObservaciones()).contains("Salida anticipada");
    }

    @Test
    @DisplayName("5. Concurrencia contra MySQL real: dos Check-Ins simultáneos, solo uno tiene éxito")
    void testConcurrenciaRealDosCheckInsSimultaneosMysql() throws Exception {
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        LocalDate hoy = LocalDate.of(2026, 11, 10);
        Clock reloj = Clock.fixed(hoy.atTime(16, 0).atZone(ZONA).toInstant(), ZONA);
        reservaService.setClock(reloj);

        Reserva r = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, hoy, hoy.plusDays(2));
        final Integer idReserva = r.getIdReserva();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrier = new CyclicBarrier(2);
        List<Throwable> errores = Collections.synchronizedList(new ArrayList<>());
        List<Reserva> exitos = Collections.synchronizedList(new ArrayList<>());

        Callable<Void> tarea = () -> {
            autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
            try {
                barrier.await(5, TimeUnit.SECONDS);
                Reserva ok = reservaService.checkIn(idReserva);
                exitos.add(ok);
            } catch (Throwable t) {
                errores.add(t);
            } finally {
                SecurityContextHolder.clearContext();
            }
            return null;
        };

        Future<Void> f1 = pool.submit(tarea);
        Future<Void> f2 = pool.submit(tarea);
        f1.get(15, TimeUnit.SECONDS);
        f2.get(15, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(exitos).hasSize(1);
        assertThat(errores).hasSize(1);
        assertThat(errores.get(0)).isInstanceOf(TransicionEstadoInvalidaException.class);

        Reserva enBd = reservaRepository.findById(idReserva).orElseThrow();
        assertThat(enBd.getEstado()).isEqualTo(Reserva.OCUPADA);

        List<ReservaEvento> eventos = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(idReserva);
        assertThat(eventos).hasSize(1);
        assertThat(eventos.get(0).getTipo()).isEqualTo("CHECK_IN");
    }

    @Test
    @DisplayName("6. RECEPCIONISTA no puede revertir No-Show; GERENTE sí dentro de 24 h sin traslape ajeno")
    void testRevertirNoShowRolYVentana24h() {
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        LocalDate entrada = LocalDate.of(2026, 11, 10);
        Reserva r = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, entrada, entrada.plusDays(2));

        // 22:05 del día de entrada: Recepción marca No-Show
        autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
        reservaService.setClock(Clock.fixed(entrada.atTime(22, 5).atZone(ZONA).toInstant(), ZONA));
        reservaService.noShow(r.getIdReserva());

        // RECEPCIONISTA intenta revertir -> AccessDeniedException (403)
        assertThatThrownBy(() -> reservaService.revertirNoShow(r.getIdReserva()))
                .isInstanceOf(AccessDeniedException.class);

        // GERENTE intenta revertir a las +24h 01m -> ConflictoEstanciaException (409)
        autenticarComo(Rol.GERENTE, "gerente@hotelparaiso.com");
        reservaService.setClock(Clock.fixed(entrada.plusDays(1).atTime(22, 6).atZone(ZONA).toInstant(), ZONA));
        assertThatThrownBy(() -> reservaService.revertirNoShow(r.getIdReserva()))
                .isInstanceOf(ConflictoEstanciaException.class)
                .hasMessageContaining("24 horas");

        // Si otra reserva activa ocupa las fechas tras el No-Show, revertirNoShow debe lanzar ConflictoEstanciaException
        Reserva competidora = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, entrada, entrada.plusDays(2));
        reservaService.setClock(Clock.fixed(entrada.plusDays(1).atTime(10, 0).atZone(ZONA).toInstant(), ZONA));
        assertThatThrownBy(() -> reservaService.revertirNoShow(r.getIdReserva()))
                .isInstanceOf(ConflictoEstanciaException.class)
                .hasMessageContaining("otra reservación activa");

        // Quitamos la competidora; al revertir ahora, solo existe la propia reserva y sí permite revertir
        transactionTemplate.executeWithoutResult(status -> reservaRepository.findById(competidora.getIdReserva()).ifPresent(reservaRepository::delete));
        reservasTempIds.remove(competidora.getIdReserva());

        Reserva revertida = reservaService.revertirNoShow(r.getIdReserva());
        assertThat(revertida.getEstado()).isEqualTo(Reserva.CONFIRMADA);

        List<ReservaEvento> eventos = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(r.getIdReserva());
        assertThat(eventos).extracting(ReservaEvento::getTipo).containsExactly("NO_SHOW", "REVERTIR_NO_SHOW");
    }

    @Test
    @DisplayName("7. Job automático expira Pre-reserva con evento EXPIRACION y pasa Confirmada a NO_SHOW a las 22:00 como SISTEMA")
    void testJobExpiracionPreReservaYNoShowAutomaticoSistema() {
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        // Usar fecha de prueba anterior al dataset 2020-2026 para aislar el job sin tocar reservas reales de hotel_db
        LocalDate fechaPrueba = LocalDate.of(2019, 6, 10);

        Reserva preVencida = crearReservaBaseEnMysql(hab, Reserva.PRE_RESERVA, fechaPrueba.plusDays(1), fechaPrueba.plusDays(3));
        transactionTemplate.executeWithoutResult(st -> {
            Reserva p = reservaRepository.findById(preVencida.getIdReserva()).orElseThrow();
            p.setFechaExpiracion(fechaPrueba.atTime(21, 0));
            reservaRepository.save(p);
        });

        Reserva confirmadaHoy = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, fechaPrueba, fechaPrueba.plusDays(2));

        // A las 21:59 -> pre-reserva vencida expira (EXPIRACION), pero confirmadaHoy todavía NO es No-Show
        reservaService.setClock(Clock.fixed(fechaPrueba.atTime(21, 59).atZone(ZONA).toInstant(), ZONA));
        reservaService.expirarPreReservas();

        Reserva preTras2159 = reservaRepository.findById(preVencida.getIdReserva()).orElseThrow();
        Reserva confTras2159 = reservaRepository.findById(confirmadaHoy.getIdReserva()).orElseThrow();
        assertThat(preTras2159.getEstado()).isEqualTo(Reserva.CANCELADA);
        assertThat(confTras2159.getEstado()).isEqualTo(Reserva.CONFIRMADA);

        List<ReservaEvento> evPre = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(preVencida.getIdReserva());
        assertThat(evPre).hasSize(1);
        assertThat(evPre.get(0).getTipo()).isEqualTo("EXPIRACION");
        assertThat(evPre.get(0).getUsuario()).isEqualTo("SISTEMA");

        // A las 22:00 -> confirmadaHoy pasa automáticamente a NO_SHOW con usuario SISTEMA
        reservaService.setClock(Clock.fixed(fechaPrueba.atTime(22, 0).atZone(ZONA).toInstant(), ZONA));
        reservaService.expirarPreReservas();

        Reserva confTras2200 = reservaRepository.findById(confirmadaHoy.getIdReserva()).orElseThrow();
        assertThat(confTras2200.getEstado()).isEqualTo(Reserva.NO_SHOW);

        List<ReservaEvento> evConf = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(confirmadaHoy.getIdReserva());
        assertThat(evConf).hasSize(1);
        assertThat(evConf.get(0).getTipo()).isEqualTo("NO_SHOW");
        assertThat(evConf.get(0).getUsuario()).isEqualTo("SISTEMA");
    }

    @Test
    @DisplayName("8. Job NO auto-finaliza estancias Ocupada vencidas y marca salidaPendiente = true en enriquecimiento")
    void testJobNoAutoFinalizaOcupadaYCalculaSalidaPendiente() {
        autenticarComo(Rol.RECEPCIONISTA, "recepcion@hotelparaiso.com");
        Habitacion hab = obtenerHabitacionLibreParaPrueba();
        LocalDate entrada = LocalDate.of(2019, 6, 10);
        LocalDate salida = LocalDate.of(2019, 6, 12);

        Reserva r = crearReservaBaseEnMysql(hab, Reserva.CONFIRMADA, entrada, salida);
        reservaService.setClock(Clock.fixed(entrada.atTime(15, 0).atZone(ZONA).toInstant(), ZONA));
        reservaService.checkIn(r.getIdReserva());

        // El día de salida a las 12:05 (vencida), el job NO la debe pasar a Finalizada
        reservaService.setClock(Clock.fixed(salida.atTime(12, 5).atZone(ZONA).toInstant(), ZONA));
        reservaService.expirarPreReservas();

        Reserva enBd = reservaRepository.findById(r.getIdReserva()).orElseThrow();
        assertThat(enBd.getEstado()).isEqualTo(Reserva.OCUPADA);

        // Al enriquecerla, salidaPendiente debe ser true para alertar en UI
        reservaService.enriquecerReserva(enBd);
        assertThat(enBd.getSalidaPendiente()).isTrue();
    }
}
