# Bug fight verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 6a7dddc..817d2f6ce05b67d961f0d13a25e33ebe1e12ce0a
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

This round re-ran all 58 proofs at HEAD 817d2f6. Each one ran individually, passed and has a located assertion. Every whole suite exits 0.

The fix diff is ca60cca..817d2f6. Commit de0bfb2 only commits the round-3 report. The fix makes no production behaviour change:

- It adds C57 and C58 as two tests in `web/src/components/BattleScene.test.tsx:63-78`.
- It adds two Coverage rows and a Round 4 Handoff entry to `checks.md`.
- It rewrites two doc comments: `api/internal/apptest/apptest.go:102-104` and `api/internal/player/player.go:128`.

Both round-3 gaps are closed:

- **F4 is killed.** With `<` changed to `<=` at `BattleScene.tsx:119`, C57 fails at `BattleScene.test.tsx:68`, where FIX at SP 10 is no longer enabled. It is the only failing test out of 134.
- **F5 is killed.** With `NOVO ENCONTRO` rendered unconditionally at `BattleScene.tsx:98`, C58 fails at `BattleScene.test.tsx:77`. It is the only failing test out of 134.

Both round-3 notes are resolved as documentation. The comments are now true against `catalog.go` and `player.go` (see Coverage). No behaviour changed.

## Binding sources

Carried from c87dfa9. The fix diff did not touch the interface or any screen.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only and the profile is `standard` | - | - |

## Checks

Verified at 817d2f6. All proofs ran again in full, in batched invocations:

- **api:** `cd api && go test -count=1 -v ./internal/battle ./internal/catalog -run '^(TestStart_ OR TestGet_ OR TestCommand_ OR TestTurn_ OR TestRules_ OR TestVictory_ OR TestDefeat_ OR TestItem_ OR TestInventory_ OR TestMigration_ OR TestTables_ OR TestRoutes_ OR TestCatalog_ServesCombat$ OR TestCreatePlayer_ OR TestLockedMutation_InventoryLoadError$)'`. The regex alternation is written here as OR.
  - Both packages report `ok`.
  - All 46 named tests appear individually as `--- PASS`, with no `FAIL`.
  - C25 covers four tests: `TestRules_WeaknessRounding`, `TestRules_DamageBonusRounding`, `TestRules_ShieldRounding` and `TestRules_SPBounds`.
- **web:** `cd web && npx vitest run src/components/BattleScene.test.tsx src/components/ComingSoon.test.tsx --reporter=verbose` - exit 0, 21 passed.
  - Every `-t` pattern for C41-C52, C57 and C58 appears as a passing test.
  - That includes `BattleScene > SP equal to cost pays` and `BattleScene > active fight hides new encounter`.
- **e2e:** `cd web && npx playwright test` - exit 0, 6 passed, including `e2e/battle.spec.ts:5:5 fight to victory`.

Citations:

- **`api/internal/battle/*_test.go`, `api/internal/catalog/catalog_test.go`, `web/e2e/battle.spec.ts`:** untouched by the fix (`git diff ca60cca..HEAD --stat` over them is empty). Their citations carry over unchanged from round 3.
- **`web/src/components/BattleScene.test.tsx`:** 17 lines were inserted at 63-79, so every citation after line 62 moved by +17. I re-read each cited line at HEAD.
  - The C43-C52 citations are refreshed.
  - The C41 and C42 citations are unchanged.

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
| C42 | order; label and hint of every visible command; costs; REFACTOR and F1 disabled at SP 11 | `lists commands with costs` PASS | `web/src/components/BattleScene.test.tsx:51` ids `[fix test refactor plain f1 rollback]`; `:53` cost texts; `:55-56` label and hint; `:58` refactor, f1 disabled; `:59` others enabled. The round-3 precision gap (SP 11 never equals a cost) is now closed by C57 | PASS |
| C43 | hero bars, potions, click posts sp_potion | `shows hero bars and potions` PASS | `web/src/components/BattleScene.test.tsx:89-90`; `:91-92`; `:93` disabled; `:97` `toEqual({ item: "sp_potion" })` | PASS |
| C44 | every event type -> pt-BR line; log keeps 6 | `writes events to the log` PASS | `web/src/components/BattleScene.test.tsx:102-118` cases; `:129` `toBe(text)`; `:131` `toHaveLength(6)` | PASS |
| C45 | turn passes player to HUD, updates bars | `turn updates player and battle` PASS | `web/src/components/BattleScene.test.tsx:143` `HP 40/60`; `:144` `SP 45/50`; `:145` `toHaveBeenLastCalledWith(after)` | PASS |
| C46 | won: RESOLVIDO, NOVO ENCONTRO restarts | `won shows RESOLVIDO and new encounter` PASS | `web/src/components/BattleScene.test.tsx:155`; `:156-157` disabled; `:158` click `NOVO ENCONTRO`; `:160`; `:161` `toBe(2)` | PASS |
| C47 | ended: ENCONTRO ENCERRADO and NOVO ENCONTRO | `ended shows new encounter` (2) PASS | `web/src/components/BattleScene.test.tsx:172`; `:173` `getByRole("button", { name: "NOVO ENCONTRO" })`; `:174`; `:176` | PASS |
| C48 | pending turn disables actions | `disables actions while a turn is pending` PASS | `web/src/components/BattleScene.test.tsx:184` every `[data-command], [data-item]` `toBeDisabled()` | PASS |
| C49 | turn errors go to the log, state unchanged | `turn error goes to the log` (3) PASS | `web/src/components/BattleScene.test.tsx:189-191` texts; `:199` `findByText(text)`; `:200-201`; `:202` `setPlayer` not called | PASS |
| C50 | CARREGANDO...; failure and retry | `loading and load failure` (3) PASS | `web/src/components/BattleScene.test.tsx:210`; `:219`; `:222` `toBe(2)` | PASS |
| C51 | catalog-driven names | `enemy and commands come from catalog` PASS | `web/src/components/BattleScene.test.tsx:234` `BUG DE TESTE`; `:235` `PATCH`; `:236` | PASS |
| C52 | /bug-fight renders the scene | `bug-fight page renders the scene` PASS | `web/src/components/BattleScene.test.tsx:247`; `:248` `EM BREVE` absent | PASS |
| C53 | browser fight to RESOLVIDO, HUD 90/500 | `e2e/battle.spec.ts:5:5 fight to victory` PASS | `web/e2e/battle.spec.ts:22`; `:23`; `:24` `toContainText("90/500")` | PASS |
| C54 | starting-item write fails: POST /api/players 500 internal, no player stored | `TestCreatePlayer_StartingItemsFailureRollsBack` PASS | `api/internal/battle/battle_test.go:883` trigger rejects every `player_items` INSERT; `:885` `f.status(rec, 500, "internal")`; `:886` `env.Count("players") != 0` | PASS |
| C55 | inventory unavailable under `WithLocked`: travel 500 with request_id, cause `player_items` logged, player unchanged; skills unlock with 0 points 500 | `TestLockedMutation_InventoryLoadError` PASS | `api/internal/battle/battle_test.go:896` `f.status(rec, 500, "internal")`; `:897` log contains `"request_id":"<id>"`; `:901` `region != "vila"`; `:904` `!strings.Contains(Logs, "player_items")`; `:908-909` `skill_points = 0`, then unlock `500, "internal"` | PASS |
| C56 | catalog `startingItems` = hp_potion x 3, sp_potion x 1 -> new player gets exactly that, in catalog order | `TestCreatePlayer_StartingItemsFromCatalog` PASS | `api/internal/battle/battle_test.go:914-916` `NewWithCatalog` edit; `:922` want `{{"sp_potion", 1}, {"hp_potion", 3}}`; `:923` `len(got) != 2 OR got[0] != want[0] OR got[1] != want[1]` | PASS |
| C57 | SP 10: FIX (10 SP) and TEST (8 SP) enabled, REFACTOR (14 SP) disabled (AC 31) | `SP equal to cost pays` PASS | `web/src/components/BattleScene.test.tsx:65` start at `battle({ sp: 10 })`; `:68` `for (const id of ["fix", "test"]) expect(command(id)).toBeEnabled()`; `:69` `expect(command("refactor")).toBeDisabled()`. Costs 10/8/14 are pinned by C42 `:53` against the same `CATALOG` | PASS |
| C58 | active fight: no `NOVO ENCONTRO` (AC 35, AC 36) | `active fight hides new encounter` PASS | `web/src/components/BattleScene.test.tsx:74` start with status `active` (fixture `:10-11`); `:76` waits for the enemy card; `:77` `expect(screen.queryByRole("button", { name: "NOVO ENCONTRO" })).toBeNull()` | PASS |

Every test cited above was added in 6a7dddc..HEAD. C57 and C58 are new in ca60cca..HEAD.

Are C57 and C58 asserting the spec rather than the code? My judgment:

- **C57 asserts AC 31.**
  - AC 31 (`plan.md:106`) disables "os que o SP atual não paga".
  - At SP 10, a 10 SP command is paid, so it must be enabled. The test asserts exactly that for FIX at `:68`.
  - The test also keeps a strictly-unpayable neighbour, REFACTOR at 14, disabled at `:69`.
  - The expected values are readable at the assertion. The costs they depend on are pinned by C42 at `:53`.
- **C58 follows from AC 35 and AC 36.** Neither criterion literally says "hide while active".
  - Both tie `NOVO ENCONTRO` to an end state: "WHILE o inimigo está vencido" and "WHEN o jogador é derrotado ou usa ROLLBACK".
  - AC 35 describes the button as one "que começa outro encontro". An active fight is neither end state, and starting another encounter during one is not something the plan offers anywhere.
  - So the absence is the complement of the states the plan names, not an artefact of `!active`. This is a precision note on the plan's wording, not a gap.
  - The assertion targets the check-defined value: no button with that accessible name (`:77`). It runs after the active fight has rendered (`:76`), so it cannot pass vacuously during loading.

## Coverage

Verified at 817d2f6:

- the two rows the fix touched,
- the two rows whose citations sit in comment-edited files,
- the Landing row.

Every other row is carried from ca60cca with the same members and proofs. No api test file moved.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| command button enabled vs SP, AC 31 (3: SP > cost, SP == cost, SP < cost) (verified at 817d2f6) | AC 31 "desabilitando os que o SP atual não paga" (`plan.md:106`); the members come from the criterion, not from `BattleScene.tsx:119` | SP > cost: C42 `:59` (fix 10 at SP 11), C57 `:68` (test 8 at SP 10) · SP == cost: C57 `:68` (fix 10 at SP 10), F4 killed · SP < cost: C42 `:58` (refactor 14, f1 12 at SP 11), C57 `:69` (refactor 14 at SP 10), and the `sp + 1 < cost` mutant is killed by C42 | - |
| `NOVO ENCONTRO` visibility by screen state (3: active, won, ended) (verified at 817d2f6) | AC 35, AC 36 (`plan.md:110-111`): shown in the two end states and nowhere else; `BattleScene.tsx:98` | active: absent, C58 `:77`, F5 killed · won: present and restarts, C46 `:158`, `:161` · ended (fled, defeat): present, C47 `:173` · the "shown unless won" mutant is killed by C58 | - |
| `WithLocked` callers under inventory-load failure (6 routes) (verified at 817d2f6, citations refreshed) | `rg -n "WithLocked\("`: `battle/handlers.go:87`, `:120`, `deploy/deploy.go:88`, `:143`, `world/travel.go:29`, `skills/skills.go:29`; loader now at `player/player.go:200-202` (+1 from the new comment) | travel 500, cause and unchanged row C55 `:896-904` · guard-first skills unlock 500 C55 `:909` · battle routes run `load` first (`battle/handlers.go:88`, `:122`), so C38 covers them | - |
| inventory order (catalog position) (verified at 817d2f6, citations refreshed) | `api/internal/player/player.go:129-130` `catalog.Default()` then `sort.SliceStable` by `ItemPosition` | C34 `:706-707` · C56 `:923` | - |
| `player.Handlers` catalog wiring (2 assemblies) (verified at 817d2f6) | read directly. `api/internal/app/router.go:42` `&player.Handlers{Pool: d.Pool, Catalog: d.Catalog}`. `d.Catalog` comes from `api/cmd/api/main.go:43` and `:51` in the api, and from `api/internal/apptest/apptest.go:112` `catalog.Load()`, `:117` `edit(cat)` and `:127` `Catalog: cat` in tests | main: read at `main.go:51` · apptest: C34, C56 | - |
| door 4a starting items (2 landings) (carried from ca60cca) | plan Landing 4a (`plan.md:199`); `api/catalog/combat.json:44`; read at `api/internal/player/handlers.go:99` | served C37 `catalog_test.go:274` · read by creation C56 `battle_test.go:923` | - |
| `POST /api/players` statuses (5) (carried from ca60cca) | plan Surface; `api/internal/player/handlers.go:67-83` | 201 C34 `:692` · 500 C54 `:885-886` · 401, 409, 422 `api/internal/player/player_test.go:84`, `:108`, `:116`, `:136` | - |
| player creation transaction (1) (carried from ca60cca) | `api/internal/player/handlers.go:86-105` | C54 `:886` | - |
| door 5 `item` event fields (3) (carried from ca60cca) | Landing door 5; `api/internal/battle/rules.go:122` | item, stat, amount C31 `:644` | - |
| Landing doors (10) (verified at 817d2f6) | plan Landing incl. 1a, 3a, 4a | 1 C36 · 1a no shield column (`api/migrations/00004_battle_inventory.sql:12-21`), per-turn shield C11 · 2 C36 · 3 C7 · 3a `rules.go:14` `IntN`, via `apptest` · 4 C37 · 4a C37, C56 · 5 C14, C31 · 6 C15 and error-code row · 7 C1 | - |
| `GET /api/me/battle` statuses (4) (carried from ca60cca) | plan Surface | 200 C5 · 401 C38 · 404 C5, C38 · 500 C38 | - |
| `POST /api/me/battle` statuses (4) (carried from ca60cca) | plan Surface | 200 C1 · 401 C38 · 404 C38 · 500 C38 | - |
| `POST /api/me/battle/commands` statuses (6) (carried from ca60cca) | plan Surface | 200 C7 · 401 C38 · 404 C18 · 409 C15, C16, C19 · 422 C17, C39 · 500 C38 | - |
| `POST /api/me/battle/items` statuses (6) (carried from ca60cca) | plan Surface | 200 C31 · 401 C38 · 404 C18 · 409 C19, C32 · 422 C33, C39 · 500 C38 | - |
| regions x enemies (6) (carried from ca60cca) | `api/catalog/combat.json:3-8` | C6, C37 | - |
| skill commands (9), base commands (5), command effects (6) (carried from ca60cca) | `combat.json:11-24`; `rules.go` | C23 · C24 · C7, C8, C10, C11, C12, C20 | - |
| new error codes (7) (carried from ca60cca) | Landing door 6 | C5, C19, C15, C16, C32, C17, C33 | - |
| rounding points (3), chance boundaries (4), defeat boundary (2) (carried from ca60cca) | `rules.go` | C25 · C28, C29 · C30 | - |
| `Battle` states (4), usable/unusable items (4), API event types (12) (carried from ca60cca) | door 1; `battle/handlers.go:188`; door 5 | C1, C2, C26, C20, C30 · C31, C33 · C7, C11-C14, C20, C26, C28, C30, C31 | - |
| door 2 PlayerItem rules (3), door 4 catalog fields (carried from ca60cca) | Landing doors 2, 4 | C36, C34 · C37 | - |
| potion buttons (3), event types on screen (14), turn outcomes on screen (4), start outcomes (3) (carried from ca60cca, web citations +17) | `BattleScene.tsx`, `battleLog.ts` | C43 · C44 · C45, C49 · C50 | - |
| startup config: rand (2 assemblies) (verified at 817d2f6) | `api/cmd/api/main.go:53` `battle.DefaultRand`; `api/internal/apptest/apptest.go:121` `rnd := &Rand{t: t}`, `:124` | read directly; C7 | - |

Conditional sweep, carried from ca60cca. The fix added no conditional to any production file. The two branches that sweep found unasserted now have an asserted case on each side:

- `BattleScene.tsx:119` at SP == cost: C57.
- `BattleScene.tsx:98` on its false side: C58.

The defensive branches listed in round 3 are unchanged. `player.go` sweep lines moved by +1 after line 128, to `:150` and `:200`.

The round-3 notes, re-judged against the code at 817d2f6:

- **`apptest.NewWithCatalog` comment: resolved.** The comment is at `api/internal/apptest/apptest.go:102-104`. It says handlers receive the edited catalog through `app.Deps`, which is true: the edit at `:117` runs before the catalog is placed in `Catalog: cat` at `:127`, and `router.go:42-54` hands `d.Catalog` to every handler. It says `GET /api/catalog` keeps serving the embedded data because the body is marshalled by `catalog.Load`, which is also true: `catalog.go:196` fills `c.body` inside `Load`, and `ServeHTTP` writes `c.body` (`catalog.go:344`). It says inventory and skill order follow `catalog.Default()`, which is true at `player.go:129` and `:176`. One small nuance, which fails nothing: `ServeHTTP` builds its `ETag` from `c.Version` (`catalog.go:336`), so an edit that changes `Version` would change the header while the body stays the same. No test edits `Version`.
- **`loadInventory` ordering comment: resolved.** The comment at `api/internal/player/player.go:128` says order follows the embedded catalog "like SortSkills", not a catalog injected into the router. That is true: `:129` `cat := catalog.Default()` and `:130` sort by `cat.ItemPosition`, and `SortSkills` does the same at `:175-179`. The limitation is now documented rather than fixed. `checks.md` Round 4 Handoff "Settled mid-build" records this as a reversible choice, and no check relies on an injected order.

## Test policy rows

Two rows are verified at 817d2f6: the row that was unmet, and the row classifying the comment-edited `apptest.go`. The rest are carried from ca60cca.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary (verified at 817d2f6) | `web/src/components/BattleScene.tsx` | screen level C41-C52, C57, C58 · browser C53, one asserted case per row of each decision | yes - SP vs cost has all three rows (C42, C57); `NOVO ENCONTRO` has all three states (C58, C46, C47); F4 and F5 killed |
| Instrumentation, pass-throughs (verified at 817d2f6) | `api/internal/app/router.go`, `api/internal/apptest/apptest.go` (comment only) | consumers C1-C56 | yes - comment-only change; wiring read directly at `router.go:42` |
| Decides, reached across a boundary (carried from ca60cca) | `api/internal/player/player.go` (comment added only) | boundary C28, C31, C34, C36, C55, C56 | yes |
| Entry point that decides nothing (carried from ca60cca) | `api/internal/player/handlers.go` `Create` / `insert` | accepted input C34, C56 · error paths C54, foundation 409/422 | yes |
| Decides, not reached across a boundary (carried from ca60cca) | `web/src/lib/battleLog.ts` | own layer C44 | yes |
| Decides, reached across a boundary (carried from ca60cca) | `api/internal/battle/rules.go` | own layer C25 · boundary C7-C31 | yes |
| Decides, reached across a boundary (carried from ca60cca) | `api/internal/battle/handlers.go` guards | boundary C15-C19, C32, C33 | yes |
| Instrumentation, pass-throughs (carried from ca60cca) | `catalog.go` accessors, `db.go`, `types.ts` | consumers C1-C40 | yes |

## Faults injected

Verified at 817d2f6. Setup:

- **Scope.** The fix touches two web decision surfaces through their new tests, and two api comments that carry no fault surface. So every fault targets `web/src/components/BattleScene.tsx`. The api mutants from round 3 are carried from ca60cca, because no api code or api test changed.
- **Isolation.** Every fault ran in `git worktree add --detach .../scratchpad/wt4 HEAD`. The real `web/node_modules` was symlinked in, and `next-env.d.ts` and `.next/types` were copied in.
- **Suite.** The unmutated baseline in the worktree passed 134/134. Each mutant passed `tsc --noEmit` with exit 0 and was run against the whole `npx vitest run` suite.
- **Reverts.** Each mutant was reverted with `git checkout -- .`, and `git diff --exit-code` exited 0 after every revert.
- **Real tree.** `git status --porcelain` read `?? .claude/` before and after, and `diff` showed the two identical. `git diff --exit-code` exited 0 on the real tree. `git stash` was never used (`git stash list` is empty). The worktree was removed with `git worktree remove --force` and pruned.

| Mutation | Location | Killed |
| --- | --- | --- |
| F4 (round-3 survivor) - command disabled at `sp <= cost` instead of `sp < cost` | `web/src/components/BattleScene.tsx:119` | yes - `SP equal to cost pays` FAIL at `BattleScene.test.tsx:68`. 1 failed, 133 passed |
| F5 (round-3 survivor) - `NOVO ENCONTRO` rendered in every state (`{(active OR !active) && ...}`) | `web/src/components/BattleScene.tsx:98` | yes - `active fight hides new encounter` FAIL at `BattleScene.test.tsx:77`. 1 failed, 133 passed |
| boundary shifted the other way - `(battle?.sp ?? 0) + 1 < c.cost`, which enables a command at SP == cost - 1 | `web/src/components/BattleScene.tsx:119` | yes - `lists commands with costs` FAIL, with F1 (12) enabled at SP 11. 1 failed, 133 passed. C57 does not see it, so the SP < cost row rests on C42 |
| `NOVO ENCONTRO` shown unless won (`battle?.status !== "won"`) | `web/src/components/BattleScene.tsx:98` | yes - `active fight hides new encounter` and `won shows RESOLVIDO and new encounter` FAIL. 2 failed, 132 passed |
| F7 swallow, hardcoded starting inventory, sort removal (carried from ca60cca) | `api/internal/player/player.go`, `player/handlers.go:99` | yes - the killing tests and the api code are unchanged since ca60cca |

## Gate

Whole-suite exit codes at 817d2f6:

- `cd api && go test -count=1 ./...` - exit 0 (8 packages ok: auth, battle, catalog, deploy, httpx, player, skills, world)
- `cd web && npx vitest run` - exit 0 (12 files, 134 passed)
- `cd web && npx eslint` - exit 0
- `cd web && npx tsc --noEmit` - exit 0
- `cd web && npx playwright test` - exit 0 (6 passed)
- `make ci-build` - exit 0
- `make check-deps` - exit 0 (`deps ok`)

Ranked remaining gaps: none.

Two notes, neither failing:

1. **C58 rests on an inferred complement.** AC 35 and AC 36 name only the states where `NOVO ENCONTRO` appears. A future plan revision could state "not during an active fight" explicitly.
2. **The `ETag` of `GET /api/catalog` follows an edited `Version`.** Under `NewWithCatalog` the header would change while the body stays embedded (`catalog.go:336` vs `:344`). No test edits `Version`.
