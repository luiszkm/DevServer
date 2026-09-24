# Game menu verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 80fd17e..e8467f4
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 18 proofs ran green at `e8467f4` and all 5 injected faults were killed. The feature still
fails, for three reasons. The binding icon style names four properties (palette, 16x16, `ink`
outline, top-left light), and no check covers the last two. The Hotbar RPG arrangement in the
plan's `Sources` line has parts no check covers. And door 3's `e.defaultPrevented` guard has
no proof.

## Binding sources

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` (plan `Sources`: binding for icon style: palette, 16x16, `ink` outline, top-left light) | yes - read the key art and the full style guide; rendered all 9 specs (`render.py web/art/icon/menu-*.json --preview`), screenshotted the hotbar at 1280 and the open menu at 390, and measured every PNG pixel by pixel (bbox, fill, outline %, TL/BR luminance, ramps) | none of the checks contradicts the source (the checks do not mention style at all) | **`ink` outline and top-left light have no check.** C1 covers 16x16, C2 covers palette (render `ERROR`) and byte equality. Outline is only a render `WARN` with a 90% bar, and `make art-check` exits 0 on a `WARN`. Light direction, "one centred object ~80%" and "inner detail lines use the ramp's darkest tone, never ink" are unchecked too. Measured deviations, per icon: **office**: the monitor bezel is flat `stone.3` on all four sides (no top-left highlight, no bottom-right shade), the stand is lit from the right (`metal.2` at x7, `metal.3` at x8), and TL/BR luminance is 81/81. **titulo**: the outline is 93% ink; 3 edge pixels are not ink: the roof apex (7,1) and (8,1) have no ink above them, and the eave (1,7) has none below. **bug-fight**: inner detail is drawn in ink (a 2px ink seam at cols 7-8, rows 3-12, plus ink spots); it spans 16/16 of the width and touches x0, x15 and y0. **skills** and **titulo**: 16/16 width against "~80%" (skills is also 1px asymmetric: the left arm reaches x0 in row 6, the right arm stops at x14). **deploy, server, office**: 15/16 of the height. **avatar, loja, mundo**: 88%, centred, 100% ink outline, top-left light, no deviation. All 9 are 16x16 with 0 off-palette and 0 semi-transparent pixels |
| plan `Sources`: user's "Hotbar RPG" choice (square slots, icon x2 in a frame, number in the corner, label below, active slot yellow frame + glow; mobile MENU opens a 3x3 command window of the same slots; keys 1-9) | yes - plan.md line 5, compared with the rendered hotbar at 1280x800 and the open menu at 390x844 | none | **Slot count** (C4, C6, C16), **order** (C4), **one row** (C6), **icon in frame** (C4 `.tab-icon > img`, C6 44x44 + loaded), **active border** (C7), **3x3** (C16), **shortcuts** (C9-C14) and **MENU icon** (C15) are covered. Uncovered: **number in the corner**: C4 asserts only the `.tab-num` text; its position (`position:absolute; top:4px; left:5px`) is unasserted. **Label below the icon**: C4 asserts only that the text is present; no check asserts label y > `.tab-icon` y. **Active glow** (`0 0 0 2px #ffe08a`, the plan's "brilho"): unasserted; C7 checks only `border-top-color`. **"Slots quadrados"**: the plan defines slot = the hotbar link (Impact), and the link renders 125.8x86 at 1280 and 111.3x86 at 390; only the 44x44 `.tab-icon` frame is square (C6). If the chosen preview's slot is the whole cell, this is uncovered and contradicted; the user needs to rule on it |

## Checks

All proofs were run by the verifier at `e8467f4` against the e2e stack serving a `next build` of the real `web/` (clean vs HEAD). Unit proofs ran in one invocation:
`npx vitest run src/lib/art.test.tsx src/components/GameArt.test.tsx src/components/Tabs.test.tsx -t "menu icons|menu address|slot icons|...|menu label" --reporter=verbose`, giving 42 passed (each name listed below appears individually). E2E: `npx playwright test e2e/game-menu.spec.ts` gave 6 passed; `npx playwright test e2e/responsive.spec.ts -g "C[0-9]+ "` gave 78 passed.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 9 menu specs + PNGs, 16x16 | vitest `menu icons per scene, 16x16` ✓ | `web/src/lib/art.test.tsx:114` - `expectAssets(icons([9 ids].map((id) => \`menu-${id}\`)))`, size `[16, 16]` at `:55`, asserted at `:33-35` `expect.soft(existsSync(spec))`, `existsSync(png)`, `pngSize(png)).toEqual(size)` | PASS |
| C2 | `make art-check` exits 0 with the 9 specs included | `make art-check` gave exit 0, `art ok`, and 9 `ok .../icon/menu-*.png` lines | `Makefile:32-33` - `render.py web/art --out "$tmp" && diff -r "$tmp" web/public/art` | PASS |
| C3 | `GameArt kind="menu"` address/size/class | vitest `GameArt > menu address` ✓ | `web/src/components/GameArt.test.tsx:41-44` - `src` `toBe("/art/icon/menu-loja.png")`, `width`/`height` `toBe("32")`, `className` `toContain("pixelated")` | PASS |
| C4 | 9 slots in order with `.tab-icon > img`, src/alt/width/pixelated, num + label | vitest `Tabs hotbar > slot icons` ✓ | `web/src/components/Tabs.test.tsx:156` - `expect(got).toEqual(SLOTS.map(... [num, label, href, \`/art/icon/menu-${icon}.png\`, "", "32", true]))`; SLOTS literal `:126-136` matches the checks table and `TABS` | PASS |
| C5 | LOJA icon error: img removed, `07` + `LOJA` kept | vitest `slot icon fallback` ✓ | `web/src/components/Tabs.test.tsx:163-165` - `querySelector("img")).toBeNull()`, `.tab-num` `toHaveTextContent("07")`, `toHaveTextContent("LOJA")` | PASS |
| C6 | 1280: same y, widths ±1, `.tab-icon` 44x44 with loaded img, `.page` 1200, scene 760 | playwright `C6 hotbar row` ✓ | `web/e2e/game-menu.spec.ts:20` `toEqual([44, 44])`; `:21` `naturalWidth` `toBe(16)`; `:23` y-set `toBe(1)`; `:25` width spread `toBeLessThanOrEqual(1)`; `:26` `.page` `toBe(1200)`; `:27` scene `toBe(760)` | PASS |
| C7 | `/server`: SERVER `.tab-icon` border yellow, other 8 not | playwright `C7 active slot` ✓ | `web/e2e/game-menu.spec.ts:38-41` - `expect(color).toBe(YELLOW)` / `.not.toBe(YELLOW)`, `toHaveLength(9)` | PASS |
| C8 | Tab from body: TÍTULO outline solid 3px yellow | playwright `C8 focus outline` ✓ | `web/e2e/game-menu.spec.ts:49,54` - `toBeFocused()`; `toEqual({ style: "solid", width: "3px", color: YELLOW })` | PASS |
| C9 | keys 1-9 push slot N href once (9) | vitest `shortcut navigates 1 -> /` ... `9 -> /office` (9 ✓) | `web/src/components/Tabs.test.tsx:171-172` - `toHaveBeenCalledTimes(1)`, `toHaveBeenCalledWith(href)` | PASS |
| C10 | Ctrl/Meta/Alt+3 do not push (3) | vitest `shortcut ignores modifiers {Control>}3{/Control}` / `{Meta>}` / `{Alt>}` ✓ | `web/src/components/Tabs.test.tsx:178` - `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C11 | `3` inside input/textarea/select/contenteditable does not push (4) | vitest `shortcut ignores editable input/textarea/select/contenteditable` ✓ | `web/src/components/Tabs.test.tsx:200,202` - `expect(el).toHaveFocus()`; `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C12 | `0`, `a` do not push (2) | vitest `shortcut ignores other keys 0` / `a` ✓ | `web/src/components/Tabs.test.tsx:209` - `expect(nav.push).not.toHaveBeenCalled()` | PASS |
| C13 | menu open + `4`: push `/deploy`, `aria-expanded="false"` | vitest `shortcut closes menu` ✓ | `web/src/components/Tabs.test.tsx:215,217-218` - `"true"` precondition; `toHaveBeenCalledWith("/deploy")`; `toHaveAttribute("aria-expanded", "false")` | PASS |
| C14 | browser 1280: `4` goes to /deploy, `1` goes back to / | playwright `C14 shortcuts` ✓ | `web/e2e/game-menu.spec.ts:60-64` - `toHaveURL(/\/deploy$/)`, `PIPELINES DE DEPLOY` visible, `toHaveURL(/\/$/)`, `CLIQUE NAS PLACAS PARA NAVEGAR` visible | PASS |
| C15 | `/loja` MENU has icon + `MENU · LOJA`; `/login` has no img + `MENU` | vitest `menu button icon` ✓ | `web/src/components/Tabs.test.tsx:225-227,231-232` - `src` `toBe("/art/icon/menu-loja.png")`, `alt` `toBe("")`, `/^MENU · LOJA$/`; `img` `toBeNull()`, `/^MENU$/` | PASS |
| C16 | 360 and 390 open menu: 9 visible, img visible, 3 x-values, 3 y-values, no h-scroll | playwright `C16 command window 360` ✓, `C16 command window 390` ✓ | `web/e2e/game-menu.spec.ts:83-84,89-90,92` - `toBeVisible()` x2; `xs.size).toBe(3)`, `ys.size).toBe(3)`; `scrollWidth).toBeLessThanOrEqual(innerWidth)` | PASS |
| C17 | responsive browser proofs green, asserts unchanged | playwright `responsive.spec.ts -g "C[0-9]+ "` gave 78 passed (C7 x1, C8 x18, C9 x9, C10 x10, C11 x9, C12-C14, C15 x4, C16 x9, C17, C22 x2, C23 x3, C24 x6, C25, C26 x2) | `web/e2e/responsive.spec.ts:58` (`C7 menu on phone`) and the rest; the file is absent from `git diff --stat 80fd17e..HEAD`, so no assert changed | PASS |
| C18 | foundation/responsive `Tabs.test.tsx` proofs green, asserts unchanged | vitest `tab order and routes`, `marks only the current route's tab as current`, `menu starts closed`, `menu opens`, `link closes menu`, `button closes menu`, `escape closes menu`, `other keys keep menu open`, `menu label` x10 ✓ | `web/src/components/Tabs.test.tsx:16-121` (e.g. `:121` `toHaveTextContent(new RegExp(\`^${label}$\`))`); the diff touches only the import/mock lines 1-13 and appends after line 121 | PASS |

## Coverage

Recomputed from the plan's AC/door lists, `TABS` in `web/src/components/Tabs.tsx:8-18`, and the handler at `Tabs.tsx:31-42`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| menu icons on disk (9) | plan AC 1 / door 1 id list; `ls web/art/icon/menu-*` and `web/public/art/icon/menu-*` (9 + 9) | all 9 C1 (literal list = plan list), C2 | - |
| slots with icon (9) | `TABS` (code == plan table, label/href/icon identical) | all 9 C4 (table-driven `SLOTS`) | - |
| slot states (4) | plan AC 4, 6, 7 | active C7 · inactive x8 C7 · focused C8 · icon failed C5 | - |
| shortcut keys (9) | door 3 / AC 8, `TABS` | `1`-`9` C9; `4`, `1` also C14 | - |
| shortcut guards (8 + non-digit) | door 3 literal: `ctrlKey`, `metaKey`, `altKey`, `defaultPrevented`, `input`, `textarea`, `select`, `[contenteditable]`, key outside `1`-`9`; code `Tabs.tsx:33-35` | Ctrl, Meta, Alt C10 · input, textarea, select, contenteditable C11 · `0`, `a` C12 | `e.defaultPrevented` (`Tabs.tsx:33`), named in the plan's Landing door 3 and in the checks' handoff ("the shortcut guard also skips `e.defaultPrevented`"), but it has no row in the checks' Coverage table and no test (`rg defaultPrevented src e2e` hits only `Tabs.tsx:33`) |
| shortcut side effects (2) | `Tabs.tsx:37-38` | navigate C9, C14 · close menu C13 | - |
| MENU button icon by route (9 scenes + outside) | plan AC 13 ("WHILE the current route is one of the 9 scenes ... icon `menu-<id>` of the scene"), `TABS` | `/loja` C15 · `/login` (outside) C15 | 8 of 9 scenes (`/`, `/mundo`, `/server`, `/deploy`, `/bug-fight`, `/skills`, `/avatar`, `/office`): the claim covers 9 and is proven on 1. The risk is low, because `current.icon` reads the same `TABS.icon` that C4 proves for all 9, and the `menu label` test is already table-driven over the 10 routes. Also "antes do texto" (icon before the text) is not asserted (precision gap) |
| phone widths with open menu (2) | plan AC 14 | 360 C16 · 390 C16 | - |
| Landing doors (3) | plan Landing | door 1 C1, C4 · door 2 C3 · door 3 C9-C14 | door 3 `defaultPrevented` clause (see guards row) |
| Observable rows marked `existing` (loading, unauthorised) | plan Observable; `GameShell.tsx:70-95` | loading mounts `Frame`/`Tabs` (`GameShell.tsx:77-83`); unauthenticated/onboarding/down render without `Frame` (`:71-76`) | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` keydown handler (door 3) | boundary C14 · own layer C9-C13 | no - the decision table has a `e.defaultPrevented` row (`Tabs.tsx:33`) with no asserted case; the other rows (9 keys, 3 modifiers, 4 editable targets, non-digit, menu close) each have one |
| Decides, not reached across a boundary | `Tabs.tsx` slot + MENU rendering; `GameArt.tsx` kind -> address (`menu` row) | own layer C4, C5, C15, C3 | yes - slot icon for 9/9 rows (C4), MENU icon present/absent (C15), `menu` address (C3); the AC 13 per-scene breadth is listed under Coverage |
| Decides at the boundary only (CSS the browser evaluates) | `web/src/app/globals.css` hotbar rules + `@media (max-width: 1199px)` 3x3 | boundary C6, C7, C8, C16 | yes - each is proven in the browser against a production build with `globals.css` loaded, and faults F3-F5 were killed there |
| Instrumentation, pass-throughs | 9 `web/art/icon/menu-*.json` + PNGs; `useRouter` mocks in `GameShell.test.tsx`/`Hud.test.tsx` | none of their own; covered by C1/C2 and by the suites that consume them | yes - full `npx vitest run` gave 313 passed |

## Faults injected

Run in `git worktree add <scratch>/wt HEAD` with a copied `node_modules`. For the CSS faults, the real `:3100` server was stopped, the worktree was rebuilt with `API_URL=http://localhost:8180 npx next build` and served from the worktree on `:3100`, and the narrowest proof was run from the worktree. Afterwards the real `web/` was rebuilt and restarted (`curl /login` gave 200, cwd `/Users/luissoares/Repos/DevServer-1/web`) and the worktree was removed with `--force`. Real-tree `git status --porcelain` matched before and after (14 pre-existing untracked lines).

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 drop the editable-target guard (`if (e.target ... closest(EDITABLE)) return;` commented out) | `web/src/components/Tabs.tsx:34` | yes - C11 4/4 failed (input, textarea, select, contenteditable) |
| F2 drop `setOpen(false)` from the shortcut | `web/src/components/Tabs.tsx:37` | yes - C13 failed (`aria-expanded` stayed `true`) |
| F3 active `.tab-icon` border `var(--yellow)` -> `var(--line)` | `web/src/app/globals.css:55` | yes - C7 failed (expected `rgb(255, 201, 60)`, received `rgb(51, 80, 107)`) |
| F4 `.tab-icon` 44x44 -> 40x40 | `web/src/app/globals.css:52` | yes - C6 failed (`[44, 44]` vs received) |
| F5 phone grid `repeat(3, 1fr)` -> `repeat(4, 1fr)` (still 3 rows) | `web/src/app/globals.css:356` | yes - C16 360 and 390 failed (x-values expected 3, received 4) |

## Gate

`npx vitest run` - 313 passed, 0 failed. `npx playwright test e2e/game-menu.spec.ts e2e/responsive.spec.ts` - 84 passed, 0 failed (after the real server was restored). `make art-check` - exit 0.

Ranked gaps:

1. Binding icon style: the plan's own Sources name `ink` outline and top-left light as binding, and no check covers either. Measured deviations: office (flat bezel, stand lit from the right), titulo (3 non-ink edge pixels at the apex and eave), bug-fight (ink used as inner detail). Fill runs 88-100% against "~80%". No check id; the evidence is the pixel measurements above.
2. `e.defaultPrevented` guard (door 3) has no proof, so the Test policy row "decides, reached across a boundary" is unmet. `web/src/components/Tabs.tsx:33`, no evidence.
3. Hotbar arrangement: the number-in-corner and label-below positions and the active glow are unasserted, and slot squareness is ambiguous (the link is 125.8x86; only the frame is square). The user needs to rule on squareness.
4. AC 13: the MENU icon is proven on 1 of 9 scenes (C15), and "before the text" is unasserted. `web/src/components/Tabs.test.tsx:225`.
