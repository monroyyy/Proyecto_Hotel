ALTER TABLE `usuario`
    ADD COLUMN `token_version` INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `token_recuperacion_password` (
    `id_token` INT NOT NULL AUTO_INCREMENT,
    `id_usuario` INT NOT NULL,
    `codigo_hash` VARCHAR(255) NOT NULL,
    `intentos` INT NOT NULL DEFAULT 0,
    `max_intentos` INT NOT NULL DEFAULT 5,
    `usado` BIT(1) NOT NULL DEFAULT b'0',
    `fecha_creacion` DATETIME(6) NOT NULL,
    `fecha_expiracion` DATETIME(6) NOT NULL,
    PRIMARY KEY (`id_token`),
    KEY `idx_trp_usuario_estado` (`id_usuario`, `usado`, `fecha_expiracion`),
    CONSTRAINT `fk_trp_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
