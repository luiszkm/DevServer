# Game menu verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 80fd17e..715aa72
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

All 24 proofs ran green at `715aa72`, each named test is listed individually below, and all 5
faults injected on the new assertion surfaces were killed. Every round 1 gap in the checks is
closed: `e.defaultPrevented` has C22, the MENU icon is proven on 9/9 scenes and before the text
(C23), the arrangement has C24, and the user ruled on squareness. Every round 1 per-icon deviation
is closed too.

The feature still fails on the binding style source, which S6 hands to the Verifier's judgement.
The `office` screen has no specular pixel. The style guide says glossy things, screen included,
"get a single white or top-tone specular pixel". The catalog's own screens follow that rule:
`gear-monitor` and `gear-macbook` each have one `net.4` pixel at the screen's top-left. S6 names
the `office` screen as a glossy case to judge. Judged, it has none: the only light pixels on the
screen are the 5-pixel `>_` glyph in `code.3`. A second item needs a ruling, not just a fix:
"3-4 tones per material" is not met for the `mundo` paper (2 tones) or the `office` bezel
(2 tones).

## Binding sources

Verified at `715aa72` (the fix redrew 7 of the 9 icon specs and added the arrangement proof).

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` (plan `Sources`: binding for icon style) | yes. I re-read the key art and the full style guide. I rendered the 9 specs with `render.py web/art/icon/menu-*.json --out <scratch> --preview <scratch>/p.png` (9 `ok`) and read the preview. I also read a 12x contact sheet of the committed PNGs and measured every pixel with a named-palette map (bbox, edge ink under 4- and 8-connectivity, TL/BR luminance, tones per ramp, semi-transparent and off-palette pixels) | none. C19-C21 match the guide's icon rules (outline in `ink`, light from the top-left, fill ~80%) | **(a) specular on the `office` screen is missing.** Style guide: "Glossy things (slime, gem, coin, screen) get a single `white` or top-tone specular pixel". S6 enumerates "`office` screen" under that rule. The screen (`web/art/icon/menu-office.json` rows 3-6, x4-11) is `code.0` plus the `>_` glyph in `code.3` at (5,4), (6,5), (8,5), (9,5), (5,6), with no specular. Catalog precedent: `gear-monitor` `L`=`net.4` at (4,4), and `gear-macbook` `w`=`net.4` at (4,3). The other glossy cases pass: `deploy` window has one `net.3` pixel at (7,5) on `net.1`, `loja` coin has one `gold.4` at (7,10), `skills` has one `gold.4` at (7,2). **(b) "3-4 tones per material" (S6, judged) is under the range on two surfaces, and this needs a ruling.** The `mundo` paper is `cloud.3` + `cloud.2` (62 px, no shade tone), and the `office` monitor bezel is `stone.3` + `stone.1` (28 px, highlight and shade, no base). The tone count per material in the other icons: `titulo` red 3 / wood 4, `server` stone 3, `deploy` metal+white 3 / fins red 3, `bug-fight` red 4, `skills` gold 4, `loja` sack dirt 3 / coin gold 4, `avatar` skin 3 / hoodie 3, `office` desk wood 3. No material exceeds 4, and every tone comes from a ramp (0 off-palette, 0 semi-transparent). If 2-tone flat surfaces are acceptable at 16x16, the checks should say so by name, the way S6 already does for ink |
| plan `Sources`: user's "Hotbar RPG" choice (square slots, icon x2 in a frame, number in the corner, label below, active slot yellow frame + glow; 3x3 command window on mobile; keys 1-9) | yes. I compared plan.md line 5 and the new `Assumptions` row ("Slot quadrado" = the 44x44 `.tab-icon` frame, `Confirmed? y`) with C6, C7, C16 and the new C24 | none | - . Number top-left: C24. Label below the icon: C24. Active glow `#ffe08a`: C24. Square frame: C6 `[44, 44]`, which the user ruled is the square. Active yellow border: C7. 3x3: C16. Keys: C9-C14 |

Per-icon re-measurement of the round 1 deviations (all closed):

| Icon | Round 1 deviation | At `715aa72` | Closed |
| --- | --- | --- | --- |
| office | bezel flat `stone.3`, stand lit from the right, TL/BR 81/81 | bezel `stone.3` top/left, `stone.1` bottom/right. Stand `metal.3` (7,9) left, `metal.2` (8,9) right. TL/BR 83.3/69.7 | yes |
| titulo | non-ink edge at (7,1), (8,1), (1,7); width 16/16 | 0 non-ink edge pixels; bbox x1-14 y1-14 (14) | yes |
| bug-fight | ink seam at cols 7-8 and ink spots; touched x0, x15, y0 | seam and spots in `red.0`, head `ink.2`; bbox x1-14 y1-14 | yes |
| skills | 16/16 wide, left arm to x0 but right arm only to x14 | bbox x1-13 y1-13 (13x13), arms symmetric about x7 | yes |
| deploy, server | 15/16 tall | bbox y1-14 (14), 1px margin | yes |
| avatar, loja, mundo | none | margins, 0 non-ink edge, TL > BR (122.3/111.4, 143.6/126.5, 200.8/192.8) | - |

Exemption paragraph (S6, object-boundary ink), judged against the preview. Under 8-connectivity,
the `ink.0` pixels that do not touch transparency are these. `deploy`: (5,9)-(5,11) and
(10,9)-(10,11), the fin/body seams, which are genuine. `avatar`: (5,6) and (10,6), the eyes,
which are genuine. `office`: (7,8), (8,8) where the monitor bottom meets the stand, genuine, and
(7,10), (8,10) where the stand meets the desk top. That last one is also an object boundary, but
the paragraph does not name it. Every other icon has no interior ink under 8-connectivity. Under
C20's 4-connectivity, a few more `ink.0` pixels count as interior: `server` (4,13) and (11,13),
`skills` (5,5) and (9,5), `bug-fight` (2,10) and (13,10), `avatar` (3,10) and (12,10), `office`
(2,13) and (13,13), and `deploy` (6,12) and (9,12). All of them sit at concave corners of the
silhouette, where a leg, foot, arm or nozzle meets the outline, so they are outline and not inner
detail. The rule "inner detail uses the ramp's darkest tone, never ink" holds for all 9 icons.
**Precision gap (checks):** the paragraph's `bug-fight` "head over the shell" case is stale. At
HEAD there is no `ink.0` between the `ink.2` head and the shell. The stand/desk boundary in
`office` is not listed, and "off the outline" is undefined. With 8-connectivity the set above is
the full, mechanisable allowlist.

## Checks

Verified at `715aa72`. All proofs were re-run by the verifier at HEAD. Unit tests ran in one
invocation, `cd web && npx vitest run src/components/Tabs.test.tsx src/components/GameArt.test.tsx src/lib/art.test.tsx --reporter=verbose`,
with 106 passed. `make art-check` exited 0 with `art ok` and 9 `ok .../icon/menu-*.png` lines.
E2E ran as `cd web && npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts --reporter=list`
against the `:3100` production build of the real `web/` (clean at HEAD), with 86 passed: 8
game-menu and 78 responsive. I refreshed the citations for the touched files (`art.test.tsx`,
`Tabs.test.tsx`, `game-menu.spec.ts`). The citations for untouched files (`GameArt.test.tsx`,
`responsive.spec.ts`, `Makefile`) are carried from `e8467f4`, and their tests re-ran green here.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 menu specs + PNGs, 16x16 | vitest `catalog art on disk > menu icons per scene, 16x16` ✓ | `web/src/lib/art.test.tsx:136` - `expectAssets(icons(MENU_ICONS.map((id) => \`menu-${id}\`)))`, list at `:27`, size `[16, 16]` at `:77`, asserted at `:55-57` `existsSync(spec)`, `existsSync(png)`, `pngSize(png)).toEqual(size)` | PASS |
| C2 | `make art-check` exits 0 with the 9 specs | `make art-check` exit 0, `art ok`, 9 `menu-*` lines `ok` | `Makefile:32-33` - `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art` (carried from `e8467f4`) | PASS |
| C3 | `GameArt kind="menu"` address/size/class | vitest `GameArt > menu address` ✓ | `web/src/components/GameArt.test.tsx:41-44` - `src` `toBe("/art/icon/menu-loja.png")`, `width`/`height` `toBe("32")`, `className` `toContain("pixelated")` (carried from `e8467f4`) | PASS |
| C4 | 9 slots in order with icon, num, label | vitest `Tabs hotbar > slot icons` ✓ | `web/src/components/Tabs.test.tsx:156` - `expect(got).toEqual(SLOTS.map(... \`/art/icon/menu-${icon}.png\`, "", "32", true]))`, SLOTS at `:126` | PASS |
| C5 | LOJA icon error keeps `07` + `LOJA` | vitest `slot icon fallback` ✓ | `web/src/components/Tabs.test.tsx:163-165` - `querySelector("img")).toBeNull()`, `.tab-num` `toHaveTextContent("07")`, `toHaveTextContent("LOJA")` | PASS |
| C6 | 1280 one row, widths ±1, `.tab-icon` 44x44 loaded, page 1200 / scene 760 | playwright `desktop › C6 hotbar row` ✓ | `web/e2e/game-menu.spec.ts:20` `toEqual([44, 44])`; `:21` `naturalWidth` `toBe(16)`; `:23` y-set `toBe(1)`; `:25` spread `toBeLessThanOrEqual(1)`; `:26` `toBe(1200)`; `:27` `toBe(760)` (lines unchanged, the fix only appended after `:95`) | PASS |
| C7 | SERVER frame yellow, other 8 not | playwright `desktop › C7 active slot` ✓ | `web/e2e/game-menu.spec.ts:38-41` - `toBe(YELLOW)` / `.not.toBe(YELLOW)`, `toHaveLength(9)` | PASS |
| C8 | Tab focus outline solid 3px yellow | playwright `desktop › C8 focus outline` ✓ | `web/e2e/game-menu.spec.ts:49,54` - `toBeFocused()`; `toEqual({ style: "solid", width: "3px", color: YELLOW })` | PASS |
| C9 | keys 1-9 push slot N href once | vitest `shortcut navigates 1 -> /` ... `9 -> /office` (9 ✓) | `web/src/components/Tabs.test.tsx:171-172` - `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(href)` | PASS |
| C10 | Ctrl/Meta/Alt+3 do not push | vitest `shortcut ignores modifiers {Control>}3{/Control}` / `{Meta>}` / `{Alt>}` ✓ | `web/src/components/Tabs.test.tsx:178` - `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C11 | `3` in input/textarea/select/contenteditable does not push | vitest `shortcut ignores editable input` / `textarea` / `select` / `contenteditable` ✓ | `web/src/components/Tabs.test.tsx:200,202` - `expect(el).toHaveFocus()`; `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C12 | `0`, `a` do not push | vitest `shortcut ignores other keys 0` / `a` ✓ | `web/src/components/Tabs.test.tsx:209` - `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C13 | open menu + `4`: push `/deploy`, `aria-expanded="false"` | vitest `shortcut closes menu` ✓ | `web/src/components/Tabs.test.tsx:225,227-228` - `"true"` precondition; `toHaveBeenCalledWith("/deploy")`; `toHaveAttribute("aria-expanded", "false")` | PASS |
| C14 | browser `4` -> /deploy, `1` -> / | playwright `desktop › C14 shortcuts` ✓ | `web/e2e/game-menu.spec.ts:60-64` - `toHaveURL(/\/deploy$/)`, `PIPELINES DE DEPLOY` visible, `toHaveURL(/\/$/)`, `CLIQUE NAS PLACAS PARA NAVEGAR` visible | PASS |
| C15 | `/loja` MENU icon + `MENU · LOJA`; `/login` no img + `MENU` | vitest `menu button icon` ✓ | `web/src/components/Tabs.test.tsx:235-237` - `src` `toBe("/art/icon/menu-loja.png")`, `alt` `toBe("")`, `/^MENU · LOJA$/`; `:241-242` `img` `toBeNull()`, `/^MENU$/` | PASS |
| C16 | 360/390 open menu: 9 visible with img, 3x3, no h-scroll | playwright `phone 360 › C16 command window 360` ✓, `phone 390 › C16 command window 390` ✓ | `web/e2e/game-menu.spec.ts:83-84,89-90,92` - `toBeVisible()` x2; `xs.size).toBe(3)`, `ys.size).toBe(3)`; `scrollWidth).toBeLessThanOrEqual(innerWidth)` | PASS |
| C17 | responsive browser proofs green, asserts unchanged | playwright `responsive.spec.ts` 78 passed (`C7 menu on phone`, C8 x18, C9 x9, C10 x10, C11 x9, C12-C14, C15 x4, C16 x9, C17, C22 x2, C23 x3, C24 x6, C25, C26 x2) | `web/e2e/responsive.spec.ts:58` (`C7 menu on phone`) and the rest; `git diff --stat 80fd17e..HEAD -- e2e/responsive.spec.ts` is empty | PASS |
| C18 | foundation/responsive `Tabs.test.tsx` proofs green, asserts unchanged | vitest `tab order and routes`, `marks only the current route's tab as current`, `menu starts closed`, `menu opens`, `link closes menu`, `button closes menu`, `escape closes menu`, `other keys keep menu open`, `menu label` x10 ✓ | `web/src/components/Tabs.test.tsx:16-121` (e.g. `:121` `toHaveTextContent(new RegExp(\`^${label}$\`))`). The fix diff `6415a00..HEAD` only inserts after `:209` and appends after `:242` | PASS |
| C19 | 1px transparent margin, largest side 12-14 (9 icons) | vitest `menu-<id> > menu icon margin and fill` x9 ✓ | `web/src/lib/art.test.tsx:148` - `expect(points.filter(([x, y]) => x === 0 \|\| y === 0 \|\| x === width - 1 \|\| y === height - 1)).toEqual([])`; `:152-153` `side` `toBeGreaterThanOrEqual(12)`, `toBeLessThanOrEqual(14)` | PASS |
| C20 | every opaque pixel with a transparent 4-neighbour is `ink.0` (9 icons) | vitest `menu-<id> > menu icon outline in ink` x9 ✓ | `web/src/lib/art.test.tsx:158` - `expect(edge.filter(([x, y]) => !isInk(x, y))).toEqual([])`, `isInk` = `"6,6,18"` at `:145`, 4 neighbours at `:157` | PASS |
| C21 | mean Rec.709 luminance of non-ink `x+y<15` > `x+y>15` (9 icons) | vitest `menu-<id> > menu icon light from the top-left` x9 ✓ | `web/src/lib/art.test.tsx:168` - `expect(mean(lit.filter(([x, y]) => x + y < 15))).toBeGreaterThan(mean(lit.filter(([x, y]) => x + y > 15)))`, weights `0.2126/0.7152/0.0722` at `:164` | PASS |
| C22 | `3` already `preventDefault`ed on `body` does not push | vitest `Tabs hotbar > shortcut ignores prevented` ✓ | `web/src/components/Tabs.test.tsx:215-216` - `cancel = (e) => e.preventDefault()` on `document.body`; `:219` `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C23 | per scene, MENU's first child is the icon, then `MENU · <label>` (9) | vitest `menu button icon per scene 01 TÍTULO` ... `09 OFFICE` (9 ✓) | `web/src/components/Tabs.test.tsx:250-253` - `first?.tagName).toBe("IMG")`, `src` `toBe(\`/art/icon/menu-${icon}.png\`)`, `alt` `toBe("")`, `first?.nextSibling?.textContent).toBe(\`MENU · ${label}\`)` | PASS |
| C24 | 1280 and 390: num above-left of the icon and inside the slot, label below the icon, glow only on the active slot | playwright `arrangement desktop › C24 arrangement 1280` ✓, `arrangement phone › C24 arrangement 390` ✓ | `web/e2e/game-menu.spec.ts:119-125` - `num.x + num.w` `toBeLessThanOrEqual(s.icon.x)`, `num.y` `toBeLessThan(s.icon.y)`, `toBeGreaterThanOrEqual(s.slot.x / s.slot.y)`, `label.y` `toBeGreaterThanOrEqual(s.icon.y + s.icon.h)`, `shadow` `toContain` / `.not.toContain("rgb(255, 224, 138)")`; `:117` `toHaveLength(9)`. Precision note: "inside the slot" is asserted only on the left and top edges | PASS |

## Coverage

The rows the fix touched were recomputed at `715aa72`. The other rows are carried from `e8467f4`,
because their authority (`TABS`, `Tabs.tsx`, `GameArt.tsx`, `globals.css`) is absent from the
diff `6415a00..HEAD`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| icon style rules, binding (12) | style guide `icon` + general rules (authority outside the code) | 16x16 C1 · palette C2 · 0 semi-transparent C2 (render) and measured 0 · 1px margin C19 · fill ~80% C19 (13-14/16) · `ink` outline C20 · top-left light C21 · centred: judged, every bbox centred within 0.5px · one object: judged, 9/9 · inner detail not ink: judged, holds (see exemption above) · 3-4 tones per material: judged · glossy specular: judged | glossy specular: the `office` screen has none (`web/art/icon/menu-office.json:26-29`). 3-4 tones: the `mundo` paper and the `office` bezel have 2 (needs a ruling) |
| shortcut guards (10) | `web/src/components/Tabs.tsx:33-35` + door 3 literal | `defaultPrevented` C22 · Ctrl, Meta, Alt C10 · `input`, `textarea`, `select`, `[contenteditable]` C11 · non `1`-`9` (`0`, `a`) C12 | - |
| MENU button icon by route (9 scenes + outside) | plan AC 13, `TABS` (`Tabs.tsx:8-18`), render at `Tabs.tsx:60-61` | `/`, `/mundo`, `/server`, `/deploy`, `/bug-fight`, `/skills`, `/loja`, `/avatar`, `/office` C23 (icon first, then text) · outside `TABS` (`/login`) C15 | - |
| slot arrangement (5) | plan `Sources` "Hotbar RPG" + `Assumptions` squareness ruling | number top-left C24 · square icon frame C6 (user ruling) · label below C24 · active glow C24 · active yellow border C7 | - |
| menu icons on disk (9) | plan AC 1 id list | all 9 C1, C2 (carried from `e8467f4`) | - |
| slots with icon (9) | `TABS` | all 9 C4 (carried from `e8467f4`) | - |
| slot states (4) | plan AC 4, 6, 7 | active C7 · inactive x8 C7 · focused C8 · icon failed C5 (carried from `e8467f4`) | - |
| shortcut keys (9) | door 3 / AC 8 | `1`-`9` C9, `4` and `1` also C14 (carried from `e8467f4`) | - |
| shortcut side effects (2) | `Tabs.tsx:37-38` | navigate C9, C14 · close menu C13 (carried from `e8467f4`) | - |
| phone widths with open menu (2) | plan AC 14 | 360 C16 · 390 C16, 390 also C24 (carried from `e8467f4`) | - |
| Landing doors (3) | plan Landing | door 1 C1, C4 · door 2 C3 · door 3 C9-C14, C22 | - |

## Test policy rows

Verified at `715aa72`. I re-judged the row that was unmet in round 1 and every row that
classifies a touched file.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` keydown handler (door 3) | boundary C14 · own layer C9-C13, C22 | yes - every row of the decision table at `Tabs.tsx:33-35` has an asserted case at its own layer: `defaultPrevented` C22 (F3 killed), 3 modifiers C10, 4 editable targets C11, other keys C12, 9 keys C9, menu close C13. The boundary contract is C14 |
| Decides, not reached across a boundary | `Tabs.tsx` slot + MENU rendering; `GameArt.tsx` `menu` address | own layer C4, C5, C15, C23, C3 | yes - slot icon 9/9 C4, MENU icon 9/9 scenes plus order C23 (F4 killed), outside `TABS` C15, `menu` address C3 |
| Decides at the boundary only (CSS the browser evaluates; `checks.md` Test policy line 4) | `web/src/app/globals.css` hotbar + 3x3 rules | boundary C6, C7, C8, C16, C24 | yes - all against the production build with `globals.css` loaded; F5 (`.tab-num` corner) killed by C24 at both widths |
| Instrumentation, pass-throughs | 9 `web/art/icon/menu-*.json` + PNGs (data); `useRouter` mocks in `GameShell.test.tsx`/`Hud.test.tsx` | none of their own; consumers C1, C2, C4, C19-C21 | yes - full `npx vitest run` 350 passed |

## Faults injected

Verified at `715aa72`. I ran these in `git worktree add <scratchpad>/wt HEAD` with
`web/node_modules` cloned in (`cp -Rc`). For the art faults, I edited the worktree spec,
re-rendered it with `render.py ... --out web/public/art` in the worktree, and ran vitest from the
worktree. For the CSS fault, I stopped the real `:3100` server (PID 50902, cwd real `web/`), built
the worktree with `API_URL=http://localhost:8180 npx next build`, served it with `next start --port
3100`, and ran the proof from the worktree. Afterwards I stopped that server, rebuilt the real
`web/` with the same `API_URL`, and restarted `npx next start --port 3100` from the real `web/`.
The new PID 58397 is `next-server (v16.3.6)` with cwd real `web/`, and `curl /login` returns 200.
Then I ran `git worktree remove --force`. The real tree's `git status --porcelain` matched before
and after (14 pre-existing untracked lines). After the restore, the gate re-ran green.

The cap is 5, one fault per distinct new surface. C19 (margin/fill) was the one surface left
uninjected. It shares the `pngPixels` decode with C20 and C21. F1 and F2 were killed at exact
coordinates (`[[1, 5]]`), which shows the decode reads positions correctly. My independent pixel
measurement also agrees with C19's values (bbox sides 13-14, 0 pixels on the border). Round 1's
F1-F5 (`Tabs.tsx:34,37`, `globals.css:52,55,356`) hit files that the fix left unchanged, so they
are carried from `e8467f4`.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 `mundo` left outline pixel (1,5) `o` -> `p` (`cloud.3`), re-rendered | `web/art/icon/menu-mundo.json` grid row 5 | yes - C20 `menu-mundo > menu icon outline in ink` failed (`expected [ [ 1, 5 ] ] to deeply equal []`); `mundo` margin and light, and all `skills` tests except light, stayed green |
| F2 `skills` shading flipped (legend `gold.3` <-> `gold.1`), re-rendered | `web/art/icon/menu-skills.json` legend | yes - C21 `menu-skills > menu icon light from the top-left` failed (`expected 182.19 to be greater than 198.56`); `skills` margin and outline stayed green |
| F3 `e.defaultPrevented \|\|` removed from the guard | `web/src/components/Tabs.tsx:33` | yes - C22 `shortcut ignores prevented` failed (`push` called 1 time) |
| F4 MENU icon moved after the text | `web/src/components/Tabs.tsx:60-61` (lines swapped) | yes - C23 failed 9/9 (`expected undefined to be 'MENU · TÍTULO'` ...). C15 stayed green, as expected, because it does not claim order |
| F5 `.tab-num` `left: 5px` -> `right: 5px` (top-right corner) | `web/src/app/globals.css:50` | yes - C24 1280 failed (`01TÍTULO` expected `<= 90.875`, received `167.77`) and C24 390 failed (`<= 53.66`, received `123.33`) |

## Gate

`cd web && npx vitest run`: 350 passed, 0 failed (18 files). `npx playwright test
e2e/game-menu.spec.ts e2e/responsive.spec.ts`: 86 passed, 0 failed (re-run after the real
`:3100` server was restored). `make art-check`: exit 0.

Ranked gaps:

1. The `office` screen has no specular pixel. The binding style guide says "screen" gets a single
   `white` or top-tone specular pixel. S6 enumerates the `office` screen, and the catalog
   precedent is `gear-monitor` (4,4) and `gear-macbook` (4,3), both `net.4`. Location:
   `web/art/icon/menu-office.json:26-29`, with the screen at rows 3-6, x4-11. This is a binding
   source finding and has no check id.
2. "3-4 tones per material" is under the range for the `mundo` paper (`cloud.3`/`cloud.2`) and
   the `office` bezel (`stone.3`/`stone.1`). The user needs to rule: either redraw with a third
   tone, or record these surfaces in S6 as an enumerated exemption. Locations:
   `web/art/icon/menu-mundo.json`, `web/art/icon/menu-office.json:25-30`.
3. Precision gaps in the checks (these are not failures). The S6 ink exemption lists a stale
   `bug-fight` "head over the shell" case, omits the `office` stand/desk boundary, and leaves
   "off the outline" undefined; the 8-connectivity allowlist above would make it mechanical. In
   C24, "inside the slot" is asserted only on the left and top edges
   (`web/e2e/game-menu.spec.ts:121-122`).
