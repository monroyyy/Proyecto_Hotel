package com.ico.hotel.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * Configuración central de Spring Security con JWT stateless, BCrypt y control de acceso por rol.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // CORS * universal compatible con credentials/Bearer JWT (refleja el origen dinámicamente)
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                            Object customError = request.getAttribute("jwt_error");
                            String msg = customError != null
                                    ? customError.toString()
                                    : "No autenticado. Debe iniciar sesión y enviar un token JWT válido.";
                            response.getWriter().write("{\"error\":\"" + escapeJson(msg) + "\",\"status\":401}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                            response.getWriter().write("{\"error\":\"Acceso denegado. No tiene permisos suficientes para realizar esta operación.\",\"status\":403}");
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Endpoints públicos de autenticación
                        .requestMatchers(
                                "/api/auth/registro",
                                "/api/auth/verificar",
                                "/api/auth/reenviar-verificacion",
                                "/api/auth/login",
                                "/api/auth/recuperar-password",
                                "/api/auth/restablecer-password",
                                "/error"
                        ).permitAll()
                        // Endpoints de sesión autenticada
                        .requestMatchers("/api/auth/me", "/api/auth/logout", "/api/auth/cambiar-password")
                        .hasAnyRole("HUESPED", "RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")

                        // Catálogo público de lectura (modo visitante y huéspedes)
                        .requestMatchers(HttpMethod.GET, "/api/hoteles", "/api/hoteles/*")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/tipos-habitacion", "/api/tipos-habitacion/*")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/habitaciones", "/api/habitaciones/*")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/recepcionistas")
                        .hasAnyRole("HUESPED", "RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")

                        // Dashboard de estadísticas e Informes ejecutivos (Gerente y Administrador)
                        .requestMatchers("/api/dashboard", "/api/dashboard/**")
                        .hasAnyRole("GERENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/informes", "/api/informes/**")
                        .hasAnyRole("GERENTE", "ADMINISTRADOR")

                        // Reservaciones:
                        // - Confirmar anticipo 50% y ciclo operativo (Check-in, Check-out, No-Show): Recepcionista, Gerente y Administrador
                        .requestMatchers(HttpMethod.PATCH,
                                "/api/reservas/*/confirmar",
                                "/api/reservas/*/check-in",
                                "/api/reservas/*/check-out",
                                "/api/reservas/*/no-show")
                        .hasAnyRole("RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")
                        // - Reversión de No-Show: exclusivo de Gerente y Administrador
                        .requestMatchers(HttpMethod.PATCH, "/api/reservas/*/revertir-no-show")
                        .hasAnyRole("GERENTE", "ADMINISTRADOR")
                        // - Eliminación física: Administrador
                        .requestMatchers(HttpMethod.DELETE, "/api/reservas", "/api/reservas/**")
                        .hasRole("ADMINISTRADOR")
                        // - Resumen operativo por estado: exclusivo de personal del hotel
                        .requestMatchers(HttpMethod.GET, "/api/reservas/resumen-estados")
                        .hasAnyRole("RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")
                        // - Consultar y operar reservaciones: Todos los roles autenticados (validación de propiedad en servicio)
                        .requestMatchers("/api/reservas", "/api/reservas/**")
                        .hasAnyRole("HUESPED", "RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")

                        // Habitaciones:
                        // - Cambio de estado rápido / desocupación: Recepcionista, Gerente y Administrador
                        .requestMatchers(HttpMethod.PATCH, "/api/habitaciones/*/estado")
                        .hasAnyRole("RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/habitaciones/notificaciones-desocupacion", "/api/habitaciones/*/dia-extra")
                        .hasAnyRole("RECEPCIONISTA", "GERENTE", "ADMINISTRADOR", "HUESPED")
                        // - CRUD maestro de habitaciones: Gerente y Administrador
                        .requestMatchers("/api/habitaciones", "/api/habitaciones/**")
                        .hasAnyRole("GERENTE", "ADMINISTRADOR")

                        // Catálogo de Huéspedes (mostrador): Recepcionista, Gerente y Administrador
                        .requestMatchers("/api/huespedes", "/api/huespedes/**")
                        .hasAnyRole("RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")

                        // Asistente de IA: todos los roles autenticados (con filtrado interno por rol)
                        .requestMatchers("/api/v1/chat", "/api/v1/chat/**")
                        .hasAnyRole("HUESPED", "RECEPCIONISTA", "GERENTE", "ADMINISTRADOR")

                        // Gestión de infraestructura y catálogos maestros
                        .requestMatchers("/api/hoteles", "/api/hoteles/**", "/api/tipos-habitacion", "/api/tipos-habitacion/**")
                        .hasAnyRole("GERENTE", "ADMINISTRADOR")

                        // Exclusivo de ADMINISTRADOR (TI / Backend):
                        .requestMatchers("/api/consultas", "/api/consultas/**")
                        .hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/usuarios", "/api/usuarios/**")
                        .hasRole("ADMINISTRADOR")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private String escapeJson(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
