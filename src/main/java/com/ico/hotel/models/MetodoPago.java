package com.ico.hotel.models;

import java.util.Locale;

/**
 * Catálogo canónico de métodos de pago aceptados para anticipos y liquidación de saldo.
 */
public enum MetodoPago {
    EFECTIVO,
    TARJETA_CREDITO,
    TARJETA_DEBITO,
    TRANSFERENCIA;

    public static MetodoPago desdeTexto(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Debe indicar el método de pago.");
        }
        String norm = raw.trim().toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        return switch (norm) {
            case "EFECTIVO" -> EFECTIVO;
            case "TRANSFERENCIA" -> TRANSFERENCIA;
            case "TARJETA_CREDITO", "TARJETA_DE_CREDITO", "CREDITO" -> TARJETA_CREDITO;
            case "TARJETA_DEBITO", "TARJETA_DE_DEBITO", "DEBITO" -> TARJETA_DEBITO;
            default -> throw new IllegalArgumentException(
                    "Método de pago no válido ('" + raw.trim() + "'). Use: EFECTIVO, TARJETA_CREDITO, TARJETA_DEBITO o TRANSFERENCIA."
            );
        };
    }
}
