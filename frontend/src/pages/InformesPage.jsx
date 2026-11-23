import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Building2, RefreshCw, ShieldAlert,
    FileText, FileSpreadsheet, ChevronDown, Search, BedDouble,
    Wallet, ArrowUpDown
} from 'lucide-react';
import {
    getInformeFinanciero,
    getInformeOcupacion,
    getInformeCancelaciones,
    getInformeCuentasPorCobrar,
    getHoteles
} from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import {
    exportarInformeCsv,
    exportarInformePdf,
    formatearMetodoPago
} from '../utils/informesExport';
import './InformesPage.css';

const MESES_NOMBRES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(partes[2], 10)} ${meses[parseInt(partes[1], 10) - 1]}`;
}

function badgeEstadoClase(estado) {
    if (estado === 'Finalizada') return 'inf-badge inf-badge-palm';
    if (estado === 'Confirmada' || estado === 'Ocupada') return 'inf-badge inf-badge-ocean';
    if (estado === 'Cancelada' || estado === 'No-Show') return 'inf-badge inf-badge-danger';
    return 'inf-badge inf-badge-terra';
}

function badgeReglaClase(regla) {
    const texto = String(regla || '').toLowerCase();
    if (texto.includes('100% reembolso') || texto.includes('reembolso 100%')) return 'inf-badge inf-badge-palm';
    if (texto.includes('50%')) return 'inf-badge inf-badge-terra';
    return 'inf-badge inf-badge-danger';
}

function etiquetaReglaCorta(regla) {
    const texto = String(regla || '').toLowerCase();
    if (texto.includes('100% reembolso') || texto.includes('reembolso 100%')) return '>72h · 100% Reemb.';
    if (texto.includes('50%')) return '48–72h · 50% Reemb.';
    if (texto.includes('no-show')) return 'No-Show · 100% Ret.';
    if (texto.includes('0%')) return '<48h · 0% Reemb.';
    return regla || '—';
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function calcularRangoFechas(ano, tipoCorte, trimestre, mes) {
    if (tipoCorte === 'trimestre') {
        const mesInicio = (trimestre - 1) * 3 + 1;
        const mesFin = trimestre * 3;
        const ultimoDia = new Date(ano, mesFin, 0).getDate();
        return {
            inicio: `${ano}-${pad2(mesInicio)}-01`,
            fin: `${ano}-${pad2(mesFin)}-${pad2(ultimoDia)}`,
            texto: `Q${trimestre} ${ano}`
        };
    }
    if (tipoCorte === 'mes') {
        const ultimoDia = new Date(ano, mes, 0).getDate();
        return {
            inicio: `${ano}-${pad2(mes)}-01`,
            fin: `${ano}-${pad2(mes)}-${pad2(ultimoDia)}`,
            texto: `${MESES_NOMBRES[mes - 1]} ${ano}`
        };
    }
    return {
        inicio: `${ano}-01-01`,
        fin: `${ano}-12-31`,
        texto: `Ejercicio ${ano}`
    };
}

export default function InformesPage() {
    const { user } = useAuth();

    const [pestanaActiva, setPestanaActiva] = useState('financiero'); // 'financiero' | 'ocupacion' | 'cancelaciones' | 'cuentas'
    const [anoSeleccionado, setAnoSeleccionado] = useState(2026);
    const [tipoCorte, setTipoCorte] = useState('anual'); // 'anual' | 'trimestre' | 'mes'
    const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(4);
    const [mesSeleccionado, setMesSeleccionado] = useState(11);
    const [idHotelFiltro, setIdHotelFiltro] = useState('');

    const [paginaFinanciero, setPaginaFinanciero] = useState(0);
    const [tamanoPagina, setTamanoPagina] = useState(20);
    const [busqueda, setBusqueda] = useState('');
    const [busquedaDebounced, setBusquedaDebounced] = useState('');

    // Filtros rápidos por pestaña
    const [filtroEstadoCaja, setFiltroEstadoCaja] = useState('TODOS');
    const [filtroMetodoCaja, setFiltroMetodoCaja] = useState('TODOS');
    const [filtroReglaCanc, setFiltroReglaCanc] = useState('TODOS');
    const [filtroUrgenciaCxc, setFiltroUrgenciaCxc] = useState('TODOS');

    // Ordenamiento de columnas en Ocupación por Habitación
    const [ordenOcupacion, setOrdenOcupacion] = useState({ campo: 'ingresosTotales', dir: 'desc' });

    const [hoteles, setHoteles] = useState([]);
    const [informeEstado, setInformeEstado] = useState({ pestana: null, data: null });
    const [cargando, setCargando] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const rangoActual = useMemo(
        () => calcularRangoFechas(anoSeleccionado, tipoCorte, trimestreSeleccionado, mesSeleccionado),
        [anoSeleccionado, tipoCorte, trimestreSeleccionado, mesSeleccionado]
    );

    useEffect(() => {
        getHoteles()
            .then(data => setHoteles(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error al cargar hoteles:', err));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 240);
        return () => clearTimeout(timer);
    }, [busqueda]);

    useEffect(() => {
        setPaginaFinanciero(0);
        setBusqueda('');
        setBusquedaDebounced('');
        setFiltroEstadoCaja('TODOS');
        setFiltroMetodoCaja('TODOS');
        setFiltroReglaCanc('TODOS');
        setFiltroUrgenciaCxc('TODOS');
    }, [anoSeleccionado, tipoCorte, trimestreSeleccionado, mesSeleccionado, idHotelFiltro, pestanaActiva]);

    useEffect(() => {
        setPaginaFinanciero(0);
    }, [filtroEstadoCaja, filtroMetodoCaja, busquedaDebounced]);

    useEffect(() => {
        cargarInforme();
    }, [
        pestanaActiva, rangoActual.inicio, rangoActual.fin, idHotelFiltro,
        paginaFinanciero, tamanoPagina, filtroEstadoCaja, filtroMetodoCaja, busquedaDebounced
    ]);

    const cargarInforme = async () => {
        const tabSolicitada = pestanaActiva;
        setCargando(true);
        setErrorMsg('');
        try {
            const hotelIdParam = idHotelFiltro ? parseInt(idHotelFiltro, 10) : null;
            let res;

            if (tabSolicitada === 'financiero') {
                res = await getInformeFinanciero(
                    rangoActual.inicio,
                    rangoActual.fin,
                    hotelIdParam,
                    paginaFinanciero,
                    tamanoPagina,
                    {
                        estado: filtroEstadoCaja,
                        metodoPago: filtroMetodoCaja,
                        q: busquedaDebounced
                    }
                );
            } else if (tabSolicitada === 'ocupacion') {
                res = await getInformeOcupacion(anoSeleccionado, hotelIdParam, rangoActual.inicio, rangoActual.fin);
            } else if (tabSolicitada === 'cancelaciones') {
                res = await getInformeCancelaciones(anoSeleccionado, hotelIdParam, rangoActual.inicio, rangoActual.fin);
            } else {
                res = await getInformeCuentasPorCobrar(anoSeleccionado, hotelIdParam, rangoActual.inicio, rangoActual.fin);
            }

            setInformeEstado({ pestana: tabSolicitada, data: res });
        } catch (err) {
            console.error('Error al generar informe:', err);
            setErrorMsg(err.message || 'No fue posible cargar el informe seleccionado.');
            setInformeEstado({ pestana: tabSolicitada, data: null });
        } finally {
            setCargando(false);
        }
    };

    const informeData = informeEstado.pestana === pestanaActiva ? informeEstado.data : null;

    const toggleOrdenOcupacion = (campo) => {
        setOrdenOcupacion(prev =>
            prev.campo === campo
                ? { campo, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
                : { campo, dir: 'desc' }
        );
    };

    // Filtrado rápido + ordenamiento local (para pestañas no paginadas en servidor; 'financiero' ya viene filtrado y paginado desde el backend)
    const filasFiltradas = useMemo(() => {
        let filas = Array.isArray(informeData?.filas) ? [...informeData.filas] : [];

        if (pestanaActiva === 'financiero') {
            return filas;
        }

        if (pestanaActiva === 'cancelaciones') {
            if (filtroReglaCanc === '100') {
                filas = filas.filter(f => {
                    const t = String(f.reglaAplicada || '').toLowerCase();
                    return t.includes('100% reembolso') || t.includes('reembolso 100%');
                });
            } else if (filtroReglaCanc === '50') {
                filas = filas.filter(f => String(f.reglaAplicada || '').toLowerCase().includes('50%'));
            } else if (filtroReglaCanc === 'NOSHOW') {
                filas = filas.filter(f => String(f.reglaAplicada || '').toLowerCase().includes('no-show'));
            }
        } else if (pestanaActiva === 'cuentas') {
            if (filtroUrgenciaCxc === 'URGENTE') {
                filas = filas.filter(f => Number(f.diasParaLlegada ?? 99) <= 7 || f.estado === 'Ocupada');
            } else if (filtroUrgenciaCxc === 'OCUPADA') {
                filas = filas.filter(f => f.estado === 'Ocupada');
            } else if (filtroUrgenciaCxc === 'CONFIRMADA') {
                filas = filas.filter(f => f.estado === 'Confirmada');
            }
        }

        const q = busqueda.trim().toLowerCase();
        if (q) {
            filas = filas.filter(item =>
                Object.values(item || {}).some(v => String(v ?? '').toLowerCase().includes(q))
            );
        }

        if (pestanaActiva === 'ocupacion') {
            const { campo, dir } = ordenOcupacion;
            const mult = dir === 'asc' ? 1 : -1;
            filas.sort((a, b) => (Number(a?.[campo] || 0) - Number(b?.[campo] || 0)) * mult);
        }

        return filas;
    }, [
        informeData, pestanaActiva, busqueda,
        filtroReglaCanc, filtroUrgenciaCxc, ordenOcupacion
    ]);

    // Subtotales dinámicos para el pie de cada tabla (<tfoot>)
    const subtotales = useMemo(() => {
        if (pestanaActiva === 'financiero') {
            return filasFiltradas.reduce((acc, f) => ({
                total: acc.total + Number(f.total || 0),
                cobrado: acc.cobrado + Number(f.anticipo || 0) + Number(f.saldoLiquidado || 0),
                reembolso: acc.reembolso + Number(f.montoReembolso || 0),
                penal: acc.penal + Number(f.penalizacionRetenida || 0)
            }), { total: 0, cobrado: 0, reembolso: 0, penal: 0 });
        }
        if (pestanaActiva === 'ocupacion') {
            const sum = filasFiltradas.reduce((acc, h) => ({
                noches: acc.noches + Number(h.nochesOcupadas || 0),
                reservas: acc.reservas + Number(h.totalReservas || 0),
                ingresos: acc.ingresos + Number(h.ingresosTotales || 0),
                ocupSum: acc.ocupSum + Number(h.tasaOcupacionPct || 0)
            }), { noches: 0, reservas: 0, ingresos: 0, ocupSum: 0 });
            return {
                ...sum,
                ocupProm: filasFiltradas.length > 0 ? (sum.ocupSum / filasFiltradas.length).toFixed(1) : '0.0'
            };
        }
        if (pestanaActiva === 'cancelaciones') {
            return filasFiltradas.reduce((acc, f) => ({
                anticipo: acc.anticipo + Number(f.anticipoPagado || 0),
                reembolsado: acc.reembolsado + Number(f.montoReembolsado || 0),
                penal: acc.penal + Number(f.penalizacionRetenida || 0)
            }), { anticipo: 0, reembolsado: 0, penal: 0 });
        }
        return filasFiltradas.reduce((acc, f) => ({
            total: acc.total + Number(f.total || 0),
            anticipo: acc.anticipo + Number(f.anticipo || 0),
            saldo: acc.saldo + Number(f.saldoPendiente || 0)
        }), { total: 0, anticipo: 0, saldo: 0 });
    }, [filasFiltradas, pestanaActiva]);

    const obtenerFilasCompletasParaExportar = async () => {
        if (pestanaActiva !== 'financiero' || !informeData || (informeData.totalPages ?? 1) <= 1) {
            return filasFiltradas;
        }
        const hotelIdParam = idHotelFiltro ? parseInt(idHotelFiltro, 10) : null;
        const filtrosCaja = {
            estado: filtroEstadoCaja,
            metodoPago: filtroMetodoCaja,
            q: busquedaDebounced
        };
        const primera = await getInformeFinanciero(rangoActual.inicio, rangoActual.fin, hotelIdParam, 0, 100, filtrosCaja);
        const todas = [...(primera?.filas || [])];
        const totalPaginas = primera?.totalPages ?? 1;
        for (let p = 1; p < totalPaginas; p++) {
            const sig = await getInformeFinanciero(rangoActual.inicio, rangoActual.fin, hotelIdParam, p, 100, filtrosCaja);
            if (Array.isArray(sig?.filas)) todas.push(...sig.filas);
        }
        return todas;
    };

    const handleExportar = async (formato) => {
        if (!informeData || exportando) return;
        setExportando(true);
        setErrorMsg('');
        try {
            const filasCompletas = await obtenerFilasCompletasParaExportar();
            const payload = {
                pestana: pestanaActiva,
                anoSeleccionado,
                periodoTexto: rangoActual.texto,
                idHotelFiltro,
                hoteles,
                informeData,
                filasCompletas,
                user
            };
            if (formato === 'pdf') {
                exportarInformePdf(payload);
            } else {
                exportarInformeCsv(payload);
            }
        } catch (err) {
            console.error('Error al exportar informe:', err);
            setErrorMsg(err.message || 'No fue posible preparar el archivo de exportación.');
        } finally {
            setExportando(false);
        }
    };

    const totalCobradoCaja = Number(informeData?.totalAnticiposCobrados || 0) + Number(informeData?.totalSaldosLiquidados || 0);

    return (
        <div className="inf-view">
            {/* CABECERA EDITORIAL */}
            <header className="inf-header inf-anim-up">
                <div>
                    <div className="inf-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Auditoría Contable</span>
                        <span className="inf-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="inf-title">Informes y Auditoría</h1>
                </div>

                {/* Barra unificada: Corte Contable + Periodo + Sede + Actualizar + [ PDF | CSV ] */}
                <div className="inf-filter-bar">
                    <div className="inf-corte-group" role="group" aria-label="Tipo de corte contable">
                        {[
                            { id: 'anual', label: 'Anual' },
                            { id: 'trimestre', label: 'Trim.' },
                            { id: 'mes', label: 'Mes' }
                        ].map(c => (
                            <button
                                key={c.id}
                                type="button"
                                className={`inf-corte-btn ${tipoCorte === c.id ? 'is-active' : ''}`}
                                onClick={() => setTipoCorte(c.id)}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>

                    {tipoCorte === 'trimestre' && (
                        <div className="inf-filter-segment">
                            <select
                                className="inf-filter-select"
                                value={trimestreSeleccionado}
                                onChange={(e) => setTrimestreSeleccionado(parseInt(e.target.value, 10))}
                                aria-label="Seleccionar trimestre"
                            >
                                <option value={1}>Q1 (Ene–Mar)</option>
                                <option value={2}>Q2 (Abr–Jun)</option>
                                <option value={3}>Q3 (Jul–Sep)</option>
                                <option value={4}>Q4 (Oct–Dic)</option>
                            </select>
                            <ChevronDown size={13} className="inf-select-chevron" />
                        </div>
                    )}

                    {tipoCorte === 'mes' && (
                        <div className="inf-filter-segment">
                            <select
                                className="inf-filter-select"
                                value={mesSeleccionado}
                                onChange={(e) => setMesSeleccionado(parseInt(e.target.value, 10))}
                                aria-label="Seleccionar mes"
                            >
                                {MESES_NOMBRES.map((m, idx) => (
                                    <option key={m} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="inf-select-chevron" />
                        </div>
                    )}

                    <div className="inf-filter-segment">
                        <Calendar size={14} />
                        <select
                            className="inf-filter-select"
                            value={anoSeleccionado}
                            onChange={(e) => setAnoSeleccionado(parseInt(e.target.value, 10))}
                            aria-label="Seleccionar ejercicio"
                        >
                            {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="inf-select-chevron" />
                    </div>

                    <div className="inf-filter-segment">
                        <Building2 size={14} />
                        <select
                            className="inf-filter-select"
                            value={idHotelFiltro}
                            onChange={(e) => setIdHotelFiltro(e.target.value)}
                            aria-label="Filtrar por propiedad"
                        >
                            <option value="">Toda la Cadena</option>
                            {hoteles.map(h => (
                                <option key={h.idHotel} value={h.idHotel}>
                                    {h.nombre}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="inf-select-chevron" />
                    </div>

                    <button
                        type="button"
                        className="inf-refresh-btn"
                        onClick={cargarInforme}
                        disabled={cargando}
                        title="Recargar auditoría"
                    >
                        <RefreshCw size={14} className={cargando ? 'inf-spin' : ''} />
                    </button>

                    <span className="inf-filter-divider" aria-hidden="true" />

                    <div className="inf-export-group" role="group" aria-label="Exportar auditoría">
                        <button
                            type="button"
                            className="inf-export-seg-btn"
                            onClick={() => handleExportar('pdf')}
                            disabled={cargando || exportando || !informeData}
                            title="Generar informe formal en PDF (tinta negra)"
                        >
                            <FileText size={14} style={{ color: '#b85d38' }} />
                            <span>{exportando ? '...' : 'PDF'}</span>
                        </button>
                        <button
                            type="button"
                            className="inf-export-seg-btn"
                            onClick={() => handleExportar('csv')}
                            disabled={cargando || exportando || !informeData}
                            title="Descargar tabla estructurada para Excel (.csv)"
                        >
                            <FileSpreadsheet size={14} style={{ color: '#2d5a43' }} />
                            <span>CSV</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 4 PESTAÑAS EN UNA SOLA LÍNEA + BUSCADOR */}
            <div className="inf-tabs-bar inf-anim-up inf-delay-1">
                <div className="inf-tabs-list" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={pestanaActiva === 'financiero'}
                        className={`inf-tab-btn ${pestanaActiva === 'financiero' ? 'is-active' : ''}`}
                        onClick={() => setPestanaActiva('financiero')}
                    >
                        <FileText size={15} style={{ color: pestanaActiva === 'financiero' ? '#2d5a43' : 'currentColor' }} />
                        <span>Conciliación de Caja</span>
                        {pestanaActiva === 'financiero' && informeData && (
                            <span className="inf-tab-count">
                                {formatoNumero(informeData.totalElements ?? informeData.totalRegistros ?? 0)}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={pestanaActiva === 'ocupacion'}
                        className={`inf-tab-btn ${pestanaActiva === 'ocupacion' ? 'is-active' : ''}`}
                        onClick={() => setPestanaActiva('ocupacion')}
                    >
                        <BedDouble size={15} style={{ color: pestanaActiva === 'ocupacion' ? '#16324f' : 'currentColor' }} />
                        <span>Ocupación</span>
                        {pestanaActiva === 'ocupacion' && informeData && (
                            <span className="inf-tab-count">
                                {formatoNumero(informeData.totalHabitaciones ?? 0)}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={pestanaActiva === 'cancelaciones'}
                        className={`inf-tab-btn ${pestanaActiva === 'cancelaciones' ? 'is-active' : ''}`}
                        onClick={() => setPestanaActiva('cancelaciones')}
                    >
                        <ShieldAlert size={15} style={{ color: pestanaActiva === 'cancelaciones' ? '#b91c1c' : 'currentColor' }} />
                        <span>Cancelaciones</span>
                        {pestanaActiva === 'cancelaciones' && informeData && (
                            <span className="inf-tab-count is-danger">
                                {formatoNumero(informeData.totalCasos ?? 0)}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={pestanaActiva === 'cuentas'}
                        className={`inf-tab-btn ${pestanaActiva === 'cuentas' ? 'is-active' : ''}`}
                        onClick={() => setPestanaActiva('cuentas')}
                    >
                        <Wallet size={15} style={{ color: pestanaActiva === 'cuentas' ? '#b85d38' : 'currentColor' }} />
                        <span>Cuentas por Cobrar</span>
                        {pestanaActiva === 'cuentas' && informeData && (
                            <span className="inf-tab-count">
                                {formatoNumero(informeData.totalCuentas ?? 0)}
                            </span>
                        )}
                    </button>
                </div>

                <div className="inf-search-wrap">
                    <div className="inf-search-box">
                        <Search size={13} />
                        <input
                            type="text"
                            className="inf-search-input"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar folio, titular o cuarto..."
                            aria-label="Filtrar resultados"
                        />
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: '1.15rem' }}>
                    <ShieldAlert size={16} />
                    <span><strong>Error:</strong> {errorMsg}</span>
                </div>
            )}

            {/* ================================================================= */}
            {/* PESTAÑA 1: CONCILIACIÓN DE CAJA                                   */}
            {/* ================================================================= */}
            {pestanaActiva === 'financiero' && informeData && (
                <div className="inf-anim-up inf-delay-2">
                    <section className="inf-kpi-grid" aria-label="Resumen de caja">
                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Ingreso Neto en Caja</div>
                            <div className="inf-kpi-val is-palm">{formatoMoneda(informeData.ingresosNetosCaja)}</div>
                            <div className="inf-kpi-sub">{rangoActual.texto}</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Anticipos + Liquidados</div>
                            <div className="inf-kpi-val">{formatoMoneda(totalCobradoCaja)}</div>
                            <div className="inf-kpi-sub">
                                {formatoMoneda(informeData.totalAnticiposCobrados)} ant. &middot; {formatoMoneda(informeData.totalSaldosLiquidados)} liq.
                            </div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Penalizaciones Retenidas</div>
                            <div className="inf-kpi-val">{formatoMoneda(informeData.totalPenalizaciones)}</div>
                            <div className="inf-kpi-sub">Hospedaje: {formatoMoneda(informeData.granTotalContratado)}</div>
                        </article>

                        <article className={`inf-kpi-card ${Number(informeData.totalReembolsos || 0) > 0 ? 'is-danger' : ''}`}>
                            <div className="inf-kpi-label">Reembolsos Dispersados</div>
                            <div className={`inf-kpi-val ${Number(informeData.totalReembolsos || 0) > 0 ? 'is-danger' : ''}`}>
                                {Number(informeData.totalReembolsos || 0) > 0 ? `-${formatoMoneda(informeData.totalReembolsos)}` : '$0.00'}
                            </div>
                            <div className="inf-kpi-sub">Egreso bancario auditado</div>
                        </article>
                    </section>

                    {/* Filtros rápidos de conciliación */}
                    <div className="inf-subfilters">
                        <div className="inf-pill-row">
                            <span className="inf-pill-label">Estado:</span>
                            {[
                                { id: 'TODOS', label: 'Todos' },
                                { id: 'Finalizada', label: 'Finalizadas' },
                                { id: 'Confirmada', label: 'Confirmadas' },
                                { id: 'RIESGO', label: 'Canceladas / No-Show', danger: true }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`inf-pill ${p.danger ? 'is-danger-pill' : ''} ${filtroEstadoCaja === p.id ? 'is-active' : ''}`}
                                    onClick={() => setFiltroEstadoCaja(p.id)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="inf-pill-row">
                            <span className="inf-pill-label">Método:</span>
                            {[
                                { id: 'TODOS', label: 'Todos' },
                                { id: 'EFECTIVO', label: 'Efectivo' },
                                { id: 'TARJETA_CREDITO', label: 'Crédito' },
                                { id: 'TARJETA_DEBITO', label: 'Débito' },
                                { id: 'TRANSFERENCIA', label: 'Transferencia' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    className={`inf-pill ${filtroMetodoCaja === m.id ? 'is-active' : ''}`}
                                    onClick={() => setFiltroMetodoCaja(m.id)}
                                >
                                    {m.label}
                                </button>
                            ))}

                            {(filtroEstadoCaja !== 'TODOS' || filtroMetodoCaja !== 'TODOS' || busqueda.trim() !== '') && (
                                <button
                                    type="button"
                                    className="inf-pill"
                                    style={{ borderStyle: 'dashed', color: '#b85d38' }}
                                    onClick={() => {
                                        setFiltroEstadoCaja('TODOS');
                                        setFiltroMetodoCaja('TODOS');
                                        setBusqueda('');
                                    }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="inf-table-card">
                        <div className="inf-table-scroll">
                            <table className="inf-table">
                                <thead>
                                    <tr>
                                        <th>Folio / Titular</th>
                                        <th>Sede / Hab.</th>
                                        <th>Estancia</th>
                                        <th className="num">Total</th>
                                        <th className="num">Cobrado</th>
                                        <th className="num">Penal. / Reemb.</th>
                                        <th>Método</th>
                                        <th className="num">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="inf-empty">
                                                No se encontraron registros para el filtro actual.
                                            </td>
                                        </tr>
                                    ) : filasFiltradas.map((f, idx) => {
                                        const cobrado = Number(f.anticipo || 0) + Number(f.saldoLiquidado || 0);
                                        const tieneReembolso = Number(f.montoReembolso || 0) > 0;
                                        const tienePenal = Number(f.penalizacionRetenida || 0) > 0;
                                        const esRiesgo = f.estado === 'Cancelada' || f.estado === 'No-Show' || tieneReembolso;
                                        return (
                                            <tr key={f.idReserva ?? idx} className={esRiesgo ? 'is-risk-row' : ''}>
                                                <td>
                                                    <div className="inf-cell-main inf-nowrap">{f.folio}</div>
                                                    <div className="inf-cell-sub">{f.titular}</div>
                                                </td>
                                                <td>
                                                    <div className="inf-cell-main" style={{ fontWeight: 600 }}>{f.hotel}</div>
                                                    <div className="inf-cell-sub">Hab. {f.habitacionNumero}</div>
                                                </td>
                                                <td className="inf-nowrap">
                                                    <span>{formatearFechaCorta(f.fechaEntrada)} &rarr; {formatearFechaCorta(f.fechaSalida)}</span>
                                                    <span className="inf-val-muted"> ({f.noches}n)</span>
                                                </td>
                                                <td className="num" style={{ fontWeight: 700 }}>
                                                    {formatoMoneda(f.total)}
                                                </td>
                                                <td className="num">
                                                    <div className={cobrado > 0 ? 'inf-val-palm' : 'inf-val-muted'}>
                                                        {formatoMoneda(cobrado)}
                                                    </div>
                                                    {Number(f.saldoLiquidado || 0) > 0 && (
                                                        <div className="inf-cell-sub">Ant. {formatoMoneda(f.anticipo)}</div>
                                                    )}
                                                </td>
                                                <td className="num">
                                                    {tieneReembolso ? (
                                                        <span className="inf-val-danger">-{formatoMoneda(f.montoReembolso)}</span>
                                                    ) : tienePenal ? (
                                                        <span className="inf-val-ocean">{formatoMoneda(f.penalizacionRetenida)}</span>
                                                    ) : (
                                                        <span className="inf-val-muted">&mdash;</span>
                                                    )}
                                                </td>
                                                <td className="inf-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatearMetodoPago(f.metodoPago)}
                                                </td>
                                                <td className="num">
                                                    <span className={badgeEstadoClase(f.estado)}>{f.estado}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {filasFiltradas.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>
                                                {informeData.filtrado
                                                    ? `Total filtrado (${formatoNumero(informeData.totalElements)} registros)`
                                                    : `Subtotal página (${filasFiltradas.length} filas)`}
                                            </td>
                                            <td className="num">
                                                {formatoMoneda(informeData.filtrado ? informeData.filtroTotal : subtotales.total)}
                                            </td>
                                            <td className="num inf-val-palm">
                                                {formatoMoneda(informeData.filtrado ? informeData.filtroCobrado : subtotales.cobrado)}
                                            </td>
                                            <td className="num">
                                                {(informeData.filtrado ? Number(informeData.filtroReembolsos || 0) : subtotales.reembolso) > 0 ? (
                                                    <span className="inf-val-danger">
                                                        -{formatoMoneda(informeData.filtrado ? informeData.filtroReembolsos : subtotales.reembolso)}
                                                    </span>
                                                ) : (
                                                    formatoMoneda(informeData.filtrado ? informeData.filtroPenalizaciones : subtotales.penal)
                                                )}
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {(informeData.totalElements ?? 0) > 0 && (() => {
                            const totalEl = Number(informeData.totalElements ?? 0);
                            const paginaActual = Number(informeData.page ?? 0);
                            const inicioRango = paginaActual * tamanoPagina + 1;
                            const finRango = Math.min(inicioRango + filasFiltradas.length - 1, totalEl);
                            return (
                                <div className="inf-pagination">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span>
                                            Mostrando <strong style={{ color: 'var(--text-primary)' }}>{inicioRango}&ndash;{finRango}</strong> de{' '}
                                            <strong style={{ color: 'var(--text-primary)' }}>{formatoNumero(totalEl)}</strong>
                                            {informeData.filtrado ? ' resultados' : ' registros'}
                                        </span>
                                        <span style={{ color: 'var(--border-strong)' }}>|</span>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <span>Por página:</span>
                                            <select
                                                value={tamanoPagina}
                                                onChange={(e) => { setTamanoPagina(Number(e.target.value)); setPaginaFinanciero(0); }}
                                                style={{
                                                    background: 'var(--bg-surface)', color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-default)', borderRadius: 7, padding: '3px 7px',
                                                    fontSize: '0.78rem', fontWeight: 600
                                                }}
                                            >
                                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </label>
                                    </div>

                                    {(informeData.totalPages ?? 0) > 1 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                type="button"
                                                className="inf-page-btn"
                                                disabled={paginaFinanciero <= 0 || cargando}
                                                onClick={() => setPaginaFinanciero(p => Math.max(0, p - 1))}
                                            >
                                                Anterior
                                            </button>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                Página {paginaActual + 1} de {informeData.totalPages}
                                            </span>
                                            <button
                                                type="button"
                                                className="inf-page-btn"
                                                disabled={paginaActual + 1 >= (informeData.totalPages ?? 1) || cargando}
                                                onClick={() => setPaginaFinanciero(p => p + 1)}
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* PESTAÑA 2: OCUPACIÓN POR HABITACIÓN (CON ORDENAMIENTO)            */}
            {/* ================================================================= */}
            {pestanaActiva === 'ocupacion' && informeData && (
                <div className="inf-anim-up inf-delay-2">
                    <section className="inf-kpi-grid" aria-label="Resumen de ocupación">
                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Inventario Activo</div>
                            <div className="inf-kpi-val">{formatoNumero(informeData.totalHabitaciones)} cuartos</div>
                            <div className="inf-kpi-sub">{rangoActual.texto}</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Noches Vendidas</div>
                            <div className="inf-kpi-val">{formatoNumero(informeData.totalNochesVendidas)} noches</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Ocupación Global</div>
                            <div className="inf-kpi-val is-palm">{informeData.ocupacionGlobalPct}%</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Hospedaje Generado</div>
                            <div className="inf-kpi-val">{formatoMoneda(informeData.totalIngresosGenerados)}</div>
                        </article>
                    </section>

                    <div className="inf-table-card">
                        <div className="inf-table-scroll">
                            <table className="inf-table">
                                <thead>
                                    <tr>
                                        <th>Habitación</th>
                                        <th>Propiedad / Categoría</th>
                                        <th className="num">
                                            <button
                                                type="button"
                                                className={`inf-sort-btn ${ordenOcupacion.campo === 'precioBase' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrdenOcupacion('precioBase')}
                                            >
                                                <span>Tarifa Base</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                        <th className="num">
                                            <button
                                                type="button"
                                                className={`inf-sort-btn ${ordenOcupacion.campo === 'nochesOcupadas' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrdenOcupacion('nochesOcupadas')}
                                            >
                                                <span>Noches</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                        <th>
                                            <button
                                                type="button"
                                                className={`inf-sort-btn ${ordenOcupacion.campo === 'tasaOcupacionPct' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrdenOcupacion('tasaOcupacionPct')}
                                            >
                                                <span>Ocupación</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                        <th className="num">
                                            <button
                                                type="button"
                                                className={`inf-sort-btn ${ordenOcupacion.campo === 'totalReservas' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrdenOcupacion('totalReservas')}
                                            >
                                                <span>Res.</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                        <th className="num">
                                            <button
                                                type="button"
                                                className={`inf-sort-btn ${ordenOcupacion.campo === 'ingresosTotales' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrdenOcupacion('ingresosTotales')}
                                            >
                                                <span>Ingresos</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="inf-empty">
                                                No se encontraron habitaciones para el filtro actual.
                                            </td>
                                        </tr>
                                    ) : filasFiltradas.map((h, idx) => {
                                        const pct = Number(h.tasaOcupacionPct || 0);
                                        const barWidth = Math.min(Math.max(pct * 4, pct > 0 ? 8 : 0), 100);
                                        return (
                                            <tr key={idx}>
                                                <td className="inf-nowrap">
                                                    <span className="inf-cell-main">Hab. {h.numero}</span>
                                                    <span className="inf-val-muted"> &middot; Piso {h.piso}</span>
                                                </td>
                                                <td>
                                                    <div className="inf-cell-main" style={{ fontWeight: 600 }}>{h.hotel}</div>
                                                    <div className="inf-cell-sub">{h.categoria}</div>
                                                </td>
                                                <td className="num inf-val-muted">{formatoMoneda(h.precioBase)}</td>
                                                <td className="num" style={{ fontWeight: 700 }}>{formatoNumero(h.nochesOcupadas)}</td>
                                                <td>
                                                    <div className="inf-occ-cell">
                                                        <div className="inf-occ-track">
                                                            <div
                                                                className={`inf-occ-fill ${pct < 5 ? 'is-low' : ''}`}
                                                                style={{ width: `${barWidth}%` }}
                                                            />
                                                        </div>
                                                        <span className={pct < 5 ? 'inf-val-danger' : 'inf-val-ocean'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="num inf-val-muted">{formatoNumero(h.totalReservas)}</td>
                                                <td className="num inf-val-palm">{formatoMoneda(h.ingresosTotales)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {filasFiltradas.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>Subtotal ({filasFiltradas.length} habitaciones)</td>
                                            <td className="num">{formatoNumero(subtotales.noches)}</td>
                                            <td>Prom. {subtotales.ocupProm}%</td>
                                            <td className="num">{formatoNumero(subtotales.reservas)}</td>
                                            <td className="num inf-val-palm">{formatoMoneda(subtotales.ingresos)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* PESTAÑA 3: CANCELACIONES Y REEMBOLSOS                             */}
            {/* ================================================================= */}
            {pestanaActiva === 'cancelaciones' && informeData && (
                <div className="inf-anim-up inf-delay-2">
                    <section className="inf-kpi-grid" aria-label="Resumen de cancelaciones">
                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Casos Auditados</div>
                            <div className="inf-kpi-val">{formatoNumero(informeData.totalCasos)} casos</div>
                            <div className="inf-kpi-sub">
                                {formatoNumero(informeData.casosReembolso100)} (100%) &middot; {formatoNumero(informeData.casosReembolso50)} (50%)
                            </div>
                        </article>

                        <article className={`inf-kpi-card ${Number(informeData.totalReembolsado || 0) > 0 ? 'is-danger' : ''}`}>
                            <div className="inf-kpi-label">Reembolsos Autorizados</div>
                            <div className={`inf-kpi-val ${Number(informeData.totalReembolsado || 0) > 0 ? 'is-danger' : ''}`}>
                                {Number(informeData.totalReembolsado || 0) > 0 ? `-${formatoMoneda(informeData.totalReembolsado)}` : '$0.00'}
                            </div>
                            <div className="inf-kpi-sub">{rangoActual.texto}</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Penalizaciones Retenidas</div>
                            <div className="inf-kpi-val">{formatoMoneda(informeData.totalPenalizacionesRetenidas)}</div>
                            <div className="inf-kpi-sub">Recuperado por política</div>
                        </article>

                        <article className={`inf-kpi-card ${Number(informeData.casosNoShow || 0) > 0 ? 'is-danger' : ''}`}>
                            <div className="inf-kpi-label">No-Shows (100% Retenido)</div>
                            <div className={`inf-kpi-val ${Number(informeData.casosNoShow || 0) > 0 ? 'is-danger' : ''}`}>
                                {formatoNumero(informeData.casosNoShow)} casos
                            </div>
                            <div className="inf-kpi-sub">Sin reembolso aplicable</div>
                        </article>
                    </section>

                    <div className="inf-subfilters">
                        <div className="inf-pill-row">
                            <span className="inf-pill-label">Política:</span>
                            {[
                                { id: 'TODOS', label: 'Todos' },
                                { id: '100', label: '>72h (100% Reemb.)' },
                                { id: '50', label: '48–72h (50%)' },
                                { id: 'NOSHOW', label: 'No-Show', danger: true }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`inf-pill ${p.danger ? 'is-danger-pill' : ''} ${filtroReglaCanc === p.id ? 'is-active' : ''}`}
                                    onClick={() => setFiltroReglaCanc(p.id)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="inf-table-card">
                        <div className="inf-table-scroll">
                            <table className="inf-table">
                                <thead>
                                    <tr>
                                        <th>Folio / Titular</th>
                                        <th>Entrada</th>
                                        <th>Política Aplicada</th>
                                        <th className="num">Anticipo</th>
                                        <th className="num">Reembolsado</th>
                                        <th className="num">Penalización</th>
                                        <th>Banco / CLABE</th>
                                        <th>Autorizó</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="inf-empty">
                                                No se registran cancelaciones ni reembolsos para el filtro actual.
                                            </td>
                                        </tr>
                                    ) : filasFiltradas.map((f, idx) => {
                                        const regla = f.reglaAplicada || '—';
                                        const tieneReemb = Number(f.montoReembolsado || 0) > 0;
                                        return (
                                            <tr key={idx} className="is-risk-row">
                                                <td>
                                                    <div className="inf-cell-main inf-nowrap">{f.folio}</div>
                                                    <div className="inf-cell-sub">{f.titular}</div>
                                                </td>
                                                <td className="inf-nowrap inf-val-muted">
                                                    {formatearFechaCorta(f.fechaEntrada)}
                                                </td>
                                                <td>
                                                    <span className={badgeReglaClase(regla)} title={regla}>
                                                        {etiquetaReglaCorta(regla)}
                                                    </span>
                                                </td>
                                                <td className="num">{formatoMoneda(f.anticipoPagado)}</td>
                                                <td className="num">
                                                    {tieneReemb ? (
                                                        <span className="inf-val-danger">-{formatoMoneda(f.montoReembolsado)}</span>
                                                    ) : (
                                                        <span className="inf-val-muted">&mdash;</span>
                                                    )}
                                                </td>
                                                <td className="num">
                                                    {Number(f.penalizacionRetenida || 0) > 0 ? (
                                                        <span className="inf-val-ocean">{formatoMoneda(f.penalizacionRetenida)}</span>
                                                    ) : (
                                                        <span className="inf-val-muted">&mdash;</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="inf-cell-main" style={{ fontWeight: 600 }}>
                                                        {f.bancoReembolso || '—'}
                                                    </div>
                                                    {f.clabeReembolso && f.clabeReembolso !== '—' && (
                                                        <div className="inf-cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                            {f.clabeReembolso}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="inf-nowrap inf-val-ocean">
                                                    {f.autorizadoPor || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {filasFiltradas.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>Subtotal ({filasFiltradas.length} casos)</td>
                                            <td className="num">{formatoMoneda(subtotales.anticipo)}</td>
                                            <td className="num inf-val-danger">
                                                {subtotales.reembolsado > 0 ? `-${formatoMoneda(subtotales.reembolsado)}` : '$0.00'}
                                            </td>
                                            <td className="num">{formatoMoneda(subtotales.penal)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================= */}
            {/* PESTAÑA 4: CUENTAS POR COBRAR (SALDOS PENDIENTES EN LOBBY)        */}
            {/* ================================================================= */}
            {pestanaActiva === 'cuentas' && informeData && (
                <div className="inf-anim-up inf-delay-2">
                    <section className="inf-kpi-grid" aria-label="Resumen de cuentas por cobrar">
                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Saldo Total por Cobrar</div>
                            <div className="inf-kpi-val">{formatoMoneda(informeData.totalSaldoPorCobrar)}</div>
                            <div className="inf-kpi-sub">{formatoNumero(informeData.totalCuentas)} cuentas abiertas</div>
                        </article>

                        <article className={`inf-kpi-card ${Number(informeData.cuentasProximas7Dias || 0) > 0 ? 'is-danger' : ''}`}>
                            <div className="inf-kpi-label">Cobro Inmediato (&le; 7 días)</div>
                            <div className={`inf-kpi-val ${Number(informeData.cuentasProximas7Dias || 0) > 0 ? 'is-danger' : ''}`}>
                                {formatoMoneda(informeData.saldoProximos7Dias)}
                            </div>
                            <div className="inf-kpi-sub">{formatoNumero(informeData.cuentasProximas7Dias)} cuentas prioritarias</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Anticipos Garantizados</div>
                            <div className="inf-kpi-val is-palm">{formatoMoneda(informeData.totalAnticipoRecibido)}</div>
                            <div className="inf-kpi-sub">50% ya recaudado</div>
                        </article>

                        <article className="inf-kpi-card">
                            <div className="inf-kpi-label">Huéspedes en Casa</div>
                            <div className="inf-kpi-val">{formatoNumero(informeData.cuentasEnCasa)}</div>
                            <div className="inf-kpi-sub">Con saldo pendiente</div>
                        </article>
                    </section>

                    <div className="inf-subfilters">
                        <div className="inf-pill-row">
                            <span className="inf-pill-label">Prioridad:</span>
                            {[
                                { id: 'TODOS', label: 'Todas' },
                                { id: 'URGENTE', label: 'Próximos 7 días / En casa', danger: true },
                                { id: 'OCUPADA', label: 'En casa' },
                                { id: 'CONFIRMADA', label: 'Confirmadas' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`inf-pill ${p.danger ? 'is-danger-pill' : ''} ${filtroUrgenciaCxc === p.id ? 'is-active' : ''}`}
                                    onClick={() => setFiltroUrgenciaCxc(p.id)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="inf-table-card">
                        <div className="inf-table-scroll">
                            <table className="inf-table">
                                <thead>
                                    <tr>
                                        <th>Folio / Titular</th>
                                        <th>Sede / Hab.</th>
                                        <th>Estancia</th>
                                        <th className="num">Total</th>
                                        <th className="num">Anticipo</th>
                                        <th className="num">Saldo por Cobrar</th>
                                        <th>Plazo</th>
                                        <th className="num">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="inf-empty">
                                                No hay saldos pendientes por cobrar para el filtro actual.
                                            </td>
                                        </tr>
                                    ) : filasFiltradas.map((f, idx) => {
                                        const dias = Number(f.diasParaLlegada ?? 0);
                                        const esUrgente = dias <= 7 || f.estado === 'Ocupada';
                                        const plazoTxt = f.estado === 'Ocupada'
                                            ? 'En casa'
                                            : dias < 0
                                                ? `Vencido (${Math.abs(dias)}d)`
                                                : dias === 0
                                                    ? 'Llega hoy'
                                                    : `En ${dias}d`;
                                        return (
                                            <tr key={f.idReserva ?? idx} className={esUrgente ? 'is-risk-row' : ''}>
                                                <td>
                                                    <div className="inf-cell-main inf-nowrap">{f.folio}</div>
                                                    <div className="inf-cell-sub">{f.titular}</div>
                                                </td>
                                                <td>
                                                    <div className="inf-cell-main" style={{ fontWeight: 600 }}>{f.hotel}</div>
                                                    <div className="inf-cell-sub">Hab. {f.habitacionNumero}</div>
                                                </td>
                                                <td className="inf-nowrap">
                                                    <span>{formatearFechaCorta(f.fechaEntrada)} &rarr; {formatearFechaCorta(f.fechaSalida)}</span>
                                                    <span className="inf-val-muted"> ({f.noches}n)</span>
                                                </td>
                                                <td className="num inf-val-muted">{formatoMoneda(f.total)}</td>
                                                <td className="num inf-val-palm">{formatoMoneda(f.anticipo)}</td>
                                                <td className={`num ${esUrgente ? 'inf-val-danger' : 'inf-val-ocean'}`}>
                                                    {formatoMoneda(f.saldoPendiente)}
                                                </td>
                                                <td className="inf-nowrap">
                                                    <span className={`inf-badge ${esUrgente ? 'inf-badge-danger' : 'inf-badge-ocean'}`}>
                                                        {plazoTxt}
                                                    </span>
                                                </td>
                                                <td className="num">
                                                    <span className={badgeEstadoClase(f.estado)}>{f.estado}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {filasFiltradas.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}>Subtotal ({filasFiltradas.length} cuentas)</td>
                                            <td className="num">{formatoMoneda(subtotales.total)}</td>
                                            <td className="num inf-val-palm">{formatoMoneda(subtotales.anticipo)}</td>
                                            <td className="num inf-val-danger">{formatoMoneda(subtotales.saldo)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {cargando && !informeData && (
                <div className="inf-table-card">
                    <div className="inf-empty">Cargando auditoría...</div>
                </div>
            )}
        </div>
    );
}
