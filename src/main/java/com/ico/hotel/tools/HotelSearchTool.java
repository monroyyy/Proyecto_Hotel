package com.ico.hotel.tools;

import com.ico.hotel.models.Hotel;
import com.ico.hotel.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class HotelSearchTool {

    private final HotelRepository hotelRepository;

    @Tool(description = "Listar todos los hoteles que están actualmente activos y registrados en la base de datos de la cadena hotelera (ej. Hotel Paraíso, Hotel Paraíso Ejecutivo, Hotel UAEM u otros hoteles nuevos). Útil para: ¿Cuáles son los hoteles activos?, ¿Qué hoteles tenemos?, ¿Cuáles hoteles existen?, mostrar hoteles.")
    public List<Hotel> getHotelesActivos() {
        log.info("Tool invocada — getHotelesActivos");
        return hotelRepository.findByActivoTrue();
    }

    @Tool(description = "Buscar hoteles en una ciudad específica. Útil para preguntas como: ¿Qué hoteles hay en Cancún?, ¿Qué hoteles tenemos en Ciudad de México?")
    public List<Hotel> findHotelesPorCiudad(
            @ToolParam(description = "Nombre de la ciudad, por ejemplo: Cancún o Ciudad de México")
            String ciudad) {
        log.info("Tool invocada — findHotelesPorCiudad: ciudad={}", ciudad);
        if (ciudad == null || ciudad.isBlank()) {
            return hotelRepository.findByActivoTrue();
        }
        return hotelRepository.findByCiudadIgnoreCaseAndActivoTrue(ciudad);
    }

    @Tool(description = "Obtener el total de habitaciones que tiene cada hotel en la cadena. Útil para preguntas como: ¿Cuántas habitaciones hay por cada hotel?")
    public List<Map<String, Object>> countTotalHabitacionesPorHotel() {
        log.info("Tool invocada — countTotalHabitacionesPorHotel");
        return hotelRepository.countTotalHabitacionesPorHotelActivos();
    }
}
