-- +goose Up
-- Only the player's explicit picks, part id to option id; catalog defaults fill the rest on read.
ALTER TABLE players ADD COLUMN appearance jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Priced avatar options the player bought; free and gear-only options are never stored.
CREATE TABLE player_looks (
    player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    look_id   text   NOT NULL,
    PRIMARY KEY (player_id, look_id)
);

-- +goose Down
DROP TABLE player_looks;
ALTER TABLE players DROP COLUMN appearance;
