-- +goose Up
-- The notebook is the weapon: one level per dev, upgrades bought one row at a time.
ALTER TABLE players ADD COLUMN notebook_level integer NOT NULL DEFAULT 1 CHECK (notebook_level >= 1);

CREATE TABLE player_notebook_upgrades (
    player_id  bigint  NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    upgrade_id text    NOT NULL,
    level      integer NOT NULL CHECK (level >= 1),
    PRIMARY KEY (player_id, upgrade_id)
);

-- The gear slot "notebook" is gone. A piece there moves to acessorio when that slot is free;
-- otherwise it is unequipped and stays owned. Down cannot tell those rows apart, so it leaves them.
UPDATE player_equipment SET slot = 'acessorio'
WHERE slot = 'notebook'
  AND player_id NOT IN (SELECT player_id FROM player_equipment WHERE slot = 'acessorio');
DELETE FROM player_equipment WHERE slot = 'notebook';

-- +goose Down
DROP TABLE player_notebook_upgrades;
ALTER TABLE players DROP COLUMN notebook_level;
