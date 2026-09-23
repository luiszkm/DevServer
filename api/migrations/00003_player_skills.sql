-- +goose Up
CREATE TABLE player_skills (
    player_id   bigint      NOT NULL REFERENCES players (id),
    skill_id    text        NOT NULL,
    unlocked_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, skill_id)
);

-- +goose Down
DROP TABLE player_skills;
