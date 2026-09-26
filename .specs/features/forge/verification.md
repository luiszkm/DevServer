# Forge verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: a089239..ca0706c2c4d171dbe7188917583d3869fbb087a2
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 1 (`89c44a5`) failed on three gaps. Round 2 is scoped to the fix `ca0706c`
(`git diff 89c44a5..ca0706c`) and to every verdict that was not PASS. The fix changes only
`api/internal/shop/forge_test.go` (appends `TestForge_UnknownOutputGear` at `:392-405`),
`web/src/components/ShopScene.test.tsx` (inserts `forge owned priority` at `:352-363`, which moves
every later line down by 13), and the specs (C32, C33, AC 26, a Surface note). No production file
changed: `git diff --stat 89c44a5..HEAD -- api web` minus those two test files is empty.

All 33 proofs were re-run in full at `ca0706c`. The three round 1 gaps are closed:

1. F4 was re-injected and is now killed by C32.
2. The card priority in `recipeStatus` now has owned-without-materials and owned-without-balance
   cases. Faults F6 and F9 on those cases are both killed.
3. The `forge.go:26` branch that returns `422 unknown_gear` is now in the Surface note and AC 26,
   and it is proven by C33. Faults F7a and F7b are both killed.

## Binding sources

Carried from 89c44a5. The profile is `standard`, so step 1 does not run. The plan marks no source
as binding for the interface, and the fix touched no interface.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none - profile standard, step 1 does not run | n/a | - | - |

## Checks

All rows below were verified at ca0706c. Every proof was re-run at the new HEAD, and every
citation in a file the fix touched was refreshed.

Proof runs at `ca0706c` (the real tree was read-only; e2e ran in a scratch worktree at the same sha):

- api (one invocation): `cd api && go test -count=1 -p 1 ./internal/shop ./internal/catalog -run '^(TestCatalog_ServesForge|TestCatalog_ServesForgeGear|TestCatalog_RecipesReferenceCatalog|TestBuyGear_NotForSale|TestForge_ItemRecipe|TestForge_EveryRecipe|TestForge_GearOwnsEquips|TestForge_Boundaries|TestForge_UnknownRecipe|TestForge_AlreadyOwned|TestForge_NotEnoughMaterials|TestForge_NotEnoughBalance|TestForge_ValidationOrder|TestForge_PlayerNotFound|TestForgeRoutes_RequireSession|TestForge_ConcurrentSerialize|TestForge_Failure|TestForge_ErrorCodes|TestForge_UnknownOutputGear|TestCatalog_ServesShop|TestCatalog_ETag|TestHPBonus_EquipAndRemove)$' -v`. Both packages printed `ok`. Each of the 22 tests printed its own `--- PASS` line, including `TestForge_UnknownOutputGear` and the 6 `TestForge_EveryRecipe/<id>` subtests.
- web unit (one invocation): `cd web && npx vitest run src/components/ShopScene.test.tsx src/lib/art.test.tsx -t "forge section|forge card status|forge detail|forge button|forge success|forge errors|forge pending|craft-only gear|web mock matches forge catalog|gear icons per shop.json|forge owned priority|shows the three sections" --reporter=verbose`. Both files passed, with 27 `✓` lines:
  - 6 `forge card status (...)` and 6 `forge button (...)` (including `gems price`)
  - `forge owned priority (owned, no materials, no balance)` and `forge owned priority (owned, materials, 149 coins)`
  - 2 `forge success (...)`, 3 `forge errors (...)`, `forge pending`, `craft-only gear` and `craft-only gear (owned)`
  - `forge section`, `forge detail`, `web mock matches forge catalog`, `gear icons per shop.json, 16x16` and `shows the three sections`
- e2e: `cd <scratch>/verify2/web && npx playwright test e2e/forge.spec.ts`. 3 passed: `forge on phone 390`, `forge on phone 360`, `forge round trip`. The api (:8180) and Next (:3100) servers were started fresh from the worktree. Only the fakegithub server on :9180 was reused.
- art: `python3 .claude/skills/pixel-assets/scripts/render.py --check web/public/art/icon/gear-caneca_log.png web/public/art/icon/gear-hoodie_trace.png web/public/art/icon/gear-teclado_race.png --category icon` printed `ok` 3 times and exited 0. `make art-check` printed `art ok` and exited 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `recipes` has 6 entries in order with every field matched by value, and there is no `price` key when a recipe has no cost | `TestCatalog_ServesForge` PASS | `api/internal/catalog/catalog_test.go:578` - `len(b.Recipes) != len(want)`; `:591` - `got != want[i]` over 6 literal rows; `:594` - raw-JSON `price` key presence matches `price == "-"` | PASS |
| C2 | 9 gear: the 6 existing with their prices, then the 3 craft-only with every field and no `price` key | `TestCatalog_ServesForgeGear` PASS | `api/internal/catalog/catalog_test.go:634` - `len(b.Gear) != len(want)` (9); `:647` - `if hasPrice` on the raw key for i >= 6; `:656` - `got != want[i]` over 7 literal fields | PASS |
| C3 | Catalog references: every kind is valid, every output and item exists, every quantity is >= 1, and every unpriced gear has a recipe | `TestCatalog_RecipesReferenceCatalog` PASS | `api/internal/catalog/catalog_test.go:673`/`:677` - `c.Item`/`c.GearItem(...)` `!ok`; `:681` - bad kind; `:688` - `c.Item(in.Item)` `!ok`; `:691` - `in.Quantity < 1`; `:697` - `g.Price == nil && !made[g.ID]` | PASS |
| C4 | `teclado_race` returns 422 `not_for_sale` and changes nothing; `cafe` with 50 coins returns 200 | `TestBuyGear_NotForSale` PASS | `api/internal/shop/forge_test.go:44` - `f.unchanged(".../gear/teclado_race", 422, "not_for_sale")`, where `unchanged` (`:31-38`) compares the full-row snapshot before and after; `:46` - `got.Coins != 0 \|\| !f.me().has("cafe")` | PASS |
| C5 | `forja_cache` returns 200 with only a `player` key, no `null_shard`, `sp_potion` 3, coins 100, gems 0 and a stored quantity of 0 | `TestForge_ItemRecipe` PASS | `api/internal/shop/forge_test.go:67` - `!ok \|\| len(body) != 1`; `:72` - `it.Item == "null_shard"`; `:76` - `qty("sp_potion") != 3 \|\| Coins != 100 \|\| Gems != 0`; `:81` - `n != 0` | PASS |
| C6 | Table over all 6 recipes: each material goes to 0, coins go to 0 or stay the same, gems stay the same, and the output is +1 item or the gear is owned and equipped | `TestForge_EveryRecipe` + 6 subtests PASS | `api/internal/shop/forge_test.go:89` - `len(cat.Recipes) != 6`; `:106` - `q != 0`; `:114` - `Coins != wantCoins \|\| Gems != 7`; `:119` - `q != 1`; `:124` - `!got.has(g.ID)`; `:127` - `*e != g.ID` | PASS |
| C7 | hoodie replaces moletom with hpMax +21 and hp +21; teclado replaces fone with hpMax unchanged; caneca fills the empty bebida slot | `TestForge_GearOwnsEquips` PASS | `api/internal/shop/forge_test.go:146`, `:149` - `*e != "hoodie_trace"`; `:152` - `HPMax != before.HPMax+21 \|\| HP != before.HP+21`; `:161`/`:164` - acessorio, HP unchanged; `:170` - bebida `caneca_log` | PASS |
| C8 | Material and coin boundaries: 1 shard returns 409, 2 return 200 and leave 0; 19 coins return 409, 20 return 200 and leave 0 | `TestForge_Boundaries` PASS | `api/internal/shop/forge_test.go:180` - `unchanged(..., 409, "not_enough_materials")`; `:182` - `qty("null_shard") != 0`; `:188` - `unchanged(..., 409, "not_enough_coins")`; `:190` - `Coins != 0 \|\| qty("boost_deploy") != 1` | PASS |
| C9 | `nada` and `sp_potion` return 422 `unknown_recipe` with `receita desconhecida` and change nothing | `TestForge_UnknownRecipe` PASS | `api/internal/shop/forge_test.go:202` - `f.status(rec, 422, "unknown_recipe")`; `:203` - `msg != "receita desconhecida"`; `:206` - `after != before` | PASS |
| C10 | Owned gear returns 409 `already_owned` with and without materials, and nothing changes | `TestForge_AlreadyOwned` PASS | `api/internal/shop/forge_test.go:217`, `:220` - `f.unchanged("/api/me/forge/forja_teclado", 409, "already_owned")` | PASS |
| C11 | Missing `memory_crystal` returns 409 `materiais insuficientes`; the other materials stay and no gear is added | `TestForge_NotEnoughMaterials` PASS | `api/internal/shop/forge_test.go:230` - `status(rec, 409, "not_enough_materials")`; `:231` - message; `:234` - snapshot equal; `:237` - `qty("race_core") != 2 \|\| qty("wild_trace") != 3 \|\| has("teclado_race")` | PASS |
| C12 | Gems price: 4 gems return 409, 5 return 200 and leave 0; the embedded catalog with 19 coins returns 409 and leaves the inventory as it was | `TestForge_NotEnoughBalance` PASS | `api/internal/shop/forge_test.go:247` - `Price{gems,5}`; `:254` - `unchanged(..., 409, "not_enough_gems")`; `:256` - `Gems != 0 \|\| Coins != 1000`; `:263` - `unchanged(..., 409, "not_enough_coins")`; `:264` - inventory 1/1/0 | PASS |
| C13 | Validation order, one case per pair | `TestForge_ValidationOrder` PASS | `api/internal/shop/forge_test.go:281` - `rec.Code != tc.status \|\| ErrorCode != tc.code` over `unknown_recipe` and `player_not_found` for a session with no dev; `:287` - `already_owned` with no materials; `:288` - `not_enough_materials` with 0 coins | PASS |
| C14 | A session with no dev returns 404 `player_not_found` | `TestForge_PlayerNotFound` PASS | `api/internal/shop/forge_test.go:295` - `rec.Code != 404 \|\| ErrorCode != "player_not_found"` | PASS |
| C15 | No session returns 401 `unauthenticated` | `TestForgeRoutes_RequireSession` PASS | `api/internal/shop/forge_test.go:304` - `rec.Code != 401 \|\| ErrorCode != "unauthenticated"` | PASS |
| C16 | Two concurrent forges give one 200 and one 409 materials; `sp_potion` +1 and 0 shards | `TestForge_ConcurrentSerialize` PASS | `api/internal/shop/forge_test.go:332` - `oks != 1 \|\| conflicts != 1`; `:336` - `qty("sp_potion") != 1 \|\| qty("null_shard") != 0` | PASS |
| C17 | 500 `internal` with the `request_id` logged, and nothing is consumed | `TestForge_Failure` PASS | `api/internal/shop/forge_test.go:348` - `rec.Code != 500 \|\| ErrorCode != "internal"`; `:352` - log contains `request_id`; `:361`, `:368` - `after != before` | PASS |
| C18 | The new error codes use the `{"error":{"code","message"}}` envelope | `TestForge_ErrorCodes` PASS | `api/internal/shop/forge_test.go:385` - status, `len(body) != 1`, `len(body["error"]) != 2`, code and message compared over both codes | PASS |
| C19 | FORJA follows SKINS; 6 cards in order; item and gear art | `forge section` ✓ | `web/src/components/ShopScene.test.tsx:278` - `compareDocumentPosition(forge) & DOCUMENT_POSITION_FOLLOWING`; `:280` - `cardNames("FORJA")).toEqual([6 names])`; `:293` - `img src).toBe(src)` | PASS |
| C20 | Card status, one case per row | `forge card status (...)` x6 ✓ | `web/src/components/ShopScene.test.tsx:306` - `.shop-status).toHaveTextContent(^<status>$)` over the rows at `:299`-`:303` (owned `JÁ POSSUI`, `PRONTO` x2, `FALTAM MATERIAIS` x2); `:312` - all 6 `^FALTAM MATERIAIS$` for a new dev. The round 1 precision gap (every owned case had materials) is now closed by C32 | PASS |
| C21 | Detail for teclado and cache | `forge detail` ✓ | `web/src/components/ShopScene.test.tsx:319`-`:322` - rarity, name, description, `"bônus: +12% de dano"`; `:324` - `lines).toEqual([3 lines])`; `:325` - `"custo: 150 COINS"`; `:331` - `["FRAGMENTO NULL 0/2"]`; `:332`/`:333` - `not.toContain("custo:")`/`("bônus:")` | PASS |
| C22 | Detail button, one case per row | `forge button (...)` x6 ✓ | `web/src/components/ShopScene.test.tsx:347` - `buttons.map(textContent)).toEqual([label])` over the rows at `:338`-`:342`; `:348`/`:349` - enabled/disabled; `:373` - `detailButton("GEMS INSUFICIENTES")).toBeDisabled()` (was `:360`) | PASS |
| C23 | FORJAR / FORJAR E EQUIPAR call the route, send the player to `setPlayer`, and show the toast | `forge success (...)` x2 ✓ | `web/src/components/ShopScene.test.tsx:388` - `findByRole("status")).toHaveTextContent(^toast$)`; `:389` - `f.calls(route)).toBe(1)`; `:391` - `setPlayer).toHaveBeenCalledWith(updated)` (were `:375`-`:378`) | PASS |
| C24 | 409 message, empty body and network failure; `setPlayer` not called | `forge errors (...)` x3 ✓ | `web/src/components/ShopScene.test.tsx:404` - `findByRole("status")).toHaveTextContent(text)`; `:405` - `setPlayer).not.toHaveBeenCalled()` (were `:391`/`:392`) | PASS |
| C25 | While pending, the button is disabled and a second click does not fetch again | `forge pending` ✓ | `web/src/components/ShopScene.test.tsx:414` - `detailButton("FORJAR")).toBeDisabled()`; `:416` - `f.fn).toHaveBeenCalledTimes(1)` (were `:401`/`:403`) | PASS |
| C26 | Unowned craft-only gear shows `FORJA` / `custo: só na forja` / a disabled `SÓ NA FORJA` and never fetches; owned shows `NO INVENTÁRIO` and `EQUIPAR` | `craft-only gear`, `craft-only gear (owned)` ✓ | `web/src/components/ShopScene.test.tsx:423` - `^FORJA$`; `:425` - `"custo: só na forja"`; `:426` - `SÓ NA FORJA).toBeDisabled()`; `:428` - `f.fn).not.toHaveBeenCalled()`; `:435` - `^NO INVENTÁRIO$`; `:439` - `f.calls("POST /api/me/gear/teclado_race/equip")).toBe(1)` | PASS |
| C27 | At 390 and 360 wide: same x and width as SKINS, placed below it, inside the viewport, and no horizontal scroll | `forge on phone 390`, `forge on phone 360` ✓ | `web/e2e/forge.spec.ts:14` - `forge.x).toBeCloseTo(skins.x, 0)`; `:15` - width; `:16` - `forge.y >= skins.y + skins.height`; `:17`/`:18` - in viewport; `:20` - `scrollWidth <= clientWidth` | PASS |
| C28 | Browser round trip through `/api` | `forge round trip` ✓ | `web/e2e/forge.spec.ts:30` - `.shop-status).toHaveText("FALTAM MATERIAIS")`; `:32` - `res.status()).toBe(409)`; `:33` - `error.code).toBe("not_enough_materials")` | PASS |
| C29 | The web mock copies the recipes and the 3 gears by value | `web mock matches forge catalog` ✓ | `web/src/lib/art.test.tsx:333` - `RECIPES).toEqual(forge.recipes)`; `:335` - unpriced ids; `:336` - `GEAR.filter(!price)).toEqual(full)` | PASS |
| C30 | The 3 icons exist at 16x16 | `gear icons per shop.json, 16x16` ✓ | `web/src/lib/art.test.tsx:101` - `expectAssets(icons(shop.gear.map(...)))`; `:55`-`:57` - `existsSync`, `pngSize(png)).toEqual(size)` | PASS |
| C31 | The style check finds 0 errors, and rendering the specs reproduces the PNGs byte for byte | `render.py --check` exit 0; `make art-check` exit 0 | `Makefile:32` - `render.py web/art --out "$tmp"`; `Makefile:33` - `diff -r "$tmp" web/public/art && echo "art ok"`; output `ok web/public/art/icon/gear-{caneca_log,hoodie_trace,teclado_race}.png` | PASS |
| C32 | `JÁ POSSUI` wins on card and button: owned with no materials and 0 coins, and owned with materials and 149 coins | `forge owned priority (owned, no materials, no balance)` ✓, `forge owned priority (owned, materials, 149 coins)` ✓ | `web/src/components/ShopScene.test.tsx:354` - row `coins: 0, gear: ["teclado_race"], inventory: []`; `:355` - row `coins: 149, gear: ["teclado_race"], inventory: TECLADO_MATS` (`:271` = 2 race_core, 1 memory_crystal, 3 wild_trace); `:358` - `recipe("forja_teclado").querySelector(".shop-status")).toHaveTextContent(/^JÁ POSSUI$/)`; `:361` - `buttons.map(textContent)).toEqual(["JÁ POSSUI"])`; `:362` - `buttons[0]).toBeDisabled()` | PASS |
| C33 | With a test catalog where `forja_teclado` makes gear `nada`, plus the materials and 150 coins, the route returns 422 `unknown_gear` and nothing changes | `TestForge_UnknownOutputGear` PASS | `api/internal/shop/forge_test.go:394`-`:399` - `apptest.NewWithCatalog` sets `Output.ID = "nada"`; `:402`/`:403` - `balance(0, 150)`, `give(race_core 2, memory_crystal 1, wild_trace 3)`; `:404` - `f.unchanged("/api/me/forge/forja_teclado", 422, "unknown_gear")` (status, code, and full-row snapshot equal, `:31-38`) | PASS |

## Coverage

Each set was recomputed from the source that holds authority over it. The rows marked
`verified at ca0706c` are the ones whose authority the fix touched: the forge route statuses
(Surface note, AC 26), the handler branches, and the screen labels, priority and card status
(C32). Every other row is `carried from 89c44a5`, because the fix changed no production file and
no authority those rows rest on.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/me/forge/{recipe}` statuses (10) - verified at ca0706c | plan `Surface` row 1 + the round 1 note under Surface (AC 26) | 200 `forge_test.go:67`, `:104` · 401 `:304` · 404 `:295` · 409 already_owned `:217` · 409 not_enough_materials `:230` · 409 not_enough_coins `:188`, `:263` · 409 not_enough_gems `:254` · 422 unknown_recipe `:202` · 422 unknown_gear `:404` (C33) · 500 `:348` | - |
| forge handler branches (9) - verified at ca0706c | code `api/internal/shop/forge.go:18-53` (unchanged since 89c44a5) | unknown recipe `:19` C9 · output gear missing from the catalog `:25`/`:26` C33 (`forge_test.go:404`, F7a/F7b killed) · owned `:28` C10 · material short `:33` C8/C11 · price nil or set `:37` C5/C8 · Pay in coins or gems C8/C12 · item output `:47` C5/C6 · gear insert `:50` C6/C17 · equip `:53` C7 | - |
| `POST /api/me/shop/gear/{id}` changed statuses (1) + unchanged 200 - carried from 89c44a5 | plan `Surface` row 2 | 422 not_for_sale `forge_test.go:44` · 200 `:46` | - |
| `GET /api/catalog` changes (2) + statuses (200, 304) - carried from 89c44a5 | plan `Surface` row 3 | `recipes` `catalog_test.go:591` · `gear[].price` `:647` · 304 `TestCatalog_ETag` (PASS at ca0706c) | - |
| recipes (6) - carried from 89c44a5 | `api/catalog/forge.json` | C1 `catalog_test.go:591` · C6 subtests over all 6 (PASS at ca0706c) | - |
| craft-only gear (3) - carried from 89c44a5 | `api/catalog/shop.json` unpriced entries | C2 `catalog_test.go:656` · C6 · C29 `art.test.tsx:336` · C30 `art.test.tsx:101` | - |
| output kinds (2), price presence (2), currency (2) - carried from 89c44a5 | `forge.go:37`, `:47`, `player.Pay` | item `forge_test.go:119` · gear `:124`, `:127` · none `:76` · coins `:188` · gems `:254` | - |
| material / balance boundaries (2+2) - carried from 89c44a5 | plan AC 9, 12, 13 | `forge_test.go:180`, `:182`, `:188`, `:190` | - |
| validation order (4 pairs) - carried from 89c44a5 | plan Assumptions "Ordem das validações" | `forge_test.go:281` x2 · `:287` · `:288` | - |
| nothing consumed on failure (5 + unknown_gear) - verified at ca0706c | plan Assumptions "Falha não consome nada" + AC 26 "sem alterar nada" | already_owned `:220` · materials `:234` · balance `:254`, `:263` · db before `:361` · db after materials `:368` · unknown_gear `:404` (snapshot in `unchanged`) | - |
| equip on forge (3) - carried from 89c44a5 | plan AC 7 + `shop.equip` | `forge_test.go:152`, `:164`, `:170` | - |
| catalog integrity rules (5) - carried from 89c44a5 | plan AC 3 | `catalog_test.go:673`/`:677`, `:681`, `:688`, `:691`, `:697` | - |
| new error codes (2) - carried from 89c44a5 | plan Landing door 4 | `forge_test.go:385` | - |
| card status (3 labels + owned-first priority over materials and balance) - verified at ca0706c | plan AC 17 + `web/src/components/ShopScene.tsx:61-63` (`recipeStatus`) | `JÁ POSSUI` with materials `ShopScene.test.tsx:306` (row `:299`) · `PRONTO` `:306` (rows `:300`, `:301`) · `FALTAM MATERIAIS` `:306` (rows `:302`, `:303`), `:312` · owned with no materials -> `JÁ POSSUI` `:358` (row `:354`, F6 killed) · owned with short balance -> `JÁ POSSUI` `:358` (row `:355`, F9 killed) | - |
| detail button labels (6) - verified at ca0706c | plan AC 19 + `ShopScene.tsx:245-247` | `FORJAR`, `FORJAR E EQUIPAR`, `JÁ POSSUI`, `FALTAM MATERIAIS`, `COINS INSUFICIENTES` `ShopScene.test.tsx:347` (rows `:338`-`:342`) · `JÁ POSSUI` also `:361` · `GEMS INSUFICIENTES` `:373` | - |
| detail button priority (3 pairs, AC 19 "nessa ordem de prioridade") - verified at ca0706c | plan AC 19 + `ShopScene.tsx:247` | owned before materials `:361` (row `:354`, F4 killed) · owned before balance `:361` (row `:355`, F8 killed) · materials before balance `:347` (row `:340` "no material, no balance", F10 killed) | - |
| detail lines (4) - carried from 89c44a5 (proof re-run at ca0706c; lines above `:352` did not move) | plan AC 18 | `ShopScene.test.tsx:319`-`:333` | - |
| action outcomes (5) - verified at ca0706c (citations moved +13) | plan AC 20, 21 | item and gear `ShopScene.test.tsx:388` · message, empty body and network `:404` | - |
| craft-only gear in EQUIPAMENTOS (2) - verified at ca0706c (citations moved +13) | plan AC 23 | unowned `:423`-`:428` · owned `:435`-`:439` | - |
| phone widths (2) - carried from 89c44a5 (proof re-run at ca0706c) | plan AC 24 | 390 and 360 `web/e2e/forge.spec.ts:5` loop, both PASS | - |
| Landing doors (4) - carried from 89c44a5 | plan `Landing` | 1 `catalog_test.go:591`, `art.test.tsx:333` · 2 `catalog_test.go:647`, `forge_test.go:44`, `ShopScene.test.tsx:426` · 3 `forge_test.go:67`, `web/e2e/forge.spec.ts:32` · 4 `forge_test.go:385` | - |
| Observable "existing" landings (3) - carried from 89c44a5 | plan `Observable` | `web/src/components/GameShell.tsx:32`, `:37` · `web/src/components/AvatarScene.tsx:53-57` · `api/internal/player/player.go:401` | - |
| readers of `Gear.Price` (Impact) - carried from 89c44a5 | plan `Impact` | `shop.go:109-116` · `ShopScene.tsx:54` (`gearStatus`) · `TestCatalog_ServesShop` PASS at ca0706c | - |
| entities / stored data (0) - carried from 89c44a5 | plan `Relations` None, Impact "nothing to migrate" | none | - |
| startup config: catalog (1 shared assembly) - carried from 89c44a5 | assembly files | `api/cmd/api/main.go:43` · `api/internal/apptest/apptest.go:112` · `api/internal/catalog/catalog.go:345` | - |

Level, verified at ca0706c. C33 goes through `app.NewRouter` like C4-C18 do, because
`apptest.NewWithCatalog` builds the real router with an injected catalog. C32 is at the screen's
own layer (vitest), and its boundary is still C27/C28. There are no level gaps.

Swept, carried from 89c44a5. There are no `existing` rows.

Non-blocking precision note (checks artifact): the `checks.md` header still reads `31 checks in 4
slices`, but the file holds 33 checks (C32 and C33 are under `### Round 2`).

## Test policy rows

Verified at ca0706c for the two rows that were unmet in round 1 (both classify files the fix
touched). The other rows are carried from 89c44a5, because the files they classify are unchanged.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (api) - verified at ca0706c | `api/internal/shop/forge.go` (Forge handler), `api/internal/shop/shop.go:109` (BuyGear guard), `shop.equip` (reused) | Boundary: C4-C18 and C33 through `NewRouter`. The guards live in the handler, so the handler is its own layer. Its table is C6 plus C8-C13 and C33, and equip is C7 plus `TestHPBonus_EquipAndRemove` | yes - every decision row in `forge.go:18-53` now has an asserted case, including `:26` `unknown_gear` (`forge_test.go:404`) |
| Decides, reached across a boundary (web) - verified at ca0706c | `web/src/components/ShopScene.tsx` forge section (`forgeState`, `recipeStatus`, `recipeDetail`, craft-only `gearStatus`) | Boundary: C27, C28 (browser). Own layer: C19-C26 and C32 (vitest) | yes - each card status and each button label has an asserted case, and each of the 3 priority pairs of AC 19 and the owned-first priority of AC 17 has one too (`ShopScene.test.tsx:347`, `:358`, `:361`; F4, F6, F8, F9, F10 killed) |
| Decides, not reached across a boundary - carried from 89c44a5 | catalog referential rules (`catalog_test.go:664-699`) | own layer C3 | yes |
| Entry point that decides nothing - carried from 89c44a5 | `api/internal/app/router.go:88` | boundary: accepted C5, rejected C9-C15 and C33, error C17 | yes |
| Instrumentation, pass-throughs - carried from 89c44a5 | `catalog.go` Recipe types and lookup, `httpx/errors.go:55`, `:67-68`, `web/src/lib/types.ts`, `web/src/test/helpers.ts`, `globals.css` | none of its own; covered by C1, C2, C9, C18, C29, C33 | yes |

## Faults injected

Round 2 faults were verified at ca0706c, in a scratch worktree
`<scratchpad>/verify2` (`git worktree add --detach ... HEAD`). Each fault was reverted with
`git checkout -- <file>` inside the worktree, and the worktree was clean after each revert.

- The real tree's `git status --porcelain` matched the baseline before and after: only the
  pre-existing untracked `.claude/...` directories and `api/cmd/api/api`.
- `verify2` was then removed.
- Round 2 injected 7 mutants, which exceeds the cap of 5. F7b and F10 are extra discrimination runs
  on surfaces whose proofs had never been made to fail. Each of them forced a different proof or
  row to fail.
- F1, F2, F3 and F5 are carried from 89c44a5. Their target code (`forge.go`, `shop.go`,
  `forge.json`) and their killing tests are unchanged by the fix.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (carried from 89c44a5): materials checked before ownership | `api/internal/shop/forge.go:23-36` | yes - `TestForge_AlreadyOwned`, `TestForge_ValidationOrder` |
| F2 (carried from 89c44a5): material bound `<` -> `<=` | `api/internal/shop/forge.go:33` | yes - `TestForge_Boundaries` |
| F3 (carried from 89c44a5): unpriced gear returns `ErrUnknownGear` instead of `ErrNotForSale` | `api/internal/shop/shop.go:110` | yes - `TestBuyGear_NotForSale` |
| F5 (carried from 89c44a5): `corrupt_dep` -> `ghost_dep` in a recipe | `api/catalog/forge.json:5` | yes - `TestCatalog_RecipesReferenceCatalog` |
| F4 re-injected (round 1 target): button checks `!st.materials ? "FALTAM MATERIAIS"` before `st.owned ? "JÁ POSSUI"` | `web/src/components/ShopScene.tsx:247` | yes - `forge owned priority (owned, no materials, no balance)` × (1 failed, 1 passed) |
| F8: button gives owned priority only when affordable (`st.owned && st.afford ? "JÁ POSSUI"`) | `web/src/components/ShopScene.tsx:247` | yes - both `forge owned priority` rows × (row 2 needs the balance case) |
| F10: button checks balance before materials (`!st.afford ? insufficient(...) : "FALTAM MATERIAIS"`) | `web/src/components/ShopScene.tsx:247` | yes - `forge button (no material, no balance)` × |
| F6: card status gives owned priority only with materials (`st.owned && st.materials ? "JÁ POSSUI"`) | `web/src/components/ShopScene.tsx:63` (`recipeStatus`) | yes - `forge owned priority (owned, no materials, no balance)` × at the card assertion `:358` |
| F9: card status gives owned priority only when affordable (`st.owned && st.afford ? "JÁ POSSUI"`) | `web/src/components/ShopScene.tsx:63` (`recipeStatus`) | yes - both `forge owned priority` rows × |
| F7a: remove the `unknown_gear` guard (`gear, _ = h.Catalog.GearItem(...)`) | `api/internal/shop/forge.go:25-27` | yes - `TestForge_UnknownOutputGear` FAIL at `forge_test.go:404`: got 200 with `gear: [""]` and `equipment: {"": ""}` |
| F7b: `ErrUnknownGear` -> `ErrUnknownRecipe` (same 422) | `api/internal/shop/forge.go:26` | yes - `TestForge_UnknownOutputGear` FAIL at `forge_test.go:404`: got 422 `unknown_recipe`, want `unknown_gear` |

## Gate

Verified at ca0706c:

- `cd api && go test -count=1 -p 1 ./... -v` (TEST_DATABASE_URL = devserver_test): 229 top-level `--- PASS`, 0 `--- FAIL`, 11 packages `ok`, exit 0
- `cd web && npx vitest run`: 18 files, 435 passed, 0 failed
- scratch `<scratchpad>/verify2/web`: `npx tsc --noEmit` exit 0; `npx playwright test`: 104 passed, 0 failed
- `render.py --check` (3 icons): exit 0; `make art-check`: `art ok`, exit 0

No ranked gaps. The one open item is the non-blocking count in the `checks.md` header (31 -> 33).
