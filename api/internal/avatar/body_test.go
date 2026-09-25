package avatar_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"devserver/api/internal/avatar"
	"devserver/api/internal/catalog"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
)

func (f *fixture) tokens(n int) {
	f.t.Helper()
	f.sql(`DELETE FROM player_items WHERE item_id = 'redesign_token'`)
	if n > 0 {
		f.sql(`INSERT INTO player_items (player_id, item_id, quantity) SELECT id, 'redesign_token', $1 FROM players`, n)
	}
}

func (f *fixture) redesign(body any) *httptest.ResponseRecorder {
	return f.env.Do(http.MethodPost, "/api/me/body", body, f.c)
}

func (f *fixture) storedPicks() string {
	f.t.Helper()
	var s string
	if err := f.env.Pool.QueryRow(context.Background(), `SELECT appearance::text FROM players`).Scan(&s); err != nil {
		f.t.Fatal(err)
	}
	return s
}

// femDefaults is every part at feminino's default.
func femDefaults(pairs ...string) map[string]string {
	m := with("eyes", "eyes_cinza", "hair", "hair_rabo", "hairColor", "hair_castanho", "bottomColor", "bottom_preto")
	for i := 0; i < len(pairs); i += 2 {
		m[pairs[i]] = pairs[i+1]
	}
	return m
}

// Body contract: PUT /api/me/appearance refuses an option the player's body cannot wear with 422
// wrong_body, before not_owned, and saves nothing; a pick the body can wear is saved.
func TestUpdateAppearance_WrongBody(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		pick       map[string]string
		want       *httpx.Error
	}{
		{"feminino-only hair for masculino", "masculino", map[string]string{"hair": "hair_rabo"}, httpx.ErrWrongBody},
		{"priced feminino-only hair for masculino, not bought", "masculino", map[string]string{"hair": "hair_trancas"}, httpx.ErrWrongBody},
		{"masculino-only beard for feminino", "feminino", map[string]string{"beard": "beard_cheia"}, httpx.ErrWrongBody},
		{"gear-only still answers gear_only for feminino", "feminino", map[string]string{"top": "top_hoodie_trace"}, httpx.ErrGearOnly},
		{"priced hair of the body, not bought", "feminino", map[string]string{"hair": "hair_trancas"}, httpx.ErrNotOwned},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := newFixtureBody(t, tc.body)
			f.unchanged(func() *httptest.ResponseRecorder { return f.pick(tc.pick) }, tc.want)
		})
	}

	t.Run("a pick of the body is saved", func(t *testing.T) {
		f := newFixtureBody(t, "feminino")
		got := f.ok(f.pick(map[string]string{"hair": "hair_franja", "beard": "beard_nenhuma"}))
		wantAppearance(t, got.Appearance, femDefaults("hair", "hair_franja"))
		wantAppearance(t, f.me().Appearance, got.Appearance)
	})
}

// Body contract: POST /api/me/shop/looks/{id} refuses a look the body cannot wear with 422
// wrong_body after unknown and not_for_sale, charging nothing; a look of the body is sold.
func TestBuyLook_WrongBody(t *testing.T) {
	for _, tc := range []struct {
		name, body, id string
		want           *httpx.Error
	}{
		{"feminino-only look for masculino", "masculino", "hair_trancas", httpx.ErrWrongBody},
		{"masculino-only look for feminino", "feminino", "beard_lenhador", httpx.ErrWrongBody},
		{"free look of another body answers not_for_sale first", "masculino", "hair_rabo", httpx.ErrNotForSale},
		{"unknown look answers unknown first", "feminino", "hair_gone", httpx.ErrLookNotFound},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := newFixtureBody(t, tc.body)
			f.balance(500, 500)
			f.unchanged(func() *httptest.ResponseRecorder { return f.buy(tc.id) }, tc.want)
		})
	}

	t.Run("a priced look of the body is sold and worn", func(t *testing.T) {
		f := newFixtureBody(t, "feminino")
		f.balance(30, 0)
		got := f.ok(f.buy("hair_trancas"))
		if got.Gems != 0 {
			t.Fatalf("gems = %d, want 0", got.Gems)
		}
		wantLooks(t, got.Looks, []string{"hair_trancas"})
		wantAppearance(t, got.Appearance, femDefaults("hair", "hair_trancas"))
	})
}

// Body contract (own layer): one case per row of the redesign rule.
func TestChooseBody_Rows(t *testing.T) {
	cat := catalog.Default()
	token := []catalog.ItemQuantity{{Item: "redesign_token", Quantity: 1}}
	for _, tc := range []struct {
		name, body string
		p          *player.Player
		want       error
	}{
		{"unknown body", "outro", &player.Player{Body: "masculino", Inventory: token}, httpx.ErrUnknownBody},
		{"empty body", "", &player.Player{Body: "masculino", Inventory: token}, httpx.ErrUnknownBody},
		{"same body", "masculino", &player.Player{Body: "masculino", Inventory: token}, httpx.ErrSameBody},
		{"same body without a token", "feminino", &player.Player{Body: "feminino"}, httpx.ErrSameBody},
		{"no redesign token", "feminino", &player.Player{Body: "masculino"}, httpx.ErrNoRedesignToken},
		{"other items are no token", "feminino", &player.Player{Body: "masculino", Inventory: []catalog.ItemQuantity{{Item: "sp_potion", Quantity: 3}}}, httpx.ErrNoRedesignToken},
		{"to feminino with a token", "feminino", &player.Player{Body: "masculino", Inventory: token}, nil},
		{"to masculino with a token", "masculino", &player.Player{Body: "feminino", Inventory: token}, nil},
	} {
		if got := avatar.ChooseBody(cat, tc.p, tc.body); !errors.Is(got, tc.want) {
			t.Errorf("%s: ChooseBody = %v, want %v", tc.name, got, tc.want)
		}
	}
}

// Body contract: each refusal of POST /api/me/body answers its error and changes nothing, the
// token included.
func TestChangeBody_Refused(t *testing.T) {
	for _, tc := range []struct {
		name   string
		tokens int
		body   any
		want   *httpx.Error
	}{
		{"malformed body", 1, "{nope", httpx.ErrInvalidBody},
		{"missing body", 1, map[string]string{}, httpx.ErrUnknownBody},
		{"unknown body", 1, map[string]string{"body": "outro"}, httpx.ErrUnknownBody},
		{"same body", 1, map[string]string{"body": "masculino"}, httpx.ErrSameBody},
		{"no redesign token", 0, map[string]string{"body": "feminino"}, httpx.ErrNoRedesignToken},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := newFixture(t)
			f.tokens(tc.tokens)
			f.unchanged(func() *httptest.ResponseRecorder { return f.redesign(tc.body) }, tc.want)
		})
	}
}

// Body contract: a change of body consumes exactly one token, sets the body and keeps the stored
// picks; parts the new body cannot wear, and unset parts, read as the new body's defaults, and the
// picks come back with the old body.
func TestChangeBody_ConsumesTokenKeepsPicks(t *testing.T) {
	f := newFixture(t)
	f.tokens(2)
	f.ok(f.pick(map[string]string{"beard": "beard_cheia", "tone": "tone_negra"}))
	picks := f.storedPicks()

	got := f.ok(f.redesign(map[string]string{"body": "feminino"}))
	if got.Body != "feminino" || got.qty("redesign_token") != 1 {
		t.Fatalf("after redesign: body %q tokens %d, want feminino and 1", got.Body, got.qty("redesign_token"))
	}
	wantAppearance(t, got.Appearance, femDefaults("tone", "tone_negra"))
	if s := f.storedPicks(); s != picks {
		t.Fatalf("stored picks = %s, want unchanged %s", s, picks)
	}
	me := f.me()
	if me.Body != "feminino" || me.qty("redesign_token") != 1 {
		t.Fatalf("GET /api/me: body %q tokens %d, want feminino and 1", me.Body, me.qty("redesign_token"))
	}
	wantAppearance(t, me.Appearance, got.Appearance)

	// An explicit pick available to both bodies is kept across the change.
	f.ok(f.pick(map[string]string{"hair": "hair_espetado"}))
	got = f.ok(f.redesign(map[string]string{"body": "masculino"}))
	if got.Body != "masculino" || got.qty("redesign_token") != 0 {
		t.Fatalf("back to masculino: body %q tokens %d, want masculino and 0", got.Body, got.qty("redesign_token"))
	}
	wantAppearance(t, got.Appearance, with("beard", "beard_cheia", "tone", "tone_negra", "hair", "hair_espetado"))

	f.unchanged(func() *httptest.ResponseRecorder { return f.redesign(map[string]string{"body": "feminino"}) }, httpx.ErrNoRedesignToken)
}

// Body contract: an explicit hair pick both bodies can wear survives masculino to feminino.
func TestChangeBody_KeepsSharedPick(t *testing.T) {
	f := newFixture(t)
	f.tokens(1)
	f.ok(f.pick(map[string]string{"hair": "hair_curto", "beard": "beard_bigode"}))
	got := f.ok(f.redesign(map[string]string{"body": "feminino"}))
	wantAppearance(t, got.Appearance, femDefaults("hair", "hair_curto"))
}

// Body contract: concurrent changes of body are serialized by the player lock: tokens spent equal
// the successes, the body matches their count and no request consumes a token without changing it.
func TestChangeBody_Concurrent(t *testing.T) {
	for _, tokens := range []int{1, 2} {
		f := newFixture(t)
		f.tokens(tokens)
		const n = 8
		codes := make([]string, n)
		var wg sync.WaitGroup
		start := make(chan struct{})
		for i := 0; i < n; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				<-start
				body := "feminino"
				if i%2 == 1 {
					body = "masculino"
				}
				rec := f.redesign(map[string]string{"body": body})
				codes[i] = http.StatusText(rec.Code)
				if rec.Code != http.StatusOK && rec.Code != http.StatusConflict {
					t.Errorf("tokens %d: request %d answered %d %s", tokens, i, rec.Code, rec.Body.String())
				}
			}(i)
		}
		close(start)
		wg.Wait()
		ok := 0
		for _, c := range codes {
			if c == "OK" {
				ok++
			}
		}
		me := f.me()
		if ok < 1 || ok > tokens {
			t.Fatalf("tokens %d: %d successes (%v), want between 1 and %d", tokens, ok, codes, tokens)
		}
		if spent := tokens - me.qty("redesign_token"); spent != ok {
			t.Fatalf("tokens %d: spent %d tokens for %d successes", tokens, spent, ok)
		}
		wantBody := "masculino"
		if ok%2 == 1 {
			wantBody = "feminino"
		}
		if me.Body != wantBody {
			t.Fatalf("tokens %d: body %q after %d changes, want %s", tokens, me.Body, ok, wantBody)
		}
	}
}
