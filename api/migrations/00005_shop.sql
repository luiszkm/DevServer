-- +goose Up
CREATE TABLE player_gear (
    player_id bigint NOT NULL REFERENCES players (id),
    gear_id   text   NOT NULL,
    PRIMARY KEY (player_id, gear_id)
);

-- Only an owned piece can be equipped, and each slot holds at most one.
CREATE TABLE player_equipment (
    player_id bigint NOT NULL,
    slot      text   NOT NULL,
    gear_id   text   NOT NULL,
    PRIMARY KEY (player_id, slot),
    FOREIGN KEY (player_id, gear_id) REFERENCES player_gear (player_id, gear_id)
);

-- `default` is owned by everyone and never stored; the worn skin stays in players.skin.
CREATE TABLE player_skins (
    player_id bigint NOT NULL REFERENCES players (id),
    skin_id   text   NOT NULL CHECK (skin_id <> 'default'),
    PRIMARY KEY (player_id, skin_id)
);

-- +goose Down
DROP TABLE player_skins;
DROP TABLE player_equipment;
DROP TABLE player_gear;
