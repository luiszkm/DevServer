-- +goose Up
-- Class trees replace the shared ones (class-skills door 3). Old ids leave the catalog,
-- so the points spent on them come back and the HP those nodes wrote is undone.
-- f1 and b1 were +10 HP, i2 was +15; the other old ids stored no HP.
UPDATE players AS p
SET skill_points = p.skill_points + b.n,
    hp_max = GREATEST(1, p.hp_max - b.hp),
    hp = CASE
        WHEN b.hp = 0 THEN p.hp
        ELSE LEAST(GREATEST(1, p.hp_max - b.hp), GREATEST(1, p.hp - b.hp))
    END
FROM (
    SELECT player_id,
           count(*)::int AS n,
           COALESCE(SUM(CASE skill_id
               WHEN 'f1' THEN 10
               WHEN 'b1' THEN 10
               WHEN 'i2' THEN 15
               ELSE 0
           END), 0)::int AS hp
    FROM player_skills
    GROUP BY player_id
) AS b
WHERE p.id = b.player_id;

DELETE FROM player_skills;

-- +goose Down
-- The old ids are gone from the catalog. Putting the rows back would resurrect dead skills.
SELECT 1;
