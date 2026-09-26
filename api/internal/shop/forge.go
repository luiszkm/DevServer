package shop

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
)

// Forge spends a recipe's ingredients and price and makes one unit of its output. Gear comes out
// owned and equipped, as when it is bought. Checks run in the order owned, ingredients, balance.
func (h *Handlers) Forge(w http.ResponseWriter, r *http.Request) error {
	rc, ok := h.Catalog.Recipe(chi.URLParam(r, "recipe"))
	if !ok {
		return httpx.ErrUnknownRecipe
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		var gear catalog.Gear
		if rc.Output.Kind == "gear" {
			if gear, ok = h.Catalog.GearItem(rc.Output.ID); !ok {
				return httpx.ErrUnknownGear
			}
			if p.Owns(gear.ID) {
				return httpx.ErrAlreadyOwned
			}
		}
		for _, in := range rc.Ingredients {
			if p.Quantity(in.Item) < in.Quantity {
				return httpx.ErrNotEnoughMaterials
			}
		}
		if rc.Price != nil {
			if err := player.Pay(p, *rc.Price); err != nil {
				return err
			}
		}
		for _, in := range rc.Ingredients {
			if err := player.AddItem(ctx, tx, p, in.Item, -in.Quantity); err != nil {
				return err
			}
		}
		if rc.Output.Kind == "item" {
			return player.AddItem(ctx, tx, p, rc.Output.ID, 1)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO player_gear (player_id, gear_id) VALUES ($1, $2)`, p.ID, gear.ID); err != nil {
			return err
		}
		return h.equip(ctx, tx, p, gear)
	})
}
