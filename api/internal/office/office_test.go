package office_test

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"devserver/api/internal/app"
	"devserver/api/internal/apptest"
	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/db"
	"devserver/api/internal/httpx"
)

type playerJSON struct {
	Coins, Gems int
	Office      map[string][]*string
}

type fixture struct {
	t   *testing.T
	env *apptest.Env
	c   *http.Cookie
}

func newFixture(t *testing.T) *fixture {
	env := apptest.New(t)
	return &fixture{t, env, env.NewPlayer(1, "DEV_01", "BACKEND")}
}

func (f *fixture) sql(q string, args ...any) {
	f.t.Helper()
	if _, err := f.env.Pool.Exec(context.Background(), q, args...); err != nil {
		f.t.Fatalf("%s: %v", q, err)
	}
}

func (f *fixture) balance(gems, coins int) {
	f.t.Helper()
	f.sql(`UPDATE players SET gems = $1, coins = $2`, gems, coins)
}

// place writes furniture straight into the room, bypassing price and zone rules.
func (f *fixture) place(zone string, position int, furniture string) {
	f.t.Helper()
	f.sql(`INSERT INTO player_office (player_id, zone, position, furniture_id) SELECT id, $1, $2, $3 FROM players`,
		zone, position, furniture)
}

func (f *fixture) install(zone string, position int, furniture string) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, fmt.Sprintf("/api/me/office/%s/%d", zone, position), map[string]string{"furniture": furniture}, f.c)
}

func (f *fixture) remove(zone string, position int) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, fmt.Sprintf("/api/me/office/%s/%d/remove", zone, position), nil, f.c)
}

func (f *fixture) ok(rec *httptest.ResponseRecorder) playerJSON {
	f.t.Helper()
	if rec.Code != http.StatusOK {
		f.t.Fatalf("status %d %s, want 200", rec.Code, rec.Body.String())
	}
	return apptest.Decode[struct {
		Player playerJSON `json:"player"`
	}](f.t, rec).Player
}

func (f *fixture) me() playerJSON {
	f.t.Helper()
	return f.ok(f.env.Do(http.MethodGet, "/api/me", nil, f.c))
}

func (f *fixture) status(rec *httptest.ResponseRecorder, status int, code string) {
	f.t.Helper()
	if rec.Code != status || apptest.ErrorCode(f.t, rec) != code {
		f.t.Fatalf("got %d %s, want %d %s", rec.Code, rec.Body.String(), status, code)
	}
}

// snapshot is every row an office action can change for the player.
func (f *fixture) snapshot() string {
	f.t.Helper()
	var s string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT
		(SELECT row_to_json(p)::text FROM players p) || '|' ||
		(SELECT coalesce(string_agg(zone || position || '=' || furniture_id, ',' ORDER BY zone, position), '') FROM player_office) || '|' ||
		(SELECT coalesce(string_agg(type || '@' || ends_at::text || '/' || xp, ',' ORDER BY type), '') FROM deploy_jobs)`).Scan(&s); err != nil {
		f.t.Fatal(err)
	}
	return s
}

func (f *fixture) unchanged(before string) {
	f.t.Helper()
	if after := f.snapshot(); after != before {
		f.t.Fatalf("player changed:\n%s\n%s", before, after)
	}
}

// room renders an office as "zone: a,-,b" for failure messages and comparison.
func room(o map[string][]*string) string {
	parts := []string{}
	for _, z := range []string{"parede", "piso"} {
		cells, ok := o[z]
		if !ok {
			parts = append(parts, z+": <missing>")
			continue
		}
		ids := []string{}
		for _, c := range cells {
			if c == nil {
				ids = append(ids, "-")
			} else {
				ids = append(ids, *c)
			}
		}
		parts = append(parts, z+": "+strings.Join(ids, ","))
	}
	return fmt.Sprintf("%s (%d keys)", strings.Join(parts, " | "), len(o))
}

// want builds the rendering of a room from the placed cells ("parede/1=neon").
func want(placed ...string) string {
	o := map[string][]*string{"parede": make([]*string, 8), "piso": make([]*string, 24)}
	for _, p := range placed {
		var zone, id string
		var pos int
		if _, err := fmt.Sscanf(strings.NewReplacer("/", " ", "=", " ").Replace(p), "%s %d %s", &zone, &pos, &id); err != nil {
			panic(err)
		}
		o[zone][pos] = &id
	}
	return room(o)
}

func (f *fixture) wantRoom(got map[string][]*string, placed ...string) {
	f.t.Helper()
	if g, w := room(got), want(placed...); g != w {
		f.t.Fatalf("office = %s\nwant     %s", g, w)
	}
}

// C2
func TestMe_OfficeField(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	f.place("parede", 1, "neon")
	rec := f.env.Do(http.MethodGet, "/api/me", nil, f.c)
	body := apptest.Decode[struct {
		Player struct {
			Office map[string][]*string `json:"office"`
		} `json:"player"`
	}](t, rec)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	parede, piso := body.Player.Office["parede"], body.Player.Office["piso"]
	if len(body.Player.Office) != 2 || len(parede) != 8 || len(piso) != 24 {
		t.Fatalf("office = %s, want parede 8 and piso 24", room(body.Player.Office))
	}
	f.wantRoom(body.Player.Office, "parede/1=neon", "piso/0=mesa")
	if !strings.Contains(rec.Body.String(), `"parede":[null,"neon",null,null,null,null,null,null]`) {
		t.Errorf("body %s lacks the literal parede list", rec.Body.String())
	}
}

// C3
func TestCreatePlayer_OfficeDefaults(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "user")
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND"}, c)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[struct {
		Player playerJSON `json:"player"`
	}](t, rec).Player
	if g, w := room(got.Office), want(); g != w {
		t.Fatalf("office = %s, want %s", g, w)
	}
	nulls := func(n int) string { return "[" + strings.TrimSuffix(strings.Repeat("null,", n), ",") + "]" }
	if !strings.Contains(rec.Body.String(), `"parede":`+nulls(8)) || !strings.Contains(rec.Body.String(), `"piso":`+nulls(24)) {
		t.Errorf("body %s lacks 8 and 24 nulls", rec.Body.String())
	}
}

// C4
func TestInstall_PaysAndPlaces(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 100)
	got := f.ok(f.install("piso", 0, "mesa"))
	if got.Coins != 40 {
		t.Errorf("coins = %d, want 40", got.Coins)
	}
	f.wantRoom(got.Office, "piso/0=mesa")

	f.balance(40, 0)
	got = f.ok(f.install("piso", 23, "cadeira_gamer"))
	if got.Gems != 0 {
		t.Errorf("gems = %d, want 0", got.Gems)
	}
	f.wantRoom(got.Office, "piso/0=mesa", "piso/23=cadeira_gamer")

	f.balance(35, 0)
	got = f.ok(f.install("parede", 7, "neon"))
	if got.Gems != 0 {
		t.Errorf("gems = %d, want 0", got.Gems)
	}
	f.wantRoom(got.Office, "parede/7=neon", "piso/0=mesa", "piso/23=cadeira_gamer")
	f.wantRoom(f.me().Office, "parede/7=neon", "piso/0=mesa", "piso/23=cadeira_gamer")
}

// C5
func TestInstall_BalanceBoundary(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 59)
	before := f.snapshot()
	f.status(f.install("piso", 0, "mesa"), 409, "not_enough_coins")
	f.unchanged(before)
	f.balance(1000, 60)
	if got := f.ok(f.install("piso", 0, "mesa")); got.Coins != 0 {
		t.Errorf("coins = %d, want 0", got.Coins)
	}

	f.balance(39, 1000)
	before = f.snapshot()
	f.status(f.install("piso", 1, "cadeira_gamer"), 409, "not_enough_gems")
	f.unchanged(before)
	f.balance(40, 1000)
	if got := f.ok(f.install("piso", 1, "cadeira_gamer")); got.Gems != 0 {
		t.Errorf("gems = %d, want 0", got.Gems)
	}
}

// C6
func TestInstall_CellOccupied(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	f.balance(0, 1000)
	before := f.snapshot()
	f.status(f.install("piso", 0, "planta"), 409, "cell_occupied")
	f.unchanged(before)
	got := f.me()
	f.wantRoom(got.Office, "piso/0=mesa")
	if got.Coins != 1000 {
		t.Errorf("coins = %d, want 1000", got.Coins)
	}
}

// C7
func TestInstall_WrongZone(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	before := f.snapshot()
	for _, tc := range []struct {
		zone, furniture, message string
	}{
		{"piso", "neon", "esse móvel vai na parede"},
		{"parede", "mesa", "esse móvel vai no piso"},
	} {
		rec := f.install(tc.zone, 0, tc.furniture)
		body := apptest.Decode[map[string]map[string]string](t, rec)
		if rec.Code != 422 || body["error"]["code"] != "wrong_zone" || body["error"]["message"] != tc.message {
			t.Errorf("%s in %s: %d %s, want 422 wrong_zone %q", tc.furniture, tc.zone, rec.Code, rec.Body.String(), tc.message)
		}
	}
	f.unchanged(before)
}

// C8
func TestInstall_UnknownFurniture(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	before := f.snapshot()
	f.status(f.install("piso", 0, "x"), 422, "unknown_furniture")
	f.status(f.env.Do(http.MethodPost, "/api/me/office/piso/0", map[string]string{}, f.c), 422, "unknown_furniture")
	f.unchanged(before)
}

// C9
func TestOfficeCell_Bounds(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	before := f.snapshot()
	for _, cell := range []string{"x/0", "parede/-1", "parede/8", "piso/24", "piso/a"} {
		rec := f.env.Do(http.MethodPost, "/api/me/office/"+cell, map[string]string{"furniture": "poster"}, f.c)
		if rec.Code != 422 || apptest.ErrorCode(t, rec) != "unknown_cell" {
			t.Errorf("install %s: %d %s, want 422 unknown_cell", cell, rec.Code, rec.Body.String())
		}
		rec = f.env.Do(http.MethodPost, "/api/me/office/"+cell+"/remove", nil, f.c)
		if rec.Code != 422 || apptest.ErrorCode(t, rec) != "unknown_cell" {
			t.Errorf("remove %s: %d %s, want 422 unknown_cell", cell, rec.Code, rec.Body.String())
		}
	}
	f.unchanged(before)

	got := f.ok(f.install("parede", 7, "poster"))
	f.wantRoom(got.Office, "parede/7=poster")
	got = f.ok(f.install("piso", 23, "planta"))
	f.wantRoom(got.Office, "parede/7=poster", "piso/23=planta")
	got = f.ok(f.remove("parede", 7))
	f.wantRoom(got.Office, "piso/23=planta")
	got = f.ok(f.remove("piso", 23))
	f.wantRoom(got.Office)
}

// C10
func TestInstall_InvalidBody(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	before := f.snapshot()
	f.status(f.env.Do(http.MethodPost, "/api/me/office/piso/0", "{", f.c), 422, "invalid_body")
	f.status(f.env.Do(http.MethodPost, "/api/me/office/piso/0", `{"furniture": 1}`, f.c), 422, "invalid_body")
	f.unchanged(before)
}

// C11
func TestInstall_Duplicates(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 120)
	f.ok(f.install("piso", 0, "mesa"))
	got := f.ok(f.install("piso", 1, "mesa"))
	if got.Coins != 0 {
		t.Errorf("coins = %d, want 0", got.Coins)
	}
	f.wantRoom(got.Office, "piso/0=mesa", "piso/1=mesa")
}

// C12
func TestRemove_RefundsHalf(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	f.place("piso", 1, "cafeteira")
	f.place("piso", 2, "cadeira_gamer")
	f.place("parede", 3, "janela")
	f.balance(0, 0)
	for _, tc := range []struct {
		zone        string
		position    int
		gems, coins int
		left        []string
	}{
		{"piso", 0, 0, 30, []string{"piso/1=cafeteira", "piso/2=cadeira_gamer", "parede/3=janela"}},
		{"piso", 1, 0, 57, []string{"piso/2=cadeira_gamer", "parede/3=janela"}},
		{"piso", 2, 20, 57, []string{"parede/3=janela"}},
		{"parede", 3, 50, 57, nil},
	} {
		got := f.ok(f.remove(tc.zone, tc.position))
		if got.Gems != tc.gems || got.Coins != tc.coins {
			t.Errorf("remove %s/%d: gems %d coins %d, want %d and %d", tc.zone, tc.position, got.Gems, got.Coins, tc.gems, tc.coins)
		}
		f.wantRoom(got.Office, tc.left...)
	}
}

// C13
func TestRemove_EmptyCell(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	f.balance(0, 0)
	before := f.snapshot()
	got := f.ok(f.remove("piso", 5))
	f.wantRoom(got.Office, "piso/0=mesa")
	f.unchanged(before)

	f.ok(f.remove("piso", 0))
	got = f.ok(f.remove("piso", 0))
	if got.Coins != 30 {
		t.Errorf("coins after removing twice = %d, want 30", got.Coins)
	}
}

// C14
func TestInstall_ValidationOrder(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	f.balance(1000, 0)
	f.status(f.env.Do(http.MethodPost, "/api/me/office/x/0", map[string]string{"furniture": "x"}, f.c), 422, "unknown_cell")
	f.status(f.install("piso", 0, "x"), 422, "unknown_furniture")
	f.status(f.install("piso", 0, "neon"), 422, "wrong_zone")
	f.status(f.install("piso", 0, "planta"), 409, "cell_occupied")
}

var routes = []string{"/api/me/office/piso/0", "/api/me/office/piso/0/remove"}

// C15
func TestOfficeRoutes_RequireSession(t *testing.T) {
	env := apptest.New(t)
	for _, path := range routes {
		if rec := env.Do(http.MethodPost, path, map[string]string{"furniture": "planta"}); rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
			t.Errorf("%s without session: %d %s", path, rec.Code, rec.Body.String())
		}
	}
}

// C16
func TestOffice_LoadFailure(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	f.place("piso", 0, "mesa")
	before := f.snapshot()
	f.sql(`ALTER TABLE player_office RENAME TO player_office_gone`)
	check := func(method, path string, body any) {
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
		if id == "" || line == "" {
			t.Errorf("%s %s: no log line with request id %q", method, path, id)
		} else if !strings.Contains(line, "player_office") {
			t.Errorf("%s %s: log line lacks the cause player_office: %s", method, path, line)
		}
	}
	check(http.MethodGet, "/api/me", nil)
	check(http.MethodPost, "/api/me/deploys", map[string]any{"type": "backend", "level": 1})
	check(http.MethodPost, "/api/me/office/piso/1", map[string]string{"furniture": "planta"})
	check(http.MethodPost, "/api/me/office/piso/0/remove", nil)
	f.sql(`ALTER TABLE player_office_gone RENAME TO player_office`)
	f.unchanged(before)
}

// C17
func TestInstall_ConcurrentSerialize(t *testing.T) {
	race := func(f *fixture, cells ...int) []*httptest.ResponseRecorder {
		var wg sync.WaitGroup
		recs := make([]*httptest.ResponseRecorder, len(cells))
		for i, pos := range cells {
			wg.Add(1)
			go func() {
				defer wg.Done()
				furniture := "mesa"
				if cells[0] == cells[1] {
					furniture = "planta"
				}
				recs[i] = f.install("piso", pos, furniture)
			}()
		}
		wg.Wait()
		return recs
	}
	count := func(recs []*httptest.ResponseRecorder, conflict string) (oks, conflicts int) {
		for _, r := range recs {
			switch {
			case r.Code == 200:
				oks++
			case r.Code == 409 && apptest.ErrorCode(t, r) == conflict:
				conflicts++
			}
		}
		return
	}

	f := newFixture(t)
	f.balance(0, 60)
	if oks, conflicts := count(race(f, 0, 1), "not_enough_coins"); oks != 1 || conflicts != 1 {
		t.Errorf("two cells: %d ok %d not_enough_coins, want 1 and 1", oks, conflicts)
	}
	got := f.me()
	placed := 0
	for _, c := range got.Office["piso"] {
		if c != nil {
			placed++
		}
	}
	if got.Coins != 0 || placed != 1 {
		t.Errorf("two cells: coins %d placed %d, want 0 and 1", got.Coins, placed)
	}

	f.balance(0, 1000)
	if oks, conflicts := count(race(f, 2, 2), "cell_occupied"); oks != 1 || conflicts != 1 {
		t.Errorf("same cell: %d ok %d cell_occupied, want 1 and 1", oks, conflicts)
	}
	if got := f.me(); got.Coins != 975 || got.Office["piso"][2] == nil || *got.Office["piso"][2] != "planta" {
		t.Errorf("same cell: coins %d cell %v, want 975 and planta", got.Coins, got.Office["piso"][2])
	}
}

// C18
func TestTables_OfficeConstraints(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	code := func(q string) string {
		_, err := f.env.Pool.Exec(context.Background(), q)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return pgErr.Code
		}
		return fmt.Sprint(err)
	}
	for _, tc := range []struct{ name, q, want string }{
		{"second row in a cell", `INSERT INTO player_office (player_id, zone, position, furniture_id) SELECT id, 'piso', 0, 'planta' FROM players`, "23505"},
		{"negative position", `INSERT INTO player_office (player_id, zone, position, furniture_id) SELECT id, 'piso', -1, 'planta' FROM players`, "23514"},
	} {
		if got := code(tc.q); got != tc.want {
			t.Errorf("%s: %s, want %s", tc.name, got, tc.want)
		}
	}
}

// C19
func TestOffice_ErrorCodes(t *testing.T) {
	f := newFixture(t)
	f.place("piso", 0, "mesa")
	f.balance(1000, 1000)
	for _, tc := range []struct {
		rec  *httptest.ResponseRecorder
		code string
	}{
		{f.install("x", 0, "planta"), "unknown_cell"},
		{f.install("piso", 1, "x"), "unknown_furniture"},
		{f.install("piso", 1, "neon"), "wrong_zone"},
		{f.install("piso", 0, "planta"), "cell_occupied"},
	} {
		body := apptest.Decode[map[string]map[string]string](t, tc.rec)
		if len(body) != 1 || len(body["error"]) != 2 || body["error"]["code"] != tc.code || body["error"]["message"] == "" {
			t.Errorf("%s: %s, want {\"error\":{\"code\":%q,\"message\":\"...\"}}", tc.code, tc.rec.Body.String(), tc.code)
		}
		if tc.rec.Code < 400 {
			t.Errorf("%s: status %d, want an error status", tc.code, tc.rec.Code)
		}
	}
}

// C20
func TestMigration_OfficeExistingPlayers(t *testing.T) {
	ctx := context.Background()
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

	if err := db.MigrateTo(ctx, u.String(), 5); err != nil {
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
	if err := db.MigrateTo(ctx, u.String(), 6); err != nil {
		t.Fatal(err)
	}
	var n int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM player_office").Scan(&n); err != nil || n != 0 {
		t.Errorf("player_office: %d rows (%v), want an empty table", n, err)
	}

	cat, err := catalog.Load()
	if err != nil {
		t.Fatal(err)
	}
	router := app.NewRouter(app.Deps{Pool: pool, Catalog: cat, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})
	token, err := auth.Sessions{Pool: pool}.Create(ctx, auth.Identity{GithubUserID: 7, GithubLogin: "old"})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	req.AddCookie(&http.Cookie{Name: auth.SessionCookie, Value: token})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/me: %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[struct {
		Player playerJSON `json:"player"`
	}](t, rec).Player
	if g, w := room(got.Office), want(); g != w {
		t.Errorf("office = %s, want %s", g, w)
	}
}
