# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Prove the 500 path with a handler that returns an error on a real route (e.g. rename the table), not only with a synthetic panic route.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/httpx` · harmful: 0
- features: foundation
- evidence: api/internal/httpx/errors.go:49 (api/httpx)
- last seen: 2026-09-23T18:09:49Z

### L-002 - When a check says where a message appears, assert its container and order (closest label, compareDocumentPosition), not just that the text exists.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/screens` · harmful: 0
- features: foundation
- evidence: web/src/components/Onboarding.tsx:66 (web/screens)
- last seen: 2026-09-23T18:09:49Z

### L-003 - A row-lock test must change the row inside the locked transaction and assert the waiter read the new value; merely blocking passes without FOR UPDATE because the final UPDATE also waits.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/locking` · harmful: 0
- features: foundation
- evidence: api/internal/world/world_test.go (C42 v1) (api/locking)
- last seen: 2026-09-23T18:09:49Z

### L-004 - A Landing door added during the build needs its check and Coverage row in the same commit; the doors row count must match the plan.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: foundation
- evidence: Landing door 12 (specs)
- last seen: 2026-09-23T18:09:49Z

### L-005 - Judge a suite by its exit code, not its summary line; vitest reports unhandled rejections as a failure even when every test passes.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `web/tests` · harmful: 0
- features: foundation
- evidence: web vitest exit 2 (round 3) (web/tests)
- last seen: 2026-09-23T18:09:49Z

### L-006 - Before claiming every screen branch is covered, grep each conditional in the component and name the test that asserts it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web/screens` · harmful: 0
- features: foundation
- evidence: web/src/components/Onboarding.tsx:75,82 (web/screens)
- last seen: 2026-09-23T18:09:49Z

### L-007 - Assert every field a Landing door fixes for a catalog entry (id, name, glyph), not only the ids.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `api/catalog` · harmful: 0
- features: deploy-pipelines
- evidence: api/internal/catalog/catalog.go:27 (api/catalog)
- last seen: 2026-09-23T19:27:55Z

### L-008 - Every JSON route owes its own invalid_body proof; door 12 is per route, not proven once for the api.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/httpx` · harmful: 0
- features: deploy-pipelines
- evidence: api/internal/deploy/deploy.go:83 (api/httpx)
- last seen: 2026-09-23T19:27:55Z

### L-009 - Threshold tables need cases exactly at each boundary (25/50/75%, remaining = 0), not only mid-band values.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/screens` · harmful: 0
- features: deploy-pipelines
- evidence: web/src/components/DeployScene.tsx:192 (web/screens)
- last seen: 2026-09-23T19:27:55Z

### L-010 - A sort or lookup with a fallback (unknown id sorts last) needs an own-layer test that exercises the fallback.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/ordering` · harmful: 0
- features: skills
- evidence: api/internal/catalog/catalog.go:184 (api/ordering)
- last seen: 2026-09-23T20:20:14Z

### L-011 - When a feature adds a query to an existing route, that route gains a 500 cause and owes a proof for it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/httpx` · harmful: 0
- features: skills
- evidence: api/internal/player/player.go:106 (api/httpx)
- last seen: 2026-09-23T20:20:14Z

### L-012 - Assert catalog text fields by value, not just non-empty; the web mocks copy them by hand.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `api/catalog` · harmful: 0
- features: skills
- evidence: api/internal/catalog/catalog_test.go:146 (api/catalog)
- last seen: 2026-09-23T20:20:14Z

### L-013 - A validation-order claim needs one case per adjacent pair, including body decoding before path validation.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/httpx` · harmful: 0
- features: office
- evidence: C14; api/internal/office/office_test.go:391 (round 1) (api/httpx)
- last seen: 2026-09-24T01:49:31Z

### L-014 - A decision helper moved into a shared package is reached across more boundaries; add its own-layer test in the commit that moves it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/test-policy` · harmful: 0
- features: office
- evidence: api/internal/player/player.go Pay (round 1, unmet Test policy row) (api/test-policy)
- last seen: 2026-09-24T01:49:31Z

### L-015 - When stored rows reference catalog ids, decide and test what happens once the catalog drops the id or shrinks the set.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `api/catalog` · harmful: 0
- features: office
- evidence: api/internal/player/player.go:164, api/internal/office/office.go:122 (round 1) (api/catalog)
- last seen: 2026-09-24T01:49:32Z

### L-016 - Every new route that goes through player.WithLocked owes a 404 player_not_found row in Surface and a proof with a session that has no player.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/httpx` · harmful: 0
- features: server-room
- evidence: api/internal/rack/rack.go:29 (api/httpx)
- last seen: 2026-09-24T11:47:14Z

### L-017 - When a check says a new bonus source sums with the existing ones, prove one case per existing source, including one with a skin that carries a bonus.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/test-policy` · harmful: 0
- features: server-room
- evidence: api/internal/player/bonus_test.go:110 (C21) (api/test-policy)
- last seen: 2026-09-24T11:47:14Z

### L-018 - A branch for a catalog value the embedded data does not use today (a gems price) still needs a proof through apptest.NewWithCatalog, or it should be removed.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api/catalog` · harmful: 0
- features: server-room
- evidence: api/internal/rack/rack.go:86 (api/catalog)
- last seen: 2026-09-24T11:47:14Z

### L-019 - Run a proof in a clean checkout of the commit when it calls a tool outside version control; a tool that only exists in an untracked directory makes the proof green only on the author's machine
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tooling` · harmful: 0
- features: game-art
- evidence: verification.md C3 / Makefile:32 - make art-check exits 2 in a clean worktree of 3d6b472 (tooling)
- last seen: 2026-09-24T14:53:18Z

### L-020 - Give CSS-only rendering decisions a browser-level check on the computed style, because jsdom never loads the stylesheet
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web-css` · harmful: 0
- features: game-art
- evidence: verification.md Coverage - scene background scale x4 + pixelated, web/src/app/globals.css:104,163,285,307 (web-css)
- last seen: 2026-09-24T14:53:18Z

### L-021 - A key handler that reacts to one key needs a test that presses another key and asserts the state did not change.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/screens` · harmful: 0
- features: responsive
- evidence: verification.md F1 - web/src/components/Tabs.tsx:27 (web/screens)
- last seen: 2026-09-24T18:17:11Z

### L-022 - When the plan lands a state on a layout criterion, the layout proof must render that state, not only the default screen.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web/layout` · harmful: 0
- features: responsive
- evidence: verification.md Coverage - plan Observable error states (onboarding field-error, scene role=alert) at phone width (web/layout)
- last seen: 2026-09-24T18:17:11Z

### L-023 - Measure a responsive element against the viewport, not only its container, or the check passes with the breakpoint removed.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web-css` · harmful: 0
- features: responsive
- evidence: verification.md F3 - C13 web/e2e/responsive.spec.ts:113 survived the media block removal (web-css)
- last seen: 2026-09-24T18:17:11Z

### L-024 - Enumerate filled-state layout cases from every screen whose controls change with player data, not from the examples a gap report named.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web/layout` · harmful: 0
- features: responsive
- evidence: verification.md Coverage populated scenes - LOJA web/src/components/ShopScene.tsx:179 (web/layout)
- last seen: 2026-09-24T18:32:04Z

### L-025 - When the spec says an element stays inside a named container, assert its box against that container, not only against the viewport.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web/layout` · harmful: 0
- features: responsive
- evidence: verification.md C22 - web/e2e/responsive.spec.ts:278 (web/layout)
- last seen: 2026-09-24T18:32:04Z

### L-026 - When a plan marks an art style guide binding, give each machine-checkable style rule it names (outline, light direction) a check, because the renderer only warns and art-check exits 0 on warnings.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: game-menu
- evidence: verification.md Binding sources row 1; web/public/art/icon/menu-office.png (art)
- last seen: 2026-09-24T19:47:06Z

### L-027 - Every guard a Landing door's literal shape names needs its own asserted case, including ones like defaultPrevented that the checks table did not list.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: game-menu
- evidence: web/src/components/Tabs.tsx:33 (web)
- last seen: 2026-09-24T19:47:06Z

### L-028 - When the chosen design places parts inside a component (number in a corner, label below), assert their positions from bounding boxes, not only their text.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: game-menu
- evidence: verification.md Binding sources row 2 (number in corner, label below) (web)
- last seen: 2026-09-24T19:47:06Z

### L-029 - When a claim covers every row of a table, make the proof table-driven over all rows, not a single example row.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: game-menu
- evidence: web/src/components/Tabs.test.tsx:225 (web)
- last seen: 2026-09-24T19:47:06Z

### L-030 - Give every glossy icon surface (screen, gem, coin, slime) exactly one white or top-tone specular pixel and name its coordinates in the checks
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web/art icon` · harmful: 0
- features: game-menu
- evidence: web/art/icon/menu-office.json:26-29 (web/art icon)
- last seen: 2026-09-24T20:08:51Z

### L-031 - When an art style rule applies to every icon in a set, measure it on every icon, not only on the surfaces a gap report named.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: game-menu
- evidence: web/art/icon/menu-server.json legend m; .specs/features/game-menu/checks.md C26 (art)
- last seen: 2026-09-24T20:22:33Z

### L-032 - Count art tones by resolved palette hex, not by palette name, because aliased palette entries share a colour
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: game-menu
- evidence: verification.md F5; web/src/lib/art.test.tsx:259-260 (art)
- last seen: 2026-09-24T21:02:26Z

### L-033 - When a check claims only one rule is left to judgement, enumerate every binding rule and show each one has a check or a named exemption
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: game-menu
- evidence: verification.md gap 2; .specs/features/game-menu/checks.md:102 (art)
- last seen: 2026-09-24T21:02:26Z

### L-034 - In a rule-to-proof table, cite the check that fails when the rule is broken, not one that sounds related: an 'edge pixels are ink' check stays green under a 2px outline, so outline weight needs the enclosed-ink check.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web/art icon style` · harmful: 0
- features: game-menu
- evidence: checks.md S10 rows 1px outline / outline weight; F11 (web/art icon style)
- last seen: 2026-09-24T21:21:26Z

### L-035 - When a label follows a priority order, test each higher-priority state combined with every lower-priority condition failing, not only with the others satisfied.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-screens` · harmful: 0
- features: forge
- evidence: verification.md F4 / C22 web/src/components/ShopScene.tsx:247 (web-screens)
- last seen: 2026-09-24T22:19:02Z

### L-036 - A guard for a catalog reference the embedded data never breaks still needs a proof through apptest.NewWithCatalog and a status in Surface, or it should be removed.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api-routes` · harmful: 0
- features: forge
- evidence: verification.md coverage / api/internal/shop/forge.go:26 (api-routes)
- last seen: 2026-09-24T22:19:02Z

### L-037 - A stale-async-load test must make the old load resolve after the switch (delay it), or a cached load hides a missing cancel guard.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/components` · harmful: 0
- features: assets
- evidence: web/src/components/HeroAvatar.test.tsx:73 (web/components)
- last seen: 2026-09-26T02:33:59Z

### L-038 - To prove 'icon before the text', assert firstChild === firstElementChild, not only firstElementChild and textContent.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web/components` · harmful: 0
- features: assets
- evidence: web/src/components/OfficeScene.test.tsx:356 (web/components)
- last seen: 2026-09-26T02:33:59Z

### L-039 - When generalizing a checker to new categories, enumerate every guard of the function (gate, shape, each rule) as coverage members, not only the rules the check names.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `pixel-assets` · harmful: 0
- features: assets
- evidence: .claude/skills/pixel-assets/scripts/render.py:382 (pixel-assets)
- last seen: 2026-09-26T02:33:59Z

### L-040 - python3 -m unittest cannot take a path under .claude, and unittest -k is a substring (repeat -k, never 'a or b'); run the test file directly.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `pixel-assets` · harmful: 0
- features: assets
- evidence: .claude/skills/pixel-assets/scripts/test_render.py (pixel-assets)
- last seen: 2026-09-26T02:33:59Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
