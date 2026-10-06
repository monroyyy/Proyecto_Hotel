INSERT INTO hotel (nombre, direccion, ciudad, telefono, email, activo) VALUES ('Hotel Paraíso', 'Av. Reforma #125, Col. Centro', 'Ciudad de México', '55-1234-5678', 'contacto@hotelparaiso.com', TRUE);
INSERT INTO hotel (nombre, direccion, ciudad, telefono, email, activo) VALUES ('Hotel Paraíso Ejecutivo', 'Av. Insurgentes Sur #850, Col. Del Valle', 'Ciudad de México', '55-8765-4321', 'contacto@hotelparaisoejecutivo.com', TRUE);

INSERT INTO tipo_habitacion (nombre, capacidad, descripcion, precio_base) VALUES ('Habitación Individual', 1, 'Habitación para un huésped con cama individual', 850.00);
INSERT INTO tipo_habitacion (nombre, capacidad, descripcion, precio_base) VALUES ('Habitación Doble', 2, 'Habitación para dos huéspedes con dos camas individuales', 1200.00);
INSERT INTO tipo_habitacion (nombre, capacidad, descripcion, precio_base) VALUES ('Habitación Matrimonial', 2, 'Habitación para dos huéspedes con una cama matrimonial', 1300.00);
INSERT INTO tipo_habitacion (nombre, capacidad, descripcion, precio_base) VALUES ('Habitación Familiar', 4, 'Habitación amplia para hasta cuatro huéspedes', 1800.00);
INSERT INTO tipo_habitacion (nombre, capacidad, descripcion, precio_base) VALUES ('Suite Ejecutiva', 2, 'Habitación amplia con área de descanso y servicios adicionales', 2200.00);

INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (1, 1, '101', 1, 'Disponible');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (1, 2, '102', 1, 'Ocupada');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (1, 3, '201', 2, 'Disponible');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (1, 4, '202', 2, 'Mantenimiento');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (1, 5, '301', 3, 'Disponible');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (2, 1, '101', 1, 'Disponible');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (2, 2, '102', 1, 'Ocupada');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (2, 3, '201', 2, 'Disponible');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (2, 4, '202', 2, 'Disponible');
INSERT INTO habitacion (id_hotel, id_tipo, numero, piso, estado) VALUES (2, 5, '301', 3, 'Mantenimiento');
