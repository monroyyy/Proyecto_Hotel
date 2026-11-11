package com.ico.hotel.models;

import com.ico.hotel.exceptions.TransicionEstadoInvalidaException;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Máquina de estados oficial para el ciclo de vida de una reservación.
 * Mantiene compatibilidad exacta con las etiquetas de texto almacenadas en BD.
 */
public enum EstadoReserva {

    PRE_RESERVA(Reserva.PRE_RESERVA),
    CONFIRMADA(Reserva.CONFIRMADA),
    OCUPADA(Reserva.OCUPADA),
    FINALIZADA(Reserva.FINALIZADA),
    NO_SHOW(Reserva.NO_SHOW),
    CANCELADA(Reserva.CANCELADA);

    private static final Map<EstadoReserva, Set<EstadoReserva>> TRANSICIONES_PERMITIDAS = new EnumMap<>(EstadoReserva.class);

    static {
        TRANSICIONES_PERMITIDAS.put(PRE_RESERVA, EnumSet.of(CONFIRMADA, CANCELADA));
        TRANSICIONES_PERMITIDAS.put(CONFIRMADA, EnumSet.of(OCUPADA, NO_SHOW, CANCELADA));
        TRANSICIONES_PERMITIDAS.put(OCUPADA, EnumSet.of(FINALIZADA));
        TRANSICIONES_PERMITIDAS.put(NO_SHOW, EnumSet.of(CONFIRMADA));
        TRANSICIONES_PERMITIDAS.put(FINALIZADA, EnumSet.noneOf(EstadoReserva.class));
        TRANSICIONES_PERMITIDAS.put(CANCELADA, EnumSet.noneOf(EstadoReserva.class));
    }

    private final String valor;

    EstadoReserva(String valor) {
        this.valor = valor;
    }

    public String getValor() {
        return valor;
    }

    public boolean puedeTransicionarA(EstadoReserva destino) {
        if (destino == null) return false;
        return TRANSICIONES_PERMITIDAS.getOrDefault(this, Set.of()).contains(destino);
    }

    /**
     * Valida que la transición hacia {@code destino} esté permitida; en caso contrario lanza
     * {@link TransicionEstadoInvalidaException} (mapeada a HTTP 409 Conflict).
     */
    public void validarTransicion(EstadoReserva destino) {
        if (destino == null || !puedeTransicionarA(destino)) {
            String destStr = destino != null ? destino.getValor() : "desconocido";
            throw new TransicionEstadoInvalidaException(
                    "Transición de estado no permitida: no se puede pasar de '" + this.valor + "' a '" + destStr + "'."
            );
        }
    }

    public static EstadoReserva desdeTexto(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new TransicionEstadoInvalidaException("El estado actual de la reservación es inválido o está vacío.");
        }
        String limpio = texto.trim();
        for (EstadoReserva e : values()) {
            if (e.valor.equalsIgnoreCase(limpio) || e.name().equalsIgnoreCase(limpio)) {
                return e;
            }
        }
        throw new TransicionEstadoInvalidaException("Estado de reservación desconocido: '" + texto + "'.");
    }
}
