// Package rack buys and removes components in the player's server rack. Every rule runs inside
// player.WithLocked (AD-004); the bonuses of the rack's stats are summed by player.Bonus (AD-014).
package rack

import (
	"context"
	"net/http"
	"slices"
	"strconv"

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

// mutate runs fn under the player lock and answers {"player": {...}}.
func (h *Handlers) mutate(w http.ResponseWriter, r *http.Request, fn func(ctx context.Context, tx pgx.Tx, p *player.Player) error) error {
	ctx := r.Context()
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		if err := fn(ctx, tx, p); err != nil {
			return err
		}
		return player.LoadRack(ctx, tx, p)
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Player *player.Player `json:"player"`
	}{p})
	return nil
}

// Buy pays for a component and installs it in the first free slot. A full rack is refused before
// the balance, as in the prototype.
func (h *Handlers) Buy(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Component string `json:"component"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	k, ok := h.Catalog.ComponentItem(in.Component)
	if !ok {
		return httpx.ErrUnknownComponent
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		slot := slices.Index(p.Rack, nil)
		if slot < 0 {
			return httpx.ErrRackFull
		}
		if err := player.Pay(p, k.Price); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO player_rack (player_id, slot, component_id) VALUES ($1, $2, $3)`, p.ID, slot, k.ID)
		return err
	})
}

// Remove empties a slot and refunds the component's full price. An empty slot answers 200
// without change; a component that left the catalog is removed with no refund (AC 20).
func (h *Handlers) Remove(w http.ResponseWriter, r *http.Request) error {
	slot, err := strconv.Atoi(chi.URLParam(r, "slot"))
	if err != nil || slot < 0 || slot >= h.Catalog.Rack.Slots {
		return httpx.ErrUnknownSlot
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		id := p.Rack[slot]
		if id == nil {
			return nil
		}
		if _, err := tx.Exec(ctx, `DELETE FROM player_rack WHERE player_id = $1 AND slot = $2`, p.ID, slot); err != nil {
			return err
		}
		if k, ok := h.Catalog.ComponentItem(*id); ok {
			if k.Price.Currency == "gems" {
				p.Gems += k.Price.Amount
			} else {
				p.Coins += k.Price.Amount
			}
		}
		return nil
	})
}
