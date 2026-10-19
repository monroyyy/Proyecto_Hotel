# 01. Notas de la Entrevista y Levantamiento de Requerimientos

## Datos Institucionales y Académicos
* **Institución:** Universidad Autónoma del Estado de México (UAEM)
* **Espacio Académico:** Centro Universitario UAEM Atlacomulco
* **Unidad de Aprendizaje:** Proyecto Integral de Ingeniería de Software
* **Docente:** José Luis García Morales
* **Grupo:** ICO-27 — Licenciatura en Ingeniería en Computación
* **Integrantes del Equipo:**
  * Jorge Monroy Peña
  * Edgar Rodríguez Rodríguez
  * Diana Laura Pérez Toribio
* **Fecha de Levantamiento:** 22 de Agosto de 2026
* **Actividad:** Role Play con IA — Entrevista de Requerimientos con Simulador (Rol del entrevistado: Javier, recepcionista del Hotel Paraíso).

---

## 1.1 Usuarios y Roles Identificados

1. **Huésped / Cliente:**
   * Solicita cotizaciones por llamada, correo o WhatsApp.
   * Realiza el pago del anticipo obligatorio del 50%.
   * Recibe cartas de confirmación en PDF vía correo electrónico.
   * Liquida el 50% restante en mostrador durante el *Check-in*.
   * Recibe llaves de la habitación y notas de remisión foliadas.

2. **Recepcionista (Javier):**
   * Atiende llamadas telefónicas, mensajes y correos electrónicos.
   * Consulta manualmente la disponibilidad de cuartos en una hoja de Excel compartida.
   * Registra "pre-reservas" (bloqueo en amarillo) y confirmaciones.
   * Redacta cartas de confirmación y modificación en plantillas de Word y las exporta a PDF.
   * Realiza cobros en efectivo y con terminal bancaria física en mostrador.
   * Gestiona solicitudes de cambio o cancelación de fechas.
   * Elabora el reporte de pre-corte de caja al finalizar su turno y resguarda los valores en caja fuerte.

3. **Gerente (Don Roberto):**
   * Establece las tarifas de temporada (alta y baja) y precios vigentes.
   * Autoriza descuentos para grupos o clientes frecuentes de empresas de la zona.
   * Autoriza cancelaciones y procesa solicitudes de reembolso bancario.
   * Revisa la cuenta bancaria del hotel para verificar transferencias dudosas o con comprobantes ilegibles.
   * Supervisa la ocupación general del hotel y realiza el arqueo final de caja con los sobres de los recepcionistas.

4. **Jefa de Camaristas y Personal de Limpieza:**
   * Recibe diariamente a primera hora de la mañana (antes de las 9:00 AM) una copia impresa de la lista de ocupación de Excel.
   * Gestiona el estatus de las habitaciones en una tabla física con lápiz (cuáles están ocupadas, cuáles van de salida y cuáles quedaron limpias).
   * Prepara peticiones especiales (cunas, camas extras).
   * Comunica por radio o en persona a recepción cuando una habitación ha sido liberada y desinfectada.

5. **Personal de Mantenimiento:**
   * Atiende reportes de desperfectos en las habitaciones (fugas de agua, plomería, aire acondicionado, cerraduras).
   * Recibe avisos verbales por radio, notas en papel o avisos directos de las camaristas.

6. **Botones:**
   * Recibe de recepción la asignación de habitaciones y llaves.
   * Asiste a los huéspedes con el equipaje hacia su habitación.
   * Brinda apoyo prioritario a personas de la tercera edad o con movilidad reducida (especialmente en habitaciones de planta baja).

7. **Contador Externo:**
   * Acude periódicamente al hotel (una o dos veces por semana) o se comunica con gerencia.
   * Concilia ingresos contra los estados de cuenta bancarios y los cierres de lote de las terminales.
   * Emite las facturas electrónicas (CFDI 4.0) a los clientes que solicitaron factura con sus datos fiscales del SAT.

---

## 1.2 Procesos Identificados en el Negocio

1. **Cotización y Consulta de Disponibilidad:**
   * Recepción de la solicitud por teléfono, correo institucional o WhatsApp Web.
   * El recepcionista revisa visualmente en la hoja de Excel si hay celdas libres en las fechas solicitadas.
   * Envío de cotización con las tarifas vigentes y los datos bancarios del hotel para el depósito.

2. **Registro de Pre-reserva (Apartado Temporal):**
   * Si el cliente confirma interés pero no paga en el acto, se bloquea la habitación pintando la celda de color **amarillo** en Excel.
   * Se otorga un plazo estricto de **24 a 48 horas** para enviar el comprobante de anticipo.

3. **Confirmación de Reserva:**
   * Recepción y validación del comprobante del 50% de anticipo.
   * Cambio de estado en Excel de "amarillo" a "confirmado" (verde).
   * Llenado manual de la plantilla de Word con los datos de la reserva, exportación a PDF y envío por correo electrónico al cliente con su número de folio.

4. **Check-in y Liquidación:**
   * Cotejo de la reserva buscando la ficha impresa en el fólder de acordeón clasificado por días.
   * Cobro del 50% restante (efectivo o tarjeta bancaria).
   * Emisión manual de nota de remisión foliada con copia al carbón.
   * Entrega de llaves y firma de conformidad por parte del huésped.

5. **Modificación de Reservación:**
   * El recepcionista verifica en Excel si hay disponibilidad en las nuevas fechas.
   * Si cambia de temporada o tipo de cuarto, recalcula la diferencia manualmente.
   * Modifica las celdas en Excel y emite una nueva plantilla de Word con el sufijo *"Modificación #1"*.

6. **Cancelación y Reembolso:**
   * Verificación de las horas de anticipación a la fecha de llegada.
   * Llenado de formato interno membretado con datos del cliente y CLABE interbancaria (18 dígitos).
   * Entrega física a Don Roberto para firma y dispersión bancaria; posterior liberación manual de la celda en Excel.

7. **Control de No-Show (Huéspedes que no se presentan):**
   * Monitoreo a las 8:00 PM de reservas pendientes de llegar. Si el cliente avisa demora, se deja nota a recepción nocturna.
   * Si a las 10:00 PM el cliente no llega ni contesta mensajes o llamadas, se declara formalmente *No-Show*, se retiene el 50% del anticipo y la habitación se libera para venta inmediata (*walk-in*).

8. **Pre-corte de Turno:**
   * Al terminar cada turno, el recepcionista cuenta el efectivo recibido, suma los vouchers de la terminal y los comprobantes de transferencias.
   * Llena una hoja de arqueo físico y deposita todo en un sobre cerrado bajo llave dentro de la caja fuerte de recepción para revisión del gerente.

---

## 1.3 Datos Manejados por el Sistema

| Categoría | Datos Específicos |
| :--- | :--- |
| **Datos del Huésped** | Nombre completo, teléfono de contacto y correo electrónico. |
| **Datos de la Estancia** | Fecha de llegada (*check-in*), fecha de salida (*check-out*), total de noches, número de adultos, número de niños y peticiones especiales (cuna, cama extra, planta baja). |
| **Datos de la Habitación** | Tipo de habitación (Estándar, Doble, Suite), número de habitación asignada y tarifa por noche aplicada. |
| **Datos Financieros** | Costo total del hospedaje, anticipo pagado (50%), método de pago (transferencia, depósito, tarjeta, efectivo), saldo pendiente y cargos por penalización. |
| **Datos Fiscales (SAT)** | RFC, Razón Social, Régimen Fiscal, Código Postal y Uso de CFDI. |
| **Datos Bancarios (Reembolso)** | Nombre del titular, Banco emisor y cuenta CLABE interbancaria (18 dígitos). |
| **Datos de Arqueo / Caja** | Fondo inicial flotante, desglose por método de pago, gastos menores de caja chica y folios cobrados. |

---

## 1.4 Problemas Detectados en la Operación Actual

1. **Sobreventa (*Overbooking*) y Duplicidad:**
   * Múltiples computadoras en recepción abren simultáneamente el mismo archivo de Excel en red local. Al guardar al mismo tiempo, los cambios se sobreescriben, provocando sobrecupo y obligando al hotel a reubicar huéspedes en hoteles convenio, pagando taxis y tarifas más caras.
2. **Bloqueos "Fantasma" por Pre-reservas Vencidas:**
   * Olvido frecuente de los recepcionistas de revisar y borrar manualmente las celdas en amarillo cuyo plazo de 24-48 horas ya expiró, perdiendo oportunidades de venta real.
3. **Desconexión con Limpieza / Ama de Llaves:**
   * La comunicación depende de un papel impreso por la mañana o radios. Recepción no sabe en tiempo real si una habitación ya está limpia, generando demoras e inconformidades a la hora del *check-in* (3:00 PM).
4. **Carga Operativa Manual y Errores:**
   * Redacción duplicada de datos en plantillas de Word para cada confirmación y modificación.
5. **Falta de Trazabilidad en Cancelaciones:**
   * Trámites en formatos físicos de papel y dependencia total de la presencia física de Don Roberto para autorizar transferencias.

---

## 1.7 Sistemas y Herramientas Actuales

* **Microsoft Excel:** Archivo local compartido en carpeta de red local de recepción.
* **Microsoft Word:** Plantillas manuales para cartas de confirmación y modificaciones.
* **Correo Electrónico Institucional:** Envío y recepción de cotizaciones, fichas de depósito y PDFs.
* **WhatsApp Web:** Para enviar fotos de cuartos y mensajes informales con clientes.
* **Terminal Bancaria Física:** Cobro presencial o telefónico con tarjeta y corte de lote.
* **Radio / Interfono:** Comunicación interna entre recepción, camaristas y mantenimiento.

---

## 1.8 Documentos Físicos en Uso

1. **Fólder de Acordeón:** Archivo físico dividido del día 1 al 31 del mes donde se archivan las confirmaciones impresas con el váucher engrapado.
2. **Bitácora de Turno (Libreta):** Cuaderno de mano para pendientes y recados entre recepcionistas.
3. **Lista Diaria de Ocupación:** Hoja impresa de Excel cada mañana para las camaristas.
4. **Talonario de Notas de Remisión:** Librito foliado con copia al carbón para recibos de pago en mostrador.
5. **Formato de Cancelación y Reembolso:** Hoja membretada interna con datos del huésped y CLABE.
6. **Sobres de Pre-corte:** Formato de arqueo diario depositado en la caja fuerte.
7. **Hoja de Tarifas Vigentes:** Documento impreso con precios de temporada alta y baja fijado en recepción.

---

## 1.9 Necesidades Principales del Sistema

1. **Base de Datos Multiusuario:** Centralizar la información con control de concurrencia en tiempo real y transacciones seguras para eliminar el *overbooking*.
2. **Automatización de Pre-reservas y No-Show:** Temporizador de 24-48 horas para liberar celdas automáticamente si no hay pago, y liberación programada a las 10:00 PM para *No-Shows*.
3. **Emisión Digital de Documentos:** Generación automática de cartas de confirmación en PDF con folios únicos y desglose económico.
4. **Comunicación Digital con Camaristas:** Canal en tiempo real donde el personal de piso actualice el estado operativo (Sucia, En Limpieza, Limpia, Mantenimiento).
5. **Control de Caja Integrado:** Arqueo y pre-corte de turno automatizado con registro de ingresos por método de pago.

---

## 1.10 Información Pendiente de Definir

1. Inventario exacto y catálogo detallado de números de habitación, pisos y capacidades.
2. Requisitos formales del contador externo para timbrado de facturas CFDI 4.0 con un PAC.
3. Reglas de prelación para lista de espera cuando la ocupación se encuentre al 100%.
