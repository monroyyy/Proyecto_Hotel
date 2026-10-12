package com.ico.hotel.controllers;

import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.TipoHabitacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para Tipos de Habitación.
 * Proporciona el listado para su uso en selectores y sirve como base
 * para que el integrante responsable de la interfaz de Tipos de Habitación amplíe sus métodos.
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
}
