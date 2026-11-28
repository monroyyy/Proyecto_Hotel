package com.ico.hotel.controllers;

import com.ico.hotel.dto.HabitacionDTO;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.TipoHabitacion;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.TipoHabitacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controlador REST para la gestión de Habitaciones (Interfaz principal).
 * Provee operaciones CRUD completas, actualización rápida de estado,
 * filtros avanzados y estadísticas para el panel de control.
 */
@RestController
@RequestMapping("/api/habitaciones")
public class HabitacionController {

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    @Autowired
    private com.ico.hotel.repository.ReservaRepository reservaRepository;

    @Autowired
    private com.ico.hotel.services.ReservaService reservaService;

    /**
     * 1. Listar todas las habitaciones con filtros opcionales.
     * Soporta filtrar por hotel, tipo, estado o número.
     */
    @GetMapping
    public List<Habitacion> listarHabitaciones(
            @RequestParam(required = false) Integer idHotel,
            @RequestParam(required = false) Integer idTipo,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Integer piso,
            @RequestParam(required = false, defaultValue = "false") Boolean incluirInactivos
    ) {
        List<Habitacion> filtradas = habitacionRepository.findAll().stream()
                .filter(h -> incluirInactivos || (h.getHotel() == null || !Boolean.FALSE.equals(h.getHotel().getActivo())))
                .filter(h -> idHotel == null || (h.getHotel() != null && h.getHotel().getIdHotel().equals(idHotel)))
                .filter(h -> idTipo == null || (h.getTipoHabitacion() != null && h.getTipoHabitacion().getIdTipo().equals(idTipo)))
                .filter(h -> estado == null || estado.isBlank() || h.getEstado().equalsIgnoreCase(estado))
                .filter(h -> piso == null || (h.getPiso() != null && h.getPiso().equals(piso)))
                .toList();
        reservaService.enriquecerHabitaciones(filtradas);
        ocultarDatosSensibles(filtradas);
        return filtradas;
    }

    /**
     * Oculta datos de reservaciones ajenas a quien no es personal del hotel:
     * - Visitantes anónimos y huéspedes: se omiten los folios (folioActivo y folio en periodosOcupados).
     * - Visitantes anónimos: además se omiten los identificadores internos de reservación.
     * Las fechas ocupadas se conservan porque el portal las necesita para mostrar disponibilidad.
     */
    private void ocultarDatosSensibles(List<Habitacion> habitaciones) {
        com.ico.hotel.security.CustomUserDetails actual = reservaService.obtenerUsuarioActual();
        if (actual != null && actual.isStaff()) {
            return;
        }
        boolean anonimo = actual == null;
        for (Habitacion h : habitaciones) {
            h.setFolioActivo(null);
            if (anonimo) {
                h.setIdReservaActiva(null);
            }
            if (h.getPeriodosOcupados() != null) {
                List<Map<String, Object>> limpios = new ArrayList<>();
                for (Map<String, Object> periodo : h.getPeriodosOcupados()) {
                    Map<String, Object> copia = new LinkedHashMap<>(periodo);
                    copia.remove("folio");
                    if (anonimo) {
                        copia.remove("idReserva");
                    }
                    limpios.add(copia);
                }
                h.setPeriodosOcupados(limpios);
            }
        }
    }

    /**
     * 2. Obtener una habitación por su identificador único (ID).
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }
        Habitacion h = habitacionOpt.get();
        reservaService.enriquecerHabitacion(h);
        ocultarDatosSensibles(List.of(h));
        return ResponseEntity.ok(h);
    }

    /**
     * 3. Registrar una nueva habitación.
     * Valida que el hotel y el tipo de habitación existan en la base de datos.
     */
    @PostMapping
    public ResponseEntity<?> crearHabitacion(@RequestBody HabitacionDTO dto) {
        if (dto.getNumero() == null || dto.getNumero().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El número de habitación es obligatorio."));
        }
        // Limitar longitud y bloquear etiquetas HTML en el número de habitación
        String numTrimCrear = dto.getNumero().trim();
        if (numTrimCrear.length() > 20 || numTrimCrear.contains("<") || numTrimCrear.contains(">")) {
            return ResponseEntity.badRequest().body(Map.of("error", "El número de habitación debe tener máximo 20 caracteres y sin etiquetas HTML."));
        }
        if (dto.getIdHotel() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar un hotel válido."));
        }
        if (dto.getIdTipo() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar un tipo de habitación válido."));
        }
        if (dto.getPiso() == null || dto.getPiso() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Piso inválido. Debe seleccionar un piso existente."));
        }

        Optional<Hotel> hotelOpt = hotelRepository.findById(dto.getIdHotel());
        if (hotelOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El hotel seleccionado no existe."));
        }
        if (hotelOpt.get().getActivo() != null && !hotelOpt.get().getActivo()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No se pueden registrar o asignar habitaciones a un hotel inactivo."));
        }

        Optional<TipoHabitacion> tipoOpt = tipoHabitacionRepository.findById(dto.getIdTipo());
        if (tipoOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El tipo de habitación seleccionado no existe."));
        }

        // Regla de negocio (Pág. 5): El número de habitación no puede repetirse dentro del mismo hotel
        String numeroLimpo = dto.getNumero().trim();
        if (habitacionRepository.existsByHotelIdHotelAndNumeroIgnoreCase(dto.getIdHotel(), numeroLimpo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                "Ya existe una habitación con ese número (" + numeroLimpo + ") en este hotel."));
        }

        Habitacion nueva = new Habitacion();
        nueva.setNumero(dto.getNumero().trim());
        nueva.setPiso(dto.getPiso());
        nueva.setEstado(dto.getEstado() != null && !dto.getEstado().isBlank() ? dto.getEstado() : "Disponible");
        nueva.setHotel(hotelOpt.get());
        nueva.setTipoHabitacion(tipoOpt.get());

        Habitacion guardada = habitacionRepository.save(nueva);
        reservaService.enriquecerHabitacion(guardada);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardada);
    }

    /**
     * 4. Actualizar una habitación existente por ID.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarHabitacion(@PathVariable Integer id, @RequestBody HabitacionDTO dto) {
        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }

        Habitacion habitacion = habitacionOpt.get();

        Integer hotelIdDestino = dto.getIdHotel() != null ? dto.getIdHotel() : (habitacion.getHotel() != null ? habitacion.getHotel().getIdHotel() : null);
        String numeroDestino = dto.getNumero() != null && !dto.getNumero().trim().isEmpty() ? dto.getNumero().trim() : habitacion.getNumero();

        // Validar unicidad si cambia el número o el hotel
        if (hotelIdDestino != null && numeroDestino != null) {
            if (habitacionRepository.existsByHotelIdHotelAndNumeroIgnoreCaseAndIdHabitacionNot(hotelIdDestino, numeroDestino, id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                    "Ya existe una habitación con ese número (" + numeroDestino + ") en este hotel."));
            }
        }

        if (dto.getNumero() != null && !dto.getNumero().trim().isEmpty()) {
            String numTrimEdit = dto.getNumero().trim();
            if (numTrimEdit.length() > 20 || numTrimEdit.contains("<") || numTrimEdit.contains(">")) {
                return ResponseEntity.badRequest().body(Map.of("error", "El número de habitación debe tener máximo 20 caracteres y sin etiquetas HTML."));
            }
            habitacion.setNumero(numTrimEdit);
        }
        if (dto.getPiso() != null) {
            if (dto.getPiso() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Piso inválido. Debe seleccionar un piso existente."));
            }
            habitacion.setPiso(dto.getPiso());
        }
        if (dto.getEstado() != null && !dto.getEstado().isBlank()) {
            String nuevoEstado = dto.getEstado().trim();
            // Impedir pasar a Mantenimiento si la habitación tiene reservaciones Confirmadas u Ocupadas
            if ("Mantenimiento".equalsIgnoreCase(nuevoEstado)) {
                long bloqueantes = reservaRepository.findActivasByHabitacion(id).stream()
                        .filter(r -> "Confirmada".equalsIgnoreCase(r.getEstado()) || "Ocupada".equalsIgnoreCase(r.getEstado()))
                        .count();
                if (bloqueantes > 0) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                            "error", "No se puede poner la habitación #" + habitacion.getNumero()
                                    + " en Mantenimiento porque tiene " + bloqueantes + " reservación(es) Confirmada(s) u Ocupada(s)."
                    ));
                }
            }
            habitacion.setEstado(nuevoEstado);
            if ("Disponible".equalsIgnoreCase(nuevoEstado) || "Mantenimiento".equalsIgnoreCase(nuevoEstado)) {
                reservaService.cancelarPreReservasDeHabitacion(id, "Liberada por administración al modificar estado de habitación a " + nuevoEstado);
            }
        }

        if (dto.getIdHotel() != null) {
            Optional<Hotel> hotelOpt = hotelRepository.findById(dto.getIdHotel());
            if (hotelOpt.isPresent()) {
                if (hotelOpt.get().getActivo() != null && !hotelOpt.get().getActivo()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "No se puede asignar una habitación a un hotel inactivo."));
                }
                habitacion.setHotel(hotelOpt.get());
            }
        }

        if (dto.getIdTipo() != null) {
            Optional<TipoHabitacion> tipoOpt = tipoHabitacionRepository.findById(dto.getIdTipo());
            if (tipoOpt.isPresent()) {
                habitacion.setTipoHabitacion(tipoOpt.get());
            }
        }

        Habitacion actualizada = habitacionRepository.save(habitacion);
        reservaService.enriquecerHabitacion(actualizada);
        return ResponseEntity.ok(actualizada);
    }

    /**
     * 5. Cambio rápido de estado (Disponible, Ocupada, Mantenimiento).
     * Ideal para acciones de un solo clic desde la tabla de habitaciones.
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        String nuevoEstado = body.get("estado");
        if (nuevoEstado == null || nuevoEstado.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'estado' es requerido."));
        }

        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }

        Habitacion habitacion = habitacionOpt.get();
        String estadoTrim = nuevoEstado.trim();
        // Impedir pasar a Mantenimiento si la habitación tiene reservaciones Confirmadas u Ocupadas
        if ("Mantenimiento".equalsIgnoreCase(estadoTrim)) {
            long bloqueantes = reservaRepository.findActivasByHabitacion(id).stream()
                    .filter(r -> "Confirmada".equalsIgnoreCase(r.getEstado()) || "Ocupada".equalsIgnoreCase(r.getEstado()))
                    .count();
            if (bloqueantes > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "No se puede poner la habitación #" + habitacion.getNumero()
                                + " en Mantenimiento porque tiene " + bloqueantes + " reservación(es) Confirmada(s) u Ocupada(s)."
                ));
            }
        }
        habitacion.setEstado(estadoTrim);
        Habitacion actualizada = habitacionRepository.save(habitacion);

        if ("Disponible".equalsIgnoreCase(estadoTrim) || "Mantenimiento".equalsIgnoreCase(estadoTrim)) {
            reservaService.cancelarPreReservasDeHabitacion(id, "Liberada por administración al modificar estado de habitación a " + estadoTrim);
        }
        reservaService.enriquecerHabitacion(actualizada);

        return ResponseEntity.ok(actualizada);
    }

    /**
     * 6. Eliminar una habitación por ID.
     * Regla: No se puede eliminar habitaciones ocupadas.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarHabitacion(@PathVariable Integer id) {
        Optional<Habitacion> habitacionOpt = habitacionRepository.findById(id);
        if (habitacionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Habitación no encontrada con ID: " + id));
        }

        Habitacion habitacion = habitacionOpt.get();
        if ("Ocupada".equalsIgnoreCase(habitacion.getEstado())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se puede eliminar la habitación #" + habitacion.getNumero() + " porque actualmente está ocupada."));
        }

        // Bloquear eliminación si tiene reservaciones activas o historial registrado (evita HTTP 500 por FK)
        var activas = reservaRepository.findActivasByHabitacion(id);
        if (!activas.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se puede eliminar la habitación #" + habitacion.getNumero()
                            + " porque tiene " + activas.size() + " reservación(es) activa(s)."));
        }
        if (reservaRepository.countByHabitacionIdHabitacion(id) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se puede eliminar la habitación #" + habitacion.getNumero()
                            + " porque cuenta con historial de reservaciones registradas. En su lugar, puede ponerla en Mantenimiento."));
        }

        try {
            habitacionRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("mensaje", "Habitación eliminada exitosamente", "id", id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "No se pudo eliminar la habitación #" + habitacion.getNumero() + " porque tiene registros vinculados."));
        }
    }

    /**
     * 7. Resumen estadístico para tarjetas informativas (KPIs) en la interfaz.
     * Solo toma en cuenta habitaciones pertenecientes a hoteles activos.
     */
    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> obtenerResumen() {
        List<Habitacion> todas = habitacionRepository.findAll().stream()
                .filter(h -> h.getHotel() == null || !Boolean.FALSE.equals(h.getHotel().getActivo()))
                .toList();
        long total = todas.size();
        long disponibles = todas.stream().filter(h -> "Disponible".equalsIgnoreCase(h.getEstado())).count();
        long ocupadas = todas.stream().filter(h -> "Ocupada".equalsIgnoreCase(h.getEstado())).count();
        long mantenimiento = todas.stream().filter(h -> "Mantenimiento".equalsIgnoreCase(h.getEstado())).count();
        long pendientes = todas.stream().filter(h -> "Pendiente".equalsIgnoreCase(h.getEstado())).count();

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("total", total);
        resumen.put("disponibles", disponibles);
        resumen.put("ocupadas", ocupadas);
        resumen.put("mantenimiento", mantenimiento);
        resumen.put("pendientes", pendientes);

        return ResponseEntity.ok(resumen);
    }

    /**
     * 8. Notificaciones de desocupación próxima y liberación de habitaciones.
     */
    @GetMapping("/notificaciones-desocupacion")
    public ResponseEntity<List<Map<String, Object>>> obtenerNotificacionesDesocupacion() {
        return ResponseEntity.ok(
                reservaService.obtenerNotificacionesDesocupacion(reservaService.obtenerUsuarioActual())
        );
    }

    /**
     * 9. Agregar +1 día extra a una habitación actualmente Ocupada (solo si el día siguiente está disponible).
     */
    @PatchMapping("/{id}/dia-extra")
    public ResponseEntity<?> agregarDiaExtraHabitacion(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            int dias = 1;
            if (body != null && body.get("dias") != null) {
                dias = Integer.parseInt(body.get("dias").toString());
            }
            Habitacion actualizada = reservaService.agregarDiaExtraHabitacionOcupada(id, dias);
            return ResponseEntity.ok(actualizada);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage() != null ? e.getMessage() : "No se pudo agregar el día extra."));
        }
    }
}
