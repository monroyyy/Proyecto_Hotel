-- P2.2: Persistencia de tokens JWT revocados en logout
CREATE TABLE IF NOT EXISTS `token_revocado` (
    `token_hash` CHAR(64) NOT NULL,
    `expira_en` DATETIME(6) NOT NULL,
    `fecha_revocacion` DATETIME(6) NOT NULL,
    PRIMARY KEY (`token_hash`),
    KEY `idx_token_revocado_expira` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
