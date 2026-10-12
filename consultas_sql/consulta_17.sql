-- 17. Contar las habitaciones disponibles por hotel
SELECT hot.nombre AS hotel, COUNT(hab.id_habitacion) AS habitaciones_disponibles 
FROM habitacion hab 
INNER JOIN hotel hot ON hab.id_hotel = hot.id_hotel 
WHERE hab.estado = 'Disponible' 
GROUP BY hot.id_hotel, hot.nombre;