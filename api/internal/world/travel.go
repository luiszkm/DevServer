// Package world moves a player between the regions of the catalog.
package world

import (
	"net/http"

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

func (h *Handlers) Travel(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Region string `json:"region"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	p, err := player.WithLocked(r.Context(), h.Pool, auth.IdentityFrom(r.Context()).GithubUserID, func(p *player.Player) error {
		region, ok := h.Catalog.Region(in.Region)
		if !ok {
			return httpx.ErrUnknownRegion
		}
		if p.Level < region.MinLevel {
			return httpx.ErrLevelTooLow
		}
		p.Region = region.ID
		return nil
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Player *player.Player `json:"player"`
	}{p})
	return nil
}
