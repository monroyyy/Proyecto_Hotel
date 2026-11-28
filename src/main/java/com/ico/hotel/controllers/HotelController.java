package com.ico.hotel.controllers;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.services.CatalogoMediaValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controlador REST para Hoteles.
 * Proporciona endpoints para listar, registrar, actualizar y eliminar hoteles.
 */
@RestController
@RequestMapping("/api/hoteles")
public class HotelController {

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private HabitacionRepository habitacionRepository;

    @Autowired
    private com.ico.hotel.repository.ReservaRepository reservaRepository;

    @Autowired
    private CatalogoMediaValidator catalogoMediaValidator;

    @GetMapping
    public List<Hotel> listarTodos() {
        return hotelRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> crearHotel(@RequestBody Hotel hotel) {
        if (hotel.getNombre() == null || hotel.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre del hotel es obligatorio."));
        }

        // Validación de teléfono obligatorio y exactamente 10 dígitos numéricos
        if (hotel.getTelefono() == null || hotel.getTelefono().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "El número telefónico es obligatorio y debe contener exactamente 10 dígitos numéricos."));
        }
        String tel = hotel.getTelefono().trim();
        if (!tel.matches("^\\d{10}$")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "El número telefónico forzosamente debe ser de 10 números."));
        }

        // Validación de correo electrónico obligatorio y con formato válido
        if (hotel.getEmail() == null || hotel.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El correo electrónico es obligatorio."));
        }
        String mail = hotel.getEmail().trim().toLowerCase();
        if (!mail.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            return ResponseEntity.badRequest().body(Map.of("error",
                    "El correo electrónico debe tener un formato válido (ejemplo: contacto@hotel.com)."));
        }

        // Validar unicidad de número telefónico
        if (hotelRepository.existsByTelefono(tel)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                    "Ya existe un hotel registrado con este número telefónico. No se permite repetir teléfono."));
        }

        // Validar unicidad de correo electrónico
        if (hotelRepository.existsByEmailIgnoreCase(mail)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                    "Ya existe un hotel registrado con este correo electrónico. No se permite repetir correo."));
        }

        hotel.setTelefono(tel);
        hotel.setEmail(mail);
        catalogoMediaValidator.validarCoordenadas(hotel.getLatitud(), hotel.getLongitud());
        hotel.setImagenUrl(catalogoMediaValidator.validarImagenUrl(hotel.getImagenUrl()));
        hotel.setDescripcion(catalogoMediaValidator.validarTextoPlano(hotel.getDescripcion(), "descripcion", 500));
        hotel.setTagEditorial(catalogoMediaValidator.validarTextoPlano(hotel.getTagEditorial(), "tagEditorial", 60));

        if (hotel.getActivo() == null) {
            hotel.setActivo(true);
        }
        Hotel guardado = hotelRepository.save(hotel);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Integer id) {
        return hotelRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Hotel no encontrado con ID: " + id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarHotel(@PathVariable Integer id, @RequestBody Hotel datos) {
        Optional<Hotel> hotelOpt = hotelRepository.findById(id);
        if (hotelOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Hotel no encontrado con ID: " + id));
        }

        Hotel hotel = hotelOpt.get();

        // Validar teléfono forzosamente 10 números
        if (datos.getTelefono() != null) {
            String tel = datos.getTelefono().trim();
            if (!tel.matches("^\\d{10}$")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El número telefónico forzosamente debe ser de 10 números."));
            }
            // Validar unicidad contra otros hoteles
            if (hotelRepository.existsByTelefonoAndIdHotelNot(tel, id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                        "Ya existe otro hotel registrado con este número telefónico. No se permite repetir teléfono."));
            }
            hotel.setTelefono(tel);
        }

        // Validar correo electrónico y unicidad
        if (datos.getEmail() != null) {
            String mail = datos.getEmail().trim().toLowerCase();
            if (!mail.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                return ResponseEntity.badRequest().body(Map.of("error",
                        "El correo electrónico debe tener un formato válido (ejemplo: contacto@hotel.com)."));
            }
            if (hotelRepository.existsByEmailIgnoreCaseAndIdHotelNot(mail, id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",
                        "Ya existe otro hotel registrado con este correo electrónico. No se permite repetir correo."));
            }
            hotel.setEmail(mail);
        }

        if (datos.getNombre() != null && !datos.getNombre().trim().isEmpty()) {
            hotel.setNombre(datos.getNombre().trim());
        }
        if (datos.getDireccion() != null) {
            hotel.setDireccion(datos.getDireccion().trim());
        }
        if (datos.getCiudad() != null) {
            hotel.setCiudad(datos.getCiudad().trim());
        }
        if (datos.getActivo() != null) {
            // Bloquear desactivación del hotel si tiene reservaciones activas
            if (Boolean.FALSE.equals(datos.getActivo())) {
                long activas = reservaRepository.countByHabitacionHotelIdHotelAndEstadoIn(
                        id, List.of("Pre-reserva", "Confirmada", "Ocupada"));
                if (activas > 0) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                            "error", "No se puede desactivar el hotel porque tiene " + activas
                                    + " reservación(es) activa(s) (Pre-reserva, Confirmada u Ocupada)."
                    ));
                }
            }
            hotel.setActivo(datos.getActivo());
        }
        if (datos.getImagenUrl() != null) {
            hotel.setImagenUrl(catalogoMediaValidator.validarImagenUrl(datos.getImagenUrl()));
        }
        if (datos.getDescripcion() != null) {
            hotel.setDescripcion(catalogoMediaValidator.validarTextoPlano(datos.getDescripcion(), "descripcion", 500));
        }
        if (datos.getTagEditorial() != null) {
            hotel.setTagEditorial(catalogoMediaValidator.validarTextoPlano(datos.getTagEditorial(), "tagEditorial", 60));
        }
        if (datos.getLatitud() != null || datos.getLongitud() != null) {
            catalogoMediaValidator.validarCoordenadas(datos.getLatitud(), datos.getLongitud());
            hotel.setLatitud(datos.getLatitud());
            hotel.setLongitud(datos.getLongitud());
        }

        Hotel actualizado = hotelRepository.save(hotel);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarHotel(@PathVariable Integer id) {
        if (!hotelRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Hotel no encontrado."));
        }

        // Regla de negocio: No poder eliminar un hotel con reservaciones activas o habitaciones ocupadas
        long reservasActivas = reservaRepository.countByHabitacionHotelIdHotelAndEstadoIn(
                id, List.of("Pre-reserva", "Confirmada", "Ocupada"));
        if (reservasActivas > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error",
                            "No se puede eliminar el hotel porque tiene " + reservasActivas
                                    + " reservación(es) activa(s) (Pre-reserva, Confirmada u Ocupada)."));
        }

        boolean tieneHabitacionesOcupadas = habitacionRepository.findAll().stream()
                .anyMatch(h -> h.getHotel() != null &&
                        h.getHotel().getIdHotel().equals(id) &&
                        "Ocupada".equalsIgnoreCase(h.getEstado()));
        if (tieneHabitacionesOcupadas) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error",
                            "No se puede eliminar el hotel porque tiene habitaciones ocupadas en este momento."));
        }

        try {
            hotelRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error",
                            "No se puede eliminar el hotel porque tiene habitaciones asociadas. En su lugar, puede desactivarlo cambiando su estado a Inactivo."));
        }
    }
}
