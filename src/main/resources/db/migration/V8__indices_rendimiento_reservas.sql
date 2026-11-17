-- P2.1: Índices para paginación, filtros de reservaciones y verificación de traslapes
CREATE INDEX `idx_reserva_estado_entrada` ON `reserva` (`estado`, `fecha_entrada`);
CREATE INDEX `idx_reserva_hab_fechas` ON `reserva` (`id_habitacion`, `fecha_entrada`, `fecha_salida`);
CREATE INDEX `idx_reserva_fecha_creacion` ON `reserva` (`fecha_creacion` DESC);
