import React, { useState, useEffect } from 'react';
import {
    Printer, Download, FileSpreadsheet, Calendar,
    Building2, RefreshCw, Filter, CheckCircle2, ShieldAlert,
    TrendingUp, FileText, ChevronRight
} from 'lucide-react';
import {
    getInformeFinanciero,
    getInformeOcupacion,
    getInformeCancelaciones,
    getHoteles
} from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';

function formatoMoneda(valor) {
    if (valor == null || isNaN(valor)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(valor);
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${partes[2]} ${meses[parseInt(partes[1], 10) - 1]} ${partes[0]}`;
}

export default function InformesPage() {
    const { user, isGerente, isAdmin } = useAuth();

    const [pestanaActiva, setPestanaActiva] = useState('financiero'); // 'financiero' | 'ocupacion' | 'cancelaciones'
    const [anoSeleccionado, setAnoSeleccionado] = useState(2026);
    const [idHotelFiltro, setIdHotelFiltro] = useState('');
    const [paginaFinanciero, setPaginaFinanciero] = useState(0);
    const [tamanoPagina, setTamanoPagina] = useState(20);
    const [hoteles, setHoteles] = useState([]);

    const [informeData, setInformeData] = useState(null);
    const [filasImpresion, setFilasImpresion] = useState(null);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        getHoteles()
            .then(data => setHoteles(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error al cargar hoteles:', err));
    }, []);

    useEffect(() => {
        setPaginaFinanciero(0);
    }, [anoSeleccionado, idHotelFiltro, pestanaActiva]);

    useEffect(() => {
        cargarInforme();
    }, [pestanaActiva, anoSeleccionado, idHotelFiltro, paginaFinanciero, tamanoPagina]);

    const cargarInforme = async () => {
        setCargando(true);
        setErrorMsg('');
        try {
            const hotelIdParam = idHotelFiltro ? parseInt(idHotelFiltro, 10) : null;
            let res;

            if (pestanaActiva === 'financiero') {
                const inicio = `${anoSeleccionado}-01-01`;
                const fin = `${anoSeleccionado}-12-31`;
                res = await getInformeFinanciero(inicio, fin, hotelIdParam, paginaFinanciero, tamanoPagina);
            } else if (pestanaActiva === 'ocupacion') {
                res = await getInformeOcupacion(anoSeleccionado, hotelIdParam);
            } else {
                res = await getInformeCancelaciones(anoSeleccionado, hotelIdParam);
            }

            setInformeData(res);
        } catch (err) {
            console.error('Error al generar informe:', err);
            setErrorMsg(err.message || 'No fue posible generar el informe seleccionado.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        const limpiarImpresion = () => setFilasImpresion(null);
        window.addEventListener('afterprint', limpiarImpresion);
        return () => window.removeEventListener('afterprint', limpiarImpresion);
    }, []);

    const handleImprimir = async () => {
        if (pestanaActiva === 'financiero' && informeData && (informeData.totalPages ?? 1) > 1) {
            setImprimiendo(true);
            try {
                const hotelIdParam = idHotelFiltro ? parseInt(idHotelFiltro, 10) : null;
                const inicio = `${anoSeleccionado}-01-01`;
                const fin = `${anoSeleccionado}-12-31`;
                const primera = await getInformeFinanciero(inicio, fin, hotelIdParam, 0, 100);
                const todas = [...(primera?.filas || [])];
                const totalPaginas = primera?.totalPages ?? 1;
                for (let p = 1; p < totalPaginas; p++) {
                    const sig = await getInformeFinanciero(inicio, fin, hotelIdParam, p, 100);
                    if (Array.isArray(sig?.filas)) {
                        todas.push(...sig.filas);
                    }
                }
                setFilasImpresion(todas);
                setTimeout(() => window.print(), 80);
            } catch (err) {
                console.error('Error al preparar impresión completa:', err);
                setErrorMsg(err.message || 'No fue posible cargar todas las filas para imprimir.');
            } finally {
                setImprimiendo(false);
            }
            return;
        }
        window.print();
    };

    return (
        <div className="page-container informes-page-view" style={{ maxWidth: 1380, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
            {/* Estilos específicos para impresión oficial formal */}
            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .admin-navbar, .admin-footer, .chat-floating-btn, .informes-no-print {
                        display: none !important;
                    }
                    .page-container {
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .informe-print-header {
                        display: block !important;
                        margin-bottom: 25px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 12px;
                    }
                    .informe-table-print {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 9pt !important;
                        color: #000 !important;
                    }
                    .informe-table-print th, .informe-table-print td {
                        border: 1px solid #ccc !important;
                        padding: 5px 8px !important;
                        color: #000 !important;
                    }
                    .informe-table-print th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                    }
                    .informe-firma-box {
                        display: block !important;
                        margin-top: 50px;
                        page-break-inside: avoid;
                    }
                }
                @media screen {
                    .informe-print-header, .informe-firma-box {
                        display: none;
                    }
                }
            `}</style>

            {/* Cabecera Oficial para Impresión (Solo visible al imprimir) */}
            <div className="informe-print-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                            Hotel Paraíso &bull; Cadena Hotelera
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '10pt' }}>
                            Dirección General &bull; Gerencia Operativa y Financiera (Don Roberto)
                        </p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '9pt' }}>
                        <div><strong>Fecha de emisión:</strong> {new Date().toLocaleDateString('es-MX')}</div>
                        <div><strong>Periodo:</strong> Ejercicio {anoSeleccionado}</div>
                        <div><strong>Sede:</strong> {idHotelFiltro ? hoteles.find(h => String(h.idHotel) === String(idHotelFiltro))?.nombre : 'Toda la Cadena'}</div>
                    </div>
                </div>
            </div>

            {/* Cabecera de Pantalla */}
            <div className="informes-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                        Centro de Informes y Auditoría
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '4px 0 0' }}>
                        Reportes ejecutivos formales, conciliación de caja, ocupación por habitación y desglose de reembolsos.
                    </p>
                </div>

                {/* Controles de Filtros y Botón de Impresión */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', padding: '5px 12px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ejercicio:</span>
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
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', padding: '5px 12px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                        <Building2 size={15} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sede:</span>
                        <select
                            value={idHotelFiltro}
                            onChange={(e) => setIdHotelFiltro(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-primary)',
                                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="">Todas las Sedes</option>
                            {hoteles.map(h => (
                                <option key={h.idHotel} value={h.idHotel}>
                                    {h.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleImprimir}
                        disabled={cargando || imprimiendo}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}
                    >
                        <Printer size={16} />
                        <span>{imprimiendo ? 'Preparando todas las filas...' : 'Imprimir Informe'}</span>
                    </button>
                </div>
            </div>

            {/* Selector de Pestaña de Informe */}
            <div className="informes-no-print" style={{
                display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)',
                paddingBottom: 12, marginBottom: 24, flexWrap: 'wrap'
            }}>
                <button
                    type="button"
                    onClick={() => setPestanaActiva('financiero')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
                        borderRadius: 10, border: pestanaActiva === 'financiero' ? '1px solid var(--admin-accent)' : '1px solid var(--border-color)',
                        cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700,
                        background: pestanaActiva === 'financiero' ? 'var(--admin-accent)' : 'var(--bg-surface)',
                        color: pestanaActiva === 'financiero' ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: pestanaActiva === 'financiero' ? '0 2px 6px rgba(45, 90, 67, 0.2)' : 'none'
                    }}
                >
                    <FileText size={16} style={{ color: pestanaActiva === 'financiero' ? '#ffffff' : '#059669' }} />
                    <span>1. Informe Financiero & Flujo de Caja</span>
                </button>

                <button
                    type="button"
                    onClick={() => setPestanaActiva('ocupacion')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
                        borderRadius: 10, border: pestanaActiva === 'ocupacion' ? '1px solid var(--admin-accent)' : '1px solid var(--border-color)',
                        cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700,
                        background: pestanaActiva === 'ocupacion' ? 'var(--admin-accent)' : 'var(--bg-surface)',
                        color: pestanaActiva === 'ocupacion' ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: pestanaActiva === 'ocupacion' ? '0 2px 6px rgba(45, 90, 67, 0.2)' : 'none'
                    }}
                >
                    <TrendingUp size={16} style={{ color: pestanaActiva === 'ocupacion' ? '#ffffff' : '#0284c7' }} />
                    <span>2. Informe de Ocupación por Habitación</span>
                </button>

                <button
                    type="button"
                    onClick={() => setPestanaActiva('cancelaciones')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
                        borderRadius: 10, border: pestanaActiva === 'cancelaciones' ? '1px solid var(--admin-accent)' : '1px solid var(--border-color)',
                        cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700,
                        background: pestanaActiva === 'cancelaciones' ? 'var(--admin-accent)' : 'var(--bg-surface)',
                        color: pestanaActiva === 'cancelaciones' ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: pestanaActiva === 'cancelaciones' ? '0 2px 6px rgba(45, 90, 67, 0.2)' : 'none'
                    }}
                >
                    <ShieldAlert size={16} style={{ color: pestanaActiva === 'cancelaciones' ? '#ffffff' : '#dc2626' }} />
                    <span>3. Informe de Cancelaciones & Reembolsos</span>
                </button>
            </div>

            {errorMsg && (
                <div style={{
                    padding: '12px 18px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444', color: '#fca5a5', marginBottom: 20
                }}>
                    {errorMsg}
                </div>
            )}

            {/* CONTENIDO DEL INFORME 1: FINANCIERO */}
            {pestanaActiva === 'financiero' && informeData && (
                <div>
                    {/* Tarjetas de Resumen Financiero */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12, marginBottom: 20
                    }}>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Contratado</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(informeData.granTotalContratado)}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Anticipos Cobrados</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(informeData.totalAnticiposCobrados)}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Saldos Liquidados</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(informeData.totalSaldosLiquidados)}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Penalizaciones Retenidas</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(informeData.totalPenalizaciones)}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Reembolsos Devueltos</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                -{formatoMoneda(informeData.totalReembolsos)}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: 14, borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#22c55e', textTransform: 'uppercase', fontWeight: 700 }}>Ingreso Neto Caja</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                {formatoMoneda(informeData.ingresosNetosCaja)}
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Detalle Financiero */}
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                        <table className="informe-table-print" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px' }}>Folio</th>
                                    <th style={{ padding: '10px 12px' }}>Titular</th>
                                    <th style={{ padding: '10px 12px' }}>Sede</th>
                                    <th style={{ padding: '10px 12px' }}>Hab.</th>
                                    <th style={{ padding: '10px 12px' }}>Fechas</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Anticipo</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Liquidado</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Penalización</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Reembolso</th>
                                    <th style={{ padding: '10px 12px' }}>Estado</th>
                                    <th style={{ padding: '10px 12px' }}>Método</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filasImpresion ?? informeData.filas ?? []).map((f, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{f.folio}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{f.titular}</td>
                                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{f.hotel}</td>
                                        <td style={{ padding: '8px 12px' }}>#{f.habitacionNumero}</td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            {f.fechaEntrada} &rarr; {f.fechaSalida} ({f.noches}n)
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(f.total)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(f.anticipo)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(f.saldoLiquidado)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                            {f.penalizacionRetenida > 0 ? formatoMoneda(f.penalizacionRetenida) : '—'}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                            {f.montoReembolso > 0 ? `-${formatoMoneda(f.montoReembolso)}` : '—'}
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <span style={{
                                                fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                                                background: f.estado === 'Finalizada' ? 'rgba(34, 197, 94, 0.15)' :
                                                            f.estado === 'Confirmada' ? 'rgba(14, 165, 233, 0.15)' :
                                                            f.estado === 'Cancelada' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                color: f.estado === 'Finalizada' ? '#22c55e' :
                                                       f.estado === 'Confirmada' ? '#0ea5e9' :
                                                       f.estado === 'Cancelada' ? '#ef4444' : '#f59e0b'
                                            }}>
                                                {f.estado}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>{f.metodoPago}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {(informeData.totalPages ?? 0) > 0 && (
                        <div className="informes-no-print" style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexWrap: 'wrap', gap: 12, marginTop: 14
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                                <span>Filas por página:</span>
                                <select
                                    value={tamanoPagina}
                                    onChange={(e) => { setTamanoPagina(Number(e.target.value)); setPaginaFinanciero(0); }}
                                    style={{
                                        background: 'var(--bg-surface)', color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 8px'
                                    }}
                                >
                                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span>Total en periodo: <strong>{informeData.totalElements ?? informeData.totalRegistros}</strong></span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={paginaFinanciero <= 0 || cargando}
                                    onClick={() => setPaginaFinanciero(p => Math.max(0, p - 1))}
                                >
                                    Anterior
                                </button>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    Página {(informeData.page ?? 0) + 1} de {informeData.totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={(informeData.page ?? 0) + 1 >= (informeData.totalPages ?? 1) || cargando}
                                    onClick={() => setPaginaFinanciero(p => p + 1)}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENIDO DEL INFORME 2: OCUPACIÓN */}
            {pestanaActiva === 'ocupacion' && informeData && (
                <div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 12, marginBottom: 20
                    }}>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Habitaciones Totales</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{informeData.totalHabitaciones} cuartos</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Noches Vendidas</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0ea5e9' }}>{informeData.totalNochesVendidas} noches</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tasa de Ocupación Global</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{informeData.ocupacionGlobalPct}%</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ingresos Totales Hospedaje</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatoMoneda(informeData.totalIngresosGenerados)}</div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                        <table className="informe-table-print" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px' }}>Habitación</th>
                                    <th style={{ padding: '10px 12px' }}>Piso</th>
                                    <th style={{ padding: '10px 12px' }}>Hotel</th>
                                    <th style={{ padding: '10px 12px' }}>Categoría</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tarifa Base</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Noches Vendidas</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ocupación %</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Reservaciones</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ingresos Generados</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(informeData.filas || []).map((h, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>Hab. {h.numero}</td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Piso {h.piso}</td>
                                        <td style={{ padding: '10px 12px' }}>{h.hotel}</td>
                                        <td style={{ padding: '10px 12px' }}>{h.categoria}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(h.precioBase)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                            {h.nochesOcupadas}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0ea5e9', fontVariantNumeric: 'tabular-nums' }}>
                                            {h.tasaOcupacionPct}%
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {h.totalReservas}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(h.ingresosTotales)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENIDO DEL INFORME 3: CANCELACIONES */}
            {pestanaActiva === 'cancelaciones' && informeData && (
                <div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12, marginBottom: 20
                    }}>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Casos Auditados</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{informeData.totalCasos}</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Reembolsos Autorizados</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{formatoMoneda(informeData.totalReembolsado)}</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Penalizaciones Retenidas</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{formatoMoneda(informeData.totalPenalizacionesRetenidas)}</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Casos &gt;72h (100% Reemb.)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{informeData.casosReembolso100}</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Casos 48&ndash;72h (50% Reemb.)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{informeData.casosReembolso50}</div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>No-Shows (100% Retenido)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{informeData.casosNoShow}</div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                        <table className="informe-table-print" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px' }}>Folio</th>
                                    <th style={{ padding: '10px 12px' }}>Titular</th>
                                    <th style={{ padding: '10px 12px' }}>Entrada Prevista</th>
                                    <th style={{ padding: '10px 12px' }}>Regla Aplicada</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Anticipo</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Reembolsado</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Penalización</th>
                                    <th style={{ padding: '10px 12px' }}>Banco / CLABE</th>
                                    <th style={{ padding: '10px 12px' }}>Autorizado Por</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filasImpresion ?? informeData.filas ?? []).map((f, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{f.folio}</td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{f.titular}</td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{formatearFecha(f.fechaEntrada)}</td>
                                        <td style={{ padding: '10px 12px', fontWeight: 600, color: f.reglaAplicada.includes('100% Reembolso') ? '#22c55e' : f.reglaAplicada.includes('50%') ? '#f59e0b' : '#ef4444' }}>
                                            {f.reglaAplicada}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(f.totalEstancia)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatoMoneda(f.anticipoPagado)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                            {f.montoReembolsado > 0 ? formatoMoneda(f.montoReembolsado) : '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                                            {f.penalizacionRetenida > 0 ? formatoMoneda(f.penalizacionRetenida) : '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            {f.bancoReembolso} <br />
                                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{f.clabeReembolso}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                                            {f.autorizadoPor}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bloque de Firmas para Impresión Formal */}
            <div className="informe-firma-box">
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 60 }}>
                    <div style={{ width: 250, borderTop: '1px solid #000', paddingTop: 8 }}>
                        <div style={{ fontWeight: 'bold' }}>Don Roberto</div>
                        <div style={{ fontSize: '9pt', color: '#555' }}>Gerente General &bull; Hotel Paraíso</div>
                    </div>
                    <div style={{ width: 250, borderTop: '1px solid #000', paddingTop: 8 }}>
                        <div style={{ fontWeight: 'bold' }}>Auditoría Contable</div>
                        <div style={{ fontSize: '9pt', color: '#555' }}>Conciliación de Cierres de Lote</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
