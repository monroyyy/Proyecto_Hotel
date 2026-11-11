package com.ico.hotel.repository;

import com.ico.hotel.models.TokenVerificacion;
import com.ico.hotel.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TokenVerificacionRepository extends JpaRepository<TokenVerificacion, Integer> {

    Optional<TokenVerificacion> findByToken(String token);

    Optional<TokenVerificacion> findFirstByUsuarioAndCodigoAndUsadoFalseOrderByFechaCreacionDesc(Usuario usuario, String codigo);

    Optional<TokenVerificacion> findFirstByCodigoAndUsadoFalseOrderByFechaCreacionDesc(String codigo);

    List<TokenVerificacion> findByUsuarioAndUsadoFalse(Usuario usuario);

    List<TokenVerificacion> findByUsuario(Usuario usuario);
}
