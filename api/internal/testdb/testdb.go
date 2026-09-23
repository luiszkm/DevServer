// Package testdb gives each test an isolated, migrated schema in the compose Postgres.
package testdb

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"devserver/api/internal/db"
)

const defaultURL = "postgres://devserver:devserver@localhost:5433/devserver_test?sslmode=disable"

func New(t testing.TB) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		base = defaultURL
	}
	admin, err := db.Open(ctx, base)
	if err != nil {
		t.Fatalf("test database unreachable (run `make db-up`): %v", err)
	}
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	schema := "t_" + hex.EncodeToString(b)
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}

	u, err := url.Parse(base)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()

	if err := db.Migrate(ctx, u.String()); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	pool, err := db.Open(ctx, u.String())
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() {
		pool.Close()
		_, _ = admin.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE")
		admin.Close()
	})
	return pool
}
