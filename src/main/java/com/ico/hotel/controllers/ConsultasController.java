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
    private HabitacionRepository habitacionRepository;

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    // 1. Mostrar todos los hoteles
    @GetMapping("/hoteles")
    public List<Hotel> getHoteles() {
        return hotelRepository.findAll();
    }

    // 2. Mostrar las habitaciones disponibles
    @GetMapping("/habitaciones/disponibles")
    public List<Habitacion> getHabitacionesDisponibles() {
        return habitacionRepository.findDisponibles();
    }

    // 3. Mostrar las habitaciones de cada hotel
    @GetMapping("/habitaciones/por-hotel")
    public List<Map<String, Object>> getHabitacionesPorHotel() {
        return habitacionRepository.findHabitacionesPorHotel();
    }

    // 4. Mostrar habitaciones con su tipo y precio
    @GetMapping("/habitaciones/tipo-precio")
    public List<Map<String, Object>> getHabitacionesConTipoYPrecio() {
        return habitacionRepository.findHabitacionesConTipoYPrecio();
    }

    // 5. Contar las habitaciones disponibles por hotel
    @GetMapping("/hoteles/habitaciones-disponibles-count")
    public List<Map<String, Object>> countDisponiblesPorHotel() {
        return habitacionRepository.countDisponiblesPorHotel();
    }

    // 6. Reto: ¿Qué habitaciones están disponibles en un hotel específico?
    @GetMapping("/habitaciones/disponibles/{nombreHotel}")
    public List<Habitacion> getDisponiblesEnHotel(@PathVariable String nombreHotel) {
        return habitacionRepository.findDisponiblesEnHotel(nombreHotel);
    }

    // 7. Reto: ¿Cuál es el precio de las habitaciones para 2 personas?
    @GetMapping("/tipos/capacidad-2")
    public List<TipoHabitacion> getPreciosPara2Personas() {
        return tipoHabitacionRepository.findByCapacidad2();
    }

    // 8. Reto: ¿Cuántas habitaciones tiene cada hotel?
    @GetMapping("/hoteles/total-habitaciones")
    public List<Map<String, Object>> getTotalHabitacionesPorHotel() {
        return hotelRepository.countTotalHabitacionesPorHotel();
    }

    // 9. Reto: ¿Qué tipos de habitaciones existen?
    @GetMapping("/tipos")
    public List<TipoHabitacion> getTiposHabitacion() {
        return tipoHabitacionRepository.findAll();
    }

    // 10. Reto: ¿Cuántas habitaciones están en mantenimiento?
    @GetMapping("/habitaciones/mantenimiento-count")
    public Long countMantenimiento() {
        return habitacionRepository.countMantenimiento();
    }

    // 11. Reto: ¿Cuál es el precio promedio de las habitaciones?
    @GetMapping("/tipos/precio-promedio")
    public Double getPrecioPromedio() {
        return tipoHabitacionRepository.getPrecioPromedio();
    }

    // 12. Reto: ¿Qué habitaciones tienen capacidad para 4 huéspedes?
    @GetMapping("/habitaciones/capacidad-4")
    public List<Habitacion> getHabitacionesPara4() {
        return habitacionRepository.findHabitacionesPara4Huespedes();
    }

    // 13. ¿Qué tipos de habitación cuestan menos de cierta cantidad?
    @GetMapping("/tipos/menor-que/{precio}")
    public List<TipoHabitacion> getTiposMasBaratosQue(@PathVariable BigDecimal precio) {
        return tipoHabitacionRepository.findTiposMasBaratosQue(precio);
    }

    // 14. ¿Qué tipos de habitación cuestan más de cierta cantidad?
    @GetMapping("/tipos/mayor-que/{precio}")
    public List<TipoHabitacion> getTiposMasCarosQue(@PathVariable BigDecimal precio) {
        return tipoHabitacionRepository.findTiposMasCarosQue(precio);
    }

    // 15. ¿Cuál es el tipo de habitación más barato?
    @GetMapping("/tipos/mas-barato")
    public TipoHabitacion getTipoMasBarato() {
        return tipoHabitacionRepository.findFirstByOrderByPrecioBaseAsc();
    }

    // 16. ¿Cuál es el tipo de habitación más caro?
    @GetMapping("/tipos/mas-caro")
    public TipoHabitacion getTipoMasCaro() {
        return tipoHabitacionRepository.findFirstByOrderByPrecioBaseDesc();
    }

    // 17. ¿Cuántos tipos de habitación existen en total?
    @GetMapping("/tipos/total-count")
    public Long countTotalTipos() {
        return tipoHabitacionRepository.countTotalTipos();
    }

    // 18. ¿Cuál es la capacidad máxima que podemos alojar en una sola habitación?
    @GetMapping("/tipos/capacidad-maxima")
    public Integer getMaximaCapacidad() {
        return tipoHabitacionRepository.findMaximaCapacidad();
    }

    // 19. ¿Cuáles son los hoteles que están actualmente activos?
    @GetMapping("/hoteles/activos")
    public List<Hotel> getHotelesActivos() {
        return hotelRepository.findByActivoTrue();
    }

    // 20. ¿Qué hoteles hay en una ciudad específica?
    @GetMapping("/hoteles/ciudad/{ciudad}")
    public List<Hotel> getHotelesPorCiudad(@PathVariable String ciudad) {
        return hotelRepository.findByCiudad(ciudad);
    }

    // 21. ¿Qué habitaciones están ocupadas actualmente?
    @GetMapping("/habitaciones/ocupadas")
    public List<Habitacion> getHabitacionesOcupadas() {
        return habitacionRepository.findOcupadas();
    }

    // 22. ¿Qué habitaciones hay en un piso específico?
    @GetMapping("/habitaciones/piso/{piso}")
    public List<Habitacion> getHabitacionesPorPiso(@PathVariable Integer piso) {
        return habitacionRepository.findByPiso(piso);
    }

    // 23. ¿Qué habitaciones hay en un piso de un hotel específico?
    @GetMapping("/habitaciones/hotel/{nombreHotel}/piso/{piso}")
    public List<Habitacion> getHabitacionesPorHotelYPiso(@PathVariable String nombreHotel, @PathVariable Integer piso) {
        return habitacionRepository.findByHotelNombreAndPiso(nombreHotel, piso);
    }

    // 24. ¿Cuántas habitaciones tenemos en total en toda la cadena?
    @GetMapping("/habitaciones/total-count")
    public Long countTotalHabitaciones() {
        return habitacionRepository.countTotalHabitaciones();
    }

    // 25. ¿Cuál es el ingreso potencial máximo por noche si se rentan todas las habitaciones?
    @GetMapping("/habitaciones/ingreso-potencial")
    public BigDecimal getIngresoPotencial() {
        return habitacionRepository.sumIngresoPotencial();
    }

    // 26. Buscar una habitación por su número (ej. '101')
    @GetMapping("/habitaciones/numero/{numero}")
    public List<Habitacion> getHabitacionPorNumero(@PathVariable String numero) {
        return habitacionRepository.findByNumero(numero);
    }

    // 27. Mostrar todas las habitaciones de un tipo específico (ej. 'Suite Ejecutiva')
    @GetMapping("/habitaciones/tipo/{tipoNombre}")
    public List<Habitacion> getHabitacionesPorTipo(@PathVariable String tipoNombre) {
        return habitacionRepository.findByTipoNombre(tipoNombre);
    }

    // 28. Resumen: ¿Cuántas habitaciones hay por cada estado (Disponible, Ocupada, Mantenimiento)?
    @GetMapping("/habitaciones/resumen-estados")
    public List<Map<String, Object>> countHabitacionesPorEstado() {
        return habitacionRepository.countHabitacionesPorEstado();
    }

    // 29. ¿Qué habitaciones están en una ciudad en específico?
    @GetMapping("/habitaciones/ciudad/{ciudad}")
    public List<Habitacion> getHabitacionesPorCiudad(@PathVariable String ciudad) {
        return habitacionRepository.findByCiudad(ciudad);
    }

    // 30. Listar las habitaciones disponibles ordenadas de la más barata a la más cara
    @GetMapping("/habitaciones/disponibles/ordenadas-por-precio")
    public List<Habitacion> getDisponiblesOrdenadasPorPrecio() {
        return habitacionRepository.findDisponiblesOrdenadasPorPrecio();
    }
}
