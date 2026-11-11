package com.ico.hotel.exceptions;

/**
 * Se lanza ante un conflicto de disponibilidad, concurrencia o ventana de tiempo vencida en una estancia (HTTP 409).
 */
public class ConflictoEstanciaException extends RuntimeException {
    public ConflictoEstanciaException(String message) {
        super(message);
    }
}
