package shop_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"devserver/api/internal/apptest"
	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
)

// give sets the stored quantity of each item, as "id", n pairs.
func (f *fixture) give(pairs ...any) {
	f.t.Helper()
	for i := 0; i < len(pairs); i += 2 {
		f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, $1, $2 FROM players
			ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity`, pairs[i], pairs[i+1])
	}
}

func (f *fixture) own(gear string) {
	f.t.Helper()
	f.sql(`INSERT INTO player_gear (player_id, gear_id) SELECT id, $1 FROM players`, gear)
}

// unchanged runs the request and requires the error and every stored row to stay as they were.
func (f *fixture) unchanged(path string, status int, code string) {
	f.t.Helper()
	before := f.snapshot()
	f.status(f.post(path), status, code)
	if after := f.snapshot(); after != before {
		f.t.Fatalf("%s changed the player:\n%s\n%s", path, before, after)
	}
}

// C4 (forge)
func TestBuyGear_NotForSale(t *testing.T) {
	f := newFixture(t)
	f.balance(9999, 9999)
	f.unchanged("/api/me/shop/gear/teclado_race", 422, "not_for_sale")
	f.balance(0, 50)
	if got := f.do("/api/me/shop/gear/cafe"); got.Coins != 0 || !f.me().has("cafe") {
		t.Fatalf("buying cafe with 50 coins: coins %d, gear %v", got.Coins, got.Gear)
	}
}

func (p playerJSON) has(gear string) bool {
	for _, g := range p.Gear {
		if g == gear {
			return true
		}
	}
	return false
}

// C5 (forge)
func TestForge_ItemRecipe(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 100)
	f.give("null_shard", 2, "sp_potion", 2)
	rec := f.post("/api/me/forge/forja_cache")
	body := apptest.Decode[map[string]any](t, rec)
	if _, ok := body["player"]; !ok || len(body) != 1 {
		t.Fatalf("body = %s, want {\"player\": {...}}", rec.Body.String())
	}
	got := f.ok(rec)
	for _, it := range got.Inventory {
		if it.Item == "null_shard" {
			t.Errorf("inventory still lists null_shard: %+v", got.Inventory)
		}
	}
	if got.qty("sp_potion") != 3 || got.Coins != 100 || got.Gems != 0 {
		t.Fatalf("sp_potion %d coins %d gems %d, want 3, 100, 0", got.qty("sp_potion"), got.Coins, got.Gems)
	}
	var n int
	if err := f.env.Pool.QueryRow(context.Background(),
		`SELECT coalesce(sum(quantity), 0) FROM player_items WHERE item_id = 'null_shard'`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("stored null_shard = %d (%v), want 0 or no row", n, err)
	}
}

// C6 (forge): every recipe, with exactly its ingredients and price.
func TestForge_EveryRecipe(t *testing.T) {
	cat := catalog.Default()
	if len(cat.Recipes) != 6 {
		t.Fatalf("recipes = %d, want 6", len(cat.Recipes))
	}
	for _, rc := range cat.Recipes {
		t.Run(rc.ID, func(t *testing.T) {
			f := newFixture(t)
			gems, coins := 7, 33
			if rc.Price != nil {
				gems, coins = 7, rc.Price.Amount
			}
			f.balance(gems, coins)
			f.sql(`DELETE FROM player_items`)
			for _, in := range rc.Ingredients {
				f.give(in.Item, in.Quantity)
			}
			got := f.do("/api/me/forge/" + rc.ID)
			for _, in := range rc.Ingredients {
				if q := got.qty(in.Item); q != 0 {
					t.Errorf("%s left = %d, want 0", in.Item, q)
				}
			}
			wantCoins := 33
			if rc.Price != nil {
				wantCoins = 0
			}
			if got.Coins != wantCoins || got.Gems != 7 {
				t.Errorf("coins %d gems %d, want %d and 7", got.Coins, got.Gems, wantCoins)
			}
			switch rc.Output.Kind {
			case "item":
				if q := got.qty(rc.Output.ID); q != 1 {
					t.Errorf("%s = %d, want 1", rc.Output.ID, q)
				}
			case "gear":
				g, _ := cat.GearItem(rc.Output.ID)
				if !got.has(g.ID) {
					t.Errorf("gear = %v, want %s", got.Gear, g.ID)
				}
				if e := got.Equipment[g.Slot]; e == nil || *e != g.ID {
					t.Errorf("equipment[%s] = %v, want %s", g.Slot, e, g.ID)
				}
			default:
				t.Fatalf("output kind %q", rc.Output.Kind)
			}
		})
	}
}

// C7 (forge)
func TestForge_GearOwnsEquips(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 1000)
	f.own("moletom")
	f.do("/api/me/gear/moletom/equip")
	before := f.me()
	f.give("wild_trace", 3, "corrupt_dep", 2)
	got := f.do("/api/me/forge/forja_hoodie")
	if !got.has("moletom") || !got.has("hoodie_trace") {
		t.Errorf("gear = %v, want moletom and hoodie_trace", got.Gear)
	}
	if e := got.Equipment["vestuario"]; e == nil || *e != "hoodie_trace" {
		t.Errorf("vestuario = %v, want hoodie_trace", e)
	}
	if got.HPMax != before.HPMax+21 || got.HP != before.HP+21 {
		t.Errorf("hp %d/%d, want %d/%d", got.HP, got.HPMax, before.HP+21, before.HPMax+21)
	}

	f.own("fone")
	f.do("/api/me/gear/fone/equip")
	before = f.me()
	f.give("race_core", 2, "memory_crystal", 1, "wild_trace", 3)
	got = f.do("/api/me/forge/forja_teclado")
	if e := got.Equipment["acessorio"]; e == nil || *e != "teclado_race" {
		t.Errorf("acessorio = %v, want teclado_race", e)
	}
	if got.HPMax != before.HPMax || got.HP != before.HP {
		t.Errorf("hp %d/%d changed from %d/%d", got.HP, got.HPMax, before.HP, before.HPMax)
	}

	f.give("log_essence", 3, "null_shard", 2)
	got = f.do("/api/me/forge/forja_caneca")
	if e := got.Equipment["bebida"]; e == nil || *e != "caneca_log" {
		t.Errorf("bebida = %v, want caneca_log", e)
	}
}

// C8 (forge)
func TestForge_Boundaries(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 0)
	f.give("null_shard", 1)
	f.unchanged("/api/me/forge/forja_cache", 409, "not_enough_materials")
	f.give("null_shard", 2)
	if got := f.do("/api/me/forge/forja_cache"); got.qty("null_shard") != 0 {
		t.Fatalf("null_shard = %d, want 0", got.qty("null_shard"))
	}

	f.give("corrupt_dep", 1, "wild_trace", 1)
	f.balance(0, 19)
	f.unchanged("/api/me/forge/forja_acelerador", 409, "not_enough_coins")
	f.balance(0, 20)
	if got := f.do("/api/me/forge/forja_acelerador"); got.Coins != 0 || got.qty("boost_deploy") != 1 {
		t.Fatalf("coins %d boost_deploy %d, want 0 and 1", got.Coins, got.qty("boost_deploy"))
	}
}

// C9 (forge)
func TestForge_UnknownRecipe(t *testing.T) {
	f := newFixture(t)
	f.give("null_shard", 2)
	for _, path := range []string{"/api/me/forge/nada", "/api/me/forge/sp_potion"} {
		before := f.snapshot()
		rec := f.post(path)
		f.status(rec, 422, "unknown_recipe")
		if msg := apptest.Decode[map[string]map[string]string](t, rec)["error"]["message"]; msg != "receita desconhecida" {
			t.Errorf("%s message = %q, want receita desconhecida", path, msg)
		}
		if after := f.snapshot(); after != before {
			t.Errorf("%s changed the player", path)
		}
	}
}

// C10 (forge)
func TestForge_AlreadyOwned(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 0)
	f.own("teclado_race")
	f.unchanged("/api/me/forge/forja_teclado", 409, "already_owned")
	f.balance(0, 150)
	f.give("race_core", 2, "memory_crystal", 1, "wild_trace", 3)
	f.unchanged("/api/me/forge/forja_teclado", 409, "already_owned")
}

// C11 (forge)
func TestForge_NotEnoughMaterials(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 0)
	f.give("race_core", 2, "memory_crystal", 0, "wild_trace", 3)
	before := f.snapshot()
	rec := f.post("/api/me/forge/forja_teclado")
	f.status(rec, 409, "not_enough_materials")
	if msg := apptest.Decode[map[string]map[string]string](t, rec)["error"]["message"]; msg != "materiais insuficientes" {
		t.Errorf("message = %q, want materiais insuficientes", msg)
	}
	if after := f.snapshot(); after != before {
		t.Fatalf("player changed:\n%s\n%s", before, after)
	}
	if got := f.me(); got.qty("race_core") != 2 || got.qty("wild_trace") != 3 || got.has("teclado_race") {
		t.Fatalf("race_core %d wild_trace %d gear %v", got.qty("race_core"), got.qty("wild_trace"), got.Gear)
	}
}

// C12 (forge)
func TestForge_NotEnoughBalance(t *testing.T) {
	env := apptest.NewWithCatalog(t, func(c *catalog.Catalog) {
		for i := range c.Recipes {
			if c.Recipes[i].ID == "forja_acelerador" {
				c.Recipes[i].Price = &catalog.Price{Currency: "gems", Amount: 5}
			}
		}
	})
	g := fixtureOn(t, env)
	g.give("corrupt_dep", 1, "wild_trace", 1)
	g.balance(4, 1000)
	g.unchanged("/api/me/forge/forja_acelerador", 409, "not_enough_gems")
	g.balance(5, 1000)
	if got := g.do("/api/me/forge/forja_acelerador"); got.Gems != 0 || got.Coins != 1000 {
		t.Fatalf("gems %d coins %d, want 0 and 1000", got.Gems, got.Coins)
	}

	f := newFixture(t)
	f.give("corrupt_dep", 1, "wild_trace", 1, "boost_deploy", 0)
	f.balance(1000, 19)
	f.unchanged("/api/me/forge/forja_acelerador", 409, "not_enough_coins")
	if got := f.me(); got.qty("corrupt_dep") != 1 || got.qty("wild_trace") != 1 || got.qty("boost_deploy") != 0 {
		t.Fatalf("inventory changed: %+v", got.Inventory)
	}
}

// C13 (forge): one case per adjacent pair of the validation order.
func TestForge_ValidationOrder(t *testing.T) {
	f := newFixture(t)
	nodev := f.env.Session(2, "nodev")
	for _, tc := range []struct {
		path, code string
		status     int
	}{
		{"/api/me/forge/nada", "unknown_recipe", 422},
		{"/api/me/forge/forja_cache", "player_not_found", 404},
	} {
		rec := f.env.Do(http.MethodPost, tc.path, nil, nodev)
		if rec.Code != tc.status || apptest.ErrorCode(t, rec) != tc.code {
			t.Errorf("no dev %s: %d %s, want %d %s", tc.path, rec.Code, rec.Body.String(), tc.status, tc.code)
		}
	}
	f.balance(0, 0)
	f.own("teclado_race")
	f.unchanged("/api/me/forge/forja_teclado", 409, "already_owned")
	f.unchanged("/api/me/forge/forja_hoodie", 409, "not_enough_materials")
}

// C14 (forge)
func TestForge_PlayerNotFound(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodPost, "/api/me/forge/forja_cache", nil, env.Session(3, "nodev"))
	if rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
		t.Fatalf("got %d %s, want 404 player_not_found", rec.Code, rec.Body.String())
	}
}

// C15 (forge)
func TestForgeRoutes_RequireSession(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodPost, "/api/me/forge/forja_cache", nil)
	if rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
		t.Fatalf("got %d %s, want 401 unauthenticated", rec.Code, rec.Body.String())
	}
}

// C16 (forge)
func TestForge_ConcurrentSerialize(t *testing.T) {
	f := newFixture(t)
	f.give("null_shard", 2, "sp_potion", 0)
	var wg sync.WaitGroup
	recs := make([]*httptest.ResponseRecorder, 2)
	for i := range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			recs[i] = f.post("/api/me/forge/forja_cache")
		}()
	}
	wg.Wait()
	oks, conflicts := 0, 0
	for _, rec := range recs {
		switch {
		case rec.Code == 200:
			oks++
		case rec.Code == 409 && apptest.ErrorCode(t, rec) == "not_enough_materials":
			conflicts++
		}
	}
	if oks != 1 || conflicts != 1 {
		t.Fatalf("got %d %s and %d %s, want one 200 and one 409 not_enough_materials",
			recs[0].Code, recs[0].Body.String(), recs[1].Code, recs[1].Body.String())
	}
	if got := f.me(); got.qty("sp_potion") != 1 || got.qty("null_shard") != 0 {
		t.Fatalf("sp_potion %d null_shard %d, want 1 and 0", got.qty("sp_potion"), got.qty("null_shard"))
	}
}

// C17 (forge)
func TestForge_Failure(t *testing.T) {
	f := newFixture(t)
	f.balance(0, 80)
	f.give("null_shard", 2, "wild_trace", 3, "corrupt_dep", 2)
	logged := func(rec *httptest.ResponseRecorder) {
		t.Helper()
		if rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
			t.Fatalf("got %d %s, want 500 internal", rec.Code, rec.Body.String())
		}
		id := rec.Header().Get(httpx.RequestIDHeader)
		if id == "" || !strings.Contains(f.env.Logs.String(), `"request_id":"`+id+`"`) {
			t.Fatalf("no log line with request id %q", id)
		}
	}

	before := f.snapshot()
	f.sql(`ALTER TABLE player_items RENAME TO player_items_gone`)
	logged(f.post("/api/me/forge/forja_cache"))
	f.sql(`ALTER TABLE player_items_gone RENAME TO player_items`)
	if after := f.snapshot(); after != before {
		t.Fatalf("player changed:\n%s\n%s", before, after)
	}

	f.sql(`ALTER TABLE player_gear ADD CONSTRAINT test_no_hoodie CHECK (gear_id <> 'hoodie_trace')`)
	logged(f.post("/api/me/forge/forja_hoodie"))
	f.sql(`ALTER TABLE player_gear DROP CONSTRAINT test_no_hoodie`)
	if after := f.snapshot(); after != before {
		t.Fatalf("player changed after a failed gear insert:\n%s\n%s", before, after)
	}
}

// C18 (forge)
func TestForge_ErrorCodes(t *testing.T) {
	f := newFixture(t)
	for _, tc := range []struct {
		path, code, message string
		status              int
	}{
		{"/api/me/forge/nada", "unknown_recipe", "receita desconhecida", 422},
		{"/api/me/forge/forja_cache", "not_enough_materials", "materiais insuficientes", 409},
	} {
		rec := f.post(tc.path)
		body := apptest.Decode[map[string]map[string]string](t, rec)
		if rec.Code != tc.status || len(body) != 1 || len(body["error"]) != 2 ||
			body["error"]["code"] != tc.code || body["error"]["message"] != tc.message {
			t.Errorf("%s: %d %s, want %d {\"error\":{\"code\":%q,\"message\":%q}}", tc.path, rec.Code, rec.Body.String(), tc.status, tc.code, tc.message)
		}
	}
}
