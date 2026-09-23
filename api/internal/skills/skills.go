// Package skills unlocks nodes of the skill trees for a player.
package skills

import (
	"net/http"
	"slices"

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

func (h *Handlers) Unlock(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	node, previous, ok := h.Catalog.Skill(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownSkill
	}
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		if slices.Contains(p.Skills, node.ID) {
			return httpx.ErrSkillUnlocked
		}
		if previous != nil && !slices.Contains(p.Skills, previous.ID) {
			return httpx.ErrSkillLocked
		}
		if p.SkillPoints <= 0 {
			return httpx.ErrNoSkillPoints
		}
		if _, err := tx.Exec(ctx, `INSERT INTO player_skills (player_id, skill_id) VALUES ($1, $2)`, p.ID, node.ID); err != nil {
			return err
		}
		p.SkillPoints--
		if node.Bonus.Type == "hp" {
			p.HPMax += node.Bonus.Amount
			p.HP += node.Bonus.Amount
		}
		p.Skills = append(p.Skills, node.ID)
		player.SortSkills(p)
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
