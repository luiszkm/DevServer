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
	Body         string `json:"body"`
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
	// SkillLevels has every unlocked skill id with its level (1..3); never nil.
	SkillLevels map[string]int `json:"skillLevels"`
	// Loadout has every catalog skill slot, with the equipped skill id or null (AD-019).
	Loadout []*string `json:"loadout"`
	// Power is the power bar, 0..combat.power.max (limit-break door 1).
	Power int `json:"power"`
	// Inventory lists the items held, quantity > 0 only, in catalog order.
	Inventory []catalog.ItemQuantity `json:"inventory"`
	// Gear is the owned gear ids in catalog order; never nil.
	Gear []string `json:"gear"`
	// Equipment has every catalog slot as a key, with the equipped gear id or null.
	Equipment map[string]*string `json:"equipment"`
	// Skins is the owned skin ids in catalog order, always with DefaultSkin.
	Skins []string `json:"skins"`
	// Office has every catalog zone as a key, each a list of its positions with the installed
	// furniture id or null.
	Office map[string][]*string `json:"office"`
	// OfficeLight is the room lighting, always a catalog light (see ResolveLight).
	OfficeLight string `json:"officeLight"`
	// Rack has every catalog slot, with the installed component id or null.
	Rack []*string `json:"rack"`
	// Appearance has every avatar part as a key with the option worn (see ResolveAppearance).
	Appearance map[string]string `json:"appearance"`
	// Looks is the bought avatar option ids in catalog order; never nil.
	Looks []string `json:"looks"`
	// Progress is how many path nodes each region has been cleared; no row means 0. Never nil (AD-021).
	Progress map[string]int `json:"progress"`
	// Notebook is the weapon: stored level, derived rarity, and every catalog upgrade (0 when never bought).
	Notebook Notebook `json:"notebook"`
	// picks is players.appearance: only the parts the player chose, saved by WithLocked.
	picks map[string]string
}

// Notebook is the dev's weapon as the client reads it (AD-024).
type Notebook struct {
	Level    int            `json:"level"`
	Rarity   string         `json:"rarity"`
	Upgrades map[string]int `json:"upgrades"`
}

func emptyNotebook() Notebook {
	cat := catalog.Default()
	ups := map[string]int{}
	for _, u := range cat.Notebook.Upgrades {
		ups[u.ID] = 0
	}
	return Notebook{Level: 1, Rarity: cat.NotebookRarity(1), Upgrades: ups}
}

// DefaultSkin is owned by every player without a stored row (door 3).
const DefaultSkin = "default"

// DefaultBody is the body of every row stored before bodies existed (players.body's default).
const DefaultBody = "masculino"

func emptyEquipment() map[string]*string {
	eq := map[string]*string{}
	for _, s := range catalog.Default().GearSlots {
		eq[s.ID] = nil
	}
	return eq
}

func emptyOffice() map[string][]*string {
	o := map[string][]*string{}
	for _, z := range catalog.Default().Office.Zones {
		o[z.ID] = make([]*string, z.Cells)
	}
	return o
}

func emptyRack() []*string { return make([]*string, catalog.Default().Rack.Slots) }

func emptyLoadout() []*string { return make([]*string, catalog.Default().SkillSlots) }

// Classes are the onboarding classes. Each one unlocks only the skill tree whose class matches (AD-018).
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
func newPlayer(githubUserID int64, devName, class, body string) *Player {
	return &Player{
		GithubUserID: githubUserID, DevName: devName, Class: class, Body: body,
		Level: 1, XP: 0, XPMax: 500, HP: 100, HPMax: 100,
		Coins: 9999, Gems: 9999, SkillPoints: 1, Region: "vila", Skin: "default", Skills: []string{},
		SkillLevels: map[string]int{}, Loadout: emptyLoadout(),
		Inventory: []catalog.ItemQuantity{},
		Gear:      []string{}, Equipment: emptyEquipment(), Skins: []string{DefaultSkin},
		Office: emptyOffice(), OfficeLight: ResolveLight(catalog.Default(), ""), Rack: emptyRack(),
		Appearance: ResolveAppearance(catalog.Default(), body, nil), Looks: []string{}, picks: map[string]string{},
		Progress: map[string]int{}, Notebook: emptyNotebook(),
	}
}

// ResolveAppearance is the one appearance rule: each catalog part wears the player's pick while
// it is still an option of that part, not gear-only and available to the body, and the body's
// default otherwise (catalog.AvatarDefault), so a part or option added or removed later, or a
// change of body, never breaks a player.
func ResolveAppearance(cat *catalog.Catalog, body string, picks map[string]string) map[string]string {
	a := map[string]string{}
	for _, part := range cat.Avatar.Parts {
		a[part.ID] = cat.AvatarDefault(body, part.ID)
		if o, ok := cat.AvatarOption(picks[part.ID]); ok && o.Part == part.ID && !o.GearOnly && o.AvailableTo(body) {
			a[part.ID] = o.ID
		}
	}
	return a
}

// Pick records option as the player's choice for part; WithLocked saves it.
func (p *Player) Pick(part, option string) {
	if p.picks == nil {
		p.picks = map[string]string{}
	}
	p.picks[part] = option
	p.Appearance = ResolveAppearance(catalog.Default(), p.Body, p.picks)
}

// SetBody changes the hero's body and re-resolves the appearance; the stored picks are kept, so a
// pick the new body cannot wear comes back if the body changes again. WithLocked saves it.
func (p *Player) SetBody(body string) {
	p.Body = body
	p.Appearance = ResolveAppearance(catalog.Default(), p.Body, p.picks)
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
	coins, gems, skill_points, region, skin, appearance, body, power, notebook_level, office_light`

func scan(row pgx.Row) (*Player, error) {
	p := &Player{}
	err := row.Scan(&p.ID, &p.GithubUserID, &p.DevName, &p.Class, &p.Level, &p.XP, &p.XPMax,
		&p.HP, &p.HPMax, &p.Coins, &p.Gems, &p.SkillPoints, &p.Region, &p.Skin, &p.picks, &p.Body, &p.Power,
		&p.Notebook.Level, &p.OfficeLight)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, httpx.ErrPlayerNotFound
	}
	if err != nil {
		return nil, err
	}
	if p.picks == nil {
		p.picks = map[string]string{}
	}
	p.Appearance = ResolveAppearance(catalog.Default(), p.Body, p.picks)
	p.OfficeLight = ResolveLight(catalog.Default(), p.OfficeLight)
	return p, nil
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
	if err := LoadGear(ctx, q, p); err != nil {
		return nil, err
	}
	if err := LoadOffice(ctx, q, p); err != nil {
		return nil, err
	}
	if err := LoadRack(ctx, q, p); err != nil {
		return nil, err
	}
	if err := LoadLooks(ctx, q, p); err != nil {
		return nil, err
	}
	if err := loadProgress(ctx, q, p); err != nil {
		return nil, err
	}
	return p, loadNotebook(ctx, q, p)
}

// LoadLooks reads the bought avatar options into p.Looks, in catalog order like LoadGear.
func LoadLooks(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT look_id FROM player_looks WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	looks, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return err
	}
	cat := catalog.Default()
	sort.SliceStable(looks, func(i, j int) bool { return cat.AvatarOptionPosition(looks[i]) < cat.AvatarOptionPosition(looks[j]) })
	p.Looks = looks
	return nil
}

// ResolveLight is the stored lighting while the catalog still has it, and the catalog's first
// light otherwise, so removing a light never breaks a player.
func ResolveLight(cat *catalog.Catalog, id string) string {
	if _, ok := cat.Light(id); ok {
		return id
	}
	return cat.Office.Lights[0].ID
}

// LoadOffice reads the installed furniture into p.Office. A row outside the catalog's zones is
// skipped, so shrinking a zone never breaks a player.
func LoadOffice(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT zone, position, furniture_id FROM player_office WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	p.Office = emptyOffice()
	var zone, id string
	var pos int
	_, err = pgx.ForEachRow(rows, []any{&zone, &pos, &id}, func() error {
		if cells, ok := p.Office[zone]; ok && pos < len(cells) {
			f := id
			cells[pos] = &f
		}
		return nil
	})
	return err
}

// LoadRack reads the installed components into p.Rack. A row at a slot the catalog no longer has
// is skipped, like LoadOffice.
func LoadRack(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT slot, component_id FROM player_rack WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	p.Rack = emptyRack()
	var slot int
	var id string
	_, err = pgx.ForEachRow(rows, []any{&slot, &id}, func() error {
		if slot < len(p.Rack) {
			c := id
			p.Rack[slot] = &c
		}
		return nil
	})
	return err
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

// loadSkills reads the unlocked skills, their levels and the loadout. A row at a slot the catalog
// no longer has counts as unequipped, like LoadRack.
func loadSkills(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT skill_id, level, slot FROM player_skills WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	p.Skills, p.SkillLevels, p.Loadout = []string{}, map[string]int{}, emptyLoadout()
	var id string
	var level int
	var slot *int
	if _, err := pgx.ForEachRow(rows, []any{&id, &level, &slot}, func() error {
		p.Skills = append(p.Skills, id)
		p.SkillLevels[id] = level
		if slot != nil && *slot < len(p.Loadout) {
			s := id
			p.Loadout[*slot] = &s
		}
		return nil
	}); err != nil {
		return err
	}
	SortSkills(p)
	return nil
}

// Equipped reports whether a skill is in the loadout.
func (p *Player) Equipped(skill string) bool {
	return slices.ContainsFunc(p.Loadout, func(id *string) bool { return id != nil && *id == skill })
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
	if err := LoadOffice(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := LoadRack(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := LoadLooks(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := loadProgress(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := loadNotebook(ctx, tx, p); err != nil {
		return nil, err
	}
	if err := fn(tx, p); err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE players SET level = $2, xp = $3, xp_max = $4, hp = $5, hp_max = $6,
		coins = $7, gems = $8, skill_points = $9, region = $10, skin = $11, appearance = $12, body = $13,
		power = $14, notebook_level = $15, office_light = $16 WHERE id = $1`,
		p.ID, p.Level, p.XP, p.XPMax, p.HP, p.HPMax, p.Coins, p.Gems, p.SkillPoints, p.Region, p.Skin, p.picks, p.Body,
		p.Power, p.Notebook.Level, p.OfficeLight)
	if err != nil {
		return nil, err
	}
	return p, tx.Commit(ctx)
}

// loadProgress reads how many path nodes each region has been cleared. No row means 0, and the map is never nil.
func loadProgress(ctx context.Context, q querier, p *Player) error {
	rows, err := q.Query(ctx, `SELECT region, cleared FROM region_progress WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	p.Progress = map[string]int{}
	var region string
	var cleared int
	_, err = pgx.ForEachRow(rows, []any{&region, &cleared}, func() error {
		p.Progress[region] = cleared
		return nil
	})
	return err
}

// AdvanceProgress records a win of the node at index when that index is the frontier
// (cleared == index). A replay, or a row already ahead, changes nothing.
func AdvanceProgress(ctx context.Context, tx pgx.Tx, p *Player, region string, index int) error {
	if p.Progress[region] != index {
		return nil
	}
	next := index + 1
	tag, err := tx.Exec(ctx, `INSERT INTO region_progress (player_id, region, cleared)
		VALUES ($1, $2, $3)
		ON CONFLICT (player_id, region) DO UPDATE SET cleared = EXCLUDED.cleared
		WHERE region_progress.cleared = $4`, p.ID, region, next, index)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 1 {
		p.Progress[region] = next
	}
	return nil
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

// ChangeHP applies an hp bonus that starts (delta > 0) or stops (delta < 0) counting to both
// hpMax and hp, keeping hp at least 1 (shop door 5). Gear, skins and equipped skills share it.
func ChangeHP(p *Player, delta int) {
	p.HPMax += delta
	p.HP = max(1, p.HP+delta)
}

// Pay takes price from the balance of its currency; a balance equal to the price pays.
func Pay(p *Player, price catalog.Price) error {
	switch price.Currency {
	case "gems":
		if p.Gems < price.Amount {
			return httpx.ErrNotEnoughGems
		}
		p.Gems -= price.Amount
	case "coins":
		if p.Coins < price.Amount {
			return httpx.ErrNotEnoughCoins
		}
		p.Coins -= price.Amount
	}
	return nil
}

// Owns reports whether p owns a piece of gear.
func (p *Player) Owns(gear string) bool { return slices.Contains(p.Gear, gear) }

// OwnsLook reports whether p bought an avatar option.
func (p *Player) OwnsLook(option string) bool { return slices.Contains(p.Looks, option) }

// OwnsSkin reports whether p owns a skin; DefaultSkin is always owned.
func (p *Player) OwnsSkin(skin string) bool { return slices.Contains(p.Skins, skin) }

// Bonus is the one bonus rule (AD-012, AD-013, AD-014): the bonus of one type ("hp", "sp", "dmg",
// "xp", "deploy", "spregen", "coins") summed over the equipped skills at their level (AD-019), the
// equipped gear, the worn skin, the installed furniture and the rack's stats. Unlocked but
// unequipped skills and owned but unequipped gear add nothing; "deploy" is capped at the
// catalog's MaxDeployCut.
func Bonus(cat *catalog.Catalog, p *Player, bonusType string) int {
	sum := cat.SkillBonus(p.Loadout, p.SkillLevels, bonusType)
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
	for _, cells := range p.Office {
		for _, id := range cells {
			if id == nil {
				continue
			}
			if f, ok := cat.FurnitureItem(*id); ok && f.Bonus != nil && f.Bonus.Type == bonusType {
				sum += f.Bonus.Amount
			}
		}
	}
	sum += rackBonus(cat, p.Rack, bonusType)
	sum += notebookBonus(cat, p.Notebook, bonusType)
	if bonusType == "deploy" {
		sum = min(sum, cat.Office.MaxDeployCut)
	}
	return sum
}

// loadNotebook fills p.Notebook from the scanned level and player_notebook_upgrades. An upgrade the
// catalog no longer has is skipped. The map always has every catalog upgrade, 0 when never bought.
func loadNotebook(ctx context.Context, q querier, p *Player) error {
	cat := catalog.Default()
	level := p.Notebook.Level
	ups := map[string]int{}
	for _, u := range cat.Notebook.Upgrades {
		ups[u.ID] = 0
	}
	rows, err := q.Query(ctx, `SELECT upgrade_id, level FROM player_notebook_upgrades WHERE player_id = $1`, p.ID)
	if err != nil {
		return err
	}
	var id string
	var lvl int
	if _, err := pgx.ForEachRow(rows, []any{&id, &lvl}, func() error {
		if _, ok := ups[id]; ok {
			ups[id] = lvl
		}
		return nil
	}); err != nil {
		return err
	}
	p.Notebook = Notebook{Level: level, Rarity: cat.NotebookRarity(level), Upgrades: ups}
	return nil
}

// notebookBonus is AD-024: the notebook level's dmg and hp, plus each bought upgrade at its level,
// clamped to the last catalog step. Level 0 and an upgrade the catalog does not list add nothing.
func notebookBonus(cat *catalog.Catalog, nb Notebook, bonusType string) int {
	sum := 0
	if lv, ok := cat.NotebookLevelAt(nb.Level); ok {
		if bonusType == "dmg" {
			sum += lv.Dmg
		}
		if bonusType == "hp" {
			sum += lv.HP
		}
	}
	for _, u := range cat.Notebook.Upgrades {
		if u.Bonus != bonusType || len(u.Levels) == 0 {
			continue
		}
		k := nb.Upgrades[u.ID]
		if k < 1 {
			continue
		}
		if k > len(u.Levels) {
			k = len(u.Levels)
		}
		sum += u.Levels[k-1].Amount
	}
	return sum
}

// rackBonus is AD-014: each stat whose bonus is bonusType is base plus the installed effects,
// capped at max, and adds one per step above base. A component outside the catalog adds nothing.
func rackBonus(cat *catalog.Catalog, rack []*string, bonusType string) int {
	sum := 0
	for _, st := range cat.Rack.Stats {
		if st.Bonus != bonusType {
			continue
		}
		v := st.Base
		for _, id := range rack {
			if id == nil {
				continue
			}
			k, ok := cat.ComponentItem(*id)
			if !ok {
				continue
			}
			for _, e := range k.Effects {
				if e.Stat == st.ID {
					v += e.Amount
				}
			}
		}
		sum += (min(v, st.Max) - st.Base) / st.Step
	}
	return sum
}
