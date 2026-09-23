package catalog_test

import (
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
