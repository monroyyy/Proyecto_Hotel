package com.ico.hotel.tools;

import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.TipoHabitacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TipoHabitacionTool {

    private final TipoHabitacionRepository tipoHabitacionRepository;

    @Tool(description = "Consultar el catálogo oficial de categorías o tipos de habitación (Individual, Doble, Matrimonial, Familiar, Suite) con su capacidad, precio base y descripción. Usar EXCLUSIVAMENTE cuando el huésped o recepcionista pregunte de forma explícita qué categorías, tipos de cuartos o clases de habitación existen en el hotel. ESTRICTAMENTE PROHIBIDO usar ante saludos, cortesía, preguntas generales, presupuestos o disponibilidad.")
    public List<java.util.Map<String, Object>> consultarCatalogoCategoriasHabitacion() {
        log.info("Tool invocada — consultarCatalogoCategoriasHabitacion");
        return tipoHabitacionRepository.findAll().stream()
                .map(t -> java.util.Map.<String, Object>of(
                        "categoria", t.getNombre(),
                        "capacidad", t.getCapacidad() != null ? t.getCapacidad() + " huéspedes" : "N/A",
                        "precioBasePorNoche", t.getPrecioBase() != null ? "$" + t.getPrecioBase() + " MXN" : "N/A",
                        "descripcion", t.getDescripcion() != null ? t.getDescripcion() : ""
                ))
                .toList();
    }

    @Tool(description = "Consultar el tipo de habitacion mas barato disponible en la cadena.")
    public TipoHabitacion getTipoMasBarato() {
        log.info("Tool invocada — getTipoMasBarato");
        return tipoHabitacionRepository.findFirstByOrderByPrecioBaseAsc();
    }

    @Tool(description = "Consultar el tipo de habitacion mas caro o exclusivo de la cadena.")
    public TipoHabitacion getTipoMasCaro() {
        log.info("Tool invocada — getTipoMasCaro");
        return tipoHabitacionRepository.findFirstByOrderByPrecioBaseDesc();
    }

    @Tool(description = "Buscar tipos de habitacion con un precio base menor o igual a cierta cantidad en pesos.")
    public List<TipoHabitacion> findTiposMasBaratosQue(
            @ToolParam(description = "Precio maximo tope en pesos, por ejemplo: 1500, 2000, 3000")
            Double precio) {
        log.info("Tool invocada — findTiposMasBaratosQue: precio={}", precio);
        return tipoHabitacionRepository.findTiposMasBaratosQue(BigDecimal.valueOf(precio));
    }

    @Tool(description = "Buscar tipos de habitacion con un precio base mayor o igual a cierta cantidad en pesos.")
    public List<TipoHabitacion> findTiposMasCarosQue(
            @ToolParam(description = "Precio minimo en pesos, por ejemplo: 1000, 2000, 3000")
            Double precio) {
        log.info("Tool invocada — findTiposMasCarosQue: precio={}", precio);
        return tipoHabitacionRepository.findTiposMasCarosQue(BigDecimal.valueOf(precio));
    }

    @Tool(description = "Buscar tipos de habitación para una capacidad específica de personas (por ejemplo: para 2 personas, 4 personas).")
    public List<TipoHabitacion> findTiposPorCapacidad(
            @ToolParam(description = "Número de personas / capacidad, por ejemplo: 2, 4")
            Integer capacidad) {
        log.info("Tool invocada — findTiposPorCapacidad: capacidad={}", capacidad);
        if (capacidad != null && capacidad == 2) {
            return tipoHabitacionRepository.findByCapacidad2();
        }
        return tipoHabitacionRepository.findAll().stream()
                .filter(t -> t.getCapacidad() != null && t.getCapacidad().equals(capacidad))
                .toList();
    }

    @Tool(description = "Obtener el precio promedio de las habitaciones en la cadena.")
    public Double getPrecioPromedio() {
        log.info("Tool invocada — getPrecioPromedio");
        return tipoHabitacionRepository.getPrecioPromedio();
    }

    @Tool(description = "Obtener la capacidad máxima de huéspedes alojable en una sola habitación.")
    public Integer getMaximaCapacidad() {
        log.info("Tool invocada — getMaximaCapacidad");
        return tipoHabitacionRepository.findMaximaCapacidad();
    }

    @Tool(description = "Obtener el conteo total de tipos o categorías de habitación existentes en la cadena hotelera.")
    public Long countTotalTipos() {
        log.info("Tool invocada — countTotalTipos");
        return tipoHabitacionRepository.count();
    }
}
