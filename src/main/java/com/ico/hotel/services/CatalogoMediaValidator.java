package com.ico.hotel.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Validación de seguridad para metadata editorial, coordenadas y URLs de imágenes del catálogo.
 */
@Component
public class CatalogoMediaValidator {

    private static final BigDecimal LAT_MIN = new BigDecimal("-90");
    private static final BigDecimal LAT_MAX = new BigDecimal("90");
    private static final BigDecimal LNG_MIN = new BigDecimal("-180");
    private static final BigDecimal LNG_MAX = new BigDecimal("180");

    private final Set<String> allowedDomains;

    public CatalogoMediaValidator(
            @Value("${app.media.allowed-image-domains:images.unsplash.com}") String allowedDomainsCsv) {
        this.allowedDomains = Arrays.stream((allowedDomainsCsv == null ? "" : allowedDomainsCsv).split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    public String validarImagenUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.length() > 500) {
            throw new IllegalArgumentException("La URL de imagen no puede exceder 500 caracteres.");
        }
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("La URL de imagen no tiene un formato válido.");
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("La URL de imagen debe usar exclusivamente protocolo https.");
        }
        if (uri.getRawUserInfo() != null || uri.getUserInfo() != null || trimmed.contains("@")) {
            throw new IllegalArgumentException("La URL de imagen no puede incluir credenciales o userinfo.");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("La URL de imagen debe incluir un dominio válido.");
        }
        String hostLower = host.toLowerCase(Locale.ROOT);
        if (!allowedDomains.contains(hostLower)) {
            throw new IllegalArgumentException(
                    "El dominio '" + hostLower + "' no está en la lista blanca permitida para imágenes."
            );
        }
        return trimmed;
    }

    public String validarTextoPlano(String raw, String campo, int maxLen) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.length() > maxLen) {
            throw new IllegalArgumentException(
                    "El campo '" + campo + "' no puede exceder " + maxLen + " caracteres."
            );
        }
        if (trimmed.contains("<") || trimmed.contains(">")) {
            throw new IllegalArgumentException(
                    "El campo '" + campo + "' debe contener solo texto plano (sin etiquetas HTML)."
            );
        }
        return trimmed;
    }

    public void validarCoordenadas(BigDecimal latitud, BigDecimal longitud) {
        if (latitud == null && longitud == null) {
            return;
        }
        if (latitud == null || longitud == null) {
            throw new IllegalArgumentException("Debe indicar tanto latitud como longitud, o dejar ambas vacías.");
        }
        if (latitud.compareTo(LAT_MIN) < 0 || latitud.compareTo(LAT_MAX) > 0) {
            throw new IllegalArgumentException("La latitud debe estar entre -90 y 90.");
        }
        if (longitud.compareTo(LNG_MIN) < 0 || longitud.compareTo(LNG_MAX) > 0) {
            throw new IllegalArgumentException("La longitud debe estar entre -180 y 180.");
        }
    }
}
