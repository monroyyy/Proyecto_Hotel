package com.ico.hotel;

import com.ico.hotel.config.ClockConfig;
import com.ico.hotel.config.GlobalExceptionHandler;
import com.ico.hotel.config.SchedulingConfig;
import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.models.Reserva;
import com.ico.hotel.models.Rol;
import com.ico.hotel.models.Usuario;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.HuespedRepository;
import com.ico.hotel.repository.ReservaEventoRepository;
import com.ico.hotel.repository.ReservaRepository;
import com.ico.hotel.security.CustomUserDetails;
import com.ico.hotel.services.ReservaExpiracionJob;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class IntegridadApiYSeederTest extends AbstractMysqlTestcontainerTest {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private ReservaRepository reservaRepository;

    @Autowired
    private ReservaEventoRepository reservaEventoRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private HuespedRepository huespedRepository;

    @Autowired
    private GlobalExceptionHandler exceptionHandler;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Clock hotelClock;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private Environment environment;

    private MockMvc mockMvc;
    private CustomUserDetails adminUser;

    private final List<Integer> reservasTemp = new ArrayList<>();
    private final List<Integer> huespedesTemp = new ArrayList<>();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        Usuario u = Usuario.builder()
                .idUsuario(1)
                .nombre("Admin Test")
                .email("admin@hotelparaiso.com")
                .passwordHash("hash")
                .rol(Rol.ADMINISTRADOR)
                .verificado(true)
                .activo(true)
                .build();
        adminUser = new CustomUserDetails(u);
    }

    @AfterEach
    void cleanup() {
        transactionTemplate.executeWithoutResult(st -> {
            for (Integer idRes : reservasTemp) {
                var evs = reservaEventoRepository.findByIdReservaOrderByFechaHoraAsc(idRes);
                if (!evs.isEmpty()) reservaEventoRepository.deleteAll(evs);
                reservaRepository.findById(idRes).ifPresent(reservaRepository::delete);
            }
            for (Integer idHue : huespedesTemp) {
                huespedRepository.findById(idHue).ifPresent(huespedRepository::delete);
            }
        });
        reservasTemp.clear();
        huespedesTemp.clear();
    }

    @Test
    @DisplayName("Duplicados de folio, habitación, email de huésped y email/teléfono de hotel devuelven 409 Conflict por API")
    void testDuplicadosDevuelven409PorApi() throws Exception {
        Reserva existente = reservaRepository.findAll().stream().findFirst().orElseThrow();
        Habitacion habExistente = habitacionRepository.findAll().stream()
                .filter(h -> h.getHotel() != null && Boolean.TRUE.equals(h.getHotel().getActivo()))
                .findFirst()
                .orElseThrow();
        Hotel hotel1 = hotelRepository.findById(1).orElseThrow();
        String folioExistente = existente.getFolio();
        String emailUnico = "dup-api-" + System.nanoTime() + "@example.com";

        // 1. Folio duplicado en POST /api/reservas -> 409
        LocalDate entrada = LocalDate.now(ClockConfig.ZONA_MEXICO).plusDays(200);
        String reservaJson = """
                {
                  "folio": "%s",
                  "idHabitacion": %d,
                  "fechaEntrada": "%s",
                  "fechaSalida": "%s",
                  "adultos": 1,
                  "ninos": 0,
                  "nombre": "Huesped Folio Dup",
                  "telefono": "5511223344",
                  "email": "%s",
                  "modalidad": "PRE_RESERVA"
                }
                """.formatted(folioExistente, habExistente.getIdHabitacion(), entrada, entrada.plusDays(2), emailUnico);

        mockMvc.perform(post("/api/reservas")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservaJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").isString());

        // 2. Dos habitaciones con el mismo número en un hotel -> 409
        String habDupJson = """
                {
                  "numero": "%s",
                  "piso": %d,
                  "idHotel": %d,
                  "idTipo": %d,
                  "estado": "Disponible"
                }
                """.formatted(
                habExistente.getNumero(),
                habExistente.getPiso(),
                habExistente.getHotel().getIdHotel(),
                habExistente.getTipoHabitacion().getIdTipo()
        );

        mockMvc.perform(post("/api/habitaciones")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(habDupJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").isString());

        // 3. Email de huésped repetido en POST /api/huespedes -> 409
        String emailHuespedDup = huespedRepository.findAll().stream().findFirst().orElseThrow().getEmail();
        String huespedJson = """
                {
                  "nombre": "Huesped Repetido",
                  "email": "%s",
                  "telefono": "5599887766"
                }
                """.formatted(emailHuespedDup);

        mockMvc.perform(post("/api/huespedes")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(huespedJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").isString());

        // 4. Email repetido de hotel en POST /api/hoteles -> 409
        String hotelEmailDupJson = """
                {
                  "nombre": "Hotel Duplicado Test",
                  "ciudad": "Monterrey",
                  "direccion": "Av. Constitución 100",
                  "telefono": "8119998877",
                  "email": "%s",
                  "activo": true
                }
                """.formatted(hotel1.getEmail());

        mockMvc.perform(post("/api/hoteles")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(hotelEmailDupJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").isString());

        // 5. GlobalExceptionHandler mapea DataIntegrityViolationException de UNIQUE a 409 sin exponer SQL
        ResponseEntity<Map<String, Object>> resp = exceptionHandler.handleDataIntegrity(
                new DataIntegrityViolationException(
                        "could not execute statement [Duplicate entry '1-101' for key 'habitacion.uk_habitacion_hotel_numero']"
                )
        );
        assertThat(resp.getStatusCode().value()).isEqualTo(409);
        assertThat(resp.getBody().get("error").toString())
                .contains("habitación")
                .doesNotContain("SQL")
                .doesNotContain("Duplicate entry");
    }

    @Test
    @DisplayName("Editar Hotel 1 y Hotel 2 (nombre/estado) devuelve 200 OK sin error 400 por teléfono")
    void testEditarHotel1YHotel2NoFallaPorTelefono() throws Exception {
        Hotel h1 = hotelRepository.findById(1).orElseThrow();
        Hotel h2 = hotelRepository.findById(2).orElseThrow();
        assertThat(h1.getTelefono()).matches("^\\d{10}$");
        assertThat(h2.getTelefono()).matches("^\\d{10}$");

        String nombre1Orig = h1.getNombre();
        Boolean activo1Orig = h1.getActivo();
        String nombre2Orig = h2.getNombre();
        Boolean activo2Orig = h2.getActivo();

        try {
            mockMvc.perform(put("/api/hoteles/1")
                            .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "nombre": "%s",
                                      "telefono": "%s",
                                      "email": "%s",
                                      "activo": %s
                                    }
                                    """.formatted(nombre1Orig + " Edit", h1.getTelefono(), h1.getEmail(), activo1Orig)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nombre").value(nombre1Orig + " Edit"));

            mockMvc.perform(put("/api/hoteles/2")
                            .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "nombre": "%s",
                                      "telefono": "%s",
                                      "email": "%s",
                                      "activo": %s
                                    }
                                    """.formatted(nombre2Orig + " Edit", h2.getTelefono(), h2.getEmail(), activo2Orig)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nombre").value(nombre2Orig + " Edit"));
        } finally {
            h1.setNombre(nombre1Orig);
            h1.setActivo(activo1Orig);
            hotelRepository.save(h1);
            h2.setNombre(nombre2Orig);
            h2.setActivo(activo2Orig);
            hotelRepository.save(h2);
        }
    }

    @Test
    @DisplayName("BD de pruebas aislada (Testcontainers) cumple UNIQUE, P0.4 y mantiene el job automático desactivado")
    void testInvariantesEsquemaSeederYSchedulerDesactivado() {
        String jdbcUrl = environment.getProperty("spring.datasource.url", "");
        assertThat(jdbcUrl).contains("hotel_test_db").doesNotContain("/hotel_db");
        assertThat(environment.getProperty("app.jobs.expiracion-enabled")).isEqualTo("false");
        assertThat(wac.getBeansOfType(ReservaExpiracionJob.class)).isEmpty();
        assertThat(wac.getBeansOfType(SchedulingConfig.class)).hasSize(1);
        assertThat(wac.getBeansOfType(ScheduledAnnotationBeanPostProcessor.class)).isNotEmpty();

        LocalDate hoy = LocalDate.now(hotelClock);
        Integer invalidasFinalizadasFuturas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reserva WHERE estado = 'Finalizada' AND fecha_salida > ? AND check_out_at IS NULL",
                Integer.class,
                hoy
        );
        assertThat(invalidasFinalizadasFuturas).isZero();

        List<String> constraintsUnicas = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS " +
                "WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'UNIQUE' " +
                "ORDER BY CONSTRAINT_NAME",
                String.class
        );
        assertThat(constraintsUnicas).contains(
                "uk_habitacion_hotel_numero",
                "uk_hotel_email",
                "uk_hotel_telefono",
                "uk_huesped_email",
                "uk_reserva_folio"
        );
    }
}
