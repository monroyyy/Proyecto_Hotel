package com.ico.hotel.repository;

import com.ico.hotel.models.ReservaEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservaEventoRepository extends JpaRepository<ReservaEvento, Integer> {

    List<ReservaEvento> findByIdReservaOrderByFechaHoraAsc(Integer idReserva);

    Optional<ReservaEvento> findTopByIdReservaAndTipoOrderByFechaHoraDesc(Integer idReserva, String tipo);

    Optional<ReservaEvento> findTopByIdReservaAndEstadoNuevoOrderByFechaHoraDesc(Integer idReserva, String estadoNuevo);
}
