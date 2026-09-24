-- +goose Up
-- One component per rack slot; the slot's upper bound and the component come from the catalog.
CREATE TABLE player_rack (
    player_id    bigint   NOT NULL REFERENCES players (id),
    slot         smallint NOT NULL CHECK (slot >= 0),
    component_id text     NOT NULL,
    PRIMARY KEY (player_id, slot)
);

-- +goose Down
DROP TABLE player_rack;
