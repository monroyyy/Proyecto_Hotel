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

    @Tool(description = "Buscar hoteles en una ciudad especifica o listar los hoteles disponibles.")
    public List<Hotel> findHotelesPorCiudad(
            @ToolParam(description = "Nombre de la ciudad, por ejemplo: Cancun, Guadalajara, Monterrey, Ciudad de Mexico")
            String ciudad) {
        log.info("Tool invocada — findHotelesPorCiudad: ciudad={}", ciudad);
        if (ciudad == null || ciudad.isBlank()) {
            return hotelRepository.findByActivoTrue();
        }
        return hotelRepository.findByCiudad(ciudad);
    }

    @Tool(description = "Obtener el total de habitaciones que tiene cada hotel en la cadena. Útil para preguntas como: ¿Cuántas habitaciones hay por ambos hoteles?")
    public List<Map<String, Object>> countTotalHabitacionesPorHotel() {
        log.info("Tool invocada — countTotalHabitacionesPorHotel");
        return hotelRepository.countTotalHabitacionesPorHotel();
    }
}
