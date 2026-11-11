import React, { useState, useRef, useEffect } from 'react';
import {
    Compass, CalendarCheck, Sparkles, User, LogOut,
    CheckCircle2, Hotel, LogIn, UserPlus, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatWidget from '../components/ChatWidget';
import NotificationBell from '../components/NotificationBell';
import './GuestLayout.css';

function limpiarTextoCorrupto(texto) {
    if (!texto) return '';
    return texto
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ');
}

function obtenerIniciales(nombre) {
    const limpio = limpiarTextoCorrupto(nombre || 'Usuario').trim();
    const partes = limpio.split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return limpio.slice(0, 2).toUpperCase();
}

export default function GuestLayout({ children, activeTab, setActiveTab }) {
    const { user, isAuthenticated, logout, navigate, routePath } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const headerRef = useRef(null);

    const huespedNavItems = [
        {
            id: 'portal-huesped',
            path: '/portal-huesped',
            label: 'Explorar Hoteles',
            desc: 'Descubre nuestras propiedades, tarifas y suites frente al mar',
            icon: Compass,
            publico: true
        },
        {
            id: 'mis-reservas',
            path: '/mis-reservas',
            label: 'Mis Reservaciones',
            desc: 'Consulta tu itinerario, pagos confirmados y pre-reservas',
            icon: CalendarCheck,
            publico: false
        },
        {
            id: 'experiencias',
            path: '/experiencias',
            label: 'Guía y Servicios',
            desc: 'Gastronomía local, bienestar, traslados y atención 24/7',
            icon: Sparkles,
            publico: true
        },
        {
            id: 'mi-perfil',
            path: '/mi-perfil',
            label: 'Mi Perfil',
            desc: 'Administra tus datos personales y preferencias de viaje',
            icon: User,
            publico: false
        }
    ];

    // Cerrar el menú hamburguesa con Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleTabClick = (item) => {
        setMenuAbierto(false);
        if (setActiveTab) setActiveTab(item.id);
        navigate(item.path);
    };

    const nombreMostrar = limpiarTextoCorrupto(user?.nombre);
    const seccionActual = huespedNavItems.find((item) => item.id === activeTab) || huespedNavItems[0];
    const ActiveIcon = seccionActual.icon;

    const isAuthScreen = ['/login', '/registro', '/verificar-correo'].includes(routePath);

    if (isAuthScreen) {
        return (
            <div className="auth-surface-wrapper" data-surface="brand" style={{ minHeight: '100vh', background: 'var(--brand-sand-light)', color: 'var(--text-primary)' }}>
                {children}
            </div>
        );
    }

    return (
        <div className="app-layout guest-layout-container" data-surface="brand">
            {/* Backdrop traslúcido cuando el menú hamburguesa está desplegado */}
            <div
                className={`guest-drawer-backdrop ${menuAbierto ? 'is-open' : ''}`}
                onClick={() => setMenuAbierto(false)}
                aria-hidden="true"
            />

            {/* Cabecera de Marca con Barra Ergonómica */}
            <header
                ref={headerRef}
                className={`guest-navbar ${menuAbierto ? 'is-open' : ''}`}
            >
                <div className="guest-navbar-inner">
                    {/* Izquierda: Wordmark de Marca */}
                    <div className="guest-navbar-left">
                        <button
                            type="button"
                            className="guest-brand-wordmark"
                            onClick={() => {
                                setMenuAbierto(false);
                                if (setActiveTab) setActiveTab('portal-huesped');
                                navigate('/portal-huesped');
                            }}
                        >
                            <div className="guest-brand-emblem">
                                <Hotel size={20} />
                            </div>
                            <div>
                                <div className="guest-brand-title">Hotel Paraíso</div>
                                <div className="guest-brand-subtitle">Costa &amp; Hospitalidad</div>
                            </div>
                        </button>
                    </div>

                    {/* Centro: Enlaces directos en escritorio */}
                    <nav className="guest-navbar-desktop-nav" aria-label="Navegación principal">
                        {huespedNavItems
                            .filter(item => isAuthenticated || item.publico)
                            .map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`guest-desktop-nav-link ${isActive ? 'is-active' : ''}`}
                                        onClick={() => handleTabClick(item)}
                                    >
                                        <Icon size={15} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                    </nav>

                    {/* Derecha: Acciones según sesión activa o Modo Visitante */}
                    <div className="guest-navbar-actions">
                        {isAuthenticated && user ? (
                            <>
                                <NotificationBell isAdminSurface={false} />
                                <button
                                    type="button"
                                    className="guest-user-chip"
                                    onClick={() => handleTabClick(huespedNavItems[3])}
                                    title="Ir a Mi Perfil"
                                >
                                    <div className="guest-user-avatar">
                                        {obtenerIniciales(nombreMostrar)}
                                    </div>
                                    <div className="guest-user-meta">
                                        <div className="guest-user-name">{nombreMostrar}</div>
                                        <div className="guest-user-role">Huésped Paraíso</div>
                                    </div>
                                </button>
                            </>
                        ) : (
                            <div className="guest-visitor-auth-btns">
                                <button
                                    type="button"
                                    className="btn btn-secondary guest-auth-btn-login"
                                    onClick={() => navigate('/login')}
                                >
                                    <LogIn size={14} />
                                    <span>Iniciar Sesión</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary guest-auth-btn-reg"
                                    onClick={() => navigate('/registro')}
                                >
                                    <UserPlus size={14} />
                                    <span>Crear Cuenta</span>
                                </button>
                            </div>
                        )}

                        {/* Botón de menú móvil / compacto */}
                        <button
                            type="button"
                            className={`guest-hamburger-btn ${menuAbierto ? 'is-open' : ''}`}
                            onClick={() => setMenuAbierto((prev) => !prev)}
                            aria-expanded={menuAbierto}
                            aria-label={menuAbierto ? 'Ocultar menú' : 'Mostrar menú'}
                        >
                            <span className="hamburger-box" aria-hidden="true">
                                <span className="hamburger-line" />
                                <span className="hamburger-line" />
                                <span className="hamburger-line" />
                            </span>
                            <span className="guest-hamburger-text">{menuAbierto ? 'Cerrar' : 'Menú'}</span>
                        </button>
                    </div>
                </div>

                {/* Panel Desplegable Ergonómico (Limpio, sin textos invasivos) */}
                <nav
                    className={`guest-nav-drawer ${menuAbierto ? 'is-open' : ''}`}
                    aria-label="Navegación general"
                >
                    <div className="guest-nav-drawer-inner">
                        <div className="guest-nav-drawer-top-row">
                            <span className="guest-nav-drawer-brand-tag">
                                Navegación · Hotel Paraíso
                            </span>
                        </div>

                        <div className="guest-mobile-menu-list">
                            {huespedNavItems
                                .filter(item => isAuthenticated || item.publico)
                                .map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`guest-mobile-nav-item ${isActive ? 'active' : ''}`}
                                            onClick={() => handleTabClick(item)}
                                        >
                                            <div className="guest-mobile-nav-icon">
                                                <Icon size={18} />
                                            </div>
                                            <div className="guest-mobile-nav-content">
                                                <div className="guest-mobile-nav-title">{item.label}</div>
                                                <div className="guest-mobile-nav-desc">{item.desc}</div>
                                            </div>
                                            {isActive && (
                                                <span className="guest-mobile-nav-active-pill">Actual</span>
                                            )}
                                        </button>
                                    );
                                })}
                        </div>

                        {/* Acciones del menú desplegable */}
                        {isAuthenticated && user ? (
                            <div className="guest-mobile-drawer-footer">
                                <div className="guest-drawer-user-summary">
                                    <span className="guest-drawer-verified-pill">
                                        <CheckCircle2 size={13} />
                                        Cuenta verificada
                                    </span>
                                    <span className="guest-drawer-email">{user.email}</span>
                                </div>

                                <button
                                    type="button"
                                    className="guest-drawer-logout-btn"
                                    onClick={() => {
                                        setMenuAbierto(false);
                                        logout();
                                    }}
                                >
                                    <LogOut size={15} />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        ) : (
                            <div className="guest-mobile-drawer-auth-prompt">
                                <span className="guest-mobile-auth-text">
                                    Acceso Huéspedes
                                </span>
                                <div className="guest-mobile-auth-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => { setMenuAbierto(false); navigate('/login'); }}
                                    >
                                        <LogIn size={14} /> Iniciar Sesión
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => { setMenuAbierto(false); navigate('/registro'); }}
                                    >
                                        <UserPlus size={14} /> Crear Cuenta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            </header>

            {/* Contenido Principal de Marca */}
            <main className="main-content guest-main-content" style={{ flex: 1 }}>
                {children}
            </main>

            {/* Chatbot Asistente exclusivo para Huéspedes Autenticados */}
            {isAuthenticated && <ChatWidget />}

            {/* Footer de Marca */}
            <footer className="app-footer guest-footer">
                <div className="guest-footer-inner">
                    <span style={{ color: 'var(--brand-ocean)', fontWeight: 600 }}>
                        Hotel Paraíso &bull; Hospitalidad Mexicana Frente al Mar
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                        &copy; {new Date().getFullYear()} Hotel Paraíso
                    </span>
                </div>
            </footer>
        </div>
    );
}
