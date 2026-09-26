// Package skills unlocks, equips, removes and upgrades the nodes of the player's class tree.
// The loadout holds catalog.SkillSlots nodes; only equipped nodes give their passive (AD-019).
package skills

import (
	"context"
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

type mutation func(ctx context.Context, tx pgx.Tx, p *player.Player, node catalog.SkillNode, previous *catalog.SkillNode) error

// mutate resolves the node, locks the player, refuses another class's node, runs fn and answers
// {"player": {...}}.
func (h *Handlers) mutate(w http.ResponseWriter, r *http.Request, fn mutation) error {
	ctx := r.Context()
	node, previous, class, ok := h.Catalog.Skill(chi.URLParam(r, "id"))
	if !ok {
		return httpx.ErrUnknownSkill
	}
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		if class != p.Class {
			return httpx.ErrSkillWrongClass
		}
		return fn(ctx, tx, p, node, previous)
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Player *player.Player `json:"player"`
	}{p})
	return nil
}

// hpAt is the HP a node gives while equipped at level; 0 for a non-hp node.
func hpAt(node catalog.SkillNode, level int) int {
	if node.Bonus.Type != "hp" {
		return 0
	}
	return node.Level(level).Bonus
}

func freeSlot(loadout []*string) int {
	return slices.IndexFunc(loadout, func(id *string) bool { return id == nil })
}

// requireUnlocked is the first check of equip, unequip and upgrade.
func requireUnlocked(p *player.Player, node catalog.SkillNode) error {
	if !slices.Contains(p.Skills, node.ID) {
		return httpx.ErrSkillNotUnlocked
	}
	return nil
}

// Unlock pays the first level's cost, records the node at level 1 and equips it in the first free
// slot, if any.
func (h *Handlers) Unlock(w http.ResponseWriter, r *http.Request) error {
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player, node catalog.SkillNode, previous *catalog.SkillNode) error {
		if slices.Contains(p.Skills, node.ID) {
			return httpx.ErrSkillUnlocked
		}
		if previous != nil && !slices.Contains(p.Skills, previous.ID) {
			return httpx.ErrSkillLocked
		}
		cost := node.Level(1).Cost
		if p.SkillPoints < cost {
			return httpx.ErrNoSkillPoints
		}
		var slot *int
		if i := freeSlot(p.Loadout); i >= 0 {
			slot = &i
		}
		if _, err := tx.Exec(ctx, `INSERT INTO player_skills (player_id, skill_id, level, slot) VALUES ($1, $2, 1, $3)`,
			p.ID, node.ID, slot); err != nil {
			return err
		}
		p.SkillPoints -= cost
		p.Skills = append(p.Skills, node.ID)
		p.SkillLevels[node.ID] = 1
		player.SortSkills(p)
		if slot != nil {
			id := node.ID
			p.Loadout[*slot] = &id
			player.ChangeHP(p, hpAt(node, 1))
		}
		return nil
	})
}

// Equip puts an unlocked node in the first free slot; an equipped node stays where it is.
func (h *Handlers) Equip(w http.ResponseWriter, r *http.Request) error {
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player, node catalog.SkillNode, _ *catalog.SkillNode) error {
		if err := requireUnlocked(p, node); err != nil {
			return err
		}
		if p.Equipped(node.ID) {
			return nil
		}
		slot := freeSlot(p.Loadout)
		if slot < 0 {
			return httpx.ErrSkillLoadoutFull
		}
		if _, err := tx.Exec(ctx, `UPDATE player_skills SET slot = $3 WHERE player_id = $1 AND skill_id = $2`,
			p.ID, node.ID, slot); err != nil {
			return err
		}
		id := node.ID
		p.Loadout[slot] = &id
		player.ChangeHP(p, hpAt(node, p.SkillLevels[node.ID]))
		return nil
	})
}

// Unequip frees the node's slot; an unequipped node is left as it is.
func (h *Handlers) Unequip(w http.ResponseWriter, r *http.Request) error {
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player, node catalog.SkillNode, _ *catalog.SkillNode) error {
		if err := requireUnlocked(p, node); err != nil {
			return err
		}
		slot := slices.IndexFunc(p.Loadout, func(id *string) bool { return id != nil && *id == node.ID })
		if slot < 0 {
			return nil
		}
		if _, err := tx.Exec(ctx, `UPDATE player_skills SET slot = NULL WHERE player_id = $1 AND skill_id = $2`,
			p.ID, node.ID); err != nil {
			return err
		}
		p.Loadout[slot] = nil
		player.ChangeHP(p, -hpAt(node, p.SkillLevels[node.ID]))
		return nil
	})
}

// Upgrade pays the next level's cost and raises the node one level; an equipped hp node adds the
// difference between the two levels to HP.
func (h *Handlers) Upgrade(w http.ResponseWriter, r *http.Request) error {
	return h.mutate(w, r, func(ctx context.Context, tx pgx.Tx, p *player.Player, node catalog.SkillNode, _ *catalog.SkillNode) error {
		if err := requireUnlocked(p, node); err != nil {
			return err
		}
		level := p.SkillLevels[node.ID]
		if level >= len(node.Levels) {
			return httpx.ErrSkillMaxLevel
		}
		next := node.Levels[level]
		if p.SkillPoints < next.Cost {
			return httpx.ErrNoSkillPoints
		}
		if _, err := tx.Exec(ctx, `UPDATE player_skills SET level = $3 WHERE player_id = $1 AND skill_id = $2`,
			p.ID, node.ID, level+1); err != nil {
			return err
		}
		p.SkillPoints -= next.Cost
		p.SkillLevels[node.ID] = level + 1
		if p.Equipped(node.ID) {
			player.ChangeHP(p, hpAt(node, level+1)-hpAt(node, level))
		}
		return nil
	})
}
