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
    Hourglass
} from 'lucide-react';

import KpiCard from '../components/KpiCard';
import HabitacionModal from '../components/HabitacionModal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
    getHabitaciones,
    getHoteles,
    getTiposHabitacion,
    getResumenHabitaciones,
    crearHabitacion,
    actualizarHabitacion,
    cambiarEstadoHabitacion,
    eliminarHabitacion
} from '../api/hotelApi';

/**
 * HabitacionesPage.jsx
 * Interfaz principal para la administración de Habitaciones (La más compleja del sistema).
 * Incluye: KPIs interactivos, filtros combinados, CRUD completo, y cambio rápido de estados.
 */
export default function HabitacionesPage() {
    // Estados principales de datos
    const [habitaciones, setHabitaciones] = useState([]);
    const [hoteles, setHoteles] = useState([]);
    const [tiposHabitacion, setTiposHabitacion] = useState([]);
    const [resumen, setResumen] = useState({ total: 0, disponibles: 0, pendientes: 0, ocupadas: 0, mantenimiento: 0 });

    // Estados de carga y alertas
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);

    // Estados de filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroHotel, setFiltroHotel] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [filtroPiso, setFiltroPiso] = useState('');

    // Estado del modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [habitacionAEditar, setHabitacionAEditar] = useState(null);
    const [habitacionAEliminar, setHabitacionAEliminar] = useState(null);

    // Cargar datos iniciales desde el backend de Spring Boot
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
                setResumen(resumenData);
            } else if (habsData) {
                // Cálculo de respaldo si el endpoint de resumen no estuviera disponible
                setResumen({
                    total: habsData.length,
                    disponibles: habsData.filter(h => h.estado === 'Disponible').length,
                    pendientes: habsData.filter(h => h.estado === 'Pendiente').length,
                    ocupadas: habsData.filter(h => h.estado === 'Ocupada').length,
                    mantenimiento: habsData.filter(h => h.estado === 'Mantenimiento').length
                });
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
    }, []);

    // Notificación flotante temporal
    const mostrarMensaje = (tipo, texto) => {
        setNotificacion({ tipo, texto });
        setTimeout(() => setNotificacion(null), 4000);
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

    // Cambio rápido de estado desde la tabla
    const handleCambiarEstado = async (id, estadoActual, nuevoEstado) => {
        if (estadoActual === nuevoEstado) return;
        try {
            await cambiarEstadoHabitacion(id, nuevoEstado);
            mostrarMensaje('info', `Estado actualizado a "${nuevoEstado}".`);
            await cargarDatos();
        } catch (err) {
            mostrarMensaje('error', 'Error al cambiar estado: ' + err.message);
        }
    };

    // Eliminar con confirmación
    const handleEliminar = (habitacion) => {
        // Regla de negocio: No se puede eliminar habitaciones ocupadas
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

    // Filtrado reactivo en el cliente para máxima velocidad de respuesta
    const habitacionesFiltradas = useMemo(() => {
        return habitaciones.filter((h) => {
            // Regla de negocio: Si el hotel está inactivo, ocultar sus habitaciones
            if (h.hotel && h.hotel.activo === false) {
                return false;
            }

            // Filtro por búsqueda (número o nombre de hotel)
            if (busqueda.trim()) {
                const term = busqueda.toLowerCase().trim();
                const coincideNumero = h.numero?.toLowerCase().includes(term);
                const coincideHotel = h.hotel?.nombre?.toLowerCase().includes(term);
                const coincideTipo = h.tipoHabitacion?.nombre?.toLowerCase().includes(term);
                if (!coincideNumero && !coincideHotel && !coincideTipo) return false;
            }

            // Filtro por Hotel
            if (filtroHotel && h.hotel?.idHotel !== parseInt(filtroHotel, 10)) {
                return false;
            }

            // Filtro por Tipo de Habitación
            if (filtroTipo && h.tipoHabitacion?.idTipo !== parseInt(filtroTipo, 10)) {
                return false;
            }

            // Filtro por Estado
            if (filtroEstado !== 'TODOS' && h.estado?.toLowerCase() !== filtroEstado.toLowerCase()) {
                return false;
            }

            // Filtro por Piso
            if (filtroPiso && h.piso !== parseInt(filtroPiso, 10)) {
                return false;
            }

            return true;
        });
    }, [habitaciones, busqueda, filtroHotel, filtroTipo, filtroEstado, filtroPiso]);

    // Obtener lista única de pisos existentes para el filtro y el formulario
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
                </div>
                <div className="page-header-actions">
                    <button
                        className="btn btn-secondary btn-icon"
                        onClick={cargarDatos}
                        title="Actualizar datos"
                        disabled={cargando}
                    >
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Refrescar</span>
                    </button>
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
                </div>
            </div>

            {/* Banner de error de conexión si ocurre */}
            {errorMsg && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Error de Comunicación:</strong> {errorMsg}
                    </div>
                </div>
            )}

            {/* Tarjetas KPI de Resumen Estadístico */}
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
                    subtitle="Listas para reservar"
                    isActive={filtroEstado === 'Disponible'}
                    onClick={() => setFiltroEstado('Disponible')}
                />
                <KpiCard
                    title="Pendientes"
                    value={resumen.pendientes || 0}
                    icon={Hourglass}
                    colorClass="kpi-amber"
                    subtitle="Pre-reservas temporales"
                    isActive={filtroEstado === 'Pendiente'}
                    onClick={() => setFiltroEstado('Pendiente')}
                />
                <KpiCard
                    title="Ocupadas"
                    value={resumen.ocupadas}
                    icon={Clock}
                    colorClass="kpi-amber"
                    subtitle="Con huéspedes activos"
                    isActive={filtroEstado === 'Ocupada'}
                    onClick={() => setFiltroEstado('Ocupada')}
                />
                <KpiCard
                    title="En Mantenimiento"
                    value={resumen.mantenimiento}
                    icon={AlertCircle}
                    colorClass="kpi-red"
                    subtitle="En limpieza o servicio"
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
                    {/* Búsqueda en texto */}
                    <div className="filter-item search-item">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Buscar por número (#101), hotel o tipo..."
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

                    {/* Filtro por Tipo */}
                    <div className="filter-item">
                        <select
                            className="form-select filter-select"
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                        >
                            <option value="">Todos los Tipos</option>
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

                {/* Chips de estado rápido */}
                <div className="status-chips-bar">
                    <span className="chips-label">Estado:</span>
                    {['TODOS', 'Disponible', 'Pendiente', 'Ocupada', 'Mantenimiento'].map((est) => (
                        <button
                            key={est}
                            className={`status-chip-btn ${filtroEstado === est ? 'active' : ''}`}
                            onClick={() => setFiltroEstado(est)}
                        >
                            {est === 'TODOS' ? 'Todas' : est}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla de Resultados */}
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
                                    <th>Habitación</th>
                                    <th>Hotel & Sede</th>
                                    <th>Tipo & Capacidad</th>
                                    <th>Piso</th>
                                    <th>Precio / Noche</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {habitacionesFiltradas.map((hab) => {
                                    const tipo = hab.tipoHabitacion;
                                    const hotel = hab.hotel;

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
                                                        <Users size={12} /> Capacidad: {tipo?.capacidad || 2} personas
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
                                                <div className="price-tag">
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
                                                        title="Clic para cambiar estado inmediatamente"
                                                    >
                                                        <option value="Disponible">Disponible</option>
                                                        <option value="Pendiente">Pendiente</option>
                                                        <option value="Ocupada">Ocupada</option>
                                                        <option value="Mantenimiento">Mantenimiento</option>
                                                    </select>
                                                </div>
                                            </td>

                                            {/* Acciones */}
                                            <td className="text-right">
                                                <div className="row-actions">
                                                    <button
                                                        className="btn-action btn-action-edit"
                                                        title="Editar habitación"
                                                        onClick={() => {
                                                            setHabitacionAEditar(hab);
                                                            setModalAbierto(true);
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-action btn-action-delete"
                                                        title={hab.estado === 'Ocupada' ? 'No se puede eliminar una habitación ocupada' : 'Eliminar habitación'}
                                                        onClick={() => handleEliminar(hab)}
                                                        style={hab.estado === 'Ocupada' ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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
