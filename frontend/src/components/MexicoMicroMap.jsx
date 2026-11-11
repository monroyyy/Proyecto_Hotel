import React from 'react';
import { ESTADOS_MEXICO } from '../data/mexicoGeoData';

/**
 * MexicoMicroMap.jsx
 * Micro-radar cartográfico de lujo para geolocalización de las propiedades de Hotel Paraíso.
 * Cartografía vectorial auténtica de la República Mexicana (32 entidades federativas),
 * tarjeta frosted glass con chip de clima integrado y halo de radar para el destino activo.
 */
export default function MexicoMicroMap({ activeHotel, hotels = [], onSelectHotel }) {
    const ciudadActiva = (activeHotel?.ciudad || '').toLowerCase();
    const nombreActivo = (activeHotel?.nombre || '').toLowerCase();

    // Coordenadas geográficas exactas en la proyección oficial (viewBox 0 0 793 498)
    const puntosDestinos = [
        {
            id: 'cancun',
            nombre: 'Cancún',
            match: ['canc', 'paraiso cancun', 'resort insignia', 'quintana'],
            x: 772,
            y: 326,
            clima: '28°C · Soleado'
        },
        {
            id: 'cdmx',
            nombre: 'Ciudad de México',
            match: ['ciudad de m', 'ejecutivo', 'cdmx', 'reforma', 'valle'],
            x: 483,
            y: 374,
            clima: '22°C · Templado'
        },
        {
            id: 'acapulco',
            nombre: 'Acapulco',
            match: ['acapulco', 'costa azul', 'bahia', 'guerrero'],
            x: 454,
            y: 432,
            clima: '30°C · Cálido'
        },
        {
            id: 'guadalajara',
            nombre: 'Guadalajara',
            match: ['guadalajara', 'arcos', 'jalisco'],
            x: 382,
            y: 334,
            clima: '26°C · Despejado'
        },
        {
            id: 'atlacomulco',
            nombre: 'Atlacomulco',
            match: ['atlacomulco', 'uaem', 'valle', 'méxico'],
            x: 462,
            y: 360,
            clima: '19°C · Fresco'
        }
    ];

    const puntoActivo = puntosDestinos.find(p =>
        p.match.some(m => ciudadActiva.includes(m) || nombreActivo.includes(m))
    ) || puntosDestinos[0];

    return (
        <div className="hp-micromap-card" role="region" aria-label={`Ubicación geográfica: ${puntoActivo.nombre}`}>
            {/* Chip de Clima integrado en la esquina superior derecha (flota libre sobre el Golfo de México) */}
            <div className="hp-micromap-weather-pill">
                <svg
                    className="hp-micromap-sun-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <span>{puntoActivo.clima}</span>
            </div>

            {/* Mapa vectorial geográfico de México con preservación estricta de proporciones */}
            <svg
                viewBox="0 0 793 498"
                className="hp-micromap-svg"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <defs>
                    {/* Gradiente cálido de piedra arenisca para el territorio nacional */}
                    <linearGradient id="mexicoSandstoneGrad" x1="10%" y1="10%" x2="90%" y2="90%">
                        <stop offset="0%" stopColor="#eedecf" />
                        <stop offset="50%" stopColor="#e3cca9" />
                        <stop offset="100%" stopColor="#d5bc96" />
                    </linearGradient>

                    {/* Aura radial suave en terracota translúcido para el destino activo */}
                    <radialGradient id="mexicoAuraGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(215, 85, 50, 0.78)" />
                        <stop offset="45%" stopColor="rgba(215, 85, 50, 0.35)" />
                        <stop offset="80%" stopColor="rgba(215, 85, 50, 0.08)" />
                        <stop offset="100%" stopColor="rgba(215, 85, 50, 0)" />
                    </radialGradient>

                    <filter id="mexicoPinShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="rgba(0,0,0,0.38)" />
                    </filter>
                </defs>

                {/* Las 32 Entidades Federativas con trazo geográfico real y divisiones sutiles */}
                <g className="hp-micromap-states-group">
                    {ESTADOS_MEXICO.map((estado) => (
                        <path
                            key={estado.id}
                            id={`edo-${estado.id}`}
                            d={estado.path}
                            className="hp-micromap-state-path"
                        />
                    ))}
                </g>

                {/* Pines de geolocalización de hoteles (visibles, táctiles y con aura concéntrica) */}
                <g className="hp-micromap-pins-layer">
                    {puntosDestinos.map((pto) => {
                        const esActivo = pto.id === puntoActivo.id;
                        return (
                            <g
                                key={pto.id}
                                className={`hp-micromap-pin-group ${esActivo ? 'is-active' : ''}`}
                                transform={`translate(${pto.x}, ${pto.y})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectHotel) onSelectHotel(pto.id);
                                }}
                                style={{ cursor: 'pointer' }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Seleccionar destino: ${pto.nombre}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (onSelectHotel) onSelectHotel(pto.id);
                                    }
                                }}
                            >
                                <title>{pto.nombre} · {pto.clima}</title>

                                {/* Hit-area transparente amplia para facilitar el clic en cualquier pantalla */}
                                <circle
                                    cx="0"
                                    cy="0"
                                    r="40"
                                    fill="transparent"
                                />

                                {/* Halo radial difuso con pulsación concéntrica nativa SVG (siempre perfectamente centrado) */}
                                {esActivo && (
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="36"
                                        fill="url(#mexicoAuraGlow)"
                                        pointerEvents="none"
                                    >
                                        <animate
                                            attributeName="r"
                                            values="32;56;32"
                                            dur="2.4s"
                                            repeatCount="indefinite"
                                        />
                                        <animate
                                            attributeName="opacity"
                                            values="0.9;0.35;0.9"
                                            dur="2.4s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                )}

                                {/* Pin circular blanco nítido y grande con relieve */}
                                <circle
                                    className="hp-micromap-pin-dot"
                                    cx="0"
                                    cy="0"
                                    r={esActivo ? 15 : 10.5}
                                    fill="#ffffff"
                                    stroke={esActivo ? '#c4553a' : '#735034'}
                                    strokeWidth={esActivo ? 3.8 : 2.4}
                                    filter="url(#mexicoPinShadow)"
                                />

                                {/* Núcleo terracota en el pin activo */}
                                {esActivo && (
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="5"
                                        fill="#c4553a"
                                        pointerEvents="none"
                                    />
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}
