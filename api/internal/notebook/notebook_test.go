package notebook_test

import (
	"context"
	"encoding/json"
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

	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/app"
	"devserver/api/internal/apptest"
	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/db"
	"devserver/api/internal/player"
)

func zeroUpgrades() map[string]int {
	return map[string]int{"cpu_turbo": 0, "bateria": 0, "ssd_nvme": 0, "rede_5g": 0}
}

type body struct {
	Player struct {
		Coins     int                `json:"coins"`
		HP        int                `json:"hp"`
		HPMax     int                `json:"hpMax"`
		Gear      []string           `json:"gear"`
		Notebook  player.Notebook    `json:"notebook"`
		Equipment map[string]*string `json:"equipment"`
	} `json:"player"`
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) body {
	t.Helper()
	return apptest.Decode[body](t, rec)
}

func message(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var e struct {
		Error struct{ Message string }
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &e); err != nil {
		t.Fatal(err)
	}
	return e.Error.Message
}

func me(t *testing.T, env *apptest.Env, c *http.Cookie) body {
	t.Helper()
	rec := env.Do(http.MethodGet, "/api/me", nil, c)
	if rec.Code != 200 {
		t.Fatalf("GET /api/me: %d %s", rec.Code, rec.Body.String())
	}
	return decode(t, rec)
}

func TestMe_NotebookDefaults(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "user")
	created := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"}, c)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	want := player.Notebook{Level: 1, Rarity: "basico", Upgrades: zeroUpgrades()}
	if got := decode(t, created).Player.Notebook; !reflect.DeepEqual(got, want) {
		t.Fatalf("create notebook = %+v, want %+v", got, want)
	}
	if got := me(t, env, c).Player.Notebook; !reflect.DeepEqual(got, want) {
		t.Fatalf("GET notebook = %+v, want %+v", got, want)
	}
}

func TestEnhance_PaysLevelsAndHP(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	env.Pool.Exec(context.Background(), `UPDATE players SET coins = 1000, hp = 90, hp_max = 100`)
	rec := env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
	if rec.Code != 200 {
		t.Fatalf("enhance: %d %s", rec.Code, rec.Body.String())
	}
	got := decode(t, rec).Player
	if got.Notebook.Level != 2 || got.Notebook.Rarity != "basico" || got.Coins != 900 || got.HP != 95 || got.HPMax != 105 {
		t.Fatalf("nv1→2: level %d rarity %s coins %d hp %d/%d, want 2 basico 900 95/105", got.Notebook.Level, got.Notebook.Rarity, got.Coins, got.HP, got.HPMax)
	}
	env.Pool.Exec(context.Background(), `UPDATE players SET notebook_level = 3, coins = 1000, hp = 100, hp_max = 100`)
	rec = env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
	got = decode(t, rec).Player
	if rec.Code != 200 || got.Notebook.Level != 4 || got.Notebook.Rarity != "raro" || got.Coins != 750 || got.HP != 105 || got.HPMax != 105 {
		t.Fatalf("nv3→4: %d level %d rarity %s coins %d hp %d/%d, want 200 4 raro 750 105/105", rec.Code, got.Notebook.Level, got.Notebook.Rarity, got.Coins, got.HP, got.HPMax)
	}
}

func TestEnhance_BalanceBoundary(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	env.Pool.Exec(ctx, `UPDATE players SET notebook_level = 3, coins = 249, hp = 100, hp_max = 100`)
	rec := env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "not_enough_coins" {
		t.Fatalf("249 coins: %d %s", rec.Code, rec.Body.String())
	}
	after := me(t, env, c).Player
	if after.Notebook.Level != 3 || after.Coins != 249 || after.HP != 100 || after.HPMax != 100 {
		t.Fatalf("refused enhance changed the player: %+v", after)
	}
	env.Pool.Exec(ctx, `UPDATE players SET coins = 250`)
	rec = env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
	got := decode(t, rec).Player
	if rec.Code != 200 || got.Notebook.Level != 4 || got.Coins != 0 {
		t.Fatalf("250 coins: %d level %d coins %d, want 200 level 4 coins 0", rec.Code, got.Notebook.Level, got.Coins)
	}
}

func TestEnhance_MaxLevelBeforeCoins(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	env.Pool.Exec(context.Background(), `UPDATE players SET notebook_level = 10, coins = 0, hp = 80, hp_max = 80`)
	before := me(t, env, c).Player
	rec := env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "notebook_max_level" || message(t, rec) != "o notebook já está no nível máximo" {
		t.Fatalf("max: %d %s", rec.Code, rec.Body.String())
	}
	after := me(t, env, c).Player
	if after.Notebook.Level != before.Notebook.Level || after.Coins != before.Coins || after.HP != before.HP {
		t.Fatalf("max level changed the player: %+v", after.Notebook)
	}
}

func TestNotebook_LevelAboveCatalog(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	env.Pool.Exec(context.Background(), `UPDATE players SET notebook_level = 12, coins = 0`)
	got := me(t, env, c).Player
	if got.Notebook.Level != 12 || got.Notebook.Rarity != "lendario" {
		t.Fatalf("level %d rarity %s, want 12 lendario", got.Notebook.Level, got.Notebook.Rarity)
	}
	cat := catalog.Default()
	p := &player.Player{Notebook: got.Notebook, Skin: "default"}
	if d, h := player.Bonus(cat, p, "dmg"), player.Bonus(cat, p, "hp"); d != 10 || h != 50 {
		t.Fatalf("bonus dmg %d hp %d, want 10 and 50", d, h)
	}
	rec := env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "notebook_max_level" {
		t.Fatalf("enhance above catalog: %d %s", rec.Code, rec.Body.String())
	}
}

func TestUpgrade_PaysAndLevels(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	env.Pool.Exec(ctx, `UPDATE players SET coins = 1000, hp = 90, hp_max = 100`)
	rec := env.Do(http.MethodPost, "/api/me/notebook/upgrades/cpu_turbo", nil, c)
	got := decode(t, rec).Player
	if rec.Code != 200 || got.Notebook.Upgrades["cpu_turbo"] != 1 || got.Coins != 700 {
		t.Fatalf("cpu: %d level %d coins %d, want 200 1 700", rec.Code, got.Notebook.Upgrades["cpu_turbo"], got.Coins)
	}
	rec = env.Do(http.MethodPost, "/api/me/notebook/upgrades/bateria", nil, c)
	got = decode(t, rec).Player
	if rec.Code != 200 || got.Notebook.Upgrades["bateria"] != 1 || got.HP != 100 || got.HPMax != 110 {
		t.Fatalf("bateria 0→1: %d level %d hp %d/%d, want 200 1 100/110", rec.Code, got.Notebook.Upgrades["bateria"], got.HP, got.HPMax)
	}
	env.Pool.Exec(ctx, `UPDATE players SET notebook_level = 4, coins = 400, hp = 100, hp_max = 110`)
	rec = env.Do(http.MethodPost, "/api/me/notebook/upgrades/bateria", nil, c)
	got = decode(t, rec).Player
	if rec.Code != 200 || got.Notebook.Upgrades["bateria"] != 2 || got.HP != 110 || got.HPMax != 120 || got.Coins != 0 {
		t.Fatalf("bateria 1→2: %d level %d hp %d/%d coins %d, want 200 2 110/120 0", rec.Code, got.Notebook.Upgrades["bateria"], got.HP, got.HPMax, got.Coins)
	}
}

func TestUpgrade_ValidationOrder(t *testing.T) {
	env := apptest.New(t)
	ghost := env.Session(9, "ghost")
	rec := env.Do(http.MethodPost, "/api/me/notebook/upgrades/nao_existe", nil, ghost)
	if rec.Code != 422 || apptest.ErrorCode(t, rec) != "unknown_upgrade" || message(t, rec) != "upgrade desconhecido" {
		t.Fatalf("unknown: %d %s", rec.Code, rec.Body.String())
	}

	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	set := func(level, notebook, coins int) {
		t.Helper()
		if _, err := env.Pool.Exec(ctx, `DELETE FROM player_notebook_upgrades WHERE player_id IN (SELECT id FROM players)`); err != nil {
			t.Fatal(err)
		}
		if level > 0 {
			if _, err := env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) SELECT id, 'cpu_turbo', $1 FROM players`, level); err != nil {
				t.Fatal(err)
			}
		}
		if _, err := env.Pool.Exec(ctx, `UPDATE players SET notebook_level = $1, coins = $2, hp = 100, hp_max = 100`, notebook, coins); err != nil {
			t.Fatal(err)
		}
	}
	post := func() *httptest.ResponseRecorder {
		return env.Do(http.MethodPost, "/api/me/notebook/upgrades/cpu_turbo", nil, c)
	}
	set(3, 1, 0)
	rec = post()
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "upgrade_max_level" || message(t, rec) != "o upgrade já está no nível máximo" {
		t.Fatalf("max: %d %s", rec.Code, rec.Body.String())
	}
	if got := me(t, env, c).Player; got.Coins != 0 || got.Notebook.Level != 1 || got.Notebook.Upgrades["cpu_turbo"] != 3 {
		t.Fatalf("max changed the player: coins %d notebook %+v", got.Coins, got.Notebook)
	}
	set(1, 3, 0)
	rec = post()
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "notebook_level_too_low" || message(t, rec) != "aprimore o notebook para liberar este nível" {
		t.Fatalf("too low: %d %s", rec.Code, rec.Body.String())
	}
	set(1, 4, 499)
	rec = post()
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "not_enough_coins" {
		t.Fatalf("499: %d %s", rec.Code, rec.Body.String())
	}
	if got := me(t, env, c).Player; got.Coins != 499 || got.Notebook.Upgrades["cpu_turbo"] != 1 {
		t.Fatalf("short coins changed the player: %+v", got.Notebook)
	}
	if _, err := env.Pool.Exec(ctx, `UPDATE players SET coins = 500`); err != nil {
		t.Fatal(err)
	}
	rec = post()
	got := decode(t, rec).Player
	if rec.Code != 200 || got.Notebook.Upgrades["cpu_turbo"] != 2 || got.Coins != 0 {
		t.Fatalf("500: %d level %d coins %d, want 200 2 0", rec.Code, got.Notebook.Upgrades["cpu_turbo"], got.Coins)
	}
}

func TestUpgrade_Boundaries(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	buy := func(id string, notebook, have, coins int) *httptest.ResponseRecorder {
		t.Helper()
		env.Pool.Exec(ctx, `DELETE FROM player_notebook_upgrades`)
		if have > 0 {
			env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) SELECT id, $1, $2 FROM players`, id, have)
		}
		env.Pool.Exec(ctx, `UPDATE players SET notebook_level = $1, coins = $2`, notebook, coins)
		return env.Do(http.MethodPost, "/api/me/notebook/upgrades/"+id, nil, c)
	}
	if rec := buy("cpu_turbo", 3, 1, 0); rec.Code != 409 || apptest.ErrorCode(t, rec) != "notebook_level_too_low" {
		t.Fatalf("nv 3 → cpu 2: %d %s", rec.Code, rec.Body.String())
	}
	if rec := buy("cpu_turbo", 4, 1, 500); rec.Code != 200 || decode(t, rec).Player.Notebook.Upgrades["cpu_turbo"] != 2 {
		t.Fatalf("nv 4 → cpu 2: %d %s", rec.Code, rec.Body.String())
	}
	if rec := buy("rede_5g", 6, 2, 0); rec.Code != 409 || apptest.ErrorCode(t, rec) != "notebook_level_too_low" {
		t.Fatalf("nv 6 → rede 3: %d %s", rec.Code, rec.Body.String())
	}
	if rec := buy("rede_5g", 7, 2, 550); rec.Code != 200 || decode(t, rec).Player.Notebook.Upgrades["rede_5g"] != 3 {
		t.Fatalf("nv 7 → rede 3: %d %s", rec.Code, rec.Body.String())
	}
}

func TestMe_NotebookSkipsUpgradesOutsideCatalog(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) SELECT id, 'sumiu', 2 FROM players`)
	env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) SELECT id, 'bateria', 5 FROM players`)
	got := me(t, env, c).Player.Notebook
	want := zeroUpgrades()
	want["bateria"] = 5
	if !reflect.DeepEqual(got.Upgrades, want) {
		t.Fatalf("upgrades = %+v, want %+v", got.Upgrades, want)
	}
	rec := env.Do(http.MethodPost, "/api/me/notebook/upgrades/bateria", nil, c)
	if rec.Code != 409 || apptest.ErrorCode(t, rec) != "upgrade_max_level" {
		t.Fatalf("bateria 5: %d %s", rec.Code, rec.Body.String())
	}
}

func TestTables_NotebookConstraints(t *testing.T) {
	env := apptest.New(t)
	ctx := context.Background()
	env.NewPlayer(1, "DEV_01", "BACKEND")
	if _, err := env.Pool.Exec(ctx, `UPDATE players SET notebook_level = 0 WHERE github_user_id = 1`); err == nil {
		t.Fatal("notebook_level 0 was accepted")
	}
	var level int
	if err := env.Pool.QueryRow(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max, coins, gems, skill_points, region, skin)
		VALUES (9, 'NO_LEVEL', 'BACKEND', 1, 0, 500, 100, 100, 0, 0, 0, 'vila', 'default') RETURNING notebook_level`).Scan(&level); err != nil || level != 1 {
		t.Fatalf("default notebook_level = %d (%v), want 1", level, err)
	}
	var pid int64
	env.Pool.QueryRow(ctx, `SELECT id FROM players WHERE github_user_id = 9`).Scan(&pid)
	if _, err := env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) VALUES ($1, 'cpu_turbo', 0)`, pid); err == nil {
		t.Fatal("upgrade level 0 was accepted")
	}
	if _, err := env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) VALUES ($1, 'cpu_turbo', 1)`, pid); err != nil {
		t.Fatal(err)
	}
	if _, err := env.Pool.Exec(ctx, `INSERT INTO player_notebook_upgrades (player_id, upgrade_id, level) VALUES ($1, 'cpu_turbo', 2)`, pid); err == nil {
		t.Fatal("duplicate upgrade was accepted")
	}
	if _, err := env.Pool.Exec(ctx, `DELETE FROM players WHERE id = $1`, pid); err != nil {
		t.Fatal(err)
	}
	var n int
	env.Pool.QueryRow(ctx, `SELECT count(*) FROM player_notebook_upgrades WHERE player_id = $1`, pid).Scan(&n)
	if n != 0 {
		t.Fatalf("upgrades after delete = %d, want 0", n)
	}
}

func TestNotebookRoutes_NoPlayer(t *testing.T) {
	env := apptest.New(t)
	ghost := env.Session(9, "ghost")
	for _, path := range []string{"/api/me/notebook/enhance", "/api/me/notebook/upgrades/cpu_turbo"} {
		rec := env.Do(http.MethodPost, path, nil, ghost)
		if rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
			t.Errorf("%s: %d %s, want 404 player_not_found", path, rec.Code, rec.Body.String())
		}
	}
}

func TestNotebook_LoadFailure(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	env.Pool.Exec(context.Background(), `UPDATE players SET coins = 9999`)
	if _, err := env.Pool.Exec(context.Background(), `DROP TABLE player_notebook_upgrades`); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/api/me/notebook/enhance", "/api/me/notebook/upgrades/cpu_turbo"} {
		rec := env.Do(http.MethodPost, path, nil, c)
		if rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
			t.Errorf("%s: %d %s, want 500 internal", path, rec.Code, rec.Body.String())
		}
	}
	if rec := env.Do(http.MethodGet, "/api/me", nil, c); rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
		t.Fatalf("GET: %d %s, want 500 internal", rec.Code, rec.Body.String())
	}
	var coins int
	if err := env.Pool.QueryRow(context.Background(), `SELECT coins FROM players`).Scan(&coins); err != nil || coins != 9999 {
		t.Fatalf("coins = %d (%v), want 9999", coins, err)
	}
}

func TestEnhance_ConcurrentSerialize(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	env.Pool.Exec(ctx, `UPDATE players SET notebook_level = 1, coins = 0, hp = 100, hp_max = 100`)
	tx, err := env.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT 1 FROM players WHERE github_user_id = 1 FOR UPDATE`); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(ctx, `UPDATE players SET coins = 100 WHERE github_user_id = 1`); err != nil {
		t.Fatal(err)
	}
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { done <- env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c) }()
	select {
	case rec := <-done:
		t.Fatalf("enhance answered %d while the row was locked", rec.Code)
	case <-time.After(300 * time.Millisecond):
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case rec := <-done:
		got := decode(t, rec).Player
		if rec.Code != 200 || got.Notebook.Level != 2 || got.Coins != 0 {
			t.Fatalf("after the lock: %d level %d coins %d, want 200 2 0", rec.Code, got.Notebook.Level, got.Coins)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("enhance did not finish after the lock was released")
	}

	env.Pool.Exec(ctx, `UPDATE players SET notebook_level = 1, coins = 100`)
	var wg sync.WaitGroup
	recs := make([]*httptest.ResponseRecorder, 2)
	for i := range recs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			recs[i] = env.Do(http.MethodPost, "/api/me/notebook/enhance", nil, c)
		}()
	}
	wg.Wait()
	oks, codes := 0, []string{}
	for _, r := range recs {
		if r.Code == 200 {
			oks++
		} else if r.Code == 409 {
			codes = append(codes, apptest.ErrorCode(t, r))
		}
	}
	if oks != 1 || len(codes) != 1 || codes[0] != "not_enough_coins" {
		t.Fatalf("two enhances on 100 coins: %d ok, 409 %v", oks, codes)
	}
}

func TestMigration_NotebookExistingPlayers(t *testing.T) {
	pool, done := migrated(t, 14)
	defer done()
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max, coins, gems, skill_points, region, skin)
		VALUES (7, 'OLD_DEV', 'BACKEND', 4, 0, 500, 80, 120, 0, 0, 0, 'vila', 'default')`); err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(ctx, poolURL(t)); err != nil {
		t.Fatal(err)
	}
	got := playerOf(t, pool, 7).Player
	if got.Notebook.Level != 1 || got.Notebook.Rarity != "basico" || !reflect.DeepEqual(got.Notebook.Upgrades, zeroUpgrades()) || got.HP != 80 || got.HPMax != 120 {
		t.Fatalf("existing player = level %d rarity %s ups %+v hp %d/%d", got.Notebook.Level, got.Notebook.Rarity, got.Notebook.Upgrades, got.HP, got.HPMax)
	}
}

func TestMigration_NotebookSlotMoves(t *testing.T) {
	pool, done := migrated(t, 14)
	defer done()
	ctx := context.Background()
	insert := func(github int64, name string, hp, hpMax int) int64 {
		t.Helper()
		var id int64
		err := pool.QueryRow(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max, coins, gems, skill_points, region, skin)
			VALUES ($1, $2, 'BACKEND', 1, 0, 500, $3, $4, 0, 0, 0, 'vila', 'default') RETURNING id`, github, name, hp, hpMax).Scan(&id)
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	own := func(id int64, gear, slot string) {
		t.Helper()
		if _, err := pool.Exec(ctx, `INSERT INTO player_gear (player_id, gear_id) VALUES ($1, $2)`, id, gear); err != nil {
			t.Fatal(err)
		}
		if slot != "" {
			if _, err := pool.Exec(ctx, `INSERT INTO player_equipment (player_id, slot, gear_id) VALUES ($1, $2, $3)`, id, slot, gear); err != nil {
				t.Fatal(err)
			}
		}
	}
	a := insert(7, "MAC_DEV", 70, 100)
	own(a, "macbook", "notebook")
	b := insert(8, "MON_DEV", 100, 100)
	own(b, "monitor", "notebook")
	own(b, "fone", "acessorio")
	if err := db.Migrate(ctx, poolURL(t)); err != nil {
		t.Fatal(err)
	}
	mac := playerOf(t, pool, 7).Player
	if mac.HP != 70 || mac.HPMax != 100 || mac.Equipment["notebook"] != nil || mac.Equipment["acessorio"] == nil || *mac.Equipment["acessorio"] != "macbook" {
		t.Fatalf("macbook move: hp %d/%d equipment %+v", mac.HP, mac.HPMax, showEq(mac.Equipment))
	}
	mon := playerOf(t, pool, 8).Player
	held := map[string]bool{}
	for _, id := range mon.Gear {
		held[id] = true
	}
	inSlot := map[string]bool{}
	for _, id := range mon.Equipment {
		if id != nil {
			inSlot[*id] = true
		}
	}
	if mon.Equipment["acessorio"] == nil || *mon.Equipment["acessorio"] != "fone" || !held["monitor"] || inSlot["monitor"] {
		t.Fatalf("occupied acessorio: equipment %+v gear %v", showEq(mon.Equipment), mon.Gear)
	}
}

func showEq(m map[string]*string) string {
	var b strings.Builder
	for k, v := range m {
		if v != nil {
			fmt.Fprintf(&b, "%s=%s ", k, *v)
		}
	}
	return b.String()
}

var (
	migOnce sync.Mutex
	migURL  string
)

func poolURL(t *testing.T) string {
	t.Helper()
	migOnce.Lock()
	defer migOnce.Unlock()
	if migURL == "" {
		t.Fatal("migration url was not set")
	}
	return migURL
}

func migrated(t *testing.T, version int64) (*pgxpool.Pool, func()) {
	t.Helper()
	ctx := context.Background()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		base = "postgres://devserver:devserver@localhost:5433/devserver_test?sslmode=disable"
	}
	admin, err := db.Open(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	schema := fmt.Sprintf("m_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(base)
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	migOnce.Lock()
	migURL = u.String()
	migOnce.Unlock()
	if err := db.MigrateTo(ctx, u.String(), version); err != nil {
		t.Fatal(err)
	}
	pool, err := db.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	return pool, func() {
		pool.Close()
		admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
		admin.Close()
	}
}

func playerOf(t *testing.T, pool *pgxpool.Pool, github int64) body {
	t.Helper()
	ctx := context.Background()
	cat, err := catalog.Load()
	if err != nil {
		t.Fatal(err)
	}
	router := app.NewRouter(app.Deps{Pool: pool, Catalog: cat, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})
	token, err := auth.Sessions{Pool: pool}.Create(ctx, auth.Identity{GithubUserID: github, GithubLogin: "old"})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	req.AddCookie(&http.Cookie{Name: auth.SessionCookie, Value: token})
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("GET /api/me: %d %s", rec.Code, rec.Body.String())
	}
	return decode(t, rec)
}
