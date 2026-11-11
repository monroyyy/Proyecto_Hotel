import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Users, RefreshCw, Search, BedDouble } from 'lucide-react';
import { getTiposHabitacion, crearTipoHabitacion, actualizarTipoHabitacion, eliminarTipoHabitacion } from '../api/hotelApi';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import KpiCard from '../components/KpiCard';

export default function TiposHabitacionPage() {
    const [tipos, setTipos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [tipoAEditar, setTipoAEditar] = useState(null);
    const [tipoAEliminar, setTipoAEliminar] = useState(null);

    // Filtros
    const [filtroCapacidad, setFiltroCapacidad] = useState('TODOS'); // 'TODOS' | 'HASTA_2' | 'MAS_2'
    const [busqueda, setBusqueda] = useState('');

    const [formTipo, setFormTipo] = useState({
        nombre: '',
        capacidad: 2,
        descripcion: '',
        precioBase: 0
    });

    const cargarTipos = async () => {
        try {
            setCargando(true);
            setErrorMsg('');
            const data = await getTiposHabitacion();
            setTipos(data || []);
        } catch (err) {
            console.error('Error al cargar tipos:', err);
            setErrorMsg(err.message || 'No fue posible conectar con el servidor.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarTipos();
    }, []);

    const mostrarMensaje = (tipo, texto) => {
        setNotificacion({ tipo, texto });
        setTimeout(() => setNotificacion(null), 4000);
    };

    const handleAbrirNuevo = () => {
        setTipoAEditar(null);
        setFormTipo({
            nombre: '',
            capacidad: 2,
            descripcion: '',
            precioBase: 0
        });
        setModalAbierto(true);
    };

    const handleAbrirEditar = (tipo) => {
        setTipoAEditar(tipo);
        setFormTipo({
            nombre: tipo.nombre || '',
            capacidad: tipo.capacidad || 1,
            descripcion: tipo.descripcion || '',
            precioBase: tipo.precioBase || 0
        });
        setModalAbierto(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (formTipo.capacidad <= 0) {
            mostrarMensaje('error', 'La capacidad debe ser mayor a cero.');
            return;
        }
        if (formTipo.precioBase < 0) {
            mostrarMensaje('error', 'El precio base no puede ser negativo.');
            return;
        }

        try {
            if (tipoAEditar) {
                await actualizarTipoHabitacion(tipoAEditar.idTipo, formTipo);
                mostrarMensaje('exito', `Categoría "${formTipo.nombre}" actualizada exitosamente.`);
            } else {
                await crearTipoHabitacion(formTipo);
                mostrarMensaje('exito', `Categoría "${formTipo.nombre}" creada exitosamente.`);
            }
            setModalAbierto(false);
            setTipoAEditar(null);
            await cargarTipos();
        } catch (err) {
            mostrarMensaje('error', 'Error al guardar: ' + err.message);
        }
    };

    const handleEliminar = (id, nombre) => {
        setTipoAEliminar({ id, nombre });
    };

    const handleConfirmarEliminar = async () => {
        if (!tipoAEliminar) return;
        const { id, nombre } = tipoAEliminar;
        try {
            await eliminarTipoHabitacion(id);
            mostrarMensaje('exito', `Categoría "${nombre}" eliminada exitosamente.`);
            await cargarTipos();
        } catch (err) {
            mostrarMensaje('error', 'No se puede eliminar porque está asociada a habitaciones existentes.');
        } finally {
            setTipoAEliminar(null);
        }
    };

    // KPIs interactivos como filtro
    const kpis = useMemo(() => {
        const total = tipos.length;
        const hasta2 = tipos.filter(t => t.capacidad <= 2).length;
        const mas2 = tipos.filter(t => t.capacidad > 2).length;
        return { total, hasta2, mas2 };
    }, [tipos]);

    // Filtrado de tipos
    const tiposFiltrados = useMemo(() => {
        return tipos.filter(t => {
            const coincideCap = filtroCapacidad === 'TODOS' || 
                (filtroCapacidad === 'HASTA_2' && t.capacidad <= 2) || 
                (filtroCapacidad === 'MAS_2' && t.capacidad > 2);
            const q = busqueda.trim().toLowerCase();
            const coincideBusqueda = !q ||
                t.nombre?.toLowerCase().includes(q) ||
                t.descripcion?.toLowerCase().includes(q) ||
                String(t.capacidad).includes(q) ||
                String(t.precioBase).includes(q);
            return coincideCap && coincideBusqueda;
        });
    }, [tipos, filtroCapacidad, busqueda]);

    return (
        <div className="page-container">
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Categorías de Habitación</h1>
                    <p className="page-description">Catálogo de categorías, tarifas base por noche y capacidades de hospedaje.</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={cargarTipos} disabled={cargando} title="Actualizar datos">
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Actualizar</span>
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleAbrirNuevo}>
                        <Plus size={18} />
                        <span>Nueva Categoría</span>
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div><strong>Error de Comunicación:</strong> {errorMsg}</div>
                </div>
            )}

            {/* Tarjetas KPI como Filtro Único */}
            <div className="kpi-grid">
                <KpiCard
                    title="Total Categorías"
                    value={kpis.total}
                    icon={Tag}
                    colorClass="kpi-blue"
                    subtitle="Registradas en el catálogo"
                    isActive={filtroCapacidad === 'TODOS'}
                    onClick={() => setFiltroCapacidad('TODOS')}
                />
                <KpiCard
                    title="Individual / Pareja"
                    value={kpis.hasta2}
                    icon={Users}
                    colorClass="kpi-green"
                    subtitle="Capacidad 1 a 2 huéspedes"
                    isActive={filtroCapacidad === 'HASTA_2'}
                    onClick={() => setFiltroCapacidad('HASTA_2')}
                />
                <KpiCard
                    title="Familiar / Grupal"
                    value={kpis.mas2}
                    icon={BedDouble}
                    colorClass="kpi-amber"
                    subtitle="Capacidad 3 o más huéspedes"
                    isActive={filtroCapacidad === 'MAS_2'}
                    onClick={() => setFiltroCapacidad('MAS_2')}
                />
            </div>

            {/* Buscador y Contador */}
            <div className="filters-card">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px', maxWidth: '420px' }}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por categoría, descripción o precio..."
                            className="search-input"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="table-counter">
                        Mostrando <strong>{tiposFiltrados.length}</strong> de {tipos.length} categorías
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="table-card">
                {cargando && tipos.length === 0 ? (
                    <div className="loading-state"><div className="spinner"></div><p>Cargando categorías de habitación...</p></div>
                ) : tiposFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Tag size={48} className="empty-icon" />
                        <h3>No se encontraron categorías</h3>
                        <p>Ninguna categoría coincide con los filtros aplicados.</p>
                        <button type="button" className="btn btn-secondary" onClick={() => { setFiltroCapacidad('TODOS'); setBusqueda(''); }}>
                            Limpiar filtros
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '22%' }}>Categoría</th>
                                    <th style={{ width: '16%' }}>Capacidad</th>
                                    <th>Descripción</th>
                                    <th className="text-right" style={{ width: '18%', whiteSpace: 'nowrap' }}>Precio Base</th>
                                    <th className="text-right" style={{ width: '90px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tiposFiltrados.map((t) => (
                                    <tr key={t.idTipo} className="table-row">
                                        <td>
                                            <div className="room-number-pill">
                                                <Tag size={15} />
                                                <span className="number-text">{t.nombre}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="floor-badge num">
                                                <Users size={13} /> {t.capacidad} {t.capacidad === 1 ? 'persona' : 'personas'}
                                            </span>
                                        </td>
                                        <td style={{
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.8rem',
                                            maxWidth: '420px', color: '#475569', fontSize: '0.84rem'
                                        }} title={t.descripcion}>
                                            {t.descripcion || 'Sin descripción adicional'}
                                        </td>
                                        <td className="text-right">
                                            <div className="price-tag num">
                                                ${Number(t.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                                <span className="price-period">/noche</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="row-actions">
                                                <button
                                                    type="button"
                                                    className="btn-action btn-action-edit"
                                                    onClick={() => handleAbrirEditar(t)}
                                                    title="Editar categoría"
                                                    aria-label="Editar categoría"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action btn-action-delete"
                                                    onClick={() => handleEliminar(t.idTipo, t.nombre)}
                                                    title="Eliminar categoría"
                                                    aria-label="Eliminar categoría"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Crear / Editar Categoría */}
            <Modal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title={tipoAEditar ? `Editar Categoría: ${tipoAEditar.nombre}` : 'Nueva Categoría'}
                subtitle={tipoAEditar ? 'Modifica la capacidad, descripción y tarifa base' : 'Define una nueva categoría para el catálogo'}
                icon={Tag}
                maxWidth="510px"
            >
                <form onSubmit={handleGuardar} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Nombre de la categoría *</label>
                        <input
                            type="text"
                            required
                            value={formTipo.nombre}
                            onChange={e => setFormTipo({ ...formTipo, nombre: e.target.value })}
                            className="form-input"
                            placeholder="Ej. Suite Presidencial, Doble Estándar"
                        />
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Capacidad (huéspedes) *</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={formTipo.capacidad}
                                onChange={e => setFormTipo({ ...formTipo, capacidad: parseInt(e.target.value, 10) || 1 })}
                                className="form-input num"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Precio base ($ MXN) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={formTipo.precioBase}
                                onChange={e => setFormTipo({ ...formTipo, precioBase: parseFloat(e.target.value) || 0 })}
                                className="form-input num"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <textarea
                            rows="3"
                            value={formTipo.descripcion}
                            onChange={e => setFormTipo({ ...formTipo, descripcion: e.target.value })}
                            className="form-input"
                            placeholder="Breve descripción de amenidades y características..."
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-secondary">Cancelar</button>
                        <button type="submit" className="btn btn-primary">
                            {tipoAEditar ? 'Guardar Cambios' : 'Crear Categoría'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Diálogo de confirmación del sistema para eliminar categoría */}
            <ConfirmDialog
                isOpen={Boolean(tipoAEliminar)}
                onClose={() => setTipoAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar categoría?"
                subtitle="Catálogo de Categorías"
                message={
                    tipoAEliminar ? (
                        <>
                            ¿Está seguro de que desea eliminar la categoría <strong>"{tipoAEliminar.nombre}"</strong>?
                            Esta acción no se puede realizar si existen habitaciones asignadas a esta categoría.
                        </>
                    ) : ''
                }
                confirmText="Sí, eliminar categoría"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
