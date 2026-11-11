-- Opción A: Regularizar las 5 reservaciones históricas Finalizada con saldo > 0 (ids 4, 6, 13, 799, 800)
-- asumiendo saldo liquidado con el mismo metodo_pago original de cada fila.
-- Fijado por (id_reserva, folio), estado='Finalizada' y saldo > 0.00 para ser no-op en BD vacía o distinta.
-- Convención de timestamps: America/Mexico_City, fecha_hora literal fija.

-- 1. Registrar evento de auditoría CORRECCION_DATOS antes de actualizar el saldo (idempotente)
INSERT INTO `reserva_evento` (`id_reserva`, `tipo`, `estado_anterior`, `estado_nuevo`, `usuario`, `fecha_hora`, `detalle`)
SELECT r.`id_reserva`,
       'CORRECCION_DATOS',
       'Finalizada',
       'Finalizada',
       'MIGRACION',
       '2026-11-10 23:00:00.000000',
       'Regularización de datos de prueba: saldo asumido liquidado'
  FROM `reserva` r
 WHERE (r.`id_reserva`, r.`folio`) IN (
           (4,   'HP-2026-00004'),
           (6,   'HP-2026-00006'),
           (13,  'HP-2026-00013'),
           (799, 'HP-2026-00767'),
           (800, 'HP-2026-00768')
       )
   AND r.`estado` = 'Finalizada'
   AND r.`saldo` > 0.00
   AND NOT EXISTS (
           SELECT 1 FROM `reserva_evento` e
            WHERE e.`id_reserva` = r.`id_reserva`
              AND e.`tipo` = 'CORRECCION_DATOS'
              AND e.`fecha_hora` = '2026-11-10 23:00:00.000000'
       );

-- 2. Liquidar saldo conservando el metodo_pago original de cada fila
UPDATE `reserva`
   SET `saldo` = 0.00,
       `metodo_pago_saldo` = `metodo_pago`
 WHERE (`id_reserva`, `folio`) IN (
           (4,   'HP-2026-00004'),
           (6,   'HP-2026-00006'),
           (13,  'HP-2026-00013'),
           (799, 'HP-2026-00767'),
           (800, 'HP-2026-00768')
       )
   AND `estado` = 'Finalizada'
   AND `saldo` > 0.00;
