// Package avatar lets the player dress the hero: pick an option per part, buy priced options and
// change body with a redesign token.
// Every rule runs inside player.WithLocked (AD-004).
package avatar

import (
	"context"
	"net/http"
	"sort"

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

// mutate runs fn under the player lock and answers {"player": {...}}, like shop.
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

// Choose is the pick rule: part must be a catalog part and option one of its options; a gear-only
// option comes only from equipped gear, the option must be available to the player's body, and a
// priced one must have been bought.
func Choose(cat *catalog.Catalog, p *player.Player, part, option string) error {
	if _, ok := cat.AvatarPart(part); !ok {
		return httpx.ErrUnknownPart
	}
	o, ok := cat.AvatarOption(option)
	if !ok || o.Part != part {
		return httpx.ErrUnknownLook
	}
	if o.GearOnly {
		return httpx.ErrGearOnly
	}
	if !o.AvailableTo(p.Body) {
		return httpx.ErrWrongBody
	}
	if o.Price != nil && !p.OwnsLook(o.ID) {
		return httpx.ErrNotOwned
	}
	return nil
}

// Update merges the body's picks into the appearance; one refused pick saves none of them.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Appearance map[string]string `json:"appearance"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	if len(in.Appearance) == 0 {
		return httpx.ErrInvalidBody
	}
	// Sorted so that a body with several refused picks always answers the same error.
	parts := make([]string, 0, len(in.Appearance))
	for part := range in.Appearance {
		parts = append(parts, part)
	}
	sort.Strings(parts)
	return h.mutate(w, r, func(_ context.Context, _ pgx.Tx, p *player.Player) error {
		for _, part := range parts {
			if err := Choose(h.Catalog, p, part, in.Appearance[part]); err != nil {
				return err
			}
		}
		for _, part := range parts {
			p.Pick(part, in.Appearance[part])
		}
		return nil
	})
}

// Buy pays for a priced option, keeps it and wears it at once.
func (h *Handlers) Buy(w http.ResponseWriter, r *http.Request) error {
	o, ok := h.Catalog.AvatarOption(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrLookNotFound
	}
	if o.Price == nil {
		return httpx.ErrNotForSale
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if !o.AvailableTo(p.Body) {
			return httpx.ErrWrongBody
		}
		if p.OwnsLook(o.ID) {
			return httpx.ErrAlreadyOwned
		}
		if err := player.Pay(p, *o.Price); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO player_looks (player_id, look_id) VALUES ($1, $2)`, p.ID, o.ID); err != nil {
			return err
		}
		p.Pick(o.Part, o.ID)
		return player.LoadLooks(ctx, tx, p)
	})
}

// RedesignToken is the item consumed by a change of body.
const RedesignToken = "redesign_token"

// ChooseBody is the redesign rule: body must be a catalog body other than the player's, and the
// player must hold a RedesignToken.
func ChooseBody(cat *catalog.Catalog, p *player.Player, body string) error {
	if _, ok := cat.AvatarBody(body); !ok {
		return httpx.ErrUnknownBody
	}
	if body == p.Body {
		return httpx.ErrSameBody
	}
	if p.Quantity(RedesignToken) < 1 {
		return httpx.ErrNoRedesignToken
	}
	return nil
}

// ChangeBody spends one RedesignToken on a new body; the stored picks are kept and fall back on
// read where the new body cannot wear them.
func (h *Handlers) ChangeBody(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Body string `json:"body"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if err := ChooseBody(h.Catalog, p, in.Body); err != nil {
			return err
		}
		if err := player.AddItem(ctx, tx, p, RedesignToken, -1); err != nil {
			return err
		}
		p.SetBody(in.Body)
		return nil
	})
}
