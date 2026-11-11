package com.ico.hotel;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.config.HistoricoReservasSeeder;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Huesped;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HuespedRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.ReservaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class FlywayYTimezoneTestcontainersTest extends AbstractMysqlTestcontainerTest {

    private static final ZoneId ZONA = ClockConfig.ZONA_MEXICO;

    @BeforeAll
    static void setUtcJvm() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private ReservaService reservaService;

    @Autowired
    private HistoricoReservasSeeder seeder;

    @Autowired
    private Clock hotelClock;

    @AfterEach
    void resetClock() {
        reservaService.setClock(hotelClock);
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("BD vacía en Testcontainers MySQL 8 ejecuta V1-V5, pasa ddl-auto=validate y seeder respeta P0.4")
    void testArranqueBdVaciaFlywayV1AV5YSeeder() throws Exception {
        List<Map<String, Object>> historial = jdbcTemplate.queryForList(
                "SELECT version, script, success FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank"
        );
        assertThat(historial).extracting(m -> String.valueOf(m.get("version")))
                .containsExactly("1", "2", "3", "4", "5");
        assertThat(historial).allMatch(m -> Boolean.TRUE.equals(m.get("success")) || Integer.valueOf(1).equals(m.get("success")));

        LocalDate hoy = LocalDate.now(hotelClock);
        long totalTrasArranque = reservaRepository.count();
        assertThat(totalTrasArranque).isGreaterThanOrEqualTo(40);

        // Ninguna reserva con fecha_salida > hoy quedó como Finalizada
        Integer finalizadasFuturas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva WHERE estado = 'Finalizada' AND fecha_salida > ?",
                Integer.class,
                hoy
        );
        assertThat(finalizadasFuturas).isZero();

        // Todas las Finalizada generadas por el seeder tienen saldo = 0 y metodo_pago_saldo
        Integer finalizadasSinLiquidar = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva WHERE estado = 'Finalizada' AND (saldo <> 0 OR metodo_pago_saldo IS NULL OR metodo_pago_saldo = '')",
                Integer.class
        );
        assertThat(finalizadasSinLiquidar).isZero();

        // Se dejaron 2-3 reservas Confirmada / Pre-reserva futuras
        Integer futurasActivas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva WHERE estado IN ('Confirmada', 'Pre-reserva') AND fecha_salida > ?",
                Integer.class,
                hoy
        );
        assertThat(futurasActivas).isBetween(2, 3);

        // Idempotencia del seeder: segunda ejecución no duplica
        seeder.run(null);
        assertThat(reservaRepository.count()).isEqualTo(totalTrasArranque);
    }

    @Test
    @DisplayName("Testcontainers MySQL 8 (UTC) con JVM UTC persiste timestamps exactos de Clock America/Mexico_City")
    void testReservaTimezoneUtcContraTestcontainersMysql8() {
        assertThat(TimeZone.getDefault().getID()).isEqualTo("UTC");

        Usuario u = Usuario.builder()
                .idUsuario(1)
                .nombre("Recepcion Container Test")
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
                .filter(h -> "Disponible".equalsIgnoreCase(h.getEstado()))
                .findFirst()
                .orElseThrow();

        Huesped hue = new Huesped();
        hue.setNombre("Huesped TC");
        hue.setEmail("tc-tz-" + System.nanoTime() + "@example.com");
        hue.setTelefono("5512340099");
        hue = huespedRepository.save(hue);

        Reserva r = new Reserva();
        r.setFolio("HP-TC-TZ-" + System.nanoTime());
        r.setHuesped(hue);
        r.setHabitacion(hab);
        r.setFechaEntrada(LocalDate.of(2019, 5, 10));
        r.setFechaSalida(LocalDate.of(2019, 5, 13));
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
        r.setMetodoPago("Tarjeta");
        r.setFechaCreacion(LocalDateTime.of(2019, 5, 9, 10, 0));
        r = reservaRepository.save(r);

        LocalDateTime horaCheckInMx = LocalDateTime.of(2019, 5, 10, 16, 40, 34);
        reservaService.setClock(Clock.fixed(horaCheckInMx.atZone(ZONA).toInstant(), ZONA));
        reservaService.checkIn(r.getIdReserva());

        LocalDateTime horaCheckOutMx = LocalDateTime.of(2019, 5, 11, 11, 15, 20);
        reservaService.setClock(Clock.fixed(horaCheckOutMx.atZone(ZONA).toInstant(), ZONA));
        reservaService.checkOut(r.getIdReserva(), "Efectivo");

        Map<String, Object> fila = jdbcTemplate.queryForMap(
                "SELECT DATE_FORMAT(check_in_at, '%Y-%m-%d %H:%i:%s') AS ci, " +
                "DATE_FORMAT(check_out_at, '%Y-%m-%d %H:%i:%s') AS co FROM reserva WHERE id_reserva = ?",
                r.getIdReserva()
        );
        assertThat(fila.get("ci")).isEqualTo("2019-05-10 16:40:34");
        assertThat(fila.get("co")).isEqualTo("2019-05-11 11:15:20");

        List<Map<String, Object>> evs = jdbcTemplate.queryForList(
                "SELECT tipo, DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s') AS fh " +
                "FROM reserva_evento WHERE id_reserva = ? ORDER BY id ASC",
                r.getIdReserva()
        );
        assertThat(evs).hasSize(2);
        assertThat(evs.get(0).get("fh")).isEqualTo("2019-05-10 16:40:34");
        assertThat(evs.get(1).get("fh")).isEqualTo("2019-05-11 11:15:20");
    }
}
