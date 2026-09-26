// Package notebook enhances the dev's notebook and buys its upgrades. Every rule runs inside
// player.WithLocked (AD-004); the bonuses are summed by player.Bonus (AD-024).
package notebook

import (
	"context"
	"net/http"

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
}

func (h *Handlers) mutate(w http.ResponseWriter, r *http.Request, fn func(ctx context.Context, tx pgx.Tx, p *player.Player) error) error {
	ctx := r.Context()
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		return fn(ctx, tx, p)
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Player *player.Player `json:"player"`
	}{p})
	return nil
}

// Enhance pays the next level's cost and raises the notebook by one. At the last catalog level
// it refuses before looking at the coins.
func (h *Handlers) Enhance(w http.ResponseWriter, r *http.Request) error {
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		levels := h.Catalog.Notebook.Levels
		cur := p.Notebook.Level
		if cur >= len(levels) {
			return httpx.ErrNotebookMaxLevel
		}
		next := levels[cur]
		cost := 0
		if next.Cost != nil {
			cost = *next.Cost
		}
		if err := player.Pay(p, catalog.Price{Currency: "coins", Amount: cost}); err != nil {
			return err
		}
		player.ChangeHP(p, next.HP-levels[cur-1].HP)
		p.Notebook.Level = cur + 1
		p.Notebook.Rarity = h.Catalog.NotebookRarity(p.Notebook.Level)
		return nil
	})
}

// Upgrade buys the next level of one upgrade. The id is checked before the player row, so an
// unknown id answers 422 even when the session has no dev.
func (h *Handlers) Upgrade(w http.ResponseWriter, r *http.Request) error {
	up, ok := h.Catalog.NotebookUpgrade(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownUpgrade
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		k := p.Notebook.Upgrades[up.ID]
		if k >= len(up.Levels) {
			return httpx.ErrUpgradeMaxLevel
		}
		step := up.Levels[k]
		if p.Notebook.Level < step.MinLevel {
			return httpx.ErrNotebookLevelTooLow
		}
		if err := player.Pay(p, catalog.Price{Currency: "coins", Amount: step.Cost}); err != nil {
			return err
		}
		var err error
		if k == 0 {
			_, err = tx.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) VALUES ($1, $2, 1)`, p.ID, up.ID)
		} else {
			_, err = tx.Exec(ctx, `UPDATE player_notebook_upgrades SET level = $3 WHERE player_id = $1 AND upgrade_id = $2`, p.ID, up.ID, k+1)
		}
		if err != nil {
			return err
		}
		prev := 0
		if k > 0 {
			prev = up.Levels[k-1].Amount
		}
		if up.Bonus == "hp" {
			player.ChangeHP(p, step.Amount-prev)
		}
		p.Notebook.Upgrades[up.ID] = k + 1
		return nil
	})
}
