-- V12: Agregar columna telefono a la tabla usuario y sincronizar teléfonos existentes desde huesped
ALTER TABLE usuario ADD COLUMN telefono VARCHAR(20) NULL;

UPDATE usuario u
JOIN huesped h ON LOWER(u.email) = LOWER(h.email)
SET u.telefono = h.telefono
WHERE (u.telefono IS NULL OR u.telefono = '')
  AND h.telefono IS NOT NULL
  AND h.telefono <> '';
