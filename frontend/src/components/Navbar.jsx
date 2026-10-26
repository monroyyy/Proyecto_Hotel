import React from 'react';
import { BedDouble, Building2, Tag, Hotel, Database, CalendarPlus } from 'lucide-react';

/**
 * Navbar.jsx
 * Barra de navegación principal del sistema hotelero.
 */
export default function Navbar({ activeTab, setActiveTab }) {
    const navItems = [
        {
            id: 'reservas',
            label: 'Reservaciones',
            icon: CalendarPlus
        },
        {
            id: 'habitaciones',
            label: 'Habitaciones',
            icon: BedDouble
        },
        {
            id: 'hoteles',
            label: 'Hoteles',
            icon: Building2
        },
        {
            id: 'tipos',
            label: 'Tipos de Habitación',
            icon: Tag
        },
        {
            id: 'consultas',
            label: 'Consultas',
            icon: Database
        }
    ];

    return (
        <header className="navbar-container">
            <div className="navbar-content">
                {/* Logo e Identidad del Hotel */}
                <div className="navbar-brand">
                    <div className="brand-icon">
                        <Hotel size={22} />
                    </div>
                    <div>
                        <div className="brand-title">Hotel Paraíso</div>
                        <div className="brand-subtitle">Administración de Cadena</div>
                    </div>
                </div>

                {/* Navegación por Módulos */}
                <nav className="navbar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <Icon size={17} />
                                <span className="tab-label">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
