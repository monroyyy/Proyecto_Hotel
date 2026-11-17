package com.ico.hotel.config;

import com.ico.hotel.exceptions.ConflictoEstanciaException;
import com.ico.hotel.exceptions.ReglaEstanciaException;
import com.ico.hotel.exceptions.TransicionEstadoInvalidaException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Manejador global de excepciones para estandarizar los códigos HTTP:
 * 400 (datos inválidos), 401 (no autenticado), 403 (sin permiso / no verificado), 404 (no encontrado), 409 (conflicto/duplicado).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> erroresCampos = new LinkedHashMap<>();
        String primerMensaje = "Datos de entrada inválidos.";
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            erroresCampos.putIfAbsent(fe.getField(), fe.getDefaultMessage());
            if ("Datos de entrada inválidos.".equals(primerMensaje) && fe.getDefaultMessage() != null) {
                primerMensaje = fe.getDefaultMessage();
            }
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", primerMensaje);
        body.put("detalles", erroresCampos);
        body.put("status", HttpStatus.BAD_REQUEST.value());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        String msg = ex.getMessage() != null && !ex.getMessage().equalsIgnoreCase("Access Denied")
                ? ex.getMessage()
                : "No tiene permisos para realizar esta acción.";
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", msg,
                "status", HttpStatus.FORBIDDEN.value()
        ));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", ex.getMessage() != null ? ex.getMessage() : "Credenciales inválidas.",
                "status", HttpStatus.UNAUTHORIZED.value()
        ));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", ex.getMessage() != null ? ex.getMessage() : "Recurso no encontrado.",
                "status", HttpStatus.NOT_FOUND.value()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", ex.getMessage() != null ? ex.getMessage() : "Solicitud inválida.",
                "status", HttpStatus.BAD_REQUEST.value()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String param = ex.getName() != null ? ex.getName() : "parámetro";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Valor inválido para el parámetro '" + param + "'.",
                "status", HttpStatus.BAD_REQUEST.value()
        ));
    }

    @ExceptionHandler({TransicionEstadoInvalidaException.class, ConflictoEstanciaException.class})
    public ResponseEntity<Map<String, Object>> handleEstanciaConflict(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", ex.getMessage() != null ? ex.getMessage() : "Conflicto de estado o disponibilidad.",
                "status", HttpStatus.CONFLICT.value()
        ));
    }

    @ExceptionHandler(ReglaEstanciaException.class)
    public ResponseEntity<Map<String, Object>> handleReglaEstancia(ReglaEstanciaException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", ex.getMessage() != null ? ex.getMessage() : "Regla operativa de estancia incumplida.",
                "status", HttpStatus.BAD_REQUEST.value()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String causa = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : "";
        String lower = causa != null ? causa.toLowerCase() : "";
        String mensaje;
        if (lower.contains("uk_habitacion_hotel_numero")) {
            mensaje = "Ya existe una habitación con ese número en este hotel.";
        } else if (lower.contains("uk_reserva_folio")) {
            mensaje = "Ya existe una reservación registrada con ese folio.";
        } else if (lower.contains("uk_hotel_email")) {
            mensaje = "Ya existe un hotel registrado con ese correo electrónico.";
        } else if (lower.contains("uk_hotel_telefono")) {
            mensaje = "Ya existe un hotel registrado con ese número telefónico.";
        } else if (lower.contains("uk_huesped_email")) {
            mensaje = "Ya existe un huésped registrado con ese correo electrónico.";
        } else if (lower.contains("uk_usuario_email")) {
            mensaje = "Ya existe una cuenta registrada con ese correo electrónico.";
        } else if (lower.contains("duplicate entry") || lower.contains("unique")) {
            mensaje = "El registro ya existe o infringe una restricción de unicidad.";
        } else {
            mensaje = "No se pudo completar la operación por conflicto de integridad en base de datos.";
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", mensaje,
                "status", HttpStatus.CONFLICT.value()
        ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> handleDataAccess(DataAccessException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "No fue posible persistir la operación en base de datos.",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
        ));
    }
}
