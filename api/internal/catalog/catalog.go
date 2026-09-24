// Package catalog loads the embedded balance data and serves it at GET /api/catalog.
package catalog

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
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
	Price       Price  `json:"price"`
	Bonus       Bonus  `json:"bonus"`
}

type Skin struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Rarity      string `json:"rarity"`
	Description string `json:"description"`
	Filter      string `json:"filter"`
	Price       Price  `json:"price"`
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

type ItemQuantity struct {
	Item     string `json:"item"`
	Quantity int    `json:"quantity"`
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
	}{c.Version, c.Regions, c.DeployTypes, c.DeployLevels, c.SkillTrees, c.Enemies, c.Commands, c.Items, c.Combat,
		c.GearSlots, c.Gear, c.Skins, c.Office})
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

func (c *Catalog) Enemy(region string) (Enemy, bool) {
	for _, e := range c.Enemies {
		if e.Region == region {
			return e, true
		}
	}
	return Enemy{}, false
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
