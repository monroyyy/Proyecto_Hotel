package com.ico.hotel.exceptions;

/**
 * Se lanza cuando se intenta una transición no permitida en la máquina de estados de una reservación (HTTP 409).
 */
public class TransicionEstadoInvalidaException extends RuntimeException {
    public TransicionEstadoInvalidaException(String message) {
        super(message);
    }
}
