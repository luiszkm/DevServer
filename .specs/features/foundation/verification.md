# Foundation verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 591b2c4..8c8dbea
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Every proof C1..C50 was re-run at `HEAD` = `8c8dbea` on `feat/foundation`, against the compose Postgres (port 5433). The fix diff is `1d6edf0..8c8dbea`. In code, it touches only test files and one test double: `auth_test.go` (+1 C5 subcase), `fakegithub/fake.go` (`DropUserConnection`), `httpx_test.go` (new `TestHandle_DoesNotLogExpectedErrors`, plus one import line that moves every later line by +1), and new cases appended to `GameShell`, `Onboarding`, `WorldScene`, `Hud` and `Tabs` tests. It also edits `checks.md`: the callback failure paths set goes from 8 to 9, and it adds a round-3 handoff. No production file changed.

What the fix closed. Each of the three round-2 gaps now has a case, and a fault on it was killed:

- `Onboarding.tsx:27` load network error has a case (F1 killed). So does `Onboarding.tsx:44-45` create network error (F2 killed), and `GameShell.tsx:48-55` `onCreated` catalog failure, on both the null path and the throw path (F3 killed).
- `GET /user` transport error at `api/internal/auth/handlers.go:117-119` is now a C5 subcase (F4 killed, and only by that subcase).
- `Handle` keeping expected `*Error`s out of the log now has a case (F5 killed).

Why it is still FAIL:

- **The fix turned the web suite red.** `make test-web` (`npx vitest run`) exits 2 at `8c8dbea`. All 51 tests pass, but Vitest reports 1 unhandled error: `TypeError: Failed to fetch` escapes `GameShell.tsx:61-67`. `logout` uses `try/finally` with no `catch`, so the rejection leaves the `SAIR` click handler. The new case `GameShell.test.tsx:109-122` ("logout network error") surfaces it. At `1d6edf0` the same command exited 0 with 34/34. This is a production defect as well: a logout on a network failure leaves an unhandled promise rejection in the browser.
- The last-round sweep found decision branches with no asserted case, which the round-3 handoff says are covered. On screens: `Onboarding.tsx:82` (the `sending` half of `disabled`) and `Onboarding.tsx:75` (`aria-pressed`). In the api: `api/internal/auth/session.go:98-100` (session lookup error -> 500) and `api/internal/player/handlers.go:47-49` (`invalid_body` on `POST /api/players`).

## Binding sources

Carried from 1d6edf0, which carried it from ebf62f6. Profile is `standard`, so step 1 does not run. The plan marks no source as binding, and the fix did not touch any screen's interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (profile standard - step 1 not run) | n/a | - | - |

## Checks

Verified at 8c8dbea. Batched runs, and each named test shows individually as run and passed:

- **Go:** `cd api && go test ./internal/... -run '^(<the 32 round-2 names>|TestHandle_DoesNotLogExpectedErrors)$' -v -count=1 -p 1`, exit 0.
  - 33 top-level `--- PASS`. The sorted list matches all 33 names, and none is missing.
  - Subtests: C4 3/3 `--- PASS` (`state_missing_from_query`, `state_cookie_missing`, `state_differs_from_cookie`). C5 6/6 `--- PASS` (`code_exchange_fails`, `GET_/user_fails`, `GET_/user_unreachable`, `GET_/user_body_not_JSON`, `GET_/user_without_id`, `GET_/user_without_login`).
  - Packages: auth, catalog, httpx, player and world all `ok`.
- **vitest, the check proofs:** `cd web && npx vitest run -t "<alternation of the 14 check test names>"` exit 0. 25 passed, 26 skipped. Every C1/C6/C13/C19/C23-C26/C28-C30/C33/C34/C39 test is listed with a check mark (it.each expanded).
- **vitest, whole suite:** `npx vitest run <8 files> --reporter=verbose`. 8 files, 51 tests passed, each listed with a check mark. But it reports **1 unhandled error** and exits 1. See Gate.
- **Playwright:** `cd web && npx playwright test --reporter=list` exit 0. 3 passed: `logout returns to login`, `tab click keeps document and HUD`, `travel persists`.
- **Make:** `make ci-build` exit 0. `make check-deps` prints `deps ok` and exits 0.

Every proof file is new in `591b2c4..HEAD`. The citations were refreshed for the files the fix touched: `auth_test.go` moved by +1 after line 128, and `httpx_test.go` moved by +1 throughout. The five web test files only had cases appended, so their existing lines are unchanged. The other citations are carried from 1d6edf0, and their proofs were re-run green at 8c8dbea.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 401 -> login screen with `ENTRAR COM GITHUB` | vitest `401 shows login screen` pass | `web/src/components/GameShell.test.tsx:15` `findByRole("link", { name: "ENTRAR COM GITHUB" })`; `:17` scene not rendered | PASS |
| C2 | login 302 to authorize, state == cookie, Max-Age=600 | go `TestLogin_RedirectsWithState` PASS | `api/internal/auth/auth_test.go:51` `rec.Code != http.StatusFound`; `:58` authorize URL; `:66` `c.Value != state`; `:69` `c.MaxAge != 600`; `:73` second login's state `== state` fails | PASS |
| C3 | callback success: 1 session row, cookie attrs, 302 `/` | go `TestCallback_Success` PASS | `api/internal/auth/auth_test.go:84` 302 + `Location == "/"`; `:88` `HttpOnly`, `SameSiteLaxMode`, `Path "/"`, `MaxAge 2592000`; `:97` `n != 1 \|\| ghID != 42` | PASS |
| C4 | missing/different state -> `/login?error=state`, 0 sessions | go `TestCallback_BadState` PASS (3 subcases) | `api/internal/auth/auth_test.go:114` `Location != "/login?error=state"`; `:117` `env.Count("sessions") != 0` | PASS |
| C5 | code exchange / `GET /user` fail -> `/login?error=github`, 0 sessions | go `TestCallback_GithubFailure` PASS (6 subcases) | `api/internal/auth/auth_test.go:126-132` six failure modes, including the new `:129` `"GET /user unreachable": f.DropUserConnection(true)` (`api/internal/fakegithub/fake.go:78-82,130-136` hijacks and closes the conn); `:140` `Location != "/login?error=github"`; `:143` sessions 0. F4 killed on the unreachable subcase only | PASS |
| C6 | banner above button for github/state; absent without error | vitest `shows error banner (error=github/state)`, `shows error banner only for known errors (...)` pass | `web/src/app/login/page.test.tsx:13` `banner.compareDocumentPosition(button) & DOCUMENT_POSITION_FOLLOWING`; `:21` `queryByText(BANNER)).not.toBeInTheDocument()` | PASS |
| C7 | logout 204, row deleted, `Max-Age=0` | go `TestLogout_DeletesSession` PASS | `api/internal/auth/auth_test.go:156` `StatusNoContent`; `:159` sessions 0; `:162` `strings.Contains(raw, "Max-Age=0")` | PASS |
| C8 | SAIR -> login, reload stays | playwright `logout returns to login` pass | `web/e2e/auth.spec.ts:8` login link visible; `:10` after `page.reload()` still visible | PASS |
| C9 | 5 protected routes x (no cookie, unknown token) -> 401 unauthenticated | go `TestAuthMiddleware_RejectsEveryProtectedRoute` PASS | `api/internal/httpx/httpx_test.go:15-21` the 5 routes; `:32` `rec.Code != 401 \|\| ErrorCode != "unauthenticated"` | PASS |
| C10 | 2591999 s accepted, 2592001 s -> 401 | go `TestSession_ExpiryBoundary` PASS | `api/internal/auth/auth_test.go:180` accepted side `404 && "player_not_found"`; `:187` `401 && "unauthenticated"` | PASS |
| C11 | sessions stores SHA-256, never the token | go `TestSession_StoresOnlyHash` PASS | `api/internal/auth/auth_test.go:204` `bytes.Equal(stored, sha256(token))`; `:207` raw token absent | PASS |
| C12 | suggestion derivation x3 + 4 classes | go `TestOnboarding_SuggestsDevName` PASS | `api/internal/player/player_test.go:47` `SuggestedDevName != want`; `:50` `DeepEqual(Classes, [FRONTEND BACKEND DEVOPS FULLSTACK])` | PASS |
| C13 | 404 -> onboarding with suggestion and 4 classes | vitest `404 opens onboarding with suggestion` pass | `web/src/components/GameShell.test.tsx:30` `toHaveValue("OCTOCAT")`; `:32` each class button `toBeEnabled()` | PASS |
| C14 | 201 initial state for each of 4 classes | go `TestCreatePlayer_InitialState` PASS | `api/internal/player/player_test.go:63` `StatusCreated`; `:69` full-struct compare against (1, 0, 500, 100, 100, ...) | PASS |
| C15 | devName bounds (5 rejected, 3 accepted, lowercase stored upper) | go `TestCreatePlayer_DevNameBounds` PASS | `api/internal/player/player_test.go:84` `status != 422 \|\| code != "invalid_dev_name"`; `:88` players 0; `:94` 201; `:98` `DevName != stored` | PASS |
| C16 | `dev_01` vs existing `DEV_01` -> 409 dev_name_taken | go `TestCreatePlayer_DevNameTakenCaseInsensitive` PASS | `api/internal/player/player_test.go:108` `status != 409 \|\| code != "dev_name_taken"` | PASS |
| C17 | `WIZARD` -> 422 invalid_class, no player | go `TestCreatePlayer_InvalidClass` PASS | `api/internal/player/player_test.go:116` `422 invalid_class`; `:119` players 0 | PASS |
| C18 | second create -> 409 player_exists, row byte-identical | go `TestCreatePlayer_PlayerExists` PASS | `api/internal/player/player_test.go:136` `409 player_exists`; `:139` `after != before` | PASS |
| C19 | 409 dev_name_taken -> onboarding open, `NOME JÁ EM USO` under the name field | vitest `dev_name_taken shows NOME JÁ EM USO` pass | `web/src/components/Onboarding.test.tsx:22` `expect(field).toContainElement(message)`; `:23` `DOCUMENT_POSITION_FOLLOWING`; `:24` `onCreated` not called | PASS |
| C20 | 10 concurrent same-user creates -> 1x201, 9x409, 1 row | go `TestCreatePlayer_ConcurrentSameUser` PASS | `api/internal/player/player_test.go:174` `DeepEqual(results, want)`; `:177` players 1 | PASS |
| C21 | concurrent `DEV_01`/`dev_01` by 2 users -> 201 + 409 dev_name_taken | go `TestCreatePlayer_ConcurrentSameName` PASS | `api/internal/player/player_test.go:191` `DeepEqual(results, ["201 ", "409 dev_name_taken"])` | PASS |
| C22 | `GET /api/me` 200 returns session's player | go `TestMe_ReturnsSessionPlayer` PASS | `api/internal/player/player_test.go:203` 200; `:206` `DevName != want` | PASS |
| C23 | HUD shows LEVEL 3, 40/1000, HP 80/140, 55, 7, 2 | vitest `renders player values` pass | `web/src/components/Hud.test.tsx:14-15` loop over the 6 strings with `within(hud).getByText(text)` | PASS |
| C24 | pending -> CARREGANDO..., no number | vitest `pending shows CARREGANDO` pass | `web/src/components/Hud.test.tsx:27` `getByText("CARREGANDO...")`; `:28` `textContent).not.toMatch(/\d/)` | PASS |
| C25 | 500 and network -> SERVIDOR FORA DO AR; retry -> 2nd call | vitest `server down shows retry (500)`, `(network error)` pass | `web/src/components/GameShell.test.tsx:43` text; `:44` click `TENTAR DE NOVO`; `:46` `f.calls("GET /api/me")).toBe(2)` | PASS |
| C26 | 7 tabs in order with hrefs | vitest `tab order and routes` pass | `web/src/components/Tabs.test.tsx:13-21` `expect(got).toEqual([...7 [label, href]])` | PASS |
| C27 | tab clicks change URL without reload; HUD visible | playwright `tab click keeps document and HUD` pass | `web/e2e/shell.spec.ts:11,13` `toHaveURL`; `:16` `__marker` `toBe(42)`; `:17` HUD `LEVEL 1` | PASS |
| C28 | 5 unshipped scenes -> EM BREVE + name | vitest `every unshipped scene shows EM BREVE` x5 pass | `web/src/components/ComingSoon.test.tsx:19` `getByText("EM BREVE")`; `:20` `getByText(name)` | PASS |
| C29 | 4 title signs -> routes | vitest `signs link to scenes` x4 pass | `web/src/components/TitleScene.test.tsx:14` `getByRole("link", { name })).toHaveAttribute("href", href)` | PASS |
| C30 | mutation 999 coins -> HUD 999, `/api/me` called once | vitest `mutation response updates HUD without refetch` pass | `web/src/components/GameShell.test.tsx:60` `within(hud).findByText("999")`; `:61` `calls("GET /api/me")).toBe(1)` | PASS |
| C31 | catalog 200 no cookie, version, 6 regions in order | go `TestCatalog_ServesRegions` PASS | `api/internal/catalog/catalog_test.go:23` 200; `:27` version non-empty; `:33` ordered id/minLevel table | PASS |
| C32 | 304 empty on match, 200 on mismatch, ETag = quoted version | go `TestCatalog_ETag` PASS | `api/internal/catalog/catalog_test.go:49` `etag != "\"" + v + "\""`; `:59` `304 && n == 0`; `:62` 200 | PASS |
| C33 | mocked catalog vila=3 -> `REQUER NÍVEL 3` | vitest `min levels come from catalog` pass | `web/src/components/WorldScene.test.tsx:25` `toHaveTextContent("REQUER NÍVEL 3")`; `:26` disabled | PASS |
| C34 | level 1: vila/floresta open; 2/5/8/12 locked | vitest `locks regions above player level` pass | `web/src/components/WorldScene.test.tsx:33-34` `VIAJAR ATÉ AQUI` enabled; `:37-38` `REQUER NÍVEL ${min}` disabled | PASS |
| C35 | level 2 -> mercado 200, stored | go `TestTravel_AtMinLevel` PASS | `api/internal/world/world_test.go:38` 200; `:41` response region; `:44` stored region `mercado` | PASS |
| C36 | level 1 -> mercado 422 level_too_low, stays vila | go `TestTravel_LevelTooLow` PASS | `api/internal/world/world_test.go:54` `422 && "level_too_low"`; `:57` region `vila` | PASS |
| C37 | `marte` -> 422 unknown_region, unchanged | go `TestTravel_UnknownRegion` PASS | `api/internal/world/world_test.go:67` `422 && "unknown_region"`; `:70` region `vila` | PASS |
| C38 | no player -> 404 player_not_found on `/api/me` and travel | go `TestPlayerNotFound_OnPlayerRoutes` PASS | `api/internal/player/player_test.go:220` `rec.Code != 404 \|\| ErrorCode != "player_not_found"` | PASS |
| C39 | `região atual: FLORESTA DE LOGS`, floresta node highlighted | vitest `shows current region` pass | `web/src/components/WorldScene.test.tsx:45` text; `:47-48` single `[aria-current="location"]` with `data-region="floresta"` | PASS |
| C40 | travel to floresta updates without reload, persists after reload | playwright `travel persists` pass | `web/e2e/world.spec.ts:12` updated text; `:13` marker `toBe(7)`; `:16` after reload | PASS |
| C41 | 9 codes in envelope with JSON content type | go `TestErrorEnvelope_EveryCode` PASS | `api/internal/httpx/httpx_test.go:70` `len(cases) != 9`; `:80` `application/json`; `:88` exactly `{error:{code,message}}`, code match, message non-empty | PASS |
| C42 | travel blocks on held FOR UPDATE, 200 after commit | go `TestTravel_SerializesOnPlayerRowLock` PASS | `api/internal/world/world_test.go:95` early answer while locked fails; `:107` `code != 200` after commit | PASS |
| C43 | 20 concurrent travels all 200, final vila/floresta | go `TestTravel_ConcurrentRequests` PASS | `api/internal/world/world_test.go:134` each `code != 200`; `:138` final region in {vila, floresta} | PASS |
| C44 | coins/gems = -1 -> CHECK violation | go `TestPlayers_NonNegativeCurrencyConstraint` PASS | `api/internal/player/player_test.go:233` `pgErr.Code != "23514"` | PASS |
| C45 | panicking route on `NewRouter` -> 500 internal, log has `X-Request-Id` | go `TestRecover_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:115` `500 && "internal"`; `:122` log contains `"request_id":"<id>"`. Same assembly: `api/cmd/api/main.go:46` and `api/internal/apptest/apptest.go:63` both call `app.NewRouter` | PASS |
| C46 | compose db, go build/vet, npm run build exit 0 | `make ci-build` exit 0 | `Makefile:18-20` (db-up; `go build ./... && go vet ./...`; `npm run build`). The Next build listed all routes | PASS |
| C47 | go.mod requires chi/pgx/goose/oauth2, not gorm | `make check-deps` -> `deps ok`, exit 0 | `api/go.mod:6-9` the four requires; `Makefile:22-28` grep incl. `! grep -q 'gorm.io/gorm'` | PASS |
| C48 | unknown route 404 not_found, wrong method 405, malformed JSON on travel 422 invalid_body | go `TestErrorEnvelope_GenericCodes` PASS | `api/internal/httpx/httpx_test.go:98` `404 && "not_found"`; `:101` `405 && "method_not_allowed"`; `:104` `422 && "invalid_body"` | PASS |
| C49 | handler error on `GET /api/me`, `POST /api/players`, `POST /api/me/travel` -> 500 internal + log with request_id | go `TestHandlerError_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:131` `ALTER TABLE players RENAME` (precondition); `:138-140` the 3 routes; `:143` `rec.Code != 500 \|\| ErrorCode != "internal"`; `:148` log contains `"request_id":"<X-Request-Id>"` | PASS |
| C50 | session write fails in callback -> 500 internal, no `ds_session` | go `TestCallback_SessionStoreFailure` PASS | `api/internal/auth/auth_test.go:215` `DROP TABLE sessions` (precondition); `:220` `500 && "internal"`; `:223` `rawSetCookie(rec, SessionCookie) != ""` fails | PASS |

**Checks proven: 50/50**, each with a located `file:line`.

## Coverage

This section is verified at 8c8dbea. The rows whose authority the fix touched were recomputed: callback failure paths (grown from 8 to 9 in `checks.md`), the `Handle` log decision, and the screen decision sets. Because this is the last round, I also recomputed the `RequireSession` outcomes and the door-12 `invalid_body` members from code. Every other row is carried from 1d6edf0, and its proofs were re-run green at 8c8dbea.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/auth/github/login` statuses (1) | plan Surface; `api/internal/auth/handlers.go:76` | 302 C2 | - |
| `GET /api/auth/github/callback` statuses (2) | plan Surface; `handlers.go:86,93,102`, `handlers.go:97-99` | 302 C3 · C4 · C5 · 500 C50 | - |
| `POST /api/auth/logout` statuses (2) | Surface; `handlers.go:146` | 204 C7 · 401 C9 | - |
| `GET /api/me` statuses (4) | Surface; `api/internal/player/handlers.go:22-29` | 200 C22 · 401 C9 · 404 C38 · 500 C49 | - |
| `GET /api/onboarding` statuses (2) | Surface | 200 C12 · 401 C9 | - |
| `POST /api/players` statuses (5) | Surface | 201 C14 · 401 C9 · 409 C16/C18/C20/C21 · 422 C15/C17 · 500 C49 | - |
| `GET /api/catalog` statuses (2) | Surface; `api/internal/catalog/catalog.go:74-84` | 200 C31 · 304 C32 | - |
| `POST /api/me/travel` statuses (5) | Surface; `api/internal/world/travel.go` | 200 C35 · 401 C9 · 404 C38 · 422 C36/C37 · 500 C49 | - |
| callback failure paths (9) | AC 4/5; `handlers.go:85,107-110,117-124,129-134` | state missing · cookie missing · state differs: C4 · token exchange fails · `/user` unreachable (new, `auth_test.go:129`) · `/user` non-200 · body not JSON · no id · no login: C5 | - |
| `RequireSession` outcomes (5) | door 2 / AC 8-9; `api/internal/auth/session.go:92-106` | no cookie C9 · unknown token C9 · expired C10 · fresh C10 | lookup error -> `WriteError(err)` -> `500 internal` (`session.go:98-100`): no case at any level. `rg` over `*_test.go` for a sessions-table break finds only `auth_test.go:215` (callback, C50), which never reaches the middleware |
| door 12 `invalid_body` on body routes (2) | plan Landing door 12 (JSON malformado, any body); `world/travel.go:24-26`, `player/handlers.go:47-49` | `POST /api/me/travel` C48 | `POST /api/players` malformed JSON (`player/handlers.go:47-49`): no case. `rg invalid_body` in Go tests finds only `httpx_test.go:104` (travel). A mutant dropping that return would answer `422 invalid_dev_name` there and pass every proof |
| AC 38 unexpected-error paths (2) | plan AC 38; `api/internal/httpx/middleware.go:37-46`, `errors.go:46-52,72-83` | panic C45 · returned error C49 (+ callback C50) | - |
| `Handle` log decision (2) | `api/internal/httpx/errors.go:78-81` | unexpected error logged C49 (`httpx_test.go:148`) · expected `*Error` not logged `TestHandle_DoesNotLogExpectedErrors` (`httpx_test.go:167,171`, F5 killed) | - |
| error codes, door 7 (9) | plan Landing door 7; `errors.go:22-30` | C41, table-driven over all 9 | - |
| generic router codes, door 12 (3) | plan Landing door 12; `errors.go:31-33`, `api/internal/app/router.go:28-29`, `errors.go:61-66` | `not_found` · `method_not_allowed` · `invalid_body`: C48 | - |
| Landing doors (12) | plan Landing | 1 C46 · 2 C11 · 3 C20 · 4 C21 · 5 C32 · 6 C27 · 7 C41 · 8 C42 · 9 C47 · 10 C44 · 11 C46 · 12 C48 | - |
| session age boundary (2) | AC 9; `session.go:62` | 2591999 s · 2592001 s: C10 | - |
| protected routes (5) | Surface + `app/router.go` | C9 over all 5 | - |
| `409` / `422` on `POST /api/players` (2+2) | AC 12-15 | dev_name_taken C16/C21 · player_exists C18/C20 · invalid_dev_name C15 · invalid_class C17 | - |
| `422` on travel (2) | AC 32-33 | level_too_low C36 · unknown_region C37 | - |
| devName bounds (8) | AC 12; `api/internal/player/player.go:54-60` | all 8 in C15 and `TestNormalizeDevName` (`api/internal/player/devname_test.go:15-23`) | - |
| suggestion derivation (3) | `player.go:63-77` | C12 | - |
| classes (4) | AC 10/11; `player.go:34` | C12 · C14 | - |
| relations constraints (4) | plan Relations; `api/migrations/00001_init.sql` | github_user_id unique C20 · dev_name upper unique C16/C21 · coins/gems >= 0 C44 · region = catalog id C37 | - |
| entities (3) | plan Relations | Player C14 · Session C3/C11 · GithubIdentity C20 | - |
| HUD fetch outcomes (6) | AC 1, 18-21; `web/src/components/GameShell.tsx:31-39` | 200 C23/C30 · pending C24 · 5xx C25 · network C25 · 401 C1 · 404 C13 | - |
| `onCreated` outcomes (3) | `GameShell.tsx:48-55` | catalog ok `GameShell.test.tsx:90-96` · catalog 500 `:98-107` · catalog throws `:98-107` (F3 killed) | - |
| Onboarding load outcomes (4) | `web/src/components/Onboarding.tsx:17-28,55` | pending `Onboarding.test.tsx:72-77` · ok C13 · HTTP error with/without body `:31-35`, `:86-90` · network `:79-84` (F1 killed) | - |
| Onboarding create outcomes (5) | `Onboarding.tsx:30-49` | ok `:57-70` · dev_name_taken C19 · other error with/without body `:37-49`, `:103-109` · network `:92-101` (F2 killed) | - |
| Onboarding submit enablement (3) | `Onboarding.tsx:82` `disabled={!cls \|\| sending}` | no class -> disabled `:51-55` · class chosen -> enabled `:99` (after a failed create) | while sending -> disabled (`Onboarding.tsx:82`, `sending`): no case. The only pending-fetch stubs are `Onboarding.test.tsx:73` (the GET, before the form renders), `Hud.test.tsx:24` and `WorldScene.test.tsx:86`. None holds `POST /api/players` open |
| Onboarding class selection indicator (2) | `Onboarding.tsx:75` `aria-pressed={cls === c}` | - | pressed / not pressed: no case. `rg aria-pressed` over `*.test.tsx` has 0 hits. The chosen class is only proven through the request body (`:69`) |
| logout outcomes (2) | `GameShell.tsx:61-67` | 204 `GameShell.test.tsx:109-122` · network error `:109-122` (visible outcome asserted) | - |
| WorldScene travel outcomes (5) | `web/src/components/WorldScene.tsx:24-36,79` | ok C30 · refused `WorldScene.test.tsx:58-69` · no body `:78-83` · network `:71-76` · pending disables `:85-91` | - |
| WorldScene map rendering (4) | `WorldScene.tsx:42,53,58` | known position C39 · unknown position `:93-100` · current region name / id fallback `:99`, `:102-105` · here/open/locked diamond `:107-113` | - |
| Hud / Tabs conditionals (2+2) | `web/src/components/Hud.tsx:15,50`, `Tabs.tsx:21` | no player C24 · SAIR only with handler `Hud.test.tsx:31-36` · current tab `Tabs.test.tsx:24-30` (only `/mundo` marked) | - |
| HUD fields (6) | AC 18; `Hud.tsx` | C23 | - |
| tabs (7) | AC 22 | C26 | - |
| unshipped scenes (5) | AC 24 | C28 | - |
| title signs (4) | AC 25 | C29 | - |
| regions (6) | AC 27; `api/catalog/regions.json` | C31 | - |
| region lock at level 1 (6) | AC 30; `WorldScene.tsx:67,82` | C34 | - |
| login error banner (4) | AC 6; `web/src/components/LoginScreen.tsx:1,11` | github · state · none · unknown value: C6 | - |
| Observable screen states (14 landed rows) | plan Observable | carried from 1d6edf0: C1 · C6 · C13 · C19 · C24 · C25 · C26 · C28 · WorldScene order `WorldScene.test.tsx:51-56` | - |
| startup config: router (1 shared assembly) | `api/cmd/api/main.go:46`, `api/internal/apptest/apptest.go:63` | both call `app.NewRouter` | - |
| startup config: `/api` rewrite (1) | `web/next.config.ts:8`, `web/playwright.config.ts` | C27 / C40 via the browser | - |

These branches are excluded from the sweep because they cannot be reached from a screen or a request in this feature, or because mutating them would change nothing observable:

- `GameShell.tsx:58`: the `setPlayer` else. `WorldScene` only mounts under `ready`.
- `GameContext.tsx:17`: the `useGame` throw is a guard against programmer misuse.
- `Hud.tsx:6`: the `Bar` clamp. The api never sends xp above xpMax or hp below 0.
- `auth/handlers.go:71-73` and `:111-114`: failures of `rand.Read` and of `NewRequest` with a constant URL.
- `auth/handlers.go:141-143`: a `Delete` error needs the same table to fail right after `Lookup` succeeded.
- `player/handlers.go:79-81`: a non-unique insert error needs the database to fail between `Get` and `INSERT`.
- `session.go:93`: `c.Value == ""`. The mutant is equivalent, because `Lookup("")` gives 401 anyway.
- `middleware.go:40-42`: no handler panics with `ErrAbortHandler`.

**Observation.** `session.go:98-100` answers `500 internal` through `WriteError` directly, not through `Handle`. So a session-store failure produces no log with `request_id`. AC 38 is worded for "o handler", so I record this as an observation, not a contradiction.

Level: every claim naming a status or route is proven through `app.NewRouter` over HTTP. There is no level gap.

`Swept`: carried from 1d6edf0. No row resolves to **existing**.

## Test policy rows

Verified at 8c8dbea. All rows are re-judged: the round-2 unmet rows, plus every row that classifies a file the fix touched.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | devName validation `player.go:54-60`; travel guards `world/travel.go`; session validity `auth/session.go`; error mapping `httpx/errors.go:46-52,72-83` | boundary **and** own layer | **no**. The round-2 miss is now met: `Handle` skipping the log for an expected `*Error` (`httpx_test.go:155-174`, F5 killed). Still unmet: session validity row "lookup error -> 500 internal" (`session.go:98-100`) has no asserted case at any level |
| Decides, not reached across a boundary | suggestion derivation `player.go:63-77`; scene components `web/src/components/{GameShell,Onboarding,WorldScene,LoginScreen,Hud,Tabs}.tsx` | own layer | **no**. The three round-2 misses are now met: `Onboarding.tsx:27` (F1), `Onboarding.tsx:44-45` (F2), `GameShell.tsx:48-55` (F3). Still with no asserted case: `Onboarding.tsx:82` submit disabled **while sending**, and `Onboarding.tsx:75` `aria-pressed` for the chosen class. The fix also turned the own-layer suite red: `npx vitest run` exits 1 on an unhandled rejection from `GameShell.tsx:61-67`, surfaced by `GameShell.test.tsx:109-122` |
| Entry point that decides nothing | `GET /api/catalog` `catalog.go`; `GET /api/onboarding` | boundary | yes (carried from 1d6edf0, untouched by the fix). Accepted input C31/C12, conditional request C32, 401 C9 |
| Instrumentation, pass-throughs | `web/src/lib/api.ts`, `web/src/components/{ComingSoon,TitleScene,ServerDown}.tsx`, `web/src/app/(game)/*/page.tsx`, `api/internal/app/router.go`, `api/cmd/api/main.go`, `api/internal/fakegithub/fake.go` (test double, changed by the fix) | none of its own | yes. Covered by consumers. The new `DropUserConnection` (`fake.go:78-82,130-136`) is exercised by the C5 `GET /user unreachable` subcase. F4 shows that this subcase alone discriminates the transport-error return |

## Faults injected

Verified at 8c8dbea. The faults ran in `git worktree add <scratchpad>/wt3 HEAD`, with the real `web/node_modules` symlinked into `wt3/web/`.

- **Per-fault reset:** after each fault, `git checkout -- <file>` in the worktree was followed by an empty `git status --porcelain` there.
- **Baseline check:** after the faults, the worktree was checked out at `1d6edf0` to baseline the full vitest run (exit 0, 34 passed), then returned to `8c8dbea`.
- **Cleanup:** `git worktree remove --force` ran, and `git worktree list` showed only the main tree.
- **Real tree:** its `git status --porcelain` read `?? .claude/` before and after, and `diff` found them identical.
- **Stash:** `git stash` was not used.

There were 5 faults (the cap), one per surface the fix created or that the round-2 gaps named. Each was killed by its narrowest covering proof.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: onboarding load `.catch` message `SERVIDOR FORA DO AR` -> `erro ao carregar` | `web/src/components/Onboarding.tsx:27` | yes. `shows SERVIDOR FORA DO AR when onboarding data hits a network error` FAIL (1 failed, 9 skipped) |
| F2: create `catch` message `SERVIDOR FORA DO AR` -> `erro ao criar dev` | `web/src/components/Onboarding.tsx:45` | yes. `shows SERVIDOR FORA DO AR when create hits a network error and allows retry` FAIL |
| F3: `onCreated` failure target `down` -> `onboarding`, on both the null-catalog and throw paths | `web/src/components/GameShell.tsx:51,53` | yes. `catalog failure after onboarding shows server down` FAIL on both `(catalog 500)` and `(catalog network error)` |
| F4: transport error from `http.DefaultClient.Do` returns a valid identity instead of an error | `api/internal/auth/handlers.go:119` | yes. `TestCallback_GithubFailure/GET_/user_unreachable` FAIL ("status 302 location "/", want /login?error=github"). The other 5 subcases pass, so the new subcase is the one that reaches `:117-119` |
| F5: `Handle` logs every error (`if errors.As(err, &e) \|\| true`) | `api/internal/httpx/errors.go:79` | yes. `TestHandle_DoesNotLogExpectedErrors` FAIL (`level_too_low`, `unknown_region` and `player_exists` logged; "log grew"). `TestHandlerError_Returns500AndLogsRequestID` still PASS, as expected |

Not mutated because of the cap. These are new tests that ran green at 8c8dbea but have never been made to fail:

- `WorldScene.test.tsx:78-113` (no body, pending, unknown position, id fallback, diamonds)
- `Hud.test.tsx:31-36`
- `Tabs.test.tsx:24-30`
- `Onboarding.test.tsx:72-77,86-90,103-109`
- `GameShell.test.tsx:90-96,109-122`

The author's handoff reports 15 self-mutations over these. I did not re-run them.

## Gate

Verified at 8c8dbea.

- Go, `go test ./internal/... -run '^(33 names)$' -v -count=1 -p 1`: 33 passed, 0 failed. Subtests: C4 3/3, C5 6/6.
- vitest, check-named filter `npx vitest run -t "<14 check names>"`: 25 passed, 0 failed, exit 0.
- vitest, whole suite `npx vitest run <8 files>` / `make test-web`: **51 passed, 0 failed, 1 unhandled error, exit 1** (make: exit 2). The error:
  ```
  Unhandled Rejection: TypeError: Failed to fetch
   ❯ src/components/GameShell.test.tsx:111:51
   ❯ api src/lib/api.ts:9:21 · post src/lib/api.ts:21:10 · src/components/GameShell.tsx:63:13
  The last test to run before this error was "SAIR returns to the login screen (logout network error)"
  ```
  At `1d6edf0` the same command exited 0 (34 passed). The fix introduced this regression.
- Playwright, `npx playwright test`: 3 passed, 0 failed.
- `make ci-build`: exit 0. `make check-deps`: `deps ok`, exit 0.
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py foundation`: see the output below.

```
  ERROR foundation: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [foundation]
```

Exit 1. The only error is the FAIL verdict. No row contradicts the verdict.

## Ranked remaining gaps

1. **The fix made the web suite red.** `make test-web` exits 2, from 1 unhandled rejection with 51/51 passing. Cause: `web/src/components/GameShell.tsx:61-67`, where `logout` has `try/finally` and no `catch`, so a network failure rejects out of the `SAIR` click handler. The new test `web/src/components/GameShell.test.tsx:109-122` exposes it. In production it is an unhandled promise rejection on every offline logout. Test policy row: "Decides, not reached across a boundary".
2. **A screen branch has no asserted case:** `CRIAR DEV` should be disabled while the create is in flight (`web/src/components/Onboarding.tsx:82`, the `sending` operand). The mutant `disabled={!cls}` would pass every proof. It guards double submission, which is the client side of C20. Test policy row: "Decides, not reached across a boundary".
3. **An api decision branch has no asserted case:** the session lookup error answers `500 internal` (`api/internal/auth/session.go:98-100`). It sits in the session validity row of "Decides, reached across a boundary", and this path also writes no `request_id` log (see the observation in Coverage).
4. **A door 12 member is unproven:** malformed JSON on `POST /api/players` should answer `422 invalid_body` (`api/internal/player/handlers.go:47-49`). C48 proves it on travel only (`api/internal/httpx/httpx_test.go:104`).
5. **The selected-class indicator has no asserted case:** `aria-pressed` at `web/src/components/Onboarding.tsx:75`. It is minor, but it is a rendered state that depends on user choice.
