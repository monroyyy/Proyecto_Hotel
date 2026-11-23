import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Bell, Clock, CalendarPlus, CheckCircle2, X, ArrowRight,
    RefreshCw, LogIn, LogOut, AlertTriangle, Wrench, Check
} from 'lucide-react';
import { getNotificacionesDesocupacion, agregarDiaExtraHabitacion } from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import './NotificationBell.css';

function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${parseInt(partes[2], 10)} ${meses[parseInt(partes[1], 10) - 1] || partes[1]}`;
}

function obtenerMetaNivel(nivel, titulo = '') {
    switch (nivel) {
        case 'HOY':
            return { label: 'Check-out HOY', Icon: LogOut, cls: 'is-hoy' };
        case 'MANANA':
            return { label: 'Salida MAÑANA', Icon: Clock, cls: 'is-manana' };
        case 'LLEGADA':
            if (String(titulo).startsWith('Llegada pendiente')) {
                return { label: 'Llegada pendiente', Icon: Clock, cls: 'is-manana' };
            }
            return { label: 'Check-in HOY', Icon: LogIn, cls: 'is-llegada' };
        case 'VENCIMIENTO':
            return { label: 'Pre-reserva', Icon: AlertTriangle, cls: 'is-vencimiento' };
        case 'MANTENIMIENTO':
            return { label: 'Mantenimiento', Icon: Wrench, cls: 'is-mantenimiento' };
        default:
            return { label: 'Estancia', Icon: Clock, cls: 'is-proxima' };
    }
}

export default function NotificationBell({ isAdminSurface = false }) {
    const { isAuthenticated, isStaff, isAdmin, navigate } = useAuth();
    const [notificaciones, setNotificaciones] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [tabActiva, setTabActiva] = useState('TODAS');
    const [cargando, setCargando] = useState(false);
    const [ultimaSync, setUltimaSync] = useState(null);
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
    const [feedback, setFeedback] = useState(null); // { tipo: 'ok' | 'err', texto }
    const wrapperRef = useRef(null);

    const cargarNotificaciones = useCallback(async (manual = false) => {
        if (!isAuthenticated) return;
        if (!manual && typeof document !== 'undefined' && document.hidden) return;
        if (manual) setCargando(true);
        try {
            const data = await getNotificacionesDesocupacion();
            const lista = Array.isArray(data) ? data : [];
            setNotificaciones(lista);
            setUltimaSync(new Date());

            // Aviso flotante solo para alertas realmente urgentes (HOY, VENCIMIENTO o reserva propia próxima)
            const prioritaria = lista.find(
                (n) =>
                    (n.urgente || n.nivel === 'HOY' || n.esMiReserva) &&
                    !toastDescartados.includes(n.idNotificacion)
            );
            if (prioritaria) {
                setToastActivo(prioritaria);
            }
        } catch {
            if (manual) {
                setFeedback({ tipo: 'err', texto: 'No se pudieron actualizar las notificaciones.' });
            }
        } finally {
            if (manual) setCargando(false);
        }
    }, [isAuthenticated, toastDescartados]);

    useEffect(() => {
        cargarNotificaciones(false);
        const interval = setInterval(() => cargarNotificaciones(false), 20000);
        const onRefresh = () => cargarNotificaciones(false);
        const onVisibility = () => {
            if (!document.hidden) cargarNotificaciones(false);
        };
        window.addEventListener('hotel:refresh-notifications', onRefresh);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(interval);
            window.removeEventListener('hotel:refresh-notifications', onRefresh);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [cargarNotificaciones]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setAbierto(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setAbierto(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const marcarLeida = (idNotif) => {
        if (!idNotif || leidasIds.includes(idNotif)) return;
        const nuevos = [...leidasIds, idNotif];
        setLeidasIds(nuevos);
        try {
            localStorage.setItem('hp_notif_leidas', JSON.stringify(nuevos));
        } catch {
            // ignore
        }
    };

    const marcarTodasLeidas = () => {
        const todosIds = notificaciones.map((n) => n.idNotificacion);
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
        setFeedback(null);
        try {
            const actualizada = await agregarDiaExtraHabitacion(item.idHabitacion, 1);
            setFeedback({
                tipo: 'ok',
                texto: `Hab. #${actualizada.numero} extendida hasta el ${formatearFecha(actualizada.fechaOcupacionFin)} (12:00 h).`
            });
            setTimeout(() => setFeedback(null), 5000);
            await cargarNotificaciones(false);
            window.dispatchEvent(new CustomEvent('hotel:reserva-actualizada', { detail: actualizada }));
        } catch (err) {
            setFeedback({
                tipo: 'err',
                texto: err.message || 'No se pudo extender la estancia.'
            });
        } finally {
            setExtendiendoId(null);
        }
    };

    const handleIrAItem = (item) => {
        marcarLeida(item.idNotificacion);
        setAbierto(false);

        if (!isStaff) {
            navigate(item.esMiReserva ? '/mis-reservas' : '/portal-huesped');
            return;
        }

        if (item.nivel === 'MANTENIMIENTO') {
            sessionStorage.setItem('hotel_filtro_estado_hab', 'Mantenimiento');
            navigate('/habitaciones');
            window.dispatchEvent(new CustomEvent('hotel:aplicar-filtro-habitaciones'));
            return;
        }

        const termino = item.folio || (item.numeroHabitacion ? String(item.numeroHabitacion) : '');
        if (termino) {
            sessionStorage.setItem('hotel_filtro_reserva_q', termino);
        }
        navigate('/reservas');
        window.dispatchEvent(new CustomEvent('hotel:aplicar-filtro-reservas'));
    };

    const conteos = useMemo(() => {
        return {
            TODAS: notificaciones.length,
            SALIDAS: notificaciones.filter((n) => (n.categoria || 'SALIDAS') === 'SALIDAS').length,
            LLEGADAS: notificaciones.filter((n) => n.categoria === 'LLEGADAS').length,
            ALERTAS: notificaciones.filter((n) => n.categoria === 'ALERTAS').length,
        };
    }, [notificaciones]);

    const listaFiltrada = useMemo(() => {
        if (!isStaff || tabActiva === 'TODAS') return notificaciones;
        return notificaciones.filter((n) => (n.categoria || 'SALIDAS') === tabActiva);
    }, [notificaciones, tabActiva, isStaff]);

    if (!isAuthenticated) return null;

    const noLeidas = notificaciones.filter((n) => !leidasIds.includes(n.idNotificacion));
    const tieneUrgentes = noLeidas.some((n) => n.urgente || n.nivel === 'HOY' || n.nivel === 'VENCIMIENTO');

    const horaSyncFmt = ultimaSync
        ? ultimaSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <>
            <div ref={wrapperRef} className="hp-notif-wrapper">
                <button
                    type="button"
                    className={`hp-notif-trigger ${isAdminSurface ? 'is-admin' : ''} ${tieneUrgentes ? 'has-urgent' : ''} ${abierto ? 'is-open' : ''}`}
                    onClick={() => setAbierto((prev) => !prev)}
                    title={isStaff ? 'Centro operativo de notificaciones' : 'Avisos de estancia'}
                    aria-label={isStaff ? 'Centro operativo de notificaciones' : 'Avisos de estancia'}
                    aria-expanded={abierto}
                >
                    <Bell size={16} />
                    {noLeidas.length > 0 && (
                        <span className="hp-notif-badge num">
                            {noLeidas.length > 99 ? '99+' : noLeidas.length}
                        </span>
                    )}
                </button>

                {abierto && (
                    <div className="hp-notif-dropdown" role="dialog" aria-label="Centro de notificaciones">
                        {/* Encabezado Editorial */}
                        <div className="hp-notif-header">
                            <div className="hp-notif-header-left">
                                <span className="hp-notif-header-title">
                                    {isStaff ? 'Centro Operativo' : 'Avisos de Estancia'}
                                </span>
                                {noLeidas.length > 0 && (
                                    <span className="hp-notif-unread-pill num">{noLeidas.length} nuevas</span>
                                )}
                            </div>
                            <div className="hp-notif-header-actions">
                                <button
                                    type="button"
                                    className="hp-notif-icon-btn"
                                    onClick={() => cargarNotificaciones(true)}
                                    disabled={cargando}
                                    title="Actualizar alertas"
                                    aria-label="Actualizar alertas"
                                >
                                    <RefreshCw size={13} className={cargando ? 'hp-spin' : ''} />
                                </button>
                                {noLeidas.length > 0 && (
                                    <button
                                        type="button"
                                        className="hp-notif-mark-btn"
                                        onClick={marcarTodasLeidas}
                                    >
                                        <Check size={12} />
                                        <span>Leídas</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Pestañas de filtro rápido para Staff */}
                        {isStaff && (
                            <div className="hp-notif-tabs" role="tablist" aria-label="Filtrar notificaciones">
                                {[
                                    { id: 'TODAS', label: 'Todas' },
                                    { id: 'SALIDAS', label: 'Salidas' },
                                    { id: 'LLEGADAS', label: 'Llegadas' },
                                    { id: 'ALERTAS', label: 'Alertas' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tabActiva === tab.id}
                                        className={`hp-notif-tab ${tabActiva === tab.id ? 'is-active' : ''}`}
                                        onClick={() => setTabActiva(tab.id)}
                                    >
                                        <span>{tab.label}</span>
                                        {conteos[tab.id] > 0 && (
                                            <span className="hp-notif-tab-count num">{conteos[tab.id]}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Feedback inline (sin window.alert) */}
                        {feedback && (
                            <div className={`hp-notif-feedback ${feedback.tipo === 'err' ? 'is-error' : 'is-ok'}`}>
                                {feedback.tipo === 'err' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                <span>{feedback.texto}</span>
                                <button
                                    type="button"
                                    className="hp-notif-feedback-close"
                                    onClick={() => setFeedback(null)}
                                    aria-label="Cerrar mensaje"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        )}

                        {/* Lista de alertas */}
                        <div className="hp-notif-list">
                            {listaFiltrada.length === 0 ? (
                                <div className="hp-notif-empty">
                                    <div className="hp-notif-empty-icon">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div className="hp-notif-empty-title">Operación al día</div>
                                    <div className="hp-notif-empty-sub">
                                        {tabActiva === 'TODAS'
                                            ? 'Sin salidas, llegadas ni alertas pendientes.'
                                            : 'No hay avisos en esta categoría.'}
                                    </div>
                                </div>
                            ) : (
                                listaFiltrada.map((item) => {
                                    const esNoLeida = !leidasIds.includes(item.idNotificacion);
                                    const meta = obtenerMetaNivel(item.nivel, item.titulo);
                                    const LevelIcon = meta.Icon;
                                    const puedeExtender =
                                        (item.categoria || 'SALIDAS') === 'SALIDAS' &&
                                        (item.esMiReserva || isStaff) &&
                                        item.diaExtraDisponible &&
                                        item.idHabitacion;
                                    const costoExtraFmt =
                                        item.costoDiaExtra != null
                                            ? Number(item.costoDiaExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                                            : null;

                                    return (
                                        <div
                                            key={item.idNotificacion}
                                            className={`hp-notif-item ${esNoLeida ? 'is-unread' : ''}`}
                                        >
                                            <div className="hp-notif-item-top">
                                                <span className={`hp-notif-level-pill ${meta.cls}`}>
                                                    <LevelIcon size={11} aria-hidden="true" />
                                                    <span>{meta.label}</span>
                                                </span>
                                                <span className="hp-notif-meta-time num">
                                                    {item.nivel === 'MANTENIMIENTO'
                                                        ? item.horaCheckout
                                                        : item.nivel === 'VENCIMIENTO'
                                                            ? `Vence: ${item.horaCheckout}`
                                                            : item.nivel === 'LLEGADA'
                                                                ? `${formatearFecha(item.fechaEntrada)} · ${item.horaCheckout || '15:00 h'}`
                                                                : `${formatearFecha(item.fechaSalida)} · ${item.horaCheckout || '12:00 h'}`}
                                                </span>
                                            </div>

                                            <div className="hp-notif-title">
                                                {item.nivel === 'MANTENIMIENTO' ? (
                                                    item.titulo
                                                ) : (
                                                    <>
                                                        {item.folio ? <span className="hp-notif-folio num">{item.folio}</span> : null}
                                                        <span>
                                                            Hab. #{item.numeroHabitacion} · {item.nombreHotel}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            <div className="hp-notif-desc">
                                                {item.huespedNombre ? <strong>{item.huespedNombre} · </strong> : null}
                                                {item.mensaje}
                                            </div>

                                            <div className="hp-notif-actions">
                                                {puedeExtender ? (
                                                    <button
                                                        type="button"
                                                        className="hp-notif-btn-extra"
                                                        disabled={extendiendoId === item.idHabitacion}
                                                        onClick={() => handleAgregarDiaExtra(item)}
                                                        title={`Extender salida al ${formatearFecha(item.nuevaFechaSalidaSugerida)}`}
                                                    >
                                                        <CalendarPlus size={12} />
                                                        <span>
                                                            {extendiendoId === item.idHabitacion
                                                                ? 'Extendiendo...'
                                                                : isAdmin || !costoExtraFmt
                                                                    ? '+1 noche'
                                                                    : `+1 noche (+$${costoExtraFmt})`}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span />
                                                )}

                                                <button
                                                    type="button"
                                                    className="hp-notif-btn-link"
                                                    onClick={() => handleIrAItem(item)}
                                                >
                                                    <span>
                                                        {!isStaff
                                                            ? item.esMiReserva ? 'Ver mi reserva' : 'Ver habitación'
                                                            : item.nivel === 'MANTENIMIENTO'
                                                                ? 'Ver inventario'
                                                                : 'Ver reserva'}
                                                    </span>
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Pie sutil de sincronización */}
                        {horaSyncFmt && (
                            <div className="hp-notif-footer">
                                <span>Sincronizado · {horaSyncFmt}</span>
                                <span className="num">{notificaciones.length} avisos</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Aviso emergente automático solo para alertas urgentes */}
            {toastActivo && !abierto && (
                <div className="hp-checkout-toast" role="status" aria-live="polite">
                    <div className="hp-checkout-toast-top">
                        <div className="hp-checkout-toast-title">
                            <Clock size={14} />
                            <span>{toastActivo.titulo || `Aviso · Hab. #${toastActivo.numeroHabitacion}`}</span>
                        </div>
                        <button
                            type="button"
                            className="hp-checkout-toast-close"
                            onClick={() => descartarToast(toastActivo.idNotificacion)}
                            aria-label="Cerrar aviso"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="hp-checkout-toast-body">
                        <strong>{toastActivo.nombreHotel}:</strong> {toastActivo.mensaje}
                    </div>
                    <div className="hp-notif-actions">
                        {(toastActivo.categoria || 'SALIDAS') === 'SALIDAS' &&
                            (toastActivo.esMiReserva || isStaff) &&
                            toastActivo.diaExtraDisponible && (
                                <button
                                    type="button"
                                    className="hp-notif-btn-extra"
                                    disabled={extendiendoId === toastActivo.idHabitacion}
                                    onClick={() => handleAgregarDiaExtra(toastActivo)}
                                >
                                    <CalendarPlus size={12} />
                                    <span>
                                        {extendiendoId === toastActivo.idHabitacion
                                            ? 'Extendiendo...'
                                            : isAdmin || toastActivo.costoDiaExtra == null
                                                ? '+1 noche'
                                                : `+1 noche (+$${Number(toastActivo.costoDiaExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })})`}
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
                            <span>Abrir centro</span>
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
