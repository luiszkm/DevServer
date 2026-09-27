# Office keyart checks

Profile: standard
Plan: `.specs/features/office-keyart/plan.md`

36 checks in 3 slices · 5 one-way doors · 0 open

## Checks

### S1 - Catálogo em categorias com arte da keyart · ~8 files · ~120 KB · ~30k

**C1** - `GET /api/catalog` serve `office.categories` = `[{moveis, MÓVEIS}, {decoracoes, DECORAÇÕES}, {tecnologias, TECNOLOGIAS}, {mascotes, MASCOTES}]` e 45 `furniture` na ordem da plan (MÓVEIS: `mesa`, `cadeira_gamer`, `monitor`, `laptop`, `estante`, `sofa`, `puff`, `cama`, `gaveteiro`, `prateleira`, `planta`, `luminaria`, `setup2`, `cafeteira`; DECORAÇÕES: `quadro`, `poster`, `relogio`, `trofeu`, `guitarra`, `estatua`, `livros`, `almofada`, `tapete`, `caixa`, `camiseta`, `boneco`, `neon`, `kanban`, `janela`; TECNOLOGIAS: `servidor`, `pc`, `nas`, `router`, `nuvem`, `painel`, `monitor_ops`, `rack`; MASCOTES: `github`, `python`, `java`, `go`, `nodejs`, `react`, `rust`, `docker`), cada uma com `category`, `name`, `zone`, `price`, `comfort` e `bonus` iguais à plan, e os 12 existentes com `glyph`, `color` e `description` de hoje, comparados por valor (OFFKEY-01, AC 1; door 1)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesOffice$'`

**C2** - `office.lights` = `[{natural, NATURAL, 0}, {quente, LUZ QUENTE, 30}, {noite, NOITE, 70}, {neon, NEON, 120}]` e `office.templates` = `basico` BÁSICO, `conforto` CONFORTO, `profissional` PROFISSIONAL, `gamer` GAMER com as peças `{zone, position, furniture}` da tabela "Templates", comparados por valor (OFFKEY-01, AC 2; door 1)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesOfficeLightsAndTemplates$'`

**C3** - Toda peça de todo template está numa zona do catálogo, numa posição `< cells`, com um móvel do catálogo cuja `zone` é a da peça, sem dois espaços repetidos no mesmo template; toda peça tem `category` entre as 4 categorias (OFFKEY-01, AC 1, AC 2)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_OfficeReferencesResolve$'`

**C4** - Para cada uma das 45 peças existe `web/art/icon/office-<id>.json` e `web/public/art/icon/office-<id>.png` 16x16 que o renderer reproduz byte a byte (OFFKEY-01, AC 3)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t 'furniture icons per office.json' && cd .. && make art-check`

**C5** - `/office` exibe os filtros `TODOS`, `MÓVEIS`, `DECORAÇÕES`, `TECNOLOGIAS`, `MASCOTES` nessa ordem, `TODOS` pressionado, e um cartão por peça na ordem do catálogo, cada cartão com `<img src="/art/icon/office-<id>.png">` (OFFKEY-01, AC 3, AC 4)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'category filters and cards'`

**C6** - Clicar em cada filtro de categoria lista só as peças daquela categoria, na ordem do catálogo, e pressiona só esse filtro (um caso por categoria) (OFFKEY-01, AC 5)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'filter by category'`

### S2 - Iluminação · ~10 files · ~110 KB · ~28k

**C7** - `POST /api/players` responde `201` com `officeLight` = `natural`, e `GET /api/me` devolve `officeLight` (OFFKEY-02, AC 6; door 2)
Proof: `cd api && go test ./internal/office -run '^TestCreatePlayer_OfficeLightDefault$'`

**C8** - Com `neon` + `cadeira_gamer` + `mesa` instalados (conforto 30), `POST /api/me/office/light` `{"light":"quente"}` responde `200` com `officeLight` = `quente`, e `GET /api/me` repete `quente`; com conforto 0, `natural` responde `200` (OFFKEY-02, AC 7; door 4)
Proof: `cd api && go test ./internal/office -run '^TestLight_SetsAtComfort$'`

**C9** - Com `janela` + `setup2` (conforto 29), `quente` responde `409 light_locked` com a mensagem `falta conforto para essa luz` e nada muda (OFFKEY-02, AC 8)
Proof: `cd api && go test ./internal/office -run '^TestLight_Locked$'`

**C10** - `{"light":"x"}` responde `422 unknown_light`; corpo `{` responde `422 invalid_body` (OFFKEY-02, AC 9)
Proof: `cd api && go test ./internal/office -run '^TestLight_Rejects$'`

**C11** - Validação da luz na ordem `invalid_body` → `unknown_light` → `light_locked`: com conforto 0, `{` responde `invalid_body` e `{"light":"x"}` responde `unknown_light` (OFFKEY-02, AC 9)
Proof: `cd api && go test ./internal/office -run '^TestLight_ValidationOrder$'`

**C12** - Com `quente` gravada a conforto 30, guardar a `mesa` (conforto 22) mantém `officeLight` = `quente` (OFFKEY-02, AC 10)
Proof: `cd api && go test ./internal/office -run '^TestLight_KeptWhenComfortDrops$'`

**C13** - `players.office_light` = `sol` gravado direto no banco devolve `officeLight` = `natural` em `GET /api/me` (OFFKEY-02, AC 11)
Proof: `cd api && go test ./internal/office -run '^TestMe_OfficeLightOutsideCatalog$'`

**C14** - `players.office_light` é `NOT NULL` com padrão `natural`: `INSERT` sem a coluna lê `natural`, `UPDATE ... SET office_light = NULL` falha com `23502`; jogador que existia antes da migração 00016 lê `natural` (OFFKEY-02, AC 6; door 3)
Proof: `cd api && go test ./internal/office -run '^TestTables_OfficeLightColumn$'`

**C15** - `officeComfort` (own layer) soma o `comfort` dos móveis do catálogo instalados: sala vazia 0; `mesa` 8; `mesa` duas vezes 16; id fora do catálogo 0 (OFFKEY-02, AC 7, AC 8)
Proof: `cd api && go test ./internal/office -run '^TestOfficeComfort$'`

**C16** - `/office` exibe o painel `ILUMINAÇÃO` com `NATURAL`, `LUZ QUENTE`, `NOITE`, `NEON` nessa ordem, a luz do `player.officeLight` pressionada e as outras não; com conforto 30, `NOITE` e `NEON` desabilitadas com `conforto 70` e `conforto 120`, e `LUZ QUENTE` habilitada; com conforto 29, `LUZ QUENTE` desabilitada; a sala tem `data-light` igual a `player.officeLight` (OFFKEY-02, AC 12)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'lighting panel'`

**C17** - Clicar `LUZ QUENTE` liberada envia `POST /api/me/office/light` com `{"light":"quente"}`, repassa o `player` da resposta (`data-light="quente"`) e exibe `LUZ LUZ QUENTE`; `409` exibe a `error.message`; falha de rede exibe `falha na conexão. tente de novo.` (OFFKEY-02, AC 13)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'change light'`

**C18** - No navegador, a camada da sala (`.office-room::after`) tem `background-color` transparente em `natural` e três cores distintas e não transparentes em `quente`, `noite` e `neon` (OFFKEY-02, AC 14)
Proof: `cd web && npx playwright test e2e/office.spec.ts -g 'light tints the room'`

### S3 - Templates de layout · ~8 files · ~100 KB · ~25k

**C19** - Com a sala vazia e 9999 coins, `POST /api/me/office/template` `{"template":"basico"}` responde `200` com coins 9729, gems 9999 e as 7 peças nos seus espaços; `conforto` (9999/9999) deixa coins 9619 e gems 9939 e as 11 peças (OFFKEY-03, AC 15; door 4)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_InstallsAndPays$'`

**C20** - Com `mesa` já em `piso` 2, `basico` cobra 210 coins e instala as outras 6; aplicar `basico` de novo responde `200` sem mudar o saldo nem a sala (OFFKEY-03, AC 16)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_SkipsSamePiece$'`

**C21** - Com `planta` em `piso` 2 (espaço da `mesa` de `basico`), `basico` responde `409 cell_occupied` e nada muda; com `sofa_velho` (fora do catálogo) em `piso` 2, idem (OFFKEY-03, AC 17)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_CellOccupied$'`

**C22** - `basico` com 269 coins responde `409 not_enough_coins` e nada muda; com 270 coins deixa 0; `conforto` com 380 coins e 59 gems responde `409 not_enough_gems` e nada muda; com 60 gems deixa 0 e 0 (OFFKEY-03, AC 18)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_BalanceBoundary$'`

**C23** - `{"template":"x"}` responde `422 unknown_template`; corpo `{` responde `422 invalid_body` (OFFKEY-03, AC 19)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_Rejects$'`

**C24** - Ordem: `{` → `invalid_body` antes de `unknown_template`; `{"template":"x"}` com a sala bloqueada e sem saldo → `unknown_template`; `basico` com `planta` em `piso` 2 e 0 coins → `cell_occupied`; `conforto` com 0 coins e 0 gems → `not_enough_coins` (OFFKEY-03, AC 20)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_ValidationOrder$'`

**C25** - `planTemplate` (own layer) sobre as linhas: espaço vazio instala e soma o preço na moeda da peça; espaço com a mesma peça pula e não soma; espaço com outra peça do catálogo → `cell_occupied`; espaço com id fora do catálogo → `cell_occupied`; peça que saiu do catálogo → `unknown_furniture` (OFFKEY-03, AC 15-17)
Proof: `cd api && go test ./internal/office -run '^TestPlanTemplate$'`

**C26** - `/office` exibe `TEMPLATES DE LAYOUT` com os 4 cartões na ordem do catálogo, cada um com nome, descrição, preço (`270C`, `380C + 60G`, `220C + 395G`, `405C + 210G`), um ícone por peça e o botão `APLICAR` (OFFKEY-03, AC 21)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'templates panel'`

**C27** - Clicar `APLICAR` em BÁSICO envia `POST /api/me/office/template` com `{"template":"basico"}`, repassa o `player` e exibe `LAYOUT BÁSICO APLICADO`; `409` exibe a `error.message`; resposta sem corpo exibe `falha na conexão. tente de novo.` (OFFKEY-03, AC 22)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'apply template'`

**C28** - Enquanto `APLICAR` ou uma luz está pendente, todos os `APLICAR` e botões de luz ficam desabilitados, e voltam quando a resposta chega (OFFKEY-03, AC 23)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t 'pending disables layout and light'`

### Shared route proofs

**C29** - Sem sessão, `POST /api/me/office/light` e `POST /api/me/office/template` respondem `401 unauthenticated` (OFFKEY-02, OFFKEY-03)
Proof: `cd api && go test ./internal/office -run '^TestOfficeRoutes_RequireSession$'`

**C30** - Com sessão sem jogador, as duas rotas respondem `404 player_not_found` (OFFKEY-02, OFFKEY-03)
Proof: `cd api && go test ./internal/office -run '^TestKeyartRoutes_PlayerNotFound$'`

**C31** - Com `players.office_light` renomeada, `POST /api/me/office/light` e `GET /api/me` respondem `500 internal` com o `request_id` num log que cita `office_light`; com `player_office` renomeada, `POST /api/me/office/template` responde `500` com a causa `player_office`; nada muda (OFFKEY-02, OFFKEY-03)
Proof: `cd api && go test ./internal/office -run '^TestKeyartRoutes_LoadFailure$'`

**C32** - `unknown_light`, `light_locked` e `unknown_template` respondem `{"error":{"code","message"}}` com status 422, 409, 422 e as mensagens `luz desconhecida`, `falta conforto para essa luz`, `layout desconhecido` (door 5)
Proof: `cd api && go test ./internal/office -run '^TestKeyart_ErrorCodes$'`

**C33** - Duas aplicações de `basico` concorrentes com 270 coins: uma `200`, a outra `200` sem cobrar (peças iguais puladas); coins 0 e 7 peças (OFFKEY-03, AC 16)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_ConcurrentSerialize$'`

**C34** - Os tipos da web (`OfficeCategory`, `OfficeLight`, `OfficeTemplate`, `Furniture.category`, `Player.officeLight`) compilam contra o `next build` (OFFKEY-01..03)
Proof: `cd web && npm run build`

**C35** - Novo dev no navegador: `/office` → `APLICAR` em BÁSICO → HUD coins 9729 → sala com MESA EM L → reload mantém (OFFKEY-03, AC 15, AC 22)
Proof: `cd web && npx playwright test e2e/office.spec.ts -g 'apply layout template'`

**C36** - Toda peça instalada pelas rotas novas soma seus bônus por `player.Bonus`: depois de `profissional`, `TEMPO DE DEPLOY` = 16 (servidor 5 + rack 6 + setup2 5) no `officeStats` da web e `player.Bonus(deploy)` = 16 na api (AD-013)
Proof: `cd api && go test ./internal/office -run '^TestTemplate_BonusThroughPlayerBonus$' && cd ../web && npx vitest run src/components/OfficeScene.test.tsx -t 'template bonuses in stats'`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/me/office/light` statuses (7) | 200 C8 · 401 C29 · 404 `player_not_found` C30 · 409 `light_locked` C9 · 422 `invalid_body` C10 · 422 `unknown_light` C10 · 500 C31 | - |
| `POST /api/me/office/template` statuses (9) | 200 C19, C20 · 401 C29 · 404 `player_not_found` C30 · 409 `cell_occupied` C21 · 409 `not_enough_coins` C22 · 409 `not_enough_gems` C22 · 422 `invalid_body` C23 · 422 `unknown_template` C23 · 500 C31 | - |
| `GET /api/me` statuses this feature can change (2; 401 and 404 unchanged, foundation suite) | 200 C7 · 500 C31 | - |
| `GET /api/catalog` new fields (4) | `categories` C1 · `furniture[].category` C1 · `lights` C2 · `templates` C2 | - |
| `player` new fields (1) | `officeLight` C7, C13 | - |
| categories (4) | `moveis` C1, C6 · `decoracoes` C1, C6 · `tecnologias` C1, C6 · `mascotes` C1, C6 | - |
| furniture catalog (45) | C1, table-driven over all 45; icons C4 over all 45 | - |
| lights (4) | `natural` C2, C8, C16, C18 · `quente` C2, C8, C9, C16, C17, C18 · `noite` C2, C16, C18 · `neon` C2, C16, C18 | - |
| light comfort boundary (2) | igual libera C8 · abaixo bloqueia C9, C16 | - |
| templates (4) | `basico` C2, C19, C26 · `conforto` C2, C19, C22, C26 · `profissional` C2, C26, C36 · `gamer` C2, C26 | - |
| template cell rows (5) | vazio instala C25, C19 · mesma peça pula C25, C20 · outra peça C25, C21 · id fora do catálogo C25, C21 · peça de template fora do catálogo C25 | - |
| balance boundary (4) | coins abaixo C22 · coins igual C22 · gems abaixo C22 · gems igual C22 | - |
| validation order light (2 pairs) | `invalid_body` antes de `unknown_light` C11 · `unknown_light` antes de `light_locked` C11 | - |
| validation order template (4 pairs) | `invalid_body`/`unknown_template` C24 · `unknown_template`/`cell_occupied` C24 · `cell_occupied`/`not_enough_coins` C24 · `not_enough_coins`/`not_enough_gems` C24 | - |
| new error codes (3) | C32, table-driven over all 3 | - |
| comfort sum rows (4) | vazio C15 · um móvel C15 · repetido C15 · fora do catálogo C15 | - |
| screen filters (5) | `TODOS` C5 · `MÓVEIS` C6 · `DECORAÇÕES` C6 · `TECNOLOGIAS` C6 · `MASCOTES` C6 | - |
| screen light states (3) | pressionada C16 · liberada C16 · bloqueada C16 | - |
| screen toasts (2) | `LUZ <NOME>` C17 · `LAYOUT <NOME> APLICADO` C27 | - |
| screen error paths (4) | luz api C17 · luz rede C17 · template api C27 · template sem corpo C27 | - |
| template price text (2 shapes) | só coins C26 · coins + gems C26 | - |

- Claims naming a status code, route or response shape: C7-C14, C19-C24, C29-C33 - each has a proof that crosses the boundary
- No other check claims more than the single case its proof exercises

## Test policy

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Entry point that decides nothing | one at the boundary | accepted input, each rejected input, each error path |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence:

- `api/internal/office` `planTemplate`: dispatches each template row over 4 cell states -> decides, reached across a boundary: C19-C22 at the boundary, C25 at its own layer
- `api/internal/office` `officeComfort`: sums with a catalog lookup that skips unknown ids -> decides, reached across a boundary: C8, C9 at the boundary, C15 at its own layer
- `api/internal/office` `SetLight`, `ApplyTemplate`: guards in fixed order -> entry points proven at the boundary (C8-C11, C19-C24, C29-C31)
- `web/src/components/OfficeScene.tsx`: filter, light lock, pending -> screen tests C5, C6, C16, C17, C26-C28
- closest analogue in the repo: `api/internal/office` `Install`, same shape, proven at the boundary in `office_test.go`

## Swept

- validation: C10, C11, C21-C24
- failure modes: C31
- idempotency: C20 (aplicar duas vezes não cobra), C33
- authorization: C29, C30
- concurrency: C33 (row lock via `player.WithLocked`, office C17 proves the lock itself)
- data lifecycle: C13 (luz fora do catálogo), C14 (jogadores existentes), C21 (peça fora do catálogo na sala)
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C31
- state transitions: C8, C12 (luz troca e fica), C19, C20 (sala vazia → template → template de novo)
- observability: C31 (500 com `request_id` e causa); nenhum evento de log novo, como o `office`

## Impact on earlier checks

- office C1 (`TestCatalog_ServesOffice`, 12 móveis): substituído por C1 (45 em categorias; os 12 com os mesmos valores)
- office C29 (filtros `PAREDE`/`PISO`): substituído por C5/C6; a regra de zona segue provada por office C7 e C34
- office C28 (cartões na ordem do catálogo, filtros `TODOS`/`PAREDE`/`PISO`): a parte dos filtros passa a C5

## Handoff

- Leitura: api ~70 KB + web ~60 KB + 33 specs de ícone ≈ 160 KB / 4 ≈ 40k, mais ~40k de código novo - abaixo do budget de 150k: um builder, sem handoff
