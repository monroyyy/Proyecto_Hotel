import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    TrendingUp, Calendar, Building2, DollarSign, Percent,
    BedDouble, ArrowUpRight, ArrowDownRight, RefreshCw,
    Layers, Award, ShieldAlert, Sparkles, Filter, ChevronDown
} from 'lucide-react';
import {
    getDashboardKpis,
    getDashboardMensualComparativo,
    getDashboardPorCategoria,
    getDashboardPorHotel,
    getHoteles
} from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';

const PALETA_ANOS = {
    2020: '#64748b', // pizarra
    2021: '#0ea5e9', // azul cielo
    2022: '#8b5cf6', // morado
    2023: '#ec4899', // rosa
    2024: '#f59e0b', // ámbar
    2025: '#10b981', // esmeralda
    2026: '#22c55e', // verde brillante insignia
};

function formatoMoneda(valor) {
    if (valor == null || isNaN(valor)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(valor);
}

function formatoNumero(valor) {
    if (valor == null || isNaN(valor)) return '0';
    return new Intl.NumberFormat('es-MX').format(valor);
}

export default function DashboardPage() {
    const { user, isGerente, isAdmin } = useAuth();

    // Filtros principales
    const [anoSeleccionado, setAnoSeleccionado] = useState(2026);
    const [idHotelFiltro, setIdHotelFiltro] = useState('');
    const [metricaGrafica, setMetricaGrafica] = useState('ingresos'); // 'ingresos' | 'ocupacion' | 'reservas'

    // Años activos en la gráfica multianual (por defecto mostramos 2020, 2021 y 2026 como en el pizarrón)
    const [anosActivos, setAnosActivos] = useState([2020, 2021, 2025, 2026]);

    // Estados de datos
    const [hoteles, setHoteles] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [datosSerie, setDatosSerie] = useState(null);
    const [distribucionCategorias, setDistribucionCategorias] = useState([]);
    const [rendimientoHoteles, setRendimientoHoteles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Estado del tooltip interactivo en la gráfica SVG
    const [tooltipData, setTooltipData] = useState(null);

    // Cargar catálogo de hoteles
    useEffect(() => {
        getHoteles()
            .then(data => setHoteles(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error al cargar hoteles:', err));
    }, []);

    // Cargar datos del dashboard al cambiar filtros
    useEffect(() => {
        cargarDatosDashboard();
    }, [anoSeleccionado, idHotelFiltro, metricaGrafica, anosActivos]);

    const cargarDatosDashboard = async () => {
        setCargando(true);
        setErrorMsg('');
        try {
            const hotelIdParam = idHotelFiltro ? parseInt(idHotelFiltro, 10) : null;

            const [kpisRes, serieRes, catRes, hotRes] = await Promise.all([
                getDashboardKpis(anoSeleccionado, hotelIdParam),
                getDashboardMensualComparativo(anosActivos, hotelIdParam, metricaGrafica),
                getDashboardPorCategoria(anoSeleccionado, hotelIdParam),
                getDashboardPorHotel(anoSeleccionado)
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
                if (prev.length <= 1) return prev; // Mantener al menos 1 año
                return prev.filter(a => a !== ano);
            }
            return [...prev, ano].sort((a, b) => a - b);
        });
    };

    // Cálculos para la gráfica SVG interactiva
    const graficaConfig = useMemo(() => {
        if (!datosSerie || !datosSerie.series) return null;

        const series = datosSerie.series;
        const meses = datosSerie.mesesCortos || ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        const mesesLargos = datosSerie.meses || ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        let maxValor = 0;
        Object.values(series).forEach(vals => {
            vals.forEach(v => {
                if (v > maxValor) maxValor = v;
            });
        });

        if (maxValor <= 0) maxValor = metricaGrafica === 'ocupacion' ? 100 : 10000;
        // Margen superior del 15%
        maxValor = maxValor * 1.15;

        // Dimensiones del lienzo SVG
        const width = 860;
        const height = 320;
        const padLeft = 65;
        const padRight = 30;
        const padTop = 25;
        const padBottom = 40;

        const chartW = width - padLeft - padRight;
        const chartH = height - padTop - padBottom;

        const stepX = chartW / (meses.length - 1);

        // Generar rutas SVG (SVG Path data con curvas Bézier suaves)
        const lineas = {};
        Object.entries(series).forEach(([anoStr, vals]) => {
            const ano = parseInt(anoStr, 10);
            const puntos = vals.map((v, idx) => {
                const x = padLeft + idx * stepX;
                const ratio = Math.max(0, Math.min(v / maxValor, 1));
                const y = padTop + chartH - (ratio * chartH);
                return { x, y, valor: v, mes: mesesLargos[idx], mesCorto: meses[idx], ano };
            });

            // Construir path curvo
            let d = '';
            for (let i = 0; i < puntos.length; i++) {
                if (i === 0) {
                    d += `M ${puntos[i].x},${puntos[i].y}`;
                } else {
                    const prev = puntos[i - 1];
                    const curr = puntos[i];
                    const cx1 = prev.x + (curr.x - prev.x) / 2;
                    const cy1 = prev.y;
                    const cx2 = prev.x + (curr.x - prev.x) / 2;
                    const cy2 = curr.y;
                    d += ` C ${cx1},${cy1} ${cx2},${cy2} ${curr.x},${curr.y}`;
                }
            }

            lineas[anoStr] = { puntos, path: d, color: PALETA_ANOS[ano] || '#38bdf8' };
        });

        // 4 líneas de referencia horizontal en Y
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

        return { width, height, padLeft, padBottom, stepX, meses, lineas, lineasY, maxValor };
    }, [datosSerie, metricaGrafica]);

    return (
        <div className="page-container dashboard-page-view" style={{ maxWidth: 1380, margin: '0 auto', padding: '1.75rem 1.5rem 3.5rem' }}>
            {/* Cabecera del Dashboard Ejecutivo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 9999, background: 'rgba(45, 90, 67, 0.12)',
                            color: 'var(--admin-accent)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                        }}>
                            <Sparkles size={12} />
                            <span>Consola de Dirección Hotelera</span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {user?.nombre || 'Don Roberto'} &bull; Periodo 2020 &ndash; 2026
                        </span>
                    </div>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                        Dashboard de Inteligencia y Finanzas
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '4px 0 0' }}>
                        Monitoreo de ingresos brutos, ADR, RevPAR, estacionalidad y balances de caja en tiempo real.
                    </p>
                </div>

                {/* Filtros Globales de Año y Hotel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', padding: '5px 12px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Año:</span>
                        <select
                            value={anoSeleccionado}
                            onChange={(e) => setAnoSeleccionado(parseInt(e.target.value, 10))}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(a => (
                                <option key={a} value={a}>
                                    {a} {a === 2026 ? '(Vigente)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', padding: '5px 12px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <Building2 size={15} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Propiedad:</span>
                        <select
                            value={idHotelFiltro}
                            onChange={(e) => setIdHotelFiltro(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="">Toda la Cadena (Consolidado)</option>
                            {hoteles.map(h => (
                                <option key={h.idHotel} value={h.idHotel}>
                                    {h.nombre} ({h.ciudad})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        onClick={cargarDatosDashboard}
                        title="Recargar métricas"
                        style={{ height: 38, padding: '0 14px' }}
                    >
                        <RefreshCw size={15} className={cargando ? 'spin-icon' : ''} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div style={{
                    padding: '12px 18px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444', color: '#fca5a5', marginBottom: 20, fontSize: '0.9rem'
                }}>
                    <strong>Error:</strong> {errorMsg}
                </div>
            )}

            {/* SECCIÓN 1: Tarjetas KPI Principales (Cálculos de Don Roberto) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem'
            }}>
                {/* KPI 1: Ingresos Brutos Totales */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 14, padding: '1.25rem', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Ingresos Brutos ({anoSeleccionado})
                        </span>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatoMoneda(kpis?.ingresosBrutos)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem' }}>
                        {kpis?.cambioIngresosPct >= 0 ? (
                            <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                                <ArrowUpRight size={14} /> +{kpis?.cambioIngresosPct}%
                            </span>
                        ) : (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                                <ArrowDownRight size={14} /> {kpis?.cambioIngresosPct}%
                            </span>
                        )}
                        <span style={{ color: 'var(--text-muted)' }}>vs año anterior</span>
                    </div>
                </div>

                {/* KPI 2: Ocupación Promedio */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 14, padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Ocupación Promedio
                        </span>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' }}>
                            <Percent size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {kpis?.ocupacionPorcentaje ?? 0}%
                    </div>
                    <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(kpis?.ocupacionPorcentaje || 0, 100)}%`,
                            background: 'linear-gradient(90deg, #0ea5e9, #22c55e)',
                            borderRadius: 3
                        }} />
                    </div>
                </div>

                {/* KPI 3: ADR (Tarifa Promedio Diaria) */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 14, padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ADR (Tarifa Promedio)
                        </span>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                            <BedDouble size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatoMoneda(kpis?.adr)}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: 8 }}>
                        Por habitación ocupada
                    </span>
                </div>

                {/* KPI 4: RevPAR (Ingreso por Cuarto Disponible) */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 14, padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            RevPAR (Rendimiento)
                        </span>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatoMoneda(kpis?.revpar)}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginTop: 8 }}>
                        ADR &times; Ocupación ({kpis?.totalHabitaciones} cuartos)
                    </span>
                </div>

                {/* KPI 5: Tasa de Cancelación & Reembolsos */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 14, padding: '1.25rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Cancelaciones / No-Show
                        </span>
                        <div style={{ padding: 6, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            <ShieldAlert size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {kpis?.tasaCancelacion ?? 0}%
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>No-Show: <strong style={{ color: 'var(--text-primary)' }}>{kpis?.tasaNoShow ?? 0}%</strong> ({kpis?.noShows} casos)</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: GRÁFICA MULTIANUAL INTERACTIVA (DEL PIZARRÓN: E, F, M, A, M... 2020 a 2026) */}
            <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                borderRadius: 16, padding: '1.5rem', marginBottom: '1.75rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                Serie Temporal Histórica (2020 &ndash; 2026)
                            </h2>
                            <span style={{
                                fontSize: '0.72rem', padding: '2px 8px', borderRadius: 6,
                                background: 'var(--bg-elevated)', color: '#38bdf8', fontWeight: 600
                            }}>
                                Pizarrón Oficial
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0' }}>
                            Comparativa de curvas mensuales (Enero a Diciembre). Haz clic en los años para activar o desactivar líneas.
                        </p>
                    </div>

                    {/* Selector de Métrica para la Gráfica */}
                    <div style={{ display: 'flex', gap: 6, background: 'var(--bg-elevated)', padding: 4, borderRadius: 10 }}>
                        <button
                            type="button"
                            onClick={() => setMetricaGrafica('ingresos')}
                            style={{
                                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 600,
                                background: metricaGrafica === 'ingresos' ? 'var(--color-primary, #2d5a43)' : 'transparent',
                                color: metricaGrafica === 'ingresos' ? '#fff' : 'var(--text-muted)'
                            }}
                        >
                            💰 Ingresos ($)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMetricaGrafica('ocupacion')}
                            style={{
                                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 600,
                                background: metricaGrafica === 'ocupacion' ? 'var(--color-primary, #2d5a43)' : 'transparent',
                                color: metricaGrafica === 'ocupacion' ? '#fff' : 'var(--text-muted)'
                            }}
                        >
                            📈 Ocupación (%)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMetricaGrafica('reservas')}
                            style={{
                                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', fontWeight: 600,
                                background: metricaGrafica === 'reservas' ? 'var(--color-primary, #2d5a43)' : 'transparent',
                                color: metricaGrafica === 'reservas' ? '#fff' : 'var(--text-muted)'
                            }}
                        >
                            📋 Reservaciones (#)
                        </button>
                    </div>
                </div>

                {/* Chips de selección de año para activar/desactivar curvas */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                    {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(a => {
                        const activo = anosActivos.includes(a);
                        const colorAno = PALETA_ANOS[a];
                        return (
                            <button
                                key={a}
                                type="button"
                                onClick={() => toggleAnoGrafica(a)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                                    border: `1.5px solid ${activo ? colorAno : 'var(--border-color)'}`,
                                    background: activo ? `${colorAno}18` : 'var(--bg-elevated)',
                                    color: activo ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontSize: '0.8rem', fontWeight: 700,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{
                                    width: 9, height: 9, borderRadius: '50%',
                                    background: activo ? colorAno : 'var(--text-muted)'
                                }} />
                                <span>{a} {a === 2026 ? '★' : ''}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Lienzo SVG de la Gráfica */}
                {graficaConfig && (
                    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                        <svg
                            viewBox={`0 0 ${graficaConfig.width} ${graficaConfig.height}`}
                            style={{ width: '100%', minWidth: 620, height: 'auto', display: 'block' }}
                        >
                            <defs>
                                <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
                                </linearGradient>
                            </defs>

                            {/* Líneas horizontales de referencia en Y */}
                            {graficaConfig.lineasY.map((item, idx) => (
                                <g key={idx}>
                                    <line
                                        x1={graficaConfig.padLeft}
                                        y1={item.y}
                                        x2={graficaConfig.width - 30}
                                        y2={item.y}
                                        stroke="#e2e8f0"
                                        strokeDasharray="4 4"
                                    />
                                    <text
                                        x={graficaConfig.padLeft - 10}
                                        y={item.y + 4}
                                        fill="var(--text-muted)"
                                        fontSize="10"
                                        textAnchor="end"
                                        fontWeight="600"
                                        fontFamily="Plus Jakarta Sans, sans-serif"
                                    >
                                        {item.valorLabel}
                                    </text>
                                </g>
                            ))}

                            {/* Eje X con los 12 meses (E, F, M, A, M, J, J, A, S, O, N, D) como en el pizarrón */}
                            {graficaConfig.meses.map((m, idx) => {
                                const x = graficaConfig.padLeft + idx * graficaConfig.stepX;
                                const y = graficaConfig.height - 14;
                                return (
                                    <g key={idx}>
                                        <line
                                            x1={x}
                                            y1={graficaConfig.height - graficaConfig.padBottom}
                                            x2={x}
                                            y2={graficaConfig.height - graficaConfig.padBottom + 6}
                                            stroke="#cbd5e1"
                                        />
                                        <text
                                            x={x}
                                            y={y}
                                            fill="var(--text-muted)"
                                            fontSize="11"
                                            textAnchor="middle"
                                            fontWeight="700"
                                            fontFamily="Plus Jakarta Sans, sans-serif"
                                        >
                                            {m}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Trazado de las curvas para cada año activo */}
                            {Object.entries(graficaConfig.lineas).map(([anoStr, l]) => (
                                <g key={anoStr}>
                                    <path
                                        d={l.path}
                                        fill="none"
                                        stroke={l.color}
                                        strokeWidth={anoStr === '2026' ? '3' : '2'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transition: 'stroke-width 0.2s' }}
                                    />
                                    {/* Puntos interactivos sobre la curva */}
                                    {l.puntos.map((p, pIdx) => (
                                        <circle
                                            key={pIdx}
                                            cx={p.x}
                                            cy={p.y}
                                            r={anoStr === '2026' ? 4.5 : 3.5}
                                            fill={l.color}
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={(e) => {
                                                setTooltipData({
                                                    ano: p.ano,
                                                    mes: p.mes,
                                                    valor: p.valor,
                                                    color: l.color,
                                                    x: e.clientX,
                                                    y: e.clientY
                                                });
                                            }}
                                            onMouseLeave={() => setTooltipData(null)}
                                        />
                                    ))}
                                </g>
                            ))}
                        </svg>

                        {/* Tooltip flotante al pasar el cursor */}
                        {tooltipData && (
                            <div style={{
                                position: 'fixed',
                                top: tooltipData.y - 65,
                                left: tooltipData.x + 12,
                                pointerEvents: 'none',
                                background: '#18191e',
                                border: `1px solid ${tooltipData.color}`,
                                borderRadius: 8,
                                padding: '6px 12px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                zIndex: 9999,
                                fontSize: '0.8rem'
                            }}>
                                <div style={{ color: tooltipData.color, fontWeight: 700 }}>
                                    {tooltipData.ano} &bull; {tooltipData.mes}
                                </div>
                                <div style={{ color: '#fff', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                                    {metricaGrafica === 'ingresos'
                                        ? formatoMoneda(tooltipData.valor)
                                        : metricaGrafica === 'ocupacion'
                                            ? `${tooltipData.valor}% de ocupación`
                                            : `${tooltipData.valor} reservaciones`}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* SECCIÓN 3: Desglose de Flujo de Caja y Auditoría Financiera */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
                marginBottom: '1.75rem'
            }}>
                {/* Cuadro de Caja: Cobros vs Pendientes */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 16, padding: '1.5rem'
                }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
                        Flujo de Caja y Saldos ({anoSeleccionado})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
                            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Anticipos Cobrados (50%)</span>
                            <span style={{ fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(kpis?.anticiposCobrados)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
                            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Saldos Liquidados (Check-in)</span>
                            <span style={{ fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(kpis?.saldosLiquidados)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
                            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Penalizaciones Retenidas (No-Show / Cancelación)</span>
                            <span style={{ fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(kpis?.penalizacionesRetenidas)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-elevated)' }}>
                            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Reembolsos Bancarios Dispersados</span>
                            <span style={{ fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                -{formatoMoneda(kpis?.reembolsosDevueltos)}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                            borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>Ingreso Neto Real de Caja</span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(kpis?.ingresosNetos)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Distribución por Categoría de Habitación */}
                <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 16, padding: '1.5rem'
                }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
                        Ingresos por Categoría de Habitación
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {distribucionCategorias.map((cat, idx) => (
                            <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.nombre}</span>
                                    <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatoMoneda(cat.ingresos)} ({cat.participacionPct}%)
                                    </span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${cat.participacionPct}%`,
                                        background: idx === 0 ? '#38bdf8' : idx === 1 ? '#22c55e' : idx === 2 ? '#f59e0b' : '#ec4899',
                                        borderRadius: 3
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 4: Comparativa de Rendimiento entre Hoteles de la Cadena */}
            <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                borderRadius: 16, padding: '1.5rem'
            }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                    Rendimiento Comparativo entre Hoteles ({anoSeleccionado})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '8px 12px' }}>Hotel / Sede</th>
                                <th style={{ padding: '8px 12px' }}>Ciudad</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Ingresos Brutos</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Ingresos Netos</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Ocupación</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>ADR</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>RevPAR</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Reservas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rendimientoHoteles.map((h, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {h.nombre}
                                    </td>
                                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                                        {h.ciudad}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatoMoneda(h.ingresosBrutos)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatoMoneda(h.ingresosNetos)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0284c7', fontVariantNumeric: 'tabular-nums' }}>
                                        {h.ocupacionPorcentaje}%
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatoMoneda(h.adr)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatoMoneda(h.revpar)}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                        {formatoNumero(h.totalReservas)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
