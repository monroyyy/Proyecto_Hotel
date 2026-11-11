package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Huésped que realiza una reservación (RF-02). */
@Data
@NoArgsConstructor
@Entity
@Table(name = "huesped", uniqueConstraints = {
        @UniqueConstraint(name = "uk_huesped_email", columnNames = "email")
})
public class Huesped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_huesped")
    private Integer idHuesped;

    @Column(nullable = false)
    private String nombre;

    private String telefono;

    @Column(nullable = false)
    private String email;
}
