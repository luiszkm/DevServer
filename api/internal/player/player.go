// Package player owns the Player record and the locked-mutation pattern every feature copies.
package player

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/httpx"
)

type Player struct {
	ID           int64  `json:"-"`
	GithubUserID int64  `json:"-"`
	DevName      string `json:"devName"`
	Class        string `json:"class"`
	Level        int    `json:"level"`
	XP           int    `json:"xp"`
	XPMax        int    `json:"xpMax"`
	HP           int    `json:"hp"`
	HPMax        int    `json:"hpMax"`
	Coins        int    `json:"coins"`
	Gems         int    `json:"gems"`
	SkillPoints  int    `json:"skillPoints"`
	Region       string `json:"region"`
	Skin         string `json:"skin"`
}

// Classes are the cosmetic classes offered at onboarding.
var Classes = []string{"FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"}

func validClass(c string) bool {
	for _, v := range Classes {
		if v == c {
			return true
		}
	}
	return false
}

// newPlayer is the starting state of every dev.
func newPlayer(githubUserID int64, devName, class string) *Player {
	return &Player{
		GithubUserID: githubUserID, DevName: devName, Class: class,
		Level: 1, XP: 0, XPMax: 500, HP: 100, HPMax: 100,
		Coins: 100, Gems: 20, SkillPoints: 1, Region: "vila", Skin: "default",
	}
}

var devNamePattern = regexp.MustCompile(`^[A-Z0-9_]{3,16}$`)

// NormalizeDevName uppercases name and reports whether the result is a valid dev name.
func NormalizeDevName(name string) (string, bool) {
	n := strings.ToUpper(name)
	return n, devNamePattern.MatchString(n)
}

// SuggestDevName derives an onboarding suggestion from a GitHub login.
func SuggestDevName(login string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(login) {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	s := b.String()
	if len(s) > 16 {
		s = s[:16]
	}
	return s
}

const columns = `id, github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max,
	coins, gems, skill_points, region, skin`

func scan(row pgx.Row) (*Player, error) {
	p := &Player{}
	err := row.Scan(&p.ID, &p.GithubUserID, &p.DevName, &p.Class, &p.Level, &p.XP, &p.XPMax,
		&p.HP, &p.HPMax, &p.Coins, &p.Gems, &p.SkillPoints, &p.Region, &p.Skin)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, httpx.ErrPlayerNotFound
	}
	return p, err
}

type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Get returns the player of a GitHub user, or httpx.ErrPlayerNotFound.
func Get(ctx context.Context, q querier, githubUserID int64) (*Player, error) {
	return scan(q.QueryRow(ctx, `SELECT `+columns+` FROM players WHERE github_user_id = $1`, githubUserID))
}

// WithLocked runs fn inside one transaction holding FOR UPDATE on the player's row, then
// saves the player and commits. Every player mutation goes through here (AD-004).
func WithLocked(ctx context.Context, pool *pgxpool.Pool, githubUserID int64, fn func(p *Player) error) (*Player, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	p, err := scan(tx.QueryRow(ctx,
		`SELECT `+columns+` FROM players WHERE github_user_id = $1 FOR UPDATE`, githubUserID))
	if err != nil {
		return nil, err
	}
	if err := fn(p); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE players SET level = $2, xp = $3, xp_max = $4, hp = $5, hp_max = $6,
		coins = $7, gems = $8, skill_points = $9, region = $10, skin = $11 WHERE id = $1`,
		p.ID, p.Level, p.XP, p.XPMax, p.HP, p.HPMax, p.Coins, p.Gems, p.SkillPoints, p.Region, p.Skin)
	if err != nil {
		return nil, err
	}
	return p, tx.Commit(ctx)
}
