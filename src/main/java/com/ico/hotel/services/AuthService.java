package com.ico.hotel.services;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.dto.auth.*;
import com.ico.hotel.models.Huesped;
import com.ico.hotel.models.Rol;
import com.ico.hotel.models.TokenRecuperacionPassword;
import com.ico.hotel.models.TokenVerificacion;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.HuespedRepository;
import com.ico.hotel.repository.TokenRecuperacionPasswordRepository;
import com.ico.hotel.repository.TokenVerificacionRepository;
import com.ico.hotel.repository.UsuarioRepository;
import com.ico.hotel.security.JwtService;
import com.ico.hotel.security.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lógica de negocio de autenticación, registro seguro, verificación por correo y cierre de sesión.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final String GENERIC_LOGIN_ERROR = "Credenciales inválidas. Verifique su correo electrónico y contraseña.";
    private static final String GENERIC_RECOVERY_MSG = "Si el correo electrónico está registrado, recibirá un código de 6 dígitos válido por 15 minutos.";
    private static final String PASSWORD_POLICY_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$";
    private static final int RECOVERY_OTP_EXPIRATION_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final TokenVerificacionRepository tokenRepository;
    private final HuespedRepository huespedRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;
    private final EmailService emailService;

    @Autowired(required = false)
    private TokenRecuperacionPasswordRepository tokenRecuperacionRepository;

    @Autowired(required = false)
    private Clock clock;

    @Value("${app.verification.expiration-minutes:30}")
    private int verificationExpirationMinutes;

    private Clock clockActual() {
        return clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
    }

    public void setTokenRecuperacionRepository(TokenRecuperacionPasswordRepository tokenRecuperacionRepository) {
        this.tokenRecuperacionRepository = tokenRecuperacionRepository;
    }

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    @Transactional
    public Map<String, Object> registrar(RegistroRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        String nombre = req.getNombre().trim();

        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe una cuenta registrada con este correo electrónico."
            );
        }

        // El registro público SIEMPRE crea un usuario con rol HUESPED y cuenta NO verificada
        Usuario nuevo = new Usuario();
        nuevo.setNombre(nombre);
        nuevo.setEmail(email);
        nuevo.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        nuevo.setRol(Rol.HUESPED);
        nuevo.setVerificado(false);
        nuevo.setActivo(true);
        nuevo.setFechaCreacion(LocalDateTime.now(clockActual()));
        nuevo = usuarioRepository.save(nuevo);

        // Sincronizar o vincular perfil básico en tabla huesped
        Huesped huesped = huespedRepository.findFirstByEmailIgnoreCase(email).orElseGet(Huesped::new);
        if (huesped.getNombre() == null || huesped.getNombre().isBlank()) {
            huesped.setNombre(nombre);
        }
        huesped.setEmail(email);
        huespedRepository.save(huesped);

        TokenVerificacion tokenVerificacion = crearNuevoToken(nuevo);
        boolean enviadoPorSmtp = emailService.enviarCorreoVerificacion(email, nombre, tokenVerificacion.getToken());

        log.info("Nuevo usuario registrado con rol HUESPED (pendiente de verificación, código={}): {}", tokenVerificacion.getCodigo(), email);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("mensaje", "Registro exitoso. Hemos enviado un código de 4 dígitos a su correo electrónico para verificar su cuenta.");
        respuesta.put("email", nuevo.getEmail());
        respuesta.put("rol", nuevo.getRol().name());
        respuesta.put("verificado", false);
        respuesta.put("enviadoPorSmtp", enviadoPorSmtp);
        respuesta.put("expiracionTokenMinutos", verificationExpirationMinutes);
        return respuesta;
    }

    @Transactional
    public Map<String, Object> verificarCorreo(String tokenStr) {
        return verificarCorreo(tokenStr, null);
    }

    @Transactional
    public Map<String, Object> verificarCorreo(String tokenOrCode, String emailOptional) {
        if (tokenOrCode == null || tokenOrCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código o token de verificación es obligatorio.");
        }

        String limpio = tokenOrCode.trim();
        TokenVerificacion tv = null;

        // Si el usuario ingresó el código de 4 dígitos
        if (limpio.matches("^\\d{4}$")) {
            if (emailOptional != null && !emailOptional.isBlank()) {
                Usuario u = usuarioRepository.findByEmailIgnoreCase(emailOptional.trim()).orElse(null);
                if (u != null) {
                    if (Boolean.TRUE.equals(u.getVerificado())) {
                        return Map.of(
                                "mensaje", "¡Verificación exitosa! Su correo electrónico ya ha sido verificado exitosamente.",
                                "email", u.getEmail(),
                                "verificado", true
                        );
                    }
                    tv = tokenRepository.findFirstByUsuarioAndCodigoAndUsadoFalseOrderByFechaCreacionDesc(u, limpio)
                            .orElseGet(() -> tokenRepository.findByUsuarioAndUsadoFalse(u).stream()
                                    .filter(t -> limpio.equals(t.getCodigo()) || (t.getToken() != null && t.getToken().startsWith(limpio + "-")))
                                    .findFirst()
                                    .orElse(null));
                }
            }
            if (tv == null) {
                tv = tokenRepository.findFirstByCodigoAndUsadoFalseOrderByFechaCreacionDesc(limpio).orElse(null);
            }
            if (tv == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El código de 4 dígitos es incorrecto o no coincide. Verifique su correo e intente nuevamente."
                );
            }
        } else {
            tv = tokenRepository.findByToken(limpio)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "El código o enlace de verificación no es válido o no existe."
                    ));
        }

        if (Boolean.TRUE.equals(tv.getUsado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Este código o enlace de verificación ya fue utilizado anteriormente."
            );
        }

        if (tv.getFechaExpiracion().isBefore(LocalDateTime.now(clockActual()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El código de verificación ha expirado. Solicite un nuevo código de 4 dígitos."
            );
        }

        tv.setUsado(true);
        tokenRepository.save(tv);

        Usuario u = tv.getUsuario();
        u.setVerificado(true);
        usuarioRepository.save(u);

        log.info("Cuenta verificada exitosamente para el usuario: {}", u.getEmail());

        return Map.of(
                "mensaje", "¡Verificación exitosa! Su correo electrónico ha sido verificado exitosamente. Ahora puede iniciar sesión.",
                "email", u.getEmail(),
                "verificado", true
        );
    }

    @Transactional
    public Map<String, Object> reenviarVerificacion(String emailInput) {
        String email = emailInput == null ? "" : emailInput.trim().toLowerCase();
        Usuario u = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No se encontró ninguna cuenta asociada a ese correo electrónico."
                ));

        if (Boolean.TRUE.equals(u.getVerificado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Esta cuenta ya se encuentra verificada. Puede iniciar sesión directamente."
            );
        }

        // Invalidar tokens anteriores no utilizados (garantiza que solo el último sea válido)
        List<TokenVerificacion> anteriores = tokenRepository.findByUsuarioAndUsadoFalse(u);
        for (TokenVerificacion ant : anteriores) {
            ant.setUsado(true);
        }
        tokenRepository.saveAll(anteriores);

        TokenVerificacion nuevoToken = crearNuevoToken(u);
        boolean enviadoPorSmtp = emailService.enviarCorreoVerificacion(u.getEmail(), u.getNombre(), nuevoToken.getToken());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("mensaje", "Se ha enviado un nuevo código de 4 dígitos a su correo electrónico.");
        resp.put("email", u.getEmail());
        resp.put("enviadoPorSmtp", enviadoPorSmtp);
        return resp;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();
        String rawPassword = req.getPassword() == null ? "" : req.getPassword();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);

        // Regla de seguridad (Requerimiento 3): Mismo mensaje genérico 401 si falla el correo o la contraseña
        if (usuario == null || !passwordEncoder.matches(rawPassword, usuario.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, GENERIC_LOGIN_ERROR);
        }

        // Regla de seguridad (Requerimiento 2 y 5): Si no está verificado, NO puede iniciar sesión (403 Forbidden)
        if (!Boolean.TRUE.equals(usuario.getVerificado())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Su cuenta aún no ha sido verificada. Por favor revise su correo electrónico y confirme su enlace antes de iniciar sesión."
            );
        }

        if (Boolean.FALSE.equals(usuario.getActivo())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Su cuenta se encuentra desactivada. Contacte al administrador del hotel."
            );
        }

        String jwt = jwtService.generateToken(usuario);
        String telefono = huespedRepository.findFirstByEmailIgnoreCase(usuario.getEmail())
                .map(Huesped::getTelefono)
                .orElse(null);
        log.info("Inicio de sesión exitoso: usuario={}, rol={}", usuario.getEmail(), usuario.getRol());

        return AuthResponse.builder()
                .token(jwt)
                .tipo("Bearer")
                .expiraEnMs(jwtService.getExpirationMs())
                .usuario(UsuarioResponse.fromEntity(usuario, telefono))
                .mensaje("Inicio de sesión exitoso.")
                .build();
    }

    public Map<String, Object> logout(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (!token.isEmpty()) {
                Claims claims = null;
                try {
                    claims = jwtService.parseClaims(token);
                } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ignored) {
                    // Token expirado o inválido: no se inserta en token_revocado
                }
                if (claims != null && claims.getExpiration() != null) {
                    tokenBlacklistService.revokeToken(token, claims.getExpiration());
                }
            }
        }
        return Map.of("mensaje", "Sesión cerrada correctamente. El token ha sido invalidado.");
    }

    @Transactional
    public Map<String, Object> cambiarPassword(Integer idUsuario, CambioPasswordRequest req) {
        if (idUsuario == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado.");
        }
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));

        if (!passwordEncoder.matches(req.getPasswordActual(), usuario.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual no es correcta. Verifica tus datos.");
        }

        if (req.getNuevaPassword() == null || req.getNuevaPassword().trim().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña debe tener al menos 8 caracteres.");
        }

        if (!req.getNuevaPassword().equals(req.getConfirmarPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La confirmación no coincide con la nueva contraseña.");
        }

        if (passwordEncoder.matches(req.getNuevaPassword(), usuario.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nueva contraseña debe ser diferente a la contraseña actual.");
        }

        usuario.setPasswordHash(passwordEncoder.encode(req.getNuevaPassword()));
        int versionActual = usuario.getTokenVersion() != null ? usuario.getTokenVersion() : 0;
        usuario.setTokenVersion(versionActual + 1);
        usuario = usuarioRepository.save(usuario);

        String nuevoToken = jwtService.generateToken(usuario);
        log.info("Contraseña actualizada y tokens previos revocados para idUsuario={}", usuario.getIdUsuario());

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("mensaje", "Contraseña actualizada exitosamente. Tu cuenta está protegida y las sesiones previas fueron revocadas.");
        respuesta.put("status", 200);
        if (nuevoToken != null) {
            respuesta.put("token", nuevoToken);
        }
        return respuesta;
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPerfilUsuario(Integer idUsuario) {
        if (idUsuario == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado.");
        }
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));
        String telefono = huespedRepository.findFirstByEmailIgnoreCase(usuario.getEmail())
                .map(Huesped::getTelefono)
                .orElse(null);
        return UsuarioResponse.fromEntity(usuario, telefono);
    }

    @Transactional
    public UsuarioResponse actualizarPerfil(Integer idUsuario, ActualizarPerfilRequest req) {
        if (idUsuario == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado.");
        }
        String nombreLimpio = req.getNombre() == null ? "" : req.getNombre().trim();
        String telefonoLimpio = req.getTelefono() == null ? "" : req.getTelefono().trim();

        if (nombreLimpio.isEmpty() || nombreLimpio.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre completo es obligatorio y no puede exceder 120 caracteres.");
        }
        if (!telefonoLimpio.matches("^\\d{10}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El teléfono debe contener exactamente 10 dígitos numéricos.");
        }

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));

        usuario.setNombre(nombreLimpio);
        usuario = usuarioRepository.save(usuario);

        String emailUsuario = usuario.getEmail();
        Huesped huesped = huespedRepository.findFirstByEmailIgnoreCase(emailUsuario).orElseGet(() -> {
            Huesped nuevoHuesped = new Huesped();
            nuevoHuesped.setEmail(emailUsuario);
            return nuevoHuesped;
        });
        huesped.setNombre(nombreLimpio);
        huesped.setTelefono(telefonoLimpio);
        huespedRepository.save(huesped);

        return UsuarioResponse.fromEntity(usuario, huesped.getTelefono());
    }

    @Transactional
    public Map<String, Object> solicitarRecuperacionPassword(String emailInput) {
        String email = emailInput == null ? "" : emailInput.trim().toLowerCase();
        Usuario usuario = email.isBlank() ? null : usuarioRepository.findByEmailIgnoreCase(email).orElse(null);

        if (usuario != null && !Boolean.FALSE.equals(usuario.getActivo()) && tokenRecuperacionRepository != null) {
            tokenRecuperacionRepository.invalidarActivosPorUsuario(usuario.getIdUsuario());

            String codigo6 = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            LocalDateTime ahora = LocalDateTime.now(clockActual());

            TokenRecuperacionPassword token = TokenRecuperacionPassword.builder()
                    .usuario(usuario)
                    .codigoHash(passwordEncoder.encode(codigo6))
                    .intentos(0)
                    .maxIntentos(TokenRecuperacionPassword.MAX_INTENTOS_POR_DEFECTO)
                    .usado(false)
                    .fechaCreacion(ahora)
                    .fechaExpiracion(ahora.plusMinutes(RECOVERY_OTP_EXPIRATION_MINUTES))
                    .build();
            tokenRecuperacionRepository.save(token);

            emailService.enviarCorreoRecuperacion(usuario.getEmail(), usuario.getNombre(), codigo6);
            log.info("Solicitud de recuperación procesada para idUsuario={}", usuario.getIdUsuario());
        } else {
            // Trabajo BCrypt equivalente para mantener tiempos de respuesta uniformes sin filtrar existencia de cuenta
            passwordEncoder.encode("000000");
        }

        return Map.of("mensaje", GENERIC_RECOVERY_MSG);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public Map<String, Object> restablecerPassword(RestablecerPasswordRequest req) {
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();
        String codigo = req.getCodigo() == null ? "" : req.getCodigo().trim();
        String nuevaPassword = req.getNuevaPassword() == null ? "" : req.getNuevaPassword();

        if (!nuevaPassword.matches(PASSWORD_POLICY_REGEX)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener entre 8 y 72 caracteres e incluir al menos una letra mayúscula, una minúscula y un número."
            );
        }
        if (req.getConfirmarPassword() != null && !req.getConfirmarPassword().isEmpty()
                && !nuevaPassword.equals(req.getConfirmarPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La confirmación no coincide con la nueva contraseña.");
        }

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email).orElse(null);
        TokenRecuperacionPassword token = (usuario != null && tokenRecuperacionRepository != null)
                ? tokenRecuperacionRepository.findTopByUsuarioIdUsuarioAndUsadoFalseOrderByFechaCreacionDesc(usuario.getIdUsuario()).orElse(null)
                : null;

        if (token == null) {
            passwordEncoder.encode("000000");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código de recuperación es inválido o ha expirado.");
        }

        LocalDateTime ahora = LocalDateTime.now(clockActual());
        if (Boolean.TRUE.equals(token.getUsado())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este código de recuperación ya fue utilizado o invalidado.");
        }
        if (token.getFechaExpiracion().isBefore(ahora)) {
            token.setUsado(true);
            tokenRecuperacionRepository.save(token);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código de recuperación ha expirado. Solicita uno nuevo.");
        }

        int maxIntentos = token.getMaxIntentos() != null ? token.getMaxIntentos() : TokenRecuperacionPassword.MAX_INTENTOS_POR_DEFECTO;
        int intentosPrevios = token.getIntentos() != null ? token.getIntentos() : 0;
        if (intentosPrevios >= maxIntentos) {
            token.setUsado(true);
            tokenRecuperacionRepository.save(token);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código fue invalidado tras superar el máximo de intentos. Solicita un nuevo código.");
        }

        if (!passwordEncoder.matches(codigo, token.getCodigoHash())) {
            int nuevoConteo = intentosPrevios + 1;
            token.setIntentos(nuevoConteo);
            if (nuevoConteo >= maxIntentos) {
                token.setUsado(true);
            }
            tokenRecuperacionRepository.save(token);
            String msg = (nuevoConteo >= maxIntentos)
                    ? "Código incorrecto. El código fue invalidado tras agotar los 5 intentos permitidos."
                    : "Código de recuperación incorrecto. Intento " + nuevoConteo + " de " + maxIntentos + ".";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
        }

        token.setUsado(true);
        tokenRecuperacionRepository.save(token);
        tokenRecuperacionRepository.invalidarActivosPorUsuario(usuario.getIdUsuario());

        usuario.setPasswordHash(passwordEncoder.encode(nuevaPassword));
        int versionActual = usuario.getTokenVersion() != null ? usuario.getTokenVersion() : 0;
        usuario.setTokenVersion(versionActual + 1);
        usuarioRepository.save(usuario);

        log.info("Contraseña restablecida y sesiones previas revocadas para idUsuario={}", usuario.getIdUsuario());

        return Map.of(
                "mensaje", "Tu contraseña ha sido restablecida exitosamente. Inicia sesión con tu nueva clave.",
                "status", 200
        );
    }

    private TokenVerificacion crearNuevoToken(Usuario u) {
        String codigo4Digitos = String.format("%04d", 1000 + SECURE_RANDOM.nextInt(9000));
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String tokenSeguro = codigo4Digitos + "-" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        LocalDateTime ahora = LocalDateTime.now(clockActual());
        TokenVerificacion tv = new TokenVerificacion();
        tv.setToken(tokenSeguro);
        tv.setCodigo(codigo4Digitos);
        tv.setUsuario(u);
        tv.setUsado(false);
        tv.setFechaCreacion(ahora);
        tv.setFechaExpiracion(ahora.plusMinutes(verificationExpirationMinutes));
        return tokenRepository.save(tv);
    }
}
