// Package app assembles the api: the one router both main and the tests mount.
package app

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/deploy"
	"devserver/api/internal/httpx"
	"devserver/api/internal/player"
	"devserver/api/internal/skills"
	"devserver/api/internal/world"
)

type Deps struct {
	Pool    *pgxpool.Pool
	Logger  *slog.Logger
	Auth    auth.Config
	Catalog *catalog.Catalog
	// Now is the game clock (AD-010); nil means time.Now.
	Now func() time.Time
}

func NewRouter(d Deps) *chi.Mux {
	r := chi.NewRouter()
	r.Use(httpx.RequestID, httpx.Recover(d.Logger))
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) { httpx.WriteError(w, httpx.ErrNotFound) })
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) { httpx.WriteError(w, httpx.ErrMethodNotAllowed) })

	h := func(fn httpx.HandlerFunc) http.HandlerFunc { return httpx.Handle(d.Logger, fn) }
	sessions := auth.Sessions{Pool: d.Pool}
	authH := &auth.Handlers{Config: d.Auth, Sessions: sessions, Logger: d.Logger}
	playerH := &player.Handlers{Pool: d.Pool}
	worldH := &world.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	now := d.Now
	if now == nil {
		now = time.Now
	}
	skillsH := &skills.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	deployH := &deploy.Handlers{Pool: d.Pool, Catalog: d.Catalog, Logger: d.Logger, Now: now}

	r.Get("/api/auth/github/login", h(authH.Login))
	r.Get("/api/auth/github/callback", h(authH.Callback))
	r.Method(http.MethodGet, "/api/catalog", d.Catalog)

	r.Group(func(pr chi.Router) {
		pr.Use(auth.RequireSession(sessions, d.Logger))
		pr.Post("/api/auth/logout", h(authH.Logout))
		pr.Get("/api/me", h(playerH.Me))
		pr.Get("/api/onboarding", h(playerH.Onboarding))
		pr.Post("/api/players", h(playerH.Create))
		pr.Post("/api/me/travel", h(worldH.Travel))
		pr.Get("/api/me/deploys", h(deployH.List))
		pr.Post("/api/me/deploys", h(deployH.Start))
		pr.Post("/api/me/deploys/{type}/claim", h(deployH.Claim))
		pr.Post("/api/me/skills/{id}/unlock", h(skillsH.Unlock))
	})
	return r
}
