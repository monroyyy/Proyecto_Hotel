package com.ico.hotel.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Solicitud de actualización del perfil del usuario autenticado (PUT /api/auth/me).
 * El correo electrónico no es editable desde este endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActualizarPerfilRequest {

    @NotBlank(message = "El nombre completo es obligatorio.")
    @Size(max = 120, message = "El nombre completo no puede exceder 120 caracteres.")
    private String nombre;

    @NotBlank(message = "El teléfono de contacto es obligatorio.")
    @Pattern(regexp = "^\\d{10}$", message = "El teléfono debe contener exactamente 10 dígitos numéricos.")
    private String telefono;
}
