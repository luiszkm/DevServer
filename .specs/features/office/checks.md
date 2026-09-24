# Office checks

Profile: standard
Plan: `.specs/features/office/plan.md`

41 checks in 4 slices · 8 one-way doors · 0 open

## Checks

### S1 - Catálogo e forma do jogador · ~5 files · ~35 KB · ~9k

**C1** - `GET /api/catalog` serve `office` com `zones` = `[{parede, PAREDE, 8}, {piso, PISO, 24}]`, `maxDeployCut` = 40, os 5 `levels` `{0 CANTINHO}`, `{30 HOME OFFICE}`, `{70 ESTÚDIO}`, `{120 LAB DEV}`, `{180 SEDE DEVSERVE}` e os 12 `furniture` na ordem `mesa`, `cadeira_gamer`, `setup2`, `rack`, `cafeteira`, `estante`, `planta`, `tapete`, `neon`, `poster`, `kanban`, `janela`, cada um com `name`, `glyph`, `color`, `zone`, `price`, `comfort`, `bonus` e `description` iguais ao protótipo, comparados por valor (OFFICE-01, AC 1; door 2)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesOffice$'`

**C2** - Com `mesa` em `piso` 0 e `neon` em `parede` 1, `GET /api/me` devolve `office` = `{"parede": [null,"neon",null,null,null,null,null,null], "piso": ["mesa", null × 23]}` (OFFICE-01, AC 2; door 4)
Proof: `cd api && go test ./internal/office -run '^TestMe_OfficeField$'`

**C3** - `POST /api/players` responde `201` com `office.parede` = 8 `null` e `office.piso` = 24 `null` (OFFICE-01, AC 3)
Proof: `cd api && go test ./internal/office -run '^TestCreatePlayer_OfficeDefaults$'`

### S2 - Instalar e guardar · ~4 files · ~30 KB · ~8k

**C4** - Com 100 coins, `POST /api/me/office/piso/0` com `{"furniture":"mesa"}` responde `200` com coins 40 e `office.piso[0]` = `mesa`; com 40 gems, `cadeira_gamer` em `piso` 23 deixa gems 0; com 35 gems, `neon` em `parede` 7 deixa gems 0 (OFFICE-02, AC 4; door 5)
Proof: `cd api && go test ./internal/office -run '^TestInstall_PaysAndPlaces$'`

**C5** - Com 59 coins, `mesa` responde `409 not_enough_coins` e nada muda; com 60 coins paga e deixa 0; com 39 gems, `cadeira_gamer` responde `409 not_enough_gems` e nada muda; com 40 gems paga e deixa 0 (OFFICE-02, AC 5)
Proof: `cd api && go test ./internal/office -run '^TestInstall_BalanceBoundary$'`

**C6** - Com `mesa` em `piso` 0 e 1000 coins, instalar `planta` em `piso` 0 responde `409 cell_occupied`, o espaço continua `mesa` e coins 1000 (OFFICE-02, AC 6)
Proof: `cd api && go test ./internal/office -run '^TestInstall_CellOccupied$'`

**C7** - `neon` em `piso` 0 responde `422 wrong_zone` com `error.message` = `esse móvel vai na parede`; `mesa` em `parede` 0 responde `422 wrong_zone` com `esse móvel vai no piso`; nada muda (OFFICE-02, AC 7)
Proof: `cd api && go test ./internal/office -run '^TestInstall_WrongZone$'`

**C8** - `{"furniture":"x"}` e `{}` respondem `422 unknown_furniture` sem mudar nada (OFFICE-02, AC 8)
Proof: `cd api && go test ./internal/office -run '^TestInstall_UnknownFurniture$'`

**C9** - Na instalação e no guardar: `office/x/0`, `office/parede/-1`, `office/parede/8`, `office/piso/24` e `office/piso/a` respondem `422 unknown_cell`; `office/parede/7` e `office/piso/23` são aceitos (OFFICE-02, AC 9)
Proof: `cd api && go test ./internal/office -run '^TestOfficeCell_Bounds$'`

**C10** - Corpo `{` e `{"furniture": 1}` na instalação respondem `422 invalid_body` sem mudar nada (OFFICE-02, AC 10; L-008)
Proof: `cd api && go test ./internal/office -run '^TestInstall_InvalidBody$'`

**C11** - Com 120 coins, `mesa` em `piso` 0 e depois em `piso` 1 respondem `200` e deixam coins 0 e `office.piso[0]` = `office.piso[1]` = `mesa` (OFFICE-02, AC 11)
Proof: `cd api && go test ./internal/office -run '^TestInstall_Duplicates$'`

**C12** - Guardar responde `200` e devolve metade arredondada para baixo na moeda do móvel: `mesa` (60c) +30 coins, `cafeteira` (55c) +27 coins, `cadeira_gamer` (40g) +20 gems, `janela` (60g) +30 gems; o espaço fica `null` (OFFICE-02, AC 12; door 5)
Proof: `cd api && go test ./internal/office -run '^TestRemove_RefundsHalf$'`

**C13** - Guardar `piso` 5 vazio responde `200` e o jogador e `player_office` ficam iguais; guardar duas vezes o mesmo espaço devolve o reembolso uma vez só (OFFICE-02, AC 13)
Proof: `cd api && go test ./internal/office -run '^TestRemove_EmptyCell$'`

**C14** - A ordem das validações é a do plano: `office/x/0` com `{"furniture":"x"}` responde `unknown_cell`; `office/piso/0` com `{"furniture":"x"}` e o espaço ocupado responde `unknown_furniture`; `neon` em `piso` 0 ocupado responde `wrong_zone`; `planta` em `piso` 0 ocupado com 0 coins responde `cell_occupied` (OFFICE-02, AC 5–9; plan Assumptions)
Proof: `cd api && go test ./internal/office -run '^TestInstall_ValidationOrder$'`

### Cross-cutting api · ~3 files · ~20 KB · ~5k

**C15** - Sem sessão, `POST /api/me/office/piso/0` e `POST /api/me/office/piso/0/remove` respondem `401 unauthenticated` (OFFICE-02)
Proof: `cd api && go test ./internal/office -run '^TestOfficeRoutes_RequireSession$'`

**C16** - Com `player_office` indisponível, `GET /api/me`, `POST /api/me/deploys`, a instalação e o guardar respondem `500 internal`, o log traz o `request_id` e a causa `player_office`, e o jogador não muda (OFFICE-01, OFFICE-02; AD-005; L-001, L-011)
Proof: `cd api && go test ./internal/office -run '^TestOffice_LoadFailure$'`

**C17** - Com 60 coins, duas instalações simultâneas de `mesa` em `piso` 0 e `piso` 1 terminam com um `200` e um `409 not_enough_coins` e coins 0; duas simultâneas de `planta` no mesmo `piso` 2 com 1000 coins terminam com um `200` e um `409 cell_occupied` e coins 975 (AD-004)
Proof: `cd api && go test ./internal/office -run '^TestInstall_ConcurrentSerialize$'`

**C18** - O banco recusa uma segunda linha `player_office` no mesmo (jogador, zona, posição) e uma linha com `position` = -1 (door 1)
Proof: `cd api && go test ./internal/office -run '^TestTables_OfficeConstraints$'`

**C19** - Os códigos novos `unknown_cell`, `unknown_furniture`, `wrong_zone` e `cell_occupied` chegam como `{"error":{"code":"<código>","message":"<não vazio>"}}` (door 8; AD-005)
Proof: `cd api && go test ./internal/office -run '^TestOffice_ErrorCodes$'`

**C20** - A migração 00006 cria `player_office` vazia sobre jogadores existentes, e `GET /api/me` responde `200` com 8 + 24 `null` (door 1; stored data)
Proof: `cd api && go test ./internal/office -run '^TestMigration_OfficeExistingPlayers$'`

### S3 - Bônus do escritório · ~5 files · ~40 KB · ~10k

**C21** - `player.Bonus` soma o escritório por tipo: `mesa` + `estante` + `kanban` xp 7; `setup2` + `rack` deploy 11; 8 `setup2` deploy 40; 7 `setup2` + `rack` (41) deploy 40; `cadeira_gamer` + `cafeteira` spregen 3; `planta` soma 0 em todos; móveis somam 0 em `hp`, `sp` e `dmg`; skills, equipamentos e skin somam 0 em `xp`, `deploy` e `spregen` (OFFICE-03, AC 14; door 3)
Proof: `cd api && go test ./internal/player -run '^TestBonus_Office$'`

**C22** - `POST /api/me/deploys` NV.1 em T responde `201` com `deploy.endsAt` = T+900 s sem móveis, T+855 s com um `setup2`, T+801 s com `setup2` + `rack`, T+540 s com 8 `setup2`; NV.4 com 8 `setup2` T+6480 s; num catálogo de teste com nível de 1 minuto, 11% dá 53 s (53,4) e 12% dá 53 s (52,8); `deploy_jobs.ends_at` igual à resposta (OFFICE-03, AC 15; door 6; L-009)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_OfficeCutsDuration$'`

**C23** - NV.1 (80 XP, 40 coins, 0 gems) grava XP 80 sem móveis, 82 com `mesa` (82,4), 84 com `mesa` + `estante`, 86 com `mesa` + `estante` + `kanban` (85,6); coins 40 e gems 0 em todos; a coleta responde `reward.xp` = XP gravada (OFFICE-03, AC 16; door 6)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_OfficeBoostsXP$'`

**C24** - NV.1 iniciado em T com um `setup2` (`endsAt` T+855 s); guardar o `setup2` e instalar `mesa` e 8 `setup2` não muda `deploy_jobs.ends_at` nem `xp`; em T+855 s a coleta responde `200` com `reward.xp` = 80 (OFFICE-03, AC 17; door 6)
Proof: `cd api && go test ./internal/deploy -run '^TestDeploy_OfficeFrozenAtStart$'`

**C25** - Na vila (SP 50) com `cadeira_gamer` + `cafeteira`, FIX (custo 10) com contra-ataque não fatal deixa SP 48 (40 + 5 + 3); sem móveis deixa 45; PLAIN em SP 50 fica em 50 (limite); `EndTurn` com `SPRegenBonus` 3 soma 8 e com 0 soma 5 (OFFICE-03, AC 18)
Proof: `cd api && go test ./internal/battle -run '^TestTurn_OfficeSPRegen$'`
Proof: `cd api && go test ./internal/battle -run '^TestEndTurn_SPRegenBonus$'`

**C26** - Com um de cada móvel com bônus instalado, `POST /api/me/battle` na vila dá SP 50/50, FIX com sorteio 6 causa 20, `hpMax` segue 100 e a vitória paga XP 90, coins 40, gems 1 (OFFICE-03, AC 19)
Proof: `cd api && go test ./internal/battle -run '^TestBattle_OfficeLeavesCombatStats$'`

### S4 - Tela OFFICE · ~7 files · ~60 KB · ~15k

**C27** - As abas são `TÍTULO`, `MUNDO`, `DEPLOY`, `BUG FIGHT`, `SKILLS`, `LOJA`, `AVATAR`, `OFFICE` com `OFFICE` → `/office` como 08 (OFFICE-04, AC 20; door 7)
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "tab order and routes"`

**C28** - `/office` exibe `CATÁLOGO`, `escolha e clique num espaço da sala`, 12 cartões na ordem do catálogo com glifo e preço curto (`[==]` `60C`, `[|]` `40G`, … `[/]` `60G`), os filtros `TODOS`, `PAREDE`, `PISO` com só `TODOS` pressionado, e `mesa` selecionada (OFFICE-04, AC 21)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "catalog panel"`

**C29** - `PAREDE` lista só `neon`, `poster`, `kanban`, `janela`; `PISO` lista só os 8 do piso; `TODOS` volta aos 12 (OFFICE-04, AC 22)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "filters by zone"`

**C30** - O detalhe exibe `MESA EM L`, `60 COINS` e `Espaço para dois monitores e o café. · PISO · conforto +8 · +3% XP`; `SETUP 2 TELAS` `90 GEMS` termina em `· -5% tempo`; `CADEIRA GAMER` em `· +1 SP/turno`; `PLANTA DE CANTO` termina em `· conforto +5`; `LETREIRO NEON` mostra `· PAREDE ·` (OFFICE-04, AC 23)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "detail per furniture"`

**C31** - Sala vazia: `CANTINHO`, `0 móveis instalados`, `PAREDE` com 8 espaços e `PISO` com 24, todos `+`; com `neon` em `parede` 1 e `mesa` em `piso` 0, esses espaços exibem `~~` `LETREIRO NEON` e `[==]` `MESA EM L`, os outros `+`, e `2 móveis instalados` (OFFICE-04, AC 24)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "room grid"`

**C32** - Conforto 0 exibe `faltam 30 de conforto para HOME OFFICE · clicar num móvel já instalado guarda ele e devolve metade do valor.`; conforto 180 exibe `escritório no nível máximo de conforto · clicar num móvel já instalado guarda ele e devolve metade do valor.` (OFFICE-04, AC 25)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "footer"`

**C33** - O nível segue o conforto nos limites 0 e 29 `CANTINHO`, 30 e 69 `HOME OFFICE`, 70 e 119 `ESTÚDIO`, 120 e 179 `LAB DEV`, 180 `SEDE DEVSERVE`; com `mesa`, `estante`, `cadeira_gamer`, `cafeteira` e 9 `setup2` o painel exibe `CONFORTO 157`, `XP DE DEPLOY +5%`, `TEMPO DE DEPLOY -40%` (45 limitado) e `SP POR TURNO +3` (OFFICE-04, AC 26)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "level and stats"`

**C34** - Com `neon` selecionado, clicar um espaço vazio do piso exibe `ESSE MÓVEL VAI NA PAREDE`; com `mesa`, um da parede exibe `ESSE MÓVEL VAI NO PISO`; nenhum chama `fetch` (OFFICE-04, AC 27)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "wrong zone"`

**C35** - Com 59 coins, `mesa` num espaço vazio do piso exibe `COINS INSUFICIENTES` sem chamar `fetch`, e com 60 chama a instalação; com 39 gems, `cadeira_gamer` exibe `GEMS INSUFICIENTES` sem chamar `fetch`, e com 40 chama (OFFICE-04, AC 28)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "insufficient balance"`

**C36** - Clicar `piso` 3 vazio com `mesa` chama `POST /api/me/office/piso/3` com corpo `{"furniture":"mesa"}`, repassa o `player` recebido e exibe `MESA EM L INSTALADO` (OFFICE-04, AC 29)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "install"`

**C37** - Clicar `piso` 0 com `mesa` chama `POST /api/me/office/piso/0/remove`, repassa o `player` e exibe `GUARDADO · +30 COINS`; `cafeteira` exibe `GUARDADO · +27 COINS`; `janela` em `parede` 2 exibe `GUARDADO · +30 GEMS` (OFFICE-04, AC 30)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "remove"`

**C38** - Na instalação e no guardar: `409` com `error.message` `o espaço já tem um móvel` exibe essa mensagem; `500` sem corpo e falha de rede exibem `falha na conexão. tente de novo.`; a sala continua na tela (OFFICE-04, AC 31)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "action errors"`

**C39** - Com uma instalação pendente, os 32 espaços da sala ficam desabilitados, e voltam ao responder (OFFICE-04, AC 32)
Proof: `cd web && npx vitest run src/components/OfficeScene.test.tsx -t "pending disables room"`

### Round trip · ~3 files · ~10 KB · ~3k

**C40** - No navegador, novo dev com 100 coins: OFFICE → `PLANTA DE CANTO` → espaço do piso exibe `PLANTA DE CANTO INSTALADO` e o HUD 75 coins; recarregar mantém a planta no espaço, `1 móveis instalados` e 75; clicar a planta exibe `GUARDADO · +12 COINS` e o HUD 87 (OFFICE-04)
Proof: `cd web && npx playwright test e2e/office.spec.ts -g "install and remove"`

**C41** - Nenhuma das 8 rotas, `/office` incluída, exibe `EM BREVE` (shop C46; plan Impact)
Proof: `cd web && npx vitest run src/components/ComingSoon.test.tsx -t "no scene shows EM BREVE"`

## Progress

- [ ] C1
- [ ] C2
- [ ] C3
- [ ] C4
- [ ] C5
- [ ] C6
- [ ] C7
- [ ] C8
- [ ] C9
- [ ] C10
- [ ] C11
- [ ] C12
- [ ] C13
- [ ] C14
- [ ] C15
- [ ] C16
- [ ] C17
- [ ] C18
- [ ] C19
- [ ] C20
- [ ] C21
- [ ] C22
- [ ] C23
- [ ] C24
- [ ] C25
- [ ] C26
- [ ] C27
- [ ] C28
- [ ] C29
- [ ] C30
- [ ] C31
- [ ] C32
- [ ] C33
- [ ] C34
- [ ] C35
- [ ] C36
- [ ] C37
- [ ] C38
- [ ] C39
- [ ] C40
- [ ] C41

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/me/office/{zone}/{position}` statuses (10) | 200 C4 · 401 C15 · 409 `not_enough_gems` C5 · 409 `not_enough_coins` C5 · 409 `cell_occupied` C6 · 422 `invalid_body` C10 · 422 `unknown_cell` C9 · 422 `unknown_furniture` C8 · 422 `wrong_zone` C7 · 500 C16 | - |
| `POST /api/me/office/{zone}/{position}/remove` statuses (4) | 200 C12, C13 · 401 C15 · 422 `unknown_cell` C9 · 500 C16 | - |
| `POST /api/me/deploys` statuses (8) | 201 C22, deploy-pipelines C1 · 401 deploy-pipelines C9 · 409 `deploy_running` deploy-pipelines C2 · 422 `invalid_body` deploy-pipelines C39 · 422 `unknown_deploy_type` deploy-pipelines C4 · 422 `unknown_deploy_level` deploy-pipelines C5 · 422 `level_too_low` deploy-pipelines C3 · 500 C16, deploy-pipelines C38 | - |
| `GET /api/me` statuses (4) | 200 C2 · 401 foundation C9 · 404 `player_not_found` foundation C38 · 500 C16 | - |
| `GET /api/catalog` new fields (1) | `office` C1 | - |
| `player` new fields (1) | `office` C2, C3 | - |
| furniture catalog (12) | C1, table-driven over all 12 | - |
| zones (2) | `parede` C1, C9 · `piso` C1, C9 | - |
| levels (5) | `CANTINHO` C1, C33 · `HOME OFFICE` C1, C33 · `ESTÚDIO` C1, C33 · `LAB DEV` C1, C33 · `SEDE DEVSERVE` C1, C33 | - |
| cell bounds (7) | zona desconhecida C9 · -1 C9 · `parede` 7 C9 · `parede` 8 C9 · `piso` 23 C9 · `piso` 24 C9 · não inteiro C9 | - |
| balance boundary (4) | coins abaixo C5 · coins igual C5 · gems abaixo C5 · gems igual C5 | - |
| validation order (4) | `unknown_cell` antes de `unknown_furniture` C14 · `unknown_furniture` antes de `cell_occupied` C14 · `wrong_zone` antes de `cell_occupied` C14 · `cell_occupied` antes do saldo C14 | - |
| refund (3) | coins par C12 · coins ímpar arredonda para baixo C12 · gems C12 | - |
| bonus types (3) | `xp` C21, C23 · `deploy` C21, C22 · `spregen` C21, C25 | - |
| bonus limits and exclusions (4) | teto 40 C21, C22, C33 · móvel sem bônus C21 · escritório fora de `hp`/`sp`/`dmg` C21, C26 · outras fontes fora dos tipos do escritório C21 | - |
| rounding (4) | duração para baixo C22 · duração para cima C22 · XP para baixo C23 · XP para cima C23 | - |
| deploy snapshot (2) | `ends_at` congelado C24 · XP congelada C24 | - |
| SP regen (3) | com escritório C25 · sem escritório C25 · limite no SP máximo C25 | - |
| new error codes (4) | C19, table-driven over all 4; `wrong_zone` messages (2) C7 | - |
| screen filters (3) | `TODOS` C28, C29 · `PAREDE` C29 · `PISO` C29 | - |
| screen bonus text (4) | `+N% XP` C30 · `-N% tempo` C30 · `+N SP/turno` C30 · sem bônus C30 | - |
| screen price tag (2) | `C` C28 · `G` C28 | - |
| screen cell states (2) | vazio `+` C31 · ocupado glifo e nome C31 | - |
| screen stats panels (4) | `CONFORTO` C33 · `XP DE DEPLOY` C33 · `TEMPO DE DEPLOY` C33 · `SP POR TURNO` C33 | - |
| screen footer (2) | próximo nível C32 · nível máximo C32 | - |
| screen toasts (7) | `<NOME> INSTALADO` C36 · `GUARDADO · +N COINS` C37 · `GUARDADO · +N GEMS` C37 · `ESSE MÓVEL VAI NA PAREDE` C34 · `ESSE MÓVEL VAI NO PISO` C34 · `COINS INSUFICIENTES` C35 · `GEMS INSUFICIENTES` C35 | - |
| action outcomes on screen (8) | instalar: 200 C36 · erro com mensagem C38 · sem corpo C38 · rede C38; guardar: 200 C37 · erro com mensagem C38 · sem corpo C38 · rede C38 | - |
| Landing doors (8) | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C22, C23, C24 · 7 C27 · 8 C19 | - |
| entities (1) | `PlayerOfficeCell` C18 | - |
| stored data (1) | jogadores existentes C20 | - |
| startup config: catalog (1 shared assembly) | `app.Deps.Catalog` em `main` e em `apptest` C1 | - |

- Claims naming a status code, route or response shape go through `NewRouter`, except C21 and C25's `EndTurn` proof (own layer) and C18 (constraints)
- Web claims at unit level assert the rendered screen; the browser round trip is C40
- C22's rounding members use `apptest.NewWithCatalog` with a 1-minute level: every real level is a multiple of 15 minutes, so real durations never round

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- `player.Bonus`: 4 fontes (skills, equipamentos, skin, escritório) × 6 tipos, teto em `deploy`, móvel sem bônus -> decides, own layer C21 and boundary C22, C23, C25
- office handlers: zona conhecida, posição no limite, móvel conhecido, zona do móvel, espaço ocupado, saldo por moeda, reembolso por moeda -> decides, boundary C4–C14
- `deploy.Start`: duração e XP com bônus e arredondamento -> decides, boundary C22–C24
- `battle.EndTurn`: regen com bônus e limite -> decides, own layer C25 (`EndTurn`) and boundary C25, C26
- `OfficeScene`: filtro, detalhe, estado do espaço, pré-checagem de zona e saldo, nível por limite, avisos -> decides at screen level (C28–C39)
- catalog additions: data plus lookups -> instrumentation, covered by C1
- closest analogue: `api/internal/shop` (guards inside `WithLocked`, saldo por moeda) and `player.Bonus` (own layer + boundary, shop C18)

## Swept

- validation: C5, C7, C8, C9, C10, C14
- failure modes: C16, C38
- idempotency: C13 (guardar vazio e guardar duas vezes), C6 (instalar em ocupado não cobra)
- authorization: C15
- concurrency: C17
- data lifecycle: C20 (jogadores existentes); guardar apaga a linha (C12), sem arquivamento
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C16
- state transitions: C4, C12 (vazio → ocupado → vazio), C24 (deploy congelado no início)
- observability: C16 (500 com `request_id` e causa); nenhum evento de log novo, como o `shop`

## Impact on earlier checks

- foundation C26 / shop C46 (7 abas): passa a 8 com `OFFICE` → `/office`; C27 substitui a prova da ordem das abas
- shop C46 (`ComingSoon` sobre 7 cenas): C41 passa a cobrir 8

## Handoff

- Leitura: api ~76 KB + web ~49 KB ≈ 125 KB / 4 ≈ 31k, mais ~40k de código novo - abaixo do budget de 150k: um builder, sem handoff
