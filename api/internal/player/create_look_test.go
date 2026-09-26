package player_test

import (
	"context"
	"encoding/json"
	"net/http"
	"reflect"
	"testing"

	"devserver/api/internal/apptest"
)

type createdLook struct {
	Coins      int               `json:"coins"`
	Gems       int               `json:"gems"`
	Appearance map[string]string `json:"appearance"`
}

func createLook(t *testing.T, env *apptest.Env, body any) createdLook {
	t.Helper()
	rec := env.Do(http.MethodPost, "/api/players", body, env.Session(1, "u"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d %s, want 201", rec.Code, rec.Body.String())
	}
	return apptest.Decode[struct {
		Player createdLook `json:"player"`
	}](t, rec).Player
}

func storedAppearance(t *testing.T, env *apptest.Env) map[string]string {
	t.Helper()
	var raw []byte
	if err := env.Pool.QueryRow(context.Background(), `SELECT appearance FROM players`).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	got := map[string]string{}
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	return got
}

func meAppearance(t *testing.T, env *apptest.Env) map[string]string {
	t.Helper()
	rec := env.Do(http.MethodGet, "/api/me", nil, env.Session(1, "u"))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/me %d %s", rec.Code, rec.Body.String())
	}
	return apptest.Decode[struct {
		Player createdLook `json:"player"`
	}](t, rec).Player.Appearance
}

func refuseLook(t *testing.T, body string, appearance map[string]string, status int, code string) {
	t.Helper()
	env := apptest.New(t)
	rec := env.Do(http.MethodPost, "/api/players", map[string]any{
		"devName": "DEV_01", "class": "BACKEND", "body": body, "appearance": appearance,
	}, env.Session(1, "u"))
	if rec.Code != status || apptest.ErrorCode(t, rec) != code {
		t.Fatalf("got %d %s, want %d %s", rec.Code, rec.Body.String(), status, code)
	}
	if n := env.Count("players"); n != 0 {
		t.Fatalf("players = %d, want 0", n)
	}
}

func TestCreate_OmittedAppearance(t *testing.T) {
	env := apptest.New(t)
	p := createLook(t, env, map[string]string{"devName": "DEV_01", "class": "BACKEND", "body": "masculino"})
	if !reflect.DeepEqual(p.Appearance, wantDefaults("masculino")) {
		t.Fatalf("appearance = %v, want defaults", p.Appearance)
	}
	if p.Coins != 100 || p.Gems != 20 {
		t.Fatalf("coins %d gems %d, want 100 and 20", p.Coins, p.Gems)
	}
	if got := storedAppearance(t, env); len(got) != 0 {
		t.Fatalf("stored = %v, want {}", got)
	}
}

func TestCreate_EmptyAppearance(t *testing.T) {
	env := apptest.New(t)
	p := createLook(t, env, map[string]any{
		"devName": "DEV_01", "class": "BACKEND", "body": "masculino", "appearance": map[string]string{},
	})
	if !reflect.DeepEqual(p.Appearance, wantDefaults("masculino")) {
		t.Fatalf("appearance = %v, want defaults", p.Appearance)
	}
	if p.Coins != 100 || p.Gems != 20 {
		t.Fatalf("coins %d gems %d, want 100 and 20", p.Coins, p.Gems)
	}
	if got := storedAppearance(t, env); len(got) != 0 {
		t.Fatalf("stored = %v, want {}", got)
	}
}

func TestCreate_StoresFreeLooks(t *testing.T) {
	env := apptest.New(t)
	p := createLook(t, env, map[string]any{
		"devName": "DEV_01", "class": "BACKEND", "body": "masculino",
		"appearance": map[string]string{"tone": "tone_clara", "top": "top_camiseta"},
	})
	want := wantDefaults("masculino")
	want["tone"] = "tone_clara"
	want["top"] = "top_camiseta"
	if !reflect.DeepEqual(p.Appearance, want) {
		t.Fatalf("appearance = %v, want %v", p.Appearance, want)
	}
	if p.Coins != 100 || p.Gems != 20 {
		t.Fatalf("coins %d gems %d, want 100 and 20", p.Coins, p.Gems)
	}
	if got := meAppearance(t, env); !reflect.DeepEqual(got, want) {
		t.Fatalf("GET /api/me appearance = %v, want %v", got, want)
	}
	stored := map[string]string{"tone": "tone_clara", "top": "top_camiseta"}
	if got := storedAppearance(t, env); !reflect.DeepEqual(got, stored) {
		t.Fatalf("stored = %v, want %v", got, stored)
	}
}

func TestCreate_RefusesPricedLook(t *testing.T) {
	refuseLook(t, "masculino", map[string]string{"hairColor": "hair_azul"}, http.StatusConflict, "not_owned")
}

func TestCreate_RefusesGearOnly(t *testing.T) {
	refuseLook(t, "masculino", map[string]string{"top": "top_hoodie_trace"}, http.StatusUnprocessableEntity, "gear_only")
}

func TestCreate_RefusesWrongBody(t *testing.T) {
	refuseLook(t, "masculino", map[string]string{"hair": "hair_rabo"}, http.StatusUnprocessableEntity, "wrong_body")
}

func TestCreate_RefusesUnknownPart(t *testing.T) {
	refuseLook(t, "masculino", map[string]string{"capa": "tone_clara"}, http.StatusUnprocessableEntity, "unknown_part")
}

func TestCreate_RefusesUnknownLook(t *testing.T) {
	refuseLook(t, "masculino", map[string]string{"tone": "tone_nope"}, http.StatusUnprocessableEntity, "unknown_look")
	refuseLook(t, "masculino", map[string]string{"tone": "hair_espetado"}, http.StatusUnprocessableEntity, "unknown_look")
}

func TestCreate_AppearanceBeforeInsert(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodPost, "/api/players", map[string]any{
		"devName": "DEV_01", "class": "BACKEND", "body": "outro",
		"appearance": map[string]string{"hairColor": "hair_azul"},
	}, env.Session(1, "u"))
	if rec.Code != http.StatusUnprocessableEntity || apptest.ErrorCode(t, rec) != "unknown_body" {
		t.Fatalf("unknown body: %d %s, want 422 unknown_body", rec.Code, rec.Body.String())
	}
	truncated := `{"devName":"DEV_01","class":"BACKEND","body":"masculino","appearance":{"hairColor":"hair_azul"`
	rec = env.Do(http.MethodPost, "/api/players", truncated, env.Session(1, "u"))
	if rec.Code != http.StatusUnprocessableEntity || apptest.ErrorCode(t, rec) != "invalid_body" {
		t.Fatalf("truncated: %d %s, want 422 invalid_body", rec.Code, rec.Body.String())
	}
	if n := env.Count("players"); n != 0 {
		t.Fatalf("players = %d, want 0", n)
	}
}

func TestCreate_RefusesOneOfMany(t *testing.T) {
	refuseLook(t, "masculino", map[string]string{"tone": "tone_clara", "hairColor": "hair_azul"}, http.StatusConflict, "not_owned")
}

func TestCreate_SecondDoesNotApplyLook(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "u")
	first := env.Do(http.MethodPost, "/api/players", map[string]string{
		"devName": "DEV_01", "class": "BACKEND", "body": "masculino",
	}, c)
	if first.Code != http.StatusCreated {
		t.Fatalf("first status %d %s", first.Code, first.Body.String())
	}
	second := env.Do(http.MethodPost, "/api/players", map[string]any{
		"devName": "DEV_01", "class": "BACKEND", "body": "masculino",
		"appearance": map[string]string{"tone": "tone_clara"},
	}, c)
	if second.Code != http.StatusConflict || apptest.ErrorCode(t, second) != "player_exists" {
		t.Fatalf("second %d %s, want 409 player_exists", second.Code, second.Body.String())
	}
	if got := storedAppearance(t, env); len(got) != 0 {
		t.Fatalf("stored = %v, want {}", got)
	}
	if got := meAppearance(t, env); !reflect.DeepEqual(got, wantDefaults("masculino")) {
		t.Fatalf("GET /api/me appearance = %v, want defaults", got)
	}
}
