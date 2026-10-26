import React, { useState, useEffect } from 'react';
import { Building, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, MapPin, Phone, Mail, RefreshCw } from 'lucide-react';
import { getHoteles, crearHotel, actualizarHotel, eliminarHotel } from '../api/hotelApi';
import KpiCard from '../components/KpiCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function HotelesPage() {
    const [hoteles, setHoteles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [hotelAEditar, setHotelAEditar] = useState(null);
    const [hotelAEliminar, setHotelAEliminar] = useState(null);
    
    const [formHotel, setFormHotel] = useState({
        nombre: '',
        direccion: '',
        ciudad: '',
        telefono: '',
        email: '',
        activo: true
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
            activo: true
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
            activo: hotel.activo !== undefined ? hotel.activo : true
        });
        setModalAbierto(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();

        // Validación forzosa de exactamente 10 dígitos numéricos para teléfono
        const telLimpio = formHotel.telefono ? formHotel.telefono.trim() : '';
        if (!/^\d{10}$/.test(telLimpio)) {
            mostrarMensaje('error', 'El número telefónico forzosamente debe ser de 10 números (ej. 5512345678).');
            return;
        }

        // Validación de correo electrónico
        const emailLimpio = formHotel.email ? formHotel.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
            mostrarMensaje('error', 'El correo electrónico debe ser válido (ejemplo: contacto@hotel.com).');
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
                email: emailLimpio
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

    const activosCount = hoteles.filter(h => h.activo).length;

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
                    <button className="btn btn-secondary btn-icon" onClick={cargarHoteles} disabled={cargando}>
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Refrescar</span>
                    </button>
                    <button className="btn btn-primary" onClick={handleAbrirNuevo}>
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

            {/* Tarjetas KPI */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <KpiCard
                    title="Total de Hoteles"
                    value={hoteles.length}
                    icon={Building}
                    colorClass="kpi-blue"
                    subtitle="Registrados en la cadena"
                />
                <KpiCard
                    title="Hoteles Activos"
                    value={activosCount}
                    icon={CheckCircle2}
                    colorClass="kpi-green"
                    subtitle="Operando normalmente"
                />
            </div>

            {/* Tabla de Resultados */}
            <div className="table-card">
                <div className="table-header-info">
                    <div className="table-counter">Mostrando <strong>{hoteles.length}</strong> hoteles</div>
                </div>

                {cargando ? (
                    <div className="loading-state"><div className="spinner"></div><p>Cargando hoteles...</p></div>
                ) : hoteles.length === 0 ? (
                    <div className="empty-state">
                        <Building size={48} className="empty-icon" />
                        <h3>No hay hoteles registrados</h3>
                        <p>Comienza agregando una nueva sede usando el botón superior.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>HOTEL</th>
                                    <th>DIRECCIÓN & CIUDAD</th>
                                    <th>CONTACTO</th>
                                    <th>ESTADO</th>
                                    <th className="text-right">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hoteles.map((h) => (
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
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <div><Phone size={12} style={{ display: 'inline', marginRight: '4px' }} />{h.telefono || 'N/A'}</div>
                                                <div style={{ color: '#6b7280' }}><Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />{h.email || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-select status-${h.activo ? 'disponible' : 'mantenimiento'}`} style={{ display: 'inline-block', textAlign: 'center', pointerEvents: 'none' }}>
                                                {h.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="row-actions">
                                                <button className="btn-action btn-action-edit" onClick={() => handleAbrirEditar(h)} title="Editar hotel">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn-action btn-action-delete" onClick={() => handleEliminar(h.idHotel, h.nombre)} title="Eliminar hotel">
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
                        <label className="form-label">NOMBRE DEL HOTEL *</label>
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
                        <label className="form-label">DIRECCIÓN *</label>
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
                        <label className="form-label">CIUDAD *</label>
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
                            <label className="form-label">TELÉFONO (10 DÍGITOS) *</label>
                            <input
                                type="tel"
                                required
                                maxLength={10}
                                placeholder="Ej. 5512345678"
                                value={formHotel.telefono}
                                onChange={e => setFormHotel({ ...formHotel, telefono: e.target.value.replace(/\D/g, '') })}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">CORREO ELECTRÓNICO *</label>
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
                        <label className="form-label">ESTADO OPERATIVO</label>
                        <select
                            value={formHotel.activo ? 'true' : 'false'}
                            onChange={e => setFormHotel({ ...formHotel, activo: e.target.value === 'true' })}
                            className="form-select"
                        >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                        </select>
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