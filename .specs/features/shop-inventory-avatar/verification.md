# Shop, inventory and avatar verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: d783bb1..8b36cf9d7402aab01c87cbae0b2ae7b2eced64b2
**Round**: 2 - scoped (fix range 025661e..8b36cf9: 12d4b47 spec, 7e3635d tests, 8b36cf9 STATE.md; round 1 report committed in 315cde4)
**Verifier**: independent sub-agent (author != verifier)

All 49 proofs ran at HEAD 8b36cf9 and passed. Each named test exists, appears on its own line as passing, and has a located assertion that targets the value in its check. Every whole suite exits 0.

The round 1 FAIL had four causes. All four are now closed:

- All 7 round 1 survivors (W1, W2, W3, W16, W17, W18, W19) were re-injected at HEAD, and each is now killed. So are 6 more faults on the new and nearby decision branches: 13 of 13 killed.
- The three Coverage sets that had unproven members now prove every member.
- The web screens row of `Test policy` is now met.
- The boost error state on `/deploy` is decided by the new AC 39 and proven by C48.

The Bug Fight potion list note from round 1 is now C49, and it is proven.

The fix touched no production code: `git diff --stat 025661e..HEAD -- ':!.specs' ':!*.test.tsx'` is empty. The four test files only gained lines (`--numstat`: 25/0, 14/0, 18/0, 25/0). No assertion was removed or weakened.

Scope of this round:

- **Re-run in full at 8b36cf9:** every proof and every whole suite.
- **Refreshed:** citations in the four touched test files.
- **Carried from 025661e unchanged:** the api citations. `api/` has no diff in 025661e..HEAD, and the api proofs re-ran green here.

## Binding sources

Carried from 025661e. The fix touched no interface code, so step 1 has no screen to re-check.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding | n/a - step 1 is `ui`-only and the profile is `standard`; `docs/DevServer RPG.html` is a reference in `Sources`, not binding | - | - |

## Spec changes in the fix (12d4b47)

**AC 39 is a legitimate additive criterion.**

- It adds one criterion (`plan.md:129`), one `Observable` row (`plan.md:160`, "screen `/deploy` | erro do acelerador | AC 39 (added after verification round 1)") and one number to the SHOP-07 traceability row. No approved criterion was reworded.
- It closes the plan gap that round 1 named: the error state of a new action, which the `Observable` walk had never decided.
- It is not invented copy. It follows the convention `/deploy` already used before this feature, in start and claim:
  - `DeployScene.tsx:66` `r.error?.message ?? "erro ao iniciar deploy"`, with `:74` catch → `SERVIDOR FORA DO AR`.
  - `:85` `?? "erro ao coletar"`, with `:90` catch → `SERVIDOR FORA DO AR`.
- It deliberately does not use the shop's AC 27, and says so in the criterion. `checks.md:319` records that the user chose round 2.

**C48 and C49 assert what their claims and the plan say, not what the code does.**

- **C48** claims three things, and each is asserted:
  - the api message: row `DeployScene.test.tsx:346`, asserted at `:357`;
  - the no-body copy `erro ao acelerar`: row `:347`;
  - the network copy `SERVIDOR FORA DO AR`: row `:348`.
  - It also claims the card keeps its previous time: `:358` `.deploy-remaining` `29:00` and `:359` `29:00 restante`.
  - The three values come from AC 39's text.
- **C49** has its authority in the plan's `Impact` row, `plan.md:237`: "`boost_deploy` entra no catálogo sem `restore`, então o Bug Fight continua listando só as duas poções". The test asserts:
  - the exact list at `BattleScene.test.tsx:272` `toEqual(["sp_potion","hp_potion"])`;
  - both names at `:273-274`;
  - that the booster is absent, at `:275-276`.
  - The fixture holds `boost_deploy` 1 (`:267`), so the absence is not simply because there are none.

**The four extended checks are all stricter than before.**

| Check | Round 1 text | Round 2 text | Direction |
| --- | --- | --- | --- |
| C31 | 2 labels on 2 buttons (potion/gems, gear/coins) | adds gear/gems (`macbook` 119/120) and skin/gems (`neon` 59/60) | stronger - every purchase-button kind × currency in the real catalog (AC 25), each at both sides of its boundary |
| C34 | "uma compra pendente, os botões do painel" | "uma ação pendente, os botões do painel: COMPRAR da poção, o botão de compra e REMOVER EQUIPAMENTO do equipamento e o botão de compra ou EQUIPAR da skin" | stronger - it keeps the general clause and names the members; "ação" is wider than "compra" |
| C35 | totals with every owned piece equipped | adds "com `monitor` e `fone` possuídos e não equipados os totais não mudam" | stronger - it now proves the "equipados" exclusion in AC 29 |
| C41 | "os botões do detalhe" | names `EQUIPAR`, `REMOVER`, `VESTIR`, `DESCARTAR 1` | stronger - every clickable detail button (`EM USO` is always disabled) |

A precision nit on C34, which fails nothing: the list in the text names gear "o botão de compra e REMOVER EQUIPAMENTO" but not gear `EQUIPAR`. The general clause still covers it, and the proof asserts it at `ShopScene.test.tsx:199` and `:216`.

## Checks

How the proofs ran at 8b36cf9:

- **api:** `cd api && go test -count=1 -p 1 -v ./...` - exit 0; 9 packages `ok`, 151 `--- PASS`. Each of the 28 `-run '^Name$'` tests named in `checks.md` was matched against the log as `--- PASS: <name>`, and none was missing.
- **web:** `cd web && npx vitest run --reporter=verbose` - exit 0; 14 files, 184 passed. Every `-t` pattern matched at least one passing test and no failing one:

  | Pattern | Passing tests |
  | --- | --- |
  | `insufficient balance` | 8 |
  | `pending disables panel` | 2 |
  | `preview and totals` | 2 |
  | `avatar errors and pending` | 5 |
  | `boost errors` | 3 |
  | `potions exclude the booster` | 1 |
  | `detail button per state` | 3 |
  | `actions call their route` | 6 |
  | `action errors` | 3 |
  | `boost button` | 2 |
  | `hero sprite wears skin` | 2 |
  | `no scene shows EM BREVE` | 7 |
  | every other pattern | 1 |

- **e2e:** `cd web && npx playwright test` - exit 0; 7 passed, including `e2e/shop.spec.ts:5:5 › buy and wear`.
- **Diff check:** every new proof resolves to a test added in 7e3635d.

C1-C27 and C47: every citation is carried from 025661e, because `api/` is untouched. Each proof re-ran PASS at 8b36cf9.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog: 6 gear, 4 skins, 4 slots, 3 prices, null_shard unpriced | `TestCatalog_ServesShop` PASS | `api/internal/catalog/catalog_test.go:325`, `:347`, `:371`, `:391`, `:393` | PASS |
| C2 | `/api/me` gear order, 4-key equipment, skins | `TestMe_ShopFields` PASS | `api/internal/shop/shop_test.go:175-177`, `:183` | PASS |
| C3 | new player defaults | `TestCreatePlayer_ShopDefaults` PASS | `shop_test.go:198`, `:201`, `:204`, `:208` | PASS |
| C4 | items pay and add | `TestBuyItem_PaysAndAdds` PASS | `shop_test.go:217`, `:222`, `:227` | PASS |
| C5 | cafe coins 50 equipped; monitor replaces macbook | `TestBuyGear_PaysOwnsEquips` PASS | `shop_test.go:236`, `:240`, `:247`, `:250-252` | PASS |
| C6 | neon gems 0, skins, skin neon | `TestBuySkin_PaysOwnsWears` PASS | `shop_test.go:262`, `:265`, `:266` | PASS |
| C7 | balance boundary by route and currency | `TestBuy_BalanceBoundary` PASS | `shop_test.go:276-277`, `:284`, `:286`, `:298`, `:310`, `:312` | PASS |
| C8 | already_owned, nothing changes | `TestBuy_AlreadyOwned` PASS | `shop_test.go:325-326` | PASS |
| C9 | unknown_* 422 | `TestBuy_Unknown` PASS | `shop_test.go:335-337` | PASS |
| C10 | null_shard not_for_sale | `TestBuyItem_NotForSale` PASS | `shop_test.go:344-345` | PASS |
| C11 | equip replaces slot; repeat same | `TestEquipGear_ReplacesSlot` PASS | `shop_test.go:357`, `:362`, `:365` | PASS |
| C12 | unequip clears slot; repeat same | `TestUnequipGear_ClearsSlot` PASS | `shop_test.go:375`, `:378`, `:382`, `:385` | PASS |
| C13 | wear default then neon | `TestEquipSkin_Wears` PASS | `shop_test.go:394`, `:397`, `:400` | PASS |
| C14 | not_owned 409 / unknown 422 | `TestEquip_NotOwnedOrUnknown` PASS | `shop_test.go:414-422` | PASS |
| C15 | HP transitions and floor | `TestHPBonus_EquipAndRemove` PASS | `shop_test.go:434`, `:437`, `:441-451` | PASS |
| C16 | SP 80/80 | `TestStart_SPMaxIncludesGearAndSkin` PASS | `api/internal/battle/battle_test.go:938` | PASS |
| C17 | FIX 24 / 23 | `TestCommand_DamageBonusFromGearAndSkin` PASS | `battle_test.go:955`, `:962` | PASS |
| C18 | `player.Bonus` per source and type | `TestBonus_SumsSources` PASS | `api/internal/player/bonus_test.go:27-37` | PASS |
| C19 | discard 2 → 1; null_shard | `TestDiscard_RemovesOne` PASS | `shop_test.go:457`, `:463` | PASS |
| C20 | discard rejects | `TestDiscard_Rejects` PASS | `shop_test.go:475`, `:477-478` | PASS |
| C21 | boost cut and clamp | `TestBoost_CutsFifteenMinutes` PASS | `shop_test.go:520`, `:523`, `:526`, `:532`, `:546` | PASS |
| C22 | boost 404/422/409/409, nothing consumed | `TestBoost_Rejects` PASS | `shop_test.go:558-570` | PASS |
| C23 | 8 routes 401 | `TestShopRoutes_RequireSession` PASS | `shop_test.go:589` | PASS |
| C24 | 500 internal, logged, unchanged | `TestShop_LoadFailure` PASS | `shop_test.go:606`, `:617`, `:619`, `:628` | PASS |
| C25 | concurrent buys serialize | `TestBuy_ConcurrentSerialize` PASS | `shop_test.go:658`, `:661` | PASS |
| C26 | DB constraints | `TestTables_ShopConstraints` PASS | `shop_test.go:681-686` | PASS |
| C27 | 8 codes in envelope | `TestShop_ErrorCodes` PASS | `shop_test.go:700-711` | PASS |
| C28 | LOJA header, sections, no EM BREVE | `shows the three sections` PASS | `web/src/components/ShopScene.test.tsx:40-53` | PASS |
| C29 | card bonus and status | `cards show bonus and status` PASS | `ShopScene.test.tsx:59-71` | PASS |
| C30 | detail per state | `detail button per state` (3) PASS | `ShopScene.test.tsx:82`, `:86-90`, `:98`, `:102`, `:105`, `:114`, `:120`, `:129-130` | PASS |
| C31 | 14/15 potion, 49/50 cafe, 119/120 macbook, 59/60 neon | `insufficient balance` (8) PASS | rows `ShopScene.test.tsx:135-142`; label via `detailButton(label)` `:146`, `:147-148` enabled/disabled | PASS |
| C32 | 6 buttons → route, toast, setPlayer | `actions call their route` (6) PASS | rows `ShopScene.test.tsx:153-158`; `:165`, `:166`, `:168` | PASS |
| C33 | 409 message; 500 and network → connection copy | `action errors` (3) PASS | rows `ShopScene.test.tsx:173-175`; `:181`, `:183` | PASS |
| C34 | pending disables every panel button | `pending disables panel` (2) PASS | `ShopScene.test.tsx:193`, `:196-199`; every button at `:208`, `:210`, `:212`, `:214`, `:216`, `:218`, `:220` (balance 500/500 at `:205`, so only `pending` can disable) | PASS |
| C35 | preview and totals; owned but unequipped monitor and fone change nothing | `preview and totals` (2) PASS | `web/src/components/AvatarScene.test.tsx:50-59`; unequipped case `:64` fixture, `:66-68` `HP máx 125`, `dano +18%`, `SP +30` | PASS |
| C36 | slots left/right, filled and empty | `paper doll slots` PASS | `AvatarScene.test.tsx:76-77`, `:79-83` | PASS |
| C37 | skin strip | `skin strip` PASS | `AvatarScene.test.tsx:92`, `:95-96`, `:98-99`, `:101-103` | PASS |
| C38 | bag tabs, hints, tags | `bag tabs` PASS | `AvatarScene.test.tsx:111`, `:113-114`, `:117-118`, `:121-122`, `:125-128` | PASS |
| C39 | bag detail actions and routes | `bag detail actions` PASS | `AvatarScene.test.tsx:145`, `:149`, `:153`, `:156`, `:160`, `:162`, `:164-166` | PASS |
| C40 | empty EQUIP tab | `empty bag` PASS | `AvatarScene.test.tsx:172-175` | PASS |
| C41 | avatar errors; pending disables EQUIPAR, REMOVER, VESTIR, DESCARTAR 1 | `avatar errors and pending` (5) PASS | `AvatarScene.test.tsx:188-190`; `:198`, `:201`; `:209`, `:212`, `:214`, `:217` | PASS |
| C42 | boost button states | `boost button` (2) PASS | `web/src/components/DeployScene.test.tsx:307-310`, `:314`, `:321`, `:323` | PASS |
| C43 | 29:00 → 14:00; setPlayer | `boost updates remaining` PASS | `DeployScene.test.tsx:337`, `:339-341` | PASS |
| C44 | battle sprite skin filter | `hero sprite wears skin` (2) PASS | `web/src/components/BattleScene.test.tsx:261-262` | PASS |
| C45 | browser buy and wear | `buy and wear` PASS | `web/e2e/shop.spec.ts:15`, `:16`, `:20`, `:22`, `:24` | PASS |
| C46 | 7 tabs; no EM BREVE | `no scene shows EM BREVE` (7), `tab order and routes` PASS | `web/src/components/ComingSoon.test.tsx:40-41`; `web/src/components/Tabs.test.tsx:13` | PASS |
| C47 | migration on existing player | `TestMigration_ExistingPlayers` PASS | `shop_test.go:759`, `:777`, `:783`, `:786` | PASS |
| C48 | boost 409 message / 500 `erro ao acelerar` / network `SERVIDOR FORA DO AR`; time unchanged | `boost errors` (3) PASS | rows `DeployScene.test.tsx:346-348`; `:357` `findByText(text)`; `:358` `.deploy-remaining` `29:00`; `:359` `29:00 restante` | PASS |
| C49 | Bug Fight lists only the two potions with a booster in inventory | `potions exclude the booster` PASS | `BattleScene.test.tsx:272` `toEqual(["sp_potion","hp_potion"])`; `:273-274`; `:275` no `[data-item="boost_deploy"]`; `:276` | PASS |

## Coverage

Verified at 8b36cf9. The rows the fix touched were recomputed from their authority, which is the plan criteria, not the `checks.md` table. Every other row is carried from 025661e unchanged, because the fix touched no production code.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| AC 25 purchase buttons that cannot pay, by kind × currency in the real catalog (4) | AC 25 over the purchase buttons of AC 24. The catalog has potions in gems (`shop.json`), gear in gems and in coins, and skins in gems only | potion/gems C31 `ShopScene.test.tsx:135` · gear/coins C31 `:137` · gear/gems C31 `:139` (W2 killed) · skin/gems C31 `:141` (W1, W1b killed) | - |
| AC 28 / AC 35 pending disables panel buttons (9: shop item COMPRAR, gear buy, gear EQUIPAR, REMOVER EQUIPAMENTO, skin buy, skin EQUIPAR; avatar EQUIPAR, REMOVER, VESTIR, DESCARTAR 1 - `EQUIPADO`, `EQUIPADA` and `EM USO` are always disabled) | AC 28 "desabilitar os botões do painel"; AC 35 "ação pendente segue AC 28". "Painel" is the detail panel of AC 24 and AC 33 | shop: `:208`, `:212`/`:214` (gems and coins gear), `:216`, `:210`, `:218`, `:220` (W18 killed) · avatar: `AvatarScene.test.tsx:212` (W19 killed), `:214`, `:217` (W17 killed), `:209` | - |
| AC 29 on-screen totals: sources (3) and the "equipados" exclusion (1) | AC 29 "somando skills, equipamentos equipados e skin"; the web sums it in `web/src/lib/gear.ts:42-52` | skills, gear and skin C35 `AvatarScene.test.tsx:57-58` · owned but unequipped excluded C35 `:66-68`, with `monitor` (+20 SP) and `fone` (+6% dano) owned and unequipped (W3 killed) | - |
| boost outcomes on screen (4) | AC 37, AC 39 | 200 C43 `DeployScene.test.tsx:339-341` · api message C48 `:346` · no body C48 `:347` · network C48 `:348` (W16, W16b, W16c, W16d killed) | - |
| Bug Fight item buttons (2 shown, 1 excluded) | plan `Impact` `plan.md:237` | `sp_potion`, `hp_potion` C49 `BattleScene.test.tsx:272-274` · `boost_deploy` absent `:275-276` (W20 killed) | - |
| screen `/deploy` Observable rows (2) | plan `Observable` `plan.md:159-160` | acelerador sem estoque C42 · erro do acelerador C48 | - |
| Surface statuses, 8 new routes (46); `GET /api/me` (4); `GET /api/catalog` (1) | plan `Surface` | carried from 025661e: C4-C27, C47 and foundation, as tabled in round 1 | - |
| catalog members, player contract fields, api balance boundary, HP transitions, bonus sources × types and exclusions, boost outcomes and guards, idempotent paths, error codes (8), Landing doors (10), Relations entities (3), stored data (1), startup config | AC 1-AC 21, `Landing`, `Relations`, `Impact` | carried from 025661e unchanged (api untouched, proofs green at 8b36cf9) | - |
| shop cards, detail buttons, toasts, outcomes; avatar tabs, hints, detail actions, slots, strip, empty; boost button states; battle sprite | AC 22-AC 24, AC 26, AC 27, AC 30-AC 34, AC 36, AC 38 | carried from 025661e (C28-C30, C32, C33, C36-C40, C42, C44), proofs green at 8b36cf9 | - |

A note on `checks.md`, which fails nothing: its own `Coverage` table (`checks.md:257`) still sizes "shop insufficient (2)" by label. It also has no row for the pending-buttons set or for the totals exclusion. The fix added the proofs but not those rows. The recompute above supersedes the table, and every member is proven.

`Swept existing` re-read, carried from 025661e. `web/src/components/GameShell.tsx` and `api/internal/app/router.go` are untouched in the fix range.

Re-sweep of `ShopScene.tsx`, `AvatarScene.tsx`, the boost code in `DeployScene.tsx`, and `gear.ts` at 8b36cf9:

- **`ShopScene.tsx`:** every decision branch now has an asserted case:
  - label ternaries `:148`, `:158`, `:188`;
  - disabled expressions `:146`, `:171`, `:178`, `:202`;
  - card status `:45`, `:47`;
  - error fallback `:33`.
- **`gear.ts`:**
  - `canPay` (`:26`) is asserted at both sides of every currency boundary (W21 killed).
  - `insufficient` (`:30`) has both branches asserted (W2).
  - `totalBonus` (`:48`) is asserted with the exclusion (W3).
- **`DeployScene.tsx` boost:** `:101` message and fallback, and `:108` catch, are asserted (W16-W16d).
- **Still unasserted, and decided by no criterion.** These are notes, not findings, and no fault was counted on them. All were outside the fix's diff, and each would need a criterion before a test could assert it from the spec:
  - `AvatarScene.tsx:124` `disabled={pending && owned}` on the skin strip. AC 28 and AC 35 name the panel buttons, and the strip is outside the detail panel.
  - `AvatarScene.tsx:56` `SLOT_TAG` tags for owned but unequipped gear. Only `roupa` is asserted (`AvatarScene.test.tsx:114`), and AC 32 decides only the `EQUIP` mark.
  - `AvatarScene.tsx:63`, the tag of a skin not worn. AC 32 decides only `EM USO`.
  - `AvatarScene.tsx:174`, where clicking a slot opens the EQUIP bag on that piece.
  - `DeployScene.tsx:241` `pending` on the boost button (carried from round 1).
  - `DeployScene.tsx:98` `setMessage(null)` and the `:106` log line.
  - `gear.ts:11` `sem bônus de atributo` and `gear.ts:22` `COINS` in the long form (carried).
- **Defensive branches** (`ShopScene.tsx:136`, `gear.ts:55`): carried as round 1 noted.

## Test policy rows

Every row was re-judged at 8b36cf9. The unmet row from round 1 and every row that classifies a file whose proof the fix touched were re-judged against the new faults. The api rows are carried from 025661e, since `api/` is untouched.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `api/internal/player/player.go` `Bonus`, `Owns`, `OwnsSkin` | own layer C18 · boundary C15-C17 | yes - carried from 025661e (A8, A9 killed at both layers) |
| Decides, reached across a boundary | `api/internal/shop/shop.go` handlers, `pay`, `changeHP`, `equip`, `wear` | boundary C4-C15, C19-C27 | yes - carried from 025661e |
| Decides, reached across a boundary | `api/internal/deploy/deploy.go` `Boost` | boundary C21, C22, C24 | yes - carried from 025661e |
| Decides, not reached across a boundary | `web/src/components/ShopScene.tsx`, `AvatarScene.tsx`, `DeployScene.tsx` (boost), `web/src/lib/gear.ts` | screen level C28-C43, C48 | yes - every row of the decided tables now has an asserted case; W1, W1b, W2, W3, W16, W16b, W16c, W16d, W17, W18, W19, W21 killed at 8b36cf9 |
| Decides, not reached across a boundary | `web/src/components/BattleScene.tsx` (sprite filter, potion filter `:83`) | screen C44, C49 | yes - W15 (round 1) and W20 killed |
| Entry point that decides nothing | `api/internal/app/router.go` routes, `web/src/app/(game)/loja/page.tsx`, `avatar/page.tsx`, `GET /api/catalog` | boundary C1, C23, C24, C46 | yes - carried from 025661e |
| Instrumentation, pass-throughs | `catalog.go` accessors, `player.LoadGear`, `HeroSprite.tsx`, `types.ts`, `00005_shop.sql` | consumers | yes - carried from 025661e |

## Faults injected

Verified at 8b36cf9. Api faults A1-A18 and web faults W4-W15 were killed in round 1 on surfaces the fix did not touch, so they are carried from 025661e.

Setup:

- **Isolation.** A scratch worktree was made with `git worktree add --detach <scratchpad>/wt HEAD`. `web/node_modules` was symlinked in, and `next-env.d.ts` and `.next/types` were copied in.
- **Baseline in the worktree.** `tsc` exited 0 and vitest passed 184/184.
- **Suite per fault.** Each fault was applied with a `perl` substitution and confirmed to change the file (`git diff` non-empty). Then the **whole** web suite ran: `tsc --noEmit` and `vitest run`.
- **Reverts.** Each fault was reverted with `git checkout -- <file>`, and `git diff --exit-code` held after every one.
- **Real tree.** `git status --porcelain` read `?? .claude/` before and after, and the two were identical. `git diff --exit-code` exited 0. `git stash` was never used. The worktree was removed and pruned.

| Mutation | Location | Killed |
| --- | --- | --- |
| W1 skin label never shows `GEMS INSUFICIENTES` (unaffordable → `COMPRAR E EQUIPAR`) | `web/src/components/ShopScene.tsx:188` | yes - `insufficient balance (59 gems, 100 coins, neon)`, 1 failed / 183 |
| W1b unaffordable skin button not disabled (`(!owned && !afford)` dropped) | `ShopScene.tsx:202` | yes - `insufficient balance (59 gems ... neon)` |
| W2 gear insufficient label always `COINS INSUFICIENTES` | `ShopScene.tsx:158` | yes - `insufficient balance (119 gems, 100 coins, macbook)` |
| W18 shop skin button not disabled while pending | `ShopScene.tsx:202` | yes - `pending disables panel (every button)` |
| W3 on-screen totals sum owned gear instead of equipped | `web/src/lib/gear.ts:48` | yes - `preview and totals (owned, not equipped)` |
| W17 avatar `VESTIR` not disabled while pending | `web/src/components/AvatarScene.tsx:218` | yes - `avatar errors and pending (pending, every button)` |
| W19 avatar `EQUIPAR` not disabled while pending (`disabled={false}`) | `AvatarScene.tsx:202` | yes - `avatar errors and pending (pending, every button)` |
| W16 boost error shows nothing (`if (!r.ok) return;`) | `web/src/components/DeployScene.tsx:101` | yes - `boost errors (409 with message)`, `boost errors (500 without body)` |
| W16b boost network failure shows nothing (catch → `setMessage(null)`) | `DeployScene.tsx:108` | yes - `boost errors (network)` |
| W16c no-body fallback `erro ao acelerar` → `erro ao coletar` | `DeployScene.tsx:101` | yes - `boost errors (500 without body)` |
| W16d api `error.message` ignored (always `erro ao acelerar`) | `DeployScene.tsx:101` | yes - `boost errors (409 with message)` |
| W20 Bug Fight potion filter admits priced items (`restore \|\| price`) | `web/src/components/BattleScene.tsx:83` | yes - `potions exclude the booster` |
| W21 `canPay` `>=` → `>` | `gear.ts:26` | yes - 4 `insufficient balance` rows at the exact price (15, 50, 120, 60) |

Totals: this round injected 13 faults, and all 13 were killed. Each ran the whole web suite. Across both rounds there are 42 distinct counted faults: the 36 counted in round 1 (29 killed then, and the 7 survivors re-killed here) plus the 6 new ones here. All 42 are killed. None survives at 8b36cf9. A15 (equivalent) and A4 (did not compile) are carried as uncounted.

## Gate

Whole-suite exit codes at 8b36cf9:

- `cd api && go test -count=1 -p 1 ./...` - exit 0 (9 packages ok)
- `cd web && npx vitest run` - exit 0 (14 files, 184 passed)
- `cd web && npx tsc --noEmit` - exit 0
- `cd web && npm run lint` - exit 0
- `cd web && npx playwright test` - exit 0 (7 passed)
- `make ci-build` - exit 0
- `make check-deps` - exit 0 (`deps ok`)
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_checks.py shop-inventory-avatar` - 0 errors, 0 warnings

Ranked gaps: none.

Notes that fail nothing:

1. **C34's member list omits gear `EQUIPAR`.** It is still covered by the general clause and asserted at `ShopScene.test.tsx:199`, `:216`.
2. **The `Coverage` table in `checks.md` was not updated.** It was not extended for the three sets round 1 recomputed (`checks.md:257`). The proofs exist, and the recompute above is the authority.
3. **Some branches are decided by no criterion.** They are listed in the re-sweep above (`AvatarScene.tsx:56`, `:63`, `:124`, `:174`; `DeployScene.tsx:98`, `:106`, `:241`; `gear.ts:11`, `:22`). If any of them is meant to be behaviour, it needs a criterion before it can be tested from the spec.
4. **Carried from round 1:**
   - The `CHECK (skin_id <> 'default')` at `00005_shop.sql:20` is unasserted beyond door 3.
   - `player.LoadGear` orders by `catalog.Default()`.
   - `ComingSoon.test.tsx` is named after a component that was removed.
