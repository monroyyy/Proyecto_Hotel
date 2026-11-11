-- Esquema inicial consolidado de Hotel Paraíso (incluye ciclo de estancia Fase 1)

CREATE TABLE IF NOT EXISTS `hotel` (
  `id_hotel` int NOT NULL AUTO_INCREMENT,
  `activo` bit(1) DEFAULT NULL,
  `ciudad` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_hotel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `tipo_habitacion` (
  `id_tipo` int NOT NULL AUTO_INCREMENT,
  `capacidad` int DEFAULT NULL,
  `descripcion` text,
  `nombre` varchar(255) DEFAULT NULL,
  `precio_base` decimal(38,2) DEFAULT NULL,
  PRIMARY KEY (`id_tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `email` varchar(150) NOT NULL,
  `fecha_creacion` datetime(6) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `rol` enum('ADMINISTRADOR','GERENTE','HUESPED','RECEPCIONISTA') NOT NULL,
  `verificado` bit(1) NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuario_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `huesped` (
  `id_huesped` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_huesped`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `recepcionista` (
  `id_recepcionista` int NOT NULL AUTO_INCREMENT,
  `activo` bit(1) DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_recepcionista`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `habitacion` (
  `id_habitacion` int NOT NULL AUTO_INCREMENT,
  `estado` varchar(255) DEFAULT NULL,
  `numero` varchar(255) DEFAULT NULL,
  `piso` int DEFAULT NULL,
  `id_hotel` int DEFAULT NULL,
  `id_tipo` int DEFAULT NULL,
  PRIMARY KEY (`id_habitacion`),
  KEY `FKnati1hwmlnaiemvjcwuql8web` (`id_hotel`),
  KEY `FKdcoaq57t9b9otsbnmp6gjbn4s` (`id_tipo`),
  CONSTRAINT `FKdcoaq57t9b9otsbnmp6gjbn4s` FOREIGN KEY (`id_tipo`) REFERENCES `tipo_habitacion` (`id_tipo`),
  CONSTRAINT `FKnati1hwmlnaiemvjcwuql8web` FOREIGN KEY (`id_hotel`) REFERENCES `hotel` (`id_hotel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `reserva` (
  `id_reserva` int NOT NULL AUTO_INCREMENT,
  `adultos` int DEFAULT NULL,
  `anticipo` decimal(38,2) DEFAULT NULL,
  `banco_reembolso` varchar(255) DEFAULT NULL,
  `cama_extra` bit(1) DEFAULT NULL,
  `clabe_reembolso` varchar(255) DEFAULT NULL,
  `cuna` bit(1) DEFAULT NULL,
  `estado` varchar(255) DEFAULT NULL,
  `fecha_cancelacion` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_entrada` date DEFAULT NULL,
  `fecha_expiracion` datetime(6) DEFAULT NULL,
  `fecha_salida` date DEFAULT NULL,
  `folio` varchar(255) DEFAULT NULL,
  `metodo_pago` varchar(255) DEFAULT NULL,
  `monto_reembolso` decimal(38,2) DEFAULT NULL,
  `ninos` int DEFAULT NULL,
  `noches` int DEFAULT NULL,
  `observaciones` text,
  `planta_baja_solicitada` bit(1) DEFAULT NULL,
  `recepcionista` varchar(255) DEFAULT NULL,
  `saldo` decimal(38,2) DEFAULT NULL,
  `titular_reembolso` varchar(255) DEFAULT NULL,
  `total` decimal(38,2) DEFAULT NULL,
  `id_habitacion` int DEFAULT NULL,
  `id_huesped` int DEFAULT NULL,
  `id_usuario` int DEFAULT NULL,
  `motivo_cancelacion` varchar(255) DEFAULT NULL,
  `reembolso_autorizado_por` varchar(255) DEFAULT NULL,
  `check_in_at` datetime(6) DEFAULT NULL,
  `check_out_at` datetime(6) DEFAULT NULL,
  `metodo_pago_saldo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_reserva`),
  KEY `FKe2otj7riiuv7q4k4t58gg9kj1` (`id_habitacion`),
  KEY `FK9x7qd5htagpqmaovllmu5kf88` (`id_huesped`),
  KEY `FKsbrwim47vm17adpuqj3dou9au` (`id_usuario`),
  CONSTRAINT `FK9x7qd5htagpqmaovllmu5kf88` FOREIGN KEY (`id_huesped`) REFERENCES `huesped` (`id_huesped`),
  CONSTRAINT `FKe2otj7riiuv7q4k4t58gg9kj1` FOREIGN KEY (`id_habitacion`) REFERENCES `habitacion` (`id_habitacion`),
  CONSTRAINT `FKsbrwim47vm17adpuqj3dou9au` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `reserva_evento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `detalle` text,
  `estado_anterior` varchar(30) DEFAULT NULL,
  `estado_nuevo` varchar(30) NOT NULL,
  `fecha_hora` datetime(6) NOT NULL,
  `id_reserva` int NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `usuario` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `token_verificacion` (
  `id_token` int NOT NULL AUTO_INCREMENT,
  `fecha_creacion` datetime(6) NOT NULL,
  `fecha_expiracion` datetime(6) NOT NULL,
  `token` varchar(128) NOT NULL,
  `usado` bit(1) NOT NULL,
  `id_usuario` int NOT NULL,
  `codigo` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id_token`),
  UNIQUE KEY `uk_token_verificacion_token` (`token`),
  KEY `FK87gekwr3hydj963dq60s9oigl` (`id_usuario`),
  CONSTRAINT `FK87gekwr3hydj963dq60s9oigl` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `spring_ai_chat_memory` (
  `conversation_id` varchar(100) NOT NULL,
  `content` text NOT NULL,
  `type` enum('USER','ASSISTANT','SYSTEM','TOOL') NOT NULL,
  `timestamp` timestamp NOT NULL,
  `sequence_id` bigint NOT NULL,
  KEY `SPRING_AI_CHAT_MEMORY_CONVERSATION_ID_TIMESTAMP_IDX` (`conversation_id`,`timestamp`),
  KEY `SPRING_AI_CHAT_MEMORY_CONVERSATION_ID_SEQUENCE_ID_IDX` (`conversation_id`,`sequence_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
