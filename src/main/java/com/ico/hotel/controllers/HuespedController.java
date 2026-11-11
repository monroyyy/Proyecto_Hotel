package com.ico.hotel.controllers;

import com.ico.hotel.models.Huesped;
import com.ico.hotel.repository.HuespedRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Consulta y registro de huéspedes (autocompletado y validación de unicidad por correo). */
@RestController
@RequestMapping("/api/huespedes")
public class HuespedController {

    @Autowired
    private HuespedRepository repo;

    /** Busca por nombre, correo o telefono. Sin termino devuelve los mas recientes. */
    @GetMapping
    public List<Huesped> buscar(@RequestParam(required = false, defaultValue = "") String q) {
        String t = q.trim().toLowerCase();
        String digitos = t.replaceAll("\\D", "");
        return repo.findAll().stream()
                .filter(h -> t.isEmpty()
                        || (h.getNombre() != null && h.getNombre().toLowerCase().contains(t))
                        || (h.getEmail() != null && h.getEmail().toLowerCase().contains(t))
                        || (!digitos.isEmpty() && h.getTelefono() != null && h.getTelefono().contains(digitos)))
                .sorted((a, b) -> b.getIdHuesped().compareTo(a.getIdHuesped()))
                .limit(15)
                .toList();
    }

    /** Registra un nuevo huésped validando que el correo electrónico no esté repetido. */
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Huesped req) {
        if (req.getNombre() == null || req.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del huésped es obligatorio."));
        }
        if (req.getEmail() == null || !req.getEmail().trim().matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "El correo electrónico del huésped no tiene un formato válido."));
        }
        String emailNorm = req.getEmail().trim().toLowerCase();
        if (repo.existsByEmailIgnoreCase(emailNorm)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Ya existe un huésped registrado con ese correo electrónico.",
                    "status", HttpStatus.CONFLICT.value()
            ));
        }

        Huesped h = new Huesped();
        h.setNombre(req.getNombre().trim());
        h.setEmail(emailNorm);
        if (req.getTelefono() != null && !req.getTelefono().isBlank()) {
            String tel = req.getTelefono().replaceAll("\\D", "");
            if (!tel.matches("^\\d{10}$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "El teléfono debe tener exactamente 10 dígitos."));
            }
            h.setTelefono(tel);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(h));
    }
}
