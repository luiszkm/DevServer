# Foundation verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 591b2c4..ebf62f6
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All proofs were run at `HEAD` = `ebf62f6` on `feat/foundation`, against the compose Postgres (port 5433). The checks are sound almost everywhere, but FAIL comes from:

- one check whose assertion does not reach its claim (C19). A mutant survived.
- the AC 38 / `500` members on the real routes. Only a synthetic panic route proves them. A mutant on the returned-error branch survived.
- door 12, which has no check.
- screen-level `Test policy` rows that are not met.

## Binding sources

Profile is `standard`, so step 1 does not run. The plan marks no source as binding.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (profile standard - step 1 not run) | n/a | - | - |

## Checks

Batched runs, each named test shown individually as run and passed:

- Go: `cd api && go test ./internal/... -run '^(TestLogin_RedirectsWithState|...|TestRecover_Returns500AndLogsRequestID)$' -v -count=1 -p 1`. All 28 named tests: `--- PASS`. All 5 packages: `ok`.
- vitest: `cd web && npx vitest run <8 files> -t "<14-name alternation>"`. 8 files, 24 tests passed (it.each expanded).
- Playwright: `cd web && npx playwright test`. 3 passed (`logout returns to login`, `tab click keeps document and HUD`, `travel persists`).
- `make ci-build`: exit 0. `make check-deps`: `deps ok`, exit 0.

Every proof file is new in `591b2c4..HEAD`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 401 -> login screen with `ENTRAR COM GITHUB` | vitest `401 shows login screen` pass | `web/src/components/GameShell.test.tsx:15` - `findByRole("link", { name: "ENTRAR COM GITHUB" })`; `:17` scene not rendered. GameShell wraps every game route: `web/src/app/(game)/layout.tsx:4` | PASS |
| C2 | login 302 to authorize, state == cookie, Max-Age=600 | go `TestLogin_RedirectsWithState` PASS | `api/internal/auth/auth_test.go:51` `rec.Code != http.StatusFound`; `:58` authorize URL; `:66` `c.Value != state`; `:69` `c.MaxAge != 600` | PASS |
| C3 | callback success: 1 session row, cookie attrs, 302 `/` | go `TestCallback_Success` PASS | `api/internal/auth/auth_test.go:80` 302 + `Location == "/"`; `:84` `HttpOnly`, `SameSiteLaxMode`, `Path "/"`, `MaxAge 2592000`; `:93` `n != 1 \|\| ghID != 42` | PASS |
| C4 | missing/different state -> `/login?error=state`, 0 sessions | go `TestCallback_BadState` PASS (3 subcases) | `api/internal/auth/auth_test.go:110` `Location != "/login?error=state"`; `:113` `env.Count("sessions") != 0` | PASS |
| C5 | code exchange / `GET /user` fail -> `/login?error=github`, 0 sessions | go `TestCallback_GithubFailure` PASS (2 subcases) | `api/internal/auth/auth_test.go:132` `Location != "/login?error=github"`; `:135` sessions 0 | PASS |
| C6 | banner above button for github/state; absent without error | vitest `shows error banner (error=github/state)`, `shows error banner only with an error param` pass | `web/src/app/login/page.test.tsx:13` `banner.compareDocumentPosition(button) & DOCUMENT_POSITION_FOLLOWING`; `:18` `queryByText(BANNER)).not.toBeInTheDocument()` | PASS |
| C7 | logout 204, row deleted, `Max-Age=0` | go `TestLogout_DeletesSession` PASS | `api/internal/auth/auth_test.go:148` `StatusNoContent`; `:151` sessions 0; `:154` `strings.Contains(raw, "Max-Age=0")` | PASS |
| C8 | SAIR -> login, reload stays | playwright `logout returns to login` pass | `web/e2e/auth.spec.ts:8` login link visible; `:10` after `page.reload()` still visible | PASS |
| C9 | 5 protected routes x (no cookie, unknown token) -> 401 unauthenticated | go `TestAuthMiddleware_RejectsEveryProtectedRoute` PASS | `api/internal/httpx/httpx_test.go:13-19` the 5 routes; `:30` `rec.Code != 401 \|\| ErrorCode != "unauthenticated"` | PASS |
| C10 | 2591999 s accepted, 2592001 s -> 401 | go `TestSession_ExpiryBoundary` PASS | `api/internal/auth/auth_test.go:172` `rec.Code == 401` fails the test (accepted = not 401); `:179` `401 && "unauthenticated"`. Precision note: the accepted side only asserts `!= 401` | PASS |
| C11 | sessions stores SHA-256, never the token | go `TestSession_StoresOnlyHash` PASS | `api/internal/auth/auth_test.go:196` `bytes.Equal(stored, sha256(token))`; `:199` raw token absent | PASS |
| C12 | suggestion derivation x3 + 4 classes | go `TestOnboarding_SuggestsDevName` PASS | `api/internal/player/player_test.go:31-35` table; `:47` `SuggestedDevName != want`; `:50` `DeepEqual(Classes, [FRONTEND BACKEND DEVOPS FULLSTACK])` | PASS |
| C13 | 404 -> onboarding with suggestion and 4 classes | vitest `404 opens onboarding with suggestion` pass | `web/src/components/GameShell.test.tsx:30` `toHaveValue("OCTOCAT")`; `:32` each class button `toBeEnabled()` | PASS |
| C14 | 201 initial state for each of 4 classes | go `TestCreatePlayer_InitialState` PASS | `api/internal/player/player_test.go:63` `StatusCreated`; `:69-71` full struct `p != want` (1, 0, 500, 100, 100, 100, 20, 1, vila, default) | PASS |
| C15 | devName bounds (5 rejected, 3 accepted, lowercase stored upper) | go `TestCreatePlayer_DevNameBounds` PASS | `api/internal/player/player_test.go:84` `status != 422 \|\| code != "invalid_dev_name"`; `:88` players 0; `:94` 201; `:98` `DevName != stored` (`dev_01` -> `DEV_01`) | PASS |
| C16 | `dev_01` vs existing `DEV_01` -> 409 dev_name_taken | go `TestCreatePlayer_DevNameTakenCaseInsensitive` PASS | `api/internal/player/player_test.go:108` `status != 409 \|\| code != "dev_name_taken"` | PASS |
| C17 | `WIZARD` -> 422 invalid_class, no player | go `TestCreatePlayer_InvalidClass` PASS | `api/internal/player/player_test.go:116` `422 invalid_class`; `:119` players 0 | PASS |
| C18 | second create -> 409 player_exists, row byte-identical | go `TestCreatePlayer_PlayerExists` PASS | `api/internal/player/player_test.go:136` `409 player_exists`; `:139` `players::text` after == before | PASS |
| C19 | 409 dev_name_taken -> onboarding open, `NOME JÁ EM USO` **under the name field** | vitest `dev_name_taken shows NOME JÁ EM USO` pass | `web/src/components/Onboarding.test.tsx:18` `findByText("NOME JÁ EM USO")`; `:19` textbox present. **Nothing asserts placement under the field.** Fault F5 moved the message out of the field's `<label>` to the bottom of the form, and the test still passed | FAIL |
| C20 | 10 concurrent same-user creates -> 1x201, 9x409, 1 row | go `TestCreatePlayer_ConcurrentSameUser` PASS | `api/internal/player/player_test.go:174` `DeepEqual(results, ["201 ", 9x"409 player_exists"])`; `:177` players 1 | PASS |
| C21 | concurrent `DEV_01`/`dev_01` by 2 users -> 201 + 409 dev_name_taken | go `TestCreatePlayer_ConcurrentSameName` PASS | `api/internal/player/player_test.go:191` `DeepEqual(results, ["201 ", "409 dev_name_taken"])` | PASS |
| C22 | `GET /api/me` 200 returns session's player | go `TestMe_ReturnsSessionPlayer` PASS | `api/internal/player/player_test.go:203` 200; `:206` `DevName != want` for 2 distinct sessions | PASS |
| C23 | HUD shows LEVEL 3, 40/1000, HP 80/140, 55, 7, 2 | vitest `renders player values` pass | `web/src/components/Hud.test.tsx:14-15` `within(hud).getByText(text)` for all 6; `:17-19` labels | PASS |
| C24 | pending -> CARREGANDO..., no number | vitest `pending shows CARREGANDO` pass | `web/src/components/Hud.test.tsx:27` `getByText("CARREGANDO...")`; `:28` `textContent).not.toMatch(/\d/)` | PASS |
| C25 | 500 and network -> SERVIDOR FORA DO AR; retry -> 2nd call | vitest `server down shows retry (500)`, `(network error)` pass | `web/src/components/GameShell.test.tsx:43` text; `:44` click `TENTAR DE NOVO`; `:46` `f.calls("GET /api/me")).toBe(2)` | PASS |
| C26 | 7 tabs in order with hrefs | vitest `tab order and routes` pass | `web/src/components/Tabs.test.tsx:13-21` `expect(got).toEqual([...7 [label, href]])` | PASS |
| C27 | tab clicks change URL without reload; HUD visible | playwright `tab click keeps document and HUD` pass | `web/e2e/shell.spec.ts:11,13` `toHaveURL`; `:16` `__marker` `toBe(42)`; `:17` HUD `LEVEL 1` | PASS |
| C28 | 5 unshipped scenes -> EM BREVE + name | vitest `every unshipped scene shows EM BREVE` x5 pass | `web/src/components/ComingSoon.test.tsx:19` `getByText("EM BREVE")`; `:20` `getByText(name)` | PASS |
| C29 | 4 title signs -> routes | vitest `signs link to scenes` x4 pass | `web/src/components/TitleScene.test.tsx:14` `getByRole("link", { name })).toHaveAttribute("href", href)` | PASS |
| C30 | mutation 999 coins -> HUD 999, `/api/me` called once | vitest `mutation response updates HUD without refetch` pass | `web/src/components/GameShell.test.tsx:60` `within(hud).findByText("999")`; `:61` `calls("GET /api/me")).toBe(1)` | PASS |
| C31 | catalog 200 no cookie, version, 6 regions in order | go `TestCatalog_ServesRegions` PASS | `api/internal/catalog/catalog_test.go:23` 200; `:27` version non-empty; `:33-40` ordered id/minLevel | PASS |
| C32 | 304 empty on match, 200 on mismatch, ETag = quoted version | go `TestCatalog_ETag` PASS | `api/internal/catalog/catalog_test.go:49` `etag != "\"" + v + "\""`; `:59` `304 && n == 0`; `:62` 200 | PASS |
| C33 | mocked catalog vila=3 -> `REQUER NÍVEL 3` | vitest `min levels come from catalog` pass | `web/src/components/WorldScene.test.tsx:24` `toHaveTextContent("REQUER NÍVEL 3")`; `:25` disabled | PASS |
| C34 | level 1: vila/floresta open; 2/5/8/12 locked | vitest `locks regions above player level` pass | `web/src/components/WorldScene.test.tsx:32-33` `VIAJAR ATÉ AQUI` enabled; `:36-37` `REQUER NÍVEL ${min}` disabled | PASS |
| C35 | level 2 -> mercado 200, stored | go `TestTravel_AtMinLevel` PASS | `api/internal/world/world_test.go:38` 200; `:41` response region; `:44` stored region `mercado` | PASS |
| C36 | level 1 -> mercado 422 level_too_low, stays vila | go `TestTravel_LevelTooLow` PASS | `api/internal/world/world_test.go:54` `422 && "level_too_low"`; `:57` region `vila` | PASS |
| C37 | `marte` -> 422 unknown_region, unchanged | go `TestTravel_UnknownRegion` PASS | `api/internal/world/world_test.go:67` `422 && "unknown_region"`; `:70` region `vila` | PASS |
| C38 | no player -> 404 player_not_found on `/api/me` and travel | go `TestPlayerNotFound_OnPlayerRoutes` PASS | `api/internal/player/player_test.go:220` `rec.Code != 404 \|\| ErrorCode != "player_not_found"` over both routes | PASS |
| C39 | `região atual: FLORESTA DE LOGS`, floresta node highlighted | vitest `shows current region` pass | `web/src/components/WorldScene.test.tsx:44` text; `:46-47` single `[aria-current="location"]` with `data-region="floresta"` (paired with class `here`, `WorldScene.tsx:51-53`) | PASS |
| C40 | travel to floresta updates without reload, persists after reload | playwright `travel persists` pass | `web/e2e/world.spec.ts:12` updated text; `:13` marker `toBe(7)`; `:16` after reload | PASS |
| C41 | 9 codes in envelope with JSON content type | go `TestErrorEnvelope_EveryCode` PASS | `api/internal/httpx/httpx_test.go:68` `len(cases) != 9`; `:78` `application/json`; `:86` exactly `{error:{code,message}}`, code match, message non-empty | PASS |
| C42 | travel blocks on held FOR UPDATE, 200 after commit | go `TestTravel_SerializesOnPlayerRowLock` PASS | `api/internal/world/world_test.go:95-96` no answer within 500 ms while locked; `:107` `code != 200` after commit (level raised inside the locked tx, `:99`) | PASS |
| C43 | 20 concurrent travels all 200, final vila/floresta | go `TestTravel_ConcurrentRequests` PASS | `api/internal/world/world_test.go:134` each `code != 200`; `:138` final region in {vila, floresta} | PASS |
| C44 | coins/gems = -1 -> CHECK violation | go `TestPlayers_NonNegativeCurrencyConstraint` PASS | `api/internal/player/player_test.go:233` `pgErr.Code != "23514"` for both columns; constraint at `api/migrations/00001_init.sql:12-13` | PASS |
| C45 | panicking route on `NewRouter` -> 500 internal, log has `X-Request-Id` | go `TestRecover_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:113` `500 && "internal"`; `:120` log contains `"request_id":"<id>"`. Same assembly: `api/cmd/api/main.go:46` and `api/internal/apptest/apptest.go:63` both call `app.NewRouter` | PASS |
| C46 | compose db, go build/vet, npm run build exit 0 | `make ci-build` exit 0 | `Makefile:18-20` (db-up; `go build ./... && go vet ./...`; `npm run build`). The Next build listed all 9 routes | PASS |
| C47 | go.mod requires chi/pgx/goose/oauth2, not gorm | `make check-deps` -> `deps ok` | `api/go.mod:6-9` the four requires; `Makefile:22-28` grep incl. `! grep -q 'gorm.io/gorm'` | PASS |

**Checks proven: 46/47** (C19 not proven).

## Coverage

Recomputed from the plan's `Surface` / `Landing` / `Relations` / `Observable` and from the code. The checks.md table was not read back as-is.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/auth/github/login` statuses (1) | plan Surface; `api/internal/auth/handlers.go:76` | 302 C2 | - |
| `GET /api/auth/github/callback` statuses (1 in Surface, 2 in code) | Surface; `handlers.go:86,93,102` redirects, `handlers.go:97-99` returns err -> 500 | 302 C3 · C4 · C5 | 500 when `Sessions.Create` fails (`handlers.go:99`): emitted by the code, absent from Surface, no proof |
| `POST /api/auth/logout` statuses (2) | Surface; `handlers.go:146` | 204 C7 · 401 C9 | - |
| `GET /api/me` statuses (4) | Surface; `api/internal/player/handlers.go:22-29` | 200 C22 · 401 C9 · 404 C38 | 500: C45 proves only a synthetic `/api/test/panic` route (`httpx_test.go:110`). The route's real 500 path is the returned error -> `httpx.Handle` -> `WriteError` default (`api/internal/httpx/errors.go:48-50,79-82`), and nothing covers it. Fault F3 survived |
| `GET /api/onboarding` statuses (2) | Surface; `player/handlers.go:31-37` | 200 C12 · 401 C9 | - |
| `POST /api/players` statuses (5) | Surface; `player/handlers.go:39-84` | 201 C14 · 401 C9 · 409 C16/C18/C20/C21 · 422 C15/C17 | 500 on this route (returned-error path, `errors.go:48-50`): same gap as above, F3 survived |
| `GET /api/catalog` statuses (2) | Surface; `api/internal/catalog/catalog.go:78-83` | 200 C31 · 304 C32 | - |
| `POST /api/me/travel` statuses (5) | Surface; `api/internal/world/travel.go:20-45` | 200 C35 · 401 C9 · 404 C38 · 422 C36/C37 | 500 on this route (returned-error path): same gap, F3 survived |
| AC 38 unexpected-error paths (2) | plan AC 38 "erro inesperado no handler"; code: `middleware.go:38-45` (panic), `errors.go:79-82` (returned error) | panic -> 500 + logged request_id: C45 | returned error -> 500 `internal` + `request_id` log (`errors.go:80`): no proof |
| error codes, door 7 (9) | plan Landing door 7; `errors.go:22-30` | C41, table-driven over all 9 (`httpx_test.go:58-66`) | - |
| error codes, door 12 (3) | plan Landing door 12; `errors.go:31-33`, `app/router.go:28-29`, `errors.go:61-66` | `not_found` · `method_not_allowed` · `invalid_body`: asserted only by the uncited `TestErrorEnvelope_GenericCodes` (`httpx_test.go:93-105`). It ran PASS for this report, but no check carries it | door 12 has no check (checks.md "Landing doors (11)" drops it) |
| Landing doors (12) | plan Landing | 1 C46 · 2 C11 · 3 C20 · 4 C16/C21 · 5 C32 · 6 C27 · 7 C41 · 8 C42 (F2 killed) · 9 C47 · 10 C44 · 11 C46 | door 12: no check |
| callback failure paths (code: 6) | AC 4/5; `handlers.go:85,107-110,117-124,129-134` | state missing in query · state cookie missing · state differs: C4 · token exchange fails · `/user` non-200: C5 | `/user` body undecodable (`handlers.go:129`) and user without id/login (`handlers.go:132`) redirect to `error=github` untested |
| session age boundary (2) | AC 9; `api/internal/auth/session.go:62` | 2591999 s · 2592001 s: C10 (F1 killed) | - |
| protected routes (5) | Surface + `app/router.go:41-48` | C9 over all 5 (`httpx_test.go:13-19`) | - |
| `409` / `422` on `POST /api/players` (2+2) | AC 12-15; `player/handlers.go:52,59,62,75,77` | dev_name_taken C16/C21 · player_exists C18/C20 · invalid_dev_name C15 · invalid_class C17 | - |
| `422` on travel (2) | AC 32-33; `travel.go:30,33` | level_too_low C36 · unknown_region C37 | - |
| devName bounds (8) | assumption row + AC 12; `player/player.go:54-60` | all 8 in C15 (`player_test.go:83,92`) | - |
| suggestion derivation (3) | assumption row; `player.go:63-77` | C12 (`player_test.go:31-35`) | - |
| classes (4) | AC 10/11; `player.go:34` | C12 (list) · C14 (create each) | - |
| relations constraints (4) | plan Relations; `api/migrations/00001_init.sql:4,12-13,20` | github_user_id unique C20 · dev_name upper unique C16/C21 · coins/gems >= 0 C44 · region = catalog id C37 | - |
| entities (3) | plan Relations | Player C14 · Session C3/C11 · GithubIdentity C20 | - |
| HUD fetch outcomes (6) | AC 1, 18-21; `web/src/components/GameShell.tsx:31-39` | 200 C23/C30 · pending C24 · 5xx C25 · network C25 · 401 C1 · 404 C13 | - |
| HUD fields (6) | AC 18; `web/src/components/Hud.tsx:25-46` | C23 | - |
| tabs (7) | AC 22; `web/src/components/Tabs.tsx:6-14` | C26 | - |
| unshipped scenes (5) | AC 24; `web/src/app/(game)/*/page.tsx` | C28 | - |
| title signs (4) | AC 25; `web/src/components/TitleScene.tsx:4-9` | C29 | - |
| regions (6) | AC 27; `api/catalog/regions.json:2-7` | C31 | - |
| region lock at level 1 (6) | AC 30; `WorldScene.tsx:67,82` | C34 (F4 killed) | - |
| login error banner (3 spec + 1 code) | AC 6; `web/src/components/LoginScreen.tsx:1,11` | github · state · none: C6 | unknown `error` value suppressed by `KNOWN_ERRORS` (`LoginScreen.tsx:11`): decision row not asserted |
| Observable screen states (14 landed rows) | plan Observable | login empty C1 · login error C6 · onboarding empty C13 · onboarding unauth C1 · hud loading C24 · hud error C25 · hud unauth C1 · hud empty C13 · hud ordering C26 · em breve C28 · mundo error C25 (shared shell) · mundo unauth C1 | onboarding error (AC 16 placement "sob o campo"): C19 does not assert it, F5 survived. mundo ordering (landed on AC 27): proven only at the api (C31); the screen's render order is not asserted |
| startup config: router (1 shared assembly) | `api/cmd/api/main.go:46`, `api/internal/apptest/apptest.go:63` | both call `app.NewRouter`; C45 and every Go proof | - |
| startup config: `/api` rewrite (1) | `web/next.config.ts:8`, `web/playwright.config.ts:40` (`API_URL`) | C27 / C40 via the browser on :3100 | - |

Level: every claim naming a status or route is proven through `app.NewRouter` over HTTP (`apptest.go:80`). There is no level gap except the `500` members above, which were never proven on their own routes.

`Swept`: no row resolves to **existing**. Every row cites checks, and the data-lifecycle row cites open question 1. There is no existing constraint to re-read.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | devName validation `api/internal/player/player.go:54-60`; travel guards `api/internal/world/travel.go:28-34`; session validity `api/internal/auth/session.go:58-71,89-108`; error mapping `api/internal/httpx/errors.go:46-52,72-83` | boundary **and** own layer | no. The boundary proofs cover every row (C15, C35-C37, C9/C10). But `NormalizeDevName` was extracted as a function (checks.md: "tabela na própria camada se extraída como função") and has no own-layer test. `WriteError`'s non-`*Error` -> `internal` row and `Handle`'s log row have no case at any level (F3 survived) |
| Decides, not reached across a boundary | suggestion derivation `player.go:63-77`; scene components `web/src/components/{GameShell,Onboarding,WorldScene,LoginScreen,Hud}.tsx` ("decides at screen level", one case per state) | own layer | no. Suggestion derivation is met (C12). Screen decision rows with no asserted case: `GameShell.tsx:36` catalog failure -> down; `GameShell.tsx:33` 404 with another code -> down; `Onboarding.tsx:20-21,27` onboarding load error/network; `Onboarding.tsx:43,45` other create errors/network; `WorldScene.tsx:30,32` travel error message; `LoginScreen.tsx:11` unknown error value; C19 placement (F5 survived) |
| Entry point that decides nothing | `GET /api/catalog` `api/internal/catalog/catalog.go:74-84`; `GET /api/onboarding` `player/handlers.go:31-37` | boundary | yes. Accepted input C31/C12, conditional request C32, 401 C9. No rejected-input path exists |
| Instrumentation, pass-throughs | `web/src/lib/api.ts`, `web/src/components/{Tabs,ComingSoon,TitleScene,ServerDown}.tsx`, `web/src/app/(game)/*/page.tsx`, `api/internal/app/router.go`, `api/cmd/api/main.go` | none of its own | yes. Covered by consumers C25-C30, C8/C27/C40 and every Go proof through `NewRouter` |

## Faults injected

Isolated in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` symlinked in. The real tree's `git status --porcelain` was `?? .claude/` before and after, identical. The worktree was removed with `git worktree remove --force`. `git stash` was not used.

| Mutation | Location | Killed |
| --- | --- | --- |
| session age bound shifted: `SessionMaxAge` -> `SessionMaxAge+2` in Lookup | `api/internal/auth/session.go:63` | yes - `TestSession_ExpiryBoundary` FAIL ("want 401 unauthenticated") |
| removed `FOR UPDATE` from the locked player read | `api/internal/player/player.go:111` | yes - `TestTravel_SerializesOnPlayerRowLock` FAIL ("travel answered 422 while the row was locked") |
| non-`*Error` mapped to `ErrNotFound` instead of `ErrInternal` (real-handler 500 -> 404) | `api/internal/httpx/errors.go:49` | no - survived the full `go test ./...` (all 5 packages ok) |
| region open bound `>=` -> `>` | `web/src/components/WorldScene.tsx:67` | yes - `locks regions above player level` FAIL |
| `NOME JÁ EM USO` moved out of the name field's `<label>` to the bottom of the form | `web/src/components/Onboarding.tsx:66` | no - survived `dev_name_taken shows NOME JÁ EM USO` (1 passed) |

## Gate

- `go test ./internal/... -run '^(28 names)$' -v -count=1`: 28 passed, 0 failed. `TestErrorEnvelope_GenericCodes` was also run: 1 passed.
- `npx vitest run <8 files> -t "<14 names>"`: 24 passed, 0 failed.
- `npx playwright test`: 3 passed, 0 failed.
- `make ci-build`: exit 0. `make check-deps`: `deps ok`.
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py foundation`: `ERROR foundation: verdict is FAIL - route the ranked gaps back as fixes, then re-verify` / `1 error(s), 0 warning(s) across [foundation]`, exit 1.
