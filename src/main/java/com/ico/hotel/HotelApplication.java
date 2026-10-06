package com.ico.hotel;

import com.ico.hotel.models.Habitacion;
import com.ico.hotel.models.Hotel;
import com.ico.hotel.repository.HabitacionRepository;
import com.ico.hotel.repository.HotelRepository;
import com.ico.hotel.repository.TipoHabitacionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;

@SpringBootApplication
public class HotelApplication implements CommandLineRunner {

	private final HotelRepository hotelRepository;
	private final HabitacionRepository habitacionRepository;
	private final TipoHabitacionRepository tipoHabitacionRepository;

	public HotelApplication(HotelRepository hotelRepository, HabitacionRepository habitacionRepository,
			TipoHabitacionRepository tipoHabitacionRepository) {
		this.hotelRepository = hotelRepository;
		this.habitacionRepository = habitacionRepository;
		this.tipoHabitacionRepository = tipoHabitacionRepository;
	}

	public static void main(String[] args) {
		SpringApplication.run(HotelApplication.class, args);
	}

	@Override
	public void run(String... args) throws Exception {
		System.out.println("\n=======================================================");
		System.out.println("--- EJECUTANDO CONSULTAS DESDE COMMAND LINE RUNNER ---");
		System.out.println("=======================================================");
		mostrarHoteles();
		System.out.println("=======================================================\n");
	}

	/**
	 * Método findAll - Interfaz JPARepository
	 */
	private void mostrarHoteles() {
		System.out.println("\n*** 1. Mostrar todos los hoteles ***");
		List<Hotel> hoteles = hotelRepository.findAll();
		for (Hotel h : hoteles) {
			System.out.println("ID: " + h.getIdHotel() + " | Nombre: " + h.getNombre() + " | Ciudad: " + h.getCiudad());
		}
	}

	/**
	 * Método Personalizado con @Query - Habitaciones disponibles
	 */
	private void mostrarHabitacionesDisponibles() {
		System.out.println("\n*** 2. Habitaciones Disponibles ***");
		List<Habitacion> disponibles = habitacionRepository.findDisponibles();
		for (Habitacion h : disponibles) {
			System.out.println("Hab. " + h.getNumero() + " en " + h.getHotel().getNombre() + " - " + h.getEstado());
		}
	}

	/**
	 * Método Personalizado con @Query (Joins y Map)
	 */
	private void mostrarHabitacionesConTipoYPrecio() {
		System.out.println("\n*** 4. Habitaciones con su tipo y precio ***");
		List<Map<String, Object>> resultados = habitacionRepository.findHabitacionesConTipoYPrecio();
		for (Map<String, Object> r : resultados) {
			System.out.println(r.get("hotel") + " | Hab: " + r.get("habitacion") + " | Tipo: " + r.get("tipo")
					+ " | Precio: $" + r.get("precioBase"));
		}
	}

	/**
	 * Método findAll [Con Paginacion y Ordenados] - Interfaz
	 * PagingAndSortingRepository
	 */
	private void buscarHabitacionesPaginadas() {
		System.out.println("\n*** Ejemplo con Paginación y Orden ***");
		// Obtenemos 3 habitaciones por página, ordenadas por el número de forma
		// descendente
		Page<Habitacion> page = habitacionRepository.findAll(PageRequest.of(0, 3, Sort.by("numero").descending()));
		System.out.println("Total Registros: " + page.getTotalElements());
		System.out.println("Total Paginas: " + page.getTotalPages());
		for (Habitacion h : page.getContent()) {
			System.out.println("Hab: " + h.getNumero() + " - " + h.getEstado());
		}
	}
}
