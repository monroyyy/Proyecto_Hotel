package com.ico.hotel.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
public class RegistroRequest {

    @NotBlank(message = "El nombre completo es obligatorio.")
    @Size(min = 3, max = 120, message = "El nombre debe tener entre 3 y 120 caracteres.")
    private String nombre;

    @NotBlank(message = "El correo electrónico es obligatorio.")
    @Email(message = "El correo electrónico debe tener un formato válido.")
    @Pattern(
            regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
            message = "El correo electrónico debe incluir un dominio válido (ejemplo: usuario@dominio.com)."
    )
    private String email;

    // Teléfono celular obligatorio de 10 dígitos para contacto y reservaciones automáticas
    @NotBlank(message = "El número telefónico es obligatorio.")
    @Pattern(
            regexp = "^\\d{10}$",
            message = "El teléfono debe contener exactamente 10 dígitos numéricos."
    )
    private String telefono;

    @ToString.Exclude
    @NotBlank(message = "La contraseña es obligatoria.")
    @Size(min = 8, max = 72, message = "La contraseña debe tener al menos 8 caracteres.")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
            message = "La contraseña debe tener mínimo 8 caracteres e incluir al menos una letra mayúscula, una minúscula y un número."
    )
    private String password;
}
