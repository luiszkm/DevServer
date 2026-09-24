package deploy_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"

	"devserver/api/internal/apptest"
	"devserver/api/internal/catalog"
)

// furnish replaces the player's room with furniture on the floor, positions 0, 1, ...
func furnish(t *testing.T, env *apptest.Env, ids ...string) {
	t.Helper()
	ctx := context.Background()
	if _, err := env.Pool.Exec(ctx, `DELETE FROM player_office`); err != nil {
		t.Fatal(err)
	}
	for i, id := range ids {
		if _, err := env.Pool.Exec(ctx, `INSERT INTO player_office (player_id, zone, position, furniture_id)
			SELECT id, 'piso', $1, $2 FROM players`, i, id); err != nil {
			t.Fatal(err)
		}
	}
}

func times(id string, n int) []string {
	s := make([]string, n)
	for i := range s {
		s[i] = id
	}
	return s
}

// job is the stored end and xp of the one active deploy.
func job(t *testing.T, env *apptest.Env) (time.Time, int) {
	t.Helper()
	var ends time.Time
	var xp int
	if err := env.Pool.QueryRow(context.Background(),
		`SELECT ends_at, xp FROM deploy_jobs WHERE collected_at IS NULL`).Scan(&ends, &xp); err != nil {
		t.Fatal(err)
	}
	return ends, xp
}

func reset(t *testing.T, env *apptest.Env) {
	t.Helper()
	if _, err := env.Pool.Exec(context.Background(), `DELETE FROM deploy_jobs`); err != nil {
		t.Fatal(err)
	}
}

// C22 (office)
func TestStart_OfficeCutsDuration(t *testing.T) {
	check := func(env *apptest.Env, c *http.Cookie, name string, level int, furniture []string, seconds int) {
		t.Helper()
		reset(t, env)
		furnish(t, env, furniture...)
		t0 := env.Clock.Now()
		rec := start(env, c, "backend", level)
		if rec.Code != http.StatusCreated {
			t.Fatalf("%s: %d %s", name, rec.Code, rec.Body.String())
		}
		want := t0.Add(time.Duration(seconds) * time.Second)
		if got := apptest.Decode[startBody](t, rec).Deploy.EndsAt; got != stamp(want) {
			t.Errorf("%s: endsAt = %s, want %s (T+%ds)", name, got, stamp(want), seconds)
		}
		if ends, _ := job(t, env); !ends.Equal(want) {
			t.Errorf("%s: stored ends_at = %s, want %s", name, stamp(ends), stamp(want))
		}
	}

	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "level = 10")
	check(env, c, "NV.1 no furniture", 1, nil, 900)
	check(env, c, "NV.1 one setup2", 1, []string{"setup2"}, 855)
	check(env, c, "NV.1 setup2 + rack", 1, []string{"setup2", "rack"}, 801)
	check(env, c, "NV.1 8 setup2", 1, times("setup2", 8), 540)
	check(env, c, "NV.4 8 setup2", 4, times("setup2", 8), 6480)

	// Every real level is a multiple of 15 minutes, so rounding needs a 1-minute level.
	short := apptest.NewWithCatalog(t, func(cat *catalog.Catalog) { cat.DeployLevels[0].Minutes = 1 })
	sc := short.NewPlayer(1, "DEV_01", "BACKEND")
	check(short, sc, "1 min, 11% (53.4 s)", 1, []string{"setup2", "rack"}, 53)
	check(short, sc, "1 min, 12% (52.8 s)", 1, []string{"rack", "rack"}, 53)
}

// C23 (office)
func TestStart_OfficeBoostsXP(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	for _, tc := range []struct {
		furniture []string
		xp        int
	}{
		{nil, 80},
		{[]string{"mesa"}, 82},
		{[]string{"mesa", "estante"}, 84},
		{[]string{"mesa", "estante", "kanban"}, 86},
	} {
		reset(t, env)
		furnish(t, env, tc.furniture...)
		if tc.furniture != nil && tc.furniture[len(tc.furniture)-1] == "kanban" {
			// kanban hangs on the wall.
			if _, err := env.Pool.Exec(context.Background(), `UPDATE player_office SET zone = 'parede', position = 0 WHERE furniture_id = 'kanban'`); err != nil {
				t.Fatal(err)
			}
		}
		setPlayer(t, env, "xp = 0, coins = 0, gems = 0")
		t0 := env.Clock.Now()
		if rec := start(env, c, "backend", 1); rec.Code != http.StatusCreated {
			t.Fatalf("%v: %d %s", tc.furniture, rec.Code, rec.Body.String())
		}
		var xp, coins, gems int
		if err := env.Pool.QueryRow(context.Background(),
			`SELECT xp, coins, gems FROM deploy_jobs WHERE collected_at IS NULL`).Scan(&xp, &coins, &gems); err != nil {
			t.Fatal(err)
		}
		if xp != tc.xp || coins != 40 || gems != 0 {
			t.Errorf("%v: stored xp %d coins %d gems %d, want %d, 40, 0", tc.furniture, xp, coins, gems, tc.xp)
		}
		ends, _ := job(t, env)
		env.Clock.Advance(ends.Sub(t0))
		rec := claim(env, c, "backend")
		if rec.Code != http.StatusOK {
			t.Fatalf("%v claim: %d %s", tc.furniture, rec.Code, rec.Body.String())
		}
		got := apptest.Decode[claimBody](t, rec)
		if got.Reward.XP != tc.xp || got.Reward.Coins != 40 || got.Reward.Gems != 0 {
			t.Errorf("%v: reward %+v, want xp %d coins 40 gems 0", tc.furniture, got.Reward, tc.xp)
		}
	}
}

// C24 (office)
func TestDeploy_OfficeFrozenAtStart(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "gems = 1000, coins = 1000")
	furnish(t, env, "setup2")
	t0 := env.Clock.Now()
	if rec := start(env, c, "backend", 1); rec.Code != http.StatusCreated {
		t.Fatalf("start: %d %s", rec.Code, rec.Body.String())
	}
	endsBefore, xpBefore := job(t, env)
	if !endsBefore.Equal(t0.Add(855*time.Second)) || xpBefore != 80 {
		t.Fatalf("start: ends %s xp %d, want T+855s and 80", stamp(endsBefore), xpBefore)
	}

	post := func(path string, body any) {
		t.Helper()
		if rec := env.Do(http.MethodPost, path, body, c); rec.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", path, rec.Code, rec.Body.String())
		}
	}
	post("/api/me/office/piso/0/remove", nil)
	post("/api/me/office/piso/0", map[string]string{"furniture": "mesa"})
	for i := 1; i <= 8; i++ {
		post(fmt.Sprintf("/api/me/office/piso/%d", i), map[string]string{"furniture": "setup2"})
	}
	if ends, xp := job(t, env); !ends.Equal(endsBefore) || xp != xpBefore {
		t.Fatalf("after moving furniture: ends %s xp %d, want %s and %d", stamp(ends), xp, stamp(endsBefore), xpBefore)
	}

	env.Clock.Advance(855 * time.Second)
	rec := claim(env, c, "backend")
	if rec.Code != http.StatusOK {
		t.Fatalf("claim at T+855s: %d %s", rec.Code, rec.Body.String())
	}
	if got := apptest.Decode[claimBody](t, rec).Reward.XP; got != 80 {
		t.Errorf("reward xp = %d, want 80", got)
	}
}
