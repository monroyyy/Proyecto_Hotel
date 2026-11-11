import React, { useEffect, useState, useRef } from 'react';
import { Hotel, CheckCircle2, AlertCircle, Loader2, LogIn, Send, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { verificarCorreoToken, verificarCodigoCorreo, reenviarCorreoVerificacion } from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import IMAGENES_HOTEL from '../data/imagenes';
import './AuthSplit.css';

export default function VerifyEmailPage() {
    const { routeSearch, navigate } = useAuth();
    const [estado, setEstado] = useState('formulario'); // 'cargando' | 'formulario' | 'exito'
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [digitos, setDigitos] = useState(['', '', '', '']);
    const [verificandoCodigo, setVerificandoCodigo] = useState(false);
    const [animandoDigitos, setAnimandoDigitos] = useState(false);
    const [codigoDesarrollo, setCodigoDesarrollo] = useState('');
    const [msgReenvio, setMsgReenvio] = useState('');
    const [reenviando, setReenviando] = useState(false);
    const ejecutadoRef = useRef(false);
    const inputsRef = useRef([]);

    useEffect(() => {
        if (ejecutadoRef.current) return;
        ejecutadoRef.current = true;

        const params = new URLSearchParams(routeSearch || window.location.search);
        const tokenParam = params.get('token');
        const emailParam = params.get('email') || '';
        const codigoParam = params.get('codigo') || '';

        if (emailParam) setEmail(emailParam);

        if (tokenParam) {
            setEstado('cargando');
            setMensaje('Verificando tu código de confirmación...');
            verificarCorreoToken(tokenParam, emailParam)
                .then((res) => {
                    if (res.email) setEmail(res.email);
                    setEstado('exito');
                    setMensaje(res.mensaje || '¡Verificación exitosa! Tu cuenta ha sido activada.');
                })
                .catch((err) => {
                    setEstado('formulario');
                    setError(err.message || 'El enlace ha expirado o ya fue utilizado. Ingresa tu código de 4 dígitos o solicita uno nuevo.');
                });
        } else if (codigoParam && codigoParam.length === 4) {
            setDigitos(codigoParam.split(''));
            ejecutarVerificacion(codigoParam, emailParam);
        } else {
            setEstado('formulario');
            setTimeout(() => inputsRef.current[0]?.focus(), 150);
        }
    }, [routeSearch]);

    const ejecutarVerificacion = async (codigoCompleto, emailOverride = null) => {
        const targetEmail = (emailOverride !== null ? emailOverride : email).trim();
        if (!codigoCompleto || codigoCompleto.length !== 4 || verificandoCodigo) return;
        try {
            setVerificandoCodigo(true);
            setError('');
            const res = await verificarCodigoCorreo(codigoCompleto, targetEmail);
            if (res.email) setEmail(res.email);
            setMensaje(res.mensaje || '¡Verificación exitosa! Tu cuenta ha sido activada.');
            setAnimandoDigitos(true);
            setTimeout(() => {
                setEstado('exito');
            }, 620);
        } catch (err) {
            setError(err.message || 'El código de 4 dígitos es incorrecto o ha expirado.');
        } finally {
            setVerificandoCodigo(false);
        }
    };

    const handleDigitChange = (idx, val) => {
        const clean = val.replace(/\D/g, '').slice(-1);
        const nuevos = [...digitos];
        nuevos[idx] = clean;
        setDigitos(nuevos);
        setError('');

        if (clean && idx < 3) {
            inputsRef.current[idx + 1]?.focus();
        }

        const unido = nuevos.join('');
        if (unido.length === 4 && nuevos.every(d => d !== '')) {
            ejecutarVerificacion(unido);
        }
    };

    const handleDigitKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !digitos[idx] && idx > 0) {
            inputsRef.current[idx - 1]?.focus();
        }
    };

    const handlePasteDigits = (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
        if (!pasted) return;
        const nuevos = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
            nuevos[i] = pasted[i] || '';
        }
        setDigitos(nuevos);
        setError('');
        if (pasted.length === 4) {
            ejecutarVerificacion(pasted);
        } else {
            inputsRef.current[Math.min(pasted.length, 3)]?.focus();
        }
    };

    const handleReenviar = async () => {
        if (!email.trim()) {
            setError('Ingresa tu correo electrónico para enviarte un nuevo código de 4 dígitos.');
            return;
        }
        try {
            setReenviando(true);
            setMsgReenvio('');
            setError('');
            const res = await reenviarCorreoVerificacion(email.trim());
            if (res.codigoDesarrollo) {
                setCodigoDesarrollo(res.codigoDesarrollo);
            }
            setDigitos(['', '', '', '']);
            setMsgReenvio(res.mensaje || 'Nuevo código de 4 dígitos enviado a tu correo.');
            setTimeout(() => inputsRef.current[0]?.focus(), 100);
        } catch (err) {
            setError(err.message || 'No se pudo reenviar el código.');
        } finally {
            setReenviando(false);
        }
    };

    return (
        <div className="auth-split-container">
            {/* Lado Izquierdo: Fotografía de Marca y Wordmark */}
            <div
                className="auth-split-visual"
                style={{ backgroundImage: `url(${IMAGENES_HOTEL.recepcion.webp})` }}
                role="img"
                aria-label={IMAGENES_HOTEL.recepcion.alt}
            >
                <div className="auth-split-visual-overlay" />
                <div className="auth-split-sunbeam" />
                <div className="auth-split-visual-content">
                    <div
                        className="auth-brand-wordmark"
                        onClick={() => navigate('/portal-huesped')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate('/portal-huesped'); }}
                    >
                        <div className="auth-brand-icon">
                            <Hotel size={22} />
                        </div>
                        <div>
                            <div className="auth-brand-name">Hotel Paraíso</div>
                            <div className="auth-brand-sub">Costa &amp; Hospitalidad</div>
                        </div>
                    </div>

                    <div className="auth-split-visual-footer">
                        <blockquote className="auth-split-quote">
                            "Tu refugio frente al mar está listo. Confirma tu código de 4 dígitos para activar tus estancias y tarifas preferenciales."
                        </blockquote>
                        <div className="auth-split-badges">
                            <span className="auth-split-pill">
                                <ShieldCheck size={12} /> Verificación de 4 Dígitos
                            </span>
                            <span className="auth-split-pill">
                                <MapPin size={12} /> Pacífico Mexicano
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lado Derecho: Estado de Verificación */}
            <div className="auth-split-form-panel">
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-1" aria-hidden="true" />
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-2" aria-hidden="true" />

                <div className="auth-form-card" style={{ textAlign: 'center' }}>
                    {estado === 'cargando' && (
                        <div style={{ padding: '2rem 1rem' }}>
                            <Loader2
                                size={44}
                                style={{
                                    color: 'var(--brand-terracotta, #b85d38)',
                                    marginBottom: 16,
                                    animation: 'spin 1s linear infinite'
                                }}
                            />
                            <h2 className="auth-form-title" style={{ fontSize: '1.4rem' }}>
                                Verificando tu cuenta...
                            </h2>
                            <p className="auth-form-subtitle">
                                {mensaje}
                            </p>
                        </div>
                    )}

                    {estado === 'exito' && (
                        <div className="otp-success-celebration">
                            <div className="otp-success-badge-wrap">
                                <span className="otp-success-ring" />
                                <span className="otp-success-ring ring-2" />
                                <div className="otp-success-circle">
                                    <CheckCircle2 size={36} />
                                </div>
                            </div>

                            <h1 className="auth-form-title" style={{ fontSize: '1.6rem', color: '#065f46', marginBottom: '0.5rem' }}>
                                ¡Verificación exitosa!
                            </h1>

                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                                {mensaje || 'Tu correo ha sido validado correctamente.'} Ya puedes iniciar sesión y disfrutar de todos los servicios del portal.
                            </p>

                            <button
                                type="button"
                                className="auth-submit-btn"
                                onClick={() => navigate(email ? `/login?email=${encodeURIComponent(email)}` : '/login')}
                            >
                                <LogIn size={17} /> Iniciar Sesión en Hotel Paraíso
                            </button>
                        </div>
                    )}

                    {estado === 'formulario' && (
                        <div>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: 'var(--brand-terracotta-light, #faebe5)',
                                color: 'var(--brand-terracotta, #b85d38)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '0.75rem'
                            }}>
                                <ShieldCheck size={26} />
                            </div>

                            <h1 className="auth-form-title" style={{ fontSize: '1.45rem', marginBottom: '0.35rem' }}>
                                Verificación de correo
                            </h1>

                            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                                Ingresa tu correo y el <strong>código de 4 dígitos</strong> que enviamos a tu bandeja de entrada.
                            </p>

                            {error && (
                                <div className="auth-alert-error" role="alert" style={{ textAlign: 'left' }}>
                                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {msgReenvio && (
                                <div className="auth-alert-success" role="status" style={{ textAlign: 'left' }}>
                                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                                    <span>{msgReenvio}</span>
                                </div>
                            )}

                            <div className="auth-input-group" style={{ textAlign: 'left' }}>
                                <label className="auth-label" htmlFor="verify-email-input">
                                    Correo registrado
                                </label>
                                <div className="auth-input-wrapper">
                                    <Mail size={15} className="auth-input-icon" />
                                    <input
                                        id="verify-email-input"
                                        type="email"
                                        className="auth-input"
                                        placeholder="viajero@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div
                                className={`otp-digits-row ${error ? 'is-error' : ''}`}
                                onPaste={handlePasteDigits}
                            >
                                {digitos.map((d, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => { inputsRef.current[idx] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={d}
                                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                        disabled={verificandoCodigo || animandoDigitos}
                                        className={`otp-digit-input ${d ? 'is-filled' : ''} ${animandoDigitos ? 'is-verified' : ''}`}
                                        aria-label={`Dígito ${idx + 1} de verificación`}
                                    />
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => ejecutarVerificacion(digitos.join(''))}
                                    disabled={digitos.join('').length !== 4 || verificandoCodigo || animandoDigitos}
                                    className="auth-submit-btn"
                                >
                                    <CheckCircle2 size={16} />
                                    {verificandoCodigo ? 'Verificando código...' : animandoDigitos ? '¡Código correcto!' : 'Verificar código de 4 dígitos'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleReenviar}
                                    disabled={reenviando || animandoDigitos}
                                    style={{
                                        background: 'none',
                                        border: '1px solid var(--border-default, #e2d9cc)',
                                        color: 'var(--brand-ocean, #16324f)',
                                        padding: '8px 14px',
                                        borderRadius: 'var(--radius-md, 8px)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Send size={13} />
                                    {reenviando ? 'Enviando...' : 'Enviar nuevo código de 4 dígitos'}
                                </button>
                            </div>

                            <div className="auth-switch-footer">
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="auth-switch-link"
                                >
                                    <LogIn size={14} /> Volver a Iniciar Sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
