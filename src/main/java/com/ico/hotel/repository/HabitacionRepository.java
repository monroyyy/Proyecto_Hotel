package com.ico.hotel.repository;

import com.ico.hotel.models.Habitacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Repository
public interface HabitacionRepository extends JpaRepository<Habitacion, Integer> {

    // 2. Mostrar las habitaciones disponibles
    @Query("SELECT h FROM Habitacion h WHERE h.estado = 'Disponible'")
    List<Habitacion> findDisponibles();

    // 3. Mostrar las habitaciones de cada hotel
    @Query("SELECT new map(hot.nombre as hotel, hab.numero as habitacion, hab.piso as piso, hab.estado as estado) FROM Habitacion hab JOIN hab.hotel hot")
    List<Map<String, Object>> findHabitacionesPorHotel();

    // 4. Mostrar habitaciones con su tipo y precio
    @Query("SELECT new map(hot.nombre as hotel, hab.numero as habitacion, t.nombre as tipo, t.capacidad as capacidad, t.precioBase as precioBase) FROM Habitacion hab JOIN hab.hotel hot JOIN hab.tipoHabitacion t")
    List<Map<String, Object>> findHabitacionesConTipoYPrecio();

    // 5. Contar las habitaciones disponibles por hotel
    @Query("SELECT new map(hot.nombre as hotel, COUNT(hab) as habitaciones_disponibles) FROM Habitacion hab JOIN hab.hotel hot WHERE hab.estado = 'Disponible' GROUP BY hot.idHotel, hot.nombre")
    List<Map<String, Object>> countDisponiblesPorHotel();

    // 6. Reto: ¿Qué habitaciones están disponibles en un hotel específico (por nombre)?
    @Query("SELECT h FROM Habitacion h WHERE h.estado = 'Disponible' AND h.hotel.nombre = :hotelNombre")
    List<Habitacion> findDisponiblesEnHotel(String hotelNombre);

    // 10. Reto: ¿Cuántas habitaciones están en mantenimiento?
    @Query("SELECT COUNT(h) FROM Habitacion h WHERE h.estado = 'Mantenimiento'")
    Long countMantenimiento();

    // 12. Reto: ¿Qué habitaciones tienen capacidad para 4 huéspedes?
    @Query("SELECT h FROM Habitacion h JOIN h.tipoHabitacion t WHERE t.capacidad = 4")
    List<Habitacion> findHabitacionesPara4Huespedes();

    // 21. ¿Qué habitaciones están ocupadas actualmente?
    @Query("SELECT h FROM Habitacion h WHERE h.estado = 'Ocupada'")
    List<Habitacion> findOcupadas();

    // 22. ¿Qué habitaciones hay en un piso específico?
    List<Habitacion> findByPiso(Integer piso);

    // 23. ¿Qué habitaciones hay en un piso de un hotel específico?
    @Query("SELECT h FROM Habitacion h WHERE h.hotel.nombre = :hotelNombre AND h.piso = :piso")
    List<Habitacion> findByHotelNombreAndPiso(String hotelNombre, Integer piso);

    // 24. ¿Cuántas habitaciones tenemos en total en toda la cadena?
    @Query("SELECT COUNT(h) FROM Habitacion h")
    Long countTotalHabitaciones();

    // 25. ¿Cuál es el ingreso potencial máximo por noche si se rentan todas las habitaciones?
    @Query("SELECT SUM(t.precioBase) FROM Habitacion h JOIN h.tipoHabitacion t")
    BigDecimal sumIngresoPotencial();

    // 26. Buscar una habitación por su número (ej. '101')
    List<Habitacion> findByNumero(String numero);

    // 27. Mostrar todas las habitaciones de un tipo específico (ej. 'Suite Ejecutiva')
    @Query("SELECT h FROM Habitacion h JOIN h.tipoHabitacion t WHERE t.nombre = :tipoNombre")
    List<Habitacion> findByTipoNombre(String tipoNombre);

    // 28. Resumen: ¿Cuántas habitaciones hay por cada estado (Disponible, Ocupada, Mantenimiento)?
    @Query("SELECT new map(h.estado as estado, COUNT(h) as cantidad) FROM Habitacion h GROUP BY h.estado")
    List<Map<String, Object>> countHabitacionesPorEstado();

    // 29. ¿Qué habitaciones están en una ciudad en específico?
    @Query("SELECT h FROM Habitacion h JOIN h.hotel hot WHERE hot.ciudad = :ciudad")
    List<Habitacion> findByCiudad(String ciudad);

    // 30. Listar las habitaciones disponibles ordenadas de la más barata a la más cara
    @Query("SELECT h FROM Habitacion h JOIN h.tipoHabitacion t WHERE h.estado = 'Disponible' ORDER BY t.precioBase ASC")
    List<Habitacion> findDisponiblesOrdenadasPorPrecio();
}
