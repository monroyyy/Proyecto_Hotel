package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@Entity
@Table(name = "habitacion", uniqueConstraints = {
        @UniqueConstraint(name = "uk_habitacion_hotel_numero", columnNames = {"id_hotel", "numero"})
})
public class Habitacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_habitacion")
    private Integer idHabitacion;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_hotel", nullable = false)
    private Hotel hotel;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_tipo", nullable = false)
    private TipoHabitacion tipoHabitacion;

    @Column(nullable = false)
    private String numero;

    @Column(nullable = false)
    private Integer piso;

    @Column(nullable = false)
    private String estado;

    @Transient
    private LocalDate fechaOcupacionInicio;

    @Transient
    private LocalDate fechaOcupacionFin;

    @Transient
    private Boolean ocupadaHoy;

    @Transient
    private String estadoReservaActiva;

    @Transient
    private String folioActivo;

    @Transient
    private Integer idReservaActiva;

    @Transient
    private Boolean diaExtraDisponible;

    @Transient
    private java.math.BigDecimal costoDiaExtra;

    @Transient
    private LocalDate nuevaFechaDesocupacion;

    @Transient
    private List<Map<String, Object>> periodosOcupados;
}
