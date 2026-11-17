package com.ico.hotel.controllers;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.TipoHabitacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/consultas")
public class ConsultasController {

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    // --- CONSULTAS DE HOTEL ---

    // 1. Mostrar hoteles (solo activos por defecto; incluirInactivos=true para auditoría completa)
    @GetMapping("/hoteles")
    public List<Hotel> getHoteles(@RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return incluirInactivos ? hotelRepository.findAll() : hotelRepository.findByActivoTrue();
    }

    // 2. ¿Cuáles son los hoteles que están actualmente activos?
    @GetMapping("/hoteles/activos")
    public List<Hotel> getHotelesActivos() {
        return hotelRepository.findByActivoTrue();
    }

    // 3. ¿Qué hoteles hay en una ciudad específica? (solo activos)
    @GetMapping("/hoteles/ciudad/{ciudad}")
    public List<Hotel> getHotelesPorCiudad(@PathVariable String ciudad) {
        return hotelRepository.findByCiudadIgnoreCaseAndActivoTrue(ciudad);
    }

    // 4. ¿Cuántas habitaciones tiene cada hotel? (solo activos por defecto)
    @GetMapping("/hoteles/total-habitaciones")
    public List<Map<String, Object>> getTotalHabitacionesPorHotel(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return incluirInactivos
                ? hotelRepository.countTotalHabitacionesPorHotel()
                : hotelRepository.countTotalHabitacionesPorHotelActivos();
    }

    // --- CONSULTAS DE TIPO HABITACION ---

    // 5. ¿Qué tipos de habitaciones existen?
    @GetMapping("/tipos")
    public List<TipoHabitacion> getTiposHabitacion() {
        return tipoHabitacionRepository.findAll();
    }

    // 6. ¿Cuál es el precio de las habitaciones para 2 personas?
    @GetMapping("/tipos/capacidad-2")
    public List<TipoHabitacion> getPreciosPara2Personas() {
        return tipoHabitacionRepository.findByCapacidad2();
    }

    // 7. ¿Cuál es el precio promedio de las habitaciones?
    @GetMapping("/tipos/precio-promedio")
    public Double getPrecioPromedio() {
        return tipoHabitacionRepository.getPrecioPromedio();
    }

    // 8. ¿Qué tipos de habitación cuestan menos de cierta cantidad?
    @GetMapping("/tipos/menor-que/{precio}")
    public List<TipoHabitacion> getTiposMasBaratosQue(@PathVariable BigDecimal precio) {
        return tipoHabitacionRepository.findTiposMasBaratosQue(precio);
    }

    // 9. ¿Qué tipos de habitación cuestan más de cierta cantidad?
    @GetMapping("/tipos/mayor-que/{precio}")
    public List<TipoHabitacion> getTiposMasCarosQue(@PathVariable BigDecimal precio) {
        return tipoHabitacionRepository.findTiposMasCarosQue(precio);
    }

    // 10. ¿Cuál es el tipo de habitación más barato?
    @GetMapping("/tipos/mas-barato")
    public TipoHabitacion getTipoMasBarato() {
        return tipoHabitacionRepository.findFirstByOrderByPrecioBaseAsc();
    }

    // 11. ¿Cuál es el tipo de habitación más caro?
    @GetMapping("/tipos/mas-caro")
    public TipoHabitacion getTipoMasCaro() {
        return tipoHabitacionRepository.findFirstByOrderByPrecioBaseDesc();
    }

    // 12. ¿Cuántos tipos de habitación existen en total?
    @GetMapping("/tipos/total-count")
    public Long countTotalTipos() {
        return tipoHabitacionRepository.countTotalTipos();
    }

    // 13. ¿Cuál es la capacidad máxima que podemos alojar en una sola habitación?
    @GetMapping("/tipos/capacidad-maxima")
    public Integer getMaximaCapacidad() {
        return tipoHabitacionRepository.findMaximaCapacidad();
    }

    // --- CONSULTAS DE HABITACION ---

    // 14. Mostrar las habitaciones disponibles (solo sedes activas)
    @GetMapping("/habitaciones/disponibles")
    public List<Habitacion> getHabitacionesDisponibles() {
        return habitacionRepository.findDisponiblesActivos();
    }

    // 15. Mostrar las habitaciones de cada hotel (solo sedes activas)
    @GetMapping("/habitaciones/por-hotel")
    public List<Map<String, Object>> getHabitacionesPorHotel() {
        return habitacionRepository.findHabitacionesPorHotelActivos();
    }

    // 16. Mostrar habitaciones con su tipo y precio (solo sedes activas)
    @GetMapping("/habitaciones/tipo-precio")
    public List<Map<String, Object>> getHabitacionesConTipoYPrecio() {
        return habitacionRepository.findHabitacionesConTipoYPrecioActivos();
    }

    // 17. Contar las habitaciones disponibles por hotel (solo sedes activas)
    @GetMapping("/hoteles/habitaciones-disponibles-count")
    public List<Map<String, Object>> countDisponiblesPorHotel() {
        return habitacionRepository.countDisponiblesPorHotelActivos();
    }

    // 18. ¿Qué habitaciones están disponibles en un hotel específico (por nombre, solo si activo)?
    @GetMapping("/habitaciones/disponibles/{nombreHotel}")
    public List<Habitacion> getDisponiblesEnHotel(@PathVariable String nombreHotel) {
        return habitacionRepository.findDisponiblesEnHotelActivos(nombreHotel);
    }

    // 18b. Mostrar todas las habitaciones de un hotel específico (solo si activo)
    @GetMapping("/habitaciones/hotel/{nombreHotel}")
    public List<Habitacion> getHabitacionesPorHotelNombre(@PathVariable String nombreHotel) {
        return habitacionRepository.findByHotelNombreActivos(nombreHotel);
    }

    // 19. ¿Cuántas habitaciones están en mantenimiento? (solo sedes activas)
    @GetMapping("/habitaciones/mantenimiento-count")
    public Long countMantenimiento() {
        return habitacionRepository.countMantenimientoActivos();
    }

    // 19b. Listar habitaciones en mantenimiento (solo sedes activas)
    @GetMapping("/habitaciones/mantenimiento")
    public List<Habitacion> getHabitacionesMantenimiento() {
        return habitacionRepository.findByEstadoActivos("Mantenimiento");
    }

    // 20. ¿Qué habitaciones tienen capacidad para 4 huéspedes? (solo sedes activas)
    @GetMapping("/habitaciones/capacidad-4")
    public List<Habitacion> getHabitacionesPara4() {
        return habitacionRepository.findHabitacionesPara4HuespedesActivos();
    }

    // 21. ¿Qué habitaciones están ocupadas actualmente? (solo sedes activas)
    @GetMapping("/habitaciones/ocupadas")
    public List<Habitacion> getHabitacionesOcupadas() {
        return habitacionRepository.findOcupadasActivos();
    }

    // 22. ¿Qué habitaciones hay en un piso específico? (solo sedes activas)
    @GetMapping("/habitaciones/piso/{piso}")
    public List<Habitacion> getHabitacionesPorPiso(@PathVariable Integer piso) {
        return habitacionRepository.findByPisoActivos(piso);
    }

    // 23. ¿Qué habitaciones hay en un piso de un hotel específico? (solo si activo)
    @GetMapping("/habitaciones/hotel/{nombreHotel}/piso/{piso}")
    public List<Habitacion> getHabitacionesPorHotelYPiso(@PathVariable String nombreHotel, @PathVariable Integer piso) {
        return habitacionRepository.findByHotelNombreAndPisoActivos(nombreHotel, piso);
    }

    // 24. ¿Cuántas habitaciones tenemos en total en sedes activas?
    @GetMapping("/habitaciones/total-count")
    public Long countTotalHabitaciones() {
        return habitacionRepository.countTotalHabitacionesActivos();
    }

    // 25. ¿Cuál es el ingreso potencial máximo por noche en sedes activas?
    @GetMapping("/habitaciones/ingreso-potencial")
    public BigDecimal getIngresoPotencial() {
        return habitacionRepository.sumIngresoPotencialActivos();
    }

    // 26. Buscar una habitación por su número (solo sedes activas)
    @GetMapping("/habitaciones/numero/{numero}")
    public List<Habitacion> getHabitacionPorNumero(@PathVariable String numero) {
        return habitacionRepository.findByNumeroActivos(numero);
    }

    // 27. Mostrar todas las habitaciones de un tipo específico (solo sedes activas)
    @GetMapping("/habitaciones/tipo/{tipoNombre}")
    public List<Habitacion> getHabitacionesPorTipo(@PathVariable String tipoNombre) {
        return habitacionRepository.findByTipoNombreActivos(tipoNombre);
    }

    // 28. Resumen: ¿Cuántas habitaciones hay por cada estado en sedes activas?
    @GetMapping("/habitaciones/resumen-estados")
    public List<Map<String, Object>> countHabitacionesPorEstado() {
        return habitacionRepository.countHabitacionesPorEstadoActivos();
    }

    // 29. ¿Qué habitaciones están en una ciudad en específico? (solo sedes activas)
    @GetMapping("/habitaciones/ciudad/{ciudad}")
    public List<Habitacion> getHabitacionesPorCiudad(@PathVariable String ciudad) {
        return habitacionRepository.findByCiudadActivos(ciudad);
    }

    // 30. Listar las habitaciones disponibles ordenadas de la más barata a la más cara (solo sedes activas)
    @GetMapping("/habitaciones/disponibles/ordenadas-por-precio")
    public List<Habitacion> getDisponiblesOrdenadasPorPrecio() {
        return habitacionRepository.findDisponiblesOrdenadasPorPrecioActivos();
    }
}
