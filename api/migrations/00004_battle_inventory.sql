-- +goose Up
CREATE TABLE player_items (
    player_id bigint  NOT NULL REFERENCES players (id),
    item_id   text    NOT NULL,
    quantity  integer NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (player_id, item_id)
);

-- Every player starts with 2 cache potions, existing players included.
INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'sp_potion', 2 FROM players;

CREATE TABLE battles (
    player_id    bigint  PRIMARY KEY REFERENCES players (id),
    region       text    NOT NULL,
    enemy_hp     integer NOT NULL,
    enemy_hp_max integer NOT NULL,
    sp           integer NOT NULL,
    sp_max       integer NOT NULL,
    weak         boolean NOT NULL,
    status       text    NOT NULL CHECK (status IN ('active', 'won'))
);

-- +goose Down
DROP TABLE battles;
DROP TABLE player_items;
