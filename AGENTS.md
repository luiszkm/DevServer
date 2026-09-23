# AGENTS.md

## tlc-spec-lean

profile: standard
budget: 150k

## Test policy

Classify code by its shape, never by the name of its layer. **Decision** = anything that changes an
outcome (validation, guard, state transition, dispatch, mapping table with more than one row).
**Instrumentation** = forwards to one call or maps one shape onto another with no conditional.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Entry point that decides nothing | one at the boundary | accepted input, each rejected input, each error path |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Levels in this repo:

- api (Go): `go test` against the real Postgres from `docker-compose.yml` (database `devserver_test`); external HTTP (GitHub) faked with `httptest.Server`. Never mock the database - row locks and `CHECK` constraints are part of what is proven.
- web: `vitest` + `@testing-library/react` + `jsdom` for screen states; `@playwright/test` for browser boundary behaviour (navigation, persistence, `/api` rewrite).
- A test asserts what the spec says, never what the code happens to do.
