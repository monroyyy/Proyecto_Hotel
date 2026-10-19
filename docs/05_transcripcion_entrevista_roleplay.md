# 05. Transcripción del Role Play con el Simulador y Reflexión Metodológica

Este documento contiene la transcripción fiel y estructurada de la entrevista de levantamiento de requerimientos realizada mediante la dinámica de **Role Play con IA**, así como el análisis reflexivo y metodológico de la técnica de entrevista empleada por el equipo de analistas.

---

## 1. Ficha Metodológica de la Entrevista

* **Técnica:** Entrevista de Requerimientos mediante Simulación / Role Play interactivo.
* **Entrevistador:** Jorge Monroy Peña (Analista de Software - Alumno UAEM Atlacomulco).
* **Entrevistado (Rol Simulador):** Javier (Recepcionista con 6 años de antigüedad en Hotel Paraíso).
* **Objetivo:** Descubrir procesos operativos reales, puntos de fricción, manejo de documentos, reglas de negocio implícitas y requerimientos técnicos para el nuevo sistema de administración hotelera.

---

## 2. Reflexión Final y Aprendizajes Metodológicos

### 2.1 Preguntas más útiles durante la entrevista
Las preguntas abiertas enfocadas en identificar fricciones operativas resultaron ser las más enriquecedoras. Destacaron cuestionamientos como:
* *¿Qué es lo que más cuesta trabajo realizar?*
* *¿En qué puntos del proceso se cometen más errores?*
* *¿Quiénes son todos los involucrados en esta tarea?*
* *¿Qué parte del flujo se complica más en el día a día?*

Estas preguntas permitieron que el entrevistado revelara problemas críticos como la sobreventa (*overbooking*) por uso de Excel compartido en red y los bloqueos prolongados por pre-reservas vencidas, sin necesidad de que el usuario tuviera que definir formalmente un requerimiento técnico o informático.

### 2.2 Información más difícil de obtener
Los aspectos más complejos de extraer fueron los detalles cuantitativos y normativos de las modificaciones de reservaciones, cancelaciones y reembolsos, así como la identificación exacta de todos los documentos físicos (*fólders* de fuelle/acordeón, notas de remisión manuales foliadas, bitácora de turno en libreta) y las personas involucradas fuera de la recepción (contador externo, camaristas y personal de mantenimiento).

Para descubrir las políticas exactas de penalización (más de 72 hrs: 100%, entre 48 y 72 hrs: 50%, menos de 48 hrs: 0%) fue indispensable realizar múltiples preguntas de profundización y repreguntas, ya que el entrevistado no las expuso de manera espontánea al inicio de la conversación.

### 2.3 Propósito de las preguntas de seguimiento
Las preguntas de seguimiento se realizaron con los siguientes objetivos:
1. Verificar que ningún detalle operativo relevante quedara desapercibido.
2. Corroborar que la secuencia de pasos tuviera coherencia lógica temporal.
3. Validar que la información anotada por el analista fuera precisa.
4. Conectar la causa y el efecto: entender cómo una simple acción en recepción (como pintar una celda de amarillo en Excel) impactaba directamente en la pérdida económica por habitaciones no vendidas o en el caos operativo del siguiente turno.

### 2.4 Qué necesita resolver el recepcionista y por qué
El recepcionista necesita resolver de manera prioritaria la **centralización y automatización de la disponibilidad de habitaciones en tiempo real**:
* **Problema actual:** Vive bajo estrés constante de cometer *overbooking* debido a fallas de concurrencia al abrir un archivo de Excel compartido en red local.
* **Carga operativa:** Lidia diariamente con la redacción manual de cartas de confirmación y modificación en Word.
* **Falta de automatización:** Carece de temporizadores o alertas para liberar habitaciones apartadas bajo "pre-reserva" no pagadas o huéspedes con *No-Show*.
* **Beneficio esperado:** Eliminar el error humano, no rechazar clientes potenciales en turnos nocturnos y ofrecer una atención ágil y profesional en el mostrador.

### 2.5 Aspectos a mejorar para futuras entrevistas
Para futuras ocasiones, el principal aspecto a mejorar es contar con una **guía de preguntas estructurada y categorizada desde el inicio**:
* Durante la conversación espontánea, el flujo de ideas provocó que en ciertos momentos se pasaran algunos datos por alto y fuera necesario regresar a temas previos.
* Mantener una estructura por módulos (Inventario ➔ Cobranza ➔ Limpieza ➔ Políticas) permitirá llevar un mejor control del tiempo y asegurar una cobertura sistemática de todos los procesos, reglas y excepciones desde la primera ronda.

---

## 3. Transcripción Completa del Diálogo (Role Play)

> **Contexto inicial:** Jorge Monroy (Analista de Software) llega a la recepción del Hotel Paraíso para entrevistar a Javier (Recepcionista).

***

**Javier:** Buenas tardes. Pase, tome asiento por favor. Me avisó la gerencia que vendría alguien a platicar conmigo sobre lo del nuevo sistema que quieren poner. Usted me dirá, ¿en qué le puedo colaborar?

**Jorge:** Buenas tardes, soy Jorge Monroy, analista de software, y vengo principalmente por información para poder desarrollar el nuevo sistema para administrar las reservaciones de habitaciones para su hotel.

**Javier:** Mucho gusto, Jorge. Bienvenido al Hotel Paraíso. Qué buena noticia lo del sistema, la verdad es que ya nos hace falta una modernización por aquí. Llevo seis años en la recepción y le sé a todo el tejemaneje de cómo entran y se acomodan las reservas, así que con toda confianza pregúnteme lo que necesite saber para su proyecto. ¿Por dónde le gustaría que empecemos?

**Jorge:** Tengo algunas preguntas, pero quiero que comencemos hablando sobre cómo es el proceso actual, desde cómo se solicitan, cómo consultan la disponibilidad, selección, todo el proceso en general, hasta que una reservación queda registrada.

**Javier:** Mire, Jorge, en términos generales el proceso empieza cuando el cliente se comunica con nosotros, que casi siempre es por teléfono, por correo electrónico o a veces llegan directo al mostrador preguntando si hay lugar. Cuando nos piden fechas, lo primero que hago es revisar si tenemos cuartos libres. Si hay espacio para los días que buscan y el tipo de habitación les convence, les pido sus datos principales para apartarles el cuarto y acordamos la forma en que van a garantizar la reserva. Ya con eso listo, dejamos la habitación marcada como apartada y le mandamos su confirmación. Básicamente así es la vuelta completa desde que nos contactan hasta que la reserva queda registrada con nosotros.

**Jorge:** Muy bien, estaré haciendo algunas notas, hablando sobre los datos que se les piden a los clientes, ¿me podría decir qué información necesitan del cliente para poder registrar?

**Javier:** Claro, tome sus notas con calma. Mire, para poder registrarlo formalmente les pedimos:
* Su nombre completo.
* Un número de teléfono de contacto.
* Su correo electrónico (para mandarles la confirmación).
* Las fechas exactas de llegada y de salida.
* El número de personas que se van a hospedar, distinguiendo entre adultos y niños.
* El tipo de habitación que van a querer.

Aparte de eso, si solicitan alguna petición especial —como una cuna, habitación en planta baja o cama extra—, también lo anotamos en las observaciones para que no se nos pase.

**Jorge:** Okey, sobre la tarifa, forma de pago y esas solicitudes especiales, ¿me podría decir sobre eso?

**Javier:** Ah, claro. Mire, el tema de las tarifas depende de la temporada y del tipo de cuarto. Nosotros manejamos tres tipos: la Estándar, la Doble y la Suite. En temporada alta los precios suben un poco, pero todo eso lo tenemos anotado en una hoja de tarifas impresas que nos deja el gerente en la recepción.

Respecto a las formas de pago, para garantizar la reserva les pedimos un anticipo del 50% del total de la estancia. El cliente puede pagar haciendo una transferencia bancaria, un depósito en ventanilla del banco o dándonos los datos de su tarjeta de crédito o débito por teléfono. El resto lo liquidan al llegar al mostrador durante el check-in, ya sea con tarjeta o en efectivo. Cuando hacen transferencia, les pedimos que nos manden el comprobante por correo para adjuntarlo a su ficha.

Y sobre las peticiones especiales, como le comentaba, las dejamos apuntadas en las notas. Aunque fíjese que con eso a veces sufrimos un poco, sobre todo con las de planta baja o camas extras, porque si las muchachas de limpieza no terminan a tiempo o si mantenimiento tiene clausurada una habitación por alguna fuga de agua en el baño, nos toca mover al huésped de último momento a otro piso y se nos molestan si venían con personas mayores. Tratamos de cumplirles siempre, pero dependemos mucho de que el cuarto esté realmente listo y operativo.

**Jorge:** Quiero regresar un poco antes de continuar, quisiera saber qué hacen con la información que les piden a los clientes, ¿por qué es que les piden esa información?
Ahora sobre esto, el gerente además de colocar las hojas de tarifas, ¿participa de alguna otra forma en este proceso?
También, me gustaría que hablemos un poco más en profundidad sobre eso que sufren. ¿Por qué especialmente sufren con las de planta baja y las camas extras? ¿Toma más tiempo cuando los clientes dejan la habitación? ¿No se tiene algún tiempo para estos imprevistos y que el siguiente cliente que la usará realmente la pueda usar?

**Javier:** Mire, Jorge, son muy buenas preguntas. Le voy desglosando cómo está la cosa:

* **¿Qué hacemos con la información del cliente y por qué la pedimos?:** Esa información la capturamos directamente en una hoja de cálculo de Excel que tenemos en la computadora de recepción; de hecho, ahí es donde llevamos el control de qué habitación se le asigna a quién. La pedimos porque el teléfono y el correo son indispensables para confirmar el anticipo, mandarles su clave de reserva o localizarlos si se les hace tarde para llegar. El número de personas lo necesitamos por reglamento y para calcular bien la tarifa (no cobramos lo mismo si entran dos adultos o si meten a tres niños más), y las fechas para bloquear las celdas en el Excel y que el turno de la tarde no vaya a ofrecer el mismo cuarto.
* **Sobre el gerente:** Don Roberto, el gerente, no solo nos deja las tarifas. Él es quien autoriza cualquier descuento especial —por ejemplo, si viene un grupo grande o si es cliente frecuente de alguna empresa de la zona—. También él tiene que autorizar las cancelaciones cuando el cliente pide que se le devuelva el anticipo, y es el único con acceso a la cuenta del banco para revisar directamente si ya cayó una transferencia cuando el huésped no nos manda el comprobante legible. Si hay un problema fuerte con un cliente, él interviene.
* **Sobre lo que sufrimos con planta baja, camas extras y los tiempos:** El tema con la planta baja es que solo tenemos cuatro habitaciones en ese nivel. Si una familia llega con una persona de la tercera edad o en silla de ruedas y esa habitación tiene un detalle de plomería, no tenemos margen de maniobra, no hay otra a dónde moverlos sin subir escaleras. Y las camas extras requieren que el muchacho de mantenimiento o el botones suba la cama plegable y la arme antes de que el huésped entre.

Ahora, sobre el tiempo: en teoría sí tenemos margen. La salida (*check-out*) es a las 12:00 del día y la entrada (*check-in*) es a las 3:00 de la tarde. Son tres horas. Pero en la práctica pasan dos cosas:
1. Muchos huéspedes piden salir más tarde (*late check-out*) o simplemente se retrasan, y no podemos entrar a limpiar hasta la 1:00 o 1:30.
2. Como no tenemos un sistema conectado con las camaristas, ellas nos van avisando en papel o de palabra qué cuartos ya quedaron listos. Si a las 2:50 limpieza me avisa que un cuarto de planta baja no quedó porque la regadera goteaba y apenas entró mantenimiento, ya tengo al siguiente huésped parado en el mostrador a las 3:00 en punto esperando su llave.

En el Excel yo veo la celda "reservada", pero no tengo forma de saber en tiempo real si el cuarto ya fue desocupado, si ya lo limpiaron o si tiene una avería, hasta que alguien de intendencia baja a avisarme a recepción.

**Jorge:** Okey, vamos por partes. Básicamente toda la captura de la información la hacen en una hoja de Excel. Después, ¿utilizan algunas otras herramientas en su sistema? ¿Qué actividades haces fuera del sistema?

**Javier:** Mire, Jorge, además del Excel sí usamos otras herramientas en la computadora:
* **El correo electrónico:** Usamos una cuenta de correo del hotel para recibir los comprobantes de pago de las transferencias, responder cotizaciones y enviar las cartas de confirmación de reserva (que tenemos como plantillas en formato de Word).
* **WhatsApp Web:** Lo tenemos abierto en la computadora porque muchísima gente ya no llama por teléfono, nos mandan mensaje pidiendo informes o fotos de las habitaciones.
* **La terminal bancaria (el punto de venta):** Para hacer los cobros con tarjeta cuando el huésped nos da sus datos por teléfono o cuando pagan aquí en físico.

Ahora, sobre las actividades que hacemos fuera del sistema o de forma manual, son bastantes:
1. **La bitácora de turno (en libreta):** Tenemos un cuaderno en recepción donde apuntamos los pendientes a mano para el compañero que entra en el siguiente turno. Por ejemplo: *"Don Fernando de la 102 llega a las 11:00 PM"* o *"La reserva de Martínez debe 500 pesos"*.
2. **El archivo físico en carpetas (fólderes):** Cada vez que se confirma una reserva, imprimo la confirmación y la engripo junto con el comprobante de pago. Esos papeles los metemos en un fólder de acordeón dividido por los días del mes. Así, cuando llega el cliente, buscamos su hoja física para que la firme.
3. **Comunicación por radio o interfono:** Para saber si una habitación ya está limpia o desocupada, tengo que estar llamando por radio a la jefa de camaristas o esperar a que bajen a recepción a entregarme las llaves.
4. **Talonario de recibos:** Si el cliente paga su anticipo o saldo en efectivo aquí en mostrador y no requiere factura electrónica formal de momento, le llenamos una nota de remisión a mano con copia al carbón.

Como ve, dependemos todavía de mucho papel y de estarnos hablando de palabra entre turnos y departamentos.

**Jorge:** Entiendo. Sobre el personal de mantenimiento, botones, la jefa de camaristas y el gerente, además de lo que me dijo, ¿hacen algo más dentro del sistema?

**Javier:** No, Jorge, ninguno de ellos toca la computadora de recepción ni el archivo de Excel.

El Excel lo manejamos exclusivamente los recepcionistas (somos dos en el turno matutino, dos en el vespertino y uno en la noche) y de vez en cuando Don Roberto, el gerente, que entra a revisar cómo van los números de ocupación del mes o a modificar las tarifas.

Los demás compañeros interactúan con el proceso de forma totalmente externa:
* **La jefa de camaristas:** Cada mañana viene a la recepción antes de las 9:00 AM, nosotros le imprimimos una copia de la lista de ocupación del Excel, y ella en una tabla con portapapeles va anotando a mano con lápiz qué cuartos están ocupados, cuáles van de salida y cuáles ya quedaron limpios.
* **Mantenimiento:** Solo se entera si hay una falla si nosotros o las camaristas le avisamos en persona o por el radio; ellos no consultan ningún registro digital de cuartos.
* **El botones:** Se guía por lo que nosotros le decimos en el momento al entregarle las llaves y las maletas del huésped.

Así que, para efectos prácticos, la computadora y el registro de reservaciones están 100% bajo el control de recepción y gerencia.

**Jorge:** Okey, solo para dejar en claro que vamos en el mismo canal le diré lo que ya tenemos:
* Se le pide información al cliente, esa información se guarda en Excel, misma donde se lleva un control de las habitaciones.
* Algo importante para confirmar el anticipo es el teléfono y correo.
* Existen 3 tipos de tarifas, el gerente es quien asigna esas tarifas.
* Para poder garantizar esa reservación se le pide el 50% de la estancia.
* Las únicas herramientas que usan son Excel, correo, Word, WhatsApp Web y la terminal bancaria.
* Y dentro de este sistema solo actúan ustedes recepcionistas y en ocasiones el gerente.

Eso es únicamente sobre el sistema y su funcionamiento actual, ¿estamos en lo correcto o hay algo que se nos pase?

**Javier:** Va muy bien, Jorge, entendió el panorama general a la perfección. Solo le agregaría un par de detalles importantes de la operación del día a día para que no se nos queden fuera del mapa:
* **Las reservas tentativas o con pago pendiente:** Cuando el cliente se comunica pero no puede hacer el pago en ese instante, le guardamos una "pre-reserva" en el Excel marcando la celda en color amarillo y le damos un plazo de 24 a 48 horas para mandar el comprobante del 50%. Si en ese tiempo no llega el pago, tenemos que borrarlo manualmente para liberar el cuarto, y a veces con las prisas del turno a algún compañero se le olvida quitarlo y se queda la habitación bloqueada sin necesidad.
* **El archivo de Excel compartido:** Como somos varios recepcionistas en distintas computadoras de mostrador, el Excel está en una carpeta compartida de red local. A veces pasa que dos lo abrimos al mismo tiempo, no se guardan bien los cambios o alguien sobrescribe la fila del otro, y ahí es donde nos han salido cuartos duplicados para la misma fecha.

Fuera de esos dos puntos que nos dan dolores de cabeza, todo lo que resumió refleja exactamente cómo trabajamos hoy en día.

**Jorge:** Tengo algunas preguntas: la pre-reserva cuando se debe quitar y otro compañero de turno debe eliminarla y no la elimina, ¿la única razón son las prisas?
Por lo que entiendo es que solamente una persona puede entrar a modificar el Excel, ya que si lo hace más de uno puede causar problemas como habitaciones duplicadas. ¿Esto qué tan común es que suceda?

**Javier:** Mire, Jorge, sobre lo primero: no siempre es nada más por las prisas, aunque sí influyen mucho cuando el lobby se llena de gente haciendo check-in o check-out. El problema de fondo con las pre-reservas es que **no tenemos ningún tipo de alerta o recordatorio automático**.

Todo depende de la memoria y de la bitácora en papel. Si yo apunto en la libreta *"quitar la 204 si Pérez no paga antes de las 4:00 PM"*, pero el compañero que entra a las 3:00 PM llega ocupado atendiendo llamadas o cobrando en mostrador, no lee la libreta a tiempo. A eso súmele que a veces el cliente llama y pide una prórroga de unas horas más, pero si quien tomó la llamada no actualizó la nota, el recepcionista del siguiente turno no sabe si borrarla o dejarla. Queda en un limbo por falta de comunicación clara entre turnos.

Ahora, respecto a lo del Excel compartido y los duplicados:
Técnicamente el archivo permite que lo abramos varios porque está en red, pero Excel no maneja bien la sincronización en tiempo real aquí. Lo que pasa es que si mi compañera está atendiendo una llamada para apartar una Suite el fin de semana y yo estoy atendiendo a alguien en mostrador para la misma fecha, a los dos nos aparece la celda vacía en la pantalla. Ella escribe su cliente, yo escribo el mío, y al darle guardar, la versión de quien guardó al último sobreescribe a la otra, o se generan dos archivos con copias en conflicto.

¿Qué tan común es? En temporada baja o días entre semana casi no ocurre, tal vez una vez al mes por algún descuido. Pero en temporada alta, puentes o fines de semana, nos llega a pasar una o dos veces por semana. Es una pesadilla, porque nos damos cuenta hasta que ambos huéspedes llegan con su maleta en mano a recepción esperando la misma habitación, y si el hotel está lleno al 100%, tenemos que ver a qué otro hotel reubicarlos.

**Jorge:** Veo que contar con una alerta que te recuerde y notifique sobre estas pre-reservas solucionaría todos estos detalles.
Básicamente sobre el Excel compartido es que quien guarde al final, son los datos que quedarán registrados y los anteriores se sobrescribirán, ya que no se maneja correctamente la sincronización en tiempo real.
¿Se podría decir que este es uno de los problemas más grandes de los que se requiere atender?

**Javier:** Totalmente de acuerdo, Jorge. Si me pregunta a mí, que estoy aquí lidiando con la gente en el mostrador todos los días, ese es el problema número uno y el más urgente de resolver.

Tener una sobreventa (*overbooking*) o un cuarto duplicado por culpa de cómo guarda el Excel nos genera un estrés tremendo. No solo es la pérdida de dinero para el hotel al tener que pagarle una noche en otro lado al cliente que no pudimos acomodar, sino la molestia, las quejas y las malas reseñas que nos dejan en internet. La gente llega cansada de viajar y lo último que espera es que su reservación confirmada simplemente desapareció del archivo.

Y lo que menciona de la alerta automática para las pre-reservas nos quitaría un peso enorme de encima. Si el sistema pudiera liberar el cuarto solo cuando venza el plazo —o al menos mandarnos una notificación clara en pantalla—, evitaríamos tener cuartos bloqueados "fantasma" que bien podríamos estar vendiendo a clientes que sí tienen el dinero listo en la mano. Así que sí, la concurrencia en tiempo real y el control de vigencia de las pre-reservas son puntos críticos para nosotros.

**Jorge:** Comprendo completamente, esto puede generar mucho estrés laboral, todo esto tendrá solución, cuente con ello.
¿Además de esto hay algo que genere más trabajo? ¿Qué parte dentro de este proceso de reservaciones es más complicada?

**Javier:** Se lo agradezco mucho, Jorge, de verdad da tranquilidad escuchar que le ven solución a esto.

Mire, respondiendo a sus preguntas, lo que nos genera más trabajo extra y se vuelve más complicado en el día a día son **las modificaciones y las cancelaciones**, sobre todo cuando ya hubo dinero de por medio:
* **Modificaciones de fechas:** Cuando un cliente llama para mover su estancia, no es solo cambiar el día. Tengo que ir al Excel, ver si para las nuevas fechas hay lugar en el mismo tipo de habitación, checar si la tarifa de la nueva temporada es más alta o más baja, recalcular la diferencia de costos, mover los datos de fila manualmente y volver a generar y enviar la carta de confirmación en Word por correo. Si el cambio es en fin de semana lleno, a veces tenemos que mover a dos o tres clientes de habitación como si fuera un rompecabezas para poder acomodar las noches que pide.
* **Cancelaciones y reembolsos:** Aquí se complica porque entra la política del hotel. Si cancelan con más de 72 horas de anticipación, se les regresa el anticipo completo; si es entre 48 y 72 horas, solo el 50%; y si es con menos tiempo, no hay devolución. Como yo en recepción no tengo acceso a la banca electrónica para hacer la transferencia de regreso, tengo que llenar un formato de solicitud de reembolso, adjuntar el comprobante original del cliente y pasárselo a Don Roberto para que él lo autorice y haga la dispersión bancaria. Los clientes se desesperan y nos están llamando a cada rato a recepción para ver si ya cayó su depósito.
* **Los "No Show" (huéspedes que no se presentan):** Si alguien tenía reserva confirmada pero dan las 10:00 de la noche y no llega ni contesta el teléfono, no sabemos qué hacer con el cuarto. A veces llega a la 1:00 de la mañana porque se le ponchó una llanta en carretera, pero si dimos el cuarto por perdido y se lo rentamos a alguien de paso que llegó al mostrador, se nos arma otro problema gravísimo de sobreventa en plena madrugada.

Manejar todo ese recálculo de saldos, penalizaciones y movimientos en el Excel de forma manual es de lo más tedioso y donde más fácil se nos va un error de dedo.

**Jorge:** ¿El problema principal sobre las modificaciones es el proceso manual? Además tengo una duda más de esto: ¿estas modificaciones las puede hacer en cualquier momento y qué es lo máximo que se le permite modificar?
Sobre las políticas, ¿este documento habla explícitamente sobre esto? Estos porcentajes de cancelación, ¿cómo llegaron a estos porcentajes?
Dentro del formato, ¿qué información de solicitud de reembolso viene?
Sobre los huéspedes que no llegan a la hora acordada, ¿se les da un margen de llegada? ¿Qué medidas toman en este caso que no llegue?

**Javier:** Mire, Jorge, son varios puntos clave, se los voy explicando uno por uno:

1. **Sobre las modificaciones y sus límites:**
   Sí, el problema principal es que todo el recálculo, el movimiento en el Excel y la generación del nuevo documento en Word son 100% manuales. En cuanto a las reglas:
   * *¿Cuándo pueden hacerlas?* El cliente puede pedir cambios hasta 48 horas antes de su fecha de llegada original (sujeto a disponibilidad). Si avisa con menos de 48 horas, se le cobra una penalización equivalente al costo de la primera noche.
   * *¿Qué es lo máximo que se permite modificar?* Pueden cambiar fechas (dentro de un plazo máximo de 3 meses a partir de la fecha original) y el tipo de habitación. Lo que no se permite es transferir la reserva a otra persona sin autorización previa por escrito del titular original, ni reducir el número de noches en temporada alta si ya se había confirmado un paquete de estancia mínima (por ejemplo, mínimo 2 noches en puente).

2. **Sobre las políticas y los porcentajes:**
   * El documento de políticas está impreso en recepción y se adjunta como un párrafo de términos y condiciones al pie de la plantilla de confirmación que les mandamos por correo.
   * En cuanto a cómo se determinaron esos porcentajes (72 hrs / 48 hrs / menos de 48 hrs), la verdad no sabría decirle el cálculo exacto de fondo; son las reglas comerciales que fijó Don Roberto y el dueño desde hace años para proteger al hotel. Si necesita el sustento financiero de esos números, tendríamos que consultarlo directamente con el gerente.

3. **Datos del formato de solicitud de reembolso:**
   Ese formato es una hoja membretada interna donde capturamos:
   * Folio de la reservación y nombre del titular.
   * Fecha de solicitud y fecha original de llegada.
   * Monto total pagado como anticipo y método por el que pagó.
   * Porcentaje de penalización aplicable y monto neto a devolver.
   * Motivo de la cancelación.
   * Datos bancarios del cliente para la devolución (Nombre del titular, Banco y CLABE interbancaria de 18 dígitos).
   * Firma del recepcionista que recibe la solicitud y firma de autorización de Don Roberto.

4. **Margen de llegada y medidas ante un "No Show":**
   * La política oficial marca que la habitación se garantiza hasta las 8:00 PM del día de llegada.
   * Si dan las 8:00 PM y el huésped no ha llegado, intentamos llamarle por teléfono o mandarle WhatsApp. Si nos contesta y nos avisa que viene en camino (por tráfico, vuelo demorado, etc.), le dejamos una nota en la bitácora al recepcionista de la noche para que le mantenga la habitación abierta sin problema.
   * Si dan las 10:00 PM, no contesta llamadas ni mensajes y no avisó de llegada tardía, la reservación se declara formalmente como "No Show". En ese punto, el sistema/política nos permite liberar la habitación para venderla a clientes de paso (*walk-in*), y el anticipo del 50% no es reembolsable, queda como compensación para el hotel por la noche perdida.

**Jorge:** La generación del nuevo documento para las modificaciones, ¿qué contiene?
Sobre lo máximo que se puede modificar, ¿ya no existe algo más que se pueda modificar sobre la reservación?
El documento de políticas y condiciones que está impreso en recepción, ¿qué información contiene?
¿El cliente está enterado de esta política de No Show al momento de hacer la reservación?

**Javier:** Mire, Jorge, le detallo estos puntos:

1. **Contenido del nuevo documento de modificación (la confirmación actualizada):**
   Es una versión actualizada de la plantilla de Word que mandamos en PDF por correo. Contiene:
   * El mismo número de folio original, pero le agregamos una leyenda o sufijo de "Modificación #1".
   * Datos del cliente (nombre, teléfono, correo).
   * Las nuevas fechas de entrada y salida, junto con el nuevo número de noches.
   * El tipo y número de habitación asignada.
   * El desglose económico actualizado: costo total de la nueva estancia, el monto que ya había pagado de anticipo, la penalización o ajuste por cambio de tarifa (si aplicó) y el saldo pendiente exacto que liquidará al llegar.
   * La fecha y hora en que se emitió el cambio.

2. **¿Qué más se puede (o no se puede) modificar?:**
   Además de las fechas y el tipo de cuarto, también se puede modificar el número de personas (por ejemplo, si deciden traer a un acompañante más o si un niño ya no viene) y las peticiones especiales (pedir cama extra, cuna, etc.). Fuera de eso, no hay más: o se cambian fechas, o el cuarto, o la cantidad de huéspedes y servicios extra.

3. **Contenido del documento de políticas y condiciones:**
   Ese documento, además de estar impreso en el mostrador, viene resumido al pie de las confirmaciones. Contiene:
   * Horarios oficiales: Check-in a partir de las 3:00 PM y Check-out a las 12:00 PM.
   * Políticas de cancelación y reembolsos: Los plazos de 72 hrs (100%), 48 hrs (50%) y menos de 48 hrs (sin devolución).
   * Política de cambios y penalizaciones: El plazo límite de 48 horas previas para modificaciones.
   * Política de garantía y "No Show": La hora límite de espera y retención del anticipo.
   * Reglamento interno básico: Prohibición de fumar en habitaciones, costo por toallas o llaves extraviadas, política de no mascotas y cargo extra por persona no registrada.

4. **¿El cliente está enterado de la política de No Show?:**
   En teoría sí, porque viene redactada en la carta de confirmación que le mandamos por correo al apartar su lugar. Sin embargo, en la práctica muchos clientes no leen el texto pequeño que viene abajo. Por eso, cuando hacen la reservación por teléfono o WhatsApp, nosotros como recepcionistas tenemos la instrucción de decirles verbalmente: *"Le recordamos que su habitación queda apartada hasta las 8:00 PM; si llega más tarde, favor de avisarnos para no liberar su cuarto"*. Aun así, nunca falta el cliente que no avisa y luego se molesta si llega a medianoche y ve su cuarto ocupado.

**Jorge:** ¿Me puedes decir qué información contiene el primer formato original de la reservación? Me refiero a la plantilla, por favor.
Gracias por dejarme completamente claro hasta qué punto se puede modificar una reservación.
Algo que se me pasó mencionar hace un momento fue, ¿qué viene en el formato de cancelación o reembolso?
Se podría decir que la política no show los tiene protegidos, y no es algo a lo que se deba atender dentro del sistema, ya que dentro del formato viene, además que ustedes se encargan de avisar antes.

**Javier:** Mire, Jorge, con mucho gusto le detallo los formatos y le comento sobre el tema del No Show:

1. **Información que contiene la plantilla original de reservación (la primera confirmación):**
   Esa plantilla en Word que luego pasamos a PDF lleva:
   * **Encabezado:** Logotipo del Hotel Paraíso, dirección, teléfonos de contacto y RFC.
   * **Datos de control:** Número de folio consecutivo y fecha/hora de emisión.
   * **Datos del huésped:** Nombre completo, teléfono y correo electrónico.
   * **Detalles de la estancia:** Fecha de llegada (*check-in*), fecha de salida (*check-out*), total de noches, número de adultos y niños.
   * **Detalles de la habitación:** Tipo de habitación (Estándar, Doble, Suite), número de habitación asignado y peticiones especiales registradas.
   * **Desglose financiero:** Tarifa por noche, costo total del hospedaje, monto del anticipo recibido (50%), método de pago utilizado para el anticipo y el saldo pendiente exacto a pagar en recepción al llegar.
   * **Pie de página:** El bloque de políticas generales, horarios de entrada/salida y términos del servicio.

2. **Información del formato de cancelación y reembolso:**
   Como le comentaba hace un momento, es la hoja membretada interna que usamos para tramitar la devolución con Don Roberto. Contiene:
   * Folio de la reservación que se cancela y nombre del cliente.
   * Fecha en que el cliente solicita la cancelación versus la fecha en que iba a llegar (para calcular la anticipación).
   * Motivo de la cancelación expresado por el cliente.
   * Importe total del anticipo que había pagado y método de pago original.
   * Porcentaje de penalización aplicado (0%, 50% o 100%) y el monto neto a reembolsar.
   * Datos bancarios para transferirle al cliente (Nombre del titular de la cuenta, Banco y CLABE interbancaria de 18 dígitos).
   * Firmas requeridas: Firma del recepcionista que llena el formato y firma de autorización de Don Roberto.

3. **Sobre si la política de No Show ya nos tiene totalmente protegidos:**
   En la parte legal y financiera sí, la política nos respalda para no perder el dinero de la noche. Pero fíjese que **operativamente dentro del sistema sí sería de gran ayuda atenderlo**, y le explico por qué:
   Hoy en día, marcar a alguien como "No Show" y liberar la habitación en el Excel depende al 100% de que el recepcionista de la noche se acuerde de hacerlo a las 10:00 PM. Si entra un cliente al mostrador a las 10:30 PM pidiendo cuarto, y el recepcionista ve la celda ocupada porque a su compañero se le olvidó cambiar el estatus, va a rechazar a ese cliente nuevo pensando que el hotel sigue lleno, perdiendo una venta segura.
   Si el sistema nos permitiera registrar la llegada del huésped (un botón de *check-in*), alertarnos a las 8:00 PM de quiénes faltan por llegar para mandarles un recordatorio rápido, y a las 10:00 PM permitirnos con un solo clic cambiar el estatus a "No Show" para que la habitación vuelva a aparecer disponible en verde automáticamente, nos evitaría perder ventas en el turno nocturno.

**Jorge:** Gracias por darme la información de ambos formatos, sobre lo que tiene como contenido. Y claro que tomaremos en cuenta implementar sobre el tema No Show dentro del sistema.

**Javier:** De nada, Jorge, al contrario. Me alegra mucho saber que están tomando en cuenta esos detalles del día a día, porque son justo las cosas pequeñas las que a nosotros en mostrador nos facilitan o nos complican el turno.
No sé si tenga alguna otra duda sobre el flujo, las tarifas, los reportes que hacemos o si hay algún otro punto que le gustaría que revisemos antes de que empiece a armar su propuesta. Usted me dice, aquí sigo a la orden.

**Jorge:** Quiero que llevemos un recuento de lo que llevamos hasta ahora:
* Los únicos que entran al sistema para encargarse sobre la reservación de habitaciones son ustedes los recepcionistas y el gerente, no existen más personas que actúen dentro del sistema.
* El proceso de reservaciones se puede realizar mediante WhatsApp, correo, teléfono y de manera física en el hotel.
* Consultan la disponibilidad de habitaciones dentro de su Excel y en caso de estarlo recaban su información, donde lo indispensable es el teléfono y el correo para poder llevar a cabo un anticipo.
* Posterior a esto se hace un formato con una plantilla ya diseñada en Word y se manda por correo al cliente.
* El cliente debe pagar el 50% de la estancia.
* El registro que ya fue pagado lo hacen por medio de fólderes, donde se confirma la reservación, se imprime y se engrapa junto al comprobante de pago.
* Tiene permitido modificar hasta 48 horas antes su llegada original, menos horas se aplica penalización equivalente al costo de la primera noche. No se permite transferir a otra persona sin autorización del titular por escrito. No se puede reducir el número de noches en temporada alta si ya se había seleccionado un paquete mínimo de estancia. Sí se puede modificar el número de personas y las peticiones especiales, no hay más.
* Se pueden realizar pre-reservas de 24 a 48 horas para mandar el comprobante de pago.
* Solo se cuentan con estas herramientas dentro del sistema: Excel (información para reservación), Correo Electrónico (cuenta del hotel para comprobantes, cotizaciones y confirmaciones), Word con plantillas (cartas de confirmación), WhatsApp Web (informes o fotos de habitaciones) y Terminal bancaria (cobros con tarjeta por teléfono o en físico).
* Políticas de cancelación y reembolsos: 72 hrs (100%), 48 a 72 hrs (50%) y menos de 48 hrs (sin devolución).
* Política de garantía y No Show: la hora límite de espera y retención del anticipo.

Si hay algo que haya pasado inadvertido me lo puedes comentar y sin problema lo anoto.

**Javier:** Mire, Jorge, su recuento está completísimo y muy bien estructurado. Solo le haría un par de precisiones y le recordaría dos detallitos menores para que su reporte quede impecable:
* **Plazo de pre-reservas:** Mencionó de 24 a 28 horas, pero en realidad les damos de 24 a 48 horas para mandar el anticipo antes de liberar el cuarto.
* **Límite de tiempo para reprogramar fechas:** En las modificaciones, recuerde que el cliente puede mover sus fechas en un margen de máximo 3 meses a partir de la fecha original que tenía contratada.
* **El tema de los reembolsos:** No olvidar que los reembolsos los autoriza y realiza Don Roberto mediante transferencia bancaria, previa solicitud interna en papel con los datos interbancarios del cliente.
* **El problema de concurrencia:** Tener muy presente lo que platicamos de las celdas sobrescritas en el Excel de red local durante temporada alta, que es lo que nos provoca la duplicidad de cuartos.

Fuera de esa pequeña corrección en las horas de la pre-reserva y los detalles que le sumé, tiene absolutamente todo el proceso mapeado al pie de la letra tal como lo vivimos aquí en recepción.

**Jorge:** Cierto, sí lo tengo anotado sobre las pre-reservas, fue un error de dedo. Sí tengo anotado sobre el límite máximo de reprogramar las fechas. Sobre los reembolsos también lo tengo: usted hace el formato y el gerente Don Roberto se encarga de autorizarlos y hacerlos. El principal problema es la concurrencia y el overbooking.

**Javier:** Exactamente, Jorge. Con eso tiene el panorama completo y los puntos de dolor más críticos bien identificados. Por mi parte creo que no se nos escapa nada de la operación diaria. Con todo esto que platicamos, estoy seguro de que el sistema que diseñen nos va a quitar un dolor de cabeza enorme a todos en recepción. ¿Hay alguna otra duda que le quede pendiente o con esto ya tiene lo suficiente para empezar a trabajar en la propuesta?

**Jorge:** Sí, aún tengo un par de preguntas más antes de terminar:
1. ¿Alguna vez han tenido más reservaciones que habitaciones disponibles? ¿Qué hacen en ese caso? Creo que esto va de la mano con el overbooking pero no queda de más dejarlo completamente claro.
2. Una vez que el cliente ya realizó el pago y efectivamente se checó, ¿se necesita de una confirmación del cliente o no es necesario?
3. ¿Si no existen habitaciones disponibles qué sucede?

**Javier:** Mire, Jorge, son tres preguntas muy puntuales y bien importantes para el sistema. Le explico cómo lo manejamos:

1. **¿Qué hacemos cuando tenemos más reservaciones que habitaciones (sobreventa o sobrecupo)?:**
   Sí nos ha pasado, lamentablemente, sobre todo por lo que le platicaba de las celdas duplicadas en el Excel o cuando mantenimiento saca un cuarto de servicio de emergencia y no hay a dónde mover al huésped. Cuando pasa esto y ya no tenemos ni una sola cama libre en el hotel, el protocolo que seguimos es:
   * **Reubicación (desvío a hotel convenio):** Tenemos convenio con dos hoteles de la misma categoría aquí cerca. Hablamos de inmediato para ver si tienen lugar y trasladamos al cliente.
   * **Costo asumido por el hotel:** Si la tarifa del otro hotel es más cara, la diferencia la absorbe el Hotel Paraíso. Además, les cubrimos el transporte (un taxi de sitio) hacia el nuevo hotel.
   * **Cortesía o compensación:** Si el cliente ya había pagado y la molestia es grande, Don Roberto a veces les ofrece una cortesía (como un desayuno incluido allá o un descuento para su próxima visita). Es una situación muy penosa que siempre tratamos de evitar.

2. **Una vez verificado el pago del anticipo, ¿se necesita confirmación del cliente?:**
   No, no hace falta que el cliente nos vuelva a confirmar. En cuanto nosotros verificamos que el dinero cayó a la cuenta o que la tarjeta pasó en la terminal:
   * Le cambiamos el estatus en el Excel de "Pendiente/Pre-reserva" (amarillo) a "Confirmada" (verde).
   * Le enviamos por correo su carta de confirmación formal en PDF con su número de folio. Con eso la reserva queda 100% en firme de nuestro lado. Solo les ponemos en el correo una nota breve de: *"Presentar esta confirmación impresa o digital y una identificación oficial al momento de su llegada"*. No requerimos que nos contesten de recibido.

3. **¿Qué sucede si un cliente se comunica o llega y no hay habitaciones disponibles?:**
   * Si es por teléfono, WhatsApp o mostrador y el Excel marca 100% de ocupación para esas fechas, simplemente le informamos con amabilidad que tenemos casa llena. Le ofrecemos fechas alternativas cercanas por si tiene flexibilidad para viajar en otro día.
   * Si el cliente insiste mucho o nos dice que viene a un evento en la ciudad, a veces le tomamos su nombre y teléfono para una "lista de espera" informal en la libreta. Si antes de la fecha alguien cancela o no paga su pre-reserva, le echamos una llamada para avisarle que se liberó un cuarto. Aunque como es manual en libreta, no siempre da tiempo.

**Jorge:** Creo que mencionaste sobre el contenido del formato original que se le manda al cliente, pero no la carta de confirmación formal. Dime lo que viene en su contenido por favor.
Okey, solamente se le informa en caso que el cliente que ya se registró cancele.

**Javier:** Mire, Jorge, para no generar confusión: la plantilla de la que le hablé hace un momento y la carta de confirmación formal son exactamente el mismo documento. Lo llamamos "carta de confirmación" porque va redactada en tono formal con membrete del hotel, y la manejamos como plantilla de Word para convertirla a PDF antes de mandarla.

Para que lo tenga bien presente, el contenido exacto de esa carta es:
* **Membrete del hotel:** Logotipo del Hotel Paraíso, dirección completa, teléfonos de contacto, correo de atención y RFC.
* **Datos del registro:** Número de folio consecutivo de la reservación, fecha y hora de emisión del documento.
* **Datos del huésped titular:** Nombre completo, teléfono y correo electrónico.
* **Detalle de la estancia:** Fecha y hora de entrada (*check-in*), fecha y hora de salida (*check-out*), número total de noches reservadas, cantidad de personas (especificando adultos y niños).
* **Detalle del cuarto:** Tipo de habitación (Estándar, Doble o Suite), número de habitación asignada y las notas de peticiones especiales registradas.
* **Desglose financiero:** Tarifa pactada por noche, costo total de la estancia, monto exacto cubierto como anticipo (el 50%), método por el cual pagó y el saldo restante exacto que deberá liquidar al momento de presentarse en mostrador.
* **Instrucción de llegada:** La nota donde se le pide presentar esa confirmación (digital o impresa) junto con una identificación oficial vigente al momento de su registro.
* **Términos y condiciones al pie:** El resumen de las políticas oficiales (horarios de check-in/check-out, penalizaciones por cancelación, política de cambios, aviso de tolerancia de No Show hasta las 8:00 PM y reglas básicas como no fumar y no mascotas).

Y respecto a su segundo punto: así es, a las personas que dejamos anotadas en la lista de espera informal solo las contactamos si se llega a liberar una habitación, ya sea porque un cliente canceló formalmente o porque no pagó su anticipo a tiempo.

**Jorge:** Hasta ahora solo tengo algunos participantes dentro de todo este proceso de las reservaciones: recepcionistas, el gerente, las camaristas, personal de limpieza o botones. ¿Quién más participa en este proceso?

**Javier:** Mire, Jorge, además de los compañeros que ya mencionó, hay dos figuras más que intervienen de forma directa o indirecta en el flujo:
* **El propio cliente / huésped:** Que es quien detona todo el proceso desde el inicio (solicitando informes, enviando sus datos personales y haciendo los pagos correspondientes).
* **El contador externo / Administrador contable:** Aunque no está físicamente en recepción todos los días, él viene un par de veces por semana o se comunica con Don Roberto para el tema del corte de ingresos, la conciliación de los vouchers de la terminal bancaria y la emisión de las facturas electrónicas (CFDI) fiscales para los clientes que nos solicitan factura con sus datos del SAT.

Fuera de ellos dos, junto con nosotros los recepcionistas, Don Roberto (gerente), las camaristas, el personal de mantenimiento y el botones, ya no interviene nadie más en la operación de las reservaciones y estancias del hotel. Con eso tiene al equipo completo.

**Jorge:** El corte de ingresos es algo que está fuera del sistema supongo, ¿es algo solo entre el gerente y el contador?

**Javier:** Así es, Jorge, la parte fuerte del corte contable final se maneja fuera del sistema de reservaciones, directamente entre Don Roberto y el contador. Ellos usan su propio programa de contabilidad y facturación.

Sin embargo, en recepción sí hacemos un **pre-corte al final de cada turno**. Lo que hacemos los recepcionistas es:
1. Sumar en la libreta el dinero en efectivo que cobramos en mostrador durante las 8 horas del turno.
2. Sacar la tira de totales de la terminal bancaria (el cierre de lote con los cobros de tarjeta).
3. Juntar las copias de los recibos de remisión y los comprobantes de transferencias que se recibieron.
4. Dejar todo ese dinero y comprobantes en un sobre cerrado dentro de la caja fuerte de recepción para que Don Roberto lo revise en la mañana.

Ese reporte que nosotros armamos es meramente físico en papel; no generamos ningún reporte de caja dentro del archivo de Excel. Don Roberto toma esos sobres, revisa que cuadren con el Excel y con los estados de cuenta del banco, y ya con eso él se coordina con el contador.

**Jorge:** ¿Qué información viene en ese reporte de pre-corte?

**Javier:** Mire, Jorge, ese reporte de pre-corte lo anotamos en una hoja de control impresa que engrapamos al sobre de dinero al final del turno. Contiene lo siguiente:
* **Datos de control:** Fecha, número de turno (matutino, vespertino o nocturno) y nombre y firma del recepcionista responsable.
* **Fondo de caja inicial:** El monto fijo de efectivo que recibimos al iniciar el turno para dar cambio (el "fondo flotante").
* **Desglose de ingresos del turno:**
  * *Efectivo cobrado:* La suma de entradas en efectivo por anticipos, liquidaciones de estancia o cobros extra (como personas adicionales o camas extras), anotando el número de habitación o folio correspondiente.
  * *Cobros con tarjeta:* El total reflejado en el reporte de cierre de lote de la terminal bancaria, anexando todos los vouchers firmados.
  * *Transferencias bancarias:* La lista de las transferencias reportadas por los clientes que entraron durante el turno, con su folio y monto para que Don Roberto las coteje con el banco.
* **Salidas o gastos menores de caja chica:** Si se tuvo que pagar algún imprevisto menor autorizado en efectivo (por ejemplo, comprar garrafones de agua o pagar un taxi de servicio), anotando el concepto y engrapando el ticket.
* **Totales y arqueo:** El monto total de efectivo que se queda físicamente dentro del sobre, la diferencia si llega a sobrar o faltar dinero respecto a los recibos, y el espacio para la firma de recibido de Don Roberto cuando abre la caja en la mañana.

Todo eso se queda en papel y cerrado bajo llave en la caja fuerte de recepción.

**Jorge:** Me quedó claro, gracias. Ahora hablando sobre los involucrados, solo me queda una duda sobre los restantes. ¿Qué información reciben ellos?, incluyendo al huésped.

**Javier:** Mire, Jorge, para que tenga el mapa exacto de la información que fluye hacia cada uno de los involucrados restantes, se lo desgloso así:
* **El huésped / cliente:**
  * La cotización con tarifas, tipos de habitación y datos bancarios para el anticipo.
  * La carta de confirmación formal (en PDF por correo) con su número de folio, detalles de estancia, saldo pendiente y políticas.
  * Su comprobante o nota de remisión física cuando liquida en mostrador, junto con la llave y el número de su habitación asignada.
* **La jefa de camaristas y el personal de limpieza:**
  * La lista diaria de ocupación impresa por la mañana desde el Excel.
  * En esa lista ven: número de habitación, estatus (si está ocupada, libre o si sale ese día el huésped), y si el cuarto requiere preparación especial (como montar cuna o cama extra).
* **El personal de mantenimiento:**
  * Reportes verbales o notas de servicio puntuales (por radio o en persona) indicando el número de habitación y la falla específica reportada (fugas de agua, aire acondicionado, cerraduras, etc.) para que vayan a repararlo antes del siguiente check-in.
* **El botones:**
  * El número de habitación asignada, el nombre o apellido del titular y la indicación de cuántas maletas subir o si hay requerimientos de apoyo para personas de la tercera edad o con movilidad reducida.
* **El contador externo:**
  * El resumen contable mensual que le entrega Don Roberto.
  * Los comprobantes fiscales y datos del SAT (RFC, razón social, régimen, código postal y uso de CFDI) que los clientes nos dejan en recepción para emitir sus facturas electrónicas.
  * Los cortes de caja y cierres de lote de las terminales bancarias para conciliar con los estados de cuenta del banco.
* **Don Roberto (el gerente):**
  * Los sobres de pre-corte de cada turno con el dinero en efectivo, vouchers y comprobantes.
  * Las solicitudes de reembolso para revisión y autorización de transferencias.
  * El reporte general de ocupación que consulta directamente en el archivo de Excel.

**Jorge:** Gracias. ¿Fuera del Excel existen reportes o documentos donde se registren las reservaciones o para revisar?

**Javier:** Sí, Jorge, fuera del Excel sí manejamos varios documentos y registros físicos donde consultamos y respaldamos la información de las reservaciones:
* **El fólder de acordeón (archivo físico diario):** Está dividido del día 1 al 31 del mes. Ahí metemos las hojas impresas de las cartas de confirmación junto con su comprobante de pago grapado. Es el documento oficial que sacamos cuando el huésped se para frente al mostrador para cotejar sus datos y hacer que nos firme de conformidad al entregarle la llave.
* **La bitácora de recepción (el cuaderno de turno):** Es nuestra libreta de mano donde apuntamos notas operativas del día: llegadas tardías después de las 8:00 PM, prórrogas de pre-reservas, clientes en lista de espera y cualquier recado importante entre turnos.
* **La lista diaria de ocupación impresa:** La hoja que sacamos del Excel cada mañana a primera hora para la jefa de camaristas y para tenerla nosotros en una tabla con clip sobre el mostrador, por si se va la luz o no podemos abrir la computadora rápido.
* **El talonario de notas de remisión:** El librito de notas foliadas con copia al carbón donde registramos los cobros en efectivo que hacemos al momento.
* **Los formatos de reembolso y sobres de pre-corte:** Las hojas impresas donde Don Roberto revisa y autoriza cancelaciones, junto con los reportes de arqueo que dejamos en la caja fuerte al terminar cada turno.

Básicamente, si el sistema o la computadora llegaran a fallar, el fólder de acordeón y la bitácora son nuestro respaldo físico para saber quién llega y qué tiene pagado.

**Jorge:** Listo, por el momento tengo toda la información que necesitaba. ¿Te platico un poco sobre los problemas que tomaremos en cuenta y resolveremos?

**Javier:** ¡Claro que sí, Jorge! Adelante, me encantaría escucharlo. La verdad me da mucha curiosidad y entusiasmo saber cómo tienen pensado aterrizar todo esto para resolver los líos que tenemos con el Excel, las pre-reservas y la comunicación. Cuénteme, soy todo oídos.

**Jorge:** Como principal problema que abordaremos será el *overbooking*, para resolver la sobreventa y la concurrencia: ya no habrá por qué tener que estresarse porque dos personas estén registrando reservaciones al mismo tiempo.
Notificaciones para la pre-reserva, más la ayuda del sistema liberando el cuarto automáticamente.
Problema con el No-Show: mandar recordatorios de alerta de quiénes faltan por llegar y permitir cambiar el estatus para evitar perder ventas.
Agilizar el proceso de modificación de fechas, cancelación y reembolsos.
Además, dentro del sistema preguntar sobre los casos especiales: familiares con problemas, uso de silla de ruedas, y agilizar el proceso con las camaristas para que los huéspedes puedan utilizar los cuartos una vez ya hayan sido desocupados.
Y por último pero no menos importante: conectar el sistema con las camaristas para que ya no sea solo de palabra o por papel.

**Javier:** ¡Qué maravilla, Jorge! La verdad me deja con una sonrisa de oreja a oreja. Dio en el clavo con todos y cada uno de los dolores de cabeza que vivimos aquí a diario.

Si logran que el sistema maneje la concurrencia en tiempo real y libere solo las pre-reservas, nos quitan el 80% del estrés del turno. Y eso que menciona de integrar el estatus de camaristas para ver en pantalla qué cuarto ya está limpio, junto con el registro de necesidades especiales (como lo de planta baja para personas mayores), nos va a evitar muchísimos reclamos en el mostrador.

Por mi parte creo que tiene el diagnóstico perfecto. Muchísimas gracias por tomarse el tiempo de escuchar a detalle cómo trabajamos. Estaré esperando con muchas ganas el día que nos vengan a capacitar con la nueva plataforma. ¡Mucho éxito con el desarrollo del proyecto!

**Jorge:** Muchas gracias por su tiempo, estamos en contacto.

**Javier:** Fue un verdadero gusto, Jorge. Mucho éxito con el desarrollo del sistema y aquí los esperamos cuando esté listo para implementarlo. Que le vaya muy bien, que tenga un excelente día.
