package com.ico.hotel.repository;

import com.ico.hotel.models.Recepcionista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecepcionistaRepository extends JpaRepository<Recepcionista, Integer> {
    Optional<Recepcionista> findByNombreIgnoreCase(String nombre);
    List<Recepcionista> findByActivoTrueOrderByNombreAsc();
}
