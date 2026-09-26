-- +goose Up
-- A region can have several enemies (assets-apply door 2): the battle keeps the one it drew.
-- Battles saved before this fought the region's original enemy, whose id is the region.
ALTER TABLE battles ADD COLUMN enemy text;
UPDATE battles SET enemy = region;
ALTER TABLE battles ALTER COLUMN enemy SET NOT NULL;

-- +goose Down
ALTER TABLE battles DROP COLUMN enemy;
