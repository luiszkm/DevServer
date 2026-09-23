package player

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
)

type Handlers struct {
	Pool    *pgxpool.Pool
	Catalog *catalog.Catalog
}

type response struct {
	Player *Player `json:"player"`
}

func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) error {
	p, err := Get(r.Context(), h.Pool, auth.IdentityFrom(r.Context()).GithubUserID)
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, response{p})
	return nil
}

func (h *Handlers) Onboarding(w http.ResponseWriter, r *http.Request) error {
	httpx.WriteJSON(w, http.StatusOK, struct {
		SuggestedDevName string   `json:"suggestedDevName"`
		Classes          []string `json:"classes"`
	}{SuggestDevName(auth.IdentityFrom(r.Context()).GithubLogin), Classes})
	return nil
}

func (h *Handlers) Create(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id := auth.IdentityFrom(ctx)

	var in struct {
		DevName string `json:"devName"`
		Class   string `json:"class"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}

	if _, err := Get(ctx, h.Pool, id.GithubUserID); err == nil {
		return httpx.ErrPlayerExists
	} else if !errors.Is(err, httpx.ErrPlayerNotFound) {
		return err
	}

	name, ok := NormalizeDevName(in.DevName)
	if !ok {
		return httpx.ErrInvalidDevName
	}
	if !validClass(in.Class) {
		return httpx.ErrInvalidClass
	}

	p := newPlayer(id.GithubUserID, name, in.Class)
	err := h.insert(ctx, p)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		// A concurrent request won the race: tell which uniqueness it hit.
		if _, getErr := Get(ctx, h.Pool, id.GithubUserID); getErr == nil {
			return httpx.ErrPlayerExists
		}
		return httpx.ErrDevNameTaken
	}
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusCreated, response{p})
	return nil
}

// insert creates the player and its starting items in one transaction.
func (h *Handlers) insert(ctx context.Context, p *Player) error {
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := tx.QueryRow(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max,
		hp, hp_max, coins, gems, skill_points, region, skin)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
		p.GithubUserID, p.DevName, p.Class, p.Level, p.XP, p.XPMax, p.HP, p.HPMax,
		p.Coins, p.Gems, p.SkillPoints, p.Region, p.Skin).Scan(&p.ID); err != nil {
		return err
	}
	for _, it := range h.Catalog.Combat.StartingItems {
		if err := AddItem(ctx, tx, p, it.Item, it.Quantity); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
