package com.ico.hotel.services;

import com.ico.hotel.models.*;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.repository.TipoHabitacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio de inteligencia de negocios y cálculos financieros para el Gerente (Don Roberto).
 * Implementa métricas hoteleras estándar: ADR, RevPAR, Ocupación %, Ingresos Brutos/Netos,
 * Balances de Anticipos, Reembolsos y Comparativas Multi-anuales (2020 a 2026).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final HotelRepository hotelRepository;
    private final TipoHabitacionRepository tipoHabitacionRepository;

    /**
     * Resumen de KPIs ejecutivos para un año y hotel específicos (con comparativa vs año anterior).
     */
    public Map<String, Object> obtenerResumenKpis(Integer ano, Integer idHotel) {
        int year = (ano != null && ano >= 2020 && ano <= 2030) ? ano : LocalDate.now().getYear();

        LocalDate inicio = LocalDate.of(year, 1, 1);
        LocalDate fin = LocalDate.of(year, 12, 31);

        List<Reserva> reservasAno = filtrarReservasPorHotelYFechas(inicio, fin, idHotel);
        List<Habitacion> habitaciones = filtrarHabitacionesPorHotel(idHotel);

        int totalHabitaciones = Math.max(habitaciones.size(), 1);
        boolean esBisiesto = inicio.isLeapYear();
        int diasAno = esBisiesto ? 366 : 365;
        int capacidadTotalNoches = totalHabitaciones * diasAno;

        // 1. Cálculos de Ingresos y Flujo Financiero
        BigDecimal ingresosHospedaje = BigDecimal.ZERO;
        BigDecimal penalizacionesRetenidas = BigDecimal.ZERO;
        BigDecimal reembolsosDevueltos = BigDecimal.ZERO;
        BigDecimal anticiposCobrados = BigDecimal.ZERO;
        BigDecimal saldosLiquidados = BigDecimal.ZERO;
        BigDecimal saldosPendientes = BigDecimal.ZERO;

        int nochesVendidas = 0;
        int conteoConfirmadasOcupadas = 0;
        int conteoFinalizadas = 0;
        int conteoCanceladas = 0;
        int conteoNoShow = 0;
        int conteoPreReservas = 0;

        for (Reserva r : reservasAno) {
            String est = r.getEstado() != null ? r.getEstado() : "";

            switch (est) {
                case Reserva.FINALIZADA -> {
                    conteoFinalizadas++;
                    nochesVendidas += (r.getNoches() != null ? r.getNoches() : 1);
                    BigDecimal t = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
                    ingresosHospedaje = ingresosHospedaje.add(t);
                    anticiposCobrados = anticiposCobrados.add(r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO);
                    saldosLiquidados = saldosLiquidados.add(t.subtract(r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO));
                }
                case Reserva.CONFIRMADA, Reserva.OCUPADA -> {
                    conteoConfirmadasOcupadas++;
                    nochesVendidas += (r.getNoches() != null ? r.getNoches() : 1);
                    BigDecimal t = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
                    ingresosHospedaje = ingresosHospedaje.add(t);
                    anticiposCobrados = anticiposCobrados.add(r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO);
                    saldosPendientes = saldosPendientes.add(r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO);
                }
                case Reserva.PRE_RESERVA -> {
                    conteoPreReservas++;
                    saldosPendientes = saldosPendientes.add(r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO);
                }
                case Reserva.CANCELADA -> {
                    conteoCanceladas++;
                    BigDecimal reemb = r.getMontoReembolso() != null ? r.getMontoReembolso() : BigDecimal.ZERO;
                    reembolsosDevueltos = reembolsosDevueltos.add(reemb);
                    BigDecimal saldoRetenido = r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO;
                    penalizacionesRetenidas = penalizacionesRetenidas.add(saldoRetenido);
                }
                case Reserva.NO_SHOW -> {
                    conteoNoShow++;
                    // El anticipo completo del No-Show se retiene como penalización
                    BigDecimal ant = r.getAnticipo() != null ? r.getAnticipo() : (r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO);
                    penalizacionesRetenidas = penalizacionesRetenidas.add(ant);
                }
            }
        }

        BigDecimal ingresosBrutos = ingresosHospedaje.add(penalizacionesRetenidas);
        BigDecimal ingresosNetos = ingresosBrutos.subtract(reembolsosDevueltos);

        // 2. Métricas Hoteleras (ADR, RevPAR, Ocupación %)
        double ocupacionPorcentaje = capacidadTotalNoches > 0
                ? ((double) nochesVendidas / capacidadTotalNoches) * 100.0
                : 0.0;
        ocupacionPorcentaje = Math.min(Math.round(ocupacionPorcentaje * 10.0) / 10.0, 100.0);

        BigDecimal adr = nochesVendidas > 0
                ? ingresosHospedaje.divide(BigDecimal.valueOf(nochesVendidas), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal revpar = capacidadTotalNoches > 0
                ? ingresosHospedaje.divide(BigDecimal.valueOf(capacidadTotalNoches), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        int totalReservas = reservasAno.size();
        double tasaCancelacion = totalReservas > 0
                ? ((double) conteoCanceladas / totalReservas) * 100.0
                : 0.0;
        tasaCancelacion = Math.round(tasaCancelacion * 10.0) / 10.0;

        double tasaNoShow = totalReservas > 0
                ? ((double) conteoNoShow / totalReservas) * 100.0
                : 0.0;
        tasaNoShow = Math.round(tasaNoShow * 10.0) / 10.0;

        // 3. Comparativa vs Año Anterior (para badges de incremento/decremento)
        LocalDate inicioPrev = LocalDate.of(year - 1, 1, 1);
        LocalDate finPrev = LocalDate.of(year - 1, 12, 31);
        List<Reserva> reservasPrev = filtrarReservasPorHotelYFechas(inicioPrev, finPrev, idHotel);

        BigDecimal ingresosPrev = BigDecimal.ZERO;
        int nochesPrev = 0;
        for (Reserva rp : reservasPrev) {
            String est = rp.getEstado() != null ? rp.getEstado() : "";
            if (Reserva.FINALIZADA.equals(est) || Reserva.CONFIRMADA.equals(est) || Reserva.OCUPADA.equals(est)) {
                ingresosPrev = ingresosPrev.add(rp.getTotal() != null ? rp.getTotal() : BigDecimal.ZERO);
                nochesPrev += (rp.getNoches() != null ? rp.getNoches() : 1);
            }
        }

        double cambioIngresosPct = 0.0;
        if (ingresosPrev.compareTo(BigDecimal.ZERO) > 0) {
            cambioIngresosPct = ((ingresosBrutos.doubleValue() - ingresosPrev.doubleValue()) / ingresosPrev.doubleValue()) * 100.0;
            cambioIngresosPct = Math.round(cambioIngresosPct * 10.0) / 10.0;
        }

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("ano", year);
        kpis.put("idHotel", idHotel);
        kpis.put("totalHabitaciones", totalHabitaciones);
        kpis.put("diasPeriodo", diasAno);
        kpis.put("nochesVendidas", nochesVendidas);
        kpis.put("capacidadTotalNoches", capacidadTotalNoches);

        // Financieros
        kpis.put("ingresosBrutos", ingresosBrutos.setScale(2, RoundingMode.HALF_UP));
        kpis.put("reembolsosDevueltos", reembolsosDevueltos.setScale(2, RoundingMode.HALF_UP));
        kpis.put("penalizacionesRetenidas", penalizacionesRetenidas.setScale(2, RoundingMode.HALF_UP));
        kpis.put("ingresosNetos", ingresosNetos.setScale(2, RoundingMode.HALF_UP));
        kpis.put("anticiposCobrados", anticiposCobrados.setScale(2, RoundingMode.HALF_UP));
        kpis.put("saldosLiquidados", saldosLiquidados.setScale(2, RoundingMode.HALF_UP));
        kpis.put("saldosPendientes", saldosPendientes.setScale(2, RoundingMode.HALF_UP));

        // Ratios Hoteleros
        kpis.put("ocupacionPorcentaje", ocupacionPorcentaje);
        kpis.put("adr", adr);
        kpis.put("revpar", revpar);

        // Volúmenes y Tasas
        kpis.put("totalReservas", totalReservas);
        kpis.put("finalizadas", conteoFinalizadas);
        kpis.put("confirmadasOcupadas", conteoConfirmadasOcupadas);
        kpis.put("preReservas", conteoPreReservas);
        kpis.put("canceladas", conteoCanceladas);
        kpis.put("noShows", conteoNoShow);
        kpis.put("tasaCancelacion", tasaCancelacion);
        kpis.put("tasaNoShow", tasaNoShow);

        // Comparativa
        kpis.put("cambioIngresosPct", cambioIngresosPct);
        kpis.put("ingresosAnoAnterior", ingresosPrev.setScale(2, RoundingMode.HALF_UP));

        return kpis;
    }

    /**
     * Serie mensual temporal ($E, F, M, A, M, \dots, D$) para múltiples años (2020 a 2026),
     * alimentando la gráfica interactiva del Dashboard como se ilustró en el pizarrón.
     */
    public Map<String, Object> obtenerSerieMensualComparativa(List<Integer> anos, Integer idHotel, String metrica) {
        List<Integer> anosAProcesar = (anos != null && !anos.isEmpty())
                ? anos
                : List.of(2020, 2021, 2022, 2023, 2024, 2025, 2026);

        String metricaSeleccionada = (metrica != null && !metrica.isBlank())
                ? metrica.toLowerCase().trim()
                : "ingresos"; // opciones: 'ingresos', 'ocupacion', 'reservas'

        List<Habitacion> habitaciones = filtrarHabitacionesPorHotel(idHotel);
        int totalHabitaciones = Math.max(habitaciones.size(), 1);

        Map<String, List<Double>> seriesPorAno = new LinkedHashMap<>();

        for (Integer a : anosAProcesar) {
            LocalDate inicio = LocalDate.of(a, 1, 1);
            LocalDate fin = LocalDate.of(a, 12, 31);
            List<Reserva> reservasAno = filtrarReservasPorHotelYFechas(inicio, fin, idHotel);

            // 12 meses
            List<Double> valoresMes = new ArrayList<>(Collections.nCopies(12, 0.0));

            // Agrupar por mes
            for (int m = 1; m <= 12; m++) {
                final int mesActual = m;
                YearMonth ym = YearMonth.of(a, m);
                int diasEnMes = ym.lengthOfMonth();
                int capacidadMes = totalHabitaciones * diasEnMes;

                List<Reserva> resMes = reservasAno.stream()
                        .filter(r -> r.getFechaEntrada() != null && r.getFechaEntrada().getMonthValue() == mesActual)
                        .toList();

                double valor = 0.0;
                switch (metricaSeleccionada) {
                    case "ocupacion" -> {
                        int noches = resMes.stream()
                                .filter(r -> Reserva.FINALIZADA.equals(r.getEstado())
                                        || Reserva.CONFIRMADA.equals(r.getEstado())
                                        || Reserva.OCUPADA.equals(r.getEstado()))
                                .mapToInt(r -> r.getNoches() != null ? r.getNoches() : 1)
                                .sum();
                        double oc = capacidadMes > 0 ? ((double) noches / capacidadMes) * 100.0 : 0.0;
                        valor = Math.min(Math.round(oc * 10.0) / 10.0, 100.0);
                    }
                    case "reservas" -> valor = resMes.size();
                    default -> {
                        double totalIngresosMes = resMes.stream()
                                .filter(r -> Reserva.FINALIZADA.equals(r.getEstado())
                                        || Reserva.CONFIRMADA.equals(r.getEstado())
                                        || Reserva.OCUPADA.equals(r.getEstado()))
                                .map(r -> r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .doubleValue();

                        // Sumar penalizaciones de cancelaciones y no-shows del mes
                        double penalizacionesMes = resMes.stream()
                                .filter(r -> Reserva.CANCELADA.equals(r.getEstado()) || Reserva.NO_SHOW.equals(r.getEstado()))
                                .map(r -> {
                                    if (Reserva.NO_SHOW.equals(r.getEstado())) {
                                        return r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
                                    }
                                    return r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO;
                                })
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .doubleValue();

                        valor = Math.round((totalIngresosMes + penalizacionesMes) * 100.0) / 100.0;
                    }
                }

                valoresMes.set(m - 1, valor);
            }

            seriesPorAno.put(String.valueOf(a), valoresMes);
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("metrica", metricaSeleccionada);
        respuesta.put("meses", List.of("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"));
        respuesta.put("mesesCortos", List.of("E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"));
        respuesta.put("anos", anosAProcesar);
        respuesta.put("series", seriesPorAno);
        return respuesta;
    }

    /**
     * Distribución de ingresos y aforos por categoría de habitación.
     */
    public List<Map<String, Object>> obtenerDistribucionCategorias(Integer ano, Integer idHotel) {
        int year = (ano != null) ? ano : LocalDate.now().getYear();
        LocalDate inicio = LocalDate.of(year, 1, 1);
        LocalDate fin = LocalDate.of(year, 12, 31);

        List<Reserva> reservas = filtrarReservasPorHotelYFechas(inicio, fin, idHotel);
        List<TipoHabitacion> tipos = tipoHabitacionRepository.findAll();

        BigDecimal granTotalIngresos = reservas.stream()
                .filter(r -> Reserva.FINALIZADA.equals(r.getEstado()) || Reserva.CONFIRMADA.equals(r.getEstado()))
                .map(r -> r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double totalDouble = Math.max(granTotalIngresos.doubleValue(), 1.0);

        List<Map<String, Object>> lista = new ArrayList<>();
        for (TipoHabitacion t : tipos) {
            List<Reserva> resTipo = reservas.stream()
                    .filter(r -> r.getHabitacion() != null
                            && r.getHabitacion().getTipoHabitacion() != null
                            && Objects.equals(r.getHabitacion().getTipoHabitacion().getIdTipo(), t.getIdTipo()))
                    .toList();

            BigDecimal ingresosTipo = resTipo.stream()
                    .filter(r -> Reserva.FINALIZADA.equals(r.getEstado()) || Reserva.CONFIRMADA.equals(r.getEstado()))
                    .map(r -> r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int nochesTipo = resTipo.stream()
                    .filter(r -> Reserva.FINALIZADA.equals(r.getEstado()) || Reserva.CONFIRMADA.equals(r.getEstado()))
                    .mapToInt(r -> r.getNoches() != null ? r.getNoches() : 1)
                    .sum();

            double participacion = (ingresosTipo.doubleValue() / totalDouble) * 100.0;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idTipo", t.getIdTipo());
            item.put("nombre", t.getNombre());
            item.put("capacidad", t.getCapacidad());
            item.put("precioBase", t.getPrecioBase());
            item.put("ingresos", ingresosTipo.setScale(2, RoundingMode.HALF_UP));
            item.put("noches", nochesTipo);
            item.put("totalReservas", resTipo.size());
            item.put("participacionPct", Math.round(participacion * 10.0) / 10.0);
            lista.add(item);
        }

        return lista;
    }

    /**
     * Comparativa de rendimiento entre los diferentes hoteles de la cadena.
     */
    public List<Map<String, Object>> obtenerRendimientoHoteles(Integer ano) {
        int year = (ano != null) ? ano : LocalDate.now().getYear();
        LocalDate inicio = LocalDate.of(year, 1, 1);
        LocalDate fin = LocalDate.of(year, 12, 31);

        List<Hotel> hoteles = hotelRepository.findAll();
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Hotel h : hoteles) {
            Map<String, Object> kpisHotel = obtenerResumenKpis(year, h.getIdHotel());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idHotel", h.getIdHotel());
            item.put("nombre", h.getNombre());
            item.put("ciudad", h.getCiudad());
            item.put("ingresosBrutos", kpisHotel.get("ingresosBrutos"));
            item.put("ingresosNetos", kpisHotel.get("ingresosNetos"));
            item.put("ocupacionPorcentaje", kpisHotel.get("ocupacionPorcentaje"));
            item.put("adr", kpisHotel.get("adr"));
            item.put("revpar", kpisHotel.get("revpar"));
            item.put("totalReservas", kpisHotel.get("totalReservas"));
            item.put("tasaCancelacion", kpisHotel.get("tasaCancelacion"));
            resultado.add(item);
        }

        return resultado;
    }

    private List<Reserva> filtrarReservasPorHotelYFechas(LocalDate inicio, LocalDate fin, Integer idHotel) {
        return reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(inicio, fin).stream()
                .filter(r -> {
                    if (idHotel == null) return true;
                    return r.getHabitacion() != null
                            && r.getHabitacion().getHotel() != null
                            && Objects.equals(r.getHabitacion().getHotel().getIdHotel(), idHotel);
                })
                .toList();
    }

    private List<Habitacion> filtrarHabitacionesPorHotel(Integer idHotel) {
        List<Habitacion> todas = habitacionRepository.findAll();
        if (idHotel == null) return todas;
        return todas.stream()
                .filter(h -> h.getHotel() != null && Objects.equals(h.getHotel().getIdHotel(), idHotel))
                .toList();
    }
}
