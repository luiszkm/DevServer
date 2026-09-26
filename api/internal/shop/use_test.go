package shop_test

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"devserver/api/internal/apptest"
)

// progress is the level-up state an XP item changes.
func progress(p playerJSON) [5]int { return [5]int{p.Level, p.XP, p.XPMax, p.SkillPoints, p.HPMax} }

// XP potions are sold like any other item, in the catalog's currency.
func TestBuyItem_XPPotions(t *testing.T) {
	f := newFixture(t)
	f.balance(50, 120)
	got := f.do("/api/me/shop/items/xp_potion")
	if got.Coins != 0 || got.Gems != 50 || got.qty("xp_potion") != 1 {
		t.Fatalf("xp_potion: coins %d gems %d qty %d, want 0, 50 and 1", got.Coins, got.Gems, got.qty("xp_potion"))
	}
	got = f.do("/api/me/shop/items/xp_elixir")
	if got.Coins != 0 || got.Gems != 0 || got.qty("xp_elixir") != 1 {
		t.Fatalf("xp_elixir: coins %d gems %d qty %d, want 0, 0 and 1", got.Coins, got.Gems, got.qty("xp_elixir"))
	}
}

// Using an XP item spends one and grants the catalog amount through the level-up rule, at each
// side of the level boundary.
func TestUseItem_GrantsCatalogXP(t *testing.T) {
	for _, tc := range []struct {
		name, item string
		xp         int
		want       [5]int // level, xp, xpMax, skill points, hpMax
	}{
		{"xp_potion below the boundary", "xp_potion", 349, [5]int{1, 499, 500, 1, 100}},
		{"xp_potion reaching the boundary", "xp_potion", 350, [5]int{2, 0, 750, 2, 120}},
		{"xp_elixir from zero reaches the boundary", "xp_elixir", 0, [5]int{2, 0, 750, 2, 120}},
		{"xp_elixir crossing the boundary", "xp_elixir", 100, [5]int{2, 100, 750, 2, 120}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := newFixture(t)
			f.sql(`UPDATE players SET xp = $1`, tc.xp)
			f.give(tc.item, 2)
			got := f.do("/api/me/items/" + tc.item + "/use")
			if progress(got) != tc.want || got.qty(tc.item) != 1 {
				t.Fatalf("got %v qty %d, want %v qty 1", progress(got), got.qty(tc.item), tc.want)
			}
			if me := f.me(); progress(me) != tc.want || me.qty(tc.item) != 1 {
				t.Fatalf("stored %v qty %d, want %v qty 1", progress(me), me.qty(tc.item), tc.want)
			}
		})
	}
}

func TestUseItem_LastOneLeavesInventory(t *testing.T) {
	f := newFixture(t)
	f.give("xp_potion", 1)
	got := f.do("/api/me/items/xp_potion/use")
	for _, it := range got.Inventory {
		if it.Item == "xp_potion" {
			t.Fatalf("xp_potion still in inventory: %+v", got.Inventory)
		}
	}
	if got.XP != 150 {
		t.Fatalf("xp = %d, want 150", got.XP)
	}
}

// Validation order: unknown id, then an item that grants no XP, then the player, then the quantity.
func TestUseItem_Rejects(t *testing.T) {
	f := newFixture(t)
	nodev := f.env.Session(2, "nodev")
	for _, tc := range []struct {
		path, code string
		status     int
	}{
		{"/api/me/items/nada/use", "unknown_item", 422},
		{"/api/me/items/sp_potion/use", "item_not_usable", 422},
		{"/api/me/items/xp_potion/use", "player_not_found", 404},
	} {
		rec := f.env.Do(http.MethodPost, tc.path, nil, nodev)
		if rec.Code != tc.status || apptest.ErrorCode(t, rec) != tc.code {
			t.Errorf("no dev %s: %d %s, want %d %s", tc.path, rec.Code, rec.Body.String(), tc.status, tc.code)
		}
	}
	f.give("null_shard", 1, "boost_deploy", 1, "redesign_token", 1)
	for _, item := range []string{"sp_potion", "hp_potion", "null_shard", "boost_deploy", "redesign_token"} {
		f.unchanged("/api/me/items/"+item+"/use", http.StatusUnprocessableEntity, "item_not_usable")
	}
	f.unchanged("/api/me/items/xp_potion/use", http.StatusConflict, "no_item")
}

// The battle item route restores a stat; an XP item restores none, so it is refused there.
func TestBattleItem_RefusesXPPotion(t *testing.T) {
	f := newFixture(t)
	f.give("xp_potion", 1)
	before := f.snapshot()
	f.status(f.env.Do(http.MethodPost, "/api/me/battle/items", map[string]string{"item": "xp_potion"}, f.c), http.StatusUnprocessableEntity, "unknown_item")
	if after := f.snapshot(); after != before {
		t.Fatalf("battle item changed state:\n%s\n%s", before, after)
	}
}

func TestUseItem_RequiresSession(t *testing.T) {
	env := apptest.New(t)
	if rec := env.Do(http.MethodPost, "/api/me/items/xp_potion/use", nil); rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
		t.Fatalf("without session: %d %s", rec.Code, rec.Body.String())
	}
}

func TestUseItem_InventoryFailure(t *testing.T) {
	f := newFixture(t)
	f.give("xp_potion", 1)
	f.sql(`ALTER TABLE player_items RENAME TO player_items_gone`)
	f.status(f.post("/api/me/items/xp_potion/use"), http.StatusInternalServerError, "internal")
	f.sql(`ALTER TABLE player_items_gone RENAME TO player_items`)
	if got := f.me(); got.XP != 0 || got.qty("xp_potion") != 1 {
		t.Fatalf("xp %d qty %d, want 0 and 1", got.XP, got.qty("xp_potion"))
	}
}

// Two uses of the last potion serialize on the player lock: one grants XP, the other finds none.
func TestUseItem_ConcurrentSerialize(t *testing.T) {
	f := newFixture(t)
	f.give("xp_potion", 1)
	var wg sync.WaitGroup
	recs := make([]*httptest.ResponseRecorder, 2)
	for i := range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			recs[i] = f.post("/api/me/items/xp_potion/use")
		}()
	}
	wg.Wait()
	oks, conflicts := 0, 0
	for _, rec := range recs {
		switch {
		case rec.Code == 200:
			oks++
		case rec.Code == 409 && apptest.ErrorCode(t, rec) == "no_item":
			conflicts++
		}
	}
	if oks != 1 || conflicts != 1 {
		t.Fatalf("codes = %d %d, want one 200 and one 409 no_item", recs[0].Code, recs[1].Code)
	}
	if got := f.me(); got.XP != 150 || got.qty("xp_potion") != 0 {
		t.Fatalf("xp %d qty %d, want 150 and 0", got.XP, got.qty("xp_potion"))
	}
}
