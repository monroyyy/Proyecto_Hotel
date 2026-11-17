package com.ico.hotel.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Habilita la programación automática (@Scheduled) para tareas de mantenimiento
 * (limpieza de tokens revocados y cubetas vencidas del limitador).
 * El job de expiración de reservaciones se controla de forma independiente en ReservaExpiracionJob.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
