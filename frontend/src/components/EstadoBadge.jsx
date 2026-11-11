import React from 'react';

/**
 * EstadoBadge.jsx
 * Badge de estado unificado y semánticamente adaptativo.
 * Utiliza variables de diseño (.estado-badge, .estado-prereserva, etc.) que se
 * configuran para fondo claro (Brand) o fondo oscuro (Product).
 */
export default function EstadoBadge({ estado }) {
    if (!estado) return null;

    const norm = estado.toLowerCase().replace(/[^a-z0-9]/g, '');
    let estadoClass = 'estado-default';

    if (norm.includes('prereserva') || norm.includes('pendiente')) {
        estadoClass = 'estado-prereserva';
    } else if (norm.includes('confirma') || norm.includes('disponible') || norm.includes('activo') || norm.includes('verificado') || norm.includes('finaliz')) {
        estadoClass = 'estado-confirmada';
    } else if (norm.includes('ocupa')) {
        estadoClass = 'estado-ocupada';
    } else if (norm.includes('cancela') || norm.includes('noshow') || norm.includes('bloque') || norm.includes('inactivo') || norm.includes('mantenimiento')) {
        estadoClass = 'estado-cancelada';
    }

    return (
        <span className={`estado-badge ${estadoClass}`}>
            <span className="estado-badge-dot" />
            <span>{estado}</span>
        </span>
    );
}
