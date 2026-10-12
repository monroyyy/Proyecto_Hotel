package com.ico.hotel.controllers;

import com.ico.hotel.dto.HabitacionDTO;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.TipoHabitacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controlador REST para la gestión de Habitaciones (Interfaz principal).
 * Provee operaciones CRUD completas, actualización rápida de estado,
 * filtros avanzados y estadísticas para el panel de control.
 */
@RestController
@RequestMapping("/api/habitaciones")
public class HabitacionController {

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    /**
     * 1. Listar todas las habitaciones con filtros opcionales.
     * Soporta filtrar por hotel, tipo, estado o número.
     */
    @GetMapping
    public List<Habitacion> listarHabitaciones(
            @RequestParam(required = false) Integer idHotel,
            @RequestParam(required = false) Integer idTipo,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Integer piso
    ) {
        List<Habitacion> todas = habitacionRepository.findAll();

        return todas.stream()
                .filter(h -> idHotel == null || (h.getHotel() != null && h.getHotel().getIdHotel().equals(idHotel)))
                .filter(h -> idTipo == null || (h.getTipoHabitacion() != null && h.getTipoHabitacion().getIdTipo().equals(idTipo)))
                .filter(h -> estado == null || estado.isBlank() || h.getEstado().equalsIgnoreCase(estado))
                .filter(h -> piso == null || (h.getPiso() != null && h.getPiso().equals(piso)))
                .toList();
    }

    /**
     * 2. Obtener una habitación por su identificador único (ID).
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }
        return ResponseEntity.ok(habitacionOpt.get());
    }

    /**
     * 3. Registrar una nueva habitación.
     * Valida que el hotel y el tipo de habitación existan en la base de datos.
     */
    @PostMapping
    public ResponseEntity<?> crearHabitacion(@RequestBody HabitacionDTO dto) {
        if (dto.getNumero() == null || dto.getNumero().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El número de habitación es obligatorio."));
        }
        if (dto.getIdHotel() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar un hotel válido."));
        }
        if (dto.getIdTipo() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar un tipo de habitación válido."));
        }

        Optional<Hotel> hotelOpt = hotelRepository.findById(dto.getIdHotel());
        if (hotelOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El hotel seleccionado no existe."));
        }

        Optional<TipoHabitacion> tipoOpt = tipoHabitacionRepository.findById(dto.getIdTipo());
        if (tipoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El tipo de habitación seleccionado no existe."));
        }

        Habitacion nueva = new Habitacion();
        nueva.setNumero(dto.getNumero().trim());
        nueva.setPiso(dto.getPiso() != null ? dto.getPiso() : 1);
        nueva.setEstado(dto.getEstado() != null && !dto.getEstado().isBlank() ? dto.getEstado() : "Disponible");
        nueva.setHotel(hotelOpt.get());
        nueva.setTipoHabitacion(tipoOpt.get());

        Habitacion guardada = habitacionRepository.save(nueva);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardada);
    }

    /**
     * 4. Actualizar una habitación existente por ID.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarHabitacion(@PathVariable Integer id, @RequestBody HabitacionDTO dto) {
        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }

        Habitacion habitacion = habitacionOpt.get();

        if (dto.getNumero() != null && !dto.getNumero().trim().isEmpty()) {
            habitacion.setNumero(dto.getNumero().trim());
        }
        if (dto.getPiso() != null) {
            habitacion.setPiso(dto.getPiso());
        }
        if (dto.getEstado() != null && !dto.getEstado().isBlank()) {
            habitacion.setEstado(dto.getEstado());
        }

        if (dto.getIdHotel() != null) {
            Optional<Hotel> hotelOpt = hotelRepository.findById(dto.getIdHotel());
            if (hotelOpt.isPresent()) {
                habitacion.setHotel(hotelOpt.get());
            }
        }

        if (dto.getIdTipo() != null) {
            Optional<TipoHabitacion> tipoOpt = tipoHabitacionRepository.findById(dto.getIdTipo());
            if (tipoOpt.isPresent()) {
                habitacion.setTipoHabitacion(tipoOpt.get());
            }
        }

        Habitacion actualizada = habitacionRepository.save(habitacion);
        return ResponseEntity.ok(actualizada);
    }

    /**
     * 5. Cambio rápido de estado (Disponible, Ocupada, Mantenimiento).
     * Ideal para acciones de un solo clic desde la tabla de habitaciones.
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        String nuevoEstado = body.get("estado");
        if (nuevoEstado == null || nuevoEstado.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'estado' es requerido."));
        }

        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }

        Habitacion habitacion = habitacionOpt.get();
        habitacion.setEstado(nuevoEstado.trim());
        Habitacion actualizada = habitacionRepository.save(habitacion);

        return ResponseEntity.ok(actualizada);
    }

    /**
     * 6. Eliminar una habitación por ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarHabitacion(@PathVariable Integer id) {
        if (!habitacionRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }

        habitacionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("mensaje", "Habitación eliminada exitosamente", "id", id));
    }

    /**
     * 7. Resumen estadístico para tarjetas informativas (KPIs) en la interfaz.
     */
    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> obtenerResumen() {
        List<Habitacion> todas = habitacionRepository.findAll();
        long total = todas.size();
        long disponibles = todas.stream().filter(h -> "Disponible".equalsIgnoreCase(h.getEstado())).count();
        long ocupadas = todas.stream().filter(h -> "Ocupada".equalsIgnoreCase(h.getEstado())).count();
        long mantenimiento = todas.stream().filter(h -> "Mantenimiento".equalsIgnoreCase(h.getEstado())).count();

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("total", total);
        resumen.put("disponibles", disponibles);
        resumen.put("ocupadas", ocupadas);
        resumen.put("mantenimiento", mantenimiento);

        return ResponseEntity.ok(resumen);
    }
}
