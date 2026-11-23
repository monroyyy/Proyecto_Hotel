package com.ico.hotel.tools;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.Rol;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class HabitacionSearchTool {

    private final HabitacionRepository habitacionRepository;
    private final HotelRepository hotelRepository;
    private static HotelRepository staticHotelRepository;

    @jakarta.annotation.PostConstruct
    public void init() {
        staticHotelRepository = this.hotelRepository;
    }

    private final ThreadLocal<java.util.concurrent.atomic.AtomicInteger> callCount = ThreadLocal.withInitial(java.util.concurrent.atomic.AtomicInteger::new);
    public static final ThreadLocal<String> CURRENT_USER_PROMPT = new ThreadLocal<>();
    public static final ThreadLocal<CustomUserDetails> CURRENT_AUTH_USER = new ThreadLocal<>();

    public static CustomUserDetails getAuthenticatedUser() {
        CustomUserDetails tl = CURRENT_AUTH_USER.get();
        if (tl != null) return tl;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
            return cud;
        }
        return null;
    }

    public static boolean esHuespedActual() {
        CustomUserDetails u = getAuthenticatedUser();
        return u != null && u.getRol() == Rol.HUESPED;
    }

    private List<Map<String, Object>> respuestaRestringidaHuesped() {
        return List.of(Map.of(
                "accesoRestringido", true,
                "mensaje", "Por políticas de seguridad y privacidad del hotel, la información operativa interna (habitaciones en mantenimiento, habitaciones ocupadas, reportes de turno e ingresos) es exclusiva para el personal autorizado del hotel (Recepción, Gerencia y Administración). Como huésped, con gusto puedo brindarle información sobre habitaciones disponibles, tipos de habitación, tarifas y sus propias reservaciones."
        ));
    }

    public void resetCallTracker() {
        callCount.get().set(0);
    }

    private boolean checkLoop(String toolName) {
        int count = callCount.get().incrementAndGet();
        if (count > 2) {
            log.warn("Límite de llamadas alcanzado para {}. Deteniendo para evitar bucle (count={}).", toolName, count);
            return true;
        }
        return false;
    }

    public static String resolverNombreHotelExacto(String nombreHotel) {
        List<Hotel> hotelesDisponibles = staticHotelRepository != null ? staticHotelRepository.findByActivoTrue() : List.of();

        if (nombreHotel != null && !nombreHotel.isBlank()) {
            String norm = java.text.Normalizer.normalize(nombreHotel.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "");

            // 0. Coincidencia exacta primero ("Hotel Paraíso" no debe resolverse como "Hotel Paraíso Ejecutivo")
            for (Hotel h : hotelesDisponibles) {
                if (h.getNombre() == null) continue;
                String normH = java.text.Normalizer.normalize(h.getNombre().toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "");
                if (norm.equals(normH)) return h.getNombre();
            }

            // 1. Coincidencia exacta o por contención ordenada de mayor a menor longitud
            List<Hotel> ordenados = hotelesDisponibles.stream()
                    .filter(h -> h.getNombre() != null)
                    .sorted((a, b) -> Integer.compare(b.getNombre().length(), a.getNombre().length()))
                    .toList();

            for (Hotel h : ordenados) {
                String normH = java.text.Normalizer.normalize(h.getNombre().toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "");
                if (norm.equals(normH) || norm.contains(normH) || normH.contains(norm)) {
                    return h.getNombre();
                }
            }
            return nombreHotel.trim();
        }

        String prompt = CURRENT_USER_PROMPT.get();
        if (prompt != null && !prompt.isBlank()) {
            String normPrompt = java.text.Normalizer.normalize(prompt.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "");

            if (!normPrompt.contains("ambos") && !normPrompt.contains("toda")) {
                List<Hotel> ordenados = hotelesDisponibles.stream()
                        .filter(h -> h.getNombre() != null)
                        .sorted((a, b) -> Integer.compare(b.getNombre().length(), a.getNombre().length()))
                        .toList();

                for (Hotel h : ordenados) {
                    String normH = java.text.Normalizer.normalize(h.getNombre().toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                            .replaceAll("\\p{M}", "");
                    if (normPrompt.contains(normH)) {
                        return h.getNombre();
                    }
                }
            }
        }
        return null;
    }

    private List<Habitacion> filtrarParaRolActual(List<Habitacion> lista) {
        if (!esHuespedActual()) {
            return lista;
        }
        return lista.stream()
                .filter(h -> "Disponible".equalsIgnoreCase(h.getEstado()))
                .toList();
    }

    @Tool(description = "Buscar habitaciones disponibles en un hotel específico (ej. Hotel Paraíso, Hotel Paraíso Ejecutivo o cualquier hotel registrado). Útil para: 'dame las habitaciones disponibles del Hotel Paraíso', 'habitaciones disponibles en [hotel]'.")
    public List<Map<String, Object>> findDisponiblesEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo, Hotel UAEM", required = false)
            String hotel) {
        log.info("Tool invocada — findDisponiblesEnHotel: hotel={}", hotel);
        if (checkLoop("findDisponiblesEnHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return habitacionRepository.findDisponiblesActivos().stream().map(this::mapearHabitacionSimple).toList();
        }
        return habitacionRepository.findDisponiblesEnHotelActivos(exactHotel).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar las habitaciones de un hotel específico. Si el usuario es ADMINISTRADOR muestra todas; si es HUESPED muestra solo las disponibles.")
    public List<Map<String, Object>> findHabitacionesPorHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo, Hotel UAEM", required = false)
            String hotel) {
        log.info("Tool invocada — findHabitacionesPorHotel: hotel={}", hotel);
        if (checkLoop("findHabitacionesPorHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> base = (exactHotel == null)
                ? habitacionRepository.findAllActivos()
                : habitacionRepository.findByHotelNombreActivos(exactHotel);
        return filtrarParaRolActual(base).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar directamente las habitaciones que están en mantenimiento en toda la cadena. EXCLUSIVO PARA ADMINISTRADOR.")
    public List<Map<String, Object>> findHabitacionesEnMantenimiento() {
        log.info("Tool invocada — findHabitacionesEnMantenimiento");
        if (esHuespedActual()) {
            return respuestaRestringidaHuesped();
        }
        if (checkLoop("findHabitacionesEnMantenimiento")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        return habitacionRepository.findByEstadoActivos("Mantenimiento").stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar las habitaciones que están en mantenimiento en un hotel específico. EXCLUSIVO PARA ADMINISTRADOR.")
    public List<Map<String, Object>> findMantenimientoEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo, Hotel UAEM", required = false)
            String hotel) {
        log.info("Tool invocada — findMantenimientoEnHotel: hotel={}", hotel);
        if (esHuespedActual()) {
            return respuestaRestringidaHuesped();
        }
        if (checkLoop("findMantenimientoEnHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return findHabitacionesEnMantenimiento();
        }
        return habitacionRepository.findByEstadoAndHotelNombreActivos("Mantenimiento", exactHotel).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Consultar los datos de una única habitación específica por su número (ej. 101, 202, 301) y opcionalmente el nombre del hotel.")
    public List<Map<String, Object>> findEstadoHabitacionEnHotel(
            @ToolParam(description = "Número exacto de la habitación, por ejemplo: '101', '201', '202', '301'")
            String numero,
            @ToolParam(description = "Nombre del hotel (ej. 'Hotel Paraíso', 'Hotel Paraíso Ejecutivo', 'Hotel UAEM'), opcional", required = false)
            String hotel) {
        log.info("Tool invocada — findEstadoHabitacionEnHotel: numero={}, hotel={}", numero, hotel);
        if (checkLoop("findEstadoHabitacionEnHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. No llames a más herramientas y procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> lista = (exactHotel == null)
                ? habitacionRepository.findByNumeroActivos(numero)
                : habitacionRepository.findByNumeroAndHotelNombreActivos(numero, exactHotel);
        if (esHuespedActual()) {
            return lista.stream().map(h -> Map.<String, Object>of(
                    "hotel", h.getHotel() != null ? h.getHotel().getNombre() : "N/A",
                    "numero", h.getNumero() != null ? h.getNumero() : "N/A",
                    "piso", h.getPiso() != null ? h.getPiso() : 1,
                    "tipo", h.getTipoHabitacion() != null ? h.getTipoHabitacion().getNombre() : "N/A",
                    "precioBase", h.getTipoHabitacion() != null && h.getTipoHabitacion().getPrecioBase() != null ? h.getTipoHabitacion().getPrecioBase() : BigDecimal.ZERO,
                    "disponibleHoy", "Disponible".equalsIgnoreCase(h.getEstado()) ? "Disponible" : "No disponible en este momento"
            )).toList();
        }
        return lista.stream().map(this::mapearHabitacionSimple).toList();
    }

    private Map<String, Object> mapearHabitacionSimple(Habitacion h) {
        return Map.of(
                "hotel", h.getHotel() != null ? h.getHotel().getNombre() : "N/A",
                "ciudad", h.getHotel() != null && h.getHotel().getCiudad() != null ? h.getHotel().getCiudad() : "Ciudad de México",
                "numero", h.getNumero() != null ? h.getNumero() : "N/A",
                "piso", h.getPiso() != null ? h.getPiso() : 1,
                "estado", h.getEstado() != null ? h.getEstado() : "N/A",
                "tipo", h.getTipoHabitacion() != null ? h.getTipoHabitacion().getNombre() : "N/A",
                "precioBase", h.getTipoHabitacion() != null && h.getTipoHabitacion().getPrecioBase() != null ? h.getTipoHabitacion().getPrecioBase() : BigDecimal.ZERO
        );
    }

    @Tool(description = "Obtener la habitación más cara o exclusiva de toda la cadena hotelera, incluyendo hotel, número, tipo y precio por noche.")
    public List<Map<String, Object>> findHabitacionMasCara() {
        log.info("Tool invocada — findHabitacionMasCara");
        return soloLaPrimera(filtrarParaRolActual(habitacionRepository.findOrdenadasPorPrecioDescActivos()));
    }

    @Tool(description = "Obtener la habitación más cara o exclusiva de un hotel en específico, o de toda la cadena si no se menciona un hotel.")
    public List<Map<String, Object>> findHabitacionMasCaraEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Déjelo vacío si no indicaron hotel.", required = false)
            String hotel) {
        log.info("Tool invocada — findHabitacionMasCaraEnHotel: hotel={}", hotel);
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return soloLaPrimera(filtrarParaRolActual(habitacionRepository.findOrdenadasPorPrecioDescActivos()));
        }
        return soloLaPrimera(filtrarParaRolActual(habitacionRepository.findOrdenadasPorPrecioDescEnHotelActivos(exactHotel)));
    }

    @Tool(description = "Listar todas las habitaciones ocupadas actualmente en la cadena hotelera. EXCLUSIVO PARA ADMINISTRADOR.")
    public List<Map<String, Object>> findHabitacionesOcupadas() {
        log.info("Tool invocada — findHabitacionesOcupadas");
        if (esHuespedActual()) {
            return respuestaRestringidaHuesped();
        }
        return habitacionRepository.findOcupadasActivos().stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar todas las habitaciones disponibles en la cadena hotelera ÚNICAMENTE cuando el usuario NO mencione ningún presupuesto ni límite de precio.")
    public List<Map<String, Object>> findHabitacionesDisponibles() {
        log.info("Tool invocada — findHabitacionesDisponibles");
        if (checkLoop("findHabitacionesDisponibles")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(null);
        if (exactHotel != null) {
            return habitacionRepository.findDisponiblesEnHotelActivos(exactHotel).stream()
                    .map(this::mapearHabitacionSimple)
                    .toList();
        }
        return habitacionRepository.findDisponiblesActivos().stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar las habitaciones de un piso específico (ej. piso 1, 2 o 3) de un hotel.")
    public List<Map<String, Object>> findHabitacionesPorPiso(
            @ToolParam(description = "Número de piso, por ejemplo: 1, 2, 3")
            Integer piso,
            @ToolParam(description = "Nombre del hotel. Déjelo vacío para consultar todas las habitaciones de ese piso en la cadena.", required = false)
            String hotel) {
        log.info("Tool invocada — findHabitacionesPorPiso: piso={}, hotel={}", piso, hotel);
        if (checkLoop("findHabitacionesPorPiso")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        if (piso == null && hotel != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("piso\\s*([1-9])").matcher(hotel.toLowerCase());
            if (m.find()) {
                piso = Integer.parseInt(m.group(1));
            }
        }
        if (piso == null) piso = 1;
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> lista = (exactHotel == null)
                ? habitacionRepository.findByPisoActivos(piso)
                : habitacionRepository.findByHotelNombreAndPisoActivos(exactHotel, piso);
        return filtrarParaRolActual(lista).stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar todas las habitaciones de un tipo específico, por ejemplo: Habitación Individual, Habitación Doble, Habitación Matrimonial, Habitación Familiar o Suite Ejecutiva.")
    public List<Map<String, Object>> findHabitacionesPorTipo(
            @ToolParam(description = "Nombre exacto o aproximado del tipo de habitación, por ejemplo: Suite Ejecutiva, Habitación Familiar")
            String tipoNombre) {
        log.info("Tool invocada — findHabitacionesPorTipo: tipo={}", tipoNombre);
        return filtrarParaRolActual(habitacionRepository.findByTipoNombreActivos(tipoNombre)).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar todas las habitaciones en una ciudad específica (Cancún o Ciudad de México).")
    public List<Map<String, Object>> findHabitacionesPorCiudad(
            @ToolParam(description = "Nombre de la ciudad: Cancún o Ciudad de México")
            String ciudad) {
        log.info("Tool invocada — findHabitacionesPorCiudad: ciudad={}", ciudad);
        if (ciudad != null && (ciudad.toLowerCase().contains("piso") || ciudad.toLowerCase().contains("paraiso") || ciudad.toLowerCase().contains("planta"))) {
            return findHabitacionesPorPiso(1, ciudad);
        }
        return filtrarParaRolActual(habitacionRepository.findByCiudadActivos(ciudad)).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Obtener un resumen de cuántas habitaciones hay por cada estado (Disponible, Ocupada, Mantenimiento) en toda la cadena. EXCLUSIVO PARA ADMINISTRADOR.")
    public List<Map<String, Object>> countHabitacionesPorEstado() {
        log.info("Tool invocada — countHabitacionesPorEstado");
        if (esHuespedActual()) {
            return respuestaRestringidaHuesped();
        }
        return habitacionRepository.countHabitacionesPorEstadoActivos();
    }

    @Tool(description = "Contar el total de habitaciones que existen en toda la cadena hotelera (ambos hoteles juntos).")
    public Long countTotalHabitaciones() {
        log.info("Tool invocada — countTotalHabitaciones");
        return habitacionRepository.countTotalHabitacionesActivos();
    }

    @Tool(description = "Contar cuántas habitaciones están en mantenimiento en toda la cadena hotelera. EXCLUSIVO PARA ADMINISTRADOR.")
    public Object countMantenimiento() {
        log.info("Tool invocada — countMantenimiento");
        if (esHuespedActual()) {
            return respuestaRestringidaHuesped();
        }
        return habitacionRepository.countMantenimientoActivos();
    }

    @Tool(description = "Calcular el ingreso potencial máximo por noche si se rentan todas las habitaciones de la cadena. EXCLUSIVO PARA GERENTE.")
    public Object sumIngresoPotencial() {
        log.info("Tool invocada — sumIngresoPotencial");
        CustomUserDetails u = getAuthenticatedUser();
        if (u == null || !u.isGerente()) {
            return List.of(Map.of(
                    "accesoRestringido", true,
                    "mensaje", "Por políticas de confidencialidad, la información monetaria y de ingresos potenciales del hotel es exclusiva para el Gerente General."
            ));
        }
        return habitacionRepository.sumIngresoPotencialActivos();
    }

    @Tool(description = "Listar las habitaciones disponibles ordenadas de la más barata a la más cara, con su tipo y precio por noche.")
    public List<Map<String, Object>> findDisponiblesOrdenadasPorPrecio() {
        log.info("Tool invocada — findDisponiblesOrdenadasPorPrecio");
        return habitacionRepository.findDisponiblesOrdenadasPorPrecioActivos().stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Obtener las habitaciones con su tipo y su precio por noche.")
    public List<Map<String, Object>> getHabitacionesConTipoYPrecio() {
        log.info("Tool invocada — getHabitacionesConTipoYPrecio");
        if (esHuespedActual()) {
            return habitacionRepository.findDisponiblesActivos().stream().map(this::mapearHabitacionSimple).toList();
        }
        return habitacionRepository.findHabitacionesConTipoYPrecioActivos();
    }

    @Tool(description = "Buscar habitaciones en Planta Baja (Piso 1), con prioridad para personas de la tercera edad o con movilidad reducida (sillas de ruedas).")
    public List<Map<String, Object>> findHabitacionesPlantaBaja(
            @ToolParam(description = "Nombre del hotel (opcional). Déjelo vacío para revisar la planta baja en ambos hoteles.", required = false)
            String hotel) {
        log.info("Tool invocada — findHabitacionesPlantaBaja: hotel={}", hotel);
        if (checkLoop("findHabitacionesPlantaBaja")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> lista = (exactHotel == null)
                ? habitacionRepository.findByPisoActivos(1)
                : habitacionRepository.findByHotelNombreAndPisoActivos(exactHotel, 1);
        return filtrarParaRolActual(lista).stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Buscar habitaciones disponibles que se ajusten a un presupuesto máximo por noche en pesos.")
    public List<Map<String, Object>> findHabitacionesDisponiblesPorPresupuesto(
            @ToolParam(description = "Presupuesto máximo por noche en pesos, ej. 850, 1200, 1500, 2000")
            Double presupuestoMaximo) {
        log.info("Tool invocada — findHabitacionesDisponiblesPorPresupuesto: max={}", presupuestoMaximo);
        if (checkLoop("findHabitacionesDisponiblesPorPresupuesto")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        if (presupuestoMaximo == null) {
            return habitacionRepository.findDisponiblesActivos().stream().map(this::mapearHabitacionSimple).toList();
        }
        BigDecimal max = BigDecimal.valueOf(presupuestoMaximo);
        return habitacionRepository.findDisponiblesActivos().stream()
                .filter(h -> h.getTipoHabitacion() != null &&
                             h.getTipoHabitacion().getPrecioBase() != null &&
                             h.getTipoHabitacion().getPrecioBase().compareTo(max) <= 0)
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Contar cuántas habitaciones disponibles hay desglosadas por cada hotel de la cadena.")
    public List<Map<String, Object>> countDisponiblesPorHotel() {
        log.info("Tool invocada — countDisponiblesPorHotel");
        return habitacionRepository.countDisponiblesPorHotelActivos();
    }

    @Tool(description = "Buscar habitaciones que estén DISPONIBLES en Planta Baja (Piso 1) en un hotel o en toda la cadena.")
    public List<Map<String, Object>> findDisponiblesPlantaBaja(
            @ToolParam(description = "Nombre del hotel (opcional). Por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Dejar vacío para revisar ambos hoteles.", required = false)
            String hotel) {
        log.info("Tool invocada — findDisponiblesPlantaBaja: hotel={}", hotel);
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> piso1 = (exactHotel == null)
                ? habitacionRepository.findByPisoActivos(1)
                : habitacionRepository.findByHotelNombreAndPisoActivos(exactHotel, 1);
        return piso1.stream()
                .filter(h -> "Disponible".equalsIgnoreCase(h.getEstado()))
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Buscar habitaciones que tienen capacidad para 4 personas o huéspedes (Habitación Familiar).")
    public List<Map<String, Object>> findHabitacionesPara4Huespedes() {
        log.info("Tool invocada — findHabitacionesPara4Huespedes");
        return filtrarParaRolActual(habitacionRepository.findHabitacionesPara4HuespedesActivos()).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Obtener el resumen operativo completo o reporte de turno de ocupación: total de habitaciones, disponibles, ocupadas y en mantenimiento. EXCLUSIVO PARA ADMINISTRADOR.")
    public Map<String, Object> getResumenOperativoHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Dejar vacío para toda la cadena.", required = false)
            String hotel) {
        log.info("Tool invocada — getResumenOperativoHotel: hotel={}", hotel);
        if (esHuespedActual()) {
            return respuestaRestringidaHuesped().get(0);
        }
        if (checkLoop("getResumenOperativoHotel")) {
            return Map.of("aviso", "Información suficiente obtenida. Procede a redactar el resumen final ahora.");
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> habitaciones;
        if (exactHotel == null || (hotel != null && hotel.toLowerCase().contains("toda"))) {
            habitaciones = habitacionRepository.findAllActivos();
        } else {
            habitaciones = habitacionRepository.findByHotelNombreActivos(exactHotel);
        }

        long total = habitaciones.size();
        List<String> disponibles = habitaciones.stream().filter(h -> "Disponible".equalsIgnoreCase(h.getEstado())).map(Habitacion::getNumero).toList();
        List<String> ocupadas = habitaciones.stream().filter(h -> "Ocupada".equalsIgnoreCase(h.getEstado())).map(Habitacion::getNumero).toList();
        List<String> mantenimiento = habitaciones.stream().filter(h -> "Mantenimiento".equalsIgnoreCase(h.getEstado())).map(Habitacion::getNumero).toList();
        double porcentaje = total > 0 ? ((double) ocupadas.size() / total) * 100.0 : 0.0;

        String hotelLabel = exactHotel != null ? exactHotel : "Toda la cadena hotelera";
        return Map.of(
                "hotel", hotelLabel,
                "totalHabitaciones", total,
                "totalDisponibles", disponibles.size(),
                "habitacionesDisponibles", disponibles,
                "totalOcupadas", ocupadas.size(),
                "habitacionesOcupadas", ocupadas.isEmpty() ? List.of("Ninguna") : ocupadas,
                "totalMantenimiento", mantenimiento.size(),
                "habitacionesMantenimiento", mantenimiento.isEmpty() ? List.of("Ninguna") : mantenimiento,
                "porcentajeOcupacion", String.format(java.util.Locale.US, "%.1f%%", porcentaje),
                "instruccion", "No llames a ninguna otra herramienta. Presenta este resumen operativo completo de inmediato de forma estructurada y profesional."
        );
    }

    private List<Map<String, Object>> soloLaPrimera(List<Habitacion> habitaciones) {
        return habitaciones.isEmpty() ? List.of() : List.of(mapearHabitacionSimple(habitaciones.get(0)));
    }
}
