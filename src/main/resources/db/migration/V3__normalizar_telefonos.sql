-- P1.5: Normalización de teléfonos (elimina guiones y espacios para cumplir ^\d{10}$)
-- Idempotente y segura sobre BD vacía.

UPDATE hotel
   SET telefono = REPLACE(REPLACE(TRIM(telefono), '-', ''), ' ', '')
 WHERE telefono IS NOT NULL
   AND (telefono LIKE '%-%' OR telefono LIKE '% %' OR telefono <> TRIM(telefono));

UPDATE huesped
   SET telefono = REPLACE(REPLACE(TRIM(telefono), '-', ''), ' ', '')
 WHERE telefono IS NOT NULL
   AND (telefono LIKE '%-%' OR telefono LIKE '% %' OR telefono <> TRIM(telefono));
