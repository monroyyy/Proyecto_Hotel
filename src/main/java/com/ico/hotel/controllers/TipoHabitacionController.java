package com.ico.hotel.controllers;

import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.TipoHabitacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para Tipos de Habitación.
 * Proporciona endpoints para listar, registrar y eliminar tipos de habitación.
 */
@RestController
@RequestMapping("/api/tipos-habitacion")
public class TipoHabitacionController {

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    @GetMapping
    public List<TipoHabitacion> listarTodos() {
        return tipoHabitacionRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> crearTipoHabitacion(@RequestBody TipoHabitacion tipo) {
        if (tipo.getNombre() == null || tipo.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del tipo de habitación es obligatorio."));
        }
        if (tipo.getCapacidad() == null || tipo.getCapacidad() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "La capacidad debe ser mayor a cero."));
        }
        if (tipo.getPrecioBase() == null || tipo.getPrecioBase().compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "El precio base no puede ser negativo."));
        }
        TipoHabitacion guardado = tipoHabitacionRepository.save(tipo);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        return tipoHabitacionRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Tipo de habitación no encontrado con ID: " + id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarTipoHabitacion(@PathVariable Integer id, @RequestBody TipoHabitacion datos) {
        return tipoHabitacionRepository.findById(id)
                .<ResponseEntity<?>>map(tipo -> {
                    if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
                        tipo.setNombre(datos.getNombre().trim());
                    }
                    if (datos.getCapacidad() != null) {
                        if (datos.getCapacidad() <= 0) {
                            throw new IllegalArgumentException("La capacidad debe ser mayor a cero.");
                        }
                        tipo.setCapacidad(datos.getCapacidad());
                    }
                    if (datos.getDescripcion() != null) {
                        tipo.setDescripcion(datos.getDescripcion().trim());
                    }
                    if (datos.getPrecioBase() != null) {
                        if (datos.getPrecioBase().compareTo(BigDecimal.ZERO) < 0) {
                            throw new IllegalArgumentException("El precio base no puede ser negativo.");
                        }
                        tipo.setPrecioBase(datos.getPrecioBase());
                    }
                    TipoHabitacion actualizado = tipoHabitacionRepository.save(tipo);
                    return ResponseEntity.ok(actualizado);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Tipo de habitación no encontrado con ID: " + id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarTipoHabitacion(@PathVariable Integer id) {
        if (!tipoHabitacionRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Tipo de habitación no encontrado."));
        }
        try {
            tipoHabitacionRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se puede eliminar el tipo de habitación porque está asignado a habitaciones existentes."));
        }
    }
}
