import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    Users, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle,
    UserCheck, Lock, Unlock, Search, Edit2, Trash2, UserPlus,
    MoreHorizontal, Key, ChevronDown, ArrowUpDown, FileSpreadsheet
} from 'lucide-react';
import {
    getUsuarios,
    crearUsuarioAdmin,
    actualizarUsuarioAdmin,
    eliminarUsuarioAdmin,
    cambiarEstadoUsuario
} from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import './UsuariosPage.css';

function limpiarNombre(nombre) {
    if (!nombre) return 'Usuario';
    return nombre
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ');
}

const PRIORIDAD_ROL = {
    GERENTE: 1,
    ADMINISTRADOR: 2,
    RECEPCIONISTA: 3,
    HUESPED: 4
};

function obtenerEtiquetaRol(rol) {
    switch (rol) {
        case 'ADMINISTRADOR': return 'Administrador';
        case 'GERENTE': return 'Gerente General';
        case 'RECEPCIONISTA': return 'Recepcionista';
        case 'HUESPED':
        default: return 'Huésped';
    }
}

function claseBadgeRol(rol) {
    if (rol === 'GERENTE') return 'usr-badge usr-badge-terra';
    if (rol === 'ADMINISTRADOR') return 'usr-badge usr-badge-palm';
    if (rol === 'RECEPCIONISTA') return 'usr-badge usr-badge-ocean';
    return 'usr-badge usr-badge-muted';
}

function obtenerIniciales(nombre) {
    const limpio = limpiarNombre(nombre).trim();
    const partes = limpio.split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return limpio.slice(0, 2).toUpperCase();
}

export default function UsuariosPage() {
    const { user: currentUser } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [notificacion, setNotificacion] = useState(null);

    // Filtros y ordenamiento (por jerarquía de rol: Gerente -> Administrador -> Recepción -> Huésped)
    const [filtroKpi, setFiltroKpi] = useState('TODOS');
    const [filtroRol, setFiltroRol] = useState('TODOS');
    const [filtroVerif, setFiltroVerif] = useState('TODOS');
    const [filtroActivo, setFiltroActivo] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState({ campo: 'rol', dir: 'asc' });

    // Menú contextual
    const [menuActivoId, setMenuActivoId] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickAfuera(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuActivoId(null);
            }
        }
        document.addEventListener('mousedown', handleClickAfuera);
        return () => document.removeEventListener('mousedown', handleClickAfuera);
    }, []);

    // Modal Crear / Editar
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [formUser, setFormUser] = useState({
        idUsuario: null,
        nombre: '',
        email: '',
        password: '',
        rol: 'HUESPED',
        verificado: true,
        activo: true
    });

    const [confirmacion, setConfirmacion] = useState({
        abierto: false,
        tipo: 'info',
        titulo: '',
        subtitulo: '',
        mensaje: '',
        textoConfirmar: 'Confirmar',
        accion: null
    });

    const cargar = async () => {
        try {
            setCargando(true);
            setError('');
            const data = await getUsuarios();
            setUsuarios(data || []);
        } catch (err) {
            setError(err.message || 'No se pudo cargar la lista de usuarios.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar();
    }, []);

    const mostrarNotificacion = (tipo, texto) => {
        setNotificacion({ tipo, texto });
        setTimeout(() => setNotificacion(null), 4000);
    };

    const toggleOrden = (campo) => {
        setOrden(prev =>
            prev.campo === campo
                ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { campo, dir: campo === 'idUsuario' ? 'desc' : 'asc' }
        );
    };

    const kpis = useMemo(() => {
        const total = usuarios.length;
        const direccion = usuarios.filter(u => u.rol === 'GERENTE' || u.rol === 'ADMINISTRADOR').length;
        const recepcion = usuarios.filter(u => u.rol === 'RECEPCIONISTA').length;
        const huespedes = usuarios.filter(u => u.rol === 'HUESPED').length;
        return { total, direccion, recepcion, huespedes };
    }, [usuarios]);

    const usuariosFiltrados = useMemo(() => {
        const filtrados = usuarios.filter(u => {
            if (filtroKpi === 'DIRECCION' && u.rol !== 'GERENTE' && u.rol !== 'ADMINISTRADOR') return false;
            if (filtroKpi === 'RECEPCIONISTA' && u.rol !== 'RECEPCIONISTA') return false;
            if (filtroKpi === 'HUESPED' && u.rol !== 'HUESPED') return false;

            if (filtroRol !== 'TODOS' && u.rol !== filtroRol) return false;

            if (filtroVerif === 'VERIFICADO' && !u.verificado) return false;
            if (filtroVerif === 'PENDIENTE' && u.verificado) return false;

            if (filtroActivo === 'ACTIVA' && !u.activo) return false;
            if (filtroActivo === 'SUSPENDIDA' && u.activo) return false;

            const q = busqueda.trim().toLowerCase();
            if (q) {
                const nombreLimpio = limpiarNombre(u.nombre).toLowerCase();
                const emailLower = (u.email || '').toLowerCase();
                const rolLower = obtenerEtiquetaRol(u.rol).toLowerCase();
                if (
                    !nombreLimpio.includes(q) &&
                    !emailLower.includes(q) &&
                    !rolLower.includes(q) &&
                    !String(u.idUsuario).includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });

        const mult = orden.dir === 'asc' ? 1 : -1;
        return [...filtrados].sort((a, b) => {
            if (orden.campo === 'nombre') {
                return limpiarNombre(a.nombre).localeCompare(limpiarNombre(b.nombre), 'es') * mult;
            }
            if (orden.campo === 'rol') {
                const pa = PRIORIDAD_ROL[a.rol] ?? 99;
                const pb = PRIORIDAD_ROL[b.rol] ?? 99;
                if (pa !== pb) return (pa - pb) * mult;
                return Number(b.idUsuario || 0) - Number(a.idUsuario || 0);
            }
            return (Number(a.idUsuario || 0) - Number(b.idUsuario || 0)) * mult;
        });
    }, [usuarios, filtroKpi, filtroRol, filtroVerif, filtroActivo, busqueda, orden]);

    const hayFiltros = Boolean(
        filtroKpi !== 'TODOS' || filtroRol !== 'TODOS' || filtroVerif !== 'TODOS' || filtroActivo !== 'TODOS' || busqueda.trim()
    );

    const limpiarFiltros = () => {
        setFiltroKpi('TODOS');
        setFiltroRol('TODOS');
        setFiltroVerif('TODOS');
        setFiltroActivo('TODOS');
        setBusqueda('');
    };

    const exportarUsuariosCsv = () => {
        if (usuariosFiltrados.length === 0) return;
        const rows = [
            ['ID', 'NOMBRE', 'CORREO', 'ROL', 'VERIFICACION', 'ESTADO', 'FECHA_ALTA'],
            ...usuariosFiltrados.map(u => [
                u.idUsuario,
                limpiarNombre(u.nombre),
                u.email || '',
                obtenerEtiquetaRol(u.rol),
                u.verificado ? 'Verificado' : 'Pendiente',
                u.activo ? 'Activa' : 'Suspendida',
                u.fechaCreacion ? String(u.fechaCreacion).split('T')[0] : ''
            ])
        ];
        const csv = '\uFEFF' + rows
            .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HotelParaiso_Usuarios_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const abrirModalNuevo = () => {
        setModoEdicion(false);
        setFormUser({
            idUsuario: null,
            nombre: '',
            email: '',
            password: '',
            rol: 'HUESPED',
            verificado: true,
            activo: true
        });
        setModalAbierto(true);
    };

    const abrirModalEditar = (u) => {
        setModoEdicion(true);
        setFormUser({
            idUsuario: u.idUsuario,
            nombre: limpiarNombre(u.nombre),
            email: u.email || '',
            password: '',
            rol: u.rol || 'HUESPED',
            verificado: Boolean(u.verificado),
            activo: Boolean(u.activo)
        });
        setMenuActivoId(null);
        setModalAbierto(true);
    };

    const handleSubmitFormulario = (e) => {
        e.preventDefault();
        if (!formUser.nombre.trim() || !formUser.email.trim()) {
            mostrarNotificacion('error', 'El nombre y el correo electrónico son obligatorios.');
            return;
        }
        if (!modoEdicion && formUser.password.length < 8) {
            mostrarNotificacion('error', 'La contraseña inicial debe tener al menos 8 caracteres.');
            return;
        }
        if (modoEdicion && formUser.password && formUser.password.length < 8) {
            mostrarNotificacion('error', 'La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setConfirmacion({
            abierto: true,
            tipo: 'info',
            titulo: modoEdicion ? '¿Confirmar cambios en el usuario?' : '¿Crear nueva cuenta?',
            subtitulo: modoEdicion ? `Cuenta #${formUser.idUsuario}` : 'Alta por Dirección General',
            mensaje: modoEdicion
                ? `Se actualizarán los datos de "${formUser.nombre}" (${formUser.email}) con rol ${obtenerEtiquetaRol(formUser.rol)}.`
                : `Se registrará a "${formUser.nombre}" (${formUser.email}) con rol ${obtenerEtiquetaRol(formUser.rol)}.`,
            textoConfirmar: modoEdicion ? 'Guardar cambios' : 'Crear usuario',
            accion: async () => {
                setProcesando(true);
                try {
                    if (modoEdicion) {
                        const payload = {
                            nombre: formUser.nombre.trim(),
                            email: formUser.email.trim(),
                            rol: formUser.rol,
                            verificado: formUser.verificado,
                            activo: formUser.activo
                        };
                        if (formUser.password.trim()) payload.password = formUser.password;
                        await actualizarUsuarioAdmin(formUser.idUsuario, payload);
                        mostrarNotificacion('exito', `Datos de ${formUser.nombre} actualizados.`);
                    } else {
                        await crearUsuarioAdmin({
                            nombre: formUser.nombre.trim(),
                            email: formUser.email.trim(),
                            password: formUser.password,
                            rol: formUser.rol,
                            verificado: formUser.verificado,
                            activo: formUser.activo
                        });
                        mostrarNotificacion('exito', `Usuario ${formUser.nombre} creado.`);
                    }
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                    setModalAbierto(false);
                    await cargar();
                } catch (err) {
                    mostrarNotificacion('error', err.message || 'No se pudo guardar el usuario.');
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                } finally {
                    setProcesando(false);
                }
            }
        });
    };

    const solicitarToggleEstado = (u) => {
        const nombreLimpio = limpiarNombre(u.nombre);
        const nuevoEstado = !u.activo;
        setMenuActivoId(null);
        setConfirmacion({
            abierto: true,
            tipo: nuevoEstado ? 'info' : 'warning',
            titulo: nuevoEstado ? '¿Reactivar cuenta?' : '¿Suspender cuenta?',
            subtitulo: `${nombreLimpio} (${u.email})`,
            mensaje: nuevoEstado
                ? `El usuario "${nombreLimpio}" podrá volver a iniciar sesión.`
                : `El usuario "${nombreLimpio}" no podrá iniciar sesión mientras esté suspendido.`,
            textoConfirmar: nuevoEstado ? 'Reactivar cuenta' : 'Suspender cuenta',
            accion: async () => {
                setProcesando(true);
                try {
                    await cambiarEstadoUsuario(u.idUsuario, { activo: nuevoEstado });
                    mostrarNotificacion('exito', `Cuenta de ${nombreLimpio} ${nuevoEstado ? 'reactivada' : 'suspendida'}.`);
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                    await cargar();
                } catch (err) {
                    mostrarNotificacion('error', err.message || 'No se pudo cambiar el estado.');
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                } finally {
                    setProcesando(false);
                }
            }
        });
    };

    const solicitarVerificarManual = (u) => {
        const nombreLimpio = limpiarNombre(u.nombre);
        setMenuActivoId(null);
        setConfirmacion({
            abierto: true,
            tipo: 'info',
            titulo: '¿Verificar correo manualmente?',
            subtitulo: `${nombreLimpio} (${u.email})`,
            mensaje: `Se marcará el correo "${u.email}" como verificado para permitir el acceso inmediato.`,
            textoConfirmar: 'Verificar correo',
            accion: async () => {
                setProcesando(true);
                try {
                    await cambiarEstadoUsuario(u.idUsuario, { verificado: true });
                    mostrarNotificacion('exito', `Correo de ${nombreLimpio} verificado.`);
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                    await cargar();
                } catch (err) {
                    mostrarNotificacion('error', err.message || 'No se pudo verificar el correo.');
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                } finally {
                    setProcesando(false);
                }
            }
        });
    };

    const solicitarEliminarUsuario = (u) => {
        const nombreLimpio = limpiarNombre(u.nombre);
        setMenuActivoId(null);
        setConfirmacion({
            abierto: true,
            tipo: 'danger',
            titulo: '¿Eliminar cuenta de usuario?',
            subtitulo: 'Acción permanente',
            mensaje: `¿Seguro que deseas eliminar la cuenta de "${nombreLimpio}" (${u.email})? Se revocarán todos sus accesos.`,
            textoConfirmar: 'Eliminar usuario',
            accion: async () => {
                setProcesando(true);
                try {
                    await eliminarUsuarioAdmin(u.idUsuario);
                    mostrarNotificacion('exito', `Usuario ${nombreLimpio} eliminado.`);
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                    await cargar();
                } catch (err) {
                    mostrarNotificacion('error', err.message || 'No se pudo eliminar el usuario.');
                    setConfirmacion(prev => ({ ...prev, abierto: false }));
                } finally {
                    setProcesando(false);
                }
            }
        });
    };

    return (
        <div className="usr-view">
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* CABECERA EDITORIAL */}
            <header className="usr-header usr-anim-up">
                <div>
                    <div className="usr-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Control de Acceso</span>
                        <span className="usr-eyebrow-meta">
                            &middot; {currentUser?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="usr-title">Usuarios</h1>
                </div>

                <button type="button" className="usr-cta-btn" onClick={abrirModalNuevo}>
                    <UserPlus size={16} />
                    <span>Nuevo usuario</span>
                </button>
            </header>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span><strong>Error:</strong> {error}</span>
                </div>
            )}

            {/* 4 KPIs COMPACTOS CLICABLES (Orden jerárquico: Gerencia/Admin -> Recepción -> Huéspedes) */}
            <section className="usr-kpi-grid usr-anim-up usr-delay-1" aria-label="Resumen de cuentas">
                <button
                    type="button"
                    className={`usr-kpi-card ${filtroKpi === 'TODOS' && filtroRol === 'TODOS' ? 'is-active' : ''}`}
                    onClick={() => { setFiltroKpi('TODOS'); setFiltroRol('TODOS'); }}
                >
                    <div className="usr-kpi-label">Total Cuentas</div>
                    <div className="usr-kpi-val">{kpis.total}</div>
                    <div className="usr-kpi-sub">Registradas en sistema</div>
                </button>

                <button
                    type="button"
                    className={`usr-kpi-card is-terra ${filtroKpi === 'DIRECCION' ? 'is-active' : ''}`}
                    onClick={() => { setFiltroKpi('DIRECCION'); setFiltroRol('TODOS'); }}
                >
                    <div className="usr-kpi-label">Gerencia y Admin</div>
                    <div className="usr-kpi-val">{kpis.direccion}</div>
                    <div className="usr-kpi-sub">Dirección y operación</div>
                </button>

                <button
                    type="button"
                    className={`usr-kpi-card is-ocean ${filtroKpi === 'RECEPCIONISTA' ? 'is-active' : ''}`}
                    onClick={() => { setFiltroKpi('RECEPCIONISTA'); setFiltroRol('TODOS'); }}
                >
                    <div className="usr-kpi-label">Recepción</div>
                    <div className="usr-kpi-val">{kpis.recepcion}</div>
                    <div className="usr-kpi-sub">Atención en mostrador</div>
                </button>

                <button
                    type="button"
                    className={`usr-kpi-card is-palm ${filtroKpi === 'HUESPED' ? 'is-active' : ''}`}
                    onClick={() => { setFiltroKpi('HUESPED'); setFiltroRol('TODOS'); }}
                >
                    <div className="usr-kpi-label">Huéspedes</div>
                    <div className="usr-kpi-val">{kpis.huespedes}</div>
                    <div className="usr-kpi-sub">Clientes registrados</div>
                </button>
            </section>

            {/* BARRA UNIFICADA DE FILTROS EN 1 SOLA LÍNEA */}
            <div className="usr-filter-bar usr-anim-up usr-delay-1">
                <div className="usr-filter-left">
                    <div className="usr-search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            className="usr-search-input"
                            placeholder="Nombre, correo o ID..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            aria-label="Buscar usuarios"
                        />
                    </div>

                    <div className="usr-select-wrap">
                        <select
                            className="usr-select"
                            value={filtroRol}
                            onChange={(e) => { setFiltroRol(e.target.value); setFiltroKpi('TODOS'); }}
                            aria-label="Filtrar por rol"
                        >
                            <option value="TODOS">Rol: Todos</option>
                            <option value="GERENTE">Gerente General</option>
                            <option value="ADMINISTRADOR">Administrador</option>
                            <option value="RECEPCIONISTA">Recepcionista</option>
                            <option value="HUESPED">Huésped</option>
                        </select>
                        <ChevronDown size={13} className="usr-select-chevron" />
                    </div>

                    <div className="usr-select-wrap">
                        <select
                            className="usr-select"
                            value={filtroVerif}
                            onChange={(e) => setFiltroVerif(e.target.value)}
                            aria-label="Filtrar por verificación"
                        >
                            <option value="TODOS">Verificación: Todas</option>
                            <option value="VERIFICADO">Verificados</option>
                            <option value="PENDIENTE">Pendientes</option>
                        </select>
                        <ChevronDown size={13} className="usr-select-chevron" />
                    </div>

                    <div className="usr-select-wrap">
                        <select
                            className="usr-select"
                            value={filtroActivo}
                            onChange={(e) => setFiltroActivo(e.target.value)}
                            aria-label="Filtrar por estado"
                        >
                            <option value="TODOS">Estado: Todos</option>
                            <option value="ACTIVA">Activas</option>
                            <option value="SUSPENDIDA">Suspendidas</option>
                        </select>
                        <ChevronDown size={13} className="usr-select-chevron" />
                    </div>

                    {hayFiltros && (
                        <button type="button" className="usr-clear-btn" onClick={limpiarFiltros}>
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="usr-filter-right">
                    <button
                        type="button"
                        className="usr-btn-csv"
                        onClick={exportarUsuariosCsv}
                        disabled={cargando || usuariosFiltrados.length === 0}
                        title="Descargar directorio filtrado en CSV para Excel"
                    >
                        <FileSpreadsheet size={13} style={{ color: '#2d5a43' }} />
                        <span>CSV</span>
                    </button>

                    <button
                        type="button"
                        className="usr-icon-btn"
                        onClick={cargar}
                        disabled={cargando}
                        title="Actualizar cuentas"
                        aria-label="Actualizar cuentas"
                    >
                        <RefreshCw size={14} className={cargando ? 'usr-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* TABLA LIMPIA (5 COLUMNAS, 0% OVERFLOW) */}
            <div className="usr-table-card usr-anim-up usr-delay-2" ref={menuRef}>
                {cargando && usuarios.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Cargando cuentas...</p>
                    </div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Users size={40} className="empty-icon" />
                        <h3>No se encontraron usuarios</h3>
                        <p>Ninguna cuenta coincide con los filtros actuales.</p>
                        {hayFiltros && (
                            <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <table className="usr-table">
                            <thead>
                                <tr>
                                    <th>
                                        <button
                                            type="button"
                                            className={`usr-sort-btn ${orden.campo === 'nombre' || orden.campo === 'idUsuario' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden(orden.campo === 'idUsuario' ? 'nombre' : 'idUsuario')}
                                        >
                                            <span>Usuario / Correo</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>
                                        <button
                                            type="button"
                                            className={`usr-sort-btn ${orden.campo === 'rol' ? 'is-sorted' : ''}`}
                                            onClick={() => toggleOrden('rol')}
                                        >
                                            <span>Rol</span>
                                            <ArrowUpDown size={11} />
                                        </button>
                                    </th>
                                    <th>Verificación</th>
                                    <th>Estado</th>
                                    <th className="num">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosFiltrados.map((u, idx) => {
                                    const esMismoAdmin = currentUser?.idUsuario === u.idUsuario;
                                    const nombreLimpio = limpiarNombre(u.nombre);
                                    const esStaff = u.rol === 'ADMINISTRADOR' || u.rol === 'GERENTE' || u.rol === 'RECEPCIONISTA';
                                    const menuAbierto = menuActivoId === u.idUsuario;
                                    const abrirHaciaArriba = idx >= Math.max(2, usuariosFiltrados.length - 3);
                                    const fechaAlta = u.fechaCreacion ? String(u.fechaCreacion).split('T')[0] : null;

                                    return (
                                        <tr key={u.idUsuario}>
                                            <td>
                                                <div className="usr-identity">
                                                    <div className={`usr-avatar ${esStaff ? 'is-staff' : ''}`}>
                                                        {obtenerIniciales(nombreLimpio)}
                                                    </div>
                                                    <div>
                                                        <div className="usr-name-row">
                                                            <span>{nombreLimpio}</span>
                                                            {esMismoAdmin && <span className="usr-you-tag">Tú</span>}
                                                        </div>
                                                        <div className="usr-sub-row">
                                                            <span>{u.email}</span>
                                                            <span style={{ color: '#94a3b8' }}> &middot; #{u.idUsuario}</span>
                                                            {fechaAlta && <span style={{ color: '#94a3b8' }}> &middot; Alta {fechaAlta}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className={claseBadgeRol(u.rol)}>
                                                    {esStaff ? <ShieldCheck size={12} /> : <Users size={12} />}
                                                    <span>{obtenerEtiquetaRol(u.rol)}</span>
                                                </span>
                                            </td>

                                            <td>
                                                <span className={`usr-badge ${u.verificado ? 'usr-badge-palm' : 'usr-badge-terra'}`}>
                                                    {u.verificado ? 'Verificado' : 'Pendiente'}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={`usr-badge ${u.activo ? 'usr-badge-palm' : 'usr-badge-danger'}`}>
                                                    {u.activo ? 'Activa' : 'Suspendida'}
                                                </span>
                                            </td>

                                            <td className="num">
                                                <div className="usr-action-cell">
                                                    <button
                                                        type="button"
                                                        className="usr-edit-btn"
                                                        onClick={() => abrirModalEditar(u)}
                                                    >
                                                        <Edit2 size={13} />
                                                        <span>Editar</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`usr-more-btn ${menuAbierto ? 'is-open' : ''}`}
                                                        onClick={() => setMenuActivoId(menuAbierto ? null : u.idUsuario)}
                                                        aria-label="Más opciones"
                                                        aria-expanded={menuAbierto}
                                                    >
                                                        <MoreHorizontal size={15} />
                                                    </button>

                                                    {menuAbierto && (
                                                        <div className={`usr-menu ${abrirHaciaArriba ? 'is-upward' : ''}`} role="menu">
                                                            {esMismoAdmin ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="usr-menu-item"
                                                                        onClick={() => abrirModalEditar(u)}
                                                                    >
                                                                        <Key size={14} style={{ color: '#b85d38' }} />
                                                                        <span>Cambiar contraseña</span>
                                                                    </button>
                                                                    <div className="usr-menu-sep" />
                                                                    <div className="usr-menu-note">
                                                                        <ShieldCheck size={13} style={{ color: '#2d5a43', flexShrink: 0 }} />
                                                                        <span>Cuenta activa protegida</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {!u.verificado && (
                                                                        <button
                                                                            type="button"
                                                                            role="menuitem"
                                                                            className="usr-menu-item"
                                                                            onClick={() => solicitarVerificarManual(u)}
                                                                        >
                                                                            <UserCheck size={14} style={{ color: '#2d5a43' }} />
                                                                            <span>Verificar correo</span>
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className={`usr-menu-item ${u.activo ? 'is-warn' : ''}`}
                                                                        onClick={() => solicitarToggleEstado(u)}
                                                                    >
                                                                        {u.activo ? (
                                                                            <>
                                                                                <Lock size={14} />
                                                                                <span>Suspender cuenta</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Unlock size={14} style={{ color: '#2d5a43' }} />
                                                                                <span>Reactivar cuenta</span>
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <div className="usr-menu-sep" />

                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="usr-menu-item is-danger"
                                                                        onClick={() => solicitarEliminarUsuario(u)}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        <span>Eliminar cuenta</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="usr-table-footer">
                            Mostrando <strong style={{ color: 'var(--text-primary)' }}>{usuariosFiltrados.length}</strong> de{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>{usuarios.length}</strong> cuentas
                        </div>
                    </>
                )}
            </div>

            {/* Modal Crear / Editar Usuario (0 emojis, selects alineados) */}
            <Modal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title={modoEdicion ? `Editar Usuario #${formUser.idUsuario}` : 'Nuevo Usuario'}
                subtitle={modoEdicion ? 'Actualiza datos, rol y permisos de acceso' : 'Alta de cuenta en la plataforma'}
                icon={Users}
                maxWidth="520px"
            >
                <form onSubmit={handleSubmitFormulario} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Nombre completo *</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            value={formUser.nombre}
                            onChange={(e) => setFormUser({ ...formUser, nombre: e.target.value })}
                            placeholder="Ej. Carmen Salinas Gómez"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Correo electrónico *</label>
                        <input
                            type="email"
                            required
                            className="form-input"
                            value={formUser.email}
                            onChange={(e) => setFormUser({ ...formUser, email: e.target.value })}
                            placeholder="usuario@hotelparaiso.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {modoEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña inicial *'}
                        </label>
                        <input
                            type="password"
                            required={!modoEdicion}
                            minLength={8}
                            className="form-input"
                            value={formUser.password}
                            onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                            placeholder={modoEdicion ? 'Dejar vacío para conservar la actual' : 'Mínimo 8 caracteres'}
                        />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Rol *</label>
                            <select
                                className="form-select"
                                value={formUser.rol}
                                onChange={(e) => setFormUser({ ...formUser, rol: e.target.value })}
                            >
                                <option value="GERENTE">Gerente General</option>
                                <option value="ADMINISTRADOR">Administrador</option>
                                <option value="RECEPCIONISTA">Recepcionista</option>
                                <option value="HUESPED">Huésped</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Verificación *</label>
                            <select
                                className="form-select"
                                value={formUser.verificado ? 'true' : 'false'}
                                onChange={(e) => setFormUser({ ...formUser, verificado: e.target.value === 'true' })}
                            >
                                <option value="true">Verificado</option>
                                <option value="false">Pendiente</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Estado de la cuenta *</label>
                        <select
                            className="form-select"
                            value={formUser.activo ? 'true' : 'false'}
                            onChange={(e) => setFormUser({ ...formUser, activo: e.target.value === 'true' })}
                        >
                            <option value="true">Activa</option>
                            <option value="false">Suspendida</option>
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setModalAbierto(false)}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={confirmacion.abierto}
                onClose={() => setConfirmacion(prev => ({ ...prev, abierto: false }))}
                onConfirm={confirmacion.accion}
                title={confirmacion.titulo}
                subtitle={confirmacion.subtitulo}
                message={confirmacion.mensaje}
                confirmText={confirmacion.textoConfirmar}
                cancelText="Cancelar"
                type={confirmacion.tipo}
            />
        </div>
    );
}
