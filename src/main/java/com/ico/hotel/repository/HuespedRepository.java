package com.ico.hotel.repository;

import com.ico.hotel.models.Huesped;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HuespedRepository extends JpaRepository<Huesped, Integer> {
    Optional<Huesped> findFirstByEmailIgnoreCase(String email);
    Optional<Huesped> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdHuespedNot(String email, Integer idHuesped);
}
