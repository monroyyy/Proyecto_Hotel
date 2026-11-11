# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **Frontend:** React 19, Vite, CSS moderno modular, Lucide Icons.
- **Backend:** Java 17, Spring Boot 3.3.4, Spring Security 6 (JWT sin estado), Spring Data JPA.
- **Base de Datos:** MySQL 8.
- **IA Integrada:** Spring AI con orquestación dual (Google Gemini Flash & Ollama local).

## Users

### 1. Superficie Brand (Portal del Huésped y Autenticación)
- **Audiencia principal:** Turistas nacionales de 25 a 55 años que planean sus vacaciones o escapadas de fin de semana y realizan la búsqueda, cotización y reservación desde sus teléfonos móviles.
- **Situación y contexto:** Navegan en momentos de ocio o descanso (transporte, sofá, descansos laborales) en dispositivos móviles táctiles de 360px a 430px de ancho con conectividad variable.
- **Trabajo por hacer (Job to be done):**
  - Encontrar destinos hoteleros en las costas y ciudades emblemáticas de México.
  - Visualizar suites y habitaciones reales con detalles claros de capacidad, amenidades y fotografías de calidad.
  - Reservar en pocos pasos con total transparencia en precios por noche, desglose de impuestos y política de reembolso.
  - Consultar y gestionar sus reservaciones activas desde cualquier lugar.

### 2. Superficie Product (Sistema de Gestión Hotelera / Backoffice)
- **Audiencia principal:** Recepcionistas, supervisores de piso y administradores generales del hotel.
- **Situación y contexto:** Operan durante turnos completos de 8 horas frente a computadoras de escritorio en la recepción o estaciones administrativas, interactuando simultáneamente con huéspedes en el lobby, llamadas telefónicas y auditorías de inventario.
- **Trabajo por hacer (Job to be done):**
  - Consultar en tiempo real la disponibilidad y ocupación de habitaciones.
  - Registrar nuevas reservaciones, pagos y cancelaciones de manera ágil y sin fricciones.
  - Modificar fechas, tarifas o estados operativos de huéspedes.
  - Administrar el catálogo de hoteles, tipos de habitaciones y cuentas de usuario con roles y permisos específicos.

## Product Purpose
"Hotel Paraíso" es una plataforma integral de reservaciones y gestión hotelera para una cadena ficticia de resorts y hoteles de playa en México, desarrollada como proyecto universitario de alta fidelidad técnica y de diseño. Su propósito es ofrecer una experiencia contemporánea y humana: una superficie de marca costera, orgánica y cálida para el turista móvil, y una superficie de producto densa, precisa y sobria para el personal administrativo que opera el negocio día a día.

## Positioning
A diferencia de los portales de agencias de viaje online (OTAs) genéricas repletas de ruido publicitario, y lejos de los anticuados sistemas PMS hoteleros con tablas grises inaccesibles, Hotel Paraíso unifica en una sola aplicación reactiva:
1. Una experiencia de marca propia que transmite hospitalidad mexicana frente al mar.
2. Un panel administrativo de alta densidad con control quirúrgico de estados, inventarios y finanzas en tiempo real.

## Operating Context
- **Entorno del Huésped:** Dispositivos móviles en orientación vertical, interacción táctil, interfaces ligeras con fotografía evocadora, tipografía de alta legibilidad y llamadas a la acción directas ("Reservar").
- **Entorno del Administrador:** Pantallas de escritorio (1080p+), uso combinado de teclado y mouse, necesidad de lectura rápida de tablas de datos, cifras monetarias con alineación vertical perfecta (números tabulares) y estados semánticos que previenen sobreventas o errores de check-in.

## Capabilities and Constraints
- **Capacidades funcionales:**
  - Exploración de hoteles por destino (Cancún, Acapulco, Guadalajara, CDMX).
  - Catálogo de habitaciones con filtro reactivo por categoría y capacidad.
  - Flujo de cotización con cálculo exacto por noche y políticas de reembolso transparentes.
  - Modales unificados accesibles (createPortal, tecla Esc, bloqueo de scroll corporal).
  - Consola administrativa con módulos de Reservaciones, Habitaciones, Hoteles, Categorías, Consultas SQL dinámicas y Gestión de Usuarios.
  - Asistente virtual con IA integrado: consultas contextuales para el huésped y selector de motor (Gemini / Ollama) exclusivo para administradores.
- **Restricciones y compromisos:**
  - **Hotel ficticio:** Proyecto académico sin marca comercial previa; la identidad se construye desde cero mediante un wordmark tipográfico puro.
  - **Sin plantillas genéricas de SaaS:** Prohibido el uso de degradados morados, tarjetas idénticas de 3 columnas con iconos flotantes o heroes centrados cliché.
  - **Tipografía restringida:** Obligatorio el uso de serif distintiva para encabezados y sans limpia para textos. Prohibido expresamente Inter, Arial y fuentes genéricas del sistema.
  - **Paleta de identidad:** Costa mexicana cálida (arena, terracota, verde palma, azul profundo). Prohibido el azul corporativo (#2563eb) como color identitario.

## Brand Commitments
- **Nombre:** Hotel Paraíso.
- **Identidad visual:** Wordmark tipográfico sobrio y atemporal ("Hotel Paraíso") complementado por el descriptor "Costa & Hospitalidad".
- **Idioma y Tono:** Español de México. Empático, profesional, hospitalario y claro. Sin tecnicismos de programación ni jerga hotelera incomprensible ("Reservaciones", "Habitaciones", "Estadía", "Impuestos incluidos").
- **Atmósfera:** Inspirada en la arquitectura costera mexicana contemporánea (Oaxaca, Riviera Maya, Costalegre): materiales naturales, textura arenosa, terracota y vegetación tropical.

## Evidence on Hand
- Base de datos relacional MySQL 8 con esquema normalizado de hoteles, habitaciones, tipos y reservaciones.
- Suites y destinos basados en geografía mexicana real.
- Suite de pruebas de seguridad y autorización Spring Boot (`AuthAndSecurityTest`).
- Galería curada de imágenes fotográficas arquitectónicas de alta resolución.

## Product Principles
1. **Hospitalidad móvil ante todo:** Cada pantalla orientada al huésped debe responder a la pregunta "¿dónde descansaré y cuánto costará?" en menos de tres segundos, priorizando fotos reales, fechas claras y un CTA unificado.
2. **Claridad operativa sin ruido:** En la consola de gestión, la sobriedad manda. La densidad de datos, la legibilidad tipográfica y la precisión de los estados semánticos están por encima de cualquier floritura decorativa.
3. **Mismo origen, diferente función:** Ambas superficies comparten el mismo wordmark y raíces cromáticas, pero la superficie Brand es cálida y espaciosa mientras que la superficie Product es fría, densa y tabular.
4. **Seguridad y verdad en datos:** Ningún cálculo financiero o cambio de estado de reservación ocurre en el frontend sin la validación rigurosa del backend.

## Accessibility & Inclusion
- Estándar objetivo: WCAG 2.1 nivel AA.
- Contraste mínimo de texto: 4.5:1 para cuerpo de texto y 3:1 para títulos y elementos de interfaz.
- Teclado y lectores de pantalla: Trampas de foco en modales, navegación por teclado completa y anuncios semánticos de errores.
- Dimensiones mínimas de toque: 44×44px en controles móviles del huésped.
- Números tabulares monospaciados para evitar desplazamientos visuales en listas de precios e importes.
