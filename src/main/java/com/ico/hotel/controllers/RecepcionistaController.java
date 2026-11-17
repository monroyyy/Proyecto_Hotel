package com.ico.hotel.controllers;

import com.ico.hotel.models.Recepcionista;
import com.ico.hotel.repository.RecepcionistaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * @deprecated Endpoint legado de solo lectura; la identidad del operador ahora se toma del JWT en {@code ReservaService}.
 */
@Deprecated(forRemoval = false)
@RestController
@RequestMapping("/api/recepcionistas")
public class RecepcionistaController {

    @Autowired
    private RecepcionistaRepository repo;

    @GetMapping
    public List<Recepcionista> listarActivos() {
        return repo.findByActivoTrueOrderByNombreAsc();
    }
}
