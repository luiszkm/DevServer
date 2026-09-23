package auth_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"devserver/api/internal/apptest"
	"devserver/api/internal/auth"
	"devserver/api/internal/fakegithub"
)

func findCookie(t *testing.T, rec *httptest.ResponseRecorder, name string) *http.Cookie {
	t.Helper()
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	t.Fatalf("cookie %s not set; headers: %v", name, rec.Header().Values("Set-Cookie"))
	return nil
}

func rawSetCookie(rec *httptest.ResponseRecorder, name string) string {
	for _, v := range rec.Header().Values("Set-Cookie") {
		if strings.HasPrefix(v, name+"=") {
			return v
		}
	}
	return ""
}

func callback(env *apptest.Env, query string, stateCookie string) *httptest.ResponseRecorder {
	var cookies []*http.Cookie
	if stateCookie != "" {
		cookies = append(cookies, &http.Cookie{Name: auth.StateCookie, Value: stateCookie})
	}
	return env.Do(http.MethodGet, "/api/auth/github/callback?"+query, nil, cookies...)
}

// C2
func TestLogin_RedirectsWithState(t *testing.T) {
	env := apptest.New(t)
	rec := env.Do(http.MethodGet, "/api/auth/github/login", nil)

	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d, want 302", rec.Code)
	}
	loc, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatal(err)
	}
	if got := loc.Scheme + "://" + loc.Host + loc.Path; got != env.FakeURL+"/login/oauth/authorize" {
		t.Fatalf("redirect = %s, want the GitHub authorize endpoint", got)
	}
	state := loc.Query().Get("state")
	if state == "" {
		t.Fatal("authorize URL has no state")
	}
	c := findCookie(t, rec, auth.StateCookie)
	if c.Value != state {
		t.Fatalf("cookie state %q != query state %q", c.Value, state)
	}
	if c.MaxAge != 600 {
		t.Fatalf("state cookie Max-Age = %d, want 600", c.MaxAge)
	}
	second, _ := url.Parse(env.Do(http.MethodGet, "/api/auth/github/login", nil).Header().Get("Location"))
	if second.Query().Get("state") == state {
		t.Fatal("two logins produced the same state; it must be random")
	}
}

// C3
func TestCallback_Success(t *testing.T) {
	env := apptest.New(t)
	code := env.Fake.IssueCode(fakegithub.User{ID: 42, Login: "octocat"})
	rec := callback(env, "code="+code+"&state=abc", "abc")

	if rec.Code != http.StatusFound || rec.Header().Get("Location") != "/" {
		t.Fatalf("status %d location %q, want 302 /", rec.Code, rec.Header().Get("Location"))
	}
	c := findCookie(t, rec, auth.SessionCookie)
	if !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.Path != "/" || c.MaxAge != 2592000 {
		t.Fatalf("session cookie attributes wrong: %+v", c)
	}
	var n int
	var ghID int64
	if err := env.Pool.QueryRow(context.Background(),
		`SELECT count(*), max(github_user_id) FROM sessions`).Scan(&n, &ghID); err != nil {
		t.Fatal(err)
	}
	if n != 1 || ghID != 42 {
		t.Fatalf("sessions = %d (github id %d), want 1 row for 42", n, ghID)
	}
}

// C4
func TestCallback_BadState(t *testing.T) {
	cases := map[string]struct{ query, cookie string }{
		"state missing from query":  {"code=x", "abc"},
		"state cookie missing":      {"code=x&state=abc", ""},
		"state differs from cookie": {"code=x&state=xyz", "abc"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			env := apptest.New(t)
			tc.query = strings.Replace(tc.query, "code=x", "code="+env.Fake.IssueCode(fakegithub.User{ID: 7, Login: "u"}), 1)
			rec := callback(env, tc.query, tc.cookie)
			if rec.Code != http.StatusFound || rec.Header().Get("Location") != "/login?error=state" {
				t.Fatalf("status %d location %q, want 302 /login?error=state", rec.Code, rec.Header().Get("Location"))
			}
			if n := env.Count("sessions"); n != 0 {
				t.Fatalf("sessions = %d, want 0", n)
			}
		})
	}
}

// C5
func TestCallback_GithubFailure(t *testing.T) {
	cases := map[string]func(*fakegithub.Server){
		"code exchange fails":     func(f *fakegithub.Server) { f.FailToken(true) },
		"GET /user fails":         func(f *fakegithub.Server) { f.FailUser(true) },
		"GET /user body not JSON": func(f *fakegithub.Server) { f.SetUserBody("<html>") },
		"GET /user without id":    func(f *fakegithub.Server) { f.SetUserBody(`{"login":"u"}`) },
		"GET /user without login": func(f *fakegithub.Server) { f.SetUserBody(`{"id":7}`) },
	}
	for name, breakIt := range cases {
		t.Run(name, func(t *testing.T) {
			env := apptest.New(t)
			code := env.Fake.IssueCode(fakegithub.User{ID: 7, Login: "u"})
			breakIt(env.Fake)
			rec := callback(env, "code="+code+"&state=abc", "abc")
			if rec.Code != http.StatusFound || rec.Header().Get("Location") != "/login?error=github" {
				t.Fatalf("status %d location %q, want 302 /login?error=github", rec.Code, rec.Header().Get("Location"))
			}
			if n := env.Count("sessions"); n != 0 {
				t.Fatalf("sessions = %d, want 0", n)
			}
		})
	}
}

// C7
func TestLogout_DeletesSession(t *testing.T) {
	env := apptest.New(t)
	c := env.Session(1, "octocat")
	rec := env.Do(http.MethodPost, "/api/auth/logout", nil, c)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if n := env.Count("sessions"); n != 0 {
		t.Fatalf("sessions = %d, want 0", n)
	}
	if raw := rawSetCookie(rec, auth.SessionCookie); !strings.Contains(raw, "Max-Age=0") {
		t.Fatalf("ds_session not expired: %q", raw)
	}
}

// C10
func TestSession_ExpiryBoundary(t *testing.T) {
	env := apptest.New(t)
	ctx := context.Background()
	age := func(c *http.Cookie, secs int) {
		if _, err := env.Pool.Exec(ctx,
			`UPDATE sessions SET created_at = now() - make_interval(secs => $2) WHERE token_hash = $1`,
			auth.HashToken(c.Value), secs); err != nil {
			t.Fatal(err)
		}
	}
	fresh := env.Session(1, "a")
	age(fresh, 2591999)
	if rec := env.Do(http.MethodGet, "/api/me", nil, fresh); rec.Code != http.StatusNotFound || apptest.ErrorCode(t, rec) != "player_not_found" {
		t.Fatalf("session aged 2591999s: status %d body %s, want it accepted (404 player_not_found, no player yet)", rec.Code, rec.Body.String())
	}

	old := env.Session(2, "b")
	age(old, 2592001)
	rec := env.Do(http.MethodGet, "/api/me", nil, old)
	if rec.Code != http.StatusUnauthorized || apptest.ErrorCode(t, rec) != "unauthenticated" {
		t.Fatalf("session aged 2592001s: status %d body %s, want 401 unauthenticated", rec.Code, rec.Body.String())
	}
}

// C11
func TestSession_StoresOnlyHash(t *testing.T) {
	env := apptest.New(t)
	code := env.Fake.IssueCode(fakegithub.User{ID: 9, Login: "hashy"})
	rec := callback(env, "code="+code+"&state=s", "s")
	token := findCookie(t, rec, auth.SessionCookie).Value

	var stored []byte
	if err := env.Pool.QueryRow(context.Background(), `SELECT token_hash FROM sessions`).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	want := sha256.Sum256([]byte(token))
	if !bytes.Equal(stored, want[:]) {
		t.Fatal("stored value is not the SHA-256 of the cookie token")
	}
	if bytes.Contains(stored, []byte(token)) {
		t.Fatal("raw token stored in sessions")
	}
}

// C50
func TestCallback_SessionStoreFailure(t *testing.T) {
	env := apptest.New(t)
	if _, err := env.Pool.Exec(context.Background(), `DROP TABLE sessions`); err != nil {
		t.Fatal(err)
	}
	code := env.Fake.IssueCode(fakegithub.User{ID: 5, Login: "u"})
	rec := callback(env, "code="+code+"&state=abc", "abc")
	if rec.Code != http.StatusInternalServerError || apptest.ErrorCode(t, rec) != "internal" {
		t.Fatalf("status %d body %s, want 500 internal", rec.Code, rec.Body.String())
	}
	if raw := rawSetCookie(rec, auth.SessionCookie); raw != "" {
		t.Fatalf("session cookie set despite failure: %q", raw)
	}
}
