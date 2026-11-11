# Documento de Pruebas: Autenticación y Manejo de Sesiones

## 1. Configuración Previa (`.env`)

Antes de iniciar el backend, asegúrate de configurar el archivo `.env` en la raíz del proyecto (usando `.env.example` como plantilla):

| Variable | Descripción |
| :--- | :--- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a PostgreSQL (`hotel_reservas`). |
| `JWT_SECRET` | Clave secreta de al menos 32 bytes para firmar tokens HMAC-SHA256. |
| `JWT_EXPIRATION_MS` | Tiempo de vida del token en milisegundos (ej. `3600000` = 1 hora). |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Credenciales SMTP de Gmail (usar **Contraseña de Aplicación** de 16 caracteres generada en la cuenta de Google). |
| `APP_FRONTEND_URL` | URL base del frontend (`http://localhost:5173`) para construir el enlace de verificación por correo. |
| `ADMIN_INITIAL_NAME`, `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Datos del primer usuario `ADMINISTRADOR` creado automáticamente al arrancar el servidor (`AdminSeeder`). |

---

## 2. Matriz de Casos de Prueba (Exitosos y de Error)

| ID | Caso de Prueba | Endpoint / Acción | Entrada / Condición | Resultado Esperado | Código HTTP |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-01** | Registro válido de huésped | `POST /api/auth/registro` | Nombre, correo nuevo y contraseña con $\ge 8$ caracteres, mayúscula, minúscula y número | Crea usuario con `rol = HUESPED`, `verificado = false`, contraseña hasheada con BCrypt y envía correo con enlace de verificación | `201 Created` |
| **CP-02** | Registro con correo duplicado | `POST /api/auth/registro` | Correo electrónico ya registrado previamente | Rechaza el registro indicando que el correo ya está registrado | `409 Conflict` |
| **CP-03** | Registro con datos inválidos | `POST /api/auth/registro` | Correo con formato inválido o contraseña débil (`123`) | Rechaza la petición detallando los campos inválidos | `400 Bad Request` |
| **CP-04** | Intento de manipular el rol en el registro | `POST /api/auth/registro` | JSON incluyendo `"rol": "ADMINISTRADOR"` | El backend ignora el atributo y asigna estrictamente `HUESPED` | `201 Created` |
| **CP-05** | Inicio de sesión sin verificar correo | `POST /api/auth/login` | Credenciales válidas de una cuenta con `verificado = false` | Impide el inicio de sesión e informa que debe verificar su correo electrónico | `403 Forbidden` |
| **CP-06** | Verificación de correo con token válido | `GET /api/auth/verificar?token=...` | Token aleatorio vigente y no utilizado | Marca `verificado = true` en el usuario y `usado = true` en el token | `200 OK` |
| **CP-07** | Reutilización de token de verificación | `GET /api/auth/verificar?token=...` | Mismo token ya utilizado en **CP-06** | Rechaza el token por ser de un solo uso | `400 Bad Request` |
| **CP-08** | Login con correo o contraseña incorrectos | `POST /api/auth/login` | Contraseña errónea o correo no existente | Devuelve mensaje genérico `"Correo o contraseña incorrectos."` sin revelar cuál falló | `401 Unauthorized` |
| **CP-09** | Login exitoso (`HUESPED` / `ADMINISTRADOR`) | `POST /api/auth/login` | Correo verificado y contraseña correcta | Devuelve JWT firmado (`sub`, `rol`, `jti`, `exp`) y datos básicos del usuario | `200 OK` |
| **CP-10** | Acceso sin token a ruta protegida | `GET /api/reservas` | Petición sin encabezado `Authorization: Bearer` | Rechaza el acceso devolviendo respuesta JSON estructurada | `401 Unauthorized` |
| **CP-11** | Acceso de `HUESPED` a módulo exclusivo de `ADMINISTRADOR` | `POST /api/hoteles` o `GET /api/usuarios` | Token JWT válido con rol `HUESPED` | El servidor bloquea la operación por falta de privilegios | `403 Forbidden` |
| **CP-12** | Aislamiento de reservaciones entre huéspedes | `PATCH /api/reservas/{id}/cancelar` | Huésped A intenta cancelar o modificar una reservación del Huésped B | El servidor verifica la propiedad de la reservación y bloquea la operación | `403 Forbidden` |
| **CP-13** | Protección del asistente IA según rol | `GET /api/ai/chat` | Huésped solicita reporte interno de habitaciones en mantenimiento u ocupadas | Las herramientas `@Tool` y el `system-prompt.st` restringen la respuesta a información pública y reservas propias | `200 OK` (filtrado) |
| **CP-14** | Cierre de sesión e invalidación de token | `POST /api/auth/logout` seguido de `GET /api/reservas` | Se revoca el JWT y se intenta reutilizar en una petición posterior | El `JwtAuthenticationFilter` detecta el `jti` en `TokenBlacklistService` y rechaza el token | `401 Unauthorized` |

---

## 3. Guía de Evidencias (Capturas de Pantalla para el Reporte)

1. **Captura 1 — Registro de Usuario (`/registro`)**:
   - Mostrar el formulario de registro y la alerta verde confirmando que se envió el enlace de verificación al correo.
2. **Captura 2 — Intento de Login sin Verificar (`/login`)**:
   - Intentar iniciar sesión antes de abrir el correo y capturar el mensaje de error `403` junto con el botón **"Reenviar correo de verificación"**.
3. **Captura 3 — Correo Electrónico Recibido (Gmail) y Pantalla de Confirmación (`/verificar-correo`)**:
   - Capturar el correo HTML recibido en Gmail con el botón **"Confirmar mi correo electrónico"** y la pantalla en React confirmando la activación de la cuenta.
4. **Captura 4 — Vista de `HUESPED` (`/reservas`)**:
   - Mostrar la barra de navegación superior donde el huésped únicamente ve **"Mis Reservaciones"**, su insignia `Huésped`, el formulario autocompletado con su nombre/correo y el asistente virtual en modo Huésped.
5. **Captura 5 — Vista de `ADMINISTRADOR` (`/usuarios`, `/habitaciones`, `/consultas`)**:
   - Mostrar la barra de navegación completa (`Reservaciones`, `Habitaciones`, `Hoteles`, `Tipos Habitación`, `Consultas`, `Usuarios`), la gestión de usuarios y cuentas verificadas, y el asistente IA en modo Administrador.
6. **Captura 6 — Pruebas en Postman**:
   - Ejecutar la colección `docs/postman/Hotel_Auth_Collection.json` en el Collection Runner de Postman mostrando los tests en verde (`201`, `409`, `400`, `403`, `401`, `200`).
