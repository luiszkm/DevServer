# Game art checks

Profile: standard
Plan: `.specs/features/game-art/plan.md`

32 checks in 3 slices · 3 one-way doors · 0 open

Asset tables used by the checks (from `api/catalog/*.json`, door 1):

- enemy (`region`): `vila`, `floresta`, `mercado`, `caverna`, `torre`, `nuvem`
- item: `null_shard`, `log_essence`, `corrupt_dep`, `wild_trace`, `race_core`, `memory_crystal`, `sp_potion`, `hp_potion`, `boost_deploy`
- gear: `macbook`, `monitor`, `cafe`, `moletom`, `cadeira`, `fone`
- skill: `f1`, `f2`, `f3`, `b1`, `b2`, `b3`, `i1`, `i2`, `i3`
- deploy: `backend`, `frontend`, `mobile`, `database`, `microservices`
- rack: `cpu`, `ram`, `ssd`, `cache`, `lb`, `gpu`
- office: `mesa`, `cadeira_gamer`, `setup2`, `rack`, `cafeteira`, `estante`, `planta`, `tapete`, `neon`, `poster`, `kanban`, `janela`
- region: `vila`, `floresta`, `mercado`, `caverna`, `torre`, `nuvem`
- fixed: `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart`, `icon/hud-xp`, `background/battle-<region>` × 6, `background/world`, `background/office`, `background/server`

Completeness tests (C4-C6, C12-C15, C23-C26) read the ids from `api/catalog/*.json` at test time, so a
catalog entry added later without art turns them red; they build the expected path from the door 1
literal, never from `GameArt`.

## Checks

### S1 - pipeline, `GameArt` e combate · 9 files · ~114 KB · ~29k read (+ 21 specs, previews)

**C1** - `GameArt` renderiza `<img>` com `src` = `/art/icon/<kind>-<id>.png` para `kind` ∈ `item`, `gear`, `skill`, `deploy`, `rack`, `office`, `region`, `hud` e `/art/sprite/enemy-<id>.png` para `enemy`; `class` contém `pixelated`; `width` = `height` = nativo × `scale`, nativo 16 para ícone, 32 para `enemy` (`vila`), 48 para `enemy` `torre`, 64 para `enemy` `nuvem`; `alt` = o `alt` recebido (ART-02, AC 17; door 1, door 2) ✅
Proof: `cd web && npx vitest run src/components/GameArt.test.tsx -t "address and size"`

**C2** - WHEN o `<img>` do `GameArt` dispara `error`, a imagem some e o texto do `fallback` (`HP+`) aparece no mesmo lugar (ART-02, AC 5) ✅
Proof: `cd web && npx vitest run src/components/GameArt.test.tsx -t "fallback"`

**C3** - `make art-check` sai `0`: renderiza `web/art` num diretório temporário com `render.py`, nenhum `ERROR`, e `diff -r` do resultado contra `web/public/art` é vazio (ART-01, AC 4; door 3) ✅
Proof: `make art-check`

**C4** - Para cada inimigo de `combat.json` existem `web/art/sprite/enemy-<region>.json` e `web/public/art/sprite/enemy-<region>.png`; o PNG mede 32x32, exceto `torre` 48x48 e `nuvem` 64x64 (ART-01, AC 1, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "enemy"`

**C5** - Para cada item de `combat.json` existem `web/art/icon/item-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "item"`

**C6** - Para cada região de `regions.json` existem `web/art/background/battle-<id>.json` e o PNG 320x180 (ART-01, AC 2, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "battle background"`

**C7** - No Bug Fight, `.battle-sprite` mostra `<img>` `src="/art/sprite/enemy-<region>.png"` `alt=<enemy.name>`: em `vila` `alt="NULL SLIME"` `width=128` (32×4), em `torre` `width=144` (48×3), em `nuvem` `width=128` (64×2); após `error` mostra o glifo `(0x0)` (ART-03, AC 6, 5) ✅
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "enemy sprite"`

**C8** - A seção `.battle` tem `background-image: url(/art/background/battle-<region>.png)` da região do encontro, table-driven sobre as 6 regiões (ART-03, AC 6) ✅
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "battle background"`

**C9** - Cada botão de consumível do Bug Fight mostra `<img>` `src="/art/icon/item-<id>.png"` `alt=""` `width=32`, e o texto do glifo não aparece; após `error` mostra o glifo (`HP+`) (ART-03, AC 7, 5) ✅
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "potion art"`

**C10** - Na LOJA, cada cartão de item mostra `/art/icon/item-<id>.png` `alt=""` `width=32`, e o detalhe do item selecionado `width=64`; após `error` o cartão mostra o glifo (ART-04, AC 8, 5) ✅
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "item art"`

**C11** - No AVATAR, a célula de item da grade mostra `/art/icon/item-<id>.png` `alt=<item.name>` `width=32` e o detalhe do item `alt=""` `width=32`; após `error` a célula mostra o glifo (ART-04, AC 9, 5) ✅
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "item art"`

### S2 - loja, skills, deploy e HUD · 12 files · ~151 KB · ~38k read (+ 24 specs, previews)

**C12** - Para cada equipamento de `shop.json` `gear` existem `web/art/icon/gear-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "gear"`

**C13** - Para cada nó de `skills.json` existem `web/art/icon/skill-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "skill"`

**C14** - Para cada tipo de `deploys.json` `types` existem `web/art/icon/deploy-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "deploy"`

**C15** - Existem `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart`, `icon/hud-xp` (spec e PNG 16x16) (ART-01, AC 2, 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "hud"`

**C16** - Na LOJA, cada cartão de equipamento mostra `/art/icon/gear-<id>.png` `alt=""` `width=32`, e o detalhe do selecionado `width=64`; após `error` o cartão mostra o glifo (`[Mac]`) (ART-04, AC 8, 5) ✅
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "gear art"`

**C17** - No AVATAR: célula de equipamento da grade `alt=<gear.name>` `width=32`; slot `setup` com `macbook` mostra `/art/icon/gear-macbook.png` `alt=""`; slot vazio mostra `[ ]` e nenhum `<img>`; detalhe do equipamento `alt=""`; célula de skin continua `HeroSprite` e o detalhe da skin continua `SKN`; após `error` o slot mostra `[Mac]` (ART-04, AC 9, 5) ✅
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "gear art"`

**C18** - Em SKILLS, os 9 botões de nó mostram `/art/icon/skill-<id>.png` `alt=""` `width=32`; cada chip de ativa no rodapé mostra o mesmo ícone `alt=""`; após `error` o nó mostra o glifo (ART-05, AC 10, 5) ✅
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "skill art"`

**C19** - O HUD mostra, para cada skill ativa (`["f1"]`, `["f1","b2","i3"]`), `<img>` `src="/art/icon/skill-<id>.png"` `alt=<node.name>` `width=32`; sem skills mostra `sem habilidades ativas` e nenhum `<img>` de skill; após `error` o chip mostra o glifo (ART-05, AC 10, 5) ✅
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "skill art"`

**C20** - O HUD mostra `/art/icon/hud-xp.png` no cartão do `XP`, `hud-heart` no do `HP`, `hud-coin` no de `COINS`, `hud-gem` no de `GEMS`, cada um `alt=""` `width=32` (ART-07, AC 16) ✅
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "currency art"`

**C21** - Em DEPLOY, cada botão de tipo mostra `/art/icon/deploy-<id>.png` `alt=""` `width=32` antes do nome; o nome acessível do botão é exatamente `t.name` (`BACKEND`) e o texto não contém o glifo; após `error` mostra o glifo (`$_`) (ART-05, AC 11, 5) ✅
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "deploy art"`

**C22** - No browser real, depois do login, o `<img src="/art/icon/hud-coin.png">` do HUD carrega com `naturalWidth` = 16 (ART-07, AC 16; door 1, servido de `web/public`) ✅
Proof: `cd web && npx playwright test e2e/shell.spec.ts -g "hud art loads"`

### S3 - servidor, escritório e mapa · 8 files · ~128 KB · ~32k read (+ 27 specs, previews)

**C23** - Para cada componente de `rack.json` existem `web/art/icon/rack-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "rack"`

**C24** - Para cada móvel de `office.json` existem `web/art/icon/office-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "office"`

**C25** - Para cada região de `regions.json` existem `web/art/icon/region-<id>.json` e o PNG 16x16 (ART-01, AC 1, 3)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "region"`

**C26** - Existem `background/world`, `background/office`, `background/server` (spec e PNG 320x180) (ART-01, AC 2, 3)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "scene background"`

**C27** - Em SERVER: slot com `gpu` mostra `/art/icon/rack-gpu.png` `alt=""` `width=32` sobre `background: #45b7ff`; slot vazio mostra `-` sem `<img>`; slot com id fora do catálogo mostra `?` sem `<img>`; cada cartão da loja mostra `/art/icon/rack-<id>.png` `alt=""`; após `error` o slot mostra o glifo (`#`) (ART-06, AC 12, 5)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "rack art"`

**C28** - A seção `.server` tem `background-image: url(/art/background/server.png)` (ART-06, AC 12)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "server background"`

**C29** - Em OFFICE: cada cartão da loja mostra `/art/icon/office-<id>.png` `alt=""` `width=32`; o detalhe do selecionado idem; célula com `mesa` mostra `office-mesa.png` `alt=""`; célula vazia mostra `+` sem `<img>`; célula com id fora do catálogo mostra `?` sem `<img>`; após `error` o cartão mostra o glifo (`[==]`) (ART-06, AC 13, 5)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "furniture art"`

**C30** - `.office-room` tem `background-image: url(/art/background/office.png)` (ART-06, AC 13)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "office background"`

**C31** - No MUNDO, cada um dos 6 nós mostra `/art/icon/region-<id>.png` `alt=""` `width=32` e nenhum `.node-diamond`; `.world-map` tem `background-image: url(/art/background/world.png)`; após `error` o nó mostra o texto do `tag` da região (`HUB`) (ART-07, AC 14, 5)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "region art"`

**C32** - Com jogador nível 5 em `floresta`: marcadores de `torre` (8) e `nuvem` (12) têm `filter: grayscale(1) brightness(.6)`; `vila` (1), `mercado` (2) e `caverna` (5) não têm filtro; `floresta` tem a classe `here` e nenhum filtro (ART-07, AC 15)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "marker state"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GameArt` kind -> address (9) | `item` C1 · `gear` C1 · `skill` C1 · `deploy` C1 · `rack` C1 · `office` C1 · `region` C1 · `hud` C1 · `enemy` C1 | - |
| enemy native size (3) | 32 C1 · 48 C1 · 64 C1 | - |
| enemy display scale in the battle (3) | ×4 `vila` C7 · ×3 `torre` C7 · ×2 `nuvem` C7 | - |
| asset groups on disk (11) | enemy C4 · item C5 · battle bg C6 · gear C12 · skill C13 · deploy C14 · hud C15 · rack C23 · office C24 · region C25 · scene bg C26 | - |
| screen sites showing catalog art (17) | enemy C7 · potion C9 · shop item C10 · avatar item C11 · shop gear C16 · avatar gear cell C17 · avatar slot C17 · skill node C18 · skills foot chip C18 · hud skill chip C19 · deploy type C21 · rack slot C27 · rack card C27 · office card C29 · office detail C29 · office cell C29 · map node C31 | - |
| fallback to glyph per screen (9) | Battle C7, C9 · Shop C10, C16 · Avatar C11, C17 · Skills C18 · Hud C19 · Deploy C21 · Server C27 · Office C29 · World C31 · `GameArt` itself C2 | - |
| `alt=<name>` sites (3) | enemy sprite C7 · avatar grid cell C11, C17 · hud skill chip C19 | - |
| scene backgrounds (9) | `battle-vila` C8 · `battle-floresta` C8 · `battle-mercado` C8 · `battle-caverna` C8 · `battle-torre` C8 · `battle-nuvem` C8 · `world` C31 · `office` C30 · `server` C28 | - |
| map marker state (3) | here C32 · open C32 · locked C32 | - |
| text markers kept (4) | `?` C27, C29 · `+` C29 · `-` C27 · `[ ]` C17 | - |
| HUD fixed icons (4) | `hud-xp` C20 · `hud-heart` C20 · `hud-coin` C20, C22 · `hud-gem` C20 | - |
| Landing doors (3) | door 1 address C1, C4-C6, C12-C15, C22-C26 · door 2 `GameArt` C1, C2 · door 3 versioned PNG C3 | - |

- Claims naming a browser-served path: C22 - crosses the real Next static server
- No other check claims more than the single case its proof exercises

## Test policy

`AGENTS.md` `## Test policy` answers both questions for `web`; its rows apply unchanged. Evidence per
decision in this change:

- `GameArt`: kind -> category (2 branches: `enemy` vs icon), native size (3 rows: 16, 32/48/64 by enemy id), error -> fallback (1 state) - decides, reached only by screens -> own layer, C1, C2
- `BattleScene` enemy scale: 3 rows (native 32/48/64 -> ×4/×3/×2) - decides -> own layer, C7
- `WorldScene` marker state: 3 rows (here / open / locked) - decides -> own layer, C32
- the screens' `alt` choice: 2 rows (`""` / `name`) per site - decides -> each site's check
- art files: completeness per catalog kind is a set, not code -> C4-C6, C12-C15, C23-C26
- closest analogue: `HeroSprite.tsx` + `AvatarScene.test.tsx` (sprite with inline `filter`, proven at screen level)

## Swept

- validation: C1 (kind -> address table), C4-C6, C12-C15, C23-C26 (size bounds per PNG)
- failure modes: C2, C7, C9-C11, C16-C19, C21, C27, C29, C31 (image fails to load -> glyph)
- idempotency: C3 (rendering the same specs twice gives byte-identical PNGs)
- authorization: existing - `/art/*` is public static like `/keyart.png`; screens stay behind `GameShell` login
- concurrency: n/a - static files and pure render; no shared state
- data lifecycle: C3 (a PNG with no spec or a spec with no PNG fails the `diff -r`); C4-C26 completeness fail on a catalog entry with no art
- dependency failure: C2 (static asset missing or 404 -> glyph)
- state transitions: C32 (marker here / open / locked follows `player.level` and `player.region`)
- observability: n/a - no runtime logic beyond rendering; nothing to log

## Handoff

Intended split, with the arithmetic (`wc -c` / 4), written before any code:

- shared read every builder pays: skill refs + examples + `helpers.ts` + `globals.css` = 53 KB ≈ 13k
- S1: Battle + Shop + Avatar (components + tests) 61 KB ≈ 15k, + 21 specs written ≈ 8k, + GameArt/art test/Makefile ≈ 5k, ×1.5 for edits and re-runs ≈ 62k, + preview images (3 sheets × 3 passes + keyart) ≈ 20k -> ~82k
- S2: Shop + Avatar re-read 41 KB + Skills, Hud, GameShell, Deploy 49 KB = 90 KB ≈ 23k, + 24 specs ≈ 9k, ×1.5 ≈ 48k, + previews ≈ 20k -> ~68k (Shop/Avatar reads are the diff S1 left, so ~76k with the diff)
- S3: Server + Office + World 49 KB ≈ 12k + 27 specs (3 backgrounds larger) ≈ 12k, ×1.5 ≈ 56k + previews ≈ 25k -> ~81k
- S1+S2 = 158k > 150k and S2+S3 = 157k > 150k -> three builders, hand off after S1 and after S2; each boundary changes the surface (combat -> shop/HUD -> rooms/map)
- **Boundary:** C1-C11 closed at `edf5239` (`GameArt` `6e7525a`, art + `make art-check` + `art.test.tsx` `42599fa`, battle/shop/avatar wiring `edf5239`); every S1 proof, `npx vitest run` (247), `tsc --noEmit` and `eslint src` green at that commit. For S2/S3: add groups to `web/src/lib/art.test.tsx` with `expectAssets` and a test name that contains only your filter word (office has an id `rack`, so keep ids out of test names); `GameArt` fallback only persists if the art is not inside a component declared during render (see `BattleScene` `enemyCard`); `.shop-glyph` 36px, `.shop-detail-glyph` 70px and `.avatar-detail-glyph` 36px already fit ×2 / ×4 art for the gear sites
- **Settled mid-build:** nothing asked of the user. Builder choices: `.battle` background from an inline `backgroundImage` on the section plus `center / 1280px 720px no-repeat` and `image-rendering: pixelated` in `globals.css` (plan `Flow` 4 updated); `EnemyCard` turned into a render function so a failed sprite stays on the glyph, which exposed `react-hooks/set-state-in-effect` on the existing `start()` effect, silenced with the same comment `DeployScene`/`GameShell` use
- **Abandoned:** nothing
