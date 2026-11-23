# Hotel Paraíso — Sistema Integral de Gestión y Portal de Huéspedes

Sistema web integral de hospitalidad y gestión hotelera desarrollado con arquitectura desacoplada full-stack. Provee una experiencia dual adaptada a las necesidades del negocio: un portal editorial y cálido para huéspedes (orientado a móviles y reservas directas) y una consola operativa densa y quirúrgica para administradores y recepcionistas.

---

> [!NOTE]
> **Aviso de Ficción y Generación de Contenido Multimedia:**  
> **"Hotel Paraíso" es una cadena y marca ficticia creada exclusivamente para propósitos académicos, formativos y de demostración técnica.** Todas las fotografías arquitectónicas, habitaciones, albercas, amenidades y paisajes costeros incluidos en este proyecto fueron **generadas mediante modelos de Inteligencia Artificial**. Cualquier semejanza con personas, razones sociales, establecimientos hoteleros o locaciones reales es pura coincidencia.

---

## 🛠️ Tecnologías Empleadas

### Backend
- **Java 21 LTS** con **Spring Boot 3.3.4**
- **Spring Security 6** con autenticación sin estado mediante **JWT (JSON Web Tokens)**
- **BCrypt** para almacenamiento criptográfico de credenciales
- **Spring Data JPA & Hibernate 6** con dialecto MySQL
- **Base de Datos:** MySQL 8.0
- **Spring AI (Ollama)** para el recepcionista virtual inteligente con soporte de RAG y herramientas (*Function Calling*)
- **JUnit 5, Mockito & AssertJ** para pruebas unitarias y de integración

### Frontend
- **React 19** con compilación de alto rendimiento sobre **Vite**
- **Sistema de Diseño Dual (CSS Tokens):**
  - **Superficie Brand (`warm-sand` & `terracotta`):** Tipografía serif artesanal `Fraunces` y `Plus Jakarta Sans`, móvil-first, contrastes WCAG AAA.
  - **Superficie Product (`dark-slate` & `palm`):** Consola densa para recepción, cabeceras fijas, filas compactas (42px) y números tabulares (`tabular-nums`).
- **Lucide React** para iconografía sobria y consistente
- **Fetch API nativo** con interceptores automáticos de autenticación y renovación de sesión

---

## 🚀 Requisitos e Instalación

### Prerrequisitos
- **Java JDK 21** o superior instalado y configurado en el `PATH`
- **Node.js 18+** y **npm**
- **Servidor MySQL 8.0+** en ejecución local o remoto

---

### 1. Configuración de la Base de Datos

Crea la base de datos en tu servidor MySQL:

```sql
CREATE DATABASE hotel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Asegúrate de configurar las credenciales en `src/main/resources/application.properties` (o variables de entorno correspondientes):

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/hotel_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=TU_PASSWORD
```

---

### 2. Ejecución del Backend (Spring Boot)

En la raíz del proyecto, ejecuta el wrapper de Maven:

```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

El servidor iniciará en `http://localhost:8080`.

Para ejecutar la suite de pruebas automatizadas (aislada en Testcontainers MySQL 8; excluye `@Tag("ollama")` por defecto):

```bash
# Windows
.\mvnw.cmd test "-DargLine=-Duser.timezone=UTC"

# Linux / macOS
./mvnw test -DargLine="-Duser.timezone=UTC"

# Para incluir pruebas en vivo contra Ollama local (puerto 11434 con modelo configurado):
.\mvnw.cmd test -Dgroups=ollama "-Dsurefire.excludedGroups="
```

---

### 3. Ejecución del Frontend (React + Vite)

Navega a la carpeta `frontend/`, instala dependencias e inicia el servidor de desarrollo:

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

Para construir la versión optimizada de producción:

```bash
npm run build
```

---

## 👥 Usuarios de Prueba para Evaluación

El sistema incluye usuarios preconfigurados (`AdminSeeder`) para los 4 roles oficiales de la arquitectura hotelera:

| Rol | Correo Electrónico | Contraseña | Permisos y Alcance |
|---|---|---|---|
| **GERENTE** | `gerente@hotelparaiso.com` | `Gerente1234!` | **Único rol con acceso directivo, financiero y de cuentas** (`/dashboard`, `/informes`, `/usuarios`, `/reservas`, `/habitaciones`, `/hoteles`, `/tipos`, `/consultas`), KPIs monetarios, ingresos, reversión de No-Show y administración de usuarios. |
| **ADMINISTRADOR** | `admin@hotelparaiso.com` | `Admin1234!` | Gestión técnica y operativa de inventario e infraestructura (`/reservas`, `/habitaciones`, `/hoteles`, `/tipos`, `/consultas` no monetarias). **Sin acceso a `/dashboard`, `/informes`, `/usuarios` ni información monetaria del hotel.** |
| **RECEPCIONISTA** | `recepcion@hotelparaiso.com` | `Recep1234!` | Operación de mostrador (`/reservas`, `/habitaciones`), confirmación de anticipos (50%), Check-in, Check-out, declaración de No-Show y cambio rápido de estado de habitaciones. |
| **HUESPED** | `huesped@hotelparaiso.com` | `Huesped1234!` | Cuenta verificada para el portal comercial (`/portal-huesped`, `/mis-reservas`, `/experiencias`, `/mi-perfil`). Permite explorar hoteles, cotizar, crear pre-reservas, consultar itinerarios y cancelar bajo política escalonada. |

> [!TIP]
> También puedes registrar una nueva cuenta desde `/registro`. Las cuentas nuevas inician con rol `HUESPED` y estado `verificado = false` hasta que se valide el correo mediante el código de 4 dígitos o el enlace enviado por Gmail SMTP.

---

## 🔒 Arquitectura de Seguridad y Reglas de Negocio

1. **Defensa en Profundidad (Role-Based Access Control — 4 Roles):**
   - **Backend:** Spring Security valida estrictamente en cada endpoint (`@PreAuthorize` y reglas `SecurityFilterChain`) los permisos de cada uno de los 4 roles (`ADMINISTRADOR`, `GERENTE`, `RECEPCIONISTA`, `HUESPED`). Por ejemplo, `/api/usuarios` y `/api/consultas` son exclusivos de `ADMINISTRADOR`; `/api/dashboard` y `/api/informes` permiten `GERENTE` y `ADMINISTRADOR`; el ciclo operativo de mostrador (`confirmar`, `check-in`, `check-out`, `no-show`) permite `RECEPCIONISTA`, `GERENTE` y `ADMINISTRADOR`. Cualquier intento sin privilegios responde `403 Forbidden`.
   - **Frontend:** La aplicación cuenta con un guardián de rutas URL y navegación dinámica por rol. Si un usuario navega a una ruta fuera de su nivel de autorización, el sistema bloquea el módulo y despliega una pantalla de acceso restringido.

2. **Garantía en el Ciclo de Reservación:**
   - Un huésped **jamás** puede marcar o crear una reservación confirmada por sí mismo. Toda reservación de huésped nace como `Pre-reserva` con vigencia temporal (24 o 48 horas).
   - Solo el personal administrativo puede verificar el comprobante de anticipo y confirmar la reservación a estado `Confirmada`.

3. **Política de Reembolso Auditada:**
   - Cancelación con más de 72 horas de anticipación: **100% de reembolso del anticipo**.
   - Cancelación entre 48 y 72 horas antes del check-in: **50% de reembolso del anticipo**.
   - Menos de 48 horas antes del check-in: **0% de reembolso (penalización total)**.
   - En caso de aplicar reembolso, el sistema exige de forma mandatoria la captura de cuenta clabe (18 dígitos), titular y banco para garantizar la trazabilidad contable.

4. **Recuperación de Contraseña, Revocación de JWT y Rate Limiting (Arquitectura de Instancia Única):**
   - **Revocación de JWT en logout (`TokenBlacklistService` + `token_revocado`):** al cerrar sesión se persiste únicamente el **hash SHA-256** del token (`CHAR(64)`) con su `expira_en` (zona `America/Mexico_City`) en MySQL antes de actualizar la caché local; si falla la escritura en MySQL, `logout` retorna error y los tokens ya expirados no se insertan. La caché en memoria (clave = hash SHA-256, TTL de 30 s para consultas negativas) **asume despliegue de una sola instancia**; en multi-instancia se debe desactivar la caché negativa o centralizar en Redis.
   - **Límites en memoria (`AuthRateLimiterService`):** ventana deslizante en RAM por instancia JVM (`5` solicitudes/hora por correo en `/api/auth/recuperar-password`, `10` solicitudes/hora por correo en `/api/auth/restablecer-password` y `25` solicitudes/hora por IP en ambos), con **purga periódica `@Scheduled`** (independiente del job de expiración de reservas) y **tope máximo de `10,000` claves** para acotar uso de memoria. Al alcanzar el tope tras purgar vencidos, el limitador expulsa primero las cubetas con **menos hits** (y, en empate, menor uso reciente), asumiendo el riesgo operativo de que bajo saturación extrema (>10,000 llaves activas simultáneas) las claves con pocos intentos puedan ver reiniciado su conteo antes de cumplir la hora para preservar los bloqueos de quienes acumulan más intentos.
   - **Limitación por almacenamiento en RAM:** los contadores del limitador se reinician al reiniciar el proceso y asumen **una sola instancia** backend (en despliegues multi-instancia se recomienda migrar el bucket a Redis).
   - **Riesgo de bloqueo por correo (DoS dirigido):** dado que el límite por correo aplica independientemente de la IP origen, un tercero que conozca la dirección de correo de un usuario podría consumir sus `5` solicitudes por hora impidiéndole pedir otro código temporalmente durante esa ventana (el límite por IP mitiga automatización desde un único origen y la respuesta HTTP genérica evita enumeración).
   - **P1.6 (expiración/reemplazo de cuentas no verificadas):** las cuentas registradas con `verificado = false` y rol `HUESPED` devuelven `409 Conflict` solo mientras su ventana de verificación (`app.verification.expiration-minutes`, 30 min por defecto) siga vigente. Una vez expirada sin verificar, un nuevo `POST /api/auth/registro` sobre ese mismo correo reemplaza la cuenta en sitio (actualizando nombre, hash de contraseña e invalidando tokens previos), sin sobrescribir perfiles de huésped presenciales con teléfono registrado; una cuenta ya verificada siempre devuelve `409 Conflict`.
   - **Cabeceras de seguridad y CSP (`SecurityConfig` + Vite `index.html`):** la API responde con `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`, `X-Frame-Options: DENY` y `Referrer-Policy: no-referrer`; el build de producción del frontend emite CSP estricta (`script-src 'self'`, `img-src 'self' data: blob: https://images.unsplash.com`).
   - **IP del cliente y proxy confiable:** por defecto (`APP_SECURITY_TRUST_FORWARDED_HEADERS=false`), la IP se obtiene exclusivamente con `request.getRemoteAddr()` ignorando `X-Forwarded-For`. Solo si se habilita `APP_SECURITY_TRUST_FORWARDED_HEADERS=true` (y opcionalmente se restringe `APP_SECURITY_TRUSTED_PROXIES` con la lista de IPs de proxy confiables) se leerá `X-Forwarded-For`.

---

## 🎨 Sistema de Diseño y Documentación Visual

Para conocer a fondo las especificaciones tipográficas, espaciado, componentes, reglas cromáticas y auditoría de accesibilidad:

- 📖 **Guía Completa de Diseño:** Consulta [docs/DESIGN.md](docs/DESIGN.md)
- 📸 **Evidencias Visuales:** Capturas de pantalla completas en resoluciones `1440px`, `1024px` y `390px` disponibles en [docs/capturas/](docs/capturas/):
  - Consola de gestión: `admin-grupo1-*`, `admin-grupo2-*`, `admin-grupo3-*`
  - Portal y autenticación: `fase-c-*`, `fase-b-*`
