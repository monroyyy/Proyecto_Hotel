-- 11. ¿Cuál es el tipo de habitación más caro?
SELECT * FROM tipo_habitacion ORDER BY precio_base DESC LIMIT 1;