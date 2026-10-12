-- 30. Listar las habitaciones disponibles ordenadas de la más barata a la más cara
SELECT hab.* 
FROM habitacion hab 
INNER JOIN tipo_habitacion t ON hab.id_tipo = t.id_tipo 
WHERE hab.estado = 'Disponible' 
ORDER BY t.precio_base ASC;