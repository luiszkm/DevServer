# Skills verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 7b5df87..93506c05341f1a783f0884564c0c4bd0f31748a3
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 29 checks are proven at HEAD 93506c0 with located assertions. Every suite exits 0. Five faults were injected on the surfaces the fix touched. Four were killed, and the fifth is the equivalent mutant the checks predict, which I confirmed by running it. The four round-1 gaps are closed.

The fix range 3b32f30..93506c0 changes only tests and specs. The files are `catalog_test.go`, `devname_test.go`, `skills_test.go`, `Hud.test.tsx`, `checks.md` and this report. No production file changed, so every production citation from round 1 still holds.

## Binding sources

Carried from 3b32f30. The fix did not touch the interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only | - | - |

To check the strengthened C12, I compared the 9 description strings at `api/internal/catalog/catalog_test.go:111-115` with the prototype `docs/DevServer RPG.html:382` `treeData`. All 9 match.

## Checks

Verified at 93506c0. Every proof was re-run in full, in two batched invocations plus e2e:

- api: `cd api && go test ./internal/skills ./internal/catalog ./internal/player -run '^(TestUnlock_SpendsPointAndRecords|TestUnlock_HPBonus|TestUnlock_NonHPBonusChangesOnlyPoints|TestUnlock_PreviousRequired|TestUnlock_AlreadyUnlocked|TestUnlock_NoPoints|TestUnlock_UnknownSkill|TestUnlock_ConcurrentOnce|TestPlayerSkills_UniquePerNode|TestPlayerSkills_InEveryPlayerInCatalogOrder|TestUnlockRoute_SessionPlayerAndUnexpected|TestCatalog_ServesSkillTrees|TestUnlock_SerializesOnPlayerRowLock|TestCatalog_SkillPosition|TestSortSkills|TestMe_SkillsLoadError|TestUnlock_InsertError)$' -v -count=1` - exit 0. All 17 named tests appear individually as `--- PASS`.
- web: `cd web && npx vitest run src/components/SkillsScene.test.tsx src/components/Hud.test.tsx src/components/GameShell.test.tsx src/components/ComingSoon.test.tsx --reporter=verbose` - exit 0, 4 files, 38 passed. Every `-t` pattern in C13-C24 appears as a passing test, and so does `Hud > shows no skill section without a catalog`.
- e2e: `cd web && npx playwright test` - exit 0, 5 passed, including `e2e/skills.spec.ts:5:5 unlock persists`.

The fix diff did not touch `skills_test.go:1-296`, `SkillsScene.test.tsx`, `GameShell.test.tsx`, `e2e/skills.spec.ts` or `Hud.test.tsx:1-48`. I re-read those citations with `rg -n` at HEAD and they are unchanged. The `catalog_test.go` citations moved and are refreshed.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 1 point, unlock f1: 200, points 0, skills [f1], 1 row | `TestUnlock_SpendsPointAndRecords` PASS | `api/internal/skills/skills_test.go:73` `mustStatus(t, rec, http.StatusOK, "")`; `:74` `p.SkillPoints != 0`; `:77` `reflect.DeepEqual(got, []string{"f1"})`; `:80` `env.Count("player_skills"); n != 1` | PASS |
| C2 | f1, b1, i2 add 10/10/15 to HP and HP max | `TestUnlock_HPBonus` PASS | `api/internal/skills/skills_test.go:94` steps `{"f1", 10}, {"b1", 10}, {"i1", 0}, {"i2", 15}`; `:99` `p.HP != hp OR p.HPMax != hpMax` | PASS |
| C3 | f2 (sp) and f3 (dmg) change only skill points, by -1 | `TestUnlock_NonHPBonusChangesOnlyPoints` PASS | `api/internal/skills/skills_test.go:115` `after["skill_points"] != before["skill_points"]-1`; `:120` `reflect.DeepEqual(before, after)` over the whole row minus skill_points | PASS |
| C4 | f2 without f1, i3 with only i1: 409 skill_locked, no point spent | `TestUnlock_PreviousRequired` PASS | `api/internal/skills/skills_test.go:131` `StatusConflict, "skill_locked"`; `:133` same for i3; `:134` `skill_points != 2` | PASS |
| C5 | f1 again: 409 skill_already_unlocked, no point spent | `TestUnlock_AlreadyUnlocked` PASS | `api/internal/skills/skills_test.go:145` `StatusConflict, "skill_already_unlocked"`; `:146` `skill_points != 2` | PASS |
| C6 | 0 points: 409 no_skill_points, no row | `TestUnlock_NoPoints` PASS | `api/internal/skills/skills_test.go:156` `StatusConflict, "no_skill_points"`; `:157` `env.Count("player_skills"); n != 0` | PASS |
| C7 | x9: 422 unknown_skill | `TestUnlock_UnknownSkill` PASS | `api/internal/skills/skills_test.go:166` `StatusUnprocessableEntity, "unknown_skill"` | PASS |
| C8 | 10 concurrent f1 unlocks with 3 points: one 200, nine 409, 2 points left | `TestUnlock_ConcurrentOnce` PASS | `api/internal/skills/skills_test.go:196` `reflect.DeepEqual(out, want)` with want = 1 x 200 + 9 x 409 skill_already_unlocked; `:199` `skill_points != 2` | PASS |
| C9 | duplicate (player, node) insert fails unique_violation | `TestPlayerSkills_UniquePerNode` PASS | `api/internal/skills/skills_test.go:214` `pgErr.Code != "23505"` | PASS |
| C10 | skills [] (not null) on create and GET /api/me; after b1 then f1, [f1,b1] on unlock, GET /api/me, travel | `TestPlayerSkills_InEveryPlayerInCatalogOrder` PASS | `api/internal/skills/skills_test.go:33` `raw.Player.Skills == nil` rejected; `:225`, `:228` `len(got) != 0`; `:236`, `:239`, `:242` `reflect.DeepEqual(got, want)` with want `[f1 b1]` | PASS |
| C11 | unlock: 401, 404, 500 with request_id log | `TestUnlockRoute_SessionPlayerAndUnexpected` PASS | `api/internal/skills/skills_test.go:250` `StatusUnauthorized, "unauthenticated"`; `:251` `StatusNotFound, "player_not_found"`; `:258` `StatusInternalServerError, "internal"`; `:259` log contains `"request_id":"<id>"` | PASS |
| C12 | skillTrees frontend, backend, infra in order; each node's id, glyph, name, exact description, bonus | `TestCatalog_ServesSkillTrees` PASS | `api/internal/catalog/catalog_test.go:141` `len(b.SkillTrees) != 3`; `:146` `tr.ID != w.id OR tr.Name != w.name OR len(tr.Nodes) != 3`; `:153` `got != wn` (id, glyph, name, bonus type and amount); `:156` `n.Description != descriptions[wn[0]]` with the 9 literal strings at `:111-115` | PASS |
| C13 | 3 trees in catalog order, 3 nodes each with glyph, name, description | vitest `renders trees in catalog order` PASS | `web/src/components/SkillsScene.test.tsx:28` `toEqual(["FRONTEND", "BACKEND", "INFRA"])`; `:31` node ids in order; `:33-35` `toHaveTextContent(n.glyph / n.name / n.description)` | PASS |
| C14 | skills [f1]: node states | vitest `marks node states` PASS | `web/src/components/SkillsScene.test.tsx:43` `toEqual({ f1: "ATIVA", f2: "1 PT", f3: "BLOQ.", b1: "1 PT", b2: "BLOQ.", ... i1: "1 PT", ... })` | PASS |
| C15 | 3 points: `PONTOS: 3` | vitest `shows points` PASS | `web/src/components/SkillsScene.test.tsx:50` `getByText("PONTOS: 3")` | PASS |
| C16 | bonus band sums; empty +0 | vitest `sums active bonus` (3 cases) PASS | `web/src/components/SkillsScene.test.tsx:55` `"bônus ativo: +20 HP · +18 SP · +12% dano"`; `:56` `"+0 HP · +0 SP · +0% dano"`; `:60` `getByText(text)` | PASS |
| C17 | click API REST: POST b1/unlock, player passed to HUD, message | vitest `unlock calls api and reports` PASS | `web/src/components/SkillsScene.test.tsx:69` `toHaveTextContent("> API REST desbloqueada · +10 HP máximo permanente")`; `:70` `setPlayer toHaveBeenCalledWith(updated)`; `:71` `f.calls("POST /api/me/skills/b1/unlock")).toBe(1)` | PASS |
| C18 | 409 message, no body, network: message shown, states unchanged, no setPlayer | vitest `unlock error shows message` (3 cases) PASS | `web/src/components/SkillsScene.test.tsx:84` `toHaveTextContent(text)`; `:85` `states()).toEqual(before)`; `:86` `setPlayer).not.toHaveBeenCalled()` | PASS |
| C19 | pending: all 9 nodes disabled | vitest `disables nodes while unlocking` PASS | `web/src/components/SkillsScene.test.tsx:95` `toHaveLength(9)`; `:96` `toBeDisabled()` | PASS |
| C20 | ATIVA and BLOQ. disabled, no api call | vitest `only available nodes are clickable` PASS | `web/src/components/SkillsScene.test.tsx:104` `toBeDisabled()`; `:108` `f.fn).not.toHaveBeenCalled()` | PASS |
| C21 | chips in catalog order, or `nenhuma habilidade equipada` | vitest `lists active skills` + `(none)` PASS | `web/src/components/SkillsScene.test.tsx:114` `textContent).toBe("</>MARKUP$_API")`; `:119` `getByText("nenhuma habilidade equipada")` | PASS |
| C22 | HUD SKILL PTS: `</>$_` for [f1,b1], `sem habilidades ativas` for [] | vitest `shows active skill glyphs` (2 cases) PASS | `web/src/components/Hud.test.tsx:46` `textContent).toBe(text)` with `"</>$_"` (`:40`); `:47` `getByText(text)` with `"sem habilidades ativas"` (`:41`); GameShell wiring `web/src/components/GameShell.test.tsx:132` `toHaveTextContent("</>")` | PASS |
| C23 | mocked catalog f1 = HTML PURO +99 HP is shown | vitest `tree comes from catalog` PASS | `web/src/components/SkillsScene.test.tsx:130` `toHaveTextContent("HTML PURO")`; `:131` `getByText("bônus ativo: +99 HP · +0 SP · +0% dano")` | PASS |
| C24 | /skills renders the scene, not EM BREVE | vitest `skills page renders the scene` PASS | `web/src/components/SkillsScene.test.tsx:141` `getByText("ÁRVORE DE HABILIDADES")`; `:142` `queryByText("EM BREVE")).not.toBeInTheDocument()` | PASS |
| C25 | browser: unlock MARKUP, ATIVA, PONTOS 0, HP 110/110, `</>`, survives reload | playwright `unlock persists` PASS | `web/e2e/skills.spec.ts:13` `toHaveAttribute("data-state", "ATIVA")`; `:14` `PONTOS: 0`; `:16` `toContainText("HP 110/110")`; `:17` `toHaveText("</>")`; `:20` `page.reload()` then re-check | PASS |
| C26 | unlock waits on the player row lock and reads the committed points | `TestUnlock_SerializesOnPlayerRowLock` PASS | `api/internal/skills/skills_test.go:282` fails if it answers while locked; `:293` `code != http.StatusOK` after the commit that granted the point | PASS |
| C27 | own layer: SkillPosition 0..8 for f1..i3, 9 for unknown; SortSkills orders `[i3 zz b1 f2 f1]` as `[f1 f2 b1 i3 zz]` | `TestCatalog_SkillPosition`, `TestSortSkills` PASS | `api/internal/catalog/catalog_test.go:167` `c.SkillPosition(id); got != i` over the 9 ids in order; `:171` `c.SkillPosition("zz"); got != 9`; `api/internal/player/devname_test.go:66` want `[]string{"f1", "f2", "b1", "i3", "zz"}`, `:68` `p.Skills[i] != want[i]` | PASS |
| C28 | skills table unavailable: GET /api/me 500 internal with request_id log | `TestMe_SkillsLoadError` PASS | `api/internal/skills/skills_test.go:305` renames `player_skills`; `:309` `mustStatus(t, rec, http.StatusInternalServerError, "internal")`; `:310` log contains `"request_id":"<id>"` | PASS |
| C29 | node INSERT fails: unlock 500 internal, player unchanged | `TestUnlock_InsertError` PASS | `api/internal/skills/skills_test.go:321-322` BEFORE INSERT trigger raising; `:329` `StatusInternalServerError, "internal"`; `:330` `reflect.DeepEqual(before, after)` over the player row | PASS |

## Coverage

Verified at 93506c0 for the rows the fix touched: skill ordering, error paths, catalog node fields and the HUD guard. The other rows are carried from 3b32f30, because no production file changed and their authority is untouched.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| unlock statuses (6) - carried from 3b32f30 | `api/internal/skills/skills.go:25-57`, router, `httpx/errors.go:39-42` | 200 C1 · 401 C11 · 404 C11 · 409 C4, C5, C6 · 422 C7 · 500 C11, C29 | - |
| unlock guards in handler (5 rows) - carried from 3b32f30 | `skills.go:26,30,33,36,43` | unknown C7 · already C5 · previous missing C4 · first node C1 · previous present C2, C3 · 0 points C6 · hp bonus C2 · non-hp C3 | - |
| new error codes (4) - carried from 3b32f30 | `httpx/errors.go:39-42` | skill_locked C4 · skill_already_unlocked C5 · no_skill_points C6 · unknown_skill C7 | - |
| skill nodes (9) - carried from 3b32f30 | prototype `treeData` (`docs/DevServer RPG.html:382`) | C12, table-driven over all 9 (`catalog_test.go:137-139`) | - |
| catalog node fields (5) - verified at 93506c0 | Landing door 3 and prototype | id, glyph, name, bonus.type, bonus.amount at `catalog_test.go:153` · description by exact value at `catalog_test.go:156` (all 9 match the prototype strings) | - |
| bonus types (3) - carried from 3b32f30 | `skills.json` | hp C2 · sp C3 · dmg C3 | - |
| HP nodes (3) - carried from 3b32f30 | `skills.json` | f1, b1, i2 C2 | - |
| skill ordering decision (2 rows) - verified at 93506c0 | `api/internal/player/player.go:125-130`, `api/internal/catalog/catalog.go:173-184` | known id by catalog position: C27 own layer, C10 boundary · unknown id sorts last: C27 (`catalog_test.go:171`, `devname_test.go:66`) | - |
| routes returning `player` with `skills` (4) - carried from 3b32f30 | router | POST /api/players, GET /api/me, POST /api/me/travel, unlock: C10 | - |
| error paths added by this feature (3) - verified at 93506c0 | `player.go:106-107` (Get loadSkills), `player.go:147-149` (WithLocked loadSkills), `skills.go:39-41` (INSERT) | Get loadSkills: C28 (fault F2 killed) · WithLocked loadSkills: C11 · INSERT: C29 (outcome asserted, and swallowing the error is equivalent, see Faults) | - |
| HUD SKILL PTS display branches (3) - verified at 93506c0 | `web/src/components/Hud.tsx:47`, `:61-72` | with skills C22 · empty C22 · no catalog `Hud.test.tsx:50-56` (fault F5 killed) | - |
| node states on screen (3) - carried from 3b32f30 | `SkillsScene.tsx:45-49` | ATIVA, 1 PT, BLOQ. C14 | - |
| unlock outcomes on screen (4) - carried from 3b32f30 | `SkillsScene.tsx:23-29` | 200 C17 · error with message, no body, network C18 | - |
| active-skill displays (4) - carried from 3b32f30 | `SkillsScene.tsx:78-87`, `Hud.tsx:61-72` | scene C21 (2) · HUD C22 (2) | - |
| Landing doors (6) - carried from 3b32f30 | plan Landing | 1 C9 · 2 C2, C3 · 3 C12 · 4 C10, C27 · 5 C4-C7 · 6 C1 | - |
| entities (1) - carried from 3b32f30 | plan Relations | PlayerSkill C9 | - |

The checks note that "`GET /api/me` statuses 401/404 are untouched and the 500 gained a cause, proven by C28". That note now matches the code. F2 shows C28 is the proof that fails when `Get` drops the load error.

Notes that do not fail the gate:

- The no-catalog HUD test at `Hud.test.tsx:50` is not selected by any check's `Proof:` command. C22's `-t "shows active skill glyphs"` does not match it, although the checks' Coverage row credits it to C22. It ran and passed in the batched vitest run above. Folding it into C22's pattern would keep the attribution honest.
- That test asserts that a HUD without a catalog shows neither glyphs nor `sem habilidades ativas`. Read literally, AC 18 always asks for one of the two. The state cannot be reached in the app: `GameShell` renders `Hud` with a player only in the `ready` state, whose type always carries `catalog` (`web/src/components/GameShell.tsx:18`, `:89`). So this is not a contradiction of reachable behaviour.
- The checks' `Test policy` evidence line still says `player.skills` ordering is proven at "boundary C10". C27 now adds the own-layer proof, but that line was not updated.

## Test policy rows

Verified at 93506c0 for the round-1 unmet or partly-met rows and for the rows that classify touched files. The other rows are carried from 3b32f30.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (unlock rule) - carried from 3b32f30 | `api/internal/skills/skills.go:23-58`, `catalog.go` `Skill` | boundary C1-C8, C11, C26, C29 through `NewRouter` | yes |
| Decides, reached across a boundary (skill ordering) - verified at 93506c0 | `api/internal/player/player.go:125-130` (`SortSkills`), `api/internal/catalog/catalog.go:173-184` (`SkillPosition`) | boundary C10 AND own layer | yes. C27 own layer covers both functions, including the unknown-id-last row (F3 killed by both tests), and C10 is the boundary |
| Decides, not reached across a boundary (web) - verified at 93506c0 | `web/src/components/SkillsScene.tsx`, `web/src/components/Hud.tsx:47,61-72` | own layer | yes. SkillsScene C13-C24 · `ActiveSkillGlyphs` C22 · `catalog &&` false branch `Hud.test.tsx:50-56` (F5 killed) |
| Entry point that decides nothing - verified at 93506c0 | `GET /api/catalog`, `GET /api/me` read path (`player.go:101-108`) | boundary | yes. C12 asserts every field by value, including the descriptions (F4 killed). C28 asserts the new `GET /api/me` 500 cause (F2 killed) |
| Instrumentation, pass-throughs - carried from 3b32f30 | `router.go`, `httpx/errors.go`, `types.ts`, `helpers.ts`, `skills/page.tsx`, `GameShell.tsx:89`, migration | none of its own | yes |

## Faults injected

Verified at 93506c0. I worked in the worktree `/private/tmp/claude-501/-Users-luissoares-Repos-DevServer-1/028d56a0-a5ef-4417-92ad-b44805e91365/scratchpad/wt2` (HEAD 93506c0), with the real `web/node_modules` symlinked in. The real tree's `git status --porcelain` was `?? .claude/` before and after, and the two captures were identical when diffed. The worktree was removed with `git worktree remove --force`, and `git stash` was not used (the stash list is empty). Every mutant passed `go vet` or `tsc --noEmit`, with 0 errors beyond the known `LayoutProps` typegen one.

| Mutation | Location | Killed |
| --- | --- | --- |
| F2 `Get` swallows the loadSkills error (`_ = loadSkills(...)`; `return p, nil`) | `api/internal/player/player.go:107` | yes - C28 `TestMe_SkillsLoadError` FAIL `want 500 internal` |
| F3 `SkillPosition` returns -1 for an unknown id instead of `pos` | `api/internal/catalog/catalog.go:184` | yes - C27 `TestCatalog_SkillPosition` FAIL `SkillPosition(unknown) = -1, want 9` AND `TestSortSkills` FAIL `[zz f1 f2 b1 i3], want [f1 f2 b1 i3 zz]` |
| F4 i3 description `+15% de dano em todos os ataques` changed to `+15% de dano em ataques` | `api/catalog/skills.json:24` | yes - C12 `TestCatalog_ServesSkillTrees` FAIL at `catalog_test.go:157` |
| F5 HUD guard dropped: `ActiveSkillGlyphs` always rendered, with an empty catalog fallback | `web/src/components/Hud.tsx:47` | yes - `Hud > shows no skill section without a catalog` FAIL |

The fifth fault is the equivalent-mutant claim, and I tested it on its own:

| Mutation | Location | Outcome |
| --- | --- | --- |
| F1 unlock swallows the `player_skills` INSERT error (`_, _ = tx.Exec(...)`, no return) | `api/internal/skills/skills.go:39-41` | equivalent: C29 `TestUnlock_InsertError` still PASS, and so do C1, C8 and C10 |

The claim in the checks holds. With the mutant in place, the logged error for the failed unlock was `ERROR: current transaction is aborted, commands ignored until end of transaction block (SQLSTATE 25P02)`. So the swallowed INSERT failure resurfaces in the following `UPDATE players` inside `WithLocked`, and the handler still answers `500 internal`. The row lock serialises unlocks (C26), so no path lets a failed INSERT be followed by a successful UPDATE in the same transaction. There is no observable behaviour for an assertion to catch, so this is not a surviving mutant.

## Suites

Verified at 93506c0.

| Command | Exit |
| --- | --- |
| `cd api && go test -count=1 ./...` | 0 (auth, catalog, deploy, httpx, player, skills, world all ok) |
| `cd web && npx vitest run` | 0 (11 files, 116 tests) |
| `cd web && npx eslint` | 0 |
| `cd web && npx tsc --noEmit` | 0 |
| `cd web && npx playwright test` | 0 (5 passed) |
| `make ci-build` | 0 |
| `make check-deps` | 0 (`deps ok`) |

## Gate

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py skills` - exit 0:

    validate_verification: 0 error(s), 0 warning(s) across [skills]
