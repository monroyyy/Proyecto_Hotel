package com.ico.hotel.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Objeto de Transferencia de Datos (DTO) para la entidad Habitación.
 * Simplifica la recepción de datos enviados desde el formulario del Frontend,
 * permitiendo asociar las llaves foráneas de Hotel y Tipo de Habitación de forma directa.
 */
@Data
@NoArgsConstructor
public class HabitacionDTO {

    private Integer idHabitacion;
    private Integer idHotel;
    private Integer idTipo;
    private String numero;
    private Integer piso;
    private String estado;
}
