# Documento de Pruebas: Autenticación, Manejo de Sesiones y Control de Acceso por Roles

## 1. Configuración Previa (`.env`)

Antes de iniciar el backend, asegúrate de configurar el archivo `.env` en la raíz del proyecto (usando `.env.example` como plantilla):

| Variable | Descripción |
| :--- | :--- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a **MySQL 8.0** (`hotel_db`, zona horaria `America/Mexico_City`). |
| `JWT_SECRET` | Clave secreta de al menos 32 bytes para firmar tokens HMAC-SHA256. |
| `JWT_EXPIRATION_MS` | Tiempo de vida del token en milisegundos (ej. `1800000` = 30 minutos). |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Credenciales SMTP de Gmail (usar **Contraseña de Aplicación** de 16 caracteres generada en la cuenta de Google). |
| `APP_FRONTEND_URL` | URL base del frontend (`http://localhost:5173`) para construir el enlace de verificación por correo. |
| `ADMIN_INITIAL_NAME`, `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Datos del usuario `ADMINISTRADOR` creado automáticamente al arrancar el servidor (`AdminSeeder`), junto con las cuentas semilla de `GERENTE`, `RECEPCIONISTA` y `HUESPED`. |
| `GEMINI_API_KEY`, `OLLAMA_BASE_URL` | Credenciales y URL local (`http://localhost:11434`, modelo `llama3.1`) para el asistente de IA con Spring AI. |

---

## 2. Cuentas Semilla Oficiales (4 Roles de la Arquitectura)

Al iniciar el backend, `AdminSeeder` garantiza la existencia y sincronización de los 4 roles del sistema:

| Rol | Correo Electrónico | Contraseña | Secciones y Permisos |
| :--- | :--- | :--- | :--- |
| **`ADMINISTRADOR`** | `admin@hotelparaiso.com` | `Admin1234!` | Acceso total: `/dashboard`, `/informes`, `/reservas`, `/habitaciones`, `/hoteles`, `/tipos`, `/consultas` (SQL), `/usuarios` y `DELETE /api/reservas/**`. |
| **`GERENTE`** | `gerente@hotelparaiso.com` | `Gerente1234!` | Acceso directivo: `/dashboard`, `/informes`, `/reservas`, `/habitaciones`, `/hoteles`, `/tipos` y reversión de No-Show. Sin acceso a `/usuarios` ni `/consultas`. |
| **`RECEPCIONISTA`** | `recepcion@hotelparaiso.com` | `Recep1234!` | Acceso operativo de mostrador: `/reservas` y `/habitaciones` (confirmación de anticipo 50%, Check-in, Check-out, No-Show y cambio de estado de habitación). |
| **`HUESPED`** | `huesped@hotelparaiso.com` | `Huesped1234!` | Portal comercial: `/portal-huesped`, `/mis-reservas`, `/experiencias`, `/mi-perfil`. Crea pre-reservas propias y consulta o cancela sus propias reservaciones. |

---

## 3. Matriz de Casos de Prueba (Exitosos y de Error)

| ID | Caso de Prueba | Endpoint / Acción | Entrada / Condición | Resultado Esperado | Código HTTP |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-01** | Registro válido de huésped | `POST /api/auth/registro` | Nombre, correo nuevo y contraseña con $\ge 8$ caracteres, mayúscula, minúscula y número | Crea usuario con `rol = HUESPED`, `verificado = false`, contraseña hasheada con BCrypt y envía correo con código de 4 dígitos y enlace | `201 Created` |
| **CP-02** | Registro con correo duplicado | `POST /api/auth/registro` | Correo electrónico ya registrado y verificado | Rechaza el registro indicando que el correo ya está registrado | `409 Conflict` |
| **CP-03** | Registro con datos inválidos | `POST /api/auth/registro` | Correo con formato inválido o contraseña débil (`123`) | Rechaza la petición detallando los campos inválidos | `400 Bad Request` |
| **CP-04** | Intento de manipular el rol en el registro | `POST /api/auth/registro` | JSON incluyendo `"rol": "ADMINISTRADOR"` | El backend ignora el atributo y asigna estrictamente `HUESPED` | `201 Created` |
| **CP-05** | Inicio de sesión sin verificar correo | `POST /api/auth/login` | Credenciales válidas de una cuenta con `verificado = false` | Impide el inicio de sesión (`requiereVerificacion: true`) e informa que debe verificar su correo | `403 Forbidden` |
| **CP-06** | Verificación de correo con token/código válido | `GET /api/auth/verificar?token=...` | Token o código de 4 dígitos vigente y no utilizado | Marca `verificado = true` en el usuario y `usado = true` en el token | `200 OK` |
| **CP-07** | Reutilización de token de verificación | `GET /api/auth/verificar?token=...` | Mismo token ya utilizado en **CP-06** | Rechaza el token por ser estrictamente de un solo uso | `400 Bad Request` |
| **CP-08** | Login con correo o contraseña incorrectos | `POST /api/auth/login` | Contraseña errónea o correo no existente | Devuelve mensaje genérico `"Credenciales inválidas. Verifique su correo electrónico y contraseña."` sin revelar cuál falló | `401 Unauthorized` |
| **CP-09** | Login exitoso por cada uno de los 4 roles | `POST /api/auth/login` | Cuentas verificadas de `ADMINISTRADOR`, `GERENTE`, `RECEPCIONISTA` y `HUESPED` | Devuelve JWT firmado (`sub`, `rol`, `ver`, `jti`, `exp`) y perfil del usuario | `200 OK` |
| **CP-10** | Acceso sin token a ruta protegida | `GET /api/reservas` | Petición sin encabezado `Authorization: Bearer` | Rechaza el acceso devolviendo respuesta JSON estructurada | `401 Unauthorized` |
| **CP-11** | Control de acceso RBAC entre los 4 roles | `GET /api/dashboard`, `GET /api/usuarios`, `POST /api/hoteles` | - `HUESPED` en `/api/hoteles` (POST) o `/api/usuarios` -> `403`<br>- `RECEPCIONISTA` en `/api/dashboard` -> `403`<br>- `GERENTE` en `/api/dashboard` -> `200`, pero en `/api/usuarios` -> `403`<br>- `ADMINISTRADOR` en `/api/usuarios` -> `200` | El servidor valida los permisos exactos de cada rol en `SecurityFilterChain` y `@PreAuthorize` | `403 Forbidden` / `200 OK` |
| **CP-12** | Aislamiento de reservaciones entre huéspedes | `PATCH /api/reservas/{id}/cancelar` | Huésped A intenta cancelar o consultar una reservación del Huésped B | El servidor verifica la propiedad de la reservación y bloquea la operación | `403 Forbidden` |
| **CP-13** | Protección del asistente IA según rol | `POST /api/v1/chat` | Huésped solicita reporte interno de habitaciones en mantenimiento u ocupadas | Las herramientas `@Tool` y el `system-prompt.st` restringen la respuesta a información pública y reservas propias | `200 OK` (filtrado) |
| **CP-14** | Cierre de sesión e invalidación de token | `POST /api/auth/logout` seguido de `GET /api/reservas` | Se revoca el hash SHA-256 del JWT en `token_revocado` y se intenta reutilizar | `JwtAuthenticationFilter` detecta el token en `TokenBlacklistService` y rechaza el acceso | `401 Unauthorized` |

---

## 4. Guía de Evidencias (Capturas de Pantalla para el Reporte)

1. **Captura 1 — Registro de Usuario (`/registro`)**:
   - Mostrar el formulario de registro y la confirmación de envío del código de 4 dígitos / enlace al correo.
2. **Captura 2 — Intento de Login sin Verificar (`/login`)**:
   - Intentar iniciar sesión antes de verificar el correo y capturar el mensaje `403` junto con los botones **"Ingresar código de 4 dígitos"** y **"Reenviar código"**.
3. **Captura 3 — Correo Electrónico Recibido (Gmail) y Pantalla de Confirmación (`/verificar-correo`)**:
   - Capturar el correo HTML recibido en Gmail y la pantalla en React confirmando la activación de la cuenta.
4. **Captura 4 — Vista de `HUESPED` (`/portal-huesped` y `/mis-reservas`)**:
   - Mostrar la barra de navegación del portal de huéspedes (`Explorar Hoteles`, `Mis Reservaciones`, `Guía y Servicios`, `Mi Perfil`) y el asistente virtual en modo Huésped.
5. **Captura 5 — Vista de `RECEPCIONISTA` (`/reservas` y `/habitaciones`)**:
   - Mostrar la consola operativa con únicamente las 2 pestañas de mostrador (`Reservaciones` y `Habitaciones`) y el bloqueo al intentar abrir `/dashboard`.
6. **Captura 6 — Vista de `GERENTE` (`/dashboard`, `/informes`, `/hoteles`, `/tipos`)**:
   - Mostrar el Dashboard financiero e Informes ejecutivos con sus 6 pestañas habilitadas y el bloqueo al intentar acceder a `/usuarios` o `/consultas`.
7. **Captura 7 — Vista de `ADMINISTRADOR` (`/usuarios` y `/consultas`)**:
   - Mostrar la barra de navegación completa con las 8 pestañas, la gestión de usuarios con los 4 roles y la consola de consultas SQL.
8. **Captura 8 — Pruebas en Postman**:
   - Ejecutar la colección `docs/postman/Hotel_Auth_Collection.json` en el Collection Runner de Postman mostrando los tests en verde (`201`, `409`, `400`, `403`, `401`, `200`).
