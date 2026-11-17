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
    @DisplayName("BD vacía en Testcontainers MySQL 8 ejecuta V1-V11, pasa ddl-auto=validate y seeder respeta P0.4")
    void testArranqueBdVaciaFlywayV1AV5YSeeder() throws Exception {
        List<Map<String, Object>> historial = jdbcTemplate.queryForList(
                "SELECT version, script, success FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank"
        );
        assertThat(historial).extracting(m -> String.valueOf(m.get("version")))
                .containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11");
        assertThat(historial).allMatch(m -> Boolean.TRUE.equals(m.get("success")) || Integer.valueOf(1).equals(m.get("success")));

        // Verificación V10: columnas en hotel y solo imagen_url en tipo_habitacion
        List<String> colsHotelV10 = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel' " +
                "AND COLUMN_NAME IN ('imagen_url', 'descripcion', 'tag_editorial', 'latitud', 'longitud') " +
                "ORDER BY COLUMN_NAME",
                String.class
        );
        assertThat(colsHotelV10).containsExactly("descripcion", "imagen_url", "latitud", "longitud", "tag_editorial");
        List<String> colsTipoV10 = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipo_habitacion' AND COLUMN_NAME = 'imagen_url'",
                String.class
        );
        assertThat(colsTipoV10).containsExactly("imagen_url");

        // Verificación V11: CHECK constraints del catálogo de método de pago
        List<String> checksReserva = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS " +
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reserva' AND CONSTRAINT_TYPE = 'CHECK' " +
                "ORDER BY CONSTRAINT_NAME",
                String.class
        );
        assertThat(checksReserva).contains("chk_reserva_metodo_pago", "chk_reserva_metodo_pago_saldo");

        // Verificación V9: tabla token_revocado, columnas y clave/índice de expiración
        List<String> columnasV9 = jdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'token_revocado' ORDER BY ORDINAL_POSITION",
                String.class
        );
        assertThat(columnasV9).containsExactly("token_hash", "expira_en", "fecha_revocacion");
        List<String> indicesV9 = jdbcTemplate.queryForList(
                "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS " +
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'token_revocado'",
                String.class
        );
        assertThat(indicesV9).contains("PRIMARY", "idx_token_revocado_expira");

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
        r.setMetodoPago("TARJETA_CREDITO");
        r.setFechaCreacion(LocalDateTime.of(2019, 5, 9, 10, 0));
        r = reservaRepository.save(r);

        LocalDateTime horaCheckInMx = LocalDateTime.of(2019, 5, 10, 16, 40, 34);
        reservaService.setClock(Clock.fixed(horaCheckInMx.atZone(ZONA).toInstant(), ZONA));
        reservaService.checkIn(r.getIdReserva());

        LocalDateTime horaCheckOutMx = LocalDateTime.of(2019, 5, 11, 11, 15, 20);
        reservaService.setClock(Clock.fixed(horaCheckOutMx.atZone(ZONA).toInstant(), ZONA));
        reservaService.checkOut(r.getIdReserva(), "EFECTIVO");

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

    @Test
    @DisplayName("Migración V10 siembra por nombre+ciudad y V11 normaliza las 6 filas 'Tarjeta' con evento y CHECK")
    void testMigracionV10yV11EnBaseAislada() {
        try (MySQLContainer tc = new MySQLContainer("mysql:8.0.40")
                .withDatabaseName("hotel_v11_test")
                .withUsername("test")
                .withPassword("test")) {
            tc.start();
            String url = tc.getJdbcUrl() + (tc.getJdbcUrl().contains("?") ? "&" : "?")
                    + "useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Mexico_City";
            DriverManagerDataSource ds = new DriverManagerDataSource(url, tc.getUsername(), tc.getPassword());
            JdbcTemplate jdbc = new JdbcTemplate(ds);

            Flyway.configure()
                    .dataSource(ds)
                    .locations("classpath:db/migration")
                    .target("9")
                    .load()
                    .migrate();

            jdbc.update("INSERT INTO hotel (id_hotel, activo, ciudad, direccion, email, nombre, telefono) " +
                    "VALUES (99, b'1', 'Cancún', 'Zona Hotelera', 'cancun.v11@test.com', 'Hotel Paraíso', '9981112299')");
            jdbc.update("INSERT INTO tipo_habitacion (id_tipo, capacidad, descripcion, nombre, precio_base) " +
                    "VALUES (99, 2, 'Desc original', 'Doble V11', 1200.00)");
            jdbc.update("INSERT INTO habitacion (id_habitacion, estado, numero, piso, id_hotel, id_tipo) " +
                    "VALUES (99, 'Disponible', '901', 9, 99, 99)");
            jdbc.update("INSERT INTO huesped (id_huesped, email, nombre, telefono) " +
                    "VALUES (99, 'hue.v11@test.com', 'Huésped V11', '5511112299')");

            Object[][] filas = {
                    {1, "HP-2026-00001", "Cancelada", "Tarjeta", null},
                    {22, "HP-2026-00022", "Finalizada", "Tarjeta", "Efectivo"},
                    {23, "HP-2026-00023", "Confirmada", "Tarjeta", null},
                    {24, "HP-2026-00024", "Confirmada", "Tarjeta", null},
                    {25, "HP-2026-00025", "Cancelada", "Tarjeta", null},
                    {26, "HP-2026-00026", "Cancelada", "Tarjeta", null},
                    {30, "HP-2026-00030", "Confirmada", "Efectivo", null},
                    {31, "HP-2026-00031", "Pre-reserva", null, null}
            };
            for (Object[] f : filas) {
                jdbc.update(
                        "INSERT INTO reserva (id_reserva, folio, id_habitacion, id_huesped, fecha_entrada, fecha_salida, " +
                        "noches, adultos, ninos, estado, total, anticipo, saldo, metodo_pago, metodo_pago_saldo) " +
                        "VALUES (?, ?, 99, 99, '2026-11-04', '2026-11-06', 2, 2, 0, ?, 2000.00, 1000.00, 1000.00, ?, ?)",
                        f[0], f[1], f[2], f[3], f[4]
                );
            }

            Flyway.configure()
                    .dataSource(ds)
                    .locations("classpath:db/migration")
                    .target("11")
                    .load()
                    .migrate();

            // V10: hotel Paraíso Cancún recibe metadata y imagen_url queda NULL; descripcion de tipo_habitacion no cambia
            Map<String, Object> hotelV10 = jdbc.queryForMap(
                    "SELECT imagen_url, descripcion, tag_editorial, latitud, longitud FROM hotel WHERE id_hotel = 99"
            );
            assertThat(hotelV10.get("imagen_url")).isNull();
            assertThat(hotelV10.get("tag_editorial")).isEqualTo("Resort Insignia");
            assertThat((BigDecimal) hotelV10.get("latitud")).isEqualByComparingTo("21.161908");
            assertThat(jdbc.queryForObject("SELECT descripcion FROM tipo_habitacion WHERE id_tipo = 99", String.class))
                    .isEqualTo("Desc original");

            // V11: las 6 filas 'Tarjeta' -> TARJETA_CREDITO y exactamente 6 eventos CORRECCION_DATOS
            List<Map<String, Object>> tarjRes = jdbc.queryForList(
                    "SELECT id_reserva, metodo_pago, metodo_pago_saldo FROM reserva WHERE id_reserva IN (1,22,23,24,25,26) ORDER BY id_reserva"
            );
            assertThat(tarjRes).hasSize(6).allSatisfy(m -> assertThat(m.get("metodo_pago")).isEqualTo("TARJETA_CREDITO"));
            assertThat(tarjRes.get(1).get("metodo_pago_saldo")).isEqualTo("EFECTIVO");
            assertThat(jdbc.queryForObject("SELECT metodo_pago FROM reserva WHERE id_reserva = 30", String.class))
                    .isEqualTo("EFECTIVO");
            assertThat(jdbc.queryForObject("SELECT metodo_pago FROM reserva WHERE id_reserva = 31", String.class))
                    .isNull();

            List<Map<String, Object>> eventosV11 = jdbc.queryForList(
                    "SELECT id_reserva, tipo, usuario, DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s') AS fh " +
                    "FROM reserva_evento WHERE tipo = 'CORRECCION_DATOS' ORDER BY id_reserva"
            );
            assertThat(eventosV11).extracting(e -> ((Number) e.get("id_reserva")).intValue())
                    .containsExactly(1, 22, 23, 24, 25, 26);
            assertThat(eventosV11).allSatisfy(e -> {
                assertThat(e.get("usuario")).isEqualTo("MIGRACION");
                assertThat(e.get("fh")).isEqualTo("2026-11-11 01:00:00");
            });

            // CHECK constraint rechaza valor fuera de catálogo ('Tarjeta')
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
                    "INSERT INTO reserva (id_reserva, folio, id_habitacion, id_huesped, fecha_entrada, fecha_salida, " +
                    "noches, adultos, ninos, estado, total, anticipo, saldo, metodo_pago) " +
                    "VALUES (99, 'HP-2026-00099', 99, 99, '2026-11-10', '2026-11-11', 1, 1, 0, 'Confirmada', 1000.00, 500.00, 500.00, 'Tarjeta')"
            )).isInstanceOf(Exception.class);
        }
    }
}
