# Office keyart verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 1d37934..e56a828 (`3aa8eef^..HEAD`, branch `cursor/office-keyart-4cba`); round 2 scoped to 96d5f10..e56a828
**Round**: 2 - scoped (round 1 full at 96d5f10, FAIL)
**Verifier**: independent sub-agent (author != verifier)

37 of 37 checks are proven with located evidence at `e56a828`. Round 1 (at `96d5f10`) failed on C28's
light-pending half (surviving mutant W8) and on `ResolveLight` having no own-layer proof. The fix
commit `e56a828` touches only tests and `checks.md` (C37 added). W8 and two `ResolveLight` mutants are
now killed. See `## Round 2`.

## Binding sources

Not run: step 1 is `ui`-only and this feature was approved under `standard`. `web/public/office_keyart.png`
is marked binding in the plan; it was not compared against the checks, per the profile.

## Checks

All proofs were run by the Verifier at `96d5f10`. Api: one `go test -v` invocation per package
(`./internal/catalog` 3 tests, `./internal/office` 22 tests), every named test printed `--- PASS`.
Web: one `vitest run` over `OfficeScene.test.tsx` + `art.test.tsx` (12 named tests shown ✓), one
`playwright test e2e/office.spec.ts -g 'light tints the room|apply layout template'` (2 passed),
`npm run build` exit 0, art-check (`render.py` + `diff -r`) printed `art ok`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 4 categories + 45 furniture by value, 12 kept with glyph/color/description | `go test ./internal/catalog -run '^TestCatalog_ServesOffice$'` exit 0 | `api/internal/catalog/catalog_test.go:656-702` 45-row table of `{id, category, name, zone, price, comfort, bonus}`; `:752` `if got != furniture[i]`; `:756` kept glyph/color/description; `:764-771` categories `moveis\|MÓVEIS`...`mascotes\|MASCOTES` | PASS |
| C2 | lights and templates by value | `-run '^TestCatalog_ServesOfficeLightsAndTemplates$'` exit 0 | `catalog_test.go:813` `natural\|NATURAL\|0`...`neon\|NEON\|120`, `:818`; `:822-837` four templates `id\|name\|zone position furniture,...` compared by string | PASS |
| C3 | every template piece resolves (zone, cell < cells, furniture zone, no repeat, category) | `-run '^TestCatalog_OfficeReferencesResolve$'` exit 0 | `catalog_test.go:859` category not in catalog; `:869` `p.Position >= n`; `:873` zone mismatch; `:875` `seen[cell]` | PASS |
| C4 | 45 specs + 16x16 PNGs reproduced byte for byte | vitest `furniture icons per office.json` ✓; art-check `art ok` | `web/src/lib/art.test.tsx:141` over `officeCatalog.furniture` (45); `art.test.tsx:56-58` spec exists, png exists, `pngSize == [16,16]`; 45 json + 45 png counted | PASS |
| C5 | 5 filters in order, TODOS pressed, cards in catalog order with icon | vitest `category filters and cards` ✓ | `web/src/components/OfficeScene.test.tsx:62` `toEqual(["TODOS","MÓVEIS","DECORAÇÕES","TECNOLOGIAS","MASCOTES"])`; `:65` `toEqual(ALL)`; `:67` `src` `/art/icon/office-${id}.png` | PASS |
| C6 | each category filter lists its pieces, only it pressed | vitest `filter by category %s` x4 ✓ | `OfficeScene.test.tsx:80` `expect(cardIds()).toEqual(ids)`; `:82` `expect(pressed).toEqual([name])` | PASS |
| C7 | create 201 with `officeLight` natural; `/api/me` returns it | `-run '^TestCreatePlayer_OfficeLightDefault$'` exit 0 | `api/internal/office/keyart_test.go:70` 201; `:73` `got != "natural"`; `:77` GET `/api/me` natural | PASS |
| C8 | comfort 30 sets `quente` 200 and GET repeats; comfort 0 `natural` 200 | `-run '^TestLight_SetsAtComfort$'` exit 0 | `keyart_test.go:85` natural at 0; `:91` `quente` at 30; `:94` GET repeats `quente` | PASS |
| C9 | comfort 29 -> 409 `light_locked` + message, nothing changes | `-run '^TestLight_Locked$'` exit 0 | `keyart_test.go:106` `f.status(rec, 409, "light_locked")`; `:107` message `falta conforto para essa luz`; `:110` `f.unchanged(before)` | PASS |
| C10 | `x` -> 422 `unknown_light`; `{` -> 422 `invalid_body` | `-run '^TestLight_Rejects$'` exit 0 | `keyart_test.go:117-118` | PASS |
| C11 | order `invalid_body` -> `unknown_light` -> `light_locked` | `-run '^TestLight_ValidationOrder$'` exit 0 | `keyart_test.go:125-127` at comfort 0: `{` invalid_body, `x` unknown_light, `neon` light_locked | PASS |
| C12 | removing the mesa keeps `quente` | `-run '^TestLight_KeptWhenComfortDrops$'` exit 0 | `keyart_test.go:137` remove response `OfficeLight != "quente"` fails | PASS |
| C13 | stored `sol` reads `natural` | `-run '^TestMe_OfficeLightOutsideCatalog$'` exit 0 | `keyart_test.go:144-145` | PASS |
| C14 | column NOT NULL default natural; pre-00016 player reads natural | `-run '^TestTables_OfficeLightColumn$'` exit 0 | `keyart_test.go:158` default `natural`; `:161` `23502`; `:183-198` migrate to 15, insert, migrate to 16, reads `natural` | PASS |
| C15 | `officeComfort` rows 0 / 8 / 16 / unknown 0 | `-run '^TestOfficeComfort$'` exit 0 | `api/internal/office/plan_test.go:32-35` table, `:37` `got != tc.want` | PASS |
| C16 | lighting panel order, pressed, locks with `conforto 70/120`, comfort 29 locks quente, `data-light` | vitest `lighting panel` ✓ | `OfficeScene.test.tsx:432-433` ids and names; `:434` quente pressed; `:439-442` NOITE/NEON disabled `conforto 70`/`conforto 120`; `:443` `data-light` quente; `:448-450` comfort 29 | PASS |
| C17 | click sends `{light:"quente"}`, passes player, `LUZ LUZ QUENTE`; 409 message; network message | vitest `change light` ✓ | `OfficeScene.test.tsx:465` body; `:466` `setPlayer(after)`; `:467` `LUZ LUZ QUENTE`; `:473` `data-light` quente; `:478-479` 409 and network texts | PASS |
| C18 | `::after` transparent at natural, 3 distinct non-transparent tints | playwright `light tints the room` passed | `web/e2e/office.spec.ts:59` `rgba(0, 0, 0, 0)`; `:74` not transparent; `:75` `new Set(tints).size` 3; `:77` back to transparent | PASS |
| C19 | basico 9729/9999 + 7 pieces; conforto 9619/9939 + 11 pieces | `-run '^TestTemplate_InstallsAndPays$'` exit 0 | `keyart_test.go:221` `9729`/`9999`; `:224` room; `:231` `9619`/`9939`; `:236` room | PASS |
| C20 | mesa present -> charges 210, installs 6; reapply unchanged | `-run '^TestTemplate_SkipsSamePiece$'` exit 0 | `keyart_test.go:247` `coins != 790`; `:251` room; `:255-256` reapply 200 + `f.unchanged` | PASS |
| C21 | planta or `sofa_velho` in piso 2 -> 409 `cell_occupied`, nothing changes | `-run '^TestTemplate_CellOccupied$'` exit 0 | `keyart_test.go:261`, `:267-268` | PASS |
| C22 | 269/270 coins, 59/60 gems boundaries | `-run '^TestTemplate_BalanceBoundary$'` exit 0 | `keyart_test.go:280-283` table (fields `gems, coins`; `balance(gems, coins)` at `office_test.go:51`); `:291-292` 409 + unchanged; `:295` 0 and 0 | PASS |
| C23 | `x` -> 422 `unknown_template`; `{` -> 422 `invalid_body` | `-run '^TestTemplate_Rejects$'` exit 0 | `keyart_test.go:306-307` | PASS |
| C24 | template validation order, 4 pairs | `-run '^TestTemplate_ValidationOrder$'` exit 0 | `keyart_test.go:316-319` | PASS |
| C25 | `planTemplate` 5 rows | `-run '^TestPlanTemplate$'` exit 0 | `plan_test.go:52` empty -> 2 installs, 60 coins 35 gems; `:57` same piece skipped; `:62` planta/sofa_velho -> `ErrCellOccupied`; `:68` gone piece -> `ErrUnknownFurniture` | PASS |
| C26 | 4 template cards: name, description, price text, icons, APLICAR | vitest `templates panel` ✓ | `OfficeScene.test.tsx:502` order; `:504-507` prices `270C`, `380C + 60G`, `220C + 395G`, `405C + 210G`; `:511-513` name, description, price; `:515-516` icons; `:517` APLICAR enabled | PASS |
| C27 | APLICAR BÁSICO sends body, passes player, toast; 409; no-body | vitest `apply template` ✓ | `OfficeScene.test.tsx:528` body; `:529` setPlayer; `:530` `LAYOUT BÁSICO APLICADO`; `:535-536` 409 message and `500 no body` -> connection text | PASS |
| C28 | while APLICAR **or a light** is pending, all APLICAR and light buttons disabled | vitest `pending disables layout and light` ✓ (verified at e56a828) | `web/src/components/OfficeScene.test.tsx:560-563` template held: disabled then enabled; `:567` holds `POST /api/me/office/light`; `:569` `click(light("quente"))`; `:570` every APLICAR + light `toBeDisabled()`; `:572` `toBeEnabled()` after release | PASS |
| C29 | both routes 401 `unauthenticated` without session | `-run '^TestOfficeRoutes_RequireSession$'` exit 0 | `api/internal/office/office_test.go:409-411` over `keyartRoutes` (`keyart_test.go:322-328`) | PASS |
| C30 | both routes 404 `player_not_found` | `-run '^TestKeyartRoutes_PlayerNotFound$'` exit 0 | `keyart_test.go:335` | PASS |
| C31 | renamed column/table -> 500 `internal` with `request_id` log naming the cause; nothing changes | `-run '^TestKeyartRoutes_LoadFailure$'` exit 0 | `keyart_test.go:348` 500 internal; `:359` log line for `request_id` contains cause; `:364-365` `office_light` for light POST and GET `/api/me`; `:368` `player_office`; `:370` unchanged | PASS |
| C32 | 3 new codes, exact envelope, status and message | `-run '^TestKeyart_ErrorCodes$'` exit 0 | `keyart_test.go:381-383` table; `:386` `len(body) != 1 \|\| len(body["error"]) != 2` plus code/message | PASS |
| C33 | concurrent basico at 270: both 200, coins 0, 7 pieces | `-run '^TestTemplate_ConcurrentSerialize$'` exit 0 | `keyart_test.go:407` both 200; `:412` coins 0; `:415` room. Without the row lock the second INSERT hits `PRIMARY KEY (player_id, zone, position)` (`api/migrations/00006_office.sql:8`) and answers 500, so the test depends on `FOR UPDATE` (`api/internal/player/player.go:454`) | PASS |
| C34 | web types compile under `next build` | `npm run build` exit 0 | `web/src/lib/types.ts:32` `officeLight`, `:177` `OfficeCategory`, `:195` `OfficeLight`, `:200` `OfficeTemplate` | PASS |
| C35 | browser: APLICAR BÁSICO -> HUD 9729 -> MESA EM L -> reload keeps | playwright `apply layout template` passed | `web/e2e/office.spec.ts:37` 9729; `:39` MESA EM L; `:42` after reload; `:44` 9729 after reload | PASS |
| C36 | profissional deploy bonus 16 in web stats and `player.Bonus` | api `-run '^TestTemplate_BonusThroughPlayerBonus$'` exit 0; vitest `template bonuses in stats` ✓ | `keyart_test.go:429` `player.Bonus(...,"deploy") != 16`; `OfficeScene.test.tsx:572` `-16%` | PASS |
| C37 | `ResolveLight` own layer: `neon`/`natural` kept; `sol` and empty -> `natural` | `go test ./internal/player -run '^TestResolveLight_Rows$'` exit 0 (verified at e56a828) | `api/internal/player/appearance_test.go:58-61` four rows; `:63` `got != tc.want` | PASS |

The web screen tests read `CATALOG.office` from `web/src/test/helpers.ts:145`, a hand copy. The
Verifier deep-compared it (`expect(OFFICE).toEqual(JSON.parse(api/catalog/office.json))`, a scratch
test, deleted after running) and it passed, so C5, C6, C16 and C26 assert the served catalog.

## Coverage

Recomputed from the plan's `Surface`, `Landing`, `Relations` and tables (authority for the sets
the code must satisfy) and from the code where the set is discovered. The catalog was recomputed
with a script over `api/catalog/office.json` against the plan's "Peças novas" and "Templates"
tables and `git show 1d37934:api/catalog/office.json`: 33 new pieces match every field, the 12
existing pieces are unchanged in every key, order equals C1, and template totals are 270C,
380C+60G, 220C+395G, 405C+210G.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `POST /api/me/office/light` statuses (7) | plan `Surface` | 200 C8 · 401 C29 · 404 C30 · 409 `light_locked` C9 · 422 `invalid_body` C10 · 422 `unknown_light` C10 · 500 C31 | - |
| `POST /api/me/office/template` statuses (9) | plan `Surface` | 200 C19, C20 · 401 C29 · 404 C30 · 409 `cell_occupied` C21 · 409 `not_enough_coins` C22 · 409 `not_enough_gems` C22 · 422 `invalid_body` C23 · 422 `unknown_template` C23 · 500 C31 | - |
| `GET /api/me` statuses changed (2 of 4) | plan `Surface`; 401/404 unchanged by the diff (`player.go` touches only scan/columns) | 200 C7, C13 · 500 C31 | - |
| `GET /api/catalog` new fields (4) | door 1 | `categories` C1 · `category` C1 · `lights` C2 · `templates` C2 | - |
| one-way doors (5) | plan `Landing` | 1 C1, C2 · 2 C7 · 3 C14 · 4 C8, C19 · 5 C32 | - |
| relation constraints (1) | plan `Relations` | one light per player, not null, default natural C14 | - |
| furniture (45) | plan tables + main catalog | C1 table over 45; icons C4 over 45 | - |
| categories (4) | plan | C1, C6 each | - |
| lights (4) + comfort boundary (2) | plan | each light C2, C16, C18; equal unlocks C8; below locks C9, C16 | - |
| templates (4) | plan | C2, C26 all four; basico/conforto C19; profissional C36 | - |
| template cell rows (5) | `planTemplate` switch (`api/internal/office/office.go:175-181`) + unknown piece `:171-173` | C25 all five; C19-C21 at the boundary | - |
| balance boundary (4) | AC 18 | C22 four subtests | - |
| light validation order (2 pairs) | AC 9 + assumption | C11 | - |
| template validation order (4 pairs) | AC 20 | C24 | - |
| new error codes (3) | door 5 | C32 | - |
| comfort sum rows (4) | `officeComfort` (`office.go:128-141`) | C15 | - |
| screen filters (5) | AC 4 | TODOS C5 · four categories C6 | - |
| screen light states (3) | AC 12 | pressed, enabled, locked C16 | - |
| screen toasts (2) / error paths (4) | AC 13, AC 22 | C17, C27 | - |
| template price shapes (2) | plan assumption `270C` / `380C + 60G` | C26 | - |
| pending triggers (2) - set named inside C28 | C28 claim, AC 23 | template pending C28 (`OfficeScene.test.tsx:560-563`) · light pending C28 (`:567-572`), recomputed at e56a828 | - |
| light rule rows (2) | `ResolveLight` (`api/internal/player/player.go:270-275`) | kept C37, C8 · fallback C37, C13 | - |

## Test policy rows

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `planTemplate`, `officeComfort` (`api/internal/office/office.go`); `ResolveLight` (`api/internal/player/player.go:270`, 2 rows: stored id kept / fallback to first light), not classified in checks.md | planTemplate: boundary C19-C22, own layer C25 (5 rows); officeComfort: boundary C8, C9, own layer C15 (4 rows); ResolveLight: boundary C13, C8, own layer C37 | yes at e56a828 - `ResolveLight` own layer C37 (`api/internal/player/appearance_test.go:55`), all 2 rows |
| Decides, not reached across a boundary | `web/src/components/OfficeScene.tsx` (category filter, light lock, pressed light, pending), `templatePrice` (`web/src/lib/office.ts:44`) | screen tests C5, C6, C16, C17, C26-C28 | yes at e56a828 - pending reached through both a template and a light request (C28 `OfficeScene.test.tsx:567-572`) |
| Entry point that decides nothing | `SetLight`, `ApplyTemplate` handlers | boundary: accepted C8, C19; each rejected C9-C11, C21-C24; each error path C29-C31 | yes |
| Instrumentation, pass-throughs | `catalog.Light`, `catalog.Template`, router lines, `httpx` error vars, `types.ts`, migration `00016` | covered by consumers C1-C3, C7-C14, C29, C32, C34 | yes |

## Faults injected

Api and screen mutants ran in a scratch `git worktree` at `96d5f10`. The CSS mutant ran in the real
tree, because Turbopack refuses a symlinked `node_modules` in a worktree ("Symlink [project]/node_modules
is invalid"). The brief allowed that, reverted with `git checkout -- web/src/app/globals.css`, and
`git status --porcelain` matched the baseline afterwards (only the untracked
`.claude/skills/pixel-assets/scripts/__pycache__/`). The count is above the skill's cap of five
because the brief asked for at least one fault per assertion surface.

| Mutation | Location | Killed |
| --- | --- | --- |
| M1 light comfort guard `<` -> `<=` | `api/internal/office/office.go:156` | yes - `TestLight_SetsAtComfort` (C8) |
| M2 same-piece skip -> `default:` (same piece counts as occupied) | `api/internal/office/office.go:179` | yes - `TestPlanTemplate` (C25), `TestTemplate_SkipsSamePiece` (C20) |
| M3 payment order coins/gems swapped | `api/internal/office/office.go:204` | yes - `TestTemplate_ValidationOrder` (C24) |
| M4 catalog `quente` comfort 30 -> 31 | `api/catalog/office.json` lights | yes - `TestCatalog_ServesOfficeLightsAndTemplates` (C2), `TestLight_SetsAtComfort` (C8) |
| M5 `ResolveLight` keeps an unknown non-empty id | `api/internal/player/player.go:271` | yes - `TestMe_OfficeLightOutsideCatalog` (C13) |
| M6 migration default `natural` -> `quente` | `api/migrations/00016_office_light.sql:3` | yes - `TestTables_OfficeLightColumn` (C14) |
| M7 `officeComfort` counts unknown ids as 1 | `api/internal/office/office.go:135-137` | yes - `TestOfficeComfort` (C15) |
| M8 template pays but installs nothing (`installs[:0]`) | `api/internal/office/office.go:209` | yes - `TestTemplate_InstallsAndPays` (C19) |
| M9 `docker` price 55 -> 50 gems | `api/catalog/office.json:57` | yes - `TestCatalog_ServesOffice` (C1) |
| M10 gamer `piso 12 tapete` -> `parede 12` | `api/catalog/office.json` templates | yes - `TestCatalog_OfficeReferencesResolve` (C3) |
| M11 `unknown_template` message changed | `api/internal/httpx/errors.go:75` | yes - `TestKeyart_ErrorCodes` (C32) |
| M12 one pixel of `office-docker` spec moved | `web/art/icon/office-docker.json` | yes - art-check `office-docker.png differ` (C4) |
| W1 `data-light` removed from the room | `web/src/components/OfficeScene.tsx:132` | yes - `lighting panel` (C16) |
| W2 filter by `f.zone` instead of `f.category` | `web/src/components/OfficeScene.tsx:32` | yes - `filter by category` x4 (C6) |
| W3 light lock `<` -> `<=` | `web/src/components/OfficeScene.tsx:192` | yes - `lighting panel` (C16) |
| W4 light buttons ignore `pending` | `web/src/components/OfficeScene.tsx:200` | yes - `pending disables layout and light` (C28) |
| W5 light toast drops `LUZ ` | `web/src/components/OfficeScene.tsx:67` | yes - `change light` (C17) |
| W6 template price joined with `+` instead of ` + ` | `web/src/lib/office.ts:53` | yes - `templates panel` (C26) |
| W7 template toast drops `APLICADO` | `web/src/components/OfficeScene.tsx:68` | yes - `apply template` (C27) |
| W8 `setLight` posts directly without `setPending` (light request never disables APLICAR or lights) | `web/src/components/OfficeScene.tsx:67` | yes (round 2, e56a828) - `pending disables layout and light` fails at `OfficeScene.test.tsx:570` (round-1 history in `## Round 2`) |
| CSS `noite` tint set equal to `quente` | `web/src/app/globals.css:519` | yes - playwright `light tints the room` (C18): `Expected: 3 Received: 2` at `e2e/office.spec.ts:75` |
| R1 (round 2) `ResolveLight` keeps any non-empty id (`ok \|\| id != ""`) | `api/internal/player/player.go:271` | yes - `TestResolveLight_Rows` (C37): `ResolveLight("sol") = "sol", want "natural"` |
| R2 (round 2) `ResolveLight` always returns the first light | `api/internal/player/player.go:272` | yes - `TestResolveLight_Rows` (C37): `ResolveLight("neon") = "natural", want "neon"` |

## Swept existing

- concurrency: "row lock via `player.WithLocked`, office C17 proves the lock itself". The lock is there (`api/internal/player/player.go:454` `FOR UPDATE`) and office C17 exists (`api/internal/office/office_test.go:452` `TestInstall_ConcurrentSerialize`). Holds.
- Observable "who may call it: existing - `auth.RequireSession`". Both routes are registered inside the session group (`api/internal/app/router.go:98-99`), and C29 proves it. Holds.
- Observable "empty state: existing, light and template panels appear with an empty room". Templates hold (C26 renders the default empty room). No test renders the light panel at comfort 0; it renders unconditionally, and the comfort-29 case of C16 reaches the same lock branch. Note only.

## Other observations (not verdict-bearing)

- C11 second pair (`unknown_light` before `light_locked`): an unknown light has no threshold, so only a contrived mutant (treat an unknown light as locked) can separate the order. The test does kill that mutant (`keyart_test.go:126` at comfort 0).
- `templatePrice` also has a gems-only shape and an unknown-piece skip (`web/src/lib/office.ts:48`) that the catalog never produces; the plan fixes only two shapes, so they are not counted as members.
- Lint: `eslint` over the touched web files exit 0.

## Gate

Round 2 at `e56a828`:

- `go test -count=1 -p 1 ./...` (api): 438 tests passed, 0 failed, 13 packages pass, exit 0
- `npx vitest run` (web): 27 files, 713 passed, 0 failed, exit 0

Round 1 at `96d5f10`:

- `go test -count=1 -p 1 ./...` (api, `devserver_test`): 437 tests passed, 0 failed, 13 packages `ok`, exit 0
- `npx vitest run` (web): 27 files, 713 passed, 0 failed, exit 0
- Named proofs: 25 api + 12 vitest + 2 playwright + `npm run build` + art-check, all green at `96d5f10`
- Full `make e2e` was not re-run. Known unrelated failures on main are listed in the brief (`responsive.spec.ts`).

## Round 2

Scope: the fix diff `96d5f10..e56a828` (3 files: `checks.md`, `api/internal/player/appearance_test.go`,
`web/src/components/OfficeScene.test.tsx`; no production code changed) plus every round-1 verdict that
was not PASS. Everything else is carried from `96d5f10`: no production file changed, and the full
suites re-ran green at `e56a828`.

| Round-1 gap | Fix | Re-verified at e56a828 |
| --- | --- | --- |
| C28 light-pending half unproven, W8 survived | `OfficeScene.test.tsx:564-572` holds `POST /api/me/office/light`, asserts disabled then enabled | proof ✓; W8 re-injected in a scratch worktree, killed (`:570`) |
| `ResolveLight` no own-layer proof | C37 `TestResolveLight_Rows` (`api/internal/player/appearance_test.go:55-66`), 4 cases over 2 rows | proof ✓; R1 and R2 killed |

- Sections verified at `e56a828`: C28 and C37 rows, Coverage rows "pending triggers" and "light rule rows", both Test policy rows judged unmet in round 1, the W8/R1/R2 fault rows, and the Gate.
- Carried from `96d5f10`: every other check row and fault row, and the rest of Coverage. Citations in files the fix did not touch are unchanged. `OfficeScene.test.tsx` lines before 564 did not move.
- Worktree discarded; `git status --porcelain` matched the baseline (only the untracked `__pycache__/` and this report).

## Ranked gaps (round 1, resolved in round 2)

1. C28 light-pending half unproven, mutant W8 survived. `web/src/components/OfficeScene.test.tsx:553-564` holds only `POST /api/me/office/template`. Fix: a case that holds `POST /api/me/office/light` pending and asserts every APLICAR and light button disabled, then enabled after the response.
2. Test policy "Decides, reached across a boundary": `ResolveLight` (`api/internal/player/player.go:270`) has no own-layer proof. Fix: a table test for stored id kept and unknown/empty id -> first catalog light, like `appearance_test.go:12`.
