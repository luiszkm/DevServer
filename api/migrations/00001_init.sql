-- +goose Up
CREATE TABLE players (
    id             bigserial PRIMARY KEY,
    github_user_id bigint      NOT NULL UNIQUE,
    dev_name       text        NOT NULL CHECK (dev_name = upper(dev_name)),
    class          text        NOT NULL CHECK (class IN ('FRONTEND', 'BACKEND', 'DEVOPS', 'FULLSTACK')),
    level          integer     NOT NULL,
    xp             integer     NOT NULL,
    xp_max         integer     NOT NULL,
    hp             integer     NOT NULL,
    hp_max         integer     NOT NULL,
    coins          integer     NOT NULL CHECK (coins >= 0),
    gems           integer     NOT NULL CHECK (gems >= 0),
    skill_points   integer     NOT NULL,
    region         text        NOT NULL,
    skin           text        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX players_dev_name_upper_key ON players (upper(dev_name));

CREATE TABLE sessions (
    token_hash     bytea       PRIMARY KEY,
    github_user_id bigint      NOT NULL,
    github_login   text        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_github_user_id_idx ON sessions (github_user_id);

-- +goose Down
DROP TABLE sessions;
DROP TABLE players;
