# Game menu verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 80fd17e..2b44c49
**Round**: 4 - scoped
**Verifier**: independent sub-agent (author != verifier)

I re-ran all 30 proofs at `2b44c49` and they are green. Each named test appears individually
below. Every round 3 gap is closed:

- The `server` frame is now `metal.3`/`metal.2`/`metal.1` (11/12/11 px) and the drawers are
  `stone.2`/`stone.1`/`stone.0` (18/12/18 px).
- The checks no longer overclaim tones and speculars. C28-C30 measure every surface in the table,
  and C29 proves the table covers every legend char in all 9 specs.
- The user ruled what "material" means (plan `Assumptions` row "Material", confirmed `y`).

I recomputed the surface table from the 9 specs, independently of the test. The results:

- There are 18 surfaces of 12 px or more. Each one has at least 3 distinct rendered colours.
- There are 13 small parts, all under 12 px.
- The 3 glossy surfaces the ruling names (coin, screen, glass) each have exactly one pixel in the
  top tone of their ramp.
- No coin, screen or glass in the 9 icons is missing from the table.
- The C26 exclusion change only removes land.

4 of 5 faults were killed. **One mutant survived:** C28 counts tones by palette *name*, but its
claim says "3 cores distintas da paleta" (3 distinct colours). The palette has 4 aliased pairs.
One of them is `grass.3` = `leaf.3` = `#78c828`, the land green `mundo` already uses. I remapped
the `mundo` land's `L` from `leaf.1` to `grass.3`. The land then renders in 2 colours
(`#78c828`, `#588818`), and every proof stays green, C28 `menu surface tones mundo terra`
included. The tone rule is the one this feature has failed on for three rounds, and its own
proof lets a 2-tone land through.

That makes the round a FAIL. The fix is one line in the test: resolve each legend name to its
palette hex before counting. The art at HEAD is correct. I measured the hex count per surface
myself (table below).

New finding about the checks: the S6 closing sentence (`checks.md:102`) was rewritten in this fix.
It now says "Silhouette readability is the only style rule left to preview judgement". But the
style guide's "one object, centred" has no check either. C19 bounds the margin and the fill, and a
12 px wide object at x1-12 would pass it. All 9 icons are centred within 0.5 px, so the art is
fine. The sentence overclaims in the same way round 3 flagged.

## Binding sources

Verified at `2b44c49`. The fix redrew the `menu-server`, `menu-avatar`, `menu-mundo` and
`menu-deploy` specs and PNGs. I read the binding sources through the user's ruling in plan
`Assumptions` (`plan.md:52`): "material" = each surface of 12 px or more, defined by the spec's
legend chars. Parts under 12 px are exempt. "Glossy" = coin, screen, glass, each with exactly one
pixel in the top tone of its ramp.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` (plan `Sources`: binding for icon style), read through plan `Assumptions` "Material" (`plan.md:52`, confirmed `y`) | yes. I re-read the key art and the full style guide. I rendered the 9 specs with `render.py web/art/icon/menu-*.json --out <scratch> --preview <scratch>/p.png`: 9 `ok`, all 9 byte-identical to the committed PNGs under `cmp`. I read the preview. I measured every surface from the specs, with legend names resolved to `palette.json` hex, and every PNG for bbox, centring and semi-transparency | none. C28 matches "3-4 tones per material" under the ruling. C29 makes the surface partition total. C30 matches "single ... top-tone specular pixel" for coin, screen and glass. I found no surface of 12 px or more with fewer than 3 rendered colours, and no glossy surface without exactly one top-tone pixel | - |

Round 3 gaps, re-measured at `2b44c49`:

| Round 3 gap | At `2b44c49` | Stated exactly by | Closed |
| --- | --- | --- | --- |
| `server` rack metal has 1 tone | `estrutura` `M m n` = `metal.3` 11 (left rail), `metal.2` 12 (shelf bars), `metal.1` 11 (right rail): 34 px, 3 tones. `gavetas` `S d z` = `stone.2` 18, `stone.1` 12, `stone.0` 18 | C28 `menu surface tones server estrutura` / `server gavetas` (`art.test.tsx:238`, `:258-260`) | yes |
| checks overclaim tone and specular coverage | Coverage row "icon style rules, mechanised (7)" now cites C25+C30 and C26+C28+C29. S8's table covers all 9 icons, and C29 fails on any legend char outside it (F2 killed) | C28-C30, `checks.md` S8 | yes, for tones and specular. The rewritten S6 sentence (`checks.md:102`) still omits "centred" (see Coverage) |
| "material" undefined | ruled by the user: plan `Assumptions` "Material" (`plan.md:52`, `y`) | S8 surface table, `art.test.tsx:231-241` | yes |

The surface table, recomputed from the 9 specs. Tones = distinct palette hex among chars with at
least 1 px. The authority is the specs plus the ruling:

| Icon | Surfaces of 12 px or more (px, hex tones) | Small parts (px) | Partition judgement |
| --- | --- | --- | --- |
| avatar | rosto `s m S p` 46, 4 (`skin.2/3/1` + `red.4` cheeks) · cabelo `h H j` 26, 3 · moletom `k K n` 28, 3 | zíper `c` 4 | sensible. Hair and hoodie share the `hoodie` ramp but are separate surfaces, as the ruling's own example says. The face is still 3 skin tones without the cheeks |
| bug-fight | casco `l r R s` 74, 4 | cabeça `k` 8 · olhos `w` 2 | sensible. `red.0` is seams and spots in the shell's own darkest tone, and the shell has 3 tones without them |
| deploy | corpo `w m M` 28, 3 · aletas `r R l` 16, 3 | vidro `b B` 4 · chama `y Y f` 4 | sensible. "aletas" also holds the nose cone (rows 2-3, 6 px), because they share chars, so it is one red paint. The name is imprecise, not wrong |
| loja | saco `D d m` 72, 3 · moeda `g y l M` 20, 4 | cordão `r` 4 | sensible. The coin has 3 tones even without its `gold.0` rim |
| mundo | papel `p P q` 82, 3 · terra `g G L` 20, 3 | água `b` 9 · trilha `x` 9 | sensible. The land is several printed patches of one material. `leaf.1` is 2 px, which gives exactly 3 tones |
| office | tela `g G S` 32, 3 · moldura `f E F` 28, 3 · mesa `W w d` 24, 3 | suporte `M m` 2 | acceptable. The screen's 3 tones are base, the `>_` glyph and the specular. The desk's third tone is 1 px (`wood.3` at (13,11)). Both are mechanically 3 under the ruling |
| server | estrutura `M m n` 34, 3 · gavetas `S d z` 48, 3 | LEDs `g b y` 6 | sensible |
| skills | estrela `b m l w` 59, 4 | - | sensible |
| titulo | telhado `r R l` 42, 3 · paredes `W w d k` 53, 4 | porta `D` 3 · janela `y Y` 4 | sensible. `wood.0` (`k`) is the window and door trim in the wall's darkest tone. The walls have 3 tones without it |

That is 18 surfaces and 13 small parts. Every non-`o` char in the 9 specs belongs to exactly one of
them.

Glossy sweep:

- **Coins:** `loja` moeda only. It has `gold.4` x1, and `gold.4` is the top of the 5-entry `gold`
  ramp. The `skills` star is gold, but it is a star, not a coin.
- **Screens:** `office` tela only. It has `code.4` x1, the top of `code`. `server` has LEDs, not a
  screen.
- **Glass:** the `deploy` vidro. It has `net.4` x1, the top of `net`.
- **The `titulo` janela:** a lamp-lit window. The ruling row lists "janela" among the exempt parts,
  separately from "vidro". It passes anyway: `lamp.3` x1 at (5,10), and `lamp.3` is the top of the
  4-entry `lamp` ramp.

Nothing glossy is missing from the table.

C26 exclusion change: `#286828` is `leaf.1` only. It has no alias in `palette.json`, whose 4
aliases are `ink.1`=`soil.0`, `ink.2`=`hoodie.0`, `leaf.3`=`grass.3` and `soil.3`=`wood.1`. It is
not a paper tone. The paper assertion is still the exact `toEqual` of 3 hex (`art.test.tsx:201`).
So the change only removes a land tone, and F4, which painted 3 paper pixels as water, left C26
green as it should.

All 9 icons have 0 semi-transparent pixels. The 4 re-rendered icons render `ok` (palette-locked).
The bbox centre is within 0.5 px of (7.5, 7.5) in all 9.

Plan `Sources` "Hotbar RPG": carried from `715aa72`. The fix did not touch the interface
(`git diff --stat 80564f6..HEAD -- web/src/components web/src/app web/e2e Makefile` is empty).

## Checks

Verified at `2b44c49`. I re-ran every proof at HEAD myself.

- **Unit:** one invocation, `cd web && npx vitest run src/components/Tabs.test.tsx src/components/GameArt.test.tsx src/lib/art.test.tsx --reporter=verbose`, 147 passed, exit 0. Every name below appears with ✓.
- **Art:** `make art-check` exited 0 with `art ok` and 9 `ok .../icon/menu-*.png` lines.
- **E2E:** one invocation, `cd web && npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts --reporter=list`, 86 passed (8 game-menu, 78 responsive). It ran against the running `:3100` production build of the real `web/`. No CSS, component or e2e file changed in `80564f6..HEAD`, and `next start` serves the changed `public/` PNGs at runtime.

Citation refresh:

- `art.test.tsx`: this fix changed `:194` in place (the C26 exclusion list gained `#286828`) and
  appended `:228-280` (C28-C30). I confirmed `:27`-`:226` at HEAD, and they keep round 3's
  numbers.
- `game-menu.spec.ts`: unchanged in `80564f6..HEAD`, so its citations are carried from `80564f6`.
- `Tabs.test.tsx`: carried from `715aa72`.
- `GameArt.test.tsx`, `responsive.spec.ts`, `Makefile`: carried from `e8467f4`. None of these
  files is in `80564f6..HEAD`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 menu specs + PNGs, 16x16 | vitest `catalog art on disk > menu icons per scene, 16x16` ✓ | `web/src/lib/art.test.tsx:136` - `expectAssets(icons(MENU_ICONS.map((id) => \`menu-${id}\`)))`, list `:27`, size `[16, 16]` `:77`, asserted `:55-57` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual(size)` | PASS |
| C2 | `make art-check` exits 0 with the 9 specs | `make art-check` exit 0, `art ok`, 9 `menu-*` `ok` | `Makefile:32-33` - `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art` (carried from `e8467f4`) | PASS |
| C3 | `GameArt kind="menu"` address/size/class | vitest `GameArt > menu address` ✓ | `web/src/components/GameArt.test.tsx:41-44` - `src` `toBe("/art/icon/menu-loja.png")`, `width`/`height` `toBe("32")`, `className` `toContain("pixelated")` (carried from `e8467f4`) | PASS |
| C4 | 9 slots in order with icon, num, label | vitest `Tabs hotbar > slot icons` ✓ | `web/src/components/Tabs.test.tsx:156` - `expect(got).toEqual(SLOTS.map(... \`/art/icon/menu-${icon}.png\`, "", "32", true]))`, SLOTS `:126` (carried from `715aa72`) | PASS |
| C5 | LOJA icon error keeps `07` + `LOJA` | vitest `Tabs hotbar > slot icon fallback` ✓ | `web/src/components/Tabs.test.tsx:163-165` - `querySelector("img")).toBeNull()`, `.tab-num` `toHaveTextContent("07")`, `toHaveTextContent("LOJA")` (carried from `715aa72`) | PASS |
| C6 | 1280 one row, widths ±1, `.tab-icon` 44x44 loaded, page 1200 / scene 760 | playwright `desktop › C6 hotbar row` ✓ | `web/e2e/game-menu.spec.ts:20` `toEqual([44, 44])`; `:21` `naturalWidth` `toBe(16)`; `:23` y-set `toBe(1)`; `:25` spread `toBeLessThanOrEqual(1)`; `:26` `toBe(1200)`; `:27` `toBe(760)` (carried from `80564f6`) | PASS |
| C7 | SERVER frame yellow, other 8 not | playwright `desktop › C7 active slot` ✓ | `web/e2e/game-menu.spec.ts:38-41` - `toBe(YELLOW)` / `.not.toBe(YELLOW)`, `toHaveLength(9)` (carried from `80564f6`) | PASS |
| C8 | Tab focus outline solid 3px yellow | playwright `desktop › C8 focus outline` ✓ | `web/e2e/game-menu.spec.ts:49,54` - `toBeFocused()`; `toEqual({ style: "solid", width: "3px", color: YELLOW })` (carried from `80564f6`) | PASS |
| C9 | keys 1-9 push slot N href once | vitest `shortcut navigates 1 -> /` ... `9 -> /office` (9 ✓) | `web/src/components/Tabs.test.tsx:171-172` - `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(href)` (carried from `715aa72`) | PASS |
| C10 | Ctrl/Meta/Alt+3 do not push | vitest `shortcut ignores modifiers {Control>}3{/Control}` / `{Meta>}` / `{Alt>}` ✓ | `web/src/components/Tabs.test.tsx:178` - `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C11 | `3` in input/textarea/select/contenteditable does not push | vitest `shortcut ignores editable input` / `textarea` / `select` / `contenteditable` ✓ | `web/src/components/Tabs.test.tsx:200,202` - `expect(el).toHaveFocus()`; `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C12 | `0`, `a` do not push | vitest `shortcut ignores other keys 0` / `a` ✓ | `web/src/components/Tabs.test.tsx:209` - `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C13 | open menu + `4`: push `/deploy`, `aria-expanded="false"` | vitest `shortcut closes menu` ✓ | `web/src/components/Tabs.test.tsx:225,227-228` - `"true"` precondition; `toHaveBeenCalledWith("/deploy")`; `toHaveAttribute("aria-expanded", "false")` (carried from `715aa72`) | PASS |
| C14 | browser `4` -> /deploy, `1` -> / | playwright `desktop › C14 shortcuts` ✓ | `web/e2e/game-menu.spec.ts:60-64` - `toHaveURL(/\/deploy$/)`, `PIPELINES DE DEPLOY` visible, `toHaveURL(/\/$/)`, `CLIQUE NAS PLACAS PARA NAVEGAR` visible (carried from `80564f6`) | PASS |
| C15 | `/loja` MENU icon + `MENU · LOJA`; `/login` no img + `MENU` | vitest `menu button icon` ✓ | `web/src/components/Tabs.test.tsx:235-237` - `src` `toBe("/art/icon/menu-loja.png")`, `alt` `toBe("")`, `/^MENU · LOJA$/`; `:241-242` `img` `toBeNull()`, `/^MENU$/` (carried from `715aa72`) | PASS |
| C16 | 360/390 open menu: 9 visible with img, 3x3, no h-scroll | playwright `phone 360 › C16 command window 360` ✓, `phone 390 › C16 command window 390` ✓ | `web/e2e/game-menu.spec.ts:83-84,89-90,92` - `toBeVisible()` x2; `xs.size).toBe(3)`, `ys.size).toBe(3)`; `scrollWidth).toBeLessThanOrEqual(innerWidth)` (carried from `80564f6`) | PASS |
| C17 | responsive browser proofs green, asserts unchanged | playwright `responsive.spec.ts` 78 passed (78 lines in the list output) | `web/e2e/responsive.spec.ts:58` (`C7 menu on phone`) and the rest; `git diff --stat 80fd17e..HEAD -- web/e2e/responsive.spec.ts` is empty (carried from `e8467f4`) | PASS |
| C18 | foundation/responsive `Tabs.test.tsx` proofs green, asserts unchanged | vitest `tab order and routes`, `marks only the current route's tab as current`, `menu starts closed`, `menu opens`, `link closes menu`, `button closes menu`, `escape closes menu`, `other keys keep menu open`, `menu label` x10 ✓ | `web/src/components/Tabs.test.tsx:16-121` (e.g. `:121` `toHaveTextContent(new RegExp(\`^${label}$\`))`); file unchanged since `715aa72` (carried from `715aa72`) | PASS |
| C19 | 1px transparent margin, largest side 12-14 (9 icons) | vitest `menu-<id> > menu icon margin and fill` x9 ✓ | `web/src/lib/art.test.tsx:148` - `expect(points.filter(([x, y]) => x === 0 \|\| y === 0 \|\| x === width - 1 \|\| y === height - 1)).toEqual([])`; `:152-153` `side` `toBeGreaterThanOrEqual(12)`, `toBeLessThanOrEqual(14)` | PASS |
| C20 | every opaque pixel with a transparent 4-neighbour is `ink.0` (9 icons) | vitest `menu-<id> > menu icon outline in ink` x9 ✓ | `web/src/lib/art.test.tsx:158` - `expect(edge.filter(([x, y]) => !isInk(x, y))).toEqual([])`, `isInk` = `"6,6,18"` `:145` | PASS |
| C21 | mean Rec.709 luminance of non-ink `x+y<15` > `x+y>15` (9 icons) | vitest `menu-<id> > menu icon light from the top-left` x9 ✓ | `web/src/lib/art.test.tsx:168` - `expect(mean(lit.filter(([x, y]) => x + y < 15))).toBeGreaterThan(mean(lit.filter(([x, y]) => x + y > 15)))`, weights `:164` | PASS |
| C22 | `3` already `preventDefault`ed on `body` does not push | vitest `Tabs hotbar > shortcut ignores prevented` ✓ | `web/src/components/Tabs.test.tsx:215-216` - `cancel = (e) => e.preventDefault()` on `document.body`; `:219` `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C23 | per scene, MENU's first child is the icon, then `MENU · <label>` (9) | vitest `menu button icon per scene 01 TÍTULO` ... `09 OFFICE` (9 ✓) | `web/src/components/Tabs.test.tsx:250-253` - `first?.tagName).toBe("IMG")`, `src` `toBe(\`/art/icon/menu-${icon}.png\`)`, `alt` `toBe("")`, `first?.nextSibling?.textContent).toBe(\`MENU · ${label}\`)` (carried from `715aa72`) | PASS |
| C24 | 1280 and 390: num above-left of the icon and inside the slot, label below, glow only on the active slot | playwright `arrangement desktop › C24 arrangement 1280` ✓, `arrangement phone › C24 arrangement 390` ✓ | `web/e2e/game-menu.spec.ts:119-120` `num.x + num.w` `toBeLessThanOrEqual(s.icon.x)`, `num.y` `toBeLessThan(s.icon.y)`; `:121-124` inside the slot on 4 edges; `:125` `label.y` `toBeGreaterThanOrEqual(s.icon.y + s.icon.h)`; `:126-127` `shadow` `toContain` / `.not.toContain("rgb(255, 224, 138)")`; `:117` `toHaveLength(9)` (carried from `80564f6`) | PASS |
| C25 | `menu-office` has exactly one `code.4` at (4,3); rest of screen x4-11 y3-6 is `code.0`/`code.3` | vitest `menu office specular on the screen` ✓ | `web/src/lib/art.test.tsx:180` - `expect(hex(px, 4, 3)).toBe("#b6f070")`; `:181` `toHaveLength(1)`; `:182` `screen.filter((c) => !["#b6f070", "#1f5a08", "#6bd425"].includes(c))).toEqual([])` | PASS |
| C26 | `office` bezel exactly `stone.3/2/1`; `mundo` paper exactly `cloud.3`, `cloud.2`, `dirt.3` | vitest `menu material tones: office bezel and mundo paper` ✓ | `web/src/lib/art.test.tsx:190` - `expect([...bezel].sort()).toEqual(["#121e2a", "#2a3642", "#46586a"])`, ring `:188-189`; `:201` - `expect([...paper].sort()).toEqual(["#deb060", "#f6ead2", "#fbf6ea"])`, scenery exclusion refreshed at `:194` `["#060612", "#78c828", "#588818", "#286828", "#1296d2", "#c62a42"]` (ink, `leaf.3`, `leaf.2`, new `leaf.1`, `sky.3`, `red.2`: land tones only, no paper tone) | PASS |
| C27 | enclosed `ink.0` (8-connected, off-canvas transparent) is exactly the listed set per icon | vitest `menu inner ink avatar` ... `loja` (9 ✓) | `web/src/lib/art.test.tsx:225` - `expect(inner).toEqual(expected)`, table `:205-213`, `opaque` `:216`, 8 neighbours `:222`. The changed `avatar`, `server`, `mundo`, `deploy` art still matches | PASS |
| C28 | each surface of 12 px or more in the table uses at least 3 distinct palette colours (18 surfaces) | vitest `menu surface tones avatar rosto` ... `titulo paredes` (18 ✓) | `web/src/lib/art.test.tsx:258` - `expect(size(chars, counts)).toBeGreaterThanOrEqual(12)`; `:259-260` - `const tones = new Set([...chars].filter((c) => counts[c]).map((c) => legend[c])); expect(tones.size).toBeGreaterThanOrEqual(3)`; table `:231-241`. The assertion counts palette *names*, not colours (see F5). The claim holds at HEAD by my own hex count (Binding sources table) | PASS |
| C29 | every grid char other than `o`/`.` belongs to exactly one surface or small part; each small part < 12 px | vitest `menu surface table covers avatar` ... `titulo` (9 ✓) | `web/src/lib/art.test.tsx:268` - `for (const ch of Object.keys(counts).filter((c) => c !== "o")) expect([...owners].filter((c) => c === ch), \`${id} '${ch}'\`).toHaveLength(1)`; `:269` - `expect(size(chars, counts), \`${id} ${name}\`).toBeLessThan(12)` | PASS |
| C30 | each glossy surface (`loja` moeda, `office` tela, `deploy` vidro) has exactly one pixel in its ramp's top tone (`gold.4`, `code.4`, `net.4`) | vitest `menu glossy specular deploy vidro` / `loja moeda` / `office tela` (3 ✓) | `web/src/lib/art.test.tsx:278` - `expect([...chars].filter((c) => legend[c] === top).reduce((a, c) => a + (counts[c] ?? 0), 0)).toBe(1)`; tops readable at `:234,:235,:237` (`net.4`, `gold.4`, `code.4`), each the last index of its ramp in `palette.json` | PASS |

## Coverage

I recomputed at `2b44c49` the rows whose authority the fix touched: icon style rules, surfaces of
12 px or more, and glossy surfaces (these last two are new). The other rows are carried from
`80564f6` (or from where round 3 carried them). Their authority (`TABS`, `Tabs.tsx`, `GameArt.tsx`,
`globals.css`, plan ACs) is absent from `80564f6..HEAD`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| icon style rules, binding (12) | style guide `icon` + general rules, read through plan `Assumptions` "Material" (authority outside the code); members measured on the 9 specs and PNGs | 16x16 C1 · palette C2 (palette-locked render, `cmp` identical) · 0 semi-transparent C2 + measured 0 · 1px margin C19 · fill ~80% C19 · `ink` outline C20 · top-left light C21 · no inner-detail ink C27 · specular on every glossy surface C25, C30 · 3+ tones on every surface of 12 px or more C26, C28, C29 (tones counted by name, F5) · one object: judged 9/9 · centred: measured 9/9 within 0.5px, no check | checks precision: `checks.md:102` (rewritten in this fix) says "Silhouette readability is the only style rule left to preview judgement", but "centred" (style guide `icon`) has no check. C19 bounds the margin and the fill, not the centre. The art is centred, so this is a text/coverage gap, not an art defect |
| surfaces of 12 px or more (18) | the 9 specs' legend chars (authority = specs + ruling), recomputed independently | avatar rosto 46/4 · cabelo 26/3 · moletom 28/3 · bug-fight casco 74/4 · deploy corpo 28/3 · aletas 16/3 · loja saco 72/3 · moeda 20/4 · mundo papel 82/3 · terra 20/3 · office tela 32/3 · moldura 28/3 · mesa 24/3 · server estrutura 34/3 · gavetas 48/3 · skills estrela 59/4 · titulo telhado 42/3 · paredes 53/4 (px / hex tones): each C28, with table completeness C29 (13 small parts, all < 12 px) | - |
| glossy surfaces per the ruling (3) | ruling "moeda, tela, vidro" + sweep of the 9 icons for other coins, screens, glass | `loja` moeda `gold.4` x1 C30 · `office` tela `code.4` x1 C25, C30 · `deploy` vidro `net.4` x1 C30. None missed. The `titulo` janela is a lamp-lit window that the ruling lists as exempt, and it has `lamp.3` (top) x1 anyway | - |
| slot arrangement (5) | plan `Sources` "Hotbar RPG" + `Assumptions` squareness ruling (carried from `80564f6`) | number top-left and inside the slot C24 · square icon frame C6 · label below C24 · active glow C24 · active yellow border C7 | - |
| shortcut guards (10) | `web/src/components/Tabs.tsx:33-35` + door 3 (carried from `715aa72`) | `defaultPrevented` C22 · Ctrl, Meta, Alt C10 · `input`, `textarea`, `select`, `[contenteditable]` C11 · `0`, `a` C12 | - |
| MENU button icon by route (9 scenes + outside) | plan AC 13, `TABS` (`Tabs.tsx:8-18`) (carried from `715aa72`) | 9 scenes C23 · outside `TABS` C15 | - |
| menu icons on disk (9) | plan AC 1 (carried from `e8467f4`) | all 9 C1, C2 | - |
| slots with icon (9) | `TABS` (carried from `e8467f4`) | all 9 C4 | - |
| slot states (4) | plan AC 4, 6, 7 (carried from `e8467f4`) | active C7 · inactive x8 C7 · focused C8 · icon failed C5 | - |
| shortcut keys (9) | door 3 / AC 8 (carried from `e8467f4`) | `1`-`9` C9, `4` and `1` also C14 | - |
| shortcut side effects (2) | `Tabs.tsx:37-38` (carried from `e8467f4`) | navigate C9, C14 · close menu C13 | - |
| phone widths with open menu (2) | plan AC 14 (carried from `e8467f4`) | 360 C16 · 390 C16, 390 also C24 | - |
| Landing doors (3) | plan Landing (carried from `715aa72`) | door 1 C1, C4 · door 2 C3 · door 3 C9-C14, C22 | - |

## Test policy rows

The first three rows are carried from `80564f6`. Their files are untouched by `80564f6..HEAD`. The
instrumentation row classifies the touched art files, so I verified it at `2b44c49`.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` keydown handler (door 3) | boundary C14 · own layer C9-C13, C22 | yes. Every row of `Tabs.tsx:33-35` has an asserted case, and C14 covers the boundary (carried from `80564f6`) |
| Decides, not reached across a boundary | `Tabs.tsx` slot + MENU rendering; `GameArt.tsx` `menu` address | own layer C4, C5, C15, C23, C3 | yes (carried from `80564f6`) |
| Decides at the boundary only (CSS the browser evaluates; `checks.md` Test policy) | `web/src/app/globals.css` hotbar + 3x3 rules | boundary C6, C7, C8, C16, C24 | yes (carried from `80564f6`; the 86 e2e re-ran green at HEAD) |
| Instrumentation, pass-throughs | 9 `web/art/icon/menu-*.json` + PNGs (data; `server`, `avatar`, `mundo`, `deploy` touched) | none of their own; consumers C1, C2, C19-C30 | yes. Each consumer re-ran green at HEAD, and F1-F4 were killed through C28-C30. The consumer's weakness is recorded under F5, not here. Full `npx vitest run`: 391 passed |

## Faults injected

Verified at `2b44c49`.

Setup and restore:

- I ran the faults in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` cloned in
  (`cp -Rc`).
- For each fault, I edited the worktree spec, re-rendered it with
  `render.py web/art/icon/menu-<id>.json --out web/public/art` in the worktree (`ok`), and ran the
  narrowest vitest proof from the worktree. Then I ran `git checkout -- web/art web/public/art`,
  and the worktree porcelain was empty.
- These are art-only faults, so no server was touched.
- Cleanup: I ran `git worktree remove --force`. The real tree's `git status --porcelain` was
  identical before and after (14 pre-existing untracked lines).

The cap is 5, one fault per new assertion surface: C28 tone count, C29 ownership, C29 small-part
bound, C30 specular count, and the C28 claim's value (colours, not names). Round 3's F1-F5 on
C19 and C24-C27 are carried from `80564f6`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `server` frame collapsed to 2 tones (legend `n` `metal.1` -> `metal.2`), re-rendered | `web/art/icon/menu-server.json` legend `n` | yes - C28 `menu surface tones server estrutura` (`expected 2 to be greater than or equal to 3`) |
| F2 legend char outside the table (new `X` = `wood.4`, grid row 11 col 3 `W` -> `X` on the desk) | `web/art/icon/menu-office.json` legend + grid row 11 | yes - C29 `menu surface table covers office` (`office 'X': expected [] to have a length of 1 but got +0`). C28 `office mesa` stayed green, as it should |
| F3 second top-tone pixel on the coin (grid row 11 col 6 `y` `gold.2` -> `l` `gold.4`) | `web/art/icon/menu-loja.json` grid row 11 | yes - C30 `menu glossy specular loja moeda` (`expected 2 to be 1`) |
| F4 small part grown to 12 px (3 paper `p` -> water `b`, at (11,5), (11,6), (12,6)) | `web/art/icon/menu-mundo.json` grid rows 5-6 | yes - C29 `menu surface table covers mundo` (`mundo agua: expected 12 to be less than 12`). C26 stayed green, as it should |
| F5 land tone swapped for an aliased palette name (legend `L` `leaf.1` -> `grass.3`, which is `#78c828`, the same hex as `leaf.3`). I decoded the re-rendered PNG: the land is `#78c828` + `#588818`, so 2 colours | `web/art/icon/menu-mundo.json` legend `L` | no - survived. C28 `menu surface tones mundo terra` passed, because it counts 3 names (`leaf.3`, `leaf.2`, `grass.3`) and not colours. C26, C29 and all 24 `mundo`/tone proofs stayed green. The palette has 4 such pairs (`ink.1`=`soil.0`, `ink.2`=`hoodie.0`, `leaf.3`=`grass.3`, `soil.3`=`wood.1`), and `grass` is the ramp the style guide names for ground |

## Gate

- `cd web && npx vitest run`: 391 passed, 0 failed (18 files).
- `npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts`: 86 passed, 0 failed.
- `make art-check`: exit 0.
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py game-menu`: exit 1, as
  expected for a FAIL.

Ranked gaps:

1. **C28 counts tones by palette name, so a 2-colour surface passes (F5 survived).** The claim says
   "pelo menos 3 cores distintas da paleta" (at least 3 distinct palette colours). The assertion is
   `new Set(... .map((c) => legend[c])).size >= 3` (`web/src/lib/art.test.tsx:259-260`). Swapping
   `mundo`'s `L` from `leaf.1` to `grass.3` (= `leaf.3` hex) renders the land in 2 colours, and
   every proof stays green. The fix is to resolve each legend name to its `palette.json` hex before
   building the set. The art at HEAD is correct: I counted the hex tones of all 18 surfaces myself.
2. **The checks' S6 sentence overclaims again, on "centred".** `checks.md:102` was rewritten in
   this fix and says silhouette readability is the only style rule left to preview judgement.
   "One object, centred" (style guide `icon`) has no check, and C19 would pass an object drawn at
   x1-12. All 9 icons are centred within 0.5 px today. The fix is a centring assertion in C19, or
   a sentence that names centring as judged.
