# Game menu checks

Profile: standard
Plan: `.specs/features/game-menu/plan.md`

18 checks in 4 slices · 3 one-way doors · 0 open

Tables used by the checks (`TABS` order, door 1):

- slot -> `href` -> `icon`: 1 TÍTULO `/` `titulo` · 2 MUNDO `/mundo` `mundo` · 3 SERVER `/server` `server` · 4 DEPLOY `/deploy` `deploy` · 5 BUG FIGHT `/bug-fight` `bug-fight` · 6 SKILLS `/skills` `skills` · 7 LOJA `/loja` `loja` · 8 AVATAR `/avatar` `avatar` · 9 OFFICE `/office` `office`
- yellow = `rgb(255, 201, 60)` (`--yellow`)

Unit proofs live in `web/src/components/Tabs.test.tsx`, `GameArt.test.tsx` and `web/src/lib/art.test.tsx`;
browser proofs in `web/e2e/game-menu.spec.ts` (title prefix = check id).

## Checks

### S1 - ícones · 9 specs + 9 PNGs + 1 test · ~15k

**C1** - Para cada `icon` da tabela existem `web/art/icon/menu-<icon>.json` e `web/public/art/icon/menu-<icon>.png` com 16x16 (9 casos, table-driven) (MENU-01, AC 1; door 1) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu icons"`

**C2** - `make art-check` sai `0` com os 9 specs novos incluídos (MENU-01, AC 2) ✅
Proof: `make art-check`

### S2 - hotbar · `Tabs.tsx`, `GameArt.tsx`, `globals.css` · ~12k

**C3** - `GameArt kind="menu" id="loja" scale={2}` renderiza `src="/art/icon/menu-loja.png"`, `width="32"`, `height="32"`, classe `pixelated` (MENU-02, AC 3; door 2) ✅
Proof: `cd web && npx vitest run src/components/GameArt.test.tsx -t "menu address"`

**C4** - Cada um dos 9 links da nav `Cenas`, na ordem da tabela, contém `.tab-icon > img` com `src="/art/icon/menu-<icon>.png"`, `alt=""`, `width="32"`, classe `pixelated`, mais `.tab-num` `01`–`09` e o rótulo (MENU-02, AC 3; door 1) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "slot icons"`

**C5** - IF o `<img>` do slot LOJA dispara `error` THEN o slot não tem mais `<img>` e ainda mostra `07` e `LOJA` (MENU-02, AC 4) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "slot icon fallback"`

**C6** - A 1280x800, na nav `Cenas`: os 9 links têm o mesmo `y`, larguras iguais (±1px), cada `.tab-icon` mede 44x44 e contém um `<img>` carregado (`naturalWidth` 16); `.page` mede 1200px e a cena 760px (MENU-02, AC 5) ✅
Proof: `cd web && npx playwright test e2e/game-menu.spec.ts -g "C6 "`

**C7** - A 1280x800 em `/server`, o `.tab-icon` do slot SERVER tem `border-top-color` `rgb(255, 201, 60)` e os outros 8 não (MENU-02, AC 6) ✅
Proof: `cd web && npx playwright test e2e/game-menu.spec.ts -g "C7 "`

**C8** - A 1280x800, depois de um `Tab` a partir do `body`, o slot focado (TÍTULO) tem `outline-style` `solid`, `outline-width` `3px` e `outline-color` `rgb(255, 201, 60)` (MENU-02, AC 7) ✅
Proof: `cd web && npx playwright test e2e/game-menu.spec.ts -g "C8 "`

### S3 - atalhos · `Tabs.tsx` · ~6k

**C9** - Com o foco no `body`, a tecla `N` de `1` a `9` chama `router.push` uma vez com o `href` do slot N (9 casos, table-driven) (MENU-03, AC 8; door 3) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "shortcut navigates"`

**C10** - `Control+3`, `Meta+3` e `Alt+3` não chamam `router.push` (3 casos) (MENU-03, AC 9) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "shortcut ignores modifiers"`

**C11** - Com o foco num `input`, num `textarea`, num `select` e num `div contenteditable`, a tecla `3` não chama `router.push` (4 casos) (MENU-03, AC 10) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "shortcut ignores editable"`

**C12** - As teclas `0` e `a` não chamam `router.push` (2 casos) (MENU-03, AC 11) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "shortcut ignores other keys"`

**C13** - Com o menu aberto, a tecla `4` chama `router.push("/deploy")` e o botão `MENU` fica com `aria-expanded="false"` (MENU-03, AC 12) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "shortcut closes menu"`

**C14** - No browser a 1280x800, depois do login: a tecla `4` leva a URL a `/deploy` com `PIPELINES DE DEPLOY` visível, e a tecla `1` volta a `/` com `CLIQUE NAS PLACAS PARA NAVEGAR` visível (MENU-03, AC 8; door 3) ✅
Proof: `cd web && npx playwright test e2e/game-menu.spec.ts -g "C14 "`

### S4 - janela de comando · `Tabs.tsx`, `globals.css` · ~6k

**C15** - Em `/loja` o botão `MENU` contém `<img src="/art/icon/menu-loja.png" alt="">` e o texto exato `MENU · LOJA`; em `/login` o botão não tem `<img>` e o texto é `MENU` (MENU-04, AC 13) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "menu button icon"`

**C16** - A 360x740 e a 390x844, com o menu aberto: os 9 links estão visíveis, cada um com um `<img>` visível, os `y` dos links formam 3 valores e os `x` formam 3 valores, e `scrollWidth <= innerWidth` (2 casos) (MENU-04, AC 14) ✅
Proof: `cd web && npx playwright test e2e/game-menu.spec.ts -g "C16 "`

### S5 - regressão · 0 files

**C17** - As provas do responsive (C7–C26 no browser) continuam verdes sem mudar nenhum assert (plan `Impact`) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C[0-9]+ "`

**C18** - As provas de `Tabs.test.tsx` do foundation e do responsive (ordem e rotas, `01`–`09`, `aria-current`, menu C1–C6, C21) continuam verdes sem mudar nenhum assert (plan `Impact`) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "tab order and routes|marks only the current|menu starts closed|menu opens|link closes menu|button closes menu|escape closes menu|other keys keep menu open|menu label"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| menu icons on disk (9) | `titulo` C1 · `mundo` C1 · `server` C1 · `deploy` C1 · `bug-fight` C1 · `skills` C1 · `loja` C1 · `avatar` C1 · `office` C1 | - |
| slots with icon (9) | TÍTULO C4 · MUNDO C4 · SERVER C4 · DEPLOY C4 · BUG FIGHT C4 · SKILLS C4 · LOJA C4 · AVATAR C4 · OFFICE C4 | - |
| slot states (3) | ativo C7 · inativo C7 · focado C8 | - |
| shortcut keys (9) | `1` C9 · `2` C9 · `3` C9 · `4` C9 · `5` C9 · `6` C9 · `7` C9 · `8` C9 · `9` C9 | - |
| shortcut guards: modifiers (3) | Ctrl C10 · Meta C10 · Alt C10 | - |
| shortcut guards: editable targets (4) | `input` C11 · `textarea` C11 · `select` C11 · `contenteditable` C11 | - |
| shortcut guards: other keys (2) | `0` C12 · `a` C12 | - |
| shortcut side effects (2) | navega C9, C14 · fecha menu C13 | - |
| MENU button by route (2) | cena de `TABS` C15 · fora de `TABS` C15 | - |
| phone widths with open menu (2) | 360 C16 · 390 C16 | - |
| Landing doors (3) | door 1 `TABS.icon` + address C1, C4 · door 2 `ArtKind` `menu` C3 · door 3 keydown listener C9-C14 | - |

- Claims about what the browser lays out or navigates (C6-C8, C14, C16): each proof runs in the real browser with `globals.css` loaded
- C9-C13 prove the shortcut decision table at its own layer; C14 crosses the browser boundary over two of its rows

## Test policy

`AGENTS.md` `## Test policy` answers both questions for `web`; its rows apply unchanged. Evidence:

- `Tabs.tsx` shortcut handler: key table (9 rows), 3 modifier guards, 4 editable-target guards, other-key rejection, menu-close side effect - decides, reached across the browser boundary -> own layer C9-C13, boundary C14
- `Tabs.tsx` slot and MENU rendering: icon per slot from `TABS` (9 rows), MENU icon present/absent (2 rows) - decides -> own layer C4, C15
- `GameArt.tsx` kind -> address: gains the `menu` row - decides -> own layer C3
- `globals.css` hotbar and 3x3 rules: layout only the browser evaluates -> boundary C6-C8, C16
- closest analogue: `Tabs.test.tsx` (responsive menu, own layer) and `e2e/responsive.spec.ts` (layout in the browser)

## Swept

- validation: C11, C12 (keys and targets the shortcut must not act on)
- failure modes: C5 (icon that fails to load)
- idempotency: n/a - a shortcut to the current scene pushes the same route; nothing stored
- authorization: existing - login and onboarding do not mount the frame, so no hotbar or shortcut before a session (`GameShell`)
- concurrency: n/a - one client-side listener, no shared state
- data lifecycle: C2 (a spec without PNG or a PNG without spec fails `art-check`)
- dependency failure: C5 (static asset missing -> slot keeps number and label)
- state transitions: C13 (open menu -> closed by shortcut)
- observability: n/a - navigation UI only; nothing to log

## Handoff

Intended split, with the arithmetic (`wc -c` / 4), written before any code:

- read: pixel-assets skill + style guide + spec format + examples ≈ 12k; `Tabs.tsx`/tests 8 KB ≈ 2k; `GameArt` + tests 4 KB ≈ 1k; `globals.css` 34 KB ≈ 9k; e2e helpers/specs 20 KB ≈ 5k -> 29k; 9 specs written ≈ 5k; 3 preview passes with images ≈ 15k; ×1.5 edits and runs -> ~75k
- one builder; under the 150k budget
