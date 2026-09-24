# Responsive verification

**Verdict**: FAIL
**Profile**: standard
**Diff range**: 5cdbe61..d6aa8f0
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 is scoped by the fix diff `a3b5e9f..d6aa8f0` and by every round 1 verdict that was not PASS. The fix diff has two parts. `96793fd` adds tests for C21-C24 in `web/src/components/Tabs.test.tsx` and `web/e2e/responsive.spec.ts`. `fc4dc84` removes `.login-panel, .onboarding { width: 100% }` from the media block in `web/src/app/globals.css`. It also touches the specs, `.specs/STATE.md` and the lessons files. It changes no product component. Every proof from C1 to C24 was re-run in full at `d6aa8f0`. Each section below says whether it was verified at `d6aa8f0` or carried from `a3b5e9f`.

## Binding sources

Carried from a3b5e9f. The plan marks no source as binding, and the fix did not touch the interface. Step 1 is a `ui` step and does not run under `standard`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (conversation, `globals.css`, STATE AD-007, game-art C33) | n/a | none | - |

## Checks

Verified at d6aa8f0. Before the run, the `:3100` server's CSS was checked against HEAD. It has one `@media (max-width:1199px)`, and `.login-panel,.onboarding` has only its base `width:460px`, so the `fc4dc84` override is gone.

- Unit: `npx vitest run src/components/Tabs.test.tsx -t "menu starts closed|menu opens|link closes menu|button closes menu|escape closes menu|other keys keep menu open|menu label" --reporter=verbose` gave 16 passed and 2 skipped. The 2 skipped are the pre-existing non-menu tests. Each name was listed individually, including `other keys keep menu open` and the 10 `menu label <route>` cases.
- E2e: `npx playwright test e2e/responsive.spec.ts e2e/art.spec.ts --reporter=list` gave 79 passed (75 responsive + 4 art), with each title listed. That includes `C22 onboarding name taken`, `C22 onboarding error`, `C23 mundo alert`, `C23 deploy alert`, `C23 server alert` and the six `C24 360 <route>` tests.
- The C19 and C20 grep proofs exited 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | MENU button type=button, aria-expanded=false, aria-controls=cenas-nav; nav id=cenas-nav data-open=false | vitest `menu starts closed` pass | `web/src/components/Tabs.test.tsx:50-54` - `toHaveAttribute("type","button")`, `("aria-expanded","false")`, `("aria-controls","cenas-nav")`, nav `("id","cenas-nav")`, `("data-open","false")` | PASS |
| C2 | click closed MENU -> expanded=true, data-open=true | vitest `menu opens` pass | `web/src/components/Tabs.test.tsx:60-61` - `("aria-expanded","true")`, `("data-open","true")` | PASS |
| C3 | click link while open -> closed | vitest `link closes menu` pass | `web/src/components/Tabs.test.tsx:70-71` - `("aria-expanded","false")`, `("data-open","false")` | PASS |
| C4 | click open MENU -> closed | vitest `button closes menu` pass | `web/src/components/Tabs.test.tsx:78-79` - `("aria-expanded","false")`, `("data-open","false")` | PASS |
| C5 | Escape on a nav link -> closed, focus on MENU | vitest `escape closes menu` pass | `web/src/components/Tabs.test.tsx:87-89` - `("aria-expanded","false")`, `("data-open","false")`, `expect(menu()).toHaveFocus()` | PASS |
| C6 | label `MENU · <label>` for 9 routes, `MENU` for `/login` | vitest `menu label` ×10 pass | `web/src/components/Tabs.test.tsx:120` - `toHaveTextContent(new RegExp(`^${label}$`))` over the table at `:105-116` (10 rows; refreshed, moved +13 by the fix) | PASS |
| C7 | 390x844 menu flow to DEPLOY | playwright `C7 menu on phone` pass | `web/e2e/responsive.spec.ts:64` `toBeHidden()` ×9 · `:65-66` `toHaveText("MENU · TÍTULO")`, expanded false · `:72` names `toEqual` SCENES labels · `:75` `toHaveURL(/\/deploy$/)` · `:78-81` hidden, `MENU · DEPLOY`, false, `aria-current` `page` (lines unchanged: the fix only appended after `:264`) | PASS |
| C8 | 360 and 390, 9 scenes, scrollWidth <= innerWidth | playwright `C8 360 *` ×9, `C8 390 *` ×9 pass | `web/e2e/responsive.spec.ts:89` and `:134` - `expect(scrollWidth).toBeLessThanOrEqual(innerWidth)` | PASS |
| C9 | 360, controls within [0, innerWidth] | playwright `C9 360 *` ×9 pass | `web/e2e/responsive.spec.ts:141-142` - `boxes.length > 0`, `outside(boxes, 360) toEqual([])` (`:45`) | PASS |
| C10 | 360, controls >= 24x24 except `.title-art a`, + open menu | playwright `C10 360 *` ×9 + `C10 360 menu open` pass | `web/e2e/responsive.spec.ts:149-150` `small toEqual([])` · `:158-160` 9 links, `small toEqual([])` | PASS |
| C11 | 390, scene not clipped, last button reachable | playwright `C11 390 *` ×9 pass | `web/e2e/responsive.spec.ts:97` `scrollHeight <= clientHeight` · `:101-102` box inside 0..844 | PASS |
| C12 | 360, 6 hud cards within width, SAIR visible | playwright `C12 hud` pass | `web/e2e/responsive.spec.ts:166` `toHaveCount(6)` · `:170-171` bounds · `:173` SAIR `toBeVisible()` | PASS |
| C13 | 390, key art = frame width ±1, ratio 0.8, hotspots inside | playwright `C13 title` pass | `web/e2e/responsive.spec.ts:113-114` width and ratio · `:116-121` 6 spots inside art | PASS |
| C14 | 360, 6 markers inside map, no chip visible | playwright `C14 world` pass | `web/e2e/responsive.spec.ts:181-187` count 6 + four edges · `:189` each `.node-chip` `toBeHidden()` | PASS |
| C15 | 360, login / onboarding / server down / loading fit | playwright `C15 login`, `C15 onboarding`, `C15 server down`, `C15 loading` pass | `web/e2e/responsive.spec.ts:194-197` (`fitsPhone`) - `scrollWidth <= innerWidth`, `boxes.length > 0`, `outside(...) toEqual([])`; states reached at `:202`, `:212`, `:219`, `:226`. Still green after `fc4dc84` removed the override, against a build confirmed to lack it | PASS |
| C16 | 1280, `.page` 1200, scene 760, 9 links one row, MENU hidden | playwright `C16 1280 *` ×9 pass | `web/e2e/responsive.spec.ts:251` `toBe(1200)` · `:252` `toBe(760)` · `:260` `ys.size toBe(1)` · `:261` MENU `toBeHidden()` | PASS |
| C17 | 360, 4 backgrounds 1280px 720px + pixelated | playwright `C17 backgrounds` pass | `web/e2e/responsive.spec.ts:239` - `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` | PASS |
| C18 | 1280x720 game-art C33 still green | playwright `scene art scale *` ×4 pass | `web/e2e/art.spec.ts:22` - `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` | PASS |
| C19 | AD-015 literal door 2, active; AD-007 superseded | grep proof exit 0 | `.specs/STATE.md:21` AD-015 row, re-read against door 2 word for word, `active` · `.specs/STATE.md:13` `superseded by AD-015` (refreshed: the fix diff touched `STATE.md`) | PASS |
| C20 | one `@media (max-width: 1199px)` in `web/src` | grep proof exit 0 | `web/src/app/globals.css:344` - `@media (max-width: 1199px) {`; `rg -n '@media' web/src` returns only this line (refreshed after `fc4dc84`) | PASS |
| C21 | menu open: `Tab` and `a` on a nav link keep expanded=true, data-open=true | vitest `other keys keep menu open` pass | `web/src/components/Tabs.test.tsx:97` `keyboard("{Tab}")` -> `:98-99` `toHaveAttribute("aria-expanded","true")`, `("data-open","true")` · `:100` `keyboard("a")` -> `:101-102` same two asserts; focus on SKILLS link at `:96` | PASS |
| C22 | 360 onboarding 409 `NOME JÁ EM USO` and 500 `erro de teste`: message visible, inside [0, innerWidth], no h-scroll | playwright `C22 onboarding name taken`, `C22 onboarding error` pass | `web/e2e/responsive.spec.ts:298` `fitsWith(page, page.locator(".field-error", { hasText: text }))` over the table at `:284-287` · `fitsWith` `:276` `toBeVisible()`, `:278` `b.x >= 0`, `:279` `b.x + b.width <= PHONE_S.width`, `:281` `scrollWidth <= innerWidth` | PASS |
| C23 | 360 `role="alert"` of MUNDO, DEPLOY, SERVER visible, inside width, no h-scroll | playwright `C23 mundo alert`, `C23 deploy alert`, `C23 server alert` pass | `web/e2e/responsive.spec.ts:307`, `:315`, `:322` - `fitsWith(page, page.locator(scene(...)).getByRole("alert"))` (asserts at `:276-281`); 500s routed at `:304`, `:312`; GPU tap at `:321` | PASS |
| C24 | 360 populated DEPLOY, BUG FIGHT, SKILLS, AVATAR, OFFICE, SERVER: no h-scroll, controls inside and >= 24x24, scene not clipped | playwright `C24 360 /deploy`, `/bug-fight`, `/skills`, `/avatar`, `/office`, `/server` pass | `web/e2e/responsive.spec.ts:382` `scrollWidth <= innerWidth` · `:384` `boxes.length > 0` · `:385` `outside(boxes, 360) toEqual([])` · `:387` `small toEqual([])` · `:389` `scrollHeight <= clientHeight`; populated preconditions asserted at `:331`, `:338`, `:345`, `:356`, `:364`, `:371` | PASS |

## Coverage

These rows were verified at d6aa8f0: menu keys, keydown dispatch, onboarding errors, scene alerts, populated scenes, and screens outside the frame (re-checked because `fc4dc84` touched their CSS). Every other row is carried from a3b5e9f, because the fix changed no product component, route, `TABS`, `Hud.tsx` or background rule.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| menu keys (3) - verified at d6aa8f0 | plan AC 5 + `web/src/components/Tabs.tsx:27` `if (e.key !== "Escape" \|\| !open) return;` | `Escape` closes + focus C5 · `Tab` keeps open C21 · printable `a` keeps open C21; F1 now killed | - |
| keydown dispatch in `onKeyDown` (2 observable rows) - verified at d6aa8f0 | `Tabs.tsx:27` | Escape while open C5 · non-Escape while open C21 (round 1 gap closed) | - |
| onboarding errors at 360 (2) - verified at d6aa8f0 | plan `Observable` "erro de nome (`field-error`) fica no painel" + `web/src/components/Onboarding.tsx:66` (name taken span) and `:87` (the one `p.field-error` that every other error message renders into) | `NOME JÁ EM USO` (`:66`) C22 · `:87` message C22 (500) | - |
| scene alerts at 360 (3) - verified at d6aa8f0 | `rg 'role="alert"' web/src` in scene components: `WorldScene.tsx:68`, `DeployScene.tsx:155`, `ServerScene.tsx:141` (the fourth hit, `LoginScreen.tsx:12`, is outside the scenes) | MUNDO C23 · DEPLOY C23 · SERVER C23 | - |
| populated scenes at 360 (7) - verified at d6aa8f0 | plan `Observable` "cada cena já tem o seu [empty state]; AC 7-10 valem para ele como para o cheio" + the scene code: which scenes render different controls or text once player data exists. TÍTULO is static. MUNDO always lists the 6 catalog regions, and only `aria-current` and the lock state move. The other 7 have a filled state | DEPLOY C24 · BUG FIGHT C24 · SKILLS C24 · AVATAR C24 · OFFICE C24 · SERVER C24 | LOJA filled state: `web/src/components/ShopScene.tsx:45-48` owned/equipped statuses (`EQUIPADO`, `NO INVENTÁRIO`, `NO GUARDA-ROUPA`), `:75` `possui: N`, and `:179-182` the `REMOVER EQUIPAMENTO` button, which exists only once equipped gear is selected. No proof lays it out at 360, and C9/C10 never measure that button. C24 `/avatar` buys CAFÉ in LOJA (`responsive.spec.ts:351-354`) but asserts layout only after `goto("/avatar")`. An ad-hoc probe at d6aa8f0 (360x740, café bought and selected) measured scrollWidth 360, 16 controls and 0 outside or under 24px, so the product fits today and the proof is what is missing |
| screens outside the ready frame (4) - verified at d6aa8f0 | `web/src/components/GameShell.tsx:71-90` (unchanged) | login · onboarding · server down · loading, C15 ×4, green after `fc4dc84` | - |
| menu label by route (10) - carried from a3b5e9f | `TABS` `Tabs.tsx:7-17` + fallback `:42` | table-driven C6 (`Tabs.test.tsx:105-116`) | - |
| scenes (9) - carried from a3b5e9f | `web/src/app/(game)/` = `TABS` = `SCENES` | C8 (360, 390), C9, C10, C11, C16 each over all 9 | - |
| HUD cards (6) - carried from a3b5e9f | `Hud.tsx:25,34,41,48,55,62` | C12 | - |
| scene backgrounds (4) - carried from a3b5e9f | `globals.css:105,164,286,308` | C17 at 360, C18 at 1280 | - |
| viewports (3) - carried from a3b5e9f | checks table | 360: C8 C9 C10 C12 C14 C15 C17 C22 C23 C24 · 390: C7 C8 C11 C13 · 1280: C16 C18 | - |
| Landing doors (3) - carried from a3b5e9f | plan `Landing` | door 1 C20 (+C8, C16) · door 2 C19 · door 3 C1, C7 | - |

## Test policy rows

Verified at d6aa8f0. Both rows that classify a file the fix touched were re-judged: `Tabs.tsx`, whose tests changed, and `globals.css`, whose CSS changed.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` (open state, keydown guard, label table) | boundary C7 · own layer C1-C6, C21 | yes - every row now has an asserted own-layer case: 4 transitions (C2, C3, C4, C5), both observable keydown rows (Escape C5, non-Escape C21) and 10 label rows (C6). F1 is killed. The `\|\| !open` conjunct (Escape while closed) has no case, but it has no observable outcome in the browser: when closed below 1200px the only focusable element in `.tabs-bar` is MENU itself, and at 1200px and up MENU is `display: none` (C16), so `focus()` is a no-op. That makes it an equivalent row, not a missing one |
| Decides, not reached across a boundary | `web/src/app/globals.css` media block (<=1199px / >=1200px) | <=1199: C8-C15, C17, C22-C24 · >=1200: C16; bound C20 | yes - `fc4dc84` removed an inert rule. C15, C20 and the full e2e set are green at d6aa8f0 |
| Entry point that decides nothing | none in the diff | - | n/a |
| Instrumentation, pass-throughs | none in the diff | - | n/a |

## Faults injected

Verified at d6aa8f0.

- **Setup.** Every fault ran in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` as an APFS clone (`cp -c -R`). For each CSS fault, the `:3100` PID (found with `lsof`) was killed, the worktree `web/` was built with `API_URL=http://localhost:8180 npx next build`, and `next start --port 3100` was started from it. The served CSS was confirmed to carry the mutation.
- **Cleanup.** The worktree server was killed and the real `web/` was rebuilt and restarted on `:3100`. It answers 200 and its cwd is the real `web/`. The served CSS was confirmed clean, and the full e2e set gave 79/79 again. The worktree was removed with `--force`.
- **Real tree.** `git status --porcelain` of the real tree was identical before and after: the 14 pre-existing untracked entries.
- **Untouched.** The user's `:3000`, `:8080` and `:9180` servers were never touched.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1 (re-injected) key filter dropped: `if (e.key !== "Escape" \|\| !open)` -> `if (!open)` | `web/src/components/Tabs.tsx:27` | yes - `other keys keep menu open` failed (1 failed, `escape closes menu` passed) |
| F6 onboarding and scene error line gets a fixed width: `.field-error { ...; display: block; width: 420px; }` | `web/src/app/globals.css:87` | yes - `C22 onboarding name taken` and `C22 onboarding error` failed (`b.x` -30, expected >= 0). `C23 mundo alert` (right edge 444 > 360) and `C23 deploy alert` (460 > 360) also failed. `C23 server alert` and `C15 onboarding` passed, as expected for elements without `.field-error` |
| F7 server notice gets a fixed width: `.server-notice { ...; width: 420px; ... }` | `web/src/app/globals.css:341` | yes - `C23 server alert` failed (right edge 444 > 360). `C24 360 /server` and `C9 360 /server` passed (no notice rendered) |
| F8 running deploy's booster button stops wrapping: `.deploy-boost { align-self: flex-start; white-space: nowrap; }` | `web/src/app/globals.css:258` | yes - `C24 360 /deploy` failed, with `outside` = `["SEM ACELERADORES · veja a Loja"]`. `C8`/`C9`/`C10 360 /deploy` passed on the empty scene, which shows C24 carries a surface the empty-state proofs cannot see |

Four faults were injected, within the cap of five. Each new assertion surface failed at least once: C21 (F1), C22 (F6), C23 mundo and deploy (F6), C23 server (F7), C24 (F8).

Before building, candidate faults were pre-screened by injecting a stylesheet into the page. One candidate, `.deploy-run { flex-wrap: nowrap; gap: 0 }` (neutralising `globals.css:373`), was not pursued, because an ad-hoc probe at 360 found it equivalent for fit. It fits in both the running stage and the ready stage (`PRONTO PARA COLETAR` + `CONCLUÍDO`, reached with `page.clock.fastForward`), with scrollWidth 360 either way. The override only changes spacing. That is a note, not a surviving mutant: no check claims the wrap.

## Gate

At d6aa8f0:

- `cd web && npx playwright test e2e/responsive.spec.ts e2e/art.spec.ts` gave 79 passed, 0 failed. It ran before the faults and again after the real-tree rebuild.
- `npx vitest run` (the full web suite) gave 289 passed, 0 failed.
- The C19 and C20 grep proofs exited 0.

Ranked gaps:

1. LOJA's filled state at phone width is unproven. The plan's `Observable` makes AC 7-10 hold for the full state of every scene. The fix covered 6 of the 7 scenes that have one, and left out LOJA (`ShopScene.tsx:45-48`, `:75`, `:179-182`). LOJA is the only scene whose filled state adds a control, `REMOVER EQUIPAMENTO`, that no layout proof has ever measured. It fits today (ad-hoc probe: 0 offending controls), so the fix is one more row in C24's `populated` table. That row can reuse the café purchase the `/avatar` row already makes, and assert at `/loja` with the café selected.

Round 1 gaps, re-judged:

- F1 is killed by C21.
- The unmet `Test policy` row is now met.
- The onboarding and scene error states at 360 are proven by C22 and C23, and both surfaces were made to fail.
- Populated scenes are proven by C24, except LOJA (gap 1 above).

Notes on the checks (these do not fail the feature):

- C22 precision: the plan says the name error "fica no painel", but C22 asserts the message against the viewport (`responsive.spec.ts:278-279`), not against `.onboarding`. At 360 the panel is nearly as wide as the viewport, so the two rarely diverge. Still, a message overflowing the panel by less than the gutter would pass.
- `LoginScreen.tsx:12` renders a `role="alert"` (`/login?error=github|state`) that no proof lays out at 360. The plan names no login error state, so this is not a member of any set; noted for completeness.
- These round 1 notes are carried from a3b5e9f and still hold:
  - C13 compares the art to `.frame`, not the viewport, so it only means something alongside C8.
  - C11 fits `/` and `/office` in 760px regardless of the media block.
  - C19's grep checks only `max-width: 1199px` inside the AD-015 row; the row was re-read and it matches.
  - C15 login, onboarding and server down were already satisfied by the desktop CSS because `.center-screen` is a flex container. The override `fc4dc84` removed was inert, and C15 stays green without it.
- `Swept` "authorization: existing" still holds: `GameShell.tsx:71-76` is unchanged by the fix.
