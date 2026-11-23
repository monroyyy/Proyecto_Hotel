import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    BedDouble, Plus, Search, Edit2, Trash2, CheckCircle2,
    AlertCircle, Clock, RefreshCw, CalendarPlus, Eye,
    ChevronDown, MoreHorizontal, ArrowUpDown
} from 'lucide-react';

import HabitacionModal from '../components/HabitacionModal';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import {
    getHabitaciones,
    getHoteles,
    getTiposHabitacion,
    getResumenHabitaciones,
    crearHabitacion,
    actualizarHabitacion,
    cambiarEstadoHabitacion,
    eliminarHabitacion,
    agregarDiaExtraHabitacion
} from '../api/hotelApi';
import './HabitacionesPage.css';

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${parseInt(partes[2], 10)} ${meses[parseInt(partes[1], 10) - 1] || partes[1]}`;
}

function formatoMoneda(valor) {
    return `$${Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function obtenerProximaLlegada(periodosOcupados) {
    if (!Array.isArray(periodosOcupados) || periodosOcupados.length === 0) return null;
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const futuras = periodosOcupados
        .map(p => String(p?.fechaEntrada || '').split('T')[0])
        .filter(f => f && f >= hoyStr)
        .sort();
    if (futuras.length === 0) return null;
    const prox = futuras[0];
    const diffMs = new Date(`${prox}T00:00:00`) - new Date(`${hoyStr}T00:00:00`);
    const dias = Math.round(diffMs / 86400000);
    return { fecha: prox, dias };
}

export default function HabitacionesPage() {
    const { user, isGerente, isAdmin, navigate } = useAuth();
    const puedeGestionarCatalogo = isGerente || isAdmin;

    const [habitaciones, setHabitaciones] = useState([]);
    const [hoteles, setHoteles] = useState([]);
    const [tiposHabitacion, setTiposHabitacion] = useState([]);
    const [resumen, setResumen] = useState({ total: 0, disponibles: 0, ocupadas: 0, mantenimiento: 0 });

    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [extendiendoHabId, setExtendiendoHabId] = useState(null);

    // Filtros y ordenamiento
    const [busqueda, setBusqueda] = useState('');
    const [filtroHotel, setFiltroHotel] = useState(() => {
        const saved = sessionStorage.getItem('hotel_filtro_sede');
        if (saved) {
            sessionStorage.removeItem('hotel_filtro_sede');
            return saved;
        }
        return '';
    });
    const [filtroTipo, setFiltroTipo] = useState(() => {
        const saved = sessionStorage.getItem('hotel_filtro_tipo');
        if (saved) {
            sessionStorage.removeItem('hotel_filtro_tipo');
            return saved;
        }
        return '';
    });
    const [filtroEstado, setFiltroEstado] = useState(() => {
        const saved = sessionStorage.getItem('hotel_filtro_estado_hab');
        if (saved) {
            sessionStorage.removeItem('hotel_filtro_estado_hab');
            return saved;
        }
        return 'TODOS';
    });
    const [filtroPiso, setFiltroPiso] = useState('');
    const [orden, setOrden] = useState({ campo: 'numero', dir: 'asc' });

    useEffect(() => {
        const onAplicarFiltro = () => {
            const saved = sessionStorage.getItem('hotel_filtro_estado_hab');
            if (saved) {
                sessionStorage.removeItem('hotel_filtro_estado_hab');
                setFiltroEstado(saved);
            }
        };
        window.addEventListener('hotel:aplicar-filtro-habitaciones', onAplicarFiltro);
        return () => window.removeEventListener('hotel:aplicar-filtro-habitaciones', onAplicarFiltro);
    }, []);

    const toggleOrden = (campo) => {
        setOrden(prev =>
            prev.campo === campo
                ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { campo, dir: campo === 'precioBase' ? 'desc' : 'asc' }
        );
    };

    // Modales y menú contextual
    const [modalAbierto, setModalAbierto] = useState(false);
    const [habitacionAEditar, setHabitacionAEditar] = useState(null);
    const [habitacionAEliminar, setHabitacionAEliminar] = useState(null);
    const [habitacionDetalle, setHabitacionDetalle] = useState(null);
    const [menuAbiertoId, setMenuAbiertoId] = useState(null);
    const menuWrapRef = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
                setMenuAbiertoId(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            setErrorMsg('');

            const [habsData, hotelesData, tiposData, resumenData] = await Promise.all([
                getHabitaciones(),
                getHoteles(),
                getTiposHabitacion(),
                getResumenHabitaciones().catch(() => null)
            ]);

            setHabitaciones(habsData || []);
            setHoteles(hotelesData || []);
            setTiposHabitacion(tiposData || []);

            if (resumenData) {
                setResumen({
                    total: resumenData.total || 0,
                    disponibles: resumenData.disponibles || 0,
                    ocupadas: resumenData.ocupadas || 0,
                    mantenimiento: resumenData.mantenimiento || 0
                });
            } else if (habsData) {
                setResumen({
                    total: habsData.length,
                    disponibles: habsData.filter(h => h.estado === 'Disponible').length,
                    ocupadas: habsData.filter(h => h.estado === 'Ocupada').length,
                    mantenimiento: habsData.filter(h => h.estado === 'Mantenimiento').length
                });
            }

            if (habitacionDetalle && habsData) {
                const actualizada = habsData.find(h => h.idHabitacion === habitacionDetalle.idHabitacion);
                if (actualizada) setHabitacionDetalle(actualizada);
            }
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setErrorMsg(err.message || 'No fue posible conectar con el servidor.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        const onUpdate = () => cargarDatos();
        window.addEventListener('hotel:reserva-actualizada', onUpdate);
        return () => window.removeEventListener('hotel:reserva-actualizada', onUpdate);
    }, []);

    const mostrarMensaje = (tipo, texto) => {
        setNotificacion({ tipo, texto });
        setTimeout(() => setNotificacion(null), 4500);
    };

    const handleAgregarDiaExtra = async (hab) => {
        if (!hab || extendiendoHabId) return;
        setExtendiendoHabId(hab.idHabitacion);
        try {
            const actualizada = await agregarDiaExtraHabitacion(hab.idHabitacion, 1);
            mostrarMensaje(
                'exito',
                `Día extra agregado a Hab. #${actualizada.numero}. Nueva salida: ${formatearFechaCorta(actualizada.fechaOcupacionFin)} (12:00 h).`
            );
            await cargarDatos();
            setHabitacionDetalle(actualizada);
            window.dispatchEvent(new CustomEvent('hotel:refresh-notifications'));
        } catch (err) {
            mostrarMensaje('error', err.message || 'No se pudo agregar el día extra.');
        } finally {
            setExtendiendoHabId(null);
        }
    };

    const handleGuardarHabitacion = async (datos) => {
        if (habitacionAEditar) {
            await actualizarHabitacion(habitacionAEditar.idHabitacion, datos);
            mostrarMensaje('exito', `Habitación #${datos.numero} actualizada.`);
        } else {
            await crearHabitacion(datos);
            mostrarMensaje('exito', `Habitación #${datos.numero} registrada.`);
        }
        await cargarDatos();
    };

    const handleCambiarEstado = async (id, estadoActual, nuevoEstado) => {
        if (estadoActual === nuevoEstado) return;
        try {
            await cambiarEstadoHabitacion(id, nuevoEstado);
            mostrarMensaje('info', `Estado actualizado a "${nuevoEstado}".`);
            await cargarDatos();
            window.dispatchEvent(new CustomEvent('hotel:refresh-notifications'));
        } catch (err) {
            mostrarMensaje('error', 'Error al cambiar estado: ' + err.message);
        }
    };

    const handleEliminar = (habitacion) => {
        if (habitacion.estado === 'Ocupada') {
            mostrarMensaje('error', `No se puede eliminar la habitación #${habitacion.numero} porque está Ocupada.`);
            return;
        }
        setHabitacionAEliminar(habitacion);
    };

    const handleConfirmarEliminar = async () => {
        if (!habitacionAEliminar) return;
        const hab = habitacionAEliminar;
        try {
            await eliminarHabitacion(hab.idHabitacion);
            mostrarMensaje('exito', `Habitación #${hab.numero} eliminada.`);
            await cargarDatos();
        } catch (err) {
            mostrarMensaje('error', 'No se pudo eliminar: ' + err.message);
        } finally {
            setHabitacionAEliminar(null);
        }
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroHotel('');
        setFiltroTipo('');
        setFiltroEstado('TODOS');
        setFiltroPiso('');
    };

    const habitacionesActivas = useMemo(
        () => habitaciones.filter(h => !h.hotel || h.hotel.activo !== false),
        [habitaciones]
    );

    const habitacionesFiltradas = useMemo(() => {
        const filtradas = habitacionesActivas.filter((h) => {
            if (busqueda.trim()) {
                const term = busqueda.toLowerCase().trim();
                const coincideNumero = h.numero?.toLowerCase().includes(term);
                const coincideHotel = h.hotel?.nombre?.toLowerCase().includes(term);
                const coincideTipo = h.tipoHabitacion?.nombre?.toLowerCase().includes(term);
                if (!coincideNumero && !coincideHotel && !coincideTipo) return false;
            }
            if (filtroHotel && h.hotel?.idHotel !== parseInt(filtroHotel, 10)) return false;
            if (filtroTipo && h.tipoHabitacion?.idTipo !== parseInt(filtroTipo, 10)) return false;
            if (filtroEstado !== 'TODOS' && h.estado?.toLowerCase() !== filtroEstado.toLowerCase()) return false;
            if (filtroPiso && h.piso !== parseInt(filtroPiso, 10)) return false;
            return true;
        });

        const mult = orden.dir === 'asc' ? 1 : -1;
        return [...filtradas].sort((a, b) => {
            if (orden.campo === 'precioBase') {
                return (Number(a.tipoHabitacion?.precioBase || 0) - Number(b.tipoHabitacion?.precioBase || 0)) * mult;
            }
            if (orden.campo === 'estado') {
                return String(a.estado || '').localeCompare(String(b.estado || '')) * mult;
            }
            return String(a.numero || '').localeCompare(String(b.numero || ''), 'es', { numeric: true }) * mult;
        });
    }, [habitacionesActivas, busqueda, filtroHotel, filtroTipo, filtroEstado, filtroPiso, orden]);

    const pisosDisponibles = useMemo(() => {
        const setPisos = new Set(habitacionesActivas.map(h => h.piso).filter(Boolean));
        if (setPisos.size === 0) return [1, 2, 3];
        return Array.from(setPisos).sort((a, b) => a - b);
    }, [habitacionesActivas]);

    const hayFiltros = Boolean(busqueda.trim() || filtroHotel || filtroTipo || filtroEstado !== 'TODOS' || filtroPiso);

    return (
        <div className="hab-view">
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    {notificacion.tipo === 'info' && <Clock size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* CABECERA EDITORIAL */}
            <header className="hab-header hab-anim-up">
                <div>
                    <div className="hab-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Inventario Hotelero</span>
                        <span className="hab-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="hab-title">Habitaciones</h1>
                </div>

                {puedeGestionarCatalogo && (
                    <button
                        type="button"
                        className="hab-cta-btn"
                        onClick={() => {
                            setHabitacionAEditar(null);
                            setModalAbierto(true);
                        }}
                    >
                        <Plus size={16} />
                        <span>Nueva habitación</span>
                    </button>
                )}
            </header>

            {errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span><strong>Error:</strong> {errorMsg}</span>
                </div>
            )}

            {/* 4 KPIs COMPACTOS CLICABLES */}
            <section className="hab-kpi-grid hab-anim-up hab-delay-1" aria-label="Resumen de inventario">
                <button
                    type="button"
                    className={`hab-kpi-card ${filtroEstado === 'TODOS' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('TODOS')}
                >
                    <div className="hab-kpi-label">Total Habitaciones</div>
                    <div className="hab-kpi-val">{resumen.total}</div>
                    <div className="hab-kpi-sub">Inventario activo</div>
                </button>

                <button
                    type="button"
                    className={`hab-kpi-card is-palm ${filtroEstado === 'Disponible' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('Disponible')}
                >
                    <div className="hab-kpi-label">Disponibles</div>
                    <div className="hab-kpi-val">{resumen.disponibles}</div>
                    <div className="hab-kpi-sub">Listas para hospedar</div>
                </button>

                <button
                    type="button"
                    className={`hab-kpi-card is-ocean ${filtroEstado === 'Ocupada' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('Ocupada')}
                >
                    <div className="hab-kpi-label">Ocupadas</div>
                    <div className="hab-kpi-val">{resumen.ocupadas}</div>
                    <div className="hab-kpi-sub">Con estancia hoy</div>
                </button>

                <button
                    type="button"
                    className={`hab-kpi-card is-terra ${filtroEstado === 'Mantenimiento' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('Mantenimiento')}
                >
                    <div className="hab-kpi-label">Mantenimiento</div>
                    <div className="hab-kpi-val">{resumen.mantenimiento}</div>
                    <div className="hab-kpi-sub">Fuera de servicio</div>
                </button>
            </section>

            {/* BARRA UNIFICADA DE FILTROS EN 1 SOLA LÍNEA */}
            <div className="hab-filter-bar hab-anim-up hab-delay-1">
                <div className="hab-filter-left">
                    <div className="hab-search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            className="hab-search-input"
                            placeholder="Número, hotel o categoría..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            aria-label="Buscar habitaciones"
                        />
                    </div>

                    <div className="hab-select-wrap">
                        <select
                            className="hab-select"
                            value={filtroHotel}
                            onChange={(e) => setFiltroHotel(e.target.value)}
                            aria-label="Filtrar por propiedad"
                        >
                            <option value="">Todas las sedes</option>
                            {hoteles.filter(h => h.activo !== false).map((h) => (
                                <option key={h.idHotel} value={h.idHotel}>
                                    {h.nombre}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="hab-select-chevron" />
                    </div>

                    <div className="hab-select-wrap">
                        <select
                            className="hab-select"
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            aria-label="Filtrar por categoría"
                        >
                            <option value="">Todas las categorías</option>
                            {tiposHabitacion.map((t) => (
                                <option key={t.idTipo} value={t.idTipo}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="hab-select-chevron" />
                    </div>

                    <div className="hab-select-wrap">
                        <select
                            className="hab-select"
                            value={filtroPiso}
                            onChange={(e) => setFiltroPiso(e.target.value)}
                            aria-label="Filtrar por piso"
                        >
                            <option value="">Todos los pisos</option>
                            {pisosDisponibles.map((p) => (
                                <option key={p} value={p}>
                                    Piso {p}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="hab-select-chevron" />
                    </div>

                    {hayFiltros && (
                        <button type="button" className="hab-clear-btn" onClick={limpiarFiltros}>
                            Limpiar
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="hab-icon-btn"
                    onClick={cargarDatos}
                    disabled={cargando}
                    title="Actualizar inventario"
                    aria-label="Actualizar inventario"
                >
                    <RefreshCw size={14} className={cargando ? 'hab-spin' : ''} />
                </button>
            </div>

            {/* TABLA LIMPIA (0% OVERFLOW) */}
            <div className="hab-table-card hab-anim-up hab-delay-2" ref={menuWrapRef}>
                {cargando ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando habitaciones...</p>
                    </div>
                ) : habitacionesFiltradas.length === 0 ? (
                    <div className="empty-state">
                        <BedDouble size={40} className="empty-icon" />
                        <h3>No se encontraron habitaciones</h3>
                        <p>Ninguna unidad coincide con los filtros actuales.</p>
                        {hayFiltros && (
                            <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <table className="hab-table">
                            <thead>
                                <tr>
                                    <th>
                                        <button
                                            type="button"
                                            className={`hab-sort-btn ${orden.campo === 'numero' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('numero')}
                                        >
                                            <span>Habitación</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>Propiedad</th>
                                    <th>Categoría</th>
                                    {!isAdmin && (
                                        <th className="num">
                                            <button
                                                type="button"
                                                className={`hab-sort-btn ${orden.campo === 'precioBase' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrden('precioBase')}
                                            >
                                                <span>Tarifa / Noche</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                    )}
                                    <th>
                                        <button
                                            type="button"
                                            className={`hab-sort-btn ${orden.campo === 'estado' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('estado')}
                                        >
                                            <span>Estado</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th className="num">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {habitacionesFiltradas.map((hab) => {
                                    const tipo = hab.tipoHabitacion;
                                    const hotel = hab.hotel;
                                    const cap = tipo?.capacidad || 1;
                                    const esOcupada = (hab.estado || '').toLowerCase() === 'ocupada';
                                    const estadoKey = (hab.estado || 'disponible').toLowerCase();
                                    const menuAbierto = menuAbiertoId === hab.idHabitacion;

                                    return (
                                        <tr key={hab.idHabitacion}>
                                            <td className="hab-nowrap">
                                                <span className="hab-cell-main">Hab. {hab.numero}</span>
                                                <span className="hab-cell-sub"> &middot; Piso {hab.piso}</span>
                                            </td>

                                            <td>
                                                <div className="hab-cell-main" style={{ fontWeight: 600 }}>
                                                    {hotel?.nombre || 'Sin asignar'}
                                                </div>
                                                <div className="hab-cell-sub">{hotel?.ciudad || '—'}</div>
                                            </td>

                                            <td>
                                                <div className="hab-cell-main" style={{ fontWeight: 600 }}>
                                                    {tipo?.nombre || 'Estándar'}
                                                </div>
                                                <div className="hab-cell-sub">
                                                    Hasta {cap} {cap === 1 ? 'huésped' : 'huéspedes'}
                                                </div>
                                            </td>

                                            {!isAdmin && (
                                                <td className="num" style={{ fontWeight: 700, color: 'var(--brand-ocean, #16324f)' }}>
                                                    {formatoMoneda(tipo?.precioBase)}
                                                </td>
                                            )}

                                            <td>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <select
                                                        className={`hab-status-pill is-${estadoKey}`}
                                                        value={hab.estado}
                                                        onChange={(e) => handleCambiarEstado(hab.idHabitacion, hab.estado, e.target.value)}
                                                        aria-label={`Estado de habitación ${hab.numero}`}
                                                    >
                                                        <option value="Disponible">Disponible</option>
                                                        <option value="Ocupada">Ocupada</option>
                                                        <option value="Mantenimiento">Mantenimiento</option>
                                                    </select>
                                                    {esOcupada && hab.fechaOcupacionFin ? (
                                                        <span className="hab-next-note">
                                                            Sale {formatearFechaCorta(hab.fechaOcupacionFin)}
                                                        </span>
                                                    ) : estadoKey === 'disponible' ? (() => {
                                                        const prox = obtenerProximaLlegada(hab.periodosOcupados);
                                                        if (!prox) return null;
                                                        return (
                                                            <span
                                                                className={`hab-next-note ${prox.dias <= 3 ? 'is-soon' : ''}`}
                                                                title="Próxima reservación confirmada"
                                                            >
                                                                Próx. {formatearFechaCorta(prox.fecha)}
                                                            </span>
                                                        );
                                                    })() : null}
                                                </div>
                                            </td>

                                            <td className="num">
                                                <div className="hab-action-cell">
                                                    <button
                                                        type="button"
                                                        className="hab-ver-btn"
                                                        onClick={() => setHabitacionDetalle(hab)}
                                                    >
                                                        <Eye size={13} />
                                                        <span>Ver</span>
                                                    </button>

                                                    {puedeGestionarCatalogo && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className={`hab-more-btn ${menuAbierto ? 'is-open' : ''}`}
                                                                onClick={() => setMenuAbiertoId(menuAbierto ? null : hab.idHabitacion)}
                                                                aria-label="Más acciones"
                                                                aria-expanded={menuAbierto}
                                                            >
                                                                <MoreHorizontal size={15} />
                                                            </button>

                                                            {menuAbierto && (
                                                                <div className="hab-menu" role="menu">
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="hab-menu-item"
                                                                        onClick={() => {
                                                                            setMenuAbiertoId(null);
                                                                            setHabitacionAEditar(hab);
                                                                            setModalAbierto(true);
                                                                        }}
                                                                    >
                                                                        <Edit2 size={14} />
                                                                        <span>Editar habitación</span>
                                                                    </button>

                                                                    {esOcupada && hab.diaExtraDisponible && (
                                                                        <button
                                                                            type="button"
                                                                            role="menuitem"
                                                                            className="hab-menu-item"
                                                                            onClick={() => {
                                                                                setMenuAbiertoId(null);
                                                                                handleAgregarDiaExtra(hab);
                                                                            }}
                                                                        >
                                                                            <CalendarPlus size={14} />
                                                                            <span>Extender +1 noche</span>
                                                                        </button>
                                                                    )}

                                                                    <div className="hab-menu-sep" />

                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="hab-menu-item is-danger"
                                                                        disabled={esOcupada}
                                                                        title={esOcupada ? 'No se puede eliminar una habitación ocupada' : 'Eliminar habitación'}
                                                                        onClick={() => {
                                                                            setMenuAbiertoId(null);
                                                                            handleEliminar(hab);
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        <span>Eliminar habitación</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="hab-table-footer">
                            Mostrando <strong style={{ color: 'var(--text-primary)' }}>{habitacionesFiltradas.length}</strong> de{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>{habitacionesActivas.length}</strong> habitaciones
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Detalle Operativo ("Ver") */}
            {habitacionDetalle && (() => {
                const capDet = habitacionDetalle.tipoHabitacion?.capacidad || 1;
                return (
                    <Modal
                        isOpen={Boolean(habitacionDetalle)}
                        onClose={() => setHabitacionDetalle(null)}
                        title={`Habitación #${habitacionDetalle.numero}`}
                        subtitle={`${habitacionDetalle.hotel?.nombre || 'Hotel'} · Piso ${habitacionDetalle.piso}`}
                        icon={BedDouble}
                        maxWidth="600px"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div className="hab-detail-grid" style={isAdmin ? { gridTemplateColumns: 'repeat(3, 1fr)' } : undefined}>
                                <div className="hab-detail-card">
                                    <span className="hab-detail-label">Propiedad</span>
                                    <span className="hab-detail-val">{habitacionDetalle.hotel?.nombre || 'No asignada'}</span>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{habitacionDetalle.hotel?.ciudad || ''}</span>
                                </div>
                                <div className="hab-detail-card">
                                    <span className="hab-detail-label">Categoría</span>
                                    <span className="hab-detail-val">{habitacionDetalle.tipoHabitacion?.nombre || 'Estándar'}</span>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                        Hasta {capDet} {capDet === 1 ? 'huésped' : 'huéspedes'}
                                    </span>
                                </div>
                                <div className="hab-detail-card">
                                    <span className="hab-detail-label">Ubicación</span>
                                    <span className="hab-detail-val">Piso {habitacionDetalle.piso}</span>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Hab. #{habitacionDetalle.numero}</span>
                                </div>
                                {!isAdmin && (
                                    <div className="hab-detail-card">
                                        <span className="hab-detail-label">Tarifa por Noche</span>
                                        <span className="hab-detail-val num" style={{ color: '#16324f' }}>
                                            {formatoMoneda(habitacionDetalle.tipoHabitacion?.precioBase)}
                                        </span>
                                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Tarifa base MXN</span>
                                    </div>
                                )}
                            </div>

                            {habitacionDetalle.estado === 'Ocupada' && habitacionDetalle.fechaOcupacionFin ? (
                                <div className="hab-occupancy-box">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16324f', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <Clock size={16} />
                                            <span>Estancia en curso</span>
                                        </div>
                                        <span style={{ fontSize: '0.74rem', background: '#eaf0f6', color: '#16324f', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                            Check-out 12:00 h
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                                        Ocupada del <strong>{formatearFechaCorta(habitacionDetalle.fechaOcupacionInicio)}</strong> al{' '}
                                        <strong>{formatearFechaCorta(habitacionDetalle.fechaOcupacionFin)}</strong>
                                    </div>

                                    <div style={{ paddingTop: 8, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                            {habitacionDetalle.diaExtraDisponible
                                                ? `Siguiente salida disponible: ${formatearFechaCorta(habitacionDetalle.nuevaFechaDesocupacion)} (12:00 h)`
                                                : 'El día siguiente ya está reservado.'}
                                        </div>

                                        {habitacionDetalle.diaExtraDisponible ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => handleAgregarDiaExtra(habitacionDetalle)}
                                                disabled={extendiendoHabId === habitacionDetalle.idHabitacion}
                                                style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                                            >
                                                <CalendarPlus size={15} />
                                                <span>
                                                    {extendiendoHabId === habitacionDetalle.idHabitacion
                                                        ? 'Extendiendo...'
                                                        : isAdmin
                                                            ? '+1 Día extra'
                                                            : `+1 Día extra (+${formatoMoneda(habitacionDetalle.costoDiaExtra || habitacionDetalle.tipoHabitacion?.precioBase)})`}
                                                </span>
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.76rem', color: '#b91c1c', fontWeight: 700 }}>
                                                No disponible
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="hab-occupancy-free">
                                    <CheckCircle2 size={18} />
                                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                                        {habitacionDetalle.estado === 'Mantenimiento'
                                            ? 'Unidad en mantenimiento (fuera de servicio temporal).'
                                            : 'Habitación disponible sin estancia en curso.'}
                                    </div>
                                </div>
                            )}

                            {Array.isArray(habitacionDetalle.periodosOcupados) && habitacionDetalle.periodosOcupados.length > 0 && (
                                <div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Próximas reservaciones ({habitacionDetalle.periodosOcupados.length})
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, maxHeight: 130, overflowY: 'auto' }}>
                                        {habitacionDetalle.periodosOcupados.map((p, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: '#f8fafc',
                                                    padding: '6px 12px',
                                                    borderRadius: 8,
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: '0.78rem'
                                                }}
                                            >
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                    {formatearFechaCorta(p.fechaEntrada)} &rarr; {formatearFechaCorta(p.fechaSalida)}
                                                </span>
                                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                                    Check-out 12:00 h
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                {habitacionDetalle.estado === 'Disponible' && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            sessionStorage.setItem('hotel_preseleccion_reserva', JSON.stringify({
                                                idHotel: habitacionDetalle.hotel?.idHotel || '',
                                                idHabitacion: habitacionDetalle.idHabitacion,
                                                numero: habitacionDetalle.numero
                                            }));
                                            setHabitacionDetalle(null);
                                            navigate('/reservas');
                                        }}
                                    >
                                        <CalendarPlus size={15} />
                                        <span>Reservar</span>
                                    </button>
                                )}
                                <button type="button" className="btn btn-secondary" onClick={() => setHabitacionDetalle(null)}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </Modal>
                );
            })()}

            {/* Modal para Crear/Editar Habitación */}
            <HabitacionModal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                onSave={handleGuardarHabitacion}
                habitacionParaEditar={habitacionAEditar}
                hoteles={hoteles.filter(h => h.activo !== false)}
                tiposHabitacion={tiposHabitacion}
                pisosDisponibles={pisosDisponibles}
                ocultarFinanzas={isAdmin}
            />

            {/* ConfirmDialog para eliminar habitación */}
            <ConfirmDialog
                isOpen={Boolean(habitacionAEliminar)}
                onClose={() => setHabitacionAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar habitación?"
                subtitle="Inventario de Habitaciones"
                message={
                    habitacionAEliminar ? (
                        <>
                            ¿Seguro que deseas eliminar la habitación <strong>#{habitacionAEliminar.numero}</strong> ({habitacionAEliminar.hotel?.nombre || 'Hotel'})?
                            Esta acción retirará la unidad permanentemente del inventario.
                        </>
                    ) : ''
                }
                confirmText="Eliminar habitación"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
