import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CheckCircle2, AlertCircle, Users, DollarSign, RefreshCw } from 'lucide-react';
import { getTiposHabitacion, crearTipoHabitacion, eliminarTipoHabitacion } from '../api/hotelApi';

export default function TiposHabitacionPage() {
    const [tipos, setTipos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [notificacion, setNotificacion] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);

    const [nuevoTipo, setNuevoTipo] = useState({
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

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (nuevoTipo.capacidad <= 0) {
            alert('La capacidad debe ser mayor a cero.');
            return;
        }
        if (nuevoTipo.precioBase < 0) {
            alert('El precio base no puede ser negativo.');
            return;
        }

        try {
            await crearTipoHabitacion(nuevoTipo);
            setModalAbierto(false);
            setNuevoTipo({ nombre: '', capacidad: 2, descripcion: '', precioBase: 0 });
            mostrarMensaje('exito', 'Tipo de habitación creado exitosamente.');
            await cargarTipos();
        } catch (err) {
            mostrarMensaje('error', 'Error al guardar: ' + err.message);
        }
    };

    const handleEliminar = async (id, nombre) => {
        if (!window.confirm(`¿Estás seguro de eliminar el tipo "${nombre}"?`)) return;
        try {
            await eliminarTipoHabitacion(id);
            mostrarMensaje('exito', 'Tipo de habitación eliminado.');
            await cargarTipos();
        } catch (err) {
            mostrarMensaje('error', 'No se puede eliminar porque está asociado a una habitación.');
        }
    };

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
                    <h1 className="page-title">Tipos de Habitación</h1>
                    <p className="page-description">Catálogo de categorías, tarifas base por noche y capacidades de hospedaje.</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary btn-icon" onClick={cargarTipos} disabled={cargando}>
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Refrescar</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => setModalAbierto(true)}>
                        <Plus size={18} />
                        <span>Nuevo Tipo</span>
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div><strong>Error de Comunicación:</strong> {errorMsg}</div>
                </div>
            )}

            <div className="table-card">
                <div className="table-header-info">
                    <div className="table-counter">Mostrando <strong>{tipos.length}</strong> tipos de habitación</div>
                </div>

                {cargando ? (
                    <div className="loading-state"><div className="spinner"></div><p>Cargando tipos de habitación...</p></div>
                ) : tipos.length === 0 ? (
                    <div className="empty-state">
                        <Tag size={48} className="empty-icon" />
                        <h3>No hay tipos de habitación registrados</h3>
                        <p>Crea categorías para asignarlas a las habitaciones.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Categoría</th>
                                    <th>Capacidad</th>
                                    <th>Descripción</th>
                                    <th>Precio Base</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tipos.map((t) => (
                                    <tr key={t.idTipo} className="table-row">
                                        <td>
                                            <div className="room-number-pill">
                                                <Tag size={16} />
                                                <span className="number-text">{t.nombre}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="floor-badge"><Users size={13} /> {t.capacidad} personas</span>
                                        </td>
                                        <td style={{ color: '#4b5563' }}>{t.descripcion || 'Sin descripción'}</td>
                                        <td>
                                            <div className="price-tag">
                                                ${Number(t.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                <span className="price-period">/noche</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <button className="btn-action btn-action-delete" onClick={() => handleEliminar(t.idTipo, t.nombre)} title="Eliminar tipo">
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

            {modalAbierto && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ maxWidth: '450px', background: '#fff', padding: '24px', borderRadius: '12px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px' }}>Nuevo Tipo de Habitación</h2>
                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>NOMBRE DE LA CATEGORÍA</label>
                                <input type="text" required value={nuevoTipo.nombre} onChange={e => setNuevoTipo({...nuevoTipo, nombre: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>CAPACIDAD (HUÉSPEDES)</label>
                                <input type="number" min="1" required value={nuevoTipo.capacidad} onChange={e => setNuevoTipo({...nuevoTipo, capacidad: parseInt(e.target.value)})} style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>DESCRIPCIÓN</label>
                                <textarea rows="2" value={nuevoTipo.descripcion} onChange={e => setNuevoTipo({...nuevoTipo, descripcion: e.target.value})} style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}}></textarea>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563' }}>PRECIO BASE ($)</label>
                                <input type="number" step="0.01" min="0" required value={nuevoTipo.precioBase} onChange={e => setNuevoTipo({...nuevoTipo, precioBase: parseFloat(e.target.value)})} style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'6px'}} />
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