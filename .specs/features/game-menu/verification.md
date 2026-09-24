# Game menu verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 80fd17e..061b607
**Round**: 5 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 5 is scoped by the fix diff `991e585..061b607` and by the round 4 verdicts that were not
PASS. The fix diff is:

- `139aaba`: `web/src/lib/art.test.tsx`. C28 now resolves each legend name to its hex through
  `palette.json` before counting (`:261-265`, `:273`). A new C31 centring test sits at `:157-161`.
- `139aaba`: `checks.md` gains S9/C31 and a rewritten S6 sentence (`:102`).
- `061b607`: docs only.

`git diff --stat 2b44c49..HEAD -- web/src/components web/src/app web/e2e web/art web/public Makefile .claude/skills/pixel-assets`
is empty, so no art, CSS, component, e2e or renderer file changed.

I re-ran every proof at `061b607`: 156 unit tests, `art ok`, and 86 e2e, all green. Each named test
appears individually below.

Two of the three round 4 gaps are closed:

- **F5 is now killed.** I re-injected it: `mundo` `L` -> `grass.3`, which is the same hex as
  `leaf.3`. C28 `menu surface tones mundo terra` failed with `expected 2 to be greater than or equal to 3`.
- **"Centred" now has a check (C31), and it is proven to fail.** I shifted `server` 2px right, and
  only `menu-server > menu icon centred` failed (`expected 2 to be less than or equal to 1`).
- **A second alias pair is also killed.** I injected `ink.2`=`hoodie.0` on the `avatar` hoodie:
  `k` `hoodie.1` -> `ink.2`, which leaves the hoodie in 2 colours. Only C28 `avatar moletom` failed.

**The third gap is still open, so the round is a FAIL.** Round 4 flagged the S6 sentence
(`checks.md:102`) for claiming more than the checks prove. The rewrite now reads "Left to preview
judgement: silhouette readability and whether each object reads as the scene it names". The brief
asked me to set every style guide rule in the general and icon sections against its check. Doing
that finds five rules that no check proves and the sentence does not name as judged:

1. "No gradients except the dithered sky" (`style-guide.md:17-18`).
2. The positive half of "inner detail lines use the darkest tone of the material's own ramp"
   (`:13-14`). C27 proves only "never ink".
3. "One object" (`:48`). C31 cites "one object, centred" but asserts only the centre.
4. "coin = `gold` ramp" (`:49`). C30 pins only the coin's top tone.
5. The "bright and saturated ... friendly" colour mood (`:8-9`).

This is the same kind of gap as round 4's "centred": an enumerated exemption that leaves rules out.
**The art itself complies with all five.** I measured and previewed it:

- Each of the 9 specs is one 8-connected component.
- The `loja` coin is `gold.0/1/2/4`.
- The preview shows no gradient and no detail line off-ramp, and the colours are bright.

So the fix is text in `checks.md`, optionally with two cheap checks: one opaque component per icon,
and every coin char a `gold.*` name.

## Binding sources

Carried from `2b44c49`. The fix touched no art, spec, renderer or interface file (the empty `--stat`
above), and step 1 is `ui`-only anyway. Re-confirmed at `061b607`:

- **Renders:** `render.py web/art/icon/menu-*.json --out <scratch> --preview <scratch>/p.png` gives
  9 `ok`, and all 9 are byte-identical to the committed PNGs under `cmp`. I read the preview.
- **Measurements:** 0 semi-transparent pixels in all 9. The bbox centre is off by at most 0.5px
  per axis (`avatar` y 0.5, `skills` x/y 0.5, the others 0).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` (plan `Sources`: binding for icon style), read through plan `Assumptions` "Material" (`plan.md:52`, confirmed `y`) | yes, the style guide re-read in full at `061b607` (general + icon + display sections). Key art carried from `2b44c49` | none. C28 at `art.test.tsx:273-274` now counts colours, as its claim says. The "3-4" upper bound holds structurally: every `SURFACES` entry (`:239-249`) has at most 4 chars, and C29 (`:282`) forces every grid char into exactly one entry | - (the rule-by-rule gaps are recorded under Coverage, where the fix's S6 text claims them) |

Plan `Sources` "Hotbar RPG": carried from `715aa72`, because the interface is untouched.

## Checks

Verified at `061b607`. I re-ran every proof myself.

- **Unit:** `cd web && npx vitest run src/components/Tabs.test.tsx src/components/GameArt.test.tsx src/lib/art.test.tsx --reporter=verbose`: 156 passed, exit 0. That is round 4's 147 plus the 9 C31 cases. The ✓ counts per name are: `menu icons per scene` 1, `GameArt > menu address` 1, `slot icons` 1, `slot icon fallback` 1, `shortcut navigates` 9, `shortcut ignores modifiers` 3, `shortcut ignores editable` 4, `shortcut ignores other keys` 2, `shortcut closes menu` 1, `menu button icon` 10, the 8 foundation/responsive names 1 each, `menu label` 10, `menu icon margin and fill` 9, `menu icon centred` 9, `menu icon outline in ink` 9, `menu icon light from the top-left` 9, `shortcut ignores prevented` 1, `menu button icon per scene` 9, `menu office specular` 1, `menu material tones` 1, `menu inner ink` 9, `menu surface tones` 18, `menu surface table covers` 9, `menu glossy specular` 3.
- **Art:** `make art-check` exited 0 with `art ok`, and all 9 `icon/menu-*.png` lines are `ok`.
- **E2E:** `cd web && npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts --reporter=list`: 86 passed. That is 8 in `game-menu` (C6, C7, C8, C14, C16 360, C16 390, C24 1280, C24 390) and 78 in `responsive`. It ran against the running `:8180`/`:3100` e2e stack, and no server was started or stopped.

Citations:

- `art.test.tsx` is refreshed at `061b607`. The C31 insertion shifts everything after `:153` by +8,
  and the `PALETTE`/`toHex` insertion shifts everything after `:260` by a further +6.
- Every other file is untouched by `2b44c49..HEAD`, so its citations are carried from where round 4
  carried them.

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
| C17 | responsive browser proofs green, asserts unchanged | playwright `responsive.spec.ts` 78 passed (78 lines in the list output) | `web/e2e/responsive.spec.ts:58` (`C7 menu on phone`) and the rest; `git diff --stat 80fd17e..HEAD -- web/e2e/responsive.spec.ts` empty (carried from `e8467f4`) | PASS |
| C18 | foundation/responsive `Tabs.test.tsx` proofs green, asserts unchanged | vitest `tab order and routes`, `marks only the current route's tab as current`, `menu starts closed`, `menu opens`, `link closes menu`, `button closes menu`, `escape closes menu`, `other keys keep menu open`, `menu label` x10 ✓ | `web/src/components/Tabs.test.tsx:16-121` (e.g. `:121` `toHaveTextContent(new RegExp(\`^${label}$\`))`); file unchanged since `715aa72` (carried from `715aa72`) | PASS |
| C19 | 1px transparent margin, largest side 12-14 (9 icons) | vitest `menu-<id> > menu icon margin and fill` x9 ✓ | `web/src/lib/art.test.tsx:148` - `expect(points.filter(([x, y]) => x === 0 \|\| y === 0 \|\| x === width - 1 \|\| y === height - 1)).toEqual([])`; `:152-153` `side` `toBeGreaterThanOrEqual(12)`, `toBeLessThanOrEqual(14)` | PASS |
| C20 | every opaque pixel with a transparent 4-neighbour is `ink.0` (9 icons) | vitest `menu-<id> > menu icon outline in ink` x9 ✓ | `web/src/lib/art.test.tsx:166` - `expect(edge.filter(([x, y]) => !isInk(x, y))).toEqual([])`, `isInk` = `"6,6,18"` `:145` | PASS |
| C21 | mean Rec.709 luminance of non-ink `x+y<15` > `x+y>15` (9 icons) | vitest `menu-<id> > menu icon light from the top-left` x9 ✓ | `web/src/lib/art.test.tsx:176` - `expect(mean(lit.filter(([x, y]) => x + y < 15))).toBeGreaterThan(mean(lit.filter(([x, y]) => x + y > 15)))` | PASS |
| C22 | `3` already `preventDefault`ed on `body` does not push | vitest `Tabs hotbar > shortcut ignores prevented` ✓ | `web/src/components/Tabs.test.tsx:215-216` - `cancel = (e) => e.preventDefault()` on `document.body`; `:219` `expect(nav.push).not.toHaveBeenCalled()` (carried from `715aa72`) | PASS |
| C23 | per scene, MENU's first child is the icon, then `MENU · <label>` (9) | vitest `menu button icon per scene 01 TÍTULO` ... `09 OFFICE` (9 ✓) | `web/src/components/Tabs.test.tsx:250-253` - `first?.tagName).toBe("IMG")`, `src` `toBe(\`/art/icon/menu-${icon}.png\`)`, `alt` `toBe("")`, `first?.nextSibling?.textContent).toBe(\`MENU · ${label}\`)` (carried from `715aa72`) | PASS |
| C24 | 1280 and 390: num above-left of the icon and inside the slot, label below, glow only on the active slot | playwright `arrangement desktop › C24 arrangement 1280` ✓, `arrangement phone › C24 arrangement 390` ✓ | `web/e2e/game-menu.spec.ts:119-120` `num.x + num.w` `toBeLessThanOrEqual(s.icon.x)`, `num.y` `toBeLessThan(s.icon.y)`; `:121-124` inside the slot; `:125` `label.y` `toBeGreaterThanOrEqual(s.icon.y + s.icon.h)`; `:126-127` `shadow` `toContain` / `.not.toContain("rgb(255, 224, 138)")`; `:117` `toHaveLength(9)` (carried from `80564f6`) | PASS |
| C25 | `menu-office` has exactly one `code.4` at (4,3); rest of screen x4-11 y3-6 is `code.0`/`code.3` | vitest `menu office specular on the screen` ✓ | `web/src/lib/art.test.tsx:188` - `expect(hex(px, 4, 3)).toBe("#b6f070")`; `:189` `toHaveLength(1)`; `:190` `screen.filter((c) => !["#b6f070", "#1f5a08", "#6bd425"].includes(c))).toEqual([])` | PASS |
| C26 | `office` bezel exactly `stone.3/2/1`; `mundo` paper exactly `cloud.3`, `cloud.2`, `dirt.3` | vitest `menu material tones: office bezel and mundo paper` ✓ | `web/src/lib/art.test.tsx:198` - `expect([...bezel].sort()).toEqual(["#121e2a", "#2a3642", "#46586a"])`; `:209` - `expect([...paper].sort()).toEqual(["#deb060", "#f6ead2", "#fbf6ea"])`, scenery exclusion `:202` (land tones only, as round 4 established) | PASS |
| C27 | enclosed `ink.0` (8-connected, off-canvas transparent) is exactly the listed set per icon | vitest `menu inner ink avatar` ... `loja` (9 ✓) | `web/src/lib/art.test.tsx:233` - `expect(inner).toEqual(expected)`, table `:213-221`, `opaque` `:224`, 8 neighbours `:230` | PASS |
| C28 | each surface of 12 px or more in the table uses at least 3 distinct palette **colours** (18 surfaces) | vitest `menu surface tones avatar rosto` ... `titulo paredes` (18 ✓) | `web/src/lib/art.test.tsx:272` - `expect(size(chars, counts)).toBeGreaterThanOrEqual(12)`; `:273-274` - `const tones = new Set([...chars].filter((c) => counts[c]).map((c) => toHex(legend[c]))); expect(tones.size).toBeGreaterThanOrEqual(3)`; `toHex` `:262-265` resolves `ramp.index` through `palette.json` (`:261`); table `:239-249`; single-layer guard `:255` `expect(s.layers).toHaveLength(1)`. F5 and F6 (aliases) now killed | PASS |
| C29 | every grid char other than `o`/`.` belongs to exactly one surface or small part; each small part < 12 px | vitest `menu surface table covers avatar` ... `titulo` (9 ✓) | `web/src/lib/art.test.tsx:282` - `expect([...owners].filter((c) => c === ch), \`${id} '${ch}'\`).toHaveLength(1)`; `:283` - `expect(size(chars, counts), \`${id} ${name}\`).toBeLessThan(12)` | PASS |
| C30 | each glossy surface (`loja` moeda, `office` tela, `deploy` vidro) has exactly one pixel in its ramp's top tone (`gold.4`, `code.4`, `net.4`) | vitest `menu glossy specular deploy vidro` / `loja moeda` / `office tela` (3 ✓) | `web/src/lib/art.test.tsx:292` - `expect([...chars].filter((c) => legend[c] === top).reduce((a, c) => a + (counts[c] ?? 0), 0)).toBe(1)`; tops at `:242,:243,:245`. Still compares names, but none of `gold.4`, `code.4`, `net.4` has an alias in `palette.json` (the 4 aliases are `ink.1`=`soil.0`, `ink.2`=`hoodie.0`, `leaf.3`=`grass.3`, `soil.3`=`wood.1`) | PASS |
| C31 | in each of the 9 PNGs the opaque bbox centre is at most 1px from (7.5, 7.5) in x and in y | vitest `menu-<id> > menu icon centred` x9 ✓ | `web/src/lib/art.test.tsx:160` - `expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (width - 1) / 2)).toBeLessThanOrEqual(1)`; `:161` the same on `ys`. Measured at HEAD: max offset 0.5 (`avatar` y, `skills` x/y). F7 killed | PASS |

## Coverage

I recomputed the "icon style rules" row at `061b607`, because the fix touched both its checks
(C28, C31) and its prose (`checks.md:102`). Its authority is the style guide, not the code. I
re-checked the surface row's C28 proof, which now works by colour. The glossy row and every other
row are carried from `2b44c49`, or from wherever round 4 carried them. Their authority (the specs,
the ruling, `TABS`, `Tabs.tsx`, `GameArt.tsx`, `globals.css`, the plan ACs) is absent from
`2b44c49..HEAD`.

Style guide rule by rule. The rows cover the general section ("What the key art looks like",
`style-guide.md:8-22`) and the icon section (`:45-52`). The display rules (`:78-85`) are carried.

| Rule (line) | Check | Named by `checks.md:102` |
| --- | --- | --- |
| 1px ink outline on every shape (`:13`) | C20, and the weight through C27 | yes |
| inner detail never ink (`:13-14`) | C27 | yes |
| inner detail in the darkest tone of the material's own ramp (`:13-14`) | none. C27 proves only "not ink". Measured: `bug-fight` `red.0` seams, `titulo` `wood.0` trim, `server` `stone.0` drawer lines | **no** |
| light from top-left (`:15`) | C21 (mean-luminance proxy, accepted in earlier rounds) | implied ("mechanised") |
| glossy single top-tone specular (`:16`) | C25, C30 | yes |
| 3-4 tones per material, straight from a ramp (`:17`) | lower bound C28 (hex). Upper bound held structurally: every entry has ≤4 chars and C29 forces every char into one entry. "From a ramp" through the C2 palette lock | yes |
| no gradients except the dithered sky (`:17-18`) | none. The single-layer guard `:255` rules out a `bands` layer, but a hand-drawn ramp across a surface is not checked. Preview: none | **no** |
| no anti-aliasing, no semi-transparent pixels (`:18`) | C2 (`render.py` errors on partial alpha, and `make art-check` fails on an error) + C20 at the edge. Measured 0 in 9/9 | n/a (mechanised) |
| bright, saturated, friendly (`:8-9`) | C2 palette lock only | **no**. Preview: bright |
| theme motifs (`:10-12`) | - | yes ("reads as the scene it names") |
| depth by atmosphere (`:19-20`) | n/a. Icons are one near layer | n/a |
| 16x16 or 24x24 (`:47`) | C1 | n/a (mechanised) |
| shown at 2x-3x (`:47`) | C3 (`32` = 2x), C6 (`naturalWidth` 16) | n/a (mechanised) |
| one object (`:48`) | none. C31's attribution quotes "one object, centred" but asserts the centre only. Measured: 1 eight-connected component in 9/9 specs | **no** |
| centred (`:48`) | C31 | yes |
| ~80% fill (`:48`) | C19 | yes |
| full outline (`:48`) | C20 | yes |
| coin = `gold` ramp (`:49`) | partial: C30 requires the coin's one top pixel to be `gold.4`, and its other 3 chars are unasserted. Measured: `g y l M` = `gold.0/2/4/1` | **no** |
| set shares light, outline weight, fill (`:51-52`) | C21, C20+C27, C19 | yes |
| one `--preview` for the set (`:52`) | process, not an output property | n/a |

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| icon style rules, binding (17 applicable, from the table above) | style guide general + icon sections (authority outside the code), read at `061b607`; members measured on the 9 specs and PNGs | outline C20 · no inner ink C27 · light C21 · specular C25, C30 · 3-4 tones C28 (hex) + C29 · no semi-transparency / AA C2, C20 · 16x16 C1 · 2x C3, C6 · centred C31 · fill C19 · full outline C20 · set consistency C19-C21, C27 · theme: judged, named · silhouette: judged, named | `checks.md:102` still does not enumerate what is left to judgement. Five rules have no check and are not named: no gradients (`:17-18`); detail lines in the material's own darkest tone (`:13-14`); one object (`:48`, cited by C31, not asserted); coin = `gold` ramp beyond the top tone (`:49`); bright/saturated/friendly colour (`:8-9`). The art complies with all five by measurement and preview. This is a checks/text gap, not an art defect |
| surfaces of 12 px or more (18) | the 9 specs' legend chars; carried from `2b44c49` (specs untouched), with C28 re-checked by colour | all 18 C28 (hex), completeness C29. Two alias mutants are now killed (F5, F6) | - |
| glossy surfaces per the ruling (3) | carried from `2b44c49` | `loja` moeda C30 · `office` tela C25, C30 · `deploy` vidro C30 | - |
| slot arrangement (5) | carried from `80564f6` | number top-left and inside C24 · square icon frame C6 · label below C24 · active glow C24 · active yellow border C7 | - |
| shortcut guards (10) | `Tabs.tsx:33-35` + door 3 (carried from `715aa72`) | `defaultPrevented` C22 · Ctrl, Meta, Alt C10 · `input`, `textarea`, `select`, `[contenteditable]` C11 · `0`, `a` C12 | - |
| MENU button icon by route (9 scenes + outside) | plan AC 13, `TABS` (carried from `715aa72`) | 9 scenes C23 · outside `TABS` C15 | - |
| menu icons on disk (9) | plan AC 1 (carried from `e8467f4`) | all 9 C1, C2 | - |
| slots with icon (9) | `TABS` (carried from `e8467f4`) | all 9 C4 | - |
| slot states (4) | plan AC 4, 6, 7 (carried from `e8467f4`) | active C7 · inactive x8 C7 · focused C8 · icon failed C5 | - |
| shortcut keys (9) | door 3 / AC 8 (carried from `e8467f4`) | `1`-`9` C9; `4`, `1` also C14 | - |
| shortcut side effects (2) | `Tabs.tsx:37-38` (carried from `e8467f4`) | navigate C9, C14 · close menu C13 | - |
| phone widths with open menu (2) | plan AC 14 (carried from `e8467f4`) | 360 C16 · 390 C16, C24 | - |
| Landing doors (3) | plan Landing (carried from `715aa72`) | door 1 C1, C4 · door 2 C3 · door 3 C9-C14, C22 | - |

Note on C31's reach (not a gap). On each icon's larger axis, C19 already bounds the offset to 1px:
with a 1px margin and a side of at least 12, there is no room for more. So C31 adds power only on
an axis narrower than 12px. At HEAD that is `server` x (10px), which is where F7 was placed.

## Test policy rows

The first three rows are carried from `80564f6`, because their files are untouched by
`2b44c49..HEAD`. The instrumentation row is verified at `061b607`, because its consumer
`art.test.tsx` changed.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` keydown handler (door 3) | boundary C14 · own layer C9-C13, C22 | yes (carried from `80564f6`; re-ran green at `061b607`) |
| Decides, not reached across a boundary | `Tabs.tsx` slot + MENU rendering; `GameArt.tsx` `menu` address | own layer C4, C5, C15, C23, C3 | yes (carried from `80564f6`; re-ran green) |
| Decides at the boundary only (CSS the browser evaluates; `checks.md` Test policy) | `web/src/app/globals.css` hotbar + 3x3 rules | boundary C6, C7, C8, C16, C24 | yes (carried from `80564f6`; the 86 e2e re-ran green at `061b607`) |
| Instrumentation, pass-throughs | 9 `web/art/icon/menu-*.json` + PNGs (data, untouched in this fix) | none of their own; consumers C1, C2, C19-C31 | yes. Every consumer re-ran green at `061b607`, and F5-F7 were killed through C28 and C31. Full `npx vitest run`: 400 passed |

## Faults injected

Verified at `061b607`.

Setup and restore:

- I worked in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` copied in
  (`cp -Rc`).
- For each fault, I edited the worktree spec, re-rendered it with
  `python3 .claude/skills/pixel-assets/scripts/render.py web/art/icon/menu-<id>.json --out web/public/art`
  in the worktree (`ok` each time), and ran `npx vitest run src/lib/art.test.tsx` from the
  worktree. Then I ran `git checkout -- web/art web/public/art`, and the worktree porcelain was
  empty.
- These are art-only faults, so no server was touched.
- Cleanup: I ran `git worktree remove --force`. The real tree's `git status --porcelain` was
  identical before and after (14 pre-existing untracked lines, compared with `diff`).

Scope: the surfaces this fix touched. That is C28's new hex resolution (the round 4 survivor, plus
one more alias pair) and C31's new assertion. F1-F4 are carried from `2b44c49`, and round 3's
faults are carried from `80564f6`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F5 (re-injected) `mundo` land `L` `leaf.1` -> `grass.3` (= `leaf.3` hex `#78c828`): land in 2 colours | `web/art/icon/menu-mundo.json` legend `L` | yes - C28 `menu surface tones mundo terra` (`expected 2 to be greater than or equal to 3`), 1 failed / 88 skipped |
| F6 second alias pair `ink.2` = `hoodie.0` (`#1e1e2a`): `avatar` hoodie `k` `hoodie.1` -> `ink.2`, so `k` and `n` render the same colour | `web/art/icon/menu-avatar.json` legend `k` | yes - only C28 `menu surface tones avatar moletom` failed (`expected 2 to be greater than or equal to 3`), 1 failed / 88 passed. C20 and C27 stay green as they should (`ink.2` is not `ink.0`) |
| F7 `server` drawn 2px right (every grid row `".." + row[:-2]`): bbox x 5-14, centre 9.5, margin intact, side 14 | `web/art/icon/menu-server.json` grid | yes - only `menu-server > menu icon centred` (C31) failed (`expected 2 to be less than or equal to 1`), 1 failed / 88 passed. C19 and C21 stayed green, so C31 is the only proof carrying centring |

I considered the other two alias pairs. `soil.3`=`wood.1` could hit `office` mesa (`d` is `wood.1`).
`ink.1`=`soil.0` has no user among the 9 specs. Both go through the same `toHex` line that F5 and
F6 have already made fail, so a third alias run would add no information.

## Gate

- `cd web && npx vitest run`: 400 passed, 0 failed (18 files).
- The unit batch (3 files): 156 passed.
- `npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts`: 86 passed, 0 failed.
- `make art-check`: exit 0.
- `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py game-menu`: exit 1, as
  expected for a FAIL.

Ranked gaps:

1. **The S6 sentence (`checks.md:102`) still does not enumerate every style rule left to
   judgement.** Five binding rules have no check and are not named:
   - "no gradients" (`style-guide.md:17-18`)
   - "inner detail lines use the darkest tone of the material's own ramp" (`:13-14`; C27 proves
     only "never ink")
   - "one object" (`:48`; C31 cites it but asserts only centring)
   - "coin = `gold` ramp" (`:49`; C30 pins only the top pixel)
   - "bright and saturated ... friendly" (`:8-9`)

   The art complies with all five: 1 component per icon, the coin all `gold.*`, and no gradients,
   off-ramp detail lines or dull colours in the preview. The fix is text: name these five in the
   sentence. Optionally, mechanise the two cheap ones as well: one 8-connected opaque component per
   icon, and every `loja` moeda char a `gold.*` name.

   This is lesson L-033 recurring (`.specs/lessons.json`). The rewrite added the item round 4
   named, instead of walking the style guide rule by rule.
