package com.ico.hotel;

import com.ico.hotel.services.ReservaExpiracionJob;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "app.jobs.expiracion-enabled=true",
        "app.jobs.expiracion-dry-run=true"
})
class Bloque4BSchedulerHabilitadoTest extends AbstractMysqlTestcontainerTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private ScheduledTaskHolder scheduledTaskHolder;

    @Test
    @DisplayName("P2.2.1b Con expiracion-enabled=true existen ReservaExpiracionJob y las purgas @Scheduled")
    void testSchedulingConExpiracionHabilitada() {
        assertThat(applicationContext.getBeansOfType(ReservaExpiracionJob.class)).hasSize(1);

        List<String> tareas = scheduledTaskHolder.getScheduledTasks().stream()
                .map(ScheduledTask::getTask)
                .map(Object::toString)
                .toList();

        assertThat(tareas).anyMatch(t -> t.contains("ReservaExpiracionJob.ejecutarExpiracionProgramada"));
        assertThat(tareas).anyMatch(t -> t.contains("TokenBlacklistService.cleanupExpired"));
        assertThat(tareas).anyMatch(t -> t.contains("AuthRateLimiterService.purgarExpirados"));
    }
}
