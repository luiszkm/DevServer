# Game art verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: c29a975..3d6b472
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Two gaps fail the feature. Every other check is proven and every mutant was killed:

1. **Door 3 / C3.** `make art-check` exits `0` only in this working copy. The renderer it calls
   (`.claude/skills/pixel-assets/scripts/render.py`, plus `png.py` and `references/palette.json`)
   has never been tracked on any branch: `git ls-tree -r --name-only` finds 0 `.claude/` paths on
   `main`, `c29a975` or `HEAD`, and `git log --all -- .claude` is empty. In a clean
   `git worktree` of `3d6b472`, `make art-check` fails with `can't open file
   '.../.claude/skills/pixel-assets/scripts/render.py'` and `make: *** [art-check] Error 2`.
   A proof's green has to be a property of the commit. `node_modules` can be rebuilt from
   `package-lock.json`, but nothing in the commit can rebuild the renderer, so door 3's
   "reproduzido por `python3 .claude/skills/pixel-assets/scripts/render.py ...`" does not hold for
   anyone who clones the repo.
2. **Background scale and `pixelated` are unproven.** The plan fixes "fundo ×4 (1280x720)" in
   Assumptions and repeats it in Flow 4, and AC 17 says "toda arte". The four scene elements get
   that only from `globals.css` (`center / 1280px 720px no-repeat; image-rendering: pixelated` at
   `web/src/app/globals.css:104,163,285,307`). jsdom never loads that file, and no Playwright test
   reads the computed style: `rg "backgroundSize|imageRendering|background-size|image-rendering|1280"`
   over `*.test.tsx` and `*.spec.ts` returns nothing. The CSS could be deleted and every proof
   would stay green.

## Binding sources

Step 1 is not owed under `standard`. The only binding source compared was the inventory authority,
used for the Coverage recompute below.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `api/catalog/*.json` (inventory) | yes, parsed by script: 53 `glyph` entries (`combat` 15, `deploys` 5, `office` 12, `rack` 6, `shop` 6, `skills` 9) + 6 `regions` | none | - |
| `web/public/keyart.png` + `style-guide.md` (style) | not opened; step 1 not owed under `standard` | not assessed | - |

## Checks

All vitest proofs ran in one invocation at `3d6b472`: 11 files, the `-t` alternation of every
check filter, `--reporter=verbose` and JSON output. **78 passed, 0 failed, 137 skipped.** The
JSON was then split by each check's own (file, filter) pair. Every pair matched at least one test,
all `passed`, and the counts are shown per row. C3 was run in the real tree and in a clean
worktree. C22 ran under Playwright with Postgres up (`make db-up`).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `GameArt` address, native × scale, alt, `pixelated` | vitest `-t "address and size"`: 14 matched, 14 passed | `web/src/components/GameArt.test.tsx:24-28`: `expect(img.getAttribute("src")).toBe(src)`, `width`/`height` `.toBe(String(size))`, `alt` `.toBe("retrato")`, `className` `toContain("pixelated")`; table rows `:8-20` cover all 9 kinds, including `enemy torre x3 -> 144` (`:19`) and `nuvem x2 -> 128`; `:34` empty alt `.toBe("")` | PASS |
| C2 | on `error` the image goes and the `HP+` fallback appears | vitest `-t "fallback"`: 2 matched, 2 passed | `GameArt.test.tsx:42-44`: `fireEvent.error(img)`; `expect(container.querySelector("img")).toBeNull()`; `expect(screen.getByText("HP+")).toBeInTheDocument()` | PASS |
| C3 | `make art-check` exits 0: render to temp dir, no `ERROR`, `diff -r` empty | `make art-check` in the real tree: exit 0, 72 `ok`, 0 `WARN`/`ERROR`, `art ok`. Same command in a clean worktree of `3d6b472`: exit 2 | `Makefile:30-33` calls `python3 .claude/skills/pixel-assets/scripts/render.py`, which is untracked; `git ls-files .claude` is empty. Green only through files outside the commit (gap 1) | FAIL - exits 2 at the commit |
| C4 | enemy sprite spec + PNG per `combat.json` enemy, 32/48/64 | vitest `-t "enemy"` (art.test): 1 matched, passed | `web/src/lib/art.test.tsx:62-63` builds the list from `combat.enemies` with `ENEMY_SIZE[e.region] ?? [32, 32]` (`:57`: `torre: [48, 48], nuvem: [64, 64]`); `:33-35` `existsSync(spec)`/`existsSync(png)` `.toBe(true)`, `pngSize(png)` `.toEqual(size)` | PASS |
| C5 | item icon per `combat.json` item, 16x16 | vitest `-t "item"` (art.test): 1 matched, passed | `art.test.tsx:69`: `combat.items` mapped to `item-<id>` with `[16, 16]`, asserted at `:33-35` | PASS |
| C6 | `battle-<region>` per `regions.json`, 320x180 | vitest `-t "battle background"` (art.test): 1 matched, passed | `art.test.tsx:74`: `regions` mapped to `battle-<id>` with `[320, 180]`, asserted at `:33-35` | PASS |
| C7 | `.battle-sprite` img, src/alt/size per enemy, glyph after error | vitest `-t "enemy sprite"`: 4 matched, 4 passed | `web/src/components/BattleScene.test.tsx:291-294` table `vila NULL SLIME 128`, `torre RACE CONDITION 144`, `nuvem MEMORY LEAK ANCESTRAL 128`; `:300-304` `src` `.toBe(\`/art/sprite/enemy-${region}.png\`)`, `alt` `.toBe(name)`, `width`/`height` `.toBe(String(size))`; `:315-316` after error, img `toBeNull()` and `toHaveTextContent("(0x0)")` (still there after the next turn, `:320-321`) | PASS |
| C8 | `.battle` background per region, 6 rows | vitest `-t "battle background"`: 6 matched, 6 passed | `BattleScene.test.tsx:325,330`: `it.each(REGIONS...)`, `scene.style.backgroundImage...toBe(\`url(/art/background/battle-${region}.png)\`)` | PASS |
| C9 | potion img `alt=""` `width=32`, no glyph text, `HP+` after error | vitest `-t "potion art"`: 1 matched, passed | `BattleScene.test.tsx:341-345`: `src` `.toBe(\`/art/icon/item-${id}.png\`)`, `alt` `.toBe("")`, `width` `.toBe("32")`, `textContent).not.toContain(glyph)`; `:348-349` img `toBeNull()`, `toHaveTextContent("HP+")` | PASS |
| C10 | shop item card 32, detail 64, glyph after error | vitest `-t "item art"` (Shop): 1 matched, passed | `web/src/components/ShopScene.test.tsx:228-232` card `src`, `alt ""`, `width "32"`, no glyph; `:236-238` detail `width` `.toBe("64")`; `:241-242` `.shop-glyph` `toHaveTextContent("HP+")` | PASS |
| C11 | avatar item cell `alt=<name>` 32, detail `alt=""` 32, glyph after error | vitest `-t "item art"` (Avatar): 1 matched, passed | `web/src/components/AvatarScene.test.tsx:245-249` `alt` `.toBe(name)`, `width "32"`, no glyph; `:253-255` detail head `alt ""`, `width "32"`; `:259-260` `toHaveTextContent("++")` | PASS |
| C12 | gear icon per `shop.json` gear | vitest `-t "gear"` (art.test): 1 matched, passed | `art.test.tsx:79`: `icons(shop.gear...)`, asserted at `:33-35` | PASS |
| C13 | skill icon per `skills.json` node | vitest `-t "skill"` (art.test): 1 matched, passed | `art.test.tsx:84`: `skills.trees.flatMap(t => t.nodes)`, asserted at `:33-35` | PASS |
| C14 | deploy icon per `deploys.json` type | vitest `-t "deploy"` (art.test): 1 matched, passed | `art.test.tsx:89`, asserted at `:33-35` | PASS |
| C15 | `hud-coin/gem/heart/xp` spec + PNG 16x16 | vitest `-t "hud"` (art.test): 1 matched, passed | `art.test.tsx:94`: `icons(["hud-coin", "hud-gem", "hud-heart", "hud-xp"])`, asserted at `:33-35` | PASS |
| C16 | shop gear card 32, detail 64, `[Mac]` after error | vitest `-t "gear art"` (Shop): 1 matched, passed | `ShopScene.test.tsx:250-254` `src`/`alt ""`/`width "32"`/no glyph; `:258-260` detail `width` `.toBe("64")`; `:263-264` `.shop-glyph` `toHaveTextContent("[Mac]")` | PASS |
| C17 | avatar gear cell `alt=<name>`, setup slot, `[ ]`, detail, skin stays `HeroSprite`/`SKN`, `[Mac]` after error | vitest `-t "gear art"` (Avatar): 1 matched, passed | `AvatarScene.test.tsx:270-274` cell `alt` `.toBe(name)`, `width "32"`; `:278-280` detail `alt ""`; `:283-285` slot `setup` `src` `.toBe("/art/icon/gear-macbook.png")`, `alt ""`; `:286-287` `acessorio` img `toBeNull()`, text `.toBe("[ ]")`; `:291-295` skin `src` `.toBe("/hero.png")`, detail `.toBe("SKN")`; `:298-299` `toHaveTextContent("[Mac]")` | PASS |
| C18 | 9 skill nodes `alt=""` 32; foot chips same icon `alt=""`; glyph after error | vitest `-t "skill art"` (Skills): 1 matched, passed | `web/src/components/SkillsScene.test.tsx:151` `toHaveLength(9)`; `:154-158` `src`, `alt ""`, `width "32"`, glyph text `.toBe("")`; `:161` chips `.toEqual([".../skill-f1.png", ".../skill-b2.png", ".../skill-i3.png"])`, `:163-164` `alt ""`, `width "32"`; `:169` `toHaveTextContent("{}")` | PASS |
| C19 | HUD skill chips `alt=<name>` 32 for `["f1"]` and `["f1","b2","i3"]`; none -> text, no img; glyph after error | vitest `-t "skill art"` (Hud): 4 matched, 4 passed | `web/src/components/Hud.test.tsx:64-65` `src` and `alt` `.toEqual(skills.map(id => names[id]))`; `:67` `width "32"`; `:75-76` `sem habilidades ativas`, skill img `toBeNull()`; `:83-84` img `toBeNull()`, `toHaveTextContent("</>")` | PASS |
| C20 | `hud-xp`/`heart`/`coin`/`gem` in their cards, `alt=""` 32 | vitest `-t "currency art"`: 4 matched, 4 passed | `Hud.test.tsx:88-92` table label -> icon; `:95-99` `closest(".hud-card")` then `img[src="/art/icon/${icon}.png"]` `not.toBeNull()`, `alt` `.toBe("")`, `width` `.toBe("32")` | PASS |
| C21 | deploy img `alt=""` 32 before the name; accessible name `t.name`; no glyph; `$_` after error | vitest `-t "deploy art"`: 1 matched, passed | `web/src/components/DeployScene.test.tsx:370` `toHaveAccessibleName(t.name)`; `:372-375` `src`/`alt ""`/`width "32"`; `:377-378` name text `.toBe(t.name)`, no glyph; `:380` icon inside `name.firstElementChild`; `:385-386` `toHaveTextContent("$_")`, still `toHaveAccessibleName("BACKEND")` | PASS |
| C22 | real browser: HUD `hud-coin` loads, `naturalWidth` 16 | `npx playwright test e2e/shell.spec.ts -g "hud art loads"`: 1 passed | `web/e2e/shell.spec.ts:23,25`: locator `img[src="/art/icon/hud-coin.png"]` `toHaveCount(1)`; `expect.poll(... img.naturalWidth ...).toBe(16)` | PASS |
| C23 | rack icon per `rack.json` | vitest `-t "rack"` (art.test): 1 matched, passed | `art.test.tsx:99`, asserted at `:33-35` | PASS |
| C24 | office icon per `office.json` | vitest `-t "office"` (art.test): 1 matched, passed | `art.test.tsx:104`, asserted at `:33-35` | PASS |
| C25 | region icon per `regions.json` | vitest `-t "region"` (art.test): 1 matched, passed | `art.test.tsx:109`, asserted at `:33-35` | PASS |
| C26 | `world`/`office`/`server` backgrounds 320x180 | vitest `-t "scene background"`: 1 matched, passed | `art.test.tsx:114` `size: [320, 180]`, asserted at `:33-35` | PASS |
| C27 | server: `gpu` slot img over `#45b7ff`; `-` and `?` stay text; cards; `#` after error | vitest `-t "rack art"`: 1 matched, passed | `web/src/components/ServerScene.test.tsx:264-268` `src` `.toBe("/art/icon/rack-gpu.png")`, `alt ""`, `width "32"`, `toHaveStyle({ background: "#45b7ff" })`; `:271-274` `.toBe("-")`, `.toBe("?")` with no img; `:279-284` cards; `:288-290` `.toBe("#")` | PASS |
| C28 | `.server` background | vitest `-t "server background"`: 1 matched, passed | `ServerScene.test.tsx:297`: `backgroundImage...toBe("url(/art/background/server.png)")` | PASS |
| C29 | office card/detail/cell img `alt=""` 32; `+`/`?` stay text; `[==]` after error | vitest `-t "furniture art"`: 1 matched, passed | `web/src/components/OfficeScene.test.tsx:306-312` card `src`/`alt ""`/`width "32"`, no glyph, `style.color` `.toBe("")`; `:316-318` detail; `:322-324` cell `office-mesa.png`; `:325-328` `+` and `?` without img; `:331-332` `toHaveTextContent("[==]")` | PASS |
| C30 | `.office-room` background | vitest `-t "office background"`: 1 matched, passed | `OfficeScene.test.tsx:339-340`: `toHaveClass("office-room")`, `backgroundImage...toBe("url(/art/background/office.png)")` | PASS |
| C31 | 6 region markers `alt=""` 32, no `.node-diamond`, world background, `HUB` after error | vitest `-t "region art"`: 1 matched, passed | `web/src/components/WorldScene.test.tsx:123` `.node-diamond` `toBeNull()`; `:126-130` per `REGIONS` (6): `src`/`alt ""`/`width "32"`; `:133` `.toBe("url(/art/background/world.png)")`; `:137` `toHaveTextContent(/^HUB$/)` | PASS |
| C32 | level 5 in `floresta`: `torre`/`nuvem` filtered; `vila`/`mercado`/`caverna` (min 5) not; `floresta` `here` with no filter | vitest `-t "marker state"`: 1 matched, passed | `WorldScene.test.tsx:144` `style.filter` `.toBe(LOCKED)` with `:18` `LOCKED = "grayscale(1) brightness(.6)"`; `:146-147` `.toBe("")`, `not.toHaveClass("here")`; `:149-150` `toHaveClass("here")`, filter `""`. `caverna` at `minLevel === level` is the `>=` boundary | PASS |

Every proof is a test this feature added: `GameArt.test.tsx` and `art.test.tsx` are new, and every
scene test named above was added in the diff (`git diff c29a975..HEAD`).

Precision notes (non-failing):
- C20 proves each icon sits in the same `.hud-card` as its label, but not "ao lado de" (the order
  within the row).
- C29 proves that the catalog `color` no longer paints the card (`style.color` is `""`). The
  detail and the cell dropped it too (`OfficeScene.tsx:99,134`), but no test asserts it there.

## Coverage

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| art files per catalog entry + fixed (72) | `api/catalog/*.json` parsed by script: 6 enemies, 9 items, 6 gear, 9 skills, 5 deploys, 6 rack, 12 office, 6 region markers, 6 battle bg, 4 hud, 3 scene bg | 72 expected; on disk 72 specs and 72 PNGs, 0 missing, 0 extra, 0 size mismatch. Proven by C4, C5, C6, C12-C15, C23-C26, which read the catalog at test time (`art.test.tsx:16-18`) | - |
| `GameArt` kind -> address (9) | `ArtKind` union `GameArt.tsx:6`, `artSrc` `:11-13` | all 9 kinds in C1 rows `GameArt.test.tsx:8-20` | - |
| enemy native size (3) | `ENEMY_SIZE` `GameArt.tsx:9` + default 32 `:16` | 32 / 48 / 64: C1 (`:17-20`) | - |
| enemy battle scale (3) | `ENEMY_SCALE` `BattleScene.tsx:13` | ×4 / ×3 / ×2: C7 (`BattleScene.test.tsx:291-294`) | - |
| screen sites that rendered `glyph` at `c29a975` (20) + map node (1) | `git show c29a975:<file> \| rg -n glyph` over `web/src/components` | avatar grid C11/C17 · avatar slot C17 · avatar gear detail C17 · avatar item detail C11 · avatar skin detail `SKN` (kept as text) C17 · battle enemy C7 · battle potion C9 · deploy C21 · hud chip C19 · office card/detail/cell C29 · server slot/card C27 · shop item card/detail C10 · shop gear card/detail C16 · skills node/foot chip C18 · map node C31. Checks.md counted 17; its row omits the 4 detail sites, which C10/C11/C16/C17 do prove | - |
| fallback per AC 5 kind (8) | AC 5 list | enemy C7 · item C9, C10, C11 · gear C16, C17 · skill C18, C19 · deploy C21 · rack C27 · office C29 · region C31 · `GameArt` itself C2 | - |
| `alt=<name>` sites (3) vs `alt=""` sites | `rg "alt=" web/src/components` | name: `AvatarScene.tsx:95` C11/C17 · `BattleScene.tsx:180` C7 · `Hud.tsx:81` C19; `""`: asserted in each site's check (C9, C10, C16, C18, C20, C21, C27, C29, C31) | - |
| scene background URL (9) | plan AC 6, 12, 13, 14 | 6 × `battle-*` C8 · `server` C28 · `office` C30 · `world` C31 | - |
| scene background scale ×4 + `pixelated` (4 elements) | plan Assumptions "fundo ×4 (1280x720)", Flow 4, AC 17 "toda arte"; code `globals.css:104,163,285,307` | `.battle` · `.server` · `.office-room` · `.world-map`: no test reads `background-size` or `image-rendering` (the rg over tests and e2e returns nothing) | 4 elements: `.battle`, `.server`, `.office-room`, `.world-map` (×4 size and pixelated rendering unproven) |
| map marker state (3) | `WorldScene.tsx:48,57` | here / open / locked: C32 (plus `WorldScene.test.tsx:110-118`) | - |
| text markers kept (4 + `SKN`) | plan Assumptions | `?` C27, C29 · `+` C29 · `-` C27 · `[ ]` C17 · `SKN` C17 | - |
| HUD fixed icons (4) | `Hud.tsx` GameArt `kind="hud"` | xp / heart / coin / gem: C20; coin also C22 in the browser | - |
| Landing doors (3) | plan `Landing` | door 1: C1, C4-C6, C12-C15, C22-C26 · door 2: C1, C2, and `rg "<img"` shows `GameArt.tsx:29` as the only catalog `<img>` (the other two are `keyart`/`hero`) · door 3: C3 | door 3: PNGs cannot be reproduced from the commit (renderer untracked) |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | none: no route, API, CLI or stored shape changes (plan `Surface`/`Relations`: None) | - | n/a |
| Decides, not reached across a boundary | `GameArt.tsx` (kind -> category, size table, error -> fallback) · `BattleScene.tsx:13` scale table · `WorldScene.tsx:48,57` marker state · `ServerScene.tsx:99` / `OfficeScene.tsx:135` 3-way cell (art / `?` / empty) · `AvatarScene.tsx:92-96` skin vs art · per-site `alt` choice | own layer: C1 (all 9 kinds, 3 native sizes), C2 · C7 (3 rows) · C32 (3 rows) · C27, C29 (3 rows each) · C17 · each site's check | yes |
| Entry point that decides nothing | `Makefile:30-33` `art-check`; `web/public/art/**` served statically by Next | boundary: C3 (accepted input), C22 (static serve, accepted input). The rejected input (stale PNG -> exit 1) was shown only by fault F5, not by a committed proof | not met: the `art-check` entry point cannot run at the commit (exit 2, renderer untracked), same root as gap 1 |
| Instrumentation, pass-throughs | fixed-argument `GameArt` calls (HUD icons with `fallback=""`) and inline `backgroundImage` on the four scenes | none of its own; covered by C8, C20, C28, C30, C31 | yes |

## Faults injected

Worktree `scratchpad/verify-wt` at `3d6b472`, with `web/node_modules` symlinked from the real tree
(for F5 only, `.claude` symlinked too). Real tree porcelain before (`?? .claude/`,
`?? api/cmd/api/api`) and after `git worktree remove` are identical (`diff` empty).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `onError={() => setFailed(src)}` -> `onError={() => {}}` (fallback never shows) | `web/src/components/GameArt.tsx:35` | yes: `GameArt.test.tsx` "fallback replaces the image after an error" failed |
| F2 enemy scale `48: 3` -> `48: 4` | `web/src/components/BattleScene.tsx:13` | yes: `BattleScene.test.tsx` "enemy sprite (torre)" failed |
| F3 locked boundary `player.level >= r.minLevel` -> `>` | `web/src/components/WorldScene.tsx:48` | yes: `WorldScene.test.tsx` "marker state" failed (`caverna` at level 5) |
| F4 avatar grid `alt={e.name}` -> `alt=""` (alt rule at a name site) | `web/src/components/AvatarScene.tsx:95` | yes: `AvatarScene.test.tsx` "item art" failed |
| F5 swap committed PNGs `rack-cpu.png` <-> `rack-ram.png` (PNG/spec mismatch, sizes equal) | `web/public/art/icon/rack-{cpu,ram}.png` | yes: `make art-check`, `Binary files ... differ`, `make: *** [art-check] Error 1`. `art.test.tsx -t rack` stays green here as expected, since it proves existence and size only |

## Gate

- `cd web && npx vitest run`: 18 files, **273 passed, 0 failed**
- `npx tsc --noEmit`: exit 0 · `npx eslint src`: exit 0
- `npx playwright test`: **11 passed, 0 failed**
- `make art-check`: exit 0 in the working copy; **exit 2 in a clean checkout of `3d6b472`** (gap 1)

### Ranked gaps

1. Door 3 / C3: the renderer is not in version control, so PNGs cannot be reproduced from the commit - C3 - `Makefile:32`, `.claude/skills/pixel-assets/scripts/render.py` (untracked). Fix: commit `.claude/skills/pixel-assets/` (`scripts/render.py`, `scripts/png.py`, `references/palette.json`), or vendor the renderer into a tracked path and update door 3's literal and `Makefile:32`.
2. Background ×4 (1280x720) and `pixelated` rendering are unproven on all four scenes - AC 17 / Assumptions - `web/src/app/globals.css:104,163,285,307`, no test. Fix: a Playwright check on the computed `background-size: 1280px 720px` and `image-rendering: pixelated` for `.battle`, `.server`, `.office-room` and `.world-map`, or move both into the inline style that the jsdom checks already read.
