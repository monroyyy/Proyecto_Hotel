-- Carga inicial idempotente del catálogo base (ejecutada por Flyway después de V1-V5).
-- En hotel_db existente respeta las filas actuales por PK/UNIQUE; en BD vacía siembra hoteles 1-2,
-- tipos 1-5 y habitaciones 1-10 con teléfonos ya normalizados (10 dígitos).

INSERT IGNORE INTO hotel (id_hotel, nombre, direccion, ciudad, telefono, email, activo)
VALUES (1, 'Hotel Paraíso', 'Av. Reforma #125, Col. Centro', 'Ciudad de México', '5512345678', 'contacto@hotelparaiso.com', TRUE);

INSERT IGNORE INTO hotel (id_hotel, nombre, direccion, ciudad, telefono, email, activo)
VALUES (2, 'Hotel Paraíso Ejecutivo', 'Av. Insurgentes Sur #850, Col. Del Valle', 'Ciudad de México', '5587654321', 'contacto@hotelparaisoejecutivo.com', TRUE);

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
