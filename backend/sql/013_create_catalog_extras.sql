-- Extra storefront data kept in SIDE tables so the existing category / subcategory / product tables are not altered.
-- catalog_node: short URL slug, menu order and visibility for a category or subcategory (falls back to slugified name).
-- product_extra: storefront-only product details (feature bullets, spec table, option groups, price range ...) as JSON.
CREATE TABLE IF NOT EXISTS catalog_node (
  entity_type  ENUM('category','subcategory') NOT NULL,
  entity_id    CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  slug         VARCHAR(120) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  show_in_menu TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (entity_type, entity_id),
  UNIQUE KEY uq_catalog_node_slug (entity_type, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_extra (
  product_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  extra      JSON NOT NULL,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_product_extra_product FOREIGN KEY (product_id) REFERENCES product (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
