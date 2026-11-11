package com.ico.hotel.exceptions;

/**
 * Se lanza cuando no se cumplen las precondiciones operativas de check-in, check-out o no-show (HTTP 400).
 */
public class ReglaEstanciaException extends RuntimeException {
    public ReglaEstanciaException(String message) {
        super(message);
    }
}
