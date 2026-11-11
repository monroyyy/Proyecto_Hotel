package com.ico.hotel.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Petición para cambio de contraseña por parte del usuario autenticado.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CambioPasswordRequest {

    @NotBlank(message = "La contraseña actual es obligatoria.")
    private String passwordActual;

    @NotBlank(message = "La nueva contraseña es obligatoria.")
    @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres.")
    private String nuevaPassword;

    @NotBlank(message = "La confirmación de la nueva contraseña es obligatoria.")
    private String confirmarPassword;
}
