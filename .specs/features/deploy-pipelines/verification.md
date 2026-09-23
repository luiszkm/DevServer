# Deploy pipelines verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 00411c5..9b02db78337f0108315bc15e08f8b40044cc1788
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 38 checks are proven at HEAD with located evidence, and every suite exits 0. The verdict is FAIL because of three findings outside the check rows:

1. The recomputed Coverage leaves two members unproven: `invalid_body` on the new JSON route `POST /api/me/deploys`, and the `glyph` field of door 4's literal shape.
2. One injected mutant survived. It renames the `glyph` JSON tag, and the full Go suite stays green.
3. The Test policy row for the start rule is unmet, for the same `invalid_body` reason.

Verified at 9b02db7.

## Binding sources

No source in the plan is marked binding, and the profile is `standard`, so step 1 does not run.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (profile standard) | n/a | - | - |

## Checks

Proofs were run once per target at HEAD:

- Go: `cd api && go test ./internal/deploy ./internal/catalog ./internal/player -run '^(TestStart_CreatesJobWithCatalogDuration OR ... OR TestDeployRoutes_UnexpectedError)$' -v -count=1`. The real command joins the 23 names with the regex alternation pipe. Exit 0, and all 23 tests appear individually as `--- PASS`.
- Web unit: `cd web && npx vitest run src/components/DeployScene.test.tsx src/components/ComingSoon.test.tsx src/lib/time.test.tsx --reporter=verbose`. Exit 0, 48/48 passed, and each named test is listed individually.
- E2E: `cd web && npx playwright test`. Exit 0, 4/4 passed, including `e2e/deploy.spec.ts:5:5 › start persists`.

Every test named below was added in 00411c5..HEAD, according to `git diff --stat`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | level 15, `backend` NV.1..5 -> 201, startedAt = clock, endsAt = +15/30/60/180/360, serverTime, player | `TestStart_CreatesJobWithCatalogDuration` PASS | `api/internal/deploy/deploy_test.go:96` table `{1: 15, 2: 30, 3: 60, 4: 180, 5: 360}`; `:103` `mustStatus(t, rec, http.StatusCreated, "")`; `:105-106` `b.Deploy != want` with `StartedAt: stamp(now), EndsAt: stamp(now.Add(minutes))`; `:109` `b.ServerTime != stamp(now)`; `:112` `p.DevName == ""` | PASS |
| C2 | second `backend` -> 409 deploy_running, 1 job | `TestStart_SameTypeRunning` PASS | `deploy_test.go:123` `mustStatus(t, ..., http.StatusConflict, "deploy_running")`; `:124` `activeJobs(t, env) != 1` | PASS |
| C3 | level 2 -> 422 level_too_low on NV.2; level 3 -> 201 | `TestStart_LevelBoundary` PASS | `deploy_test.go:134` `StatusUnprocessableEntity, "level_too_low"`; `:136` after `level = 3`, `StatusCreated` | PASS |
| C4 | `blockchain` -> 422 unknown_deploy_type, no job | `TestStart_UnknownType` PASS | `deploy_test.go:143` `StatusUnprocessableEntity, "unknown_deploy_type"`; `:144` `env.Count("deploy_jobs") != 0` | PASS |
| C5 | level 0, 6, -1, absent -> 422 unknown_deploy_level, no job | `TestStart_UnknownLevel` PASS | `deploy_test.go:154` cases `"0": 0, "6": 6, "-1": -1, "absent": nil`; `:156` `rec.Code != 422 OR ErrorCode != "unknown_deploy_level"`; `:160` jobs = 0 | PASS |
| C6 | 10 concurrent `mobile` NV.1 -> 1x 201, 9x 409, 1 active job | `TestStart_ConcurrentSameType` PASS | `deploy_test.go:194-199` `reflect.DeepEqual(got, want)` with want = `201` + 9x `409 deploy_running`; `:202` active = 1 | PASS |
| C7 | 5 types in sequence -> 201 each, 5 active | `TestStart_AllFiveTypes` PASS | `deploy_test.go:211-212` loop over the 5 ids, `StatusCreated`; `:214` `activeJobs != 5` | PASS |
| C8 | direct second active insert -> unique_violation; allowed after collected | `TestDeployJobs_OneActivePerType` PASS | `deploy_test.go:229` `pgErr.Code != "23505"`; `:235` insert after `collected_at = now()` has no error; index at `api/migrations/00002_deploy_jobs.sql:15` | PASS |
| C9 | 3 routes: no session -> 401 unauthenticated; no player -> 404 player_not_found | `TestDeployRoutes_SessionAndPlayer` PASS | `deploy_test.go:248-250` the 3 routes; `:253` `rec.Code != 401 OR ErrorCode != "unauthenticated"`; `:256` `rec.Code != 404 OR ErrorCode != "player_not_found"` | PASS |
| C10 | GET 200, serverTime, only active jobs with 5 keys; collected job absent | `TestList_ActiveJobs` PASS | `deploy_test.go:275` serverTime = clock; `:278-279` `reflect.DeepEqual(b.Deploys, want)` with only `frontend` (claimed `backend` excluded); `:284-285` keys `type, level, startedAt, endsAt, ready` present | PASS |
| C11 | 61 s before endsAt ready=false; at endsAt ready=true | `TestList_ReadyBoundary` PASS | `deploy_test.go:300-301` after 13m59s, `if ready()` fails; `:304-305` after +61 s (= endsAt), `if !ready()` fails | PASS |
| C12 | catalog deployTypes in order + 5 deployLevels with the plan's values | `TestCatalog_ServesDeploys` PASS | `api/internal/catalog/catalog_test.go:83` `strings.Join(ids, ",") != "backend,frontend,mobile,database,microservices"`; `:87` `len != 5`; `:92` `got != want[i]` against `{1,1,15,80,40,0} ... {5,15,360,700,300,8}` | PASS |
| C13 | 5 types in catalog order; ocioso / 14:00 restante / pronto p/ coletar | `type statuses` PASS | `web/src/components/DeployScene.test.tsx:50` `toEqual(["backend","frontend","mobile","database","microservices"])`; `:51` `"ocioso"`; `:52` `"14:00 restante"`; `:53-54` `"pronto p/ coletar"` (the `:54` job is exactly at endsAt) | PASS |
| C14 | level 1: 5 levels with times + rewards; NV.2..5 disabled with NÍVEL 3/6/10/15 | `idle shows levels` PASS | `DeployScene.test.tsx:62-66` times `15min,30min,1h,3h,6h` and rewards incl. `+80XP · +40coins`, `+150XP · +70coins · +1gems`; `:68` NV.1 enabled; `:70-71` `toBeDisabled()` + `NÍVEL ${min}` for `[2,3],[3,6],[4,10],[5,15]` | PASS |
| C15 | 60 min job at 10/30/60/90% -> LINT/BUILD/TEST/SHIP + aria-valuenow; 180 min -> 3:00:00; 5 min left -> 05:00 | `running shows stage and remaining` (9 cases) PASS | `DeployScene.test.tsx:76-84` cases incl. boundaries 24/25/50/75; `:88` `findByText(stage)`; `:89` `toHaveAttribute("aria-valuenow", String(pct))`; `:95` `"3:00:00"`; `:97` `"05:00"` | PASS |
| C16 | +3 s fake clock -> remaining down 3 s, fetch not called again | `countdown ticks without fetch` PASS | `DeployScene.test.tsx:104` `"15:00"`; `:106` `"14:57"`; `:107` `"14:57 restante"`; `:108` `f.fn` `toHaveBeenCalledTimes(1)` | PASS |
| C17 | pending GET -> CARREGANDO... | `pending shows CARREGANDO` PASS | `DeployScene.test.tsx:113` never-resolving fetch; `:115` `getByText("CARREGANDO...")` | PASS |
| C18 | 500 and network error -> SERVIDOR FORA DO AR; TENTAR DE NOVO refetches | `list failure shows retry` (2 cases) PASS | `DeployScene.test.tsx:120-121` both failures; `:125` `"SERVIDOR FORA DO AR"`; `:128` `f.calls("GET /api/me/deploys")).toBe(2)` | PASS |
| C19 | mocked catalog NV.1 = 7 min, +5XP -> `7min`, `+5XP · +40coins` | `levels come from catalog` PASS | `DeployScene.test.tsx:134` catalog override; `:137` `"7min"`; `:138` `"+5XP · +40coins"` | PASS |
| C20 | serverTime 10 min ahead, endsAt = serverTime+5 -> 05:00 restante | `uses server time` PASS | `DeployScene.test.tsx:143-144` serverNow = T0 + 10 min; `:146` `findByText("05:00 restante")` | PASS |
| C21 | INICIAR DEPLOY posts `{"type":"backend","level":1}`, setPlayer, log line | `start posts and logs` PASS | `DeployScene.test.tsx:161` `toEqual({ type: "backend", level: 1 })`; `:162` `setPlayer toHaveBeenCalledWith(newPlayer)`; `:163` log `"$ devserver deploy --tipo=backend --nivel=1"` | PASS |
| C22 | 409 deploy_running on start -> api message in alert, type state unchanged | `start error shows message` (3 cases) PASS | `DeployScene.test.tsx:184` 409 case; `:191` `findByRole("alert")).toHaveTextContent(text)`; `:192` `"ocioso"`; `:193` `setPlayer not.toHaveBeenCalled()` | PASS |
| C23 | `/deploy` renders the scene, not EM BREVE | `deploy page renders the scene` PASS | `DeployScene.test.tsx:212` `"PIPELINES DE DEPLOY"`; `:213` `queryByText("EM BREVE")).not.toBeInTheDocument()`; page at `web/src/app/(game)/deploy/page.tsx:4` | PASS |
| C24 | browser: start database NV.1 -> 14:/15: restante; survives reload | `e2e/deploy.spec.ts` `start persists` PASS | `web/e2e/deploy.spec.ts:13` `toContainText(/1[45]:\d\d restante/)`; `:16` `page.reload()`; `:17` same regex after reload | PASS |
| C25 | +15 min claim backend NV.1 -> 200, reward 80/40/0, player +80 xp +40 coins, row kept with collected_at | `TestClaim_CreditsReward` PASS | `deploy_test.go:317` `StatusOK`; `:319` `Reward.XP != 80 OR Coins != 40 OR Gems != 0`; `:322` `Player.XP != 80 OR Coins != 140` (100 + 40); `:326-330` row exists and `collected_at IS NOT NULL` | PASS |
| C26 | job reward altered to 999/7/3 -> claim credits 999/7/3 | `TestClaim_CreditsFrozenReward` PASS | `deploy_test.go:340` `UPDATE deploy_jobs SET xp = 999, coins = 7, gems = 3`; `:345` reward 999/7/3; `:348` player coins 107, gems 23 | PASS |
| C27 | 1 s before endsAt -> 409 deploy_not_ready, player unchanged | `TestClaim_NotReady` PASS | `deploy_test.go:367` `Advance(15*time.Minute - time.Second)`; `:368` `StatusConflict, "deploy_not_ready"`; `:369` whole `players::text` row equal | PASS |
| C28 | no job, and second claim -> 404 deploy_not_found | `TestClaim_NotFound` PASS | `deploy_test.go:378` and `:382` `StatusNotFound, "deploy_not_found"` | PASS |
| C29 | claim `blockchain` -> 422 unknown_deploy_type | `TestClaim_UnknownType` PASS | `deploy_test.go:389` `StatusUnprocessableEntity, "unknown_deploy_type"` | PASS |
| C30 | GainXP: 0 no-op; max-1 no level; = max -> +1, xp 0; 2 levels -> xpMax +500, sp +2, hpMax +40, hp = hpMax | `TestGainXP` PASS | `api/internal/player/devname_test.go:43-46` rows `zero`, `one below max` (499), `exactly max` -> `2,0,750,120,120,2,1`, `two levels` -> `3,10,1000,140,140,3,2`; `:54` `got[i] != want[i]` | PASS |
| C31 | xp 480/500, hp 10/100 claims NV.1 -> level 2, xp 60/750, 2 sp, hp 120/120 | `TestClaim_LevelUp` PASS | `deploy_test.go:401` `p.Level != 2 OR p.XP != 60 OR p.XPMax != 750 OR p.SkillPoints != 2 OR p.HP != 120 OR p.HPMax != 120`; `:404` `LevelsGained != 1` | PASS |
| C32 | 10 concurrent claims -> 1x 200, 9x 404, coins +40 once | `TestClaim_ConcurrentOnce` PASS | `deploy_test.go:415-420` `DeepEqual` with `200` + 9x `404 deploy_not_found`; `:427` `coins != 140` | PASS |
| C33 | after claim, new backend POST -> 201 | `TestClaim_FreesType` PASS | `deploy_test.go:438` claim 200; `:439` `StatusCreated` | PASS |
| C34 | log `deploy.collected` with type, level, xp, coins, gems | `TestClaim_LogsCollected` PASS | `deploy_test.go:451` line with `"msg":"deploy.collected"`; `:455` want `type frontend, level 1, xp 80, coins 40, gems 0`; `:460` `entry[k] != v` | PASS |
| C35 | COLETAR RECOMPENSA -> setPlayer, log `> release de BACKEND nível 1 publicada.`, type back to ocioso | `claim updates player and logs` PASS | `DeployScene.test.tsx:226` log text; `:227` `setPlayer toHaveBeenCalledWith(newPlayer)`; `:228` `"ocioso"` | PASS |
| C36 | COLETAR disabled until endsAt, enabled at endsAt | `claim disabled until ready` PASS | `DeployScene.test.tsx:237` `toBeDisabled()`; `:238` advance 1 min to endsAt; `:239` `toBeEnabled()`; `:240-242` `PRONTO PARA COLETAR`, `CONCLUÍDO`, aria-valuenow 100 | PASS |
| C37 | claim error -> api message in alert, job stays | `claim error shows message` (3 cases) PASS | `DeployScene.test.tsx:258` 409 deploy_not_ready; `:265` alert text; `:266` COLETAR still present; `:267` setPlayer not called | PASS |
| C38 | DB error on the 3 routes -> 500 internal + request_id logged | `TestDeployRoutes_UnexpectedError` PASS | `deploy_test.go:470` table renamed; `:482` `rec.Code != 500 OR ErrorCode != "internal"`; `:486` log contains `"request_id":"<id>"` | PASS |

Level: every claim that names a status or response shape (C1-C11, C25, C27-C29, C31-C34, C38) goes through `env.Do` on the real `app.NewRouter` (`api/internal/apptest/apptest.go:84`). The exceptions are C8, which is SQL on the constraint, and C30, which is own layer, as the checks declare. I found no level gap.

Swept rows: none resolves to **existing**. `dependency failure: n/a` is approved policy. The plan's Observable rows marked `existing` hold. `RequireSession` guards all 3 routes (`api/internal/app/router.go:57-59` sit inside the protected group), and C9 confirms the 401 and 404 envelope on each.

Foundation checks the plan says this feature disturbed:

- **Foundation C27** (`.specs/features/foundation/checks.md:102`) claims two things: the URL changes without a document reload, and the HUD stays visible. `web/e2e/shell.spec.ts:16` still asserts `__marker` `toBe(42)`, and `:17` still asserts that the HUD contains `LEVEL 1`. `:13` still asserts `/deploy$`. Only the scene-content line `:14` changed, from `EM BREVE` to `PIPELINES DE DEPLOY`. That line was never part of C27's claim, so C27 is not weakened. It passes in the e2e run.
- **Foundation C28** (`.specs/features/foundation/checks.md:105`) still lists `/deploy` in its text. The test now drops `/deploy` (`web/src/components/ComingSoon.test.tsx:10-14` covers the 4 remaining routes, each asserting `EM BREVE` and the scene name at `:17-18`). This is the intended supersession documented in the plan's Impact and checks' `Impact on earlier checks`. `/deploy` is now owned by C23, which positively asserts `EM BREVE` is absent. The assertions for the 4 remaining routes are unchanged, so nothing is weakened. One precision note: the foundation `checks.md:105` text is stale and should be amended to the 4 routes.
- **`player.WithLocked` signature** changed to `fn(tx, p)` (`api/internal/player/player.go:104`). `world/travel.go:29` ignores the tx. The foundation travel tests pass in the full Go suite (`ok devserver/api/internal/world`).

## Coverage

Each set was recomputed from its authority. Status sets come from the plan's `Surface`, the field set from `Landing` door 4, and the `invalid_body` set from the foundation door 12, which the plan's `Sources` says this feature copies. The members were then located in the code.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/me/deploys` statuses (4) | plan Surface; `deploy.go:39-75` | 200 C10 · 401 C9 · 404 C9 · 500 C38 | - |
| `POST /api/me/deploys` statuses (6) | plan Surface; `deploy.go:77-125` | 201 C1 · 401 C9 · 404 C9 · 409 C2 · 422 C3/C4/C5 · 500 C38 | - |
| `POST /api/me/deploys/{type}/claim` statuses (6) | plan Surface; `deploy.go:134-176` | 200 C25 · 401 C9 · 404 C28 · 409 C27 · 422 C29 · 500 C38 | - |
| `GET /api/catalog` statuses (2) | plan Surface (changed route) | 200 C12 · 304 `catalog_test.go:60` (foundation, passes at HEAD) | - |
| `invalid_body` JSON routes (3) | foundation door 12 + foundation Coverage row `invalid_body routes`; `deploy.go:83` `httpx.DecodeJSON` | `POST /api/me/travel` foundation C48 · `POST /api/players` foundation C51 · `POST /api/me/deploys` none (searched `rg -n invalid_body api --glob '*_test.go'`: hits only `httpx_test.go:104,198`) | POST /api/me/deploys invalid_body (malformed JSON, `level` of wrong type) |
| door 4 `deployTypes` fields (3) | plan Landing door 4 literal shape; `catalog.go:24-28` | `id` C12 `catalog_test.go:83` · `name` C24 only via the real catalog (`deploy.spec.ts:8` clicks `BANCO DE DADOS`) · `glyph` none (searched `rg -n 'glyph' --glob '*test*' --glob '*.spec.ts'`: 0 hits); mutant F3 survived | glyph |
| door 4 `deployLevels` fields (6) | plan Landing door 4; `catalog.go:30-37` | level, minLevel, minutes, xp, coins, gems all C12 `catalog_test.go:92` | - |
| response keys (3 routes) | plan Surface Out | start `player, deploy, serverTime` C1 · list `serverTime, deploys` C10 · claim `player, reward` C25 | - |
| deploy levels (5) | catalog `deploys.json:10-14` | C1 table over all 5 | - |
| deploy types (5) | catalog `deploys.json:3-7` | C7 over all 5 · C13 order | - |
| invalid level values (4) | AC 5 | 0, 6, -1, absent C5 | - |
| level requirement boundary (2) | AC 3; `deploy.go:96` | below C3 · equal C3 | - |
| list ready boundary (2) | AC 9; `deploy.go:58` `!now.Before(ends)` | before C11 · at endsAt C11 | - |
| claim ready boundary (2) | AC 18; `deploy.go:155` `now.Before(ends)` | 1 s before C27 · exactly at endsAt C25 (F1 killed) | - |
| new error codes (5) | Landing door 5; `httpx/errors.go:34-38` | deploy_running C2 · deploy_not_ready C27 · deploy_not_found C28 · unknown_deploy_type C4/C29 · unknown_deploy_level C5 | - |
| claim guards in order (3) | `deploy.go:137,149,155` | type C29 · no active job C28 · not ready C27 | - |
| `DeployJob` states (3) | Relations / door 1, 8 | active C1 · ready C11 · collected C25 | - |
| level-up cases (4) | AC 20; `player.go:130-142` loop | 0 · max-1 · = max · 2 levels C30 (F2 killed) | - |
| type status on screen (3) | AC 10; `DeployScene.tsx:106` | ocioso · restante · pronto p/ coletar C13 | - |
| stages (4) and boundaries (3) | AC 12; `DeployScene.tsx:192` | LINT/BUILD/TEST/SHIP and 25/50/75 C15 (F4 killed) | - |
| time formats (2) | AC 12; `time.ts:9` | mm:ss · h:mm:ss C15 and `time.test.tsx:5-16` | - |
| list outcomes on screen (4) | AC 14, 15; `DeployScene.tsx:37,41,134,141` | 200 C13 · pending C17 · 5xx C18 · network C18 | - |
| start / claim outcomes on screen (4 each) | `DeployScene.tsx:64,71` and `:83,87` | ok C21/C35 · api message C22/C37 · no-body fallback C22/C37 · network C22/C37 | - |
| in-flight disables (2) | `DeployScene.tsx:170,203` | INICIAR `DeployScene.test.tsx:201` · COLETAR `DeployScene.test.tsx:253` | - |
| Landing doors (8) | plan Landing | 1 C8 · 2 C26 · 3 C11/C20 · 4 C12 (partial, see glyph row) · 5 C2 · 6 C30 · 7 C9/C25 · 8 C25 | - |
| entities (1) | Relations | `DeployJob` C8 | - |
| startup config: clock (2 assemblies) | read directly | `api/cmd/api/main.go:51` `Now: time.Now` · `api/internal/app/router.go:40-44` nil defaults to `time.Now` · `api/internal/apptest/apptest.go:85` `Now: clock.Now` | - |

Conditional sweep of the new and changed non-test code:

- **`deploy.go`**: every guard has an asserted case, with these exceptions:
  - `:83`, `DecodeJSON` error. This is the unproven `invalid_body` member.
  - `:55` and `:61`, the rows Scan and Err paths. The `:110` insert error. The `:158` update error. These are generic 500 pass-throughs. C38 proves the 500 mapping on each route through a different failing statement.
- **`player.GainXP`** (`player.go:130-142`): the loop entry and each exit are asserted (C30).
- **`catalog.go`**:
  - The `DeployType` and `DeployLevel` lookups are asserted on hit (C1, C7) and on miss (C4, C5, C29).
  - The `deploys.json` read and unmarshal errors (`catalog.go:72-81`) have no test. They are unreachable with an embedded file.
- **`DeployScene.tsx`**: every branch is asserted, with these exceptions:
  - `:120`, `jobs ? status : ""`. The type status is blank while the list loads, and no test asserts it. The plan's AC 10 and AC 14 do not name this state.
  - `:191`, the `Math.max(0, ...)` lower clamp. `:192`, `Math.min(3, ...)`. Neither is reachable: the server's `startedAt` is at or before `serverTime`, and pct is below 100 while the job is not ready.
- **`time.ts`**: every branch is asserted in `time.test.tsx:5-26`, including negative input, the hour boundary and `1h30m`.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (start rule) | `api/internal/deploy/deploy.go:77-125`, `catalog.go:106-122` lookups | boundary C1-C7, C9, C38; own layer is the handler, so boundary through `NewRouter` as in foundation | no - gap: contract at the boundary lacks the `invalid_body` rejected input on `POST /api/me/deploys` (`deploy.go:83`), which foundation door 12 made part of every JSON route's contract |
| Decides, reached across a boundary (claim rule) | `deploy.go:134-176` | boundary C25-C29, C32-C34, C38 | yes, each guard row (type, no job, not ready, credit, frozen reward) has an asserted case, and F1 killed at the ready boundary |
| Decides, reached across a boundary (level-up) | `api/internal/player/player.go:128-143` `GainXP` | own layer C30 · boundary C31 | yes, 4 rows at own layer (`devname_test.go:43-46`), boundary `deploy_test.go:401`, F2 killed |
| Decides, not reached across a boundary | `web/src/components/DeployScene.tsx`, `web/src/lib/time.ts` | own layer | yes for every row the plan names (C13-C22, C35-C37, in-flight tests, 8-line log `DeployScene.test.tsx:283`, `time.test.tsx`); F4 and F5 killed. Noted, not counted as unmet: the loading-blank status `DeployScene.tsx:120` has no asserted case |
| Entry point that decides nothing | `GET /api/catalog` (`catalog.go` Load/ServeHTTP, changed) | boundary | yes for status: 200 C12, 304 `catalog_test.go:60`. The field gap (`glyph`) is recorded in Coverage |
| Instrumentation, pass-throughs | `web/src/app/(game)/deploy/page.tsx`, `web/src/lib/types.ts`, `api/internal/app/router.go`, `api/cmd/api/main.go`, `api/internal/apptest/apptest.go`, `api/internal/world/travel.go` (signature only), `api/internal/httpx/errors.go` (new values) | none of its own | yes, consumers cover each one: page via C23, router via every boundary test, errors via C2-C5, C27-C29, travel via foundation world tests in the full suite |

## Faults injected

Each fault was applied in a detached `git worktree` at `<scratchpad>/wt`, with the real `web/node_modules` symlinked into it. Before the web faults ran, `web/.next/types` was copied into the worktree so that `tsc` could resolve `LayoutProps`.

The real tree's porcelain was `?? .claude/` both before and after, and the diff was empty. The worktree was then removed with `git worktree remove --force`. `git stash` was never used.

Each mutant compiled: `go vet` exited 0 for F1-F3, and `tsc --noEmit` exited 0 for F4-F5.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 claim ready guard `now.Before(ends)` -> `!now.After(ends)` (claim at exactly endsAt rejected) | `api/internal/deploy/deploy.go:155` | yes - `TestClaim_CreditsReward` FAIL (`want 200`) |
| F2 level-up loop `p.XP >= p.XPMax` -> `p.XP > p.XPMax` | `api/internal/player/player.go:133` | yes - `TestGainXP` FAIL (`exactly max: ... = [1 500 500 30 100 1 0], want [2 0 750 120 120 2 1]`) |
| F3 `DeployType` JSON tag `glyph` -> `icon` (catalog stops serving `glyph`) | `api/internal/catalog/catalog.go:27` | no - survived: `TestCatalog_ServesDeploys` PASS and the whole `go test ./...` PASS. No vitest test reads the served catalog, and `deploy.spec.ts` asserts no glyph. Playwright could not boot from the worktree because Turbopack rejects the out-of-root `node_modules` symlink, but the spec has no glyph assertion to fail |
| F4 stage `Math.floor(pct / 25)` -> `Math.round(pct / 25)` | `web/src/components/DeployScene.tsx:192` | yes - `running shows stage and remaining (24% LINT)` FAIL |
| F5 server offset sign flipped: `Date.now() - Date.parse(serverTime)` | `web/src/components/DeployScene.tsx:29` | yes - `uses server time` FAIL |

## Gate

Whole suites were run at 9b02db7, and each exit code was read directly:

| Suite | Result | Exit |
| --- | --- | --- |
| `cd api && go test -count=1 ./...` | auth, catalog, deploy, httpx, player, world ok | 0 |
| `cd web && npx vitest run` | 10 files, 96 passed | 0 |
| `cd web && npx eslint` | no output | 0 |
| `cd web && npx tsc --noEmit` | no output | 0 |
| `cd web && npx playwright test` | 4 passed | 0 |
| `make ci-build` | Next build completed | 0 |
| `make check-deps` | `deps ok` | 0 |

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py deploy-pipelines` exited 1. This matches the FAIL verdict. Its output:

    ERROR deploy-pipelines: verdict is FAIL - route the ranked gaps back as fixes, then re-verify
    validate_verification: 1 error(s), 0 warning(s) across [deploy-pipelines]

Ranked gaps:

1. **Coverage: `glyph` unproven.** Door 4 fixes `types` as `id`, `name`, `glyph`, but no test asserts that `glyph` is served or rendered, and mutant F3 survived. Evidence: `api/internal/catalog/catalog_test.go:69-95` asserts only `id`, and `web/src/components/DeployScene.tsx:118` renders `t.glyph`. `name` is proven only end to end, for one type.
2. **Coverage and Test policy: `invalid_body` unproven on `POST /api/me/deploys`.** Foundation door 12 set the pattern of one `invalid_body` proof per JSON route (foundation C48, C51), and this plan says it copies door 12. The branch is `api/internal/deploy/deploy.go:83`, and no test covers it.
3. **Precision note:** the foundation `checks.md:105` (C28) text still lists `/deploy`. The test and the plan's Impact are right, but the check text is stale.
4. **Unasserted branch (noted):** `web/src/components/DeployScene.tsx:120` leaves the type status blank while loading, and no test covers it.
5. **Copy observation:** `level_too_low` is reused with the message "nível insuficiente para esta região" (`api/internal/httpx/errors.go:28`). It is unreachable from the UI because locked levels are disabled, but the wording is region-specific.
