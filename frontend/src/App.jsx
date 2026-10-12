import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HabitacionesPage from './pages/HabitacionesPage';
import PlaceholderPage from './pages/PlaceholderPage';

/**
 * App.jsx
 * Componente principal de la aplicación.
 */
export default function App() {
    const [activeTab, setActiveTab] = useState('habitaciones');

    return (
        <div className="app-layout">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="main-content">
                {activeTab === 'habitaciones' && <HabitacionesPage />}
                {activeTab === 'hoteles' && <PlaceholderPage tipo="hoteles" />}
                {activeTab === 'tipos' && <PlaceholderPage tipo="tipos" />}
            </main>

            <footer className="app-footer">
                <div className="footer-content">
                    <span>Hotel Paraíso &bull; Cadena Hotelera</span>
                    <span className="footer-muted">&copy; {new Date().getFullYear()} Sistema de Gestión Hotelera</span>
                </div>
            </footer>
        </div>
    );
}
