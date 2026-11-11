package com.ico.hotel.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Token de verificación de correo electrónico: aleatorio, seguro, de un solo uso y con expiración.
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "token_verificacion", uniqueConstraints = {
        @UniqueConstraint(name = "uk_token_verificacion_token", columnNames = "token")
})
public class TokenVerificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_token")
    private Integer idToken;

    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @Column(name = "codigo", length = 10)
    private String codigo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(nullable = false)
    private Boolean usado = false;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}
