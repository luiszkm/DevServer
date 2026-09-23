package world_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"devserver/api/internal/apptest"
)

func setLevel(t *testing.T, env *apptest.Env, level int) {
	if _, err := env.Pool.Exec(context.Background(), `UPDATE players SET level = $1`, level); err != nil {
		t.Fatal(err)
	}
}

func region(t *testing.T, env *apptest.Env) string {
	var r string
	if err := env.Pool.QueryRow(context.Background(), `SELECT region FROM players`).Scan(&r); err != nil {
		t.Fatal(err)
	}
	return r
}

func travel(env *apptest.Env, c *http.Cookie, to string) *httptest.ResponseRecorder {
	return env.Do(http.MethodPost, "/api/me/travel", map[string]string{"region": to}, c)
}

// C35
func TestTravel_AtMinLevel(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	setLevel(t, env, 2)
	rec := travel(env, c, "mercado")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s, want 200", rec.Code, rec.Body.String())
	}
	if got := apptest.Decode[apptest.PlayerBody](t, rec).Player.Region; got != "mercado" {
		t.Fatalf("response region = %q, want mercado", got)
	}
	if got := region(t, env); got != "mercado" {
		t.Fatalf("stored region = %q, want mercado", got)
	}
}

// C36
func TestTravel_LevelTooLow(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	rec := travel(env, c, "mercado")
	if rec.Code != 422 || apptest.ErrorCode(t, rec) != "level_too_low" {
		t.Fatalf("%d %s, want 422 level_too_low", rec.Code, rec.Body.String())
	}
	if got := region(t, env); got != "vila" {
		t.Fatalf("region = %q, want vila", got)
	}
}

// C37
func TestTravel_UnknownRegion(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	rec := travel(env, c, "marte")
	if rec.Code != 422 || apptest.ErrorCode(t, rec) != "unknown_region" {
		t.Fatalf("%d %s, want 422 unknown_region", rec.Code, rec.Body.String())
	}
	if got := region(t, env); got != "vila" {
		t.Fatalf("region = %q, want vila", got)
	}
}

// C42
func TestTravel_SerializesOnPlayerRowLock(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	ctx := context.Background()

	tx, err := env.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT 1 FROM players WHERE github_user_id = 1 FOR UPDATE`); err != nil {
		t.Fatal(err)
	}

	// mercado needs level 2: the travel only succeeds if it reads the player after the lock.
	done := make(chan int, 1)
	go func() { done <- travel(env, c, "mercado").Code }()

	select {
	case code := <-done:
		t.Fatalf("travel answered %d while the row was locked", code)
	case <-time.After(500 * time.Millisecond):
	}
	if _, err := tx.Exec(ctx, `UPDATE players SET level = 2 WHERE github_user_id = 1`); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	select {
	case code := <-done:
		if code != http.StatusOK {
			t.Fatalf("travel after commit = %d, want 200", code)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("travel did not finish after the lock was released")
	}
}

// C43
func TestTravel_ConcurrentRequests(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	var wg sync.WaitGroup
	codes := make([]int, 20)
	for i := range codes {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			to := "vila"
			if i%2 == 1 {
				to = "floresta"
			}
			codes[i] = travel(env, c, to).Code
		}(i)
	}
	wg.Wait()
	for i, code := range codes {
		if code != http.StatusOK {
			t.Errorf("request %d = %d, want 200", i, code)
		}
	}
	if r := region(t, env); r != "vila" && r != "floresta" {
		t.Fatalf("final region = %q", r)
	}
}
