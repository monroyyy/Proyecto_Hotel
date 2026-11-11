package com.ico.hotel.models;

/**
 * Roles oficiales del sistema de reservaciones según la arquitectura hotelera:
 * - HUESPED: Cliente final (Portal móvil/web comercial, consulta, pre-reservas, itinerarios).
 * - RECEPCIONISTA: Personal operativo de mostrador (Reservaciones, check-in, check-out, pagos, habitaciones).
 * - GERENTE: Personal directivo/ejecutivo (Dashboards de estadísticas, cálculos financieros, informes, reembolsos).
 * - ADMINISTRADOR: Administrador de sistemas / TI (Usuarios, catálogos maestros, consultas SQL, configuración).
 */
public enum Rol {
    HUESPED,
    RECEPCIONISTA,
    GERENTE,
    ADMINISTRADOR
}
