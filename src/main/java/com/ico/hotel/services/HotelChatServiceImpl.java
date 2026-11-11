package com.ico.hotel.services;

import com.ico.hotel.config.ClientResolver;
import com.ico.hotel.models.Rol;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.tools.HabitacionSearchTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@Slf4j
@RequiredArgsConstructor
public class HotelChatServiceImpl implements HotelChatService {

    public static final String DEFAULT_CONVERSATION_ID = "recepcion-general";

    private final ClientResolver clientResolver;
    private final HabitacionSearchTool habitacionSearchTool;

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
            return "¡Hola, **" + user.getNombre() + "**! Panel Gerencial de **Recepcionista Virtual** activo (Modo **GERENTE**).\n\n" +
                   "Tiene acceso completo a análisis estadístico, métricas financieras (ADR, RevPAR, ocupación histórica 2020–2026), balances de caja y reportes ejecutivos de toda la cadena.\n\n" +
                   "¿Qué análisis o reporte desea consultar?";
        }
        if (user != null && user.getRol() == Rol.RECEPCIONISTA) {
            return "¡Hola, **" + user.getNombre() + "**! Panel Operativo de **Mostrador y Recepción** activo (Modo **RECEPCIONISTA**).\n\n" +
                   "Tiene acceso a consulta de disponibilidad en tiempo real, registro de reservaciones, validación de anticipos y estatus de habitaciones.\n\n" +
                   "¿Qué gestión de recepción requiere realizar?";
        }
        String adminNombre = user != null ? user.getNombre() : "Administrador";
        return "¡Hola, **" + adminNombre + "**! Panel Operativo de **Recepcionista Virtual** activo (Modo **ADMINISTRADOR**).\n\n" +
               "Tiene acceso completo a consultas de inventario, hoteles, habitaciones, usuarios, reportes técnicos, métricas y gestión integral de toda la cadena.\n\n" +
               "¿Qué consulta o gestión desea realizar?";
    }

    private String construirContextoSeguridadPrompt(CustomUserDetails user, String promptOriginal) {
        if (user == null) {
            return promptOriginal;
        }
        if (user.getRol() == Rol.HUESPED) {
            return "[CONTEXTO DE SESIÓN VERIFICADA - ROL: HUESPED | Nombre: " + user.getNombre() +
                   " | Email verificado: " + user.getEmail() +
                   " | REGLA ESTRICTA DE ROL: Este usuario es un HUÉSPED. Solo puede consultar disponibilidad, tarifas, políticas públicas y SUS PROPIAS reservaciones. " +
                   "REGLA CRÍTICA DE PAGOS: Un huésped NUNCA puede confirmar una reservación ni registrar pagos directamente en el chat. Todas las reservas solicitadas por un huésped se crean forzosamente como 'PRE_RESERVA' (apartado temporal de 24 a 48 hrs). NUNCA le preguntes al huésped si prefiere 'Pre-reserva' o 'Confirmada', ni le pidas métodos de pago. La confirmación con anticipo solo la valida y aplica el personal de recepción o administración. " +
                   "TIENES PROHIBIDO darle datos de habitaciones en mantenimiento, habitaciones ocupadas, reportes operativos de turno, ingresos potenciales del hotel o reservaciones de otros clientes.]\n\n" +
                   "Mensaje del huésped: " + promptOriginal;
        }
        if (user.getRol() == Rol.GERENTE) {
            return "[CONTEXTO DE SESIÓN VERIFICADA - ROL: GERENTE (Don Roberto) | Usuario: " + user.getNombre() +
                   " | Acceso ejecutivo completo: estadísticas financieras, métricas de ocupación, comparativas históricas del periodo 2020 a 2026, ingresos, políticas y reportes directivos.]\n\n" +
                   "Mensaje del gerente: " + promptOriginal;
        }
        if (user.getRol() == Rol.RECEPCIONISTA) {
            return "[CONTEXTO DE SESIÓN VERIFICADA - ROL: RECEPCIONISTA (Mostrador) | Usuario: " + user.getNombre() +
                   " | Acceso operativo de recepción: altas de reservaciones, cotizaciones, consulta de cuartos disponibles y ocupados, anticipos y check-in.]\n\n" +
                   "Mensaje del recepcionista: " + promptOriginal;
        }
        return "[CONTEXTO DE SESIÓN VERIFICADA - ROL: ADMINISTRADOR | Usuario: " + user.getNombre() +
               " | Acceso operativo y administrativo completo habilitado.]\n\n" +
               "Mensaje del administrador: " + promptOriginal;
    }

    private String aislarConversationIdPorUsuario(CustomUserDetails user, String conversationId) {
        String baseId = (conversationId != null && !conversationId.isBlank()) ? conversationId : DEFAULT_CONVERSATION_ID;
        if (user == null) {
            return baseId;
        }
        return "usr-" + user.getIdUsuario() + "-" + user.getRol().name() + "-" + baseId;
    }

    private boolean isGreetingOrIntro(String text) {
        if (text == null || text.isBlank()) return false;
        String normalized = java.text.Normalizer.normalize(text.trim().toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String[] domainKeywords = {
                "habitacion", "habitaciones", "cuarto", "cuartos", "hotel", "hoteles",
                "precio", "precios", "costo", "costos", "tarifa", "tarifas", "disponib",
                "ocupad", "mantenimiento", "piso", "reserv", "cancel", "check", "politica",
                "anticipo", "presupuesto", "cara", "barat", "suite", "individual", "doble",
                "matrimonial", "familiar", "reembolso", "llegada", "salida", "paraiso", "ejecutivo",
                "pago", "desayuno", "estacionamiento", "limpieza"
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
            return obtenerSaludoPorRol(currentUser);
        }

        habitacionSearchTool.resetCallTracker();
        HabitacionSearchTool.CURRENT_USER_PROMPT.set(prompt);
        HabitacionSearchTool.CURRENT_AUTH_USER.set(currentUser);
        try {
            String enrichedPrompt = construirContextoSeguridadPrompt(currentUser, prompt);
            var chatResponse = clientResolver.resolve(model)
                    .prompt(enrichedPrompt)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, scopedConvId))
                    .call()
                    .chatResponse();
            String content = (chatResponse != null && chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null)
                    ? chatResponse.getResult().getOutput().getText()
                    : null;
            if (content == null || content.isBlank()) {
                log.warn("El modelo AI ({}) devolvió contenido vacío. ChatResponse: {}", model, chatResponse);
                return "⚠️ El asistente virtual no pudo completar la respuesta en este momento. Por favor, intente de nuevo en 1 minuto.";
            }
            return cleanRedundantButtons(prompt, content);
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
            return Flux.just(obtenerSaludoPorRol(currentUser));
        }

        try {
            HabitacionSearchTool.CURRENT_AUTH_USER.set(currentUser);
            String enrichedPrompt = construirContextoSeguridadPrompt(currentUser, prompt);
            return clientResolver.resolve(model)
                    .prompt(enrichedPrompt)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, scopedConvId))
                    .stream()
                    .content()
                    .doFinally(s -> HabitacionSearchTool.CURRENT_AUTH_USER.remove())
                    .onErrorResume(e -> {
                        log.error("Error en streaming con el modelo AI ({}): {}", model, e.getMessage());
                        return Flux.just(obtenerMensajeErrorAmigable(model, e));
                    });
        } catch (Exception e) {
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
            return "⚠️ En este momento el servicio local de Ollama no se encuentra disponible. Por favor, asegúrate de que Ollama esté iniciado en tu equipo o cambia el selector superior a 'Gemini'. Intenta de nuevo en 1 minuto.";
        }

        if (!isOllama && (msg.contains("quota") || msg.contains("rate limit") || msg.contains("429") || msg.contains("resource_exhausted") || msg.contains("exceeded your current quota"))) {
            return "⚠️ El asistente de Google Gemini ha alcanzado temporalmente el límite diario de solicitudes gratuitas de la API de Google (Quota 429). Por favor, intenta de nuevo más tarde o verifica la clave de API de Gemini.";
        }

        return "⚠️ El asistente virtual se encuentra temporalmente ocupado o experimentando dificultades de conexión. Por favor, intenta de nuevo en 1 minuto.";
    }

    private String cleanRedundantButtons(String prompt, String content) {
        if (content == null || content.isBlank()) return content;

        content = content.replaceAll("\\[\\*{1,2}BOTON:\\s*", "[BOTON: ")
                         .replaceAll("\\s*\\*{1,2}\\]", "]");

        String normPrompt = java.text.Normalizer.normalize(prompt.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        boolean hasTable = content.contains("| ---") || content.contains("|:---") || content.contains("| :---") || content.contains("|---");
        boolean hasButtons = content.contains("[BOTON:");
        boolean wasButtonClick = normPrompt.startsWith("mostrar el detalle") || normPrompt.startsWith("mostrar la habitacion");
        boolean mentionsSpecificHotel = normPrompt.contains("ejecutiv") || (normPrompt.contains("paraiso") && !normPrompt.contains("ambos"));

        if (wasButtonClick || mentionsSpecificHotel) {
            String cleaned = content.replaceAll("\\[BOTON:[^\\]]+\\]", "").trim();
            cleaned = cleaned.replaceAll("(?i)(\\*\\*\\s*)?(opciones?|botones?|seleccione|elija|acciones?)[^:\n]*:?(\\s*\\*\\*)?", "")
                             .replaceAll("(?i)(¿?de\\s*qu[eé]\\s*propiedad\\s*desea\\s*consultar[^\n]*|por\\s*favor,?\\s*seleccione[^\n]*|puede\\s*(seleccionar|elegir)[^\n]*)", "")
                             .replaceAll("(?m)^\\s*[-*•]\\s*$", "")
                             .replaceAll("(?i)(\\n\\s*por\\s*favor,?\\s*$|\\n\\s*puede\\s*seleccionar:?\\s*$)", "")
                             .replaceAll("\n{3,}", "\n\n")
                             .trim();
            return cleaned;
        }

        if (hasButtons && hasTable) {
            int lastButtonIdx = content.lastIndexOf("]");
            if (lastButtonIdx != -1) {
                String beforeAndIncludingButtons = content.substring(0, lastButtonIdx + 1);
                if (beforeAndIncludingButtons.contains("| ---") || beforeAndIncludingButtons.contains("|---")) {
                    beforeAndIncludingButtons = beforeAndIncludingButtons.replaceAll("(?s)\\|[^\n]+\\|.*?(\n\n|\n(?=[A-Za-z¿\\[]))", "");
                }
                return beforeAndIncludingButtons.trim();
            }
        }

        if (hasTable) {
            return content.replaceAll("\\[BOTON:[^\\]]+\\]", "")
                    .replaceAll("(?i)(\\*\\*\\s*)?(opciones?|botones?|seleccione|elija|acciones?)[^:\n]*:?(\\s*\\*\\*)?", "")
                    .replaceAll("(?i)(¿?de\\s*qu[eé]\\s*propiedad\\s*desea\\s*consultar[^\n]*|por\\s*favor,?\\s*seleccione[^\n]*|puede\\s*(seleccionar|elegir)[^\n]*)", "")
                    .replaceAll("(?m)^\\s*[-*•]\\s*$", "")
                    .replaceAll("(?i)(\\n\\s*por\\s*favor,?\\s*$|\\n\\s*puede\\s*seleccionar:?\\s*$)", "")
                    .replaceAll("\n{3,}", "\n\n")
                    .trim();
        }

        return content;
    }
}
