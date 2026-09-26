# Assets apply checks

Profile: standard
Plan: `.specs/features/assets-apply/plan.md`

27 checks in 5 slices · 3 one-way doors · 0 open

Go proofs run against the real Postgres (`make db-up`), from `api/`. Web proofs from `web/`.

## Checks

### S1 - mobs como inimigos do catálogo · api battle + catalog, web BattleScene · ~60 KB · ~15k

**C1** - `GET /api/catalog` `enemies` has 9 entries with unique `id`s, in this order: `vila`, `slime`, `floresta`, `slime_verde`, `mercado`, `caverna`, `monstro`, `torre`, `nuvem`. The six old ones keep `region` = `id` and their current stats. `slime` = `vila|SLIME DE CACHE|2|45|40|cache invalidado|null_shard`, `slime_verde` = `floresta|SLIME DE LOG|4|55|45|log rotacionado|log_essence`, `monstro` = `caverna|BUG DE PRODUÇÃO|9|100|65|hotfix|wild_trace` (APL-01, AC 1; door 1, door 3)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_ServesCombat$'`

**C2** - WHEN a dev in `vila` starts an encounter with `Rand` scripted `0`, THEN `battle.enemy` = `vila` and `enemyHp` = `60`. With `1`, `battle.enemy` = `slime` and `enemyHp` = `45`. The same table holds for `floresta` (`0` → `floresta` 70, `1` → `slime_verde` 55) and `caverna` (`0` → `caverna`, `1` → `monstro` 100) (APL-01, AC 2; door 1)
Proof: `cd api && go test ./internal/battle -run 'TestStart_PicksEnemyByRand'`

**C3** - WHEN a dev in `mercado` (one enemy) starts with `Rand` scripted `1`, THEN the start succeeds with `battle.enemy` = `mercado`. A draw of `IntN(1)` would receive `1` and fail the test (APL-01, AC 3)
Proof: `cd api && go test ./internal/battle -run 'TestStart_SingleEnemyNoDraw'`

**C4** - WHILE an `active` battle against `slime` exists in `vila`, WHEN the dev starts again with `Rand` scripted `0`, THEN the answer is the same battle with `battle.enemy` = `slime` and the same `enemyHp` (APL-01, AC 4)
Proof: `cd api && go test ./internal/battle -run 'TestStart_ResumesSameEnemy'`

**C5** - Given a catalog where the region's second enemy drops a different item than the first, WHEN that enemy (picked with `Rand` `1`) is defeated with the drop draw below `dropChance`, THEN the `drop` event and the inventory carry the second enemy's `drop` (APL-01, AC 5; door 2)
Proof: `cd api && go test ./internal/battle -run 'TestVictory_DropsFromStoredEnemy'`

**C6** - A `battles` row created before migration `00010` has `enemy` = its `region` after it. Inserting a row with `enemy` NULL is rejected by the NOT NULL constraint (APL-01, AC 6; door 2)
Proof: `cd api && go test ./internal/battle -run 'TestMigration_BattleEnemyBackfill'`

**C7** - Every battle response carries `battle.enemy`: GET current, POST start, POST commands and POST items (table-driven over the 4 routes) (APL-01, AC 2, 5; door 2)
Proof: `cd api && go test ./internal/battle -run 'TestRoutes_BattleCarriesEnemy'`

**C8** - Bug Fight with `battle.enemy` = `slime` shows the name `SLIME DE CACHE`, the text `fraqueza: cache invalidado` and `img` `src="/art/sprite/enemy-slime.png"` `alt="SLIME DE CACHE"` `width=128`, even though the region is `vila` (APL-02, AC 7)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "enemy by id"`

**C9** - For each enemy in `combat.json`, `web/art/sprite/enemy-<id>.json` and a PNG exist. The three new ones are 32x32; the size is otherwise as today (APL-02, AC 7)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "enemy"`

### S2 - todo ícone e peça de UI em uso · ~12 screen files · ~20k

**C10** - In the browser, `.panel-wood` has computed `border-image-source` containing `/art/ui/ui-panel-wood.png` with slice `8 fill`, and `.bar` has `border-image-source` containing `/art/ui/ui-bar.png` (APL-03, AC 8, 9)
Proof: `cd web && npx playwright test e2e/assets.spec.ts -g "wood and bar"`

**C11** - The six scene headers carry the class `panel-wood`: `.deploy-head`, `.battle-head`, `.skills-head`, `.shop-head`, `.office-head`, `.avatar-bag-head` (APL-03, AC 8)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx src/components/BattleScene.test.tsx src/components/SkillsScene.test.tsx src/components/ShopScene.test.tsx src/components/OfficeScene.test.tsx src/components/AvatarScene.test.tsx -t "wood header"`

**C12** - Button icons are 16px, `alt=""`, first child of their button, and the button keeps its accessible name:
- `btn-deploy` on INICIAR DEPLOY
- `btn-start` on VIAJAR ATÉ AQUI
- `btn-shop` on COMPRAR, COMPRAR E EQUIPAR and COMPRAR E USAR
- `btn-build` on FORJAR and FORJAR E EQUIPAR
- `btn-play` on NOVO ENCONTRO
- `btn-settings` on the VISUAL tab
- `btn-rank` before `LEVEL n` in the HUD
(APL-03, AC 10)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx src/components/WorldScene.test.tsx src/components/ShopScene.test.tsx src/components/BattleScene.test.tsx src/components/AvatarScene.test.tsx src/components/Hud.test.tsx -t "button icon"`

**C13** - Generic icons are 16px, `alt=""`, and first child of their element:
- `ic-code`, `ic-server`, `ic-cloud` before the tree names FRONTEND, BACKEND, INFRA
- `ic-gear` on the CONFIGURAÇÃO slot of the AVATAR
- `ic-laptop` on the deploy panel title
- `ic-file` in the Bug Fight log header
- `ic-wrench` on the RACK title of the SERVER
- `ic-trophy` on the RESOLVIDO seal
- `ic-crown` on the tag chip of the MUNDO regions `CHEFE` and `ENDGAME`, and on no other tag
(APL-03, AC 11)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx src/components/AvatarScene.test.tsx src/components/DeployScene.test.tsx src/components/BattleScene.test.tsx src/components/ServerScene.test.tsx src/components/WorldScene.test.tsx -t "generic icon"`

**C14** - Rarity medals, table-driven over the 5 rarities: COMUM → `medal-bronze`, INCOMUM → `medal-prata`, RARO → `medal-ouro`, LENDÁRIO → `medal-rubi`, PADRÃO → no `img`. The medal is 16px, `alt=""`, and the first child of the rarity chip in the LOJA detail (APL-03, AC 12)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "rarity medal"`

**C15** - The AVATAR detail rarity shows the same medal (table over COMUM, RARO, LENDÁRIO, PADRÃO) (APL-03, AC 12)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "rarity medal"`

### S3 - cenários montados · ~40 specs + OfficeScene · ~15k

**C16** - Each prop, `build-*` (except `build-flag`), `extra-*` (except `extra-bau`, `extra-bau-aberto`), tile and tile decal of the door 1 list of `assets` is reached by at least one spec in `web/art/background/**`, following `use` transitively (APL-04, AC 13)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "scene pieces"`

**C17** - In the OFFICE, the PAREDE zone has inline `background-image` `url(/art/tile/tile-parede-madeira.png)` and the PISO zone has `url(/art/tile/tile-tabua.png)`. In the browser both have `background-size` `64px 64px` and `background-repeat` `repeat` (APL-04, AC 14)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "tiled zones"`
Proof: `cd web && npx playwright test e2e/assets.spec.ts -g "tiled office"`

**C18** - `make art-check` exits `0` and prints `art ok` (APL-04, AC 15)
Proof: `make art-check`

### S4 - efeitos restantes · BattleScene, SkillsScene, WorldScene · ~8k

**C19** - During the `lunge` beat, the hero actor contains `[data-fx="dust"]` with `url(/art/fx/dust.png)`. During `cast` it has none (APL-05, AC 16)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "dust"`

**C20** - WHEN unlocking a skill answers `200`, THEN the unlocked node contains `[data-fx="sparkle"]` with `url(/art/fx/sparkle.png)`. WHEN it answers `409`, THEN no node contains one (APL-05, AC 17)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "sparkle"`

**C21** - The MUNDO contains exactly one `span.fx-fire` `aria-hidden="true"` with `url(/art/fx/fire.png)` (APL-05, AC 18)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "campfire"`

**C22** - In the browser, `.fx-fire` has `animation-iteration-count` `infinite`. With `prefers-reduced-motion: reduce`, `animation-name` is `none` (APL-05, AC 18)
Proof: `cd web && npx playwright test e2e/assets.spec.ts -g "fire loops"`

### S5 - nada sobra · art.test · ~3k

**C23** - Every asset of the door 1 literal list of `assets` has at least one consumer, meaning its name is referenced by a file under `web/src` or it is reached from a spec in `web/art/background/**`. The test prints the orphans, and the count is `0` (APL-06, AC 19)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "no orphan"`

**C24** - The consumer test fails on a library asset with no consumer: its own orphan function returns `["x"]` for a fixture asset `x` that nothing references (APL-06, AC 19)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "orphan detector"`

### Regression across the feature

**C25** - The existing Go suites still pass with the new model: battle start per region, drops, and the catalog, under the updated fixtures (APL-01, AC 1-5)
Proof: `cd api && go test ./internal/battle ./internal/catalog`

**C26** - The Bug Fight e2e fights the enemy the server picked, whose name comes from `battle.enemy`. `e2e/battle.spec.ts` passes (APL-02, AC 7)
Proof: `cd web && npx playwright test e2e/battle.spec.ts`

**C27** - `.specs/STATE.md` has `AD-017` (several enemies per region, drawn at start through `Deps.Rand`, battle stores `enemy`) with status `active` (APL-01; door 1)
Proof: `grep -q '^| AD-017 |.*active' .specs/STATE.md`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| enemies in catalog (9) | `vila` C1 · `slime` C1 · `floresta` C1 · `slime_verde` C1 · `mercado` C1 · `caverna` C1 · `monstro` C1 · `torre` C1 · `nuvem` C1 | - |
| regions with 2 enemies × draw (6) | vila 0 C2 · vila 1 C2 · floresta 0 C2 · floresta 1 C2 · caverna 0 C2 · caverna 1 C2 | - |
| start outcomes (3) | new with draw C2 · single enemy no draw C3 · resume C4 | - |
| battle routes carrying `enemy` (4) | GET C7 · start C7 · commands C7 · items C7 | - |
| migration rows (2) | backfill C6 · NOT NULL C6 | - |
| wood headers (6) | deploy C11 · battle C11 · skills C11 · shop C11 · office C11 · avatar C11 | - |
| button icons (7) | deploy C12 · start C12 · shop C12 · build C12 · play C12 · settings C12 · rank C12 | - |
| generic icons (9) | code C13 · server C13 · cloud C13 · gear C13 · laptop C13 · file C13 · wrench C13 · trophy C13 · crown C13 | - |
| rarity → medal (5) | COMUM C14 · INCOMUM C14 · RARO C14 · LENDÁRIO C14 · PADRÃO C14 | - |
| office tiled zones (2) | PAREDE C17 · PISO C17 | - |
| effects (3) | dust C19 · sparkle C20 · fire C21 | - |
| sparkle outcomes (2) | `200` C20 · `409` C20 | - |
| `GET /api/catalog` statuses (1) | `200` C1 | - |
| `POST /api/me/battle` statuses (1) | `200` C2 | - |
| `GET /api/me/battle` statuses (1) | `200` C7 | - |
| `POST /api/me/battle/commands` statuses (1) | `200` C7 | - |
| Landing doors (3) | 1 C2, C27 · 2 C6, C7 · 3 C1 | - |

- Claims about a computed style: C10, C17, C22. Each has a browser proof.
- Claims naming a route's response: C1, C2-C7. Each crosses the HTTP boundary through `apptest`.

## Test policy

Answered by `AGENTS.md` `## Test policy`. The rows below apply it here.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence:

- `battle.Handlers.Start` picks the enemy: filter by region, draw when `n > 1`, resume. That is 3 branches, so it decides and is reached across HTTP. C2-C4 are at the boundary. The selection is small enough to live in the handler, so the boundary test is also its own layer (precedent: `TestStart_ReplacesOtherRegionOrWonBattle`).
- The turn using the stored enemy is a single lookup. C5 proves it at the boundary.
- Web rarity → medal and tag → crown are mapping tables. C13 and C14 are table-driven at the screen.
- The consumer detector decides orphan or not. C24 is at its own layer.

Cost: 6 new Go tests, 1 new migration test, about 12 new screen tests, 3 new e2e tests.

## Swept

- validation: C1 (unique ids, stats), C6 (NOT NULL)
- failure modes: C20 (unlock error, no sparkle)
- idempotency: C4 (a second start resumes, does not re-draw)
- authorization: existing - the battle routes require a session (`TestRoutes_SessionPlayerAndUnexpected`), unchanged
- concurrency: existing - start and turns hold the player row lock (`TestCommand_SerializesOnPlayerRowLock`); the draw happens inside it
- data lifecycle: C6 - backfill of existing battles
- dependency failure: n/a - no new external dependency
- state transitions: C4 (active resumes), C2 (new or won → new draw)
- observability: n/a - no logging requirement in the plan

## Handoff

Intended split, with the arithmetic, written before any code:

- S1 = ~15k (catalog.go, combat.json, battle handlers/tests about 45 KB, BattleScene about 20 KB). S2-S5 = ~45k (screens, globals.css, about 40 background specs). Total ~60k, under the 150k budget, so one builder and no handoff.
