// Package app assembles the api: the one router both main and the tests mount.
package app

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/auth"
	"devserver/api/internal/battle"
	"devserver/api/internal/catalog"
	"devserver/api/internal/deploy"
	"devserver/api/internal/httpx"
	"devserver/api/internal/office"
	"devserver/api/internal/player"
	"devserver/api/internal/rack"
	"devserver/api/internal/shop"
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
	// Rand is every draw of the game (AD-011); nil means math/rand/v2.
	Rand battle.Rand
}

func NewRouter(d Deps) *chi.Mux {
	r := chi.NewRouter()
	r.Use(httpx.RequestID, httpx.Recover(d.Logger))
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) { httpx.WriteError(w, httpx.ErrNotFound) })
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) { httpx.WriteError(w, httpx.ErrMethodNotAllowed) })

	h := func(fn httpx.HandlerFunc) http.HandlerFunc { return httpx.Handle(d.Logger, fn) }
	sessions := auth.Sessions{Pool: d.Pool}
	authH := &auth.Handlers{Config: d.Auth, Sessions: sessions, Logger: d.Logger}
	playerH := &player.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	worldH := &world.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	now := d.Now
	if now == nil {
		now = time.Now
	}
	skillsH := &skills.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	rnd := d.Rand
	if rnd == nil {
		rnd = battle.DefaultRand
	}
	battleH := &battle.Handlers{Pool: d.Pool, Catalog: d.Catalog, Rand: rnd}
	deployH := &deploy.Handlers{Pool: d.Pool, Catalog: d.Catalog, Logger: d.Logger, Now: now}
	shopH := &shop.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	officeH := &office.Handlers{Pool: d.Pool, Catalog: d.Catalog}
	rackH := &rack.Handlers{Pool: d.Pool, Catalog: d.Catalog}

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
		pr.Get("/api/me/battle", h(battleH.Get))
		pr.Post("/api/me/battle", h(battleH.Start))
		pr.Post("/api/me/battle/commands", h(battleH.Command))
		pr.Post("/api/me/battle/items", h(battleH.Item))
		pr.Post("/api/me/shop/items/{id}", h(shopH.BuyItem))
		pr.Post("/api/me/shop/gear/{id}", h(shopH.BuyGear))
		pr.Post("/api/me/shop/skins/{id}", h(shopH.BuySkin))
		pr.Post("/api/me/gear/{id}/equip", h(shopH.EquipGear))
		pr.Post("/api/me/gear/{id}/unequip", h(shopH.UnequipGear))
		pr.Post("/api/me/skins/{id}/equip", h(shopH.EquipSkin))
		pr.Post("/api/me/items/{id}/discard", h(shopH.Discard))
		pr.Post("/api/me/forge/{recipe}", h(shopH.Forge))
		pr.Post("/api/me/deploys/{type}/boost", h(deployH.Boost))
		pr.Post("/api/me/office/{zone}/{position}", h(officeH.Install))
		pr.Post("/api/me/office/{zone}/{position}/remove", h(officeH.Remove))
		pr.Post("/api/me/rack", h(rackH.Buy))
		pr.Post("/api/me/rack/{slot}/remove", h(rackH.Remove))
	})
	return r
}
