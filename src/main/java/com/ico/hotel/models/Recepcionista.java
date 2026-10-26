package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Recepcionista que registra reservaciones (ver docs/01_notas_entrevista.md). */
@Data
@NoArgsConstructor
@Entity
@Table(name = "recepcionista")
public class Recepcionista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_recepcionista")
    private Integer idRecepcionista;

    private String nombre;
    private Boolean activo = true;
}
