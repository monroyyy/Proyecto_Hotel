package com.ico.hotel;

import com.ico.hotel.services.HotelChatService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class OllamaReceptionistPolicyTest {

    @Autowired
    private HotelChatService hotelChatService;

    @Test
    @DisplayName("1. Cancelación a 50 horas (debe reembolsar exactamente 50% del anticipo)")
    void testCancelacionPolicy() {
        String convId = UUID.randomUUID().toString();
        String prompt = "Un cliente llama para cancelar su reservación a 50 horas de la fecha de llegada, ¿cuánto porcentaje de anticipo se le reembolsa y qué requisitos necesitamos?";
        System.out.println("\n>>> [1] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response).contains("50%");
        assertThat(response.toLowerCase()).contains("clabe");
    }

    @Test
    @DisplayName("2. Pre-reserva y plazo de apartado sin pago")
    void testPreReservaPolicy() {
        String convId = UUID.randomUUID().toString();
        String prompt = "¿Cuánto tiempo de tolerancia tiene un cliente para enviar el comprobante de anticipo de una pre-reserva antes de que se libere la habitación?";
        System.out.println("\n>>> [2] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response).contains("24");
        assertThat(response).contains("48");
    }

    @Test
    @DisplayName("3. Protocolo de No-Show a las 10:00 PM")
    void testNoShowPolicy() {
        String convId = UUID.randomUUID().toString();
        String prompt = "Son las 10:00 PM y un huésped no se presentó ni contestó llamadas. ¿Cuál es el procedimiento oficial para No-Show?";
        System.out.println("\n>>> [3] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response.toLowerCase()).containsAnyOf("no-show", "no show");
        assertThat(response.toLowerCase()).containsAnyOf("libera", "anticipo", "walk-in");
    }

    @Test
    @DisplayName("4. Protocolo de Sobreventa (Overbooking)")
    void testOverbookingPolicy() {
        String convId = UUID.randomUUID().toString();
        String prompt = "¿Qué protocolo debemos seguir si ocurre una sobreventa o duplicidad de habitación por error en recepción?";
        System.out.println("\n>>> [4] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response.toLowerCase()).containsAnyOf("convenio", "taxi", "reubica");
    }

    @Test
    @DisplayName("5. Habitaciones en Planta Baja y accesibilidad")
    void testPlantaBajaPolicy() {
        String convId = UUID.randomUUID().toString();
        String prompt = "Llegó un cliente de la tercera edad en silla de ruedas pidiendo habitación en planta baja. ¿Cuántas habitaciones tenemos en planta baja y qué prioridad tienen?";
        System.out.println("\n>>> [5] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response.toLowerCase()).containsAnyOf("101", "102", "4", "cuatro");
        assertThat(response.toLowerCase()).containsAnyOf("prioridad", "movilidad", "tercera edad", "silla");
    }

    @Test
    @DisplayName("6. Cotización de estancia (Tarifa x noches y anticipo)")
    void testCotizacionEstancia() {
        String convId = UUID.randomUUID().toString();
        String prompt = "Un cliente pide cotizar 4 noches en una Habitación Individual del Hotel Paraíso. ¿Cuánto es el total y cuánto debe dejar de anticipo para confirmar?";
        System.out.println("\n>>> [6] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response).containsAnyOf("3,400", "3400");
        assertThat(response).containsAnyOf("1,700", "1700");
    }

    @Test
    @DisplayName("7. Filtro estricto fuera de tema")
    void testFueraDeTema() {
        String convId = UUID.randomUUID().toString();
        String prompt = "¿Quién ganó el mundial de fútbol en Qatar 2022?";
        System.out.println("\n>>> [7] PROMPT: " + prompt);
        String response = hotelChatService.chat(prompt, "ollama", convId);
        System.out.println(">>> RESPUESTA:\n" + response);

        assertThat(response.toLowerCase()).containsAnyOf("recepcionista", "disculpe", "únicamente", "hotel");
    }
}
