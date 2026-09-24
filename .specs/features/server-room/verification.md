# Server room verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: a0a9412..ca6878aa66ac9f2cdc9c2260c658a1ece18c2f7e (specs `a7532b0`, api `1c0b1d5`, web `61d7f69`, handoff `ca6878a`)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Every proof named for C1-C44 ran green at HEAD ca6878a. Each named test exists and shows up in the output on its own. The five injected faults were all killed. The feature still fails, for three reasons:

1. **`404 player_not_found` on both rack routes has no proof, and the plan's Surface leaves it out.** Both handlers go through `player.WithLocked` (`api/internal/rack/rack.go:29`). With a session but no player row, `scan` there returns `httpx.ErrPlayerNotFound` (`api/internal/player/player.go:129`). So `POST /api/me/rack` and `POST /api/me/rack/{slot}/remove` both answer 404. Neither the Surface nor the `(7)` / `(4)` status rows in `checks.md` list this status, and no test sends a player-less session to a rack route. `rg player_not_found` finds it asserted only for `/api/me`, travel, battle (`battle_test.go:805`), deploy (`deploy_test.go:256`) and skills (`skills_test.go:251`). This repo already proves 404 on every other player-mutating route family, so the omission is a gap and not a convention.
2. **C21's clause "o rack soma junto com skills, equipamentos e skin" is proven for skills and gear only.** The combined player in `api/internal/player/bonus_test.go:114-117` sets `Skills` and `Gear`. `Skin` stays `"default"` (`:110`), and that skin has `"bonus": null` (`api/catalog/shop.json:17`). No test anywhere adds the rack to a skin that carries a bonus: `bonus_test.go` holds only `Skin: "default"` rows, and web C41 adds only `macbook`. The claim names three sources and the proof covers two.
3. **The gems-refund branch in `Remove` has no proof.** It sits at `api/internal/rack/rack.go:86-87` (`if k.Price.Currency == "gems" { p.Gems += k.Price.Amount }`). No rack test builds a catalog with a component priced in gems: `rg NewWithCatalog api/internal/rack` finds nothing, and `"gems"` appears only in `rack.go:86`. The plan's Out of scope excludes "Componentes pagos em gems". So the branch is new code for an excluded case, and it is untested. Deleting the refund or sending it to coins would survive every proof. The fix is either to prove the branch or to remove it (a scope decision). Either way, the currency dispatch has one row that is never asserted, so the Test policy row for `rack.go` is not met.

How the proofs ran at ca6878a (verified at ca6878a):

- **api:** one run over `./internal/catalog ./internal/rack ./internal/player ./internal/battle ./internal/deploy ./internal/office`. The command was `go test -count=1 -p 1 -v` with `-run '^(<the 27 names in checks.md>|TestMigration_OfficeExistingPlayers)$'`. It exited 0 with 6 packages `ok` and 28 `--- PASS` lines: each of the 27 check tests once, plus the office migration test the Impact section says changed. There were 0 `--- FAIL` lines.
- **web:** one run of `npx vitest run --reporter=verbose` over `Tabs`, `TitleScene`, `ServerScene`, `AvatarScene` and `ComingSoon`, with `-t` set to an alternation of the 15 patterns. It exited 0: 23 passed, 17 skipped by the filter. Every pattern matched at least one passing test. `no scene shows EM BREVE` ran 9 times, including `/server`.
- **e2e:** `npx playwright test e2e/server.spec.ts` exited 0 with 2 passed: `server.spec.ts:5:5 › buy and remove` and `:32:5 › entries`.
- **Diff check:** every proof resolves to a test the feature added or changed in `1c0b1d5` / `61d7f69`. The new files are `rack_test.go`, `battle/rack_test.go`, `deploy/rack_test.go`, `ServerScene.test.tsx` and `e2e/server.spec.ts`. The tests with additions are `TestCatalog_ServesRack`, `TestBonus_Rack`, `Tabs`, `TitleScene`, `AvatarScene` and `ComingSoon`.

Step 1 (binding sources) belongs to the `ui` profile and did not run. The `## Binding sources` section is left out on purpose. The prototype was opened for one thing only: as the authority for the catalog set in Coverage. Its `shopData` and the `stats` block of the `isServer` render match `api/catalog/rack.json` on ids, names, glyphs, colours, costs, effects, base and max. Step 5 (the walk with the user) and step 7 (lessons) belong to the orchestrator.

**Also observed but not counted:**

- **C27's `dmg 4` is asserted only indirectly, as FIX damage 21** (`rack_test.go:563`). `rules.go:73` rounds `20 × (1 + d/100)`, which gives 21 for every `d` from 3 to 7. So the damage assertion alone would not tell `dmg 4` from `dmg 6` (gpu plus a counted slot-6 cpu). What does tell them apart is `:549`, which pins the loaded `p.Rack` to 6 entries with only `gpu`. `Bonus` reads that same slice, and a slot-6 row could only be counted by growing it to 7, which `:549` rejects. This is a weak test, not an unproven claim.
- **Some web conditionals have no proof, and none can be reached under the contract.** `player.rack ?? ...` (`ServerScene.tsx:19`, `rack.ts:7`) cannot fire, because AC 2 always sends `rack` (C2, C3, C20). The bar-width clamp (`ServerScene.tsx:73`) cannot fire, because every `max` is at most 100. The `?` slot's empty name and note (`:97-98`) are not asserted; C32 asserts only the glyph, which is all AC 26 fixes.
- **Plan Impact predicted a change to `e2e/shell.spec.ts` that was not needed.** That spec asserts no tab count or numbering, and it passes unchanged at HEAD.

## Checks

Verified at ca6878a.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog `rack`: 6 slots, 3 stats, 6 components, every field by value | `TestCatalog_ServesRack` PASS | `api/internal/catalog/catalog_test.go:511-527` literal with every key and value; `:531` `reflect.DeepEqual(b.Rack, w)` (extra, missing or reordered keys or items fail) | PASS |
| C2 | `/api/me` rack `[null,"gpu",null,null,null,"ram"]` | `TestMe_RackField` PASS | `api/internal/rack/rack_test.go:128-129` placement; `:131` body contains `"rack":[null,"gpu",null,null,null,"ram"]` | PASS |
| C3 | new player `201` with 6 null | `TestCreatePlayer_RackDefaults` PASS | `rack_test.go:141` `rec.Code != http.StatusCreated`; `:144` `"rack":[null,null,null,null,null,null]` | PASS |
| C4 | 100 coins, `ram` → 200, 40 coins, slot 0 row | `TestBuy_PaysAndPlaces` PASS | `rack_test.go:154` `got.Coins != 40 \|\| rack(got.Rack) != "ram,-,-,-,-,-"` (200 via `f.ok` `:72`); `:159` row `slot != 0 \|\| id != "ram"` | PASS |
| C5 | first free slot: 2, 0, 5 | `TestBuy_FirstFreeSlot` PASS | rows `rack_test.go:171-173`; `:180` `got != tc.want` | PASS |
| C6 | 59 coins 409 unchanged; 60 pays to 0 | `TestBuy_BalanceBoundary` PASS | `rack_test.go:191` `409 not_enough_coins`; `:192` snapshot unchanged; `:194` `got.Coins != 0` and rack `ram` | PASS |
| C7 | full rack 409 `rack_full` and message, 1000 coins kept; 5 taken → slot 5 | `TestBuy_RackFull` PASS | `rack_test.go:208` `409 rack_full`; `:211` `msg != "rack cheio. remova um componente antes"`; `:214` unchanged; `:221` `ram,ram,ram,ram,ram,cpu`, 920 | PASS |
| C8 | `x` and `{}` → 422 `unknown_component`, unchanged | `TestBuy_UnknownComponent` PASS | `rack_test.go:230`, `:231` `422 unknown_component`; `:232` unchanged | PASS |
| C9 | `{` and `{"component": 1}` → 422 `invalid_body` | `TestBuy_InvalidBody` PASS | bodies `rack_test.go:239`; `:243` `422 invalid_body`; `:245` unchanged | PASS |
| C10 | validation order, four cases | `TestBuy_ValidationOrder` PASS | full rack and 0 coins `rack_test.go:251-254`; `:257` `{` → `invalid_body`; `:258` `x` → `unknown_component`; `:259` `cpu` → `409 rack_full`; `:261` one free slot → `409 not_enough_coins` (F1 killed at `:259`) | PASS |
| C11 | `ram` twice, 120 → 0, two slots | `TestBuy_Duplicates` PASS | `rack_test.go:269` `got.Coins != 0 \|\| rack(got.Rack) != "ram,ram,-,-,-,-"` | PASS |
| C12 | remove refunds full price: gpu +150, ram +60, others unchanged | `TestRemove_RefundsFullPrice` PASS | `rack_test.go:281` `Coins != 150`, rack `ram` only; `:285` `Coins != 210`, empty; `:288` gems 20 (F2 killed at `:282`) | PASS |
| C13 | empty slot 200 unchanged; second remove refunds once | `TestRemove_EmptySlot` PASS | `rack_test.go:298` `f.ok(f.remove("4"))`; `:299` unchanged; `:303` `got.Coins != 150` | PASS |
| C14 | `-1`, `6`, `a` → 422 `unknown_slot`; 0 and 5 accepted | `TestRemove_SlotBounds` PASS | `rack_test.go:311-312` `422 unknown_slot`; `:314-315` `f.ok` on 0 and 5 | PASS |
| C15 | concurrent buys serialize (rack_full / not_enough_coins) | `TestBuy_ConcurrentSerialize` PASS | `rack_test.go:347` 1 ok and `rack_full`; `:350` 920 and cpu in slot 5; `:356` 1 ok and `not_enough_coins`; `:359` 0 coins, one cpu | PASS |
| C16 | both routes 401 without a session | `TestRackRoutes_RequireSession` PASS | routes `rack_test.go:364`; `:370` `rec.Code != 401 \|\| ErrorCode != "unauthenticated"` | PASS |
| C17 | `player_rack` down: 5 routes 500, log `request_id` and `player_rack`, unchanged | `TestRack_LoadFailure` PASS | `rack_test.go:386` `500 internal`; `:397-400` log line with the request id contains `player_rack`; `:403-407` `/api/me`, deploys, battle, buy, remove; `:409` unchanged; `:410` battles 0 | PASS |
| C18 | PK and `CHECK (slot >= 0)` | `TestTables_RackConstraints` PASS | rows `rack_test.go:428` `23505`, `:429` `23514`; `:431` `got != tc.want` | PASS |
| C19 | 3 new codes with their messages | `TestRack_ErrorCodes` PASS | `rack_test.go:446` status, code and message compared exactly; `:450` `unknown_component`, `:451` `unknown_slot`, `:455` `rack_full` | PASS |
| C20 | migration 00007 over an existing player; `/api/me` 200 with 6 null | `TestMigration_RackExistingPlayers` PASS | `rack_test.go:480` to 6; `:488` old player; `:492` to 7; `:496` empty `player_rack`; `:517` 200; `:520` 6 null | PASS |
| C21 | `player.Bonus` over the rack: values, caps, floors, exclusions, summed with skills, gear **and skin** | `TestBonus_Rack` PASS | rows `api/internal/player/bonus_test.go:124-150`, asserted at `:152` `got != tc.amount`: empty 0 ×3, gpu 4, cpu 2, cache 1, cpu+gpu 6, 6 gpu 8, ram 6, 6 ram 17, lb 20, 6 lb 39, ssd 1/8, hp/xp/deploy/spregen 0 `:141-144`, skills+gear `:145-146`. **Skin is not in any sum**: `:110` `Skin: "default"`, and `shop.json:17` `"bonus": null`. F3 killed at `:153` | FAIL - skin clause unproven |
| C22 | battle SP 50/50, 56/56, 67/67 | `TestBattle_RackSPMax` PASS | rows `api/internal/battle/rack_test.go:20-22`; `:26` `SP != tc.sp \|\| SPMax != tc.sp` | PASS |
| C23 | FIX (roll 6) 20 / 21 / 22 | `TestBattle_RackDamage` PASS | rows `battle/rack_test.go:39-41`; `:48` `Type != "damage" \|\| Amount != tc.damage` | PASS |
| C24 | deploy coins 40/48/43/56, NV.2 97; XP, gems, `ends_at` unchanged; claim pays stored | `TestStart_RackBoostsCoins` PASS | rows `api/internal/deploy/rack_test.go:56-60`; `:51` stored coins, xp, gems, `ends`; `:70` `Reward.Coins != 97 \|\| Player.Coins != 97` (F4 killed at `:59`) | PASS |
| C25 | coins frozen at 48 across remove and 6 buys; claim 48 | `TestDeploy_RackFrozenAtStart` PASS | `deploy/rack_test.go:84` 48 at start; `:93-96` remove and 6 `lb`; `:97` still 48; `:105` `Reward.Coins != 48` | PASS |
| C26 | `quantum`: occupies, sums 0, removed with no refund | `TestUnknownComponent_OccupiesAndRemoves`, `TestBonus_Rack` PASS | `rack_test.go:530` `quantum,cpu,-,-,-,-`; `:536` `409 rack_full`; `:538` `Coins != 920 \|\| Gems != 20 \|\| Rack[0] != nil`; `bonus_test.go:147-150` quantum dmg/sp/coins 0, beside gpu 4 | PASS |
| C27 | rows at slots 6 and 9 skipped; `dmg` 4 | `TestMe_SkipsSlotsOutsideCatalog` PASS | `rack_test.go:549` `rack(f.me().Rack) != "gpu,-,-,-,-,-"`; `:563` FIX damage 21 (a weak signal for `dmg 4`, see the header) | PASS |
| C28 | 9 tabs, SERVER 03 → `/server` | `tab order and routes` PASS | `web/src/components/Tabs.test.tsx:13-22` `toEqual` over 9 labels and hrefs (`:16` `["SERVER", "/server"]`); `:24` `01`…`09`; `:25` `links[2]` `03` | PASS |
| C29 | SERVER sign and SALA DE SERVIDORES building; 4 earlier signs unchanged | `server hotspots` PASS | `web/src/components/TitleScene.test.tsx:21-23` href, style, no chip; `:25-27` href, style, chip text; `:33-38` 4 earlier; `:39` 6 links | PASS |
| C30 | empty rack: bars, rack panel, 6 slots, 6 cards in order, hello text | `empty rack` PASS | `web/src/components/ServerScene.test.tsx:40` stat order; `:41-43` name, value, width; `:45-46` rack and 6 slots; `:48-52` shop and card order and names; `:53` terminal | PASS |
| C31 | bars and bonus lines at the limits | `stats and bonuses` PASS | cases `ServerScene.test.tsx:59-70` (empty ×3, gpu, 6 gpu, cpu+gpu 85/+6, ram, 6 ram, lb, 6 lb, ssd ×2); `:74` `toMatchObject(want)` (F5 killed at the cpu+gpu row) | PASS |
| C32 | slot states `-`/`SLOT 0n VAZIO`/`livre`, gpu, ssd, `?` | `slot states` PASS | `ServerScene.test.tsx:87`, `:91-92` empty; `:88` gpu; `:89` ssd; `:90` `read(3)[0]).toBe("?")` | PASS |
| C33 | card glyph, name, effects, price; opacity at 100 and 80 coins | `shop cards` PASS | `ServerScene.test.tsx:104-111` all 6 by value; `:112-114` lb and gpu `0.45`, cpu `1`; `:117-118` at 80 cpu `1`, cache `0.45` | PASS |
| C34 | full rack: message, no fetch | `rack full` PASS | `ServerScene.test.tsx:126` exact text; `:127` `not.toHaveBeenCalled()` | PASS |
| C35 | 79 coins: message and alert, no fetch; 80 buys | `insufficient coins` PASS | `ServerScene.test.tsx:135` text; `:136` alert `COINS INSUFICIENTES`; `:137` no fetch; `:141` 1 call | PASS |
| C36 | buy route, body, setPlayer, `slot 03` message | `buy` PASS | `ServerScene.test.tsx:150` 1 call; `:151` body `{ component: "ram" }`; `:152` `setPlayer(after)`; `:153` exact text | PASS |
| C37 | remove route, setPlayer, refund text; `quantum` text | `remove` PASS | `ServerScene.test.tsx:165-168` route, no body, `setPlayer`, `GPU EDGE removido. 150 coins devolvidos.`; `:170-171` `componente removido.` | PASS |
| C38 | empty slot message, no fetch | `empty slot` PASS | `ServerScene.test.tsx:179` exact text; `:180` no fetch | PASS |
| C39 | 409 message / 500 with no body / network, on both actions; rack stays | `action errors` PASS | cases `ServerScene.test.tsx:186-189`; `:195`, `:198` text; `:196`, `:199` rack region still present; `:200` no setPlayer | PASS |
| C40 | 12 buttons disabled while pending, enabled after | `pending disables` PASS | `ServerScene.test.tsx:213` 12; `:214` `toBeDisabled()`; `:216` `toBeEnabled()` | PASS |
| C41 | AVATAR `dano +4%`, `SP +6`; with macbook `dano +12%` | `rack bonuses` PASS | `web/src/components/AvatarScene.test.tsx:67-68`; `:72` | PASS |
| C42 | browser: buy, HUD 40, RAM 45, `SP MÁX +6`, reload, remove, HUD 100 | `buy and remove` PASS | `web/e2e/server.spec.ts:14` text; `:15` 40; `:17-18` 45 and `SP MÁX +6`; `:22-23` after reload; `:26` refund text; `:27` 100 | PASS |
| C43 | 9 routes, `/server` included, show no EM BREVE | `no scene shows EM BREVE` (9) PASS | row `web/src/components/ComingSoon.test.tsx:21` `["/server", ServerPage]`; `:44-45` `not.toContain("EM BREVE")` | PASS |
| C44 | browser: building hotspot and SERVER tab reach `/server` | `entries` PASS | `web/e2e/server.spec.ts:34-36` hotspot → `/server$` and `RACK LOCALHOST-01`; `:40-42` tab → `/server$` | PASS |

## Coverage

Verified at ca6878a. Each set's members come from the source that holds authority over it, named in the second column.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/me/rack` statuses (8) | code: `router.go:67` `RequireSession`, `:91`; `rack.go:50` decode, `:53-55`, `:58-60`, `:62` `Pay`; `WithLocked` scan `player.go:129`; `httpx` 500 | 200 C4 · 401 C16 · 409 `rack_full` C7 · 409 `not_enough_coins` C6 · 422 `invalid_body` C9 · 422 `unknown_component` C8 · 500 C17 · **404 `player_not_found`: none** | 404 `player_not_found` (session without a player) - not in plan Surface |
| `POST /api/me/rack/{slot}/remove` statuses (5) | code: `router.go:92`; `rack.go:73-75`, `:77-93`; `player.go:129` | 200 C12, C13 · 401 C16 · 422 `unknown_slot` C14 · 500 C17 · **404: none** | 404 `player_not_found` - not in plan Surface |
| `POST /api/me/deploys` statuses (8) | plan Surface (unchanged route) | 201 C24 · 401 / 409 / 422 ×4 / 500: `TestDeployRoutes_SessionAndPlayer`, `TestStart_SameTypeRunning`, `TestStart_InvalidBody`, `TestStart_UnknownType`, `TestStart_UnknownLevel`, `TestStart_LevelBoundary`, `TestDeployRoutes_UnexpectedError`, each `--- PASS` exactly once in the full api run at ca6878a · rack cause 500 C17 | - |
| `GET /api/me` statuses (4) | plan Surface | 200 C2, C27 · 401 `TestAuthMiddleware_RejectsEveryProtectedRoute` · 404 `TestPlayerNotFound_OnPlayerRoutes` (both PASS at ca6878a) · 500 C17 | - |
| catalog `rack` keys (3) and startup assembly (1) | plan Landing door 2; `cmd/api/main.go:43` `catalog.Load()`, `:51` `Catalog: cat`; `apptest.go:112`, `:127` | slots, stats, components C1; main and apptest share one `Load` of the embedded data | - |
| components × fields (6 × 6) | prototype `shopData` (ids, names, glyphs, colours, costs, `effect` + `extra`) and plan Assumptions; compared with `rack.json:9-14` | C1, every field by value (`catalog_test.go:531`); web copy `test/helpers.ts` agrees | - |
| stats × fields (3 × 7) | prototype `stats` (names, colours, base 20/15/60, max 100/100/99); plan Assumptions (step, bonus) | C1 | - |
| slot bounds (5) | `rack.go:74` (`Atoi` error, `< 0`, `>= Slots`) | non-integer, -1, 6 → 422; 0, 5 accepted: C14 | - |
| first free slot (3) | `rack.go:58` `slices.Index(p.Rack, nil)` | after taken, hole before taken, last: C5; beside an unknown id C26 | - |
| buy validation order (3 adjacent pairs of 4 stages) | `rack.go:50` decode < `:53` component < `:58` full < `:62` pay | `invalid_body` < `unknown_component`: structural (the id comes from the body), with `{` asserted first `:257` · `unknown_component` < `rack_full` `:258` · `rack_full` < `not_enough_coins` `:259` (F1 killed) | - |
| balance boundary (2) | `player.Pay` strict `<` (office C42) | 59 and 60: C6 | - |
| remove outcomes (5) | `rack.go:78-91` | empty slot → no change C13 · known, coins refund C12 (F2 killed) · twice → one refund C13 · unknown id → no refund C26 · **known, gems refund `:86-87`: none** | gems refund branch (plan Out of scope: components priced in gems) |
| `rackBonus` rows (6) | `player.go` `rackBonus`: stat `Bonus` filter, nil skip, `ComponentItem` ok, effect `Stat == st.ID`, `min(v, st.Max)`, integer division per step | type filter (`ram gives no dmg` etc. `bonus_test.go:138-140`) · empty `:124-126` · unknown `:147-150` · multi-effect ssd `:136-137` · cap ×3 `:131`, `:133`, `:135` (F3 killed) · floor cache 38 → 1 `:129`, cpu+gpu 85 → 6 `:130` | - |
| rack summed with other sources (3 named by C21) | C21 claim; `player.go` `Bonus` (skills, gear, skin, office, then `sum += rackBonus`) | skills + gear dmg `:145`, sp `:146` · web gear C41 `:72` · **skin: none** | rack + skin |
| `LoadRack` skip (2) | `player.go` `LoadRack` `slot < len(p.Rack)` | slot 6, slot 9 skipped: C27 `:549` | - |
| deploy coins rounding (3) and snapshot (1) | `deploy.go:114` `math.Round`; plan door 6 | down 43.2 → 43, up 55.6 → 56, 97.3 → 97: C24 (F4 killed) · frozen C25 | - |
| new error codes (3) | `httpx/errors.go` diff, plan door 8 | C19 by status, code and message | - |
| entries to `/server` (3) | plan AC 22-23; `Tabs.tsx`, `TitleScene.tsx` | tab C28, C44 · sign C29 · building C29, C44 | - |
| screen stat bars and bonus lines (3 + 3) | `rack.ts` `statValue` (uptime `%`), `statBonus` (3 branches) | C30, C31 (F5 killed) | - |
| screen slot states (3) | `ServerScene.tsx:94-98` | empty, known, `?`: C32 | - |
| screen card affordability (2) | `ServerScene.tsx:116` `canPay` | reduced / full opacity: C33 | - |
| screen terminal messages (8) | `ServerScene.tsx:10`, `:32`, `:36`, `:43`, `:44`, `:48`, `:54`, `:57` | hello C30 · full C34 · insufficient C35 · installed C36 · removed C37 · unknown removed C37 · empty slot C38 · error, no body, network C39 | - |
| action outcomes on screen (8) | `ServerScene.tsx:28-40` | buy and remove × 200 / message / no body / network: C36, C37, C39 | - |
| avatar totals (2) | `gear.ts` `totalBonus` + `rackBonus` | `dano +N%`, `SP +N`: C41 | - |
| Landing doors (9) | plan Landing | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C24, C25 · 7 C28 · 8 C19 · 9 C21, C24. Door 1's `player_id → players` FK is not asserted, but Relations names only the PK and slot ≥ 0, so this is recorded and not counted | - |
| stored data (1) | plan Impact | existing players C20; office C20's changed migration test PASS | - |

## Test policy rows

Verified at ca6878a.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `player.go` `Bonus` / `rackBonus` | own layer C21 · boundary C22, C23, C24, C27 | yes - each `rackBonus` decision row is asserted at its own layer (see Coverage); F3 killed. The C21 skin clause is a check-level finding, not a `rackBonus` row |
| Decides, reached across a boundary | `rack/rack.go` `Buy`, `Remove`; `player.LoadRack` skip | boundary C4-C17, C19, C26, C27 (the handler's own layer is its route, as office accepted) | **unmet** - Remove's gems-refund row (`rack.go:86-87`) has no asserted case, and the route contract's 404 `player_not_found` path is unasserted on both routes |
| Decides, reached across a boundary | `deploy/deploy.go` `Start` coins | boundary C24, C25 | yes - F4 killed |
| Decides, not reached across a boundary | `web/src/components/ServerScene.tsx`, `web/src/lib/rack.ts` | screen level C30-C40 | yes - pre-checks, stat value and bonus per stat, slot states, messages, outcomes and pending are all asserted; F5 killed |
| Decides, not reached across a boundary | `web/src/lib/gear.ts` `totalBonus` (+ rack) | screen level C41 | yes |
| Entry point that decides nothing | `app/router.go` rack routes, `(game)/server/page.tsx`, `Tabs.tsx`, `TitleScene.tsx` hotspots, `GET /api/catalog`, `migrations/00007_rack.sql` | boundary C1, C16, C18, C20, C28, C29, C42, C43, C44 | yes |
| Instrumentation, pass-throughs | `catalog.go` rack types and `ComponentItem`, `httpx/errors.go`, `player.emptyRack`, `web/src/lib/types.ts`, `globals.css`, `test/helpers.ts` | none of their own - covered by consumers | yes |

**Swept rows citing existing behaviour** (verified at ca6878a):

- Loading state: holds. `GameShell.tsx:77-83` renders an empty scene until `ready` (`:84-86`).
- Unauthorised state: holds. `GameShell.tsx:71-72` shows `LoginScreen`, as office recorded.
- Who may call it: holds. `router.go:67` `pr.Use(auth.RequireSession(...))` wraps `:91-92`, and C16 proves the 401.
- The `n/a` rows are approved policy.

## Faults injected

Verified at ca6878a. All faults ran in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` symlinked in for F5. Each file was restored with `git checkout --` after its run, and the worktree was then removed with `git worktree remove --force` and `git worktree prune`. The real tree's `git status --porcelain` was identical before and after:

    ?? .claude/
    ?? api/cmd/api/api

Each fault targets a different assertion surface: buy ordering, refund, bonus formula, deploy snapshot and the web helper.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `player.Pay` moved before the first-free / `rack_full` check | `api/internal/rack/rack.go:58-64` | yes - `TestBuy_ValidationOrder` (`rack_test.go:259` got `409 not_enough_coins`, want `rack_full`) |
| F2 refund halved: `p.Coins += k.Price.Amount / 2` | `api/internal/rack/rack.go:89` | yes - `TestRemove_RefundsFullPrice` (`rack_test.go:282` coins 75, want 150) |
| F3 stat cap dropped: `(min(v, st.Max) - st.Base)` -> `(v - st.Base)` | `api/internal/player/player.go` `rackBonus` | yes - `TestBonus_Rack` (6 gpu 24 want 8, 6 ram 36 want 17, 6 lb 120 want 39) |
| F4 deploy coins `math.Round` -> `math.Floor` | `api/internal/deploy/deploy.go:114` | yes - `TestStart_RackBoostsCoins` (`rack_test.go:59` 55, want 56) |
| F5 web bonus `Math.floor` -> `Math.round` | `web/src/lib/rack.ts:13` | yes - `stats and bonuses` (cpu+gpu `DANO +7%`, want `DANO +6%`) |

## Gate

Verified at ca6878a.

- `cd api && go test -count=1 -p 1 -v ./...`: exit 0. 11 packages `ok`, 217 passed (208 top-level + 9 subtests), 0 failed.
- `cd web && npx vitest run`: exit 0. 16 files, 214 passed, 0 failed.
- `make e2e`: exit 0. 10 passed, 0 failed, including `server.spec.ts` › `buy and remove` and › `entries`.

Total: 441 passed, 0 failed. The suites are green, but the gaps above are what fail the feature.
