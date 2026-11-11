import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    BedDouble, Building2, Tag, Database, CalendarPlus, Zap,
    Users, LogOut, ChevronDown, TrendingUp, FileText, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatWidget from '../components/ChatWidget';
import NotificationBell from '../components/NotificationBell';

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
    const limpio = limpiarTextoCorrupto(nombre).trim();
    if (!limpio) return 'HP';
    const partes = limpio.split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return limpio.slice(0, 2).toUpperCase();
}

export default function AdminLayout({ children, activeTab, setActiveTab }) {
    const { user, isAuthenticated, logout, navigate, isGerente, isRecepcionista, isAdmin } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    // Cerrar el menú de perfil al hacer clic fuera o con Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuAbierto(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Pestañas dinámicas según el rol autenticado (Gerente vs Recepcionista vs Administrador)
    const adminNavItems = useMemo(() => {
        const rol = user?.rol;

        if (rol === 'RECEPCIONISTA') {
            return [
                { id: 'reservas', path: '/reservas', label: 'Reservaciones', icon: CalendarPlus },
                { id: 'habitaciones', path: '/habitaciones', label: 'Habitaciones', icon: BedDouble },
            ];
        }

        if (rol === 'GERENTE') {
            return [
                { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'informes', path: '/informes', label: 'Informes', icon: FileText },
                { id: 'reservas', path: '/reservas', label: 'Reservaciones', icon: CalendarPlus },
                { id: 'habitaciones', path: '/habitaciones', label: 'Habitaciones', icon: BedDouble },
            ];
        }

        // Por defecto: ADMINISTRADOR (Superusuario / TI)
        return [
            { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'informes', path: '/informes', label: 'Informes', icon: FileText },
            { id: 'reservas', path: '/reservas', label: 'Reservaciones', icon: CalendarPlus },
            { id: 'habitaciones', path: '/habitaciones', label: 'Habitaciones', icon: BedDouble },
            { id: 'hoteles', path: '/hoteles', label: 'Hoteles', icon: Building2 },
            { id: 'tipos', path: '/tipos', label: 'Categorías', icon: Tag },
            { id: 'consultas', path: '/consultas', label: 'Consultas SQL', icon: Zap },
            { id: 'usuarios', path: '/usuarios', label: 'Usuarios', icon: Users },
        ];
    }, [user?.rol]);

    const handleTabClick = (item) => {
        setMenuAbierto(false);
        if (setActiveTab) setActiveTab(item.id);
        navigate(item.path);
    };

    const nombreMostrar = limpiarTextoCorrupto(user?.nombre) || 'Personal';
    const iniciales = obtenerIniciales(user?.nombre);

    const etiquetaRol = (() => {
        if (user?.rol === 'GERENTE') return 'Gerencia General';
        if (user?.rol === 'RECEPCIONISTA') return 'Recepción';
        if (user?.rol === 'ADMINISTRADOR') return 'Administración TI';
        return user?.rol || 'Staff';
    })();

    return (
        <div className="app-layout admin-layout-container" data-surface="product">
            {/* Barra Superior Operativa de 54px */}
            <header className="admin-navbar">
                <div className="admin-navbar-inner">
                    {/* Wordmark puro: "Hotel Paraíso / Gestión Hotelera" */}
                    <button
                        type="button"
                        className="admin-wordmark"
                        onClick={() => navigate((isGerente || isAdmin) ? '/dashboard' : '/reservas')}
                        aria-label="Ir al inicio de Gestión Hotelera"
                    >
                        <span className="admin-wordmark-brand">Hotel Paraíso</span>
                        <span className="admin-wordmark-sep" aria-hidden="true">/</span>
                        <span className="admin-wordmark-context">Gestión Hotelera</span>
                    </button>

                    {/* Pestañas compactas con indicador activo en acento verde */}
                    <nav className="admin-tabs-nav" aria-label="Navegación administrativa">
                        {adminNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`admin-tab-btn ${isActive ? 'is-active' : ''}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={() => handleTabClick(item)}
                                >
                                    <Icon size={15} aria-hidden="true" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Menú de Cuenta con solo datos y "Cerrar sesión" */}
                    {isAuthenticated && user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <NotificationBell isAdminSurface={true} />
                            <div ref={menuRef} className="admin-account-wrapper">
                            <button
                                type="button"
                                className={`admin-account-trigger ${menuAbierto ? 'is-open' : ''}`}
                                onClick={() => setMenuAbierto((prev) => !prev)}
                                aria-expanded={menuAbierto}
                                aria-haspopup="menu"
                            >
                                <span className="admin-account-avatar" aria-hidden="true">
                                    {iniciales}
                                </span>
                                <span className="admin-account-name">{nombreMostrar}</span>
                                <ChevronDown size={14} className="admin-account-chevron" aria-hidden="true" />
                            </button>

                            {menuAbierto && (
                                <div className="admin-account-menu" role="menu" aria-label="Menú de cuenta">
                                    <div className="admin-account-data">
                                        <div className="admin-account-data-name">{nombreMostrar}</div>
                                        <div className="admin-account-data-email">{user.email}</div>
                                        <div className="admin-account-data-role">
                                            {etiquetaRol}
                                        </div>
                                    </div>
                                    <div className="admin-account-divider" role="separator" />
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="admin-account-logout"
                                        onClick={() => {
                                            setMenuAbierto(false);
                                            logout();
                                        }}
                                    >
                                        <LogOut size={15} aria-hidden="true" />
                                        <span>Cerrar sesión</span>
                                    </button>
                                </div>
                            )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Contenido Operativo */}
            <main className="main-content admin-main-content">
                {children}
            </main>

            {/* Asistente Virtual para Administración */}
            {isAuthenticated && <ChatWidget />}

            {/* Footer Operativo */}
            <footer className="app-footer admin-footer">
                <div className="footer-content">
                    <span className="admin-footer-brand">Hotel Paraíso / Gestión Hotelera</span>
                    <span className="footer-muted">&copy; {new Date().getFullYear()} Sistema de Gestión Hotelera</span>
                </div>
            </footer>
        </div>
    );
}
