# Fidelidade da arte

Sources:

- conversa 2026-09-26 - a arte do jogo deve seguir a qualidade da key art e da folha, nos tamanhos nativos que o jogo já usa
- `web/public/assests_keyart.png` - **binding para o inventário e o estilo**: a célula de cada objeto da folha é a referência do twin
- `web/public/keyart.png`, `web/public/female_keyart.png` - estilo e herói; paleta em `.claude/skills/pixel-assets/references/palette.json`; regras em `references/style-guide.md`
- `.specs/features/assets/plan.md` - inventário da folha, tamanhos nativos e o rig do herói (`hero_anim.py` gera as strips; edita-se o rig, não a strip)
- `.specs/STATE.md` - AD-015 (identidade visual do protótipo); esta feature conforma, não substitui

## Problem

O jogo já tem a imagem de cada coisa (639 PNG em `web/public/art`: 134 ícones 16×16, 19 fundos 320×180, 10 peças de UI 24×24, 15 fx 128×32, 12 tiles, sprites e 325 strips de animação do herói). Quem entra pela tela-título vê a key art e, na folha, uma moeda redonda com cunho, um slime com volume e cenários com cidade e lua. No HUD a moeda é um disco com um furo quadrado. O recorte da moeda na folha (`assests_keyart.png` `1152,108,56,52`), colapsado por `trace.py` para 16×16, tem IoU de silhueta **0,627** com `icon/hud-coin.png`. O traço cru cobre **0%** da borda com `ink`. Contorno ≥ 90% e “3 tons” não separam os dois: a moeda atual tem os dois e ainda é o furo. A fonte não dá número de uso; a comparação e a conversa são a evidência.

Quando isto for entregue, cada objeto que a folha desenha coincide com a célula dela na silhueta, já com contorno `ink` e um brilho só, no mesmo tamanho e no mesmo lugar da tela. O que a folha não desenha e hoje falha luz ou contorno é redesenhado até passar. O que já passa fica.

## Out of scope

| Excluded | Why |
| --- | --- |
| Mudar tamanho nativo, `GameArt.nativeSize`, escala na tela ou o fundo CSS 1280×720 | a conversa fixou o canvas; pixel maior na tela é outro jogo |
| Editar `keyart.png`, `female_keyart.png`, `assests_keyart.png` | são a referência, não a saída |
| PNG solto, sem spec, ou cor fora da paleta | `render.py` já recusa; `make art-check` exige spec = PNG |
| Texto dentro da imagem, fora do `sprite/logo` já existente | style guide; rótulos continuam HTML `.pixel` |
| Colapsar cada penteado e cada laptop do herói no único corpo da folha | a folha mostra um traje; as variantes são catálogo |
| Animação nova de inimigo, mapa de tiles jogável, entrada nova de catálogo | não é redraw; o inventário não cresce |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tamanho | cada spec mantém o `size` que tem em `main` | conversa 2026-09-26: a qualidade cabe na grade atual | y |
| Referência dos twins | `assests_keyart.png`, caixa por asset; `keyart.png` e `female_keyart.png` só se a folha não tiver a célula | a folha é o binding de inventário em `.specs/features/assets/plan.md` | y |
| Limiar de silhueta | IoU ≥ 0,80 entre a máscara opaca do PNG e a máscara opaca do `trace.py` dessa caixa, no `size` do spec | a moeda atual marca 0,627 numa caixa real; 1,00 exigiria o traço cru, que tem 0% de `ink` | n |
| Quem é twin | exatamente as chaves da tabela Twin set; nenhuma a mais | caixa a mais deixaria um ícone de skill “passar” contra um recorte qualquer | n |
| Catálogo que já passa | não se redesenha só para trocar bytes | redesenhar o que já passa o checklist pode piorar; twin é sempre redesenhado porque o IoU exige | n |
| Contorno no renderer | `render.py` continua em `WARN` abaixo de 90% `ink` | 12 camadas em `sprite/hero/` estão abaixo de 0,90 (óculos 0,00, mão 0,79); virar `ERROR` quebra o herói empilhado, cuja borda mora na camada do corpo | n |
| Strips | `category: anim` continua saída de `hero_anim.py`; não entra no IoU nem na luz | o plano de assets já fixou o rig | y |
| Cantos do 9-slice | as peças `ui-*` continuam 24×24 com o corte CSS de 8px | o chrome já usa `border-image` 8; mudar o corte move todo painel | y |
| Brilho | um pixel, `white` ou o último índice da rampa com mais pixels não-`ink` | style guide: um specular em superfície brilhante | n |
| Luz | luminância média (0,2126 R + 0,7152 G + 0,0722 B) dos pixels não-`ink` nos 40% de cima da caixa opaca, menos a dos 40% de baixo, > 0 | é a luz da esquerda-de-cima medida; `office.png` dá −17,7 | n |
| Branch | `feat/art-fidelity` a partir de `main` | `main` é a linha atual | n |

**Open questions:** none - all resolved or logged above.

## Criteria

### Twin set

Chave = caminho do spec sem `.json`. Fonte default `assests_keyart.png`.

- ui: `ui/ui-panel`, `ui/ui-panel-wood`, `ui/ui-btn-wood`, `ui/ui-btn-wood-press`, `ui/ui-btn-dark`, `ui/ui-btn-dark-press`, `ui/ui-btn-green`, `ui/ui-btn-green-press`, `ui/ui-bubble`, `ui/ui-bar`
- icon btn: `icon/btn-build`, `icon/btn-deploy`, `icon/btn-play`, `icon/btn-rank`, `icon/btn-start`, `icon/btn-settings`, `icon/btn-shop`, `icon/btn-exit`
- icon ic: `icon/ic-code`, `icon/ic-cloud`, `icon/ic-server`, `icon/ic-gear`, `icon/ic-trophy`, `icon/ic-star`, `icon/ic-crown`, `icon/ic-laptop`, `icon/ic-database`, `icon/ic-shield`, `icon/ic-lock`, `icon/ic-file`, `icon/ic-wrench`, `icon/ic-chart`, `icon/ic-sp`
- medal: `icon/medal-bronze`, `icon/medal-prata`, `icon/medal-ouro`, `icon/medal-azul`, `icon/medal-roxo`, `icon/medal-rubi`
- hud: `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart`, `icon/hud-xp`
- logo: `sprite/logo`
- prop: `sprite/prop-laptop`, `sprite/prop-macbook`, `sprite/prop-rack`, `sprite/prop-caixa`, `sprite/prop-caixa-aberta`, `sprite/prop-monitor`, `sprite/prop-roteador`, `sprite/prop-planta`, `sprite/prop-caneca`, `sprite/prop-livros`, `sprite/prop-bloco-grama`, `sprite/prop-terminal`, `sprite/prop-torre`, `sprite/prop-gema-pedestal`, `sprite/prop-modem`
- build: `sprite/build-server-hut`, `sprite/build-rack`, `sprite/build-tenda`, `sprite/build-antena`, `sprite/build-placa-code`, `sprite/build-flag`, `sprite/build-placa`
- mob e npc: `sprite/mob-slime`, `sprite/mob-slime-verde`, `sprite/mob-monstro`, `sprite/mob-robo`, `sprite/npc-dev`
- extra: `sprite/extra-placa`, `sprite/extra-fogueira`, `sprite/extra-lampada`, `sprite/extra-banco`, `sprite/extra-bau`, `sprite/extra-bau-aberto`, `sprite/extra-bandeira`
- fx: `fx/dust`, `fx/sparkle`, `fx/teleport`, `fx/fire`, `fx/loading`, `fx/collect`
- scene: `background/scene-dia`, `background/scene-noite`, `background/scene-floresta`, `background/scene-dungeon`
- tile: `tile/grama-topo`, `tile/grama`, `tile/grama-borda`, `tile/terra`, `tile/pedra`, `tile/tijolo`, `tile/tabua`, `tile/parede-madeira`, `tile/areia`, `tile/agua`, `tile/agua-funda`, `tile/cachoeira`
- decalque: `sprite/tile-arbusto`, `sprite/tile-flor`, `sprite/tile-arvore`, `sprite/tile-cerca`, `sprite/tile-arvore-grande`

Brilho (um pixel): `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart`, as seis `icon/medal-*`, `sprite/mob-slime`, `sprite/mob-slime-verde`, `sprite/prop-gema-pedestal`.

### S1: o HUD coincide com a folha (P1)

**Acceptance Criteria**

1. WHEN `sheet-index.json` é lido THEN the index SHALL ter uma caixa `[x, y, w, h]` para `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart` e `icon/hud-xp`, e nenhuma outra chave de hud
2. WHEN o PNG de cada uma dessas quatro chaves é comparado ao `trace.py` da caixa dela em 16×16 THEN the IoU das máscaras opacas SHALL ser ≥ 0,80
3. WHEN a borda de cada uma dessas quatro é medida THEN the parcela de pixels de borda (vizinho transparente de 4) cuja cor está na rampa `ink` SHALL ser ≥ 0,90
4. WHEN cada uma das quatro brilhantes (`hud-coin`, `hud-gem`, `hud-heart`) é medida THEN the PNG SHALL ter exatamente 1 pixel igual a `white` ou ao último índice da rampa não-`ink` mais frequente
5. The `size` de cada spec dessas quatro SHALL permanecer `[16, 16]`, e `GameArt` com `kind="hud"` e `scale={2}` SHALL continuar a renderizar `width` 32

**Independent test:** abrir o HUD ao lado do recorte da moeda na folha; a silhueta deixa de ser o disco furado. O teste de fidelidade falha se o IoU de `hud-coin` continuar 0,627.

### S2: cada objeto da folha coincide com a célula dele (P1)

**Acceptance Criteria**

6. WHEN `sheet-index.json` é lido THEN the chaves SHALL ser exatamente as da tabela Twin set
7. WHEN o PNG de cada chave da Twin set é comparado ao `trace.py` da caixa dela, no `size` do spec em `main` THEN the IoU das máscaras opacas SHALL ser ≥ 0,80
8. WHEN a borda de cada chave da Twin set cuja categoria é `icon` ou `sprite` é medida THEN the parcela `ink` SHALL ser ≥ 0,90
9. WHEN cada chave da lista de brilho é medida THEN the PNG SHALL ter exatamente 1 pixel de specular, pela mesma regra do critério 4
10. The `size` de cada spec da Twin set SHALL ser igual ao `size` desse spec em `main`
11. IF uma chave da Twin set está ausente do índice ou o `trace.py` dessa caixa devolve média de distância > 24 THEN the fidelidade SHALL falhar, sem gravar o spec

**Independent test:** uma folha de contato das chaves da Twin set contra os recortes; `mob-slime` e `background/scene-dia` passam de 0,80 e um ícone fora da tabela não entra no índice.

### S3: o que a folha não desenha e hoje falha a luz ou o contorno (P2)

Catálogo = spec em `web/art` cuja chave não está na Twin set e cuja `category` não é `anim` nem o caminho `sprite/hero/`.

**Acceptance Criteria**

12. WHEN um ícone ou sprite do catálogo é medido THEN the parcela `ink` da borda SHALL ser ≥ 0,90 e a diferença de luminância (40% de cima menos 40% de baixo, fórmula das Assumptions) SHALL ser > 0
13. WHEN um fundo do catálogo (`battle-*`, `region-*`, `office`, `server`, `world`) é medido THEN the PNG SHALL ter 320×180, 0 pixels transparentes, a mesma diferença de luminância > 0, e o spec SHALL ter pelo menos 1 op `use`
14. WHEN um fx do catálogo (os 15 menos os 6 da Twin set) é medido THEN the PNG SHALL permanecer 128×32 com 4 quadros 32×32, nenhum quadro igual a outro, e nenhum pixel na margem de 1px do quadro
15. WHEN um tile do catálogo existe THEN the sistema SHALL não ter tile fora da Twin set; os 12 tiles e os 5 decalques estão na tabela
16. The `size` de cada spec do catálogo SHALL ser igual ao `size` desse spec em `main`

**Independent test:** `office.png` hoje mede −17,7 na luz e passa a > 0 sem deixar de ser 320×180 opaco; um ícone que já mede contorno ≥ 0,90 e luz > 0 permanece byte a byte.

### S4: o herói continua saindo do rig (P2)

**Acceptance Criteria**

17. WHEN `hero_anim.py` roda sobre `web/art/sprite/hero` THEN each PNG em `web/public/art/sprite/hero/anim/` SHALL ser idêntico ao que o script escreve
18. The fidelidade SHALL não exigir IoU nem contorno ≥ 0,90 nas camadas em `web/art/sprite/hero/` nem nas strips `anim`
19. IF uma camada em `web/art/sprite/hero/` muda THEN the cinco strips dessa camada (`idle`, `walk`, `run`, `jump`, `interact`) SHALL ser regeneradas pelo `hero_anim.py` no mesmo commit

**Independent test:** alterar um pixel de `hero/body.json` sem regenerar faz o critério 17 falhar; regenerar as cinco strips faz passar.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| ART-01 | S1 | 1, 2, 3, 4, 5 | Pending |
| ART-02 | S2 | 6, 7, 8, 9, 10, 11 | Pending |
| ART-03 | S3 | 12, 13, 14, 15, 16 | Pending |
| ART-04 | S4 | 17, 18, 19 | Pending |

**ID format:** `ART-NUMBER`. **Status:** Pending → In checks → Implementing → Verified.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| collection `web/art` | grouping | AC 6 — Twin set contra o resto (catálogo, rig) |
| collection `web/art` | naming | existing - o caminho continua `web/art/<category>/<name>.json` e o PNG em `web/public/art/` |
| collection `web/art` | duplicates | existing - variante de cor continua `use` + `recolor`, como o style guide |
| collection `web/art` | ordering | n/a - asset não é lista que o jogador ordena |
| collection `web/art` | exception that does not fit | AC 17 — strips `anim` são geradas, não traçadas |
| screen HUD | empty state | n/a - com dev criado o HUD sempre tem as quatro imagens; esta feature não cria estado |
| screen HUD | loading | existing - `GameArt` mostra o `fallback` glifo se o PNG falha |
| screen HUD | error state | existing - o mesmo `onError` do `GameArt` |
| screen HUD | unauthorised | n/a - `GameShell` manda para `/login` antes da cena |
| screen HUD | density and ordering | AC 5 — 16×16 nativo, `scale` 2, `width` 32, mesma ordem do HUD |
| screen HUD | destructive action confirms | n/a - redraw não tem ação destrutiva |
| screen batalha, mundo, escritório, servidor, deploy, skills, loja, avatar, login | empty, loading, error, unauthorised, destructive | n/a - nenhuma dessas telas ganha estado; só mudam pixels nos `src` que já existem |
| screen essas mesmas | density and ordering | AC 10 e AC 16 — `size` e portanto `width`/`height` iguais aos de `main` |
| document style guide | structure, tone, depth, next action | n/a - as regras de desenho já estão no guia; o limiar mora no índice e no teste, não num segundo guia |
| command `make art-check` | output, flags, exit, failure halfway | existing - sai 0 quando o PNG versionado é igual ao `render.py`; sai diferente de 0 no primeiro diff |

## Flow

O redraw reusa `trace.py` (o colapso do recorte na paleta), `render.py`, `hero_anim.py` e `make art-check`. Não há segundo renderer.

1. A caixa em `web/art/sheet-index.json` (door 1) entra no `trace.py` (exists), que devolve um spec de `grid` no `size` do asset
2. O spec é limpo (contorno `ink`, um specular na lista de brilho) e o `render.py` (exists) grava o PNG em `web/public/art`
3. Uma camada em `web/art/sprite/hero/` que mudou entra no `hero_anim.py` (exists), que regrava as cinco strips
4. out: `make art-check` (exists) compara a árvore renderizada com `web/public/art`

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside. Os `src` `/art/...` e os `width`/`height` que o `GameArt` já publica continuam os mesmos.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Índice de recortes | `web/art/sheet-index.json`: objeto cuja chave é `icon/hud-coin` e o valor é `{"source":"assests_keyart.png","box":[x,y,w,h]}`; as chaves são exatamente a Twin set | um PNG de referência por asset — segunda fonte ao lado da folha, e o `art-check` não sabe qual é a verdadeira |
| Silhueta | IoU ≥ 0,80 das máscaras opacas contra o `trace.py` da caixa, não igualdade byte a byte | igualdade com o traço cru — o traço da moeda tem 0% de borda `ink`, contra o style guide |
| Onde o contorno falha o build | o teste de fidelidade falha ícone e sprite soltos abaixo de 0,90 `ink`; `render.py` segue em `WARN` | promover o `WARN` a `ERROR` no `render.py` — óculos e mão do herói ficam abaixo de 0,90 de propósito, porque a borda está na camada do corpo |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | existing term: nenhum termo de jogo muda de significado — `glyph`, `kind` e o caminho `/art/<category>/<name>.png` continuam o que `GameArt` e os testes de tela já ramificam |
| stored data | nothing to migrate — PNG e spec no mesmo caminho; não há linha de jogador |
| screens | pixels nos mesmos `src`; `width` e `height` do `GameArt` não mudam, então asserção de tamanho em `GameArt.test.tsx` e `Tabs.test.tsx` continua válida |
| hero | strip em `sprite/hero/anim/` muda só se a camada mudar, e nesse caso as cinco anims da camada mudam juntas (AC 19) |
| chrome | peças `ui-*` mudam de pixel e continuam 24×24 com corte 8; `.panel` e os botões que usam `border-image` mostram o desenho novo sem troca de CSS |
