# Game art verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: c29a975..9a0e1a7
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 is scoped to the fix range `3d6b472..9a0e1a7` (6cb8391, 17001db, e1e84e9, f8c2633, 9a0e1a7)
and to every verdict that was not PASS in round 1. All proofs were re-run in full at `9a0e1a7`.
Both round-1 gaps are closed:

1. **Door 3 / C3 closed.** 17001db tracks `.claude/skills/pixel-assets/`: `git ls-files .claude`
   lists 13 paths, among them `scripts/render.py`, `scripts/png.py` and `references/palette.json`.
   In a clean `git worktree` of `9a0e1a7` with no symlinks, `make art-check` exits **0** (72 `ok`,
   0 `WARN`/`ERROR`, `art ok`). In round 1 the same command exited 2 at `3d6b472`.
2. **Background ×4 + `pixelated` closed.** New C33 (`web/e2e/art.spec.ts`) reads
   `getComputedStyle` in a real browser on all four scene elements. Two CSS faults injected on the
   new surface were both caught (F6, F7).

Sections are marked `verified at 9a0e1a7` (re-done this round) or `carried from 3d6b472` (outside
the fix's blast radius, taken unchanged from round 1).

## Binding sources

`carried from 3d6b472`. Step 1 is not owed under `standard`, and the fix did not touch the
interface: the only `web/` change is a new e2e spec, with no component or CSS change
(`git diff 3d6b472..HEAD --stat` shows `web/e2e/art.spec.ts` as the only `web/` path).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `api/catalog/*.json` (inventory) | yes (round 1), parsed by script: 53 `glyph` entries + 6 `regions`; `api/catalog` untouched by the fix | none | - |
| `web/public/keyart.png` + `style-guide.md` (style) | not opened; step 1 not owed under `standard` | not assessed | - |

## Checks

`verified at 9a0e1a7` for how each proof ran. Citations are refreshed for C3 and C33, the checks
whose files the fix touched. Every other citation is `carried from 3d6b472`: no test file except
the new `web/e2e/art.spec.ts` changed in the fix range, so those line numbers still hold.

How the proofs ran at `9a0e1a7`:

- **vitest.** All vitest proofs ran in one invocation over the 11 proof files, with the `-t`
  alternation of every check filter, `--reporter=verbose` and JSON output. **78 passed, 0 failed,
  137 skipped (215).** The JSON was then split by each check's own (file, filter) pair. Every pair
  matched at least one test, every matched test `passed`, and each row shows its count.
- **Playwright.** `npx playwright test -g "hud art loads|scene art scale"` ran with Postgres up
  (`make db-up`, container healthy): **5 passed**. Each test was listed by name:
  `art.spec.ts:14 › scene art scale .world-map`, `.server`, `.office-room`, `.battle`, and
  `shell.spec.ts:21 › hud art loads`.
- **`make art-check`.** Exit 0 in the real tree, and exit 0 in a clean worktree of `9a0e1a7`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `GameArt` address, native × scale, alt, `pixelated` | vitest `-t "address and size"`: 14 matched, 14 passed | `web/src/components/GameArt.test.tsx:24-28`: `expect(img.getAttribute("src")).toBe(src)`, `width`/`height` `.toBe(String(size))`, `alt` `.toBe("retrato")`, `className` `toContain("pixelated")`; the table at `:8-20` covers all 9 kinds, including `enemy torre x3 -> 144` (`:19`); `:34` empty alt `.toBe("")` (carried) | PASS |
| C2 | on `error` the image goes and the `HP+` fallback appears | vitest `-t "fallback"`: 2 matched, 2 passed | `GameArt.test.tsx:42-44`: `fireEvent.error(img)`; `expect(container.querySelector("img")).toBeNull()`; `expect(screen.getByText("HP+")).toBeInTheDocument()` (carried) | PASS |
| C3 | `make art-check` exits 0: render to a temp dir, no `ERROR`, `diff -r` empty | `make art-check` at `9a0e1a7`: real tree exit 0; **clean worktree exit 0** (72 `ok`, 0 `WARN`/`ERROR`, `art ok`) | `Makefile:30-33`: `python3 .claude/skills/pixel-assets/scripts/render.py web/art --out "$$tmp" && diff -r "$$tmp" web/public/art && echo "art ok"`. The renderer is now tracked: `git ls-files .claude/skills/pixel-assets/scripts` -> `png.py`, `render.py`, `sample_colors.py` (commit 17001db) | PASS |
| C4 | enemy sprite spec + PNG per `combat.json` enemy, 32/48/64 | vitest `-t "enemy"` (art.test): 1 matched, passed | `web/src/lib/art.test.tsx:62-63` builds the list from `combat.enemies` with `ENEMY_SIZE` (`:57`: `torre: [48, 48], nuvem: [64, 64]`); `:33-35` `existsSync(spec)`/`existsSync(png)` `.toBe(true)`, `pngSize(png)` `.toEqual(size)` (carried) | PASS |
| C5 | item icon per `combat.json` item, 16x16 | vitest `-t "item"` (art.test): 1 matched, passed | `art.test.tsx:69` `combat.items` mapped to `item-<id>` with `[16, 16]`, asserted at `:33-35` (carried) | PASS |
| C6 | `battle-<region>` per `regions.json`, 320x180 | vitest `-t "battle background"` (art.test): 1 matched, passed | `art.test.tsx:74` with `[320, 180]`, asserted at `:33-35` (carried) | PASS |
| C7 | `.battle-sprite` img, src/alt/size per enemy, glyph after error | vitest `-t "enemy sprite"`: 4 matched, 4 passed | `web/src/components/BattleScene.test.tsx:291-294` table `vila NULL SLIME 128`, `torre RACE CONDITION 144`, `nuvem MEMORY LEAK ANCESTRAL 128`; `:300-304` `src`/`alt`/`width`/`height` `.toBe(...)`; `:315-316` img `toBeNull()`, `toHaveTextContent("(0x0)")` (carried) | PASS |
| C8 | `.battle` background per region, 6 rows | vitest `-t "battle background"`: 6 matched, 6 passed | `BattleScene.test.tsx:325,330` `it.each(REGIONS...)`, `scene.style.backgroundImage...toBe(\`url(/art/background/battle-${region}.png)\`)` (carried) | PASS |
| C9 | potion img `alt=""` `width=32`, no glyph text, `HP+` after error | vitest `-t "potion art"`: 1 matched, passed | `BattleScene.test.tsx:341-345` `src`/`alt ""`/`width "32"`/`not.toContain(glyph)`; `:348-349` `toBeNull()`, `toHaveTextContent("HP+")` (carried) | PASS |
| C10 | shop item card 32, detail 64, glyph after error | vitest `-t "item art"` (Shop): 1 matched, passed | `web/src/components/ShopScene.test.tsx:228-232` card; `:236-238` detail `width` `.toBe("64")`; `:241-242` `toHaveTextContent("HP+")` (carried) | PASS |
| C11 | avatar item cell `alt=<name>` 32, detail `alt=""` 32, glyph after error | vitest `-t "item art"` (Avatar): 1 matched, passed | `web/src/components/AvatarScene.test.tsx:245-249` `alt` `.toBe(name)`, `width "32"`; `:253-255` detail `alt ""`; `:259-260` `toHaveTextContent("++")` (carried) | PASS |
| C12 | gear icon per `shop.json` gear | vitest `-t "gear"` (art.test): 1 matched, passed | `art.test.tsx:79`, asserted at `:33-35` (carried) | PASS |
| C13 | skill icon per `skills.json` node | vitest `-t "skill"` (art.test): 1 matched, passed | `art.test.tsx:84`, asserted at `:33-35` (carried) | PASS |
| C14 | deploy icon per `deploys.json` type | vitest `-t "deploy"` (art.test): 1 matched, passed | `art.test.tsx:89`, asserted at `:33-35` (carried) | PASS |
| C15 | `hud-coin/gem/heart/xp` spec + PNG 16x16 | vitest `-t "hud"` (art.test): 1 matched, passed | `art.test.tsx:94` `icons(["hud-coin", "hud-gem", "hud-heart", "hud-xp"])`, asserted at `:33-35` (carried) | PASS |
| C16 | shop gear card 32, detail 64, `[Mac]` after error | vitest `-t "gear art"` (Shop): 1 matched, passed | `ShopScene.test.tsx:250-254`; `:258-260` `.toBe("64")`; `:263-264` `toHaveTextContent("[Mac]")` (carried) | PASS |
| C17 | avatar gear cell, setup slot, `[ ]`, detail, skin stays `HeroSprite`/`SKN`, `[Mac]` after error | vitest `-t "gear art"` (Avatar): 1 matched, passed | `AvatarScene.test.tsx:270-274`, `:278-280`, `:283-285` `.toBe("/art/icon/gear-macbook.png")`, `:286-287` `.toBe("[ ]")`, `:291-295` `.toBe("/hero.png")`/`.toBe("SKN")`, `:298-299` `toHaveTextContent("[Mac]")` (carried) | PASS |
| C18 | 9 skill nodes `alt=""` 32; foot chips same icon; glyph after error | vitest `-t "skill art"` (Skills): 1 matched, passed | `web/src/components/SkillsScene.test.tsx:151` `toHaveLength(9)`; `:154-158`; `:161` chip srcs `.toEqual([...])`; `:169` `toHaveTextContent("{}")` (carried) | PASS |
| C19 | HUD skill chips `alt=<name>` 32; none -> text; glyph after error | vitest `-t "skill art"` (Hud): 4 matched, 4 passed | `web/src/components/Hud.test.tsx:64-65` `.toEqual(skills.map(id => names[id]))`; `:67` `width "32"`; `:75-76` `sem habilidades ativas`, `toBeNull()`; `:83-84` `toHaveTextContent("</>")` (carried) | PASS |
| C20 | `hud-xp`/`heart`/`coin`/`gem` in their cards, `alt=""` 32 | vitest `-t "currency art"`: 4 matched, 4 passed | `Hud.test.tsx:88-92` table; `:95-99` `closest(".hud-card")` then `img[src=...]` `not.toBeNull()`, `alt` `.toBe("")`, `width` `.toBe("32")` (carried) | PASS |
| C21 | deploy img before the name; accessible name `t.name`; `$_` after error | vitest `-t "deploy art"`: 1 matched, passed | `web/src/components/DeployScene.test.tsx:370` `toHaveAccessibleName(t.name)`; `:372-375`; `:380` `name.firstElementChild`; `:385-386` `toHaveTextContent("$_")` (carried) | PASS |
| C22 | real browser: HUD `hud-coin` loads, `naturalWidth` 16 | playwright `-g "hud art loads"`: `shell.spec.ts:21 › hud art loads` passed | `web/e2e/shell.spec.ts:23,25` `toHaveCount(1)`; `expect.poll(... img.naturalWidth ...).toBe(16)` (carried; the file is untouched by the fix) | PASS |
| C23 | rack icon per `rack.json` | vitest `-t "rack"` (art.test): 1 matched, passed | `art.test.tsx:99`, asserted at `:33-35` (carried) | PASS |
| C24 | office icon per `office.json` | vitest `-t "office"` (art.test): 1 matched, passed | `art.test.tsx:104`, asserted at `:33-35` (carried) | PASS |
| C25 | region icon per `regions.json` | vitest `-t "region"` (art.test): 1 matched, passed | `art.test.tsx:109`, asserted at `:33-35` (carried) | PASS |
| C26 | `world`/`office`/`server` backgrounds 320x180 | vitest `-t "scene background"`: 1 matched, passed | `art.test.tsx:114` `size: [320, 180]`, asserted at `:33-35` (carried) | PASS |
| C27 | server: `gpu` slot over `#45b7ff`; `-`/`?` stay text; cards; `#` after error | vitest `-t "rack art"`: 1 matched, passed | `web/src/components/ServerScene.test.tsx:264-268` `.toBe("/art/icon/rack-gpu.png")`, `toHaveStyle({ background: "#45b7ff" })`; `:271-274`; `:279-284`; `:288-290` `.toBe("#")` (carried) | PASS |
| C28 | `.server` background | vitest `-t "server background"`: 1 matched, passed | `ServerScene.test.tsx:297` `.toBe("url(/art/background/server.png)")` (carried) | PASS |
| C29 | office card/detail/cell `alt=""` 32; `+`/`?` stay text; `[==]` after error | vitest `-t "furniture art"`: 1 matched, passed | `web/src/components/OfficeScene.test.tsx:306-312`; `:316-318`; `:322-324`; `:325-328`; `:331-332` `toHaveTextContent("[==]")` (carried) | PASS |
| C30 | `.office-room` background | vitest `-t "office background"`: 1 matched, passed | `OfficeScene.test.tsx:339-340` `toHaveClass("office-room")`, `.toBe("url(/art/background/office.png)")` (carried) | PASS |
| C31 | 6 region markers `alt=""` 32, no `.node-diamond`, world background, `HUB` after error | vitest `-t "region art"`: 1 matched, passed | `web/src/components/WorldScene.test.tsx:123` `toBeNull()`; `:126-130` per `REGIONS`; `:133` `.toBe("url(/art/background/world.png)")`; `:137` `toHaveTextContent(/^HUB$/)` (carried) | PASS |
| C32 | level 5 in `floresta`: locked / open / here | vitest `-t "marker state"`: 1 matched, passed | `WorldScene.test.tsx:144` `.toBe(LOCKED)` (`:18`); `:146-147` `.toBe("")`; `:149-150` `toHaveClass("here")` (carried) | PASS |
| C33 | real browser: `.world-map`, `.server`, `.office-room`, `.battle` (encounter in `vila`) have computed `background-size` `1280px 720px` and `image-rendering` `pixelated` | playwright `-g "scene art scale"`: 4 matched, 4 passed (`art.spec.ts:14` × `.world-map`, `.server`, `.office-room`, `.battle`) | `web/e2e/art.spec.ts:7-10`: the four selectors `.world-map`, `.server`, `.office-room`, `.battle`, with `.battle` gated on `getByText("ENCONTRO · VILA LOCALHOST")` (`:10`); `:19-20` `getComputedStyle(el)` -> `backgroundSize`, `imageRendering`; `:22` `expect(style).toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })`. Both values and all four selectors match the claim, and the level (real browser) is the one the claim names | PASS |

Every proof is a test this feature added. `GameArt.test.tsx`, `art.test.tsx` and `e2e/art.spec.ts`
are new files, and each scene test named above was added in `c29a975..9a0e1a7`.

Precision notes, carried from 3d6b472 (non-failing):
- C20 proves that each icon sits in the same `.hud-card` as its label, but not that it sits
  "ao lado de" it (the order within the row).
- C29 proves that the catalog `color` no longer paints the card (`style.color` is `""`). The
  detail and the cell dropped it too (`OfficeScene.tsx:99,134`), but no test asserts it there.

New precision note, verified at 9a0e1a7 (non-failing): plan Assumptions (`plan.md:60`) also fixes
the background as "centralizado sobre a cor atual da cena". C33 does not claim
`background-position: center` or the scene colour (`#12283a`, `#101f14`, `#0a1622`, `#0c1a26`), and
no test reads them. No check or AC names them, so this is a note, not a gap.

## Coverage

Two rows are `verified at 9a0e1a7`, the ones whose authority the fix touched: "scene background
scale" and "Landing doors". Every other row is `carried from 3d6b472`, because
`api/catalog`, `web/src` and `web/art` / `web/public/art` are all untouched in the fix range.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| art files per catalog entry + fixed (72) (carried) | `api/catalog/*.json` parsed by script | 72 expected, 72 specs and 72 PNGs on disk; C4, C5, C6, C12-C15, C23-C26. Re-confirmed at `9a0e1a7`: `make art-check` renders 72 `ok` | - |
| `GameArt` kind -> address (9) (carried) | `ArtKind` `GameArt.tsx:6`, `artSrc` `:11-13` | all 9 kinds, C1 rows `GameArt.test.tsx:8-20` | - |
| enemy native size (3) (carried) | `ENEMY_SIZE` `GameArt.tsx:9` + default | 32 / 48 / 64: C1 | - |
| enemy battle scale (3) (carried) | `ENEMY_SCALE` `BattleScene.tsx:13` | ×4 / ×3 / ×2: C7 | - |
| screen sites that rendered `glyph` at `c29a975` (20) + map node (1) (carried) | `git show c29a975:<file> \| rg -n glyph` | every site proven by C7, C9, C10, C11, C16, C17, C18, C19, C21, C27, C29, C31. The size-17 row in checks.md omits the 4 detail sites, which C10/C11/C16/C17 do prove (note, not a failure) | - |
| fallback per AC 5 kind (8) (carried) | AC 5 list | C7 · C9, C10, C11 · C16, C17 · C18, C19 · C21 · C27 · C29 · C31 · C2 | - |
| `alt=<name>` sites (3) vs `alt=""` sites (carried) | `rg "alt=" web/src/components` | name: C11/C17, C7, C19; `""`: each site's check | - |
| scene background URL (9) (carried) | plan AC 6, 12, 13, 14 | 6 × `battle-*` C8 · `server` C28 · `office` C30 · `world` C31 | - |
| **scene background scale ×4 + `pixelated` (4 elements)** (verified at 9a0e1a7) | plan Assumptions `plan.md:60` "fundo ×4 (1280x720)", Flow 4 `plan.md:144`, AC 17 `plan.md:101`; code `web/src/app/globals.css:104` `.world-map`, `:163` `.battle`, `:285` `.office-room`, `:307` `.server`, each `center / 1280px 720px no-repeat; image-rendering: pixelated`. `rg -n "1280px"` finds no other element in `globals.css` | `.world-map` C33 · `.server` C33 · `.office-room` C33 · `.battle` C33 (`art.spec.ts:7-10,22`, both properties per element). F6 and F7 show both properties are asserted per element | - |
| map marker state (3) (carried) | `WorldScene.tsx:48,57` | here / open / locked: C32 | - |
| text markers kept (4 + `SKN`) (carried) | plan Assumptions | `?` C27, C29 · `+` C29 · `-` C27 · `[ ]` C17 · `SKN` C17 | - |
| HUD fixed icons (4) (carried) | `Hud.tsx` `kind="hud"` | C20; coin also C22 | - |
| **Landing doors (3)** (verified at 9a0e1a7) | plan `Landing` `plan.md:156-160` | door 1: C1, C4-C6, C12-C15, C22-C26 · door 2: C1, C2 (only catalog `<img>` is `GameArt.tsx:29`, carried) · door 3: C3. Door 3's literal "reproduzido por `python3 .claude/skills/pixel-assets/scripts/render.py web/art --out web/public/art`" now holds from the commit: renderer, `png.py` and `palette.json` are tracked (17001db), and `make art-check` exits 0 in a clean worktree of `9a0e1a7` and exits non-zero on drift there (F8) | - |

## Test policy rows

These are re-judged at 9a0e1a7: the row that was unmet in round 1, and every row that classifies a
file touched in the fix range. That covers `.claude/skills/pixel-assets/**`, which is newly
tracked, and `web/e2e/art.spec.ts`, which is a proof and not classified code. The other rows are
carried from 3d6b472.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary (carried) | none: no route, API, CLI or stored shape changes (plan `Surface`/`Relations`: None) | - | n/a |
| Decides, not reached across a boundary (carried; re-judged for the touched renderer) | `GameArt.tsx` · `BattleScene.tsx:13` · `WorldScene.tsx:48,57` · `ServerScene.tsx:99` / `OfficeScene.tsx:135` · `AvatarScene.tsx:92-96` · the `alt` choice at each site. `render.py` (palette/outline/size validation) is newly tracked, but it is not feature code: plan Flow 1 (`plan.md:141`) marks it `(exists)` as a pre-existing tool, and 17001db versions it without authoring it, so this row does not claim it | own layer: C1, C2 · C7 · C32 · C27, C29 · C17 · each site's check | yes |
| Entry point that decides nothing (re-judged; round 1 unmet) | `Makefile:30-33` `art-check`; `web/public/art/**` served statically by Next | boundary: C3 accepted input, now proven at the commit (clean worktree of `9a0e1a7`, exit 0), and C22 static serve (accepted input, `naturalWidth` 16). Rejected input, a PNG that drifts from its spec: `art-check` is C3's own proof harness, so its reject path is proven the way a proof is, by a fault. F8 swapped two committed PNGs in a clean checkout and `make art-check` exited 2 (`diff` recipe `Error 1`). The round-1 cause (exit 2 at the commit, renderer untracked) is gone | yes |
| Instrumentation, pass-throughs (carried) | fixed-argument `GameArt` calls (HUD icons, `fallback=""`) and inline `backgroundImage` on the four scenes | none of its own; covered by C8, C20, C28, C30, C31 | yes |

## Faults injected

F6-F8 are verified at 9a0e1a7; F1-F5 are carried from 3d6b472.

**Setup.** F6-F8 ran in the scratch worktree `scratchpad/v2-wt` at `9a0e1a7`. `web/node_modules` was
symlinked from the real tree, and `.claude` was not symlinked (for F8 it had to be the committed
copy). The real tree's `git status --porcelain` was recorded before the run (`?? .claude/rules/`,
`?? .claude/skills/{chrome-devtools,harness-eval,new-module,new-slice,spec-driven-eval,the-judge,tlc-discover,tlc-implement,tlc-plan,tlc-spec-driven,tlc-spec-lean,vsa-review}/`,
`?? api/cmd/api/api`). After `git worktree remove` it was identical (`diff` empty), and
`git worktree list` shows only the real tree.

**Bundler deviation.** Turbopack refused the `node_modules` symlink ("points out of the filesystem
root"). For F6/F7 the worktree's Next was therefore started by hand as
`next dev --webpack --port 3100`, and Playwright reused it (`reuseExistingServer`). Before the run,
the port-3100 listener's cwd was confirmed as `scratchpad/v2-wt/web`. In the same run the two
unmutated scenes (`.server`, `.battle`) stayed green, which shows that the webpack server serves the
CSS the same way the real-tree Turbopack baseline does.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `onError={() => setFailed(src)}` -> `onError={() => {}}` (carried from 3d6b472) | `web/src/components/GameArt.tsx:35` | yes: `GameArt.test.tsx` "fallback replaces the image after an error" failed |
| F2 enemy scale `48: 3` -> `48: 4` (carried) | `web/src/components/BattleScene.tsx:13` | yes: "enemy sprite (torre)" failed |
| F3 locked boundary `>=` -> `>` (carried) | `web/src/components/WorldScene.tsx:48` | yes: "marker state" failed |
| F4 avatar grid `alt={e.name}` -> `alt=""` (carried) | `web/src/components/AvatarScene.tsx:95` | yes: `AvatarScene.test.tsx` "item art" failed |
| F5 swap `rack-cpu.png` <-> `rack-ram.png` (carried; round 1 needed `.claude` symlinked) | `web/public/art/icon/rack-{cpu,ram}.png` | yes: `make art-check` `Error 1` |
| F6 `.office-room` `center / 1280px 720px no-repeat` -> `center no-repeat` (drop the ×4 size) | `web/src/app/globals.css:285` | yes: `art.spec.ts` "scene art scale .office-room" failed, `backgroundSize` received `"auto"`, expected `"1280px 720px"` |
| F7 `.world-map` drop `image-rendering: pixelated;` | `web/src/app/globals.css:104` | yes: "scene art scale .world-map" failed, `imageRendering` received `"auto"`, expected `"pixelated"`. `.server` and `.battle` stayed green in the same run |
| F8 swap `rack-cpu.png` <-> `rack-ram.png` in a **clean checkout** (no `.claude` symlink; the renderer is the committed one) | `web/public/art/icon/rack-{cpu,ram}.png` | yes: `make art-check` exit 2, `Binary files .../rack-cpu.png and web/public/art/icon/rack-cpu.png differ` (and `rack-ram`), `make: *** [art-check] Error 1` |

F6 and F7 are distinct from the builder's own pre-commit mutations (`.server` size, `.battle`
`pixelated`). Between them, all four C33 tests have now each been made to fail once.

## Gate

Verified at 9a0e1a7:

- `cd web && npx vitest run`: 18 files, **273 passed, 0 failed**
- `npx tsc --noEmit`: exit 0 · `npx eslint src`: exit 0
- `npx playwright test` (full): **15 passed, 0 failed**
- `make art-check`: exit 0 in the working copy and **exit 0 in a clean worktree of `9a0e1a7`**

### Ranked gaps

None.
