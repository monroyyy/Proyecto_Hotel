import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Clock, CalendarPlus, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { getNotificacionesDesocupacion, agregarDiaExtraHabitacion } from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import './NotificationBell.css';

function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]} ${meses[parseInt(partes[1], 10) - 1] || partes[1]} ${partes[0]}`;
}

export default function NotificationBell({ isAdminSurface = false }) {
    const { isAuthenticated, isStaff, navigate } = useAuth();
    const [notificaciones, setNotificaciones] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [leidasIds, setLeidasIds] = useState(() => {
        try {
            const raw = localStorage.getItem('hp_notif_leidas');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [toastActivo, setToastActivo] = useState(null);
    const [toastDescartados, setToastDescartados] = useState(() => {
        try {
            const raw = sessionStorage.getItem('hp_toast_descartados');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [extendiendoId, setExtendiendoId] = useState(null);
    const [mensajeExito, setMensajeExito] = useState('');
    const wrapperRef = useRef(null);

    const cargarNotificaciones = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await getNotificacionesDesocupacion();
            const lista = Array.isArray(data) ? data : [];
            setNotificaciones(lista);

            // Mostrar aviso flotante automático si existe una habitación próxima a desocuparse no descartada
            const prioritaria = lista.find(
                n => (n.nivel === 'INMINENTE' || n.nivel === 'PROXIMA' || n.esMiReserva)
                    && !toastDescartados.includes(n.idNotificacion)
            );
            if (prioritaria) {
                setToastActivo(prioritaria);
            }
        } catch {
            // Silencioso en polling
        }
    }, [isAuthenticated, toastDescartados]);

    useEffect(() => {
        cargarNotificaciones();
        const interval = setInterval(cargarNotificaciones, 15000);
        const onRefresh = () => cargarNotificaciones();
        window.addEventListener('hotel:refresh-notifications', onRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('hotel:refresh-notifications', onRefresh);
        };
    }, [cargarNotificaciones]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const marcarTodasLeidas = () => {
        const todosIds = notificaciones.map(n => n.idNotificacion);
        setLeidasIds(todosIds);
        try {
            localStorage.setItem('hp_notif_leidas', JSON.stringify(todosIds));
        } catch {
            // ignore
        }
    };

    const descartarToast = (idNotif) => {
        const nuevos = [...toastDescartados, idNotif];
        setToastDescartados(nuevos);
        setToastActivo(null);
        try {
            sessionStorage.setItem('hp_toast_descartados', JSON.stringify(nuevos));
        } catch {
            // ignore
        }
    };

    const handleAgregarDiaExtra = async (item) => {
        if (!item?.idHabitacion || extendiendoId) return;
        setExtendiendoId(item.idHabitacion);
        try {
            const actualizada = await agregarDiaExtraHabitacion(item.idHabitacion, 1);
            setMensajeExito(`¡Día extra agregado a Hab. #${actualizada.numero}! Nueva desocupación: ${formatearFecha(actualizada.fechaOcupacionFin)} (12:00 hrs).`);
            setTimeout(() => setMensajeExito(''), 5000);
            await cargarNotificaciones();
            window.dispatchEvent(new CustomEvent('hotel:reserva-actualizada', { detail: actualizada }));
        } catch (err) {
            alert(err.message || 'No se pudo agregar el día extra.');
        } finally {
            setExtendiendoId(null);
        }
    };

    if (!isAuthenticated) return null;

    const noLeidas = notificaciones.filter(n => !leidasIds.includes(n.idNotificacion));
    const tieneUrgentes = notificaciones.some(n => n.nivel === 'INMINENTE' || n.nivel === 'PROXIMA');

    return (
        <>
            <div ref={wrapperRef} className="hp-notif-wrapper">
                <button
                    type="button"
                    className={`hp-notif-trigger ${isAdminSurface ? 'is-admin' : ''} ${tieneUrgentes ? 'has-urgent' : ''}`}
                    onClick={() => setAbierto(prev => !prev)}
                    title="Avisos de habitaciones por desocuparse"
                    aria-label="Avisos de habitaciones por desocuparse"
                >
                    <Bell size={17} />
                    {noLeidas.length > 0 && (
                        <span className="hp-notif-badge num">{noLeidas.length}</span>
                    )}
                </button>

                {abierto && (
                    <div className="hp-notif-dropdown" role="dialog" aria-label="Notificaciones de desocupación">
                        <div className="hp-notif-header">
                            <span className="hp-notif-header-title">
                                <Clock size={15} style={{ color: 'var(--brand-terracotta, #b85d38)' }} />
                                Avisos de Desocupación ({notificaciones.length})
                            </span>
                            {noLeidas.length > 0 && (
                                <button type="button" className="hp-notif-mark-btn" onClick={marcarTodasLeidas}>
                                    Marcar leídas
                                </button>
                            )}
                        </div>

                        {mensajeExito && (
                            <div style={{
                                padding: '8px 14px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                borderBottom: '1px solid #a7f3d0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}>
                                <CheckCircle2 size={14} />
                                <span>{mensajeExito}</span>
                            </div>
                        )}

                        <div className="hp-notif-list">
                            {notificaciones.length === 0 ? (
                                <div className="hp-notif-empty">
                                    No hay habitaciones programadas para desocuparse hoy ni mañana.
                                </div>
                            ) : (
                                notificaciones.map(item => {
                                    const esNoLeida = !leidasIds.includes(item.idNotificacion);
                                    const puedeExtender = (item.esMiReserva || isStaff) && item.diaExtraDisponible;
                                    const costoExtraFmt = Number(item.costoDiaExtra || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

                                    return (
                                        <div
                                            key={item.idNotificacion}
                                            className={`hp-notif-item ${esNoLeida ? 'is-unread' : ''}`}
                                        >
                                            <div className="hp-notif-item-top">
                                                <span className={`hp-notif-level-pill ${item.nivel}`}>
                                                    {item.nivel === 'HOY'
        ? '🔴 Check-out HOY (12:00 hrs)'
        : item.nivel === 'MANANA'
            ? '🟡 Desocupa MAÑANA (12:00 hrs)'
            : 'Estancia por concluir'}
                                                </span>
                                                <span className="hp-notif-countdown num">
                                                    Salida: {formatearFecha(item.fechaSalida)} · 12:00 h
                                                </span>
                                            </div>

                                            <div className="hp-notif-title">
                                                {item.nombreHotel} — Habitación #{item.numeroHabitacion} ({item.tipoHabitacion})
                                            </div>

                                            <div className="hp-notif-desc">
                                                Ocupada del <strong className="num">{formatearFecha(item.fechaEntrada)}</strong> al <strong className="num">{formatearFecha(item.fechaSalida)}</strong>.
                                                Se desocupa el <strong className="num">{formatearFecha(item.fechaSalida)}</strong> a las 12:00 hrs.
                                                {item.huespedNombre ? ` · Huésped: ${item.huespedNombre}` : ''}
                                            </div>

                                            <div className="hp-notif-actions">
                                                {puedeExtender ? (
                                                    <button
                                                        type="button"
                                                        className="hp-notif-btn-extra"
                                                        disabled={extendiendoId === item.idHabitacion}
                                                        onClick={() => handleAgregarDiaExtra(item)}
                                                        title={`Extender desocupación al ${formatearFecha(item.nuevaFechaSalidaSugerida)}`}
                                                    >
                                                        <CalendarPlus size={13} />
                                                        <span>
                                                            {extendiendoId === item.idHabitacion
                                                                ? 'Extendiendo...'
                                                                : `+1 Día extra (+$${costoExtraFmt})`}
                                                        </span>
                                                    </button>
                                                ) : (item.esMiReserva || isStaff) ? (
                                                    <span className="hp-notif-unavailable-tag">
                                                        Día siguiente reservado en esta habitación
                                                    </span>
                                                ) : (
                                                    <span className="hp-notif-unavailable-tag">
                                                        Libre a partir del {formatearFecha(item.fechaSalida)}
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    className="hp-notif-btn-link"
                                                    onClick={() => {
                                                        setAbierto(false);
                                                        if (isStaff) {
                                                            navigate('/habitaciones');
                                                        } else if (item.esMiReserva) {
                                                            navigate('/mis-reservas');
                                                        } else {
                                                            navigate('/portal-huesped');
                                                        }
                                                    }}
                                                >
                                                    <span>{isStaff ? 'Ver en Habitaciones' : item.esMiReserva ? 'Ver mi reserva' : 'Ver habitación'}</span>
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Aviso emergente automático cuando una habitación está próxima a desocuparse */}
            {toastActivo && !abierto && (
                <div className="hp-checkout-toast" role="status" aria-live="polite">
                    <div className="hp-checkout-toast-top">
                        <div className="hp-checkout-toast-title">
                            <Clock size={15} />
                            <span>Aviso de Desocupación · Hab. #{toastActivo.numeroHabitacion}</span>
                        </div>
                        <button
                            type="button"
                            className="hp-checkout-toast-close"
                            onClick={() => descartarToast(toastActivo.idNotificacion)}
                            aria-label="Cerrar aviso"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    <div className="hp-checkout-toast-body">
                        <strong>{toastActivo.nombreHotel}:</strong> Ocupada del <span className="num">{formatearFecha(toastActivo.fechaEntrada)}</span> al <span className="num">{formatearFecha(toastActivo.fechaSalida)}</span>.
                        {' '}Se desocupa el <strong className="num">{formatearFecha(toastActivo.fechaSalida)}</strong> a las 12:00 hrs.
                    </div>
                    <div className="hp-notif-actions">
                        {(toastActivo.esMiReserva || isStaff) && toastActivo.diaExtraDisponible && (
                            <button
                                type="button"
                                className="hp-notif-btn-extra"
                                disabled={extendiendoId === toastActivo.idHabitacion}
                                onClick={() => handleAgregarDiaExtra(toastActivo)}
                            >
                                <CalendarPlus size={13} />
                                <span>
                                    {extendiendoId === toastActivo.idHabitacion
                                        ? 'Extendiendo...'
                                        : `+1 Día extra (+$${Number(toastActivo.costoDiaExtra || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })})`}
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="hp-notif-btn-link"
                            onClick={() => {
                                setAbierto(true);
                                descartarToast(toastActivo.idNotificacion);
                            }}
                        >
                            <span>Ver avisos</span>
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
