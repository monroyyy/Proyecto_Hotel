package com.ico.hotel.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Garantiza que Flyway (flywayInitializer) ejecute todas las migraciones antes de que
 * Hibernate inicialice entityManagerFactory con ddl-auto=validate.
 */
@Configuration
public class FlywayOrderConfig {

    @Bean
    public static BeanFactoryPostProcessor flywayBeforeJpaPostProcessor() {
        return beanFactory -> {
            if (beanFactory.containsBeanDefinition("entityManagerFactory")
                    && beanFactory.containsBeanDefinition("flywayInitializer")) {
                BeanDefinition emfDef = beanFactory.getBeanDefinition("entityManagerFactory");
                Set<String> deps = new LinkedHashSet<>();
                if (emfDef.getDependsOn() != null) {
                    for (String dep : emfDef.getDependsOn()) {
                        deps.add(dep);
                    }
                }
                deps.add("flywayInitializer");
                emfDef.setDependsOn(deps.toArray(new String[0]));
            }
        };
    }
}
