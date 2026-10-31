-- Registry of every category id ever issued. Rows are never deleted, so an id that belonged to a
-- deleted category can never be handed out again (even after restarts). Non-destructive.
CREATE TABLE IF NOT EXISTS category_id_log (
  id        CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
