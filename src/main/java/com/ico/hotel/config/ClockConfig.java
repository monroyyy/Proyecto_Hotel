package com.ico.hotel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Reloj central del sistema fijado a la zona horaria oficial de la cadena (America/Mexico_City).
 */
@Configuration
public class ClockConfig {

    public static final ZoneId ZONA_MEXICO = ZoneId.of("America/Mexico_City");

    @Bean
    public Clock hotelClock() {
        return Clock.system(ZONA_MEXICO);
    }
}
