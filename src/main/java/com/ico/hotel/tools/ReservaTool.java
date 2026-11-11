package com.ico.hotel.tools;

import com.ico.hotel.dto.ReservaRequest;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.Rol;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.security.CustomUserDetails;
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
    private final HotelRepository hotelRepository;
    private final com.ico.hotel.repository.HuespedRepository huespedRepository;

    private boolean perteneceAHuespedActual(Reserva r, CustomUserDetails user) {
        if (user == null) return false;
        if (user.isStaff()) return true;
        boolean porId = r.getUsuario() != null && r.getUsuario().getIdUsuario() != null
                && r.getUsuario().getIdUsuario().equals(user.getIdUsuario());
        boolean porEmail = r.getHuesped() != null && r.getHuesped().getEmail() != null
                && r.getHuesped().getEmail().trim().equalsIgnoreCase(user.getEmail().trim());
        return porId || porEmail;
    }

    @Tool(description = "Registrar formalmente una reservación en la base de datos del hotel. " +
            "REGLA OBLIGATORIA: NO llames a esta herramienta si el usuario no ha proporcionado explícitamente todos los datos y no ha confirmado el resumen final de la reservación.")
    public Map<String, Object> crearReservacion(
            @ToolParam(description = "Nombre del hotel (ej. 'Hotel Paraíso', 'Hotel Paraíso Ejecutivo' o cualquier hotel de la cadena)", required = false)
            String hotel,
            @ToolParam(description = "Número de la habitación a reservar (ej. '101', '201', '202', '301')", required = true)
            String numeroHabitacion,
            @ToolParam(description = "Fecha de entrada en formato YYYY-MM-DD (ej. '2026-11-01')", required = true)
            String fechaEntrada,
            @ToolParam(description = "Fecha de salida en formato YYYY-MM-DD (ej. '2026-11-03')", required = true)
            String fechaSalida,
            @ToolParam(description = "Nombre completo del huésped titular (ej. 'Carlos Mendoza')", required = false)
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

        CustomUserDetails authUser = HabitacionSearchTool.getAuthenticatedUser();
        if (authUser != null && authUser.getRol() == Rol.HUESPED) {
            // Si quien usa el chat es un HUESPED, siempre usa su propio correo verificado y su nombre por defecto
            email = authUser.getEmail();
            if (nombreHuesped == null || nombreHuesped.isBlank()) {
                nombreHuesped = authUser.getNombre();
            }
            if ((telefono == null || telefono.replaceAll("\\D", "").length() != 10)) {
                // Intentar recuperar el teléfono previamente registrado del huésped si existe
                var prevHuesped = huespedRepository.findFirstByEmailIgnoreCase(authUser.getEmail());
                if (prevHuesped.isPresent() && prevHuesped.get().getTelefono() != null && prevHuesped.get().getTelefono().replaceAll("\\D", "").length() == 10) {
                    telefono = prevHuesped.get().getTelefono();
                }
            }
        }

        log.info("Tool invocada — crearReservacion: hotel={}, hab={}, entrada={}, salida={}, huesped={}",
                hotel, numeroHabitacion, fechaEntrada, fechaSalida, nombreHuesped);

        Map<String, Object> respuesta = new LinkedHashMap<>();

        try {
            if (numeroHabitacion == null || numeroHabitacion.isBlank()) {
                return Map.of("error", "Falta el número de habitación. Por favor pregunte qué número de habitación desea reservar.");
            }
            if (nombreHuesped == null || nombreHuesped.trim().length() < 3) {
                return Map.of("error", "Falta el nombre completo del huésped titular.");
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

            String cleanTel = telefono != null ? telefono.replaceAll("\\D", "") : "";
            if (cleanTel.length() != 10) {
                return Map.of("error", "Falta el número de teléfono de contacto a 10 dígitos. Por favor solicítelo antes de confirmar la reserva.");
            }

            if (email == null || !email.contains("@") || !email.contains(".")) {
                return Map.of("error", "Falta el correo electrónico del titular.");
            }
            String cleanEmail = email.trim().toLowerCase();

            String currentPrompt = HabitacionSearchTool.CURRENT_USER_PROMPT.get();
            if (currentPrompt != null) {
                String normPrompt = java.text.Normalizer.normalize(currentPrompt.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "");
                boolean esConfirmacion = normPrompt.contains("si") || normPrompt.contains("confirm") ||
                                         normPrompt.contains("adelante") || normPrompt.contains("realiz") ||
                                         normPrompt.contains("proced") || normPrompt.contains("de acuerdo");
                boolean contieneTodosLosDatosEnUnSoloMensaje = normPrompt.contains("titular") || normPrompt.contains("correo") || normPrompt.contains("telefono");

                if (!esConfirmacion && !contieneTodosLosDatosEnUnSoloMensaje) {
                    return Map.of("error", "Antes de registrar formalmente la reservación, debe mostrar el RESUMEN y solicitar CONFIRMACIÓN explícita.");
                }
            }

            boolean esCuna = Boolean.TRUE.equals(cuna);
            boolean esCamaExtra = Boolean.TRUE.equals(camaExtra);
            int numAdultos = adultos != null && adultos > 0 ? adultos : 1;
            int numNinos = ninos != null && ninos >= 0 ? ninos : 0;

            Map<String, Object> tarifa = reservaService.calcularTarifa(hab, entrada, salida, esCuna, esCamaExtra);
            BigDecimal anticipoMinimo = (BigDecimal) tarifa.get("anticipoRequerido");

            boolean esHuesped = authUser != null && authUser.getRol() == Rol.HUESPED;
            boolean esConfirmada = !esHuesped && ("CONFIRMADA".equalsIgnoreCase(modalidad) || (anticipo != null && anticipo > 0));

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
                if (esHuesped && (anticipo != null || "CONFIRMADA".equalsIgnoreCase(modalidad))) {
                    log.warn("Usuario huésped intentó crear reserva directamente como CONFIRMADA. Forzando a PRE_RESERVA.");
                }
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
        CustomUserDetails authUser = HabitacionSearchTool.getAuthenticatedUser();
        var opt = reservaRepository.findByFolioIgnoreCase(folio.trim());
        if (opt.isEmpty()) {
            return Map.of("error", "No se encontró ninguna reservación con el folio " + folio + ".");
        }
        Reserva r = opt.get();
        if (authUser != null && authUser.getRol() == Rol.HUESPED && !perteneceAHuespedActual(r, authUser)) {
            return Map.of(
                    "accesoRestringido", true,
                    "error", "Por políticas de privacidad y seguridad del hotel, como huésped únicamente puede consultar el detalle de sus propias reservaciones."
            );
        }
        return mapReservaToMap(r);
    }

    @Tool(description = "Buscar y consultar reservaciones. Si el usuario es ADMINISTRADOR busca en toda la cadena; si es HUESPED consulta únicamente sus propias reservaciones.")
    public List<Map<String, Object>> buscarReservaciones(
            @ToolParam(description = "Criterio de búsqueda: nombre, teléfono, correo, número de habitación, o 'mis reservas'", required = false)
            String criterio,
            @ToolParam(description = "Filtrar por hotel (opcional)", required = false)
            String hotel) {
        log.info("Tool invocada — buscarReservaciones: criterio={}, hotel={}", criterio, hotel);
        CustomUserDetails authUser = HabitacionSearchTool.getAuthenticatedUser();

        List<Reserva> lista;
        if (authUser != null && authUser.getRol() == Rol.HUESPED) {
            // Un huésped NUNCA puede buscar ni ver reservaciones de otros clientes
            lista = reservaRepository.findByUsuarioOrHuespedEmail(authUser.getIdUsuario(), authUser.getEmail());
        } else {
            if (criterio == null || criterio.isBlank()) {
                return List.of(Map.of("error", "Debe ingresar un nombre, teléfono, correo o número de habitación para buscar la reservación."));
            }
            lista = reservaRepository.buscarPorCriterioGeneral(criterio.trim());
        }

        if (hotel != null && !hotel.isBlank()) {
            String hLower = hotel.trim().toLowerCase();
            lista = lista.stream()
                    .filter(r -> r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                            && r.getHabitacion().getHotel().getNombre().toLowerCase().contains(hLower))
                    .toList();
        }

        if (lista.isEmpty()) {
            return List.of(Map.of("mensaje", authUser != null && authUser.getRol() == Rol.HUESPED
                    ? "Actualmente no tiene reservaciones registradas asociadas a su cuenta (" + authUser.getEmail() + ")."
                    : "No se encontraron reservaciones con el criterio '" + criterio + "'."));
        }

        return lista.stream()
                .map(this::mapReservaToMap)
                .toList();
    }

    @Tool(description = "Verificar disponibilidad y cotizar opciones de habitaciones para fechas específicas antes de crear una reservación.")
    public List<Map<String, Object>> cotizarDisponibilidadParaReserva(
            @ToolParam(description = "Nombre del hotel (ej. 'Hotel Paraíso', 'Hotel Paraíso Ejecutivo' o cualquier hotel registrado). Dejar vacío para toda la cadena.", required = false)
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
                idHotel = hotelRepository.findAll().stream()
                        .filter(h -> h.getNombre() != null && h.getNombre().equalsIgnoreCase(exactHotel))
                        .map(Hotel::getIdHotel)
                        .findFirst()
                        .orElse(null);
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

    @Tool(description = "Listar las habitaciones que se encuentran en estado de Pre-reserva o Pendientes de pago de anticipo.")
    public List<Map<String, Object>> findHabitacionesEnPreReserva(
            @ToolParam(description = "Nombre del hotel (opcional). Déjelo vacío para consultar en todos los hoteles.", required = false)
            String hotel) {

        log.info("Tool invocada — findHabitacionesEnPreReserva: hotel={}", hotel);
        CustomUserDetails authUser = HabitacionSearchTool.getAuthenticatedUser();
        String exactHotel = HabitacionSearchTool.resolverNombreHotelExacto(hotel);

        List<Reserva> lista = (exactHotel != null)
                ? reservaRepository.findPreReservasActivasEnHotel(exactHotel)
                : reservaRepository.findPreReservasActivas();

        if (authUser != null && authUser.getRol() == Rol.HUESPED) {
            lista = lista.stream()
                    .filter(r -> perteneceAHuespedActual(r, authUser))
                    .toList();
        }

        if (lista.isEmpty()) {
            return List.of(Map.of(
                    "mensaje", authUser != null && authUser.getRol() == Rol.HUESPED
                            ? "Usted no tiene pre-reservas pendientes de pago en este momento."
                            : "No hay habitaciones en estado de Pre-reserva actualmente" +
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
