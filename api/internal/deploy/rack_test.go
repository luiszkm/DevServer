package deploy_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"devserver/api/internal/apptest"
)

// equip replaces the player's rack with components in slots 0, 1, ...
func equip(t *testing.T, env *apptest.Env, ids ...string) {
	t.Helper()
	ctx := context.Background()
	if _, err := env.Pool.Exec(ctx, `DELETE FROM player_rack`); err != nil {
		t.Fatal(err)
	}
	for i, id := range ids {
		if _, err := env.Pool.Exec(ctx, `INSERT INTO player_rack (player_id, slot, component_id)
			SELECT id, $1, $2 FROM players`, i, id); err != nil {
			t.Fatal(err)
		}
	}
}

// stored is the reward snapshot of the one active deploy.
func stored(t *testing.T, env *apptest.Env) (ends time.Time, xp, coins, gems int) {
	t.Helper()
	if err := env.Pool.QueryRow(context.Background(),
		`SELECT ends_at, xp, coins, gems FROM deploy_jobs WHERE collected_at IS NULL`).Scan(&ends, &xp, &coins, &gems); err != nil {
		t.Fatal(err)
	}
	return
}

// C24 (server-room)
func TestStart_RackBoostsCoins(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "level = 10")
	check := func(name string, level int, rack []string, coins, xp, gems, seconds int) {
		t.Helper()
		reset(t, env)
		equip(t, env, rack...)
		t0 := env.Clock.Now()
		if rec := start(env, c, "backend", level); rec.Code != http.StatusCreated {
			t.Fatalf("%s: %d %s", name, rec.Code, rec.Body.String())
		}
		ends, gotXP, gotCoins, gotGems := stored(t, env)
		if gotCoins != coins || gotXP != xp || gotGems != gems || !ends.Equal(t0.Add(time.Duration(seconds)*time.Second)) {
			t.Errorf("%s: coins %d xp %d gems %d ends T+%s, want %d, %d, %d, T+%ds",
				name, gotCoins, gotXP, gotGems, ends.Sub(t0), coins, xp, gems, seconds)
		}
	}
	check("NV.1 no rack", 1, nil, 40, 80, 0, 900)
	check("NV.1 one lb", 1, []string{"lb"}, 48, 80, 0, 900)
	check("NV.1 one ssd (43.2)", 1, []string{"ssd"}, 43, 80, 0, 900)
	check("NV.1 six lb (55.6)", 1, times("lb", 6), 56, 80, 0, 900)
	check("NV.2 six lb (97.3)", 2, times("lb", 6), 97, 150, 1, 1800)

	// The claim pays what was stored.
	setPlayer(t, env, "coins = 0")
	env.Clock.Advance(1800 * time.Second)
	rec := claim(env, c, "backend")
	if rec.Code != http.StatusOK {
		t.Fatalf("claim: %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[claimBody](t, rec)
	if got.Reward.Coins != 97 || got.Player.Coins != 97 {
		t.Errorf("claim: reward coins %d player coins %d, want 97 and 97", got.Reward.Coins, got.Player.Coins)
	}
}

// C25 (server-room)
func TestDeploy_RackFrozenAtStart(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "coins = 10000")
	equip(t, env, "lb")
	if rec := start(env, c, "backend", 1); rec.Code != http.StatusCreated {
		t.Fatalf("start: %d %s", rec.Code, rec.Body.String())
	}
	if _, _, coins, _ := stored(t, env); coins != 48 {
		t.Fatalf("start: coins %d, want 48", coins)
	}
	post := func(path string, body any) {
		t.Helper()
		if rec := env.Do(http.MethodPost, path, body, c); rec.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", path, rec.Code, rec.Body.String())
		}
	}
	post("/api/me/rack/0/remove", nil)
	for range 6 {
		post("/api/me/rack", map[string]string{"component": "lb"})
	}
	if _, _, coins, _ := stored(t, env); coins != 48 {
		t.Fatalf("after changing the rack: coins %d, want 48", coins)
	}
	env.Clock.Advance(900 * time.Second)
	rec := claim(env, c, "backend")
	if rec.Code != http.StatusOK {
		t.Fatalf("claim: %d %s", rec.Code, rec.Body.String())
	}
	if got := apptest.Decode[claimBody](t, rec).Reward.Coins; got != 48 {
		t.Errorf("reward coins = %d, want 48", got)
	}
}
