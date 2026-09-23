# Deploy pipelines - checks

Profile: standard
Plan: `.specs/features/deploy-pipelines/plan.md`

## Intent

38 checks in 3 slices · 8 one-way doors · 0 open

Pré-requisitos: os mesmos da foundation (`docker compose up -d --wait db`; vitest com `fetch` mockado; Playwright sobe a stack). Testes Go controlam o tempo por `apptest.Env.Clock` (door 3).

## Checks

### S1 - Iniciar um deploy · ~8 files · ~30 KB · ~8k

**C1** - Com o jogador no nível 15, `POST /api/me/deploys` com `backend` e cada nível 1..5 responde `201` com `deploy.startedAt` = relógio do teste e `deploy.endsAt` = início + 15, 30, 60, 180, 360 minutos, `serverTime` = relógio do teste e `player` presente (DEPLOY-01, AC 1)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_CreatesJobWithCatalogDuration$'`

**C2** - Com `backend` ativo, novo `POST` de `backend` responde `409 deploy_running` e a tabela continua com 1 job (DEPLOY-01, AC 2)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_SameTypeRunning$'`

**C3** - Jogador nível 2 recebe `422 level_too_low` em NV.2 (mínimo 3); jogador nível 3 recebe `201` em NV.2 (DEPLOY-01, AC 3)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_LevelBoundary$'`

**C4** - `type` = `blockchain` responde `422 unknown_deploy_type` sem criar job (DEPLOY-01, AC 4)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_UnknownType$'`

**C5** - `level` = 0, 6, -1 e ausente respondem `422 unknown_deploy_level` sem criar job (DEPLOY-01, AC 5)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_UnknownLevel$'`

**C6** - 10 `POST` simultâneos de `mobile` NV.1 do mesmo jogador resultam em 1 `201`, 9 `409 deploy_running` e 1 job ativo (DEPLOY-01, AC 6)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_ConcurrentSameType$'`

**C7** - Os 5 tipos iniciados em sequência respondem `201` e ficam 5 jobs ativos (DEPLOY-01, AC 7)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_AllFiveTypes$'`

**C8** - Inserir direto no banco um segundo job ativo do mesmo jogador e tipo falha com `unique_violation`; depois de marcar o primeiro como coletado, a inserção funciona (door 1)
Proof: `cd api && go test ./internal/deploy -run '^TestDeployJobs_OneActivePerType$'`

**C9** - `POST` sem sessão válida e sessão sem jogador em `POST /api/me/deploys`, `GET /api/me/deploys` e `POST /api/me/deploys/backend/claim` respondem `401 unauthenticated` e `404 player_not_found` (DEPLOY-01, DEPLOY-02, DEPLOY-03)
Proof: `cd api && go test ./internal/deploy -run '^TestDeployRoutes_SessionAndPlayer$'`

### S2 - Acompanhar os pipelines · ~8 files · ~35 KB · ~9k

**C10** - `GET /api/me/deploys` responde `200` com `serverTime` e só os jobs ativos, cada um com `type`, `level`, `startedAt`, `endsAt` e `ready`; um job já coletado não aparece (DEPLOY-02, AC 8)
Proof: `cd api && go test ./internal/deploy -run '^TestList_ActiveJobs$'`

**C11** - Um minuto e um segundo antes de `endsAt`, `ready` = `false`; exatamente em `endsAt`, `ready` = `true` (DEPLOY-02, AC 9; door 3)
Proof: `cd api && go test ./internal/deploy -run '^TestList_ReadyBoundary$'`

**C12** - `GET /api/catalog` inclui `deployTypes` = `backend`, `frontend`, `mobile`, `database`, `microservices` nessa ordem e `deployLevels` com os 5 níveis e seus `minLevel`, `minutes`, `xp`, `coins`, `gems` da tabela do plano (DEPLOY-02, AC 16; door 4)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesDeploys$'`

**C13** - A cena exibe os 5 tipos na ordem do catálogo com `ocioso` (sem job), `14:00 restante` (job de 15 min iniciado há 1 min) e `pronto p/ coletar` (job terminado) (DEPLOY-02, AC 10)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "type statuses"`

**C14** - Jogador nível 1 com tipo ocioso vê os 5 níveis com `15min`, `30min`, `1h`, `3h`, `6h` e `+80XP · +40coins`, `+150XP · +70coins · +1gems`...; NV.2 a NV.5 aparecem desabilitados com `NÍVEL 3`, `NÍVEL 6`, `NÍVEL 10`, `NÍVEL 15` (DEPLOY-02, AC 11)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "idle shows levels"`

**C15** - Job de 60 min decorrido em 10%, 30%, 60% e 90% exibe `LINT`, `BUILD`, `TEST`, `SHIP` e barra com `aria-valuenow` 10, 30, 60, 90; job de 180 min recém-iniciado exibe `3:00:00` e job com 5 min restantes exibe `05:00` (DEPLOY-02, AC 12)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "running shows stage and remaining"`

**C16** - Com o relógio falso avançado 3 segundos, o tempo restante desce 3 segundos e `fetch` não é chamado de novo (DEPLOY-02, AC 13)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "countdown ticks without fetch"`

**C17** - Com `GET /api/me/deploys` pendente, o painel exibe `CARREGANDO...` (DEPLOY-02, AC 14)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "pending shows CARREGANDO"`

**C18** - `GET /api/me/deploys` com `500` e com erro de rede exibe `SERVIDOR FORA DO AR`; `TENTAR DE NOVO` chama a rota de novo (DEPLOY-02, AC 15)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "list failure shows retry"`

**C19** - Com um catálogo mockado em que NV.1 dura 7 minutos e rende `+5XP`, a cena exibe `7min` e `+5XP · +40coins` (DEPLOY-02, AC 16)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "levels come from catalog"`

**C20** - Com `serverTime` 10 minutos à frente do relógio local e `endsAt` = `serverTime` + 5 min, a cena exibe `05:00 restante` (DEPLOY-02, AC 12; door 3)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "uses server time"`

**C21** - Com NV.1 escolhido, `INICIAR DEPLOY` envia `{"type":"backend","level":1}`, repassa o `player` recebido ao HUD e escreve `$ devserver deploy --tipo=backend --nivel=1` no log (DEPLOY-01, AC 1)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "start posts and logs"`

**C22** - Resposta `409 deploy_running` ao iniciar exibe a mensagem da api num alerta e não muda o estado do tipo (DEPLOY-01, AC 2)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "start error shows message"`

**C23** - A rota `/deploy` renderiza a cena de deploy e não mais `EM BREVE` (DEPLOY-02, AC 10)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "deploy page renders the scene"`

**C24** - No navegador, iniciar `database` NV.1 exibe `restante` com `14:` ou `15:` e, após reload, o tipo continua rodando (DEPLOY-02, AC 10)
Proof: `cd web && npx playwright test e2e/deploy.spec.ts -g "start persists"`

### S3 - Coletar e subir de nível · ~6 files · ~25 KB · ~7k

**C25** - Com o relógio avançado 15 minutos, coletar `backend` NV.1 responde `200` com `reward` = 80 XP, 40 coins, 0 gems e `player.xp` +80, `player.coins` +40; o job continua na tabela com `collected_at` preenchido (DEPLOY-03, AC 17; door 8)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_CreditsReward$'`

**C26** - Com XP, coins e gems do job alterados no banco para 999, 7 e 3 depois do início, a coleta credita 999, 7 e 3 (DEPLOY-03, AC 17; door 2)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_CreditsFrozenReward$'`

**C27** - Um segundo antes de `endsAt`, a coleta responde `409 deploy_not_ready` e o jogador fica igual (DEPLOY-03, AC 18)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_NotReady$'`

**C28** - Coletar sem job e coletar de novo um job já coletado respondem `404 deploy_not_found` (DEPLOY-03, AC 19)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_NotFound$'`

**C29** - Coletar `blockchain` responde `422 unknown_deploy_type` (DEPLOY-03, AC 19)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_UnknownType$'`

**C30** - `player.GainXP`: 0 XP não muda nada; XP até 1 abaixo do máximo não sobe; exatamente o máximo sobe 1 nível com XP 0; XP para 2 níveis sobe 2, com XP máximo +500, skill points +2, HP máximo +40 e HP = HP máximo (DEPLOY-03, AC 20; door 6)
Proof: `cd api && go test ./internal/player -run '^TestGainXP$'`

**C31** - Jogador com XP 480/500 e HP 10/100 coleta NV.1 e fica com nível 2, XP 60/750, 2 skill points, HP 120/120 (DEPLOY-03, AC 20)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_LevelUp$'`

**C32** - 10 coletas simultâneas do mesmo job pronto resultam em 1 `200`, 9 `404 deploy_not_found` e coins +40 uma vez só (DEPLOY-03, AC 21)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_ConcurrentOnce$'`

**C33** - Depois de coletar `backend`, novo `POST` de `backend` responde `201` (DEPLOY-03, AC 22)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_FreesType$'`

**C34** - A coleta grava um log com `msg` = `deploy.collected`, `type`, `level`, `xp`, `coins` e `gems` creditados (DEPLOY-03, AC 25)
Proof: `cd api && go test ./internal/deploy -run '^TestClaim_LogsCollected$'`

**C35** - Clicar `COLETAR RECOMPENSA` com job pronto repassa o `player` ao HUD, escreve `> release de BACKEND nível 1 publicada.` e o tipo volta a `ocioso` (DEPLOY-03, AC 22, 23)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "claim updates player and logs"`

**C36** - `COLETAR RECOMPENSA` fica desabilitado enquanto o job não terminou e habilitado quando termina (DEPLOY-03, AC 24)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "claim disabled until ready"`

**C37** - Resposta de erro na coleta exibe a mensagem da api num alerta e mantém o job na tela (DEPLOY-03, AC 18)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "claim error shows message"`

**C38** - `GET /api/me/deploys` com erro inesperado de banco responde `500 internal` com o log do `request_id`, e o mesmo em `POST /api/me/deploys` e na coleta (DEPLOY-01, DEPLOY-02, DEPLOY-03)
Proof: `cd api && go test ./internal/deploy -run '^TestDeployRoutes_UnexpectedError$'`

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

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/me/deploys` statuses (4) | 200 C10 · 401 C9 · 404 C9 · 500 C38 | - |
| `POST /api/me/deploys` statuses (6) | 201 C1 · 401 C9 · 404 C9 · 409 C2 · 422 C3 · 500 C38 | - |
| `POST /api/me/deploys/{type}/claim` statuses (6) | 200 C25 · 401 C9 · 404 C28 · 409 C27 · 422 C29 · 500 C38 | - |
| `GET /api/catalog` new keys (2) | `deployTypes` C12 · `deployLevels` C12 | - |
| deploy levels (5) | C1, table-driven over all 5 | - |
| deploy types (5) | C7, table-driven over all 5 | - |
| invalid level values (4) | 0 C5 · 6 C5 · -1 C5 · ausente C5 | - |
| level requirement boundary (2) | abaixo C3 · igual C3 | - |
| ready boundary (2) | antes C11 · em `endsAt` C11 | - |
| new error codes (5) | `deploy_running` C2 · `deploy_not_ready` C27 · `deploy_not_found` C28 · `unknown_deploy_type` C4 · `unknown_deploy_level` C5 | - |
| `DeployJob` states (3) | ativo C1 · pronto C11 · coletado C25 | - |
| level-up cases (4) | 0 XP C30 · abaixo do máximo C30 · igual ao máximo C30 · 2 níveis C30 | - |
| type status on screen (3) | `ocioso` C13 · `restante` C13 · `pronto p/ coletar` C13 | - |
| stages (4) | `LINT` C15 · `BUILD` C15 · `TEST` C15 · `SHIP` C15 | - |
| time formats (2) | `mm:ss` C15 · `h:mm:ss` C15 | - |
| list outcomes on screen (4) | 200 C13 · pendente C17 · 5xx C18 · rede C18 | - |
| Landing doors (8) | 1 C8 · 2 C26 · 3 C11 · 4 C12 · 5 C2 · 6 C30 · 7 C25 · 8 C25 | - |
| entities (1) | `DeployJob` C8 | - |
| startup config: clock (1 shared assembly) | `app.Deps.Now` em `main` e em `apptest` C1 | - |

- Claims naming a status code, route or response shape: C1–C12, C25, C27–C29, C31–C34, C38 - each proof issues a real HTTP request through `NewRouter`, except C8 (constraint, straight SQL) and C30 (own layer)
- Web claims at unit level assert the rendered screen; the browser round trip is C24

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`); this build runs under them.

Evidence:

- start rule: 4 guards (type, level, minimum level, one active) -> decides, reached across a boundary (C1–C7)
- claim rule: 3 guards (type, active job, ready) + credit -> decides, reached across a boundary (C25–C29)
- `player.GainXP`: loop with 4 cases -> decides, own layer C30 and boundary C31
- `DeployScene`: status, stage and time formatting per state -> decides at screen level (C13–C22, C35–C37)
- closest analogue: `api/internal/world/travel.go` (guards + `WithLocked`), proven at the boundary in `world_test.go`

## Swept

- validation: C4, C5, C3
- failure modes: C38, C18, C22, C37
- idempotency: C28, C32
- authorization: C9
- concurrency: C6, C32
- data lifecycle: C25 (jobs coletados permanecem para o ranking, door 8)
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C38
- state transitions: C1, C11, C25, C33
- observability: C34, C38

## Impact on earlier checks

- foundation C28: `/deploy` sai do conjunto "EM BREVE"; o teste passa a cobrir `/bug-fight`, `/skills`, `/loja`, `/avatar` no commit que entrega a cena

## Handoff

- S1–S3 ≈ 8k + 9k + 7k ≈ 24k de leitura, abaixo do budget de 150k - um builder, sem handoff
