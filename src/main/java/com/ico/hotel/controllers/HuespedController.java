package com.ico.hotel.controllers;

import com.ico.hotel.models.Huesped;
import com.ico.hotel.repository.HuespedRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Consulta de huespedes registrados (para autocompletar datos en nuevas reservaciones). */
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
}
