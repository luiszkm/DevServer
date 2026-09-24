# Game menu checks

Profile: standard
Plan: `.specs/features/game-menu/plan.md`

33 checks in 10 slices · 3 one-way doors · 0 open

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

### S6 - fix round 1 · 9 specs + 9 PNGs + 3 tests · added after verification round 1 (binding style source unchecked; `defaultPrevented` guard unproven; AC 13 on 1 of 9; arrangement positions unchecked)

**C19** - Cada um dos 9 PNGs `menu-<icon>` tem 1px de margem transparente (nenhum pixel opaco na linha 0, linha 15, coluna 0 ou coluna 15) e a caixa dos pixels opacos mede entre 12 e 14px no maior lado (~80% de 16, style guide "icon") (MENU-01, AC 1; binding style source; added after verification round 1) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu icon margin"`

**C20** - Em cada um dos 9 PNGs, todo pixel opaco com um vizinho (4-conexo) transparente é `ink.0` `#060612` (contorno fechado em ink, style guide) (MENU-01, AC 1; binding style source; added after verification round 1) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu icon outline"`

**C21** - Em cada um dos 9 PNGs, a luminância média (Rec. 709) dos pixels opacos que não são `ink.0` com `x + y < 15` é maior que a dos com `x + y > 15` (luz de cima-esquerda, style guide) (MENU-01, AC 1; binding style source; added after verification round 1) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu icon light"`

**C22** - Um `keydown` de `3` que outro listener já cancelou (`preventDefault` num listener do `body`, antes do `document`) não chama `router.push` (MENU-03, AC 8; door 3 `e.defaultPrevented`; added after verification round 1) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "shortcut ignores prevented"`

**C23** - Para cada uma das 9 rotas de `TABS`, o botão `MENU` tem como primeiro filho um `<img src="/art/icon/menu-<icon>.png" alt="">` seguido do texto `MENU · <rótulo>` (9 casos, table-driven) (MENU-04, AC 13; added after verification round 1) ✅
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "menu button icon per scene"`

**C24** - A 1280x800 e a 390x844 (menu aberto), em cada um dos 9 slots, a caixa do `.tab-num` fica acima e à esquerda da do `.tab-icon` (`num.x + num.width <= icon.x` e `num.y < icon.y`) e dentro do slot, e o rótulo fica abaixo do ícone (`label.y >= icon.y + icon.height`); no slot ativo o `box-shadow` do `.tab-icon` contém o brilho `rgb(255, 224, 138)` e nos outros 8 não (2 casos) (MENU-02, AC 5, 6; plan Sources "número no canto, rótulo embaixo, ativo com brilho"; added after verification round 1) ✅
Proof: `cd web && npx playwright test e2e/game-menu.spec.ts -g "C24 "`

Every style-guide rule that applies to an icon, and what proves it, is in the table under S10.

### S7 - fix round 2 · 2 specs + 2 PNGs + 1 test · added after verification round 2 (no specular on the `office` screen; 2 tones on the `mundo` paper and `office` bezel; ink exemption imprecise)

**C25** - `menu-office` tem exatamente um pixel `code.4` `#b6f070`, em (4,3), canto superior esquerdo da tela; os outros pixels da tela (x 4-11, y 3-6) são `code.0` `#1f5a08` ou `code.3` `#6bd425` (style guide: tela brilhante ganha um pixel especular) (MENU-01, AC 1; added after verification round 2) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu office specular"`

**C26** - A moldura do monitor de `menu-office` (linha 2 x 3-12, colunas x 3 e x 12 y 3-6, linha 7 x 3-12) usa exatamente os 3 tons `stone.3` `#46586a`, `stone.2` `#2a3642`, `stone.1` `#121e2a`; o papel de `menu-mundo` (dentro do contorno, sem terra, água e trilha) usa exatamente `cloud.3` `#fbf6ea`, `cloud.2` `#f6ead2` e `dirt.3` `#deb060` (style guide: 3-4 tons por material) (MENU-01, AC 1; added after verification round 2) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu material tones"`

**C27** - Os pixels `ink.0` sem nenhum vizinho transparente (8-conexo, fora da tela conta como transparente) são exatamente: `avatar` (5,6) (10,6) - olhos; `deploy` (5,9) (5,10) (5,11) (10,9) (10,10) (10,11) - junção aleta/corpo; `office` (7,8) (8,8) (7,10) (8,10) - junção monitor/suporte e suporte/mesa; nenhum nos outros 6 ícones (style guide: detalhe interno nunca em ink, exceto olhos e fronteira entre partes) (MENU-01, AC 1; added after verification round 2) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu inner ink"`

### S8 - fix round 3 · 4 specs + 4 PNGs + 1 test · added after verification round 3 (tone rule measured only where a gap was named; `server` metal in 1 tone; "material" undefined - ruled by the user)

Surface table (legend chars of each spec, plan `Assumptions` "Material"): `avatar` rosto `s m S p` · cabelo `h H j` · moletom `k K n` · small: zíper `c` | `bug-fight` casco `l r R s` · small: cabeça `k`, olhos `w` | `deploy` corpo `w m M` · aletas `r R l` · small: vidro `b B`, chama `y Y f` | `loja` saco `D d m` · moeda `g y l M` · small: cordão `r` | `mundo` papel `p P q` · terra `g G L` · small: água `b`, trilha `x` | `office` tela `g G S` · moldura `f E F` · mesa `W w d` · small: suporte `M m` | `server` estrutura `M m n` · gavetas `S d z` · small: LEDs `g b y` | `skills` estrela `b m l w` | `titulo` telhado `r R l` · paredes `W w d k` · small: porta `D`, janela `y Y`. Glossy: `loja` moeda top `gold.4`, `office` tela top `code.4`, `deploy` vidro top `net.4`.

**C28** - Em cada um dos 9 specs `web/art/icon/menu-<icon>.json`, cada superfície da tabela com 12px ou mais usa pelo menos 3 cores distintas da paleta (18 superfícies) (MENU-01, AC 1; binding style source "3-4 tones per material"; added after verification round 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu surface tones"`

**C29** - Em cada um dos 9 specs, todo caractere do grid que não é `o` nem `.` pertence a exatamente uma superfície ou parte pequena da tabela, e cada parte pequena soma menos de 12px (nenhum pixel escapa da regra) (MENU-01, AC 1; added after verification round 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu surface table covers"`

**C30** - Cada superfície brilhante da tabela (`loja` moeda, `office` tela, `deploy` vidro) tem exatamente um pixel no tom mais alto da sua rampa (`gold.4`, `code.4`, `net.4`) (MENU-01, AC 1; binding style source "one white or top-tone specular pixel"; added after verification round 3) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu glossy specular"`

### S9 - fix round 4 · 1 test · added after verification round 4 (C28 counted palette names, not colours - surviving mutant F5; "centred" unchecked)

**C31** - Em cada um dos 9 PNGs, o centro da caixa dos pixels opacos fica a no máximo 1px do centro da tela (7,5; 7,5) em x e em y (style guide: "one object, centred") (MENU-01, AC 1; added after verification round 4) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu icon centred"`

### S10 - fix round 5 · 1 test · added after verification round 5 (five binding rules neither checked nor named as judged)

**C32** - Em cada um dos 9 PNGs, os pixels opacos formam uma única forma 8-conexa (style guide icon: "one object") (MENU-01, AC 1; added after verification round 5) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu icon one object"`

**C33** - Todo caractere da superfície `moeda` de `menu-loja` mapeia para uma cor da rampa `gold` (style guide icon: "coin = `gold` ramp") (MENU-01, AC 1; added after verification round 5) ✅
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "menu coin in gold"`

Style guide rules for icons (`.claude/skills/pixel-assets/references/style-guide.md`), each with its proof or marked judged:

| Rule (line) | Proof |
| --- | --- |
| 16-bit JRPG look, bright and saturated, friendly (8-9) | judged by eye on the preview |
| dev-life motifs; the icon reads as the scene it names (10-12) | judged by eye on the preview |
| 1px `ink` outline on every foreground shape (13) | C20 (edge pixels are ink), C27 (no ink inside, so the outline is 1px) |
| inner detail never in ink (14) | C27 |
| inner detail in the darkest tone of the material's own ramp (13-14) | judged by eye on the preview |
| light from the top-left (15) | C21 |
| one white or top-tone specular pixel on glossy things (16) | C25, C30 |
| 3-4 tones per material (17) | at least 3: C26, C28 (by colour); at most 4: by construction, every surface in C28's table has at most 4 chars and C29 forces every char into one surface |
| tones straight from a ramp; only palette colours (17, 22-27) | C2 (`render.py` exits 1 on an off-palette colour) |
| no gradients except the dithered sky (17-18) | judged by eye on the preview |
| no anti-aliasing against transparency, no semi-transparent pixels (18) | C2 (`render.py` exits 1 on a semi-transparent pixel) |
| depth by atmosphere (19-20) | n/a - backgrounds only |
| icon 16x16 (47) | C1 |
| shown at 2x-3x (47) | C3, C4 (x2) |
| one object (48) | C32 |
| centred (48) | C31 |
| filling ~80% of the canvas (48) | C19 |
| full outline (48) | C20 |
| coin = `gold` ramp; HP, gem, XP ramps (49-50) | C33 for the coin; no gem, heart or XP in the 9 icons |
| one set shares light direction, outline weight, fill ratio (51-52) | C21, C20 + C27, C19 over all 9 |
| `pixelated`, whole-number scale, `alt` (displaying) | C3, C4 |

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
| icon style rules, mechanised (10) | one object C32 · coin in gold C33 · centred C31 · margin C19 · fill ~80% C19 · ink outline C20 · top-left light C21 · specular on every glossy surface C25, C30 · tones on every surface ≥12px C26, C28, C29 · no inner-detail ink C27 | - |
| surfaces ≥12px (18) | avatar rosto C28 · avatar cabelo C28 · avatar moletom C28 · bug-fight casco C28 · deploy corpo C28 · deploy aletas C28 · loja saco C28 · loja moeda C28 · mundo papel C28 · mundo terra C28 · office tela C28 · office moldura C28 · office mesa C28 · server estrutura C28 · server gavetas C28 · skills estrela C28 · titulo telhado C28 · titulo paredes C28 | - |
| shortcut guards: already handled (1) | `defaultPrevented` C22 | - |
| MENU icon per scene (9) | `/` C23 · `/mundo` C23 · `/server` C23 · `/deploy` C23 · `/bug-fight` C23 · `/skills` C23 · `/loja` C23 · `/avatar` C23 · `/office` C23 | - |
| slot arrangement (4) | number top-left C24 · icon in square frame C6 · label below C24 · active glow C24 | - |
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
- **Boundary:** C1-C18 closed at `987063b` (9 specs + PNGs + `art.test.tsx` group `1d0b55c`; `ArtKind` `menu`, `TABS.icon`, slots, MENU icon, keydown shortcuts, hotbar/3x3 CSS, `e2e/game-menu.spec.ts` and the `useRouter` mocks in `GameShell.test.tsx`/`Hud.test.tsx` `987063b`). `npx vitest run` (313), `tsc --noEmit`, `eslint src e2e`, `make art-check` and the full `npx playwright test` (99) green at `987063b`, e2e against the manual stack (api `:8180`, `next build` + `next start --port 3100`) because the user's `next dev` holds `:3000`
- **Settled mid-build:** nothing asked of the user. Builder choices: `menu-bug-fight` redrawn as a red ladybug after the first purple draft read as two blobs; `menu-office` got a closed bottom outline (render `WARN` 88% ink); the nav itself became the hotbar frame (`.tabs` panel with `--edge` fill and `--line-2` ring) and loses padding/border while the phone menu is closed so the collapsed bar does not show an empty frame; `.tab-num` moved to the slot's top-left corner (absolute) and turns yellow on the active slot; `.tab` gained `min-width: 0` and `text-align: center` so `BUG FIGHT` wraps centred in the 3x3 window; the shortcut guard also skips `e.defaultPrevented`
- **Abandoned:** the first purple beetle draft for `menu-bug-fight`
- **Boundary:** C19-C24 closed at `53ca376` (fix round 1 for verification round 1). Art: `titulo` redrawn with a closed roof apex and eave and a 1px margin, window and door frames in `wood.0`; `skills` redrawn 13x13 with its right side shaded; `office` bezel lit top-left (`stone.3`) and shaded bottom-right (`stone.1`), stand lit from the left; `bug-fight` seam and spots in `red.0`, head filled `ink.2`, legs and antennae inside the margin; `deploy` and `server` moved inside the 1px margin, the rocket flame darkened (`lamp.0`) so the bright pixels do not outweigh the top-left; `loja` coin ring in `gold.0`. `npx vitest run` (350), `tsc --noEmit`, `eslint src e2e`, `make art-check` and the full `npx playwright test` (101) green at `53ca376`
- **Settled mid-build:** the user ruled that the preview's "square slot" is the 44x44 icon frame, not the whole link (plan `Assumptions`, confirmed). C22 was confirmed red with the `e.defaultPrevented` guard removed before being kept. Inner-ink rule kept as an enumerated preview judgement (object boundaries in `deploy`, `office`, `bug-fight`, `avatar` eyes) because a mechanical "ink only on the outline" test would forbid the boundary between two parts of one object
- **Abandoned:** nothing
- **Boundary:** C25-C27 closed at `9f5b76c` (fix round 2 for verification round 2): `office` screen gets one `code.4` specular pixel at (4,3), the bezel a third tone (`stone.2` on the right, `stone.1` along the bottom); `mundo` paper gets a `dirt.3` bottom shadow row; the S6 preview-judged paragraph is replaced by C27's exact list of enclosed ink (8-connected: avatar eyes, deploy fin seams, office monitor/stand/desk joints); C24's test now also bounds the number by the slot's right and bottom edges, as its claim already said. `npx vitest run` (361), `tsc --noEmit`, `eslint src e2e`, `make art-check` and the full `npx playwright test` (101) green at `9f5b76c`
- **Settled mid-build:** nothing asked of the user; the tone gap was fixed in the art rather than exempted
- **Abandoned:** nothing
- **Boundary:** C28-C30 closed at `86fa29c` (fix round 3 for verification round 3, after the user's ruling on "material"): `server` frame now `metal.3`/`metal.2`/`metal.1` and drawers `stone.2`/`stone.1`/`stone.0`; `avatar` hair gains `hoodie.1` (`j`) and the hoodie `hoodie.0` (`n`) on the right; `mundo` land gains `leaf.1` (`L`); `deploy` glass specular raised to `net.4`. C26's scenery exclusion gained the new land tone `#286828` (its claim already excludes the land). The checks' coverage text no longer claims more than C25/C26 prove. `npx vitest run` (391), `tsc --noEmit`, `eslint src`, `make art-check` and the full `npx playwright test` (101) green at `86fa29c`
- **Settled mid-build:** the user chose "material = surface of 12px or more, by legend char; smaller parts exempt; glossy = coin, screen, glass" (plan `Assumptions`, confirmed) after round 3 hit the three-round bound
- **Abandoned:** nothing
- **Boundary:** C31 closed at `139aaba` (fix round 4 for verification round 4): C28 now maps each legend name through `palette.json` to its hex before counting, as its claim ("3 cores distintas") says, so aliases like `leaf.3`/`grass.3` no longer count twice - F5 (`mundo` `L` -> `grass.3`) confirmed red before keeping; C31 adds the centring rule; the S6 sentence now names what stays judged by eye. No art changed. `npx vitest run` (400) green at `139aaba`; e2e untouched since `2b44c49` (101 green there)
- **Settled mid-build:** nothing asked of the user
- **Abandoned:** nothing
- **Boundary:** C32-C33 closed at `6ae8584` (fix round 5 for verification round 5): one-object and gold-coin checks; C30's test now compares by colour like C28; the S6 sentence is replaced by the S10 table mapping every icon rule of the style guide to its proof or to "judged by eye". Both new tests were confirmed red on a mutated `skills` (stray pixel) and `loja` (coin `M` -> `dirt.1`) before the files were restored. No art changed. `npx vitest run` (409) and `make art-check` green at `6ae8584`; e2e untouched since `2b44c49`
- **Settled mid-build:** nothing asked of the user
- **Abandoned:** nothing
