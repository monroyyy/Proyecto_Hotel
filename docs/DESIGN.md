---
name: "Hotel Paraíso Design System"
description: "Identidad costera mexicana y sistema de diseño dual: marca cálida y orgánica para huéspedes, consola densa y sobria con neutros cálidos para administración."
colors:
  # Paleta Brand: Costa Mexicana Cálida
  brand-sand-light: "#fcfaf7"
  brand-sand-base: "#f5f0e8"
  brand-sand-muted: "#ede4d5"
  brand-terracotta: "#b85d38"
  brand-terracotta-hover: "#9e4e2d"
  brand-terracotta-deep: "#7e3c20"
  brand-terracotta-light: "#faebe5"
  brand-palm: "#2d5a43"
  brand-palm-leaf: "#3e7b5c"
  brand-palm-light: "#e8f3ed"
  brand-ocean: "#16324f"
  brand-ocean-dark: "#0f2338"
  brand-ocean-light: "#eaf0f6"
  
  # Paleta Product: Consola Administrativa Sobria (Neutros Pizarra Cálidos)
  admin-bg: "#121316"
  admin-surface: "#1a1b1f"
  admin-elevated: "#24262c"
  admin-border: "#383a42"
  admin-border-subtle: "#26282f"
  admin-text-main: "#f4f4f6"
  admin-text-muted: "#9a9ca6"
  admin-accent: "#3e7b5c"
  
  # Estados Semánticos Operativos (Backoffice y Auditoría)
  status-prereserva-text: "#b45309"
  status-prereserva-bg: "#fef3c7"
  status-prereserva-border: "#f59e0b"
  status-confirmada-text: "#2d5a43"
  status-confirmada-bg: "#d1fae5"
  status-confirmada-border: "#10b981"
  status-ocupada-text: "#16324f"
  status-ocupada-bg: "#e0f2fe"
  status-ocupada-border: "#3e7b5c"
  status-cancelada-text: "#b91c1c"
  status-cancelada-bg: "#fee2e2"
  status-cancelada-border: "#ef4444"

typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "3.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.45rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0.01em"
  body-dense:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
  tabular:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
    fontVariantNumeric: "tabular-nums"
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"

rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  full: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"

components:
  button-primary:
    backgroundColor: "{colors.brand-terracotta}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 22px"
  button-primary-hover:
    backgroundColor: "{colors.brand-terracotta-hover}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.brand-sand-base}"
    textColor: "{colors.brand-ocean}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "{colors.status-cancelada-text}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
---

# Design System: Hotel Paraíso

## Overview

"Hotel Paraíso" es un proyecto de hospitalidad costera mexicana con un modelo de interfaz dual:
1. **Superficie Brand (Portal del Huésped y Autenticación):** Diseñada prioritariamente para navegación móvil (smartphones de 360px a 430px de ancho). Su atmósfera es cálida, orgánica y espaciosa, evocando arenas doradas, artesanía en terracota, palmas tropicales y la calma del océano Pacífico. Su meta es inspirar confianza, facilitar la cotización y convertir visitas en reservaciones con un solo CTA claro: `"Reservar"`.
2. **Superficie Product (Sistema de Gestión y Backoffice):** Diseñada para recepcionistas y administradores que operan el sistema durante turnos intensivos frente a monitores de escritorio. Su atmósfera es densa, quirúrgica y sobria, construida sobre neutros de pizarra con matiz ligeramente cálido (evitando azules fríos corporativos), priorizando la legibilidad en pantallas de datos, el alineamiento perfecto de números tabulares y un único acento operativo en verde hoja de palma (`#3e7b5c`). El botón primario de acción en ambas superficies se mantiene unificado en terracota (`#b85d38`).

### Propuesta de Identidad: Wordmark Tipográfico
Al tratarse de una cadena hotelera ficticia sin imagotipo preexistente, la identidad se apoya en un **wordmark tipográfico puro**, prescindiendo de logotipos genéricos o íconos de camas de hotel:
- **Titular Principal:** `"Hotel Paraíso"` en tipografía serif `Fraunces`, en pesos refinados 500 a 600 con eje óptico activado.
- **Descriptor / Subtítulo:** `"COSTA & HOSPITALIDAD"` (en la superficie Brand) y `"GESTIÓN HOTELERA"` (en la superficie Product), compuesto en tipografía sans limpia (`Plus Jakarta Sans`), en caja alta con tracking espaciado (`letter-spacing: 0.12em`).

---

## Colors

El sistema cromático respeta la regla de **un solo color de acento por superficie**:
- **Superficie Brand:** Acento de acción en terracota artesanal (`#b85d38`), complementado por tonos de arena natural, verde palma y azul océano.
- **Superficie Product:** Acento de foco y selección en verde hoja de palma (`#3e7b5c`), montado sobre una escala de neutros de pizarra con matiz ligeramente cálido. El botón primario conserva el terracota (`#b85d38`) para mantener coherencia de marca global.

### 1. Paleta de Marca (Superficie Brand)
- **Arena Cálida:**
  - `brand-sand-light` (`#fcfaf7`): Fondo principal de la aplicación para el huésped.
  - `brand-sand-base` (`#f5f0e8`): Superficie de tarjetas secundarias, paneles de cotización y buscadores.
  - `brand-sand-muted` (`#ede4d5`): Divisores, líneas sutiles y bordes orgánicos.
- **Terracota Artesanal (Acento Principal de Acción):**
  - `brand-terracotta` (`#b85d38`): Color primordial para el botón `"Reservar"`, enlaces activos y acciones clave.
  - `brand-terracotta-hover` (`#9e4e2d`): Estado interactivo `hover`.
  - `brand-terracotta-deep` (`#7e3c20`): Estado `active` y sombras tonales.
  - `brand-terracotta-light` (`#faebe5`): Chips informativos, promociones y etiquetas suaves.
- **Verde Palma (Naturaleza y Confirmación):**
  - `brand-palm` (`#2d5a43`): Amenidades sustentables, confirmaciones de reserva y acentos botánicos.
  - `brand-palm-leaf` (`#3e7b5c`): Hover en elementos botánicos y acento institucional.
  - `brand-palm-light` (`#e8f3ed`): Fondo de confirmaciones exitosas en el portal.
- **Azul Océano Profundo (Contraste y Estabilidad):**
  - `brand-ocean` (`#16324f`): Color del texto principal para títulos y bloques de lectura en la superficie de marca. Evita el negro duro (`#000000`) manteniendo contraste accesible (11:1 sobre arena).
  - `brand-ocean-dark` (`#0f2338`): Fondos de alto contraste y pie de página de marca.

### 2. Paleta de Producto (Superficie Admin / Gestión - Neutros Pizarra Cálidos)
- **Escala de Pizarra Cálida:**
  - `admin-bg` (`#121316`): Fondo global de la consola operativa.
  - `admin-surface` (`#1a1b1f`): Barra de navegación superior, paneles de filtros y cabeceras de tablas.
  - `admin-elevated` (`#24262c`): Filas seleccionadas, popovers, modales de edición y tarjetas KPI.
  - `admin-border` (`#383a42`): Bordes de separación entre celdas, tarjetas e inputs.
  - `admin-border-subtle` (`#26282f`): Divisores interiores de baja prominencia.
  - `admin-text-main` (`#f4f4f6`): Texto principal de máxima legibilidad.
  - `admin-text-muted` (`#9a9ca6`): Metadatos, etiquetas secundarias y fechas en tablas.
- **Acento Operativo Único:**
  - `admin-accent` (`#3e7b5c` - Verde hoja de palma): Pestaña activa, anillos de foco accesibles e indicadores de selección en la consola de gestión.

### 3. Estados Semánticos (Claros, Unívocos y Adaptados por Superficie)
- **Pre-reserva:**
  - *Brand:* Texto `#b45309`, fondo `#fef3c7`, borde `#f59e0b`.
  - *Product:* Texto `#f59e0b`, fondo `rgba(245, 158, 11, 0.15)`, borde `rgba(245, 158, 11, 0.35)`.
- **Confirmada:**
  - *Brand:* Texto `#2d5a43`, fondo `#d1fae5`, borde `#10b981`.
  - *Product:* Texto `#10b981`, fondo `rgba(16, 185, 129, 0.15)`, borde `rgba(16, 185, 129, 0.35)`.
- **Ocupada:**
  - *Brand:* Texto `#16324f`, fondo `#e0f2fe`, borde `#3e7b5c`.
  - *Product:* Texto `#38bdf8`, fondo `rgba(56, 189, 248, 0.15)`, borde `rgba(56, 189, 248, 0.35)`.
- **Cancelada:**
  - *Brand:* Texto `#b91c1c`, fondo `#fee2e2`, borde `#ef4444`.
  - *Product:* Texto `#f87171`, fondo `rgba(239, 68, 68, 0.15)`, borde `rgba(239, 68, 68, 0.35)`.

---

## Typography

### Reglas de Selección Tipográfica
- **Prohibición estricta:** No usar `Inter`, `Arial`, `Helvetica`, `Segoe UI`, `Roboto` ni fuentes genéricas del sistema.
- **Titulares:** Fuente serif noble con calidez y carácter artesanal: **`Fraunces`** con pesos **500 a 600** (evitando el peso 700 para mantener elegancia y ligereza visual), con el eje óptico (`font-optical-sizing: auto; font-variation-settings: "opsz" auto`) activado.
- **Cuerpo y Controles:** Fuente sans limpia, moderna y con excelente ritmo de lectura: **`Plus Jakarta Sans`** (pesos 400, 500 y 600).
- **Números Tabulares (`.num`):** En tablas de reservaciones, precios por noche, montos totales, fechas y KPIs es **obligatorio** el uso de la clase utilitaria `.num` (`font-variant-numeric: tabular-nums`) para garantizar alineación vertical precisa.

### Escala Tipográfica
| Rol | Familia | Tamaño | Peso | Interlineado | Tracking | Aplicación |
|---|---|---|---|---|---|---|
| **Display** | Fraunces | 3.25rem (52px) | 600 | 1.15 | -0.015em | Hero del portal, titulares principales |
| **Headline** | Fraunces | 2.25rem (36px) | 600 | 1.20 | -0.01em | Nombres de suites destacadas, títulos de sección |
| **Title** | Fraunces | 1.45rem (23px) | 500 | 1.30 | 0.00em | Títulos de tarjetas de habitación y modales |
| **Body (Brand)** | Plus Jakarta Sans | 0.95rem (15px) | 400 | 1.55 | +0.01em | Descripciones de habitaciones, políticas y guía |
| **Body (Dense)** | Plus Jakarta Sans | 0.82rem (13px) | 400 | 1.40 | 0.00em | Celdas de tablas de gestión, formularios operativos |
| **Tabular (.num)** | Plus Jakarta Sans | 0.88rem (14px) | 600 | 1.40 | +0.02em | Precios, fechas, números de habitación, folios |
| **Label / Badge**| Plus Jakarta Sans | 0.72rem (11.5px)| 600 | 1.20 | +0.08em | Estados operativos (Pre-reserva, Confirmada), tags |

---

## Layout

### 1. Superficie Brand (Huéspedes y Autenticación)
- **Mentalidad Mobile-First:** El 80% de los huéspedes interactúa en vertical (viewport 360–430px). El layout prioriza una sola columna fluida en móvil, expandiéndose a un grid editorial de dos columnas en escritorio.
- **Ancho Máximo:** `1200px` con padding lateral de `1.25rem` en móvil y `2rem` en escritorio.

### 2. Superficie Product (Consola Administrativa)
- **Mentalidad Desktop-First:** Optimizado para pantallas de 1366px a 1920px con alta densidad de datos.
- **Ancho Máximo:** `1440px` fluido, padding lateral de `1.5rem`.
- **Estructura Operativa:** Barra superior compacta (`height: 52px`), fila de KPIs interactivos, barra contextual de filtros y tabla densa con filas de `40px` a `44px`.

---

## Elevation & Depth

- **Plano Base (Brand):** Superficie de arena clara (`#fcfaf7`) con tarjetas en `#ffffff` y sombra orgánica suave:
  `box-shadow: 0 4px 16px -2px rgba(22, 50, 79, 0.06), 0 2px 6px -1px rgba(22, 50, 79, 0.04)`.
- **Elevación Hover (Brand):**
  `box-shadow: 0 12px 28px -4px rgba(22, 50, 79, 0.12), 0 4px 10px -2px rgba(22, 50, 79, 0.06)`.
- **Estratificación Tonal (Product):** La consola administrativa no depende de sombras flotantes sino de bordes estructurales (`border: 1px solid var(--border)`) y capas tonales de pizarra cálida (`#121316` -> `#1a1b1f` -> `#24262c`).
- **Modales y Diálogos:** Fondo de oscurecimiento (`backdrop-filter: blur(8px)`, fondo `rgba(18, 19, 22, 0.7)`), con tarjeta modal centrada y sombra envolvente:
  `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45)`.

---

## Shapes

- **Bordes Redondeados (Border Radius):**
  - `rounded-sm` (`4px`): Controles de consola administrativa, celdas de tablas, inputs densos y badges operativos.
  - `rounded-md` (`8px`): Botones principales, inputs de huésped y tarjetas estándar.
  - `rounded-lg` (`16px`): Tarjetas de habitación del portal del huésped, contenedores modales y el buscador flotante.
  - `rounded-full` (`9999px`): Badges de estado, píldoras de filtro y botones de avatar.

---

## Components

### 1. Botones Unificados (`.btn`)
Una sola base universal con cuatro variantes funcionales precisas:
- **`btn-primary` (Llamada Principal):** Fondo terracota (`var(--btn-primary-bg)` / `#b85d38`), texto blanco, esquinas `8px`, relleno `10px 22px`. Foco visible con anillo de contraste (`box-shadow: 0 0 0 3px rgba(184, 93, 56, 0.35)`). Usado exclusivamente para `"Reservar"` y `"Guardar cambios"`.
- **`btn-secondary` (Acción Alternativa):** Fondo arena suave (`#f5f0e8`) en brand o pizarra elevada (`#24262c`) en product.
- **`btn-danger` (Acción Destructiva):** Fondo rojo ladrillo (`#b91c1c`), texto blanco.
- **`btn-ghost` (Baja Fricción):** Fondo transparente, sin borde, texto accesible.
- **Estados Disabled y Loading:** `opacity: 0.6; cursor: not-allowed; pointer-events: none;` con spinner SVG accesible en estado de carga.

### 2. Tarjetas de Habitación (Superficie Brand)
- Contenedor con fondo blanco o arena suave, borde `1px solid var(--border)`.
- Cabecera con imagen en relación de aspecto 16:10 y esquinas redondeadas de 12px.
- Bloque de especificaciones con capacidad, amenidades y precio destacado en tipografía tabular `.num`.
- Botón unificado `"Reservar"`.

### 3. Tarjetas KPI de Estado (Filtrado Rápido)
- Indicador métrico y botón de filtro simultáneo con total numérico en clase `.num`.
- Bordes de pizarra cálida y badge de estado semántico claro.

### 4. Modales Unificados (Modal Base)
- Montados mediante `createPortal`, cierre con tecla `Esc`, botón `X` y clic exterior.
- Bloqueo de scroll en `document.body`.

---

## Motion

- **Transiciones Base:** Duraciones de **150 a 250 ms** con función de aceleración `cubic-bezier(0.16, 1, 0.3, 1)` o `ease-out`.
- **Consola de Gestión (Product):** Prohibidos los rebotes (bounces), aceleraciones elásticas o animaciones decorativas largas. La retroalimentación debe ser instantánea y sobria.
- **Portal del Huésped (Brand):** Se permiten entradas suaves de **300 a 400 ms** (`fade-in`, sutil desplazamiento vertical de 8px) al cargar contenido o hacer scroll.
- **Accesibilidad (`prefers-reduced-motion`):** Obligatorio el respeto a la preferencia del usuario:
  ```css
  @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
      }
  }
  ```

---

## Imágenes

- **Tratamiento Fotográfico:** Fotografía cálida, luminosa y natural de destinos y arquitectura costera mexicana. Queda estrictamente prohibido el uso de filtros artificiales, saturaciones fluorescentes o viñetas exageradas.
- **Proporción en Tarjetas:** Relación de aspecto **16:10** (`aspect-ratio: 16 / 10`) para habitaciones y hoteles, garantizando consistencia geométrica sin cortes impredecibles de encuadre.
- **Bordes y Geometría:** Esquinas redondeadas fijas a **12px** (`border-radius: 12px`) con `overflow: hidden`.
- **Atributos Obligatorios:**
  - `alt`: Texto alternativo descriptivo en español (e.g. `alt="Suite Presidencial con vista al mar y terraza privada en Hotel Paraíso Cancún"`). Prohibidos los textos vacíos o genéricos tipo `"imagen"`, `"foto"` o `"room"`.
  - `loading="lazy"` en todas las imágenes por debajo del viewport inicial.
  - Dimensiones o estilos responsivos (`width: 100%; height: 100%; object-fit: cover`).

---

## Do's and Don'ts

### Do's (Prácticas Obligatorias)
- **Un solo acento por superficie:** Terracota (`#b85d38`) en Brand; verde hoja de palma (`#3e7b5c`) en Product. El botón primario usa terracota en ambas.
- **Títulos en Fraunces 500-600:** Mantener elegancia sin engrosar a peso 700.
- **Aplicar clase `.num`:** A cualquier precio, fecha, folio de reserva, contador o KPI.
- **Mobile-first en el portal:** Diseñar para pulgares con destinos táctiles de al menos `44×44px`.
- **Transiciones rápidas y sobrias:** Entre 150 y 250 ms, sin rebotes en administración.

### Don'ts (Prohibiciones Estrictas)
- **No usar Inter ni Arial:** Cero tolerancia a fuentes genéricas de sistema.
- **No usar azul corporativo (#2563eb) ni acentos celestes (#38bdf8) en navegación:** En la consola, la pestaña activa es verde hoja de palma (`#3e7b5c`).
- **No usar sombras neón ni degradados morados:** Conservar la calidez de la costa mexicana y la sobriedad de la pizarra cálida.
- **No olvidar `alt` ni `loading="lazy"`:** Toda imagen debe ser accesible y eficiente.

---

## Galería de Capturas Finales y Verificación de Superficies

La totalidad de vistas de ambas superficies fue verificada y capturada en resolución de escritorio (`1440px`), tablet (`1024px`) y móvil (`390px`) dentro del directorio `docs/capturas/`:

### 1. Consola de Gestión Hotelera (Superficie Product - Dark Slate & Dense)
- **Base / AdminLayout y Métricas Operativas:**
  - `admin-grupo1-1440.png`: Barra de 54px, wordmark Fraunces/Plus Jakarta Sans, tabs compactos, KPI cards reactivas y sesión de usuario.
  - `admin-grupo1-1024.png`: Adaptación responsiva a monitores medianos/tablets.
- **Reservaciones y Habitaciones (Grupo 2):**
  - `admin-grupo2-reservas-1440.png` / `admin-grupo2-reservas-1024.png`: Tabla densa con cabecera fija, badges semánticos, celdas numéricas alineadas a la derecha y filtrado unificado por KPI.
  - `admin-grupo2-nueva-reserva-1440.png`: Modal stepper asistido para alta ágil de reservaciones.
  - `admin-grupo2-habitaciones-1440.png` / `admin-grupo2-habitaciones-1024.png`: Matriz de habitaciones con selector de estado directo en fila (`Disponible`, `Ocupada`, `Mantenimiento`).
  - `admin-grupo2-habitacion-modal-1440.png`: Modal de edición y alta de habitación.
- **Hoteles, Tipos, Usuarios y Consultas (Grupo 3):**
  - `admin-grupo3-hoteles-1440.png` / `admin-grupo3-hoteles-1024.png`: Directorio de complejos hoteleros con filtrado por actividad.
  - `admin-grupo3-tipos-1440.png` / `admin-grupo3-tipos-1024.png`: Tipologías de habitación con precios base en `.num` y descripción truncada con tooltip.
  - `admin-grupo3-usuarios-1440.png` / `admin-grupo3-usuarios-1024.png`: Directorio de cuentas con menú contextual (`...`) para verificar y suspender cuentas.
  - `admin-grupo3-usuarios-modal-1440.png`: Modal de edición de perfil administrativo.
  - `admin-grupo3-consultas-1440.png` / `admin-grupo3-consultas-1024.png`: Layout split de dos columnas (lista de consultas SQL a la izquierda, tabla de resultados a la derecha).

### 2. Portal del Huésped (Superficie Brand - Warm Coastal Sand & Editorial)
- **Autenticación Dividida:**
  - `fase-c-login-1440.png` / `fase-c-login-390.png`: Pantalla de inicio de sesión con panel fotográfico costero.
  - `fase-c-registro-1440.png` / `fase-c-registro-390.png`: Registro de huéspedes con validación instantánea.
- **Módulos del Portal:**
  - `fase-c-mis-reservas-1440.png` / `fase-c-mis-reservas-390.png`: Consulta de itinerario, comprobante digital y política de reembolso interactiva.
  - `fase-c-experiencias-1440.png` / `fase-c-experiencias-390.png`: Catálogo de amenidades y tours costeros.
  - `fase-c-mi-perfil-1440.png` / `fase-c-mi-perfil-390.png`: Gestión de datos del huésped y estado de verificación de correo.
  - `fase-b-1440-reserva.png` / `fase-b-390-reserva.png`: Motor de búsqueda y reserva directa.
