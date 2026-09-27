-- +goose Up
-- One lighting per dev; the ids and their comfort come from the catalog, so there is no CHECK on the value.
ALTER TABLE players ADD COLUMN office_light text NOT NULL DEFAULT 'natural';

-- +goose Down
ALTER TABLE players DROP COLUMN office_light;
