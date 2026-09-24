# Forge verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: a089239..89c44a5e99bd95813c2b3bffaaef8d347deeda69
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 31 checks were run at `89c44a5` and each named test ran and passed on its own line. The
verdict is FAIL because of one surviving mutant and the coverage and Test policy gaps it exposes.
AC 19 requires `JÁ POSSUI` to win over `FALTAM MATERIAIS` and over `COINS/GEMS INSUFICIENTES` on the
detail button, and AC 17 requires the same on the card. No proof has an owned gear that is also
missing materials or balance, so the owned-first priority can be reordered with every test still
green. One code branch has no proof and no Surface row: `forge.go:26` returns `422 unknown_gear`.

## Binding sources

None - profile `standard`, so step 1 does not run; the plan marks no binding interface source
(`docs/DevServer RPG.html` is cited only as having no forge, and the existing `ShopScene` as the
visual reference).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none - profile standard, step 1 does not run | n/a | - | - |

## Checks

Proof runs at `89c44a5` (real tree, read-only; e2e in a scratch worktree at the same sha):

- api: `cd api && go test -count=1 ./internal/shop ./internal/catalog -run '^(TestCatalog_ServesForge|TestCatalog_ServesForgeGear|TestCatalog_RecipesReferenceCatalog|TestBuyGear_NotForSale|TestForge_ItemRecipe|TestForge_EveryRecipe|TestForge_GearOwnsEquips|TestForge_Boundaries|TestForge_UnknownRecipe|TestForge_AlreadyOwned|TestForge_NotEnoughMaterials|TestForge_NotEnoughBalance|TestForge_ValidationOrder|TestForge_PlayerNotFound|TestForgeRoutes_RequireSession|TestForge_ConcurrentSerialize|TestForge_Failure|TestForge_ErrorCodes|TestCatalog_ServesShop|TestHPBonus_EquipAndRemove)$' -v`. Exit 0, all 20 tests printed as `--- PASS`, including the 6 `TestForge_EveryRecipe/<id>` subtests.
- web unit: `cd web && npx vitest run src/components/ShopScene.test.tsx src/lib/art.test.tsx -t "forge section|forge card status|forge detail|forge button|forge success|forge errors|forge pending|craft-only gear|web mock matches forge catalog|gear icons per shop.json|shows the three sections" --reporter=verbose`. Exit 0, 25 passed and 123 skipped. Each named test printed `✓`: 6 `forge card status (...)`, 6 `forge button (...)`, 2 `forge success (...)`, 3 `forge errors (...)`, 2 `craft-only gear...`.
- e2e: `cd <scratch>/verify/web && npx playwright test e2e/forge.spec.ts`. 3 passed: `forge on phone 390`, `forge on phone 360`, `forge round trip`. The fresh api (:8180) and Next (:3100) servers were started from the worktree; the only reused server was fakegithub on :9180.
- art: `python3 .claude/skills/pixel-assets/scripts/render.py --check <3 pngs> --category icon` printed `ok` 3 times and exited 0. `make art-check` printed `art ok` and exited 0 (the `ok` lines include the 3 `gear-*` icons).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `recipes` has 6 entries in order, every field matched by value, no `price` key when there is no cost | `TestCatalog_ServesForge` PASS | `api/internal/catalog/catalog_test.go:578` - `len(b.Recipes) != len(want)`; `:591` - `got != want[i]` (6 literal rows `id\|kind id\|ingredients\|price`); `:594` - `has != (r.Price != nil) \|\| (price == "-") == has` on the raw JSON key | PASS |
| C2 | 9 gear: 6 existing with their prices, then 3 craft-only with every field and no `price` key | `TestCatalog_ServesForgeGear` PASS | `api/internal/catalog/catalog_test.go:634` - `len(b.Gear) != len(want)` (9); `:647` - `if hasPrice` on the raw key for i >= 6; `:656` - `got != want[i]` (all 7 fields per craft-only gear, literal) | PASS |
| C3 | every recipe's kind is valid, its output exists, its items exist with qty >= 1, and all unpriced gear has a recipe | `TestCatalog_RecipesReferenceCatalog` PASS | `api/internal/catalog/catalog_test.go:673`/`:677` - `c.Item`/`c.GearItem(r.Output.ID)` `!ok`; `:681` - default kind; `:688` - `c.Item(in.Item)` `!ok`; `:691` - `in.Quantity < 1`; `:697` - `g.Price == nil && !made[g.ID]` | PASS |
| C4 | `teclado_race` returns 422 `not_for_sale` and changes nothing; `cafe` bought with 50 coins returns 200 | `TestBuyGear_NotForSale` PASS | `api/internal/shop/forge_test.go:44` - `f.unchanged(".../gear/teclado_race", 422, "not_for_sale")` (full-row snapshot: players, gear, equipment, items; `shop_test.go:102`); `:46` - `got.Coins != 0 \|\| !f.me().has("cafe")` via `f.do` (requires 200, `shop_test.go:76`) | PASS |
| C5 | `forja_cache` returns 200 with only a `player` key, no `null_shard`, `sp_potion` 3, coins 100, gems 0, stored qty 0 | `TestForge_ItemRecipe` PASS | `api/internal/shop/forge_test.go:67` - `!ok \|\| len(body) != 1`; `:72` - `it.Item == "null_shard"` errors; `:76` - `qty("sp_potion") != 3 \|\| Coins != 100 \|\| Gems != 0`; `:81` - `sum(quantity) ... n != 0` | PASS |
| C6 | table over all 6 recipes: each material goes to 0, coins go to 0 (or stay the same), gems stay the same, and the output is +1 item or the gear is owned and equipped | `TestForge_EveryRecipe` + 6 subtests PASS | `api/internal/shop/forge_test.go:89` - `len(cat.Recipes) != 6`; `:106` - `q != 0`; `:114` - `Coins != wantCoins \|\| Gems != 7`; `:119` - `q != 1`; `:124` - `!got.has(g.ID)`; `:127` - `*e != g.ID` | PASS |
| C7 | hoodie replaces moletom: hpMax +21 and hp +21; teclado replaces fone with the same hpMax; caneca fills the empty bebida slot | `TestForge_GearOwnsEquips` PASS | `api/internal/shop/forge_test.go:146` - `!has("moletom") \|\| !has("hoodie_trace")`; `:149` - `*e != "hoodie_trace"`; `:152` - `HPMax != before.HPMax+21 \|\| HP != before.HP+21`; `:161`/`:164` - acessorio `teclado_race`, HP same; `:170` - bebida `caneca_log` | PASS |
| C8 | 1 shard returns 409 materials, 2 return 200 and leave 0; 19 coins return 409 coins, 20 return 200 and leave 0 | `TestForge_Boundaries` PASS | `api/internal/shop/forge_test.go:180` - `unchanged(..., 409, "not_enough_materials")`; `:182` - `qty("null_shard") != 0`; `:188` - `unchanged(..., 409, "not_enough_coins")`; `:190` - `Coins != 0 \|\| qty("boost_deploy") != 1` | PASS |
| C9 | `nada` and `sp_potion` return 422 `unknown_recipe` with `receita desconhecida` and change nothing | `TestForge_UnknownRecipe` PASS | `api/internal/shop/forge_test.go:202` - `f.status(rec, 422, "unknown_recipe")`; `:203` - `msg != "receita desconhecida"`; `:206` - `after != before` | PASS |
| C10 | owned gear returns 409 `already_owned` without materials, and again with materials and 150 coins, with nothing changed | `TestForge_AlreadyOwned` PASS | `api/internal/shop/forge_test.go:217` and `:220` - `f.unchanged("/api/me/forge/forja_teclado", 409, "already_owned")` | PASS |
| C11 | missing `memory_crystal` returns 409 `materiais insuficientes`; the other materials stay and no gear is added | `TestForge_NotEnoughMaterials` PASS | `api/internal/shop/forge_test.go:230` - `status(rec, 409, "not_enough_materials")`; `:231` - `msg != "materiais insuficientes"`; `:234` - snapshot equal; `:237` - `qty("race_core") != 2 \|\| qty("wild_trace") != 3 \|\| has("teclado_race")` | PASS |
| C12 | gems price: 4 gems return 409 gems, 5 return 200 and leave 0; embedded catalog with 19 coins returns 409 coins and leaves the inventory as it was | `TestForge_NotEnoughBalance` PASS | `api/internal/shop/forge_test.go:247` - test catalog `Price{gems,5}`; `:254` - `unchanged(..., 409, "not_enough_gems")`; `:256` - `Gems != 0 \|\| Coins != 1000`; `:263` - `unchanged(..., 409, "not_enough_coins")`; `:264` - inventory 1/1/0 | PASS |
| C13 | validation order, one case per pair | `TestForge_ValidationOrder` PASS | `api/internal/shop/forge_test.go:281` - `rec.Code != tc.status \|\| ErrorCode != tc.code` over `{nada 422 unknown_recipe}`, `{forja_cache 404 player_not_found}` on a no-dev session; `:287` - `already_owned` with no materials; `:288` - `not_enough_materials` with 0 coins | PASS |
| C14 | session with no dev returns 404 `player_not_found` | `TestForge_PlayerNotFound` PASS | `api/internal/shop/forge_test.go:295` - `rec.Code != 404 \|\| ErrorCode != "player_not_found"` | PASS |
| C15 | no session returns 401 `unauthenticated` | `TestForgeRoutes_RequireSession` PASS | `api/internal/shop/forge_test.go:304` - `rec.Code != 401 \|\| ErrorCode != "unauthenticated"` | PASS |
| C16 | two concurrent forges give one 200 and one 409 materials; `sp_potion` +1 and shards 0 | `TestForge_ConcurrentSerialize` PASS | `api/internal/shop/forge_test.go:332` - `oks != 1 \|\| conflicts != 1` (conflict = `409 && not_enough_materials`, `:328`); `:336` - `qty("sp_potion") != 1 \|\| qty("null_shard") != 0` | PASS |
| C17 | a missing table and a gear-insert constraint both return 500 `internal` with the `request_id` logged, and nothing is consumed | `TestForge_Failure` PASS | `api/internal/shop/forge_test.go:348` - `rec.Code != 500 \|\| ErrorCode != "internal"`; `:352` - `Logs contains "request_id":"<id>"`; `:361` and `:368` - `after != before` snapshot | PASS |
| C18 | the new codes use the `{"error":{"code","message"}}` envelope | `TestForge_ErrorCodes` PASS | `api/internal/shop/forge_test.go:385` - `rec.Code != tc.status \|\| len(body) != 1 \|\| len(body["error"]) != 2 \|\| code != tc.code \|\| message != tc.message` over 422 `receita desconhecida` and 409 `materiais insuficientes` | PASS |
| C19 | FORJA follows SKINS; 6 cards in order; item/gear art | `forge section` ✓ | `web/src/components/ShopScene.test.tsx:278` - `compareDocumentPosition(forge) & DOCUMENT_POSITION_FOLLOWING`; `:280` - `cardNames("FORJA")).toEqual([6 names])`; `:293` - `img.getAttribute("src")).toBe(src)` over 6 literal paths | PASS |
| C20 | card status, one case per row | `forge card status (...)` x6 ✓ | `web/src/components/ShopScene.test.tsx:306` - `.shop-status).toHaveTextContent(^JÁ POSSUI$ / ^PRONTO$ / ^FALTAM MATERIAIS$)` per row; `:312` - all 6 `^FALTAM MATERIAIS$` for a new dev. Precision gap: the owned case always has materials (see Coverage) | PASS |
| C21 | teclado detail with rarity, name, description, bonus, 3 material lines in order and `custo: 150 COINS`; cache detail with no cost or bonus line and `FRAGMENTO NULL 0/2` | `forge detail` ✓ | `web/src/components/ShopScene.test.tsx:319` - `getByText("LENDÁRIO")`; `:322` - `"bônus: +12% de dano"`; `:324` - `lines).toEqual(["NÚCLEO DE CONCORRÊNCIA 1/2","CRISTAL DE MEMÓRIA 0/1","STACK TRACE SELVAGEM 3/3"])`; `:325` - `"custo: 150 COINS"`; `:331` - `["FRAGMENTO NULL 0/2"]`; `:332`/`:333` - `not.toContain("custo:")`/`("bônus:")` | PASS |
| C22 | detail button, one case per listed row | `forge button (...)` x6 ✓ | `web/src/components/ShopScene.test.tsx:347` - `buttons.map(textContent)).toEqual([label])`; `:348`/`:349` - `toBeEnabled()`/`toBeDisabled()`; `:360` - `detailButton("GEMS INSUFICIENTES")).toBeDisabled()`. Claim as written is proven. Precision gap: AC 19's priority order is not covered, and fault F4 survived (see Faults) | PASS |
| C23 | FORJAR / FORJAR E EQUIPAR call the route, send the player to `setPlayer`, and show the toast | `forge success (...)` x2 ✓ | `web/src/components/ShopScene.test.tsx:375` - `findByRole("status")).toHaveTextContent(^\+1 POÇÃO DE CACHE$ / ^ITEM FORJADO E EQUIPADO$)`; `:376` - `f.calls("POST /api/me/forge/<id>")).toBe(1)`; `:378` - `setPlayer).toHaveBeenCalledWith(updated)` | PASS |
| C24 | 409 message, empty 500, and network failure; `setPlayer` not called | `forge errors (...)` x3 ✓ | `web/src/components/ShopScene.test.tsx:391` - `toHaveTextContent("materiais insuficientes" / "falha na conexão. tente de novo.")` (= `CONNECTION_FAILED`, `web/src/lib/gear.ts:60`); `:392` - `setPlayer).not.toHaveBeenCalled()` | PASS |
| C25 | pending: button disabled and no second fetch | `forge pending` ✓ | `web/src/components/ShopScene.test.tsx:401` - `detailButton("FORJAR")).toBeDisabled()`; `:403` - `f.fn).toHaveBeenCalledTimes(1)` after a second click | PASS |
| C26 | unowned craft-only gear shows `FORJA` / `custo: só na forja` / disabled `SÓ NA FORJA` and no fetch; owned shows `NO INVENTÁRIO` and `EQUIPAR` calls the equip route | `craft-only gear`, `craft-only gear (owned)` ✓ | `web/src/components/ShopScene.test.tsx:410` - `^FORJA$`; `:412` - `"custo: só na forja"`; `:413` - `SÓ NA FORJA).toBeDisabled()`; `:415` - `f.fn).not.toHaveBeenCalled()`; `:422` - `^NO INVENTÁRIO$`; `:426` - `f.calls("POST /api/me/gear/teclado_race/equip")).toBe(1)` | PASS |
| C27 | at 390 and 360: same x and width as SKINS, placed below it, inside the viewport, no horizontal scroll | `forge on phone 390`, `forge on phone 360` ✓ | `web/e2e/forge.spec.ts:14` - `forge.x).toBeCloseTo(skins.x, 0)`; `:15` - `width toBeCloseTo`; `:16` - `forge.y >= skins.y + skins.height`; `:17`/`:18` - `x >= 0`, `x + width <= width + 0.5`; `:20` - `scrollWidth <= clientWidth` | PASS |
| C28 | browser round trip through `/api`: `FALTAM MATERIAIS` shown, then 409 `not_enough_materials` | `forge round trip` ✓ | `web/e2e/forge.spec.ts:30` - `[data-recipe="forja_cache"] .shop-status).toHaveText("FALTAM MATERIAIS")`; `:32` - `res.status()).toBe(409)`; `:33` - `error.code).toBe("not_enough_materials")` | PASS |
| C29 | web mock copies the recipes and the 3 gears by value | `web mock matches forge catalog` ✓ | `web/src/lib/art.test.tsx:333` - `RECIPES).toEqual(forge.recipes)`; `:335` - unpriced ids `["caneca_log","hoodie_trace","teclado_race"]`; `:336` - `GEAR.filter(!price)).toEqual(full)` | PASS |
| C30 | the 3 icons exist at 16x16, covered by the shop.json table | `gear icons per shop.json, 16x16` ✓ | `web/src/lib/art.test.tsx:101` - `expectAssets(icons(shop.gear.map(g => "gear-"+g.id)))`; `:55`-`:57` - `existsSync(spec/png)).toBe(true)`, `pngSize(png)).toEqual(size)`. This test predates the feature but is table-driven over `shop.json`, which the feature changed, so it covers the 3 new ids | PASS |
| C31 | the style checker finds 0 errors, and rendering the specs reproduces the PNGs byte for byte | `render.py --check ... --category icon` exit 0; `make art-check` exit 0 | `Makefile:32` - `render.py web/art --out "$tmp"`; `Makefile:33` - `diff -r "$tmp" web/public/art && echo "art ok"`; output `ok web/public/art/icon/gear-{caneca_log,hoodie_trace,teclado_race}.png` | PASS |

## Coverage

Each set was recomputed from the source that has authority over it, not read back from checks.md.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/me/forge/{recipe}` statuses (9) | plan `Surface` row 1 | 200 `forge_test.go:67` (C5), `:104` (C6) · 401 `:304` · 404 `:295` · 409 already_owned `:217` · 409 not_enough_materials `:230` · 409 not_enough_coins `:188`, `:263` · 409 not_enough_gems `:254` · 422 unknown_recipe `:202` · 500 `:348` | - |
| forge handler branches (9) | code `api/internal/shop/forge.go:18-53` | unknown recipe `:20` C9 · output gear missing from catalog `:26` **none** · owned `:29` C10 · material short `:33` C8/C11 · price nil/non-nil `:37` C5/C8 · Pay coins/gems C8/C12 · item output `:47` C5/C6 · gear insert `:50` C6/C17 · equip `:53` C7 | `forge.go:26` returns `422 unknown_gear`. It has no proof, and the plan's Surface does not list that status for this route. C3 makes it unreachable with the embedded catalog, but `apptest.NewWithCatalog` could reach it |
| `POST /api/me/shop/gear/{id}` changed statuses (1) + unchanged 200 | plan `Surface` row 2 | 422 not_for_sale `forge_test.go:44` · 200 for a priced gear `:46` | - |
| `GET /api/catalog` changes (2) + statuses (200, 304) | plan `Surface` row 3 | `recipes` C1 `catalog_test.go:591` · `gear[].price` optional C2 `:647` · 304 unchanged `TestCatalog_ETag` `catalog_test.go:64` (PASS in the gate run) | - |
| recipes (6) | `api/catalog/forge.json` | C1 literal rows `catalog_test.go:591` · C6 subtests `forja_cache`, `forja_memoria`, `forja_acelerador`, `forja_caneca`, `forja_hoodie`, `forja_teclado` all PASS | - |
| craft-only gear (3) | `api/catalog/shop.json` (unpriced entries) | C2 `catalog_test.go:656` · C6 subtests caneca/hoodie/teclado · C29 `art.test.tsx:336` · C30 `art.test.tsx:101` | - |
| output kinds (2) | `forge.go:47`, plan door 1 | item `forge_test.go:119` · gear `:124`, `:127`, `:149` | - |
| price presence (2) / currency (2) | `forge.go:37`, `player.Pay` | none: `forge_test.go:76` (coins 100 unchanged) · coins `:188`/`:190` · gems `:254`/`:256` | - |
| material / balance boundaries (2+2) | plan AC 9, 12, 13 | material 1 -> 409 `:180`, 2 -> 200 `:182` · coins 19 -> 409 `:188`, 20 -> 200 `:190` | - |
| validation order (4 pairs) | plan Assumptions "Ordem das validações" | unknown before no-dev `forge_test.go:281` · no-dev -> 404 `:281` (a player that does not exist cannot own gear, so this pair holds by construction) · owned before materials `:287` · materials before balance `:288` | - |
| nothing consumed on failure (5) | plan Assumptions "Falha não consome nada" | already_owned `:220` · materials `:234` · balance `:254`, `:263` · db before `:361` · db after materials `:368` | - |
| equip on forge (3) | plan AC 7 + `shop.equip` | hp gear replaced `:152` · non-hp gear replaced `:164` · empty slot `:170` | - |
| catalog integrity rules (5) | plan AC 3 | kind `catalog_test.go:681` · output exists `:673`/`:677` · item exists `:688` (fault F5 killed) · qty >= 1 `:691` · unpriced gear has a recipe `:697` | - |
| new error codes (2) | plan Landing door 4, `httpx/errors.go:67-68` | `forge_test.go:385` over both | - |
| card status (3 labels + owned-first priority) | plan AC 17 + `ShopScene.tsx:63` | JÁ POSSUI / PRONTO / FALTAM `ShopScene.test.tsx:306`, `:312` · owned gear with materials missing -> JÁ POSSUI **none** | owned gear with materials missing (AC 17 says `JÁ POSSUI` for any owned gear; the only owned case, `ShopScene.test.tsx:300`, has all materials) |
| detail button (6 labels + 3 priority pairs) | plan AC 19 "nessa ordem de prioridade" + `ShopScene.tsx:245-247` | 6 labels `ShopScene.test.tsx:347`, `:360` · materials before balance `:347` ("no material, no balance") · owned before materials **none** · owned before balance **none** | owned + missing materials -> `JÁ POSSUI`; owned + short balance -> `JÁ POSSUI` (fault F4 survived) |
| detail lines (4) | plan AC 18 | `ShopScene.test.tsx:319`-`:333` | - |
| action outcomes (5) | plan AC 20, 21 | `ShopScene.test.tsx:375` (item, gear) · `:391` (message, empty body, network) | - |
| craft-only gear in EQUIPAMENTOS (2) | plan AC 23 | unowned `:410`-`:415` · owned `:422`-`:426` | - |
| phone widths (2) | plan AC 24 / checks C27 | 390, 360 `web/e2e/forge.spec.ts:5` loop, both PASS | - |
| Landing doors (4) | plan `Landing` | 1 `catalog_test.go:591`, `art.test.tsx:333` · 2 `catalog_test.go:647`, `forge_test.go:44`, `ShopScene.test.tsx:413`, web type `web/src/lib/types.ts:98` · 3 `forge_test.go:67`, `web/e2e/forge.spec.ts:32` · 4 `forge_test.go:385` | - |
| Observable "existing" landings (3) | plan `Observable` | loading/unauthorised: `web/src/components/GameShell.tsx:32` (401 -> unauthenticated), `:37` (ready only with player + catalog) · `/avatar`: `web/src/components/AvatarScene.tsx:53-57` lists `player.gear` without reading `price`; `api/internal/player/player.go:401` Bonus reads `GearItem` without price | - |
| readers of `Gear.Price` (Impact) | plan `Impact` + `rg "\.price\b"` / `rg "\.Price\b"` | `shop.go:109-116` C4 · `ShopScene.tsx:54`, `:206-207`, `:220` C26 · `TestCatalog_ServesShop` `catalog_test.go:343` PASS; no other gear-price reader in web or api (`tsc --noEmit` exit 0) | - |
| entities / stored data (0) | plan `Relations` None, Impact "nothing to migrate" | none | - |
| startup config: catalog (1 shared assembly) | assembly files | `api/cmd/api/main.go:43` `cat, err := catalog.Load()` · `api/internal/apptest/apptest.go:112` `cat, err := catalog.Load()` · both read `forge.json` at `api/internal/catalog/catalog.go:345` | - |

Level: every claim about a status, route or response goes through `app.NewRouter` (`apptest.Env.Do`),
and the route is registered at `api/internal/app/router.go:88`. C3 is the catalog's own layer. The
browser boundary (the layout and the `/api` rewrite) is exercised in C27 and C28. No level gaps.

Swept: there are no `existing` rows. Every Swept row cites a check or is `n/a`, which is approved
policy. The one "existing" proof named under Test policy is `TestHPBonus_EquipAndRemove`, which ran
and passed.

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (api) | `api/internal/shop/forge.go` (Forge handler), `api/internal/shop/shop.go:109` (BuyGear guard), `shop.equip` (reused) | boundary C4-C18 via `NewRouter`. The guards live in the handler, so the handler is its own layer; the one-case-per-row table is C6 plus C8-C13; equip is C7 plus `TestHPBonus_EquipAndRemove` | not met - the `forge.go:26` `unknown_gear` row has no asserted case; every other decision row has one |
| Decides, reached across a boundary (web) | `web/src/components/ShopScene.tsx` forge section (`forgeState`, `recipeStatus`, `recipeDetail`, craft-only `gearStatus` and label) | boundary C27, C28 (browser) · own layer C19-C26 (vitest) | not met - the label priority table (AC 17, AC 19) has no row for an owned gear that also lacks materials or balance; fault F4 survived |
| Decides, not reached across a boundary | catalog referential rules (C3, enforced by `catalog_test.go:664-699`) | own layer C3 | yes - each rule has an assertion over every recipe; F5 shows the item-exists rule rejects a bad catalog |
| Entry point that decides nothing | route registration `api/internal/app/router.go:88` | boundary: accepted C5, rejected C9-C15, error C17 | yes |
| Instrumentation, pass-throughs | `catalog.go` Recipe/RecipeOutput types, `Load` for `forge.json`, `Catalog.Recipe` lookup, `httpx/errors.go:67-68`, `web/src/lib/types.ts`, `web/src/test/helpers.ts`, `globals.css` | none of its own; its consumers cover it (C1, C2, C9, C18, C29) | yes |

## Faults injected

All mutations were made only in the scratch worktree `<scratchpad>/verify` at `89c44a5` and reverted
with `git checkout -- <file>` inside that worktree. The real tree's `git status --porcelain` matched
the baseline before and after.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: check materials before ownership (move the `for ... ErrNotEnoughMaterials` loop above the `p.Owns` guard) | `api/internal/shop/forge.go:23-36` | yes - `TestForge_AlreadyOwned` (`forge_test.go:217`) and `TestForge_ValidationOrder` (`:287`) FAIL: got `not_enough_materials` |
| F2: material bound `<` -> `<=` | `api/internal/shop/forge.go:33` | yes - `TestForge_Boundaries` FAIL at `forge_test.go:182` (exactly 2 shards got 409) |
| F3: unpriced gear returns `ErrUnknownGear` instead of `ErrNotForSale` (same 422) | `api/internal/shop/shop.go:110` | yes - `TestBuyGear_NotForSale` FAIL at `forge_test.go:44` (code `unknown_gear`) |
| F4: button priority swapped so that `!st.materials ? "FALTAM MATERIAIS"` is checked before `st.owned ? "JÁ POSSUI"` | `web/src/components/ShopScene.tsx:247` | no - survived; the whole of `ShopScene.test.tsx` passed 48/48 |
| F5: `forja_acelerador` ingredient `corrupt_dep` -> `ghost_dep` | `api/catalog/forge.json:5` | yes - `TestCatalog_RecipesReferenceCatalog` FAIL at `catalog_test.go:688` |

## Gate

- `cd api && go test -count=1 -p 1 ./...` (TEST_DATABASE_URL = devserver_test): 228 top-level tests passed, 0 failed, 11 packages ok, exit 0
- `cd web && npx vitest run`: 18 files, 433 passed, 0 failed
- scratch `<scratchpad>/verify/web`: `npx tsc --noEmit` exit 0; `npx playwright test`: 104 passed, 0 failed
- `make art-check`: `art ok`, exit 0

The gate is green, but the verdict is still FAIL because of F4 (survived), the two unmet Test policy
rows, and the unproven Coverage members above.

Ranked gaps:

1. Fault F4 survived (C22, AC 19): no detail-button case has an owned gear that also lacks
   materials or balance, so the "JÁ POSSUI first" priority can be reordered without failing a
   test. See `web/src/components/ShopScene.tsx:247` and `web/src/components/ShopScene.test.tsx:340-350`.
2. Card status coverage gap (C20, AC 17): the only owned-gear case has all materials
   (`web/src/components/ShopScene.test.tsx:300`). No test covers an owned gear without
   materials showing `JÁ POSSUI`.
3. Unproven code branch: `api/internal/shop/forge.go:26` returns `422 unknown_gear` for a recipe
   whose gear output is not in the catalog. It has no proof and no row in the plan's Surface.
   C3 guards the embedded catalog, so either prove the branch with `apptest.NewWithCatalog` or
   record it in the Surface.
