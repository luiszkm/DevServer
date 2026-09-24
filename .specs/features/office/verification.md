# Office verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 8a11168..1dbc49737cf6666e9a63ab65d7de5bc8d93845d5 (round 2 fix range `c229d8c..1dbc497`: 97d9602 spec, 7014fc1 code and tests, 1dbc497 progress)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 45 checks have a proof that ran green at HEAD 1dbc497. Each named test exists, shows up in the output on its own as passing, and has an assertion that targets the value its check names. All three suites exit 0. All 5 faults injected in this round were killed; the 5 from round 1 are carried.

All three round 1 findings are closed:

1. **Validation order: `invalid_body` before `unknown_cell`.** Closed. `api/internal/office/office_test.go:391` - `f.status(f.env.Do(http.MethodPost, "/api/me/office/x/0", "{", f.c), 422, "invalid_body")`. The body is malformed and the cell is unknown, so the test only passes if the body is decoded first. At HEAD the handler decodes at `api/internal/office/office.go:67` and checks the cell at `:70`. Fault R2-F1 swapped the two and the test failed at `:391`.
2. **`player.Pay` had no own-layer proof.** Closed. `api/internal/player/pay_test.go:21-24` has four rows: gems equal, gems below, coins equal, coins below. `:28` checks `errors.Is(err, tc.err)` and `:31` checks both balances, so paying in one currency is shown to leave the other alone (7 stays 7). `checks.md` now classifies `Pay` under Test policy (C42). Fault R2-F4 changed `player.go:342` to `<=` and was killed at `pay_test.go:29` and `:32`.
3. **Stored furniture outside the catalog was undecided and untested.** Closed. Plan S5 now decides it (AC 33-35), and each branch has a proof:
   - Install into a cell holding unknown furniture: `409 cell_occupied`, at `office_test.go:618`.
   - Remove: empties the cell with no refund, at `:620` (`Coins != 1000`, `Gems != 20`) and `:623-624`.
   - Bonus: unknown furniture adds 0 to every type, at `api/internal/player/bonus_test.go:91-93`.
   - `LoadOffice` skips rows outside the catalog (zone `sotao`, `parede` 8, `piso` 24), at `office_test.go:635` and `:638`.
   - Web shows `?`, leaves the piece out of the count and comfort, and a click removes it, at `web/src/components/OfficeScene.test.tsx:292-297`.

   The `occupant` bound guard is gone, and the claim that it was unreachable holds (see Coverage). Faults R2-F2, R2-F3 and R2-F5 were killed.

How the proofs ran at 1dbc497 (verified at 1dbc497):

- **api:** `cd api && go test -count=1 -p 1 -v ./internal/catalog ./internal/office ./internal/player ./internal/deploy ./internal/battle -run '^(<the 30 names in checks.md>)$'`. Exit 0, 5 packages `ok`, exactly 30 `--- PASS` lines. Each name was grepped as `^--- PASS: <name> (`, and each count was exactly 1. There were 0 `--- FAIL` lines. The 30 names are the 27 from round 1 plus `TestPay_BalanceByCurrency`, `TestUnknownFurniture_OccupiesAndRemoves` and `TestMe_SkipsCellsOutsideCatalog`. C43's second proof, `TestBonus_Office`, is shared with C21.
- **web:** `cd web && npx vitest run --reporter=verbose src/components/Tabs.test.tsx src/components/OfficeScene.test.tsx src/components/ComingSoon.test.tsx -t "<the 15 patterns in checks.md>"`. Exit 0: 24 passed, 1 skipped by the filter. Every pattern matched at least one passing test, and the new `OfficeScene > unknown furniture` is among them.
- **e2e:** `make e2e`. Exit 0, 8 passed, including `e2e/office.spec.ts:5:5 › install and remove`.
- **Diff check:** C42-C45 each resolve to a test added in 7014fc1. C14's new line is `office_test.go:391`, added in 7014fc1. Every other proof resolves as in round 1, to `8dbb534` or `74ab996`.

**Spec changes in 97d9602 are additive and legitimate** (`git diff c229d8c..HEAD -- .specs/features/office`, verified at 1dbc497):

- `plan.md` is +13/-0. It adds an Assumptions row, S5 with AC 33-35 marked "added after verification round 1", a Traceability row `OFFICE-05` and an Observable row. No approved criterion was reworded.
- `checks.md` is +33/-5, and each of the 5 removed lines is replaced by a superset:
  - the count header, 41 -> 45;
  - C14, which gains the leading `invalid_body` case and keeps every earlier clause word for word;
  - the `validation order (4)` row, which becomes `(5)` with the new member first;
  - two `Swept` lines, which gain C43-C45.
- No check other than C14 changed.
- On the code side, `git diff c229d8c..HEAD -- api web` removes no assertion. The only removed test line is the comment `// C21 (office, own layer)`, which becomes `// C21, C43 ...` in `bonus_test.go:43`. The other removed lines are code: `occupant` in `office.go`, and the `tap` branch and cell rendering in `OfficeScene.tsx`.

AC 33-35 were chosen by the author, and the plan marks them `Confirmed? n`. They are additive, and no binding source contradicts them. The user's confirmation is still pending, as it is for the other `n` assumptions.

## Binding sources

Carried from 20e770b. The fix touched the interface only to add `?` for an unknown id (AC 35). Step 1 is `ui`-only and this feature is `standard`, so it did not run in either round.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `docs/DevServer RPG.html` (plan: binding for the interface) | yes (round 1) - decoded the embedded bundle (line 382) and read `officeDefs`, `officeLevels`, `officeBonusTxt`, `officeAgg`, `officeLevelOf`, `tapOfficeCell`, the office render block and the `isOffice` markup. Used as the authority for the furniture, level, copy and toast sets | n/a | n/a |
| conversa 2026-09-23, `.specs/STATE.md` AD-002..AD-012 | via the plan's Assumptions (duplicates, 40% cap, frozen snapshot); AD-003 is the reason S5 exists | n/a | n/a |

`n/a` in both columns means step 1 is not in the `standard` profile. It does not mean the step was judged clean. Carried as a note, not counted: the prototype pads the catalog grid to 24 slots in 6 columns, and no check covers the screen's two-column arrangement. If "binding for the interface" is meant to hold, that needs a `ui` pass.

Step 5 (the walk with the user) and step 7 (lessons) belong to the orchestrator.

## Checks

Verified at 1dbc497: every proof ran again at this HEAD. Citations were refreshed in the files the fix touched:

- `office_test.go`: lines after `:390` shifted by +1.
- `bonus_test.go`: lines after `:90` shifted by +3.
- `OfficeScene.test.tsx`: new lines appended only, so earlier citations are unchanged.
- `office.go` and `OfficeScene.tsx`: reread.

Citations in untouched files are carried from 20e770b, and their lines are unchanged.

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
| C14 | the plan's order, five cases | `TestInstall_ValidationOrder` PASS | `office_test.go:391` `x/0` + `{` -> `422 invalid_body`; `:392` `x/0` + `{"furniture":"x"}` -> `unknown_cell`; `:393` `unknown_furniture` on an occupied cell; `:394` `wrong_zone`; `:395` `409 cell_occupied` with 0 coins (`:390` `f.balance(1000, 0)`) | PASS |
| C15 | install and remove 401 without a session | `TestOfficeRoutes_RequireSession` PASS | routes `office_test.go:398`; `:404` `rec.Code != 401`, `code != "unauthenticated"` | PASS |
| C16 | 500 on 4 routes, log has request_id and `player_office`, nothing changes | `TestOffice_LoadFailure` PASS | `office_test.go:420` `500 internal`; `:431-434` request id line contains `player_office`; `:437-440` `/api/me`, deploys, install, remove; `:442` unchanged | PASS |
| C17 | concurrent installs serialize | `TestInstall_ConcurrentSerialize` PASS | `office_test.go:478` 1 ok and 1 `not_enough_coins`; `:488` coins 0, 1 placed; `:493` 1 ok and 1 `cell_occupied`; `:496` coins 975, `planta` | PASS |
| C18 | PK and CHECK on `player_office` | `TestTables_OfficeConstraints` PASS | `office_test.go:514` `23505`; `:515` `23514`; `:517` `got != tc.want` | PASS |
| C19 | 4 new codes in the AD-005 envelope | `TestOffice_ErrorCodes` PASS | rows `office_test.go:532-535`; `:538` `len(body) != 1`, `len(body["error"]) != 2`, `code != tc.code`, `message == ""` | PASS |
| C20 | 00006 over an existing player | `TestMigration_OfficeExistingPlayers` PASS | `office_test.go:569` to 5, `:581` to 6; `:585` empty table; `:602` 200; `:608` 8 + 24 null | PASS |
| C21 | `player.Bonus` over office types, cap, exclusions | `TestBonus_Office` PASS | rows `api/internal/player/bonus_test.go:77-90` (xp 7, deploy 11, 40, 41→40, spregen 3, planta 0 ×3, furniture hp/sp/dmg 0, other sources 0 ×3); `:95` `Bonus(...) != tc.amount` | PASS |
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
| C42 | `player.Pay` own layer: 15/14 gems, 50/49 coins, other currency untouched | `TestPay_BalanceByCurrency` PASS | rows `api/internal/player/pay_test.go:21-24` (gems 15→0 coins 7; 14 `ErrNotEnoughGems` unchanged; coins 50→0 gems 7; 49 `ErrNotEnoughCoins` unchanged); `:28` `!errors.Is(err, tc.err)`; `:31` `p.Gems != tc.wantGems`, `p.Coins != tc.wantCoin` | PASS |
| C43 | `sofa` in piso 0: install 409 `cell_occupied`; Bonus 0 ×3; remove 200 with no refund and the cell emptied | `TestUnknownFurniture_OccupiesAndRemoves`, `TestBonus_Office` PASS | `office_test.go:616-617` `sofa` placed, gems 20 coins 1000; `:618` `f.status(..., 409, "cell_occupied")`; `:619` remove 200 (`f.ok`, `:73`); `:620` `got.Coins != 1000`, `got.Gems != 20`; `:623` response room all null; `:624` `/api/me` room all null; `bonus_test.go:91-93` `sofa` xp/deploy/spregen 0, asserted at `:95` | PASS |
| C44 | rows in `sotao` 0, `parede` 8, `piso` 24 ignored; `/api/me` 200 with parede 8 null, piso mesa + 23 null | `TestMe_SkipsCellsOutsideCatalog` PASS | `office_test.go:630-633` the four rows; `:634` `f.me()` (200 via `:73`); `:635` `len(got.Office) != 2`, `len(parede) != 8`, `len(piso) != 24`; `:638` `wantRoom(got.Office, "piso/0=mesa")` | PASS |
| C45 | web: `sofa` shows `?`, `1 móveis instalados`, `CONFORTO 8`; click calls remove and shows `GUARDADO` | `unknown furniture` PASS | `OfficeScene.test.tsx:292` `.office-cell-glyph` `toHaveTextContent(/^\?$/)`; `:293` `1 móveis instalados`; `:294` `stat("CONFORTO")).toBe("8")`; `:296` `m.calls("POST /api/me/office/piso/0/remove")).toBe(1)`; `:297` `toHaveTextContent(/^GUARDADO$/)` | PASS |

## Coverage

Rows the fix touched are recomputed and marked `verified at 1dbc497`. Every other row is `carried from 20e770b`, and its line citations are refreshed where the file moved. Earlier-feature members were confirmed as `--- PASS` in the full api run at 1dbc497. The same ten tests as round 1 were checked by name: `TestStart_CreatesJobWithCatalogDuration`, `TestStart_SameTypeRunning`, `TestStart_LevelBoundary`, `TestStart_UnknownType`, `TestStart_UnknownLevel`, `TestDeployRoutes_SessionAndPlayer`, `TestDeployRoutes_UnexpectedError`, `TestStart_InvalidBody`, `TestAuthMiddleware_RejectsEveryProtectedRoute` and `TestPlayerNotFound_OnPlayerRoutes`.

**The removed `occupant` guard** (verified at 1dbc497):

- **Why it was unreachable.** `cellOf` (`office.go:33`) bounds the position against the handler's catalog (`catalog.go:443` `Zone`). `p.Office` is built by `emptyOffice` (`player.go:60-65`) from `catalog.Default()`. `Default` is `Load()` of the embedded data (`catalog.go:479-486`). In production the handler catalog is also `catalog.Load()` of the same embedded data (`api/cmd/api/main.go:43`, passed through `:51` and `router.go:58`).
- **No test path reaches it.** `apptest.NewWithCatalog` loads the same data and applies a test's edit (`apptest.go:111-116`). Its three callers edit only `DeployLevels[0].Minutes` (`deploy/office_test.go:86`), `Combat.StartingItems` (`battle_test.go:914`) and `Items[..].Price` (`shop_test.go:302`). None touches `Office.Zones`. `TestMigration_OfficeExistingPlayers` uses plain `catalog.Load()` (`office_test.go:589`).
- **Conclusion.** No path can index `p.Office[c.zone][c.position]` (`office.go:85`, `:106`) out of range. If an injected catalog ever grew a zone, the panic would come back as a logged `500` through `httpx.Recover` (`router.go:37`), not as a crash. This is recorded, not counted.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| install statuses (10) - carried from 20e770b | plan Surface; `office.go:63-95`, `player.Pay`, `router.go:65` | 200 C4 · 401 C15 · 409 gems/coins C5 · 409 `cell_occupied` C6, C43 · 422 `invalid_body` C10 · `unknown_cell` C9 · `unknown_furniture` C8 · `wrong_zone` C7 · 500 C16 | - |
| remove statuses (4) - carried from 20e770b | plan Surface; `office.go:100-124` | 200 C12, C13, C43 · 401 C15 · 422 C9 · 500 C16 | - |
| `POST /api/me/deploys` statuses (8) - carried from 20e770b | plan Surface | 201 C22 · 401 / 409 / 422 ×4 / 500: deploy-pipelines C9, C2, C39, C4, C5, C3, C38 at HEAD · 500 office cause C16 | - |
| `GET /api/me` statuses (4) - carried from 20e770b | plan Surface | 200 C2, C44 · 401 foundation C9 · 404 foundation C38 · 500 C16 | - |
| catalog `office` keys (4) - carried from 20e770b | plan Landing door 2 | zones, furniture, levels, maxDeployCut: C1 | - |
| furniture × fields (12 × 9) - carried from 20e770b | prototype `officeDefs`, compared by script with `api/catalog/office.json` in round 1 (the catalog is untouched in the fix range) | C1, table-driven over all 12 × 9 by value | - |
| zones (2) and levels (5) - carried from 20e770b | prototype `officeLevels`, plan Assumptions (Grade) | C1; levels both sides of every boundary C33 | - |
| cell bounds (7) - carried from 20e770b | `office.go:32-41` | unknown zone, -1, parede 7/8, piso 23/24, non-integer: C9 | - |
| validation order (5 adjacent pairs of 6 stages) - verified at 1dbc497 | plan Assumptions "Ordem das validações"; `office.go:67` decode, `:70` cell, `:74` furniture, `:78` zone, `:85` occupied, `:88` Pay | `invalid_body` < `unknown_cell` C14 `office_test.go:391` (R2-F1 killed) · `unknown_cell` < `unknown_furniture` C14 `:392` · `unknown_furniture` < `wrong_zone`: structural (an unknown id has no zone), with `unknown_furniture` < `cell_occupied` shown at `:393` · `wrong_zone` < `cell_occupied` C14 `:394` · `cell_occupied` < saldo C14 `:395` | - |
| `player.Pay` (4 + currency isolation) - verified at 1dbc497 | `player.go:339-353` (switch `gems` / `coins`, strict `<`) | gems below, gems equal, coins below, coins equal: C42 `pay_test.go:21-24`; the other currency stays unchanged in every row, `:31`; R2-F4 killed. Boundary: shop C7, C25; office C5, C17 | - |
| stored furniture outside the catalog (9 branches) - verified at 1dbc497 | plan S5 AC 33-35 and Assumptions; code `player.go:164` (zone and position skip), `office.go:85` (install occupied), `office.go:106-121` (remove, refund only when `FurnitureItem` is ok at `:114`), `player.go:383` (Bonus `ok`), `web/src/lib/office.ts:10-11` (stats skip), `OfficeScene.tsx:43-47` (tap removes), `:134` (`?`) | unknown zone skipped C44 `:635` (R2-F2 killed) · position ≥ cells skipped C44 `:635`, `:638` · unknown id occupies on install C43 `:618` · remove empties C43 `:623-624` · no refund C43 `:620` (R2-F3 killed) · Bonus 0 in xp/deploy/spregen C43 `bonus_test.go:91-93` · screen `?` C45 `:292` · not in count or comfort C45 `:293-294` · click removes with `GUARDADO` C45 `:296-297` (R2-F5 killed) | - |
| refund (3) - carried from 20e770b | `office.go:114-120`, `office.ts:39-41`, prototype `Math.floor(d.cost / 2)` | even coins, odd coins, gems: C12, C37 | - |
| bonus types, cap, exclusions (7 + unknown furniture) - verified at 1dbc497 | `player.Bonus` `player.go:365-392`, plan door 3, AC 33 | xp C21, C23 · deploy C21, C22 · spregen C21, C25 · cap 40 C21 (41→40), C33 (45→40) · no bonus C21 · furniture outside hp/sp/dmg C21, C26 · other sources outside office types C21 · unknown furniture 0 C43 | - |
| rounding (4) and snapshot (2) - carried from 20e770b | `deploy.go:108-112`, plan door 6 | duration down 53.4 / up 52.8 C22 · XP down 82.4 / up 85.6 C23 · `ends_at` and XP frozen C24 | - |
| SP regen (3) and combat stats unchanged (4) - carried from 20e770b | `rules.go:165`, `handlers.go:132-133`, plan AC 18-19 | with, without, clamp: C25 · SP max, damage, HP max, victory reward: C26 | - |
| new error codes (4) + `wrong_zone` messages (2) - carried from 20e770b | `httpx/errors.go` diff, plan door 8 | C19; C7 | - |
| screen copy sets (filters 3, bonus text 4, price short 2 / long 2, cell states 3, stats 4, footer 2) - cell states verified at 1dbc497, rest carried | prototype `officeFilters`, `officeBonusTxt`, `tag`/`costTxt`, `mkCell`, stats markup, `officeNextTxt`; AC 35 adds the `?` cell state | C28, C29, C30, C31 (`+`, glyph and name), C45 (`?`), C32, C33 | - |
| screen toasts (7 + `GUARDADO` bare) - verified at 1dbc497 | prototype `tapOfficeCell`, AC 35. `ESCOLHA UM MÓVEL` cannot be reached (`OfficeScene.tsx:16` always selects a card) | INSTALADO C36 · GUARDADO COINS/GEMS C37 · bare `GUARDADO` C45 · VAI NA PAREDE / NO PISO C34 · COINS / GEMS INSUFICIENTES C35 | - |
| action outcomes on screen (8) - carried from 20e770b | `OfficeScene.tsx:27-39` | install and remove × ok / error message / no body / network: C36, C37, C38 | - |
| tabs (8) and scenes without EM BREVE (8) - carried from 20e770b | `Tabs.tsx`, `(game)` routes | C27; C41 | - |
| Landing doors (8) - carried from 20e770b | plan Landing | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C22-C24 · 7 C27 · 8 C19. Door 1's `player_id → players` FK is not asserted; Relations names only the PK and position ≥ 0, so this is recorded and not counted | - |
| stored data (1), startup config (1) - carried from 20e770b | plan Impact; `cmd/api/main.go:35` Migrate, `:43` `catalog.Load`, `:51` `Catalog: cat`; `apptest.go:111`, `:127` | existing players C20 · shared catalog assembly C1 | - |

Observed and not counted: `Pay`'s `switch` (`player.go:340`) has no `default`, so a price in a third currency would be free. That set's authority is the catalog. `catalog.go:89` documents `Currency` as `"gems"` or `"coins"`, and C1 asserts every furniture price by value. The branch is unreachable with the shipped data, and it was moved verbatim from `shop.pay`.

## Test policy rows

Rows classifying a touched file (`office.go`, `player.go`, `OfficeScene.tsx`) and the two rows round 1 left unmet are verified at 1dbc497. The rest are carried from 20e770b.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `player.go` `Bonus` (verified at 1dbc497) | own layer C21, C43 · boundary C22, C23, C25, C26 | yes - every row asserted, unknown furniture included (`bonus_test.go:91-93`); F2 killed at own layer |
| Decides, reached across a boundary | `player.go` `Pay`, moved from `shop.pay` (verified at 1dbc497) | own layer C42 · boundary shop C7, C25, office C5, C17 | yes - each currency × {below, equal} asserted at own layer (`pay_test.go:21-24`, `:28`, `:31`); now classified in `checks.md` Test policy; R2-F4 killed |
| Decides, reached across a boundary | `office/office.go` `cellOf`, `Install`, `Remove`; `player.LoadOffice` skip (verified at 1dbc497) | boundary C4-C17, C19, C43, C44 | yes - every ordering row (C14 `:391-395`) and every catalog-drift row (C43, C44) is asserted; `occupant` was removed and was unreachable (see Coverage); R2-F1, R2-F2, R2-F3 killed |
| Decides, reached across a boundary | `deploy/deploy.go` `Start` (cut, rounding, snapshot) (carried from 20e770b) | boundary C22-C24 | yes - F3 killed |
| Decides, reached across a boundary | `battle/rules.go` `EndTurn`, `battle/handlers.go` (carried from 20e770b) | own layer C25 (`EndTurn`) · boundary C25, C26 | yes - F4 killed both proofs |
| Decides, not reached across a boundary | `web/src/components/OfficeScene.tsx`, `web/src/lib/office.ts` (verified at 1dbc497) | screen level C28-C39, C45 | yes - filter, detail, cell state (`+`, glyph, `?`), zone and balance pre-check, level boundary, stats, refund text, unknown-id remove and action outcome are all asserted; F5 and R2-F5 killed |
| Entry point that decides nothing | `app/router.go` office routes, `web/src/app/(game)/office/page.tsx`, `Tabs.tsx` entry, `GET /api/catalog`, `migrations/00006_office.sql` (carried from 20e770b) | boundary C1, C15, C18, C20, C27, C40, C41 | yes |
| Instrumentation, pass-throughs | `catalog.go` types and `Zone` / `FurnitureItem`, `httpx/errors.go` new errors, `player.emptyOffice`, `web/src/lib/types.ts`, `globals.css`, `test/helpers.ts` (carried from 20e770b) | none of their own - covered by consumers | yes |

**Swept rows citing existing behaviour** (carried from 20e770b; the fix touched none of these files):

- Screen loading state: holds. `GameShell.tsx:37` and `:85-86`.
- Unauthorised state: holds. `GameShell.tsx:32`, `:71-72` (`LoginScreen` in the `(game)` layout). The plan's wording "redireciona" is imprecise, but the constraint is present.
- Who may call it: holds. `router.go:65` `auth.RequireSession` wraps `:87-88`.
- Observability: holds. Neither `office.Handlers` nor `shop.Handlers` carries a `Logger`.
- The `n/a` rows are approved policy.

**Impact on earlier checks:** carried from 20e770b. The fix range touches no file from an earlier feature.

## Faults injected

Verified at 1dbc497. All faults ran in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` symlinked in for R2-F5. Each file was restored with `git checkout --` after its run, and the worktree was removed with `git worktree remove --force` and `git worktree prune`.

The real tree's `git status --porcelain` was identical before and after:

```
 M .specs/LESSONS.md
 M .specs/STATE.md
 M .specs/lessons.json
?? .claude/
?? api/cmd/api/api
```

` M .specs/LESSONS.md` and ` M .specs/lessons.json` were not in the brief's list of pre-existing entries. They were already modified when this baseline was taken, and this verifier had written nothing at that point.

Round 2 made each surface the fix created or touched fail once: C14's new case, C42, C43, C44 and C45.

| Mutation | Location | Killed |
| --- | --- | --- |
| R2-F1 swap validation order: `cellOf` before `DecodeJSON` in `Install` | `api/internal/office/office.go:67-73` | yes - `TestInstall_ValidationOrder` (`office_test.go:391` got `422 unknown_cell`, want `invalid_body`) |
| R2-F2 `LoadOffice` keeps a row in an unknown zone (creates the zone key instead of skipping) | `api/internal/player/player.go:164` | yes - `TestMe_SkipsCellsOutsideCatalog` (`office_test.go:635` 3 keys, want 2) |
| R2-F3 refund 10 coins when the removed furniture is outside the catalog | `api/internal/office/office.go:114-121` | yes - `TestUnknownFurniture_OccupiesAndRemoves` (`office_test.go:620` coins 1010, want 1000) |
| R2-F4 `Pay` equal-balance boundary: `p.Gems < price.Amount` -> `<=` | `api/internal/player/player.go:342` | yes - `TestPay_BalanceByCurrency` (`pay_test.go:28` err `not_enough_gems`, want nil; `:31` gems 15, want 0) |
| R2-F5 web treats an unknown id as empty on click (round 1's `tap`: `installed = byId(current); if (installed)`) | `web/src/components/OfficeScene.tsx:42-48` | yes - `unknown furniture` (`OfficeScene.test.tsx:296` remove calls 0, want 1) |
| F1 (round 1, carried from 20e770b) refund rounds up: `Amount / 2` -> `(Amount + 1) / 2` | `api/internal/office/office.go:115` (was `:123`; code unchanged) | yes - `TestRemove_RefundsHalf` |
| F2 (round 1, carried from 20e770b) deploy cap off by one | `api/internal/player/player.go:389` | yes - `TestBonus_Office` |
| F3 (round 1, carried from 20e770b) duration `math.Round` -> `math.Floor` | `api/internal/deploy/deploy.go:110` | yes - `TestStart_OfficeCutsDuration` |
| F4 (round 1, carried from 20e770b) office SP regen dropped from `EndTurn` | `api/internal/battle/rules.go:165` | yes - `TestTurn_OfficeSPRegen`, `TestEndTurn_SPRegenBonus` |
| F5 (round 1, carried from 20e770b) level boundary `>=` -> `>` | `web/src/lib/office.ts:26` | yes - `level and stats` |

## Gate

Verified at 1dbc497.

- `cd api && go test -count=1 -p 1 -v ./...`: exit 0. 10 packages `ok`, 190 passed (181 top-level + 9 subtests), 0 failed.
- `cd web && npx vitest run`: exit 0. 15 files, 200 passed, 0 failed.
- `make e2e`: exit 0. 8 passed, 0 failed.

Total: 398 passed, 0 failed.
