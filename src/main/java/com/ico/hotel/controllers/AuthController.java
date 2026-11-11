package com.ico.hotel.controllers;

import com.ico.hotel.dto.auth.*;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.UsuarioRepository;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controlador de Autenticación, Registro, Verificación de Correo y Manejo de Sesiones.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@Valid @RequestBody RegistroRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(authService.registrar(request));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/verificar")
    public ResponseEntity<?> verificarGet(
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "codigo", required = false) String codigo,
            @RequestParam(value = "email", required = false) String email) {
        String valor = (codigo != null && !codigo.isBlank()) ? codigo : token;
        try {
            return ResponseEntity.ok(authService.verificarCorreo(valor, email));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/verificar")
    public ResponseEntity<?> verificarPost(
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestParam(value = "codigo", required = false) String codigoParam,
            @RequestParam(value = "email", required = false) String emailParam,
            @RequestBody(required = false) Map<String, String> body) {
        String token = (tokenParam != null && !tokenParam.isBlank())
                ? tokenParam
                : (codigoParam != null && !codigoParam.isBlank()
                    ? codigoParam
                    : (body != null ? (body.get("codigo") != null ? body.get("codigo") : body.get("token")) : null));
        String email = (emailParam != null && !emailParam.isBlank())
                ? emailParam
                : (body != null ? body.get("email") : null);
        try {
            return ResponseEntity.ok(authService.verificarCorreo(token, email));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/reenviar-verificacion")
    public ResponseEntity<?> reenviarVerificacion(@Valid @RequestBody ReenviarVerificacionRequest request) {
        try {
            return ResponseEntity.ok(authService.reenviarVerificacion(request.getEmail()));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (ResponseStatusException ex) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", ex.getReason());
            err.put("status", ex.getStatusCode().value());
            if (ex.getStatusCode() == HttpStatus.FORBIDDEN && ex.getReason() != null && ex.getReason().contains("verificada")) {
                err.put("requiereVerificacion", true);
            }
            return ResponseEntity.status(ex.getStatusCode()).body(err);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return ResponseEntity.ok(authService.logout(authHeader));
    }

    @PostMapping("/cambiar-password")
    public ResponseEntity<?> cambiarPassword(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CambioPasswordRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No autenticado.", "status", 401));
        }
        try {
            return ResponseEntity.ok(authService.cambiarPassword(principal.getIdUsuario(), request));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> obtenerPerfilActual(@AuthenticationPrincipal CustomUserDetails principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No autenticado.", "status", 401));
        }
        Usuario u = usuarioRepository.findById(principal.getIdUsuario())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado."));
        return ResponseEntity.ok(UsuarioResponse.fromEntity(u));
    }

    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of(
                "error", ex.getReason() != null ? ex.getReason() : "Error en la solicitud.",
                "status", ex.getStatusCode().value()
        ));
    }
}
