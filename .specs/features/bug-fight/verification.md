# Bug fight verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 6a7dddc..c87dfa96664a8b699be921cd6e9bb3c6c83fc90e
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

This round re-ran all 55 proofs at HEAD c87dfa9. Each one has a located assertion and passes, and every whole suite exits 0. The fix diff d5d4ccc..c87dfa9 changes only tests and specs: `battle_test.go`, `BattleScene.test.tsx`, `checks.md` and `plan.md`. No production code changed.

Round-1 gaps 1 to 4 are closed:

- F3 and F5 are now killed.
- C31 asserts `item.item`.
- Landing 1a amends door 1.
- The round-1 notes on C42, door 3 and door 4 are resolved.

The feature still fails, for two reasons:

- **The "equivalent mutant" claim in `checks.md` does not hold.** I made `player.WithLocked` swallow the inventory-load error. The whole api suite stayed green, but behaviour changed in two ways:
  - `POST /api/me/skills/f1/unlock` with 0 skill points and `player_items` unavailable answers `409 no_skill_points` instead of `500 internal`.
  - On every `WithLocked` route, the logged cause changes from the real error (`relation ... does not exist`) to `25P02 current transaction is aborted`.

  A 500 is only guaranteed on routes whose callback runs a statement before any guard. C55 picked one of those routes (travel), so it cannot see the difference.
- **Door 4a has no proof of its own.** `rules.startingItems` is supposed to come from the catalog and be served in `combat`. C34 only asserts the resulting inventory. No test reads `startingItems`, and C37's decode struct leaves it out.

## Binding sources

Carried from d5d4ccc. The fix diff did not touch the interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only and the profile is `standard` | - | - |

## Checks

Verified at c87dfa9. All proofs ran again in full, in three batched invocations:

- **api:** `cd api && go test -count=1 -v ./internal/battle ./internal/catalog -run '^(TestStart_ OR TestGet_ OR TestCommand_ OR TestTurn_ OR TestRules_ OR TestVictory_ OR TestDefeat_ OR TestItem_ OR TestInventory_ OR TestMigration_ OR TestTables_ OR TestRoutes_ OR TestCatalog_ServesCombat$ OR TestCreatePlayer_StartingItemsFailureRollsBack$ OR TestLockedMutation_InventoryLoadError$)'`. The regex alternation is written here as OR. Exit 0. All 45 named tests appear individually as `--- PASS`, including `TestCreatePlayer_StartingItemsFailureRollsBack` and `TestLockedMutation_InventoryLoadError`, with C25 covering 4 `TestRules_*`.
- **web:** `cd web && npx vitest run src/components/BattleScene.test.tsx src/components/ComingSoon.test.tsx --reporter=verbose` - exit 0, 19 passed. Every `-t` pattern for C41-C52 appears as a passing test.
- **e2e:** `cd web && npx playwright test` - exit 0, 6 passed, including `e2e/battle.spec.ts:5:5 fight to victory`.

Citations:

- `api/internal/battle/battle_test.go` lines 1-639 did not change in the fix, so those citations are carried from d5d4ccc and still hold. Line 643 was edited in place (C31), and C54 and C55 were appended at lines 877-903.
- `web/src/components/BattleScene.test.tsx` gained 3 lines after line 54. I refreshed every web citation below.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | vila start: 200, 60/60, 50/50, active, weakness false, player | `TestStart_CreatesBattle` PASS | `api/internal/battle/battle_test.go:147-148` `*got.Battle != want` with want `{vila 60 60 50 50 false active}`; `:151` `got.Player.HPMax != 100` | PASS |
| C2 | active same region resumes at 40/60 | `TestStart_ResumesActiveBattle` PASS | `api/internal/battle/battle_test.go:163` `got.Battle.EnemyHP != 40 OR got.Battle.EnemyHPMax != 60` | PASS |
| C3 | travel swaps to LOG WISP 70/70; after win a fresh enemy | `TestStart_ReplacesOtherRegionOrWonBattle` PASS | `api/internal/battle/battle_test.go:174` `Region != "floresta" OR EnemyHP != 70 OR EnemyHPMax != 70`; `:180` `Status != "active" OR EnemyHP != 70` | PASS |
| C4 | floresta SP max 55 / 63 / 81 | `TestStart_SPMaxIncludesSkillBonus` PASS | `api/internal/battle/battle_test.go:190` cases; `:194` `got.SPMax != tc.spMax OR got.SP != tc.spMax` | PASS |
| C5 | GET 200 current, 404 battle_not_found without | `TestGet_CurrentOrNotFound` PASS | `api/internal/battle/battle_test.go:203` `f.status(..., 404, "battle_not_found")`; `:206` `rec.Code != 200`; `:209` `b.EnemyHP != 60` | PASS |
| C6 | each of 6 regions gets its enemy HP/SP | `TestStart_EveryRegionEnemy` PASS | `api/internal/battle/battle_test.go:217` map over all 6; `:220` `b.Region != region OR b.EnemyHP != hpsp[0] OR b.SPMax != hpsp[1]` | PASS |
| C7 | FIX draw 6/0: enemy 40, SP 45, HP 93 | `TestCommand_DamageCostCounterRegen` PASS | `api/internal/battle/battle_test.go:230` `Push(6, 0)`; `:232` `EnemyHP != 40 OR SP != 45 OR HP != 93` | PASS |
| C8 | TEST then FIX 20 = 36 weakness true; next 20 false | `TestCommand_WeaknessMultipliesOnce` PASS | `api/internal/battle/battle_test.go:244` `e.Amount != 36 OR !e.Weakness`; `:249` `e.Amount != 20 OR e.Weakness` | PASS |
| C9 | f3 10%: 22; with weakness 40 | `TestCommand_DamageBonusFromSkills` PASS | `api/internal/battle/battle_test.go:262` `e.Amount != 22`; `:267` `e.Amount != 40` | PASS |
| C10 | REFACTOR +18, capped at 100 | `TestCommand_HealCapped` PASS | `api/internal/battle/battle_test.go:278` `HP != 50+18-7`; `:283` `HP != 100-7` | PASS |
| C11 | shield 14 -> 7, 13 -> 7; next turn 14 | `TestCommand_ShieldHalvesOneCounter` PASS | `api/internal/battle/battle_test.go:292` `{7: 7, 6: 7}`; `:296` `c.Amount != want OR !c.Blocked`; `:302` `c.Amount != 14 OR c.Blocked` | PASS |
| C12 | PLAIN 40 -> 48; 49 -> 50 | `TestCommand_PlainRestoresSPCapped` PASS | `api/internal/battle/battle_test.go:313` `Events[1].Type != "sp" OR Amount != 3 OR SP != 48`; `:317` `SP != 50` | PASS |
| C13 | counter draw 0 = 7, draw 7 = 14; regen capped | `TestCommand_CounterRange` PASS | `api/internal/battle/battle_test.go:326` `{0: 7, 7: 14}`; `:330`; `:335` `SP != 50` | PASS |
| C14 | events order per base command with fields | `TestCommand_EventsInOrder` PASS | `api/internal/battle/battle_test.go:345-350` want table; `:354` `reflect.DeepEqual(types(got.Events), want[id])`; `:357`, `:360`, `:363` fields | PASS |
| C15 | SP 5 and 9: 409 not_enough_sp, unchanged; SP 10 plays -> 5 | `TestCommand_NotEnoughSP` PASS | `api/internal/battle/battle_test.go:376` `409, "not_enough_sp"`; `:377` `after != before`; `:382` `SP != 5` | PASS |
| C16 | f1 locked 409 command_locked; unlocked 200 | `TestCommand_SkillCommandNeedsSkill` PASS | `api/internal/battle/battle_test.go:391` `409, "command_locked"`; `:393` `f.turn` fatals unless 200 (`:112`) | PASS |
| C17 | hadouken 422 unknown_command | `TestCommand_Unknown` PASS | `api/internal/battle/battle_test.go:400` `422, "unknown_command"` | PASS |
| C18 | no battle: commands and items 404 | `TestTurn_NoBattle` PASS | `api/internal/battle/battle_test.go:406-407` `404, "battle_not_found"` | PASS |
| C19 | won: commands and items 409 battle_over | `TestTurn_BattleOver` PASS | `api/internal/battle/battle_test.go:416-417` `409, "battle_over"` | PASS |
| C20 | ROLLBACK: battle null, fled, no counter or reward; GET 404 | `TestCommand_RollbackEndsBattle` PASS | `api/internal/battle/battle_test.go:425`; `:428` `404, "battle_not_found"` | PASS |
| C21 | client damage/hp ignored | `TestCommand_IgnoresClientNumbers` PASS | `api/internal/battle/battle_test.go:436` body; `:437` `Amount != 14 OR EnemyHP != 46 OR HP != 93` | PASS |
| C22 | 3 concurrent FIX: 18, SP 35, HP 79 | `TestCommand_ConcurrentTurnsSerialize` PASS | `api/internal/battle/battle_test.go:459` codes `[200 200 200]`; `:463` `EnemyHP != 18 OR SP != 35 OR HP != 79` | PASS |
| C23 | 9 skill commands | `TestCommand_EverySkillCommand` PASS | `api/internal/battle/battle_test.go:478-480`; `:494`; `:500`; `:504`; `:507`; `:510` | PASS |
| C24 | base costs 10/8/14/0/0 | `TestCommand_BaseCosts` PASS | `api/internal/battle/battle_test.go:524`; `:529` `SP != 30-cost+gain+5`; `:533-534` | PASS |
| C25 | own layer rounding and SP bounds | `TestRules_*` (4) PASS | `api/internal/battle/rules_test.go:30` `{14: 25, 15: 27, 17: 31, 20: 36}`; `:44` `{25, 10, 28}`; `:54` `{7: 4, 8: 4, 13: 7, 14: 7}`; `:69`; `:79`; `:85` | PASS |
| C26 | enemy 10 -> 0: won, reward, events | `TestVictory_CreditsReward` PASS | `api/internal/battle/battle_test.go:544`; `:547`; `:550` reward `90/40/1`; `:553` | PASS |
| C27 | XP 450 -> level 2, 40/750, levelsGained 1 | `TestVictory_LevelsUpThroughGainXP` PASS | `api/internal/battle/battle_test.go:566` | PASS |
| C28 | drop 64 adds null_shard, 65 does not | `TestVictory_DropChanceBoundary` PASS | `api/internal/battle/battle_test.go:582` `{64: 1, 65: 0}`; `:588`; `:591` | PASS |
| C29 | potion 29 adds sp_potion, 30 does not | `TestVictory_PotionChanceBoundary` PASS | `api/internal/battle/battle_test.go:599` `{29: 3, 30: 2}`; `:604` | PASS |
| C30 | HP 7 vs 7 respawn at vila; HP 8 -> 1 | `TestDefeat_RespawnAtVila` PASS | `api/internal/battle/battle_test.go:617`; `:620`; `:623`; `:629` | PASS |
| C31 | sp_potion 2 -> 1, event `item` item=sp_potion stat=sp amount=30, +30 capped, counter; hp_potion +40 capped | `TestItem_PotionsRestoreAndCostTurn` PASS | `api/internal/battle/battle_test.go:640` `qty != 1 OR SP != 45 OR HP != 93`; `:643` `types != [item counter] OR Events[0].Item != "sp_potion" OR Stat != "sp" OR Amount != 30`; `:647` `SP != 50`; `:652` `HP != 30+40-7 OR qty != 1`; `:656` `HP != 100-7` | PASS |
| C32 | hp_potion with none: 409 no_item, unchanged | `TestItem_NoItem` PASS | `api/internal/battle/battle_test.go:666`; `:667` | PASS |
| C33 | null_shard and x: 422 unknown_item | `TestItem_UnknownOrNotUsable` PASS | `api/internal/battle/battle_test.go:676-677` | PASS |
| C34 | new player inventory in POST /api/players and GET /api/me; order; 0 dropped | `TestInventory_InEveryPlayer` PASS | `api/internal/battle/battle_test.go:691` POST `DeepEqual(*got, want)` with want `[{item sp_potion quantity 2}]` (`:689`); `:694` GET; `:705`; `:713` | PASS |
| C35 | pre-00004 player gets 2 sp_potion | `TestMigration_GivesExistingPlayersPotions` PASS | `api/internal/battle/battle_test.go:741`; `:753`; `:757` `qty != 2` | PASS |
| C36 | CHECK and unique constraints | `TestTables_Constraints` PASS | `api/internal/battle/battle_test.go:774` `23514`; `:779`, `:782` `23505` | PASS |
| C37 | catalog serves enemies, commands, items, combat | `TestCatalog_ServesCombat` PASS | `api/internal/catalog/catalog_test.go:219`; `:223`; `:236`; `:245`; `:255`; `:263`; `:268-269` | PASS |
| C38 | 4 routes 401/404/500 with request_id; GET /api/me 500 | `TestRoutes_SessionPlayerAndUnexpected` PASS | `api/internal/battle/battle_test.go:801`; `:804`; `:813`; `:817`; `:822` | PASS |
| C39 | invalid_body on both JSON routes | `TestTurn_InvalidBody` PASS | `api/internal/battle/battle_test.go:831-833` | PASS |
| C40 | FIX waits on FOR UPDATE holder | `TestCommand_SerializesOnPlayerRowLock` PASS | `api/internal/battle/battle_test.go:858`; `:861`; `:869` | PASS |
| C41 | opens, POSTs start, shows region/name/level/HP/weakness | `starts and shows the enemy` PASS | `web/src/components/BattleScene.test.tsx:36` `ENCONTRO · VILA LOCALHOST`; `:37-40`; `:41` `calls("POST /api/me/battle")).toBe(1)` | PASS |
| C42 | order; label and hint of every visible command; costs; REFACTOR and MARKUP disabled | `lists commands with costs` PASS | `web/src/components/BattleScene.test.tsx:51` ids `[fix test refactor plain f1 rollback]`; `:53` cost texts; `:54-56` loop over the 6 visible fixture commands `toHaveTextContent(c.label)` and `toHaveTextContent(c.hint)` (fixture labels and hints non-empty, `web/src/test/helpers.ts:52-60`); `:58` refactor, f1 disabled; `:59` others enabled | PASS |
| C43 | hero bars, potions, click posts sp_potion | `shows hero bars and potions` PASS | `web/src/components/BattleScene.test.tsx:72-73`; `:74-75`; `:76` disabled; `:80` `toEqual({ item: "sp_potion" })` | PASS |
| C44 | every event type -> pt-BR line; log keeps 6 | `writes events to the log` PASS | `web/src/components/BattleScene.test.tsx:85-101` cases; `:112` `toBe(text)`; `:114` `toHaveLength(6)` | PASS |
| C45 | turn passes player to HUD, updates bars | `turn updates player and battle` PASS | `web/src/components/BattleScene.test.tsx:126` `HP 40/60`; `:127` `SP 45/50`; `:128` `toHaveBeenLastCalledWith(after)` | PASS |
| C46 | won: RESOLVIDO, NOVO ENCONTRO restarts | `won shows RESOLVIDO and new encounter` PASS | `web/src/components/BattleScene.test.tsx:138`; `:139-140`; `:142`; `:143`; `:144` `toBe(2)` | PASS |
| C47 | ended: ENCONTRO ENCERRADO and NOVO ENCONTRO | `ended shows new encounter` (2) PASS | `web/src/components/BattleScene.test.tsx:155`; `:156`; `:157`; `:159` | PASS |
| C48 | pending turn disables actions | `disables actions while a turn is pending` PASS | `web/src/components/BattleScene.test.tsx:167` every `[data-command], [data-item]` `toBeDisabled()` | PASS |
| C49 | turn errors go to the log, state unchanged | `turn error goes to the log` (3) PASS | `web/src/components/BattleScene.test.tsx:172-174` texts; `:182` `findByText(text)`; `:183-184`; `:185` `setPlayer` not called | PASS |
| C50 | CARREGANDO...; failure and retry | `loading and load failure` (3) PASS | `web/src/components/BattleScene.test.tsx:193`; `:202`; `:205` `toBe(2)` | PASS |
| C51 | catalog-driven names | `enemy and commands come from catalog` PASS | `web/src/components/BattleScene.test.tsx:217` `BUG DE TESTE`; `:218` `PATCH`; `:219` | PASS |
| C52 | /bug-fight renders the scene | `bug-fight page renders the scene` PASS | `web/src/components/BattleScene.test.tsx:230`; `:231` `EM BREVE` absent | PASS |
| C53 | browser fight to RESOLVIDO, HUD 90/500 | `e2e/battle.spec.ts:5:5 fight to victory` PASS | `web/e2e/battle.spec.ts:22`; `:23`; `:24` `toContainText("90/500")` | PASS |
| C54 | starting-item write fails: POST /api/players 500 internal, no player stored | `TestCreatePlayer_StartingItemsFailureRollsBack` PASS | `api/internal/battle/battle_test.go:882` trigger rejects every `player_items` INSERT; `:884` `f.status(rec, 500, "internal")`; `:885` `env.Count("players") != 0` | PASS |
| C55 | inventory unavailable: POST /api/me/travel 500 internal, request_id logged, player unchanged | `TestLockedMutation_InventoryLoadError` PASS | `api/internal/battle/battle_test.go:895` `f.status(rec, 500, "internal")`; `:896` log contains `"request_id":"<id>"`; `:900` `region != "vila"`. The claim as written holds. The note in `checks.md` that this makes the swallow mutant equivalent is wrong: see Faults | PASS |

Every test cited above was added in 6a7dddc..HEAD. C54 and C55 are new in d5d4ccc..HEAD.

## Coverage

Rows the fix touched are verified at c87dfa9. Every other row is carried from d5d4ccc with the same members and proofs; see the round-1 table in git history at c87dfa9:.specs/features/bug-fight/verification.md.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/players` statuses (5) (verified at c87dfa9) | plan Surface row added in the fix; `api/internal/player/handlers.go:67-81` | 201 with inventory C34 `battle_test.go:691` · 500 on starting-item write C54 `:884-885` · 401, 409, 422 existing foundation proofs `api/internal/player/player_test.go:84`, `:108`, `:116`, `:136` (unchanged by this feature) | - |
| player creation transaction (1) (verified at c87dfa9) | plan Impact; `api/internal/player/handlers.go:85-104` | rollback of the player row when items fail C54 `:885`; F3 killed | - |
| `WithLocked` callers under inventory-load failure (6 routes) (verified at c87dfa9) | `rg -n "WithLocked\("`: `battle/handlers.go:87`, `:120`, `deploy/deploy.go:88`, `:143`, `world/travel.go:29`, `skills/skills.go:29`; loader `player/player.go:199-201` | travel 500 C55 · battle routes reach 500 because `turn` and `Start` run `load` first (`battle/handlers.go:88`, `:122`) · error propagation itself: no proof | propagation of the `loadInventory` error at `player/player.go:199-201`. Swallowing it survives: skills unlock with 0 points answers `409 no_skill_points` instead of `500`, and the logged cause becomes `25P02` (F7) |
| door 5 `item` event fields (3) (verified at c87dfa9) | Landing door 5; `api/internal/battle/rules.go:122` | item C31 `:643` · stat C31 `:643` · amount C31 `:643`; F6 killed | - |
| command button contents, AC 31 (4) (verified at c87dfa9) | AC 31; `web/src/components/BattleScene.tsx:122-123` | label C42 `:55` (all 6 visible, incl. `</> MARKUP`; F9 killed) · hint C42 `:56` (F5 killed) · cost C42 `:53` · disabled C42 `:58-59` | - |
| Landing doors (10) (verified at c87dfa9) | plan Landing incl. 1a, 3a, 4a | 1 C36 · 1a no shield column in `api/migrations/00004_battle_inventory.sql:12-21` and no field in `State` `api/internal/battle/rules.go:18-26`, per-turn shield C11 · 2 C36 · 3 C7 · 3a `rules.go:14` `IntN(n int) int`, exercised by every Go proof through `apptest` · 4 C37 · 4a outcome only, C34 · 5 C14, C31 · 6 C15 and the error-code row · 7 C1 | door 4a `combat.startingItems`: nothing asserts that `GET /api/catalog` serves it or that creation reads the quantity from the catalog. `rg -n startingItems` finds only `api/catalog/combat.json:44` and `api/internal/catalog/catalog.go:115`, and C37's decode struct `api/internal/catalog/catalog_test.go:198-206` omits it. A creation path that hardcodes `sp_potion` x2 still passes C34 |
| `GET /api/me/battle` statuses (4) (carried from d5d4ccc) | plan Surface | 200 C5 · 401 C38 · 404 C5, C38 · 500 C38 | - |
| `POST /api/me/battle` statuses (4) (carried from d5d4ccc) | plan Surface | 200 C1 · 401 C38 · 404 C38 · 500 C38 | - |
| `POST /api/me/battle/commands` statuses (6) (carried from d5d4ccc) | plan Surface | 200 C7 · 401 C38 · 404 C18 · 409 C15, C16, C19 · 422 C17, C39 · 500 C38 | - |
| `POST /api/me/battle/items` statuses (6) (carried from d5d4ccc) | plan Surface | 200 C31 · 401 C38 · 404 C18 · 409 C19, C32 · 422 C33, C39 · 500 C38 | - |
| regions x enemies (6) (carried from d5d4ccc) | `api/catalog/combat.json:3-8` | C6, C37 | - |
| skill commands (9), base commands (5), command effects (6) (carried from d5d4ccc) | `combat.json:11-24`; `rules.go` | C23 · C24 · C7, C8, C10, C11, C12, C20 | - |
| new error codes (7) (carried from d5d4ccc) | Landing door 6 | C5, C19, C15, C16, C32, C17, C33 | - |
| rounding points (3), chance boundaries (4), defeat boundary (2) (carried from d5d4ccc) | `rules.go` | C25 · C28, C29 · C30 | - |
| `Battle` states (4), usable/unusable items (4), API event types (12) (carried from d5d4ccc) | door 1; `handlers.go:188`; door 5 | C1, C2, C26, C20, C30 · C31, C33 · C7, C11-C14, C20, C26, C28, C30, C31 | - |
| door 2 PlayerItem rules (3), door 4 catalog fields (carried from d5d4ccc) | Landing doors 2, 4 | C36, C34 · C37 | - |
| potion buttons (3), event types on screen (14), screen states (6), turn outcomes on screen (4) (carried from d5d4ccc) | `BattleScene.tsx`, `battleLog.ts` | C43 · C44 · C41, C46-C48, C50 · C45, C49 | - |
| startup config: rand (2 assemblies) (carried from d5d4ccc) | `api/cmd/api/main.go:53`; `api/internal/apptest/apptest.go:116` | read directly; C7 | - |

## Test policy rows

Verified at c87dfa9 for the rows classifying touched or previously unmet files. The rest are carried from d5d4ccc.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Entry point that decides nothing (verified at c87dfa9) | `api/internal/player/handlers.go` `Create` / `insert` | accepted input C34 · each error path: starting-item 500 and rollback C54, foundation 409/422 | yes - C54 closes the round-1 miss, F3 killed |
| Decides, reached across a boundary (verified at c87dfa9) | `api/internal/player/player.go` (`WithLocked` inventory load, `AddItem`, `loadInventory`, `Quantity`) | boundary C28, C31, C34, C36, C55 | partly - C55 covers one guard-free route, but the load-error propagation survives F7, so this row is not fully met |
| Decides, reached across a boundary (carried from d5d4ccc) | `api/internal/battle/rules.go` | own layer C25 · boundary C7-C31 | yes |
| Decides, reached across a boundary (carried from d5d4ccc) | `api/internal/battle/handlers.go` guards | boundary C15-C19, C32, C33 | yes |
| Decides, not reached across a boundary (carried from d5d4ccc) | `web/src/lib/battleLog.ts` | own layer C44 | yes |
| Decides, not reached across a boundary (verified at c87dfa9) | `web/src/components/BattleScene.tsx` | screen level C41-C52 · browser C53 | yes - label and hint now asserted (F5, F9 killed) |
| Instrumentation, pass-throughs (carried from d5d4ccc) | `catalog.go` accessors, `apptest.go`, `db.go`, `router.go`, `types.ts` | consumers C1-C40 | yes |

## Faults injected

Verified at c87dfa9. Setup:

- Every fault ran in a `git worktree add --detach` scratch at HEAD, under `/private/tmp/claude-501/-Users-luissoares-Repos-DevServer-1/028d56a0-a5ef-4417-92ad-b44805e91365/scratchpad/wt`.
- The real `web/node_modules` was symlinked in. For `tsc`, `next-env.d.ts` and `.next/types` were copied in.
- The real tree's `git status --porcelain` read `?? .claude/` before and after, and the two were identical.
- `git stash` was never used (`git stash list` is empty). The worktree was removed with `git worktree remove --force`.
- Each mutant passed `go vet` or `tsc --noEmit` with exit 0.

| Mutation | Location | Killed |
| --- | --- | --- |
| F3 (round-1 survivor) - commit the player transaction, then insert the starting items in a new transaction | `api/internal/player/handlers.go:97-98` | yes - `TestCreatePlayer_StartingItemsFailureRollsBack` FAIL at `battle_test.go:886` (`players = 1, want 0`) |
| F5 (round-1 survivor) - command button drops the hint and shows only the cost | `web/src/components/BattleScene.tsx:123` | yes - `lists commands with costs` FAIL |
| F6 - `item` event carries `Item: res.Stat` instead of `it.ID` | `api/internal/battle/rules.go:122` | yes - `TestItem_PotionsRestoreAndCostTurn` FAIL at `battle_test.go:644` (`Item:sp`) |
| F9 - skill commands show `c.id.toUpperCase()` instead of `c.label` (`</> MARKUP` becomes `F1`) | `web/src/components/BattleScene.tsx:122` | yes - `lists commands with costs` FAIL |
| F7 - the "equivalent" mutant: `_ = loadInventory(ctx, tx, p)` swallows the error | `api/internal/player/player.go:199-201` | no - survived C55 and the whole `go test -count=1 ./...`. It is not equivalent. A scratch probe with `skill_points = 0` and `player_items` renamed, calling `POST /api/me/skills/f1/unlock`, answers `500 internal` at HEAD and `409 no_skill_points` under the mutant. On travel, the logged error changes from `relation "player_items" does not exist` to `25P02 current transaction is aborted` |

## Gate

Whole-suite exit codes at c87dfa9:

- `cd api && go test -count=1 ./...` - exit 0 (8 packages ok)
- `cd web && npx vitest run` - exit 0 (12 files, 132 passed)
- `cd web && npx eslint` - exit 0
- `cd web && npx tsc --noEmit` - exit 0
- `cd web && npx playwright test` - exit 0 (6 passed)
- `make ci-build` - exit 0
- `make check-deps` - exit 0 (`deps ok`)

Ranked remaining gaps:

1. **F7 survives, and the "equivalent mutant" note in `checks.md` is false.** Nothing pins that the inventory-load error propagates out of `WithLocked`.
   - Where: `api/internal/player/player.go:199-201`. C55 tests travel only (`api/internal/battle/battle_test.go:891-903`).
   - Two ways to kill it: C55 could assert the logged cause (the `player_items` relation error), or it could add a guard-first route, such as skills unlock with 0 points, that must still answer 500.
2. **Door 4a is unproven at its own surface.** Nothing asserts that `GET /api/catalog` serves `combat.startingItems`, or that creation reads the quantity from the catalog.
   - Where: `api/catalog/combat.json:44`, `api/internal/catalog/catalog.go:115`, `api/internal/player/handlers.go:98`. C37's struct at `api/internal/catalog/catalog_test.go:198-206` omits the field.
   - C34 asserts only the resulting inventory.

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py bug-fight` - exit 1. That is the expected result for a report whose own rows are FAIL:

```
  ERROR bug-fight: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [bug-fight]
```
