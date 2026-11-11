import React, { useState, useEffect, useRef } from 'react';
import { Hotel, User, Mail, Lock, UserPlus, AlertCircle, CheckCircle2, Send, Eye, EyeOff, MapPin, Award, LogIn, ShieldCheck, Compass } from 'lucide-react';
import { registrarUsuario, reenviarCorreoVerificacion, verificarCodigoCorreo } from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import IMAGENES_HOTEL from '../data/imagenes';
import './AuthSplit.css';

const SLIDES_REGISTRO = [
    {
        img: IMAGENES_HOTEL.suiteVistaMar.webp,
        alt: IMAGENES_HOTEL.suiteVistaMar.alt,
        cita: '"Comienza tu viaje con beneficios exclusivos, apartado gratuito por 24 horas y tarifas directas sin intermediarios."'
    },
    {
        img: IMAGENES_HOTEL.habitacionFamiliar.webp,
        alt: IMAGENES_HOTEL.habitacionFamiliar.alt,
        cita: '"Espacios amplios y luminosos pensados para el confort y la convivencia de toda la familia."'
    },
    {
        img: IMAGENES_HOTEL.alberca.webp,
        alt: IMAGENES_HOTEL.alberca.alt,
        cita: '"Albercas panorámicas y rincones serenos frente a la brisa del Pacífico Mexicano."'
    }
];

export default function RegisterPage() {
    const { navigate } = useAuth();
    const [form, setForm] = useState({
        nombre: '',
        email: '',
        password: '',
        confirmarPassword: ''
    });
    const [mostrarPass, setMostrarPass] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const [registroExitoso, setRegistroExitoso] = useState(null);
    const [reenviando, setReenviando] = useState(false);
    const [msgReenvio, setMsgReenvio] = useState('');
    const [slideActual, setSlideActual] = useState(0);

    // Estado para la verificación de 4 dígitos
    const [digitos, setDigitos] = useState(['', '', '', '']);
    const [verificandoCodigo, setVerificandoCodigo] = useState(false);
    const [errorCodigo, setErrorCodigo] = useState('');
    const [codigoVerificado, setCodigoVerificado] = useState(false);
    const [animandoDigitos, setAnimandoDigitos] = useState(false);
    const inputsRef = useRef([]);

    // Rotación de imágenes cada 7 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            setSlideActual((prev) => (prev + 1) % SLIDES_REGISTRO.length);
        }, 7000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (registroExitoso && !codigoVerificado) {
            setTimeout(() => {
                inputsRef.current[0]?.focus();
            }, 150);
        }
    }, [registroExitoso, codigoVerificado]);

    const validarFormulario = () => {
        if (!form.nombre || form.nombre.trim().length < 3) {
            return 'El nombre completo es obligatorio y debe tener al menos 3 caracteres.';
        }
        const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!form.email || !emailRegex.test(form.email.trim())) {
            return 'Ingrese un correo electrónico con formato válido.';
        }
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!form.password || !passRegex.test(form.password)) {
            return 'La contraseña debe tener mínimo 8 caracteres e incluir al menos una mayúscula, una minúscula y un número.';
        }
        if (form.password !== form.confirmarPassword) {
            return 'Las contraseñas no coinciden.';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validError = validarFormulario();
        if (validError) {
            setError(validError);
            return;
        }

        try {
            setCargando(true);
            const res = await registrarUsuario({
                nombre: form.nombre.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password
            });
            setRegistroExitoso(res);
            setDigitos(['', '', '', '']);
            setErrorCodigo('');
        } catch (err) {
            setError(err.message || 'No fue posible registrar la cuenta.');
        } finally {
            setCargando(false);
        }
    };

    const ejecutarVerificacion = async (codigoCompleto) => {
        if (!codigoCompleto || codigoCompleto.length !== 4 || verificandoCodigo || codigoVerificado) return;
        try {
            setVerificandoCodigo(true);
            setErrorCodigo('');
            await verificarCodigoCorreo(codigoCompleto, registroExitoso?.email || form.email);
            setAnimandoDigitos(true);
            setTimeout(() => {
                setCodigoVerificado(true);
            }, 620);
        } catch (err) {
            setErrorCodigo(err.message || 'El código de 4 dígitos es incorrecto.');
        } finally {
            setVerificandoCodigo(false);
        }
    };

    const handleDigitChange = (idx, val) => {
        const clean = val.replace(/\D/g, '').slice(-1);
        const nuevos = [...digitos];
        nuevos[idx] = clean;
        setDigitos(nuevos);
        setErrorCodigo('');

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
        setErrorCodigo('');
        if (pasted.length === 4) {
            ejecutarVerificacion(pasted);
        } else {
            inputsRef.current[Math.min(pasted.length, 3)]?.focus();
        }
    };

    const handleReenviar = async () => {
        if (!registroExitoso?.email) return;
        try {
            setReenviando(true);
            setMsgReenvio('');
            setErrorCodigo('');
            const res = await reenviarCorreoVerificacion(registroExitoso.email);
            setRegistroExitoso(prev => ({
                ...prev,
                codigoDesarrollo: res.codigoDesarrollo || prev?.codigoDesarrollo
            }));
            setDigitos(['', '', '', '']);
            setMsgReenvio(res.mensaje || 'Nuevo código de 4 dígitos enviado a tu correo.');
            setTimeout(() => inputsRef.current[0]?.focus(), 100);
        } catch (err) {
            setErrorCodigo(err.message || 'No se pudo reenviar el correo.');
        } finally {
            setReenviando(false);
        }
    };

    const slide = SLIDES_REGISTRO[slideActual];

    return (
        <div className="auth-split-container">
            {/* Lado Izquierdo: Slideshow con Resplandor Solar Cálido */}
            <div className="auth-split-visual" role="region" aria-label="Galería visual de suites y descanso">
                <div className="auth-slideshow-container" aria-hidden="true">
                    {SLIDES_REGISTRO.map((item, idx) => (
                        <div
                            key={idx}
                            className={`auth-slide-image ${idx === slideActual ? 'is-active' : ''}`}
                            style={{ backgroundImage: `url(${item.img})` }}
                            aria-label={item.alt}
                        />
                    ))}
                </div>

                <div className="auth-split-visual-overlay" />
                <div className="auth-split-sunbeam" />
                <div className="auth-split-sunbeam-secondary" />

                <div className="auth-ambient-motes" aria-hidden="true">
                    <span className="auth-mote" />
                    <span className="auth-mote" />
                    <span className="auth-mote" />
                    <span className="auth-mote" />
                </div>

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
                                <Award size={12} /> Socio Paraíso Rewards
                            </span>
                            <span className="auth-split-pill">
                                <MapPin size={12} /> Destinos del Pacífico Mexicano
                            </span>
                        </div>

                        <div className="auth-slideshow-dots" aria-label="Controles del carrusel de registro">
                            {SLIDES_REGISTRO.map((_, dotIdx) => (
                                <button
                                    key={dotIdx}
                                    type="button"
                                    className={`auth-slideshow-dot ${dotIdx === slideActual ? 'is-active' : ''}`}
                                    onClick={() => setSlideActual(dotIdx)}
                                    title={`Ver imagen ${dotIdx + 1} de ${SLIDES_REGISTRO.length}`}
                                    aria-label={`Ver imagen ${dotIdx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lado Derecho: Formulario Compacto Ergonómico */}
            <div className="auth-split-form-panel">
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-1" aria-hidden="true" />
                <div className="auth-bg-ambient-orb auth-bg-ambient-orb-2" aria-hidden="true" />

                <div className="auth-form-card">
                    {registroExitoso ? (
                        codigoVerificado ? (
                            <div className="otp-success-celebration">
                                <div className="otp-success-badge-wrap">
                                    <span className="otp-success-ring" />
                                    <span className="otp-success-ring ring-2" />
                                    <div className="otp-success-circle">
                                        <CheckCircle2 size={36} />
                                    </div>
                                </div>

                                <h2 className="auth-form-title" style={{ fontSize: '1.55rem', color: '#065f46', marginBottom: '0.45rem' }}>
                                    ¡Verificación exitosa!
                                </h2>

                                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.35rem' }}>
                                    Tu correo <strong style={{ color: 'var(--brand-ocean)' }}>{registroExitoso.email}</strong> ha sido confirmado correctamente. Ya puedes iniciar sesión y reservar tus estancias.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => navigate(`/login?email=${encodeURIComponent(registroExitoso.email)}`)}
                                    className="auth-submit-btn"
                                >
                                    <LogIn size={16} /> Iniciar Sesión Ahora
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
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

                                <h2 className="auth-form-title" style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>
                                    Verifica tu correo
                                </h2>

                                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.48, marginBottom: '1.25rem' }}>
                                    Enviamos un código de <strong>4 dígitos</strong> a{' '}
                                    <strong style={{ color: 'var(--brand-ocean, #16324f)' }}>{registroExitoso.email}</strong>.
                                    Ingrésalo para activar tu cuenta:
                                </p>

                                {errorCodigo && (
                                    <div className="auth-alert-error" role="alert" style={{ textAlign: 'left' }}>
                                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <span>{errorCodigo}</span>
                                    </div>
                                )}

                                {msgReenvio && (
                                    <div className="auth-alert-success" role="status" style={{ textAlign: 'left' }}>
                                        <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                                        <span>{msgReenvio}</span>
                                    </div>
                                )}

                                <div
                                    className={`otp-digits-row ${errorCodigo ? 'is-error' : ''}`}
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
                                        {verificandoCodigo ? 'Verificando código...' : animandoDigitos ? '¡Código correcto!' : 'Confirmar código de 4 dígitos'}
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
                                        {reenviando ? 'Enviando nuevo código...' : 'Reenviar código de 4 dígitos'}
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="auth-form-header">
                                <h1 className="auth-form-title">Crea tu cuenta</h1>
                                <p className="auth-form-subtitle">
                                    Únete a nuestro club de huéspedes para apartar suites y acceder a tarifas exclusivas.
                                </p>
                            </div>

                            {error && (
                                <div className="auth-alert-error" role="alert">
                                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} noValidate>
                                <div className="auth-input-group">
                                    <label className="auth-label" htmlFor="register-nombre">
                                        Nombre completo
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <User size={15} className="auth-input-icon" />
                                        <input
                                            id="register-nombre"
                                            type="text"
                                            className="auth-input"
                                            placeholder="Ej. Sofía Hernández Morales"
                                            value={form.nombre}
                                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                            required
                                            autoComplete="name"
                                        />
                                    </div>
                                </div>

                                <div className="auth-input-group">
                                    <label className="auth-label" htmlFor="register-email">
                                        Correo electrónico
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <Mail size={15} className="auth-input-icon" />
                                        <input
                                            id="register-email"
                                            type="email"
                                            className="auth-input"
                                            placeholder="sofia@ejemplo.com"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div className="auth-input-group">
                                    <label className="auth-label" htmlFor="register-password">
                                        Contraseña
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <Lock size={15} className="auth-input-icon" />
                                        <input
                                            id="register-password"
                                            type={mostrarPass ? 'text' : 'password'}
                                            className="auth-input auth-input-password"
                                            placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9)"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            required
                                            autoComplete="new-password"
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

                                <div className="auth-input-group" style={{ marginBottom: '0.85rem' }}>
                                    <label className="auth-label" htmlFor="register-confirmar">
                                        Confirmar contraseña
                                    </label>
                                    <div className="auth-input-wrapper">
                                        <Lock size={15} className="auth-input-icon" />
                                        <input
                                            id="register-confirmar"
                                            type={mostrarPass ? 'text' : 'password'}
                                            className="auth-input"
                                            placeholder="Repite tu contraseña"
                                            value={form.confirmarPassword}
                                            onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="auth-submit-btn"
                                    disabled={cargando}
                                >
                                    <UserPlus size={16} />
                                    {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
                                </button>
                            </form>

                            <div className="auth-switch-footer">
                                <div>
                                    ¿Ya tienes una cuenta registrada?{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="auth-switch-link"
                                    >
                                        <LogIn size={13} /> Iniciar sesión
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
