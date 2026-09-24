// Package shop sells items, gear and skins, and equips, removes, wears and discards what the
// player owns. Every rule runs inside player.WithLocked (AD-004).
package shop

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

type mutation func(ctx context.Context, tx pgx.Tx, p *player.Player) error

// mutate runs fn under the player lock and answers {"player": {...}}.
func (h *Handlers) mutate(w http.ResponseWriter, r *http.Request, fn mutation) error {
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

func hpOf(b *catalog.Bonus) int {
	if b != nil && b.Type == "hp" {
		return b.Amount
	}
	return 0
}

// changeHP applies an hp bonus that starts (delta > 0) or stops (delta < 0) counting to both
// hpMax and hp, keeping hp at least 1 (door 5).
func changeHP(p *player.Player, delta int) {
	p.HPMax += delta
	p.HP = max(1, p.HP+delta)
}

// equip puts an owned piece in its slot, replacing whatever was there.
func (h *Handlers) equip(ctx context.Context, tx pgx.Tx, p *player.Player, g catalog.Gear) error {
	old := p.Equipment[g.Slot]
	if old != nil && *old == g.ID {
		return nil
	}
	delta := hpOf(&g.Bonus)
	if old != nil {
		if prev, ok := h.Catalog.GearItem(*old); ok {
			delta -= hpOf(&prev.Bonus)
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO player_equipment (player_id, slot, gear_id) VALUES ($1, $2, $3)
		ON CONFLICT (player_id, slot) DO UPDATE SET gear_id = EXCLUDED.gear_id`, p.ID, g.Slot, g.ID); err != nil {
		return err
	}
	changeHP(p, delta)
	return player.LoadGear(ctx, tx, p)
}

// wear sets the worn skin, moving the hp bonus from the old skin to the new one.
func (h *Handlers) wear(p *player.Player, s catalog.Skin) {
	if p.Skin == s.ID {
		return
	}
	delta := hpOf(s.Bonus)
	if prev, ok := h.Catalog.Skin(p.Skin); ok {
		delta -= hpOf(prev.Bonus)
	}
	p.Skin = s.ID
	changeHP(p, delta)
}

func (h *Handlers) BuyItem(w http.ResponseWriter, r *http.Request) error {
	it, ok := h.Catalog.Item(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownShopItem
	}
	if it.Price == nil {
		return httpx.ErrNotForSale
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if err := player.Pay(p, *it.Price); err != nil {
			return err
		}
		return player.AddItem(ctx, tx, p, it.ID, 1)
	})
}

func (h *Handlers) BuyGear(w http.ResponseWriter, r *http.Request) error {
	g, ok := h.Catalog.GearItem(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownGear
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if p.Owns(g.ID) {
			return httpx.ErrAlreadyOwned
		}
		if err := player.Pay(p, g.Price); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO player_gear (player_id, gear_id) VALUES ($1, $2)`, p.ID, g.ID); err != nil {
			return err
		}
		return h.equip(ctx, tx, p, g)
	})
}

func (h *Handlers) BuySkin(w http.ResponseWriter, r *http.Request) error {
	s, ok := h.Catalog.Skin(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownSkin
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if p.OwnsSkin(s.ID) {
			return httpx.ErrAlreadyOwned
		}
		if err := player.Pay(p, s.Price); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO player_skins (player_id, skin_id) VALUES ($1, $2)`, p.ID, s.ID); err != nil {
			return err
		}
		h.wear(p, s)
		return player.LoadGear(ctx, tx, p)
	})
}

func (h *Handlers) EquipGear(w http.ResponseWriter, r *http.Request) error {
	g, ok := h.Catalog.GearItem(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownGear
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if !p.Owns(g.ID) {
			return httpx.ErrNotOwned
		}
		return h.equip(ctx, tx, p, g)
	})
}

func (h *Handlers) UnequipGear(w http.ResponseWriter, r *http.Request) error {
	g, ok := h.Catalog.GearItem(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownGear
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if cur := p.Equipment[g.Slot]; cur == nil || *cur != g.ID {
			return nil
		}
		if _, err := tx.Exec(ctx, `DELETE FROM player_equipment WHERE player_id = $1 AND slot = $2`, p.ID, g.Slot); err != nil {
			return err
		}
		changeHP(p, -hpOf(&g.Bonus))
		return player.LoadGear(ctx, tx, p)
	})
}

func (h *Handlers) EquipSkin(w http.ResponseWriter, r *http.Request) error {
	s, ok := h.Catalog.Skin(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownSkin
	}
	return h.mutate(w, r, func(_ context.Context, _ pgx.Tx, p *player.Player) error {
		if !p.OwnsSkin(s.ID) {
			return httpx.ErrNotOwned
		}
		h.wear(p, s)
		return nil
	})
}

func (h *Handlers) Discard(w http.ResponseWriter, r *http.Request) error {
	it, ok := h.Catalog.Item(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownShopItem
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if p.Quantity(it.ID) < 1 {
			return httpx.ErrNoItem
		}
		return player.AddItem(ctx, tx, p, it.ID, -1)
	})
}
