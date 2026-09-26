# Assets apply verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 4c49322..c7449e8
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Verified at `c7449e8`. 25 of 27 checks proven. C12 and C13 each leave something they claim unasserted. One coverage member has no proof, and one Test policy row is not met. All 5 faults were killed.

## Binding sources

Step 1 is owed only under `ui`, and this feature was approved under `standard`, so the check-vs-design comparison is not owed. The one binding source, the door 1 list, was still opened and used as the authority for the library set in `## Coverage`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `.specs/features/assets/checks.md` door 1 list (lines 8-22) | yes - read in full; 101 names (ui 10, btn 8, ic 15, medal 6, logo 1, prop 15, build 7, mob/npc 5, extra 7, fx 6, scene 4, tile 12, tile decal 5). Hero strips are not library assets owed a consumer | none - `LIBRARY` in `web/src/lib/art.test.tsx:465-484` matches it name for name, `names.length` = 101 | - |

Observations about the plan. None of these is a check contradicting a binding source:
- The plan's props/structures assumption places pieces on the `world` map (server hut in VILA, tent in MERCADO, and so on). The checks.md Handoff says they moved into the battle backgrounds and `scene-floresta`. The world map keeps only `extra-fogueira` (`web/art/background/world.json:2534`). AC 13 and C16 only demand reachability, so no check depends on where a piece sits.
- The plan's `Surface` lists 3 battle routes. `router.go:79-82` has 4, the fourth being `POST /api/me/battle/items`. C7 covers all 4.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | catalog serves 9 enemies with unique ids, in order, with their stats | `go test ./internal/battle ./internal/catalog -run '<C1-C7 alternation>' -v` - `--- PASS: TestCatalog_ServesCombat` | `api/internal/catalog/catalog_test.go:229` - `len(b.Enemies) != 9`; `:234` - `if ids[e.ID]` (repeat); `:238` - `got != enemies[i]` over `id\|region\|name\|level\|hp\|sp\|weakness\|drop` (table `:218-227`). Precision gap: the plan's glyphs (`(o.o)`, `(-.-)`, `{>_<}`) are asserted only as `e.Glyph == ""`, and the check never names them | PASS |
| C2 | start in vila/floresta/caverna draws `Rand.IntN(2)` in catalog order | same run - `--- PASS: TestStart_PicksEnemyByRand` | `api/internal/battle/battle_test.go:988` - `b.Enemy != tc.enemy \|\| b.EnemyHP != tc.hp \|\| b.EnemyHPMax != tc.hp` over 6 rows (`:980-982`) | PASS |
| C3 | single-enemy region consumes no draw | same run - `--- PASS: TestStart_SingleEnemyNoDraw` | `api/internal/battle/battle_test.go:999` - `b.Enemy != "mercado" \|\| b.EnemyHP != 85` with `Push(1)` (`:998`). A draw of `IntN(1)` fails through `apptest.go:67` (fault F1) | PASS |
| C4 | an active battle resumes with the same enemy | same run - `--- PASS: TestStart_ResumesSameEnemy` | `api/internal/battle/battle_test.go:1009` - `first.Enemy != "slime"`; `:1014` - `*again != *first` after `Push(0)` | PASS |
| C5 | the turn uses the stored enemy for the drop | same run - `--- PASS: TestVictory_DropsFromStoredEnemy` | `api/internal/battle/battle_test.go:1036` - `quantity(got, "log_essence") != 1 \|\| quantity(got, "null_shard") != 0`; `:1041` - `e.Type == "drop" && e.Item == "log_essence"` | PASS |
| C6 | migration 10 backfills `enemy = region`; enemy is NOT NULL | same run - `--- PASS: TestMigration_BattleEnemyBackfill` (real Postgres, own schema) | `api/internal/battle/battle_test.go:1092` - `enemy != "floresta"`; `:1096` - `strings.Contains(err.Error(), "23502")`. The NOT NULL proof is an `UPDATE ... SET enemy = NULL` (`:1095`), not the INSERT the check names. It exercises the same constraint | PASS |
| C7 | all 4 battle routes carry `battle.enemy` | same run - `--- PASS: TestRoutes_BattleCarriesEnemy` | `api/internal/battle/battle_test.go:1116` - `got.Battle.Enemy != "slime"` over start/get/commands/items (`:1106-1111`); `f.turn` requires `200` (`:114`) | PASS |
| C8 | Bug Fight shows the enemy by `battle.enemy` | `npx vitest run <10 files> -t "<alternation>"` - `✓ BattleScene enemy by id > enemy by id: slime in vila` | `web/src/components/BattleScene.test.tsx:553` - `toHaveTextContent("SLIME DE CACHE")`; `:554` - `"fraqueza: cache invalidado"`; `:557` - `src` `"/art/sprite/enemy-slime.png"`; `:558` - `alt` `"SLIME DE CACHE"`; `:559` - `width` `"128"` | PASS |
| C9 | spec and PNG for every `enemy-<id>`; the 3 new ones are 32x32 | same run - `✓ catalog art on disk > enemy sprites per combat.json enemies` | `web/src/lib/art.test.tsx:87` - `name: \`enemy-${e.id}\`, size: ENEMY_SIZE[e.id] ?? [32, 32]` (`:80` torre 48, nuvem 64); asserted by `:56-58` `existsSync(spec)`, `existsSync(png)`, `pngSize(png) toEqual(size)` | PASS |
| C10 | `.panel-wood` and `.bar` border images in the browser | `npx playwright test e2e/assets.spec.ts e2e/battle.spec.ts e2e/art.spec.ts` - `✓ 18 assets.spec.ts:76 wood and bar chrome` | `web/e2e/assets.spec.ts:82` - `wood.source toContain("/art/ui/ui-panel-wood.png")`; `:83` - `wood.slice toBe("8 fill")`; `:90` - `borderImageSource toContain("/art/ui/ui-bar.png")` | PASS |
| C11 | the 6 scene headers carry `panel-wood` | vitest run - `✓ ... wood header` ×6 (Deploy, Battle, Skills, Shop, Office, Avatar) | `toHaveClass("panel-wood")` at `DeployScene.test.tsx:509`, `BattleScene.test.tsx:578`, `SkillsScene.test.tsx:215`, `ShopScene.test.tsx:540`, `OfficeScene.test.tsx:387`, `AvatarScene.test.tsx:496` (all under `web/src/components/`) | PASS |
| C12 | button icons 16px, `alt=""`, first child, accessible name kept, on 10 named buttons | vitest run - `✓ button icon on INICIAR DEPLOY...`, `✓ ...VIAJAR ATÉ AQUI`, `✓ ...COMPRAR, COMPRAR E EQUIPAR, COMPRAR E USAR`, `✓ ...FORJAR`, `✓ ...NOVO ENCONTRO`, `✓ ...VISUAL tab`, `✓ ...rank before LEVEL` | `DeployScene.test.tsx:517`, `WorldScene.test.tsx:237`, `BattleScene.test.tsx:585`: `expectFirstIcon` (src, alt `""`, width `"16"`, `firstChild`). `ShopScene.test.tsx:547,549,552,559`: `firstIcon(...)` toBe `btn-shop`/`btn-build`. `Hud.test.tsx:154`: `btn-rank.png`. Gaps: (a) **`FORJAR E EQUIPAR` has no proof**, because `ShopScene.test.tsx:555-559` uses `RECIPES[0]` = `forja_cache` → item → label `FORJAR` (`web/src/test/helpers.ts:162`, `ShopScene.tsx:292`); (b) **`btn-settings` 16px unasserted**, because `AvatarScene.test.tsx:504-506` checks only `src`, `alt`, `firstChild`; (c) the `VIAJAR ATÉ AQUI` name is not asserted in the named proof (`WorldScene.test.tsx:20` takes the article's only button). It is asserted by `web/e2e/world.spec.ts:11`, which is outside C12's proof | FAIL |
| C13 | generic icons 16px, `alt=""`, first child, at 9 sites; crown only on CHEFE/ENDGAME | vitest run - `✓ generic icon on tree FRONTEND/BACKEND/INFRA`, `✓ ...CONFIGURAÇÃO slot`, `✓ ...panel title`, `✓ ...log header and the RESOLVIDO seal`, `✓ ...RACK title`, `✓ crown on tag of torre/nuvem = true`, `✓ vila/floresta/mercado/caverna = false` | `expectFirstIcon` at `SkillsScene.test.tsx:222`, `DeployScene.test.tsx:518`, `BattleScene.test.tsx:593,595`, `ServerScene.test.tsx:356`, `WorldScene.test.tsx:247`; `WorldScene.test.tsx:248` - `chip.querySelector("img") toBeNull()` for the 4 other tags. Gap: **`ic-gear` `alt=""` unasserted**, because `AvatarScene.test.tsx:514-516` checks only `src`, `width`, `firstChild` | FAIL |
| C14 | LOJA rarity medals over the 5 rarities | vitest run - `✓ rarity medal (cafe/fone/macbook/monitor/default)` | `web/src/components/ShopScene.test.tsx:569` - `firstIcon(chip) toBe(\`/art/icon/${medal}.png\`)` (alt, width 16, `firstChild` at `:530-533`); `:570` - `chip.querySelector("img") toBeNull()` for PADRÃO; rows `:563-564` | PASS |
| C15 | AVATAR rarity shows the same medal | vitest run - `✓ rarity medal (EQUIP cafe/macbook/monitor, SKINS default)` | `web/src/components/AvatarScene.test.tsx:529` - `src toBe(\`/art/icon/${medal}.png\`)`; `:530` - `rarity.firstChild toBe(img)`; `:531` - `toBeNull()` for PADRÃO | PASS |
| C16 | every prop, build (not flag), extra (not bau/bau-aberto), tile and decal is reached from a background | vitest run - `✓ library consumers > scene pieces are reached from the backgrounds` | `web/src/lib/art.test.tsx:539` - `pieces.length toBe(15 + 6 + 5 + 5 + 12)`; `:540` - `expect.soft(reached.has(n), n).toBe(true)` | PASS |
| C17 | OFFICE PAREDE/PISO tiled at 64px, repeat | vitest run - `✓ OfficeScene applied assets > tiled zones`; playwright `✓ 19 assets.spec.ts:94 tiled office zones` | `web/src/components/OfficeScene.test.tsx:394` - `url(/art/tile/tile-parede-madeira.png)`; `:395` - `url(/art/tile/tile-tabua.png)`; `web/e2e/assets.spec.ts:100` - `toEqual({ size: "64px 64px", repeat: "repeat" })` | PASS |
| C18 | `make art-check` exits 0 with `art ok` | `make art-check` - exit 0, last line `art ok`, 214 WARN, 0 ERROR | `Makefile:33` - `diff -r "$$tmp" web/public/art && echo "art ok"` | PASS |
| C19 | dust on the hero during `lunge`, none on `cast` | vitest run - `✓ dust on the lunge beat`, `✓ dust never on a cast beat` | `web/src/components/BattleScene.test.tsx:415` - `dust not.toBeNull()`; `:416` - `toBe("url(/art/fx/dust.png)")`; `:421` - `heroActor().querySelector('[data-fx="dust"]') toBeNull()` | PASS |
| C20 | sparkle on the node unlocked with 200, none on 409 | vitest run - `✓ sparkle on the node unlocked with 200`, `✓ sparkle never on a 409` | `web/src/components/SkillsScene.test.tsx:235` - `toBe("url(/art/fx/sparkle.png)")`; `:236` - `querySelectorAll('[data-fx="sparkle"]') toHaveLength(1)`; `:244` - `toBeNull()` | PASS |
| C21 | exactly one `span.fx-fire`, `aria-hidden`, fire.png | vitest run - `✓ WorldScene campfire > campfire strip over the map fire` | `web/src/components/WorldScene.test.tsx:257` - `fires toHaveLength(1)`; `:259` - `aria-hidden toBe("true")`; `:260` - `toBe("url(/art/fx/fire.png)")` | PASS |
| C22 | `.fx-fire` loops infinite; reduced motion → no animation | playwright - `✓ 20 assets.spec.ts:104 fire loops` | `web/e2e/assets.spec.ts:110` - `count toBe("infinite")`; `:112` - `name toBe("none")` after `emulateMedia({ reducedMotion: "reduce" })` | PASS |
| C23 | the 101 door-1 assets each have a consumer; orphans = 0 | vitest run - `✓ library consumers > no orphan in the library` | `web/src/lib/art.test.tsx:550` - `names.length toBe(101)`; `:551` - `orphans(names, sources, reached) toEqual([])` | PASS |
| C24 | orphan detector flags an unreferenced asset | vitest run - `✓ orphan detector flags what nothing references` | `web/src/lib/art.test.tsx:557` - `orphans(x, [], new Set()) toEqual(["prop-x"])`; `:558` - an unrelated `kind="prop" id="y"` still `["prop-x"]` | PASS |
| C25 | the Go battle and catalog suites pass | `go test ./internal/battle ./internal/catalog -count=1 -v` - 75 top-level `--- PASS`, 0 FAIL; `go test ./...` all `ok` | `api/internal/battle/battle_test.go:149` - `TestStart_CreatesBattle` `want` now carries `Enemy: "vila"`; `api/internal/rack/rack_test.go:556` - `Push(6, 0)` moved after the start (the claim is unchanged: damage draws follow the start; `--- PASS: TestMe_SkipsSlotsOutsideCatalog`) | PASS |
| C26 | the Bug Fight e2e fights the server-picked enemy | playwright - `✓ 21 battle.spec.ts:5 fight to victory` | `web/e2e/battle.spec.ts:13` - `expect(["vila", "slime"]).toContain(picked)`; `:14` - `toContainText(name)`; `:37` - `` toContainText(`${name} resolvido`) `` | PASS |
| C27 | STATE.md has AD-017, active | `grep -q '^\| AD-017 \|.*active' .specs/STATE.md` - exit 0 | `.specs/STATE.md:23` - `\| AD-017 \| Uma região pode ter vários inimigos ... \| active \| 2026-09-26 \|` | PASS |

## Coverage

Each set was recomputed from its own authority.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| enemies (9) | `api/catalog/combat.json` | vila, slime, floresta, slime_verde, mercado, caverna, monstro, torre, nuvem → C1 (`catalog_test.go:218-238`) | - |
| regions with 2 enemies × draw (6) | `combat.json` (vila, floresta, caverna have 2; mercado, torre, nuvem have 1) | 6 rows → C2 (`battle_test.go:980-988`); single-enemy → C3 | - |
| start outcomes (3) | `handlers.go:85-108` | new with draw C2 · single no draw C3 · resume C4 | - |
| battle routes (4) | `api/internal/app/router.go:79-82` | GET, POST start, POST commands, POST items → C7 (`battle_test.go:1106-1116`) | - |
| migration rows (2) | `api/migrations/00010_battle_enemy.sql` | backfill · NOT NULL → C6 | - |
| wood headers (6) | plan assumptions "Painel de madeira" | deploy, battle, skills, shop, office, avatar-bag → C11 | - |
| button icon sites (10) | plan assumptions "Ícones de botão" | INICIAR DEPLOY C12 · VIAJAR ATÉ AQUI C12 · COMPRAR C12 · COMPRAR E EQUIPAR C12 · COMPRAR E USAR C12 · FORJAR C12 · NOVO ENCONTRO C12 · VISUAL (src/alt only) C12 · LEVEL n C12 | FORJAR E EQUIPAR (no proof); VISUAL `btn-settings` 16px (unasserted) |
| generic icon sites (9 icons, 12 sites) | plan assumptions "Ícones genéricos" | code/server/cloud C13 · laptop C13 · file C13 · wrench C13 · trophy C13 · crown on CHEFE, ENDGAME C13 · gear (src/width only) C13 | `ic-gear` `alt=""` (unasserted) |
| region tag → crown (6) | `api/catalog` region tags: CHEFE, ENDGAME, COMBATE, EXPLORAR, HUB, LOJA | 2 crowned + 4 not → C13 (`WorldScene.test.tsx:242-248`) | - |
| rarity → medal (5) | catalog files: COMUM, INCOMUM, RARO, LENDÁRIO, PADRÃO | all 5 → C14; COMUM, RARO, LENDÁRIO, PADRÃO → C15 | - |
| library (101) | door-1 list `.specs/features/assets/checks.md:10-21` | all 101 → C23. A strict re-scan (literal path, `kind`/`id` literal, or background `use`) found a real consumer for each, and the dynamic ids resolve through `TREE_ICON`, `STAT_ICON`, `MEDALS`, `RARITY_MEDAL`, `ActionLabel`, `WorldScene` start/lock, and `enemy-<id>.json` → `mob-*` | - |
| background-reached pieces (43) | specs under `web/art/background/**` followed by `use` | 15 props, 6 builds, 5 extras, 5 decals, 12 tiles → C16. Each has a reaching spec (e.g. `tile-cachoeira` via `battle-caverna.json`, `build-server-hut` via `battle-vila.json`) | - |
| office tiled zones (2) | `OfficeScene.tsx` `ZONE_TILE` | PAREDE, PISO → C17 | - |
| effects (3) + sparkle outcomes (2) | plan AC 16-18 | dust C19 · sparkle 200/409 C20 · fire C21, C22 | - |
| route statuses `200` (4) | plan `Surface` + router | catalog C1 · start C2 · get/commands/items C7 (`f.turn` requires 200) | - |
| Landing doors (3) | plan `Landing` | door 1 C2, C27 · door 2 C6, C7 · door 3 C1 | - |

## Test policy rows

checks.md carries three of the four `AGENTS.md` rows. The fourth, "Entry point that decides nothing", is judged here from `AGENTS.md`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `api/internal/battle/handlers.go` `Start` (draw/no-draw/resume) and `turn` (stored enemy lookup); `api/migrations/00010_battle_enemy.sql` | boundary C2, C3, C4, C5, C7 via `apptest` HTTP; own layer is the same handler, per the checks' precedent; migration C6 against real Postgres | yes - one asserted case per branch; faults F1-F3 killed |
| Decides, not reached across a boundary | `GameArt.tsx` `RarityArt` (4 medals + none); `WorldScene.tsx` `CROWNED`; `SkillsScene.tsx` `TREE_ICON`; `OfficeScene.tsx` `ZONE_TILE`; `ShopScene.tsx:380-388` `ActionLabel` (COMPRAR→shop, FORJAR→build, else none); `art.test.tsx` `orphans()` | own layer: C14/C15, C13, C13, C17, C12, C24 | no - `ActionLabel` has 3 rows, and only COMPRAR→shop and FORJAR (item) are asserted. The `FORJAR E EQUIPAR` case and the "no icon" row (`GEMS INSUFICIENTES`, `FALTAM MATERIAIS`, `EQUIPADO`) have no assertion. The others are met: `RARITY_MEDAL` 5/5, `CROWNED` 6/6, `TREE_ICON` 3/3, `ZONE_TILE` 2/2, `orphans()` 6 assertions |
| Entry point that decides nothing | `GET /api/catalog`; the battle GET/commands/items handlers, where the only change is the additive `enemy` field | boundary: C1, C7; rejected input and error paths unchanged, still covered by `TestRoutes_SessionPlayerAndUnexpected` (`battle_test.go:794`) | yes |
| Instrumentation, pass-throughs | `rules.go` `State.Enemy`; `catalog.go` `Enemy(id)`/`EnemiesIn`; `LoadingFx.tsx` `FxOnce` className; `types.ts`; `helpers.ts` fixtures; `globals.css` rules | none of its own; covered by consumers C2-C7, C10, C17, C19, C22 | yes |

Swept `existing` rows re-read against the code:
- authorization: `TestRoutes_SessionPlayerAndUnexpected` exists (`battle_test.go:794`).
- concurrency: `TestCommand_SerializesOnPlayerRowLock` exists (`battle_test.go:847`), and the draw happens inside `player.WithLocked` (`handlers.go:87`, `player.go:388` `FOR UPDATE`). Holds.

## Faults injected

All faults were applied in a `git worktree add --detach <scratchpad>/wt HEAD` checkout, with `web/node_modules` symlinked into it. The real tree's `git status --porcelain` was empty before and after, and the worktree was removed.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: draw even for one enemy (`len(enemies) > 1` → `>= 1`) | `api/internal/battle/handlers.go:103` | yes - `TestStart_SingleEnemyNoDraw` FAIL (`pushed draw 1 outside [0,1)`) |
| F2: turn looks the enemy up by region (`Enemy(st.Enemy)` → `EnemiesIn(st.Region)[0]`) | `api/internal/battle/handlers.go:137` | yes - `TestVictory_DropsFromStoredEnemy` FAIL (`inventory = [null_shard ...], want log_essence`) |
| F3: backfill to a constant (`SET enemy = region` → `'x'`) | `api/migrations/00010_battle_enemy.sql:5` | yes - `TestMigration_BattleEnemyBackfill` FAIL (`backfilled enemy = "x", want floresta`) |
| F4: `RARITY_MEDAL` LENDÁRIO → `ouro` | `web/src/components/GameArt.tsx:225` | yes - `ShopScene > rarity medal (monitor)` FAIL (expected `medal-rubi`, received `medal-ouro`) |
| F5: drop both `tile-cachoeira` layers from `battle-caverna.json` and re-render its PNG (`make art-check` then prints `art ok`) | `web/art/background/battle-caverna.json:717-742` | yes - `scene pieces are reached from the backgrounds` FAIL (`tile-cachoeira: expected false`), and `no orphan in the library` FAIL (`['tile-cachoeira']`) |

No fault was spent on the C12/C13 gaps, because their assertions are missing rather than weak. A mutant with `scale={2}` on `btn-settings`, `alt="gear"` on `ic-gear`, or an icon on every `ActionLabel` would survive by reading.

## Gate

- `cd api && go test ./... -count=1`: every package `ok`; 303 `--- PASS` (including subtests), 0 `--- FAIL`
- named Go proofs C1-C7: 7/7 `--- PASS`
- `make art-check`: exit 0, `art ok`, 214 WARN, 0 ERROR
- `cd web && npx vitest run` (full): 22 files, 626 passed, 0 failed
- named vitest proofs (one invocation, 10 files, `-t` alternation): 10 files passed; every named test listed individually as `✓`
- `cd web && npx playwright test e2e/assets.spec.ts e2e/battle.spec.ts e2e/art.spec.ts`: 21 passed. No dev-server conflict: fakegithub on 9180 was reused, the api was started on 8180, and nothing was killed
- `npx tsc --noEmit -p .`: exit 0; `npx eslint src e2e`: exit 0
- C27 grep: exit 0

**Ranked gaps**
1. C12 / Test policy row 2: no proof for `btn-build` on `FORJAR E EQUIPAR`, and no assertion that other labels get no icon (`ActionLabel`'s third row). `web/src/components/ShopScene.test.tsx:555-559` only renders `RECIPES[0]` (item output → `FORJAR`).
2. C12: `btn-settings` is never shown to be 16px. `web/src/components/AvatarScene.test.tsx:504-506` asserts only src, alt and first child.
3. C13: `ic-gear` is never shown to have `alt=""`. `web/src/components/AvatarScene.test.tsx:514-516` asserts only src, width and first child.
4. Precision gap in the checks, not a failure: C1 does not name the plan's glyphs for the three new enemies, and `api/internal/catalog/catalog_test.go:238` only checks that the glyph is not empty.
