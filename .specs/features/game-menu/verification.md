# Game menu verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 80fd17e..80564f6
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

I re-ran all 27 proofs at `80564f6` and they are green. Each named test appears individually
below. All 5 faults I injected on the new surfaces were killed. Every round 2 gap is closed:

- The `office` screen has exactly one `code.4` specular pixel at (4,3), and `code.4` is the top of
  the `code` ramp.
- The `office` bezel now has 3 tones: `stone.3` 14 px, `stone.2` 5 px, `stone.1` 9 px.
- The `mundo` paper now has 3 tones: `cloud.3` 23 px, `cloud.2` 29 px, `dirt.3` 30 px.
- C27's enclosed-ink list is exactly what I measured under 8-connectivity.
- C24 now bounds the number on all four sides of the slot.

The feature still fails the binding style guide, on a surface round 2 missed. The brief asked me to
sweep the other 7 icons for the same two rules. In `server`, the rack's metal parts are `metal.2`
only: 23 px, one tone. These are the left rail (x4, y2-12) and the two shelf bars (y5 and y9,
x5-10). Taken as one frame with the `stone.3` right rail (x11, y2-12, 11 px), the frame has 2
tones: a highlight and a shade, with no base. That is the same arrangement round 2 flagged on the
`office` bezel, which was since fixed. It fails under either reading of "3-4 tones per material":
per ramp (metal has 1 tone) and per surface (the frame has 2). No check reaches it. C26 measures
only the `office` bezel and the `mundo` paper.

New finding about the checks: the checks say the tone rule is covered for the whole icon set, but
it is proven on only 2 surfaces. Two places make that claim. The Coverage row says "tones per
material C26". S6 says "nothing about the icon style is left to preview judgement beyond silhouette
readability". C26 measures 2 surfaces in 2 of the 9 icons. That is a claim about nine icons proven
on two, which is why the `server` gap stays green. The same applies to specular pixels: C25 covers
only the `office` screen. The `loja` coin and the `deploy` window are still judged by eye, though
both pass.

## Binding sources

Verified at `80564f6`. The fix redrew the `menu-office` and `menu-mundo` specs and PNGs.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` (plan `Sources`: binding for icon style) | yes. I re-read the key art and the full style guide. I rendered the 9 specs with `render.py web/art/icon/menu-*.json --out <scratch> --preview <scratch>/p.png` (9 `ok`, and all 9 byte-identical to the committed PNGs under `cmp`), then read the preview. I read a 16x zoom of the other 7 icons. I measured every pixel against `palette.json` names: bbox, semi-transparent and off-palette pixels, 8-connected enclosed `ink.0`, the tones used, the `office` screen window and the bezel ring | none. C25 matches "screen gets a single `white` or top-tone specular pixel". C26 matches "3-4 tones per material" on the two surfaces it names, taking tones from the palette ramps. C27 matches "inner detail ... never ink", with the eyes and the boundaries between parts treated as outline, since every foreground shape is outlined | **`server` rack metal has 1 tone (3-4 required).** `metal.2` 23 px: the left rail x4 y2-12 and the shelf bars y5/y9 x5-10 (`web/art/icon/menu-server.json` legend `m`, grid rows 2-12). Read as one frame with the `stone.3` right rail (11 px), it is 2 tones, highlight and shade with no base, which is the same arrangement as the round 2 `office` bezel. It fails both per ramp and per surface. No check measures it |

Round 2 gaps, re-measured at `80564f6`:

| Round 2 gap | At `80564f6` | Stated exactly by | Closed |
| --- | --- | --- | --- |
| `office` screen has no specular | screen x4-11 y3-6: `code.4` x1 at (4,3), `code.0` x26, `code.3` x5 (the `>_` glyph). `code.4` is the top of the 5-tone `code` ramp | C25, `art.test.tsx:180-182` | yes |
| `office` bezel has 2 tones | ring (row 2 x3-12, row 7 x3-12, x3 and x12 y3-6): `stone.3` 14 (top and left), `stone.2` 5 (right), `stone.1` 9 (bottom) | C26, `art.test.tsx:187-190` | yes |
| `mundo` paper has 2 tones | opaque pixels other than ink, leaf, sky or red: `cloud.3` 23, `cloud.2` 29, `dirt.3` 30. `dirt.3` is the fold columns x5/x10 plus the new bottom shade row y12 | C26, `art.test.tsx:192-201` | yes |
| ink exemption imprecise | enclosed `ink.0` (8-connected, off-canvas counts as transparent): `avatar` (5,6) (10,6); `deploy` (5,9)-(5,11), (10,9)-(10,11); `office` (7,8) (8,8) (7,10) (8,10); none in the other 6 | C27, `art.test.tsx:204-225`, an exact list matching my measurement | yes |
| C24 "inside the slot" asserted on left/top only | right and bottom bounds added | C24, `game-menu.spec.ts:123-124` | yes |

Sweep of the other 7 icons (`titulo`, `server`, `deploy`, `bug-fight`, `skills`, `loja`,
`avatar`). I count tones per surface, taking them from any ramp, which is the method C26 uses.
A surface counts as a finding only where the rule clearly applies: a lit material of 12 px or more.
That excludes light sources, glyphs, eyes, detail lines, and parts too small to hold 3 tones.

| Icon | Glossy surface without specular | Material with fewer than 3 tones | Finding |
| --- | --- | --- | --- |
| titulo | none glossy. The lit window is a light source, and `lamp.3` (5,10) sits top-left anyway | roof `red.3/2/1` 5/21/16 (3), walls `wood.4/3/2` 6/20/6 (3) + `wood.0` detail lines. Door `wood.1` 3 px and window `lamp` 4 px are too small | none |
| server | none glossy. The LEDs are 1 px light sources | **metal `metal.2` 23 px, 1 tone; frame `metal.2` + `stone.3` = 2 tones.** Bays `stone.3/2/1` 11/24/24 | **yes** |
| deploy | window `net.1` x3 with one `net.3` at (7,5) top-left: has a specular | body `white`/`metal.3`/`metal.2` 7/10/11 (3), nose+fins `red.3/2/1` 4/6/6 (3), flame `lamp.3/2/0` (3) | none |
| bug-fight | shell has `red.4` highlights (4,6), (3,8). The guide's glossy list (slime, gem, coin, screen) does not name a beetle shell | shell `red.4/3/2` + `red.0` seam/spots (4). Head `ink.2` 8 px, 1 tone, under 12 px | none (head noted) |
| skills | star, not listed as glossy. It has one `gold.4` at (7,2) anyway | `gold.4/3/2/1` 1/7/36/15 (4) | none |
| loja | coin: one `gold.4` at (7,10), a specular | sack `dirt.3/2/1` 9/46/17 (3), coin `gold.0/1/2/4` (4). Cord `red.2` 4 px is too small | none |
| avatar | none glossy | skin `skin.3/2/1` 1/39/4 (3). Per ramp, `hoodie.1/2/3` is 3 tones. Per surface, hair is `hoodie.2` 23 + `hoodie.3` 3 (2 tones) and the hoodie is `hoodie.1` 27 + `hoodie.3` 1 (2 tones) | not counted - depends on the reading (see below) |

The `avatar` row depends on the reading, so I do not count it as a clear application. The style
guide itself says "Ramps are named by material (... `skin`, `hoodie`)". Under that per-ramp
reading, `hoodie` has 3 tones. But C26 had to use a per-surface, cross-ramp reading for the `mundo`
paper to pass (`cloud` + `dirt`). Under the per-ramp reading the `mundo` paper would fail, and under
the per-surface reading the `avatar` hair and hoodie fail. No single reading passes both `mundo` and
`avatar`, so the user should say which reading the checks use. `server` fails under both readings.
All 9 icons have 0 semi-transparent and 0 off-palette pixels. `mundo` land (`leaf` 2 tones), water
and trail (1 tone each) are printed map areas, which C26 excludes. I do not count them.

Plan `Sources` "Hotbar RPG": carried from `715aa72`. The fix did not touch the interface. The C24
row is re-verified under Coverage.

## Checks

Verified at `80564f6`. I re-ran every proof at HEAD myself.

- **Unit:** one invocation, `cd web && npx vitest run src/components/Tabs.test.tsx src/components/GameArt.test.tsx src/lib/art.test.tsx --reporter=verbose`, 117 passed, exit 0.
- **Art:** `make art-check` exited 0 with `art ok` and 9 `ok .../icon/menu-*.png` lines.
- **E2E:** one invocation, `cd web && npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts --reporter=list`, 86 passed (8 game-menu, 78 responsive). It ran against the `:3100` production build of the real `web/`. That build dates from after `c70fa10`. The fix changed only `public/` PNGs and test files, and `next start` serves `public/` at runtime. After the fault run I rebuilt `web/` at HEAD, and the suite passed again with 86.

Citation refresh:

- `art.test.tsx`: the fix only inserted lines after `:169`, and I confirmed `:27`-`:168` at HEAD.
- `game-menu.spec.ts`: two lines were inserted at `:123-124`, so the tail of C24 moved by 2.
- `Tabs.test.tsx`: unchanged since `715aa72` (`git diff 715aa72..HEAD` shows only the two files above), so its citations are carried from `715aa72`.
- `GameArt.test.tsx`, `responsive.spec.ts`, `Makefile`: carried from `e8467f4`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 menu specs + PNGs, 16x16 | vitest `catalog art on disk > menu icons per scene, 16x16` ✓ | `web/src/lib/art.test.tsx:136` - `expectAssets(icons(MENU_ICONS.map((id) => \`menu-${id}\`)))`, list at `:27`, size `[16, 16]` at `:77`, asserted at `:55-57` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual(size)` | PASS |
| C2 | `make art-check` exits 0 with the 9 specs | `make art-check` exit 0, `art ok`, 9 `menu-*` lines `ok` | `Makefile:32-33` - `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art` (carried from `e8467f4`) | PASS |
| C3 | `GameArt kind="menu"` address/size/class | vitest `GameArt > menu address` ✓ | `web/src/components/GameArt.test.tsx:41-44` - `src` `toBe("/art/icon/menu-loja.png")`, `width`/`height` `toBe("32")`, `className` `toContain("pixelated")` (carried from `e8467f4`) | PASS |
| C4 | 9 slots in order with icon, num, label | vitest `Tabs hotbar > slot icons` ✓ | `web/src/components/Tabs.test.tsx:156` - `expect(got).toEqual(SLOTS.map(... \`/art/icon/menu-${icon}.png\`, "", "32", true]))`, SLOTS at `:126` (carried from `715aa72`) | PASS |
| C5 | LOJA icon error keeps `07` + `LOJA` | vitest `Tabs hotbar > slot icon fallback` ✓ | `web/src/components/Tabs.test.tsx:163-165` - `querySelector("img")).toBeNull()`, `.tab-num` `toHaveTextContent("07")`, `toHaveTextContent("LOJA")` (carried from `715aa72`) | PASS |
| C6 | 1280 one row, widths ±1, `.tab-icon` 44x44 loaded, page 1200 / scene 760 | playwright `desktop › C6 hotbar row` ✓ | `web/e2e/game-menu.spec.ts:20` `toEqual([44, 44])`; `:21` `naturalWidth` `toBe(16)`; `:23` y-set `toBe(1)`; `:25` spread `toBeLessThanOrEqual(1)`; `:26` `toBe(1200)`; `:27` `toBe(760)` | PASS |
| C7 | SERVER frame yellow, other 8 not | playwright `desktop › C7 active slot` ✓ | `web/e2e/game-menu.spec.ts:38-41` - `toBe(YELLOW)` / `.not.toBe(YELLOW)`, `toHaveLength(9)` | PASS |
| C8 | Tab focus outline solid 3px yellow | playwright `desktop › C8 focus outline` ✓ | `web/e2e/game-menu.spec.ts:49,54` - `toBeFocused()`; `toEqual({ style: "solid", width: "3px", color: YELLOW })` | PASS |
| C9 | keys 1-9 push slot N href once | vitest `shortcut navigates 1 -> /` ... `9 -> /office` (9 ✓) | `web/src/components/Tabs.test.tsx:171-172` - `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(href)` (carried from `715aa72`) | PASS |
| C10 | Ctrl/Meta/Alt+3 do not push | vitest `shortcut ignores modifiers {Control>}3{/Control}` / `{Meta>}` / `{Alt>}` ✓ | `web/src/components/Tabs.test.tsx:178` - `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C11 | `3` in input/textarea/select/contenteditable does not push | vitest `shortcut ignores editable input` / `textarea` / `select` / `contenteditable` ✓ | `web/src/components/Tabs.test.tsx:200,202` - `expect(el).toHaveFocus()`; `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C12 | `0`, `a` do not push | vitest `shortcut ignores other keys 0` / `a` ✓ | `web/src/components/Tabs.test.tsx:209` - `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C13 | open menu + `4`: push `/deploy`, `aria-expanded="false"` | vitest `shortcut closes menu` ✓ | `web/src/components/Tabs.test.tsx:225,227-228` - `"true"` precondition; `toHaveBeenCalledWith("/deploy")`; `toHaveAttribute("aria-expanded", "false")` (carried from `715aa72`) | PASS |
| C14 | browser `4` -> /deploy, `1` -> / | playwright `desktop › C14 shortcuts` ✓ | `web/e2e/game-menu.spec.ts:60-64` - `toHaveURL(/\/deploy$/)`, `PIPELINES DE DEPLOY` visible, `toHaveURL(/\/$/)`, `CLIQUE NAS PLACAS PARA NAVEGAR` visible | PASS |
| C15 | `/loja` MENU icon + `MENU · LOJA`; `/login` no img + `MENU` | vitest `menu button icon` ✓ | `web/src/components/Tabs.test.tsx:235-237` - `src` `toBe("/art/icon/menu-loja.png")`, `alt` `toBe("")`, `/^MENU · LOJA$/`; `:241-242` `img` `toBeNull()`, `/^MENU$/` (carried from `715aa72`) | PASS |
| C16 | 360/390 open menu: 9 visible with img, 3x3, no h-scroll | playwright `phone 360 › C16 command window 360` ✓, `phone 390 › C16 command window 390` ✓ | `web/e2e/game-menu.spec.ts:83-84,89-90,92` - `toBeVisible()` x2; `xs.size).toBe(3)`, `ys.size).toBe(3)`; `scrollWidth).toBeLessThanOrEqual(innerWidth)` | PASS |
| C17 | responsive browser proofs green, asserts unchanged | playwright `responsive.spec.ts` 78 passed (78 lines in the list output) | `web/e2e/responsive.spec.ts:58` (`C7 menu on phone`) and the rest; `git diff --stat 80fd17e..HEAD -- web/e2e/responsive.spec.ts` is empty (carried from `e8467f4`) | PASS |
| C18 | foundation/responsive `Tabs.test.tsx` proofs green, asserts unchanged | vitest `tab order and routes`, `marks only the current route's tab as current`, `menu starts closed`, `menu opens`, `link closes menu`, `button closes menu`, `escape closes menu`, `other keys keep menu open`, `menu label` x10 ✓ | `web/src/components/Tabs.test.tsx:16-121` (e.g. `:121` `toHaveTextContent(new RegExp(\`^${label}$\`))`); the file is unchanged since `715aa72` (carried from `715aa72`) | PASS |
| C19 | 1px transparent margin, largest side 12-14 (9 icons) | vitest `menu-<id> > menu icon margin and fill` x9 ✓ | `web/src/lib/art.test.tsx:148` - `expect(points.filter(([x, y]) => x === 0 \|\| y === 0 \|\| x === width - 1 \|\| y === height - 1)).toEqual([])`; `:152-153` `side` `toBeGreaterThanOrEqual(12)`, `toBeLessThanOrEqual(14)`. F4 killed it | PASS |
| C20 | every opaque pixel with a transparent 4-neighbour is `ink.0` (9 icons) | vitest `menu-<id> > menu icon outline in ink` x9 ✓ | `web/src/lib/art.test.tsx:158` - `expect(edge.filter(([x, y]) => !isInk(x, y))).toEqual([])`, `isInk` = `"6,6,18"` at `:145` | PASS |
| C21 | mean Rec.709 luminance of non-ink `x+y<15` > `x+y>15` (9 icons) | vitest `menu-<id> > menu icon light from the top-left` x9 ✓ | `web/src/lib/art.test.tsx:168` - `expect(mean(lit.filter(([x, y]) => x + y < 15))).toBeGreaterThan(mean(lit.filter(([x, y]) => x + y > 15)))`, weights `0.2126/0.7152/0.0722` at `:164` | PASS |
| C22 | `3` already `preventDefault`ed on `body` does not push | vitest `Tabs hotbar > shortcut ignores prevented` ✓ | `web/src/components/Tabs.test.tsx:215-216` - `cancel = (e) => e.preventDefault()` on `document.body`; `:219` `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C23 | per scene, MENU's first child is the icon, then `MENU · <label>` (9) | vitest `menu button icon per scene 01 TÍTULO` ... `09 OFFICE` (9 ✓) | `web/src/components/Tabs.test.tsx:250-253` - `first?.tagName).toBe("IMG")`, `src` `toBe(\`/art/icon/menu-${icon}.png\`)`, `alt` `toBe("")`, `first?.nextSibling?.textContent).toBe(\`MENU · ${label}\`)` (carried from `715aa72`) | PASS |
| C24 | 1280 and 390: num above-left of the icon and inside the slot, label below the icon, glow only on the active slot | playwright `arrangement desktop › C24 arrangement 1280` ✓ (`:133`), `arrangement phone › C24 arrangement 390` ✓ (`:143`) | `web/e2e/game-menu.spec.ts:119-120` - `num.x + num.w` `toBeLessThanOrEqual(s.icon.x)`, `num.y` `toBeLessThan(s.icon.y)`; `:121-124` - inside the slot on all four edges: `num.x`/`num.y` `toBeGreaterThanOrEqual(s.slot.x / s.slot.y)`, `num.x + num.w` `toBeLessThanOrEqual(s.slot.x + s.slot.w)`, `num.y + num.h` `toBeLessThanOrEqual(s.slot.y + s.slot.h)`; `:125` `label.y` `toBeGreaterThanOrEqual(s.icon.y + s.icon.h)`; `:126-127` `shadow` `toContain` / `.not.toContain("rgb(255, 224, 138)")`; `:117` `toHaveLength(9)`. F5 killed it at `:124` | PASS |
| C25 | `menu-office` has exactly one `code.4` at (4,3); the rest of the screen x4-11 y3-6 is `code.0` or `code.3` | vitest `menu office specular on the screen` ✓ | `web/src/lib/art.test.tsx:180` - `expect(hex(px, 4, 3)).toBe("#b6f070")`; `:181` `expect(screen.filter((c) => c === "#b6f070")).toHaveLength(1)`; `:182` `expect(screen.filter((c) => !["#b6f070", "#1f5a08", "#6bd425"].includes(c))).toEqual([])`, screen loop `y 3..6, x 4..11` at `:179`. F1 killed it | PASS |
| C26 | `office` bezel is exactly `stone.3/2/1`; `mundo` paper is exactly `cloud.3`, `cloud.2`, `dirt.3` | vitest `menu material tones: office bezel and mundo paper` ✓ | `web/src/lib/art.test.tsx:190` - `expect([...bezel].sort()).toEqual(["#121e2a", "#2a3642", "#46586a"])`, ring rows 2/7 x3-12 and cols 3/12 y3-6 at `:188-189`; `:201` `expect([...paper].sort()).toEqual(["#deb060", "#f6ead2", "#fbf6ea"])`, scenery excluded at `:194` (ink, `leaf.3`, `leaf.2`, `sky.3`, `red.2`). F2 killed the bezel half | PASS |
| C27 | enclosed `ink.0` (8-connected, off-canvas transparent) is exactly the listed set per icon | vitest `menu inner ink avatar` / `deploy` / `office` / `titulo` / `mundo` / `server` / `bug-fight` / `skills` / `loja` (9 ✓) | `web/src/lib/art.test.tsx:225` - `expect(inner).toEqual(expected)`, with table `:205-213` (`avatar [[5,6],[10,6]]`, `deploy` 6 coords, `office [[7,8],[8,8],[7,10],[8,10]]`, 6 icons `[]`), off-canvas-as-transparent `opaque` at `:216`, 8 neighbours at `:222`. F3 killed it | PASS |

## Coverage

I recomputed at `80564f6` the rows whose authority the fix touched: icon style rules and slot
arrangement. The other rows are carried from `715aa72` (or `e8467f4`, where round 2 carried them),
because their authority (`TABS`, `Tabs.tsx`, `GameArt.tsx`, `globals.css`) is absent from
`c70fa10..HEAD`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| icon style rules, binding (12) | style guide `icon` + general rules (authority outside the code), members measured on the 9 PNGs | 16x16 C1 · palette C2 (render) + measured 0 off-palette · 0 semi-transparent C2 + measured 0 · 1px margin C19 · fill ~80% C19 (13-14/16) · `ink` outline C20 · top-left light C21 · inner detail not ink C27 (exact 8-connected list, matches my measurement) · centred: judged, 9/9 within 0.5px · one object: judged, 9/9 · glossy specular: `office` screen C25, `loja` coin (7,10) and `deploy` window (7,5) judged pass · 3-4 tones per material: `office` bezel and `mundo` paper C26; the other surfaces judged (sweep table above) | 3-4 tones per material: the `server` rack metal is 1 tone (`metal.2` 23 px) and the frame is 2 tones (+ `stone.3` right rail), with no check (`web/art/icon/menu-server.json` legend `m`). Checks precision: C26 covers 2 surfaces of 2 icons while the checks' Coverage row and S6 sentence claim the rule for the set |
| slot arrangement (5) | plan `Sources` "Hotbar RPG" + `Assumptions` squareness ruling | number top-left and inside the slot on all four edges C24 (`:119-124`, F5 killed at `:124`) · square icon frame C6 `[44, 44]` (user ruling) · label below C24 `:125` · active glow C24 `:126-127` · active yellow border C7 | - |
| shortcut guards (10) | `web/src/components/Tabs.tsx:33-35` + door 3 literal (carried from `715aa72`) | `defaultPrevented` C22 · Ctrl, Meta, Alt C10 · `input`, `textarea`, `select`, `[contenteditable]` C11 · non `1`-`9` (`0`, `a`) C12 | - |
| MENU button icon by route (9 scenes + outside) | plan AC 13, `TABS` (`Tabs.tsx:8-18`) (carried from `715aa72`) | 9 scenes C23 · outside `TABS` (`/login`) C15 | - |
| menu icons on disk (9) | plan AC 1 id list (carried from `e8467f4`) | all 9 C1, C2 | - |
| slots with icon (9) | `TABS` (carried from `e8467f4`) | all 9 C4 | - |
| slot states (4) | plan AC 4, 6, 7 (carried from `e8467f4`) | active C7 · inactive x8 C7 · focused C8 · icon failed C5 | - |
| shortcut keys (9) | door 3 / AC 8 (carried from `e8467f4`) | `1`-`9` C9, `4` and `1` also C14 | - |
| shortcut side effects (2) | `Tabs.tsx:37-38` (carried from `e8467f4`) | navigate C9, C14 · close menu C13 | - |
| phone widths with open menu (2) | plan AC 14 (carried from `e8467f4`) | 360 C16 · 390 C16, 390 also C24 | - |
| Landing doors (3) | plan Landing (carried from `715aa72`) | door 1 C1, C4 · door 2 C3 · door 3 C9-C14, C22 | - |

## Test policy rows

The first three rows are carried from `715aa72` (their files are untouched by `c70fa10..HEAD`).
The instrumentation row classifies the touched art files, so I verified it at `80564f6`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` keydown handler (door 3) | boundary C14 · own layer C9-C13, C22 | yes - every row of the table at `Tabs.tsx:33-35` has an asserted case at its own layer; boundary contract C14 (carried from `715aa72`) |
| Decides, not reached across a boundary | `Tabs.tsx` slot + MENU rendering; `GameArt.tsx` `menu` address | own layer C4, C5, C15, C23, C3 | yes (carried from `715aa72`) |
| Decides at the boundary only (CSS the browser evaluates; `checks.md` Test policy line 4) | `web/src/app/globals.css` hotbar + 3x3 rules | boundary C6, C7, C8, C16, C24 | yes - production build with `globals.css` loaded; F5 (`.tab-num` height) killed by C24's new bottom bound at both widths |
| Instrumentation, pass-throughs | 9 `web/art/icon/menu-*.json` + PNGs (data; `menu-office`, `menu-mundo` touched) | none of their own; consumers C1, C2, C19-C21, C25-C27 | yes - each consumer re-ran green at HEAD and F1-F4 were killed through them; full `npx vitest run` 361 passed |

## Faults injected

Verified at `80564f6`.

Setup and restore:

- I ran the faults in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` cloned in (`cp -Rc`).
- **Art faults (F1-F4):** I edited the worktree spec, re-rendered it with `render.py <spec> --out web/public/art` in the worktree (`ok`), and ran the narrowest vitest proof from the worktree. Then I ran `git checkout -- web/art web/public/art` and the worktree porcelain was empty.
- **CSS fault (F5):** I built the worktree with `API_URL=http://localhost:8180 npx next build` and stopped the real `:3100` server (PID 62425, parent 62406, cwd real `web/`). I served the worktree with `next start --port 3100`, then ran C24 from the worktree.
- **Restore:** I stopped that server, rebuilt the real `web/` with the same `API_URL`, and restarted `npx next start --port 3100` from the real `web/`. PID 68977 is `next-server (v16.3.6)` with cwd real `web/`, and `/login` returns 200. After the restore, the e2e suite passed again with 86.
- **Cleanup:** I ran `git worktree remove --force`. The real tree's `git status --porcelain` was identical before and after (14 pre-existing untracked lines).

The cap is 5, one fault per new surface. That covers the three new proofs (C25, C26, C27), C19,
which round 2 left uninjected, and C24's new bounds. Round 2's F1-F5 are carried from `715aa72`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `office` specular removed (grid row 3 `S` -> `g`, (4,3) becomes `code.0`), re-rendered | `web/art/icon/menu-office.json` grid row 3 | yes - C25 `menu office specular on the screen` (`expected '#1f5a08' to be '#b6f070'`) |
| F2 `office` bezel collapsed to 2 tones (every `E` `stone.2` -> `f` `stone.3`), re-rendered | `web/art/icon/menu-office.json` grid rows 2-6, col 12 | yes - C26 `menu material tones` (`expected [ '#121e2a', '#46586a' ] to deeply equal [ '#121e2a', '#2a3642', '#46586a' ]`) |
| F3 enclosed ink added to `skills` (grid row 7 col 5 `b` -> `o`, canvas (6,8)), re-rendered | `web/art/icon/menu-skills.json` grid row 7 | yes - C27 `menu inner ink skills` (`expected [ [ 6, 8 ] ] to deeply equal []`) |
| F4 opaque ink pixel on row 0 of `titulo` (grid row 0 col 7 `.` -> `o`), re-rendered | `web/art/icon/menu-titulo.json` grid row 0 | yes - C19 `menu-titulo > menu icon margin and fill` (`expected [ [ 7, +0 ] ] to deeply equal []`) |
| F5 `.tab-num` gains `padding-bottom: 120px` (the number box overflows the slot bottom while staying above-left of the icon) | `web/src/app/globals.css:50` | yes - C24 1280 and 390 both at `game-menu.spec.ts:124` (`01TÍTULO` expected `<= 151`, received `200`; expected `<= 207`, received `256`) |

The `mundo` half of C26 (`art.test.tsx:201`) was not injected, because the cap is spent and the C26
proof was already made to fail by F2. Its expected set is readable at the assertion.

## Gate

- `cd web && npx vitest run`: 361 passed, 0 failed (18 files).
- `npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts`: 86 passed, 0 failed (re-run after the real `:3100` server was restored).
- `make art-check`: exit 0.

Ranked gaps:

1. **The `server` rack metal has 1 tone.** The binding style guide says "3-4 tones per material".
   `metal.2` covers 23 px: the left rail x4 y2-12 and the shelf bars y5/y9 x5-10. Read as a frame
   with the `stone.3` right rail, it has 2 tones, which is the same arrangement as the round 2
   `office` bezel. It fails per ramp and per surface, and no check reaches it.
   Location: `web/art/icon/menu-server.json`, legend `m`, grid rows 2-12. This is a binding source
   finding and has no check id. Round 2 missed it by counting `server` as "stone 3".
2. **The checks overclaim coverage of the style rules.** The Coverage row says "tones per material
   C26" and "specular on glossy screen C25", and S6 says "nothing about the icon style is left to
   preview judgement beyond silhouette readability". C26 measures 2 surfaces in 2 icons, and C25
   measures 1 screen. The tone rule on the other 7 icons and the `loja` coin and `deploy` window
   speculars are unmechanised. A claim about 9 icons proven on 2 is how gap 1 stayed green.
3. **Ruling needed, not counted as a failure.** The unit "material" is undefined. Per ramp, the
   `avatar` passes (`hoodie` 3) but the `mundo` paper fails (`cloud` 2). Per surface, the approach
   C26 uses, the `mundo` paper passes but the `avatar` hair (`hoodie.2`/`hoodie.3`, 26 px) and
   hoodie (`hoodie.1` + one `hoodie.3`, 28 px) have 2 tones each. The user should say which unit
   the checks use.
