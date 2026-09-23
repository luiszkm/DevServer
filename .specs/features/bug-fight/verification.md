# Bug fight verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 6a7dddc..d5d4ccc22847815cb2809022805f24887b97c864
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 53 checks have a located assertion at HEAD d5d4ccc and every proof passes. Every whole suite exits 0. The feature still fails, for three reasons:

- Two of the five injected faults survived.
- The coverage recompute found members with no proof: the command description in the scene (AC 31), the `item` event's `item` field (door 5), the transaction and the 500 path for the new starting-item INSERT in `POST /api/players`, the inventory-load 500 on `WithLocked` routes, and door 1's `escudo`, which has no column.
- One `Test policy` row is unmet.

Earlier features still hold. The full Go, vitest and Playwright suites are green. The only earlier test that changed is foundation C28 in `web/src/components/ComingSoon.test.tsx:7-10`, and its set shrank to `/loja`, `/avatar` exactly as the plan's Impact says. The other earlier-feature test change is additive: `web/src/test/helpers.ts:77` gives the default player an inventory.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only and the profile is `standard` | - | - |

For reference, I compared the prototype `docs/DevServer RPG.html:382` (`battleThemes`, `cmdDefs`, `itemDefs`) with `api/catalog/combat.json` and with the C37 expectations. The enemies, command damage, costs and labels, and the item names, glyphs, rarities and restores all match.

## Checks

Verified at d5d4ccc. The proofs ran in three batched invocations:

- api: `cd api && go test -count=1 -v ./internal/battle ./internal/catalog -run '^(TestStart_OR TestGet_ OR TestCommand_ OR TestTurn_ OR TestRules_ OR TestVictory_ OR TestDefeat_ OR TestItem_ OR TestInventory_ OR TestMigration_ OR TestTables_ OR TestRoutes_ OR TestCatalog_ServesCombat$)'` (the regex alternation is written here as OR). Exit 0. All 43 named tests appear individually as `--- PASS`, with C25 covering 4 `TestRules_*` tests.
- web: `cd web && npx vitest run src/components/BattleScene.test.tsx src/components/ComingSoon.test.tsx --reporter=verbose` - exit 0, 19 passed. Every `-t` pattern for C41-C52 appears as a passing test.
- e2e: `cd web && npx playwright test` - exit 0, 6 passed, including `e2e/battle.spec.ts:5:5 fight to victory`.

Every cited test was added in 6a7dddc..HEAD (`api/internal/battle/battle_test.go`, `rules_test.go`, `catalog_test.go:177-272`, `BattleScene.test.tsx`, `e2e/battle.spec.ts`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | vila start: 200, 60/60, 50/50, active, weakness false, player | `TestStart_CreatesBattle` PASS | `api/internal/battle/battle_test.go:147-148` `*got.Battle != want` with want `{vila 60 60 50 50 false active}`; `:151` `got.Player.HPMax != 100` | PASS |
| C2 | active same region resumes at 40/60 | `TestStart_ResumesActiveBattle` PASS | `api/internal/battle/battle_test.go:163` `got.Battle.EnemyHP != 40 OR got.Battle.EnemyHPMax != 60` | PASS |
| C3 | travel swaps to LOG WISP 70/70; after win a fresh enemy | `TestStart_ReplacesOtherRegionOrWonBattle` PASS | `api/internal/battle/battle_test.go:174` `Region != "floresta" OR EnemyHP != 70 OR EnemyHPMax != 70`; `:180` `Status != "active" OR EnemyHP != 70` | PASS |
| C4 | floresta SP max 55 / 63 / 81 | `TestStart_SPMaxIncludesSkillBonus` PASS | `api/internal/battle/battle_test.go:190` cases `{nil,55}`, `{f1,f2 -> 63}`, `{f1,f2,b1,b2,i1 -> 81}`; `:194` `got.SPMax != tc.spMax OR got.SP != tc.spMax` | PASS |
| C5 | GET 200 current, 404 battle_not_found without | `TestGet_CurrentOrNotFound` PASS | `api/internal/battle/battle_test.go:203` `f.status(..., 404, "battle_not_found")`; `:206` `rec.Code != 200`; `:209` `b.EnemyHP != 60` | PASS |
| C6 | each of 6 regions gets its enemy HP/SP | `TestStart_EveryRegionEnemy` PASS | `api/internal/battle/battle_test.go:217` map over all 6 regions; `:220` `b.Region != region OR b.EnemyHP != hpsp[0] OR b.SPMax != hpsp[1]` | PASS |
| C7 | FIX draw 6/0: enemy 40, SP 45, HP 93 | `TestCommand_DamageCostCounterRegen` PASS | `api/internal/battle/battle_test.go:230` `Push(6, 0)`; `:232` `EnemyHP != 40 OR SP != 45 OR HP != 93` | PASS |
| C8 | TEST then FIX 20 = 36 weakness true; next 20 false | `TestCommand_WeaknessMultipliesOnce` PASS | `api/internal/battle/battle_test.go:244` `e.Amount != 36 OR !e.Weakness`; `:249` `e.Amount != 20 OR e.Weakness` | PASS |
| C9 | f3 10%: 22; with weakness 40 | `TestCommand_DamageBonusFromSkills` PASS | `api/internal/battle/battle_test.go:262` `e.Amount != 22`; `:267` `e.Amount != 40` | PASS |
| C10 | REFACTOR +18, capped at 100 | `TestCommand_HealCapped` PASS | `api/internal/battle/battle_test.go:278` `HP != 50+18-7`; `:283` `HP != 100-7` | PASS |
| C11 | shield 14 -> 7, 13 -> 7; next turn 14 | `TestCommand_ShieldHalvesOneCounter` PASS | `api/internal/battle/battle_test.go:292` `{7: 7, 6: 7}`; `:296` `c.Amount != want OR !c.Blocked`; `:302` `c.Amount != 14 OR c.Blocked` | PASS |
| C12 | PLAIN 40 -> 48; 49 -> 50 | `TestCommand_PlainRestoresSPCapped` PASS | `api/internal/battle/battle_test.go:313` `Events[1].Type != "sp" OR Amount != 3 OR SP != 48`; `:317` `SP != 50` | PASS |
| C13 | counter draw 0 = 7, draw 7 = 14; regen capped | `TestCommand_CounterRange` PASS | `api/internal/battle/battle_test.go:326` `{0: 7, 7: 14}`; `:330` `c.Amount != want OR HP != 100-want`; `:335` `SP != 50` | PASS |
| C14 | events order per base command with fields | `TestCommand_EventsInOrder` PASS | `api/internal/battle/battle_test.go:345-350` want table; `:354` `reflect.DeepEqual(types(got.Events), want[id])`; `:357` fix `Command != "fix" OR Amount != 14`; `:360` heal `Amount != 18`; `:363` counter 4 or 7 | PASS |
| C15 | SP 5 and 9: 409 not_enough_sp, unchanged; SP 10 plays -> 5 | `TestCommand_NotEnoughSP` PASS | `api/internal/battle/battle_test.go:376` `f.status(..., 409, "not_enough_sp")`; `:377` `after != before` snapshot; `:382` `SP != 5` | PASS |
| C16 | f1 locked 409 command_locked; unlocked 200 | `TestCommand_SkillCommandNeedsSkill` PASS | `api/internal/battle/battle_test.go:391` `409, "command_locked"`; `:393` `f.turn` fatals unless 200 (`:112`) | PASS |
| C17 | hadouken 422 unknown_command | `TestCommand_Unknown` PASS | `api/internal/battle/battle_test.go:400` `422, "unknown_command"` | PASS |
| C18 | no battle: commands and items 404 | `TestTurn_NoBattle` PASS | `api/internal/battle/battle_test.go:406-407` `404, "battle_not_found"` both routes | PASS |
| C19 | won: commands and items 409 battle_over | `TestTurn_BattleOver` PASS | `api/internal/battle/battle_test.go:416-417` `409, "battle_over"` both routes | PASS |
| C20 | ROLLBACK: battle null, fled, no counter or reward; GET 404 | `TestCommand_RollbackEndsBattle` PASS | `api/internal/battle/battle_test.go:425` `Battle != nil OR types != [fled] OR HP != 100 OR XP != 0`; `:428` `404, "battle_not_found"` | PASS |
| C21 | client damage/hp ignored | `TestCommand_IgnoresClientNumbers` PASS | `api/internal/battle/battle_test.go:436` body with `"damage": 999, "hp": 1`; `:437` `Amount != 14 OR EnemyHP != 46 OR HP != 93` | PASS |
| C22 | 3 concurrent FIX: 18, SP 35, HP 79 | `TestCommand_ConcurrentTurnsSerialize` PASS | `api/internal/battle/battle_test.go:459` codes `[200 200 200]`; `:463` `EnemyHP != 18 OR SP != 35 OR HP != 79` | PASS |
| C23 | 9 skill commands: cost, min/max damage, b2 heal, i1 weakness, i2 shield | `TestCommand_EverySkillCommand` PASS | `api/internal/battle/battle_test.go:478-480` all 9; `:494` `SP != 200-tc.cost+5`; `:500` damage `want` at min and max draw; `:504` heal; `:507` weakness; `:510` blocked | PASS |
| C24 | base costs 10/8/14/0/0 | `TestCommand_BaseCosts` PASS | `api/internal/battle/battle_test.go:524` map `fix 10, test 8, refactor 14, plain 0`; `:529` `SP != 30-cost+gain+5`; `:533-534` rollback accepted at SP 0 | PASS |
| C25 | own layer: weakness 14->25, 15->27, 17->31; 10% of 25 -> 28; shield 7->4, 14->7; SP bounds incl. PLAIN on a defeat turn | `TestRules_*` (4) PASS | `api/internal/battle/rules_test.go:30` `{14: 25, 15: 27, 17: 31, 20: 36}`, `:32` `dmg != want OR !used OR st.Weak`; `:44` `{25, 10, 28}`; `:54` `{7: 4, 8: 4, 13: 7, 14: 7}`; `:69` `SP != 50`; `:79` `SP < 0`; `:85` `!out.Defeated OR st.SP != 50` | PASS |
| C26 | enemy 10 -> 0: won, no counter, +90 XP +40 coins +1 gem, events damage/victory/reward | `TestVictory_CreditsReward` PASS | `api/internal/battle/battle_test.go:544` `Status != "won" OR EnemyHP != 0`; `:547` events `[damage victory reward]`; `:550` reward `90/40/1`; `:553` `XP != 90 OR Coins != 140 OR Gems != 21 OR HP != 100` | PASS |
| C27 | XP 450 -> level 2, 40/750, levelsGained 1 | `TestVictory_LevelsUpThroughGainXP` PASS | `api/internal/battle/battle_test.go:566` `Level != 2 OR XP != 40 OR XPMax != 750 OR LevelsGained != 1` | PASS |
| C28 | drop 64 adds null_shard, 65 does not | `TestVictory_DropChanceBoundary` PASS | `api/internal/battle/battle_test.go:582` `{64: 1, 65: 0}`; `:588` `quantity(got, "null_shard") != want`; `:591` drop event item | PASS |
| C29 | potion 29 adds sp_potion, 30 does not | `TestVictory_PotionChanceBoundary` PASS | `api/internal/battle/battle_test.go:599` `{29: 3, 30: 2}`; `:604` `quantity(..., "sp_potion") != want` | PASS |
| C30 | HP 7 vs 7: respawn vila full HP, battle null, defeat; HP 8 -> 1 | `TestDefeat_RespawnAtVila` PASS | `api/internal/battle/battle_test.go:617` `Battle != nil OR HP != 100 OR Region != "vila" OR XP != 0`; `:620` `[damage counter defeat]`; `:623` 404; `:629` `Battle == nil OR HP != 1` | PASS |
| C31 | sp_potion 2 -> 1, +30 capped, counter; hp_potion +40 capped | `TestItem_PotionsRestoreAndCostTurn` PASS | `api/internal/battle/battle_test.go:640` `qty != 1 OR SP != 45 OR HP != 93`; `:643` `[item counter]`, `Stat != "sp" OR Amount != 30`; `:647` `SP != 50`; `:652` `HP != 63 OR qty != 1`; `:656` `HP != 93` | PASS |
| C32 | hp_potion with none: 409 no_item, unchanged | `TestItem_NoItem` PASS | `api/internal/battle/battle_test.go:666` `409, "no_item"`; `:667` `after != before` | PASS |
| C33 | null_shard and x: 422 unknown_item | `TestItem_UnknownOrNotUsable` PASS | `api/internal/battle/battle_test.go:676-677` `422, "unknown_item"` | PASS |
| C34 | new player inventory `[sp_potion 2]` in POST /api/players and GET /api/me; catalog order; 0 dropped | `TestInventory_InEveryPlayer` PASS | `api/internal/battle/battle_test.go:691` POST `DeepEqual(*got, want)`; `:694` GET same; `:705` order `[null_shard sp_potion hp_potion]`; `:713` sp_potion absent after 2 uses | PASS |
| C35 | pre-00004 player gets 2 sp_potion | `TestMigration_GivesExistingPlayersPotions` PASS | `api/internal/battle/battle_test.go:741` `MigrateTo(..., 3)`; `:753` `MigrateTo(..., 4)`; `:757` `qty != 2` | PASS |
| C36 | quantity -1 check_violation; second battle and second (player,item) unique_violation | `TestTables_Constraints` PASS | `api/internal/battle/battle_test.go:774` `!= "23514"`; `:779` `!= "23505"`; `:782` `!= "23505"` | PASS |
| C37 | catalog serves enemies 6, commands 14, items 8, combat rules | `TestCatalog_ServesCombat` PASS | `api/internal/catalog/catalog_test.go:219` `len(b.Enemies) != 6`; `:223` per-enemy string vs table, glyph non-empty; `:236` `len != 14`; `:245` per-command string, hint non-empty; `:255` `len != 8`; `:263` per-item string; `:268-269` counter, spRegen, multiplier, victory, chances, potion | PASS |
| C38 | 4 routes: 401, 404 player_not_found, 500 internal with request_id log; GET /api/me 500 with player_items gone | `TestRoutes_SessionPlayerAndUnexpected` PASS | `api/internal/battle/battle_test.go:801` `401 unauthenticated`; `:804` `404 player_not_found`; `:813` `500 internal`; `:817` log has request_id; `:822` GET /api/me `500 internal` | PASS |
| C39 | malformed JSON and numeric command/item: 422 invalid_body on both | `TestTurn_InvalidBody` PASS | `api/internal/battle/battle_test.go:831-833` both paths x both bodies, `Code != 422 OR ErrorCode != "invalid_body"` | PASS |
| C40 | FIX waits for FOR UPDATE holder and reads its SP | `TestCommand_SerializesOnPlayerRowLock` PASS | `api/internal/battle/battle_test.go:858` fatal if answered while locked; `:861` holder sets SP 50 from 0; `:869` `code != 200` | PASS |
| C41 | opens, POSTs start, shows region, name, level, HP, weakness | `starts and shows the enemy` PASS | `web/src/components/BattleScene.test.tsx:36` `ENCONTRO · VILA LOCALHOST`; `:37-40` `NULL SLIME`, `Lv.3`, `HP 60/60`, `fraqueza: null-check`; `:41` `calls("POST /api/me/battle")).toBe(1)` | PASS |
| C42 | order and costs; REFACTOR and MARKUP disabled at SP 11 | `lists commands with costs` PASS | `web/src/components/BattleScene.test.tsx:51` ids `[fix test refactor plain f1 rollback]`; `:52-53` cost texts; `:55` refactor, f1 disabled; `:56` others enabled. Precision gap: only the FIX label is asserted (`:54`), not the `</> MARKUP` label named in the claim | PASS |
| C43 | hero HP 80/100, SP 40/50, potions x2 / x0 disabled; click posts `{item: sp_potion}` | `shows hero bars and potions` PASS | `web/src/components/BattleScene.test.tsx:69-70` hero HP/SP; `:71-72` potion texts; `:73` `hp_potion` disabled; `:77` body `toEqual({ item: "sp_potion" })` | PASS |
| C44 | every event type -> pt-BR line; log keeps 6 | `writes events to the log` PASS | `web/src/components/BattleScene.test.tsx:82-98` 15 cases (14 types, reward with and without level); `:109` last line `toBe(text)`; `:111` `toHaveLength(6)` | PASS |
| C45 | turn passes player to HUD, updates enemy HP and SP | `turn updates player and battle` PASS | `web/src/components/BattleScene.test.tsx:123` `HP 40/60`; `:124` `SP 45/50`; `:125` `setPlayer` `toHaveBeenLastCalledWith(after)` | PASS |
| C46 | won: RESOLVIDO, NOVO ENCONTRO restarts full HP | `won shows RESOLVIDO and new encounter` PASS | `web/src/components/BattleScene.test.tsx:135` `RESOLVIDO`; `:136-137` actions disabled; `:139` `HP 60/60`; `:140` RESOLVIDO gone; `:141` 2 starts | PASS |
| C47 | battle null after fled/defeat: ENCONTRO ENCERRADO and NOVO ENCONTRO | `ended shows new encounter` (2) PASS | `web/src/components/BattleScene.test.tsx:152` `ENCONTRO ENCERRADO`; `:153` `NOVO ENCONTRO`; `:154` log line; `:156` fix disabled | PASS |
| C48 | pending turn disables commands and potions | `disables actions while a turn is pending` PASS | `web/src/components/BattleScene.test.tsx:164` every `[data-command], [data-item]` `toBeDisabled()` | PASS |
| C49 | 409 message, no-body fallback, network -> log; state and setPlayer unchanged | `turn error goes to the log` (3) PASS | `web/src/components/BattleScene.test.tsx:169-171` 3 texts; `:179` `findByText(text)`; `:180-181` HP 60/60, SP 50/50; `:182` `setPlayer` not called | PASS |
| C50 | CARREGANDO...; 500 and network -> SERVIDOR FORA DO AR, TENTAR DE NOVO retries | `loading and load failure` (3) PASS | `web/src/components/BattleScene.test.tsx:190` `CARREGANDO...`; `:199` `SERVIDOR FORA DO AR`; `:202` `calls(...)).toBe(2)` | PASS |
| C51 | catalog-mocked names BUG DE TESTE and PATCH shown | `enemy and commands come from catalog` PASS | `web/src/components/BattleScene.test.tsx:214` `BUG DE TESTE`; `:215` `PATCH`; `:216` intro log | PASS |
| C52 | /bug-fight renders the scene, no EM BREVE | `bug-fight page renders the scene` PASS | `web/src/components/BattleScene.test.tsx:227` `inimigo` present; `:228` `EM BREVE` absent | PASS |
| C53 | browser: new dev fights to RESOLVIDO, HUD 90/500 | `e2e/battle.spec.ts:5:5 fight to victory` PASS | `web/e2e/battle.spec.ts:22` `RESOLVIDO` visible; `:23` log `NULL SLIME resolvido`; `:24` HUD `toContainText("90/500")` | PASS |

## Coverage

I rebuilt the sets from the plan's Surface, Landing and ACs and from the code in the diff range. I did not read them off the checks' table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `GET /api/me/battle` statuses (4) | plan Surface; `api/internal/battle/handlers.go:68-82` | 200 C5 · 401 C38 · 404 C5 (battle_not_found), C38 (player_not_found) · 500 C38 | - |
| `POST /api/me/battle` statuses (4) | plan Surface; `handlers.go:84-112` | 200 C1 · 401 C38 · 404 C38 · 500 C38 | - |
| `POST /api/me/battle/commands` statuses (6) | plan Surface; `handlers.go:156-178` | 200 C7 · 401 C38 · 404 C18, C38 · 409 C15, C16, C19 · 422 C17, C39 · 500 C38 | - |
| `POST /api/me/battle/items` statuses (6) | plan Surface; `handlers.go:180-202` | 200 C31 · 401 C38 · 404 C18, C38 · 409 C19, C32 · 422 C33, C39 · 500 C38 | - |
| JSON routes owing invalid_body (2) | routes calling `httpx.DecodeJSON` in the diff: `handlers.go:160`, `:184` | commands C39 · items C39 | - |
| routes that gained a query -> 500 proof (8 groups) | diff: `battle` handlers, `player.Get` `player.go:113`, `WithLocked` `player.go:199`, `Handlers.insert` `player/handlers.go:85-103` | 4 battle routes C38 · GET /api/me (inventory in `Get`) C38 `battle_test.go:822` · POST /api/players starting-item INSERT: none · `WithLocked` routes (travel, deploys start/claim, skills unlock) with inventory load failing: none | POST /api/players starting-item INSERT (no 500 proof and no proof that the player row rolls back; F3 survived) · inventory-load failure under `WithLocked` (`player.go:199`), no route asserts it |
| player creation transaction (Impact) (1) | plan Impact "grava jogador e itens iniciais numa transação"; `player/handlers.go:85-103` | none - no test makes the item insert fail | atomicity of player plus starting items |
| regions x enemies (6) | `api/catalog/combat.json:3-8` | C6 `battle_test.go:217` over all 6 · C37 `catalog_test.go:223` | - |
| skill commands (9) | `combat.json:15-23` | C23 over all 9 | - |
| base commands (5) | `combat.json:11-14,24` | C24 fix/test/refactor/plain `:524`, rollback `:533-534` | - |
| command effects (6) | `rules.go:82-107` | damage C7 · weakness C8 · heal C10 · shield C11 · spGain C12 · flee C20 | - |
| new error codes (7) | Landing door 6; `api/internal/httpx/errors.go:43-49` | battle_not_found C5 · battle_over C19 · not_enough_sp C15 · command_locked C16 · no_item C32 · unknown_command C17 · unknown_item C33 | - |
| rounding points (3) | `rules.go:67`, `:71`, `:77` | C25 all three | - |
| chance boundaries (4) | `rules.go:139`, `:142` | 64 and 65 C28 · 29 and 30 C29 | - |
| defeat boundary (2) | `rules.go:156` | HP 7 and HP 8 C30 | - |
| `Battle` states (4) | door 1; migration `00004:21` CHECK | created C1 · active C2 · won C26 · deleted C20, C30 | - |
| usable / unusable items (4) | `handlers.go:188` | sp_potion C31 · hp_potion C31 · non-usable null_shard C33 · unknown x C33 | - |
| API event types (12) | Landing door 5; `rules.go` | damage C7/C14 · heal C14 · weakness C14 · shield C14 · sp C12 · item C31 · counter C11/C14 · victory C26 · reward C26 · drop C28 · defeat C30 · fled C20 | - |
| door 5 event fields (17) | Landing door 5 | damage command/amount C14, weakness C8 · heal amount C14 · sp amount C12 · item stat/amount C31 · counter amount C13, blocked C11 · reward xp/coins/gems C26, levelsGained C27 · drop item C28 · item.item: none (`battle_test.go:643` asserts `Stat` and `Amount` only) | `item` event field `item` (`rules.go:122`) |
| door 1 Battle fields (7) | Landing door 1 "região, HP do inimigo, SP e SP máximo, fraqueza, escudo e estado" | region, HP, SP, SP max, weakness, status C1 · escudo: no column in `api/migrations/00004_battle_inventory.sql:12-21` and no field in `State` `rules.go:18-26` | escudo (the door literal names it, the stored shape lacks it; amend the door or the table) |
| door 2 PlayerItem rules (3) | Landing door 2 | CHECK >= 0 C36 · only quantity > 0 C34 · catalog order C34 | - |
| door 4 catalog fields (enemies 8, commands 11, items 6, rules 7) | Landing door 4 | C37 `catalog_test.go:223`, `:245`, `:263`, `:268-269` (glyph, hint and description only non-empty) | - |
| command button contents (AC 31) (4) | AC 31 "rótulo, descrição e custo", disabled | label C42 `:54` (FIX only), C51 `:215` · cost C42 `:53` · disabled C42 `:55` · description (hint): none, search `rg hint web/src/components/*.test.tsx web/e2e` finds no assertion | command description (`BattleScene.tsx:123`; F5 survived) |
| potion buttons (AC 32) (3) | `BattleScene.tsx:127-141` | name and quantity C43 `:71-72` · disabled at 0 C43 `:73` · posts item C43 `:77` | - |
| event types on screen (14) | `web/src/lib/battleLog.ts:8-33` | C44, table over all 14 plus both ternaries (weakness, blocked, levelsGained) | - |
| screen states (6) | `BattleScene.tsx:61-166` | loading C50 · load error C50 · active C41 · won C46 · ended C47 · pending C48 | - |
| turn outcomes on screen (4) | `BattleScene.tsx:49-57` | 200 C45 · error with message C49 · no body C49 · network C49 | - |
| startup config: rand (2 assemblies) | `api/cmd/api/main.go:53` `Rand: battle.DefaultRand`; `api/internal/apptest/apptest.go:116` `Rand: rnd` | read directly; C7 goes through the apptest assembly | - |
| `Swept` existing rows (2) | `api/internal/app/router.go:60-74`; foundation GameShell | `/api/me/battle*` routes are inside the `RequireSession` group `router.go:61,71-74` (C38 401) · unauthorised screen is existing GameShell 401 | - |

Branches with no asserted case that I judged unreachable or outcome-equivalent. They are notes, not unproven members:

- `handlers.go:97-98` (no enemy for the region): every region in `regions.json` has an enemy.
- `router.go:50-52` (nil `Rand` fallback): `main.go:53` always sets `Rand`.
- `catalog.go` `ItemPosition` unknown-id branch.
- `BattleScene.tsx:45` `if (!battle) return`: buttons are disabled whenever `!active`.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `api/internal/battle/rules.go` (Hit, Shielded, ApplyCommand, UseItem, EndTurn) | own layer C25 · boundary C7-C31 | yes - each rule row has an asserted case at both levels |
| Decides, reached across a boundary | `api/internal/battle/handlers.go` guards (won, locked, SP, unknown, item) | boundary C15-C19, C32, C33 | yes |
| Decides, reached across a boundary | `api/internal/player/player.go` (`AddItem` insert-or-update, `loadInventory` filter and order, `Quantity`) | boundary C28, C31, C34, C36 | yes |
| Entry point that decides nothing | `api/internal/player/handlers.go` `Create` / `insert` (changed: now one transaction with starting items) | accepted input C34 · each error path | no - the starting-item INSERT error path and its rollback have no proof (F3 survived) |
| Decides, not reached across a boundary | `web/src/lib/battleLog.ts` (event mapping table) | own layer C44 | yes - all 14 rows plus the 3 ternaries |
| Decides, not reached across a boundary | `web/src/components/BattleScene.tsx` (states, filters, disabled rules, cost text) | screen level C41-C52 · browser C53 | yes - every decision row is asserted; the unasserted hint text is a rendered field and is recorded under Coverage |
| Instrumentation, pass-throughs | `api/internal/catalog/catalog.go` accessors, `api/internal/apptest/apptest.go` Rand, `api/internal/db/db.go` MigrateTo, `api/internal/app/router.go` wiring, `web/src/lib/types.ts` | none of its own; consumers C1-C40 | yes |

## Faults injected

I isolated every fault in a `git worktree add --detach` scratch at HEAD under the scratchpad, with the real `web/node_modules` symlinked in. For `tsc`, the gitignored `next-env.d.ts` and `.next/types` were copied in. The real tree's `git status --porcelain` read `?? .claude/` before and after, and the two were identical. `git stash` was never used. The worktree was removed with `git worktree remove --force`. Each mutant passed `go vet` or `tsc --noEmit` (exit 0).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 defeat boundary `p.HP <= 0` -> `p.HP < 0` | `api/internal/battle/rules.go:156` | yes - `TestDefeat_RespawnAtVila` FAIL at `battle_test.go:618` |
| F2 resume condition drops `&& cur.Status == "active"` | `api/internal/battle/handlers.go:92` | yes - `TestStart_ReplacesOtherRegionOrWonBattle` FAIL at `battle_test.go:181` |
| F3 player creation split into two transactions (commit player, then insert starting items in a new tx) | `api/internal/player/handlers.go:85-103` | no - survived the whole api suite (`go test -count=1 ./...` all ok) |
| F4 log keeps 7 lines instead of 6 (`slice(-6)` -> `slice(-7)`) | `web/src/components/BattleScene.tsx:19` | yes - `writes events to the log` FAIL |
| F5 command button drops the hint text (only cost shown) | `web/src/components/BattleScene.tsx:123` | no - survived all 17 tests in `BattleScene.test.tsx` |

## Gate

Whole-suite exit codes at d5d4ccc:

- `cd api && go test -count=1 ./...` - exit 0. 8 packages ok and 128 `--- PASS` lines, subtests included.
- `cd web && npx vitest run` - exit 0, 12 files, 132 passed.
- `cd web && npx eslint` - exit 0.
- `cd web && npx tsc --noEmit` - exit 0.
- `cd web && npx playwright test` - exit 0, 6 passed.
- `make ci-build` - exit 0.
- `make check-deps` - exit 0 (`deps ok`).

Ranked gaps:

1. The player-creation transaction and the new starting-item INSERT have no proof. There is no 500 proof and no rollback proof, and F3 survived. `api/internal/player/handlers.go:85-103`
2. AC 31 command description (hint) is rendered but never asserted, and F5 survived. `web/src/components/BattleScene.tsx:123`
3. Door 5 `item` event field `item` is not asserted at the API. `api/internal/battle/rules.go:122`; `api/internal/battle/battle_test.go:643` asserts only `Stat` and `Amount`.
4. Door 1 names `escudo` as a stored Battle field, but `battles` has no such column. `api/migrations/00004_battle_inventory.sql:12-21`. The behaviour is correct because the shield is per-turn (AC 9), so either amend the door or add the column.
5. No route asserts the inventory-load failure under `WithLocked`. `api/internal/player/player.go:199`. The outcome is likely a 500 anyway, because the aborted transaction fails the next statement, but no test pins it.
6. Precision and drift notes, not failing on their own:
   - The C42 claim names the `</> MARKUP` label, but only the FIX label is asserted (`BattleScene.test.tsx:54`).
   - `/api/catalog` also serves `combat.startingItems`, which is not in the door 4 literal (`api/catalog/combat.json:44`, `api/internal/catalog/catalog.go` `CombatRules`).
   - Door 3 spells `Intn`, while the interface is `IntN` (`api/internal/battle/rules.go:14`), which matches `math/rand/v2`.

`python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py bug-fight` - exit 1. That is the expected result for a report whose own rows are FAIL:

```
  ERROR bug-fight: verdict is FAIL - route the ranked gaps back as fixes, then re-verify

validate_verification: 1 error(s), 0 warning(s) across [bug-fight]
```
