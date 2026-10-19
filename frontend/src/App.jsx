import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HabitacionesPage from './pages/HabitacionesPage';
import HotelesPage from './pages/HotelesPage';
import TiposHabitacionPage from './pages/TiposHabitacionPage';
import ConsultasPage from './pages/ConsultasPage';

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
                {activeTab === 'hoteles' && <HotelesPage />}
                {activeTab === 'tipos' && <TiposHabitacionPage />}
                {activeTab === 'consultas' && <ConsultasPage />}
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