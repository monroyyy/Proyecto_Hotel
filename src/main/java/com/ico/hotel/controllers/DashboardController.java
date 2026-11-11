package com.ico.hotel.controllers;

import com.ico.hotel.services.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Controlador de Métricas y Estadísticas Financieras para Gerencia y Administración.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKpis(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer hotelId) {
        return ResponseEntity.ok(dashboardService.obtenerResumenKpis(year, hotelId));
    }

    @GetMapping("/mensual-comparativo")
    public ResponseEntity<Map<String, Object>> getMensualComparativo(
            @RequestParam(required = false) String years,
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false, defaultValue = "ingresos") String metrica) {

        List<Integer> listaAnos = null;
        if (years != null && !years.isBlank()) {
            listaAnos = Arrays.stream(years.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .toList();
        }

        return ResponseEntity.ok(dashboardService.obtenerSerieMensualComparativa(listaAnos, hotelId, metrica));
    }

    @GetMapping("/por-categoria")
    public ResponseEntity<List<Map<String, Object>>> getPorCategoria(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer hotelId) {
        return ResponseEntity.ok(dashboardService.obtenerDistribucionCategorias(year, hotelId));
    }

    @GetMapping("/por-hotel")
    public ResponseEntity<List<Map<String, Object>>> getPorHotel(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(dashboardService.obtenerRendimientoHoteles(year));
    }
}
