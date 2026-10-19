# 06. Historias de Usuario para Tablero Trello (Proyecto Hotel Paraíso)

Este documento contiene las Historias de Usuario completas del sistema de reservaciones del Hotel Paraíso, estructuradas de acuerdo con la metodología solicitada por el docente **Ing. José Luis García Morales** para la U.A. *Proyecto Integral de Ingeniería de Software* (UAEM Atlacomulco).

Cada historia de usuario incluye:
* 📝 **Historia de Usuario:** En formato ágil (`Como [actor] quiero [acción] para [beneficio]`).
* ✅ **Criterios de Aceptación:** Estructurados formalmente bajo la sintaxis BDD (`Dado que...`, `cuando...`, `entonces...`).
* 📌 **Reglas de Negocio:** Citando las políticas comerciales y operativas reales del hotel.
* ⚙️ **Requisitos No Funcionales (clave):** Seguridad, usabilidad, rendimiento, concurrencia y trazabilidad.

---

## 📋 Instrucciones de Configuración en Trello

1. **Crear Tablero en Trello:**
   * Nombre sugerido: `Proyecto Hotel Paraíso - Reservaciones`
   * Visibilidad: Espacio de trabajo / Privado.
2. **Invitar a los miembros del equipo y docente:**
   * Diana Laura Pérez Toribio
   * Edgar Rodríguez Rodríguez
   * Jorge Monroy Peña
   * Docente: **`joselgarcia.lsm@gmail.com`**
3. **Crear las 4 Listas por Tipo de Actor:**
   * `Historia de usuario - Huésped / Cliente`
   * `Historia de usuario - Recepcionista`
   * `Historia de usuario - Personal de Limpieza`
   * `Historia de usuario - Gerente`

---

# 🗂️ Catálogo de Historias de Usuario por Actor

---

## LISTA 1: `Historia de usuario - Huésped / Cliente`

---

### TARJETA 1
**Título:** `HU-01: Solicitud de reservación y registro de peticiones especiales`

#### Descripción:

**📝 Historia de Usuario**
Como huésped o cliente interesado en hospedarme en el Hotel Paraíso,  
quiero consultar los tipos de habitación, seleccionar mis fechas de estancia e indicar peticiones especiales (cuna, cama extra o planta baja para adulto mayor/movilidad reducida),  
para apartar mi lugar en el hotel y recibir la cotización con los datos bancarios para pagar el 50% de anticipo.

**✅ Criterios de Aceptación**
1. **Selección de fechas y ocupantes:**
   * Dado que el cliente ingresa al sistema o proporciona sus requerimientos,
   * cuando selecciona fecha de llegada, fecha de salida y desglose de personas (adultos y niños),
   * entonces el sistema debe mostrar los tipos de habitación con capacidad suficiente (Estándar, Doble, Suite) y calcular el costo total estimado de la estancia.
2. **Registro de peticiones especiales (Planta Baja y Camas Extras):**
   * Dado que el huésped viaja con una persona de la tercera edad, con discapacidad o requiere servicios adicionales,
   * cuando marca la casilla de requerimiento especial ("Habitación en Planta Baja" o "Cama Extra / Cuna"),
   * entonces el sistema debe verificar disponibilidad en las 4 habitaciones de planta baja y añadir la solicitud al registro formal de observaciones.
3. **Emisión de cotización con vigencia de pre-reserva:**
   * Dado que el cliente captura sus datos de contacto indispensables (nombre completo, teléfono a 10 dígitos y correo electrónico),
   * cuando confirma el envío de su solicitud,
   * entonces el sistema debe generar una pre-reserva tentativa, asignarle un temporizador de 24 a 48 horas y enviarle automáticamente la cotización con las cuentas bancarias para el pago del 50%.

**📌 Reglas de Negocio**
* **RN1:** Existen únicamente 4 habitaciones situadas en Planta Baja, reservadas con carácter estrictamente prioritario para adultos mayores o personas con movilidad reducida.
* **RN2:** Las tarifas se calculan según el tipo de habitación (Estándar, Doble, Suite), temporada (alta o baja) y cargos extra por persona adicional o cuna/cama supletoria.
* **RN3:** Para apartar el cuarto sin pago inmediato, la solicitud se registra como "Pre-reserva" con un plazo estricto de 24 a 48 horas para remitir el comprobante de anticipo del 50%; de lo contrario, se libera automáticamente.

**⚙️ Requisitos No Funcionales (clave)**
* **Usabilidad:** Formulario accesible con validaciones claras en tiempo real para teléfono (10 dígitos) y correo electrónico.
* **Rendimiento:** Tiempo de respuesta del cálculo de cotización y verificación de disponibilidad ≤ 2 segundos.

---

### TARJETA 2
**Título:** `HU-02: Solicitud de modificación de fechas o habitación con ajuste tarifario`

#### Descripción:

**📝 Historia de Usuario**
Como huésped con reservación confirmada,  
quiero solicitar la modificación de mis fechas de estancia, tipo de habitación o número de personas,  
para reprogramar mi viaje aplicando las tarifas vigentes y penalizaciones según las políticas del hotel.

**✅ Criterios de Aceptación**
1. **Modificación sin costo (anticipación ≥ 48 hrs):**
   * Dado que el cliente solicita modificar su estancia con más de 48 horas de anticipación a la fecha de llegada original,
   * cuando existen fechas disponibles en el tipo de cuarto solicitado,
   * entonces el sistema debe actualizar la reserva recalculando el saldo total sin aplicar penalización económica.
2. **Modificación con penalización (anticipación < 48 hrs):**
   * Dado que el cliente solicita un cambio con menos de 48 horas de anticipación,
   * cuando se procesa la solicitud,
   * entonces el sistema debe aplicar automáticamente un cobro de penalización equivalente al costo de la primera noche de hospedaje.
3. **Emisión de confirmación actualizada:**
   * Dado que la modificación fue autorizada y guardada,
   * cuando se finaliza el proceso,
   * entonces el sistema debe regenerar la carta de confirmación en PDF manteniendo el folio original con el sufijo "Modificación #1" y el saldo restante ajustado.

**📌 Reglas de Negocio**
* **RN1:** Se permiten cambios sin costo hasta 48 horas antes de la llegada original (sujeto a disponibilidad y ajuste tarifario de temporada).
* **RN2:** Modificaciones solicitadas con menos de 48 horas aplican penalización obligatoria equivalente a la primera noche de hospedaje.
* **RN3:** El plazo máximo para reprogramar una estancia es de 3 meses a partir de la fecha original contratada.
* **RN4:** Queda prohibido transferir la titularidad de la reserva a terceras personas sin autorización previa por escrito del titular original.

**⚙️ Requisitos No Funcionales (clave)**
* **Rendimiento:** Recálculo automático de saldos y disponibilidad en tiempo real (≤ 2 segundos).
* **Usabilidad:** Desglose transparente en pantalla de montos previos, penalizaciones y nuevo saldo a liquidar al llegar.

---

### TARJETA 3
**Título:** `HU-03: Solicitud de cancelación y cálculo de reembolso según anticipación`

#### Descripción:

**📝 Historia de Usuario**
Como huésped con reservación garantizada,  
quiero solicitar la cancelación de mi reservación y capturar mis datos bancarios,  
para tramitar la devolución de mi anticipo de acuerdo con las políticas oficiales de cancelación del hotel.

**✅ Criterios de Aceptación**
1. **Cancelación con más de 72 horas (reembolso del 100%):**
   * Dado que la cancelación se solicita con más de 72 horas de anticipación a la fecha de llegada,
   * cuando el sistema calcula la anticipación,
   * entonces debe autorizar el reembolso del 100% del anticipo pagado sin cobro de penalización.
2. **Cancelación entre 48 y 72 horas (reembolso del 50%):**
   * Dado que la cancelación se solicita en el rango de 48 a 72 horas previas a la llegada,
   * cuando el sistema evalúa los tiempos,
   * entonces debe autorizar el reembolso del 50% del anticipo y retener el 50% restante como penalización.
3. **Cancelación con menos de 48 horas (sin reembolso):**
   * Dado que la cancelación se solicita con menos de 48 horas de anticipación,
   * cuando se procesa la solicitud,
   * entonces el sistema debe determinar 0% de reembolso, retener el 100% del anticipo y liberar la habitación para venta inmediata.
4. **Captura de datos de transferencia:**
   * Dado que la cancelación amerita reembolso (> 0%),
   * cuando se aprueba la solicitud,
   * entonces el sistema debe capturar el nombre del titular, banco y cuenta CLABE interbancaria (18 dígitos) generando la ficha de dispersión para Gerencia.

**📌 Reglas de Negocio**
* **RN1:** Políticas oficiales de cancelación: más de 72 hrs: 100% de devolución; 48 a 72 hrs: 50% de devolución; menos de 48 hrs: 0% de devolución (penalización total).
* **RN2:** La cuenta CLABE interbancaria ingresada debe contener exactamente 18 dígitos numéricos válidos.
* **RN3:** Todo reembolso debe ser ratificado y dispersado por transferencia exclusivamente por el Gerente General.

**⚙️ Requisitos No Funcionales (clave)**
* **Seguridad:** Validación de máscara para datos bancarios (CLABE de 18 dígitos).
* **Trazabilidad:** Generación de registro de auditoría con motivo de cancelación, fecha, hora y usuario.

---

## LISTA 2: `Historia de usuario - Recepcionista`

---

### TARJETA 4
**Título:** `HU-04: Consulta de disponibilidad de habitaciones en tiempo real`

#### Descripción:

**📝 Historia de Usuario**
Como recepcionista del hotel,  
quiero consultar la disponibilidad de habitaciones filtrando por fechas, tipo de habitación y piso en tiempo real,  
para ofrecer información veraz al cliente y evitar sobreventas (*overbooking*) por duplicidad de registros.

**✅ Criterios de Aceptación**
1. **Filtro dinámico de disponibilidad:**
   * Dado que el recepcionista ingresa al módulo de reservaciones,
   * cuando selecciona un rango de fechas (llegada y salida),
   * entonces el sistema debe mostrar únicamente las habitaciones libres con su tarifa calculada y tipo de habitación.
2. **Bloqueo transaccional ante concurrencia:**
   * Dado que dos recepcionistas consultan la misma habitación simultáneamente,
   * cuando uno de ellos inicia el registro y aparta la habitación,
   * entonces el sistema debe actualizar instantáneamente el estatus para el segundo usuario, impidiendo que ambos asignen el mismo cuarto.
3. **Identificación de habitaciones en Planta Baja:**
   * Dado que el recepcionista atiende a un cliente con movilidad reducida o adulto mayor,
   * cuando filtra por piso 1 (planta baja),
   * entonces el sistema debe priorizar y mostrar las 4 habitaciones de planta baja indicando su estado.

**📌 Reglas de Negocio**
* **RN1:** Queda prohibida la sobreventa (*overbooking*); el sistema no permitirá más de una reservación confirmada o pre-reserva activa sobre la misma habitación en el mismo rango de fechas.
* **RN2:** Las 4 habitaciones situadas en Planta Baja tienen prioridad estricta para personas de la tercera edad o con movilidad reducida.
* **RN3:** Los estados de habitación son: `Disponible`, `Pre-reserva`, `Ocupada`, `En Limpieza` y `Mantenimiento`.

**⚙️ Requisitos No Funcionales (clave)**
* **Concurrencia:** Integridad transaccional (propiedades ACID) para evitar condiciones de carrera al reservar.
* **Rendimiento:** Tiempo de respuesta de consulta de inventario ≤ 2 segundos.
* **Usabilidad:** Código de colores representativo (verde: disponible, amarillo: pre-reserva, rojo: ocupado).

---

### TARJETA 5
**Título:** `HU-05: Gestión de Pre-reservas con temporizador de expiración (24-48 hrs)`

#### Descripción:

**📝 Historia de Usuario**
Como recepcionista del hotel,  
quiero registrar una pre-reserva tentativa para clientes que no pagan de inmediato asignando un temporizador de 24 a 48 horas,  
para apartar temporalmente el cuarto sin que se quede bloqueado indefinidamente si el cliente no envía el anticipo.

**✅ Criterios de Aceptación**
1. **Registro de pre-reserva tentativa:**
   * Dado que un cliente solicita apartar un cuarto sin liquidar anticipo en el momento,
   * cuando el recepcionista ingresa sus datos (nombre, teléfono, correo) y define un plazo de 24 o 48 horas,
   * entonces el sistema debe cambiar el estado del cuarto a `Pre-reserva` (amarillo) e iniciar la cuenta regresiva.
2. **Liberación automática por vencimiento:**
   * Dado que una habitación se encuentra en estado `Pre-reserva`,
   * cuando el temporizador llega a cero sin que se registre el comprobante de anticipo,
   * entonces el sistema debe cambiar automáticamente el estado a `Disponible` (verde) y registrar la cancelación por expiración.
3. **Alerta visual previa al vencimiento:**
   * Dado que faltan 4 horas o menos para el vencimiento de una pre-reserva,
   * cuando el recepcionista consulta el panel de reservaciones,
   * entonces el sistema debe mostrar una alerta visual destacada para permitir el contacto de seguimiento con el cliente.

**📌 Reglas de Negocio**
* **RN1:** La vigencia máxima permitida para una pre-reserva es de 24 a 48 horas según criterio del operador.
* **RN2:** Si no se registra el comprobante de anticipo dentro del lapso estipulado, la liberación del inventario es automática e irrevocable.
* **RN3:** Los datos obligatorios para registrar una pre-reserva son: nombre completo, teléfono y correo electrónico.

**⚙️ Requisitos No Funcionales (clave)**
* **Automatización:** Ejecución programada en segundo plano (*background job*) para evaluación de vigencias cada 15 minutos.
* **Trazabilidad:** Registro de fecha y hora exacta de creación, caducidad y cancelación automática con identificador del operador.

---

### TARJETA 6
**Título:** `HU-06: Confirmación de reservación mediante anticipo del 50% y emisión de PDF`

#### Descripción:

**📝 Historia de Usuario**
Como recepcionista del hotel,  
quiero registrar el pago del 50% de anticipo y generar la carta de confirmación oficial en PDF con folio único,  
para formalizar el bloqueo de la habitación y enviar al cliente su comprobante detallado con un solo clic.

**✅ Criterios de Aceptación**
1. **Validación del 50% de garantía:**
   * Dado que una habitación está pre-reservada o solicitada,
   * cuando el recepcionista ingresa el pago del anticipo por transferencia, tarjeta o efectivo,
   * entonces el sistema debe validar que el monto cubra exactamente al menos el 50% del total de la estancia antes de confirmar.
2. **Emisión de folio y cambio de estatus:**
   * Dado que el anticipo fue validado exitosamente,
   * cuando se confirma la transacción,
   * entonces el sistema debe asignar un número de folio consecutivo irrepetible y cambiar el estado de la habitación a `Confirmada`.
3. **Generación automática de carta de confirmación en PDF:**
   * Dado que la reservación quedó confirmada,
   * cuando el recepcionista hace clic en "Generar Confirmación",
   * entonces el sistema debe emitir un PDF descargable con membrete del hotel, desglose financiero (anticipo 50%, saldo pendiente 50%), datos del huésped y políticas de hospedaje.

**📌 Reglas de Negocio**
* **RN1:** Toda reservación requiere obligatoriamente un anticipo del 50% del total para considerarse garantizada.
* **RN2:** Cada confirmación debe incluir un número de folio único consecutivo y sello de fecha/hora de emisión.
* **RN3:** La carta en PDF debe contener la leyenda obligatoria: *"Presentar esta confirmación impresa o digital y una identificación oficial vigente al momento de su llegada"*.

**⚙️ Requisitos No Funcionales (clave)**
* **Seguridad:** Control de acceso por rol; únicamente recepción y gerencia pueden registrar pagos y emitir confirmaciones.
* **Rendimiento:** Generación y renderizado del documento PDF en ≤ 2 segundos.

---

### TARJETA 7
**Título:** `HU-07: Registro de Check-in y liquidación de saldo restante en mostrador`

#### Descripción:

**📝 Historia de Usuario**
Como recepcionista del hotel,  
quiero registrar la llegada formal del huésped (*check-in*) y cobrar el saldo restante del 50% en mostrador,  
para verificar su identidad, entregar la llave y emitir la nota de remisión correspondiente.

**✅ Criterios de Aceptación**
1. **Validación de hora de entrada oficial:**
   * Dado que un huésped se presenta en recepción,
   * cuando la hora actual es a partir de las 15:00 hrs,
   * entonces el sistema debe habilitar el botón de `Realizar Check-in` en su folio de reservación.
2. **Validación del estatus de limpieza:**
   * Dado que el recepcionista intenta completar el check-in,
   * cuando la habitación asignada aún se encuentra en estatus `Sucia` o `En Limpieza`,
   * entonces el sistema debe alertar al recepcionista impidiendo la entrega formal hasta que limpieza confirme el estado `Limpia`.
3. **Cobro y liquidación de saldo restante:**
   * Dado que el cliente liquida el 50% restante en efectivo o tarjeta bancaria,
   * cuando se procesa el cobro,
   * entonces el sistema debe marcar el saldo de la estancia en $0.00, registrar el ingreso y cambiar el estado de la habitación a `Ocupada`.

**📌 Reglas de Negocio**
* **RN1:** El horario oficial de entrada (*check-in*) es a partir de las 15:00 hrs.
* **RN2:** Ninguna habitación puede ser entregada al huésped si su estatus en el sistema no es `Limpia`.
* **RN3:** El saldo total de la estancia debe quedar 100% liquidado al momento de ingresar a la habitación.

**⚙️ Requisitos No Funcionales (clave)**
* **Usabilidad:** Alertas visuales destacadas si el cuarto asignado no está listo al momento de la llegada del cliente.
* **Trazabilidad:** Registro del operador de mostrador, método de pago y número de nota de remisión emitida.

---

### TARJETA 8
**Título:** `HU-08: Gestión de llegadas tardías y declaración de No-Show`

#### Descripción:

**📝 Historia de Usuario**
Como recepcionista del turno nocturno,  
quiero recibir alertas a las 20:00 hrs de huéspedes pendientes de llegada y poder declarar el *No-Show* a las 22:00 hrs con un solo clic,  
para liberar habitaciones no ocupadas, retener el anticipo según política y permitir su venta inmediata a clientes de paso (*walk-in*).

**✅ Criterios de Aceptación**
1. **Monitoreo preventivo a las 20:00 hrs:**
   * Dado que son las 20:00 hrs del día de llegada,
   * cuando el recepcionista consulta el panel de estatus,
   * entonces el sistema debe listar los huéspedes confirmados que no han realizado check-in para facilitar el contacto preventivo por WhatsApp/teléfono.
2. **Registro de llegada tardía notificada:**
   * Dado que un cliente avisa que llegará demorado antes de las 20:00 hrs,
   * cuando el recepcionista activa la casilla "Llegada Tardía Notificada" con la hora estimada,
   * entonces el sistema debe mantener el cuarto protegido después de las 22:00 hrs para el turno nocturno.
3. **Declaración formal de No-Show a las 22:00 hrs:**
   * Dado que son las 22:00 hrs y el cliente no se presentó ni notificó retraso,
   * cuando el recepcionista hace clic en "Declarar No-Show",
   * entonces el sistema debe cambiar el estatus a `No-Show`, retener el 100% del anticipo y liberar la habitación a estado `Disponible` para clientes *walk-in*.

**📌 Reglas de Negocio**
* **RN1:** La habitación garantizada se reserva hasta las 20:00 hrs del día de llegada.
* **RN2:** Si a las 22:00 hrs el cliente no se presenta ni contesta, se declara *No-Show* y se retiene el 100% del anticipo como compensación por noche perdida.
* **RN3:** Huéspedes con llegada tardía notificada antes de las 20:00 hrs no pueden ser marcados como *No-Show*.

**⚙️ Requisitos No Funcionales (clave)**
* **Rendimiento:** La liberación de la habitación y actualización del calendario debe ser inmediata (< 1 segundo).
* **Seguridad:** Confirmación con modal de seguridad previo a ejecutar la acción irrevocable de *No-Show*.

---

## LISTA 3: `Historia de usuario - Personal de Limpieza`

---

### TARJETA 9
**Título:** `HU-09: Actualización en tiempo real del estado operativo de habitaciones`

#### Descripción:

**📝 Historia de Usuario**
Como jefa de camaristas o personal de limpieza,  
quiero consultar la lista de habitaciones por piso y actualizar su estatus operativo (`Sucia`, `En Limpieza`, `Limpia`, `Mantenimiento`),  
para que recepción conozca de inmediato qué habitaciones están listas para el check-in y cuáles requieren atenciones especiales.

**✅ Criterios de Aceptación**
1. **Visualización de hoja de piso digital:**
   * Dado que la jefa de camaristas inicia sesión en el sistema,
   * cuando visualiza el tablero de piso,
   * entonces debe poder ver las habitaciones organizadas por piso, identificando salidas del día y solicitudes especiales (cunas o camas extras).
2. **Transición de estatus tras limpieza:**
   * Dado que una camarista concluye la limpieza y desinfección de una habitación desocupada,
   * cuando selecciona la habitación y presiona el botón "Marcar como Limpia",
   * entonces el sistema debe cambiar el estado a `Limpia` en tiempo real y emitir una señal visual al módulo de recepción.
3. **Reporte de avería a mantenimiento:**
   * Dado que el personal de piso detecta un problema de plomería o cerrajería,
   * cuando selecciona "Reportar Avería",
   * entonces el sistema debe cambiar el cuarto a estado `Mantenimiento` (bloqueándolo para venta) y alertar al mostrador.

**📌 Reglas de Negocio**
* **RN1:** La realización de un *Check-out* cambia automáticamente la habitación a estado `Sucia`.
* **RN2:** Solo usuarios con rol `Limpieza`, `Camarista` o `Gerente` pueden marcar una habitación como `Limpia`.
* **RN3:** Las habitaciones en estado `Mantenimiento` quedan estrictamente excluidas de las opciones de asignación de recepción.

**⚙️ Requisitos No Funcionales (clave)**
* **Usabilidad:** Interfaz con botones grandes y táctiles optimizada para dispositivos móviles o tablets en piso.
* **Disponibilidad:** Disponibilidad del servicio 99.5% durante los turnos diurnos de limpieza.

---

## LISTA 4: `Historia de usuario - Gerente`

---

### TARJETA 10
**Título:** `HU-10: Autorización y dispersión de reembolsos bancarios y arqueo de caja`

#### Descripción:

**📝 Historia de Usuario**
Como gerente del hotel (Don Roberto),  
quiero revisar en una bandeja ejecutiva las solicitudes de reembolso por cancelación y los reportes de pre-corte de caja de cada turno,  
para autorizar la dispersión bancaria a clientes, conciliar los ingresos con las cuentas de banco y mantener la salud financiera del negocio.

**✅ Criterios de Aceptación**
1. **Bandeja de autorización de cancelaciones:**
   * Dado que recepción generó una solicitud de reembolso por cancelación,
   * cuando el gerente ingresa al módulo administrativo,
   * entonces el sistema debe mostrar la solicitud con el porcentaje de penalización aplicado, el comprobante original adjunto y los datos de la cuenta CLABE.
2. **Registro de dispersión bancaria:**
   * Dado que el gerente valida la transferencia bancaria en la banca electrónica,
   * cuando hace clic en "Aprobar y Registrar Transferencia" e ingresa la referencia bancaria,
   * entonces el sistema debe cerrar la solicitud, notificar por correo al cliente y registrar la salida contable.
3. **Arqueo y conciliación de turnos:**
   * Dado que se recibieron los sobres físicos de pre-corte en caja fuerte,
   * cuando el gerente coteja el pre-corte en el sistema contra el estado de cuenta y terminales,
   * entonces el sistema debe permitir registrar la firma electrónica de visto bueno y cerrar el balance diario general.

**📌 Reglas de Negocio**
* **RN1:** La autorización de dispersión de reembolsos monetarios es potestad exclusiva del usuario con rol `Gerente`.
* **RN2:** Ninguna solicitud de reembolso puede procesarse sin la captura previa de una CLABE interbancaria válida y la referencia de transferencia.
* **RN3:** Los descuentos especiales en tarifas o cortesías por overbooking requieren obligatoriamente la autorización registrada del Gerente.

**⚙️ Requisitos No Funcionales (clave)**
* **Seguridad y Control de Acceso (RBAC):** Restricción de acceso mediante autenticación con privilegios de rol `Gerente`.
* **Trazabilidad y Auditoría:** Bitácora inmutable de cada autorización, con fecha, hora, monto, usuario y referencia bancaria para conciliación fiscal.

---

### 💡 TARJETA ADICIONAL (Opcional para Recepcionista)
**Título:** `HU-EXTRA: Pre-corte de caja y arqueo de valores por turno`

#### Descripción:
```markdown
📝 Historia de Usuario
Como recepcionista del hotel,
quiero consolidar al cierre de mi turno los ingresos cobrados desglosados por método de pago (efectivo, tarjeta, transferencias),
para generar el reporte de pre-corte, cuadrar el fondo inicial y resguardar los comprobantes en caja fuerte para revisión de Gerencia.

✅ Criterios de Aceptación
1. Consolidación automática de ingresos
   o Dado que el recepcionista finaliza su jornada,
   o cuando solicita el pre-corte de turno,
   o entonces el sistema debe sumarizar automáticamente los cobros registrados en su sesión filtrando por efectivo, terminal bancaria y transferencias validadas.
2. Registro de gastos menores de caja chica
   o Dado que durante el turno se realizó un gasto menor autorizado en efectivo (ej. agua, insumos),
   o cuando el recepcionista ingresa el monto y concepto del ticket,
   o entonces el sistema debe descontar la salida del saldo final de efectivo en caja.
3. Generación e impresión de hoja de arqueo
   o Dado que se ingresaron los totales físicos,
   o cuando se cierra el turno,
   o entonces el sistema debe generar la hoja de arqueo foliada con el desglose exacto, calculando si existe sobrante o faltante y bloqueando nuevas operaciones bajo esa sesión.

📌 Reglas de Negocio
• RN1. Cada turno inicia con un fondo fijo de efectivo flotante para cambio.
• RN2. Todo cobro con tarjeta debe respaldarse con el voucher firmado correspondiente al cierre de lote.
• RN3. Una vez cerrado el pre-corte, la sesión del recepcionista no permite registrar nuevos cobros retroactivos.

⚙️ Requisitos No Funcionales (clave)
• Trazabilidad: Registro inmutable con fecha, hora exacta, número de turno y nombre del operador responsable.
• Seguridad: Los montos solo pueden ser editados o conciliados posteriormente por el usuario con rol Gerente.
```
