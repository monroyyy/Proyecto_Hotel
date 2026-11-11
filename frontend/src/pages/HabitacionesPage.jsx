import React, { useState, useEffect, useMemo } from 'react';
import {
    BedDouble,
    Plus,
    Search,
    Filter,
    RotateCcw,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Clock,
    Users,
    Building,
    MapPin,
    Layers,
    DollarSign,
    RefreshCw,
    Calendar,
    CalendarPlus,
    Eye,
    X,
    Sparkles
} from 'lucide-react';

import KpiCard from '../components/KpiCard';
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

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]} ${meses[parseInt(partes[1], 10) - 1] || partes[1]} ${partes[0]}`;
}

/**
 * HabitacionesPage.jsx
 * Interfaz de administración de Habitaciones.
 * Visualización clara, espaciosa, con modal detallado (botón "Ver"),
 * gestión de ocupación y extensión de +1 día extra en habitaciones ocupadas.
 */
export default function HabitacionesPage() {
    const { isGerente, isAdmin } = useAuth();
    const puedeGestionarCatalogo = isGerente || isAdmin;

    // Estados principales de datos
    const [habitaciones, setHabitaciones] = useState([]);
    const [hoteles, setHoteles] = useState([]);
    const [tiposHabitacion, setTiposHabitacion] = useState([]);
    const [resumen, setResumen] = useState({ total: 0, disponibles: 0, ocupadas: 0, mantenimiento: 0 });

    // Estados de carga y alertas
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [extendiendoHabId, setExtendiendoHabId] = useState(null);

    // Estados de filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroHotel, setFiltroHotel] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [filtroPiso, setFiltroPiso] = useState('');

    // Estado de modales
    const [modalAbierto, setModalAbierto] = useState(false);
    const [habitacionAEditar, setHabitacionAEditar] = useState(null);
    const [habitacionAEliminar, setHabitacionAEliminar] = useState(null);
    const [habitacionDetalle, setHabitacionDetalle] = useState(null);

    // Cargar datos desde el backend
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

            // Si hay un modal de detalle abierto, sincronizar sus datos
            if (habitacionDetalle && habsData) {
                const actualizada = habsData.find(h => h.idHabitacion === habitacionDetalle.idHabitacion);
                if (actualizada) {
                    setHabitacionDetalle(actualizada);
                }
            }
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setErrorMsg(err.message || 'No fue posible conectar con el servidor Spring Boot');
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

    // Notificación flotante
    const mostrarMensaje = (tipo, texto) => {
        setNotificacion({ tipo, texto });
        setTimeout(() => setNotificacion(null), 4500);
    };

    // Agregar +1 Día Extra a una habitación ya ocupada
    const handleAgregarDiaExtra = async (hab) => {
        if (!hab || extendiendoHabId) return;
        setExtendiendoHabId(hab.idHabitacion);
        try {
            const actualizada = await agregarDiaExtraHabitacion(hab.idHabitacion, 1);
            mostrarMensaje(
                'exito',
                `¡Día extra agregado a la Habitación #${actualizada.numero}! Nueva desocupación: ${formatearFechaCorta(actualizada.fechaOcupacionFin)} (12:00 hrs).`
            );
            await cargarDatos();
            // Mantener detalle actualizado
            setHabitacionDetalle(actualizada);
            window.dispatchEvent(new CustomEvent('hotel:refresh-notifications'));
        } catch (err) {
            mostrarMensaje('error', err.message || 'No se pudo agregar el día extra a la habitación.');
        } finally {
            setExtendiendoHabId(null);
        }
    };

    // Guardar (Crear o Actualizar)
    const handleGuardarHabitacion = async (datos) => {
        if (habitacionAEditar) {
            await actualizarHabitacion(habitacionAEditar.idHabitacion, datos);
            mostrarMensaje('exito', `Habitación #${datos.numero} actualizada con éxito.`);
        } else {
            await crearHabitacion(datos);
            mostrarMensaje('exito', `Habitación #${datos.numero} creada exitosamente.`);
        }
        await cargarDatos();
    };

    // Cambio rápido de estado
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

    // Eliminar con confirmación
    const handleEliminar = (habitacion) => {
        if (habitacion.estado === 'Ocupada') {
            mostrarMensaje('error', `No se puede eliminar la habitación #${habitacion.numero} porque actualmente está Ocupada.`);
            return;
        }
        setHabitacionAEliminar(habitacion);
    };

    const handleConfirmarEliminar = async () => {
        if (!habitacionAEliminar) return;
        const hab = habitacionAEliminar;
        try {
            await eliminarHabitacion(hab.idHabitacion);
            mostrarMensaje('exito', `Habitación #${hab.numero} eliminada exitosamente.`);
            await cargarDatos();
        } catch (err) {
            mostrarMensaje('error', 'No se pudo eliminar: ' + err.message);
        } finally {
            setHabitacionAEliminar(null);
        }
    };

    // Limpiar todos los filtros
    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroHotel('');
        setFiltroTipo('');
        setFiltroEstado('TODOS');
        setFiltroPiso('');
    };

    // Filtrado reactivo en el cliente
    const habitacionesFiltradas = useMemo(() => {
        return habitaciones.filter((h) => {
            if (h.hotel && h.hotel.activo === false) {
                return false;
            }

            if (busqueda.trim()) {
                const term = busqueda.toLowerCase().trim();
                const coincideNumero = h.numero?.toLowerCase().includes(term);
                const coincideHotel = h.hotel?.nombre?.toLowerCase().includes(term);
                const coincideTipo = h.tipoHabitacion?.nombre?.toLowerCase().includes(term);
                if (!coincideNumero && !coincideHotel && !coincideTipo) return false;
            }

            if (filtroHotel && h.hotel?.idHotel !== parseInt(filtroHotel, 10)) {
                return false;
            }

            if (filtroTipo && h.tipoHabitacion?.idTipo !== parseInt(filtroTipo, 10)) {
                return false;
            }

            if (filtroEstado !== 'TODOS' && h.estado?.toLowerCase() !== filtroEstado.toLowerCase()) {
                return false;
            }

            if (filtroPiso && h.piso !== parseInt(filtroPiso, 10)) {
                return false;
            }

            return true;
        });
    }, [habitaciones, busqueda, filtroHotel, filtroTipo, filtroEstado, filtroPiso]);

    // Obtener lista única de pisos
    const pisosDisponibles = useMemo(() => {
        const habsValidas = habitaciones.filter(h => !h.hotel || h.hotel.activo !== false);
        const setPisos = new Set(habsValidas.map(h => h.piso).filter(Boolean));
        if (setPisos.size === 0) return [1, 2, 3];
        return Array.from(setPisos).sort((a, b) => a - b);
    }, [habitaciones]);

    return (
        <div className="page-container">
            {/* Notificación Flotante */}
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    {notificacion.tipo === 'info' && <Clock size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* Cabecera Principal */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestión de Habitaciones</h1>
                    <p className="page-description">
                        Supervisa el estado del inventario de suites, niveles, ocupación y disponibilidad en tiempo real.
                    </p>
                </div>
                <div className="page-header-actions">
                    <button
                        className="btn btn-secondary btn-icon"
                        onClick={cargarDatos}
                        title="Actualizar datos"
                        disabled={cargando}
                    >
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Actualizar</span>
                    </button>
                    {puedeGestionarCatalogo && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setHabitacionAEditar(null);
                                setModalAbierto(true);
                            }}
                        >
                            <Plus size={18} />
                            <span>Nueva Habitación</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Banner de error si ocurre */}
            {errorMsg && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Error de Comunicación:</strong> {errorMsg}
                    </div>
                </div>
            )}

            {/* Tarjetas KPI de Resumen (4 estados operativos claros) */}
            <div className="kpi-grid">
                <KpiCard
                    title="Total Habitaciones"
                    value={resumen.total}
                    icon={BedDouble}
                    colorClass="kpi-blue"
                    subtitle="Registradas en la cadena"
                    isActive={filtroEstado === 'TODOS'}
                    onClick={() => setFiltroEstado('TODOS')}
                />
                <KpiCard
                    title="Disponibles"
                    value={resumen.disponibles}
                    icon={CheckCircle2}
                    colorClass="kpi-green"
                    subtitle="Listas para hospedar"
                    isActive={filtroEstado === 'Disponible'}
                    onClick={() => setFiltroEstado('Disponible')}
                />
                <KpiCard
                    title="Ocupadas"
                    value={resumen.ocupadas}
                    icon={Clock}
                    colorClass="kpi-amber"
                    subtitle="Con estancia activa hoy"
                    isActive={filtroEstado === 'Ocupada'}
                    onClick={() => setFiltroEstado('Ocupada')}
                />
                <KpiCard
                    title="En Mantenimiento"
                    value={resumen.mantenimiento}
                    icon={AlertCircle}
                    colorClass="kpi-red"
                    subtitle="Fuera de servicio"
                    isActive={filtroEstado === 'Mantenimiento'}
                    onClick={() => setFiltroEstado('Mantenimiento')}
                />
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="filters-card">
                <div className="filters-header">
                    <div className="filters-header-title">
                        <Filter size={18} />
                        <span>Filtros y Búsqueda Avanzada</span>
                    </div>
                    {(busqueda || filtroHotel || filtroTipo || filtroEstado !== 'TODOS' || filtroPiso) && (
                        <button className="btn-link" onClick={limpiarFiltros}>
                            <RotateCcw size={14} /> Limpiar filtros
                        </button>
                    )}
                </div>

                <div className="filters-grid">
                    {/* Búsqueda de texto */}
                    <div className="filter-item search-item">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Buscar por número (#101), hotel o categoría..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filtro por Hotel */}
                    <div className="filter-item">
                        <select
                            className="form-select filter-select"
                            value={filtroHotel}
                            onChange={(e) => setFiltroHotel(e.target.value)}
                        >
                            <option value="">Todos los Hoteles</option>
                            {hoteles.filter(h => h.activo).map((h) => (
                                <option key={h.idHotel} value={h.idHotel}>
                                    {h.nombre} ({h.ciudad})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por Categoría */}
                    <div className="filter-item">
                        <select
                            className="form-select filter-select"
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                        >
                            <option value="">Todas las Categorías</option>
                            {tiposHabitacion.map((t) => (
                                <option key={t.idTipo} value={t.idTipo}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por Piso */}
                    <div className="filter-item">
                        <select
                            className="form-select filter-select"
                            value={filtroPiso}
                            onChange={(e) => setFiltroPiso(e.target.value)}
                        >
                            <option value="">Todos los Pisos</option>
                            {pisosDisponibles.map((p) => (
                                <option key={p} value={p}>
                                    Piso {p}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados Operativa y Espaciosa */}
            <div className="table-card">
                <div className="table-header-info">
                    <div className="table-counter">
                        Mostrando <strong>{habitacionesFiltradas.length}</strong> de {habitaciones.length} habitaciones
                    </div>
                </div>

                {cargando ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando habitaciones...</p>
                    </div>
                ) : habitacionesFiltradas.length === 0 ? (
                    <div className="empty-state">
                        <BedDouble size={48} className="empty-icon" />
                        <h3>No se encontraron habitaciones</h3>
                        <p>Ninguna habitación coincide con los filtros aplicados. Intenta restablecer los filtros.</p>
                        <button className="btn btn-secondary" onClick={limpiarFiltros}>
                            Restablecer Filtros
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '130px' }}>Habitación</th>
                                    <th>Hotel & Ubicación</th>
                                    <th>Categoría</th>
                                    <th>Piso</th>
                                    <th>Precio / Noche</th>
                                    <th>Estado</th>
                                    <th>Ocupación</th>
                                    <th className="text-right" style={{ width: '140px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {habitacionesFiltradas.map((hab) => {
                                    const tipo = hab.tipoHabitacion;
                                    const hotel = hab.hotel;
                                    const esOcupada = (hab.estado || '').toLowerCase() === 'ocupada';

                                    return (
                                        <tr key={hab.idHabitacion} className="table-row">
                                            {/* Número de Habitación */}
                                            <td>
                                                <div className="room-number-pill">
                                                    <BedDouble size={16} />
                                                    <span className="number-text">#{hab.numero}</span>
                                                </div>
                                            </td>

                                            {/* Hotel */}
                                            <td>
                                                <div className="hotel-cell">
                                                    <div className="hotel-name">{hotel?.nombre || 'Sin Asignar'}</div>
                                                    <div className="hotel-city">
                                                        <MapPin size={12} /> {hotel?.ciudad || 'N/A'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tipo de Habitación */}
                                            <td>
                                                <div className="type-cell">
                                                    <div className="type-name">{tipo?.nombre || 'Estándar'}</div>
                                                    <div className="type-capacity">
                                                        <Users size={12} /> {tipo?.capacidad || 2} huéspedes
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Piso */}
                                            <td>
                                                <span className="floor-badge">
                                                    <Layers size={13} /> Nivel {hab.piso}
                                                </span>
                                            </td>

                                            {/* Precio Base */}
                                            <td>
                                                <div className="price-tag num">
                                                    ${Number(tipo?.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                                    <span className="price-period">/noche</span>
                                                </div>
                                            </td>

                                            {/* Estado & Selector Rápido */}
                                            <td>
                                                <div className="status-dropdown-wrapper">
                                                    <select
                                                        className={`status-select status-${hab.estado?.toLowerCase()}`}
                                                        value={hab.estado}
                                                        onChange={(e) => handleCambiarEstado(hab.idHabitacion, hab.estado, e.target.value)}
                                                        title="Clic para cambiar estado de la habitación"
                                                    >
                                                        <option value="Disponible">Disponible</option>
                                                        <option value="Ocupada">Ocupada</option>
                                                        <option value="Mantenimiento">Mantenimiento</option>
                                                    </select>
                                                </div>
                                            </td>

                                            {/* Ocupación resumida y limpia */}
                                            <td>
                                                {esOcupada && hab.fechaOcupacionFin ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={13} />
                                                            Desocupa: {formatearFechaCorta(hab.fechaOcupacionFin)}
                                                        </span>
                                                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                            Check-out a las 12:00 hrs
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#059669', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                                                        <CheckCircle2 size={14} />
                                                        Libre
                                                    </span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="text-right">
                                                <div className="row-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-action btn-action-view"
                                                        title="Ver a detalle y gestionar habitación"
                                                        onClick={() => setHabitacionDetalle(hab)}
                                                        aria-label="Ver detalle"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {puedeGestionarCatalogo && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn-action btn-action-edit"
                                                                title="Editar habitación"
                                                                onClick={() => {
                                                                    setHabitacionAEditar(hab);
                                                                    setModalAbierto(true);
                                                                }}
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-action btn-action-delete"
                                                                title={hab.estado === 'Ocupada' ? 'No se puede eliminar una habitación ocupada' : 'Eliminar habitación'}
                                                                onClick={() => handleEliminar(hab)}
                                                                disabled={hab.estado === 'Ocupada'}
                                                                style={hab.estado === 'Ocupada' ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Detalle de Habitación ("Ver") */}
            {habitacionDetalle && (
                <Modal
                    isOpen={Boolean(habitacionDetalle)}
                    onClose={() => setHabitacionDetalle(null)}
                    title={`Habitación #${habitacionDetalle.numero} — Detalle Operativo`}
                    subtitle={`${habitacionDetalle.hotel?.nombre || 'Hotel'} · Nivel ${habitacionDetalle.piso}`}
                    icon={BedDouble}
                    maxWidth="620px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Ficha técnica en tarjetas */}
                        <div className="hab-detail-grid">
                            <div className="hab-detail-card">
                                <span className="hab-detail-label">Hotel & Sede</span>
                                <span className="hab-detail-val">{habitacionDetalle.hotel?.nombre || 'No asignado'}</span>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{habitacionDetalle.hotel?.ciudad || ''}</span>
                            </div>
                            <div className="hab-detail-card">
                                <span className="hab-detail-label">Categoría</span>
                                <span className="hab-detail-val">{habitacionDetalle.tipoHabitacion?.nombre || 'Estándar'}</span>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                    Capacidad: hasta {habitacionDetalle.tipoHabitacion?.capacidad || 2} personas
                                </span>
                            </div>
                            <div className="hab-detail-card">
                                <span className="hab-detail-label">Nivel / Piso</span>
                                <span className="hab-detail-val">Piso {habitacionDetalle.piso}</span>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Puerta #{habitacionDetalle.numero}</span>
                            </div>
                            <div className="hab-detail-card">
                                <span className="hab-detail-label">Tarifa por Noche</span>
                                <span className="hab-detail-val num" style={{ color: 'var(--brand-terracotta, #b45309)' }}>
                                    ${Number(habitacionDetalle.tipoHabitacion?.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                </span>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Precio estándar</span>
                            </div>
                        </div>

                        {/* Bloque de Ocupación y Extensión de Día Extra */}
                        {habitacionDetalle.estado === 'Ocupada' && habitacionDetalle.fechaOcupacionFin ? (
                            <div className="hab-occupancy-box">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontWeight: 700, fontSize: '0.92rem' }}>
                                        <Clock size={18} />
                                        <span>Estancia en Curso</span>
                                    </div>
                                    <span style={{ fontSize: '0.76rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                                        Check-out a las 12:00 hrs
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                                    <div>
                                        Ocupada del <strong>{formatearFechaCorta(habitacionDetalle.fechaOcupacionInicio)}</strong> al <strong>{formatearFechaCorta(habitacionDetalle.fechaOcupacionFin)}</strong>
                                    </div>
                                    <div style={{ color: '#047857', fontWeight: 700, marginTop: 2 }}>
                                        Fecha de desocupación: {formatearFechaCorta(habitacionDetalle.fechaOcupacionFin)} (12:00 hrs)
                                    </div>
                                </div>

                                {/* Botón de Día Extra dentro del detalle de la habitación ocupada */}
                                <div style={{ paddingTop: 8, borderTop: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>
                                            ¿Desea extender la estancia?
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {habitacionDetalle.diaExtraDisponible
                                                ? `Siguiente fecha libre: ${formatearFechaCorta(habitacionDetalle.nuevaFechaDesocupacion)} (12:00 hrs)`
                                                : 'El día siguiente ya está reservado por otra estancia en esta habitación.'}
                                        </div>
                                    </div>

                                    {habitacionDetalle.diaExtraDisponible ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => handleAgregarDiaExtra(habitacionDetalle)}
                                            disabled={extendiendoHabId === habitacionDetalle.idHabitacion}
                                            style={{
                                                background: '#059669',
                                                borderColor: '#047857',
                                                padding: '8px 16px',
                                                fontSize: '0.84rem',
                                                fontWeight: 700
                                            }}
                                        >
                                            <CalendarPlus size={16} />
                                            <span>
                                                {extendiendoHabId === habitacionDetalle.idHabitacion
                                                    ? 'Agregando día extra...'
                                                    : `+1 Día extra (+$${Number(habitacionDetalle.costoDiaExtra || habitacionDetalle.tipoHabitacion?.precioBase || 0).toLocaleString('es-MX')})`}
                                            </span>
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '4px 8px', borderRadius: 6 }}>
                                            Día siguiente no disponible
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="hab-occupancy-free">
                                <CheckCircle2 size={20} />
                                <div>
                                    <div style={{ fontSize: '0.88rem' }}>Habitación disponible sin huéspedes hospedados</div>
                                    <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 400 }}>
                                        Puede ser reservada libremente para cualquier fecha no reservada.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Próximas reservaciones programadas para esta habitación */}
                        {Array.isArray(habitacionDetalle.periodosOcupados) && habitacionDetalle.periodosOcupados.length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Calendario de reservaciones programadas ({habitacionDetalle.periodosOcupados.length})
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
                                                borderRadius: 6,
                                                border: '1px solid #e2e8f0',
                                                fontSize: '0.78rem'
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                {formatearFechaCorta(p.fechaEntrada)} → {formatearFechaCorta(p.fechaSalida)}
                                            </span>
                                            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                                Check-out 12:00 hrs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Botón cerrar */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setHabitacionDetalle(null)}
                            >
                                Cerrar detalle
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal para Crear/Editar Habitación */}
            <HabitacionModal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                onSave={handleGuardarHabitacion}
                habitacionParaEditar={habitacionAEditar}
                hoteles={hoteles.filter(h => h.activo)}
                tiposHabitacion={tiposHabitacion}
                pisosDisponibles={pisosDisponibles}
            />

            {/* Diálogo de confirmación del sistema para eliminar habitación */}
            <ConfirmDialog
                isOpen={Boolean(habitacionAEliminar)}
                onClose={() => setHabitacionAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar habitación?"
                subtitle="Inventario de Habitaciones"
                message={
                    habitacionAEliminar ? (
                        <>
                            ¿Está seguro de que desea eliminar la habitación <strong>#{habitacionAEliminar.numero}</strong> ({habitacionAEliminar.hotel?.nombre || 'Hotel'})?
                            Esta acción no se puede deshacer y retirará el cuarto permanentemente del inventario.
                        </>
                    ) : ''
                }
                confirmText="Sí, eliminar habitación"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
