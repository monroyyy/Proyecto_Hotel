package com.ico.hotel.security;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.models.TokenRevocado;
import com.ico.hotel.repository.TokenRevocadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio persistente de revocación de JWT en logout (tabla {@code token_revocado}) con caché corta en memoria.
 * <p>
 * Tanto la base de datos como la caché utilizan únicamente el hash SHA-256 hexadecimal del token (64 caracteres),
 * nunca el token JWT original.
 * <p>
 * Nota operativa: la caché negativa ({@code revoked=false} con TTL de 30 s) asume un despliegue de
 * <strong>una sola instancia</strong>; en arquitectura multi-instancia sería necesario desactivar la caché negativa
 * o compartir estado vía Redis/pub-sub.
 */
@Service
public class TokenBlacklistService {

    public static final long NEGATIVE_CACHE_TTL_MS = 30_000L;
    public static final int MAX_CACHE_ENTRIES = 10_000;

    private final TokenRevocadoRepository tokenRevocadoRepository;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private Clock clock;

    @Autowired
    public TokenBlacklistService(TokenRevocadoRepository tokenRevocadoRepository) {
        this.tokenRevocadoRepository = tokenRevocadoRepository;
    }

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    private Clock clockActual() {
        Clock base = clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
        return base.getZone().equals(ClockConfig.ZONA_MEXICO)
                ? base
                : base.withZone(ClockConfig.ZONA_MEXICO);
    }

    public static String hashToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("El token a evaluar no puede ser vacío.");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encoded);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible en la JVM.", ex);
        }
    }

    /**
     * Persiste la revocación del JWT en MySQL primero (de forma idempotente ante logout doble o concurrente)
     * y actualiza la caché local solo si la escritura fue exitosa. Un token ya expirado no se inserta.
     */
    public void revokeToken(String rawToken, Date expiration) {
        if (rawToken == null || rawToken.isBlank() || expiration == null) {
            return;
        }
        Clock clk = clockActual();
        LocalDateTime ahora = LocalDateTime.now(clk);
        LocalDateTime expiraEn = LocalDateTime.ofInstant(expiration.toInstant(), ClockConfig.ZONA_MEXICO);

        // Un token ya expirado no necesita persistirse en token_revocado
        if (!expiraEn.isAfter(ahora)) {
            return;
        }

        String tokenHash = hashToken(rawToken);
        Optional<TokenRevocado> existente = tokenRevocadoRepository.findById(tokenHash);
        if (existente.isPresent()) {
            putCache(tokenHash, new CacheEntry(true, existente.get().getExpiraEn(), Long.MAX_VALUE));
            return;
        }

        TokenRevocado entidad = TokenRevocado.builder()
                .tokenHash(tokenHash)
                .expiraEn(expiraEn)
                .fechaRevocacion(ahora)
                .build();
        try {
            tokenRevocadoRepository.saveAndFlush(entidad);
        } catch (DataIntegrityViolationException ex) {
            // Logout doble concurrente con el mismo token: idempotente si la fila ya quedó persistida
            if (!tokenRevocadoRepository.existsById(tokenHash)) {
                throw ex;
            }
        }
        putCache(tokenHash, new CacheEntry(true, expiraEn, Long.MAX_VALUE));
    }

    /**
     * Verifica si el token fue revocado consultando la caché (clave = SHA-256) y, ante miss, MySQL.
     */
    @Transactional(readOnly = true)
    public boolean isRevoked(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        Clock clk = clockActual();
        LocalDateTime ahora = LocalDateTime.now(clk);
        long nowMillis = clk.millis();
        String tokenHash = hashToken(rawToken);

        CacheEntry cached = cache.get(tokenHash);
        if (cached != null) {
            if (cached.revoked()) {
                if (cached.expiraEn().isAfter(ahora)) {
                    return true;
                }
                cache.remove(tokenHash);
                return false;
            }
            if (nowMillis < cached.cachedUntilMillis()) {
                return false;
            }
            cache.remove(tokenHash);
        }

        Optional<TokenRevocado> enBd = tokenRevocadoRepository.findById(tokenHash);
        if (enBd.isPresent() && enBd.get().getExpiraEn().isAfter(ahora)) {
            putCache(tokenHash, new CacheEntry(true, enBd.get().getExpiraEn(), Long.MAX_VALUE));
            return true;
        }

        putCache(tokenHash, new CacheEntry(false, ahora, nowMillis + NEGATIVE_CACHE_TTL_MS));
        return false;
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    @Transactional
    public int cleanupExpired() {
        Clock clk = clockActual();
        LocalDateTime ahora = LocalDateTime.now(clk);
        long nowMillis = clk.millis();

        int eliminados = tokenRevocadoRepository.deleteExpired(ahora);
        cache.entrySet().removeIf(e -> {
            CacheEntry entry = e.getValue();
            if (entry.revoked()) {
                return !entry.expiraEn().isAfter(ahora);
            }
            return nowMillis >= entry.cachedUntilMillis();
        });
        return eliminados;
    }

    public void clearCacheForTesting() {
        cache.clear();
    }

    public int cacheSizeForTesting() {
        return cache.size();
    }

    private void putCache(String tokenHash, CacheEntry entry) {
        if (cache.size() >= MAX_CACHE_ENTRIES && !cache.containsKey(tokenHash)) {
            Clock clk = clockActual();
            LocalDateTime ahora = LocalDateTime.now(clk);
            long nowMillis = clk.millis();
            cache.entrySet().removeIf(e -> {
                CacheEntry v = e.getValue();
                return v.revoked() ? !v.expiraEn().isAfter(ahora) : nowMillis >= v.cachedUntilMillis();
            });
            if (cache.size() >= MAX_CACHE_ENTRIES) {
                cache.clear();
            }
        }
        cache.put(tokenHash, entry);
    }

    private record CacheEntry(boolean revoked, LocalDateTime expiraEn, long cachedUntilMillis) {
    }
}
