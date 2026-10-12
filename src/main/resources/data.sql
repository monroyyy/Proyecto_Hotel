-- =========================================================================
-- CARGA INICIAL DE DATOS IDEMPOTENTE (SIN DUPLICADOS)
-- Usa INSERT IGNORE y llaves primarias fijas para evitar registros repetidos
-- al reiniciar la aplicación Spring Boot.
-- =========================================================================

-- 1. HOTELES (IDs 1 y 2)
INSERT IGNORE INTO hotel (id_hotel, nombre, direccion, ciudad, telefono, email, activo) 
VALUES (1, 'Hotel Paraíso', 'Av. Reforma #125, Col. Centro', 'Ciudad de México', '55-1234-5678', 'contacto@hotelparaiso.com', TRUE);

INSERT IGNORE INTO hotel (id_hotel, nombre, direccion, ciudad, telefono, email, activo) 
VALUES (2, 'Hotel Paraíso Ejecutivo', 'Av. Insurgentes Sur #850, Col. Del Valle', 'Ciudad de México', '55-8765-4321', 'contacto@hotelparaisoejecutivo.com', TRUE);

-- 2. TIPOS DE HABITACIÓN (IDs del 1 al 5)
INSERT IGNORE INTO tipo_habitacion (id_tipo, nombre, capacidad, descripcion, precio_base) 
VALUES (1, 'Habitación Individual', 1, 'Habitación para un huésped con cama individual', 850.00);

INSERT IGNORE INTO tipo_habitacion (id_tipo, nombre, capacidad, descripcion, precio_base) 
VALUES (2, 'Habitación Doble', 2, 'Habitación para dos huéspedes con dos camas individuales', 1200.00);

INSERT IGNORE INTO tipo_habitacion (id_tipo, nombre, capacidad, descripcion, precio_base) 
VALUES (3, 'Habitación Matrimonial', 2, 'Habitación para dos huéspedes con una cama matrimonial', 1300.00);

INSERT IGNORE INTO tipo_habitacion (id_tipo, nombre, capacidad, descripcion, precio_base) 
VALUES (4, 'Habitación Familiar', 4, 'Habitación amplia para hasta cuatro huéspedes', 1800.00);

INSERT IGNORE INTO tipo_habitacion (id_tipo, nombre, capacidad, descripcion, precio_base) 
VALUES (5, 'Suite Ejecutiva', 2, 'Habitación amplia con área de descanso y servicios adicionales', 2200.00);

-- 3. HABITACIONES (IDs del 1 al 10)
INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (1, 1, 1, '101', 1, 'Disponible');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (2, 1, 2, '102', 1, 'Ocupada');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (3, 1, 3, '201', 2, 'Disponible');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (4, 1, 4, '202', 2, 'Mantenimiento');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (5, 1, 5, '301', 3, 'Disponible');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (6, 2, 1, '101', 1, 'Disponible');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (7, 2, 2, '102', 1, 'Ocupada');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (8, 2, 3, '201', 2, 'Disponible');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (9, 2, 4, '202', 2, 'Disponible');

INSERT IGNORE INTO habitacion (id_habitacion, id_hotel, id_tipo, numero, piso, estado) 
VALUES (10, 2, 5, '301', 3, 'Mantenimiento');
