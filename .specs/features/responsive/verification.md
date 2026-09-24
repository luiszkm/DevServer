# Responsive verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5cdbe61..a3b5e9f
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

The plan marks no source as binding. Its sources are the conversation of 2026-09-24, `web/src/app/globals.css`, `.specs/STATE.md` AD-007 and game-art C33, none of them a design artifact. Step 1 is a `ui` step and does not run under `standard`, so this section records only that nothing is marked binding.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (conversation, `globals.css`, STATE AD-007, game-art C33) | n/a | none | - |

## Checks

All proofs ran at `a3b5e9f`. Before the e2e gate run, `web/` was rebuilt from the real tree (`API_URL=http://localhost:8180 npx next build`, then `next start --port 3100`). Unit: `npx vitest run src/components/Tabs.test.tsx -t "menu starts closed|menu opens|link closes menu|button closes menu|escape closes menu|menu label"` gave 15 passed, and each name was listed individually. E2e: `npx playwright test e2e/responsive.spec.ts e2e/art.spec.ts --reporter=list` gave 68 passed (64 responsive + 4 art), with each test title listed.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | MENU button type=button, aria-expanded=false, aria-controls=cenas-nav; nav id=cenas-nav data-open=false | vitest `-t "menu starts closed"` pass | `web/src/components/Tabs.test.tsx:50-54` - `toHaveAttribute("type","button")`, `("aria-expanded","false")`, `("aria-controls","cenas-nav")`, nav `("id","cenas-nav")`, `("data-open","false")`; name `/^MENU/` at :45 | PASS |
| C2 | click closed MENU -> expanded=true, data-open=true | vitest `-t "menu opens"` pass | `web/src/components/Tabs.test.tsx:60-61` - `toHaveAttribute("aria-expanded","true")`, `("data-open","true")` | PASS |
| C3 | click link while open -> closed | vitest `-t "link closes menu"` pass | `web/src/components/Tabs.test.tsx:70-71` - `("aria-expanded","false")`, `("data-open","false")` | PASS |
| C4 | click open MENU -> closed | vitest `-t "button closes menu"` pass | `web/src/components/Tabs.test.tsx:78-79` - `("aria-expanded","false")`, `("data-open","false")` | PASS |
| C5 | Escape with focus on a nav link -> closed, focus on MENU | vitest `-t "escape closes menu"` pass | `web/src/components/Tabs.test.tsx:87-89` - `("aria-expanded","false")`, `("data-open","false")`, `expect(menu()).toHaveFocus()` | PASS |
| C6 | label `MENU · <label>` for the 9 TABS routes, `MENU` for `/login` | vitest `-t "menu label"` 10 cases pass | `web/src/components/Tabs.test.tsx:107` - `toHaveTextContent(new RegExp(`^${label}$`))` over the table at :91-102 (10 rows) | PASS |
| C7 | 390x844: links hidden, `MENU · TÍTULO` collapsed; open shows 9 in TABS order; DEPLOY navigates, closes, label `MENU · DEPLOY`, aria-current | playwright `C7 menu on phone` pass | `web/e2e/responsive.spec.ts:64` `toBeHidden()` ×9 · `:65-66` `toHaveText("MENU · TÍTULO")`, `aria-expanded` false · `:70,72` `toBeVisible()`, `names toEqual(SCENES labels)` · `:75` `toHaveURL(/\/deploy$/)` · `:78-81` hidden, `MENU · DEPLOY`, false, `aria-current` `page` | PASS |
| C8 | 360 and 390, 9 scenes, scrollWidth <= innerWidth (18) | playwright `C8 360 *` ×9, `C8 390 *` ×9 pass | `web/e2e/responsive.spec.ts:89` and `:134` - `expect(scrollWidth).toBeLessThanOrEqual(innerWidth)` | PASS |
| C9 | 360, 9 scenes, controls in scene + HUD within [0, innerWidth] | playwright `C9 360 *` ×9 pass | `web/e2e/responsive.spec.ts:141-142` - `boxes.length > 0`, `outside(boxes, 360) toEqual([])` (`:45` `x < 0 \|\| x+width > width+0.5`) | PASS |
| C10 | 360, 9 scenes + open menu, controls >= 24x24 except `.title-art a` | playwright `C10 360 *` ×9 + `C10 360 menu open` pass | `web/e2e/responsive.spec.ts:149-150` - `small toEqual([])` with `width < 24 \|\| height < 24`, exclude at :148 · `:158-160` 9 nav links, `small toEqual([])` | PASS |
| C11 | 390, 9 scenes, scene scrollHeight <= clientHeight and last button in viewport after scroll | playwright `C11 390 *` ×9 pass | `web/e2e/responsive.spec.ts:97` `scrollHeight <= clientHeight` · `:101-102` `box.y >= 0`, `box.y + box.height <= 844` | PASS |
| C12 | 360, 6 `.hud-card` visible within width, SAIR visible | playwright `C12 hud` pass | `web/e2e/responsive.spec.ts:166` `toHaveCount(6)` · `:170-171` `x >= 0`, `x + width <= 360` · `:173` SAIR `toBeVisible()` | PASS |
| C13 | 390, key art width = frame inner width ±1, ratio 0.8 ±0.01, 6 hotspots inside image | playwright `C13 title` pass | `web/e2e/responsive.spec.ts:113-114` `abs(art.width - frameWidth) <= 1`, `abs(h/w - 0.8) <= 0.01` · `:116-121` 6 spots, each edge inside art ±0.5 | PASS |
| C14 | 360, 6 `.node-marker` inside `.world-map`, no `.node-chip` visible | playwright `C14 world` pass | `web/e2e/responsive.spec.ts:181-187` count 6, four edge bounds · `:189` each `.node-chip` `toBeHidden()` (chips exist in the DOM: `web/src/components/WorldScene.tsx:60`, so not vacuous) | PASS |
| C15 | 360, login / onboarding / server down (500) / loading (no answer): no h-scroll, controls within width | playwright `C15 login`, `C15 onboarding`, `C15 server down`, `C15 loading` pass | `web/e2e/responsive.spec.ts:194-197` (`fitsPhone`) - `scrollWidth <= innerWidth`, `boxes.length > 0`, `outside(...) toEqual([])`; states reached at :202, :212, :217-219, :224-226 | PASS |
| C16 | 1280, 9 scenes: `.page` 1200 wide, scene 760 high, 9 links visible on one y, MENU hidden | playwright `C16 1280 *` ×9 pass | `web/e2e/responsive.spec.ts:251` `toBe(1200)` · `:252` `toBe(760)` · `:254,257,260` count 9, visible, `ys.size toBe(1)` · `:261` MENU `toBeHidden()` | PASS |
| C17 | 360, 4 backgrounds 1280px 720px + pixelated | playwright `C17 backgrounds` pass | `web/e2e/responsive.spec.ts:239` - `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` for 4 selectors (:232) | PASS |
| C18 | 1280x720, game-art C33 still green | playwright `e2e/art.spec.ts` `scene art scale *` ×4 pass | `web/e2e/art.spec.ts:22` - `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` (unchanged by this diff) | PASS |
| C19 | STATE: AD-015 with the literal door 2 text, active; AD-007 superseded by AD-015 | grep proof exit 0 | `.specs/STATE.md:21` AD-015 row, text read and matches door 2 word for word, status `active` · `.specs/STATE.md:13` status `superseded by AD-015` | PASS |
| C20 | one `@media (max-width: 1199px)` block in `globals.css`, none elsewhere in `web/src` | grep proof exit 0 | `web/src/app/globals.css:344` - `@media (max-width: 1199px) {`; `grep -rn '@media' src` returns only this line | PASS |

## Coverage

Each set was recomputed from its authority: TABS and the route tree for scenes, `GameShell` for screens, `Hud.tsx` for cards, `globals.css` for backgrounds, `Tabs.tsx` plus the plan's close enumeration for the menu, and the plan's `Observable` table for states.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| menu close/open triggers (4) | plan assumption "Fechar o menu" (link, button, Escape) + `Tabs.tsx:40,51,26-30` | button open C2 · button close C4 · link C3 · Escape C5 | - |
| keydown dispatch in `onKeyDown` (2 observable rows) | `web/src/components/Tabs.tsx:27` `if (e.key !== "Escape" \|\| !open) return;` | Escape while open -> close + focus C5 | non-Escape key while open -> stays open: no proof; the F1 mutant (any key closes) survived |
| menu label by route (10) | `TABS` at `Tabs.tsx:7-17` (9) + fallback branch `:42` | 9 routes + `/login`, table-driven C6 (`Tabs.test.tsx:91-102`) | - |
| scenes (9) | `web/src/app/(game)/` = page.tsx + avatar, bug-fight, deploy, loja, mundo, office, server, skills; equals `TABS` and `SCENES` (`responsive.spec.ts:10-20`) | C8 at 360 and 390, C9, C10, C11, C16 each iterate all 9 (test list in the gate log) | - |
| HUD cards (6) | `web/src/components/Hud.tsx:25,34,41,48,55,62` (ready state; `:19` is the loading card) | C12 `toHaveCount(6)` + each bound | - |
| screens outside the ready frame (4) | `web/src/components/GameShell.tsx:71-90` - unauthenticated, onboarding, down, loading | C15 ×4 | - |
| scene backgrounds (4) | `globals.css:105,164,286,308` - the only `1280px 720px` rules | C17 at 360, C18 at 1280 | - |
| viewports (3) | checks table: 360x740, 390x844, 1280x800 | 360: C8 C9 C10 C12 C14 C15 C17 · 390: C7 C8 C11 C13 · 1280: C16 (C18 at 1280x720) | - |
| Landing doors (3) | plan `Landing` | door 1 C20 (+ C8, C16) · door 2 C19 · door 3 C1, C7 | - |
| plan `Observable` error states at phone width (3) | plan `Observable` rows "error state" (scenes, onboarding) + `AC 14` | server down C15 | onboarding `field-error` (`Onboarding.tsx:66,87`) "fica no painel": no proof renders it · scene `role="alert"` messages "ficam na coluna" (`DeployScene`, `ServerScene`, `WorldScene`): no proof renders one at 360/390 |
| plan `Observable` data density (2) | plan row "empty state: AC 7-10 valem para ele como para o cheio" | fresh dev (empty inventory, no running deploy) C8-C11 via `newDev` | populated state (running deploy, equipped avatar, battle log, filled office): no proof |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` (open state, keydown guard, label table) | boundary C7 · own layer C1-C6 | not met - there is one asserted case for each transition and each label row, but the keydown guard's non-Escape row (`Tabs.tsx:27`) has no assertion at either level, and mutant F1 survived |
| Decides, not reached across a boundary | `web/src/app/globals.css` media block (dispatch by viewport, two rows: <=1199px and >=1200px; only the browser evaluates it, so its own layer is the browser) | <=1199: C8-C15, C17 · >=1200: C16; literal bound C20 | yes |
| Entry point that decides nothing | none in the diff | - | n/a |
| Instrumentation, pass-throughs | none in the diff (`STATE.md`, the specs and the tests are not code under test) | - | n/a |

## Faults injected

Every fault ran in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` as an APFS clone. Turbopack refused a symlink that points out of the root. The real-tree porcelain before and after is identical: the 14 pre-existing untracked entries. The worktree was removed with `--force`. The `:3100` server was rebuilt from the real tree and restarted, and it answers 200. The user's `:3000`, `:8080` and `:9180` servers were never touched.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 key filter dropped: `if (e.key !== "Escape" \|\| !open)` -> `if (!open)` (any key, e.g. Tab, closes the open menu) | `web/src/components/Tabs.tsx:27` | no - survived: `Tabs.test.tsx` gave 17/17 passed, and no e2e presses a key (`grep -n "press\|keyboard" e2e/responsive.spec.ts` has no hits) |
| F2 link no longer closes the menu (`onClick={() => setOpen(false)}` removed) | `web/src/components/Tabs.tsx:51` | yes - `link closes menu` failed |
| F3 media block disabled: `max-width: 1199px` -> `max-width: 1px` | `web/src/app/globals.css:344` | yes - 34 failed: C7, C8 (18/18), C9 (9/9), C10 menu open, C11 `/` and `/mundo`, C12, C14, C15 loading. It survived in C10 per scene, C11 on 7 scenes, C13, C15 login/onboarding/server down and C17. The desktop layout satisfies those claims too, so those surfaces needed targeted faults |
| F4 phone scene height fixed again (`height: auto` removed from `.scene` override) | `web/src/app/globals.css:350` | yes - C11 failed on 7/9 scenes (`/` and `/office` fit in 760px) |
| F5 title-art override removed (`.title-scene .title-art { position: relative; height: auto; }`) | `web/src/app/globals.css:361` | yes - C13 failed (hotspot bottom 602 > art bottom 394) |

The 5-fault cap stopped fault injection before these proofs were made to fail: C1, C4, C5 (focus), C6, C10 per scene, C15 login/onboarding/server down, C16 and C17/C18.

## Gate

`cd web && npx playwright test e2e/responsive.spec.ts e2e/art.spec.ts` gave 68 passed, 0 failed. `npx vitest run` (full web suite) gave 288 passed, 0 failed. C19 and C20 grep proofs exited 0. All of these ran at `a3b5e9f` after the real-tree rebuild.

Ranked gaps:

1. Mutant F1 survived. `Tabs.tsx:27` has a key filter that nothing proves. If any key closed the open menu, every proof would still pass, and a keyboard user pressing Tab from MENU would close the menu before reaching a link. Needed: an own-layer case (open, press a non-Escape key such as Tab or `a`, still `aria-expanded="true"`). This is also the unmet `Test policy` row.
2. The plan's `Observable` names the onboarding `field-error` staying in the panel (AC 14) and the scenes' `role="alert"` messages staying in the column (AC 7). No proof renders either at phone width. C15 onboarding stops at the initial form.
3. The plan's `Observable` says AC 7-10 hold for the empty and the full scene alike. Every layout proof runs on a fresh `newDev`, so no proof covers a populated state such as a running deploy, an equipped avatar or a battle log.

Notes on the checks (these do not fail the feature):

- C13 precision: the claim compares the art to `.frame`, not to the viewport, so it passes with the media block removed. It only means something together with C8.
- C15 login, onboarding and server down pass with the media block removed. `.center-screen` is a flex container (`globals.css:81`), so the 460px panel already shrinks. The override `.login-panel, .onboarding { width: 100% }` (`globals.css:359`) is inert, and the plan's "painel de 460px, maior que a tela" did not match the rendered behaviour.
- C19's grep checks only `max-width: 1199px` inside the AD-015 row, not the whole door 2 literal. The row was read and it matches.
- `Swept` "authorization: existing" holds: `GameShell.tsx:71-76` returns `LoginScreen`, `Onboarding` or `ServerDown` without `Frame`, so no menu is mounted before a session.
