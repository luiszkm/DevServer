# AGENTS.md

16-bit RPG about dev life. Monorepo: `api/` (Go, chi, pgx, goose), `web/` (Next.js App Router,
TypeScript), Postgres 16 from `docker-compose.yml` on `localhost:5433`. Each folder has its own
`AGENTS.md` with layout, helpers and proof mechanics; read it before editing there. Setup and env
vars: `README.md`. Decisions: `.specs/STATE.md` (the `AD-*` ids below).

## tlc-spec-lean

profile: standard
budget: 150k

Feature artifacts live in `.specs/features/<feature>/{plan,checks,verification}.md`. At Plan and
Checks, load the Confirmed section of `.specs/LESSONS.md`; edit lessons only through the
`lessons.py` script, never by hand.

## Invariants

Break one only with a new `AD-*` row in `.specs/STATE.md`.

- The server is authoritative (AD-002): economy, combat, progression and deploy time are computed in
  `api/`. The client sends intent only (command id, item id), never amounts.
- Balance numbers live in the catalog `api/catalog/*.json`, served at `GET /api/catalog` (AD-003).
  `web/` never hardcodes them.
- Every player mutation locks the player row and answers `{"player": {...}}` (AD-004).
- Every 4xx/5xx body is `{"error":{"code":"<snake_case>","message":"<pt-BR>"}}` (AD-005).
- One rule each: XP through `player.GainXP` (AD-009), bonuses through `player.Bonus` (AD-012..014).
  A new source joins the existing rule; it never gets a second one.
- Time comes from the injected clock, draws from the injected `Rand` (AD-010, AD-011).
- UI text is pt-BR (AD-015). Code, comments and commit messages are English.

## Commands

| Goal | Command |
| --- | --- |
| Postgres up (creates `devserver_test`, `devserver_e2e` on first run) | `make db-up` |
| api tests | `make test-api` |
| web screen tests | `make test-web` |
| browser e2e (starts fake GitHub, api and web itself) | `make e2e` |
| build + vet + `next build` (type check) | `make ci-build` |
| committed PNGs match their specs | `make art-check` |

Before calling multi-step work done: `git status`, read the diff, run the smallest suite that covers
it, then the full one for each side you touched. Judge a suite by its exit code, not its summary line.

## Boundaries

Ask before:
- adding a dependency to `api/go.mod` or `web/package.json` (`make check-deps` pins the api stack;
  no ORM)
- editing `docker-compose.yml`, `infra/postgres/init.sql`, `Makefile`, `web/playwright.config.ts`
- editing a migration that is already committed; add a new numbered one instead
- structural edits to `.specs/STATE.md` decisions (adding a row for a decision the user made is fine)

Never without an explicit request:
- commit, push, open a PR; never force-push or `git reset --hard`
- `rm -rf` on a path typed by hand. macOS is case-insensitive, so a path that differs only by case
  hits the existing directory. Use absolute paths and `ls` the target first.

Secrets: never commit real OAuth credentials; `dev`/`e2e` values in docs and configs are for the
fake GitHub only. If a secret shows up in chat, a diff or logs, stop, tell the user to rotate it, and
do not repeat the value.

No symptom-only workaround without the root cause stated in the reply.

## Test policy

Classify code by its shape, never by the name of its layer. **Decision** = anything that changes an
outcome (validation, guard, state transition, dispatch, mapping table with more than one row).
**Instrumentation** = forwards to one call or maps one shape onto another with no conditional.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Entry point that decides nothing | one at the boundary | accepted input, each rejected input, each error path |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Levels in this repo (mechanics in each folder's `AGENTS.md`):

- api (Go): `go test` against the real Postgres (database `devserver_test`); external HTTP (GitHub)
  faked with `httptest.Server`. Never mock the database - row locks and `CHECK` constraints are part
  of what is proven.
- web: `vitest` + `@testing-library/react` + `jsdom` for screen states; `@playwright/test` for
  browser boundary behaviour (navigation, persistence, `/api` rewrite, anything CSS decides).
- A test asserts what the spec says, never what the code happens to do.
- A decision table gets a case at each boundary value, not only mid-band, and the fallback row
  (unknown id, default branch) gets its own case.

## Game art

Pixel art is drawn from JSON specs in `web/art/<category>/<name>.json` into `web/public/art/` by
the `pixel-assets` skill (`.claude/skills/pixel-assets`). Spec and PNG are committed together; never
edit a PNG by hand. The renderer only warns on style rules, so `make art-check` passing does not
prove the style guide.
