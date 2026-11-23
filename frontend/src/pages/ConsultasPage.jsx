import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Zap, AlertCircle, RefreshCw, FileSpreadsheet, Play
} from 'lucide-react';
import { API_BASE_URL, getStoredToken, clearAuthSession, getHoteles } from '../api/hotelApi';
import { useAuth } from '../context/AuthContext';
import './ConsultasPage.css';

const LISTA_ATAJOS = [
    // Hoteles
    { id: 1, categoria: 'Hoteles', nombre: 'Directorio general de hoteles', endpoint: '/api/consultas/hoteles', descripcion: 'Sedes, ubicaciones y contacto de la cadena.', tipoParametro: null },
    { id: 2, categoria: 'Hoteles', nombre: 'Hoteles operando', endpoint: '/api/consultas/hoteles/activos', descripcion: 'Únicamente propiedades activas en operación.', tipoParametro: null },
    { id: 3, categoria: 'Hoteles', nombre: 'Hoteles por ciudad', endpoint: '/api/consultas/hoteles/ciudad/{ciudad}', paramNombre: 'ciudad', descripcion: 'Propiedades ubicadas en una ciudad específica.', tipoParametro: 'ciudad' },
    { id: 4, categoria: 'Hoteles', nombre: 'Total de habitaciones por hotel', endpoint: '/api/consultas/hoteles/total-habitaciones', descripcion: 'Distribución de cuartos registrados por sede.', tipoParametro: null },
    { id: 5, categoria: 'Hoteles', nombre: 'Disponibles por hotel', endpoint: '/api/consultas/hoteles/habitaciones-disponibles-count', descripcion: 'Conteo de habitaciones listas por propiedad.', tipoParametro: null },

    // Tarifas y Categorías
    { id: 6, categoria: 'Tarifas', nombre: 'Catálogo de categorías', endpoint: '/api/consultas/tipos', descripcion: 'Categorías registradas, capacidad y tarifa base.', tipoParametro: null },
    { id: 7, categoria: 'Tarifas', nombre: 'Categorías para 2 huéspedes', endpoint: '/api/consultas/tipos/capacidad-2', descripcion: 'Categorías configuradas para 2 personas.', tipoParametro: null },
    { id: 8, categoria: 'Tarifas', nombre: 'Tarifa promedio por noche', endpoint: '/api/consultas/tipos/precio-promedio', descripcion: 'Costo promedio estándar por noche en la cadena.', tipoParametro: null, soloGerente: true, unidad: 'MXN' },
    { id: 9, categoria: 'Tarifas', nombre: 'Categorías con tarifa menor a...', endpoint: '/api/consultas/tipos/menor-que/{precio}', paramNombre: 'precio', descripcion: 'Categorías con tarifa menor o igual al monto elegido.', tipoParametro: 'precio', paramDefault: '1500', soloGerente: true },
    { id: 10, categoria: 'Tarifas', nombre: 'Categorías con tarifa mayor a...', endpoint: '/api/consultas/tipos/mayor-que/{precio}', paramNombre: 'precio', descripcion: 'Categorías con tarifa superior al monto elegido.', tipoParametro: 'precio', paramDefault: '1200', soloGerente: true },
    { id: 11, categoria: 'Tarifas', nombre: 'Categoría más económica', endpoint: '/api/consultas/tipos/mas-barato', descripcion: 'Categoría con la tarifa base más accesible.', tipoParametro: null, soloGerente: true },
    { id: 12, categoria: 'Tarifas', nombre: 'Categoría más exclusiva', endpoint: '/api/consultas/tipos/mas-caro', descripcion: 'Suite con la tarifa base más elevada.', tipoParametro: null, soloGerente: true },
    { id: 13, categoria: 'Tarifas', nombre: 'Capacidad máxima por suite', endpoint: '/api/consultas/tipos/capacidad-maxima', descripcion: 'Mayor número de ocupantes en una unidad.', tipoParametro: null, unidad: 'huéspedes' },
    { id: 14, categoria: 'Tarifas', nombre: 'Total de categorías registradas', endpoint: '/api/consultas/tipos/total-count', descripcion: 'Conteo total de tipos de habitación.', tipoParametro: null, unidad: 'categorías' },

    // Habitaciones
    { id: 15, categoria: 'Habitaciones', nombre: 'Habitaciones disponibles hoy', endpoint: '/api/consultas/habitaciones/disponibles', descripcion: 'Unidades libres y listas para asignar.', tipoParametro: null },
    { id: 16, categoria: 'Habitaciones', nombre: 'Habitaciones ocupadas', endpoint: '/api/consultas/habitaciones/ocupadas', descripcion: 'Unidades con huéspedes en casa.', tipoParametro: null },
    { id: 17, categoria: 'Habitaciones', nombre: 'Habitaciones en mantenimiento', endpoint: '/api/consultas/habitaciones/mantenimiento', descripcion: 'Unidades fuera de servicio temporal.', tipoParametro: null },
    { id: 18, categoria: 'Habitaciones', nombre: 'Total en mantenimiento', endpoint: '/api/consultas/habitaciones/mantenimiento-count', descripcion: 'Conteo de habitaciones en mantenimiento.', tipoParametro: null, unidad: 'habitaciones' },
    { id: 19, categoria: 'Habitaciones', nombre: 'Habitaciones por hotel', endpoint: '/api/consultas/habitaciones/hotel/{nombreHotel}', paramNombre: 'nombreHotel', descripcion: 'Inventario de cuartos de la sede elegida.', tipoParametro: 'hotel' },
    { id: 20, categoria: 'Habitaciones', nombre: 'Disponibles en un hotel', endpoint: '/api/consultas/habitaciones/disponibles/{nombreHotel}', paramNombre: 'nombreHotel', descripcion: 'Cuartos libres en la sede seleccionada.', tipoParametro: 'hotel' },
    { id: 21, categoria: 'Habitaciones', nombre: 'Habitaciones familiares (4 pers.)', endpoint: '/api/consultas/habitaciones/capacidad-4', descripcion: 'Unidades con capacidad para 4 huéspedes.', tipoParametro: null },
    { id: 22, categoria: 'Habitaciones', nombre: 'Habitaciones con tipo y tarifa', endpoint: '/api/consultas/habitaciones/tipo-precio', descripcion: 'Inventario con categoría y tarifa asignada.', tipoParametro: null, soloGerente: true },
    { id: 23, categoria: 'Habitaciones', nombre: 'Habitaciones por piso', endpoint: '/api/consultas/habitaciones/piso/{piso}', paramNombre: 'piso', descripcion: 'Cuartos situados en el nivel elegido.', tipoParametro: 'piso', paramDefault: '1' },
    { id: 24, categoria: 'Habitaciones', nombre: 'Habitaciones por hotel y piso', endpoint: '/api/consultas/habitaciones/hotel/{nombreHotel}/piso/{piso}', paramNombre: 'nombreHotel', paramNombre2: 'piso', paramDefault2: '1', descripcion: 'Filtra cuartos por sede y nivel.', tipoParametro: 'hotel_piso' },
    { id: 25, categoria: 'Habitaciones', nombre: 'Total de habitaciones', endpoint: '/api/consultas/habitaciones/total-count', descripcion: 'Inventario total de cuartos de la cadena.', tipoParametro: null, unidad: 'habitaciones' },
    { id: 26, categoria: 'Habitaciones', nombre: 'Ingreso potencial por noche', endpoint: '/api/consultas/habitaciones/ingreso-potencial', descripcion: 'Ingreso máximo con 100% de ocupación diaria.', tipoParametro: null, soloGerente: true, unidad: 'MXN' },
    { id: 27, categoria: 'Habitaciones', nombre: 'Resumen por estado', endpoint: '/api/consultas/habitaciones/resumen-estados', descripcion: 'Conteo agrupado por estado operativo.', tipoParametro: null },
    { id: 28, categoria: 'Habitaciones', nombre: 'Habitaciones por ciudad', endpoint: '/api/consultas/habitaciones/ciudad/{ciudad}', paramNombre: 'ciudad', descripcion: 'Cuartos de hoteles en la ciudad elegida.', tipoParametro: 'ciudad' },
    { id: 29, categoria: 'Habitaciones', nombre: 'Disponibles ordenadas por tarifa', endpoint: '/api/consultas/habitaciones/disponibles/ordenadas-por-precio', descripcion: 'Cuartos libres de menor a mayor precio.', tipoParametro: null, soloGerente: true }
];

const ETIQUETAS_COL = {
    nombre: 'Nombre',
    ciudad: 'Ciudad',
    direccion: 'Dirección',
    telefono: 'Teléfono',
    email: 'Correo',
    activo: 'Estado',
    numero: 'Habitación',
    hotel: 'Propiedad',
    tipoHabitacion: 'Categoría',
    piso: 'Piso',
    estado: 'Estado',
    capacidad: 'Capacidad',
    descripcion: 'Descripción',
    precioBase: 'Tarifa / Noche',
    precio: 'Tarifa / Noche',
    total: 'Total',
    cantidad: 'Cantidad',
    disponibles: 'Disponibles'
};

const CLAVES_OCULTAS = new Set([
    'idHotel', 'idHabitacion', 'idTipo', 'idReservaActiva', 'imagenUrl',
    'latitud', 'longitud', 'tagEditorial', 'periodosOcupados', 'costoDiaExtra',
    'diaExtraDisponible', 'estadoReservaActiva', 'fechaOcupacionFin',
    'fechaOcupacionInicio', 'folioActivo', 'nuevaFechaDesocupacion', 'ocupadaHoy'
]);

function esColumnaMonetaria(col) {
    const c = String(col || '').toLowerCase();
    return c.includes('precio') || c.includes('tarifa') || c.includes('ingreso') || c.includes('monto');
}

function etiquetaColumna(col) {
    if (ETIQUETAS_COL[col]) return ETIQUETAS_COL[col];
    return String(col || '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim();
}

function obtenerColumnasLimpias(filas, isAdmin) {
    if (!Array.isArray(filas) || filas.length === 0) return [];
    const sample = filas[0] || {};
    const keys = Object.keys(sample);

    // Proyección limpia para entidades conocidas (evita 12–16 columnas técnicas crudas)
    if ('idHotel' in sample || ('ciudad' in sample && 'direccion' in sample)) {
        return ['nombre', 'ciudad', 'direccion', 'telefono', 'activo'].filter(k => k in sample);
    }
    if ('idHabitacion' in sample || ('numero' in sample && 'piso' in sample)) {
        return ['numero', 'hotel', 'tipoHabitacion', 'piso', 'estado'].filter(k => k in sample);
    }
    if ('idTipo' in sample || ('capacidad' in sample && 'precioBase' in sample)) {
        return ['nombre', 'capacidad', 'descripcion', ...(!isAdmin ? ['precioBase'] : [])].filter(k => k in sample);
    }

    return keys.filter(k => !CLAVES_OCULTAS.has(k) && (!isAdmin || !esColumnaMonetaria(k)));
}

function textoPlanoCelda(col, val, isAdmin) {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'boolean') return val ? 'Activo' : 'Inactivo';
    if (typeof val === 'object') {
        if (val.nombre && val.precioBase !== undefined) {
            return isAdmin ? val.nombre : `${val.nombre} ($${Number(val.precioBase).toFixed(2)})`;
        }
        if (val.nombre) return val.nombre;
        return JSON.stringify(val);
    }
    if (typeof val === 'number' && esColumnaMonetaria(col)) {
        return Number(val).toFixed(2);
    }
    return String(val);
}

function badgeEstadoClase(val) {
    const s = String(val || '').toLowerCase();
    if (s === 'activo' || s === 'disponible') return 'con-badge con-badge-palm';
    if (s === 'ocupada' || s === 'confirmada') return 'con-badge con-badge-ocean';
    if (s === 'mantenimiento' || s === 'pre-reserva') return 'con-badge con-badge-terra';
    return 'con-badge con-badge-danger';
}

export default function ConsultasPage() {
    const { user, isAdmin } = useAuth();
    const [categoriaActual, setCategoriaActual] = useState('TODAS');
    const [busqueda, setBusqueda] = useState('');
    const [atajoSeleccionado, setAtajoSeleccionado] = useState(LISTA_ATAJOS[0]);

    const [hoteles, setHoteles] = useState([]);
    const [param1, setParam1] = useState('');
    const [param2, setParam2] = useState('');

    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getHoteles().then(data => {
            if (Array.isArray(data)) setHoteles(data);
        }).catch(() => {});
    }, []);

    const ciudadesDisponibles = useMemo(() => {
        const set = new Set(hoteles.map(h => h.ciudad).filter(Boolean));
        const arr = Array.from(set).sort();
        return arr.length > 0 ? arr : ['Cancún', 'Ciudad de México', 'Atlacomulco', 'Guadalajara'];
    }, [hoteles]);

    const hotelesDisponibles = useMemo(() => {
        const set = new Set(hoteles.map(h => h.nombre).filter(Boolean));
        const arr = Array.from(set).sort();
        return arr.length > 0 ? arr : ['Hotel Paraíso', 'Hotel UAEM', 'Hotel Los Arcos'];
    }, [hoteles]);

    const pisosDisponibles = useMemo(() => [1, 2, 3, 4, 5], []);
    const preciosSugeridos = useMemo(() => ['800', '1000', '1200', '1500', '2000', '2500', '3000'], []);

    const buildUrl = useCallback((atajo, p1, p2) => {
        let ep = atajo.endpoint;
        if (atajo.tipoParametro === 'hotel_piso') {
            ep = ep.replace(`{${atajo.paramNombre}}`, encodeURIComponent((p1 || '').trim()))
                   .replace(`{${atajo.paramNombre2}}`, encodeURIComponent((p2 || '').trim()));
        } else if (atajo.tipoParametro) {
            ep = ep.replace(`{${atajo.paramNombre}}`, encodeURIComponent((p1 || '').trim()));
        }
        const cleanEp = ep.startsWith('/api/') ? ep.substring(4) : ep;
        return `${API_BASE_URL}${cleanEp}`;
    }, []);

    const ejecutarAtajo = useCallback(async (atajo, p1, p2) => {
        setCargando(true);
        setError('');
        try {
            const url = buildUrl(atajo, p1, p2);
            const token = getStoredToken();
            const res = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.status === 401) {
                clearAuthSession('Tu sesión ha expirado. Inicia sesión nuevamente.');
                throw new Error('Tu sesión ha expirado.');
            }
            if (!res.ok) {
                throw new Error(`No se pudo obtener la información (${res.status})`);
            }
            const data = await res.json();
            setResultado(data);
        } catch (err) {
            setError(err.message || 'No fue posible conectar con el servidor.');
            setResultado(null);
        } finally {
            setCargando(false);
        }
    }, [buildUrl]);

    useEffect(() => {
        ejecutarAtajo(LISTA_ATAJOS[0], '', '');
    }, [ejecutarAtajo]);

    const seleccionarAtajo = (a) => {
        setAtajoSeleccionado(a);
        let p1 = '';
        let p2 = '';
        if (a.tipoParametro === 'ciudad') p1 = ciudadesDisponibles[0] || 'Cancún';
        else if (a.tipoParametro === 'hotel') p1 = hotelesDisponibles[0] || 'Hotel Paraíso';
        else if (a.tipoParametro === 'piso') p1 = '1';
        else if (a.tipoParametro === 'hotel_piso') {
            p1 = hotelesDisponibles[0] || 'Hotel Paraíso';
            p2 = '1';
        } else if (a.tipoParametro === 'precio') p1 = a.paramDefault || '1500';
        setParam1(p1);
        setParam2(p2);
        ejecutarAtajo(a, p1, p2);
    };

    const atajosPermitidos = useMemo(
        () => LISTA_ATAJOS.filter(a => !(isAdmin && a.soloGerente)),
        [isAdmin]
    );

    const atajosFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return atajosPermitidos.filter(a => {
            const matchesCat = categoriaActual === 'TODAS' || a.categoria === categoriaActual;
            const matchesQuery = !q || a.nombre.toLowerCase().includes(q) || a.descripcion.toLowerCase().includes(q);
            return matchesCat && matchesQuery;
        });
    }, [atajosPermitidos, categoriaActual, busqueda]);

    const exportarResultadoCsv = () => {
        if (resultado === null || resultado === undefined) return;
        let rows = [];
        if (Array.isArray(resultado) && resultado.length > 0) {
            const cols = obtenerColumnasLimpias(resultado, isAdmin);
            rows = [
                cols.map(etiquetaColumna),
                ...resultado.map(fila => cols.map(c => textoPlanoCelda(c, fila[c], isAdmin)))
            ];
        } else if (typeof resultado === 'object') {
            rows = [
                ['Concepto', 'Valor'],
                ...Object.entries(resultado)
                    .filter(([k]) => !CLAVES_OCULTAS.has(k) && (!isAdmin || !esColumnaMonetaria(k)))
                    .map(([k, v]) => [etiquetaColumna(k), textoPlanoCelda(k, v, isAdmin)])
            ];
        } else {
            rows = [['Consulta', 'Resultado'], [atajoSeleccionado.nombre, String(resultado)]];
        }

        const csv = '\uFEFF' + rows
            .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const slug = atajoSeleccionado.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const a = document.createElement('a');
        a.href = url;
        a.download = `HotelParaiso_Consulta_${slug}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderValorCelda = (col, val, fila = null) => {
        if (val === null || val === undefined || val === '') {
            return <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>;
        }
        if (typeof val === 'boolean') {
            return <span className={badgeEstadoClase(val ? 'Activo' : 'Inactivo')}>{val ? 'Activo' : 'Inactivo'}</span>;
        }
        if (col.toLowerCase().includes('estado')) {
            return <span className={badgeEstadoClase(val)}>{String(val)}</span>;
        }
        if (col === 'numero') {
            return <span style={{ fontWeight: 700 }}>Hab. {val}</span>;
        }
        if (col === 'piso') {
            return <span style={{ color: 'var(--text-muted)' }}>Piso {val}</span>;
        }
        if (col === 'capacidad') {
            const n = Number(val || 0);
            return <span className="num">{n} {n === 1 ? 'huésped' : 'huéspedes'}</span>;
        }
        if (col === 'telefono' && fila?.email) {
            return (
                <div>
                    <div className="num" style={{ textAlign: 'left', fontWeight: 600 }}>{val}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{fila.email}</div>
                </div>
            );
        }
        if (typeof val === 'object') {
            if (val.nombre && val.precioBase !== undefined) {
                return (
                    <div>
                        <div style={{ fontWeight: 600 }}>{val.nombre}</div>
                        {!isAdmin && (
                            <div className="num" style={{ textAlign: 'left', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                ${Number(val.precioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                        )}
                    </div>
                );
            }
            if (val.nombre) {
                return (
                    <div>
                        <div style={{ fontWeight: 600 }}>{val.nombre}</div>
                        {val.ciudad && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{val.ciudad}</div>}
                    </div>
                );
            }
            return <span className="num">{JSON.stringify(val)}</span>;
        }
        if (typeof val === 'number' && esColumnaMonetaria(col)) {
            return (
                <span className="num" style={{ fontWeight: 700, color: 'var(--brand-ocean, #16324f)' }}>
                    ${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
            );
        }
        if (typeof val === 'number') {
            return <span className="num" style={{ fontWeight: 700 }}>{val.toLocaleString('es-MX')}</span>;
        }
        return String(val);
    };

    const conteoResultados = Array.isArray(resultado)
        ? resultado.length
        : resultado && typeof resultado === 'object'
            ? Object.keys(resultado).length
            : resultado !== null && resultado !== undefined ? 1 : 0;

    const renderResultados = () => {
        if (cargando) {
            return (
                <div className="loading-state" style={{ padding: '2.5rem' }}>
                    <div className="spinner"></div>
                    <p>Consultando información...</p>
                </div>
            );
        }
        if (resultado === null || resultado === undefined) return null;

        // Escalar
        if (typeof resultado !== 'object') {
            const esMoneda = atajoSeleccionado.unidad === 'MXN';
            return (
                <div className="con-scalar-box">
                    <div className="con-scalar-label">Resultado Consolidado</div>
                    <div className="con-scalar-val">
                        {esMoneda
                            ? `$${Number(resultado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                            : Number(resultado).toLocaleString('es-MX')}
                        {atajoSeleccionado.unidad && (
                            <span className="con-scalar-unit">{atajoSeleccionado.unidad}</span>
                        )}
                    </div>
                </div>
            );
        }

        // Lista de registros
        if (Array.isArray(resultado)) {
            if (resultado.length === 0) {
                return (
                    <div className="empty-state" style={{ padding: '2.5rem' }}>
                        <Zap size={36} className="empty-icon" />
                        <h3>Sin registros</h3>
                        <p>No hay resultados para los criterios seleccionados.</p>
                    </div>
                );
            }

            const columnas = obtenerColumnasLimpias(resultado, isAdmin);
            return (
                <div className="con-table-scroll">
                    <table className="con-table">
                        <thead>
                            <tr>
                                {columnas.map(col => {
                                    const esNum = typeof resultado[0]?.[col] === 'number' && col !== 'piso' && col !== 'capacidad';
                                    return (
                                        <th key={col} className={esNum ? 'num' : ''}>
                                            {etiquetaColumna(col)}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {resultado.map((fila, idx) => (
                                <tr key={idx}>
                                    {columnas.map(col => {
                                        const esNum = typeof fila[col] === 'number' && col !== 'piso' && col !== 'capacidad';
                                        return (
                                            <td key={col} className={esNum ? 'num' : ''}>
                                                {renderValorCelda(col, fila[col], fila)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // Objeto clave-valor
        const entries = Object.entries(resultado).filter(
            ([k]) => !CLAVES_OCULTAS.has(k) && (!isAdmin || !esColumnaMonetaria(k))
        );
        return (
            <div className="con-table-scroll">
                <table className="con-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Concepto</th>
                            <th className="num">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(([campo, valor]) => (
                            <tr key={campo}>
                                <td style={{ fontWeight: 600 }}>{etiquetaColumna(campo)}</td>
                                <td className="num">{renderValorCelda(campo, valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const tabsCategorias = isAdmin
        ? [
            { id: 'TODAS', label: 'Todas' },
            { id: 'Hoteles', label: 'Hoteles' },
            { id: 'Habitaciones', label: 'Cuartos' }
        ]
        : [
            { id: 'TODAS', label: 'Todas' },
            { id: 'Hoteles', label: 'Hoteles' },
            { id: 'Tarifas', label: 'Tarifas' },
            { id: 'Habitaciones', label: 'Cuartos' }
        ];

    return (
        <div className="con-view">
            {/* CABECERA EDITORIAL */}
            <header className="con-header con-anim-up">
                <div>
                    <div className="con-eyebrow">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill="#2d5a43" />
                        </svg>
                        <span>Consultas Rápidas</span>
                        <span className="con-eyebrow-meta">
                            &middot; {user?.nombre || 'Don Roberto'}
                        </span>
                    </div>
                    <h1 className="con-title">Consultas SQL</h1>
                </div>
            </header>

            <div className="con-layout con-anim-up con-delay-1">
                {/* PANEL IZQUIERDO: CATÁLOGO */}
                <aside className="con-sidebar">
                    <div className="con-search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            className="con-search-input"
                            placeholder="Buscar consulta..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            aria-label="Buscar consulta"
                        />
                    </div>

                    <div className={`con-cat-tabs ${tabsCategorias.length === 3 ? 'is-three' : ''}`} role="tablist">
                        {tabsCategorias.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={categoriaActual === tab.id}
                                className={`con-cat-tab ${categoriaActual === tab.id ? 'is-active' : ''}`}
                                onClick={() => setCategoriaActual(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="con-list-meta">
                        {atajosFiltrados.length} {atajosFiltrados.length === 1 ? 'consulta' : 'consultas'}
                    </div>

                    <div className="con-list">
                        {atajosFiltrados.map(a => {
                            const activo = atajoSeleccionado?.id === a.id;
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    className={`con-item ${activo ? 'is-active' : ''}`}
                                    onClick={() => seleccionarAtajo(a)}
                                >
                                    <div className="con-item-title">{a.nombre}</div>
                                    <div className="con-item-cat">{a.categoria}</div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* PANEL DERECHO: RESULTADOS */}
                <section className="con-main">
                    {error && (
                        <div className="alert alert-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="con-card">
                        <div className="con-card-header">
                            <div>
                                <div className="con-cat-pill">{atajoSeleccionado.categoria}</div>
                                <h2 className="con-query-title">{atajoSeleccionado.nombre}</h2>
                                <p className="con-query-desc">{atajoSeleccionado.descripcion}</p>
                            </div>

                            <div className="con-toolbar">
                                {!cargando && resultado !== null && (
                                    <span className="con-count-pill">
                                        {conteoResultados} {conteoResultados === 1 ? 'registro' : 'registros'}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className="con-btn-csv"
                                    onClick={exportarResultadoCsv}
                                    disabled={cargando || resultado === null}
                                    title="Descargar resultado en CSV para Excel"
                                >
                                    <FileSpreadsheet size={13} style={{ color: '#2d5a43' }} />
                                    <span>CSV</span>
                                </button>
                                <button
                                    type="button"
                                    className="con-icon-btn"
                                    onClick={() => ejecutarAtajo(atajoSeleccionado, param1, param2)}
                                    disabled={cargando}
                                    title="Volver a consultar"
                                    aria-label="Volver a consultar"
                                >
                                    <RefreshCw size={14} className={cargando ? 'con-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Parámetros inline si la consulta los requiere */}
                        {atajoSeleccionado.tipoParametro && (
                            <form
                                className="con-params-bar"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    ejecutarAtajo(atajoSeleccionado, param1, param2);
                                }}
                            >
                                {atajoSeleccionado.tipoParametro === 'ciudad' && (
                                    <label className="con-param-group">
                                        <span>Ciudad:</span>
                                        <select className="con-param-select" value={param1} onChange={(e) => setParam1(e.target.value)}>
                                            {ciudadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </label>
                                )}

                                {atajoSeleccionado.tipoParametro === 'hotel' && (
                                    <label className="con-param-group">
                                        <span>Propiedad:</span>
                                        <select className="con-param-select" value={param1} onChange={(e) => setParam1(e.target.value)}>
                                            {hotelesDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </label>
                                )}

                                {atajoSeleccionado.tipoParametro === 'piso' && (
                                    <label className="con-param-group">
                                        <span>Piso:</span>
                                        <select className="con-param-select" value={param1} onChange={(e) => setParam1(e.target.value)}>
                                            {pisosDisponibles.map(p => <option key={p} value={String(p)}>Piso {p}</option>)}
                                        </select>
                                    </label>
                                )}

                                {atajoSeleccionado.tipoParametro === 'hotel_piso' && (
                                    <>
                                        <label className="con-param-group">
                                            <span>Propiedad:</span>
                                            <select className="con-param-select" value={param1} onChange={(e) => setParam1(e.target.value)}>
                                                {hotelesDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </label>
                                        <label className="con-param-group">
                                            <span>Piso:</span>
                                            <select className="con-param-select" value={param2} onChange={(e) => setParam2(e.target.value)}>
                                                {pisosDisponibles.map(p => <option key={p} value={String(p)}>Piso {p}</option>)}
                                            </select>
                                        </label>
                                    </>
                                )}

                                {atajoSeleccionado.tipoParametro === 'precio' && (
                                    <label className="con-param-group">
                                        <span>Monto ($ MXN):</span>
                                        <select className="con-param-select" value={param1} onChange={(e) => setParam1(e.target.value)}>
                                            {preciosSugeridos.map(pr => (
                                                <option key={pr} value={pr}>${Number(pr).toLocaleString('es-MX')}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                <button type="submit" className="con-run-btn" disabled={cargando}>
                                    <Play size={12} />
                                    <span>Consultar</span>
                                </button>
                            </form>
                        )}

                        {renderResultados()}
                    </div>
                </section>
            </div>
        </div>
    );
}
