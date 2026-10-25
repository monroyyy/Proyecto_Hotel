package com.ico.hotel.services;

import com.ico.hotel.config.ClientResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@Slf4j
@RequiredArgsConstructor
public class HotelChatServiceImpl implements HotelChatService {

    private final ClientResolver clientResolver;

    @Override
    public String chat(String prompt, String model) {
        log.info("Hotel Chat request - modelo: {}", model);
        try {
            return clientResolver.resolve(model)
                    .prompt(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Error al comunicarse con el modelo AI ({}): {}", model, e.getMessage(), e);
            return obtenerMensajeErrorAmigable(model, e);
        }
    }

    @Override
    public Flux<String> chatStream(String prompt, String model) {
        log.info("Hotel Stream request - modelo: {}", model);
        try {
            return clientResolver.resolve(model)
                    .prompt(prompt)
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

        if (!isOllama && (msg.contains("quota") || msg.contains("rate limit") || msg.contains("429"))) {
            return "⚠️ El asistente de Google Gemini ha alcanzado temporalmente el límite de solicitudes. Por favor, espera 1 minuto e intenta de nuevo, o prueba cambiando a 'Ollama'.";
        }

        return "⚠️ El asistente virtual se encuentra temporalmente ocupado o experimentando dificultades de conexión. Por favor, intenta de nuevo en 1 minuto.";
    }
}
