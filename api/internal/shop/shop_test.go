package shop_test

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
	"reflect"
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
	HP, HPMax, Coins, Gems, Level int
	Skin                          string
	Gear                          []string
	Equipment                     map[string]*string
	Skins                         []string
	Inventory                     []struct {
		Item     string `json:"item"`
		Quantity int    `json:"quantity"`
	}
}

func (p playerJSON) qty(item string) int {
	for _, it := range p.Inventory {
		if it.Item == item {
			return it.Quantity
		}
	}
	return 0
}

type fixture struct {
	t   *testing.T
	env *apptest.Env
	c   *http.Cookie
}

func newFixture(t *testing.T) *fixture { return fixtureOn(t, apptest.New(t)) }

func fixtureOn(t *testing.T, env *apptest.Env) *fixture {
	return &fixture{t, env, env.NewPlayer(1, "DEV_01", "BACKEND")}
}

func (f *fixture) sql(q string, args ...any) {
	f.t.Helper()
	if _, err := f.env.Pool.Exec(context.Background(), q, args...); err != nil {
		f.t.Fatalf("%s: %v", q, err)
	}
}

func (f *fixture) post(path string) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, path, nil, f.c)
}

// ok requires a 200 {"player": {...}} and returns the player.
func (f *fixture) ok(rec *httptest.ResponseRecorder) playerJSON {
	f.t.Helper()
	if rec.Code != http.StatusOK {
		f.t.Fatalf("status %d %s, want 200", rec.Code, rec.Body.String())
	}
	return apptest.Decode[struct {
		Player playerJSON `json:"player"`
	}](f.t, rec).Player
}

func (f *fixture) do(path string) playerJSON {
	f.t.Helper()
	return f.ok(f.post(path))
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

// snapshot is every row this feature can change for the player.
func (f *fixture) snapshot() string {
	f.t.Helper()
	var s string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT
		(SELECT row_to_json(p)::text FROM players p) || '|' ||
		(SELECT coalesce(string_agg(gear_id, ',' ORDER BY gear_id), '') FROM player_gear) || '|' ||
		(SELECT coalesce(string_agg(slot || '=' || gear_id, ',' ORDER BY slot), '') FROM player_equipment) || '|' ||
		(SELECT coalesce(string_agg(skin_id, ',' ORDER BY skin_id), '') FROM player_skins) || '|' ||
		(SELECT coalesce(string_agg(item_id || '=' || quantity, ',' ORDER BY item_id), '') FROM player_items) || '|' ||
		(SELECT coalesce(string_agg(type || '@' || ends_at::text, ',' ORDER BY type), '') FROM deploy_jobs)`).Scan(&s); err != nil {
		f.t.Fatal(err)
	}
	return s
}

func (f *fixture) balance(gems, coins int) {
	f.t.Helper()
	f.sql(`UPDATE players SET gems = $1, coins = $2`, gems, coins)
}

func ptr(s string) *string { return &s }

func equipment(setup, bebida, vestuario, acessorio string) map[string]*string {
	m := map[string]*string{}
	for k, v := range map[string]string{"setup": setup, "bebida": bebida, "vestuario": vestuario, "acessorio": acessorio} {
		if v == "" {
			m[k] = nil
		} else {
			m[k] = ptr(v)
		}
	}
	return m
}

func show(m map[string]*string) string {
	parts := []string{}
	for _, k := range []string{"setup", "bebida", "vestuario", "acessorio"} {
		v, ok := m[k]
		switch {
		case !ok:
			parts = append(parts, k+"=<missing>")
		case v == nil:
			parts = append(parts, k+"=null")
		default:
			parts = append(parts, k+"="+*v)
		}
	}
	return fmt.Sprintf("%s (%d keys)", strings.Join(parts, " "), len(m))
}

func (f *fixture) wantEquipment(got map[string]*string, want map[string]*string) {
	f.t.Helper()
	if !reflect.DeepEqual(got, want) {
		f.t.Fatalf("equipment = %s, want %s", show(got), show(want))
	}
}

func wantList(t *testing.T, name string, got, want []string) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("%s = %#v, want %#v", name, got, want)
	}
}

// C2
func TestMe_ShopFields(t *testing.T) {
	f := newFixture(t)
	f.balance(500, 500)
	f.do("/api/me/shop/gear/cafe")
	f.do("/api/me/shop/gear/macbook")
	f.do("/api/me/gear/cafe/unequip")
	f.do("/api/me/shop/skins/neon")
	got := f.me()
	wantList(t, "gear", got.Gear, []string{"macbook", "cafe"})
	f.wantEquipment(got.Equipment, equipment("macbook", "", "", ""))
	wantList(t, "skins", got.Skins, []string{"default", "neon"})

	raw := apptest.Decode[struct {
		Player map[string]any `json:"player"`
	}](t, f.env.Do(http.MethodGet, "/api/me", nil, f.c))
	want := map[string]any{"setup": "macbook", "bebida": nil, "vestuario": nil, "acessorio": nil}
	if !reflect.DeepEqual(raw.Player["equipment"], want) {
		t.Fatalf("raw equipment = %#v, want %#v", raw.Player["equipment"], want)
	}
}

// C3
func TestCreatePlayer_ShopDefaults(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND"}, env.Session(1, "u"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[struct {
		Player playerJSON `json:"player"`
	}](t, rec).Player
	if got.Gear == nil || len(got.Gear) != 0 {
		t.Errorf("gear = %#v, want []", got.Gear)
	}
	if !reflect.DeepEqual(got.Equipment, equipment("", "", "", "")) {
		t.Errorf("equipment = %s, want 4 null slots", show(got.Equipment))
	}
	wantList(t, "skins", got.Skins, []string{"default"})
	if got.Skin != "default" {
		t.Errorf("skin = %q, want default", got.Skin)
	}
	if !strings.Contains(rec.Body.String(), `"gear":[]`) {
		t.Errorf("gear is not serialized as []: %s", rec.Body.String())
	}
}

// C4
func TestBuyItem_PaysAndAdds(t *testing.T) {
	f := newFixture(t)
	got := f.do("/api/me/shop/items/sp_potion")
	if got.Gems != 5 || got.qty("sp_potion") != 3 {
		t.Fatalf("sp_potion: gems %d qty %d, want 5 and 3", got.Gems, got.qty("sp_potion"))
	}
	f.balance(12, 100)
	got = f.do("/api/me/shop/items/hp_potion")
	if got.Gems != 0 || got.qty("hp_potion") != 1 {
		t.Fatalf("hp_potion: gems %d qty %d, want 0 and 1", got.Gems, got.qty("hp_potion"))
	}
	f.balance(35, 100)
	got = f.do("/api/me/shop/items/boost_deploy")
	if got.Gems != 0 || got.qty("boost_deploy") != 1 || got.Coins != 100 {
		t.Fatalf("boost_deploy: gems %d coins %d qty %d, want 0, 100 and 1", got.Gems, got.Coins, got.qty("boost_deploy"))
	}
}

// C5
func TestBuyGear_PaysOwnsEquips(t *testing.T) {
	f := newFixture(t)
	got := f.do("/api/me/shop/gear/cafe")
	if got.Coins != 50 {
		t.Errorf("coins = %d, want 50", got.Coins)
	}
	wantList(t, "gear", got.Gear, []string{"cafe"})
	f.wantEquipment(got.Equipment, equipment("", "cafe", "", ""))

	g := fixtureOn(t, apptest.New(t))
	g.balance(120, 0)
	g.do("/api/me/shop/gear/macbook")
	g.balance(200, 0)
	got = g.do("/api/me/shop/gear/monitor")
	if got.Gems != 0 {
		t.Errorf("gems = %d, want 0", got.Gems)
	}
	wantList(t, "gear", got.Gear, []string{"macbook", "monitor"})
	g.wantEquipment(got.Equipment, equipment("monitor", "", "", ""))
	if me := g.me(); !reflect.DeepEqual(me.Equipment, got.Equipment) {
		t.Fatalf("stored equipment = %s, want %s", show(me.Equipment), show(got.Equipment))
	}
}

// C6
func TestBuySkin_PaysOwnsWears(t *testing.T) {
	f := newFixture(t)
	f.balance(60, 100)
	got := f.do("/api/me/shop/skins/neon")
	if got.Gems != 0 || got.Coins != 100 {
		t.Errorf("gems %d coins %d, want 0 and 100", got.Gems, got.Coins)
	}
	wantList(t, "skins", got.Skins, []string{"default", "neon"})
	if got.Skin != "neon" {
		t.Errorf("skin = %q, want neon", got.Skin)
	}
}

// C7
func TestBuy_BalanceBoundary(t *testing.T) {
	refuse := func(f *fixture, path, code string) {
		t.Helper()
		before := f.snapshot()
		f.status(f.post(path), http.StatusConflict, code)
		if after := f.snapshot(); after != before {
			t.Fatalf("%s changed state:\n%s\n%s", path, before, after)
		}
	}

	f := newFixture(t)
	f.balance(14, 0)
	refuse(f, "/api/me/shop/items/sp_potion", "not_enough_gems")
	f.balance(15, 0)
	if got := f.do("/api/me/shop/items/sp_potion"); got.Gems != 0 || got.qty("sp_potion") != 3 {
		t.Fatalf("15 gems: gems %d qty %d, want 0 and 3", got.Gems, got.qty("sp_potion"))
	}

	f.balance(0, 49)
	refuse(f, "/api/me/shop/gear/cafe", "not_enough_coins")
	f.balance(0, 50)
	if got := f.do("/api/me/shop/gear/cafe"); got.Coins != 0 || len(got.Gear) != 1 {
		t.Fatalf("50 coins: coins %d gear %v, want 0 and [cafe]", got.Coins, got.Gear)
	}

	f.balance(119, 1000)
	refuse(f, "/api/me/shop/gear/macbook", "not_enough_gems")
	f.balance(59, 1000)
	refuse(f, "/api/me/shop/skins/neon", "not_enough_gems")

	g := fixtureOn(t, apptest.NewWithCatalog(t, func(c *catalog.Catalog) {
		for i := range c.Items {
			if c.Items[i].ID == "hp_potion" {
				c.Items[i].Price = &catalog.Price{Currency: "coins", Amount: 10}
			}
		}
	}))
	g.balance(1000, 9)
	refuse(g, "/api/me/shop/items/hp_potion", "not_enough_coins")
	g.balance(1000, 10)
	if got := g.do("/api/me/shop/items/hp_potion"); got.Coins != 0 || got.Gems != 1000 || got.qty("hp_potion") != 1 {
		t.Fatalf("10 coins: coins %d gems %d qty %d, want 0, 1000 and 1", got.Coins, got.Gems, got.qty("hp_potion"))
	}
}

// C8
func TestBuy_AlreadyOwned(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	f.do("/api/me/shop/gear/cafe")
	f.do("/api/me/shop/skins/neon")
	for _, path := range []string{"/api/me/shop/gear/cafe", "/api/me/shop/skins/neon", "/api/me/shop/skins/default"} {
		before := f.snapshot()
		f.status(f.post(path), http.StatusConflict, "already_owned")
		if after := f.snapshot(); after != before {
			t.Fatalf("%s changed state:\n%s\n%s", path, before, after)
		}
	}
}

// C9
func TestBuy_Unknown(t *testing.T) {
	f := newFixture(t)
	f.status(f.post("/api/me/shop/items/x"), http.StatusUnprocessableEntity, "unknown_item")
	f.status(f.post("/api/me/shop/gear/x"), http.StatusUnprocessableEntity, "unknown_gear")
	f.status(f.post("/api/me/shop/skins/x"), http.StatusUnprocessableEntity, "unknown_skin")
}

// C10
func TestBuyItem_NotForSale(t *testing.T) {
	f := newFixture(t)
	before := f.snapshot()
	f.status(f.post("/api/me/shop/items/null_shard"), http.StatusUnprocessableEntity, "not_for_sale")
	if after := f.snapshot(); after != before {
		t.Fatalf("not_for_sale changed state:\n%s\n%s", before, after)
	}
}

// C11
func TestEquipGear_ReplacesSlot(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 0)
	f.do("/api/me/shop/gear/macbook")
	f.do("/api/me/shop/gear/monitor")
	got := f.do("/api/me/gear/macbook/equip")
	if got.Equipment["setup"] == nil || *got.Equipment["setup"] != "macbook" {
		t.Fatalf("equipment = %s, want setup=macbook", show(got.Equipment))
	}
	before := f.snapshot()
	again := f.do("/api/me/gear/macbook/equip")
	if !reflect.DeepEqual(again, got) {
		t.Fatalf("repeat equip = %+v, want %+v", again, got)
	}
	if after := f.snapshot(); after != before {
		t.Fatalf("repeat equip changed state:\n%s\n%s", before, after)
	}
}

// C12
func TestUnequipGear_ClearsSlot(t *testing.T) {
	f := newFixture(t)
	f.do("/api/me/shop/gear/cafe")
	got := f.do("/api/me/gear/cafe/unequip")
	if got.Equipment["bebida"] != nil {
		t.Fatalf("equipment = %s, want bebida=null", show(got.Equipment))
	}
	wantList(t, "gear", got.Gear, []string{"cafe"})
	before := f.snapshot()
	again := f.do("/api/me/gear/cafe/unequip")
	if !reflect.DeepEqual(again, got) {
		t.Fatalf("repeat unequip = %+v, want %+v", again, got)
	}
	if after := f.snapshot(); after != before {
		t.Fatalf("repeat unequip changed state:\n%s\n%s", before, after)
	}
}

// C13
func TestEquipSkin_Wears(t *testing.T) {
	f := newFixture(t)
	f.balance(60, 0)
	f.do("/api/me/shop/skins/neon")
	if got := f.do("/api/me/skins/default/equip"); got.Skin != "default" {
		t.Fatalf("skin = %q, want default", got.Skin)
	}
	if got := f.do("/api/me/skins/neon/equip"); got.Skin != "neon" {
		t.Fatalf("skin = %q, want neon", got.Skin)
	}
	if got := f.me(); got.Skin != "neon" {
		t.Fatalf("stored skin = %q, want neon", got.Skin)
	}
}

// C14
func TestEquip_NotOwnedOrUnknown(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	for _, tc := range []struct {
		path   string
		status int
		code   string
	}{
		{"/api/me/gear/macbook/equip", http.StatusConflict, "not_owned"},
		{"/api/me/skins/golden/equip", http.StatusConflict, "not_owned"},
		{"/api/me/gear/x/equip", http.StatusUnprocessableEntity, "unknown_gear"},
		{"/api/me/gear/x/unequip", http.StatusUnprocessableEntity, "unknown_gear"},
		{"/api/me/skins/x/equip", http.StatusUnprocessableEntity, "unknown_skin"},
	} {
		before := f.snapshot()
		f.status(f.post(tc.path), tc.status, tc.code)
		if after := f.snapshot(); after != before {
			t.Fatalf("%s changed state", tc.path)
		}
	}
}

// C15
func TestHPBonus_EquipAndRemove(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	hp := func(got playerJSON, hp, hpMax int, step string) {
		t.Helper()
		if got.HP != hp || got.HPMax != hpMax {
			t.Fatalf("%s: HP %d/%d, want %d/%d", step, got.HP, got.HPMax, hp, hpMax)
		}
		if me := f.me(); me.HP != hp || me.HPMax != hpMax {
			t.Fatalf("%s: stored HP %d/%d, want %d/%d", step, me.HP, me.HPMax, hp, hpMax)
		}
	}
	hp(f.do("/api/me/shop/gear/moletom"), 115, 115, "buy moletom")
	hp(f.do("/api/me/shop/gear/cadeira"), 130, 130, "buy cadeira over moletom")
	hp(f.do("/api/me/gear/cadeira/unequip"), 100, 100, "unequip cadeira")
	f.do("/api/me/gear/cadeira/equip")
	f.sql(`UPDATE players SET hp = 10, hp_max = 130`)
	hp(f.do("/api/me/gear/cadeira/unequip"), 1, 100, "unequip cadeira at 10/130")
	f.sql(`UPDATE players SET hp = 100, hp_max = 100`)
	hp(f.do("/api/me/shop/skins/golden"), 120, 120, "buy golden")
	f.do("/api/me/shop/skins/neon")
	hp(f.do("/api/me/skins/golden/equip"), 120, 120, "wear golden again")
	hp(f.do("/api/me/skins/neon/equip"), 100, 100, "wear neon over golden")
}

// C19
func TestDiscard_RemovesOne(t *testing.T) {
	f := newFixture(t)
	if got := f.do("/api/me/items/sp_potion/discard"); got.qty("sp_potion") != 1 {
		t.Fatalf("sp_potion = %d, want 1", got.qty("sp_potion"))
	}
	f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'null_shard', 1 FROM players`)
	got := f.do("/api/me/items/null_shard/discard")
	for _, it := range got.Inventory {
		if it.Item == "null_shard" {
			t.Fatalf("null_shard still in inventory: %+v", got.Inventory)
		}
	}
	if got.qty("sp_potion") != 1 {
		t.Fatalf("sp_potion = %d, want 1", got.qty("sp_potion"))
	}
}

// C20
func TestDiscard_Rejects(t *testing.T) {
	f := newFixture(t)
	f.status(f.post("/api/me/items/x/discard"), http.StatusUnprocessableEntity, "unknown_item")
	before := f.snapshot()
	f.status(f.post("/api/me/items/hp_potion/discard"), http.StatusConflict, "no_item")
	if after := f.snapshot(); after != before {
		t.Fatalf("no_item changed state:\n%s\n%s", before, after)
	}
}

type boostJSON struct {
	Deploy struct {
		Type, StartedAt, EndsAt string
		Level                   int
		Ready                   bool
	} `json:"deploy"`
	Player     playerJSON `json:"player"`
	ServerTime string     `json:"serverTime"`
}

func (f *fixture) startDeploy(typ string, level int) {
	f.t.Helper()
	rec := f.env.Do(http.MethodPost, "/api/me/deploys", map[string]any{"type": typ, "level": level}, f.c)
	if rec.Code != http.StatusCreated {
		f.t.Fatalf("start deploy: %d %s", rec.Code, rec.Body.String())
	}
}

func (f *fixture) boosters(n int) {
	f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'boost_deploy', $1 FROM players
		ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity`, n)
}

func stamp(t time.Time) string { return t.UTC().Format(time.RFC3339) }

// C21
func TestBoost_CutsFifteenMinutes(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET level = 3`)
	f.boosters(1)
	t0 := f.env.Clock.Now()
	f.startDeploy("backend", 2)
	rec := f.post("/api/me/deploys/backend/boost")
	if rec.Code != http.StatusOK {
		t.Fatalf("boost: %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[boostJSON](t, rec)
	if got.Deploy.EndsAt != stamp(t0.Add(15*time.Minute)) || got.Deploy.Ready || got.Deploy.Type != "backend" || got.Deploy.Level != 2 {
		t.Errorf("deploy = %+v, want backend NV.2 ending at T+15min, not ready", got.Deploy)
	}
	if got.Player.qty("boost_deploy") != 0 {
		t.Errorf("boost_deploy = %d, want 0", got.Player.qty("boost_deploy"))
	}
	if got.ServerTime != stamp(t0) {
		t.Errorf("serverTime = %q, want %q", got.ServerTime, stamp(t0))
	}
	list := apptest.Decode[struct {
		Deploys []struct{ Type, EndsAt string } `json:"deploys"`
	}](t, f.env.Do(http.MethodGet, "/api/me/deploys", nil, f.c))
	if len(list.Deploys) != 1 || list.Deploys[0].EndsAt != stamp(t0.Add(15*time.Minute)) {
		t.Errorf("stored deploys = %+v, want backend ending at T+15min", list.Deploys)
	}

	g := newFixture(t)
	g.boosters(1)
	t0 = g.env.Clock.Now()
	g.startDeploy("frontend", 1)
	g.env.Clock.Advance(5 * time.Minute)
	rec = g.post("/api/me/deploys/frontend/boost")
	if rec.Code != http.StatusOK {
		t.Fatalf("boost: %d %s", rec.Code, rec.Body.String())
	}
	got = apptest.Decode[boostJSON](t, rec)
	if got.Deploy.EndsAt != stamp(t0.Add(5*time.Minute)) || !got.Deploy.Ready {
		t.Errorf("deploy = %+v, want ending at T+5min (now) and ready", got.Deploy)
	}
}

// C22
func TestBoost_Rejects(t *testing.T) {
	f := newFixture(t)
	f.boosters(1)
	refuse := func(path string, status int, code string) {
		t.Helper()
		before := f.snapshot()
		f.status(f.post(path), status, code)
		if after := f.snapshot(); after != before {
			t.Fatalf("%s %s changed state:\n%s\n%s", path, code, before, after)
		}
	}
	refuse("/api/me/deploys/backend/boost", http.StatusNotFound, "deploy_not_found")
	refuse("/api/me/deploys/x/boost", http.StatusUnprocessableEntity, "unknown_deploy_type")
	f.startDeploy("backend", 1)
	f.env.Clock.Advance(15 * time.Minute)
	refuse("/api/me/deploys/backend/boost", http.StatusConflict, "deploy_ready")
	f.startDeploy("frontend", 1)
	f.boosters(0)
	refuse("/api/me/deploys/frontend/boost", http.StatusConflict, "no_item")
}

// newRoutes are the 8 routes this feature adds, with ids that pass validation.
var newRoutes = []string{
	"/api/me/shop/items/sp_potion",
	"/api/me/shop/gear/cafe",
	"/api/me/shop/skins/neon",
	"/api/me/gear/cafe/equip",
	"/api/me/gear/cafe/unequip",
	"/api/me/skins/default/equip",
	"/api/me/items/sp_potion/discard",
	"/api/me/deploys/backend/boost",
}

// C23
func TestShopRoutes_RequireSession(t *testing.T) {
	env := apptest.New(t)
	for _, path := range newRoutes {
		if rec := env.Do(http.MethodPost, path, nil); rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
			t.Errorf("%s without session: %d %s", path, rec.Code, rec.Body.String())
		}
	}
}

// C24
func TestShop_LoadFailure(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	f.startDeploy("backend", 1)
	f.boosters(1)
	before := f.snapshot()
	f.sql(`ALTER TABLE player_gear RENAME TO player_gear_gone`)
	check := func(method, path string) {
		t.Helper()
		rec := f.env.Do(method, path, nil, f.c)
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
		} else if !strings.Contains(line, "player_gear") {
			t.Errorf("%s %s: log line lacks the cause player_gear: %s", method, path, line)
		}
	}
	check(http.MethodGet, "/api/me")
	for _, path := range newRoutes {
		check(http.MethodPost, path)
	}
	f.sql(`ALTER TABLE player_gear_gone RENAME TO player_gear`)
	if after := f.snapshot(); after != before {
		t.Fatalf("player changed:\n%s\n%s", before, after)
	}
}

// C25
func TestBuy_ConcurrentSerialize(t *testing.T) {
	f := newFixture(t)
	f.balance(15, 0)
	var wg sync.WaitGroup
	codes := make([]int, 2)
	bodies := make([]*httptest.ResponseRecorder, 2)
	for i := range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			bodies[i] = f.post("/api/me/shop/items/sp_potion")
			codes[i] = bodies[i].Code
		}()
	}
	wg.Wait()
	oks, conflicts := 0, 0
	for i, c := range codes {
		switch {
		case c == 200:
			oks++
		case c == 409 && apptest.ErrorCode(t, bodies[i]) == "not_enough_gems":
			conflicts++
		}
	}
	if oks != 1 || conflicts != 1 {
		t.Fatalf("codes = %v, want one 200 and one 409 not_enough_gems", codes)
	}
	if got := f.me(); got.Gems != 0 || got.qty("sp_potion") != 3 {
		t.Fatalf("gems %d sp_potion %d, want 0 and 3", got.Gems, got.qty("sp_potion"))
	}
}

// C26
func TestTables_ShopConstraints(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 1000)
	f.do("/api/me/shop/gear/cafe")
	f.do("/api/me/shop/skins/neon")
	code := func(q string) string {
		_, err := f.env.Pool.Exec(context.Background(), q)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return pgErr.Code
		}
		return fmt.Sprint(err)
	}
	for _, tc := range []struct{ name, q, want string }{
		{"second player_gear row", `INSERT INTO player_gear (player_id, gear_id) SELECT id, 'cafe' FROM players`, "23505"},
		{"second player_equipment row in a slot", `INSERT INTO player_equipment (player_id, slot, gear_id) SELECT id, 'bebida', 'cafe' FROM players`, "23505"},
		{"player_equipment of unowned gear", `INSERT INTO player_equipment (player_id, slot, gear_id) SELECT id, 'setup', 'macbook' FROM players`, "23503"},
		{"second player_skins row", `INSERT INTO player_skins (player_id, skin_id) SELECT id, 'neon' FROM players`, "23505"},
	} {
		if got := code(tc.q); got != tc.want {
			t.Errorf("%s: %s, want %s", tc.name, got, tc.want)
		}
	}
}

// C27
func TestShop_ErrorCodes(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET gems = 0, coins = 0`)
	f.startDeploy("backend", 1)
	f.env.Clock.Advance(15 * time.Minute)
	f.boosters(1)
	for _, tc := range []struct{ path, code string }{
		{"/api/me/shop/items/sp_potion", "not_enough_gems"},
		{"/api/me/shop/gear/cafe", "not_enough_coins"},
		{"/api/me/shop/skins/default", "already_owned"},
		{"/api/me/shop/items/null_shard", "not_for_sale"},
		{"/api/me/shop/gear/x", "unknown_gear"},
		{"/api/me/skins/x/equip", "unknown_skin"},
		{"/api/me/gear/macbook/equip", "not_owned"},
		{"/api/me/deploys/backend/boost", "deploy_ready"},
	} {
		rec := f.post(tc.path)
		body := apptest.Decode[map[string]map[string]string](t, rec)
		if len(body) != 1 || len(body["error"]) != 2 || body["error"]["code"] != tc.code || body["error"]["message"] == "" {
			t.Errorf("%s: %s, want {\"error\":{\"code\":%q,\"message\":\"...\"}}", tc.path, rec.Body.String(), tc.code)
		}
		if rec.Code < 400 {
			t.Errorf("%s: status %d, want an error status", tc.path, rec.Code)
		}
	}
}

// C47
func TestMigration_ExistingPlayers(t *testing.T) {
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

	if err := db.MigrateTo(ctx, u.String(), 4); err != nil {
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
	if err := db.MigrateTo(ctx, u.String(), 5); err != nil {
		t.Fatal(err)
	}
	for _, table := range []string{"player_gear", "player_equipment", "player_skins"} {
		var n int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM "+table).Scan(&n); err != nil || n != 0 {
			t.Errorf("%s: %d rows (%v), want an empty table", table, n, err)
		}
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
	if got.Skin != "default" {
		t.Errorf("skin = %q, want default", got.Skin)
	}
	wantList(t, "skins", got.Skins, []string{"default"})
}

// AC 12: removing a piece that is not the one in its slot changes nothing.
func TestUnequipGear_OtherPieceInSlotStays(t *testing.T) {
	f := newFixture(t)
	f.balance(1000, 0)
	f.do("/api/me/shop/gear/macbook")
	f.do("/api/me/shop/gear/monitor")
	before := f.snapshot()
	got := f.do("/api/me/gear/macbook/unequip")
	if got.Equipment["setup"] == nil || *got.Equipment["setup"] != "monitor" {
		t.Fatalf("equipment = %s, want setup=monitor", show(got.Equipment))
	}
	if after := f.snapshot(); after != before {
		t.Fatalf("unequip of the other piece changed state:\n%s\n%s", before, after)
	}
}
