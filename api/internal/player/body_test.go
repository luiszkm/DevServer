package player_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"devserver/api/internal/apptest"
	"devserver/api/internal/catalog"
)

type bodyPlayer struct {
	Body       string            `json:"body"`
	Appearance map[string]string `json:"appearance"`
}

func wantDefaults(body string) map[string]string {
	m := map[string]string{}
	for k, v := range catalog.Default().Avatar.Defaults {
		m[k] = v
	}
	if body == "feminino" {
		m["hair"] = "hair_longo"
	}
	return m
}

// Body contract: POST /api/players refuses a missing or unknown body with 422 unknown_body and
// creates nothing.
func TestCreatePlayer_UnknownBody(t *testing.T) {
	env := apptest.New(t)
	for i, body := range []map[string]string{
		{"devName": "DEV_01", "class": "BACKEND"},
		{"devName": "DEV_01", "class": "BACKEND", "body": ""},
		{"devName": "DEV_01", "class": "BACKEND", "body": "outro"},
		{"devName": "DEV_01", "class": "BACKEND", "body": "FEMININO"},
	} {
		rec := env.Do(http.MethodPost, "/api/players", body, env.Session(int64(i+1), "u"))
		if rec.Code != http.StatusUnprocessableEntity || apptest.ErrorCode(t, rec) != "unknown_body" {
			t.Errorf("%v: %d %s, want 422 unknown_body", body, rec.Code, rec.Body.String())
		}
	}
	if n := env.Count("players"); n != 0 {
		t.Fatalf("players = %d, want 0", n)
	}
}

// Body contract: each catalog body creates a player of that body, wearing that body's defaults,
// and GET /api/me reads it back.
func TestCreatePlayer_EachBody(t *testing.T) {
	env := apptest.New(t)
	for i, body := range []string{"masculino", "feminino"} {
		c := env.Session(int64(i+1), "u")
		rec := env.Do(http.MethodPost, "/api/players", map[string]string{"devName": fmt.Sprintf("DEV_%02d", i), "class": "BACKEND", "body": body}, c)
		if rec.Code != http.StatusCreated {
			t.Fatalf("%s: status %d %s", body, rec.Code, rec.Body.String())
		}
		for _, got := range []bodyPlayer{
			apptest.Decode[struct{ Player bodyPlayer }](t, rec).Player,
			apptest.Decode[struct{ Player bodyPlayer }](t, env.Do(http.MethodGet, "/api/me", nil, c)).Player,
		} {
			if got.Body != body {
				t.Errorf("%s: body = %q", body, got.Body)
			}
			if !reflect.DeepEqual(got.Appearance, wantDefaults(body)) {
				t.Errorf("%s: appearance = %v, want %v", body, got.Appearance, wantDefaults(body))
			}
		}
	}
}

// Body contract: a row stored before bodies existed (no body written) reads as masculino.
func TestPlayer_LegacyRowIsMasculino(t *testing.T) {
	env := apptest.New(t)
	if _, err := env.Pool.Exec(context.Background(), `INSERT INTO players (github_user_id, dev_name, class, level, xp,
		xp_max, hp, hp_max, coins, gems, skill_points, region, skin, appearance)
		VALUES (7, 'OLD_DEV', 'BACKEND', 1, 0, 500, 100, 100, 100, 20, 1, 'vila', 'default', '{"beard": "beard_cheia"}')`); err != nil {
		t.Fatal(err)
	}
	rec := env.Do(http.MethodGet, "/api/me", nil, env.Session(7, "old"))
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
	got := apptest.Decode[struct{ Player bodyPlayer }](t, rec).Player
	want := wantDefaults("masculino")
	want["beard"] = "beard_cheia"
	if got.Body != "masculino" || !reflect.DeepEqual(got.Appearance, want) {
		t.Fatalf("legacy player = %+v, want masculino wearing %v", got, want)
	}
}

// Body contract: players.body accepts only the two catalog bodies.
func TestPlayers_BodyConstraint(t *testing.T) {
	env := apptest.New(t)
	env.NewPlayer(1, "DEV_01", "BACKEND")
	_, err := env.Pool.Exec(context.Background(), `UPDATE players SET body = 'outro'`)
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23514" {
		t.Fatalf("body = 'outro': err %v, want check_violation 23514", err)
	}
	if _, err := env.Pool.Exec(context.Background(), `UPDATE players SET body = 'feminino'`); err != nil {
		t.Fatalf("body = 'feminino': %v", err)
	}
}
