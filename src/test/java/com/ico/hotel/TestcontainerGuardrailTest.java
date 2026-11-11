package com.ico.hotel;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guardrail arquitectónico: garantiza que ninguna clase @SpringBootTest
 * se ejecute contra el datasource por defecto (hotel_db) sin heredar de
 * AbstractMysqlTestcontainerTest.
 */
class TestcontainerGuardrailTest {

    @Test
    @DisplayName("Todas las clases @SpringBootTest heredan obligatoriamente de AbstractMysqlTestcontainerTest")
    void todasLasPruebasSpringBootUsanTestcontainers() throws Exception {
        Path testRoot = Path.of("src", "test", "java");
        assertThat(testRoot).exists();

        List<Class<?>> springBootTests = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(testRoot)) {
            List<Path> javaFiles = walk
                    .filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .toList();

            for (Path file : javaFiles) {
                String rel = testRoot.relativize(file).toString()
                        .replace('/', '.')
                        .replace('\\', '.')
                        .replaceAll("\\.java$", "");
                Class<?> cls = Class.forName(rel);
                if (cls.isAnnotationPresent(SpringBootTest.class)) {
                    springBootTests.add(cls);
                }
            }
        }

        assertThat(springBootTests).isNotEmpty();
        List<String> sinTestcontainer = springBootTests.stream()
                .filter(cls -> !AbstractMysqlTestcontainerTest.class.isAssignableFrom(cls))
                .map(Class::getName)
                .toList();

        assertThat(sinTestcontainer)
                .as("Las siguientes clases @SpringBootTest no heredan de AbstractMysqlTestcontainerTest")
                .isEmpty();
    }
}
