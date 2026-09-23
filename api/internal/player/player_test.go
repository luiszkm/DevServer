package player_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"devserver/api/internal/apptest"
)

func create(env *apptest.Env, c *http.Cookie, devName, class string) (int, string) {
	rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": devName, "class": class}, c)
	code := ""
	if rec.Code >= 400 {
		code = apptest.ErrorCode(env.T, rec)
	}
	return rec.Code, code
}

// C12
func TestOnboarding_SuggestsDevName(t *testing.T) {
	env := apptest.New(t)
	cases := map[string]string{
		"octocat":              "OCTOCAT",
		"my-name.dev":          "MY_NAME_DEV",
		"abcdefghijklmnopqrst": "ABCDEFGHIJKLMNOP",
	}
	i := int64(0)
	for login, want := range cases {
		i++
		rec := env.Do(http.MethodGet, "/api/onboarding", nil, env.Session(i, login))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: status %d", login, rec.Code)
		}
		got := apptest.Decode[struct {
			SuggestedDevName string   `json:"suggestedDevName"`
			Classes          []string `json:"classes"`
		}](t, rec)
		if got.SuggestedDevName != want {
			t.Errorf("%s: suggested %q, want %q", login, got.SuggestedDevName, want)
		}
		if !reflect.DeepEqual(got.Classes, []string{"FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"}) {
			t.Errorf("classes = %v", got.Classes)
		}
	}
}

// C14
func TestCreatePlayer_InitialState(t *testing.T) {
	env := apptest.New(t)
	for i, class := range []string{"FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"} {
		name := fmt.Sprintf("DEV_%02d", i)
		rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": name, "class": class},
			env.Session(int64(i+1), "u"))
		if rec.Code != http.StatusCreated {
			t.Fatalf("%s: status %d body %s", class, rec.Code, rec.Body.String())
		}
		p := apptest.Decode[apptest.PlayerBody](t, rec).Player
		want := apptest.PlayerBody{}.Player
		want.DevName, want.Class = name, class
		want.Level, want.XP, want.XPMax, want.HP, want.HPMax = 1, 0, 500, 100, 100
		want.Coins, want.Gems, want.SkillPoints, want.Region, want.Skin = 100, 20, 1, "vila", "default"
		if p != want {
			t.Errorf("%s: player = %+v, want %+v", class, p, want)
		}
	}
}

// C15
func TestCreatePlayer_DevNameBounds(t *testing.T) {
	env := apptest.New(t)
	id := int64(0)
	next := func() *http.Cookie { id++; return env.Session(id, "u") }

	for _, name := range []string{"AB", "ABCDEFGHIJKLMNOPQ", "DEV-01", "DÉV_01", ""} {
		if status, code := create(env, next(), name, "BACKEND"); status != 422 || code != "invalid_dev_name" {
			t.Errorf("%q: %d %s, want 422 invalid_dev_name", name, status, code)
		}
	}
	if n := env.Count("players"); n != 0 {
		t.Fatalf("rejected names created %d players", n)
	}

	for name, stored := range map[string]string{"ABC": "ABC", "ABCDEFGHIJKLMNOP": "ABCDEFGHIJKLMNOP", "dev_01": "DEV_01"} {
		rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": name, "class": "BACKEND"}, next())
		if rec.Code != http.StatusCreated {
			t.Errorf("%q: status %d, want 201", name, rec.Code)
			continue
		}
		if got := apptest.Decode[apptest.PlayerBody](t, rec).Player.DevName; got != stored {
			t.Errorf("%q stored as %q, want %q", name, got, stored)
		}
	}
}

// C16
func TestCreatePlayer_DevNameTakenCaseInsensitive(t *testing.T) {
	env := apptest.New(t)
	env.NewPlayer(1, "DEV_01", "BACKEND")
	if status, code := create(env, env.Session(2, "other"), "dev_01", "FRONTEND"); status != 409 || code != "dev_name_taken" {
		t.Fatalf("%d %s, want 409 dev_name_taken", status, code)
	}
}

// C17
func TestCreatePlayer_InvalidClass(t *testing.T) {
	env := apptest.New(t)
	if status, code := create(env, env.Session(1, "u"), "DEV_01", "WIZARD"); status != 422 || code != "invalid_class" {
		t.Fatalf("%d %s, want 422 invalid_class", status, code)
	}
	if n := env.Count("players"); n != 0 {
		t.Fatalf("players = %d, want 0", n)
	}
}

// C18
func TestCreatePlayer_PlayerExists(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	row := func() string {
		var s string
		if err := env.Pool.QueryRow(context.Background(), `SELECT players::text FROM players`).Scan(&s); err != nil {
			t.Fatal(err)
		}
		return s
	}
	before := row()
	if status, code := create(env, c, "DEV_02", "FRONTEND"); status != 409 || code != "player_exists" {
		t.Fatalf("%d %s, want 409 player_exists", status, code)
	}
	if after := row(); after != before {
		t.Fatalf("player changed:\nbefore %s\nafter  %s", before, after)
	}
}

func concurrently(n int, fn func(i int) string) []string {
	var wg sync.WaitGroup
	start := make(chan struct{})
	out := make([]string, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			out[i] = fn(i)
		}(i)
	}
	close(start)
	wg.Wait()
	sort.Strings(out)
	return out
}

// C20
func TestCreatePlayer_ConcurrentSameUser(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "u")
	results := concurrently(10, func(i int) string {
		status, code := create(env, c, fmt.Sprintf("DEV_%02d", i), "BACKEND")
		return fmt.Sprintf("%d %s", status, code)
	})
	want := []string{"201 "}
	for i := 0; i < 9; i++ {
		want = append(want, "409 player_exists")
	}
	if !reflect.DeepEqual(results, want) {
		t.Fatalf("results = %v, want 1x 201 and 9x 409 player_exists", results)
	}
	if n := env.Count("players"); n != 1 {
		t.Fatalf("players = %d, want 1", n)
	}
}

// C21
func TestCreatePlayer_ConcurrentSameName(t *testing.T) {
	env := apptest.New(t)
	cookies := []*http.Cookie{env.Session(1, "a"), env.Session(2, "b")}
	names := []string{"DEV_01", "dev_01"}
	results := concurrently(2, func(i int) string {
		status, code := create(env, cookies[i], names[i], "BACKEND")
		return fmt.Sprintf("%d %s", status, code)
	})
	if !reflect.DeepEqual(results, []string{"201 ", "409 dev_name_taken"}) {
		t.Fatalf("results = %v, want one 201 and one 409 dev_name_taken", results)
	}
}

// C22
func TestMe_ReturnsSessionPlayer(t *testing.T) {
	env := apptest.New(t)
	a := env.NewPlayer(1, "ALPHA", "BACKEND")
	b := env.NewPlayer(2, "BRAVO", "DEVOPS")
	for want, c := range map[string]*http.Cookie{"ALPHA": a, "BRAVO": b} {
		rec := env.Do(http.MethodGet, "/api/me", nil, c)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: status %d", want, rec.Code)
		}
		if got := apptest.Decode[apptest.PlayerBody](t, rec).Player.DevName; got != want {
			t.Errorf("session of %s got player %s", want, got)
		}
	}
}

// C38
func TestPlayerNotFound_OnPlayerRoutes(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "ghost")
	for name, rec := range map[string]*httptest.ResponseRecorder{
		"GET /api/me":         env.Do(http.MethodGet, "/api/me", nil, c),
		"POST /api/me/travel": env.Do(http.MethodPost, "/api/me/travel", map[string]string{"region": "vila"}, c),
	} {
		if rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found" {
			t.Errorf("%s: %d %s, want 404 player_not_found", name, rec.Code, rec.Body.String())
		}
	}
}

// C44
func TestPlayers_NonNegativeCurrencyConstraint(t *testing.T) {
	env := apptest.New(t)
	env.NewPlayer(1, "DEV_01", "BACKEND")
	for _, col := range []string{"coins", "gems"} {
		_, err := env.Pool.Exec(context.Background(), "UPDATE players SET "+col+" = -1")
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "23514" {
			t.Errorf("%s = -1: err %v, want check_violation 23514", col, err)
		}
	}
}
