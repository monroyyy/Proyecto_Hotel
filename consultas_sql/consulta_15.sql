-- 15. Mostrar las habitaciones de cada hotel
SELECT hot.nombre AS hotel, hab.numero AS habitacion, hab.piso, hab.estado 
FROM habitacion hab 
INNER JOIN hotel hot ON hab.id_hotel = hot.id_hotel;