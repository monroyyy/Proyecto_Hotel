package com.ico.hotel.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Contenedor estándar de respuesta paginada para endpoints REST.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginaResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
