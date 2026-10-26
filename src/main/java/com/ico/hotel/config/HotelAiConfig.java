package com.ico.hotel.config;

import com.ico.hotel.tools.HotelPolicyTool;
import com.ico.hotel.tools.HotelSearchTool;
import com.ico.hotel.tools.HabitacionSearchTool;
import com.ico.hotel.tools.TipoHabitacionTool;
import com.ico.hotel.tools.ReservaTool;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.model.tool.DefaultToolCallingManager;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.resolution.StaticToolCallbackResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class HotelAiConfig {

    @Value("classpath:prompts/system-prompt.st")
    private Resource systemPromptResource;

    private final HotelSearchTool hotelSearchTool;
    private final HabitacionSearchTool habitacionSearchTool;
    private final TipoHabitacionTool tipoHabitacionTool;
    private final HotelPolicyTool hotelPolicyTool;
    private final ReservaTool reservaTool;
    private final ChatMemory chatMemory;

    @Bean("geminiClient")
    ChatClient geminiClient(GoogleGenAiChatModel chatModel) throws IOException {
        String systemPrompt = systemPromptResource.getContentAsString(StandardCharsets.UTF_8)
                .replace("{currentDate}", LocalDate.now().toString());
        return ChatClient.builder(chatModel)
                .defaultSystem(systemPrompt)
                .defaultTools(hotelSearchTool, habitacionSearchTool, tipoHabitacionTool, hotelPolicyTool, reservaTool)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
    }

    @Bean("ollamaClient")
    ChatClient ollamaClient(OllamaChatModel chatModel) throws IOException {
        String systemPrompt = systemPromptResource.getContentAsString(StandardCharsets.UTF_8)
                .replace("{currentDate}", LocalDate.now().toString());

        List<ToolCallback> toolCallbacks = Arrays.asList(ToolCallbacks.from(hotelSearchTool, habitacionSearchTool, tipoHabitacionTool, hotelPolicyTool, reservaTool));
        ToolCallingManager toolCallingManager = DefaultToolCallingManager.builder()
                .toolCallbackResolver(new StaticToolCallbackResolver(toolCallbacks))
                .build();

        return ChatClient.builder(chatModel)
                .defaultSystem(systemPrompt)
                .defaultTools(hotelSearchTool, habitacionSearchTool, tipoHabitacionTool, hotelPolicyTool, reservaTool)
                .defaultAdvisors(
                        new OllamaToolCallingAdvisor(toolCallingManager),
                        MessageChatMemoryAdvisor.builder(chatMemory).build()
                )
                .build();
    }
}
