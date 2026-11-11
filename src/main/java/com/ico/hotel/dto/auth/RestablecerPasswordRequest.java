package com.ico.hotel.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * Solicitud para restablecer contraseña validando el código OTP de 6 dígitos.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestablecerPasswordRequest {

    @NotBlank(message = "El correo electrónico es obligatorio.")
    @Email(message = "El correo electrónico debe tener un formato válido.")
    private String email;

    @ToString.Exclude
    @NotBlank(message = "El código de recuperación es obligatorio.")
    @Pattern(regexp = "^\\d{6}$", message = "El código de recuperación debe contener exactamente 6 dígitos.")
    private String codigo;

    @ToString.Exclude
    @NotBlank(message = "La nueva contraseña es obligatoria.")
    @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres.")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
            message = "La contraseña debe tener mínimo 8 caracteres e incluir al menos una letra mayúscula, una minúscula y un número."
    )
    private String nuevaPassword;

    @ToString.Exclude
    private String confirmarPassword;
}
