package com.ico.hotel.controllers;

import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.TipoHabitacionRepository;
import com.ico.hotel.services.CatalogoMediaValidator;
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

    @Autowired
    private com.ico.hotel.repository.ReservaRepository reservaRepository;

    @Autowired
    private CatalogoMediaValidator catalogoMediaValidator;

    @GetMapping
    public List<TipoHabitacion> listarTodos() {
        return tipoHabitacionRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> crearTipoHabitacion(@RequestBody TipoHabitacion tipo) {
        if (tipo.getNombre() == null || tipo.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del tipo de habitación es obligatorio."));
        }
        // Validar rango razonable de capacidad por habitación (1 a 20 huéspedes)
        if (tipo.getCapacidad() == null || tipo.getCapacidad() < 1 || tipo.getCapacidad() > 20) {
            return ResponseEntity.badRequest().body(Map.of("error", "La capacidad debe estar entre 1 y 20 huéspedes."));
        }
        // Impedir tarifa base <= 0 al crear categoría
        if (tipo.getPrecioBase() == null || tipo.getPrecioBase().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "El precio base debe ser mayor a $0.00."));
        }
        tipo.setImagenUrl(catalogoMediaValidator.validarImagenUrl(tipo.getImagenUrl()));
        tipo.setDescripcion(catalogoMediaValidator.validarTextoPlano(tipo.getDescripcion(), "descripcion", 500));
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
        var tipoOpt = tipoHabitacionRepository.findById(id);
        if (tipoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Tipo de habitación no encontrado con ID: " + id));
        }
        TipoHabitacion tipo = tipoOpt.get();

        if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
            tipo.setNombre(datos.getNombre().trim());
        }
        if (datos.getCapacidad() != null) {
            if (datos.getCapacidad() < 1 || datos.getCapacidad() > 20) {
                return ResponseEntity.badRequest().body(Map.of("error", "La capacidad debe estar entre 1 y 20 huéspedes."));
            }
            // Impedir bajar la capacidad por debajo de reservaciones activas existentes
            int maxOcupantes = reservaRepository.findMaxOcupantesEnReservasActivasPorTipo(id);
            if (datos.getCapacidad() < maxOcupantes) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "No se puede reducir la capacidad a " + datos.getCapacidad()
                                + " porque existen reservaciones activas con hasta " + maxOcupantes + " ocupantes en esta categoría."
                ));
            }
            tipo.setCapacidad(datos.getCapacidad());
        }
        if (datos.getDescripcion() != null) {
            tipo.setDescripcion(catalogoMediaValidator.validarTextoPlano(datos.getDescripcion(), "descripcion", 500));
        }
        if (datos.getImagenUrl() != null) {
            tipo.setImagenUrl(catalogoMediaValidator.validarImagenUrl(datos.getImagenUrl()));
        }
        if (datos.getPrecioBase() != null) {
            // Impedir tarifa base <= 0 al editar categoría
            if (datos.getPrecioBase().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "El precio base debe ser mayor a $0.00."));
            }
            tipo.setPrecioBase(datos.getPrecioBase());
        }
        TipoHabitacion actualizado = tipoHabitacionRepository.save(tipo);
        return ResponseEntity.ok(actualizado);
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
