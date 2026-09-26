package player

import (
	"context"
	"errors"
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
)

type Handlers struct {
	Pool    *pgxpool.Pool
	Catalog *catalog.Catalog
	// Look is avatar.Choose, set by the router: this package cannot import avatar.
	Look func(cat *catalog.Catalog, p *Player, part, option string) error
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
		DevName    string            `json:"devName"`
		Class      string            `json:"class"`
		Body       string            `json:"body"`
		Appearance map[string]string `json:"appearance"`
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
	if _, ok := h.Catalog.AvatarBody(in.Body); !ok {
		return httpx.ErrUnknownBody
	}

	p := newPlayer(id.GithubUserID, name, in.Class, in.Body)
	if err := h.pickLooks(p, in.Appearance); err != nil {
		return err
	}
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

// pickLooks checks every explicit pick with Look and keeps them. One refusal keeps none.
// An absent or empty map leaves the catalog defaults, stored as no picks.
func (h *Handlers) pickLooks(p *Player, appearance map[string]string) error {
	if len(appearance) == 0 {
		return nil
	}
	parts := make([]string, 0, len(appearance))
	for part := range appearance {
		parts = append(parts, part)
	}
	sort.Strings(parts)
	for _, part := range parts {
		if err := h.Look(h.Catalog, p, part, appearance[part]); err != nil {
			return err
		}
	}
	for _, part := range parts {
		p.Pick(part, appearance[part])
	}
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
		hp, hp_max, coins, gems, skill_points, region, skin, body, appearance)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
		p.GithubUserID, p.DevName, p.Class, p.Level, p.XP, p.XPMax, p.HP, p.HPMax,
		p.Coins, p.Gems, p.SkillPoints, p.Region, p.Skin, p.Body, p.picks).Scan(&p.ID); err != nil {
		return err
	}
	for _, it := range h.Catalog.Combat.StartingItems {
		if err := AddItem(ctx, tx, p, it.Item, it.Quantity); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
