package com.ico.hotel.repository;

import com.ico.hotel.models.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, Integer> {
    
    // 8. Reto: ¿Cuántas habitaciones tiene cada hotel?
    @Query("SELECT new map(hot.nombre as hotel, COUNT(hab) as total_habitaciones) FROM Hotel hot LEFT JOIN Habitacion hab ON hot.idHotel = hab.hotel.idHotel GROUP BY hot.idHotel, hot.nombre")
    List<Map<String, Object>> countTotalHabitacionesPorHotel();

    // 19. ¿Cuáles son los hoteles que están actualmente activos?
    List<Hotel> findByActivoTrue();

    // 20. ¿Qué hoteles hay en una ciudad específica?
    List<Hotel> findByCiudad(String ciudad);
}
