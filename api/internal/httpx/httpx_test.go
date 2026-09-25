package httpx_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"devserver/api/internal/apptest"
	"devserver/api/internal/httpx"
)

var protectedRoutes = []struct{ method, path string }{
	{http.MethodPost, "/api/auth/logout"},
	{http.MethodGet, "/api/me"},
	{http.MethodGet, "/api/onboarding"},
	{http.MethodPost, "/api/players"},
	{http.MethodPost, "/api/me/travel"},
	{http.MethodPut, "/api/me/appearance"},
	{http.MethodPost, "/api/me/shop/looks/hair_moicano"},
	{http.MethodPost, "/api/me/body"},
}

// C9
func TestAuthMiddleware_RejectsEveryProtectedRoute(t *testing.T) {
	env := apptest.New(t)
	for _, rt := range protectedRoutes {
		for name, cookies := range map[string][]*http.Cookie{
			"no cookie":     nil,
			"unknown token": {{Name: "ds_session", Value: "not-a-session"}},
		} {
			rec := env.Do(rt.method, rt.path, nil, cookies...)
			if rec.Code != http.StatusUnauthorized || apptest.ErrorCode(t, rec) != "unauthenticated" {
				t.Errorf("%s %s (%s): status %d body %s, want 401 unauthenticated",
					rt.method, rt.path, name, rec.Code, rec.Body.String())
			}
		}
	}
}

// C41
func TestErrorEnvelope_EveryCode(t *testing.T) {
	env := apptest.New(t)
	env.Router.Get("/api/test/panic", func(http.ResponseWriter, *http.Request) { panic("boom") })

	existing := env.NewPlayer(100, "TAKEN_1", "BACKEND")
	noPlayer := env.Session(101, "ghost")

	type result struct {
		status int
		ctype  string
		body   []byte
	}
	cases := map[string]func() result{}
	do := func(method, path string, body any, c ...*http.Cookie) func() result {
		return func() result {
			rec := env.Do(method, path, body, c...)
			return result{rec.Code, rec.Header().Get("Content-Type"), rec.Body.Bytes()}
		}
	}
	cases["unauthenticated"] = do(http.MethodGet, "/api/me", nil)
	cases["player_not_found"] = do(http.MethodGet, "/api/me", nil, noPlayer)
	cases["player_exists"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "OTHER_1", "class": "BACKEND", "body": "masculino"}, existing)
	cases["invalid_dev_name"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "ab", "class": "BACKEND", "body": "masculino"}, noPlayer)
	cases["dev_name_taken"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "taken_1", "class": "BACKEND", "body": "masculino"}, noPlayer)
	cases["invalid_class"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "FRESH_1", "class": "WIZARD", "body": "masculino"}, noPlayer)
	cases["level_too_low"] = do(http.MethodPost, "/api/me/travel", map[string]string{"region": "caverna"}, existing)
	cases["unknown_region"] = do(http.MethodPost, "/api/me/travel", map[string]string{"region": "marte"}, existing)
	cases["internal"] = do(http.MethodGet, "/api/test/panic", nil)

	if len(cases) != 9 {
		t.Fatalf("expected 9 codes, have %d", len(cases))
	}
	for code, run := range cases {
		res := run()
		status, ctype, body := res.status, res.ctype, res.body
		if status < 400 {
			t.Errorf("%s: status %d, want an error status", code, status)
			continue
		}
		if !strings.HasPrefix(ctype, "application/json") {
			t.Errorf("%s: Content-Type %q", code, ctype)
		}
		var env map[string]map[string]string
		if err := json.Unmarshal(body, &env); err != nil {
			t.Errorf("%s: body %s is not the envelope: %v", code, body, err)
			continue
		}
		if len(env) != 1 || env["error"]["code"] != code || env["error"]["message"] == "" || len(env["error"]) != 2 {
			t.Errorf("%s: envelope %s", code, body)
		}
	}
}

// C48
func TestErrorEnvelope_GenericCodes(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	if rec := env.Do(http.MethodGet, "/api/nope", nil); rec.Code != 404 || apptest.ErrorCode(t, rec) != "not_found" {
		t.Errorf("unknown route: %d %s", rec.Code, rec.Body.String())
	}
	if rec := env.Do(http.MethodDelete, "/api/catalog", nil); rec.Code != 405 || apptest.ErrorCode(t, rec) != "method_not_allowed" {
		t.Errorf("wrong method: %d %s", rec.Code, rec.Body.String())
	}
	if rec := env.Do(http.MethodPost, "/api/me/travel", "{not json", c); rec.Code != 422 || apptest.ErrorCode(t, rec) != "invalid_body" {
		t.Errorf("malformed body: %d %s", rec.Code, rec.Body.String())
	}
}

// C45
func TestRecover_Returns500AndLogsRequestID(t *testing.T) {
	env := apptest.New(t)
	env.Router.Get("/api/test/panic", func(http.ResponseWriter, *http.Request) { panic("boom") })

	rec := env.Do(http.MethodGet, "/api/test/panic", nil)
	if rec.Code != http.StatusInternalServerError || apptest.ErrorCode(t, rec) != "internal" {
		t.Fatalf("status %d body %s, want 500 internal", rec.Code, rec.Body.String())
	}
	id := rec.Header().Get(httpx.RequestIDHeader)
	if id == "" {
		t.Fatal("no X-Request-Id header")
	}
	if !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
		t.Fatalf("log does not carry request id %s: %s", id, env.Logs.String())
	}
}

// C49
func TestHandlerError_Returns500AndLogsRequestID(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	if _, err := env.Pool.Exec(context.Background(), `ALTER TABLE players RENAME TO players_gone`); err != nil {
		t.Fatal(err)
	}
	for _, rt := range []struct {
		method, path string
		body         any
	}{
		{http.MethodGet, "/api/me", nil},
		{http.MethodPost, "/api/players", map[string]string{"devName": "DEV_02", "class": "BACKEND", "body": "masculino"}},
		{http.MethodPost, "/api/me/travel", map[string]string{"region": "floresta"}},
	} {
		rec := env.Do(rt.method, rt.path, rt.body, c)
		if rec.Code != http.StatusInternalServerError || apptest.ErrorCode(t, rec) != "internal" {
			t.Errorf("%s %s: status %d body %s, want 500 internal", rt.method, rt.path, rec.Code, rec.Body.String())
			continue
		}
		id := rec.Header().Get(httpx.RequestIDHeader)
		if id == "" || !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
			t.Errorf("%s %s: log lacks request id %q: %s", rt.method, rt.path, id, env.Logs.String())
		}
	}
}

// Handle logs only unexpected errors: an api error the client caused stays out of the log.
func TestHandle_DoesNotLogExpectedErrors(t *testing.T) {
	env := apptest.New(t)
	c := env.NewPlayer(1, "DEV_01", "BACKEND")
	before := env.Logs.String()
	for _, rec := range []*httptest.ResponseRecorder{
		env.Do(http.MethodPost, "/api/me/travel", map[string]string{"region": "caverna"}, c),
		env.Do(http.MethodPost, "/api/me/travel", map[string]string{"region": "marte"}, c),
		env.Do(http.MethodPost, "/api/players", map[string]string{"devName": "OTHER", "class": "BACKEND", "body": "masculino"}, c),
	} {
		if rec.Code < 400 || rec.Code >= 500 {
			t.Fatalf("setup: expected a 4xx, got %d", rec.Code)
		}
		if id := rec.Header().Get(httpx.RequestIDHeader); strings.Contains(env.Logs.String(), id) {
			t.Errorf("expected error %s was logged: %s", apptest.ErrorCode(t, rec), env.Logs.String())
		}
	}
	if env.Logs.String() != before {
		t.Errorf("log grew on expected errors: %s", strings.TrimPrefix(env.Logs.String(), before))
	}
}

// A failing session lookup is an unexpected error: 500 internal, logged with the request id.
func TestSessionLookupError_Returns500AndLogsRequestID(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "u")
	if _, err := env.Pool.Exec(context.Background(), `ALTER TABLE sessions RENAME TO sessions_gone`); err != nil {
		t.Fatal(err)
	}
	rec := env.Do(http.MethodGet, "/api/me", nil, c)
	if rec.Code != http.StatusInternalServerError || apptest.ErrorCode(t, rec) != "internal" {
		t.Fatalf("status %d body %s, want 500 internal", rec.Code, rec.Body.String())
	}
	id := rec.Header().Get(httpx.RequestIDHeader)
	if id == "" || !strings.Contains(env.Logs.String(), `"request_id":"`+id+`"`) {
		t.Fatalf("log lacks request id %q: %s", id, env.Logs.String())
	}
}

// Door 12 on the other JSON route: malformed body on POST /api/players.
func TestCreatePlayer_InvalidBody(t *testing.T) {
	env := apptest.New(t)
	for name, body := range map[string]string{"not json": "{nope", "wrong type": `{"devName": 42, "class": "BACKEND"}`} {
		rec := env.Do(http.MethodPost, "/api/players", body, env.Session(int64(len(name)), "u"))
		if rec.Code != 422 || apptest.ErrorCode(t, rec) != "invalid_body" {
			t.Errorf("%s: %d %s, want 422 invalid_body", name, rec.Code, rec.Body.String())
		}
	}
	if n := env.Count("players"); n != 0 {
		t.Fatalf("players = %d, want 0", n)
	}
}
