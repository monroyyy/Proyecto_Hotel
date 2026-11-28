package com.ico.hotel.services;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Ejecutor programado de expiración de pre-reservas, detección de No-Show y check-out automático.
 * Solo se instancia cuando {@code app.jobs.expiracion-enabled=true}.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.jobs.expiracion-enabled", havingValue = "true")
public class ReservaExpiracionJob {

    private final ReservaService reservaService;

    // Al iniciar el servidor, concilia de inmediato estancias pasadas y libera habitaciones
    @EventListener(ApplicationReadyEvent.class)
    public void ejecutarAlIniciar() {
        reservaService.expirarPreReservas();
    }

    // Ejecución periódica cada 2 minutos para liberar inventario vencido oportunamente
    @Scheduled(fixedRate = 2 * 60 * 1000)
    public void ejecutarExpiracionProgramada() {
        reservaService.expirarPreReservas();
    }
}
