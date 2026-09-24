# Forge

Sources:

- conversa 2026-09-24 - a forja produz itens (poções, acelerador) e gear exclusivo; componentes de rack ficam fora; a forja é uma seção da LOJA, sem 10ª cena
- `api/catalog/combat.json` - os 6 drops (`null_shard`, `log_essence`, `corrupt_dep`, `wild_trace`, `race_core`, `memory_crystal`), sem `price` e sem `restore`
- `.specs/STATE.md` - AD-002 (servidor autoritativo), AD-003 (catálogo no Go), AD-004 (mutação sob lock), AD-005 (formato de erro), AD-012 (`player.Bonus`), AD-015 (layout)
- `.specs/LESSONS.md` candidatas L-013 (ordem de validação por par), L-015 (id que sai do catálogo), L-016 (`404 player_not_found`), L-018 (preço em gems não usado no catálogo), L-029 (tabela inteira) aplicadas desde o início
- `docs/DevServer RPG.html` - não tem forja; identidade visual da LOJA existente (`ShopScene`) é a referência

## Problem

Todo Bug Fight vencido tem 65% de chance de dar um drop da região (`FRAGMENTO NULL`, `ESSÊNCIA DE LOG`,
...), mas o drop não serve para nada: não entra em combate, não é vendido, e a única ação que o jogo
oferece sobre ele é `descartar`. O jogador acumula itens mortos no inventário, e vencer de novo numa
região não rende nada além de 40 coins, 1 gem e XP. Não há números de uso; a observação do código e a
decisão do usuário são a evidência.

Quando isto for entregue, a LOJA ganha a seção `FORJA`: cada receita mostra o que produz, os materiais
com `tem/precisa` e o custo em coins. Forjar consome os materiais e entrega uma poção, um acelerador ou
um equipamento que só existe na forja, que já sai equipado.

## Out of scope

| Excluded | Why |
| --- | --- |
| Forjar componentes de rack | decisão do usuário; componente não tem inventário e exigiria a regra do primeiro slot livre |
| 10ª cena `/forja` na hotbar | decisão do usuário; mantém as 9 cenas nas teclas 1-9 |
| Vender drops | outra forma de dar valor ao drop; não pedida |
| Forjar N de uma vez | um clique forja um; repetir é clicar de novo |
| Receita com tempo de espera (timer) | forja instantânea; timer já existe no deploy e não foi pedido |
| Receitas bloqueadas por nível ou descobertas | os drops já vêm de regiões com `minLevel`, o que escalona sozinho |
| Desmontar gear forjado de volta em materiais | não pedido |
| Mostrar receitas fora da LOJA (AVATAR, Bug Fight) | seção da LOJA é o único lugar decidido |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Saídas | itens existentes (`sp_potion`, `hp_potion`, `boost_deploy`) e 3 gears novos só da forja; rack fora | decisão do usuário | y |
| Onde fica | seção `FORJA` na cena `/loja`, depois de `SKINS DO AVATAR`, com o mesmo painel de detalhe lateral | decisão do usuário | y |
| Receitas | tabela R abaixo; rebalancear é só catálogo (AD-003) | escalonadas pela região do drop: poções com drops da Vila/Floresta, gear com drops de Caverna/Torre/Nuvem || y |
| Gear exclusivo | tabela G abaixo; `price` ausente no catálogo | um equipamento por slot ainda não dominado pela loja (`bebida`, `vestuario`, `acessorio`), cada um acima do melhor da loja no seu slot e pago com drops mais raros || y |
| Gear forjado sai equipado | forjar gear grava a posse e equipa no slot, trocando o que estava, como `COMPRAR E EQUIPAR` | mesma regra de `BuyGear`; reusa o ajuste de HP do `equip` || y |
| Gear exclusivo na seção EQUIPAMENTOS | continua listado; sem posse, status `FORJA`, detalhe `custo: só na forja` e botão desabilitado `SÓ NA FORJA`; com posse, igual a qualquer gear | o jogador descobre o gear na lista que já conhece; equipar/remover não muda || y |
| Comprar gear sem preço | `POST /api/me/shop/gear/{id}` responde `422 not_for_sale` | mesmo código de `BuyItem` para item sem preço || y |
| Custo da receita | `price` opcional; sem `price` custa só materiais; com `price` paga via `player.Pay` na moeda do preço | gems já tratadas por `Pay`; L-018 exige prova com catálogo de teste | n |
| Quantidade produzida | cada forja produz 1 unidade | receita da tabela R rende 1; campo de quantidade não existe | n |
| Ordem das validações | `unknown_recipe` (antes do lock) → `already_owned` → `not_enough_materials` → saldo | catálogo antes do lock como shop e rack; posse antes dos materiais para não dizer "faltam materiais" de algo que o jogador já tem; materiais antes do saldo porque o saldo é o custo secundário | n |
| Falha não consome nada | qualquer erro deixa materiais, coins, gems, gear e inventário como estavam | uma transação só em `player.WithLocked` | n |
| Clique duplo | forja duas vezes se houver materiais para as duas, como comprar poção; o botão fica desabilitado enquanto a ação está pendente | regra existente da LOJA | n |
| Receita cuja saída ou material saiu do catálogo | o teste do catálogo recusa o build (receita só referencia item e gear existentes, e todo gear sem `price` tem receita) | receitas são o próprio catálogo; nada de receita é gravado (L-015) | n |
| Nome do erro de materiais | `409 not_enough_materials`, mensagem `materiais insuficientes` | segue `not_enough_gems` / `not_enough_coins` | n |
| Mensagens da tela | sucesso de item `+1 <NOME>`; sucesso de gear `ITEM FORJADO E EQUIPADO`; erro `<error.message>`; rede `CONNECTION_FAILED` | mesmas formas da LOJA | n |
| Arte | ícone `gear-<id>` 16x16 para os 3 gears novos, gerado pela skill `pixel-assets` | `web/src/lib/art.test.tsx` exige ícone para todo gear de `shop.json` || y |
| Branch | `feat/forge` a partir de `feat/game-menu` | as 5 branches anteriores ainda sem PR || y |

**Tabela R - receitas** (ordem do catálogo; `id` → saída; materiais; custo):

| id | Saída | Materiais | Custo |
| --- | --- | --- | --- |
| `forja_cache` | item `sp_potion` POÇÃO DE CACHE | 2 `null_shard` | - |
| `forja_memoria` | item `hp_potion` POÇÃO DE MEMÓRIA | 2 `log_essence` | - |
| `forja_acelerador` | item `boost_deploy` ACELERADOR DE DEPLOY | 1 `corrupt_dep` + 1 `wild_trace` | 20 coins |
| `forja_caneca` | gear `caneca_log` | 3 `log_essence` + 2 `null_shard` | 40 coins |
| `forja_hoodie` | gear `hoodie_trace` | 3 `wild_trace` + 2 `corrupt_dep` | 80 coins |
| `forja_teclado` | gear `teclado_race` | 2 `race_core` + 1 `memory_crystal` + 3 `wild_trace` | 150 coins |

**Tabela G - gear exclusivo** (entra em `shop.json` depois dos 6 existentes, sem `price`):

| id | name | glyph | slot | rarity | bonus | description |
| --- | --- | --- | --- | --- | --- | --- |
| `caneca_log` | CANECA DE LOGS | `[u]` | `bebida` | INCOMUM | `sp` +16 | Café coado no filtro de stack trace. |
| `hoodie_trace` | MOLETOM STACK TRACE | `{#}` | `vestuario` | RARO | `hp` +36 | Cada linha do erro costurada à mão. |
| `teclado_race` | TECLADO RACE CONDITION | `[kbd]` | `acessorio` | LENDÁRIO | `dmg` +12 | As teclas chegam antes de você apertar. |

**Open questions:** none - all resolved or logged above.

## Criteria

### S1: Receitas no catálogo e gear sem preço (P1)

**Acceptance Criteria**

1. The api SHALL servir em `GET /api/catalog` a chave `recipes` com as 6 receitas da tabela R, na ordem da tabela, cada uma com `id`, `output` = `{kind: "item" | "gear", id}`, `ingredients` = lista de `{item, quantity}` na ordem da tabela, e `price` = `{currency, amount}` só nas receitas com custo
2. The api SHALL servir em `gear` os 3 gears da tabela G depois dos 6 existentes, com todos os campos da tabela e sem a chave `price`
3. The catalog SHALL referenciar em cada receita só `item` de `items` e gear de `gear`, e SHALL ter uma receita para todo gear sem `price`
4. IF `POST /api/me/shop/gear/{id}` recebe um gear sem `price` THEN a api SHALL responder `422 not_for_sale` sem alterar nada

### S2: Forjar (P1)

**Acceptance Criteria**

5. WHEN `POST /api/me/forge/{recipe}` é chamado com todos os materiais e saldo ≥ custo THEN a api SHALL subtrair cada `quantity` dos materiais, descontar o custo, somar 1 à saída e responder `200` com `{"player": {...}}`
6. WHEN a receita tem saída `item` THEN a api SHALL somar 1 à `quantity` desse item em `inventory` (`forja_cache` com 2 `null_shard` e 0 `sp_potion`: `null_shard` some do inventário, `sp_potion` = 1)
7. WHEN a receita tem saída `gear` THEN a api SHALL gravar a posse, equipar o gear no slot trocando o que estava, e ajustar `hpMax` e `hp` pelo bônus `hp` que entra e pelo que sai (`forja_hoodie` com `moletom` equipado: `hpMax` +21)
8. WHEN a receita não tem `price` THEN a api SHALL forjar com coins = 0 e gems = 0, sem mudar o saldo
9. The api SHALL aceitar materiais e saldo exatamente iguais ao necessário (2 `null_shard` forjam `forja_cache`; 20 coins pagam `forja_acelerador`)
10. IF a receita não existe no catálogo THEN a api SHALL responder `422 unknown_recipe` com a mensagem `receita desconhecida`
11. IF a saída é gear que o jogador já possui THEN a api SHALL responder `409 already_owned` sem alterar nada, mesmo sem materiais
12. IF algum material tem `quantity` menor que a receita pede THEN a api SHALL responder `409 not_enough_materials` com a mensagem `materiais insuficientes` sem alterar nada, mesmo sem saldo
13. IF o saldo da moeda do custo é menor que o custo THEN a api SHALL responder `409 not_enough_coins` (ou `409 not_enough_gems` para custo em gems) sem alterar materiais nem inventário
14. IF a sessão não tem dev THEN a api SHALL responder `404 player_not_found`
15. WHEN duas forjas do mesmo jogador chegam ao mesmo tempo com materiais para uma só THEN a api SHALL forjar uma e responder `409 not_enough_materials` na outra, consumindo os materiais uma vez

### S3: Seção FORJA na LOJA (P1)

**Acceptance Criteria**

16. WHEN o jogador abre `/loja` THEN a web SHALL exibir a seção `FORJA` depois de `SKINS DO AVATAR`, com um cartão por receita na ordem do catálogo mostrando a arte e o nome da saída e o status
17. The web SHALL exibir no cartão o status `JÁ POSSUI` para gear possuído, `PRONTO` quando todos os materiais e o saldo bastam, e `FALTAM MATERIAIS` nos outros casos
18. WHEN um cartão da forja é clicado THEN o detalhe SHALL exibir raridade, nome e descrição da saída, o bônus quando a saída é gear, uma linha por material `<NOME> <tem>/<precisa>` na ordem da receita, e `custo: <priceLong>` só quando a receita tem `price`
19. The web SHALL exibir no detalhe o botão `FORJAR` (item) ou `FORJAR E EQUIPAR` (gear) quando pode forjar; `JÁ POSSUI`, `FALTAM MATERIAIS` ou `COINS INSUFICIENTES` / `GEMS INSUFICIENTES`, desabilitado, nessa ordem de prioridade, quando não pode
20. WHEN o botão habilitado é clicado THEN a web SHALL chamar `POST /api/me/forge/{recipe}`, repassar o `player` ao HUD e exibir `+1 <NOME>` para item ou `ITEM FORJADO E EQUIPADO` para gear
21. IF a forja responde erro THEN a web SHALL exibir `error.message`; sem corpo ou falha de rede, `CONNECTION_FAILED`
22. WHILE a forja está pendente a web SHALL desabilitar o botão do detalhe
23. WHERE um gear não tem `price` e o jogador não o possui the web SHALL exibir em `EQUIPAMENTOS DO DEV` o status `FORJA`, no detalhe `custo: só na forja` e o botão desabilitado `SÓ NA FORJA`
24. WHILE a largura é menor que 1200px a web SHALL empilhar a seção `FORJA` na mesma coluna das outras seções, sem rolagem horizontal

### S4: Arte do gear exclusivo (P2)

**Acceptance Criteria**

25. The web SHALL ter o ícone `gear-<id>` 16x16 para `caneca_log`, `hoodie_trace` e `teclado_race`, no estilo verificado pela suíte de arte existente

**Independent test:** dev com 2 `null_shard` → LOJA → FORJA → `forja_cache` `PRONTO` → `FORJAR` → `+1 POÇÃO DE CACHE`, inventário sem `null_shard` → cartão volta a `FALTAM MATERIAIS`; dev com os materiais e 150 coins → `forja_teclado` → `FORJAR E EQUIPAR` → AVATAR mostra TECLADO RACE CONDITION equipado, dano +12%.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| FORGE-01 | S1 | 1-4 | Pending |
| FORGE-02 | S2 | 5-15 | Pending |
| FORGE-03 | S3 | 16-24 | Pending |
| FORGE-04 | S4 | 25 | Pending |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/loja` seção FORJA | empty state | AC 17 (dev novo sem drops: todo cartão `FALTAM MATERIAIS`), AC 18 (`<NOME> 0/<precisa>`) |
| screen `/loja` seção FORJA | loading state | existing - shell só renderiza com `player` e `catalog` (foundation); AC 22 para a ação |
| screen `/loja` seção FORJA | error state | AC 21 |
| screen `/loja` seção FORJA | unauthorised state | existing - shell redireciona para `/login` (foundation) |
| screen `/loja` seção FORJA | density and ordering | AC 16, AC 18, AC 24 |
| screen `/loja` seção FORJA | destructive action confirms | n/a - forjar gasta materiais como comprar gasta gems; a LOJA compra num clique sem confirmação |
| screen `/loja` EQUIPAMENTOS | gear só da forja | AC 23 |
| screen `/avatar` | gear forjado | existing - AVATAR lista `player.gear` e soma bônus do equipado sem olhar preço |
| API `POST /api/me/forge/{recipe}` | response shape | AC 5 - `{"player": {...}}` (AD-004) |
| API `POST /api/me/forge/{recipe}` | error shape and codes | AC 10-14 - formato AD-005 |
| API `POST /api/me/forge/{recipe}` | who may call it | existing - `auth.RequireSession`, `401 unauthenticated`; AC 14 |
| API `POST /api/me/forge/{recipe}` | versioning | n/a - api e web no mesmo PR (AD-001) |
| API `POST /api/me/forge/{recipe}` | rate limit | n/a - nenhuma rota do jogo tem limite; materiais limitam |
| API `GET /api/catalog` | response shape | AC 1, AC 2 |
| API `POST /api/me/shop/gear/{id}` | gear sem preço | AC 4 |

## Flow

Reusa `player.WithLocked` (AD-004), `player.Pay` para o custo, `player.AddItem` para materiais e saída
(o `CHECK (quantity >= 0)` de `player_items` é a rede de segurança), e o `equip` do pacote `shop` para
gravar, equipar e ajustar HP - a forja não tem segunda regra de equipar. Nenhuma tabela nova.

1. in: `POST /api/me/forge/{recipe}` -> `api/internal/shop` (exists) - acha a receita no `catalog.Catalog` (exists, door 1) antes do lock
2. `player.WithLocked` (exists) - valida posse, materiais (`player.Quantity`) e saldo (`player.Pay`), nessa ordem
3. `player.AddItem` (exists) - subtrai cada material de `player_items`; saída `item` soma 1
4. saída `gear` -> `shop.equip` (exists) - insere `player_gear`, grava `player_equipment`, ajusta `hpMax`/`hp`
5. out: `{"player": {...}}`; `player.Bonus` (exists) já soma o gear equipado em combate
6. `GET /api/catalog` -> `catalog.Catalog` (exists) - serve `recipes` (door 1) e `gear` com `price` opcional (door 2)
7. `POST /api/me/shop/gear/{id}` -> `shop.BuyGear` (exists) - recusa gear sem `price` (door 2)
8. web `ShopScene` (exists) - nova seção `FORJA` e o estado `FORJA` do gear exclusivo; chama a rota do passo 1

## Relations

None - no stored-data shape change. Materiais e saída usam `player_items`; gear forjado usa `player_gear` e `player_equipment`; receitas não são gravadas.

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `POST /api/me/forge/{recipe}` | `recipe` | `player` | `200`, `401 unauthenticated`, `404 player_not_found`, `409 already_owned`, `409 not_enough_materials`, `409 not_enough_coins`, `409 not_enough_gems`, `422 unknown_recipe`, `500` |
| `POST /api/me/shop/gear/{id}` (changed) | `id` | `player` | + `422 not_for_sale`; `200`, `401`, `404 player_not_found`, `409 already_owned`, `409 not_enough_gems`, `409 not_enough_coins`, `422 unknown_gear`, `500` inalterados |
| `GET /api/catalog` (changed) | - | + `recipes`; `gear[].price` opcional | `200`, `304` |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. forma da receita no catálogo | `api/catalog/forge.json` = `{"recipes": [{"id", "output": {"kind": "item" \| "gear", "id"}, "ingredients": [{"item", "quantity"}], "price"?: {"currency", "amount"}}]}`; servido como `recipes` em `GET /api/catalog`; ids `forja_*` | campo `recipe` dentro de `Item` e `Gear` - não expressa duas receitas para a mesma saída e põe dados da forja nas entradas da loja; lista fixa no Go - rebalancear exigiria deploy (AD-003) |
| 2. gear sem preço | `Gear.Price` vira `*Price` com `json:"price,omitempty"`; ausente = não vendido; `BuyGear` responde `422 not_for_sale`; web `Gear.price?: Price` | flag `craftOnly` ao lado de `price` - dois campos que podem discordar (preço com `craftOnly: true`); lista `forgeGear` separada - `GearItem`, `equip` e `player.Bonus` teriam de olhar dois lugares, e o que AD-012 evita volta |
| 3. rota da forja | `POST /api/me/forge/{recipe}` responde `{"player": {...}}` | corpo `{"recipe": "<id>"}` como o rack - a rota vive em `shop`, onde toda ação usa o id no caminho; `POST /api/me/shop/recipes/{id}` - a forja não é compra, e o nome do recurso vira contrato |
| 4. código de erro | `409 not_enough_materials`, `materiais insuficientes` | `409 no_item` existente - diz "você não tem este item", errado quando o jogador tem 1 de 2 |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: `Recipe` - materiais + custo opcional → 1 item ou 1 gear, vive em `catalog` e é aplicada em `shop` |
| domain | existing term: `Gear.Price` era sempre presente, agora opcional - quem lê hoje: `shop.BuyGear` (`player.Pay(p, g.Price)`), `web ShopScene` (`priceShort`, `canPay`, `insufficient`, `priceLong` de `g.price`), `catalog_test` `ServesShop`; `office` e `rack` têm `Price` próprio e não mudam |
| domain | existing term: drop - item sem `price` e sem `restore`, antes só descartável, agora material de receita; `battle` não muda |
| stored data | nothing to migrate - nenhuma tabela nova; linhas de `player_items` e `player_gear` já aceitam qualquer id do catálogo |
