package com.ico.hotel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ico.hotel.models.*;
import com.ico.hotel.repository.*;
import com.ico.hotel.security.JwtService;
import com.ico.hotel.tools.HabitacionSearchTool;
import com.ico.hotel.tools.HotelSearchTool;
import com.ico.hotel.tools.ReservaTool;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class Bloque4CCatalogoPagoConsultasTest extends AbstractMysqlTestcontainerTest {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private TipoHabitacionRepository tipoHabitacionRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private ReservaEventoRepository reservaEventoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private HabitacionSearchTool habitacionSearchTool;

    @Autowired
    private HotelSearchTool hotelSearchTool;

    @Autowired
    private ReservaTool reservaTool;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    private String jwtAdmin;
    private Usuario adminUsuario;

    private final List<Integer> reservasTempIds = new ArrayList<>();
    private final List<Integer> habitacionesTempIds = new ArrayList<>();
    private final List<Integer> hotelesTempIds = new ArrayList<>();
    private final List<Integer> tiposTempIds = new ArrayList<>();
    private final List<Integer> usuariosTempIds = new ArrayList<>();
    private final List<Integer> huespedesTempIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        adminUsuario = usuarioRepository.findByEmailIgnoreCase("admin@hotelparaiso.com").orElseThrow();
        jwtAdmin = jwtService.generateToken(adminUsuario);
    }

    @AfterEach
    void cleanup() {
        HabitacionSearchTool.CURRENT_AUTH_USER.remove();
        for (Integer idRes : reservasTempIds) {
            List<ReservaEvento> evs = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(idRes);
            if (!evs.isEmpty()) {
                reservaEventoRepository.deleteAll(evs);
            }
            reservaRepository.findById(idRes).ifPresent(reservaRepository::delete);
        }
        for (Integer idHab : habitacionesTempIds) {
            habitacionRepository.findById(idHab).ifPresent(habitacionRepository::delete);
        }
        for (Integer idHotel : hotelesTempIds) {
            hotelRepository.findById(idHotel).ifPresent(hotelRepository::delete);
        }
        for (Integer idTipo : tiposTempIds) {
            tipoHabitacionRepository.findById(idTipo).ifPresent(tipoHabitacionRepository::delete);
        }
        for (Integer idUsr : usuariosTempIds) {
            usuarioRepository.findById(idUsr).ifPresent(usuarioRepository::delete);
        }
        for (Integer idHue : huespedesTempIds) {
            huespedRepository.findById(idHue).ifPresent(huespedRepository::delete);
        }
        reservasTempIds.clear();
        habitacionesTempIds.clear();
        hotelesTempIds.clear();
        tiposTempIds.clear();
        usuariosTempIds.clear();
        huespedesTempIds.clear();
    }

    @Test
    @DisplayName("P2.3.1 Hotel con metadata y sin ella se expone vía API; URLs maliciosas y rangos inválidos devuelven 400")
    void testP23MetadataHotelesTiposYValidaciones400() throws Exception {
        // 1. Hotel nuevo con imagen_url https válida + metadata + coordenadas -> 201 y visible en GET /api/hoteles
        Map<String, Object> payloadValido = new LinkedHashMap<>();
        payloadValido.put("nombre", "Hotel Paraíso Mérida");
        payloadValido.put("direccion", "Paseo de Montejo #400");
        payloadValido.put("ciudad", "Mérida");
        payloadValido.put("telefono", "9991234567");
        payloadValido.put("email", "merida.p23@test.com");
        payloadValido.put("activo", true);
        payloadValido.put("imagenUrl", "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800");
        payloadValido.put("tagEditorial", "Hacienda Maya");
        payloadValido.put("descripcion", "Patios coloniales de piedra caliza y alberca privada");
        payloadValido.put("latitud", 20.967370);
        payloadValido.put("longitud", -89.592586);

        MvcResult resOk = mockMvc.perform(post("/api/hoteles")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payloadValido)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagenUrl").value("https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"))
                .andExpect(jsonPath("$.tagEditorial").value("Hacienda Maya"))
                .andExpect(jsonPath("$.latitud").value(20.967370))
                .andReturn();
        int idMerida = objectMapper.readTree(resOk.getResponse().getContentAsString()).get("idHotel").asInt();
        hotelesTempIds.add(idMerida);

        // El endpoint público GET /api/hoteles devuelve la nueva sede con toda su metadata
        mockMvc.perform(get("/api/hoteles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idHotel==" + idMerida + ")].tagEditorial").value("Hacienda Maya"));

        // 2. Hotel nuevo sin metadata ni coordenadas -> 201 y campos en null (fallback seguro)
        Map<String, Object> payloadSinMeta = Map.of(
                "nombre", "Hotel Paraíso Sin Coords",
                "direccion", "Av. Central #10",
                "ciudad", "Oaxaca",
                "telefono", "9511234567",
                "email", "oaxaca.p23@test.com",
                "activo", true
        );
        MvcResult resMin = mockMvc.perform(post("/api/hoteles")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payloadSinMeta)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagenUrl").isEmpty())
                .andExpect(jsonPath("$.latitud").isEmpty())
                .andReturn();
        hotelesTempIds.add(objectMapper.readTree(resMin.getResponse().getContentAsString()).get("idHotel").asInt());

        // 3. URLs maliciosas y validaciones de texto/coordenadas -> 400 Bad Request (nunca 500)
        List<String> urlsInvalidas = List.of(
                "http://images.unsplash.com/photo.jpg",
                "javascript:alert(1)",
                "data:text/html,<script>alert(1)</script>",
                "https://images.unsplash.com@evil.com/x.jpg",
                "https://images.unsplash.com.evil.com/x.jpg",
                "https://evil.images.unsplash.com/x.jpg",
                "https://evil.com/tracker.png",
                "https://images.unsplash.com/" + "a".repeat(480)
        );
        for (String badUrl : urlsInvalidas) {
            Map<String, Object> bad = new LinkedHashMap<>(payloadValido);
            bad.put("telefono", "9990001122");
            bad.put("email", "badurl@test.com");
            bad.put("imagenUrl", badUrl);
            mockMvc.perform(post("/api/hoteles")
                            .header("Authorization", "Bearer " + jwtAdmin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(bad)))
                    .andExpect(status().isBadRequest());
        }

        // Descripción HTML / > 500 chars / Tag > 60 chars / Coordenada impar o fuera de rango -> 400
        List<Map<String, Object>> payloadsInvalidos = List.of(
                Map.of("descripcion", "<script>alert(1)</script>"),
                Map.of("descripcion", "x".repeat(501)),
                Map.of("tagEditorial", "<b>VIP</b>"),
                Map.of("tagEditorial", "t".repeat(61)),
                Map.of("latitud", 20.5, "longitud", (Object) ""),
                Map.of("latitud", 91.0, "longitud", -99.0),
                Map.of("latitud", 20.0, "longitud", -181.0)
        );
        for (Map<String, Object> overrideFields : payloadsInvalidos) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("nombre", "Hotel Inválido");
            body.put("direccion", "Dir 1");
            body.put("ciudad", "CDMX");
            body.put("telefono", "5599887766");
            body.put("email", "invalido.p23@test.com");
            overrideFields.forEach((k, v) -> body.put(k, "".equals(v) ? null : v));
            if (overrideFields.containsKey("latitud") && "".equals(overrideFields.get("longitud"))) {
                body.put("longitud", null);
            }
            mockMvc.perform(post("/api/hoteles")
                            .header("Authorization", "Bearer " + jwtAdmin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isBadRequest());
        }

        // TipoHabitacion también valida imagenUrl HTTPS y dominio permitido
        MvcResult tipoRes = mockMvc.perform(post("/api/tipos-habitacion")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Loft P23",
                                "capacidad", 2,
                                "precioBase", 1900,
                                "imagenUrl", "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imagenUrl").value("https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"))
                .andReturn();
        tiposTempIds.add(objectMapper.readTree(tipoRes.getResponse().getContentAsString()).get("idTipo").asInt());

        mockMvc.perform(post("/api/tipos-habitacion")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nombre", "Loft Malo",
                                "capacidad", 2,
                                "precioBase", 1900,
                                "imagenUrl", "https://images.unsplash.com.attacker.com/x.jpg"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("P2.4 + MétodoPago: alias case-insensitive, rechazo 400 a 'Tarjeta' y recepcionista desde JWT/origen")
    void testMetodoPagoYRecepcionistaDesdeJwt() throws Exception {
        Hotel hotelTmp = new Hotel();
        hotelTmp.setNombre("Hotel Test P24");
        hotelTmp.setDireccion("Av. Prueba 24");
        hotelTmp.setCiudad("Querétaro");
        hotelTmp.setTelefono("4429998877");
        hotelTmp.setEmail("hotel.p24@test.com");
        hotelTmp.setActivo(true);
        hotelTmp = hotelRepository.save(hotelTmp);
        hotelesTempIds.add(hotelTmp.getIdHotel());

        TipoHabitacion tipoTmp = new TipoHabitacion();
        tipoTmp.setNombre("Tipo Test P24");
        tipoTmp.setCapacidad(2);
        tipoTmp.setPrecioBase(new BigDecimal("1000.00"));
        tipoTmp = tipoHabitacionRepository.save(tipoTmp);
        tiposTempIds.add(tipoTmp.getIdTipo());

        Habitacion hab = new Habitacion();
        hab.setHotel(hotelTmp);
        hab.setTipoHabitacion(tipoTmp);
        hab.setNumero("P24-101");
        hab.setPiso(1);
        hab.setEstado("Disponible");
        hab = habitacionRepository.save(hab);
        habitacionesTempIds.add(hab.getIdHabitacion());

        // 1. Staff crea reserva confirmada con alias minúsculas e intenta falsificar recepcionista="Javier"
        MvcResult staffRes = mockMvc.perform(post("/api/reservas")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.ofEntries(
                                Map.entry("idHabitacion", hab.getIdHabitacion()),
                                Map.entry("fechaEntrada", "2028-10-01"),
                                Map.entry("fechaSalida", "2028-10-03"),
                                Map.entry("nombre", "Cliente Staff P24"),
                                Map.entry("telefono", "5510102020"),
                                Map.entry("email", "staff.p24@test.com"),
                                Map.entry("adultos", 1),
                                Map.entry("ninos", 0),
                                Map.entry("modalidad", "CONFIRMADA"),
                                Map.entry("anticipo", 1500),
                                Map.entry("metodoPago", "efectivo"),
                                Map.entry("recepcionista", "Javier")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.metodoPago").value("EFECTIVO"))
                .andExpect(jsonPath("$.recepcionista").value(adminUsuario.getNombre()))
                .andReturn();
        int idResStaff = objectMapper.readTree(staffRes.getResponse().getContentAsString()).get("idReserva").asInt();
        reservasTempIds.add(idResStaff);
        reservaRepository.findById(idResStaff).ifPresent(r -> huespedesTempIds.add(r.getHuesped().getIdHuesped()));

        // PUT con recepcionista falsificado tampoco sobrescribe el original
        mockMvc.perform(put("/api/reservas/" + idResStaff)
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "idHabitacion", hab.getIdHabitacion(),
                                "fechaEntrada", "2028-10-01",
                                "fechaSalida", "2028-10-03",
                                "nombre", "Cliente Staff P24",
                                "telefono", "5510102020",
                                "email", "staff.p24@test.com",
                                "adultos", 1,
                                "ninos", 0,
                                "recepcionista", "Falso"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recepcionista").value(adminUsuario.getNombre()));

        // Método genérico 'Tarjeta' o desconocido -> 400 Bad Request (no 500)
        for (String badMetodo : List.of("Tarjeta", "BITCOIN")) {
            mockMvc.perform(post("/api/reservas")
                            .header("Authorization", "Bearer " + jwtAdmin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.ofEntries(
                                    Map.entry("idHabitacion", hab.getIdHabitacion()),
                                    Map.entry("fechaEntrada", "2028-10-10"),
                                    Map.entry("fechaSalida", "2028-10-12"),
                                    Map.entry("nombre", "Cliente Bad Metodo"),
                                    Map.entry("telefono", "5510102021"),
                                    Map.entry("email", "badmetodo@test.com"),
                                    Map.entry("adultos", 1),
                                    Map.entry("ninos", 0),
                                    Map.entry("modalidad", "CONFIRMADA"),
                                    Map.entry("anticipo", 1500),
                                    Map.entry("metodoPago", badMetodo)
                            ))))
                    .andExpect(status().isBadRequest());
        }

        // 2. HUESPED crea pre-reserva intentando falsificar recepcionista -> asigna "Portal Web"
        Usuario uHue = crearUsuario("Huésped Web", "hue.web@test.com", Rol.HUESPED);
        MvcResult hueRes = mockMvc.perform(post("/api/reservas")
                        .header("Authorization", "Bearer " + jwtService.generateToken(uHue))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.ofEntries(
                                Map.entry("idHabitacion", hab.getIdHabitacion()),
                                Map.entry("fechaEntrada", "2028-10-15"),
                                Map.entry("fechaSalida", "2028-10-17"),
                                Map.entry("nombre", "Huésped Web"),
                                Map.entry("telefono", "5533334444"),
                                Map.entry("email", "hue.web@test.com"),
                                Map.entry("adultos", 1),
                                Map.entry("ninos", 0),
                                Map.entry("recepcionista", "Don Roberto")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recepcionista").value("Portal Web"))
                .andReturn();
        int idResHue = objectMapper.readTree(hueRes.getResponse().getContentAsString()).get("idReserva").asInt();
        reservasTempIds.add(idResHue);
        reservaRepository.findById(idResHue).ifPresent(r -> huespedesTempIds.add(r.getHuesped().getIdHuesped()));

        // Confirmar con alias mixed-case y rechazar 'Tarjeta' en confirmar y check-out
        mockMvc.perform(patch("/api/reservas/" + idResHue + "/confirmar")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"anticipo\": 2000, \"metodoPago\": \"Tarjeta\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/reservas/" + idResHue + "/confirmar")
                        .header("Authorization", "Bearer " + jwtAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"anticipo\": 2000, \"metodoPago\": \"Transferencia\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metodoPago").value("TRANSFERENCIA"));

        // 3. ReservaTool (Asistente Virtual) asigna "Asistente Virtual" y método canónico
        HabitacionSearchTool.CURRENT_AUTH_USER.set(new com.ico.hotel.security.CustomUserDetails(uHue));
        Map<String, Object> chatRes = reservaTool.crearReservacion(
                hab.getHotel().getNombre(), hab.getNumero(),
                "2028-11-01", "2028-11-03",
                "Huésped Chat", "5544445555", "hue.web@test.com",
                1, 0, "PRE_RESERVA", null, null,
                false, false, false, null
        );
        assertThat(chatRes.get("exito")).isEqualTo(true);
        assertThat(chatRes.get("recepcionistaRegistro")).isEqualTo("Asistente Virtual");
        Reserva resChat = reservaRepository.findByFolioIgnoreCase(String.valueOf(chatRes.get("folio"))).orElseThrow();
        reservasTempIds.add(resChat.getIdReserva());
    }

    @Test
    @DisplayName("P2.5 ConsultasController y chat excluyen hoteles inactivos; admin sigue viéndolos; /resumen y resumen-estados coinciden; solo ADMIN entra a /api/consultas/**")
    void testP25ConsultasActivosResumenCoincideYSeguridad() throws Exception {
        // Fixture: hotel INACTIVO en ciudad exclusiva con 1 habitación Disponible y 1 en Mantenimiento
        Hotel hotelInactivo = new Hotel();
        hotelInactivo.setNombre("Hotel Cerrado Temporal");
        hotelInactivo.setDireccion("Calle Inactiva 99");
        hotelInactivo.setCiudad("CiudadFantasma");
        hotelInactivo.setTelefono("5577778888");
        hotelInactivo.setEmail("cerrado.p25@test.com");
        hotelInactivo.setActivo(false);
        hotelInactivo = hotelRepository.save(hotelInactivo);
        hotelesTempIds.add(hotelInactivo.getIdHotel());

        TipoHabitacion tipo = tipoHabitacionRepository.findAll().get(0);
        Habitacion hInacDisp = new Habitacion();
        hInacDisp.setHotel(hotelInactivo);
        hInacDisp.setTipoHabitacion(tipo);
        hInacDisp.setNumero("INAC-101");
        hInacDisp.setPiso(1);
        hInacDisp.setEstado("Disponible");
        hInacDisp = habitacionRepository.save(hInacDisp);
        habitacionesTempIds.add(hInacDisp.getIdHabitacion());

        Habitacion hInacMant = new Habitacion();
        hInacMant.setHotel(hotelInactivo);
        hInacMant.setTipoHabitacion(tipo);
        hInacMant.setNumero("INAC-102");
        hInacMant.setPiso(1);
        hInacMant.setEstado("Mantenimiento");
        hInacMant = habitacionRepository.save(hInacMant);
        habitacionesTempIds.add(hInacMant.getIdHabitacion());

        // 1. Seguridad: /api/consultas/** es exclusivo de ADMINISTRADOR (403 para GERENTE, RECEPCIONISTA, HUESPED; 401 anónimo)
        mockMvc.perform(get("/api/consultas/hoteles")).andExpect(status().isUnauthorized());
        for (Rol rol : List.of(Rol.HUESPED, Rol.RECEPCIONISTA, Rol.GERENTE)) {
            Usuario u = crearUsuario("User " + rol.name(), rol.name().toLowerCase() + ".p25@test.com", rol);
            mockMvc.perform(get("/api/consultas/hoteles")
                            .header("Authorization", "Bearer " + jwtService.generateToken(u)))
                    .andExpect(status().isForbidden());
        }

        // 2. ConsultasController excluye el hotel inactivo y sus habitaciones por defecto
        mockMvc.perform(get("/api/consultas/hoteles")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nombre=='Hotel Cerrado Temporal')]").isEmpty());

        mockMvc.perform(get("/api/consultas/hoteles?incluirInactivos=true")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nombre=='Hotel Cerrado Temporal')]").isNotEmpty());

        mockMvc.perform(get("/api/consultas/hoteles/ciudad/CiudadFantasma")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/consultas/habitaciones/ciudad/CiudadFantasma")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/consultas/habitaciones/numero/INAC-101")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // 3. /api/habitaciones/resumen y /api/consultas/habitaciones/resumen-estados coinciden exactamente
        MvcResult resResumenAdmin = mockMvc.perform(get("/api/habitaciones/resumen")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode jsonResumen = objectMapper.readTree(resResumenAdmin.getResponse().getContentAsString());

        MvcResult resConsultas = mockMvc.perform(get("/api/consultas/habitaciones/resumen-estados")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode arrConsultas = objectMapper.readTree(resConsultas.getResponse().getContentAsString());
        Map<String, Long> porEstadoConsultas = new HashMap<>();
        for (JsonNode item : arrConsultas) {
            porEstadoConsultas.put(item.get("estado").asText(), item.get("cantidad").asLong());
        }
        assertThat(porEstadoConsultas.getOrDefault("Disponible", 0L)).isEqualTo(jsonResumen.get("disponibles").asLong());
        assertThat(porEstadoConsultas.getOrDefault("Ocupada", 0L)).isEqualTo(jsonResumen.get("ocupadas").asLong());
        assertThat(porEstadoConsultas.getOrDefault("Mantenimiento", 0L)).isEqualTo(jsonResumen.get("mantenimiento").asLong());

        long totalConsultas = objectMapper.readTree(mockMvc.perform(get("/api/consultas/habitaciones/total-count")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andReturn().getResponse().getContentAsString()).asLong();
        assertThat(totalConsultas).isEqualTo(jsonResumen.get("total").asLong());

        // 4. Pantallas admin siguen viendo inactivas cuando lo solicitan
        mockMvc.perform(get("/api/habitaciones?incluirInactivos=true")
                        .header("Authorization", "Bearer " + jwtAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.numero=='INAC-101')]").isNotEmpty());

        mockMvc.perform(get("/api/hoteles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nombre=='Hotel Cerrado Temporal')]").isNotEmpty());

        // 5. Chat IA (HotelSearchTool + HabitacionSearchTool) tampoco expone hoteles inactivos
        HabitacionSearchTool.CURRENT_AUTH_USER.set(new com.ico.hotel.security.CustomUserDetails(adminUsuario));
        assertThat(hotelSearchTool.findHotelesPorCiudad("CiudadFantasma")).isEmpty();
        assertThat(habitacionSearchTool.findHabitacionesPorCiudad("CiudadFantasma")).isEmpty();
        assertThat(habitacionSearchTool.countTotalHabitaciones()).isEqualTo(totalConsultas);
    }

    @Test
    @DisplayName("Roles de RECEPCIONISTA (Mostrador + Chat IA y comparación con GERENTE) en Reservaciones, Habitaciones y endpoints restringidos")
    void testRolesYPermisosRecepcionistaCompletos() throws Exception {
        Usuario recep = usuarioRepository.findByEmailIgnoreCase("recepcion@hotelparaiso.com").orElseThrow();
        Usuario gerente = usuarioRepository.findByEmailIgnoreCase("gerente@hotelparaiso.com").orElseThrow();

        // Login real de RECEPCIONISTA
        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recepcion@hotelparaiso.com\",\"password\":\"Recep1234!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.rol").value("RECEPCIONISTA"))
                .andReturn();
        String jwtRecep = objectMapper.readTree(loginRes.getResponse().getContentAsString()).get("token").asText();
        String jwtGerente = jwtService.generateToken(gerente);

        // Fixture aislado de hotel/tipo/habitación
        Hotel hotelTmp = new Hotel();
        hotelTmp.setNombre("Hotel Test Recep");
        hotelTmp.setDireccion("Calle Mostrador 10");
        hotelTmp.setCiudad("Puebla");
        hotelTmp.setTelefono("2221113344");
        hotelTmp.setEmail("recep.test.hotel@test.com");
        hotelTmp.setActivo(true);
        hotelTmp = hotelRepository.save(hotelTmp);
        hotelesTempIds.add(hotelTmp.getIdHotel());

        TipoHabitacion tipoTmp = new TipoHabitacion();
        tipoTmp.setNombre("Tipo Test Recep");
        tipoTmp.setCapacidad(2);
        tipoTmp.setPrecioBase(new BigDecimal("1000.00"));
        tipoTmp = tipoHabitacionRepository.save(tipoTmp);
        tiposTempIds.add(tipoTmp.getIdTipo());

        Habitacion hab = new Habitacion();
        hab.setHotel(hotelTmp);
        hab.setTipoHabitacion(tipoTmp);
        hab.setNumero("REC-101");
        hab.setPiso(1);
        hab.setEstado("Disponible");
        hab = habitacionRepository.save(hab);
        habitacionesTempIds.add(hab.getIdHabitacion());

        // 1. Perfil y catálogos operativos permitidos para RECEPCIONISTA
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("RECEPCIONISTA"));

        mockMvc.perform(get("/api/reservas?page=0&size=5").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/reservas/resumen-estados").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/habitaciones").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/habitaciones/resumen").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/habitaciones/notificaciones-desocupacion").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/huespedes").header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isOk());

        // 2. Cambio rápido de estado en Habitaciones permitido; CRUD maestro de Habitaciones denegado (403)
        mockMvc.perform(patch("/api/habitaciones/" + hab.getIdHabitacion() + "/estado")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"estado\":\"Mantenimiento\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Mantenimiento"));

        mockMvc.perform(patch("/api/habitaciones/" + hab.getIdHabitacion() + "/estado")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"estado\":\"Disponible\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Disponible"));

        mockMvc.perform(post("/api/habitaciones")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "numero", "REC-999",
                                "piso", 1,
                                "idHotel", hotelTmp.getIdHotel(),
                                "idTipo", tipoTmp.getIdTipo()
                        ))))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/habitaciones/" + hab.getIdHabitacion())
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("numero", "REC-X", "piso", 1))))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/habitaciones/" + hab.getIdHabitacion())
                        .header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isForbidden());

        // 3. Módulo Reservaciones: alta confirmada asignando nombre real del recepcionista desde JWT, edición, confirmar, cancelar
        MvcResult resConf = mockMvc.perform(post("/api/reservas")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.ofEntries(
                                Map.entry("idHabitacion", hab.getIdHabitacion()),
                                Map.entry("fechaEntrada", "2028-06-01"),
                                Map.entry("fechaSalida", "2028-06-03"),
                                Map.entry("nombre", "Huésped Mostrador"),
                                Map.entry("telefono", "2229998877"),
                                Map.entry("email", "hue.mostrador@test.com"),
                                Map.entry("adultos", 1),
                                Map.entry("ninos", 0),
                                Map.entry("modalidad", "CONFIRMADA"),
                                Map.entry("anticipo", 1500),
                                Map.entry("metodoPago", "tarjeta_debito"),
                                Map.entry("recepcionista", "Falsificado")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recepcionista").value(recep.getNombre()))
                .andExpect(jsonPath("$.metodoPago").value("TARJETA_DEBITO"))
                .andReturn();
        int idResConf = objectMapper.readTree(resConf.getResponse().getContentAsString()).get("idReserva").asInt();
        reservasTempIds.add(idResConf);
        reservaRepository.findById(idResConf).ifPresent(r -> huespedesTempIds.add(r.getHuesped().getIdHuesped()));

        // RECEPCIONISTA no puede revertir No-Show (403) ni eliminar reservas (403); GERENTE sí supera seguridad en revertir-no-show
        mockMvc.perform(patch("/api/reservas/" + idResConf + "/revertir-no-show")
                        .header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/reservas/" + idResConf + "/revertir-no-show")
                        .header("Authorization", "Bearer " + jwtGerente))
                .andExpect(status().isConflict()); // Alcanza lógica de negocio (no es No-Show), no 403
        mockMvc.perform(delete("/api/reservas/" + idResConf)
                        .header("Authorization", "Bearer " + jwtRecep))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/reservas/" + idResConf + "/cancelar")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titular\":\"Huésped Mostrador\",\"banco\":\"BBVA\",\"clabe\":\"012180001234567890\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("Cancelada"));

        // 4. Endpoints exclusivos de Gerencia / Administración devuelven 403 a RECEPCIONISTA
        for (String getRestringido : List.of(
                "/api/dashboard/kpis",
                "/api/informes/financiero",
                "/api/consultas/hoteles",
                "/api/usuarios"
        )) {
            mockMvc.perform(get(getRestringido).header("Authorization", "Bearer " + jwtRecep))
                    .andExpect(status().isForbidden());
        }
        mockMvc.perform(post("/api/hoteles")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"X\",\"direccion\":\"D\",\"ciudad\":\"C\",\"telefono\":\"5511223344\",\"email\":\"x@t.com\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/tipos-habitacion")
                        .header("Authorization", "Bearer " + jwtRecep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"X\",\"capacidad\":2,\"precioBase\":1000}"))
                .andExpect(status().isForbidden());

        // 5. Chat IA en modo RECEPCIONISTA (tools): accede a resumen operativo y puede confirmar por chat como Asistente Virtual
        HabitacionSearchTool.CURRENT_AUTH_USER.set(new com.ico.hotel.security.CustomUserDetails(recep));
        Map<String, Object> resumenChat = habitacionSearchTool.getResumenOperativoHotel(null);
        assertThat(resumenChat).containsKey("totalHabitaciones");

        Map<String, Object> chatRecep = reservaTool.crearReservacion(
                hotelTmp.getNombre(), hab.getNumero(),
                "2028-07-01", "2028-07-03",
                "Cliente Chat Recep", "2228887766", "hue.mostrador@test.com",
                1, 0, "CONFIRMADA", 1200.0, "EFECTIVO",
                false, false, false, null
        );
        assertThat(chatRecep.get("exito")).isEqualTo(true);
        assertThat(chatRecep.get("estado")).isEqualTo("Confirmada");
        assertThat(chatRecep.get("recepcionistaRegistro")).isEqualTo("Asistente Virtual");
        Reserva resChat = reservaRepository.findByFolioIgnoreCase(String.valueOf(chatRecep.get("folio"))).orElseThrow();
        reservasTempIds.add(resChat.getIdReserva());
    }

    private Usuario crearUsuario(String nombre, String email, Rol rol) {
        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode("ClaveSegura1"));
        u.setRol(rol);
        u.setVerificado(true);
        u.setActivo(true);
        u.setTokenVersion(0);
        u.setFechaCreacion(LocalDateTime.now());
        u = usuarioRepository.save(u);
        usuariosTempIds.add(u.getIdUsuario());
        return u;
    }
}
