# Game menu

Sources:

- conversa 2026-09-24 - "refinar o menu, deixar com mais cara de game, com ícones etc, tanto para mobile quanto desktop"; decisões do usuário: 9 ícones novos desenhados com a skill pixel-assets (não reusar arte do catálogo) e estilo **hotbar RPG** (slots quadrados com ícone ×2 em moldura, número no canto, rótulo embaixo, slot ativo com moldura amarela e brilho; no mobile o MENU abre uma janela de comando com a grade 3x3 dos mesmos slots; atalhos 1-9 no teclado)
- `web/public/keyart.png` + `.claude/skills/pixel-assets/references/style-guide.md` - **binding para o estilo** dos ícones (paleta `palette.json`, 16x16, contorno `ink`, luz de cima-esquerda)
- `.specs/features/responsive/checks.md` - C1–C26 continuam valendo (menu disclosure, 3x3 aberto, alvos 24px, desktop 1200/760, nav em uma linha)
- `.specs/features/game-art/plan.md` door 1 (endereço `/art/<category>/<kind>-<key>.png`) e door 2 (`GameArt`)

## Problem

A navegação entre as 9 cenas é a única parte da tela que não parece jogo. Enquanto HUD, loja,
rack, mapa e combate já têm ícones pixel-art no estilo da key art, as abas são retângulos de
texto (`01 TÍTULO`, `02 MUNDO`...) com a mesma cor, e no celular o menu aberto é uma grade de
botões de texto. O dev reconhece a cena pelo texto, nunca por um símbolo, e a barra lembra um
site e não a hotbar de um RPG. Não há números de uso; o pedido do usuário é a evidência.

Quando isto for entregue, cada cena tem um ícone próprio, a barra do desktop é uma hotbar de
slots com o ativo destacado em amarelo, os atalhos 1–9 trocam de cena, e o menu do celular abre
os mesmos slots numa janela 3x3.

## Out of scope

| Excluded | Why |
| --- | --- |
| Som, animação de ícone, cursor animado | não pedido; nenhum asset tem frames |
| Mudar ordem, rótulos ou rotas das cenas | `TABS` continua igual; só ganha o ícone |
| Menu fixo (sticky) no topo ou no rodapé | não pedido; posição continua a de hoje |
| Mudar o comportamento do disclosure mobile | responsive C1–C7, C21 continuam; só o visual muda |
| Arte nova para outros lugares (HUD, cenas) | só os 9 ícones de menu |
| Atalhos além de 1–9 (setas, Esc para fechar tela) | só 1–9 (opção escolhida); `Escape` do menu já existe |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Ícones | 9 ícones novos 16x16 | decisão do usuário | y |
| Estilo | hotbar RPG: slot quadrado, ícone ×2, número no canto, rótulo embaixo, ativo com moldura amarela + brilho; mobile = janela 3x3 dos mesmos slots; atalhos 1–9 | decisão do usuário | y |
| Símbolos | TÍTULO casa · MUNDO mapa · SERVER rack · DEPLOY foguete · BUG FIGHT bug · SKILLS estrela · LOJA sacola · AVATAR cabeça do herói · OFFICE mesa com monitor | o que cada cena é; distinto dos ícones do catálogo que aparecem dentro das cenas | n |
| Ids dos ícones | `titulo`, `mundo`, `server`, `deploy`, `bug-fight`, `skills`, `loja`, `avatar`, `office` num campo novo `icon` de `TABS` | `/` não tem slug para derivar do `href` | n |
| Tamanho na tela | ícone ×2 (32px) numa moldura `.tab-icon` de 44x44px, desktop e mobile | ×2 é a escala dos ícones de lista do game-art; 44px cabe na hotbar de 9 slots em 1200px e no 3x3 de 360px | n |
| Número do slot | continua `.tab-num` `01`–`09` (canto superior esquerdo do slot) | Tabs.test (foundation C26) prova esse texto; o número já é a dica do atalho | n |
| Texto alternativo | `alt=""`: o rótulo da cena está no mesmo link | style guide (`""` para decoração); nome acessível do link não muda, os e2e que usam `name: "MUNDO"` seguem | n |
| Ícone que falha ao carregar | some e o slot mostra só número e rótulo (`fallback=""`) | não há glifo de catálogo para cena; rótulo já identifica | n |
| Slot ativo | borda `var(--yellow)` (#ffc93c) + brilho `0 0 0 2px #ffe08a`, como `.node-marker.here` do mapa | mesmo destaque de "você está aqui" que o jogo já usa | n |
| Foco de teclado | `:focus-visible` com `outline: 3px solid var(--yellow)` | slot focado precisa ser visível para quem navega com Tab | n |
| Atalhos: escopo | tecla `1`–`9` sem Ctrl/Meta/Alt, com o foco fora de `input`, `textarea`, `select` e `[contenteditable]`, em qualquer largura, enquanto o frame do jogo está montado | escopo da opção escolhida; guardas evitam roubar dígitos de um campo ou de um atalho do browser | n |
| Atalho com menu aberto | navega e fecha o menu, como o toque num link | mesmo resultado que responsive C3 | n |
| Botão MENU | ganha o ícone da cena atual antes de `MENU · <rótulo>`; texto inalterado | responsive C6 prova o texto exato | n |
| Branch | `feat/game-menu` a partir de `feat/responsive` | o menu mobile só existe nessa branch | n |

**Open questions:** none - all resolved or logged above.

## Criteria

### S1: nove ícones de cena no estilo da key art (P1)

**Acceptance Criteria**

1. The web SHALL ter, para cada id em `titulo`, `mundo`, `server`, `deploy`, `bug-fight`, `skills`, `loja`, `avatar`, `office`, o spec `web/art/icon/menu-<id>.json` e o PNG `web/public/art/icon/menu-<id>.png` com 16x16 (door 1)
2. WHEN `make art-check` roda THEN the web SHALL sair `0` (todo spec renderiza sem `ERROR` e o resultado é byte a byte igual ao PNG commitado)

**Independent test:** `make art-check` e abrir o contact sheet dos 9.

### S2: hotbar no desktop (P1)

**Acceptance Criteria**

3. The web SHALL mostrar em cada um dos 9 links da nav `Cenas` um `<img src="/art/icon/menu-<id>.png" alt="" width="32" height="32">` com classe `pixelated` dentro de `.tab-icon`, junto do `.tab-num` (`01`–`09`) e do rótulo, na ordem de `TABS` (door 1, door 2)
4. IF o ícone de um slot falha ao carregar THEN the web SHALL remover a imagem e manter número e rótulo do slot
5. WHILE a viewport tem 1200px ou mais the web SHALL mostrar os 9 slots numa linha com a mesma largura (±1px) e cada `.tab-icon` com 44x44px, mantendo `.page` 1200px e a cena 760px
6. WHILE o slot é o da rota atual (`aria-current="page"`) the web SHALL pintar a borda do `.tab-icon` de `rgb(255, 201, 60)`; os outros 8 slots SHALL ter outra cor de borda
7. WHEN um slot recebe foco pelo teclado (`Tab`) THEN the web SHALL mostrar `outline` de 3px `rgb(255, 201, 60)` nele

### S3: atalhos 1–9 (P1)

**Acceptance Criteria**

8. WHEN o dev aperta a tecla `N` de `1` a `9` sem Ctrl, Meta ou Alt e com o foco fora de campo editável THEN the web SHALL navegar para o `href` de `TABS[N-1]` (`1` -> `/`, `3` -> `/server`, `9` -> `/office`) (door 3)
9. IF a tecla vem com Ctrl, Meta ou Alt THEN the web SHALL não navegar
10. IF o foco está num `input`, `textarea`, `select` ou elemento `contenteditable` THEN the web SHALL não navegar
11. IF a tecla não é um dígito de `1` a `9` (`0`, `a`) THEN the web SHALL não navegar
12. WHEN um atalho navega com o menu mobile aberto THEN the web SHALL fechar o menu (`aria-expanded="false"`)

### S4: janela de comando no celular (P1)

**Acceptance Criteria**

13. WHILE a rota atual é uma das 9 cenas the web SHALL mostrar no botão `MENU` o ícone `menu-<id>` da cena com `alt=""` antes do texto, e o texto SHALL continuar `MENU · <rótulo>`; fora de `TABS` o botão SHALL não ter ícone
14. WHILE a viewport tem 360px ou 390px e o menu está aberto the web SHALL mostrar os 9 slots, com ícone, em 3 linhas de 3 colunas, sem rolagem horizontal

**Independent test:** a 390x844, abrir o MENU e ver a janela 3x3 com os ícones; a 1280x800, apertar `4` e cair no DEPLOY.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| MENU-01 | S1 | 1, 2 | Pending |
| MENU-02 | S2 | 3, 4, 5, 6, 7 | Pending |
| MENU-03 | S3 | 8, 9, 10, 11, 12 | Pending |
| MENU-04 | S4 | 13, 14 | Pending |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen hotbar (desktop) | empty state | n/a - são sempre 9 slots fixos (`TABS`) |
| screen hotbar (desktop) | loading state | existing - o frame de carregamento já monta `Tabs`; ícones são estáticos |
| screen hotbar (desktop) | error state | AC 4 (ícone que não carrega) |
| screen hotbar (desktop) | unauthorised state | existing - login e onboarding não montam o frame (responsive, `GameShell`) |
| screen hotbar (desktop) | density and ordering | AC 3 (ordem de `TABS`), AC 5 (uma linha, largura igual) |
| screen hotbar (desktop) | destructive action confirms | n/a - navegar não destrói nada |
| screen janela de comando (mobile) | empty/loading/unauthorised | existing - mesmos 9 slots e o mesmo disclosure de responsive |
| screen janela de comando (mobile) | error state | AC 4 vale para os mesmos slots |
| screen janela de comando (mobile) | density and ordering | AC 14 (3x3, ordem de `TABS`) |
| screen janela de comando (mobile) | destructive action confirms | n/a - navegar não destrói nada |
| collection `web/art/icon/menu-*` | grouping, naming, duplicates | door 1 - `icon/menu-<id>`, prefixo `menu` separa de `skill`, `deploy` etc. |
| collection `web/art/icon/menu-*` | ordering | n/a - arquivos; a tela ordena por `TABS` |
| collection `web/art/icon/menu-*` | the exception that does not fit | n/a - toda cena tem ícone, nenhuma fica sem |
| command `render.py` / `make art-check` | output, flags, exit codes, fails halfway | existing - skill pixel-assets e o `art-check` do game-art; AC 2 |

## Flow

Reusa `GameArt` (endereço, escala inteira, `onError`), o `render.py` da skill pixel-assets com o
`make art-check` do game-art, e o `Tabs` com o disclosure do responsive; nada novo na api.

1. spec `web/art/icon/menu-<id>.json` -> `.claude/skills/pixel-assets/scripts/render.py` (exists) - valida contra a paleta, grava `web/public/art/icon/menu-<id>.png` (door 1)
2. `Tabs` (exists) lê `TABS[].icon` (door 1) e renderiza cada slot com `GameArt` kind `menu` (door 2) dentro de `.tab-icon`; o botão `MENU` mostra o ícone da cena atual
3. `Tabs` (exists) registra um `keydown` no `document` (door 3) que, para `1`–`9` fora de campo editável e sem modificador, chama `router.push(TABS[N-1].href)` e fecha o menu
4. `globals.css` (exists) - estilo de hotbar nas regras base (`.tab`, `.tab-icon`, ativo, foco) e a grade 3x3 da janela de comando dentro do bloco `@media (max-width: 1199px)` que já existe (responsive door 1)

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; nenhuma rota da api muda

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Endereço dos ícones de cena | `TABS` ganha `icon: "titulo" \| "mundo" \| "server" \| "deploy" \| "bug-fight" \| "skills" \| "loja" \| "avatar" \| "office"`; arquivo `web/art/icon/menu-<icon>.json` -> `web/public/art/icon/menu-<icon>.png` (mesma regra `<kind>-<key>` do game-art door 1) | derivar do `href`: `/` não tem slug e renomear uma rota renomearia o arquivo; reusar arte do catálogo: rejeitado pelo usuário (símbolos ambíguos) |
| 2. `ArtKind` ganha `menu` | `export type ArtKind = ... \| "hud" \| "menu"`; `artSrc("menu", id)` = `/art/icon/menu-<id>.png`, nativo 16 | `<img>` solto no `Tabs`: perde o `onError` e a escala inteira que o `GameArt` já garante; um segundo componente de arte seria a segunda regra que o game-art door 2 evita |
| 3. Atalho global de teclado (precedente para os próximos) | `useEffect` em `Tabs` com `document.addEventListener("keydown", ...)`; ignora `e.ctrlKey \|\| e.metaKey \|\| e.altKey`, `e.defaultPrevented` e alvo `input, textarea, select, [contenteditable]`; aceita só `e.key` de `"1"` a `"9"` | `accesskey` nos links: o browser decide o modificador (Alt+Shift, Ctrl+Option) e não dá para usar só o dígito; listener em cada cena: nove cópias da mesma guarda |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | termo novo de UI: slot (um link da hotbar); nenhum termo de jogo muda |
| tests | `Tabs.test.tsx`, `GameShell.test.tsx` e `Hud.test.tsx` mockam `next/navigation` só com `usePathname`; `Tabs` passa a usar `useRouter`, então os três mocks ganham `useRouter` |
| tests | game-art C1 (`GameArt` kinds, 9) ganha o 10º kind `menu`; `art.test.tsx` ganha o grupo `menu`; `make art-check` passa a incluir os 9 specs |
| tests | responsive C1–C26 continuam valendo sem mudança de assert (texto do MENU, 3x3, 24px, desktop 1200/760, 9 links na mesma linha) |
| stored data | nothing to migrate |
