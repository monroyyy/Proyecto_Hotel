import React, { useEffect } from 'react';
import GuestLayout from './layouts/GuestLayout';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import InformesPage from './pages/InformesPage';
import HabitacionesPage from './pages/HabitacionesPage';
import HotelesPage from './pages/HotelesPage';
import TiposHabitacionPage from './pages/TiposHabitacionPage';
import ConsultasPage from './pages/ConsultasPage';
import ReservasPage from './pages/ReservasPage';
import UsuariosPage from './pages/UsuariosPage';
import PortalHuespedPage from './pages/PortalHuespedPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import RecoverPasswordPage from './pages/RecoverPasswordPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const AUTH_SCREEN_PATHS = ['/login', '/registro', '/verificar-correo', '/recuperar-password'];
const GUEST_PUBLIC_PATHS = ['/', '/portal-huesped', '/mis-reservas', '/experiencias', '/mi-perfil'];

function AppContent() {
    const {
        isAuthenticated,
        isAdmin,
        isGerente,
        isRecepcionista,
        isStaff,
        loading,
        routePath,
        navigate
    } = useAuth();

    // Redirecciones automáticas según rol y autenticación
    useEffect(() => {
        if (loading) return;

        if (routePath === '/') {
            if (isAuthenticated && isGerente) {
                navigate('/dashboard', true);
            } else if (isAuthenticated && (isRecepcionista || isAdmin)) {
                navigate('/reservas', true);
            } else {
                navigate('/portal-huesped', true);
            }
            return;
        }

        if (!isAuthenticated) {
            const isAllowedPublic = AUTH_SCREEN_PATHS.includes(routePath)
                || GUEST_PUBLIC_PATHS.some(p => p !== '/' && routePath.startsWith(p));
            if (!isAllowedPublic) {
                navigate('/login', true);
            }
        } else if (isAuthenticated && (routePath === '/login' || routePath === '/registro')) {
            if (isGerente) {
                navigate('/dashboard', true);
            } else if (isRecepcionista || isAdmin) {
                navigate('/reservas', true);
            } else {
                navigate('/portal-huesped', true);
            }
        }
    }, [loading, isAuthenticated, isAdmin, isGerente, isRecepcionista, routePath, navigate]);

    const activeTab = (() => {
        if (routePath.startsWith('/dashboard')) return 'dashboard';
        if (routePath.startsWith('/informes')) return 'informes';
        if (routePath.startsWith('/habitaciones')) return 'habitaciones';
        if (routePath.startsWith('/hoteles')) return 'hoteles';
        if (routePath.startsWith('/tipos')) return 'tipos';
        if (routePath.startsWith('/consultas')) return 'consultas';
        if (routePath.startsWith('/usuarios')) return 'usuarios';
        if (routePath.startsWith('/mis-reservas')) return 'mis-reservas';
        if (routePath.startsWith('/experiencias')) return 'experiencias';
        if (routePath.startsWith('/mi-perfil')) return 'mi-perfil';
        if (routePath.startsWith('/portal-huesped')) return 'portal-huesped';
        if (routePath.startsWith('/reservas')) return 'reservas';

        if (isGerente) return 'dashboard';
        if (isRecepcionista || isAdmin) return 'reservas';
        return 'portal-huesped';
    })();

    const setActiveTab = (tabId) => {
        navigate(`/${tabId}`);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Validando sesión...
            </div>
        );
    }

    const renderMainView = () => {
        if (routePath === '/verificar-correo') {
            return <VerifyEmailPage />;
        }
        if (routePath === '/recuperar-password') {
            return <RecoverPasswordPage />;
        }
        if (routePath === '/registro') {
            return <RegisterPage />;
        }
        if (routePath === '/login') {
            return <LoginPage />;
        }

        const renderForbidden = (homeRoute) => (
            <div style={{
                minHeight: '62vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                padding: '2rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                        fontSize: 24,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        paddingRight: 20,
                        marginRight: 20,
                        borderRight: '1px solid #e5e7eb',
                        lineHeight: '44px',
                        color: '#111827'
                    }}>
                        403
                    </span>
                    <span style={{ fontSize: 14, color: '#4b5563' }}>
                        No tienes permiso para acceder a esta página.
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(homeRoute)}
                    style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #16324f',
                        padding: '0 0 2px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#16324f',
                        cursor: 'pointer'
                    }}
                >
                    Volver al inicio
                </button>
            </div>
        );

        const isInternalRoute = routePath.startsWith('/dashboard')
            || routePath.startsWith('/informes')
            || routePath.startsWith('/usuarios')
            || routePath.startsWith('/consultas')
            || routePath.startsWith('/hoteles')
            || routePath.startsWith('/tipos')
            || routePath.startsWith('/reservas')
            || routePath.startsWith('/habitaciones');

        // Si un usuario no staff intenta entrar a una ruta interna, mostrar 403
        if (!isStaff && isInternalRoute) {
            return renderForbidden('/portal-huesped');
        }

        // Si el usuario es HUESPED, Visitante sin sesión, o navega explícitamente a una ruta del portal de huéspedes
        const isExplicitGuestRoute = routePath.startsWith('/portal-huesped')
            || routePath.startsWith('/mis-reservas')
            || routePath.startsWith('/experiencias')
            || routePath.startsWith('/mi-perfil');
        if (!isStaff || isExplicitGuestRoute) {
            let initialSection = 'explorar';
            if (routePath.startsWith('/mis-reservas')) initialSection = 'mis-reservas';
            else if (routePath.startsWith('/experiencias')) initialSection = 'experiencias';
            else if (routePath.startsWith('/mi-perfil')) initialSection = 'mi-perfil';
            return <PortalHuespedPage initialSection={initialSection} />;
        }

        // Control de permisos para RECEPCIONISTA (solo reservas y habitaciones)
        if (isRecepcionista && (
            routePath.startsWith('/dashboard') ||
            routePath.startsWith('/informes') ||
            routePath.startsWith('/usuarios') ||
            routePath.startsWith('/consultas') ||
            routePath.startsWith('/hoteles') ||
            routePath.startsWith('/tipos')
        )) {
            return renderForbidden('/reservas');
        }

        // Control de permisos para ADMINISTRADOR (NO puede ver Dashboard, Informes ni Usuarios)
        if (isAdmin && (
            routePath.startsWith('/dashboard') ||
            routePath.startsWith('/informes') ||
            routePath.startsWith('/usuarios')
        )) {
            return renderForbidden('/reservas');
        }

        switch (activeTab) {
            case 'dashboard':
                return <DashboardPage />;
            case 'informes':
                return <InformesPage />;
            case 'habitaciones':
                return <HabitacionesPage />;
            case 'hoteles':
                return <HotelesPage />;
            case 'tipos':
                return <TiposHabitacionPage />;
            case 'consultas':
                return <ConsultasPage />;
            case 'usuarios':
                return <UsuariosPage />;
            case 'reservas':
            default:
                return <ReservasPage />;
        }
    };

    // Separación de layouts: GuestLayout (marca) vs AdminLayout (producto)
    const isGuestSurface = !isAuthenticated
        || !isStaff
        || AUTH_SCREEN_PATHS.includes(routePath)
        || routePath.startsWith('/portal-huesped')
        || routePath.startsWith('/mis-reservas')
        || routePath.startsWith('/experiencias')
        || routePath.startsWith('/mi-perfil');

    if (isGuestSurface) {
        return (
            <GuestLayout activeTab={activeTab} setActiveTab={setActiveTab}>
                {renderMainView()}
            </GuestLayout>
        );
    }

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            {renderMainView()}
        </AdminLayout>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
