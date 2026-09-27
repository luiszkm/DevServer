// Package office installs and removes furniture in the player's room. Every rule runs inside
// player.WithLocked (AD-004); the bonuses the furniture gives are summed by player.Bonus (AD-013).
package office

import (
	"context"
	"net/http"
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

type cell struct {
	zone     string
	position int
}

// cellOf reads {zone}/{position} from the route; the position must be a whole number below the
// zone's cell count.
func (h *Handlers) cellOf(r *http.Request) (cell, error) {
	z, ok := h.Catalog.Zone(chi.URLParam(r, "zone"))
	if !ok {
		return cell{}, httpx.ErrUnknownCell
	}
	pos, err := strconv.Atoi(chi.URLParam(r, "position"))
	if err != nil || pos < 0 || pos >= z.Cells {
		return cell{}, httpx.ErrUnknownCell
	}
	return cell{z.ID, pos}, nil
}

// mutate runs fn under the player lock and answers {"player": {...}}.
func (h *Handlers) mutate(w http.ResponseWriter, r *http.Request, fn func(ctx context.Context, tx pgx.Tx, p *player.Player) error) error {
	ctx := r.Context()
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		if err := fn(ctx, tx, p); err != nil {
			return err
		}
		return player.LoadOffice(ctx, tx, p)
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Player *player.Player `json:"player"`
	}{p})
	return nil
}

// Install pays for a piece of furniture and puts it in an empty cell of its own zone.
func (h *Handlers) Install(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Furniture string `json:"furniture"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	c, err := h.cellOf(r)
	if err != nil {
		return err
	}
	f, ok := h.Catalog.FurnitureItem(in.Furniture)
	if !ok {
		return httpx.ErrUnknownFurniture
	}
	if f.Zone != c.zone {
		if f.Zone == "parede" {
			return httpx.ErrWrongZoneWall
		}
		return httpx.ErrWrongZoneFloor
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if p.Office[c.zone][c.position] != nil {
			return httpx.ErrCellOccupied
		}
		if err := player.Pay(p, f.Price); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO player_office (player_id, zone, position, furniture_id) VALUES ($1, $2, $3, $4)`,
			p.ID, c.zone, c.position, f.ID)
		return err
	})
}

// Remove empties a cell and refunds half the furniture's price, rounded down, in its currency.
// An empty cell answers 200 without change; furniture that left the catalog is removed with no
// refund (AC 33).
func (h *Handlers) Remove(w http.ResponseWriter, r *http.Request) error {
	c, err := h.cellOf(r)
	if err != nil {
		return err
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		id := p.Office[c.zone][c.position]
		if id == nil {
			return nil
		}
		if _, err := tx.Exec(ctx, `DELETE FROM player_office WHERE player_id = $1 AND zone = $2 AND position = $3`,
			p.ID, c.zone, c.position); err != nil {
			return err
		}
		if f, ok := h.Catalog.FurnitureItem(*id); ok {
			refund := f.Price.Amount / 2
			if f.Price.Currency == "gems" {
				p.Gems += refund
			} else {
				p.Coins += refund
			}
		}
		return nil
	})
}

// officeComfort sums the comfort of the installed catalog furniture; an id the catalog no longer
// has adds nothing.
func officeComfort(cat *catalog.Catalog, office map[string][]*string) int {
	sum := 0
	for _, cells := range office {
		for _, id := range cells {
			if id == nil {
				continue
			}
			if f, ok := cat.FurnitureItem(*id); ok {
				sum += f.Comfort
			}
		}
	}
	return sum
}

// SetLight switches the room lighting to a catalog light the office's comfort has unlocked.
func (h *Handlers) SetLight(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Light string `json:"light"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	l, ok := h.Catalog.Light(in.Light)
	if !ok {
		return httpx.ErrUnknownLight
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		if officeComfort(h.Catalog, p.Office) < l.Comfort {
			return httpx.ErrLightLocked
		}
		p.OfficeLight = l.ID
		return nil
	})
}

// planTemplate decides, cell by cell, what applying t to office installs and what it costs per
// currency: an empty cell gets its piece, a cell already holding that piece is skipped, and any
// other occupant blocks the whole template.
func planTemplate(cat *catalog.Catalog, t catalog.OfficeTemplate, office map[string][]*string) ([]catalog.TemplatePiece, map[string]int, error) {
	var installs []catalog.TemplatePiece
	cost := map[string]int{}
	for _, piece := range t.Pieces {
		f, ok := cat.FurnitureItem(piece.Furniture)
		if !ok {
			return nil, nil, httpx.ErrUnknownFurniture
		}
		switch current := office[piece.Zone][piece.Position]; {
		case current == nil:
			installs = append(installs, piece)
			cost[f.Price.Currency] += f.Price.Amount
		case *current != piece.Furniture:
			return nil, nil, httpx.ErrCellOccupied
		}
	}
	return installs, cost, nil
}

// ApplyTemplate buys and installs every piece of a layout template the room still lacks, all or
// nothing; coins are checked before gems.
func (h *Handlers) ApplyTemplate(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Template string `json:"template"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	t, ok := h.Catalog.Template(in.Template)
	if !ok {
		return httpx.ErrUnknownTemplate
	}
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player) error {
		installs, cost, err := planTemplate(h.Catalog, t, p.Office)
		if err != nil {
			return err
		}
		for _, currency := range []string{"coins", "gems"} {
			if err := player.Pay(p, catalog.Price{Currency: currency, Amount: cost[currency]}); err != nil {
				return err
			}
		}
		for _, piece := range installs {
			if _, err := tx.Exec(ctx, `INSERT INTO player_office (player_id, zone, position, furniture_id) VALUES ($1, $2, $3, $4)`,
				p.ID, piece.Zone, piece.Position, piece.Furniture); err != nil {
				return err
			}
		}
		return nil
	})
}
