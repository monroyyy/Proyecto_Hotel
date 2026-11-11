package com.ico.hotel.repository;

import com.ico.hotel.models.Reserva;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reserva r WHERE r.idReserva = :id")
    Optional<Reserva> findByIdForUpdate(@Param("id") Integer id);

    /** Reservas activas (bloquean inventario) de una habitación que se traslapan con el rango. */
    @Query("SELECT r FROM Reserva r WHERE r.habitacion.idHabitacion = :idHab "
            + "AND r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "AND r.fechaEntrada < :salida AND r.fechaSalida > :entrada")
    List<Reserva> findTraslapes(@Param("idHab") Integer idHab,
                                @Param("entrada") LocalDate entrada,
                                @Param("salida") LocalDate salida);

    /** Traslapes excluyendo una reservación existente (para edición). */
    @Query("SELECT r FROM Reserva r WHERE r.habitacion.idHabitacion = :idHab "
            + "AND r.idReserva <> :idReserva "
            + "AND r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "AND r.fechaEntrada < :salida AND r.fechaSalida > :entrada")
    List<Reserva> findTraslapesExcluyendo(@Param("idHab") Integer idHab,
                                         @Param("idReserva") Integer idReserva,
                                         @Param("entrada") LocalDate entrada,
                                         @Param("salida") LocalDate salida);

    /** Habitaciones con reservas activas que se traslapan con el rango. */
    @Query("SELECT DISTINCT r.habitacion.idHabitacion FROM Reserva r "
            + "WHERE r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "AND r.fechaEntrada < :salida AND r.fechaSalida > :entrada")
    List<Integer> findHabitacionesOcupadas(@Param("entrada") LocalDate entrada,
                                           @Param("salida") LocalDate salida);

    @Query("SELECT r FROM Reserva r WHERE r.estado = 'Pre-reserva' AND (r.fechaExpiracion < :ahora OR r.fechaSalida <= :hoy)")
    List<Reserva> findPreReservasVencidas(@Param("ahora") LocalDateTime ahora, @Param("hoy") LocalDate hoy);

    @Query("SELECT r FROM Reserva r WHERE r.estado = 'Confirmada' AND r.fechaEntrada <= :hoy")
    List<Reserva> findConfirmadasParaNoShow(@Param("hoy") LocalDate hoy);

    List<Reserva> findAllByOrderByFechaCreacionDesc();

    /** Reservaciones pertenecientes a un usuario huésped (por id_usuario o coincidencia de email del titular). */
    @Query("SELECT r FROM Reserva r WHERE "
            + "(r.usuario IS NOT NULL AND r.usuario.idUsuario = :idUsuario) "
            + "OR (r.huesped IS NOT NULL AND LOWER(r.huesped.email) = LOWER(:email)) "
            + "ORDER BY r.fechaCreacion DESC")
    List<Reserva> findByUsuarioOrHuespedEmail(@Param("idUsuario") Integer idUsuario, @Param("email") String email);

    @Query("SELECT r FROM Reserva r WHERE r.habitacion.idHabitacion = :id "
            + "AND r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "ORDER BY r.fechaEntrada ASC")
    List<Reserva> findActivasByHabitacion(@Param("id") Integer id);

    @Query("SELECT r FROM Reserva r WHERE r.estado IN ('Pre-reserva','Confirmada','Ocupada') "
            + "ORDER BY r.fechaEntrada ASC")
    List<Reserva> findAllActivasOrdenadas();

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

    List<Reserva> findByFechaEntradaBetweenOrderByFechaEntradaAsc(LocalDate desde, LocalDate hasta);

    boolean existsByFolioIgnoreCase(String folio);
}
