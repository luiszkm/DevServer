package catalog_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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
	}
	if len(b.Items) != 8 {
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
		r.Victory.Gems != 1 || r.DropChance != 65 || r.PotionChance != 30 || r.Potion != "sp_potion" {
		t.Errorf("combat rules = %+v", r)
	}
}
