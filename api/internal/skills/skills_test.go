package skills_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"devserver/api/internal/apptest"
	"devserver/api/internal/httpx"
)

func skillsOf(t *testing.T, rec *httptest.ResponseRecorder) []string {
	t.Helper()
	var raw struct {
		Player struct {
			Skills *[]string `json:"skills"`
		} `json:"player"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decode %s: %v", rec.Body.String(), err)
	}
	if raw.Player.Skills == nil {
		t.Fatalf("player.skills missing or null: %s", rec.Body.String())
	}
	return *raw.Player.Skills
}

func unlock(env *apptest.Env, c *http.Cookie, id string) *httptest.ResponseRecorder {
	return env.Do(http.MethodPost, "/api/me/skills/"+id+"/unlock", nil, c)
}

func points(t *testing.T, env *apptest.Env, n int) {
	t.Helper()
	if _, err := env.Pool.Exec(context.Background(), `UPDATE players SET skill_points = $1`, n); err != nil {
		t.Fatal(err)
	}
}

func mustStatus(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if rec.Code != status || (code != "" && apptest.ErrorCode(t, rec) != code) {
		t.Fatalf("status %d body %s, want %d %s", rec.Code, rec.Body.String(), status, code)
	}
}

func playerRow(t *testing.T, env *apptest.Env) map[string]any {
	t.Helper()
	var raw []byte
	if err := env.Pool.QueryRow(context.Background(), `SELECT row_to_json(p) FROM players p`).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	return m
}

// C1
func TestUnlock_SpendsPointAndRecords(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	rec := unlock(env, c, "be1")
	mustStatus(t, rec, http.StatusOK, "")
	if p := apptest.Decode[apptest.PlayerBody](t, rec).Player; p.SkillPoints != 0 {
		t.Errorf("skillPoints = %d, want 0", p.SkillPoints)
	}
	if got := skillsOf(t, rec); !reflect.DeepEqual(got, []string{"be1"}) {
		t.Errorf("skills = %v, want [be1]", got)
	}
	if n := env.Count("player_skills"); n != 1 {
		t.Errorf("player_skills rows = %d, want 1", n)
	}
}

// C2
func TestUnlock_HPBonus(t *testing.T) {
	chains := []struct {
		class string
		steps []struct {
			id    string
			bonus int
		}
	}{
		{"FRONTEND", []struct {
			id    string
			bonus int
		}{{"fe1", 0}, {"fe2", 10}}},
		{"DEVOPS", []struct {
			id    string
			bonus int
		}{{"do1", 15}, {"do2", 12}, {"do3", 18}}},
		{"FULLSTACK", []struct {
			id    string
			bonus int
		}{{"fs1", 0}, {"fs2", 0}, {"fs3", 10}}},
	}
	for i, chain := range chains {
		env := apptest.New(t)
		c := env.NewPlayer(int64(i+1), fmt.Sprintf("DEV_%02d", i+1), chain.class)
		points(t, env, 10)
		hp, hpMax := 100, 100
		for _, step := range chain.steps {
			rec := unlock(env, c, step.id)
			mustStatus(t, rec, http.StatusOK, "")
			hp, hpMax = hp+step.bonus, hpMax+step.bonus
			p := apptest.Decode[apptest.PlayerBody](t, rec).Player
			if p.HP != hp || p.HPMax != hpMax {
				t.Errorf("%s after %s: hp %d/%d, want %d/%d", chain.class, step.id, p.HP, p.HPMax, hp, hpMax)
			}
		}
	}
}

// C3
func TestUnlock_NonHPBonus(t *testing.T) {
	chains := []struct {
		class string
		ids   []string
	}{
		{"FRONTEND", []string{"fe1", "fe2", "fe3"}},
		{"BACKEND", []string{"be1", "be2", "be3"}},
		{"FULLSTACK", []string{"fs1", "fs2"}},
	}
	nonHP := map[string]bool{"fe1": true, "fe3": true, "be1": true, "be2": true, "be3": true, "fs1": true, "fs2": true}
	for i, chain := range chains {
		env := apptest.New(t)
		c := env.NewPlayer(int64(i+1), fmt.Sprintf("DEV_%02d", i+1), chain.class)
		points(t, env, 5)
		for _, id := range chain.ids {
			before := playerRow(t, env)
			mustStatus(t, unlock(env, c, id), http.StatusOK, "")
			if !nonHP[id] {
				continue
			}
			after := playerRow(t, env)
			if after["skill_points"].(float64) != before["skill_points"].(float64)-1 {
				t.Errorf("%s: skill_points %v -> %v, want -1", id, before["skill_points"], after["skill_points"])
			}
			delete(before, "skill_points")
			delete(after, "skill_points")
			if !reflect.DeepEqual(before, after) {
				t.Errorf("%s changed more than skill_points:\n%v\n%v", id, before, after)
			}
		}
	}
}

// C4
func TestUnlock_PreviousRequired(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 3)
	mustStatus(t, unlock(env, c, "be2"), http.StatusConflict, "skill_locked")
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	mustStatus(t, unlock(env, c, "be3"), http.StatusConflict, "skill_locked")
	if p := playerRow(t, env); p["skill_points"].(float64) != 2 {
		t.Fatalf("skill_points = %v, want 2 (only be1 charged)", p["skill_points"])
	}
}

// C5
func TestUnlock_AlreadyUnlocked(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 3)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	mustStatus(t, unlock(env, c, "be1"), http.StatusConflict, "skill_already_unlocked")
	if p := playerRow(t, env); p["skill_points"].(float64) != 2 {
		t.Fatalf("skill_points = %v, want 2", p["skill_points"])
	}
}

// C6
func TestUnlock_NoPoints(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 0)
	mustStatus(t, unlock(env, c, "be1"), http.StatusConflict, "no_skill_points")
	if n := env.Count("player_skills"); n != 0 {
		t.Fatalf("player_skills rows = %d, want 0", n)
	}
}

// C7
func TestUnlock_UnknownSkill(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, unlock(env, c, "x9"), http.StatusUnprocessableEntity, "unknown_skill")
}

// C8
func TestUnlock_ConcurrentOnce(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 3)
	var wg sync.WaitGroup
	gate := make(chan struct{})
	out := make([]string, 10)
	for i := range out {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-gate
			rec := unlock(env, c, "be1")
			out[i] = fmt.Sprint(rec.Code)
			if rec.Code >= 400 {
				out[i] += " " + apptest.ErrorCode(t, rec)
			}
		}(i)
	}
	close(gate)
	wg.Wait()
	sort.Strings(out)
	want := []string{"200"}
	for i := 0; i < 9; i++ {
		want = append(want, "409 skill_already_unlocked")
	}
	if !reflect.DeepEqual(out, want) {
		t.Fatalf("results %v, want 1x 200 and 9x 409 skill_already_unlocked", out)
	}
	if p := playerRow(t, env); p["skill_points"].(float64) != 2 {
		t.Fatalf("skill_points = %v, want 2", p["skill_points"])
	}
}

// C9
func TestPlayerSkills_UniquePerNode(t *testing.T) {
	env := apptest.New(t)
	env.NewPlayer(1, "DEV_01", "BACKEND")
	insert := `INSERT INTO player_skills (player_id, skill_id) SELECT id, 'f1' FROM players`
	if _, err := env.Pool.Exec(context.Background(), insert); err != nil {
		t.Fatal(err)
	}
	_, err := env.Pool.Exec(context.Background(), insert)
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		t.Fatalf("duplicate (player, node): err %v, want unique_violation", err)
	}
}

// C10
func TestPlayerSkills_InEveryPlayerInCatalogOrder(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "u")
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"}, c)
	mustStatus(t, rec, http.StatusCreated, "")
	if got := skillsOf(t, rec); len(got) != 0 {
		t.Fatalf("new player skills = %v, want []", got)
	}
	if got := skillsOf(t, env.Do(http.MethodGet, "/api/me", nil, c)); len(got) != 0 {
		t.Fatalf("GET /api/me skills = %v, want []", got)
	}
	points(t, env, 2)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	rec = unlock(env, c, "be2")
	mustStatus(t, rec, http.StatusOK, "")
	want := []string{"be1", "be2"}
	if got := skillsOf(t, rec); !reflect.DeepEqual(got, want) {
		t.Errorf("unlock response skills = %v, want %v", got, want)
	}
	if got := skillsOf(t, env.Do(http.MethodGet, "/api/me", nil, c)); !reflect.DeepEqual(got, want) {
		t.Errorf("GET /api/me skills = %v, want %v", got, want)
	}
	if got := skillsOf(t, env.Do(http.MethodPost, "/api/me/travel", map[string]string{"region": "floresta"}, c)); !reflect.DeepEqual(got, want) {
		t.Errorf("travel skills = %v, want %v", got, want)
	}
}

// C11
func TestUnlockRoute_SessionPlayerAndUnexpected(t *testing.T) {
	env := apptest.New(t)
	mustStatus(t, env.Do(http.MethodPost, "/api/me/skills/be1/unlock", nil), http.StatusUnauthorized, "unauthenticated")
	mustStatus(t, unlock(env, env.Session(9, "ghost"), "be1"), http.StatusNotFound, "player_not_found")

	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	if _, err := env.Pool.Exec(context.Background(), `ALTER TABLE player_skills RENAME TO player_skills_gone`); err != nil {
		t.Fatal(err)
	}
	rec := unlock(env, c, "be1")
	mustStatus(t, rec, http.StatusInternalServerError, "internal")
	if id := rec.Header().Get(httpx.RequestIDHeader); !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
		t.Fatalf("log lacks request id %s", id)
	}
}

// C26
func TestUnlock_SerializesOnPlayerRowLock(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 0)
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
	go func() { done <- unlock(env, c, "be1").Code }()
	select {
	case code := <-done:
		t.Fatalf("unlock answered %d while the row was locked", code)
	case <-time.After(500 * time.Millisecond):
	}
	if _, err := tx.Exec(ctx, `UPDATE players SET skill_points = 1 WHERE github_user_id = 1`); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case code := <-done:
		if code != http.StatusOK {
			t.Fatalf("unlock after commit = %d, want 200 (it must read the point granted under the lock)", code)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("unlock did not finish after the lock was released")
	}
}

// C28
func TestMe_SkillsLoadError(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	if _, err := env.Pool.Exec(context.Background(), `ALTER TABLE player_skills RENAME TO player_skills_gone`); err != nil {
		t.Fatal(err)
	}
	rec := env.Do(http.MethodGet, "/api/me", nil, c)
	mustStatus(t, rec, http.StatusInternalServerError, "internal")
	if id := rec.Header().Get(httpx.RequestIDHeader); !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
		t.Fatalf("log lacks request id %s", id)
	}
}

// C29
func TestUnlock_InsertError(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()
	for _, stmt := range []string{
		`CREATE FUNCTION reject_skill() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'nope'; END $$`,
		`CREATE TRIGGER reject_skill BEFORE INSERT ON player_skills FOR EACH ROW EXECUTE FUNCTION reject_skill()`,
	} {
		if _, err := env.Pool.Exec(ctx, stmt); err != nil {
			t.Fatal(err)
		}
	}
	before := playerRow(t, env)
	mustStatus(t, unlock(env, c, "be1"), http.StatusInternalServerError, "internal")
	if after := playerRow(t, env); !reflect.DeepEqual(before, after) {
		t.Fatalf("player changed after a failed unlock:\n%v\n%v", before, after)
	}
}

func TestUnlock_OwnClassFirstNode(t *testing.T) {
	for i, tc := range []struct{ class, id string }{
		{"FRONTEND", "fe1"}, {"BACKEND", "be1"}, {"DEVOPS", "do1"}, {"FULLSTACK", "fs1"},
	} {
		env := apptest.New(t)
		c := env.NewPlayer(int64(i+1), fmt.Sprintf("DEV_%02d", i+1), tc.class)
		rec := unlock(env, c, tc.id)
		mustStatus(t, rec, http.StatusOK, "")
		if p := apptest.Decode[apptest.PlayerBody](t, rec).Player; p.SkillPoints != 0 {
			t.Errorf("%s: skillPoints = %d, want 0", tc.class, p.SkillPoints)
		}
		if got := skillsOf(t, rec); !reflect.DeepEqual(got, []string{tc.id}) {
			t.Errorf("%s: skills = %v, want [%s]", tc.class, got, tc.id)
		}
		if n := env.Count("player_skills"); n != 1 {
			t.Errorf("%s: player_skills rows = %d, want 1", tc.class, n)
		}
	}
}

func TestUnlock_WrongClass(t *testing.T) {
	first := map[string]string{"FRONTEND": "fe1", "BACKEND": "be1", "DEVOPS": "do1", "FULLSTACK": "fs1"}
	second := map[string]string{"FRONTEND": "fe2", "BACKEND": "be2", "DEVOPS": "do2", "FULLSTACK": "fs2"}
	classes := []string{"FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"}
	n := 0
	for _, class := range classes {
		for _, other := range classes {
			if other == class {
				continue
			}
			n++
			env := apptest.New(t)
			c := env.NewPlayer(int64(n), fmt.Sprintf("DEV_%02d", n), class)
			points(t, env, 0)
			before := playerRow(t, env)
			rec := unlock(env, c, first[other])
			mustStatus(t, rec, http.StatusConflict, "skill_wrong_class")
			var body struct {
				Error struct{ Message string } `json:"error"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Error.Message != "essa habilidade é de outra classe" {
				t.Fatalf("%s unlocking %s: message %q", class, first[other], rec.Body.String())
			}
			if after := playerRow(t, env); !reflect.DeepEqual(before, after) || env.Count("player_skills") != 0 {
				t.Fatalf("%s unlocking %s changed the player", class, first[other])
			}
		}
	}
	if n != 12 {
		t.Fatalf("pairs = %d, want 12", n)
	}
	env := apptest.New(t)
	c := env.NewPlayer(99, "DEV_99", "BACKEND")
	points(t, env, 0)
	mustStatus(t, unlock(env, c, second["FRONTEND"]), http.StatusConflict, "skill_wrong_class")
}

func TestUnlock_Order(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	points(t, env, 0)
	mustStatus(t, unlock(env, c, "nope"), http.StatusUnprocessableEntity, "unknown_skill")
	mustStatus(t, unlock(env, c, "fe1"), http.StatusConflict, "skill_wrong_class")

	points(t, env, 1)
	mustStatus(t, unlock(env, c, "be1"), http.StatusOK, "")
	points(t, env, 0)
	mustStatus(t, unlock(env, c, "be1"), http.StatusConflict, "skill_already_unlocked")

	env = apptest.New(t)
	c = env.NewPlayer(2, "DEV_02", "BACKEND")
	points(t, env, 0)
	mustStatus(t, unlock(env, c, "be2"), http.StatusConflict, "skill_locked")
	mustStatus(t, unlock(env, c, "be1"), http.StatusConflict, "no_skill_points")
}

func TestState_AD018(t *testing.T) {
	raw, err := os.ReadFile("../../../.specs/STATE.md")
	if err != nil {
		t.Fatal(err)
	}
	var row string
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.Contains(line, "AD-018") {
			row = line
		}
	}
	if row == "" || !strings.Contains(row, "única trilha") || !strings.Contains(row, "active") || !strings.Contains(row, "pontos") || !strings.Contains(row, "HP") {
		t.Fatalf("AD-018 row = %q", row)
	}
}
