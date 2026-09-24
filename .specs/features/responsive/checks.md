# Responsive checks

Profile: standard
Plan: `.specs/features/responsive/plan.md`

20 checks in 3 slices · 3 one-way doors · 0 open

Tables used by the checks:

- scenes (9), rota -> seção `aria-label` -> texto de pronto: `/` TÍTULO (`CLIQUE NAS PLACAS PARA NAVEGAR`) · `/mundo` MUNDO (`região atual: VILA LOCALHOST`) · `/server` SERVER (`LOJA DE COMPONENTES`) · `/deploy` DEPLOY (`PIPELINES DE DEPLOY`) · `/bug-fight` BUG FIGHT (`ENCONTRO · VILA LOCALHOST`) · `/skills` SKILLS (`PONTOS: 1`) · `/loja` LOJA (`LOJA DEVSERVER`) · `/avatar` AVATAR (label `atributos`) · `/office` OFFICE (`CATÁLOGO`)
- viewports: phone S 360x740 · phone M 390x844 · desktop 1280x800
- screens fora do frame (4): login · onboarding · servidor fora do ar · carregando

The layout tests live in `web/e2e/responsive.spec.ts`, iterate the scene table above (one test per
scene and viewport, title `<check> <viewport> <rota>`), and reach each scene with `page.goto(rota)`
after `newDev`; the menu tests live in `web/src/components/Tabs.test.tsx`.

## Checks

### S1 - menu de cenas · 3 files · ~9 KB · ~3k

**C1** - `Tabs` renderiza um `<button type="button">` cujo nome começa com `MENU`, com `aria-expanded="false"` e `aria-controls="cenas-nav"`; a `<nav aria-label="Cenas">` tem `id="cenas-nav"` e `data-open="false"` (RESP-01, AC 1; door 3) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "menu starts closed"`

**C2** - WHEN o botão `MENU` fechado é clicado THEN `aria-expanded="true"` e a nav `data-open="true"` (RESP-01, AC 2) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "menu opens"`

**C3** - WHEN um link da nav é clicado com o menu aberto THEN `aria-expanded="false"` e a nav `data-open="false"` (RESP-01, AC 3) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "link closes menu"`

**C4** - WHEN o botão `MENU` aberto é clicado THEN `aria-expanded="false"` e a nav `data-open="false"` (RESP-01, AC 4) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "button closes menu"`

**C5** - IF `Escape` é pressionado com o menu aberto e o foco num link da nav THEN o menu fecha (`aria-expanded="false"`) e o foco vai para o botão `MENU` (RESP-01, AC 5) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "escape closes menu"`

**C6** - O texto do botão é `MENU · <rótulo>` para cada uma das 9 rotas de `TABS` (`/` -> `MENU · TÍTULO`, `/deploy` -> `MENU · DEPLOY`, ... table-driven sobre as 9) e `MENU` para `/login` (rota fora de `TABS`) (RESP-01, AC 6) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "menu label"`

**C7** - No browser a 390x844, depois do login: os 9 links da nav `Cenas` estão escondidos e o botão `MENU · TÍTULO` visível com `aria-expanded="false"`; ao tocar nele os 9 links ficam visíveis na ordem de `TABS`; ao tocar `DEPLOY` a URL vira `/deploy`, os links somem, o botão diz `MENU · DEPLOY` e o link DEPLOY tem `aria-current="page"` (RESP-01, AC 1, 2, 3, 6; door 1, door 3) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C7 menu on phone"`

### S2 - cada tela cabe em 360px · 3 files + scene CSS · ~45 KB · ~12k

**C8** - A 360x740 e a 390x844, em cada uma das 9 cenas, `document.documentElement.scrollWidth <= window.innerWidth` (18 casos) (RESP-02, AC 7; door 1) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C8 "`

**C9** - A 360x740, em cada uma das 9 cenas, todo `button`, `a` e `input` visível dentro da seção da cena e do HUD tem `x >= 0` e `x + width <= innerWidth` (RESP-02, AC 8) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C9 "`

**C10** - A 360x740, em cada uma das 9 cenas, todo `button`, `a` e `input` visível da seção da cena, do HUD e do botão `MENU`, exceto `.title-art a`, mede `width >= 24` e `height >= 24`; e com o menu aberto os 9 links da nav também (RESP-02, AC 9) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C10 "`

**C11** - A 390x844, em cada uma das 9 cenas, a seção da cena tem `scrollHeight <= clientHeight` (nada cortado pelo `overflow: hidden`) e, depois de rolar até o último `button` da seção, a caixa dele está inteira dentro da viewport (RESP-02, AC 10) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C11 "`

**C12** - A 360x740, os 6 `.hud-card` do HUD estão visíveis com `x >= 0` e `x + width <= innerWidth`, e o botão `SAIR` está visível (RESP-03, AC 11) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C12 hud"`

**C13** - A 390x844, na tela-título, a key art tem largura igual à largura interna do `.frame` (±1px) e `height / width` = 0.8 (±0.01), e cada um dos 6 hotspots (`.title-art a`) tem a caixa dentro da caixa da imagem (RESP-03, AC 12) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C13 title"`

**C14** - A 360x740, no MUNDO, os 6 `.node-marker` têm a caixa dentro da caixa do `.world-map` e nenhum `.node-chip` está visível (RESP-03, AC 13) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C14 world"`

**C15** - A 360x740, login (`ENTRAR COM GITHUB`), onboarding (input do nome + botões de classe + `CRIAR DEV`), servidor fora do ar (`/api/me` respondendo 500 via `page.route` -> `TENTAR DE NOVO`) e carregando (`/api/me` sem resposta via `page.route` -> `CARREGANDO...`) têm `scrollWidth <= innerWidth` e cada `button`, `a` e `input` visível dentro de `[0, innerWidth]` (4 casos) (RESP-03, AC 14) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C15 "`

### S3 - desktop inalterado · 1 file · ~3 KB · ~1k

**C16** - A 1280x800, em cada uma das 9 cenas, `.page` mede 1200px de largura, a seção da cena mede 760px de altura, os 9 links da nav estão visíveis com o mesmo `y` e o botão `MENU` não está visível (RESP-04, AC 15; door 1) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C16 "`

**C17** - A 360x740, `.world-map`, `.server`, `.office-room` e `.battle` têm `background-size` = `1280px 720px` e `image-rendering` = `pixelated` (RESP-04, AC 16) ✅
Proof: `cd web && npx playwright test e2e/responsive.spec.ts -g "C17 "`

**C18** - A 1280x720 (viewport padrão), a prova game-art C33 continua verde (RESP-04, AC 16) ✅
Proof: `cd web && npx playwright test e2e/art.spec.ts -g "scene art scale"`

**C19** - `.specs/STATE.md` tem a linha `AD-015` com o texto literal da door 2 e status `active`, e a linha `AD-007` tem status `superseded by AD-015` (door 2)
Proof: `grep -q '| AD-015 |.*max-width: 1199px.*| active |' .specs/STATE.md && grep -q '| AD-007 |.*| superseded by AD-015 |' .specs/STATE.md`

**C20** - As regras de responsividade estão num único bloco `@media (max-width: 1199px)` em `globals.css` e em nenhum outro arquivo de `web/src` (door 1) ✅
Proof: `cd web && test "$(grep -rc '@media' src | awk -F: '{s+=$2} END {print s}')" = 1 && grep -q '@media (max-width: 1199px)' src/app/globals.css`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| menu transitions (4) | closed -> open by button C2 · open -> closed by button C4 · open -> closed by link C3 · open -> closed by `Escape` C5 | - |
| menu label by route (10) | `/` C6 · `/mundo` C6 · `/server` C6 · `/deploy` C6 · `/bug-fight` C6 · `/skills` C6 · `/loja` C6 · `/avatar` C6 · `/office` C6 · `/login` (fora de `TABS`) C6 | - |
| scenes at 360, no h-scroll (9) | TÍTULO C8 · MUNDO C8 · SERVER C8 · DEPLOY C8 · BUG FIGHT C8 · SKILLS C8 · LOJA C8 · AVATAR C8 · OFFICE C8 | - |
| scenes at 390, no h-scroll (9) | TÍTULO C8 · MUNDO C8 · SERVER C8 · DEPLOY C8 · BUG FIGHT C8 · SKILLS C8 · LOJA C8 · AVATAR C8 · OFFICE C8 | - |
| scenes, controls inside the width (9) | TÍTULO C9 · MUNDO C9 · SERVER C9 · DEPLOY C9 · BUG FIGHT C9 · SKILLS C9 · LOJA C9 · AVATAR C9 · OFFICE C9 | - |
| scenes, tap target 24px (10) | TÍTULO C10 · MUNDO C10 · SERVER C10 · DEPLOY C10 · BUG FIGHT C10 · SKILLS C10 · LOJA C10 · AVATAR C10 · OFFICE C10 · menu aberto C10 | - |
| scenes, nothing clipped (9) | TÍTULO C11 · MUNDO C11 · SERVER C11 · DEPLOY C11 · BUG FIGHT C11 · SKILLS C11 · LOJA C11 · AVATAR C11 · OFFICE C11 | - |
| HUD cards (6) | LEVEL/XP C12 · HP C12 · COINS C12 · GEMS C12 · SKILL PTS C12 · nome + SAIR C12 | - |
| screens outside the frame (4) | login C15 · onboarding C15 · servidor fora do ar C15 · carregando C15 | - |
| desktop scenes unchanged (9) | TÍTULO C16 · MUNDO C16 · SERVER C16 · DEPLOY C16 · BUG FIGHT C16 · SKILLS C16 · LOJA C16 · AVATAR C16 · OFFICE C16 | - |
| scene backgrounds at 360 (4) | `.world-map` C17 · `.server` C17 · `.office-room` C17 · `.battle` C17 | - |
| scene backgrounds at 1280 (4) | `.world-map` C18 · `.server` C18 · `.office-room` C18 · `.battle` C18 | - |
| Landing doors (3) | door 1 media block C8, C16, C20 · door 2 AD-015 C19 · door 3 disclosure C1, C7 | - |

- Claims about what the browser lays out (C7-C18): each proof runs in the real browser with `globals.css` loaded, because jsdom never evaluates media queries
- C1-C6 prove the menu state machine at its own layer; C7 crosses the browser boundary once over the same transitions

## Test policy

`AGENTS.md` `## Test policy` answers both questions for `web`; its rows apply unchanged. Evidence:

- `Tabs.tsx`: open/closed state with 4 transitions (button toggles twice, link closes, `Escape` closes) and a label table (9 rows + fallback) - decides, reached across the browser boundary -> own layer C1-C6 and boundary C7
- `globals.css` media block: no branching code; its observable is layout, which only the browser evaluates -> boundary C8-C17
- closest analogue: `Tabs.test.tsx` (`aria-current` per route, own layer) and `e2e/art.spec.ts` (computed style in the real browser)

## Swept

- validation: n/a - no input is added; the onboarding field keeps its own validation
- failure modes: C15 (servidor fora do ar and carregando fit the phone)
- idempotency: n/a - opening and closing the menu holds no server state
- authorization: existing - login and onboarding do not mount the frame, so no menu before a session (`GameShell`)
- concurrency: n/a - client-only UI state in one component
- data lifecycle: n/a - nothing stored; the menu state is not persisted
- dependency failure: C15 (`/api/me` 500 and `/api/me` unanswered)
- state transitions: C2, C3, C4, C5 (menu closed <-> open)
- observability: n/a - layout only; nothing to log

## Handoff

Intended split, with the arithmetic (`wc -c` / 4), written before any code:

- read: `globals.css` 31 KB + `Tabs.tsx`/`Tabs.test.tsx` 3 KB + `GameShell.tsx` 3 KB + e2e helpers/specs 6 KB + the 9 scene components as needed ~70 KB ≈ 28k; ×1.5 for edits, browser runs and screenshots ≈ 42k, + screenshots at 360 per scene ≈ 20k -> ~62k
- one builder; well under the 150k budget, no hand-off
