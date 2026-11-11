package com.ico.hotel.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro stateless que intercepta cada petición HTTP, valida el token Bearer JWT
 * y verifica que la sesión no haya sido cerrada ni la cuenta deshabilitada.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtService.parseClaims(token);
            String jti = claims.getId();
            if (tokenBlacklistService.isRevoked(jti) || tokenBlacklistService.isRevoked(token)) {
                request.setAttribute("jwt_error", "La sesión ha sido cerrada. Por favor inicie sesión nuevamente.");
                filterChain.doFilter(request, response);
                return;
            }

            Integer userId = Integer.valueOf(claims.getSubject());
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                CustomUserDetails userDetails = userDetailsService.loadUserById(userId);
                Object verObj = claims.get("ver");
                int tokenVer = (verObj instanceof Number n) ? n.intValue() : 0;
                int actualVer = userDetails.getTokenVersion() != null ? userDetails.getTokenVersion() : 0;
                if (tokenVer != actualVer) {
                    request.setAttribute("jwt_error", "La sesión fue revocada. Por favor inicie sesión nuevamente.");
                } else if (userDetails.isEnabled() && userDetails.isAccountNonLocked()) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    request.setAttribute("jwt_error", "La cuenta de usuario no está verificada o ha sido desactivada.");
                }
            }
        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            request.setAttribute("jwt_error", "Su sesión ha expirado. Por favor inicie sesión nuevamente.");
        } catch (Exception ex) {
            request.setAttribute("jwt_error", "Token de autenticación inválido.");
        }

        filterChain.doFilter(request, response);
    }
}
