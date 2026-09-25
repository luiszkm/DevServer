package avatar_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"devserver/api/internal/apptest"
	"devserver/api/internal/avatar"
	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
)

type playerJSON struct {
	Coins, Gems int
	Body        string
	Appearance  map[string]string
	Looks       []string
	Inventory   []struct {
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

func newFixture(t *testing.T) *fixture { return newFixtureBody(t, "masculino") }

func newFixtureBody(t *testing.T, body string) *fixture {
	env := apptest.New(t)
	return &fixture{t, env, env.NewPlayerWithBody(1, "DEV_01", "BACKEND", body)}
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

func (f *fixture) put(body any) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPut, "/api/me/appearance", body, f.c)
}

func (f *fixture) pick(appearance map[string]string) *httptest.ResponseRecorder {
	return f.put(map[string]any{"appearance": appearance})
}

func (f *fixture) buy(id string) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, "/api/me/shop/looks/"+id, nil, f.c)
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

func (f *fixture) me() playerJSON {
	f.t.Helper()
	return f.ok(f.env.Do(http.MethodGet, "/api/me", nil, f.c))
}

func (f *fixture) status(rec *httptest.ResponseRecorder, want *httpx.Error) {
	f.t.Helper()
	if rec.Code != want.Status || apptest.ErrorCode(f.t, rec) != want.Code {
		f.t.Fatalf("got %d %s, want %d %s", rec.Code, rec.Body.String(), want.Status, want.Code)
	}
}

// snapshot is every row this feature can change for the player.
func (f *fixture) snapshot() string {
	f.t.Helper()
	var s string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT
		(SELECT appearance::text || '|' || gems || '|' || coins || '|' || body FROM players) || '|' ||
		(SELECT coalesce(string_agg(look_id, ',' ORDER BY look_id), '') FROM player_looks) || '|' ||
		(SELECT coalesce(string_agg(item_id || ':' || quantity, ',' ORDER BY item_id), '') FROM player_items)`).Scan(&s); err != nil {
		f.t.Fatal(err)
	}
	return s
}

// unchanged runs rec and requires that it saved nothing.
func (f *fixture) unchanged(run func() *httptest.ResponseRecorder, want *httpx.Error) {
	f.t.Helper()
	before := f.snapshot()
	f.status(run(), want)
	if after := f.snapshot(); after != before {
		f.t.Fatalf("refused request changed rows: %s -> %s", before, after)
	}
}

func defaults() map[string]string {
	m := map[string]string{}
	for k, v := range catalog.Default().Avatar.Defaults {
		m[k] = v
	}
	return m
}

func with(pairs ...string) map[string]string {
	m := defaults()
	for i := 0; i < len(pairs); i += 2 {
		m[pairs[i]] = pairs[i+1]
	}
	return m
}

func wantAppearance(t *testing.T, got, want map[string]string) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("appearance = %v, want %v", got, want)
	}
}

func wantLooks(t *testing.T, got, want []string) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("looks = %#v, want %#v", got, want)
	}
}

// Avatar C5 and body contract (own layer): one case per row of the pick rule, in its order
// unknown_part, unknown_look, gear_only, wrong_body, not_owned.
func TestChoose_Rows(t *testing.T) {
	cat := catalog.Default()
	m := func(looks ...string) *player.Player { return &player.Player{Body: "masculino", Looks: looks} }
	f := func(looks ...string) *player.Player { return &player.Player{Body: "feminino", Looks: looks} }
	for _, tc := range []struct {
		name, part, option string
		p                  *player.Player
		want               error
	}{
		{"unknown part", "hat", "hair_curto", m(), httpx.ErrUnknownPart},
		{"unknown option", "hair", "hair_gone", m(), httpx.ErrUnknownLook},
		{"option of another part", "hair", "hair_preto", m(), httpx.ErrUnknownLook},
		{"option of another part, also of another body", "beard", "hair_rabo", m(), httpx.ErrUnknownLook},
		{"gear-only option", "top", "top_hoodie_trace", m(), httpx.ErrGearOnly},
		{"feminino-only option for masculino", "hair", "hair_rabo", m(), httpx.ErrWrongBody},
		{"masculino-only option for feminino", "beard", "beard_cheia", f(), httpx.ErrWrongBody},
		{"priced option of another body, not bought", "hair", "hair_trancas", m(), httpx.ErrWrongBody},
		{"priced option of another body, bought", "beard", "beard_lenhador", f("beard_lenhador"), httpx.ErrWrongBody},
		{"priced option not bought", "hair", "hair_moicano", m(), httpx.ErrNotOwned},
		{"priced option of the body not bought", "hair", "hair_trancas", f(), httpx.ErrNotOwned},
		{"priced option bought", "hair", "hair_moicano", m("hair_moicano"), nil},
		{"free option", "hair", "hair_curto", m(), nil},
		{"free option for every body, feminino", "hair", "hair_espetado", f(), nil},
		{"free option of the body", "hair", "hair_franja", f(), nil},
		{"layer-less default for every body", "beard", "beard_nenhuma", f(), nil},
	} {
		if got := avatar.Choose(cat, tc.p, tc.part, tc.option); !errors.Is(got, tc.want) {
			t.Errorf("%s: Choose = %v, want %v", tc.name, got, tc.want)
		}
	}

	// gear_only comes before wrong_body: no shipped gear-only option is body-bound, so bind one.
	edited, err := catalog.Load()
	if err != nil {
		t.Fatal(err)
	}
	for i := range edited.Avatar.Options {
		if edited.Avatar.Options[i].ID == "top_hoodie_trace" {
			edited.Avatar.Options[i].Bodies = []string{"feminino"}
		}
	}
	if got := avatar.Choose(edited, m(), "top", "top_hoodie_trace"); !errors.Is(got, httpx.ErrGearOnly) {
		t.Errorf("gear-only option of another body: Choose = %v, want gear_only", got)
	}
}

// Avatar C4: a new dev wears every default and owns no look.
func TestCreatePlayer_AvatarDefaults(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"}, env.Session(1, "u"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[struct {
		Player playerJSON `json:"player"`
	}](t, rec).Player
	wantAppearance(t, got.Appearance, defaults())
	if !strings.Contains(rec.Body.String(), `"looks":[]`) {
		t.Fatalf("looks is not serialized as []: %s", rec.Body.String())
	}
	f := &fixture{t, env, env.Session(1, "u")}
	me := f.me()
	wantAppearance(t, me.Appearance, defaults())
	wantLooks(t, me.Looks, []string{})
}

// Avatar C6: body rows of PUT /api/me/appearance.
func TestUpdateAppearance_InvalidBody(t *testing.T) {
	f := newFixture(t)
	for _, body := range []any{"{nope", `{"appearance": {"hair": 3}}`, `{}`, map[string]any{"appearance": map[string]string{}}} {
		f.unchanged(func() *httptest.ResponseRecorder { return f.put(body) }, httpx.ErrInvalidBody)
	}
}

// Avatar C6: each refused pick answers its error and saves nothing.
func TestUpdateAppearance_Refused(t *testing.T) {
	f := newFixture(t)
	for _, tc := range []struct {
		name string
		body map[string]string
		want *httpx.Error
	}{
		{"unknown part", map[string]string{"hat": "hair_curto"}, httpx.ErrUnknownPart},
		{"unknown option", map[string]string{"hair": "hair_gone"}, httpx.ErrUnknownLook},
		{"option of another part", map[string]string{"hair": "hair_preto"}, httpx.ErrUnknownLook},
		{"gear-only option", map[string]string{"top": "top_hoodie_trace"}, httpx.ErrGearOnly},
		{"priced option not bought", map[string]string{"hair": "hair_moicano"}, httpx.ErrNotOwned},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g := *f
			g.t = t
			g.unchanged(func() *httptest.ResponseRecorder { return g.pick(tc.body) }, tc.want)
		})
	}
}

// Avatar C6: one refused pick in the body saves none of the others.
func TestUpdateAppearance_AllOrNothing(t *testing.T) {
	f := newFixture(t)
	f.unchanged(func() *httptest.ResponseRecorder {
		return f.pick(map[string]string{"hair": "hair_curto", "top": "top_hoodie_trace", "tone": "tone_negra"})
	}, httpx.ErrGearOnly)
	wantAppearance(t, f.me().Appearance, defaults())
}

// Avatar C6: a free pick and a bought pick are saved, merged into the rest, and survive a reload.
func TestUpdateAppearance_SavesAndMerges(t *testing.T) {
	f := newFixture(t)
	got := f.ok(f.pick(map[string]string{"hair": "hair_curto", "hairColor": "hair_ruivo"}))
	wantAppearance(t, got.Appearance, with("hair", "hair_curto", "hairColor", "hair_ruivo"))

	got = f.ok(f.pick(map[string]string{"tone": "tone_negra"}))
	wantAppearance(t, got.Appearance, with("hair", "hair_curto", "hairColor", "hair_ruivo", "tone", "tone_negra"))

	f.sql(`INSERT INTO player_looks (player_id, look_id) SELECT id, 'hair_moicano' FROM players`)
	got = f.ok(f.pick(map[string]string{"hair": "hair_moicano"}))
	wantAppearance(t, got.Appearance, with("hair", "hair_moicano", "hairColor", "hair_ruivo", "tone", "tone_negra"))

	wantAppearance(t, f.me().Appearance, got.Appearance)
	var stored string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT appearance::text FROM players`).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	// Only the explicit picks are stored, so a later change of a default reaches untouched parts.
	if stored != `{"hair": "hair_moicano", "tone": "tone_negra", "hairColor": "hair_ruivo"}` {
		t.Fatalf("stored appearance = %s, want only the three picks", stored)
	}
}

// Avatar C4: a stored pick the catalog no longer offers is read back as the part's default.
func TestAppearance_StalePickFallsBack(t *testing.T) {
	f := newFixture(t)
	f.sql(`UPDATE players SET appearance = '{"hair": "hair_gone", "top": "top_hoodie_trace", "eyes": "hair_preto", "hat": "hat_bone", "tone": "tone_parda"}'`)
	got := f.me()
	wantAppearance(t, got.Appearance, with("tone", "tone_parda"))

	// A locked mutation keeps working on a stale row.
	got = f.ok(f.pick(map[string]string{"laptop": "laptop_preto"}))
	wantAppearance(t, got.Appearance, with("tone", "tone_parda", "laptop", "laptop_preto"))
}

// Avatar C7: rows of POST /api/me/shop/looks/{id} that refuse before paying.
func TestBuyLook_Refused(t *testing.T) {
	f := newFixture(t)
	f.balance(500, 500)
	for _, tc := range []struct {
		name, id string
		want     *httpx.Error
	}{
		{"unknown option", "hair_gone", httpx.ErrLookNotFound},
		{"free option", "hair_curto", httpx.ErrNotForSale},
		{"gear-only option", "laptop_macbook", httpx.ErrNotForSale},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g := *f
			g.t = t
			g.unchanged(func() *httptest.ResponseRecorder { return g.buy(tc.id) }, tc.want)
		})
	}
	if rec := f.buy("hair_gone"); rec.Code != http.StatusNotFound {
		t.Fatalf("unknown look status = %d, want 404", rec.Code)
	}
}

// Avatar C7: a balance below the price refuses with the currency's error and saves nothing.
func TestBuyLook_CannotAfford(t *testing.T) {
	f := newFixture(t)
	f.balance(29, 500)
	f.unchanged(func() *httptest.ResponseRecorder { return f.buy("hair_moicano") }, httpx.ErrNotEnoughGems)
	f.balance(500, 79)
	f.unchanged(func() *httptest.ResponseRecorder { return f.buy("hair_azul") }, httpx.ErrNotEnoughCoins)
}

// Avatar C7: a purchase takes the exact price in its currency, keeps the look and wears it.
func TestBuyLook_PaysOwnsWears(t *testing.T) {
	f := newFixture(t)
	f.balance(30, 80)
	got := f.ok(f.buy("hair_azul"))
	if got.Gems != 30 || got.Coins != 0 {
		t.Fatalf("after hair_azul: gems %d coins %d, want 30 and 0", got.Gems, got.Coins)
	}
	wantLooks(t, got.Looks, []string{"hair_azul"})
	wantAppearance(t, got.Appearance, with("hairColor", "hair_azul"))

	got = f.ok(f.buy("hair_moicano"))
	if got.Gems != 0 || got.Coins != 0 {
		t.Fatalf("after hair_moicano: gems %d coins %d, want 0 and 0", got.Gems, got.Coins)
	}
	// Catalog order, not purchase order.
	wantLooks(t, got.Looks, []string{"hair_moicano", "hair_azul"})
	wantAppearance(t, got.Appearance, with("hair", "hair_moicano", "hairColor", "hair_azul"))

	me := f.me()
	wantLooks(t, me.Looks, got.Looks)
	wantAppearance(t, me.Appearance, got.Appearance)

	// A bought look can be taken off and picked again.
	f.ok(f.pick(map[string]string{"hair": "hair_curto"}))
	wantAppearance(t, f.ok(f.pick(map[string]string{"hair": "hair_moicano"})).Appearance, got.Appearance)
}

// Avatar C7: a second purchase of the same look is refused and charges nothing.
func TestBuyLook_AlreadyOwned(t *testing.T) {
	f := newFixture(t)
	f.balance(100, 100)
	f.ok(f.buy("laptop_gamer"))
	f.unchanged(func() *httptest.ResponseRecorder { return f.buy("laptop_gamer") }, httpx.ErrAlreadyOwned)
}

// Avatar C8: the primary key keeps one row per (player, look), even for concurrent purchases.
func TestBuyLook_OneRowPerLook(t *testing.T) {
	f := newFixture(t)
	f.balance(100, 100)
	var wg sync.WaitGroup
	results := make([]string, 4)
	for i := range results {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rec := f.buy("laptop_gamer")
			results[i] = http.StatusText(rec.Code)
		}()
	}
	wg.Wait()
	sort.Strings(results)
	if want := []string{"Conflict", "Conflict", "Conflict", "OK"}; !reflect.DeepEqual(results, want) {
		t.Fatalf("concurrent purchases = %v, want one OK", results)
	}
	if n := f.env.Count("player_looks"); n != 1 {
		t.Fatalf("player_looks rows = %d, want 1", n)
	}
	if got := f.me(); got.Gems != 60 {
		t.Fatalf("gems = %d, want 60 (charged once)", got.Gems)
	}

	_, err := f.env.Pool.Exec(context.Background(), `INSERT INTO player_looks (player_id, look_id) SELECT id, 'laptop_gamer' FROM players`)
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		t.Fatalf("duplicate insert: %v, want unique violation 23505", err)
	}
}
