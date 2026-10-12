-- 29. ¿Qué habitaciones están en una ciudad en específico?
SELECT hab.* 
FROM habitacion hab 
INNER JOIN hotel hot ON hab.id_hotel = hot.id_hotel 
WHERE hot.ciudad = 'Ciudad de México';