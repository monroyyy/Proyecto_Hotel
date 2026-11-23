package com.ico.hotel.services;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Servicio para la generación de Informes Ejecutivos Formales (Financiero, Ocupación y Cancelaciones).
 * Diseñado para alimentar las tablas de auditoría y reportes imprimibles para Don Roberto (Gerencia).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InformeService {

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;

    @Autowired(required = false)
    private Clock clock;

    private Clock clockActual() {
        return clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
    }

    /**
     * Informe Financiero y Flujo de Caja detallado con agregación SQL (GROUP BY) y filas paginadas.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generarInformeFinanciero(LocalDate inicio, LocalDate fin, Integer idHotel) {
        return generarInformeFinanciero(inicio, fin, idHotel, 0, 20);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generarInformeFinanciero(LocalDate inicio, LocalDate fin, Integer idHotel, int page, int size) {
        return generarInformeFinanciero(inicio, fin, idHotel, page, size, null, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generarInformeFinanciero(
            LocalDate inicio, LocalDate fin, Integer idHotel, int page, int size,
            String estadoFiltro, String metodoPagoFiltro, String busqueda) {
        if (page < 0) {
            throw new IllegalArgumentException("El número de página no puede ser negativo.");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("El tamaño de página (size) debe estar entre 1 y 100.");
        }
        LocalDate hoy = LocalDate.now(clockActual());
        LocalDate fInicio = (inicio != null) ? inicio : hoy.withDayOfYear(1);
        LocalDate fFin = (fin != null) ? fin : hoy.withDayOfYear(hoy.lengthOfYear());
        if (fInicio.isAfter(fFin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha fin.");
        }

        List<Object[]> agregados = (idHotel == null)
                ? reservaRepository.agruparTotalesFinanciero(fInicio, fFin)
                : reservaRepository.agruparTotalesFinancieroPorHotel(fInicio, fFin, idHotel);

        long totalRegistros = 0L;
        BigDecimal granTotalContratado = BigDecimal.ZERO;
        BigDecimal totalAnticiposCobrados = BigDecimal.ZERO;
        BigDecimal totalSaldosLiquidados = BigDecimal.ZERO;
        BigDecimal totalPenalizaciones = BigDecimal.ZERO;
        BigDecimal totalReembolsos = BigDecimal.ZERO;

        for (Object[] row : agregados) {
            String est = row[0] != null ? row[0].toString() : "";
            long countEstado = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            BigDecimal sumTotal = toBigDecimal(row[2]);
            BigDecimal sumAnticipo = toBigDecimal(row[3]);
            BigDecimal sumSaldo = toBigDecimal(row[4]);
            BigDecimal sumReembolso = toBigDecimal(row[5]);
            BigDecimal sumLiquidado = toBigDecimal(row[6]);

            totalRegistros += countEstado;

            if (Reserva.FINALIZADA.equals(est)) {
                granTotalContratado = granTotalContratado.add(sumTotal);
                totalAnticiposCobrados = totalAnticiposCobrados.add(sumAnticipo);
                totalSaldosLiquidados = totalSaldosLiquidados.add(sumLiquidado);
            } else if (Reserva.CONFIRMADA.equals(est) || Reserva.OCUPADA.equals(est)) {
                granTotalContratado = granTotalContratado.add(sumTotal);
                totalAnticiposCobrados = totalAnticiposCobrados.add(sumAnticipo);
            } else if (Reserva.CANCELADA.equals(est)) {
                totalPenalizaciones = totalPenalizaciones.add(sumSaldo);
                totalReembolsos = totalReembolsos.add(sumReembolso);
            } else if (Reserva.NO_SHOW.equals(est)) {
                totalPenalizaciones = totalPenalizaciones.add(sumAnticipo);
            }
        }

        String estF = (estadoFiltro != null && !estadoFiltro.isBlank() && !"TODOS".equalsIgnoreCase(estadoFiltro))
                ? estadoFiltro.trim() : null;
        String metF = (metodoPagoFiltro != null && !metodoPagoFiltro.isBlank() && !"TODOS".equalsIgnoreCase(metodoPagoFiltro))
                ? metodoPagoFiltro.trim().toUpperCase() : null;
        String qF = (busqueda != null && !busqueda.isBlank()) ? busqueda.trim().toLowerCase() : null;
        boolean tieneFiltros = estF != null || metF != null || qF != null;

        List<Reserva> reservasPagina;
        long totalElements;
        int totalPages;
        int currentPage = page;

        BigDecimal filtTotal = BigDecimal.ZERO;
        BigDecimal filtCobrado = BigDecimal.ZERO;
        BigDecimal filtPenal = BigDecimal.ZERO;
        BigDecimal filtReembolso = BigDecimal.ZERO;

        if (!tieneFiltros) {
            PageRequest pageRequest = PageRequest.of(page, size);
            Page<Integer> idsPage = (idHotel == null)
                    ? reservaRepository.findIdsFinanciero(fInicio, fFin, pageRequest)
                    : reservaRepository.findIdsFinancieroPorHotel(fInicio, fFin, idHotel, pageRequest);

            reservasPagina = idsPage.isEmpty()
                    ? List.of()
                    : reordenarPorIds(idsPage.getContent(), reservaRepository.findAllByIdInWithDetails(idsPage.getContent()));
            totalElements = idsPage.getTotalElements();
            totalPages = idsPage.getTotalPages();
            currentPage = idsPage.getNumber();
        } else {
            List<Reserva> filtradas = reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(fInicio, fFin).stream()
                    .filter(r -> idHotel == null || (r.getHabitacion() != null
                            && r.getHabitacion().getHotel() != null
                            && Objects.equals(r.getHabitacion().getHotel().getIdHotel(), idHotel)))
                    .filter(r -> {
                        if (estF == null) return true;
                        String est = r.getEstado() != null ? r.getEstado() : "";
                        if ("RIESGO".equalsIgnoreCase(estF)) {
                            return Reserva.CANCELADA.equals(est) || Reserva.NO_SHOW.equals(est);
                        }
                        return estF.equalsIgnoreCase(est);
                    })
                    .filter(r -> {
                        if (metF == null) return true;
                        String mp = r.getMetodoPago() != null ? r.getMetodoPago().trim().toUpperCase() : "";
                        return metF.equals(mp);
                    })
                    .filter(r -> {
                        if (qF == null) return true;
                        String folio = r.getFolio() != null ? r.getFolio().toLowerCase() : "";
                        String titular = r.getHuesped() != null && r.getHuesped().getNombre() != null
                                ? r.getHuesped().getNombre().toLowerCase() : "";
                        String hotel = r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                                && r.getHabitacion().getHotel().getNombre() != null
                                ? r.getHabitacion().getHotel().getNombre().toLowerCase() : "";
                        String hab = r.getHabitacion() != null && r.getHabitacion().getNumero() != null
                                ? r.getHabitacion().getNumero().toLowerCase() : "";
                        return folio.contains(qF) || titular.contains(qF) || hotel.contains(qF) || hab.contains(qF);
                    })
                    .toList();

            for (Reserva r : filtradas) {
                BigDecimal tot = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
                BigDecimal ant = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
                BigDecimal ree = r.getMontoReembolso() != null ? r.getMontoReembolso() : BigDecimal.ZERO;
                String est = r.getEstado() != null ? r.getEstado() : "";
                BigDecimal liq = Reserva.FINALIZADA.equals(est) ? tot.subtract(ant) : BigDecimal.ZERO;
                BigDecimal pen = Reserva.CANCELADA.equals(est)
                        ? (r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO)
                        : (Reserva.NO_SHOW.equals(est) ? ant : BigDecimal.ZERO);

                filtTotal = filtTotal.add(tot);
                filtCobrado = filtCobrado.add(ant).add(liq);
                filtPenal = filtPenal.add(pen);
                filtReembolso = filtReembolso.add(ree);
            }

            totalElements = filtradas.size();
            totalPages = (int) Math.ceil((double) totalElements / size);
            int fromIdx = Math.min(page * size, filtradas.size());
            int toIdx = Math.min(fromIdx + size, filtradas.size());
            reservasPagina = filtradas.subList(fromIdx, toIdx);
        }

        List<Map<String, Object>> filas = new ArrayList<>(reservasPagina.size());
        for (Reserva r : reservasPagina) {
            BigDecimal total = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
            BigDecimal anticipo = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
            BigDecimal reembolso = r.getMontoReembolso() != null ? r.getMontoReembolso() : BigDecimal.ZERO;
            BigDecimal penalizacion = BigDecimal.ZERO;
            BigDecimal liquidado = BigDecimal.ZERO;

            String est = r.getEstado() != null ? r.getEstado() : "";
            if (Reserva.FINALIZADA.equals(est)) {
                liquidado = total.subtract(anticipo);
            } else if (Reserva.CANCELADA.equals(est)) {
                penalizacion = r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO;
            } else if (Reserva.NO_SHOW.equals(est)) {
                penalizacion = anticipo;
            }

            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("idReserva", r.getIdReserva());
            fila.put("folio", r.getFolio());
            fila.put("hotel", r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                    ? r.getHabitacion().getHotel().getNombre() : "Hotel Paraíso");
            fila.put("habitacionNumero", r.getHabitacion() != null ? r.getHabitacion().getNumero() : "—");
            fila.put("titular", r.getHuesped() != null ? r.getHuesped().getNombre() : "—");
            fila.put("fechaEntrada", r.getFechaEntrada());
            fila.put("fechaSalida", r.getFechaSalida());
            fila.put("noches", r.getNoches());
            fila.put("total", total);
            fila.put("anticipo", anticipo);
            fila.put("saldoLiquidado", liquidado);
            fila.put("penalizacionRetenida", penalizacion);
            fila.put("montoReembolso", reembolso);
            fila.put("metodoPago", r.getMetodoPago());
            fila.put("recepcionista", r.getRecepcionista());
            fila.put("estado", est);
            filas.add(fila);
        }

        BigDecimal ingresosNetosCaja = totalAnticiposCobrados.add(totalSaldosLiquidados).add(totalPenalizaciones).subtract(totalReembolsos);

        Map<String, Object> informe = new LinkedHashMap<>();
        informe.put("titulo", "Informe Financiero y Flujo de Caja");
        informe.put("fechaGeneracion", hoy);
        informe.put("periodoInicio", fInicio);
        informe.put("periodoFin", fFin);
        informe.put("idHotel", idHotel);
        informe.put("totalRegistros", totalRegistros);
        informe.put("granTotalContratado", granTotalContratado.setScale(2, RoundingMode.HALF_UP));
        informe.put("totalAnticiposCobrados", totalAnticiposCobrados.setScale(2, RoundingMode.HALF_UP));
        informe.put("totalSaldosLiquidados", totalSaldosLiquidados.setScale(2, RoundingMode.HALF_UP));
        informe.put("totalPenalizaciones", totalPenalizaciones.setScale(2, RoundingMode.HALF_UP));
        informe.put("totalReembolsos", totalReembolsos.setScale(2, RoundingMode.HALF_UP));
        informe.put("ingresosNetosCaja", ingresosNetosCaja.setScale(2, RoundingMode.HALF_UP));
        informe.put("filtrado", tieneFiltros);
        if (tieneFiltros) {
            informe.put("filtroTotal", filtTotal.setScale(2, RoundingMode.HALF_UP));
            informe.put("filtroCobrado", filtCobrado.setScale(2, RoundingMode.HALF_UP));
            informe.put("filtroPenalizaciones", filtPenal.setScale(2, RoundingMode.HALF_UP));
            informe.put("filtroReembolsos", filtReembolso.setScale(2, RoundingMode.HALF_UP));
        }
        informe.put("page", currentPage);
        informe.put("size", size);
        informe.put("totalElements", totalElements);
        informe.put("totalPages", totalPages);
        informe.put("filas", filas);

        return informe;
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(val.toString());
    }

    private List<Reserva> reordenarPorIds(List<Integer> idsOrdenados, List<Reserva> desordenadas) {
        Map<Integer, Reserva> porId = new HashMap<>(desordenadas.size());
        for (Reserva r : desordenadas) {
            porId.put(r.getIdReserva(), r);
        }
        List<Reserva> ordenadas = new ArrayList<>(idsOrdenados.size());
        for (Integer id : idsOrdenados) {
            Reserva r = porId.get(id);
            if (r != null) {
                ordenadas.add(r);
            }
        }
        return ordenadas;
    }

    /**
     * Informe de Ocupación por Habitación e Inventario para el año o rango seleccionado.
     */
    public Map<String, Object> generarInformeOcupacion(Integer ano, Integer idHotel) {
        return generarInformeOcupacion(ano, idHotel, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generarInformeOcupacion(Integer ano, Integer idHotel, LocalDate inicioParam, LocalDate finParam) {
        int year = (ano != null) ? ano : LocalDate.now(clockActual()).getYear();
        LocalDate inicio = (inicioParam != null) ? inicioParam : LocalDate.of(year, 1, 1);
        LocalDate fin = (finParam != null) ? finParam : LocalDate.of(year, 12, 31);
        if (inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha fin.");
        }
        int diasAno = (int) Math.max(ChronoUnit.DAYS.between(inicio, fin) + 1, 1);

        List<Habitacion> habitaciones = habitacionRepository.findAll().stream()
                .filter(h -> idHotel == null || (h.getHotel() != null && Objects.equals(h.getHotel().getIdHotel(), idHotel)))
                .toList();

        List<Reserva> reservas = reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(inicio, fin).stream()
                .filter(r -> Reserva.FINALIZADA.equals(r.getEstado()) || Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))
                .toList();

        List<Map<String, Object>> filas = new ArrayList<>();
        int totalNochesVendidasCadena = 0;
        BigDecimal totalIngresosCadena = BigDecimal.ZERO;

        for (Habitacion hab : habitaciones) {
            List<Reserva> resHab = reservas.stream()
                    .filter(r -> r.getHabitacion() != null && Objects.equals(r.getHabitacion().getIdHabitacion(), hab.getIdHabitacion()))
                    .toList();

            int nochesHab = resHab.stream().mapToInt(r -> r.getNoches() != null ? r.getNoches() : 1).sum();
            BigDecimal ingresosHab = resHab.stream()
                    .map(r -> r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            double tasaOcupacion = ((double) nochesHab / diasAno) * 100.0;
            tasaOcupacion = Math.min(Math.round(tasaOcupacion * 10.0) / 10.0, 100.0);

            totalNochesVendidasCadena += nochesHab;
            totalIngresosCadena = totalIngresosCadena.add(ingresosHab);

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("idHabitacion", hab.getIdHabitacion());
            f.put("numero", hab.getNumero());
            f.put("piso", hab.getPiso());
            f.put("hotel", hab.getHotel() != null ? hab.getHotel().getNombre() : "Hotel Paraíso");
            f.put("categoria", hab.getTipoHabitacion() != null ? hab.getTipoHabitacion().getNombre() : "Suite");
            f.put("precioBase", hab.getTipoHabitacion() != null ? hab.getTipoHabitacion().getPrecioBase() : BigDecimal.ZERO);
            f.put("nochesOcupadas", nochesHab);
            f.put("diasDisponiblesAno", diasAno);
            f.put("tasaOcupacionPct", tasaOcupacion);
            f.put("totalReservas", resHab.size());
            f.put("ingresosTotales", ingresosHab.setScale(2, RoundingMode.HALF_UP));
            filas.add(f);
        }

        int capacidadTotalNoches = Math.max(habitaciones.size() * diasAno, 1);
        double ocupacionGlobal = ((double) totalNochesVendidasCadena / capacidadTotalNoches) * 100.0;
        ocupacionGlobal = Math.round(ocupacionGlobal * 10.0) / 10.0;

        Map<String, Object> informe = new LinkedHashMap<>();
        informe.put("titulo", "Informe de Ocupación y Rendimiento de Habitaciones");
        informe.put("ano", year);
        informe.put("idHotel", idHotel);
        informe.put("totalHabitaciones", habitaciones.size());
        informe.put("diasAno", diasAno);
        informe.put("totalNochesVendidas", totalNochesVendidasCadena);
        informe.put("capacidadTotalNoches", capacidadTotalNoches);
        informe.put("ocupacionGlobalPct", ocupacionGlobal);
        informe.put("totalIngresosGenerados", totalIngresosCadena.setScale(2, RoundingMode.HALF_UP));
        informe.put("filas", filas);

        return informe;
    }

    /**
     * Informe de Cancelaciones, Penalizaciones y Reembolsos Bancarios autorizados por Don Roberto.
     */
    public Map<String, Object> generarInformeCancelaciones(Integer ano, Integer idHotel) {
        return generarInformeCancelaciones(ano, idHotel, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generarInformeCancelaciones(Integer ano, Integer idHotel, LocalDate inicioParam, LocalDate finParam) {
        int year = (ano != null) ? ano : LocalDate.now(clockActual()).getYear();
        LocalDate inicio = (inicioParam != null) ? inicioParam : LocalDate.of(year, 1, 1);
        LocalDate fin = (finParam != null) ? finParam : LocalDate.of(year, 12, 31);
        if (inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha fin.");
        }

        List<Reserva> canceladas = reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(inicio, fin).stream()
                .filter(r -> Reserva.CANCELADA.equals(r.getEstado()) || Reserva.NO_SHOW.equals(r.getEstado()))
                .filter(r -> {
                    if (idHotel == null) return true;
                    return r.getHabitacion() != null
                            && r.getHabitacion().getHotel() != null
                            && Objects.equals(r.getHabitacion().getHotel().getIdHotel(), idHotel);
                })
                .toList();

        BigDecimal totalReembolsado = BigDecimal.ZERO;
        BigDecimal totalPenalizaciones = BigDecimal.ZERO;
        int count100Reembolso = 0;
        int count50Reembolso = 0;
        int countSinReembolso = 0;
        int countNoShow = 0;

        List<Map<String, Object>> filas = new ArrayList<>();
        for (Reserva r : canceladas) {
            BigDecimal reemb = r.getMontoReembolso() != null ? r.getMontoReembolso() : BigDecimal.ZERO;
            BigDecimal pen = BigDecimal.ZERO;
            String reglaTramo = "Sin tramo";

            if (Reserva.NO_SHOW.equals(r.getEstado())) {
                countNoShow++;
                pen = r.getAnticipo() != null ? r.getAnticipo() : (r.getSaldo() != null ? r.getSaldo() : BigDecimal.ZERO);
                reglaTramo = "No-Show (22:00 hrs: retención 100%)";
            } else {
                BigDecimal anticipo = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
                if (reemb.compareTo(BigDecimal.ZERO) > 0 && reemb.compareTo(anticipo) >= 0) {
                    count100Reembolso++;
                    reglaTramo = "> 72 hrs (Reembolso 100%)";
                    pen = BigDecimal.ZERO;
                } else if (reemb.compareTo(BigDecimal.ZERO) > 0) {
                    count50Reembolso++;
                    reglaTramo = "48 a 72 hrs (Reembolso 50% / Penalización 50%)";
                    pen = anticipo.subtract(reemb);
                } else {
                    countSinReembolso++;
                    reglaTramo = "< 48 hrs (0% Reembolso / Penalización 100%)";
                    pen = anticipo;
                }
            }

            totalReembolsado = totalReembolsado.add(reemb);
            totalPenalizaciones = totalPenalizaciones.add(pen);

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("idReserva", r.getIdReserva());
            f.put("folio", r.getFolio());
            f.put("hotel", r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                    ? r.getHabitacion().getHotel().getNombre() : "Hotel Paraíso");
            f.put("titular", r.getHuesped() != null ? r.getHuesped().getNombre() : "—");
            f.put("fechaEntrada", r.getFechaEntrada());
            f.put("fechaCancelacion", r.getFechaCancelacion());
            f.put("reglaAplicada", reglaTramo);
            f.put("totalEstancia", r.getTotal());
            f.put("anticipoPagado", r.getAnticipo());
            f.put("montoReembolsado", reemb);
            f.put("penalizacionRetenida", pen);
            f.put("bancoReembolso", r.getBancoReembolso() != null ? r.getBancoReembolso() : "—");
            f.put("clabeReembolso", r.getClabeReembolso() != null ? r.getClabeReembolso() : "—");
            f.put("autorizadoPor", r.getReembolsoAutorizadoPor() != null ? r.getReembolsoAutorizadoPor() : "Don Roberto");
            f.put("motivo", r.getMotivoCancelacion() != null ? r.getMotivoCancelacion() : r.getObservaciones());
            filas.add(f);
        }

        Map<String, Object> informe = new LinkedHashMap<>();
        informe.put("titulo", "Informe de Cancelaciones, No-Shows y Reembolsos Bancarios");
        informe.put("ano", year);
        informe.put("idHotel", idHotel);
        informe.put("totalCasos", filas.size());
        informe.put("totalReembolsado", totalReembolsado.setScale(2, RoundingMode.HALF_UP));
        informe.put("totalPenalizacionesRetenidas", totalPenalizaciones.setScale(2, RoundingMode.HALF_UP));
        informe.put("casosReembolso100", count100Reembolso);
        informe.put("casosReembolso50", count50Reembolso);
        informe.put("casosPenalizacionTotal", countSinReembolso);
        informe.put("casosNoShow", countNoShow);
        informe.put("filas", filas);

        return informe;
    }

    /**
     * Informe de Cuentas por Cobrar (Saldos Pendientes en Lobby) para reservaciones vigentes.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generarInformeCuentasPorCobrar(Integer ano, Integer idHotel, LocalDate inicioParam, LocalDate finParam) {
        LocalDate hoy = LocalDate.now(clockActual());
        int year = (ano != null) ? ano : hoy.getYear();
        LocalDate inicio = (inicioParam != null) ? inicioParam : LocalDate.of(year, 1, 1);
        LocalDate fin = (finParam != null) ? finParam : LocalDate.of(year, 12, 31);
        if (inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha fin.");
        }

        List<Reserva> vigentes = reservaRepository.findByFechaEntradaBetweenOrderByFechaEntradaAsc(inicio, fin).stream()
                .filter(r -> Reserva.CONFIRMADA.equals(r.getEstado()) || Reserva.OCUPADA.equals(r.getEstado()))
                .filter(r -> {
                    if (idHotel == null) return true;
                    return r.getHabitacion() != null
                            && r.getHabitacion().getHotel() != null
                            && Objects.equals(r.getHabitacion().getHotel().getIdHotel(), idHotel);
                })
                .toList();

        BigDecimal totalSaldoPorCobrar = BigDecimal.ZERO;
        BigDecimal totalAnticipoRecibido = BigDecimal.ZERO;
        BigDecimal saldoProximos7Dias = BigDecimal.ZERO;
        int cuentasProximas7Dias = 0;
        int cuentasEnCasa = 0;

        List<Map<String, Object>> filas = new ArrayList<>();
        for (Reserva r : vigentes) {
            BigDecimal total = r.getTotal() != null ? r.getTotal() : BigDecimal.ZERO;
            BigDecimal anticipo = r.getAnticipo() != null ? r.getAnticipo() : BigDecimal.ZERO;
            BigDecimal saldo = (r.getSaldo() != null && r.getSaldo().compareTo(BigDecimal.ZERO) > 0)
                    ? r.getSaldo()
                    : total.subtract(anticipo).max(BigDecimal.ZERO);

            if (saldo.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            long diasParaLlegada = r.getFechaEntrada() != null
                    ? ChronoUnit.DAYS.between(hoy, r.getFechaEntrada())
                    : 0L;

            totalSaldoPorCobrar = totalSaldoPorCobrar.add(saldo);
            totalAnticipoRecibido = totalAnticipoRecibido.add(anticipo);

            if (Reserva.OCUPADA.equals(r.getEstado())) {
                cuentasEnCasa++;
            }
            if (diasParaLlegada <= 7) {
                cuentasProximas7Dias++;
                saldoProximos7Dias = saldoProximos7Dias.add(saldo);
            }

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("idReserva", r.getIdReserva());
            f.put("folio", r.getFolio());
            f.put("titular", r.getHuesped() != null ? r.getHuesped().getNombre() : "—");
            f.put("hotel", r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                    ? r.getHabitacion().getHotel().getNombre() : "Hotel Paraíso");
            f.put("habitacionNumero", r.getHabitacion() != null ? r.getHabitacion().getNumero() : "—");
            f.put("fechaEntrada", r.getFechaEntrada());
            f.put("fechaSalida", r.getFechaSalida());
            f.put("noches", r.getNoches() != null ? r.getNoches() : 1);
            f.put("total", total.setScale(2, RoundingMode.HALF_UP));
            f.put("anticipo", anticipo.setScale(2, RoundingMode.HALF_UP));
            f.put("saldoPendiente", saldo.setScale(2, RoundingMode.HALF_UP));
            f.put("diasParaLlegada", diasParaLlegada);
            f.put("estado", r.getEstado());
            f.put("metodoPago", r.getMetodoPago());
            filas.add(f);
        }

        Map<String, Object> informe = new LinkedHashMap<>();
        informe.put("titulo", "Informe de Cuentas por Cobrar (Saldos Pendientes)");
        informe.put("ano", year);
        informe.put("periodoInicio", inicio);
        informe.put("periodoFin", fin);
        informe.put("idHotel", idHotel);
        informe.put("totalCuentas", filas.size());
        informe.put("totalSaldoPorCobrar", totalSaldoPorCobrar.setScale(2, RoundingMode.HALF_UP));
        informe.put("totalAnticipoRecibido", totalAnticipoRecibido.setScale(2, RoundingMode.HALF_UP));
        informe.put("cuentasProximas7Dias", cuentasProximas7Dias);
        informe.put("saldoProximos7Dias", saldoProximos7Dias.setScale(2, RoundingMode.HALF_UP));
        informe.put("cuentasEnCasa", cuentasEnCasa);
        informe.put("filas", filas);

        return informe;
    }
}
