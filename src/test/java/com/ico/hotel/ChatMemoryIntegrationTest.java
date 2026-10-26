package com.ico.hotel;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ChatMemoryIntegrationTest {

    @Autowired
    private ChatMemory chatMemory;

    @Test
    @DisplayName("Debe almacenar y recuperar historial para un conversationId específico de recepción")
    void testChatMemoryStoresAndRetrievesMessages() {
        String convId = UUID.randomUUID().toString();

        // 1. Recepcionista pregunta por habitaciones en planta baja
        UserMessage prompt1 = new UserMessage("Tengo un huésped con movilidad reducida, ¿qué habitaciones en planta baja tenemos?");
        AssistantMessage resp1 = new AssistantMessage("Disponemos de 4 habitaciones en planta baja con prioridad estricta para personas con movilidad reducida.");

        chatMemory.add(convId, List.of(prompt1, resp1));

        // 2. Verificar que se recuperan los 2 mensajes
        List<Message> history = chatMemory.get(convId);
        assertThat(history).isNotNull().hasSize(2);
        assertThat(history.get(0).getText()).contains("movilidad reducida");
        assertThat(history.get(1).getText()).contains("prioridad estricta");

        // 3. Segunda interacción de seguimiento
        UserMessage prompt2 = new UserMessage("¿Cuál es el precio de la habitación 101?");
        AssistantMessage resp2 = new AssistantMessage("La habitación 101 tiene una tarifa de $800 por noche.");

        chatMemory.add(convId, List.of(prompt2, resp2));

        // 4. Verificar que ahora hay 4 mensajes acumulados
        List<Message> updatedHistory = chatMemory.get(convId);
        assertThat(updatedHistory).hasSize(4);
        assertThat(updatedHistory.get(2).getText()).contains("precio de la habitación 101");
        assertThat(updatedHistory.get(3).getText()).contains("$800 por noche");
    }

    @Test
    @DisplayName("Debe aislar conversaciones entre diferentes conversationId")
    void testChatMemoryIsolatesDifferentConversations() {
        String convId1 = UUID.randomUUID().toString();
        String convId2 = UUID.randomUUID().toString();

        chatMemory.add(convId1, List.of(new UserMessage("Consulta turno mañana")));
        chatMemory.add(convId2, List.of(new UserMessage("Consulta turno tarde")));

        List<Message> history1 = chatMemory.get(convId1);
        List<Message> history2 = chatMemory.get(convId2);

        assertThat(history1).hasSize(1);
        assertThat(history1.get(0).getText()).isEqualTo("Consulta turno mañana");

        assertThat(history2).hasSize(1);
        assertThat(history2.get(0).getText()).isEqualTo("Consulta turno tarde");
    }

    @Test
    @DisplayName("Debe respetar la ventana máxima de 10 mensajes (MessageWindowChatMemory)")
    void testChatMemoryWindowLimit() {
        String convId = UUID.randomUUID().toString();

        // Agregamos 14 mensajes (7 pares de usuario y asistente)
        for (int i = 1; i <= 7; i++) {
            chatMemory.add(convId, List.of(
                    new UserMessage("Pregunta número " + i),
                    new AssistantMessage("Respuesta número " + i)
            ));
        }

        List<Message> history = chatMemory.get(convId);

        // La ventana configurada es maxMessages(10)
        assertThat(history).hasSize(10);
        // Debe conservar los más recientes (del 3 al 7), descartando el 1 y el 2
        assertThat(history.get(history.size() - 1).getText()).isEqualTo("Respuesta número 7");
    }
}
