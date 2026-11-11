-- Consolidación de duplicados en hotel (18 -> 17) y tipo_habitacion (33 -> 32),
-- más ajuste horario (-6 h) en la reserva 22 y sus eventos de prueba Fase 1.
-- Idempotente y segura sobre BD vacía.

-- Datos descartados conservados para referencia histórica:
--   hotel 18: nombre='Hotel Los Arcos', ciudad='Guadalajara', direccion='Av. Vallarta 450, Col. Americana',
--             email='contacto@losarcoshotel.com', telefono='3335559988', activo=0
--   tipo_habitacion 33: nombre='Master Suite', capacidad=4, precio_base=2800.00,
--                       descripcion='Exclusiva suite con jacuzzi, cama king size y terraza privada con vista panorámica'

UPDATE habitacion
   SET id_hotel = 17
 WHERE id_hotel = 18
   AND EXISTS (SELECT 1 FROM hotel WHERE id_hotel = 17);

UPDATE habitacion
   SET id_tipo = 32
 WHERE id_tipo = 33
   AND EXISTS (SELECT 1 FROM tipo_habitacion WHERE id_tipo = 32);

DELETE FROM hotel
 WHERE id_hotel = 18
   AND NOT EXISTS (SELECT 1 FROM habitacion WHERE id_hotel = 18);

DELETE FROM tipo_habitacion
 WHERE id_tipo = 33
   AND NOT EXISTS (SELECT 1 FROM habitacion WHERE id_tipo = 33);

-- Corrección de desfase UTC (-6 h) en reserva 22 y eventos 28/29 con guarda exacta
UPDATE reserva
   SET check_in_at = '2026-11-10 16:40:34.168668'
 WHERE id_reserva = 22
   AND folio = 'HP-2026-00022'
   AND check_in_at = '2026-11-10 22:40:34.168668';

UPDATE reserva
   SET check_out_at = '2026-11-10 16:42:32.846069'
 WHERE id_reserva = 22
   AND folio = 'HP-2026-00022'
   AND check_out_at = '2026-11-10 22:42:32.846069';

UPDATE reserva_evento
   SET fecha_hora = '2026-11-10 16:40:34.169667'
 WHERE id = 28
   AND id_reserva = 22
   AND fecha_hora = '2026-11-10 22:40:34.169667';

UPDATE reserva_evento
   SET fecha_hora = '2026-11-10 16:42:32.847067'
 WHERE id = 29
   AND id_reserva = 22
   AND fecha_hora = '2026-11-10 22:42:32.847067';
