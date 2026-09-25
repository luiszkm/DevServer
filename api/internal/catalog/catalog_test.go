package catalog_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"regexp"
	"strings"
	"testing"

	"devserver/api/internal/apptest"
	"devserver/api/internal/catalog"
)

type body struct {
	Version string `json:"version"`
	Regions []struct {
		ID       string `json:"id"`
		MinLevel int    `json:"minLevel"`
	} `json:"regions"`
}

// C31
func TestCatalog_ServesRegions(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d, want 200 without a cookie", rec.Code)
	}
	b := apptest.Decode[body](t, rec)
	if b.Version == "" {
		t.Fatal("empty version")
	}
	want := []struct {
		id  string
		min int
	}{{"vila", 1}, {"floresta", 1}, {"mercado", 2}, {"caverna", 5}, {"torre", 8}, {"nuvem", 12}}
	if len(b.Regions) != len(want) {
		t.Fatalf("regions = %d, want 6", len(b.Regions))
	}
	for i, w := range want {
		if b.Regions[i].ID != w.id || b.Regions[i].MinLevel != w.min {
			t.Errorf("region %d = %s/%d, want %s/%d", i, b.Regions[i].ID, b.Regions[i].MinLevel, w.id, w.min)
		}
	}
}

// C32
func TestCatalog_ETag(t *testing.T) {
	env := apptest.New(t)
	first := env.Do(http.MethodGet, "/api/catalog", nil)
	etag := first.Header().Get("ETag")
	if v := apptest.Decode[body](t, first).Version; etag != `"`+v+`"` {
		t.Fatalf("ETag %s is not the quoted version %s", etag, v)
	}

	withINM := func(v string) (int, int) {
		r := httptest.NewRequest(http.MethodGet, "/api/catalog", nil)
		r.Header.Set("If-None-Match", v)
		rec := env.Serve(r)
		return rec.Code, rec.Body.Len()
	}
	if code, n := withINM(etag); code != http.StatusNotModified || n != 0 {
		t.Errorf("matching If-None-Match: %d with %d body bytes, want 304 empty", code, n)
	}
	if code, _ := withINM(`"other"`); code != http.StatusOK {
		t.Errorf("different If-None-Match: %d, want 200", code)
	}
}

// C12
func TestCatalog_ServesDeploys(t *testing.T) {
	env := apptest.New(t)
	b := apptest.Decode[struct {
		DeployTypes []struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Glyph string `json:"glyph"`
		} `json:"deployTypes"`
		DeployLevels []struct {
			Level, MinLevel, Minutes, XP, Coins, Gems int
		} `json:"deployLevels"`
	}](t, env.Do(http.MethodGet, "/api/catalog", nil))
	var ids []string
	for _, d := range b.DeployTypes {
		ids = append(ids, d.ID)
	}
	if strings.Join(ids, ",") != "backend,frontend,mobile,database,microservices" {
		t.Errorf("deployTypes = %v", ids)
	}
	wantTypes := map[string][2]string{
		"backend": {"BACKEND", "$_"}, "frontend": {"FRONTEND", "</>"}, "mobile": {"MOBILE", "[]"},
		"database": {"BANCO DE DADOS", "##"}, "microservices": {"MICROSSERVIÇOS", "::"},
	}
	for _, d := range b.DeployTypes {
		if got := [2]string{d.Name, d.Glyph}; got != wantTypes[d.ID] {
			t.Errorf("type %s name/glyph = %v, want %v", d.ID, got, wantTypes[d.ID])
		}
	}
	want := [][6]int{{1, 1, 15, 80, 40, 0}, {2, 3, 30, 150, 70, 1}, {3, 6, 60, 260, 110, 2}, {4, 10, 180, 420, 180, 4}, {5, 15, 360, 700, 300, 8}}
	if len(b.DeployLevels) != 5 {
		t.Fatalf("deployLevels = %d, want 5", len(b.DeployLevels))
	}
	for i, l := range b.DeployLevels {
		got := [6]int{l.Level, l.MinLevel, l.Minutes, l.XP, l.Coins, l.Gems}
		if got != want[i] {
			t.Errorf("level %d = %v, want %v", i+1, got, want[i])
		}
	}
}

var descriptions = map[string]string{
	"f1": "+10 HP máximo permanente", "f2": "+8 SP máximo em combate", "f3": "+10% de dano em todos os ataques",
	"b1": "+10 HP máximo permanente", "b2": "+10 SP máximo em combate", "b3": "+12% de dano em todos os ataques",
	"i1": "+8 SP máximo em combate", "i2": "+15 HP máximo permanente", "i3": "+15% de dano em todos os ataques",
}

// C12
func TestCatalog_ServesSkillTrees(t *testing.T) {
	env := apptest.New(t)
	type node struct {
		ID, Glyph, Name, Description string
		Bonus                        struct {
			Type   string
			Amount int
		}
	}
	b := apptest.Decode[struct {
		SkillTrees []struct {
			ID, Name string
			Nodes    []node
		} `json:"skillTrees"`
	}](t, env.Do(http.MethodGet, "/api/catalog", nil))
	want := []struct {
		id, name string
		nodes    [][5]string
	}{
		{"frontend", "FRONTEND", [][5]string{{"f1", "</>", "MARKUP SEMÂNTICO", "hp", "10"}, {"f2", "{}", "GRID MASTER", "sp", "8"}, {"f3", "~", "MOTION", "dmg", "10"}}},
		{"backend", "BACKEND", [][5]string{{"b1", "$_", "API REST", "hp", "10"}, {"b2", "[]", "CAMADA DE CACHE", "sp", "10"}, {"b3", "##", "FILA DE EVENTOS", "dmg", "12"}}},
		{"infra", "INFRA", [][5]string{{"i1", ">_", "SHELL SCRIPT", "sp", "8"}, {"i2", "::", "CONTAINERS", "hp", "15"}, {"i3", "^", "AUTO-SCALING", "dmg", "15"}}},
	}
	if len(b.SkillTrees) != 3 {
		t.Fatalf("skillTrees = %d, want 3", len(b.SkillTrees))
	}
	for i, w := range want {
		tr := b.SkillTrees[i]
		if tr.ID != w.id || tr.Name != w.name || len(tr.Nodes) != 3 {
			t.Errorf("tree %d = %s/%s with %d nodes", i, tr.ID, tr.Name, len(tr.Nodes))
			continue
		}
		for j, wn := range w.nodes {
			n := tr.Nodes[j]
			got := [5]string{n.ID, n.Glyph, n.Name, n.Bonus.Type, fmt.Sprint(n.Bonus.Amount)}
			if got != wn {
				t.Errorf("node %s = %v, want %v", wn[0], got, wn)
			}
			if n.Description != descriptions[wn[0]] {
				t.Errorf("node %s description = %q, want %q", wn[0], n.Description, descriptions[wn[0]])
			}
		}
	}
}

// C27 (own layer): catalog position of skill ids, unknown ids last.
func TestCatalog_SkillPosition(t *testing.T) {
	c := catalog.Default()
	for i, id := range []string{"f1", "f2", "f3", "b1", "b2", "b3", "i1", "i2", "i3"} {
		if got := c.SkillPosition(id); got != i {
			t.Errorf("SkillPosition(%s) = %d, want %d", id, got, i)
		}
	}
	if got := c.SkillPosition("zz"); got != 9 {
		t.Errorf("SkillPosition(unknown) = %d, want 9 (after every node)", got)
	}
}

// C37
func TestCatalog_ServesCombat(t *testing.T) {
	env := apptest.New(t)
	var b struct {
		Enemies []struct {
			Region, Name, Weakness, Drop, Glyph string
			Level, HP, SP                       int
		} `json:"enemies"`
		Commands []struct {
			ID, Label, Hint, Skill        string
			Cost, Heal, SPGain            int
			Damage                        []int
			ExposesWeakness, Shield, Flee bool
		} `json:"commands"`
		Items []struct {
			ID, Name, Glyph, Rarity, Description string
			Restore                              *struct {
				Stat   string
				Amount int
			}
		} `json:"items"`
		Combat struct {
			Counter            []int
			SPRegen            int
			WeaknessMultiplier float64
			Victory            struct{ XP, Coins, Gems int }
			DropChance         int
			PotionChance       int
			Potion             string
			StartingItems      []struct {
				Item     string
				Quantity int
			}
		} `json:"combat"`
	}
	if err := json.Unmarshal(env.Do(http.MethodGet, "/api/catalog", nil).Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	enemies := []string{
		"vila|NULL SLIME|3|60|50|null-check|null_shard",
		"floresta|LOG WISP|5|70|55|referência circular|log_essence",
		"mercado|PACOTE MALICIOSO|7|85|60|versão não travada|corrupt_dep",
		"caverna|EXCEÇÃO SELVAGEM|10|110|70|catch ausente|wild_trace",
		"torre|RACE CONDITION|15|160|85|mutex ausente|race_core",
		"nuvem|MEMORY LEAK ANCESTRAL|22|220|100|garbage collector|memory_crystal",
	}
	if len(b.Enemies) != 6 {
		t.Fatalf("enemies = %d", len(b.Enemies))
	}
	for i, e := range b.Enemies {
		if got := fmt.Sprintf("%s|%s|%d|%d|%d|%s|%s", e.Region, e.Name, e.Level, e.HP, e.SP, e.Weakness, e.Drop); got != enemies[i] || e.Glyph == "" {
			t.Errorf("enemy %d = %s (glyph %q), want %s", i, got, e.Glyph, enemies[i])
		}
	}
	commands := []string{
		"fix|FIX|10|14-20|0|false|false|0|false|", "test|TEST|8||0|true|false|0|false|",
		"refactor|REFACTOR|14||18|false|false|0|false|", "plain|PLAIN|0||0|false|true|3|false|",
		"f1|</> MARKUP|12|12-14|0|false|false|0|false|f1", "f2|{} GRID|16|16-20|0|false|false|0|false|f2",
		"f3|~ MOTION|20|20-25|0|false|false|0|false|f3", "b1|$_ API|12|13-17|0|false|false|0|false|b1",
		"b2|[] CACHE|16||24|false|false|0|false|b2", "b3|## FILA|20|22-28|0|false|false|0|false|b3",
		"i1|>_ SHELL|10|8-10|0|true|false|0|false|i1", "i2|:: CONTAINER|14||0|false|true|0|false|i2",
		"i3|^ SCALING|24|28-34|0|false|false|0|false|i3", "rollback|ROLLBACK|0||0|false|false|0|true|",
	}
	if len(b.Commands) != 14 {
		t.Fatalf("commands = %d", len(b.Commands))
	}
	for i, c := range b.Commands {
		dmg := ""
		if len(c.Damage) == 2 {
			dmg = fmt.Sprintf("%d-%d", c.Damage[0], c.Damage[1])
		}
		got := fmt.Sprintf("%s|%s|%d|%s|%d|%v|%v|%d|%v|%s", c.ID, c.Label, c.Cost, dmg, c.Heal, c.ExposesWeakness, c.Shield, c.SPGain, c.Flee, c.Skill)
		if got != commands[i] || c.Hint == "" {
			t.Errorf("command %d = %s (hint %q), want %s", i, got, c.Hint, commands[i])
		}
	}
	items := []string{
		"null_shard|FRAGMENTO NULL|0x0|COMUM|", "log_essence|ESSÊNCIA DE LOG|</>|COMUM|",
		"corrupt_dep|DEPENDÊNCIA CORROMPIDA|!pkg|INCOMUM|", "wild_trace|STACK TRACE SELVAGEM|{!}|INCOMUM|",
		"race_core|NÚCLEO DE CONCORRÊNCIA|//|RARO|", "memory_crystal|CRISTAL DE MEMÓRIA|^^|LENDÁRIO|",
		"sp_potion|POÇÃO DE CACHE|++|COMUM|sp 30", "hp_potion|POÇÃO DE MEMÓRIA|HP+|COMUM|hp 40",
		// shop-inventory-avatar AC 1 adds the deploy booster, which restores nothing in combat.
		"boost_deploy|ACELERADOR DE DEPLOY|>>|COMUM|",
	}
	if len(b.Items) != len(items) {
		t.Fatalf("items = %d", len(b.Items))
	}
	for i, it := range b.Items {
		restore := ""
		if it.Restore != nil {
			restore = fmt.Sprintf("%s %d", it.Restore.Stat, it.Restore.Amount)
		}
		if got := fmt.Sprintf("%s|%s|%s|%s|%s", it.ID, it.Name, it.Glyph, it.Rarity, restore); got != items[i] || it.Description == "" {
			t.Errorf("item %d = %s, want %s", i, got, items[i])
		}
	}
	r := b.Combat
	if fmt.Sprint(r.Counter) != "[7 14]" || r.SPRegen != 5 || r.WeaknessMultiplier != 1.8 || r.Victory.XP != 90 || r.Victory.Coins != 40 ||
		r.Victory.Gems != 1 || r.DropChance != 65 || r.PotionChance != 30 || r.Potion != "sp_potion" ||
		len(r.StartingItems) != 1 || r.StartingItems[0].Item != "sp_potion" || r.StartingItems[0].Quantity != 2 {
		t.Errorf("combat rules = %+v", r)
	}
}

// Skin palettes of the avatar contract: tone, hair color and eyes of each paid skin.
var palettes = map[string]map[string][]string{
	"neon": {
		"tone":      {"#1a6a70", "#2a9aa0", "#5ad2d2", "#a0f4f0"},
		"hairColor": {"#6a1a4a", "#9c2a6c", "#d04a98", "#f080c0"},
		"eyes":      {"#0c3060", "#1450a0", "#2a78d0", "#62a8f0"},
	},
	"shadow": {
		"tone":      {"#3a2a5a", "#54407e", "#7058a2", "#9478c4"},
		"hairColor": {"#0c0818", "#1a1030", "#2a1c48", "#3e2c66"},
		"eyes":      {"#2e3640", "#4a5460", "#6c7884", "#98a4b0"},
	},
	"golden": {
		"tone":      {"#886018", "#c08c20", "#f0c040", "#fce484"},
		"hairColor": {"#a08a50", "#c8b070", "#e8d498", "#fff4c8"},
		"eyes":      {"#6a4210", "#946018", "#be8424", "#e0aa40"},
	},
}

// C1
func TestCatalog_ServesShop(t *testing.T) {
	env := apptest.New(t)
	type price struct {
		Currency string `json:"currency"`
		Amount   int    `json:"amount"`
	}
	type bonus struct {
		Type   string `json:"type"`
		Amount int    `json:"amount"`
	}
	var b struct {
		GearSlots []struct{ ID, Name string } `json:"gearSlots"`
		Gear      []struct {
			ID, Name, Glyph, Slot, Rarity, Description string
			Price                                      *price
			Bonus                                      *bonus
		} `json:"gear"`
		Skins []struct {
			ID, Name, Rarity, Description string
			Palette                       map[string][]string
			Price                         *price
			Bonus                         *bonus
		} `json:"skins"`
		Items []struct {
			ID, Name, Glyph, Rarity string
			Price                   *price
		} `json:"items"`
	}
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	var raw struct {
		Skins []map[string]json.RawMessage `json:"skins"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}

	slots := []string{"setup|CONFIGURAÇÃO", "bebida|BEBIDA", "vestuario|VESTUÁRIO", "acessorio|ACESSÓRIO"}
	if len(b.GearSlots) != len(slots) {
		t.Fatalf("gearSlots = %d, want 4", len(b.GearSlots))
	}
	for i, s := range b.GearSlots {
		if got := s.ID + "|" + s.Name; got != slots[i] {
			t.Errorf("slot %d = %s, want %s", i, got, slots[i])
		}
	}

	gear := []string{
		"macbook|MACBOOK PRO|setup|RARO|gems 120|dmg 8",
		"monitor|MONITOR ULTRAWIDE|setup|LENDÁRIO|gems 200|sp 20",
		"cafe|CAFÉ EXPRESSO|bebida|COMUM|coins 50|sp 12",
		"moletom|MOLETOM CONFORTÁVEL|vestuario|COMUM|coins 70|hp 15",
		"cadeira|CADEIRA ERGONÔMICA|vestuario|RARO|gems 150|hp 30",
		"fone|FONE COM CANCELAMENTO|acessorio|INCOMUM|gems 90|dmg 6",
	}
	// The forge's craft-only gear follows these six (forge C2).
	if len(b.Gear) < len(gear) {
		t.Fatalf("gear = %d, want at least 6", len(b.Gear))
	}
	for i, g := range b.Gear[:len(gear)] {
		if g.Price == nil || g.Bonus == nil {
			t.Errorf("gear %s lacks price or bonus", g.ID)
			continue
		}
		got := fmt.Sprintf("%s|%s|%s|%s|%s %d|%s %d", g.ID, g.Name, g.Slot, g.Rarity, g.Price.Currency, g.Price.Amount, g.Bonus.Type, g.Bonus.Amount)
		if got != gear[i] || g.Glyph == "" || g.Description == "" {
			t.Errorf("gear %d = %s (glyph %q), want %s", i, got, g.Glyph, gear[i])
		}
	}

	skins := []string{
		"default|DEV PADRÃO|PADRÃO|gems 0|-",
		"neon|DEV NEON|INCOMUM|gems 60|dmg 5",
		"shadow|DEV SOMBRIO|RARO|gems 80|sp 10",
		"golden|DEV DOURADO|LENDÁRIO|gems 150|hp 20",
	}
	if len(b.Skins) != len(skins) {
		t.Fatalf("skins = %d, want 4", len(b.Skins))
	}
	for i, s := range b.Skins {
		bonusTxt := "-"
		if s.Bonus != nil {
			bonusTxt = fmt.Sprintf("%s %d", s.Bonus.Type, s.Bonus.Amount)
		}
		if s.Price == nil {
			t.Errorf("skin %s lacks price", s.ID)
			continue
		}
		got := fmt.Sprintf("%s|%s|%s|%s %d|%s", s.ID, s.Name, s.Rarity, s.Price.Currency, s.Price.Amount, bonusTxt)
		if got != skins[i] || s.Description == "" {
			t.Errorf("skin %d = %s, want %s", i, got, skins[i])
		}
		if _, has := raw.Skins[i]["filter"]; has {
			t.Errorf("skin %s still has a filter: %s", s.ID, raw.Skins[i]["filter"])
		}
		if s.ID == "default" {
			if string(raw.Skins[i]["palette"]) != "{}" {
				t.Errorf("default palette = %s, want {}", raw.Skins[i]["palette"])
			}
			if string(raw.Skins[i]["bonus"]) != "null" {
				t.Errorf("default bonus = %s, want null", raw.Skins[i]["bonus"])
			}
		} else if !reflect.DeepEqual(s.Palette, palettes[s.ID]) {
			t.Errorf("skin %s palette = %v, want %v", s.ID, s.Palette, palettes[s.ID])
		}
	}

	prices := map[string]string{"sp_potion": "gems 15", "hp_potion": "gems 12", "boost_deploy": "gems 35"}
	seen := map[string]bool{}
	for _, it := range b.Items {
		want, priced := prices[it.ID]
		switch {
		case priced && (it.Price == nil || fmt.Sprintf("%s %d", it.Price.Currency, it.Price.Amount) != want):
			t.Errorf("item %s price = %+v, want %s", it.ID, it.Price, want)
		case it.ID == "null_shard" && it.Price != nil:
			t.Errorf("null_shard price = %+v, want none", it.Price)
		}
		if it.ID == "boost_deploy" && (it.Name != "ACELERADOR DE DEPLOY" || it.Glyph != ">>" || it.Rarity != "COMUM") {
			t.Errorf("boost_deploy = %+v", it)
		}
		seen[it.ID] = true
	}
	for id := range prices {
		if !seen[id] {
			t.Errorf("item %s missing", id)
		}
	}
	if !seen["null_shard"] {
		t.Error("null_shard missing")
	}
}

// C1 (office)
func TestCatalog_ServesOffice(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	var b struct {
		Office struct {
			Zones []struct {
				ID, Name string
				Cells    int
			} `json:"zones"`
			Furniture []map[string]json.RawMessage `json:"furniture"`
			Levels    []struct {
				Min  int
				Name string
			} `json:"levels"`
			MaxDeployCut int `json:"maxDeployCut"`
		} `json:"office"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	o := b.Office

	zones := []string{"parede|PAREDE|8", "piso|PISO|24"}
	if len(o.Zones) != len(zones) {
		t.Fatalf("zones = %d, want 2", len(o.Zones))
	}
	for i, z := range o.Zones {
		if got := fmt.Sprintf("%s|%s|%d", z.ID, z.Name, z.Cells); got != zones[i] {
			t.Errorf("zone %d = %s, want %s", i, got, zones[i])
		}
	}

	levels := []string{"0|CANTINHO", "30|HOME OFFICE", "70|ESTÚDIO", "120|LAB DEV", "180|SEDE DEVSERVE"}
	if len(o.Levels) != len(levels) {
		t.Fatalf("levels = %d, want 5", len(o.Levels))
	}
	for i, l := range o.Levels {
		if got := fmt.Sprintf("%d|%s", l.Min, l.Name); got != levels[i] {
			t.Errorf("level %d = %s, want %s", i, got, levels[i])
		}
	}

	if o.MaxDeployCut != 40 {
		t.Errorf("maxDeployCut = %d, want 40", o.MaxDeployCut)
	}

	// id, name, glyph, color, zone, price, comfort, bonus, description - every field by value.
	furniture := [][9]string{
		{"mesa", "MESA EM L", "[==]", "#ffc93c", "piso", `{"currency":"coins","amount":60}`, "8", `{"type":"xp","amount":3}`, "Espaço para dois monitores e o café."},
		{"cadeira_gamer", "CADEIRA GAMER", "[|]", "#e05252", "piso", `{"currency":"gems","amount":40}`, "10", `{"type":"spregen","amount":1}`, "Plantão de madrugada sem dor nas costas."},
		{"setup2", "SETUP 2 TELAS", "][", "#45b7ff", "piso", `{"currency":"gems","amount":90}`, "14", `{"type":"deploy","amount":5}`, "Build de um lado, log do outro."},
		{"rack", "RACK CASEIRO", "::", "#6bd425", "piso", `{"currency":"gems","amount":70}`, "9", `{"type":"deploy","amount":6}`, "Servidor local zumbindo no canto."},
		{"cafeteira", "CAFETEIRA", "{C}", "#ffc93c", "piso", `{"currency":"coins","amount":55}`, "7", `{"type":"spregen","amount":2}`, "Combustível renovável do dev."},
		{"estante", "ESTANTE DE LIVROS", "|||", "#b46cf0", "piso", `{"currency":"coins","amount":45}`, "6", `{"type":"xp","amount":2}`, "Documentação que ninguém lê, mas inspira."},
		{"planta", "PLANTA DE CANTO", "^", "#6bd425", "piso", `{"currency":"coins","amount":25}`, "5", `null`, "Oxigênio e um pouco de sanidade."},
		{"tapete", "TAPETE PIXELADO", "##", "#8b6cf0", "piso", `{"currency":"coins","amount":30}`, "4", `null`, "Aquece a sala e abafa o teclado."},
		{"neon", "LETREIRO NEON", "~~", "#45b7ff", "parede", `{"currency":"gems","amount":35}`, "12", `null`, "IT WORKS ON MY MACHINE em ciano."},
		{"poster", "PÔSTER RETRÔ", "[#]", "#ffc93c", "parede", `{"currency":"coins","amount":20}`, "4", `null`, "Key art do DevServer emoldurada."},
		{"kanban", "QUADRO KANBAN", "[+]", "#dbeeff", "parede", `{"currency":"coins","amount":50}`, "5", `{"type":"xp","amount":2}`, "Post-its que viram sprint."},
		{"janela", "JANELA COM VISTA", "[/]", "#8fc3e8", "parede", `{"currency":"gems","amount":60}`, "15", `null`, "Luz natural entre dois deploys."},
	}
	keys := []string{"id", "name", "glyph", "color", "zone", "price", "comfort", "bonus", "description"}
	if len(o.Furniture) != len(furniture) {
		t.Fatalf("furniture = %d, want 12", len(o.Furniture))
	}
	for i, f := range o.Furniture {
		if len(f) != len(keys) {
			t.Errorf("furniture %d has %d fields, want %d", i, len(f), len(keys))
		}
		for k, key := range keys {
			raw, ok := f[key]
			if !ok {
				t.Errorf("furniture %d lacks %s", i, key)
				continue
			}
			got := string(raw)
			var s string
			if strings.HasPrefix(got, `"`) && json.Unmarshal(raw, &s) == nil {
				got = s
			}
			if got != furniture[i][k] {
				t.Errorf("furniture %d %s = %s, want %s", i, key, got, furniture[i][k])
			}
		}
	}
}

// C1 (server-room)
func TestCatalog_ServesRack(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	var b struct {
		Rack any `json:"rack"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	// Every field by value, key names included; the order of stats and components is the prototype's.
	const want = `{
		"slots": 6,
		"stats": [
			{"id": "power", "name": "POWER", "color": "#45b7ff", "base": 20, "max": 100, "step": 10, "bonus": "dmg"},
			{"id": "ram", "name": "RAM", "color": "#6bd425", "base": 15, "max": 100, "step": 5, "bonus": "sp"},
			{"id": "uptime", "name": "UPTIME", "color": "#ffc93c", "base": 60, "max": 99, "step": 1, "bonus": "coins"}
		],
		"components": [
			{"id": "cpu", "name": "CPU 8-CORE", "glyph": "::", "color": "#45b7ff", "price": {"currency": "coins", "amount": 80}, "effects": [{"stat": "power", "amount": 25}]},
			{"id": "ram", "name": "RAM 32GB", "glyph": "[]", "color": "#6bd425", "price": {"currency": "coins", "amount": 60}, "effects": [{"stat": "ram", "amount": 30}]},
			{"id": "ssd", "name": "SSD NVME", "glyph": "=", "color": "#ffc93c", "price": {"currency": "coins", "amount": 70}, "effects": [{"stat": "power", "amount": 12}, {"stat": "uptime", "amount": 8}]},
			{"id": "cache", "name": "CACHE REDIS", "glyph": "~", "color": "#e05252", "price": {"currency": "coins", "amount": 90}, "effects": [{"stat": "power", "amount": 18}]},
			{"id": "lb", "name": "LOAD BALANCER", "glyph": ">>", "color": "#b46cf0", "price": {"currency": "coins", "amount": 120}, "effects": [{"stat": "uptime", "amount": 20}]},
			{"id": "gpu", "name": "GPU EDGE", "glyph": "#", "color": "#45b7ff", "price": {"currency": "coins", "amount": 150}, "effects": [{"stat": "power", "amount": 40}]}
		]
	}`
	var w any
	if err := json.Unmarshal([]byte(want), &w); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(b.Rack, w) {
		got, _ := json.Marshal(b.Rack)
		t.Fatalf("rack = %s", got)
	}
}

type forgePrice struct {
	Currency string `json:"currency"`
	Amount   int    `json:"amount"`
}

// C1 (forge)
func TestCatalog_ServesForge(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	var b struct {
		Recipes []struct {
			ID     string `json:"id"`
			Output struct {
				Kind string `json:"kind"`
				ID   string `json:"id"`
			} `json:"output"`
			Ingredients []struct {
				Item     string `json:"item"`
				Quantity int    `json:"quantity"`
			} `json:"ingredients"`
			Price *forgePrice `json:"price"`
		} `json:"recipes"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	var raw struct {
		Recipes []map[string]json.RawMessage `json:"recipes"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	want := []string{
		"forja_cache|item sp_potion|null_shard 2|-",
		"forja_memoria|item hp_potion|log_essence 2|-",
		"forja_acelerador|item boost_deploy|corrupt_dep 1,wild_trace 1|coins 20",
		"forja_caneca|gear caneca_log|log_essence 3,null_shard 2|coins 40",
		"forja_hoodie|gear hoodie_trace|wild_trace 3,corrupt_dep 2|coins 80",
		"forja_teclado|gear teclado_race|race_core 2,memory_crystal 1,wild_trace 3|coins 150",
	}
	if len(b.Recipes) != len(want) {
		t.Fatalf("recipes = %d, want %d", len(b.Recipes), len(want))
	}
	for i, r := range b.Recipes {
		ings := []string{}
		for _, in := range r.Ingredients {
			ings = append(ings, fmt.Sprintf("%s %d", in.Item, in.Quantity))
		}
		price := "-"
		if r.Price != nil {
			price = fmt.Sprintf("%s %d", r.Price.Currency, r.Price.Amount)
		}
		got := fmt.Sprintf("%s|%s %s|%s|%s", r.ID, r.Output.Kind, r.Output.ID, strings.Join(ings, ","), price)
		if got != want[i] {
			t.Errorf("recipe %d = %s, want %s", i, got, want[i])
		}
		if _, has := raw.Recipes[i]["price"]; has != (r.Price != nil) || (price == "-") == has {
			t.Errorf("recipe %s: price key present = %v, want %v", r.ID, has, price != "-")
		}
	}
}

// C2 (forge)
func TestCatalog_ServesForgeGear(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	var b struct {
		Gear []struct {
			ID, Name, Glyph, Slot, Rarity, Description string
			Price                                      *forgePrice
			Bonus                                      *struct {
				Type   string `json:"type"`
				Amount int    `json:"amount"`
			}
		} `json:"gear"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	var raw struct {
		Gear []map[string]json.RawMessage `json:"gear"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	want := []string{
		"macbook|price gems 120",
		"monitor|price gems 200",
		"cafe|price coins 50",
		"moletom|price coins 70",
		"cadeira|price gems 150",
		"fone|price gems 90",
		"caneca_log|CANECA DE LOGS|[u]|bebida|INCOMUM|Café coado no filtro de stack trace.|sp 16",
		"hoodie_trace|MOLETOM STACK TRACE|{#}|vestuario|RARO|Cada linha do erro costurada à mão.|hp 36",
		"teclado_race|TECLADO RACE CONDITION|[kbd]|acessorio|LENDÁRIO|As teclas chegam antes de você apertar.|dmg 12",
	}
	if len(b.Gear) != len(want) {
		t.Fatalf("gear = %d, want %d", len(b.Gear), len(want))
	}
	for i, g := range b.Gear {
		_, hasPrice := raw.Gear[i]["price"]
		var got string
		if i < 6 {
			if g.Price == nil {
				t.Errorf("gear %s lacks price", g.ID)
				continue
			}
			got = fmt.Sprintf("%s|price %s %d", g.ID, g.Price.Currency, g.Price.Amount)
		} else {
			if hasPrice {
				t.Errorf("gear %s has a price key: %s", g.ID, raw.Gear[i]["price"])
			}
			if g.Bonus == nil {
				t.Errorf("gear %s lacks bonus", g.ID)
				continue
			}
			got = fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s %d", g.ID, g.Name, g.Glyph, g.Slot, g.Rarity, g.Description, g.Bonus.Type, g.Bonus.Amount)
		}
		if got != want[i] {
			t.Errorf("gear %d = %s, want %s", i, got, want[i])
		}
	}
}

// C3 (forge)
func TestCatalog_RecipesReferenceCatalog(t *testing.T) {
	c, err := catalog.Load()
	if err != nil {
		t.Fatal(err)
	}
	made := map[string]bool{}
	for _, r := range c.Recipes {
		switch r.Output.Kind {
		case "item":
			if _, ok := c.Item(r.Output.ID); !ok {
				t.Errorf("recipe %s makes unknown item %q", r.ID, r.Output.ID)
			}
		case "gear":
			if _, ok := c.GearItem(r.Output.ID); !ok {
				t.Errorf("recipe %s makes unknown gear %q", r.ID, r.Output.ID)
			}
			made[r.Output.ID] = true
		default:
			t.Errorf("recipe %s output kind = %q, want item or gear", r.ID, r.Output.Kind)
		}
		if len(r.Ingredients) == 0 {
			t.Errorf("recipe %s has no ingredients", r.ID)
		}
		for _, in := range r.Ingredients {
			if _, ok := c.Item(in.Item); !ok {
				t.Errorf("recipe %s uses unknown item %q", r.ID, in.Item)
			}
			if in.Quantity < 1 {
				t.Errorf("recipe %s uses %d of %s, want at least 1", r.ID, in.Quantity, in.Item)
			}
		}
	}
	for _, g := range c.Gear {
		if g.Price == nil && !made[g.ID] {
			t.Errorf("gear %s has no price and no recipe", g.ID)
		}
	}
}

// Avatar C1: parts, every option and the defaults by value, as the avatar contract lists them.
func TestCatalog_ServesAvatar(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/catalog", nil)
	var b struct {
		Avatar struct {
			Parts    []map[string]string          `json:"parts"`
			Options  []map[string]json.RawMessage `json:"options"`
			Defaults map[string]string            `json:"defaults"`
		} `json:"avatar"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	a := b.Avatar

	parts := []string{
		"tone|PELE|color|", "eyes|OLHOS|color|", "hair|CABELO|style|", "hairColor|COR DO CABELO|color|",
		"beard|BARBA|style|", "glasses|ÓCULOS|style|",
		"top|ROUPA|style|vestuario", "topColor|COR DA ROUPA|color|", "bottomColor|CALÇA|color|", "laptop|NOTEBOOK|style|setup",
	}
	if len(a.Parts) != len(parts) {
		t.Fatalf("parts = %d, want %d", len(a.Parts), len(parts))
	}
	for i, p := range a.Parts {
		if got := p["id"] + "|" + p["name"] + "|" + p["kind"] + "|" + p["gearSlot"]; got != parts[i] {
			t.Errorf("part %d = %s, want %s", i, got, parts[i])
		}
	}

	// id|part|name|ramp or layer|flags|price, in the contract's order within each part.
	options := []string{
		"tone_clara|tone|CLARA|#b07858,#d8a07c,#f8cfa8,#ffe8cc|-|-",
		"tone_padrao|tone|PADRÃO|#8a5234,#b8764a,#f6ba72,#ffd8a0|-|-",
		"tone_morena|tone|MORENA|#6e3e22,#9a6038,#c88a58,#e4b07c|-|-",
		"tone_parda|tone|PARDA|#5a3018,#80492a,#a8683e,#c88c5c|-|-",
		"tone_negra|tone|NEGRA|#3a1e10,#5a3220,#7c4a30,#9c6844|-|-",
		"tone_retinta|tone|RETINTA|#24120a,#3a2014,#553222,#704834|-|-",
		"eyes_castanho|eyes|CASTANHO|#3a2010,#5c3418,#7e4c26,#a06a3a|-|-",
		"eyes_preto|eyes|PRETO|#101014,#1c1c24,#2a2a34,#3a3a46|-|-",
		"eyes_azul|eyes|AZUL|#0c3060,#1450a0,#2a78d0,#62a8f0|-|-",
		"eyes_verde|eyes|VERDE|#0e4020,#1a6630,#2e8c44,#56b464|-|-",
		"eyes_mel|eyes|MEL|#6a4210,#946018,#be8424,#e0aa40|-|-",
		"eyes_cinza|eyes|CINZA|#2e3640,#4a5460,#6c7884,#98a4b0|-|-",
		"hair_espetado|hair|ESPETADO|hair-espetado|-|-",
		"hair_curto|hair|CURTO|hair-curto|-|-",
		"hair_careca|hair|CARECA|hair-careca|-|-",
		"hair_longo|hair|LONGO|hair-longo|-|-",
		"hair_cacheado|hair|CACHEADO|hair-cacheado|-|-",
		"hair_coque|hair|COQUE|hair-coque|-|-",
		"hair_moicano|hair|MOICANO|hair-moicano|-|gems 30",
		"hair_topete|hair|TOPETE|hair-topete|-|gems 30",
		"hair_preto|hairColor|PRETO|#141420,#24242e,#34343e,#4a4a56|-|-",
		"hair_castanho|hairColor|CASTANHO|#2a160c,#462814,#643c20,#88562e|-|-",
		"hair_loiro|hairColor|LOIRO|#8a6420,#b88a2c,#e0b44a,#f8dc84|-|-",
		"hair_ruivo|hairColor|RUIVO|#5a1a0c,#8a2c14,#b8461e,#de6a30|-|-",
		"hair_grisalho|hairColor|GRISALHO|#4a4e56,#70767e,#9ca2aa,#cfd4da|-|-",
		"hair_azul|hairColor|AZUL|#0a2a66,#12449c,#2066d0,#4c96f0|-|coins 80",
		"hair_rosa|hairColor|ROSA|#6a1a4a,#9c2a6c,#d04a98,#f080c0|-|coins 80",
		"hair_verde|hairColor|VERDE NEON|#1a4a08,#2e7410,#4ea41c,#7cd23a|-|coins 80",
		"beard_nenhuma|beard|SEM BARBA||-|-",
		"beard_bigode|beard|BIGODE|beard-bigode|-|-",
		"beard_cavanhaque|beard|CAVANHAQUE|beard-cavanhaque|-|-",
		"beard_curta|beard|BARBA CURTA|beard-curta|-|-",
		"beard_cheia|beard|BARBA CHEIA|beard-cheia|-|-",
		"beard_lenhador|beard|BARBA LENHADOR|beard-lenhador|-|gems 30",
		"glasses_nenhum|glasses|SEM ÓCULOS||-|-",
		"glasses_redondo|glasses|REDONDO|glasses-redondo|fixed|-",
		"glasses_quadrado|glasses|QUADRADO|glasses-quadrado|fixed|-",
		"glasses_escuro|glasses|ÓCULOS ESCUROS|glasses-escuro|fixed|-",
		"glasses_cyber|glasses|VISOR CYBER|glasses-cyber|fixed|gems 40",
		"top_moletom|top|MOLETOM|top-moletom|-|-",
		"top_camiseta|top|CAMISETA|top-camiseta|-|-",
		"top_xadrez|top|CAMISA XADREZ|top-xadrez|-|-",
		"top_jaqueta|top|JAQUETA DE COURO|top-jaqueta|fixed|coins 150",
		"top_moletom_gear|top|MOLETOM CONFORTÁVEL|top-moletom_gear|fixed,gearOnly|-",
		"top_hoodie_trace|top|MOLETOM STACK TRACE|top-hoodie_trace|fixed,gearOnly|-",
		"top_grafite|topColor|GRAFITE|#202030,#2c3838,#383844,#4c4c5a|-|-",
		"top_azul|topColor|AZUL|#102040,#1a3464,#284c88,#3c68ac|-|-",
		"top_vinho|topColor|VINHO|#3a0c18,#5a1426,#7c2036,#9c3048|-|-",
		"top_verde|topColor|VERDE|#10301a,#1a4a28,#286a3a,#3a8a4e|-|-",
		"top_mostarda|topColor|MOSTARDA|#5a4210,#80601a,#a88026,#cca238|-|-",
		"top_branco|topColor|BRANCO|#8a929a,#b0b8c0,#d4dade,#eef2f4|-|-",
		"bottom_jeans|bottomColor|JEANS|#121e36,#1e364e,#2a4e66,#3e6a86|-|-",
		"bottom_preto|bottomColor|PRETO|#0e0e14,#18181f,#24242c,#32323c|-|-",
		"bottom_caqui|bottomColor|CÁQUI|#4a3c22,#6a5832,#8c7646,#ae965e|-|-",
		"bottom_cinza|bottomColor|CINZA|#2a2e34,#40464e,#5a626a,#7a828a|-|-",
		"laptop_basico|laptop|NOTEBOOK|laptop-basico|fixed|-",
		"laptop_preto|laptop|NOTEBOOK PRETO|laptop-preto|fixed|-",
		"laptop_gamer|laptop|NOTEBOOK GAMER RGB|laptop-gamer|fixed|gems 40",
		"laptop_macbook|laptop|MACBOOK PRO|laptop-macbook|fixed,gearOnly|-",
	}
	if len(a.Options) != len(options) {
		t.Fatalf("options = %d, want %d", len(a.Options), len(options))
	}
	for i, o := range a.Options {
		var id, part, name, layer string
		var ramp []string
		var fixed, gearOnly bool
		var price *struct {
			Currency string `json:"currency"`
			Amount   int    `json:"amount"`
		}
		for key, dst := range map[string]any{"id": &id, "part": &part, "name": &name, "layer": &layer, "ramp": &ramp,
			"fixed": &fixed, "gearOnly": &gearOnly, "price": &price} {
			if raw, ok := o[key]; ok {
				if err := json.Unmarshal(raw, dst); err != nil {
					t.Fatalf("option %d %s: %v", i, key, err)
				}
			}
		}
		if len(o) > 8 {
			t.Errorf("option %s has unexpected keys: %v", id, o)
		}
		look := layer
		if ramp != nil {
			look = strings.Join(ramp, ",")
		}
		flags := []string{}
		if fixed {
			flags = append(flags, "fixed")
		}
		if gearOnly {
			flags = append(flags, "gearOnly")
		}
		if len(flags) == 0 {
			flags = []string{"-"}
		}
		priceTxt := "-"
		if price != nil {
			priceTxt = fmt.Sprintf("%s %d", price.Currency, price.Amount)
		}
		if got := strings.Join([]string{id, part, name, look, strings.Join(flags, ","), priceTxt}, "|"); got != options[i] {
			t.Errorf("option %d = %s, want %s", i, got, options[i])
		}
	}

	defaults := map[string]string{
		"tone": "tone_padrao", "eyes": "eyes_castanho", "hair": "hair_espetado", "hairColor": "hair_preto",
		"beard": "beard_nenhuma", "glasses": "glasses_nenhum", "top": "top_moletom", "topColor": "top_grafite", "bottomColor": "bottom_jeans", "laptop": "laptop_basico",
	}
	if !reflect.DeepEqual(a.Defaults, defaults) {
		t.Errorf("defaults = %v, want %v", a.Defaults, defaults)
	}
}

// Avatar C2: the gear that dresses the hero names its look; every other piece has no look key.
func TestCatalog_ServesGearLooks(t *testing.T) {
	env := apptest.New(t)
	var raw struct {
		Gear []map[string]json.RawMessage `json:"gear"`
	}
	if err := json.Unmarshal(env.Do(http.MethodGet, "/api/catalog", nil).Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"macbook":      `{"part":"laptop","option":"laptop_macbook"}`,
		"moletom":      `{"part":"top","option":"top_moletom_gear"}`,
		"hoodie_trace": `{"part":"top","option":"top_hoodie_trace"}`,
	}
	for _, g := range raw.Gear {
		var id string
		_ = json.Unmarshal(g["id"], &id)
		look, has := g["look"]
		if w, ok := want[id]; ok != has || (has && string(look) != w) {
			t.Errorf("gear %s look = %s, want %q", id, look, w)
		}
	}
}

var hexColor = regexp.MustCompile(`^#[0-9a-f]{6}$`)

func validRamp(r []string) bool {
	if len(r) != 4 {
		return false
	}
	for _, h := range r {
		if !hexColor.MatchString(h) {
			return false
		}
	}
	return true
}

// Avatar C3: every reference inside avatar.json and from shop.json lands on a valid part/option.
func TestCatalog_AvatarReferencesCatalog(t *testing.T) {
	c, err := catalog.Load()
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for _, o := range c.Avatar.Options {
		if seen[o.ID] {
			t.Errorf("option id %s is repeated", o.ID)
		}
		seen[o.ID] = true
		part, ok := c.AvatarPart(o.Part)
		switch {
		case !ok:
			t.Errorf("option %s names unknown part %q", o.ID, o.Part)
		case part.Kind == "color" && (!validRamp(o.Ramp) || o.Layer != ""):
			t.Errorf("color option %s: ramp %v layer %q, want 4 #rrggbb and no layer", o.ID, o.Ramp, o.Layer)
		// A style without a layer draws nothing (SEM BARBA, SEM ÓCULOS); only the part's default may be one.
		case part.Kind == "style" && (o.Ramp != nil || (o.Layer == "" && c.Avatar.Defaults[o.Part] != o.ID)):
			t.Errorf("style option %s: layer %q ramp %v, want a layer (or be the part's default) and no ramp", o.ID, o.Layer, o.Ramp)
		case part.Kind != "color" && part.Kind != "style":
			t.Errorf("part %s kind = %q, want color or style", part.ID, part.Kind)
		}
		if o.GearOnly && o.Price != nil {
			t.Errorf("gear-only option %s has a price", o.ID)
		}
	}

	if len(c.Avatar.Defaults) != len(c.Avatar.Parts) {
		t.Errorf("defaults = %d, want one per part (%d)", len(c.Avatar.Defaults), len(c.Avatar.Parts))
	}
	for _, p := range c.Avatar.Parts {
		o, ok := c.AvatarOption(c.Avatar.Defaults[p.ID])
		if !ok || o.Part != p.ID || o.GearOnly || o.Price != nil {
			t.Errorf("default of %s = %q, want a free, pickable option of that part", p.ID, c.Avatar.Defaults[p.ID])
		}
		if _, ok := slot(c, p.GearSlot); p.GearSlot != "" && !ok {
			t.Errorf("part %s gearSlot %q is not a gear slot", p.ID, p.GearSlot)
		}
	}

	dressed := map[string]bool{}
	for _, g := range c.Gear {
		if g.Look == nil {
			continue
		}
		part, okPart := c.AvatarPart(g.Look.Part)
		o, okOpt := c.AvatarOption(g.Look.Option)
		if !okPart || part.Kind != "style" || part.GearSlot != g.Slot || !okOpt || o.Part != part.ID || !o.GearOnly {
			t.Errorf("gear %s (slot %s) look %+v, want a gear-only option of a style part on that slot", g.ID, g.Slot, *g.Look)
		}
		dressed[g.Look.Option] = true
	}
	for _, o := range c.Avatar.Options {
		if o.GearOnly && !dressed[o.ID] {
			t.Errorf("gear-only option %s is the look of no gear", o.ID)
		}
	}

	for _, s := range c.Skins {
		if s.Palette == nil {
			t.Errorf("skin %s has no palette, want {} at least", s.ID)
		}
		for partID, ramp := range s.Palette {
			if p, ok := c.AvatarPart(partID); !ok || p.Kind != "color" || !validRamp(ramp) {
				t.Errorf("skin %s palette %s = %v, want a color part with 4 #rrggbb", s.ID, partID, ramp)
			}
		}
	}
}

// Avatar C3: the renderer swaps colors hex to hex, so no two option ramps share a tone.
func TestCatalog_AvatarRampsAreDistinct(t *testing.T) {
	owner := map[string]string{}
	for _, o := range catalog.Default().Avatar.Options {
		for _, h := range o.Ramp {
			if prev, ok := owner[h]; ok {
				t.Errorf("%s is in both %s and %s", h, prev, o.ID)
			}
			owner[h] = o.ID
		}
	}
}

func slot(c *catalog.Catalog, id string) (catalog.GearSlot, bool) {
	for _, s := range c.GearSlots {
		if s.ID == id {
			return s, true
		}
	}
	return catalog.GearSlot{}, false
}
