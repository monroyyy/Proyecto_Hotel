package com.ico.hotel.controllers;

import com.ico.hotel.services.InformeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Controlador de Informes Ejecutivos Formales (Financiero, Ocupación y Cancelaciones).
 */
@RestController
@RequestMapping("/api/informes")
@RequiredArgsConstructor
public class InformeController {

    private final InformeService informeService;

    @GetMapping("/financiero")
    public ResponseEntity<Map<String, Object>> getInformeFinanciero(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String metodoPago,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(informeService.generarInformeFinanciero(inicio, fin, hotelId, page, size, estado, metodoPago, q));
    }

    @GetMapping("/ocupacion")
    public ResponseEntity<Map<String, Object>> getInformeOcupacion(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(informeService.generarInformeOcupacion(year, hotelId, inicio, fin));
    }

    @GetMapping("/cancelaciones")
    public ResponseEntity<Map<String, Object>> getInformeCancelaciones(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(informeService.generarInformeCancelaciones(year, hotelId, inicio, fin));
    }

    @GetMapping("/cuentas-por-cobrar")
    public ResponseEntity<Map<String, Object>> getInformeCuentasPorCobrar(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(informeService.generarInformeCuentasPorCobrar(year, hotelId, inicio, fin));
    }
}
