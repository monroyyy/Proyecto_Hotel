package com.ico.hotel.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ico.hotel.config.ClientResolver;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.repository.UsuarioRepository;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.tools.HabitacionSearchTool;
import com.ico.hotel.tools.HotelPolicyTool;
import com.ico.hotel.tools.HotelSearchTool;
import com.ico.hotel.tools.ReservaTool;
import com.ico.hotel.tools.TipoHabitacionTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class HotelChatServiceImpl implements HotelChatService {

    public static final String DEFAULT_CONVERSATION_ID = "recepcion-general";

    private final ClientResolver clientResolver;
    private final HabitacionSearchTool habitacionSearchTool;
    private final HotelSearchTool hotelSearchTool;
    private final TipoHabitacionTool tipoHabitacionTool;
    private final HotelPolicyTool hotelPolicyTool;
    private final ReservaTool reservaTool;
    private final DashboardService dashboardService;
    private final UsuarioRepository usuarioRepository;
    private final ReservaRepository reservaRepository;
    private final ChatMemory chatMemory;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private CustomUserDetails obtenerUsuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        return null;
    }

    private String obtenerSaludoPorRol(CustomUserDetails user) {
        if (user != null && user.getRol() == Rol.HUESPED) {
            return "¡Hola, **" + user.getNombre() + "**! Bienvenido a **Hotel Paraíso**. Soy su Concierge Virtual de toda nuestra cadena.\n\n" +
                   "Como huésped, con gusto le asisto con:\n" +
                   "- Consulta de **hoteles activos** y destinos de nuestra cadena.\n" +
                   "- Consulta de **habitaciones disponibles**, categorías y tarifas por noche.\n" +
                   "- Cotización y registro de **sus reservaciones** (en modalidad Pre-reserva).\n" +
                   "- Consulta del estado de **sus propias reservaciones** y políticas oficiales de estancia (check-in/check-out, anticipos y cancelaciones).\n\n" +
                   "¿En qué puedo servirle hoy?";
        }
        if (user != null && user.getRol() == Rol.GERENTE) {
            return "¡Hola, **" + user.getNombre() + "**! Panel Gerencial de **Concierge Virtual** activo (Modo **GERENTE**).\n\n" +
                   "Tiene acceso completo a análisis estadístico, métricas financieras (ADR, RevPAR, ocupación histórica 2020–2026), balances de caja, usuarios registrados, reportes ejecutivos y **generación de gráficas interactivas** dentro del chat.\n\n" +
                   "¿Qué análisis, gráfica o reporte desea consultar?";
        }
        if (user != null && user.getRol() == Rol.RECEPCIONISTA) {
            return "¡Hola, **" + user.getNombre() + "**! Panel Operativo de **Mostrador y Recepción** activo (Modo **RECEPCIONISTA**).\n\n" +
                   "Tiene acceso a consulta de disponibilidad en tiempo real, registro de reservaciones, validación de anticipos y estatus de habitaciones.\n\n" +
                   "¿Qué gestión de recepción requiere realizar?";
        }
        String adminNombre = user != null ? user.getNombre() : "Administrador";
        return "¡Hola, **" + adminNombre + "**! Panel Técnico de **Concierge Virtual** activo (Modo **ADMINISTRADOR**).\n\n" +
               "Tiene acceso a consultas operativas de inventario, hoteles, habitaciones, categorías y estados de cuartos de toda la cadena. *(Nota: El Dashboard, Informes, Gestión de Usuarios y toda la información monetaria del hotel son exclusivos del Gerente General)*.\n\n" +
               "¿Qué consulta técnica o de inventario desea realizar?";
    }

    private String construirContextoSeguridadPrompt(CustomUserDetails user, String promptOriginal) {
        String resumenRapido = construirSnapshotCompacto(user);
        if (user == null) {
            return resumenRapido + "\n\nPregunta del usuario: " + promptOriginal;
        }
        if (user.getRol() == Rol.HUESPED) {
            return "[SESIÓN: HUESPED | Nombre: " + user.getNombre() + " | Email: " + user.getEmail() +
                   " | Solo puede consultar disponibilidad, tarifas públicas y sus propias reservaciones en modalidad Pre-reserva.]\n" +
                   resumenRapido + "\n\nPregunta del huésped: " + promptOriginal;
        }
        if (user.getRol() == Rol.GERENTE) {
            return "[SESIÓN: GERENTE GENERAL | Usuario: " + user.getNombre() +
                   " | Acceso ejecutivo total a finanzas, métricas, inventario, reservaciones y usuarios.]\n" +
                   resumenRapido + "\n\nPregunta del gerente: " + promptOriginal;
        }
        if (user.getRol() == Rol.RECEPCIONISTA) {
            return "[SESIÓN: RECEPCIONISTA | Usuario: " + user.getNombre() +
                   " | Acceso operativo a recepción, disponibilidad, tarifas y reservaciones.]\n" +
                   resumenRapido + "\n\nPregunta de recepción: " + promptOriginal;
        }
        return "[SESIÓN: ADMINISTRADOR | Usuario: " + user.getNombre() +
               " | Acceso técnico a inventario de hoteles, habitaciones y estados. PROHIBIDO mostrar montos monetarios, precios, ingresos o usuarios.]\n" +
               resumenRapido + "\n\nPregunta del administrador: " + promptOriginal;
    }

    /**
     * Resumen ultraligero del estado real del hotel para que Ollama responda preguntas abiertas
     * en 1 sola pasada rápida (~2-3 segundos) sin necesidad de serializar 45 herramientas JSON.
     */
    private String construirSnapshotCompacto(CustomUserDetails user) {
        try {
            boolean ocultarPrecios = user != null && user.getRol() == Rol.ADMINISTRADOR;
            List<Hotel> hoteles = hotelSearchTool.getHotelesActivos();
            String nombresHoteles = hoteles.stream()
                    .map(h -> h.getNombre() + " (" + h.getCiudad() + ")")
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("Hotel Paraíso");
            habitacionSearchTool.resetCallTracker();
            Map<String, List<String>> porHotel = new LinkedHashMap<>();
            for (Map<String, Object> r : habitacionSearchTool.findHabitacionesPorHotel(null)) {
                if (r.get("hotel") == null) continue;
                String tipo = String.valueOf(r.get("tipo"));
                String item = ocultarPrecios ? tipo : tipo + " " + fmtMoneda(r.get("precioBase"));
                List<String> l = porHotel.computeIfAbsent(String.valueOf(r.get("hotel")), k -> new ArrayList<>());
                if (!l.contains(item)) l.add(item);
            }
            habitacionSearchTool.resetCallTracker();
            StringBuilder inv = new StringBuilder();
            porHotel.forEach((h, l) -> inv.append(h).append(" SOLO tiene: ").append(String.join(", ", l)).append(". "));
            String resumenCats = inv.toString().trim();
            return "[DATOS ACTUALES DE LA CADENA: Hoteles activos: " + nombresHoteles +
                   ". INVENTARIO REAL (cada hotel solo ofrece lo listado, NUNCA cruces hoteles con categorías): " + resumenCats +
                   ". Check-in: 15:00 hrs, Check-out: 12:00 hrs. Anticipo obligatorio: 50%. Vigencia pre-reserva: 24-48 hrs. " +
                   "Cancelación: >72h = 100% reembolso, 48-72h = 50% reembolso, <48h = 0% reembolso. No-Show: 22:00 hrs. " +
                   "REGLA CRÍTICA: NUNCA cobres, proceses pagos ni pidas datos de tarjeta o cuenta bancaria; el asistente solo registra Pre-reservas. " +
                   "Responde directo al usuario en español sin usar encabezados como 'Respuesta al usuario:'.]";
        } catch (Exception e) {
            return "";
        }
    }

    /** Contexto SOLO para el mensaje de sistema (no se guarda en la memoria de chat). */
    private String construirContextoSistema(CustomUserDetails user, String hotelEnContexto) {
        String s = construirContextoSeguridadPrompt(user, "\u0000");
        int i = s.indexOf("\n\nPregunta");
        if (i > 0) s = s.substring(0, i);
        if (hotelEnContexto != null) {
            s += "\nHOTEL ACTIVO EN LA CONVERSACIÓN: " + hotelEnContexto +
                 ". Si el usuario pide habitaciones, precios o disponibilidad sin nombrar hotel, se refiere a este hotel.";
        }
        return s;
    }

    private void guardarTurnoEnMemoria(String convId, String userText, String botText) {
        try {
            chatMemory.add(convId, List.of(new UserMessage(userText), new AssistantMessage(botText)));
        } catch (Exception e) {
            log.warn("No se pudo guardar turno en memoria: {}", e.getMessage());
        }
    }

    private String detectarHotelEnTexto(String norm) {
        if (norm == null) return null;
        if (norm.contains("ejecutivo") || norm.contains("ciudad de mexico") || norm.contains("cdmx")) return "Hotel Paraíso Ejecutivo";
        if (norm.contains("uaem") || norm.contains("atlacomulco")) return "Hotel UAEM";
        if (norm.contains("arcos") || norm.contains("guadalajara")) return "Hotel Los Arcos";
        if (norm.contains("costa azul") || norm.contains("acapulco")) return "Hotel Costa Azul";
        if (norm.contains("cancun") || norm.contains("paraiso")) return "Hotel Paraíso";
        return null;
    }

    private String resolverHotelEnContexto(String prompt, String convId) {
        String norm = normalizarTexto(prompt);
        if (norm.contains("todos los hoteles") || norm.contains("toda la cadena") || norm.contains("ambos")) return null;
        String h = detectarHotelEnTexto(norm);
        if (h != null) return h;
        try {
            List<Message> hist = chatMemory.get(convId);
            for (int i = hist.size() - 1; i >= 0; i--) {
                Message m = hist.get(i);
                if (m.getMessageType() != MessageType.USER) continue;
                String t = normalizarTexto(m.getText());
                if (t.contains("todos los hoteles") || t.contains("toda la cadena")) return null;
                String d = detectarHotelEnTexto(t);
                if (d != null) return d;
            }
        } catch (Exception e) {
            log.warn("No se pudo leer memoria: {}", e.getMessage());
        }
        return null;
    }

    private List<Map<String, Object>> habitacionesDeHotel(String hotel) {
        habitacionSearchTool.resetCallTracker();
        // Se filtra por nombre EXACTO: "Hotel Paraíso" es subcadena de "Hotel Paraíso Ejecutivo"
        List<Map<String, Object>> rooms = habitacionSearchTool.findHabitacionesPorHotel(null);
        habitacionSearchTool.resetCallTracker();
        String objetivo = normalizarTexto(hotel);
        return rooms.stream().filter(r -> r.get("numero") != null
                && normalizarTexto(String.valueOf(r.get("hotel"))).equals(objetivo)).toList();
    }

    private String tablaHabitacionesHotel(String hotel, boolean esAdmin, String intro) {
        return tablaHabitacionesHotel(hotel, esAdmin, intro, habitacionesDeHotel(hotel));
    }

    private String tablaHabitacionesHotel(String hotel, boolean esAdmin, String intro, List<Map<String, Object>> rooms) {
        String nombre = rooms.isEmpty() ? hotel : String.valueOf(rooms.get(0).get("hotel"));
        String ciudad = rooms.isEmpty() ? "" : String.valueOf(rooms.get(0).get("ciudad"));
        StringBuilder sb = new StringBuilder(intro).append("\n\n");
        if (rooms.isEmpty()) {
            return sb.append("Por el momento **").append(nombre).append("** no tiene habitaciones disponibles para mostrar.").toString();
        }
        sb.append("### ").append(nombre).append(" · ").append(ciudad).append("\n\n");
        sb.append(esAdmin ? "| Habitación | Piso | Categoría | Estado |\n| :---: | :---: | :--- | :---: |\n"
                          : "| Habitación | Piso | Categoría | Tarifa / Noche | Estado |\n| :---: | :---: | :--- | ---: | :---: |\n");
        for (Map<String, Object> r : rooms) {
            sb.append("| #").append(r.get("numero")).append(" | ").append(r.get("piso")).append(" | ").append(r.get("tipo"));
            if (!esAdmin) sb.append(" | **").append(fmtMoneda(r.get("precioBase"))).append("**");
            sb.append(" | ").append(r.get("estado")).append(" |\n");
        }
        return sb.append("\n¿Desea cotizar o apartar una de estas habitaciones? Indíqueme fechas de entrada y salida.").toString();
    }

    private Map<String, Object> habitacionMencionada(String texto, List<Map<String, Object>> rooms) {
        String norm = normalizarTexto(texto);
        for (Map<String, Object> r : rooms) {
            String num = normalizarTexto(String.valueOf(r.get("numero")));
            if (!num.isBlank() && Pattern.compile("(^| )" + Pattern.quote(num) + "( |$)").matcher(norm).find()) return r;
        }
        return null;
    }

    private Map<String, Object> habitacionEnContexto(String prompt, String convId, List<Map<String, Object>> rooms) {
        Map<String, Object> m = habitacionMencionada(prompt, rooms);
        if (m != null) return m;
        try {
            List<Message> hist = chatMemory.get(convId);
            for (int i = hist.size() - 1; i >= 0; i--) {
                if (hist.get(i).getMessageType() != MessageType.USER) continue;
                m = habitacionMencionada(hist.get(i).getText(), rooms);
                if (m != null) return m;
            }
        } catch (Exception ignored) {}
        return rooms.size() == 1 ? rooms.get(0) : null;
    }

    /** Calendario real de ocupación/disponibilidad de una habitación a partir de hoy (desde la BD, nunca inventado). */
    private String calendarioHabitacion(String hotel, Map<String, Object> room) {
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("d 'de' MMMM yyyy", Locale.forLanguageTag("es-MX"));
        LocalDate hoy = LocalDate.now();
        String num = String.valueOf(room.get("numero"));
        List<Reserva> rs = reservaRepository.findActivasPorHabitacionYHotel(num, hotel).stream()
                .filter(r -> r.getFechaEntrada() != null && r.getFechaSalida() != null && r.getFechaSalida().isAfter(hoy))
                .filter(r -> r.getHabitacion() != null && r.getHabitacion().getHotel() != null
                        && hotel.equalsIgnoreCase(r.getHabitacion().getHotel().getNombre()))
                .sorted(Comparator.comparing(Reserva::getFechaEntrada)).toList();
        StringBuilder sb = new StringBuilder();
        sb.append("### Habitación #").append(num).append(" · ").append(room.get("tipo")).append(" · ").append(hotel).append("\n\n");
        boolean mant = "Mantenimiento".equalsIgnoreCase(String.valueOf(room.get("estado")));
        if (mant) sb.append("*Actualmente en mantenimiento: no se puede reservar hasta que Recepción la libere.*\n\n");
        sb.append("| Periodo | Estado |\n| :--- | :---: |\n");
        LocalDate cursor = hoy;
        for (Reserva r : rs) {
            if (r.getFechaEntrada().isAfter(cursor)) {
                sb.append("| ").append(cursor.format(f)).append(" → ").append(r.getFechaEntrada().format(f)).append(" | **Disponible** |\n");
            }
            sb.append("| ").append(r.getFechaEntrada().format(f)).append(" → ").append(r.getFechaSalida().format(f)).append(" | Ocupada / Reservada |\n");
            if (r.getFechaSalida().isAfter(cursor)) cursor = r.getFechaSalida();
        }
        sb.append("| ").append(cursor.format(f)).append(" en adelante | **Disponible** |\n");
        sb.append("\nEl día de salida de una reservación queda libre para una nueva entrada. ¿Desea reservar? Indíqueme fecha de entrada y salida.");
        return sb.toString();
    }

    private static final Map<String, Integer> MESES_ES = Map.ofEntries(
            Map.entry("enero", 1), Map.entry("febrero", 2), Map.entry("marzo", 3), Map.entry("abril", 4),
            Map.entry("mayo", 5), Map.entry("junio", 6), Map.entry("julio", 7), Map.entry("agosto", 8),
            Map.entry("septiembre", 9), Map.entry("setiembre", 9), Map.entry("octubre", 10),
            Map.entry("noviembre", 11), Map.entry("diciembre", 12)
    );

    private LocalDate[] extraerRangoFechas(String norm) {
        if (norm == null) return null;
        // 1. ISO: 2026 12 05
        List<LocalDate> isos = new ArrayList<>();
        Matcher mIso = Pattern.compile("\\b(202[5-9])\\s+(\\d{1,2})\\s+(\\d{1,2})\\b").matcher(norm);
        while (mIso.find()) {
            try {
                isos.add(LocalDate.of(Integer.parseInt(mIso.group(1)), Integer.parseInt(mIso.group(2)), Integer.parseInt(mIso.group(3))));
            } catch (Exception ignored) {}
        }
        if (!isos.isEmpty()) {
            LocalDate ini = isos.get(0);
            LocalDate fin = isos.size() > 1 && isos.get(1).isAfter(ini) ? isos.get(1) : ini.plusDays(1);
            return new LocalDate[]{ini, fin};
        }
        // 2. Rango en español: "del 10 al 15 de diciembre [2026]"
        Matcher mRango = Pattern.compile("\\b(\\d{1,2})\\s+al\\s+(\\d{1,2})\\s+de\\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\\s+(?:de\\s+)?(202[5-9]))?\\b").matcher(norm);
        if (mRango.find()) {
            int d1 = Integer.parseInt(mRango.group(1)), d2 = Integer.parseInt(mRango.group(2));
            int mes = MESES_ES.get(mRango.group(3));
            int ano = mRango.group(4) != null ? Integer.parseInt(mRango.group(4)) : LocalDate.now().getYear();
            try {
                LocalDate ini = LocalDate.of(ano, mes, d1);
                if (mRango.group(4) == null && ini.isBefore(LocalDate.now())) ini = ini.plusYears(1);
                LocalDate fin = LocalDate.of(ini.getYear(), mes, d2);
                if (!fin.isAfter(ini)) fin = ini.plusMonths(1);
                return new LocalDate[]{ini, fin};
            } catch (Exception ignored) {}
        }
        // 3. Fecha única en español: "5 de diciembre [2026]"
        Matcher mUnica = Pattern.compile("\\b(\\d{1,2})\\s+de\\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\\s+(?:de\\s+)?(202[5-9]))?\\b").matcher(norm);
        if (mUnica.find()) {
            int d = Integer.parseInt(mUnica.group(1));
            int mes = MESES_ES.get(mUnica.group(2));
            int ano = mUnica.group(3) != null ? Integer.parseInt(mUnica.group(3)) : LocalDate.now().getYear();
            try {
                LocalDate ini = LocalDate.of(ano, mes, d);
                if (mUnica.group(3) == null && ini.isBefore(LocalDate.now())) ini = ini.plusYears(1);
                return new LocalDate[]{ini, ini.plusDays(1)};
            } catch (Exception ignored) {}
        }
        return null;
    }

    private String disponibilidadEnRango(String hotelFiltro, LocalDate entrada, LocalDate salida, boolean esAdmin) {
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("d 'de' MMMM yyyy", Locale.forLanguageTag("es-MX"));
        habitacionSearchTool.resetCallTracker();
        List<Map<String, Object>> todas = habitacionSearchTool.findHabitacionesPorHotel(null);
        habitacionSearchTool.resetCallTracker();
        List<Map<String, Object>> candidatas = todas.stream()
                .filter(r -> r.get("numero") != null)
                .filter(r -> !"Mantenimiento".equalsIgnoreCase(String.valueOf(r.get("estado"))))
                .filter(r -> hotelFiltro == null || normalizarTexto(String.valueOf(r.get("hotel"))).equals(normalizarTexto(hotelFiltro)))
                .toList();
        List<Map<String, Object>> libres = new ArrayList<>();
        for (Map<String, Object> r : candidatas) {
            String hNom = String.valueOf(r.get("hotel"));
            String num = String.valueOf(r.get("numero"));
            boolean traslape = reservaRepository.findActivasPorHabitacionYHotel(num, hNom).stream()
                    .filter(res -> res.getHabitacion() != null && res.getHabitacion().getHotel() != null
                            && hNom.equalsIgnoreCase(res.getHabitacion().getHotel().getNombre()))
                    .anyMatch(res -> res.getFechaEntrada() != null && res.getFechaSalida() != null
                            && res.getFechaEntrada().isBefore(salida) && res.getFechaSalida().isAfter(entrada));
            if (!traslape) libres.add(r);
        }
        String titulo = hotelFiltro != null ? hotelFiltro : "Toda la cadena";
        StringBuilder sb = new StringBuilder();
        sb.append("### Disponibilidad del ").append(entrada.format(f)).append(" al ").append(salida.format(f))
          .append(" — ").append(titulo).append("\n\n");
        if (libres.isEmpty()) {
            return sb.append("No hay habitaciones disponibles para esas fechas en **").append(titulo).append("**.").toString();
        }
        sb.append(esAdmin ? "| Propiedad | Habitación | Piso | Categoría |\n| :--- | :---: | :---: | :--- |\n"
                          : "| Propiedad | Habitación | Piso | Categoría | Tarifa / Noche |\n| :--- | :---: | :---: | :--- | ---: |\n");
        for (Map<String, Object> r : libres) {
            sb.append("| **").append(r.get("hotel")).append("** | #").append(r.get("numero"))
              .append(" | ").append(r.get("piso")).append(" | ").append(r.get("tipo"));
            if (!esAdmin) sb.append(" | **").append(fmtMoneda(r.get("precioBase"))).append("**");
            sb.append(" |\n");
        }
        return sb.append("\n¿Desea apartar alguna de estas opciones?").toString();
    }

    private String aislarConversationIdPorUsuario(CustomUserDetails user, String conversationId) {
        String baseId = (conversationId != null && !conversationId.isBlank()) ? conversationId : DEFAULT_CONVERSATION_ID;
        if (user == null) {
            return baseId;
        }
        return "usr-" + user.getIdUsuario() + "-" + user.getRol().name() + "-" + baseId;
    }

    private String normalizarTexto(String text) {
        if (text == null) return "";
        return java.text.Normalizer.normalize(text.trim().toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean isGreetingOrIntro(String text) {
        if (text == null || text.isBlank()) return false;
        String normalized = normalizarTexto(text);

        String[] domainKeywords = {
                "habitacion", "habitaciones", "cuarto", "cuartos", "hotel", "hoteles",
                "precio", "precios", "costo", "costos", "tarifa", "tarifas", "disponib",
                "ocupad", "mantenimiento", "piso", "reserv", "cancel", "check", "politica",
                "anticipo", "presupuesto", "cara", "barat", "suite", "individual", "doble",
                "matrimonial", "familiar", "reembolso", "llegada", "salida", "paraiso", "ejecutivo",
                "pago", "desayuno", "estacionamiento", "limpieza", "grafica", "metricas", "financier",
                "ingreso", "ingresos", "compar", "estacionalidad", "usuario", "usuarios", "cuenta", "cuentas",
                "huesped", "huespedes", "personal", "staff", "rol", "roles"
        };
        for (String kw : domainKeywords) {
            if (normalized.contains(kw)) {
                return false;
            }
        }

        String[] greetingIntents = {
                "hola", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "buenas",
                "que tal", "como estas", "como te va", "saludos", "hey", "hello", "hi",
                "quien eres", "que puedes hacer", "en que me puedes ayudar", "como me puedes ayudar",
                "que sabes hacer", "ayuda", "hola una pregunta", "hola tengo una duda",
                "hola una consulta", "hola disculpa", "hola me puedes ayudar", "hola me ayudas",
                "hola recepcionista", "buen dia recepcionista", "buenos dias recepcionista",
                "buenas tardes recepcionista", "buenas noches recepcionista"
        };

        for (String g : greetingIntents) {
            if (normalized.equals(g) || normalized.startsWith(g + " ") || normalized.endsWith(" " + g) || normalized.contains(" " + g + " ")) {
                return true;
            }
        }

        return false;
    }

    private String fmtMoneda(Object val) {
        double d = 0.0;
        if (val instanceof Number n) {
            d = n.doubleValue();
        } else if (val != null) {
            try {
                d = Double.parseDouble(val.toString().replaceAll("[^0-9.-]", ""));
            } catch (Exception ignored) {}
        }
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.US);
        nf.setMinimumFractionDigits(2);
        nf.setMaximumFractionDigits(2);
        return "$" + nf.format(d) + " MXN";
    }

    private List<Integer> extraerAnos(String norm) {
        List<Integer> anos = new ArrayList<>();
        Matcher m = Pattern.compile("\\b(202[0-6])\\b").matcher(norm);
        while (m.find()) {
            int y = Integer.parseInt(m.group(1));
            if (!anos.contains(y)) {
                anos.add(y);
            }
        }
        return anos;
    }

    private String construirBloqueChart(String title, String subtitle, String type, String unit,
                                        List<String> labels, List<Map<String, Object>> series) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("title", title);
            payload.put("subtitle", subtitle);
            payload.put("type", type);
            payload.put("unit", unit);
            payload.put("labels", labels);
            payload.put("series", series);
            return "\n\n```chart\n" + objectMapper.writeValueAsString(payload) + "\n```\n";
        } catch (Exception e) {
            log.warn("No se pudo serializar bloque chart: {}", e.getMessage());
            return "";
        }
    }

    private int ordenJerarquiaRol(Rol rol) {
        if (rol == null) return 99;
        return switch (rol) {
            case GERENTE -> 0;
            case ADMINISTRADOR -> 1;
            case RECEPCIONISTA -> 2;
            case HUESPED -> 3;
        };
    }

    private String etiquetaRolHumana(Rol rol) {
        if (rol == null) return "Sin rol";
        return switch (rol) {
            case GERENTE -> "Gerente";
            case ADMINISTRADOR -> "Administrador";
            case RECEPCIONISTA -> "Recepción";
            case HUESPED -> "Huésped";
        };
    }

    /**
     * Motor determinístico de baja latencia (<25ms) para consultas financieras, gráficas de Gerencia,
     * usuarios registrados, reservaciones, políticas oficiales e inventario operativo.
     */
    @SuppressWarnings("unchecked")
    private String resolverConsultaDirecta(String prompt, CustomUserDetails user, String scopedConvId) {
        if (prompt == null || prompt.isBlank()) return null;
        String norm = normalizarTexto(prompt);
        Rol rol = user != null ? user.getRol() : null;
        boolean esGerente = rol == Rol.GERENTE;
        boolean esAdmin = rol == Rol.ADMINISTRADOR;
        boolean esHuesped = rol == Rol.HUESPED;

        // 0. Flujo guiado de nueva reservación
        if (norm.equals("quiero hacer una reservacion") || norm.equals("hacer una reservacion") || norm.equals("reservar habitacion")) {
            if (esHuesped) {
                return "Con mucho gusto le asisto con el registro de su **Pre-reserva** (apartado temporal con vigencia de 24 a 48 horas).\n\n" +
                       "Para cotizar y generar su folio, por favor indíqueme los siguientes datos:\n" +
                       "1. **Hotel y número de habitación** (o categoría deseada).\n" +
                       "2. **Fecha de entrada y fecha de salida** (`AAAA-MM-DD`).\n" +
                       "3. **Número de adultos y niños**.\n" +
                       "4. **Teléfono celular a 10 dígitos**.\n\n" +
                       "*(Su nombre y correo verificado se tomarán automáticamente de su cuenta).*";
            }
            return "Para registrar una nueva reservación desde este asistente, por favor proporcione los datos obligatorios:\n\n" +
                   "- **Hotel y número de habitación** (ej. Hotel Paraíso, Hab. #101)\n" +
                   "- **Fechas de entrada y salida** (`AAAA-MM-DD`)\n" +
                   "- **Nombre completo, correo electrónico y teléfono a 10 dígitos** del titular\n" +
                   "- **Cantidad de adultos y niños**\n" +
                   "- **Modalidad** (`PRE_RESERVA` o `CONFIRMADA` con anticipo del 50%)";
        }

        if (norm.equals("consultar reservacion") || norm.equals("buscar reservacion")) {
            return "Para consultar una reservación en tiempo real, por favor indíqueme el **folio oficial** (ej. `HP-2026-00786`), el **nombre del titular** o el **correo electrónico** registrado.";
        }

        // 0A. Bloqueo de cobro / solicitud de pago en el chat (la IA solo registra Pre-reservas)
        boolean pidePagar = (norm.contains("realizar el pago") || norm.contains("hacer el pago")
                || norm.contains("quiero pagar") || norm.contains("como pago") || norm.contains("pagar mi")
                || norm.contains("pagar la") || norm.contains("pagar el") || norm.contains("efectuar el pago")
                || norm.contains("pagar anticipo") || norm.contains("cobrame") || norm.contains("cobrarme")
                || norm.equals("pagar") || norm.equals("pago"))
                && !norm.contains("recaudacion") && !norm.contains("grafica") && !norm.contains("desglose");
        if (pidePagar) {
            return "Por seguridad, este asistente virtual **no procesa pagos ni solicita datos de tarjeta o cuentas bancarias**.\n\n" +
                   "A través del chat únicamente se registra la **Pre-reserva** (apartado temporal con vigencia de 24 a 48 horas). Para confirmar su estancia con el **50% de anticipo**, realice el pago directamente en **Recepción** o consulte las instrucciones de depósito desde **Mis Reservaciones** usando su folio oficial.";
        }

        // 0B. Consulta de Usuarios Registrados / Cuentas del Sistema / Roles
        if (norm.contains("usuario") || norm.contains("usuarios") || norm.contains("cuentas registradas")
                || norm.contains("personal registrado") || norm.contains("roles registrados")) {
            if (!esGerente) {
                return "Por políticas de seguridad y control de accesos de **Hotel Paraíso**, el directorio de **Usuarios Registrados** y cuentas del sistema es de acceso **exclusivo para el Gerente General**.";
            }
            List<Usuario> usuarios = new ArrayList<>(usuarioRepository.findAllByOrderByFechaCreacionDesc());
            usuarios.sort(Comparator
                    .comparingInt((Usuario u) -> ordenJerarquiaRol(u.getRol()))
                    .thenComparing(u -> u.getNombre() != null ? u.getNombre().toLowerCase(Locale.ROOT) : ""));

            long cGerente = usuarios.stream().filter(u -> u.getRol() == Rol.GERENTE).count();
            long cAdmin = usuarios.stream().filter(u -> u.getRol() == Rol.ADMINISTRADOR).count();
            long cRecep = usuarios.stream().filter(u -> u.getRol() == Rol.RECEPCIONISTA).count();
            long cHuesped = usuarios.stream().filter(u -> u.getRol() == Rol.HUESPED).count();
            long cActivos = usuarios.stream().filter(u -> Boolean.TRUE.equals(u.getActivo())).count();
            long cVerificados = usuarios.stream().filter(u -> Boolean.TRUE.equals(u.getVerificado())).count();

            StringBuilder sb = new StringBuilder();
            sb.append("### Directorio de Usuarios Registrados (").append(usuarios.size()).append(" cuentas)\n\n");
            sb.append("- **Gerencia General:** ").append(cGerente)
              .append(" · **Administración:** ").append(cAdmin)
              .append(" · **Recepción:** ").append(cRecep)
              .append(" · **Huéspedes:** ").append(cHuesped).append("\n");
            sb.append("- **Cuentas activas:** ").append(cActivos).append(" de ").append(usuarios.size())
              .append(" (Verificadas: ").append(cVerificados).append(")\n\n");

            sb.append("| Nombre | Correo Electrónico | Rol | Estado | Verificación |\n");
            sb.append("| :--- | :--- | :---: | :---: | :---: |\n");
            int limite = Math.min(usuarios.size(), 25);
            for (int i = 0; i < limite; i++) {
                Usuario u = usuarios.get(i);
                sb.append("| **").append(u.getNombre()).append("** | ")
                  .append(u.getEmail()).append(" | ")
                  .append(etiquetaRolHumana(u.getRol())).append(" | ")
                  .append(Boolean.TRUE.equals(u.getActivo()) ? "Activo" : "Inactivo").append(" | ")
                  .append(Boolean.TRUE.equals(u.getVerificado()) ? "Verificado" : "Pendiente").append(" |\n");
            }
            if (usuarios.size() > limite) {
                sb.append("\n*Mostrando las primeras ").append(limite).append(" cuentas ordenadas por jerarquía de rol (`Gerente → Administrador → Recepción → Huéspedes`).*");
            }

            sb.append(construirBloqueChart(
                    "Distribución de Usuarios por Rol",
                    "Total: " + usuarios.size() + " cuentas registradas en el sistema",
                    "bar",
                    "number",
                    List.of("Gerente", "Administrador", "Recepción", "Huéspedes"),
                    List.of(Map.of(
                            "name", "Cuentas",
                            "color", "#16324f",
                            "data", List.of((double) cGerente, (double) cAdmin, (double) cRecep, (double) cHuesped)
                    ))
            ));
            return sb.toString();
        }

        // 0C. Búsqueda directa por folio HP-XXXX-XXXXX
        Matcher mFolio = Pattern.compile("\\b(hp-[a-z0-9]+-\\d+)\\b", Pattern.CASE_INSENSITIVE).matcher(prompt);
        if (mFolio.find()) {
            String folio = mFolio.group(1).toUpperCase(Locale.ROOT);
            Map<String, Object> res = reservaTool.consultarReservacionPorFolio(folio);
            if (res.containsKey("error")) {
                return String.valueOf(res.get("error"));
            }
            StringBuilder sb = new StringBuilder();
            sb.append("### Detalle de Reservación — Folio ").append(res.get("folio")).append("\n\n");
            sb.append("| Campo | Información |\n");
            sb.append("| :--- | :--- |\n");
            sb.append("| **Folio** | **").append(res.get("folio")).append("** |\n");
            sb.append("| **Estado** | **").append(res.get("estado")).append("** |\n");
            sb.append("| **Propiedad** | ").append(res.get("hotel")).append(" |\n");
            sb.append("| **Habitación** | #").append(res.get("habitacion")).append(" (").append(res.get("tipoHabitacion")).append(") |\n");
            sb.append("| **Huésped Titular** | ").append(res.get("titular")).append(" |\n");
            sb.append("| **Estancia** | ").append(res.get("fechaEntrada")).append(" → ").append(res.get("fechaSalida")).append(" (").append(res.get("noches")).append(" noches) |\n");
            if (!esAdmin) {
                sb.append("| **Total** | **").append(res.get("total")).append("** |\n");
                sb.append("| **Anticipo Pagado** | ").append(res.get("anticipoPagado")).append(" |\n");
                sb.append("| **Saldo Pendiente** | ").append(res.get("saldoPendiente")).append(" |\n");
            }
            return sb.toString();
        }

        // 1. POLÍTICAS OFICIALES DE LA CADENA
        if (norm.contains("cancelacion") || norm.contains("reembolso") || (norm.contains("cancelar") && (norm.contains("horas") || norm.contains("anticipo") || norm.contains("porcentaje")))) {
            if (norm.contains("50 horas")) {
                return "Para una cancelación solicitada con **50 horas de anticipación** (ubicada en el tramo de **48 a 72 horas** antes del Check-in), aplica un reembolso de **únicamente el 50% del anticipo** pagado (reteniéndose el otro 50% por concepto de penalización comercial).\n\n" +
                       "**Requisitos obligatorios para tramitar el reembolso:**\n" +
                       "- Nombre completo del titular de la cuenta bancaria.\n" +
                       "- Institución bancaria.\n" +
                       "- Cuenta **CLABE interbancaria** a 18 dígitos.\n" +
                       "- Autorización de la Gerencia General (Don Roberto).";
            }
            return "### Política Oficial de Cancelación y Reembolsos\n\n" +
                   "| Anticipación al Check-in (15:00 hrs) | Reembolso del Anticipo | Penalización Retenida |\n" +
                   "| :--- | :---: | :---: |\n" +
                   "| **Más de 72 horas** (4 días o más) | **100%** | 0% |\n" +
                   "| **Entre 48 y 72 horas** (ej. 50 h, 60 h) | **50%** | 50% |\n" +
                   "| **Menos de 48 horas** (o mismo día) | **0%** | 100% |\n\n" +
                   "**Requisitos para reembolso:** Nombre del titular, banco, cuenta **CLABE interbancaria** (18 dígitos) y autorización de Gerencia General.";
        }

        if ((norm.contains("vigencia") || norm.contains("cuanto tiempo") || norm.contains("tolerancia") || norm.contains("plazo") || norm.contains("dura"))
                && (norm.contains("pre reserva") || norm.contains("prereserva") || norm.contains("apartado"))) {
            return "### Vigencia de Pre-reservas Temporales\n\n" +
                   "- **Plazo estricto de garantía:** El cliente dispone de **24 a 48 horas** para realizar el pago del **50% de anticipo** y enviar su comprobante bancario.\n" +
                   "- **Liberación automática:** Si expira el plazo de 24 a 48 horas sin haberse validado el anticipo, la pre-reserva se cancela automáticamente y la habitación se **libera** de inmediato en el inventario.";
        }

        if (norm.contains("no show") || norm.contains("noshow") || (norm.contains("10") && norm.contains("pm") && norm.contains("huesped"))) {
            return "### Protocolo Oficial de Llegadas Tardías y No-Show\n\n" +
                   "- **Monitoreo a las 20:00 hrs (8:00 PM):** Recepción verifica las reservaciones confirmadas pendientes de llegada y contacta telefónicamente al huésped. Si el cliente notifica antes de las 20:00 hrs que viene en camino retrasado, se registra en bitácora y la habitación se protege después de las 22:00 hrs.\n" +
                   "- **Declaración de No-Show a las 22:00 hrs (10:00 PM):** Si el huésped no se presentó, no notificó retraso y no responde llamadas, se declara formalmente **No-Show**, se retiene el **100% del anticipo** como penalización y la habitación se **libera** de inmediato para venta a clientes de paso (**walk-in**).";
        }

        if (norm.contains("sobreventa") || norm.contains("overbooking") || norm.contains("duplicidad")) {
            return "### Protocolo Oficial ante Sobreventa (Overbooking)\n\n" +
                   "1. **Reubicación garantizada:** Se **reubica** de inmediato al huésped en un hotel con **convenio** de categoría igual o superior.\n" +
                   "2. **Traslado cubierto:** Hotel Paraíso absorbe al 100% el costo del traslado en **taxi** de sitio seguro.\n" +
                   "3. **Diferencia tarifaria y cortesía:** El hotel cubre cualquier diferencia de tarifa si el nuevo alojamiento es de mayor precio y otorga una cortesía especial.\n" +
                   "4. **Prioridad de protección:** Los adultos mayores y personas con movilidad reducida tienen prioridad absoluta para conservar su habitación en planta baja.";
        }

        // 2. COTIZACIÓN ESPECÍFICA DE ESTANCIA
        Matcher mCotiza = Pattern.compile("cotizar\\s+(\\d+)\\s+noches?\\s+en\\s+una\\s+habitacion\\s+(individual|doble|matrimonial|familiar|suite)").matcher(norm);
        if (mCotiza.find()) {
            if (esAdmin) {
                return "Por políticas de control interno, el perfil de **Administrador** no tiene acceso a cotizaciones monetarias ni tarifas. Las tarifas e ingresos son visibles únicamente para **Gerencia General** y **Recepción**.";
            }
            int noches = Integer.parseInt(mCotiza.group(1));
            String tipoReq = mCotiza.group(2);
            var catalogo = tipoHabitacionTool.consultarCatalogoCategoriasHabitacion();
            double precioNoche = 850.0;
            String nombreCat = "Habitación Individual";
            for (var cat : catalogo) {
                String cNom = String.valueOf(cat.get("categoria"));
                if (normalizarTexto(cNom).contains(tipoReq)) {
                    nombreCat = cNom;
                    String pStr = String.valueOf(cat.get("precioBasePorNoche")).replaceAll("[^0-9.]", "");
                    try { precioNoche = Double.parseDouble(pStr); } catch (Exception ignored) {}
                    break;
                }
            }
            double total = precioNoche * noches;
            double anticipo = total * 0.5;
            return "### Cotización de Estancia — " + nombreCat + "\n\n" +
                   "| Concepto | Detalle |\n" +
                   "| :--- | ---: |\n" +
                   "| **Categoría** | " + nombreCat + " |\n" +
                   "| **Tarifa por noche** | " + fmtMoneda(precioNoche) + " |\n" +
                   "| **Noches cotizadas** | " + noches + " noches |\n" +
                   "| **Total de la estancia** | **" + fmtMoneda(total) + "** |\n" +
                   "| **Anticipo requerido (50%)** | **" + fmtMoneda(anticipo) + "** |\n\n" +
                   "Para confirmar la reservación se requiere liquidar el **50% de anticipo** (" + fmtMoneda(anticipo) + "); el 50% restante se cubre al realizar el Check-in.";
        }

        // 3. CONSULTAS FINANCIERAS Y GRÁFICAS (EXCLUSIVO PARA GERENTE)
        boolean pideFinanzas = norm.contains("metricas financieras")
                || norm.contains("resumen financiero")
                || norm.contains("desempeno historico")
                || (norm.contains("compara") && (norm.contains("ingreso") || norm.contains("202")))
                || norm.contains("comportamiento mensual")
                || norm.contains("estacionalidad")
                || norm.contains("ingreso potencial")
                || norm.contains("rentan todas las habitaciones")
                || norm.contains("cuentas por cobrar")
                || norm.contains("saldos pendientes")
                || norm.contains("adr")
                || norm.contains("revpar")
                || (norm.contains("grafica") && !norm.contains("mantenimiento"));

        if (pideFinanzas && !esGerente) {
            return "Por políticas de seguridad y control interno de **Hotel Paraíso**, toda la información monetaria, métricas financieras (Ingresos, ADR, RevPAR, balances de caja) y la generación de gráficas ejecutivas son de acceso **exclusivo para el Gerente General**.";
        }

        if (esGerente) {
            // 3A. Ingreso potencial por noche
            if (norm.contains("ingreso potencial") || norm.contains("rentan todas las habitaciones")) {
                Object potencialObj = habitacionSearchTool.sumIngresoPotencial();
                List<Map<String, Object>> habs = habitacionSearchTool.getHabitacionesConTipoYPrecio();
                Map<String, Double> potencialPorHotel = new LinkedHashMap<>();
                Map<String, Integer> cuartosPorHotel = new LinkedHashMap<>();
                for (Map<String, Object> h : habs) {
                    String hot = String.valueOf(h.getOrDefault("hotel", "Hotel Paraíso"));
                    double precio = h.get("precioBase") instanceof Number n ? n.doubleValue() : 0.0;
                    potencialPorHotel.put(hot, potencialPorHotel.getOrDefault(hot, 0.0) + precio);
                    cuartosPorHotel.put(hot, cuartosPorHotel.getOrDefault(hot, 0) + 1);
                }

                StringBuilder sb = new StringBuilder();
                sb.append("### Ingreso Potencial Máximo por Noche (100% Ocupación)\n\n");
                sb.append("Si se rentan simultáneamente todas las habitaciones activas de la cadena, el ingreso potencial diario asciende a **")
                  .append(fmtMoneda(potencialObj)).append("**.\n\n");
                sb.append("| Propiedad / Sede | Habitaciones | Ingreso Potencial / Noche |\n");
                sb.append("| :--- | :---: | ---: |\n");
                List<String> labels = new ArrayList<>();
                List<Double> values = new ArrayList<>();
                for (var entry : potencialPorHotel.entrySet()) {
                    sb.append("| **").append(entry.getKey()).append("** | ")
                      .append(cuartosPorHotel.getOrDefault(entry.getKey(), 0)).append(" | ")
                      .append(fmtMoneda(entry.getValue())).append(" |\n");
                    labels.add(entry.getKey().replace("Hotel ", ""));
                    values.add(entry.getValue());
                }
                sb.append("| **Total Cadena** | **").append(habs.size()).append("** | **").append(fmtMoneda(potencialObj)).append("** |\n");

                List<Map<String, Object>> series = List.of(
                        Map.of("name", "Potencial por Noche", "color", "#2d5a43", "data", values)
                );
                sb.append(construirBloqueChart(
                        "Ingreso Potencial por Noche por Sede",
                        "Capacidad instalada al 100% (MXN)",
                        "bar",
                        "currency",
                        labels,
                        series
                ));
                return sb.toString();
            }

            // 3B. Comparativa entre dos o más años
            List<Integer> anosDetectados = extraerAnos(norm);
            if ((norm.contains("compara") || norm.contains(" vs ") || anosDetectados.size() >= 2)
                    && (norm.contains("ingreso") || norm.contains("ocupacion") || norm.contains("reserva") || norm.contains("desempeno") || norm.contains("grafica") || anosDetectados.size() >= 2)) {
                int ano1 = anosDetectados.size() >= 1 ? anosDetectados.get(0) : 2021;
                int ano2 = anosDetectados.size() >= 2 ? anosDetectados.get(1) : 2025;
                String metrica = norm.contains("ocupacion") ? "ocupacion" : norm.contains("reserva") ? "reservas" : "ingresos";
                String unit = "ocupacion".equals(metrica) ? "percent" : "reservas".equals(metrica) ? "number" : "currency";

                Map<String, Object> comp = dashboardService.obtenerSerieMensualComparativa(List.of(ano1, ano2), null, metrica);
                Map<String, Object> kpi1 = dashboardService.obtenerResumenKpis(ano1, null);
                Map<String, Object> kpi2 = dashboardService.obtenerResumenKpis(ano2, null);

                List<String> meses = (List<String>) comp.getOrDefault("meses", List.of("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"));
                Map<String, List<Double>> seriesMap = (Map<String, List<Double>>) comp.getOrDefault("series", Map.of());
                List<Double> datos1 = seriesMap.getOrDefault(String.valueOf(ano1), Collections.nCopies(12, 0.0));
                List<Double> datos2 = seriesMap.getOrDefault(String.valueOf(ano2), Collections.nCopies(12, 0.0));

                double ing1 = ((Number) kpi1.getOrDefault("ingresosBrutos", 0)).doubleValue();
                double ing2 = ((Number) kpi2.getOrDefault("ingresosBrutos", 0)).doubleValue();
                double diffPct = ing1 > 0 ? Math.round(((ing2 - ing1) / ing1) * 1000.0) / 10.0 : 0.0;

                StringBuilder sb = new StringBuilder();
                sb.append("### Comparativa Ejecutiva ").append(ano1).append(" vs ").append(ano2).append("\n\n");
                sb.append("| Indicador Clave | Ejercicio ").append(ano1).append(" | Ejercicio ").append(ano2).append(" | Variación |\n");
                sb.append("| :--- | ---: | ---: | ---: |\n");
                sb.append("| **Ingresos Brutos** | ").append(fmtMoneda(kpi1.get("ingresosBrutos"))).append(" | **").append(fmtMoneda(kpi2.get("ingresosBrutos"))).append("** | ").append(diffPct >= 0 ? "+" : "").append(diffPct).append("% |\n");
                sb.append("| **Ingresos Netos** | ").append(fmtMoneda(kpi1.get("ingresosNetos"))).append(" | **").append(fmtMoneda(kpi2.get("ingresosNetos"))).append("** | — |\n");
                sb.append("| **Ocupación Anual** | ").append(kpi1.get("ocupacionPorcentaje")).append("% | **").append(kpi2.get("ocupacionPorcentaje")).append("%** | — |\n");
                sb.append("| **Tarifa Promedio (ADR)** | ").append(fmtMoneda(kpi1.get("adr"))).append(" | **").append(fmtMoneda(kpi2.get("adr"))).append("** | — |\n");
                sb.append("| **RevPAR** | ").append(fmtMoneda(kpi1.get("revpar"))).append(" | **").append(fmtMoneda(kpi2.get("revpar"))).append("** | — |\n");
                sb.append("| **Total Reservaciones** | ").append(kpi1.get("totalReservas")).append(" | **").append(kpi2.get("totalReservas")).append("** | — |\n");

                List<Map<String, Object>> chartSeries = List.of(
                        Map.of("name", String.valueOf(ano1), "color", "#16324f", "data", datos1),
                        Map.of("name", String.valueOf(ano2), "color", "#2d5a43", "data", datos2)
                );
                sb.append(construirBloqueChart(
                        "Comparativa Mensual " + ano1 + " vs " + ano2,
                        "Desempeño de " + metrica + " de Enero a Diciembre",
                        "bar",
                        unit,
                        meses,
                        chartSeries
                ));
                return sb.toString();
            }

            // 3C. Gráfica o análisis por Hotel / Sede
            if ((norm.contains("grafica") || norm.contains("rendimiento") || norm.contains("ingresos") || norm.contains("desempeno"))
                    && (norm.contains("por hotel") || norm.contains("por sede") || norm.contains("cada hotel") || norm.contains("sedes"))) {
                int ano = anosDetectados.isEmpty() ? LocalDate.now().getYear() : anosDetectados.get(0);
                List<Map<String, Object>> hotelesPerf = dashboardService.obtenerRendimientoHoteles(ano, false);

                StringBuilder sb = new StringBuilder();
                sb.append("### Desempeño Financiero por Propiedad (").append(ano).append(")\n\n");
                sb.append("| Propiedad | Ciudad | Ingresos Brutos | Ingresos Netos | Ocupación | ADR | Reservas |\n");
                sb.append("| :--- | :--- | ---: | ---: | :---: | ---: | :---: |\n");

                List<String> labels = new ArrayList<>();
                List<Double> brutos = new ArrayList<>();
                List<Double> netos = new ArrayList<>();
                for (Map<String, Object> h : hotelesPerf) {
                    String nom = String.valueOf(h.getOrDefault("nombre", "Hotel"));
                    double b = ((Number) h.getOrDefault("ingresosBrutos", 0)).doubleValue();
                    double n = ((Number) h.getOrDefault("ingresosNetos", 0)).doubleValue();
                    sb.append("| **").append(nom).append("** | ").append(h.get("ciudad")).append(" | ")
                      .append(fmtMoneda(b)).append(" | **").append(fmtMoneda(n)).append("** | ")
                      .append(h.get("ocupacionPorcentaje")).append("% | ").append(fmtMoneda(h.get("adr"))).append(" | ")
                      .append(h.get("totalReservas")).append(" |\n");
                    labels.add(nom.replace("Hotel ", ""));
                    brutos.add(b);
                    netos.add(n);
                }

                List<Map<String, Object>> series = List.of(
                        Map.of("name", "Ingresos Brutos", "color", "#2d5a43", "data", brutos),
                        Map.of("name", "Ingresos Netos", "color", "#16324f", "data", netos)
                );
                sb.append(construirBloqueChart(
                        "Ingresos por Propiedad (" + ano + ")",
                        "Comparativa entre sedes activas (MXN)",
                        "bar",
                        "currency",
                        labels,
                        series
                ));
                return sb.toString();
            }

            // 3D. Gráfica o distribución por Categoría / Tipo de habitación
            if ((norm.contains("grafica") || norm.contains("distribucion") || norm.contains("ingresos"))
                    && (norm.contains("categoria") || norm.contains("categorias") || norm.contains("tipo de habitacion") || norm.contains("tipos de habitacion"))) {
                int ano = anosDetectados.isEmpty() ? LocalDate.now().getYear() : anosDetectados.get(0);
                List<Map<String, Object>> dist = dashboardService.obtenerDistribucionCategorias(ano, null, false);

                StringBuilder sb = new StringBuilder();
                sb.append("### Ingresos por Categoría de Habitación (").append(ano).append(")\n\n");
                sb.append("| Categoría | Tarifa Base | Noches Vendidas | Reservas | Participación | Ingresos |\n");
                sb.append("| :--- | ---: | :---: | :---: | :---: | ---: |\n");

                List<String> labels = new ArrayList<>();
                List<Double> montos = new ArrayList<>();
                for (Map<String, Object> d : dist) {
                    String nom = String.valueOf(d.getOrDefault("nombre", "Categoría"));
                    double ing = ((Number) d.getOrDefault("ingresos", 0)).doubleValue();
                    sb.append("| **").append(nom).append("** | ").append(fmtMoneda(d.get("precioBase"))).append(" | ")
                      .append(d.get("noches")).append(" | ").append(d.get("totalReservas")).append(" | ")
                      .append(d.get("participacionPct")).append("% | **").append(fmtMoneda(ing)).append("** |\n");
                    labels.add(nom.replace("Habitación ", ""));
                    montos.add(ing);
                }

                List<Map<String, Object>> series = List.of(
                        Map.of("name", "Ingresos " + ano, "color", "#2d5a43", "data", montos)
                );
                sb.append(construirBloqueChart(
                        "Ingresos por Categoría (" + ano + ")",
                        "Aportación por tipo de habitación (MXN)",
                        "bar",
                        "currency",
                        labels,
                        series
                ));
                return sb.toString();
            }

            // 3E. Gráfica o desglose por Método de Pago
            if (norm.contains("metodo de pago") || norm.contains("metodos de pago")) {
                int ano = anosDetectados.isEmpty() ? LocalDate.now().getYear() : anosDetectados.get(0);
                Map<String, Object> kpis = dashboardService.obtenerResumenKpis(ano, null);
                List<Map<String, Object>> metodos = (List<Map<String, Object>>) kpis.getOrDefault("metodosPago", List.of());

                StringBuilder sb = new StringBuilder();
                sb.append("### Recaudación por Método de Pago (").append(ano).append(")\n\n");
                sb.append("| Método de Pago | Operaciones | Participación | Monto Cobrado |\n");
                sb.append("| :--- | :---: | :---: | ---: |\n");

                List<String> labels = new ArrayList<>();
                List<Double> montos = new ArrayList<>();
                for (Map<String, Object> m : metodos) {
                    String nom = String.valueOf(m.getOrDefault("nombre", "Método"));
                    double val = ((Number) m.getOrDefault("monto", 0)).doubleValue();
                    sb.append("| **").append(nom).append("** | ").append(m.get("operaciones")).append(" | ")
                      .append(m.get("porcentaje")).append("% | **").append(fmtMoneda(val)).append("** |\n");
                    labels.add(nom);
                    montos.add(val);
                }

                List<Map<String, Object>> series = List.of(
                        Map.of("name", "Cobrado " + ano, "color", "#16324f", "data", montos)
                );
                sb.append(construirBloqueChart(
                        "Distribución por Método de Pago (" + ano + ")",
                        "Total cobrado: " + fmtMoneda(kpis.get("totalCobradoMetodos")),
                        "bar",
                        "currency",
                        labels,
                        series
                ));
                return sb.toString();
            }

            // 3F. Estacionalidad / Comportamiento mensual de un año
            if (norm.contains("comportamiento mensual") || norm.contains("estacionalidad")
                    || (norm.contains("mensual") && (norm.contains("ingreso") || norm.contains("ocupacion") || norm.contains("grafica")))) {
                int ano = anosDetectados.isEmpty() ? 2025 : anosDetectados.get(0);
                String metrica = norm.contains("ocupacion") ? "ocupacion" : norm.contains("reserva") ? "reservas" : "ingresos";
                String unit = "ocupacion".equals(metrica) ? "percent" : "reservas".equals(metrica) ? "number" : "currency";

                Map<String, Object> comp = dashboardService.obtenerSerieMensualComparativa(List.of(ano), null, metrica);
                List<String> meses = (List<String>) comp.getOrDefault("meses", List.of("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"));
                Map<String, List<Double>> seriesMap = (Map<String, List<Double>>) comp.getOrDefault("series", Map.of());
                List<Double> valores = seriesMap.getOrDefault(String.valueOf(ano), Collections.nCopies(12, 0.0));

                int idxMax = 0;
                int idxMin = 0;
                double suma = 0.0;
                for (int i = 0; i < valores.size(); i++) {
                    double v = valores.get(i);
                    suma += v;
                    if (v > valores.get(idxMax)) idxMax = i;
                    if (v < valores.get(idxMin)) idxMin = i;
                }

                StringBuilder sb = new StringBuilder();
                sb.append("### Comportamiento Mensual y Estacionalidad (").append(ano).append(")\n\n");
                sb.append("- **Mes Pico (Mayor desempeño):** ").append(meses.get(idxMax)).append(" con **")
                  .append("currency".equals(unit) ? fmtMoneda(valores.get(idxMax)) : valores.get(idxMax) + ("percent".equals(unit) ? "%" : "")).append("**.\n");
                sb.append("- **Mes Valle (Menor actividad):** ").append(meses.get(idxMin)).append(" con **")
                  .append("currency".equals(unit) ? fmtMoneda(valores.get(idxMin)) : valores.get(idxMin) + ("percent".equals(unit) ? "%" : "")).append("**.\n");
                if ("currency".equals(unit)) {
                    sb.append("- **Acumulado Anual ").append(ano).append(":** **").append(fmtMoneda(suma)).append("**.\n\n");
                } else {
                    sb.append("\n");
                }

                sb.append("| Mes | ").append("currency".equals(unit) ? "Ingresos Mensuales" : "percent".equals(unit) ? "Ocupación %" : "Reservaciones").append(" |\n");
                sb.append("| :--- | ---: |\n");
                for (int i = 0; i < meses.size(); i++) {
                    String valStr = "currency".equals(unit) ? fmtMoneda(valores.get(i)) : valores.get(i) + ("percent".equals(unit) ? "%" : "");
                    sb.append("| **").append(meses.get(i)).append("** | ").append(valStr).append(" |\n");
                }

                List<Map<String, Object>> series = List.of(
                        Map.of("name", "Ejercicio " + ano, "color", "#b85d38", "data", valores)
                );
                sb.append(construirBloqueChart(
                        "Curva de Estacionalidad Mensual (" + ano + ")",
                        "Evolución mensual de " + metrica + " (Ene - Dic)",
                        "line",
                        unit,
                        meses,
                        series
                ));
                return sb.toString();
            }

            // 3G. Resumen financiero y métricas clave de un año
            if (norm.contains("metricas financieras") || norm.contains("resumen financiero") || norm.contains("grafica")) {
                int ano = anosDetectados.isEmpty() ? LocalDate.now().getYear() : anosDetectados.get(0);
                String metrica = norm.contains("ocupacion") ? "ocupacion" : norm.contains("reserva") ? "reservas" : "ingresos";
                String unit = "ocupacion".equals(metrica) ? "percent" : "reservas".equals(metrica) ? "number" : "currency";

                Map<String, Object> kpis = dashboardService.obtenerResumenKpis(ano, null);
                Map<String, Object> comp = dashboardService.obtenerSerieMensualComparativa(List.of(ano), null, metrica);
                List<String> meses = (List<String>) comp.getOrDefault("meses", List.of("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"));
                Map<String, List<Double>> seriesMap = (Map<String, List<Double>>) comp.getOrDefault("series", Map.of());
                List<Double> valores = seriesMap.getOrDefault(String.valueOf(ano), Collections.nCopies(12, 0.0));

                StringBuilder sb = new StringBuilder();
                sb.append("### Resumen Ejecutivo y Métricas Financieras (").append(ano).append(")\n\n");
                sb.append("| Indicador Financiero / Operativo | Resultado ").append(ano).append(" |\n");
                sb.append("| :--- | ---: |\n");
                sb.append("| **Ingresos Brutos** | **").append(fmtMoneda(kpis.get("ingresosBrutos"))).append("** |\n");
                sb.append("| **Ingresos Netos** (desc. reembolsos) | **").append(fmtMoneda(kpis.get("ingresosNetos"))).append("** |\n");
                sb.append("| **Anticipos Cobrados (50%)** | ").append(fmtMoneda(kpis.get("anticiposCobrados"))).append(" |\n");
                sb.append("| **Saldos Pendientes por Cobrar** | ").append(fmtMoneda(kpis.get("saldosPendientes"))).append(" |\n");
                sb.append("| **Penalizaciones Retenidas** | ").append(fmtMoneda(kpis.get("penalizacionesRetenidas"))).append(" |\n");
                sb.append("| **Reembolsos Devueltos** | ").append(fmtMoneda(kpis.get("reembolsosDevueltos"))).append(" |\n");
                sb.append("| **Tarifa Promedio Diaria (ADR)** | ").append(fmtMoneda(kpis.get("adr"))).append(" |\n");
                sb.append("| **RevPAR** | ").append(fmtMoneda(kpis.get("revpar"))).append(" |\n");
                sb.append("| **Tasa de Ocupación** | ").append(kpis.get("ocupacionPorcentaje")).append("% (").append(kpis.get("nochesVendidas")).append(" noches) |\n");
                sb.append("| **Total Reservaciones** | ").append(kpis.get("totalReservas")).append(" (Cancelación: ").append(kpis.get("tasaCancelacion")).append("% · No-Show: ").append(kpis.get("tasaNoShow")).append("%) |\n");

                List<Map<String, Object>> series = List.of(
                        Map.of("name", "Ejercicio " + ano, "color", "#2d5a43", "data", valores)
                );
                sb.append(construirBloqueChart(
                        "Desempeño Mensual (" + ano + ")",
                        "Serie mensual de " + metrica + " de toda la cadena",
                        "bar",
                        unit,
                        meses,
                        series
                ));
                return sb.toString();
            }
        }

        // 4. CONSULTAS DE INVENTARIO, HABITACIONES Y RESERVACIONES

        // 4-PRE. Flujos conversacionales con memoria de hotel/ciudad
        // 4-PRE-FECHAS. Consulta de disponibilidad para una fecha o rango específico (ej. "¿hay algo el 5 de diciembre?")
        LocalDate[] rangoFechas = extraerRangoFechas(norm);
        if (rangoFechas != null && !requiereHerramientasEscritura(prompt)
                && !norm.contains("reservar") && !norm.contains("cotizar") && !norm.contains("folio")
                && (norm.contains("disponib") || norm.contains("libre") || norm.contains("hay algo")
                || norm.contains("habitacion") || norm.contains("cuarto") || norm.contains("tienen"))) {
            String hotelFecha = (norm.contains("todos los hoteles") || norm.contains("cadena"))
                    ? null : resolverHotelEnContexto(prompt, scopedConvId);
            return disponibilidadEnRango(hotelFecha, rangoFechas[0], rangoFechas[1], esAdmin);
        }

        boolean sinFechas = !requiereHerramientasEscritura(prompt);
        boolean ambitoCadena = norm.contains("cada hotel") || norm.contains("por hotel") || norm.contains("cadena")
                || norm.contains("todos los hoteles") || norm.contains("otro hotel") || norm.contains("otros hoteles");
        String ctxHotel = (sinFechas && !ambitoCadena) ? resolverHotelEnContexto(prompt, scopedConvId) : null;
        if (ctxHotel != null && !norm.contains("mantenimiento") && !norm.contains("ocupada")
                && !norm.contains("cancel") && !norm.contains("politic")) {
            // Disponibilidad por fechas de una habitación (calendario real)
            boolean pideFechas = (norm.contains("fecha") || norm.contains("cuando") || norm.contains("que dias") || norm.contains("hasta cuando"))
                    && (norm.contains("disponib") || norm.contains("libre") || norm.contains("ocupad") || norm.contains("desocup"));
            if (pideFechas) {
                List<Map<String, Object>> rooms = habitacionesDeHotel(ctxHotel);
                Map<String, Object> hab = habitacionEnContexto(prompt, scopedConvId, rooms);
                if (hab != null) return calendarioHabitacion(ctxHotel, hab);
                if (!rooms.isEmpty()) {
                    StringBuilder sb = new StringBuilder("¿De cuál habitación de **" + ctxHotel + "** desea conocer las fechas? Disponibles:\n\n");
                    for (Map<String, Object> r : rooms) sb.append("- **#").append(r.get("numero")).append("** · ").append(r.get("tipo")).append("\n");
                    return sb.toString();
                }
            }
            // Pregunta por una categoría concreta dentro del hotel en contexto
            String[] claves = {"individual", "doble", "matrimonial", "familiar", "suite", "master", "estudiante", "villa"};
            String clave = null;
            for (String c : claves) if (norm.contains(c)) { clave = c; break; }
            if (clave != null) {
                final String k = clave;
                List<Map<String, Object>> todas = habitacionesDeHotel(ctxHotel);
                List<Map<String, Object>> coinciden = todas.stream()
                        .filter(r -> normalizarTexto(String.valueOf(r.get("tipo"))).contains(k)).toList();
                if (!coinciden.isEmpty()) {
                    return tablaHabitacionesHotel(ctxHotel, esAdmin,
                            "Sí, **" + ctxHotel + "** cuenta con esta categoría:", coinciden);
                }
                return tablaHabitacionesHotel(ctxHotel, esAdmin,
                        "**" + ctxHotel + "** no cuenta con habitaciones de la categoría solicitada. Estas son las únicas habitaciones de ese hotel:", todas);
            }
            // Preguntas tipo "¿es la única?", "¿cuántas habitaciones tiene?", "¿qué más tienen?"
            if (norm.contains("unica") || norm.contains("solo cuenta") || norm.contains("solo tiene") || norm.contains("solo hay")
                    || norm.contains("cuantas habitaciones") || norm.contains("que mas") || norm.contains("otras habitaciones")
                    || norm.contains("mas habitaciones") || norm.contains("otra habitacion")) {
                List<Map<String, Object>> todas = habitacionesDeHotel(ctxHotel);
                return tablaHabitacionesHotel(ctxHotel, esAdmin,
                        "**" + ctxHotel + "** cuenta con " + todas.size() + (todas.size() == 1 ? " habitación registrada:" : " habitaciones registradas:"), todas);
            }
        }
        boolean temaOtro = norm.contains("mantenimiento") || norm.contains("ocupada") || norm.contains("planta baja")
                || norm.contains("4 personas") || norm.contains("mas cara") || norm.contains("categoria")
                || norm.contains("tipos de") || norm.contains("cotiz") || norm.contains("reserv")
                || norm.contains("pre reserva") || norm.contains("piso ");
        if (!temaOtro) {
            // Lista de hoteles disponibles
            if (norm.contains("hoteles disponibles") || norm.contains("que hoteles hay") || norm.contains("hoteles tienen")) {
                habitacionSearchTool.resetCallTracker();
                List<Map<String, Object>> todas = habitacionSearchTool.findHabitacionesPorHotel(null);
                habitacionSearchTool.resetCallTracker();
                StringBuilder sb = new StringBuilder("### Hoteles de la cadena\n\n");
                sb.append(esAdmin ? "| Propiedad | Ciudad | Habitaciones disponibles |\n| :--- | :--- | :---: |\n"
                                  : "| Propiedad | Ciudad | Habitaciones disponibles | Desde / Noche |\n| :--- | :--- | :---: | ---: |\n");
                for (Hotel h : hotelSearchTool.getHotelesActivos()) {
                    List<Map<String, Object>> hs = todas.stream()
                            .filter(r -> h.getNombre().equals(String.valueOf(r.get("hotel")))
                                    && "Disponible".equalsIgnoreCase(String.valueOf(r.get("estado")))).toList();
                    double min = hs.stream().filter(r -> r.get("precioBase") instanceof Number)
                            .mapToDouble(r -> ((Number) r.get("precioBase")).doubleValue()).min().orElse(0);
                    sb.append("| **").append(h.getNombre()).append("** | ").append(h.getCiudad()).append(" | ").append(hs.size());
                    if (!esAdmin) sb.append(" | ").append(hs.isEmpty() ? "—" : fmtMoneda(min));
                    sb.append(" |\n");
                }
                return sb.append("\n¿En qué ciudad o hotel desea hospedarse?").toString();
            }
            // El usuario elige hotel/ciudad
            String hotelPrompt = detectarHotelEnTexto(norm);
            boolean soloNombre = hotelPrompt != null && norm.split(" ").length <= 4
                    && !norm.contains("precio") && !norm.contains("cuesta");
            boolean eligeHotel = hotelPrompt != null && (soloNombre || norm.contains("hospedar") || norm.contains("alojar")
                    || norm.contains("quedar") || norm.contains("busco") || norm.startsWith("en ")
                    || norm.contains("quiero ir") || norm.contains("hotel en") || norm.contains("habitaciones en")
                    || norm.contains("habitaciones del") || norm.contains("habitaciones de "));
            if (eligeHotel) {
                return tablaHabitacionesHotel(hotelPrompt, esAdmin,
                        "Con gusto. Estas son las habitaciones de **" + hotelPrompt + "**:");
            }
            // Pide habitaciones sin nombrar hotel: usar memoria
            boolean pideHabs = (norm.contains("habitacion") || norm.contains("cuarto"))
                    && (norm.contains("muestra") || norm.contains("mostrar") || norm.startsWith("ver ") || norm.contains("dame")
                    || norm.contains("cuales") || norm.contains("que habitaciones") || norm.contains("tienen")
                    || norm.contains("disponibles"));
            if (pideHabs) {
                String ctx = resolverHotelEnContexto(prompt, scopedConvId);
                if (ctx != null) {
                    return tablaHabitacionesHotel(ctx, esAdmin, "Estas son las habitaciones de **" + ctx + "**:");
                }
                if (!norm.contains("disponibles")) {
                    StringBuilder sb = new StringBuilder("¿De cuál hotel desea ver las habitaciones?\n\n");
                    for (Hotel h : hotelSearchTool.getHotelesActivos()) {
                        sb.append("- **").append(h.getNombre()).append("** (").append(h.getCiudad()).append(")\n");
                    }
                    return sb.toString();
                }
            }
        }

        // 4A. Total de habitaciones por cada hotel
        if ((norm.contains("cuantas habitaciones") || norm.contains("total de habitaciones") || norm.contains("total por hotel"))
                && (norm.contains("cada hotel") || norm.contains("por hotel") || norm.contains("cadena"))) {
            List<Map<String, Object>> conteos = hotelSearchTool.countTotalHabitacionesPorHotel();
            long sumaTotal = 0;
            StringBuilder sb = new StringBuilder();
            sb.append("### Inventario de Habitaciones por Propiedad\n\n");
            sb.append("| Propiedad / Sede | Total de Habitaciones |\n");
            sb.append("| :--- | :---: |\n");
            List<String> labels = new ArrayList<>();
            List<Double> datos = new ArrayList<>();
            for (Map<String, Object> row : conteos) {
                String h = String.valueOf(row.getOrDefault("hotel", "Hotel"));
                long cant = row.get("total_habitaciones") instanceof Number n ? n.longValue() : 0L;
                sumaTotal += cant;
                sb.append("| **").append(h).append("** | ").append(cant).append(" habitaciones |\n");
                labels.add(h.replace("Hotel ", ""));
                datos.add((double) cant);
            }
            sb.append("| **Total Cadena** | **").append(sumaTotal).append(" habitaciones** |\n");
            if (esGerente) {
                sb.append(construirBloqueChart(
                        "Distribución de Inventario por Sede",
                        "Total: " + sumaTotal + " habitaciones activas",
                        "bar",
                        "number",
                        labels,
                        List.of(Map.of("name", "Habitaciones", "color", "#16324f", "data", datos))
                ));
            }
            return sb.toString();
        }

        // 4B. Hoteles activos de la cadena
        if (norm.contains("hoteles activos") || norm.contains("cuales son los hoteles") || norm.equals("mostrar hoteles") || norm.equals("hoteles")) {
            List<Hotel> hoteles = hotelSearchTool.getHotelesActivos();
            StringBuilder sb = new StringBuilder();
            sb.append("### Propiedades Activas de la Cadena Hotel Paraíso\n\n");
            sb.append("| Propiedad | Ciudad | Dirección | Teléfono |\n");
            sb.append("| :--- | :--- | :--- | :--- |\n");
            for (Hotel h : hoteles) {
                sb.append("| **").append(h.getNombre()).append("** | ")
                  .append(h.getCiudad() != null ? h.getCiudad() : "—").append(" | ")
                  .append(h.getDireccion() != null ? h.getDireccion() : "—").append(" | ")
                  .append(h.getTelefono() != null ? h.getTelefono() : "—").append(" |\n");
            }
            return sb.toString();
        }

        // 4C. Resumen operativo del hotel
        if (norm.contains("resumen operativo") || norm.contains("reporte de turno")) {
            if (esHuesped) {
                return "Por políticas de seguridad y privacidad del hotel, los reportes operativos internos de turno y ocupación son de uso exclusivo para el personal administrativo. Con gusto puedo informarle sobre habitaciones disponibles o sus propias reservaciones.";
            }
            Map<String, Object> res = habitacionSearchTool.getResumenOperativoHotel(null);
            StringBuilder sb = new StringBuilder();
            sb.append("### Resumen Operativo en Tiempo Real — ").append(res.get("hotel")).append("\n\n");
            sb.append("| Estado Operativo | Cantidad | Habitaciones |\n");
            sb.append("| :--- | :---: | :--- |\n");
            sb.append("| **Disponibles** | **").append(res.get("totalDisponibles")).append("** | ").append(String.join(", ", (List<String>) res.get("habitacionesDisponibles"))).append(" |\n");
            sb.append("| **Ocupadas** | **").append(res.get("totalOcupadas")).append("** | ").append(String.join(", ", (List<String>) res.get("habitacionesOcupadas"))).append(" |\n");
            sb.append("| **En Mantenimiento** | **").append(res.get("totalMantenimiento")).append("** | ").append(String.join(", ", (List<String>) res.get("habitacionesMantenimiento"))).append(" |\n");
            sb.append("| **Total Inventario** | **").append(res.get("totalHabitaciones")).append("** | Ocupación actual: **").append(res.get("porcentajeOcupacion")).append("** |\n");
            return sb.toString();
        }

        // 4D. Habitaciones en mantenimiento
        if (norm.contains("mantenimiento")) {
            if (esHuesped) {
                return "Por políticas de privacidad y operación interna, el listado de habitaciones en mantenimiento es exclusivo para el personal del hotel.";
            }
            List<Map<String, Object>> mant = habitacionSearchTool.findHabitacionesEnMantenimiento();
            if (mant.isEmpty()) {
                return "Actualmente **no hay habitaciones en mantenimiento** en ninguna propiedad activa de la cadena. Todo el inventario se encuentra operativo.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("### Habitaciones en Mantenimiento (").append(mant.size()).append(")\n\n");
            sb.append("| Propiedad | Habitación | Piso | Categoría | Estado |\n");
            sb.append("| :--- | :---: | :---: | :--- | :---: |\n");
            for (Map<String, Object> h : mant) {
                sb.append("| **").append(h.get("hotel")).append("** | #").append(h.get("numero"))
                  .append(" | Piso ").append(h.get("piso")).append(" | ").append(h.get("tipo"))
                  .append(" | Mantenimiento |\n");
            }
            return sb.toString();
        }

        // 4E. Habitaciones en pre-reserva
        if (norm.contains("pre reserva") || norm.contains("prereserva")) {
            List<Map<String, Object>> pre = reservaTool.findHabitacionesEnPreReserva(null);
            if (pre.size() == 1 && pre.get(0).containsKey("mensaje")) {
                return String.valueOf(pre.get(0).get("mensaje"));
            }
            StringBuilder sb = new StringBuilder();
            sb.append("### Reservaciones en Estado de Pre-reserva (").append(pre.size()).append(")\n\n");
            if (esAdmin) {
                sb.append("| Folio | Propiedad | Habitación | Titular | Entrada | Salida |\n");
                sb.append("| :--- | :--- | :---: | :--- | :---: | :---: |\n");
                for (Map<String, Object> r : pre) {
                    sb.append("| **").append(r.get("folio")).append("** | ").append(r.get("hotel"))
                      .append(" | #").append(r.get("habitacion")).append(" (").append(r.get("tipoHabitacion")).append(") | ")
                      .append(r.get("titular")).append(" | ").append(r.get("fechaEntrada")).append(" | ").append(r.get("fechaSalida")).append(" |\n");
                }
            } else {
                sb.append("| Folio | Propiedad | Habitación | Titular | Estancia | Total | Anticipo (50%) |\n");
                sb.append("| :--- | :--- | :---: | :--- | :---: | ---: | ---: |\n");
                for (Map<String, Object> r : pre) {
                    sb.append("| **").append(r.get("folio")).append("** | ").append(r.get("hotel"))
                      .append(" | #").append(r.get("habitacion")).append(" | ").append(r.get("titular"))
                      .append(" | ").append(r.get("fechaEntrada")).append(" → ").append(r.get("fechaSalida"))
                      .append(" | ").append(r.get("total")).append(" | **").append(r.get("anticipoPendiente")).append("** |\n");
                }
            }
            return sb.toString();
        }

        // 4F. Habitaciones ocupadas
        if (norm.contains("habitaciones ocupadas") || norm.equals("ocupadas")) {
            if (esHuesped) {
                return "Por políticas de privacidad del hotel, el detalle de habitaciones ocupadas es de uso interno administrativo.";
            }
            List<Map<String, Object>> ocup = habitacionSearchTool.findHabitacionesOcupadas();
            if (ocup.isEmpty()) {
                return "Actualmente **no hay habitaciones en estado Ocupada** en el sistema.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("### Habitaciones Ocupadas Actualmente (").append(ocup.size()).append(")\n\n");
            sb.append("| Propiedad | Habitación | Piso | Categoría | Estado |\n");
            sb.append("| :--- | :---: | :---: | :--- | :---: |\n");
            for (Map<String, Object> h : ocup) {
                sb.append("| **").append(h.get("hotel")).append("** | #").append(h.get("numero"))
                  .append(" | Piso ").append(h.get("piso")).append(" | ").append(h.get("tipo"))
                  .append(" | Ocupada |\n");
            }
            return sb.toString();
        }

        // 4G. Planta baja y accesibilidad
        if (norm.contains("planta baja") || norm.contains("silla de ruedas") || norm.contains("adulto mayor") || norm.contains("tercera edad")) {
            List<Map<String, Object>> pb = norm.contains("disponible")
                    ? habitacionSearchTool.findDisponiblesPlantaBaja(null)
                    : habitacionSearchTool.findHabitacionesPlantaBaja(null);
            StringBuilder sb = new StringBuilder();
            sb.append("### Habitaciones en Planta Baja (Piso 1 — Accesibilidad Prioritaria)\n\n");
            sb.append("La cadena cuenta con habitaciones en **Planta Baja (Piso 1)** —incluyendo las unidades **101** y **102**— con **prioridad estricta** de asignación para personas de la **tercera edad**, clientes en **silla de ruedas** o huéspedes con **movilidad reducida** (4 habitaciones base en planta baja en las sedes principales).\n\n");
            if (!pb.isEmpty()) {
                if (esAdmin) {
                    sb.append("| Propiedad | Habitación | Piso | Categoría | Estado |\n");
                    sb.append("| :--- | :---: | :---: | :--- | :---: |\n");
                    for (Map<String, Object> h : pb) {
                        sb.append("| **").append(h.get("hotel")).append("** | #").append(h.get("numero"))
                          .append(" | Piso ").append(h.get("piso")).append(" | ").append(h.get("tipo"))
                          .append(" | ").append(h.get("estado")).append(" |\n");
                    }
                } else {
                    sb.append("| Propiedad | Habitación | Piso | Categoría | Tarifa / Noche | Estado |\n");
                    sb.append("| :--- | :---: | :---: | :--- | ---: | :---: |\n");
                    for (Map<String, Object> h : pb) {
                        sb.append("| **").append(h.get("hotel")).append("** | #").append(h.get("numero"))
                          .append(" | Piso ").append(h.get("piso")).append(" | ").append(h.get("tipo"))
                          .append(" | ").append(fmtMoneda(h.get("precioBase"))).append(" | ").append(h.get("estado")).append(" |\n");
                    }
                }
            }
            return sb.toString();
        }

        // 4H. Tipos y precios / Categorías
        if (norm.contains("tipos de habitacion") || norm.contains("categorias") || (norm.contains("tipos") && norm.contains("cuestan"))) {
            var cats = tipoHabitacionTool.consultarCatalogoCategoriasHabitacion();
            StringBuilder sb = new StringBuilder();
            sb.append("### Catálogo Oficial de Categorías de Habitación\n\n");
            if (esAdmin) {
                sb.append("| Categoría | Capacidad Máxima | Descripción |\n");
                sb.append("| :--- | :---: | :--- |\n");
                for (var c : cats) {
                    sb.append("| **").append(c.get("categoria")).append("** | ").append(c.get("capacidad"))
                      .append(" | ").append(c.get("descripcion")).append(" |\n");
                }
            } else {
                sb.append("| Categoría | Capacidad | Tarifa Base / Noche | Descripción |\n");
                sb.append("| :--- | :---: | ---: | :--- |\n");
                for (var c : cats) {
                    sb.append("| **").append(c.get("categoria")).append("** | ").append(c.get("capacidad"))
                      .append(" | **").append(c.get("precioBasePorNoche")).append("** | ").append(c.get("descripcion")).append(" |\n");
                }
            }
            return sb.toString();
        }

        // 4I. Habitación más cara / exclusiva
        if (norm.contains("habitacion mas cara") || norm.contains("mas exclusiva")) {
            List<Map<String, Object>> cara = habitacionSearchTool.findHabitacionMasCara();
            if (!cara.isEmpty()) {
                Map<String, Object> h = cara.get(0);
                if (esAdmin) {
                    return "La habitación de mayor categoría en la cadena es la **Habitación #" + h.get("numero") + "** (**" + h.get("tipo") + "**) ubicada en el Piso " + h.get("piso") + " de **" + h.get("hotel") + "** (" + h.get("ciudad") + "), actualmente en estado **" + h.get("estado") + "**.";
                }
                return "La habitación más exclusiva de la cadena es la **Habitación #" + h.get("numero") + "** (**" + h.get("tipo") + "**) en **" + h.get("hotel") + "** (" + h.get("ciudad") + "), con una tarifa base de **" + fmtMoneda(h.get("precioBase")) + "** por noche (Estado actual: **" + h.get("estado") + "**).";
            }
        }

        // 4J. Habitaciones para 4 personas
        if (norm.contains("4 personas") || norm.contains("4 huespedes") || norm.contains("cuatro personas")) {
            List<Map<String, Object>> fam = habitacionSearchTool.findHabitacionesPara4Huespedes();
            StringBuilder sb = new StringBuilder();
            sb.append("### Habitaciones con Capacidad para 4 Personas\n\n");
            if (esAdmin) {
                sb.append("| Propiedad | Habitación | Piso | Categoría | Estado |\n");
                sb.append("| :--- | :---: | :---: | :--- | :---: |\n");
                for (Map<String, Object> h : fam) {
                    sb.append("| **").append(h.get("hotel")).append("** | #").append(h.get("numero"))
                      .append(" | Piso ").append(h.get("piso")).append(" | ").append(h.get("tipo"))
                      .append(" | ").append(h.get("estado")).append(" |\n");
                }
            } else {
                sb.append("| Propiedad | Habitación | Piso | Categoría | Tarifa / Noche | Estado |\n");
                sb.append("| :--- | :---: | :---: | :--- | ---: | :---: |\n");
                for (Map<String, Object> h : fam) {
                    sb.append("| **").append(h.get("hotel")).append("** | #").append(h.get("numero"))
                      .append(" | Piso ").append(h.get("piso")).append(" | ").append(h.get("tipo"))
                      .append(" | **").append(fmtMoneda(h.get("precioBase"))).append("** | ").append(h.get("estado")).append(" |\n");
                }
            }
            return sb.toString();
        }

        // 4K. Habitaciones disponibles
        if (norm.contains("habitaciones disponibles") || norm.contains("disponibles actualmente")
                || norm.contains("que habitaciones estan disponibles") || norm.equals("disponibles hoy")) {
            List<Map<String, Object>> disp = habitacionSearchTool.findHabitacionesDisponibles();
            if (disp.isEmpty()) {
                return "En este momento no hay habitaciones con estado **Disponible** para entrega inmediata.";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("### Habitaciones Disponibles Actualmente (").append(disp.size()).append(")\n\n");
            if (esAdmin) {
                sb.append("| Propiedad | Ciudad | Habitación | Piso | Categoría |\n");
                sb.append("| :--- | :--- | :---: | :---: | :--- |\n");
                for (Map<String, Object> h : disp) {
                    sb.append("| **").append(h.get("hotel")).append("** | ").append(h.get("ciudad"))
                      .append(" | #").append(h.get("numero")).append(" | Piso ").append(h.get("piso"))
                      .append(" | ").append(h.get("tipo")).append(" |\n");
                }
            } else {
                sb.append("| Propiedad | Ciudad | Habitación | Piso | Categoría | Tarifa / Noche |\n");
                sb.append("| :--- | :--- | :---: | :---: | :--- | ---: |\n");
                for (Map<String, Object> h : disp) {
                    sb.append("| **").append(h.get("hotel")).append("** | ").append(h.get("ciudad"))
                      .append(" | #").append(h.get("numero")).append(" | Piso ").append(h.get("piso"))
                      .append(" | ").append(h.get("tipo")).append(" | **").append(fmtMoneda(h.get("precioBase"))).append("** |\n");
                }
            }
            return sb.toString();
        }

        // 4L. Consulta general de Reservaciones registradas / activas / confirmadas / canceladas
        if (norm.contains("reservaciones") || norm.contains("reservas registradas") || norm.contains("mis reservaciones")
                || norm.equals("reservas") || norm.contains("reservas confirmadas") || norm.contains("reservas canceladas")) {
            if (esHuesped) {
                List<Map<String, Object>> mis = reservaTool.buscarReservaciones("", null);
                if (mis.size() == 1 && mis.get(0).containsKey("mensaje")) {
                    return String.valueOf(mis.get(0).get("mensaje"));
                }
                StringBuilder sb = new StringBuilder();
                sb.append("### Sus Reservaciones Registradas (").append(mis.size()).append(")\n\n");
                sb.append("| Folio | Propiedad | Habitación | Estancia | Total | Estado |\n");
                sb.append("| :--- | :--- | :---: | :---: | ---: | :---: |\n");
                for (Map<String, Object> r : mis) {
                    sb.append("| **").append(r.get("folio")).append("** | ").append(r.get("hotel"))
                      .append(" | #").append(r.get("habitacion")).append(" | ")
                      .append(r.get("fechaEntrada")).append(" → ").append(r.get("fechaSalida"))
                      .append(" | ").append(r.get("total")).append(" | **").append(r.get("estado")).append("** |\n");
                }
                return sb.toString();
            }

            List<Reserva> todas = reservaRepository.findAllByOrderByFechaCreacionDesc();
            long cConf = todas.stream().filter(r -> Reserva.CONFIRMADA.equals(r.getEstado())).count();
            long cOcup = todas.stream().filter(r -> Reserva.OCUPADA.equals(r.getEstado())).count();
            long cPre = todas.stream().filter(r -> Reserva.PRE_RESERVA.equals(r.getEstado())).count();
            long cFin = todas.stream().filter(r -> Reserva.FINALIZADA.equals(r.getEstado())).count();
            long cCanc = todas.stream().filter(r -> Reserva.CANCELADA.equals(r.getEstado()) || Reserva.NO_SHOW.equals(r.getEstado())).count();

            List<Reserva> filtradas = todas;
            String subtitulo = "Más recientes en el sistema";
            if (norm.contains("confirmada")) {
                filtradas = todas.stream().filter(r -> Reserva.CONFIRMADA.equals(r.getEstado())).toList();
                subtitulo = "Estado: Confirmada";
            } else if (norm.contains("cancelada")) {
                filtradas = todas.stream().filter(r -> Reserva.CANCELADA.equals(r.getEstado())).toList();
                subtitulo = "Estado: Cancelada";
            } else if (norm.contains("ocupada")) {
                filtradas = todas.stream().filter(r -> Reserva.OCUPADA.equals(r.getEstado())).toList();
                subtitulo = "Estado: Ocupada";
            }

            StringBuilder sb = new StringBuilder();
            sb.append("### Resumen de Reservaciones en Sistema (").append(todas.size()).append(" totales)\n\n");
            sb.append("- **Confirmadas:** ").append(cConf)
              .append(" · **Ocupadas:** ").append(cOcup)
              .append(" · **Pre-reservas:** ").append(cPre)
              .append(" · **Finalizadas:** ").append(cFin)
              .append(" · **Canceladas / No-Show:** ").append(cCanc).append("\n\n");

            sb.append("**").append(subtitulo).append(" (primeros 10 registros):**\n\n");
            if (esAdmin) {
                sb.append("| Folio | Propiedad | Habitación | Huésped Titular | Estancia | Estado |\n");
                sb.append("| :--- | :--- | :---: | :--- | :---: | :---: |\n");
            } else {
                sb.append("| Folio | Propiedad | Habitación | Huésped Titular | Estancia | Total | Estado |\n");
                sb.append("| :--- | :--- | :---: | :--- | :---: | ---: | :---: |\n");
            }

            int max = Math.min(filtradas.size(), 10);
            for (int i = 0; i < max; i++) {
                Reserva r = filtradas.get(i);
                String hot = (r.getHabitacion() != null && r.getHabitacion().getHotel() != null) ? r.getHabitacion().getHotel().getNombre() : "Hotel Paraíso";
                String num = r.getHabitacion() != null ? r.getHabitacion().getNumero() : "—";
                String tit = r.getHuesped() != null ? r.getHuesped().getNombre() : "—";
                if (esAdmin) {
                    sb.append("| **").append(r.getFolio()).append("** | ").append(hot)
                      .append(" | #").append(num).append(" | ").append(tit)
                      .append(" | ").append(r.getFechaEntrada()).append(" → ").append(r.getFechaSalida())
                      .append(" | **").append(r.getEstado()).append("** |\n");
                } else {
                    sb.append("| **").append(r.getFolio()).append("** | ").append(hot)
                      .append(" | #").append(num).append(" | ").append(tit)
                      .append(" | ").append(r.getFechaEntrada()).append(" → ").append(r.getFechaSalida())
                      .append(" | ").append(fmtMoneda(r.getTotal()))
                      .append(" | **").append(r.getEstado()).append("** |\n");
                }
            }

            if (esGerente) {
                sb.append(construirBloqueChart(
                        "Distribución de Reservaciones por Estado",
                        "Total histórico: " + todas.size() + " reservaciones",
                        "bar",
                        "number",
                        List.of("Confirmadas", "Ocupadas", "Pre-reservas", "Finalizadas", "Canceladas"),
                        List.of(Map.of(
                                "name", "Reservaciones",
                                "color", "#2d5a43",
                                "data", List.of((double) cConf, (double) cOcup, (double) cPre, (double) cFin, (double) cCanc)
                        ))
                ));
            }
            return sb.toString();
        }

        return null;
    }

    /**
     * Determina si la consulta requiere herramientas de escritura (ej. confirmar alta de reservación con teléfono y fechas).
     * Si no las requiere, deshabilitamos las 45 herramientas JSON en Ollama para que responda en 2-3 segundos en vez de 90s.
     */
    private boolean requiereHerramientasEscritura(String prompt) {
        if (prompt == null) return false;
        String norm = normalizarTexto(prompt);
        boolean tieneFechaIso = Pattern.compile("\\b202\\d\\s+\\d{2}\\s+\\d{2}\\b").matcher(norm).find();
        boolean tieneTelefono = Pattern.compile("\\b\\d{10}\\b").matcher(norm).find();
        return (tieneFechaIso && tieneTelefono) || norm.contains("confirmo proceder") || norm.contains("confirmar registro");
    }

    private String limpiarMetaTextoIA(String content) {
        if (content == null || content.isBlank()) return content;
        return content
                .replaceAll("(?i)^\\s*lo siento,\\s*pero no hay suficiente informaci[oó]n en la base de datos[^\\n]*\\n+", "")
                .replaceAll("(?i)\\*\\*respuesta al usuario:?\\*\\*\\s*", "")
                .replaceAll("(?i)^\\s*respuesta al usuario:?\\s*", "")
                .replaceAll("(?i)\\n+recuerda que la respuesta final debe ser clara[^\\n]*$", "")
                .trim();
    }

    @Override
    public String chat(String prompt, String model) {
        return chat(prompt, model, DEFAULT_CONVERSATION_ID);
    }

    @Override
    public String chat(String prompt, String model, String conversationId) {
        CustomUserDetails currentUser = obtenerUsuarioActual();
        String scopedConvId = aislarConversationIdPorUsuario(currentUser, conversationId);
        log.info("Hotel Chat request - modelo: {}, usuario: {}, rol: {}, conversationId: {}",
                model,
                currentUser != null ? currentUser.getEmail() : "anon",
                currentUser != null ? currentUser.getRol() : "NONE",
                scopedConvId);

        if (isGreetingOrIntro(prompt)) {
            String saludo = obtenerSaludoPorRol(currentUser);
            guardarTurnoEnMemoria(scopedConvId, prompt, saludo);
            return saludo;
        }

        habitacionSearchTool.resetCallTracker();
        HabitacionSearchTool.CURRENT_USER_PROMPT.set(prompt);
        HabitacionSearchTool.CURRENT_AUTH_USER.set(currentUser);
        try {
            // 1. Resolución determinística instantánea (<25ms)
            String respuestaDirecta = resolverConsultaDirecta(prompt, currentUser, scopedConvId);
            if (respuestaDirecta != null) {
                log.info("Hotel Chat resuelto vía Fast-Track determinístico para rol={}", currentUser != null ? currentUser.getRol() : "NONE");
                guardarTurnoEnMemoria(scopedConvId, prompt, respuestaDirecta);
                return respuestaDirecta;
            }

            // 2. Consulta abierta al LLM (contexto en system; memoria queda limpia)
            String sysCtx = construirContextoSistema(currentUser, resolverHotelEnContexto(prompt, scopedConvId));
            var chatResponse = clientResolver.resolve(model)
                    .prompt()
                    .system(sysCtx)
                    .user(prompt)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, scopedConvId))
                    .call()
                    .chatResponse();
            String content = (chatResponse != null && chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null)
                    ? chatResponse.getResult().getOutput().getText()
                    : null;
            if (content == null || content.isBlank()) {
                log.warn("El modelo AI ({}) devolvió contenido vacío. ChatResponse: {}", model, chatResponse);
                return "El asistente virtual no pudo completar la respuesta en este momento. Por favor, intente de nuevo en unos instantes.";
            }
            return cleanRedundantButtons(prompt, limpiarMetaTextoIA(content));
        } catch (Exception e) {
            log.error("Error al comunicarse con el modelo AI ({}): {}", model, e.getMessage(), e);
            return obtenerMensajeErrorAmigable(model, e);
        } finally {
            habitacionSearchTool.resetCallTracker();
            HabitacionSearchTool.CURRENT_USER_PROMPT.remove();
            HabitacionSearchTool.CURRENT_AUTH_USER.remove();
        }
    }

    @Override
    public Flux<String> chatStream(String prompt, String model) {
        return chatStream(prompt, model, DEFAULT_CONVERSATION_ID);
    }

    @Override
    public Flux<String> chatStream(String prompt, String model, String conversationId) {
        CustomUserDetails currentUser = obtenerUsuarioActual();
        String scopedConvId = aislarConversationIdPorUsuario(currentUser, conversationId);
        log.info("Hotel Stream request - modelo: {}, usuario: {}, rol: {}, conversationId: {}",
                model,
                currentUser != null ? currentUser.getEmail() : "anon",
                currentUser != null ? currentUser.getRol() : "NONE",
                scopedConvId);

        if (isGreetingOrIntro(prompt)) {
            String saludo = obtenerSaludoPorRol(currentUser);
            guardarTurnoEnMemoria(scopedConvId, prompt, saludo);
            return Flux.just(saludo);
        }

        HabitacionSearchTool.CURRENT_USER_PROMPT.set(prompt);
        HabitacionSearchTool.CURRENT_AUTH_USER.set(currentUser);
        String respuestaDirecta;
        try {
            respuestaDirecta = resolverConsultaDirecta(prompt, currentUser, scopedConvId);
        } catch (Exception e) {
            HabitacionSearchTool.CURRENT_USER_PROMPT.remove();
            HabitacionSearchTool.CURRENT_AUTH_USER.remove();
            return Flux.just(obtenerMensajeErrorAmigable(model, e));
        }
        if (respuestaDirecta != null) {
            HabitacionSearchTool.CURRENT_USER_PROMPT.remove();
            HabitacionSearchTool.CURRENT_AUTH_USER.remove();
            guardarTurnoEnMemoria(scopedConvId, prompt, respuestaDirecta);
            return Flux.just(respuestaDirecta);
        }

        try {
            String sysCtx = construirContextoSistema(currentUser, resolverHotelEnContexto(prompt, scopedConvId));
            return clientResolver.resolve(model)
                    .prompt()
                    .system(sysCtx)
                    .user(prompt)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, scopedConvId))
                    .stream()
                    .content()
                    .doFinally(s -> {
                        HabitacionSearchTool.CURRENT_USER_PROMPT.remove();
                        HabitacionSearchTool.CURRENT_AUTH_USER.remove();
                    })
                    .onErrorResume(e -> {
                        log.error("Error en streaming con el modelo AI ({}): {}", model, e.getMessage());
                        return Flux.just(obtenerMensajeErrorAmigable(model, e));
                    });
        } catch (Exception e) {
            HabitacionSearchTool.CURRENT_USER_PROMPT.remove();
            HabitacionSearchTool.CURRENT_AUTH_USER.remove();
            log.error("Error inicial al iniciar stream con el modelo AI ({}): {}", model, e.getMessage(), e);
            return Flux.just(obtenerMensajeErrorAmigable(model, e));
        }
    }

    private String obtenerMensajeErrorAmigable(String model, Throwable ex) {
        boolean isOllama = "ollama".equalsIgnoreCase(model);
        StringBuilder fullMsg = new StringBuilder();
        Throwable curr = ex;
        while (curr != null) {
            if (curr.getMessage() != null) {
                fullMsg.append(" ").append(curr.getMessage().toLowerCase());
            }
            curr = curr.getCause();
        }
        String msg = fullMsg.toString();

        if (isOllama && (msg.contains("connection refused") || msg.contains("connectexception") || msg.contains("timeout"))) {
            return "En este momento el servicio local de Ollama no se encuentra disponible. Por favor, verifique que Ollama esté activo en su equipo o cambie el selector superior a 'Gemini'.";
        }

        if (!isOllama && (msg.contains("quota") || msg.contains("rate limit") || msg.contains("429") || msg.contains("resource_exhausted") || msg.contains("exceeded your current quota"))) {
            return "El motor de Google Gemini alcanzó temporalmente el límite de cuota de la API (HTTP 429). Puede cambiar el selector superior a 'Ollama' para continuar sin interrupciones.";
        }

        return "El asistente virtual se encuentra temporalmente ocupado o experimentando dificultades de conexión. Por favor, intente nuevamente.";
    }

    private String cleanRedundantButtons(String prompt, String content) {
        if (content == null || content.isBlank()) return content;

        content = content.replaceAll("\\[\\*{1,2}BOTON:\\s*", "[BOTON: ")
                         .replaceAll("\\s*\\*{1,2}\\]", "]");

        if (content.contains("```chart")) {
            return content;
        }

        String normPrompt = normalizarTexto(prompt);
        boolean hasTable = content.contains("| ---") || content.contains("|:---") || content.contains("| :---") || content.contains("|---");
        boolean hasButtons = content.contains("[BOTON:");
        boolean wasButtonClick = normPrompt.startsWith("mostrar el detalle") || normPrompt.startsWith("mostrar la habitacion");
        boolean mentionsSpecificHotel = normPrompt.contains("ejecutiv") || (normPrompt.contains("paraiso") && !normPrompt.contains("ambos"));

        if (wasButtonClick || mentionsSpecificHotel) {
            return content.replaceAll("\\[BOTON:[^\\]]+\\]", "").trim();
        }

        if (hasButtons && hasTable) {
            return content.replaceAll("\\[BOTON:[^\\]]+\\]", "").trim();
        }

        return content;
    }
}
