package com.ico.hotel.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Datos enviados por el recepcionista para registrar una reservaciÃ³n. */
@Data
@NoArgsConstructor
public class ReservaRequest {
    private String folio;
    private Integer idHabitacion;
    private LocalDate fechaEntrada;
    private LocalDate fechaSalida;
    private Integer adultos;
    private Integer ninos;
    private Boolean cuna;
    private Boolean camaExtra;
    private Boolean plantaBajaSolicitada;
    private String observaciones;

    // Huésped
    private Integer idHuesped;
    private String nombre;
    private String telefono;
    private String email;

    /** "PRE_RESERVA" o "CONFIRMADA" (con anticipo). */
    private String modalidad;
    /** Vigencia de la pre-reserva: 24 o 48 horas. */
    private Integer horasVigencia;
    private BigDecimal anticipo;
    private String metodoPago;
    private String recepcionista;
}

