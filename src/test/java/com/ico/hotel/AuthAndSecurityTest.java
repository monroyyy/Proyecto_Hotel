package com.ico.hotel;

import com.ico.hotel.dto.auth.AuthResponse;
import com.ico.hotel.dto.auth.LoginRequest;
import com.ico.hotel.dto.auth.RegistroRequest;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.*;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.security.JwtService;
import com.ico.hotel.security.TokenBlacklistService;
import com.ico.hotel.services.AuthService;
import com.ico.hotel.services.EmailService;
import com.ico.hotel.services.ReservaService;
import com.ico.hotel.tools.HabitacionSearchTool;
import com.ico.hotel.tools.ReservaTool;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthAndSecurityTest {

    private UsuarioRepository usuarioRepository;
    private TokenVerificacionRepository tokenRepository;
    private HuespedRepository huespedRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private TokenBlacklistService tokenBlacklistService;
    private EmailService emailService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        tokenRepository = mock(TokenVerificacionRepository.class);
        huespedRepository = mock(HuespedRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(
                "ClaveSecretaDePruebasUnitariasConMasDe32BytesDeLongitud2026!",
                3600000L
        );
        tokenBlacklistService = new TokenBlacklistService();
        emailService = mock(EmailService.class);

        authService = new AuthService(
                usuarioRepository,
                tokenRepository,
                huespedRepository,
                passwordEncoder,
                jwtService,
                tokenBlacklistService,
                emailService
        );
        ReflectionTestUtils.setField(authService, "verificationExpirationMinutes", 30);
    }

    @AfterEach
    void tearDown() {
        HabitacionSearchTool.CURRENT_AUTH_USER.remove();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("1. Registro asigna siempre rol HUESPED, verificado=false, hash BCrypt y envía token por correo")
    void testRegistroExitoso() {
        RegistroRequest req = new RegistroRequest();
        req.setNombre("Ana López");
        req.setEmail("ana.lopez@ejemplo.com");
        req.setPassword("Segura123");

        when(usuarioRepository.existsByEmailIgnoreCase("ana.lopez@ejemplo.com")).thenReturn(false);
        when(huespedRepository.findFirstByEmailIgnoreCase("ana.lopez@ejemplo.com")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setIdUsuario(10);
            return u;
        });
        when(tokenRepository.save(any(TokenVerificacion.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.enviarCorreoVerificacion(anyString(), anyString(), anyString())).thenReturn(true);

        Map<String, Object> result = authService.registrar(req);

        ArgumentCaptor<Usuario> userCaptor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(userCaptor.capture());
        Usuario guardado = userCaptor.getValue();

        assertThat(guardado.getRol()).isEqualTo(Rol.HUESPED);
        assertThat(guardado.getVerificado()).isFalse();
        assertThat(guardado.getPasswordHash()).isNotEqualTo("Segura123");
        assertThat(passwordEncoder.matches("Segura123", guardado.getPasswordHash())).isTrue();

        ArgumentCaptor<TokenVerificacion> tokenCaptor = ArgumentCaptor.forClass(TokenVerificacion.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getToken()).hasSizeGreaterThanOrEqualTo(32);
        assertThat(tokenCaptor.getValue().getUsado()).isFalse();

        verify(emailService).enviarCorreoVerificacion(eq("ana.lopez@ejemplo.com"), eq("Ana López"), anyString());
        assertThat(result).containsEntry("rol", "HUESPED").containsEntry("verificado", false);
    }

    @Test
    @DisplayName("2. Registro con correo duplicado lanza 409 Conflict")
    void testRegistroCorreoDuplicado409() {
        RegistroRequest req = new RegistroRequest();
        req.setNombre("Ana López");
        req.setEmail("duplicado@ejemplo.com");
        req.setPassword("Segura123");

        when(usuarioRepository.existsByEmailIgnoreCase("duplicado@ejemplo.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.registrar(req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("3. Login antes de verificar el correo devuelve 403 Forbidden")
    void testLoginSinVerificarDevuelve403() {
        Usuario u = new Usuario();
        u.setIdUsuario(10);
        u.setNombre("Ana López");
        u.setEmail("ana@ejemplo.com");
        u.setPasswordHash(passwordEncoder.encode("Segura123"));
        u.setRol(Rol.HUESPED);
        u.setVerificado(false);
        u.setActivo(true);

        when(usuarioRepository.findByEmailIgnoreCase("ana@ejemplo.com")).thenReturn(Optional.of(u));

        LoginRequest req = new LoginRequest();
        req.setEmail("ana@ejemplo.com");
        req.setPassword("Segura123");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("verificada");
                });
    }

    @Test
    @DisplayName("4. Token de verificación activa la cuenta y es estrictamente de un solo uso")
    void testTokenVerificacionUnSoloUso() {
        Usuario u = new Usuario();
        u.setIdUsuario(10);
        u.setEmail("ana@ejemplo.com");
        u.setVerificado(false);

        TokenVerificacion tv = new TokenVerificacion();
        tv.setToken("token-unico-123");
        tv.setUsuario(u);
        tv.setUsado(false);
        tv.setFechaExpiracion(LocalDateTime.now().plusMinutes(20));

        when(tokenRepository.findByToken("token-unico-123")).thenReturn(Optional.of(tv));

        // Primera vez: éxito
        Map<String, Object> res = authService.verificarCorreo("token-unico-123");
        assertThat(u.getVerificado()).isTrue();
        assertThat(tv.getUsado()).isTrue();
        assertThat(res.get("mensaje").toString()).contains("verificado exitosamente");

        // Segunda vez con el mismo token: debe fallar con 400 Bad Request
        assertThatThrownBy(() -> authService.verificarCorreo("token-unico-123"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("5. Login con correo inexistente o contraseña incorrecta devuelve 401 con el mismo mensaje genérico")
    void testLoginCredencialesInvalidasMensajeGenerico() {
        Usuario u = new Usuario();
        u.setIdUsuario(10);
        u.setEmail("ana@ejemplo.com");
        u.setPasswordHash(passwordEncoder.encode("Segura123"));
        u.setVerificado(true);
        u.setActivo(true);

        when(usuarioRepository.findByEmailIgnoreCase("ana@ejemplo.com")).thenReturn(Optional.of(u));
        when(usuarioRepository.findByEmailIgnoreCase("noexiste@ejemplo.com")).thenReturn(Optional.empty());

        LoginRequest wrongPass = new LoginRequest();
        wrongPass.setEmail("ana@ejemplo.com");
        wrongPass.setPassword("Incorrecta999");

        LoginRequest wrongEmail = new LoginRequest();
        wrongEmail.setEmail("noexiste@ejemplo.com");
        wrongEmail.setPassword("Segura123");

        String msgEsperado = "Credenciales inválidas. Verifique su correo electrónico y contraseña.";

        assertThatThrownBy(() -> authService.login(wrongPass))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(rse.getReason()).isEqualTo(msgEsperado);
                });

        assertThatThrownBy(() -> authService.login(wrongEmail))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(rse.getReason()).isEqualTo(msgEsperado);
                });
    }

    @Test
    @DisplayName("6. Login exitoso genera JWT con payload mínimo (id y rol) y Logout revoca el token en el servidor")
    void testLoginYLogoutConListaNegra() {
        Usuario u = new Usuario();
        u.setIdUsuario(25);
        u.setNombre("Carlos Huésped");
        u.setEmail("carlos@ejemplo.com");
        u.setPasswordHash(passwordEncoder.encode("Segura123"));
        u.setRol(Rol.HUESPED);
        u.setVerificado(true);
        u.setActivo(true);

        when(usuarioRepository.findByEmailIgnoreCase("carlos@ejemplo.com")).thenReturn(Optional.of(u));

        LoginRequest req = new LoginRequest();
        req.setEmail("carlos@ejemplo.com");
        req.setPassword("Segura123");

        AuthResponse auth = authService.login(req);
        assertThat(auth.getToken()).isNotBlank();
        assertThat(jwtService.extractUserId(auth.getToken())).isEqualTo(25);
        assertThat(jwtService.extractRole(auth.getToken())).isEqualTo("HUESPED");

        String jti = jwtService.extractJti(auth.getToken());
        assertThat(tokenBlacklistService.isRevoked(jti)).isFalse();

        // Ejecutar logout enviando cabecera Bearer
        authService.logout("Bearer " + auth.getToken());
        assertThat(tokenBlacklistService.isRevoked(jti)).isTrue();
    }

    @Test
    @DisplayName("7. Control de propiedad de reservaciones: HUESPED solo puede acceder a las suyas; ADMINISTRADOR a todas")
    void testAislamientoDeReservacionesPorPropietario() {
        ReservaService reservaService = new ReservaService();

        Usuario dueno = new Usuario();
        dueno.setIdUsuario(100);
        dueno.setEmail("dueno@ejemplo.com");
        dueno.setRol(Rol.HUESPED);
        dueno.setActivo(true);
        dueno.setVerificado(true);

        Usuario otroHuesped = new Usuario();
        otroHuesped.setIdUsuario(200);
        otroHuesped.setEmail("intruso@ejemplo.com");
        otroHuesped.setRol(Rol.HUESPED);
        otroHuesped.setActivo(true);
        otroHuesped.setVerificado(true);

        Usuario admin = new Usuario();
        admin.setIdUsuario(1);
        admin.setEmail("admin@hotel.com");
        admin.setRol(Rol.ADMINISTRADOR);
        admin.setActivo(true);
        admin.setVerificado(true);

        Reserva reservaDeDueno = new Reserva();
        reservaDeDueno.setIdReserva(55);
        reservaDeDueno.setUsuario(dueno);

        // El dueño sí puede acceder
        reservaService.validarAccesoReserva(reservaDeDueno, new CustomUserDetails(dueno));

        // El administrador sí puede acceder
        reservaService.validarAccesoReserva(reservaDeDueno, new CustomUserDetails(admin));

        // Otro huésped recibe AccessDeniedException (403 Forbidden)
        assertThatThrownBy(() -> reservaService.validarAccesoReserva(reservaDeDueno, new CustomUserDetails(otroHuesped)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("8. Herramientas de IA bloquean información interna del hotel y reservas ajenas cuando el usuario es HUESPED")
    void testHerramientasIABloqueanDatosInternosParaHuesped() {
        Usuario huesped = new Usuario();
        huesped.setIdUsuario(10);
        huesped.setNombre("Huésped Test");
        huesped.setEmail("huesped@ejemplo.com");
        huesped.setRol(Rol.HUESPED);
        huesped.setVerificado(true);
        huesped.setActivo(true);

        CustomUserDetails details = new CustomUserDetails(huesped);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities())
        );

        HabitacionRepository habRepo = mock(HabitacionRepository.class);
        HotelRepository hotelRepo = mock(HotelRepository.class);
        HabitacionSearchTool habTool = new HabitacionSearchTool(habRepo, hotelRepo);

        assertThat(habTool.findHabitacionesEnMantenimiento().get(0)).containsEntry("accesoRestringido", true);
        assertThat(habTool.findHabitacionesOcupadas().get(0)).containsEntry("accesoRestringido", true);
        assertThat(habTool.countHabitacionesPorEstado().get(0)).containsEntry("accesoRestringido", true);
        assertThat(habTool.getResumenOperativoHotel(null)).containsEntry("accesoRestringido", true);

        // Verificar que ReservaTool bloquea consultar el folio de otro huésped
        ReservaRepository mockReservaRepo = mock(ReservaRepository.class);
        Reserva reservaAjena = new Reserva();
        reservaAjena.setFolio("HP-2026-00099");
        Usuario otroUsuario = new Usuario();
        otroUsuario.setIdUsuario(999);
        otroUsuario.setEmail("otro@ejemplo.com");
        reservaAjena.setUsuario(otroUsuario);

        when(mockReservaRepo.findByFolioIgnoreCase("HP-2026-00099")).thenReturn(Optional.of(reservaAjena));

        ReservaTool reservaTool = new ReservaTool(mock(ReservaService.class), habRepo, mockReservaRepo, hotelRepo, mock(com.ico.hotel.repository.HuespedRepository.class));
        Map<String, Object> folioResult = reservaTool.consultarReservacionPorFolio("HP-2026-00099");
        assertThat(folioResult).containsEntry("accesoRestringido", true);
    }

    @Test
    @DisplayName("9. Recuperación de contraseña envía OTP 6 dígitos vía EmailService, guarda hash y permite restablecer")
    void testRecuperacionEnviaCorreoYRestableceConOtpCapturado() {
        TokenRecuperacionPasswordRepository recoveryRepo = mock(TokenRecuperacionPasswordRepository.class);
        authService.setTokenRecuperacionRepository(recoveryRepo);

        Usuario u = new Usuario();
        u.setIdUsuario(44);
        u.setNombre("Lucía");
        u.setEmail("lucia@ejemplo.com");
        u.setPasswordHash(passwordEncoder.encode("Anterior1"));
        u.setRol(Rol.HUESPED);
        u.setVerificado(true);
        u.setActivo(true);
        u.setTokenVersion(0);

        when(usuarioRepository.findByEmailIgnoreCase("lucia@ejemplo.com")).thenReturn(Optional.of(u));
        when(recoveryRepo.save(any(TokenRecuperacionPassword.class))).thenAnswer(inv -> inv.getArgument(0));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> respSol = authService.solicitarRecuperacionPassword("lucia@ejemplo.com");
        assertThat(respSol).containsKey("mensaje");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).enviarCorreoRecuperacion(eq("lucia@ejemplo.com"), eq("Lucía"), otpCaptor.capture());
        String otpEnviado = otpCaptor.getValue();
        assertThat(otpEnviado).matches("^\\d{6}$");

        ArgumentCaptor<TokenRecuperacionPassword> tokenCaptor = ArgumentCaptor.forClass(TokenRecuperacionPassword.class);
        verify(recoveryRepo).save(tokenCaptor.capture());
        TokenRecuperacionPassword guardado = tokenCaptor.getValue();
        assertThat(guardado.getCodigoHash()).isNotEqualTo(otpEnviado);
        assertThat(passwordEncoder.matches(otpEnviado, guardado.getCodigoHash())).isTrue();

        when(recoveryRepo.findTopByUsuarioIdUsuarioAndUsadoFalseOrderByFechaCreacionDesc(44))
                .thenReturn(Optional.of(guardado));

        com.ico.hotel.dto.auth.RestablecerPasswordRequest reqReset = new com.ico.hotel.dto.auth.RestablecerPasswordRequest(
                "lucia@ejemplo.com", otpEnviado, "NuevaSegura9", "NuevaSegura9"
        );
        Map<String, Object> respReset = authService.restablecerPassword(reqReset);
        assertThat(respReset).containsEntry("status", 200);
        assertThat(u.getTokenVersion()).isEqualTo(1);
        assertThat(passwordEncoder.matches("NuevaSegura9", u.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("10. AuthController usa getRemoteAddr por defecto y solo confía en X-Forwarded-For si el proxy está configurado")
    void testResolverIpConYSinProxyConfiable() {
        com.ico.hotel.services.AuthRateLimiterService rateLimiter = mock(com.ico.hotel.services.AuthRateLimiterService.class);
        com.ico.hotel.controllers.AuthController controller = new com.ico.hotel.controllers.AuthController(authService, rateLimiter);
        com.ico.hotel.dto.auth.RecuperarPasswordRequest reqBody = new com.ico.hotel.dto.auth.RecuperarPasswordRequest("ip@test.com");

        org.springframework.mock.web.MockHttpServletRequest req1 = new org.springframework.mock.web.MockHttpServletRequest();
        req1.setRemoteAddr("198.51.100.5");
        req1.addHeader("X-Forwarded-For", "1.2.3.4");

        // Por defecto (trustForwardedHeaders=false) ignora X-Forwarded-For
        controller.recuperarPassword(reqBody, req1);
        verify(rateLimiter).validarYRegistrar("recuperar", "198.51.100.5", "ip@test.com");

        // Con proxy confiable habilitado y coincidente usa el primer valor de X-Forwarded-For
        ReflectionTestUtils.setField(controller, "trustForwardedHeaders", true);
        ReflectionTestUtils.setField(controller, "trustedProxiesRaw", "10.0.0.1, 198.51.100.5");
        controller.recuperarPassword(reqBody, req1);
        verify(rateLimiter).validarYRegistrar("recuperar", "1.2.3.4", "ip@test.com");

        // Si el proxy remoto NO está en trustedProxiesRaw, vuelve a usar remoteAddr
        org.springframework.mock.web.MockHttpServletRequest reqNoConfiable = new org.springframework.mock.web.MockHttpServletRequest();
        reqNoConfiable.setRemoteAddr("203.0.113.9");
        reqNoConfiable.addHeader("X-Forwarded-For", "5.6.7.8");
        controller.recuperarPassword(reqBody, reqNoConfiable);
        verify(rateLimiter).validarYRegistrar("recuperar", "203.0.113.9", "ip@test.com");
    }
}
