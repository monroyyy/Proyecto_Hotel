package com.ico.hotel.repository;

import com.ico.hotel.models.TokenRevocado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface TokenRevocadoRepository extends JpaRepository<TokenRevocado, String> {

    @Modifying
    @Transactional
    @Query("DELETE FROM TokenRevocado t WHERE t.expiraEn < :ahora")
    int deleteExpired(@Param("ahora") LocalDateTime ahora);
}
