# Forge checks

Profile: standard
Plan: `.specs/features/forge/plan.md`

31 checks in 4 slices · 4 one-way doors · 0 open

## Checks

### S1 - Receitas no catálogo e gear sem preço · ~5 files · ~60 KB · ~15k

**C1** - `GET /api/catalog` serve `recipes` com 6 receitas nesta ordem, todos os campos comparados por valor: `forja_cache` (`output` `{kind:"item", id:"sp_potion"}`, `ingredients` `[{null_shard,2}]`, sem `price`), `forja_memoria` (`item` `hp_potion`, `[{log_essence,2}]`, sem `price`), `forja_acelerador` (`item` `boost_deploy`, `[{corrupt_dep,1},{wild_trace,1}]`, `{coins,20}`), `forja_caneca` (`gear` `caneca_log`, `[{log_essence,3},{null_shard,2}]`, `{coins,40}`), `forja_hoodie` (`gear` `hoodie_trace`, `[{wild_trace,3},{corrupt_dep,2}]`, `{coins,80}`), `forja_teclado` (`gear` `teclado_race`, `[{race_core,2},{memory_crystal,1},{wild_trace,3}]`, `{coins,150}`); a chave `price` não aparece no JSON das receitas sem custo (FORGE-01, AC 1; door 1; L-007, L-012, L-029)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesForge$'`

**C2** - `gear` tem 9 entradas: as 6 existentes na ordem e com `price` iguais, depois `caneca_log` (`CANECA DE LOGS`, `[u]`, `bebida`, `INCOMUM`, `Café coado no filtro de stack trace.`, `sp` +16), `hoodie_trace` (`MOLETOM STACK TRACE`, `{#}`, `vestuario`, `RARO`, `Cada linha do erro costurada à mão.`, `hp` +36), `teclado_race` (`TECLADO RACE CONDITION`, `[kbd]`, `acessorio`, `LENDÁRIO`, `As teclas chegam antes de você apertar.`, `dmg` +12), cada uma sem a chave `price` no JSON (FORGE-01, AC 2; door 2; L-007, L-012)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesForgeGear$'`

**C3** - No catálogo embutido, toda receita tem `output.kind` em {`item`, `gear`}, `output.id` existente na lista do seu kind, todo `ingredients[].item` existente em `items` com `quantity` ≥ 1, e todo gear sem `price` é `output` de alguma receita (FORGE-01, AC 3; L-015)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_RecipesReferenceCatalog$'`

**C4** - Com 9999 gems e 9999 coins, `POST /api/me/shop/gear/teclado_race` responde `422 not_for_sale` e gems, coins, `gear` e `equipment` ficam iguais; `POST /api/me/shop/gear/cafe` com 50 coins continua respondendo `200` (FORGE-01, AC 4; door 2)
Proof: `cd api && go test ./internal/shop -run '^TestBuyGear_NotForSale$'`

### S2 - Forjar · ~4 files · ~50 KB · ~13k

**C5** - Com 2 `null_shard`, 2 `sp_potion`, 100 coins e 0 gems, `POST /api/me/forge/forja_cache` responde `200` com `{"player": {...}}`, `inventory` sem `null_shard`, `sp_potion` = 3, coins 100 e gems 0; `player_items` guarda `null_shard` com `quantity` 0 ou sem linha (FORGE-02, AC 5, 6, 8; door 3)
Proof: `cd api && go test ./internal/shop -run '^TestForge_ItemRecipe$'`

**C6** - Tabela sobre as 6 receitas, cada uma com exatamente os materiais e o custo pedidos e nenhum gear: depois de `200`, cada material fica com 0, coins = 0 (ou iguais nas receitas sem custo), gems iguais, e a saída item tem `quantity` +1 ou a saída gear está em `gear` e em `equipment[<slot>]` (FORGE-02, AC 5, 6, 7, 8, 9; L-029)
Proof: `cd api && go test ./internal/shop -run '^TestForge_EveryRecipe$'`

**C7** - Com `moletom` possuído e equipado em `vestuario` (`hpMax` base + 15), `forja_hoodie` responde `200` com `gear` contendo `moletom` e `hoodie_trace`, `equipment.vestuario` = `hoodie_trace`, `hpMax` +21 e `hp` +21; com `fone` equipado, `forja_teclado` deixa `equipment.acessorio` = `teclado_race` e `hpMax` igual; com `bebida` vazio, `forja_caneca` deixa `equipment.bebida` = `caneca_log` (FORGE-02, AC 7)
Proof: `cd api && go test ./internal/shop -run '^TestForge_GearOwnsEquips$'`

**C8** - Limites: 1 `null_shard` → `forja_cache` `409 not_enough_materials`; 2 → `200` e 0; `forja_acelerador` com os materiais e 19 coins → `409 not_enough_coins`; com 20 → `200` e coins 0 (FORGE-02, AC 9, 12, 13; L-009)
Proof: `cd api && go test ./internal/shop -run '^TestForge_Boundaries$'`

**C9** - `POST /api/me/forge/nada` e `POST /api/me/forge/sp_potion` respondem `422 unknown_recipe` com `error.message` = `receita desconhecida`, sem mudar o jogador (FORGE-02, AC 10)
Proof: `cd api && go test ./internal/shop -run '^TestForge_UnknownRecipe$'`

**C10** - Com `teclado_race` possuído e sem nenhum material, `forja_teclado` responde `409 already_owned`; com os materiais e 150 coins também responde `409 already_owned` e materiais, coins e `gear` ficam iguais (FORGE-02, AC 11)
Proof: `cd api && go test ./internal/shop -run '^TestForge_AlreadyOwned$'`

**C11** - `forja_teclado` com 2 `race_core`, 0 `memory_crystal`, 3 `wild_trace` e 0 coins responde `409 not_enough_materials` com `error.message` = `materiais insuficientes`; `race_core` e `wild_trace` ficam iguais e nenhum gear é gravado (FORGE-02, AC 12)
Proof: `cd api && go test ./internal/shop -run '^TestForge_NotEnoughMaterials$'`

**C12** - Com catálogo de teste em que `forja_acelerador` custa `{gems,5}`: 4 gems → `409 not_enough_gems` com materiais iguais; 5 gems → `200` e gems 0; com o catálogo embutido, 19 coins → `409 not_enough_coins` com `corrupt_dep`, `wild_trace` e `boost_deploy` iguais (FORGE-02, AC 13; L-018)
Proof: `cd api && go test ./internal/shop -run '^TestForge_NotEnoughBalance$'`

**C13** - A ordem das validações é a do plano, um caso por par: sessão sem dev + `nada` → `422 unknown_recipe`; sessão sem dev + `forja_cache` → `404 player_not_found`; gear possuído + sem materiais → `already_owned`; sem materiais + sem saldo → `not_enough_materials` (FORGE-02, AC 10-14; plan Assumptions; L-013)
Proof: `cd api && go test ./internal/shop -run '^TestForge_ValidationOrder$'`

**C14** - Com sessão válida e nenhum dev criado, `POST /api/me/forge/forja_cache` responde `404 player_not_found` (FORGE-02, AC 14; L-016)
Proof: `cd api && go test ./internal/shop -run '^TestForge_PlayerNotFound$'`

**C15** - Sem sessão, `POST /api/me/forge/forja_cache` responde `401 unauthenticated` (FORGE-02)
Proof: `cd api && go test ./internal/shop -run '^TestForgeRoutes_RequireSession$'`

**C16** - Com 2 `null_shard`, duas `forja_cache` simultâneas terminam com um `200` e um `409 not_enough_materials` (nenhum `500`), `sp_potion` +1 e `null_shard` 0; a transação que segura a linha do jogador muda `null_shard` e a outra lê o valor novo (FORGE-02, AC 15; AD-004; L-003)
Proof: `cd api && go test ./internal/shop -run '^TestForge_ConcurrentSerialize$'`

**C17** - Falhas respondem `500 internal`, o log traz o `request_id`, e nada é consumido: com `player_items` indisponível, `forja_cache`; com `player_gear` recusando `hoodie_trace` (constraint de teste), `forja_hoodie` com os materiais e 80 coins deixa materiais, coins, `gear` e `equipment` iguais (FORGE-02, AC 5; AD-005; L-001)
Proof: `cd api && go test ./internal/shop -run '^TestForge_Failure$'`

**C18** - Os códigos novos chegam como `{"error":{"code","message"}}`: `unknown_recipe` 422 `receita desconhecida`, `not_enough_materials` 409 `materiais insuficientes` (door 4; AD-005)
Proof: `cd api && go test ./internal/shop -run '^TestForge_ErrorCodes$'`

### S3 - Seção FORJA na LOJA · ~6 files · ~70 KB · ~18k

**C19** - Em `/loja`, a região `FORJA` vem depois de `SKINS DO AVATAR` (ordem no documento), com 6 cartões nesta ordem: `POÇÃO DE CACHE`, `POÇÃO DE MEMÓRIA`, `ACELERADOR DE DEPLOY`, `CANECA DE LOGS`, `MOLETOM STACK TRACE`, `TECLADO RACE CONDITION`; cada cartão mostra a arte `/art/icon/item-<id>.png` ou `/art/icon/gear-<id>.png` da saída (FORGE-03, AC 16; L-002)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge section"`

**C20** - Status do cartão, um caso por linha: gear possuído com materiais → `JÁ POSSUI`; materiais e saldo → `PRONTO`; falta um material → `FALTAM MATERIAIS`; materiais sem saldo → `FALTAM MATERIAIS`; dev novo (sem drops) → os 6 `FALTAM MATERIAIS` (FORGE-03, AC 17)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge card status"`

**C21** - Detalhe de `forja_teclado` com 1 `race_core`, 0 `memory_crystal` e 3 `wild_trace`: `LENDÁRIO`, `TECLADO RACE CONDITION`, `As teclas chegam antes de você apertar.`, `bônus: <bonusLong(dmg 12)>`, as linhas `NÚCLEO DE CONCORRÊNCIA 1/2`, `CRISTAL DE MEMÓRIA 0/1`, `STACK TRACE SELVAGEM 3/3` nessa ordem e `custo: 150 COINS`; detalhe de `forja_cache` sem linha `custo:` e sem linha `bônus:`, com `FRAGMENTO NULL 0/2` (FORGE-03, AC 18)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge detail"`

**C22** - Botão do detalhe, um caso por linha: item que pode forjar → `FORJAR` habilitado; gear que pode forjar → `FORJAR E EQUIPAR` habilitado; gear possuído com materiais e saldo → `JÁ POSSUI` desabilitado; sem material e sem saldo → `FALTAM MATERIAIS` desabilitado; materiais com 19 coins → `COINS INSUFICIENTES` desabilitado; catálogo com custo `{gems,5}` e 4 gems → `GEMS INSUFICIENTES` desabilitado (FORGE-03, AC 19)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge button"`

**C23** - Clicar `FORJAR` chama `POST /api/me/forge/forja_cache`, repassa o `player` da resposta a `setPlayer` e exibe `+1 POÇÃO DE CACHE` no `status`; clicar `FORJAR E EQUIPAR` em `forja_caneca` chama `/api/me/forge/forja_caneca` e exibe `ITEM FORJADO E EQUIPADO` (FORGE-03, AC 20)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge success"`

**C24** - Resposta `409` com `error.message` `materiais insuficientes` exibe `materiais insuficientes`; resposta sem corpo e `fetch` rejeitado exibem `CONNECTION_FAILED`; `setPlayer` não é chamado (FORGE-03, AC 21)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge errors"`

**C25** - Enquanto a forja está pendente, o botão do detalhe fica desabilitado e um segundo clique não chama `fetch` de novo (FORGE-03, AC 22)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge pending"`

**C26** - Em `EQUIPAMENTOS DO DEV`, `teclado_race` não possuído mostra status `FORJA`; o detalhe mostra `custo: só na forja` e o botão `SÓ NA FORJA` desabilitado, sem `fetch` ao clicar; possuído e não equipado mostra `NO INVENTÁRIO` e o botão `EQUIPAR`, que chama `/api/me/gear/teclado_race/equip` (FORGE-03, AC 23)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "craft-only gear"`

**C27** - Em 390px e 360px de largura, a região `FORJA` tem o mesmo `x` e a mesma largura da região `SKINS DO AVATAR`, fica abaixo dela, cabe no viewport, e a página não tem rolagem horizontal (`scrollWidth` ≤ `clientWidth`) (FORGE-03, AC 24; AD-015; L-020, L-023)
Proof: `cd web && npx playwright test e2e/forge.spec.ts -g "forge on phone"`

**C28** - No browser, pela reescrita `/api`, um dev novo abre LOJA, vê a região `FORJA` com `forja_cache` `FALTAM MATERIAIS`, e `POST /api/me/forge/forja_cache` com o cookie da página responde `409 not_enough_materials` (FORGE-02, FORGE-03)
Proof: `cd web && npx playwright test e2e/forge.spec.ts -g "forge round trip"`

**C29** - O mock `CATALOG` da web tem `recipes` e os 3 gears copiados por valor de `api/catalog/forge.json` e `shop.json` (sem `price` nos 3) (door 1, door 2; L-012)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "web mock matches forge catalog"`

### S4 - Arte do gear exclusivo · ~4 files · ~20 KB · ~5k

**C30** - `web/public/art/icon/gear-caneca_log.png`, `gear-hoodie_trace.png` e `gear-teclado_race.png` existem com 16x16, cobertos pela tabela sobre todo gear de `shop.json` (FORGE-04, AC 25)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "gear icons per shop.json"`

**C31** - O verificador de estilo do `pixel-assets` (paleta da key art, contorno, tamanho, transparência) sai com 0 erros nos 3 PNGs, e renderizar os specs `web/art/icon/gear-<id>.json` reproduz byte a byte os PNGs publicados (FORGE-04, AC 25; L-026)
Proof: `python3 .claude/skills/pixel-assets/scripts/render.py --check web/public/art/icon/gear-caneca_log.png web/public/art/icon/gear-hoodie_trace.png web/public/art/icon/gear-teclado_race.png --category icon`
Proof: `make art-check`

### Round 2 - after verification round 1

**C32** - `JÁ POSSUI` vence as outras condições, um caso por combinação: gear possuído sem nenhum material e 0 coins mostra `JÁ POSSUI` no cartão e o botão `JÁ POSSUI` desabilitado; gear possuído com os materiais e 149 coins mostra `JÁ POSSUI` no cartão e no botão (FORGE-03, AC 17, 19; L-035)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "forge owned priority"`

**C33** - Com catálogo de teste em que `forja_teclado` produz o gear `nada`, os materiais e 150 coins, `POST /api/me/forge/forja_teclado` responde `422 unknown_gear` e nada muda (FORGE-02, AC 26; L-036)
Proof: `cd api && go test ./internal/shop -run '^TestForge_UnknownOutputGear$'`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/me/forge/{recipe}` statuses (10) | 200 C5, C6 · 401 C15 · 404 `player_not_found` C14 · 409 `already_owned` C10 · 409 `not_enough_materials` C11 · 409 `not_enough_coins` C8, C12 · 409 `not_enough_gems` C12 · 422 `unknown_recipe` C9 · 422 `unknown_gear` C33 · 500 C17 | - |
| `POST /api/me/shop/gear/{id}` changed statuses (1) | 422 `not_for_sale` C4 | - |
| `GET /api/catalog` new or changed fields (2) | `recipes` C1 · `gear[].price` opcional C2 | - |
| recipes (6) | C1, C6, table-driven over all 6 | - |
| craft-only gear (3) | C2, C6, C30, table-driven over all 3 | - |
| output kinds (2) | `item` C5, C6 · `gear` C6, C7 | - |
| recipe price presence (2) | sem `price` C5, C21 · com `price` C8, C21 | - |
| price currency (2) | coins C8, C12, C22 · gems C12, C22 | - |
| material boundary (2) | abaixo C8 · igual C8 | - |
| balance boundary (2) | abaixo C8 · igual C8 | - |
| gear equip on forge (3) | slot com gear de `hp` trocado C7 · slot com gear sem `hp` trocado C7 · slot vazio C7 | - |
| validation order (4 pairs) | `unknown_recipe` antes de `player_not_found` C13 · `player_not_found` antes de `already_owned` C13 · `already_owned` antes de `not_enough_materials` C13, C10 · `not_enough_materials` antes do saldo C13, C11 | - |
| nothing consumed on failure (5) | `already_owned` C10 · `not_enough_materials` C11 · saldo C12 · banco antes C17 · banco depois dos materiais C17 | - |
| catalog integrity rules (4) | kind válido C3 · saída existe C3 · material existe com quantity ≥ 1 C3 · gear sem preço tem receita C3 | - |
| new error codes (2) | `unknown_recipe` C18 · `not_enough_materials` C18 | - |
| screen card status (3) | `JÁ POSSUI` C20 · `PRONTO` C20 · `FALTAM MATERIAIS` C20 | - |
| screen detail lines (4) | material `tem/precisa` C21 · `custo:` presente e ausente C21 · `bônus:` presente e ausente C21 · raridade/nome/descrição C21 | - |
| screen button labels (6) | `FORJAR` C22 · `FORJAR E EQUIPAR` C22 · `JÁ POSSUI` C22, C32 · `FALTAM MATERIAIS` C22 · `COINS INSUFICIENTES` C22 · `GEMS INSUFICIENTES` C22 | - |
| screen label priority (4) | card: possuído sem materiais C32 · card: possuído sem saldo C32 · botão: possuído sem materiais C32 · botão: possuído sem saldo C32; materiais antes de saldo C22 (`FALTAM MATERIAIS` com 0 coins) | - |
| action outcomes on screen (5) | item 200 C23 · gear 200 C23 · erro com mensagem C24 · sem corpo C24 · rede C24 | - |
| craft-only gear in EQUIPAMENTOS (2) | não possuído C26 · possuído C26 | - |
| phone widths (2) | 390 C27 · 360 C27 | - |
| Landing doors (4) | 1 C1, C29 · 2 C2, C4, C26, C29 · 3 C5, C28 · 4 C18 | - |
| entities (0) | none - Relations `None` | - |
| stored data (0) | nothing to migrate - Impact | - |
| startup config: catalog (1 shared assembly) | `catalog.Load` usado por `main` e por `apptest` C1 | - |

- Claims naming a status code, route or response shape go through `NewRouter` (C4-C18); C3 is the catalog's own layer
- Web claims at unit level assert the rendered screen; the browser boundary is C27 (layout) and C28 (`/api` rewrite)

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- forge handler: receita conhecida, posse do gear, cada material, moeda e saldo, saída por kind -> decides, boundary C5-C17 (a lógica vive no handler, como `BuyGear`; não há camada própria abaixo dele)
- `shop.equip`: já decide troca de slot e HP; forja o reusa -> decides, boundary C7 and the existing `TestHPBonus_EquipAndRemove`
- `BuyGear` price guard -> decides, boundary C4
- `ShopScene` forge section: status por estado, rótulo do botão por prioridade, linhas do detalhe, mensagens -> decides at screen level C19-C26
- catalog additions: data plus lookups -> instrumentation, covered by C1, C2; referential rules own layer C3
- closest analogue: `api/internal/shop` `BuyGear` / `Discard` (guards inside `WithLocked`, proven at the boundary) and `ShopScene` detail states (screen level)

## Swept

- validation: C3, C8, C9, C11, C13
- failure modes: C17, C24
- idempotency: n/a - forjar duas vezes com materiais para duas é a regra (plan Assumptions); C25 impede o clique duplo na tela; C10 impede gear duplicado
- authorization: C15
- concurrency: C16
- data lifecycle: n/a - nada de receita é gravado; gear ou item que sai do catálogo segue as regras existentes do shop; C3 recusa receita apontando para id inexistente
- dependency failure: n/a - nenhuma dependência externa; falha de banco coberta por C17
- state transitions: C6, C7 (material → saída; gear não possuído → possuído e equipado), C10 (possuído não volta a forjar)
- observability: C17 (500 com `request_id`); nenhum evento de log novo, como `shop`

## Impact on earlier checks

- shop-inventory-avatar web "shows the three sections": asserts `EQUIPAMENTOS DO DEV` with 6 names from the web mock; the mock gains the 3 craft-only gears (C29), so the list becomes 9 names - the claim (catalog order) does not change
- shop-inventory-avatar api `TestCatalog_ServesShop`: asserts `gear` by value; `Price` becomes `*Price`, and the count check changes from exactly 6 to the first 6 by value (the 3 craft-only pieces follow, proven by C2) - the 6 existing values do not change

## Handoff

- Leitura: api ~95 KB + web ~70 KB ≈ 165 KB / 4 ≈ 41k, mais ~40k de código novo - abaixo do budget de 150k: um builder, sem handoff
- **Boundary:** one builder, C1–C31 closed, `a089239..HEAD` (specs `169103d`, api `c4fc09c`, art `cb67dd5`, web `fa32ff0`); api `go test ./...`, web `vitest run` (433), e2e `playwright test` (104), `go vet`, `eslint`, `next build` and `make art-check` green at `fa32ff0`
- **Settled mid-build:** nada pelo usuário. O e2e roda num `git worktree` com `node_modules` clonado (`cp -Rc`), porque o `next dev` do usuário ocupa `web/` e o Next recusa um segundo servidor no mesmo diretório; Turbopack recusa `node_modules` por symlink
- **Abandoned:** e2e forjando de verdade - os e2e não semeiam o banco e um dev novo não tem drops; C28 prova a rota pela reescrita `/api` com o `409`, e o `200` fica nas provas da api (C5, C6) e da tela (C23)

## Progress

- [x] C1
- [x] C2
- [x] C3
- [x] C4
- [x] C5
- [x] C6
- [x] C7
- [x] C8
- [x] C9
- [x] C10
- [x] C11
- [x] C12
- [x] C13
- [x] C14
- [x] C15
- [x] C16
- [x] C17
- [x] C18
- [x] C19
- [x] C20
- [x] C21
- [x] C22
- [x] C23
- [x] C24
- [x] C25
- [x] C26
- [x] C27
- [x] C28
- [x] C29
- [x] C30
- [x] C31
- [x] C32
- [x] C33

Round 2 (after verification round 1 FAIL):

- **Boundary:** C32 (`JÁ POSSUI` vence materiais e saldo, cartão e botão) e C33 (`422 unknown_gear` com catálogo injetado) adicionados; AC 26 e a nota de Surface no plano, marcados `added after verification round 1`; nenhum check ou linha aprovada reescrita
- **Settled mid-build:** nada pelo usuário; o ramo `unknown_gear` fica e ganha prova (L-036), porque remover deixaria a forja equipar um gear vazio se o catálogo for rebalanceado sem o gear
- **Abandoned:** nada
