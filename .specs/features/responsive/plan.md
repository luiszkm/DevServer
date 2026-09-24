# Responsive

Sources:

- conversa 2026-09-24 - "deixar o layout responsivo para poder jogar pelo celular"; decisões do usuário: retrato com reflow (não escalar o frame, não só paisagem) e menu hambúrguer para as 9 cenas
- `web/src/app/globals.css` - o layout de hoje: `.page` 1200px, `.scene` 760px, painéis laterais de 340–466px, grades de 5–8 colunas
- `.specs/STATE.md` - AD-007 (desktop-first 1200px, identidade visual do protótipo), que esta feature substitui na parte do layout
- `.specs/features/game-art/checks.md` C33 - fundos de cena a `1280px 720px` com `pixelated`, que continua valendo

## Problem

O jogo só cabe numa janela de 1200px ou mais. `.page` tem `width: 1200px` fixo, cada cena tem
`height: 760px` com `overflow: hidden`, e as cenas dividem a largura entre um painel principal e
um lateral de largura fixa (MUNDO 352px, DEPLOY 340px, BUG FIGHT 390px, LOJA 340px, AVATAR e
OFFICE 466px, SERVER 430px). Num celular (360–430px de largura) o dev vê um pedaço do frame,
rola na horizontal para achar o resto, e o que passa da altura de 760px some cortado. Login e
onboarding têm painel de 460px, maior que a tela. O HUD tem seis cartões em linha de 140px de
altura. Na prática não dá para jogar pelo celular. Não há números de uso; o pedido do usuário é a
evidência.

Quando isto for entregue, o dev abre o jogo no celular em retrato, troca de cena por um menu,
e cada cena mostra tudo em uma coluna que rola na vertical, sem rolagem horizontal, com cada
botão tocável. No desktop (1200px ou mais) nada muda.

## Out of scope

| Excluded | Why |
| --- | --- |
| Layout próprio para tablet ou paisagem | decisão do usuário: retrato com reflow; abaixo de 1200px vale o layout de coluna (ver assumptions) |
| Escalar o frame com `transform: scale` | rejeitado pelo usuário: texto pixel de 8–11px fica ilegível |
| Gestos (swipe entre cenas, pinch) | não pedido; navegação é o menu |
| PWA, instalação, modo offline | não pedido |
| Arte nova ou redimensionada | fundos continuam ×4 (1280x720, game-art C33) e são recortados pela cena; ícones e sprites nos tamanhos de hoje |
| Mudar ordem, texto ou comportamento das cenas | só a disposição muda; toda regra de jogo continua na api |
| Estados de hover para toque | `:hover` continua como está; no toque ele só não aparece |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estratégia | abaixo do breakpoint cada cena vira uma coluna: painel lateral desce abaixo do principal, cena com altura automática e rolagem vertical da página | decisão do usuário (retrato, reflow) | y |
| Navegação | menu hambúrguer: botão `MENU` abre/fecha a mesma `<nav aria-label="Cenas">` com os 9 links | decisão do usuário | y |
| Breakpoint | um só: `max-width: 1199px`; de 1200px para cima o layout de hoje, idêntico | o layout fixo precisa de 1200px; qualquer largura menor hoje já rola na horizontal; um breakpoint = um layout a provar | n |
| Larguras-alvo | 360px (Android pequeno) e 390px (iPhone) em retrato; desktop provado em 1280px | as menores telas comuns; se cabe em 360, cabe em 430 | n |
| Alvo de toque | todo botão, link e input fora da key art com pelo menos 24x24 CSS px | WCAG 2.2 AA 2.5.8 (mínimo); o pixel-art não comporta 44px em toda célula de grade | n |
| Hotspots da tela-título | continuam em % sobre a key art, que escala para a largura da tela; ficam fora da regra de 24px | as placas medem ~48x14px em 360px; os mesmos destinos estão no menu | n |
| Nomes no mapa do MUNDO | no mobile o mapa mostra só os marcadores (sem `node-chip`); os nomes estão nos cartões da lista logo abaixo | "MERCADO DE PACOTES" em fonte pixel passa de 150px e sai do mapa de ~330px | n |
| Rótulo do botão de menu | `MENU` seguido do nome da cena atual (`MENU · DEPLOY`); fora de uma das 9 rotas, só `MENU` | o dev vê onde está sem abrir o menu | n |
| Fechar o menu | fecha ao tocar num link, ao tocar de novo no botão, e com `Escape` (foco volta ao botão) | padrão de disclosure (WAI-ARIA APG) | n |
| Branch | `feat/responsive` a partir de `feat/game-art` | as cenas com arte só existem nessa branch | n |

**Open questions:** none - all resolved or logged above.

## Criteria

### S1: menu de cenas no celular (P1)

**Acceptance Criteria**

1. WHILE a largura da viewport é no máximo 1199px the web SHALL esconder os links da `<nav aria-label="Cenas">` e mostrar um botão cujo nome acessível começa com `MENU`, com `aria-expanded="false"` e `aria-controls` igual ao `id` da nav
2. WHEN o dev toca no botão `MENU` fechado THEN the web SHALL mostrar os 9 links da nav (TÍTULO, MUNDO, SERVER, DEPLOY, BUG FIGHT, SKILLS, LOJA, AVATAR, OFFICE) e pôr `aria-expanded="true"`
3. WHEN o dev toca num link do menu aberto THEN the web SHALL navegar para o `href` do link e fechar o menu (`aria-expanded="false"`, links escondidos)
4. WHEN o dev toca no botão `MENU` aberto THEN the web SHALL fechar o menu
5. IF o dev aperta `Escape` com o menu aberto THEN the web SHALL fechar o menu e pôr o foco no botão `MENU`
6. WHILE a rota atual é uma das 9 cenas the web SHALL mostrar no botão o texto `MENU · <rótulo da aba>` (ex.: `MENU · DEPLOY` em `/deploy`) e o link da cena atual SHALL manter `aria-current="page"`

**Independent test:** abrir o jogo a 390x844, tocar `MENU`, ir para DEPLOY, ver o menu fechar e o botão dizer `MENU · DEPLOY`.

### S2: cada tela cabe em 360px (P1)

**Acceptance Criteria**

7. WHILE a largura da viewport é 360px ou 390px the web SHALL renderizar TÍTULO, MUNDO, SERVER, DEPLOY, BUG FIGHT, SKILLS, LOJA, AVATAR e OFFICE sem rolagem horizontal (`document.documentElement.scrollWidth <= window.innerWidth`)
8. WHILE a largura da viewport é 360px the web SHALL manter todo botão, link e input visível de cada uma das 9 cenas e do HUD com a caixa inteira dentro de `[0, innerWidth]`
9. WHILE a largura da viewport é 360px the web SHALL renderizar todo botão, link e input visível das 9 cenas, do HUD e do menu, exceto os hotspots dentro de `.title-art`, com pelo menos 24x24 CSS px
10. WHILE a largura da viewport é no máximo 1199px the web SHALL deixar a altura da cena seguir o conteúdo, de modo que o último botão de cada uma das 9 cenas seja alcançável rolando a página na vertical (nenhum conteúdo cortado pelo `overflow: hidden` da cena)
11. WHILE a largura da viewport é no máximo 1199px the web SHALL mostrar os seis cartões do HUD (LEVEL/XP, HP, COINS, GEMS, SKILL PTS, nome + SAIR) dentro da largura da tela
12. WHILE a largura da viewport é no máximo 1199px the web SHALL escalar a key art da tela-título para a largura do frame mantendo a proporção 1200:960, com cada hotspot dentro da caixa da imagem
13. WHILE a largura da viewport é no máximo 1199px the web SHALL mostrar no mapa do MUNDO os 6 marcadores de região dentro da caixa do mapa e esconder os `node-chip`
14. WHILE a largura da viewport é 360px the web SHALL renderizar login, onboarding (criar dev), a tela de servidor fora do ar e o estado carregando sem rolagem horizontal e com os botões e o input dentro de `[0, innerWidth]`

**Independent test:** a 360x740, logar, abrir cada cena pelo menu e rolar até o fim sem arrastar para o lado.

### S3: desktop inalterado (P1)

**Acceptance Criteria**

15. WHILE a largura da viewport é 1200px ou mais the web SHALL renderizar `.page` com 1200px de largura, `.scene` com 760px de altura, a nav com os 9 links visíveis em linha e nenhum botão `MENU` visível
16. The web SHALL manter o fundo das cenas MUNDO, SERVER, OFFICE e BUG FIGHT com `background-size: 1280px 720px` e `image-rendering: pixelated` em 360px e em 1280px

**Independent test:** a 1280x800, comparar cada cena com o `main` de hoje; os e2e existentes passam sem mudança.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| RESP-01 | S1 | 1, 2, 3, 4, 5, 6 | Verified |
| RESP-02 | S2 | 7, 8, 9, 10 | Verified |
| RESP-03 | S2 | 11, 12, 13, 14 | Verified |
| RESP-04 | S3 | 15, 16 | Verified |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screens das 9 cenas | empty state | existing - cada cena já tem o seu (inventário vazio, slot `[ ]`/`-`/`+`); AC 7–10 valem para ele como para o cheio |
| screens das 9 cenas | loading state | AC 14 (frame vazio + HUD `CARREGANDO...`) |
| screens das 9 cenas | error state | AC 14 (servidor fora do ar); mensagens `role="alert"` de cada cena ficam na coluna, AC 7 |
| screens das 9 cenas | unauthorised state | AC 14 (login) |
| screens das 9 cenas | density and ordering | AC 10 - mesma ordem do DOM, painel lateral abaixo do principal; AC 9 fixa o alvo de toque |
| screens das 9 cenas | destructive action confirms | n/a - nenhuma ação nova; comprar, equipar, remover e SAIR inalterados |
| screen onboarding | empty/error state | AC 14 - erro de nome (`field-error`) fica no painel |
| menu de cenas | empty state | n/a - são sempre 9 links fixos (`TABS`) |
| menu de cenas | loading state | n/a - estático, renderiza com o frame |
| menu de cenas | error state | n/a - não chama api |
| menu de cenas | unauthorised state | existing - login e onboarding não montam o frame, logo não têm menu |
| menu de cenas | density and ordering | AC 2 - mesma ordem de `TABS` |
| menu de cenas | destructive action confirms | n/a - navegar não destrói nada |

## Flow

Reusa a mesma `<nav aria-label="Cenas">` e o mesmo array `TABS`; o celular não ganha uma segunda
navegação, só um botão que mostra e esconde a que existe. O resto é CSS nas classes que já existem.

1. `GameShell` (exists) monta `Frame` com `Tabs` (exists) - `Tabs` passa a ter o botão `MENU` e o estado aberto/fechado (door 3); `usePathname` dá o rótulo da cena atual e fecha o menu ao navegar
2. `globals.css` (exists) - um bloco `@media (max-width: 1199px)` (door 1) sobrescreve `.page`, `.scene`, `.hud` e o layout de cada cena para uma coluna; a mesma regra esconde a nav fechada e mostra o botão
3. `LoginScreen` (exists), `Onboarding` (exists), `ServerDown` (exists) - só CSS: painel com `max-width: 100%`
4. out: HTML e CSS servidos pelo Next; nenhuma chamada nova à api

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside; nenhuma rota da api muda

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. Convenção de responsividade (precedente que toda cena nova copia) | um único bloco `@media (max-width: 1199px) { ... }` no fim de `globals.css`, com os overrides agrupados por cena na mesma ordem das regras de desktop; desktop continua sendo a regra base | container queries por componente: não existem no repo e espalham o breakpoint por cada seletor; `matchMedia` em JS: renderiza diferente no servidor e no cliente (hydration mismatch) e jsdom não avalia |
| 2. Decisão de projeto AD-015 substitui a parte de layout de AD-007 | `UI pt-BR com identidade visual do protótipo; layout desktop 1200px a partir de 1200px de largura, abaixo disso uma coluna com menu hambúrguer (max-width: 1199px)` | manter AD-007 e tratar mobile como exceção: toda feature seguinte desenharia só para 1200px e quebraria o celular sem que nenhuma decisão ativa dissesse o contrário |
| 3. Padrão de menu (precedente para próximos menus) | disclosure: `<button type="button" aria-expanded aria-controls="cenas-nav">` + a `<nav id="cenas-nav" aria-label="Cenas" data-open="true\|false">` existente; CSS esconde os links quando `data-open="false"` só dentro do bloco da door 1 | drawer em `<dialog>`: traz focus trap e backdrop que um menu de 9 links não precisa; segunda `<nav>` só para mobile: dois landmarks com o mesmo nome, e os e2e que usam `getByRole("navigation", { name: "Cenas" })` ficam ambíguos |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | nenhum termo novo; `MENU` é só rótulo de UI |
| decisions | AD-007 passa a `superseded by AD-015` (door 2); quem desenhava só para 1200px agora desenha também a coluna |
| tests | e2e existentes rodam na viewport padrão do Playwright (1280x720), acima do breakpoint - continuam passando sem mudança (AC 15); game-art C33 continua valendo (AC 16) |
| stored data | nothing to migrate |
