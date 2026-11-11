import React from 'react';

/**
 * KpiCard.jsx
 * Tarjeta de métrica estadística para el panel de control y filtrado rápido.
 * Aplica la clase utilitaria .num para alineación tabular de cifras.
 */
export default function KpiCard({ title, value, icon: Icon, colorClass, subtitle, onClick, isActive }) {
    const Component = onClick ? 'button' : 'div';
    return (
        <Component
            type={onClick ? 'button' : undefined}
            className={`kpi-card ${colorClass || ''} ${onClick ? 'clickable' : ''} ${isActive ? 'active-filter' : ''}`}
            onClick={onClick}
            aria-pressed={onClick ? Boolean(isActive) : undefined}
        >
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                {Icon && (
                    <span className="kpi-icon-wrapper" aria-hidden="true">
                        <Icon size={16} />
                    </span>
                )}
            </div>
            <div className="kpi-details">
                <span className="kpi-value num">{value}</span>
                {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
            </div>
        </Component>
    );
}
