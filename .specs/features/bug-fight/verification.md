# Bug fight verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 6a7dddc..ca60cca65f5b8ca5397b9ae8db55020ac0107458
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

This round re-ran all 56 proofs at HEAD ca60cca. Each one ran individually, passed and has a located assertion. Every whole suite exits 0. The fix diff c87dfa9..ca60cca changes one production wiring (`player.Handlers` now takes `Catalog` from `app.Deps`), adds `apptest.NewWithCatalog`, extends C55 and C37, and adds C56.

Both round-2 gaps are closed:

- **F7 is now killed, twice over.** With the swallow mutant in `player.WithLocked`, C55 fails on the logged-cause assertion (`battle_test.go:904`). With that assertion removed, it still fails on the new guard-first route: skills unlock answers `409 no_skill_points` (`battle_test.go:909`). The false "equivalent mutant" note is gone. `checks.md:283` and `:330` now record it as abandoned.
- **Door 4a is proven where it lands.** C37 asserts that `combat.startingItems` = `sp_potion` x 2 is served (`catalog_test.go:274`). C56 changes the catalog and shows creation reads it: a hardcoded starting inventory in `handlers.go` is killed by C56 and by nothing else.

The feature still fails. The last-round sweep of every conditional found two decision branches in `web/src/components/BattleScene.tsx` that have no asserted case, and both mutants survive the whole web suite:

1. **The AC 31 boundary SP == cost is not pinned.** AC 31 says a command is disabled when "o SP atual não paga" it, so SP equal to the cost must stay enabled. Changing `(battle?.sp ?? 0) < c.cost` to `<=` at `BattleScene.tsx:119` passes all 132 vitest tests. C42 uses SP 11 against costs 10 and 12 (`BattleScene.test.tsx:47`), and C53's fight never reaches SP 10.
2. **`NOVO ENCONTRO` is never asserted absent while the fight is active.** The `!active` guard at `BattleScene.tsx:98` has only its true side asserted (C46, C47). Rendering the button unconditionally passes all 132 vitest tests.

## Binding sources

Carried from c87dfa9. The fix diff did not touch the interface or any screen.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only and the profile is `standard` | - | - |

## Checks

Verified at ca60cca. All proofs ran again in full, in batched invocations:

- **api:** `cd api && go test -count=1 -v ./internal/battle ./internal/catalog -run '^(TestStart_ OR TestGet_ OR TestCommand_ OR TestTurn_ OR TestRules_ OR TestVictory_ OR TestDefeat_ OR TestItem_ OR TestInventory_ OR TestMigration_ OR TestTables_ OR TestRoutes_ OR TestCatalog_ServesCombat$ OR TestCreatePlayer_ OR TestLockedMutation_InventoryLoadError$)'`. The regex alternation is written here as OR.
  - Both packages report `ok`.
  - All 46 named tests appear individually as `--- PASS`, including `TestLockedMutation_InventoryLoadError` and the new `TestCreatePlayer_StartingItemsFromCatalog`.
  - C25 covers four tests: `TestRules_WeaknessRounding`, `TestRules_DamageBonusRounding`, `TestRules_ShieldRounding` and `TestRules_SPBounds`.
- **web:** `cd web && npx vitest run src/components/BattleScene.test.tsx src/components/ComingSoon.test.tsx --reporter=verbose` - exit 0, 19 passed. Every `-t` pattern for C41-C52 appears as a passing test.
- **e2e:** `cd web && npx playwright test` - exit 0, 6 passed, including `e2e/battle.spec.ts:5:5 fight to victory`.

Citations:

- **`api/internal/battle/battle_test.go`:** the fix added one import at line 20, so every earlier citation moved by +1. I re-read each cited line at HEAD. C55 and C56 are at lines 892-926.
- **`api/internal/catalog/catalog_test.go`:** 4 lines were added at 206-209, so citations after that point moved by +4.
- **`rules_test.go` and all web files:** untouched by the fix.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | vila start: 200, 60/60, 50/50, active, weakness false, player | `TestStart_CreatesBattle` PASS | `api/internal/battle/battle_test.go:148-149` `*got.Battle != want` with want `{vila 60 60 50 50 false active}`; `:152` `got.Player.HPMax != 100` | PASS |
| C2 | active same region resumes at 40/60 | `TestStart_ResumesActiveBattle` PASS | `api/internal/battle/battle_test.go:164` `got.Battle.EnemyHP != 40 OR got.Battle.EnemyHPMax != 60` | PASS |
| C3 | travel swaps to LOG WISP 70/70; after win a fresh enemy | `TestStart_ReplacesOtherRegionOrWonBattle` PASS | `api/internal/battle/battle_test.go:175` `Region != "floresta" OR EnemyHP != 70 OR EnemyHPMax != 70`; `:181` `Status != "active" OR EnemyHP != 70` | PASS |
| C4 | floresta SP max 55 / 63 / 81 | `TestStart_SPMaxIncludesSkillBonus` PASS | `api/internal/battle/battle_test.go:191` cases; `:195` `got.SPMax != tc.spMax OR got.SP != tc.spMax` | PASS |
| C5 | GET 200 current, 404 battle_not_found without | `TestGet_CurrentOrNotFound` PASS | `api/internal/battle/battle_test.go:204` `f.status(..., 404, "battle_not_found")`; `:207` `rec.Code != 200`; `:210` `b.EnemyHP != 60` | PASS |
| C6 | each of 6 regions gets its enemy HP/SP | `TestStart_EveryRegionEnemy` PASS | `api/internal/battle/battle_test.go:218` map over all 6; `:221` `b.Region != region OR b.EnemyHP != hpsp[0] OR b.SPMax != hpsp[1]` | PASS |
| C7 | FIX draw 6/0: enemy 40, SP 45, HP 93 | `TestCommand_DamageCostCounterRegen` PASS | `api/internal/battle/battle_test.go:231` `Push(6, 0)`; `:233` `EnemyHP != 40 OR SP != 45 OR HP != 93` | PASS |
| C8 | TEST then FIX 20 = 36 weakness true; next 20 false | `TestCommand_WeaknessMultipliesOnce` PASS | `api/internal/battle/battle_test.go:245` `e.Amount != 36 OR !e.Weakness`; `:250` `e.Amount != 20 OR e.Weakness` | PASS |
| C9 | f3 10%: 22; with weakness 40 | `TestCommand_DamageBonusFromSkills` PASS | `api/internal/battle/battle_test.go:263` `e.Amount != 22`; `:268` `e.Amount != 40` | PASS |
| C10 | REFACTOR +18, capped at 100 | `TestCommand_HealCapped` PASS | `api/internal/battle/battle_test.go:279` `HP != 50+18-7`; `:284` `HP != 100-7` | PASS |
| C11 | shield 14 -> 7, 13 -> 7; next turn 14 | `TestCommand_ShieldHalvesOneCounter` PASS | `api/internal/battle/battle_test.go:293` `{7: 7, 6: 7}`; `:297` `c.Amount != want OR !c.Blocked`; `:303` `c.Amount != 14 OR c.Blocked` | PASS |
| C12 | PLAIN 40 -> 48; 49 -> 50 | `TestCommand_PlainRestoresSPCapped` PASS | `api/internal/battle/battle_test.go:314` `Events[1].Type != "sp" OR Amount != 3 OR SP != 48`; `:318` `SP != 50` | PASS |
| C13 | counter draw 0 = 7, draw 7 = 14; regen capped | `TestCommand_CounterRange` PASS | `api/internal/battle/battle_test.go:327` `{0: 7, 7: 14}`; `:331`; `:336` `SP != 50` | PASS |
| C14 | events order per base command with fields | `TestCommand_EventsInOrder` PASS | `api/internal/battle/battle_test.go:346-351` want table; `:355` `reflect.DeepEqual(types(got.Events), want[id])`; `:358`, `:361`, `:364` fields | PASS |
| C15 | SP 5 and 9: 409 not_enough_sp, unchanged; SP 10 plays -> 5 | `TestCommand_NotEnoughSP` PASS | `api/internal/battle/battle_test.go:377` `409, "not_enough_sp"`; `:378` `after != before`; `:383` `SP != 5` | PASS |
| C16 | f1 locked 409 command_locked; unlocked 200 | `TestCommand_SkillCommandNeedsSkill` PASS | `api/internal/battle/battle_test.go:392` `409, "command_locked"`; `:394` `f.turn` fatals unless 200 (`:113`) | PASS |
| C17 | hadouken 422 unknown_command | `TestCommand_Unknown` PASS | `api/internal/battle/battle_test.go:401` `422, "unknown_command"` | PASS |
| C18 | no battle: commands and items 404 | `TestTurn_NoBattle` PASS | `api/internal/battle/battle_test.go:407-408` `404, "battle_not_found"` | PASS |
| C19 | won: commands and items 409 battle_over | `TestTurn_BattleOver` PASS | `api/internal/battle/battle_test.go:417-418` `409, "battle_over"` | PASS |
| C20 | ROLLBACK: battle null, fled, no counter or reward; GET 404 | `TestCommand_RollbackEndsBattle` PASS | `api/internal/battle/battle_test.go:426` `Battle != nil OR types != [fled] OR HP != 100 OR XP != 0`; `:429` `404, "battle_not_found"` | PASS |
| C21 | client damage/hp ignored | `TestCommand_IgnoresClientNumbers` PASS | `api/internal/battle/battle_test.go:437` body; `:438` `Amount != 14 OR EnemyHP != 46 OR HP != 93` | PASS |
| C22 | 3 concurrent FIX: 18, SP 35, HP 79 | `TestCommand_ConcurrentTurnsSerialize` PASS | `api/internal/battle/battle_test.go:460` codes `[200 200 200]`; `:464` `EnemyHP != 18 OR SP != 35 OR HP != 79` | PASS |
| C23 | 9 skill commands | `TestCommand_EverySkillCommand` PASS | `api/internal/battle/battle_test.go:479-481` table; `:495`; `:501`; `:505`; `:508`; `:511` | PASS |
| C24 | base costs 10/8/14/0/0 | `TestCommand_BaseCosts` PASS | `api/internal/battle/battle_test.go:525` cost map; `:530` `SP != 30-cost+gain+5`; `:534-535` rollback | PASS |
| C25 | own layer rounding and SP bounds | `TestRules_*` (4) PASS | `api/internal/battle/rules_test.go:30` `{14: 25, 15: 27, 17: 31, 20: 36}`; `:44` `{25, 10, 28}`; `:54` `{7: 4, 8: 4, 13: 7, 14: 7}`; `:69`; `:79`; `:85` | PASS |
| C26 | enemy 10 -> 0: won, reward, events | `TestVictory_CreditsReward` PASS | `api/internal/battle/battle_test.go:545` `Status != "won" OR EnemyHP != 0`; `:548`; `:551` reward `90/40/1`; `:554` | PASS |
| C27 | XP 450 -> level 2, 40/750, levelsGained 1 | `TestVictory_LevelsUpThroughGainXP` PASS | `api/internal/battle/battle_test.go:567` `Level != 2 OR XP != 40 OR XPMax != 750 OR LevelsGained != 1` | PASS |
| C28 | drop 64 adds null_shard, 65 does not | `TestVictory_DropChanceBoundary` PASS | `api/internal/battle/battle_test.go:583` `{64: 1, 65: 0}`; `:589`; `:592` | PASS |
| C29 | potion 29 adds sp_potion, 30 does not | `TestVictory_PotionChanceBoundary` PASS | `api/internal/battle/battle_test.go:600` `{29: 3, 30: 2}`; `:605` | PASS |
| C30 | HP 7 vs 7 respawn at vila; HP 8 -> 1 | `TestDefeat_RespawnAtVila` PASS | `api/internal/battle/battle_test.go:618` `Battle != nil OR HP != 100 OR Region != "vila" OR XP != 0`; `:621`; `:624`; `:630` | PASS |
| C31 | sp_potion 2 -> 1, event `item` item=sp_potion stat=sp amount=30, +30 capped, counter; hp_potion +40 capped | `TestItem_PotionsRestoreAndCostTurn` PASS | `api/internal/battle/battle_test.go:641` `qty != 1 OR SP != 45 OR HP != 93`; `:644` `types != [item counter] OR Events[0].Item != "sp_potion" OR Stat != "sp" OR Amount != 30`; `:648` `SP != 50`; `:653` `HP != 30+40-7 OR qty != 1`; `:657` `HP != 100-7` | PASS |
| C32 | hp_potion with none: 409 no_item, unchanged | `TestItem_NoItem` PASS | `api/internal/battle/battle_test.go:667` `409, "no_item"`; `:668` | PASS |
| C33 | null_shard and x: 422 unknown_item | `TestItem_UnknownOrNotUsable` PASS | `api/internal/battle/battle_test.go:677-678` `422, "unknown_item"` | PASS |
| C34 | new player inventory in POST /api/players and GET /api/me; order; 0 dropped | `TestInventory_InEveryPlayer` PASS | `api/internal/battle/battle_test.go:692` POST `DeepEqual(*got, want)` with want `[{item sp_potion quantity 2}]` (`:690`); `:695` GET; `:706-707` catalog order; `:714` spent potion dropped | PASS |
| C35 | pre-00004 player gets 2 sp_potion | `TestMigration_GivesExistingPlayersPotions` PASS | `api/internal/battle/battle_test.go:742` `MigrateTo(..., 3)`; `:754`; `:758` `qty != 2` | PASS |
| C36 | CHECK and unique constraints | `TestTables_Constraints` PASS | `api/internal/battle/battle_test.go:775` `23514`; `:780`, `:783` `23505` | PASS |
| C37 | catalog serves enemies, commands, items, combat incl. `startingItems` = sp_potion x 2 | `TestCatalog_ServesCombat` PASS | `api/internal/catalog/catalog_test.go:223` `len(b.Enemies) != 6`; `:227` per-enemy tuple; `:240` `len(b.Commands) != 14`; `:249` per-command tuple; `:259` `len(b.Items) != 8`; `:267` per-item tuple; `:272-274` combat rules incl. `len(r.StartingItems) != 1 OR StartingItems[0].Item != "sp_potion" OR StartingItems[0].Quantity != 2` (decode struct `:206-209`) | PASS |
| C38 | 4 routes 401/404/500 with request_id; GET /api/me 500 | `TestRoutes_SessionPlayerAndUnexpected` PASS | `api/internal/battle/battle_test.go:802` `401 unauthenticated`; `:805` `404 player_not_found`; `:814` `500 internal`; `:818` request_id in log; `:823` `GET /api/me` 500 | PASS |
| C39 | invalid_body on both JSON routes | `TestTurn_InvalidBody` PASS | `api/internal/battle/battle_test.go:832-834` `422, "invalid_body"` over both paths | PASS |
| C40 | FIX waits on FOR UPDATE holder | `TestCommand_SerializesOnPlayerRowLock` PASS | `api/internal/battle/battle_test.go:859` answered while locked; `:862`; `:870` `code != 200` and committed SP read | PASS |
| C41 | opens, POSTs start, shows region/name/level/HP/weakness | `starts and shows the enemy` PASS | `web/src/components/BattleScene.test.tsx:36` `ENCONTRO · VILA LOCALHOST`; `:37-40`; `:41` `calls("POST /api/me/battle")).toBe(1)` | PASS |
| C42 | order; label and hint of every visible command; costs; REFACTOR and MARKUP disabled | `lists commands with costs` PASS | `web/src/components/BattleScene.test.tsx:51` ids `[fix test refactor plain f1 rollback]`; `:53` cost texts; `:55-56` label and hint; `:58` refactor, f1 disabled; `:59` others enabled. The claim as written holds. Precision gap: SP 11 (`:47`) never equals a cost, so the AC 31 boundary is open (F4) | PASS |
| C43 | hero bars, potions, click posts sp_potion | `shows hero bars and potions` PASS | `web/src/components/BattleScene.test.tsx:72-73`; `:74-75`; `:76` disabled; `:80` `toEqual({ item: "sp_potion" })` | PASS |
| C44 | every event type -> pt-BR line; log keeps 6 | `writes events to the log` PASS | `web/src/components/BattleScene.test.tsx:85-101` cases; `:112` `toBe(text)`; `:114` `toHaveLength(6)` | PASS |
| C45 | turn passes player to HUD, updates bars | `turn updates player and battle` PASS | `web/src/components/BattleScene.test.tsx:126` `HP 40/60`; `:127` `SP 45/50`; `:128` `toHaveBeenLastCalledWith(after)` | PASS |
| C46 | won: RESOLVIDO, NOVO ENCONTRO restarts | `won shows RESOLVIDO and new encounter` PASS | `web/src/components/BattleScene.test.tsx:138`; `:139-140` disabled; `:142`; `:143`; `:144` `toBe(2)` | PASS |
| C47 | ended: ENCONTRO ENCERRADO and NOVO ENCONTRO | `ended shows new encounter` (2) PASS | `web/src/components/BattleScene.test.tsx:155`; `:156`; `:157`; `:159` | PASS |
| C48 | pending turn disables actions | `disables actions while a turn is pending` PASS | `web/src/components/BattleScene.test.tsx:167` every `[data-command], [data-item]` `toBeDisabled()` | PASS |
| C49 | turn errors go to the log, state unchanged | `turn error goes to the log` (3) PASS | `web/src/components/BattleScene.test.tsx:172-174` texts; `:182` `findByText(text)`; `:183-184`; `:185` `setPlayer` not called | PASS |
| C50 | CARREGANDO...; failure and retry | `loading and load failure` (3) PASS | `web/src/components/BattleScene.test.tsx:193`; `:202`; `:205` `toBe(2)` | PASS |
| C51 | catalog-driven names | `enemy and commands come from catalog` PASS | `web/src/components/BattleScene.test.tsx:217` `BUG DE TESTE`; `:218` `PATCH`; `:219` | PASS |
| C52 | /bug-fight renders the scene | `bug-fight page renders the scene` PASS | `web/src/components/BattleScene.test.tsx:230`; `:231` `EM BREVE` absent | PASS |
| C53 | browser fight to RESOLVIDO, HUD 90/500 | `e2e/battle.spec.ts:5:5 fight to victory` PASS | `web/e2e/battle.spec.ts:22`; `:23`; `:24` `toContainText("90/500")` | PASS |
| C54 | starting-item write fails: POST /api/players 500 internal, no player stored | `TestCreatePlayer_StartingItemsFailureRollsBack` PASS | `api/internal/battle/battle_test.go:883` trigger rejects every `player_items` INSERT; `:885` `f.status(rec, 500, "internal")`; `:886` `env.Count("players") != 0` | PASS |
| C55 | inventory unavailable under `WithLocked`: travel 500 with request_id, cause `player_items` logged, player unchanged; skills unlock with 0 points 500 | `TestLockedMutation_InventoryLoadError` PASS | `api/internal/battle/battle_test.go:896` `f.status(rec, 500, "internal")`; `:897` log contains `"request_id":"<id>"`; `:901` `region != "vila"`; `:904` `!strings.Contains(Logs, "player_items")`; `:908-909` `skill_points = 0`, then unlock `500, "internal"` | PASS |
| C56 | catalog `startingItems` = hp_potion x 3, sp_potion x 1 -> new player gets exactly that, in catalog order | `TestCreatePlayer_StartingItemsFromCatalog` PASS | `api/internal/battle/battle_test.go:914-916` `NewWithCatalog` edit; `:922` want `{{"sp_potion", 1}, {"hp_potion", 3}}`; `:923` `len(got) != 2 OR got[0] != want[0] OR got[1] != want[1]` | PASS |

Every test cited above was added in 6a7dddc..HEAD. C56 and the C55 additions (`:904-909`) are new in c87dfa9..HEAD.

## Coverage

Rows whose authority the fix touched, and rows the final sweep added, are verified at ca60cca. Every other row is carried from c87dfa9 with the same members and proofs. Their citations moved by +1 inside `battle_test.go`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `WithLocked` callers under inventory-load failure (6 routes) (verified at ca60cca) | `rg -n "WithLocked\("`: `battle/handlers.go:87`, `:120`, `deploy/deploy.go:88`, `:143`, `world/travel.go:29`, `skills/skills.go:29`; loader `player/player.go:199-201` | travel 500, cause and unchanged row C55 `:896-904` · guard-first skills unlock 500 C55 `:909` · battle routes run `load` first (`battle/handlers.go:88`, `:122`), so C38's `battles` rename covers them · propagation itself: F7 killed by `:904` and, independently, by `:909` | - |
| door 4a starting items (2 landings) (verified at ca60cca) | plan Landing 4a (`plan.md:199`): "em `combat.json`, servido em `combat`"; `api/catalog/combat.json:44`; read at `api/internal/player/handlers.go:99` | served C37 `catalog_test.go:274` · read by creation C56 `battle_test.go:923`; hardcoded-inventory fault killed only by C56 | - |
| `player.Handlers` catalog wiring (2 assemblies) (verified at ca60cca) | read directly. `api/internal/app/router.go:42` `&player.Handlers{Pool: d.Pool, Catalog: d.Catalog}`. `d.Catalog` comes from `api/cmd/api/main.go:43` `catalog.Load()` and `:51` `Catalog: cat`, and in tests from `api/internal/apptest/apptest.go:110` `catalog.Load()`, `:115` edit and `:125` `Catalog: cat`. `rg -n "player.Handlers\{"` finds only `router.go:42` | main: read at `main.go:51` · apptest: C34, C56 | - |
| inventory order (catalog position) (verified at ca60cca) | `api/internal/player/player.go:128-129` | C34 `:706-707` · C56 `:923` (catalog lists hp before sp, the answer lists sp first); sort-removal fault killed by both | - |
| `POST /api/players` statuses (5) (carried from c87dfa9) | plan Surface; `api/internal/player/handlers.go:67-83` | 201 with inventory C34 `:692` · 500 on starting-item write C54 `:885-886` · 401, 409, 422 foundation proofs `api/internal/player/player_test.go:84`, `:108`, `:116`, `:136` | - |
| player creation transaction (1) (carried from c87dfa9) | `api/internal/player/handlers.go:86-105` | C54 `:886` | - |
| door 5 `item` event fields (3) (carried from c87dfa9) | Landing door 5; `api/internal/battle/rules.go:122` | item, stat, amount C31 `:644` | - |
| command button enabled vs SP, AC 31 (3: SP > cost, SP == cost, SP < cost) (verified at ca60cca, added by sweep) | AC 31 "desabilitando os que o SP atual não paga" (`plan.md:106`); `web/src/components/BattleScene.tsx:119` | SP > cost C42 `:59` (fix 10 at SP 11) · SP < cost C42 `:58` (refactor 14, f1 12 at SP 11) | SP == cost: no case. A command whose cost equals the current SP is payable and must be enabled. The `<=` mutant (F4) survives the whole vitest suite and C53 |
| `NOVO ENCONTRO` visibility by screen state (3: active, won, ended) (verified at ca60cca, added by sweep) | `web/src/components/BattleScene.tsx:98` `!active`; AC 35, AC 36 | won C46 `:141` · ended C47 `:156` | active: nothing asserts the button is absent during a live fight. The always-rendered mutant (F5) survives the whole vitest suite |
| Landing doors (10) (verified at ca60cca) | plan Landing incl. 1a, 3a, 4a | 1 C36 · 1a no shield column (`api/migrations/00004_battle_inventory.sql:12-21`), per-turn shield C11 · 2 C36 · 3 C7 · 3a `rules.go:14` `IntN`, via `apptest` · 4 C37 · 4a C37, C56 · 5 C14, C31 · 6 C15 and error-code row · 7 C1 | - |
| `GET /api/me/battle` statuses (4) (carried from c87dfa9) | plan Surface | 200 C5 · 401 C38 · 404 C5, C38 · 500 C38 | - |
| `POST /api/me/battle` statuses (4) (carried from c87dfa9) | plan Surface | 200 C1 · 401 C38 · 404 C38 · 500 C38 | - |
| `POST /api/me/battle/commands` statuses (6) (carried from c87dfa9) | plan Surface | 200 C7 · 401 C38 · 404 C18 · 409 C15, C16, C19 · 422 C17, C39 · 500 C38 | - |
| `POST /api/me/battle/items` statuses (6) (carried from c87dfa9) | plan Surface | 200 C31 · 401 C38 · 404 C18 · 409 C19, C32 · 422 C33, C39 · 500 C38 | - |
| regions x enemies (6) (carried from c87dfa9) | `api/catalog/combat.json:3-8` | C6, C37 | - |
| skill commands (9), base commands (5), command effects (6) (carried from c87dfa9) | `combat.json:11-24`; `rules.go` | C23 · C24 · C7, C8, C10, C11, C12, C20 | - |
| new error codes (7) (carried from c87dfa9) | Landing door 6 | C5, C19, C15, C16, C32, C17, C33 | - |
| rounding points (3), chance boundaries (4), defeat boundary (2) (carried from c87dfa9) | `rules.go` | C25 · C28, C29 · C30 | - |
| `Battle` states (4), usable/unusable items (4), API event types (12) (carried from c87dfa9) | door 1; `battle/handlers.go:188`; door 5 | C1, C2, C26, C20, C30 · C31, C33 · C7, C11-C14, C20, C26, C28, C30, C31 | - |
| door 2 PlayerItem rules (3), door 4 catalog fields (carried from c87dfa9) | Landing doors 2, 4 | C36, C34 · C37 | - |
| potion buttons (3), event types on screen (14), turn outcomes on screen (4), start outcomes (3) (carried from c87dfa9) | `BattleScene.tsx`, `battleLog.ts` | C43 · C44 · C45, C49 · C50 | - |
| startup config: rand (2 assemblies) (carried from c87dfa9) | `api/cmd/api/main.go:53`; `api/internal/apptest/apptest.go:119` | read directly; C7 | - |

Final sweep of every conditional, verified at ca60cca:

- **Files swept:** `api/internal/battle/rules.go`, `battle/handlers.go`, `api/internal/player/player.go`, `player/handlers.go`, the feature's additions to `api/internal/catalog/catalog.go`, `web/src/components/BattleScene.tsx` and `web/src/lib/battleLog.ts`.
- **Branches with an asserted case on each side:**
  - `rules.go:66`, `:70`, `:82`, `:87`, `:93`, `:97`, `:101`, `:104`, `:116`, `:129`, `:139`, `:142`, `:151`, `:156`
  - `battle/handlers.go:41`, `:89`, `:92`, `:122`, `:125`, `:128`, `:141`, `:149`, `:160`, `:164`, `:168`, `:171`, `:188`, `:192`
  - `player.go:118`, `:149`, `:199`
  - `player/handlers.go:99-100`
  - `catalog.go:160` (`SkillBonus` type filter, C4, C9)
  - `battleLog.ts:10`, `:22`, `:26`
  - `BattleScene.tsx:28`, `:50` (both `??` sides), `:54`, `:61`, `:71`, `:80`, `:81`, `:82`, `:87`, `:91`, `:119` (`pending`, `!active`), `:134`, `:166`
- **Branches with no asserted case: two decision branches, listed in the table above.**
  - `BattleScene.tsx:119` at SP == cost.
  - `BattleScene.tsx:98` on its false side.
- **Unasserted but not decisions. These are defensive branches that no shipped input reaches:**
  - `battle/handlers.go:97-98`, "no enemy for region". C6 and C37 show all 6 regions have an enemy.
  - `BattleScene.tsx:45`, `if (!battle) return`. The buttons are disabled when `battle` is null (C47 `:159`).
  - `catalog.go` `ItemPosition` unknown-id fallback. Every `item_id` written comes from the catalog.
  - `player.go:125` `CollectRows` scan error.
  - `battle/handlers.go:133` `play` error. When the `AddItem(-1)` decrement fails, the aborted transaction still answers 500 at `save`, so only the logged cause would differ.
  - `BattleScene.tsx:147`, the SP line hidden once the fight ends. It is presentation inside the ended state, and C47 covers that state.

Two notes that do not fail anything:

- **`apptest.NewWithCatalog` is documented as changing what the router "serves", and it does not.** Its comment (`api/internal/apptest/apptest.go:103`) says so, but the edit runs after `catalog.Load` has already marshalled `c.body` (`api/internal/catalog/catalog.go:196`). `GET /api/catalog` keeps serving the embedded data. No check relies on this today.
- **Inventory order ignores the injected catalog.** `player.loadInventory` sorts by `catalog.Default()` (`api/internal/player/player.go:128`), not by the catalog handed to the router. C56 passes because its edit leaves the item order unchanged.

## Test policy rows

Rows are verified at ca60cca where they classify a touched or previously unmet file, or a file the sweep found short. The rest are carried from c87dfa9.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (verified at ca60cca) | `api/internal/player/player.go` (`WithLocked` inventory load, `AddItem`, `loadInventory`, `Quantity`) | boundary C28, C31, C34, C36, C55, C56 | yes - F7 and sort removal killed; C55 covers guard-first and guard-free routes and the logged cause |
| Entry point that decides nothing (verified at ca60cca) | `api/internal/player/handlers.go` `Create` / `insert` (now reads `h.Catalog`) | accepted input C34, C56 · each error path: starting-item 500 and rollback C54, foundation 409/422 | yes - hardcoded starting inventory killed by C56 |
| Instrumentation, pass-throughs (verified at ca60cca) | `api/internal/app/router.go`, `api/internal/apptest/apptest.go` (`NewWithCatalog`) | consumers C1-C56 | yes - wiring read directly at `router.go:42`; `NewWithCatalog` consumed by C56 |
| Decides, not reached across a boundary (verified at ca60cca) | `web/src/components/BattleScene.tsx` | screen level C41-C52 · browser C53, one asserted case per row of each decision | no - two decision rows have no asserted case: SP == cost at `:119` (AC 31, F4 survives) and `NOVO ENCONTRO` while active at `:98` (F5 survives) |
| Decides, not reached across a boundary (verified at ca60cca) | `web/src/lib/battleLog.ts` | own layer C44 | yes - `weakness`, `blocked` and `levelsGained` each asserted on both sides (`BattleScene.test.tsx:86-97`) |
| Decides, reached across a boundary (carried from c87dfa9) | `api/internal/battle/rules.go` | own layer C25 · boundary C7-C31 | yes |
| Decides, reached across a boundary (carried from c87dfa9) | `api/internal/battle/handlers.go` guards | boundary C15-C19, C32, C33 | yes |
| Instrumentation, pass-throughs (carried from c87dfa9) | `catalog.go` accessors, `db.go`, `types.ts` | consumers C1-C40 | yes |

## Faults injected

Verified at ca60cca. Setup:

- **Isolation.** Every fault ran in `git worktree add --detach .../scratchpad/wt3 HEAD`. The real `web/node_modules` was symlinked in, and `next-env.d.ts` and `.next/types` were copied in for `tsc`.
- **Real tree.** `git status --porcelain` read `?? .claude/` before and after, and `diff` showed the two identical. `git stash` was never used (`git stash list` is empty). The worktree was removed with `git worktree remove --force` and pruned.
- **Compilation.** Each api mutant passed `go vet` with exit 0. Each web mutant passed `tsc --noEmit` with exit 0.
- **Reverts.** Each fault was reverted with `git checkout -- .` in the worktree before the next one.

| Mutation | Location | Killed |
| --- | --- | --- |
| F7 (round-2 survivor) - `_ = loadInventory(ctx, tx, p)` swallows the inventory load error | `api/internal/player/player.go:199-201` | yes - `TestLockedMutation_InventoryLoadError` FAIL at `battle_test.go:905` (logged `25P02 current transaction is aborted`, no `player_items`). With that assertion deleted in scratch, it still fails at `:906` (`got 409 no_skill_points`), so both new assertions discriminate |
| hardcoded starting inventory - `range []catalog.ItemQuantity{{Item: "sp_potion", Quantity: 2}}` in place of `h.Catalog.Combat.StartingItems` | `api/internal/player/handlers.go:99` | yes - `TestCreatePlayer_StartingItemsFromCatalog` FAIL at `battle_test.go:924`. `TestInventory_InEveryPlayer` and `TestCatalog_ServesCombat` pass under it, so C56 alone carries door 4a's read |
| inventory sort removed from `loadInventory` | `api/internal/player/player.go:128-129` | yes - `TestInventory_InEveryPlayer` FAIL at `battle_test.go:707` and `TestCreatePlayer_StartingItemsFromCatalog` FAIL at `:924` |
| F4 - command disabled at `sp <= cost` instead of `sp < cost` | `web/src/components/BattleScene.tsx:119` | no - `BattleScene.test.tsx` 17/17 pass and the whole `npx vitest run` 132/132 pass. C53 cannot catch it: SP runs 45, 40, 35 and so on, and never equals 10 before victory (`web/e2e/battle.spec.ts:13-21`) |
| F5 - `NOVO ENCONTRO` rendered in every state (`{(active OR !active) && ...}`) | `web/src/components/BattleScene.tsx:98` | no - the whole `npx vitest run` 132/132 pass. C53 does not look for the button |

## Gate

Whole-suite exit codes at ca60cca:

- `cd api && go test -count=1 ./...` - exit 0 (8 packages ok: auth, battle, catalog, deploy, httpx, player, skills, world)
- `cd web && npx vitest run` - exit 0 (12 files, 132 passed)
- `cd web && npx eslint` - exit 0
- `cd web && npx tsc --noEmit` - exit 0
- `cd web && npx playwright test` - exit 0 (6 passed)
- `make ci-build` - exit 0
- `make check-deps` - exit 0 (`deps ok`)

Ranked remaining gaps:

1. **AC 31 boundary SP == cost is unproven, and F4 survives.**
   - Where: `web/src/components/BattleScene.tsx:119`. C42 runs at SP 11 against costs 10 and 12 (`web/src/components/BattleScene.test.tsx:47`, `:58-59`).
   - Fix: add a case where SP equals a visible cost, for example SP 10 with FIX enabled.
2. **`NOVO ENCONTRO` is never asserted absent during an active fight, and F5 survives.**
   - Where: `web/src/components/BattleScene.tsx:98`. C46 and C47 assert only that the button is present (`BattleScene.test.tsx:141`, `:156`).
   - Fix: C41 or C46 should assert `queryByRole("button", { name: "NOVO ENCONTRO" })` is null while `status` is `active`.
3. **Two notes, neither failing:**
   - The `NewWithCatalog` comment says the edit changes what the router serves, which is false (`api/internal/apptest/apptest.go:103` vs `api/internal/catalog/catalog.go:196`).
   - `loadInventory` orders by `catalog.Default()`, not by the injected catalog (`api/internal/player/player.go:128`).
