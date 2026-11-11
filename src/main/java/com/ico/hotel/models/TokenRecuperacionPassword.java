package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Código OTP temporal (almacenado únicamente como hash BCrypt) para recuperación de contraseña.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "token_recuperacion_password")
public class TokenRecuperacionPassword {

    public static final int MAX_INTENTOS_POR_DEFECTO = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_token")
    private Integer idToken;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ToString.Exclude
    @Column(name = "codigo_hash", nullable = false, length = 255)
    private String codigoHash;

    @Builder.Default
    @Column(nullable = false)
    private Integer intentos = 0;

    @Builder.Default
    @Column(name = "max_intentos", nullable = false)
    private Integer maxIntentos = MAX_INTENTOS_POR_DEFECTO;

    @Builder.Default
    @Column(nullable = false)
    private Boolean usado = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;
}
