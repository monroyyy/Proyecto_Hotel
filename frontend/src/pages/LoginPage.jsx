import React, { useState, useEffect } from 'react';
import { Hotel, Mail, Lock, LogIn, AlertCircle, CheckCircle2, Send, UserPlus, Eye, EyeOff, MapPin, Sparkles, ShieldCheck, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reenviarCorreoVerificacion } from '../api/hotelApi';
import IMAGENES_HOTEL from '../data/imagenes';
import './AuthSplit.css';

const SLIDES_BIENVENIDA = [
    {
        img: IMAGENES_HOTEL.heroCosta.webp,
        alt: IMAGENES_HOTEL.heroCosta.alt,
        cita: '"El rumor sereno de las olas del Pacífico, linos frescos y la hospitalidad más genuina de México."'
    },
    {
        img: IMAGENES_HOTEL.alberca.webp,
        alt: IMAGENES_HOTEL.alberca.alt,
        cita: '"Amaneceres serenos frente al horizonte marino y espacios diseñados para un descanso total."'
    },
    {
        img: IMAGENES_HOTEL.suiteVistaMar.webp,
        alt: IMAGENES_HOTEL.suiteVistaMar.alt,
        cita: '"Suites de autor con vistas despejadas al océano y atención personalizada las 24 horas."'
    },
    {
        img: IMAGENES_HOTEL.restaurante.webp,
        alt: IMAGENES_HOTEL.restaurante.alt,
        cita: '"Gastronomía de mar y atardeceres dorados en nuestras terrazas frente a la playa."'
    }
];

export default function LoginPage() {
    const { login, navigate, routeSearch, sessionNotice, setSessionNotice } = useAuth();
    const [email, setEmail] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('email') || '';
    });
    const [password, setPassword] = useState('');
    const [mostrarPass, setMostrarPass] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [requiereVerificacion, setRequiereVerificacion] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [slideActual, setSlideActual] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(routeSearch || window.location.search);
        const emailParam = params.get('email');
        if (emailParam) setEmail(emailParam);
    }, [routeSearch]);

    // Rotación suave del carrusel de fotografías cada 6.5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            setSlideActual((prev) => (prev + 1) % SLIDES_BIENVENIDA.length);
        }, 6500);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMensajeExito('');
        setRequiereVerificacion(false);
        if (sessionNotice) setSessionNotice('');

        if (!email.trim() || !password) {
            setError('Por favor ingrese su correo electrónico y contraseña.');
            return;
        }

        try {
            setCargando(true);
            await login(email.trim(), password);
        } catch (err) {
            setError(err.message || 'No fue posible iniciar sesión.');
            if (err.status === 403 && (err.data?.requiereVerificacion || err.message?.toLowerCase().includes('verificad'))) {
                setRequiereVerificacion(true);
            }
        } finally {
            setCargando(false);
        }
    };

    const handleReenviar = async () => {
        if (!email.trim()) {
            setError('Escriba su correo electrónico en el campo superior para reenviar el enlace.');
            return;
        }
        try {
            setReenviando(true);
            setError('');
            const res = await reenviarCorreoVerificacion(email.trim());
            setMensajeExito(res.mensaje || 'Se ha enviado un nuevo correo de verificación.');
            setRequiereVerificacion(false);
        } catch (err) {
            setError(err.message || 'No se pudo reenviar el correo de verificación.');
        } finally {
            setReenviando(false);
        }
    };

    const slide = SLIDES_BIENVENIDA[slideActual];

    return (
        <div className="auth-split-container">
            {/* Lado Izquierdo: Slideshow Fotográfico con Resplandor Solar y Atmósfera */}
            <div className="auth-split-visual" role="region" aria-label="Galería visual de Hotel Paraíso">
                {/* Carrusel de diapositivas con cross-fade y efecto Ken Burns */}
                <div className="auth-slideshow-container" aria-hidden="true">
                    {SLIDES_BIENVENIDA.map((item, idx) => (
                        <div
                            key={idx}
                            className={`auth-slide-image ${idx === slideActual ? 'is-active' : ''}`}
                            style={{ backgroundImage: `url(${item.img})` }}
                            aria-label={item.alt}
                        />
                    ))}
                </div>

                {/* Filtro atmosférico para realce y lectura editorial */}
                <div className="auth-split-visual-overlay" />

                {/* Resplandor Solar Intenso y Cálido */}
                <div className="auth-split-sunbeam" />
                <div className="auth-split-sunbeam-secondary" />

                {/* Partículas de brisa dorada */}
                <div className="auth-ambient-motes" aria-hidden="true">
                    <span className="auth-mote" />
                    <span className="auth-mote" />
                    <span className="auth-mote" />
                    <span className="auth-mote" />
                </div>

                {/* Contenido Editorial y Wordmark */}
                <div className="auth-split-visual-content">
                    <div
                        className="auth-brand-wordmark"
                        onClick={() => navigate('/portal-huesped')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate('/portal-huesped'); }}
                    >
                        <div className="auth-brand-icon">
                            <Hotel size={24} />
                        </div>
                        <div>
                            <div className="auth-brand-name">Hotel Paraíso</div>
                            <div className="auth-brand-sub">Costa &amp; Hospitalidad</div>
                        </div>
                    </div>

                    <div className="auth-split-visual-footer">
                        <blockquote className="auth-split-quote" key={slideActual}>
                            {slide.cita}
                        </blockquote>

                        <div className="auth-split-badges">
                            <span className="auth-split-pill">
                                <MapPin size={12} /> Cancún · Acapulco · Guadalajara · CDMX
                            </span>
                            <span className="auth-split-pill">
                                <Sparkles size={12} /> Reservación Directa Sin Cargos
                            </span>
                        </div>

                        {/* Indicadores de fotos */}
                        <div className="auth-slideshow-dots" aria-label="Controles del carrusel de bienvenida">
                            {SLIDES_BIENVENIDA.map((_, dotIdx) => (
                                <button
                                    key={dotIdx}
                                    type="button"
                                    className={`auth-slideshow-dot ${dotIdx === slideActual ? 'is-active' : ''}`}
                                    onClick={() => setSlideActual(dotIdx)}
                                    title={`Ver imagen ${dotIdx + 1} de ${SLIDES_BIENVENIDA.length}`}
                                    aria-label={`Ver imagen ${dotIdx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lado Derecho: Formulario Ergonómico Completo sin Scroll */}
            <div className="auth-split-form-panel">
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-1" aria-hidden="true" />
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-2" aria-hidden="true" />

                <div className="auth-form-card">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">Bienvenido de vuelta</h1>
                        <p className="auth-form-subtitle">
                            Ingresa tus credenciales para gestionar tus estancias y beneficios.
                        </p>
                    </div>

                    {sessionNotice && (
                        <div className="auth-alert-warning" role="status">
                            <AlertCircle size={15} style={{ flexShrink: 0 }} />
                            <span>{sessionNotice}</span>
                        </div>
                    )}

                    {error && (
                        <div className="auth-alert-error" role="alert">
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            <div style={{ flex: 1 }}>
                                <div>{error}</div>
                                {requiereVerificacion && (
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-error-border)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/verificar-correo?email=${encodeURIComponent(email.trim())}`)}
                                            style={{
                                                background: 'var(--brand-terracotta, #b85d38)',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                fontSize: '0.77rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}
                                        >
                                            <ShieldCheck size={12} />
                                            Ingresar código de 4 dígitos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleReenviar}
                                            disabled={reenviando}
                                            style={{
                                                background: 'var(--bg-surface)',
                                                color: 'var(--color-error)',
                                                border: '1px solid var(--color-error-border)',
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                fontSize: '0.77rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5
                                            }}
                                        >
                                            <Send size={12} />
                                            {reenviando ? 'Enviando...' : 'Reenviar código'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {mensajeExito && (
                        <div className="auth-alert-success" role="status">
                            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                            <span>{mensajeExito}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="auth-input-group">
                            <label className="auth-label" htmlFor="login-email">
                                Correo electrónico
                            </label>
                            <div className="auth-input-wrapper">
                                <Mail size={15} className="auth-input-icon" />
                                <input
                                    id="login-email"
                                    type="email"
                                    className="auth-input"
                                    placeholder="viajero@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="auth-input-group" style={{ marginBottom: '1.1rem' }}>
                            <label className="auth-label" htmlFor="login-password">
                                Contraseña
                            </label>
                            <div className="auth-input-wrapper">
                                <Lock size={15} className="auth-input-icon" />
                                <input
                                    id="login-password"
                                    type={mostrarPass ? 'text' : 'password'}
                                    className="auth-input auth-input-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPass(!mostrarPass)}
                                    className="auth-password-toggle"
                                    title={mostrarPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                                    aria-label={mostrarPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                                >
                                    {mostrarPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit-btn"
                            disabled={cargando}
                        >
                            <LogIn size={16} />
                            {cargando ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="auth-switch-footer">
                        <div>
                            ¿Aún no tienes una cuenta de viajero?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/registro')}
                                className="auth-switch-link"
                            >
                                <UserPlus size={13} /> Crear cuenta gratis
                            </button>
                        </div>
                        <div style={{ marginTop: 6 }}>
                            <button
                                type="button"
                                onClick={() => navigate('/portal-huesped')}
                                className="auth-switch-link"
                                style={{ color: 'var(--brand-ocean)', fontWeight: 600, fontSize: '0.78rem' }}
                            >
                                <Compass size={13} /> Explorar catálogo sin iniciar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
