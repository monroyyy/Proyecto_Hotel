package com.ico.hotel.tools;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.repository.HabitacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class HabitacionSearchTool {

    private final HabitacionRepository habitacionRepository;

    @Tool(description = "Buscar habitaciones disponibles en un hotel especifico por el nombre del hotel.")
    public List<Habitacion> findDisponiblesEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo")
            String nombreHotel) {
        log.info("Tool invocada — findDisponiblesEnHotel: hotel={}", nombreHotel);
        return habitacionRepository.findDisponiblesEnHotel(nombreHotel);
    }

    @Tool(description = "Listar todas las habitaciones de un hotel especifico, sin importar su estado (Disponible, Ocupada o Mantenimiento). Útil para preguntas como: ¿Qué habitaciones tiene el Hotel Paraíso?")
    public List<Habitacion> findHabitacionesPorHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo")
            String nombreHotel) {
        log.info("Tool invocada — findHabitacionesPorHotel: hotel={}", nombreHotel);
        return habitacionRepository.findByHotelNombre(nombreHotel);
    }

    @Tool(description = "Listar las habitaciones que están en mantenimiento en todos los hoteles de la cadena. Útil para preguntas como: ¿Qué habitaciones están en mantenimiento? revisa en ambos hoteles.")
    public List<Habitacion> findHabitacionesEnMantenimiento() {
        log.info("Tool invocada — findHabitacionesEnMantenimiento");
        return habitacionRepository.findByEstado("Mantenimiento");
    }

    @Tool(description = "Listar las habitaciones que están en mantenimiento en un hotel especifico. Útil para preguntas como: Dame las habitaciones en mantenimiento de un hotel en específico.")
    public List<Habitacion> findMantenimientoEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo")
            String nombreHotel) {
        log.info("Tool invocada — findMantenimientoEnHotel: hotel={}", nombreHotel);
        return habitacionRepository.findByEstadoAndHotelNombre("Mantenimiento", nombreHotel);
    }

    @Tool(description = "Consultar el estado o estatus actual (Disponible, Ocupada o Mantenimiento) y detalles de una habitación por su número. Si no se especifica el hotel, busca en ambos hoteles de la cadena (Hotel Paraíso y Hotel Paraíso Ejecutivo). Útil para: ¿Qué estatus tiene la habitación 101?, Muéstrame la habitación 101, etc. Si se encuentran coincidencias en ambos hoteles, genera los botones de selección [BOTON: ...].")
    public List<Habitacion> findEstadoHabitacionEnHotel(
            @ToolParam(description = "Número de la habitación, por ejemplo: 101, 202, 301")
            String numero,
            @ToolParam(description = "Nombre del hotel. Si no se especifica o el usuario no indicó el hotel, déjelo vacío para buscar en toda la cadena.")
            String nombreHotel) {
        log.info("Tool invocada — findEstadoHabitacionEnHotel: numero={}, hotel={}", numero, nombreHotel);
        if (nombreHotel == null || nombreHotel.isBlank()) {
            return habitacionRepository.findByNumero(numero);
        }
        return habitacionRepository.findByNumeroAndHotelNombre(numero, nombreHotel);
    }

    @Tool(description = "Obtener la habitación más cara o exclusiva de toda la cadena hotelera, incluyendo hotel, número, tipo y precio por noche.")
    public List<Habitacion> findHabitacionMasCara() {
        log.info("Tool invocada — findHabitacionMasCara");
        return soloLaPrimera(habitacionRepository.findOrdenadasPorPrecioDesc());
    }

    @Tool(description = "Obtener la habitación más cara o exclusiva de un hotel en específico, o de toda la cadena si no se menciona un hotel. Útil para: ¿Cuál es la habitación más cara del hotel?, ¿Cuál es la habitación más cara del Hotel Paraíso?")
    public List<Habitacion> findHabitacionMasCaraEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Déjelo vacío si no indicaron hotel.")
            String nombreHotel) {
        log.info("Tool invocada — findHabitacionMasCaraEnHotel: hotel={}", nombreHotel);
        if (nombreHotel == null || nombreHotel.isBlank()) {
            return soloLaPrimera(habitacionRepository.findOrdenadasPorPrecioDesc());
        }
        return soloLaPrimera(habitacionRepository.findOrdenadasPorPrecioDescEnHotel(nombreHotel));
    }

    @Tool(description = "Listar todas las habitaciones ocupadas actualmente en la cadena hotelera.")
    public List<Habitacion> findHabitacionesOcupadas() {
        log.info("Tool invocada — findHabitacionesOcupadas");
        return habitacionRepository.findOcupadas();
    }

    @Tool(description = "Listar todas las habitaciones disponibles en la cadena hotelera.")
    public List<Habitacion> findHabitacionesDisponibles() {
        log.info("Tool invocada — findHabitacionesDisponibles");
        return habitacionRepository.findDisponibles();
    }

    @Tool(description = "Listar las habitaciones de un piso específico, opcionalmente dentro de un hotel. Útil para preguntas como: ¿Qué habitaciones hay en el piso 2 del Hotel Paraíso?")
    public List<Habitacion> findHabitacionesPorPiso(
            @ToolParam(description = "Número de piso, por ejemplo: 1, 2, 3")
            Integer piso,
            @ToolParam(description = "Nombre del hotel. Déjelo vacío para consultar todas las habitaciones de ese piso en la cadena.")
            String nombreHotel) {
        log.info("Tool invocada — findHabitacionesPorPiso: piso={}, hotel={}", piso, nombreHotel);
        if (nombreHotel == null || nombreHotel.isBlank()) {
            return habitacionRepository.findByPiso(piso);
        }
        return habitacionRepository.findByHotelNombreAndPiso(nombreHotel, piso);
    }

    @Tool(description = "Listar todas las habitaciones de un tipo específico, por ejemplo: Habitación Individual, Habitación Doble, Habitación Matrimonial, Habitación Familiar o Suite Ejecutiva.")
    public List<Habitacion> findHabitacionesPorTipo(
            @ToolParam(description = "Nombre exacto o aproximado del tipo de habitación, por ejemplo: Suite Ejecutiva, Habitación Familiar")
            String tipoNombre) {
        log.info("Tool invocada — findHabitacionesPorTipo: tipo={}", tipoNombre);
        return habitacionRepository.findByTipoNombre(tipoNombre);
    }

    @Tool(description = "Listar todas las habitaciones que se encuentran en una ciudad específica.")
    public List<Habitacion> findHabitacionesPorCiudad(
            @ToolParam(description = "Nombre de la ciudad, por ejemplo: Ciudad de México, Cancún, Guadalajara")
            String ciudad) {
        log.info("Tool invocada — findHabitacionesPorCiudad: ciudad={}", ciudad);
        return habitacionRepository.findByCiudad(ciudad);
    }

    @Tool(description = "Obtener un resumen de cuántas habitaciones hay por cada estado (Disponible, Ocupada, Mantenimiento) en toda la cadena.")
    public List<Map<String, Object>> countHabitacionesPorEstado() {
        log.info("Tool invocada — countHabitacionesPorEstado");
        return habitacionRepository.countHabitacionesPorEstado();
    }

    @Tool(description = "Contar el total de habitaciones que existen en toda la cadena hotelera (ambos hoteles juntos).")
    public Long countTotalHabitaciones() {
        log.info("Tool invocada — countTotalHabitaciones");
        return habitacionRepository.countTotalHabitaciones();
    }

    @Tool(description = "Contar cuántas habitaciones están en mantenimiento en toda la cadena hotelera.")
    public Long countMantenimiento() {
        log.info("Tool invocada — countMantenimiento");
        return habitacionRepository.countMantenimiento();
    }

    @Tool(description = "Calcular el ingreso potencial máximo por noche si se rentan todas las habitaciones de la cadena.")
    public BigDecimal sumIngresoPotencial() {
        log.info("Tool invocada — sumIngresoPotencial");
        return habitacionRepository.sumIngresoPotencial();
    }

    @Tool(description = "Listar las habitaciones disponibles ordenadas de la más barata a la más cara, con su tipo y precio por noche.")
    public List<Habitacion> findDisponiblesOrdenadasPorPrecio() {
        log.info("Tool invocada — findDisponiblesOrdenadasPorPrecio");
        return habitacionRepository.findDisponiblesOrdenadasPorPrecio();
    }

    @Tool(description = "Obtener todas las habitaciones con su tipo y su precio por noche.")
    public List<Map<String, Object>> getHabitacionesConTipoYPrecio() {
        log.info("Tool invocada — getHabitacionesConTipoYPrecio");
        return habitacionRepository.findHabitacionesConTipoYPrecio();
    }

    @Tool(description = "Buscar habitaciones en Planta Baja (Piso 1), con prioridad para personas de la tercera edad o con movilidad reducida (sillas de ruedas).")
    public List<Habitacion> findHabitacionesPlantaBaja(
            @ToolParam(description = "Nombre del hotel (opcional). Déjelo vacío para revisar la planta baja en ambos hoteles.")
            String nombreHotel) {
        log.info("Tool invocada — findHabitacionesPlantaBaja: hotel={}", nombreHotel);
        if (nombreHotel == null || nombreHotel.isBlank()) {
            return habitacionRepository.findByPiso(1);
        }
        return habitacionRepository.findByHotelNombreAndPiso(nombreHotel, 1);
    }

    @Tool(description = "Buscar habitaciones disponibles que se ajusten a un presupuesto máximo por noche en pesos.")
    public List<Habitacion> findHabitacionesDisponiblesPorPresupuesto(
            @ToolParam(description = "Presupuesto máximo por noche en pesos, ej. 1200, 1500, 2000")
            Double presupuestoMaximo) {
        log.info("Tool invocada — findHabitacionesDisponiblesPorPresupuesto: max={}", presupuestoMaximo);
        BigDecimal max = BigDecimal.valueOf(presupuestoMaximo);
        return habitacionRepository.findDisponibles().stream()
                .filter(h -> h.getTipoHabitacion() != null &&
                             h.getTipoHabitacion().getPrecioBase() != null &&
                             h.getTipoHabitacion().getPrecioBase().compareTo(max) <= 0)
                .toList();
    }

    @Tool(description = "Contar cuántas habitaciones disponibles hay desglosadas por cada hotel de la cadena.")
    public List<Map<String, Object>> countDisponiblesPorHotel() {
        log.info("Tool invocada — countDisponiblesPorHotel");
        return habitacionRepository.countDisponiblesPorHotel();
    }

    @Tool(description = "Buscar habitaciones que estén DISPONIBLES en Planta Baja (Piso 1) en un hotel o en toda la cadena. Especialmente útil cuando llega o llama un adulto mayor o una persona con movilidad reducida (sillas de ruedas).")
    public List<Habitacion> findDisponiblesPlantaBaja(
            @ToolParam(description = "Nombre del hotel (opcional). Por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Dejar vacío para revisar ambos hoteles.")
            String nombreHotel) {
        log.info("Tool invocada — findDisponiblesPlantaBaja: hotel={}", nombreHotel);
        List<Habitacion> piso1;
        if (nombreHotel == null || nombreHotel.isBlank()) {
            piso1 = habitacionRepository.findByPiso(1);
        } else {
            piso1 = habitacionRepository.findByHotelNombreAndPiso(nombreHotel, 1);
        }
        return piso1.stream()
                .filter(h -> "Disponible".equalsIgnoreCase(h.getEstado()))
                .toList();
    }

    @Tool(description = "Obtener el resumen operativo completo de un hotel o de toda la cadena: total de habitaciones, cuántas están disponibles, ocupadas y en mantenimiento con sus números. Ideal para el cambio de turno del recepcionista.")
    public Map<String, Object> getResumenOperativoHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Dejar vacío para toda la cadena.")
            String nombreHotel) {
        log.info("Tool invocada — getResumenOperativoHotel: hotel={}", nombreHotel);
        List<Habitacion> habitaciones = (nombreHotel == null || nombreHotel.isBlank())
                ? habitacionRepository.findAll()
                : habitacionRepository.findByHotelNombre(nombreHotel);

        long total = habitaciones.size();
        List<String> disponibles = habitaciones.stream().filter(h -> "Disponible".equalsIgnoreCase(h.getEstado())).map(Habitacion::getNumero).toList();
        List<String> ocupadas = habitaciones.stream().filter(h -> "Ocupada".equalsIgnoreCase(h.getEstado())).map(Habitacion::getNumero).toList();
        List<String> mantenimiento = habitaciones.stream().filter(h -> "Mantenimiento".equalsIgnoreCase(h.getEstado())).map(Habitacion::getNumero).toList();

        double porcentajeOcupacion = total > 0 ? ((double) ocupadas.size() / total) * 100.0 : 0.0;

        return Map.of(
                "hotel", (nombreHotel == null || nombreHotel.isBlank()) ? "Toda la cadena" : nombreHotel,
                "totalHabitaciones", total,
                "disponiblesCount", disponibles.size(),
                "disponiblesNumeros", disponibles,
                "ocupadasCount", ocupadas.size(),
                "ocupadasNumeros", ocupadas,
                "mantenimientoCount", mantenimiento.size(),
                "mantenimientoNumeros", mantenimiento,
                "porcentajeOcupacion", String.format("%.1f%%", porcentajeOcupacion)
        );
    }

    private List<Habitacion> soloLaPrimera(List<Habitacion> habitaciones) {
        return habitaciones.isEmpty() ? habitaciones : List.of(habitaciones.get(0));
    }
}
