# Server room verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: a0a9412..ed70f470a59b75148df1922b7c482c7f33298e02 (round 3 fix range `050224c..ed70f47`: 016ea84 plan and checks, 9939ad9 web fix and test, ed70f47 handoff)
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 47 checks have a proof that ran green at HEAD ed70f47. Each named test exists and shows up in the output on its own as passing. Each has an assertion that targets the value its check names. All three suites exit 0. The 5 faults injected this round, all on surfaces the fix touched or created, were killed. The 10 faults from rounds 1 and 2 are carried.

The round 2 observation is closed: the screen now names the component's currency.

- `web/src/components/ServerScene.tsx:13` adds `unit = (p: Price) => (p.currency === "gems" ? "gems" : "coins")`.
- It is used in the insufficient-balance message at `:47` and in the refund message at `:60`. No other literal `coins` or `gems` is left in the file (`rg -n 'coins|gems' ServerScene.tsx` finds only `:12-13`).
- The card price (`priceShort`, `:130`), the opacity (`canPay`, `:119`) and the alert (`insufficient`, `:47`) already followed `price.currency` through `web/src/lib/gear.ts`. C47 now asserts all three for a gems price.

How the proofs ran at ed70f47 (verified at ed70f47):

- **api:** `cd api && go test -count=1 -p 1 -v ./internal/catalog ./internal/rack ./internal/player ./internal/battle ./internal/deploy ./internal/office -run '^(<the 29 names in checks.md>|TestMigration_OfficeExistingPlayers)$'`.
  - Exit 0, 6 packages `ok`, exactly 30 `--- PASS` lines and 0 `--- FAIL`.
  - The 29 names were extracted from the `Proof:` lines of `checks.md`. Each was grepped as `^--- PASS: <name> (`, and each count was exactly 1.
  - The 30th line is the office migration test named in Impact.
- **web:** `cd web && npx vitest run --reporter=verbose` over `Tabs`, `TitleScene`, `ServerScene`, `AvatarScene` and `ComingSoon`, with `-t` set to an alternation of the 16 patterns: round 2's 15 plus `gems priced component`.
  - Exit 0: 24 passed, 17 skipped by the filter.
  - Every pattern matched at least one passing test, including `ServerScene > gems priced component`. `no scene shows EM BREVE` ran 9 times, including `(/server)`.
- **e2e:** `cd web && npx playwright test e2e/server.spec.ts`: exit 0, 2 passed, `server.spec.ts:5:5 › buy and remove` and `:32:5 › entries`. Before the run, ports 9180, 8180 and 3100 had no listener, so `reuseExistingServer` could not attach to a stale server.
- **Diff check:** C47 resolves to `ServerScene.test.tsx:220`. That test was added in 9939ad9 (`git log -S'gems priced component'`), in the same commit as the production change it proves. Every other proof resolves as in round 2.

**Spec changes in the fix range are additive** (`git diff 050224c..HEAD -- .specs`, verified at ed70f47):

- `plan.md` is +10/-0. It adds S5 with AC 36, a traceability row `RACK-05`, and an Observable row `screen /server - moeda do componente`. No approved criterion was reworded.
- `checks.md` adds S6 (C47), its Progress line, one Coverage row `screen currency (2)` and a round 3 Handoff block. The count header changes from 46 to 47.
- No check text C1-C46 changed.
- `git diff 050224c..HEAD -- api web` touches only `ServerScene.tsx` (+6/-3) and `ServerScene.test.tsx` (+40/-2). In the test file, the 2 removed lines are the imports at `:5-6`, which were rewritten to also bring in `Catalog` and `RACK`.

C47 matches AC 36 member for member:

| AC 36 member | C47 assertion |
| --- | --- |
| card price `<n>G` | `:237` |
| opacity by gems | `:238`, `:246` |
| insufficient message | `:240` |
| `GEMS INSUFICIENTES` alert | `:241` |
| no api call | `:242` |
| refund message | `:254` |

Step 1 (binding sources) belongs to the `ui` profile and did not run in any round. Step 5 (the walk with the user) and step 7 (lessons) belong to the orchestrator.

**Also observed but not counted:**

- The gems path is proven only at screen level. The shipped catalog has no gems component (C1), so the browser round trip (C42) cannot reach it. That is expected for a catalog-only rebalance (AD-003), and the Test policy row for `ServerScene` asks for a proof at its own layer.
- The `checks.md` Coverage rows `screen card affordability (2)` and `screen terminal messages (8)` were not widened. When recomputed from the code, they have 4 and 11 members, and the gems members sit in the new `screen currency (2)` row. Every recomputed member has a proof (see Coverage), so this is bookkeeping and not an unproven member.
- Carried from ab9d885:
  - C45's `player_rack` row count holds by construction, because of the FK. `:573` carries C45.
  - C27's `dmg 4` is proven only indirectly, and `:549` is what pins it.
  - The web conditionals `player.rack ?? ...` and the bar-width clamp cannot be reached.
  - Plan Impact predicted a change to `e2e/shell.spec.ts` that was never needed. It passes unchanged at ed70f47.

## Checks

Verified at ed70f47: every proof ran again at this HEAD. Citations were refreshed in the files the fix touched:

- `web/src/components/ServerScene.test.tsx`: the hunk at `:2-9` rewrites 2 import lines in place, and the only other change is the block appended at `:218-255`. The citations for C30-C40 (`:38-216`) were re-read at ed70f47 and are unchanged.
- `web/src/components/ServerScene.tsx`: lines from `:12` shifted by +3. No check row cites this file, and the Coverage rows below cite it at its new lines.

Citations in the other files are carried from ab9d885. Those files are outside the fix range, and their lines are unchanged.

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
| C21 | `player.Bonus` over the rack: values, caps, floors, exclusions, summed with skills, gear and skin | `TestBonus_Rack` PASS | rows `api/internal/player/bonus_test.go:126-153`, asserted at `:155` `got != tc.amount`: empty 0 ×3 `:126-128`, gpu 4 `:129`, cpu 2 `:130`, cache 1 `:131`, cpu+gpu 6 `:132`, 6 gpu 8 `:133`, ram 6 `:134`, 6 ram 17 `:135`, lb 20 `:136`, 6 lb 39 `:137`, ssd 1/8 `:138-139`, hp/xp/deploy/spregen 0 `:143-146`, skills+gear dmg 22 `:147`, skills sp 14 `:148`, skin neon + gpu dmg 9 `:149` (skin set `:118-119`) | PASS |
| C22 | battle SP 50/50, 56/56, 67/67 | `TestBattle_RackSPMax` PASS | rows `api/internal/battle/rack_test.go:20-22`; `:26` `SP != tc.sp`, `SPMax != tc.sp` | PASS |
| C23 | FIX (roll 6) 20 / 21 / 22 | `TestBattle_RackDamage` PASS | rows `battle/rack_test.go:39-41`; `:48` `Type != "damage"`, `Amount != tc.damage` | PASS |
| C24 | deploy coins 40/48/43/56, NV.2 97; XP, gems, `ends_at` unchanged; claim pays stored | `TestStart_RackBoostsCoins` PASS | rows `api/internal/deploy/rack_test.go:56-60`; `:51` stored coins, xp, gems, `ends`; `:70` `Reward.Coins != 97`, `Player.Coins != 97` | PASS |
| C25 | coins frozen at 48 across remove and 6 buys; claim 48 | `TestDeploy_RackFrozenAtStart` PASS | `deploy/rack_test.go:84` 48 at start; `:93-96` remove and 6 `lb`; `:97` still 48; `:105` `Reward.Coins != 48` | PASS |
| C26 | `quantum`: occupies, sums 0, removed with no refund | `TestUnknownComponent_OccupiesAndRemoves`, `TestBonus_Rack` PASS | `rack_test.go:530` `quantum,cpu,-,-,-,-`; `:536` `409 rack_full`; `:538` `Coins != 920`, `Gems != 20`, `Rack[0] != nil`; `bonus_test.go:150-153` quantum dmg/sp/coins 0, asserted at `:155` | PASS |
| C27 | rows at slots 6 and 9 skipped; `dmg` 4 | `TestMe_SkipsSlotsOutsideCatalog` PASS | `rack_test.go:549` `rack(f.me().Rack) != "gpu,-,-,-,-,-"`; `:563` FIX damage 21 (weak signal, carried note) | PASS |
| C28 | 9 tabs, SERVER 03 → `/server` | `tab order and routes` PASS | `web/src/components/Tabs.test.tsx:13-22` `toEqual` over 9 labels and hrefs (`:16` `["SERVER", "/server"]`); `:24` `01`…`09`; `:25` `03` | PASS |
| C29 | SERVER sign and SALA DE SERVIDORES building; 4 earlier signs unchanged | `server hotspots` PASS | `web/src/components/TitleScene.test.tsx:21-23`; `:25-27`; `:33-38` 4 earlier; `:39` 6 links | PASS |
| C30 | empty rack: bars, rack panel, 6 slots, 6 cards in order, hello text | `empty rack` PASS | `web/src/components/ServerScene.test.tsx:40` stat order; `:41-43` name, value, width; `:45-46` rack and 6 slots; `:48-52` card order and names; `:53` terminal | PASS |
| C31 | bars and bonus lines at the limits | `stats and bonuses` PASS | cases `ServerScene.test.tsx:59-70`; `:74` `toMatchObject(want)` | PASS |
| C32 | slot states `-`/`SLOT 0n VAZIO`/`livre`, gpu, ssd, `?` | `slot states` PASS | `ServerScene.test.tsx:87`, `:91-92` empty; `:88` gpu; `:89` ssd; `:90` `read(3)[0]).toBe("?")` | PASS |
| C33 | card glyph, name, effects, price; opacity at 100 and 80 coins | `shop cards` PASS | `ServerScene.test.tsx:104-111` all 6 by value (`80C` … `150C`); `:112-114` lb and gpu `0.45`, cpu `1`; `:117-118` at 80 | PASS |
| C34 | full rack: message, no fetch | `rack full` PASS | `ServerScene.test.tsx:126` exact text; `:127` `not.toHaveBeenCalled()` | PASS |
| C35 | 79 coins: message and alert, no fetch; 80 buys | `insufficient coins` PASS | `ServerScene.test.tsx:135` `/^> coins insuficientes para CPU 8-CORE\.$/`; `:136` `COINS INSUFICIENTES`; `:137` no fetch; `:141` 1 call; R3-F5 killed at `:135` | PASS |
| C36 | buy route, body, setPlayer, `slot 03` message | `buy` PASS | `ServerScene.test.tsx:150` 1 call; `:151` body `{ component: "ram" }`; `:152` `setPlayer(after)`; `:153` exact text | PASS |
| C37 | remove route, setPlayer, refund text; `quantum` text | `remove` PASS | `ServerScene.test.tsx:165-167` route, no body, `setPlayer`; `:168` `/^> GPU EDGE removido\. 150 coins devolvidos\.$/`; `:170-171` `componente removido.`; R3-F5 killed at `:168` | PASS |
| C38 | empty slot message, no fetch | `empty slot` PASS | `ServerScene.test.tsx:179` exact text; `:180` no fetch | PASS |
| C39 | 409 message / 500 with no body / network, on both actions; rack stays | `action errors` PASS | cases `ServerScene.test.tsx:186-189`; `:195`, `:198` text; `:196`, `:199` rack region present; `:200` no setPlayer | PASS |
| C40 | 12 buttons disabled while pending, enabled after | `pending disables` PASS | `ServerScene.test.tsx:213` 12; `:214` `toBeDisabled()`; `:216` `toBeEnabled()` | PASS |
| C41 | AVATAR `dano +4%`, `SP +6`; with macbook `dano +12%` | `rack bonuses` PASS | `web/src/components/AvatarScene.test.tsx:67-68`; `:72` | PASS |
| C42 | browser: buy, HUD 40, RAM 45, `SP MÁX +6`, reload, remove, HUD 100 | `buy and remove` PASS | `web/e2e/server.spec.ts:14` text; `:15` 40; `:17-18` 45 and `SP MÁX +6`; `:22-23` after reload; `:26` refund text; `:27` 100 | PASS |
| C43 | 9 routes, `/server` included, show no EM BREVE | `no scene shows EM BREVE` (9) PASS | row `web/src/components/ComingSoon.test.tsx:21` `["/server", ServerPage]`; `:44-45` `not.toContain("EM BREVE")` | PASS |
| C44 | browser: building hotspot and SERVER tab reach `/server` | `entries` PASS | `web/e2e/server.spec.ts:34-36` hotspot → `/server$` and `RACK LOCALHOST-01`; `:40-42` tab → `/server$` | PASS |
| C45 | session without a dev: both rack routes `404 player_not_found`; no `player_rack` row | `TestRackRoutes_NoPlayer` PASS | `rack_test.go:571` `env.Session(9, "ghost")`; `:572` over `routes` (`:364` both paths); `:573` `rec.Code != 404`, `apptest.ErrorCode(t, rec) != "player_not_found"`; `:577` `env.Count("player_rack") != 0` | PASS |
| C46 | `gpu` at 150 gems: 150 gems buys to 0/0 in slot 0; 149 → `409 not_enough_gems` unchanged; remove +150 gems, coins unchanged | `TestRack_GemsPricedComponent` PASS | catalog edit `rack_test.go:584-590` (`:587` gems 150); `:594` `409 not_enough_gems`; `:595` `f.unchanged(before)`; `:598` `f.ok` at 150; `:599` gems 0, coins 0, `gpu,-,-,-,-,-`; `:603` gems 150, coins 0, `Rack[0] == nil` | PASS |
| C47 | test catalog `gpu` at 150 gems: card `150G`; 149 gems and 1000 coins → opacity `0.45`, `> gems insuficientes para GPU EDGE.`, `GEMS INSUFICIENTES`, no fetch; 150 gems and 0 coins → opacity `1` and buys; remove → `> GPU EDGE removido. 150 gems devolvidos.` | `gems priced component` PASS | catalog edit `ServerScene.test.tsx:221-224` (`price: { currency: "gems", amount: 150 }` at `:223`); `:236` gems 149 coins 1000; `:237` `.server-card-price` `/^150G$/`; `:238` `opacity).toBe("0.45")`; `:240` `/^> gems insuficientes para GPU EDGE\.$/`; `:241` alert `/^GEMS INSUFICIENTES$/`; `:242` `m.fn).not.toHaveBeenCalled()`; `:245` gems 150 coins 0; `:246` `opacity).toBe("1")`; `:248` `m.calls("POST /api/me/rack")).toBe(1)`; `:253` 1 remove call; `:254` `/^> GPU EDGE removido\. 150 gems devolvidos\.$/`; R3-F1..F4 killed | PASS |

## Coverage

The three rows the fix touched are recomputed here and marked `verified at ed70f47`: screen currency, screen card affordability and screen terminal messages. Every other row is `carried from ab9d885`. The fix changed only `ServerScene.tsx` and its test, so the authority of those rows is unchanged.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| screen currency (2 currencies × 4 surfaces) - verified at ed70f47 | `web/src/lib/types.ts:75` `Price.currency: "gems" or "coins"`. The surfaces that dispatch on it in `ServerScene.tsx` are: card price `:130` (`priceShort`, `gear.ts`), balance check `:47` and `:119` (`canPay`), alert `:47` (`insufficient`), and terminal word `:13` `unit`, used at `:47` and `:60`. Plan AC 36 | coins: price `80C` C33 `:104-111` · balance C33 `:112-118`, C35 `:137`, `:141` · alert C35 `:136` · word C35 `:135`, C37 `:168` (R3-F5 killed). gems: price `150G` C47 `:237` · balance C47 `:238`, `:242`, `:246`, `:248` (R3-F3, R3-F4 killed) · alert C47 `:241` · word C47 `:240`, `:254` (R3-F1, R3-F2 killed) | - |
| screen card affordability (4) - verified at ed70f47 | `ServerScene.tsx:119` `canPay(player, k.price) ? 1 : 0.45`, which is `gear.ts` `canPay` (balance per currency, `>=`) | coins with balance C33 `:114`, `:117` (80 = price) · coins without C33 `:112-113`, `:118` · gems with balance C47 `:246` (150 = price, 0 coins) · gems without C47 `:238` (149 gems, 1000 coins; R3-F3 killed) | - |
| screen terminal messages (11) - verified at ed70f47 | `ServerScene.tsx` `:10` HELLO, `:46` full, `:47` insufficient × `unit` (2), `:51` installed, `:57` empty slot, `:60` removed × `unit` (2) and unknown removed, `:35` api message or `CONNECTION_FAILED`, `:39` catch | hello C30 `:53` · rack full C34 `:126` · coins insufficient C35 `:135` · gems insufficient C47 `:240` · installed C36 `:153` · empty slot C38 `:179` · removed coins C37 `:168` · removed gems C47 `:254` · unknown removed C37 `:171` · api message C39 `:186`, `:195`, `:198` · connection failed (500 with no body, network) C39 `:187-188` | - |
| `POST /api/me/rack` statuses (9) - carried from ab9d885 | `router.go:67`, `:91`; `rack.go:50-62`; `player.go:129`, `:369-383`; plan Surface and addendum `plan.md:182` | 200 C4 · 401 C16 · 404 C45 · 409 `rack_full` C7 · 409 `not_enough_coins` C6 · 409 `not_enough_gems` C46 · 422 `invalid_body` C9 · 422 `unknown_component` C8 · 500 C17 | - |
| `POST /api/me/rack/{slot}/remove` statuses (5) - carried from ab9d885 | `router.go:92`; `rack.go:73-93` | 200 C12, C13, C46 · 401 C16 · 404 C45 · 422 C14 · 500 C17 | - |
| `POST /api/me/deploys` statuses (8) - carried from ab9d885 | plan Surface | 201 C24 · 401 / 409 / 422 ×4 / 500: the deploy-pipelines tests, each `--- PASS` in the full api gate at ed70f47 · rack cause 500 C17 | - |
| `GET /api/me` statuses (4) - carried from ab9d885 | plan Surface | 200 C2, C27 · 401 `TestAuthMiddleware_RejectsEveryProtectedRoute` · 404 `TestPlayerNotFound_OnPlayerRoutes` · 500 C17 | - |
| catalog `rack` keys (3) and startup assembly (1) - carried from ab9d885 | door 2; `cmd/api/main.go:43`, `:51`; `apptest.go:112`, `:127` | C1; main and apptest share one `Load` | - |
| components × fields (6 × 6), stats × fields (3 × 7) - carried from ab9d885 | `rack.json:9-14`, plan Assumptions | C1 | - |
| slot bounds (5), first free slot (3), validation order (3) - carried from ab9d885 | `rack.go:50-74` | C14 · C5, C26 · C10 | - |
| balance boundary (4), refund currency (2), remove outcomes (5) - carried from ab9d885 | `player.go:369-383`; `rack.go:78-91` | C6, C46 · C12, C46 · C12, C13, C26, C46 | - |
| `rackBonus` rows (6), rack summed with other sources (3) - carried from ab9d885 | `player.go:396-427` | C21 `bonus_test.go:126-153`, `:155`; C41 | - |
| `LoadRack` skip (2), deploy rounding (3) and snapshot (1), new error codes (3) - carried from ab9d885 | `player.go` `LoadRack`; `deploy.go:114`; `httpx/errors.go` | C27 · C24, C25 · C19 | - |
| entries to `/server` (3) - carried from ab9d885 | plan AC 22-23 | tab C28, C44 · sign C29 · building C29, C44 | - |
| screen stat bars, bonus lines, slot states, action outcomes, avatar totals - carried from ab9d885 | `rack.ts`, `ServerScene.tsx` `:64-148` (only shifted by +3), `gear.ts` `totalBonus` | C30-C32, C36-C41 | - |
| Landing doors (9), stored data (1) - carried from ab9d885 | plan Landing, Impact | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C24, C25 · 7 C28 · 8 C19 · 9 C21, C24 · stored data C20 | - |

## Test policy rows

The row classifying `ServerScene.tsx` is re-judged at ed70f47, because the fix touched that file. No row was unmet in round 2. The other rows are carried from ab9d885.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, not reached across a boundary | `web/src/components/ServerScene.tsx`, `web/src/lib/rack.ts` (verified at ed70f47) | screen level C30-C40, C47 | yes. The new `unit` mapping (`:13`) is a two-row decision table, and each row has an asserted case at the screen: coins C35 `:135`, C37 `:168`; gems C47 `:240`, `:254`. The gems rows of `canPay` and `insufficient` as the screen uses them are asserted by C47 `:238`, `:241`, `:242`, `:246`. R3-F1 to R3-F5 were all killed. The component also has a browser proof (C42), so the stricter row "reached across a boundary" would be met too |
| Decides, reached across a boundary | `player.go` `Bonus` / `rackBonus` (carried from ab9d885) | own layer C21 · boundary C22, C23, C24, C27 | yes |
| Decides, reached across a boundary | `rack/rack.go` `Buy`, `Remove`; `player.LoadRack` skip (carried from ab9d885) | boundary C4-C17, C19, C26, C27, C45, C46 | yes |
| Decides, reached across a boundary | `deploy/deploy.go` `Start` coins (carried from ab9d885) | boundary C24, C25 | yes |
| Decides, not reached across a boundary | `web/src/lib/gear.ts` `totalBonus` (+ rack) (carried from ab9d885) | screen level C41 | yes |
| Entry point that decides nothing | `app/router.go` rack routes, `(game)/server/page.tsx`, `Tabs.tsx`, `TitleScene.tsx` hotspots, `GET /api/catalog`, `migrations/00007_rack.sql` (carried from ab9d885) | boundary C1, C16, C18, C20, C28, C29, C42, C43, C44 | yes |
| Instrumentation, pass-throughs | `catalog.go` rack types and `ComponentItem`, `httpx/errors.go`, `player.emptyRack`, `web/src/lib/types.ts`, `globals.css`, `test/helpers.ts` (carried from ab9d885) | covered by consumers | yes |

**Swept rows citing existing behaviour** (carried from ab9d885; the fix touched none of these files):

- Loading state: holds. `GameShell.tsx:77-86`.
- Unauthorised state: holds. `GameShell.tsx:71-72`.
- Who may call it: holds. `router.go:67` wraps `:91-92`.
- The `n/a` rows are approved policy.

## Faults injected

Verified at ed70f47. All faults ran in `git worktree add --detach <scratchpad>/wt3 HEAD`, with `web/node_modules` symlinked from the real tree. Each mutation was a single exact-string replacement, asserted to match once, in `web/src/components/ServerScene.tsx`. After each run the file was restored with `git checkout --`, and the worktree's porcelain was confirmed clean. Then the symlink was removed and the worktree was deleted with `git worktree remove --force` and `git worktree prune`. `git worktree list` afterwards shows only the real tree.

The real tree's `git status --porcelain` was identical before and after (`diff` empty):

    ?? .claude/
    ?? api/cmd/api/api

Round 3 made each surface the fix touched or created fail once:

- the currency word in the insufficient message;
- the currency word in the refund message;
- gems-balance affordability on the card;
- the gems-balance pre-check on buy;
- the coins row of the new `unit` mapping.

The narrowest covering proof was run for each: `npx vitest run src/components/ServerScene.test.tsx -t "<pattern>"`. The faults from rounds 1 and 2 are carried, because the fix touched none of their code.

| Mutation | Location | Killed |
| --- | --- | --- |
| R3-F1 insufficient message word hard-coded: `${unit(k.price)} insuficientes` -> `coins insuficientes` | `web/src/components/ServerScene.tsx:47` | yes - `gems priced component` exit 1 at `ServerScene.test.tsx:240`: received `> coins insuficientes para GPU EDGE.` |
| R3-F2 refund message word hard-coded: `${k.price.amount} ${unit(k.price)} devolvidos` -> `${k.price.amount} coins devolvidos` | `ServerScene.tsx:60` | yes - `gems priced component` exit 1 at `:254`: received `> GPU EDGE removido. 150 coins devolvidos.` |
| R3-F3 card opacity by coins only: `canPay(player, k.price)` -> `player.coins >= k.price.amount` | `ServerScene.tsx:119` | yes - `gems priced component` exit 1 at `:238`: `expected '1' to be '0.45'` |
| R3-F4 buy pre-check by coins only: `!canPay(player, k.price)` -> `!(player.coins >= k.price.amount)` | `ServerScene.tsx:47` | yes - `gems priced component` exit 1 at `:240`: received `> GPU EDGE instalado no slot 01 · power +40` (the buy went to the api) |
| R3-F5 `unit` coins row flipped: `? "gems" : "coins"` -> `? "gems" : "gems"` | `ServerScene.tsx:13` | yes - `insufficient coins` exit 1 at `:135` (received `> gems insuficientes para CPU 8-CORE.`) and `remove` exit 1 at `:168` |
| R2-F1 to R2-F5 (round 2, carried from ab9d885): gems refund to coins, skin term dropped, 404 → 200, gems `Pay` skipped, gems boundary `<=` | `rack.go`, `player.go` | yes - killed at ab9d885 by C46, C21, C45 |
| F1 to F5 (round 1, carried from ab9d885): `Pay` before `rack_full`, refund halved, stat cap dropped, deploy `Round` -> `Floor`, web bonus `floor` -> `round` | `rack.go`, `player.go`, `deploy.go`, `rack.ts` | yes - killed by C10, C12, C21, C24, C31 |

## Gate

Verified at ed70f47.

- `cd api && go test -count=1 -p 1 -v ./...`: exit 0. 11 packages `ok`, 219 passed (210 top-level + 9 subtests), 0 failed.
- `cd web && npx vitest run`: exit 0. 16 files, 215 passed, 0 failed. That is round 2's 214 plus C47.
- `make e2e`: exit 0. 10 passed, 0 failed, including `server.spec.ts` › `buy and remove` and › `entries`.

Total: 444 passed, 0 failed.
