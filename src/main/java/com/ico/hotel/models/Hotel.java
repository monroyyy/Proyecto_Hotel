package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@Entity
@Table(name = "hotel", uniqueConstraints = {
        @UniqueConstraint(name = "uk_hotel_email", columnNames = "email"),
        @UniqueConstraint(name = "uk_hotel_telefono", columnNames = "telefono")
})
public class Hotel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_hotel")
    private Integer idHotel;

    @Column(nullable = false)
    private String nombre;

    private String direccion;
    private String ciudad;

    @Column(nullable = false)
    private String telefono;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private Boolean activo;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    @Column(name = "tag_editorial", length = 60)
    private String tagEditorial;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitud;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitud;
}
