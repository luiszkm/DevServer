-- +goose Up
-- One piece of furniture per (zone, position); zone, position bounds and furniture come from the catalog.
CREATE TABLE player_office (
    player_id    bigint   NOT NULL REFERENCES players (id),
    zone         text     NOT NULL,
    position     smallint NOT NULL CHECK (position >= 0),
    furniture_id text     NOT NULL,
    PRIMARY KEY (player_id, zone, position)
);

-- +goose Down
DROP TABLE player_office;
