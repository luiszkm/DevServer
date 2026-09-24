// Package deploy runs the idle deploy pipelines: start a job per type, wait real time, claim it.
package deploy

import (
	"errors"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
)

type Handlers struct {
	Pool    *pgxpool.Pool
	Catalog *catalog.Catalog
	Logger  *slog.Logger
	Now     func() time.Time
}

type job struct {
	Type      string `json:"type"`
	Level     int    `json:"level"`
	StartedAt string `json:"startedAt"`
	EndsAt    string `json:"endsAt"`
	Ready     bool   `json:"ready"`
}

func stamp(t time.Time) string { return t.UTC().Format(time.RFC3339) }

func (h *Handlers) now() time.Time { return h.Now().UTC().Truncate(time.Second) }

func (h *Handlers) List(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	p, err := player.Get(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID)
	if err != nil {
		return err
	}
	now := h.now()
	rows, err := h.Pool.Query(ctx,
		`SELECT type, level, started_at, ends_at FROM deploy_jobs WHERE player_id = $1 AND collected_at IS NULL`, p.ID)
	if err != nil {
		return err
	}
	active := map[string]job{}
	for rows.Next() {
		var j job
		var started, ends time.Time
		if err := rows.Scan(&j.Type, &j.Level, &started, &ends); err != nil {
			return err
		}
		j.StartedAt, j.EndsAt, j.Ready = stamp(started), stamp(ends), !now.Before(ends)
		active[j.Type] = j
	}
	if err := rows.Err(); err != nil {
		return err
	}
	deploys := []job{}
	for _, t := range h.Catalog.DeployTypes {
		if j, ok := active[t.ID]; ok {
			deploys = append(deploys, j)
		}
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		ServerTime string `json:"serverTime"`
		Deploys    []job  `json:"deploys"`
	}{stamp(now), deploys})
	return nil
}

func (h *Handlers) Start(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	var in struct {
		Type  string `json:"type"`
		Level int    `json:"level"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	now := h.now()
	var started job
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		if _, ok := h.Catalog.DeployType(in.Type); !ok {
			return httpx.ErrUnknownDeployType
		}
		lvl, ok := h.Catalog.DeployLevel(in.Level)
		if !ok {
			return httpx.ErrUnknownDeployLevel
		}
		if p.Level < lvl.MinLevel {
			return httpx.ErrLevelTooLow
		}
		var running bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM deploy_jobs
			WHERE player_id = $1 AND type = $2 AND collected_at IS NULL)`, p.ID, in.Type).Scan(&running); err != nil {
			return err
		}
		if running {
			return httpx.ErrDeployRunning
		}
		// The office bonus is frozen here with the reward (door 6): furniture moved later changes nothing.
		cut := player.Bonus(h.Catalog, p, "deploy")
		seconds := math.Round(float64(lvl.Minutes*60) * float64(100-cut) / 100)
		ends := now.Add(time.Duration(seconds) * time.Second)
		xp := int(math.Round(float64(lvl.XP) * float64(100+player.Bonus(h.Catalog, p, "xp")) / 100))
		if _, err := tx.Exec(ctx, `INSERT INTO deploy_jobs (player_id, type, level, started_at, ends_at, xp, coins, gems)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			p.ID, in.Type, lvl.Level, now, ends, xp, lvl.Coins, lvl.Gems); err != nil {
			return err
		}
		started = job{Type: in.Type, Level: lvl.Level, StartedAt: stamp(now), EndsAt: stamp(ends)}
		return nil
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusCreated, struct {
		Player     *player.Player `json:"player"`
		Deploy     job            `json:"deploy"`
		ServerTime string         `json:"serverTime"`
	}{p, started, stamp(now)})
	return nil
}

type reward struct {
	XP           int `json:"xp"`
	Coins        int `json:"coins"`
	Gems         int `json:"gems"`
	LevelsGained int `json:"levelsGained"`
}

func (h *Handlers) Claim(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	typ := chi.URLParam(r, "type")
	if _, ok := h.Catalog.DeployType(typ); !ok {
		return httpx.ErrUnknownDeployType
	}
	now := h.now()
	var got reward
	var level int
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		var id int64
		var ends time.Time
		err := tx.QueryRow(ctx, `SELECT id, level, ends_at, xp, coins, gems FROM deploy_jobs
			WHERE player_id = $1 AND type = $2 AND collected_at IS NULL`, p.ID, typ).
			Scan(&id, &level, &ends, &got.XP, &got.Coins, &got.Gems)
		if errors.Is(err, pgx.ErrNoRows) {
			return httpx.ErrDeployNotFound
		}
		if err != nil {
			return err
		}
		if now.Before(ends) {
			return httpx.ErrDeployNotReady
		}
		if _, err := tx.Exec(ctx, `UPDATE deploy_jobs SET collected_at = $2 WHERE id = $1`, id, now); err != nil {
			return err
		}
		got.LevelsGained = player.GainXP(p, got.XP)
		p.Coins += got.Coins
		p.Gems += got.Gems
		return nil
	})
	if err != nil {
		return err
	}
	h.Logger.Info("deploy.collected", "request_id", httpx.RequestIDFrom(ctx), "type", typ, "level", level,
		"xp", got.XP, "coins", got.Coins, "gems", got.Gems)
	httpx.WriteJSON(w, http.StatusOK, struct {
		Player *player.Player `json:"player"`
		Reward reward         `json:"reward"`
	}{p, got})
	return nil
}

// BoostItem is the inventory item a boost consumes.
const BoostItem = "boost_deploy"

// BoostCut is how much a boost takes off a running deploy.
const BoostCut = 15 * time.Minute

// Boost consumes one booster and moves a running deploy's end 15 minutes earlier, never before
// now (door 8). A ready deploy is refused without spending anything.
func (h *Handlers) Boost(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	typ := chi.URLParam(r, "type")
	if _, ok := h.Catalog.DeployType(typ); !ok {
		return httpx.ErrUnknownDeployType
	}
	now := h.now()
	var boosted job
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		var id int64
		var started, ends time.Time
		err := tx.QueryRow(ctx, `SELECT id, level, started_at, ends_at FROM deploy_jobs
			WHERE player_id = $1 AND type = $2 AND collected_at IS NULL`, p.ID, typ).
			Scan(&id, &boosted.Level, &started, &ends)
		if errors.Is(err, pgx.ErrNoRows) {
			return httpx.ErrDeployNotFound
		}
		if err != nil {
			return err
		}
		if !now.Before(ends) {
			return httpx.ErrDeployReady
		}
		if p.Quantity(BoostItem) < 1 {
			return httpx.ErrNoItem
		}
		if err := player.AddItem(ctx, tx, p, BoostItem, -1); err != nil {
			return err
		}
		ends = ends.Add(-BoostCut)
		if ends.Before(now) {
			ends = now
		}
		if _, err := tx.Exec(ctx, `UPDATE deploy_jobs SET ends_at = $2 WHERE id = $1`, id, ends); err != nil {
			return err
		}
		boosted.Type, boosted.StartedAt, boosted.EndsAt, boosted.Ready = typ, stamp(started), stamp(ends), !now.Before(ends)
		return nil
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Deploy     job            `json:"deploy"`
		Player     *player.Player `json:"player"`
		ServerTime string         `json:"serverTime"`
	}{boosted, p, stamp(now)})
	return nil
}
