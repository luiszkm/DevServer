# Shop, inventory and avatar verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: d783bb1..025661e00c19702b9e6909453af8a2f37ad58868
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 47 proofs ran at HEAD 025661e and passed. Each named test exists, appears individually as passing, and has a located assertion that targets the check's value. Every whole suite exits 0.

The feature still fails at `standard`, for two reasons:

- **Seven faults survived** out of 36 injected; one more (A15) was equivalent.
- **Three Coverage sets have unproven members**, and the `Test policy` row for web screens is unmet.

All survivors are in web decision branches. The api side killed every fault injected on it (18 of 18 valid ones).

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only and the profile is `standard`. `docs/DevServer RPG.html` is listed in `Sources` as the reference, not as binding | - | - |

## Checks

How the proofs ran, all at 025661e:

- **api:** `cd api && go test -count=1 -v ./internal/catalog ./internal/shop ./internal/battle ./internal/player -run '^(TestCatalog_ServesShop OR TestCatalog_ServesCombat OR TestMe_ShopFields OR ... OR TestMigration_ExistingPlayers)$'`. The regex alternation is written here as OR. All 30 named tests printed `--- PASS`, and all 4 packages printed `ok`.
- **web:** `cd web && npx vitest run --reporter=verbose` - 14 files, 173 passed. Every `-t` pattern for C28-C44 and C46 matched at least one passing test:
  - C30 matches 3 tests.
  - C31 matches 4 `it.each` rows.
  - C32 matches 6 rows.
  - C33 matches 3 rows.
  - C41 matches 4 tests.
  - C42 matches 2 tests.
  - C44 matches 2 rows.
  - C46 matches 7 rows plus `Tabs > tab order and routes`.
- **e2e:** `cd web && npx playwright test` - 7 passed, including `e2e/shop.spec.ts:5:5 buy and wear`.
- **Diff check:** every proof resolves to a test added or edited in `d783bb1..HEAD`. The exception is `Tabs.test.tsx` (C46, second proof), which is existing and untouched. It is still the right proof, because C46 claims the 7 tabs stay the same.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog: 6 gear, 4 skins, 4 slots, 3 prices, null_shard unpriced | `TestCatalog_ServesShop` PASS | `api/internal/catalog/catalog_test.go:325` `got != slots[i]`; `:347` `got != gear[i]` over the 6 literal rows; `:371` `got != skins[i]`; `:376` default filter `none`; `:391` price per item; `:393` `null_shard && it.Price != nil` | PASS |
| C2 | `/api/me` gear order, 4-key equipment, skins | `TestMe_ShopFields` PASS | `api/internal/shop/shop_test.go:175` `wantList(gear, ["macbook","cafe"])`, where cafe was bought first; `:176` equipment; `:177` skins; `:183` raw JSON `{"setup":"macbook","bebida":nil,...}` | PASS |
| C3 | new player gear [], 4 null slots, skins [default], skin default | `TestCreatePlayer_ShopDefaults` PASS | `shop_test.go:198` `got.Gear == nil OR len != 0`; `:201` 4 null slots; `:204` skins; `:208` body contains `"gear":[]` | PASS |
| C4 | items: gems 5 / sp 3; 0 / hp 1; 0 / boost 1 | `TestBuyItem_PaysAndAdds` PASS | `shop_test.go:217`, `:222`, `:227` gems and qty literals | PASS |
| C5 | cafe coins 50, equipped; monitor replaces macbook | `TestBuyGear_PaysOwnsEquips` PASS | `shop_test.go:236`, `:240`, `:247`, `:250-251`; `:252` stored equipment | PASS |
| C6 | neon gems 0, skins, skin neon | `TestBuySkin_PaysOwnsWears` PASS | `shop_test.go:262`, `:265`, `:266` | PASS |
| C7 | balance boundary gems/coins by route, test catalog in coins | `TestBuy_BalanceBoundary` PASS | `shop_test.go:276-277` 409 code plus unchanged snapshot; `:284`, `:286` (15 pays → 0), `:291`, `:293`, `:298`, `:300`, `:310`, `:312` | PASS |
| C8 | already_owned for cafe, neon and default; nothing changes | `TestBuy_AlreadyOwned` PASS | `shop_test.go:325` `409 already_owned`; `:326` snapshot unchanged | PASS |
| C9 | unknown_item / unknown_gear / unknown_skin 422 | `TestBuy_Unknown` PASS | `shop_test.go:335-337` | PASS |
| C10 | null_shard 422 not_for_sale, balance unchanged | `TestBuyItem_NotForSale` PASS | `shop_test.go:344-345` | PASS |
| C11 | equip macbook over monitor; repeat is the same player | `TestEquipGear_ReplacesSlot` PASS | `shop_test.go:357`; `:362` `DeepEqual(again, got)`; `:365` snapshot | PASS |
| C12 | unequip cafe: bebida null, gear keeps cafe; repeat no change | `TestUnequipGear_ClearsSlot` PASS | `shop_test.go:375`, `:378`, `:382`, `:385` | PASS |
| C13 | wear default then neon; stored | `TestEquipSkin_Wears` PASS | `shop_test.go:394`, `:397`, `:400` | PASS |
| C14 | not_owned 409 on gear and skin; unknown 422 on equip, unequip and skin | `TestEquip_NotOwnedOrUnknown` PASS | `shop_test.go:414-418` table; `:421` status and code; `:422` snapshot | PASS |
| C15 | HP 115/115 → 130/130 → 100/100; 1/100 floor; golden 120 and neon back to 100 | `TestHPBonus_EquipAndRemove` PASS | `shop_test.go:434` response and `:437` stored; steps `:441`, `:442`, `:443`, `:446`, `:448`, `:450`, `:451` | PASS |
| C16 | SP 80/80 with f2, cafe equipped, monitor owned but not equipped, shadow | `TestStart_SPMaxIncludesGearAndSkin` PASS | `api/internal/battle/battle_test.go:938` `got.SP != 80 OR got.SPMax != 80` | PASS |
| C17 | FIX roll 6 = 24; fone removed = 23 | `TestCommand_DamageBonusFromGearAndSkin` PASS | `battle_test.go:955` `e.Amount != 24`; `:962` `e.Amount != 23` | PASS |
| C18 | `player.Bonus` per source and type, exclusions | `TestBonus_SumsSources` PASS | `api/internal/player/bonus_test.go:27-35` table (10, 8, 5, 30, 45, 0, 0, 0, 0); `:37` `got != tc.amount` | PASS |
| C19 | discard sp 2 → 1; null_shard leaves inventory | `TestDiscard_RemovesOne` PASS | `shop_test.go:457`, `:463` | PASS |
| C20 | unknown_item 422; hp_potion at 0 409 no_item | `TestDiscard_Rejects` PASS | `shop_test.go:475`, `:477-478` | PASS |
| C21 | NV.2 boost to T+15, not ready, boost 0, serverTime; NV.1 at T+5 clamped, ready | `TestBoost_CutsFifteenMinutes` PASS | `shop_test.go:520`, `:523`, `:526`, `:532` stored; `:546` clamp and ready | PASS |
| C22 | 404, 422, 409 deploy_ready, 409 no_item, nothing consumed | `TestBoost_Rejects` PASS | `shop_test.go:558-559` code plus snapshot (items and `ends_at`); `:563`, `:564`, `:567`, `:570` | PASS |
| C23 | 8 routes 401 unauthenticated | `TestShopRoutes_RequireSession` PASS | `shop_test.go:589` over `newRoutes` `:574-583` | PASS |
| C24 | player_gear gone: 500 internal, request_id and cause logged, player unchanged | `TestShop_LoadFailure` PASS | `shop_test.go:606`, `:617`, `:619`, `:628` | PASS |
| C25 | concurrent buys: one 200, one 409, gems 0, sp 3 | `TestBuy_ConcurrentSerialize` PASS | `shop_test.go:658`, `:661` | PASS |
| C26 | DB refuses duplicate gear, duplicate slot, unowned equipment, duplicate skin | `TestTables_ShopConstraints` PASS | `shop_test.go:681-684` expected 23505/23505/23503/23505; `:686` | PASS |
| C27 | 8 codes in the error envelope | `TestShop_ErrorCodes` PASS | `shop_test.go:700-707`; `:711` `len(body)==1`, 2 keys, code, non-empty message | PASS |
| C28 | LOJA header, GEMS 20, 3 sections in order, no EM BREVE | `shows the three sections` PASS | `web/src/components/ShopScene.test.tsx:40-53` (`:42` potion order, `:49` gear order, `:52` skins, `:53` no EM BREVE) | PASS |
| C29 | card bonus and status, 8 cards | `cards show bonus and status` PASS | `ShopScene.test.tsx:59-71` table; `:70-71` | PASS |
| C30 | detail rarity/slot, bonus, cost or already owned, buttons per state | `detail button per state` (3 tests) PASS | `ShopScene.test.tsx:82`, `:86-90`, `:98`, `:102`, `:105`, `:114`, `:120`, `:129-130` | PASS |
| C31 | 14/15 gems sp_potion; 49/50 coins cafe | `insufficient balance` (4) PASS | `ShopScene.test.tsx:135-138` rows; `:142-144` | PASS |
| C32 | 6 buttons → route, toast, setPlayer | `actions call their route` (6) PASS | `ShopScene.test.tsx:149-154`; `:161`, `:162`, `:164` | PASS |
| C33 | 409 message; 500 no body and network → connection copy | `action errors` (3) PASS | `ShopScene.test.tsx:177-180` | PASS |
| C34 | pending disables panel buttons | `pending disables panel` PASS | `ShopScene.test.tsx:189`, `:192-193`, `:195` - item and gear only, see gap 3 | PASS |
| C35 | preview filter, name, DEV SOMBRIO, HP máx 125, dano +18%, SP +30 | `preview and totals` PASS | `web/src/components/AvatarScene.test.tsx:50-51`, `:53`, `:55`, `:57`, `:58`, `:59` - every owned gear is equipped in the fixture, see gap 1 | PASS |
| C36 | slots left/right, filled and empty | `paper doll slots` PASS | `AvatarScene.test.tsx:67-68` arrangement; `:70-74` | PASS |
| C37 | 4 skins, golden aria-disabled, locked message without fetch, neon equips | `skin strip` PASS | `AvatarScene.test.tsx:83`, `:86`, `:89-90`, `:93-94` | PASS |
| C38 | 4 tabs, hints, tags per tab | `bag tabs` PASS | `AvatarScene.test.tsx:102`, `:104-105`, `:108-109`, `:112-113`, `:116-118` | PASS |
| C39 | detail actions and routes, each 200 passes the player on | `bag detail actions` PASS | `AvatarScene.test.tsx:136`, `:140`, `:144`, `:147`, `:151`, `:153`, `:156-157` | PASS |
| C40 | empty EQUIP tab shows MOCHILA VAZIA and the hint | `empty bag` PASS | `AvatarScene.test.tsx:164-166` | PASS |
| C41 | avatar errors and pending | `avatar errors and pending` (4) PASS | `AvatarScene.test.tsx:179-181`; `:189`, `:192` - DESCARTAR and REMOVER only, see gap 3 | PASS |
| C42 | ACELERAR · 1 → boost route; 0 → SEM ACELERADORES disabled; ready → no button | `boost button` (2) PASS | `web/src/components/DeployScene.test.tsx:307-310`, `:314`, `:320-321` | PASS |
| C43 | 29:00 → 14:00 after boost; setPlayer | `boost updates remaining` PASS | `DeployScene.test.tsx:339-341` | PASS |
| C44 | battle hero sprite with the neon filter / none | `hero sprite wears skin` (2) PASS | `web/src/components/BattleScene.test.tsx:261-262` | PASS |
| C45 | browser: buy cafe, toast, reload avatar, BEBIDA, 50 coins | `buy and wear` PASS | `web/e2e/shop.spec.ts:15`, `:16`, `:20`, `:22`, `:24` | PASS |
| C46 | 7 tabs unchanged; no route shows EM BREVE | `no scene shows EM BREVE` (7) and `tab order and routes` PASS | `web/src/components/ComingSoon.test.tsx:40-41`; `web/src/components/Tabs.test.tsx:13` | PASS |
| C47 | migration 00005 on an existing player: empty tables, skin default, `/api/me` 200 skins [default] | `TestMigration_ExistingPlayers` PASS | `shop_test.go:759`, `:777`, `:783`, `:786` | PASS |

Every check is PASS: each claim is proven as written. The failures below are about sets the checks sampled too thinly, not checks that went red.

## Coverage

Recomputed from the plan's criteria, `Surface`, `Landing` and `Relations`, not from the `checks.md` table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| AC 25 purchase buttons unable to pay, by kind × currency in the real catalog (4) | AC 25 "WHILE o saldo não paga o preço" applies to every purchase button in AC 24. The catalog has potions in gems, gear in gems and in coins, and skins in gems. `checks.md` sized this set by label (2), not by button | potion/gems C31 `ShopScene.test.tsx:135` · gear/coins C31 `:137` · gear/gems: none. `:95` says "the purchase label is covered by the rich player below" and asserts nothing; W2 survived · skin/gems: none; W1 survived | gear/gems (`ShopScene.tsx:158`), skin/gems (`ShopScene.tsx:188`, `:202`) |
| AC 28 / AC 35 pending disables panel buttons (8: shop COMPRAR, gear main, REMOVER EQUIPAMENTO, skin main; avatar EQUIPAR, REMOVER, VESTIR, DESCARTAR 1) | AC 28 "desabilitar os botões do painel"; AC 35 "ação pendente segue AC 28"; C34 and C41 both claim "os botões" | shop COMPRAR `:189` · gear main `:195` · REMOVER EQUIPAMENTO `:193` (W5 killed) · avatar REMOVER `AvatarScene.test.tsx:192` · DESCARTAR `:189` · shop skin main: none (W18 survived) · avatar EQUIPAR: none (W19 survived) · avatar VESTIR: none (W17 survived) | shop skin button (`ShopScene.tsx:202`), avatar EQUIPAR (`AvatarScene.tsx:202`), avatar VESTIR (`AvatarScene.tsx:218`) |
| AC 29 totals on screen: sources (3) plus the "equipados" exclusion (1) | AC 29 "somando skills, equipamentos equipados e skin". The web recomputes the sum in `web/src/lib/gear.ts:42-52` | skills, gear and skin: C35 `AvatarScene.test.tsx:57-58` · owned-not-equipped excluded: none. The C35 fixture equips all 3 owned pieces; W3 survived | exclusion of owned but unequipped gear (`gear.ts:48`) |
| Surface statuses, 8 new routes (46) | plan `Surface` | shop/items 200 C4, 401 C23, 409×2 C7, 422×2 C9 C10, 500 C24 · shop/gear 200 C5, 401, 409 gems/coins C7, 409 already_owned C8, 422 C9, 500 · shop/skins 200 C6, 401, 409 C7 C8, 422 C9, 500 · gear equip 200 C11, 401, 409 C14, 422 C14, 500 · unequip 200 C12, 401, 422 C14, 500 · skins equip 200 C13, 401, 409 C14, 422 C14, 500 · discard 200 C19, 401, 409 C20, 422 C20, 500 · boost 200 C21, 401, 404/409/409/422 C22, 500 C24 | - |
| `GET /api/me` statuses (4), `GET /api/catalog` (1) | plan `Surface` | 200 C2 · 401, 404 foundation · 500 C24 `shop_test.go:623` · catalog 200 C1 | - |
| catalog members: gear (6), skins (4), slots (4), priced items (3) plus 1 unpriced | AC 1; `api/catalog/shop.json`, `combat.json:33-35` | C1 table over literal rows `catalog_test.go:347`, `:371`, `:325`, `:391`, `:393`; A17 killed | - |
| player contract fields (3) and defaults | AC 2, AC 3, door 7 | C2 `:175-183` · C3 `:198-208`; A16 (sort removed) killed | - |
| balance boundary, api (by route and currency: item gems, item coins, gear gems, gear coins, skin gems) | AC 7 | C7 `shop_test.go:284-312`; A1 killed | - |
| HP transitions (equip, replace, remove, floor 1, skin swap) | AC 15, door 5; `shop.go:67-103` | C15 `:441-451`; A3, A4b, A5, A15b killed | - |
| bonus sources (3) × types (3), plus exclusions (2), api | AC 16, AC 17, door 6; `player.go` `Bonus` | C18 `bonus_test.go:27-35`, boundary C16 `battle_test.go:938`, C17 `:955`, `:962`; A8, A9 killed | - |
| boost outcomes (cut, clamp) and guards (404, ready, no_item, 422) | AC 20, AC 21, door 8; `deploy.go` `Boost` | C21 `:520`, `:546`; C22 `:563-570`; A10, A11 (exact end), A12 killed | - |
| idempotent and no-op paths (equip same, unequip not equipped, unequip other piece) | AC 11, AC 12 | C11 `:362`, C12 `:382`, extra `TestUnequipGear_OtherPieceInSlotStays` `:797`; A14 killed | - |
| new error codes (8) | door 10 | C27 `:700-711` | - |
| Landing doors (10) | plan `Landing` | 1, 2, 3 C26 `:681-684` (A18 FK drop killed) and C47 · 4 C1 · 5 C15 · 6 C18 plus battle reads: `api/internal/battle/handlers.go:100`, `:132` call `player.Bonus` · 7 C2 · 8 C21, C22 · 9 C44 `BattleScene.test.tsx:261`, C35 `AvatarScene.test.tsx:50` · 10 C27 | - |
| Relations entities (3) | plan `Relations` | PlayerGear, PlayerEquipment, PlayerSkin: C26; `api/migrations/00005_shop.sql:2-22` | - |
| shop card status and bonus (gear 3, skin 3, bonus short 4) | AC 23 | C29 `ShopScene.test.tsx:59-71`; W4 killed | - |
| shop detail buttons (8) and toasts (6) | AC 24, AC 26 | C30, C32 | - |
| shop and avatar outcomes (200, message, no body, network) | AC 27, AC 35 | C32, C33 (W6 killed), C39, C41 | - |
| avatar tabs (4), hints (4), detail actions (5), slots (4, arranged), skin strip (2), empty (EQUIP) | AC 30-AC 34 | C36 (W12 killed), C37 (W7 killed), C38 (W8 killed), C39 (W9, W10 killed), C40 (W11 killed) | - |
| boost button states (3) and remaining update | AC 36, AC 37 | C42 (W13 killed), C43 (W14 killed) | - |
| battle sprite skin | AC 38 | C44 (W15 killed) | - |
| startup config: catalog (one shared assembly) | `api/internal/app/router.go:56` `shop.Handlers{Pool, Catalog: d.Catalog}`, routes `:77-84` inside the `RequireSession` group `:62-63` | C1, C23 | - |
| stored data: existing players (1) | plan Impact | C47 `shop_test.go:742-786` | - |

`Swept existing` re-read against the code:

- **"who may call it: existing - `auth.RequireSession`"** holds: `api/internal/app/router.go:62-63` wraps `:77-84`.
- **"loading / unauthorised: existing - shell"** holds: `web/src/components/GameShell.tsx:28-40` renders only in `ready`, with player and catalog loaded, and `401` goes to `LoginScreen`.

Conditional sweep of every new branch. Branches with no asserted case, beyond the three unproven members above:

- **Boost error branches on /deploy.** `web/src/components/DeployScene.tsx:101` (`!r.ok` → `error.message ?? "erro ao acelerar"`) and `:108` (catch → `SERVIDOR FORA DO AR`) have no criterion and no test; W16 survived. The plan's `Observable` walk for `screen /deploy` records only "acelerador sem estoque" and never decided the error state of the new action. The copy was invented while building. This is a plan gap: it needs an additive `Observable` row and a check.
- **Defensive branches, not findings:**
  - `api/internal/shop/shop.go:43-54`: `pay` has no `default` case, so an unknown currency would be free. Catalog data rules this out, and nothing validates it.
  - `shop.go:80`, `:98`: catalog lookups for the previous piece or skin.
  - `ShopScene.tsx:136` `if (!it) return null`.
  - `gear.ts:55` `skinFilter` fallback `none`.
- **Unasserted but decided by no criterion copy:**
  - `ShopScene.tsx:169`, `:199`: `custo: <n> COINS` (`gear.ts:22`) is never asserted, only `GEMS`.
  - `AvatarScene.tsx:131`: the locked skin's grayscale filter; AC 31 says "apagada", and only `aria-disabled` is asserted.
  - `DeployScene.tsx:241` `disabled={pending || ...}` on the boost button; AC 36 is silent on pending.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `api/internal/player/player.go:308` `Bonus`, `Owns`, `OwnsSkin` | own layer C18 · boundary C15-C17 | yes - A8 and A9 killed at both layers |
| Decides, reached across a boundary | `api/internal/shop/shop.go` handlers, `pay`, `changeHP`, `equip`, `wear` | boundary C4-C15, C19-C27 | yes - A1-A7, A13, A14, A4b, A15b killed; one asserted case per guard |
| Decides, reached across a boundary | `api/internal/deploy/deploy.go` `Boost` | boundary C21, C22, C24 | yes - A10, A11, A12 killed |
| Decides, not reached across a boundary | `web/src/components/ShopScene.tsx`, `AvatarScene.tsx`, `DeployScene.tsx` (boost), `web/src/lib/gear.ts` | screen level C28-C44 | not met - no asserted case for 7 rows of their decision tables (W1, W2, W3, W16, W17, W18, W19 survived) |
| Decides, not reached across a boundary | `web/src/components/BattleScene.tsx` (sprite filter) | screen C44 | yes - W15 killed |
| Entry point that decides nothing | `api/internal/app/router.go` routes, `web/src/app/(game)/loja/page.tsx`, `avatar/page.tsx`, `GET /api/catalog` | boundary C1, C23, C24, C46 | yes |
| Instrumentation, pass-throughs | `catalog.go` accessors, `player.LoadGear`, `HeroSprite.tsx`, `types.ts`, `00005_shop.sql` | consumers | yes - A16 (LoadGear sort), A17 (catalog data) and A18 (migration FK) killed by their consumers |

## Faults injected

Setup:

- **Isolation.** Every fault ran in `git worktree add --detach <scratchpad>/wt HEAD`. `web/node_modules` was symlinked in, and `next-env.d.ts` and `.next/types` were copied in.
- **Baseline in the worktree.** api `go test -count=1 -p 1 ./...` passed in all 9 packages. `tsc` exited 0 and vitest passed 173/173.
- **Suite per fault.** Each fault ran its whole suite: api `go test ./...`, or web `tsc --noEmit` plus `vitest run`.
- **Reverts.** Each fault was reverted with `git checkout -- <file>`, and `git diff --exit-code` passed in the worktree after every one.
- **Real tree.** `git status --porcelain` read `?? .claude/` before and after, and the two were identical. `git diff --exit-code` exited 0. `git stash` was never used. The worktree was removed and pruned.

| Mutation | Location | Killed |
| --- | --- | --- |
| A1 `p.Gems < price` → `<=` | `api/internal/shop/shop.go:45` | yes - C7 `shop_test.go:286` (15 gems), plus C4, C5, C6, C25 |
| A2 already_owned guard off (gear) | `shop.go:127` | yes - C8 `:325` |
| A3 HP floor 1 → 0 | `shop.go:69` | yes - C15 `:446` (HP 0/100) |
| A4b replacing a slot does not subtract the old piece's hp | `shop.go:81` | yes - C15 `:442` (145/145). A4 (`delta -= 0`) did not compile and is not counted |
| A5 unequip does not subtract hp | `shop.go:185` | yes - C15 `:443` |
| A15b wear does not subtract the old skin's hp | `shop.go:99` | yes - C15 `:450` (140/140) |
| A15 no early return when the same skin is worn | `shop.go:94-96` | yes - equivalent mutant: delta = hp(s) - hp(s) = 0, so behaviour is identical and it is not counted as a survivor |
| A6 EquipSkin not_owned guard off | `shop.go:196` | yes - C14 `:421` |
| A7 discard guard `< 1` → `< 0` | `shop.go:210` | yes - C20 `:477` |
| A13 not_for_sale guard off | `shop.go:110` | yes - C10 `:344`, C27 `:712` |
| A14 unequip clears the slot when another piece is in it | `shop.go:179` | yes - `TestUnequipGear_OtherPieceInSlotStays` `:798` |
| A8 `Bonus` ignores the skin | `api/internal/player/player.go` `Bonus` | yes - C16 `battle_test.go:939`, C17 `:956`, C18 `bonus_test.go:38` |
| A9 `Bonus` sums owned gear, not equipped gear | `player.go` `Bonus` | yes - C16 (100/100), C17 `:963`, C18 |
| A16 owned gear not sorted in catalog order | `player.go` `LoadGear` | yes - C2 `shop_test.go:175` |
| A10 boost clamp to now removed | `api/internal/deploy/deploy.go` `Boost` | yes - C21 `shop_test.go:547` |
| A11 ready guard `!now.Before(ends)` → `now.After(ends)` | `deploy.go` `Boost` | yes - C22 `:567`, C27 `:710` |
| A12 boost no_item guard off | `deploy.go` `Boost` | yes - C22 `:570` |
| A17 macbook price 120 → 119 | `api/catalog/shop.json:9` | yes - C1 `catalog_test.go:348`, C7 `shop_test.go:298` |
| A18 `player_equipment` FK to `player_gear` dropped | `api/migrations/00005_shop.sql:14` | yes - C26 `shop_test.go:687` |
| W4 card status swaps EQUIPADO and NO INVENTÁRIO | `web/src/components/ShopScene.tsx:45` | yes - C29 |
| W5 REMOVER EQUIPAMENTO not disabled while pending | `ShopScene.tsx:171` | yes - C34 |
| W6 api error message ignored | `ShopScene.tsx:33` | yes - C33 (409 row) |
| W1 skin purchase label never shows GEMS INSUFICIENTES | `ShopScene.tsx:188` | no - survived, 173/173 passed |
| W2 gear insufficient label always COINS | `ShopScene.tsx:158` | no - survived, 173/173 passed |
| W18 shop skin button not disabled while pending | `ShopScene.tsx:202` | no - survived, 173/173 passed |
| W3 on-screen totals count owned gear instead of equipped | `web/src/lib/gear.ts:48` | no - survived, 173/173 passed |
| W7 locked skin still calls the api | `web/src/components/AvatarScene.tsx:126` | yes - C37 |
| W8 POÇÕES tab picks by `restore`, which drops boost_deploy | `AvatarScene.tsx:67` | yes - C38 |
| W9 skin detail never shows EM USO | `AvatarScene.tsx:221` | yes - C39 |
| W10 gear detail always EQUIPAR | `AvatarScene.tsx:197` | yes - C39, C41 pending |
| W11 empty-bag title dropped | `AvatarScene.tsx:185` | yes - C40 |
| W12 paper-doll slot arrangement swapped | `AvatarScene.tsx:21-22` | yes - C36 |
| W17 avatar VESTIR not disabled while pending | `AvatarScene.tsx:218` | no - survived, 173/173 passed |
| W19 avatar EQUIPAR not disabled while pending | `AvatarScene.tsx:202` | no - survived, 173/173 passed |
| W13 boost button shown on a ready deploy | `web/src/components/DeployScene.tsx:241` | yes - C42 |
| W14 boost does not update `endsAt` | `DeployScene.tsx:104` | yes - C43 |
| W16 boost error shows nothing | `DeployScene.tsx:101` | no - survived, 173/173 passed (no criterion exists) |
| W15 battle sprite ignores the skin | `web/src/components/BattleScene.tsx:147` | yes - C44 (neon row) |

Totals: 36 faults were counted. 29 were killed and 7 survived: W1, W2, W3, W16, W17, W18, W19. A15 was equivalent, and A4 was a compile error; neither is counted. Every api fault was killed.

## Builder deviations

**(a) bug-fight `TestCatalog_ServesCombat`, 8 → 9 items: legitimate, not a weakened check.**

- The approved plan (b4c1318) already put `boost_deploy` into `items`. AC 1 says "no novo item `boost_deploy`", and Landing door 4 says "`price` ... também em `items` de `combat.json`".
- The approved plan's `Impact` also already said "`boost_deploy` entra no catálogo sem `restore`".
- The new `Impact` row in `plan.md` and the `checks.md` "Impact on earlier checks" row were added in 2b32f50. Rule 4 keeps `Impact` true rather than frozen, so adding them is allowed.
- The assertion got stronger, not weaker. `api/internal/catalog/catalog_test.go:261` went from `!= 8` to `!= len(items)`, and `items` carries all 9 literal rows. Each row, including `boost_deploy|ACELERADOR DE DEPLOY|>>|COMUM|` with no `restore` (`:259`), is still compared field by field at `:269`. The first 8 rows are unchanged.
- The bug-fight check text at `.specs/features/bug-fight/checks.md:128` still reads "`items` (8, ...)". That text is fixed once approved, so the stale count is correctly recorded as an impact and not edited.
- One claim in that Impact row has no proof: "o Bug Fight continua listando só as duas poções". `web/src/components/BattleScene.tsx:83` filters by `restore`, but no test asserts that `boost_deploy` is absent from the potion list. The api refuses it at `battle/handlers.go:188`. This is a note, not a check.

**(b) `ComingSoon` removed, foundation C28 emptied, C46 replaces it: legitimate.**

- The approved plan's `Impact` (b4c1318) says "o conjunto do check C28 da foundation fica vazio - o teste de `ComingSoon` passa a cobrir só o componente ou sai no commit que entrega a última cena".
- C46, with the proof `ComingSoon.test.tsx -t "no scene shows EM BREVE"`, was in the approved `checks.md`.
- The builder took the "sai" branch for the component and kept the file for C46. C46 is broader than the old C28: it covers 7 rendered scene pages, and it waits for pages that load on mount (`ComingSoon.test.tsx:24-41`). Re-rendering `EM BREVE` in any page would fail its assertions at `:40-41`.
- Foundation's C28 text (`.specs/features/foundation/checks.md:105`) is now stale, and that is recorded in `checks.md` "Impact on earlier checks".
- A cosmetic nit: the file and its `describe("ComingSoon")` name a component that no longer exists.

## Gate

Whole-suite exit codes at 025661e:

- `cd api && go test -count=1 ./...` - exit 0 (9 packages ok, including the new `internal/shop`)
- `cd web && npx vitest run` - exit 0 (14 files, 173 passed)
- `cd web && npx tsc --noEmit` - exit 0
- `cd web && npm run lint` - exit 0
- `cd web && npx playwright test` - exit 0 (7 passed)
- `make ci-build` - exit 0
- `make check-deps` - exit 0 (`deps ok`)

Ranked gaps:

1. **On-screen totals do not prove the "equipped only" rule (AC 29, AD-012 duplicated in the web).**
   - The C35 fixture equips every owned piece (`AvatarScene.test.tsx:32-33`). So a web sum over owned gear passes (W3, `web/src/lib/gear.ts:48`), and the AVATAR would then show a bonus the api does not apply in combat.
   - Fix: add a C35 case with an owned but unequipped piece, for example `monitor` owned and not equipped, and assert that `SP +` is unchanged.
2. **AC 25 is proven only for potion/gems and gear/coins.**
   - Gear/gems (W2, `ShopScene.tsx:158`) and skin/gems (W1, `ShopScene.tsx:188`, disabled by `:202`) have no asserted case.
   - `ShopScene.test.tsx:95` explicitly skips the gear/gems case.
   - Fix: add rows to C31, for example macbook at 119 gems → `GEMS INSUFICIENTES` disabled, and golden at 149 gems → `GEMS INSUFICIENTES` disabled.
3. **Pending state is proven for only some panel buttons (AC 28, AC 35).**
   - These survived: the shop skin button (W18, `ShopScene.tsx:202`), avatar EQUIPAR (W19, `AvatarScene.tsx:202`) and avatar VESTIR (W17, `AvatarScene.tsx:218`).
   - C34 (`ShopScene.test.tsx:184-196`) and C41 (`AvatarScene.test.tsx:184-193`) both claim "os botões" but sample only item and gear, or DESCARTAR and REMOVER.
4. **Boost errors on /deploy are undecided and unproven.**
   - `DeployScene.tsx:101` and `:108` render builder-chosen copy, and W16 survived.
   - The plan's `Observable` walk for `screen /deploy` has no error-state row for the new action.
   - Fix: add the row to the plan (additive), then a check, for example `409 no_item` → api message and network → the repo's copy.

Notes that fail nothing:

- The `CHECK (skin_id <> 'default')` at `00005_shop.sql:20` goes beyond door 3's literal shape and is unasserted. Door 3's "never stored" is already proven by C8 (`default` → `already_owned`, snapshot unchanged) and C47.
- `player.LoadGear` and `emptyEquipment` order and shape by `catalog.Default()`, not by the injected catalog. This is the same documented limitation as `loadInventory`.
