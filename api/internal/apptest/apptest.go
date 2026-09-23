// Package apptest builds the real router over an isolated database for HTTP-level tests.
package apptest

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/app"
	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/fakegithub"
	"devserver/api/internal/testdb"
)

// Clock is the game clock the tests move by hand.
type Clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *Clock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *Clock) Advance(d time.Duration) {
	c.mu.Lock()
	c.t = c.t.Add(d)
	c.mu.Unlock()
}

// Rand hands out pushed values in order; with none left it returns 0. A value >= n fails the test.
type Rand struct {
	mu   sync.Mutex
	t    testing.TB
	vals []int
}

func (r *Rand) Push(vals ...int) {
	r.mu.Lock()
	r.vals = append(r.vals, vals...)
	r.mu.Unlock()
}

func (r *Rand) IntN(n int) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.vals) == 0 {
		return 0
	}
	v := r.vals[0]
	r.vals = r.vals[1:]
	if v < 0 || v >= n {
		r.t.Errorf("pushed draw %d outside [0,%d)", v, n)
		return 0
	}
	return v
}

type Env struct {
	T       testing.TB
	Clock   *Clock
	Rand    *Rand
	Pool    *pgxpool.Pool
	Router  *chi.Mux
	Fake    *fakegithub.Server
	FakeURL string
	Logs    *SyncBuffer
}

type SyncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *SyncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *SyncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func New(t testing.TB) *Env { return NewWithCatalog(t, nil) }

// NewWithCatalog lets a test change the catalog that handlers receive through app.Deps.
// GET /api/catalog keeps serving the embedded data (its body is marshalled by catalog.Load),
// and inventory and skill order keep following catalog.Default().
func NewWithCatalog(t testing.TB, edit func(*catalog.Catalog)) *Env {
	t.Helper()
	pool := testdb.New(t)
	fake := fakegithub.New()
	ts := httptest.NewServer(fake)
	t.Cleanup(ts.Close)
	cat, err := catalog.Load()
	if err != nil {
		t.Fatalf("catalog: %v", err)
	}
	if edit != nil {
		edit(cat)
	}
	logs := &SyncBuffer{}
	clock := &Clock{t: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)}
	rnd := &Rand{t: t}
	router := app.NewRouter(app.Deps{
		Now:     clock.Now,
		Rand:    rnd,
		Pool:    pool,
		Logger:  slog.New(slog.NewJSONHandler(logs, nil)),
		Catalog: cat,
		Auth: auth.Config{
			ClientID:     "test-client",
			ClientSecret: "test-secret",
			RedirectURL:  "http://localhost:3000/api/auth/github/callback",
			AuthURL:      ts.URL + "/login/oauth/authorize",
			TokenURL:     ts.URL + "/login/oauth/access_token",
			APIURL:       ts.URL,
		},
	})
	return &Env{T: t, Clock: clock, Rand: rnd, Pool: pool, Router: router, Fake: fake, FakeURL: ts.URL, Logs: logs}
}

// Do sends a request through the router; body is JSON-encoded unless it is a string.
func (e *Env) Do(method, path string, body any, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	var r io.Reader
	switch b := body.(type) {
	case nil:
	case string:
		r = strings.NewReader(b)
	default:
		raw, err := json.Marshal(b)
		if err != nil {
			e.T.Fatalf("marshal body: %v", err)
		}
		r = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, r)
	if r != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for _, c := range cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	e.Router.ServeHTTP(rec, req)
	return rec
}

// Session creates a session directly and returns its cookie.
func (e *Env) Session(githubUserID int64, login string) *http.Cookie {
	token, err := auth.Sessions{Pool: e.Pool}.Create(context.Background(),
		auth.Identity{GithubUserID: githubUserID, GithubLogin: login})
	if err != nil {
		e.T.Fatalf("create session: %v", err)
	}
	return &http.Cookie{Name: auth.SessionCookie, Value: token}
}

// NewPlayer creates a session and a player through the api, failing the test on anything but 201.
func (e *Env) NewPlayer(githubUserID int64, devName, class string) *http.Cookie {
	c := e.Session(githubUserID, "user")
	rec := e.Do(http.MethodPost, "/api/players", map[string]string{"devName": devName, "class": class}, c)
	if rec.Code != http.StatusCreated {
		e.T.Fatalf("create player %s: status %d body %s", devName, rec.Code, rec.Body.String())
	}
	return c
}

func (e *Env) Count(table string) int {
	var n int
	if err := e.Pool.QueryRow(context.Background(), "SELECT count(*) FROM "+table).Scan(&n); err != nil {
		e.T.Fatalf("count %s: %v", table, err)
	}
	return n
}

func Decode[T any](t testing.TB, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
	return v
}

// ErrorCode returns error.code from an envelope response.
func ErrorCode(t testing.TB, rec *httptest.ResponseRecorder) string {
	t.Helper()
	return Decode[struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}](t, rec).Error.Code
}

// PlayerBody is the {"player": {...}} response shape.
type PlayerBody struct {
	Player struct {
		DevName     string `json:"devName"`
		Class       string `json:"class"`
		Level       int    `json:"level"`
		XP          int    `json:"xp"`
		XPMax       int    `json:"xpMax"`
		HP          int    `json:"hp"`
		HPMax       int    `json:"hpMax"`
		Coins       int    `json:"coins"`
		Gems        int    `json:"gems"`
		SkillPoints int    `json:"skillPoints"`
		Region      string `json:"region"`
		Skin        string `json:"skin"`
	} `json:"player"`
}

// Serve sends a prepared request through the router.
func (e *Env) Serve(req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	e.Router.ServeHTTP(rec, req)
	return rec
}
