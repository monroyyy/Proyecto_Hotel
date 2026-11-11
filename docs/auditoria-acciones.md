# Auditoría de Acciones e Interfaz — Sistema de Reservaciones Hotel Paraíso

> **Alcance:** Auditoría completa del inventario de botones, enlaces, navegación, componentes compartidos y jerarquía de acciones por rol antes de intervenir el diseño visual. No se ha modificado ningún archivo de código de la aplicación.

---

## 1. Roles existentes y cómo se decide qué ve cada uno

### 1.1 Roles definidos en el sistema
En el backend (`src/main/java/com/ico/hotel/models/Rol.java`) y en el contexto de sesión (`frontend/src/context/AuthContext.jsx`) existen **2 roles autenticados** más el **estado no autenticado**:

| Rol / Estado | Condición en `AuthContext.jsx` | Propósito |
| :--- | :--- | :--- |
| **No autenticado (`PUBLIC`)** | `!isAuthenticated` (`!token \|\| !user`) | Inicio de sesión, registro de cuenta de huésped y verificación de correo por token. |
| **`HUESPED`** | `isHuesped === true` (`user?.rol === 'HUESPED'`, `isAdmin === false`) | Portal comercial/turístico para explorar hoteles y suites, cotizar, reservar, consultar itinerarios y configurar preferencias de estancia. |
| **`ADMINISTRADOR`** | `isAdmin === true` (`user?.rol === 'ADMINISTRADOR'`) | Sistema interno (PMS / Backoffice) para gestionar reservaciones, inventario de habitaciones, hoteles, categorías/tipos, consultas operativas y cuentas de usuario. |

### 1.2 Mecanismo de enrutamiento, protección de rutas y layouts
La aplicación **no utiliza `react-router-dom`**, sino un enrutador propio basado en `window.history.pushState` / `replaceState` dentro de `AuthContext.jsx` (`routePath`, `routeSearch`, `navigate`) combinado con renderizado condicional en `App.jsx`:

1. **Redirecciones automáticas (`useEffect` en `App.jsx:23-39`)**:
   - Si `!isAuthenticated` y la ruta actual no está en `PUBLIC_PATHS` (`['/login', '/registro', '/verificar-correo']`), redirige a `/login`.
   - Si `isAuthenticated` y la ruta es `/login`, `/registro` o `/`, redirige a `isAdmin ? '/reservas' : '/portal-huesped'`.
   - Si `!isAdmin` (`HUESPED`) y la ruta es `/reservas`, el `useEffect` redirige a `/portal-huesped`. *(Nota: en `AuthContext.jsx:85`, `login()` ejecuta siempre `navigate('/reservas', true)` sin importar el rol, provocando un salto intermedio `/reservas` → `/portal-huesped` para los huéspedes).*
2. ** Árbol de decisión de vistas (`renderMainView()` en `App.jsx:49-116`)**:
   - Si `routePath === '/verificar-correo'` → renderiza `<VerifyEmailPage />` (incluso con sesión activa).
   - Si `!isAuthenticated` → renderiza `<RegisterPage />` en `/registro`, o `<LoginPage />` en cualquier otra ruta.
   - Si `!isAdmin && ADMIN_ONLY_PATHS.includes(routePath)` (`['/habitaciones', '/hoteles', '/tipos', '/consultas', '/usuarios']`) → renderiza una tarjeta de **"Sección restringida"** con un botón para volver a `/portal-huesped`.
   - Si `!isAdmin` (`HUESPED`) → **siempre renderiza `<PortalHuespedPage initialSection={...} />`**, mapeando `/portal-huesped` → `'explorar'`, `/mis-reservas` → `'mis-reservas'`, `/experiencias` → `'experiencias'` y `/mi-perfil` → `'mi-perfil'`.
   - Si `isAdmin` (`ADMINISTRADOR`) → evalúa `switch (activeTab)` y renderiza `<ReservasPage />`, `<HabitacionesPage />`, `<HotelesPage />`, `<TiposHabitacionPage />`, `<ConsultasPage />` o `<UsuariosPage />`.
3. **Layout único compartido (`App.jsx:118-134`)**:
   - Todos los roles (incluyendo las pantallas públicas de Login/Registro, el portal del huésped y el backoffice administrativo) comparten el mismo contenedor `<div className="app-layout">` con `<Navbar />`, `<main className="main-content">`, `{isAuthenticated && <ChatWidget />}` y `<footer className="app-footer">`.

---

## 2. Inventario exhaustivo de botones y enlaces por rol

### 2.1 Estado: No autenticado (`PUBLIC`)

| Rol | Pantalla/ruta | Componente | Texto | Destino o acción | Duplicado con |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PUBLIC` | Global (`/login`, `/registro`, `/verificar-correo`) | `Navbar.jsx` | `Hotel Paraíso` (bloque logo `.navbar-brand`) | `navigate('/login')` | En `/login` recarga la misma ruta; en `/registro` y `/verificar-correo` duplica los botones inferiores `Ya tengo cuenta, iniciar sesión`, `Ir a Iniciar Sesión` y `Volver al Login`. |
| `PUBLIC` | `/login` | `LoginPage.jsx` | Icono `Eye` / `EyeOff` (`title="Ver/Ocultar contraseña"`) | Alterna visibilidad del input de contraseña (`setVerPassword`) | — |
| `PUBLIC` | `/login` | `LoginPage.jsx` | `Reenviar correo de verificación` *(condicional si error 403)* | `handleReenviar()` (`POST /api/auth/reenviar-verificacion`) | — |
| `PUBLIC` | `/login` | `LoginPage.jsx` | `Iniciar Sesión` (`Iniciar Sesión...` en carga) | Submit de formulario: ejecuta `login(correo, password)` | — |
| `PUBLIC` | `/login` | `LoginPage.jsx` | `Crear cuenta gratis` | `navigate('/registro')` | — |
| `PUBLIC` | `/registro` (vista formulario) | `RegisterPage.jsx` | Icono `Eye` / `EyeOff` | Alterna visibilidad de ambos campos de contraseña (`setVerPassword`) | — |
| `PUBLIC` | `/registro` (vista formulario) | `RegisterPage.jsx` | `Crear cuenta` (`Registrando cuenta...` en carga) | Submit de formulario: `registrarUsuario(...)` | — |
| `PUBLIC` | `/registro` (vista formulario) | `RegisterPage.jsx` | `Ya tengo cuenta, iniciar sesión` | `navigate('/login')` | Logo `Hotel Paraíso` en `Navbar.jsx` |
| `PUBLIC` | `/registro` (vista post-registro) | `RegisterPage.jsx` | `Reenviar correo` (`Reenviando...` en carga) | `handleReenviar()` (`POST /api/auth/reenviar-verificacion`) | — |
| `PUBLIC` | `/registro` (vista post-registro) | `RegisterPage.jsx` | `Ir a Iniciar Sesión` | `navigate('/login')` | Logo `Hotel Paraíso` en `Navbar.jsx` |
| `PUBLIC` | `/verificar-correo` (estado éxito) | `VerifyEmailPage.jsx` | `Ir a Iniciar Sesión` | `navigate('/login')` | Logo `Hotel Paraíso` en `Navbar.jsx` y botón `Volver al Login` (estado error) |
| `PUBLIC` | `/verificar-correo` (estado error) | `VerifyEmailPage.jsx` | `Enviar` (`Enviando...` en carga) | Submit de formulario de reenvío: `reenviarVerificacion(correoReenvio)` | — |
| `PUBLIC` | `/verificar-correo` (estado error) | `VerifyEmailPage.jsx` | `Volver al Login` | `navigate('/login')` | Logo `Hotel Paraíso` en `Navbar.jsx` e `Ir a Iniciar Sesión` (con texto distinto para el mismo destino `/login`) |

---

### 2.2 Rol: `HUESPED`

| Rol | Pantalla/ruta | Componente | Texto | Destino o acción | Duplicado con |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HUESPED` | Global (todas las rutas de huésped) | `Navbar.jsx` | `Hotel Paraíso / Estancias & Suites Exclusivas` (`.navbar-brand`) | `navigate('/portal-huesped')` | Pestaña `Explorar Hoteles` en `Navbar.jsx`; botón `Nueva Reservación` y `Explorar hoteles y suites` en `/mis-reservas`; botón `Ver Habitaciones Disponibles` en `/experiencias`. |
| `HUESPED` | Global (todas las rutas de huésped) | `Navbar.jsx` | `Explorar Hoteles` (`.nav-tab-btn`) | `navigate('/portal-huesped')` | Logo `Hotel Paraíso` en `Navbar.jsx`; botones `Nueva Reservación` / `Explorar hoteles y suites` (`/mis-reservas`) y `Ver Habitaciones Disponibles` (`/experiencias`). |
| `HUESPED` | Global (todas las rutas de huésped) | `Navbar.jsx` | `Mis Reservaciones` (`.nav-tab-btn`) | `navigate('/mis-reservas')` | Opción `Mis Reservaciones` del menú desplegable de cuenta (`Navbar.jsx`) y botón `Ver Mis Reservaciones (N)` en `/mi-perfil`. |
| `HUESPED` | Global (todas las rutas de huésped) | `Navbar.jsx` | `Guía y Servicios` (`.nav-tab-btn`) | `navigate('/experiencias')` | Opción `Guía del Huésped` del menú desplegable (`Navbar.jsx`), botón `Ver guía, horarios y reembolsos` en el Hero de `/portal-huesped` y botón `Consultar reglamento y preguntas frecuentes` al pie de `/portal-huesped`. |
| `HUESPED` | Global (todas las rutas de huésped) | `Navbar.jsx` | `Mi Perfil` (`.nav-tab-btn`) | `navigate('/mi-perfil')` | Opción `Mi Perfil y Preferencias` del menú desplegable (`Navbar.jsx`) y botón `Mi Perfil y Preferencias` en la cabecera de `/mis-reservas`. |
| `HUESPED` | Global (todas las rutas de huésped) | `Navbar.jsx` | `{nombreMostrar} / Socio Paraíso ★` | Abre/cierra el popover de cuenta (`setMenuAbierto`) | — |
| `HUESPED` | Global (popover de cuenta) | `Navbar.jsx` | `Mi Perfil y Preferencias` | `navigate('/mi-perfil')` | Pestaña `Mi Perfil` en la misma `Navbar.jsx` y botón `Mi Perfil y Preferencias` en `/mis-reservas`. |
| `HUESPED` | Global (popover de cuenta) | `Navbar.jsx` | `Mis Reservaciones` | `navigate('/mis-reservas')` | Pestaña `Mis Reservaciones` en la misma `Navbar.jsx` y botón `Ver Mis Reservaciones (N)` en `/mi-perfil`. |
| `HUESPED` | Global (popover de cuenta) | `Navbar.jsx` | `Guía del Huésped` | `navigate('/experiencias')` | Pestaña `Guía y Servicios` en la misma `Navbar.jsx` (con texto distinto) y 2 botones más en `/portal-huesped`. |
| `HUESPED` | Global (popover de cuenta) | `Navbar.jsx` | `Cerrar sesión de mi cuenta` | Ejecuta `logout()` | Botón `Cerrar sesión en este dispositivo` dentro de `/mi-perfil`. |
| `HUESPED` | Global (widget flotante) | `ChatWidget.jsx` | Botón flotante `.chat-floating-btn` (icono `MessageSquare` o `X`) | Abre o cierra la ventana del Concierge Virtual (`setIsOpen` / `handleCloseChat`) | Cuando el chat está abierto, duplica el botón `X` (`Cerrar ventana`) del header del chat. |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | Selector `Motor: Gemini \| Ollama` | Cambia proveedor LLM (`setProvider`) | — *(Control técnico visible indebidamente para `HUESPED`)*. |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | Icono `Plus` (`title="Nueva conversación (+)"`) | Crea nueva conversación (`handleNewConversation`) | En modo pantalla completa, duplica el botón `.chat-new-chat-btn` `Nueva conversación` del sidebar izquierdo. |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | Icono `RotateCcw` (`title="Reiniciar mensajes de esta conversación"`) | Vacía los mensajes de la conversación activa (`updateActiveMessages([])`) | — |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | Icono `Maximize2` / `Minimize2` | Alterna vista en pantalla completa (`setIsFullscreen`) | — |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | Icono `X` (`title="Cerrar ventana"`) | Cierra la ventana del chat (`handleCloseChat`) | Botón flotante inferior `.chat-floating-btn` con icono `X`. |
| `HUESPED` | Global (chat en pantalla completa) | `ChatWidget.jsx` | Icono `PanelLeftClose` / `PanelLeftOpen` | Muestra/oculta el historial lateral de conversaciones (`setIsSidebarOpen`) | — |
| `HUESPED` | Global (chat en pantalla completa) | `ChatWidget.jsx` | `Nueva conversación` (`.chat-new-chat-btn`) | Crea nueva conversación (`handleNewConversation`) | Botón icono `Plus` en el header de la misma ventana de chat. |
| `HUESPED` | Global (chat en pantalla completa) | `ChatWidget.jsx` | Ítem `.chat-conv-item` + icono `Trash2` (`Eliminar conversación`) | Selecciona conversación activa / abre `ConfirmDialog` para eliminarla (`Sí, eliminar` / `Cancelar`) | — |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | 9 chips `.suggestion-chip` (`🟢 Disponibles hoy`, `💵 Tipos y precios`, `📝 Reservar habitación`, `🔍 Mis reservaciones`, `♿ Libres en planta baja`, `👥 Para 4 personas`, `💎 Habitación más exclusiva`, `⏳ Vigencia pre-reserva`, `❌ Cancelación y reembolso`) | Copian la pregunta al input (`setInput(chip.q)`) sin enviarla | Solapan funcionalmente las vistas nativas del portal (`/portal-huesped`, `/mis-reservas`, `/experiencias`). |
| `HUESPED` | Global (ventana de chat) | `ChatWidget.jsx` | Botones dinámicos `.chat-action-btn` (`🏢 {label}`) + Botón `Send` / `Square` | Envían mensaje al asistente o cancelan la petición en curso (`AbortController`) | — |
| `HUESPED` | `/portal-huesped` (`explorar` — Hero) | `PortalHuespedPage.jsx` | 3 indicadores del carrusel (`title={s.caption}`) | Cambian la escena fotográfica del Hero (`setHeroIndex(idx)`) | — |
| `HUESPED` | `/portal-huesped` (`explorar` — Hero) | `PortalHuespedPage.jsx` | `Ver guía, horarios y reembolsos` (`.hp-concierge-link-btn`) | `cambiarSeccion('experiencias')` (`/experiencias`) | 1) Pestaña `Guía y Servicios` en `Navbar`, 2) `Guía del Huésped` en menú de usuario, y 3) botón `Consultar reglamento y preguntas frecuentes` al pie de la misma pantalla `/portal-huesped`. |
| `HUESPED` | `/portal-huesped` (`explorar` — Buscador) | `PortalHuespedPage.jsx` | 5 chips `.hp-quick-night-chip` (`1 noche`, `2 noches`, `3 noches`, `5 noches`, `7 noches`) | `actualizarNumeroNoches(n)` (recalcula `fechaSalida`) | Input `Salida (Check-out)` inmediatamente arriba en el mismo buscador, y controles de noches repetidos en el Modal de Reservación. |
| `HUESPED` | `/portal-huesped` (`explorar` — Destinos) | `PortalHuespedPage.jsx` | `Mostrar todos los destinos` *(condicional si `filtroHotel !== 'TODOS'`)* | `setFiltroHotel('TODOS')` | Opción `Todos los destinos (N propiedades)` en el select del buscador, segundo clic sobre la tarjeta `.hp-dest-card` activa y botón `Restablecer filtros`. |
| `HUESPED` | `/portal-huesped` (`explorar` — Destinos) | `PortalHuespedPage.jsx` | Tarjetas de destino `.hp-dest-card` (`Ver suites →` / `✓ Seleccionado`) | Alterna filtro por hotel (`setFiltroHotel`) | Selector `Destino o Propiedad` en la barra buscadora superior. |
| `HUESPED` | `/portal-huesped` (`explorar` — Catálogo) | `PortalHuespedPage.jsx` | 6 píldoras `.hp-cat-pill` (`✨ Todas las categorías`, `👑 Suites de Lujo`, `👨‍👩‍👧‍👦 Familiares (4+ pers.)`, `🛏️ Dobles y Matrimoniales`, `💼 Ejecutivas / Individuales`, `♿ Planta Baja (Piso 1)`) | Filtran el catálogo por categoría (`setFiltroCategoria`) | La píldora `Familiares (4+ pers.)` se solapa con el selector `Huéspedes: 4+ huéspedes (Familiar)` del buscador. |
| `HUESPED` | `/portal-huesped` (`explorar` — Catálogo vacío) | `PortalHuespedPage.jsx` | `Restablecer filtros` (`.btn-primary`) | Restablece hotel, categoría, capacidad y búsqueda rápida | `Mostrar todos los destinos` y controles individuales del buscador. |
| `HUESPED` | `/portal-huesped` (`explorar` — Tarjeta habitación) | `PortalHuespedPage.jsx` | `Detalles` (`.hp-details-btn`) | Abre Modal 1: Ficha Técnica (`setHabitacionDetalle(hab)`) | — |
| `HUESPED` | `/portal-huesped` (`explorar` — Tarjeta habitación) | `PortalHuespedPage.jsx` | `Reservar` (`.hp-book-btn`) | Abre Modal 2: Reservación (`abrirModalReserva(hab)`) | Botón `Continuar a Reservar` dentro del Modal 1 (mismo destino, distinto texto). |
| `HUESPED` | `/portal-huesped` (`explorar` — Cierre inferior) | `PortalHuespedPage.jsx` | `Consultar reglamento y preguntas frecuentes` (`.hp-details-btn`) | `cambiarSeccion('experiencias')` (`/experiencias`) | Botón `Ver guía, horarios y reembolsos` en el Hero de la misma pantalla, pestaña `Guía y Servicios` en `Navbar` y opción `Guía del Huésped` en el menú de cuenta. |
| `HUESPED` | `/portal-huesped` (Modal 1: Ficha de habitación) | `PortalHuespedPage.jsx` | `&times;` (botón superior derecho) | Cierra la ficha (`setHabitacionDetalle(null)`) | Botón inferior `Cerrar ficha` en el mismo modal. |
| `HUESPED` | `/portal-huesped` (Modal 1: Ficha de habitación) | `PortalHuespedPage.jsx` | `Cerrar ficha` (`.btn-secondary`) | Cierra la ficha (`setHabitacionDetalle(null)`) | Botón superior `&times;` en el mismo modal. |
| `HUESPED` | `/portal-huesped` (Modal 1: Ficha de habitación) | `PortalHuespedPage.jsx` | `Continuar a Reservar` (`.hp-book-btn`) | Cierra la ficha y abre el Modal 2 de Reservación (`abrirModalReserva(habitacionDetalle)`) | Botón `Reservar` de la tarjeta de habitación (misma acción/destino con distinto texto). |
| `HUESPED` | `/portal-huesped` (Modal 2: Reservación) | `PortalHuespedPage.jsx` | `&times;` (botón superior derecho) | Cierra el modal (`setHabitacionSeleccionada(null)`) | Botón inferior `Cancelar` en el mismo modal. |
| `HUESPED` | `/portal-huesped` (Modal 2: Reservación) | `PortalHuespedPage.jsx` | Botones `.hp-stepper-btn` `−` y `+` | Restan o suman 1 noche (`actualizarNumeroNoches`) | 7 chips `.hp-quick-night-chip` justo debajo e inputs de fecha `Llegada` y `Salida` justo arriba en el mismo modal. |
| `HUESPED` | `/portal-huesped` (Modal 2: Reservación) | `PortalHuespedPage.jsx` | 7 chips `.hp-quick-night-chip` (`1`, `2`, `3`, `4`, `5`, `7`, `10` noches) | Ajustan el número de noches (`actualizarNumeroNoches(n)`) | Botones `−`/`+`, inputs de fecha del modal y chips de noches de la barra buscadora. |
| `HUESPED` | `/portal-huesped` (Modal 2: Reservación) | `PortalHuespedPage.jsx` | `Cancelar` (`.btn-secondary`) | Cierra el modal (`setHabitacionSeleccionada(null)`) | Botón superior `&times;` en el mismo modal. |
| `HUESPED` | `/portal-huesped` (Modal 2: Reservación) | `PortalHuespedPage.jsx` | `Confirmar por {N} noche(s)` (`Procesando...` en carga) | Submit: registra la reservación y paga anticipo (si modalidad `CONFIRMAR_AHORA`) | — *(Inconsistencia: usa el verbo "Confirmar" incluso cuando el huésped elige "Solo Pre-reservar Sin pago ahora")*. |
| `HUESPED` | `/mis-reservas` (Cabecera) | `PortalHuespedPage.jsx` | `Mi Perfil y Preferencias` (`.hp-details-btn`) | `cambiarSeccion('mi-perfil')` (`/mi-perfil`) | Pestaña `Mi Perfil` en `Navbar.jsx` y opción `Mi Perfil y Preferencias` en el popover de usuario. |
| `HUESPED` | `/mis-reservas` (Cabecera) | `PortalHuespedPage.jsx` | `Actualizar` (`.btn-secondary`) | Recarga reservaciones e inventario (`cargarDatos()`) | — |
| `HUESPED` | `/mis-reservas` (Cabecera) | `PortalHuespedPage.jsx` | `Nueva Reservación` (`.hp-book-btn`) | `cambiarSeccion('explorar')` (`/portal-huesped`) | Pestaña `Explorar Hoteles`, logo `Hotel Paraíso` y botón `Explorar hoteles y suites` (en estado vacío). |
| `HUESPED` | `/mis-reservas` (Filtros) | `PortalHuespedPage.jsx` | 4 píldoras `.hp-cat-pill` (`Todas`, `Confirmadas`, `Pre-reservas por confirmar`, `Historial / Canceladas`) | Filtran la lista de reservaciones (`setFiltroEstadoReserva`) | — |
| `HUESPED` | `/mis-reservas` (Estado vacío) | `PortalHuespedPage.jsx` | `Explorar hoteles y suites` (`.hp-book-btn`) | `cambiarSeccion('explorar')` (`/portal-huesped`) | Botón `Nueva Reservación` en la cabecera de la misma pantalla y pestaña `Explorar Hoteles` en `Navbar`. |
| `HUESPED` | `/mis-reservas` (Tarjeta de itinerario) | `PortalHuespedPage.jsx` | `Pase de abordar / Detalles` (`.hp-details-btn`) | Abre Modal 3: Comprobante / Pase de Abordar (`setVoucherReserva(r)`) | — |
| `HUESPED` | `/mis-reservas` (Tarjeta de itinerario) | `PortalHuespedPage.jsx` | `Confirmar con 50%` (`.hp-book-btn`, solo en `Pre-reserva` activa) | Ejecuta `confirmarReservacion` con 50% y método `'TRANSFERENCIA'` fijo | — |
| `HUESPED` | `/mis-reservas` (Tarjeta de itinerario) | `PortalHuespedPage.jsx` | `Cambiar fechas` (`.hp-details-btn`, solo si activa) | Abre Modal 4: Reprogramar estancia (`setReservaReprogramar(r)`) | — |
| `HUESPED` | `/mis-reservas` (Tarjeta de itinerario) | `PortalHuespedPage.jsx` | `Cancelar` (`.hp-details-btn` rojo, solo si activa) | Abre `window.confirm` nativo y ejecuta `cancelarReservacion` | — |
| `HUESPED` | `/mis-reservas` (Modal 3: Pase de Abordar) | `PortalHuespedPage.jsx` | `&times;` (`.btn-close`) | Cierra el modal (`setVoucherReserva(null)`) | Botón inferior `Cerrar` en el mismo modal. |
| `HUESPED` | `/mis-reservas` (Modal 3: Pase de Abordar) | `PortalHuespedPage.jsx` | `Imprimir comprobante` (`.btn-secondary`) | `window.print()` | — |
| `HUESPED` | `/mis-reservas` (Modal 3: Pase de Abordar) | `PortalHuespedPage.jsx` | `Cerrar` (`.hp-book-btn`) | Cierra el modal (`setVoucherReserva(null)`) | Botón superior `&times;` en el mismo modal. |
| `HUESPED` | `/mis-reservas` (Modal 4: Cambiar fechas) | `PortalHuespedPage.jsx` | `&times;` (`.btn-close`) | Cierra el modal (`setReservaReprogramar(null)`) | Botón inferior `Cancelar` en el mismo modal. |
| `HUESPED` | `/mis-reservas` (Modal 4: Cambiar fechas) | `PortalHuespedPage.jsx` | `Cancelar` (`.btn-secondary`) | Cierra el modal (`setReservaReprogramar(null)`) | Botón superior `&times;` en el mismo modal. |
| `HUESPED` | `/mis-reservas` (Modal 4: Cambiar fechas) | `PortalHuespedPage.jsx` | `Guardar Nuevas Fechas` (`.hp-book-btn`) | Submit: `actualizarReservacion` con las nuevas fechas | — |
| `HUESPED` | `/mi-perfil` | `PortalHuespedPage.jsx` | `Ver Mis Reservaciones ({N})` (`.hp-book-btn`) | `cambiarSeccion('mis-reservas')` (`/mis-reservas`) | Pestaña `Mis Reservaciones` en `Navbar.jsx` y opción `Mis Reservaciones` en el menú de cuenta. |
| `HUESPED` | `/mi-perfil` | `PortalHuespedPage.jsx` | `Cerrar sesión en este dispositivo` (`.user-menu-logout-btn`) | Ejecuta `logout()` | Opción `Cerrar sesión de mi cuenta` en el menú de cuenta de `Navbar.jsx`. |
| `HUESPED` | `/mi-perfil` | `PortalHuespedPage.jsx` | 6 chips `.hp-pref-chip` (3 de almohada + 3 de piso) | Seleccionan preferencia de almohada (`setPrefAlmohada`) y piso (`setPrefPiso`) | — |
| `HUESPED` | `/mi-perfil` | `PortalHuespedPage.jsx` | `Guardar mis preferencias` (`.hp-book-btn`) | Submit: guarda preferencias y CLABE en `localStorage` | — |
| `HUESPED` | `/experiencias` | `PortalHuespedPage.jsx` | `Ver Habitaciones Disponibles` (`.hp-book-btn`) | `cambiarSeccion('explorar')` (`/portal-huesped`) | Pestaña `Explorar Hoteles` y logo `Hotel Paraíso` en `Navbar.jsx`. |
| `HUESPED` | `/experiencias` | `PortalHuespedPage.jsx` | 3 botones acordeón de Preguntas Frecuentes | Abren/cierran cada respuesta (`setFaqAbierto`) | — |
| `HUESPED` | Rutas admin (`/habitaciones`, `/hoteles`, `/tipos`, `/consultas`, `/usuarios`) | `App.jsx` | `Volver al inicio` (`.btn-primary`) | `navigate('/portal-huesped')` | Pestaña `Explorar Hoteles` y logo `Hotel Paraíso` en `Navbar.jsx`. |

---

### 2.3 Rol: `ADMINISTRADOR`

| Rol | Pantalla/ruta | Componente | Texto | Destino o acción | Duplicado con |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Hotel Paraíso / Gestión Hotelera` (`.navbar-brand`) | `navigate('/reservas')` | Pestaña `Reservaciones` en `Navbar.jsx` y opción `Control de Reservaciones` del menú de cuenta. |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Reservaciones` (`.nav-tab-btn`) | `navigate('/reservas')` | Logo `Hotel Paraíso` y opción `Control de Reservaciones` del menú desplegable de cuenta. |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Habitaciones` (`.nav-tab-btn`) | `navigate('/habitaciones')` | Opción `Inventario de Habitaciones` del menú desplegable de cuenta (con texto distinto). |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Hoteles` (`.nav-tab-btn`) | `navigate('/hoteles')` | — |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Categorías` (`.nav-tab-btn`) | `navigate('/tipos')` | — |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Consultas` (`.nav-tab-btn`) | `navigate('/consultas')` | — |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `Usuarios` (`.nav-tab-btn`) | `navigate('/usuarios')` | Opción `Gestión de Usuarios` del menú desplegable de cuenta (con texto distinto). |
| `ADMINISTRADOR` | Global (todas las rutas admin) | `Navbar.jsx` | `{nombreMostrar} / Administrador` | Abre/cierra el popover de cuenta (`setMenuAbierto`) | — |
| `ADMINISTRADOR` | Global (popover de cuenta) | `Navbar.jsx` | `Gestión de Usuarios` | `navigate('/usuarios')` | Pestaña `Usuarios` en la misma `Navbar.jsx`. |
| `ADMINISTRADOR` | Global (popover de cuenta) | `Navbar.jsx` | `Control de Reservaciones` | `navigate('/reservas')` | Pestaña `Reservaciones` y logo `Hotel Paraíso` en la misma `Navbar.jsx`. |
| `ADMINISTRADOR` | Global (popover de cuenta) | `Navbar.jsx` | `Inventario de Habitaciones` | `navigate('/habitaciones')` | Pestaña `Habitaciones` en la misma `Navbar.jsx`. |
| `ADMINISTRADOR` | Global (popover de cuenta) | `Navbar.jsx` | `Cerrar sesión de mi cuenta` | Ejecuta `logout()` | — |
| `ADMINISTRADOR` | Global (widget flotante) | `ChatWidget.jsx` | Mismos controles de ventana que en `HUESPED` + 16 chips `CHIPS_ADMIN` | Gestión de sesiones de chat y consultas operativas asistidas por IA | Botón `+` del header duplicado con `Nueva conversación` en sidebar fullscreen; botón `X` del header duplicado con botón flotante `X`. |
| `ADMINISTRADOR` | `/reservas` (Cabecera) | `ReservasPage.jsx` | `Nueva reservación` (segmented control) | `setVista('nueva')` | En la sub-vista `Comprobante`, duplica el botón `Nueva reservación`. |
| `ADMINISTRADOR` | `/reservas` (Cabecera) | `ReservasPage.jsx` | `Reservaciones` (segmented control) | `setVista('lista')` | En la sub-vista `Comprobante`, duplica el botón `Ver reservaciones`. |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'`) | `ReservasPage.jsx` (`NuevaReserva`) | `Buscar habitaciones` (`Buscando...` en carga) | Submit: consulta habitaciones disponibles y tarifas para el rango de fechas | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'`) | `ReservasPage.jsx` (`NuevaReserva`) | Tarjetas `.room-selection-card` (`role="button"`) | Selecciona habitación y abre `FormularioHuesped` (`setSeleccion`) | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'`) | `ReservasPage.jsx` (`FormularioHuesped`) | `Limpiar / Registrar nuevo` *(condicional si se eligió huésped del catálogo)* | Limpia el formulario de huésped (`handleSelectHuesped('')`) | Seleccionar `-- Registrar nuevo huésped manualmente --` en el `<select>` superior. |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'`) | `ReservasPage.jsx` (`FormularioHuesped`) | `Cancelar` (`.btn.btn-secondary`) | Regresa a la selección de habitaciones (`setSeleccion(null)`) | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'`) | `ReservasPage.jsx` (`FormularioHuesped`) | `Confirmar reservación` / `Registrar pre-reserva` (`.btn.btn-primary`) | Submit: crea el huésped (si es nuevo), crea la reservación y procesa pago (si aplica) | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'` — `Comprobante`) | `ReservasPage.jsx` (`Comprobante`) | `Ver reservaciones` (`.btn.btn-secondary`) | Cambia a la lista (`setVista('lista')`) | Botón `Reservaciones` del segmented control en la cabecera de la misma pantalla. |
| `ADMINISTRADOR` | `/reservas` (`vista === 'nueva'` — `Comprobante`) | `ReservasPage.jsx` (`Comprobante`) | `Nueva reservación` (`.btn.btn-primary`) | Reinicia el flujo de creación (`setComprobante(null)`) | Botón `Nueva reservación` del segmented control en la cabecera. |
| `ADMINISTRADOR` | `/reservas` (`vista === 'lista'`) | `ReservasPage.jsx` (`ListaReservas`) | 5 chips `.status-chip-btn` (`Todas`, `Pre-reserva`, `Confirmada`, `Ocupada`, `Cancelada`) | Filtran la tabla por estado (`setFiltro(e)`) | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'lista'` — fila de tabla) | `ReservasPage.jsx` (`ListaReservas`) | Icono `Eye` (`title="Ver detalle completo"`) | Abre `ModalDetalleReserva` (`setModalDetalle(r)`) | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'lista'` — fila de tabla) | `ReservasPage.jsx` (`ListaReservas`) | Icono `Edit2` (`title="Editar reservación"`) | Abre `ModalEditarReserva` (`setModalEditar(r)`) | — |
| `ADMINISTRADOR` | `/reservas` (`vista === 'lista'` — fila de tabla) | `ReservasPage.jsx` (`ListaReservas`) | `Anticipo` (`.btn.btn-primary`, solo en `Pre-reserva`) | Abre `ModalPago` (`setModalPago(r)`) | — *(En `ModalEditarReserva` también se puede cambiar el estado a `Confirmada`)*. |
| `ADMINISTRADOR` | `/reservas` (`vista === 'lista'` — fila de tabla) | `ReservasPage.jsx` (`ListaReservas`) | `Cancelar` (`.btn.btn-secondary`, en `Pre-reserva` o `Confirmada`) | Abre `ModalCancelar` (`setModalCancelar(r)`) | — *(En `ModalEditarReserva` también se puede cambiar el estado a `Cancelada` sin pasar por el flujo de reembolso)*. |
| `ADMINISTRADOR` | `/reservas` (`vista === 'lista'` — fila de tabla) | `ReservasPage.jsx` (`ListaReservas`) | Icono `Trash2` (`title="Eliminar reservación"`, si `estado !== 'Ocupada'`) | Abre `ConfirmDialog` (`Sí, eliminar reservación` / `Cancelar`) | — |
| `ADMINISTRADOR` | `/reservas` (Modales: `ModalPago`, `ModalCancelar`, `ModalDetalleReserva`, `ModalEditarReserva`) | `ReservasPage.jsx` + `Modal.jsx` | Botón `X` (`.modal-close-btn`) + Botón inferior `Cerrar` / `Volver` / `Cancelar` + Botón primario (`Confirmar reservación` / `Confirmar cancelación` / `Guardar Cambios`) | Cierran el modal o envían el formulario correspondiente | En los 4 modales, el botón `X` superior duplica al botón secundario inferior (`Cerrar`, `Volver`, `Cancelar`). |
| `ADMINISTRADOR` | `/habitaciones` (Cabecera) | `HabitacionesPage.jsx` | `Refrescar` (`.btn.btn-secondary.btn-icon`) | Recarga habitaciones, hoteles y tipos (`cargarDatos()`) | — |
| `ADMINISTRADOR` | `/habitaciones` (Cabecera) | `HabitacionesPage.jsx` | `Nueva Habitación` (`.btn.btn-primary`) | Abre `HabitacionModal` en modo creación (`handleAbrirCrear`) | — |
| `ADMINISTRADOR` | `/habitaciones` (Fila de KPIs) | `HabitacionesPage.jsx` + `KpiCard.jsx` | 5 tarjetas interactivas (`Total Habitaciones`, `Disponibles`, `Pendientes`, `Ocupadas`, `En Mantenimiento`) | Filtran por estado (`setFiltroEstado('TODOS' \| 'Disponible' \| 'Pendiente' \| 'Ocupada' \| 'Mantenimiento')`) | **Duplicado 100%** con los 5 botones `.status-chip-btn` (`Todas`, `Disponible`, `Pendiente`, `Ocupada`, `Mantenimiento`) situados inmediatamente debajo en la misma pantalla. |
| `ADMINISTRADOR` | `/habitaciones` (Panel de filtros) | `HabitacionesPage.jsx` | `Limpiar filtros` (`.btn-link`, condicional si hay filtros activos) | Restablece búsqueda, hotel, tipo y estado (`limpiarFiltros()`) | Cuando la tabla queda vacía, duplica el botón `Restablecer Filtros` del estado vacío. |
| `ADMINISTRADOR` | `/habitaciones` (Panel de filtros) | `HabitacionesPage.jsx` | 5 botones `.status-chip-btn` (`Todas`, `Disponible`, `Pendiente`, `Ocupada`, `Mantenimiento`) | Filtran por estado (`setFiltroEstado(est)`) | **Duplicado 100%** con las 5 tarjetas `KpiCard` superiores. |
| `ADMINISTRADOR` | `/habitaciones` (Tabla vacía) | `HabitacionesPage.jsx` | `Restablecer Filtros` (`.btn.btn-secondary`) | Ejecuta `limpiarFiltros()` | Botón `Limpiar filtros` del panel superior. |
| `ADMINISTRADOR` | `/habitaciones` (Fila de tabla) | `HabitacionesPage.jsx` | Selector inline `select.status-select` (`Disponible`, `Pendiente`, `Ocupada`, `Mantenimiento`) | Actualiza el estado de la habitación (`handleCambiarEstado`) | Campo `Estado Inicial` dentro de `HabitacionModal.jsx` al editar la habitación. |
| `ADMINISTRADOR` | `/habitaciones` (Fila de tabla) | `HabitacionesPage.jsx` | Icono `Edit2` (`title="Editar habitación"`) | Abre `HabitacionModal` con los datos de la habitación | — |
| `ADMINISTRADOR` | `/habitaciones` (Fila de tabla) | `HabitacionesPage.jsx` | Icono `Trash2` (`title="Eliminar habitación"`) | Abre `ConfirmDialog` (`Sí, eliminar habitación` / `Cancelar`) | — |
| `ADMINISTRADOR` | `/habitaciones` (`HabitacionModal`) | `HabitacionModal.jsx` | Botón `X` (`.modal-close-btn`) + `Cancelar` + `Registrar Habitación` / `Actualizar Cambios` | Cierra el modal o guarda la habitación | Botón `X` superior duplicado con el botón `Cancelar` inferior. |
| `ADMINISTRADOR` | `/hoteles` (Cabecera) | `HotelesPage.jsx` | `Refrescar` (`.btn.btn-secondary.btn-icon`) | Recarga el listado de hoteles (`cargarHoteles()`) | — |
| `ADMINISTRADOR` | `/hoteles` (Cabecera) | `HotelesPage.jsx` | `Nuevo Hotel` (`.btn.btn-primary`) | Abre `Modal` para registrar un hotel (`handleAbrirNuevo`) | — |
| `ADMINISTRADOR` | `/hoteles` (Fila de tabla) | `HotelesPage.jsx` | Icono `Edit2` (`title="Editar hotel"`) + Icono `Trash2` (`title="Eliminar hotel"`) | Abre `Modal` de edición / Abre `ConfirmDialog` (`Sí, eliminar hotel` / `Cancelar`) | — |
| `ADMINISTRADOR` | `/hoteles` (Modal Crear/Editar) | `HotelesPage.jsx` + `Modal.jsx` | Botón `X` + `Cancelar` + `Registrar Hotel` / `Guardar Cambios` | Cierra el modal o guarda el hotel | Botón `X` superior duplicado con `Cancelar`. |
| `ADMINISTRADOR` | `/tipos` (Cabecera) | `TiposHabitacionPage.jsx` | `Refrescar` (`.btn.btn-secondary.btn-icon`) | Recarga los tipos de habitación (`cargarTipos()`) | — |
| `ADMINISTRADOR` | `/tipos` (Cabecera) | `TiposHabitacionPage.jsx` | `Nuevo Tipo` (`.btn.btn-primary`) | Abre `Modal` para crear categoría (`handleAbrirNuevo`) | — *(Inconsistencia de nombre: pestaña `Categorías`, botón `Nuevo Tipo`, modal `Crear Categoría`)*. |
| `ADMINISTRADOR` | `/tipos` (Fila de tabla) | `TiposHabitacionPage.jsx` | Icono `Edit2` (`title="Editar tipo"`) + Icono `Trash2` (`title="Eliminar tipo"`) | Abre `Modal` de edición / Abre `ConfirmDialog` (`Sí, eliminar categoría` / `Cancelar`) | — |
| `ADMINISTRADOR` | `/tipos` (Modal Crear/Editar) | `TiposHabitacionPage.jsx` + `Modal.jsx` | Botón `X` + `Cancelar` + `Crear Categoría` / `Guardar Cambios` | Cierra el modal o guarda el tipo de habitación | Botón `X` superior duplicado con `Cancelar`. |
| `ADMINISTRADOR` | `/consultas` (Panel izquierdo) | `ConsultasPage.jsx` | 4 botones de categoría (`Todas`, `Hoteles`, `Tipos`, `Habitaciones`) | Filtran el catálogo de consultas (`setCategoriaActual`) | — |
| `ADMINISTRADOR` | `/consultas` (Panel izquierdo) | `ConsultasPage.jsx` | 14 ítems `.consulta-list-item` (30 cuando se busca por texto) | Selecciona la consulta y ejecuta su petición GET automáticamente (`seleccionarConsulta`) | — |
| `ADMINISTRADOR` | `/consultas` (Panel derecho) | `ConsultasPage.jsx` | `Aplicar filtro` (`.btn.btn-primary`, solo en consultas parametrizadas) | Submit: vuelve a ejecutar la consulta con los parámetros ingresados | — |
| `ADMINISTRADOR` | `/usuarios` (Cabecera) | `UsuariosPage.jsx` | `Actualizar` (`.btn.btn-secondary`) | Recarga usuarios y métricas (`cargar()`) | — *(En `/habitaciones`, `/hoteles` y `/tipos` el mismo botón se llama `Refrescar`)*. |
| `ADMINISTRADOR` | `/usuarios` (Cabecera) | `UsuariosPage.jsx` | `Nuevo Usuario` (`.btn.btn-primary`) | Abre `Modal` para crear usuario (`abrirModalNuevo`) | — |
| `ADMINISTRADOR` | `/usuarios` (Fila de KPIs) | `UsuariosPage.jsx` | 4 tarjetas `.kpi-card` (`Total de Cuentas`, `Correos Verificados`, `Por Verificar`, `Administradores`) | Filtran la tabla (`limpiarFiltros()`, `filtroVerificado = 'VERIFICADOS'`, `'PENDIENTES'`, `filtroRol = 'ADMINISTRADOR'`) | **Duplicado 100%** con el botón `Limpiar filtros` y los `<select>` de Rol y Verificación situados justo debajo. |
| `ADMINISTRADOR` | `/usuarios` (Panel de filtros) | `UsuariosPage.jsx` | `Limpiar filtros` (`.btn-link`, condicional) | Restablece todos los filtros (`limpiarFiltros()`) | Tarjeta KPI `Total de Cuentas`. |
| `ADMINISTRADOR` | `/usuarios` (Fila de tabla) | `UsuariosPage.jsx` | `Verificar` (`.btn.btn-secondary` verde, si `!u.verificado`) | Abre `ConfirmDialog` para verificar manualmente el correo (`solicitarVerificarManual`) | Checkbox `Correo electrónico verificado` dentro del modal de Editar Usuario. |
| `ADMINISTRADOR` | `/usuarios` (Fila de tabla) | `UsuariosPage.jsx` | `Suspender` / `Activar` (`.btn.btn-secondary`, si `!esMismoAdmin`) | Abre `ConfirmDialog` para cambiar `activo` (`solicitarToggleEstado`) | Selector `Estado de Acceso (Cuenta Activa / Cuenta Suspendida)` dentro del modal de Editar Usuario. |
| `ADMINISTRADOR` | `/usuarios` (Fila de tabla) | `UsuariosPage.jsx` | Icono `Edit2` (`title="Editar nombre, correo, rol o contraseña"`) | Abre `Modal` de edición (`abrirModalEditar(u)`) | — |
| `ADMINISTRADOR` | `/usuarios` (Fila de tabla) | `UsuariosPage.jsx` | Icono `Trash2` (`title="Eliminar cuenta permanentemente"`, si `!esMismoAdmin`) | Abre `ConfirmDialog` (`Sí, eliminar permanentemente` / `Cancelar`) | — |
| `ADMINISTRADOR` | `/usuarios` (Modal Crear/Editar) | `UsuariosPage.jsx` + `Modal.jsx` | Botón `X` + `Cancelar` + `Crear Usuario` / `Revisar y Guardar Cambios` | Cierra el modal o abre un segundo `ConfirmDialog` (`Confirmar y Aplicar` / `Volver a revisar`) antes de guardar | Botón `X` superior duplicado con `Cancelar`. |

---

## 3. Resumen de duplicados detectados

1. **Navegación principal duplicada en el menú desplegable de cuenta (`Navbar.jsx`)**:
   - **En `HUESPED`**: las opciones del popover `Mi Perfil y Preferencias`, `Mis Reservaciones` y `Guía del Huésped` llevan exactamente a las mismas rutas (`/mi-perfil`, `/mis-reservas`, `/experiencias`) que las pestañas `Mi Perfil`, `Mis Reservaciones` y `Guía y Servicios` visibles permanentemente a unos centímetros en la misma barra superior, además de cambiarles el nombre (`Guía y Servicios` vs `Guía del Huésped`, `Mi Perfil` vs `Mi Perfil y Preferencias`).
   - **En `ADMINISTRADOR`**: las opciones del popover `Gestión de Usuarios`, `Control de Reservaciones` e `Inventario de Habitaciones` duplican las pestañas `Usuarios`, `Reservaciones` y `Habitaciones` de la misma barra superior con textos distintos.
2. **Cuádruple acceso a `/experiencias` en la pantalla `/portal-huesped`**:
   - Desde la vista principal del huésped hay **4 controles distintos** que llevan a `/experiencias`:
     1. Pestaña `Guía y Servicios` en `Navbar.jsx`.
     2. Opción `Guía del Huésped` en el menú de cuenta de `Navbar.jsx`.
     3. Botón `Ver guía, horarios y reembolsos` en el Hero de `PortalHuespedPage.jsx`.
     4. Botón `Consultar reglamento y preguntas frecuentes` al final de la misma vista en `PortalHuespedPage.jsx`.
3. **Múltiples textos distintos para la acción de reservar o ir al catálogo de reserva**:
   - Para abrir o confirmar el flujo de reserva en `PortalHuespedPage.jsx` se usan tres textos distintos: `Reservar` (en la tarjeta de habitación), `Continuar a Reservar` (en el modal de ficha técnica) y `Confirmar por {N} noche(s)` (en el modal de reservación).
   - Para llevar al huésped al catálogo de reservación (`/portal-huesped`) se usan cinco controles con textos distintos: logo `Hotel Paraíso`, pestaña `Explorar Hoteles`, botón `Nueva Reservación` (en cabecera de `/mis-reservas`), botón `Explorar hoteles y suites` (en estado vacío de `/mis-reservas`) y botón `Ver Habitaciones Disponibles` (en `/experiencias`).
4. **Triple control de duración de estancia dentro del mismo modal de reserva (`PortalHuespedPage.jsx:1175-1231`)**:
   - En un espacio vertical de menos de 200px dentro del modal de reservación conviven: (a) inputs de fecha `Llegada` y `Salida`, (b) botones stepper `−` y `+` de noches, y (c) una fila de 7 chips rápidos (`1`, `2`, `3`, `4`, `5`, `7`, `10` noches), los cuales además ya aparecían en la barra buscadora de la página (`1`, `2`, `3`, `5`, `7` noches).
5. **Doble filtro por hotel en `/portal-huesped` (`PortalHuespedPage.jsx:789-801` y `861-922`)**:
   - El selector `Destino o Propiedad` del buscador y las tarjetas interactivas de la sección `Destinos Exclusivos` mutan exactamente el mismo estado `filtroHotel`, más un tercer botón condicional `Mostrar todos los destinos` y un cuarto `Restablecer filtros`.
6. **Doble cierre de sesión en `/mi-perfil`**:
   - En `/mi-perfil` el botón rojo `Cerrar sesión en este dispositivo` duplica la opción `Cerrar sesión de mi cuenta` del menú superior (`Navbar.jsx`).
7. **Doble barra de filtro por estado en `/habitaciones` (`HabitacionesPage.jsx:194-229` y `274-289`)**:
   - Las 5 tarjetas KPI superiores (`Total Habitaciones`, `Disponibles`, `Pendientes`, `Ocupadas`, `En Mantenimiento`) son clicables y ejecutan exactamente el mismo `setFiltroEstado(...)` que la fila de 5 chips (`Todas`, `Disponible`, `Pendiente`, `Ocupada`, `Mantenimiento`) colocada inmediatamente debajo.
8. **Doble sistema de filtros en `/usuarios` (`UsuariosPage.jsx:297-365` y `368-427`)**:
   - Las 4 tarjetas KPI clicables (`Total de Cuentas`, `Correos Verificados`, `Por Verificar`, `Administradores`) cambian los mismos estados (`filtroVerificado`, `filtroRol`, `limpiarFiltros`) que los `<select>` situados justo debajo.
9. **Acciones en fila duplicadas con campos del modal de edición**:
   - En `/usuarios`, cada fila tiene botones `Verificar` y `Suspender`/`Activar`, mientras que el botón `Editar` de la misma fila abre un modal que vuelve a incluir el selector `Estado de Acceso (Cuenta Activa / Cuenta Suspendida)` y el checkbox `Correo electrónico verificado`.
   - En `/habitaciones`, cada fila tiene un `<select className="status-select">` para cambiar el estado en línea, y el modal de editar habitación vuelve a mostrar el campo `Estado Inicial`.
   - En `/reservas`, la edición manual de una reserva (`ModalEditarReserva`) permite cambiar el estado directamente a `Confirmada` o `Cancelada`, saltándose los flujos dedicados de los botones `Anticipo` (`ModalPago`) y `Cancelar` (`ModalCancelar`).
10. **Doble botón de cierre en todos los modales y en el `ChatWidget`**:
    - Todos los modales de la app tienen tanto el botón `X` en la esquina superior derecha como un botón secundario inferior (`Cerrar`, `Cerrar ficha`, `Cancelar` o `Volver`) que ejecutan exactamente la misma función.
    - En `ChatWidget.jsx`, cuando el chat está abierto, coexisten el botón `X` del encabezado de la ventana y el botón flotante inferior `.chat-floating-btn` (que también muestra una `X`), además de dos botones para `Nueva conversación` cuando está en pantalla completa (icono `+` en el header y botón `Nueva conversación` en el sidebar).

---

## 4. Componentes compartidos e inconsistencias entre Huésped y Gestión

| Componente / Sistema | Cómo se comparte hoy | Inconsistencias detectadas entre Huésped (`Marca`) y Gestión (`Producto`) |
| :--- | :--- | :--- |
| **`Navbar.jsx` y Footer (`App.jsx`)** | Un solo componente `<Navbar />` y un solo `<footer className="app-footer">` para toda la aplicación. | Cambia el color del icono y avatar mediante estilos inline (`#1e3a8a` azul en admin vs `#f59e0b` naranja en huésped), pero conserva la misma estructura de "barra de pestañas de backoffice" (`.navbar-nav` gris `#f1f5f9`) y muestra el texto de pie de página `Sistema de Gestión Hotelera` tanto en el portal turístico del huésped como en Login/Registro. |
| **`ChatWidget.jsx`** | Se monta globalmente en `App.jsx` para cualquier usuario autenticado (`HUESPED` o `ADMINISTRADOR`). | Usa el mismo tema oscuro/azul corporativo en ambos roles, expone el selector técnico `Motor: Gemini \| Ollama` a los huéspedes y tiene un comportamiento inconsistente en sus botones: los chips `.suggestion-chip` solo copian el texto al input sin enviarlo, mientras que los botones `.chat-action-btn` dentro de los mensajes sí envían la consulta al instante. |
| **Modales (`Modal.jsx`, `HabitacionModal.jsx` vs modales inline en `PortalHuespedPage.jsx`)** | `HotelesPage`, `TiposHabitacionPage`, `UsuariosPage` y `ReservasPage` usan `<Modal />`. `HabitacionModal` crea su propio portal. `PortalHuespedPage` no usa ninguno de los dos. | Existen **3 implementaciones distintas de modal**: 1) `<Modal>` con `createPortal` y botón `<X />` de Lucide; 2) `HabitacionModal` con su propio `createPortal` y header custom; 3) 4 modales codificados a mano en `PortalHuespedPage.jsx` con `div.modal-overlay` sin `createPortal` y con el carácter HTML `&times;` estilizado inline. |
| **Diálogos de confirmación (`ConfirmDialog.jsx` vs `window.confirm`)** | `HabitacionesPage`, `HotelesPage`, `TiposHabitacionPage`, `UsuariosPage`, `ReservasPage` y `ChatWidget` usan `<ConfirmDialog />`. | En `PortalHuespedPage.jsx:395`, cuando el huésped cancela su reservación, no se usa `<ConfirmDialog />` ni un modal de reembolso, sino un `window.confirm(...)` nativo del navegador que rompe por completo la estética del portal. |
| **Sistema de botones CSS (`index.css` vs `PortalHuespedPage.css`)** | Conviven `.btn.btn-primary` / `.btn.btn-secondary` (en `index.css`) con `.hp-book-btn` / `.hp-details-btn` (en `PortalHuespedPage.css`). | 1) En `LoginPage`, `RegisterPage`, `VerifyEmailPage` y `App.jsx` se escribe `className="btn-primary"` **olvidando la clase base `.btn`**, por lo que pierden padding/tipografía base y lo compensan con `style={{...}}` inline.<br>2) En `PortalHuespedPage.jsx` la clase `.hp-book-btn` (gradiente naranja de conversión) se usa indiscriminadamente para reservar (`Reservar`), navegar (`Ver Mis Reservaciones`, `Ver Habitaciones Disponibles`), guardar ajustes (`Guardar mis preferencias`, `Guardar Nuevas Fechas`) e incluso para cerrar un modal (`Cerrar` en el Pase de Abordar).<br>3) En `ReservasPage.jsx:825`, el botón destructivo `Confirmar cancelación` dentro de `ModalCancelar` usa `.btn-primary` (azul) en lugar de `.btn-danger` (rojo). |
| **Tarjetas KPI (`KpiCard.jsx` vs `.kpi-card` manual)** | `HabitacionesPage` usa el componente `<KpiCard />`. | `UsuariosPage` no usa `<KpiCard />`, sino que reconstruye 4 tarjetas `<div className="kpi-card">` manuales con estilos inline distintos. |
| **Vocabulario de acciones de recarga y entidades** | Repetido en páginas de gestión y huésped. | El botón para recargar datos se llama `Refrescar` en `/habitaciones`, `/hoteles` y `/tipos`, pero se llama `Actualizar` en `/usuarios` y `/mis-reservas`. Asimismo, el módulo `/tipos` se llama `Categorías` en la Navbar, `Tipos de Habitación` en el título, `Nuevo Tipo` en el botón primario y `Crear Categoría` en el modal. |

---

## 5. Botones, controles o secciones visibles para un rol que no le corresponden

1. **Selector técnico de modelo de IA (`Motor: Gemini | Ollama`) visible para `HUESPED` (`ChatWidget.jsx:431-441`)**:
   - Un huésped que conversa con el "Concierge Virtual" no debe ver ni elegir si el backend procesa su solicitud con `Gemini` (Cloud) u `Ollama` (Local). Este selector solo corresponde al entorno de administración/pruebas o configuración interna.
2. **Pie de página administrativo (`Sistema de Gestión Hotelera`) visible para `HUESPED` y `PUBLIC` (`App.jsx:128-133`)**:
   - El footer global muestra `© 2026 Sistema de Gestión Hotelera` dentro del portal turístico del huésped y en las pantallas de inicio de sesión y registro.
3. **Flujo de cancelación y confirmación incompleto en `PortalHuespedPage.jsx` frente a `ReservasPage.jsx`**:
   - Mientras que en `ReservasPage.jsx` (`ModalCancelar`) se calcula y muestra la política de reembolso (100% con ≥72h, 50% entre 48h y 72h, 0% con <48h) y se solicitan los datos bancarios, en `PortalHuespedPage.jsx:394-407` el botón `Cancelar` del huésped lanza un simple `window.confirm` sin informarle el monto de su reembolso y envía silenciosamente valores por defecto de `localStorage` (`prefBanco = 'BBVA'`, `prefClabe = '012180001234567890'`).
   - Igualmente, el botón `Confirmar con 50%` en `PortalHuespedPage.jsx:383-392` envía `'TRANSFERENCIA'` de forma fija sin permitir al huésped elegir tarjeta o transferencia como sí ocurre al crear una reserva nueva.
4. **Código muerto y lógica dual de `HUESPED` dentro de `ReservasPage.jsx`**:
   - `ReservasPage.jsx` contiene decenas de líneas condicionales para `!isAdmin` (título `Mis Reservaciones`, subtítulo `Portal del huésped: cotiza disponibilidad...`, autocompletado bloqueado de correo, ocultación del selector de recepcionista y del botón eliminar). Sin embargo, como `App.jsx:92` intercepta a cualquier `!isAdmin` antes del `switch` de rutas, **`ReservasPage.jsx` nunca llega a mostrarse al huésped**, dejando código duplicado y mantenimiento ambiguo.
5. **Redirección post-login hacia `/reservas` para `HUESPED` (`AuthContext.jsx:85`)**:
   - Al iniciar sesión, `AuthContext.jsx` ejecuta `navigate('/reservas', true)` para todos los usuarios sin verificar si su rol es `HUESPED`, obligando a `App.jsx` a redirigir posteriormente a `/portal-huesped`.
6. **Checkbox de auto-verificación editable en el propio perfil del administrador (`UsuariosPage.jsx:724-739`)**:
   - En el modal de edición de `UsuariosPage`, cuando el administrador edita su propia cuenta (`esMismoAdminEnModal`), los selectores de `Rol` y `Estado de Acceso` se bloquean por seguridad, pero el checkbox `Correo electrónico verificado` permanece habilitado, permitiendo que el administrador desmarque por error su propia verificación.

---

## 6. Propuesta de simplificación de acciones por rol y pantalla

> **Reglas aplicadas:**
> 1. **Máximo 1 acción principal (CTA primario) y hasta 2 acciones secundarias por pantalla/vista.**
> 2. **Unificación estricta del CTA de reserva:** La acción de reservar solo puede aparecer con el texto exacto **`Reservar`** y dirigirse siempre al mismo flujo/destino (abrir el modal de reserva de la habitación seleccionada, o llevar al catálogo de habitaciones disponibles cuando el usuario está en una pantalla sin habitación seleccionada).

### 6.1 Pantallas Públicas (`PUBLIC`)

| Pantalla / Ruta | Acción Principal (1) | Acciones Secundarias (máx. 2) | Botones / Enlaces que se eliminan o unifican |
| :--- | :--- | :--- | :--- |
| **`/login`** | **`Iniciar sesión`** (submit del formulario) | 1. **`Crear cuenta`** (`/registro`)<br>2. **`Reenviar verificación`** *(solo visible si la cuenta aún no está verificada)* | • **Eliminar** `<Navbar />` de backoffice y footer `Sistema de Gestión Hotelera` en las vistas de autenticación (usar cabecera limpia de marca sin pestañas). |
| **`/registro`** | **`Crear cuenta`** (en formulario) / **`Iniciar sesión`** (en vista de confirmación post-registro) | 1. **`Ya tengo cuenta`** (`/login`, en formulario) / **`Reenviar correo`** (en vista post-registro) | • **Unificar** `Ir a Iniciar Sesión` y `Ya tengo cuenta, iniciar sesión` con el destino único `/login`. |
| **`/verificar-correo`** | **`Iniciar sesión`** (en éxito) / **`Reenviar enlace`** (en error) | 1. **`Volver a iniciar sesión`** (`/login`, en estado de error) | • **Unificar** `Ir a Iniciar Sesión` y `Volver al Login` bajo una misma jerarquía visual. |

---

### 6.2 Rol: `HUESPED`

#### Navegación global del Huésped (`Navbar.jsx`)
- **Barra principal**: conservar las 4 vistas del portal (`Explorar`, `Mis Reservaciones`, `Guía y Servicios`, `Mi Perfil`).
- **Popover de cuenta**: **eliminar** los 3 enlaces repetidos (`Mi Perfil y Preferencias`, `Mis Reservaciones`, `Guía del Huésped`) y dejar el popover exclusivamente para datos de membresía y la acción **`Cerrar sesión`**.

| Pantalla / Ruta | Acción Principal (1) | Acciones Secundarias (máx. 2) | Botones / Enlaces que se eliminan o unifican |
| :--- | :--- | :--- | :--- |
| **`/portal-huesped` (`explorar`)** | **`Reservar`** *(único texto permitido en cada tarjeta de habitación y en la ficha de detalle para abrir el modal de reservación)* | 1. **`Ver detalles`** (abre la ficha técnica de la habitación)<br>2. **Filtros del buscador unificado** (`Restablecer filtros` cuando hay filtros activos) | • **Unificar texto de reserva:** Cambiar `Continuar a Reservar` (en Modal 1) a **`Reservar`** (mismo texto y mismo destino que en la tarjeta).<br>• **Eliminar** del Hero el botón `Ver guía, horarios y reembolsos` y del pie de página el botón `Consultar reglamento y preguntas frecuentes` (ya existe `Guía y Servicios` en la barra superior).<br>• **Eliminar** los 5 chips rápidos de noches de la barra buscadora (basta con las fechas `Llegada` y `Salida`).<br>• **Unificar** el filtro de hotel: que las tarjetas de `Destinos Exclusivos` sean el selector visual o sincronizarlas sin el botón extra `Mostrar todos los destinos`. |
| **Modal de Reservación (`/portal-huesped`)** | **`Confirmar reservación`** (o **`Registrar pre-reserva`** según la modalidad elegida) | 1. **`Cancelar`** (cierra el modal) | • **Eliminar** los 7 chips rápidos de noches y los botones `−`/`+` del modal (conservar únicamente los selectores de fecha `Llegada` y `Salida` con el cálculo automático de noches).<br>• **Eliminar** el doble botón de cierre (conservar `Cancelar` y el icono `X` discretamente sin usar `.hp-book-btn` para cerrar). |
| **`/mis-reservas`** | **`Reservar`** *(lleva a `/portal-huesped` para iniciar una nueva estancia; reemplaza tanto a `Nueva Reservación` en cabecera como a `Explorar hoteles y suites` en estado vacío)* | 1. **Acción contextual de la tarjeta activa**: **`Confirmar anticipo`** (si es pre-reserva) o **`Ver pase de abordar`** (si está confirmada)<br>2. **`Gestionar estancia`** (agrupa `Cambiar fechas` y `Cancelar` con modal de desglose de reembolso en lugar de `window.confirm`) | • **Unificar** `Nueva Reservación` y `Explorar hoteles y suites` bajo el mismo texto **`Reservar`** con destino `/portal-huesped`.<br>• **Eliminar** de la cabecera el botón `Mi Perfil y Preferencias` (ya está en la Navbar) y el botón manual `Actualizar` (recargar automáticamente al montar o mutar).<br>• En el modal Pase de Abordar: **Acción Principal** `Imprimir comprobante` y **Secundaria** `Cerrar` (quitar clase primaria `.hp-book-btn` al botón `Cerrar`). |
| **`/mi-perfil`** | **`Guardar preferencias`** | 1. **`Cerrar sesión`** *(unificado con el menú de cuenta)* | • **Eliminar** el botón superior `Ver Mis Reservaciones (N)` (ya está en la Navbar). |
| **`/experiencias`** | **`Reservar`** *(lleva al catálogo `/portal-huesped`; reemplaza a `Ver Habitaciones Disponibles`)* | 1. **Acordeón de Preguntas Frecuentes** | • **Unificar** `Ver Habitaciones Disponibles` con el texto **`Reservar`** hacia `/portal-huesped`. |
| **Concierge Virtual (`ChatWidget` en modo Huésped)** | **`Enviar mensaje`** | 1. **`Nueva conversación`**<br>2. **`Cerrar`** | • **Eliminar** para `HUESPED` el selector técnico `Motor: Gemini \| Ollama`.<br>• **Unificar** el comportamiento de los chips de sugerencia para que envíen la consulta al hacer clic (igual que `.chat-action-btn`). |

---

### 6.3 Rol: `ADMINISTRADOR`

#### Navegación global del Administrador (`Navbar.jsx`)
- **Barra principal**: conservar las 6 secciones operativas (`Reservaciones`, `Habitaciones`, `Hoteles`, `Categorías`, `Consultas`, `Usuarios`).
- **Popover de cuenta**: **eliminar** los 3 enlaces repetidos (`Gestión de Usuarios`, `Control de Reservaciones`, `Inventario de Habitaciones`) y dejar únicamente la información de la cuenta y **`Cerrar sesión`**.

| Pantalla / Ruta | Acción Principal (1) | Acciones Secundarias (máx. 2) | Botones / Enlaces que se eliminan o unifican |
| :--- | :--- | :--- | :--- |
| **`/reservas` (Vista Lista)** | **`Nueva reservación`** (cambia al flujo de creación) | 1. **Acciones de fila**: **`Confirmar pago`** (si es `Pre-reserva`) / **`Ver detalle`** (`Eye`)<br>2. **Menú/acciones de modificación de fila**: **`Editar`** (`Edit2`) y **`Cancelar / Eliminar`** | • **Eliminar** de `ModalEditarReserva` la posibilidad de cambiar manualmente el estado a `Confirmada` o `Cancelada` sin pasar por `ModalPago` o `ModalCancelar` (para no evadir el registro de pago o cálculo de reembolso).<br>• En `ModalCancelar`, cambiar el botón `Confirmar cancelación` de `.btn-primary` (azul) a `.btn-danger` (rojo). |
| **`/reservas` (Vista Nueva)** | **`Buscar habitaciones`** (paso 1) → **`Confirmar reservación` / `Registrar pre-reserva`** (paso 2) | 1. **`Volver a lista`** (`Reservaciones`)<br>2. **`Cancelar selección`** (regresa al paso 1) | • **Eliminar** el botón extra `Limpiar / Registrar nuevo` en `FormularioHuesped` (basta con la opción por defecto del `<select>`).<br>• En `Comprobante`, mantener solo **`Ver reservaciones`** (secundaria) y **`Nueva reservación`** (principal). |
| **`/habitaciones`** | **`Nueva Habitación`** | 1. **Filtros unificados** (`Limpiar filtros` cuando estén activos)<br>2. **Acciones de fila**: **`Editar`** (`Edit2`, incluyendo cambio de estado) y **`Eliminar`** (`Trash2`) | • **Eliminar la duplicidad KPI vs Chips**: dejar las 5 tarjetas `KpiCard` como el único filtro rápido por estado (o dejar los KPIs como indicadores informativos y conservar solo los chips de filtro), eliminando la barra duplicada.<br>• **Eliminar** el botón `Refrescar` manual (o mantenerlo como icono discreto secundario). |
| **`/hoteles`** | **`Nuevo Hotel`** | 1. **`Editar`** (`Edit2` por fila)<br>2. **`Eliminar`** (`Trash2` por fila) | • **Unificar** el botón de recarga (`Refrescar`) como control secundario discreto o recarga automática tras crear/editar/eliminar. |
| **`/tipos` (Categorías)** | **`Nueva Categoría`** *(unificando la terminología en toda la vista)* | 1. **`Editar`** (`Edit2` por fila)<br>2. **`Eliminar`** (`Trash2` por fila) | • **Unificar vocabulario**: usar **`Categorías`** (o `Tipos de Habitación`) de forma consistente en pestaña, título, botón primario (`Nueva Categoría`), modal y diálogo de confirmación. |
| **`/consultas`** | **`Aplicar filtro`** *(en consultas con parámetros)* / **Selección de consulta en el catálogo** | 1. **Filtro por categoría de consulta** (`Todas`, `Hoteles`, `Tipos`, `Habitaciones` como chips, no como `.btn-primary`)<br>2. **Buscador de consultas por palabra clave** | • Cambiar los 4 botones de categoría de `.btn.btn-primary` a chips de filtro (`.status-chip-btn`) para que no compitan visualmente con el botón `Aplicar filtro`. |
| **`/usuarios`** | **`Nuevo Usuario`** | 1. **Filtros del panel** (`Limpiar filtros` cuando estén activos)<br>2. **Acciones de fila**: **`Editar`** (`Edit2`) y **`Eliminar`** (`Trash2`) | • **Eliminar la duplicidad KPI vs Selects**: las 4 tarjetas KPI superiores no deben duplicar los 3 `<select>` situados inmediatamente debajo.<br>• **Unificar acciones de fila con el Modal de Edición**: mover las acciones puntuales `Verificar` y `Suspender`/`Activar` dentro del modal de edición (o a un menú contextual por fila) para no tener 4 botones distintos por cada fila de la tabla, y deshabilitar el checkbox `Correo electrónico verificado` cuando el admin edita su propia cuenta. |

---

## 7. Clasificación de pantallas: "Marca" vs "Producto"

Para el rediseño visual, la aplicación debe separar claramente dos superficies con direcciones de arte, tipografía, densidad y componentes distintos:

### 7.1 Pantallas de "Marca" (Portal del Huésped y Autenticación — *Persuade & Experience*)
Buscan transmitir hospitalidad, calidez, exclusividad y confianza para impulsar la conversión (`Reservar`). Requieren fotografía protagonista, tipografía editorial (serif/display para titulares + sans limpia para lectura), espaciado generoso, paleta cálida/orgánica y cero jerga de software interno.

| Ruta | Pantalla / Vista | Rol | Propósito de diseño ("Marca") |
| :--- | :--- | :--- | :--- |
| **`/portal-huesped`** | Landing del Huésped: Hero, Destinos Exclusivos, Catálogo de Suites y Buscador de Disponibilidad | `HUESPED` | **Escaparate principal y conversión.** Inspirar el viaje, mostrar suites y llevar sin fricción al CTA único **`Reservar`**. |
| **Modales de `/portal-huesped`** | Ficha de Suite (`habitacionDetalle`) y Checkout de Reserva (`habitacionSeleccionada`) | `HUESPED` | **Cierre de conversión.** Presentar amenidades y desglose transparente de tarifa/anticipo con sensación de hospitalidad boutique. |
| **`/mis-reservas`** | Itinerarios del Huésped, Pase de Abordar (`voucherReserva`) y Reprogramación (`reservaReprogramar`) | `HUESPED` | **Experiencia post-reserva (Concierge).** Presentar las estancias como pases de abordar o itinerarios de viaje, no como registros de base de datos. |
| **`/experiencias`** | Guía del Huésped, Políticas de Reembolso y Preguntas Frecuentes | `HUESPED` | **Contenido editorial e informativo.** Lectura clara de horarios de check-in/out, beneficios incluidos y políticas transparentes. |
| **`/mi-perfil`** | Membresía Socio Paraíso y Preferencias de Estancia | `HUESPED` | **Fidelización y personalización.** Selección táctil de preferencias de habitación (almohadas, piso, notas para recepción). |
| **`/login`, `/registro`, `/verificar-correo`** | Acceso, Registro de Huésped y Verificación de Correo | `PUBLIC` | **Puerta de entrada a la marca.** Debe sentirse como la recepción digital de Hotel Paraíso (sin barra de pestañas vacía ni pie de página de "Sistema de Gestión Hotelera"). |

### 7.2 Pantallas de "Producto" (Sistema de Gestión PMS — *Operate & Read*)
Son herramientas de trabajo diario para recepción y administración. Requieren alta densidad informativa, escaneo rápido en tablas, jerarquía tipográfica funcional (sans-serif geométrica/humanista + números tabulares `tabular-nums` para tarifas, fechas, folios e IDs), estados semánticos inequívocos y controles compactos sin adornos promocionales.

| Ruta | Pantalla / Vista | Rol | Propósito de diseño ("Producto") |
| :--- | :--- | :--- | :--- |
| **`/reservas`** | Control de Reservaciones (Tabla operativa, Cotizador de Recepción, Registro de Anticipo, Cancelación con Reembolso, Edición) | `ADMINISTRADOR` | **Operación central de recepción.** Consulta rápida de folios, estados (`Pre-reserva`, `Confirmada`, `Ocupada`, `Cancelada`), cobro de anticipos y altas telefónicas/presenciales. |
| **`/habitaciones`** | Inventario de Habitaciones, KPIs de Ocupación, Filtros y `HabitacionModal` | `ADMINISTRADOR` | **Control de inventario y housekeeping.** Monitoreo en tiempo real de disponibilidad por piso/hotel y cambio ágil de estado (`Disponible`, `Pendiente`, `Ocupada`, `Mantenimiento`). |
| **`/hoteles`** | Catálogo de Propiedades / Sedes y Modal CRUD | `ADMINISTRADOR` | **Administración de sedes.** Tabla maestra de hoteles, direcciones, teléfonos y categoría por estrellas. |
| **`/tipos`** | Catálogo de Categorías / Tipos de Habitación y Tarifas Base | `ADMINISTRADOR` | **Administración de tarifas y capacidades.** Gestión de precios por noche, aforos máximos y descripciones técnicas. |
| **`/consultas`** | Centro de Consultas Operativas y Reportes Parametrizados | `ADMINISTRADOR` | **Inteligencia operativa y auditoría.** Ejecución rápida de las 30 consultas del backend y lectura tabular/estructurada de resultados JSON. |
| **`/usuarios`** | Administración de Cuentas, Roles, Verificación y Estado de Acceso | `ADMINISTRADOR` | **Seguridad y control de accesos.** Gestión de cuentas de huéspedes y administradores, auditoría de correos verificados y suspensión de cuentas. |
