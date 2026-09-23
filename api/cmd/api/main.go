package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"devserver/api/internal/app"
	"devserver/api/internal/auth"
	"devserver/api/internal/catalog"
	"devserver/api/internal/db"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("api stopped", "error", err.Error())
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	ctx := context.Background()
	dbURL := env("DATABASE_URL", "postgres://devserver:devserver@localhost:5433/devserver?sslmode=disable")
	if err := db.Migrate(ctx, dbURL); err != nil {
		return err
	}
	pool, err := db.Open(ctx, dbURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	cat, err := catalog.Load()
	if err != nil {
		return err
	}

	router := app.NewRouter(app.Deps{
		Pool:    pool,
		Logger:  logger,
		Catalog: cat,
		Now:     time.Now,
		Auth: auth.Config{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			RedirectURL:  env("OAUTH_REDIRECT_URL", "http://localhost:3000/api/auth/github/callback"),
			AuthURL:      os.Getenv("GITHUB_AUTH_URL"),
			TokenURL:     os.Getenv("GITHUB_TOKEN_URL"),
			APIURL:       os.Getenv("GITHUB_API_URL"),
			CookieSecure: os.Getenv("COOKIE_SECURE") == "true",
		},
	})
	addr := env("ADDR", ":8080")
	logger.Info("api listening", "addr", addr)
	return http.ListenAndServe(addr, router)
}
