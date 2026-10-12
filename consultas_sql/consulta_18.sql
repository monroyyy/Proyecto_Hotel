-- 18. ¿Qué habitaciones están disponibles en un hotel específico?
SELECT hab.* 
FROM habitacion hab 
INNER JOIN hotel hot ON hab.id_hotel = hot.id_hotel 
WHERE hab.estado = 'Disponible' AND hot.nombre = 'Hotel Paraíso';