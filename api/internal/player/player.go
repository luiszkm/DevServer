// Package player owns the Player record and the locked-mutation pattern every feature copies.
package player

import (
	"context"
	"errors"
	"regexp"
	"slices"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/catalog"
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
	// Skills are the unlocked skill ids in catalog order; never nil so it serializes as [].
	Skills []string `json:"skills"`
	// Inventory lists the items held, quantity > 0 only, in catalog order.
	Inventory []catalog.ItemQuantity `json:"inventory"`
	// Gear is the owned gear ids in catalog order; never nil.
	Gear []string `json:"gear"`
	// Equipment has every catalog slot as a key, with the equipped gear id or null.
	Equipment map[string]*string `json:"equipment"`
	// Skins is the owned skin ids in catalog order, always with DefaultSkin.
	Skins []string `json:"skins"`
}

// DefaultSkin is owned by every player without a stored row (door 3).
const DefaultSkin = "default"

func emptyEquipment() map[string]*string {
	eq := map[string]*string{}
	for _, s := range catalog.Default().GearSlots {
		eq[s.ID] = nil
	}
	return eq
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
		Coins: 100, Gems: 20, SkillPoints: 1, Region: "vila", Skin: "default", Skills: []string{},
		Inventory: []catalog.ItemQuantity{},
		Gear:      []string{}, Equipment: emptyEquipment(), Skins: []string{DefaultSkin},
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
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// Get returns the player of a GitHub user, or httpx.ErrPlayerNotFound.
func Get(ctx context.Context, q querier, githubUserID int64) (*Player, error) {
	p, err := scan(q.QueryRow(ctx, `SELECT `+columns+` FROM players WHERE github_user_id = $1`, githubUserID))
	if err != nil {
		return nil, err
	}
	if err := loadSkills(ctx, q, p); err != nil {
		return nil, err
	}
	if err := loadInventory(ctx, q, p); err != nil {
		return nil, err
	}
	return p, LoadGear(ctx, q, p)
}

// LoadGear reads the owned gear, the equipped slots and the owned skins into p.
// Order follows the embedded catalog, like SortSkills.
func LoadGear(ctx context.Context, q querier, p *Player) error {
	cat := catalog.Default()
	rows, err := q.Query(ctx, `SELECT gear_id FROM player_gear WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	gear, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	sort.SliceStable(gear, func(i, j int) bool { return cat.GearPosition(gear[i]) < cat.GearPosition(gear[j]) })
	p.Gear = gear

	rows, err = q.Query(ctx, `SELECT slot, gear_id FROM player_equipment WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	p.Equipment = emptyEquipment()
	var slot, id string
	if _, err := pgx.ForEachRow(rows, []any{&slot, &id}, func() error {
		g := id
		p.Equipment[slot] = &g
		return nil
	}); err != nil {
		return err
	}

	rows, err = q.Query(ctx, `SELECT skin_id FROM player_skins WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	skins, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	skins = append([]string{DefaultSkin}, skins...)
	sort.SliceStable(skins, func(i, j int) bool { return cat.SkinPosition(skins[i]) < cat.SkinPosition(skins[j]) })
	p.Skins = skins
	return nil
}

func loadInventory(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT item_id, quantity FROM player_items WHERE player_id = $1 AND quantity > 0`, p.ID)
	if err != nil {
		return err
	}
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (catalog.ItemQuantity, error) {
		var it catalog.ItemQuantity
		return it, r.Scan(&it.Item, &it.Quantity)
	})
	if err != nil {
		return err
	}
	// Order follows the embedded catalog, like SortSkills, not a catalog injected into the router.
	cat := catalog.Default()
	sort.SliceStable(items, func(i, j int) bool { return cat.ItemPosition(items[i].Item) < cat.ItemPosition(items[j].Item) })
	p.Inventory = items
	return nil
}

// Quantity is how many of an item the player holds.
func (p *Player) Quantity(item string) int {
	for _, it := range p.Inventory {
		if it.Item == item {
			return it.Quantity
		}
	}
	return 0
}

// AddItem changes the stored quantity of an item by delta inside tx and keeps p.Inventory in step.
// The table's CHECK refuses a negative quantity.
func AddItem(ctx context.Context, tx pgx.Tx, p *Player, item string, delta int) error {
	// The CHECK runs on the proposed row before ON CONFLICT, so a decrement must be an UPDATE.
	q := `UPDATE player_items SET quantity = quantity + $3 WHERE player_id = $1 AND item_id = $2`
	if delta > 0 {
		q = `INSERT INTO player_items (player_id, item_id, quantity) VALUES ($1, $2, $3)
		ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = player_items.quantity + EXCLUDED.quantity`
	}
	if _, err := tx.Exec(ctx, q, p.ID, item, delta); err != nil {
		return err
	}
	return loadInventory(ctx, tx, p)
}

func loadSkills(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT skill_id FROM player_skills WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	p.Skills = ids
	SortSkills(p)
	return nil
}

// SortSkills puts p.Skills in catalog order (door 4 of the skills plan).
func SortSkills(p *Player) {
	cat := catalog.Default()
	sort.SliceStable(p.Skills, func(i, j int) bool {
		return cat.SkillPosition(p.Skills[i]) < cat.SkillPosition(p.Skills[j])
	})
}

// WithLocked runs fn inside one transaction holding FOR UPDATE on the player's row, then
// saves the player and commits. Every player mutation goes through here (AD-004); fn gets the
// transaction for any other row it has to write in the same unit.
func WithLocked(ctx context.Context, pool *pgxpool.Pool, githubUserID int64, fn func(tx pgx.Tx, p *Player) error) (*Player, error) {
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
	if err := loadSkills(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := loadInventory(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := LoadGear(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := fn(tx, p); err != nil {
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

// GainXP adds xp and applies every level-up it pays for; it is the only level-up rule (AD-009).
// It returns how many levels were gained.
func GainXP(p *Player, xp int) int {
	levels := 0
	p.XP += xp
	for p.XP >= p.XPMax {
		p.XP -= p.XPMax
		p.Level++
		p.XPMax += 250
		p.SkillPoints++
		p.HPMax += 20
		p.HP = p.HPMax
		levels++
	}
	return levels
}

// Owns reports whether p owns a piece of gear.
func (p *Player) Owns(gear string) bool { return slices.Contains(p.Gear, gear) }

// OwnsSkin reports whether p owns a skin; DefaultSkin is always owned.
func (p *Player) OwnsSkin(skin string) bool { return slices.Contains(p.Skins, skin) }

// Bonus is the one bonus rule (AD-012): the bonus of one type ("hp", "sp", "dmg") summed over
// the unlocked skills, the equipped gear and the worn skin. Owned but unequipped gear adds nothing.
func Bonus(cat *catalog.Catalog, p *Player, bonusType string) int {
	sum := cat.SkillBonus(p.Skills, bonusType)
	for _, id := range p.Equipment {
		if id == nil {
			continue
		}
		if g, ok := cat.GearItem(*id); ok && g.Bonus.Type == bonusType {
			sum += g.Bonus.Amount
		}
	}
	if s, ok := cat.Skin(p.Skin); ok && s.Bonus != nil && s.Bonus.Type == bonusType {
		sum += s.Bonus.Amount
	}
	return sum
}
