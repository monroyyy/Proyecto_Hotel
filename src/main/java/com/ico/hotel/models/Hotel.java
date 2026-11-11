package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}
