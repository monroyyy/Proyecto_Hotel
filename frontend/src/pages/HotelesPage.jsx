import React, { useState, useEffect, useMemo } from 'react';
import { Building, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, MapPin, Phone, Mail, RefreshCw, Search, XCircle } from 'lucide-react';
import { getHoteles, crearHotel, actualizarHotel, eliminarHotel } from '../api/hotelApi';
import KpiCard from '../components/KpiCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EstadoBadge from '../components/EstadoBadge';

export default function HotelesPage() {
    const [hoteles, setHoteles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [hotelAEditar, setHotelAEditar] = useState(null);
    const [hotelAEliminar, setHotelAEliminar] = useState(null);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState('TODOS'); // 'TODOS' | 'ACTIVOS' | 'INACTIVOS'
    const [busqueda, setBusqueda] = useState('');

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

    const cargarHoteles = async () => {
        try {
            setCargando(true);
            setErrorMsg('');
            const data = await getHoteles();
            setHoteles(data || []);
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

    const handleAbrirNuevo = () => {
        setHotelAEditar(null);
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

    const handleGuardar = async (e) => {
        e.preventDefault();

        // Validación forzosa de exactamente 10 dígitos numéricos para teléfono
        const telLimpio = formHotel.telefono ? formHotel.telefono.trim() : '';
        if (!/^\d{10}$/.test(telLimpio)) {
            mostrarMensaje('error', 'El número telefónico forzosamente debe ser de 10 dígitos numéricos.');
            return;
        }

        // Validación de correo electrónico
        const emailLimpio = formHotel.email ? formHotel.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
            mostrarMensaje('error', 'El correo electrónico debe ser válido (ej. contacto@hotel.com).');
            return;
        }

        // Validar que no se repita el teléfono ni el correo con otros hoteles
        const telRepetido = hoteles.some(h => 
            h.telefono && h.telefono.trim() === telLimpio && (!hotelAEditar || h.idHotel !== hotelAEditar.idHotel)
        );
        if (telRepetido) {
            mostrarMensaje('error', 'No se puede repetir el número telefónico. Ya pertenece a otro hotel registrado.');
            return;
        }

        const emailRepetido = hoteles.some(h => 
            h.email && h.email.trim().toLowerCase() === emailLimpio && (!hotelAEditar || h.idHotel !== hotelAEditar.idHotel)
        );
        if (emailRepetido) {
            mostrarMensaje('error', 'No se puede repetir el correo electrónico. Ya pertenece a otro hotel registrado.');
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
                mostrarMensaje('exito', `Hotel "${payload.nombre}" actualizado correctamente.`);
            } else {
                await crearHotel(payload);
                mostrarMensaje('exito', `Hotel "${payload.nombre}" registrado correctamente.`);
            }
            setModalAbierto(false);
            setHotelAEditar(null);
            await cargarHoteles();
        } catch (err) {
            mostrarMensaje('error', err.message || 'Error al guardar el hotel.');
        }
    };

    const handleEliminar = (id, nombre) => {
        setHotelAEliminar({ id, nombre });
    };

    const handleConfirmarEliminar = async () => {
        if (!hotelAEliminar) return;
        const { id, nombre } = hotelAEliminar;
        try {
            await eliminarHotel(id);
            mostrarMensaje('exito', `Hotel "${nombre}" eliminado exitosamente.`);
            await cargarHoteles();
        } catch (err) {
            mostrarMensaje('error', err.message || 'No se puede eliminar el hotel porque tiene habitaciones asociadas.');
        } finally {
            setHotelAEliminar(null);
        }
    };

    // KPIs interactivos
    const kpis = useMemo(() => {
        const total = hoteles.length;
        const activos = hoteles.filter(h => h.activo).length;
        const inactivos = hoteles.filter(h => !h.activo).length;
        return { total, activos, inactivos };
    }, [hoteles]);

    // Filtrado de hoteles
    const hotelesFiltrados = useMemo(() => {
        return hoteles.filter(h => {
            const coincideEstado = filtroEstado === 'TODOS' || (filtroEstado === 'ACTIVOS' && h.activo) || (filtroEstado === 'INACTIVOS' && !h.activo);
            const q = busqueda.trim().toLowerCase();
            const coincideBusqueda = !q ||
                h.nombre?.toLowerCase().includes(q) ||
                h.ciudad?.toLowerCase().includes(q) ||
                h.direccion?.toLowerCase().includes(q) ||
                h.telefono?.includes(q);
            return coincideEstado && coincideBusqueda;
        });
    }, [hoteles, filtroEstado, busqueda]);

    return (
        <div className="page-container">
            {/* Notificación flotante */}
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* Cabecera */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestión de Hoteles</h1>
                    <p className="page-description">Control de establecimientos y sedes de la cadena hotelera.</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={cargarHoteles} disabled={cargando} title="Actualizar datos">
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Actualizar</span>
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleAbrirNuevo}>
                        <Plus size={18} />
                        <span>Nuevo Hotel</span>
                    </button>
                </div>
            </div>

            {/* Error de conexión */}
            {errorMsg && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div><strong>Error de Comunicación:</strong> {errorMsg}</div>
                </div>
            )}

            {/* Tarjetas KPI como Filtro Único de Estado */}
            <div className="kpi-grid">
                <KpiCard
                    title="Total Hoteles"
                    value={kpis.total}
                    icon={Building}
                    colorClass="kpi-blue"
                    subtitle="Registrados en la cadena"
                    isActive={filtroEstado === 'TODOS'}
                    onClick={() => setFiltroEstado('TODOS')}
                />
                <KpiCard
                    title="Hoteles Activos"
                    value={kpis.activos}
                    icon={CheckCircle2}
                    colorClass="kpi-green"
                    subtitle="Operando normalmente"
                    isActive={filtroEstado === 'ACTIVOS'}
                    onClick={() => setFiltroEstado('ACTIVOS')}
                />
                <KpiCard
                    title="Hoteles Inactivos"
                    value={kpis.inactivos}
                    icon={XCircle}
                    colorClass="kpi-red"
                    subtitle="Cierre o mantenimiento"
                    isActive={filtroEstado === 'INACTIVOS'}
                    onClick={() => setFiltroEstado('INACTIVOS')}
                />
            </div>

            {/* Buscador y Contador */}
            <div className="filters-card">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px', maxWidth: '420px' }}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por hotel, ciudad, dirección o teléfono..."
                            className="search-input"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="table-counter">
                        Mostrando <strong>{hotelesFiltrados.length}</strong> de {hoteles.length} hoteles
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="table-card">
                {cargando && hoteles.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando hoteles...</p>
                    </div>
                ) : hotelesFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Building size={48} className="empty-icon" />
                        <h3>No se encontraron hoteles</h3>
                        <p>Ningún hotel coincide con los filtros aplicados.</p>
                        <button type="button" className="btn btn-secondary" onClick={() => { setFiltroEstado('TODOS'); setBusqueda(''); }}>
                            Limpiar filtros
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Hotel</th>
                                    <th>Dirección & Ciudad</th>
                                    <th>Contacto</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hotelesFiltrados.map((h) => (
                                    <tr key={h.idHotel} className="table-row">
                                        <td>
                                            <div className="room-number-pill">
                                                <Building size={16} />
                                                <span className="number-text">{h.nombre}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hotel-cell">
                                                <div className="hotel-name">{h.direccion}</div>
                                                <div className="hotel-city"><MapPin size={12} /> {h.ciudad}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="hotel-cell">
                                                <div className="num" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Phone size={12} /> {h.telefono || 'N/A'}
                                                </div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Mail size={12} /> {h.email || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <EstadoBadge estado={h.activo ? 'Activo' : 'Inactivo'} />
                                        </td>
                                        <td className="text-right">
                                            <div className="row-actions">
                                                <button
                                                    type="button"
                                                    className="btn-action btn-action-edit"
                                                    onClick={() => handleAbrirEditar(h)}
                                                    title="Editar hotel"
                                                    aria-label="Editar hotel"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-action btn-action-delete"
                                                    onClick={() => handleEliminar(h.idHotel, h.nombre)}
                                                    title="Eliminar hotel"
                                                    aria-label="Eliminar hotel"
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

            {/* Modal para Crear / Editar Hotel */}
            <Modal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title={hotelAEditar ? `Editar Hotel: ${hotelAEditar.nombre}` : 'Registrar Nuevo Hotel'}
                subtitle={hotelAEditar ? 'Modifica los datos y contacto del hotel seleccionado' : 'Ingresa la información básica para dar de alta una nueva sede'}
                icon={Building}
                maxWidth="510px"
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
                    <div className="form-group">
                        <label className="form-label">Estado operativo</label>
                        <select
                            value={formHotel.activo ? 'true' : 'false'}
                            onChange={e => setFormHotel({ ...formHotel, activo: e.target.value === 'true' })}
                            className="form-select"
                        >
                            <option value="true">🟢 Activo</option>
                            <option value="false">🔴 Inactivo</option>
                        </select>
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Etiqueta editorial (opcional)</label>
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
                            <label className="form-label">Imagen HTTPS (opcional)</label>
                            <input
                                type="url"
                                maxLength={500}
                                value={formHotel.imagenUrl}
                                onChange={e => setFormHotel({ ...formHotel, imagenUrl: e.target.value })}
                                className="form-input"
                                placeholder="https://images.unsplash.com/..."
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción breve (solo texto plano, opcional)</label>
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
                    <div className="modal-actions">
                        <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-secondary">Cancelar</button>
                        <button type="submit" className="btn btn-primary">
                            {hotelAEditar ? 'Guardar Cambios' : 'Registrar Hotel'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Diálogo de confirmación del sistema para eliminar hotel */}
            <ConfirmDialog
                isOpen={Boolean(hotelAEliminar)}
                onClose={() => setHotelAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar hotel?"
                subtitle="Gestión de Hoteles de la Cadena"
                message={
                    hotelAEliminar ? (
                        <>
                            ¿Está seguro de que desea eliminar el hotel <strong>"{hotelAEliminar.nombre}"</strong>?
                            Esta acción es permanente y no se podrá realizar si cuenta con habitaciones vinculadas.
                        </>
                    ) : ''
                }
                confirmText="Sí, eliminar hotel"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}
