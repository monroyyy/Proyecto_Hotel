-- 20. ¿Qué habitaciones tienen capacidad para 4 huéspedes?
SELECT hab.* 
FROM habitacion hab 
INNER JOIN tipo_habitacion t ON hab.id_tipo = t.id_tipo 
WHERE t.capacidad = 4;