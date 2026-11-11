import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    Users, ShieldCheck, CheckCircle2, XCircle, RefreshCw, AlertCircle,
    UserCheck, Lock, Unlock, Search, Edit2, Trash2, UserPlus, Mail,
    MoreHorizontal, ShieldAlert, Key
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
import KpiCard from '../components/KpiCard';
import EstadoBadge from '../components/EstadoBadge';

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

function obtenerEtiquetaRol(rol) {
    switch (rol) {
        case 'ADMINISTRADOR': return 'Administrador';
        case 'GERENTE': return 'Gerente General';
        case 'RECEPCIONISTA': return 'Recepcionista';
        case 'HUESPED':
        default: return 'Huésped';
    }
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

    // Filtro unificado vía KPIs
    const [filtroKpi, setFiltroKpi] = useState('TODOS'); // 'TODOS' | 'HUESPED' | 'ADMINISTRADOR' | 'PENDIENTES'
    const [busqueda, setBusqueda] = useState('');

    // Menú contextual activo (ID de usuario)
    const [menuActivoId, setMenuActivoId] = useState(null);
    const menuRef = useRef(null);

    // Cerrar menú contextual al hacer click fuera
    useEffect(() => {
        function handleClickAfuera(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuActivoId(null);
            }
        }
        document.addEventListener('mousedown', handleClickAfuera);
        return () => document.removeEventListener('mousedown', handleClickAfuera);
    }, []);

    // Modal de Crear / Editar Usuario
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

    // Diálogo de Confirmación
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

    // KPIs interactivos
    const kpis = useMemo(() => {
        const total = usuarios.length;
        const huespedes = usuarios.filter(u => u.rol === 'HUESPED').length;
        const personal = usuarios.filter(u => u.rol === 'GERENTE' || u.rol === 'RECEPCIONISTA').length;
        const admins = usuarios.filter(u => u.rol === 'ADMINISTRADOR').length;
        const pendientes = usuarios.filter(u => !u.verificado).length;
        return { total, huespedes, personal, admins, pendientes };
    }, [usuarios]);

    // Filtrado de usuarios
    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            let coincideFiltro = true;
            if (filtroKpi === 'HUESPED') coincideFiltro = u.rol === 'HUESPED';
            else if (filtroKpi === 'PERSONAL') coincideFiltro = (u.rol === 'GERENTE' || u.rol === 'RECEPCIONISTA');
            else if (filtroKpi === 'GERENTE') coincideFiltro = u.rol === 'GERENTE';
            else if (filtroKpi === 'RECEPCIONISTA') coincideFiltro = u.rol === 'RECEPCIONISTA';
            else if (filtroKpi === 'ADMINISTRADOR') coincideFiltro = u.rol === 'ADMINISTRADOR';
            else if (filtroKpi === 'PENDIENTES') coincideFiltro = !u.verificado;

            const nombreLimpio = limpiarNombre(u.nombre).toLowerCase();
            const emailLower = (u.email || '').toLowerCase();
            const rolLower = obtenerEtiquetaRol(u.rol).toLowerCase();
            const q = busqueda.trim().toLowerCase();
            const coincideBusqueda = !q ||
                nombreLimpio.includes(q) ||
                emailLower.includes(q) ||
                rolLower.includes(q) ||
                String(u.idUsuario).includes(q);

            return coincideFiltro && coincideBusqueda;
        });
    }, [usuarios, filtroKpi, busqueda]);

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
            mostrarNotificacion('error', 'Si deseas cambiar la contraseña, debe tener al menos 8 caracteres.');
            return;
        }

        setConfirmacion({
            abierto: true,
            tipo: 'info',
            titulo: modoEdicion ? '¿Confirmar cambios en el usuario?' : '¿Crear nueva cuenta de usuario?',
            subtitulo: modoEdicion ? `Cuenta #${formUser.idUsuario}` : 'Alta directa por administrador',
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
                        if (formUser.password.trim()) {
                            payload.password = formUser.password;
                        }
                        await actualizarUsuarioAdmin(formUser.idUsuario, payload);
                        mostrarNotificacion('exito', `Datos de ${formUser.nombre} actualizados correctamente.`);
                    } else {
                        await crearUsuarioAdmin({
                            nombre: formUser.nombre.trim(),
                            email: formUser.email.trim(),
                            password: formUser.password,
                            rol: formUser.rol,
                            verificado: formUser.verificado,
                            activo: formUser.activo
                        });
                        mostrarNotificacion('exito', `Usuario ${formUser.nombre} creado exitosamente.`);
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
            titulo: nuevoEstado ? '¿Reactivar cuenta de usuario?' : '¿Suspender cuenta de usuario?',
            subtitulo: `${nombreLimpio} (${u.email})`,
            mensaje: nuevoEstado
                ? `El usuario "${nombreLimpio}" podrá volver a iniciar sesión en la plataforma.`
                : `El usuario "${nombreLimpio}" no podrá iniciar sesión mientras su cuenta permanezca suspendida.`,
            textoConfirmar: nuevoEstado ? 'Sí, reactivar cuenta' : 'Sí, suspender cuenta',
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
            titulo: '¿Aprobar verificación de correo?',
            subtitulo: `${nombreLimpio} (${u.email})`,
            mensaje: `Se marcará manualmente el correo "${u.email}" como verificado para permitirle iniciar sesión de inmediato.`,
            textoConfirmar: 'Confirmar verificación',
            accion: async () => {
                setProcesando(true);
                try {
                    await cambiarEstadoUsuario(u.idUsuario, { verificado: true });
                    mostrarNotificacion('exito', `Correo de ${nombreLimpio} verificado correctamente.`);
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
            subtitulo: 'Esta acción eliminará el registro de forma permanente',
            mensaje: `¿Estás seguro de que deseas eliminar la cuenta de "${nombreLimpio}" (${u.email})? Se cancelarán los accesos vinculados.`,
            textoConfirmar: 'Eliminar usuario',
            accion: async () => {
                setProcesando(true);
                try {
                    await eliminarUsuarioAdmin(u.idUsuario);
                    mostrarNotificacion('exito', `El usuario ${nombreLimpio} fue eliminado del sistema.`);
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
        <div className="page-container">
            {/* Notificaciones */}
            {notificacion && (
                <div className={`toast-notification toast-${notificacion.tipo}`}>
                    {notificacion.tipo === 'exito' && <CheckCircle2 size={18} />}
                    {notificacion.tipo === 'error' && <AlertCircle size={18} />}
                    <span>{notificacion.texto}</span>
                </div>
            )}

            {/* Encabezado Principal */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestión de Usuarios</h1>
                    <p className="page-description">
                        Supervisa cuentas registradas, administra roles y gestiona el estado de acceso.
                    </p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary btn-icon" onClick={cargar} disabled={cargando} title="Actualizar datos">
                        <RefreshCw size={17} className={cargando ? 'spin-animation' : ''} />
                        <span>Actualizar</span>
                    </button>
                    <button type="button" className="btn btn-primary" onClick={abrirModalNuevo}>
                        <UserPlus size={18} />
                        <span>Nuevo Usuario</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div><strong>Error de Comunicación:</strong> {error}</div>
                </div>
            )}

            {/* Tarjetas KPI como Filtro Único */}
            <div className="kpi-grid">
                <KpiCard
                    title="Total Cuentas"
                    value={kpis.total}
                    icon={Users}
                    colorClass="kpi-blue"
                    subtitle="Registradas en plataforma"
                    isActive={filtroKpi === 'TODOS'}
                    onClick={() => setFiltroKpi('TODOS')}
                />
                <KpiCard
                    title="Huéspedes"
                    value={kpis.huespedes}
                    icon={Users}
                    colorClass="kpi-green"
                    subtitle="Clientes de la cadena"
                    isActive={filtroKpi === 'HUESPED'}
                    onClick={() => setFiltroKpi('HUESPED')}
                />
                <KpiCard
                    title="Gerencia y Recepción"
                    value={kpis.personal}
                    icon={UserCheck}
                    colorClass="kpi-amber"
                    subtitle="Personal operativo y directivo"
                    isActive={filtroKpi === 'PERSONAL'}
                    onClick={() => setFiltroKpi('PERSONAL')}
                />
                <KpiCard
                    title="Administradores TI"
                    value={kpis.admins}
                    icon={ShieldCheck}
                    colorClass="kpi-red"
                    subtitle="Control y gestión total"
                    isActive={filtroKpi === 'ADMINISTRADOR'}
                    onClick={() => setFiltroKpi('ADMINISTRADOR')}
                />
            </div>

            {/* Buscador y Contador */}
            <div className="filters-card">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div className="search-input-wrapper" style={{ flex: 1, minWidth: '260px', maxWidth: '420px' }}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Buscar por nombre, correo o ID..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="table-counter">
                        Mostrando <strong>{usuariosFiltrados.length}</strong> de {usuarios.length} cuentas
                    </div>
                </div>
            </div>

            {/* Tabla de Usuarios */}
            <div className="table-card">
                {cargando && usuarios.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Cargando cuentas de usuario...</p>
                    </div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} className="empty-icon" />
                        <h3>No se encontraron usuarios</h3>
                        <p>Intenta ajustar los términos de búsqueda o restablecer los filtros.</p>
                        <button type="button" className="btn btn-secondary" onClick={() => { setFiltroKpi('TODOS'); setBusqueda(''); }}>
                            Limpiar filtros
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>ID</th>
                                    <th>Usuario</th>
                                    <th>Correo Electrónico</th>
                                    <th>Rol</th>
                                    <th>Verificación</th>
                                    <th>Estado</th>
                                    <th className="text-right" style={{ width: '110px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosFiltrados.map((u, idx) => {
                                    const esMismoAdmin = currentUser?.idUsuario === u.idUsuario;
                                    const nombreLimpio = limpiarNombre(u.nombre);
                                    const esAdmin = u.rol === 'ADMINISTRADOR';
                                    const esGerente = u.rol === 'GERENTE';
                                    const esRecepcionista = u.rol === 'RECEPCIONISTA';
                                    const esStaff = esAdmin || esGerente || esRecepcionista;
                                    const menuAbierto = menuActivoId === u.idUsuario;
                                    const abrirHaciaArriba = idx >= Math.max(0, usuariosFiltrados.length - 2);

                                    return (
                                        <tr key={u.idUsuario} className="table-row">
                                            <td>
                                                <span className="room-number-pill num">#{u.idUsuario}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                    <div style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: esStaff ? 'var(--admin-accent)' : 'var(--bg-subtle)',
                                                        color: esStaff ? 'var(--text-inverted)' : 'var(--text-primary)',
                                                        border: '1px solid var(--border-default)',
                                                        fontWeight: 700,
                                                        fontSize: '0.72rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {obtenerIniciales(nombreLimpio)}
                                                    </div>
                                                    <div className="hotel-cell">
                                                        <div className="hotel-name" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                            <span>{nombreLimpio}</span>
                                                            {esMismoAdmin && (
                                                                <span style={{
                                                                    fontSize: '0.68rem',
                                                                    fontWeight: 700,
                                                                    background: 'var(--badge-ocupada-bg)',
                                                                    color: 'var(--badge-ocupada-text)',
                                                                    border: '1px solid var(--badge-ocupada-border)',
                                                                    padding: '0.05rem 0.4rem',
                                                                    borderRadius: 'var(--radius-pill)'
                                                                }}>
                                                                    Tú
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="hotel-city num">
                                                            {u.fechaCreacion ? `Alta: ${String(u.fechaCreacion).split('T')[0]}` : 'Registro estándar'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.email}>
                                                {u.email}
                                            </td>
                                            <td>
                                                <span className="floor-badge" style={{
                                                    fontSize: '0.72rem',
                                                    background: esAdmin ? 'rgba(45, 90, 67, 0.12)' : esGerente ? 'rgba(184, 93, 56, 0.12)' : esRecepcionista ? 'rgba(22, 50, 79, 0.10)' : undefined,
                                                    color: esAdmin ? 'var(--admin-accent)' : esGerente ? 'var(--brand-terracotta-deep)' : esRecepcionista ? 'var(--brand-ocean)' : undefined,
                                                    borderColor: esAdmin ? 'rgba(45, 90, 67, 0.3)' : esGerente ? 'rgba(184, 93, 56, 0.3)' : esRecepcionista ? 'rgba(22, 50, 79, 0.25)' : undefined
                                                }}>
                                                    {esStaff ? <ShieldCheck size={12} /> : <Users size={12} />}
                                                    <span>{obtenerEtiquetaRol(u.rol)}</span>
                                                </span>
                                            </td>
                                            <td>
                                                <EstadoBadge estado={u.verificado ? 'Verificado' : 'Pendiente'} />
                                            </td>
                                            <td>
                                                <EstadoBadge estado={u.activo ? 'Activa' : 'Suspendida'} />
                                            </td>
                                            <td className="text-right">
                                                <div className="row-actions">
                                                    {/* Editar directo */}
                                                    <button
                                                        type="button"
                                                        className="btn-action btn-action-edit"
                                                        onClick={() => abrirModalEditar(u)}
                                                        title="Editar datos, rol y estados"
                                                        aria-label="Editar usuario"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>

                                                    {/* Menú Contextual para Verificar y Suspender/Eliminar */}
                                                    <div className="context-menu-wrapper" ref={menuAbierto ? menuRef : null}>
                                                        <button
                                                            type="button"
                                                            className={`btn-action ${menuAbierto ? 'is-active' : ''}`}
                                                            onClick={() => setMenuActivoId(menuAbierto ? null : u.idUsuario)}
                                                            title="Opciones avanzadas"
                                                            aria-label="Opciones avanzadas"
                                                        >
                                                            <MoreHorizontal size={15} />
                                                        </button>

                                                        {menuAbierto && (
                                                            <div className={`context-menu ${abrirHaciaArriba ? 'open-upward' : ''}`} role="menu">
                                                                {/* Opciones cuando es la propia cuenta del administrador en sesión */}
                                                                {esMismoAdmin ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            className="context-menu-item"
                                                                            onClick={() => abrirModalEditar(u)}
                                                                        >
                                                                            <Key size={14} style={{ color: 'var(--brand-terracotta, #b45309)' }} />
                                                                            <span>Cambiar mi contraseña</span>
                                                                        </button>
                                                                        <div className="context-menu-divider" />
                                                                        <div style={{ padding: '5px 8px', fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                                            <ShieldCheck size={13} style={{ color: '#059669', flexShrink: 0 }} />
                                                                            <span>Tu cuenta activa (protegida)</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {!u.verificado && (
                                                                            <button
                                                                                type="button"
                                                                                className="context-menu-item"
                                                                                onClick={() => solicitarVerificarManual(u)}
                                                                            >
                                                                                <UserCheck size={14} style={{ color: 'var(--color-success)' }} />
                                                                                <span>Verificar correo</span>
                                                                            </button>
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            className="context-menu-item"
                                                                            onClick={() => solicitarToggleEstado(u)}
                                                                        >
                                                                            {u.activo ? (
                                                                                <>
                                                                                    <Lock size={14} style={{ color: 'var(--badge-cancelada-text)' }} />
                                                                                    <span>Suspender cuenta</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Unlock size={14} style={{ color: 'var(--color-success)' }} />
                                                                                    <span>Reactivar cuenta</span>
                                                                                </>
                                                                            )}
                                                                        </button>

                                                                        <div className="context-menu-divider" />
                                                                        <button
                                                                            type="button"
                                                                            className="context-menu-item is-danger"
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
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para Crear / Editar Usuario */}
            <Modal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                title={modoEdicion ? `Editar Usuario #${formUser.idUsuario}` : 'Registrar Nuevo Usuario'}
                subtitle={modoEdicion ? 'Modifica los datos personales, rol de acceso y estados' : 'Alta de cuenta administrativa o de huésped'}
                icon={Users}
                maxWidth="530px"
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
                            {modoEdicion ? 'Nueva Contraseña (opcional)' : 'Contraseña inicial *'}
                        </label>
                        <input
                            type="password"
                            required={!modoEdicion}
                            minLength={8}
                            className="form-input"
                            value={formUser.password}
                            onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                            placeholder={modoEdicion ? 'Dejar en blanco para mantener la contraseña actual' : 'Mínimo 8 caracteres'}
                        />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Rol del usuario *</label>
                            <select
                                className="form-select"
                                value={formUser.rol}
                                onChange={(e) => setFormUser({ ...formUser, rol: e.target.value })}
                            >
                                <option value="HUESPED">Huésped</option>
                                <option value="RECEPCIONISTA">Recepcionista (Mostrador)</option>
                                <option value="GERENTE">Gerente General</option>
                                <option value="ADMINISTRADOR">Administrador (TI)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Verificación de correo *</label>
                            <select
                                className="form-select"
                                value={formUser.verificado ? 'true' : 'false'}
                                onChange={(e) => setFormUser({ ...formUser, verificado: e.target.value === 'true' })}
                            >
                                <option value="true">🟢 Verificado (Acceso permitido)</option>
                                <option value="false">🟡 Pendiente de verificar</option>
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
                            <option value="true">🟢 Cuenta Activa</option>
                            <option value="false">🔴 Cuenta Suspendida</option>
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setModalAbierto(false)}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {modoEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Diálogo de Confirmación */}
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
