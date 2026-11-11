package com.ico.hotel.tools;

import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Herramienta de IA para consultas analíticas y financieras (2020 a 2026).
 * Exclusiva para GERENTE y ADMINISTRADOR (Don Roberto y TI).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EstadisticasTool {

    private final DashboardService dashboardService;

    private static CustomUserDetails getAuthenticatedUser() {
        CustomUserDetails tl = HabitacionSearchTool.getAuthenticatedUser();
        if (tl != null) {
            return tl;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        return null;
    }

    private boolean tienePermisoEjecutivo() {
        CustomUserDetails u = getAuthenticatedUser();
        return u != null && (u.isGerente() || u.isAdmin());
    }

    @Tool(description = "Consultar el resumen financiero y métricas clave de un año (ingresos brutos, netos, ADR, RevPAR, tasa de ocupación, cancelaciones y reembolsos). EXCLUSIVO PARA GERENTE Y ADMINISTRADOR.")
    public Map<String, Object> consultarMetricasFinancierasAnuales(
            @ToolParam(description = "Año a consultar entre 2020 y 2026 (por defecto el año en curso)", required = false) Integer ano,
            @ToolParam(description = "ID del hotel específico a filtrar (opcional, null para toda la cadena)", required = false) Integer idHotel) {
        log.info("Tool invocada -> consultarMetricasFinancierasAnuales: ano={}, hotel={}", ano, idHotel);
        if (!tienePermisoEjecutivo()) {
            return Map.of("accesoRestringido", true, "mensaje", "Por políticas de privacidad, las métricas financieras y estadísticas son exclusivas para el personal directivo (Gerente y Administrador).");
        }
        return dashboardService.obtenerResumenKpis(ano, idHotel);
    }

    @Tool(description = "Comparar el desempeño histórico de dos años diferentes entre 2020 y 2026 (ingresos, ocupación o reservas). EXCLUSIVO PARA GERENTE Y ADMINISTRADOR.")
    public Map<String, Object> compararAnosHistoricos(
            @ToolParam(description = "Primer año a comparar (ej. 2021)") Integer ano1,
            @ToolParam(description = "Segundo año a comparar (ej. 2024)") Integer ano2,
            @ToolParam(description = "Métrica a comparar: 'ingresos', 'ocupacion' o 'reservas'", required = false) String metrica) {
        log.info("Tool invocada -> compararAnosHistoricos: ano1={}, ano2={}, metrica={}", ano1, ano2, metrica);
        if (!tienePermisoEjecutivo()) {
            return Map.of("accesoRestringido", true, "mensaje", "Acceso restringido a Gerencia.");
        }
        Map<String, Object> serie = dashboardService.obtenerSerieMensualComparativa(List.of(ano1, ano2), null, metrica);
        Map<String, Object> kpi1 = dashboardService.obtenerResumenKpis(ano1, null);
        Map<String, Object> kpi2 = dashboardService.obtenerResumenKpis(ano2, null);

        return Map.of(
                "comparativaMensual", serie,
                "resumenAno1", kpi1,
                "resumenAno2", kpi2
        );
    }

    @Tool(description = "Consultar el comportamiento mensual o estacionalidad de un año entre 2020 y 2026 (meses de mayor y menor ingreso u ocupación). EXCLUSIVO PARA GERENTE Y ADMINISTRADOR.")
    public Map<String, Object> consultarComportamientoMensual(
            @ToolParam(description = "Año a consultar entre 2020 y 2026") Integer ano,
            @ToolParam(description = "Métrica: 'ingresos', 'ocupacion' o 'reservas'", required = false) String metrica) {
        log.info("Tool invocada -> consultarComportamientoMensual: ano={}, metrica={}", ano, metrica);
        if (!tienePermisoEjecutivo()) {
            return Map.of("accesoRestringido", true, "mensaje", "Acceso restringido a Gerencia.");
        }
        int year = (ano != null) ? ano : 2026;
        return dashboardService.obtenerSerieMensualComparativa(List.of(year), null, metrica);
    }
}
