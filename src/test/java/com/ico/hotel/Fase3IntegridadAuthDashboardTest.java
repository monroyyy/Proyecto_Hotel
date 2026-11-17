package com.ico.hotel;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.*;
import com.ico.hotel.security.JwtService;
import com.ico.hotel.services.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class Fase3IntegridadAuthDashboardTest extends AbstractMysqlTestcontainerTest {

    private static final ZoneId ZONA = ClockConfig.ZONA_MEXICO;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthRateLimiterService authRateLimiterService;

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private ReservaService reservaService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private TokenRecuperacionPasswordRepository tokenRecuperacionRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private ReservaEventoRepository reservaEventoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    @Qualifier("mailTaskExecutor")
    private ThreadPoolTaskExecutor mailTaskExecutor;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Autowired
    private Clock systemClock;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private MockMvc mockMvc;

    private final List<Integer> reservasTempIds = new ArrayList<>();
    private final List<Integer> habitacionesTempIds = new ArrayList<>();
    private final List<Integer> hotelesTempIds = new ArrayList<>();
    private final List<Integer> huespedesTempIds = new ArrayList<>();
    private final List<Integer> usuariosTempIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        authRateLimiterService.limpiar();
        authService.setClock(systemClock);
        reservaService.setClock(systemClock);
        reservaService.setExpiracionDryRun(true);
    }

    @AfterEach
    void cleanup() {
        authRateLimiterService.limpiar();
        authService.setClock(systemClock);
        reservaService.setClock(systemClock);
        reservaService.setExpiracionDryRun(true);

        transactionTemplate.executeWithoutResult(st -> {
            for (Integer idRes : reservasTempIds) {
                List<ReservaEvento> evs = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(idRes);
                if (!evs.isEmpty()) {
                    reservaEventoRepository.deleteAll(evs);
                }
                reservaRepository.findById(idRes).ifPresent(reservaRepository::delete);
            }
            for (Integer idHab : habitacionesTempIds) {
                habitacionRepository.findById(idHab).ifPresent(habitacionRepository::delete);
            }
            for (Integer idHot : hotelesTempIds) {
                hotelRepository.findById(idHot).ifPresent(hotelRepository::delete);
            }
            for (Integer idUsr : usuariosTempIds) {
                usuarioRepository.findById(idUsr).ifPresent(usuarioRepository::delete);
            }
            for (Integer idHue : huespedesTempIds) {
                huespedRepository.findById(idHue).ifPresent(huespedRepository::delete);
            }
        });
        reservasTempIds.clear();
        habitacionesTempIds.clear();
        hotelesTempIds.clear();
        huespedesTempIds.clear();
        usuariosTempIds.clear();
    }

    private Usuario crearUsuarioYHuesped(String nombre, String email, String telefono, String passwordPlano) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(passwordPlano));
        u.setRol(Rol.HUESPED);
        u.setVerificado(true);
        u.setActivo(true);
        u.setTokenVersion(0);
        u.setFechaCreacion(LocalDateTime.now(systemClock));
        u = usuarioRepository.save(u);
        usuariosTempIds.add(u.getIdUsuario());

        Huesped h = new Huesped();
        h.setNombre(nombre);
        h.setEmail(email);
        h.setTelefono(telefono);
        h = huespedRepository.save(h);
        huespedesTempIds.add(h.getIdHuesped());
        return u;
    }

    private String generarJwtLegacySinClaimVer(Usuario u) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(u.getIdUsuario()))
                .claim("rol", u.getRol().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 600_000L))
                .signWith(Keys.hmacShaKeyFor(jwtSecret.trim().getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    private TokenRecuperacionPassword prepararOtpConocido(Usuario u, String codigoPlano) {
        TokenRecuperacionPassword tokenDb = tokenRecuperacionRepository
                .findTopByUsuarioIdUsuarioAndUsadoFalseOrderByFechaCreacionDesc(u.getIdUsuario())
                .orElseThrow();
        transactionTemplate.executeWithoutResult(st -> {
            TokenRecuperacionPassword t = tokenRecuperacionRepository.findById(tokenDb.getIdToken()).orElseThrow();
            t.setCodigoHash(passwordEncoder.encode(codigoPlano));
            tokenRecuperacionRepository.save(t);
        });
        return tokenRecuperacionRepository.findById(tokenDb.getIdToken()).orElseThrow();
    }

    // ------------------------------------------------------------------
    // P1.1 — Perfil del huésped (PUT /api/auth/me) + cambio de contraseña
    // ------------------------------------------------------------------

    @Test
    @DisplayName("P1.1.1 PUT /api/auth/me persiste usuario y huesped en transacción, deja email inmutable y no edita a otro")
    void testP11ActualizarPerfilActualizaUsuarioYHuespedYNoEditaOtro() throws Exception {
        Usuario u1 = crearUsuarioYHuesped("Ana Original", "ana.p11@test.com", "5511112222", "ClaveSegura1");
        Usuario u2 = crearUsuarioYHuesped("Beto Intacto", "beto.p11@test.com", "5533334444", "ClaveSegura2");
        String jwtU1 = jwtService.generateToken(u1);

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + jwtU1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "idUsuario": %d,
                                  "nombre": "Ana Actualizada",
                                  "telefono": "5599887766",
                                  "email": "otro.hack@test.com"
                                }
                                """.formatted(u2.getIdUsuario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idUsuario").value(u1.getIdUsuario()))
                .andExpect(jsonPath("$.nombre").value("Ana Actualizada"))
                .andExpect(jsonPath("$.telefono").value("5599887766"))
                .andExpect(jsonPath("$.email").value("ana.p11@test.com"));

        Usuario u1Bd = usuarioRepository.findById(u1.getIdUsuario()).orElseThrow();
        Huesped h1Bd = huespedRepository.findFirstByEmailIgnoreCase("ana.p11@test.com").orElseThrow();
        Usuario u2Bd = usuarioRepository.findById(u2.getIdUsuario()).orElseThrow();
        Huesped h2Bd = huespedRepository.findFirstByEmailIgnoreCase("beto.p11@test.com").orElseThrow();

        assertThat(u1Bd.getNombre()).isEqualTo("Ana Actualizada");
        assertThat(u1Bd.getEmail()).isEqualTo("ana.p11@test.com");
        assertThat(h1Bd.getNombre()).isEqualTo("Ana Actualizada");
        assertThat(h1Bd.getTelefono()).isEqualTo("5599887766");
        assertThat(u2Bd.getNombre()).isEqualTo("Beto Intacto");
        assertThat(h2Bd.getTelefono()).isEqualTo("5533334444");
    }

    @Test
    @DisplayName("P1.1.2 PUT /api/auth/me rechaza sin sesión (401) y valida teléfono ^\\d{10}$ y nombre no vacío (400)")
    void testP11ActualizarPerfilValidaTelefonoNombreYRequiereAuth() throws Exception {
        Usuario u = crearUsuarioYHuesped("Diana Test", "diana.p11@test.com", "5512345678", "ClaveSegura1");
        String jwt = jwtService.generateToken(u);

        mockMvc.perform(put("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nombre": "Diana", "telefono": "5512345678" }
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nombre": "Diana", "telefono": "55-1234-5678" }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nombre": "   ", "telefono": "5512345678" }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("P1.1.3 POST /api/auth/cambiar-password incrementa token_version y revoca JWT actual y legacy sin claim ver")
    void testP11CambiarPasswordIncrementaTokenVersionYRevocaJwtPrevioYLegacyPreV6() throws Exception {
        Usuario u = crearUsuarioYHuesped("Elena Cambio", "elena.p11@test.com", "5522334455", "ClaveActual1");
        String jwtActual = jwtService.generateToken(u);
        String jwtLegacyPreV6 = generarJwtLegacySinClaimVer(u);

        // Antes del cambio, un JWT legacy sin claim "ver" sigue operando si token_version = 0
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtLegacyPreV6))
                .andExpect(status().isOk());

        MvcResult resCambio = mockMvc.perform(post("/api/auth/cambiar-password")
                        .header("Authorization", "Bearer " + jwtActual)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "passwordActual": "ClaveActual1",
                                  "nuevaPassword": "ClaveNueva2",
                                  "confirmarPassword": "ClaveNueva2"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        Usuario uBd = usuarioRepository.findById(u.getIdUsuario()).orElseThrow();
        assertThat(uBd.getTokenVersion()).isEqualTo(1);

        // Tanto el JWT emitido antes del cambio como el JWT legacy sin "ver" quedan revocados inmediatamente
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtActual))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtLegacyPreV6))
                .andExpect(status().isUnauthorized());

        // El nuevo token emitido con version 1 funciona correctamente
        String nuevoJwt = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(resCambio.getResponse().getContentAsString())
                .get("token")
                .asText();
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + nuevoJwt))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // P1.2 — Recuperación de contraseña (caso por caso)
    // ------------------------------------------------------------------

    @Test
    @DisplayName("P1.2.1 POST /api/auth/recuperar-password responde idéntico con correo inexistente vs existente y guarda solo hash")
    void testP12RecuperarPasswordRespuestaIdenticaCorreoInexistenteYExistente() throws Exception {
        Usuario u = crearUsuarioYHuesped("Carlos Identico", "carlos.identico@test.com", "5544445555", "PasswordInicial1");

        MvcResult resInexistente = mockMvc.perform(post("/api/auth/recuperar-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "no.existe.abc99@test.com" }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        MvcResult resExistente = mockMvc.perform(post("/api/auth/recuperar-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "carlos.identico@test.com" }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(resInexistente.getResponse().getContentAsString())
                .isEqualTo(resExistente.getResponse().getContentAsString());

        TokenRecuperacionPassword tokenDb = tokenRecuperacionRepository
                .findTopByUsuarioIdUsuarioAndUsadoFalseOrderByFechaCreacionDesc(u.getIdUsuario())
                .orElseThrow();
        assertThat(tokenDb.getCodigoHash()).startsWith("$2");
        assertThat(tokenDb.getUsado()).isFalse();
        assertThat(tokenDb.getFechaExpiracion()).isEqualTo(tokenDb.getFechaCreacion().plusMinutes(15));
    }

    @Test
    @DisplayName("P1.2.2 Solicitar nuevo código OTP invalida los códigos activos anteriores del mismo usuario")
    void testP12RecuperarPasswordInvalidaCodigosPreviosDelMismoUsuario() throws Exception {
        Usuario u = crearUsuarioYHuesped("Fabián Rotación", "fabian.rot@test.com", "5566112233", "PasswordInicial1");

        mockMvc.perform(post("/api/auth/recuperar-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "fabian.rot@test.com" }
                                """))
                .andExpect(status().isOk());
        TokenRecuperacionPassword primero = prepararOtpConocido(u, "111222");

        mockMvc.perform(post("/api/auth/recuperar-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "fabian.rot@test.com" }
                                """))
                .andExpect(status().isOk());

        assertThat(tokenRecuperacionRepository.findById(primero.getIdToken()).orElseThrow().getUsado()).isTrue();

        // El primer OTP ya no debe funcionar tras solicitar uno nuevo
        mockMvc.perform(post("/api/auth/restablecer-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "fabian.rot@test.com",
                                  "codigo": "111222",
                                  "nuevaPassword": "NuevaPassword2"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("P1.2.3 Código OTP expirado (> 15 min) devuelve 400 y queda invalidado")
    void testP12RestablecerPasswordRechazaCodigoExpirado() throws Exception {
        Usuario u = crearUsuarioYHuesped("Gael Expirado", "gael.exp@test.com", "5577112233", "PasswordInicial1");

        mockMvc.perform(post("/api/auth/recuperar-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "gael.exp@test.com" }
                                """))
                .andExpect(status().isOk());
        TokenRecuperacionPassword tokenDb = prepararOtpConocido(u, "654321");

        authService.setClock(Clock.fixed(
                tokenDb.getFechaCreacion().plusMinutes(16).atZone(ZONA).toInstant(), ZONA));

        mockMvc.perform(post("/api/auth/restablecer-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "gael.exp@test.com",
                                  "codigo": "654321",
                                  "nuevaPassword": "NuevaPassword2"
                                }
                                """))
                .andExpect(status().isBadRequest());

        assertThat(tokenRecuperacionRepository.findById(tokenDb.getIdToken()).orElseThrow().getUsado()).isTrue();
    }

    @Test
    @DisplayName("P1.2.4 Máximo 5 intentos fallidos invalidan el código OTP y rechazan incluso el correcto en el 6to intento")
    void testP12RestablecerPasswordBloqueaTras5IntentosFallidos() throws Exception {
        Usuario u = crearUsuarioYHuesped("Hugo Intentos", "hugo.int@test.com", "5588112233", "PasswordInicial1");

        mockMvc.perform(post("/api/auth/recuperar-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "hugo.int@test.com" }
                                """))
                .andExpect(status().isOk());
        TokenRecuperacionPassword tokenBloqueo = prepararOtpConocido(u, "777888");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/restablecer-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "email": "hugo.int@test.com",
                                      "codigo": "000001",
                                      "nuevaPassword": "NuevaPassword2"
                                    }
                                    """))
                    .andExpect(status().isBadRequest());
        }

        TokenRecuperacionPassword trasBloqueo = tokenRecuperacionRepository.findById(tokenBloqueo.getIdToken()).orElseThrow();
        assertThat(trasBloqueo.getIntentos()).isEqualTo(5);
        assertThat(trasBloqueo.getUsado()).isTrue();

        mockMvc.perform(post("/api/auth/restablecer-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "hugo.int@test.com",
                                  "codigo": "777888",
                                  "nuevaPassword": "NuevaPassword2"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("P1.2.5 Política de contraseña débil es rechazada con 400")
    void testP12RestablecerPasswordRechazaPasswordDebil() throws Exception {
        mockMvc.perform(post("/api/auth/restablecer-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "cualquiera@test.com",
                                  "codigo": "123456",
                                  "nuevaPassword": "debil"
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/restablecer-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "cualquiera@test.com",
                                  "codigo": "123456",
                                  "nuevaPassword": "solominusculas1"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("P1.2.6 Restablecimiento exitoso envía correo asíncrono sin secretos en logs, revoca JWT previo/legacy e impide reuso")
    void testP12RestablecerPasswordExitosoRevocaJwtEImpideReusoYSinSecretosEnLogsYAsync() throws Exception {
        Usuario u = crearUsuarioYHuesped("Iván Reset", "ivan.reset@test.com", "5599112233", "PasswordInicial1");
        String jwtPrevio = jwtService.generateToken(u);
        String jwtLegacyPreV6 = generarJwtLegacySinClaimVer(u);

        Logger authLogger = (Logger) LoggerFactory.getLogger(AuthService.class);
        Logger emailLogger = (Logger) LoggerFactory.getLogger(EmailService.class);
        ListAppender<ILoggingEvent> logWatcher = new ListAppender<>();
        logWatcher.start();
        authLogger.addAppender(logWatcher);
        emailLogger.addAppender(logWatcher);

        try {
            long tareasPrevias = mailTaskExecutor.getThreadPoolExecutor().getCompletedTaskCount();

            mockMvc.perform(post("/api/auth/recuperar-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "email": "ivan.reset@test.com" }
                                    """))
                    .andExpect(status().isOk());

            // Esperar breve a que finalice la tarea asíncrona de EmailService para auditar logs del hilo hotel-mail-*
            long deadline = System.currentTimeMillis() + 3000;
            while (mailTaskExecutor.getThreadPoolExecutor().getCompletedTaskCount() <= tareasPrevias
                    && System.currentTimeMillis() < deadline) {
                Thread.sleep(20);
            }
            assertThat(mailTaskExecutor.getThreadPoolExecutor().getCompletedTaskCount())
                    .isGreaterThan(tareasPrevias);

            String otpValido = "918273";
            prepararOtpConocido(u, otpValido);

            String nuevaClave = "NuevaClaveFuerte9";
            mockMvc.perform(post("/api/auth/restablecer-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "email": "ivan.reset@test.com",
                                      "codigo": "918273",
                                      "nuevaPassword": "NuevaClaveFuerte9"
                                    }
                                    """))
                    .andExpect(status().isOk());

            // JWT previo y JWT legacy sin claim "ver" quedan revocados de inmediato
            mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtPrevio))
                    .andExpect(status().isUnauthorized());
            mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtLegacyPreV6))
                    .andExpect(status().isUnauthorized());

            // Código reutilizado debe fallar
            mockMvc.perform(post("/api/auth/restablecer-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "email": "ivan.reset@test.com",
                                      "codigo": "918273",
                                      "nuevaPassword": "OtraClaveFuerte9"
                                    }
                                    """))
                    .andExpect(status().isBadRequest());

            // Login con la nueva contraseña devuelve JWT válido
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "email": "ivan.reset@test.com",
                                      "password": "NuevaClaveFuerte9"
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isNotEmpty());

            List<String> mensajesLog = logWatcher.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .toList();
            assertThat(mensajesLog).noneMatch(m -> m.contains(otpValido) || m.contains(nuevaClave));
        } finally {
            authLogger.detachAppender(logWatcher);
            emailLogger.detachAppender(logWatcher);
        }
    }

    @Test
    @DisplayName("P1.2.7 Rate limit 429 por email, por remoteAddr e ignorando X-Forwarded-For falso por defecto")
    void testP12RateLimit429PorEmailYPorIp() throws Exception {
        // 1. Por email en /recuperar-password (5/h -> 6ta retorna 429)
        for (int i = 0; i < AuthRateLimiterService.MAX_RECUPERAR_EMAIL_HORA; i++) {
            final int idx = i;
            mockMvc.perform(post("/api/auth/recuperar-password")
                            .with(req -> { req.setRemoteAddr("198.51.100." + (10 + idx)); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "email": "rl.email@test.com" }
                                    """))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/auth/recuperar-password")
                        .with(req -> { req.setRemoteAddr("198.51.100.99"); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "rl.email@test.com" }
                                """))
                .andExpect(status().isTooManyRequests());

        // 2. Por IP (getRemoteAddr) en /recuperar-password (25/h) y bloqueo de spoofing con X-Forwarded-For
        authRateLimiterService.limpiar();
        for (int i = 0; i < AuthRateLimiterService.MAX_POR_IP_HORA; i++) {
            mockMvc.perform(post("/api/auth/recuperar-password")
                            .with(req -> { req.setRemoteAddr("203.0.113.77"); return req; })
                            .header("X-Forwarded-For", "10.0.0." + i) // Debe ignorarse por trust-forwarded-headers=false
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "email": "rl.ip.%d@test.com" }
                                    """.formatted(i)))
                    .andExpect(status().isOk());
        }
        // Aunque el atacante cambie X-Forwarded-For, su remoteAddr real sigue bloqueado con 429
        mockMvc.perform(post("/api/auth/recuperar-password")
                        .with(req -> { req.setRemoteAddr("203.0.113.77"); return req; })
                        .header("X-Forwarded-For", "203.0.113.250")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "rl.ip.extra@test.com" }
                                """))
                .andExpect(status().isTooManyRequests());

        // 3. Por email en /restablecer-password (10/h -> 11va retorna 429)
        authRateLimiterService.limpiar();
        for (int i = 0; i < AuthRateLimiterService.MAX_RESTABLECER_EMAIL_HORA; i++) {
            mockMvc.perform(post("/api/auth/restablecer-password")
                            .with(req -> { req.setRemoteAddr("192.0.2.50"); return req; })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "email": "rl.reset@test.com",
                                      "codigo": "000001",
                                      "nuevaPassword": "PasswordValida1"
                                    }
                                    """))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/auth/restablecer-password")
                        .with(req -> { req.setRemoteAddr("192.0.2.50"); return req; })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "rl.reset@test.com",
                                  "codigo": "000001",
                                  "nuevaPassword": "PasswordValida1"
                                }
                                """))
                .andExpect(status().isTooManyRequests());
    }

    // ------------------------------------------------------------------
    // P1.3 — DashboardService + Invariantes + Dry-run job
    // ------------------------------------------------------------------

    @Test
    @DisplayName("P1.3.1 DashboardService incluye OCUPADA en categorías sumando igual que KPIs y excluye sedes inactivas por defecto")
    void testP13DashboardOcupadaEnCategoriasYSedesInactivas() {
        List<TipoHabitacion> tipos = tipoHabitacionRepository.findAll();
        assertThat(tipos).isNotEmpty();
        TipoHabitacion tipo0 = tipos.get(0);
        TipoHabitacion tipo1 = tipos.size() > 1 ? tipos.get(1) : tipos.get(0);

        Hotel hotelActivo = new Hotel();
        hotelActivo.setNombre("Hotel Test Activo P13");
        hotelActivo.setCiudad("Mérida");
        hotelActivo.setDireccion("Calle 60");
        hotelActivo.setTelefono("9991112233");
        hotelActivo.setEmail("activo.p13@test.com");
        hotelActivo.setActivo(true);
        hotelActivo = hotelRepository.save(hotelActivo);
        hotelesTempIds.add(hotelActivo.getIdHotel());

        Hotel hotelInactivo = new Hotel();
        hotelInactivo.setNombre("Hotel Test Inactivo P13");
        hotelInactivo.setCiudad("Oaxaca");
        hotelInactivo.setDireccion("Reforma 10");
        hotelInactivo.setTelefono("9514445566");
        hotelInactivo.setEmail("inactivo.p13@test.com");
        hotelInactivo.setActivo(false);
        hotelInactivo = hotelRepository.save(hotelInactivo);
        hotelesTempIds.add(hotelInactivo.getIdHotel());

        Habitacion habActiva = new Habitacion();
        habActiva.setHotel(hotelActivo);
        habActiva.setTipoHabitacion(tipo0);
        habActiva.setNumero("P13-101");
        habActiva.setPiso(1);
        habActiva.setEstado("Disponible");
        habActiva = habitacionRepository.save(habActiva);
        habitacionesTempIds.add(habActiva.getIdHabitacion());

        Habitacion habInactiva = new Habitacion();
        habInactiva.setHotel(hotelInactivo);
        habInactiva.setTipoHabitacion(tipo1);
        habInactiva.setNumero("P13-201");
        habInactiva.setPiso(2);
        habInactiva.setEstado("Disponible");
        habInactiva = habitacionRepository.save(habInactiva);
        habitacionesTempIds.add(habInactiva.getIdHabitacion());

        Huesped hue = new Huesped();
        hue.setNombre("Huesped P13");
        hue.setTelefono("5566778899");
        hue.setEmail("huesped.p13@test.com");
        hue = huespedRepository.save(hue);
        huespedesTempIds.add(hue.getIdHuesped());

        int year = 2024;
        crearReservaDashboard(habActiva, hue, "HP-P13-FIN", LocalDate.of(year, 2, 1), 2,
                Reserva.FINALIZADA, new BigDecimal("2000.00"), new BigDecimal("2000.00"), BigDecimal.ZERO);
        crearReservaDashboard(habActiva, hue, "HP-P13-CONF", LocalDate.of(year, 3, 1), 2,
                Reserva.CONFIRMADA, new BigDecimal("3000.00"), new BigDecimal("1500.00"), new BigDecimal("1500.00"));
        crearReservaDashboard(habActiva, hue, "HP-P13-OCUP", LocalDate.of(year, 4, 1), 3,
                Reserva.OCUPADA, new BigDecimal("4500.00"), new BigDecimal("2250.00"), new BigDecimal("2250.00"));
        crearReservaDashboard(habInactiva, hue, "HP-P13-INAC", LocalDate.of(year, 5, 1), 2,
                Reserva.OCUPADA, new BigDecimal("5000.00"), new BigDecimal("2500.00"), new BigDecimal("2500.00"));

        Map<String, Object> kpisHotelActivo = dashboardService.obtenerResumenKpis(year, hotelActivo.getIdHotel(), false);
        List<Map<String, Object>> catsHotelActivo = dashboardService.obtenerDistribucionCategorias(year, hotelActivo.getIdHotel(), false);

        BigDecimal sumaCategorias = catsHotelActivo.stream()
                .map(c -> (BigDecimal) c.get("ingresos"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(kpisHotelActivo.get("ingresosHospedaje")).isEqualTo(new BigDecimal("9500.00"));
        assertThat(sumaCategorias).isEqualByComparingTo((BigDecimal) kpisHotelActivo.get("ingresosHospedaje"));

        Map<String, Object> kpisActivos = dashboardService.obtenerResumenKpis(year, null, false);
        Map<String, Object> kpisTodos = dashboardService.obtenerResumenKpis(year, null, true);
        List<Map<String, Object>> hotelesActivos = dashboardService.obtenerRendimientoHoteles(year, false);
        List<Map<String, Object>> hotelesTodos = dashboardService.obtenerRendimientoHoteles(year, true);

        assertThat((Integer) kpisTodos.get("totalHabitaciones"))
                .isGreaterThan((Integer) kpisActivos.get("totalHabitaciones"));

        BigDecimal ingActivos = (BigDecimal) kpisActivos.get("ingresosHospedaje");
        BigDecimal ingTodos = (BigDecimal) kpisTodos.get("ingresosHospedaje");
        assertThat(ingTodos.subtract(ingActivos)).isEqualByComparingTo("5000.00");

        final Integer idHotelInactivo = hotelInactivo.getIdHotel();
        assertThat(hotelesActivos).noneMatch(h -> idHotelInactivo.equals(h.get("idHotel")));
        assertThat(hotelesTodos).anyMatch(h -> idHotelInactivo.equals(h.get("idHotel")));

        List<Map<String, Object>> catsActivos = dashboardService.obtenerDistribucionCategorias(year, null, false);
        BigDecimal sumaCatsActivos = catsActivos.stream()
                .map(c -> (BigDecimal) c.get("ingresos"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sumaCatsActivos).isEqualByComparingTo(ingActivos);
    }

    @Test
    @DisplayName("P1.3.2 Invariante: esquema migrado V1-V8, Finalizada sin saldo pendiente y conciliación contratado = cobrado + pendiente")
    void testP13InvarianteFinalizadasYConciliacionDashboard() {
        // 0. Verificación del esquema migrado por Flyway (V1-V8 aplicadas con éxito y objetos V6/V7/V8 presentes)
        List<String> versionesMigradas = jdbcTemplate.queryForList(
                "SELECT version FROM flyway_schema_history WHERE version IS NOT NULL AND success = 1 ORDER BY installed_rank",
                String.class
        );
        assertThat(versionesMigradas).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11");

        Integer tablaRecuperacionExiste = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'token_recuperacion_password'",
                Integer.class
        );
        Integer colTokenVersionExiste = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario' AND COLUMN_NAME = 'token_version'",
                Integer.class
        );
        Integer colMetodoPagoSaldoExiste = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reserva' AND COLUMN_NAME = 'metodo_pago_saldo'",
                Integer.class
        );
        assertThat(tablaRecuperacionExiste).isEqualTo(1);
        assertThat(colTokenVersionExiste).isEqualTo(1);
        assertThat(colMetodoPagoSaldoExiste).isEqualTo(1);

        // V7 debe haber dejado 0 eventos CORRECCION_DATOS sobre BD vacía/seeder (no-op por id_reserva + folio)
        Integer eventosV7EnSeeder = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva_evento WHERE tipo = 'CORRECCION_DATOS' AND fecha_hora = '2026-11-10 23:00:00.000000'",
                Integer.class
        );
        assertThat(eventosV7EnSeeder).isZero();

        // 1. En el dataset limpio de pruebas (migraciones + seeder), ninguna Finalizada debe quedar con saldo > 0
        Integer finalizadasConSaldo = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva WHERE estado = 'Finalizada' AND saldo > 0",
                Integer.class
        );
        assertThat(finalizadasConSaldo).isZero();

        // Toda Finalizada con check_out_at registrado tiene saldo = 0
        Integer checkOutConSaldo = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva WHERE estado = 'Finalizada' AND check_out_at IS NOT NULL AND saldo <> 0",
                Integer.class
        );
        assertThat(checkOutConSaldo).isZero();

        // 2. Conciliación contable actual de DashboardService (contratado vs cobrado + pendiente)
        int year = 2026;
        Map<String, Object> kpis = dashboardService.obtenerResumenKpis(year, null, false);
        BigDecimal ingresosHospedaje = (BigDecimal) kpis.get("ingresosHospedaje");
        BigDecimal penalizaciones = (BigDecimal) kpis.get("penalizacionesRetenidas");
        BigDecimal reembolsos = (BigDecimal) kpis.get("reembolsosDevueltos");
        BigDecimal ingresosBrutos = (BigDecimal) kpis.get("ingresosBrutos");
        BigDecimal ingresosNetos = (BigDecimal) kpis.get("ingresosNetos");
        BigDecimal anticiposCobrados = (BigDecimal) kpis.get("anticiposCobrados");
        BigDecimal saldosLiquidados = (BigDecimal) kpis.get("saldosLiquidados");

        assertThat(ingresosBrutos).isEqualByComparingTo(ingresosHospedaje.add(penalizaciones));
        assertThat(ingresosNetos).isEqualByComparingTo(ingresosBrutos.subtract(reembolsos));
        assertThat(anticiposCobrados.add(saldosLiquidados)).isLessThanOrEqualTo(ingresosHospedaje);
    }

    @Test
    @DisplayName("Expiración en modo dry-run=true registra candidatas sin mutar BD")
    void testExpiracionDryRunNoModificaBd() {
        Habitacion hab = habitacionRepository.findAll().get(0);
        Huesped hue = new Huesped();
        hue.setNombre("Huesped DryRun");
        hue.setTelefono("5500112233");
        hue.setEmail("dryrun@test.com");
        hue = huespedRepository.save(hue);
        huespedesTempIds.add(hue.getIdHuesped());

        LocalDate fechaPrueba = LocalDate.of(2019, 8, 10);
        Reserva preVencida = crearReservaDashboard(hab, hue, "HP-DRY-PRE", fechaPrueba.plusDays(1), 2,
                Reserva.PRE_RESERVA, new BigDecimal("2000.00"), BigDecimal.ZERO, new BigDecimal("2000.00"));
        transactionTemplate.executeWithoutResult(st -> {
            Reserva p = reservaRepository.findById(preVencida.getIdReserva()).orElseThrow();
            p.setFechaExpiracion(fechaPrueba.atTime(20, 0));
            reservaRepository.save(p);
        });
        Reserva confirmada = crearReservaDashboard(hab, hue, "HP-DRY-CONF", fechaPrueba, 2,
                Reserva.CONFIRMADA, new BigDecimal("2500.00"), new BigDecimal("1250.00"), new BigDecimal("1250.00"));

        reservaService.setClock(Clock.fixed(fechaPrueba.atTime(22, 30).atZone(ZONA).toInstant(), ZONA));
        assertThat(reservaService.isExpiracionDryRun()).isTrue();

        Map<String, Object> preview = reservaService.previsualizarExpiracionesYNoShow();
        assertThat((Integer) preview.get("preReservasVencidasCount")).isGreaterThanOrEqualTo(1);
        assertThat((Integer) preview.get("confirmadasNoShowCount")).isGreaterThanOrEqualTo(1);

        int escritas = reservaService.expirarPreReservas();
        assertThat(escritas).isZero();

        assertThat(reservaRepository.findById(preVencida.getIdReserva()).orElseThrow().getEstado())
                .isEqualTo(Reserva.PRE_RESERVA);
        assertThat(reservaRepository.findById(confirmada.getIdReserva()).orElseThrow().getEstado())
                .isEqualTo(Reserva.CONFIRMADA);
        assertThat(reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(preVencida.getIdReserva())).isEmpty();
        assertThat(reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(confirmada.getIdReserva())).isEmpty();
    }

    private Reserva crearReservaDashboard(Habitacion hab, Huesped hue, String folio, LocalDate entrada, int noches,
                                          String estado, BigDecimal total, BigDecimal anticipo, BigDecimal saldo) {
        Reserva r = new Reserva();
        r.setFolio(folio);
        r.setHabitacion(hab);
        r.setHuesped(hue);
        r.setFechaEntrada(entrada);
        r.setFechaSalida(entrada.plusDays(noches));
        r.setNoches(noches);
        r.setAdultos(2);
        r.setNinos(0);
        r.setEstado(estado);
        r.setTotal(total);
        r.setAnticipo(anticipo);
        r.setSaldo(saldo);
        r.setMetodoPago("TRANSFERENCIA");
        r = reservaRepository.save(r);
        reservasTempIds.add(r.getIdReserva());
        return r;
    }
}
