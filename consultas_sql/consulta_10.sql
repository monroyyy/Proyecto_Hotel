-- 10. ¿Cuál es el tipo de habitación más barato?
SELECT * FROM tipo_habitacion ORDER BY precio_base ASC LIMIT 1;