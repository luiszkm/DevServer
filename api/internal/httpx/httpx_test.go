package httpx_test

import (
	"encoding/json"
	"net/http"
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
	cases["player_exists"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "OTHER_1", "class": "BACKEND"}, existing)
	cases["invalid_dev_name"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "ab", "class": "BACKEND"}, noPlayer)
	cases["dev_name_taken"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "taken_1", "class": "BACKEND"}, noPlayer)
	cases["invalid_class"] = do(http.MethodPost, "/api/players", map[string]string{"devName": "FRESH_1", "class": "WIZARD"}, noPlayer)
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

// Door 12: generic router errors use the same envelope.
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
