package com.ico.hotel;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.mysql.MySQLContainer;

/**
 * Contenedor MySQL 8 compartido para toda la suite de pruebas de integración,
 * evitando cualquier lectura o escritura accidental sobre la base real hotel_db.
 */
public abstract class AbstractMysqlTestcontainerTest {

    static final MySQLContainer MYSQL_CONTAINER = new MySQLContainer("mysql:8.0.40")
            .withDatabaseName("hotel_test_db")
            .withUsername("test")
            .withPassword("test");

    static {
        MYSQL_CONTAINER.start();
    }

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        String baseUrl = MYSQL_CONTAINER.getJdbcUrl();
        String jdbcUrl = baseUrl
                + (baseUrl.contains("?") ? "&" : "?")
                + "useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Mexico_City";
        registry.add("spring.datasource.url", () -> jdbcUrl);
        registry.add("spring.datasource.username", MYSQL_CONTAINER::getUsername);
        registry.add("spring.datasource.password", MYSQL_CONTAINER::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }
}
