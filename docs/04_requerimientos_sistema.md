# 04. Requerimientos del Sistema (RF, RNF y Parking Lot)

A partir de las notas de la entrevista y del análisis de problemas se derivaron las necesidades del usuario, los requerimientos funcionales y no funcionales, así como los temas postergados para fases posteriores (*Parking Lot*).

---

## 1. Necesidades del Usuario

1. **Evitar la sobreventa y duplicidad de habitaciones:** Eliminar el uso de hojas de cálculo aisladas en red local mediante una base de datos centralizada con control transaccional.
2. **Control visual y automatizado del ciclo de vida de las reservas:** Disponibilidad en tiempo real y seguimiento claro de estados (`Pre-reserva`, `Confirmada`, `Ocupada`, `Finalizada`, `Cancelada`, `No-Show`).
3. **Automatización de documentos:** Generar confirmaciones, modificaciones y comprobantes en formato PDF de manera automática, sin edición manual en procesadores de texto.
4. **Conexión en tiempo real con Limpieza y Mantenimiento:** Conocer al instante qué cuartos están limpios, sucios o en reparación para agilizar el *check-in* a las 3:00 PM.
5. **Agilización del corte de turno y arqueo de caja:** Automatizar la suma de ingresos desglosados por método de pago y control de gastos menores.

---

## 2. Requerimientos Funcionales (RF)

| ID | Requerimiento Funcional | Descripción Detallada |
| :--- | :--- | :--- |
| **RF-01** | **Gestión Centralizada de Inventario y Disponibilidad** | El sistema debe permitir consultar la disponibilidad de habitaciones en tiempo real mediante un calendario interactivo que actualice instantáneamente el inventario para todos los usuarios concurrentes en recepción. |
| **RF-02** | **Registro de Reservas y Captura de Datos** | El sistema debe registrar solicitudes capturando datos completos del huésped (nombre, teléfono, correo), detalles de estancia (check-in, check-out, noches), desglose de ocupantes (adultos y niños), tipo de cuarto y peticiones especiales (cuna, cama extra, planta baja). |
| **RF-03** | **Control Automático de Pre-reservas** | El sistema debe gestionar pre-reservas temporales con un temporizador configurable de 24 a 48 horas, cambiando su estatus automáticamente a `Cancelada / Liberada` si no se valida el comprobante de anticipo antes del vencimiento. |
| **RF-04** | **Generación y Envío de Cartas de Confirmación** | El sistema debe generar automáticamente documentos PDF con folio consecutivo único, desglose financiero (tarifa, anticipo del 50%, saldo restante) y políticas de hospedaje, permitiendo su envío por correo electrónico en un solo clic. |
| **RF-05** | **Módulo de Check-in, Check-out y No-Show** | El sistema debe permitir registrar el ingreso formal del huésped, liquidar saldos pendientes, emitir comprobantes de pago y permitir la declaración formal de *No-Show* (a partir de las 22:00 hrs) liberando la habitación para venta inmediata. |
| **RF-06** | **Gestión de Modificaciones y Cancelaciones** | El sistema debe calcular automáticamente las penalizaciones y montos a reembolsar según las reglas de negocio (anticipación de >72h, 48-72h o <48h), actualizando saldos y emitiendo formatos de solicitud de reembolso con datos bancarios (CLABE de 18 dígitos). |
| **RF-07** | **Tablero de Estatus Operativo (Ama de Llaves)** | El sistema debe proveer una vista donde el personal pueda consultar y actualizar el estado operativo de cada habitación (`Disponible`, `Ocupada`, `Sucia`, `En Limpieza`, `Mantenimiento`). |
| **RF-08** | **Módulo de Pre-corte y Cierre de Turno** | El sistema debe consolidar automáticamente los ingresos de cada turno desglosados por método de pago (efectivo, tarjeta, transferencia) y registrar gastos menores para generar el reporte de arqueo de caja diario. |

---

## 3. Requerimientos No Funcionales (RNF)

* **RNF-01: Usabilidad y Facilidad de Aprendizaje:**
  La interfaz de usuario debe ser intuitiva, con navegación clara, tipografía legible y código de colores estandarizado (verde: disponible, azul: ocupada, ámbar: mantenimiento o pre-reserva), diseñada para operadores con conocimientos básicos de computación.
* **RNF-02: Concurrencia e Integridad Transaccional:**
  El sistema debe soportar accesos concurrentes asegurando integridad de datos (propiedades ACID) mediante transacciones y bloqueos a nivel de base de datos para impedir de raíz la asignación simultánea de una misma habitación.
* **RNF-03: Rendimiento y Tiempos de Respuesta:**
  El tiempo de respuesta del sistema para consultas de disponibilidad y registro de transacciones no debe superar los **2 segundos** bajo condiciones normales de red local.
* **RNF-04: Alta Disponibilidad y Respaldo:**
  El sistema debe estar diseñado para operar en un esquema **24/7** continuo (cubriendo los turnos matutino, vespertino y nocturno de recepción) y contar con rutinas de copia de seguridad automáticas diarias de la base de datos.
* **RNF-05: Seguridad y Control de Acceso Basado en Roles (RBAC):**
  El sistema debe restringir el acceso mediante roles y permisos diferenciados (`Recepcionista`, `Gerente`, `Limpieza`, `Administrador`), registrando bitácoras de auditoría inmutables en cancelaciones, modificaciones y reembolsos.

---

## 4. Parking Lot (Temas Aplazados para Fases Posteriores)

Durante la entrevista surgieron necesidades válidas que fueron postergadas para no comprometer el alcance prioritario del proyecto:

| Tema Pendiente | ¿Por qué quedó pendiente? | Persona a Consultar | Información Necesaria a Obtener |
| :--- | :--- | :--- | :--- |
| **Módulo de Lista de Espera Automatizada** | Se identificó como necesidad secundaria cuando el hotel está al 100% para cubrir cancelaciones de última hora. El objetivo primordial actual es estabilizar el motor de reservas y evitar sobreventas. | Gerente (Don Roberto) y Recepcionistas. | Criterios de prioridad (orden de llegada vs. noches solicitadas) y tiempo límite de respuesta del cliente antes de contactar al siguiente. |
| **Integración Contable y Facturación Electrónica (CFDI 4.0)** | El contador externo no labora físicamente en recepción todos los días y los requisitos fiscales implican normativas del SAT que exceden la operación inicial de mostrador. | Contador Externo y Gerente. | Proveedor Autorizado de Certificación (PAC), estructura de timbrado XML/PDF CFDI 4.0 y conciliación automática con estados de cuenta. |
| **Aplicación Móvil / Terminal de Piso para Camaristas y Mantenimiento** | Se detectó la necesidad de comunicación digital con limpieza, pero requiere definir previamente la disponibilidad presupuestal de dispositivos móviles o tabletas para el personal de piso. | Jefa de Camaristas, Encargado de Mantenimiento y Gerencia. | Presupuesto para hardware en piso, tiempos promedio de limpieza y protocolos de entrega de cuartos. |
