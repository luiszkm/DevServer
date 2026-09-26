# api/AGENTS.md

Go module `devserver/api`. Global invariants, boundaries and the test policy: `../AGENTS.md`.

## Layout

| Path | Holds |
| --- | --- |
| `cmd/api` | entry point; reads env (`README.md` table), migrates, serves |
| `cmd/fakegithub` | standalone fake OAuth server for local dev and e2e (`:9180`) |
| `internal/app/router.go` | the one router main and the tests mount; every route is registered here |
| `internal/httpx` | error envelope (`errors.go`), `Handle`, JSON helpers, middleware |
| `internal/player` | the player row: `WithLocked`, `GainXP`, `Pay`, `Bonus` |
| `internal/<domain>` | one package per game area (`battle`, `deploy`, `shop`, `office`, `rack`, `avatar`, `skills`, `world`, `auth`) with its `Handlers` struct |
| `internal/catalog` + `catalog/*.json` | balance data, embedded with `go:embed`, served at `GET /api/catalog` |
| `migrations/NNNNN_name.sql` | goose migrations, embedded; run on startup |
| `internal/testdb`, `internal/apptest` | test harness (below) |

## Writing a route

- Register it in `internal/app/router.go` inside the `RequireSession` group unless it is auth or
  catalog. Handlers take their deps from their package's `Handlers` struct; nothing global.
- A player mutation goes through `player.WithLocked` (row lock + transaction) and answers
  `{"player": {...}}`.
- Errors: return a `*httpx.Error`. A new code gets a var in `internal/httpx/errors.go` with a
  pt-BR message; reuse an existing code when the meaning is the same.
- Time: the handler's injected `Now`. Draws: the injected `Rand` (`IntN`). Never `time.Now()` or
  `math/rand` in game logic; the production defaults are wired once in `router.go`.
- Catalog: add fields to the JSON and the struct in `internal/catalog/catalog.go`; the web types in
  `web/src/lib/types.ts` mirror them by hand.
- Schema change: a new `migrations/NNNNN_<name>.sql` with the next number, `-- +goose Up`/`Down`.
  Put invariants in the schema (`CHECK`, `NOT NULL`, FKs) so the tests prove them.

## Tests

- `testdb.New(t)` gives each test its own migrated schema in `devserver_test`, dropped on cleanup.
  A failure "test database unreachable" means run `make db-up`.
- `apptest.New(t)` mounts the real router over that schema with a hand-moved `Clock`
  (`Advance`) and a scripted `Rand` (`Push`; a value `>= n` fails the test). `NewWithCatalog(t, edit)`
  swaps catalog data for cases the embedded JSON does not reach.
- Helpers: `env.NewPlayer`, `env.Session`, `env.Do(method, path, body, cookie)`,
  `apptest.Decode[T]`, `apptest.ErrorCode`, `env.Count(table)`.
- GitHub is `internal/fakegithub` behind `httptest.Server`; toggle failures with `FailToken`,
  `FailUser`, `DropUserConnection`.
- Run one package: `cd api && go test ./internal/<pkg> -run <Name>`.

## Proofs routes usually owe

Each has been missed in more than one feature:

- `422 invalid_body` for every route that decodes JSON - per route, not once for the api.
- `404 player_not_found` for every route through `player.WithLocked`, using a session with no player.
- A `500` path for every query a feature adds to a route, forced by breaking a real query (drop or
  rename the table), not a synthetic panic route.
- A guard for a catalog value the embedded data never produces: prove it through
  `apptest.NewWithCatalog`, or delete the guard.
- Validation order: one case per adjacent pair, including body decoding before path validation.
- A row-lock test changes the row inside the locked transaction and asserts the waiter read the new
  value; merely blocking passes without `FOR UPDATE`.
- Catalog entries: assert every field the plan fixes, by value (web mocks copy the text).
