package deploy_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
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

type deployBody struct {
	Type      string `json:"type"`
	Level     int    `json:"level"`
	StartedAt string `json:"startedAt"`
	EndsAt    string `json:"endsAt"`
	Ready     bool   `json:"ready"`
}

type startBody struct {
	Player     *apptest.PlayerBody `json:"-"`
	Deploy     deployBody          `json:"deploy"`
	ServerTime string              `json:"serverTime"`
}

type listBody struct {
	ServerTime string       `json:"serverTime"`
	Deploys    []deployBody `json:"deploys"`
}

type claimBody struct {
	apptest.PlayerBody
	Reward struct {
		XP           int `json:"xp"`
		Coins        int `json:"coins"`
		Gems         int `json:"gems"`
		LevelsGained int `json:"levelsGained"`
	} `json:"reward"`
}

func stamp(t time.Time) string { return t.UTC().Format(time.RFC3339) }

func start(env *apptest.Env, c *http.Cookie, typ string, level any) *httptest.ResponseRecorder {
	body := map[string]any{"type": typ}
	if level != nil {
		body["level"] = level
	}
	return env.Do(http.MethodPost, "/api/me/deploys", body, c)
}

func claim(env *apptest.Env, c *http.Cookie, typ string) *httptest.ResponseRecorder {
	return env.Do(http.MethodPost, "/api/me/deploys/"+typ+"/claim", nil, c)
}

func setPlayer(t *testing.T, env *apptest.Env, set string) {
	t.Helper()
	if _, err := env.Pool.Exec(context.Background(), "UPDATE players SET "+set); err != nil {
		t.Fatal(err)
	}
}

func activeJobs(t *testing.T, env *apptest.Env) int {
	t.Helper()
	var n int
	if err := env.Pool.QueryRow(context.Background(),
		`SELECT count(*) FROM deploy_jobs WHERE collected_at IS NULL`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func mustStatus(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if rec.Code != status {
		t.Fatalf("status %d body %s, want %d %s", rec.Code, rec.Body.String(), status, code)
	}
	if code != "" && apptest.ErrorCode(t, rec) != code {
		t.Fatalf("code %s, want %s", apptest.ErrorCode(t, rec), code)
	}
}

// C1
func TestStart_CreatesJobWithCatalogDuration(t *testing.T) {
	env := apptest.New(t)
	for level, minutes := range map[int]int{1: 15, 2: 30, 3: 60, 4: 180, 5: 360} {
		c := env.NewPlayer(int64(level), fmt.Sprintf("DEV_%02d", level), "BACKEND")
		if _, err := env.Pool.Exec(context.Background(), `UPDATE players SET level = 15 WHERE github_user_id = $1`, level); err != nil {
			t.Fatal(err)
		}
		now := env.Clock.Now()
		rec := start(env, c, "backend", level)
		mustStatus(t, rec, http.StatusCreated, "")
		b := apptest.Decode[startBody](t, rec)
		want := deployBody{Type: "backend", Level: level, StartedAt: stamp(now), EndsAt: stamp(now.Add(time.Duration(minutes) * time.Minute))}
		if b.Deploy != want {
			t.Errorf("level %d: deploy %+v, want %+v", level, b.Deploy, want)
		}
		if b.ServerTime != stamp(now) {
			t.Errorf("level %d: serverTime %s, want %s", level, b.ServerTime, stamp(now))
		}
		if p := apptest.Decode[apptest.PlayerBody](t, rec).Player; p.DevName == "" {
			t.Errorf("level %d: no player in response: %s", level, rec.Body.String())
		}
	}
}

// C2
func TestStart_SameTypeRunning(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	mustStatus(t, start(env, c, "backend", 1), http.StatusConflict, "deploy_running")
	if n := activeJobs(t, env); n != 1 {
		t.Fatalf("active jobs = %d, want 1", n)
	}
}

// C3
func TestStart_LevelBoundary(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "level = 2")
	mustStatus(t, start(env, c, "backend", 2), http.StatusUnprocessableEntity, "level_too_low")
	setPlayer(t, env, "level = 3")
	mustStatus(t, start(env, c, "backend", 2), http.StatusCreated, "")
}

// C4
func TestStart_UnknownType(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "blockchain", 1), http.StatusUnprocessableEntity, "unknown_deploy_type")
	if n := env.Count("deploy_jobs"); n != 0 {
		t.Fatalf("jobs = %d, want 0", n)
	}
}

// C5
func TestStart_UnknownLevel(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "level = 15")
	for name, level := range map[string]any{"0": 0, "6": 6, "-1": -1, "absent": nil} {
		rec := start(env, c, "backend", level)
		if rec.Code != 422 || apptest.ErrorCode(t, rec) != "unknown_deploy_level" {
			t.Errorf("level %s: %d %s, want 422 unknown_deploy_level", name, rec.Code, rec.Body.String())
		}
	}
	if n := env.Count("deploy_jobs"); n != 0 {
		t.Fatalf("jobs = %d, want 0", n)
	}
}

func concurrently(n int, fn func(i int) string) []string {
	var wg sync.WaitGroup
	gate := make(chan struct{})
	out := make([]string, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-gate
			out[i] = fn(i)
		}(i)
	}
	close(gate)
	wg.Wait()
	sort.Strings(out)
	return out
}

func result(t *testing.T, rec *httptest.ResponseRecorder) string {
	if rec.Code >= 400 {
		return fmt.Sprintf("%d %s", rec.Code, apptest.ErrorCode(t, rec))
	}
	return fmt.Sprintf("%d", rec.Code)
}

// C6
func TestStart_ConcurrentSameType(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	got := concurrently(10, func(int) string { return result(t, start(env, c, "mobile", 1)) })
	want := []string{"201"}
	for i := 0; i < 9; i++ {
		want = append(want, "409 deploy_running")
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("results %v, want 1x 201 and 9x 409 deploy_running", got)
	}
	if n := activeJobs(t, env); n != 1 {
		t.Fatalf("active jobs = %d, want 1", n)
	}
}

// C7
func TestStart_AllFiveTypes(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	for _, typ := range []string{"backend", "frontend", "mobile", "database", "microservices"} {
		mustStatus(t, start(env, c, typ, 1), http.StatusCreated, "")
	}
	if n := activeJobs(t, env); n != 5 {
		t.Fatalf("active jobs = %d, want 5", n)
	}
}

// C8
func TestDeployJobs_OneActivePerType(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	ctx := context.Background()
	insert := `INSERT INTO deploy_jobs (player_id, type, level, started_at, ends_at, xp, coins, gems)
		SELECT id, 'backend', 1, now(), now(), 1, 1, 1 FROM players`
	_, err := env.Pool.Exec(ctx, insert)
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		t.Fatalf("second active job: err %v, want unique_violation", err)
	}
	if _, err := env.Pool.Exec(ctx, `UPDATE deploy_jobs SET collected_at = now()`); err != nil {
		t.Fatal(err)
	}
	if _, err := env.Pool.Exec(ctx, insert); err != nil {
		t.Fatalf("insert after collecting: %v", err)
	}
}

// C9
func TestDeployRoutes_SessionAndPlayer(t *testing.T) {
	env := apptest.New(t)
	ghost := env.Session(99, "ghost")
	routes := []struct {
		method, path string
		body         any
	}{
		{http.MethodPost, "/api/me/deploys", map[string]any{"type": "backend", "level": 1}},
		{http.MethodGet, "/api/me/deploys", nil},
		{http.MethodPost, "/api/me/deploys/backend/claim", nil},
	}
	for _, rt := range routes {
		if rec := env.Do(rt.method, rt.path, rt.body); rec.Code != 401 || apptest.ErrorCode(t, rec) != "unauthenticated" {
			t.Errorf("%s %s without session: %d %s", rt.method, rt.path, rec.Code, rec.Body.String())
		}
		if rec := env.Do(rt.method, rt.path, rt.body, ghost); rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
			t.Errorf("%s %s without player: %d %s", rt.method, rt.path, rec.Code, rec.Body.String())
		}
	}
}

// C10
func TestList_ActiveJobs(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	now := env.Clock.Now()
	mustStatus(t, start(env, c, "frontend", 1), http.StatusCreated, "")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	mustStatus(t, claim(env, c, "backend"), http.StatusOK, "")

	rec := env.Do(http.MethodGet, "/api/me/deploys", nil, c)
	mustStatus(t, rec, http.StatusOK, "")
	b := apptest.Decode[listBody](t, rec)
	if b.ServerTime != stamp(env.Clock.Now()) {
		t.Errorf("serverTime %s, want %s", b.ServerTime, stamp(env.Clock.Now()))
	}
	want := []deployBody{{Type: "frontend", Level: 1, StartedAt: stamp(now), EndsAt: stamp(now.Add(15 * time.Minute)), Ready: true}}
	if !reflect.DeepEqual(b.Deploys, want) {
		t.Fatalf("deploys %+v, want %+v (collected backend must not appear)", b.Deploys, want)
	}
	var raw map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &raw)
	for _, key := range []string{"type", "level", "startedAt", "endsAt", "ready"} {
		if _, ok := raw["deploys"].([]any)[0].(map[string]any)[key]; !ok {
			t.Errorf("deploy lacks %q", key)
		}
	}
}

// C11
func TestList_ReadyBoundary(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	ready := func() bool {
		b := apptest.Decode[listBody](t, env.Do(http.MethodGet, "/api/me/deploys", nil, c))
		return b.Deploys[0].Ready
	}
	env.Clock.Advance(13*time.Minute + 59*time.Second)
	if ready() {
		t.Fatal("ready 61s before endsAt")
	}
	env.Clock.Advance(61 * time.Second)
	if !ready() {
		t.Fatal("not ready at endsAt")
	}
}

// C25
func TestClaim_CreditsReward(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	rec := claim(env, c, "backend")
	mustStatus(t, rec, http.StatusOK, "")
	b := apptest.Decode[claimBody](t, rec)
	if b.Reward.XP != 80 || b.Reward.Coins != 40 || b.Reward.Gems != 0 {
		t.Errorf("reward %+v, want 80/40/0", b.Reward)
	}
	if b.Player.XP != 80 || b.Player.Coins != 140 || b.Player.Gems != 20 {
		t.Errorf("player xp %d coins %d gems %d, want 80 140 20", b.Player.XP, b.Player.Coins, b.Player.Gems)
	}
	var collected bool
	if err := env.Pool.QueryRow(context.Background(),
		`SELECT collected_at IS NOT NULL FROM deploy_jobs WHERE type = 'backend'`).Scan(&collected); err != nil {
		t.Fatalf("job row gone after claim: %v", err)
	}
	if !collected {
		t.Fatal("job not marked collected")
	}
}

// C26
func TestClaim_CreditsFrozenReward(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	if _, err := env.Pool.Exec(context.Background(), `UPDATE deploy_jobs SET xp = 999, coins = 7, gems = 3`); err != nil {
		t.Fatal(err)
	}
	env.Clock.Advance(15 * time.Minute)
	b := apptest.Decode[claimBody](t, claim(env, c, "backend"))
	if b.Reward.XP != 999 || b.Reward.Coins != 7 || b.Reward.Gems != 3 {
		t.Fatalf("reward %+v, want the stored 999/7/3", b.Reward)
	}
	if b.Player.Coins != 107 || b.Player.Gems != 23 {
		t.Fatalf("player coins %d gems %d, want 107 23", b.Player.Coins, b.Player.Gems)
	}
}

func playerRow(t *testing.T, env *apptest.Env) string {
	var s string
	if err := env.Pool.QueryRow(context.Background(), `SELECT players::text FROM players`).Scan(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

// C27
func TestClaim_NotReady(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	before := playerRow(t, env)
	env.Clock.Advance(15*time.Minute - time.Second)
	mustStatus(t, claim(env, c, "backend"), http.StatusConflict, "deploy_not_ready")
	if after := playerRow(t, env); after != before {
		t.Fatalf("player changed:\n%s\n%s", before, after)
	}
}

// C28
func TestClaim_NotFound(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, claim(env, c, "backend"), http.StatusNotFound, "deploy_not_found")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	mustStatus(t, claim(env, c, "backend"), http.StatusOK, "")
	mustStatus(t, claim(env, c, "backend"), http.StatusNotFound, "deploy_not_found")
}

// C29
func TestClaim_UnknownType(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, claim(env, c, "blockchain"), http.StatusUnprocessableEntity, "unknown_deploy_type")
}

// C31
func TestClaim_LevelUp(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setPlayer(t, env, "xp = 480, hp = 10")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	b := apptest.Decode[claimBody](t, claim(env, c, "backend"))
	p := b.Player
	if p.Level != 2 || p.XP != 60 || p.XPMax != 750 || p.SkillPoints != 2 || p.HP != 120 || p.HPMax != 120 {
		t.Fatalf("player %+v, want level 2, xp 60/750, 2 skill points, hp 120/120", p)
	}
	if b.Reward.LevelsGained != 1 {
		t.Fatalf("levelsGained = %d, want 1", b.Reward.LevelsGained)
	}
}

// C32
func TestClaim_ConcurrentOnce(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	got := concurrently(10, func(int) string { return result(t, claim(env, c, "backend")) })
	want := []string{"200"}
	for i := 0; i < 9; i++ {
		want = append(want, "404 deploy_not_found")
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("results %v, want 1x 200 and 9x 404 deploy_not_found", got)
	}
	var coins int
	if err := env.Pool.QueryRow(context.Background(), `SELECT coins FROM players`).Scan(&coins); err != nil {
		t.Fatal(err)
	}
	if coins != 140 {
		t.Fatalf("coins = %d, want 140 (credited once)", coins)
	}
}

// C33
func TestClaim_FreesType(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	mustStatus(t, claim(env, c, "backend"), http.StatusOK, "")
	mustStatus(t, start(env, c, "backend", 1), http.StatusCreated, "")
}

// C34
func TestClaim_LogsCollected(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	mustStatus(t, start(env, c, "frontend", 1), http.StatusCreated, "")
	env.Clock.Advance(15 * time.Minute)
	mustStatus(t, claim(env, c, "frontend"), http.StatusOK, "")
	var entry map[string]any
	for _, line := range strings.Split(env.Logs.String(), "\n") {
		if strings.Contains(line, `"msg":"deploy.collected"`) {
			_ = json.Unmarshal([]byte(line), &entry)
		}
	}
	want := map[string]any{"type": "frontend", "level": float64(1), "xp": float64(80), "coins": float64(40), "gems": float64(0)}
	if entry == nil {
		t.Fatalf("no deploy.collected log: %s", env.Logs.String())
	}
	for k, v := range want {
		if entry[k] != v {
			t.Errorf("log %s = %v, want %v", k, entry[k], v)
		}
	}
}

// C38
func TestDeployRoutes_UnexpectedError(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	if _, err := env.Pool.Exec(context.Background(), `ALTER TABLE deploy_jobs RENAME TO deploy_jobs_gone`); err != nil {
		t.Fatal(err)
	}
	for _, rt := range []struct {
		method, path string
		body         any
	}{
		{http.MethodGet, "/api/me/deploys", nil},
		{http.MethodPost, "/api/me/deploys", map[string]any{"type": "backend", "level": 1}},
		{http.MethodPost, "/api/me/deploys/backend/claim", nil},
	} {
		rec := env.Do(rt.method, rt.path, rt.body, c)
		if rec.Code != 500 || apptest.ErrorCode(t, rec) != "internal" {
			t.Errorf("%s %s: %d %s, want 500 internal", rt.method, rt.path, rec.Code, rec.Body.String())
			continue
		}
		if id := rec.Header().Get(httpx.RequestIDHeader); !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
			t.Errorf("%s %s: log lacks request id %s", rt.method, rt.path, id)
		}
	}
}

// C39
func TestStart_InvalidBody(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	for name, body := range map[string]string{
		"not json":          "{nope",
		"level as string":   `{"type":"backend","level":"1"}`,
		"level as fraction": `{"type":"backend","level":1.5}`,
		"type as number":    `{"type":7,"level":1}`,
	} {
		rec := env.Do(http.MethodPost, "/api/me/deploys", body, c)
		if rec.Code != 422 || apptest.ErrorCode(t, rec) != "invalid_body" {
			t.Errorf("%s: %d %s, want 422 invalid_body", name, rec.Code, rec.Body.String())
		}
	}
	if n := env.Count("deploy_jobs"); n != 0 {
		t.Fatalf("jobs = %d, want 0", n)
	}
}
