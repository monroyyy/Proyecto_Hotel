package com.ico.hotel.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.ToolCallingAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.ollama.api.OllamaChatOptions;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
public class OllamaToolCallingAdvisor extends ToolCallingAdvisor {

    public OllamaToolCallingAdvisor(ToolCallingManager toolCallingManager) {
        super(toolCallingManager, DEFAULT_TOOL_EXECUTION_ELIGIBILITY_CHECKER, DEFAULT_ORDER, true);
    }

    private boolean isAwaitingFinalResponse(List<Message> instructions) {
        if (instructions == null || instructions.isEmpty()) {
            return false;
        }
        Message lastMessage = instructions.get(instructions.size() - 1);
        return lastMessage instanceof ToolResponseMessage;
    }

    /**
     * Convierte el resultado de la herramienta en un mensaje de contexto directo y limpia las definiciones
     * de herramientas para que Llama 3.1 redacte la respuesta final rápidamente sin quedarse en bucle
     * ni fallar por mensajes role="tool" huérfanos cuando tools=[].
     */
    private Prompt buildFinalSynthesisPrompt(List<Message> instructions, ChatOptions options) {
        ToolResponseMessage toolMsg = (ToolResponseMessage) instructions.get(instructions.size() - 1);
        String datosHerramienta = toolMsg.getResponses().stream()
                .map(r -> r.name() + ": " + r.responseData())
                .collect(Collectors.joining("\n\n"));

        List<Message> cleanInstructions = new ArrayList<>();
        for (int i = 0; i < instructions.size() - 1; i++) {
            Message m = instructions.get(i);
            // Omitir el AssistantMessage intermedio que solo contenía toolCalls vacíos de texto
            if (m instanceof AssistantMessage am && (am.getText() == null || am.getText().isBlank()) && am.hasToolCalls()) {
                continue;
            }
            cleanInstructions.add(m);
        }

        cleanInstructions.add(new UserMessage(
                "Datos obtenidos del sistema:\n" + datosHerramienta +
                "\n\nPresenta esta información directamente al usuario en español con trato formal. No incluyas encabezados como 'Respuesta al usuario:' ni menciones instrucciones internas."
        ));

        ToolCallingChatOptions newOptions;
        if (options instanceof OllamaChatOptions ollamaOptions) {
            newOptions = ollamaOptions.mutate()
                    .model(ollamaOptions.getModel() != null ? ollamaOptions.getModel() : "llama3.2:latest")
                    .toolCallbacks(List.of())
                    .build();
        } else if (options instanceof ToolCallingChatOptions toolOptions) {
            newOptions = toolOptions.mutate()
                    .toolCallbacks(List.of())
                    .build();
        } else {
            newOptions = OllamaChatOptions.builder()
                    .model("llama3.2:latest")
                    .toolCallbacks(List.of())
                    .build();
        }

        return new Prompt(cleanInstructions, newOptions);
    }

    private boolean requiresToolExecution(List<Message> instructions) {
        if (instructions == null || instructions.isEmpty()) return false;
        Message last = instructions.get(instructions.size() - 1);
        String text = last.getText();
        if (text == null) return false;
        String lower = text.toLowerCase();
        // Solo habilitar las 45 herramientas cuando el usuario está confirmando o cotizando con fechas/teléfono específicos
        boolean hasIsoDate = java.util.regex.Pattern.compile("\\b202\\d-\\d{2}-\\d{2}\\b").matcher(lower).find();
        boolean hasPhone = java.util.regex.Pattern.compile("\\b\\d{10}\\b").matcher(lower).find();
        return (hasIsoDate && hasPhone) || lower.contains("confirmo") || lower.contains("presupuesto");
    }

    private Prompt stripToolsFromPrompt(List<Message> instructions, ChatOptions options) {
        ToolCallingChatOptions newOptions;
        if (options instanceof OllamaChatOptions ollamaOptions) {
            newOptions = ollamaOptions.mutate()
                    .model(ollamaOptions.getModel() != null ? ollamaOptions.getModel() : "llama3.2:latest")
                    .toolCallbacks(List.of())
                    .build();
        } else if (options instanceof ToolCallingChatOptions toolOptions) {
            newOptions = toolOptions.mutate()
                    .toolCallbacks(List.of())
                    .build();
        } else {
            newOptions = OllamaChatOptions.builder()
                    .model("llama3.2:latest")
                    .toolCallbacks(List.of())
                    .build();
        }
        return new Prompt(instructions, newOptions);
    }

    @Override
    protected ChatClientRequest doBeforeCall(ChatClientRequest chatClientRequest, CallAdvisorChain callAdvisorChain) {
        var instructions = chatClientRequest.prompt().getInstructions();

        if (isAwaitingFinalResponse(instructions)) {
            log.info("OllamaToolCallingAdvisor: Sintetizando respuesta final con datos de herramienta.");
            Prompt finalPrompt = buildFinalSynthesisPrompt(instructions, chatClientRequest.prompt().getOptions());
            return ChatClientRequest.builder()
                    .prompt(finalPrompt)
                    .context(chatClientRequest.context())
                    .build();
        }
        if (!requiresToolExecution(instructions)) {
            Prompt fastPrompt = stripToolsFromPrompt(instructions, chatClientRequest.prompt().getOptions());
            return ChatClientRequest.builder()
                    .prompt(fastPrompt)
                    .context(chatClientRequest.context())
                    .build();
        }
        return super.doBeforeCall(chatClientRequest, callAdvisorChain);
    }

    @Override
    protected ChatClientRequest doBeforeStream(ChatClientRequest chatClientRequest, StreamAdvisorChain streamAdvisorChain) {
        var instructions = chatClientRequest.prompt().getInstructions();

        if (isAwaitingFinalResponse(instructions)) {
            log.info("OllamaToolCallingAdvisor (Stream): Sintetizando respuesta final con datos de herramienta.");
            Prompt finalPrompt = buildFinalSynthesisPrompt(instructions, chatClientRequest.prompt().getOptions());
            return ChatClientRequest.builder()
                    .prompt(finalPrompt)
                    .context(chatClientRequest.context())
                    .build();
        }
        if (!requiresToolExecution(instructions)) {
            Prompt fastPrompt = stripToolsFromPrompt(instructions, chatClientRequest.prompt().getOptions());
            return ChatClientRequest.builder()
                    .prompt(fastPrompt)
                    .context(chatClientRequest.context())
                    .build();
        }
        return super.doBeforeStream(chatClientRequest, streamAdvisorChain);
    }
}
