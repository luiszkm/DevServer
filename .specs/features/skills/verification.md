# Skills verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 7b5df87..3b32f30e463809a1e802317b0af392b305596f0c
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 26 checks are proven at HEAD with located assertions. Every suite exits 0, and all 5 injected faults were killed. The verdict is FAIL because the recomputed coverage has three unproven members and one `Test policy` row is unmet. Those gaps sit in the new ordering rule (`SortSkills` / `SkillPosition`), in a new `GET /api/me` error path, and in the api assertion on catalog descriptions. They are ranked at the end.

## Binding sources

Step 1 does not run: the plan marks no source as binding, and the profile is `standard`, not `ui`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only | - | - |

I opened the prototype `docs/DevServer RPG.html` `treeData` only to recompute the catalog node set (Coverage). `api/catalog/skills.json` matches it on all 9 ids, glyphs, names, descriptions and bonuses.

## Checks

Proof runs, all at HEAD 3b32f30:

- api: `cd api && go test ./internal/skills ./internal/catalog -run '^(TestUnlock_SpendsPointAndRecords|...|TestUnlock_SerializesOnPlayerRowLock)$' -v -count=1` - exit 0. All 13 named tests appear in the output as `--- PASS`.
- web: `cd web && npx vitest run src/components/SkillsScene.test.tsx src/components/Hud.test.tsx src/components/GameShell.test.tsx src/components/ComingSoon.test.tsx --reporter=verbose` - exit 0, 37 passed. Every `-t` pattern named in the checks appears as a passing test.
- e2e: `cd web && npx playwright test` - exit 0. `e2e/skills.spec.ts:5 unlock persists` passed.

Every proof test is new in this diff (`skills_test.go`, the `TestCatalog_ServesSkillTrees` hunk, `SkillsScene.test.tsx`, the Hud and GameShell hunks, `e2e/skills.spec.ts`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 1 point, unlock f1: 200, points 0, skills [f1], 1 row | `TestUnlock_SpendsPointAndRecords` PASS | `api/internal/skills/skills_test.go:73` `mustStatus(t, rec, http.StatusOK, "")`; `:74` `p.SkillPoints != 0`; `:77` `reflect.DeepEqual(got, []string{"f1"})`; `:80` `env.Count("player_skills"); n != 1` | PASS |
| C2 | f1, b1, i2 add 10/10/15 to HP and HP max | `TestUnlock_HPBonus` PASS | `api/internal/skills/skills_test.go:94` steps `{"f1", 10}, {"b1", 10}, {"i1", 0}, {"i2", 15}`; `:99` `p.HP != hp OR p.HPMax != hpMax` | PASS |
| C3 | f2 (sp) and f3 (dmg) change only skill points, by -1 | `TestUnlock_NonHPBonusChangesOnlyPoints` PASS | `api/internal/skills/skills_test.go:115` `after["skill_points"] != before["skill_points"]-1`; `:120` `reflect.DeepEqual(before, after)` over the whole `row_to_json(p)` row, minus skill_points | PASS |
| C4 | f2 without f1, i3 with only i1: 409 skill_locked, no point spent | `TestUnlock_PreviousRequired` PASS | `api/internal/skills/skills_test.go:131` `StatusConflict, "skill_locked"` (f2); `:133` same (i3); `:134` `skill_points != 2` | PASS |
| C5 | f1 again: 409 skill_already_unlocked, no point spent | `TestUnlock_AlreadyUnlocked` PASS | `api/internal/skills/skills_test.go:145` `StatusConflict, "skill_already_unlocked"`; `:146` `skill_points != 2` | PASS |
| C6 | 0 points: 409 no_skill_points, no row | `TestUnlock_NoPoints` PASS | `api/internal/skills/skills_test.go:156` `StatusConflict, "no_skill_points"`; `:157` `env.Count("player_skills"); n != 0` | PASS |
| C7 | x9: 422 unknown_skill | `TestUnlock_UnknownSkill` PASS | `api/internal/skills/skills_test.go:166` `StatusUnprocessableEntity, "unknown_skill"` | PASS |
| C8 | 10 concurrent f1 unlocks, 3 points: one 200, nine 409, 2 points left | `TestUnlock_ConcurrentOnce` PASS | `api/internal/skills/skills_test.go:196` `reflect.DeepEqual(out, want)` with want = 1 x `200` + 9 x `409 skill_already_unlocked` (`:192-195`); `:199` `skill_points != 2` | PASS |
| C9 | duplicate (player, node) insert fails unique_violation | `TestPlayerSkills_UniquePerNode` PASS | `api/internal/skills/skills_test.go:214` `pgErr.Code != "23505"`; schema `api/migrations/00003_player_skills.sql:6` `PRIMARY KEY (player_id, skill_id)` | PASS |
| C10 | `skills` = [] (not null) on create and GET /api/me; after b1 then f1, `[f1,b1]` on unlock, GET /api/me, travel | `TestPlayerSkills_InEveryPlayerInCatalogOrder` PASS | `api/internal/skills/skills_test.go:33` null is rejected (`raw.Player.Skills == nil`); `:225` and `:228` `len(got) != 0`; `:236`, `:239`, `:242` `reflect.DeepEqual(got, want)` with want `[]string{"f1", "b1"}` (`:235`) | PASS |
| C11 | unlock: 401 unauthenticated, 404 player_not_found, 500 internal with request_id log | `TestUnlockRoute_SessionPlayerAndUnexpected` PASS | `api/internal/skills/skills_test.go:250` `StatusUnauthorized, "unauthenticated"`; `:251` `StatusNotFound, "player_not_found"`; `:258` `StatusInternalServerError, "internal"`; `:259` log contains `"request_id":"<id>"` | PASS |
| C12 | GET /api/catalog skillTrees frontend, backend, infra, each node's id, glyph, name, description, bonus | `TestCatalog_ServesSkillTrees` PASS | `api/internal/catalog/catalog_test.go:134` `len(b.SkillTrees) != 3`; `:139` `tr.ID != w.id OR tr.Name != w.name OR len(tr.Nodes) != 3`; `:146` `got != wn OR n.Description == ""` (description is checked only for being non-empty; precision gap below) | PASS |
| C13 | 3 trees in catalog order, 3 nodes each with glyph, name, description | vitest `renders trees in catalog order` PASS | `web/src/components/SkillsScene.test.tsx:28` `toEqual(["FRONTEND", "BACKEND", "INFRA"])`; `:31` node ids in order; `:33-35` `toHaveTextContent(n.glyph / n.name / n.description)` | PASS |
| C14 | skills [f1]: f1 ATIVA, f2 1 PT, f3 BLOQ., b1 1 PT, b2 BLOQ., i1 1 PT | vitest `marks node states` PASS | `web/src/components/SkillsScene.test.tsx:43` `toEqual({ f1: "ATIVA", f2: "1 PT", f3: "BLOQ.", b1: "1 PT", b2: "BLOQ.", b3: "BLOQ.", i1: "1 PT", i2: "BLOQ.", i3: "BLOQ." })`; `:44` visible text matches state | PASS |
| C15 | 3 points: `PONTOS: 3` | vitest `shows points` PASS | `web/src/components/SkillsScene.test.tsx:50` `getByText("PONTOS: 3")` | PASS |
| C16 | bonus band sums; empty case +0 | vitest `sums active bonus` (3 cases) PASS | `web/src/components/SkillsScene.test.tsx:55` `"bônus ativo: +20 HP · +18 SP · +12% dano"`; `:56` `"+0 HP · +0 SP · +0% dano"`; `:60` `getByText(text)` | PASS |
| C17 | click API REST calls POST b1/unlock, passes player to HUD, shows message | vitest `unlock calls api and reports` PASS | `web/src/components/SkillsScene.test.tsx:69` `toHaveTextContent("> API REST desbloqueada · +10 HP máximo permanente")`; `:70` `setPlayer toHaveBeenCalledWith(updated)`; `:71` `f.calls("POST /api/me/skills/b1/unlock")).toBe(1)` | PASS |
| C18 | 409 message, no body, network: message shown, states unchanged, no setPlayer | vitest `unlock error shows message` (3 cases) PASS | `web/src/components/SkillsScene.test.tsx:76-78` expected texts; `:84` `toHaveTextContent(text)`; `:85` `states()).toEqual(before)`; `:86` `setPlayer).not.toHaveBeenCalled()` | PASS |
| C19 | pending: all 9 nodes disabled | vitest `disables nodes while unlocking` PASS | `web/src/components/SkillsScene.test.tsx:95` `toHaveLength(9)`; `:96` `toBeDisabled()` for each | PASS |
| C20 | ATIVA and BLOQ. disabled and do not call api | vitest `only available nodes are clickable` PASS | `web/src/components/SkillsScene.test.tsx:104` `toBeDisabled()`; `:107` 1 PT nodes `toBeEnabled()`; `:108` `f.fn).not.toHaveBeenCalled()` | PASS |
| C21 | ATIVAS EM COMBATE chips in catalog order, or `nenhuma habilidade equipada` | vitest `lists active skills` + `(none)` PASS | `web/src/components/SkillsScene.test.tsx:114` `textContent).toBe("</>MARKUP$_API")` from skills `["b1","f1"]`; `:119` `getByText("nenhuma habilidade equipada")` | PASS |
| C22 | HUD SKILL PTS card: `</>$_` for [f1,b1], `sem habilidades ativas` for [] | vitest `shows active skill glyphs` (2 cases) PASS | `web/src/components/Hud.test.tsx:46` `textContent).toBe(text)` with `"</>$_"` (`:40`); `:47` `getByText("sem habilidades ativas")`; GameShell wiring `web/src/components/GameShell.test.tsx:132` `toHaveTextContent("</>")` | PASS |
| C23 | mocked catalog f1 = HTML PURO +99 HP is shown | vitest `tree comes from catalog` PASS | `web/src/components/SkillsScene.test.tsx:130` `toHaveTextContent("HTML PURO")`; `:131` `getByText("bônus ativo: +99 HP · +0 SP · +0% dano")` | PASS |
| C24 | /skills renders the scene, not EM BREVE | vitest `skills page renders the scene` PASS | `web/src/components/SkillsScene.test.tsx:141` `getByText("ÁRVORE DE HABILIDADES")`; `:142` `queryByText("EM BREVE")).not.toBeInTheDocument()` | PASS |
| C25 | browser: unlock MARKUP, ATIVA, PONTOS 0, HP 110/110, `</>` in HUD, after reload too | playwright `unlock persists` PASS | `web/e2e/skills.spec.ts:13` `toHaveAttribute("data-state", "ATIVA")`; `:14` `PONTOS: 0`; `:16` `toContainText("HP 110/110")`; `:17` `toHaveText("</>")`; `:20` `page.reload()` then re-check | PASS |
| C26 | unlock waits on the player row lock and reads the committed points | `TestUnlock_SerializesOnPlayerRowLock` PASS | `api/internal/skills/skills_test.go:282` fails if it answers while locked (500 ms); `:293` `code != http.StatusOK` after the commit that set points 0 to 1 (`:285`) | PASS |

## Coverage

I recomputed each set from its authority: the prototype `treeData` for nodes and bonuses, the router and handler for statuses, and the code for decision rows.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| unlock statuses (6) | `api/internal/skills/skills.go:25-57`, `router.go`, `httpx/errors.go:39-42` | 200 C1 · 401 C11 · 404 C11 · 409 C4, C5, C6 · 422 C7 · 500 C11 | - |
| unlock guards in handler (5 rows) | `api/internal/skills/skills.go:26,30,33,36,43` | unknown C7 · already C5 · previous missing C4 · first node (previous nil) C1 · previous present C2, C3 · 0 points C6 · hp bonus C2 · non-hp C3 | - |
| new error codes (4) | `api/internal/httpx/errors.go:39-42` | skill_locked C4 · skill_already_unlocked C5 · no_skill_points C6 · unknown_skill C7 | - |
| skill nodes (9) | prototype `treeData` (`docs/DevServer RPG.html:382`) | C12, table-driven over all 9 (`api/internal/catalog/catalog_test.go:126-128`) | - |
| catalog node fields (5) | Landing door 3 and prototype | id, glyph, name, bonus.type, bonus.amount by value at `catalog_test.go:146` · description checked only for being non-empty (`catalog_test.go:146` `n.Description == ""`) | description value: the api asserts none of the 9 description strings, and the web tests read them from a hand-copied mock (`web/src/test/helpers.ts:29-45`) |
| bonus types (3) | `skills.json` | hp C2 · sp C3 (f2) · dmg C3 (f3); web sums C16 | - |
| HP nodes (3) | `skills.json` | f1, b1, i2 C2 | - |
| skill ordering decision (2 rows) | `api/internal/player/player.go:125-130`, `api/internal/catalog/catalog.go:174-184` | known id by catalog position C10 (F3 killed) | unknown id sorts last (`catalog.go:184` fall-through, stated in the doc comment at `:173`): no asserted case at any layer. It is reachable, because node ids are not foreign keys (foundation door 5) |
| routes returning `player` with `skills` (4) | router | POST /api/players C10 · GET /api/me C10 · POST /api/me/travel C10 · unlock C10 | - |
| error paths added by this feature (3) | `player.go:106-107`, `player.go:147-149`, `skills.go:39-41` | WithLocked loadSkills failure: C11 (the 500 comes from renaming the `player_skills` table) | `player.Get` loadSkills failure (`player.go:106-107`) is a new cause of `GET /api/me` 500. The checks say those statuses are "untouched by this feature", but foundation C49 fails only the `players` table (`api/internal/httpx/httpx_test.go:131`). The unlock INSERT error (`skills.go:39-41`) has no case either |
| node states on screen (3) | `web/src/components/SkillsScene.tsx:45-49` | ATIVA, 1 PT, BLOQ. C14 (F4 killed) | - |
| unlock outcomes on screen (4) | `SkillsScene.tsx:23-29` | 200 C17 · error with message C18 · no body C18 · network C18 | - |
| active-skill displays (4) | `SkillsScene.tsx:78-87`, `Hud.tsx:61-72` | scene with skills C21 · scene empty C21 · HUD with skills C22 · HUD empty C22 | - |
| Landing doors (6) | plan Landing | 1 C9 · 2 C2, C3 · 3 C12 (description value above) · 4 C10 · 5 C4-C7 · 6 C1 | - |
| entities (1) | plan Relations | PlayerSkill C9 | - |

Swept rows that resolve to existing: `RequireSession` guards the unlock route. It is mounted inside the protected group at `api/internal/app/router.go:62`, and C11 asserts 401 on it. The existing `GameShell` 401 login screen still stands (foundation C9 and GameShell tests pass).

Impact on earlier checks: foundation C28 dropped exactly the `/skills` row (`web/src/components/ComingSoon.test.tsx`), as the plan's Impact states. `/bug-fight`, `/loja` and `/avatar` remain and pass. The removed assertion is replaced by C24 `SkillsScene.test.tsx:142`. Foundation C23 (`Hud.test.tsx` `renders player values`) is untouched and passes. The deploy-pipelines checks all pass in the full suites. No earlier check was weakened beyond the planned C28 shrink.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (unlock rule) | `api/internal/skills/skills.go:23-58`, `catalog.go:159-171` (`Skill`) | boundary C1-C8, C11, C26 through `NewRouter`. The rule lives in the handler, so boundary and own layer coincide, as for the deploy start rule | yes. Every guard row is asserted (Coverage "unlock guards"), and F1 and F2 were killed |
| Decides, reached across a boundary (skill ordering) | `api/internal/player/player.go:125-130` (`SortSkills`), `catalog.go:174-184` (`SkillPosition`) | boundary C10 AND an own-layer test in `player` or `catalog`, as the level-up rule `GainXP` got in deploy-pipelines (C30 own layer, C31 boundary) | unmet. It has only the boundary proof: `rg SortSkills OR SkillPosition` over `*_test.go` finds nothing, and the unknown-id-last row has no case at any layer |
| Decides, not reached across a boundary (web) | `web/src/components/SkillsScene.tsx`, `Hud.tsx:47,61-72` (`ActiveSkillGlyphs`) | own layer | partly met. SkillsScene covers every row (C13-C24, F4 and F5 killed), and `ActiveSkillGlyphs` is covered by C22. The `catalog &&` guard at `Hud.tsx:47` has an unasserted false branch: without a catalog the HUD shows neither glyphs nor `sem habilidades ativas`, although AC 18 requires one of the two. The app always passes a catalog (`GameShell.tsx:89`), so this is low severity |
| Entry point that decides nothing | `GET /api/catalog` (`catalog.go` Load and serialize), `GET /api/me` read path | boundary | partly met. The catalog returns 200 with the field shape (C12), and 304 is covered by the existing `catalog_test.go`. The description value is not asserted, and the new `player.Get` error path (`player.go:106-107`) has no case |
| Instrumentation, pass-throughs | `router.go`, `httpx/errors.go` (4 new values), `types.ts`, `helpers.ts`, `skills/page.tsx`, `GameShell.tsx:89`, migration | none of its own | yes. The consumers prove them: C4-C7 for errors.go, C24 for page.tsx, `GameShell.test.tsx:132` for the HUD catalog prop, C9 for the migration |

## Faults injected

Worktree at `/private/tmp/claude-501/-Users-luissoares-Repos-DevServer-1/028d56a0-a5ef-4417-92ad-b44805e91365/scratchpad/wt` (HEAD 3b32f30), with `web/node_modules` symlinked. Real tree porcelain was `?? .claude/` before and after, identical. The worktree was removed with `git worktree remove --force`, and `git stash` was not used. Every mutant passed `go vet` or `tsc`. The worktree's `tsc` baseline has 1 pre-existing error, `LayoutProps` from missing Next typegen, and the mutants added none.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 previous-node guard disabled (`if false && previous != nil ...`) | `api/internal/skills/skills.go:33` | yes - C4 `TestUnlock_PreviousRequired` FAIL `want 409 skill_locked` |
| F2 HP bonus applied only to HP max (`p.HP += ...` removed) | `api/internal/skills/skills.go:45` | yes - C2 `TestUnlock_HPBonus` FAIL `after i2: hp 100/135, want 135/135` |
| F3 catalog order reversed (`<` to `>` in SortSkills) | `api/internal/player/player.go:128` | yes - C10 FAIL `GET /api/me skills = [b1 f1], want [f1 b1]` |
| F4 `1 PT` only for first node (`i === 0 OR previous unlocked` became `i === 0`) | `web/src/components/SkillsScene.tsx:47` | yes - C14 `marks node states` FAIL |
| F5 pending no longer disables nodes (`pending OR` dropped) | `web/src/components/SkillsScene.tsx:57` | yes - C19 `disables nodes while unlocking` FAIL |

Not injected (the cap of 5 was reached): `SkillPosition` unknown returning `-1`, and `Get` swallowing the loadSkills error. The search shows neither has an asserting test, so both are recorded as unproven Coverage members rather than guessed as killed.

## Suites

| Command | Exit |
| --- | --- |
| `cd api && go test -count=1 ./...` | 0 |
| `cd web && npx vitest run` | 0 (11 files, 115 tests) |
| `cd web && npx eslint` | 0 |
| `cd web && npx tsc --noEmit` | 0 |
| `cd web && npx playwright test` | 0 (5 passed) |
| `make ci-build` | 0 |
| `make check-deps` | 0 (`deps ok`) |

## Ranked gaps

1. Skill ordering has no own-layer proof, and its unknown-id-last row is unasserted. This is `Test policy` row "Decides, reached across a boundary (skill ordering)", affecting C10 and door 4. Locations: `api/internal/catalog/catalog.go:174-184`, `api/internal/player/player.go:125-130`.
2. The new `player.Get` loadSkills error path has no case, so `GET /api/me` gets a new 500 cause. It sits in the Coverage "error paths" row and contradicts the checks' note that GET /api/me statuses are "untouched". Location: `api/internal/player/player.go:106-107`. The unlock INSERT error at `api/internal/skills/skills.go:39-41` has no case either.
3. C12 has a precision gap: node `description` is checked only for being non-empty at the api. None of the 9 prototype strings are asserted, and web tests read a hand-copied mock. Location: `api/internal/catalog/catalog_test.go:146`.
4. The HUD `catalog &&` guard's false branch is unasserted (low severity). Location: `web/src/components/Hud.tsx:47`.

## Gate

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py skills` - exit 1:

    ERROR skills: verdict is FAIL - route the ranked gaps back as fixes, then re-verify
    validate_verification: 1 error(s), 0 warning(s) across [skills]

The only error is the FAIL verdict itself. No row contradicts the verdict.
