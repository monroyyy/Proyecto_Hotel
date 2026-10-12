-- 16. Mostrar habitaciones con su tipo y precio
SELECT hot.nombre AS hotel, hab.numero AS habitacion, t.nombre AS tipo, t.capacidad, t.precio_base 
FROM habitacion hab 
INNER JOIN hotel hot ON hab.id_hotel = hot.id_hotel 
INNER JOIN tipo_habitacion t ON hab.id_tipo = t.id_tipo;