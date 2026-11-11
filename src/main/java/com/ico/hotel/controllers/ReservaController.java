package com.ico.hotel.controllers;

import com.ico.hotel.dto.ReservaRequest;
import com.ico.hotel.exceptions.ConflictoEstanciaException;
import com.ico.hotel.exceptions.ReglaEstanciaException;
import com.ico.hotel.exceptions.TransicionEstadoInvalidaException;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.Rol;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.ReservaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * API de reservaciones con control de acceso por rol:
 * - ADMINISTRADOR: gestiona todas las reservaciones.
 * - HUESPED: únicamente puede crear, consultar, confirmar, modificar y cancelar SUS propias reservaciones.
 */
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

    @Autowired
    private ReservaService service;
    @Autowired
    private ReservaRepository reservaRepository;

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
    public List<Reserva> listar(
            @RequestParam(required = false) String estado,
            @AuthenticationPrincipal CustomUserDetails principal) {
        List<Reserva> base;
        if (principal != null && principal.isStaff()) {
            base = reservaRepository.findAllByOrderByFechaCreacionDesc();
        } else if (principal != null) {
            base = reservaRepository.findByUsuarioOrHuespedEmail(principal.getIdUsuario(), principal.getEmail());
        } else {
            return List.of();
        }
        List<Reserva> filtradas = base.stream()
                .filter(r -> estado == null || estado.isBlank() || r.getEstado().equalsIgnoreCase(estado))
                .toList();
        service.enriquecerReservas(filtradas);
        return filtradas;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(
            @PathVariable Integer id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        Optional<Reserva> opt = reservaRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Reservación no encontrada."));
        }
        try {
            Reserva r = opt.get();
            service.validarAccesoReserva(r, principal);
            service.enriquecerReserva(r);
            return ResponseEntity.ok(r);
        } catch (AccessDeniedException ex) {
            return error(ex);
        }
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody ReservaRequest req) {
        try {
            Reserva creada = service.crear(req);
            service.enriquecerReserva(creada);
            return ResponseEntity.status(HttpStatus.CREATED).body(creada);
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/confirmar")
    public ResponseEntity<?> confirmar(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        try {
            BigDecimal anticipo = body.get("anticipo") == null ? null : new BigDecimal(body.get("anticipo").toString());
            Reserva conf = service.confirmar(id, anticipo, (String) body.get("metodoPago"));
            service.enriquecerReserva(conf);
            return ResponseEntity.ok(conf);
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/check-in")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE', 'ADMINISTRADOR')")
    public ResponseEntity<?> checkIn(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(service.checkIn(id));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/check-out")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE', 'ADMINISTRADOR')")
    public ResponseEntity<?> checkOut(@PathVariable Integer id, @RequestBody(required = false) Map<String, Object> body) {
        try {
            String metodoPagoSaldo = body != null && body.get("metodoPagoSaldo") != null
                    ? body.get("metodoPagoSaldo").toString()
                    : (body != null && body.get("metodoPago") != null ? body.get("metodoPago").toString() : null);
            return ResponseEntity.ok(service.checkOut(id, metodoPagoSaldo));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/no-show")
    @PreAuthorize("hasAnyRole('RECEPCIONISTA', 'GERENTE', 'ADMINISTRADOR')")
    public ResponseEntity<?> noShow(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(service.noShow(id));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/revertir-no-show")
    @PreAuthorize("hasAnyRole('GERENTE', 'ADMINISTRADOR')")
    public ResponseEntity<?> revertirNoShow(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(service.revertirNoShow(id));
        } catch (Exception e) {
            return error(e);
        }
    }

    @PatchMapping("/{id}/dia-extra")
    public ResponseEntity<?> extenderDiaExtra(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            int dias = 1;
            if (body != null && body.get("dias") != null) {
                dias = Integer.parseInt(body.get("dias").toString());
            }
            return ResponseEntity.ok(service.extenderDiaExtra(id, dias));
        } catch (Exception e) {
            return error(e);
        }
    }

    /** Vista previa de la política de cancelación (porcentaje y monto de reembolso). */
    @GetMapping("/{id}/reembolso")
    public ResponseEntity<?> previewReembolso(
            @PathVariable Integer id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        Optional<Reserva> opt = reservaRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Reservación no encontrada."));
        }
        try {
            Reserva r = opt.get();
            service.validarAccesoReserva(r, principal);
            return ResponseEntity.ok(Map.of(
                    "porcentaje", Reserva.CONFIRMADA.equals(r.getEstado()) ? service.porcentajeReembolso(r) : 0,
                    "monto", Reserva.CONFIRMADA.equals(r.getEstado()) ? service.montoReembolso(r) : BigDecimal.ZERO
            ));
        } catch (AccessDeniedException ex) {
            return error(ex);
        }
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

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id, @RequestBody ReservaRequest req) {
        try {
            return ResponseEntity.ok(service.actualizar(id, req));
        } catch (Exception e) {
            return error(e);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> eliminar(@PathVariable Integer id) {
        try {
            service.eliminar(id);
            return ResponseEntity.ok(Map.of("mensaje", "Reservación eliminada exitosamente."));
        } catch (Exception e) {
            return error(e);
        }
    }

    private ResponseEntity<?> error(Exception e) {
        if (e instanceof org.springframework.dao.DataIntegrityViolationException dive) {
            throw dive;
        }
        HttpStatus status = e instanceof AccessDeniedException ? HttpStatus.FORBIDDEN
                : e instanceof NoSuchElementException ? HttpStatus.NOT_FOUND
                : (e instanceof TransicionEstadoInvalidaException || e instanceof ConflictoEstanciaException) ? HttpStatus.CONFLICT
                : e instanceof ReglaEstanciaException ? HttpStatus.BAD_REQUEST
                : e instanceof IllegalStateException ? HttpStatus.CONFLICT
                : HttpStatus.BAD_REQUEST;
        String msg = e instanceof java.time.format.DateTimeParseException ? "Formato de fecha inválido." : e.getMessage();
        return ResponseEntity.status(status).body(Map.of("error", msg == null ? "Error inesperado." : msg, "status", status.value()));
    }
}
