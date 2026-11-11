package com.ico.hotel.controllers;

import com.ico.hotel.dto.auth.UsuarioResponse;
import com.ico.hotel.models.Rol;
import com.ico.hotel.models.TokenVerificacion;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.TokenVerificacionRepository;
import com.ico.hotel.repository.UsuarioRepository;
import com.ico.hotel.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador exclusivo para ADMINISTRADOR: gestión completa de cuentas de usuario
 * (creación, edición de datos, cambio de rol/estado y eliminación).
 */
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final TokenVerificacionRepository tokenVerificacionRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public List<UsuarioResponse> listarUsuarios() {
        List<Usuario> lista = usuarioRepository.findAllByOrderByFechaCreacionDesc();
        return lista.stream()
                .map(UsuarioResponse::fromEntity)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> crearUsuarioDesdeAdmin(@RequestBody Map<String, Object> body) {
        String nombre = body.get("nombre") != null ? String.valueOf(body.get("nombre")).trim() : "";
        String email = body.get("email") != null ? String.valueOf(body.get("email")).trim().toLowerCase() : "";
        String password = body.get("password") != null ? String.valueOf(body.get("password")) : "";
        String rolStr = body.get("rol") != null ? String.valueOf(body.get("rol")).trim().toUpperCase() : "HUESPED";
        boolean verificado = body.get("verificado") == null || Boolean.parseBoolean(String.valueOf(body.get("verificado")));
        boolean activo = body.get("activo") == null || Boolean.parseBoolean(String.valueOf(body.get("activo")));

        if (nombre.isBlank() || email.isBlank() || password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Nombre, correo válido y contraseña de al menos 8 caracteres son obligatorios."
            ));
        }

        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Ya existe un usuario registrado con ese correo electrónico."
            ));
        }

        Rol rol;
        try {
            rol = Rol.valueOf(rolStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rol inválido. Valores permitidos: HUESPED, RECEPCIONISTA, GERENTE, ADMINISTRADOR."));
        }

        Usuario nuevo = Usuario.builder()
                .nombre(nombre)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .rol(rol)
                .verificado(verificado)
                .activo(activo)
                .build();

        usuarioRepository.save(nuevo);
        return ResponseEntity.status(HttpStatus.CREATED).body(UsuarioResponse.fromEntity(nuevo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails adminActual) {

        Usuario u = usuarioRepository.findById(id).orElse(null);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Usuario no encontrado."));
        }

        boolean esMismoAdmin = adminActual != null && adminActual.getIdUsuario().equals(id);

        if (body.containsKey("nombre")) {
            String nuevoNombre = String.valueOf(body.get("nombre")).trim();
            if (nuevoNombre.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El nombre del usuario no puede estar vacío."));
            }
            u.setNombre(nuevoNombre);
        }

        if (body.containsKey("email")) {
            String nuevoEmail = String.valueOf(body.get("email")).trim().toLowerCase();
            if (nuevoEmail.isBlank() || !nuevoEmail.contains("@")) {
                return ResponseEntity.badRequest().body(Map.of("error", "El correo electrónico no tiene un formato válido."));
            }
            if (!nuevoEmail.equalsIgnoreCase(u.getEmail()) && usuarioRepository.existsByEmailIgnoreCase(nuevoEmail)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "Ese correo electrónico ya pertenece a otra cuenta registrada."
                ));
            }
            u.setEmail(nuevoEmail);
        }

        if (body.containsKey("rol") && body.get("rol") != null) {
            String rolStr = String.valueOf(body.get("rol")).trim().toUpperCase();
            Rol nuevoRol;
            try {
                nuevoRol = Rol.valueOf(rolStr);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Rol inválido."));
            }
            if (esMismoAdmin && nuevoRol != Rol.ADMINISTRADOR) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puede quitarse a sí mismo el rol de ADMINISTRADOR."));
            }
            u.setRol(nuevoRol);
        }

        if (body.containsKey("verificado") && body.get("verificado") != null) {
            boolean nuevoVerificado = Boolean.parseBoolean(String.valueOf(body.get("verificado")));
            if (esMismoAdmin && !nuevoVerificado) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puede desverificar su propia cuenta de administrador."));
            }
            u.setVerificado(nuevoVerificado);
        }

        if (body.containsKey("activo") && body.get("activo") != null) {
            boolean nuevoActivo = Boolean.parseBoolean(String.valueOf(body.get("activo")));
            if (esMismoAdmin && !nuevoActivo) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puede desactivar su propia cuenta de administrador."));
            }
            u.setActivo(nuevoActivo);
        }

        if (body.containsKey("password") && body.get("password") != null) {
            String nuevaPass = String.valueOf(body.get("password"));
            if (!nuevaPass.isBlank()) {
                if (nuevaPass.length() < 8) {
                    return ResponseEntity.badRequest().body(Map.of("error", "La nueva contraseña debe tener al menos 8 caracteres."));
                }
                u.setPasswordHash(passwordEncoder.encode(nuevaPass));
            }
        }

        usuarioRepository.save(u);
        return ResponseEntity.ok(UsuarioResponse.fromEntity(u));
    }

    @PatchMapping("/{id}/rol")
    public ResponseEntity<?> cambiarRol(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails adminActual) {

        String nuevoRolStr = body.get("rol");
        if (nuevoRolStr == null || nuevoRolStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'rol' es obligatorio (HUESPED, RECEPCIONISTA, GERENTE o ADMINISTRADOR)."));
        }

        Rol nuevoRol;
        try {
            nuevoRol = Rol.valueOf(nuevoRolStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rol inválido. Valores permitidos: HUESPED, RECEPCIONISTA, GERENTE, ADMINISTRADOR."));
        }

        Usuario u = usuarioRepository.findById(id).orElse(null);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Usuario no encontrado."));
        }

        if (adminActual != null && adminActual.getIdUsuario().equals(id) && nuevoRol != Rol.ADMINISTRADOR) {
            return ResponseEntity.badRequest().body(Map.of("error", "No puede quitarse a sí mismo el rol de ADMINISTRADOR."));
        }

        u.setRol(nuevoRol);
        usuarioRepository.save(u);
        return ResponseEntity.ok(UsuarioResponse.fromEntity(u));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(
            @PathVariable Integer id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal CustomUserDetails adminActual) {

        Boolean activo = body.get("activo");
        Boolean verificado = body.get("verificado");

        Usuario u = usuarioRepository.findById(id).orElse(null);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Usuario no encontrado."));
        }

        if (adminActual != null && adminActual.getIdUsuario().equals(id)) {
            if (Boolean.FALSE.equals(activo)) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puede desactivar su propia cuenta de administrador."));
            }
            if (Boolean.FALSE.equals(verificado)) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puede desverificar su propia cuenta de administrador."));
            }
        }

        if (activo != null) {
            u.setActivo(activo);
        }
        if (verificado != null) {
            u.setVerificado(verificado);
        }

        usuarioRepository.save(u);
        return ResponseEntity.ok(UsuarioResponse.fromEntity(u));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> eliminarUsuario(
            @PathVariable Integer id,
            @AuthenticationPrincipal CustomUserDetails adminActual) {

        Usuario u = usuarioRepository.findById(id).orElse(null);
        if (u == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Usuario no encontrado."));
        }

        if (adminActual != null && adminActual.getIdUsuario().equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Por seguridad, no puede eliminar su propia cuenta de administrador en sesión."));
        }

        List<TokenVerificacion> tokens = tokenVerificacionRepository.findByUsuario(u);
        if (!tokens.isEmpty()) {
            tokenVerificacionRepository.deleteAll(tokens);
        }

        usuarioRepository.delete(u);
        return ResponseEntity.ok(Map.of("mensaje", "Usuario eliminado correctamente."));
    }
}
