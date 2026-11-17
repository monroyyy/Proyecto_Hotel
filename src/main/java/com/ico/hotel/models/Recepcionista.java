package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @deprecated Catálogo legado conservado por compatibilidad sin borrar la tabla;
 *             las reservaciones nuevas asignan {@code recepcionista} desde el JWT/origen en servidor.
 */
@Deprecated(forRemoval = false)
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
