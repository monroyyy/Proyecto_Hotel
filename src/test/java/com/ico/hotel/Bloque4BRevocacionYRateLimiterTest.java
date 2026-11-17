package com.ico.hotel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.*;
import com.ico.hotel.security.JwtService;
import com.ico.hotel.security.TokenBlacklistService;
import com.ico.hotel.services.AuthRateLimiterService;
import com.ico.hotel.services.AuthService;
import com.ico.hotel.services.EmailService;
import com.ico.hotel.services.ReservaExpiracionJob;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class Bloque4BRevocacionYRateLimiterTest extends AbstractMysqlTestcontainerTest {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private ScheduledTaskHolder scheduledTaskHolder;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Autowired
    private TokenRevocadoRepository tokenRevocadoRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthRateLimiterService authRateLimiterService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private TokenVerificacionRepository tokenVerificacionRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Clock hotelClock;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    private final List<Integer> reservasTempIds = new ArrayList<>();
    private final List<Integer> usuariosTempIds = new ArrayList<>();
    private final List<Integer> huespedesTempIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        tokenBlacklistService.setClock(hotelClock);
        tokenBlacklistService.clearCacheForTesting();
        authRateLimiterService.setClock(hotelClock);
        authRateLimiterService.setMaxClaves(AuthRateLimiterService.MAX_CLAVES_BUCKET);
        authRateLimiterService.limpiar();
        authService.setClock(hotelClock);
    }

    @AfterEach
    void cleanup() {
        tokenBlacklistService.setClock(hotelClock);
        tokenBlacklistService.clearCacheForTesting();
        tokenRevocadoRepository.deleteAll();
        authRateLimiterService.setClock(hotelClock);
        authRateLimiterService.setMaxClaves(AuthRateLimiterService.MAX_CLAVES_BUCKET);
        authRateLimiterService.limpiar();
        authService.setClock(hotelClock);

        for (Integer idRes : reservasTempIds) {
            reservaRepository.findById(idRes).ifPresent(reservaRepository::delete);
        }
        for (Integer idUsr : usuariosTempIds) {
            usuarioRepository.findById(idUsr).ifPresent(u -> {
                tokenVerificacionRepository.deleteAll(tokenVerificacionRepository.findByUsuario(u));
                usuarioRepository.delete(u);
            });
        }
        for (Integer idHue : huespedesTempIds) {
            huespedRepository.findById(idHue).ifPresent(huespedRepository::delete);
        }
        reservasTempIds.clear();
        usuariosTempIds.clear();
        huespedesTempIds.clear();
    }

    @Test
    @DisplayName("P2.2.1 Con expiracion-enabled=false, ReservaExpiracionJob no existe y las purgas @Scheduled sí están activas")
    void testSchedulingConExpiracionDesactivadaYPurgasActivas() {
        assertThat(applicationContext.getBeansOfType(ReservaExpiracionJob.class)).isEmpty();

        List<String> tareas = scheduledTaskHolder.getScheduledTasks().stream()
                .map(ScheduledTask::getTask)
                .map(Object::toString)
                .toList();

        assertThat(tareas).anyMatch(t -> t.contains("TokenBlacklistService.cleanupExpired"));
        assertThat(tareas).anyMatch(t -> t.contains("AuthRateLimiterService.purgarExpirados"));
        assertThat(tareas).noneMatch(t -> t.contains("ReservaExpiracionJob"));
    }

    @Test
    @DisplayName("P2.2.2 Logout persiste SHA-256 en MySQL primero, sobrevive a caché vacía, ignora expirados y falla si BD falla")
    void testLogoutPersisteSha256EnMysqlSobreviveLimpiezaCacheYFallaSiFallaEscritura() throws Exception {
        Usuario u = crearUsuario("Lucía Logout", "lucia.p22@test.com", "ClaveSegura1", true);

        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "lucia.p22@test.com",
                                "password", "ClaveSegura1"
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        String jwt = objectMapper.readTree(loginRes.getResponse().getContentAsString()).get("token").asText();
        String esperadoHash = TokenBlacklistService.hashToken(jwt);
        assertThat(esperadoHash).hasSize(64).matches("^[0-9a-f]{64}$");

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());

        // Ejecutar logout
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk());

        // En MySQL solo debe existir el hash SHA-256, nunca el JWT original
        Optional<TokenRevocado> registro = tokenRevocadoRepository.findById(esperadoHash);
        assertThat(registro).isPresent();
        assertThat(tokenRevocadoRepository.findById(jwt)).isEmpty();

        Date expClaim = jwtService.extractExpiration(jwt);
        LocalDateTime expMexico = LocalDateTime.ofInstant(expClaim.toInstant(), ClockConfig.ZONA_MEXICO)
                .truncatedTo(ChronoUnit.SECONDS);
        assertThat(registro.get().getExpiraEn().truncatedTo(ChronoUnit.SECONDS)).isEqualTo(expMexico);

        // Logout doble secuencial y concurrente con el mismo token: idempotente, nunca devuelve 500 por PK duplicada
        long revocadosAntesDoble = tokenRevocadoRepository.count();
        Map<String, Object> segundoLogout = authService.logout("Bearer " + jwt);
        assertThat(segundoLogout).containsKey("mensaje");
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isUnauthorized());
        assertThat(tokenRevocadoRepository.count()).isEqualTo(revocadosAntesDoble);

        String jwtConcurrente = jwtService.generateToken(u);
        Date expConcurrente = jwtService.extractExpiration(jwtConcurrente);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch inicio = new CountDownLatch(1);
        try {
            Callable<Void> tarea = () -> {
                inicio.await(3, TimeUnit.SECONDS);
                tokenBlacklistService.revokeToken(jwtConcurrente, expConcurrente);
                return null;
            };
            Future<Void> f1 = pool.submit(tarea);
            Future<Void> f2 = pool.submit(tarea);
            inicio.countDown();
            f1.get(5, TimeUnit.SECONDS);
            f2.get(5, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
        assertThat(tokenRevocadoRepository.findById(TokenBlacklistService.hashToken(jwtConcurrente))).isPresent();

        // Limpiar caché en RAM (simulando reinicio): el token sigue revocado desde MySQL
        tokenBlacklistService.clearCacheForTesting();
        assertThat(tokenBlacklistService.cacheSizeForTesting()).isZero();
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isUnauthorized());

        // Un token ya expirado NO se inserta en token_revocado
        long filasAntes = tokenRevocadoRepository.count();
        Date pasado = Date.from(Instant.now(hotelClock).minusSeconds(300));
        String jwtExpirado = Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(u.getIdUsuario()))
                .claim("rol", u.getRol().name())
                .claim("ver", 0)
                .issuedAt(Date.from(Instant.now(hotelClock).minusSeconds(600)))
                .expiration(pasado)
                .signWith(Keys.hmacShaKeyFor(jwtSecret.trim().getBytes(StandardCharsets.UTF_8)))
                .compact();

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + jwtExpirado))
                .andExpect(status().isUnauthorized());
        authService.logout("Bearer " + jwtExpirado);
        tokenBlacklistService.revokeToken(jwtExpirado, pasado);
        assertThat(tokenRevocadoRepository.count()).isEqualTo(filasAntes);

        // Si falla la escritura en MySQL, logout falla con error y no envenena caché
        TokenRevocadoRepository repoFallido = mock(TokenRevocadoRepository.class);
        when(repoFallido.saveAndFlush(any(TokenRevocado.class)))
                .thenThrow(new DataAccessResourceFailureException("MySQL sin conexión"));
        TokenBlacklistService svcFallido = new TokenBlacklistService(repoFallido);
        AuthService authFallido = new AuthService(
                usuarioRepository,
                tokenVerificacionRepository,
                huespedRepository,
                passwordEncoder,
                jwtService,
                svcFallido,
                mock(EmailService.class)
        );
        String otroJwt = jwtService.generateToken(u);
        assertThatThrownBy(() -> authFallido.logout("Bearer " + otroJwt))
                .isInstanceOf(DataAccessResourceFailureException.class);
        assertThat(svcFallido.cacheSizeForTesting()).isZero();
    }

    @Test
    @DisplayName("P2.2.3 Purga @Scheduled con Clock.fixed elimina expirados y conserva tokens vigentes en México")
    void testPurgaExpiradosConClockFixedNoBorraTokensVigentes() {
        Instant t0 = ZonedDateTime.of(2026, 11, 15, 10, 0, 0, 0, ClockConfig.ZONA_MEXICO).toInstant();
        tokenBlacklistService.setClock(Clock.fixed(t0, ClockConfig.ZONA_MEXICO));

        String tokenCorto = "jwt.simulado.expira10min." + UUID.randomUUID();
        String tokenLargo = "jwt.simulado.expira60min." + UUID.randomUUID();
        Date exp10m = Date.from(t0.plus(10, ChronoUnit.MINUTES));
        Date exp60m = Date.from(t0.plus(60, ChronoUnit.MINUTES));

        tokenBlacklistService.revokeToken(tokenCorto, exp10m);
        tokenBlacklistService.revokeToken(tokenLargo, exp60m);

        String hashCorto = TokenBlacklistService.hashToken(tokenCorto);
        String hashLargo = TokenBlacklistService.hashToken(tokenLargo);
        assertThat(tokenRevocadoRepository.findById(hashCorto)).isPresent();
        assertThat(tokenRevocadoRepository.findById(hashLargo)).isPresent();

        // Verificar expira_en calculado en zona America/Mexico_City
        LocalDateTime expCortoDb = tokenRevocadoRepository.findById(hashCorto).orElseThrow().getExpiraEn();
        assertThat(expCortoDb).isEqualTo(LocalDateTime.of(2026, 11, 15, 10, 10, 0));

        // Avanzar reloj +20 min: solo el corto debe purgarse; el largo sigue vigente y bloqueado
        tokenBlacklistService.setClock(Clock.fixed(t0.plus(20, ChronoUnit.MINUTES), ClockConfig.ZONA_MEXICO));
        int eliminados = tokenBlacklistService.cleanupExpired();
        assertThat(eliminados).isEqualTo(1);
        assertThat(tokenRevocadoRepository.findById(hashCorto)).isEmpty();
        assertThat(tokenRevocadoRepository.findById(hashLargo)).isPresent();

        // Confirmar contra MySQL con caché limpia que el token vigente continúa revocado
        tokenBlacklistService.clearCacheForTesting();
        assertThat(tokenBlacklistService.isRevoked(tokenLargo)).isTrue();
        assertThat(tokenBlacklistService.isRevoked(tokenCorto)).isFalse();
    }

    @Test
    @DisplayName("P2.2.4 AuthRateLimiterService aplica tope máximo expulsando primero menos hits y purga vencidas")
    void testRateLimiterPurgaPeriodicaYTopeMaximoDeClaves() {
        Instant t0 = Instant.parse("2026-11-15T18:00:00Z");
        authRateLimiterService.setClock(Clock.fixed(t0, ClockConfig.ZONA_MEXICO));
        authRateLimiterService.setMaxClaves(2);

        // IP 1 acumula 3 hits (más antigua en primer acceso, pero mayor historial de abuso)
        authRateLimiterService.validarYRegistrar("recuperar", "10.0.0.1", null);
        authRateLimiterService.validarYRegistrar("recuperar", "10.0.0.1", null);
        authRateLimiterService.validarYRegistrar("recuperar", "10.0.0.1", null);

        // IP 2 solo tiene 1 hit más reciente
        authRateLimiterService.setClock(Clock.fixed(t0.plusSeconds(20), ClockConfig.ZONA_MEXICO));
        authRateLimiterService.validarYRegistrar("recuperar", "10.0.0.2", null);
        assertThat(authRateLimiterService.totalClaves()).isEqualTo(2);

        // Al llegar IP 3 y superar el tope, debe expulsar a IP 2 (menos hits) y conservar IP 1 (3 hits)
        authRateLimiterService.setClock(Clock.fixed(t0.plusSeconds(30), ClockConfig.ZONA_MEXICO));
        authRateLimiterService.validarYRegistrar("recuperar", "10.0.0.3", null);
        assertThat(authRateLimiterService.totalClaves()).isLessThanOrEqualTo(2);
        assertThat(authRateLimiterService.containsKeyForTesting("ip:recuperar:10.0.0.1")).isTrue();
        assertThat(authRateLimiterService.containsKeyForTesting("ip:recuperar:10.0.0.2")).isFalse();

        // Al pasar > 1 hora, purgarExpirados() libera las cubetas vacías de RAM
        authRateLimiterService.setClock(Clock.fixed(t0.plus(65, ChronoUnit.MINUTES), ClockConfig.ZONA_MEXICO));
        int purgadas = authRateLimiterService.purgarExpirados();
        assertThat(purgadas).isGreaterThanOrEqualTo(1);
        assertThat(authRateLimiterService.totalClaves()).isZero();
    }

    @Test
    @DisplayName("P2.2.5 Registro exige verificación de correo antes de emitir JWT o consultar reservas vinculadas al email")
    void testRegistroExigeVerificacionCorreoAntesDeVerReservasPorEmail() throws Exception {
        String emailMostrador = "mostrador.p22@test.com";
        Habitacion hab = habitacionRepository.findAll().get(0);

        Huesped hue = new Huesped();
        hue.setNombre("Cliente Mostrador");
        hue.setEmail(emailMostrador);
        hue.setTelefono("5588889999");
        hue = huespedRepository.save(hue);
        huespedesTempIds.add(hue.getIdHuesped());

        Reserva r = new Reserva();
        r.setFolio("HP-P22-MOSTRADOR");
        r.setHuesped(hue);
        r.setHabitacion(hab);
        r.setFechaEntrada(LocalDate.of(2028, 9, 10));
        r.setFechaSalida(LocalDate.of(2028, 9, 12));
        r.setNoches(2);
        r.setAdultos(2);
        r.setNinos(0);
        r.setEstado(Reserva.CONFIRMADA);
        r.setTotal(new BigDecimal("3000.00"));
        r.setAnticipo(new BigDecimal("1500.00"));
        r.setSaldo(new BigDecimal("1500.00"));
        r.setMetodoPago("EFECTIVO");
        r.setFechaCreacion(LocalDateTime.now(hotelClock));
        r = reservaRepository.save(r);
        reservasTempIds.add(r.getIdReserva());

        // 1. Tercero registra cuenta con el correo del huésped de mostrador: nace sin verificar y sin JWT
        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Intento Sin Verificar",
                                "email", emailMostrador,
                                "password", "ClaveSegura1"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificado").value(false))
                .andExpect(jsonPath("$.token").doesNotExist());

        Usuario creado = usuarioRepository.findByEmailIgnoreCase(emailMostrador).orElseThrow();
        usuariosTempIds.add(creado.getIdUsuario());
        assertThat(creado.getVerificado()).isFalse();

        // 2. No puede iniciar sesión mientras verificado=false
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", emailMostrador,
                                "password", "ClaveSegura1"
                        ))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.requiereVerificacion").value(true))
                .andExpect(jsonPath("$.token").doesNotExist());

        // 3. Sin verificación, el filtro rechaza incluso un JWT firmado para ese idUsuario
        String jwtNoVerificado = jwtService.generateToken(creado);
        mockMvc.perform(get("/api/reservas/mias")
                        .header("Authorization", "Bearer " + jwtNoVerificado))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/reservas")
                        .header("Authorization", "Bearer " + jwtNoVerificado))
                .andExpect(status().isUnauthorized());

        // 4. Solo tras verificar el correo con el código, puede hacer login y consultar la reserva de ese email
        TokenVerificacion tv = tokenVerificacionRepository.findByUsuarioAndUsadoFalse(creado).get(0);
        mockMvc.perform(post("/api/auth/verificar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", emailMostrador,
                                "codigo", tv.getCodigo()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificado").value(true));

        MvcResult loginOk = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", emailMostrador,
                                "password", "ClaveSegura1"
                        ))))
                .andExpect(status().isOk())
                .andReturn();
        String jwtVerificado = objectMapper.readTree(loginOk.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/reservas/mias")
                        .header("Authorization", "Bearer " + jwtVerificado))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].folio").value("HP-P22-MOSTRADOR"));
    }

    @Test
    @DisplayName("P1.6 + CSP: cuenta no verificada bloquea dentro de vigencia (409) pero se reemplaza tras expirar (201), y API emite cabeceras CSP/Frame/Referrer")
    void testP16ReemplazoCuentaNoVerificadaExpiradaYCspHeaders() throws Exception {
        String email = "p16.propietario@test.com";
        Instant t0 = Instant.parse("2026-11-17T16:00:00Z");
        authService.setClock(Clock.fixed(t0, ClockConfig.ZONA_MEXICO));

        // 1. Primer registro (tercero) + verificación de cabeceras CSP/seguridad en respuesta HTTP
        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Tercero No Verificado",
                                "email", email,
                                "password", "ClaveInicial1"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("X-Frame-Options", "DENY"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Referrer-Policy", "no-referrer"));

        Usuario uInicial = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        usuariosTempIds.add(uInicial.getIdUsuario());
        huespedRepository.findFirstByEmailIgnoreCase(email).ifPresent(h -> huespedesTempIds.add(h.getIdHuesped()));

        // 2. Mientras el código de verificación siga vigente (+10 min < 30 min) -> 409 Conflict
        authService.setClock(Clock.fixed(t0.plus(10, ChronoUnit.MINUTES), ClockConfig.ZONA_MEXICO));
        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Propietario Legitimo",
                                "email", email,
                                "password", "ClavePropia1"
                        ))))
                .andExpect(status().isConflict());

        // 3. Una vez expirada la ventana (+35 min > 30 min) -> 201 Created reemplazando cuenta sin verificar,
        //    invalidando el token previo y actualizando nombre/clave
        authService.setClock(Clock.fixed(t0.plus(35, ChronoUnit.MINUTES), ClockConfig.ZONA_MEXICO));
        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Propietario Legitimo",
                                "email", email,
                                "password", "ClavePropia1"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificado").value(false));

        Usuario uReemplazado = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(uReemplazado.getIdUsuario()).isEqualTo(uInicial.getIdUsuario());
        assertThat(uReemplazado.getNombre()).isEqualTo("Propietario Legitimo");
        assertThat(passwordEncoder.matches("ClavePropia1", uReemplazado.getPasswordHash())).isTrue();

        List<TokenVerificacion> activos = tokenVerificacionRepository.findByUsuarioAndUsadoFalse(uReemplazado);
        assertThat(activos).hasSize(1);

        // El dueño verifica con el nuevo código y ya puede iniciar sesión con su propia contraseña
        mockMvc.perform(post("/api/auth/verificar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "codigo", activos.get(0).getCodigo()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificado").value(true));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "ClavePropia1"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // 4. Una vez verificada, volver a intentar registrar ese correo siempre devuelve 409
        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Otro Intento",
                                "email", email,
                                "password", "ClaveOtra1"
                        ))))
                .andExpect(status().isConflict());
    }

    private Usuario crearUsuario(String nombre, String email, String password, boolean verificado) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(password));
        u.setRol(Rol.HUESPED);
        u.setVerificado(verificado);
        u.setActivo(true);
        u.setTokenVersion(0);
        u.setFechaCreacion(LocalDateTime.now(hotelClock));
        u = usuarioRepository.save(u);
        usuariosTempIds.add(u.getIdUsuario());
        return u;
    }
}
