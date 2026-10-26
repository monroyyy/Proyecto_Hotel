package com.ico.hotel.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.ollama.api.OllamaChatOptions;

import java.util.List;

@Slf4j
public class OllamaToolCallingAdvisor extends ToolCallingAdvisor {

    public OllamaToolCallingAdvisor(ToolCallingManager toolCallingManager) {
        super(toolCallingManager, DEFAULT_TOOL_EXECUTION_ELIGIBILITY_CHECKER, DEFAULT_ORDER, true);
    }

    /**
     * Determina si estamos en la fase intermedia de un turno donde se acaba de ejecutar una herramienta
     * y se requiere que el modelo redacte su respuesta final (el ÚLTIMO mensaje es ToolResponseMessage).
     *
     * IMPORTANTE: NUNCA se debe usar instructions.stream().anyMatch(...) porque si la memoria conversacional
     * contiene un ToolResponseMessage de un turno anterior, deshabilitaría las herramientas para siempre
     * en todas las consultas subsiguientes.
     */
    private boolean isAwaitingFinalResponse(List<Message> instructions) {
        if (instructions == null || instructions.isEmpty()) {
            return false;
        }
        Message lastMessage = instructions.get(instructions.size() - 1);
        return lastMessage instanceof ToolResponseMessage;
    }

    @Override
    protected ChatClientRequest doBeforeCall(ChatClientRequest chatClientRequest, CallAdvisorChain callAdvisorChain) {
        var instructions = chatClientRequest.prompt().getInstructions();

        if (isAwaitingFinalResponse(instructions)) {
            log.info("OllamaToolCallingAdvisor: Último mensaje es ToolResponseMessage. Removiendo herramientas para forzar redacción de respuesta final.");
            ChatOptions options = chatClientRequest.prompt().getOptions();
            ToolCallingChatOptions newOptions;
            if (options instanceof OllamaChatOptions ollamaOptions) {
                newOptions = ollamaOptions.mutate()
                        .model(ollamaOptions.getModel() != null ? ollamaOptions.getModel() : "qwen2.5:3b")
                        .toolCallbacks(List.of())
                        .build();
            } else if (options instanceof ToolCallingChatOptions toolOptions) {
                newOptions = toolOptions.mutate()
                        .toolCallbacks(List.of())
                        .build();
            } else {
                newOptions = OllamaChatOptions.builder()
                        .model("qwen2.5:3b")
                        .toolCallbacks(List.of())
                        .build();
            }

            return ChatClientRequest.builder()
                    .prompt(new Prompt(instructions, newOptions))
                    .context(chatClientRequest.context())
                    .build();
        }
        return super.doBeforeCall(chatClientRequest, callAdvisorChain);
    }

    @Override
    protected ChatClientRequest doBeforeStream(ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain) {
        var instructions = chatClientRequest.prompt().getInstructions();

        if (isAwaitingFinalResponse(instructions)) {
            log.info("OllamaToolCallingAdvisor (Stream): Último mensaje es ToolResponseMessage. Removiendo herramientas para forzar respuesta.");
            ChatOptions options = chatClientRequest.prompt().getOptions();
            ToolCallingChatOptions newOptions;
            if (options instanceof OllamaChatOptions ollamaOptions) {
                newOptions = ollamaOptions.mutate()
                        .model(ollamaOptions.getModel() != null ? ollamaOptions.getModel() : "qwen2.5:3b")
                        .toolCallbacks(List.of())
                        .build();
            } else if (options instanceof ToolCallingChatOptions toolOptions) {
                newOptions = toolOptions.mutate()
                        .toolCallbacks(List.of())
                        .build();
            } else {
                newOptions = OllamaChatOptions.builder()
                        .model("qwen2.5:3b")
                        .toolCallbacks(List.of())
                        .build();
            }

            return ChatClientRequest.builder()
                    .prompt(new Prompt(instructions, newOptions))
                    .context(chatClientRequest.context())
                    .build();
        }
        return super.doBeforeStream(chatClientRequest, streamAdvisorChain);
    }
}
