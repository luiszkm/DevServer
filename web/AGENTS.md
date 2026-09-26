<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# web/AGENTS.md

Next.js 16 App Router, React 19, TypeScript. Global invariants, boundaries and the test policy:
`../AGENTS.md`. Visual reference: `../docs/DevServer RPG.html`.

## Layout

| Path | Holds |
| --- | --- |
| `src/app/(game)/<route>/page.tsx` | one-line page that renders its `<X>Scene`; routes are pt-BR (`loja`, `mundo`) |
| `src/app/(game)/layout.tsx` | wraps every game route in `GameShell` |
| `src/components/<X>Scene.tsx` | the screen: state, calls, rendering |
| `src/components/GameContext.tsx` | `useGame()` → `{ player, catalog, setPlayer }` |
| `src/lib/api.ts` | `api`, `post`, `put`: same-origin fetch, HTTP errors resolve with `ok: false` |
| `src/lib/types.ts` | hand-written mirror of the api's JSON (`Player`, `Catalog`, error body) |
| `src/app/globals.css` | all styles; phone layout under `@media (max-width: 1199px)` |
| `e2e/*.spec.ts` | Playwright specs |

## Rules

- The browser only calls `/api/*` on its own origin; `next.config.ts` rewrites it to `API_URL`.
  Never call the api host directly (the session cookie must stay same-site).
- Send intent, render the server's answer: after a mutation, pass the returned `player` to
  `setPlayer`; never compute coins, XP, HP or timers locally beyond display.
- Every number and label that balances the game comes from `catalog`, never a literal.
- Show the api's `error.message` as the user-facing text; branch on `error.code`, never on message.
- When the api's JSON changes, update `src/lib/types.ts` and the fixtures in `src/test/helpers.ts`
  in the same change.
- Images come from `/art/...` produced by the `pixel-assets` skill; no emoji or glyph stand-ins.

## Tests

- Screen tests: `src/**/*.test.tsx` next to the component, run with `npx vitest run <path>`. Render
  the page inside `GameContext.Provider` with fixtures from `@/test/helpers` (`CATALOG`, `player()`,
  `mockFetch`, `json`).
- jsdom loads no stylesheet and has no canvas. Anything CSS decides (visibility, breakpoint, size,
  `image-rendering`, position) is proven in Playwright on the computed style or bounding box,
  measured against the viewport and the named container.
- Playwright: `make e2e` from the root. It starts fake GitHub `:9180`, the api `:8180` on
  `devserver_e2e`, and `next dev` on `:3100`. `workers: 1` because the fake hands out one next user
  at a time. `newDev(page)` in `e2e/helpers.ts` logs a fresh user in and creates their dev. First
  run: `npx playwright install chromium`.
- vitest fails on an unhandled rejection even when every test passes; read the exit code.

## Proofs screens usually owe

- Each conditional in the component has a named test that reaches it; grep the conditionals before
  claiming coverage.
- A list of labels or states gets one fixture per label; a priority order gets each higher state
  combined with every lower condition failing.
- A key handler gets a test pressing another key and asserting nothing changed.
- A stale async load is proven by delaying the old load until after the switch.
- Where a message or icon appears: assert the container and order (`closest`,
  `compareDocumentPosition`, `firstChild`), not only that the text exists.
- A layout criterion renders the filled and error states at phone width, not only the default screen.
