package com.ico.hotel.config;

import org.springframework.context.annotation.Configuration;

/**
 * La configuración de CORS ahora está centralizada e integrada en SecurityConfig
 * (CorsConfigurationSource) para cubrir tanto preflight OPTIONS como respuestas 401/403 de Spring Security.
 */
@Configuration
public class CorsConfig {
}
