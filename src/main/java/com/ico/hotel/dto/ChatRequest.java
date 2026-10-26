package com.ico.hotel.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank(message = "El prompt no puede estar vacío")
        String prompt,
        String model,
        String conversationId
) {
}
