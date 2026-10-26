package com.ico.hotel.repository;

import com.ico.hotel.models.Huesped;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HuespedRepository extends JpaRepository<Huesped, Integer> {
    Optional<Huesped> findFirstByEmailIgnoreCase(String email);
}
