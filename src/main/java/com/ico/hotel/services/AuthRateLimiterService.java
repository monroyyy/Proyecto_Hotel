package com.ico.hotel.services;

import com.ico.hotel.config.ClockConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limitador de tasa en memoria por ventana deslizante (por IP y por correo)
 * para prevenir abuso y fuerza bruta en recuperación de contraseñas.
 */
@Service
public class AuthRateLimiterService {

    public static final int MAX_RECUPERAR_EMAIL_HORA = 5;
    public static final int MAX_RESTABLECER_EMAIL_HORA = 10;
    public static final int MAX_POR_IP_HORA = 25;
    private static final long VENTANA_SEGUNDOS = 3600L;

    private final Map<String, Deque<Instant>> buckets = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private Clock clock;

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
        Deque<Instant> timestamps = buckets.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(corte)) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= limite) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Ha excedido el límite de solicitudes permitidas. Por favor intente nuevamente en una hora."
                );
            }
            timestamps.addLast(ahora);
        }
    }

    public void limpiar() {
        buckets.clear();
    }
}
