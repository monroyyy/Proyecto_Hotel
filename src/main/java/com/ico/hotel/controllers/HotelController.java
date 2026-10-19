package com.ico.hotel.controllers;

import com.ico.hotel.models.Hotel;
import com.ico.hotel.repository.HotelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST para Hoteles.
 * Proporciona endpoints para listar, registrar y eliminar hoteles.
 */
@RestController
@RequestMapping("/api/hoteles")
public class HotelController {

    @Autowired
    private HotelRepository hotelRepository;

    @GetMapping
    public List<Hotel> listarTodos() {
        return hotelRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> crearHotel(@RequestBody Hotel hotel) {
        if (hotel.getNombre() == null || hotel.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del hotel es obligatorio."));
        }
        if (hotel.getActivo() == null) {
            hotel.setActivo(true);
        }
        Hotel guardado = hotelRepository.save(hotel);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarHotel(@PathVariable Integer id) {
        if (!hotelRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hotel no encontrado."));
        }
        try {
            hotelRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se puede eliminar el hotel porque tiene habitaciones u otros registros asociados."));
        }
    }
}
