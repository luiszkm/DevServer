# Server room verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: a0a9412..ab9d8852d20df1661ff6266401fa7aed12aac07b (round 2 fix range `ca6878a..ab9d885`: d50a9b7 round 1 report, 18713ee checks, 7ed5db6 tests, ab9d885 handoff)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 46 checks have a proof that ran green at HEAD ab9d885. Each named test exists and shows up in the output on its own as passing. Each has an assertion that targets the value its check names. All three suites exit 0. The 5 faults injected in this round were all killed. The 5 from round 1 are carried.

All three round 1 findings are closed:

1. **`404 player_not_found` on both rack routes.** Closed.
   - The plan's Surface now carries the addendum (`plan.md:182`), and `checks.md` Coverage lists 404 in both route rows.
   - C45 sends a session with no dev to both routes, at `api/internal/rack/rack_test.go:571-573` (`routes` at `:364` holds both paths). The assertion is `rec.Code != 404 || apptest.ErrorCode(t, rec) != "player_not_found"`. `:577` asserts `env.Count("player_rack") != 0`.
   - Fault R2-F3 made `mutate` answer 200 on `ErrPlayerNotFound`. It was killed at `:573` on both routes.
2. **C21's skin clause.** Closed.
   - `api/internal/player/bonus_test.go:118-119` sets `skinned := rack("gpu"); skinned.Skin = "neon"`.
   - `:149` is the row `{"summed with skin neon dmg: 5 + 4", skinned, "dmg", 9}`, asserted at `:155` `got != tc.amount`.
   - The skin carries a bonus: `api/catalog/shop.json:18` `"neon"` has `"bonus": { "type": "dmg", "amount": 5 }`.
   - 9 tells the correct sum apart from rack-only (4) and skin-only (5). Fault R2-F2 dropped the skin term in `Bonus` (`player.go:405-406`). It was killed at `:155`, which returned 4 where 9 was wanted.
3. **Gems-refund branch in `Remove` (`api/internal/rack/rack.go:86-87`).** Closed. The branch is kept, and the plan now decides it: a new Assumptions row (`plan.md:49`, `Confirmed? n`).
   - C46 builds a test catalog with `gpu` at 150 gems (`rack_test.go:584-590`).
   - At 149 gems: `:594` `f.status(..., 409, "not_enough_gems")`, and `:595` `f.unchanged(before)`.
   - At 150 gems: `:598` `f.ok` (200), and `:599` `got.Gems != 0 || got.Coins != 0 || rack(got.Rack) != "gpu,-,-,-,-,-"`.
   - On remove: `:603` `got.Gems != 150 || got.Coins != 0 || got.Rack[0] != nil`.
   - Faults R2-F1 (refund always to coins), R2-F4 (skip `Pay` for gems) and R2-F5 (gems boundary `<` -> `<=`) were killed at `:603`, `:594` and `:598`.

How the proofs ran at ab9d885 (verified at ab9d885):

- **api:** `cd api && go test -count=1 -p 1 -v ./internal/catalog ./internal/rack ./internal/player ./internal/battle ./internal/deploy ./internal/office -run '^(<the 29 names in checks.md>|TestMigration_OfficeExistingPlayers)$'`.
  - Exit 0, 6 packages `ok`, exactly 30 `--- PASS` lines and 0 `--- FAIL`.
  - Each name was grepped as `^--- PASS: <name> (`, and each count was exactly 1.
  - The 29 names are round 1's 27 plus `TestRackRoutes_NoPlayer` and `TestRack_GemsPricedComponent`. The 30th line is the office migration test named in Impact.
- **web:** `cd web && npx vitest run --reporter=verbose` over `Tabs`, `TitleScene`, `ServerScene`, `AvatarScene` and `ComingSoon`, with `-t` set to an alternation of the 15 patterns.
  - Exit 0: 23 passed, 17 skipped by the filter.
  - Every pattern matched at least one passing test. `no scene shows EM BREVE` ran 9 times, including `(/server)`.
- **e2e:** `cd web && npx playwright test e2e/server.spec.ts`: 2 passed, `server.spec.ts:5:5 › buy and remove` and `:32:5 › entries`.
- **Diff check:** C45 and C46 resolve to tests added in 7ed5db6. C21's new row, `bonus_test.go:149`, was also added in 7ed5db6. Every other proof resolves as in round 1, to `1c0b1d5` / `61d7f69`.

**Spec changes in the fix range are additive** (`git diff ca6878a..HEAD -- .specs/features/server-room`, verified at ab9d885):

- `plan.md` is +3/-0: one Assumptions row and one Surface addendum sentence. No approved criterion was reworded.
- `checks.md` adds S5 (C45, C46), their Progress lines and a round 2 Handoff block. The count header changes from 44 to 46.
- `checks.md` also replaces four Coverage rows with supersets:
  - rack statuses: 7 -> 9;
  - remove statuses: 4 -> 5;
  - balance boundary: 2 -> 4;
  - bonus sum: 2 -> 4, now split per source.
- The row `refund currency (2)` is new.
- No check text C1-C44 changed.
- `git diff ca6878a..HEAD -- api web` removes no line: two test files gain lines, and no production file is touched.

Step 1 (binding sources) belongs to the `ui` profile and did not run in either round, and the fix touched no interface file. Step 5 (the walk with the user) and step 7 (lessons) belong to the orchestrator.

**Also observed but not counted:**

- **C45's `player_rack` row count cannot fail through a fault in the rack code.** `player_rack.player_id` is `REFERENCES players (id)` (`api/migrations/00007_rack.sql:4`), and without a player `WithLocked` returns before any insert. The assertion at `:577` holds by construction. The 404 assertion at `:573` is the one that carries C45, and R2-F3 killed it.
- **The web does not follow the new gems assumption.** It hard-codes `coins` in `> coins insuficientes para ...` (`web/src/components/ServerScene.tsx:44`) and in `> ... removido. N coins devolvidos.` (`:57`). With a component rebalanced to gems (`plan.md:49`), the screen would name the wrong currency. The new Assumptions row decides only the api side, and no check covers web copy for a gems price. The shipped catalog has no gems component (C1). This is a gap in the plan's precision, not in the checks.
- Carried from ca6878a:
  - C27's `dmg 4` is proven only indirectly, and `:549` is what pins it.
  - The web conditionals `player.rack ?? ...` and the bar-width clamp cannot be reached.
  - Plan Impact predicted a change to `e2e/shell.spec.ts` that was never needed. It passes unchanged at ab9d885.

## Checks

Verified at ab9d885: every proof ran again at this HEAD. Citations were refreshed in the files the fix touched:

- `rack_test.go`: only lines after `:566` were appended, so citations up to `:566` are unchanged.
- `bonus_test.go`: lines from `:118` shifted by +2, and lines from `:149` shifted by +3.

Citations in untouched files are carried from ca6878a, and their lines are unchanged.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog `rack`: 6 slots, 3 stats, 6 components, every field by value | `TestCatalog_ServesRack` PASS | `api/internal/catalog/catalog_test.go:511-527` literal with every key and value; `:531` `reflect.DeepEqual(b.Rack, w)` | PASS |
| C2 | `/api/me` rack `[null,"gpu",null,null,null,"ram"]` | `TestMe_RackField` PASS | `api/internal/rack/rack_test.go:128-129` placement; `:131` body contains `"rack":[null,"gpu",null,null,null,"ram"]` | PASS |
| C3 | new player `201` with 6 null | `TestCreatePlayer_RackDefaults` PASS | `rack_test.go:141` `rec.Code != http.StatusCreated`; `:144` `"rack":[null,null,null,null,null,null]` | PASS |
| C4 | 100 coins, `ram` → 200, 40 coins, slot 0 row | `TestBuy_PaysAndPlaces` PASS | `rack_test.go:154` `got.Coins != 40`, `rack(got.Rack) != "ram,-,-,-,-,-"` (200 via `f.ok` `:72`); `:159` row `slot != 0`, `id != "ram"` | PASS |
| C5 | first free slot: 2, 0, 5 | `TestBuy_FirstFreeSlot` PASS | rows `rack_test.go:171-173`; `:180` `got != tc.want` | PASS |
| C6 | 59 coins 409 unchanged; 60 pays to 0 | `TestBuy_BalanceBoundary` PASS | `rack_test.go:191` `409 not_enough_coins`; `:192` snapshot unchanged; `:194` `got.Coins != 0` and rack `ram` | PASS |
| C7 | full rack 409 `rack_full` and message, 1000 coins kept; 5 taken → slot 5 | `TestBuy_RackFull` PASS | `rack_test.go:208` `409 rack_full`; `:211` `msg != "rack cheio. remova um componente antes"`; `:214` unchanged; `:221` `ram,ram,ram,ram,ram,cpu`, 920 | PASS |
| C8 | `x` and `{}` → 422 `unknown_component`, unchanged | `TestBuy_UnknownComponent` PASS | `rack_test.go:230`, `:231` `422 unknown_component`; `:232` unchanged | PASS |
| C9 | `{` and `{"component": 1}` → 422 `invalid_body` | `TestBuy_InvalidBody` PASS | bodies `rack_test.go:239`; `:243` `422 invalid_body`; `:245` unchanged | PASS |
| C10 | validation order, four cases | `TestBuy_ValidationOrder` PASS | `rack_test.go:257` `{` → `invalid_body`; `:258` `x` → `unknown_component`; `:259` `cpu` → `409 rack_full`; `:261` one free slot → `409 not_enough_coins` | PASS |
| C11 | `ram` twice, 120 → 0, two slots | `TestBuy_Duplicates` PASS | `rack_test.go:269` `got.Coins != 0`, `rack(got.Rack) != "ram,ram,-,-,-,-"` | PASS |
| C12 | remove refunds full price: gpu +150, ram +60, others unchanged | `TestRemove_RefundsFullPrice` PASS | `rack_test.go:281` `Coins != 150`, rack `ram` only; `:285` `Coins != 210`, empty; `:288` gems 20 | PASS |
| C13 | empty slot 200 unchanged; second remove refunds once | `TestRemove_EmptySlot` PASS | `rack_test.go:298` `f.ok(f.remove("4"))`; `:299` unchanged; `:303` `got.Coins != 150` | PASS |
| C14 | `-1`, `6`, `a` → 422 `unknown_slot`; 0 and 5 accepted | `TestRemove_SlotBounds` PASS | `rack_test.go:311-312` `422 unknown_slot`; `:314-315` `f.ok` on 0 and 5 | PASS |
| C15 | concurrent buys serialize (rack_full / not_enough_coins) | `TestBuy_ConcurrentSerialize` PASS | `rack_test.go:347` 1 ok and `rack_full`; `:350` 920 and cpu in slot 5; `:356` 1 ok and `not_enough_coins`; `:359` 0 coins, one cpu | PASS |
| C16 | both routes 401 without a session | `TestRackRoutes_RequireSession` PASS | routes `rack_test.go:364`; `:370` `rec.Code != 401`, `ErrorCode != "unauthenticated"` | PASS |
| C17 | `player_rack` down: 5 routes 500, log `request_id` and `player_rack`, unchanged | `TestRack_LoadFailure` PASS | `rack_test.go:386` `500 internal`; `:397-400` log line with the request id contains `player_rack`; `:403-407` the 5 routes; `:409` unchanged; `:410` battles 0 | PASS |
| C18 | PK and `CHECK (slot >= 0)` | `TestTables_RackConstraints` PASS | rows `rack_test.go:428` `23505`, `:429` `23514`; `:431` `got != tc.want` | PASS |
| C19 | 3 new codes with their messages | `TestRack_ErrorCodes` PASS | `rack_test.go:446` status, code and message compared exactly; `:450` `unknown_component`, `:451` `unknown_slot`, `:455` `rack_full` | PASS |
| C20 | migration 00007 over an existing player; `/api/me` 200 with 6 null | `TestMigration_RackExistingPlayers` PASS | `rack_test.go:480` to 6; `:488` old player; `:492` to 7; `:496` empty `player_rack`; `:517` 200; `:520` 6 null | PASS |
| C21 | `player.Bonus` over the rack: values, caps, floors, exclusions, summed with skills, gear and skin | `TestBonus_Rack` PASS | rows `api/internal/player/bonus_test.go:126-153`, asserted at `:155` `got != tc.amount`: empty 0 ×3 `:126-128`, gpu 4 `:129`, cpu 2 `:130`, cache 1 `:131`, cpu+gpu 6 `:132`, 6 gpu 8 `:133`, ram 6 `:134`, 6 ram 17 `:135`, lb 20 `:136`, 6 lb 39 `:137`, ssd 1/8 `:138-139`, hp/xp/deploy/spregen 0 `:143-146`, skills+gear dmg 22 `:147`, skills sp 14 `:148`, **skin neon + gpu dmg 9 `:149`** (skin set `:118-119`; `shop.json:18` neon dmg 5); R2-F2 killed at `:155` | PASS |
| C22 | battle SP 50/50, 56/56, 67/67 | `TestBattle_RackSPMax` PASS | rows `api/internal/battle/rack_test.go:20-22`; `:26` `SP != tc.sp`, `SPMax != tc.sp` | PASS |
| C23 | FIX (roll 6) 20 / 21 / 22 | `TestBattle_RackDamage` PASS | rows `battle/rack_test.go:39-41`; `:48` `Type != "damage"`, `Amount != tc.damage` | PASS |
| C24 | deploy coins 40/48/43/56, NV.2 97; XP, gems, `ends_at` unchanged; claim pays stored | `TestStart_RackBoostsCoins` PASS | rows `api/internal/deploy/rack_test.go:56-60`; `:51` stored coins, xp, gems, `ends`; `:70` `Reward.Coins != 97`, `Player.Coins != 97` | PASS |
| C25 | coins frozen at 48 across remove and 6 buys; claim 48 | `TestDeploy_RackFrozenAtStart` PASS | `deploy/rack_test.go:84` 48 at start; `:93-96` remove and 6 `lb`; `:97` still 48; `:105` `Reward.Coins != 48` | PASS |
| C26 | `quantum`: occupies, sums 0, removed with no refund | `TestUnknownComponent_OccupiesAndRemoves`, `TestBonus_Rack` PASS | `rack_test.go:530` `quantum,cpu,-,-,-,-`; `:536` `409 rack_full`; `:538` `Coins != 920`, `Gems != 20`, `Rack[0] != nil`; `bonus_test.go:150-153` quantum dmg/sp/coins 0, beside gpu 4, asserted at `:155` | PASS |
| C27 | rows at slots 6 and 9 skipped; `dmg` 4 | `TestMe_SkipsSlotsOutsideCatalog` PASS | `rack_test.go:549` `rack(f.me().Rack) != "gpu,-,-,-,-,-"`; `:563` FIX damage 21 (weak signal, carried note) | PASS |
| C28 | 9 tabs, SERVER 03 → `/server` | `tab order and routes` PASS | `web/src/components/Tabs.test.tsx:13-22` `toEqual` over 9 labels and hrefs (`:16` `["SERVER", "/server"]`); `:24` `01`…`09`; `:25` `03` | PASS |
| C29 | SERVER sign and SALA DE SERVIDORES building; 4 earlier signs unchanged | `server hotspots` PASS | `web/src/components/TitleScene.test.tsx:21-23`; `:25-27`; `:33-38` 4 earlier; `:39` 6 links | PASS |
| C30 | empty rack: bars, rack panel, 6 slots, 6 cards in order, hello text | `empty rack` PASS | `web/src/components/ServerScene.test.tsx:40` stat order; `:41-43` name, value, width; `:45-46` rack and 6 slots; `:48-52` card order and names; `:53` terminal | PASS |
| C31 | bars and bonus lines at the limits | `stats and bonuses` PASS | cases `ServerScene.test.tsx:59-70`; `:74` `toMatchObject(want)` | PASS |
| C32 | slot states `-`/`SLOT 0n VAZIO`/`livre`, gpu, ssd, `?` | `slot states` PASS | `ServerScene.test.tsx:87`, `:91-92` empty; `:88` gpu; `:89` ssd; `:90` `read(3)[0]).toBe("?")` | PASS |
| C33 | card glyph, name, effects, price; opacity at 100 and 80 coins | `shop cards` PASS | `ServerScene.test.tsx:104-111` all 6 by value; `:112-114` lb and gpu `0.45`, cpu `1`; `:117-118` at 80 | PASS |
| C34 | full rack: message, no fetch | `rack full` PASS | `ServerScene.test.tsx:126` exact text; `:127` `not.toHaveBeenCalled()` | PASS |
| C35 | 79 coins: message and alert, no fetch; 80 buys | `insufficient coins` PASS | `ServerScene.test.tsx:135` text; `:136` `COINS INSUFICIENTES`; `:137` no fetch; `:141` 1 call | PASS |
| C36 | buy route, body, setPlayer, `slot 03` message | `buy` PASS | `ServerScene.test.tsx:150` 1 call; `:151` body `{ component: "ram" }`; `:152` `setPlayer(after)`; `:153` exact text | PASS |
| C37 | remove route, setPlayer, refund text; `quantum` text | `remove` PASS | `ServerScene.test.tsx:165-168` route, no body, `setPlayer`, `GPU EDGE removido. 150 coins devolvidos.`; `:170-171` `componente removido.` | PASS |
| C38 | empty slot message, no fetch | `empty slot` PASS | `ServerScene.test.tsx:179` exact text; `:180` no fetch | PASS |
| C39 | 409 message / 500 with no body / network, on both actions; rack stays | `action errors` PASS | cases `ServerScene.test.tsx:186-189`; `:195`, `:198` text; `:196`, `:199` rack region present; `:200` no setPlayer | PASS |
| C40 | 12 buttons disabled while pending, enabled after | `pending disables` PASS | `ServerScene.test.tsx:213` 12; `:214` `toBeDisabled()`; `:216` `toBeEnabled()` | PASS |
| C41 | AVATAR `dano +4%`, `SP +6`; with macbook `dano +12%` | `rack bonuses` PASS | `web/src/components/AvatarScene.test.tsx:67-68`; `:72` | PASS |
| C42 | browser: buy, HUD 40, RAM 45, `SP MÁX +6`, reload, remove, HUD 100 | `buy and remove` PASS | `web/e2e/server.spec.ts:14` text; `:15` 40; `:17-18` 45 and `SP MÁX +6`; `:22-23` after reload; `:26` refund text; `:27` 100 | PASS |
| C43 | 9 routes, `/server` included, show no EM BREVE | `no scene shows EM BREVE` (9) PASS | row `web/src/components/ComingSoon.test.tsx:21` `["/server", ServerPage]`; `:44-45` `not.toContain("EM BREVE")` | PASS |
| C44 | browser: building hotspot and SERVER tab reach `/server` | `entries` PASS | `web/e2e/server.spec.ts:34-36` hotspot → `/server$` and `RACK LOCALHOST-01`; `:40-42` tab → `/server$` | PASS |
| C45 | session without a dev: both rack routes `404 player_not_found`; no `player_rack` row | `TestRackRoutes_NoPlayer` PASS | `rack_test.go:571` `env.Session(9, "ghost")` with no player; `:572` over `routes` (`:364` both paths); `:573` `rec.Code != 404`, `apptest.ErrorCode(t, rec) != "player_not_found"`; `:577` `env.Count("player_rack") != 0`; R2-F3 killed at `:573` | PASS |
| C46 | `gpu` at 150 gems: 150 gems buys to 0/0 in slot 0; 149 → `409 not_enough_gems` unchanged; remove +150 gems, coins unchanged | `TestRack_GemsPricedComponent` PASS | catalog edit `rack_test.go:584-590` (`Price{Currency: "gems", Amount: 150}` `:587`); `:592` gems 149 coins 0; `:594` `f.status(..., 409, "not_enough_gems")`; `:595` `f.unchanged(before)`; `:598` `f.ok` 200 at 150; `:599` `got.Gems != 0`, `got.Coins != 0`, `rack(got.Rack) != "gpu,-,-,-,-,-"`; `:603` `got.Gems != 150`, `got.Coins != 0`, `got.Rack[0] != nil`; R2-F1, R2-F4 and R2-F5 killed | PASS |

## Coverage

Rows the fix touched are recomputed and marked `verified at ab9d885`. Every other row is `carried from ca6878a`. The fix touched no production file, so their authority is unchanged.

Earlier-feature members were confirmed as `--- PASS` in the full api run at ab9d885. These are the deploy route tests and `TestAuthMiddleware_RejectsEveryProtectedRoute` / `TestPlayerNotFound_OnPlayerRoutes`, the same names as in round 1.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/me/rack` statuses (9) - verified at ab9d885 | code: `router.go:67` `RequireSession`, `:91`; `rack.go:50` decode, `:53-55` component, `player.go:129` `WithLocked` scan → `ErrPlayerNotFound`, `rack.go:59-60` full, `:62` `Pay` → `player.go:372-373` gems / `:377-378` coins; `httpx` 500. Plan Surface plus the round 1 addendum (`plan.md:182`) | 200 C4 · 401 C16 · 404 `player_not_found` C45 `:573` (R2-F3 killed) · 409 `rack_full` C7 · 409 `not_enough_coins` C6 · 409 `not_enough_gems` C46 `:594` (R2-F4 killed) · 422 `invalid_body` C9 · 422 `unknown_component` C8 · 500 C17 | - |
| `POST /api/me/rack/{slot}/remove` statuses (5) - verified at ab9d885 | code: `router.go:92`; `rack.go:73-75` slot, `:77-93`; `player.go:129` | 200 C12, C13, C46 · 401 C16 · 404 `player_not_found` C45 `:573` (both routes in `routes` `:364`) · 422 `unknown_slot` C14 · 500 C17 | - |
| `POST /api/me/deploys` statuses (8) - carried from ca6878a | plan Surface (unchanged route) | 201 C24 · 401 / 409 / 422 ×4 / 500: deploy-pipelines tests, each `--- PASS` at ab9d885 · rack cause 500 C17 | - |
| `GET /api/me` statuses (4) - carried from ca6878a | plan Surface | 200 C2, C27 · 401 `TestAuthMiddleware_RejectsEveryProtectedRoute` · 404 `TestPlayerNotFound_OnPlayerRoutes` · 500 C17 | - |
| catalog `rack` keys (3) and startup assembly (1) - carried from ca6878a | plan Landing door 2; `cmd/api/main.go:43` `catalog.Load()`, `:51` `Catalog: cat`; `apptest.go:112`, `:127` | C1; main and apptest share one `Load` | - |
| components × fields (6 × 6), stats × fields (3 × 7) - carried from ca6878a | prototype `shopData` and `stats`, plan Assumptions; `rack.json:9-14` | C1, every field by value | - |
| slot bounds (5) - carried from ca6878a | `rack.go:74` | non-integer, -1, 6 → 422; 0, 5 accepted: C14 | - |
| first free slot (3) - carried from ca6878a | `rack.go:58` | C5; beside an unknown id C26 | - |
| buy validation order (3 adjacent pairs) - carried from ca6878a | `rack.go:50` < `:53` < `:58` < `:62` | C10 `:257-259` (F1 killed) | - |
| balance boundary (4) - verified at ab9d885 | `player.Pay` `player.go:369-383`, strict `<` at `:372` (gems) and `:377` (coins); plan Assumptions row `plan.md:49` | coins below 59 / equal 60 C6 `:191`, `:194` · gems below 149 C46 `:594` · gems equal 150 C46 `:598-599` (R2-F5 killed at `:598`) | - |
| refund currency (2) - verified at ab9d885 | `rack.go:86-90` (`if k.Price.Currency == "gems"` / `else`) | coins C12 `:281`, `:285` (F2 carried) · gems C46 `:603` (R2-F1 killed) | - |
| remove outcomes (5) - verified at ab9d885 | `rack.go:78-91` | empty slot → no change C13 · known, coins refund C12 · known, gems refund C46 `:603` · twice → one refund C13 · unknown id → no refund C26 | - |
| `rackBonus` rows (6) - verified at ab9d885 (citations refreshed) | `player.go:427` `rackBonus` | type filter `bonus_test.go:140-142` · empty `:126-128` · unknown `:150-153` · multi-effect ssd `:138-139` · cap ×3 `:133`, `:135`, `:137` (F3 carried) · floor cache 38 → 1 `:131`, cpu+gpu 85 → 6 `:132` | - |
| rack summed with other sources (3 named by C21) - verified at ab9d885 | C21 claim; `player.go:396` skills, `:402` gear, `:405-406` skin, `:414` office, `:418` `sum += rackBonus`. Office types (xp, deploy, spregen) share no type with the rack (dmg, sp, coins), so rack + office has no joint value to assert | skills `bonus_test.go:147-148` · gear `:147`, web C41 `:72` · skin `:149` (R2-F2 killed) | - |
| `LoadRack` skip (2) - carried from ca6878a | `player.go` `LoadRack` `slot < len(p.Rack)` | slot 6, slot 9: C27 `:549` | - |
| deploy coins rounding (3) and snapshot (1) - carried from ca6878a | `deploy.go:114` `math.Round`; plan door 6 | C24 (F4 carried) · C25 | - |
| new error codes (3) - carried from ca6878a | `httpx/errors.go` diff, plan door 8 | C19 | - |
| entries to `/server` (3) - carried from ca6878a | plan AC 22-23 | tab C28, C44 · sign C29 · building C29, C44 | - |
| screen stat bars, bonus lines, slot states, card affordability, terminal messages, action outcomes, avatar totals - carried from ca6878a | `rack.ts`, `ServerScene.tsx`, `gear.ts` (untouched in the fix range) | C30-C41 (F5 carried) | - |
| Landing doors (9) - carried from ca6878a | plan Landing | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C24, C25 · 7 C28 · 8 C19 · 9 C21, C24. Door 1's FK is not asserted, but Relations names only the PK and slot ≥ 0, so this is recorded and not counted | - |
| stored data (1) - carried from ca6878a | plan Impact | C20; office C20's changed migration test PASS at ab9d885 | - |

## Test policy rows

Rows classifying a file whose proofs the fix touched (`player.go` `Bonus`, `rack/rack.go`) and the row round 1 left unmet are verified at ab9d885. The rest are carried from ca6878a.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `player.go` `Bonus` / `rackBonus` (verified at ab9d885) | own layer C21 · boundary C22, C23, C24, C27 | yes - every `rackBonus` row and every source summed with the rack (skills, gear, skin) is asserted at its own layer (`bonus_test.go:126-153`, `:155`); R2-F2 killed |
| Decides, reached across a boundary | `rack/rack.go` `Buy`, `Remove`; `player.LoadRack` skip (verified at ab9d885) | boundary C4-C17, C19, C26, C27, C45, C46 (the handler's own layer is its route, as office accepted) | yes - the currency dispatch in `Remove` now has both rows asserted (coins C12, gems C46 `:603`); gems pay at both sides of the boundary (C46 `:594`, `:598`); 404 on both routes (C45 `:573`); R2-F1, R2-F3, R2-F4, R2-F5 killed |
| Decides, reached across a boundary | `deploy/deploy.go` `Start` coins (carried from ca6878a) | boundary C24, C25 | yes - F4 killed |
| Decides, not reached across a boundary | `web/src/components/ServerScene.tsx`, `web/src/lib/rack.ts` (carried from ca6878a) | screen level C30-C40 | yes - F5 killed |
| Decides, not reached across a boundary | `web/src/lib/gear.ts` `totalBonus` (+ rack) (carried from ca6878a) | screen level C41 | yes |
| Entry point that decides nothing | `app/router.go` rack routes, `(game)/server/page.tsx`, `Tabs.tsx`, `TitleScene.tsx` hotspots, `GET /api/catalog`, `migrations/00007_rack.sql` (carried from ca6878a) | boundary C1, C16, C18, C20, C28, C29, C42, C43, C44 | yes |
| Instrumentation, pass-throughs | `catalog.go` rack types and `ComponentItem`, `httpx/errors.go`, `player.emptyRack`, `web/src/lib/types.ts`, `globals.css`, `test/helpers.ts` (carried from ca6878a) | none of their own - covered by consumers | yes |

**Swept rows citing existing behaviour** (carried from ca6878a; the fix touched none of these files):

- Loading state: holds. `GameShell.tsx:77-86`.
- Unauthorised state: holds. `GameShell.tsx:71-72`.
- Who may call it: holds. `router.go:67` wraps `:91-92`, and C16 proves the 401.
- The `n/a` rows are approved policy.

## Faults injected

Verified at ab9d885. All faults ran in `git worktree add <scratchpad>/wt2 HEAD`. Each file was restored with `git checkout --` after its run, and the worktree was then removed with `git worktree remove --force` and `git worktree prune`. The real tree's `git status --porcelain` was identical before and after (`diff` empty):

    ?? .claude/
    ?? api/cmd/api/api

Round 2 made each surface the fix created fail once: the C45 404, the C46 gems 409, the C46 gems-equal buy, the C46 gems refund and the C21 skin row. The round 1 faults are carried, because the fix touched none of their code.

| Mutation | Location | Killed |
| --- | --- | --- |
| R2-F1 refund always to coins: the `if k.Price.Currency == "gems"` / `else` collapsed to `p.Coins += k.Price.Amount` | `api/internal/rack/rack.go:86-90` | yes - `TestRack_GemsPricedComponent` (`rack_test.go:603`: gems 0 coins 150, want 150, 0) |
| R2-F2 skin term dropped from `Bonus` (`sum += s.Bonus.Amount` removed) | `api/internal/player/player.go:406` | yes - `TestBonus_Rack` (`bonus_test.go:155`, row `:149`: `Bonus(dmg) = 4, want 9`) |
| R2-F3 `mutate` answers `200 {}` on `httpx.ErrPlayerNotFound` | `api/internal/rack/rack.go:35` | yes - `TestRackRoutes_NoPlayer` (`rack_test.go:573`: 200 on `/api/me/rack` and on `/api/me/rack/0/remove`) |
| R2-F4 `Buy` calls `player.Pay` only when `k.Price.Currency == "coins"` | `api/internal/rack/rack.go:62-64` | yes - `TestRack_GemsPricedComponent` (`rack_test.go:594`: got 200 with gems 149 and gpu installed, want `409 not_enough_gems`) |
| R2-F5 gems boundary `p.Gems < price.Amount` -> `<=` | `api/internal/player/player.go:372` | yes - `TestRack_GemsPricedComponent` (`rack_test.go:598`: 150 gems got `409 not_enough_gems`, want 200) |
| F1 (round 1, carried from ca6878a) `Pay` moved before `rack_full` | `rack.go:58-64` | yes - `TestBuy_ValidationOrder` |
| F2 (round 1, carried from ca6878a) refund halved | `rack.go:89` | yes - `TestRemove_RefundsFullPrice` |
| F3 (round 1, carried from ca6878a) stat cap dropped in `rackBonus` | `player.go` `rackBonus` | yes - `TestBonus_Rack` |
| F4 (round 1, carried from ca6878a) deploy coins `math.Round` -> `math.Floor` | `deploy.go:114` | yes - `TestStart_RackBoostsCoins` |
| F5 (round 1, carried from ca6878a) web bonus `Math.floor` -> `Math.round` | `web/src/lib/rack.ts:13` | yes - `stats and bonuses` |

## Gate

Verified at ab9d885.

- `cd api && go test -count=1 -p 1 -v ./...`: exit 0. 11 packages `ok`, 219 passed (210 top-level + 9 subtests), 0 failed.
- `cd web && npx vitest run`: exit 0. 16 files, 214 passed, 0 failed.
- `make e2e`: exit 0. 10 passed, 0 failed, including `server.spec.ts` › `buy and remove` and › `entries`.

Total: 443 passed, 0 failed.
