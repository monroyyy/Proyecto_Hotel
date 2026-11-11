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
@Table(name = "reserva", uniqueConstraints = {
        @UniqueConstraint(name = "uk_reserva_folio", columnNames = "folio")
})
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

    @Column(nullable = false)
    private String folio;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_huesped", nullable = false)
    private Huesped huesped;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_habitacion", nullable = false)
    private Habitacion habitacion;

    @Column(nullable = false)
    private LocalDate fechaEntrada;

    @Column(nullable = false)
    private LocalDate fechaSalida;
    private Integer noches;
    private Integer adultos;
    private Integer ninos;

    private Boolean cuna;
    private Boolean camaExtra;
    private Boolean plantaBajaSolicitada;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(nullable = false)
    private String estado;

    @Column(nullable = false)
    private BigDecimal total;

    @Column(nullable = false)
    private BigDecimal anticipo;

    @Column(nullable = false)
    private BigDecimal saldo;
    private String metodoPago;

    @Column(name = "check_in_at")
    private LocalDateTime checkInAt;

    @Column(name = "check_out_at")
    private LocalDateTime checkOutAt;

    @Column(name = "metodo_pago_saldo")
    private String metodoPagoSaldo;

    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaExpiracion;
    private String recepcionista;

    // Datos de cancelación / reembolso
    private LocalDateTime fechaCancelacion;
    private BigDecimal montoReembolso;
    private String titularReembolso;
    private String bancoReembolso;
    private String clabeReembolso;
    private String motivoCancelacion;
    private String reembolsoAutorizadoPor;

    // Metadatos transitorios para día extra y avisos de desocupación
    @Transient
    private Boolean diaExtraDisponible;

    @Transient
    private BigDecimal costoDiaExtra;

    @Transient
    private LocalDate nuevaFechaSalidaSugerida;

    @Transient
    private Boolean porDesocuparse;

    @Transient
    private Long horasParaDesocupar;

    @Transient
    private Boolean salidaPendiente;
}
