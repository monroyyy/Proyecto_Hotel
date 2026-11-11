package com.ico.hotel.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio en memoria para invalidar tokens JWT en el servidor al cerrar sesión (Logout).
 */
@Service
public class TokenBlacklistService {

    // Mapa: JTI (o token) -> epoch millis de expiración
    private final Map<String, Long> revokedTokens = new ConcurrentHashMap<>();

    public void revokeToken(String key, Date expiration) {
        if (key == null || key.isBlank()) return;
        long expMillis = expiration != null ? expiration.getTime() : Instant.now().plusSeconds(3600).toEpochMilli();
        revokedTokens.put(key, expMillis);
    }

    public boolean isRevoked(String key) {
        if (key == null || key.isBlank()) return false;
        Long exp = revokedTokens.get(key);
        if (exp == null) return false;
        if (exp < System.currentTimeMillis()) {
            revokedTokens.remove(key);
            return false;
        }
        return true;
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    public void cleanupExpired() {
        long now = System.currentTimeMillis();
        revokedTokens.entrySet().removeIf(entry -> entry.getValue() < now);
    }
}
