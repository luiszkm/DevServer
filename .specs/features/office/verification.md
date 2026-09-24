# Office verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 8a11168..20e770b060291a04e78214eaf2d8f276b217f8d3
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 41 checks have a proof that ran green at HEAD 20e770b. Each named test exists, shows up in the output on its own as passing, and has an assertion that targets the value its check names. All three suites exit 0. All 5 injected faults were killed.

The feature still fails, on three findings. None of them is a red test:

1. **Coverage gap in the validation order.** The plan fixes the order `invalid_body → unknown_cell → unknown_furniture → wrong_zone → cell_occupied → saldo` (`plan.md`, Assumptions, "Ordem das validações"). C14 claims that order ("A ordem das validações é a do plano"), but no test sends a malformed body to an unknown cell, so nothing proves `invalid_body` comes before `unknown_cell`. The author's `validation order (4)` row leaves this member out. Search: `grep -rn invalid_body api/internal/office` finds only `office_test.go:325-326`, and both hit `piso/0`, a valid cell. The only unknown-cell install with a body is `office_test.go:391`, and that body is valid JSON. If `office.go:76` (DecodeJSON) and `:79` (cellOf) swapped places, every test would still pass.
2. **Unmet `Test policy` row: `player.Pay`.** `pay` moved from `shop` to `player.Pay` (`api/internal/player/player.go`, `func Pay`). It is decision code: a guard, plus a dispatch by currency. It is now called across two boundaries (shop and office). AGENTS.md requires a proof at its own layer as well as at the boundary. It has boundary proofs only (shop C7, C25; office C5, C17). `grep -rn 'Pay(' api/internal/player` finds no test. `checks.md` `## Test policy` never classifies it. The move is recorded only under `Impact on earlier checks`.
3. **Precision gap: stored furniture outside the current catalog.** The code handles this in four places, and neither the plan nor the checks decide what should happen, so none of the four has a proof:
   - `api/internal/player/player.go:164` - `LoadOffice` skips a row outside the catalog's zones. Its comment says "so shrinking a zone never breaks a player".
   - `api/internal/office/office.go:47` - the `occupant` bound check.
   - `api/internal/office/office.go:122` - Remove clears an unknown id with no refund.
   - `web/src/lib/office.ts:11` - `officeStats` skips an unknown id. After that, `OfficeScene.tsx:43-44` treats the occupied cell as empty and tries to install into it.

   AD-003 makes rebalancing catalog-only, so this state can happen.

How the proofs ran at 20e770b:

- **api:** `cd api && go test -count=1 -p 1 -v ./internal/catalog ./internal/office ./internal/player ./internal/deploy ./internal/battle -run '^(<the 27 names in checks.md>)$'` - exit 0, 5 packages `ok`. Exactly 27 `--- PASS` lines, one per name: each name was grepped as `^--- PASS: <name> (`, and each count is 1. None missing, 0 `--- FAIL`.
- **web:** `cd web && npx vitest run --reporter=verbose src/components/Tabs.test.tsx src/components/OfficeScene.test.tsx src/components/ComingSoon.test.tsx -t "<the 14 patterns in checks.md>"` - exit 0; 23 passed, 1 skipped by the filter. Every pattern matched at least one passing test:
  - `no scene shows EM BREVE`: 8 (one per route, `/office` included)
  - `room grid`: 2 (`room grid`, `room grid with furniture`)
  - `footer`: 2 (`footer`, `footer at the top level`)
  - every other pattern: 1
- **e2e:** `make e2e` - exit 0; 8 passed, including `e2e/office.spec.ts:5:5 › install and remove`.
- **Diff check:** every office proof resolves to a test added in `8dbb534` (api) or `74ab996` (web). C27 and C41 extend earlier tests (see Impact below).

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `docs/DevServer RPG.html` (plan: binding for the interface) | yes - decoded the embedded bundle (line 382) and read `officeDefs`, `officeLevels`, `officeBonusTxt`, `officeAgg`, `officeLevelOf`, `tapOfficeCell`, the office render block and the `isOffice` markup. Used below as the authority for the furniture, level, copy and toast sets | not judged - step 1 is `ui`-only and this feature is `standard` | not judged - step 1 not run |
| conversa 2026-09-23, `.specs/STATE.md` AD-002..AD-012 | via the plan's Assumptions (duplicates, 40% cap, frozen snapshot) | not judged | not judged |

Step 5 (the walk with the user) was skipped: the orchestrator owns it. Step 7 (lessons) belongs to the orchestrator.

Seen in passing and not judged, because step 1 did not run:

- The prototype pads the catalog grid to 24 slots with empty placeholder buttons, and draws it as 6 columns. `OfficeScene.tsx:67` renders only the real cards.
- No check covers the screen's arrangement: two columns, a room plus a 170px stats column, filters below the catalog, the detail at the bottom.

If the plan's "binding for the interface" is meant to hold, the arrangement needs a `ui` pass.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog `office`: 2 zones, 5 levels, cap 40, 12 furniture by value | `TestCatalog_ServesOffice` PASS | `api/internal/catalog/catalog_test.go:439` zone id, name, cells; `:449` levels; `:454` `MaxDeployCut != 40`; `:474` 12; `:478` 9 fields; `:492` each field vs table `:460-471` | PASS |
| C2 | `/api/me` office with `neon` parede 1, `mesa` piso 0 | `TestMe_OfficeField` PASS | `api/internal/office/office_test.go:171` 2 keys, 8 and 24; `:174` `wantRoom(..., "parede/1=neon", "piso/0=mesa")`; `:175` literal `"parede":[null,"neon",null,...]` | PASS |
| C3 | new player 8 + 24 null | `TestCreatePlayer_OfficeDefaults` PASS | `office_test.go:185` 201; `:191` empty room; `:195` literal `nulls(8)` and `nulls(24)` | PASS |
| C4 | pays and places (mesa 100→40, cadeira 40→0 at piso 23, neon 35→0 at parede 7) | `TestInstall_PaysAndPlaces` PASS | `office_test.go:205` `Coins != 40`; `:212`, `:219` `Gems != 0`; `:208`, `:215`, `:222` room; `:223` persisted in `/api/me` | PASS |
| C5 | 59/60 coins, 39/40 gems | `TestInstall_BalanceBoundary` PASS | `office_test.go:231` `409 not_enough_coins`; `:232` unchanged; `:234` 60 pays and leaves 0; `:240` `409 not_enough_gems`; `:241`; `:243` 40 pays and leaves 0 | PASS |
| C6 | cell_occupied, nothing changes | `TestInstall_CellOccupied` PASS | `office_test.go:254` `409 cell_occupied`; `:255` snapshot unchanged; `:257` still `mesa`; `:258` coins 1000 | PASS |
| C7 | wrong_zone and its two messages | `TestInstall_WrongZone` PASS | rows `office_test.go:271-272`; `:276` `rec.Code != 422`, `code != "wrong_zone"`, `message != tc.message`; `:280` unchanged | PASS |
| C8 | `x` and `{}` unknown_furniture | `TestInstall_UnknownFurniture` PASS | `office_test.go:288`, `:289` `422 unknown_furniture`; `:290` unchanged | PASS |
| C9 | 5 bad cells on install and remove; parede 7 and piso 23 accepted | `TestOfficeCell_Bounds` PASS | cells `office_test.go:298`; `:300` install, `:304` remove, each `422 unknown_cell`; `:308` unchanged; `:310-317` 200 on both edges | PASS |
| C10 | `{` and `{"furniture": 1}` invalid_body | `TestInstall_InvalidBody` PASS | `office_test.go:325`, `:326` `422 invalid_body` (`apptest.Do` sends a string body raw, `apptest.go:145-146`); `:327` unchanged | PASS |
| C11 | same piece twice charges twice | `TestInstall_Duplicates` PASS | `office_test.go:336` `Coins != 0`; `:339` `piso/0=mesa`, `piso/1=mesa` | PASS |
| C12 | refund `floor(price/2)` per currency | `TestRemove_RefundsHalf` PASS | rows `office_test.go:356-359` (30, 57, 20 gems, 50 gems); `:362` gems and coins; `:365` cell emptied | PASS |
| C13 | empty cell 200 unchanged; second remove refunds nothing | `TestRemove_EmptyCell` PASS | `office_test.go:375-377` 200, room, snapshot unchanged; `:381` `Coins != 30` after two removes | PASS |
| C14 | the four named order cases | `TestInstall_ValidationOrder` PASS | `office_test.go:391` `unknown_cell`; `:392` `unknown_furniture` on an occupied cell; `:393` `wrong_zone`; `:394` `409 cell_occupied` with 0 coins (`:390`). The fifth pair of the plan's order is unproven - see Coverage | PASS |
| C15 | install and remove 401 without a session | `TestOfficeRoutes_RequireSession` PASS | routes `office_test.go:397`; `:403` `rec.Code != 401`, `code != "unauthenticated"` | PASS |
| C16 | 500 on 4 routes, log has request_id and `player_office`, nothing changes | `TestOffice_LoadFailure` PASS | `office_test.go:419` `500 internal`; `:430-433` request id line contains `player_office`; `:436-439` `/api/me`, deploys, install, remove; `:441` unchanged | PASS |
| C17 | concurrent installs serialize | `TestInstall_ConcurrentSerialize` PASS | `office_test.go:477` 1 ok and 1 `not_enough_coins`; `:487` coins 0, 1 placed; `:492` 1 ok and 1 `cell_occupied`; `:495` coins 975, `planta` | PASS |
| C18 | PK and CHECK on `player_office` | `TestTables_OfficeConstraints` PASS | `office_test.go:513` `23505`; `:514` `23514`; `:516` `got != tc.want` | PASS |
| C19 | 4 new codes in the AD-005 envelope | `TestOffice_ErrorCodes` PASS | rows `office_test.go:531-534`; `:537` `len(body) != 1`, `len(body["error"]) != 2`, `code != tc.code`, `message == ""` | PASS |
| C20 | 00006 over an existing player | `TestMigration_OfficeExistingPlayers` PASS | `office_test.go:568` to 5, `:580` to 6; `:584` empty table; `:601` 200; `:607` 8 + 24 null | PASS |
| C21 | `player.Bonus` over office types, cap, exclusions | `TestBonus_Office` PASS | rows `api/internal/player/bonus_test.go:77-90` (xp 7, deploy 11, 40, 41→40, spregen 3, planta 0 ×3, furniture hp/sp/dmg 0, other sources 0 ×3); `:92` `Bonus(...) != tc.amount` | PASS |
| C22 | `endsAt` with the cut; rounding 53.4 and 52.8 → 53; stored equals response | `TestStart_OfficeCutsDuration` PASS | rows `api/internal/deploy/office_test.go:79-83` (900, 855, 801, 540, NV.4 6480), `:88-89` (53, 53); `:68` response `EndsAt`; `:71` stored `ends_at` | PASS |
| C23 | XP 80/82/84/86, coins 40, gems 0, claim equals stored | `TestStart_OfficeBoostsXP` PASS | rows `deploy/office_test.go:100-103`; `:123` stored xp, coins, gems; `:133` `Reward.XP != tc.xp` | PASS |
| C24 | snapshot frozen while furniture moves | `TestDeploy_OfficeFrozenAtStart` PASS | `deploy/office_test.go:150` T+855 and 80; `:165` `ends` and `xp` unchanged after remove + mesa + 8 setup2; `:174` claim `Reward.XP != 80` | PASS |
| C25 | SP regen 48 / 45 / 50 clamp; EndTurn +8 / +5 | `TestTurn_OfficeSPRegen`, `TestEndTurn_SPRegenBonus` PASS | `api/internal/battle/office_test.go:23` `SP != 48`; `:28` `SP != 50`; `:35` `SP != 45`; `:42` rows {0:25, 3:28}, `:48` `st.SP != want`; `:56` clamp 50 | PASS |
| C26 | office leaves SP max, damage, HP max and the victory reward | `TestBattle_OfficeLeavesCombatStats` PASS | `battle/office_test.go:70` SP 50/50, hpMax 100; `:75` damage 20; `:82` reward xp 90, coins 40, gems 1; `:85` hpMax 100 | PASS |
| C27 | 8 tabs, `OFFICE` → `/office` as 08 | `tab order and routes` PASS | `web/src/components/Tabs.test.tsx:13-22` `toEqual([... ["OFFICE", "/office"]])`; `:23` `.tab-num` `08` | PASS |
| C28 | catalog panel: headings, 12 cards, glyph and tag, filters, mesa selected | `catalog panel` PASS | `web/src/components/OfficeScene.test.tsx:36-37`; `:38` order; `:47-48` glyph and tag per `:42-44`; `:50-52` aria-pressed; `:53-54` only `mesa`; `:55` | PASS |
| C29 | filters by zone | `filters by zone` PASS | `OfficeScene.test.tsx:62` 4 wall; `:66` 8 floor; `:68` 12 | PASS |
| C30 | detail text per furniture | `detail per furniture` PASS | `OfficeScene.test.tsx:77-80` name, `60 COINS`, glyph, full desc; `:83-84` `90 GEMS`, `-5% tempo`; `:86` `+1 SP/turno`; `:88` planta, no bonus; `:90` `· PAREDE ·` | PASS |
| C31 | room grid empty and filled | `room grid`, `room grid with furniture` PASS | `OfficeScene.test.tsx:96-97` CANTINHO, `0 móveis instalados`; `:100` wall before floor; `:101-102` 8 and 24; `:103` all `+`; `:108-111` glyph and name; `:113-114` 30 `+`; `:115` `2 móveis` | PASS |
| C32 | footer next level / max level | `footer`, `footer at the top level` PASS | `OfficeScene.test.tsx:121` `faltam 30 de conforto para HOME OFFICE` + hint; `:132` comfort 180; `:133` max-level text + hint | PASS |
| C33 | level at 0/29/30/69/70/119/120/179/180; stats 157, +5%, -40%, +3 | `level and stats` PASS | cases `OfficeScene.test.tsx:140-148`; `:156` comfort, `:157` level name; `:164-167` the four stats | PASS |
| C34 | wrong-zone toasts, no fetch | `wrong zone` PASS | `OfficeScene.test.tsx:176`, `:179`; `:180` `fn).not.toHaveBeenCalled()` | PASS |
| C35 | 59/60 coins, 39/40 gems pre-check | `insufficient balance` PASS | cases `OfficeScene.test.tsx:186-189`; `:201` toast; `:202` no fetch; `:204` one call at the boundary | PASS |
| C36 | install route, body, setPlayer, toast | `install` PASS | `OfficeScene.test.tsx:217` 1 call; `:219` body `{ furniture: "mesa" }`; `:220` `setPlayer(after)`; `:221` `MESA EM L INSTALADO` | PASS |
| C37 | remove route, setPlayer, three refund toasts | `remove` PASS | `OfficeScene.test.tsx:235-238` route, no body, `setPlayer`, `+30 COINS`; `:240` `+27 COINS`; `:242-243` `+30 GEMS` | PASS |
| C38 | 409 message / 500 no body / network, on both actions | `action errors` PASS | cases `OfficeScene.test.tsx:250-252`; `:263`, `:267` text; `:264`, `:268` room still there; `:269` no setPlayer | PASS |
| C39 | 32 cells disabled while pending, re-enabled after | `pending disables room` PASS | `OfficeScene.test.tsx:282` 32; `:283` `toBeDisabled()`; `:285` `toBeEnabled()` | PASS |
| C40 | browser round trip: install, reload, remove | `install and remove` PASS | `web/e2e/office.spec.ts:16` toast; `:17` HUD 75; `:20-22` after reload; `:25` `GUARDADO · +12 COINS`; `:26` 87 | PASS |
| C41 | no route shows EM BREVE, `/office` included | `no scene shows EM BREVE` (8) PASS | row `web/src/components/ComingSoon.test.tsx:25` `["/office", OfficePage]`; `:42-43` `not.toContain("EM BREVE")` | PASS |

## Coverage

Each set was recomputed from its authority: the plan's `Surface`, `Landing` and `Assumptions` for contracts; the prototype for data, levels and copy; the code for decision branches. Earlier-feature members were confirmed as `--- PASS` in the full api run at HEAD: `TestStart_CreatesJobWithCatalogDuration`, `TestStart_SameTypeRunning`, `TestStart_LevelBoundary`, `TestStart_UnknownType`, `TestStart_UnknownLevel`, `TestDeployRoutes_SessionAndPlayer`, `TestDeployRoutes_UnexpectedError`, `TestStart_InvalidBody`, `TestAuthMiddleware_RejectsEveryProtectedRoute`, `TestPlayerNotFound_OnPlayerRoutes`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| install statuses (10) | plan Surface; `office.go:76-102`, `player.Pay`, `router.go:65` | 200 C4 · 401 C15 · 409 gems/coins C5 · 409 `cell_occupied` C6 · 422 `invalid_body` C10 · `unknown_cell` C9 · `unknown_furniture` C8 · `wrong_zone` C7 · 500 C16 | - |
| remove statuses (4) | plan Surface; `office.go:109-131` | 200 C12, C13 · 401 C15 · 422 C9 · 500 C16 | - |
| `POST /api/me/deploys` statuses (8) | plan Surface | 201 C22 · 401 / 409 / 422 ×4 / 500: deploy-pipelines C9, C2, C39, C4, C5, C3, C38 at HEAD · 500 office cause C16 | - |
| `GET /api/me` statuses (4) | plan Surface | 200 C2 · 401 foundation C9 · 404 foundation C38 · 500 C16 | - |
| catalog `office` keys (4) | plan Landing door 2 | zones, furniture, levels, maxDeployCut: C1 | - |
| furniture × fields (12 × 9) | prototype `officeDefs` (decoded bundle, lines 991-1003); a script compared it with `api/catalog/office.json` and found them equal in value and order | C1, table-driven over all 12 × 9 by value | - |
| zones (2) and levels (5) | prototype `officeLevels`, plan Assumptions (Grade) | C1; levels both sides of every boundary C33 | - |
| cell bounds (7) | `office.go:33-40` | unknown zone, -1, parede 7/8, piso 23/24, non-integer: C9 | - |
| balance boundary (4) | `player.Pay` | api C5; screen `gear.ts:26` C35 | - |
| validation order (5 adjacent pairs of 6 stages) | plan Assumptions "Ordem das validações"; `office.go:76-99` | `unknown_cell` < `unknown_furniture` C14 · `unknown_furniture` < `wrong_zone`: structural (an unknown id has no zone), and C14 substitutes `unknown_furniture` < `cell_occupied` · `wrong_zone` < `cell_occupied` C14 · `cell_occupied` < saldo C14 | `invalid_body` before `unknown_cell` - no test sends a malformed body to an unknown cell (the search is in the header); C14 claims the plan's order |
| refund (3) | `office.go:123-128`, `office.ts:39-41`, prototype `Math.floor(d.cost / 2)` | even coins, odd coins, gems: C12, C37 | - |
| bonus types, cap, exclusions (7) | `player.Bonus`, plan door 3 | xp C21, C23 · deploy C21, C22 · spregen C21, C25 · cap 40 C21 (41→40), C33 (45→40) · no bonus C21 · furniture outside hp/sp/dmg C21, C26 · other sources outside office types C21 | - |
| rounding (4) and snapshot (2) | `deploy.go:108-112`, plan door 6 | duration down 53.4 / up 52.8 C22 · XP down 82.4 / up 85.6 C23 · `ends_at` and XP frozen C24 | - |
| SP regen (3) and combat stats unchanged (4) | `rules.go:165`, `handlers.go:132-133`, plan AC 18-19 | with, without, clamp: C25 · SP max, damage, HP max, victory reward: C26 | - |
| new error codes (4) + `wrong_zone` messages (2) | `httpx/errors.go` diff, plan door 8 | C19; C7 | - |
| screen copy sets (filters 3, bonus text 4, price short 2 / long 2, cell states 2, stats 4, footer 2) | prototype `officeFilters`, `officeBonusTxt`, `tag`/`costTxt`, `mkCell`, stats markup, `officeNextTxt` | C28, C29, C30, C31, C32, C33 | - |
| screen toasts (7) | prototype `tapOfficeCell` (its 8th, `ESCOLHA UM MÓVEL`, cannot be reached: `OfficeScene.tsx:16` always selects a card and nothing deselects one) | INSTALADO C36 · GUARDADO COINS/GEMS C37 · VAI NA PAREDE / NO PISO C34 · COINS / GEMS INSUFICIENTES C35 | - |
| action outcomes on screen (8) | `OfficeScene.tsx:27-39` | install and remove × ok / error message / no body / network: C36, C37, C38 | - |
| tabs (8) and scenes without EM BREVE (8) | `Tabs.tsx`, `(game)` routes | C27; C41 | - |
| Landing doors (8) | plan Landing | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C22-C24 · 7 C27 · 8 C19. Door 1's `player_id → players` FK is not asserted. Relations lists only PK and position ≥ 0 as one-way constraints, and no feature asserts its `player_id` FK, so this is recorded and not counted | - |
| stored data (1), startup config (1) | plan Impact; `cmd/api/main.go:35` Migrate, `:43` `catalog.Load`, `:51` `Catalog: cat`; `apptest.go:112`, `:127` | existing players C20 · shared catalog assembly C1 | - |
| stored furniture outside the current catalog (4 branches) | code: `player.go:164`, `office.go:47`, `office.go:122`, `web/src/lib/office.ts:11` (and `OfficeScene.tsx:43-44`) | none - neither the plan nor the checks decide this (precision gap) | load skip, occupant bound, remove without refund, screen skip / install attempt on an occupied cell |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `player.go` `Bonus` | own layer C21 · boundary C22, C23, C25, C26 | yes - F2 killed at own layer |
| Decides, reached across a boundary | `player.go` `Pay` (moved from `shop.pay`) | own layer: none · boundary shop C7, C25, office C5, C17 | no - no own-layer proof; not classified in `checks.md` Test policy |
| Decides, reached across a boundary | `office/office.go` `cellOf`, `Install`, `Remove`, `occupant`; `player.LoadOffice` guard | boundary C4-C17, C19 | no - one row of the ordering table (`invalid_body` before `unknown_cell`) and the four catalog-drift rows have no asserted case; every other row asserted, F1 killed |
| Decides, reached across a boundary | `deploy/deploy.go` `Start` (cut, rounding, snapshot) | boundary C22-C24 | yes - F3 killed |
| Decides, reached across a boundary | `battle/rules.go` `EndTurn`, `battle/handlers.go` | own layer C25 (`EndTurn`) · boundary C25, C26 | yes - F4 killed both proofs |
| Decides, not reached across a boundary | `web/src/components/OfficeScene.tsx`, `web/src/lib/office.ts` | screen level C28-C39 | yes - every row of filter, detail, cell state, zone and balance pre-check, level boundary, stats, refund text and action outcome is asserted; F5 killed (the unknown-id skip is in the drift gap above) |
| Entry point that decides nothing | `app/router.go` office routes, `web/src/app/(game)/office/page.tsx`, `Tabs.tsx` entry, `GET /api/catalog`, `migrations/00006_office.sql` | boundary C1, C15, C18, C20, C27, C40, C41 | yes |
| Instrumentation, pass-throughs | `catalog.go` types and `Zone` / `FurnitureItem`, `httpx/errors.go` new errors, `player.emptyOffice`, `web/src/lib/types.ts`, `globals.css`, `test/helpers.ts` | none of their own - covered by consumers | yes |

**Swept rows citing existing behaviour.** Each was re-read against the code:

- Screen loading state: holds. `GameShell.tsx:37` sets `ready` only with `player` and `catalog`, and `:85-86` renders children only when ready.
- Unauthorised state: holds. `GameShell.tsx:32` and `:71-72` render `LoginScreen` inside the `(game)` layout (`layout.tsx:4`). This is foundation C1's "renderiza a tela de login". The plan's wording "redireciona para `/login`" is imprecise, but the constraint is there.
- Who may call it: holds. `router.go:65` `auth.RequireSession` wraps `:87-88`.
- Observability, "nenhum evento de log novo, como o shop": holds. `office.Handlers` and `shop.Handlers` carry no `Logger`.
- The `n/a` rows (dependency failure, versioning, rate limit, destructive confirm) are approved policy.

**Impact on earlier checks is legitimate. No earlier assertion was weakened.** `git diff --numstat 8a11168..HEAD`:

- `Tabs.test.tsx` 3/1 and `ComingSoon.test.tsx` 3/1. In both, the only removed line is a comment. Both add one expected row. `Tabs.test.tsx:13` still asserts the full list with `toEqual`, and `:23` adds the `08` assertion.
- `shop_test.go` 4/0. It adds `db.Migrate` to latest after the unchanged 00005 empty-table assertions. This matches boot (`main.go:35`) and is needed because the router now reads `player_office`.
- `shop.go` 3/20. The `pay` body moved verbatim to `player.Pay`. Shop C7 (`TestBuy_BalanceBoundary`) and C25 (`TestBuy_ConcurrentSerialize`) PASS at HEAD. The move's Test policy consequence is the unmet row above.

## Faults injected

All faults ran in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` symlinked. `git status --porcelain` of the real tree was the same before and after (`M .specs/STATE.md`, `?? .claude/`, `?? api/cmd/api/api`). The `.specs/STATE.md` modification was already there when the baseline was taken, and this verifier did not make it. The worktree was removed with `git worktree remove --force`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 refund rounds up: `Amount / 2` -> `(Amount + 1) / 2` | `api/internal/office/office.go:123` | yes - `TestRemove_RefundsHalf` (`office_test.go:363` coins 58, want 57) |
| F2 deploy cap off by one: `min(sum, MaxDeployCut)` -> `MaxDeployCut+1` | `api/internal/player/player.go:389` | yes - `TestBonus_Office` (`bonus_test.go:93` 41, want 40) |
| F3 duration floors: `math.Round` -> `math.Floor` | `api/internal/deploy/deploy.go:110` | yes - `TestStart_OfficeCutsDuration` (`office_test.go:89` 52.8 s -> 52, want 53) |
| F4 office SP regen dropped from `EndTurn` | `api/internal/battle/rules.go:165` | yes - `TestTurn_OfficeSPRegen` (`:23` sp 45, want 48) and `TestEndTurn_SPRegenBonus` (`:48` 25, want 28) |
| F5 level boundary strict: `comfort >= l.min` -> `>` | `web/src/lib/office.ts:26` | yes - `level and stats` (comfort 30: `CANTINHO`, want `HOME OFFICE`) |

Not injected, to stay within the cap of 5: swapping `office.go:76` (DecodeJSON) and `:79` (cellOf). The search in the header already shows no proof would catch it.

## Gate

- `cd api && go test -count=1 -p 1 -v ./...` - exit 0; 10 packages `ok`; 187 passed, 0 failed.
- `cd web && npx vitest run --reporter=verbose` - exit 0; 15 files; 199 passed, 0 failed.
- `make e2e` - exit 0; 8 passed, 0 failed.

Total: 394 passed, 0 failed. The suites are green. The verdict is FAIL on the Coverage and Test policy findings above.
