package com.ico.hotel.services;

import com.ico.hotel.config.ClockConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limitador de tasa en memoria por ventana deslizante (por IP y por correo)
 * para prevenir abuso y fuerza bruta en recuperación de contraseñas.
 * <p>
 * Diseñado para despliegue de <strong>una sola instancia</strong>; cuenta con purga periódica
 * de cubetas vencidas y tope máximo de claves en RAM ({@link #MAX_CLAVES_BUCKET}).
 */
@Service
public class AuthRateLimiterService {

    public static final int MAX_RECUPERAR_EMAIL_HORA = 5;
    public static final int MAX_RESTABLECER_EMAIL_HORA = 10;
    public static final int MAX_POR_IP_HORA = 25;
    public static final int MAX_CLAVES_BUCKET = 10_000;
    private static final long VENTANA_SEGUNDOS = 3600L;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private volatile int maxClaves = MAX_CLAVES_BUCKET;

    @Autowired(required = false)
    private Clock clock;

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    public void setMaxClaves(int maxClaves) {
        if (maxClaves < 1) {
            throw new IllegalArgumentException("maxClaves debe ser al menos 1.");
        }
        this.maxClaves = maxClaves;
    }

    private Clock clockActual() {
        return clock != null ? clock : Clock.system(ClockConfig.ZONA_MEXICO);
    }

    public void validarYRegistrar(String operacion, String ipCliente, String email) {
        String op = (operacion != null && !operacion.isBlank()) ? operacion : "auth";
        int limiteEmail = "restablecer".equals(op) ? MAX_RESTABLECER_EMAIL_HORA : MAX_RECUPERAR_EMAIL_HORA;
        if (ipCliente != null && !ipCliente.isBlank()) {
            consumir("ip:" + op + ":" + ipCliente.trim(), MAX_POR_IP_HORA);
        }
        if (email != null && !email.isBlank()) {
            consumir("email:" + op + ":" + email.trim().toLowerCase(), limiteEmail);
        }
    }

    private void consumir(String key, int limite) {
        Instant ahora = clockActual().instant();
        Instant corte = ahora.minusSeconds(VENTANA_SEGUNDOS);

        if (!buckets.containsKey(key) && buckets.size() >= maxClaves) {
            purgarExpirados();
            if (buckets.size() >= maxClaves) {
                evictOldest();
            }
        }

        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(ahora));
        synchronized (bucket) {
            while (!bucket.timestamps.isEmpty() && bucket.timestamps.peekFirst().isBefore(corte)) {
                bucket.timestamps.pollFirst();
            }
            bucket.ultimoAcceso = ahora;
            if (bucket.timestamps.size() >= limite) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Ha excedido el límite de solicitudes permitidas. Por favor intente nuevamente en una hora."
                );
            }
            bucket.timestamps.addLast(ahora);
        }
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    public int purgarExpirados() {
        Instant corte = clockActual().instant().minusSeconds(VENTANA_SEGUNDOS);
        int removidas = 0;
        for (String key : buckets.keySet().toArray(new String[0])) {
            final boolean[] eliminada = {false};
            buckets.computeIfPresent(key, (k, bucket) -> {
                synchronized (bucket) {
                    while (!bucket.timestamps.isEmpty() && bucket.timestamps.peekFirst().isBefore(corte)) {
                        bucket.timestamps.pollFirst();
                    }
                    if (bucket.timestamps.isEmpty()) {
                        eliminada[0] = true;
                        return null;
                    }
                    return bucket;
                }
            });
            if (eliminada[0]) {
                removidas++;
            }
        }
        return removidas;
    }

    private void evictOldest() {
        int aLiberar = Math.max(1, buckets.size() - maxClaves + 1);
        buckets.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, Bucket>>comparingInt(e -> e.getValue().hitCount())
                        .thenComparing(e -> e.getValue().ultimoAcceso))
                .limit(aLiberar)
                .map(Map.Entry::getKey)
                .forEach(buckets::remove);
    }

    public boolean containsKeyForTesting(String key) {
        return buckets.containsKey(key);
    }

    public int totalClaves() {
        return buckets.size();
    }

    public void limpiar() {
        buckets.clear();
    }

    private static final class Bucket {
        private final Deque<Instant> timestamps = new ArrayDeque<>();
        private volatile Instant ultimoAcceso;

        private Bucket(Instant ultimoAcceso) {
            this.ultimoAcceso = ultimoAcceso;
        }

        private synchronized int hitCount() {
            return timestamps.size();
        }
    }
}
