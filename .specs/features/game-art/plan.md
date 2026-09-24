# Game art

Sources:

- conversa 2026-09-24 - levantamento de onde falta arte; escopo = os quatro grupos (combate; loja + skills + deploy; escritório + servidor; HUD + mapa + fundos); gerar **e** integrar nas telas
- `web/public/keyart.png` - **binding para o estilo**: toda arte segue `.claude/skills/pixel-assets/references/style-guide.md` (lido da key art) e a paleta `references/palette.json`
- `api/catalog/*.json` - **binding para o inventário**: cada entrada com `glyph` é um asset; o campo `name` é o texto alternativo
- `.specs/features/{bug-fight,office,server-room,shop-inventory-avatar}/plan.md` - os `Out of scope` "arte não existe; glifos como no protótipo" que esta feature fecha
- `.specs/STATE.md` - AD-003 (catálogo é dado do Go), AD-007 (identidade visual do protótipo)

## Problem

Fora da tela-título (key art) e do sprite do herói, o jogo não tem nenhuma imagem. Tudo que o dev
vê em combate, loja, avatar, skills, deploy, escritório, sala de servidores e mapa é um glifo ASCII
do catálogo (`(0x0)`, `[Mac]`, `{C}`, `::`) dentro de um quadrado, ou um gradiente CSS no lugar de
cenário. Seis planos anteriores adiaram a arte com o mesmo motivo: "arte não existe". O resultado é
que a identidade 16-bit prometida pela key art some assim que o jogador passa da tela-título, e
glifos repetidos confundem itens diferentes (`[==]` é MONITOR ULTRAWIDE e MESA EM L; `::` é
MICROSSERVIÇOS, CONTAINERS, CPU 8-CORE e RACK CASEIRO; `</>` é FRONTEND, MARKUP SEMÂNTICO e ESSÊNCIA
DE LOG). Não há números de uso; o levantamento e a decisão do usuário são a evidência.

Levantamento (72 assets, cada um ligado a uma entrada do catálogo ou a um cenário):

| Grupo | Assets | Onde aparece hoje como glifo/CSS |
| --- | --- | --- |
| inimigos | 6 sprites (`combat.json` `enemies`, chave = `region`) | `BattleScene` `.battle-sprite` |
| itens (drops + consumíveis) | 9 ícones (`combat.json` `items`) | `BattleScene` inventário, `ShopScene`, `AvatarScene` |
| equipamentos | 6 ícones (`shop.json` `gear`) | `ShopScene`, `AvatarScene` (grade, slot, detalhe) |
| skills | 9 ícones (`skills.json` nós) | `SkillsScene`, chips do `Hud` |
| tipos de deploy | 5 ícones (`deploys.json` `types`) | `DeployScene` |
| componentes do rack | 6 ícones (`rack.json` `components`) | `ServerScene` (slots e loja) |
| móveis | 12 ícones (`office.json` `furniture`) | `OfficeScene` (loja, detalhe, células) |
| HUD | 4 ícones: coin, gem, coração (HP), XP | `Hud` (hoje só texto) |
| regiões | 6 ícones de marcador (`regions.json`) | `WorldScene` `.node-diamond` |
| cenários | 9 fundos: batalha × 6 regiões, mapa-múndi, escritório, sala de servidores | `.battle`, `.world-map`, `.office-room`, `.server` (cor/gradiente) |

Quando isto for entregue, cada coisa do catálogo tem uma imagem própria no estilo da key art em
todas as telas onde aparece, cada região tem cenário de batalha e marcador no mapa, e o HUD mostra
moeda, gema, coração e XP como na key art.

## Out of scope

| Excluded | Why |
| --- | --- |
| Painéis e botões 9-slice (`border-image`) | não escolhido no levantamento; troca o chrome de todas as telas |
| Sprite por skin | skin continua `filter` sobre `hero.png` (shop-inventory-avatar door 9) |
| Animação (frames, golpe, idle) | nenhum spec de arte tem frames; é outra feature |
| Glifos nos rótulos de comando do Bug Fight (`</> MARKUP`, `$_ API`) | são texto do botão em `combat.json` `commands.label`, não um campo de arte |
| Remover `glyph` do catálogo | continua sendo o fallback (AC 5) e o texto dos comandos; mudar a API não compra nada |
| Tela-título, login, onboarding | já usam `keyart.png` / não têm glifo |
| Cenário do `/deploy` e `/skills` | não escolhido no levantamento (fundos = batalha, mapa, escritório, servidor) |
| Editar `keyart.png` ou `hero.png` | fonte do estilo, não saída |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo | os 72 assets do levantamento, todos integrados | decisão do usuário (4 grupos + integrar) | y |
| Tamanho nativo | ícones 16x16; inimigos 32x32, RACE CONDITION (`torre`) 48x48, MEMORY LEAK ANCESTRAL (`nuvem`) 64x64; fundos 320x180 | tamanhos do style guide; chefes maiores como o guia sugere para boss | y |
| Escala na tela (inteira) | ícone em lista/célula/chip ×2 (32px); ícone em detalhe da loja ×4 (64px); ícone no HUD ×2; inimigo ×4 / ×3 / ×2 (128 / 144 / 128px, cabe no `.battle-sprite` 180x150); fundo ×4 (1280x720) centralizado sobre a cor atual da cena | style guide: só múltiplos inteiros; ×2 cabe nas caixas atuais (32–38px) | y |
| Texto alternativo | `alt=""` onde o nome do catálogo já está escrito no mesmo cartão/botão; `alt=<name>` onde a imagem está sozinha (sprite do inimigo, célula da grade do avatar, chips de skill do HUD; os outros sítios mostram o nome ao lado - exemplos corrigidos na derivação dos checks) | style guide (`alt` pt-BR, `""` para decoração); evita o leitor de tela ler o nome duas vezes e mantém o nome acessível dos botões (`DeployScene.test` usa `name: t.name`) | y |
| Chave do inimigo | `region` | `Enemy` não tem `id`; `catalog.Enemy(region)` e `enemyOf` já buscam por região; uma região, um inimigo | y |
| Estados do marcador no mapa | região atual: moldura amarela como hoje (`.here`); liberada: imagem normal; bloqueada (`level < minLevel`): imagem com `filter: grayscale(1) brightness(.6)` | os três estados do `.node-diamond` hoje, sem arte extra | y |
| Cor do catálogo (`color` em rack e móveis) | rack: o ícone fica sobre o fundo `color` do slot/cartão como hoje; escritório: `color` deixa de pintar o glifo (a arte tem a cor) | menos mudança visual no rack; no escritório `color` só pintava texto | y |
| Marcadores textuais que não são item | `?` (id gravado fora do catálogo), `+` (célula vazia do escritório), `-` (slot vazio do rack), `[ ]` (slot vazio do avatar) continuam texto | não são entradas do catálogo; os testes de L-015 dependem deles | y |
| Ícones de HUD | `hud-coin`, `hud-gem`, `hud-heart`, `hud-xp` à esquerda dos rótulos `COINS`, `GEMS`, `HP`, e do chip `XP` | moedas da key art (style guide: coin = `gold`, gem = `gem`, HP = `red`, XP = `code`) | y |
| PNG é commitado | specs em `web/art/`, PNGs em `web/public/art/`, commitados juntos; o build do Next não roda Python | skill pixel-assets ("commit specs and PNGs together"); build de CI é Node-only | y |
| Branch | `feat/game-art` a partir de `feat/server-room` | a arte cobre rack e escritório, que só existem nessa branch | y |

**Open questions:** none - all resolved or logged above.

## Criteria

### S1: todo asset existe, no estilo e reproduzível (P1)

**Acceptance Criteria**

1. The web SHALL ter, para cada entrada de `combat.json` `enemies` (por `region`), `combat.json` `items`, `shop.json` `gear`, `skills.json` nós, `deploys.json` `types`, `rack.json` `components`, `office.json` `furniture` e `regions.json` (por `id`), um spec em `web/art/<category>/<kind>-<key>.json` e um PNG em `web/public/art/<category>/<kind>-<key>.png` (door 1)
2. The web SHALL ter os PNGs `icon/hud-coin`, `icon/hud-gem`, `icon/hud-heart`, `icon/hud-xp`, `background/battle-<region>` para as 6 regiões, `background/world`, `background/office` e `background/server`, cada um com seu spec
3. The web SHALL ter cada PNG de `web/public/art` no tamanho da tabela de assumptions (ícone 16x16; inimigo 32x32, `enemy-torre` 48x48, `enemy-nuvem` 64x64; fundo 320x180)
4. WHEN `render.py web/art --out <dir>` roda THEN o renderer SHALL sair com código `0` (nenhum `ERROR`: toda cor da paleta, contorno fechado, ícone/sprite com canto transparente, fundo opaco) e os PNGs gerados SHALL ser byte a byte iguais aos commitados em `web/public/art`

**Independent test:** renderizar tudo num diretório temporário, comparar com o commitado, e abrir o contact sheet.

### S2: as telas mostram a arte (P1)

**Acceptance Criteria**

5. IF a imagem de um item, equipamento, skill, tipo de deploy, componente, móvel, inimigo ou região falha ao carregar (entrada nova no catálogo sem arte, AD-003) THEN the web SHALL mostrar no lugar o `glyph` do catálogo como texto, como hoje
6. WHEN o Bug Fight mostra um encontro THEN the web SHALL mostrar em `.battle-sprite` `<img src="/art/sprite/enemy-<region>.png" alt="<enemy.name>">` no tamanho da escala do inimigo, e o fundo da cena SHALL ser `/art/background/battle-<region>.png`
7. WHEN o Bug Fight lista o inventário de consumíveis THEN the web SHALL mostrar o ícone `/art/icon/item-<id>.png` de cada item no lugar do glifo
8. WHEN a LOJA lista itens e equipamentos THEN the web SHALL mostrar `/art/icon/item-<id>.png` e `/art/icon/gear-<id>.png` a 32px na lista e a 64px no detalhe
9. WHEN o AVATAR mostra a grade, os slots equipados e o detalhe THEN the web SHALL mostrar `/art/icon/gear-<id>.png` e `/art/icon/item-<id>.png` a 32px; slot vazio continua `[ ]` e skin continua `HeroSprite`
10. WHEN SKILLS mostra as árvores THEN the web SHALL mostrar `/art/icon/skill-<id>.png` em cada nó, e o HUD SHALL mostrar o mesmo ícone em cada chip de skill ativa com `alt=<name>`
11. WHEN DEPLOY lista os tipos THEN the web SHALL mostrar `/art/icon/deploy-<id>.png` antes do nome, e o nome acessível do botão SHALL continuar sendo o `name` do tipo
12. WHEN SERVER mostra o rack e a loja THEN the web SHALL mostrar `/art/icon/rack-<id>.png` em cada slot ocupado e cartão, sobre o fundo `color` do componente; slot vazio continua `-`, id fora do catálogo continua `?`; o fundo da cena SHALL ser `/art/background/server.png`
13. WHEN OFFICE mostra a loja, o detalhe e as células THEN the web SHALL mostrar `/art/icon/office-<id>.png`; célula vazia continua `+`, id fora do catálogo continua `?`; o fundo da sala SHALL ser `/art/background/office.png`
14. WHEN o MUNDO mostra o mapa THEN the web SHALL mostrar `/art/icon/region-<id>.png` em cada nó no lugar do losango e `/art/background/world.png` como fundo do mapa
15. WHILE a região está bloqueada (`player.level < minLevel`) the web SHALL mostrar o marcador dela com `filter: grayscale(1) brightness(.6)`; WHILE é a região atual SHALL manter o destaque `.here`
16. The HUD SHALL mostrar `/art/icon/hud-coin.png` ao lado de `COINS`, `hud-gem` ao lado de `GEMS`, `hud-heart` ao lado de `HP` e `hud-xp` ao lado do chip `XP`, todos com `alt=""`
17. The web SHALL renderizar toda arte com `className` contendo `pixelated` e `width`/`height` iguais ao tamanho nativo × um inteiro

**Independent test:** `npm run dev`, abrir cada aba e comparar com a key art; derrubar um PNG e ver o glifo voltar.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| ART-01 | S1 | 1, 2, 3, 4 | Pending |
| ART-02 | S2 | 5, 17 | Pending |
| ART-03 | S2 | 6, 7 | Pending |
| ART-04 | S2 | 8, 9 | Pending |
| ART-05 | S2 | 10, 11 | Pending |
| ART-06 | S2 | 12, 13 | Pending |
| ART-07 | S2 | 14, 15, 16 | Pending |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screens BATTLE, LOJA, AVATAR, SKILLS, DEPLOY, SERVER, OFFICE, MUNDO, HUD | empty state | existing - cada tela já tem o seu (inventário vazio, slot `[ ]`/`-`/`+`); AC 9, 12, 13 mantêm |
| screens (idem) | loading state | existing - `GameShell` só monta a cena com catálogo e player; imagem carrega sem estado próprio (PNGs de poucos KB) |
| screens (idem) | error state | AC 5 (imagem que falha volta ao glifo); erros de api inalterados |
| screens (idem) | unauthorised state | existing - `GameShell` manda para `/login`; `/art/*` é estático público como `keyart.png` |
| screens (idem) | density and ordering | existing - ordem do catálogo; AC 17 fixa escala inteira; tamanhos na tabela de assumptions |
| screens (idem) | destructive action confirms | n/a - nenhuma ação nova; comprar/equipar/remover inalterados |
| collection `web/art` + `web/public/art` | grouping criterion | door 1 - pasta = `category` do renderer (`icon`, `sprite`, `background`) |
| collection | naming | door 1 - `<kind>-<key>`, `key` = `id` do catálogo, `region` para inimigo |
| collection | ordering | n/a - arquivos; a tela ordena pelo catálogo |
| collection | duplicates | door 1 - prefixo `<kind>` separa ids repetidos entre tipos (`cadeira`, `neon`, `backend`); AC 1 exige um por entrada |
| collection | the exception that does not fit | AC 2 - HUD e cenários não têm entrada no catálogo; nomes fixos |
| command `render.py` | output, flags, exit codes | existing - skill pixel-assets (`--out`, `--preview`, exit `1` em `ERROR`); AC 4 |
| command `render.py` | fails halfway | existing - erro por spec, continua os outros, exit `1`; AC 4 exige `0` |
| API `GET /api/catalog` | response shape | n/a - não muda; a arte é endereçada pelo `id` que já existe (door 1) |

## Flow

Reusa o renderer e a paleta da skill pixel-assets e o `id` que o catálogo já serve; nenhuma rota,
tabela ou campo novo na api.

1. spec `web/art/<category>/<kind>-<key>.json` -> `.claude/skills/pixel-assets/scripts/render.py` (exists) - valida contra `palette.json`, grava `web/public/art/<category>/<kind>-<key>.png` (door 1, door 3)
2. `GET /api/catalog` (exists) -> `GameContext` (exists) - entrega `id`/`region`, `name` e `glyph` como hoje
3. cena (`BattleScene`, `ShopScene`, `AvatarScene`, `SkillsScene`, `DeployScene`, `ServerScene`, `OfficeScene`, `WorldScene`, `Hud` - all exist) -> `GameArt` (door 2) - monta `/art/<category>/<kind>-<key>.png` com escala inteira; no `onError` mostra o `glyph`
4. out: `<img class="pixelated">` servido estático pelo Next a partir de `web/public/art`; fundos via CSS `background-image` nas classes da cena

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (`/art/*.png` é estático do próprio front; `GET /api/catalog` não muda)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. endereço do asset | spec `web/art/<category>/<kind>-<key>.json`, PNG `/art/<category>/<kind>-<key>.png`; `category` ∈ `icon`,`sprite`,`background`; `kind` ∈ `enemy`,`item`,`gear`,`skill`,`deploy`,`rack`,`office`,`region`,`hud`,`battle`; `key` = `id` do catálogo (`region` para `enemy`); fixos: `hud-coin`, `hud-gem`, `hud-heart`, `hud-xp`, `battle-<region>`, `world`, `office`, `server` | campo `art` no catálogo: muda o contrato de `GET /api/catalog` e as structs do Go para um valor derivável do `id`, duas fontes para o mesmo caminho; `id` puro: colide entre tipos (`cadeira`, `neon`, `backend`) |
| 2. um componente para arte do catálogo | `<GameArt kind="item" id="hp_potion" scale={2} alt="" fallback="HP+" />` em `web/src/components/GameArt.tsx`; toda tela nova usa ele | `<img>` escrito em cada uma das 9 telas: a regra de caminho, escala e fallback repetida 9 vezes e copiada pela próxima feature |
| 3. PNG versionado | `web/public/art/**` commitado junto do spec; reproduzido por `python3 .claude/skills/pixel-assets/scripts/render.py web/art --out web/public/art` | gerar no `npm run build`: põe Python no build do front e no CI, que hoje são só Node |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `GameArt` - imagem de uma entrada do catálogo por `kind` + `id`, lives in `web/src/components` |
| domain | existing term: `glyph` era o que a tela mostrava; agora é só o fallback da imagem e o prefixo dos rótulos de comando - `BattleScene`, `ShopScene`, `AvatarScene`, `SkillsScene`, `DeployScene`, `ServerScene`, `OfficeScene`, `Hud` leem `glyph` hoje |
| tests | asserções de glifo como texto mudam para `img` com `src`/`alt`: `AvatarScene.test.tsx:92`, `DeployScene.test.tsx:53`, `Hud.test.tsx:42`, `OfficeScene.test.tsx:47,79`, `ServerScene.test.tsx:83,99`, `SkillsScene.test.tsx:33`, `GameShell.test.tsx:124`; nenhum spec em `web/e2e` busca glifo |
| stored data | nothing to migrate |
