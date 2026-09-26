-- +goose Up
-- Skill loadout (skill-loadout door 1): each unlocked node has a level and, while equipped, one of
-- the loadout slots. The slot count comes from the catalog (4); the CHECK is its upper bound.
ALTER TABLE player_skills
    ADD COLUMN level smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
    ADD COLUMN slot  smallint NULL CHECK (slot BETWEEN 0 AND 3),
    ADD CONSTRAINT player_skills_slot_unique UNIQUE (player_id, slot);

-- Players keep what they had: every node unlocked before the loadout existed is equipped, in
-- catalog order (x1 < x2 < x3 within the class tree). Their stored HP already counts it.
UPDATE player_skills AS s
SET slot = r.n - 1
FROM (
    SELECT player_id, skill_id, row_number() OVER (PARTITION BY player_id ORDER BY skill_id) AS n
    FROM player_skills
) AS r
WHERE s.player_id = r.player_id AND s.skill_id = r.skill_id AND r.n <= 4;

-- The power bar (limit-break door 1) starts empty for every player.
ALTER TABLE players ADD COLUMN power integer NOT NULL DEFAULT 0 CHECK (power >= 0);

-- +goose Down
ALTER TABLE players DROP COLUMN power;
ALTER TABLE player_skills
    DROP CONSTRAINT player_skills_slot_unique,
    DROP COLUMN slot,
    DROP COLUMN level;
