package com.ico.hotel;

import com.ico.hotel.config.ClockConfig;
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
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.ReservaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ReservaTimezoneUtcTest extends AbstractMysqlTestcontainerTest {

    private static final ZoneId ZONA = ClockConfig.ZONA_MEXICO;

    @Autowired
    private ReservaService reservaService;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private ReservaEventoRepository reservaEventoRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Clock systemClock;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private final List<Integer> reservasTempIds = new ArrayList<>();
    private final List<Integer> huespedesTempIds = new ArrayList<>();
    private Integer habitacionIdRestaurar;
    private String estadoOriginalHabitacion;
    private TimeZone originalTimeZone;

    @BeforeEach
    void setup() {
        originalTimeZone = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        reservaService.setClock(systemClock);
    }

    @AfterEach
    void cleanup() {
        if (originalTimeZone != null) {
            TimeZone.setDefault(originalTimeZone);
        }
        reservaService.setClock(systemClock);
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

    @Test
    @DisplayName("Con JVM en UTC (-Duser.timezone=UTC), check_in_at, check_out_at y reserva_evento.fecha_hora coinciden con Clock Mexico")
    void testTimestampsCoincidenConClockAunqueJvmEsteEnUtc() {
        assertThat(TimeZone.getDefault().getID()).isEqualTo("UTC");
        assertThat(systemClock.getZone()).isEqualTo(ZONA);

        Usuario u = Usuario.builder()
                .idUsuario(9001)
                .nombre("Recepcion UTC Test")
                .email("recepcion@hotelparaiso.com")
                .passwordHash("hash")
                .rol(Rol.RECEPCIONISTA)
                .verificado(true)
                .activo(true)
                .build();
        CustomUserDetails cud = new CustomUserDetails(u);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(cud, null, cud.getAuthorities())
        );

        Habitacion hab = habitacionRepository.findAll().stream()
                .filter(h -> !"Mantenimiento".equalsIgnoreCase(h.getEstado()))
                .findFirst()
                .orElseThrow();
        habitacionIdRestaurar = hab.getIdHabitacion();
        estadoOriginalHabitacion = hab.getEstado();

        Huesped hue = new Huesped();
        hue.setNombre("Huesped Timezone Test");
        hue.setEmail("tz-test-" + System.nanoTime() + "@example.com");
        hue.setTelefono("5511223344");
        hue = huespedRepository.save(hue);
        huespedesTempIds.add(hue.getIdHuesped());

        LocalDate entrada = LocalDate.of(2019, 5, 10);
        LocalDate salida = LocalDate.of(2019, 5, 13);

        Reserva r = new Reserva();
        r.setFolio("HP-TEST-TZ-" + System.nanoTime());
        r.setHuesped(hue);
        r.setHabitacion(hab);
        r.setFechaEntrada(entrada);
        r.setFechaSalida(salida);
        r.setNoches(3);
        r.setAdultos(2);
        r.setNinos(0);
        r.setCuna(false);
        r.setCamaExtra(false);
        r.setPlantaBajaSolicitada(false);
        r.setEstado(Reserva.CONFIRMADA);
        r.setTotal(new BigDecimal("3000.00"));
        r.setAnticipo(new BigDecimal("1500.00"));
        r.setSaldo(new BigDecimal("1500.00"));
        r.setMetodoPago("TARJETA_CREDITO");
        r.setFechaCreacion(LocalDateTime.of(2019, 5, 9, 10, 0));
        r = reservaRepository.save(r);
        reservasTempIds.add(r.getIdReserva());

        // Reloj fijado a 16:40:34 hora America/Mexico_City (22:40:34 UTC)
        LocalDateTime horaCheckInMx = LocalDateTime.of(2019, 5, 10, 16, 40, 34);
        reservaService.setClock(Clock.fixed(horaCheckInMx.atZone(ZONA).toInstant(), ZONA));
        Reserva trasIn = reservaService.checkIn(r.getIdReserva());
        assertThat(trasIn.getCheckInAt()).isEqualTo(horaCheckInMx);

        // Reloj fijado a 11:15:20 hora America/Mexico_City del día siguiente (salida anticipada -> válida por tener check_out_at)
        LocalDateTime horaCheckOutMx = LocalDateTime.of(2019, 5, 11, 11, 15, 20);
        reservaService.setClock(Clock.fixed(horaCheckOutMx.atZone(ZONA).toInstant(), ZONA));
        Reserva trasOut = reservaService.checkOut(r.getIdReserva(), "Efectivo");
        assertThat(trasOut.getCheckOutAt()).isEqualTo(horaCheckOutMx);

        // Verificar valor crudo guardado en MySQL sin pasar por conversión JPA
        Map<String, Object> filaReserva = jdbcTemplate.queryForMap(
                "SELECT DATE_FORMAT(check_in_at, '%Y-%m-%d %H:%i:%s') AS ci, " +
                "DATE_FORMAT(check_out_at, '%Y-%m-%d %H:%i:%s') AS co " +
                "FROM reserva WHERE id_reserva = ?",
                r.getIdReserva()
        );
        assertThat(filaReserva.get("ci")).isEqualTo("2019-05-10 16:40:34");
        assertThat(filaReserva.get("co")).isEqualTo("2019-05-11 11:15:20");

        List<Map<String, Object>> eventosSql = jdbcTemplate.queryForList(
                "SELECT tipo, DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s') AS fh " +
                "FROM reserva_evento WHERE id_reserva = ? ORDER BY id ASC",
                r.getIdReserva()
        );
        assertThat(eventosSql).hasSize(2);
        assertThat(eventosSql.get(0).get("tipo")).isEqualTo("CHECK_IN");
        assertThat(eventosSql.get(0).get("fh")).isEqualTo("2019-05-10 16:40:34");
        assertThat(eventosSql.get(1).get("tipo")).isEqualTo("CHECK_OUT");
        assertThat(eventosSql.get(1).get("fh")).isEqualTo("2019-05-11 11:15:20");

        // Regla P0.4: una Finalizada con fecha_salida > hoy solo es válida si tiene check_out_at
        LocalDate hoySimulado = LocalDate.of(2019, 5, 11);
        boolean finalizadaFuturaValida = Reserva.FINALIZADA.equals(trasOut.getEstado())
                && trasOut.getFechaSalida().isAfter(hoySimulado)
                && trasOut.getCheckOutAt() != null;
        assertThat(finalizadaFuturaValida).isTrue();
    }
}
