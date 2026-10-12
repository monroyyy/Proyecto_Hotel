-- 19. ¿Cuántas habitaciones están en mantenimiento?
SELECT COUNT(*) AS en_mantenimiento FROM habitacion WHERE estado = 'Mantenimiento';