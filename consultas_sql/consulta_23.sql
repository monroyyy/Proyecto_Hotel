-- 23. ¿Qué habitaciones hay en un piso de un hotel específico?
SELECT hab.* 
FROM habitacion hab 
INNER JOIN hotel hot ON hab.id_hotel = hot.id_hotel 
WHERE hot.nombre = 'Hotel Paraíso' AND hab.piso = 1;