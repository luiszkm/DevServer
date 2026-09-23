-- +goose Up
CREATE TABLE deploy_jobs (
    id           bigserial   PRIMARY KEY,
    player_id    bigint      NOT NULL REFERENCES players (id),
    type         text        NOT NULL,
    level        integer     NOT NULL,
    started_at   timestamptz NOT NULL,
    ends_at      timestamptz NOT NULL,
    xp           integer     NOT NULL,
    coins        integer     NOT NULL,
    gems         integer     NOT NULL,
    collected_at timestamptz
);

CREATE UNIQUE INDEX deploy_jobs_one_active_per_type ON deploy_jobs (player_id, type) WHERE collected_at IS NULL;

-- +goose Down
DROP TABLE deploy_jobs;
