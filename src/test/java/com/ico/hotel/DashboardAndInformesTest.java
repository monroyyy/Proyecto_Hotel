package com.ico.hotel;

import com.ico.hotel.services.DashboardService;
import com.ico.hotel.services.InformeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DashboardAndInformesTest extends AbstractMysqlTestcontainerTest {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private InformeService informeService;

    @Test
    @DisplayName("DashboardService calcula KPIs financieros y hoteleros correctamente")
    void testDashboardKpis() {
        Map<String, Object> kpis = dashboardService.obtenerResumenKpis(2025, null);
        assertNotNull(kpis, "Los KPIs no deben ser nulos");
        assertEquals(2025, kpis.get("ano"));
        assertTrue(kpis.containsKey("ingresosBrutos"));
        assertTrue(kpis.containsKey("ingresosNetos"));
        assertTrue(kpis.containsKey("ocupacionPorcentaje"));
        assertTrue(kpis.containsKey("adr"));
        assertTrue(kpis.containsKey("revpar"));
        assertTrue(kpis.containsKey("totalReservas"));

        double adr = ((Number) kpis.get("adr")).doubleValue();
        double revpar = ((Number) kpis.get("revpar")).doubleValue();
        double ocupacion = ((Number) kpis.get("ocupacionPorcentaje")).doubleValue();

        assertTrue(adr >= 0.0, "ADR debe ser no negativo");
        assertTrue(revpar >= 0.0, "RevPAR debe ser no negativo");
        assertTrue(ocupacion >= 0.0 && ocupacion <= 100.0, "Ocupación debe ser un porcentaje válido");
    }

    @Test
    @DisplayName("DashboardService genera serie comparativa multianual 2020-2026 con 12 meses por año")
    void testComparativaMultianual() {
        List<Integer> anios = List.of(2020, 2021, 2022, 2023, 2024, 2025, 2026);
        Map<String, Object> comparativa = dashboardService.obtenerSerieMensualComparativa(anios, null, "ingresos");

        assertNotNull(comparativa);
        assertTrue(comparativa.containsKey("meses"));
        @SuppressWarnings("unchecked")
        List<String> meses = (List<String>) comparativa.get("meses");
        assertEquals(12, meses.size(), "Debe contener los 12 meses (E, F, M, A, M...)");

        @SuppressWarnings("unchecked")
        Map<String, List<Double>> series = (Map<String, List<Double>>) comparativa.get("series");
        assertNotNull(series);

        for (Integer anio : anios) {
            String key = anio.toString();
            assertTrue(series.containsKey(key), "Debe contener la serie para el año " + key);
            assertEquals(12, series.get(key).size(), "Cada serie anual debe tener 12 valores mensuales");
        }
    }

    @Test
    @DisplayName("InformeService genera reporte financiero ejecutivo con desglose")
    void testInformeFinanciero() {
        LocalDate inicio = LocalDate.of(2025, 1, 1);
        LocalDate fin = LocalDate.of(2025, 12, 31);
        Map<String, Object> reporte = informeService.generarInformeFinanciero(inicio, fin, null);
        assertNotNull(reporte);
        assertTrue(reporte.containsKey("titulo"));
        assertTrue(reporte.containsKey("granTotalContratado"));
        assertTrue(reporte.containsKey("ingresosNetosCaja"));
        assertTrue(reporte.containsKey("filas"));
    }

    @Test
    @DisplayName("InformeService genera reporte de ocupación y cancelaciones")
    void testInformeOcupacionYCancelaciones() {
        Map<String, Object> ocupacion = informeService.generarInformeOcupacion(2025, null);
        assertNotNull(ocupacion);
        assertTrue(ocupacion.containsKey("titulo"));
        assertTrue(ocupacion.containsKey("ocupacionGlobalPct"));
        assertTrue(ocupacion.containsKey("totalNochesVendidas"));
        assertTrue(ocupacion.containsKey("filas"));

        Map<String, Object> cancelaciones = informeService.generarInformeCancelaciones(2025, null);
        assertNotNull(cancelaciones);
        assertTrue(cancelaciones.containsKey("titulo"));
        assertTrue(cancelaciones.containsKey("totalCasos"));
        assertTrue(cancelaciones.containsKey("totalReembolsado"));
        assertTrue(cancelaciones.containsKey("totalPenalizacionesRetenidas"));
        assertTrue(cancelaciones.containsKey("filas"));
    }
}
