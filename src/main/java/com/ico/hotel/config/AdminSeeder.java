package com.ico.hotel.config;

import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Crea de forma segura e idempotente las cuentas iniciales de los roles del sistema:
 * - ADMINISTRADOR (TI y gestión central)
 * - GERENTE (Don Roberto: Dashboard, estadísticas, cálculos e informes)
 * - RECEPCIONISTA (Javier: Mostrador, reservaciones, check-in/out)
 * - HUESPED (Huésped de pruebas)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-name:Administrador General}")
    private String adminName;

    @Value("${app.admin.initial-email:admin@hotelparaiso.com}")
    private String adminEmail;

    @Value("${app.admin.initial-password:Admin1234!}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        // 1. Administrador General
        asegurarUsuario(adminName, adminEmail, adminPassword, Rol.ADMINISTRADOR);

        // 2. Gerente General (Don Roberto)
        asegurarUsuario("Don Roberto (Gerente General)", "gerente@hotelparaiso.com", "Gerente1234!", Rol.GERENTE);

        // 3. Recepcionista de Mostrador (Javier)
        asegurarUsuario("Javier Morales (Recepcionista)", "recepcion@hotelparaiso.com", "Recep1234!", Rol.RECEPCIONISTA);

        // 4. Huésped de Pruebas
        asegurarUsuario("Jorge Monroy (Huésped)", "huesped@hotelparaiso.com", "Huesped1234!", Rol.HUESPED);
    }

    private void asegurarUsuario(String nombre, String email, String password, Rol rol) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }

        String normalizedEmail = email.trim().toLowerCase();
        var existente = usuarioRepository.findByEmailIgnoreCase(normalizedEmail);

        if (existente.isEmpty()) {
            Usuario u = new Usuario();
            u.setNombre(nombre.trim());
            u.setEmail(normalizedEmail);
            u.setPasswordHash(passwordEncoder.encode(password));
            u.setRol(rol);
            u.setVerificado(true);
            u.setActivo(true);
            u.setFechaCreacion(LocalDateTime.now());
            usuarioRepository.save(u);
            log.info("AdminSeeder: Usuario creado ({}) -> {}", rol, normalizedEmail);
        } else {
            Usuario u = existente.get();
            boolean changed = false;
            if (u.getRol() != rol) {
                u.setRol(rol);
                changed = true;
            }
            if (u.getNombre() == null || u.getNombre().isBlank()
                    || (rol != Rol.ADMINISTRADOR && "Administrador General".equalsIgnoreCase(u.getNombre().trim()))) {
                u.setNombre(nombre.trim());
                changed = true;
            }
            if (!Boolean.TRUE.equals(u.getVerificado())) {
                u.setVerificado(true);
                changed = true;
            }
            if (Boolean.FALSE.equals(u.getActivo())) {
                u.setActivo(true);
                changed = true;
            }
            if (changed) {
                usuarioRepository.save(u);
                log.info("AdminSeeder: Usuario actualizado ({}) -> {}", rol, normalizedEmail);
            }
        }
    }
}
