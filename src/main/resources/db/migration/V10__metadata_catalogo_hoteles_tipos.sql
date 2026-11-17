-- P2.3: Metadata editorial y geolocalización en catálogo de hoteles e imagen en tipos de habitación
ALTER TABLE `hotel`
    ADD COLUMN `imagen_url` VARCHAR(500) NULL,
    ADD COLUMN `descripcion` VARCHAR(500) NULL,
    ADD COLUMN `tag_editorial` VARCHAR(60) NULL,
    ADD COLUMN `latitud` DECIMAL(9,6) NULL,
    ADD COLUMN `longitud` DECIMAL(9,6) NULL;

ALTER TABLE `tipo_habitacion`
    ADD COLUMN `imagen_url` VARCHAR(500) NULL;

-- Siembra metadata de sedes reales solo por (nombre, ciudad) y donde cada columna sea NULL (imagen_url permanece NULL; no-op en BD vacía)
UPDATE `hotel`
SET `descripcion` = COALESCE(`descripcion`, 'Alberca infinity & Terraza con horizonte caribeño'),
    `tag_editorial` = COALESCE(`tag_editorial`, 'Resort Insignia'),
    `latitud` = COALESCE(`latitud`, 21.161908),
    `longitud` = COALESCE(`longitud`, -86.851528)
WHERE `nombre` = 'Hotel Paraíso' AND `ciudad` = 'Cancún';

UPDATE `hotel`
SET `descripcion` = COALESCE(`descripcion`, 'Terraza gastronómica de autor & Concierge ejecutivo'),
    `tag_editorial` = COALESCE(`tag_editorial`, 'Distrito Financiero'),
    `latitud` = COALESCE(`latitud`, 19.432608),
    `longitud` = COALESCE(`longitud`, -99.133209)
WHERE `nombre` = 'Hotel Paraíso Ejecutivo' AND `ciudad` = 'Ciudad de México';

UPDATE `hotel`
SET `descripcion` = COALESCE(`descripcion`, 'Arquitectura sobria & Silencio para desconectar'),
    `tag_editorial` = COALESCE(`tag_editorial`, 'Refugio de Valle'),
    `latitud` = COALESCE(`latitud`, 19.799500),
    `longitud` = COALESCE(`longitud`, -99.873600)
WHERE `nombre` = 'Hotel UAEM' AND `ciudad` = 'Atlacomulco';

UPDATE `hotel`
SET `descripcion` = COALESCE(`descripcion`, 'Galería de arcos coloniales & Maderas nobles'),
    `tag_editorial` = COALESCE(`tag_editorial`, 'Cultura & Tradición'),
    `latitud` = COALESCE(`latitud`, 20.659698),
    `longitud` = COALESCE(`longitud`, -103.349609)
WHERE `nombre` = 'Hotel Los Arcos' AND `ciudad` = 'Guadalajara';

UPDATE `hotel`
SET `descripcion` = COALESCE(`descripcion`, 'Vistas panorámicas & Atardeceres dorados en acantilado'),
    `tag_editorial` = COALESCE(`tag_editorial`, 'Bahía Histórica'),
    `latitud` = COALESCE(`latitud`, 16.853109),
    `longitud` = COALESCE(`longitud`, -99.823653)
WHERE `nombre` = 'Hotel Costa Azul' AND `ciudad` = 'Acapulco';
