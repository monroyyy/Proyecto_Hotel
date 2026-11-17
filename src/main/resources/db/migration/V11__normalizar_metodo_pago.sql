-- Normalización de método de pago al catálogo canónico de 4 valores:
--   EFECTIVO, TARJETA_CREDITO, TARJETA_DEBITO, TRANSFERENCIA (o NULL).
-- Conteos observados en hotel_db antes de migrar (811 filas):
--   metodo_pago:       Efectivo=215, TRANSFERENCIA=201, TARJETA_CREDITO=198, TARJETA_DEBITO=180, NULL=11, Tarjeta=6
--   metodo_pago_saldo: NULL=805, Efectivo=4, TARJETA_DEBITO=1, TARJETA_CREDITO=1

-- 1. Auditoría CORRECCION_DATOS únicamente para las 6 filas históricas con 'Tarjeta' genérica (no-op en BD vacía)
INSERT INTO `reserva_evento` (`id_reserva`, `tipo`, `estado_anterior`, `estado_nuevo`, `usuario`, `fecha_hora`, `detalle`)
SELECT `id_reserva`,
       'CORRECCION_DATOS',
       `estado`,
       `estado`,
       'MIGRACION',
       '2026-11-11 01:00:00.000000',
       'Normalización de método de pago: Tarjeta genérica migrada a TARJETA_CREDITO'
FROM `reserva`
WHERE (`id_reserva`, `folio`) IN (
    (1, 'HP-2026-00001'),
    (22, 'HP-2026-00022'),
    (23, 'HP-2026-00023'),
    (24, 'HP-2026-00024'),
    (25, 'HP-2026-00025'),
    (26, 'HP-2026-00026')
)
  AND `metodo_pago` = 'Tarjeta';

UPDATE `reserva`
SET `metodo_pago` = 'TARJETA_CREDITO'
WHERE (`id_reserva`, `folio`) IN (
    (1, 'HP-2026-00001'),
    (22, 'HP-2026-00022'),
    (23, 'HP-2026-00023'),
    (24, 'HP-2026-00024'),
    (25, 'HP-2026-00025'),
    (26, 'HP-2026-00026')
)
  AND `metodo_pago` = 'Tarjeta';

-- 2. Normalización de capitalización en metodo_pago (215 'Efectivo' -> 'EFECTIVO', etc.) y metodo_pago_saldo (4 'Efectivo' -> 'EFECTIVO')
UPDATE `reserva`
SET `metodo_pago` = CASE UPPER(TRIM(`metodo_pago`))
    WHEN 'EFECTIVO' THEN 'EFECTIVO'
    WHEN 'TRANSFERENCIA' THEN 'TRANSFERENCIA'
    WHEN 'TARJETA_CREDITO' THEN 'TARJETA_CREDITO'
    WHEN 'TARJETA_DEBITO' THEN 'TARJETA_DEBITO'
    ELSE `metodo_pago`
END
WHERE `metodo_pago` IS NOT NULL;

UPDATE `reserva`
SET `metodo_pago_saldo` = CASE UPPER(TRIM(`metodo_pago_saldo`))
    WHEN 'EFECTIVO' THEN 'EFECTIVO'
    WHEN 'TRANSFERENCIA' THEN 'TRANSFERENCIA'
    WHEN 'TARJETA_CREDITO' THEN 'TARJETA_CREDITO'
    WHEN 'TARJETA_DEBITO' THEN 'TARJETA_DEBITO'
    ELSE `metodo_pago_saldo`
END
WHERE `metodo_pago_saldo` IS NOT NULL;

-- 3. Restricción CHECK en esquema para garantizar el catálogo canónico
ALTER TABLE `reserva`
    ADD CONSTRAINT `chk_reserva_metodo_pago`
        CHECK (`metodo_pago` IS NULL OR `metodo_pago` IN ('EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA')),
    ADD CONSTRAINT `chk_reserva_metodo_pago_saldo`
        CHECK (`metodo_pago_saldo` IS NULL OR `metodo_pago_saldo` IN ('EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA'));
