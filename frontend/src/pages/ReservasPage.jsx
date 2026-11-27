import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    CalendarPlus, ClipboardList, Search, BedDouble, User, CheckCircle2, Clock,
    AlertTriangle, Accessibility, Baby, XCircle, Banknote, Building2,
    UserCheck, Edit2, Trash2, Eye, RotateCcw, LogIn, LogOut, UserX,
    Calendar, ChevronDown, MoreHorizontal, Phone, Mail, Printer
} from 'lucide-react';
import {
    getHoteles, buscarDisponibilidad, crearReserva, getReservas, getResumenEstadosReservas,
    confirmarReserva, cancelarReserva, getReembolsoReserva,
    buscarHuespedes, actualizarReserva, eliminarReserva,
    extenderDiaExtraReserva, checkInReserva, checkOutReserva,
    marcarNoShowReserva, revertirNoShowReserva
} from '../api/hotelApi';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EstadoBadge from '../components/EstadoBadge';
import { useAuth } from '../context/AuthContext';
import { imprimirComprobanteReserva } from '../utils/reservaComprobante';
import './ReservasPage.css';

function resBadgeClase(estado) {
    if (estado === 'Confirmada') return 'res-badge res-badge-confirmada';
    if (estado === 'Finalizada') return 'res-badge res-badge-finalizada';
    if (estado === 'Ocupada') return 'res-badge res-badge-ocupada';
    if (estado === 'Pre-reserva') return 'res-badge res-badge-prereserva';
    return 'res-badge res-badge-danger';
}

function formatearFechaSinAno(fechaStr) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${parseInt(partes[2], 10)} ${meses[parseInt(partes[1], 10) - 1] || partes[1]}`;
}

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pad2 = (n) => String(n).padStart(2, '0');
const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const sumarDias = (iso, d) => {
    if (!iso) return hoy();
    const [y, m, dia] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, dia);
    dt.setDate(dt.getDate() + d);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};
const fmtFechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]} ${meses[parseInt(partes[1], 10) - 1] || partes[1]} ${partes[0]}`;
}

export default function ReservasPage() {
    const { user } = useAuth();
    const [preseleccion] = useState(() => {
        try {
            const raw = sessionStorage.getItem('hotel_preseleccion_reserva');
            if (raw) {
                sessionStorage.removeItem('hotel_preseleccion_reserva');
                return JSON.parse(raw);
            }
        } catch {
            sessionStorage.removeItem('hotel_preseleccion_reserva');
        }
        return null;
    });
    const [vista, setVista] = useState(preseleccion ? 'nueva' : 'lista');

    return (
        <div className="res-view">
            <header className="res-header res-anim-up">
                <div>
                    <div className="res-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Operación Hotelera</span>
                        <span className="res-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="res-title">
                        {vista === 'nueva' ? 'Nueva Reservación' : 'Reservaciones'}
                    </h1>
                </div>

                <div>
                    {vista === 'lista' ? (
                        <button
                            type="button"
                            className="res-cta-btn"
                            onClick={() => setVista('nueva')}
                        >
                            <CalendarPlus size={16} />
                            <span>Nueva reservación</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="res-cta-btn is-secondary"
                            onClick={() => setVista('lista')}
                        >
                            <ClipboardList size={16} />
                            <span>Ver reservaciones</span>
                        </button>
                    )}
                </div>
            </header>

            <div key={vista} className="res-anim-up res-delay-1">
                {vista === 'nueva'
                    ? <NuevaReserva preseleccion={preseleccion} onCreada={() => {}} irALista={() => setVista('lista')} />
                    : <ListaReservas onNueva={() => setVista('nueva')} />}
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// NUEVA RESERVACIÓN (FLUJO EN PASOS CLAROS CON BOTÓN LIMPIAR TODO)
// ------------------------------------------------------------------
function NuevaReserva({ irALista, preseleccion = null }) {
    const [hoteles, setHoteles] = useState([]);
    const [busq, setBusq] = useState(() => ({
        idHotel: preseleccion?.idHotel ? String(preseleccion.idHotel) : '',
        fechaEntrada: hoy(),
        fechaSalida: sumarDias(hoy(), 1),
        adultos: 1,
        ninos: 0,
        cuna: false,
        camaExtra: false,
        plantaBaja: false
    }));
    const [resultados, setResultados] = useState(null);
    const [buscando, setBuscando] = useState(false);
    const [seleccion, setSeleccion] = useState(null);
    const [error, setError] = useState('');
    const [creada, setCreada] = useState(null);

    useEffect(() => { getHoteles().then(setHoteles).catch(() => {}); }, []);

    // Si viene preseleccionada una habitación desde /habitaciones, consultar disponibilidad y seleccionarla automáticamente
    useEffect(() => {
        if (!preseleccion?.idHabitacion) return;
        let cancelado = false;
        const autoSeleccionar = async () => {
            setBuscando(true);
            setError('');
            try {
                const payload = {
                    idHotel: preseleccion.idHotel || undefined,
                    fechaEntrada: hoy(),
                    fechaSalida: sumarDias(hoy(), 1),
                    adultos: 1,
                    ninos: 0,
                    cuna: false,
                    camaExtra: false,
                    plantaBaja: false
                };
                const data = await buscarDisponibilidad(payload);
                if (cancelado) return;
                setResultados(data);
                const match = (Array.isArray(data) ? data : []).find(
                    (item) => Number(item?.habitacion?.idHabitacion) === Number(preseleccion.idHabitacion)
                );
                if (match) {
                    setSeleccion({ habitacion: match.habitacion, tarifa: match.tarifa });
                }
            } catch (err) {
                if (!cancelado) setError(err.message);
            } finally {
                if (!cancelado) setBuscando(false);
            }
        };
        autoSeleccionar();
        return () => { cancelado = true; };
    }, [preseleccion]);

    const set = (k, v) => { setBusq((b) => ({ ...b, [k]: v })); setResultados(null); setSeleccion(null); };

    // Limpiar todos los campos del proceso de reservación
    const limpiarBusqueda = () => {
        setBusq({
            idHotel: '',
            fechaEntrada: hoy(),
            fechaSalida: sumarDias(hoy(), 1),
            adultos: 1,
            ninos: 0,
            cuna: false,
            camaExtra: false,
            plantaBaja: false
        });
        setResultados(null);
        setSeleccion(null);
        setError('');
    };

    const buscar = async (e) => {
        e?.preventDefault();
        setError(''); setSeleccion(null); setBuscando(true);
        try {
            const data = await buscarDisponibilidad({ ...busq, idHotel: busq.idHotel || undefined });
            setResultados(data);
        } catch (err) { setError(err.message); setResultados(null); }
        finally { setBuscando(false); }
    };

    if (creada) return <Comprobante reserva={creada} onNueva={() => { setCreada(null); setResultados(null); setSeleccion(null); }} irALista={irALista} />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Stepper visual limpio (sin números duplicados) */}
            <div className="reserva-stepper" aria-label="Progreso de la reservación">
                <div className={`stepper-step is-active ${resultados ? 'is-complete' : ''}`}>
                    <span className="step-circle">{resultados ? '✓' : '1'}</span>
                    <span className="step-label">Disponibilidad</span>
                </div>
                <div className="stepper-line" />
                <div className={`stepper-step ${resultados ? 'is-active' : ''} ${seleccion ? 'is-complete' : ''}`}>
                    <span className="step-circle">{seleccion ? '✓' : '2'}</span>
                    <span className="step-label">Habitación</span>
                </div>
                <div className="stepper-line" />
                <div className={`stepper-step ${seleccion ? 'is-active' : ''}`}>
                    <span className="step-circle">3</span>
                    <span className="step-label">Huésped y pago</span>
                </div>
            </div>

            {/* Paso 1: Consultar disponibilidad */}
            <form onSubmit={buscar} className="content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 8 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Search size={17} /> Consultar disponibilidad
                    </h2>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} />{error}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                        <label className="form-label">Hotel</label>
                        <select className="form-select" value={busq.idHotel} onChange={(e) => set('idHotel', e.target.value)}>
                            <option value="">Todos los Hoteles</option>
                            {hoteles.filter((h) => h.activo !== false).map((h) => <option key={h.idHotel} value={h.idHotel}>{h.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Llegada (15:00 h)</label>
                        <input className="form-input" type="date" min={hoy()} value={busq.fechaEntrada}
                            onChange={(e) => {
                                const v = e.target.value;
                                setBusq((b) => ({ ...b, fechaEntrada: v, fechaSalida: b.fechaSalida <= v ? sumarDias(v, 1) : b.fechaSalida }));
                                setResultados(null); setSeleccion(null);
                            }} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Salida (12:00 h)</label>
                        <input className="form-input" type="date" min={sumarDias(busq.fechaEntrada, 1)} value={busq.fechaSalida}
                            onChange={(e) => set('fechaSalida', e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Adultos</label>
                        <input className="form-input" type="number" min="1" max="10" value={busq.adultos}
                            onChange={(e) => set('adultos', parseInt(e.target.value, 10) || 1)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Niños</label>
                        <input className="form-input" type="number" min="0" max="10" value={busq.ninos}
                            onChange={(e) => set('ninos', parseInt(e.target.value, 10) || 0)} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.84rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={busq.plantaBaja} onChange={(e) => set('plantaBaja', e.target.checked)} />
                            <Accessibility size={16} /> Planta baja
                        </label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.84rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={busq.camaExtra} onChange={(e) => set('camaExtra', e.target.checked)} />
                            Cama extra (+$250/noche)
                        </label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.84rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={busq.cuna} onChange={(e) => set('cuna', e.target.checked)} />
                            <Baby size={16} /> Cuna (+$100/noche)
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button type="button" className="btn btn-secondary" onClick={limpiarBusqueda}>
                            <RotateCcw size={15} /> Limpiar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={buscando}>
                            <Search size={16} /> {buscando ? 'Buscando…' : 'Buscar habitaciones'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Paso 2: Habitaciones Disponibles */}
            {resultados && (
                <div className="content-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <BedDouble size={18} /> 2. Habitaciones Disponibles ({resultados.length})
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Selecciona una opción para avanzar al paso 3
                        </span>
                    </div>

                    {resultados.length === 0 && (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <p>No hay habitaciones disponibles con esos criterios. Prueba con otras fechas o ajusta los filtros.</p>
                        </div>
                    )}

                    <div className="room-selection-grid">
                        {resultados.map(({ habitacion: h, tarifa: t, plantaBaja: pb }) => {
                            const activa = seleccion?.habitacion?.idHabitacion === h.idHabitacion;
                            return (
                                <div
                                    key={h.idHabitacion}
                                    onClick={() => setSeleccion({ habitacion: h, tarifa: t })}
                                    className={`room-selection-card ${activa ? 'selected' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSeleccion({ habitacion: h, tarifa: t }); }}
                                >
                                    <div>
                                        <div className="room-card-header">
                                            <div className="room-badges-wrap">
                                                <span className="room-badge-num">Hab. {h.numero}</span>
                                                <span className="room-badge-floor">Piso {h.piso}</span>
                                            </div>
                                            {activa ? (
                                                <span className="room-badge-selected">
                                                    <CheckCircle2 size={13} /> Seleccionada
                                                </span>
                                            ) : (
                                                <span className="room-badge-status">
                                                    ● Disponible
                                                </span>
                                            )}
                                        </div>

                                        <div className="room-card-body">
                                            <div className="room-card-type">
                                                <BedDouble size={16} />
                                                {h.tipoHabitacion.nombre}
                                            </div>
                                            <div className="room-card-capacity">
                                                <User size={14} /> Capacidad: hasta {h.tipoHabitacion.capacidad} {h.tipoHabitacion.capacidad === 1 ? 'huésped' : 'huéspedes'}
                                            </div>
                                            <div className="room-card-hotel" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <Building2 size={13} /> {h.hotel.nombre}
                                            </div>
                                            {busq.plantaBaja && pb && (
                                                <div className="room-card-accessibility">
                                                    <Accessibility size={15} />
                                                    <span>Planta baja</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="room-card-footer">
                                        <div className="room-card-rate-detail">
                                            <div>{t.noches} noche(s) × {money(t.tarifaBase)}</div>
                                            {t.nochesTemporadaAlta > 0 && (
                                                <div style={{ color: 'var(--badge-prereserva-text)', fontWeight: 600 }}>
                                                    +25% temporada alta ({t.nochesTemporadaAlta} noche{t.nochesTemporadaAlta > 1 ? 's' : ''})
                                                </div>
                                            )}
                                        </div>
                                        <div className="room-card-total-box">
                                            <div className="room-card-total-amount num">{money(t.total)}</div>
                                            <div className="room-card-advance-note">Anticipo 50%: {money(t.anticipoRequerido)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Paso 3: Datos del huésped y garantía */}
            {seleccion && (
                <FormularioHuesped
                    busq={busq} seleccion={seleccion}
                    onCreada={setCreada} onCancelar={() => setSeleccion(null)} />
            )}
        </div>
    );
}

// ------------------------------------------------------------------
// DATOS DEL HUÉSPED + PAGO (CON LIMPIEZA COMPLETA DE CAMPOS)
// ------------------------------------------------------------------
function FormularioHuesped({ busq, seleccion, onCreada, onCancelar }) {
    const { habitacion: h, tarifa: t } = seleccion;
    const { user } = useAuth();
    const [huespedes, setHuespedes] = useState([]);
    const [huespedIdSeleccionado, setHuespedIdSeleccionado] = useState('');
    const [f, setF] = useState({
        idHuesped: null,
        nombre: '',
        telefono: '',
        email: '',
        observaciones: '',
        modalidad: 'PRE_RESERVA',
        horasVigencia: 24,
        anticipo: t.anticipoRequerido,
        metodoPago: 'EFECTIVO'
    });
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => { setF((x) => ({ ...x, anticipo: t.anticipoRequerido })); }, [t.anticipoRequerido]);

    useEffect(() => {
        buscarHuespedes('').then((data) => {
            if (Array.isArray(data)) setHuespedes(data);
        }).catch(() => {});
    }, []);

    const handleSelectHuesped = (idStr) => {
        setHuespedIdSeleccionado(idStr);
        if (!idStr) {
            setF((prev) => ({ ...prev, idHuesped: null }));
            return;
        }
        const found = huespedes.find((item) => String(item.idHuesped) === idStr);
        if (found) {
            setF((prev) => ({
                ...prev,
                idHuesped: found.idHuesped,
                nombre: found.nombre || '',
                telefono: found.telefono || '',
                email: found.email || ''
            }));
        }
    };

    // Limpieza completa de todos los datos del formulario de huésped
    const limpiarCamposHuesped = () => {
        setHuespedIdSeleccionado('');
        setF({
            idHuesped: null,
            nombre: '',
            telefono: '',
            email: '',
            observaciones: '',
            modalidad: 'PRE_RESERVA',
            horasVigencia: 24,
            anticipo: t.anticipoRequerido,
            metodoPago: 'EFECTIVO'
        });
        setError('');
    };

    const telOk = f.telefono.replace(/\D/g, '').length === 10;
    const emailOk = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(f.email.trim());
    const confirmada = f.modalidad === 'CONFIRMADA';
    const anticipoNum = parseFloat(f.anticipo) || 0;
    const saldo = confirmada ? Math.max(t.total - anticipoNum, 0) : t.total;

    const guardar = async (e) => {
        e.preventDefault();
        setError('');
        if (!telOk) return setError('El teléfono debe tener 10 dígitos.');
        if (!emailOk) return setError('Correo electrónico inválido.');
        setGuardando(true);
        try {
            const reserva = await crearReserva({
                idHabitacion: h.idHabitacion,
                fechaEntrada: busq.fechaEntrada, fechaSalida: busq.fechaSalida,
                adultos: busq.adultos, ninos: busq.ninos,
                cuna: busq.cuna, camaExtra: busq.camaExtra, plantaBajaSolicitada: busq.plantaBaja,
                observaciones: f.observaciones,
                idHuesped: f.idHuesped || null,
                nombre: f.nombre, telefono: f.telefono.replace(/\D/g, ''), email: f.email,
                modalidad: f.modalidad, horasVigencia: f.horasVigencia,
                anticipo: confirmada ? anticipoNum : null,
                metodoPago: confirmada ? f.metodoPago : null
            });
            onCreada(reserva);
        } catch (err) { setError(err.message); }
        finally { setGuardando(false); }
    };

    return (
        <form onSubmit={guardar} className="content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <User size={18} /> 3. Datos del huésped y garantía
                </h2>
                <button
                    type="button"
                    className="btn-link"
                    onClick={limpiarCamposHuesped}
                    style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}
                    title="Limpiar todos los datos del huésped"
                >
                    <RotateCcw size={14} />
                    <span>Limpiar datos del formulario</span>
                </button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} />{error}</div>}

            {/* Selector de Huésped Anterior */}
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--admin-accent)' }}>
                        <UserCheck size={16} /> Autocompletar con huésped registrado
                    </label>
                    {huespedIdSeleccionado && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: 26, minHeight: 26, padding: '0 8px', fontSize: '0.74rem' }}
                            onClick={() => handleSelectHuesped('')}
                        >
                            Quitar selección
                        </button>
                    )}
                </div>
                <select
                    className="form-select"
                    value={huespedIdSeleccionado}
                    onChange={(e) => handleSelectHuesped(e.target.value)}
                >
                    <option value="">-- Seleccionar de la lista para autocompletar --</option>
                    {huespedes.map((gh) => (
                        <option key={gh.idHuesped} value={gh.idHuesped}>
                            {gh.nombre}{gh.telefono ? ` — ${gh.telefono}` : ''}{gh.email ? ` · ${gh.email}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group">
                    <label className="form-label">Nombre completo *</label>
                    <input className="form-input" required minLength={3} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value, idHuesped: null })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Teléfono (10 dígitos) *</label>
                    <input className="form-input" required inputMode="numeric" maxLength={14}
                        value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Correo electrónico *</label>
                    <input className="form-input" required type="email"
                        value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Registrada por (sesión)</label>
                    <input
                        className="form-input"
                        type="text"
                        readOnly
                        value={user?.nombre || user?.email || 'Personal autenticado'}
                        style={{ opacity: 0.85, cursor: 'default' }}
                    />
                </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Peticiones especiales / observaciones</label>
                <textarea className="form-input" rows={2} style={{ width: '100%' }} value={f.observaciones}
                    onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div className="summary-box">
                    <label className="form-label" style={{ marginBottom: '0.5rem' }}>Modalidad de reservación</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
                        <input type="radio" name="modalidad" checked={!confirmada} onChange={() => setF({ ...f, modalidad: 'PRE_RESERVA' })} />
                        <Clock size={15} /> Pre-reserva (sin pago, vigencia temporal)
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.84rem', cursor: 'pointer' }}>
                        <input type="radio" name="modalidad" checked={confirmada} onChange={() => setF({ ...f, modalidad: 'CONFIRMADA' })} />
                        <Banknote size={15} /> Confirmar con anticipo (≥ 50%)
                    </label>

                    {!confirmada ? (
                        <div style={{ marginTop: 10 }}>
                            <label className="form-label">Vigencia límite</label>
                            <select className="form-select" value={f.horasVigencia} onChange={(e) => setF({ ...f, horasVigencia: parseInt(e.target.value, 10) })}>
                                <option value={24}>24 horas</option>
                                <option value={48}>48 horas</option>
                            </select>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                La habitación se libera automáticamente al expirar este plazo si no se registra el pago.
                            </p>
                        </div>
                    ) : (
                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div className="form-group">
                                <label className="form-label">Anticipo ($)</label>
                                <input className="form-input" type="number" step="0.01" min={t.anticipoRequerido} max={t.total}
                                    value={f.anticipo} onChange={(e) => setF({ ...f, anticipo: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Método</label>
                                <select className="form-select" value={f.metodoPago} onChange={(e) => setF({ ...f, metodoPago: e.target.value })}>
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                                    <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="summary-box summary-box-highlight">
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Resumen financiero</strong>
                    <div style={{ marginTop: 6, lineHeight: 1.6, fontSize: '0.82rem' }}>
                        <div><b>Hotel:</b> {h.hotel.nombre} · Hab. {h.numero} ({h.tipoHabitacion.nombre})</div>
                        <div><b>Estancia:</b> {busq.fechaEntrada} → {busq.fechaSalida} ({t.noches} noche{t.noches > 1 ? 's' : ''})</div>
                        <div><b>Ocupantes:</b> {busq.adultos} adulto(s), {busq.ninos} niño(s)</div>
                        {t.extras > 0 && <div><b>Extras:</b> {money(t.extras)}</div>}
                        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-default)' }}>
                            <b>Total estancia:</b> <span className="num" style={{ fontWeight: 700 }}>{money(t.total)}</span>
                        </div>
                        <div><b>Anticipo 50%:</b> {money(t.anticipoRequerido)}</div>
                        <div style={{ color: 'var(--admin-accent)', fontWeight: 600 }}>
                            Saldo a liquidar en check-in: {money(saldo)}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                    <CheckCircle2 size={16} /> {guardando ? 'Guardando…' : confirmada ? 'Confirmar reservación' : 'Registrar pre-reserva'}
                </button>
            </div>
        </form>
    );
}

// ------------------------------------------------------------------
// COMPROBANTE
// ------------------------------------------------------------------
function Comprobante({ reserva: r, onNueva, irALista }) {
    return (
        <div className="content-card" id="comprobante-reserva">
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                <CheckCircle2 size={18} /> Reservación registrada correctamente. Folio: <b className="num">{r.folio}</b>
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Hotel Paraíso — Confirmación de reservación
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', margin: '1rem 0', lineHeight: 1.6, fontSize: '0.84rem' }}>
                <div className="summary-box">
                    <div><b>Folio:</b> <span className="num">{r.folio}</span></div>
                    <div><b>Estado:</b> <EstadoBadge estado={r.estado} /></div>
                    <div><b>Huésped:</b> {r.huesped?.nombre}</div>
                    <div><b>Teléfono:</b> {r.huesped?.telefono}</div>
                    <div><b>Correo:</b> {r.huesped?.email}</div>
                </div>
                <div className="summary-box">
                    <div><b>Hotel:</b> {r.habitacion?.hotel?.nombre}</div>
                    <div><b>Habitación:</b> #{r.habitacion?.numero} ({r.habitacion?.tipoHabitacion?.nombre})</div>
                    <div><b>Llegada:</b> {r.fechaEntrada} (15:00 h)</div>
                    <div><b>Salida:</b> {r.fechaSalida} (12:00 h)</div>
                    <div><b>Ocupantes:</b> {r.adultos} adultos, {r.ninos} niños</div>
                </div>
                <div className="summary-box">
                    <div><b>Total estancia:</b> <span className="num">{money(r.total)}</span></div>
                    <div><b>Anticipo cubierto:</b> <span className="num">{money(r.anticipo)}</span></div>
                    <div><b>Saldo en check-in:</b> <span className="num">{money(r.saldo)}</span></div>
                    {r.estado === 'Pre-reserva' && (
                        <div style={{ color: 'var(--badge-prereserva-text)', fontWeight: 600, marginTop: 4 }}>
                            Vence: {fmtFechaHora(r.fechaExpiracion)}
                        </div>
                    )}
                </div>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Presentar esta confirmación y una identificación oficial vigente en recepción al momento del check-in.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => imprimirComprobanteReserva(r)}>
                    <Printer size={16} /> Imprimir comprobante
                </button>
                <button type="button" className="btn btn-secondary" onClick={irALista}>
                    <ClipboardList size={16} /> Ver reservaciones
                </button>
                <button type="button" className="btn btn-primary" onClick={onNueva}>
                    <CalendarPlus size={16} /> Nueva reservación
                </button>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// LISTA DE RESERVACIONES (CON VISUALIZACIÓN MEJORADA DE FECHAS)
// ------------------------------------------------------------------
function ListaReservas({ onNueva }) {
    const { isAdmin, isGerente, isStaff } = useAuth();
    const puedeRevertirNoShow = isGerente || isAdmin;
    const [reservas, setReservas] = useState([]);
    const [hoteles, setHoteles] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [hotelFiltro, setHotelFiltro] = useState('');
    const [entradaDesde, setEntradaDesde] = useState('');
    const [entradaHasta, setEntradaHasta] = useState('');
    // Filtro dedicado "Hoy": incluye llegadas de hoy, estancias activas hoy y reservas registradas hoy
    const [soloHoy, setSoloHoy] = useState(false);
    const [sort, setSort] = useState('fechaCreacion,desc');
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [kpis, setKpis] = useState({ total: 0, confirmadas: 0, prereservas: 0, canceladas: 0 });
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const [modal, setModal] = useState(null);
    const [reservaAEliminar, setReservaAEliminar] = useState(null);
    const [accionEstancia, setAccionEstancia] = useState(null);
    const [busqueda, setBusqueda] = useState(() => {
        const saved = sessionStorage.getItem('hotel_filtro_reserva_q');
        if (saved) {
            sessionStorage.removeItem('hotel_filtro_reserva_q');
            return saved;
        }
        return '';
    });
    const [busquedaDebounced, setBusquedaDebounced] = useState(busqueda);
    const [mensajeExito, setMensajeExito] = useState('');
    const [fechasOpen, setFechasOpen] = useState(false);
    const [menuAbiertoId, setMenuAbiertoId] = useState(null);
    const menuWrapRef = useRef(null);

    useEffect(() => {
        const onAplicarFiltro = () => {
            const saved = sessionStorage.getItem('hotel_filtro_reserva_q');
            if (saved) {
                sessionStorage.removeItem('hotel_filtro_reserva_q');
                setFiltro('');
                setHotelFiltro('');
                setEntradaDesde('');
                setEntradaHasta('');
                setBusqueda(saved);
                setBusquedaDebounced(saved);
                setPage(0);
            }
        };
        window.addEventListener('hotel:aplicar-filtro-reservas', onAplicarFiltro);
        return () => window.removeEventListener('hotel:aplicar-filtro-reservas', onAplicarFiltro);
    }, []);

    useEffect(() => {
        const handleOutside = (e) => {
            if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
                setMenuAbiertoId(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    useEffect(() => {
        getHoteles()
            .then(data => setHoteles(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setBusquedaDebounced(busqueda);
            setPage(0);
        }, 350);
        return () => clearTimeout(timer);
    }, [busqueda]);

    const cargar = useCallback(async ({ silencioso = false } = {}) => {
        if (!silencioso) {
            setCargando(true);
        }
        try {
            const [paginaData, resumenData] = await Promise.all([
                getReservas({
                    page,
                    size,
                    sort,
                    estado: filtro || undefined,
                    hotelId: hotelFiltro ? Number(hotelFiltro) : undefined,
                    entradaDesde: soloHoy ? undefined : (entradaDesde || undefined),
                    entradaHasta: soloHoy ? undefined : (entradaHasta || undefined),
                    soloHoy: soloHoy || undefined,
                    q: busquedaDebounced || undefined,
                }),
                getResumenEstadosReservas()
            ]);
            setReservas(Array.isArray(paginaData?.content) ? paginaData.content : []);
            setTotalElements(paginaData?.totalElements ?? 0);
            setTotalPages(paginaData?.totalPages ?? 0);
            if (resumenData) {
                setKpis({
                    total: resumenData.total ?? 0,
                    confirmadas: resumenData.confirmadas ?? 0,
                    prereservas: resumenData.prereservas ?? 0,
                    canceladas: resumenData.canceladas ?? 0,
                });
            }
            setError('');
        } catch (e) {
            setError(e.message);
        } finally {
            if (!silencioso) {
                setCargando(false);
            }
        }
    }, [page, size, sort, filtro, hotelFiltro, entradaDesde, entradaHasta, soloHoy, busquedaDebounced]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // Polling de 60s refresca SOLO la página visible con sus filtros actuales, sin perder página ni scroll
    useEffect(() => {
        const t = setInterval(() => {
            cargar({ silencioso: true });
        }, 60000);
        return () => clearInterval(t);
    }, [cargar]);

    const visibles = reservas;

    const horasRestantes = (r) => (r.fechaExpiracion ? (new Date(r.fechaExpiracion) - new Date()) / 3600000 : null);

    const handleConfirmarEliminar = async () => {
        if (!reservaAEliminar) return;
        try {
            await eliminarReserva(reservaAEliminar.idReserva);
            setReservaAEliminar(null);
            await cargar();
        } catch (err) {
            setError(err.message || 'Error al eliminar la reservación.');
            setReservaAEliminar(null);
        }
    };

    const handleConfirmarAccionEstancia = async () => {
        if (!accionEstancia) return;
        const { tipo, reserva: r } = accionEstancia;
        try {
            setError('');
            if (tipo === 'check-in') {
                await checkInReserva(r.idReserva);
                setMensajeExito(`Check-In registrado para ${r.folio} (Hab. #${r.habitacion?.numero}).`);
            } else if (tipo === 'no-show') {
                await marcarNoShowReserva(r.idReserva);
                setMensajeExito(`No-Show declarado para ${r.folio}. El anticipo queda retenido.`);
            } else if (tipo === 'revertir-no-show') {
                await revertirNoShowReserva(r.idReserva);
                setMensajeExito(`No-Show revertido para ${r.folio}. Estado restaurado a Confirmada.`);
            } else if (tipo === 'extender') {
                await extenderDiaExtraReserva(r.idReserva);
                setMensajeExito(`Estancia extendida 1 noche adicional para ${r.folio}.`);
            }
            setAccionEstancia(null);
            await cargar();
            window.dispatchEvent(new CustomEvent('hotel:reserva-actualizada'));
        } catch (err) {
            setError(err.message || 'No se pudo completar la operación.');
            setAccionEstancia(null);
        }
    };

    const filtroHoyActivo = soloHoy;
    const hayFiltrosActivos = Boolean(filtro || hotelFiltro || soloHoy || entradaDesde || entradaHasta || busqueda.trim());
    const inicioRango = totalElements === 0 ? 0 : page * size + 1;
    const finRango = Math.min(inicioRango + visibles.length - 1, totalElements);

    // Activa o desactiva el filtro "Hoy" sin depender de un rango estricto entradaDesde=entradaHasta
    const toggleFiltroHoy = () => {
        if (soloHoy) {
            setSoloHoy(false);
        } else {
            setSoloHoy(true);
            setEntradaDesde('');
            setEntradaHasta('');
        }
        setPage(0);
    };

    const limpiarFiltrosLista = () => {
        setFiltro('');
        setHotelFiltro('');
        setSoloHoy(false);
        setEntradaDesde('');
        setEntradaHasta('');
        setBusqueda('');
        setBusquedaDebounced('');
        setPage(0);
    };

    return (
        <div>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} />{error}</div>}
            {mensajeExito && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><CheckCircle2 size={16} />{mensajeExito}</div>}

            {/* 4 KPIs Compactos Clicables (Cohesivos con Informes) */}
            <section className="res-kpi-grid" aria-label="Resumen de reservaciones">
                <button
                    type="button"
                    className={`res-kpi-card ${filtro === '' ? 'is-active' : ''}`}
                    onClick={() => { setFiltro(''); setPage(0); }}
                >
                    <div className="res-kpi-label">Total Reservaciones</div>
                    <div className="res-kpi-val">{Number(kpis.total || 0).toLocaleString('es-MX')}</div>
                    <div className="res-kpi-sub">Registros en sistema</div>
                </button>

                <button
                    type="button"
                    className={`res-kpi-card ${filtro === 'Confirmada' ? 'is-active' : ''}`}
                    onClick={() => { setFiltro('Confirmada'); setPage(0); }}
                >
                    <div className="res-kpi-label">Confirmadas</div>
                    <div className="res-kpi-val">{Number(kpis.confirmadas || 0).toLocaleString('es-MX')}</div>
                    <div className="res-kpi-sub">Listas para Check-In</div>
                </button>

                <button
                    type="button"
                    className={`res-kpi-card is-terra ${filtro === 'Pre-reserva' ? 'is-active' : ''}`}
                    onClick={() => { setFiltro('Pre-reserva'); setPage(0); }}
                >
                    <div className="res-kpi-label">Pre-reservas</div>
                    <div className="res-kpi-val">{Number(kpis.prereservas || 0).toLocaleString('es-MX')}</div>
                    <div className="res-kpi-sub">Pendientes de anticipo</div>
                </button>

                <button
                    type="button"
                    className={`res-kpi-card is-danger ${filtro === 'Cancelada' ? 'is-active' : ''}`}
                    onClick={() => { setFiltro('Cancelada'); setPage(0); }}
                >
                    <div className="res-kpi-label">Canceladas</div>
                    <div className="res-kpi-val">{Number(kpis.canceladas || 0).toLocaleString('es-MX')}</div>
                    <div className="res-kpi-sub">Estancias anuladas</div>
                </button>
            </section>

            {/* Barra unificada de filtros en 1 sola línea */}
            <div className="res-filter-bar res-anim-up res-delay-1">
                <div className="res-search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Folio, titular, correo o teléfono..."
                        className="res-search-input"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        aria-label="Buscar reservaciones"
                    />
                </div>

                <div className="res-select-wrap">
                    <select
                        className="res-select"
                        value={filtro}
                        onChange={(e) => { setFiltro(e.target.value); setPage(0); }}
                        aria-label="Filtrar por estado"
                    >
                        <option value="">Todos los estados</option>
                        <option value="Pre-reserva">Pre-reserva</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="Ocupada">Ocupada</option>
                        <option value="Finalizada">Finalizada</option>
                        <option value="No-Show">No-Show</option>
                        <option value="Cancelada">Cancelada</option>
                    </select>
                    <ChevronDown size={13} className="res-select-chevron" />
                </div>

                <div className="res-select-wrap">
                    <select
                        className="res-select"
                        value={hotelFiltro}
                        onChange={(e) => { setHotelFiltro(e.target.value); setPage(0); }}
                        aria-label="Filtrar por hotel"
                    >
                        <option value="">Todas las sedes</option>
                        {hoteles.map(h => (
                            <option key={h.idHotel} value={h.idHotel}>{h.nombre}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="res-select-chevron" />
                </div>

                <div className="res-select-wrap">
                    <select
                        className="res-select"
                        value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(0); }}
                        aria-label="Ordenar por"
                    >
                        <option value="fechaCreacion,desc">Más recientes</option>
                        <option value="fechaEntrada,desc">Entrada (desc)</option>
                        <option value="fechaEntrada,asc">Entrada (asc)</option>
                        {!isAdmin && <option value="total,desc">Mayor total</option>}
                        {!isAdmin && <option value="total,asc">Menor total</option>}
                    </select>
                    <ChevronDown size={13} className="res-select-chevron" />
                </div>

                <button
                    type="button"
                    className={`res-fechas-btn ${filtroHoyActivo ? 'is-active' : ''}`}
                    onClick={toggleFiltroHoy}
                    title="Mostrar únicamente llegadas programadas para hoy"
                >
                    <Clock size={14} />
                    <span>Hoy</span>
                </button>

                <button
                    type="button"
                    className={`res-fechas-btn ${(fechasOpen || ((entradaDesde || entradaHasta) && !filtroHoyActivo)) ? 'is-active' : ''}`}
                    onClick={() => setFechasOpen(prev => !prev)}
                    aria-expanded={fechasOpen}
                >
                    <Calendar size={14} />
                    <span>Fechas</span>
                </button>

                {hayFiltrosActivos && (
                    <button type="button" className="res-clear-btn" onClick={limpiarFiltrosLista}>
                        Limpiar
                    </button>
                )}
            </div>

            {/* Rango de fechas desplegable */}
            {fechasOpen && (
                <div className="res-fechas-drawer">
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rango de llegada:</span>
                    <label className="res-date-field">
                        <span>Desde</span>
                        <input
                            type="date"
                            className="res-date-input"
                            value={entradaDesde}
                            onChange={(e) => { setEntradaDesde(e.target.value); setPage(0); }}
                        />
                    </label>
                    <label className="res-date-field">
                        <span>Hasta</span>
                        <input
                            type="date"
                            className="res-date-input"
                            value={entradaHasta}
                            onChange={(e) => { setEntradaHasta(e.target.value); setPage(0); }}
                        />
                    </label>
                </div>
            )}

            {/* Tabla limpia (0% overflow, 1 acción directa + menú contextual ⋯) */}
            <div className="res-table-card res-anim-up res-delay-2" ref={menuWrapRef}>
                {cargando && reservas.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando reservaciones...</p>
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={38} className="empty-icon" />
                        <h3>No hay reservaciones</h3>
                        <p>No se encontraron registros con los filtros actuales.</p>
                        {hayFiltrosActivos && (
                            <button type="button" className="res-page-btn" onClick={limpiarFiltrosLista}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="res-table">
                        <thead>
                            <tr>
                                <th>Folio / Huésped</th>
                                <th>Habitación / Sede</th>
                                <th>Estancia</th>
                                {!isAdmin && <th className="num">Total / Saldo</th>}
                                <th>Estado</th>
                                <th className="num">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((r) => {
                                const hr = horasRestantes(r);
                                const alerta = r.estado === 'Pre-reserva' && hr !== null && hr <= 4;
                                const puedeEditar = r.estado === 'Pre-reserva' || r.estado === 'Confirmada';
                                const puedeCancelar = r.estado === 'Pre-reserva' || r.estado === 'Confirmada';
                                const puedeEliminar = isAdmin && r.estado !== 'Ocupada';
                                const menuAbierto = menuAbiertoId === r.idReserva;

                                // Determinar acción principal directa según estado y rol
                                let accionPrincipal = null;
                                if (isStaff && r.estado === 'Confirmada') {
                                    accionPrincipal = {
                                        label: 'Check-In',
                                        tone: 'is-palm',
                                        icon: LogIn,
                                        onClick: () => setAccionEstancia({ tipo: 'check-in', reserva: r })
                                    };
                                } else if (!isAdmin && r.estado === 'Pre-reserva') {
                                    accionPrincipal = {
                                        label: 'Anticipo',
                                        tone: 'is-ocean',
                                        icon: Banknote,
                                        onClick: () => setModal({ tipo: 'pagar', reserva: r })
                                    };
                                } else if (isStaff && r.estado === 'Ocupada') {
                                    accionPrincipal = {
                                        label: 'Check-Out',
                                        tone: 'is-palm',
                                        icon: LogOut,
                                        onClick: () => setModal({ tipo: 'check-out', reserva: r })
                                    };
                                } else if (puedeRevertirNoShow && r.estado === 'No-Show') {
                                    accionPrincipal = {
                                        label: 'Revertir',
                                        tone: 'is-ghost',
                                        icon: RotateCcw,
                                        onClick: () => setAccionEstancia({ tipo: 'revertir-no-show', reserva: r })
                                    };
                                }

                                const tieneSecundarias = Boolean(
                                    accionPrincipal || puedeEditar || puedeCancelar || puedeEliminar
                                );
                                const PrimaryIcon = accionPrincipal?.icon;

                                return (
                                    <tr key={r.idReserva}>
                                        <td>
                                            <div className="res-cell-main res-nowrap">{r.folio}</div>
                                            <div className="res-cell-sub">
                                                {r.huesped?.nombre}
                                                {r.huesped?.telefono ? <span className="res-nowrap"> &middot; {r.huesped.telefono}</span> : ''}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="res-cell-main" style={{ fontWeight: 600 }}>
                                                Hab. {r.habitacion?.numero}
                                                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> &middot; {r.habitacion?.tipoHabitacion?.nombre}</span>
                                            </div>
                                            <div className="res-cell-sub">{r.habitacion?.hotel?.nombre}</div>
                                        </td>

                                        <td className="res-nowrap">
                                            <div style={{ fontWeight: 600 }}>
                                                {formatearFechaSinAno(r.fechaEntrada)} &rarr; {formatearFechaSinAno(r.fechaSalida)}
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> ({r.noches}n)</span>
                                            </div>
                                            {r.porDesocuparse ? (
                                                <div className="res-alert-inline">
                                                    <Clock size={11} />
                                                    <span>Desocupa hoy</span>
                                                </div>
                                            ) : r.estado === 'Pre-reserva' && r.fechaExpiracion ? (
                                                <div className={`res-alert-inline ${alerta ? 'is-danger' : ''}`}>
                                                    {alerta && <AlertTriangle size={11} />}
                                                    <span>Vence {fmtFechaHora(r.fechaExpiracion)}</span>
                                                </div>
                                            ) : (
                                                <div className="res-cell-sub">
                                                    {r.adultos} {r.adultos === 1 ? 'adulto' : 'adultos'}
                                                    {r.ninos > 0 ? `, ${r.ninos} ${r.ninos === 1 ? 'niño' : 'niños'}` : ''}
                                                </div>
                                            )}
                                        </td>

                                        {!isAdmin && (
                                            <td className="num">
                                                <div style={{ fontWeight: 700 }}>{money(r.total)}</div>
                                                <div className="res-cell-sub" style={{
                                                    color: Number(r.saldo || 0) > 0 ? '#b85d38' : '#2d5a43',
                                                    fontWeight: 600
                                                }}>
                                                    {Number(r.saldo || 0) > 0 ? `Saldo: ${money(r.saldo)}` : 'Liquidado'}
                                                </div>
                                            </td>
                                        )}

                                        <td>
                                            <span className={resBadgeClase(r.estado)}>{r.estado}</span>
                                            {r.salidaPendiente && (
                                                <div className="res-alert-inline is-danger" style={{ display: 'flex' }}>
                                                    <AlertTriangle size={11} />
                                                    <span>Salida pendiente</span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="num">
                                            <div className="res-action-cell">
                                                {accionPrincipal ? (
                                                    <button
                                                        type="button"
                                                        className={`res-primary-act ${accionPrincipal.tone}`}
                                                        onClick={accionPrincipal.onClick}
                                                    >
                                                        {PrimaryIcon && <PrimaryIcon size={13} />}
                                                        <span>{accionPrincipal.label}</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="res-primary-act is-ghost"
                                                        onClick={() => setModal({ tipo: 'detalle', reserva: r })}
                                                    >
                                                        <Eye size={13} />
                                                        <span>Ver</span>
                                                    </button>
                                                )}

                                                {tieneSecundarias && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={`res-more-btn ${menuAbierto ? 'is-open' : ''}`}
                                                            onClick={() => setMenuAbiertoId(menuAbierto ? null : r.idReserva)}
                                                            aria-label="Más acciones"
                                                            aria-expanded={menuAbierto}
                                                        >
                                                            <MoreHorizontal size={15} />
                                                        </button>

                                                        {menuAbierto && (
                                                            <div className="res-menu" role="menu">
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className="res-menu-item"
                                                                    onClick={() => { setMenuAbiertoId(null); setModal({ tipo: 'detalle', reserva: r }); }}
                                                                >
                                                                    <Eye size={14} />
                                                                    <span>Ver detalle</span>
                                                                </button>

                                                                {puedeEditar && (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="res-menu-item"
                                                                        onClick={() => { setMenuAbiertoId(null); setModal({ tipo: 'editar', reserva: r }); }}
                                                                    >
                                                                        <Edit2 size={14} />
                                                                        <span>Editar reservación</span>
                                                                    </button>
                                                                )}

                                                                {isStaff && r.estado === 'Ocupada' && (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="res-menu-item"
                                                                        onClick={() => { setMenuAbiertoId(null); setAccionEstancia({ tipo: 'extender', reserva: r }); }}
                                                                    >
                                                                        <CalendarPlus size={14} />
                                                                        <span>Extender 1 noche</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    className="res-menu-item"
                                                                    onClick={() => { setMenuAbiertoId(null); imprimirComprobanteReserva(r, { ocultarFinanzas: isAdmin }); }}
                                                                >
                                                                    <Printer size={14} />
                                                                    <span>Imprimir comprobante</span>
                                                                </button>

                                                                {(isStaff && r.estado === 'Confirmada') || puedeCancelar || puedeEliminar ? (
                                                                    <div className="res-menu-sep" />
                                                                ) : null}

                                                                {isStaff && r.estado === 'Confirmada' && (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="res-menu-item is-warn"
                                                                        onClick={() => { setMenuAbiertoId(null); setAccionEstancia({ tipo: 'no-show', reserva: r }); }}
                                                                    >
                                                                        <UserX size={14} />
                                                                        <span>Marcar No-Show</span>
                                                                    </button>
                                                                )}

                                                                {puedeCancelar && (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="res-menu-item is-danger"
                                                                        onClick={() => { setMenuAbiertoId(null); setModal({ tipo: 'cancelar', reserva: r }); }}
                                                                    >
                                                                        <XCircle size={14} />
                                                                        <span>Cancelar reservación</span>
                                                                    </button>
                                                                )}

                                                                {puedeEliminar && (
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="res-menu-item is-danger"
                                                                        onClick={() => { setMenuAbiertoId(null); setReservaAEliminar(r); }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        <span>Eliminar registro</span>
                                                                    </button>
                                                                )}
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
                )}

                {totalElements > 0 && (
                    <div className="res-pagination">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span>
                                Mostrando <strong style={{ color: 'var(--text-primary)' }}>{inicioRango}&ndash;{finRango}</strong> de{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{totalElements.toLocaleString('es-MX')}</strong> registros
                            </span>
                            <span style={{ color: 'var(--border-strong)' }}>|</span>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span>Por página:</span>
                                <select
                                    value={size}
                                    onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                                    style={{
                                        background: 'var(--bg-surface)', color: 'var(--text-primary)',
                                        border: '1px solid var(--border-default)', borderRadius: 7, padding: '3px 7px',
                                        fontSize: '0.78rem', fontWeight: 600
                                    }}
                                    aria-label="Tamaño de página"
                                >
                                    {[10, 20, 50, 100].map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    type="button"
                                    className="res-page-btn"
                                    disabled={page <= 0 || cargando}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                >
                                    Anterior
                                </button>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Página {page + 1} de {totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="res-page-btn"
                                    disabled={page + 1 >= totalPages || cargando}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modales de Gestión de Reserva */}
            {modal?.tipo === 'pagar' && <ModalPago reserva={modal.reserva} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
            {modal?.tipo === 'check-out' && <ModalCheckOut reserva={modal.reserva} onClose={() => setModal(null)} onDone={() => { setModal(null); setMensajeExito(`Check-Out completado y saldo liquidado para ${modal.reserva.folio}.`); cargar(); window.dispatchEvent(new CustomEvent('hotel:reserva-actualizada')); }} />}
            {modal?.tipo === 'cancelar' && <ModalCancelar reserva={modal.reserva} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
            {modal?.tipo === 'detalle' && <ModalDetalleReserva reserva={modal.reserva} ocultarFinanzas={isAdmin} onClose={() => setModal(null)} />}
            {modal?.tipo === 'editar' && <ModalEditarReserva reserva={modal.reserva} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}

            {/* ConfirmDialog para acciones de ciclo de estancia (Check-In / No-Show / Revertir) */}
            <ConfirmDialog
                isOpen={Boolean(accionEstancia)}
                onClose={() => setAccionEstancia(null)}
                onConfirm={handleConfirmarAccionEstancia}
                title={
                    accionEstancia?.tipo === 'check-in'
                        ? '¿Registrar Check-In?'
                        : accionEstancia?.tipo === 'no-show'
                            ? '¿Declarar No-Show?'
                            : accionEstancia?.tipo === 'extender'
                                ? '¿Extender 1 noche adicional?'
                                : '¿Revertir No-Show a Confirmada?'
                }
                subtitle={accionEstancia?.reserva ? `Folio ${accionEstancia.reserva.folio}` : ''}
                message={
                    accionEstancia?.tipo === 'check-in' ? (
                        <>
                            Se registrará la entrada del huésped <strong>{accionEstancia.reserva?.huesped?.nombre}</strong> a la habitación <strong>#{accionEstancia.reserva?.habitacion?.numero}</strong>. La reservación pasará a estado <strong>Ocupada</strong>.
                        </>
                    ) : accionEstancia?.tipo === 'no-show' ? (
                        <>
                            Se marcará la reservación de <strong>{accionEstancia.reserva?.huesped?.nombre}</strong> como <strong>No-Show</strong>. El anticipo cubierto se conserva como penalización y la habitación quedará disponible.
                        </>
                    ) : accionEstancia?.tipo === 'extender' ? (
                        <>
                            Se agregará <strong>1 noche adicional</strong> a la estancia de <strong>{accionEstancia.reserva?.huesped?.nombre}</strong> en la habitación <strong>#{accionEstancia.reserva?.habitacion?.numero}</strong> (sujeto a disponibilidad).
                        </>
                    ) : accionEstancia?.reserva ? (
                        <>
                            Se restaurará la reservación de <strong>{accionEstancia.reserva?.huesped?.nombre}</strong> al estado <strong>Confirmada</strong> (solo permitido dentro de 24 hrs y si la habitación sigue libre).
                        </>
                    ) : ''
                }
                confirmText={
                    accionEstancia?.tipo === 'check-in'
                        ? 'Confirmar Check-In'
                        : accionEstancia?.tipo === 'no-show'
                            ? 'Declarar No-Show'
                            : accionEstancia?.tipo === 'extender'
                                ? 'Extender estancia'
                                : 'Revertir a Confirmada'
                }
                cancelText="Cancelar"
                type={accionEstancia?.tipo === 'no-show' ? 'warning' : 'info'}
            />

            {/* ConfirmDialog de Eliminación */}
            <ConfirmDialog
                isOpen={Boolean(reservaAEliminar)}
                onClose={() => setReservaAEliminar(null)}
                onConfirm={handleConfirmarEliminar}
                title="¿Eliminar reservación?"
                subtitle="Gestión de Reservaciones"
                message={
                    reservaAEliminar ? (
                        <>
                            ¿Está seguro de que desea eliminar permanentemente la reservación con folio <strong>"{reservaAEliminar.folio}"</strong> a nombre de <strong>{reservaAEliminar.huesped?.nombre}</strong>?
                            Esta acción retirará el registro del sistema y liberará la habitación asociada.
                        </>
                    ) : ''
                }
                confirmText="Sí, eliminar reservación"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
}

// ------------------------------------------------------------------
// MODALES AUXILIARES
// ------------------------------------------------------------------
function ModalPago({ reserva: r, onClose, onDone }) {
    const minimo = Math.round(r.total * 50) / 100;
    const [anticipo, setAnticipo] = useState(minimo);
    const [metodo, setMetodo] = useState('EFECTIVO');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const enviar = async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try { await confirmarReserva(r.idReserva, parseFloat(anticipo), metodo); onDone(); }
        catch (err) { setError(err.message); setBusy(false); }
    };
    return (
        <Modal title={`Registrar anticipo — Folio ${r.folio}`} onClose={onClose} icon={Banknote}>
            <form onSubmit={enviar} className="modal-form">
                {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
                <div className="summary-box">
                    Total estancia: <b className="num">{money(r.total)}</b> · Anticipo mínimo requerido (50%): <b className="num">{money(minimo)}</b>
                </div>
                <div className="form-group">
                    <label className="form-label">Monto del anticipo ($ MXN) *</label>
                    <input className="form-input" type="number" step="0.01" min={minimo} max={r.total} value={anticipo} onChange={(e) => setAnticipo(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Método de pago</label>
                    <select className="form-select" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                        <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>Confirmar reservación</button>
                </div>
            </form>
        </Modal>
    );
}

function ModalCheckOut({ reserva: r, onClose, onDone }) {
    const [metodoPagoSaldo, setMetodoPagoSaldo] = useState('EFECTIVO');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const esSalidaAnticipada = r.fechaSalida && hoy() < r.fechaSalida;

    const enviar = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await checkOutReserva(r.idReserva, metodoPagoSaldo);
            onDone();
        } catch (err) {
            setError(err.message || 'No se pudo completar el Check-Out.');
            setBusy(false);
        }
    };

    return (
        <Modal title={`Check-Out y Liquidación — Folio ${r.folio}`} onClose={onClose} icon={LogOut}>
            <form onSubmit={enviar} className="modal-form">
                {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
                <div className="summary-box">
                    Huésped: <b>{r.huesped?.nombre}</b> · Hab. <b>#{r.habitacion?.numero}</b><br />
                    Total estancia: <b className="num">{money(r.total)}</b> · Anticipo: <b className="num">{money(r.anticipo)}</b><br />
                    Saldo pendiente a liquidar: <b className="num" style={{ color: 'var(--color-error)' }}>{money(r.saldo)}</b>
                </div>
                {esSalidaAnticipada && (
                    <div className="alert alert-warning" style={{ fontSize: '0.8rem' }}>
                        <AlertTriangle size={15} /> Salida anticipada: se liquidará el total de la estancia sin reembolso por noches no utilizadas.
                    </div>
                )}
                <div className="form-group">
                    <label className="form-label">Método de pago del saldo *</label>
                    <select className="form-select" value={metodoPagoSaldo} onChange={(e) => setMetodoPagoSaldo(e.target.value)} required>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                        <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy ? 'Finalizando...' : 'Confirmar Check-Out'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ModalCancelar({ reserva: r, onClose, onDone }) {
    const [info, setInfo] = useState(null);
    const [f, setF] = useState({ titular: '', banco: '', clabe: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { getReembolsoReserva(r.idReserva).then(setInfo).catch((e) => setError(e.message)); }, [r.idReserva]);
    const hayReembolso = info && Number(info.monto) > 0;

    const enviar = async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try { await cancelarReserva(r.idReserva, f); onDone(); }
        catch (err) { setError(err.message); setBusy(false); }
    };
    return (
        <Modal title={`Cancelar — ${r.folio}`} onClose={onClose} icon={XCircle}>
            <form onSubmit={enviar} className="modal-form">
                {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}
                {info && (
                    <div className="summary-box">
                        Anticipo pagado: <b className="num">{money(r.anticipo)}</b><br />
                        Reembolso según política: <b className="num">{info.porcentaje}%</b> → <b className="num">{money(info.monto)}</b><br />
                        {hayReembolso && <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>El reembolso debe ser verificado por administración.</span>}
                    </div>
                )}
                {hayReembolso && (
                    <>
                        <div className="form-group">
                            <label className="form-label">Titular de la cuenta *</label>
                            <input className="form-input" required value={f.titular} onChange={(e) => setF({ ...f, titular: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Banco *</label>
                            <input className="form-input" required value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">CLABE interbancaria (18 dígitos) *</label>
                            <input className="form-input" required maxLength={18} inputMode="numeric" value={f.clabe}
                                onChange={(e) => setF({ ...f, clabe: e.target.value.replace(/\D/g, '') })} />
                        </div>
                    </>
                )}
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Volver</button>
                    <button type="submit" className="btn btn-danger" disabled={busy || !info}><XCircle size={16} /> Confirmar cancelación</button>
                </div>
            </form>
        </Modal>
    );
}

function ModalDetalleReserva({ reserva: r, ocultarFinanzas = false, onClose }) {
    if (!r) return null;

    return (
        <Modal title={`Detalle de reservación — ${r.folio}`} onClose={onClose} icon={Eye} maxWidth="580px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.75rem' }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FOLIO OFICIAL</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }} className="num">{r.folio}</div>
                    </div>
                    <EstadoBadge estado={r.estado} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <div className="summary-box">
                        <div className="form-label">Huésped Titular</div>
                        <div style={{ fontWeight: 600 }}>{r.huesped?.nombre}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Phone size={12} /> <span className="num">{r.huesped?.telefono || '—'}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Mail size={12} /> <span>{r.huesped?.email || '—'}</span>
                        </div>
                    </div>

                    <div className="summary-box">
                        <div className="form-label">Habitación Asignada</div>
                        <div style={{ fontWeight: 600 }}>{r.habitacion?.hotel?.nombre}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', marginTop: 2 }}>
                            Hab. #{r.habitacion?.numero} (Piso {r.habitacion?.piso})
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>{r.habitacion?.tipoHabitacion?.nombre}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <div>
                        <div className="form-label">Estancia</div>
                        <div style={{ fontWeight: 600 }} className="num">{formatearFechaCorta(r.fechaEntrada)} → {formatearFechaCorta(r.fechaSalida)}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }} className="num">{r.noches} noche(s) · Desocupa 12:00 h</div>
                    </div>
                    <div>
                        <div className="form-label">Ocupantes y extras</div>
                        <div style={{ fontWeight: 600 }}>{r.adultos} adulto(s), {r.ninos || 0} niño(s)</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                            {r.cuna && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Baby size={12} /> Cuna</span>}
                            {r.camaExtra && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><BedDouble size={12} /> Cama extra</span>}
                            {r.plantaBajaSolicitada && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Accessibility size={12} /> Planta baja</span>}
                        </div>
                    </div>
                </div>

                {!ocultarFinanzas && (
                    <div className="summary-box">
                        <div className="form-label">Desglose Financiero</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span>Total de la estancia:</span>
                            <b className="num">{money(r.total)}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: 'var(--color-success)' }}>
                            <span>Anticipo cubierto:</span>
                            <b className="num">{money(r.anticipo)}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: 4, marginTop: 4 }}>
                            <span>Saldo en check-in:</span>
                            <b className="num" style={{ color: 'var(--color-error)' }}>{money(r.saldo)}</b>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Método de pago del anticipo: {r.metodoPago || 'N/A'}
                            {r.metodoPagoSaldo ? ` · Método pago saldo: ${r.metodoPagoSaldo}` : ''}
                        </div>
                        {(r.checkInAt || r.checkOutAt) && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                {r.checkInAt ? `Check-In: ${fmtFechaHora(r.checkInAt)}` : ''}
                                {r.checkInAt && r.checkOutAt ? ' · ' : ''}
                                {r.checkOutAt ? `Check-Out: ${fmtFechaHora(r.checkOutAt)}` : ''}
                            </div>
                        )}
                    </div>
                )}

                {r.observaciones && (
                    <div>
                        <div className="form-label">Observaciones</div>
                        <div style={{ color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: 8, borderRadius: 4, fontSize: '0.8rem' }}>
                            {r.observaciones}
                        </div>
                    </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Registrada por: <b>{r.recepcionista || 'Sistema'}</b></span>
                    <span>Fecha registro: {fmtFechaHora(r.fechaCreacion)}</span>
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => imprimirComprobanteReserva(r, { ocultarFinanzas })}
                    >
                        <Printer size={15} />
                        <span>Imprimir comprobante</span>
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </Modal>
    );
}

function ModalEditarReserva({ reserva: r, onClose, onDone }) {
    const [nombre, setNombre] = useState(r.huesped?.nombre || '');
    const [telefono, setTelefono] = useState(r.huesped?.telefono || '');
    const [email, setEmail] = useState(r.huesped?.email || '');
    const [fechaEntrada, setFechaEntrada] = useState(r.fechaEntrada || '');
    const [fechaSalida, setFechaSalida] = useState(r.fechaSalida || '');
    const [adultos, setAdultos] = useState(r.adultos || 1);
    const [ninos, setNinos] = useState(r.ninos || 0);
    const [cuna, setCuna] = useState(Boolean(r.cuna));
    const [camaExtra, setCamaExtra] = useState(Boolean(r.camaExtra));
    const [plantaBaja, setPlantaBaja] = useState(Boolean(r.plantaBajaSolicitada));
    const [observaciones, setObservaciones] = useState(r.observaciones || '');

    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const enviar = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');

        try {
            const reqData = {
                idHabitacion: r.habitacion?.idHabitacion,
                fechaEntrada,
                fechaSalida,
                adultos: parseInt(adultos, 10),
                ninos: parseInt(ninos, 10),
                cuna,
                camaExtra,
                plantaBajaSolicitada: plantaBaja,
                observaciones,
                nombre,
                telefono,
                email
            };

            await actualizarReserva(r.idReserva, reqData);
            onDone();
        } catch (err) {
            setError(err.message || 'Error al actualizar la reservación.');
            setBusy(false);
        }
    };

    return (
        <Modal title={`Modificar reservación — ${r.folio}`} onClose={onClose} icon={Edit2} maxWidth="580px">
            <form onSubmit={enviar} className="modal-form">
                {error && <div className="alert alert-error"><AlertTriangle size={16} />{error}</div>}

                <div className="summary-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <b>Habitación:</b> {r.habitacion?.hotel?.nombre} · #{r.habitacion?.numero} ({r.habitacion?.tipoHabitacion?.nombre})
                    </div>
                    <EstadoBadge estado={r.estado} />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Nombre del Huésped *</label>
                        <input className="form-input" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Teléfono (10 dígitos) *</label>
                        <input className="form-input" required maxLength={10} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Correo Electrónico *</label>
                    <input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Llegada *</label>
                        <input className="form-input" type="date" required value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Salida *</label>
                        <input className="form-input" type="date" required min={fechaEntrada} value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} />
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">Adultos</label>
                        <input className="form-input" type="number" min="1" max="6" value={adultos} onChange={(e) => setAdultos(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Niños</label>
                        <input className="form-input" type="number" min="0" max="4" value={ninos} onChange={(e) => setNinos(e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '4px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={camaExtra} onChange={(e) => setCamaExtra(e.target.checked)} />
                        Cama extra
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={cuna} onChange={(e) => setCuna(e.target.checked)} />
                        Cuna
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={plantaBaja} onChange={(e) => setPlantaBaja(e.target.checked)} />
                        Planta baja
                    </label>
                </div>

                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-input" rows="2" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                </div>

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
