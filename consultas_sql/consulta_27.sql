-- 27. Mostrar todas las habitaciones de un tipo específico
SELECT hab.* 
FROM habitacion hab 
INNER JOIN tipo_habitacion t ON hab.id_tipo = t.id_tipo 
WHERE t.nombre = 'Suite Ejecutiva';