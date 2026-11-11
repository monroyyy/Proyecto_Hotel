import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Zap, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { API_BASE_URL, getStoredToken, clearAuthSession, getHoteles } from '../api/hotelApi';
import EstadoBadge from '../components/EstadoBadge';

const LISTA_ATAJOS = [
    // Consultas de Hoteles y Sedes
    {
        id: 1,
        categoria: 'Hoteles',
        nombre: 'Directorio general de hoteles',
        endpoint: '/api/consultas/hoteles',
        descripcion: 'Listado completo con todas las sedes, direcciones y teléfonos de la cadena.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 2,
        categoria: 'Hoteles',
        nombre: 'Hoteles actualmente operando',
        endpoint: '/api/consultas/hoteles/activos',
        descripcion: 'Muestra únicamente los hoteles activos y con servicio disponible.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 3,
        categoria: 'Hoteles',
        nombre: 'Hoteles por ciudad',
        endpoint: '/api/consultas/hoteles/ciudad/{ciudad}',
        paramNombre: 'ciudad',
        descripcion: 'Filtra las sedes hoteleras ubicadas en una ciudad específica.',
        tipoParametro: 'ciudad',
        destacada: true
    },
    {
        id: 4,
        categoria: 'Hoteles',
        nombre: 'Total de habitaciones por hotel',
        endpoint: '/api/consultas/hoteles/total-habitaciones',
        descripcion: 'Conteo y distribución de cuartos registrados en cada una de las propiedades.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 5,
        categoria: 'Hoteles',
        nombre: 'Disponibilidad de cuartos por hotel',
        endpoint: '/api/consultas/hoteles/habitaciones-disponibles-count',
        descripcion: 'Conteo numérico de habitaciones disponibles en cada una de las sedes.',
        tipoParametro: null,
        destacada: false
    },

    // Consultas de Categorías y Tarifas
    {
        id: 6,
        categoria: 'Tarifas',
        nombre: 'Catálogo de categorías de suites',
        endpoint: '/api/consultas/tipos',
        descripcion: 'Todas las categorías registradas con sus precios base y capacidades.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 7,
        categoria: 'Tarifas',
        nombre: 'Habitaciones dobles (2 personas)',
        endpoint: '/api/consultas/tipos/capacidad-2',
        descripcion: 'Categorías configuradas para alojar cómodamente a 2 huéspedes.',
        tipoParametro: null,
        destacada: false
    },
    {
        id: 8,
        categoria: 'Tarifas',
        nombre: 'Tarifa promedio por noche',
        endpoint: '/api/consultas/tipos/precio-promedio',
        descripcion: 'Cálculo del costo promedio estándar por noche en toda la cadena.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 9,
        categoria: 'Tarifas',
        nombre: 'Suites con tarifa menor a un monto',
        endpoint: '/api/consultas/tipos/menor-que/{precio}',
        paramNombre: 'precio',
        descripcion: 'Categorías con precio base por noche menor o igual al valor seleccionado.',
        tipoParametro: 'precio',
        paramDefault: '1500',
        destacada: false
    },
    {
        id: 10,
        categoria: 'Tarifas',
        nombre: 'Suites con tarifa mayor a un monto',
        endpoint: '/api/consultas/tipos/mayor-que/{precio}',
        paramNombre: 'precio',
        descripcion: 'Categorías con precio base por noche superior al valor seleccionado.',
        tipoParametro: 'precio',
        paramDefault: '1200',
        destacada: false
    },
    {
        id: 11,
        categoria: 'Tarifas',
        nombre: 'Suite más económica de la cadena',
        endpoint: '/api/consultas/tipos/mas-barato',
        descripcion: 'La categoría con la tarifa por noche más accesible del sistema.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 12,
        categoria: 'Tarifas',
        nombre: 'Suite más exclusiva (tarifa más alta)',
        endpoint: '/api/consultas/tipos/mas-caro',
        descripcion: 'La suite o penthouse con el precio base más elevado de la cadena.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 13,
        categoria: 'Tarifas',
        nombre: 'Capacidad máxima de huéspedes en suite',
        endpoint: '/api/consultas/tipos/capacidad-maxima',
        descripcion: 'El número más alto de ocupantes permitido en una sola habitación.',
        tipoParametro: null,
        destacada: false
    },
    {
        id: 14,
        categoria: 'Tarifas',
        nombre: 'Total de categorías registradas',
        endpoint: '/api/consultas/tipos/total-count',
        descripcion: 'Número total de tipos de suites dados de alta en el sistema.',
        tipoParametro: null,
        destacada: false
    },

    // Consultas de Inventario y Habitaciones
    {
        id: 15,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones disponibles hoy',
        endpoint: '/api/consultas/habitaciones/disponibles',
        descripcion: 'Suites libres y listas para asignación inmediata.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 16,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones actualmente ocupadas',
        endpoint: '/api/consultas/habitaciones/ocupadas',
        descripcion: 'Habitaciones con huéspedes alojados actualmente en el hotel.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 17,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones en mantenimiento',
        endpoint: '/api/consultas/habitaciones/mantenimiento',
        descripcion: 'Listado de suites en limpieza profunda, servicio técnico o reparaciones.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 18,
        categoria: 'Habitaciones',
        nombre: 'Total de cuartos en mantenimiento',
        endpoint: '/api/consultas/habitaciones/mantenimiento-count',
        descripcion: 'Conteo numérico de habitaciones actualmente fuera de servicio.',
        tipoParametro: null,
        destacada: false
    },
    {
        id: 19,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones por hotel específico',
        endpoint: '/api/consultas/habitaciones/hotel/{nombreHotel}',
        paramNombre: 'nombreHotel',
        descripcion: 'Inventario de habitaciones pertenecientes a la sede seleccionada.',
        tipoParametro: 'hotel',
        destacada: true
    },
    {
        id: 20,
        categoria: 'Habitaciones',
        nombre: 'Disponibles en hotel específico',
        endpoint: '/api/consultas/habitaciones/disponibles/{nombreHotel}',
        paramNombre: 'nombreHotel',
        descripcion: 'Cuartos listos para reservar en la propiedad seleccionada.',
        tipoParametro: 'hotel',
        destacada: true
    },
    {
        id: 21,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones familiares (4 personas)',
        endpoint: '/api/consultas/habitaciones/capacidad-4',
        descripcion: 'Suites amplias diseñadas para alojar hasta 4 ocupantes.',
        tipoParametro: null,
        destacada: false
    },
    {
        id: 22,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones con tipo y tarifa asignada',
        endpoint: '/api/consultas/habitaciones/tipo-precio',
        descripcion: 'Inventario general de cuartos con desglose de su categoría y precio base.',
        tipoParametro: null,
        destacada: false
    },
    {
        id: 23,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones por nivel o piso',
        endpoint: '/api/consultas/habitaciones/piso/{piso}',
        paramNombre: 'piso',
        descripcion: 'Muestra todas las habitaciones situadas en un piso determinado.',
        tipoParametro: 'piso',
        paramDefault: '1',
        destacada: false
    },
    {
        id: 24,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones por hotel y piso',
        endpoint: '/api/consultas/habitaciones/hotel/{nombreHotel}/piso/{piso}',
        paramNombre: 'nombreHotel',
        paramNombre2: 'piso',
        paramDefault2: '1',
        descripcion: 'Filtra las habitaciones seleccionando el hotel y el nivel deseado.',
        tipoParametro: 'hotel_piso',
        destacada: false
    },
    {
        id: 25,
        categoria: 'Habitaciones',
        nombre: 'Total de habitaciones registradas',
        endpoint: '/api/consultas/habitaciones/total-count',
        descripcion: 'Inventario general de cuartos de todos los hoteles de la cadena.',
        tipoParametro: null,
        destacada: false
    },
    {
        id: 26,
        categoria: 'Habitaciones',
        nombre: 'Ingreso potencial máximo por noche',
        endpoint: '/api/consultas/habitaciones/ingreso-potencial',
        descripcion: 'Monto total que generaría la cadena si todas las habitaciones estuvieran ocupadas.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 27,
        categoria: 'Habitaciones',
        nombre: 'Resumen de inventario por estado',
        endpoint: '/api/consultas/habitaciones/resumen-estados',
        descripcion: 'Desglose proporcional de cuartos disponibles, ocupados y en mantenimiento.',
        tipoParametro: null,
        destacada: true
    },
    {
        id: 28,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones en una ciudad',
        endpoint: '/api/consultas/habitaciones/ciudad/{ciudad}',
        paramNombre: 'ciudad',
        descripcion: 'Habitaciones de hoteles situados en la ciudad seleccionada.',
        tipoParametro: 'ciudad',
        destacada: false
    },
    {
        id: 29,
        categoria: 'Habitaciones',
        nombre: 'Disponibles ordenadas por tarifa',
        endpoint: '/api/consultas/habitaciones/disponibles/ordenadas-por-precio',
        descripcion: 'Suites listas para reservar ordenadas de menor a mayor precio.',
        tipoParametro: null,
        destacada: false
    }
];

export default function ConsultasPage() {
    const [categoriaActual, setCategoriaActual] = useState('TODAS');
    const [busqueda, setBusqueda] = useState('');
    const [atajoSeleccionado, setAtajoSeleccionado] = useState(LISTA_ATAJOS[0]);

    // Datos maestros para llenar los selects automáticamente
    const [hoteles, setHoteles] = useState([]);
    const [param1, setParam1] = useState('');
    const [param2, setParam2] = useState('');

    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    // Cargar hoteles para poblar ciudades y nombres sin teclear a mano
    useEffect(() => {
        getHoteles().then(data => {
            if (Array.isArray(data)) setHoteles(data);
        }).catch(() => {});
    }, []);

    // Opciones dinámicas
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

    // Inicializar parámetros al cambiar de atajo
    useEffect(() => {
        if (!atajoSeleccionado) return;
        if (atajoSeleccionado.tipoParametro === 'ciudad') {
            setParam1(ciudadesDisponibles[0] || 'Cancún');
        } else if (atajoSeleccionado.tipoParametro === 'hotel') {
            setParam1(hotelesDisponibles[0] || 'Hotel Paraíso');
        } else if (atajoSeleccionado.tipoParametro === 'piso') {
            setParam1('1');
        } else if (atajoSeleccionado.tipoParametro === 'hotel_piso') {
            setParam1(hotelesDisponibles[0] || 'Hotel Paraíso');
            setParam2('1');
        } else if (atajoSeleccionado.tipoParametro === 'precio') {
            setParam1(atajoSeleccionado.paramDefault || '1500');
        } else {
            setParam1('');
            setParam2('');
        }
    }, [atajoSeleccionado, ciudadesDisponibles, hotelesDisponibles]);

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
                clearAuthSession('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
                throw new Error('Tu sesión ha expirado.');
            }
            if (!res.ok) {
                throw new Error(`No se pudo obtener la información (${res.status}: ${res.statusText})`);
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

    // Ejecutar consulta inicial
    useEffect(() => {
        ejecutarAtajo(LISTA_ATAJOS[0], '', '');
    }, [ejecutarAtajo]);

    const seleccionarAtajo = (a) => {
        setAtajoSeleccionado(a);
        let p1 = '';
        let p2 = '';
        if (a.tipoParametro === 'ciudad') {
            p1 = ciudadesDisponibles[0] || 'Cancún';
        } else if (a.tipoParametro === 'hotel') {
            p1 = hotelesDisponibles[0] || 'Hotel Paraíso';
        } else if (a.tipoParametro === 'piso') {
            p1 = '1';
        } else if (a.tipoParametro === 'hotel_piso') {
            p1 = hotelesDisponibles[0] || 'Hotel Paraíso';
            p2 = '1';
        } else if (a.tipoParametro === 'precio') {
            p1 = a.paramDefault || '1500';
        }
        setParam1(p1);
        setParam2(p2);
        ejecutarAtajo(a, p1, p2);
    };

    const handleActualizarParametros = (e) => {
        e?.preventDefault();
        ejecutarAtajo(atajoSeleccionado, param1, param2);
    };

    const atajosFiltrados = LISTA_ATAJOS.filter(a => {
        const matchesCat = categoriaActual === 'TODAS' || a.categoria === categoriaActual;
        const query = busqueda.trim().toLowerCase();
        const matchesQuery = !query ? true : a.nombre.toLowerCase().includes(query) || a.descripcion.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
    });

    const renderValorCelda = (col, val) => {
        if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        if (typeof val === 'boolean') {
            return <EstadoBadge estado={val ? 'Activo' : 'Inactivo'} />;
        }
        if (col.toLowerCase().includes('estado')) {
            return <EstadoBadge estado={String(val)} />;
        }
        if (typeof val === 'object') {
            if (val.nombre && val.precioBase !== undefined) {
                return (
                    <div className="hotel-cell">
                        <div className="hotel-name">{val.nombre}</div>
                        <div className="hotel-city num">${Number(val.precioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</div>
                    </div>
                );
            }
            if (val.nombre && val.ciudad) {
                return (
                    <div className="hotel-cell">
                        <div className="hotel-name">{val.nombre}</div>
                        <div className="hotel-city">{val.ciudad}</div>
                    </div>
                );
            }
            return <span className="num">{JSON.stringify(val)}</span>;
        }

        const isMonetario = typeof val === 'number' && (
            col.toLowerCase().includes('precio') ||
            col.toLowerCase().includes('ingreso') ||
            col.toLowerCase().includes('total') ||
            !Number.isInteger(val)
        );

        if (isMonetario) {
            return <span className="num">${Number(val).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>;
        }

        if (typeof val === 'number') {
            return <span className="num">{val}</span>;
        }

        return String(val);
    };

    const renderResultadosClaros = () => {
        if (resultado === null || resultado === undefined) return null;

        // Caso 1: Valor escalar simple (conteo o total)
        if (typeof resultado !== 'object') {
            const esMoneda = typeof resultado === 'number' && (
                !Number.isInteger(resultado) ||
                atajoSeleccionado.endpoint.includes('precio') ||
                atajoSeleccionado.endpoint.includes('ingreso')
            );

            return (
                <div style={{
                    padding: '2.5rem 1.5rem',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '0.76rem',
                        color: '#64748b',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                    }}>
                        Métrica Consolidada
                    </div>
                    <div className="num" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                        {esMoneda
                            ? `$${Number(resultado).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
                            : resultado}
                    </div>
                </div>
            );
        }

        // Caso 2: Array de objetos
        if (Array.isArray(resultado)) {
            if (resultado.length === 0) {
                return (
                    <div className="empty-state">
                        <Zap size={40} className="empty-icon" />
                        <h3>Sin registros encontrados</h3>
                        <p>No se encontraron resultados para los criterios seleccionados.</p>
                    </div>
                );
            }

            const columnas = Object.keys(resultado[0] || {});

            return (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {columnas.map(col => {
                                    const esNum = typeof resultado[0][col] === 'number';
                                    return (
                                        <th key={col} className={esNum ? 'text-right' : ''}>
                                            {col.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {resultado.map((fila, idx) => (
                                <tr key={idx} className="table-row">
                                    {columnas.map(col => {
                                        const esNum = typeof fila[col] === 'number';
                                        return (
                                            <td key={col} className={esNum ? 'text-right' : ''}>
                                                {renderValorCelda(col, fila[col])}
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

        // Caso 3: Objeto único (clave-valor)
        const entries = Object.entries(resultado);
        return (
            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '35%' }}>Concepto</th>
                            <th>Información</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(([campo, valor]) => (
                            <tr key={campo} className="table-row">
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                    {campo.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
                                </td>
                                <td>{renderValorCelda(campo, valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="page-container">
            {/* Encabezado Profesional */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Atajos y Consultas Rápidas</h1>
                    <p className="page-description">
                        Consulta métricas operativas, inventario y resúmenes de la cadena con filtros inmediatos sin configuraciones complejas.
                    </p>
                </div>
            </div>

            {/* Layout Principal de 2 Columnas */}
            <div className="consultas-layout">
                {/* Columna Izquierda: Listado y Categorías de Atajos */}
                <div className="table-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Buscador */}
                    <div className="search-input-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar consulta o atajo..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {/* Filtro por Categoría */}
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {[
                            { id: 'TODAS', label: 'Todos' },
                            { id: 'Hoteles', label: 'Hoteles' },
                            { id: 'Tarifas', label: 'Tarifas' },
                            { id: 'Habitaciones', label: 'Habitaciones' }
                        ].map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategoriaActual(cat.id)}
                                className={`btn ${categoriaActual === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    height: '28px',
                                    minHeight: '28px',
                                    padding: '0 0.65rem',
                                    fontSize: '0.75rem'
                                }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Contador */}
                    <div className="table-counter">
                        {atajosFiltrados.length} {atajosFiltrados.length === 1 ? 'consulta disponible' : 'consultas disponibles'}
                    </div>

                    {/* Lista Scrolleable de Atajos */}
                    <div className="consulta-list">
                        {atajosFiltrados.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                                <Zap size={32} className="empty-icon" />
                                <p style={{ fontSize: '0.8rem' }}>Sin coincidencias</p>
                            </div>
                        ) : (
                            atajosFiltrados.map(a => {
                                const isActivo = atajoSeleccionado.id === a.id;
                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => seleccionarAtajo(a)}
                                        className={`consulta-card-btn ${isActivo ? 'is-active' : ''}`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                            <span className="consulta-tag">{a.categoria}</span>
                                            {a.destacada && <Sparkles size={12} style={{ color: '#d97706' }} />}
                                        </div>
                                        <div className="consulta-title">{a.nombre}</div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Panel de Parámetros y Visualización de Resultados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Ficha del Atajo Seleccionado */}
                    <div className="content-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span className="floor-badge" style={{ fontSize: '0.72rem', color: 'var(--brand-terracotta, #b45309)', fontWeight: 700 }}>
                                {atajoSeleccionado.categoria}
                            </span>
                        </div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                            {atajoSeleccionado.nombre}
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                            {atajoSeleccionado.descripcion}
                        </p>

                        {/* Parámetros Inteligentes con Selects (sin escribir manual) */}
                        {atajoSeleccionado.tipoParametro && (
                            <form onSubmit={handleActualizarParametros} style={{
                                marginTop: '1rem',
                                background: '#f8fafc',
                                padding: '0.85rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    {/* Opción Ciudad */}
                                    {atajoSeleccionado.tipoParametro === 'ciudad' && (
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <label className="form-label">Selecciona la Ciudad</label>
                                            <select
                                                className="form-select"
                                                value={param1}
                                                onChange={e => setParam1(e.target.value)}
                                            >
                                                {ciudadesDisponibles.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Opción Hotel */}
                                    {atajoSeleccionado.tipoParametro === 'hotel' && (
                                        <div style={{ flex: 1, minWidth: '220px' }}>
                                            <label className="form-label">Selecciona el Hotel</label>
                                            <select
                                                className="form-select"
                                                value={param1}
                                                onChange={e => setParam1(e.target.value)}
                                            >
                                                {hotelesDisponibles.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Opción Piso */}
                                    {atajoSeleccionado.tipoParametro === 'piso' && (
                                        <div style={{ flex: 1, minWidth: '160px' }}>
                                            <label className="form-label">Selecciona el Nivel / Piso</label>
                                            <select
                                                className="form-select"
                                                value={param1}
                                                onChange={e => setParam1(e.target.value)}
                                            >
                                                {pisosDisponibles.map(p => (
                                                    <option key={p} value={p}>Piso {p}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Opción Hotel + Piso */}
                                    {atajoSeleccionado.tipoParametro === 'hotel_piso' && (
                                        <>
                                            <div style={{ flex: 1, minWidth: '180px' }}>
                                                <label className="form-label">Hotel</label>
                                                <select
                                                    className="form-select"
                                                    value={param1}
                                                    onChange={e => setParam1(e.target.value)}
                                                >
                                                    {hotelesDisponibles.map(h => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ width: '130px' }}>
                                                <label className="form-label">Piso</label>
                                                <select
                                                    className="form-select"
                                                    value={param2}
                                                    onChange={e => setParam2(e.target.value)}
                                                >
                                                    {pisosDisponibles.map(p => (
                                                        <option key={p} value={p}>Piso {p}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {/* Opción Precio */}
                                    {atajoSeleccionado.tipoParametro === 'precio' && (
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <label className="form-label">Monto límite ($ MXN)</label>
                                            <select
                                                className="form-select"
                                                value={param1}
                                                onChange={e => setParam1(e.target.value)}
                                            >
                                                {preciosSugeridos.map(pr => (
                                                    <option key={pr} value={pr}>${Number(pr).toLocaleString('es-MX')} MXN</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={cargando}
                                        style={{ height: '38px', minWidth: '110px' }}
                                    >
                                        <RefreshCw size={14} className={cargando ? 'spin-animation' : ''} />
                                        <span>{cargando ? 'Obteniendo...' : 'Obtener'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Resultados Visuales en Tabla */}
                    <div className="table-card" style={{ minHeight: '340px' }}>
                        <div className="table-header-info">
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Información Obtenida
                            </span>
                        </div>

                        {error && (
                            <div className="alert alert-error" style={{ margin: '1rem' }}>
                                <AlertCircle size={18} />
                                <div><strong>Aviso:</strong> {error}</div>
                            </div>
                        )}

                        {cargando ? (
                            <div className="loading-state" style={{ padding: '3.5rem 1rem' }}>
                                <div className="spinner"></div>
                                <p>Obteniendo información del hotel...</p>
                            </div>
                        ) : resultado === null ? (
                            <div className="empty-state" style={{ padding: '3.5rem 1rem' }}>
                                <Zap size={40} className="empty-icon" />
                                <p>Selecciona un atajo de la lista para ver su información.</p>
                            </div>
                        ) : (
                            renderResultadosClaros()
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
