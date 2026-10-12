package com.ico.hotel.controllers;

import com.ico.hotel.models.Hotel;
import com.ico.hotel.repository.HotelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para Hoteles.
 * Proporciona el listado para su uso en selectores y sirve como base
 * para que el integrante responsable de la interfaz de Hoteles amplíe sus métodos.
 */
@RestController
@RequestMapping("/api/hoteles")
public class HotelController {

    @Autowired
    private HotelRepository hotelRepository;

    @GetMapping
    public List<Hotel> listarTodos() {
        return hotelRepository.findAll();
    }
}
