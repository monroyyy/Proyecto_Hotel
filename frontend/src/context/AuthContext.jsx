import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getStoredToken,
    getStoredUser,
    saveAuthSession,
    clearAuthSession,
    loginUsuario,
    logoutUsuario,
    obtenerPerfilActual,
    actualizarPerfilActual
} from '../api/hotelApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => getStoredToken());
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(Boolean(getStoredToken()));
    const [sessionNotice, setSessionNotice] = useState('');

    // Navegación SPA ligera con History API para soportar rutas como /verificar-correo?token=...
    const [routePath, setRoutePath] = useState(() => window.location.pathname || '/');
    const [routeSearch, setRouteSearch] = useState(() => window.location.search || '');

    const navigate = useCallback((path, replace = false) => {
        const [pathname, searchPart] = path.split('?');
        const search = searchPart ? `?${searchPart}` : '';
        if (replace) {
            window.history.replaceState({}, '', `${pathname}${search}`);
        } else {
            window.history.pushState({}, '', `${pathname}${search}`);
        }
        setRoutePath(pathname);
        setRouteSearch(search);
    }, []);

    useEffect(() => {
        const handlePopState = () => {
            setRoutePath(window.location.pathname || '/');
            setRouteSearch(window.location.search || '');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Escuchar evento global cuando un endpoint responde 401 (token expirado o revocado)
    useEffect(() => {
        const handleSessionExpired = (e) => {
            setToken(null);
            setUser(null);
            setSessionNotice(e.detail?.message || 'Su sesión ha expirado. Por favor inicie sesión nuevamente.');
            navigate('/login', true);
        };
        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, [navigate]);

    // Validar el token almacenado al cargar la aplicación
    useEffect(() => {
        const storedToken = getStoredToken();
        if (!storedToken) {
            setLoading(false);
            return;
        }
        obtenerPerfilActual()
            .then((perfil) => {
                setUser(perfil);
                saveAuthSession(storedToken, perfil);
            })
            .catch(() => {
                clearAuthSession();
                setToken(null);
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = async (email, password) => {
        setSessionNotice('');
        const res = await loginUsuario(email, password);
        saveAuthSession(res.token, res.usuario);
        setToken(res.token);
        setUser(res.usuario);
        let rutaDestino = '/portal-huesped';
        if (res.usuario?.rol === 'GERENTE') {
            rutaDestino = '/dashboard';
        } else if (res.usuario?.rol === 'RECEPCIONISTA' || res.usuario?.rol === 'ADMINISTRADOR') {
            rutaDestino = '/reservas';
        }
        navigate(rutaDestino, true);
        return res;
    };

    const logout = async () => {
        await logoutUsuario();
        setToken(null);
        setUser(null);
        setSessionNotice('');
        navigate('/login', true);
    };

    const refreshUser = useCallback(async () => {
        const storedToken = getStoredToken();
        if (!storedToken) return null;
        const perfil = await obtenerPerfilActual();
        saveAuthSession(storedToken, perfil);
        setUser(perfil);
        return perfil;
    }, []);

    const updateProfile = useCallback(async (datos) => {
        const perfilActualizado = await actualizarPerfilActual(datos);
        const storedToken = getStoredToken();
        if (storedToken) {
            saveAuthSession(storedToken, perfilActualizado);
        }
        setUser(perfilActualizado);
        return perfilActualizado;
    }, []);

    const updateToken = useCallback((newToken) => {
        if (!newToken) return;
        const storedUser = getStoredUser();
        saveAuthSession(newToken, storedUser || user);
        setToken(newToken);
    }, [user]);

    const isAuthenticated = Boolean(token && user);
    const isAdmin = user?.rol === 'ADMINISTRADOR';
    const isGerente = user?.rol === 'GERENTE';
    const isRecepcionista = user?.rol === 'RECEPCIONISTA';
    const isStaff = isGerente || isRecepcionista || isAdmin;
    const isHuesped = user?.rol === 'HUESPED' || (!isStaff);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated,
            isAdmin,
            isGerente,
            isRecepcionista,
            isStaff,
            isHuesped,
            login,
            logout,
            refreshUser,
            updateProfile,
            updateToken,
            routePath,
            routeSearch,
            navigate,
            sessionNotice,
            setSessionNotice
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
    }
    return ctx;
}
