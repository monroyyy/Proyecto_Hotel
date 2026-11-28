/**
 * hotelApi.js
 * Capa de servicio centralizada para consumir los endpoints REST de Spring Boot
 * con inyección automática de JWT (Authorization: Bearer) y manejo de expiración (401/403).
 */

const envApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const isRemoteHost = typeof window !== 'undefined'
    && window.location.hostname !== 'localhost'
    && window.location.hostname !== '127.0.0.1';
const rawBaseUrl = (!envApiUrl || (isRemoteHost && envApiUrl.includes('localhost')))
    ? '/api'
    : (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`);
export const API_BASE_URL = rawBaseUrl;
export const TOKEN_STORAGE_KEY = 'hotel_auth_token';
export const USER_STORAGE_KEY = 'hotel_auth_user';

export function getStoredToken() {
    try {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
        return null;
    }
}

export function getStoredUser() {
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveAuthSession(token, usuario) {
    try {
        if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
        if (usuario) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
    } catch (e) {
        console.error('Error al guardar sesión:', e);
    }
}

export function clearAuthSession() {
    try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
        console.error('Error al limpiar sesión:', e);
    }
}

/**
 * Helper genérico para peticiones fetch con token JWT y manejo de errores HTTP (400, 401, 403, 409)
 */
export async function apiRequest(endpoint, options = {}) {
    const token = getStoredToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : endpoint;
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${cleanEndpoint}`;

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            let errorMsg = `Error en el servidor (${response.status})`;
            let errorData = null;
            try {
                errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
                else if (errorData.message) errorMsg = errorData.message;
            } catch {
                // Respuesta no JSON
            }

            if (response.status === 404 && (errorMsg === 'Not Found' || errorMsg.includes('404'))) {
                errorMsg = `Endpoint no encontrado (404 en ${cleanEndpoint}). Reinicia el servidor Backend de Spring Boot para cargar los nuevos controladores de autenticación.`;
            }

            // Si el token expiró o es inválido (401) fuera de login, notificar cierre de sesión solo si había sesión activa
            const isAuthLogin = cleanEndpoint.includes('/auth/login');
            if (response.status === 401 && !isAuthLogin && Boolean(token)) {
                clearAuthSession();
                window.dispatchEvent(new CustomEvent('auth:session-expired', {
                    detail: { message: errorMsg || 'Su sesión ha expirado. Por favor inicie sesión nuevamente.' }
                }));
            }

            const err = new Error(errorMsg);
            err.status = response.status;
            err.data = errorData;
            throw err;
        }

        if (response.status === 204) return null;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error(`No se pudo conectar con el servidor Backend (${API_BASE_URL}). Verifica que Spring Boot esté en ejecución.`);
        }
        throw err;
    }
}

// ==========================================
// SERVICIOS DE AUTENTICACIÓN Y SESIONES
// ==========================================

export async function registrarUsuario(datos) {
    return await apiRequest('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
            nombre: datos.nombre,
            email: datos.email,
            // Enviar teléfono obligatorio de 10 dígitos en el registro público
            telefono: datos.telefono,
            password: datos.password,
        }),
    });
}

export async function verificarCorreoToken(token, email = '') {
    const query = email
        ? `token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        : `token=${encodeURIComponent(token)}`;
    return await apiRequest(`/auth/verificar?${query}`, {
        method: 'GET',
    });
}

export async function verificarCodigoCorreo(codigo, email = '') {
    return await apiRequest('/auth/verificar', {
        method: 'POST',
        body: JSON.stringify({ codigo: String(codigo).trim(), email: String(email || '').trim() }),
    });
}

export async function reenviarCorreoVerificacion(email) {
    return await apiRequest('/auth/reenviar-verificacion', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function loginUsuario(email, password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function logoutUsuario() {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
        clearAuthSession();
    }
}

export async function obtenerPerfilActual() {
    return await apiRequest('/auth/me');
}

export async function actualizarPerfilActual(datos) {
    return await apiRequest('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
            nombre: datos.nombre,
            telefono: datos.telefono,
        }),
    });
}

export async function solicitarRecuperacionPassword(email) {
    return await apiRequest('/auth/recuperar-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function restablecerPassword(datos) {
    return await apiRequest('/auth/restablecer-password', {
        method: 'POST',
        body: JSON.stringify({
            email: datos.email,
            codigo: String(datos.codigo || '').trim(),
            nuevaPassword: datos.nuevaPassword,
            confirmarPassword: datos.confirmarPassword,
        }),
    });
}

export async function cambiarPasswordUsuario(passwordActual, nuevaPassword, confirmarPassword) {
    const res = await apiRequest('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify({ passwordActual, nuevaPassword, confirmarPassword }),
    });
    if (res?.token) {
        const storedUser = getStoredUser();
        if (storedUser) {
            saveAuthSession(res.token, storedUser);
        } else {
            try {
                localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
            } catch {
                // ignorar error de almacenamiento
            }
        }
    }
    return res;
}

// ==========================================
// SERVICIOS DE GESTIÓN DE USUARIOS (ADMIN)
// ==========================================

export async function getUsuarios() {
    return await apiRequest('/usuarios');
}

export async function crearUsuarioAdmin(payload) {
    return await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function actualizarUsuarioAdmin(id, payload) {
    return await apiRequest(`/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function eliminarUsuarioAdmin(id) {
    return await apiRequest(`/usuarios/${id}`, {
        method: 'DELETE',
    });
}

export async function cambiarRolUsuario(id, rol) {
    return await apiRequest(`/usuarios/${id}/rol`, {
        method: 'PATCH',
        body: JSON.stringify({ rol }),
    });
}

export async function cambiarEstadoUsuario(id, payload) {
    return await apiRequest(`/usuarios/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

// ==========================================
// SERVICIOS PARA HABITACIONES
// ==========================================

export async function getHabitaciones(filters = {}) {
    const params = new URLSearchParams();
    if (filters.idHotel) params.append('idHotel', filters.idHotel);
    if (filters.idTipo) params.append('idTipo', filters.idTipo);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.piso) params.append('piso', filters.piso);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/habitaciones${query}`);
}

export async function getHabitacionById(id) {
    return await apiRequest(`/habitaciones/${id}`);
}

export async function crearHabitacion(datos) {
    return await apiRequest('/habitaciones', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

export async function actualizarHabitacion(id, datos) {
    return await apiRequest(`/habitaciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

export async function cambiarEstadoHabitacion(id, nuevoEstado) {
    return await apiRequest(`/habitaciones/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
    });
}

export async function eliminarHabitacion(id) {
    return await apiRequest(`/habitaciones/${id}`, {
        method: 'DELETE',
    });
}

export async function getResumenHabitaciones() {
    return await apiRequest('/habitaciones/resumen');
}

export async function getNotificacionesDesocupacion() {
    return await apiRequest('/habitaciones/notificaciones-desocupacion');
}

export async function agregarDiaExtraHabitacion(idHabitacion, dias = 1) {
    return await apiRequest(`/habitaciones/${idHabitacion}/dia-extra`, {
        method: 'PATCH',
        body: JSON.stringify({ dias }),
    });
}

// ==========================================
// SERVICIOS PARA HOTELES
// ==========================================

export async function getHoteles() {
    return await apiRequest('/hoteles');
}

export async function getHotelById(id) {
    return await apiRequest(`/hoteles/${id}`);
}

export async function crearHotel(datos) {
    return await apiRequest('/hoteles', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

export async function actualizarHotel(id, datos) {
    return await apiRequest(`/hoteles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

export async function eliminarHotel(id) {
    return await apiRequest(`/hoteles/${id}`, {
        method: 'DELETE',
    });
}

// ==========================================
// SERVICIOS PARA TIPOS DE HABITACIÓN
// ==========================================

export async function getTiposHabitacion() {
    return await apiRequest('/tipos-habitacion');
}

export async function getTipoHabitacionById(id) {
    return await apiRequest(`/tipos-habitacion/${id}`);
}

export async function crearTipoHabitacion(datos) {
    return await apiRequest('/tipos-habitacion', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

export async function actualizarTipoHabitacion(id, datos) {
    return await apiRequest(`/tipos-habitacion/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

export async function eliminarTipoHabitacion(id) {
    return await apiRequest(`/tipos-habitacion/${id}`, {
        method: 'DELETE',
    });
}

// ==========================================
// SERVICIOS PARA RESERVACIONES
// ==========================================

export async function buscarDisponibilidad(p) {
    const params = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    return await apiRequest(`/reservas/disponibilidad?${params.toString()}`);
}

export async function getReservas(opts = {}) {
    if (typeof opts === 'string') {
        const qStr = opts ? `?estado=${encodeURIComponent(opts)}` : '';
        return await apiRequest(`/reservas${qStr}`);
    }
    const params = new URLSearchParams();
    params.append('page', String(opts.page ?? 0));
    params.append('size', String(opts.size ?? 20));
    if (opts.sort) params.append('sort', opts.sort);
    if (opts.estado) params.append('estado', opts.estado);
    if (opts.hotelId) params.append('hotelId', String(opts.hotelId));
    if (opts.entradaDesde) params.append('entradaDesde', opts.entradaDesde);
    if (opts.entradaHasta) params.append('entradaHasta', opts.entradaHasta);
    if (opts.soloHoy) params.append('soloHoy', 'true');
    if (opts.salidaDesde) params.append('salidaDesde', opts.salidaDesde);
    if (opts.salidaHasta) params.append('salidaHasta', opts.salidaHasta);
    if (opts.q && opts.q.trim()) params.append('q', opts.q.trim());
    return await apiRequest(`/reservas?${params.toString()}`);
}

export async function getMisReservas(estado) {
    return await apiRequest(`/reservas/mias${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`);
}

export async function getResumenEstadosReservas() {
    return await apiRequest('/reservas/resumen-estados');
}

export async function crearReserva(datos) {
    return await apiRequest('/reservas', { method: 'POST', body: JSON.stringify(datos) });
}

export async function confirmarReserva(id, anticipo, metodoPago) {
    return await apiRequest(`/reservas/${id}/confirmar`, {
        method: 'PATCH',
        body: JSON.stringify({ anticipo, metodoPago }),
    });
}

export async function checkInReserva(id) {
    return await apiRequest(`/reservas/${id}/check-in`, {
        method: 'PATCH',
    });
}

export async function checkOutReserva(id, metodoPagoSaldo) {
    return await apiRequest(`/reservas/${id}/check-out`, {
        method: 'PATCH',
        body: JSON.stringify({ metodoPagoSaldo }),
    });
}

export async function marcarNoShowReserva(id) {
    return await apiRequest(`/reservas/${id}/no-show`, {
        method: 'PATCH',
    });
}

export async function revertirNoShowReserva(id) {
    return await apiRequest(`/reservas/${id}/revertir-no-show`, {
        method: 'PATCH',
    });
}

export async function getReembolsoReserva(id) {
    return await apiRequest(`/reservas/${id}/reembolso`);
}

export async function cancelarReserva(id, datosBancarios = {}) {
    return await apiRequest(`/reservas/${id}/cancelar`, {
        method: 'PATCH',
        body: JSON.stringify(datosBancarios),
    });
}

export async function actualizarReserva(id, datos) {
    return await apiRequest(`/reservas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

export async function extenderDiaExtraReserva(id, dias = 1) {
    return await apiRequest(`/reservas/${id}/dia-extra`, {
        method: 'PATCH',
        body: JSON.stringify({ dias }),
    });
}

export async function eliminarReserva(id) {
    return await apiRequest(`/reservas/${id}`, {
        method: 'DELETE',
    });
}

// ==========================================
// SERVICIOS PARA RECEPCIONISTAS Y HUÉSPEDES
// ==========================================

export async function getRecepcionistas() {
    return await apiRequest('/recepcionistas');
}

export async function buscarHuespedes(q = '') {
    return await apiRequest(`/huespedes?q=${encodeURIComponent(q)}`);
}

// ==========================================
// SERVICIOS DE DASHBOARD Y ANALÍTICA (GERENCIA)
// ==========================================

export async function getDashboardKpis(year, hotelId, incluirInactivos = false) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (hotelId) params.append('hotelId', hotelId);
    if (incluirInactivos) params.append('incluirInactivos', 'true');
    return await apiRequest(`/dashboard/kpis?${params.toString()}`);
}

export async function getDashboardMensualComparativo(years, hotelId, metrica = 'ingresos', incluirInactivos = false) {
    const params = new URLSearchParams();
    if (years) params.append('years', Array.isArray(years) ? years.join(',') : years);
    if (hotelId) params.append('hotelId', hotelId);
    if (metrica) params.append('metrica', metrica);
    if (incluirInactivos) params.append('incluirInactivos', 'true');
    return await apiRequest(`/dashboard/mensual-comparativo?${params.toString()}`);
}

export async function getDashboardPorCategoria(year, hotelId, incluirInactivos = false) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (hotelId) params.append('hotelId', hotelId);
    if (incluirInactivos) params.append('incluirInactivos', 'true');
    return await apiRequest(`/dashboard/por-categoria?${params.toString()}`);
}

export async function getDashboardPorHotel(year, incluirInactivos = false) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (incluirInactivos) params.append('incluirInactivos', 'true');
    return await apiRequest(`/dashboard/por-hotel?${params.toString()}`);
}

// ==========================================
// SERVICIOS DE INFORMES EJECUTIVOS (GERENCIA)
// ==========================================

export async function getInformeFinanciero(inicio, fin, hotelId, page = 0, size = 20, filtros = {}) {
    const params = new URLSearchParams();
    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    if (hotelId) params.append('hotelId', hotelId);
    params.append('page', String(page));
    params.append('size', String(size));
    if (filtros?.estado && filtros.estado !== 'TODOS') params.append('estado', filtros.estado);
    if (filtros?.metodoPago && filtros.metodoPago !== 'TODOS') params.append('metodoPago', filtros.metodoPago);
    if (filtros?.q && filtros.q.trim()) params.append('q', filtros.q.trim());
    return await apiRequest(`/informes/financiero?${params.toString()}`);
}

export async function getInformeOcupacion(year, hotelId, inicio = null, fin = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (hotelId) params.append('hotelId', hotelId);
    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    return await apiRequest(`/informes/ocupacion?${params.toString()}`);
}

export async function getInformeCancelaciones(year, hotelId, inicio = null, fin = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (hotelId) params.append('hotelId', hotelId);
    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    return await apiRequest(`/informes/cancelaciones?${params.toString()}`);
}

export async function getInformeCuentasPorCobrar(year, hotelId, inicio = null, fin = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (hotelId) params.append('hotelId', hotelId);
    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    return await apiRequest(`/informes/cuentas-por-cobrar?${params.toString()}`);
}
