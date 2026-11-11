package com.ico.hotel.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Solicitud de envío de código OTP de recuperación de contraseña.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecuperarPasswordRequest {

    @NotBlank(message = "El correo electrónico es obligatorio.")
    @Email(message = "El correo electrónico debe tener un formato válido.")
    private String email;
}
