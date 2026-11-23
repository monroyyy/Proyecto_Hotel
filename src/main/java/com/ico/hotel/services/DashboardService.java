package com.ico.hotel.services;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.repository.TipoHabitacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

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

    @Autowired(required = false)
    private Clock clock;

    private Clock clockActual() {
        return clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
    }

    /**
     * Resumen de KPIs ejecutivos para un año y hotel específicos (solo hoteles activos por defecto).
     */
    public Map<String, Object> obtenerResumenKpis(Integer ano, Integer idHotel) {
        return obtenerResumenKpis(ano, idHotel, false);
    }

    public Map<String, Object> obtenerResumenKpis(Integer ano, Integer idHotel, boolean incluirInactivos) {
        int year = (ano != null && ano >= 2020 && ano <= 2030) ? ano : LocalDate.now(clockActual()).getYear();

        LocalDate inicio = LocalDate.of(year, 1, 1);
        LocalDate fin = LocalDate.of(year, 12, 31);

        List<Reserva> reservasAno = filtrarReservasPorHotelYFechas(inicio, fin, idHotel, incluirInactivos);
        List<Habitacion> habitaciones = filtrarHabitacionesPorHotel(idHotel, incluirInactivos);

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
        List<Reserva> reservasPrev = filtrarReservasPorHotelYFechas(inicioPrev, finPrev, idHotel, incluirInactivos);

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
        kpis.put("incluirInactivos", incluirInactivos);
        kpis.put("totalHabitaciones", habitaciones.size());
        kpis.put("diasPeriodo", diasAno);
        kpis.put("nochesVendidas", nochesVendidas);
        kpis.put("capacidadTotalNoches", capacidadTotalNoches);

        // Financieros
        kpis.put("ingresosHospedaje", ingresosHospedaje.setScale(2, RoundingMode.HALF_UP));
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

        // 4. Desglose por Método de Pago (cobros efectivos del periodo)
        Map<String, BigDecimal> montoPorMetodo = new LinkedHashMap<>();
        Map<String, Integer> opsPorMetodo = new LinkedHashMap<>();
        List<String> ordenMetodos = List.of("TARJETA_CREDITO", "TRANSFERENCIA", "TARJETA_DEBITO", "EFECTIVO");
        for (String cod : ordenMetodos) {
            montoPorMetodo.put(cod, BigDecimal.ZERO);
            opsPorMetodo.put(cod, 0);
        }
        long sumaDiasAnticipacion = 0;
        int conteoConAnticipacion = 0;

        for (Reserva r : reservasAno) {
            String est = r.getEstado() != null ? r.getEstado() : "";
            if (Reserva.FINALIZADA.equals(est) || Reserva.CONFIRMADA.equals(est) || Reserva.OCUPADA.equals(est)) {
                BigDecimal ant = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
                if (ant.compareTo(BigDecimal.ZERO) > 0) {
                    String codAnt = normalizarMetodoPagoDashboard(r.getMetodoPago());
                    montoPorMetodo.put(codAnt, montoPorMetodo.get(codAnt).add(ant));
                    opsPorMetodo.put(codAnt, opsPorMetodo.get(codAnt) + 1);
                }
                if (Reserva.FINALIZADA.equals(est)) {
                    BigDecimal t = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
                    BigDecimal liq = t.subtract(ant).max(BigDecimal.ZERO);
                    if (liq.compareTo(BigDecimal.ZERO) > 0) {
                        String codSal = normalizarMetodoPagoDashboard(
                                r.getMetodoPagoSaldo() != null && !r.getMetodoPagoSaldo().isBlank()
                                        ? r.getMetodoPagoSaldo()
                                        : r.getMetodoPago()
                        );
                        montoPorMetodo.put(codSal, montoPorMetodo.get(codSal).add(liq));
                        opsPorMetodo.put(codSal, opsPorMetodo.get(codSal) + 1);
                    }
                }
                if (r.getFechaCreacion() != null && r.getFechaEntrada() != null) {
                    long dias = java.time.temporal.ChronoUnit.DAYS.between(r.getFechaCreacion().toLocalDate(), r.getFechaEntrada());
                    if (dias >= 0 && dias <= 730) {
                        sumaDiasAnticipacion += dias;
                        conteoConAnticipacion++;
                    }
                }
            }
        }

        BigDecimal totalCobradoMetodos = montoPorMetodo.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Map<String, Object>> metodosPago = new ArrayList<>();
        for (String cod : ordenMetodos) {
            BigDecimal m = montoPorMetodo.get(cod).setScale(2, RoundingMode.HALF_UP);
            double pct = totalCobradoMetodos.compareTo(BigDecimal.ZERO) > 0
                    ? Math.round((m.doubleValue() / totalCobradoMetodos.doubleValue()) * 1000.0) / 10.0
                    : 0.0;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("codigo", cod);
            row.put("nombre", etiquetaMetodoPagoDashboard(cod));
            row.put("monto", m);
            row.put("operaciones", opsPorMetodo.get(cod));
            row.put("porcentaje", pct);
            metodosPago.add(row);
        }
        metodosPago.sort((a, b) -> ((BigDecimal) b.get("monto")).compareTo((BigDecimal) a.get("monto")));
        kpis.put("metodosPago", metodosPago);
        kpis.put("totalCobradoMetodos", totalCobradoMetodos.setScale(2, RoundingMode.HALF_UP));

        // 5. Embudo de Conversión y Comportamiento de Estancia (ALOS / Lead Time)
        int estanciasValidas = conteoFinalizadas + conteoConfirmadasOcupadas;
        double estanciaPromedioNoches = estanciasValidas > 0
                ? Math.round(((double) nochesVendidas / estanciasValidas) * 10.0) / 10.0
                : 0.0;
        double anticipacionPromedioDias = conteoConAnticipacion > 0
                ? Math.round(((double) sumaDiasAnticipacion / conteoConAnticipacion) * 10.0) / 10.0
                : 0.0;

        Map<String, Object> embudo = new LinkedHashMap<>();
        embudo.put("totalSolicitudes", totalReservas);
        embudo.put("confirmadas", estanciasValidas);
        embudo.put("finalizadas", conteoFinalizadas);
        embudo.put("canceladasNoShow", conteoCanceladas + conteoNoShow);
        kpis.put("embudo", embudo);
        kpis.put("estanciaPromedioNoches", estanciaPromedioNoches);
        kpis.put("anticipacionPromedioDias", anticipacionPromedioDias);

        // 6. Pulso Operativo de Hoy (tiempo real)
        LocalDate hoy = LocalDate.now(clockActual());
        java.time.LocalDateTime ahora = java.time.LocalDateTime.now(clockActual());
        List<Reserva> reservasRecientes = filtrarReservasPorHotelYFechas(hoy.minusDays(30), hoy.plusDays(7), idHotel, incluirInactivos);
        int llegadasHoy = 0;
        int checkOutsHoy = 0;
        BigDecimal saldoCheckOutsHoy = BigDecimal.ZERO;
        int preReservasCriticas = 0;
        for (Reserva rr : reservasRecientes) {
            String est = rr.getEstado() != null ? rr.getEstado() : "";
            if (hoy.equals(rr.getFechaEntrada()) && (Reserva.CONFIRMADA.equals(est) || Reserva.OCUPADA.equals(est))) {
                llegadasHoy++;
            }
            if (hoy.equals(rr.getFechaSalida()) && (Reserva.OCUPADA.equals(est) || Reserva.CONFIRMADA.equals(est))) {
                checkOutsHoy++;
                saldoCheckOutsHoy = saldoCheckOutsHoy.add(rr.getSaldo() != null ? rr.getSaldo() : BigDecimal.ZERO);
            }
            if (Reserva.PRE_RESERVA.equals(est) && rr.getFechaExpiracion() != null && !rr.getFechaExpiracion().isAfter(ahora.plusHours(4))) {
                preReservasCriticas++;
            }
        }
        Map<String, Object> pulsoHoy = new LinkedHashMap<>();
        pulsoHoy.put("llegadasHoy", llegadasHoy);
        pulsoHoy.put("checkOutsHoy", checkOutsHoy);
        pulsoHoy.put("saldoCheckOutsHoy", saldoCheckOutsHoy.setScale(2, RoundingMode.HALF_UP));
        pulsoHoy.put("preReservasCriticas", preReservasCriticas);
        kpis.put("pulsoHoy", pulsoHoy);

        return kpis;
    }

    private String normalizarMetodoPagoDashboard(String raw) {
        if (raw == null || raw.isBlank()) return "EFECTIVO";
        String up = raw.trim().toUpperCase(Locale.ROOT);
        if (up.contains("CREDITO") || up.contains("CRÉDITO")) return "TARJETA_CREDITO";
        if (up.contains("DEBITO") || up.contains("DÉBITO")) return "TARJETA_DEBITO";
        if (up.contains("TRANSFER")) return "TRANSFERENCIA";
        if (up.contains("EFECTIVO")) return "EFECTIVO";
        return "TARJETA_CREDITO";
    }

    private String etiquetaMetodoPagoDashboard(String cod) {
        return switch (cod) {
            case "TARJETA_CREDITO" -> "Tarjeta de Crédito";
            case "TRANSFERENCIA" -> "Transferencia";
            case "TARJETA_DEBITO" -> "Tarjeta de Débito";
            default -> "Efectivo";
        };
    }

    /**
     * Serie mensual temporal ($E, F, M, A, M, \dots, D$) para múltiples años (2020 a 2026),
     * alimentando la gráfica interactiva del Dashboard como se ilustró en el pizarrón.
     */
    public Map<String, Object> obtenerSerieMensualComparativa(List<Integer> anos, Integer idHotel, String metrica) {
        return obtenerSerieMensualComparativa(anos, idHotel, metrica, false);
    }

    public Map<String, Object> obtenerSerieMensualComparativa(List<Integer> anos, Integer idHotel, String metrica, boolean incluirInactivos) {
        List<Integer> anosAProcesar = (anos != null && !anos.isEmpty())
                ? anos
                : List.of(2020, 2021, 2022, 2023, 2024, 2025, 2026);

        String metricaSeleccionada = (metrica != null && !metrica.isBlank())
                ? metrica.toLowerCase().trim()
                : "ingresos"; // opciones: 'ingresos', 'ocupacion', 'reservas'

        List<Habitacion> habitaciones = filtrarHabitacionesPorHotel(idHotel, incluirInactivos);
        int totalHabitaciones = Math.max(habitaciones.size(), 1);

        Map<String, List<Double>> seriesPorAno = new LinkedHashMap<>();

        for (Integer a : anosAProcesar) {
            LocalDate inicio = LocalDate.of(a, 1, 1);
            LocalDate fin = LocalDate.of(a, 12, 31);
            List<Reserva> reservasAno = filtrarReservasPorHotelYFechas(inicio, fin, idHotel, incluirInactivos);

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
        return obtenerDistribucionCategorias(ano, idHotel, false);
    }

    public List<Map<String, Object>> obtenerDistribucionCategorias(Integer ano, Integer idHotel, boolean incluirInactivos) {
        int year = (ano != null) ? ano : LocalDate.now(clockActual()).getYear();
        LocalDate inicio = LocalDate.of(year, 1, 1);
        LocalDate fin = LocalDate.of(year, 12, 31);

        List<Reserva> reservas = filtrarReservasPorHotelYFechas(inicio, fin, idHotel, incluirInactivos);
        List<TipoHabitacion> tipos = tipoHabitacionRepository.findAll();

        BigDecimal granTotalIngresos = reservas.stream()
                .filter(this::esReservaDeHospedaje)
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
                    .filter(this::esReservaDeHospedaje)
                    .map(r -> r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            int nochesTipo = resTipo.stream()
                    .filter(this::esReservaDeHospedaje)
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
     * Comparativa de rendimiento entre los diferentes hoteles de la cadena (solo activos por defecto).
     */
    public List<Map<String, Object>> obtenerRendimientoHoteles(Integer ano) {
        return obtenerRendimientoHoteles(ano, false);
    }

    public List<Map<String, Object>> obtenerRendimientoHoteles(Integer ano, boolean incluirInactivos) {
        int year = (ano != null) ? ano : LocalDate.now(clockActual()).getYear();

        List<Hotel> hoteles = incluirInactivos ? hotelRepository.findAll() : hotelRepository.findByActivoTrue();
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Hotel h : hoteles) {
            Map<String, Object> kpisHotel = obtenerResumenKpis(year, h.getIdHotel(), incluirInactivos);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idHotel", h.getIdHotel());
            item.put("nombre", h.getNombre());
            item.put("ciudad", h.getCiudad());
            item.put("activo", Boolean.TRUE.equals(h.getActivo()));
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

    private boolean esReservaDeHospedaje(Reserva r) {
        String estado = r != null ? r.getEstado() : null;
        return Reserva.FINALIZADA.equals(estado)
                || Reserva.CONFIRMADA.equals(estado)
                || Reserva.OCUPADA.equals(estado);
    }

    private List<Reserva> filtrarReservasPorHotelYFechas(LocalDate inicio, LocalDate fin, Integer idHotel, boolean incluirInactivos) {
        return reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(inicio, fin).stream()
                .filter(r -> {
                    Hotel hotel = r.getHabitacion() != null ? r.getHabitacion().getHotel() : null;
                    if (hotel == null) {
                        return false;
                    }
                    if (!incluirInactivos && !Boolean.TRUE.equals(hotel.getActivo())) {
                        return false;
                    }
                    if (idHotel == null) {
                        return true;
                    }
                    return Objects.equals(hotel.getIdHotel(), idHotel);
                })
                .toList();
    }

    private List<Habitacion> filtrarHabitacionesPorHotel(Integer idHotel, boolean incluirInactivos) {
        return habitacionRepository.findAll().stream()
                .filter(h -> {
                    Hotel hotel = h.getHotel();
                    if (hotel == null) {
                        return false;
                    }
                    if (!incluirInactivos && !Boolean.TRUE.equals(hotel.getActivo())) {
                        return false;
                    }
                    return idHotel == null || Objects.equals(hotel.getIdHotel(), idHotel);
                })
                .toList();
    }
}
