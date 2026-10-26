import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

const LISTA_CONSULTAS = [
    // Consultas de Hotel (4 disponibles)
    {
        id: 1,
        categoria: 'Hoteles',
        nombre: 'Mostrar todos los hoteles',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles',
        descripcion: 'Lista completa de todos los hoteles de la cadena.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 2,
        categoria: 'Hoteles',
        nombre: 'Hoteles actualmente activos',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/activos',
        descripcion: 'Muestra únicamente los hoteles operando normalmente.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 3,
        categoria: 'Hoteles',
        nombre: 'Hoteles en una ciudad específica',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/ciudad/{ciudad}',
        paramNombre: 'ciudad',
        paramDefault: 'Ciudad de México',
        descripcion: 'Filtra las propiedades por ciudad.',
        requiereParametro: true,
        destacada: true
    },
    {
        id: 4,
        categoria: 'Hoteles',
        nombre: 'Total de habitaciones por hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/total-habitaciones',
        descripcion: 'Conteo de habitaciones pertenecientes a cada hotel.',
        requiereParametro: false,
        destacada: true
    },

    // Consultas de Tipo Habitación (4 destacadas de 9)
    {
        id: 5,
        categoria: 'Tipos de Habitación',
        nombre: 'Tipos de habitación existentes',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos',
        descripcion: 'Catálogo con todas las categorías de habitaciones.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 6,
        categoria: 'Tipos de Habitación',
        nombre: 'Habitaciones para 2 personas',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/capacidad-2',
        descripcion: 'Tipos de habitación con capacidad para 2 personas.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 7,
        categoria: 'Tipos de Habitación',
        nombre: 'Precio promedio de las habitaciones',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/precio-promedio',
        descripcion: 'Cálculo del costo promedio por noche.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 8,
        categoria: 'Tipos de Habitación',
        nombre: 'Tipos con precio menor a cierta cantidad',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/menor-que/{precio}',
        paramNombre: 'precio',
        paramDefault: '1500',
        descripcion: 'Filtra categorías con precio inferior al valor ingresado.',
        requiereParametro: true,
        destacada: false
    },
    {
        id: 9,
        categoria: 'Tipos de Habitación',
        nombre: 'Tipos con precio mayor a cierta cantidad',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/mayor-que/{precio}',
        paramNombre: 'precio',
        paramDefault: '1000',
        descripcion: 'Filtra categorías con precio superior al valor ingresado.',
        requiereParametro: true,
        destacada: false
    },
    {
        id: 10,
        categoria: 'Tipos de Habitación',
        nombre: 'Tipo de habitación más barato',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/mas-barato',
        descripcion: 'La opción con el precio base más económico.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 11,
        categoria: 'Tipos de Habitación',
        nombre: 'Tipo de habitación más caro',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/mas-caro',
        descripcion: 'La suite o categoría con el precio base más elevado.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 12,
        categoria: 'Tipos de Habitación',
        nombre: 'Total de tipos de habitación',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/total-count',
        descripcion: 'Conteo total de categorías disponibles en el sistema.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 13,
        categoria: 'Tipos de Habitación',
        nombre: 'Capacidad máxima alojable',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/capacidad-maxima',
        descripcion: 'Capacidad de huéspedes más alta en una sola habitación.',
        requiereParametro: false,
        destacada: false
    },

    // Consultas de Habitación (6 destacadas de 17)
    {
        id: 14,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones disponibles',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/disponibles',
        descripcion: 'Habitaciones listas para su venta y asignación.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 15,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones de cada hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/por-hotel',
        descripcion: 'Listado con hotel, habitación, piso y estado.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 16,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones con su tipo y precio',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/tipo-precio',
        descripcion: 'Relación de habitación con tipo, capacidad y precio por noche.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 17,
        categoria: 'Habitaciones',
        nombre: 'Conteo de disponibles por hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/habitaciones-disponibles-count',
        descripcion: 'Número de habitaciones libres por cada sede.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 18,
        categoria: 'Habitaciones',
        nombre: 'Disponibles en un hotel específico',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/disponibles/{nombreHotel}',
        paramNombre: 'nombreHotel',
        paramDefault: 'Hotel Paraíso',
        descripcion: 'Filtra las habitaciones libres en el hotel indicado.',
        requiereParametro: true,
        destacada: true
    },
    {
        id: 19,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones en mantenimiento',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/mantenimiento-count',
        descripcion: 'Cantidad de cuartos en reparación o fuera de servicio.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 20,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones para 4 huéspedes',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/capacidad-4',
        descripcion: 'Habitaciones asignadas a tipos con capacidad para 4 personas.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 21,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones ocupadas actualmente',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/ocupadas',
        descripcion: 'Habitaciones que tienen huéspedes alojados.',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 22,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones en un piso específico',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/piso/{piso}',
        paramNombre: 'piso',
        paramDefault: '1',
        descripcion: 'Muestra las habitaciones de un nivel determinado (ej. piso 1).',
        requiereParametro: true,
        destacada: false
    },
    {
        id: 23,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones en un piso de un hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/hotel/{nombreHotel}/piso/{piso}',
        paramNombre: 'nombreHotel',
        paramDefault: 'Hotel Paraíso',
        paramNombre2: 'piso',
        paramDefault2: '1',
        descripcion: 'Filtra cuartos por hotel y número de piso simultáneamente.',
        requiereDobleParametro: true,
        destacada: false
    },
    {
        id: 24,
        categoria: 'Habitaciones',
        nombre: 'Total de habitaciones en la cadena',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/total-count',
        descripcion: 'Inventario general de cuartos de todos los hoteles.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 25,
        categoria: 'Habitaciones',
        nombre: 'Ingreso potencial máximo por noche',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/ingreso-potencial',
        descripcion: 'Monto total generado si todas las habitaciones estuvieran ocupadas.',
        requiereParametro: false,
        destacada: false
    },
    {
        id: 26,
        categoria: 'Habitaciones',
        nombre: 'Buscar habitación por número',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/numero/{numero}',
        paramNombre: 'numero',
        paramDefault: '101',
        descripcion: 'Localiza una habitación según su número de puerta.',
        requiereParametro: true,
        destacada: false
    },
    {
        id: 27,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones por tipo específico',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/tipo/{tipoNombre}',
        paramNombre: 'tipoNombre',
        paramDefault: 'Habitación Doble',
        descripcion: 'Busca las habitaciones asociadas a una categoría exacta.',
        requiereParametro: true,
        destacada: false
    },
    {
        id: 28,
        categoria: 'Habitaciones',
        nombre: 'Resumen de habitaciones por estado',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/resumen-estados',
        descripcion: 'Cantidad de habitaciones en cada estado (Disponible, Ocupada, Mantenimiento).',
        requiereParametro: false,
        destacada: true
    },
    {
        id: 29,
        categoria: 'Habitaciones',
        nombre: 'Habitaciones en una ciudad específica',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/ciudad/{ciudad}',
        paramNombre: 'ciudad',
        paramDefault: 'Ciudad de México',
        descripcion: 'Habitaciones de hoteles ubicados en una ciudad determinada.',
        requiereParametro: true,
        destacada: false
    },
    {
        id: 30,
        categoria: 'Habitaciones',
        nombre: 'Disponibles ordenadas por precio',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/disponibles/ordenadas-por-precio',
        descripcion: 'Habitaciones libres ordenadas de menor a mayor precio.',
        requiereParametro: false,
        destacada: false
    }
];

export default function ConsultasPage() {
    const [categoriaActual, setCategoriaActual] = useState('TODAS');
    const [busqueda, setBusqueda] = useState('');
    const [consultaSeleccionada, setConsultaSeleccionada] = useState(LISTA_CONSULTAS[0]);
    const [param1, setParam1] = useState(LISTA_CONSULTAS[0].paramDefault || '');
    const [param2, setParam2] = useState(LISTA_CONSULTAS[0].paramDefault2 || '');

    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const buildUrl = useCallback((consulta, p1, p2) => {
        let ep = consulta.endpoint;
        if (consulta.requiereDobleParametro) {
            ep = ep.replace(`{${consulta.paramNombre}}`, encodeURIComponent((p1 || '').trim()))
                   .replace(`{${consulta.paramNombre2}}`, encodeURIComponent((p2 || '').trim()));
        } else if (consulta.requiereParametro) {
            ep = ep.replace(`{${consulta.paramNombre}}`, encodeURIComponent((p1 || '').trim()));
        }
        return `http://localhost:8080${ep}`;
    }, []);

    const ejecutarConsulta = useCallback(async (consulta, p1, p2) => {
        setCargando(true);
        setError('');
        try {
            const url = buildUrl(consulta, p1, p2);
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`);
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

    // Al seleccionar una consulta, se actualizan los parámetros y se ejecuta automáticamente
    const seleccionarConsulta = (c) => {
        setConsultaSeleccionada(c);
        const p1 = c.paramDefault || '';
        const p2 = c.paramDefault2 || '';
        setParam1(p1);
        setParam2(p2);
        ejecutarConsulta(c, p1, p2);
    };

    // Cargar la primera consulta automáticamente al abrir la página
    useEffect(() => {
        ejecutarConsulta(LISTA_CONSULTAS[0], LISTA_CONSULTAS[0].paramDefault || '', LISTA_CONSULTAS[0].paramDefault2 || '');
    }, [ejecutarConsulta]);

    // Recargar con los nuevos parámetros cuando el recepcionista los cambie
    const handleActualizarParametros = (e) => {
        e?.preventDefault();
        ejecutarConsulta(consultaSeleccionada, param1, param2);
    };


    // Filtrar consultas de forma limpia
    const consultasFiltradas = LISTA_CONSULTAS.filter(c => {
        const matchesCat = categoriaActual === 'TODAS' || c.categoria === categoriaActual;
        const query = busqueda.trim().toLowerCase();
        const matchesQuery = !query ? c.destacada : (c.nombre.toLowerCase().includes(query) || c.endpoint.toLowerCase().includes(query));
        return matchesCat && matchesQuery;
    });

    // Helper para renderizar contenido en celdas de forma humana
    const renderValorCelda = (val) => {
        if (val === null || val === undefined) return <span style={{ color: '#94a3b8' }}>-</span>;
        if (typeof val === 'boolean') {
            return (
                <span className={`status-select status-${val ? 'disponible' : 'mantenimiento'}`} style={{ pointerEvents: 'none', padding: '2px 8px' }}>
                    {val ? 'Activo' : 'Inactivo'}
                </span>
            );
        }
        if (typeof val === 'object') {
            if (val.nombre && val.precioBase !== undefined) {
                return (
                    <div>
                        <strong>{val.nombre}</strong> (${Number(val.precioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN)
                    </div>
                );
            }
            if (val.nombre && val.ciudad) {
                return (
                    <div>
                        <strong>{val.nombre}</strong> ({val.ciudad})
                    </div>
                );
            }
            return JSON.stringify(val);
        }

        // Si el campo parece monetario (precio, precioBase, ingreso, etc.)
        if (typeof val === 'number' && !Number.isInteger(val)) {
            return `$${val.toFixed(2)} MXN`;
        }

        return String(val);
    };

    // Renderizado visual de resultados
    const renderResultadosClaros = () => {
        if (resultado === null || resultado === undefined) return null;

        // Caso 1: Valor escalar simple (número, promedio, conteo)
        if (typeof resultado !== 'object') {
            const esMoneda = typeof resultado === 'number' && (
                !Number.isInteger(resultado) ||
                consultaSeleccionada.endpoint.includes('precio') ||
                consultaSeleccionada.endpoint.includes('ingreso')
            );

            return (
                <div style={{ padding: '28px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Resultado obtenido
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#0f172a' }}>
                        {esMoneda
                            ? `$${Number(resultado).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
                            : resultado}
                    </div>
                </div>
            );
        }

        // Caso 2: Array de objetos o registros
        if (Array.isArray(resultado)) {
            if (resultado.length === 0) {
                return (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>No se encontraron registros para esta consulta.</p>
                    </div>
                );
            }

            // Extraer columnas de las llaves del primer objeto
            const columnas = Object.keys(resultado[0] || {});

            return (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {columnas.map(col => (
                                    <th key={col} style={{ textTransform: 'capitalize' }}>
                                        {col.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {resultado.map((fila, idx) => (
                                <tr key={idx} className="table-row">
                                    {columnas.map(col => (
                                        <td key={col}>
                                            {renderValorCelda(fila[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        // Caso 3: Objeto único (ej. mas-barato, mas-caro, etc.)
        const entries = Object.entries(resultado);
        return (
            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '35%' }}>Campo</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(([campo, valor]) => (
                            <tr key={campo} className="table-row">
                                <td style={{ fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                                    {campo.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
                                </td>
                                <td>{renderValorCelda(valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="page-container">
            {/* Encabezado */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Consultas</h1>
                </div>
            </div>

            {/* Layout Principal de 2 Columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Columna Izquierda: Listado y Filtros de Consultas */}
                <div className="table-card" style={{ padding: '16px' }}>
                    
                    {/* Buscador */}
                    <div style={{ marginBottom: '12px', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Buscar consulta..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px 8px 32px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    {/* Filtro por Categoría con botones simples */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'TODAS', label: 'Todas' },
                            { id: 'Hoteles', label: 'Hoteles' },
                            { id: 'Tipos de Habitación', label: 'Tipos' },
                            { id: 'Habitaciones', label: 'Habitaciones' }
                        ].map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategoriaActual(cat.id)}
                                className={`btn ${categoriaActual === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Contador simple */}
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                        {consultasFiltradas.length} {consultasFiltradas.length === 1 ? 'consulta disponible' : 'consultas disponibles'}
                    </div>

                    {/* Lista Scrolleable */}
                    <div style={{ maxHeight: '640px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {consultasFiltradas.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                No se encontraron consultas con ese término.
                            </div>
                        ) : (
                            consultasFiltradas.map(c => {
                                const isActivo = consultaSeleccionada.id === c.id;
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => seleccionarConsulta(c)}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: isActivo ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                            background: isActivo ? '#eff6ff' : '#ffffff',
                                            boxShadow: isActivo ? '0 4px 12px rgba(37, 99, 235, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                                            cursor: 'pointer',
                                            transition: 'var(--transition)'
                                        }}
                                        className="consulta-list-item"
                                    >
                                        <div style={{ marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.72rem', color: isActivo ? '#1e40af' : '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                {c.categoria}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: isActivo ? 700 : 600, color: '#0f172a' }}>
                                            {c.nombre}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Panel de Resultados y Parámetros */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Detalle de la Consulta seleccionada */}
                    <div className="table-card" style={{ padding: '20px' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {consultaSeleccionada.categoria}
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                                {consultaSeleccionada.nombre}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                                {consultaSeleccionada.descripcion}
                            </p>
                        </div>

                        {/* Filtros / Parámetros amigables si aplican */}
                        {(consultaSeleccionada.requiereParametro || consultaSeleccionada.requiereDobleParametro) && (
                            <form onSubmit={handleActualizarParametros} style={{ marginTop: '16px', background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                                    Filtrar por:
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '180px' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'capitalize' }}>
                                            {consultaSeleccionada.paramNombre}
                                        </label>
                                        <input
                                            type="text"
                                            value={param1}
                                            onChange={e => setParam1(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.85rem'
                                            }}
                                        />
                                    </div>

                                    {consultaSeleccionada.requiereDobleParametro && (
                                        <div style={{ flex: 1, minWidth: '180px' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'capitalize' }}>
                                                {consultaSeleccionada.paramNombre2}
                                            </label>
                                            <input
                                                type="text"
                                                value={param2}
                                                onChange={e => setParam2(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '7px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.85rem'
                                                }}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={cargando}
                                        style={{ padding: '7px 16px', fontSize: '0.85rem' }}
                                    >
                                        {cargando ? 'Buscando...' : 'Aplicar filtro'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Resultados Visuales en Tabla Limpia */}
                    <div className="table-card" style={{ padding: '20px', minHeight: '340px' }}>
                        
                        {/* Cabecera del panel de resultados */}
                        <div style={{ marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                                Resultados
                            </div>
                        </div>

                        {/* Error si ocurre */}
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: '14px' }}>
                                <div><strong>Aviso:</strong> {error}</div>
                            </div>
                        )}

                        {/* Contenido de resultados */}
                        {cargando ? (
                            <div className="loading-state" style={{ padding: '60px 20px' }}>
                                <div className="spinner"></div>
                                <p style={{ color: '#64748b', marginTop: '12px' }}>Consultando información...</p>
                            </div>
                        ) : resultado === null ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                                    Selecciona una consulta de la lista para ver los datos.
                                </p>
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
