-- Registers the ids of all existing categories so they are never reissued.
-- INSERT IGNORE makes this safe to run repeatedly. Existing category rows are only read.
INSERT IGNORE INTO category_id_log (id) SELECT id FROM category;
