-- +goose Up
-- The hero's body type; rows created before bodies existed wear the original (masculine) body.
ALTER TABLE players ADD COLUMN body text NOT NULL DEFAULT 'masculino'
    CHECK (body IN ('masculino', 'feminino'));

-- +goose Down
ALTER TABLE players DROP COLUMN body;
