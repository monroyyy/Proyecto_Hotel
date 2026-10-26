package com.ico.hotel.tools;

import com.ico.hotel.dto.ReservaRequest;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.services.ReservaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReservaTool {

    private final ReservaService reservaService;
    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;

    @Tool(description = "Registrar formalmente una reservación en la base de datos del hotel. " +
            "REGLA OBLIGATORIA: NO llames a esta herramienta si el usuario no ha proporcionado explícitamente todos los datos (nombre del huésped, fechas de entrada y salida, número de habitación y hotel) y no ha confirmado el resumen final de la reservación.")
    public Map<String, Object> crearReservacion(
            @ToolParam(description = "Nombre del hotel: 'Hotel Paraíso' o 'Hotel Paraíso Ejecutivo'", required = false)
            String hotel,
            @ToolParam(description = "Número de la habitación a reservar (ej. '101', '201', '202', '301')", required = true)
            String numeroHabitacion,
            @ToolParam(description = "Fecha de entrada en formato YYYY-MM-DD (ej. '2026-11-01')", required = true)
            String fechaEntrada,
            @ToolParam(description = "Fecha de salida en formato YYYY-MM-DD (ej. '2026-11-03')", required = true)
            String fechaSalida,
            @ToolParam(description = "Nombre completo del huésped titular (ej. 'Carlos Mendoza')", required = true)
            String nombreHuesped,
            @ToolParam(description = "Teléfono del huésped a 10 dígitos (ej. '5512345678')", required = false)
            String telefono,
            @ToolParam(description = "Correo electrónico del huésped (ej. 'carlos@email.com')", required = false)
            String email,
            @ToolParam(description = "Cantidad de adultos (mínimo 1, por defecto 1)", required = false)
            Integer adultos,
            @ToolParam(description = "Cantidad de niños (por defecto 0)", required = false)
            Integer ninos,
            @ToolParam(description = "Modalidad: 'PRE_RESERVA' (apartado sin pago inmediato, vigencia 24-48h) o 'CONFIRMADA' (con anticipo del 50%)", required = false)
            String modalidad,
            @ToolParam(description = "Monto del anticipo pagado en pesos (obligatorio si modalidad es CONFIRMADA)", required = false)
            Double anticipo,
            @ToolParam(description = "Método de pago del anticipo: 'Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia'", required = false)
            String metodoPago,
            @ToolParam(description = "¿Requiere cuna? (true/false)", required = false)
            Boolean cuna,
            @ToolParam(description = "¿Requiere cama extra? (true/false)", required = false)
            Boolean camaExtra,
            @ToolParam(description = "¿Solicitó planta baja? (true/false)", required = false)
            Boolean plantaBaja,
            @ToolParam(description = "Observaciones o peticiones especiales para la estancia", required = false)
            String observaciones) {

        log.info("Tool invocada — crearReservacion: hotel={}, hab={}, entrada={}, salida={}, huesped={}",
                hotel, numeroHabitacion, fechaEntrada, fechaSalida, nombreHuesped);

        Map<String, Object> respuesta = new LinkedHashMap<>();

        try {
            if (numeroHabitacion == null || numeroHabitacion.isBlank()) {
                return Map.of("error", "Falta el número de habitación. Por favor pregunte al recepcionista/huésped qué número de habitación desea reservar.");
            }
            if (nombreHuesped == null || nombreHuesped.trim().length() < 3) {
                return Map.of("error", "Falta el nombre completo del huésped titular. Por favor solicite al huésped su nombre y apellidos.");
            }
            if (fechaEntrada == null || fechaEntrada.isBlank() || fechaSalida == null || fechaSalida.isBlank()) {
                return Map.of("error", "Faltan las fechas de estancia. Por favor solicite la fecha de llegada (Check-in) y fecha de salida (Check-out) en formato AAAA-MM-DD.");
            }

            LocalDate entrada;
            LocalDate salida;
            try {
                entrada = LocalDate.parse(fechaEntrada.trim());
                salida = LocalDate.parse(fechaSalida.trim());
            } catch (DateTimeParseException | NullPointerException ex) {
                return Map.of("error", "Formato de fechas inválido. Las fechas deben estar en formato AAAA-MM-DD (ej. 2026-11-20 al 2026-11-22).");
            }

            if (!salida.isAfter(entrada)) {
                return Map.of("error", "La fecha de salida (" + salida + ") debe ser posterior a la fecha de entrada (" + entrada + ").");
            }

            String exactHotel = HabitacionSearchTool.resolverNombreHotelExacto(hotel);
            List<Habitacion> habitaciones = (exactHotel != null)
                    ? habitacionRepository.findByNumeroAndHotelNombre(numeroHabitacion.trim(), exactHotel)
                    : habitacionRepository.findByNumero(numeroHabitacion.trim());

            if (habitaciones.isEmpty()) {
                return Map.of("error", "No se encontró la habitación " + numeroHabitacion +
                        (exactHotel != null ? " en " + exactHotel : "") + ". Por favor verifique el número y hotel.");
            }

            Habitacion hab = habitaciones.get(0);
            exactHotel = hab.getHotel().getNombre();

            // Validar teléfono de 10 dígitos obligatorio
            String cleanTel = telefono != null ? telefono.replaceAll("\\D", "") : "";
            if (cleanTel.length() != 10) {
                return Map.of("error", "Falta el número de teléfono del huésped titular a 10 dígitos. Por favor solicítelo antes de confirmar la reserva.");
            }

            // Validar email obligatorio
            if (email == null || !email.contains("@") || !email.contains(".")) {
                return Map.of("error", "Falta el correo electrónico del huésped titular. Por favor solicite un correo electrónico válido para enviarle la confirmación.");
            }
            String cleanEmail = email.trim().toLowerCase();

            // Verificar si el usuario ha confirmado explícitamente en su mensaje
            String currentPrompt = HabitacionSearchTool.CURRENT_USER_PROMPT.get();
            if (currentPrompt != null) {
                String normPrompt = java.text.Normalizer.normalize(currentPrompt.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "");
                boolean esConfirmacion = normPrompt.contains("si") || normPrompt.contains("confirm") || 
                                         normPrompt.contains("adelante") || normPrompt.contains("realiz") ||
                                         normPrompt.contains("proced") || normPrompt.contains("de acuerdo");
                boolean contieneTodosLosDatosEnUnSoloMensaje = normPrompt.contains("titular") || normPrompt.contains("correo") || normPrompt.contains("telefono");

                if (!esConfirmacion && !contieneTodosLosDatosEnUnSoloMensaje) {
                    return Map.of("error", "Antes de registrar formalmente la reservación, debe mostrar el RESUMEN al recepcionista/huésped y solicitar su CONFIRMACIÓN explícita.");
                }
            }

            boolean esCuna = Boolean.TRUE.equals(cuna);
            boolean esCamaExtra = Boolean.TRUE.equals(camaExtra);
            int numAdultos = adultos != null && adultos > 0 ? adultos : 1;
            int numNinos = ninos != null && ninos >= 0 ? ninos : 0;

            // Calcular tarifa para conocer anticipo requerido
            Map<String, Object> tarifa = reservaService.calcularTarifa(hab, entrada, salida, esCuna, esCamaExtra);
            BigDecimal totalEstancia = (BigDecimal) tarifa.get("total");
            BigDecimal anticipoMinimo = (BigDecimal) tarifa.get("anticipoRequerido");

            boolean esConfirmada = "CONFIRMADA".equalsIgnoreCase(modalidad) || (anticipo != null && anticipo > 0);

            ReservaRequest req = new ReservaRequest();
            req.setIdHabitacion(hab.getIdHabitacion());
            req.setFechaEntrada(entrada);
            req.setFechaSalida(salida);
            req.setNombre(nombreHuesped.trim());
            req.setTelefono(cleanTel);
            req.setEmail(cleanEmail);
            req.setAdultos(numAdultos);
            req.setNinos(numNinos);
            req.setCuna(esCuna);
            req.setCamaExtra(esCamaExtra);
            req.setPlantaBajaSolicitada(Boolean.TRUE.equals(plantaBaja));
            req.setObservaciones(observaciones != null && !observaciones.isBlank()
                    ? observaciones
                    : "Reservación creada por Asistente Virtual");
            req.setRecepcionista("Javier");

            if (esConfirmada) {
                req.setModalidad("CONFIRMADA");
                BigDecimal montoAnticipo = (anticipo != null) ? BigDecimal.valueOf(anticipo) : anticipoMinimo;
                if (montoAnticipo.compareTo(anticipoMinimo) < 0) {
                    montoAnticipo = anticipoMinimo;
                }
                req.setAnticipo(montoAnticipo);
                req.setMetodoPago(metodoPago != null && !metodoPago.isBlank() ? metodoPago : "Efectivo");
            } else {
                req.setModalidad("PRE_RESERVA");
                req.setHorasVigencia(24);
            }

            Reserva creada = reservaService.crear(req);

            respuesta.put("exito", true);
            respuesta.put("mensaje", "¡Reservación creada con éxito en el sistema!");
            respuesta.put("folio", creada.getFolio());
            respuesta.put("estado", creada.getEstado());
            respuesta.put("hotel", hab.getHotel().getNombre());
            respuesta.put("ciudad", hab.getHotel().getCiudad());
            respuesta.put("habitacion", hab.getNumero());
            respuesta.put("tipoHabitacion", hab.getTipoHabitacion().getNombre());
            respuesta.put("piso", hab.getPiso());
            respuesta.put("titular", creada.getHuesped().getNombre());
            respuesta.put("telefono", creada.getHuesped().getTelefono());
            respuesta.put("email", creada.getHuesped().getEmail());
            respuesta.put("fechaEntrada", creada.getFechaEntrada().toString());
            respuesta.put("fechaSalida", creada.getFechaSalida().toString());
            respuesta.put("noches", creada.getNoches());
            respuesta.put("adultos", creada.getAdultos());
            respuesta.put("ninos", creada.getNinos());
            respuesta.put("total", "$" + creada.getTotal() + " MXN");
            respuesta.put("anticipo", "$" + creada.getAnticipo() + " MXN");
            respuesta.put("saldoPendiente", "$" + creada.getSaldo() + " MXN");
            respuesta.put("metodoPago", creada.getMetodoPago() != null ? creada.getMetodoPago() : "Pendiente (Pago en Check-in)");
            if (creada.getFechaExpiracion() != null) {
                respuesta.put("vigenciaPreReserva", creada.getFechaExpiracion().toString());
                respuesta.put("avisoPreReserva", "Esta pre-reserva expira en 24 horas si no se registra el comprobante de anticipo del 50%.");
            }
            respuesta.put("recepcionistaRegistro", creada.getRecepcionista());

            return respuesta;

        } catch (Exception e) {
            log.error("Error al crear reservación mediante Tool: {}", e.getMessage(), e);
            return Map.of("error", "No fue posible crear la reservación: " + e.getMessage());
        }
    }

    private Map<String, Object> mapReservaToMap(Reserva r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("folio", r.getFolio());
        map.put("estado", r.getEstado());
        map.put("hotel", r.getHabitacion().getHotel().getNombre());
        map.put("habitacion", r.getHabitacion().getNumero());
        map.put("piso", r.getHabitacion().getPiso());
        map.put("tipoHabitacion", r.getHabitacion().getTipoHabitacion().getNombre());
        map.put("titular", r.getHuesped().getNombre());
        map.put("telefono", r.getHuesped().getTelefono());
        map.put("email", r.getHuesped().getEmail());
        map.put("fechaEntrada", r.getFechaEntrada().toString());
        map.put("fechaSalida", r.getFechaSalida().toString());
        map.put("noches", r.getNoches());
        map.put("adultos", r.getAdultos());
        map.put("ninos", r.getNinos());
        map.put("total", "$" + r.getTotal() + " MXN");
        map.put("anticipo", "$" + r.getAnticipo() + " MXN");
        map.put("saldo", "$" + r.getSaldo() + " MXN");
        map.put("metodoPago", r.getMetodoPago() != null ? r.getMetodoPago() : "N/A");
        map.put("cuna", Boolean.TRUE.equals(r.getCuna()) ? "Sí" : "No");
        map.put("camaExtra", Boolean.TRUE.equals(r.getCamaExtra()) ? "Sí" : "No");
        map.put("plantaBajaSolicitada", Boolean.TRUE.equals(r.getPlantaBajaSolicitada()) ? "Sí" : "No");
        if (r.getObservaciones() != null && !r.getObservaciones().isBlank()) {
            map.put("observaciones", r.getObservaciones());
        }
        if (r.getFechaExpiracion() != null) {
            map.put("fechaExpiracion", r.getFechaExpiracion().toString());
        }
        map.put("recepcionista", r.getRecepcionista());
        return map;
    }

    @Tool(description = "Consultar los datos, estado y desglose de una reservación existente mediante su número de folio (ej. 'HP-2026-00001').")
    public Map<String, Object> consultarReservacionPorFolio(
            @ToolParam(description = "Folio oficial de la reservación (ej. 'HP-2026-00001')", required = true)
            String folio) {
        log.info("Tool invocada — consultarReservacionPorFolio: folio={}", folio);
        if (folio == null || folio.isBlank()) {
            return Map.of("error", "Debe proporcionar el folio de la reservación.");
        }
        return reservaRepository.findByFolioIgnoreCase(folio.trim())
                .map(this::mapReservaToMap)
                .orElse(Map.of("error", "No se encontró ninguna reservación con el folio " + folio + "."));
    }

    @Tool(description = "Buscar y consultar reservaciones de clientes cuando NO se tiene el folio. " +
            "Permite buscar de forma flexible por: nombre o apellido del titular/huésped, teléfono (10 dígitos o parcial), " +
            "correo electrónico, o número de habitación. Devuelve la lista de reservaciones encontradas con su información completa.")
    public List<Map<String, Object>> buscarReservaciones(
            @ToolParam(description = "Criterio de búsqueda libre: nombre o apellido del huésped, teléfono, correo o número de habitación (ej. 'Carlos', 'Arturo', '5512345678', 'carlos@email.com', '201')", required = true)
            String criterio,
            @ToolParam(description = "Filtrar por hotel (opcional): 'Hotel Paraíso' o 'Hotel Paraíso Ejecutivo'. Dejar vacío para buscar en toda la cadena.", required = false)
            String hotel) {
        log.info("Tool invocada — buscarReservaciones: criterio={}, hotel={}", criterio, hotel);
        if (criterio == null || criterio.isBlank()) {
            return List.of(Map.of("error", "Debe ingresar un nombre, teléfono, correo o número de habitación para buscar la reservación."));
        }
        String term = criterio.trim();
        List<Reserva> lista = reservaRepository.buscarPorCriterioGeneral(term);

        if (hotel != null && !hotel.isBlank()) {
            String hLower = hotel.trim().toLowerCase();
            lista = lista.stream()
                    .filter(r -> r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                            && r.getHabitacion().getHotel().getNombre().toLowerCase().contains(hLower))
                    .toList();
        }

        if (lista.isEmpty()) {
            return List.of(Map.of("mensaje", "No se encontraron reservaciones con el criterio '" + criterio + "'."));
        }

        return lista.stream()
                .map(this::mapReservaToMap)
                .toList();
    }

    @Tool(description = "Verificar disponibilidad y cotizar opciones de habitaciones para fechas específicas antes de crear una reservación o consultar qué habitaciones estarán disponibles en una fecha futura. " +
            "Devuelve habitaciones disponibles con desglose de costo total y anticipo requerido del 50%. Si el usuario solo menciona una sola fecha (ej. '30 de noviembre'), fechaSalida se asume automáticamente como el día siguiente (estancia de 1 noche).")
    public List<Map<String, Object>> cotizarDisponibilidadParaReserva(
            @ToolParam(description = "Nombre del hotel ('Hotel Paraíso' o 'Hotel Paraíso Ejecutivo'). Dejar vacío para ambos.", required = false)
            String hotel,
            @ToolParam(description = "Fecha de entrada YYYY-MM-DD (ej. '2026-11-30')", required = true)
            String fechaEntrada,
            @ToolParam(description = "Fecha de salida YYYY-MM-DD (ej. '2026-12-01'). Opcional: Si el usuario solo indica un día, se toma automáticamente el día siguiente.", required = false)
            String fechaSalida,
            @ToolParam(description = "Total de ocupantes (adultos + niños, por defecto 1)", required = false)
            Integer personas,
            @ToolParam(description = "¿Requiere cama extra? (true/false)", required = false)
            Boolean camaExtra,
            @ToolParam(description = "¿Requiere cuna? (true/false)", required = false)
            Boolean cuna,
            @ToolParam(description = "¿Requiere planta baja? (true/false)", required = false)
            Boolean plantaBaja) {

        log.info("Tool invocada — cotizarDisponibilidadParaReserva: hotel={}, entrada={}, salida={}, personas={}",
                hotel, fechaEntrada, fechaSalida, personas);

        try {
            LocalDate entrada = LocalDate.parse(fechaEntrada.trim());
            LocalDate salida;
            if (fechaSalida == null || fechaSalida.isBlank()) {
                salida = entrada.plusDays(1);
            } else {
                salida = LocalDate.parse(fechaSalida.trim());
                if (!salida.isAfter(entrada)) {
                    salida = entrada.plusDays(1);
                }
            }
            int ocupantes = personas != null && personas > 0 ? personas : 1;

            Integer idHotel = null;
            String exactHotel = HabitacionSearchTool.resolverNombreHotelExacto(hotel);
            if (exactHotel != null) {
                idHotel = exactHotel.contains("Ejecutivo") ? 2 : 1;
            }

            List<Map<String, Object>> disponibles = reservaService.buscarDisponibles(
                    idHotel, entrada, salida, ocupantes,
                    Boolean.TRUE.equals(camaExtra),
                    Boolean.TRUE.equals(plantaBaja),
                    Boolean.TRUE.equals(cuna)
            );

            return disponibles.stream().map(d -> {
                Habitacion h = (Habitacion) d.get("habitacion");
                @SuppressWarnings("unchecked")
                Map<String, Object> tarifa = (Map<String, Object>) d.get("tarifa");
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("hotel", h.getHotel().getNombre());
                item.put("numero", h.getNumero());
                item.put("piso", h.getPiso());
                item.put("tipo", h.getTipoHabitacion().getNombre());
                item.put("capacidad", h.getTipoHabitacion().getCapacidad() + " personas");
                item.put("noches", tarifa.get("noches"));
                item.put("totalEstancia", "$" + tarifa.get("total") + " MXN");
                item.put("anticipoRequerido50", "$" + tarifa.get("anticipoRequerido") + " MXN");
                item.put("plantaBaja", d.get("plantaBaja"));
                return item;
            }).toList();

        } catch (Exception e) {
            log.error("Error al cotizar disponibilidad: {}", e.getMessage(), e);
            return List.of(Map.of("error", "No fue posible cotizar disponibilidad: " + e.getMessage()));
        }
    }

    @Tool(description = "Listar las habitaciones que se encuentran en estado de Pre-reserva o Pendientes de pago de anticipo en los hoteles. " +
            "OBLIGATORIA para: 'dame las habitaciones en pre reserva', 'habitaciones pendientes de pago', 'habitaciones pre-reservadas', 'pre reservas activas'. " +
            "Devuelve el detalle con hotel, habitación, folio, titular, vigencia de 24-48h y anticipo pendiente.")
    public List<Map<String, Object>> findHabitacionesEnPreReserva(
            @ToolParam(description = "Nombre del hotel (opcional): 'Hotel Paraíso' o 'Hotel Paraíso Ejecutivo'. Déjelo vacío para consultar en ambos hoteles.", required = false)
            String hotel) {

        log.info("Tool invocada — findHabitacionesEnPreReserva: hotel={}", hotel);
        String exactHotel = HabitacionSearchTool.resolverNombreHotelExacto(hotel);

        List<Reserva> lista = (exactHotel != null)
                ? reservaRepository.findPreReservasActivasEnHotel(exactHotel)
                : reservaRepository.findPreReservasActivas();

        if (lista.isEmpty()) {
            return List.of(Map.of(
                    "mensaje", "No hay habitaciones en estado de Pre-reserva actualmente" +
                            (exactHotel != null ? " en " + exactHotel : " en ninguna propiedad") + ".",
                    "total", 0
            ));
        }

        return lista.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("folio", r.getFolio());
            map.put("hotel", r.getHabitacion().getHotel().getNombre());
            map.put("habitacion", r.getHabitacion().getNumero());
            map.put("piso", r.getHabitacion().getPiso());
            map.put("tipoHabitacion", r.getHabitacion().getTipoHabitacion().getNombre());
            map.put("titular", r.getHuesped().getNombre());
            map.put("telefono", r.getHuesped().getTelefono());
            map.put("fechaEntrada", r.getFechaEntrada().toString());
            map.put("fechaSalida", r.getFechaSalida().toString());
            map.put("noches", r.getNoches());
            map.put("total", "$" + r.getTotal() + " MXN");
            map.put("anticipoPendiente", "$" + (r.getAnticipo() != null && r.getAnticipo().compareTo(BigDecimal.ZERO) > 0 ? r.getAnticipo() : r.getTotal().divide(BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_UP)) + " MXN");
            map.put("vigenciaExpiracion", r.getFechaExpiracion() != null ? r.getFechaExpiracion().toString() : "24 a 48 horas");
            map.put("estado", "Pre-reserva");
            return map;
        }).toList();
    }
}
