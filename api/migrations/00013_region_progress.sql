-- +goose Up
-- How many nodes of a region the player has beaten (AD-021). No row means none.
CREATE TABLE region_progress (
    player_id bigint  NOT NULL REFERENCES players (id),
    region    text    NOT NULL,
    cleared   integer NOT NULL CHECK (cleared >= 0),
    PRIMARY KEY (player_id, region)
);

-- A fight started from a path node remembers which one. Random fights leave it null.
ALTER TABLE battles ADD COLUMN node text;

-- +goose Down
ALTER TABLE battles DROP COLUMN node;
DROP TABLE region_progress;
