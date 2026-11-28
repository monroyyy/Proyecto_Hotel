import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Tag, Plus, Trash2, Edit2, CheckCircle2, AlertCircle,
    Users, RefreshCw, Search, BedDouble, MoreHorizontal, ArrowUpDown
} from 'lucide-react';
import {
    getTiposHabitacion,
    getHabitaciones,
    crearTipoHabitacion,
    actualizarTipoHabitacion,
    eliminarTipoHabitacion
} from '../api/hotelApi';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import './TiposHabitacionPage.css';

function formatoMoneda(valor) {
    return `$${Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TiposHabitacionPage() {
    const { user, navigate } = useAuth();

    const [tipos, setTipos] = useState([]);
    const [habitaciones, setHabitaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [tipoAEditar, setTipoAEditar] = useState(null);
    const [tipoAEliminar, setTipoAEliminar] = useState(null);
    const [menuAbiertoId, setMenuAbiertoId] = useState(null);
    const menuWrapRef = useRef(null);

    // Filtros y ordenamiento
    const [filtroCapacidad, setFiltroCapacidad] = useState('TODOS'); // 'TODOS' | 'HASTA_2' | 'MAS_2'
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ campo: 'nombre', dir: 'asc' });

    const [formTipo, setFormTipo] = useState({
        nombre: '',
        capacidad: 2,
        descripcion: '',
        precioBase: 0,
        imagenUrl: ''
    });

    useEffect(() => {
        const handleOutside = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
                setMenuAbiertoId(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const cargarTipos = async () => {
        try {
            setCargando(true);
            setErrorMsg('');
            const [tiposData, habsData] = await Promise.all([
                getTiposHabitacion(),
                getHabitaciones().catch(() => [])
            ]);
            setTipos(tiposData || []);
            setHabitaciones(Array.isArray(habsData) ? habsData : []);
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

    const conteoPorTipo = useMemo(() => {
        const mapa = {};
        habitaciones.forEach(h => {
            if (h.hotel && h.hotel.activo === false) return;
            const id = h.tipoHabitacion?.idTipo;
            if (!id) return;
            mapa[id] = (mapa[id] || 0) + 1;
        });
        return mapa;
    }, [habitaciones]);

    const toggleOrden = (campo) => {
        setOrden(prev =>
            prev.campo === campo
                ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { campo, dir: campo === 'precioBase' || campo === 'inventario' ? 'desc' : 'asc' }
        );
    };

    const handleAbrirNuevo = () => {
        setTipoAEditar(null);
        setFormTipo({
            nombre: '',
            capacidad: 2,
            descripcion: '',
            precioBase: 0,
            imagenUrl: ''
        });
        setModalAbierto(true);
    };

    const handleAbrirEditar = (tipo) => {
        setTipoAEditar(tipo);
        setFormTipo({
            nombre: tipo.nombre || '',
            capacidad: tipo.capacidad || 1,
            descripcion: tipo.descripcion || '',
            precioBase: tipo.precioBase || 0,
            imagenUrl: tipo.imagenUrl || ''
        });
        setModalAbierto(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (formTipo.capacidad <= 0) {
            mostrarMensaje('error', 'La capacidad debe ser mayor a cero.');
            return;
        }
        // Impedir tarifa base menor o igual a $0.00 desde el cliente
        if (!formTipo.precioBase || Number(formTipo.precioBase) <= 0) {
            mostrarMensaje('error', 'La tarifa base debe ser mayor a $0.00.');
            return;
        }

        try {
            const payload = {
                ...formTipo,
                precioBase: formTipo.precioBase
            };
            if (tipoAEditar) {
                await actualizarTipoHabitacion(tipoAEditar.idTipo, payload);
                mostrarMensaje('exito', `Categoría "${payload.nombre}" actualizada.`);
            } else {
                await crearTipoHabitacion(payload);
                mostrarMensaje('exito', `Categoría "${payload.nombre}" creada.`);
            }
            setModalAbierto(false);
            setTipoAEditar(null);
            await cargarTipos();
        } catch (err) {
            mostrarMensaje('error', 'Error al guardar: ' + err.message);
        }
    };

    const handleConfirmarEliminar = async () => {
        if (!tipoAEliminar) return;
        const { id, nombre } = tipoAEliminar;
        try {
            await eliminarTipoHabitacion(id);
            mostrarMensaje('exito', `Categoría "${nombre}" eliminada.`);
            await cargarTipos();
        } catch (err) {
            mostrarMensaje('error', 'No se puede eliminar porque está asignada a habitaciones existentes.');
        } finally {
            setTipoAEliminar(null);
        }
    };

    const irAHabitacionesDeTipo = (idTipo) => {
        sessionStorage.setItem('hotel_filtro_tipo', String(idTipo));
        navigate('/habitaciones');
    };

    const kpis = useMemo(() => {
        const total = tipos.length;
        const hasta2 = tipos.filter(t => t.capacidad <= 2).length;
        const mas2 = tipos.filter(t => t.capacidad > 2).length;
        return { total, hasta2, mas2 };
    }, [tipos]);

    const tiposFiltrados = useMemo(() => {
        const filtrados = tipos.filter(t => {
            const coincideCap =
                filtroCapacidad === 'TODOS' ||
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

        const mult = orden.dir === 'asc' ? 1 : -1;
        return [...filtrados].sort((a, b) => {
            if (orden.campo === 'capacidad') {
                return (Number(a.capacidad || 0) - Number(b.capacidad || 0)) * mult;
            }
            if (orden.campo === 'precioBase') {
                return (Number(a.precioBase || 0) - Number(b.precioBase || 0)) * mult;
            }
            if (orden.campo === 'inventario') {
                return ((conteoPorTipo[a.idTipo] || 0) - (conteoPorTipo[b.idTipo] || 0)) * mult;
            }
            return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es') * mult;
        });
    }, [tipos, filtroCapacidad, busqueda, orden, conteoPorTipo]);

    const hayFiltros = Boolean(filtroCapacidad !== 'TODOS' || busqueda.trim());

    const limpiarFiltros = () => {
        setFiltroCapacidad('TODOS');
        setBusqueda('');
    };

    return (
        <div className="cat-view">
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* CABECERA EDITORIAL */}
            <header className="cat-header cat-anim-up">
                <div>
                    <div className="cat-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Catálogo Hotelero</span>
                        <span className="cat-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="cat-title">Categorías</h1>
                </div>

                <button type="button" className="cat-cta-btn" onClick={handleAbrirNuevo}>
                    <Plus size={16} />
                    <span>Nueva categoría</span>
                </button>
            </header>

            {errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span><strong>Error:</strong> {errorMsg}</span>
                </div>
            )}

            {/* 3 KPIs COMPACTOS CLICABLES */}
            <section className="cat-kpi-grid cat-anim-up cat-delay-1" aria-label="Resumen de categorías">
                <button
                    type="button"
                    className={`cat-kpi-card ${filtroCapacidad === 'TODOS' ? 'is-active' : ''}`}
                    onClick={() => setFiltroCapacidad('TODOS')}
                >
                    <div className="cat-kpi-label">Total Categorías</div>
                    <div className="cat-kpi-val">{kpis.total}</div>
                    <div className="cat-kpi-sub">En el catálogo</div>
                </button>

                <button
                    type="button"
                    className={`cat-kpi-card is-palm ${filtroCapacidad === 'HASTA_2' ? 'is-active' : ''}`}
                    onClick={() => setFiltroCapacidad('HASTA_2')}
                >
                    <div className="cat-kpi-label">Individual / Pareja</div>
                    <div className="cat-kpi-val">{kpis.hasta2}</div>
                    <div className="cat-kpi-sub">1 a 2 huéspedes</div>
                </button>

                <button
                    type="button"
                    className={`cat-kpi-card is-terra ${filtroCapacidad === 'MAS_2' ? 'is-active' : ''}`}
                    onClick={() => setFiltroCapacidad('MAS_2')}
                >
                    <div className="cat-kpi-label">Familiar / Grupal</div>
                    <div className="cat-kpi-val">{kpis.mas2}</div>
                    <div className="cat-kpi-sub">3 o más huéspedes</div>
                </button>
            </section>

            {/* BARRA UNIFICADA DE FILTROS */}
            <div className="cat-filter-bar cat-anim-up cat-delay-1">
                <div className="cat-filter-left">
                    <div className="cat-search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            className="cat-search-input"
                            placeholder="Buscar categoría, descripción o tarifa..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            aria-label="Buscar categorías"
                        />
                    </div>

                    {hayFiltros && (
                        <button type="button" className="cat-clear-btn" onClick={limpiarFiltros}>
                            Limpiar
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="cat-icon-btn"
                    onClick={cargarTipos}
                    disabled={cargando}
                    title="Actualizar catálogo"
                    aria-label="Actualizar catálogo"
                >
                    <RefreshCw size={14} className={cargando ? 'cat-spin' : ''} />
                </button>
            </div>

            {/* TABLA EDITORIAL LIMPIA */}
            <div className="cat-table-card cat-anim-up cat-delay-2" ref={menuWrapRef}>
                {cargando && tipos.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando categorías...</p>
                    </div>
                ) : tiposFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Tag size={40} className="empty-icon" />
                        <h3>No se encontraron categorías</h3>
                        <p>Ninguna categoría coincide con los filtros actuales.</p>
                        {hayFiltros && (
                            <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <table className="cat-table">
                            <thead>
                                <tr>
                                    <th>
                                        <button
                                            type="button"
                                            className={`cat-sort-btn ${orden.campo === 'nombre' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('nombre')}
                                        >
                                            <span>Categoría</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>
                                        <button
                                            type="button"
                                            className={`cat-sort-btn ${orden.campo === 'capacidad' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('capacidad')}
                                        >
                                            <span>Capacidad</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>Descripción</th>
                                    <th className="num">
                                        <button
                                            type="button"
                                            className={`cat-sort-btn ${orden.campo === 'inventario' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('inventario')}
                                        >
                                            <span>Habitaciones</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                        <th className="num">
                                            <button
                                                type="button"
                                                className={`cat-sort-btn ${orden.campo === 'precioBase' ? 'is-sorted' : ''}`}
                                                onClick={() => toggleOrden('precioBase')}
                                            >
                                                <span>Tarifa / Noche</span>
                                                <ArrowUpDown size={11} />
                                            </button>
                                        </th>
                                    <th className="num">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tiposFiltrados.map((t) => {
                                    const cuartos = conteoPorTipo[t.idTipo] || 0;
                                    const menuAbierto = menuAbiertoId === t.idTipo;
                                    const tieneDesc = Boolean(t.descripcion && t.descripcion.trim());
                                    return (
                                        <tr key={t.idTipo}>
                                            <td className="cat-cell-main">{t.nombre}</td>

                                            <td>
                                                <span className="cat-cap-badge num">
                                                    <Users size={12} />
                                                    <span>{t.capacidad} {t.capacidad === 1 ? 'huésped' : 'huéspedes'}</span>
                                                </span>
                                            </td>

                                            <td className={`cat-desc ${!tieneDesc ? 'is-empty' : ''}`}>
                                                {tieneDesc ? t.descripcion : '—'}
                                            </td>

                                            <td className="num">
                                                <button
                                                    type="button"
                                                    className="cat-inv-link"
                                                    onClick={() => irAHabitacionesDeTipo(t.idTipo)}
                                                    title="Ver habitaciones de esta categoría"
                                                >
                                                    {cuartos} {cuartos === 1 ? 'cuarto' : 'cuartos'}
                                                </button>
                                            </td>

                                                <td className="num" style={{ fontWeight: 700, color: 'var(--brand-ocean, #16324f)' }}>
                                                    {formatoMoneda(t.precioBase)}
                                                </td>

                                            <td className="num">
                                                <div className="cat-action-cell">
                                                    <button
                                                        type="button"
                                                        className="cat-edit-btn"
                                                        onClick={() => handleAbrirEditar(t)}
                                                    >
                                                        <Edit2 size={13} />
                                                        <span>Editar</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`cat-more-btn ${menuAbierto ? 'is-open' : ''}`}
                                                        onClick={() => setMenuAbiertoId(menuAbierto ? null : t.idTipo)}
                                                        aria-label="Más acciones"
                                                        aria-expanded={menuAbierto}
                                                    >
                                                        <MoreHorizontal size={15} />
                                                    </button>

                                                    {menuAbierto && (
                                                        <div className="cat-menu" role="menu">
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className="cat-menu-item"
                                                                onClick={() => {
                                                                    setMenuAbiertoId(null);
                                                                    irAHabitacionesDeTipo(t.idTipo);
                                                                }}
                                                            >
                                                                <BedDouble size={14} />
                                                                <span>Ver habitaciones</span>
                                                            </button>

                                                            <div className="cat-menu-sep" />

                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className="cat-menu-item is-danger"
                                                                disabled={cuartos > 0}
                                                                title={cuartos > 0 ? 'Tiene habitaciones asignadas' : 'Eliminar categoría'}
                                                                onClick={() => {
                                                                    setMenuAbiertoId(null);
                                                                    setTipoAEliminar({ id: t.idTipo, nombre: t.nombre });
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                                <span>Eliminar categoría</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="cat-table-footer">
                            Mostrando <strong style={{ color: 'var(--text-primary)' }}>{tiposFiltrados.length}</strong> de{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>{tipos.length}</strong> categorías
                        </div>
                    </>
                )}
            </div>

            {/* Modal para Crear / Editar Categoría */}
            <Modal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title={tipoAEditar ? `Editar: ${tipoAEditar.nombre}` : 'Nueva Categoría'}
                subtitle={tipoAEditar ? 'Actualiza capacidad, descripción y detalles' : 'Alta de categoría en el catálogo'}
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
                                <label className="form-label">Tarifa base ($ MXN / noche) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="1"
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

                    <div className="form-group">
                        <label className="form-label">Imagen HTTPS (opcional)</label>
                        <input
                            type="url"
                            maxLength={500}
                            value={formTipo.imagenUrl}
                            onChange={e => setFormTipo({ ...formTipo, imagenUrl: e.target.value })}
                            className="form-input"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {tipoAEditar ? 'Guardar cambios' : 'Crear categoría'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(tipoAEliminar)}
                onClose={() => setTipoAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar categoría?"
                subtitle="Catálogo Hotelero"
                message={
                    tipoAEliminar ? (
                        <>
                            ¿Seguro que deseas eliminar la categoría <strong>"{tipoAEliminar.nombre}"</strong>?
                            Esta acción no procederá si existen habitaciones asignadas.
                        </>
                    ) : ''
                }
                confirmText="Eliminar categoría"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
