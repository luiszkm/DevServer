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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
