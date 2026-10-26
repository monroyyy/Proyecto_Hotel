package com.ico.hotel.config;

import com.ico.hotel.models.Recepcionista;
import com.ico.hotel.repository.RecepcionistaRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Carga inicial: Javier es el recepcionista identificado en la entrevista. */
@Component
public class RecepcionistaSeeder implements ApplicationRunner {

    private final RecepcionistaRepository repo;

    public RecepcionistaSeeder(RecepcionistaRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repo.findByNombreIgnoreCase("Javier").isEmpty()) {
            Recepcionista r = new Recepcionista();
            r.setNombre("Javier");
            r.setActivo(true);
            repo.save(r);
        }
    }
}
