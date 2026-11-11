package com.ico.hotel.repository;

import com.ico.hotel.models.TokenRecuperacionPassword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TokenRecuperacionPasswordRepository extends JpaRepository<TokenRecuperacionPassword, Integer> {

    Optional<TokenRecuperacionPassword> findTopByUsuarioIdUsuarioAndUsadoFalseOrderByFechaCreacionDesc(Integer idUsuario);

    @Modifying
    @Query("UPDATE TokenRecuperacionPassword t SET t.usado = true WHERE t.usuario.idUsuario = :idUsuario AND t.usado = false")
    int invalidarActivosPorUsuario(@Param("idUsuario") Integer idUsuario);
}
