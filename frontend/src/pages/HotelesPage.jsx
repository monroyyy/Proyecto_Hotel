import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Building, Plus, Trash2, Edit2, CheckCircle2, AlertCircle,
    RefreshCw, Search, ChevronDown, MoreHorizontal, Power,
    BedDouble, ArrowUpDown
} from 'lucide-react';
import {
    getHoteles,
    getHabitaciones,
    crearHotel,
    actualizarHotel,
    eliminarHotel
} from '../api/hotelApi';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import './HotelesPage.css';

export default function HotelesPage() {
    const { user, navigate } = useAuth();

    const [hoteles, setHoteles] = useState([]);
    const [habitaciones, setHabitaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);

    const [modalAbierto, setModalAbierto] = useState(false);
    // Error mostrado dentro del modal de crear/editar hotel para que no quede oculto detrás del backdrop
    const [errorModal, setErrorModal] = useState('');
    const [mostrarOpcionales, setMostrarOpcionales] = useState(false);
    const [hotelAEditar, setHotelAEditar] = useState(null);
    const [hotelAEliminar, setHotelAEliminar] = useState(null);
    const [menuAbiertoId, setMenuAbiertoId] = useState(null);
    const menuWrapRef = useRef(null);

    // Filtros y ordenamiento
    const [filtroEstado, setFiltroEstado] = useState('TODOS'); // 'TODOS' | 'ACTIVOS' | 'INACTIVOS'
    const [filtroCiudad, setFiltroCiudad] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ campo: 'nombre', dir: 'asc' });

    const [formHotel, setFormHotel] = useState({
        nombre: '',
        direccion: '',
        ciudad: '',
        telefono: '',
        email: '',
        activo: true,
        imagenUrl: '',
        tagEditorial: '',
        descripcion: '',
        latitud: '',
        longitud: ''
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

    const cargarHoteles = async () => {
        try {
            setCargando(true);
            setErrorMsg('');
            const [hotelesData, habsData] = await Promise.all([
                getHoteles(),
                getHabitaciones().catch(() => [])
            ]);
            setHoteles(hotelesData || []);
            setHabitaciones(Array.isArray(habsData) ? habsData : []);
        } catch (err) {
            console.error('Error al cargar hoteles:', err);
            setErrorMsg(err.message || 'No fue posible conectar con el servidor.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarHoteles();
    }, []);

    const mostrarMensaje = (tipo, texto) => {
        setNotificacion({ tipo, texto });
        setTimeout(() => setNotificacion(null), 4000);
    };

    // Conteo de habitaciones (total y disponibles) por hotel
    const inventarioPorHotel = useMemo(() => {
        const mapa = {};
        habitaciones.forEach(h => {
            const id = h.hotel?.idHotel;
            if (!id) return;
            if (!mapa[id]) mapa[id] = { total: 0, disponibles: 0 };
            mapa[id].total += 1;
            if (h.estado === 'Disponible') mapa[id].disponibles += 1;
        });
        return mapa;
    }, [habitaciones]);

    const ciudadesDisponibles = useMemo(() => {
        const set = new Set(hoteles.map(h => h.ciudad).filter(Boolean));
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
    }, [hoteles]);

    const toggleOrden = (campo) => {
        setOrden(prev =>
            prev.campo === campo
                ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { campo, dir: campo === 'inventario' ? 'desc' : 'asc' }
        );
    };

    const handleAbrirNuevo = () => {
        setHotelAEditar(null);
        setErrorModal('');
        setMostrarOpcionales(false);
        setFormHotel({
            nombre: '',
            direccion: '',
            ciudad: '',
            telefono: '',
            email: '',
            activo: true,
            imagenUrl: '',
            tagEditorial: '',
            descripcion: '',
            latitud: '',
            longitud: ''
        });
        setModalAbierto(true);
    };

    const handleAbrirEditar = (hotel) => {
        setHotelAEditar(hotel);
        setErrorModal('');
        setMostrarOpcionales(false);
        setFormHotel({
            nombre: hotel.nombre || '',
            direccion: hotel.direccion || '',
            ciudad: hotel.ciudad || '',
            telefono: hotel.telefono || '',
            email: hotel.email || '',
            activo: hotel.activo !== undefined ? hotel.activo : true,
            imagenUrl: hotel.imagenUrl || '',
            tagEditorial: hotel.tagEditorial || '',
            descripcion: hotel.descripcion || '',
            latitud: hotel.latitud ?? '',
            longitud: hotel.longitud ?? ''
        });
        setModalAbierto(true);
    };

    const handleToggleActivo = async (hotel) => {
        try {
            const nuevoEstado = !hotel.activo;
            await actualizarHotel(hotel.idHotel, {
                nombre: hotel.nombre,
                direccion: hotel.direccion,
                ciudad: hotel.ciudad,
                telefono: hotel.telefono,
                email: hotel.email,
                activo: nuevoEstado,
                imagenUrl: hotel.imagenUrl || '',
                tagEditorial: hotel.tagEditorial || '',
                descripcion: hotel.descripcion || '',
                latitud: hotel.latitud ?? null,
                longitud: hotel.longitud ?? null
            });
            mostrarMensaje('exito', `"${hotel.nombre}" marcado como ${nuevoEstado ? 'Activo' : 'Inactivo'}.`);
            await cargarHoteles();
        } catch (err) {
            mostrarMensaje('error', err.message || 'No se pudo cambiar el estado del hotel.');
        }
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setErrorModal('');

        const telLimpio = formHotel.telefono ? formHotel.telefono.trim() : '';
        if (!/^\d{10}$/.test(telLimpio)) {
            setErrorModal('El teléfono debe tener exactamente 10 dígitos numéricos.');
            return;
        }

        const emailLimpio = formHotel.email ? formHotel.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
            setErrorModal('Ingresa un correo electrónico válido.');
            return;
        }

        const telRepetido = hoteles.some(h =>
            h.telefono && h.telefono.trim() === telLimpio && (!hotelAEditar || h.idHotel !== hotelAEditar.idHotel)
        );
        if (telRepetido) {
            setErrorModal('Ese teléfono ya pertenece a otra propiedad registrada.');
            return;
        }

        const emailRepetido = hoteles.some(h =>
            h.email && h.email.trim().toLowerCase() === emailLimpio && (!hotelAEditar || h.idHotel !== hotelAEditar.idHotel)
        );
        if (emailRepetido) {
            setErrorModal('Ese correo ya pertenece a otra propiedad registrada.');
            return;
        }

        try {
            const payload = {
                ...formHotel,
                telefono: telLimpio,
                email: emailLimpio,
                imagenUrl: formHotel.imagenUrl?.trim() || '',
                tagEditorial: formHotel.tagEditorial?.trim() || '',
                descripcion: formHotel.descripcion?.trim() || '',
                latitud: formHotel.latitud !== '' && formHotel.latitud != null ? Number(formHotel.latitud) : null,
                longitud: formHotel.longitud !== '' && formHotel.longitud != null ? Number(formHotel.longitud) : null
            };

            if (hotelAEditar) {
                await actualizarHotel(hotelAEditar.idHotel, payload);
                mostrarMensaje('exito', `Propiedad "${payload.nombre}" actualizada.`);
            } else {
                await crearHotel(payload);
                mostrarMensaje('exito', `Propiedad "${payload.nombre}" registrada.`);
            }
            setModalAbierto(false);
            setHotelAEditar(null);
            await cargarHoteles();
        } catch (err) {
            // Mostrar error dentro del modal para que sea visible sobre el backdrop
            setErrorModal(err.message || 'Error al guardar el hotel.');
        }
    };

    const handleConfirmarEliminar = async () => {
        if (!hotelAEliminar) return;
        const { id, nombre } = hotelAEliminar;
        try {
            await eliminarHotel(id);
            mostrarMensaje('exito', `Propiedad "${nombre}" eliminada.`);
            await cargarHoteles();
        } catch (err) {
            mostrarMensaje('error', err.message || 'No se puede eliminar porque tiene habitaciones vinculadas.');
        } finally {
            setHotelAEliminar(null);
        }
    };

    const irAHabitacionesDeHotel = (idHotel) => {
        sessionStorage.setItem('hotel_filtro_sede', String(idHotel));
        navigate('/habitaciones');
    };

    const kpis = useMemo(() => {
        const total = hoteles.length;
        const activos = hoteles.filter(h => h.activo).length;
        const inactivos = hoteles.filter(h => !h.activo).length;
        return { total, activos, inactivos };
    }, [hoteles]);

    const hotelesFiltrados = useMemo(() => {
        const filtrados = hoteles.filter(h => {
            const coincideEstado =
                filtroEstado === 'TODOS' ||
                (filtroEstado === 'ACTIVOS' && h.activo) ||
                (filtroEstado === 'INACTIVOS' && !h.activo);
            const coincideCiudad = !filtroCiudad || h.ciudad === filtroCiudad;
            const q = busqueda.trim().toLowerCase();
            const coincideBusqueda = !q ||
                h.nombre?.toLowerCase().includes(q) ||
                h.ciudad?.toLowerCase().includes(q) ||
                h.direccion?.toLowerCase().includes(q) ||
                h.telefono?.includes(q);
            return coincideEstado && coincideCiudad && coincideBusqueda;
        });

        const mult = orden.dir === 'asc' ? 1 : -1;
        return [...filtrados].sort((a, b) => {
            if (orden.campo === 'ciudad') {
                return String(a.ciudad || '').localeCompare(String(b.ciudad || ''), 'es') * mult;
            }
            if (orden.campo === 'inventario') {
                const ca = inventarioPorHotel[a.idHotel]?.total || 0;
                const cb = inventarioPorHotel[b.idHotel]?.total || 0;
                return (ca - cb) * mult;
            }
            return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es') * mult;
        });
    }, [hoteles, filtroEstado, filtroCiudad, busqueda, orden, inventarioPorHotel]);

    const hayFiltros = Boolean(filtroEstado !== 'TODOS' || filtroCiudad || busqueda.trim());

    const limpiarFiltros = () => {
        setFiltroEstado('TODOS');
        setFiltroCiudad('');
        setBusqueda('');
    };

    return (
        <div className="hot-view">
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* CABECERA EDITORIAL */}
            <header className="hot-header hot-anim-up">
                <div>
                    <div className="hot-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Red Hotelera</span>
                        <span className="hot-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="hot-title">Hoteles</h1>
                </div>

                <button type="button" className="hot-cta-btn" onClick={handleAbrirNuevo}>
                    <Plus size={16} />
                    <span>Nuevo hotel</span>
                </button>
            </header>

            {errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span><strong>Error:</strong> {errorMsg}</span>
                </div>
            )}

            {/* 3 KPIs COMPACTOS CLICABLES */}
            <section className="hot-kpi-grid hot-anim-up hot-delay-1" aria-label="Resumen de propiedades">
                <button
                    type="button"
                    className={`hot-kpi-card ${filtroEstado === 'TODOS' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('TODOS')}
                >
                    <div className="hot-kpi-label">Total Propiedades</div>
                    <div className="hot-kpi-val">{kpis.total}</div>
                    <div className="hot-kpi-sub">Sedes registradas</div>
                </button>

                <button
                    type="button"
                    className={`hot-kpi-card is-palm ${filtroEstado === 'ACTIVOS' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('ACTIVOS')}
                >
                    <div className="hot-kpi-label">Activas</div>
                    <div className="hot-kpi-val">{kpis.activos}</div>
                    <div className="hot-kpi-sub">En operación</div>
                </button>

                <button
                    type="button"
                    className={`hot-kpi-card is-danger ${filtroEstado === 'INACTIVOS' ? 'is-active' : ''}`}
                    onClick={() => setFiltroEstado('INACTIVOS')}
                >
                    <div className="hot-kpi-label">Inactivas</div>
                    <div className="hot-kpi-val">{kpis.inactivos}</div>
                    <div className="hot-kpi-sub">Fuera de operación</div>
                </button>
            </section>

            {/* BARRA UNIFICADA DE FILTROS EN 1 SOLA LÍNEA */}
            <div className="hot-filter-bar hot-anim-up hot-delay-1">
                <div className="hot-filter-left">
                    <div className="hot-search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            className="hot-search-input"
                            placeholder="Propiedad, ciudad, dirección o teléfono..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            aria-label="Buscar propiedades"
                        />
                    </div>

                    <div className="hot-select-wrap">
                        <select
                            className="hot-select"
                            value={filtroCiudad}
                            onChange={(e) => setFiltroCiudad(e.target.value)}
                            aria-label="Filtrar por ciudad"
                        >
                            <option value="">Todas las ciudades</option>
                            {ciudadesDisponibles.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="hot-select-chevron" />
                    </div>

                    {hayFiltros && (
                        <button type="button" className="hot-clear-btn" onClick={limpiarFiltros}>
                            Limpiar
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="hot-icon-btn"
                    onClick={cargarHoteles}
                    disabled={cargando}
                    title="Actualizar propiedades"
                    aria-label="Actualizar propiedades"
                >
                    <RefreshCw size={14} className={cargando ? 'hot-spin' : ''} />
                </button>
            </div>

            {/* TABLA EDITORIAL LIMPIA */}
            <div className="hot-table-card hot-anim-up hot-delay-2" ref={menuWrapRef}>
                {cargando && hoteles.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando propiedades...</p>
                    </div>
                ) : hotelesFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Building size={40} className="empty-icon" />
                        <h3>No se encontraron propiedades</h3>
                        <p>Ninguna sede coincide con los filtros actuales.</p>
                        {hayFiltros && (
                            <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <table className="hot-table">
                            <thead>
                                <tr>
                                    <th>
                                        <button
                                            type="button"
                                            className={`hot-sort-btn ${orden.campo === 'nombre' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('nombre')}
                                        >
                                            <span>Propiedad</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>
                                        <button
                                            type="button"
                                            className={`hot-sort-btn ${orden.campo === 'ciudad' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('ciudad')}
                                        >
                                            <span>Ubicación</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>Contacto</th>
                                    <th className="num">
                                        <button
                                            type="button"
                                            className={`hot-sort-btn ${orden.campo === 'inventario' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('inventario')}
                                        >
                                            <span>Inventario</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>Estado</th>
                                    <th className="num">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hotelesFiltrados.map((h) => {
                                    const inv = inventarioPorHotel[h.idHotel] || { total: 0, disponibles: 0 };
                                    const menuAbierto = menuAbiertoId === h.idHotel;
                                    return (
                                        <tr key={h.idHotel}>
                                            <td>
                                                <div className="hot-cell-main">{h.nombre}</div>
                                                {h.tagEditorial && <div className="hot-tag-sub">{h.tagEditorial}</div>}
                                            </td>

                                            <td>
                                                <div className="hot-cell-main" style={{ fontWeight: 600 }}>{h.ciudad || '—'}</div>
                                                <div className="hot-cell-sub">{h.direccion || '—'}</div>
                                            </td>

                                            <td>
                                                <div className="num" style={{ textAlign: 'left', fontWeight: 600 }}>{h.telefono || '—'}</div>
                                                <div className="hot-cell-sub">{h.email || '—'}</div>
                                            </td>

                                            <td className="num">
                                                <button
                                                    type="button"
                                                    className="hot-inv-link"
                                                    onClick={() => irAHabitacionesDeHotel(h.idHotel)}
                                                    title="Ver habitaciones de esta sede"
                                                >
                                                    <span style={{ fontWeight: 700, color: 'var(--brand-ocean, #16324f)' }}>
                                                        {inv.total} {inv.total === 1 ? 'cuarto' : 'cuartos'}
                                                    </span>
                                                    <span className="hot-cell-sub" style={{ marginTop: 1 }}>
                                                        {inv.disponibles} disp.
                                                    </span>
                                                </button>
                                            </td>

                                            <td>
                                                <span className={`hot-badge ${h.activo ? 'hot-badge-activo' : 'hot-badge-inactivo'}`}>
                                                    {h.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>

                                            <td className="num">
                                                <div className="hot-action-cell">
                                                    <button
                                                        type="button"
                                                        className="hot-edit-btn"
                                                        onClick={() => handleAbrirEditar(h)}
                                                    >
                                                        <Edit2 size={13} />
                                                        <span>Editar</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`hot-more-btn ${menuAbierto ? 'is-open' : ''}`}
                                                        onClick={() => setMenuAbiertoId(menuAbierto ? null : h.idHotel)}
                                                        aria-label="Más acciones"
                                                        aria-expanded={menuAbierto}
                                                    >
                                                        <MoreHorizontal size={15} />
                                                    </button>

                                                    {menuAbierto && (
                                                        <div className="hot-menu" role="menu">
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className="hot-menu-item"
                                                                onClick={() => {
                                                                    setMenuAbiertoId(null);
                                                                    irAHabitacionesDeHotel(h.idHotel);
                                                                }}
                                                            >
                                                                <BedDouble size={14} />
                                                                <span>Ver habitaciones</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className={`hot-menu-item ${h.activo ? 'is-warn' : ''}`}
                                                                onClick={() => {
                                                                    setMenuAbiertoId(null);
                                                                    handleToggleActivo(h);
                                                                }}
                                                            >
                                                                <Power size={14} />
                                                                <span>{h.activo ? 'Desactivar sede' : 'Activar sede'}</span>
                                                            </button>

                                                            <div className="hot-menu-sep" />

                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                className="hot-menu-item is-danger"
                                                                onClick={() => {
                                                                    setMenuAbiertoId(null);
                                                                    setHotelAEliminar({ id: h.idHotel, nombre: h.nombre });
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                                <span>Eliminar propiedad</span>
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

                        <div className="hot-table-footer">
                            Mostrando <strong style={{ color: 'var(--text-primary)' }}>{hotelesFiltrados.length}</strong> de{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>{hoteles.length}</strong> propiedades
                        </div>
                    </>
                )}
            </div>

            {/* Modal Compacto para Crear / Editar Hotel (sin emojis, opcionales plegables) */}
            <Modal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title={hotelAEditar ? `Editar: ${hotelAEditar.nombre}` : 'Nueva Propiedad'}
                subtitle={hotelAEditar ? 'Actualiza la información y contacto de la sede' : 'Alta de establecimiento en la cadena'}
                icon={Building}
                maxWidth="520px"
            >
                <form onSubmit={handleGuardar} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Nombre del hotel *</label>
                        <input
                            type="text"
                            required
                            value={formHotel.nombre}
                            onChange={e => setFormHotel({ ...formHotel, nombre: e.target.value })}
                            className="form-input"
                            placeholder="Ej. Hotel Paraíso Cancún"
                        />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Ciudad *</label>
                            <input
                                type="text"
                                required
                                value={formHotel.ciudad}
                                onChange={e => setFormHotel({ ...formHotel, ciudad: e.target.value })}
                                className="form-input"
                                placeholder="Ej. Cancún"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Estado operativo</label>
                            <select
                                value={formHotel.activo ? 'true' : 'false'}
                                onChange={e => setFormHotel({ ...formHotel, activo: e.target.value === 'true' })}
                                className="form-select"
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Dirección *</label>
                        <input
                            type="text"
                            required
                            value={formHotel.direccion}
                            onChange={e => setFormHotel({ ...formHotel, direccion: e.target.value })}
                            className="form-input"
                            placeholder="Ej. Av. Reforma #125, Col. Centro"
                        />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Teléfono (10 dígitos) *</label>
                            <input
                                type="tel"
                                required
                                maxLength={10}
                                placeholder="Ej. 5512345678"
                                value={formHotel.telefono}
                                onChange={e => setFormHotel({ ...formHotel, telefono: e.target.value.replace(/\D/g, '') })}
                                className="form-input num"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico *</label>
                            <input
                                type="email"
                                required
                                placeholder="contacto@hotel.com"
                                value={formHotel.email}
                                onChange={e => setFormHotel({ ...formHotel, email: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Sección plegable para datos opcionales del portal web y mapa */}
                    <button
                        type="button"
                        className="hot-optional-toggle"
                        onClick={() => setMostrarOpcionales(prev => !prev)}
                        aria-expanded={mostrarOpcionales}
                    >
                        <span>Portal web y coordenadas (opcional)</span>
                        <ChevronDown
                            size={15}
                            style={{
                                transform: mostrarOpcionales ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 160ms ease'
                            }}
                        />
                    </button>

                    {mostrarOpcionales && (
                        <div className="hot-optional-panel">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Etiqueta editorial</label>
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={formHotel.tagEditorial}
                                        onChange={e => setFormHotel({ ...formHotel, tagEditorial: e.target.value })}
                                        className="form-input"
                                        placeholder="Ej. Resort Insignia"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Imagen HTTPS</label>
                                    <input
                                        type="url"
                                        maxLength={500}
                                        value={formHotel.imagenUrl}
                                        onChange={e => setFormHotel({ ...formHotel, imagenUrl: e.target.value })}
                                        className="form-input"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descripción breve</label>
                                <input
                                    type="text"
                                    maxLength={500}
                                    value={formHotel.descripcion}
                                    onChange={e => setFormHotel({ ...formHotel, descripcion: e.target.value })}
                                    className="form-input"
                                    placeholder="Ej. Alberca infinity y terraza frente al mar"
                                />
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Latitud (-90 a 90)</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        min="-90"
                                        max="90"
                                        value={formHotel.latitud}
                                        onChange={e => setFormHotel({ ...formHotel, latitud: e.target.value })}
                                        className="form-input num"
                                        placeholder="21.161908"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Longitud (-180 a 180)</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        min="-180"
                                        max="180"
                                        value={formHotel.longitud}
                                        onChange={e => setFormHotel({ ...formHotel, longitud: e.target.value })}
                                        className="form-input num"
                                        placeholder="-86.851528"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mostrar error dentro del modal justo encima de los botones de acción */}
                    {errorModal && (
                        <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
                            <AlertCircle size={16} />
                            <span>{errorModal}</span>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {hotelAEditar ? 'Guardar cambios' : 'Registrar propiedad'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(hotelAEliminar)}
                onClose={() => setHotelAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar propiedad?"
                subtitle="Red Hotelera"
                message={
                    hotelAEliminar ? (
                        <>
                            ¿Seguro que deseas eliminar <strong>"{hotelAEliminar.nombre}"</strong>?
                            Esta acción es permanente y no procederá si existen habitaciones vinculadas.
                        </>
                    ) : ''
                }
                confirmText="Eliminar propiedad"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
