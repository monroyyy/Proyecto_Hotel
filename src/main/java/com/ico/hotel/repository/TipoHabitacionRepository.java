package com.ico.hotel.repository;

import com.ico.hotel.models.TipoHabitacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TipoHabitacionRepository extends JpaRepository<TipoHabitacion, Integer> {
    
    // 5. ¿Qué tipos de habitaciones existen? (Viene incluido en JpaRepository como findAll())

    // 6. ¿Cuál es el precio de las habitaciones para 2 personas?
    @Query("SELECT t FROM TipoHabitacion t WHERE t.capacidad = 2")
    List<TipoHabitacion> findByCapacidad2();

    // 7. ¿Cuál es el precio promedio de las habitaciones?
    @Query("SELECT AVG(t.precioBase) FROM TipoHabitacion t")
    Double getPrecioPromedio();

    // 8. ¿Qué tipos de habitación cuestan menos de cierta cantidad?
    @Query("SELECT t FROM TipoHabitacion t WHERE t.precioBase < :precio")
    List<TipoHabitacion> findTiposMasBaratosQue(BigDecimal precio);

    // 9. ¿Qué tipos de habitación cuestan más de cierta cantidad?
    @Query("SELECT t FROM TipoHabitacion t WHERE t.precioBase > :precio")
    List<TipoHabitacion> findTiposMasCarosQue(BigDecimal precio);

    // 10. ¿Cuál es el tipo de habitación más barato?
    TipoHabitacion findFirstByOrderByPrecioBaseAsc();

    // 11. ¿Cuál es el tipo de habitación más caro?
    TipoHabitacion findFirstByOrderByPrecioBaseDesc();

    // 12. ¿Cuántos tipos de habitación existen en total?
    @Query("SELECT COUNT(t) FROM TipoHabitacion t")
    Long countTotalTipos();

    // 13. ¿Cuál es la capacidad máxima que podemos alojar en una sola habitación?
    @Query("SELECT MAX(t.capacidad) FROM TipoHabitacion t")
    Integer findMaximaCapacidad();
}
