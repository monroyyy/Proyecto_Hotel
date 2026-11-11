/**
 * Mapeo centralizado de imágenes del portal del huésped de Hotel Paraíso.
 * Diseñado según los lineamientos de DESIGN.md:
 * - Formato WebP optimizado (calidad 80) para producción.
 * - Respaldo en JPG original de alta fidelidad.
 * - Textos alternativos en español descriptivos para accesibilidad.
 */

export const IMAGENES_HOTEL = {
  heroCosta: {
    id: 'hero-costa',
    webp: '/img/hero-costa.webp',
    jpg: '/img/originals/hero-costa.jpg',
    alt: 'Terraza y alberca infinita de Hotel Paraíso frente al océano Pacífico durante el atardecer dorado',
    aspectRatio: '16/9'
  },
  suiteVistaMar: {
    id: 'suite-vista-mar',
    webp: '/img/suite-vista-mar.webp',
    jpg: '/img/originals/suite-vista-mar.jpg',
    alt: 'Suite de lujo con cama king size vestida de lino blanco y terraza privada con vista panorámica al mar',
    aspectRatio: '16/10'
  },
  habitacionFamiliar: {
    id: 'habitacion-familiar',
    webp: '/img/habitacion-familiar.webp',
    jpg: '/img/originals/habitacion-familiar.jpg',
    alt: 'Habitación familiar luminosa con dos camas matrimoniales y sillón de descanso en tonos arena y madera',
    aspectRatio: '16/10'
  },
  habitacionDoble: {
    id: 'habitacion-doble',
    webp: '/img/habitacion-doble.webp',
    jpg: '/img/originals/habitacion-doble.jpg',
    alt: 'Habitación matrimonial acogedora con ropa de cama blanca y cabecera de madera natural',
    aspectRatio: '16/10'
  },
  habitacionEjecutiva: {
    id: 'habitacion-ejecutiva',
    webp: '/img/habitacion-ejecutiva.webp',
    jpg: '/img/originals/habitacion-ejecutiva.jpg',
    alt: 'Habitación ejecutiva sobria con escritorio de trabajo, luz natural y detalles en terracota',
    aspectRatio: '16/10'
  },
  alberca: {
    id: 'alberca',
    webp: '/img/alberca.webp',
    jpg: '/img/originals/alberca.jpg',
    alt: 'Alberca infinita al amanecer con camastros de madera y vista despejada al horizonte marino',
    aspectRatio: '16/10'
  },
  restaurante: {
    id: 'restaurante',
    webp: '/img/restaurante.webp',
    jpg: '/img/originals/restaurante.jpg',
    alt: 'Terraza gastronómica al aire libre frente a la playa con mesas dispuestas bajo luz de atardecer',
    aspectRatio: '16/10'
  },
  recepcion: {
    id: 'recepcion',
    webp: '/img/recepcion.webp',
    jpg: '/img/originals/recepcion.jpg',
    alt: 'Lobby abierto de arquitectura costera con plantas tropicales, acabados de cantera y vigas de madera',
    aspectRatio: '16/10'
  }
};

export default IMAGENES_HOTEL;
