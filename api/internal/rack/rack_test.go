package rack_test

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
	Rack        []*string
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

func (f *fixture) coins(n int) {
	f.t.Helper()
	f.sql(`UPDATE players SET coins = $1`, n)
}

// place writes a component straight into a slot, bypassing price and the first-free rule.
func (f *fixture) place(slot int, component string) {
	f.t.Helper()
	f.sql(`INSERT INTO player_rack (player_id, slot, component_id) SELECT id, $1, $2 FROM players`, slot, component)
}

func (f *fixture) buy(component string) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, "/api/me/rack", map[string]string{"component": component}, f.c)
}

func (f *fixture) remove(slot string) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, "/api/me/rack/"+slot+"/remove", nil, f.c)
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

// snapshot is every row a rack action can change for the player.
func (f *fixture) snapshot() string {
	f.t.Helper()
	var s string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT
		(SELECT row_to_json(p)::text FROM players p) || '|' ||
		(SELECT coalesce(string_agg(slot || '=' || component_id, ',' ORDER BY slot), '') FROM player_rack) || '|' ||
		(SELECT coalesce(string_agg(type || '/' || coins, ',' ORDER BY type), '') FROM deploy_jobs)`).Scan(&s); err != nil {
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

// rack renders slots as "a,-,b" for comparison.
func rack(r []*string) string {
	ids := []string{}
	for _, c := range r {
		if c == nil {
			ids = append(ids, "-")
		} else {
			ids = append(ids, *c)
		}
	}
	return strings.Join(ids, ",")
}

// C2
func TestMe_RackField(t *testing.T) {
	f := newFixture(t)
	f.place(1, "gpu")
	f.place(5, "ram")
	rec := f.env.Do(http.MethodGet, "/api/me", nil, f.c)
	if !strings.Contains(rec.Body.String(), `"rack":[null,"gpu",null,null,null,"ram"]`) {
		t.Fatalf("body %s lacks rack [null,gpu,null,null,null,ram]", rec.Body.String())
	}
}

// C3
func TestCreatePlayer_RackDefaults(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "user")
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"}, c)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"rack":[null,null,null,null,null,null]`) {
		t.Fatalf("body %s lacks rack of 6 nulls", rec.Body.String())
	}
}

// C4
func TestBuy_PaysAndPlaces(t *testing.T) {
	f := newFixture(t)
	f.coins(100)
	got := f.ok(f.buy("ram"))
	if got.Coins != 40 || rack(got.Rack) != "ram,-,-,-,-,-" {
		t.Fatalf("coins %d rack %s, want 40 and ram,-,-,-,-,-", got.Coins, rack(got.Rack))
	}
	var slot int
	var id string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT slot, component_id FROM player_rack`).Scan(&slot, &id); err != nil || slot != 0 || id != "ram" {
		t.Errorf("player_rack row = %d %s (%v), want 0 ram", slot, id, err)
	}
}

// C5
func TestBuy_FirstFreeSlot(t *testing.T) {
	for _, tc := range []struct {
		name   string
		placed []int
		want   string
	}{
		{"after 0 and 1", []int{0, 1}, "gpu,gpu,cpu,-,-,-"},
		{"hole at 0 before 1", []int{1}, "cpu,gpu,-,-,-,-"},
		{"last slot", []int{0, 1, 2, 3, 4}, "gpu,gpu,gpu,gpu,gpu,cpu"},
	} {
		f := newFixture(t)
		f.coins(1000)
		for _, s := range tc.placed {
			f.place(s, "gpu")
		}
		if got := rack(f.ok(f.buy("cpu")).Rack); got != tc.want {
			t.Errorf("%s: rack %s, want %s", tc.name, got, tc.want)
		}
	}
}

// C6
func TestBuy_BalanceBoundary(t *testing.T) {
	f := newFixture(t)
	f.coins(59)
	before := f.snapshot()
	f.status(f.buy("ram"), 409, "not_enough_coins")
	f.unchanged(before)
	f.coins(60)
	if got := f.ok(f.buy("ram")); got.Coins != 0 || rack(got.Rack) != "ram,-,-,-,-,-" {
		t.Errorf("60 coins: coins %d rack %s, want 0 and ram", got.Coins, rack(got.Rack))
	}
}

// C7
func TestBuy_RackFull(t *testing.T) {
	f := newFixture(t)
	f.coins(1000)
	for s := range 6 {
		f.place(s, "ram")
	}
	before := f.snapshot()
	rec := f.buy("cpu")
	f.status(rec, 409, "rack_full")
	if msg := apptest.Decode[struct {
		Error struct{ Message string }
	}](t, rec).Error.Message; msg != "rack cheio. remova um componente antes" {
		t.Errorf("message %q", msg)
	}
	f.unchanged(before)

	g := newFixture(t)
	g.coins(1000)
	for s := range 5 {
		g.place(s, "ram")
	}
	if got := g.ok(g.buy("cpu")); rack(got.Rack) != "ram,ram,ram,ram,ram,cpu" || got.Coins != 920 {
		t.Errorf("5 taken: rack %s coins %d, want cpu in slot 5 and 920", rack(got.Rack), got.Coins)
	}
}

// C8
func TestBuy_UnknownComponent(t *testing.T) {
	f := newFixture(t)
	before := f.snapshot()
	f.status(f.buy("x"), 422, "unknown_component")
	f.status(f.env.Do(http.MethodPost, "/api/me/rack", map[string]string{}, f.c), 422, "unknown_component")
	f.unchanged(before)
}

// C9
func TestBuy_InvalidBody(t *testing.T) {
	f := newFixture(t)
	before := f.snapshot()
	for _, body := range []string{`{`, `{"component": 1}`} {
		req := httptest.NewRequest(http.MethodPost, "/api/me/rack", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(f.c)
		f.status(f.env.Serve(req), 422, "invalid_body")
	}
	f.unchanged(before)
}

// C10
func TestBuy_ValidationOrder(t *testing.T) {
	f := newFixture(t)
	for s := range 6 {
		f.place(s, "ram")
	}
	f.coins(0)
	req := httptest.NewRequest(http.MethodPost, "/api/me/rack", strings.NewReader(`{`))
	req.AddCookie(f.c)
	f.status(f.env.Serve(req), 422, "invalid_body")
	f.status(f.buy("x"), 422, "unknown_component")
	f.status(f.buy("cpu"), 409, "rack_full")
	f.sql(`DELETE FROM player_rack WHERE slot = 5`)
	f.status(f.buy("cpu"), 409, "not_enough_coins")
}

// C11
func TestBuy_Duplicates(t *testing.T) {
	f := newFixture(t)
	f.coins(120)
	f.ok(f.buy("ram"))
	if got := f.ok(f.buy("ram")); got.Coins != 0 || rack(got.Rack) != "ram,ram,-,-,-,-" {
		t.Fatalf("coins %d rack %s, want 0 and ram,ram", got.Coins, rack(got.Rack))
	}
}

// C12
func TestRemove_RefundsFullPrice(t *testing.T) {
	f := newFixture(t)
	f.coins(0)
	f.place(0, "ram")
	f.place(3, "gpu")
	got := f.ok(f.remove("3"))
	if got.Coins != 150 || rack(got.Rack) != "ram,-,-,-,-,-" {
		t.Fatalf("remove gpu: coins %d rack %s, want 150 and ram only", got.Coins, rack(got.Rack))
	}
	got = f.ok(f.remove("0"))
	if got.Coins != 210 || rack(got.Rack) != "-,-,-,-,-,-" {
		t.Fatalf("remove ram: coins %d rack %s, want 210 and empty", got.Coins, rack(got.Rack))
	}
	if got.Gems != 20 {
		t.Errorf("gems %d, want 20 unchanged", got.Gems)
	}
}

// C13
func TestRemove_EmptySlot(t *testing.T) {
	f := newFixture(t)
	f.place(0, "gpu")
	before := f.snapshot()
	f.ok(f.remove("4"))
	f.unchanged(before)

	f.coins(0)
	f.ok(f.remove("0"))
	if got := f.ok(f.remove("0")); got.Coins != 150 {
		t.Errorf("removed twice: coins %d, want 150 once", got.Coins)
	}
}

// C14
func TestRemove_SlotBounds(t *testing.T) {
	f := newFixture(t)
	for _, s := range []string{"-1", "6", "a"} {
		f.status(f.remove(s), 422, "unknown_slot")
	}
	for _, s := range []string{"0", "5"} {
		f.ok(f.remove(s))
	}
}

// C15
func TestBuy_ConcurrentSerialize(t *testing.T) {
	race := func(f *fixture) (oks int, codes []string) {
		var wg sync.WaitGroup
		recs := make([]*httptest.ResponseRecorder, 2)
		for i := range recs {
			wg.Add(1)
			go func() {
				defer wg.Done()
				recs[i] = f.buy("cpu")
			}()
		}
		wg.Wait()
		for _, r := range recs {
			if r.Code == 200 {
				oks++
			} else if r.Code == 409 {
				codes = append(codes, apptest.ErrorCode(t, r))
			}
		}
		return
	}

	f := newFixture(t)
	f.coins(1000)
	for s := range 5 {
		f.place(s, "ram")
	}
	if oks, codes := race(f); oks != 1 || len(codes) != 1 || codes[0] != "rack_full" {
		t.Errorf("one free slot: %d ok, 409 %v, want 1 ok and rack_full", oks, codes)
	}
	if got := f.me(); got.Coins != 920 || rack(got.Rack) != "ram,ram,ram,ram,ram,cpu" {
		t.Errorf("one free slot: coins %d rack %s, want 920 and cpu in slot 5", got.Coins, rack(got.Rack))
	}

	g := newFixture(t)
	g.coins(80)
	if oks, codes := race(g); oks != 1 || len(codes) != 1 || codes[0] != "not_enough_coins" {
		t.Errorf("coins for one: %d ok, 409 %v, want 1 ok and not_enough_coins", oks, codes)
	}
	if got := g.me(); got.Coins != 0 || rack(got.Rack) != "cpu,-,-,-,-,-" {
		t.Errorf("coins for one: coins %d rack %s, want 0 and one cpu", got.Coins, rack(got.Rack))
	}
}

var routes = []string{"/api/me/rack", "/api/me/rack/0/remove"}

// C16
func TestRackRoutes_RequireSession(t *testing.T) {
	env := apptest.New(t)
	for _, path := range routes {
		if rec := env.Do(http.MethodPost, path, map[string]string{"component": "cpu"}); rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
			t.Errorf("%s without session: %d %s", path, rec.Code, rec.Body.String())
		}
	}
}

// C17
func TestRack_LoadFailure(t *testing.T) {
	f := newFixture(t)
	f.coins(1000)
	f.place(0, "gpu")
	before := f.snapshot()
	f.sql(`ALTER TABLE player_rack RENAME TO player_rack_gone`)
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
		} else if !strings.Contains(line, "player_rack") {
			t.Errorf("%s %s: log line lacks the cause player_rack: %s", method, path, line)
		}
	}
	check(http.MethodGet, "/api/me", nil)
	check(http.MethodPost, "/api/me/deploys", map[string]any{"type": "backend", "level": 1})
	check(http.MethodPost, "/api/me/battle", nil)
	check(http.MethodPost, "/api/me/rack", map[string]string{"component": "cpu"})
	check(http.MethodPost, "/api/me/rack/0/remove", nil)
	f.sql(`ALTER TABLE player_rack_gone RENAME TO player_rack`)
	f.unchanged(before)
	if n := f.env.Count("battles"); n != 0 {
		t.Errorf("battles = %d, want 0", n)
	}
}

// C18
func TestTables_RackConstraints(t *testing.T) {
	f := newFixture(t)
	f.place(0, "gpu")
	code := func(q string) string {
		_, err := f.env.Pool.Exec(context.Background(), q)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return pgErr.Code
		}
		return fmt.Sprint(err)
	}
	for _, tc := range []struct{ name, q, want string }{
		{"second row in a slot", `INSERT INTO player_rack (player_id, slot, component_id) SELECT id, 0, 'cpu' FROM players`, "23505"},
		{"negative slot", `INSERT INTO player_rack (player_id, slot, component_id) SELECT id, -1, 'cpu' FROM players`, "23514"},
	} {
		if got := code(tc.q); got != tc.want {
			t.Errorf("%s: %s, want %s", tc.name, got, tc.want)
		}
	}
}

// C19
func TestRack_ErrorCodes(t *testing.T) {
	f := newFixture(t)
	type errBody struct {
		Error struct{ Code, Message string }
	}
	check := func(rec *httptest.ResponseRecorder, status int, code, message string) {
		t.Helper()
		got := apptest.Decode[errBody](t, rec).Error
		if rec.Code != status || got.Code != code || got.Message != message {
			t.Errorf("got %d %+v, want %d %s %q", rec.Code, got, status, code, message)
		}
	}
	check(f.buy("x"), 422, "unknown_component", "componente desconhecido")
	check(f.remove("9"), 422, "unknown_slot", "slot do rack desconhecido")
	for s := range 6 {
		f.place(s, "ram")
	}
	check(f.buy("cpu"), 409, "rack_full", "rack cheio. remova um componente antes")
}

// C20
func TestMigration_RackExistingPlayers(t *testing.T) {
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

	if err := db.MigrateTo(ctx, u.String(), 6); err != nil {
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
	if err := db.MigrateTo(ctx, u.String(), 7); err != nil {
		t.Fatal(err)
	}
	var n int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM player_rack").Scan(&n); err != nil || n != 0 {
		t.Errorf("player_rack: %d rows (%v), want an empty table", n, err)
	}
	// The router reads every later table too, as the binary does after migrating at boot.
	if err := db.Migrate(ctx, u.String()); err != nil {
		t.Fatal(err)
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
	if !strings.Contains(rec.Body.String(), `"rack":[null,null,null,null,null,null]`) {
		t.Errorf("body %s lacks rack of 6 nulls", rec.Body.String())
	}
}

// C26
func TestUnknownComponent_OccupiesAndRemoves(t *testing.T) {
	f := newFixture(t)
	f.coins(1000)
	f.place(0, "quantum")
	if got := rack(f.ok(f.buy("cpu")).Rack); got != "quantum,cpu,-,-,-,-" {
		t.Errorf("buy beside quantum: rack %s, want cpu in slot 1", got)
	}
	for s := 2; s < 6; s++ {
		f.place(s, "ram")
	}
	f.status(f.buy("cpu"), 409, "rack_full")
	got := f.ok(f.remove("0"))
	if got.Coins != 920 || got.Gems != 20 || got.Rack[0] != nil {
		t.Errorf("remove quantum: coins %d gems %d slot %v, want 920, 20 and null", got.Coins, got.Gems, got.Rack[0])
	}
}

// C27
func TestMe_SkipsSlotsOutsideCatalog(t *testing.T) {
	f := newFixture(t)
	f.place(0, "gpu")
	f.place(6, "cpu")
	f.place(9, "ram")
	if got := rack(f.me().Rack); got != "gpu,-,-,-,-,-" {
		t.Fatalf("rack %s, want gpu,-,-,-,-,-", got)
	}
	// Bonus reads the same loaded rack: only the gpu counts (POWER 60, +4% dano).
	f.sql(`UPDATE players SET region = 'vila'`)
	// starting in vila draws one of its two enemies (AD-017); the damage draws come after it
	f.ok(f.env.Do(http.MethodPost, "/api/me/battle", nil, f.c))
	f.env.Rand.Push(6, 0)
	rec := f.env.Do(http.MethodPost, "/api/me/battle/commands", map[string]string{"command": "fix"}, f.c)
	ev := apptest.Decode[struct {
		Events []struct {
			Type   string
			Amount int
		}
	}](t, rec).Events
	if len(ev) == 0 || ev[0].Type != "damage" || ev[0].Amount != 21 {
		t.Errorf("fix with gpu only: events %+v, want damage 21", ev)
	}
}

// C45
func TestRackRoutes_NoPlayer(t *testing.T) {
	env := apptest.New(t)
	ghost := env.Session(9, "ghost")
	for _, path := range routes {
		if rec := env.Do(http.MethodPost, path, map[string]string{"component": "cpu"}, ghost); rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
			t.Errorf("%s without a dev: %d %s, want 404 player_not_found", path, rec.Code, rec.Body.String())
		}
	}
	if n := env.Count("player_rack"); n != 0 {
		t.Errorf("player_rack = %d rows, want 0", n)
	}
}

// C46
func TestRack_GemsPricedComponent(t *testing.T) {
	env := apptest.NewWithCatalog(t, func(c *catalog.Catalog) {
		for i := range c.Rack.Components {
			if c.Rack.Components[i].ID == "gpu" {
				c.Rack.Components[i].Price = catalog.Price{Currency: "gems", Amount: 150}
			}
		}
	})
	f := &fixture{t, env, env.NewPlayer(1, "DEV_01", "BACKEND")}
	f.sql(`UPDATE players SET gems = 149, coins = 0`)
	before := f.snapshot()
	f.status(f.buy("gpu"), 409, "not_enough_gems")
	f.unchanged(before)

	f.sql(`UPDATE players SET gems = 150`)
	got := f.ok(f.buy("gpu"))
	if got.Gems != 0 || got.Coins != 0 || rack(got.Rack) != "gpu,-,-,-,-,-" {
		t.Fatalf("buy: gems %d coins %d rack %s, want 0, 0 and gpu in slot 0", got.Gems, got.Coins, rack(got.Rack))
	}
	got = f.ok(f.remove("0"))
	if got.Gems != 150 || got.Coins != 0 || got.Rack[0] != nil {
		t.Errorf("remove: gems %d coins %d slot %v, want 150, 0 and null", got.Gems, got.Coins, got.Rack[0])
	}
}
