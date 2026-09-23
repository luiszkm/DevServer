# Foundation verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 591b2c4..1d6edf0
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Every proof C1..C50 was re-run at `HEAD` = `1d6edf0` on `feat/foundation`, against the compose Postgres (port 5433). The fix diff is `ebf62f6..1d6edf0`. It touches `auth_test.go`, `fakegithub/fake.go`, `httpx_test.go`, the new `player/devname_test.go`, `login/page.test.tsx`, `GameShell.test.tsx`, `Onboarding.test.tsx`, `WorldScene.test.tsx`, and adds a `plan.md` Surface row. It does not touch production code.

What the fix closed:

- C19 is now proven. The round-1 survivor (placement) is killed.
- The `WriteError` default mapping is now proven by C49 and C50. The round-1 survivor is killed.
- Door 12 now has C48.
- The callback `500` has a Surface row, a Coverage row and a proof (C50).
- `NormalizeDevName` now has an own-layer table.
- Most of the screen decision rows now have tests.

Why it is still FAIL:

- The screen Test policy row is still unmet. The onboarding network-error branches named in round 1 (`Onboarding.tsx:27`, `:45`) still have no case, and neither does the `onCreated` catalog-failure branch (`GameShell.tsx:51-53`).
- One member of the callback failure paths has no proof: the `GET /user` transport error (`handlers.go:117-119`).
- The `Handle` row for "expected `*Error` is not logged" has no case.

## Binding sources

Carried from ebf62f6. Profile is `standard`, so step 1 does not run. The plan marks no source as binding, and the fix did not touch any screen's interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (profile standard - step 1 not run) | n/a | - | - |

## Checks

Verified at 1d6edf0. Batched runs, and each named test shows individually as run and passed:

- **Go:** `cd api && go test ./internal/... -run '^(TestLogin_RedirectsWithState|TestCallback_Success|TestCallback_BadState|TestCallback_GithubFailure|TestLogout_DeletesSession|TestAuthMiddleware_RejectsEveryProtectedRoute|TestSession_ExpiryBoundary|TestSession_StoresOnlyHash|TestOnboarding_SuggestsDevName|TestCreatePlayer_InitialState|TestCreatePlayer_DevNameBounds|TestCreatePlayer_DevNameTakenCaseInsensitive|TestCreatePlayer_InvalidClass|TestCreatePlayer_PlayerExists|TestCreatePlayer_ConcurrentSameUser|TestCreatePlayer_ConcurrentSameName|TestMe_ReturnsSessionPlayer|TestCatalog_ServesRegions|TestCatalog_ETag|TestTravel_AtMinLevel|TestTravel_LevelTooLow|TestTravel_UnknownRegion|TestPlayerNotFound_OnPlayerRoutes|TestErrorEnvelope_EveryCode|TestTravel_SerializesOnPlayerRowLock|TestTravel_ConcurrentRequests|TestPlayers_NonNegativeCurrencyConstraint|TestRecover_Returns500AndLogsRequestID|TestErrorEnvelope_GenericCodes|TestHandlerError_Returns500AndLogsRequestID|TestCallback_SessionStoreFailure|TestNormalizeDevName)$' -v -count=1 -p 1`
  - 32 top-level `--- PASS`, which covers every one of the 32 names.
  - Subtests: C4 3/3 `--- PASS`, C5 5/5 `--- PASS`.
  - Packages: auth, catalog, httpx, player and world all `ok`.
- **vitest:** `cd web && npx vitest run <the 8 test files> --reporter=verbose`. 8 files, 34 tests passed, and each named test is listed with a check mark (it.each expanded). Round 1 had 24 tests.
- **Playwright:** `cd web && npx playwright test --reporter=list`. 3 passed: `logout returns to login`, `tab click keeps document and HUD`, `travel persists`.
- **Make:** `make ci-build` exit 0. `make check-deps` prints `deps ok` and exits 0.

Every proof file is new in `591b2c4..HEAD`. The citations for files the fix touched were refreshed at 1d6edf0. The citations for files it did not touch (player_test, world_test, catalog_test, Hud/Tabs/ComingSoon/TitleScene tests, e2e specs) were re-read at 1d6edf0, and every line still holds.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 401 -> login screen with `ENTRAR COM GITHUB` | vitest `401 shows login screen` pass | `web/src/components/GameShell.test.tsx:15` `findByRole("link", { name: "ENTRAR COM GITHUB" })`; `:17` scene not rendered | PASS |
| C2 | login 302 to authorize, state == cookie, Max-Age=600 | go `TestLogin_RedirectsWithState` PASS | `api/internal/auth/auth_test.go:51` `rec.Code != http.StatusFound`; `:58` authorize URL; `:66` `c.Value != state`; `:69` `c.MaxAge != 600`; strengthened `:73` second login's state `== state` fails (fault F4 killed) | PASS |
| C3 | callback success: 1 session row, cookie attrs, 302 `/` | go `TestCallback_Success` PASS | `api/internal/auth/auth_test.go:84` 302 + `Location == "/"`; `:88` `HttpOnly`, `SameSiteLaxMode`, `Path "/"`, `MaxAge 2592000`; `:97` `n != 1 \|\| ghID != 42` | PASS |
| C4 | missing/different state -> `/login?error=state`, 0 sessions | go `TestCallback_BadState` PASS (3 subcases) | `api/internal/auth/auth_test.go:114` `Location != "/login?error=state"`; `:117` `env.Count("sessions") != 0` | PASS |
| C5 | code exchange / `GET /user` fail -> `/login?error=github`, 0 sessions | go `TestCallback_GithubFailure` PASS (5 subcases) | `api/internal/auth/auth_test.go:127-131` 5 failure modes (token, /user non-200, non-JSON, no id, no login, via `fakegithub.SetUserBody` `api/internal/fakegithub/fake.go:77,132-135`); `:139` `Location != "/login?error=github"`; `:142` sessions 0 (fault F3 killed) | PASS |
| C6 | banner above button for github/state; absent without error | vitest `shows error banner (error=github/state)`, `shows error banner only for known errors (no error param / unknown error value)` pass | `web/src/app/login/page.test.tsx:13` `banner.compareDocumentPosition(button) & DOCUMENT_POSITION_FOLLOWING`; `:21` `queryByText(BANNER)).not.toBeInTheDocument()` over `{}` and `{error:"whatever"}` (`:17-18`) | PASS |
| C7 | logout 204, row deleted, `Max-Age=0` | go `TestLogout_DeletesSession` PASS | `api/internal/auth/auth_test.go:155` `StatusNoContent`; `:158` sessions 0; `:161` `strings.Contains(raw, "Max-Age=0")` | PASS |
| C8 | SAIR -> login, reload stays | playwright `logout returns to login` pass | `web/e2e/auth.spec.ts:8` login link visible; `:10` after `page.reload()` still visible | PASS |
| C9 | 5 protected routes x (no cookie, unknown token) -> 401 unauthenticated | go `TestAuthMiddleware_RejectsEveryProtectedRoute` PASS | `api/internal/httpx/httpx_test.go:14-20` the 5 routes; `:31` `rec.Code != 401 \|\| ErrorCode != "unauthenticated"` | PASS |
| C10 | 2591999 s accepted, 2592001 s -> 401 | go `TestSession_ExpiryBoundary` PASS | strengthened `api/internal/auth/auth_test.go:179` accepted side now asserts `404 && "player_not_found"` (session passed auth, no player), no longer only `!= 401`; `:186` `401 && "unauthenticated"`. Round-1 precision note resolved | PASS |
| C11 | sessions stores SHA-256, never the token | go `TestSession_StoresOnlyHash` PASS | `api/internal/auth/auth_test.go:203` `bytes.Equal(stored, sha256(token))`; `:206` raw token absent | PASS |
| C12 | suggestion derivation x3 + 4 classes | go `TestOnboarding_SuggestsDevName` PASS | `api/internal/player/player_test.go:47` `SuggestedDevName != want`; `:50` `DeepEqual(Classes, [FRONTEND BACKEND DEVOPS FULLSTACK])` | PASS |
| C13 | 404 -> onboarding with suggestion and 4 classes | vitest `404 opens onboarding with suggestion` pass | `web/src/components/GameShell.test.tsx:30` `toHaveValue("OCTOCAT")`; `:32` each class button `toBeEnabled()` | PASS |
| C14 | 201 initial state for each of 4 classes | go `TestCreatePlayer_InitialState` PASS | `api/internal/player/player_test.go:63` `StatusCreated`; `:69` want (1, 0, 500, 100, 100, ...) compared as a full struct | PASS |
| C15 | devName bounds (5 rejected, 3 accepted, lowercase stored upper) | go `TestCreatePlayer_DevNameBounds` PASS | `api/internal/player/player_test.go:84` `status != 422 \|\| code != "invalid_dev_name"`; `:88` players 0; `:94` 201; `:98` `DevName != stored` | PASS |
| C16 | `dev_01` vs existing `DEV_01` -> 409 dev_name_taken | go `TestCreatePlayer_DevNameTakenCaseInsensitive` PASS | `api/internal/player/player_test.go:108` `status != 409 \|\| code != "dev_name_taken"` | PASS |
| C17 | `WIZARD` -> 422 invalid_class, no player | go `TestCreatePlayer_InvalidClass` PASS | `api/internal/player/player_test.go:116` `422 invalid_class`; `:119` players 0 | PASS |
| C18 | second create -> 409 player_exists, row byte-identical | go `TestCreatePlayer_PlayerExists` PASS | `api/internal/player/player_test.go:136` `409 player_exists`; `:139` `after != before` | PASS |
| C19 | 409 dev_name_taken -> onboarding open, `NOME JÁ EM USO` under the name field | vitest `dev_name_taken shows NOME JÁ EM USO` pass | `web/src/components/Onboarding.test.tsx:22` `expect(input.closest("label")).toContainElement(message)`; `:23` `input.compareDocumentPosition(message) & DOCUMENT_POSITION_FOLLOWING`; `:24` `onCreated` not called. Round-1 survivor re-injected as F5: killed | PASS |
| C20 | 10 concurrent same-user creates -> 1x201, 9x409, 1 row | go `TestCreatePlayer_ConcurrentSameUser` PASS | `api/internal/player/player_test.go:174` `DeepEqual(results, want)`; `:177` players 1 | PASS |
| C21 | concurrent `DEV_01`/`dev_01` by 2 users -> 201 + 409 dev_name_taken | go `TestCreatePlayer_ConcurrentSameName` PASS | `api/internal/player/player_test.go:191` `DeepEqual(results, ["201 ", "409 dev_name_taken"])` | PASS |
| C22 | `GET /api/me` 200 returns session's player | go `TestMe_ReturnsSessionPlayer` PASS | `api/internal/player/player_test.go:203` 200; `:206` `DevName != want` | PASS |
| C23 | HUD shows LEVEL 3, 40/1000, HP 80/140, 55, 7, 2 | vitest `renders player values` pass | `web/src/components/Hud.test.tsx:14` loop over the 6 strings with `within(hud).getByText(text)` | PASS |
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
| C41 | 9 codes in envelope with JSON content type | go `TestErrorEnvelope_EveryCode` PASS | `api/internal/httpx/httpx_test.go:69` `len(cases) != 9`; `:79` `application/json`; `:87` exactly `{error:{code,message}}`, code match, message non-empty | PASS |
| C42 | travel blocks on held FOR UPDATE, 200 after commit | go `TestTravel_SerializesOnPlayerRowLock` PASS | `api/internal/world/world_test.go:95` early answer while locked fails; `:107` `code != 200` after commit | PASS |
| C43 | 20 concurrent travels all 200, final vila/floresta | go `TestTravel_ConcurrentRequests` PASS | `api/internal/world/world_test.go:134` each `code != 200`; `:138` final region in {vila, floresta} | PASS |
| C44 | coins/gems = -1 -> CHECK violation | go `TestPlayers_NonNegativeCurrencyConstraint` PASS | `api/internal/player/player_test.go:233` `pgErr.Code != "23514"` | PASS |
| C45 | panicking route on `NewRouter` -> 500 internal, log has `X-Request-Id` | go `TestRecover_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:114` `500 && "internal"`; `:121` log contains `"request_id":"<id>"`. Same assembly: `api/cmd/api/main.go:46` and `api/internal/apptest/apptest.go:63` both call `app.NewRouter` | PASS |
| C46 | compose db, go build/vet, npm run build exit 0 | `make ci-build` exit 0 | `Makefile:18-20` (db-up; `go build ./... && go vet ./...`; `npm run build`). The Next build listed all routes | PASS |
| C47 | go.mod requires chi/pgx/goose/oauth2, not gorm | `make check-deps` -> `deps ok`, exit 0 | `api/go.mod:6-9` the four requires; `Makefile:22-28` grep incl. `! grep -q 'gorm.io/gorm'` | PASS |
| C48 | unknown route 404 not_found, wrong method 405 method_not_allowed, malformed JSON on travel 422 invalid_body | go `TestErrorEnvelope_GenericCodes` PASS | `api/internal/httpx/httpx_test.go:97` `rec.Code != 404 \|\| ErrorCode != "not_found"`; `:100` `405 && "method_not_allowed"`; `:103` `422 && "invalid_body"` (the `ErrorCode` helper decodes the envelope) | PASS |
| C49 | handler error on `GET /api/me`, `POST /api/players`, `POST /api/me/travel` -> 500 internal + log with request_id | go `TestHandlerError_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:130` `ALTER TABLE players RENAME` (precondition); `:137-139` the 3 real routes; `:142` `rec.Code != 500 \|\| ErrorCode != "internal"`; `:147` log contains `"request_id":"<X-Request-Id>"` (faults F1 and F2 killed) | PASS |
| C50 | session write fails in callback -> 500 internal, no `ds_session` | go `TestCallback_SessionStoreFailure` PASS | `api/internal/auth/auth_test.go:214` `DROP TABLE sessions` (precondition); `:219` `500 && "internal"`; `:222` `rawSetCookie(rec, SessionCookie) != ""` fails (fault F1 killed) | PASS |

**Checks proven: 50/50**, each with a located `file:line`.

## Coverage

This section is verified at 1d6edf0. I recomputed every row whose authority the fix touched: callback statuses, the three `500` members, door 12, AC 38 paths, callback failure paths, login banner values, Observable screen states, and the screen decision rows. Every other row is carried from ebf62f6, and its members and proofs were re-run at 1d6edf0.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/auth/github/login` statuses (1) | plan Surface; `api/internal/auth/handlers.go:76` | 302 C2 | - |
| `GET /api/auth/github/callback` statuses (2) | plan Surface (now carries the `500` row); `handlers.go:86,93,102` redirects, `handlers.go:97-99` returned err | 302 C3 · C4 · C5 · 500 C50 | - |
| `POST /api/auth/logout` statuses (2) | Surface; `handlers.go:146` | 204 C7 · 401 C9 | - |
| `GET /api/me` statuses (4) | Surface; `api/internal/player/handlers.go` | 200 C22 · 401 C9 · 404 C38 · 500 C49 | - |
| `GET /api/onboarding` statuses (2) | Surface | 200 C12 · 401 C9 | - |
| `POST /api/players` statuses (5) | Surface | 201 C14 · 401 C9 · 409 C16/C18/C20/C21 · 422 C15/C17 · 500 C49 | - |
| `GET /api/catalog` statuses (2) | Surface; `api/internal/catalog/catalog.go` | 200 C31 · 304 C32 | - |
| `POST /api/me/travel` statuses (5) | Surface; `api/internal/world/travel.go` | 200 C35 · 401 C9 · 404 C38 · 422 C36/C37 · 500 C49 | - |
| AC 38 unexpected-error paths (2) | plan AC 38; `api/internal/httpx/middleware.go` (panic), `api/internal/httpx/errors.go:48-50,79-82` (returned error) | panic C45 · returned error C49 (+ callback C50) | - |
| error codes, door 7 (9) | plan Landing door 7; `errors.go:22-30` | C41, table-driven over all 9 | - |
| generic router codes, door 12 (3) | plan Landing door 12; `errors.go:31-33`, `api/internal/app/router.go:28-29`, `errors.go:61-66` | `not_found` · `method_not_allowed` · `invalid_body`: C48 | - |
| Landing doors (12) | plan Landing | 1 C46 · 2 C11 · 3 C20 · 4 C21 · 5 C32 · 6 C27 · 7 C41 · 8 C42 · 9 C47 · 10 C44 · 11 C46 · 12 C48 | - |
| callback failure paths (code: 9) | AC 4/5; `handlers.go:85,107-110,117-124,129-134` | state missing · state cookie missing · state differs: C4 · token exchange fails · `/user` non-200 · body not JSON · no id · no login: C5 | `GET /user` transport error (`handlers.go:117-119`, `http.DefaultClient.Do` returns err, i.e. GitHub unreachable): no case. `FailUser` answers 500 (`fake.go:122-124`), so it reaches `:122` only. checks.md's table of 8 does not list this branch |
| session age boundary (2) | AC 9; `api/internal/auth/session.go:63` | 2591999 s · 2592001 s: C10 (accepted side now asserts `404 player_not_found`) | - |
| protected routes (5) | Surface + `app/router.go` | C9 over all 5 | - |
| `409` / `422` on `POST /api/players` (2+2) | AC 12-15 | dev_name_taken C16/C21 · player_exists C18/C20 · invalid_dev_name C15 · invalid_class C17 | - |
| `422` on travel (2) | AC 32-33 | level_too_low C36 · unknown_region C37 | - |
| devName bounds (8) | assumption row + AC 12; `api/internal/player/player.go:54-60` | all 8 in C15 (boundary) and `TestNormalizeDevName` (`api/internal/player/devname_test.go:15-23`, own layer) | - |
| suggestion derivation (3) | `player.go:63-77` | C12 | - |
| classes (4) | AC 10/11; `player.go:34` | C12 · C14 | - |
| relations constraints (4) | plan Relations; `api/migrations/00001_init.sql` | github_user_id unique C20 · dev_name upper unique C16/C21 · coins/gems >= 0 C44 · region = catalog id C37 | - |
| entities (3) | plan Relations | Player C14 · Session C3/C11 · GithubIdentity C20 | - |
| HUD fetch outcomes (6) | AC 1, 18-21; `web/src/components/GameShell.tsx:31-39` | 200 C23/C30 · pending C24 · 5xx C25 · network C25 · 401 C1 · 404 C13 | - |
| HUD fields (6) | AC 18; `web/src/components/Hud.tsx` | C23 | - |
| tabs (7) | AC 22 | C26 | - |
| unshipped scenes (5) | AC 24 | C28 | - |
| title signs (4) | AC 25 | C29 | - |
| regions (6) | AC 27; `api/catalog/regions.json` | C31 | - |
| region lock at level 1 (6) | AC 30; `web/src/components/WorldScene.tsx:67,82` | C34 | - |
| login error banner (4) | AC 6; `web/src/components/LoginScreen.tsx:1,11` | github · state · none · unknown value: C6 (`web/src/app/login/page.test.tsx:9,16-21`) | - |
| Observable screen states (14 landed rows) | plan Observable | login empty C1 · login error C6 · onboarding empty C13 · onboarding error C19 (placement now asserted, F5 killed) · onboarding unauth C1 · hud loading C24 · hud error C25 · hud unauth C1 · hud empty C13 · hud ordering C26 · em breve C28 · mundo error C25 · mundo unauth C1 · mundo ordering (render order follows the catalog: `web/src/components/WorldScene.test.tsx:55`) | - |
| startup config: router (1 shared assembly) | `api/cmd/api/main.go:46`, `api/internal/apptest/apptest.go:63` | both call `app.NewRouter`; C45, C48-C50 and every Go proof | - |
| startup config: `/api` rewrite (1) | `web/next.config.ts:8`, `web/playwright.config.ts` | C27 / C40 via the browser | - |

Level: every claim naming a status or route, including the new C48-C50, is proven through `app.NewRouter` over HTTP. There is no level gap.

`Swept`: carried from ebf62f6. No row resolves to **existing**. Every row cites checks, and data lifecycle cites open question 1.

## Test policy rows

Verified at 1d6edf0. All rows are re-judged, because round 1 left two of them unmet and the fix touched files classified by three of them.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | devName validation `api/internal/player/player.go:54-60`; travel guards `api/internal/world/travel.go`; session validity `api/internal/auth/session.go`; error mapping `api/internal/httpx/errors.go:46-52,72-83` | boundary **and** own layer | **no**. Now met: the `NormalizeDevName` own-layer table (`api/internal/player/devname_test.go:15-29`, 9 rows); `WriteError` non-`*Error` -> `internal` (C49/C50, F1 killed); the `Handle` log on unexpected error (C49 `httpx_test.go:147`, F2 killed). Still missing: the `Handle` row `errors.As(err, &e)` true -> **not** logged (`errors.go:79`) has no asserted case at any level. A mutant that logs every error would survive every proof |
| Decides, not reached across a boundary | suggestion derivation `player.go:63-77`; scene components `web/src/components/{GameShell,Onboarding,WorldScene,LoginScreen,Hud}.tsx` | own layer | **no**. Now asserted: `GameShell.tsx:33` 404 with another code (`GameShell.test.tsx:64-67`); `GameShell.tsx:36` catalog failure (`:70-77`); `Onboarding.tsx:20-21` load error (`Onboarding.test.tsx:31-34`); `Onboarding.tsx:43` other create error (`:37-48`); `Onboarding.tsx:82` submit disabled without class (`:51-54`); `Onboarding.tsx:38-39` success hands player (`:57-69`); `WorldScene.tsx:30` travel refused (`WorldScene.test.tsx:58-68`); `WorldScene.tsx:32` travel network error (`:71-75`); `LoginScreen.tsx:11` unknown value (`page.test.tsx:16-21`); C19 placement. Still with no asserted case: `Onboarding.tsx:27` onboarding load **network** error -> `SERVIDOR FORA DO AR` (named in round 1); `Onboarding.tsx:44-45` create **network** error -> `SERVIDOR FORA DO AR` (named in round 1); `GameShell.tsx:51-53` `onCreated` catalog failure/throw -> down (the success side is only reached by the e2e `web/e2e/helpers.ts:16-17`). A search for `Failed to fetch` in `web/src` finds only `GameShell.test.tsx:39` and `WorldScene.test.tsx:72` |
| Entry point that decides nothing | `GET /api/catalog` `catalog.go`; `GET /api/onboarding` | boundary | yes (carried from ebf62f6, unaffected by the fix). Accepted input C31/C12, conditional request C32, 401 C9 |
| Instrumentation, pass-throughs | `web/src/lib/api.ts`, `web/src/components/{Tabs,ComingSoon,TitleScene,ServerDown}.tsx`, `web/src/app/(game)/*/page.tsx`, `api/internal/app/router.go`, `api/cmd/api/main.go`, `api/internal/fakegithub/fake.go` (test double, changed by the fix) | none of its own | yes. Covered by consumers. The new `SetUserBody` (`fake.go:77-81,132-135`) is exercised by the C5 subcases, and F3 shows those subcases discriminate |

## Faults injected

Verified at 1d6edf0. The faults ran in `git worktree add <scratchpad>/wt2 HEAD`, with the real `web/node_modules` symlinked into `wt2/web/`. After each fault, `git checkout -- <file>` in the worktree was followed by an empty `git status --porcelain` there. At the end, `git worktree remove --force` ran and `git worktree list` showed only the main tree. The real tree's `git status --porcelain` read `?? .claude/` both before and after (diffed identical). `git stash` was not used. There were 5 faults (the cap), one per distinct assertion surface the fix touched or created, and they include both round-1 survivors.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round-1 survivor): non-`*Error` mapped to `ErrNotFound` instead of `ErrInternal` | `api/internal/httpx/errors.go:49` | yes. `TestHandlerError_Returns500AndLogsRequestID` FAIL on all 3 routes ("want 500 internal"), and `TestCallback_SessionStoreFailure` FAIL |
| F2: removed the `logger.Error("request failed", "request_id", ...)` call in `Handle` | `api/internal/httpx/errors.go:80` | yes. `TestHandlerError_Returns500AndLogsRequestID` FAIL ("log lacks request id" x3) |
| F3: removed the `u.ID == 0 \|\| u.Login == ""` guard (`if false`) | `api/internal/auth/handlers.go:132` | yes. `TestCallback_GithubFailure` FAIL on the subcases `GET /user without id` and `without login` |
| F4: OAuth state made constant (`hex.EncodeToString(make([]byte, len(b)))`) | `api/internal/auth/handlers.go:74` | yes. `TestLogin_RedirectsWithState` FAIL ("two logins produced the same state") |
| F5 (round-1 survivor): `NOME JÁ EM USO` moved out of the name field's `<label>` to the bottom of the form | `web/src/components/Onboarding.tsx:66` | yes. `dev_name_taken shows NOME JÁ EM USO` FAIL at `Onboarding.test.tsx:22` `toContainElement` |

Not mutated because of the cap: the new screen tests (`GameShell.test.tsx:64-77`, `Onboarding.test.tsx:31-69`, `WorldScene.test.tsx:51-75`), C10's strengthened accepted side, and C48. Each ran green at 1d6edf0. None has been made to fail once.

## Gate

Verified at 1d6edf0.

- `go test ./internal/... -run '^(32 names)$' -v -count=1 -p 1`: 32 passed, 0 failed (plus subtests C4 3/3 and C5 5/5).
- `npx vitest run <8 files> --reporter=verbose`: 34 passed, 0 failed.
- `npx playwright test`: 3 passed, 0 failed.
- `make ci-build`: exit 0. `make check-deps`: `deps ok`, exit 0.
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py foundation`: see the output below.

```
  ERROR foundation: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [foundation]
```

Exit 1. The only error is the FAIL verdict. No row contradicts the verdict.

## Ranked remaining gaps

1. Screen decision rows with no asserted case. This is a Test policy row, "Decides, not reached across a boundary". Two of the branches were named in round 1 and are still not fixed:
   - `web/src/components/Onboarding.tsx:27`: load network error -> `SERVIDOR FORA DO AR`
   - `web/src/components/Onboarding.tsx:44-45`: create network error -> `SERVIDOR FORA DO AR`
   - `web/src/components/GameShell.tsx:51-53`: `onCreated` catalog failure -> down
2. Callback failure path member with no proof: `GET /user` transport error. Coverage row "callback failure paths", checks C5 and AC 5, at `api/internal/auth/handlers.go:117-119`. checks.md's set of 8 omits this branch.
3. `Handle` row for "expected `*Error` is not logged" has no asserted case. Test policy row "Decides, reached across a boundary", at `api/internal/httpx/errors.go:79`.
