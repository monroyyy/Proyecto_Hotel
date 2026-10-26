package com.ico.hotel.tools;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.repository.HabitacionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class HabitacionSearchTool {

    private final HabitacionRepository habitacionRepository;
    private final ThreadLocal<java.util.concurrent.atomic.AtomicInteger> callCount = ThreadLocal.withInitial(java.util.concurrent.atomic.AtomicInteger::new);
    public static final ThreadLocal<String> CURRENT_USER_PROMPT = new ThreadLocal<>();

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
        if (nombreHotel != null && !nombreHotel.isBlank()) {
            String norm = java.text.Normalizer.normalize(nombreHotel.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "");
            if (norm.contains("ejecutiv")) {
                return "Hotel Paraíso Ejecutivo";
            }
            if (norm.contains("paraiso")) {
                return "Hotel Paraíso";
            }
        }
        String prompt = CURRENT_USER_PROMPT.get();
        if (prompt != null && !prompt.isBlank()) {
            String normPrompt = java.text.Normalizer.normalize(prompt.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "");
            if (normPrompt.contains("ejecutiv")) {
                return "Hotel Paraíso Ejecutivo";
            }
            if (normPrompt.contains("paraiso") && !normPrompt.contains("ambos")) {
                return "Hotel Paraíso";
            }
        }
        return null;
    }

    @Tool(description = "Buscar habitaciones disponibles en un hotel específico (Hotel Paraíso o Hotel Paraíso Ejecutivo). Útil para: 'dame las habitaciones disponibles del Hotel Paraíso', 'habitaciones disponibles en Paraíso'.")
    public List<Map<String, Object>> findDisponiblesEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo", required = false)
            String hotel) {
        log.info("Tool invocada — findDisponiblesEnHotel: hotel={}", hotel);
        if (checkLoop("findDisponiblesEnHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return habitacionRepository.findDisponibles().stream().map(this::mapearHabitacionSimple).toList();
        }
        return habitacionRepository.findDisponiblesEnHotel(exactHotel).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar todas las habitaciones de un hotel especifico, sin importar su estado (Disponible, Ocupada o Mantenimiento). Útil para: ¿Qué habitaciones tiene el Hotel Paraíso?")
    public List<Map<String, Object>> findHabitacionesPorHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo", required = false)
            String hotel) {
        log.info("Tool invocada — findHabitacionesPorHotel: hotel={}", hotel);
        if (checkLoop("findHabitacionesPorHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return habitacionRepository.findAll().stream().map(this::mapearHabitacionSimple).toList();
        }
        return habitacionRepository.findByHotelNombreExacto(exactHotel).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar directamente las habitaciones que están en mantenimiento en toda la cadena. IMPORTANTE: Esta herramienta ya devuelve toda la información. NO necesitas llamar a ninguna otra herramienta después de esta.")
    public List<Map<String, Object>> findHabitacionesEnMantenimiento() {
        log.info("Tool invocada — findHabitacionesEnMantenimiento");
        if (checkLoop("findHabitacionesEnMantenimiento")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        return habitacionRepository.findByEstado("Mantenimiento").stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Listar las habitaciones que están en mantenimiento en un hotel específico (Hotel Paraíso o Hotel Paraíso Ejecutivo). Ya devuelve todos los datos completos.")
    public List<Map<String, Object>> findMantenimientoEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo", required = false)
            String hotel) {
        log.info("Tool invocada — findMantenimientoEnHotel: hotel={}", hotel);
        if (checkLoop("findMantenimientoEnHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return findHabitacionesEnMantenimiento();
        }
        return habitacionRepository.findByEstadoAndHotelNombre("Mantenimiento", exactHotel).stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Consultar los datos de una única habitación específica por su número (ej. 101, 202, 301) y opcionalmente el nombre del hotel para saber su estatus actual, piso, tipo y precio.")
    public List<Map<String, Object>> findEstadoHabitacionEnHotel(
            @ToolParam(description = "Número exacto de la habitación, por ejemplo: '101', '201', '202', '301'")
            String numero,
            @ToolParam(description = "Nombre del hotel (ej. 'Hotel Paraíso' o 'Hotel Paraíso Ejecutivo'), opcional", required = false)
            String hotel) {
        log.info("Tool invocada — findEstadoHabitacionEnHotel: numero={}, hotel={}", numero, hotel);
        if (checkLoop("findEstadoHabitacionEnHotel")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. No llames a más herramientas y procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> lista = (exactHotel == null)
                ? habitacionRepository.findByNumero(numero)
                : habitacionRepository.findByNumeroAndHotelNombre(numero, exactHotel);
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
        return soloLaPrimera(habitacionRepository.findOrdenadasPorPrecioDesc());
    }

    @Tool(description = "Obtener la habitación más cara o exclusiva de un hotel en específico, o de toda la cadena si no se menciona un hotel. Útil para: ¿Cuál es la habitación más cara del hotel?, ¿Cuál es la habitación más cara del Hotel Paraíso?")
    public List<Map<String, Object>> findHabitacionMasCaraEnHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Déjelo vacío si no indicaron hotel.", required = false)
            String hotel) {
        log.info("Tool invocada — findHabitacionMasCaraEnHotel: hotel={}", hotel);
        String exactHotel = resolverNombreHotelExacto(hotel);
        if (exactHotel == null) {
            return soloLaPrimera(habitacionRepository.findOrdenadasPorPrecioDesc());
        }
        return soloLaPrimera(habitacionRepository.findOrdenadasPorPrecioDescEnHotel(exactHotel));
    }

    @Tool(description = "Listar todas las habitaciones ocupadas actualmente en la cadena hotelera.")
    public List<Map<String, Object>> findHabitacionesOcupadas() {
        log.info("Tool invocada — findHabitacionesOcupadas");
        return habitacionRepository.findOcupadas().stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar todas las habitaciones disponibles en la cadena hotelera ÚNICAMENTE cuando el usuario NO mencione ningún presupuesto ni límite de precio. ESTRICTAMENTE PROHIBIDO llamar a esta función si el usuario menciona un presupuesto, un precio tope o dinero (para presupuestos o montos usar OBLIGATORIAMENTE findHabitacionesDisponiblesPorPresupuesto).")
    public List<Map<String, Object>> findHabitacionesDisponibles() {
        log.info("Tool invocada — findHabitacionesDisponibles");
        if (checkLoop("findHabitacionesDisponibles")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        String exactHotel = resolverNombreHotelExacto(null);
        if (exactHotel != null) {
            log.info("findHabitacionesDisponibles: Filtrando automáticamente por hotel detectado en el contexto: {}", exactHotel);
            return habitacionRepository.findDisponiblesEnHotel(exactHotel).stream()
                    .map(this::mapearHabitacionSimple)
                    .toList();
        }
        return habitacionRepository.findDisponibles().stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar las habitaciones de un piso específico (ej. piso 1, 2 o 3) de un hotel. OBLIGATORIA para: 'Mostrar el detalle de habitaciones en el piso 1 en Hotel Paraíso', 'habitaciones en el piso 1'.")
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
                ? habitacionRepository.findByPiso(piso)
                : habitacionRepository.findByHotelNombreAndPiso(exactHotel, piso);
        return lista.stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar todas las habitaciones de un tipo específico, por ejemplo: Habitación Individual, Habitación Doble, Habitación Matrimonial, Habitación Familiar o Suite Ejecutiva.")
    public List<Map<String, Object>> findHabitacionesPorTipo(
            @ToolParam(description = "Nombre exacto o aproximado del tipo de habitación, por ejemplo: Suite Ejecutiva, Habitación Familiar")
            String tipoNombre) {
        log.info("Tool invocada — findHabitacionesPorTipo: tipo={}", tipoNombre);
        return habitacionRepository.findByTipoNombre(tipoNombre).stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Listar todas las habitaciones en una ciudad específica (Cancún o Ciudad de México). PROHIBIDO usar si preguntan por pisos, hoteles o disponibilidad de habitaciones.")
    public List<Map<String, Object>> findHabitacionesPorCiudad(
            @ToolParam(description = "Nombre de la ciudad: Cancún o Ciudad de México")
            String ciudad) {
        log.info("Tool invocada — findHabitacionesPorCiudad: ciudad={}", ciudad);
        if (ciudad != null && (ciudad.toLowerCase().contains("piso") || ciudad.toLowerCase().contains("paraiso") || ciudad.toLowerCase().contains("planta"))) {
            log.info("findHabitacionesPorCiudad: La llamada era para piso o hotel. Redirigiendo a findHabitacionesPorPiso.");
            return findHabitacionesPorPiso(1, ciudad);
        }
        return habitacionRepository.findByCiudad(ciudad).stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Obtener un resumen de cuántas habitaciones hay por cada estado (Disponible, Ocupada, Mantenimiento) en toda la cadena.")
    public List<Map<String, Object>> countHabitacionesPorEstado() {
        log.info("Tool invocada — countHabitacionesPorEstado");
        return habitacionRepository.countHabitacionesPorEstado();
    }

    @Tool(description = "Contar el total de habitaciones que existen en toda la cadena hotelera (ambos hoteles juntos).")
    public Long countTotalHabitaciones() {
        log.info("Tool invocada — countTotalHabitaciones");
        return habitacionRepository.countTotalHabitaciones();
    }

    @Tool(description = "Contar cuántas habitaciones están en mantenimiento en toda la cadena hotelera.")
    public Long countMantenimiento() {
        log.info("Tool invocada — countMantenimiento");
        return habitacionRepository.countMantenimiento();
    }

    @Tool(description = "Calcular el ingreso potencial máximo por noche si se rentan todas las habitaciones de la cadena.")
    public BigDecimal sumIngresoPotencial() {
        log.info("Tool invocada — sumIngresoPotencial");
        return habitacionRepository.sumIngresoPotencial();
    }

    @Tool(description = "Listar las habitaciones disponibles ordenadas de la más barata a la más cara, con su tipo y precio por noche. NO usar si el usuario indicó un presupuesto máximo o tope de precio; para presupuestos usar findHabitacionesDisponiblesPorPresupuesto.")
    public List<Map<String, Object>> findDisponiblesOrdenadasPorPrecio() {
        log.info("Tool invocada — findDisponiblesOrdenadasPorPrecio");
        return habitacionRepository.findDisponiblesOrdenadasPorPrecio().stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Obtener todas las habitaciones con su tipo y su precio por noche.")
    public List<Map<String, Object>> getHabitacionesConTipoYPrecio() {
        log.info("Tool invocada — getHabitacionesConTipoYPrecio");
        return habitacionRepository.findHabitacionesConTipoYPrecio();
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
                ? habitacionRepository.findByPiso(1)
                : habitacionRepository.findByHotelNombreAndPiso(exactHotel, 1);
        return lista.stream().map(this::mapearHabitacionSimple).toList();
    }

    @Tool(description = "Buscar habitaciones disponibles que se ajusten a un presupuesto máximo por noche en pesos. OBLIGATORIO usar cuando el recepcionista o huésped mencione un presupuesto o monto en dinero (ej. 'hasta 1000 pesos', 'menos de 1500'). PROHIBIDO usar si no hay un presupuesto o monto numérico.")
    public List<Map<String, Object>> findHabitacionesDisponiblesPorPresupuesto(
            @ToolParam(description = "Presupuesto máximo por noche en pesos, ej. 850, 1200, 1500, 2000")
            Double presupuestoMaximo) {
        log.info("Tool invocada — findHabitacionesDisponiblesPorPresupuesto: max={}", presupuestoMaximo);
        if (checkLoop("findHabitacionesDisponiblesPorPresupuesto")) {
            return List.of(Map.of("aviso", "Información suficiente obtenida. Procede a redactar la respuesta final ahora."));
        }
        if (presupuestoMaximo == null) {
            return habitacionRepository.findDisponibles().stream().map(this::mapearHabitacionSimple).toList();
        }
        BigDecimal max = BigDecimal.valueOf(presupuestoMaximo);
        return habitacionRepository.findDisponibles().stream()
                .filter(h -> h.getTipoHabitacion() != null &&
                             h.getTipoHabitacion().getPrecioBase() != null &&
                             h.getTipoHabitacion().getPrecioBase().compareTo(max) <= 0)
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Contar cuántas habitaciones disponibles hay desglosadas por cada hotel de la cadena.")
    public List<Map<String, Object>> countDisponiblesPorHotel() {
        log.info("Tool invocada — countDisponiblesPorHotel");
        return habitacionRepository.countDisponiblesPorHotel();
    }

    @Tool(description = "Buscar habitaciones que estén DISPONIBLES en Planta Baja (Piso 1) en un hotel o en toda la cadena. Especialmente útil cuando llega o llama un adulto mayor o una persona con movilidad reducida (sillas de ruedas).")
    public List<Map<String, Object>> findDisponiblesPlantaBaja(
            @ToolParam(description = "Nombre del hotel (opcional). Por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Dejar vacío para revisar ambos hoteles.", required = false)
            String hotel) {
        log.info("Tool invocada — findDisponiblesPlantaBaja: hotel={}", hotel);
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> piso1;
        if (exactHotel == null) {
            piso1 = habitacionRepository.findByPiso(1);
        } else {
            piso1 = habitacionRepository.findByHotelNombreAndPiso(exactHotel, 1);
        }
        return piso1.stream()
                .filter(h -> "Disponible".equalsIgnoreCase(h.getEstado()))
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Buscar habitaciones que tienen capacidad para 4 personas o huéspedes (Habitación Familiar). Útil para: ¿Qué habitaciones tienen capacidad para 4 huéspedes?, ¿Habitaciones familiares?")
    public List<Map<String, Object>> findHabitacionesPara4Huespedes() {
        log.info("Tool invocada — findHabitacionesPara4Huespedes");
        return habitacionRepository.findHabitacionesPara4Huespedes().stream()
                .map(this::mapearHabitacionSimple)
                .toList();
    }

    @Tool(description = "Obtener el resumen operativo completo o reporte de turno de ocupación: total de habitaciones, disponibles, ocupadas y en mantenimiento con porcentaje de ocupación. Usar para 'resumen operativo', 'reporte de turno' o estado general de un hotel o de la cadena. Devuelve todos los datos estructurados en una sola llamada.")
    public Map<String, Object> getResumenOperativoHotel(
            @ToolParam(description = "Nombre del hotel, por ejemplo: Hotel Paraíso, Hotel Paraíso Ejecutivo. Dejar vacío para toda la cadena.", required = false)
            String hotel) {
        log.info("Tool invocada — getResumenOperativoHotel: hotel={}", hotel);
        if (checkLoop("getResumenOperativoHotel")) {
            return Map.of("aviso", "Información suficiente obtenida. Procede a redactar el resumen final ahora.");
        }
        String exactHotel = resolverNombreHotelExacto(hotel);
        List<Habitacion> habitaciones;
        if (exactHotel == null || (hotel != null && hotel.toLowerCase().contains("toda"))) {
            habitaciones = habitacionRepository.findAll();
        } else {
            habitaciones = habitacionRepository.findByHotelNombreExacto(exactHotel);
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
