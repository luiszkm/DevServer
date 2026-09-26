# Assets apply verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 4c49322..a240ebd (fix range 83cc1ce..a240ebd)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 re-judged the fix diff (`a240ebd`, test-only: `catalog_test.go`, `AvatarScene.test.tsx`, `ShopScene.test.tsx`, `WorldScene.test.tsx`) and every verdict from round 1 that was not PASS: C12, C13, the button-icon and generic-icon coverage members, the `ActionLabel` Test policy row, and the C1 glyph precision gap. Everything else is carried from `c7449e8` and marked that way. All proofs were re-run in full at `a240ebd`. All 27 checks are proven. All 5 new faults were killed.

## Binding sources

Carried from `c7449e8`. Step 1 is owed only under `ui`. The fix is test-only and changes no interface, so step 1 was not re-run.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/assets/checks.md` door 1 list (lines 8-22) | yes - carried from `c7449e8`; 101 names, and `LIBRARY` in `web/src/lib/art.test.tsx:465-484` matches it name for name | none | - |

## Checks

Rows C12, C13 and C1 were verified at `a240ebd`. C14, C15 and C21 have refreshed citations because their files were touched. The rest are carried from `c7449e8`: their files were untouched, and their proofs were re-run green at `a240ebd`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog serves 9 enemies with unique ids, in order, with their stats (glyphs of the 3 new ones now asserted) | verified at `a240ebd` - `go test ./... -count=1 -v` - `--- PASS: TestCatalog_ServesCombat` | `api/internal/catalog/catalog_test.go:229` - `len(b.Enemies) != 9`; `:234` - `if want, ok := glyphs[e.ID]; ok && e.Glyph != want` with `glyphs` = `slime (o.o)`, `slime_verde (-.-)`, `monstro {>_<}` (`:232`); `:240` - `if ids[e.ID]` (repeat); `:244` - `got != enemies[i]` over `id\|region\|name\|level\|hp\|sp\|weakness\|drop` (table `:218-227`). The round 1 precision gap is closed, and fault M5 was killed | PASS |
| C2 | start in vila/floresta/caverna draws `Rand.IntN(2)` in catalog order | carried from `c7449e8`; re-run at `a240ebd` - `--- PASS: TestStart_PicksEnemyByRand` | `api/internal/battle/battle_test.go:988` - `b.Enemy != tc.enemy \|\| b.EnemyHP != tc.hp \|\| b.EnemyHPMax != tc.hp` over 6 rows (`:980-982`) | PASS |
| C3 | single-enemy region consumes no draw | carried from `c7449e8`; re-run - `--- PASS: TestStart_SingleEnemyNoDraw` | `api/internal/battle/battle_test.go:999` - `b.Enemy != "mercado" \|\| b.EnemyHP != 85` with `Push(1)` (`:998`) | PASS |
| C4 | an active battle resumes with the same enemy | carried from `c7449e8`; re-run - `--- PASS: TestStart_ResumesSameEnemy` | `api/internal/battle/battle_test.go:1009` - `first.Enemy != "slime"`; `:1014` - `*again != *first` | PASS |
| C5 | the turn uses the stored enemy for the drop | carried from `c7449e8`; re-run - `--- PASS: TestVictory_DropsFromStoredEnemy` | `api/internal/battle/battle_test.go:1036` - `quantity(got, "log_essence") != 1 \|\| quantity(got, "null_shard") != 0`; `:1041` - `e.Type == "drop" && e.Item == "log_essence"` | PASS |
| C6 | migration 10 backfills `enemy = region`; enemy is NOT NULL | carried from `c7449e8`; re-run - `--- PASS: TestMigration_BattleEnemyBackfill` | `api/internal/battle/battle_test.go:1092` - `enemy != "floresta"`; `:1096` - `strings.Contains(err.Error(), "23502")` | PASS |
| C7 | all 4 battle routes carry `battle.enemy` | carried from `c7449e8`; re-run - `--- PASS: TestRoutes_BattleCarriesEnemy` | `api/internal/battle/battle_test.go:1116` - `got.Battle.Enemy != "slime"` over start/get/commands/items (`:1106-1111`) | PASS |
| C8 | Bug Fight shows the enemy by `battle.enemy` | carried from `c7449e8`; named vitest run - `✓ BattleScene enemy by id > enemy by id: slime in vila` | `web/src/components/BattleScene.test.tsx:553` - `toHaveTextContent("SLIME DE CACHE")`; `:554` - `"fraqueza: cache invalidado"`; `:557` - src `"/art/sprite/enemy-slime.png"`; `:558` - alt `"SLIME DE CACHE"`; `:559` - width `"128"` | PASS |
| C9 | spec and PNG for every `enemy-<id>`; the 3 new ones are 32x32 | carried from `c7449e8`; named run - `✓ catalog art on disk > enemy sprites per combat.json enemies` | `web/src/lib/art.test.tsx:87` - `size: ENEMY_SIZE[e.id] ?? [32, 32]`; `:56-58` - `existsSync(spec)`, `existsSync(png)`, `pngSize(png) toEqual(size)` | PASS |
| C10 | `.panel-wood` and `.bar` border images in the browser | carried from `c7449e8`; playwright re-run - `✓ 18 assets.spec.ts:76:5 › wood and bar chrome` | `web/e2e/assets.spec.ts:82` - `wood.source toContain("/art/ui/ui-panel-wood.png")`; `:83` - `wood.slice toBe("8 fill")`; `:90` - `toContain("/art/ui/ui-bar.png")` | PASS |
| C11 | the 6 scene headers carry `panel-wood` | carried from `c7449e8`; named run - `✓ ... wood header` ×6 | `toHaveClass("panel-wood")` at `web/src/components/DeployScene.test.tsx:509`, `BattleScene.test.tsx:578`, `SkillsScene.test.tsx:215`, `ShopScene.test.tsx:540`, `OfficeScene.test.tsx:387`, `AvatarScene.test.tsx:496` (lines unchanged by the fix) | PASS |
| C12 | button icons 16px, `alt=""`, first child, accessible name kept, on the 10 named sites | verified at `a240ebd` - named vitest run, every test `✓`: `button icon on INICIAR DEPLOY...`, `...VIAJAR ATÉ AQUI`, `...COMPRAR, COMPRAR E EQUIPAR, COMPRAR E USAR`, `...FORJAR`, `...FORJAR E EQUIPAR`, `button icon absent on EQUIPAR, EQUIPADO and a price shortfall`, `...NOVO ENCONTRO`, `...VISUAL tab`, `button icon: rank before LEVEL` | Shop helper `web/src/components/ShopScene.test.tsx:531-533` - `el.firstChild toBe(img)`, alt `""`, width `"16"`. `:547`, `:549`, `:552` - `firstIcon(detailButton("COMPRAR"/"COMPRAR E EQUIPAR"/"COMPRAR E USAR")) toBe("/art/icon/btn-shop.png")`, where `detailButton` = `getByRole("button", { name })` (`:22`). `:558-559` - `getByRole("button", { name: "FORJAR" })` (now exact), `toBe("/art/icon/btn-build.png")`. **`:566`** - `firstIcon(getByRole("button", { name: "FORJAR E EQUIPAR" })) toBe("/art/icon/btn-build.png")` (recipe `forja_caneca`, gear output). `web/src/components/WorldScene.test.tsx:237` - `expectFirstIcon(..., "/art/icon/btn-start.png")` (helper `:226-230`); **`:238`** - `toHaveAccessibleName("VIAJAR ATÉ AQUI")`. `web/src/components/AvatarScene.test.tsx:504-507` - src `btn-settings.png`, alt `""`, **`:506` width `"16"`**, `visual.firstChild toBe(img)`, with the name through `getByRole("tab", { name })` (`:21`). Carried: `DeployScene.test.tsx:516-517` (`findByRole("button", { name: "INICIAR DEPLOY" })`, `expectFirstIcon`), `BattleScene.test.tsx:585` (`NOVO ENCONTRO`, `btn-play.png`), `Hud.test.tsx:154-157` (`btn-rank.png`, alt `""`, width `"16"`, `title.firstChild toBe(img)`). The three round 1 gaps are closed, and faults M1-M3 were killed | PASS |
| C13 | generic icons 16px, `alt=""`, first child, at the 9 icons' sites; crown only on CHEFE/ENDGAME | verified at `a240ebd` - named run: `✓ generic icon on tree FRONTEND/BACKEND/INFRA`, `✓ ...CONFIGURAÇÃO slot`, `✓ ...panel title`, `✓ ...log header and the RESOLVIDO seal`, `✓ ...RACK title`, `✓ crown on tag of torre/nuvem = true`, `✓ vila/floresta/mercado/caverna = false` | `web/src/components/AvatarScene.test.tsx:515` - src `"/art/icon/ic-gear.png"`; **`:516` - `getAttribute("alt") toBe("")`**; `:517` - width `"16"`; `:518` - `label.firstChild toBe(img)`. `web/src/components/WorldScene.test.tsx:248` - `expectFirstIcon(chip, "/art/icon/ic-crown.png")`; `:249` - `chip.querySelector("img") toBeNull()` for the 4 other tags. Carried: `expectFirstIcon` at `SkillsScene.test.tsx:222`, `DeployScene.test.tsx:518`, `BattleScene.test.tsx:593,595`, `ServerScene.test.tsx:356`. The round 1 gap is closed, and fault M4 was killed | PASS |
| C14 | LOJA rarity medals over the 5 rarities | carried from `c7449e8` (citations refreshed at `a240ebd`); named run - `✓ rarity medal (cafe/fone/macbook/monitor/default)` | `web/src/components/ShopScene.test.tsx:587` - ``firstIcon(chip) toBe(`/art/icon/${medal}.png`)`` (alt, width 16, `firstChild` at `:531-533`); `:588` - `chip.querySelector("img") toBeNull()` for PADRÃO; rows `:581-582` | PASS |
| C15 | AVATAR rarity shows the same medal | carried from `c7449e8` (citations refreshed); named run - `✓ rarity medal (EQUIP cafe/macbook/monitor, SKINS default)` | `web/src/components/AvatarScene.test.tsx:531` - ``src toBe(`/art/icon/${medal}.png`)``; `:532` - `rarity.firstChild toBe(img)`; `:533` - `toBeNull()` for PADRÃO | PASS |
| C16 | every prop, build (not flag), extra (not bau/bau-aberto), tile and decal is reached from a background | carried from `c7449e8`; named run - `✓ library consumers > scene pieces are reached from the backgrounds` | `web/src/lib/art.test.tsx:539` - `pieces.length toBe(15 + 6 + 5 + 5 + 12)`; `:540` - `expect.soft(reached.has(n), n).toBe(true)` | PASS |
| C17 | OFFICE PAREDE/PISO tiled at 64px, repeat | carried from `c7449e8`; named run `✓ OfficeScene applied assets > tiled zones`; playwright `✓ 19 assets.spec.ts:94:5 › tiled office zones` | `web/src/components/OfficeScene.test.tsx:394` - `url(/art/tile/tile-parede-madeira.png)`; `:395` - `url(/art/tile/tile-tabua.png)`; `web/e2e/assets.spec.ts:100` - `toEqual({ size: "64px 64px", repeat: "repeat" })` | PASS |
| C18 | `make art-check` exits 0 with `art ok` | re-run at `a240ebd` - exit 0, last line `art ok`, 214 WARN, 0 ERROR | `Makefile:33` - `diff -r "$$tmp" web/public/art && echo "art ok"` | PASS |
| C19 | dust on the hero during `lunge`, none on `cast` | carried from `c7449e8`; named run - `✓ dust on the lunge beat`, `✓ dust never on a cast beat` | `web/src/components/BattleScene.test.tsx:415` - `not.toBeNull()`; `:416` - `toBe("url(/art/fx/dust.png)")`; `:421` - `toBeNull()` | PASS |
| C20 | sparkle on the node unlocked with 200, none on 409 | carried from `c7449e8`; named run - `✓ sparkle on the node unlocked with 200`, `✓ sparkle never on a 409` | `web/src/components/SkillsScene.test.tsx:235` - `toBe("url(/art/fx/sparkle.png)")`; `:236` - `toHaveLength(1)`; `:244` - `toBeNull()` | PASS |
| C21 | exactly one `span.fx-fire`, `aria-hidden`, fire.png | carried from `c7449e8` (citations refreshed); named run - `✓ WorldScene campfire > campfire strip over the map fire` | `web/src/components/WorldScene.test.tsx:258` - `fires toHaveLength(1)`; `:260` - `aria-hidden toBe("true")`; `:261` - `toBe("url(/art/fx/fire.png)")` | PASS |
| C22 | `.fx-fire` loops infinite; reduced motion → no animation | carried from `c7449e8`; playwright re-run - `✓ 20 assets.spec.ts:104:5 › fire loops` | `web/e2e/assets.spec.ts:110` - `count toBe("infinite")`; `:112` - `name toBe("none")` | PASS |
| C23 | the 101 door-1 assets each have a consumer; orphans = 0 | carried from `c7449e8`; named run - `✓ library consumers > no orphan in the library` | `web/src/lib/art.test.tsx:550` - `names.length toBe(101)`; `:551` - `orphans(names, sources, reached) toEqual([])` | PASS |
| C24 | orphan detector flags an unreferenced asset | carried from `c7449e8`; named run - `✓ orphan detector flags what nothing references` | `web/src/lib/art.test.tsx:557` - `toEqual(["prop-x"])`; `:558` - still `["prop-x"]` with an unrelated id | PASS |
| C25 | the Go battle and catalog suites pass | re-run at `a240ebd` - `go test ./... -count=1 -v`: every package `ok`, 303 `--- PASS`, 0 `--- FAIL` | `api/internal/battle/battle_test.go:149` - `TestStart_CreatesBattle` `want` carries `Enemy: "vila"`; `api/internal/rack/rack_test.go:556` - `Push(6, 0)` after the start | PASS |
| C26 | the Bug Fight e2e fights the server-picked enemy | re-run at `a240ebd` - `✓ 21 battle.spec.ts:5:5 › fight to victory` | `web/e2e/battle.spec.ts:13` - `expect(["vila", "slime"]).toContain(picked)`; `:14` - `toContainText(name)`; `:37` - ``toContainText(`${name} resolvido`)`` | PASS |
| C27 | STATE.md has AD-017, active | re-run at `a240ebd` - `grep -q '^\| AD-017 \|.*active' .specs/STATE.md` exit 0 | `.specs/STATE.md:23` - `\| AD-017 \| Uma região pode ter vários inimigos ... \| active \|` | PASS |

## Coverage

The button-icon, generic-icon and `ActionLabel` rows were recomputed at `a240ebd` from the plan's assumptions table. The other rows are carried from `c7449e8`, because the fix is test-only and touched none of their authorities.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| button icon sites (10) - verified at `a240ebd` | plan assumptions "Ícones de botão": `btn-deploy` INICIAR DEPLOY; `btn-start` VIAJAR ATÉ AQUI; `btn-shop` COMPRAR, COMPRAR E EQUIPAR, COMPRAR E USAR; `btn-build` FORJAR, FORJAR E EQUIPAR; `btn-play` NOVO ENCONTRO; `btn-rank` LEVEL n; `btn-settings` VISUAL; all `alt=""`, 16px, text kept | INICIAR DEPLOY `DeployScene.test.tsx:516-517` · VIAJAR ATÉ AQUI `WorldScene.test.tsx:237-238` · COMPRAR `ShopScene.test.tsx:547` · COMPRAR E EQUIPAR `:549` · COMPRAR E USAR `:552` · FORJAR `:558-559` · FORJAR E EQUIPAR `:566` · NOVO ENCONTRO `BattleScene.test.tsx:585` · LEVEL n `Hud.test.tsx:154-157` · VISUAL `AvatarScene.test.tsx:504-507` (width 16 at `:506`) - each with src, alt `""`, width `"16"` and first child | - |
| `ActionLabel` decision rows (3) - verified at `a240ebd` | `web/src/components/ShopScene.tsx:381` - `startsWith("COMPRAR")` → shop, `startsWith("FORJAR")` → build, else none | COMPRAR* `ShopScene.test.tsx:547,549,552` · FORJAR* `:559,566` · else (EQUIPADO, price shortfall) `:573`, `:577` `querySelector("img") toBeNull()` | - |
| generic icon sites (9 icons, 10 sites + 4 uncrowned tags) - verified at `a240ebd` | plan assumptions "Ícones genéricos" | code/server/cloud `SkillsScene.test.tsx:222` · gear `AvatarScene.test.tsx:515-518` (alt at `:516`) · laptop `DeployScene.test.tsx:518` · file `BattleScene.test.tsx:593` · trophy `:595` · wrench `ServerScene.test.tsx:356` · crown CHEFE, ENDGAME `WorldScene.test.tsx:248` · crown absent on 4 other tags `:249` | - |
| enemies (9) | carried from `c7449e8` - `api/catalog/combat.json` | all 9 → C1 (`catalog_test.go:218-244`); glyphs of the 3 new → `:232-236` (verified at `a240ebd`) | - |
| regions with 2 enemies × draw (6) | carried from `c7449e8` - `combat.json` | 6 rows → C2; single-enemy → C3 | - |
| start outcomes (3) | carried from `c7449e8` - `handlers.go:85-108` | new with draw C2 · single no draw C3 · resume C4 | - |
| battle routes (4) | carried from `c7449e8` - `router.go:79-82` | GET, start, commands, items → C7 | - |
| migration rows (2) | carried from `c7449e8` - `00010_battle_enemy.sql` | backfill · NOT NULL → C6 | - |
| wood headers (6) | carried from `c7449e8` - plan "Painel de madeira" | 6 → C11 | - |
| region tag → crown (6) | carried from `c7449e8` - catalog region tags | 2 crowned + 4 not → C13 | - |
| rarity → medal (5) | carried from `c7449e8` - catalog rarities | 5 → C14; 4 → C15 | - |
| library (101) | carried from `c7449e8` - door-1 list | 101 → C23 | - |
| background-reached pieces (43) | carried from `c7449e8` - `web/art/background/**` | 43 → C16 | - |
| office tiled zones (2) | carried from `c7449e8` - `ZONE_TILE` | PAREDE, PISO → C17 | - |
| effects (3) + sparkle outcomes (2) | carried from `c7449e8` - plan AC 16-18 | C19, C20, C21, C22 | - |
| route statuses `200` (4) | carried from `c7449e8` - `Surface` + router | C1, C2, C7 | - |
| Landing doors (3) | carried from `c7449e8` - plan `Landing` | door 1 C2, C27 · door 2 C6, C7 · door 3 C1 | - |

## Test policy rows

Row 2 was re-judged at `a240ebd` because it was unmet in round 1 and its test file was touched. The other rows are carried from `c7449e8`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | carried from `c7449e8` - `battle/handlers.go` `Start`, `turn`; `00010_battle_enemy.sql` | boundary C2-C5, C7 via `apptest`; migration C6 on real Postgres | yes (carried) |
| Decides, not reached across a boundary | verified at `a240ebd` - `ShopScene.tsx:380-388` `ActionLabel`; carried: `GameArt.tsx` `RarityArt`, `WorldScene.tsx` `CROWNED`, `SkillsScene.tsx` `TREE_ICON`, `OfficeScene.tsx` `ZONE_TILE`, `art.test.tsx` `orphans()` | own layer: C12 (`ActionLabel`), C14/C15, C13, C13, C17, C24 | yes - `ActionLabel` 3/3 rows asserted (`ShopScene.test.tsx:547`, `:566`, `:573`/`:577`), and faults M1 and M2 were killed; `RARITY_MEDAL` 5/5, `CROWNED` 6/6, `TREE_ICON` 3/3, `ZONE_TILE` 2/2, `orphans()` as before |
| Entry point that decides nothing | carried from `c7449e8` - `GET /api/catalog`; battle GET/commands/items | boundary C1, C7; error paths via `TestRoutes_SessionPlayerAndUnexpected` (`battle_test.go:794`) | yes (carried) |
| Instrumentation, pass-throughs | carried from `c7449e8` - `rules.go`, `catalog.go` lookups, `LoadingFx.tsx`, `types.ts`, fixtures, `globals.css` | covered by consumers C2-C7, C10, C17, C19, C22 | yes (carried) |

Swept `existing` rows are carried from `c7449e8`: `TestRoutes_SessionPlayerAndUnexpected` (`battle_test.go:794`) and `TestCommand_SerializesOnPlayerRowLock` (`battle_test.go:847`). Both are untouched by the fix.

Observation, not a gap: the test title `button icon absent on EQUIPAR, EQUIPADO and a price shortfall` (`ShopScene.test.tsx:570`) names `EQUIPAR`, but the body asserts only `EQUIPADO` (`:573`) and the shortfall (`:577`). The "else" row is still met twice.

## Faults injected

Round 2 faults (M1-M5) were verified at `a240ebd`. They ran in a `git worktree add --detach <scratchpad>/wt HEAD` checkout, with `web/node_modules` symlinked into it. The real tree's `git status --porcelain` was empty before and after, and the worktree was removed. No `git stash` was used. Round 1 faults F1-F5 are carried from `c7449e8`, on surfaces the fix did not touch.

| Mutation | Location | Killed |
| --- | --- | --- |
| M1: `label.startsWith("FORJAR")` → `label === "FORJAR"` | `web/src/components/ShopScene.tsx:381` | yes - `button icon on FORJAR E EQUIPAR` FAIL (`firstChild` is a Text, not the img) |
| M2: every label gets an icon (`: null` → `: "shop"`) | `web/src/components/ShopScene.tsx:381` | yes - `button icon absent on EQUIPAR, EQUIPADO and a price shortfall` FAIL (`expected <img ...> to be null`) |
| M3: `btn-settings` `scale={1}` → `scale={2}` | `web/src/components/AvatarScene.tsx:94` | yes - `button icon on the VISUAL tab` FAIL (`expected '32' to be '16'`) |
| M4: `ic-gear` `alt=""` → `alt="gear"` | `web/src/components/AvatarScene.tsx:175` | yes - `generic icon on the CONFIGURAÇÃO slot` FAIL (`expected 'gear' to be ''`) |
| M5: `slime_verde` glyph `(-.-)` → `(=.=)` | `api/catalog/combat.json:6` | yes - `TestCatalog_ServesCombat` FAIL (`catalog_test.go:235: enemy slime_verde glyph = "(=.=)", want "(-.-)"`) |
| F1: draw even for one enemy | `api/internal/battle/handlers.go:103` | yes (carried from `c7449e8`) |
| F2: turn looks the enemy up by region | `api/internal/battle/handlers.go:137` | yes (carried from `c7449e8`) |
| F3: backfill to a constant | `api/migrations/00010_battle_enemy.sql:5` | yes (carried from `c7449e8`) |
| F4: `RARITY_MEDAL` LENDÁRIO → `ouro` | `web/src/components/GameArt.tsx:225` | yes (carried from `c7449e8`) |
| F5: drop `tile-cachoeira` from `battle-caverna.json` | `web/art/background/battle-caverna.json:717-742` | yes (carried from `c7449e8`) |

The one fix-touched surface that got no mutant of its own is the `VIAJAR ATÉ AQUI` accessible-name assertion (`WorldScene.test.tsx:238`). The round was held to five faults. That assertion is a plain `toHaveAccessibleName` on a literal.

## Gate

Every proof was re-run in full at `a240ebd`:

- `cd api && go test ./... -count=1 -v`: every package `ok`; 303 `--- PASS`, 0 `--- FAIL`; C1-C7 each `--- PASS` by name
- `make art-check`: exit 0, `art ok`, 214 WARN, 0 ERROR
- `cd web && npx vitest run` (full): 22 files, 628 passed, 0 failed (626 in round 1, plus 2 new tests)
- named vitest proofs (one invocation, 10 files, `-t` alternation, verbose): 55 passed, 0 failed, each named test listed as `✓`
- `cd web && npx playwright test e2e/assets.spec.ts e2e/battle.spec.ts e2e/art.spec.ts`: 21 passed. No dev-server conflict: nothing was on 3100 or 8180, fakegithub on 9180 was reused, and nothing on 8080 or 9180 was touched
- `npx tsc --noEmit -p .`: exit 0; `npx eslint src e2e`: exit 0
- C27 grep: exit 0
