import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Calendar, Building2, DollarSign, Percent,
    BedDouble, ArrowUpRight, ArrowDownRight, RefreshCw,
    ShieldAlert, BarChart3, Activity, ClipboardList, ChevronDown,
    FileSpreadsheet, FileText, LogIn, LogOut, Clock
} from 'lucide-react';
import {
    getDashboardKpis,
    getDashboardMensualComparativo,
    getDashboardPorCategoria,
    getDashboardPorHotel,
    getHoteles
} from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import { exportarDashboardCsv, exportarDashboardPdf } from '../utils/dashboardExport';
import './DashboardPage.css';

// Paleta cohesiva Hotel Paraíso (Palma, Océano, Terracota y neutros de pizarra)
const PALETA_ANOS = {
    2026: '#2d5a43', // Verde palma insignia
    2025: '#16324f', // Azul océano profundo
    2024: '#b85d38', // Terracota costera
    2023: '#627d98', // Pizarra oceánica
    2022: '#a67c52', // Arena tostada
    2021: '#3e7b5c', // Hoja palma clara
    2020: '#94a3b8', // Neutro base
};

const PALETA_CATEGORIAS = [
    '#16324f', // Azul océano
    '#2d5a43', // Verde palma
    '#b85d38', // Terracota
    '#3b82a6', // Azul costero medio
    '#a67c52', // Arena tostada
    '#4f8a6e', // Hoja palma clara
    '#d97706', // Ámbar cálido
    '#64748b', // Pizarra neutra
];

function formatoMoneda(valor) {
    if (valor == null || isNaN(valor)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(valor);
}

function formatoMonedaPartes(valor) {
    const num = Number(valor || 0);
    const fixed = Number.isFinite(num) ? num : 0;
    const formatted = new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(fixed);
    const idx = formatted.lastIndexOf('.');
    return {
        entero: idx >= 0 ? formatted.slice(0, idx) : formatted,
        decimales: idx >= 0 ? formatted.slice(idx) : '.00'
    };
}

function formatoNumero(valor) {
    if (valor == null || isNaN(valor)) return '0';
    return new Intl.NumberFormat('es-MX').format(valor);
}

/**
 * Sparkline SVG limpia con degradado y animación de trazado suave.
 */
function SparklineSvg({ values = [], color = '#2d5a43', width = 128, height = 38, idSuffix = 'sp' }) {
    const safeVals = Array.isArray(values) && values.length >= 2 ? values : [0, 0, 0, 0];
    const max = Math.max(...safeVals, 1) * 1.1;
    const min = Math.min(...safeVals, 0) * 0.9;
    const range = max - min || 1;
    const stepX = width / (safeVals.length - 1);

    const pts = safeVals.map((v, i) => ({
        x: i * stepX,
        y: height - 4 - ((v - min) / range) * (height - 8)
    }));

    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
        const cx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
        d += ` C ${cx},${pts[i - 1].y.toFixed(1)} ${cx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    }
    const area = `${d} L ${width},${height} L 0,${height} Z`;
    const last = pts[pts.length - 1];
    const gradId = `spark-grad-${idSuffix}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', flexShrink: 0 }} aria-hidden="true">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} className="dash-svg-area" />
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className="dash-svg-line" />
            <circle cx={last.x} cy={last.y} r="3.2" fill={color} stroke="#ffffff" strokeWidth="1.6" />
        </svg>
    );
}

/**
 * Anillo Radial SVG animado para Ocupación Promedio.
 */
function RadialRingSvg({ porcentaje = 0, color = '#2d5a43' }) {
    const pct = Math.max(0, Math.min(Number(porcentaje || 0), 100));
    const r = 23;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;

    return (
        <svg width="58" height="58" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} aria-hidden="true">
            <circle cx="30" cy="30" r={r} fill="none" stroke="#eef2f6" strokeWidth="5.5" />
            <circle
                cx="30"
                cy="30"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={circ.toFixed(1)}
                strokeDashoffset={offset.toFixed(1)}
                style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
        </svg>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();

    // Filtros principales
    const [anoSeleccionado, setAnoSeleccionado] = useState(2026);
    const [idHotelFiltro, setIdHotelFiltro] = useState('');
    const [incluirInactivos, setIncluirInactivos] = useState(false);
    const [metricaGrafica, setMetricaGrafica] = useState('ingresos'); // 'ingresos' | 'ocupacion' | 'reservas'
    const [tipoGrafica, setTipoGrafica] = useState('curvas'); // 'curvas' (Opción 1) | 'barras' (Opción 2)

    // Años activos en la gráfica multianual
    const [anosActivos, setAnosActivos] = useState([2024, 2025, 2026]);
    const [anoEnfocado, setAnoEnfocado] = useState(null);

    // Estados de datos
    const [hoteles, setHoteles] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [datosSerie, setDatosSerie] = useState(null);
    const [distribucionCategorias, setDistribucionCategorias] = useState([]);
    const [rendimientoHoteles, setRendimientoHoteles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Interactividad SVG
    const [mesHoverIdx, setMesHoverIdx] = useState(null);
    const [categoriaHoverIdx, setCategoriaHoverIdx] = useState(null);
    const [pagoHoverIdx, setPagoHoverIdx] = useState(null);

    // Cargar catálogo de hoteles
    useEffect(() => {
        getHoteles()
            .then(data => setHoteles(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error al cargar hoteles:', err));
    }, []);

    // Asegurar que el año seleccionado y su año anterior estén disponibles al cambiar año
    const anosSolicitados = useMemo(() => {
        const set = new Set(anosActivos);
        set.add(anoSeleccionado);
        if (anoSeleccionado > 2020) set.add(anoSeleccionado - 1);
        return Array.from(set).sort((a, b) => a - b);
    }, [anosActivos, anoSeleccionado]);

    useEffect(() => {
        cargarDatosDashboard();
    }, [anoSeleccionado, idHotelFiltro, incluirInactivos, metricaGrafica, anosSolicitados]);

    const cargarDatosDashboard = async () => {
        setCargando(true);
        setErrorMsg('');
        try {
            const hotelIdParam = idHotelFiltro ? parseInt(idHotelFiltro, 10) : null;

            const [kpisRes, serieRes, catRes, hotRes] = await Promise.all([
                getDashboardKpis(anoSeleccionado, hotelIdParam, incluirInactivos),
                getDashboardMensualComparativo(anosSolicitados, hotelIdParam, metricaGrafica, incluirInactivos),
                getDashboardPorCategoria(anoSeleccionado, hotelIdParam, incluirInactivos),
                getDashboardPorHotel(anoSeleccionado, incluirInactivos)
            ]);

            setKpis(kpisRes);
            setDatosSerie(serieRes);
            setDistribucionCategorias(Array.isArray(catRes) ? catRes : []);
            setRendimientoHoteles(Array.isArray(hotRes) ? hotRes : []);
        } catch (err) {
            console.error('Error al cargar dashboard:', err);
            setErrorMsg(err.message || 'Error al obtener métricas del servidor.');
        } finally {
            setCargando(false);
        }
    };

    const toggleAnoGrafica = (ano) => {
        setAnosActivos(prev => {
            if (prev.includes(ano)) {
                if (prev.length <= 1) return prev;
                return prev.filter(a => a !== ano);
            }
            return [...prev, ano].sort((a, b) => a - b);
        });
    };

    // Serie del año seleccionado para la Sparkline del Hero KPI
    const sparklineSeriePrincipal = useMemo(() => {
        if (!datosSerie?.series) return [0, 0, 0, 0];
        const serieAno = datosSerie.series[String(anoSeleccionado)];
        if (Array.isArray(serieAno) && serieAno.length > 1) return serieAno;
        const first = Object.values(datosSerie.series)[0];
        return Array.isArray(first) ? first : [0, 0, 0, 0];
    }, [datosSerie, anoSeleccionado]);

    // Cálculos para la gráfica SVG (soporta Curvas + Área y Barras + Tendencia)
    const graficaConfig = useMemo(() => {
        if (!datosSerie || !datosSerie.series) return null;

        const series = datosSerie.series;
        const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesesLargos = datosSerie.meses || ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const anosVisibles = tipoGrafica === 'barras'
            ? [anoSeleccionado, anoSeleccionado > 2020 ? anoSeleccionado - 1 : null].filter(Boolean)
            : anosActivos;

        let maxValor = 0;
        anosVisibles.forEach(a => {
            const vals = series[String(a)] || [];
            vals.forEach(v => {
                if (v > maxValor) maxValor = v;
            });
        });

        if (maxValor <= 0) maxValor = metricaGrafica === 'ocupacion' ? 100 : 10000;
        maxValor = maxValor * 1.15;

        const width = 780;
        const height = 278;
        const padLeft = 58;
        const padRight = 22;
        const padTop = 20;
        const padBottom = 34;

        const chartW = width - padLeft - padRight;
        const chartH = height - padTop - padBottom;
        const stepX = chartW / (mesesCortos.length - 1);

        const lineas = {};
        anosVisibles.forEach(ano => {
            const anoStr = String(ano);
            const vals = series[anoStr];
            if (!Array.isArray(vals) || vals.length === 0) return;

            const puntos = vals.map((v, idx) => {
                const x = padLeft + idx * stepX;
                const ratio = Math.max(0, Math.min(v / maxValor, 1));
                const y = padTop + chartH - (ratio * chartH);
                return { x, y, valor: v, mes: mesesLargos[idx], mesCorto: mesesCortos[idx], ano };
            });

            let d = `M ${puntos[0].x.toFixed(1)},${puntos[0].y.toFixed(1)}`;
            for (let i = 1; i < puntos.length; i++) {
                const prev = puntos[i - 1];
                const curr = puntos[i];
                const cx = ((prev.x + curr.x) / 2).toFixed(1);
                d += ` C ${cx},${prev.y.toFixed(1)} ${cx},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
            }

            const baseLineY = padTop + chartH;
            const areaPath = `${d} L ${puntos[puntos.length - 1].x.toFixed(1)},${baseLineY.toFixed(1)} L ${puntos[0].x.toFixed(1)},${baseLineY.toFixed(1)} Z`;

            lineas[anoStr] = {
                ano,
                puntos,
                path: d,
                areaPath,
                color: PALETA_ANOS[ano] || '#16324f'
            };
        });

        // Barras para el año seleccionado (Opción 2)
        const valsPrincipal = series[String(anoSeleccionado)] || Array(12).fill(0);
        const maxMesVal = Math.max(...valsPrincipal, 0);
        const barSlot = chartW / 12;
        const barW = Math.min(30, barSlot * 0.54);
        const barras = valsPrincipal.map((v, idx) => {
            const ratio = Math.max(0, Math.min(v / maxValor, 1));
            const bh = ratio * chartH;
            const x = padLeft + idx * barSlot + (barSlot - barW) / 2;
            const y = padTop + chartH - bh;
            const cx = x + barW / 2;
            const isPeak = v > 0 && v === maxMesVal;
            return { idx, x, y, cx, width: barW, height: bh, valor: v, isPeak, mes: mesesLargos[idx], mesCorto: mesesCortos[idx] };
        });

        // Curva referencia año anterior alineada a centros de barra
        const anoAnterior = anoSeleccionado > 2020 ? anoSeleccionado - 1 : null;
        let curvaRefBarras = null;
        if (anoAnterior && Array.isArray(series[String(anoAnterior)])) {
            const ptsRef = series[String(anoAnterior)].map((v, idx) => {
                const cx = padLeft + idx * barSlot + barSlot / 2;
                const ratio = Math.max(0, Math.min(v / maxValor, 1));
                const y = padTop + chartH - (ratio * chartH);
                return { x: cx, y, valor: v };
            });
            let dRef = `M ${ptsRef[0].x.toFixed(1)},${ptsRef[0].y.toFixed(1)}`;
            for (let i = 1; i < ptsRef.length; i++) {
                const cx = ((ptsRef[i - 1].x + ptsRef[i].x) / 2).toFixed(1);
                dRef += ` C ${cx},${ptsRef[i - 1].y.toFixed(1)} ${cx},${ptsRef[i].y.toFixed(1)} ${ptsRef[i].x.toFixed(1)},${ptsRef[i].y.toFixed(1)}`;
            }
            curvaRefBarras = { ano: anoAnterior, path: dRef, puntos: ptsRef };
        }

        const lineasY = [0, 0.25, 0.5, 0.75, 1.0].map(ratio => {
            const y = padTop + chartH - (ratio * chartH);
            const val = ratio * maxValor;
            return {
                y,
                valorLabel: metricaGrafica === 'ingresos'
                    ? `$${Math.round(val / 1000)}k`
                    : metricaGrafica === 'ocupacion'
                        ? `${Math.round(val)}%`
                        : Math.round(val)
            };
        });

        return {
            width, height, padLeft, padRight, padTop, padBottom,
            chartW, chartH, stepX, mesesCortos, mesesLargos,
            lineas, lineasY, barras, curvaRefBarras, maxValor
        };
    }, [datosSerie, metricaGrafica, anosActivos, anoSeleccionado, tipoGrafica]);

    // Configuración del Donut SVG de Categorías (oculta categorías en $0 al filtrar una sede)
    const donutConfig = useMemo(() => {
        const radius = 52;
        const circ = 2 * Math.PI * radius;
        const filtradas = distribucionCategorias.filter(c => Number(c.ingresos || 0) > 0 || Number(c.participacionPct || 0) > 0);
        const baseLista = filtradas.length > 0 ? filtradas : distribucionCategorias;
        let acc = 0;
        const slices = baseLista.map((cat, idx) => {
            const pct = Number(cat.participacionPct || 0);
            const dash = (pct / 100) * circ;
            const gap = baseLista.length > 1 ? 3 : 0;
            const item = {
                ...cat,
                idx,
                pct,
                color: PALETA_CATEGORIAS[idx % PALETA_CATEGORIAS.length],
                strokeDasharray: `${Math.max(1, dash - gap).toFixed(1)} ${circ.toFixed(1)}`,
                strokeDashoffset: (-acc).toFixed(1)
            };
            acc += dash;
            return item;
        });
        return { radius, circ, slices };
    }, [distribucionCategorias]);

    // Configuración de Barra Proporcional de Flujo de Caja (Opción 2)
    const flujoCajaItems = useMemo(() => {
        const ant = Number(kpis?.anticiposCobrados || 0);
        const liq = Number(kpis?.saldosLiquidados || 0);
        const pen = Number(kpis?.saldosPendientes || 0);
        const mul = Number(kpis?.penalizacionesRetenidas || 0);
        const ree = Number(kpis?.reembolsosDevueltos || 0);
        const base = Math.max(ant + liq + pen + mul + ree, 1);

        return [
            { id: 'anticipos', label: 'Anticipos Cobrados', sub: 'Garantía recibida (50%)', valor: ant, pct: (ant / base) * 100, color: '#2d5a43', signo: '' },
            { id: 'liquidados', label: 'Saldos Liquidados', sub: 'Estancias finalizadas', valor: liq, pct: (liq / base) * 100, color: '#16324f', signo: '' },
            { id: 'pendientes', label: 'Por Cobrar en Lobby', sub: 'Proyectado en Check-In', valor: pen, pct: (pen / base) * 100, color: '#627d98', signo: '' },
            { id: 'penalizaciones', label: 'Penalizaciones', sub: 'No-Show y cancelaciones', valor: mul, pct: (mul / base) * 100, color: '#b85d38', signo: '' },
            { id: 'reembolsos', label: 'Reembolsos', sub: 'Dispersión bancaria', valor: ree, pct: (ree / base) * 100, color: '#b91c1c', signo: '-' }
        ];
    }, [kpis]);

    const formatearValorMetrica = (val) => {
        if (metricaGrafica === 'ingresos') return formatoMoneda(val);
        if (metricaGrafica === 'ocupacion') return `${Number(val || 0).toFixed(1)}%`;
        return `${Math.round(Number(val || 0))} res.`;
    };

    // Anillo SVG de Métodos de Pago (Variante B)
    const COLORES_METODOS = {
        TARJETA_CREDITO: '#16324f',
        TRANSFERENCIA: '#2d5a43',
        TARJETA_DEBITO: '#3b82a6',
        EFECTIVO: '#b85d38'
    };

    const pagosRingConfig = useMemo(() => {
        const lista = Array.isArray(kpis?.metodosPago) ? kpis.metodosPago : [];
        const r = 46;
        const circ = 2 * Math.PI * r;
        let acc = 0;
        const slices = lista.map((m, idx) => {
            const pct = Number(m.porcentaje || 0);
            const dash = (pct / 100) * circ;
            const gap = lista.filter(x => Number(x.porcentaje || 0) > 0).length > 1 ? 3 : 0;
            const item = {
                ...m,
                idx,
                pct,
                color: COLORES_METODOS[m.codigo] || PALETA_CATEGORIAS[idx % PALETA_CATEGORIAS.length],
                strokeDasharray: `${Math.max(pct > 0 ? 1 : 0, dash - gap).toFixed(1)} ${circ.toFixed(1)}`,
                strokeDashoffset: (-acc).toFixed(1)
            };
            acc += dash;
            return item;
        });
        return { r, circ, slices };
    }, [kpis?.metodosPago]);

    const embudoEtapas = useMemo(() => {
        const e = kpis?.embudo || {};
        const total = Math.max(Number(e.totalSolicitudes || 0), 0);
        const pct = (n) => (total > 0 ? Math.round((Number(n || 0) / total) * 1000) / 10 : 0);
        return [
            { paso: '01', titulo: 'Solicitudes', count: total, pct: total > 0 ? 100 : 0, color: '#16324f' },
            { paso: '02', titulo: 'Confirmadas', count: Number(e.confirmadas || 0), pct: pct(e.confirmadas), color: '#2d5a43' },
            { paso: '03', titulo: 'Finalizadas', count: Number(e.finalizadas || 0), pct: pct(e.finalizadas), color: '#3e7b5c' },
            { paso: '04', titulo: 'Canceladas / No-Show', count: Number(e.canceladasNoShow || 0), pct: pct(e.canceladasNoShow), color: '#b85d38' }
        ];
    }, [kpis?.embudo]);

    const handleExportarCsv = () => {
        exportarDashboardCsv({
            anoSeleccionado,
            idHotelFiltro,
            hoteles,
            kpis,
            rendimientoHoteles,
            user
        });
    };

    const handleImprimirPdf = () => {
        exportarDashboardPdf({
            anoSeleccionado,
            idHotelFiltro,
            hoteles,
            kpis,
            rendimientoHoteles,
            user
        });
    };

    const pagoActivo = pagoHoverIdx != null ? pagosRingConfig.slices[pagoHoverIdx] : null;
    const pulsoHoy = kpis?.pulsoHoy || { llegadasHoy: 0, checkOutsHoy: 0, saldoCheckOutsHoy: 0, preReservasCriticas: 0 };

    const heroPartes = formatoMonedaPartes(kpis?.ingresosBrutos);
    const categoriaActiva = categoriaHoverIdx != null ? donutConfig.slices[categoriaHoverIdx] : null;
    const cambioPositivo = (kpis?.cambioIngresosPct ?? 0) >= 0;

    return (
        <div className="dash-view">
            {/* CABECERA EJECUTIVA */}
            <header className="dash-header dash-anim-up">
                <div>
                    <div className="dash-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" className="dash-pulse-dot" />
                        </svg>
                        <span>Dirección Hotelera</span>
                        <span className="dash-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="dash-title">Dashboard Financiero</h1>
                </div>

                {/* Barra unificada de filtros */}
                <div className="dash-filter-bar">
                    <div className="dash-filter-segment">
                        <Calendar size={14} />
                        <select
                            className="dash-filter-select"
                            value={anoSeleccionado}
                            onChange={(e) => setAnoSeleccionado(parseInt(e.target.value, 10))}
                            aria-label="Seleccionar año"
                        >
                            {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(a => (
                                <option key={a} value={a}>
                                    {a} {a === 2026 ? '(Vigente)' : ''}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="dash-select-chevron" />
                    </div>

                    <div className="dash-filter-segment">
                        <Building2 size={14} />
                        <select
                            className="dash-filter-select"
                            value={idHotelFiltro}
                            onChange={(e) => setIdHotelFiltro(e.target.value)}
                            aria-label="Filtrar por propiedad"
                        >
                            <option value="">Toda la Cadena</option>
                            {hoteles
                                .filter(h => incluirInactivos || h.activo !== false)
                                .map(h => (
                                    <option key={h.idHotel} value={h.idHotel}>
                                        {h.nombre} ({h.ciudad}){h.activo === false ? ' [Inactiva]' : ''}
                                    </option>
                                ))}
                        </select>
                        <ChevronDown size={13} className="dash-select-chevron" />
                    </div>

                    <button
                        type="button"
                        className={`dash-toggle-pill ${incluirInactivos ? 'is-active' : ''}`}
                        onClick={() => setIncluirInactivos(prev => !prev)}
                        aria-pressed={incluirInactivos}
                    >
                        <span className="dash-toggle-dot" />
                        <span>Inactivas</span>
                    </button>

                    <button
                        type="button"
                        className="dash-refresh-btn"
                        onClick={cargarDatosDashboard}
                        title="Recargar métricas"
                    >
                        <RefreshCw size={14} className={cargando ? 'dash-spin' : ''} />
                        <span>Actualizar</span>
                    </button>

                    {/* Módulo 5: Exportación Directa (Opción A — Grupo Segmentado PDF | CSV) */}
                    <span className="dash-filter-divider" aria-hidden="true" />
                    <div className="dash-export-group" role="group" aria-label="Exportar informe">
                        <button
                            type="button"
                            className="dash-export-seg-btn"
                            onClick={handleImprimirPdf}
                            disabled={cargando || !kpis}
                            title="Generar informe formal en PDF"
                        >
                            <FileText size={14} style={{ color: '#b85d38' }} />
                            <span>PDF</span>
                        </button>
                        <button
                            type="button"
                            className="dash-export-seg-btn"
                            onClick={handleExportarCsv}
                            disabled={cargando || !kpis}
                            title="Descargar reporte estructurado para Excel (.csv)"
                        >
                            <FileSpreadsheet size={14} style={{ color: '#2d5a43' }} />
                            <span>CSV</span>
                        </button>
                    </div>
                </div>
            </header>

            {errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                    <ShieldAlert size={16} />
                    <span><strong>Error:</strong> {errorMsg}</span>
                </div>
            )}

            {/* SECCIÓN 1: JERARQUÍA KPI 1 + 4 (Opción 1) */}
            <section className="dash-kpi-layout" aria-label="Indicadores clave de rendimiento">
                {/* KPI Hero Financiero con Sparkline SVG */}
                <article className="dash-card dash-card-lift dash-hero-kpi dash-anim-up dash-delay-1">
                    <div className="dash-hero-top">
                        <div>
                            <div className="dash-kpi-label">Ingresos Contratados ({anoSeleccionado})</div>
                            <div className="dash-hero-amount num">
                                ${heroPartes.entero}
                                <span className="dash-hero-decimals">{heroPartes.decimales}</span>
                            </div>
                        </div>
                        <span className={`dash-delta-pill ${cambioPositivo ? 'is-up' : 'is-down'}`}>
                            {cambioPositivo ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            <span>{cambioPositivo ? '+' : ''}{kpis?.cambioIngresosPct ?? 0}%</span>
                        </span>
                    </div>

                    <div className="dash-hero-footer">
                        <div className="dash-hero-submetrics">
                            <span>
                                Ingreso neto:{' '}
                                <strong className="num" style={{ color: 'var(--brand-palm)' }}>
                                    {formatoMoneda(kpis?.ingresosNetos)}
                                </strong>
                            </span>
                            <span>
                                Anticipos cobrados:{' '}
                                <strong className="num">{formatoMoneda(kpis?.anticiposCobrados)}</strong>
                            </span>
                        </div>
                        <SparklineSvg
                            key={`hero-sp-${anoSeleccionado}-${metricaGrafica}-${idHotelFiltro}`}
                            values={sparklineSeriePrincipal}
                            color="#2d5a43"
                            width={136}
                            height={40}
                            idSuffix="hero"
                        />
                    </div>
                </article>

                {/* 4 KPIs Secundarios en 2×2 */}
                <div className="dash-kpi-subgrid">
                    {/* Ocupación con Anillo Radial SVG */}
                    <article className="dash-card dash-card-lift dash-mini-kpi dash-anim-up dash-delay-2">
                        <div>
                            <div className="dash-kpi-label">Ocupación Promedio</div>
                            <div className="dash-mini-value num">{kpis?.ocupacionPorcentaje ?? 0}%</div>
                            <div className="dash-mini-caption num">
                                {formatoNumero(kpis?.nochesVendidas)} noches vendidas
                            </div>
                        </div>
                        <RadialRingSvg porcentaje={kpis?.ocupacionPorcentaje ?? 0} color="#2d5a43" />
                    </article>

                    {/* ADR */}
                    <article className="dash-card dash-card-lift dash-mini-kpi dash-anim-up dash-delay-3">
                        <div>
                            <div className="dash-kpi-label">ADR · Tarifa Promedio</div>
                            <div className="dash-mini-value num">{formatoMoneda(kpis?.adr)}</div>
                            <div className="dash-mini-caption">Por habitación ocupada</div>
                        </div>
                        <div className="dash-icon-chip" style={{ background: '#eaf0f6', color: '#16324f' }}>
                            <BedDouble size={20} strokeWidth={1.8} />
                        </div>
                    </article>

                    {/* RevPAR */}
                    <article className="dash-card dash-card-lift dash-mini-kpi dash-anim-up dash-delay-4">
                        <div>
                            <div className="dash-kpi-label">RevPAR · Rendimiento</div>
                            <div className="dash-mini-value num">{formatoMoneda(kpis?.revpar)}</div>
                            <div className="dash-mini-caption num">
                                ADR &times; Ocupación ({kpis?.totalHabitaciones ?? 0} cuartos)
                            </div>
                        </div>
                        <div className="dash-icon-chip" style={{ background: '#e8f3ed', color: '#2d5a43' }}>
                            <TrendingUp size={20} strokeWidth={1.8} />
                        </div>
                    </article>

                    {/* Cancelaciones & No-Show */}
                    <article className="dash-card dash-card-lift dash-mini-kpi dash-anim-up dash-delay-5">
                        <div>
                            <div className="dash-kpi-label">Cancelaciones / No-Show</div>
                            <div className="dash-mini-value num">{kpis?.tasaCancelacion ?? 0}%</div>
                            <div className="dash-mini-caption num">
                                No-Show: <strong style={{ color: 'var(--brand-terracotta-deep)' }}>{kpis?.tasaNoShow ?? 0}%</strong> ({kpis?.noShows ?? 0} casos)
                            </div>
                        </div>
                        <div className="dash-icon-chip" style={{ background: '#faebe5', color: '#b85d38' }}>
                            <ShieldAlert size={20} strokeWidth={1.8} />
                        </div>
                    </article>
                </div>
            </section>

            {/* SECCIÓN 2: GRÁFICA DUAL SVG (8 COLS) + DONUT CATEGORÍAS SVG (4 COLS) */}
            <section className="dash-main-grid">
                {/* Gráfica Principal SVG con selector Curvas/Área (Op. 1) y Barras+Referencia (Op. 2) */}
                <article className="dash-card dash-anim-up dash-delay-3">
                    <div className="dash-card-head">
                        <div>
                            <h2 className="dash-card-title">
                                {tipoGrafica === 'curvas'
                                    ? 'Serie Temporal (2020–2026)'
                                    : `Estacionalidad ${anoSeleccionado} vs. ${anoSeleccionado > 2020 ? anoSeleccionado - 1 : anoSeleccionado}`}
                            </h2>
                        </div>

                        <div className="dash-chart-controls">
                            {/* Selector de tipo de gráfica (Opción 1 vs Opción 2) */}
                            <div className="dash-segmented" role="group" aria-label="Tipo de gráfica">
                                <button
                                    type="button"
                                    className={`dash-seg-btn ${tipoGrafica === 'curvas' ? 'is-active' : ''}`}
                                    onClick={() => { setTipoGrafica('curvas'); setMesHoverIdx(null); }}
                                >
                                    <Activity size={13} />
                                    <span>Área</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dash-seg-btn ${tipoGrafica === 'barras' ? 'is-active' : ''}`}
                                    onClick={() => { setTipoGrafica('barras'); setMesHoverIdx(null); }}
                                >
                                    <BarChart3 size={13} />
                                    <span>Barras</span>
                                </button>
                            </div>

                            {/* Selector de métrica con iconos SVG (sin emojis) */}
                            <div className="dash-segmented" role="group" aria-label="Métrica de la gráfica">
                                <button
                                    type="button"
                                    className={`dash-seg-btn ${metricaGrafica === 'ingresos' ? 'is-active' : ''}`}
                                    onClick={() => setMetricaGrafica('ingresos')}
                                >
                                    <DollarSign size={13} />
                                    <span>Ingresos</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dash-seg-btn ${metricaGrafica === 'ocupacion' ? 'is-active' : ''}`}
                                    onClick={() => setMetricaGrafica('ocupacion')}
                                >
                                    <Percent size={13} />
                                    <span>Ocupación</span>
                                </button>
                                <button
                                    type="button"
                                    className={`dash-seg-btn ${metricaGrafica === 'reservas' ? 'is-active' : ''}`}
                                    onClick={() => setMetricaGrafica('reservas')}
                                >
                                    <ClipboardList size={13} />
                                    <span>Reservas</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Chips de años (solo en modo Curvas) o Leyenda compacta (en modo Barras) */}
                    {tipoGrafica === 'curvas' ? (
                        <div className="dash-year-chips">
                            {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(a => {
                                const activo = anosActivos.includes(a);
                                const colorAno = PALETA_ANOS[a];
                                return (
                                    <button
                                        key={a}
                                        type="button"
                                        className={`dash-year-chip ${activo ? 'is-active' : ''}`}
                                        style={activo ? { borderColor: colorAno, background: `${colorAno}14` } : undefined}
                                        onClick={() => toggleAnoGrafica(a)}
                                        onMouseEnter={() => activo && setAnoEnfocado(String(a))}
                                        onMouseLeave={() => setAnoEnfocado(null)}
                                    >
                                        <span
                                            className="dash-year-dot"
                                            style={{ background: activo ? colorAno : '#cbd5e1' }}
                                        />
                                        <span className="num">{a}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="dash-year-chips" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#16324f' }} />
                                {anoSeleccionado} Regular
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#b85d38' }} />
                                Mes Pico
                            </span>
                            {graficaConfig?.curvaRefBarras && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 10 }}>
                                    <span style={{ width: 14, height: 2, background: '#2d5a43' }} />
                                    Referencia {graficaConfig.curvaRefBarras.ano}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Lienzo SVG */}
                    {graficaConfig && (
                        <div className="dash-chart-wrap" onMouseLeave={() => setMesHoverIdx(null)}>
                            <svg
                                key={`svg-${tipoGrafica}-${metricaGrafica}-${anoSeleccionado}-${anosActivos.join('-')}-${idHotelFiltro}`}
                                viewBox={`0 0 ${graficaConfig.width} ${graficaConfig.height}`}
                                style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block', overflow: 'visible' }}
                            >
                                <defs>
                                    <linearGradient id="dashAreaPalm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={PALETA_ANOS[anoSeleccionado] || '#2d5a43'} stopOpacity="0.22" />
                                        <stop offset="100%" stopColor={PALETA_ANOS[anoSeleccionado] || '#2d5a43'} stopOpacity="0.00" />
                                    </linearGradient>
                                </defs>

                                {/* Líneas horizontales Y */}
                                {graficaConfig.lineasY.map((item, idx) => (
                                    <g key={idx}>
                                        <line
                                            x1={graficaConfig.padLeft}
                                            y1={item.y}
                                            x2={graficaConfig.width - graficaConfig.padRight}
                                            y2={item.y}
                                            stroke="#e2e8f0"
                                            strokeDasharray="3 4"
                                        />
                                        <text
                                            x={graficaConfig.padLeft - 10}
                                            y={item.y + 3.5}
                                            fill="#64748b"
                                            fontSize="10"
                                            textAnchor="end"
                                            fontWeight="600"
                                        >
                                            {item.valorLabel}
                                        </text>
                                    </g>
                                ))}

                                {tipoGrafica === 'curvas' ? (
                                    <>
                                        {/* Etiquetas Eje X */}
                                        {graficaConfig.mesesCortos.map((m, idx) => {
                                            const x = graficaConfig.padLeft + idx * graficaConfig.stepX;
                                            const isHover = mesHoverIdx === idx;
                                            return (
                                                <text
                                                    key={m}
                                                    x={x}
                                                    y={graficaConfig.height - 10}
                                                    fill={isHover ? '#16324f' : '#64748b'}
                                                    fontSize="10.5"
                                                    textAnchor="middle"
                                                    fontWeight={isHover ? '800' : '600'}
                                                >
                                                    {m}
                                                </text>
                                            );
                                        })}

                                        {/* Área degradada para el año principal si está activo */}
                                        {graficaConfig.lineas[String(anoSeleccionado)] && (
                                            <path
                                                d={graficaConfig.lineas[String(anoSeleccionado)].areaPath}
                                                fill="url(#dashAreaPalm)"
                                                className="dash-svg-area"
                                            />
                                        )}

                                        {/* Curvas de cada año activo */}
                                        {Object.entries(graficaConfig.lineas).map(([anoStr, l]) => {
                                            const esPrincipal = Number(anoStr) === anoSeleccionado;
                                            const atenuado = anoEnfocado && anoEnfocado !== anoStr;
                                            return (
                                                <g key={anoStr} style={{ opacity: atenuado ? 0.18 : 1, transition: 'opacity 180ms ease' }}>
                                                    <path
                                                        d={l.path}
                                                        fill="none"
                                                        stroke={l.color}
                                                        strokeWidth={esPrincipal ? 2.6 : 1.85}
                                                        strokeDasharray={!esPrincipal && Number(anoStr) < anoSeleccionado - 1 ? '5 4' : undefined}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="dash-svg-line"
                                                    />
                                                </g>
                                            );
                                        })}

                                        {/* Crosshair vertical interactivo al pasar el cursor */}
                                        {mesHoverIdx !== null && (
                                            <g>
                                                <line
                                                    x1={graficaConfig.padLeft + mesHoverIdx * graficaConfig.stepX}
                                                    y1={graficaConfig.padTop}
                                                    x2={graficaConfig.padLeft + mesHoverIdx * graficaConfig.stepX}
                                                    y2={graficaConfig.padTop + graficaConfig.chartH}
                                                    stroke="#16324f"
                                                    strokeWidth="1.2"
                                                    strokeDasharray="3 3"
                                                    opacity="0.45"
                                                />
                                                {Object.entries(graficaConfig.lineas).map(([anoStr, l]) => {
                                                    const pt = l.puntos[mesHoverIdx];
                                                    if (!pt) return null;
                                                    return (
                                                        <circle
                                                            key={anoStr}
                                                            cx={pt.x}
                                                            cy={pt.y}
                                                            r={Number(anoStr) === anoSeleccionado ? 5.5 : 4}
                                                            fill={l.color}
                                                            stroke="#ffffff"
                                                            strokeWidth="2.2"
                                                        />
                                                    );
                                                })}
                                            </g>
                                        )}

                                        {/* Columnas invisibles de captura táctil / hover */}
                                        {graficaConfig.mesesCortos.map((m, idx) => {
                                            const x = graficaConfig.padLeft + idx * graficaConfig.stepX;
                                            return (
                                                <rect
                                                    key={`hit-${m}`}
                                                    x={x - graficaConfig.stepX / 2}
                                                    y={graficaConfig.padTop}
                                                    width={graficaConfig.stepX}
                                                    height={graficaConfig.chartH}
                                                    fill="transparent"
                                                    style={{ cursor: 'crosshair' }}
                                                    onMouseEnter={() => setMesHoverIdx(idx)}
                                                />
                                            );
                                        })}
                                    </>
                                ) : (
                                    <>
                                        {/* Modo Barras + Referencia (Opción 2) */}
                                        {graficaConfig.barras.map((b) => {
                                            const isHover = mesHoverIdx === b.idx;
                                            return (
                                                <g
                                                    key={b.idx}
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={() => setMesHoverIdx(b.idx)}
                                                >
                                                    <rect
                                                        x={b.x}
                                                        y={graficaConfig.padTop}
                                                        width={b.width}
                                                        height={graficaConfig.chartH}
                                                        rx="6"
                                                        fill={isHover ? '#eaf0f6' : '#f5f0e8'}
                                                        opacity={isHover ? 0.9 : 0.45}
                                                    />
                                                    <rect
                                                        x={b.x}
                                                        y={b.y}
                                                        width={b.width}
                                                        height={Math.max(b.height, 2)}
                                                        rx="6"
                                                        fill={b.isPeak ? '#b85d38' : '#16324f'}
                                                        opacity={isHover ? 1 : 0.88}
                                                        className="dash-bar-grow"
                                                        style={{ animationDelay: `${b.idx * 35}ms` }}
                                                    />
                                                    <text
                                                        x={b.cx}
                                                        y={graficaConfig.height - 10}
                                                        fill={isHover ? '#16324f' : '#64748b'}
                                                        fontSize="10.5"
                                                        textAnchor="middle"
                                                        fontWeight={isHover ? '800' : '600'}
                                                    >
                                                        {b.mesCorto}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* Curva de referencia del año anterior */}
                                        {graficaConfig.curvaRefBarras && (
                                            <path
                                                d={graficaConfig.curvaRefBarras.path}
                                                fill="none"
                                                stroke="#2d5a43"
                                                strokeWidth="2.2"
                                                strokeDasharray="4 4"
                                                strokeLinecap="round"
                                                className="dash-svg-line"
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        )}
                                    </>
                                )}
                            </svg>

                            {/* Tooltip flotante anclado con comparativa del mes bajo el cursor */}
                            {mesHoverIdx !== null && (
                                <div className="dash-floating-tooltip">
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {graficaConfig.mesesLargos[mesHoverIdx]}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {Object.entries(graficaConfig.lineas)
                                            .sort((a, b) => Number(b[0]) - Number(a[0]))
                                            .map(([anoStr, l]) => {
                                                const pt = l.puntos[mesHoverIdx];
                                                if (!pt) return null;
                                                return (
                                                    <div key={anoStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, fontSize: '0.8rem' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#e2e8f0' }}>
                                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
                                                            {anoStr}
                                                        </span>
                                                        <strong className="num" style={{ color: '#ffffff' }}>
                                                            {formatearValorMetrica(pt.valor)}
                                                        </strong>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </article>

                {/* Donut SVG Interactivo por Categoría de Habitación (Opción 1) */}
                <article className="dash-card dash-donut-panel dash-anim-up dash-delay-4">
                    <div>
                        <h2 className="dash-card-title">Ingresos por Categoría</h2>
                    </div>

                    <div className="dash-donut-stage">
                        <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="74" cy="74" r={donutConfig.radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
                            {donutConfig.slices.map((s) => {
                                const isHovered = categoriaHoverIdx === s.idx;
                                return (
                                    <circle
                                        key={s.nombre}
                                        cx="74"
                                        cy="74"
                                        r={donutConfig.radius}
                                        fill="none"
                                        stroke={s.color}
                                        strokeWidth={isHovered ? '17' : '14'}
                                        strokeDasharray={s.strokeDasharray}
                                        strokeDashoffset={s.strokeDashoffset}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'stroke-width 180ms ease, opacity 180ms ease',
                                            opacity: categoriaHoverIdx !== null && !isHovered ? 0.45 : 1
                                        }}
                                        onMouseEnter={() => setCategoriaHoverIdx(s.idx)}
                                        onMouseLeave={() => setCategoriaHoverIdx(null)}
                                    />
                                );
                            })}
                        </svg>
                        <div className="dash-donut-center">
                            <span className="dash-donut-val num">
                                {categoriaActiva ? `${categoriaActiva.pct}%` : '100%'}
                            </span>
                            <span className="dash-donut-lbl">
                                {categoriaActiva ? categoriaActiva.nombre : 'Categorías'}
                            </span>
                        </div>
                    </div>

                    <div className="dash-cat-list">
                        {donutConfig.slices.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0' }}>
                                Sin ingresos registrados en este periodo.
                            </p>
                        ) : (
                            donutConfig.slices.map((s) => (
                                <div
                                    key={s.nombre}
                                    className={`dash-cat-row ${categoriaHoverIdx === s.idx ? 'is-hovered' : ''}`}
                                    onMouseEnter={() => setCategoriaHoverIdx(s.idx)}
                                    onMouseLeave={() => setCategoriaHoverIdx(null)}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                        {s.nombre}
                                    </span>
                                    <span className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {formatoMoneda(s.ingresos)}{' '}
                                        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({s.pct}%)</span>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </article>
            </section>

            {/* SECCIÓN 3: BARRA PROPORCIONAL ANIMADA DE FLUJO DE CAJA (Opción 2) */}
            <section className="dash-card dash-cashflow-card dash-anim-up dash-delay-4" aria-label="Conciliación de flujo de caja">
                <div className="dash-cashflow-head">
                    <div>
                        <h2 className="dash-card-title">Flujo de Caja · Cobrado vs. Proyectado ({anoSeleccionado})</h2>
                    </div>
                    <div className="dash-neto-badge">
                        <div className="dash-neto-label">Ingreso Neto Contratado</div>
                        <div className="dash-neto-value num">{formatoMoneda(kpis?.ingresosNetos)}</div>
                    </div>
                </div>

                {/* Barra apilada animada */}
                <div className="dash-stacked-bar" role="img" aria-label="Distribución proporcional de flujo de caja">
                    {flujoCajaItems.filter(it => it.valor > 0).map((it, idx) => (
                        <div
                            key={it.id}
                            className="dash-stacked-seg dash-width-grow"
                            style={{
                                width: `${Math.max(it.pct, 1.5)}%`,
                                background: it.color,
                                animationDelay: `${idx * 85}ms`
                            }}
                            title={`${it.label}: ${it.signo}${formatoMoneda(it.valor)}`}
                        />
                    ))}
                </div>

                {/* Desglose de los 5 rubros */}
                <div className="dash-cashflow-grid">
                    {flujoCajaItems.map((it) => (
                        <div key={it.id} className="dash-cf-item" style={{ borderLeftColor: it.color }}>
                            <div className="dash-cf-title">{it.label}</div>
                            <div
                                className="dash-cf-val num"
                                style={{ color: it.id === 'reembolsos' ? 'var(--color-error)' : 'var(--text-primary)' }}
                            >
                                {it.signo}{formatoMoneda(it.valor)}
                            </div>
                            <div className="dash-cf-sub">{it.sub}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECCIÓN 4: COMPARATIVA DE RENDIMIENTO ENTRE HOTELES CON MINI-BARRAS SVG */}
            <section className="dash-card dash-anim-up dash-delay-5" aria-label="Rendimiento comparativo entre hoteles">
                <div className="dash-card-head" style={{ marginBottom: 10 }}>
                    <div>
                        <h2 className="dash-card-title">Rendimiento por Propiedad ({anoSeleccionado})</h2>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }} className="num">
                        {rendimientoHoteles.length} {rendimientoHoteles.length === 1 ? 'propiedad' : 'propiedades'}
                    </span>
                </div>

                <div className="dash-table-wrap">
                    <table className="dash-table">
                        <thead>
                            <tr>
                                <th>Hotel / Sede</th>
                                <th>Ciudad</th>
                                <th style={{ textAlign: 'right' }}>Contratado Bruto</th>
                                <th style={{ textAlign: 'right' }}>Contratado Neto</th>
                                <th style={{ textAlign: 'right' }}>Ocupación</th>
                                <th style={{ textAlign: 'right' }}>ADR</th>
                                <th style={{ textAlign: 'right' }}>RevPAR</th>
                                <th style={{ textAlign: 'right' }}>Reservas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rendimientoHoteles.map((h, idx) => {
                                const seleccionada = String(idHotelFiltro) === String(h.idHotel);
                                return (
                                <tr
                                    key={h.idHotel ?? idx}
                                    className={seleccionada ? 'is-selected' : ''}
                                    onClick={() => setIdHotelFiltro(seleccionada ? '' : String(h.idHotel))}
                                    title={seleccionada ? 'Clic para ver toda la cadena' : `Filtrar dashboard por ${h.nombre}`}
                                >
                                    <td style={{ fontWeight: 700 }}>
                                        {h.nombre}
                                        {h.activo === false && (
                                            <span style={{
                                                marginLeft: 8,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                padding: '2px 7px',
                                                borderRadius: 999,
                                                background: 'var(--bg-subtle)',
                                                color: 'var(--text-muted)'
                                            }}>
                                                Inactiva
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{h.ciudad}</td>
                                    <td className="num" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand-palm)' }}>
                                        {formatoMoneda(h.ingresosBrutos)}
                                    </td>
                                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                                        {formatoMoneda(h.ingresosNetos)}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="dash-occ-cell">
                                            <div className="dash-occ-track">
                                                <div
                                                    className="dash-occ-fill dash-width-grow"
                                                    style={{
                                                        width: `${Math.min(Number(h.ocupacionPorcentaje || 0), 100)}%`,
                                                        animationDelay: `${idx * 70}ms`
                                                    }}
                                                />
                                            </div>
                                            <span className="num" style={{ fontWeight: 700, color: 'var(--brand-ocean)', minWidth: 42 }}>
                                                {h.ocupacionPorcentaje}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="num" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                        {formatoMoneda(h.adr)}
                                    </td>
                                    <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>
                                        {formatoMoneda(h.revpar)}
                                    </td>
                                    <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
                                        {formatoNumero(h.totalReservas)}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ============================================================== */}
            {/* MÓDULOS ADICIONALES (VARIANTE B — DEBAJO DE LA ESTRUCTURA)     */}
            {/* ============================================================== */}

            {/* SECCIÓN 5: PULSO OPERATIVO DE HOY (Variante B · 3 Tarjetas) */}
            <section className="dash-section-block dash-anim-up dash-delay-5" aria-label="Pulso operativo de hoy">
                <div className="dash-section-kicker">
                    <svg width="7" height="7" viewBox="0 0 8 8" aria-hidden="true">
                        <circle cx="4" cy="4" r="4" fill="#b85d38" className="dash-pulse-dot" />
                    </svg>
                    <span>Pulso de Hoy</span>
                </div>

                <div className="dash-pulso-grid">
                    <article className="dash-card dash-card-lift dash-pulso-card">
                        <div>
                            <div className="dash-kpi-label">Llegadas Hoy</div>
                            <div className="dash-mini-value num">{pulsoHoy.llegadasHoy}</div>
                            <div className="dash-mini-caption">Check-in · 15:00 h</div>
                        </div>
                        <div className="dash-icon-chip" style={{ background: '#eaf0f6', color: '#16324f' }}>
                            <LogIn size={19} strokeWidth={1.8} />
                        </div>
                    </article>

                    <article className="dash-card dash-card-lift dash-pulso-card">
                        <div>
                            <div className="dash-kpi-label">Check-Outs Hoy</div>
                            <div className="dash-mini-value num">{pulsoHoy.checkOutsHoy}</div>
                            <div className="dash-mini-caption num" style={{ color: 'var(--brand-palm)', fontWeight: 600 }}>
                                {formatoMoneda(pulsoHoy.saldoCheckOutsHoy)} por liquidar
                            </div>
                        </div>
                        <div className="dash-icon-chip" style={{ background: '#e8f3ed', color: '#2d5a43' }}>
                            <LogOut size={19} strokeWidth={1.8} />
                        </div>
                    </article>

                    <article className={`dash-card dash-card-lift dash-pulso-card ${pulsoHoy.preReservasCriticas > 0 ? 'is-alert' : ''}`}>
                        <div>
                            <div className="dash-kpi-label" style={pulsoHoy.preReservasCriticas > 0 ? { color: '#b85d38' } : undefined}>
                                Pre-reservas Críticas
                            </div>
                            <div className="dash-mini-value num" style={pulsoHoy.preReservasCriticas > 0 ? { color: '#b85d38' } : undefined}>
                                {pulsoHoy.preReservasCriticas}
                            </div>
                            <div className="dash-mini-caption">Vencen en &lt; 4 hrs</div>
                        </div>
                        <div className="dash-icon-chip" style={{ background: '#faebe5', color: '#b85d38' }}>
                            <Clock size={19} strokeWidth={1.8} />
                        </div>
                    </article>
                </div>
            </section>

            {/* SECCIÓN 6: MÉTODOS DE PAGO (Var. B) + EMBUDO DE CONVERSIÓN (Var. B) */}
            <section className="dash-extra-grid dash-anim-up dash-delay-5" aria-label="Métodos de pago y conversión">
                {/* Métodos de Pago — Variante B (Anillo SVG + 4 tarjetas) */}
                <article className="dash-card">
                    <div className="dash-card-head" style={{ marginBottom: 14 }}>
                        <h2 className="dash-card-title">Métodos de Pago ({anoSeleccionado})</h2>
                    </div>

                    <div className="dash-pagos-layout">
                        <div className="dash-pagos-ring-wrap">
                            <svg width="118" height="118" viewBox="0 0 118 118" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="59" cy="59" r={pagosRingConfig.r} fill="none" stroke="#f1f5f9" strokeWidth="11" />
                                {pagosRingConfig.slices.map((s) => {
                                    const isHov = pagoHoverIdx === s.idx;
                                    return (
                                        <circle
                                            key={s.codigo}
                                            cx="59"
                                            cy="59"
                                            r={pagosRingConfig.r}
                                            fill="none"
                                            stroke={s.color}
                                            strokeWidth={isHov ? '13.5' : '11'}
                                            strokeDasharray={s.strokeDasharray}
                                            strokeDashoffset={s.strokeDashoffset}
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'stroke-width 170ms ease, opacity 170ms ease',
                                                opacity: pagoHoverIdx !== null && !isHov ? 0.45 : 1
                                            }}
                                            onMouseEnter={() => setPagoHoverIdx(s.idx)}
                                            onMouseLeave={() => setPagoHoverIdx(null)}
                                        />
                                    );
                                })}
                            </svg>
                            <div className="dash-pagos-ring-center">
                                <span className="num" style={{ fontSize: '0.92rem', fontWeight: 800, color: '#16324f' }}>
                                    {pagoActivo ? `${pagoActivo.pct}%` : `$${Math.round(Number(kpis?.totalCobradoMetodos || 0) / 1000)}k`}
                                </span>
                                <span style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--text-muted)', maxWidth: 74, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {pagoActivo ? pagoActivo.nombre : 'Cobrado'}
                                </span>
                            </div>
                        </div>

                        <div className="dash-pagos-grid">
                            {pagosRingConfig.slices.map((s) => (
                                <div
                                    key={s.codigo}
                                    className={`dash-pago-tile ${pagoHoverIdx === s.idx ? 'is-hovered' : ''}`}
                                    style={{ borderLeftColor: s.color }}
                                    onMouseEnter={() => setPagoHoverIdx(s.idx)}
                                    onMouseLeave={() => setPagoHoverIdx(null)}
                                >
                                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {s.nombre}
                                    </div>
                                    <div className="num" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                                        {formatoMoneda(s.monto)}
                                    </div>
                                    <div className="num" style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                        {s.pct}% &middot; {s.operaciones} cobros
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>

                {/* Embudo de Conversión — Variante B (4 tarjetas por etapa) */}
                <article className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="dash-card-head" style={{ marginBottom: 14 }}>
                        <h2 className="dash-card-title">Embudo de Conversión ({anoSeleccionado})</h2>
                    </div>

                    <div className="dash-embudo-grid">
                        {embudoEtapas.map((et) => (
                            <div key={et.paso} className="dash-embudo-step">
                                <div className="num" style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', color: et.color }}>
                                    PASO {et.paso}
                                </div>
                                <div className="num" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 4px', lineHeight: 1.1 }}>
                                    {formatoNumero(et.count)}
                                </div>
                                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.25 }}>
                                    {et.titulo}
                                </div>
                                <div className="num" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: '0.74rem', fontWeight: 700, color: et.color }}>
                                    {et.pct}%
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            {/* SECCIÓN 7: COMPORTAMIENTO DE ESTANCIA — Variante B (Banda Continua) */}
            <section className="dash-card dash-alos-band dash-anim-up dash-delay-5" aria-label="Comportamiento de estancia">
                <div className="dash-alos-item">
                    <span className="dash-alos-label">Estancia Promedio (ALOS)</span>
                    <span className="dash-alos-value num" style={{ color: 'var(--brand-ocean)' }}>
                        {kpis?.estanciaPromedioNoches ?? 0} noches
                    </span>
                </div>
                <div className="dash-alos-item">
                    <span className="dash-alos-label">Anticipación Promedio (Lead Time)</span>
                    <span className="dash-alos-value num" style={{ color: 'var(--brand-palm)' }}>
                        {kpis?.anticipacionPromedioDias ?? 0} días
                    </span>
                </div>
            </section>
        </div>
    );
}
