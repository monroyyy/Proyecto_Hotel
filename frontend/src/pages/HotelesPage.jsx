import React, { useState, useEffect } from 'react';
import { Building, Plus, Trash2, CheckCircle2, AlertCircle, MapPin, Phone, Mail, RefreshCw } from 'lucide-react';
import { getHoteles, crearHotel, eliminarHotel } from '../api/hotelApi';
import KpiCard from '../components/KpiCard';

export default function HotelesPage() {
    const [hoteles, setHoteles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    
    const [nuevoHotel, setNuevoHotel] = useState({
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

    const handleGuardar = async (e) => {
        e.preventDefault();
        try {
            await crearHotel(nuevoHotel);
            setModalAbierto(false);
            setNuevoHotel({ nombre: '', direccion: '', ciudad: '', telefono: '', email: '', activo: true });
            mostrarMensaje('exito', 'Hotel registrado correctamente.');
            await cargarHoteles();
        } catch (err) {
            mostrarMensaje('error', 'Error al guardar: ' + err.message);
        }
    };

    const handleEliminar = async (id, nombre) => {
        if (!window.confirm(`¿Estás seguro de eliminar el hotel "${nombre}"?`)) return;
        try {
            await eliminarHotel(id);
            mostrarMensaje('exito', 'Hotel eliminado exitosamente.');
            await cargarHoteles();
        } catch (err) {
            mostrarMensaje('error', 'No se puede eliminar el hotel porque tiene habitaciones asociadas.');
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
                    <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
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

            {/* Tarjetas KPI utilizando el componente KpiCard oficial */}
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
                                                <div><Phone size={12} style={{display:'inline', marginRight:'4px'}} />{h.telefono || 'N/A'}</div>
                                                <div style={{ color: '#6b7280' }}><Mail size={12} style={{display:'inline', marginRight:'4px'}} />{h.email || 'N/A'}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-select status-${h.activo ? 'disponible' : 'mantenimiento'}`} style={{display: 'inline-block', textAlign: 'center', pointerEvents: 'none'}}>
                                                {h.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button className="btn-action btn-action-delete" onClick={() => handleEliminar(h.idHotel, h.nombre)} title="Eliminar hotel">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Registrar Hotel */}
            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: '450px', background: '#fff', padding: '24px', borderRadius: '12px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px' }}>Registrar Nuevo Hotel</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>NOMBRE</label>
                                <input type="text" required value={nuevoHotel.nombre} onChange={e => setNuevoHotel({...nuevoHotel, nombre: e.target.value})} className="form-select" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>DIRECCIÓN</label>
                                <input type="text" required value={nuevoHotel.direccion} onChange={e => setNuevoHotel({...nuevoHotel, direccion: e.target.value})} className="form-select" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>CIUDAD</label>
                                <input type="text" required value={nuevoHotel.ciudad} onChange={e => setNuevoHotel({...nuevoHotel, ciudad: e.target.value})} className="form-select" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>TELÉFONO</label>
                                    <input type="text" value={nuevoHotel.telefono} onChange={e => setNuevoHotel({...nuevoHotel, telefono: e.target.value})} className="form-select" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>CORREO</label>
                                    <input type="email" value={nuevoHotel.email} onChange={e => setNuevoHotel({...nuevoHotel, email: e.target.value})} className="form-select" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setModalAbierto(false)} className="btn btn-secondary">Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}