package com.ico.hotel.dto.auth;

import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponse {

    private Integer idUsuario;
    private String nombre;
    private String email;
    private Rol rol;
    private Boolean verificado;
    private Boolean activo;
    private LocalDateTime fechaCreacion;

    public static UsuarioResponse fromEntity(Usuario u) {
        return UsuarioResponse.builder()
                .idUsuario(u.getIdUsuario())
                .nombre(u.getNombre())
                .email(u.getEmail())
                .rol(u.getRol())
                .verificado(u.getVerificado())
                .activo(u.getActivo())
                .fechaCreacion(u.getFechaCreacion())
                .build();
    }
}
