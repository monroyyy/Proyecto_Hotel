package com.ico.hotel.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Habilita la programación automática (@Scheduled) únicamente cuando
 * app.jobs.expiracion-enabled=true (por defecto false).
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.jobs.expiracion-enabled", havingValue = "true")
public class SchedulingConfig {
}
