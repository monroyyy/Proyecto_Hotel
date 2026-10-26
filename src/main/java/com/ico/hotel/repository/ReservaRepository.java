package com.ico.hotel.repository;

import com.ico.hotel.models.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    /** Reservas activas (bloquean inventario) de una habitación que se traslapan con el rango. */
    @Query("SELECT r FROM Reserva r WHERE r.habitacion.idHabitacion = :idHab "
            + "AND r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "AND r.fechaEntrada < :salida AND r.fechaSalida > :entrada")
    List<Reserva> findTraslapes(@Param("idHab") Integer idHab,
                                @Param("entrada") LocalDate entrada,
                                @Param("salida") LocalDate salida);

    /** Habitaciones con reservas activas que se traslapan con el rango. */
    @Query("SELECT DISTINCT r.habitacion.idHabitacion FROM Reserva r "
            + "WHERE r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "AND r.fechaEntrada < :salida AND r.fechaSalida > :entrada")
    List<Integer> findHabitacionesOcupadas(@Param("entrada") LocalDate entrada,
                                           @Param("salida") LocalDate salida);

    @Query("SELECT r FROM Reserva r WHERE r.estado = 'Pre-reserva' AND r.fechaExpiracion < :ahora")
    List<Reserva> findPreReservasVencidas(@Param("ahora") LocalDateTime ahora);

    List<Reserva> findAllByOrderByFechaCreacionDesc();

    @Query("SELECT r FROM Reserva r WHERE r.habitacion.idHabitacion = :id "
            + "AND r.estado IN ('Pre-reserva','Confirmada','Ocupada')")
    List<Reserva> findActivasByHabitacion(@Param("id") Integer id);

    @Query("SELECT DISTINCT r.habitacion.idHabitacion FROM Reserva r "
            + "WHERE r.estado IN ('Pre-reserva','Confirmada','Ocupada')")
    List<Integer> findHabitacionesConReservaActiva();

    java.util.Optional<Reserva> findByFolioIgnoreCase(String folio);

    List<Reserva> findByHuespedNombreContainingIgnoreCaseOrderByFechaCreacionDesc(String nombre);

    List<Reserva> findByHuespedTelefonoContainingOrderByFechaCreacionDesc(String telefono);

    List<Reserva> findByHuespedEmailContainingIgnoreCaseOrderByFechaCreacionDesc(String email);

    @Query("SELECT r FROM Reserva r WHERE "
            + "(LOWER(r.folio) LIKE LOWER(CONCAT('%', :criterio, '%')) "
            + "OR LOWER(r.huesped.nombre) LIKE LOWER(CONCAT('%', :criterio, '%')) "
            + "OR r.huesped.telefono LIKE CONCAT('%', :criterio, '%') "
            + "OR LOWER(r.huesped.email) LIKE LOWER(CONCAT('%', :criterio, '%')) "
            + "OR r.habitacion.numero LIKE CONCAT('%', :criterio, '%')) "
            + "ORDER BY r.fechaCreacion DESC")
    List<Reserva> buscarPorCriterioGeneral(@Param("criterio") String criterio);

    @Query("SELECT r FROM Reserva r WHERE r.habitacion.numero = :numero "
            + "AND (:hotelNombre IS NULL OR LOWER(r.habitacion.hotel.nombre) LIKE LOWER(CONCAT('%', :hotelNombre, '%'))) "
            + "AND r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "ORDER BY r.fechaEntrada ASC")
    List<Reserva> findActivasPorHabitacionYHotel(@Param("numero") String numero, @Param("hotelNombre") String hotelNombre);

    List<Reserva> findByEstadoOrderByFechaCreacionDesc(String estado);

    @Query("SELECT r FROM Reserva r WHERE r.estado = 'Pre-reserva' ORDER BY r.fechaExpiracion ASC")
    List<Reserva> findPreReservasActivas();

    @Query("SELECT r FROM Reserva r WHERE r.estado = 'Pre-reserva' AND LOWER(r.habitacion.hotel.nombre) = LOWER(:hotelNombre) ORDER BY r.fechaExpiracion ASC")
    List<Reserva> findPreReservasActivasEnHotel(@Param("hotelNombre") String hotelNombre);
}
