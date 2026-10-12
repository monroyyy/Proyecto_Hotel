import React from 'react';
import { Building2, Tag, Clock } from 'lucide-react';

/**
 * PlaceholderPage.jsx
 * Vista informativa limpia para módulos en configuración.
 */
export default function PlaceholderPage({ tipo }) {
    const info = tipo === 'hoteles'
        ? {
            titulo: 'Módulo de Hoteles',
            icono: Building2,
            descripcion: 'Administración de sedes, ubicaciones geográficas y estados de operación de la cadena.'
        }
        : {
            titulo: 'Tipos de Habitación',
            icono: Tag,
            descripcion: 'Catálogo de categorías, tarifas base por noche y capacidades de hospedaje.'
        };

    const Icon = info.icono;

    return (
        <div className="page-container">
            <div className="placeholder-card">
                <div className="placeholder-icon-wrapper">
                    <Icon size={40} />
                </div>
                <h2 className="placeholder-title">{info.titulo}</h2>
                <p className="placeholder-desc">{info.descripcion}</p>

                <div className="placeholder-notice">
                    <Clock size={16} />
                    <span>Módulo en mantenimiento o próxima actualización.</span>
                </div>
            </div>
        </div>
    );
}
