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
            if (isAuthenticated && (isGerente || isAdmin)) {
                navigate('/dashboard', true);
            } else if (isAuthenticated && isRecepcionista) {
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
            if (isGerente || isAdmin) {
                navigate('/dashboard', true);
            } else if (isRecepcionista) {
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

        if (isGerente || isAdmin) return 'dashboard';
        if (isRecepcionista) return 'reservas';
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

        // Si el usuario es HUESPED o Visitante sin sesión, mostrar el Portal de Huéspedes
        if (!isStaff) {
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
            return (
                <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{
                        maxWidth: 460, margin: '0 auto', background: 'var(--bg-surface)',
                        border: '1px solid var(--color-error-border)', borderRadius: 16, padding: '2.2rem'
                    }}>
                        <ShieldAlert size={44} style={{ color: 'var(--color-error)', marginBottom: 12 }} />
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                            Módulo restringido para Recepción
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                            Esta sección es exclusiva para Gerencia y Administración.
                        </p>
                        <button type="button" className="btn btn-primary" onClick={() => navigate('/reservas')}>
                            <ArrowLeft size={16} /> Ir a Control de Reservaciones
                        </button>
                    </div>
                </div>
            );
        }

        // Control de permisos para GERENTE (no tiene acceso a gestión técnica de usuarios ni consola SQL)
        if (isGerente && (routePath.startsWith('/usuarios') || routePath.startsWith('/consultas'))) {
            return (
                <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{
                        maxWidth: 460, margin: '0 auto', background: 'var(--bg-surface)',
                        border: '1px solid var(--color-error-border)', borderRadius: 16, padding: '2.2rem'
                    }}>
                        <ShieldAlert size={44} style={{ color: 'var(--color-error)', marginBottom: 12 }} />
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                            Módulo exclusivo de Administración TI
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                            La gestión de usuarios y la consola de consultas SQL son exclusivas para el Administrador del sistema.
                        </p>
                        <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft size={16} /> Volver al Dashboard
                        </button>
                    </div>
                </div>
            );
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
