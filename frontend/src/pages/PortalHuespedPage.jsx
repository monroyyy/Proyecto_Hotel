import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BedDouble, Calendar, Users, CheckCircle2, XCircle, MapPin,
    Search, CalendarCheck, Edit3, RefreshCw, Star, Wifi, Tv,
    Wind, Coffee, ShieldCheck, Waves, Utensils, Clock, Sparkles,
    ArrowRight, Info, SlidersHorizontal, User, Award, Phone,
    Mail, Check, HelpCircle, FileText, Sun, LogOut, Hotel,
    Lock, KeyRound, Eye, EyeOff, Moon, AlertCircle, CalendarPlus, Bell,
    UserPlus, LogIn, Printer
} from 'lucide-react';
import {
    getHoteles,
    getHabitaciones,
    getMisReservas,
    crearReserva,
    cancelarReserva,
    actualizarReserva,
    agregarDiaExtraHabitacion,
    getReembolsoReserva,
    cambiarPasswordUsuario
} from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import EstadoBadge from '../components/EstadoBadge';
import MexicoMicroMap from '../components/MexicoMicroMap';
import IMAGENES_HOTEL from '../data/imagenes';
import { imprimirComprobanteReserva } from '../utils/reservaComprobante';
import './PortalHuespedPage.css';

// Formateador elegante de fechas para tarjetas de itinerario / check-in
function formatFechaItinerario(fechaStr) {
    if (!fechaStr) return { dia: '--', mes: '', anio: '', diaSemana: '', diaSemanaCompleto: '', corto: '' };
    try {
        const [y, m, d] = fechaStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const diasCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const dia = String(d).padStart(2, '0');
        return {
            dia,
            mes: meses[dt.getMonth()] || '',
            mesCompleto: mesesCompletos[dt.getMonth()] || '',
            anio: String(y),
            diaSemana: dias[dt.getDay()] || '',
            diaSemanaCompleto: diasCompletos[dt.getDay()] || '',
            corto: `${dias[dt.getDay()]}, ${dia} ${meses[dt.getMonth()]} ${y}`
        };
    } catch {
        return { dia: fechaStr, mes: '', anio: '', diaSemana: '', diaSemanaCompleto: '', corto: fechaStr };
    }
}

const FALLBACK_ROOM_IMG = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80';

// Resuelve metadata editorial desde la BD del hotel con fallback al preset visual local
function obtenerPresetHotel(hotel) {
    const texto = `${hotel?.nombre || ''} ${hotel?.ciudad || ''}`.toLowerCase();
    if (texto.includes('canc')) {
        return {
            numero: '01',
            slug: 'cancun',
            imagen: IMAGENES_HOTEL.heroCosta.webp,
            alt: IMAGENES_HOTEL.heroCosta.alt,
            tag: 'Resort Insignia',
            vibe: 'Alberca infinity & Terraza con horizonte caribeño',
            amenidades: ['Playa Privada', 'Spa Cenote', 'Cena Frente al Mar'],
            clima: { temp: '28°C', condicion: 'Soleado' },
            precioDesde: 2200
        };
    }
    if (texto.includes('ejecutivo') || texto.includes('ciudad de m') || texto.includes('reforma') || texto.includes('valle')) {
        return {
            numero: '02',
            slug: 'cdmx',
            imagen: IMAGENES_HOTEL.restaurante.webp,
            alt: IMAGENES_HOTEL.restaurante.alt,
            tag: 'Distrito Financiero',
            vibe: 'Terraza gastronómica de autor & Concierge ejecutivo',
            amenidades: ['Alta Cocina', 'Business Lounge', 'Vistas a Reforma'],
            clima: { temp: '22°C', condicion: 'Templado' },
            precioDesde: 1950
        };
    }
    if (texto.includes('acapulco') || texto.includes('costa') || texto.includes('mar')) {
        return {
            numero: '03',
            slug: 'acapulco',
            imagen: IMAGENES_HOTEL.alberca.webp,
            alt: IMAGENES_HOTEL.alberca.alt,
            tag: 'Bahía Histórica',
            vibe: 'Vistas panorámicas & Atardeceres dorados en acantilado',
            amenidades: ['Club de Playa', 'Piscina Panorámica', 'Coctelería de Autor'],
            clima: { temp: '30°C', condicion: 'Cálido' },
            precioDesde: 1800
        };
    }
    if (texto.includes('guadalajara') || texto.includes('arcos')) {
        return {
            numero: '04',
            slug: 'guadalajara',
            imagen: IMAGENES_HOTEL.recepcion.webp,
            alt: IMAGENES_HOTEL.recepcion.alt,
            tag: 'Cultura & Tradición',
            vibe: 'Galería de arcos coloniales & Maderas nobles',
            amenidades: ['Patio Colonial', 'Cata de Tequila', 'Arte Mexicano'],
            clima: { temp: '26°C', condicion: 'Despejado' },
            precioDesde: 1300
        };
    }
    if (texto.includes('atlacomulco') || texto.includes('uaem')) {
        return {
            numero: '05',
            slug: 'atlacomulco',
            imagen: IMAGENES_HOTEL.habitacionEjecutiva.webp,
            alt: IMAGENES_HOTEL.habitacionEjecutiva.alt,
            tag: 'Refugio de Valle',
            vibe: 'Arquitectura sobria & Silencio para desconectar',
            amenidades: ['Jardín Zen', 'Chimenea en Suite', 'Silencio de Valle'],
            clima: { temp: '19°C', condicion: 'Fresco' },
            precioDesde: 850
        };
    }
    return {
        numero: '01',
        slug: 'destino',
        imagen: IMAGENES_HOTEL.heroCosta.webp,
        alt: hotel?.nombre || 'Hotel Paraíso',
        tag: 'Destino Paraíso',
        vibe: 'Hospitalidad y calma mexicana',
        amenidades: ['Vistas Panorámicas', 'Concierge 24/7'],
        clima: { temp: '25°C', condicion: 'Despejado' },
        precioDesde: 1200
    };
}

function obtenerPerfilHotel(hotel) {
    const preset = obtenerPresetHotel(hotel);
    return {
        ...preset,
        imagen: hotel?.imagenUrl || preset.imagen,
        fallbackImagen: preset.imagen,
        alt: hotel?.nombre ? `${hotel.nombre} en ${hotel.ciudad || 'México'}` : preset.alt,
        tag: hotel?.tagEditorial || preset.tag,
        vibe: hotel?.descripcion || preset.vibe
    };
}

function obtenerImagenHotel(hotel) {
    return obtenerPerfilHotel(hotel).imagen;
}

function obtenerPresetHabitacion(hab) {
    const tipo = (hab?.tipoHabitacion?.nombre || '').toLowerCase();
    if (tipo.includes('suite')) return IMAGENES_HOTEL.suiteVistaMar.webp;
    if (tipo.includes('familiar')) return IMAGENES_HOTEL.habitacionFamiliar.webp;
    if (tipo.includes('matrimonial') || tipo.includes('queen') || tipo.includes('king')) return IMAGENES_HOTEL.habitacionDoble.webp;
    if (tipo.includes('doble')) return IMAGENES_HOTEL.habitacionDoble.webp;
    if (tipo.includes('ejecutiv') || tipo.includes('individual') || tipo.includes('sencill')) return IMAGENES_HOTEL.habitacionEjecutiva.webp;
    return IMAGENES_HOTEL.suiteVistaMar.webp;
}

function obtenerImagenHabitacion(hab) {
    return hab?.tipoHabitacion?.imagenUrl || obtenerPresetHabitacion(hab);
}

function aplicarFallbackImagen(e, presetUrl) {
    const img = e.currentTarget;
    if (!img.dataset.fallbackStage && presetUrl && img.getAttribute('src') !== presetUrl) {
        img.dataset.fallbackStage = 'preset';
        img.src = presetUrl;
        return;
    }
    if (img.dataset.fallbackStage !== 'final') {
        img.dataset.fallbackStage = 'final';
        img.src = FALLBACK_ROOM_IMG;
    }
}

function obtenerAltHabitacion(hab) {
    const tipo = (hab?.tipoHabitacion?.nombre || '').toLowerCase();
    if (tipo.includes('suite')) return IMAGENES_HOTEL.suiteVistaMar.alt;
    if (tipo.includes('familiar')) return IMAGENES_HOTEL.habitacionFamiliar.alt;
    if (tipo.includes('matrimonial') || tipo.includes('doble')) return IMAGENES_HOTEL.habitacionDoble.alt;
    if (tipo.includes('ejecutiv') || tipo.includes('individual')) return IMAGENES_HOTEL.habitacionEjecutiva.alt;
    return `Habitación ${hab?.tipoHabitacion?.nombre || ''} de Hotel Paraíso`;
}

function obtenerSuperficieHabitacion(hab) {
    const tipo = (hab?.tipoHabitacion?.nombre || '').toLowerCase();
    if (tipo.includes('suite')) return '58 m² · Terraza privada con vista al mar';
    if (tipo.includes('familiar')) return '52 m² · Doble estancia y balcón';
    if (tipo.includes('matrimonial')) return '38 m² · Cama King Size de lino';
    if (tipo.includes('doble')) return '40 m² · 2 Camas Queen Size';
    return '30 m² · Escritorio ejecutivo y luz natural';
}

function obtenerAmenidadesHabitacion(hab) {
    const tipo = (hab?.tipoHabitacion?.nombre || '').toLowerCase();
    const base = [
        { icon: Wifi, label: 'Wi-Fi 6' },
        { icon: Wind, label: 'Clima independiente' },
        { icon: Tv, label: 'Smart TV 55"' }
    ];
    if (tipo.includes('suite')) {
        base.push({ icon: Coffee, label: 'Cafetera espresso' });
        base.push({ icon: Waves, label: 'Acceso spa' });
    } else if (tipo.includes('familiar')) {
        base.push({ icon: Utensils, label: 'Área familiar' });
        base.push({ icon: Waves, label: 'Alberca' });
    } else {
        base.push({ icon: Coffee, label: 'Cafetera en suite' });
    }
    return base;
}

// Calcula tarifa exacta del portal replicando la regla del backend (temporada alta +25% en Jul, Ago y Dic)
function calcularTarifaPortal(precioBase, entradaStr, salidaStr, cuna = false, camaExtra = false) {
    const base = Number(precioBase || 0);
    if (!entradaStr || !salidaStr || base <= 0) {
        return { noches: 1, nochesTemporadaAlta: 0, total: base, anticipo: Number((base * 0.5).toFixed(2)) };
    }
    const dIni = new Date(entradaStr + 'T12:00:00');
    const dFin = new Date(salidaStr + 'T12:00:00');
    let noches = 0;
    let nochesTemporadaAlta = 0;
    let subtotal = 0;
    for (let d = new Date(dIni); d < dFin; d.setDate(d.getDate() + 1)) {
        noches++;
        const mes = d.getMonth() + 1;
        if (mes === 7 || mes === 8 || mes === 12) {
            nochesTemporadaAlta++;
            subtotal += base * 1.25;
        } else {
            subtotal += base;
        }
    }
    if (noches === 0) {
        noches = 1;
        subtotal = base;
    }
    let extras = 0;
    if (cuna) extras += 100 * noches;
    if (camaExtra) extras += 250 * noches;
    const total = Number((subtotal + extras).toFixed(2));
    return { noches, nochesTemporadaAlta, total, anticipo: Number((total * 0.5).toFixed(2)) };
}

// Helper para formatear una fecha Date a YYYY-MM-DD en zona horaria LOCAL (evita salto de día en UTC después de las 18:00)
function obtenerFechaLocalIso(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Helper para sumar días a una fecha YYYY-MM-DD en hora local
function sumarDiasFecha(fechaStr, dias) {
    const base = fechaStr ? new Date(fechaStr + 'T12:00:00') : new Date();
    base.setDate(base.getDate() + Number(dias));
    return obtenerFechaLocalIso(base);
}

// Formatea fecha YYYY-MM-DD en formato legible corto ("04 Nov" o "04 Nov 2026")
function formatearFechaOcupacion(fechaStr, incluirAnio = false) {
    if (!fechaStr) return '—';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    const anio = partes[0];
    const mes = meses[parseInt(partes[1], 10) - 1] || partes[1];
    const dia = partes[2];
    return incluirAnio ? `${dia} ${mes} ${anio}` : `${dia} ${mes}`;
}

// Evalúa si una habitación está libre en el rango [entradaStr, salidaStr) y calcula sus fechas de ocupación y desocupación
function evaluarDisponibilidadHabitacion(hab, entradaStr, salidaStr) {
    const estadoNorm = (hab?.estado || '').toLowerCase();
    if (estadoNorm === 'mantenimiento') {
        return {
            esVendible: false,
            disponibleEnFechas: false,
            conflicto: null,
            proximaOcupacion: null,
            fechaLiberacion: null,
            periodos: []
        };
    }

    const periodos = Array.isArray(hab?.periodosOcupados) ? hab.periodosOcupados : [];
    const conflicto = (entradaStr && salidaStr)
        ? periodos.find(p => p.fechaEntrada && p.fechaSalida && p.fechaEntrada < salidaStr && p.fechaSalida > entradaStr) || null
        : null;

    let fechaLiberacion = conflicto
        ? conflicto.fechaSalida
        : (hab?.fechaOcupacionFin || periodos[0]?.fechaSalida || null);

    if (conflicto && fechaLiberacion) {
        let cursor = fechaLiberacion;
        for (const p of periodos) {
            if (p.fechaEntrada && p.fechaSalida && p.fechaEntrada <= cursor && p.fechaSalida > cursor) {
                cursor = p.fechaSalida;
            }
        }
        fechaLiberacion = cursor;
    }

    const proximaOcupacion = conflicto || periodos[0] || (hab?.fechaOcupacionInicio && hab?.fechaOcupacionFin ? {
        fechaEntrada: hab.fechaOcupacionInicio,
        fechaSalida: hab.fechaOcupacionFin,
        estado: hab.estadoReservaActiva || hab.estado
    } : null);

    return {
        esVendible: true,
        disponibleEnFechas: !conflicto,
        conflicto,
        proximaOcupacion,
        fechaLiberacion,
        periodos
    };
}

export default function PortalHuespedPage({ initialSection = 'explorar' }) {
    const { user, isAuthenticated, navigate, logout, updateProfile, updateToken } = useAuth();
    const [activeSection, setActiveSection] = useState(initialSection);
    const [heroIndex, setHeroIndex] = useState(0);
    const [modalRequiereSesion, setModalRequiereSesion] = useState(null);
    const [hoverHotelId, setHoverHotelId] = useState(null);

    const [hoteles, setHoteles] = useState([]);
    const [habitaciones, setHabitaciones] = useState([]);
    const [misReservas, setMisReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

    // Fechas por defecto en zona horaria local (hoy y +2 noches)
    const todayStr = obtenerFechaLocalIso();
    const defaultCheckoutStr = sumarDiasFecha(todayStr, 2);

    const [filtroHotel, setFiltroHotel] = useState('TODOS');
    const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
    const [filtroCapacidad, setFiltroCapacidad] = useState(1);
    const [ordenCatalogo, setOrdenCatalogo] = useState('DESTACADOS');
    const [fechaEntrada, setFechaEntrada] = useState(todayStr);
    const [fechaSalida, setFechaSalida] = useState(defaultCheckoutStr);
    const [busquedaTexto, setBusquedaTexto] = useState('');
    const [panelBusquedaMovil, setPanelBusquedaMovil] = useState(false);

    // Filtro en Mis Reservaciones
    const [filtroEstadoReserva, setFiltroEstadoReserva] = useState('TODAS');
    const [voucherReserva, setVoucherReserva] = useState(null);
    const [reservaInstruccionesPago, setReservaInstruccionesPago] = useState(null);

    // Modal de Ficha Técnica de Habitación
    const [habitacionDetalle, setHabitacionDetalle] = useState(null);

    // Modal de Reservación (con selector interactivo de noches)
    const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
    const [fechaMinimaReserva, setFechaMinimaReserva] = useState(todayStr);
    const [nombrePerfil, setNombrePerfil] = useState(() => user?.nombre || '');
    const [telefonoHuesped, setTelefonoHuesped] = useState(() => user?.telefono || '');
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);

    useEffect(() => {
        setNombrePerfil(user?.nombre || '');
        if (user?.telefono) {
            setTelefonoHuesped(user.telefono);
        }
    }, [user?.nombre, user?.telefono]);
    const [adultosReserva, setAdultosReserva] = useState(1);
    const [ninosReserva, setNinosReserva] = useState(0);
    const [cunaExtra, setCunaExtra] = useState(false);
    const [camaExtra, setCamaExtra] = useState(false);
    const [modalidadReserva, setModalidadReserva] = useState('PRE_RESERVA');
    const [metodoPagoReserva, setMetodoPagoReserva] = useState('TRANSFERENCIA');
    const [notasReserva, setNotasReserva] = useState('');
    const [procesandoReserva, setProcesandoReserva] = useState(false);

    // Modal para reprogramar fechas y su error inline
    const [reservaReprogramar, setReservaReprogramar] = useState(null);
    const [nuevaEntrada, setNuevaEntrada] = useState('');
    const [nuevaSalida, setNuevaSalida] = useState('');
    const [errorReprogramar, setErrorReprogramar] = useState('');
    const [extendiendoReservaId, setExtendiendoReservaId] = useState(null);

    // Modal para cancelar reservación con desglose de reembolso
    const [reservaACancelar, setReservaACancelar] = useState(null);
    const [infoReembolso, setInfoReembolso] = useState(null);
    const [cargandoReembolso, setCargandoReembolso] = useState(false);
    const [errorCancelacion, setErrorCancelacion] = useState('');
    const [cancelandoReserva, setCancelandoReserva] = useState(false);
    const [formReembolso, setFormReembolso] = useState({ titular: '', banco: '', clabe: '' });

    // Preferencias del Perfil del Huésped (persistidas en localStorage para personalizar su experiencia)
    const [prefAlmohada, setPrefAlmohada] = useState(() => localStorage.getItem('hp_pref_almohada') || 'Memory Foam Suave');
    const [prefPiso, setPrefPiso] = useState(() => localStorage.getItem('hp_pref_piso') || 'Piso Alto con Vista');
    const [prefLlegada, setPrefLlegada] = useState(() => localStorage.getItem('hp_pref_llegada') || '15:00 - 17:00 hrs');
    const [prefBebida, setPrefBebida] = useState(() => localStorage.getItem('hp_pref_bebida') || 'Agua Mineral & Cítricos');
    const [prefBanco, setPrefBanco] = useState(() => localStorage.getItem('hp_pref_banco') || 'BBVA');
    const [prefClabe, setPrefClabe] = useState(() => localStorage.getItem('hp_pref_clabe') || '012180001234567890');
    const [faqAbierto, setFaqAbierto] = useState(0);

    // Estado para cambio de contraseña en Perfil
    const [pwActual, setPwActual] = useState('');
    const [pwNueva, setPwNueva] = useState('');
    const [pwConfirmar, setPwConfirmar] = useState('');
    const [showPwActual, setShowPwActual] = useState(false);
    const [showPwNueva, setShowPwNueva] = useState(false);
    const [showPwConfirmar, setShowPwConfirmar] = useState(false);
    const [pwCargando, setPwCargando] = useState(false);
    const [pwSuccess, setPwSuccess] = useState('');
    const [pwError, setPwError] = useState('');

    const recargarReservasSilencioso = useCallback(async () => {
        try {
            if (!isAuthenticated) {
                const habsData = await getHabitaciones();
                if (habsData) setHabitaciones(habsData);
                return;
            }
            const [reservasData, habsData] = await Promise.all([
                getMisReservas(),
                getHabitaciones()
            ]);
            setMisReservas(reservasData || []);
            if (habsData) setHabitaciones(habsData);
            setVoucherReserva(prev => {
                if (!prev) return null;
                const actualizada = (reservasData || []).find(r => r.idReserva === prev.idReserva);
                return actualizada || prev;
            });
        } catch {
            // Silencioso para sincronización en segundo plano
        }
    }, [isAuthenticated]);

    useEffect(() => {
        setActiveSection(initialSection);
        if (initialSection === 'mis-reservas' && isAuthenticated) {
            recargarReservasSilencioso();
        }
    }, [initialSection, isAuthenticated, recargarReservasSilencioso]);

    // Sincronización en tiempo real: al enfocar la pestaña y por polling regular
    useEffect(() => {
        const handleFocus = () => {
            recargarReservasSilencioso();
        };
        window.addEventListener('focus', handleFocus);
        window.addEventListener('hotel:reserva-actualizada', handleFocus);

        // Polling cada 6 segundos para reflejar cancelaciones o confirmaciones del administrador
        const interval = setInterval(() => {
            recargarReservasSilencioso();
        }, 6000);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('hotel:reserva-actualizada', handleFocus);
            clearInterval(interval);
        };
    }, [recargarReservasSilencioso]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const promesas = [
                getHoteles(),
                getHabitaciones(),
                isAuthenticated ? getMisReservas() : Promise.resolve([])
            ];
            const [hotelesData, habsData, reservasData] = await Promise.all(promesas);
            setHoteles(hotelesData || []);
            setHabitaciones(habsData || []);
            setMisReservas(reservasData || []);
        } catch (err) {
            setAlertMsg({ type: 'error', text: err.message || 'No se pudo cargar el catálogo de hoteles.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [isAuthenticated]);

    const showAlert = (type, text) => {
        setAlertMsg({ type, text });
        setTimeout(() => setAlertMsg({ type: '', text: '' }), 6000);
    };

    const cambiarSeccion = (sec) => {
        setActiveSection(sec);
        if (sec === 'mis-reservas') {
            recargarReservasSilencioso();
        }
        if (sec === 'explorar') navigate('/portal-huesped');
        else if (sec === 'mis-reservas') navigate('/mis-reservas');
        else if (sec === 'experiencias') navigate('/experiencias');
        else if (sec === 'mi-perfil') navigate('/mi-perfil');
    };

    const nochesSeleccionadas = useMemo(() => {
        if (!fechaEntrada || !fechaSalida) return 1;
        const d1 = new Date(fechaEntrada + 'T12:00:00');
        const d2 = new Date(fechaSalida + 'T12:00:00');
        const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    }, [fechaEntrada, fechaSalida]);

    // Conteo de disponibles por hotel según las fechas seleccionadas
    const disponiblesPorHotelId = useMemo(() => {
        const map = {};
        habitaciones.forEach(h => {
            if (!h.hotel?.idHotel) return;
            const evalHab = evaluarDisponibilidadHabitacion(h, fechaEntrada, fechaSalida);
            if (evalHab.esVendible && evalHab.disponibleEnFechas) {
                map[h.hotel.idHotel] = (map[h.hotel.idHotel] || 0) + 1;
            }
        });
        return map;
    }, [habitaciones, fechaEntrada, fechaSalida]);

    const vendiblesPorHotelId = useMemo(() => {
        const map = {};
        habitaciones.forEach(h => {
            if (!h.hotel?.idHotel) return;
            const evalHab = evaluarDisponibilidadHabitacion(h, fechaEntrada, fechaSalida);
            if (evalHab.esVendible) {
                map[h.hotel.idHotel] = (map[h.hotel.idHotel] || 0) + 1;
            }
        });
        return map;
    }, [habitaciones, fechaEntrada, fechaSalida]);

    const precioMinimoPorHotelId = useMemo(() => {
        const map = {};
        habitaciones.forEach(h => {
            const idH = h.hotel?.idHotel;
            const p = Number(h.tipoHabitacion?.precioBase || 0);
            if (!idH || p <= 0) return;
            if (!map[idH] || p < map[idH]) {
                map[idH] = p;
            }
        });
        return map;
    }, [habitaciones]);

    // Hoteles activos sin duplicados de nombre+ciudad
    const hotelesUnicos = useMemo(() => {
        const porClave = new Map();
        hoteles.filter(h => h.activo !== false).forEach(h => {
            const clave = `${(h.nombre || '').trim().toLowerCase()}|${(h.ciudad || '').trim().toLowerCase()}`;
            const dispActual = disponiblesPorHotelId[h.idHotel] || 0;
            const existente = porClave.get(clave);
            if (!existente || dispActual > (disponiblesPorHotelId[existente.idHotel] || 0)) {
                porClave.set(clave, h);
            }
        });
        return Array.from(porClave.values()).sort(
            (a, b) => (disponiblesPorHotelId[b.idHotel] || 0) - (disponiblesPorHotelId[a.idHotel] || 0)
        );
    }, [hoteles, disponiblesPorHotelId]);

    // Filtrado y ordenamiento de habitaciones (incluye habitaciones ocupadas en otras fechas o con calendario de desocupación)
    const habitacionesDisponibles = useMemo(() => {
        const filtradas = habitaciones.filter(hab => {
            const evalHab = evaluarDisponibilidadHabitacion(hab, fechaEntrada, fechaSalida);
            if (!evalHab.esVendible) return false;

            if (filtroHotel !== 'TODOS' && String(hab.hotel?.idHotel) !== String(filtroHotel)) {
                return false;
            }

            const cap = hab.tipoHabitacion?.capacidad || 1;
            if (cap < Number(filtroCapacidad)) {
                return false;
            }

            const nombreTipo = (hab.tipoHabitacion?.nombre || '').toLowerCase();
            if (filtroCategoria === 'SUITE' && !nombreTipo.includes('suite')) return false;
            if (filtroCategoria === 'FAMILIAR' && !nombreTipo.includes('familiar')) return false;
            if (filtroCategoria === 'DOBLE' && !nombreTipo.includes('doble') && !nombreTipo.includes('matrimonial')) return false;
            if (filtroCategoria === 'INDIVIDUAL' && !nombreTipo.includes('individual')) return false;
            if (filtroCategoria === 'PLANTA_BAJA' && Number(hab.piso) !== 1) return false;

            if (busquedaTexto.trim()) {
                const q = busquedaTexto.toLowerCase();
                const matchHotel = (hab.hotel?.nombre || '').toLowerCase().includes(q);
                const matchCiudad = (hab.hotel?.ciudad || '').toLowerCase().includes(q);
                const matchTipo = nombreTipo.includes(q);
                const matchNum = String(hab.numero || '').toLowerCase().includes(q);
                if (!matchHotel && !matchCiudad && !matchTipo && !matchNum) return false;
            }
            return true;
        });

        return [...filtradas].sort((a, b) => {
            const dispA = evaluarDisponibilidadHabitacion(a, fechaEntrada, fechaSalida).disponibleEnFechas ? 1 : 0;
            const dispB = evaluarDisponibilidadHabitacion(b, fechaEntrada, fechaSalida).disponibleEnFechas ? 1 : 0;
            if (dispA !== dispB) return dispB - dispA;

            const pa = Number(a.tipoHabitacion?.precioBase || 0);
            const pb = Number(b.tipoHabitacion?.precioBase || 0);
            const ca = Number(a.tipoHabitacion?.capacidad || 1);
            const cb = Number(b.tipoHabitacion?.capacidad || 1);
            if (ordenCatalogo === 'PRECIO_ASC') return pa - pb;
            if (ordenCatalogo === 'PRECIO_DESC') return pb - pa;
            if (ordenCatalogo === 'CAPACIDAD') return cb - ca;
            return 0;
        });
    }, [habitaciones, filtroHotel, filtroCategoria, filtroCapacidad, busquedaTexto, ordenCatalogo, fechaEntrada, fechaSalida]);


    const suiteDestacada = useMemo(() => {
        return habitacionesDisponibles.find(hab =>
            evaluarDisponibilidadHabitacion(hab, fechaEntrada, fechaSalida).disponibleEnFechas &&
            (hab.tipoHabitacion?.nombre || '').toLowerCase().includes('suite')
        )
            || habitacionesDisponibles.find(hab => evaluarDisponibilidadHabitacion(hab, fechaEntrada, fechaSalida).disponibleEnFechas)
            || habitacionesDisponibles[0]
            || null;
    }, [habitacionesDisponibles, fechaEntrada, fechaSalida]);

    const habitacionesRestantes = useMemo(() => {
        if (!suiteDestacada) return [];
        return habitacionesDisponibles.filter(hab => hab.idHabitacion !== suiteDestacada.idHabitacion);
    }, [habitacionesDisponibles, suiteDestacada]);

    const abrirDetalleHabitacion = (hab) => {
        // Permitir a cualquier visitante o huésped consultar la ficha completa, fotos, amenidades y detalles
        setHabitacionDetalle(hab);
    };

    const abrirModalReserva = (hab, fechaSugerida = null) => {
        setHabitacionDetalle(null);
        if (!isAuthenticated) {
            setModalRequiereSesion({
                titulo: 'Inicia sesión para reservar tu suite',
                subtitulo: `${hab?.tipoHabitacion?.nombre || 'Suite'} · ${hab?.hotel?.nombre || 'Hotel Paraíso'}`,
                motivo: 'Aparta tu suite de inmediato con 24 horas de vigencia para transferir tu anticipo sin prisas. Inicia sesión o crea tu cuenta gratuita en 1 minuto.',
                habitacion: hab
            });
            return;
        }
        let minPermitida = todayStr;

        // Si la habitación está marcada como Ocupada, su fecha mínima no puede ser antes de su desocupación
        if ((hab?.estado || '').toLowerCase() === 'ocupada' && hab?.fechaOcupacionFin) {
            if (hab.fechaOcupacionFin > minPermitida) {
                minPermitida = hab.fechaOcupacionFin;
            }
        }

        // Si se abrió desde un botón sugerido (ej: "Desde 12 Nov")
        if (fechaSugerida && fechaSugerida > minPermitida) {
            minPermitida = fechaSugerida;
        } else {
            const evalHab = evaluarDisponibilidadHabitacion(hab, fechaEntrada, fechaSalida);
            if (!evalHab.disponibleEnFechas && evalHab.fechaLiberacion && evalHab.fechaLiberacion > minPermitida) {
                minPermitida = evalHab.fechaLiberacion;
            }
        }

        setFechaMinimaReserva(minPermitida);

        let llegadaInicial = fechaSugerida || fechaEntrada;
        if (!llegadaInicial || llegadaInicial < minPermitida) {
            llegadaInicial = minPermitida;
        }

        const duracion = Math.max(nochesSeleccionadas || 2, 1);
        setFechaEntrada(llegadaInicial);
        setFechaSalida(sumarDiasFecha(llegadaInicial, duracion));
        setHabitacionSeleccionada(hab);
        setAdultosReserva(Math.min(Number(filtroCapacidad) || 1, Number(hab.tipoHabitacion?.capacidad || 2)));
        setNinosReserva(0);
        setCunaExtra(false);
        setCamaExtra(false);
        setNotasReserva('');
    };

    const cerrarModalReserva = () => {
        setHabitacionSeleccionada(null);
        setNotasReserva('');
    };

    const handleConfirmarReservacionNueva = async (e) => {
        e.preventDefault();
        if (!habitacionSeleccionada) return;
        if (!fechaEntrada || !fechaSalida || new Date(fechaSalida) <= new Date(fechaEntrada)) {
            showAlert('error', 'Selecciona una fecha de salida posterior a la fecha de entrada.');
            return;
        }
        if (!telefonoHuesped.trim()) {
            showAlert('error', 'Por favor ingresa un número de teléfono de contacto.');
            return;
        }

        const precioNoche = Number(habitacionSeleccionada.tipoHabitacion?.precioBase || 0);
        const totalEstimado = precioNoche * nochesSeleccionadas;
        const anticipoMinimo = Number((totalEstimado * 0.5).toFixed(2));

        setProcesandoReserva(true);
        try {
            const nueva = await crearReserva({
                idHabitacion: Number(habitacionSeleccionada.idHabitacion),
                nombre: user?.nombre || 'Cliente',
                email: user?.email || '',
                telefono: telefonoHuesped.trim(),
                fechaEntrada,
                fechaSalida,
                adultos: Number(adultosReserva) || 1,
                ninos: Number(ninosReserva) || 0,
                camaExtra: Boolean(camaExtra),
                cuna: Boolean(cunaExtra),
                plantaBajaSolicitada: Number(habitacionSeleccionada.piso) === 1,
                modalidad: 'PRE_RESERVA',
                horasVigencia: 24,
                anticipo: null,
                metodoPago: null,
                observaciones: notasReserva
            });
            showAlert('success', `¡Tu pre-reserva con folio ${nueva.folio || '#' + nueva.idReserva} ha sido registrada! Recuerda enviar tu comprobante de anticipo para que recepción la confirme.`);
            cerrarModalReserva();
            await cargarDatos();
            cambiarSeccion('mis-reservas');
        } catch (err) {
            showAlert('error', err.message || 'No se pudo completar la reservación.');
        } finally {
            setProcesandoReserva(false);
        }
    };

    const handleConfirmarMiReserva = (reserva) => {
        setReservaInstruccionesPago(reserva);
    };

    const handleAgregarDiaExtraHabitacion = async (hab) => {
        if (!hab || extendiendoReservaId) return;
        setExtendiendoReservaId(hab.idHabitacion);
        try {
            const actualizada = await agregarDiaExtraHabitacion(hab.idHabitacion, 1);
            showAlert(
                'success',
                `¡Se agregó +1 día extra a la Habitación #${actualizada.numero}! Nueva fecha de desocupación: ${formatearFechaOcupacion(actualizada.fechaOcupacionFin, true)} (12:00 hrs).`
            );
            await cargarDatos();
            window.dispatchEvent(new CustomEvent('hotel:refresh-notifications'));
        } catch (err) {
            showAlert('error', err.message || 'No se pudo agregar el día extra a la habitación.');
        } finally {
            setExtendiendoReservaId(null);
        }
    };

    const handleCancelarMiReserva = async (reserva) => {
        setReservaACancelar(reserva);
        setInfoReembolso(null);
        setErrorCancelacion('');
        setCargandoReembolso(true);
        setFormReembolso({
            titular: user?.nombre || '',
            banco: prefBanco || 'BBVA',
            clabe: prefClabe || '012180001234567890'
        });
        try {
            const info = await getReembolsoReserva(reserva.idReserva);
            setInfoReembolso(info);
        } catch (err) {
            setErrorCancelacion(err.message || 'No se pudo consultar el cálculo de reembolso.');
        } finally {
            setCargandoReembolso(false);
        }
    };

    const handleConfirmarCancelacion = async (e) => {
        e.preventDefault();
        if (!reservaACancelar) return;
        setCancelandoReserva(true);
        setErrorCancelacion('');
        try {
            await cancelarReserva(reservaACancelar.idReserva, formReembolso);
            const folio = reservaACancelar.folio || '#' + reservaACancelar.idReserva;
            setReservaACancelar(null);
            setInfoReembolso(null);
            showAlert('success', `Tu reservación ${folio} fue cancelada.`);
            await cargarDatos();
        } catch (err) {
            setErrorCancelacion(err.message || 'No se pudo cancelar la reservación.');
        } finally {
            setCancelandoReserva(false);
        }
    };

    const handleGuardarNuevasFechas = async (e) => {
        e.preventDefault();
        if (!reservaReprogramar) return;
        setErrorReprogramar('');
        if (!nuevaEntrada || !nuevaSalida || nuevaEntrada < todayStr) {
            setErrorReprogramar('La nueva fecha de llegada no puede estar en el pasado.');
            return;
        }
        if (nuevaSalida <= nuevaEntrada) {
            setErrorReprogramar('La fecha de salida debe ser posterior a la fecha de llegada.');
            return;
        }
        try {
            await actualizarReserva(reservaReprogramar.idReserva, {
                idHabitacion: reservaReprogramar.habitacion?.idHabitacion,
                nombre: reservaReprogramar.huesped?.nombre || user?.nombre || 'Cliente',
                telefono: reservaReprogramar.huesped?.telefono || telefonoHuesped || '',
                email: reservaReprogramar.huesped?.email || user?.email || '',
                fechaEntrada: nuevaEntrada,
                fechaSalida: nuevaSalida,
                adultos: reservaReprogramar.adultos || 1,
                ninos: reservaReprogramar.ninos || 0,
                camaExtra: Boolean(reservaReprogramar.camaExtra),
                cuna: Boolean(reservaReprogramar.cuna),
                observaciones: reservaReprogramar.observaciones || ''
            });
            showAlert('success', `Las fechas de tu reservación ${reservaReprogramar.folio || '#' + reservaReprogramar.idReserva} se actualizaron correctamente.`);
            setReservaReprogramar(null);
            cargarDatos();
        } catch (err) {
            setErrorReprogramar(err.message || 'No se pudieron actualizar las fechas.');
        }
    };

    const handleGuardarPreferenciasPerfil = async (e) => {
        e.preventDefault();
        const nombreLimpio = nombrePerfil.trim();
        const telefonoLimpio = telefonoHuesped.trim();
        if (!nombreLimpio) {
            showAlert('error', 'El nombre del titular no puede estar vacío.');
            return;
        }
        if (!/^\d{10}$/.test(telefonoLimpio)) {
            showAlert('error', 'El teléfono debe contener exactamente 10 dígitos numéricos.');
            return;
        }
        try {
            setGuardandoPerfil(true);
            await updateProfile({ nombre: nombreLimpio, telefono: telefonoLimpio });
            showAlert('success', 'Tus datos de perfil se actualizaron correctamente.');
        } catch (err) {
            showAlert('error', err.message || 'No se pudo actualizar tu perfil.');
        } finally {
            setGuardandoPerfil(false);
        }
    };

    const handleCambiarPassword = async (e) => {
        e.preventDefault();
        setPwSuccess('');
        setPwError('');

        if (!pwActual.trim()) {
            setPwError('Por favor ingresa tu contraseña actual.');
            return;
        }
        if (!pwNueva || pwNueva.length < 8) {
            setPwError('La nueva contraseña debe contener al menos 8 caracteres.');
            return;
        }
        if (pwNueva !== pwConfirmar) {
            setPwError('Las contraseñas nuevas no coinciden. Verifícalas cuidadosamente.');
            return;
        }
        if (pwNueva === pwActual) {
            setPwError('La nueva contraseña no puede ser idéntica a tu contraseña actual.');
            return;
        }

        try {
            setPwCargando(true);
            const res = await cambiarPasswordUsuario(pwActual, pwNueva, pwConfirmar);
            if (res?.token) {
                updateToken(res.token);
            }
            setPwSuccess(res?.mensaje || '¡Contraseña actualizada exitosamente! Tu cuenta está protegida.');
            setPwActual('');
            setPwNueva('');
            setPwConfirmar('');
        } catch (err) {
            setPwError(err?.message || 'No se pudo actualizar la contraseña. Verifica que tu contraseña actual sea la correcta.');
        } finally {
            setPwCargando(false);
        }
    };

    const reservasFiltradas = useMemo(() => {
        if (filtroEstadoReserva === 'ACTIVAS') {
            return misReservas.filter(r => r.estado === 'Confirmada' || r.estado === 'Ocupada');
        }
        if (filtroEstadoReserva === 'PRE_RESERVAS') {
            return misReservas.filter(r => r.estado === 'Pre-reserva');
        }
        if (filtroEstadoReserva === 'CANCELADAS') {
            return misReservas.filter(r => r.estado === 'Cancelada' || r.estado === 'Finalizada' || r.estado === 'No-Show');
        }
        return misReservas;
    }, [misReservas, filtroEstadoReserva]);

    // Métricas para el Perfil del Viajero
    const totalNochesAcumuladas = useMemo(() => {
        return misReservas
            .filter(r => r.estado !== 'Cancelada')
            .reduce((acc, r) => acc + (Number(r.noches) || 1), 0);
    }, [misReservas]);

    const totalInvertido = useMemo(() => {
        return misReservas
            .filter(r => r.estado !== 'Cancelada')
            .reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    }, [misReservas]);

    const primerNombre = useMemo(() => {
        const limpio = (user?.nombre || 'Viajero').replace(/\([^)]*\)/g, '').trim();
        const partes = limpio.split(/\s+/).filter(Boolean);
        if (partes.length >= 2 && /^(don|doña|dr\.?|dra\.?|ing\.?|lic\.?)$/i.test(partes[0])) {
            return `${partes[0]} ${partes[1]}`;
        }
        return partes[0] || 'Viajero';
    }, [user?.nombre]);

    return (
        <div className="hp-wrapper">
            {/* =================================================================
                HERO PRINCIPAL
               ================================================================= */}
            {activeSection === 'explorar' && (
                <>
                    {/* =========================================================
                        HERO DE MARCA CON FOTOGRAFÍA COSTERA
                       ========================================================= */}
                    <section className="hp-hero">
                        <div
                            className="hp-hero-bg"
                            style={{ backgroundImage: `url('${IMAGENES_HOTEL.heroCosta.webp}')` }}
                            role="img"
                            aria-label={IMAGENES_HOTEL.heroCosta.alt}
                        />
                        <div className="hp-hero-overlay" />

                        <div className="hp-hero-content">
                            <div className="hp-hero-badge">
                                <span className="hp-hero-dot" />
                                <span>Colección México · Tarifa Preferencial Directa</span>
                            </div>
                            <h1 className="hp-hero-title">
                                Hospitalidad mexicana diseñada para el descanso
                            </h1>
                            <p className="hp-hero-subtitle">
                                Hola, <strong>{primerNombre}</strong>. Explora nuestras propiedades en Cancún, Ciudad de México, Acapulco, Guadalajara y Atlacomulco con apartado inmediato sin costo por 24 horas.
                            </p>
                        </div>
                    </section>

                    {/* =========================================================
                        BUSCADOR DE DISPONIBILIDAD COMPACTO (SOLAPADO)
                       ========================================================= */}
                    <div className="hp-search-dock" id="hp-search-dock">
                        {/* Fila táctil móvil */}
                        <div
                            className="hp-search-mobile-bar"
                            onClick={() => setPanelBusquedaMovil(prev => !prev)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={panelBusquedaMovil}
                            aria-label="Modificar fechas y huéspedes"
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPanelBusquedaMovil(prev => !prev); }}
                        >
                            <div className="hp-search-mobile-summary-text">
                                <span className="hp-mobile-pill-item">
                                    <Calendar size={14} /> {fechaEntrada} &rarr; {fechaSalida}
                                </span>
                                <span className="hp-mobile-pill-item">
                                    <Users size={14} /> {filtroCapacidad} {filtroCapacidad === 1 ? 'huésped' : 'huéspedes'}
                                </span>
                            </div>
                            <span className="btn btn-ghost hp-mobile-toggle-tag">
                                {panelBusquedaMovil ? 'Cerrar' : 'Ajustar'}
                            </span>
                        </div>

                        {/* Campos de búsqueda */}
                        <div className={`hp-search-grid ${panelBusquedaMovil ? 'mobile-expanded' : ''}`}>
                            <div className="hp-search-field">
                                <label htmlFor="hp-search-llegada">
                                    <Calendar size={14} /> Llegada
                                </label>
                                <input
                                    id="hp-search-llegada"
                                    type="date"
                                    className="hp-search-input"
                                    value={fechaEntrada}
                                    min={todayStr}
                                    onChange={(e) => {
                                        const nuevaLlegada = e.target.value;
                                        setFechaEntrada(nuevaLlegada);
                                        if (fechaSalida <= nuevaLlegada) {
                                            setFechaSalida(sumarDiasFecha(nuevaLlegada, nochesSeleccionadas));
                                        }
                                    }}
                                />
                            </div>

                            <div className="hp-search-field">
                                <label htmlFor="hp-search-salida">
                                    <Calendar size={14} /> Salida
                                </label>
                                <input
                                    id="hp-search-salida"
                                    type="date"
                                    className="hp-search-input"
                                    value={fechaSalida}
                                    min={sumarDiasFecha(fechaEntrada || todayStr, 1)}
                                    onChange={(e) => setFechaSalida(e.target.value)}
                                />
                            </div>

                            <div className="hp-search-field">
                                <label htmlFor="hp-search-huespedes">
                                    <Users size={14} /> Huéspedes
                                </label>
                                <select
                                    id="hp-search-huespedes"
                                    className="hp-search-select"
                                    value={filtroCapacidad}
                                    onChange={(e) => setFiltroCapacidad(Number(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="hp-search-field">
                                <label htmlFor="hp-search-destino">
                                    <MapPin size={14} /> Destino
                                </label>
                                <select
                                    id="hp-search-destino"
                                    className="hp-search-select"
                                    value={filtroHotel}
                                    onChange={(e) => setFiltroHotel(e.target.value)}
                                >
                                    <option value="TODOS">Todos los destinos ({hotelesUnicos.length} propiedades)</option>
                                    {hotelesUnicos.map(h => (
                                        <option key={h.idHotel} value={h.idHotel}>
                                            {h.nombre} — {h.ciudad}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="hp-search-summary-row">
                            <div className="hp-search-summary-tags">
                                <span className="hp-summary-chip num">
                                    <Clock size={13} /> {nochesSeleccionadas} {nochesSeleccionadas === 1 ? 'noche' : 'noches'} de estancia
                                </span>
                                <span className="hp-summary-chip num">
                                    {habitacionesDisponibles.length} {habitacionesDisponibles.length === 1 ? 'suite disponible' : 'suites disponibles'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {alertMsg.text && (
                        <div className={`alert ${alertMsg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                            <span>{alertMsg.text}</span>
                        </div>
                    )}

                    {/* =========================================================
                        DESTINOS: PRESENTACIÓN EDITORIAL
                       ========================================================= */}
                    {hotelesUnicos.length > 0 && (
                        <section className="hp-destinations-section">
                            <div className="hp-section-header">
                                <div>
                                    <h2 className="hp-section-title">Destinos &amp; Colección de Hoteles</h2>
                                    <p className="hp-section-desc">
                                        Selecciona una propiedad para explorar sus suites disponibles y amenidades exclusivas.
                                    </p>
                                </div>
                                {filtroHotel !== 'TODOS' && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setFiltroHotel('TODOS')}
                                    >
                                        Ver todas las propiedades &times;
                                    </button>
                                )}
                            </div>

                            {/* Acordeón Arquitectónico Híbrido con Micro-Radar Cartográfico */}
                            {(() => {
                                const irASuitesHotel = (hotelId) => {
                                    setFiltroHotel(String(hotelId));
                                    setHoverHotelId(hotelId);
                                    const catalogEl = document.querySelector('.hp-catalog-section');
                                    if (catalogEl) {
                                        catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                };

                                return (
                                    <div
                                        className="hp-accordion-container"
                                        onMouseLeave={() => setHoverHotelId(null)}
                                    >
                                        {hotelesUnicos.map((h, idx) => {
                                            const isSel = String(filtroHotel) === String(h.idHotel);
                                            const hotelActivoId = hoverHotelId !== null
                                                ? hoverHotelId
                                                : (filtroHotel !== 'TODOS' ? filtroHotel : (hotelesUnicos[0]?.idHotel));
                                            const isExpanded = String(hotelActivoId) === String(h.idHotel);
                                            const c = disponiblesPorHotelId[h.idHotel] || 0;
                                            const v = vendiblesPorHotelId[h.idHotel] || 0;
                                            const perfil = obtenerPerfilHotel(h);

                                            return (
                                                <article
                                                    key={h.idHotel}
                                                    id={`hp-hotel-panel-${h.idHotel}`}
                                                    className={`hp-accordion-panel ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${isSel ? 'is-selected' : ''}`}
                                                    onMouseEnter={() => setHoverHotelId(h.idHotel)}
                                                    onClick={() => {
                                                        if (isExpanded) {
                                                            irASuitesHotel(h.idHotel);
                                                        } else {
                                                            setHoverHotelId(h.idHotel);
                                                            setFiltroHotel(String(h.idHotel));
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-expanded={isExpanded}
                                                    aria-label={`Destino ${h.ciudad}: ${h.nombre}`}
                                                    title={`Explorar suites de ${h.nombre}`}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            irASuitesHotel(h.idHotel);
                                                        }
                                                    }}
                                                >
                                                    {/* Fondo Fotográfico Inmersivo - Clic directo envía a suites */}
                                                    <img
                                                        className="hp-accordion-bg"
                                                        src={perfil.imagen}
                                                        alt={perfil.alt}
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => aplicarFallbackImagen(e, perfil.fallbackImagen)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            irASuitesHotel(h.idHotel);
                                                        }}
                                                    />
                                                    <div className="hp-accordion-overlay-base" />

                                                    {/* Vista Colapsada (Franja Vertical en Escritorio / Cinta en Móvil) */}
                                                    {!isExpanded && (
                                                        <div className="hp-accordion-collapsed-content">
                                                            <div className="hp-accordion-collapsed-num">{perfil.numero || `0${idx + 1}`}</div>
                                                            <div className="hp-accordion-collapsed-title">{h.ciudad.toUpperCase()}</div>
                                                            <div className="hp-accordion-collapsed-tag">{perfil.tag}</div>
                                                        </div>
                                                    )}

                                                    {/* Vista Expandida (Ficha Panorámica de Lujo + Micro-Radar) */}
                                                    {isExpanded && (
                                                        <div className="hp-accordion-expanded-content">
                                                            {/* Cabecera superior del panel activo */}
                                                            <div className="hp-accordion-expanded-top">
                                                                <div className="hp-accordion-dest-badge-col">
                                                                    <span className="hp-accordion-dest-index">
                                                                        {perfil.numero || `0${idx + 1}`} · {h.ciudad.toUpperCase()}
                                                                    </span>
                                                                    <h3 className="hp-accordion-dest-title">{h.nombre}</h3>
                                                                    <div className="hp-accordion-tags-row">
                                                                        <span className="hp-accordion-tag-pill">{perfil.tag}</span>
                                                                        <span className={`hp-accordion-avail-pill ${c > 0 ? 'is-avail' : (v > 0 ? 'is-dates' : 'is-soldout')}`}>
                                                                            <span className="hp-property-status-indicator" />
                                                                            {c > 0 ? `${c} disponibles` : (v > 0 ? 'Ver fechas' : 'Agotado')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Micro-Radar Cartográfico Flotante Idéntico al Concepto */}
                                                                <div
                                                                    className="hp-accordion-radar-slot"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <MexicoMicroMap
                                                                        activeHotel={h}
                                                                        hotels={hotelesUnicos}
                                                                        onSelectHotel={(targetHotelId) => {
                                                                            const matchH = hotelesUnicos.find(item => item.idHotel === targetHotelId);
                                                                            if (matchH) {
                                                                                setHoverHotelId(matchH.idHotel);
                                                                                setFiltroHotel(String(matchH.idHotel));
                                                                                setTimeout(() => {
                                                                                    const panel = document.getElementById(`hp-hotel-panel-${matchH.idHotel}`);
                                                                                    if (panel) {
                                                                                        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                    }
                                                                                }, 60);
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Pie inferior con servicios, tarifa y CTA */}
                                                            <div className="hp-accordion-expanded-bottom">
                                                                <div className="hp-accordion-amenities-col">
                                                                    <p className="hp-accordion-vibe-text">{perfil.vibe}</p>
                                                                    <div className="hp-accordion-amenities-pills">
                                                                        {(perfil.amenidades || []).map((amenidad, aIdx) => (
                                                                            <span key={aIdx} className="hp-accordion-amenity-chip">
                                                                                {amenidad}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="hp-accordion-action-col">
                                                                    <div className="hp-accordion-price-wrap">
                                                                        <span className="hp-accordion-price-val num">
                                                                            Desde ${Number(precioMinimoPorHotelId[h.idHotel] || perfil.precioDesde).toLocaleString('es-MX')} MXN
                                                                        </span>
                                                                        <span className="hp-accordion-price-unit">/ noche</span>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary hp-accordion-cta-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            irASuitesHotel(h.idHotel);
                                                                        }}
                                                                    >
                                                                        <span>Explorar Suites</span>
                                                                        <ArrowRight size={15} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </section>
                    )}

                    {/* =========================================================
                        CATÁLOGO DE HABITACIONES Y SUITES
                       ========================================================= */}
                    <section className="hp-catalog-section">
                        <div className="hp-section-header">
                            <div>
                                <h2 className="hp-section-title">
                                    {filtroHotel !== 'TODOS'
                                        ? `Suites en ${hotelesUnicos.find(h => String(h.idHotel) === String(filtroHotel))?.ciudad || 'Hotel Paraíso'}`
                                        : 'Suites y espacios de descanso'}
                                </h2>
                                <p className="hp-section-desc">
                                    {filtroHotel !== 'TODOS' ? (
                                        <span>
                                            Mostrando opciones disponibles en {hotelesUnicos.find(h => String(h.idHotel) === String(filtroHotel))?.nombre}.{' '}
                                            <button
                                                type="button"
                                                className="hp-clear-filter-inline"
                                                onClick={() => setFiltroHotel('TODOS')}
                                            >
                                                Ver todas las propiedades &times;
                                            </button>
                                        </span>
                                    ) : (
                                        'Tarifas por noche con impuestos incluidos, cancelaciones claras y servicios de autor.'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Cinta rápida de sedes con tarifas reales de BD */}
                        {hotelesUnicos.length > 1 && (
                            <div className="hp-category-bar" style={{ marginBottom: 12 }}>
                                <button
                                    type="button"
                                    className={`hp-cat-pill ${filtroHotel === 'TODOS' ? 'active' : ''}`}
                                    onClick={() => setFiltroHotel('TODOS')}
                                >
                                    Todas las sedes ({habitaciones.filter(h => (h.estado || '').toLowerCase() !== 'mantenimiento').length})
                                </button>
                                {hotelesUnicos.map((h) => {
                                    const minPrecio = precioMinimoPorHotelId[h.idHotel];
                                    const dispCount = disponiblesPorHotelId[h.idHotel] || 0;
                                    return (
                                        <button
                                            key={h.idHotel}
                                            type="button"
                                            className={`hp-cat-pill ${String(filtroHotel) === String(h.idHotel) ? 'active' : ''}`}
                                            onClick={() => setFiltroHotel(String(h.idHotel))}
                                        >
                                            <span>{h.nombre} · {h.ciudad}</span>
                                            {minPrecio ? (
                                                <span className="num" style={{ marginLeft: 6, opacity: 0.85, fontWeight: 700 }}>
                                                    (${Number(minPrecio).toLocaleString('es-MX')}+ · {dispCount} {dispCount === 1 ? 'libre' : 'libres'})
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Barra de filtros de categoría y orden */}
                        <div className="hp-catalog-toolbar">
                            <div className="hp-category-bar">
                                {[
                                    { id: 'TODAS', label: 'Todas las suites' },
                                    { id: 'SUITE', label: 'Suites Signature' },
                                    { id: 'FAMILIAR', label: 'Familiares' },
                                    { id: 'DOBLE', label: 'Dobles & King' },
                                    { id: 'INDIVIDUAL', label: 'Ejecutivas' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        className={`hp-cat-pill ${filtroCategoria === cat.id ? 'active' : ''}`}
                                        onClick={() => setFiltroCategoria(cat.id)}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            <div className="hp-catalog-order-wrap">
                                <SlidersHorizontal size={14} color="var(--text-muted)" />
                                <select
                                    className="hp-catalog-order-select"
                                    value={ordenCatalogo}
                                    onChange={(e) => setOrdenCatalogo(e.target.value)}
                                    aria-label="Ordenar catálogo"
                                >
                                    <option value="DESTACADOS">Destacados</option>
                                    <option value="PRECIO_ASC">Precio: menor a mayor</option>
                                    <option value="PRECIO_DESC">Precio: mayor a menor</option>
                                    <option value="CAPACIDAD">Mayor capacidad</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="table-card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Cargando catálogo de suites...
                            </div>
                        ) : habitacionesDisponibles.length === 0 ? (
                            <div className="table-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                                <BedDouble size={44} style={{ color: 'var(--brand-terracotta)', marginBottom: 12, opacity: 0.6 }} />
                                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                                    No hay habitaciones con estos filtros
                                </h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Prueba seleccionando "Todos los destinos" o ampliando la categoría.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setFiltroHotel('TODOS');
                                        setFiltroCategoria('TODAS');
                                        setFiltroCapacidad(1);
                                        setBusquedaTexto('');
                                    }}
                                >
                                    Restablecer filtros
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Suite destacada grande (Featured Suite) */}
                                {suiteDestacada && (() => {
                                    const evalSuite = evaluarDisponibilidadHabitacion(suiteDestacada, fechaEntrada, fechaSalida);
                                    return (
                                    <article className="hp-suite-featured-card">
                                        <div className="hp-suite-featured-media">
                                            <img
                                                src={obtenerImagenHabitacion(suiteDestacada)}
                                                alt={obtenerAltHabitacion(suiteDestacada)}
                                                className="hp-suite-featured-img"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => aplicarFallbackImagen(e, obtenerPresetHabitacion(suiteDestacada))}
                                            />
                                            <span className="hp-suite-featured-badge">
                                                Suite Signature · {suiteDestacada.hotel?.ciudad || 'Costa del Pacífico'}
                                            </span>
                                        </div>

                                        <div className="hp-suite-featured-info">
                                            <div className="hp-suite-featured-meta">
                                                <span>{suiteDestacada.hotel?.nombre} &bull; {suiteDestacada.hotel?.ciudad}</span>
                                                <span>&bull;</span>
                                                <span>Hasta {suiteDestacada.tipoHabitacion?.capacidad || 2} personas</span>
                                                {isAuthenticated && (
                                                    <>
                                                        <span>&bull;</span>
                                                        <span>{obtenerSuperficieHabitacion(suiteDestacada)}</span>
                                                    </>
                                                )}
                                            </div>

                                            <h3 className="hp-suite-featured-title">
                                                {suiteDestacada.tipoHabitacion?.nombre}
                                            </h3>

                                            <p className="hp-suite-featured-desc">
                                                {suiteDestacada.tipoHabitacion?.descripcion || 'Espacio amplio con terraza privada frente al océano, acabados en madera de roble, lino fresco y servicio exclusivo de hospitalidad.'}
                                            </p>

                                            <div className="hp-suite-amenities-text">
                                                {obtenerAmenidadesHabitacion(suiteDestacada).slice(0, 3).map(a => a.label).join(' · ')}
                                            </div>

                                            {/* Disponibilidad con confidencialidad para huéspedes */}
                                            {!evalSuite.disponibleEnFechas ? (
                                                <div className="hp-room-occupancy-banner is-occupied">
                                                    <div className="hp-occupancy-row-main">
                                                        <Clock size={14} />
                                                        <span>
                                                            <strong>Disponible a partir del:</strong> <span className="num">{formatearFechaOcupacion(evalSuite.fechaLiberacion, true)}</span>
                                                        </span>
                                                    </div>
                                                    {suiteDestacada.diaExtraDisponible && misReservas.some(r => r.idReserva === suiteDestacada.idReservaActiva) && (
                                                        <div style={{ marginTop: 4 }}>
                                                            <button
                                                                type="button"
                                                                className="hp-occupancy-jump-btn"
                                                                disabled={extendiendoReservaId === suiteDestacada.idHabitacion}
                                                                onClick={() => handleAgregarDiaExtraHabitacion(suiteDestacada)}
                                                            >
                                                                {extendiendoReservaId === suiteDestacada.idHabitacion
                                                                    ? 'Extendiendo...'
                                                                    : `+1 Día extra (+$${Number(suiteDestacada.costoDiaExtra || suiteDestacada.tipoHabitacion?.precioBase || 0).toLocaleString('es-MX')})`}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="hp-room-occupancy-banner is-free">
                                                    <div className="hp-occupancy-row-main">
                                                        <CheckCircle2 size={14} />
                                                        <span><strong>Disponible</strong> · Lista para tus fechas de estancia</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="hp-suite-featured-footer">
                                                <div>
                                                    <div className="hp-price-night-label num">
                                                        ${Number(suiteDestacada.tipoHabitacion?.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN <span className="hp-unit">/ noche</span>
                                                    </div>
                                                    <div className="hp-price-total-label num">
                                                        ${(Number(suiteDestacada.tipoHabitacion?.precioBase || 0) * nochesSeleccionadas).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                                    </div>
                                                    <div className="hp-price-subtext">
                                                        Total por {nochesSeleccionadas} {nochesSeleccionadas === 1 ? 'noche' : 'noches'} · Impuestos incluidos
                                                    </div>
                                                </div>

                                                <div className="hp-card-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => abrirDetalleHabitacion(suiteDestacada)}
                                                    >
                                                        Ver detalles
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={() => abrirModalReserva(suiteDestacada, !evalSuite.disponibleEnFechas ? evalSuite.fechaLiberacion : null)}
                                                    >
                                                        <span>
                                                            {!evalSuite.disponibleEnFechas && evalSuite.fechaLiberacion
                                                                ? `Disponible desde ${formatearFechaOcupacion(evalSuite.fechaLiberacion)}`
                                                                : 'Reservar'}
                                                        </span>
                                                        <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                    );
                                })()}

                                {/* Cuadrícula con proporción 16:10 para las demás habitaciones */}
                                {habitacionesRestantes.length > 0 && (
                                    <div className="hp-rooms-grid">
                                        {habitacionesRestantes.map(hab => {
                                            const precioNoche = Number(hab.tipoHabitacion?.precioBase || 0);
                                            const totalEstimado = precioNoche * nochesSeleccionadas;
                                            const amenidades = obtenerAmenidadesHabitacion(hab);
                                            const capacidad = hab.tipoHabitacion?.capacidad || 2;
                                            const evalHab = evaluarDisponibilidadHabitacion(hab, fechaEntrada, fechaSalida);

                                            return (
                                                <article key={hab.idHabitacion} className={`hp-room-card ${!evalHab.disponibleEnFechas ? 'has-date-conflict' : ''}`}>
                                                    <div className="hp-room-media-wrap">
                                                        <img
                                                            src={obtenerImagenHabitacion(hab)}
                                                            alt={obtenerAltHabitacion(hab)}
                                                            className="hp-room-img"
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => aplicarFallbackImagen(e, obtenerPresetHabitacion(hab))}
                                                        />
                                                        <div className="hp-room-location-tag">
                                                            <MapPin size={12} /> {hab.hotel?.ciudad || 'México'} {isAuthenticated ? `· Hab. ${hab.numero}` : ''}
                                                        </div>
                                                    </div>

                                                    <div className="hp-room-body">
                                                        <div className="hp-room-header-meta">
                                                            <span className="hp-room-hotel-name">{hab.hotel?.nombre}</span>
                                                            <span className="hp-room-capacity">Hasta {capacidad} personas</span>
                                                        </div>

                                                        <h3 className="hp-room-title">
                                                            {hab.tipoHabitacion?.nombre}
                                                        </h3>

                                                        <div className="hp-room-amenities-text">
                                                            {amenidades.slice(0, 3).map(a => a.label).join(' · ')}
                                                        </div>

                                                        {/* Disponibilidad con confidencialidad para huéspedes */}
                                                        {!evalHab.disponibleEnFechas ? (
                                                            <div className="hp-room-occupancy-banner is-occupied compact">
                                                                <div className="hp-occupancy-row-main">
                                                                    <Clock size={13} />
                                                                    <span>
                                                                        <strong>Disponible a partir del:</strong> <span className="num">{formatearFechaOcupacion(evalHab.fechaLiberacion, true)}</span>
                                                                    </span>
                                                                </div>
                                                                {hab.diaExtraDisponible && misReservas.some(r => r.idReserva === hab.idReservaActiva) && (
                                                                    <div style={{ marginTop: 4 }}>
                                                                        <button
                                                                            type="button"
                                                                            className="hp-occupancy-jump-btn"
                                                                            disabled={extendiendoReservaId === hab.idHabitacion}
                                                                            onClick={() => handleAgregarDiaExtraHabitacion(hab)}
                                                                        >
                                                                            {extendiendoReservaId === hab.idHabitacion
                                                                                ? 'Extendiendo...'
                                                                                : `+1 Día extra (+$${Number(hab.costoDiaExtra || precioNoche).toLocaleString('es-MX')})`}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="hp-room-occupancy-banner is-free compact">
                                                                <div className="hp-occupancy-row-main">
                                                                    <CheckCircle2 size={13} />
                                                                    <span><strong>Disponible</strong> · Lista para reservar</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="hp-room-footer-row">
                                                            <div className="hp-room-price-col">
                                                                <span className="hp-room-price-night num">
                                                                    ${precioNoche.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN <span className="hp-unit">/ noche</span>
                                                                </span>
                                                                <span className="hp-room-price-total num">
                                                                    Total: ${totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN ({nochesSeleccionadas} n.)
                                                                </span>
                                                            </div>

                                                            <div className="hp-card-actions">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost"
                                                                    onClick={() => abrirDetalleHabitacion(hab)}
                                                                >
                                                                    Ver detalles
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-primary"
                                                                    onClick={() => abrirModalReserva(hab, !evalHab.disponibleEnFechas ? evalHab.fechaLiberacion : null)}
                                                                >
                                                                    <span>
                                                                        {!evalHab.disponibleEnFechas && evalHab.fechaLiberacion
                                                                            ? `Desde ${formatearFechaOcupacion(evalHab.fechaLiberacion)}`
                                                                            : 'Reservar'}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </>
            )}

            {/* =================================================================
                VISTA 2: MIS RESERVACIONES E ITINERARIOS DE VIAJE
               ================================================================= */}
            {activeSection === 'mis-reservas' && (
                <section>
                    <div className="hp-section-header">
                        <div>
                            <div className="hp-section-kicker">Centro de Viajes del Huésped</div>
                            <h2 className="hp-section-title">Mis Reservaciones e Itinerarios</h2>
                            <p className="hp-section-desc">
                                Gestiona tus próximas estancias, descarga tu pase de abordar, confirma pre-reservas o reprograma tus fechas.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {isAuthenticated && (
                                <>
                                    <button type="button" className="btn btn-secondary hp-details-btn" onClick={() => cambiarSeccion('mi-perfil')}>
                                        <User size={15} /> Mi Perfil y Preferencias
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={cargarDatos}>
                                        <RefreshCw size={15} /> Actualizar
                                    </button>
                                </>
                            )}
                            <button type="button" className="btn btn-primary" onClick={() => cambiarSeccion('explorar')}>
                                <BedDouble size={16} /> Explorar Suites
                            </button>
                        </div>
                    </div>

                    {!isAuthenticated ? (
                        <div className="table-card" style={{ padding: '56px 24px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(196, 85, 58, 0.1)', color: 'var(--brand-terracotta)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Lock size={26} />
                            </div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                                Inicia sesión para consultar tus reservaciones
                            </h3>
                            <p style={{ color: '#64748b', maxWidth: 440, margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: 1.55 }}>
                                Como visitante puedes explorar nuestras propiedades y tarifas. Para gestionar tus itinerarios, pases de abordar y pre-reservas necesitas acceder a tu cuenta.
                            </p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
                                    Iniciar sesión <ArrowRight size={16} />
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => navigate('/registro')}>
                                    Crear cuenta gratis
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                    {/* Filtros por Estado de Reservación */}
                    <div className="hp-category-bar" style={{ marginBottom: '1.5rem' }}>
                        {[
                            { id: 'TODAS', label: `Todas (${misReservas.length})` },
                            { id: 'ACTIVAS', label: `Confirmadas / En curso (${misReservas.filter(r => r.estado === 'Confirmada' || r.estado === 'Ocupada').length})` },
                            { id: 'PRE_RESERVAS', label: `Pre-reservas por confirmar (${misReservas.filter(r => r.estado === 'Pre-reserva').length})` },
                            { id: 'CANCELADAS', label: `Historial / Canceladas (${misReservas.filter(r => r.estado === 'Cancelada' || r.estado === 'Finalizada' || r.estado === 'No-Show').length})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`hp-cat-pill ${filtroEstadoReserva === tab.id ? 'active' : ''}`}
                                onClick={() => setFiltroEstadoReserva(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {reservasFiltradas.length === 0 ? (
                        <div className="table-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
                            <Calendar size={48} style={{ color: '#f59e0b', marginBottom: 14 }} />
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                                No hay reservaciones en esta categoría
                            </h3>
                            <p style={{ color: '#64748b', maxWidth: 480, margin: '0 auto 20px', fontSize: '0.95rem' }}>
                                Explora nuestras propiedades en Cancún, Ciudad de México, Guadalajara y más destinos para programar tu próxima estancia.
                            </p>
                            <button type="button" className="btn btn-primary" onClick={() => cambiarSeccion('explorar')}>
                                Reservar <ArrowRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="hp-boarding-list">
                            {reservasFiltradas.map(r => {
                                const esPreReserva = r.estado === 'Pre-reserva';
                                const esActiva = r.estado !== 'Cancelada' && r.estado !== 'Finalizada';
                                const saldoPendiente = Math.max(Number(r.total || 0) - Number(r.anticipo || 0), 0);
                                const llegada = formatFechaItinerario(r.fechaEntrada);
                                const salida = formatFechaItinerario(r.fechaSalida);
                                return (
                                    <article key={r.idReserva} className="hp-boarding-pass">
                                        {/* Sección 1: Portada Fotográfica de la Suite */}
                                        <div className="hp-boarding-media">
                                            <img
                                                src={obtenerImagenHabitacion(r.habitacion)}
                                                alt={r.habitacion?.tipoHabitacion?.nombre || 'Suite de hotel'}
                                                className="hp-boarding-img"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => aplicarFallbackImagen(e, obtenerPresetHabitacion(r.habitacion))}
                                            />
                                            <div className="hp-boarding-media-badge">
                                                <MapPin size={12} />
                                                <span>{r.habitacion?.hotel?.ciudad || 'Costa Mexicana'}</span>
                                            </div>
                                        </div>

                                        {/* Sección 2: Itinerario y Ruta de Vuelo/Estancia */}
                                        <div className="hp-boarding-body">
                                            <div>
                                                <div className="hp-boarding-hotel-kicker">
                                                    <Hotel size={13} />
                                                    <span>{r.habitacion?.hotel?.nombre || 'Hotel Paraíso'} · {r.habitacion?.hotel?.ciudad || 'México'}</span>
                                                </div>
                                                <h3 className="hp-boarding-room-title">
                                                    {r.habitacion?.tipoHabitacion?.nombre || 'Suite'} — Habitación <span className="num">{r.habitacion?.numero}</span>
                                                </h3>
                                            </div>

                                            {/* Módulo de Itinerario de Estancia (Check-in, Noches y Check-out) */}
                                            <div className="hp-boarding-route">
                                                <div className="hp-itin-station hp-itin-station-in">
                                                    <div className="hp-itin-station-header">
                                                        <span className="hp-itin-pill-tag hp-itin-pill-in">CHECK-IN</span>
                                                        <span className="hp-itin-station-time">
                                                            <Clock size={11} /> 15:00 hrs
                                                        </span>
                                                    </div>
                                                    <div className="hp-itin-station-content">
                                                        <div className="hp-itin-day-number num">{llegada.dia}</div>
                                                        <div className="hp-itin-meta">
                                                            <div className="hp-itin-month-year">{llegada.mes} {llegada.anio}</div>
                                                            <div className="hp-itin-weekday">{llegada.diaSemanaCompleto}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="hp-itin-connector-col">
                                                    <div className="hp-itin-track-line">
                                                        <span className="hp-itin-track-dot" />
                                                        <div className="hp-itin-track-dash" />
                                                        <ArrowRight size={13} className="hp-itin-track-arrow" />
                                                    </div>
                                                    <div className="hp-itin-nights-badge">
                                                        <Moon size={12} className="hp-itin-moon" />
                                                        <span className="num"><strong>{r.noches || 1}</strong> {r.noches === 1 ? 'noche' : 'noches'}</span>
                                                    </div>
                                                </div>

                                                <div className="hp-itin-station hp-itin-station-out">
                                                    <div className="hp-itin-station-header right">
                                                        <span className="hp-itin-station-time">
                                                            <Clock size={11} /> 12:00 hrs
                                                        </span>
                                                        <span className="hp-itin-pill-tag hp-itin-pill-out">CHECK-OUT</span>
                                                    </div>
                                                    <div className="hp-itin-station-content right">
                                                        <div className="hp-itin-meta right">
                                                            <div className="hp-itin-month-year">{salida.mes} {salida.anio}</div>
                                                            <div className="hp-itin-weekday">{salida.diaSemanaCompleto}</div>
                                                        </div>
                                                        <div className="hp-itin-day-number num">{salida.dia}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Huéspedes y Especificaciones */}
                                            <div className="hp-boarding-specs-row">
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <Users size={14} color="var(--brand-terracotta)" />
                                                    {/* Pluralización correcta en singular y plural */}
                                                    {(() => {
                                                        const adultos = r.adultos || 1;
                                                        const ninos = r.ninos || 0;
                                                        const totalHuespedes = adultos + ninos;
                                                        return (
                                                            <>
                                                                <strong className="num">{totalHuespedes}</strong> {totalHuespedes === 1 ? 'huésped' : 'huéspedes'} ({adultos} {adultos === 1 ? 'adulto' : 'adultos'}{ninos ? `, ${ninos} ${ninos === 1 ? 'niño' : 'niños'}` : ''})
                                                            </>
                                                        );
                                                    })()}
                                                </span>
                                                <span>•</span>
                                                <span>Piso <strong className="num">{r.habitacion?.piso || 1}</strong></span>
                                                {r.cuna && <span className="hp-modal-pill-tag">Cuna de cortesía</span>}
                                                {r.camaExtra && <span className="hp-modal-pill-tag">Cama extra</span>}
                                            </div>

                                            {/* Aviso de desocupación en Mis Reservaciones */}
                                            {esActiva && (
                                                <div className={`hp-boarding-checkout-notice ${r.porDesocuparse ? 'is-soon' : ''}`}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600 }}>
                                                        <Bell size={14} />
                                                        <span>
                                                            {r.porDesocuparse
                                                                ? `Aviso: Tu habitación está próxima a desocuparse el ${formatearFechaOcupacion(r.fechaSalida, true)} a las 12:00 hrs.`
                                                                : `Fecha programada de desocupación: ${formatearFechaOcupacion(r.fechaSalida, true)} a las 12:00 hrs.`}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sección 3: Talón / Cupón Perforado (Stub) con Folio y Acciones Contextuales */}
                                        <div className="hp-boarding-stub">
                                            <div className="hp-boarding-stub-top">
                                                <div>
                                                    <div className="hp-boarding-folio-tag">FOLIO DE ESTANCIA</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--brand-ocean)' }}>
                                                        <span className="num">{r.folio || `#${r.idReserva}`}</span>
                                                    </div>
                                                </div>
                                                <EstadoBadge estado={r.estado} />
                                            </div>

                                            {/* Desglose Financiero */}
                                            <div className="hp-boarding-finance-block">
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                                    Inversión de Estancia
                                                </div>
                                                <div className="hp-boarding-finance-total">
                                                    $<span className="num">{Number(r.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span> <span style={{ fontSize: '0.72rem', color: '#64748b' }}>MXN</span>
                                                </div>
                                                <div className="hp-boarding-finance-detail">
                                                    <span>Anticipo:</span>
                                                    <strong style={{ color: Number(r.anticipo || 0) > 0 ? '#059669' : '#64748b' }} className="num">
                                                        ${Number(r.anticipo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </strong>
                                                </div>
                                                {r.estado === 'Cancelada' ? (
                                                    <div style={{
                                                        marginTop: 6,
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        background: 'var(--color-error-bg, #fee2e2)',
                                                        color: 'var(--color-error, #b91c1c)',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 600,
                                                        lineHeight: 1.3
                                                    }}>
                                                        {r.observaciones ? r.observaciones : 'Reservación cancelada'}
                                                    </div>
                                                ) : (
                                                    <div className="hp-boarding-finance-detail">
                                                        <span>Restante al Check-in:</span>
                                                        <strong style={{ color: saldoPendiente > 0 ? 'var(--brand-terracotta)' : '#059669' }} className="num">
                                                            ${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </strong>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Acciones Contextuales */}
                                            <div className="hp-boarding-actions">
                                                {/* Botón de Pase de Abordar / Voucher siempre visible */}
                                                <button
                                                    type="button"
                                                    className="hp-boarding-btn hp-boarding-btn-primary"
                                                    onClick={() => setVoucherReserva(r)}
                                                >
                                                    <FileText size={14} /> Pase de abordar / Voucher
                                                </button>

                                                {esPreReserva ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="hp-boarding-btn hp-boarding-btn-amber"
                                                            onClick={() => handleConfirmarMiReserva(r)}
                                                        >
                                                            <HelpCircle size={14} /> ¿Cómo confirmar con anticipo?
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="hp-boarding-btn hp-boarding-btn-secondary"
                                                            onClick={() => {
                                                                setReservaReprogramar(r);
                                                                setNuevaEntrada(r.fechaEntrada);
                                                                setNuevaSalida(r.fechaSalida);
                                                            }}
                                                        >
                                                            <Edit3 size={14} /> Reprogramar fechas
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="hp-boarding-btn hp-boarding-btn-danger"
                                                            onClick={() => handleCancelarMiReserva(r)}
                                                        >
                                                            <XCircle size={14} /> Cancelar pre-reserva
                                                        </button>
                                                    </>
                                                ) : esActiva ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="hp-boarding-btn hp-boarding-btn-secondary"
                                                            onClick={() => {
                                                                setReservaReprogramar(r);
                                                                setNuevaEntrada(r.fechaEntrada);
                                                                setNuevaSalida(r.fechaSalida);
                                                            }}
                                                        >
                                                            <Edit3 size={14} /> Cambiar fechas
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="hp-boarding-btn hp-boarding-btn-danger"
                                                            onClick={() => handleCancelarMiReserva(r)}
                                                        >
                                                            <XCircle size={14} /> Cancelar estancia
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                                                        Estancia finalizada
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                        </>
                    )}
                </section>
            )}

            {/* =================================================================
                VISTA 3: MI PERFIL DEL HUÉSPED (INFORMACIÓN ERGONÓMICA Y SEGURA)
               ================================================================= */}
            {activeSection === 'mi-perfil' && (
                <section>
                    <div className="hp-section-header">
                        <div>
                            <div className="hp-section-kicker">Espacio Personal</div>
                            <h2 className="hp-section-title">Perfil del Huésped</h2>
                            <p className="hp-section-desc">
                                Administra tu información personal, datos de contacto y credenciales de acceso.
                            </p>
                        </div>
                        {isAuthenticated && (
                            <button type="button" className="btn btn-secondary" onClick={() => cambiarSeccion('mis-reservas')}>
                                <CalendarCheck size={16} /> Ver Mis Reservaciones ({misReservas.length})
                            </button>
                        )}
                    </div>

                    {!isAuthenticated ? (
                        <div className="table-card" style={{ padding: '56px 24px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(196, 85, 58, 0.1)', color: 'var(--brand-terracotta)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <User size={26} />
                            </div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                                Tu perfil de huésped está protegido
                            </h3>
                            <p style={{ color: '#64748b', maxWidth: 440, margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: 1.55 }}>
                                Inicia sesión o regístrate para configurar tus preferencias de estancia, teléfono de contacto y credenciales de acceso.
                            </p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
                                    Iniciar sesión <ArrowRight size={16} />
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => navigate('/registro')}>
                                    Crear cuenta
                                </button>
                            </div>
                        </div>
                    ) : (
                    <div className="hp-profile-clean-card">
                        <div className="hp-profile-header-strip">
                            <div className="hp-profile-avatar">
                                {(user?.nombre || 'H')[0].toUpperCase()}
                            </div>
                            <div className="hp-profile-main-meta">
                                <h3 className="hp-profile-name">{user?.nombre || 'Huésped Distinguido'}</h3>
                                <div className="hp-profile-email">
                                    <Mail size={15} /> {user?.email}
                                </div>
                                <div className="hp-profile-badge-row">
                                    <span className="hp-profile-verified-badge">
                                        <CheckCircle2 size={13} /> Correo Verificado
                                    </span>
                                    <span className="hp-profile-reservas-badge">
                                        <CalendarCheck size={13} /> {misReservas.length} {misReservas.length === 1 ? 'reservación' : 'reservaciones'}
                                    </span>
                                    {totalNochesAcumuladas > 0 && (
                                        <span className="hp-profile-reservas-badge">
                                            <Moon size={13} /> {totalNochesAcumuladas} {totalNochesAcumuladas === 1 ? 'noche acumulada' : 'noches acumuladas'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="hp-profile-form-body">
                            {/* Bloque 1: Información Personal y Teléfono de Contacto */}
                            <form onSubmit={handleGuardarPreferenciasPerfil} className="hp-profile-subblock">
                                <div className="hp-profile-block-heading">
                                    <User size={18} color="var(--brand-terracotta)" />
                                    <div>
                                        <h4 className="hp-profile-form-title">Información de Contacto</h4>
                                        <p className="hp-profile-block-desc">Datos asociados a tus itinerarios y notificaciones de estancia.</p>
                                    </div>
                                </div>
                                
                                <div className="hp-profile-fields-grid">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="perfil-nombre">Nombre del Titular</label>
                                        <input
                                            id="perfil-nombre"
                                            type="text"
                                            className="form-input"
                                            value={nombrePerfil}
                                            onChange={e => setNombrePerfil(e.target.value)}
                                            maxLength={120}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="perfil-email">Correo Electrónico (no editable)</label>
                                        <input id="perfil-email" type="email" className="form-input" value={user?.email || ''} disabled />
                                    </div>
                                    {/* Clase responsiva para ocupar 2 columnas en desktop y 1 en móvil */}
                                    <div className="form-group hp-profile-field-full" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="perfil-telefono">Teléfono de Contacto (10 dígitos)</label>
                                        <input
                                            id="perfil-telefono"
                                            type="tel"
                                            className="form-input"
                                            value={telefonoHuesped}
                                            onChange={e => setTelefonoHuesped(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="Ej. 5512345678"
                                            maxLength={10}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="hp-profile-contact-actions">
                                    <button type="submit" className="btn btn-primary hp-profile-save-btn" disabled={guardandoPerfil}>
                                        <CheckCircle2 size={16} /> {guardandoPerfil ? 'Guardando...' : 'Guardar datos de contacto'}
                                    </button>
                                </div>
                            </form>

                            {/* Separador sutil */}
                            <hr className="hp-profile-divider" />

                            {/* Bloque 2: Seguridad y Cambio de Contraseña */}
                            <div className="hp-profile-subblock">
                                <div className="hp-profile-block-heading">
                                    <KeyRound size={18} color="var(--brand-terracotta)" />
                                    <div>
                                        <h4 className="hp-profile-form-title">Seguridad y Cambio de Contraseña</h4>
                                        <p className="hp-profile-block-desc">
                                            Actualiza tu clave de acceso ingresando tu contraseña actual y la nueva dos veces.
                                        </p>
                                    </div>
                                </div>

                                {/* Mensajes de Confirmación o Error */}
                                {pwSuccess && (
                                    <div className="hp-profile-alert hp-profile-alert-success" role="alert">
                                        <CheckCircle2 size={18} />
                                        <div>
                                            <strong>¡Contraseña actualizada!</strong>
                                            <div>{pwSuccess}</div>
                                        </div>
                                    </div>
                                )}
                                {pwError && (
                                    <div className="hp-profile-alert hp-profile-alert-danger" role="alert">
                                        <AlertCircle size={18} />
                                        <div>
                                            <strong>Atención</strong>
                                            <div>{pwError}</div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleCambiarPassword} className="hp-profile-pw-form">
                                    <div className="form-group">
                                        <label className="form-label">Contraseña Actual</label>
                                        <div className="hp-pw-input-wrap">
                                            <input
                                                type={showPwActual ? 'text' : 'password'}
                                                className="form-input"
                                                placeholder="Ingresa tu contraseña actual"
                                                value={pwActual}
                                                onChange={e => { setPwActual(e.target.value); setPwError(''); setPwSuccess(''); }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="hp-pw-eye-btn"
                                                onClick={() => setShowPwActual(!showPwActual)}
                                                tabIndex={-1}
                                                title={showPwActual ? 'Ocultar contraseña' : 'Ver contraseña'}
                                            >
                                                {showPwActual ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="hp-profile-fields-grid" style={{ marginBottom: 0 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Nueva Contraseña (mínimo 8 caracteres)</label>
                                            <div className="hp-pw-input-wrap">
                                                <input
                                                    type={showPwNueva ? 'text' : 'password'}
                                                    className="form-input"
                                                    placeholder="Mínimo 8 caracteres"
                                                    value={pwNueva}
                                                    onChange={e => { setPwNueva(e.target.value); setPwError(''); setPwSuccess(''); }}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="hp-pw-eye-btn"
                                                    onClick={() => setShowPwNueva(!showPwNueva)}
                                                    tabIndex={-1}
                                                    title={showPwNueva ? 'Ocultar contraseña' : 'Ver contraseña'}
                                                >
                                                    {showPwNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Confirmar Nueva Contraseña</label>
                                            <div className="hp-pw-input-wrap">
                                                <input
                                                    type={showPwConfirmar ? 'text' : 'password'}
                                                    className="form-input"
                                                    placeholder="Repite tu nueva contraseña"
                                                    value={pwConfirmar}
                                                    onChange={e => { setPwConfirmar(e.target.value); setPwError(''); setPwSuccess(''); }}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="hp-pw-eye-btn"
                                                    onClick={() => setShowPwConfirmar(!showPwConfirmar)}
                                                    tabIndex={-1}
                                                    title={showPwConfirmar ? 'Ocultar contraseña' : 'Ver contraseña'}
                                                >
                                                    {showPwConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indicador de coincidencia en vivo */}
                                    {pwNueva && pwConfirmar && (
                                        <div className={`hp-pw-match-badge ${pwNueva === pwConfirmar ? 'match' : 'mismatch'}`}>
                                            {pwNueva === pwConfirmar ? (
                                                <>
                                                    <CheckCircle2 size={14} /> Las nuevas contraseñas coinciden
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle size={14} /> Las nuevas contraseñas aún no coinciden
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="hp-profile-pw-action-row">
                                        <button
                                            type="submit"
                                            className="btn btn-secondary hp-profile-pw-submit"
                                            disabled={pwCargando}
                                        >
                                            <Lock size={15} />
                                            <span>{pwCargando ? 'Actualizando contraseña...' : 'Actualizar contraseña'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Pie de tarjeta con opción de Cerrar Sesión */}
                            <div className="hp-profile-footer-strip">
                                <button
                                    type="button"
                                    className="hp-profile-logout-btn"
                                    onClick={logout}
                                >
                                    <LogOut size={16} />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    )}
                </section>
            )}

            {/* =================================================================
                VISTA 4: GUÍA DEL HUÉSPED, SERVICIOS Y POLÍTICAS (LECTURA EDITORIAL)
               ================================================================= */}
            {activeSection === 'experiencias' && (
                <section className="hp-editorial-guide">
                    {/* Cabecera Editorial */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="hp-editorial-chapter-kicker">Hospitalidad & Claridad Absoluta</div>
                        <h2 className="hp-section-title" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', marginBottom: '1rem' }}>
                            Guía del Huésped, Servicios y Políticas
                        </h2>
                        <p className="hp-editorial-lead">
                            Concebimos la hospitalidad como un ejercicio de calidez y transparencia. Aquí encontrarás cada pauta operativa, nuestros rituales de bienvenida y las garantías financieras que respaldan tu estancia.
                        </p>
                    </div>

                    {/* Capítulo 1: El Ritual de Llegada y Despedida */}
                    <article className="hp-editorial-chapter">
                        <div>
                            <div className="hp-editorial-chapter-kicker">Capítulo I</div>
                            <h3 className="hp-editorial-chapter-title">El Ritual de Llegada y Despedida</h3>
                            <p className="hp-editorial-chapter-text">
                                Diseñamos los tiempos de recepción para asegurar que tu suite sea preparada con minuciosidad artesanal, garantizando ventilación natural, ropa de cama fresca y amenidades botánicas listas.
                            </p>
                            <ul className="hp-editorial-checklist">
                                <li className="hp-editorial-check-item">
                                    <Clock size={18} className="hp-editorial-check-icon" />
                                    <div>
                                        <strong>Llegada (Check-in): A partir de las 15:00 hrs.</strong>
                                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                            Recepción abierta las 24 horas. Si llegas antes, puedes disfrutar de la alberca o dejar tu equipaje en custodia.
                                        </div>
                                    </div>
                                </li>
                                <li className="hp-editorial-check-item">
                                    <Clock size={18} className="hp-editorial-check-icon" />
                                    <div>
                                        <strong>Salida (Check-out): Hasta las 12:00 hrs.</strong>
                                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                            Permite a nuestro personal de camarería realizar la limpieza profunda de cada suite para los siguientes viajeros.
                                        </div>
                                    </div>
                                </li>
                                <li className="hp-editorial-check-item">
                                    <ShieldCheck size={18} className="hp-editorial-check-icon" />
                                    <div>
                                        <strong>Custodia de Equipaje de Cortesía.</strong>
                                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                            Resguardamos tus pertenencias sin costo alguno antes de tu Check-in o después de tu Check-out.
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <figure className="hp-editorial-card-figure">
                            <img
                                src={IMAGENES_HOTEL.recepcion.webp}
                                alt={IMAGENES_HOTEL.recepcion.alt}
                                className="hp-editorial-card-img"
                                loading="lazy"
                            />
                            <figcaption className="hp-editorial-figure-caption">
                                Lobby abierto de arquitectura costera en Hotel Paraíso · Atención continua 24/7.
                            </figcaption>
                        </figure>
                    </article>

                    {/* Capítulo 2: Modalidades y Garantías de Estancia */}
                    <article className="hp-editorial-chapter reverse">
                        <figure className="hp-editorial-card-figure">
                            <img
                                src={IMAGENES_HOTEL.restaurante.webp}
                                alt={IMAGENES_HOTEL.restaurante.alt}
                                className="hp-editorial-card-img"
                                loading="lazy"
                            />
                            <figcaption className="hp-editorial-figure-caption">
                                Terraza gastronómica y descanso frente a la costa del Pacífico.
                            </figcaption>
                        </figure>
                        <div>
                            <div className="hp-editorial-chapter-kicker">Capítulo II</div>
                            <h3 className="hp-editorial-chapter-title">Modalidades de Reservación</h3>
                            <p className="hp-editorial-chapter-text">
                                Creemos en dar certidumbre a tus planes de viaje. Ofrecemos dos modalidades claras para que asegures tu lugar sin presiones innecesarias.
                            </p>
                            <ul className="hp-editorial-checklist">
                                <li className="hp-editorial-check-item">
                                    <CalendarCheck size={18} style={{ color: 'var(--brand-terracotta)', flexShrink: 0, marginTop: 3 }} />
                                    <div>
                                        <strong>Pre-reserva (Apartado sin costo por 24 horas):</strong>
                                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                            Bloquea tu suite favorita en nuestro sistema inmediatamente. Cuentas con 24 horas para transferir tu anticipo del 50% y enviar el comprobante a administración.
                                        </div>
                                    </div>
                                </li>
                                <li className="hp-editorial-check-item">
                                    <CheckCircle2 size={18} className="hp-editorial-check-icon" />
                                    <div>
                                        <strong>Reservación Confirmada (Con 50% de anticipo):</strong>
                                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                            Una vez validado el anticipo por administración, tu fecha queda blindada con tarifa garantizada y confirmación formal en tu pase de abordar.
                                        </div>
                                    </div>
                                </li>
                                <li className="hp-editorial-check-item">
                                    <Award size={18} style={{ color: 'var(--brand-ocean)', flexShrink: 0, marginTop: 3 }} />
                                    <div>
                                        <strong>Liquidación Restante al Check-in:</strong>
                                        <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                            El 50% restante se liquida tranquilamente al momento de tu registro en recepción (efectivo, débito o crédito).
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </article>

                    {/* Capítulo 3: Transparencia en Cancelaciones y Reembolsos */}
                    <div style={{ marginBottom: '4rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="hp-editorial-chapter-kicker">Capítulo III</div>
                        <h3 className="hp-editorial-chapter-title">Política Transparente de Cancelación y Reembolso</h3>
                        <p className="hp-editorial-chapter-text" style={{ maxWidth: '65ch' }}>
                            Entendemos que los imprevistos suceden. Nuestra política de cancelación opera en tramos de tiempo justos y transparentes, devolviendo tu anticipo directamente a la CLABE bancaria de tu perfil.
                        </p>

                        <div className="hp-refund-timeline">
                            <div className="hp-refund-tier" style={{ borderTop: '3px solid #10b981' }}>
                                <div className="hp-refund-pct" style={{ color: '#059669' }}>
                                    100%
                                </div>
                                <div className="hp-refund-label">Más de 72 horas antes</div>
                                <div className="hp-refund-desc">
                                    Reembolso íntegro de la totalidad de tu anticipo si cancelas con al menos 3 días de antelación al día de llegada.
                                </div>
                            </div>

                            <div className="hp-refund-tier" style={{ borderTop: '3px solid #f59e0b' }}>
                                <div className="hp-refund-pct" style={{ color: '#b45309' }}>
                                    50%
                                </div>
                                <div className="hp-refund-label">Entre 24 y 72 horas antes</div>
                                <div className="hp-refund-desc">
                                    Reembolso de la mitad del anticipo cubierto. La otra mitad amortiza el bloqueo de habitación reservada.
                                </div>
                            </div>

                            <div className="hp-refund-tier" style={{ borderTop: '3px solid #ef4444' }}>
                                <div className="hp-refund-pct" style={{ color: '#b91c1c' }}>
                                    0%
                                </div>
                                <div className="hp-refund-label">Menos de 24 horas o No-show</div>
                                <div className="hp-refund-desc">
                                    Sin reembolso debido al compromiso de inventario y preparación exclusiva de la suite en el hotel.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Capítulo 4: Preguntas Frecuentes de Hospitalidad */}
                    <div style={{ marginBottom: '3rem' }}>
                        <div className="hp-editorial-chapter-kicker">Capítulo IV</div>
                        <h3 className="hp-editorial-chapter-title">Preguntas Frecuentes de Nuestros Huéspedes</h3>
                        <p className="hp-editorial-chapter-text" style={{ maxWidth: '65ch' }}>
                            Respuestas claras a las dudas más comunes sobre reservaciones directas, amenidades e itinerarios.
                        </p>

                        <div className="hp-editorial-faq">
                            {[
                                {
                                    q: '¿Puedo reprogramar las fechas de mi estancia sin costo adicional?',
                                    a: 'Sí. Desde tu módulo "Mis Reservaciones" puedes pulsar el botón "Cambiar fechas" en cualquier momento previo a tu llegada. La modificación no conlleva penalización alguna, quedando sujeta únicamente a la disponibilidad del hotel en las nuevas fechas.'
                                },
                                {
                                    q: '¿Qué incluye la tarifa mostrada en el catálogo de habitaciones?',
                                    a: 'Todas las tarifas publicadas ya incluyen impuestos hoteleros, acceso ilimitado a albercas, conexión Wi-Fi 6 de fibra óptica en toda la propiedad, servicio diario de camarería y coctel o bebida de bienvenida artesanal al momento del Check-in.'
                                },
                                {
                                    q: '¿Cómo confirmo una pre-reserva una vez realizado el anticipo bancario?',
                                    a: 'Es muy sencillo: transfiere el 50% del total a la cuenta oficial del hotel e informa a recepción enviando tu comprobante junto con tu número de folio (vía WhatsApp o correo electrónico). El personal administrativo validará el depósito y tu reservación pasará de inmediato a estado "Confirmada".'
                                },
                                {
                                    q: '¿Cómo interactúo con el Asistente Virtual Concierge con Inteligencia Artificial?',
                                    a: 'Nuestro Asistente Concierge (disponible en el icono flotante inferior derecho) está conectado a la base de datos viva de toda la cadena Hotel Paraíso. Puedes preguntarle por disponibilidad de suites, cotizaciones exactas por fecha, amenidades y recomendaciones de destinos.'
                                },
                                {
                                    q: '¿Se admiten cunas para bebés o camas adicionales en las habitaciones?',
                                    a: 'Sí. Al realizar tu reservación puedes solicitar cuna de bebé sin ningún costo adicional. Si requieres cama extra, puedes marcar la casilla correspondiente para que nuestra camarería la acondicione antes de tu llegada.'
                                },
                                {
                                    q: '¿Dónde se refleja mi reembolso en caso de cancelación oportuna?',
                                    a: 'El reembolso se procesa de forma directa hacia los datos bancarios (Banco y CLABE interbancaria de 18 dígitos) que tengas configurados en tu apartado de "Mi Perfil". La dispersión suele reflejarse entre 24 y 48 horas hábiles.'
                                }
                            ].map((item, idx) => {
                                const abierto = faqAbierto === idx;
                                return (
                                    <div
                                        key={idx}
                                        className={`hp-editorial-faq-item ${abierto ? 'open' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setFaqAbierto(abierto ? -1 : idx)}
                                            className="hp-editorial-faq-trigger"
                                            aria-expanded={abierto}
                                        >
                                            <span>{item.q}</span>
                                            <span style={{
                                                fontSize: '1.25rem',
                                                color: 'var(--brand-terracotta)',
                                                fontWeight: 600,
                                                transform: abierto ? 'rotate(45deg)' : 'rotate(0deg)',
                                                transition: 'transform 180ms ease-out',
                                                display: 'inline-block'
                                            }}>
                                                +
                                            </span>
                                        </button>
                                        {abierto && (
                                            <div className="hp-editorial-faq-content">
                                                {item.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* =================================================================
                MODAL 1: FICHA TÉCNICA DE HABITACIÓN (EDITORIAL & ARQUITECTÓNICA)
               ================================================================= */}
            <Modal
                isOpen={Boolean(habitacionDetalle)}
                onClose={() => setHabitacionDetalle(null)}
                title={habitacionDetalle ? habitacionDetalle.tipoHabitacion?.nombre : ''}
                subtitle={habitacionDetalle ? `${habitacionDetalle.hotel?.nombre} · Habitación ${habitacionDetalle.numero} · ${habitacionDetalle.hotel?.ciudad}` : ''}
                icon={BedDouble}
                maxWidth="620px"
            >
                {habitacionDetalle && (
                    <div className="hp-modal-ficha">
                        {/* Imagen grande en proporción 16:10 */}
                        <div className="hp-modal-ficha-media">
                            <img
                                src={obtenerImagenHabitacion(habitacionDetalle)}
                                alt={obtenerAltHabitacion(habitacionDetalle)}
                                className="hp-modal-ficha-img"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => aplicarFallbackImagen(e, obtenerPresetHabitacion(habitacionDetalle))}
                            />
                            <div className="hp-modal-ficha-badge-bar">
                                <span className="hp-modal-pill-tag">
                                    <MapPin size={12} /> {habitacionDetalle.hotel?.ciudad || 'Costa del Pacífico'}
                                </span>
                                <span className="hp-modal-pill-tag">
                                    Piso {habitacionDetalle.piso} · Suite #{habitacionDetalle.numero}
                                </span>
                            </div>
                        </div>

                        <p className="hp-modal-ficha-desc">
                            {habitacionDetalle.tipoHabitacion?.descripcion || 'Espacio amplio concebido para el descanso sereno, con luz natural abundante, acabados en madera noble, ropa de cama de lino fresco y atmósfera que dialoga con el entorno natural.'}
                        </p>

                        {/* Metadatos arquitectónicos y de estancia */}
                        <div className="hp-modal-specs-grid">
                            <div className="hp-modal-spec-item">
                                <span className="hp-modal-spec-label">Capacidad</span>
                                <span className="hp-modal-spec-value">Hasta {habitacionDetalle.tipoHabitacion?.capacidad || 2} personas</span>
                            </div>
                            <div className="hp-modal-spec-item">
                                <span className="hp-modal-spec-label">Superficie</span>
                                <span className="hp-modal-spec-value">{obtenerSuperficieHabitacion(habitacionDetalle)}</span>
                            </div>
                            <div className="hp-modal-spec-item">
                                <span className="hp-modal-spec-label">Check-in / Out</span>
                                <span className="hp-modal-spec-value">15:00 h / 12:00 h</span>
                            </div>
                            <div className="hp-modal-spec-item">
                                <span className="hp-modal-spec-label">Propiedad</span>
                                <span className="hp-modal-spec-value">{habitacionDetalle.hotel?.direccion || habitacionDetalle.hotel?.nombre}</span>
                            </div>
                        </div>

                        {/* Amenidades en lista limpia */}
                        <div className="hp-modal-amenities-wrap">
                            <h4 className="hp-modal-block-title">Amenidades en la suite</h4>
                            <div className="hp-modal-amenities-clean-list">
                                {obtenerAmenidadesHabitacion(habitacionDetalle).map((am, i) => {
                                    const Icon = am.icon;
                                    return (
                                        <div key={i} className="hp-modal-amenity-pill">
                                            <Icon size={14} className="hp-modal-amenity-icon" />
                                            <span>{am.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Disponibilidad en Ficha Técnica con confidencialidad para huéspedes */}
                        {(() => {
                            const evalDet = evaluarDisponibilidadHabitacion(habitacionDetalle, fechaEntrada, fechaSalida);
                            if (evalDet.disponibleEnFechas) {
                                return (
                                    <div className="hp-room-occupancy-banner is-free">
                                        <div className="hp-occupancy-row-main">
                                            <CheckCircle2 size={15} />
                                            <span><strong>Disponible:</strong> Lista para reservar en tus fechas de estancia.</span>
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div className="hp-room-occupancy-banner is-occupied">
                                    <div className="hp-occupancy-row-main">
                                        <Clock size={15} />
                                        <span>
                                            <strong>Próxima disponibilidad:</strong> Disponible a partir del <strong className="num">{formatearFechaOcupacion(evalDet.fechaLiberacion, true)}</strong> (Check-in 15:00 hrs).
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Política de cancelación clara */}
                        <div className="hp-modal-policy-card">
                            <ShieldCheck size={20} className="hp-modal-policy-icon" />
                            <div>
                                <h4 className="hp-modal-policy-title">Cancelación flexible garantizada</h4>
                                <p className="hp-modal-policy-text">
                                    Reembolso del 100% de cualquier anticipo cubierto si cancelas con al menos 72 horas de anticipación a la fecha de llegada (15:00 hrs). Sin penalizaciones ni cargos ocultos.
                                </p>
                            </div>
                        </div>

                        {/* Pie de ficha con tarifa por noche y botón Reservar */}
                        <div className="hp-modal-footer-bar">
                            <div className="hp-modal-price-col">
                                <span className="hp-modal-price-value num">
                                    ${Number(habitacionDetalle.tipoHabitacion?.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN <span className="hp-modal-price-unit">/ noche</span>
                                </span>
                                <span className="hp-modal-price-note">
                                    Impuestos incluidos · Tarifa preferencial directa
                                </span>
                            </div>

                            <div className="hp-modal-action-btns">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setHabitacionDetalle(null)}
                                >
                                    Cerrar ficha
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const evalDet = evaluarDisponibilidadHabitacion(habitacionDetalle, fechaEntrada, fechaSalida);
                                        const habParaModal = habitacionDetalle;
                                        setHabitacionDetalle(null);
                                        abrirModalReserva(habParaModal, !evalDet.disponibleEnFechas ? evalDet.fechaLiberacion : null);
                                    }}
                                >
                                    <span>
                                        {!evaluarDisponibilidadHabitacion(habitacionDetalle, fechaEntrada, fechaSalida).disponibleEnFechas && evaluarDisponibilidadHabitacion(habitacionDetalle, fechaEntrada, fechaSalida).fechaLiberacion
                                            ? `Disponible desde ${formatearFechaOcupacion(evaluarDisponibilidadHabitacion(habitacionDetalle, fechaEntrada, fechaSalida).fechaLiberacion)}`
                                            : 'Reservar'}
                                    </span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* =================================================================
                MODAL 2: RESERVACIÓN CON FECHAS, RESUMEN FINANCIERO Y CTA CLARO
               ================================================================= */}
            <Modal
                isOpen={Boolean(habitacionSeleccionada)}
                onClose={cerrarModalReserva}
                title={habitacionSeleccionada ? `Reservar ${habitacionSeleccionada.tipoHabitacion?.nombre}` : ''}
                subtitle={habitacionSeleccionada ? `${habitacionSeleccionada.hotel?.nombre} · Habitación ${habitacionSeleccionada.numero}` : ''}
                icon={CalendarCheck}
                maxWidth="580px"
            >
                {habitacionSeleccionada && (
                    <form className="hp-modal-reserva" onSubmit={handleConfirmarReservacionNueva}>
                        {/* Selector de Fechas y Duración */}
                        <div className="hp-reserva-dates-dock">
                            <div className="hp-reserva-dates-header">
                                <span className="hp-reserva-kicker">Fechas de estancia</span>
                                <span className="hp-reserva-duration-chip num">
                                    <Clock size={13} /> {nochesSeleccionadas} {nochesSeleccionadas === 1 ? 'noche' : 'noches'}
                                </span>
                            </div>

                            <div className="hp-reserva-grid-2col">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="hp-modal-fecha-in">
                                        <Calendar size={13} /> Llegada (Check-in 15:00)
                                    </label>
                                    <input
                                        id="hp-modal-fecha-in"
                                        type="date"
                                        className="form-input"
                                        value={fechaEntrada}
                                        min={fechaMinimaReserva}
                                        onChange={(e) => {
                                            let nueva = e.target.value;
                                            if (nueva && nueva < fechaMinimaReserva) {
                                                nueva = fechaMinimaReserva;
                                            }
                                            setFechaEntrada(nueva);
                                            setFechaSalida(sumarDiasFecha(nueva, nochesSeleccionadas));
                                        }}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="hp-modal-fecha-out">
                                        <Calendar size={13} /> Salida (Check-out 12:00)
                                    </label>
                                    <input
                                        id="hp-modal-fecha-out"
                                        type="date"
                                        className="form-input"
                                        value={fechaSalida}
                                        min={sumarDiasFecha(fechaEntrada || fechaMinimaReserva, 1)}
                                        onChange={(e) => setFechaSalida(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Validación de disponibilidad en vivo con confidencialidad para huéspedes */}
                            {(() => {
                                const evalModal = evaluarDisponibilidadHabitacion(habitacionSeleccionada, fechaEntrada, fechaSalida);
                                if (!evalModal.disponibleEnFechas) {
                                    return (
                                        <div className="hp-room-occupancy-banner is-occupied" style={{ marginTop: 12 }}>
                                            <div className="hp-occupancy-row-main">
                                                <Clock size={14} />
                                                <span>
                                                    <strong>No disponible para las fechas seleccionadas.</strong>
                                                </span>
                                            </div>
                                            <div className="hp-occupancy-row-sub" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                                <span>
                                                    Disponible a partir del <strong className="num">{formatearFechaOcupacion(evalModal.fechaLiberacion, true)}</strong> (Check-in 15:00 hrs).
                                                </span>
                                                {evalModal.fechaLiberacion && (
                                                    <button
                                                        type="button"
                                                        className="hp-occupancy-jump-btn"
                                                        onClick={() => {
                                                            const dur = Math.max(nochesSeleccionadas || 2, 1);
                                                            setFechaMinimaReserva(evalModal.fechaLiberacion);
                                                            setFechaEntrada(evalModal.fechaLiberacion);
                                                            setFechaSalida(sumarDiasFecha(evalModal.fechaLiberacion, dur));
                                                        }}
                                                    >
                                                        Elegir desde {formatearFechaOcupacion(evalModal.fechaLiberacion, true)}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="hp-room-occupancy-banner is-free" style={{ marginTop: 12 }}>
                                        <div className="hp-occupancy-row-main">
                                            <CheckCircle2 size={14} />
                                            <span>
                                                <strong>Fechas disponibles:</strong> Del <span className="num">{formatearFechaOcupacion(fechaEntrada, true)}</span> al <span className="num">{formatearFechaOcupacion(fechaSalida, true)}</span>.
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Desglose Financiero con .num (incluye recargo de temporada alta +25% en Jul, Ago y Dic) */}
                        {(() => {
                            const precioNoche = Number(habitacionSeleccionada.tipoHabitacion?.precioBase || 0);
                            const calc = calcularTarifaPortal(precioNoche, fechaEntrada, fechaSalida, cunaExtra, camaExtra);
                            const totalEstimado = calc.total;
                            const anticipo = calc.anticipo;

                            return (
                                <div className="hp-reserva-pricing-breakdown">
                                    <div className="hp-reserva-price-row">
                                        <span>Tarifa por noche ({calc.noches} {calc.noches === 1 ? 'noche' : 'noches'})</span>
                                        <span className="num">${precioNoche.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                                    </div>
                                    {calc.nochesTemporadaAlta > 0 && (
                                        <div className="hp-reserva-price-row">
                                            <span>Recargo temporada alta (+25% · {calc.nochesTemporadaAlta} {calc.nochesTemporadaAlta === 1 ? 'noche' : 'noches'})</span>
                                            <span className="hp-reserva-included-tag">Aplicado</span>
                                        </div>
                                    )}
                                    <div className="hp-reserva-price-row">
                                        <span>Impuestos y servicios hoteleros</span>
                                        <span className="hp-reserva-included-tag">Incluidos</span>
                                    </div>
                                    <div className="hp-reserva-price-row total">
                                        <span>Total de la estancia</span>
                                        <span className="num">${totalEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                                    </div>
                                    {modalidadReserva === 'CONFIRMADA' ? (
                                        <div className="hp-reserva-anticipo-row">
                                            <span>Anticipo del 50% requerido hoy:</span>
                                            <strong className="num">${anticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
                                        </div>
                                    ) : (
                                        <div className="hp-reserva-prereserva-note">
                                            Aparta ahora sin desembolso. Tu reserva queda garantizada por 24 horas para liquidar.
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Campos de Huéspedes y Teléfono */}
                        <div className="hp-reserva-grid-2col">
                            <div className="form-group">
                                <label className="form-label" htmlFor="hp-modal-huespedes">
                                    <Users size={13} /> Adultos (Máx. {habitacionSeleccionada.tipoHabitacion?.capacidad || 2})
                                </label>
                                <select
                                    id="hp-modal-huespedes"
                                    className="form-select"
                                    value={adultosReserva}
                                    onChange={e => setAdultosReserva(Number(e.target.value))}
                                >
                                    {Array.from({ length: habitacionSeleccionada.tipoHabitacion?.capacidad || 2 }, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'adulto' : 'adultos'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="hp-modal-tel">
                                    <Phone size={13} /> Teléfono de contacto *
                                </label>
                                <input
                                    id="hp-modal-tel"
                                    type="tel"
                                    className="form-input"
                                    placeholder="Ej. 55 1234 5678"
                                    value={telefonoHuesped}
                                    onChange={e => setTelefonoHuesped(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Modalidad informativa */}
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            fontSize: '0.82rem',
                            color: '#475569',
                            lineHeight: 1.4
                        }}>
                            <Clock size={18} style={{ color: 'var(--brand-terracotta)', flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <strong style={{ color: '#0f172a', display: 'block', marginBottom: 2 }}>
                                    Apartado con Pre-reserva (Vigencia de 24 horas)
                                </strong>
                                Tu suite quedará bloqueada en el sistema. Para confirmar definitivamente tu estancia, deberás transferir el anticipo del 50% y enviar el comprobante a recepción para su validación administrativa.
                            </div>
                        </div>

                        {/* Opciones de confort */}
                        <div className="hp-reserva-checkboxes-row">
                            <label className="hp-reserva-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={cunaExtra}
                                    onChange={e => setCunaExtra(e.target.checked)}
                                />
                                <span>Solicitar cuna para bebé (sin cargo adicional)</span>
                            </label>
                            <label className="hp-reserva-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={camaExtra}
                                    onChange={e => setCamaExtra(e.target.checked)}
                                />
                                <span>Solicitar cama extra</span>
                            </label>
                        </div>

                        {/* Peticiones especiales */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="hp-modal-notas">
                                Notas o peticiones de descanso (opcional)
                            </label>
                            <input
                                id="hp-modal-notas"
                                type="text"
                                className="form-input"
                                placeholder="Ej. Almohadas de pluma, piso alto, llegada vespertina..."
                                value={notasReserva}
                                onChange={e => setNotasReserva(e.target.value)}
                            />
                        </div>

                        {/* Botones de acción del Modal */}
                        <div className="hp-reserva-actions">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={cerrarModalReserva}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={procesandoReserva || !evaluarDisponibilidadHabitacion(habitacionSeleccionada, fechaEntrada, fechaSalida).disponibleEnFechas}
                            >
                                {procesandoReserva ? (
                                    'Registrando estancia...'
                                ) : (
                                    <>
                                        <span>
                                            Apartar suite por {nochesSeleccionadas} {nochesSeleccionadas === 1 ? 'noche' : 'noches'}
                                        </span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* =================================================================
                MODAL 3: PASE DE ABORDAR / COMPROBANTE DIGITAL DE RESERVACIÓN
               ================================================================= */}
            <Modal
                isOpen={Boolean(voucherReserva)}
                onClose={() => setVoucherReserva(null)}
                title={voucherReserva ? `Pase de Abordar · ${voucherReserva.folio || `#${voucherReserva.idReserva}`}` : ''}
                subtitle={voucherReserva ? `${voucherReserva.habitacion?.hotel?.nombre || 'Hotel Paraíso'} · ${voucherReserva.habitacion?.hotel?.ciudad || 'México'}` : ''}
                icon={FileText}
                maxWidth="480px"
            >
                {voucherReserva && (
                    <div style={{ animation: 'hpPageEnter 200ms ease-out' }}>
                        {/* Cabecera del Pase de Abordar */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--brand-ocean-dark) 0%, var(--brand-ocean) 100%)',
                            color: '#fff', padding: '18px 20px', borderRadius: 14, marginBottom: 16,
                            border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 20px rgba(15, 35, 56, 0.25)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ fontSize: '0.72rem', color: '#fde68a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {voucherReserva.habitacion?.hotel?.nombre} · {voucherReserva.habitacion?.hotel?.ciudad}
                                </div>
                                <EstadoBadge estado={voucherReserva.estado} />
                            </div>
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 600, marginTop: 2 }}>
                                {voucherReserva.habitacion?.tipoHabitacion?.nombre} — Habitación <span className="num">{voucherReserva.habitacion?.numero}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: 4 }}>
                                Huésped titular: <strong style={{ color: '#fff' }}>{user?.nombre}</strong> ({user?.email})
                            </div>
                        </div>

                        {/* Itinerario Tabular */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem', marginBottom: 16 }}>
                            <div style={{ background: 'var(--brand-sand-light)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', fontWeight: 700, letterSpacing: '0.06em' }}>CHECK-IN (15:00 H)</span>
                                <strong className="num" style={{ fontSize: '1rem', color: 'var(--brand-ocean)' }}>{voucherReserva.fechaEntrada}</strong>
                            </div>
                            <div style={{ background: 'var(--brand-sand-light)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', fontWeight: 700, letterSpacing: '0.06em' }}>CHECK-OUT (12:00 H)</span>
                                <strong className="num" style={{ fontSize: '1rem', color: 'var(--brand-ocean)' }}>{voucherReserva.fechaSalida}</strong>
                            </div>
                            <div style={{ background: 'var(--brand-sand-light)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', fontWeight: 700, letterSpacing: '0.06em' }}>TOTAL DE ESTANCIA</span>
                                <strong className="num" style={{ fontSize: '1.1rem', color: 'var(--brand-ocean)' }}>${Number(voucherReserva.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</strong>
                            </div>
                            <div style={{ background: 'var(--brand-sand-light)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', fontWeight: 700, letterSpacing: '0.06em' }}>ANTICIPO REGISTRADO</span>
                                <strong className="num" style={{ fontSize: '1.1rem', color: Number(voucherReserva.anticipo || 0) > 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    ${Number(voucherReserva.anticipo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                </strong>
                            </div>
                        </div>

                        {voucherReserva.estado === 'Cancelada' && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: 'var(--color-error-bg, #fee2e2)',
                                border: '1px solid var(--color-error-border, #fecaca)',
                                color: 'var(--color-error, #b91c1c)',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                marginBottom: 14,
                                textAlign: 'center'
                            }}>
                                {voucherReserva.observaciones ? voucherReserva.observaciones : 'Esta reservación ha sido cancelada.'}
                            </div>
                        )}

                        {/* Código de barras decorativo de embarque */}
                        <div style={{
                            background: 'var(--bg-surface)',
                            border: '1px dashed var(--border-default)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            textAlign: 'center',
                            marginBottom: 16
                        }}>
                            <div style={{
                                letterSpacing: '0.35em',
                                fontSize: '1.1rem',
                                color: 'var(--text-secondary)',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                marginBottom: 4
                            }}>
                                ║▌║▌║█│▌▌│█║▌║▌║
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                                CLAVE DIGITAL: <span className="num">{voucherReserva.folio || `#${voucherReserva.idReserva}`}</span> · HOTEL PARAÍSO
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setVoucherReserva(null)}>
                                Cerrar
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => imprimirComprobanteReserva(voucherReserva)}
                            >
                                <Printer size={15} />
                                <span>Imprimir comprobante PDF</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* =================================================================
                MODAL 3B: INSTRUCCIONES PARA CONFIRMAR PRE-RESERVA CON ANTICIPO
               ================================================================= */}
            <Modal
                isOpen={Boolean(reservaInstruccionesPago)}
                onClose={() => setReservaInstruccionesPago(null)}
                title={reservaInstruccionesPago ? `Confirmar Pre-reserva · ${reservaInstruccionesPago.folio || `#${reservaInstruccionesPago.idReserva}`}` : ''}
                subtitle="Validación de anticipo del 50% para garantizar tu estancia"
                icon={ShieldCheck}
                maxWidth="460px"
            >
                {reservaInstruccionesPago && (() => {
                    const total = Number(reservaInstruccionesPago.total || reservaInstruccionesPago.costoTotal || 0);
                    const anticipo = Number(reservaInstruccionesPago.anticipoRequerido || (total * 0.5));
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{
                                background: '#eef6f1',
                                border: '1px solid #c6e0d0',
                                borderRadius: 12,
                                padding: '14px 16px'
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#2d5a43', letterSpacing: '0.04em' }}>
                                    Anticipo requerido (50%)
                                </div>
                                <div className="num" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16324f', marginTop: 2 }}>
                                    ${anticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 2 }}>
                                    Total de la estancia: <strong className="num">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
                                </div>
                            </div>

                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '12px 14px',
                                fontSize: '0.82rem',
                                color: '#334155',
                                lineHeight: 1.55
                            }}>
                                <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>
                                    Pasos para confirmar tu suite:
                                </strong>
                                <div>1. Realiza tu transferencia bancaria o pago en mostrador por el <strong>50% de anticipo</strong> indicando tu folio <strong className="num">{reservaInstruccionesPago.folio}</strong>.</div>
                                <div style={{ marginTop: 4 }}>2. Envía tu comprobante a recepción; nuestro personal validará el depósito y actualizará tu estado a <strong>Confirmada</strong>.</div>
                                <div style={{ marginTop: 4 }}>3. El 50% restante se liquida al realizar tu Check-in (15:00 hrs).</div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => imprimirComprobanteReserva(reservaInstruccionesPago)}
                                >
                                    <Printer size={15} />
                                    <span>Imprimir ficha PDF</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setReservaInstruccionesPago(null)}
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* =================================================================
                MODAL 4: REPROGRAMAR FECHAS
               ================================================================= */}
            <Modal
                isOpen={Boolean(reservaReprogramar)}
                onClose={() => { setReservaReprogramar(null); setErrorReprogramar(''); }}
                title={reservaReprogramar ? `Cambiar fechas (${reservaReprogramar.folio || '#' + reservaReprogramar.idReserva})` : ''}
                subtitle="Selecciona tus nuevas fechas de llegada y salida"
                icon={Calendar}
                maxWidth="440px"
            >
                {reservaReprogramar && (
                    <form onSubmit={handleGuardarNuevasFechas} className="modal-form">
                        {errorReprogramar && (
                            <div className="alert alert-error">
                                <Info size={16} />
                                <span>{errorReprogramar}</span>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Nueva Fecha de Llegada *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={nuevaEntrada}
                                onChange={e => setNuevaEntrada(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nueva Fecha de Salida *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={nuevaSalida}
                                onChange={e => setNuevaSalida(e.target.value)}
                                required
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setReservaReprogramar(null)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Guardar Nuevas Fechas
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* =================================================================
                MODAL 5: CANCELAR RESERVACIÓN CON POLÍTICA Y MONTO DE REEMBOLSO
               ================================================================= */}
            <Modal
                isOpen={Boolean(reservaACancelar)}
                onClose={() => !cancelandoReserva && setReservaACancelar(null)}
                title={reservaACancelar ? `Cancelar reservación — ${reservaACancelar.folio || '#' + reservaACancelar.idReserva}` : ''}
                subtitle="Revisión de política de cancelación y reembolso"
                icon={XCircle}
                maxWidth="480px"
            >
                {reservaACancelar && (
                    <form onSubmit={handleConfirmarCancelacion} className="modal-form">
                        {errorCancelacion && (
                            <div className="alert alert-error">
                                <Info size={16} />
                                <span>{errorCancelacion}</span>
                            </div>
                        )}

                        <div style={{
                            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                            borderRadius: 12, padding: '12px 14px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6
                        }}>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Política de Reembolso:</strong>
                            <div>&bull; 72 h o más antes del check-in: <b>100% de reembolso</b></div>
                            <div>&bull; Entre 48 y 72 h antes del check-in: <b>50% de reembolso</b></div>
                            <div>&bull; Menos de 48 h antes del check-in: <b>Sin reembolso (0%)</b></div>
                        </div>

                        {cargandoReembolso ? (
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                                Calculando monto de reembolso...
                            </div>
                        ) : infoReembolso && (
                            <div style={{
                                background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
                                borderRadius: 12, padding: '12px 14px', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6
                            }}>
                                <div>Anticipo pagado: <b>${Number(reservaACancelar.anticipo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</b></div>
                                <div>
                                    Reembolso según política: <b>{infoReembolso.porcentaje}%</b> &rarr;{' '}
                                    <b style={{ color: 'var(--color-success)' }}>
                                        ${Number(infoReembolso.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                    </b>
                                </div>
                                {Number(infoReembolso.monto) > 0 && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-warning)', marginTop: 4 }}>
                                        El reembolso se dispersará a la cuenta bancaria indicada a continuación.
                                    </div>
                                )}
                            </div>
                        )}

                        {infoReembolso && Number(infoReembolso.monto) > 0 && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Titular de la cuenta *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        value={formReembolso.titular}
                                        onChange={(e) => setFormReembolso({ ...formReembolso, titular: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Banco *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        value={formReembolso.banco}
                                        onChange={(e) => setFormReembolso({ ...formReembolso, banco: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CLABE (18 dígitos) *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        maxLength={18}
                                        inputMode="numeric"
                                        value={formReembolso.clabe}
                                        onChange={(e) => setFormReembolso({ ...formReembolso, clabe: e.target.value.replace(/\D/g, '') })}
                                    />
                                </div>
                            </>
                        )}

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setReservaACancelar(null)}
                                disabled={cancelandoReserva}
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                className="btn btn-danger"
                                disabled={cancelandoReserva || cargandoReembolso || !infoReembolso}
                            >
                                <XCircle size={16} />
                                <span>{cancelandoReserva ? 'Cancelando...' : 'Confirmar cancelación'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* =================================================================
                MODAL: ACCESO EXCLUSIVO / INICIAR SESIÓN PARA RESERVAR
               ================================================================= */}
            <Modal
                isOpen={Boolean(modalRequiereSesion)}
                onClose={() => setModalRequiereSesion(null)}
                title={modalRequiereSesion?.titulo || 'Inicia sesión para reservar'}
                subtitle={modalRequiereSesion?.subtitulo || 'Hotel Paraíso · Costa & Hospitalidad'}
                icon={Lock}
                maxWidth="480px"
            >
                {modalRequiereSesion && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
                        {modalRequiereSesion.habitacion && (
                            <div className="hp-auth-modal-suite-preview">
                                <img
                                    src={obtenerImagenHabitacion(modalRequiereSesion.habitacion)}
                                    alt={obtenerAltHabitacion(modalRequiereSesion.habitacion)}
                                    className="hp-auth-modal-suite-thumb"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => aplicarFallbackImagen(e, obtenerPresetHabitacion(modalRequiereSesion.habitacion))}
                                />
                                <div className="hp-auth-modal-suite-info">
                                    <div className="hp-auth-modal-suite-name">
                                        {modalRequiereSesion.habitacion.tipoHabitacion?.nombre}
                                    </div>
                                    <div className="hp-auth-modal-suite-loc">
                                        <MapPin size={12} /> {modalRequiereSesion.habitacion.hotel?.nombre} · {modalRequiereSesion.habitacion.hotel?.ciudad}
                                    </div>
                                    <div className="hp-auth-modal-suite-price">
                                        ${Number(modalRequiereSesion.habitacion.tipoHabitacion?.precioBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN <span className="hp-price-unit">/ noche</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="hp-auth-modal-guarantees-card">
                            <div className="hp-auth-modal-guarantee-row">
                                <CheckCircle2 size={16} className="hp-guarantee-icon" />
                                <span><strong>Apartado garantizado por 24 horas</strong> sin cobro inmediato con folio oficial.</span>
                            </div>
                            <div className="hp-auth-modal-guarantee-row">
                                <CheckCircle2 size={16} className="hp-guarantee-icon" />
                                <span><strong>Asistencia personalizada 24/7</strong> con nuestro Concierge IA y gestión de itinerarios.</span>
                            </div>
                        </div>

                        <div className="hp-auth-modal-footer-distributed">
                            <div className="hp-auth-modal-btn-row">
                                <button
                                    type="button"
                                    className="btn btn-secondary hp-auth-action-btn"
                                    onClick={() => {
                                        setModalRequiereSesion(null);
                                        navigate('/registro');
                                    }}
                                >
                                    <UserPlus size={15} />
                                    <span>Crear cuenta</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary hp-auth-action-btn"
                                    onClick={() => {
                                        setModalRequiereSesion(null);
                                        navigate('/login');
                                    }}
                                >
                                    <LogIn size={15} />
                                    <span>Iniciar sesión</span>
                                    <ArrowRight size={15} />
                                </button>
                            </div>
                            <button
                                type="button"
                                className="hp-auth-modal-cancel-link"
                                onClick={() => setModalRequiereSesion(null)}
                            >
                                Seguir explorando sin iniciar sesión
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
