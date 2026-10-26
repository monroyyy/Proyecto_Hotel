package com.ico.hotel.services;

import com.ico.hotel.config.ClientResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@Slf4j
@RequiredArgsConstructor
public class HotelChatServiceImpl implements HotelChatService {

    public static final String DEFAULT_CONVERSATION_ID = "recepcion-general";

    private final ClientResolver clientResolver;
    private final com.ico.hotel.tools.HabitacionSearchTool habitacionSearchTool;

    private static final String MENSAJE_SALUDO_RECEPCION =
            "¡Hola! Bienvenido a Hotel Paraíso y Hotel Paraíso Ejecutivo. Soy su Recepcionista Virtual.\n\n" +
            "Con gusto le asisto con información sobre nuestros hoteles, disponibilidad de habitaciones, categorías, tarifas y políticas de estancia (como horarios de check-in/check-out, cancelaciones, anticipos y reglas de hospedaje).\n\n" +
            "¿En qué puedo ayudarle hoy?";

    private boolean isGreetingOrIntro(String text) {
        if (text == null || text.isBlank()) return false;
        String normalized = java.text.Normalizer.normalize(text.trim().toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        // Si incluye términos operativos específicos de hotelería, no es un simple saludo sino una consulta
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

        // Intenciones de saludo, cortesía o presentación
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
        String convId = (conversationId != null && !conversationId.isBlank()) ? conversationId : DEFAULT_CONVERSATION_ID;
        log.info("Hotel Chat request - modelo: {}, conversationId: {}", model, convId);
        if (isGreetingOrIntro(prompt)) {
            return MENSAJE_SALUDO_RECEPCION;
        }

        habitacionSearchTool.resetCallTracker();
        com.ico.hotel.tools.HabitacionSearchTool.CURRENT_USER_PROMPT.set(prompt);
        try {
            var chatResponse = clientResolver.resolve(model)
                    .prompt(prompt)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, convId))
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
            com.ico.hotel.tools.HabitacionSearchTool.CURRENT_USER_PROMPT.remove();
        }
    }

    @Override
    public Flux<String> chatStream(String prompt, String model) {
        return chatStream(prompt, model, DEFAULT_CONVERSATION_ID);
    }

    @Override
    public Flux<String> chatStream(String prompt, String model, String conversationId) {
        String convId = (conversationId != null && !conversationId.isBlank()) ? conversationId : DEFAULT_CONVERSATION_ID;
        log.info("Hotel Stream request - modelo: {}, conversationId: {}", model, convId);
        if (isGreetingOrIntro(prompt)) {
            return Flux.just(MENSAJE_SALUDO_RECEPCION);
        }

        try {
            return clientResolver.resolve(model)
                    .prompt(prompt)
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, convId))
                    .stream()
                    .content()
                    .onErrorResume(e -> {
                        log.error("Error en streaming con el modelo AI ({}): {}", model, e.getMessage());
                        return Flux.just(obtenerMensajeErrorAmigable(model, e));
                    });
        } catch (Exception e) {
            log.error("Error inicial al iniciar stream con el modelo AI ({}): {}", model, e.getMessage(), e);
            return Flux.just(obtenerMensajeErrorAmigable(model, e));
        }
    }

    private String obtenerMensajeErrorAmigable(String model, Throwable ex) {
        boolean isOllama = "ollama".equalsIgnoreCase(model);
        String msg = ex != null && ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";

        if (isOllama && (msg.contains("connection refused") || msg.contains("connectexception") || msg.contains("timeout"))) {
            return "⚠️ En este momento el servicio local de Ollama no se encuentra disponible. Por favor, asegúrate de que Ollama esté iniciado en tu equipo o cambia el selector superior a 'Gemini'. Intenta de nuevo en 1 minuto.";
        }

        if (!isOllama && (msg.contains("quota") || msg.contains("rate limit") || msg.contains("429") || msg.contains("resource_exhausted"))) {
            return "⚠️ El asistente de Google Gemini ha alcanzado temporalmente el límite de solicitudes. Por favor, espera 1 minuto e intenta de nuevo, o prueba cambiando a 'Ollama'.";
        }

        return "⚠️ El asistente virtual se encuentra temporalmente ocupado o experimentando dificultades de conexión. Por favor, intenta de nuevo en 1 minuto.";
    }

    private String cleanRedundantButtons(String prompt, String content) {
        if (content == null || content.isBlank()) return content;

        // Normalizar botones que hayan sido envueltos en negritas por el LLM: [**BOTON: ...**] -> [BOTON: ...]
        content = content.replaceAll("\\[\\*{1,2}BOTON:\\s*", "[BOTON: ")
                         .replaceAll("\\s*\\*{1,2}\\]", "]");

        String normPrompt = java.text.Normalizer.normalize(prompt.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        boolean hasTable = content.contains("| ---") || content.contains("|:---") || content.contains("| :---") || content.contains("|---");
        boolean hasButtons = content.contains("[BOTON:");
        boolean wasButtonClick = normPrompt.startsWith("mostrar el detalle") || normPrompt.startsWith("mostrar la habitacion");
        boolean mentionsSpecificHotel = normPrompt.contains("ejecutiv") || (normPrompt.contains("paraiso") && !normPrompt.contains("ambos"));

        // CASO A: El usuario ya especificó un hotel, o ya pulsó un botón ("Mostrar el detalle...", "Mostrar la habitación..."):
        // En estos casos SIEMPRE debe mostrarse la información directa / tabla, y NUNCA deben aparecer botones ("para que colocar botones de algo que ya me mostro").
        if (wasButtonClick || mentionsSpecificHotel) {
            String cleaned = content.replaceAll("\\[BOTON:[^\\]]+\\]", "").trim();
            // Remover preguntas o textos de selección redundantes y viñetas vacías
            cleaned = cleaned.replaceAll("(?i)(\\*\\*\\s*)?(opciones?|botones?|seleccione|elija|acciones?)[^:\n]*:?(\\s*\\*\\*)?", "")
                             .replaceAll("(?i)(¿?de\\s*qu[eé]\\s*propiedad\\s*desea\\s*consultar[^\n]*|por\\s*favor,?\\s*seleccione[^\n]*|puede\\s*(seleccionar|elegir)[^\n]*)", "")
                             .replaceAll("(?m)^\\s*[-*•]\\s*$", "")
                             .replaceAll("(?i)(\\n\\s*por\\s*favor,?\\s*$|\\n\\s*puede\\s*seleccionar:?\\s*$)", "")
                             .replaceAll("\n{3,}", "\n\n")
                             .trim();
            return cleaned;
        }

        // CASO B: Consulta general (Paso 1, ej. "Me podrías dar las habitaciones en mantenimiento", "informacion de la habitacion 101"):
        // Si hay botones, NO debe mostrar tablas todavía ("para que colocar botones de algo que ya me mostro").
        // Los botones van antes de la tabla; al presionar el botón se mostrará el detalle.
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

        // Si ya tiene tabla y no es Paso 1, asegurar que no queden botones
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
