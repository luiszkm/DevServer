# Foundation verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 591b2c4..3e98ec5
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 4 was approved by the user past the three-round bound. Every proof C1..C52 was re-run at `HEAD` = `3e98ec5` on `feat/foundation`, against the compose Postgres (port 5433). Every whole suite was run and its **exit code** recorded. The fix diff is `8c8dbea..3e98ec5`:

- production: `web/src/components/GameShell.tsx:61-68` (`logout` now `try/catch`, then `setState` unconditionally); `api/internal/auth/session.go:90,99-102` (`RequireSession` takes a logger, logs `request_id` and answers `httpx.ErrInternal` on a lookup error); `api/internal/app/router.go:41` (passes `d.Logger`)
- tests: `api/internal/httpx/httpx_test.go:176-205` (two new tests, appended), `web/src/components/Onboarding.test.tsx:111-129` (two new cases, appended)
- specs: `checks.md` gains C51, C52 and two Coverage rows; `STATE.md` handoff

Every round-3 ranked gap is closed, and each closing test was made to fail by a fault in this round:

1. `npx vitest run` exits 0 (53/53, no unhandled error). The offline logout no longer rejects out of the click handler (F1 killed).
2. `CRIAR DEV` disabled while the create is in flight: `Onboarding.test.tsx:111-119` (F2 killed).
3. Session lookup DB error: `500 internal` plus a `request_id` log line, C52 `httpx_test.go:177-191` (F4 killed). The round-3 observation (no log on this path) is resolved.
4. `invalid_body` on `POST /api/players`: C51 `httpx_test.go:194-205` (F5 killed).
5. `aria-pressed`: `Onboarding.test.tsx:121-129` (F3 killed).

## Binding sources

Carried from 8c8dbea (itself carried from ebf62f6). Profile is `standard`, so step 1 does not run; the plan marks no source as binding, and the fix changed no screen's interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (profile standard - step 1 not run) | n/a | - | - |

## Checks

Verified at 3e98ec5. Runs:

- **Go whole suite:** `cd api && go test -count=1 ./...` **exit 0** (auth, catalog, httpx, player, world `ok`). Same with `-v`: exit 0, 35 top-level `--- PASS`, 0 `--- FAIL`. Every Go proof name of C2-C5, C7, C9-C12, C14-C18, C20-C22, C31, C32, C35-C38, C41-C45, C48-C52 appears individually as `--- PASS`, including the new `TestCreatePlayer_InvalidBody` and `TestSessionLookupError_Returns500AndLogsRequestID`. Subtests: C4 3/3, C5 6/6 `--- PASS`.
- **vitest whole suite:** `cd web && npx vitest run --reporter=verbose` **exit 0**. 8 files, 53 tests passed, each listed with a check mark; no "Unhandled" line in the output. `make test-web` exit 0. Every C1/C6/C13/C19/C23-C26/C28-C30/C33/C34/C39 test is in the list (it.each expanded).
- **Playwright:** `cd web && npx playwright test --reporter=list` **exit 0**. 3 passed: `logout returns to login`, `tab click keeps document and HUD`, `travel persists`.
- **Make:** `make ci-build` **exit 0** (Next build listed the routes). `make check-deps` prints `deps ok`, **exit 0**.

Citations: the fix only appended to `httpx_test.go` (after line 174) and `Onboarding.test.tsx` (after line 109), and touched no other test file, so every C1..C50 citation is unchanged; I re-read a sample of them at `HEAD` (`httpx_test.go:32,70,98,101,104,115,122,143,148`, `GameShell.test.tsx:15,30,46,60,61`, `Onboarding.test.tsx:22,23`, `auth_test.go:51,69,140,223`, `player_test.go:84,174,233`, `world_test.go:95,107`) and each holds the cited assertion. Every proof file is new in `591b2c4..HEAD`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 401 -> login screen with `ENTRAR COM GITHUB` | vitest `401 shows login screen` pass | `web/src/components/GameShell.test.tsx:15` `findByRole("link", { name: "ENTRAR COM GITHUB" })`; `:17` scene not rendered | PASS |
| C2 | login 302 to authorize, state == cookie, Max-Age=600 | go `TestLogin_RedirectsWithState` PASS | `api/internal/auth/auth_test.go:51` `rec.Code != http.StatusFound`; `:58` authorize URL; `:66` `c.Value != state`; `:69` `c.MaxAge != 600` | PASS |
| C3 | callback success: 1 session row, cookie attrs, 302 `/` | go `TestCallback_Success` PASS | `api/internal/auth/auth_test.go:84` 302 + `Location == "/"`; `:88` `HttpOnly`, `SameSiteLaxMode`, `Path "/"`, `MaxAge 2592000`; `:97` `n != 1 OR ghID != 42` | PASS |
| C4 | missing/different state -> `/login?error=state`, 0 sessions | go `TestCallback_BadState` PASS (3 subcases) | `api/internal/auth/auth_test.go:114` `Location != "/login?error=state"`; `:117` `env.Count("sessions") != 0` | PASS |
| C5 | code exchange / `GET /user` fail -> `/login?error=github`, 0 sessions | go `TestCallback_GithubFailure` PASS (6 subcases) | `api/internal/auth/auth_test.go:126-132` six failure modes; `:140` `Location != "/login?error=github"`; `:143` sessions 0 | PASS |
| C6 | banner above button for github/state; absent without error | vitest `shows error banner (...)`, `shows error banner only for known errors (...)` pass | `web/src/app/login/page.test.tsx:13` `banner.compareDocumentPosition(button) & DOCUMENT_POSITION_FOLLOWING`; `:21` `queryByText(BANNER)).not.toBeInTheDocument()` | PASS |
| C7 | logout 204, row deleted, `Max-Age=0` | go `TestLogout_DeletesSession` PASS | `api/internal/auth/auth_test.go:156` `StatusNoContent`; `:159` sessions 0; `:162` `strings.Contains(raw, "Max-Age=0")` | PASS |
| C8 | SAIR -> login, reload stays | playwright `logout returns to login` pass | `web/e2e/auth.spec.ts:8` login link visible; `:10` after `page.reload()` still visible | PASS |
| C9 | 5 protected routes x (no cookie, unknown token) -> 401 unauthenticated | go `TestAuthMiddleware_RejectsEveryProtectedRoute` PASS | `api/internal/httpx/httpx_test.go:15-21` the 5 routes; `:32` `rec.Code != 401 OR ErrorCode != "unauthenticated"` | PASS |
| C10 | 2591999 s accepted, 2592001 s -> 401 | go `TestSession_ExpiryBoundary` PASS | `api/internal/auth/auth_test.go:180` accepted side `404 && "player_not_found"`; `:187` `401 && "unauthenticated"` | PASS |
| C11 | sessions stores SHA-256, never the token | go `TestSession_StoresOnlyHash` PASS | `api/internal/auth/auth_test.go:204` `bytes.Equal(stored, sha256(token))`; `:207` raw token absent | PASS |
| C12 | suggestion derivation x3 + 4 classes | go `TestOnboarding_SuggestsDevName` PASS | `api/internal/player/player_test.go:47` `SuggestedDevName != want`; `:50` `DeepEqual(Classes, [FRONTEND BACKEND DEVOPS FULLSTACK])` | PASS |
| C13 | 404 -> onboarding with suggestion and 4 classes | vitest `404 opens onboarding with suggestion` pass | `web/src/components/GameShell.test.tsx:30` `toHaveValue("OCTOCAT")`; `:32` each class button `toBeEnabled()` | PASS |
| C14 | 201 initial state for each of 4 classes | go `TestCreatePlayer_InitialState` PASS | `api/internal/player/player_test.go:63` `StatusCreated`; `:69` full-struct compare against (1, 0, 500, 100, 100, ...) | PASS |
| C15 | devName bounds (5 rejected, 3 accepted, lowercase stored upper) | go `TestCreatePlayer_DevNameBounds` PASS | `api/internal/player/player_test.go:84` `status != 422 OR code != "invalid_dev_name"`; `:88` players 0; `:94` 201; `:98` `DevName != stored` | PASS |
| C16 | `dev_01` vs existing `DEV_01` -> 409 dev_name_taken | go `TestCreatePlayer_DevNameTakenCaseInsensitive` PASS | `api/internal/player/player_test.go:108` `status != 409 OR code != "dev_name_taken"` | PASS |
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
| C38 | no player -> 404 player_not_found on `/api/me` and travel | go `TestPlayerNotFound_OnPlayerRoutes` PASS | `api/internal/player/player_test.go:220` `rec.Code != 404 OR ErrorCode != "player_not_found"` | PASS |
| C39 | `região atual: FLORESTA DE LOGS`, floresta node highlighted | vitest `shows current region` pass | `web/src/components/WorldScene.test.tsx:45` text; `:47-48` single `[aria-current="location"]` with `data-region="floresta"` | PASS |
| C40 | travel to floresta updates without reload, persists after reload | playwright `travel persists` pass | `web/e2e/world.spec.ts:12` updated text; `:13` marker `toBe(7)`; `:16` after reload | PASS |
| C41 | 9 codes in envelope with JSON content type | go `TestErrorEnvelope_EveryCode` PASS | `api/internal/httpx/httpx_test.go:70` `len(cases) != 9`; `:80` `application/json`; `:88` exactly `{error:{code,message}}`, code match, message non-empty | PASS |
| C42 | travel blocks on held FOR UPDATE, 200 after commit | go `TestTravel_SerializesOnPlayerRowLock` PASS | `api/internal/world/world_test.go:95` early answer while locked fails; `:107` `code != 200` after commit | PASS |
| C43 | 20 concurrent travels all 200, final vila/floresta | go `TestTravel_ConcurrentRequests` PASS | `api/internal/world/world_test.go:134` each `code != 200`; `:138` final region in {vila, floresta} | PASS |
| C44 | coins/gems = -1 -> CHECK violation | go `TestPlayers_NonNegativeCurrencyConstraint` PASS | `api/internal/player/player_test.go:233` `pgErr.Code != "23514"` | PASS |
| C45 | panicking route on `NewRouter` -> 500 internal, log has `X-Request-Id` | go `TestRecover_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:115` `500 && "internal"`; `:122` log contains `"request_id":"<id>"`. Same assembly: `api/cmd/api/main.go:46` and `api/internal/apptest/apptest.go:63` both call `app.NewRouter` | PASS |
| C46 | compose db, go build/vet, npm run build exit 0 | `make ci-build` exit 0 | `Makefile:18-20` (db-up; `go build ./... && go vet ./...`; `npm run build`) | PASS |
| C47 | go.mod requires chi/pgx/goose/oauth2, not gorm | `make check-deps` -> `deps ok`, exit 0 | `api/go.mod:6-9` the four requires; `Makefile:22-28` grep incl. `! grep -q 'gorm.io/gorm'` | PASS |
| C48 | unknown route 404 not_found, wrong method 405, malformed JSON on travel 422 invalid_body | go `TestErrorEnvelope_GenericCodes` PASS | `api/internal/httpx/httpx_test.go:98` `404 && "not_found"`; `:101` `405 && "method_not_allowed"`; `:104` `422 && "invalid_body"` | PASS |
| C49 | handler error on `GET /api/me`, `POST /api/players`, `POST /api/me/travel` -> 500 internal + log with request_id | go `TestHandlerError_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:131` `ALTER TABLE players RENAME` (precondition); `:143` `rec.Code != 500 OR ErrorCode != "internal"`; `:148` log contains `"request_id":"<X-Request-Id>"` | PASS |
| C50 | session write fails in callback -> 500 internal, no `ds_session` | go `TestCallback_SessionStoreFailure` PASS | `api/internal/auth/auth_test.go:215` `DROP TABLE sessions` (precondition); `:220` `500 && "internal"`; `:223` `rawSetCookie(rec, SessionCookie) != ""` fails | PASS |
| C51 | malformed JSON and wrong-typed field on `POST /api/players` -> 422 invalid_body, no player | go `TestCreatePlayer_InvalidBody` PASS | `api/internal/httpx/httpx_test.go:196` the two bodies `"{nope"` and `{"devName": 42, ...}`; `:198` `rec.Code != 422 OR ErrorCode != "invalid_body"`; `:202` `env.Count("players") != 0` fails. F5 killed | PASS |
| C52 | session lookup DB failure -> protected route 500 internal + log with `X-Request-Id` | go `TestSessionLookupError_Returns500AndLogsRequestID` PASS | `api/internal/httpx/httpx_test.go:180` `ALTER TABLE sessions RENAME` (precondition, after the session was created at `:179`); `:184` `rec.Code != 500 OR ErrorCode != "internal"`; `:188` `id == "" OR !Contains(Logs, "request_id":"<id>")`. Proven on `GET /api/me`; the middleware is shared by all 5 protected routes (`api/internal/app/router.go:40-47`, one `pr.Use`). F4 killed | PASS |

**Checks proven: 52/52**, each with a located `file:line`.

## Coverage

Verified at 3e98ec5 for the rows whose authority the fix touched or added: `RequireSession` outcomes, door-12 `invalid_body` routes, AC 38 unexpected-error paths, logout outcomes, Onboarding submit enablement and class indicator. Every other row is carried from 8c8dbea, and its proofs were re-run green at 3e98ec5.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/auth/github/login` statuses (1) | plan Surface; `api/internal/auth/handlers.go:76` (carried from 8c8dbea) | 302 C2 | - |
| `GET /api/auth/github/callback` statuses (2) | plan Surface; `handlers.go:86,93,102,97-99` (carried from 8c8dbea) | 302 C3 · C4 · C5 · 500 C50 | - |
| `POST /api/auth/logout` statuses (3) | Surface; `handlers.go:146`; `session.go:99-102` | 204 C7 · 401 C9 · 500 via shared middleware C52 | - |
| `GET /api/me` statuses (4) | Surface; `api/internal/player/handlers.go:22-29` | 200 C22 · 401 C9 · 404 C38 · 500 C49/C52 | - |
| `GET /api/onboarding` statuses (2) | Surface (carried from 8c8dbea) | 200 C12 · 401 C9 | - |
| `POST /api/players` statuses (5) | Surface; `player/handlers.go:47-83` | 201 C14 · 401 C9 · 409 C16/C18/C20/C21 · 422 C15/C17/C51 · 500 C49 | - |
| `GET /api/catalog` statuses (2) | Surface; `api/internal/catalog/catalog.go:74-84` (carried from 8c8dbea) | 200 C31 · 304 C32 | - |
| `POST /api/me/travel` statuses (5) | Surface; `api/internal/world/travel.go` | 200 C35 · 401 C9 · 404 C38 · 422 C36/C37/C48 · 500 C49 | - |
| callback failure paths (9) | AC 4/5; `handlers.go:85,107-110,117-124,129-134` (carried from 8c8dbea) | state missing · cookie missing · state differs: C4 · token exchange · `/user` unreachable · `/user` non-200 · body not JSON · no id · no login: C5 | - |
| `RequireSession` outcomes (5) | door 2 / AC 8-9 / AC 38; `api/internal/auth/session.go:93-108` | no cookie C9 · unknown token C9 · expired C10 · fresh C10/C22 · lookup error -> log + `500 internal` C52 (`httpx_test.go:184,188`, F4 killed) | - |
| door 12 `invalid_body` on body routes (2) | plan Landing door 12; `world/travel.go:24-26`, `player/handlers.go:47-49` (only two `DecodeJSON` callers) | `POST /api/me/travel` C48 · `POST /api/players` C51 (malformed and wrong type, F5 killed) | - |
| AC 38 unexpected-error paths (3) | plan AC 38; `httpx/middleware.go:37-46`, `httpx/errors.go:72-83`, `session.go:99-102` | panic C45 · returned error C49 (+ callback C50) · session lookup error C52 | - |
| `Handle` log decision (2) | `httpx/errors.go:78-81` (carried from 8c8dbea) | unexpected logged C49 · expected not logged `TestHandle_DoesNotLogExpectedErrors` (`httpx_test.go:167,171`) | - |
| error codes, door 7 (9) | plan Landing door 7; `errors.go:22-30` (carried) | C41 over all 9 | - |
| generic router codes, door 12 (3) | plan Landing door 12; `errors.go:31-33`, `app/router.go:28-29` (carried) | `not_found` · `method_not_allowed` · `invalid_body`: C48 | - |
| Landing doors (12) | plan Landing (carried) | 1 C46 · 2 C11 · 3 C20 · 4 C21 · 5 C32 · 6 C27 · 7 C41 · 8 C42 · 9 C47 · 10 C44 · 11 C46 · 12 C48/C51 | - |
| session age boundary (2) | AC 9; `session.go:62` (carried) | 2591999 s · 2592001 s: C10 | - |
| protected routes (5) | Surface + `app/router.go:40-47` | C9 over all 5 | - |
| `409` / `422` on `POST /api/players` (2+3) | AC 12-15, door 12 | dev_name_taken C16/C21 · player_exists C18/C20 · invalid_dev_name C15 · invalid_class C17 · invalid_body C51 | - |
| `422` on travel (3) | AC 32-33, door 12 | level_too_low C36 · unknown_region C37 · invalid_body C48 | - |
| devName bounds (8) | AC 12; `api/internal/player/player.go:54-60` (carried) | all 8 in C15 and `TestNormalizeDevName` (`devname_test.go:15-23`) | - |
| suggestion derivation (3) | `player.go:63-77` (carried) | C12 | - |
| classes (4) | AC 10/11; `player.go:34` (carried) | C12 · C14 | - |
| relations constraints (4) | plan Relations; `api/migrations/00001_init.sql` (carried) | github_user_id unique C20 · dev_name upper unique C16/C21 · coins/gems >= 0 C44 · region = catalog id C37 | - |
| entities (3) | plan Relations (carried) | Player C14 · Session C3/C11 · GithubIdentity C20 | - |
| HUD fetch outcomes (6) | AC 1, 18-21; `web/src/components/GameShell.tsx:31-39` (carried) | 200 C23/C30 · pending C24 · 5xx C25 · network C25 · 401 C1 · 404 C13 | - |
| `onCreated` outcomes (3) | `GameShell.tsx:48-55` (carried) | catalog ok `GameShell.test.tsx:90-96` · catalog 500 / throws `:98-107` | - |
| logout outcomes (2) | `GameShell.tsx:61-68` (changed by the fix) | 204 -> login `GameShell.test.tsx:109-122` · network error -> login, no leaked rejection `:109-122` + whole-suite exit 0 (F1 killed) | - |
| Onboarding load outcomes (4) | `Onboarding.tsx:17-28,55` (carried) | pending `Onboarding.test.tsx:72-77` · ok C13 · HTTP error `:31-35`, `:86-90` · network `:79-84` | - |
| Onboarding create outcomes (5) | `Onboarding.tsx:30-49` (carried) | ok `:57-70` · dev_name_taken C19 · other error `:37-49`, `:103-109` · network `:92-101` | - |
| Onboarding submit enablement (3) | `Onboarding.tsx:82` `disabled={!cls OR sending}` | no class -> disabled `Onboarding.test.tsx:51-55` · class chosen -> enabled `:116` · in flight -> disabled `:118` (F2 killed) | - |
| Onboarding class indicator (2) | `Onboarding.tsx:75` `aria-pressed={cls === c}` | pressed / not pressed `Onboarding.test.tsx:126-127`, all 4 classes after re-selection (F3 killed) | - |
| WorldScene travel outcomes (5) | `web/src/components/WorldScene.tsx:24-36,79` (carried) | ok C30 · refused `WorldScene.test.tsx:58-69` · no body `:78-83` · network `:71-76` · pending disables `:85-91` | - |
| WorldScene map rendering (4) | `WorldScene.tsx:42,53,58` (carried) | known position C39 · unknown position `:93-100` · name / id fallback `:99`, `:102-105` · here/open/locked `:107-113` | - |
| Hud / Tabs conditionals (2+1) | `Hud.tsx:15,50`, `Tabs.tsx:21` (carried) | no player C24 · SAIR only with handler `Hud.test.tsx:31-36` · current tab `Tabs.test.tsx:24-30` | - |
| HUD fields (6) | AC 18 (carried) | C23 | - |
| tabs (7) | AC 22 (carried) | C26 | - |
| unshipped scenes (5) | AC 24 (carried) | C28 | - |
| title signs (4) | AC 25 (carried) | C29 | - |
| regions (6) | AC 27; `api/catalog/regions.json` (carried) | C31 | - |
| region lock at level 1 (6) | AC 30; `WorldScene.tsx:67,82` (carried) | C34 | - |
| login error banner (4) | AC 6; `LoginScreen.tsx:11` (carried) | github · state · none · unknown value: C6 | - |
| startup config: router (1 shared assembly) | `api/cmd/api/main.go:46`, `api/internal/apptest/apptest.go:63`; `app/router.go:41` now wires `d.Logger` into `RequireSession` in that same assembly | both call `app.NewRouter`; C52 exercises the wiring | - |
| startup config: `/api` rewrite (1) | `web/next.config.ts:8`, `web/playwright.config.ts` (carried) | C27 / C40 via the browser | - |

**Final sweep (verified at 3e98ec5).** I grepped every conditional in `web/src/components/*.tsx` and every `if`/`case`/`for` in `api/**/*.go` outside tests. Every decision branch reachable from a screen or a request has an asserted case above. The fix added one branch (`session.go:99-102`, now C52), and it removed none. These branches stay excluded, each for a stated reason:

- `GameShell.tsx:58`: the `setPlayer` else. `WorldScene` only mounts under `ready`.
- `GameContext.tsx:17`: the `useGame` throw guards against programmer misuse.
- `Hud.tsx:6`: the `Bar` clamp. The api never sends xp above xpMax or hp below 0.
- `Onboarding.tsx:32`: `if (!cls) return`. The only submit control is disabled without a class (`:82`), and HTML blocks implicit submission when the default button is disabled.
- `TitleScene.tsx:19`: `s.chip &&` reads a compile-time constant (`:5-8`), so no input varies it. It decorates the key art with a label for 2 of 4 hotspots. AC 25 decides only the link targets (C29). This is an observation, not a decision on player or catalog state.
- `auth/handlers.go:29-45`: config URL overrides, exercised by every auth test through the fake GitHub.
- `auth/handlers.go:71-73`, `:111-114`, `session.go:45`: failures of `rand.Read` and of `NewRequest` with a constant URL.
- `auth/handlers.go:140-143`: logout sits behind `RequireSession`, so the cookie is always present. A `Delete` error needs the table to fail right after `Lookup` succeeded.
- `player/handlers.go:79-81`, `player.go:105-121` beyond the first failing query: a database failure between two statements of the same request. The first failing query is C49.
- `catalog.go:32-59`, `db/db.go`, `cmd/api/main.go`: startup over embedded data and config, a pass-through (C46 builds, C31 serves).
- `session.go:94`: `c.Value == ""`. The mutant is equivalent, because `Lookup("")` gives 401 anyway.
- `middleware.go:40-42`: no handler panics with `ErrAbortHandler`.

Level: every claim naming a status or route is proven through `app.NewRouter` over HTTP, including C51 and C52. There is no level gap.

`Swept`: carried from 8c8dbea. No row resolves to **existing**.

## Test policy rows

Verified at 3e98ec5. I re-judged both rows that were unmet in round 3, plus every row that classifies a file the fix touched (`session.go`, `router.go`, `GameShell.tsx`, `Onboarding.tsx` via its tests).

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | devName validation `player.go:54-60`; travel guards `world/travel.go`; session validity `auth/session.go:93-108`; error mapping `httpx/errors.go:46-52,72-83` | boundary **and** own layer | yes. The round-3 miss, session lookup error -> `500 internal`, is now asserted at the boundary through `NewRouter` (C52, `httpx_test.go:184,188`, F4 killed). The other members are carried from 8c8dbea |
| Decides, not reached across a boundary | suggestion derivation `player.go:63-77`; scene components `web/src/components/{GameShell,Onboarding,WorldScene,LoginScreen,Hud,Tabs}.tsx` | own layer | yes. `Onboarding.tsx:82` in-flight disable is asserted at `Onboarding.test.tsx:118` (F2 killed). `Onboarding.tsx:75` `aria-pressed` is asserted at `:127` (F3 killed). The `GameShell.tsx:61-68` offline logout is asserted at `GameShell.test.tsx:109-122` (F1 killed), and the whole vitest suite exits 0 |
| Entry point that decides nothing | `GET /api/catalog` `catalog.go`; `GET /api/onboarding` | boundary | yes (carried from 8c8dbea, and the fix did not touch these). Accepted input C31/C12, conditional request C32, 401 C9 |
| Instrumentation, pass-throughs | `web/src/lib/api.ts`, `web/src/components/{ComingSoon,TitleScene,ServerDown}.tsx`, `web/src/app/(game)/*/page.tsx`, `api/internal/app/router.go` (changed by the fix), `api/cmd/api/main.go`, `api/internal/fakegithub/fake.go` | none of its own | yes. Consumers cover each one. The one-line `router.go:41` change, logger wiring, is exercised by C52, and F4 shows the log line is what that proof reads |

## Faults injected

Verified at 3e98ec5.

- **Worktree:** the faults ran in `git worktree add <scratchpad>/wt4 HEAD`. The real `web/node_modules` was symlinked into `wt4/web/`.
- **Build check:** each mutant was compile-checked first, with `go vet` on the mutated package for Go and `tsc --noEmit` for TypeScript. The only tsc output was the pre-existing `layout.tsx` `LayoutProps` error from missing Next-generated types in the worktree, which is unrelated to the mutated files. Vitest also compiled each mutated file.
- **Reset:** after each fault, `git checkout -- .` ran in the worktree, and `git status --porcelain` there came back empty.
- **Cleanup:** I removed the symlink and ran `git worktree remove --force`. `git worktree list` then showed only the main tree.
- **Real tree:** `git status --porcelain` read `?? .claude/` before and after, and `diff` found them identical. `git stash` was not used.

There were 5 faults (the cap), one per surface the fix touched or created. Each was killed by its narrowest covering proof, and each was a real test failure.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: `setState({ kind: "unauthenticated" })` moved inside `try`, after the `await`, so an offline logout stays in the game | `web/src/components/GameShell.tsx:63-67` | yes. `SAIR returns to the login screen (logout network error)` FAIL (1 failed, 1 passed, 10 skipped) |
| F2: `disabled={!cls OR sending}` -> `disabled={!cls}` | `web/src/components/Onboarding.tsx:82` | yes. `disables CRIAR DEV while the create request is in flight` FAIL (1 failed, 11 passed) |
| F3: `aria-pressed={cls === c}` -> `aria-pressed={cls !== null}` | `web/src/components/Onboarding.tsx:75` | yes. `marks only the chosen class as pressed` FAIL (1 failed, 11 passed) |
| F4: the `logger.Error("session lookup failed", "request_id", ...)` line deleted, still answering `500 internal` | `api/internal/auth/session.go:100` | yes. `TestSessionLookupError_Returns500AndLogsRequestID` FAIL at `httpx_test.go:189` "log lacks request id" (empty log). So the only log with that id comes from this line |
| F5: `if err := httpx.DecodeJSON(r, &in); err != nil { return err }` -> `_ = httpx.DecodeJSON(r, &in)` | `api/internal/player/handlers.go:47-49` | yes. `TestCreatePlayer_InvalidBody` FAIL at `httpx_test.go:199` on both bodies: `422 invalid_dev_name`, want `invalid_body` |

Carried from 8c8dbea: round-3 faults F1-F5 on `Onboarding.tsx:27,45`, `GameShell.tsx:51,53`, `auth/handlers.go:119` and `httpx/errors.go:79`, all killed. The fix did not touch those surfaces.

## Gate

Verified at 3e98ec5. Exit codes:

- `cd api && go test -count=1 ./...` exit **0**. With `-v`: 35 top-level PASS, 0 FAIL, and subtests C4 3/3, C5 6/6.
- `cd web && npx vitest run` exit **0**: 8 files, 53 passed, 0 failed, no unhandled errors. `make test-web` exit **0**.
- `cd web && npx playwright test` exit **0**: 3 passed.
- `make ci-build` exit **0**.
- `make check-deps` exit **0** (`deps ok`).
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py foundation` output and exit code are recorded below the table.

In the report, a boolean `||` inside a cited expression is written as `OR`, because the gate script splits table cells on `|` even when the pipe is escaped.

```
validate_verification: 0 error(s), 0 warning(s) across [foundation]
```

Exit 0.
