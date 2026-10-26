package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Reservación de una habitación.
 * Estados: Pre-reserva, Confirmada, Ocupada, Finalizada, Cancelada, No-Show.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "reserva")
public class Reserva {

    public static final String PRE_RESERVA = "Pre-reserva";
    public static final String CONFIRMADA = "Confirmada";
    public static final String OCUPADA = "Ocupada";
    public static final String FINALIZADA = "Finalizada";
    public static final String CANCELADA = "Cancelada";
    public static final String NO_SHOW = "No-Show";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reserva")
    private Integer idReserva;

    private String folio;

    @ManyToOne
    @JoinColumn(name = "id_huesped")
    private Huesped huesped;

    @ManyToOne
    @JoinColumn(name = "id_habitacion")
    private Habitacion habitacion;

    private LocalDate fechaEntrada;
    private LocalDate fechaSalida;
    private Integer noches;
    private Integer adultos;
    private Integer ninos;

    private Boolean cuna;
    private Boolean camaExtra;
    private Boolean plantaBajaSolicitada;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    private String estado;

    private BigDecimal total;
    private BigDecimal anticipo;
    private BigDecimal saldo;
    private String metodoPago;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaExpiracion;
    private String recepcionista;

    // Datos de cancelación / reembolso
    private LocalDateTime fechaCancelacion;
    private BigDecimal montoReembolso;
    private String titularReembolso;
    private String bancoReembolso;
    private String clabeReembolso;
}
