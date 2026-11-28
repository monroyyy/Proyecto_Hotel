import React from 'react';
import { ESTADOS_MEXICO } from '../data/mexicoGeoData';

// Proyección lineal calibrada respecto a los 5 pines originales sobre el viewBox 793x498
const proyectarCoordenadas = (latitud, longitud) => {
    const lat = Number(latitud);
    const lng = Number(longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const x = Math.max(12, Math.min(781, Math.round((23.7984 * lng + 2838.2348) * 10) / 10));
    const y = Math.max(12, Math.min(486, Math.round((-25.0843 * lat + 856.3847) * 10) / 10));
    return { x, y };
};

const obtenerClimaReferencia = (hotel) => {
    const txt = `${hotel?.ciudad || ''} ${hotel?.nombre || ''}`.toLowerCase();
    if (txt.includes('canc')) return '28°C · Soleado';
    if (txt.includes('ciudad de m') || txt.includes('cdmx') || txt.includes('ejecutivo')) return '22°C · Templado';
    if (txt.includes('acapulco') || txt.includes('costa')) return '30°C · Cálido';
    if (txt.includes('guadalajara') || txt.includes('arcos')) return '26°C · Despejado';
    if (txt.includes('atlacomulco') || txt.includes('uaem')) return '19°C · Fresco';
    return hotel?.ciudad || 'México';
};

/**
 * MexicoMicroMap.jsx
 * Micro-radar cartográfico para geolocalización de las propiedades de Hotel Paraíso.
 * Proyecta cada hotel desde sus coordenadas reales (latitud, longitud); si un hotel
 * carece de coordenadas, no dibuja su pin.
 */
export default function MexicoMicroMap({ activeHotel, hotels = [], onSelectHotel }) {
    const puntosDestinos = (Array.isArray(hotels) ? hotels : [])
        .map((h) => {
            if (h?.latitud == null || h?.longitud == null || h.latitud === '' || h.longitud === '') {
                return null;
            }
            const pos = proyectarCoordenadas(h.latitud, h.longitud);
            if (!pos) return null;
            return {
                idHotel: h.idHotel,
                nombre: h.ciudad || h.nombre || 'Sede',
                hotelNombre: h.nombre,
                x: pos.x,
                y: pos.y,
                clima: obtenerClimaReferencia(h)
            };
        })
        .filter(Boolean);

    const activeId = activeHotel?.idHotel;
    const puntoActivo = puntosDestinos.find((p) => p.idHotel === activeId) || null;
    const etiquetaAria = activeHotel?.ciudad || activeHotel?.nombre || 'República Mexicana';

    return (
        <div className="hp-micromap-card" role="region" aria-label={`Ubicación geográfica: ${etiquetaAria}`}>
            {/* Chip de ubicación / referencia */}
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
                <span>{puntoActivo ? puntoActivo.clima : obtenerClimaReferencia(activeHotel)}</span>
            </div>

            <svg
                viewBox="0 0 793 498"
                className="hp-micromap-svg"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="mexicoSandstoneGrad" x1="10%" y1="10%" x2="90%" y2="90%">
                        <stop offset="0%" stopColor="#f5ebd8" />
                        <stop offset="50%" stopColor="#e6d2b5" />
                        <stop offset="100%" stopColor="#d4ba94" />
                    </linearGradient>

                    <radialGradient id="mexicoAuraGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(184, 93, 56, 0.85)" />
                        <stop offset="45%" stopColor="rgba(184, 93, 56, 0.4)" />
                        <stop offset="80%" stopColor="rgba(184, 93, 56, 0.1)" />
                        <stop offset="100%" stopColor="rgba(184, 93, 56, 0)" />
                    </radialGradient>

                    <filter id="mexicoPinShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="rgba(0,0,0,0.38)" />
                    </filter>
                </defs>

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

                <g className="hp-micromap-pins-layer">
                    {puntosDestinos.map((pto) => {
                        const esActivo = pto.idHotel === activeId;
                        return (
                            <g
                                key={pto.idHotel}
                                data-hotel-id={pto.idHotel}
                                className={`hp-micromap-pin-group ${esActivo ? 'is-active' : ''}`}
                                transform={`translate(${pto.x}, ${pto.y})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectHotel) onSelectHotel(pto.idHotel);
                                }}
                                style={{ cursor: 'pointer' }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Seleccionar destino: ${pto.nombre}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (onSelectHotel) onSelectHotel(pto.idHotel);
                                    }
                                }}
                            >
                                <title>{pto.nombre} · {pto.clima}</title>

                                <circle cx="0" cy="0" r="40" fill="transparent" />

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

                                <circle
                                    className="hp-micromap-pin-dot"
                                    cx="0"
                                    cy="0"
                                    r={esActivo ? 15 : 10.5}
                                    fill="#ffffff"
                                    stroke={esActivo ? '#b85d38' : '#16324f'}
                                    strokeWidth={esActivo ? 3.8 : 2.4}
                                    filter="url(#mexicoPinShadow)"
                                />

                                {esActivo && (
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="5"
                                        fill="#b85d38"
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
