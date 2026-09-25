# Assets

Sources:

- conversa 2026-09-25 - escopo: gerar **todos** os grupos da folha no padrão pixel-assets e integrar onde o jogo já tem lugar; chrome global vira 9-slice; fundos deploy=dia, skills=noite, avatar=floresta, loja=dungeon; logo vira imagem (exceção de logotipo); entrega por tlc-spec-lean
- `web/public/assests_keyart.png` - **binding para o inventário e o estilo**: cada grupo da folha (personagens, UI, ícones/badges, props, cenário/tileset, ambientes, estruturas, animações/efeitos, inimigos/NPCs, extras, logo) é um conjunto de assets desta feature
- `web/public/keyart.png`, `web/public/female_keyart.png` - estilo e herói (M/F); regras em `.claude/skills/pixel-assets/references/style-guide.md` e paleta em `references/palette.json`
- `.specs/features/game-art/plan.md` - door 1 (endereço `<kind>-<key>`), door 2 (`GameArt`), door 3 (PNG versionado) que esta feature estende; o `Out of scope` dela ("9-slice", "Animação", "Tela-título, login") que esta fecha
- `.specs/STATE.md` - AD-003 (catálogo é dado do Go), AD-015 (identidade visual do protótipo, layout)

## Problem

A folha de assets mostra o jogo que a key art promete: herói andando, correndo, pulando e digitando;
painéis e botões de madeira e de HUD; medalhas, cadeados e moedas ao lado dos preços; NPCs; baú de
recompensa; teleporte; cenários de dia, noite, floresta e dungeon. Hoje nada disso existe no jogo.
O herói é um quadro parado em todas as telas, inclusive quando ataca, vence ou está com o deploy
rodando. O chrome é uma borda CSS lisa, que não se parece com os painéis da folha. Cadeado, preço,
nível do escritório, pontos de skill, SP e carregando são só texto. Deploy, skills, avatar e loja
não têm cenário. O logo é texto colorido. Quem joga sai da tela-título e vê outro jogo. A próxima
feature que precisar de um prop, NPC ou tile tem que desenhar do zero, sem padrão para tiles nem
frames de personagem. A fonte não dá números de uso; a folha e a decisão do usuário são a evidência.

Quando isto for entregue:
- todo asset da folha existe no padrão pixel-assets, reproduzível por `make art-check`;
- o herói se move nas telas onde age;
- o chrome, os estados e os cenários parecem a folha;
- o que ainda não tem lugar no jogo (tileset, props, estruturas) fica pronto em `/art` para a
  feature que tiver.

## Out of scope

| Excluded | Why |
| --- | --- |
| Mapa de tiles jogável, movimento por teclado, câmera | tileset é biblioteca; usar exige feature de gameplay nova |
| Novos inimigos no catálogo (`mob-*` em `combat.json`) | balanceamento é do Go (AD-003); os mobs ficam como arte pronta |
| Conquistas / ranking / tela de configurações | não existem no jogo; medalhas e `btn-rank`/`btn-settings` ficam como arte pronta |
| Animação por skin (neon, shadow, golden) além do recolor | skin continua sendo swap de rampa sobre as mesmas camadas (shop-inventory-avatar) |
| Animar inimigos com frames | inimigos seguem com transformações CSS (`anim-*`); a folha não tem frames de inimigo |
| Texto dentro de imagem, exceto o logotipo | style guide: rótulos são HTML `.pixel`; a tagline `CODE · DEPLOY · PLAY` fica HTML |
| Editar `keyart.png`, `female_keyart.png`, `assests_keyart.png` | fontes do estilo, não saída |
| Redesenhar assets de game-art já entregues | fora do pedido; só entram por `use` onde servem de peça |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo | todos os grupos da folha gerados; integração onde a tabela de Criteria diz; resto só biblioteca | decisão do usuário | y |
| Chrome | `.panel`, `.hud-card` → 9-slice `ui-panel`; `.btn-yellow` → `ui-btn-wood`; `.btn-dark` → `ui-btn-dark`; `.btn-green` → `ui-btn-green`; `:active` → a peça `-press` do mesmo botão | decisão do usuário (trocar global); `border-image` usa a imagem inteira, por isso o estado apertado é outro PNG | y |
| Fundos novos | `/deploy` = `scene-dia`, `/skills` = `scene-noite`, `/avatar` = `scene-floresta`, `/loja` = `scene-dungeon`; 320x180 ×4 como os outros | decisão do usuário | y |
| Logo | `sprite/logo.png` 160x64; `GameShell` ×1 (160x64), `LoginScreen` ×2 (320x128); `alt="DevServer"` | decisão do usuário (logotipo é exceção WCAG 1.4.5); ×1 cabe no header atual | y |
| Tamanhos nativos | ícone 16x16; sprite 32x32; `build-server-hut` 96x96; `sprite/tile-arvore-grande` 64x64; logo 160x64; tile 32x32 (128x32 para tile animado de 4 frames); fx 128x32; ui 24x24; fundo 320x180; strip do herói 192x64 | style guide + a folha (tileset "32x32") | y |
| Strip do herói | 4 frames de 48x64 lado a lado (192x64) por camada por anim; frame `i` em x = 48·i, mesmo grid da camada estática | casa com os `steps(4)` e as fx de 4 frames que já existem; o grid igual deixa empilhar sem offset | y |
| Anims | `idle`, `walk`, `run`, `jump`, `interact` (a folha: parado, andando, correndo, pulando, interagindo) | a folha | y |
| Velocidade | 6 quadros/s (um frame a cada 166 ms), em laço | ritmo 16-bit da folha; divide bem os 400 ms das fx | y |
| Anim por tela | AVATAR preview `idle`; Bug Fight herói `idle`, `run` no beat `lunge`, `interact` no beat `cast`, `jump` com `battle.status === "won"`; DEPLOY herói `interact` enquanto o job roda e `idle` quando pronto; MUNDO herói `idle` ao lado do marcador atual e `walk` enquanto a viagem está pendente | cada tela onde o herói age; beats `hit`/`fall`/`flee` ficam com o CSS atual sobre o frame `idle` | y |
| Movimento reduzido | com `prefers-reduced-motion: reduce` o herói desenha as camadas estáticas (sem strip) e `fx-loading` fica no frame 0 | acessibilidade; o jogo já usa `steps()` e isto é o mínimo | y |
| Rig do herói | poses em `web/art/sprite/hero/anim/_poses.json` (deslocamento por região `head`, `torso`, `arms`, `legs` + grade de pernas por frame e por corpo); `scripts/hero_anim.py` gera um spec por camada × anim; os specs gerados são commitados | um desenho por camada × anim à mão são ~300 grades; o rig desloca recortes da camada estática (`use` com `clip`) e só as pernas são desenhadas por pose | y |
| Categorias novas no renderer | `tile` (opaco, 32x32 ou 128x32) e `anim` (192x64, transparente, strip 48x64); decalques de tileset (arbusto, flor, árvores, cerca) são `sprite/tile-*` transparentes | tile de chão é opaco; decalque sobrepõe o chão | y |
| Ícones de preço | `hud-coin` / `hud-gem` (×1, 16px) antes do número, `alt=""`; o número continua texto | as moedas do HUD já existem; o texto continua sendo o que o leitor de tela lê | y |
| Cadeado | `ic-lock` ×1 antes de `BLOQ.`, `REQUER NÍVEL n` e `NÍVEL n`, `alt=""`; o texto fica | o texto já é o rótulo acessível e os testes usam ele | y |
| Medalha do escritório | nível 1..5 → `medal-bronze`, `medal-prata`, `medal-ouro`, `medal-azul`, `medal-roxo`, ×2 antes do nome; `medal-rubi` fica biblioteca | 5 níveis em `office.json`, 6 medalhas na folha | y |
| Ícones de stat | `SKILL PTS` ← `ic-star`; SP do Bug Fight ← `ic-sp`; server POWER ← `ic-chart`, RAM ← `ic-database`, UPTIME ← `ic-shield`; ×1 `alt=""` | o texto do stat continua | y |
| NPC da loja | `npc-dev` ×2 `alt="lojista"` com balão `ui-bubble` e o texto HTML `FORJE GEAR COM OS DROPS DO BUG FIGHT!` | a folha tem NPC com balão; a loja é o lugar com vendedor | y |
| Robô do servidor | `mob-robo` ×2 `alt="robô"` ao lado do terminal da sala de servidores | a folha tem robô; a sala é o lugar com terminal | y |
| Baú do deploy | `COLETAR RECOMPENSA` mostra `extra-bau` ×1 `alt=""`; WHEN a coleta responde `200` a tela mostra `extra-bau-aberto` ×2 com `fx-collect` por 400 ms | recompensa de deploy é o baú da folha | y |
| Marcador atual no mapa | `build-flag` ×1 `alt=""` sobre o marcador `.here` (a moldura amarela fica); WHEN a viagem responde `200` o novo marcador toca `fx-teleport` uma vez | a folha tem bandeira e teleporte; a moldura já é a prova de L-015 | y |
| Branch | `feat/assets` a partir de `feat/forge` | onde está o HeroAvatar em camadas e a forja | y |

**Open questions:** none - all resolved or logged above.

## Criteria

### S1: o pipeline gera todo tipo de asset da folha (P1)

**Acceptance Criteria**

1. WHEN `render.py` renderiza um spec `category: "tile"` THEN the renderer SHALL aceitar 32x32 e 128x32 sem `WARN` de tamanho e SHALL dar `ERROR` se algum pixel for transparente
2. WHEN `render.py` renderiza um spec `category: "anim"` THEN the renderer SHALL aceitar 192x64 sem `WARN` de tamanho e SHALL dar `WARN` para cada frame 48x64 com pixel na margem de 1px, vazio, ou idêntico a outro frame da strip
3. WHEN um spec `fx` é renderizado THEN the renderer SHALL manter os mesmos `WARN` de hoje (frame 32x32 na margem, vazio, idêntico)
4. WHEN um op `{"use": "<spec>", "clip": [x, y, w, h], "at": [ax, ay]}` é pintado THEN the renderer SHALL copiar só os pixels do spec de origem dentro do retângulo `[x, y, w, h]`, na posição `[ax, ay]` do destino, e nenhum pixel fora dele
5. The renderer SHALL aceitar sprite 96x96, 64x64 e 160x64 sem `WARN` de tamanho
6. WHEN `make art-check` roda THEN it SHALL sair `0`: nenhum `ERROR` em `web/art` e `diff -r` vazio entre o render e `web/public/art`

**Independent test:** `python3 -m unittest` dos testes do renderer e `make art-check`.

### S2: UI, ícones e logo, e o chrome da folha (P1)

**Acceptance Criteria**

7. The web SHALL ter spec e PNG para cada asset de UI, botão, ícone, medalha e logo da lista da door 1, no tamanho nativo da tabela de assumptions
8. The web SHALL desenhar `.panel` e `.hud-card` com `border-image-source: url(/art/ui/ui-panel.png)`, `.btn-yellow` com `ui-btn-wood.png`, `.btn-dark` com `ui-btn-dark.png`, `.btn-green` com `ui-btn-green.png`, todos com slice `8` e `image-rendering: pixelated`
9. WHEN um `.btn-yellow`, `.btn-dark` ou `.btn-green` está `:active` THEN the web SHALL trocar a `border-image-source` para a peça `-press` do mesmo botão
10. The `GameShell` SHALL mostrar no header `<img src="/art/sprite/logo.png" alt="DevServer">` de 160x64 e o `LoginScreen` SHALL mostrar a mesma imagem de 320x128 dentro do `h1`, sem o texto `DEV`/`SERVER`
11. The HUD SHALL mostrar `/art/icon/btn-exit.png` `alt=""` 16px dentro do botão `SAIR` e `/art/icon/ic-star.png` `alt=""` 16px antes de `SKILL PTS`
12. WHILE um nó de skill está bloqueado, uma região exige nível, ou um nível de deploy está travado, the web SHALL mostrar `/art/icon/ic-lock.png` `alt=""` 16px antes do texto `BLOQ.`, `REQUER NÍVEL n` ou `NÍVEL n`, que continua
13. WHEN LOJA, OFFICE ou SERVER mostram um preço THEN the web SHALL mostrar `/art/icon/hud-coin.png` (coins) ou `/art/icon/hud-gem.png` (gems) `alt=""` 16px antes do número
14. WHEN OFFICE mostra o nível do escritório THEN the web SHALL mostrar antes do nome `/art/icon/medal-<m>.png` `alt=""` 32px, com `<m>` = `bronze`, `prata`, `ouro`, `azul`, `roxo` para os níveis 1 a 5
15. WHEN SERVER mostra os stats THEN the web SHALL mostrar `ic-chart` antes de POWER, `ic-database` antes de RAM e `ic-shield` antes de UPTIME; WHEN o Bug Fight mostra o SP do herói THEN it SHALL mostrar `ic-sp`; todos `alt=""` 16px
16. IF a imagem de um ícone novo falha ao carregar THEN the web SHALL mostrar só o texto que já estava ao lado, sem caixa vazia

**Independent test:** abrir cada tela e comparar os painéis e os botões com a coluna "ELEMENTOS DE UI" da folha; apertar um botão e ver a peça apertada.

### S3: peças do mundo, efeitos e NPCs (P2)

**Acceptance Criteria**

17. The web SHALL ter spec e PNG para cada prop, estrutura, mob, NPC, extra e fx novo da lista da door 1, no tamanho nativo
18. WHILE `GameShell`, `Hud`, Bug Fight, DEPLOY ou Onboarding mostram `CARREGANDO...` the web SHALL mostrar junto um `<span class="fx-loading" aria-hidden="true">` com `background-image: url(/art/fx/loading.png)` em laço, e o texto SHALL continuar
19. WHILE um deploy está pronto para coletar the web SHALL mostrar `/art/sprite/extra-bau.png` `alt=""` 32px no botão `COLETAR RECOMPENSA`
20. WHEN a coleta do deploy responde `200` THEN the web SHALL mostrar `/art/sprite/extra-bau-aberto.png` `alt=""` 64px com `fx` `collect`
21. WHEN o MUNDO mostra o marcador da região atual THEN the web SHALL mostrar `/art/sprite/build-flag.png` `alt=""` 32px dentro do `.node-marker.here`, e só nele
22. WHEN a viagem responde `200` THEN the web SHALL tocar `fx` `teleport` sobre o marcador da nova região atual
23. The LOJA SHALL mostrar `/art/sprite/npc-dev.png` `alt="lojista"` 64px e um balão com o texto `FORJE GEAR COM OS DROPS DO BUG FIGHT!`
24. The SERVER SHALL mostrar `/art/sprite/mob-robo.png` `alt="robô"` 64px ao lado do terminal

**Independent test:** coletar um deploy e viajar no mapa com o dev server rodando; ver o baú abrir e o teleporte.

### S4: cenários e tileset (P2)

**Acceptance Criteria**

25. The web SHALL ter spec e PNG para `scene-dia`, `scene-noite`, `scene-floresta`, `scene-dungeon` (320x180, opacos) e para cada tile e decalque da lista da door 1
26. WHEN DEPLOY, SKILLS, AVATAR ou LOJA são mostrados THEN the web SHALL pôr na `section.scene` `background-image: url(/art/background/scene-dia.png)`, `scene-noite`, `scene-floresta` ou `scene-dungeon`, respectivamente

**Independent test:** abrir as quatro telas e comparar com "AMBIENTES / CENÁRIOS" da folha.

### S5: o herói anima (P1)

**Acceptance Criteria**

27. The web SHALL ter, para cada camada PNG de `web/public/art/sprite/hero/` e cada anim `idle`, `walk`, `run`, `jump`, `interact`, `web/public/art/sprite/hero/anim/<layer>-<anim>.png` de 192x64, com spec
28. WHERE o `HeroAvatar` recebe `anim` THEN it SHALL desenhar o frame `i` de cada strip (recorte x = 48·i, 48x64) com os mesmos swaps de cor da camada estática, e `data-frame` SHALL ser `i`
29. WHILE o `HeroAvatar` tem `anim` the web SHALL avançar `data-frame` 0 → 1 → 2 → 3 → 0 a cada 166 ms
30. WHEN `anim` muda THEN the `HeroAvatar` SHALL voltar ao frame `0` da nova anim
31. IF a strip de uma camada falha ao carregar THEN the `HeroAvatar` SHALL desenhar a camada estática dela no lugar e continuar animando as outras
32. WHILE `prefers-reduced-motion: reduce` the `HeroAvatar` SHALL desenhar as camadas estáticas e `data-frame` SHALL ficar `0`
33. The web SHALL passar ao `HeroAvatar`: AVATAR preview `idle`; Bug Fight `run` no beat `lunge`, `interact` no beat `cast`, `jump` com `battle.status === "won"`, `idle` no resto; DEPLOY `interact` com job rodando e `idle` com job pronto; MUNDO `idle` ao lado do marcador atual e `walk` enquanto a viagem está pendente
34. WHILE o `HeroAvatar` não recebe `anim` it SHALL desenhar as camadas estáticas como hoje (cartões da loja, grade do avatar, onboarding)

**Independent test:** abrir AVATAR e ver o herói respirar; atacar no Bug Fight e ver ele correr; vencer e ver ele pular.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| AST-01 | S1 | 1, 2, 3, 4, 5, 6 | Pending |
| AST-02 | S2 | 7, 8, 9, 10 | Pending |
| AST-03 | S2 | 11, 12, 13, 14, 15, 16 | Pending |
| AST-04 | S3 | 17, 18, 19, 20 | Pending |
| AST-05 | S3 | 21, 22, 23, 24 | Pending |
| AST-06 | S4 | 25, 26 | Pending |
| AST-07 | S5 | 27, 28, 29, 30, 31, 32 | Pending |
| AST-08 | S5 | 33, 34 | Pending |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screens HUD, MUNDO, SERVER, DEPLOY, BUG FIGHT, SKILLS, LOJA, AVATAR, OFFICE, LOGIN | empty state | existing - estados vazios de cada tela inalterados (`[ ]`, `-`, `+`, `MOCHILA VAZIA`) |
| screens (idem) | loading state | AC 18 - `CARREGANDO...` ganha `fx-loading`; o texto fica |
| screens (idem) | error state | AC 16 (ícone que falha some, o texto fica); AC 31 (strip que falha volta à camada estática); erros de api inalterados |
| screens (idem) | unauthorised state | existing - `GameShell` manda para `/login`; `/art/*` é estático público |
| screens (idem) | density and ordering | ícones ×1 (16px) ao lado de texto, ×2 onde estão sozinhos (tabela de assumptions); ordem do catálogo inalterada |
| screens (idem) | destructive action confirms | n/a - nenhuma ação nova; comprar/equipar/coletar/viajar inalterados |
| screens (idem) | movimento | AC 32 - `prefers-reduced-motion` para o herói e o loading |
| collection `web/art` + `web/public/art` | grouping criterion | door 1 - pasta = `category` (`icon`, `sprite`, `background`, `ui`, `fx`, `tile`, `anim`), `sprite/hero/anim/` para strips |
| collection | naming | door 1 - `<kind>-<key>`; kinds novos `ui`, `btn`, `ic`, `medal`, `prop`, `build`, `mob`, `npc`, `extra`, `scene`, `tile`; strip `<layer>-<anim>` |
| collection | ordering | n/a - arquivos; nada lista a pasta |
| collection | duplicates | door 1 - o prefixo `<kind>` separa `prop-rack` de `office-rack` e de `build-rack`, `ic-gem` não existe (o HUD já tem `hud-gem`) |
| collection | the exception that does not fit | door 1 - `sprite/logo` sem kind (único); decalques do tileset são `sprite/tile-*` porque são transparentes |
| command `render.py` | output, flags, exit codes | existing - `--out`, `--preview`, `--check`, exit `1` em `ERROR`; AC 1, 2, 3 estendem as regras por categoria |
| command `render.py` | fails halfway | existing - erro por spec, continua, exit `1`; AC 6 exige `0` |
| command `hero_anim.py` | output, flags, exit codes | door 4 - escreve `web/art/sprite/hero/anim/<layer>-<anim>.json` para cada camada; exit `1` se uma camada de `web/art/sprite/hero/` não tem região no rig; AC 27 prova o resultado |
| document `style-guide.md` / `spec-format.md` | structure, depth | existing - seções por categoria; ganham `tile`, `anim`, `clip`, rig e a exceção do logo |
| API `GET /api/catalog` | response shape | n/a - não muda; nada desta feature é dado do Go |

## Flow

Reusa o renderer, a paleta e o `make art-check` da skill pixel-assets, o `GameArt` (door 2 de
game-art) para todo ícone e sprite novo, o `HeroAvatar` com o seu recolor de hex, e o `fx-play` de
`globals.css` para toda strip de efeito. Nenhuma rota, tabela ou campo novo na api.

1. spec `web/art/<category>/<kind>-<key>.json` -> `.claude/skills/pixel-assets/scripts/render.py` (exists; ganha `tile`, `anim` e `clip`) - valida e grava `web/public/art/<category>/<kind>-<key>.png` (door 1, door 3 de game-art)
2. `web/art/sprite/hero/anim/_poses.json` + camadas `web/art/sprite/hero/*.json` -> `scripts/hero_anim.py` (door 4) - escreve os specs de strip, que o passo 1 renderiza em `sprite/hero/anim/<layer>-<anim>.png`
3. cena (`Hud`, `WorldScene`, `ServerScene`, `DeployScene`, `BattleScene`, `SkillsScene`, `ShopScene`, `OfficeScene`, `GameShell`, `LoginScreen`, `Onboarding` - all exist) -> `GameArt` (exists; ganha os kinds da door 1) - `<img class="pixelated">` em escala inteira; no `onError` some e deixa o texto
4. cena -> `HeroAvatar` (exists; ganha `anim`, door 5) - carrega `sprite/hero/anim/<layer>-<anim>.png`, recorta o frame, aplica o swap e empilha; sem `anim` ou com movimento reduzido usa a camada estática
5. `globals.css` (exists) - chrome por `border-image` (door 6) e fundos das cenas; out: PNGs estáticos servidos pelo Next a partir de `web/public/art`

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (`/art/*.png` é estático do próprio front; `GET /api/catalog` não muda)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. endereço dos assets novos | estende game-art door 1: `ui/ui-panel`, `ui/ui-panel-wood`, `ui/ui-btn-{wood,dark,green}` + `-press`, `ui/ui-bubble`, `ui/ui-bar`; `icon/btn-{build,deploy,play,rank,start,settings,shop,exit}`; `icon/ic-{code,cloud,server,gear,trophy,star,crown,laptop,database,shield,lock,file,wrench,chart,sp}`; `icon/medal-{bronze,prata,ouro,azul,roxo,rubi}`; `sprite/prop-{laptop,macbook,rack,caixa,caixa-aberta,monitor,roteador,planta,caneca,livros,bloco-grama,terminal,torre,gema-pedestal,modem}`; `sprite/build-{server-hut,rack,tenda,antena,placa-code,flag,placa}`; `sprite/mob-{slime,slime-verde,monstro,robo}`; `sprite/npc-dev`; `sprite/extra-{placa,fogueira,lampada,banco,bau,bau-aberto,bandeira}`; `fx/{dust,sparkle,teleport,fire,loading,collect}`; `background/scene-{dia,noite,floresta,dungeon}`; `tile/tile-{grama-topo,grama,grama-borda,terra,pedra,tijolo,tabua,parede-madeira,areia,agua,agua-funda,cachoeira}`; `sprite/tile-{arbusto,flor,arvore,arvore-grande,cerca}`; `sprite/logo` | nomes sem prefixo: `rack`, `placa` e `bau` colidem entre prop, estrutura e extra; pasta por grupo da folha (`props/`, `extras/`): quebra a regra "pasta = category" do renderer e do `GameArt` |
| 2. categorias novas no renderer | `SIZES["tile"] = {(32,32),(128,32)}` opaco; `SIZES["anim"] = {(192,64)}` transparente, frame 48x64; `SIZES["sprite"]` ganha `(96,96)`, `(160,64)`; o checker de strip recebe o tamanho do frame (`fx` 32x32, `anim` 48x64, `tile` 32x32) | tile como `icon` 32x32: exige canto transparente, e chão é opaco; strip do herói como `fx`: frame 32x32 não cabe o herói 48x64 |
| 3. strip do herói | `sprite/hero/anim/<layer>-<anim>.png`, 192x64, 4 frames de 48x64, `<anim>` ∈ `idle`,`walk`,`run`,`jump`,`interact`, uma por camada de `sprite/hero/` (inclusive `-f`) | um sprite sheet por look inteiro: não recolore por parte e multiplica por cada combinação; frames soltos (`<layer>-walk-0.png`): 4× requests e a animação dependeria de 4 loads para começar |
| 4. rig gerado | `web/art/sprite/hero/anim/_poses.json` `{"regions": {"head": [x,y,w,h], "torso": [...], "arms": [...], "legs": [...]}, "anims": {"walk": [{"head": [dx,dy], "torso": [dx,dy], "arms": [dx,dy], "legs": "<pose>"}, ...4]}}`; `python3 .claude/skills/pixel-assets/scripts/hero_anim.py` gera os specs; specs gerados são commitados e `make art-check` reproduz os PNGs | desenhar cada strip à mão: ~300 grades 192x64 e toda camada nova de avatar (padrão de 4e95d22, baa3dad) teria de ser desenhada 5 vezes; gerar em runtime no canvas: as pernas precisam de pose desenhada, não de deslocamento |
| 5. `HeroAvatar` anima | `<HeroAvatar look={player} scale={2} anim="run" />`, `anim?: "idle" \| "walk" \| "run" \| "jump" \| "interact"`; sem `anim` = estático; `data-frame` no canvas | um componente `HeroSprite` separado para animar: duas cópias do recolor e do carregamento de camadas |
| 6. chrome 9-slice | `border-image: url(/art/ui/<piece>.png) 8 fill / 24px round; image-rendering: pixelated;` nas classes `.panel`, `.hud-card`, `.btn-yellow`, `.btn-dark`, `.btn-green`, e `:active` troca para `<piece>-press.png`; toda classe nova de chrome copia isso | `box-shadow`/borda CSS pintando os painéis da folha: não chega ao bisel nem aos cantos cortados de 1px; uma peça 24x48 com os dois estados: `border-image` usa a imagem inteira, não uma metade |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `anim` - a ação do herói em uma tela (`idle`, `walk`, `run`, `jump`, `interact`), lives in `web/src/components/HeroAvatar.tsx` |
| domain | new term: strip - PNG de 4 frames lado a lado; já existia para fx (32x32), agora também para o herói (48x64) e tiles (32x32), lives in `render.py` |
| domain | existing term: `ArtKind` era só catálogo; ganha `btn`, `ic`, `medal`, `prop`, `build`, `mob`, `npc`, `extra` - `artSrc` e `nativeSize` em `GameArt.tsx` decidem pasta e tamanho, e os testes de game-art (`GameArt.test.tsx` "address and size") branch neles |
| domain | existing term: `.panel`/`.btn-*` eram borda CSS; agora são 9-slice - toda tela usa essas classes, e o e2e que tira screenshot/compara estilo (`web/e2e`) enxerga a mudança |
| tests | `Hud.test.tsx` (botão SAIR, SKILL PTS), `GameShell.test.tsx` (logo como texto `DEV`/`SERVER`), `LoginScreen` (h1), `WorldScene.test.tsx` (marcador `.here`), `DeployScene.test.tsx` (COLETAR, NÍVEL), `OfficeScene.test.tsx` (nível), `ServerScene.test.tsx` (stats, preço), `ShopScene.test.tsx` (preço), `SkillsScene.test.tsx` (BLOQ.), `BattleScene.test.tsx` (SP, herói) - onde buscam o texto por nome acessível continuam; onde contam `img` mudam para o que os checks dizem |
| stored data | nothing to migrate |
