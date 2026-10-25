import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HabitacionesPage from './pages/HabitacionesPage';
import HotelesPage from './pages/HotelesPage';
import TiposHabitacionPage from './pages/TiposHabitacionPage';
import ConsultasPage from './pages/ConsultasPage';
import ChatWidget from './components/ChatWidget';

/**
 * App.jsx
 * Componente principal de la aplicacion con ChatWidget de IA flotante.
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

            {/* Asistente Virtual Inteligente con Streaming */}
            <ChatWidget />

            <footer className="app-footer">
                <div className="footer-content">
                    <span>Hotel Paraiso &bull; Cadena Hotelera</span>
                    <span className="footer-muted">&copy; {new Date().getFullYear()} Sistema de Gestion Hotelera con IA</span>
                </div>
            </footer>
        </div>
    );
}