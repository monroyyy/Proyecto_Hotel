import React from 'react';

/**
 * KpiCard.jsx
 * Tarjeta de métrica estadística para el panel de control.
 */
export default function KpiCard({ title, value, icon: Icon, colorClass, subtitle, onClick, isActive }) {
    return (
        <div 
            className={`kpi-card ${colorClass} ${onClick ? 'clickable' : ''} ${isActive ? 'active-filter' : ''}`}
            onClick={onClick}
        >
            <div className="kpi-icon-wrapper">
                <Icon size={24} />
            </div>
            <div className="kpi-details">
                <span className="kpi-title">{title}</span>
                <span className="kpi-value">{value}</span>
                {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
            </div>
        </div>
    );
}
