package com.ico.hotel.controllers;

import com.ico.hotel.dto.ReservaRequest;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.services.ReservaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * API para la interfaz del recepcionista: disponibilidad, cotización y ciclo de vida de reservas.
 */
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

    @Autowired
    private ReservaService service;
    @Autowired
    private ReservaRepository reservaRepository;
    @Autowired
    private HabitacionRepository habitacionRepository;

    @GetMapping("/disponibilidad")
    public ResponseEntity<?> disponibilidad(
            @RequestParam(required = false) Integer idHotel,
            @RequestParam String fechaEntrada,
            @RequestParam String fechaSalida,
            @RequestParam(defaultValue = "1") Integer adultos,
            @RequestParam(defaultValue = "0") Integer ninos,
            @RequestParam(defaultValue = "false") Boolean camaExtra,
            @RequestParam(defaultValue = "false") Boolean cuna,
            @RequestParam(defaultValue = "false") Boolean plantaBaja) {
        try {
            return ResponseEntity.ok(service.buscarDisponibles(idHotel, LocalDate.parse(fechaEntrada),
                    LocalDate.parse(fechaSalida), adultos + ninos, camaExtra, plantaBaja, cuna));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping
    public List<Reserva> listar(@RequestParam(required = false) String estado) {
        service.expirarPreReservas();
        return reservaRepository.findAllByOrderByFechaCreacionDesc().stream()
                .filter(r -> estado == null || estado.isBlank() || r.getEstado().equalsIgnoreCase(estado))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Integer id) {
        return reservaRepository.findById(id).<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Reservación no encontrada.")));
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody ReservaRequest req) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(req));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/confirmar")
    public ResponseEntity<?> confirmar(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        try {
            BigDecimal anticipo = body.get("anticipo") == null ? null : new BigDecimal(body.get("anticipo").toString());
            return ResponseEntity.ok(service.confirmar(id, anticipo, (String) body.get("metodoPago")));
        } catch (Exception e) {
            return error(e);
        }
    }

    /** Vista previa de la política de cancelación (porcentaje y monto de reembolso). */
    @GetMapping("/{id}/reembolso")
    public ResponseEntity<?> previewReembolso(@PathVariable Integer id) {
        return reservaRepository.findById(id).<ResponseEntity<?>>map(r -> ResponseEntity.ok(Map.of(
                "porcentaje", Reserva.CONFIRMADA.equals(r.getEstado()) ? service.porcentajeReembolso(r) : 0,
                "monto", Reserva.CONFIRMADA.equals(r.getEstado()) ? service.montoReembolso(r) : BigDecimal.ZERO)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Reservación no encontrada.")));
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelar(@PathVariable Integer id, @RequestBody(required = false) Map<String, String> body) {
        Map<String, String> b = body == null ? Map.of() : body;
        try {
            return ResponseEntity.ok(service.cancelar(id, b.get("titular"), b.get("banco"), b.get("clabe")));
        } catch (Exception e) {
            return error(e);
        }
    }

    private ResponseEntity<?> error(Exception e) {
        HttpStatus status = e instanceof NoSuchElementException ? HttpStatus.NOT_FOUND
                : e instanceof IllegalStateException ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
        String msg = e instanceof java.time.format.DateTimeParseException ? "Formato de fecha inválido." : e.getMessage();
        return ResponseEntity.status(status).body(Map.of("error", msg == null ? "Error inesperado." : msg));
    }
}
