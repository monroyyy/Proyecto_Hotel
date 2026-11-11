-- P0.4: Revertir reservaciones Finalizada futuras sin check_out_at real al estado correspondiente
-- según anticipo pagado (Confirmada con saldo restaurado), dejando fuera la #22 (salida anticipada legítima).
-- Convención de timestamps: America/Mexico_City, fecha literal fija y no-op sobre BD vacía.

-- 1. Resolver traslape #23 vs #804 en habitación 62 reasignando #804 a habitación libre 5 (301, Hotel 1)
UPDATE reserva
   SET id_habitacion = 5,
       observaciones = CONCAT(
           COALESCE(NULLIF(TRIM(observaciones), ''), ''),
           IF(COALESCE(TRIM(observaciones), '') = '', '', ' | '),
           'Reasignada de hab. 62 a 5 durante migración V4 para evitar traslape con HP-2026-00023.'
       )
 WHERE id_reserva = 804
   AND folio = 'HP-2026-00772'
   AND id_habitacion = 62
   AND EXISTS (SELECT 1 FROM habitacion WHERE id_habitacion = 5);

-- 2. Insertar evento de auditoría CORRECCION_DATOS antes de cambiar el estado (guarda anti-duplicado + solo si sigue Finalizada sin check_out_at)
INSERT INTO reserva_evento (id_reserva, tipo, estado_anterior, estado_nuevo, usuario, fecha_hora, detalle)
SELECT r.id_reserva,
       'CORRECCION_DATOS',
       'Finalizada',
       IF(COALESCE(r.anticipo, 0.00) > 0.00, 'Confirmada', 'Pre-reserva'),
       'MIGRACION',
       '2026-11-10 17:40:00.000000',
       CONCAT(
           'Migración V4 (P0.4): estado corregido por fecha_salida futura sin check_out_at. Saldo restaurado a $',
           FORMAT(r.total - COALESCE(r.anticipo, 0.00), 2),
           IF(r.id_reserva = 804, ' (habitación reasignada 62 -> 5 por traslape con HP-2026-00023).', '.')
       )
  FROM reserva r
 WHERE (r.id_reserva, r.folio) IN (
           (23,  'HP-2026-00023'),
           (24,  'HP-2026-00024'),
           (795, 'HP-2026-00763'),
           (802, 'HP-2026-00770'),
           (803, 'HP-2026-00771'),
           (804, 'HP-2026-00772'),
           (808, 'HP-2026-00776'),
           (810, 'HP-2026-00778'),
           (814, 'HP-2026-00782'),
           (817, 'HP-2026-00785'),
           (818, 'HP-2026-00786')
       )
   AND r.estado = 'Finalizada'
   AND r.check_out_at IS NULL
   AND NOT EXISTS (
           SELECT 1 FROM reserva_evento e
            WHERE e.id_reserva = r.id_reserva
              AND e.tipo = 'CORRECCION_DATOS'
       );

-- 3. Revertir estado y restaurar saldo pendiente en las 11 filas fijas
UPDATE reserva
   SET estado = IF(COALESCE(anticipo, 0.00) > 0.00, 'Confirmada', 'Pre-reserva'),
       saldo  = total - COALESCE(anticipo, 0.00)
 WHERE (id_reserva, folio) IN (
           (23,  'HP-2026-00023'),
           (24,  'HP-2026-00024'),
           (795, 'HP-2026-00763'),
           (802, 'HP-2026-00770'),
           (803, 'HP-2026-00771'),
           (804, 'HP-2026-00772'),
           (808, 'HP-2026-00776'),
           (810, 'HP-2026-00778'),
           (814, 'HP-2026-00782'),
           (817, 'HP-2026-00785'),
           (818, 'HP-2026-00786')
       )
   AND estado = 'Finalizada'
   AND check_out_at IS NULL;
