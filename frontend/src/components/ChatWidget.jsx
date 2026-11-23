import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    MessageSquare, X, Send, Bot, User, Sparkles, Square, RotateCcw,
    Maximize2, Minimize2, Plus, Trash2, MessageCircle, PanelLeftClose, PanelLeftOpen,
    BarChart3, TrendingUp, Table2
} from 'lucide-react';
import { marked } from 'marked';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, getStoredToken, clearAuthSession } from '../api/hotelApi';
import './ChatWidget.css';

// Configurar marked para saltos de línea automáticos y tablas
marked.setOptions({
    breaks: true,
    gfm: true
});

function renderMarkdownWithTables(text) {
    if (!text) return '';
    try {
        let html = marked.parse(text);
        html = html.replace(/<table(\s*[^>]*)>/gi, '<div class="chat-table-wrapper"><table$1>');
        html = html.replace(/<\/table>/gi, '</table></div>');
        return html;
    } catch {
        return text;
    }
}

function formatChartValue(val, unit = 'currency', compact = false) {
    const num = Number(val) || 0;
    if (unit === 'percent') {
        return `${num.toFixed(1)}%`;
    }
    if (unit === 'number') {
        if (compact) {
            return Math.round(num).toLocaleString('es-MX');
        }
        return Number.isInteger(num)
            ? num.toLocaleString('es-MX')
            : num.toLocaleString('es-MX', { maximumFractionDigits: 1 });
    }
    if (compact) {
        if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
        if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(0)}k`;
        return `$${num.toFixed(0)}`;
    }
    return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Tarjeta de gráfica interactiva exclusiva para el rol GERENTE dentro del chat.
 * Soporta conmutación en vivo entre Barras, Línea/Área y Tabla de datos.
 */
function ChatChartCard({ chart }) {
    const [modo, setModo] = useState(chart?.type === 'line' ? 'line' : 'bar');
    const [hoverIdx, setHoverIdx] = useState(null);

    if (!chart || !Array.isArray(chart.labels) || !Array.isArray(chart.series) || chart.series.length === 0) {
        return null;
    }

    const labels = chart.labels;
    const series = chart.series;
    const unit = chart.unit || 'currency';
    const palette = ['#2d5a43', '#16324f', '#b85d38', '#0f766e'];

    const allValues = series.flatMap(s => (Array.isArray(s.data) ? s.data.map(v => Number(v) || 0) : []));
    const maxValRaw = Math.max(...allValues, 1);
    const maxVal = unit === 'percent'
        ? Math.min(Math.ceil(maxValRaw / 10) * 10 || 100, 100)
        : unit === 'number'
            ? Math.max(Math.ceil((maxValRaw * 1.1) / 4) * 4, 4)
            : maxValRaw * 1.12;

    // Estadísticas rápidas de la serie principal
    const primaryData = (series[0]?.data || []).map(v => Number(v) || 0);
    const totalPrimary = primaryData.reduce((acc, v) => acc + v, 0);
    const avgPrimary = primaryData.length > 0 ? totalPrimary / primaryData.length : 0;
    let peakIdx = 0;
    primaryData.forEach((v, idx) => {
        if (v > (primaryData[peakIdx] || 0)) peakIdx = idx;
    });

    const W = 520;
    const H = 195;
    const padL = 52;
    const padR = 16;
    const padT = 18;
    const padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = Math.max(labels.length, 1);
    const stepX = plotW / n;

    const getY = (val) => {
        const clamped = Math.max(0, Math.min(Number(val) || 0, maxVal));
        return padT + plotH - (clamped / maxVal) * plotH;
    };

    const gridTicks = [0, 0.25, 0.5, 0.75, 1];

    return (
        <div className="chat-chart-card">
            <div className="chat-chart-header">
                <div className="chat-chart-titles">
                    <div className="chat-chart-title">{chart.title || 'Análisis Gráfico Ejecutivo'}</div>
                    {chart.subtitle && <div className="chat-chart-subtitle">{chart.subtitle}</div>}
                </div>
                <div className="chat-chart-Modes" role="tablist" aria-label="Tipo de visualización">
                    <button
                        type="button"
                        className={`chat-chart-mode-btn ${modo === 'bar' ? 'is-active' : ''}`}
                        onClick={() => setModo('bar')}
                        title="Vista de barras"
                    >
                        <BarChart3 size={13} />
                        <span>Barras</span>
                    </button>
                    <button
                        type="button"
                        className={`chat-chart-mode-btn ${modo === 'line' ? 'is-active' : ''}`}
                        onClick={() => setModo('line')}
                        title="Vista de línea"
                    >
                        <TrendingUp size={13} />
                        <span>Línea</span>
                    </button>
                    <button
                        type="button"
                        className={`chat-chart-mode-btn ${modo === 'table' ? 'is-active' : ''}`}
                        onClick={() => setModo('table')}
                        title="Vista de datos"
                    >
                        <Table2 size={13} />
                        <span>Datos</span>
                    </button>
                </div>
            </div>

            {/* Leyenda de series */}
            <div className="chat-chart-legend">
                {series.map((s, sIdx) => (
                    <span key={sIdx} className="chat-chart-legend-item">
                        <span
                            className="chat-chart-legend-dot"
                            style={{ backgroundColor: s.color || palette[sIdx % palette.length] }}
                        />
                        <span>{s.name || `Serie ${sIdx + 1}`}</span>
                    </span>
                ))}
                {hoverIdx !== null && labels[hoverIdx] && (
                    <span className="chat-chart-hover-readout num">
                        <strong>{labels[hoverIdx]}:</strong>{' '}
                        {series.map((s, sIdx) => (
                            <span key={sIdx} style={{ marginLeft: sIdx > 0 ? 8 : 0 }}>
                                {series.length > 1 ? `${s.name}: ` : ''}
                                {formatChartValue(s.data?.[hoverIdx] || 0, unit, false)}
                            </span>
                        ))}
                    </span>
                )}
            </div>

            {modo === 'table' ? (
                <div className="chat-chart-table-wrap">
                    <table className="chat-chart-table">
                        <thead>
                            <tr>
                                <th>Periodo / Concepto</th>
                                {series.map((s, i) => (
                                    <th key={i} style={{ textAlign: 'right' }}>{s.name || `Serie ${i + 1}`}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {labels.map((lbl, rIdx) => (
                                <tr key={rIdx}>
                                    <td><strong>{lbl}</strong></td>
                                    {series.map((s, sIdx) => (
                                        <td key={sIdx} className="num" style={{ textAlign: 'right' }}>
                                            {formatChartValue(s.data?.[rIdx] || 0, unit, false)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="chat-chart-svg-wrap" onMouseLeave={() => setHoverIdx(null)}>
                    <svg viewBox={`0 0 ${W} ${H}`} className="chat-chart-svg" role="img" aria-label={chart.title || 'Gráfica'}>
                        {/* Líneas guía horizontales */}
                        {gridTicks.map((t, idx) => {
                            const val = maxVal * t;
                            const y = padT + plotH - t * plotH;
                            return (
                                <g key={idx}>
                                    <line
                                        x1={padL}
                                        y1={y}
                                        x2={W - padR}
                                        y2={y}
                                        stroke="#e2e8f0"
                                        strokeDasharray={t === 0 ? undefined : '3 3'}
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={padL - 6}
                                        y={y + 3.5}
                                        textAnchor="end"
                                        fontSize="9.5"
                                        fontWeight="600"
                                        fill="#64748b"
                                    >
                                        {formatChartValue(val, unit, true)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Modo Barras */}
                        {modo === 'bar' && labels.map((lbl, i) => {
                            const groupX = padL + i * stepX;
                            const sCount = series.length;
                            const groupPad = Math.max(stepX * 0.18, 4);
                            const availW = Math.max(stepX - groupPad * 2, 6);
                            const barW = Math.min(availW / sCount - 2, 26);
                            const totalBarsW = sCount * barW + (sCount - 1) * 2;
                            const startX = groupX + (stepX - totalBarsW) / 2;
                            const isHovered = hoverIdx === i;

                            return (
                                <g
                                    key={i}
                                    onMouseEnter={() => setHoverIdx(i)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {isHovered && (
                                        <rect
                                            x={groupX + 2}
                                            y={padT}
                                            width={Math.max(stepX - 4, 4)}
                                            height={plotH}
                                            fill="rgba(22, 50, 79, 0.05)"
                                            rx="4"
                                        />
                                    )}
                                    {series.map((s, sIdx) => {
                                        const val = Number(s.data?.[i]) || 0;
                                        const y = getY(val);
                                        const h = Math.max(padT + plotH - y, 2);
                                        const bx = startX + sIdx * (barW + 2);
                                        const color = s.color || palette[sIdx % palette.length];
                                        return (
                                            <rect
                                                key={sIdx}
                                                x={bx}
                                                y={y}
                                                width={Math.max(barW, 3)}
                                                height={h}
                                                rx="3"
                                                fill={color}
                                                opacity={hoverIdx === null || isHovered ? 0.94 : 0.62}
                                            />
                                        );
                                    })}
                                    <text
                                        x={groupX + stepX / 2}
                                        y={H - 10}
                                        textAnchor="middle"
                                        fontSize="9.5"
                                        fontWeight={isHovered ? '700' : '600'}
                                        fill={isHovered ? '#0f172a' : '#64748b'}
                                    >
                                        {String(lbl).length > 14 ? String(lbl).slice(0, 13) + '…' : lbl}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Modo Línea / Área */}
                        {modo === 'line' && (
                            <>
                                {series.map((s, sIdx) => {
                                    const color = s.color || palette[sIdx % palette.length];
                                    const pts = labels.map((_, i) => {
                                        const x = padL + i * stepX + stepX / 2;
                                        const y = getY(s.data?.[i] || 0);
                                        return { x, y, val: Number(s.data?.[i]) || 0 };
                                    });
                                    if (pts.length === 0) return null;
                                    const linePath = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                                    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${padT + plotH} L${pts[0].x.toFixed(1)},${padT + plotH} Z`;

                                    return (
                                        <g key={sIdx}>
                                            {sIdx === 0 && (
                                                <path d={areaPath} fill={color} opacity="0.11" />
                                            )}
                                            <path
                                                d={linePath}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="2.2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {pts.map((p, i) => (
                                                <circle
                                                    key={i}
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r={hoverIdx === i ? 4.5 : 3}
                                                    fill="#ffffff"
                                                    stroke={color}
                                                    strokeWidth="2"
                                                />
                                            ))}
                                        </g>
                                    );
                                })}
                                {labels.map((lbl, i) => {
                                    const groupX = padL + i * stepX;
                                    const isHovered = hoverIdx === i;
                                    return (
                                        <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: 'pointer' }}>
                                            <rect
                                                x={groupX}
                                                y={padT}
                                                width={stepX}
                                                height={plotH}
                                                fill="transparent"
                                            />
                                            <text
                                                x={groupX + stepX / 2}
                                                y={H - 10}
                                                textAnchor="middle"
                                                fontSize="9.5"
                                                fontWeight={isHovered ? '700' : '600'}
                                                fill={isHovered ? '#0f172a' : '#64748b'}
                                            >
                                                {String(lbl).length > 14 ? String(lbl).slice(0, 13) + '…' : lbl}
                                            </text>
                                        </g>
                                    );
                                })}
                            </>
                        )}
                    </svg>
                </div>
            )}

            {/* Pie de resumen estadístico */}
            <div className="chat-chart-footer">
                {unit !== 'percent' && (
                    <div className="chat-chart-stat">
                        <span className="chat-chart-stat-lbl">Acumulado ({series[0]?.name || 'Total'})</span>
                        <span className="chat-chart-stat-val num">{formatChartValue(totalPrimary, unit, false)}</span>
                    </div>
                )}
                <div className="chat-chart-stat">
                    <span className="chat-chart-stat-lbl">Promedio</span>
                    <span className="chat-chart-stat-val num">{formatChartValue(avgPrimary, unit, false)}</span>
                </div>
                <div className="chat-chart-stat">
                    <span className="chat-chart-stat-lbl">Punto Pico</span>
                    <span className="chat-chart-stat-val num">
                        {labels[peakIdx] || '—'} ({formatChartValue(primaryData[peakIdx] || 0, unit, true)})
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Animación de ola orgánica que aparece únicamente mientras se consulta información
 * y se desvanece suavemente en cuanto la IA comienza a escribir.
 */
function OceanWaveAnimation({ label = 'Consultando información', isFadingOut = false }) {
    return (
        <div
            className={`ocean-wave-status-card ${isFadingOut ? 'is-fading-out' : ''}`}
            role="status"
            aria-live="polite"
        >
            <div className="ocean-wave-top-row">
                <div className="ocean-wave-bars" aria-hidden="true">
                    <span className="ocean-wave-bar bar-1" />
                    <span className="ocean-wave-bar bar-2" />
                    <span className="ocean-wave-bar bar-3" />
                    <span className="ocean-wave-bar bar-4" />
                </div>
                <span className="ocean-wave-label">{label}</span>
            </div>
            <div className="ocean-wave-ribbon" aria-hidden="true">
                <svg className="ocean-wave-svg ocean-wave-layer-back" viewBox="0 0 800 36" preserveAspectRatio="none">
                    <path
                        d="M0,18 C100,4 200,32 300,18 C400,4 500,32 600,18 C700,4 750,26 800,18 L800,36 L0,36 Z"
                        fill="rgba(42, 111, 151, 0.22)"
                    />
                </svg>
                <svg className="ocean-wave-svg ocean-wave-layer-mid" viewBox="0 0 800 36" preserveAspectRatio="none">
                    <path
                        d="M0,20 C120,34 240,6 400,20 C560,34 680,6 800,20 L800,36 L0,36 Z"
                        fill="rgba(22, 50, 79, 0.36)"
                    />
                </svg>
                <svg className="ocean-wave-svg ocean-wave-layer-front" viewBox="0 0 800 36" preserveAspectRatio="none">
                    <path
                        d="M0,24 C90,12 180,33 280,22 C380,11 480,33 580,22 C680,11 740,29 800,24 L800,36 L0,36 Z"
                        fill="rgba(184, 93, 56, 0.55)"
                    />
                </svg>
            </div>
        </div>
    );
}

const CHIPS_HUESPED = [
    { label: 'Hoteles de la cadena', q: '¿Cuáles son los hoteles activos de la cadena y en qué ciudades están?' },
    { label: 'Disponibles hoy', q: '¿Qué habitaciones están disponibles actualmente?' },
    { label: 'Tipos y precios', q: '¿Qué tipos de habitaciones existen y cuánto cuestan?' },
    { label: 'Reservar habitación', q: 'Quiero hacer una reservación' },
    { label: 'Mis reservaciones', q: 'Muéstrame mis reservaciones registradas' },
    { label: 'Libres en planta baja', q: '¿Qué habitaciones están disponibles en planta baja para un adulto mayor?' },
    { label: 'Para 4 personas', q: '¿Qué habitaciones o tipos tienen para 4 personas?' },
    { label: 'Habitación más exclusiva', q: '¿Cuál es la habitación más cara de la cadena?' },
    { label: 'Vigencia pre-reserva', q: '¿Cuánto tiempo dura una pre-reserva y cuándo se cancela si no pagan?' },
    { label: 'Cancelación y reembolso', q: '¿Cuál es la política de cancelación y porcentaje de reembolso según los días?' }
];

const CHIPS_RECEPCIONISTA = [
    { label: 'Disponibles hoy', q: '¿Qué habitaciones están disponibles actualmente?' },
    { label: 'Reservar habitación', q: 'Quiero hacer una reservación' },
    { label: 'Habitaciones en pre-reserva', q: 'Dame las habitaciones en pre reserva' },
    { label: 'Consultar reservación', q: 'Consultar reservación' },
    { label: 'Resumen operativo de hoy', q: 'Dame el resumen operativo completo del hotel' },
    { label: 'Libres en planta baja', q: '¿Qué habitaciones están disponibles en planta baja para un adulto mayor?' },
    { label: 'Mantenimiento', q: 'Dame las habitaciones en mantenimiento' },
    { label: 'Tipos y precios', q: '¿Qué tipos de habitaciones existen y cuánto cuestan?' },
    { label: 'Cancelación y reembolso', q: '¿Cuál es la política de cancelación y porcentaje de reembolso según los días?' },
    { label: 'No-Show a las 10 PM', q: '¿Cómo se maneja el No-Show a las 8 PM y a las 10 PM?' },
    { label: 'Sobreventa (Overbooking)', q: '¿Cuál es el protocolo del hotel en caso de sobreventa o overbooking?' }
];

const CHIPS_GERENTE = [
    { label: 'Gráfica ingresos 2026', q: 'Dame el resumen financiero y métricas clave del año 2026' },
    { label: 'Gráfica 2021 vs 2025', q: 'Compara el desempeño histórico de ingresos entre 2021 y 2025' },
    { label: 'Gráfica mensual 2025', q: '¿Cuál fue el comportamiento mensual de ingresos en 2025?' },
    { label: 'Gráfica por hotel', q: 'Muéstrame la gráfica de ingresos por hotel en 2026' },
    { label: 'Gráfica por categoría', q: 'Muéstrame la gráfica de ingresos por categoría de habitación en 2026' },
    { label: 'Gráfica métodos de pago', q: 'Muéstrame la gráfica de métodos de pago en 2026' },
    { label: 'Usuarios registrados', q: 'Muéstrame los usuarios registrados en el sistema' },
    { label: 'Ingreso potencial', q: '¿Cuánto dinero se ingresaría si se rentan todas las habitaciones?' },
    { label: 'Resumen operativo de hoy', q: 'Dame el resumen operativo completo del hotel' },
    { label: 'Habitaciones en pre-reserva', q: 'Dame las habitaciones en pre reserva' },
    { label: 'Mantenimiento', q: 'Dame las habitaciones en mantenimiento' },
    { label: 'Total por hotel', q: '¿Cuántas habitaciones hay en cada hotel de la cadena?' }
];

const CHIPS_ADMIN = [
    { label: 'Hoteles activos', q: '¿Cuáles son los hoteles activos de la cadena?' },
    { label: 'Reservar habitación', q: 'Quiero hacer una reservación' },
    { label: 'Habitaciones en pre-reserva', q: 'Dame las habitaciones en pre reserva' },
    { label: 'Consultar reservación', q: 'Consultar reservación' },
    { label: 'Resumen operativo de hoy', q: 'Dame el resumen operativo completo del hotel' },
    { label: 'Disponibles hoy', q: '¿Qué habitaciones están disponibles actualmente?' },
    { label: 'Libres en planta baja', q: '¿Qué habitaciones están disponibles en planta baja para un adulto mayor?' },
    { label: 'Mantenimiento', q: 'Dame las habitaciones en mantenimiento' },
    { label: 'Total por hotel', q: '¿Cuántas habitaciones hay en cada hotel de la cadena?' },
    { label: 'Categorías de habitación', q: '¿Qué tipos de habitaciones existen y cuánto cuestan?' },
    { label: 'Cancelación y reembolso', q: '¿Cuál es la política de cancelación y porcentaje de reembolso según los días?' }
];

function esSaludoSimple(texto) {
    if (!texto) return true;
    const limpio = texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const saludos = [
        'hola', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas',
        'que tal', 'como estas', 'saludos', 'hey', 'hello', 'hi', 'ayuda'
    ];
    return saludos.includes(limpio);
}

function capitalizarTitulo(frase) {
    const menores = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'o', 'por', 'para', 'con', 'a', 'vs', 'al']);
    return frase
        .split(/\s+/)
        .filter(Boolean)
        .map((palabra, idx) => {
            const lower = palabra.toLowerCase();
            if (/^(202\d|hp-|adr|revpar|sql|mxn)$/i.test(palabra)) {
                return palabra.toUpperCase() === 'VS' ? 'vs' : palabra.toUpperCase();
            }
            if (idx > 0 && menores.has(lower)) {
                return lower;
            }
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

/**
 * Genera automáticamente un título semántico conciso estilo Gemini a partir
 * de la consulta del usuario y/o del encabezado estructurado de la respuesta.
 */
function generarTituloInteligente(userPrompt = '', botResponse = '') {
    // 1. Si la respuesta de la IA incluye un encabezado Markdown ###, sintetizar desde ahí
    if (botResponse && typeof botResponse === 'string') {
        const headingMatch = botResponse.match(/^###\s+([^\n]+)/m);
        if (headingMatch && headingMatch[1]) {
            let h = headingMatch[1]
                .replace(/\*\*/g, '')
                .replace(/\(\d+\s*(?:cuentas|totales|habitaciones)?\)/gi, '')
                .replace(/\((202\d)\)/g, '$1')
                .replace(/\([^)]*\)/g, '')
                .replace(/\s*—\s*Toda la cadena.*$/i, '')
                .replace(/^Resumen Ejecutivo y\s+/i, '')
                .replace(/^Comportamiento Mensual y\s+/i, '')
                .replace(/^Política Oficial de\s+/i, 'Política de ')
                .replace(/^Protocolo Oficial (?:de|ante)\s+/i, 'Protocolo de ')
                .replace(/\s+/g, ' ')
                .trim();
            if (h.length >= 4) {
                return h.length > 38 ? h.slice(0, 36).trim() : h;
            }
        }
    }

    if (!userPrompt || esSaludoSimple(userPrompt)) {
        return 'Nueva conversación';
    }

    const norm = userPrompt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // 2. Reglas semánticas directas por intención
    const anos = userPrompt.match(/\b202[0-6]\b/g) || [];
    if ((norm.includes('compara') || norm.includes(' vs ')) && anos.length >= 2) {
        const met = norm.includes('ocupacion') ? 'Ocupación' : norm.includes('reserva') ? 'Reservas' : 'Ingresos';
        return `Comparativa ${met} ${anos[0]} vs ${anos[1]}`;
    }
    if (norm.includes('metricas financieras') || norm.includes('resumen financiero')) {
        return `Métricas Financieras ${anos[0] || '2026'}`;
    }
    if (norm.includes('comportamiento mensual') || norm.includes('estacionalidad')) {
        return `Estacionalidad Mensual ${anos[0] || '2025'}`;
    }
    if (norm.includes('por hotel') && (norm.includes('grafica') || norm.includes('ingreso'))) {
        return `Ingresos por Propiedad ${anos[0] || ''}`.trim();
    }
    if (norm.includes('por categoria') && (norm.includes('grafica') || norm.includes('ingreso'))) {
        return `Ingresos por Categoría ${anos[0] || ''}`.trim();
    }
    if (norm.includes('metodo de pago') || norm.includes('metodos de pago')) {
        return `Recaudación por Método de Pago`;
    }
    if (norm.includes('ingreso potencial') || norm.includes('rentan todas')) {
        return 'Ingreso Potencial por Noche';
    }
    if (norm.includes('usuario') || norm.includes('cuentas registradas')) {
        return 'Directorio de Usuarios';
    }
    if (norm.includes('resumen operativo')) {
        return 'Resumen Operativo de Turno';
    }
    if (norm.includes('pre reserva') || norm.includes('prereserva')) {
        return norm.includes('vigencia') || norm.includes('dura') ? 'Vigencia de Pre-reservas' : 'Habitaciones en Pre-reserva';
    }
    if (norm.includes('mantenimiento')) {
        return 'Habitaciones en Mantenimiento';
    }
    if (norm.includes('cuantas habitaciones') && norm.includes('hotel')) {
        return 'Inventario por Propiedad';
    }
    if (norm.includes('planta baja') || norm.includes('adulto mayor')) {
        return 'Disponibilidad en Planta Baja';
    }
    if (norm.includes('disponibles')) {
        return 'Habitaciones Disponibles';
    }
    if (norm.includes('tipos') && (norm.includes('precio') || norm.includes('cuestan'))) {
        return 'Catálogo de Categorías y Tarifas';
    }
    if (norm.includes('cancelacion') || norm.includes('reembolso')) {
        return 'Política de Cancelación';
    }
    if (norm.includes('no show') || norm.includes('noshow')) {
        return 'Protocolo de No-Show';
    }
    if (norm.includes('sobreventa') || norm.includes('overbooking')) {
        return 'Protocolo de Sobreventa';
    }
    if (norm.includes('hacer una reservacion') || norm.includes('reservar habitacion')) {
        return 'Solicitud de Reservación';
    }

    // 3. Síntesis automática limpiando verbos de relleno y signos
    let limpio = userPrompt
        .replace(/[¿?¡!.,;:"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const prefijosRelleno = /^(?:hola\s+|buenos\s+dias\s+|buenas\s+tardes\s+|por\s+favor\s+|disculpa\s+)?(?:dame|muestrame|mostrar|quiero\s+ver|quiero\s+saber|quiero|necesito|me\s+puedes\s+dar|me\s+das|cuales\s+son|cual\s+es|cuantas|cuantos|que|como\s+se\s+maneja|como|dime|consultar|consulta)\s+(?:el|la|los|las|un|una|de|del|sobre)?\s*/i;
    limpio = limpio.replace(prefijosRelleno, '').trim();

    if (!limpio) {
        limpio = userPrompt.replace(/[¿?¡!]/g, '').trim();
    }

    const palabras = limpio.split(/\s+/).slice(0, 5);
    const sintetizado = capitalizarTitulo(palabras.join(' '));
    return sintetizado || 'Consulta de Hotel';
}

function normalizarConversacionesGuardadas(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map((conv) => {
        const msgs = Array.isArray(conv?.messages) ? conv.messages : [];
        const firstSubstantiveUser = msgs.find((m) => m.sender === 'user' && !esSaludoSimple(m.text))
            || msgs.find((m) => m.sender === 'user');
        const firstSubstantiveBot = msgs.find((m, idx) => m.sender === 'bot' && idx > 0 && !esSaludoSimple(msgs[idx - 1]?.text))
            || msgs.find((m) => m.sender === 'bot');

        const currentTitle = conv?.title || '';
        const needsUpgrade = !currentTitle
            || currentTitle.endsWith('...')
            || esSaludoSimple(currentTitle)
            || currentTitle === 'Conversación';

        if (needsUpgrade && firstSubstantiveUser) {
            return {
                ...conv,
                title: generarTituloInteligente(firstSubstantiveUser.text, firstSubstantiveBot?.text || '')
            };
        }
        return conv;
    });
}

export default function ChatWidget() {
    const { user, isAdmin, isGerente, isRecepcionista, isStaff } = useAuth();
    const userScopeKey = user?.idUsuario ? `u${user.idUsuario}` : 'anon';
    const STORAGE_SESSIONS_KEY = `hotel_chat_sessions_v2_${userScopeKey}`;
    const STORAGE_ACTIVE_ID_KEY = `hotel_chat_active_session_id_v2_${userScopeKey}`;

    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [conversations, setConversations] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return normalizarConversacionesGuardadas(parsed);
                }
            }
        } catch (e) {
            console.error('Error al cargar conversaciones guardadas:', e);
        }
        return [];
    });

    const [activeId, setActiveId] = useState(() => {
        try {
            const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
            if (savedId) return savedId;
        } catch (e) {}
        return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `rec-${Date.now()}`;
    });

    const [pendingMessages, setPendingMessages] = useState([]);

    // Recargar historial al cambiar de usuario en sesión
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
            const parsed = saved ? JSON.parse(saved) : [];
            setConversations(Array.isArray(parsed) ? normalizarConversacionesGuardadas(parsed) : []);
            const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
            setActiveId(savedId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `rec-${Date.now()}`));
            setPendingMessages([]);
        } catch {
            setConversations([]);
            setPendingMessages([]);
        }
    }, [STORAGE_SESSIONS_KEY, STORAGE_ACTIVE_ID_KEY]);

    const currentConv = useMemo(() => {
        return conversations.find(c => c.id === activeId) || null;
    }, [conversations, activeId]);

    const messages = currentConv ? (currentConv.messages || []) : pendingMessages;

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(conversations));
        } catch (e) {
            console.error('Error al guardar conversaciones:', e);
        }
    }, [conversations, STORAGE_SESSIONS_KEY]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeId);
        } catch (e) {}
    }, [activeId, STORAGE_ACTIVE_ID_KEY]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMsgIndex, setStreamingMsgIndex] = useState(null);
    const [fadingWaveIndex, setFadingWaveIndex] = useState(null);
    const [model, setModel] = useState('ollama');
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);
    const typingIntervalRef = useRef(null);
    const fadeWaveTimeoutRef = useRef(null);

    const isResponding = isLoading || streamingMsgIndex !== null;

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, isFullscreen, streamingMsgIndex]);

    const updateActiveMessages = (updater) => {
        setConversations(prev => {
            const exists = prev.some(c => c.id === activeId);
            if (exists) {
                return prev.map(conv => {
                    if (conv.id === activeId) {
                        const newMessages = typeof updater === 'function' ? updater(conv.messages || []) : updater;
                        return {
                            ...conv,
                            messages: newMessages,
                            updatedAt: Date.now()
                        };
                    }
                    return conv;
                });
            } else {
                setPendingMessages(prevPend => typeof updater === 'function' ? updater(prevPend) : updater);
                return prev;
            }
        });
    };

    const typeMessage = (fullText, index) => {
        let i = 0;
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        if (fadeWaveTimeoutRef.current) clearTimeout(fadeWaveTimeoutRef.current);

        // Activar desvanecimiento suave de la ola en cuanto inicia la escritura
        setFadingWaveIndex(index);
        fadeWaveTimeoutRef.current = setTimeout(() => {
            setFadingWaveIndex(null);
        }, 360);

        setStreamingMsgIndex(index);
        const chartStartIdx = fullText.indexOf('```chart');

        typingIntervalRef.current = setInterval(() => {
            i += 12;
            // Si llegamos al inicio del bloque JSON de la gráfica, completar de golpe para renderizar la gráfica al instante
            if (chartStartIdx !== -1 && i >= chartStartIdx) {
                i = fullText.length;
            }
            updateActiveMessages((prev) => {
                const updated = [...prev];
                updated[index] = { sender: 'bot', text: fullText.slice(0, Math.min(i, fullText.length)) };
                return updated;
            });
            if (i >= fullText.length) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
                setStreamingMsgIndex(null);
            }
        }, 16);
    };

    const parseBotContent = (rawText) => {
        if (!rawText) return { cleanText: '', buttons: [], hasTable: false, charts: [] };

        const charts = [];
        const chartRegex = /```chart\s*([\s\S]*?)```/gi;
        let chartMatch;
        while ((chartMatch = chartRegex.exec(rawText)) !== null) {
            try {
                const parsed = JSON.parse(chartMatch[1].trim());
                if (parsed && Array.isArray(parsed.labels) && Array.isArray(parsed.series)) {
                    charts.push(parsed);
                }
            } catch {
                // ignore malformed chart block
            }
        }

        // Eliminar bloques chart cerrados y cualquier bloque chart parcial mientras hace streaming
        let workingText = rawText
            .replace(chartRegex, '')
            .replace(/```chart[\s\S]*$/i, '');

        const buttonRegex = /\[(?:\*{1,2})?BOTON:\s*([^|\]]+)\|\s*([^\]*]+)(?:\*{1,2})?\]/gi;
        const buttons = [];
        let match;
        
        while ((match = buttonRegex.exec(workingText)) !== null) {
            buttons.push({
                label: match[1].replace(/\*/g, '').trim(),
                prompt: match[2].replace(/\*/g, '').trim()
            });
        }
        
        let cleanText = workingText.replace(buttonRegex, '').trim();

        const hasTable = cleanText.includes('| ---') || cleanText.includes('|:---') || cleanText.includes('| :---') || cleanText.includes('|---');
        if (hasTable) {
            cleanText = cleanText
                .replace(/(?:¿?de\s*qué\s*propiedad\s*desea\s*consultar[^\n]*|por\s*favor,?\s*seleccione[^\n]*|puede\s*(?:seleccionar|elegir)[^\n]*)/gi, '')
                .replace(/^\s*[-*•]\s*$/gm, '')
                .replace(/(\n\s*por\s*favor,?\s*$|\n\s*puede\s*seleccionar:?\s*$)/gi, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            return { cleanText, buttons: [], hasTable: true, charts };
        }

        return { cleanText, buttons, hasTable: false, charts };
    };

    const handleButtonClick = (actionPrompt) => {
        if (isResponding) return;
        handleSend(null, actionPrompt);
    };

    const handleCancelQuery = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }
        if (fadeWaveTimeoutRef.current) {
            clearTimeout(fadeWaveTimeoutRef.current);
            fadeWaveTimeoutRef.current = null;
        }
        setIsLoading(false);
        setStreamingMsgIndex(null);
        setFadingWaveIndex(null);
        updateActiveMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].sender === 'bot') {
                const existingText = (updated[lastIdx].text || '').trim();
                updated[lastIdx] = {
                    sender: 'bot',
                    text: existingText || '__CONSULTA_DETENIDA__',
                    stopped: true
                };
            }
            return updated;
        });
    };

    const handleNewConversation = () => {
        if (isResponding) handleCancelQuery();
        const freshId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `rec-${Date.now()}`;
        setActiveId(freshId);
        setPendingMessages([]);
        setInput('');
    };

    const handleSelectConversation = (id) => {
        if (id === activeId) return;
        if (isResponding) handleCancelQuery();
        setActiveId(id);
        setInput('');
    };

    const [convToDelete, setConvToDelete] = useState(null);

    const handleRequestDeleteConversation = (e, conv) => {
        e.stopPropagation();
        setConvToDelete(conv);
    };

    const handleConfirmDelete = () => {
        if (!convToDelete) return;
        const id = convToDelete.id;
        if (isResponding && id === activeId) handleCancelQuery();

        const remaining = conversations.filter(c => c.id !== id);
        setConversations(remaining);
        if (activeId === id) {
            if (remaining.length > 0) {
                setActiveId(remaining[0].id);
            } else {
                handleNewConversation();
            }
        }
        setConvToDelete(null);
    };

    const handleSend = async (e, overridePrompt = null) => {
        e?.preventDefault();
        const userText = (overridePrompt || input).trim();
        if (!userText || isResponding) return;

        if (!overridePrompt) setInput('');
        setIsLoading(true);
        setFadingWaveIndex(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const existingTitle = currentConv?.title || '';
        const shouldAutoName = !existingTitle
            || existingTitle === 'Nueva conversación'
            || esSaludoSimple(existingTitle)
            || existingTitle.endsWith('...');
        const computedTitle = shouldAutoName
            ? generarTituloInteligente(userText, '')
            : existingTitle;

        const newMsgs = [
            ...messages,
            { sender: 'user', text: userText },
            { sender: 'bot', text: '' }
        ];
        const botIndex = newMsgs.length - 1;
        setStreamingMsgIndex(botIndex);

        setConversations(prev => {
            const exists = prev.some(c => c.id === activeId);
            if (exists) {
                return prev.map(c => {
                    if (c.id === activeId) {
                        return {
                            ...c,
                            title: computedTitle,
                            updatedAt: Date.now(),
                            messages: newMsgs
                        };
                    }
                    return c;
                });
            } else {
                const created = {
                    id: activeId,
                    title: computedTitle,
                    updatedAt: Date.now(),
                    messages: newMsgs
                };
                return [created, ...prev];
            }
        });

        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ prompt: userText, model, conversationId: activeId }),
                signal: controller.signal
            });

            if (response.status === 401) {
                setStreamingMsgIndex(null);
                clearAuthSession();
                window.dispatchEvent(new CustomEvent('auth:session-expired', {
                    detail: { message: 'Su sesión ha expirado. Inicie sesión nuevamente para usar el asistente.' }
                }));
                return;
            }

            if (!response.ok) {
                if (response.status === 500) {
                    throw new Error('El asistente está procesando demasiadas solicitudes en este momento. Intenta de nuevo en 1 minuto.');
                } else if (response.status === 429) {
                    throw new Error('Se ha superado temporalmente el límite de consultas por minuto. Por favor, intenta de nuevo en 1 minuto o cambia de modelo.');
                } else if (response.status === 503 || response.status === 504) {
                    throw new Error('El servicio de IA se encuentra temporalmente fuera de línea. Intenta de nuevo en 1 minuto.');
                } else {
                    throw new Error('No pudimos procesar tu consulta en este momento. Intenta de nuevo en 1 minuto.');
                }
            }

            const data = await response.text();
            if (!data || !data.trim()) {
                throw new Error('El asistente no pudo generar una respuesta en este momento. Por favor, intenta de nuevo en 1 minuto.');
            }
            if (shouldAutoName && !esSaludoSimple(userText)) {
                const refinedTitle = generarTituloInteligente(userText, data);
                setConversations((prev) =>
                    prev.map((c) => (c.id === activeId ? { ...c, title: refinedTitle } : c))
                );
            }
            typeMessage(data, botIndex);

        } catch (error) {
            if (error.name === 'AbortError') {
                setStreamingMsgIndex(null);
                return;
            }

            console.error('Error al llamar al Recepcionista Virtual:', error);
            let friendlyError = 'El asistente virtual no pudo responder tu consulta. Intenta de nuevo en 1 minuto.';

            if (error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                friendlyError = 'No se pudo establecer conexión con el servidor del hotel (backend apagado o sin red). Por favor, intenta de nuevo en 1 minuto.';
            } else if (error.message) {
                friendlyError = error.message;
            }

            setStreamingMsgIndex(null);
            updateActiveMessages((prev) => {
                const updated = [...prev];
                updated[botIndex] = {
                    sender: 'bot',
                    text: friendlyError
                };
                return updated;
            });
        } finally {
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleCloseChat = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 220);
    };

    const handleToggleChat = () => {
        if (isOpen) {
            handleCloseChat();
        } else {
            setIsOpen(true);
        }
    };

    const suggestionChips = isAdmin
        ? CHIPS_ADMIN
        : isGerente
            ? CHIPS_GERENTE
            : isRecepcionista
                ? CHIPS_RECEPCIONISTA
                : CHIPS_HUESPED;

    const statusRolTexto = isAdmin
        ? 'En línea · Administración'
        : isGerente
            ? 'En línea · Gerencia General'
            : isRecepcionista
                ? 'En línea · Recepción'
                : 'En línea · Atención 24/7';

    return (
        <div className={`chat-widget-container ${isFullscreen && isOpen ? 'fullscreen-active' : ''} ${isStaff ? 'is-admin-chat' : ''}`}>
            {isOpen && (
                <div className={`chat-window ${isFullscreen ? 'chat-window-fullscreen' : ''} ${isClosing ? 'chat-window-exit' : 'chat-window-enter'}`}>
                    <div className="chat-header">
                        <div className="chat-header-title">
                            {isFullscreen && (
                                <button 
                                    className="chat-sidebar-toggle-btn" 
                                    title={isSidebarOpen ? "Ocultar panel de chats" : "Mostrar panel de chats"}
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                >
                                    {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                                </button>
                            )}
                            <div className="chat-avatar"><Bot size={18} /></div>
                            <div className="chat-header-meta">
                                <h4 className="chat-name">Concierge Virtual</h4>
                                <span className="chat-status">
                                    <span className="status-dot"></span>
                                    {statusRolTexto}
                                </span>
                            </div>
                        </div>
                        <div className="chat-header-actions">
                            {isStaff && (
                                <div className="chat-model-wrapper" title="Seleccionar motor de inteligencia artificial">
                                    <Sparkles size={11} style={{ color: '#fcd34d', flexShrink: 0 }} />
                                    <select
                                        className="chat-model-select"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                    >
                                        <option value="gemini">Gemini</option>
                                        <option value="ollama">Ollama</option>
                                    </select>
                                </div>
                            )}
                            
                            <button
                                className="chat-action-icon-btn"
                                title="Nueva conversación (+)"
                                onClick={handleNewConversation}
                            >
                                <Plus size={16} />
                            </button>

                            <button
                                className="chat-action-icon-btn chat-fullscreen-btn"
                                title={isFullscreen ? "Restaurar a ventana normal" : "Expandir pantalla completa"}
                                onClick={() => setIsFullscreen(!isFullscreen)}
                            >
                                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>

                            <button className="chat-close-btn" title="Cerrar ventana" onClick={handleCloseChat}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="chat-body-layout">
                        {isFullscreen && isSidebarOpen && (
                            <aside className="chat-sidebar">
                                <div className="chat-sidebar-header">
                                    <button 
                                        className="chat-new-chat-btn"
                                        onClick={handleNewConversation}
                                    >
                                        <Plus size={16} />
                                        <span>Nueva conversación</span>
                                    </button>
                                </div>

                                <div className="chat-conversations-list">
                                    <div className="chat-conversations-heading">Historial de conversaciones</div>
                                    {conversations.length === 0 ? (
                                        <div className="chat-no-conversations">
                                            <span>No hay conversaciones anteriores guardadas.</span>
                                        </div>
                                    ) : (
                                        conversations.map(conv => {
                                            const isActive = conv.id === activeId;
                                            return (
                                                <div
                                                    key={conv.id}
                                                    className={`chat-conv-item ${isActive ? 'active' : ''}`}
                                                    onClick={() => handleSelectConversation(conv.id)}
                                                >
                                                    <MessageCircle size={15} className="chat-conv-item-icon" />
                                                    <span className="chat-conv-item-title" title={conv.title}>
                                                        {conv.title || 'Conversación'}
                                                    </span>
                                                    <button
                                                        className="chat-conv-delete-btn"
                                                        title="Eliminar conversación"
                                                        onClick={(e) => handleRequestDeleteConversation(e, conv)}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="chat-sidebar-footer">
                                    <div className="chat-sidebar-meta">
                                        <Sparkles size={14} className="sparkle-icon" />
                                        <span>Hotel Paraíso</span>
                                    </div>
                                    <span className="chat-sidebar-badge">
                                        {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
                                    </span>
                                </div>
                            </aside>
                        )}

                        <div className="chat-main-area">
                            <div className="chat-messages" ref={messagesContainerRef}>
                                {messages.length === 0 ? (
                                    <div className="chat-welcome-container">
                                        <div className="chat-welcome-hero">
                                            <div className="chat-welcome-avatar">
                                                <Bot size={32} />
                                            </div>
                                            <h2 className="chat-welcome-title">
                                                ¡Hola, {user?.nombre || 'Bienvenido'}! ¿En qué puedo ayudarte hoy?
                                            </h2>
                                            <p className="chat-welcome-subtitle">
                                                {isGerente ? (
                                                    <>
                                                        Consulta análisis financiero 2020–2026, ADR, RevPAR, ocupación histórica, balances de caja y estado operativo de toda la cadena.
                                                    </>
                                                ) : isRecepcionista ? (
                                                    <>
                                                        Consulta disponibilidad en tiempo real, registra reservaciones, verifica pre-reservas, anticipos y estado de habitaciones en mostrador.
                                                    </>
                                                ) : isAdmin ? (
                                                    <>
                                                        Consulta inventario técnico, hoteles activos, mantenimiento, estados de cuartos y reservaciones de la cadena.
                                                    </>
                                                ) : (
                                                    <>
                                                        Estoy a tu disposición para ayudarte a encontrar la habitación ideal, cotizar tu estancia, resolver dudas sobre nuestras instalaciones o consultar tus reservaciones.
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const isLegacyStopped = typeof msg.text === 'string' && (
                                            msg.text.includes('Consulta detenida') ||
                                            msg.text === '__CONSULTA_DETENIDA__'
                                        );
                                        const isStoppedMsg = Boolean(msg.stopped || isLegacyStopped);
                                        const rawTextForParse = isLegacyStopped ? '' : msg.text;

                                        const { cleanText, buttons, hasTable, charts } = msg.sender === 'bot' 
                                            ? parseBotContent(rawTextForParse) 
                                            : { cleanText: msg.text, buttons: [], hasTable: false, charts: [] };
                                        const isThisBotStreaming = msg.sender === 'bot' && streamingMsgIndex === index;
                                        const isWaveFadingOut = msg.sender === 'bot' && fadingWaveIndex === index;

                                        // Encontrar la consulta del usuario inmediatamente anterior por si desea reintentar
                                        const previousUserPrompt = index > 0 && messages[index - 1]?.sender === 'user'
                                            ? messages[index - 1].text
                                            : null;

                                        return (
                                            <div
                                                key={index}
                                                className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
                                            >
                                                {msg.sender === 'bot' && (
                                                    <div className="bubble-icon bot-icon"><Sparkles size={14} /></div>
                                                )}
                                                <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-bot'} ${(hasTable || (isGerente && charts.length > 0)) ? 'has-table-bubble' : ''} ${isStoppedMsg && !cleanText ? 'is-stopped-bubble' : ''}`}>
                                                    {msg.sender === 'bot' ? (
                                                        <>
                                                            {/* Ola: aparece mientras consulta (!cleanText && !isStoppedMsg) y se desvanece cuando inicia la escritura */}
                                                            {((!cleanText && charts.length === 0 && !isStoppedMsg) || isWaveFadingOut) && (
                                                                <OceanWaveAnimation
                                                                    label="Consultando información"
                                                                    isFadingOut={isWaveFadingOut}
                                                                />
                                                            )}

                                                            {/* Contenido de la respuesta de la IA */}
                                                            {cleanText && (
                                                                <div 
                                                                    className="markdown-content"
                                                                    dangerouslySetInnerHTML={{ __html: renderMarkdownWithTables(cleanText) }} 
                                                                />
                                                            )}

                                                            {/* Gráficas interactivas exclusivas para el Gerente */}
                                                            {isGerente && charts.length > 0 && (
                                                                <div className="chat-charts-stack">
                                                                    {charts.map((chartData, cIdx) => (
                                                                        <ChatChartCard key={cIdx} chart={chartData} />
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Píldora compacta de 1 línea cuando la consulta fue detenida */}
                                                            {isStoppedMsg && (
                                                                <div className={`chat-stopped-notice ${cleanText ? 'with-partial-text' : ''}`}>
                                                                    <span className="chat-stopped-pill">
                                                                        <Square size={8} fill="currentColor" aria-hidden="true" />
                                                                        <span>Detenido</span>
                                                                    </span>
                                                                    {previousUserPrompt && !isResponding && (
                                                                        <button
                                                                            type="button"
                                                                            className="chat-stopped-retry-btn"
                                                                            onClick={() => handleButtonClick(previousUserPrompt)}
                                                                            title="Reintentar consulta"
                                                                        >
                                                                            <RotateCcw size={11} />
                                                                            <span>Reintentar</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {!isThisBotStreaming && !isStoppedMsg && buttons.length > 0 && (
                                                                <div className="chat-action-buttons">
                                                                    {buttons.map((btn, bIdx) => (
                                                                        <button
                                                                            key={bIdx}
                                                                            type="button"
                                                                            className={`chat-action-btn ${btn.label.toLowerCase().includes('ambos') ? 'chat-action-btn-both' : ''}`}
                                                                            onClick={() => handleButtonClick(btn.prompt)}
                                                                        >
                                                                            {btn.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                                    )}
                                                </div>
                                                {msg.sender === 'user' && (
                                                    <div className="bubble-icon user-icon"><User size={14} /></div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-quick-suggestions">
                                {suggestionChips.map((chip) => (
                                    <button
                                        key={chip.label}
                                        type="button"
                                        className="suggestion-chip"
                                        onClick={() => handleButtonClick(chip.q)}
                                        disabled={isResponding}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSend} className="chat-input-form">
                                <input
                                    type="text"
                                    placeholder="Escribe tu consulta sobre hoteles, tarifas o reservaciones..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isResponding}
                                    className="chat-input"
                                />
                                {isResponding ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelQuery}
                                        className="chat-stop-btn"
                                        title="Detener respuesta"
                                        aria-label="Detener respuesta"
                                    >
                                        <Square size={15} fill="white" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="chat-send-btn"
                                        title="Enviar consulta"
                                        aria-label="Enviar consulta"
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <button
                className={`chat-floating-btn ${isOpen ? 'active' : ''}`}
                onClick={handleToggleChat}
                aria-label="Asistente de Recepción"
                title={isOpen ? "Minimizar asistente" : "Abrir Asistente de Recepción"}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && (
                    <span className="chat-status-beacon" title="Servicio disponible">
                        <span className="chat-status-beacon-ring"></span>
                        <span className="chat-status-beacon-dot"></span>
                    </span>
                )}
            </button>

            <ConfirmDialog
                isOpen={Boolean(convToDelete)}
                onClose={() => setConvToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar conversación?"
                subtitle="Historial de Asistente IA"
                message={
                    convToDelete ? (
                        <>
                            ¿Está seguro de que desea eliminar la conversación <strong>"{convToDelete.title || 'esta conversación'}"</strong>?
                            Esta acción no se puede deshacer y borrará los mensajes registrados.
                        </>
                    ) : ''
                }
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
