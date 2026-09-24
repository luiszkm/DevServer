# Game menu verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 80fd17e..81082f8
**Round**: 6 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 6 is scoped by the fix diff `8bdc01b..81082f8` and by the one round 5 verdict that was not
PASS. The fix diff is:

- `6ae8584`, `web/src/lib/art.test.tsx`:
  - adds C32 `menu icon one object` (`:164-180`);
  - makes C30 compare by hex (`:310`);
  - adds C33 `menu coin in gold` (`:314-320`).
- `6ae8584`, `checks.md`:
  - `33 checks in 10 slices`;
  - the S6 sentence (`:102`) now points to S10;
  - S10 adds C32, C33 and a table that maps every icon rule of the style guide to its proof or to
    "judged by eye".
- `81082f8`: docs only (`STATE.md`).

`git diff --stat 2b44c49..HEAD -- web/src/components web/src/app web/e2e web/art web/public Makefile .claude/skills/pixel-assets`
is empty. No art, CSS, component, e2e or renderer file changed.

I re-ran every proof at `81082f8`, and all were green:

- 166 unit tests: round 5's 156, plus 9 for C32 and 1 for C33.
- `make art-check`: `art ok`.
- 86 e2e tests.

Each named test appears individually below.

**The round 5 gap is closed.** Round 5 found five binding rules that were neither checked nor
named. Each now has a row in the S10 table:

| Rule | Now proven by |
| --- | --- |
| no gradients | judged by eye |
| detail lines in the material's own darkest tone | judged by eye |
| one object | C32 (new) |
| coin = `gold` ramp | C33 (new) |
| bright, saturated, friendly | judged by eye |

I recomputed the rule set from the style guide myself (see Coverage) and found no rule missing.
Each new or changed surface was made to fail once (F8-F10).

**One finding about the checks text. It does not fail the round.** Two S10 rows cite C20 for
outline *weight*: "1px `ink` outline (13)" and "one set shares ... outline weight (51-52)". C20
asserts only that every edge pixel is `ink`. It stays green under a 2px outline. The weight is
actually carried by C27, the exact list of enclosed ink. F11 thickened the `titulo` bottom
outline to 2px, and only C27 failed. So the rule is proven. The table names the wrong proof.

## Binding sources

Mostly carried from `2b44c49`, because the fix touched no art, spec, renderer or interface file
(step 1 is `ui`-only anyway). What I re-did at `81082f8`:

- **Style guide:** I re-read `.claude/skills/pixel-assets/references/style-guide.md` in full
  (general `:6-20`, palette `:22-28`, icon `:45-52`, displaying `:78-84`) to recompute S10.
- **Renders:** `render.py web/art/icon/menu-*.json --out <scratch>/render --preview <scratch>/render/p.png`
  gave 9 `ok`, and `cmp` showed all 9 byte-identical to the committed PNGs.
- **Preview:** I read `p.png`. It shows house, map, rack, rocket, bug, star, bag with coin, hero
  head and desk with monitor, left to right in file order.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` (plan `Sources`: binding for icon style), read through plan `Assumptions` "Material" (`plan.md:52`, confirmed `y`) | yes. Style guide re-read in full at `81082f8`. Key art carried from `2b44c49` | none. C32 and C33 each assert the rule they quote. The S10 citation imprecision (C20 for outline weight) is recorded under Coverage. The rule itself is proven by C27 | - |

Plan `Sources` "Hotbar RPG": carried from `715aa72`, because the interface is untouched.

## Checks

Verified at `81082f8`. I re-ran every proof myself.

- **Unit:** `cd web && npx vitest run src/components/Tabs.test.tsx src/components/GameArt.test.tsx src/lib/art.test.tsx --reporter=verbose`
  gave 166 passed, exit 0. The ✓ count for each name:

  | Test name | ✓ |
  | --- | --- |
  | `menu icons per scene` | 1 |
  | `GameArt > menu address` | 1 |
  | `slot icons` | 1 |
  | `slot icon fallback` | 1 |
  | `shortcut navigates` | 9 |
  | `shortcut ignores modifiers` | 3 |
  | `shortcut ignores editable` | 4 |
  | `shortcut ignores other keys` | 2 |
  | `shortcut closes menu` | 1 |
  | `menu button icon` (includes the 9 `per scene` cases) | 10 |
  | `tab order and routes` | 1 |
  | `marks only the current route's tab as current` | 1 |
  | `menu starts closed` | 1 |
  | `menu opens` | 1 |
  | `link closes menu` | 1 |
  | `button closes menu` | 1 |
  | `escape closes menu` | 1 |
  | `other keys keep menu open` | 1 |
  | `menu label` | 10 |
  | `menu icon margin and fill` | 9 |
  | `menu icon centred` | 9 |
  | **`menu icon one object`** | **9** |
  | `menu icon outline in ink` | 9 |
  | `menu icon light from the top-left` | 9 |
  | `shortcut ignores prevented` | 1 |
  | `menu button icon per scene` | 9 |
  | `menu office specular` | 1 |
  | `menu material tones` | 1 |
  | `menu inner ink` | 9 |
  | `menu surface tones` | 18 |
  | `menu surface table covers` | 9 |
  | `menu glossy specular` | 3 |
  | **`menu coin in gold`** | **1** |

- **Art:** `make art-check` exited 0 with `art ok`. All 9 `icon/menu-*.png` lines read `ok`.
- **E2E:** `cd web && npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts --reporter=list`
  gave 86 passed:
  - 8 in `game-menu`: `C6 hotbar row`, `C7 active slot`, `C8 focus outline`, `C14 shortcuts`,
    `C16 command window 360`, `C16 command window 390`, `C24 arrangement 1280`,
    `C24 arrangement 390`;
  - 78 in `responsive`.

  It ran against the running `:8180`/`:3100` e2e stack. No server was started or stopped, and
  `:3000`, `:8080` and `:9180` were not touched.

Citations:

- `art.test.tsx` is refreshed at `81082f8`. The C32 insertion adds 18 lines after `:163`, and the
  C33 insertion follows C30 at `:314`.
- Every other file is untouched by `2b44c49..HEAD`. Its citations are carried from where round 5
  carried them.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 menu specs + PNGs, 16x16 | vitest `catalog art on disk > menu icons per scene, 16x16` ✓ | `web/src/lib/art.test.tsx:136`: `expectAssets(icons(MENU_ICONS.map((id) => \`menu-${id}\`)))`. List at `:27`, size `[16, 16]` at `:77`, asserted at `:55-57`: `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual(size)` | PASS |
| C2 | `make art-check` exits 0 with the 9 specs | `make art-check` exit 0, `art ok`, 9 `menu-*` `ok` | `Makefile:32-33`: `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art`. Error paths confirmed this round at `render.py:340-344` (semi-transparent and off-palette go to `errors`) and `:452` `sys.exit(1 if failed else 0)` | PASS |
| C3 | `GameArt kind="menu"` address/size/class | vitest `GameArt > menu address` ✓ | `web/src/components/GameArt.test.tsx:41-44`: `src` `toBe("/art/icon/menu-loja.png")`, `width`/`height` `toBe("32")`, `className` `toContain("pixelated")` (carried from `e8467f4`) | PASS |
| C4 | 9 slots in order with icon, num, label | vitest `Tabs hotbar > slot icons` ✓ | `web/src/components/Tabs.test.tsx:156`: `expect(got).toEqual(SLOTS.map(... \`/art/icon/menu-${icon}.png\`, "", "32", true]))` (alt `""`, width `"32"`, `pixelated`; tuple built at `:144-153`) (carried from `715aa72`) | PASS |
| C5 | LOJA icon error keeps `07` + `LOJA` | vitest `Tabs hotbar > slot icon fallback` ✓ | `web/src/components/Tabs.test.tsx:163-165`: `querySelector("img")).toBeNull()`, `.tab-num` `toHaveTextContent("07")`, `toHaveTextContent("LOJA")` (carried from `715aa72`) | PASS |
| C6 | 1280 one row, widths ±1, `.tab-icon` 44x44 loaded, page 1200 / scene 760 | playwright `desktop › C6 hotbar row` ✓ | `web/e2e/game-menu.spec.ts:20` `toEqual([44, 44])`; `:21` `naturalWidth` `toBe(16)`; `:23` y-set `toBe(1)`; `:25` spread `toBeLessThanOrEqual(1)`; `:26` `toBe(1200)`; `:27` `toBe(760)` (carried from `80564f6`) | PASS |
| C7 | SERVER frame yellow, other 8 not | playwright `desktop › C7 active slot` ✓ | `web/e2e/game-menu.spec.ts:38-41`: `toBe(YELLOW)` / `.not.toBe(YELLOW)`, `toHaveLength(9)` (carried from `80564f6`) | PASS |
| C8 | Tab focus outline solid 3px yellow | playwright `desktop › C8 focus outline` ✓ | `web/e2e/game-menu.spec.ts:49,54`: `toBeFocused()`; `toEqual({ style: "solid", width: "3px", color: YELLOW })` (carried from `80564f6`) | PASS |
| C9 | keys 1-9 push slot N href once | vitest `shortcut navigates 1 -> /` ... `9 -> /office` (9 ✓) | `web/src/components/Tabs.test.tsx:171-172`: `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(href)` (carried from `715aa72`) | PASS |
| C10 | Ctrl/Meta/Alt+3 do not push | vitest `shortcut ignores modifiers` x3 ✓ | `web/src/components/Tabs.test.tsx:178`: `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C11 | `3` in input/textarea/select/contenteditable does not push | vitest `shortcut ignores editable` x4 ✓ | `web/src/components/Tabs.test.tsx:200,202`: `expect(el).toHaveFocus()`; `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C12 | `0`, `a` do not push | vitest `shortcut ignores other keys 0` / `a` ✓ | `web/src/components/Tabs.test.tsx:209`: `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C13 | open menu + `4`: push `/deploy`, `aria-expanded="false"` | vitest `shortcut closes menu` ✓ | `web/src/components/Tabs.test.tsx:225,227-228`: `"true"` precondition; `toHaveBeenCalledWith("/deploy")`; `toHaveAttribute("aria-expanded", "false")` (carried from `715aa72`) | PASS |
| C14 | browser `4` -> /deploy, `1` -> / | playwright `desktop › C14 shortcuts` ✓ | `web/e2e/game-menu.spec.ts:60-64`: `toHaveURL(/\/deploy$/)`, `PIPELINES DE DEPLOY` visible, `toHaveURL(/\/$/)`, `CLIQUE NAS PLACAS PARA NAVEGAR` visible (carried from `80564f6`) | PASS |
| C15 | `/loja` MENU icon + `MENU · LOJA`; `/login` no img + `MENU` | vitest `menu button icon` ✓ | `web/src/components/Tabs.test.tsx:235-237`: `src` `toBe("/art/icon/menu-loja.png")`, `alt` `toBe("")`, `/^MENU · LOJA$/`; `:241-242` `img` `toBeNull()`, `/^MENU$/` (carried from `715aa72`) | PASS |
| C16 | 360/390 open menu: 9 visible with img, 3x3, no h-scroll | playwright `phone 360 › C16 command window 360` ✓, `phone 390 › C16 command window 390` ✓ | `web/e2e/game-menu.spec.ts:83-84,89-90,92`: `toBeVisible()` x2; `xs.size).toBe(3)`, `ys.size).toBe(3)`; `scrollWidth).toBeLessThanOrEqual(innerWidth)` (carried from `80564f6`) | PASS |
| C17 | responsive browser proofs green, asserts unchanged | playwright `responsive.spec.ts`: 78 passed, each listed | `web/e2e/responsive.spec.ts:58` (`C7 menu on phone`) and the rest; `git diff --stat 80fd17e..HEAD -- web/e2e/responsive.spec.ts` empty (carried from `e8467f4`) | PASS |
| C18 | foundation/responsive `Tabs.test.tsx` proofs green, asserts unchanged | vitest: the 8 foundation/responsive names ✓ and `menu label` x10 ✓ | `web/src/components/Tabs.test.tsx:16-121`, e.g. `:121` `toHaveTextContent(new RegExp(\`^${label}$\`))`. File unchanged since `715aa72` (carried) | PASS |
| C19 | 1px transparent margin, largest side 12-14 (9 icons) | vitest `menu-<id> > menu icon margin and fill` x9 ✓ | `web/src/lib/art.test.tsx:148`: `expect(points.filter(([x, y]) => x === 0 \|\| y === 0 \|\| x === width - 1 \|\| y === height - 1)).toEqual([])`; `:152-153` `side` `toBeGreaterThanOrEqual(12)`, `toBeLessThanOrEqual(14)` | PASS |
| C20 | every opaque pixel with a transparent 4-neighbour is `ink.0` (9 icons) | vitest `menu-<id> > menu icon outline in ink` x9 ✓ | `web/src/lib/art.test.tsx:184`: `expect(edge.filter(([x, y]) => !isInk(x, y))).toEqual([])`, with `edge` at `:183` and `isInk` = `"6,6,18"` at `:145` | PASS |
| C21 | mean Rec.709 luminance of non-ink `x+y<15` > `x+y>15` (9 icons) | vitest `menu-<id> > menu icon light from the top-left` x9 ✓ | `web/src/lib/art.test.tsx:194`: `expect(mean(lit.filter(([x, y]) => x + y < 15))).toBeGreaterThan(mean(lit.filter(([x, y]) => x + y > 15)))` | PASS |
| C22 | `3` already `preventDefault`ed on `body` does not push | vitest `Tabs hotbar > shortcut ignores prevented` ✓ | `web/src/components/Tabs.test.tsx:215-216`: `cancel = (e) => e.preventDefault()` on `document.body`; `:219` `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C23 | per scene, MENU's first child is the icon, then `MENU · <label>` (9) | vitest `menu button icon per scene 01 TÍTULO` ... `09 OFFICE` (9 ✓) | `web/src/components/Tabs.test.tsx:250-253`: `first?.tagName).toBe("IMG")`, `src` `toBe(\`/art/icon/menu-${icon}.png\`)`, `alt` `toBe("")`, `first?.nextSibling?.textContent).toBe(\`MENU · ${label}\`)` (carried from `715aa72`) | PASS |
| C24 | 1280 and 390: num above-left of the icon and inside the slot, label below, glow only on the active slot | playwright `arrangement desktop › C24 arrangement 1280` ✓, `arrangement phone › C24 arrangement 390` ✓ | `web/e2e/game-menu.spec.ts:119-120`: `num.x + num.w` `toBeLessThanOrEqual(s.icon.x)`, `num.y` `toBeLessThan(s.icon.y)`; `:121-124` inside the slot; `:125` `label.y` `toBeGreaterThanOrEqual(s.icon.y + s.icon.h)`; `:126-127` `shadow` `toContain` / `.not.toContain("rgb(255, 224, 138)")`; `:117` `toHaveLength(9)` (carried from `80564f6`) | PASS |
| C25 | `menu-office` has exactly one `code.4` at (4,3); rest of screen x4-11 y3-6 is `code.0`/`code.3` | vitest `menu office specular on the screen` ✓ | `web/src/lib/art.test.tsx:206`: `expect(hex(px, 4, 3)).toBe("#b6f070")`; `:207` `toHaveLength(1)`; `:208` `screen.filter((c) => !["#b6f070", "#1f5a08", "#6bd425"].includes(c))).toEqual([])` | PASS |
| C26 | `office` bezel exactly `stone.3/2/1`; `mundo` paper exactly `cloud.3`, `cloud.2`, `dirt.3` | vitest `menu material tones: office bezel and mundo paper` ✓ | `web/src/lib/art.test.tsx:216`: `expect([...bezel].sort()).toEqual(["#121e2a", "#2a3642", "#46586a"])`; `:227`: `expect([...paper].sort()).toEqual(["#deb060", "#f6ead2", "#fbf6ea"])`; scenery exclusion at `:220` | PASS |
| C27 | enclosed `ink.0` (8-connected, off-canvas transparent) is exactly the listed set per icon | vitest `menu inner ink avatar` ... `loja` (9 ✓) | `web/src/lib/art.test.tsx:251`: `expect(inner).toEqual(expected)`. Table at `:231-239`, `opaque` at `:242`, 8 neighbours at `:248`. It also carries the 1px outline weight (F11) | PASS |
| C28 | each surface of 12 px or more in the table uses at least 3 distinct palette colours (18 surfaces) | vitest `menu surface tones avatar rosto` ... `titulo paredes` (18 ✓) | `web/src/lib/art.test.tsx:290`: `expect(size(chars, counts)).toBeGreaterThanOrEqual(12)`; `:291-292`: `const tones = new Set([...chars].filter((c) => counts[c]).map((c) => toHex(legend[c]))); expect(tones.size).toBeGreaterThanOrEqual(3)`. `toHex` at `:280-283`, `PALETTE` at `:279`, table at `:257-266`, single-layer guard at `:273` | PASS |
| C29 | every grid char other than `o`/`.` belongs to exactly one surface or small part; each small part < 12 px | vitest `menu surface table covers avatar` ... `titulo` (9 ✓) | `web/src/lib/art.test.tsx:300`: `expect([...owners].filter((c) => c === ch), \`${id} '${ch}'\`).toHaveLength(1)`; `:301`: `expect(size(chars, counts), \`${id} ${name}\`).toBeLessThan(12)` | PASS |
| C30 | each glossy surface (`loja` moeda, `office` tela, `deploy` vidro) has exactly one pixel in its ramp's top tone (`gold.4`, `code.4`, `net.4`) | vitest `menu glossy specular deploy vidro` / `loja moeda` / `office tela` (3 ✓) | refreshed: `web/src/lib/art.test.tsx:310`: `expect([...chars].filter((c) => toHex(legend[c]) === toHex(top)).reduce((a, c) => a + (counts[c] ?? 0), 0)).toBe(1)`. It now compares by hex. The top tones are at `:260` (`net.4`), `:261` (`gold.4`) and `:263` (`code.4`). F10 killed | PASS |
| C31 | in each of the 9 PNGs the opaque bbox centre is at most 1px from (7.5, 7.5) in x and in y | vitest `menu-<id> > menu icon centred` x9 ✓ | `web/src/lib/art.test.tsx:160`: `expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (width - 1) / 2)).toBeLessThanOrEqual(1)`; `:161` does the same on `ys` | PASS |
| C32 | in each of the 9 PNGs the opaque pixels form one 8-connected shape | vitest `menu-<id> > menu icon one object` x9 ✓ | `web/src/lib/art.test.tsx:179`: `expect(seen.size).toBe(points.length)`. The flood fill seeds from `points[0]` (`:166-167`) over 8 neighbours (`:170-173`), and `opaque` is alpha 255 (`:142`). F8 killed | PASS |
| C33 | every `moeda` char of `menu-loja` maps to a `gold` ramp colour | vitest `menu coin in gold` ✓ | `web/src/lib/art.test.tsx:319`: `expect(coin.filter((c) => !gold.includes(toHex(legend[c])))).toEqual([])`. `coin` is the used `moeda` chars (`:317`), and `gold` is the palette `gold` hexes (`:318`). F9 killed | PASS |

## Coverage

Two rows are recomputed at `81082f8`:

- **Icon style rules.** The fix rewrote the rule table (S10) and added C32 and C33 as members. The
  authority is the style guide, not the code.
- **Glossy surfaces.** C30's comparison changed.

Every other row is carried from round 5 (`061b607`, and from wherever that round carried it).
Their authority (the specs, the ruling, `TABS`, `Tabs.tsx`, `GameArt.tsx`, `globals.css`, the plan
ACs) is absent from `8bdc01b..HEAD`.

Rule by rule, recomputed from the style guide's general, palette, icon and displaying sections.
For each rule I opened the line the S10 row cites. "Judged" rows are judged against the rendered
preview, and each fails only if the preview clearly breaks the rule.

| Rule (style-guide line) | S10 cites | What the cited line asserts | Verdict |
| --- | --- | --- | --- |
| 16-bit JRPG, bright, saturated, friendly (`:8-9`) | judged | Preview: saturated gold, red, green and blue tones on dark ink, cute shapes | complies |
| dev-life motifs; reads as the scene it names (`:10-12`) | judged | Preview: house, folded map, rack with LEDs, rocket, bug, star, bag with coin, hero head, terminal on a desk | complies |
| 1px `ink` outline on every foreground shape (`:13`) | C20 | ink part: `:184`, every edge pixel `ink`. **1px weight: not C20** (F11: a 2px outline leaves C20 green). The weight is carried by C27 `:251`, the exact list of enclosed ink (F11 killed only by C27) | proven, citation imprecise (C27 is not named) |
| inner detail never ink (`:13-14`) | C27 | `:251` exact enclosed-ink list (eyes and part joints only, as ruled) | proven |
| inner detail in the darkest tone of its own ramp (`:13-14`) | judged | Preview and legends: `bug-fight` seams `red.0`, `server` drawer lines `stone.0`, `titulo` trim `wood.0`, coin rim `gold.0`. `mundo` folds are `dirt.3`, the darkest of the ruled paper surface (C26) | complies |
| light from the top-left (`:15`) | C21 | `:194` mean-luminance proxy (accepted since round 1) | proven |
| one white or top-tone specular on glossy things (`:16`) | C25, C30 | `:206-207` one `code.4` at (4,3); `:310` exactly one top-tone pixel per ruled glossy surface, by hex | proven |
| 3-4 tones per material (`:17`) | C26, C28, C29 | lower bound: `:292` ≥3 colours. Upper bound: every `SURFACES` entry at `:258-266` has ≤4 chars, and `:300` forces each grid char into one entry. The upper bound is held by the fixture, not by an `expect` (as in round 5) | proven |
| tones straight from a ramp; palette only (`:17`, `:24-28`) | C2 | `render.py:338-339,342-344` off-palette pixels go to `errors`, and `:452` then exits 1; `Makefile:33` diffs the render against the committed PNGs | proven |
| no gradients except the dithered sky (`:17-18`) | judged | Preview: flat cel shading (highlight, base, shade). No banded ramps across a surface | complies |
| no AA against transparency, no semi-transparent pixels (`:18`) | C2 | `render.py:336-337,340-341` partial alpha goes to `errors`. At the edge, C20 `:184` also rejects any non-ink pixel | proven |
| depth by atmosphere (`:19-20`) | n/a | backgrounds only. Icons are near-layer shapes and get the outline (C20) | n/a |
| palette `ui` mirrors CSS tokens (`:25-26`) | not listed | not an icon property | n/a |
| 16x16 (`:47`) | C1 | `:55-57` via `:136`, size `[16, 16]` at `:77` | proven |
| shown at 2x-3x (`:47`) | C3, C4 | `GameArt.test.tsx:41-44` and `Tabs.test.tsx:156` width `"32"` on a 16 px native image. No `globals.css` rule resizes `.tab-icon img` (grep: only `.pixelated` at `:35`) | proven |
| one object (`:48`) | C32 | `:179` one 8-connected shape. 8-connectivity lets diagonal-only joints count, such as the `bug-fight` legs and antennae. That matches C27's 8-neighbour convention | proven |
| centred (`:48`) | C31 | `:160-161` | proven |
| ~80% fill (`:48`) | C19 | `:152-153` side 12-14 of 16 | proven |
| full outline (`:48`) | C20 | `:184` | proven |
| coin = `gold` ramp (`:49`) | C33 | `:319` every used `moeda` char is a `gold` hex | proven |
| gem, HP heart, XP green (`:49-50`) | "none in the 9 icons" | Legends read: no gem, heart or XP. The `skills` star is `gold.1-4` and is not currency | n/a |
| set shares light, outline weight, fill (`:51`) | C21, C20, C19 | light `:194`, fill `:152-153`. **Weight: C27 `:251`, not C20** (F11) | proven, citation imprecise |
| render the set with one `--preview` and compare (`:51-52`) | not listed | a process step, not an output property. I did it this round (the preview above) | n/a |
| `pixelated`, whole-number scale, `alt` (`:80-84`) | C3, C4 | `GameArt.test.tsx:44` `pixelated`; `Tabs.test.tsx:156` `true` (pixelated), `"32"`, `""`. MENU icon `alt` `""` at `Tabs.test.tsx:236,252` | proven |

The rule set is complete: no applicable rule of the four sections is missing from S10 or from the
judged/n-a rows above. The two process and chrome rows are not output properties.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| icon style rules, binding (19 applicable) | style guide general, palette, icon and displaying sections (authority outside the code), read at `81082f8`, with members measured on the 9 specs and PNGs and the preview | mechanised (15): outline C20; outline weight C27 (F11); no inner ink C27; light C21; specular C25, C30; 3-4 tones C26, C28, C29; palette only C2; no semi-transparency or AA C2, C20; 16x16 C1; 2x C3, C4; one object C32; centred C31; fill C19; full outline C20; coin gold C33. Judged by eye and named in S10 (4): bright and friendly; motifs; detail in own darkest tone; no gradients. All 4 comply on the preview | - |
| glossy surfaces per the ruling (3) | ruling in plan `Assumptions` "Material"; C30 re-checked at `:310` by hex | `loja` moeda C30 (F10 killed) · `office` tela C25, C30 · `deploy` vidro C30. No top tone has an alias in `palette.json` (the 4 aliases are `ink.1`=`soil.0`, `ink.2`=`hoodie.0`, `leaf.3`=`grass.3` and `soil.3`=`wood.1`, recomputed this round), so the move from names to hex changes no outcome today | - |
| surfaces of 12 px or more (18) | carried from `061b607` (specs untouched) | all 18 C28 (hex), completeness C29 | - |
| slot arrangement (5) | carried from `80564f6` | number top-left and inside C24 · square icon frame C6 · label below C24 · active glow C24 · active yellow border C7 | - |
| shortcut guards (10) | `Tabs.tsx:33-35` + door 3 (carried from `715aa72`) | `defaultPrevented` C22 · Ctrl, Meta, Alt C10 · `input`, `textarea`, `select`, `[contenteditable]` C11 · `0`, `a` C12 | - |
| MENU button icon by route (9 scenes + outside) | plan AC 13, `TABS` (carried from `715aa72`) | 9 scenes C23 · outside `TABS` C15 | - |
| menu icons on disk (9) | plan AC 1 (carried from `e8467f4`) | all 9 C1, C2 | - |
| slots with icon (9) | `TABS` (carried from `e8467f4`) | all 9 C4 | - |
| slot states (4) | plan AC 4, 6, 7 (carried from `e8467f4`) | active C7 · inactive x8 C7 · focused C8 · icon failed C5 | - |
| shortcut keys (9) | door 3 / AC 8 (carried from `e8467f4`) | `1`-`9` C9; `4` and `1` also C14 | - |
| shortcut side effects (2) | `Tabs.tsx:37-38` (carried from `e8467f4`) | navigate C9, C14 · close menu C13 | - |
| phone widths with open menu (2) | plan AC 14 (carried from `e8467f4`) | 360 C16 · 390 C16, C24 | - |
| Landing doors (3) | plan Landing (carried from `715aa72`) | door 1 C1, C4 · door 2 C3 · door 3 C9-C14, C22 | - |

Findings about the checks. None of them leaves a member unproven.

1. **Precision gap in the S10 table.** Two rows name C20 as the proof of outline weight:
   "1px `ink` outline (13)" and "one set shares ... outline weight (51-52)". C20 does not assert
   weight. C27 does, and F11 shows it. The table should cite C27 on both rows.
2. **Carried: the "at most 4 tones" bound is not an assertion.** It holds because the `SURFACES`
   fixture has at most 4 chars per entry. It was accepted in round 5 and is unchanged.
3. **C33 depends on the surface table.** It checks the chars the table assigns to `moeda`. A coin
   pixel redrawn with a bag char would not be seen. C29 does catch any new char, because an
   unowned char fails it. I accept this.

## Test policy rows

The first three rows are carried from `80564f6`, because their files are untouched by
`2b44c49..HEAD`. The instrumentation row is verified at `81082f8`, because its consumer
`art.test.tsx` changed.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` keydown handler (door 3) | boundary C14 · own layer C9-C13, C22 | yes (carried from `80564f6`; re-ran green at `81082f8`) |
| Decides, not reached across a boundary | `Tabs.tsx` slot + MENU rendering; `GameArt.tsx` `menu` address | own layer C4, C5, C15, C23, C3 | yes (carried from `80564f6`; re-ran green) |
| Decides at the boundary only (CSS the browser evaluates; `checks.md` Test policy) | `web/src/app/globals.css` hotbar + 3x3 rules | boundary C6, C7, C8, C16, C24 | yes (carried from `80564f6`; the 86 e2e re-ran green at `81082f8`) |
| Instrumentation, pass-throughs | 9 `web/art/icon/menu-*.json` + PNGs (data, untouched in this fix) | none of their own; consumers C1, C2, C19-C33 | yes. Every consumer re-ran green at `81082f8`, and F8-F11 were each killed by exactly one consumer. Full `npx vitest run`: 410 passed |

## Faults injected

Verified at `81082f8`.

Setup and restore:

- I worked in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` copied in
  (`cp -Rc`).
- For each fault, a script edited the worktree spec. I re-rendered it with
  `python3 .claude/skills/pixel-assets/scripts/render.py web/art/icon/menu-<id>.json --out web/public/art`
  in the worktree (`ok` each time), then ran `npx vitest run src/lib/art.test.tsx` from the
  worktree `web/`. Then I ran `git checkout -- web/art web/public/art`, and the worktree porcelain
  was empty after each fault.
- These are art-only faults, so no server was touched.
- Cleanup: I ran `git worktree remove --force`. The real tree's `git status --porcelain` was
  identical before and after (14 pre-existing untracked lines, compared with `diff`).

Scope: the surfaces this fix created (C32, C33), the C30 line it changed, and the S10 row claims
that cite a proof. F1-F7 are carried from `2b44c49` and `061b607`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F8: a stray disconnected `ink` pixel at (7,1) above the `bug-fight` head. It stays inside the bbox, off the margin and not enclosed | `web/art/icon/menu-bug-fight.json` grid row 1 | yes. Only `menu-bug-fight > menu icon one object` (C32) failed, with `expected 128 to be 129`: 1 failed / 98 passed. C19, C20, C27 and C31 stayed green, so C32 is the only proof carrying "one object" |
| F9: coin rim `g` `gold.0` -> `dirt.0` (brown). The coin keeps 4 colours and one `gold.4` | `web/art/icon/menu-loja.json` legend `g` | yes. Only `menu coin in gold` (C33) failed, with `expected [ 'g' ] to deeply equal []`: 1 failed / 98 passed. C28 (≥3 tones) and C30 stayed green |
| F10: a second top-tone pixel on the coin, (6,11) `y` -> `l` (`gold.4`), exercising the refreshed hex comparison | `web/art/icon/menu-loja.json` grid row 11 | yes. Only `menu glossy specular loja moeda` (C30) failed, with `expected 2 to be 1`: 1 failed / 98 passed |
| F11: the `titulo` bottom outline drawn 2px thick (row 13 x3-12 -> `o`), which tests the S10 claim that the 1px weight is proven | `web/art/icon/menu-titulo.json` grid row 13 | yes. Only `menu inner ink titulo` (C27) failed, with `expected [ [ 3, 13 ], [ 4, 13 ], …(8) ] to deeply equal []`: 1 failed / 98 passed. **C20 stayed green**, which is why the S10 citation of C20 for weight is imprecise |

No C30 alias mutant exists. None of `gold.4`, `code.4` or `net.4` shares a hex with another
palette name (alias list recomputed from `palette.json`). So the name-to-hex change has no alias
fault to inject today. F10 makes the changed expression fail instead.

## Gate

- `cd web && npx vitest run`: 410 passed, 0 failed (18 files).
- The unit batch (3 files): 166 passed.
- `npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts`: 86 passed, 0 failed.
- `make art-check`: exit 0, `art ok`.
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py game-menu`: exit 0,
  with 0 errors and 0 warnings.

Non-blocking follow-up for the checks text: on the two S10 outline-weight rows ("1px `ink`
outline (13)" and "one set shares ... outline weight (51-52)"), cite C27 alongside C20.
