-- CollabDoc — Initial Schema for MySQL (drizzle-orm 0.30.x compatible)
-- Yjs binary data stored as base64 LONGTEXT (blob not available in drizzle 0.30)
-- Run in phpMyAdmin: select `collab_editor` → SQL tab → paste → Go

CREATE TABLE IF NOT EXISTS `users` (
  `id`         VARCHAR(36)  NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `provider`   VARCHAR(50)  NOT NULL DEFAULT 'credentials',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `documents` (
  `id`           VARCHAR(36)  NOT NULL,
  `owner_id`     VARCHAR(36)  NOT NULL,
  `title`        VARCHAR(500) NOT NULL DEFAULT 'Untitled Document',
  `yjs_state`    LONGTEXT     NULL,
  `content_json` JSON         NULL,
  `size_bytes`   BIGINT       NOT NULL DEFAULT 0,
  `is_public`    TINYINT(1)   NOT NULL DEFAULT 0,
  `deleted_at`   TIMESTAMP    NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `docs_owner_idx`   (`owner_id`),
  KEY `docs_deleted_idx` (`deleted_at`),
  CONSTRAINT `fk_docs_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `document_collaborators` (
  `id`          VARCHAR(36) NOT NULL,
  `document_id` VARCHAR(36) NOT NULL,
  `user_id`     VARCHAR(36) NOT NULL,
  `role`        ENUM('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
  `invited_by`  VARCHAR(36) NULL,
  `accepted_at` TIMESTAMP   NULL,
  `created_at`  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collab_unique` (`document_id`, `user_id`),
  CONSTRAINT `fk_collab_doc`     FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_collab_user`    FOREIGN KEY (`user_id`)     REFERENCES `users`     (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_collab_inviter` FOREIGN KEY (`invited_by`)  REFERENCES `users`     (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `document_versions` (
  `id`          VARCHAR(36)  NOT NULL,
  `document_id` VARCHAR(36)  NOT NULL,
  `created_by`  VARCHAR(36)  NOT NULL,
  `label`       VARCHAR(200) NULL,
  `description` TEXT         NULL,
  `snapshot`    JSON         NOT NULL,
  `yjs_sv`      LONGTEXT     NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `versions_doc_idx`  (`document_id`),
  KEY `versions_date_idx` (`created_at`),
  CONSTRAINT `fk_ver_doc`  FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ver_user` FOREIGN KEY (`created_by`)  REFERENCES `users`     (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `sync_operations` (
  `id`          VARCHAR(36)  NOT NULL,
  `document_id` VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(36)  NOT NULL,
  `yjs_update`  LONGTEXT     NOT NULL,
  `client_id`   VARCHAR(100) NOT NULL,
  `clock`       BIGINT       NOT NULL,
  `synced_at`   TIMESTAMP    NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sync_ops_doc_clock_idx` (`document_id`, `clock`),
  CONSTRAINT `fk_sync_doc`  FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sync_user` FOREIGN KEY (`user_id`)     REFERENCES `users`     (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `ai_suggestions` (
  `id`          VARCHAR(36) NOT NULL,
  `document_id` VARCHAR(36) NOT NULL,
  `user_id`     VARCHAR(36) NOT NULL,
  `type`        ENUM('summary','grammar','autocomplete','rewrite','explain') NOT NULL,
  `prompt`      TEXT NULL,
  `response`    TEXT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ai_doc`  FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_user` FOREIGN KEY (`user_id`)     REFERENCES `users`     (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
