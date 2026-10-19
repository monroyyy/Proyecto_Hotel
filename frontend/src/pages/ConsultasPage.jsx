import React, { useState } from 'react';
import { Search, Play, Copy, Check, Terminal, ExternalLink, Filter, Database, CheckCircle2, AlertCircle } from 'lucide-react';

const LISTA_CONSULTAS = [
    // Consultas de Hotel
    {
        id: 1,
        categoria: 'Hoteles',
        nombre: '1. Mostrar todos los hoteles',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles',
        descripcion: 'Obtiene el listado completo de sedes hoteleras registradas.',
        requiereParametro: false
    },
    {
        id: 2,
        categoria: 'Hoteles',
        nombre: '2. Hoteles actualmente activos',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/activos',
        descripcion: 'Filtra únicamente los hoteles con estado activo = true.',
        requiereParametro: false
    },
    {
        id: 3,
        categoria: 'Hoteles',
        nombre: '3. Hoteles en una ciudad específica',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/ciudad/{ciudad}',
        paramNombre: 'ciudad',
        paramDefault: 'Ciudad de México',
        descripcion: 'Busca los hoteles ubicados en una ciudad determinada.',
        requiereParametro: true
    },
    {
        id: 4,
        categoria: 'Hoteles',
        nombre: '4. Total de habitaciones por hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/total-habitaciones',
        descripcion: 'Agrupa y contabiliza cuántas habitaciones pertenecen a cada hotel.',
        requiereParametro: false
    },

    // Consultas de Tipo Habitación
    {
        id: 5,
        categoria: 'Tipos de Habitación',
        nombre: '5. Tipos de habitación existentes',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos',
        descripcion: 'Lista todas las categorías de habitaciones creadas en el sistema.',
        requiereParametro: false
    },
    {
        id: 6,
        categoria: 'Tipos de Habitación',
        nombre: '6. Habitaciones para 2 personas',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/capacidad-2',
        descripcion: 'Obtiene las categorías configuradas con capacidad exacta de 2 huéspedes.',
        requiereParametro: false
    },
    {
        id: 7,
        categoria: 'Tipos de Habitación',
        nombre: '7. Precio promedio de las habitaciones',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/precio-promedio',
        descripcion: 'Calcula el promedio (AVG) de los precios base por noche.',
        requiereParametro: false
    },
    {
        id: 8,
        categoria: 'Tipos de Habitación',
        nombre: '8. Tipos con precio menor a cierta cantidad',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/menor-que/{precio}',
        paramNombre: 'precio',
        paramDefault: '1500',
        descripcion: 'Filtra categorías con precio base estrictamente menor al monto dado.',
        requiereParametro: true
    },
    {
        id: 9,
        categoria: 'Tipos de Habitación',
        nombre: '9. Tipos con precio mayor a cierta cantidad',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/mayor-que/{precio}',
        paramNombre: 'precio',
        paramDefault: '1000',
        descripcion: 'Filtra categorías con precio base estrictamente mayor al monto dado.',
        requiereParametro: true
    },
    {
        id: 10,
        categoria: 'Tipos de Habitación',
        nombre: '10. Tipo de habitación más barato',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/mas-barato',
        descripcion: 'Obtiene el registro con el menor precio base del catálogo.',
        requiereParametro: false
    },
    {
        id: 11,
        categoria: 'Tipos de Habitación',
        nombre: '11. Tipo de habitación más caro',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/mas-caro',
        descripcion: 'Obtiene el registro con el mayor precio base del catálogo.',
        requiereParametro: false
    },
    {
        id: 12,
        categoria: 'Tipos de Habitación',
        nombre: '12. Total de tipos de habitación',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/total-count',
        descripcion: 'Retorna el conteo numérico total de categorías registradas.',
        requiereParametro: false
    },
    {
        id: 13,
        categoria: 'Tipos de Habitación',
        nombre: '13. Capacidad máxima alojable',
        metodo: 'GET',
        endpoint: '/api/consultas/tipos/capacidad-maxima',
        descripcion: 'Determina cuál es el número máximo de personas que soporta una sola habitación.',
        requiereParametro: false
    },

    // Consultas de Habitación
    {
        id: 14,
        categoria: 'Habitaciones',
        nombre: '14. Habitaciones disponibles',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/disponibles',
        descripcion: 'Lista todas las habitaciones cuyo estado es actualmente "Disponible".',
        requiereParametro: false
    },
    {
        id: 15,
        categoria: 'Habitaciones',
        nombre: '15. Habitaciones agrupadas por hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/por-hotel',
        descripcion: 'Consulta con JOIN que muestra habitación, hotel, piso y estado.',
        requiereParametro: false
    },
    {
        id: 16,
        categoria: 'Habitaciones',
        nombre: '16. Habitaciones con su tipo y precio',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/tipo-precio',
        descripcion: 'Consulta relacional completa (Habitación + Hotel + Tipo + Precio base).',
        requiereParametro: false
    },
    {
        id: 17,
        categoria: 'Habitaciones',
        nombre: '17. Conteo de disponibles por hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/hoteles/habitaciones-disponibles-count',
        descripcion: 'Agrupa y cuenta cuántos cuartos disponibles tiene cada hotel.',
        requiereParametro: false
    },
    {
        id: 18,
        categoria: 'Habitaciones',
        nombre: '18. Disponibles en un hotel específico',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/disponibles/{nombreHotel}',
        paramNombre: 'nombreHotel',
        paramDefault: 'Hotel Paraíso',
        descripcion: 'Filtra cuartos disponibles pertenecientes al hotel especificado.',
        requiereParametro: true
    },
    {
        id: 19,
        categoria: 'Habitaciones',
        nombre: '19. Conteo de habitaciones en mantenimiento',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/mantenimiento-count',
        descripcion: 'Retorna el número de habitaciones inhabilitadas por mantenimiento.',
        requiereParametro: false
    },
    {
        id: 20,
        categoria: 'Habitaciones',
        nombre: '20. Habitaciones para 4 huéspedes',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/capacidad-4',
        descripcion: 'Muestra las habitaciones asignadas a un tipo con capacidad para 4 personas.',
        requiereParametro: false
    },
    {
        id: 21,
        categoria: 'Habitaciones',
        nombre: '21. Habitaciones ocupadas actualmente',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/ocupadas',
        descripcion: 'Lista todas las habitaciones cuyo estado sea "Ocupada".',
        requiereParametro: false
    },
    {
        id: 22,
        categoria: 'Habitaciones',
        nombre: '22. Habitaciones en un piso específico',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/piso/{piso}',
        paramNombre: 'piso',
        paramDefault: '1',
        descripcion: 'Filtra las habitaciones por nivel de piso (ej. piso 1 = planta baja).',
        requiereParametro: true
    },
    {
        id: 23,
        categoria: 'Habitaciones',
        nombre: '23. Habitaciones en un piso de un hotel',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/hotel/{nombreHotel}/piso/{piso}',
        paramNombre: 'nombreHotel',
        paramDefault: 'Hotel Paraíso',
        paramNombre2: 'piso',
        paramDefault2: '1',
        descripcion: 'Filtra habitaciones coincidentes con hotel y piso simultáneamente.',
        requiereDobleParametro: true
    },
    {
        id: 24,
        categoria: 'Habitaciones',
        nombre: '24. Total de habitaciones en toda la cadena',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/total-count',
        descripcion: 'Suma el inventario global de cuartos de todos los hoteles.',
        requiereParametro: false
    },
    {
        id: 25,
        categoria: 'Habitaciones',
        nombre: '25. Ingreso potencial máximo por noche',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/ingreso-potencial',
        descripcion: 'Calcula la suma total del precio base de todas las habitaciones.',
        requiereParametro: false
    },
    {
        id: 26,
        categoria: 'Habitaciones',
        nombre: '26. Buscar habitación por su número',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/numero/{numero}',
        paramNombre: 'numero',
        paramDefault: '101',
        descripcion: 'Busca los cuartos que tengan el número de puerta indicado.',
        requiereParametro: true
    },
    {
        id: 27,
        categoria: 'Habitaciones',
        nombre: '27. Habitaciones por tipo específico',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/tipo/{tipoNombre}',
        paramNombre: 'tipoNombre',
        paramDefault: 'Habitación Doble',
        descripcion: 'Lista las habitaciones que coinciden con el nombre de categoría.',
        requiereParametro: true
    },
    {
        id: 28,
        categoria: 'Habitaciones',
        nombre: '28. Resumen de habitaciones por estado',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/resumen-estados',
        descripcion: 'Agrupa y cuenta cuántas hay Disponibles, Ocupadas y en Mantenimiento.',
        requiereParametro: false
    },
    {
        id: 29,
        categoria: 'Habitaciones',
        nombre: '29. Habitaciones en una ciudad específica',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/ciudad/{ciudad}',
        paramNombre: 'ciudad',
        paramDefault: 'Ciudad de México',
        descripcion: 'Obtiene las habitaciones asociadas a hoteles de una ciudad dada.',
        requiereParametro: true
    },
    {
        id: 30,
        categoria: 'Habitaciones',
        nombre: '30. Disponibles ordenadas de menor a mayor precio',
        metodo: 'GET',
        endpoint: '/api/consultas/habitaciones/disponibles/ordenadas-por-precio',
        descripcion: 'Lista cuartos libres ordenados ascendente por precioBase (ORDER BY).',
        requiereParametro: false
    }
];

export default function ConsultasPage() {
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');
    const [busqueda, setBusqueda] = useState('');
    const [consultaSeleccionada, setConsultaSeleccionada] = useState(LISTA_CONSULTAS[0]);
    const [paramValor, setParamValor] = useState(LISTA_CONSULTAS[0].paramDefault || '');
    const [paramValor2, setParamValor2] = useState(LISTA_CONSULTAS[0].paramDefault2 || '');
    
    const [resultado, setResultado] = useState(null);
    const [ejecutando, setEjecutando] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [copiado, setCopiado] = useState(false);

    const hostBase = 'http://localhost:8080';

    const seleccionarConsulta = (c) => {
        setConsultaSeleccionada(c);
        setParamValor(c.paramDefault || '');
        setParamValor2(c.paramDefault2 || '');
        setResultado(null);
        setErrorMsg('');
    };

    const construirUrlFinal = () => {
        let ep = consultaSeleccionada.endpoint;
        if (consultaSeleccionada.requiereDobleParametro) {
            ep = ep.replace(`{${consultaSeleccionada.paramNombre}}`, encodeURIComponent(paramValor || ''))
                   .replace(`{${consultaSeleccionada.paramNombre2}}`, encodeURIComponent(paramValor2 || ''));
        } else if (consultaSeleccionada.requiereParametro) {
            ep = ep.replace(`{${consultaSeleccionada.paramNombre}}`, encodeURIComponent(paramValor || ''));
        }
        return `${hostBase}${ep}`;
    };

    const ejecutarConsulta = async () => {
        const url = construirUrlFinal();
        setEjecutando(true);
        setErrorMsg('');
        setResultado(null);

        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            }
            const data = await resp.json();
            setResultado(data);
        } catch (err) {
            setErrorMsg(err.message || 'Error de conexión con el backend.');
        } finally {
            setEjecutando(false);
        }
    };

    const copiarAlPortapapeles = (texto) => {
        navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const consultasFiltradas = LISTA_CONSULTAS.filter(c => {
        const coincideCat = filtroCategoria === 'Todas' || c.categoria === filtroCategoria;
        const coincideTxt = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                            c.endpoint.toLowerCase().includes(busqueda.toLowerCase());
        return coincideCat && coincideTxt;
    });

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tester de Consultas REST</h1>
                    <p className="page-description">
                        Banco interactivo de las 30 consultas a la base de datos (con URLs listas para copiar a Postman).
                    </p>
                </div>
                <div className="page-header-actions">
                    <span className="badge-total" style={{ padding: '6px 14px', background: '#e0f2fe', color: '#0369a1', borderRadius: '20px', fontWeight: 600, fontSize: '0.88rem' }}>
                        30 Endpoints Disponibles
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Columna Izquierda: Lista de Consultas */}
                <div className="table-card" style={{ padding: '16px', maxHeight: '780px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
                            <input
                                type="text"
                                placeholder="Buscar consulta o ruta..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>

                    {/* Filtro por Categorías */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {['Todas', 'Hoteles', 'Tipos de Habitación', 'Habitaciones'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFiltroCategoria(cat)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: filtroCategoria === cat ? '#0284c7' : '#f1f5f9',
                                    color: filtroCategoria === cat ? '#fff' : '#475569'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Lista Scrolleable */}
                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {consultasFiltradas.map(c => {
                            const isSelected = consultaSeleccionada.id === c.id;
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => seleccionarConsulta(c)}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        border: isSelected ? '1px solid #0284c7' : '1px solid #f1f5f9',
                                        background: isSelected ? '#f0f9ff' : '#ffffff',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                                            {c.categoria}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                                            {c.metodo}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                                        {c.nombre}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                                        {c.endpoint}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Columna Derecha: Panel de Prueba y Postman */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Tarjeta de Detalles del Endpoint */}
                    <div className="table-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                                    {consultaSeleccionada.categoria}
                                </span>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 6px 0' }}>
                                    {consultaSeleccionada.nombre}
                                </h2>
                                <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0 }}>
                                    {consultaSeleccionada.descripcion}
                                </p>
                            </div>
                            <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.82rem' }}>
                                {consultaSeleccionada.metodo}
                            </span>
                        </div>

                        {/* Parámetros de Ruta si aplica */}
                        {(consultaSeleccionada.requiereParametro || consultaSeleccionada.requiereDobleParametro) && (
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                    PARÁMETROS DE LA CONSULTA:
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '160px' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                            {consultaSeleccionada.paramNombre}
                                        </label>
                                        <input
                                            type="text"
                                            value={paramValor}
                                            onChange={e => setParamValor(e.target.value)}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    {consultaSeleccionada.requiereDobleParametro && (
                                        <div style={{ flex: 1, minWidth: '160px' }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                                {consultaSeleccionada.paramNombre2}
                                            </label>
                                            <input
                                                type="text"
                                                value={paramValor2}
                                                onChange={e => setParamValor2(e.target.value)}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Barra de URL para Postman y Ejecutar */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1, background: '#0f172a', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
                                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {construirUrlFinal()}
                                </span>
                                <button
                                    onClick={() => copiarAlPortapapeles(construirUrlFinal())}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}
                                    title="Copiar para Postman"
                                >
                                    {copiado ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                                    <span style={{ color: copiado ? '#4ade80' : '#cbd5e1' }}>{copiado ? 'Copiado' : 'Copiar URL'}</span>
                                </button>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={ejecutarConsulta}
                                disabled={ejecutando}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', whiteSpace: 'nowrap' }}
                            >
                                <Play size={16} />
                                <span>{ejecutando ? 'Ejecutando...' : 'Ejecutar Consulta'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Panel de Resultado / Consola JSON */}
                    <div className="table-card" style={{ padding: '20px', minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                                <Terminal size={16} />
                                <span>Respuesta del Servidor (JSON)</span>
                            </div>
                            {resultado !== null && (
                                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                                    ✓ Respuesta recibida ({Array.isArray(resultado) ? `${resultado.length} registros` : typeof resultado === 'object' ? '1 objeto' : 'Valor escalar'})
                                </span>
                            )}
                        </div>

                        {errorMsg && (
                            <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                                <AlertCircle size={18} />
                                <div><strong>Error:</strong> {errorMsg}</div>
                            </div>
                        )}

                        <div style={{ flex: 1, background: '#1e293b', borderRadius: '8px', padding: '14px', overflowY: 'auto', maxHeight: '420px' }}>
                            {ejecutando ? (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                    Enviando petición a Spring Boot...
                                </div>
                            ) : resultado !== null ? (
                                <pre style={{ margin: 0, color: '#f8fafc', fontSize: '0.82rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {JSON.stringify(resultado, null, 2)}
                                </pre>
                            ) : (
                                <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', marginTop: '60px' }}>
                                    Haz clic en <strong>"Ejecutar Consulta"</strong> o copia la URL superior a <strong>Postman</strong> para ver la respuesta JSON de la base de datos.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
