-- Brand names of a subcategory (one row per brand). Deleting a subcategory deletes its brand rows.
-- The case-insensitive collation makes "Kent" and "kent" the same brand within one subcategory.
CREATE TABLE IF NOT EXISTS subcategory_brand (
  subcategory_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  brand_name     VARCHAR(100) NOT NULL,
  PRIMARY KEY (subcategory_id, brand_name),
  KEY idx_subcategory_brand_name (brand_name),
  CONSTRAINT fk_subcategory_brand_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategory (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;