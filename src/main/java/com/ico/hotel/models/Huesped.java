package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Huésped que realiza una reservación (RF-02). */
@Data
@NoArgsConstructor
@Entity
@Table(name = "huesped")
public class Huesped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_huesped")
    private Integer idHuesped;

    private String nombre;
    private String telefono;
    private String email;
}
