package skills_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"reflect"
	"testing"
	"time"

	"devserver/api/internal/apptest"
	"devserver/api/internal/db"
)

type loadoutPlayer struct {
	HP          int             `json:"hp"`
	HPMax       int             `json:"hpMax"`
	SkillPoints int             `json:"skillPoints"`
	Skills      []string        `json:"skills"`
	SkillLevels *map[string]int `json:"skillLevels"`
	Loadout     *[]*string      `json:"loadout"`
	Power       *int            `json:"power"`
}

func loadoutOf(t *testing.T, rec *httptest.ResponseRecorder) loadoutPlayer {
	t.Helper()
	var b struct {
		Player loadoutPlayer `json:"player"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("decode %s: %v", rec.Body.String(), err)
	}
	if b.Player.SkillLevels == nil || b.Player.Loadout == nil || b.Player.Power == nil {
		t.Fatalf("player lacks skillLevels, loadout or power: %s", rec.Body.String())
	}
	return b.Player
}

// slots renders a loadout as ids with "-" for an empty slot.
func slots(l []*string) []string {
	out := make([]string, len(l))
	for i, id := range l {
		out[i] = "-"
		if id != nil {
			out[i] = *id
		}
	}
	return out
}

func post(env *apptest.Env, c *http.Cookie, id, action string) *httptest.ResponseRecorder {
	return env.Do(http.MethodPost, "/api/me/skills/"+id+"/"+action, nil, c)
}

// devops unlocks do1..do<n> with plenty of points and returns the last response.
func devops(t *testing.T, env *apptest.Env, c *http.Cookie, n int) *httptest.ResponseRecorder {
	t.Helper()
	points(t, env, 20)
	var rec *httptest.ResponseRecorder
	for i := 1; i <= n; i++ {
		rec = unlock(env, c, fmt.Sprintf("do%d", i))
		mustStatus(t, rec, http.StatusOK, "")
	}
	return rec
}

// skill-loadout AC 3: every player carries skillLevels, a 4-slot loadout and power.
func TestPlayer_LoadoutShape(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "u")
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"}, c)
	mustStatus(t, rec, http.StatusCreated, "")
	for _, r := range []*httptest.ResponseRecorder{rec, env.Do(http.MethodGet, "/api/me", nil, c)} {
		p := loadoutOf(t, r)
		if len(*p.SkillLevels) != 0 || !reflect.DeepEqual(slots(*p.Loadout), []string{"-", "-", "-", "-"}) || *p.Power != 0 {
			t.Fatalf("new player skillLevels %v loadout %v power %d, want {} [- - - -] 0", *p.SkillLevels, slots(*p.Loadout), *p.Power)
		}
	}
	if _, err := env.Pool.Exec(context.Background(), `UPDATE players SET power = 70`); err != nil {
		t.Fatal(err)
	}
	if p := loadoutOf(t, env.Do(http.MethodGet, "/api/me", nil, c)); *p.Power != 70 {
		t.Fatalf("power = %d, want 70", *p.Power)
	}
}

// skill-loadout AC 6: unlocking equips in the first free slot; with 4 equipped it stays out.
func TestUnlock_AutoEquipsUntilFull(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	p := loadoutOf(t, devops(t, env, c, 4))
	if got := slots(*p.Loadout); !reflect.DeepEqual(got, []string{"do1", "do2", "do3", "do4"}) {
		t.Fatalf("loadout = %v, want do1..do4", got)
	}
	if p.HP != 159 || p.HPMax != 159 {
		t.Fatalf("hp %d/%d, want 159/159 (100 + 15 + 12 + 18 + 14)", p.HP, p.HPMax)
	}
	mustStatus(t, unlock(env, c, "do5"), http.StatusOK, "")
	p = loadoutOf(t, unlock(env, c, "do6"))
	if got := slots(*p.Loadout); !reflect.DeepEqual(got, []string{"do1", "do2", "do3", "do4"}) {
		t.Fatalf("loadout after 6 unlocks = %v, want do1..do4", got)
	}
	if p.HP != 159 || p.HPMax != 159 || p.SkillPoints != 14 {
		t.Fatalf("do6 unequipped: hp %d/%d points %d, want 159/159 and 14", p.HP, p.HPMax, p.SkillPoints)
	}
	if want := map[string]int{"do1": 1, "do2": 1, "do3": 1, "do4": 1, "do5": 1, "do6": 1}; !reflect.DeepEqual(*p.SkillLevels, want) {
		t.Fatalf("skillLevels = %v, want %v", *p.SkillLevels, want)
	}
	if got := loadoutOf(t, env.Do(http.MethodGet, "/api/me", nil, c)); !reflect.DeepEqual(slots(*got.Loadout), []string{"do1", "do2", "do3", "do4"}) {
		t.Fatalf("GET /api/me loadout = %v", slots(*got.Loadout))
	}
}

// skill-loadout AC 7, 9: unequip frees the slot and its HP; equip fills the first free slot.
func TestEquipUnequip_MovesSlotAndHP(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	devops(t, env, c, 6)
	p := loadoutOf(t, post(env, c, "do2", "unequip"))
	if got := slots(*p.Loadout); !reflect.DeepEqual(got, []string{"do1", "-", "do3", "do4"}) || p.HP != 147 || p.HPMax != 147 {
		t.Fatalf("after unequip do2: %v hp %d/%d, want [do1 - do3 do4] 147/147", got, p.HP, p.HPMax)
	}
	p = loadoutOf(t, post(env, c, "do6", "equip"))
	if got := slots(*p.Loadout); !reflect.DeepEqual(got, []string{"do1", "do6", "do3", "do4"}) || p.HP != 163 || p.HPMax != 163 {
		t.Fatalf("after equip do6: %v hp %d/%d, want [do1 do6 do3 do4] 163/163", got, p.HP, p.HPMax)
	}
	p = loadoutOf(t, env.Do(http.MethodGet, "/api/me", nil, c))
	if got := slots(*p.Loadout); !reflect.DeepEqual(got, []string{"do1", "do6", "do3", "do4"}) {
		t.Fatalf("GET /api/me loadout = %v", got)
	}
}

// skill-loadout AC 7, 9: equipping an equipped skill or removing an unequipped one changes nothing.
func TestEquipUnequip_Idempotent(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	devops(t, env, c, 5)
	before := playerRow(t, env)
	mustStatus(t, post(env, c, "do1", "equip"), http.StatusOK, "")
	mustStatus(t, post(env, c, "do5", "unequip"), http.StatusOK, "")
	if after := playerRow(t, env); !reflect.DeepEqual(before, after) {
		t.Fatalf("player changed:\n%v\n%v", before, after)
	}
	p := loadoutOf(t, post(env, c, "do5", "unequip"))
	if got := slots(*p.Loadout); !reflect.DeepEqual(got, []string{"do1", "do2", "do3", "do4"}) {
		t.Fatalf("loadout = %v", got)
	}
}

// skill-loadout AC 8
func TestEquip_LoadoutFull(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	devops(t, env, c, 5)
	before := playerRow(t, env)
	rec := post(env, c, "do5", "equip")
	mustStatus(t, rec, http.StatusConflict, "skill_loadout_full")
	var body struct {
		Error struct{ Message string } `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error.Message != "loadout cheio. remova uma habilidade antes" {
		t.Fatalf("message = %s", rec.Body.String())
	}
	if after := playerRow(t, env); !reflect.DeepEqual(before, after) {
		t.Fatal("player changed on a refused equip")
	}
}

// skill-loadout AC 9: HP never drops below 1 when an hp skill leaves the loadout.
func TestUnequip_KeepsHPAtLeastOne(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	devops(t, env, c, 1)
	if _, err := env.Pool.Exec(context.Background(), `UPDATE players SET hp = 10`); err != nil {
		t.Fatal(err)
	}
	p := loadoutOf(t, post(env, c, "do1", "unequip"))
	if p.HP != 1 || p.HPMax != 100 {
		t.Fatalf("hp %d/%d, want 1/100", p.HP, p.HPMax)
	}
}

// skill-loadout AC 10: level costs 2 then 3, at the exact boundary; level 3 is the last.
func TestUpgrade_CostsAndMaxLevel(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 1)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")

	points(t, env, 1)
	mustStatus(t, post(env, c, "be1", "upgrade"), http.StatusConflict, "no_skill_points")
	points(t, env, 2)
	p := loadoutOf(t, post(env, c, "be1", "upgrade"))
	if (*p.SkillLevels)["be1"] != 2 || p.SkillPoints != 0 {
		t.Fatalf("after level 2: level %d points %d, want 2 and 0", (*p.SkillLevels)["be1"], p.SkillPoints)
	}
	points(t, env, 2)
	mustStatus(t, post(env, c, "be1", "upgrade"), http.StatusConflict, "no_skill_points")
	points(t, env, 3)
	p = loadoutOf(t, post(env, c, "be1", "upgrade"))
	if (*p.SkillLevels)["be1"] != 3 || p.SkillPoints != 0 || p.HP != 100 || p.HPMax != 100 {
		t.Fatalf("after level 3: %+v", p)
	}
	points(t, env, 99)
	mustStatus(t, post(env, c, "be1", "upgrade"), http.StatusConflict, "skill_max_level")
	if row := playerRow(t, env); row["skill_points"].(float64) != 99 {
		t.Fatalf("skill_points = %v, want 99 after a refused upgrade", row["skill_points"])
	}
	if p := loadoutOf(t, env.Do(http.MethodGet, "/api/me", nil, c)); (*p.SkillLevels)["be1"] != 3 {
		t.Fatalf("stored level = %d, want 3", (*p.SkillLevels)["be1"])
	}
}

// skill-loadout AC 10: an equipped hp skill adds the difference between levels; unequipped adds nothing,
// and removing it later takes the level's full bonus.
func TestUpgrade_HPOfEquippedSkill(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	devops(t, env, c, 6)
	p := loadoutOf(t, post(env, c, "do1", "upgrade"))
	if p.HP != 167 || p.HPMax != 167 {
		t.Fatalf("do1 level 2 equipped: hp %d/%d, want 167/167 (159 + 23 - 15)", p.HP, p.HPMax)
	}
	p = loadoutOf(t, post(env, c, "do6", "upgrade"))
	if p.HP != 167 || p.HPMax != 167 {
		t.Fatalf("do6 level 2 unequipped: hp %d/%d, want 167/167", p.HP, p.HPMax)
	}
	p = loadoutOf(t, post(env, c, "do1", "unequip"))
	if p.HP != 144 || p.HPMax != 144 {
		t.Fatalf("unequip do1 at level 2: hp %d/%d, want 144/144", p.HP, p.HPMax)
	}
	p = loadoutOf(t, post(env, c, "do6", "equip"))
	if p.HP != 168 || p.HPMax != 168 {
		t.Fatalf("equip do6 at level 2: hp %d/%d, want 168/168 (144 + 24)", p.HP, p.HPMax)
	}
}

// skill-loadout AC 10: a non-hp skill's upgrade leaves HP alone.
func TestUpgrade_NonHPLeavesHP(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 3)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	before := playerRow(t, env)
	mustStatus(t, post(env, c, "be1", "upgrade"), http.StatusOK, "")
	after := playerRow(t, env)
	if after["skill_points"].(float64) != 0 {
		t.Fatalf("skill_points = %v, want 0", after["skill_points"])
	}
	delete(before, "skill_points")
	delete(after, "skill_points")
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("upgrade changed more than skill_points:\n%v\n%v", before, after)
	}
}

// skill-loadout AC 11: decision order for equip, unequip and upgrade.
func TestLoadoutRoutes_Order(t *testing.T) {
	for _, action := range []string{"equip", "unequip", "upgrade"} {
		env := apptest.New(t)
		c := env.NewPlayer(1, "DEV_01", "BACKEND")
		points(t, env, 0)
		mustStatus(t, post(env, c, "nope", action), http.StatusUnprocessableEntity, "unknown_skill")
		mustStatus(t, post(env, c, "fe1", action), http.StatusConflict, "skill_wrong_class")
		rec := post(env, c, "be1", action)
		mustStatus(t, rec, http.StatusConflict, "skill_not_unlocked")
		var body struct {
			Error struct{ Message string } `json:"error"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error.Message != "desbloqueie a habilidade primeiro" {
			t.Fatalf("%s message = %s", action, rec.Body.String())
		}
	}
	// upgrade: max level wins over missing points
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 1)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	if _, err := env.Pool.Exec(context.Background(), `UPDATE player_skills SET level = 3`); err != nil {
		t.Fatal(err)
	}
	mustStatus(t, post(env, c, "be1", "upgrade"), http.StatusConflict, "skill_max_level")
}

// skill-loadout AC 12: session, player and a failing write, per route.
func TestLoadoutRoutes_SessionPlayerAndWriteError(t *testing.T) {
	for _, action := range []string{"equip", "unequip", "upgrade"} {
		env := apptest.New(t)
		mustStatus(t, env.Do(http.MethodPost, "/api/me/skills/be1/"+action, nil), http.StatusUnauthorized, "unauthenticated")
		mustStatus(t, post(env, env.Session(9, "ghost"), "be1", action), http.StatusNotFound, "player_not_found")

		c := env.NewPlayer(1, "DEV_01", "BACKEND")
		points(t, env, 5)
		mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
		if action == "equip" {
			mustStatus(t, post(env, c, "be1", "unequip"), http.StatusOK, "")
		}
		ctx := context.Background()
		for _, stmt := range []string{
			`CREATE FUNCTION reject_skill() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'nope'; END $$`,
			`CREATE TRIGGER reject_skill BEFORE UPDATE ON player_skills FOR EACH ROW EXECUTE FUNCTION reject_skill()`,
		} {
			if _, err := env.Pool.Exec(ctx, stmt); err != nil {
				t.Fatal(err)
			}
		}
		before := playerRow(t, env)
		mustStatus(t, post(env, c, "be1", action), http.StatusInternalServerError, "internal")
		if after := playerRow(t, env); !reflect.DeepEqual(before, after) {
			t.Fatalf("%s: player changed after a failed write", action)
		}
	}
}

// skill-loadout AC 12: equip reads the loadout under the player's row lock.
func TestEquip_SerializesOnPlayerRowLock(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "DEVOPS")
	devops(t, env, c, 5)
	ctx := context.Background()
	tx, err := env.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT 1 FROM players WHERE github_user_id = 1 FOR UPDATE`); err != nil {
		t.Fatal(err)
	}
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { done <- post(env, c, "do5", "equip") }()
	select {
	case rec := <-done:
		t.Fatalf("equip answered %d while the row was locked", rec.Code)
	case <-time.After(500 * time.Millisecond):
	}
	if _, err := tx.Exec(ctx, `UPDATE player_skills SET slot = NULL WHERE skill_id = 'do2'`); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case rec := <-done:
		mustStatus(t, rec, http.StatusOK, "")
		if got := slots(*loadoutOf(t, rec).Loadout); !reflect.DeepEqual(got, []string{"do1", "do5", "do3", "do4"}) {
			t.Fatalf("loadout = %v, want do5 in the slot freed under the lock", got)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("equip did not finish after the lock was released")
	}
}

// skill-loadout AC 12: upgrade reads the points under the player's row lock.
func TestUpgrade_SerializesOnPlayerRowLock(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	ctx := context.Background()
	tx, err := env.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT 1 FROM players WHERE github_user_id = 1 FOR UPDATE`); err != nil {
		t.Fatal(err)
	}
	done := make(chan int, 1)
	go func() { done <- post(env, c, "be1", "upgrade").Code }()
	select {
	case code := <-done:
		t.Fatalf("upgrade answered %d while the row was locked", code)
	case <-time.After(500 * time.Millisecond):
	}
	if _, err := tx.Exec(ctx, `UPDATE players SET skill_points = 2 WHERE github_user_id = 1`); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case code := <-done:
		if code != http.StatusOK {
			t.Fatalf("upgrade after commit = %d, want 200", code)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("upgrade did not finish after the lock was released")
	}
}

// skill-loadout AC 5: the schema bounds level and slot and keeps one skill per slot.
func TestPlayerSkills_LoadoutConstraints(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 2)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	mustStatus(t, unlock(env, c, "be2"), http.StatusOK, "")
	ctx := context.Background()
	for _, stmt := range []string{
		`UPDATE player_skills SET level = 0 WHERE skill_id = 'be1'`,
		`UPDATE player_skills SET level = 4 WHERE skill_id = 'be1'`,
		`UPDATE player_skills SET slot = -1 WHERE skill_id = 'be1'`,
		`UPDATE player_skills SET slot = 4 WHERE skill_id = 'be1'`,
		`UPDATE player_skills SET slot = 1 WHERE skill_id = 'be1'`,
		`UPDATE players SET power = -1`,
	} {
		if _, err := env.Pool.Exec(ctx, stmt); err == nil {
			t.Errorf("%s: accepted, want a constraint violation", stmt)
		}
	}
	for _, stmt := range []string{
		`UPDATE player_skills SET level = 3 WHERE skill_id = 'be1'`,
		`UPDATE player_skills SET slot = 3 WHERE skill_id = 'be1'`,
		`UPDATE player_skills SET slot = NULL WHERE skill_id = 'be2'`,
	} {
		if _, err := env.Pool.Exec(ctx, stmt); err != nil {
			t.Errorf("%s: %v", stmt, err)
		}
	}
}

// skill-loadout AC 4: the migration equips what players already had and starts the bar at 0.
func TestMigration_EquipsExistingSkills(t *testing.T) {
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
	if err := db.MigrateTo(ctx, u.String(), 11); err != nil {
		t.Fatal(err)
	}
	pool, err := db.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	insert := func(name string, github int64, class string, skills ...string) {
		t.Helper()
		var id int64
		if err := pool.QueryRow(ctx, `INSERT INTO players (github_user_id, dev_name, class, level, xp, xp_max, hp, hp_max,
			coins, gems, skill_points, region, skin) VALUES ($1, $2, $3, 4, 0, 500, 115, 125, 0, 0, 2, 'vila', 'default')
			RETURNING id`, github, name, class).Scan(&id); err != nil {
			t.Fatal(err)
		}
		for _, skill := range skills {
			if _, err := pool.Exec(ctx, `INSERT INTO player_skills (player_id, skill_id) VALUES ($1, $2)`, id, skill); err != nil {
				t.Fatal(err)
			}
		}
	}
	insert("OLD_A", 1, "FRONTEND", "fe2", "fe1")
	insert("OLD_B", 2, "DEVOPS", "do3", "do1", "do2")
	insert("OLD_C", 3, "BACKEND")
	if err := db.MigrateTo(ctx, u.String(), 12); err != nil {
		t.Fatal(err)
	}
	rows, err := pool.Query(ctx, `SELECT p.dev_name || ':' || p.hp || '/' || p.hp_max || ':' || p.skill_points || ':' || p.power || ':' ||
		coalesce((SELECT string_agg(s.skill_id || '@' || s.level || '#' || s.slot, ',' ORDER BY s.slot) FROM player_skills s WHERE s.player_id = p.id), '')
		FROM players p ORDER BY p.dev_name`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			t.Fatal(err)
		}
		got = append(got, s)
	}
	want := []string{
		"OLD_A:115/125:2:0:fe1@1#0,fe2@1#1",
		"OLD_B:115/125:2:0:do1@1#0,do2@1#1,do3@1#2",
		"OLD_C:115/125:2:0:",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("after migration = %v, want %v", got, want)
	}
}
