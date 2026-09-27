package office_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"devserver/api/internal/apptest"
	"devserver/api/internal/catalog"
	"devserver/api/internal/db"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
)

type lightJSON struct {
	Coins, Gems int
	Office      map[string][]*string
	OfficeLight string `json:"officeLight"`
}

func (f *fixture) setLight(body any) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, "/api/me/office/light", body, f.c)
}

func (f *fixture) applyTemplate(body any) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, "/api/me/office/template", body, f.c)
}

func (f *fixture) okLight(rec *httptest.ResponseRecorder) lightJSON {
	f.t.Helper()
	if rec.Code != http.StatusOK {
		f.t.Fatalf("status %d %s, want 200", rec.Code, rec.Body.String())
	}
	return apptest.Decode[struct {
		Player lightJSON `json:"player"`
	}](f.t, rec).Player
}

func (f *fixture) meLight() lightJSON {
	f.t.Helper()
	return f.okLight(f.env.Do(http.MethodGet, "/api/me", nil, f.c))
}

// rooms builds the expected room from "zone position furniture" entries.
func rooms(entries ...string) string {
	o := map[string][]*string{"parede": make([]*string, 8), "piso": make([]*string, 24)}
	for _, e := range entries {
		var zone, id string
		var pos int
		fmt.Sscanf(e, "%s %d %s", &zone, &pos, &id)
		o[zone][pos] = &id
	}
	return room(o)
}

const basicoRoom = "parede 2 quadro,parede 5 relogio,piso 0 planta,piso 2 mesa,piso 3 laptop,piso 7 luminaria,piso 11 tapete"

// C7
func TestCreatePlayer_OfficeLightDefault(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "user")
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"}, c)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	if got := apptest.Decode[struct{ Player lightJSON }](t, rec).Player.OfficeLight; got != "natural" {
		t.Errorf("created officeLight = %q, want natural", got)
	}
	f := &fixture{t, env, c}
	if got := f.meLight().OfficeLight; got != "natural" {
		t.Errorf("GET /api/me officeLight = %q, want natural", got)
	}
}

// C8
func TestLight_SetsAtComfort(t *testing.T) {
	f := newFixture(t)
	if got := f.okLight(f.setLight(map[string]string{"light": "natural"})).OfficeLight; got != "natural" {
		t.Errorf("natural at comfort 0 = %q", got)
	}
	f.place("parede", 0, "neon")
	f.place("piso", 0, "cadeira_gamer")
	f.place("piso", 1, "mesa")
	if got := f.okLight(f.setLight(map[string]string{"light": "quente"})).OfficeLight; got != "quente" {
		t.Errorf("quente at comfort 30 = %q, want quente", got)
	}
	if got := f.meLight().OfficeLight; got != "quente" {
		t.Errorf("GET /api/me officeLight = %q, want quente", got)
	}
}

// C9
func TestLight_Locked(t *testing.T) {
	f := newFixture(t)
	f.place("parede", 0, "janela")
	f.place("piso", 0, "setup2")
	before := f.snapshot()
	rec := f.setLight(map[string]string{"light": "quente"})
	f.status(rec, 409, "light_locked")
	if msg := apptest.Decode[map[string]map[string]string](t, rec)["error"]["message"]; msg != "falta conforto para essa luz" {
		t.Errorf("message = %q", msg)
	}
	f.unchanged(before)
}

// C10
func TestLight_Rejects(t *testing.T) {
	f := newFixture(t)
	before := f.snapshot()
	f.status(f.setLight(map[string]string{"light": "x"}), 422, "unknown_light")
	f.status(f.setLight("{"), 422, "invalid_body")
	f.unchanged(before)
}

// C11
func TestLight_ValidationOrder(t *testing.T) {
	f := newFixture(t)
	f.status(f.setLight("{"), 422, "invalid_body")
	f.status(f.setLight(map[string]string{"light": "x"}), 422, "unknown_light")
	f.status(f.setLight(map[string]string{"light": "neon"}), 409, "light_locked")
}

// C12
func TestLight_KeptWhenComfortDrops(t *testing.T) {
	f := newFixture(t)
	f.place("parede", 0, "neon")
	f.place("piso", 0, "cadeira_gamer")
	f.place("piso", 1, "mesa")
	f.okLight(f.setLight(map[string]string{"light": "quente"}))
	if got := f.okLight(f.remove("piso", 1)).OfficeLight; got != "quente" {
		t.Errorf("after removing the mesa officeLight = %q, want quente", got)
	}
}

// C13
func TestMe_OfficeLightOutsideCatalog(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET office_light = 'sol'`)
	if got := f.meLight().OfficeLight; got != "natural" {
		t.Errorf("officeLight = %q, want natural", got)
	}
}

// C14
func TestTables_OfficeLightColumn(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	var light string
	if err := f.env.Pool.QueryRow(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max,
		coins, gems, skill_points, region, skin) VALUES (2, 'NO_LIGHT', 'BACKEND', 1, 0, 500, 100, 100, 0, 0, 0, 'vila', 'default')
		RETURNING office_light`).Scan(&light); err != nil || light != "natural" {
		t.Errorf("default office_light = %q (%v), want natural", light, err)
	}
	if code := pgCode(f.env.Pool.Exec(ctx, `UPDATE players SET office_light = NULL`)); code != "23502" {
		t.Errorf("NULL office_light: %s, want 23502", code)
	}

	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		base = "postgres://devserver:devserver@localhost:5433/devserver_test?sslmode=disable"
	}
	admin, err := db.Open(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := fmt.Sprintf("m_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
	u, _ := url.Parse(base)
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	if err := db.MigrateTo(ctx, u.String(), 15); err != nil {
		t.Fatal(err)
	}
	pool, err := db.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if _, err := pool.Exec(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max,
		coins, gems, skill_points, region, skin) VALUES (7, 'OLD_DEV', 'BACKEND', 4, 0, 500, 100, 100, 0, 0, 0, 'vila', 'default')`); err != nil {
		t.Fatal(err)
	}
	if err := db.MigrateTo(ctx, u.String(), 16); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, `SELECT office_light FROM players WHERE github_user_id = 7`).Scan(&light); err != nil || light != "natural" {
		t.Errorf("existing player office_light = %q (%v), want natural", light, err)
	}
}

func pgCode(_ any, err error) string {
	if err == nil {
		return "<nil>"
	}
	var s string
	if pe, ok := err.(interface{ SQLState() string }); ok {
		s = pe.SQLState()
	} else {
		s = err.Error()
	}
	return s
}

// C19
func TestTemplate_InstallsAndPays(t *testing.T) {
	f := newFixture(t)
	f.balance(9999, 9999)
	got := f.okLight(f.applyTemplate(map[string]string{"template": "basico"}))
	if got.Coins != 9729 || got.Gems != 9999 {
		t.Errorf("basico: coins %d gems %d, want 9729 and 9999", got.Coins, got.Gems)
	}
	if g, w := room(got.Office), rooms(strings.Split(basicoRoom, ",")...); g != w {
		t.Errorf("basico room = %s, want %s", g, w)
	}

	f2 := &fixture{t, f.env, f.env.NewPlayer(2, "DEV_02", "BACKEND")}
	f2.sql(`UPDATE players SET coins = 9999, gems = 9999 WHERE github_user_id = 2`)
	got = f2.okLight(f2.applyTemplate(map[string]string{"template": "conforto"}))
	if got.Coins != 9619 || got.Gems != 9939 {
		t.Errorf("conforto: coins %d gems %d, want 9619 and 9939", got.Coins, got.Gems)
	}
	want := rooms("parede 1 prateleira", "parede 4 quadro", "parede 6 janela", "piso 0 estante", "piso 1 sofa", "piso 3 luminaria",
		"piso 5 mesa", "piso 7 planta", "piso 10 tapete", "piso 12 puff", "piso 17 almofada")
	if g := room(got.Office); g != want {
		t.Errorf("conforto room = %s, want %s", g, want)
	}
}

// C20
func TestTemplate_SkipsSamePiece(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 1000)
	f.place("piso", 2, "mesa")
	got := f.okLight(f.applyTemplate(map[string]string{"template": "basico"}))
	if got.Coins != 790 {
		t.Errorf("coins %d, want 790 (1000 - 210)", got.Coins)
	}
	want := rooms(strings.Split(basicoRoom, ",")...)
	if g := room(got.Office); g != want {
		t.Errorf("room = %s, want %s", g, want)
	}
	before := f.snapshot()
	f.okLight(f.applyTemplate(map[string]string{"template": "basico"}))
	f.unchanged(before)
}

// C21
func TestTemplate_CellOccupied(t *testing.T) {
	for _, occupant := range []string{"planta", "sofa_velho"} {
		t.Run(occupant, func(t *testing.T) {
			f := newFixture(t)
			f.balance(1000, 1000)
			f.place("piso", 2, occupant)
			before := f.snapshot()
			f.status(f.applyTemplate(map[string]string{"template": "basico"}), 409, "cell_occupied")
			f.unchanged(before)
		})
	}
}

// C22
func TestTemplate_BalanceBoundary(t *testing.T) {
	for _, tc := range []struct {
		template    string
		gems, coins int
		code        string
	}{
		{"basico", 0, 269, "not_enough_coins"},
		{"basico", 0, 270, ""},
		{"conforto", 59, 380, "not_enough_gems"},
		{"conforto", 60, 380, ""},
	} {
		t.Run(fmt.Sprintf("%s_%d_%d", tc.template, tc.coins, tc.gems), func(t *testing.T) {
			f := newFixture(t)
			f.balance(tc.gems, tc.coins)
			before := f.snapshot()
			rec := f.applyTemplate(map[string]string{"template": tc.template})
			if tc.code != "" {
				f.status(rec, 409, tc.code)
				f.unchanged(before)
				return
			}
			if got := f.okLight(rec); got.Coins != 0 || got.Gems != 0 {
				t.Errorf("coins %d gems %d, want 0 and 0", got.Coins, got.Gems)
			}
		})
	}
}

// C23
func TestTemplate_Rejects(t *testing.T) {
	f := newFixture(t)
	before := f.snapshot()
	f.status(f.applyTemplate(map[string]string{"template": "x"}), 422, "unknown_template")
	f.status(f.applyTemplate("{"), 422, "invalid_body")
	f.unchanged(before)
}

// C24
func TestTemplate_ValidationOrder(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 0)
	f.place("piso", 2, "planta")
	f.status(f.applyTemplate("{"), 422, "invalid_body")
	f.status(f.applyTemplate(map[string]string{"template": "x"}), 422, "unknown_template")
	f.status(f.applyTemplate(map[string]string{"template": "basico"}), 409, "cell_occupied")
	f.status(f.applyTemplate(map[string]string{"template": "conforto"}), 409, "not_enough_coins")
}

var keyartRoutes = []struct {
	path string
	body map[string]string
}{
	{"/api/me/office/light", map[string]string{"light": "natural"}},
	{"/api/me/office/template", map[string]string{"template": "basico"}},
}

// C30
func TestKeyartRoutes_PlayerNotFound(t *testing.T) {
	env := apptest.New(t)
	ghost := env.Session(99, "ghost")
	for _, r := range keyartRoutes {
		if rec := env.Do(http.MethodPost, r.path, r.body, ghost); rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
			t.Errorf("%s without a dev: %d %s, want 404 player_not_found", r.path, rec.Code, rec.Body.String())
		}
	}
}

// C31
func TestKeyartRoutes_LoadFailure(t *testing.T) {
	f := newFixture(t)
	before := f.snapshot()
	check := func(method, path string, body any, cause string) {
		t.Helper()
		rec := f.env.Do(method, path, body, f.c)
		if rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
			t.Errorf("%s %s: %d %s, want 500 internal", method, path, rec.Code, rec.Body.String())
			return
		}
		id := rec.Header().Get(httpx.RequestIDHeader)
		var line string
		for _, l := range strings.Split(f.env.Logs.String(), "\n") {
			if strings.Contains(l, `"request_id":"`+id+`"`) {
				line = l
			}
		}
		if id == "" || !strings.Contains(line, cause) {
			t.Errorf("%s %s: log line for request %q lacks %s: %s", method, path, id, cause, line)
		}
	}
	f.sql(`ALTER TABLE players RENAME COLUMN office_light TO office_light_gone`)
	check(http.MethodPost, "/api/me/office/light", map[string]string{"light": "natural"}, "office_light")
	check(http.MethodGet, "/api/me", nil, "office_light")
	f.sql(`ALTER TABLE players RENAME COLUMN office_light_gone TO office_light`)
	f.sql(`ALTER TABLE player_office RENAME TO player_office_gone`)
	check(http.MethodPost, "/api/me/office/template", map[string]string{"template": "basico"}, "player_office")
	f.sql(`ALTER TABLE player_office_gone RENAME TO player_office`)
	f.unchanged(before)
}

// C32
func TestKeyart_ErrorCodes(t *testing.T) {
	f := newFixture(t)
	for _, tc := range []struct {
		rec           *httptest.ResponseRecorder
		status        int
		code, message string
	}{
		{f.setLight(map[string]string{"light": "x"}), 422, "unknown_light", "luz desconhecida"},
		{f.setLight(map[string]string{"light": "neon"}), 409, "light_locked", "falta conforto para essa luz"},
		{f.applyTemplate(map[string]string{"template": "x"}), 422, "unknown_template", "layout desconhecido"},
	} {
		body := apptest.Decode[map[string]map[string]string](t, tc.rec)
		if tc.rec.Code != tc.status || len(body) != 1 || len(body["error"]) != 2 || body["error"]["code"] != tc.code || body["error"]["message"] != tc.message {
			t.Errorf("%s: %d %s, want %d {\"error\":{\"code\":%q,\"message\":%q}}", tc.code, tc.rec.Code, tc.rec.Body.String(), tc.status, tc.code, tc.message)
		}
	}
}

// C33
func TestTemplate_ConcurrentSerialize(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 270)
	var wg sync.WaitGroup
	recs := make([]*httptest.ResponseRecorder, 2)
	for i := range recs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			recs[i] = f.applyTemplate(map[string]string{"template": "basico"})
		}()
	}
	wg.Wait()
	for i, r := range recs {
		if r.Code != 200 {
			t.Errorf("apply %d: %d %s, want 200", i, r.Code, r.Body.String())
		}
	}
	got := f.meLight()
	if got.Coins != 0 {
		t.Errorf("coins %d, want 0", got.Coins)
	}
	if g, w := room(got.Office), rooms(strings.Split(basicoRoom, ",")...); g != w {
		t.Errorf("room = %s, want %s", g, w)
	}
}

// C36 (api half)
func TestTemplate_BonusThroughPlayerBonus(t *testing.T) {
	f := newFixture(t)
	f.balance(9999, 9999)
	f.okLight(f.applyTemplate(map[string]string{"template": "profissional"}))
	p, err := player.Get(context.Background(), f.env.Pool, 1)
	if err != nil {
		t.Fatal(err)
	}
	if got := player.Bonus(catalog.Default(), p, "deploy"); got != 16 {
		t.Errorf("deploy bonus = %d, want 16 (servidor 5 + rack 6 + setup2 5)", got)
	}
}
