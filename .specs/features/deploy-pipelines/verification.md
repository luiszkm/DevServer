# Deploy pipelines verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 00411c5..fc79bb9cd851955274863731318ef88e09b69165
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 39 checks are proven at HEAD (fc79bb9) with located evidence, and every whole suite exits 0. Round 1 raised five gaps, and each is now closed:

1. The `glyph` field is now asserted both where it is served (C12) and where it is rendered (C13). The round-1 survivor F3, which renames the `glyph` JSON tag, is now killed.
2. `invalid_body` on `POST /api/me/deploys` is now proven by C39. A mutant that swallows the decode error is killed.
3. The foundation C28 text now carries a supersession note.
4. A new test asserts that the type status is blank while the list loads. The mutant for that state is killed.
5. The `level_too_low` message is now the generic "nível insuficiente".

Two minor precision notes remain (see Gate). Neither is a check, a coverage member or a policy row of this feature.

Scope: the fix diff 9b02db7..fc79bb9 touched these files:

- `api/internal/catalog/catalog_test.go`
- `api/internal/deploy/deploy_test.go` (append only)
- `api/internal/httpx/errors.go` (one message string)
- `web/src/components/DeployScene.test.tsx`
- `.specs/features/deploy-pipelines/checks.md`
- `.specs/features/foundation/checks.md`

It touched no production code except the `errors.go` message.

## Binding sources

Carried from 9b02db7. No source in the plan is marked binding (`rg -ni binding plan.md`: 0 hits), and the profile is `standard`, so step 1 does not run. The fix touched no interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (profile standard) | n/a | - | - |

## Checks

Verified at fc79bb9. Every proof was re-run in full at HEAD, batched per target:

- **Go:** `cd api && go test ./internal/deploy ./internal/catalog ./internal/player -run '^(TestStart_CreatesJobWithCatalogDuration OR ... OR TestStart_InvalidBody)$' -v -count=1`. The real command joins the 24 names with the regex alternation pipe. It exited 0, and all 24 tests appear individually as `--- PASS`, including the new `TestStart_InvalidBody`.
- **Web unit:** `cd web && npx vitest run src/components/DeployScene.test.tsx src/components/ComingSoon.test.tsx src/lib/time.test.tsx --reporter=verbose`. It exited 0 with 49/49 passed, one more than round 1 because of the new loading test. Each named test is listed individually.
- **E2E:** `cd web && npx playwright test`. It exited 0 with 4/4 passed, including `e2e/deploy.spec.ts:5:5 › start persists`.

Citations were refreshed for the files the fix touched:

- `catalog_test.go` and `DeployScene.test.tsx`: line numbers moved.
- `deploy_test.go`: the change is append-only, so the C1-C38 lines are unchanged.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | level 15, `backend` NV.1..5 -> 201, startedAt = clock, endsAt = +15/30/60/180/360, serverTime, player | `TestStart_CreatesJobWithCatalogDuration` PASS | `api/internal/deploy/deploy_test.go:96` table `{1: 15, 2: 30, 3: 60, 4: 180, 5: 360}`; `:103` `mustStatus(t, rec, http.StatusCreated, "")`; `:105-106` `b.Deploy != want` with `StartedAt: stamp(now), EndsAt: stamp(now.Add(minutes))`; `:109` `b.ServerTime != stamp(now)`; `:112` `p.DevName == ""` | PASS |
| C2 | second `backend` -> 409 deploy_running, 1 job | `TestStart_SameTypeRunning` PASS | `deploy_test.go:123` `StatusConflict, "deploy_running"`; `:124` `activeJobs(t, env) != 1` | PASS |
| C3 | level 2 -> 422 level_too_low on NV.2; level 3 -> 201 | `TestStart_LevelBoundary` PASS | `deploy_test.go:134` `StatusUnprocessableEntity, "level_too_low"`; `:136` after `level = 3`, `StatusCreated` | PASS |
| C4 | `blockchain` -> 422 unknown_deploy_type, no job | `TestStart_UnknownType` PASS | `deploy_test.go:143` `"unknown_deploy_type"`; `:144` `env.Count("deploy_jobs") != 0` | PASS |
| C5 | level 0, 6, -1, absent -> 422 unknown_deploy_level, no job | `TestStart_UnknownLevel` PASS | `deploy_test.go:154` cases `0, 6, -1, absent`; `:156` `rec.Code != 422 OR ErrorCode != "unknown_deploy_level"`; `:160` jobs = 0 | PASS |
| C6 | 10 concurrent `mobile` NV.1 -> 1x 201, 9x 409, 1 active job | `TestStart_ConcurrentSameType` PASS | `deploy_test.go:194-199` `reflect.DeepEqual(got, want)` with `201` + 9x `409 deploy_running`; `:202` active = 1 | PASS |
| C7 | 5 types in sequence -> 201 each, 5 active | `TestStart_AllFiveTypes` PASS | `deploy_test.go:211-212` loop over 5 ids, `StatusCreated`; `:214` `activeJobs != 5` | PASS |
| C8 | direct second active insert -> unique_violation; allowed after collected | `TestDeployJobs_OneActivePerType` PASS | `deploy_test.go:229` `pgErr.Code != "23505"`; `:235` insert after `collected_at = now()` has no error | PASS |
| C9 | 3 routes: no session -> 401 unauthenticated; no player -> 404 player_not_found | `TestDeployRoutes_SessionAndPlayer` PASS | `deploy_test.go:248-250` the 3 routes; `:253` `rec.Code != 401 OR ErrorCode != "unauthenticated"`; `:256` `rec.Code != 404 OR ErrorCode != "player_not_found"` | PASS |
| C10 | GET 200, serverTime, only active jobs with 5 keys; collected job absent | `TestList_ActiveJobs` PASS | `deploy_test.go:275` serverTime = clock; `:278-279` `reflect.DeepEqual(b.Deploys, want)` only `frontend`; `:284-285` keys `type, level, startedAt, endsAt, ready` | PASS |
| C11 | 61 s before endsAt ready=false; at endsAt ready=true | `TestList_ReadyBoundary` PASS | `deploy_test.go:300-301` `if ready()` fails before; `:304-305` `if !ready()` fails at endsAt | PASS |
| C12 | catalog deployTypes in order, each with catalog `name` and `glyph`, + 5 deployLevels with the plan's values | `TestCatalog_ServesDeploys` PASS | `api/internal/catalog/catalog_test.go:85` `strings.Join(ids, ",") != "backend,frontend,mobile,database,microservices"`; `:88-90` wantTypes `{"BACKEND","$_"} {"FRONTEND","</>"} {"MOBILE","[]"} {"BANCO DE DADOS","##"} {"MICROSSERVIÇOS","::"}`; `:93` `[2]string{d.Name, d.Glyph} != wantTypes[d.ID]`; `:98` `len != 5`; `:103` `got != want[i]` against `{1,1,15,80,40,0} ... {5,15,360,700,300,8}` | PASS |
| C13 | 5 types in catalog order (glyph + name rendered); ocioso / 14:00 restante / pronto p/ coletar | `type statuses` PASS | `web/src/components/DeployScene.test.tsx:50` `toEqual(["backend","frontend","mobile","database","microservices"])`; `:53` per type ``toHaveTextContent(`${t.glyph} ${t.name}`)``; `:51` `"ocioso"`; `:55` `"14:00 restante"`; `:56-57` `"pronto p/ coletar"` | PASS |
| C14 | level 1: 5 levels with times + rewards; NV.2..5 disabled with NÍVEL 3/6/10/15 | `idle shows levels` PASS | `DeployScene.test.tsx:68-69` times and rewards per level; `:71` NV.1 `toBeEnabled()`; `:73-74` `toBeDisabled()` + `NÍVEL ${min}` | PASS |
| C15 | 60 min job at 10/30/60/90% -> LINT/BUILD/TEST/SHIP + aria-valuenow; 180 min -> 3:00:00; 5 min left -> 05:00 | `running shows stage and remaining` (9 cases) PASS | `DeployScene.test.tsx:79` cases incl. 24/25/50/75; `:91` `findByText(stage)`; `:92` `toHaveAttribute("aria-valuenow", String(pct))`; `:98` `"3:00:00"`; `:100` `"05:00"` | PASS |
| C16 | +3 s fake clock -> remaining down 3 s, fetch not called again | `countdown ticks without fetch` PASS | `DeployScene.test.tsx:107` `"15:00"`; `:109` `"14:57"`; `:110` `"14:57 restante"`; `:111` `toHaveBeenCalledTimes(1)` | PASS |
| C17 | pending GET -> CARREGANDO... | `pending shows CARREGANDO` PASS | `DeployScene.test.tsx:118` `getByText("CARREGANDO...")` | PASS |
| C18 | 500 and network error -> SERVIDOR FORA DO AR; TENTAR DE NOVO refetches | `list failure shows retry` (2 cases) PASS | `DeployScene.test.tsx:137` `"SERVIDOR FORA DO AR"`; `:140` `f.calls("GET /api/me/deploys")).toBe(2)` | PASS |
| C19 | mocked catalog NV.1 = 7 min, +5XP -> `7min`, `+5XP · +40coins` | `levels come from catalog` PASS | `DeployScene.test.tsx:149` `"7min"`; `:150` `"+5XP · +40coins"` | PASS |
| C20 | serverTime 10 min ahead, endsAt = serverTime+5 -> 05:00 restante | `uses server time` PASS | `DeployScene.test.tsx:158` `findByText("05:00 restante")` | PASS |
| C21 | INICIAR DEPLOY posts `{"type":"backend","level":1}`, setPlayer, log line | `start posts and logs` PASS | `DeployScene.test.tsx:173` `toEqual({ type: "backend", level: 1 })`; `:174` `setPlayer toHaveBeenCalledWith(newPlayer)`; `:175` `"$ devserver deploy --tipo=backend --nivel=1"` | PASS |
| C22 | 409 deploy_running on start -> api message in alert, type state unchanged | `start error shows message` (3 cases) PASS | `DeployScene.test.tsx:203` `findByRole("alert")).toHaveTextContent(text)`; `:204` `"ocioso"`; `:205` `setPlayer not.toHaveBeenCalled()` | PASS |
| C23 | `/deploy` renders the scene, not EM BREVE | `deploy page renders the scene` PASS | `DeployScene.test.tsx:224` `"PIPELINES DE DEPLOY"`; `:225` `queryByText("EM BREVE")).not.toBeInTheDocument()` | PASS |
| C24 | browser: start database NV.1 -> 14:/15: restante; survives reload | `e2e/deploy.spec.ts` `start persists` PASS | `web/e2e/deploy.spec.ts:13` `toContainText(/1[45]:\d\d restante/)`; `:16` `page.reload()`; `:17` same regex | PASS |
| C25 | +15 min claim backend NV.1 -> 200, reward 80/40/0, player +80 xp +40 coins, row kept with collected_at | `TestClaim_CreditsReward` PASS | `deploy_test.go:317` `StatusOK`; `:319` reward 80/40/0; `:322` `Player.XP != 80 OR Coins != 140`; `:326-330` `collected_at IS NOT NULL` | PASS |
| C26 | job reward altered to 999/7/3 -> claim credits 999/7/3 | `TestClaim_CreditsFrozenReward` PASS | `deploy_test.go:340` `UPDATE deploy_jobs SET xp = 999, coins = 7, gems = 3`; `:345` reward 999/7/3; `:348` coins 107, gems 23 | PASS |
| C27 | 1 s before endsAt -> 409 deploy_not_ready, player unchanged | `TestClaim_NotReady` PASS | `deploy_test.go:367` `Advance(15*time.Minute - time.Second)`; `:368` `"deploy_not_ready"`; `:369` `players::text` row equal | PASS |
| C28 | no job, and second claim -> 404 deploy_not_found | `TestClaim_NotFound` PASS | `deploy_test.go:378` and `:382` `StatusNotFound, "deploy_not_found"` | PASS |
| C29 | claim `blockchain` -> 422 unknown_deploy_type | `TestClaim_UnknownType` PASS | `deploy_test.go:389` `StatusUnprocessableEntity, "unknown_deploy_type"` | PASS |
| C30 | GainXP: 0 no-op; max-1 no level; = max -> +1, xp 0; 2 levels -> xpMax +500, sp +2, hpMax +40, hp = hpMax | `TestGainXP` PASS | `api/internal/player/devname_test.go:43-46` rows `zero`, `one below max`, `exactly max`, `two levels`; `:54` `got[i] != want[i]` | PASS |
| C31 | xp 480/500, hp 10/100 claims NV.1 -> level 2, xp 60/750, 2 sp, hp 120/120 | `TestClaim_LevelUp` PASS | `deploy_test.go:401` `p.Level != 2 OR p.XP != 60 OR p.XPMax != 750 OR p.SkillPoints != 2 OR p.HP != 120 OR p.HPMax != 120`; `:404` `LevelsGained != 1` | PASS |
| C32 | 10 concurrent claims -> 1x 200, 9x 404, coins +40 once | `TestClaim_ConcurrentOnce` PASS | `deploy_test.go:415-420` `DeepEqual` 200 + 9x 404; `:427` `coins != 140` | PASS |
| C33 | after claim, new backend POST -> 201 | `TestClaim_FreesType` PASS | `deploy_test.go:438` claim 200; `:439` `StatusCreated` | PASS |
| C34 | log `deploy.collected` with type, level, xp, coins, gems | `TestClaim_LogsCollected` PASS | `deploy_test.go:451` `"msg":"deploy.collected"`; `:455` want map; `:460` `entry[k] != v` | PASS |
| C35 | COLETAR RECOMPENSA -> setPlayer, log line, type back to ocioso | `claim updates player and logs` PASS | `DeployScene.test.tsx:238` `"> release de BACKEND nível 1 publicada."`; `:239` `setPlayer toHaveBeenCalledWith(newPlayer)`; `:240` `"ocioso"` | PASS |
| C36 | COLETAR disabled until endsAt, enabled at endsAt | `claim disabled until ready` PASS | `DeployScene.test.tsx:249` `toBeDisabled()`; `:251` `toBeEnabled()`; `:252-254` `PRONTO PARA COLETAR`, `CONCLUÍDO`, aria-valuenow 100 | PASS |
| C37 | claim error -> api message in alert, job stays | `claim error shows message` (3 cases) PASS | `DeployScene.test.tsx:277` alert text; `:278` COLETAR still present; `:279` setPlayer not called | PASS |
| C38 | DB error on the 3 routes -> 500 internal + request_id logged | `TestDeployRoutes_UnexpectedError` PASS | `deploy_test.go:470` table renamed; `:482` `rec.Code != 500 OR ErrorCode != "internal"`; `:486` log `"request_id"` | PASS |
| C39 | malformed JSON, `level` as text or fraction, `type` as number on `POST /api/me/deploys` -> 422 invalid_body, no job | `TestStart_InvalidBody` PASS | `deploy_test.go:497-500` cases `"{nope"`, `"level":"1"`, `"level":1.5`, `"type":7`; `:502` real route via `env.Do`; `:503` `rec.Code != 422 OR ErrorCode != "invalid_body"`; `:507` `env.Count("deploy_jobs") != 0` | PASS |

The fix added one test that carries no check id: `leaves type statuses blank while the list loads` at `DeployScene.test.tsx:121-127`. It asserts `:126` `not.toHaveTextContent(/ocioso|restante|pronto/)` for every type. It closes round-1 gap 4, and it passed in the batched run. The C13 filter `-t "type statuses"` also matches this test's name, so both tests run under the C13 proof. That is harmless, and both are listed individually.

**Level.** Verified at fc79bb9. C39 goes through `env.Do` on the real router (`:502`), like every other status-naming claim (C1-C12, C25, C27-C29, C31-C34, C38, C39). C8 and C30 are declared as SQL-level and own-layer respectively. I found no level gap.

**Swept rows.** Carried from 9b02db7. None of them resolves to **existing**. The fix touched no guard.

**Foundation checks.** Verified at fc79bb9.

- **Foundation C28.** The text at `.specs/features/foundation/checks.md:105` is unchanged. `:107` now records "Superseded in part by deploy-pipelines C23: `/deploy` left the unshipped set; the proof now covers `/bug-fight`, `/skills`, `/loja`, `/avatar`". The test covers exactly those 4 routes, and each passed. Round-1 gap 3 is closed.
- **Foundation C27.** Carried from 9b02db7. `shell.spec.ts` passed in the e2e run.

## Coverage

Verified at fc79bb9 for the rows whose authority the fix touched: type fields, the start 422 codes, `invalid_body` routes, and the on-screen type status. The rest are carried from 9b02db7, and their code was untouched by the fix: `git diff 9b02db7..HEAD` touches no production file other than the `errors.go` message.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/me/deploys` statuses (4) | plan Surface; `deploy.go:39-75` (carried from 9b02db7) | 200 C10 · 401 C9 · 404 C9 · 500 C38 | - |
| `POST /api/me/deploys` statuses (6) | plan Surface; `deploy.go:77-125` | 201 C1 · 401 C9 · 404 C9 · 409 C2 · 422 C3/C4/C5/C39 · 500 C38 | - |
| `POST /api/me/deploys` 422 codes (4) | `deploy.go:83` DecodeJSON, `:89` type, `:93` level, `:96` minLevel | `invalid_body` C39 `deploy_test.go:503` · `unknown_deploy_type` C4 · `unknown_deploy_level` C5 · `level_too_low` C3 | - |
| `POST /api/me/deploys/{type}/claim` statuses (6) | plan Surface; `deploy.go:134-176` (carried from 9b02db7) | 200 C25 · 401 C9 · 404 C28 · 409 C27 · 422 C29 · 500 C38 | - |
| `GET /api/catalog` statuses (2) | plan Surface (carried from 9b02db7) | 200 C12 · 304 `catalog_test.go:60` | - |
| `invalid_body` JSON routes (3) | foundation door 12; JSON decoders found by `rg -n DecodeJSON api --glob '!*_test.go'` | `POST /api/me/travel` foundation C48 `httpx_test.go:104` · `POST /api/players` foundation C51 · `POST /api/me/deploys` C39 `deploy_test.go:503` | - |
| door 4 `deployTypes` fields (3) | plan Landing door 4 (`plan.md:160`); `catalog.go:24-28` | `id` C12 `catalog_test.go:85` · `name` C12 `catalog_test.go:93`, rendered C13 `DeployScene.test.tsx:53` · `glyph` C12 `catalog_test.go:93` (F1 killed), rendered C13 `DeployScene.test.tsx:53` (F2 killed) | - |
| door 4 `deployLevels` fields (6) | plan Landing door 4; `catalog.go:30-37` | all 6 C12 `catalog_test.go:103` | - |
| response keys (3 routes) | plan Surface Out (carried from 9b02db7) | start C1 · list C10 · claim C25 | - |
| deploy levels (5) | `deploys.json` (carried from 9b02db7) | C1 table over all 5 | - |
| deploy types (5) | `deploys.json:3-7` | C7 over all 5 · C12 order, name, glyph · C13 order and render | - |
| invalid level values (4) | AC 5 (carried from 9b02db7) | 0, 6, -1, absent C5 | - |
| invalid body shapes (4) | C39 claim | malformed · level text · level fraction · type number, all at `deploy_test.go:497-500` (F4 killed) | - |
| level requirement boundary (2) | AC 3 (carried from 9b02db7) | below C3 · equal C3 | - |
| list ready boundary (2) | AC 9 (carried from 9b02db7) | before C11 · at endsAt C11 | - |
| claim ready boundary (2) | AC 18 (carried from 9b02db7) | 1 s before C27 · at endsAt C25 | - |
| new error codes (5) | Landing door 5; `httpx/errors.go` (carried from 9b02db7) | deploy_running C2 · deploy_not_ready C27 · deploy_not_found C28 · unknown_deploy_type C4/C29 · unknown_deploy_level C5 | - |
| claim guards in order (3) | `deploy.go:137,149,155` (carried from 9b02db7) | type C29 · no job C28 · not ready C27 | - |
| `DeployJob` states (3) | Relations (carried from 9b02db7) | active C1 · ready C11 · collected C25 | - |
| level-up cases (4) | AC 20 (carried from 9b02db7) | C30 all 4 | - |
| type status on screen (4) | `DeployScene.tsx:106,120` | loading blank `DeployScene.test.tsx:126` (F3 killed) · ocioso · restante · pronto p/ coletar C13 | - |
| stages (4) and boundaries (3) | AC 12 (carried from 9b02db7) | C15 | - |
| time formats (2) | AC 12 (carried from 9b02db7) | C15 and `time.test.tsx` | - |
| list outcomes on screen (4) | AC 14, 15 (carried from 9b02db7) | 200 C13 · pending C17 · 5xx C18 · network C18 | - |
| start / claim outcomes on screen (4 each) | carried from 9b02db7 | ok C21/C35 · api message C22/C37 · no-body C22/C37 · network C22/C37 | - |
| in-flight disables (2) | `DeployScene.tsx` (carried from 9b02db7) | INICIAR `DeployScene.test.tsx:213` · COLETAR `DeployScene.test.tsx:265` | - |
| Landing doors (8) | plan Landing | 1 C8 · 2 C26 · 3 C11/C20 · 4 C12 (now complete) · 5 C2 · 6 C30 · 7 C9/C25 · 8 C25 | - |
| entities (1) | Relations (carried from 9b02db7) | `DeployJob` C8 | - |
| startup config: clock (2 assemblies) | read directly (carried from 9b02db7) | `api/cmd/api/main.go:51` `Now: time.Now` · `api/internal/apptest/apptest.go:85` `Now: clock.Now` | - |

Conditional sweep of the fix's one production change:

- **Where the change is:** `api/internal/httpx/errors.go:28` changes only the `level_too_low` message, to "nível insuficiente". The code and status are unchanged.
- **Where it is reached:** the code is shared by travel (`world_test.go:54`) and deploy (C3). Both pass.
- **How the message is asserted:** only as non-empty, at `httpx_test.go:89` (foundation C41). No check claims its wording, so no member is owed.

## Test policy rows

Verified at fc79bb9 for the round-1 unmet row and for the rows that classify touched files. The others are carried from 9b02db7.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (start rule) | `api/internal/deploy/deploy.go:77-125`, `catalog.go` lookups | boundary C1-C7, C9, C38, C39 through `NewRouter` | yes. The round-1 row is now met: `invalid_body` C39 `deploy_test.go:503`, F4 killed |
| Decides, reached across a boundary (claim rule) | `deploy.go:134-176` | boundary C25-C29, C32-C34, C38 | yes (carried from 9b02db7) |
| Decides, reached across a boundary (level-up) | `api/internal/player/player.go:128-143` | own layer C30 · boundary C31 | yes (carried from 9b02db7) |
| Decides, not reached across a boundary | `web/src/components/DeployScene.tsx`, `web/src/lib/time.ts` | own layer | yes. The loading-blank status is now asserted at `DeployScene.test.tsx:126` (F3 killed), and the glyph render at `:53` (F2 killed) |
| Entry point that decides nothing | `GET /api/catalog` (`catalog.go`) | boundary | yes. 200 with full field shape C12 (F1 killed), 304 `catalog_test.go:60` |
| Instrumentation, pass-throughs | `api/internal/httpx/errors.go` (message changed), `page.tsx`, `types.ts`, `router.go`, `main.go`, `apptest.go`, `travel.go` | none of its own | yes. `errors.go` is consumed by C3 and `world_test.go:54`, and the envelope by `httpx_test.go:89` |

## Faults injected

Verified at fc79bb9. The faults were re-injected on the surfaces the fix touched or created, one per distinct proof, including the round-1 survivor.

**Isolation.**

- **Worktree:** each fault ran in a detached `git worktree add --detach <scratchpad>/wt HEAD`.
- **Web dependencies:** the real `web/node_modules` was symlinked into the worktree, and `web/.next/types` was copied in for `tsc`.
- **Reverting between faults:** each fault was reverted with `git -C <wt> checkout -- .` before the next one.
- **Real tree:** its porcelain was `?? .claude/` before and after, `diff` of the two captures was empty, and `git diff --quiet` passed.
- **Cleanup:** the worktree was removed with `git worktree remove --force` and pruned. `git stash` was never used.

**Compilation.** Every mutant compiled. `go vet` exited 0 for F1 and F4, and `tsc --noEmit` exited 0 for F2 and F3.

**The `errors.go` message.** It got no mutant. No check or coverage member claims its wording (see Coverage), so a mutant there would only restate that search.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (round-1 survivor F3) `DeployType` JSON tag `glyph` -> `icon` | `api/internal/catalog/catalog.go:27` | yes - `TestCatalog_ServesDeploys` FAIL: `catalog_test.go:94: type backend name/glyph = [BACKEND ], want [BACKEND $_]` (all 5 types) |
| F2 glyph span removed from the type button (`{t.name}` only) | `web/src/components/DeployScene.tsx:118` | yes - `type statuses` FAIL (`Expected element to have text content`) |
| F3 loading guard `jobs ? status : ""` -> `status` (shows `ocioso` while loading) | `web/src/components/DeployScene.tsx:120` | yes - `leaves type statuses blank while the list loads` FAIL (`Expected element not to have text content`) |
| F4 decode error swallowed: `_ = httpx.DecodeJSON(r, &in)` | `api/internal/deploy/deploy.go:83-85` | yes - `TestStart_InvalidBody` FAIL: `level as string: 422 unknown_deploy_level, want 422 invalid_body` (and the other cases) |

## Gate

Verified at fc79bb9. I ran each whole suite and read its exit code directly:

| Suite | Result | Exit |
| --- | --- | --- |
| `cd api && go test -count=1 ./...` | auth, catalog, deploy, httpx, player, world ok | 0 |
| `cd web && npx vitest run` | 10 files, 97 passed | 0 |
| `cd web && npx eslint` | no output | 0 |
| `cd web && npx tsc --noEmit` | no output | 0 |
| `cd web && npx playwright test` | 4 passed | 0 |
| `make ci-build` | Next build completed | 0 |
| `make check-deps` | `deps ok` | 0 |

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py deploy-pipelines` exited 0. Its output:

    validate_verification: 0 error(s), 0 warning(s) across [deploy-pipelines]

Precision notes. These are non-failing, because none of them is a check, coverage member or policy row of this feature:

1. **Stale foundation Coverage row.** The foundation Coverage row at `.specs/features/foundation/checks.md:269` still reads `unshipped scenes (5) - C28, table-driven over all 5`. After the supersession the set is 4. The C28 text got its annotation at `:107`, but this row did not.
2. **C13 proof filter is broad.** The filter `-t "type statuses"` in `.specs/features/deploy-pipelines/checks.md` (C13) also matches the new loading test, `DeployScene.test.tsx:121`. An anchored name would keep the C13 proof to its own test.
