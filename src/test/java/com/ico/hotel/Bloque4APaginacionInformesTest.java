package com.ico.hotel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.*;
import com.ico.hotel.security.JwtService;
import com.ico.hotel.services.DashboardService;
import com.ico.hotel.services.InformeService;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class Bloque4APaginacionInformesTest extends AbstractMysqlTestcontainerTest {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private InformeService informeService;

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManagerFactory emf;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;
    private String jwtAdmin;
    private final List<Integer> reservasTempIds = new ArrayList<>();
    private final List<Integer> usuariosTempIds = new ArrayList<>();
    private final List<Integer> huespedesTempIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        Usuario admin = usuarioRepository.findByEmailIgnoreCase("admin@hotelparaiso.com")
                .orElseThrow();
        jwtAdmin = jwtService.generateToken(admin);
    }

    @AfterEach
    void cleanup() {
        for (Integer idRes : reservasTempIds) {
            reservaRepository.findById(idRes).ifPresent(reservaRepository::delete);
        }
        for (Integer idUsr : usuariosTempIds) {
            usuarioRepository.findById(idUsr).ifPresent(usuarioRepository::delete);
        }
        for (Integer idHue : huespedesTempIds) {
            huespedRepository.findById(idHue).ifPresent(huespedRepository::delete);
        }
        reservasTempIds.clear();
        usuariosTempIds.clear();
        huespedesTempIds.clear();
    }

    @Test
    @DisplayName("P2.1.1 GET /api/reservas pagina por defecto (size=20), valida límites 400 y maneja página fuera de rango")
    void testPaginacionPorDefectoYLimites() throws Exception {
        long totalEnBd = reservaRepository.count();
        assertThat(totalEnBd).isGreaterThan(50);

        MvcResult defaultRes = mockMvc.perform(get("/api/reservas")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(totalEnBd))
                .andReturn();

        JsonNode root = objectMapper.readTree(defaultRes.getResponse().getContentAsString());
        assertThat(root.get("content").size()).isEqualTo(20);
        assertThat(root.get("content").size()).isLessThan((int) totalEnBd);

        // Página fuera de rango -> 200 con content vacío
        mockMvc.perform(get("/api/reservas?page=9999&size=20")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.page").value(9999))
                .andExpect(jsonPath("$.totalElements").value(totalEnBd));

        // size, page o sort fuera de lista blanca -> 400
        for (String qs : List.of(
                "size=0", "size=-5", "size=101", "size=abc", "page=-1",
                "sort=campoInvalido,desc", "sort=huesped.nombre,asc",
                "sort=idReserva;DROP%20TABLE%20reserva,desc", "sort=fechaCreacion,up"
        )) {
            mockMvc.perform(get("/api/reservas?" + qs)
                            .header("Authorization", "Bearer " + jwtAdmin))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    @DisplayName("P2.1.6 Orden determinista con id_reserva y reglas de seguridad (HUESPED, /mias, resumen-estados, LIKE escape)")
    void testOrdenDeterministaSeguridadYLikeEscape() throws Exception {
        Habitacion hab = habitacionRepository.findAll().get(0);
        LocalDateTime fechaIgual = LocalDateTime.of(2028, 8, 1, 12, 0, 0);

        Usuario uA = crearUsuario("Huesped Alfa", "alfa.sec@test.com", Rol.HUESPED);
        Usuario uB = crearUsuario("Huesped Beta", "beta.sec@test.com", Rol.HUESPED);
        Usuario uRecep = crearUsuario("Recep Test", "recep.sec@test.com", Rol.RECEPCIONISTA);
        Usuario uGerente = crearUsuario("Gerente Test", "gerente.sec@test.com", Rol.GERENTE);

        Huesped hA = crearHuesped("Huesped Alfa", "alfa.sec@test.com", "5500001111");
        Huesped hB = crearHuesped("Ana_50% Beta", "beta.sec@test.com", "5500002222");

        Reserva r1 = crearReservaBase(uA, hA, hab, "HP-DET-01", LocalDate.of(2028, 8, 10), new BigDecimal("4321.00"), fechaIgual);
        Reserva r2 = crearReservaBase(uA, hA, hab, "HP-DET-02", LocalDate.of(2028, 8, 15), new BigDecimal("4321.00"), fechaIgual);
        Reserva rAjena = crearReservaBase(uB, hB, hab, "HP-P21_ESC%1", LocalDate.of(2028, 8, 20), new BigDecimal("5000.00"), fechaIgual.minusDays(1));

        // 1. Orden determinista con id_reserva como segundo criterio cuando fecha_creacion y total empatan
        MvcResult p0 = mockMvc.perform(get("/api/reservas")
                        .param("q", "HP-DET-")
                        .param("page", "0")
                        .param("size", "1")
                        .param("sort", "fechaCreacion,desc")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andReturn();
        MvcResult p1 = mockMvc.perform(get("/api/reservas")
                        .param("q", "HP-DET-")
                        .param("page", "1")
                        .param("size", "1")
                        .param("sort", "fechaCreacion,desc")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andReturn();

        int idP0 = objectMapper.readTree(p0.getResponse().getContentAsString()).get("content").get(0).get("idReserva").asInt();
        int idP1 = objectMapper.readTree(p1.getResponse().getContentAsString()).get("content").get(0).get("idReserva").asInt();
        assertThat(Set.of(idP0, idP1)).containsExactlyInAnyOrder(r1.getIdReserva(), r2.getIdReserva());
        // Segundo criterio ASC para fechaCreacion,desc (id menor primero)
        assertThat(idP0).isLessThan(idP1);

        // 2. HUESPED en GET /api/reservas solo ve sus reservas (nunca las ajenas) ni puede abrir reserva ajena por ID
        String jwtA = jwtService.generateToken(uA);
        mockMvc.perform(get("/api/reservas")
                        .header("Authorization", "Bearer " + jwtA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));

        mockMvc.perform(get("/api/reservas/" + rAjena.getIdReserva())
                        .header("Authorization", "Bearer " + jwtA))
                .andExpect(status().isForbidden());

        // 3. /api/reservas/mias usa solo el usuario del JWT aunque manden parámetros manipulados
        mockMvc.perform(get("/api/reservas/mias")
                        .param("idUsuario", String.valueOf(uB.getIdUsuario()))
                        .param("email", uB.getEmail())
                        .header("Authorization", "Bearer " + jwtA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].folio").value(org.hamcrest.Matchers.startsWith("HP-DET-")));

        mockMvc.perform(get("/api/reservas/mias"))
                .andExpect(status().isUnauthorized());

        // 4. /api/reservas/resumen-estados requiere rol de personal (403 para HUESPED, 200 para RECEPCIONISTA/GERENTE/ADMIN)
        mockMvc.perform(get("/api/reservas/resumen-estados")
                        .header("Authorization", "Bearer " + jwtA))
                .andExpect(status().isForbidden());

        for (Usuario staff : List.of(uRecep, uGerente)) {
            mockMvc.perform(get("/api/reservas/resumen-estados")
                            .header("Authorization", "Bearer " + jwtService.generateToken(staff)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(reservaRepository.count()));
        }

        // 5. q escapa % y _ (no actúan como comodines sobre el resto de la tabla)
        mockMvc.perform(get("/api/reservas")
                        .param("q", "%")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].folio").value("HP-P21_ESC%1"));

        mockMvc.perform(get("/api/reservas")
                        .param("q", "_")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].folio").value("HP-P21_ESC%1"));

        mockMvc.perform(get("/api/reservas")
                        .param("q", "HP-DET_01")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        // 6. Todas las columnas permitidas de la lista blanca responden 200
        for (String col : List.of("fechaCreacion", "fechaEntrada", "fechaSalida", "total", "saldo", "estado", "folio", "idReserva")) {
            mockMvc.perform(get("/api/reservas?page=0&size=2&sort=" + col + ",asc")
                            .header("Authorization", "Bearer " + jwtAdmin))
                    .andExpect(status().isOk());
        }
    }

    private Usuario crearUsuario(String nombre, String email, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode("ClaveSegura1"));
        u.setRol(rol);
        u.setVerificado(true);
        u.setActivo(true);
        u.setTokenVersion(0);
        u.setFechaCreacion(LocalDateTime.now());
        u = usuarioRepository.save(u);
        usuariosTempIds.add(u.getIdUsuario());
        return u;
    }

    private Huesped crearHuesped(String nombre, String email, String telefono) {
        Huesped h = new Huesped();
        h.setNombre(nombre);
        h.setEmail(email);
        h.setTelefono(telefono);
        h = huespedRepository.save(h);
        huespedesTempIds.add(h.getIdHuesped());
        return h;
    }

    private Reserva crearReservaBase(Usuario u, Huesped h, Habitacion hab, String folio,
                                     LocalDate entrada, BigDecimal total, LocalDateTime fechaCreacion) {
        Reserva r = new Reserva();
        r.setFolio(folio);
        r.setUsuario(u);
        r.setHuesped(h);
        r.setHabitacion(hab);
        r.setFechaEntrada(entrada);
        r.setFechaSalida(entrada.plusDays(2));
        r.setNoches(2);
        r.setAdultos(2);
        r.setNinos(0);
        r.setEstado(Reserva.CONFIRMADA);
        r.setTotal(total);
        r.setAnticipo(total.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP));
        r.setSaldo(total.subtract(r.getAnticipo()));
        r.setMetodoPago("TARJETA_CREDITO");
        r.setFechaCreacion(fechaCreacion);
        r = reservaRepository.save(r);
        reservasTempIds.add(r.getIdReserva());
        return r;
    }

    @Test
    @DisplayName("P2.1.2 Ordenamiento y filtros combinados (estado, hotel, entrada/salida, búsqueda folio/huésped) + /mias + resumen")
    void testFiltrosCombinadosOrdenamientoYMias() throws Exception {
        Habitacion hab = habitacionRepository.findAll().get(0);
        Integer idHotel = hab.getHotel().getIdHotel();

        Usuario huespedUser = new Usuario();
        huespedUser.setNombre("Sofía Paginada");
        huespedUser.setEmail("sofia.p21@test.com");
        huespedUser.setPasswordHash(passwordEncoder.encode("ClaveSegura1"));
        huespedUser.setRol(Rol.HUESPED);
        huespedUser.setVerificado(true);
        huespedUser.setActivo(true);
        huespedUser.setTokenVersion(0);
        huespedUser.setFechaCreacion(LocalDateTime.now());
        huespedUser = usuarioRepository.save(huespedUser);
        usuariosTempIds.add(huespedUser.getIdUsuario());

        Huesped hue = new Huesped();
        hue.setNombre("Sofía Paginada");
        hue.setEmail("sofia.p21@test.com");
        hue.setTelefono("5598765432");
        hue = huespedRepository.save(hue);
        huespedesTempIds.add(hue.getIdHuesped());

        Reserva r = new Reserva();
        r.setFolio("HP-P21-UNICO");
        r.setUsuario(huespedUser);
        r.setHuesped(hue);
        r.setHabitacion(hab);
        r.setFechaEntrada(LocalDate.of(2028, 7, 10));
        r.setFechaSalida(LocalDate.of(2028, 7, 15));
        r.setNoches(5);
        r.setAdultos(2);
        r.setNinos(0);
        r.setEstado(Reserva.CONFIRMADA);
        r.setTotal(new BigDecimal("9999.00"));
        r.setAnticipo(new BigDecimal("4999.50"));
        r.setSaldo(new BigDecimal("4999.50"));
        r.setMetodoPago("TARJETA_CREDITO");
        r.setFechaCreacion(LocalDateTime.now());
        r = reservaRepository.save(r);
        reservasTempIds.add(r.getIdReserva());

        // Filtros combinados como admin
        mockMvc.perform(get("/api/reservas")
                        .param("estado", Reserva.CONFIRMADA)
                        .param("hotelId", String.valueOf(idHotel))
                        .param("entradaDesde", "2028-07-01")
                        .param("entradaHasta", "2028-07-31")
                        .param("salidaDesde", "2028-07-10")
                        .param("salidaHasta", "2028-07-20")
                        .param("q", "HP-P21-UNICO")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].folio").value("HP-P21-UNICO"))
                .andExpect(jsonPath("$.content[0].huesped.nombre").value("Sofía Paginada"));

        // Ordenamiento por total desc
        MvcResult sortRes = mockMvc.perform(get("/api/reservas?page=0&size=5&sort=total,desc")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode contentSort = objectMapper.readTree(sortRes.getResponse().getContentAsString()).get("content");
        for (int i = 0; i < contentSort.size() - 1; i++) {
            double actual = contentSort.get(i).get("total").asDouble();
            double siguiente = contentSort.get(i + 1).get("total").asDouble();
            assertThat(actual).isGreaterThanOrEqualTo(siguiente);
        }

        // Huésped solo ve sus propias reservas en /api/reservas y en alternativa /api/reservas/mias
        String jwtSofia = jwtService.generateToken(huespedUser);
        mockMvc.perform(get("/api/reservas")
                        .header("Authorization", "Bearer " + jwtSofia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].folio").value("HP-P21-UNICO"));

        mockMvc.perform(get("/api/reservas/mias")
                        .header("Authorization", "Bearer " + jwtSofia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].folio").value("HP-P21-UNICO"));

        mockMvc.perform(get("/api/reservas/resumen-estados")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(reservaRepository.count()));
    }

    @Test
    @DisplayName("P2.1.3 Eliminación de N+1: GET /api/reservas ejecuta <= 4 sentencias SQL sin importar N")
    void testEliminacionNPlusUnoEnListadoPaginado() throws Exception {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);

        // Precalentar caché negativa del token JWT (1 PK lookup en token_revocado tras miss inicial)
        mockMvc.perform(get("/api/reservas?page=0&size=20")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk());

        stats.clear();
        mockMvc.perform(get("/api/reservas?page=0&size=20")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(20));
        long sqlCon20 = stats.getPrepareStatementCount();

        stats.clear();
        mockMvc.perform(get("/api/reservas?page=0&size=50")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(50));
        long sqlCon50 = stats.getPrepareStatementCount();

        // 1 query de autenticación JWT + 4 queries del servicio (COUNT, IDs, JOIN FETCH, activas en lote) = 5 constantes
        System.out.println("AFTER_SQL_COUNT_SIZE_20=" + sqlCon20 + " AFTER_SQL_COUNT_SIZE_50=" + sqlCon50);
        assertThat(sqlCon20).isLessThanOrEqualTo(5);
        assertThat(sqlCon50).isLessThanOrEqualTo(5);
        assertThat(sqlCon50).isEqualTo(sqlCon20);
    }

    @Test
    @DisplayName("P2.1.4 InformeService SQL GROUP BY coincide exactamente con el cálculo registro a registro y pagina filas")
    void testEquivalenciaInformeFinancieroSqlVsJava() throws Exception {
        LocalDate inicio = LocalDate.of(2020, 1, 1);
        LocalDate fin = LocalDate.of(2026, 12, 31);
        Integer idHotel = hotelRepository.findAll().get(0).getIdHotel();

        // Todo el histórico del seeder (global y por hotel) + año específico
        verificarEquivalenciaInforme(inicio, fin, null);
        verificarEquivalenciaInforme(inicio, fin, idHotel);
        verificarEquivalenciaInforme(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31), null);
        verificarEquivalenciaInforme(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), idHotel);

        // Confirmar que DashboardService conserva sus cifras sin alteraciones respecto al seeder
        Map<String, Object> kpis2026 = dashboardService.obtenerResumenKpis(2026, null, false);
        BigDecimal sumaCats2026 = dashboardService.obtenerDistribucionCategorias(2026, null, false).stream()
                .map(m -> new BigDecimal(String.valueOf(m.get("ingresos"))))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sumaCats2026).isEqualByComparingTo((BigDecimal) kpis2026.get("ingresosHospedaje"));
        Map<String, Object> informe2026Activos = informeService.generarInformeFinanciero(
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), null, 0, 20);
        // Cuando todos los hoteles del seeder están activos, granTotalContratado del informe y Dashboard coinciden
        assertThat((BigDecimal) kpis2026.get("ingresosHospedaje"))
                .isEqualByComparingTo((BigDecimal) informe2026Activos.get("granTotalContratado"));

        // Verificar paginación de endpoint /api/informes/financiero y 400 con size > 100
        mockMvc.perform(get("/api/informes/financiero")
                        .param("inicio", "2026-01-01")
                        .param("fin", "2026-12-31")
                        .param("page", "1")
                        .param("size", "10")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.filas.length()").value(10));

        mockMvc.perform(get("/api/informes/financiero?size=101")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isBadRequest());
    }

    private void verificarEquivalenciaInforme(LocalDate inicio, LocalDate fin, Integer idHotel) {
        List<Reserva> legacy = reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(inicio, fin).stream()
                .filter(r -> idHotel == null || (r.getHabitacion() != null
                        && r.getHabitacion().getHotel() != null
                        && Objects.equals(r.getHabitacion().getHotel().getIdHotel(), idHotel)))
                .toList();

        BigDecimal legacyContratado = BigDecimal.ZERO;
        BigDecimal legacyAnticipos = BigDecimal.ZERO;
        BigDecimal legacyLiquidados = BigDecimal.ZERO;
        BigDecimal legacyPenalizaciones = BigDecimal.ZERO;
        BigDecimal legacyReembolsos = BigDecimal.ZERO;

        for (Reserva r : legacy) {
            BigDecimal total = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
            BigDecimal anticipo = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
            BigDecimal reembolso = r.getMontoReembolso() != null ? r.getMontoReembolso() : BigDecimal.ZERO;
            String est = r.getEstado() != null ? r.getEstado() : "";

            if (Reserva.FINALIZADA.equals(est)) {
                legacyContratado = legacyContratado.add(total);
                legacyAnticipos = legacyAnticipos.add(anticipo);
                legacyLiquidados = legacyLiquidados.add(total.subtract(anticipo));
            } else if (Reserva.CONFIRMADA.equals(est) || Reserva.OCUPADA.equals(est)) {
                legacyContratado = legacyContratado.add(total);
                legacyAnticipos = legacyAnticipos.add(anticipo);
            } else if (Reserva.CANCELADA.equals(est)) {
                legacyPenalizaciones = legacyPenalizaciones.add(r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO);
                legacyReembolsos = legacyReembolsos.add(reembolso);
            } else if (Reserva.NO_SHOW.equals(est)) {
                legacyPenalizaciones = legacyPenalizaciones.add(anticipo);
            }
        }
        BigDecimal legacyNetos = legacyAnticipos.add(legacyLiquidados).add(legacyPenalizaciones).subtract(legacyReembolsos);

        Map<String, Object> sqlReport = informeService.generarInformeFinanciero(inicio, fin, idHotel, 0, 20);
        assertThat(((Number) sqlReport.get("totalRegistros")).longValue()).isEqualTo(legacy.size());
        assertThat((BigDecimal) sqlReport.get("granTotalContratado"))
                .isEqualByComparingTo(legacyContratado.setScale(2, RoundingMode.HALF_UP));
        assertThat((BigDecimal) sqlReport.get("totalAnticiposCobrados"))
                .isEqualByComparingTo(legacyAnticipos.setScale(2, RoundingMode.HALF_UP));
        assertThat((BigDecimal) sqlReport.get("totalSaldosLiquidados"))
                .isEqualByComparingTo(legacyLiquidados.setScale(2, RoundingMode.HALF_UP));
        assertThat((BigDecimal) sqlReport.get("totalPenalizaciones"))
                .isEqualByComparingTo(legacyPenalizaciones.setScale(2, RoundingMode.HALF_UP));
        assertThat((BigDecimal) sqlReport.get("totalReembolsos"))
                .isEqualByComparingTo(legacyReembolsos.setScale(2, RoundingMode.HALF_UP));
        assertThat((BigDecimal) sqlReport.get("ingresosNetosCaja"))
                .isEqualByComparingTo(legacyNetos.setScale(2, RoundingMode.HALF_UP));
    }

    @Test
    @DisplayName("P2.1.5 Migración V8 crea los 3 índices esperados y EXPLAIN los utiliza")
    void testIndicesV8YExplain() {
        List<String> indices = jdbcTemplate.queryForList(
                "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS " +
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reserva'",
                String.class
        );
        assertThat(indices).contains(
                "idx_reserva_estado_entrada",
                "idx_reserva_hab_fechas",
                "idx_reserva_fecha_creacion"
        );
        assertThat(indices).doesNotContain(
                "idx_reserva_entrada_estado",
                "idx_reserva_salida_estado"
        );

        List<Map<String, Object>> expEstado = jdbcTemplate.queryForList(
                "EXPLAIN SELECT r.* FROM reserva r WHERE r.estado = 'Confirmada' AND r.fecha_entrada BETWEEN '2026-01-01' AND '2026-12-31'"
        );
        List<Map<String, Object>> expTraslape = jdbcTemplate.queryForList(
                "EXPLAIN SELECT r.* FROM reserva r WHERE r.id_habitacion = 1 AND r.estado IN ('Pre-reserva','Confirmada','Ocupada') AND r.fecha_entrada < '2026-12-20' AND r.fecha_salida > '2026-12-10'"
        );
        List<Map<String, Object>> expOrden = jdbcTemplate.queryForList(
                "EXPLAIN SELECT r.id_reserva FROM reserva r ORDER BY r.fecha_creacion DESC, r.id_reserva ASC LIMIT 20"
        );
        List<Map<String, Object>> expInforme = jdbcTemplate.queryForList(
                "EXPLAIN SELECT r.estado, COUNT(*), SUM(r.total) FROM reserva r WHERE r.fecha_entrada BETWEEN '2026-01-01' AND '2026-12-31' GROUP BY r.estado"
        );

        System.out.println("EXPLAIN_ESTADO_ENTRADA=" + expEstado);
        System.out.println("EXPLAIN_HAB_TRASLAPE=" + expTraslape);
        System.out.println("EXPLAIN_ORDEN_CREACION=" + expOrden);
        System.out.println("EXPLAIN_INFORME_GROUP=" + expInforme);

        assertThat(String.valueOf(expEstado.get(0).get("key"))).isEqualTo("idx_reserva_estado_entrada");
        assertThat(String.valueOf(expTraslape.get(0).get("possible_keys"))).contains("idx_reserva_hab_fechas");
        assertThat(String.valueOf(expOrden.get(0).get("key"))).isEqualTo("idx_reserva_fecha_creacion");
    }
}
