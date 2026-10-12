-- 4. ¿Cuántas habitaciones tiene cada hotel?
SELECT h.nombre AS hotel, COUNT(ha.id_habitacion) AS total_habitaciones
FROM hotel h 
LEFT JOIN habitacion ha ON h.id_hotel = ha.id_hotel 
GROUP BY h.id_hotel, h.nombre;