package catalog_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"devserver/api/internal/apptest"
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
