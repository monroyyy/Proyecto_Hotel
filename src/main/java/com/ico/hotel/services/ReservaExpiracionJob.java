package com.ico.hotel.services;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Ejecutor programado de expiración de pre-reservas y detección de No-Show.
 * Solo se instancia cuando {@code app.jobs.expiracion-enabled=true}.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.jobs.expiracion-enabled", havingValue = "true")
public class ReservaExpiracionJob {

    private final ReservaService reservaService;

    @Scheduled(fixedRate = 5 * 60 * 1000)
    public void ejecutarExpiracionProgramada() {
        reservaService.expirarPreReservas();
    }
}
