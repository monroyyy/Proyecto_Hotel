package com.ico.hotel.security;

import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adaptador de Usuario para el contexto de seguridad de Spring Security.
 */
@Getter
public class CustomUserDetails implements UserDetails {

    private final Integer idUsuario;
    private final String nombre;
    private final String email;
    private final String password;
    private final Rol rol;
    private final boolean verificado;
    private final boolean activo;
    private final Integer tokenVersion;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(Usuario u) {
        this.idUsuario = u.getIdUsuario();
        this.nombre = u.getNombre();
        this.email = u.getEmail();
        this.password = u.getPasswordHash();
        this.rol = u.getRol();
        this.verificado = Boolean.TRUE.equals(u.getVerificado());
        this.activo = !Boolean.FALSE.equals(u.getActivo());
        this.tokenVersion = u.getTokenVersion() != null ? u.getTokenVersion() : 0;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + u.getRol().name()));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return activo;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return activo && verificado;
    }

    public boolean isHuesped() {
        return rol == Rol.HUESPED;
    }

    public boolean isRecepcionista() {
        return rol == Rol.RECEPCIONISTA;
    }

    public boolean isGerente() {
        return rol == Rol.GERENTE;
    }

    public boolean isAdmin() {
        return rol == Rol.ADMINISTRADOR;
    }

    public boolean isStaff() {
        return rol != null && rol != Rol.HUESPED;
    }
}
