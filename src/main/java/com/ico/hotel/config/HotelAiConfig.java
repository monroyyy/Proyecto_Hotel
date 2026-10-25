package com.ico.hotel.config;

import com.ico.hotel.tools.HabitacionSearchTool;
import com.ico.hotel.tools.HotelSearchTool;
import com.ico.hotel.tools.TipoHabitacionTool;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Configuration
@RequiredArgsConstructor
public class HotelAiConfig {

    @Value("classpath:prompts/system-prompt.st")
    private Resource systemPromptResource;

    private final HotelSearchTool hotelSearchTool;
    private final HabitacionSearchTool habitacionSearchTool;
    private final TipoHabitacionTool tipoHabitacionTool;

    @Bean("geminiClient")
    ChatClient geminiClient(GoogleGenAiChatModel chatModel) throws IOException {
        String systemPrompt = systemPromptResource.getContentAsString(StandardCharsets.UTF_8)
                .replace("{currentDate}", LocalDate.now().toString());
        return ChatClient.builder(chatModel)
                .defaultSystem(systemPrompt)
                .defaultTools(hotelSearchTool, habitacionSearchTool, tipoHabitacionTool)
                .build();
    }

    @Bean("ollamaClient")
    ChatClient ollamaClient(OllamaChatModel chatModel) throws IOException {
        String systemPrompt = systemPromptResource.getContentAsString(StandardCharsets.UTF_8)
                .replace("{currentDate}", LocalDate.now().toString());
        return ChatClient.builder(chatModel)
                .defaultSystem(systemPrompt)
                .defaultTools(hotelSearchTool, habitacionSearchTool, tipoHabitacionTool)
                .build();
    }
}
