# 02. Análisis de Problemas mediante la Técnica de los 5 Porqués

Durante la entrevista de levantamiento se identificaron tres problemas críticos en la operación del Hotel Paraíso. A continuación se detalla la causa raíz de cada uno aplicando la metodología de análisis de causa raíz (**5 Porqués**).

---

## Problema 1: Sobreventa (*Overbooking*) y Duplicidad de Reservaciones

* **Problema Identificado:** Asignación duplicada de una misma habitación para las mismas fechas a clientes diferentes.
* **Evidencia Obtenida en Entrevista:**
  El personal reporta que operan varias computadoras en recepción abriendo simultáneamente el mismo archivo de Excel guardado en una carpeta compartida de red local. Al guardar cambios al mismo tiempo, las modificaciones se sobreescriben y generan sobrecupo. Esto obliga al hotel a reubicar a los huéspedes en hoteles de convenio, asumiendo costos de taxis, diferencias de tarifa y cortesías.
* **Causa Raíz Identificada:** Uso de una hoja de cálculo local monousuario como repositorio central sin mecanismos de control de concurrencia ni bloqueo transaccional de registros.

### Aplicación de los 5 Porqués:
1. **¿Por qué se duplican las reservaciones y ocurre sobreventa?**
   * *Respuesta:* Porque dos recepcionistas asignan la misma habitación a clientes distintos al mismo tiempo.
2. **¿Por qué no ven que la habitación ya fue asignada?**
   * *Respuesta:* Porque el archivo de Excel local no sincroniza en tiempo real las modificaciones hechas en otra terminal.
3. **¿Por qué usan un archivo de Excel compartido de esa manera?**
   * *Respuesta:* Porque no disponen de un sistema centralizado de reservaciones multiusuario.
4. **¿Por qué el hotel continúa gestionando su inventario en Excel?**
   * *Respuesta:* Porque los procesos se mantuvieron con herramientas ofimáticas básicas sin prever el aumento en la demanda de reservaciones.
5. **¿Por qué no se implementó una base de datos adecuada previamente?**
   * *Respuesta:* Porque no se había realizado un análisis formal de requerimientos para digitalizar e integrar el control del inventario hotelero.

---

## Problema 2: Bloqueo Prolongado de Habitaciones por "Pre-reservas" Vencidas

* **Problema Identificado:** Habitaciones retenidas innecesariamente como no disponibles debido a pre-reservas que no completaron el pago de anticipo.
* **Evidencia Obtenida en Entrevista:**
  Las reservas tentativas sin pago inmediato se marcan en amarillo en Excel dando un plazo de 24 a 48 horas. A los recepcionistas se les olvida con frecuencia revisar y borrar manualmente las celdas vencidas, lo que impide vender cuartos a clientes reales que llegan o llaman, perdiendo ventas directas.
* **Causa Raíz Identificada:** Inexistencia de un temporizador o mecanismo automatizado de expiración y alertas en la herramienta de registro.

### Aplicación de los 5 Porqués:
1. **¿Por qué se pierden oportunidades de venta de habitaciones?**
   * *Respuesta:* Porque aparecen ocupadas o bloqueadas en el registro cuando en realidad no tienen anticipo pagado.
2. **¿Por qué siguen bloqueadas si ya venció el plazo de 24 a 48 horas?**
   * *Respuesta:* Porque la liberación de la habitación depende exclusivamente de que un recepcionista recuerde borrar manualmente la fila.
3. **¿Por qué depende de la memoria del recepcionista?**
   * *Respuesta:* Porque la herramienta actual (Excel) no emite alertas, recordatorios ni notificaciones de vencimiento.
4. **¿Por qué el archivo no alerta ni gestiona estados?**
   * *Respuesta:* Porque una hoja de cálculo estática carece de lógica de negocio programada para ejecutar eventos temporales.
5. **¿Por qué no se cuenta con lógica de negocio automatizada?**
   * *Respuesta:* Porque no se ha implementado un software con control de estados (`Pre-reservado`, `Confirmado`, `Cancelado Automático`).

---

## Problema 3: Retrasos e Inconformidad en el Check-in por Desincronización con Limpieza

* **Problema Identificado:** Huéspedes que llegan a su hora oficial de entrada (3:00 PM) y encuentran su habitación sin limpiar o sin preparar peticiones especiales (cunas o camas extras).
* **Evidencia Obtenida en Entrevista:**
  La asignación y estatus de limpieza se manejan mediante una hoja impresa a primera hora de la mañana y recados esporádicos por radio o interfono. Si un cliente solicita *late check-out* o limpieza prioritaria, recepción desconoce si el cuarto está listo y hace esperar al huésped en el lobby.
* **Causa Raíz Identificada:** Flujo de información asíncrono y manual entre recepción y el personal de camaristas sin actualización de estatus en tiempo real.

### Aplicación de los 5 Porqués:
1. **¿Por qué los clientes deben esperar en recepción a la hora de check-in?**
   * *Respuesta:* Porque su habitación asignada aún no ha sido liberada por limpieza o mantenimiento.
2. **¿Por qué recepción no sabe con certeza si la habitación está lista?**
   * *Respuesta:* Porque no tienen visibilidad del estatus de la habitación sin interrumpir al personal por radio o esperar a que avisen en persona.
3. **¿Por qué las camaristas no avisan inmediatamente al terminar?**
   * *Respuesta:* Porque están ocupadas en piso y solo cuentan con su reporte impreso de la mañana.
4. **¿Por qué no existe comunicación directa integrada?**
   * *Respuesta:* Porque no hay una herramienta digital o terminal compartida donde camaristas actualicen el estado de las habitaciones (`Sucia`, `En Proceso`, `Limpia`).
5. **¿Por qué no se ha integrado esta comunicación?**
   * *Respuesta:* Porque el área de Ama de Llaves se concibe como un proceso aislado y no como parte integral del ciclo de reservaciones y recepción.
