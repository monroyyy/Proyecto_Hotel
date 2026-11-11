import React, { useState, useEffect } from 'react';
import {
    Hotel, Mail, Lock, KeyRound, AlertCircle, CheckCircle2,
    Send, ArrowLeft, Eye, EyeOff, ShieldCheck, MapPin, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { solicitarRecuperacionPassword, restablecerPassword } from '../api/hotelApi';
import IMAGENES_HOTEL from '../data/imagenes';
import './AuthSplit.css';

export default function RecoverPasswordPage() {
    const { navigate, routeSearch } = useAuth();
    const [paso, setPaso] = useState(1); // 1 = solicitar codigo, 2 = restablecer
    const [email, setEmail] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('email') || '';
    });
    const [codigo, setCodigo] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mostrarPass, setMostrarPass] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(routeSearch || window.location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [routeSearch]);

    const handleSolicitarCodigo = async (e) => {
        e.preventDefault();
        setError('');
        setMensajeExito('');

        if (!email.trim()) {
            setError('Por favor ingresa tu correo electrónico.');
            return;
        }

        try {
            setCargando(true);
            const res = await solicitarRecuperacionPassword(email.trim());
            setMensajeExito(
                res?.mensaje || 'Si el correo electrónico está registrado, recibirá un código de 6 dígitos válido por 15 minutos.'
            );
            setPaso(2);
        } catch (err) {
            setError(err.message || 'No se pudo procesar la solicitud.');
        } finally {
            setCargando(false);
        }
    };

    const handleRestablecer = async (e) => {
        e.preventDefault();
        setError('');
        setMensajeExito('');

        if (!email.trim()) {
            setError('Por favor ingresa tu correo electrónico.');
            return;
        }
        if (!/^\d{6}$/.test(codigo.trim())) {
            setError('El código de recuperación debe contener exactamente 6 dígitos.');
            return;
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(nuevaPassword)) {
            setError('La contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula y número.');
            return;
        }
        if (nuevaPassword !== confirmarPassword) {
            setError('La confirmación no coincide con la nueva contraseña.');
            return;
        }

        try {
            setCargando(true);
            const res = await restablecerPassword({
                email: email.trim(),
                codigo: codigo.trim(),
                nuevaPassword,
                confirmarPassword,
            });
            setMensajeExito(
                res?.mensaje || 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.'
            );
            setCodigo('');
            setNuevaPassword('');
            setConfirmarPassword('');
        } catch (err) {
            setError(err.message || 'No se pudo restablecer la contraseña.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="auth-split-container">
            <div className="auth-split-visual" role="region" aria-label="Hotel Paraíso Recuperación">
                <div className="auth-slideshow-container" aria-hidden="true">
                    <div
                        className="auth-slide-image is-active"
                        style={{ backgroundImage: `url(${IMAGENES_HOTEL.suiteVistaMar.webp})` }}
                    />
                </div>
                <div className="auth-split-visual-overlay" />
                <div className="auth-split-sunbeam" />
                <div className="auth-split-sunbeam-secondary" />

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
                        <blockquote className="auth-split-quote">
                            "Tu seguridad es prioridad en cada etapa de tu estancia y reservas."
                        </blockquote>
                        <div className="auth-split-badges">
                            <span className="auth-split-pill">
                                <ShieldCheck size={12} /> Verificación OTP 6 dígitos
                            </span>
                            <span className="auth-split-pill">
                                <MapPin size={12} /> Hotel Paraíso México
                            </span>
                            <span className="auth-split-pill">
                                <Sparkles size={12} /> Vigencia 15 minutos
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-split-form-panel">
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-1" aria-hidden="true" />
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-2" aria-hidden="true" />

                <div className="auth-form-card">
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">Recuperar contraseña</h1>
                        <p className="auth-form-subtitle">
                            {paso === 1
                                ? 'Ingresa tu correo y te enviaremos un código temporal de 6 dígitos.'
                                : 'Ingresa el código recibido en tu correo y define tu nueva contraseña.'}
                        </p>
                    </div>

                    {error && (
                        <div className="auth-alert-error" role="alert">
                            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                            <div>{error}</div>
                        </div>
                    )}

                    {mensajeExito && (
                        <div className="auth-alert-success" role="status">
                            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                            <span>{mensajeExito}</span>
                        </div>
                    )}

                    {paso === 1 ? (
                        <form onSubmit={handleSolicitarCodigo} noValidate>
                            <div className="auth-input-group" style={{ marginBottom: '1.1rem' }}>
                                <label className="auth-label" htmlFor="recover-email">
                                    Correo electrónico
                                </label>
                                <div className="auth-input-wrapper">
                                    <Mail size={15} className="auth-input-icon" />
                                    <input
                                        id="recover-email"
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

                            <button type="submit" className="auth-submit-btn" disabled={cargando}>
                                <Send size={16} />
                                {cargando ? 'Enviando...' : 'Enviar código de recuperación'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button
                                    type="button"
                                    className="auth-switch-link"
                                    onClick={() => { setError(''); setPaso(2); }}
                                >
                                    Ya tengo un código de 6 dígitos
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRestablecer} noValidate>
                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="reset-email">
                                    Correo electrónico
                                </label>
                                <div className="auth-input-wrapper">
                                    <Mail size={15} className="auth-input-icon" />
                                    <input
                                        id="reset-email"
                                        type="email"
                                        className="auth-input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="reset-codigo">
                                    Código de 6 dígitos
                                </label>
                                <div className="auth-input-wrapper">
                                    <KeyRound size={15} className="auth-input-icon" />
                                    <input
                                        id="reset-codigo"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        className="auth-input"
                                        placeholder="000000"
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="auth-input-group">
                                <label className="auth-label" htmlFor="reset-password">
                                    Nueva contraseña
                                </label>
                                <div className="auth-input-wrapper">
                                    <Lock size={15} className="auth-input-icon" />
                                    <input
                                        id="reset-password"
                                        type={mostrarPass ? 'text' : 'password'}
                                        className="auth-input auth-input-password"
                                        placeholder="Mín. 8 chars (A-z y 0-9)"
                                        value={nuevaPassword}
                                        onChange={(e) => setNuevaPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarPass(!mostrarPass)}
                                        className="auth-password-toggle"
                                        aria-label={mostrarPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                                    >
                                        {mostrarPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <div className="auth-input-group" style={{ marginBottom: '1.1rem' }}>
                                <label className="auth-label" htmlFor="reset-confirm">
                                    Confirmar contraseña
                                </label>
                                <div className="auth-input-wrapper">
                                    <Lock size={15} className="auth-input-icon" />
                                    <input
                                        id="reset-confirm"
                                        type={mostrarPass ? 'text' : 'password'}
                                        className="auth-input"
                                        placeholder="Repite la nueva contraseña"
                                        value={confirmarPassword}
                                        onChange={(e) => setConfirmarPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="auth-submit-btn" disabled={cargando}>
                                <ShieldCheck size={16} />
                                {cargando ? 'Validando...' : 'Restablecer contraseña'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button
                                    type="button"
                                    className="auth-switch-link"
                                    onClick={() => { setError(''); setMensajeExito(''); setPaso(1); }}
                                >
                                    Solicitar un nuevo código
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="auth-switch-footer">
                        <button
                            type="button"
                            onClick={() => navigate(`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`)}
                            className="auth-switch-link"
                        >
                            <ArrowLeft size={13} /> Volver a Iniciar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
