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
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.testcontainers.mysql.MySQLContainer;

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
    @DisplayName("BD vacía en Testcontainers MySQL 8 ejecuta V1-V7, pasa ddl-auto=validate y seeder respeta P0.4")
    void testArranqueBdVaciaFlywayV1AV5YSeeder() throws Exception {
        List<Map<String, Object>> historial = jdbcTemplate.queryForList(
                "SELECT version, script, success FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank"
        );
        assertThat(historial).extracting(m -> String.valueOf(m.get("version")))
                .containsExactly("1", "2", "3", "4", "5", "6", "7");
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

    @Test
    @DisplayName("Migración escalonada V6 -> inserta 5 filas de ejemplo -> V7 liquida saldo, conserva metodo_pago y crea 5 eventos")
    void testMigracionV6AV7RegularizaLas5FilasYNoTocaOtras() {
        try (MySQLContainer tc = new MySQLContainer("mysql:8.0.40")
                .withDatabaseName("hotel_v7_test")
                .withUsername("test")
                .withPassword("test")) {
            tc.start();
            String url = tc.getJdbcUrl() + (tc.getJdbcUrl().contains("?") ? "&" : "?")
                    + "useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Mexico_City";
            DriverManagerDataSource ds = new DriverManagerDataSource(url, tc.getUsername(), tc.getPassword());
            JdbcTemplate jdbc = new JdbcTemplate(ds);

            // 1. Migrar únicamente hasta v6
            Flyway flywayV6 = Flyway.configure()
                    .dataSource(ds)
                    .locations("classpath:db/migration")
                    .target("6")
                    .load();
            flywayV6.migrate();

            // Crear padres de FK dedicados para que no dependan ni choquen con R__seed_catalogo_inicial al migrar a v7
            jdbc.update("INSERT INTO hotel (id_hotel, activo, ciudad, direccion, email, nombre, telefono) " +
                    "VALUES (999, b'1', 'Cancún', 'Av. Kukulcán', 'v7test@hotel.com', 'Hotel V7 Test', '9981234567')");
            jdbc.update("INSERT INTO tipo_habitacion (id_tipo, capacidad, descripcion, nombre, precio_base) " +
                    "VALUES (999, 2, 'Tipo prueba V7', 'Estándar V7', 1200.00)");
            jdbc.update("INSERT INTO habitacion (id_habitacion, estado, numero, piso, id_hotel, id_tipo) " +
                    "VALUES (999, 'Disponible', 'V7-101', 1, 999, 999)");
            jdbc.update("INSERT INTO huesped (id_huesped, email, nombre, telefono) " +
                    "VALUES (999, 'huesped.v7@test.com', 'Huésped V7', '5512345678')");
            Integer idHab = 999;
            Integer idHue = 999;

            // Insertar las 5 filas con los mismos id_reserva, folio, estado='Finalizada', saldo>0 y metodo_pago
            Object[][] muestras = {
                    {4, "HP-2026-00004", "Efectivo", new BigDecimal("1200.00"), new BigDecimal("600.00"), new BigDecimal("600.00")},
                    {6, "HP-2026-00006", "Efectivo", new BigDecimal("1200.00"), new BigDecimal("600.00"), new BigDecimal("600.00")},
                    {13, "HP-2026-00013", "Efectivo", new BigDecimal("1300.00"), new BigDecimal("650.00"), new BigDecimal("650.00")},
                    {799, "HP-2026-00767", "TARJETA_DEBITO", new BigDecimal("2600.00"), new BigDecimal("1300.00"), new BigDecimal("1300.00")},
                    {800, "HP-2026-00768", "TARJETA_CREDITO", new BigDecimal("2000.00"), new BigDecimal("1000.00"), new BigDecimal("1000.00")},
                    // Fila extra con distinto id/folio para confirmar que V7 NO la modifica
                    {900, "HP-2026-00900", "Efectivo", new BigDecimal("1000.00"), new BigDecimal("500.00"), new BigDecimal("500.00")}
            };
            for (Object[] m : muestras) {
                jdbc.update(
                        "INSERT INTO reserva (id_reserva, folio, id_habitacion, id_huesped, fecha_entrada, fecha_salida, " +
                        "noches, adultos, ninos, estado, total, anticipo, saldo, metodo_pago) " +
                        "VALUES (?, ?, ?, ?, '2026-10-26', '2026-10-27', 1, 1, 0, 'Finalizada', ?, ?, ?, ?)",
                        m[0], m[1], idHab, idHue, m[3], m[4], m[5], m[2]
                );
            }

            // 2. Migrar hasta v7
            Flyway flywayV7 = Flyway.configure()
                    .dataSource(ds)
                    .locations("classpath:db/migration")
                    .target("7")
                    .load();
            var result = flywayV7.migrate();
            assertThat(result.migrationsExecuted).isEqualTo(1);

            // 3. Validar las 5 filas regularizadas y la fila 900 intacta
            List<Map<String, Object>> regularizadas = jdbc.queryForList(
                    "SELECT id_reserva, folio, saldo, metodo_pago, metodo_pago_saldo FROM reserva " +
                    "WHERE id_reserva IN (4, 6, 13, 799, 800) ORDER BY id_reserva"
            );
            assertThat(regularizadas).hasSize(5);
            for (Map<String, Object> filaRes : regularizadas) {
                assertThat((BigDecimal) filaRes.get("saldo")).isEqualByComparingTo("0.00");
                assertThat(filaRes.get("metodo_pago_saldo")).isEqualTo(filaRes.get("metodo_pago"));
            }

            BigDecimal saldo900 = jdbc.queryForObject("SELECT saldo FROM reserva WHERE id_reserva = 900", BigDecimal.class);
            assertThat(saldo900).isEqualByComparingTo("500.00");

            List<Map<String, Object>> eventos = jdbc.queryForList(
                    "SELECT id_reserva, tipo, estado_anterior, estado_nuevo, usuario, " +
                    "DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s') AS fh, detalle " +
                    "FROM reserva_evento WHERE tipo = 'CORRECCION_DATOS' ORDER BY id_reserva"
            );
            assertThat(eventos).hasSize(5);
            assertThat(eventos).extracting(e -> ((Number) e.get("id_reserva")).intValue())
                    .containsExactly(4, 6, 13, 799, 800);
            for (Map<String, Object> ev : eventos) {
                assertThat(ev.get("estado_anterior")).isEqualTo("Finalizada");
                assertThat(ev.get("estado_nuevo")).isEqualTo("Finalizada");
                assertThat(ev.get("usuario")).isEqualTo("MIGRACION");
                assertThat(ev.get("fh")).isEqualTo("2026-11-10 23:00:00");
                assertThat(ev.get("detalle")).isEqualTo("Regularización de datos de prueba: saldo asumido liquidado");
            }
        }
    }
}
