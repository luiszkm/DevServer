# Assets checks

Profile: standard
Plan: `.specs/features/assets/plan.md`

48 checks in 5 slices · 6 one-way doors · 0 open

Asset tables used by the checks (door 1, literal):

- ui (24x24): `ui-panel`, `ui-panel-wood`, `ui-btn-wood`, `ui-btn-wood-press`, `ui-btn-dark`, `ui-btn-dark-press`, `ui-btn-green`, `ui-btn-green-press`, `ui-bubble`, `ui-bar`
- btn (icon 16x16): `build`, `deploy`, `play`, `rank`, `start`, `settings`, `shop`, `exit`
- ic (icon 16x16): `code`, `cloud`, `server`, `gear`, `trophy`, `star`, `crown`, `laptop`, `database`, `shield`, `lock`, `file`, `wrench`, `chart`, `sp`
- medal (icon 16x16): `bronze`, `prata`, `ouro`, `azul`, `roxo`, `rubi`
- logo: `sprite/logo` 160x64
- prop (sprite 32x32): `laptop`, `macbook`, `rack`, `caixa`, `caixa-aberta`, `monitor`, `roteador`, `planta`, `caneca`, `livros`, `bloco-grama`, `terminal`, `torre`, `gema-pedestal`, `modem`
- build (sprite): `server-hut` 96x96; `rack`, `tenda`, `antena`, `placa-code`, `flag`, `placa` 32x32
- mob (sprite 32x32): `slime`, `slime-verde`, `monstro`, `robo`; npc: `dev`
- extra (sprite 32x32): `placa`, `fogueira`, `lampada`, `banco`, `bau`, `bau-aberto`, `bandeira`
- fx (128x32): `dust`, `sparkle`, `teleport`, `fire`, `loading`, `collect`
- scene (background 320x180): `dia`, `noite`, `floresta`, `dungeon`
- tile (tile 32x32, opaque): `grama-topo`, `grama`, `grama-borda`, `terra`, `pedra`, `tijolo`, `tabua`, `parede-madeira`, `areia`; (tile 128x32, 4 frames): `agua`, `agua-funda`, `cachoeira`
- tile decal (sprite): `tile-arbusto`, `tile-flor`, `tile-arvore`, `tile-cerca` 32x32; `tile-arvore-grande` 64x64
- hero strip (anim 192x64): every `web/public/art/sprite/hero/*.png` × `idle`, `walk`, `run`, `jump`, `interact`

Completeness tests (C9-C12, C27-C28, C37-C38, C40) read the tables above as literals in the test and build
paths from the door 1 pattern, never from `GameArt`; C40 lists the hero layers from disk, so a new
avatar layer with no strips turns it red.

## Checks

### S1 - pipeline · 7 files · 54 KB · ~14k

**C1** - `render.py` with a `category: "tile"` spec of 32x32 and of 128x32 reports no size `WARN`; a tile spec with one transparent pixel reports `ERROR` and the run exits `1` (AST-01, AC 1; door 2) ✅
Proof: `python3 .claude/skills/pixel-assets/scripts/test_render.py -k tile`

**C2** - `render.py` with a `category: "anim"` 192x64 spec reports no size `WARN`; it reports one `WARN` naming the frame for (a) a frame with a pixel on its 1px margin of the 48x64 cell, (b) an empty frame, (c) two identical frames; a clean 4-frame strip reports `ok` (AST-01, AC 2; door 2) ✅
Proof: `python3 .claude/skills/pixel-assets/scripts/test_render.py -k anim`

**C3** - an `fx` 128x32 strip still reports the margin, empty and identical `WARN`s on 32x32 cells, and a clean one reports `ok` (AST-01, AC 3) ✅
Proof: `python3 .claude/skills/pixel-assets/scripts/test_render.py -k fx`

**C4** - a `{"use": ..., "clip": [2, 3, 4, 5], "at": [10, 0]}` op paints exactly the source pixels in x 2..5, y 3..7 at x 10..13, y 0..4 of the destination, and no pixel outside that box changes (AST-01, AC 4) ✅
Proof: `python3 .claude/skills/pixel-assets/scripts/test_render.py -k clip`

**C5** - `category: "sprite"` specs of 96x96, 64x64 and 160x64 report no size `WARN`; 100x100 reports one (AST-01, AC 5; door 2) ✅
Proof: `python3 .claude/skills/pixel-assets/scripts/test_render.py -k sprite_size`

**C6** - `make art-check` exits `0` and prints `art ok` (AST-01, AC 6; door 3 of game-art) ✅
Proof: `make art-check`

**C7** - `hero_anim.py` writes `web/art/sprite/hero/anim/<layer>-<anim>.json` for every layer spec in `web/art/sprite/hero/` × the 5 anims, each `category: "anim"` 192x64; IF a layer is not assigned to a region group in `_poses.json` THEN it exits `1` naming the layer and writes nothing (AST-07, AC 27; door 4)
Proof: `python3 .claude/skills/pixel-assets/scripts/test_render.py -k hero_anim`

**C8** - `artSrc`/`nativeSize` for the new kinds: `btn`, `ic`, `medal` → `/art/icon/<kind>-<id>.png` at 16; `prop`, `build`, `mob`, `npc`, `extra` → `/art/sprite/<kind>-<id>.png` at 32, except `build` `server-hut` at 96; the old kinds keep their paths (AST-02, AC 7; door 1) ✅
Proof: `cd web && npx vitest run src/components/GameArt.test.tsx -t "new kinds"`

### S2 - UI, ícones e logo · 22 files · ~228 KB shared with S3/S4 · ~30k

**C9** - each of the 10 ui pieces has `web/art/ui/<name>.json` and a 24x24 PNG in `web/public/art/ui/` (AST-02, AC 7; door 1)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "chrome piece"`

**C10** - each of the 8 `btn-*` and 15 `ic-*` has spec and a 16x16 PNG in `icon/` (AST-02, AC 7)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "button and generic icon"`

**C11** - each of the 6 `medal-*` has spec and a 16x16 PNG in `icon/` (AST-02, AC 7)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "medal"`

**C12** - `sprite/logo` has spec and a 160x64 PNG (AST-02, AC 7)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "logo"`

**C13** - in the browser, `.panel` and `.hud-card` have computed `border-image-source` containing `/art/ui/ui-panel.png`, `.btn-yellow` `ui-btn-wood.png`, `.btn-dark` `ui-btn-dark.png`, `.btn-green` `ui-btn-green.png`; each has `border-image-slice` `8 fill` and `image-rendering` `pixelated` (AST-02, AC 8; door 6)
Proof: `cd web && npx playwright test e2e/assets.spec.ts -g "chrome 9-slice"`

**C14** - with the mouse held down on a `.btn-yellow`, `.btn-dark` and `.btn-green`, computed `border-image-source` contains `ui-btn-wood-press.png`, `ui-btn-dark-press.png`, `ui-btn-green-press.png` respectively (AST-02, AC 9; door 6)
Proof: `cd web && npx playwright test e2e/assets.spec.ts -g "pressed"`

**C15** - `GameShell` header shows `img` `alt="DevServer"` `src="/art/sprite/logo.png"` `width=160` `height=64` with class `pixelated`, and no text `DEV`/`SERVER` (AST-02, AC 10)
Proof: `cd web && npx vitest run src/components/GameShell.test.tsx -t "logo"`

**C16** - `LoginScreen` `h1` has accessible name `DevServer` and holds `img` `src="/art/sprite/logo.png"` `width=320` `height=128` (AST-02, AC 10)
Proof: `cd web && npx vitest run src/components/LoginScreen.test.tsx -t "logo"`

**C17** - HUD: the `SAIR` button keeps accessible name `SAIR` and holds `img` `src="/art/icon/btn-exit.png"` `alt=""` `width=16`; `SKILL PTS` is preceded by `img` `src="/art/icon/ic-star.png"` `alt=""` `width=16` (AST-03, AC 11)
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "exit and skill points icons"`

**C18** - SKILLS: a locked node shows `img` `src="/art/icon/ic-lock.png"` `alt=""` `width=16` before `BLOQ.`; an unlockable node shows no lock (AST-03, AC 12)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "lock icon"`

**C19** - MUNDO: a region with `player.level < minLevel` shows `ic-lock` before `REQUER NÍVEL n`; an open region shows none (AST-03, AC 12)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "lock icon"`

**C20** - DEPLOY: a locked level shows `ic-lock` before `NÍVEL n`; an open level shows none (AST-03, AC 12)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "lock icon"`

**C21** - LOJA: a coin price card shows `img` `src="/art/icon/hud-coin.png"` `alt=""` `width=16` before the number, a gem price card `hud-gem.png` (AST-03, AC 13)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "price icon"`

**C22** - OFFICE: a coins price tag shows `hud-coin`, a gems price tag `hud-gem`, both `alt=""` 16px before the number (AST-03, AC 13)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "price icon"`

**C23** - SERVER: a component shop card shows `hud-coin` `alt=""` 16px before its price (AST-03, AC 13)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "price icon"`

**C24** - OFFICE: for office levels 1..5 the level name is preceded by `img` `src="/art/icon/medal-<m>.png"` `alt=""` `width=32` with `<m>` = `bronze`, `prata`, `ouro`, `azul`, `roxo`, table-driven over the 5 levels (AST-03, AC 14)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "level medal"`

**C25** - SERVER: POWER is preceded by `ic-chart`, RAM by `ic-database`, UPTIME by `ic-shield`, all `alt=""` 16px (AST-03, AC 15)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "stat icons"`

**C26** - Bug Fight: the hero SP line is preceded by `img` `src="/art/icon/ic-sp.png"` `alt=""` `width=16` (AST-03, AC 15)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "sp icon"`

**C27** - HUD: after `error` on the `btn-exit` image, the button has no `img`, its text is exactly `SAIR`, and no other element is added to it (AST-03, AC 16)
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "icon fails"`

### S3 - peças do mundo, efeitos e NPCs · shared files · ~20k

**C28** - each prop, build, mob, npc and extra of the door 1 table has spec and PNG in `sprite/` at its native size (`build-server-hut` 96x96, all others 32x32) (AST-04, AC 17)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "world piece"`

**C29** - each new fx (`dust`, `sparkle`, `teleport`, `fire`, `loading`, `collect`) has spec and a 128x32 PNG in `fx/` (AST-04, AC 17)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "new effect"`

**C30** - WHILE loading, `GameShell`, `Hud`, Bug Fight, DEPLOY and Onboarding each render `CARREGANDO...` and a `span.fx-loading` `aria-hidden="true"` with inline `background-image` `url(/art/fx/loading.png)` (AST-04, AC 18)
Proof: `cd web && npx vitest run src/components/GameShell.test.tsx -t "loading fx"`
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "loading fx"`
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "loading fx"`
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "loading fx"`
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "loading fx"`

**C31** - in the browser, `.fx-loading` has computed `animation-iteration-count` `infinite` and `image-rendering` `pixelated`; with `prefers-reduced-motion: reduce` its `animation-name` is `none` (AST-04, AC 18; AC 32)
Proof: `cd web && npx playwright test e2e/assets.spec.ts -g "loading loops"`

**C32** - DEPLOY: WHILE a job is ready, `COLETAR RECOMPENSA` keeps its accessible name and holds `img` `src="/art/sprite/extra-bau.png"` `alt=""` `width=32` (AST-04, AC 19)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "chest closed"`

**C33** - DEPLOY: WHEN the claim POST answers `200` THEN `img` `src="/art/sprite/extra-bau-aberto.png"` `alt=""` `width=64` and a `[data-fx="collect"]` with `url(/art/fx/collect.png)` appear; WHEN it answers an error THEN neither appears (AST-04, AC 20)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "chest opens"`

**C34** - MUNDO: exactly one `img` `src="/art/sprite/build-flag.png"` `alt=""` `width=32` exists, inside the `.node-marker.here` of `player.region` (AST-05, AC 21)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "flag"`

**C35** - MUNDO: WHEN travel answers `200` THEN a `[data-fx="teleport"]` with `url(/art/fx/teleport.png)` appears in the new region's `.map-node`; WHEN travel answers an error THEN none appears (AST-05, AC 22)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "teleport"`

**C36** - LOJA shows `img` `alt="lojista"` `src="/art/sprite/npc-dev.png"` `width=64` and the text `FORJE GEAR COM OS DROPS DO BUG FIGHT!`; SERVER shows `img` `alt="robô"` `src="/art/sprite/mob-robo.png"` `width=64` (AST-05, AC 23, 24)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "npc"`
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "robot"`

### S4 - cenários e tileset · shared files · ~8k

**C37** - `scene-dia`, `scene-noite`, `scene-floresta`, `scene-dungeon` have spec and a 320x180 PNG in `background/` with every pixel alpha `255` (AST-06, AC 25)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "new scene"`

**C38** - each tile of the door 1 table has spec and PNG in `tile/` (32x32, or 128x32 for `agua`, `agua-funda`, `cachoeira`) with every pixel alpha `255`, and each tile decal has spec and PNG in `sprite/` at its size (AST-06, AC 25)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "tileset"`

**C39** - `section.scene` has inline `background-image` `url(/art/background/scene-dia.png)` on DEPLOY, `scene-noite` on SKILLS, `scene-floresta` on AVATAR, `scene-dungeon` on LOJA; in the browser each has `background-size` `1280px 720px` and `image-rendering` `pixelated` (AST-06, AC 26)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "scene background"`
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "scene background"`
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "scene background"`
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "scene background"`
Proof: `cd web && npx playwright test e2e/art.spec.ts -g "scene art scale"`

### S5 - herói animado · 8 files · ~56 KB · ~14k (+ generated specs)

**C40** - for every `web/public/art/sprite/hero/*.png` and each anim of `idle`, `walk`, `run`, `jump`, `interact`, `web/art/sprite/hero/anim/<layer>-<anim>.json` and a 192x64 PNG `web/public/art/sprite/hero/anim/<layer>-<anim>.png` exist (AST-07, AC 27; door 3)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "hero strip"`

**C41** - `heroFrame(layer, anim, i)` returns `src` `/art/sprite/hero/anim/<layer>-<anim>.png` and source rect x = `48·i`, y = `0`, 48x64, with the same `swap` as the static layer; for `i` = 0..3 (AST-07, AC 28)
Proof: `cd web && npx vitest run src/lib/avatar.test.tsx -t "strip frame"`

**C42** - `HeroAvatar` with `anim="walk"` has `data-anim="walk"` and `data-frame` `0`, then `1`, `2`, `3`, `0` after each 166 ms (fake timers) (AST-07, AC 29; door 5)
Proof: `cd web && npx vitest run src/components/HeroAvatar.test.tsx -t "advances"`

**C43** - WHEN `anim` changes from `walk` at frame 2 to `run` THEN `data-frame` is `0` and `data-anim` is `run`, and a strip load of the old anim that resolves afterwards paints nothing (AST-07, AC 30)
Proof: `cd web && npx vitest run src/components/HeroAvatar.test.tsx -t "restarts"`

**C44** - IF the strip of one layer fails to load THEN the canvas draws that layer's static PNG at 0,0 and the other layers from their strips, and `data-frame` keeps advancing (AST-07, AC 31)
Proof: `cd web && npx vitest run src/components/HeroAvatar.test.tsx -t "strip fails"`

**C45** - WHILE `matchMedia("(prefers-reduced-motion: reduce)")` matches, `HeroAvatar` with `anim="run"` loads only static layer PNGs and `data-frame` stays `0` after 1000 ms (AST-07, AC 32)
Proof: `cd web && npx vitest run src/components/HeroAvatar.test.tsx -t "reduced motion"`

**C46** - `HeroAvatar` without `anim` loads only static layer PNGs, has no `data-frame`, and schedules no timer (AST-08, AC 34)
Proof: `cd web && npx vitest run src/components/HeroAvatar.test.tsx -t "static"`

**C47** - Bug Fight hero `data-anim`, table-driven: beat `lunge` → `run`, beat `cast` → `interact`, `battle.status` `won` → `jump`, no beat → `idle`, beat `hit` → `idle` (AST-08, AC 33)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "hero anim"`

**C48** - AVATAR preview `data-anim="idle"`; DEPLOY hero `interact` with a running job and `idle` with a ready one; MUNDO hero beside the current marker `idle`, and `walk` while the travel POST is pending (AST-08, AC 33)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "hero anim"`
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "hero anim"`
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "hero anim"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| renderer categories changed (4) | `tile` C1 · `anim` C2 · `fx` C3 · `sprite` C5 | - |
| strip warnings per strip category (6) | anim: margin C2 · empty C2 · identical C2; fx: margin C3 · empty C3 · identical C3 | - |
| new `ArtKind`s (8) | C8, table-driven over `btn` `ic` `medal` `prop` `build` `mob` `npc` `extra` | - |
| door 1 asset groups (13) | ui C9 · btn C10 · ic C10 · medal C11 · logo C12 · prop C28 · build C28 · mob/npc C28 · extra C28 · fx C29 · scene C37 · tile C38 · tile decal C38 | - |
| chrome classes (5) | `.panel` C13 · `.hud-card` C13 · `.btn-yellow` C13 · `.btn-dark` C13 · `.btn-green` C13 | - |
| pressed pieces (3) | wood C14 · dark C14 · green C14 | - |
| logo sites (2) | GameShell C15 · LoginScreen C16 | - |
| lock sites (3) | SKILLS C18 · MUNDO C19 · DEPLOY C20 | - |
| price sites (4) | LOJA coin C21 · LOJA gem C21 · OFFICE coins/gems C22 · SERVER C23 | - |
| office levels → medal (5) | C24, table-driven over 1..5 | - |
| stat icons (5) | SKILL PTS C17 · POWER C25 · RAM C25 · UPTIME C25 · SP C26 | - |
| loading sites (5) | GameShell C30 · Hud C30 · Bug Fight C30 · DEPLOY C30 · Onboarding C30 | - |
| chest states (3) | ready C32 · claim `200` C33 · claim error C33 | - |
| travel outcomes (2) | `200` C35 · error C35 | - |
| scene backgrounds (4) | DEPLOY C39 · SKILLS C39 · AVATAR C39 · LOJA C39 | - |
| anims (5) | `idle` C40 · `walk` C40 · `run` C40 · `jump` C40 · `interact` C40 | - |
| `HeroAvatar` modes (5) | anim C42 · anim change C43 · strip failure C44 · reduced motion C45 · no anim C46 | - |
| Bug Fight beat → anim (5) | `lunge` C47 · `cast` C47 · `won` C47 · none C47 · `hit` C47 | - |
| other anim sites (5) | AVATAR idle C48 · DEPLOY running C48 · DEPLOY ready C48 · MUNDO idle C48 · MUNDO pending C48 | - |
| Landing doors (6) | 1 C8-C12, C28-C29, C37-C38 · 2 C1, C2, C5 · 3 C40 · 4 C7 · 5 C42-C46 · 6 C13, C14 | - |

- Claims about a computed style (`border-image`, `animation`, `background-size`): C13, C14, C31, C39 - each has a browser proof, because jsdom never loads `globals.css`
- No other check claims more than the cases its proof exercises

## Test policy

Answered by `AGENTS.md` `## Test policy`; the rows below are its application here, not new rules.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence:

- `render.py` `SIZES` + `check` + strip checker: size table over 6 categories, opacity by category, 3 strip rules × 2 cell sizes -> decides; C1-C5 at its own layer (Python `unittest`, no precedent in the skill; closest analogue by shape is `web/src/lib/art.test.tsx` asserting PNG facts from disk)
- `hero_anim.py`: one branch (layer unassigned → exit `1`) plus the layer × anim product -> decides; C7
- `GameArt.tsx` `artSrc`/`nativeSize`: kind → category map, 18 kinds, 3 size rules -> decides; C8 table-driven (precedent: game-art C1)
- `HeroAvatar.tsx`: anim present / absent / reduced motion / strip failed, frame clock -> decides, 5 branch points; C42-C46
- `BattleScene.tsx` beat → anim: 5-row table -> decides; C47
- `OfficeScene.tsx` level → medal: 5-row table -> decides; C24
- screen wiring of a fixed icon next to a text (C17-C23, C25, C26): single mapping, no conditional beyond the existing locked flag -> proven at the screen, where the locked flag is decided

Cost: 7 Python tests across 1 new file; one new `HeroAvatar.test.tsx`; one new `LoginScreen.test.tsx`; one new `e2e/assets.spec.ts`.

## Swept

- validation: C1, C2, C5 - the renderer's size and opacity bounds per category
- failure modes: C27 (icon fails, text stays), C44 (strip fails, static layer), C33 (claim error, no chest)
- idempotency: C6 - re-rendering the same specs yields byte-identical PNGs
- authorization: existing - `/art/*` is public static like `keyart.png`; `GameShell` redirects to `/login` before any scene
- concurrency: C43 - an old anim's strip that resolves after the anim changed paints nothing
- data lifecycle: n/a - no stored data; PNGs are versioned build output of their specs
- dependency failure: C44, C27 - an image that fails to load is the only dependency; each degrades to what was there before
- state transitions: C32-C33 (chest closed → open), C35 (travel → teleport), C43 (anim → anim, frame reset), C47 (beat → anim)
- observability: n/a - static assets and client animation; no logging or metric requirement in the plan

## Handoff

Intended split, with the arithmetic, written before any code:

- S1 = ~14k (render.py 25 KB, references 20 KB, GameArt + tests 9 KB); S2-S4 = ~58k (globals.css + 11 scenes + 10 tests + e2e = 228 KB, read once and shared); S5 = ~14k (HeroAvatar, AvatarScene, Onboarding, avatar.ts, battleFx.ts + tests = 56 KB). Total ~86k plus art specs and previews, under the 150k budget -> one builder, no handoff
