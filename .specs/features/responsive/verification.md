# Responsive verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 5cdbe61..2f378b0
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 3 is scoped by the fix diff `d6aa8f0..2f378b0` and by every round 2 verdict that was not PASS. Only one round 2 verdict was not PASS: the LOJA member of "populated scenes", which was unproven.

The fix diff is one product-adjacent commit, `963c07e`, which touches only `web/e2e/responsive.spec.ts`. `2f378b0` touches only `.specs`. No product component, CSS rule, route or `TABS` entry changed since `fc4dc84`.

`963c07e` does three things:

- It adds `C25 360 /loja`.
- It adds `C26 onboarding name taken` and `C26 onboarding error`.
- It moves the bodies of C22 and C24 into two shared helpers, `onboardingError` and `fitsPopulated`.

The helper refactor was read line by line against `d6aa8f0`:

- `onboardingError` (`responsive.spec.ts:288-298`) is C22's old setup, verbatim. It returns the same `.field-error` locator filtered by `hasText`. C22 still calls the unchanged `fitsWith` (`:275-282`) on it.
- `fitsPopulated` (`:391-401`) holds C24's six old assertions, verbatim and in the same order. C24 still calls `newDev`, `openScene` and `p.fill` before it.

So the refactor left the C22 and C24 assertions unchanged. F8 was re-injected through the refactored helper and killed.

Every proof from C1 to C26 was re-run in full at `2f378b0`. Each section below says whether it was verified at `2f378b0` or carried from an earlier round.

## Binding sources

Carried from a3b5e9f, where round 2 carried it. The plan marks no source as binding. The fix did not touch the interface. Step 1 is a `ui` step and does not run under `standard`.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| none marked binding (conversation, `globals.css`, STATE AD-007, game-art C33) | n/a | none | - |

## Checks

Verified at 2f378b0. Before the run, the CSS served on `:3100` was checked against HEAD: `.login-panel,.onboarding{...;width:460px;...}` and exactly one `@media (max-width:1199px)`.

The proofs were run as follows:

- **Unit.** `cd web && npx vitest run src/components/Tabs.test.tsx --reporter=verbose` gave 18 passed. Each name was listed individually: `menu starts closed`, `menu opens`, `link closes menu`, `button closes menu`, `escape closes menu`, `other keys keep menu open`, the 10 `menu label <route>` cases, and the 2 older non-menu tests.
- **E2e.** `cd web && npx playwright test e2e/responsive.spec.ts e2e/art.spec.ts --reporter=list` gave 82 passed: 78 responsive and 4 art. Each title was listed, including:
  - `C25 360 /loja` (`:414`)
  - `C26 onboarding name taken` and `C26 onboarding error` (`:306`)
  - `C22 onboarding name taken` and `C22 onboarding error` (`:301`)
  - the six `C24 360 <route>` tests (`:404`)
  - `scene art scale .world-map|.server|.office-room|.battle`
- **Grep proofs.** C19 and C20 both exited 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | MENU button type=button, aria-expanded=false, aria-controls=cenas-nav; nav id=cenas-nav data-open=false | vitest `menu starts closed` pass | `web/src/components/Tabs.test.tsx:50-54` - `toHaveAttribute("type","button")`, `("aria-expanded","false")`, `("aria-controls","cenas-nav")`, nav `("id","cenas-nav")`, `("data-open","false")` (file untouched by the fix) | PASS |
| C2 | click closed MENU -> expanded=true, data-open=true | vitest `menu opens` pass | `web/src/components/Tabs.test.tsx:60-61` - `("aria-expanded","true")`, `("data-open","true")` | PASS |
| C3 | click link while open -> closed | vitest `link closes menu` pass | `web/src/components/Tabs.test.tsx:70-71` - `("aria-expanded","false")`, `("data-open","false")` | PASS |
| C4 | click open MENU -> closed | vitest `button closes menu` pass | `web/src/components/Tabs.test.tsx:78-79` - `("aria-expanded","false")`, `("data-open","false")` | PASS |
| C5 | Escape on a nav link -> closed, focus on MENU | vitest `escape closes menu` pass | `web/src/components/Tabs.test.tsx:87-89` - `("aria-expanded","false")`, `("data-open","false")`, `expect(menu()).toHaveFocus()` | PASS |
| C6 | label `MENU · <label>` for 9 routes, `MENU` for `/login` | vitest `menu label` ×10 pass | `web/src/components/Tabs.test.tsx:120` - `toHaveTextContent(new RegExp(`^${label}$`))` over the table at `:105-116` (10 rows) | PASS |
| C7 | 390x844 menu flow to DEPLOY | playwright `C7 menu on phone` pass | `web/e2e/responsive.spec.ts:64` `toBeHidden()` ×9 · `:65-66` `toHaveText("MENU · TÍTULO")`, expanded false · `:72` names `toEqual` SCENES labels · `:75` `toHaveURL(/\/deploy$/)` · `:78-81` hidden, `MENU · DEPLOY`, false, `aria-current` `page` (lines above `:284` unchanged by the fix) | PASS |
| C8 | 360 and 390, 9 scenes, scrollWidth <= innerWidth | playwright `C8 360 *` ×9, `C8 390 *` ×9 pass | `web/e2e/responsive.spec.ts:89` and `:134` - `expect(scrollWidth).toBeLessThanOrEqual(innerWidth)` | PASS |
| C9 | 360, controls within [0, innerWidth] | playwright `C9 360 *` ×9 pass | `web/e2e/responsive.spec.ts:141-142` - `boxes.length > 0`, `outside(boxes, 360) toEqual([])` (`outside` at `:43-45`) | PASS |
| C10 | 360, controls >= 24x24 except `.title-art a`, + open menu | playwright `C10 360 *` ×9 + `C10 360 menu open` pass | `web/e2e/responsive.spec.ts:149-150` `small toEqual([])` · `:158-160` 9 links, `small toEqual([])` | PASS |
| C11 | 390, scene not clipped, last button reachable | playwright `C11 390 *` ×9 pass | `web/e2e/responsive.spec.ts:97` `scrollHeight <= clientHeight` · `:101-102` box inside 0..844 | PASS |
| C12 | 360, 6 hud cards within width, SAIR visible | playwright `C12 hud` pass | `web/e2e/responsive.spec.ts:166` `toHaveCount(6)` · `:170-171` bounds · `:173` SAIR `toBeVisible()` | PASS |
| C13 | 390, key art = frame width ±1, ratio 0.8, hotspots inside | playwright `C13 title` pass | `web/e2e/responsive.spec.ts:113-114` width and ratio · `:116-121` 6 spots inside art | PASS |
| C14 | 360, 6 markers inside map, no chip visible | playwright `C14 world` pass | `web/e2e/responsive.spec.ts:181-187` count 6 + four edges · `:189` each `.node-chip` `toBeHidden()` | PASS |
| C15 | 360, login / onboarding / server down / loading fit | playwright `C15 login`, `C15 onboarding`, `C15 server down`, `C15 loading` pass | `web/e2e/responsive.spec.ts:194-197` (`fitsPhone`) - `scrollWidth <= innerWidth`, `boxes.length > 0`, `outside(...) toEqual([])`; states reached at `:202`, `:212`, `:219`, `:226` | PASS |
| C16 | 1280, `.page` 1200, scene 760, 9 links one row, MENU hidden | playwright `C16 1280 *` ×9 pass | `web/e2e/responsive.spec.ts:251` `toBe(1200)` · `:252` `toBe(760)` · `:260` `ys.size toBe(1)` · `:261` MENU `toBeHidden()` | PASS |
| C17 | 360, 4 backgrounds 1280px 720px + pixelated | playwright `C17 backgrounds` pass | `web/e2e/responsive.spec.ts:239` - `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` | PASS |
| C18 | 1280x720 game-art C33 still green | playwright `scene art scale *` ×4 pass | `web/e2e/art.spec.ts:22` - `toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" })` | PASS |
| C19 | AD-015 literal door 2, active; AD-007 superseded | grep proof exit 0 | `.specs/STATE.md:21` AD-015 row with `max-width: 1199px`, `active` · `.specs/STATE.md:13` `superseded by AD-015` (lines re-read at HEAD; the fix diff touched `STATE.md`) | PASS |
| C20 | one `@media (max-width: 1199px)` in `web/src` | grep proof exit 0 | `web/src/app/globals.css:344` - `@media (max-width: 1199px) {`; `grep -n '@media' src/app/globals.css` returns only this line | PASS |
| C21 | menu open: `Tab` and `a` on a nav link keep expanded=true, data-open=true | vitest `other keys keep menu open` pass | `web/src/components/Tabs.test.tsx:97` `keyboard("{Tab}")` -> `:98-99` `toHaveAttribute("aria-expanded","true")`, `("data-open","true")` · `:100` `keyboard("a")` -> `:101-102` same two asserts | PASS |
| C22 | 360 onboarding 409 `NOME JÁ EM USO` and 500 `erro de teste`: message visible, inside [0, innerWidth], no h-scroll | playwright `C22 onboarding name taken`, `C22 onboarding error` pass | `web/e2e/responsive.spec.ts:302` `fitsWith(page, await onboardingError(page, status, body, text))` over the table at `:284-287`. The helper returns `page.locator(".field-error", { hasText: text })` at `:297`. `fitsWith` asserts `:276` `toBeVisible()`, `:278` `b.x >= 0`, `:279` `b.x + b.width <= PHONE_S.width`, and `:281` `scrollWidth <= innerWidth`. Refreshed: the call moved from `:298`, and the asserts are unchanged | PASS |
| C23 | 360 `role="alert"` of MUNDO, DEPLOY, SERVER visible, inside width, no h-scroll | playwright `C23 mundo alert`, `C23 deploy alert`, `C23 server alert` pass | `web/e2e/responsive.spec.ts:323`, `:331`, `:338` - `fitsWith(page, page.locator(scene(...)).getByRole("alert"))` (asserts at `:276-281`); 500s routed at `:320`, `:328`; GPU tap at `:337` (refreshed, moved +16) | PASS |
| C24 | 360 populated DEPLOY, BUG FIGHT, SKILLS, AVATAR, OFFICE, SERVER: no h-scroll, controls inside and >= 24x24, scene not clipped | playwright `C24 360 /deploy`, `/bug-fight`, `/skills`, `/avatar`, `/office`, `/server` pass | `web/e2e/responsive.spec.ts:409` calls `fitsPopulated(page, s)` after `p.fill`. The helper asserts `:393` `scrollWidth <= innerWidth`, `:395` `boxes.length > 0`, `:396` `outside(boxes, 360) toEqual([])`, `:398` `small toEqual([])` and `:400` `scrollHeight <= clientHeight`. Populated preconditions are asserted at `:347`, `:354`, `:361`, `:372`, `:380` and `:387`. Refreshed: the asserts moved from `:382-389` into the helper, unchanged | PASS |
| C25 | 360 LOJA with `CAFÉ EXPRESSO` bought, equipped and selected (`REMOVER EQUIPAMENTO` shown): same as C24 | playwright `C25 360 /loja` pass | `web/e2e/responsive.spec.ts:421` `expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO")` · `:422` `expect(detail.getByRole("button", { name: "REMOVER EQUIPAMENTO" })).toBeVisible()` · `:423` `fitsPopulated(page, s)`, which asserts `:393`, `:396`, `:398` and `:400` as in C24. `s = SCENES[6]` (`:415`) is `/loja`, `LOJA` (`:17`) | PASS |
| C26 | 360, both C22 cases: error box entirely inside the `.onboarding` panel box | playwright `C26 onboarding name taken`, `C26 onboarding error` pass | `web/e2e/responsive.spec.ts:308` `toBeVisible()` · `:310` `panel = page.locator(".onboarding").boundingBox()` · `:311` `b.x >= panel.x` · `:312` `b.y >= panel.y` · `:313` `b.x + b.width <= panel.x + panel.width` · `:314` `b.y + b.height <= panel.y + panel.height` | PASS |

## Coverage

Four rows were verified at 2f378b0:

- **Populated scenes.** This row was the round 2 gap.
- **Onboarding errors inside the panel.** This row is new.
- **Onboarding errors at 360.** Its proof file changed.
- **Viewports.** Its members gained C25 and C26.

Every other row is carried from d6aa8f0 or from a3b5e9f, as marked. The fix changed no product component, route, `TABS`, `Hud.tsx` or CSS rule, so no set's authority moved.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| populated scenes at 360 (7) - verified at 2f378b0 | plan `Observable` "cada cena já tem o seu [empty state]; AC 7-10 valem para ele como para o cheio" + the scene code. TÍTULO is static. MUNDO always lists the 6 catalog regions, and only `aria-current` and the lock state move. The other 7 have a filled state. For LOJA, the controls and text that player data adds are: `web/src/components/ShopScene.tsx:45-48` (statuses), `:75` (`possui: N`), and `:179-184`, the `REMOVER EQUIPAMENTO` button, which renders only when the selected gear is equipped. That button is the only control the filled state adds | DEPLOY C24 · BUG FIGHT C24 · SKILLS C24 · AVATAR C24 · OFFICE C24 · SERVER C24 · LOJA C25. C25 measures `REMOVER EQUIPAMENTO` among the controls: F9 made it fail on exactly that name. No 8th member was found | - |
| onboarding errors inside the panel (2) - verified at 2f378b0 | plan `Observable` "erro de nome (`field-error`) fica no painel" + `web/src/components/Onboarding.tsx:66` (the name-taken `span.field-error`, inside the `form.onboarding` at `:53`) and `:87` (the one `p.field-error` that every other error message renders into, same form) | `NOME JÁ EM USO` (`:66`) C26 · `:87` message C26 (500). F10 kills both | - |
| onboarding errors at 360 (2) - verified at 2f378b0 | `Onboarding.tsx:66`, `:87` (unchanged) | `NOME JÁ EM USO` C22 · `:87` message C22 (500); the setup was refactored into `onboardingError` and the asserts are unchanged | - |
| viewports (3) - verified at 2f378b0 | checks table | 360: C8 C9 C10 C12 C14 C15 C17 C22 C23 C24 C25 C26 · 390: C7 C8 C11 C13 · 1280: C16 C18 | - |
| menu keys (3) - carried from d6aa8f0 | plan AC 5 + `web/src/components/Tabs.tsx:27` | `Escape` closes + focus C5 · `Tab` keeps open C21 · printable `a` keeps open C21 | - |
| keydown dispatch in `onKeyDown` (2 observable rows) - carried from d6aa8f0 | `Tabs.tsx:27` | Escape while open C5 · non-Escape while open C21 | - |
| scene alerts at 360 (3) - carried from d6aa8f0 | `role="alert"` in `WorldScene.tsx:68`, `DeployScene.tsx:155`, `ServerScene.tsx:141` | MUNDO C23 · DEPLOY C23 · SERVER C23 | - |
| screens outside the ready frame (4) - carried from d6aa8f0 | `web/src/components/GameShell.tsx:71-90` (unchanged) | login · onboarding · server down · loading, C15 ×4 | - |
| menu label by route (10) - carried from a3b5e9f | `TABS` `Tabs.tsx:7-17` + fallback `:42` | table-driven C6 (`Tabs.test.tsx:105-116`) | - |
| scenes (9) - carried from a3b5e9f | `web/src/app/(game)/` = `TABS` = `SCENES` | C8 (360, 390), C9, C10, C11, C16 each over all 9 | - |
| HUD cards (6) - carried from a3b5e9f | `Hud.tsx:25,34,41,48,55,62` | C12 | - |
| scene backgrounds (4) - carried from a3b5e9f | `globals.css:105,164,286,308` | C17 at 360, C18 at 1280 | - |
| Landing doors (3) - carried from a3b5e9f | plan `Landing` | door 1 C20 (+C8, C16) · door 2 C19 · door 3 C1, C7 | - |

## Test policy rows

Carried from d6aa8f0. Round 2 left no unmet row. The fix touched only a test file, `web/e2e/responsive.spec.ts`, which no row classifies. The two classified product files, `Tabs.tsx` and `globals.css`, are unchanged since d6aa8f0. The `globals.css` row's boundary proof set now also includes C25 and C26, and both are green and fault-killed.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `web/src/components/Tabs.tsx` (open state, keydown guard, label table) | boundary C7 · own layer C1-C6, C21 | yes - 4 transitions (C2, C3, C4, C5), both observable keydown rows (C5, C21) and 10 label rows (C6), each asserted at its own layer. The `\|\| !open` conjunct (Escape while closed) is an equivalent row. While closed below 1200px, MENU is the only focusable element in `.tabs-bar`. At 1200px and up, MENU is `display: none` (C16). Either way, focusing it changes nothing observable (reasoning carried from d6aa8f0) |
| Decides, not reached across a boundary | `web/src/app/globals.css` media block (<=1199px / >=1200px) | <=1199: C8-C15, C17, C22-C26 · >=1200: C16; bound C20 | yes - all green at 2f378b0 |
| Entry point that decides nothing | none in the diff | - | n/a |
| Instrumentation, pass-throughs | none in the diff | - | n/a |

## Faults injected

Verified at 2f378b0.

- **Setup.** The faults ran in `git worktree add <scratchpad>/wt HEAD`, with `web/node_modules` copied in as an APFS clone (`cp -c -R`). For each build, the `:3100` PID (found with `lsof`) was killed, the worktree `web/` was built with `API_URL=http://localhost:8180 npx next build`, and `next start --port 3100` was started from it. The server's cwd was confirmed as the worktree. The mutated rules were confirmed in the built CSS: `.shop-detail .btn-dark{min-width:400px}`, `.deploy-boost{white-space:nowrap;...}` and `.onboarding .field-error{position:fixed;top:0;left:0}`.
- **Builds.** There were two builds. Build A held F8 and F9. Their selectors are disjoint, and each failure message names its own element. Build B held F10 alone, after `git checkout` of the worktree CSS.
- **Cleanup.**
  - The worktree server was killed, then the real `web/` was rebuilt with the same `API_URL` and restarted on `:3100`. It answers `/login` 200, its cwd is `/Users/luissoares/Repos/DevServer-1/web`, and its CSS has none of the mutations.
  - The full `responsive.spec.ts` + `art.spec.ts` run gave 82/82 again against it.
  - The worktree was removed with `--force`.
- **Real tree.** `git status --porcelain` was byte-identical before and after (`diff` empty): the 14 pre-existing untracked entries.
- **Untouched.** The user's `:3000`, `:8080` and `:9180` servers were never touched.

| Mutation | Location | Killed |
| --- | --- | --- |
| F9 LOJA unequip button forced wider than a phone: `.shop-detail .btn-dark { min-width: 400px; }` added inside the media block | `web/src/app/globals.css:345` (worktree) | yes - `C25 360 /loja` failed at `responsive.spec.ts:396` (`outside` = `["REMOVER EQUIPAMENTO"]`, via `fitsPopulated` from `:423`). `C8 360 /loja`, `C9 360 /loja`, `C10 360 /loja`, `C8 390 /loja`, `C11 390 /loja`, `C16 1280 /loja` and `C24 360 /avatar` (which buys the café in LOJA but asserts at `/avatar`) all passed, so C25 carries a surface the empty-scene proofs cannot see |
| F8 (re-injected through the refactored `fitsPopulated`) running deploy's booster stops wrapping: `.deploy-boost { align-self: flex-start; white-space: nowrap; }` | `web/src/app/globals.css:258` (worktree) | yes - `C24 360 /deploy` failed with `outside` = `["SEM ACELERADORES · veja a Loja"]`, the same kill as round 2, now through the shared helper |
| F10 onboarding error pulled out of its panel but kept on screen: `.onboarding .field-error { position: fixed; top: 0; left: 0; }` added inside the media block | `web/src/app/globals.css:345` (worktree) | yes - `C26 onboarding name taken` and `C26 onboarding error` both failed at `responsive.spec.ts:311` (`b.x` 0, expected >= `panel.x` 16). `C22 onboarding name taken`, `C22 onboarding error`, `C15 onboarding` and `C23 mundo alert` passed, so C26 closes the round 2 precision gap that C22 alone left open |

Three faults were injected, within the cap of five. Each assertion surface the fix created or touched failed once: C25 (F9), C26 (F10), and the refactored C24 helper (F8). C22's assertions (`fitsWith`) were not changed by the refactor. Its round 2 kill (F6) exercised the same `fitsWith` lines, and F10 shows the refactored `onboardingError` setup still reaches the error element: C22 found it and passed, and C26 found it and failed.

## Gate

At 2f378b0:

- `cd web && npx playwright test e2e/responsive.spec.ts e2e/art.spec.ts` gave 82 passed, 0 failed. It ran before the faults and again after the real-tree rebuild.
- `cd web && npx vitest run` (the full web suite, 18 files) gave 289 passed, 0 failed.
- The C19 and C20 grep proofs exited 0.

Round 2 gap, re-judged:

1. LOJA's populated state at 360 is now proven by C25. The test reaches the state `REMOVER EQUIPAMENTO` needs and asserts it at `:421-422`. It then lays the scene out through the same helper as C24. F9 shows it catches a regression on the one control only that state adds, which the empty-scene proofs miss.

Notes on the checks (these do not fail the feature):

- **LOJA text variants.** C25 fixes one filled state, café equipped. Several LOJA texts change with player data without adding a control: the gear status `NO INVENTÁRIO`, the skin statuses `NO GUARDA-ROUPA` and `EQUIPADA`, and potions `possui: N`. They render inside the same card buttons that C9, C10 and C25 already measure. No check lays out the longest of them. An ad-hoc probe at 2f378b0 ran in a scratch worktree against the real `:3100` build: at 360x740 it swapped every status to its longest variant and `possui` to `99`. It measured scrollWidth 360, 15 controls, 0 outside or under 24px, and no clipping. So the product fits and this is noted, not a gap: the set is populated *scenes*, and the LOJA member is proven.
- **C25 addressing.** C25 picks LOJA by index, `SCENES[6]` (`:415`). The other populated tests look the scene up by route (`:405`). It is correct today, but reordering `SCENES` would point it at another scene. This is test fragility, not a proof gap.
- **Login alert.** `LoginScreen.tsx:12` renders a `role="alert"` for `/login?error=github|state`, and no proof lays it out at 360. The plan names no login error state, so it is not a member of any set. Carried from d6aa8f0.
- **Carried notes.** These round 1 notes are carried from a3b5e9f and still hold:
  - C13 compares the art to `.frame`, not to the viewport, so it only means something alongside C8.
  - C11 fits `/` and `/office` in 760px regardless of the media block.
  - C19's grep checks only `max-width: 1199px` inside the AD-015 row. The row was re-read and it matches.
- **Swept.** "authorization: existing" still holds: `GameShell.tsx:71-76` is unchanged.
