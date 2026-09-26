// Package catalog loads the embedded balance data and serves it at GET /api/catalog.
package catalog

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"slices"
	"sort"
	"sync"

	data "devserver/api/catalog"
)

type Region struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Tag         string `json:"tag"`
	MinLevel    int    `json:"minLevel"`
	Description string `json:"description"`
}

type DeployType struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Glyph string `json:"glyph"`
}

type DeployLevel struct {
	Level    int `json:"level"`
	MinLevel int `json:"minLevel"`
	Minutes  int `json:"minutes"`
	XP       int `json:"xp"`
	Coins    int `json:"coins"`
	Gems     int `json:"gems"`
}

type Bonus struct {
	Type   string `json:"type"`
	Amount int    `json:"amount"`
}

type SkillNode struct {
	ID          string `json:"id"`
	Glyph       string `json:"glyph"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Bonus       Bonus  `json:"bonus"`
}

type SkillTree struct {
	ID    string      `json:"id"`
	Name  string      `json:"name"`
	Nodes []SkillNode `json:"nodes"`
}

type Enemy struct {
	ID       string `json:"id"`
	Region   string `json:"region"`
	Name     string `json:"name"`
	Level    int    `json:"level"`
	HP       int    `json:"hp"`
	SP       int    `json:"sp"`
	Weakness string `json:"weakness"`
	Drop     string `json:"drop"`
	Glyph    string `json:"glyph"`
}

type Command struct {
	ID              string `json:"id"`
	Label           string `json:"label"`
	Hint            string `json:"hint"`
	Cost            int    `json:"cost"`
	Damage          []int  `json:"damage,omitempty"`
	Heal            int    `json:"heal,omitempty"`
	ExposesWeakness bool   `json:"exposesWeakness,omitempty"`
	Shield          bool   `json:"shield,omitempty"`
	SPGain          int    `json:"spGain,omitempty"`
	Flee            bool   `json:"flee,omitempty"`
	Skill           string `json:"skill,omitempty"`
}

type Restore struct {
	Stat   string `json:"stat"`
	Amount int    `json:"amount"`
}

// Price is what the shop charges; Currency is "gems" or "coins".
type Price struct {
	Currency string `json:"currency"`
	Amount   int    `json:"amount"`
}

type Item struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Glyph       string   `json:"glyph"`
	Rarity      string   `json:"rarity"`
	Description string   `json:"description"`
	Restore     *Restore `json:"restore,omitempty"`
	// Price is nil for items the shop does not sell (drops).
	Price *Price `json:"price,omitempty"`
}

type GearSlot struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Gear struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Glyph       string `json:"glyph"`
	Slot        string `json:"slot"`
	Rarity      string `json:"rarity"`
	Description string `json:"description"`
	// Price is nil for gear the shop does not sell (made only at the forge).
	Price *Price `json:"price,omitempty"`
	Bonus Bonus  `json:"bonus"`
	// Look is nil for gear that does not change the hero's picture; otherwise the gear-only
	// avatar option it dresses while equipped.
	Look *GearLook `json:"look,omitempty"`
}

type GearLook struct {
	Part   string `json:"part"`
	Option string `json:"option"`
}

type Skin struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Rarity      string `json:"rarity"`
	Description string `json:"description"`
	// Palette recolors color parts while the skin is worn: part id to a 4-tone ramp, darkest
	// first. Empty for the default skin.
	Palette map[string][]string `json:"palette"`
	Price   Price               `json:"price"`
	// Bonus is nil for a skin without an attribute bonus.
	Bonus *Bonus `json:"bonus"`
}

// OfficeZone is an area of the room with Cells positions, numbered from 0.
type OfficeZone struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Cells int    `json:"cells"`
}

type Furniture struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Glyph   string `json:"glyph"`
	Color   string `json:"color"`
	Zone    string `json:"zone"`
	Price   Price  `json:"price"`
	Comfort int    `json:"comfort"`
	// Bonus is nil for furniture that only adds comfort; its type is "xp", "deploy" or "spregen".
	Bonus       *Bonus `json:"bonus"`
	Description string `json:"description"`
}

type OfficeLevel struct {
	Min  int    `json:"min"`
	Name string `json:"name"`
}

type Office struct {
	Zones     []OfficeZone  `json:"zones"`
	Furniture []Furniture   `json:"furniture"`
	Levels    []OfficeLevel `json:"levels"`
	// MaxDeployCut caps the summed "deploy" bonus, in percent.
	MaxDeployCut int `json:"maxDeployCut"`
}

// RackStat is POWER, RAM or UPTIME: base + installed effects, capped at max; every step above
// base adds 1 to the bonus type (AD-014).
type RackStat struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
	Base  int    `json:"base"`
	Max   int    `json:"max"`
	Step  int    `json:"step"`
	Bonus string `json:"bonus"`
}
type RackEffect struct {
	Stat   string `json:"stat"`
	Amount int    `json:"amount"`
}
type Component struct {
	ID      string       `json:"id"`
	Name    string       `json:"name"`
	Glyph   string       `json:"glyph"`
	Color   string       `json:"color"`
	Price   Price        `json:"price"`
	Effects []RackEffect `json:"effects"`
}
type Rack struct {
	Slots      int         `json:"slots"`
	Stats      []RackStat  `json:"stats"`
	Components []Component `json:"components"`
}

// AvatarPart is one editable part of the hero; Kind is "color" (options carry a ramp) or "style"
// (options carry a layer). GearSlot names the gear slot whose look overrides the part.
type AvatarPart struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	GearSlot string `json:"gearSlot,omitempty"`
}

// AvatarOption is a choice for one part. Price is nil for a free option; GearOnly options come
// only from equipped gear and are never picked; Fixed styles ignore the part's color.
type AvatarOption struct {
	ID       string   `json:"id"`
	Part     string   `json:"part"`
	Name     string   `json:"name"`
	Ramp     []string `json:"ramp,omitempty"`
	Layer    string   `json:"layer,omitempty"`
	Fixed    bool     `json:"fixed,omitempty"`
	GearOnly bool     `json:"gearOnly,omitempty"`
	Price    *Price   `json:"price,omitempty"`
	// Bodies lists the body ids that may wear the option; empty means every body.
	Bodies []string `json:"bodies,omitempty"`
}

// AvailableTo reports whether a hero of the given body may wear the option.
func (o AvatarOption) AvailableTo(body string) bool {
	return len(o.Bodies) == 0 || slices.Contains(o.Bodies, body)
}

// AvatarBody is a body type of the hero; Defaults overrides Avatar.Defaults for the parts it
// lists.
type AvatarBody struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Defaults map[string]string `json:"defaults,omitempty"`
}

type Avatar struct {
	Parts   []AvatarPart   `json:"parts"`
	Bodies  []AvatarBody   `json:"bodies"`
	Options []AvatarOption `json:"options"`
	// Defaults has one free option per part, worn until the player picks another.
	Defaults map[string]string `json:"defaults"`
}

type ItemQuantity struct {
	Item     string `json:"item"`
	Quantity int    `json:"quantity"`
}

// RecipeOutput is what a forge recipe makes; Kind is "item" or "gear".
type RecipeOutput struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
}

// Recipe turns its ingredients, plus an optional price, into one unit of its output.
type Recipe struct {
	ID          string         `json:"id"`
	Output      RecipeOutput   `json:"output"`
	Ingredients []ItemQuantity `json:"ingredients"`
	// Price is nil for a recipe that costs only its ingredients.
	Price *Price `json:"price,omitempty"`
}

type CombatRules struct {
	Counter            []int   `json:"counter"`
	SPRegen            int     `json:"spRegen"`
	WeaknessMultiplier float64 `json:"weaknessMultiplier"`
	Victory            struct {
		XP    int `json:"xp"`
		Coins int `json:"coins"`
		Gems  int `json:"gems"`
	} `json:"victory"`
	DropChance    int            `json:"dropChance"`
	PotionChance  int            `json:"potionChance"`
	Potion        string         `json:"potion"`
	StartingItems []ItemQuantity `json:"startingItems"`
}

type Catalog struct {
	Version      string
	Regions      []Region
	DeployTypes  []DeployType
	DeployLevels []DeployLevel
	SkillTrees   []SkillTree
	Enemies      []Enemy
	Commands     []Command
	Items        []Item
	Combat       CombatRules
	GearSlots    []GearSlot
	Gear         []Gear
	Skins        []Skin
	Office       Office
	Rack         Rack
	Recipes      []Recipe
	Avatar       Avatar
	body         []byte
}

func Load() (*Catalog, error) {
	names, err := fs.Glob(data.Files, "*.json")
	if err != nil {
		return nil, err
	}
	sort.Strings(names)
	h := sha256.New()
	for _, n := range names {
		b, err := data.Files.ReadFile(n)
		if err != nil {
			return nil, err
		}
		fmt.Fprintf(h, "%s\x00", n)
		h.Write(b)
	}
	c := &Catalog{Version: hex.EncodeToString(h.Sum(nil))[:16]}

	raw, err := data.Files.ReadFile("regions.json")
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &c.Regions); err != nil {
		return nil, fmt.Errorf("regions.json: %w", err)
	}

	raw, err = data.Files.ReadFile("deploys.json")
	if err != nil {
		return nil, err
	}
	var deploys struct {
		Types  []DeployType  `json:"types"`
		Levels []DeployLevel `json:"levels"`
	}
	if err := json.Unmarshal(raw, &deploys); err != nil {
		return nil, fmt.Errorf("deploys.json: %w", err)
	}
	c.DeployTypes, c.DeployLevels = deploys.Types, deploys.Levels

	raw, err = data.Files.ReadFile("skills.json")
	if err != nil {
		return nil, err
	}
	var skills struct {
		Trees []SkillTree `json:"trees"`
	}
	if err := json.Unmarshal(raw, &skills); err != nil {
		return nil, fmt.Errorf("skills.json: %w", err)
	}
	c.SkillTrees = skills.Trees

	raw, err = data.Files.ReadFile("combat.json")
	if err != nil {
		return nil, err
	}
	var combat struct {
		Enemies  []Enemy     `json:"enemies"`
		Commands []Command   `json:"commands"`
		Items    []Item      `json:"items"`
		Rules    CombatRules `json:"rules"`
	}
	if err := json.Unmarshal(raw, &combat); err != nil {
		return nil, fmt.Errorf("combat.json: %w", err)
	}
	c.Enemies, c.Commands, c.Items, c.Combat = combat.Enemies, combat.Commands, combat.Items, combat.Rules

	raw, err = data.Files.ReadFile("shop.json")
	if err != nil {
		return nil, err
	}
	var shop struct {
		Slots []GearSlot `json:"slots"`
		Gear  []Gear     `json:"gear"`
		Skins []Skin     `json:"skins"`
	}
	if err := json.Unmarshal(raw, &shop); err != nil {
		return nil, fmt.Errorf("shop.json: %w", err)
	}
	c.GearSlots, c.Gear, c.Skins = shop.Slots, shop.Gear, shop.Skins

	raw, err = data.Files.ReadFile("office.json")
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &c.Office); err != nil {
		return nil, fmt.Errorf("office.json: %w", err)
	}

	raw, err = data.Files.ReadFile("rack.json")
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &c.Rack); err != nil {
		return nil, fmt.Errorf("rack.json: %w", err)
	}

	raw, err = data.Files.ReadFile("forge.json")
	if err != nil {
		return nil, err
	}
	var forge struct {
		Recipes []Recipe `json:"recipes"`
	}
	if err := json.Unmarshal(raw, &forge); err != nil {
		return nil, fmt.Errorf("forge.json: %w", err)
	}
	c.Recipes = forge.Recipes

	raw, err = data.Files.ReadFile("avatar.json")
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &c.Avatar); err != nil {
		return nil, fmt.Errorf("avatar.json: %w", err)
	}

	c.body, err = json.Marshal(struct {
		Version      string        `json:"version"`
		Regions      []Region      `json:"regions"`
		DeployTypes  []DeployType  `json:"deployTypes"`
		DeployLevels []DeployLevel `json:"deployLevels"`
		SkillTrees   []SkillTree   `json:"skillTrees"`
		Enemies      []Enemy       `json:"enemies"`
		Commands     []Command     `json:"commands"`
		Items        []Item        `json:"items"`
		Combat       CombatRules   `json:"combat"`
		GearSlots    []GearSlot    `json:"gearSlots"`
		Gear         []Gear        `json:"gear"`
		Skins        []Skin        `json:"skins"`
		Office       Office        `json:"office"`
		Rack         Rack          `json:"rack"`
		Recipes      []Recipe      `json:"recipes"`
		Avatar       Avatar        `json:"avatar"`
	}{c.Version, c.Regions, c.DeployTypes, c.DeployLevels, c.SkillTrees, c.Enemies, c.Commands, c.Items, c.Combat,
		c.GearSlots, c.Gear, c.Skins, c.Office, c.Rack, c.Recipes, c.Avatar})
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Catalog) Region(id string) (Region, bool) {
	for _, r := range c.Regions {
		if r.ID == id {
			return r, true
		}
	}
	return Region{}, false
}

func (c *Catalog) DeployType(id string) (DeployType, bool) {
	for _, t := range c.DeployTypes {
		if t.ID == id {
			return t, true
		}
	}
	return DeployType{}, false
}

func (c *Catalog) DeployLevel(level int) (DeployLevel, bool) {
	for _, l := range c.DeployLevels {
		if l.Level == level {
			return l, true
		}
	}
	return DeployLevel{}, false
}

// Skill finds a node and the node before it in the same tree (nil for a tree's first node).
func (c *Catalog) Skill(id string) (node SkillNode, previous *SkillNode, ok bool) {
	for _, t := range c.SkillTrees {
		for i, n := range t.Nodes {
			if n.ID == id {
				if i > 0 {
					previous = &t.Nodes[i-1]
				}
				return n, previous, true
			}
		}
	}
	return SkillNode{}, nil, false
}

// SkillPosition orders skill ids as the catalog lists them; unknown ids sort last.
func (c *Catalog) SkillPosition(id string) int {
	pos := 0
	for _, t := range c.SkillTrees {
		for _, n := range t.Nodes {
			if n.ID == id {
				return pos
			}
			pos++
		}
	}
	return pos
}

// Enemy finds an enemy by its catalog id (assets-apply door 1).
func (c *Catalog) Enemy(id string) (Enemy, bool) {
	for _, e := range c.Enemies {
		if e.ID == id {
			return e, true
		}
	}
	return Enemy{}, false
}

// EnemiesIn lists a region's enemies in catalog order; the battle start draws one of them.
func (c *Catalog) EnemiesIn(region string) []Enemy {
	var out []Enemy
	for _, e := range c.Enemies {
		if e.Region == region {
			out = append(out, e)
		}
	}
	return out
}

func (c *Catalog) Command(id string) (Command, bool) {
	for _, cmd := range c.Commands {
		if cmd.ID == id {
			return cmd, true
		}
	}
	return Command{}, false
}

func (c *Catalog) Item(id string) (Item, bool) {
	for _, it := range c.Items {
		if it.ID == id {
			return it, true
		}
	}
	return Item{}, false
}

// ItemPosition orders item ids as the catalog lists them; unknown ids sort last.
func (c *Catalog) ItemPosition(id string) int {
	for i, it := range c.Items {
		if it.ID == id {
			return i
		}
	}
	return len(c.Items)
}

func (c *Catalog) GearItem(id string) (Gear, bool) {
	for _, g := range c.Gear {
		if g.ID == id {
			return g, true
		}
	}
	return Gear{}, false
}

// GearPosition orders gear ids as the catalog lists them; unknown ids sort last.
func (c *Catalog) GearPosition(id string) int {
	for i, g := range c.Gear {
		if g.ID == id {
			return i
		}
	}
	return len(c.Gear)
}

func (c *Catalog) Skin(id string) (Skin, bool) {
	for _, s := range c.Skins {
		if s.ID == id {
			return s, true
		}
	}
	return Skin{}, false
}

// SkinPosition orders skin ids as the catalog lists them; unknown ids sort last.
func (c *Catalog) SkinPosition(id string) int {
	for i, s := range c.Skins {
		if s.ID == id {
			return i
		}
	}
	return len(c.Skins)
}

func (c *Catalog) Zone(id string) (OfficeZone, bool) {
	for _, z := range c.Office.Zones {
		if z.ID == id {
			return z, true
		}
	}
	return OfficeZone{}, false
}

func (c *Catalog) FurnitureItem(id string) (Furniture, bool) {
	for _, f := range c.Office.Furniture {
		if f.ID == id {
			return f, true
		}
	}
	return Furniture{}, false
}

func (c *Catalog) ComponentItem(id string) (Component, bool) {
	for _, k := range c.Rack.Components {
		if k.ID == id {
			return k, true
		}
	}
	return Component{}, false
}

func (c *Catalog) Recipe(id string) (Recipe, bool) {
	for _, r := range c.Recipes {
		if r.ID == id {
			return r, true
		}
	}
	return Recipe{}, false
}

func (c *Catalog) AvatarPart(id string) (AvatarPart, bool) {
	for _, p := range c.Avatar.Parts {
		if p.ID == id {
			return p, true
		}
	}
	return AvatarPart{}, false
}

func (c *Catalog) AvatarOption(id string) (AvatarOption, bool) {
	for _, o := range c.Avatar.Options {
		if o.ID == id {
			return o, true
		}
	}
	return AvatarOption{}, false
}

func (c *Catalog) AvatarBody(id string) (AvatarBody, bool) {
	for _, b := range c.Avatar.Bodies {
		if b.ID == id {
			return b, true
		}
	}
	return AvatarBody{}, false
}

// AvatarDefault is the option a hero of body wears on part until picking another: the body's own
// default when it lists the part, Avatar.Defaults otherwise.
func (c *Catalog) AvatarDefault(body, part string) string {
	if b, ok := c.AvatarBody(body); ok {
		if id, ok := b.Defaults[part]; ok {
			return id
		}
	}
	return c.Avatar.Defaults[part]
}

// AvatarOptionPosition orders option ids as the catalog lists them; unknown ids sort last.
func (c *Catalog) AvatarOptionPosition(id string) int {
	for i, o := range c.Avatar.Options {
		if o.ID == id {
			return i
		}
	}
	return len(c.Avatar.Options)
}

// SkillBonus sums the bonus of one type ("hp", "sp", "dmg") over the given skill ids.
func (c *Catalog) SkillBonus(skills []string, bonusType string) int {
	sum := 0
	for _, id := range skills {
		if n, _, ok := c.Skill(id); ok && n.Bonus.Type == bonusType {
			sum += n.Bonus.Amount
		}
	}
	return sum
}

var (
	defaultOnce sync.Once
	defaultCat  *Catalog
)

// Default is the embedded catalog, loaded once. It panics if the embedded data is invalid,
// which the catalog tests rule out before a build ships.
func Default() *Catalog {
	defaultOnce.Do(func() {
		c, err := Load()
		if err != nil {
			panic(err)
		}
		defaultCat = c
	})
	return defaultCat
}

func (c *Catalog) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	etag := `"` + c.Version + `"`
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "no-cache")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(c.body)
}
