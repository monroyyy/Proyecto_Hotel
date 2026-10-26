import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarPlus, ClipboardList, Search, BedDouble, User, CheckCircle2, Clock,
    AlertTriangle, Accessibility, Baby, XCircle, Printer, Banknote, X,
    UserCheck, UserPlus
} from 'lucide-react';
import {
    getHoteles, buscarDisponibilidad, crearReserva, getReservas,
    confirmarReserva, cancelarReserva, getReembolsoReserva,
    getRecepcionistas, buscarHuespedes
} from '../api/hotelApi';
import Modal from '../components/Modal';

/**
 * ReservasPage.jsx
 * Interfaz del recepcionista: búsqueda de disponibilidad, registro de pre-reserva /
 * reservación con anticipo del 50%, y gestión (confirmar / cancelar) de reservaciones.
 */

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

const ESTADO_STYLE = {
    'Pre-reserva': { bg: 'var(--status-mant-bg)', color: 'var(--status-mant-text)', border: 'var(--status-mant-border)' },
    'Confirmada': { bg: 'var(--status-disp-bg)', color: 'var(--status-disp-text)', border: 'var(--status-disp-border)' },
    'Ocupada': { bg: 'var(--status-ocup-bg)', color: 'var(--status-ocup-text)', border: 'var(--status-ocup-border)' },
    'Cancelada': { bg: 'var(--color-error-bg)', color: 'var(--color-error)', border: 'var(--color-error-border)' },
};

function EstadoBadge({ estado }) {
    const s = ESTADO_STYLE[estado] || { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border-light)' };
    return (
        <span style={{
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            padding: '3px 12px', borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }}></span>
            {estado}
        </span>
    );
}

const labelStyle = { fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };
const cardStyle = { background: 'var(--bg-surface)', border: '1px solid rgba(226, 232, 240, 0.95)', borderRadius: 'var(--radius-lg)', padding: '1.4rem 1.6rem', boxShadow: 'var(--shadow-card)', transition: 'var(--transition)' };
const errorBox = { background: 'var(--color-error-bg)', color: 'var(--color-error)', border: '1px solid var(--color-error-border)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)' };
const okBox = { ...errorBox, background: 'var(--status-disp-bg)', color: 'var(--status-disp-text)', border: '1px solid var(--status-disp-border)', boxShadow: '0 2px 6px rgba(21, 128, 61, 0.08)' };

export default function ReservasPage() {
    const [vista, setVista] = useState('nueva');
    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reservaciones</h1>
                    <p className="page-description">Panel del recepcionista: consulta disponibilidad, registra reservaciones y administra su ciclo de vida.</p>
                </div>
                <div className="segmented-nav-group">
                    <button
                        type="button"
                        className={`segmented-nav-btn ${vista === 'nueva' ? 'active' : ''}`}
                        onClick={() => setVista('nueva')}
                    >
                        <CalendarPlus size={16} /> Nueva reservación
                    </button>
                    <button
                        type="button"
                        className={`segmented-nav-btn ${vista === 'lista' ? 'active' : ''}`}
                        onClick={() => setVista('lista')}
                    >
                        <ClipboardList size={16} /> Reservaciones
                    </button>
                </div>
            </div>
            <div key={vista} className="reservas-view-wrapper">
                {vista === 'nueva'
                    ? <NuevaReserva onCreada={() => { /* se queda en pantalla de resultado */ }} irALista={() => setVista('lista')} />
                    : <ListaReservas />}
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// NUEVA RESERVACIÓN
// ------------------------------------------------------------------
function NuevaReserva({ irALista }) {
    const [hoteles, setHoteles] = useState([]);
    const [busq, setBusq] = useState({
        idHotel: '', fechaEntrada: hoy(), fechaSalida: sumarDias(hoy(), 1),
        adultos: 1, ninos: 0, cuna: false, camaExtra: false, plantaBaja: false
    });
    const [resultados, setResultados] = useState(null);
    const [buscando, setBuscando] = useState(false);
    const [seleccion, setSeleccion] = useState(null);
    const [error, setError] = useState('');
    const [creada, setCreada] = useState(null);

    useEffect(() => { getHoteles().then(setHoteles).catch(() => { }); }, []);

    const set = (k, v) => { setBusq((b) => ({ ...b, [k]: v })); setResultados(null); setSeleccion(null); };

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
        <>
            <form onSubmit={buscar} style={{ ...cardStyle, marginBottom: 16 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Search size={18} /> 1. Consultar disponibilidad
                </h2>
                {error && <div style={errorBox}><AlertTriangle size={16} />{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <div>
                        <label style={labelStyle}>Hotel</label>
                        <select className="form-select" value={busq.idHotel} onChange={(e) => set('idHotel', e.target.value)}>
                            <option value="">Todos</option>
                            {hoteles.filter((h) => h.activo !== false).map((h) => <option key={h.idHotel} value={h.idHotel}>{h.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Llegada (15:00 h)</label>
                        <input className="form-input" type="date" min={hoy()} value={busq.fechaEntrada}
                            onChange={(e) => {
                                const v = e.target.value;
                                setBusq((b) => ({ ...b, fechaEntrada: v, fechaSalida: b.fechaSalida <= v ? sumarDias(v, 1) : b.fechaSalida }));
                                setResultados(null); setSeleccion(null);
                            }} required />
                    </div>
                    <div>
                        <label style={labelStyle}>Salida (12:00 h)</label>
                        <input className="form-input" type="date" min={sumarDias(busq.fechaEntrada, 1)} value={busq.fechaSalida}
                            onChange={(e) => set('fechaSalida', e.target.value)} required />
                    </div>
                    <div>
                        <label style={labelStyle}>Adultos</label>
                        <input className="form-input" type="number" min="1" max="10" value={busq.adultos}
                            onChange={(e) => set('adultos', parseInt(e.target.value, 10) || 1)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Niños</label>
                        <input className="form-input" type="number" min="0" max="10" value={busq.ninos}
                            onChange={(e) => set('ninos', parseInt(e.target.value, 10) || 0)} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 14, alignItems: 'center' }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.88rem' }}>
                        <input type="checkbox" checked={busq.plantaBaja} onChange={(e) => set('plantaBaja', e.target.checked)} />
                        <Accessibility size={16} /> Planta baja (adulto mayor / movilidad reducida)
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.88rem' }}>
                        <input type="checkbox" checked={busq.camaExtra} onChange={(e) => set('camaExtra', e.target.checked)} />
                        Cama extra (+$250/noche)
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.88rem' }}>
                        <input type="checkbox" checked={busq.cuna} onChange={(e) => set('cuna', e.target.checked)} />
                        <Baby size={16} /> Cuna (+$100/noche)
                    </label>
                    <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto' }} disabled={buscando}>
                        <Search size={16} /> {buscando ? 'Buscando…' : 'Buscar habitaciones'}
                    </button>
                </div>
            </form>

            {resultados && (
                <div className="room-results-container" style={{ ...cardStyle, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-primary)' }}>
                            <BedDouble size={20} color="var(--color-primary)" /> 2. Habitaciones Disponibles ({resultados.length})
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Seleccione una opción para continuar
                        </span>
                    </div>

                    {resultados.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 12 }}>
                            <p style={{ margin: 0, fontWeight: 500 }}>No hay habitaciones disponibles con esos criterios. Pruebe con otras fechas o ajuste los filtros.</p>
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
                                                <BedDouble size={16} color="var(--color-primary)" />
                                                {h.tipoHabitacion.nombre}
                                            </div>
                                            <div className="room-card-capacity">
                                                <User size={14} /> Capacidad: hasta {h.tipoHabitacion.capacidad} huéspedes
                                            </div>
                                            <div className="room-card-hotel">
                                                🏨 {h.hotel.nombre}
                                            </div>
                                            {pb && (
                                                <div className="room-card-accessibility">
                                                    <Accessibility size={15} />
                                                    <span>Planta baja · Prioridad tercera edad / movilidad</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="room-card-footer">
                                        <div className="room-card-rate-detail">
                                            <div>{t.noches} noche(s) × {money(t.tarifaBase)}</div>
                                            {t.nochesTemporadaAlta > 0 && (
                                                <div style={{ color: '#b45309', fontWeight: 600 }}>
                                                    +25% temporada alta ({t.nochesTemporadaAlta} noche{t.nochesTemporadaAlta > 1 ? 's' : ''})
                                                </div>
                                            )}
                                        </div>
                                        <div className="room-card-total-box">
                                            <div className="room-card-total-amount">{money(t.total)}</div>
                                            <div className="room-card-advance-note">Anticipo 50%: {money(t.anticipoRequerido)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {seleccion && (
                <FormularioHuesped
                    busq={busq} seleccion={seleccion}
                    onCreada={setCreada} onCancelar={() => setSeleccion(null)} />
            )}
        </>
    );
}

// ------------------------------------------------------------------
// DATOS DEL HUÉSPED + PAGO
// ------------------------------------------------------------------
function FormularioHuesped({ busq, seleccion, onCreada, onCancelar }) {
    const { habitacion: h, tarifa: t } = seleccion;
    const [recepcionistas, setRecepcionistas] = useState([]);
    const [huespedes, setHuespedes] = useState([]);
    const [huespedIdSeleccionado, setHuespedIdSeleccionado] = useState('');
    const [f, setF] = useState({
        idHuesped: null, nombre: '', telefono: '', email: '', observaciones: '',
        modalidad: 'PRE_RESERVA', horasVigencia: 24, anticipo: t.anticipoRequerido, metodoPago: 'Efectivo', recepcionista: 'Javier'
    });
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => { setF((x) => ({ ...x, anticipo: t.anticipoRequerido })); }, [t.anticipoRequerido]);

    useEffect(() => {
        getRecepcionistas().then((data) => {
            if (Array.isArray(data) && data.length > 0) {
                setRecepcionistas(data);
                setF((prev) => ({ ...prev, recepcionista: prev.recepcionista || data[0].nombre }));
            }
        }).catch(() => {});

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
                metodoPago: confirmada ? f.metodoPago : null,
                recepcionista: f.recepcionista
            });
            onCreada(reserva);
        } catch (err) { setError(err.message); }
        finally { setGuardando(false); }
    };

    const inv = (bad) => (bad ? { borderColor: 'var(--color-error)' } : undefined);

    return (
        <form onSubmit={guardar} style={cardStyle}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <User size={18} /> 3. Datos del huésped y garantía
            </h2>
            {error && <div style={errorBox}><AlertTriangle size={16} />{error}</div>}

            {/* Selector de Huésped Anterior / Recurrente */}
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)' }}>
                        <UserCheck size={16} /> ¿El huésped ya se ha hospedado anteriormente?
                    </label>
                    {huespedIdSeleccionado && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={() => handleSelectHuesped('')}
                        >
                            Limpiar / Registrar nuevo
                        </button>
                    )}
                </div>
                <select
                    className="form-select"
                    value={huespedIdSeleccionado}
                    onChange={(e) => handleSelectHuesped(e.target.value)}
                    style={{ width: '100%', background: '#fff' }}
                >
                    <option value="">-- Seleccionar huésped registrado para autocompletar datos --</option>
                    {huespedes.map((gh) => (
                        <option key={gh.idHuesped} value={gh.idHuesped}>
                            👤 {gh.nombre} — Tel: {gh.telefono} · Correo: {gh.email}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                    <label style={labelStyle}>Nombre completo *</label>
                    <input className="form-input" required minLength={3} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value, idHuesped: null })} />
                </div>
                <div>
                    <label style={labelStyle}>Teléfono (10 dígitos) *</label>
                    <input className="form-input" required inputMode="numeric" maxLength={14} style={inv(f.telefono && !telOk)}
                        value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
                </div>
                <div>
                    <label style={labelStyle}>Correo electrónico *</label>
                    <input className="form-input" required type="email" style={inv(f.email && !emailOk)}
                        value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                </div>
                <div>
                    <label style={labelStyle}>Recepcionista *</label>
                    <select
                        className="form-select"
                        required
                        value={f.recepcionista}
                        onChange={(e) => setF({ ...f, recepcionista: e.target.value })}
                    >
                        {recepcionistas.length === 0 ? (
                            <option value="Javier">Javier (Recepcionista)</option>
                        ) : (
                            recepcionistas.map((rec) => (
                                <option key={rec.idRecepcionista} value={rec.nombre}>
                                    {rec.nombre}
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>
            <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Peticiones especiales / observaciones</label>
                <textarea className="form-input" rows={2} style={{ width: '100%' }} value={f.observaciones}
                    onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                    <label style={labelStyle}>Modalidad</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <input type="radio" name="modalidad" checked={!confirmada} onChange={() => setF({ ...f, modalidad: 'PRE_RESERVA' })} />
                        <Clock size={15} /> Pre-reserva (sin pago, vigencia limitada)
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="radio" name="modalidad" checked={confirmada} onChange={() => setF({ ...f, modalidad: 'CONFIRMADA' })} />
                        <Banknote size={15} /> Confirmar con anticipo (≥ 50%)
                    </label>

                    {!confirmada ? (
                        <div style={{ marginTop: 10 }}>
                            <label style={labelStyle}>Vigencia</label>
                            <select className="form-select" value={f.horasVigencia} onChange={(e) => setF({ ...f, horasVigencia: parseInt(e.target.value, 10) })}>
                                <option value={24}>24 horas</option>
                                <option value={48}>48 horas</option>
                            </select>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                Si no se registra el anticipo en este lapso, la habitación se libera automáticamente.
                            </p>
                        </div>
                    ) : (
                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={labelStyle}>Anticipo ($)</label>
                                <input className="form-input" type="number" step="0.01" min={t.anticipoRequerido} max={t.total}
                                    value={f.anticipo} onChange={(e) => setF({ ...f, anticipo: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Método de pago</label>
                                <select className="form-select" value={f.metodoPago} onChange={(e) => setF({ ...f, metodoPago: e.target.value })}>
                                    <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ background: 'var(--color-primary-subtle)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: '0.9rem' }}>
                    <strong>Resumen</strong>
                    <div style={{ marginTop: 6, lineHeight: 1.7 }}>
                        {h.hotel.nombre} · Hab. {h.numero} ({h.tipoHabitacion.nombre})<br />
                        {busq.fechaEntrada} → {busq.fechaSalida} · {t.noches} noche(s)<br />
                        {busq.adultos} adulto(s), {busq.ninos} niño(s)<br />
                        {t.extras > 0 && <>Extras: {money(t.extras)}<br /></>}
                        <b>Total: {money(t.total)}</b><br />
                        Anticipo mínimo (50%): {money(t.anticipoRequerido)}<br />
                        <b>Saldo a liquidar en check-in: {money(saldo)}</b>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
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
        <div style={cardStyle} id="comprobante-reserva">
            <div style={okBox}><CheckCircle2 size={18} /> Reservación registrada correctamente. Folio <b>{r.folio}</b></div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Hotel Paraíso — Confirmación de reservación</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, margin: '12px 0', lineHeight: 1.7, fontSize: '0.92rem' }}>
                <div><b>Folio:</b> {r.folio}<br /><b>Estado:</b> <EstadoBadge estado={r.estado} /><br />
                    <b>Huésped:</b> {r.huesped.nombre}<br /><b>Tel:</b> {r.huesped.telefono}<br /><b>Correo:</b> {r.huesped.email}</div>
                <div><b>Hotel:</b> {r.habitacion.hotel.nombre}<br /><b>Habitación:</b> {r.habitacion.numero} ({r.habitacion.tipoHabitacion.nombre})<br />
                    <b>Llegada:</b> {r.fechaEntrada} (desde 15:00 h)<br /><b>Salida:</b> {r.fechaSalida} (antes de 12:00 h)<br />
                    <b>Ocupantes:</b> {r.adultos} adultos, {r.ninos} niños</div>
                <div><b>Total:</b> {money(r.total)}<br /><b>Anticipo:</b> {money(r.anticipo)}<br /><b>Saldo en check-in:</b> {money(r.saldo)}
                    {r.estado === 'Pre-reserva' && <><br /><b style={{ color: 'var(--status-mant-text)' }}>Vence: {fmtFechaHora(r.fechaExpiracion)}</b></>}</div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Presentar esta confirmación impresa o digital y una identificación oficial vigente al momento de su llegada.
                Política de cancelación: &gt;72 h reembolso 100%; 48–72 h 50%; &lt;48 h sin reembolso.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {/* Botón imprimir oculto temporalmente */}
                {/* <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir</button> */}
                <button className="btn btn-secondary" onClick={irALista}><ClipboardList size={16} /> Ver reservaciones</button>
                <button className="btn btn-primary" onClick={onNueva}><CalendarPlus size={16} /> Nueva reservación</button>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// LISTA DE RESERVACIONES
// ------------------------------------------------------------------
function ListaReservas() {
    const [reservas, setReservas] = useState([]);
    const [filtro, setFiltro] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);
    const [modal, setModal] = useState(null); // { tipo: 'pagar'|'cancelar', reserva }

    const cargar = async () => {
        setCargando(true);
        try { setReservas(await getReservas()); setError(''); }
        catch (e) { setError(e.message); }
        finally { setCargando(false); }
    };
    useEffect(() => { cargar(); const t = setInterval(cargar, 60000); return () => clearInterval(t); }, []);

    const visibles = useMemo(() => reservas.filter((r) => !filtro || r.estado === filtro), [reservas, filtro]);
    const horasRestantes = (r) => (r.fechaExpiracion ? (new Date(r.fechaExpiracion) - new Date()) / 3600000 : null);

    return (
        <div style={cardStyle}>
            {error && <div style={errorBox}><AlertTriangle size={16} />{error}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {['', 'Pre-reserva', 'Confirmada', 'Ocupada', 'Cancelada'].map((e) => (
                    <button key={e} className={`status-chip-btn ${filtro === e ? 'active' : ''}`} onClick={() => setFiltro(e)}>{e || 'Todas'}</button>
                ))}
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{visibles.length} registro(s)</span>
            </div>
            {cargando && reservas.length === 0 ? <p>Cargando…</p> : visibles.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No hay reservaciones registradas.</p>
            ) : (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead><tr>
                            <th>Folio</th><th>Huésped</th><th>Habitación</th><th>Fechas</th><th>Total</th><th>Saldo</th><th>Estado</th><th className="text-right">Acciones</th>
                        </tr></thead>
                        <tbody>
                            {visibles.map((r) => {
                                const hr = horasRestantes(r);
                                const alerta = r.estado === 'Pre-reserva' && hr !== null && hr <= 4;
                                return (
                                    <tr key={r.idReserva} className="table-row">
                                        <td><b>{r.folio}</b></td>
                                        <td>{r.huesped.nombre}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.huesped.telefono}</div></td>
                                        <td>{r.habitacion.hotel.nombre}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hab. {r.habitacion.numero} · {r.habitacion.tipoHabitacion.nombre}</div></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{r.fechaEntrada} → {r.fechaSalida}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.noches} noche(s)</div></td>
                                        <td>{money(r.total)}</td>
                                        <td>{money(r.saldo)}</td>
                                        <td>
                                            <EstadoBadge estado={r.estado} />
                                            {r.estado === 'Pre-reserva' && (
                                                <div style={{ fontSize: '0.72rem', color: alerta ? 'var(--color-error)' : 'var(--text-muted)', fontWeight: alerta ? 700 : 400, marginTop: 2 }}>
                                                    {alerta && '⚠ '}vence {fmtFechaHora(r.fechaExpiracion)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="row-actions">
                                                {r.estado === 'Pre-reserva' && (
                                                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setModal({ tipo: 'pagar', reserva: r })}>
                                                        Registrar anticipo
                                                    </button>
                                                )}
                                                {(r.estado === 'Pre-reserva' || r.estado === 'Confirmada') && (
                                                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setModal({ tipo: 'cancelar', reserva: r })}>
                                                        Cancelar
                                                    </button>
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
            {modal?.tipo === 'pagar' && <ModalPago reserva={modal.reserva} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
            {modal?.tipo === 'cancelar' && <ModalCancelar reserva={modal.reserva} onClose={() => setModal(null)} onDone={() => { setModal(null); cargar(); }} />}
        </div>
    );
}



function ModalPago({ reserva: r, onClose, onDone }) {
    const minimo = Math.round(r.total * 50) / 100;
    const [anticipo, setAnticipo] = useState(minimo);
    const [metodo, setMetodo] = useState('Efectivo');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const enviar = async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try { await confirmarReserva(r.idReserva, parseFloat(anticipo), metodo); onDone(); }
        catch (err) { setError(err.message); setBusy(false); }
    };
    return (
        <Modal titulo={`Registrar anticipo — ${r.folio}`} onClose={onClose}>
            <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <div style={errorBox}><AlertTriangle size={16} />{error}</div>}
                <div style={{ fontSize: '0.9rem' }}>Total: <b>{money(r.total)}</b> · Anticipo mínimo (50%): <b>{money(minimo)}</b></div>
                <div><label style={labelStyle}>Monto del anticipo ($)</label>
                    <input className="form-input" type="number" step="0.01" min={minimo} max={r.total} value={anticipo} onChange={(e) => setAnticipo(e.target.value)} required /></div>
                <div><label style={labelStyle}>Método de pago</label>
                    <select className="form-select" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                        <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>Confirmar reservación</button>
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
        <Modal titulo={`Cancelar reservación — ${r.folio}`} onClose={onClose}>
            <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <div style={errorBox}><AlertTriangle size={16} />{error}</div>}
                {info && (
                    <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>
                        Anticipo pagado: <b>{money(r.anticipo)}</b><br />
                        Reembolso según política: <b>{info.porcentaje}%</b> → <b>{money(info.monto)}</b><br />
                        {hayReembolso && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>El reembolso debe ser autorizado y dispersado por Gerencia.</span>}
                    </div>
                )}
                {hayReembolso && (<>
                    <div><label style={labelStyle}>Titular de la cuenta *</label>
                        <input className="form-input" required value={f.titular} onChange={(e) => setF({ ...f, titular: e.target.value })} /></div>
                    <div><label style={labelStyle}>Banco *</label>
                        <input className="form-input" required value={f.banco} onChange={(e) => setF({ ...f, banco: e.target.value })} /></div>
                    <div><label style={labelStyle}>CLABE (18 dígitos) *</label>
                        <input className="form-input" required maxLength={18} inputMode="numeric" value={f.clabe}
                            onChange={(e) => setF({ ...f, clabe: e.target.value.replace(/\D/g, '') })} /></div>
                </>)}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Volver</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !info}><XCircle size={16} /> Confirmar cancelación</button>
                </div>
            </form>
        </Modal>
    );
}
