/**
 * hotelApi.js
 * Capa de servicio centralizada para consumir los endpoints REST de Spring Boot.
 * Backend URL: http://localhost:8081/api
 */

const API_BASE_URL = 'http://localhost:8081/api';

/**
 * Helper genérico para peticiones fetch con manejo de errores y JSON
 */
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            let errorMsg = `Error en el servidor: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error) errorMsg = errorData.error;
                else if (errorData.message) errorMsg = errorData.message;
            } catch {
                // Si la respuesta no es JSON, se conserva el mensaje genérico
            }
            throw new Error(errorMsg);
        }

        // Si la respuesta es 204 No Content o no tiene cuerpo
        if (response.status === 204) return null;

        return await response.json();
    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error('No se pudo conectar con el servidor.');
        }
        throw err;
    }
}

// ==========================================
// SERVICIOS PARA HABITACIONES (TU INTERFAZ)
// ==========================================

/**
 * Obtener lista de habitaciones con filtros opcionales
 */
export async function getHabitaciones(filters = {}) {
    const params = new URLSearchParams();
    if (filters.idHotel) params.append('idHotel', filters.idHotel);
    if (filters.idTipo) params.append('idTipo', filters.idTipo);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.piso) params.append('piso', filters.piso);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/habitaciones${query}`);
}

/**
 * Obtener una habitación por ID
 */
export async function getHabitacionById(id) {
    return await apiRequest(`/habitaciones/${id}`);
}

/**
 * Registrar una nueva habitación
 */
export async function crearHabitacion(datos) {
    return await apiRequest('/habitaciones', {
        method: 'POST',
        body: JSON.stringify(datos),
    });
}

/**
 * Actualizar una habitación existente
 */
export async function actualizarHabitacion(id, datos) {
    return await apiRequest(`/habitaciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datos),
    });
}

/**
 * Cambio rápido de estado (Disponible, Ocupada, Mantenimiento)
 */
export async function cambiarEstadoHabitacion(id, nuevoEstado) {
    return await apiRequest(`/habitaciones/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado }),
    });
}

/**
 * Eliminar una habitación
 */
export async function eliminarHabitacion(id) {
    return await apiRequest(`/habitaciones/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Obtener métricas y KPIs de habitaciones
 */
export async function getResumenHabitaciones() {
    return await apiRequest('/habitaciones/resumen');
}

// ==========================================
// SERVICIOS AUXILIARES PARA SELECTORES
// ==========================================

/**
 * Obtener todos los hoteles (para el <select> de hotel)
 */
export async function getHoteles() {
    return await apiRequest('/hoteles');
}

/**
 * Obtener todos los tipos de habitación (para el <select> de tipo y precio)
 */
export async function getTiposHabitacion() {
    return await apiRequest('/tipos-habitacion');
}
