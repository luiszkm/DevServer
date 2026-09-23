.PHONY: db-up test-api test-web e2e ci-build check-deps

export DATABASE_URL ?= postgres://devserver:devserver@localhost:5433/devserver?sslmode=disable
export TEST_DATABASE_URL ?= postgres://devserver:devserver@localhost:5433/devserver_test?sslmode=disable

db-up:
	docker compose up -d --wait db

test-api: db-up
	cd api && go test ./...

test-web:
	cd web && npx vitest run

e2e: db-up
	cd web && npx playwright test

ci-build: db-up
	cd api && go build ./... && go vet ./...
	cd web && npm run build

check-deps:
	@cd api && grep -q 'github.com/go-chi/chi/v5 ' go.mod \
		&& grep -q 'github.com/jackc/pgx/v5 ' go.mod \
		&& grep -q 'github.com/pressly/goose/v3 ' go.mod \
		&& grep -q 'golang.org/x/oauth2 ' go.mod \
		&& ! grep -q 'gorm.io/gorm' go.mod \
		&& echo "deps ok"
