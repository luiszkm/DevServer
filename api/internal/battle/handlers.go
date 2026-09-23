package battle

import (
	"context"
	"errors"
	"math/rand/v2"
	"net/http"
	"slices"

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
	Rand    Rand
}

type defaultRand struct{}

func (defaultRand) IntN(n int) int { return rand.IntN(n) }

// DefaultRand draws from math/rand/v2.
var DefaultRand Rand = defaultRand{}

type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func load(ctx context.Context, q querier, playerID int64) (*State, error) {
	st := &State{}
	err := q.QueryRow(ctx, `SELECT region, enemy_hp, enemy_hp_max, sp, sp_max, weak, status
		FROM battles WHERE player_id = $1`, playerID).
		Scan(&st.Region, &st.EnemyHP, &st.EnemyHPMax, &st.SP, &st.SPMax, &st.Weak, &st.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, httpx.ErrBattleNotFound
	}
	return st, err
}

func save(ctx context.Context, tx pgx.Tx, playerID int64, st *State) error {
	_, err := tx.Exec(ctx, `INSERT INTO battles (player_id, region, enemy_hp, enemy_hp_max, sp, sp_max, weak, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (player_id) DO UPDATE SET region = EXCLUDED.region, enemy_hp = EXCLUDED.enemy_hp,
			enemy_hp_max = EXCLUDED.enemy_hp_max, sp = EXCLUDED.sp, sp_max = EXCLUDED.sp_max,
			weak = EXCLUDED.weak, status = EXCLUDED.status`,
		playerID, st.Region, st.EnemyHP, st.EnemyHPMax, st.SP, st.SPMax, st.Weak, st.Status)
	return err
}

func end(ctx context.Context, tx pgx.Tx, playerID int64) error {
	_, err := tx.Exec(ctx, `DELETE FROM battles WHERE player_id = $1`, playerID)
	return err
}

type turnResponse struct {
	Battle *State         `json:"battle"`
	Player *player.Player `json:"player"`
	Events []Event        `json:"events"`
}

func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	p, err := player.Get(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID)
	if err != nil {
		return err
	}
	st, err := load(ctx, h.Pool, p.ID)
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Battle *State `json:"battle"`
	}{st})
	return nil
}

func (h *Handlers) Start(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	var st *State
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		cur, err := load(ctx, tx, p.ID)
		if err != nil && !errors.Is(err, httpx.ErrBattleNotFound) {
			return err
		}
		if cur != nil && cur.Region == p.Region && cur.Status == "active" {
			st = cur
			return nil
		}
		enemy, ok := h.Catalog.Enemy(p.Region)
		if !ok {
			return errors.New("no enemy for region " + p.Region)
		}
		spMax := enemy.SP + player.Bonus(h.Catalog, p, "sp")
		st = &State{Region: p.Region, EnemyHP: enemy.HP, EnemyHPMax: enemy.HP, SP: spMax, SPMax: spMax, Status: "active"}
		return save(ctx, tx, p.ID, st)
	})
	if err != nil {
		return err
	}
	httpx.WriteJSON(w, http.StatusOK, struct {
		Battle *State         `json:"battle"`
		Player *player.Player `json:"player"`
	}{st, p})
	return nil
}

// turn loads the active fight under the player lock, runs play, and stores the result.
func (h *Handlers) turn(w http.ResponseWriter, r *http.Request, check func(*player.Player, *State) error,
	play func(tx pgx.Tx, p *player.Player, st *State, rules Rules) (Outcome, error)) error {
	ctx := r.Context()
	var st *State
	var out Outcome
	p, err := player.WithLocked(ctx, h.Pool, auth.IdentityFrom(ctx).GithubUserID, func(tx pgx.Tx, p *player.Player) error {
		var err error
		if st, err = load(ctx, tx, p.ID); err != nil {
			return err
		}
		if st.Status == "won" {
			return httpx.ErrBattleOver
		}
		if err := check(p, st); err != nil {
			return err
		}
		enemy, _ := h.Catalog.Enemy(st.Region)
		rules := Rules{Combat: h.Catalog.Combat, Enemy: enemy, DamageBonus: player.Bonus(h.Catalog, p, "dmg")}
		if out, err = play(tx, p, st, rules); err != nil {
			return err
		}
		for _, d := range out.Drops {
			if err := player.AddItem(ctx, tx, p, d, 1); err != nil {
				return err
			}
		}
		if out.Fled || out.Defeated {
			return end(ctx, tx, p.ID)
		}
		return save(ctx, tx, p.ID, st)
	})
	if err != nil {
		return err
	}
	if out.Fled || out.Defeated {
		st = nil
	}
	httpx.WriteJSON(w, http.StatusOK, turnResponse{st, p, out.Events})
	return nil
}

func (h *Handlers) Command(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Command string `json:"command"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	cmd, ok := h.Catalog.Command(in.Command)
	if !ok {
		return httpx.ErrUnknownCommand
	}
	return h.turn(w, r, func(p *player.Player, st *State) error {
		if cmd.Skill != "" && !slices.Contains(p.Skills, cmd.Skill) {
			return httpx.ErrCommandLocked
		}
		if st.SP < cmd.Cost {
			return httpx.ErrNotEnoughSP
		}
		return nil
	}, func(_ pgx.Tx, p *player.Player, st *State, rules Rules) (Outcome, error) {
		return ApplyCommand(st, p, cmd, rules, h.Rand), nil
	})
}

func (h *Handlers) Item(w http.ResponseWriter, r *http.Request) error {
	var in struct {
		Item string `json:"item"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return err
	}
	it, ok := h.Catalog.Item(in.Item)
	if !ok || it.Restore == nil {
		return httpx.ErrUnknownItem
	}
	return h.turn(w, r, func(p *player.Player, _ *State) error {
		if p.Quantity(it.ID) < 1 {
			return httpx.ErrNoItem
		}
		return nil
	}, func(tx pgx.Tx, p *player.Player, st *State, rules Rules) (Outcome, error) {
		if err := player.AddItem(r.Context(), tx, p, it.ID, -1); err != nil {
			return Outcome{}, err
		}
		return UseItem(st, p, it, rules, h.Rand), nil
	})
}
