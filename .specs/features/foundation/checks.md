# Foundation - checks

Profile: standard
Plan: `.specs/features/foundation/plan.md`

## Intent

52 checks in 6 slices · 12 one-way doors · 2 open, of which 0 block the build (1 blocks go-live)

Pré-requisitos das provas (criados pelo próprio build, door 1 e door 11):

- api: `docker compose up -d db` e `DATABASE_URL` apontando para o banco `devserver_test`; testes Go usam GitHub falso via `httptest.Server`
- web unit: `cd web && npx vitest run ...` com `fetch` mockado
- e2e: `cd web && npx playwright test ...`; `playwright.config.ts` sobe api (com `api/cmd/fakegithub` no lugar do GitHub) e web via `webServer`

## Checks

### S1 - Entrar com GitHub · ~9 files · ~30 KB · ~8k

**C1** - Sem sessão (`GET /api/me` → `401`), qualquer rota do jogo renderiza a tela de login com o botão `ENTRAR COM GITHUB` (AUTH-01, AC 1)
Proof: `cd web && npx vitest run src/components/GameShell.test.tsx -t "401 shows login screen"`

**C2** - `GET /api/auth/github/login` responde `302` para o authorize do GitHub com `state` igual ao valor do cookie `ds_oauth_state`, `Max-Age=600` (AUTH-01, AC 2)
Proof: `cd api && go test ./internal/auth -run '^TestLogin_RedirectsWithState$'`

**C3** - Callback com `state` válido e `code` aceito pelo GitHub falso cria 1 linha em `sessions`, grava `ds_session` com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=2592000` e responde `302` para `/` (AUTH-01, AC 3)
Proof: `cd api && go test ./internal/auth -run '^TestCallback_Success$'`

**C4** - Callback com `state` ausente e com `state` diferente do cookie respondem `302` para `/login?error=state` e deixam `sessions` com 0 linhas (AUTH-01, AC 4)
Proof: `cd api && go test ./internal/auth -run '^TestCallback_BadState$'`

**C5** - Falha na troca do `code` e falha em `GET /user` no GitHub falso respondem `302` para `/login?error=github` e deixam `sessions` com 0 linhas (AUTH-01, AC 5)
Proof: `cd api && go test ./internal/auth -run '^TestCallback_GithubFailure$'`

**C6** - A tela de login com `?error=github` e com `?error=state` exibe `NÃO FOI POSSÍVEL ENTRAR · TENTE DE NOVO` acima do botão; sem `error` o texto não aparece (AUTH-01, AC 6)
Proof: `cd web && npx vitest run src/app/login/page.test.tsx -t "shows error banner"`

**C7** - `POST /api/auth/logout` com sessão válida responde `204`, remove a linha da sessão e envia `ds_session` com `Max-Age=0` (AUTH-01, AC 7)
Proof: `cd api && go test ./internal/auth -run '^TestLogout_DeletesSession$'`

**C8** - Clicar `SAIR` leva o navegador de volta à tela de login e um reload continua nela (AUTH-01, AC 7)
Proof: `cd web && npx playwright test e2e/auth.spec.ts -g "logout returns to login"`

**C9** - Sem cookie e com token desconhecido, cada rota protegida (`POST /api/auth/logout`, `GET /api/me`, `GET /api/onboarding`, `POST /api/players`, `POST /api/me/travel`) responde `401` com `error.code` = `unauthenticated` (AUTH-01, AC 8)
Proof: `cd api && go test ./internal/httpx -run '^TestAuthMiddleware_RejectsEveryProtectedRoute$'`

**C10** - Sessão criada há 2591999 s é aceita; criada há 2592001 s responde `401 unauthenticated` (AUTH-01, AC 9)
Proof: `cd api && go test ./internal/auth -run '^TestSession_ExpiryBoundary$'`

**C11** - A tabela `sessions` guarda o SHA-256 do token e nunca o valor do cookie (AUTH-01, door 2)
Proof: `cd api && go test ./internal/auth -run '^TestSession_StoresOnlyHash$'`

### S2 - Criar o dev no primeiro acesso · ~8 files · ~28 KB · ~7k

**C12** - `GET /api/onboarding` devolve `suggestedDevName` derivado do login GitHub: `octocat` → `OCTOCAT`, `my-name.dev` → `MY_NAME_DEV`, `abcdefghijklmnopqrst` → `ABCDEFGHIJKLMNOP`, e `classes` = `FRONTEND`, `BACKEND`, `DEVOPS`, `FULLSTACK` (PLAYER-01, AC 10)
Proof: `cd api && go test ./internal/player -run '^TestOnboarding_SuggestsDevName$'`

**C13** - Com `GET /api/me` → `404 player_not_found`, a tela de onboarding abre com o campo de nome preenchido com `suggestedDevName` e as 4 classes selecionáveis (PLAYER-01, AC 10; SHELL-01, AC 21)
Proof: `cd web && npx vitest run src/components/GameShell.test.tsx -t "404 opens onboarding with suggestion"`

**C14** - `POST /api/players` válido responde `201` com `player` de nível 1, XP 0, XP máximo 500, HP 100, HP máximo 100, 100 coins, 20 gems, 1 skill point, região `vila`, skin `default`, para cada uma das 4 classes (PLAYER-01, AC 11)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_InitialState$'`

**C15** - `devName` com 2 chars, 17 chars, `DEV-01`, `DÉV_01` e vazio respondem `422 invalid_dev_name` sem criar jogador; 3 chars, 16 chars e `dev_01` (gravado `DEV_01`) são aceitos (PLAYER-01, AC 12)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_DevNameBounds$'`

**C16** - Com `DEV_01` existente, outro usuário enviando `dev_01` recebe `409 dev_name_taken` (PLAYER-01, AC 13)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_DevNameTakenCaseInsensitive$'`

**C17** - `class` = `WIZARD` responde `422 invalid_class` sem criar jogador (PLAYER-01, AC 14)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_InvalidClass$'`

**C18** - Segundo `POST /api/players` do mesmo usuário GitHub responde `409 player_exists` e o jogador existente fica byte-a-byte igual (PLAYER-01, AC 15)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_PlayerExists$'`

**C19** - Ao receber `409 dev_name_taken`, o onboarding continua aberto e exibe `NOME JÁ EM USO` sob o campo de nome (PLAYER-01, AC 16)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "dev_name_taken shows NOME JÁ EM USO"`

**C20** - 10 `POST /api/players` concorrentes do mesmo usuário GitHub resultam em 1 `201`, 9 `409 player_exists` e 1 linha em `players` (PLAYER-01, AC 17; door 3)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_ConcurrentSameUser$'`

**C21** - 2 usuários diferentes criando `DEV_01` e `dev_01` ao mesmo tempo resultam em 1 `201` e 1 `409 dev_name_taken`, nunca `500` (PLAYER-01, AC 13; door 4)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_ConcurrentSameName$'`

### S3 - HUD e navegação por cenas · ~14 files · ~45 KB · ~12k

**C22** - `GET /api/me` → `200` devolve `player` do usuário da sessão (AUTH-01/SHELL-01, AC 18)
Proof: `cd api && go test ./internal/player -run '^TestMe_ReturnsSessionPlayer$'`

**C23** - Com `player` de nível 3, XP 40/1000, HP 80/140, 55 coins, 7 gems, 2 skill points, o HUD exibe `LEVEL 3`, `40/1000`, `HP 80/140`, `55`, `7`, `2` (SHELL-01, AC 18)
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "renders player values"`

**C24** - Com `GET /api/me` pendente, o HUD exibe `CARREGANDO...` e nenhum número (SHELL-01, AC 19)
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "pending shows CARREGANDO"`

**C25** - `GET /api/me` → `500` e falha de rede exibem `SERVIDOR FORA DO AR`; clicar `TENTAR DE NOVO` dispara uma segunda chamada a `/api/me` (SHELL-01, AC 20)
Proof: `cd web && npx vitest run src/components/GameShell.test.tsx -t "server down shows retry"`

**C26** - As abas renderizam na ordem `TÍTULO`, `MUNDO`, `DEPLOY`, `BUG FIGHT`, `SKILLS`, `LOJA`, `AVATAR` com `href` `/`, `/mundo`, `/deploy`, `/bug-fight`, `/skills`, `/loja`, `/avatar` (SHELL-01, AC 22)
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "tab order and routes"`

**C27** - Clicar em `MUNDO` e depois `DEPLOY` troca a URL sem novo carregamento de documento (marcador em `window` sobrevive) e o HUD continua visível (SHELL-01, AC 23; door 6)
Proof: `cd web && npx playwright test e2e/shell.spec.ts -g "tab click keeps document and HUD"`

**C28** - `/deploy`, `/bug-fight`, `/skills`, `/loja`, `/avatar` exibem `EM BREVE` com o nome da cena (SHELL-01, AC 24)
Proof: `cd web && npx vitest run src/components/ComingSoon.test.tsx -t "every unshipped scene shows EM BREVE"`

**C29** - Na tela-título, as placas `MUNDO`, `DEPLOY`, `SKILLS`, `BUG` apontam para `/mundo`, `/deploy`, `/skills`, `/bug-fight` (SHELL-01, AC 25)
Proof: `cd web && npx vitest run src/components/TitleScene.test.tsx -t "signs link to scenes"`

**C30** - Depois de uma mutação que responde `player` com 999 coins, o HUD exibe `999` e `/api/me` foi chamado exatamente 1 vez (SHELL-01, AC 26)
Proof: `cd web && npx vitest run src/components/GameShell.test.tsx -t "mutation response updates HUD without refetch"`

### S4 - Catálogo servido pela api · ~5 files · ~12 KB · ~3k

**C31** - `GET /api/catalog` sem cookie responde `200` com `version` não vazio e `regions` = `vila` 1, `floresta` 1, `mercado` 2, `caverna` 5, `torre` 8, `nuvem` 12, nessa ordem (CATALOG-01, AC 27)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesRegions$'`

**C32** - `GET /api/catalog` com `If-None-Match` igual ao `ETag` responde `304` sem corpo; com valor diferente responde `200`; `ETag` é o `version` entre aspas (CATALOG-01, AC 28; door 5)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ETag$'`

**C33** - Com um catálogo mockado em que `vila` exige nível 3, o mapa para um jogador nível 1 exibe `REQUER NÍVEL 3` em `vila` (CATALOG-01, AC 29)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "min levels come from catalog"`

### S5 - Mapa do mundo e viagem · ~6 files · ~18 KB · ~5k

**C34** - Jogador nível 1 vê `VIAJAR ATÉ AQUI` em `vila` e `floresta`, e `REQUER NÍVEL 2`, `5`, `8`, `12` desabilitados em `mercado`, `caverna`, `torre`, `nuvem` (WORLD-01, AC 30)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "locks regions above player level"`

**C35** - Jogador nível 2 em `POST /api/me/travel` `{"region":"mercado"}` recebe `200` com `player.region` = `mercado` e a linha gravada (WORLD-01, AC 31)
Proof: `cd api && go test ./internal/world -run '^TestTravel_AtMinLevel$'`

**C36** - Jogador nível 1 em `{"region":"mercado"}` recebe `422 level_too_low` e a região continua `vila` (WORLD-01, AC 32)
Proof: `cd api && go test ./internal/world -run '^TestTravel_LevelTooLow$'`

**C37** - `{"region":"marte"}` recebe `422 unknown_region` e a região não muda (WORLD-01, AC 33)
Proof: `cd api && go test ./internal/world -run '^TestTravel_UnknownRegion$'`

**C38** - Sessão válida sem jogador recebe `404 player_not_found` em `GET /api/me` e em `POST /api/me/travel` (WORLD-01, SHELL-01, AC 21)
Proof: `cd api && go test ./internal/player -run '^TestPlayerNotFound_OnPlayerRoutes$'`

**C39** - Com `player.region` = `floresta`, o mapa exibe `região atual: FLORESTA DE LOGS` e o nó `floresta` tem o destaque de selecionado (WORLD-01, AC 34)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "shows current region"`

**C40** - Clicar `VIAJAR ATÉ AQUI` em `floresta` atualiza `região atual` sem recarregar e persiste após reload (WORLD-01, AC 31)
Proof: `cd web && npx playwright test e2e/world.spec.ts -g "travel persists"`

### S6 - Contrato comum da api · ~6 files · ~15 KB · ~4k

**C41** - Cada um dos 9 códigos (`unauthenticated`, `player_not_found`, `player_exists`, `invalid_dev_name`, `dev_name_taken`, `invalid_class`, `level_too_low`, `unknown_region`, `internal`) chega ao cliente como `{"error":{"code":"<código>","message":"<não vazio>"}}` com `Content-Type: application/json` (API-01, AC 35; door 7)
Proof: `cd api && go test ./internal/httpx -run '^TestErrorEnvelope_EveryCode$'`

**C42** - Com uma transação de teste segurando `FOR UPDATE` na linha do jogador, `POST /api/me/travel` do mesmo jogador não responde antes do `COMMIT` dessa transação e responde `200` depois dele (API-01, AC 36; door 8)
Proof: `cd api && go test ./internal/world -run '^TestTravel_SerializesOnPlayerRowLock$'`

**C43** - 20 `POST /api/me/travel` concorrentes alternando `vila`/`floresta` terminam todos em `200` e a região final é `vila` ou `floresta` (API-01, AC 36)
Proof: `cd api && go test ./internal/world -run '^TestTravel_ConcurrentRequests$'`

**C44** - `UPDATE players SET coins = -1` e `UPDATE players SET gems = -1` falham com violação de `CHECK` (API-01, AC 37; door 10)
Proof: `cd api && go test ./internal/player -run '^TestPlayers_NonNegativeCurrencyConstraint$'`

**C45** - Uma rota que entra em pânico, montada pelo mesmo `NewRouter` usado em `main`, responde `500 internal` e grava um log com o mesmo `request_id` devolvido no header `X-Request-Id` (API-01, AC 38)
Proof: `cd api && go test ./internal/httpx -run '^TestRecover_Returns500AndLogsRequestID$'`

**C46** - `docker compose up -d db`, `cd api && go build ./... && go vet ./...` e `cd web && npm run build` terminam com exit 0 no layout `web/` + `api/` (door 1, door 11)
Proof: `make ci-build`

**C47** - `api/go.mod` requer `github.com/go-chi/chi/v5`, `github.com/jackc/pgx/v5`, `github.com/pressly/goose/v3`, `golang.org/x/oauth2` e não requer `gorm.io/gorm` (door 9)
Proof: `make check-deps`

**C48** - Rota inexistente responde `404 not_found`, método errado responde `405 method_not_allowed` e JSON malformado em `POST /api/me/travel` responde `422 invalid_body`, todos no envelope (API-01, AC 35; door 12)
Proof: `cd api && go test ./internal/httpx -run '^TestErrorEnvelope_GenericCodes$'`

**C49** - Quando o handler de `GET /api/me`, `POST /api/players` ou `POST /api/me/travel` devolve um erro inesperado (tabela `players` indisponível), a api responde `500 internal` e grava log com o `request_id` do header `X-Request-Id` (API-01, AC 38)
Proof: `cd api && go test ./internal/httpx -run '^TestHandlerError_Returns500AndLogsRequestID$'`

**C50** - Se a gravação da sessão falha no callback, a api responde `500 internal` e não envia `ds_session` (AUTH-01, AC 38)
Proof: `cd api && go test ./internal/auth -run '^TestCallback_SessionStoreFailure$'`

**C51** - JSON malformado e campo com tipo errado em `POST /api/players` respondem `422 invalid_body` sem criar jogador (API-01, AC 35; door 12)
Proof: `cd api && go test ./internal/httpx -run '^TestCreatePlayer_InvalidBody$'`

**C52** - Quando a busca da sessão falha no banco, a rota protegida responde `500 internal` e grava log com o `request_id` do header `X-Request-Id` (AUTH-01, AC 38)
Proof: `cd api && go test ./internal/httpx -run '^TestSessionLookupError_Returns500AndLogsRequestID$'`

## Progress

Marcado antes do commit que satisfaz o check.

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
- [x] C34
- [x] C35
- [x] C36
- [x] C37
- [x] C38
- [x] C39
- [x] C40
- [x] C41
- [x] C42
- [x] C43
- [x] C44
- [x] C45
- [x] C46
- [x] C47
- [x] C48
- [x] C49
- [x] C50
- [x] C51
- [x] C52

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/auth/github/login` statuses (1) | 302 C2 | - |
| `GET /api/auth/github/callback` statuses (2) | 302 C3 · C4 · C5 · 500 C50 | - |
| `POST /api/auth/logout` statuses (2) | 204 C7 · 401 C9 | - |
| `GET /api/me` statuses (4) | 200 C22 · 401 C9 · 404 C38 · 500 C49 | - |
| `GET /api/onboarding` statuses (2) | 200 C12 · 401 C9 | - |
| `POST /api/players` statuses (5) | 201 C14 · 401 C9 · 409 C16 · 422 C15 · 500 C49 | - |
| `GET /api/catalog` statuses (2) | 200 C31 · 304 C32 | - |
| `POST /api/me/travel` statuses (5) | 200 C35 · 401 C9 · 404 C38 · 422 C36 · 500 C49 | - |
| callback failure paths (9) | state ausente C4 · cookie ausente C4 · state diferente C4 · troca do code C5 · `GET /user` inalcançável C5 · `GET /user` falha C5 · corpo não-JSON C5 · sem id C5 · sem login C5 | - |
| session age boundary (2) | 2591999 s C10 · 2592001 s C10 | - |
| protected routes (5) | C9, table-driven over all 5 | - |
| error codes (9) | C41, table-driven over all 9 | - |
| `409` on `POST /api/players` (2) | `dev_name_taken` C16 · `player_exists` C18 | - |
| `422` on `POST /api/players` (2) | `invalid_dev_name` C15 · `invalid_class` C17 | - |
| `422` on `POST /api/me/travel` (2) | `level_too_low` C36 · `unknown_region` C37 | - |
| devName bounds (8) | 2 chars C15 · 3 chars C15 · 16 chars C15 · 17 chars C15 · hífen C15 · acento C15 · vazio C15 · minúsculas normalizadas C15 | - |
| suggestion derivation (3) | maiúsculas C12 · troca por `_` C12 · corte em 16 C12 | - |
| classes (4) | C14, table-driven over all 4 | - |
| HUD fetch outcomes (5) | 200 C23 · pendente C24 · 5xx C25 · rede C25 · 404 C13 | - |
| HUD fields (6) | `LEVEL` C23 · XP C23 · HP C23 · `COINS` C23 · `GEMS` C23 · `SKILL PTS` C23 | - |
| tabs (7) | C26, table-driven over all 7 | - |
| unshipped scenes (5) | C28, table-driven over all 5 | - |
| title signs (4) | C29, table-driven over all 4 | - |
| regions (6) | C31, table-driven over all 6 | - |
| region lock at level 1 (6) | C34, table-driven over all 6 | - |
| login error banner (4) | `error=github` C6 · `error=state` C6 · sem `error` C6 · valor desconhecido C6 | - |
| Landing doors (12) | 1 C46 · 2 C11 · 3 C20 · 4 C21 · 5 C32 · 6 C27 · 7 C41 · 8 C42 · 9 C47 · 10 C44 · 11 C46 · 12 C48 | - |
| entities (3) | `Player` C14 · `Session` C3 · `GithubIdentity` C20 | - |
| unexpected-error paths (3) | pânico C45 · erro devolvido pelo handler C49 · falha na busca da sessão C52 | - |
| generic router codes (3) | `not_found` C48 · `method_not_allowed` C48 · `invalid_body` C48 | - |
| `invalid_body` routes (2) | `POST /api/me/travel` C48 · `POST /api/players` C51 | - |
| session lookup outcomes (3) | válida C22 · inválida/expirada C9, C10 · erro do banco C52 | - |
| startup config: router + middleware (1 shared assembly) | `NewRouter` usado por `main` e pelos testes C45 | - |
| startup config: `/api` rewrite (1 assembly) | `web/next.config` exercitado no navegador C27 | - |

- Claims naming a status code, route or response shape: C2–C5, C7, C9, C10, C12, C14–C18, C20–C22, C31, C32, C35–C38, C41–C45 - each proof issues a real HTTP request through `NewRouter`
- Web claims at unit level (C1, C6, C13, C19, C23–C26, C28–C30, C33, C34, C39) assert the rendered screen; boundary behaviour of the browser (no reload, persistence, rewrite) is proven separately by C8, C27, C40

## Test policy

O repo não tem guia de testes (greenfield), então estas linhas são a régua deste build.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Entry point that decides nothing | one at the boundary | accepted input, each rejected input, each error path |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence (derivada dos critérios, o código ainda não existe):

- validação de `devName`: 1 regex + normalização, 8 casos de borda -> decides, reached across a boundary (C15 na borda; tabela na própria camada se extraída como função)
- derivação do nome sugerido: 3 regras -> decides, not reached across a boundary (C12)
- regra de viagem: 2 guardas (região existe, nível ≥ mínimo) -> decides, reached across a boundary (C35–C37)
- validade de sessão: 1 guarda de idade + existência do hash -> decides (C9, C10)
- `GET /api/catalog`: serializa dado embutido + 1 guarda de `ETag` -> entry point (C31, C32)
- componentes de cena: renderizam estado do `player`/catálogo, 1–3 condicionais cada -> decides at screen level (testes vitest por estado)
- closest analogue in the repo: none - greenfield; estes testes viram o precedente das próximas features

Cost: ~34 provas Go + vitest na própria camada em ~14 arquivos de teste, 3 e2e. Sem estas linhas, bordas de `devName` e guardas de viagem seriam provadas só pelo caminho feliz do e2e.

## Swept

- validation: C15, C17, C37
- failure modes: C4, C5, C45, C49, C50
- idempotency: C18, C20
- authorization: C9, C10
- concurrency: C20, C21, C42, C43
- data lifecycle: C10; exclusão de conta é pergunta aberta 1 do plano (blocks go-live), fora desta build
- dependency failure: C5, C25
- state transitions: C13, C35, C36
- observability: C45, C49

## Handoff

- S1–S6 ≈ 8k + 7k + 12k + 3k + 5k + 4k ≈ 39k de leitura estimada (greenfield, arquivos pequenos), abaixo do budget de 150k - um builder, sem handoff

- **Boundary:** C1-C47 closed on `feat/foundation`
- **Settled mid-build:** rota `GET /api/onboarding` (Surface) e door 11 acrescentadas antes dos checks; door 12 (códigos genéricos `not_found`, `method_not_allowed`, `invalid_body`) e nota em Relations (`Session` liga a `GithubIdentity`) acrescentadas antes do código; e2e roda com `workers: 1` porque o GitHub falso entrega um "próximo usuário" por vez
- **Abandoned:** primeira versão do teste de C42 só segurava o lock e passava sem `FOR UPDATE` (o `UPDATE` final também bloqueia); reescrito para subir o nível dentro da transação travada, e agora falha sem o lock

Round 2 (after verification round 1 FAIL):

- **Boundary:** C48-C50 added for door 12 and AC 38 paths the round-1 Verifier found unproven; C2, C5, C10, C19 tests strengthened (no assertion weakened); extra screen tests for the Test policy rows
- **Settled mid-build:** callback `500` added to the plan's `Surface`
- **Abandoned:** none

Round 3 (after verification round 2 FAIL):

- **Boundary:** C5 gains the `GET /user` transport-error member; `Handle` proven not to log expected errors; screen branch tests added in `GameShell`, `WorldScene`, `Hud`, `Tabs` and part of `Onboarding` (the claim that every branch was covered was wrong: round 3 found `Onboarding.tsx:75` and `:82` untested); 15 self-mutations, all killed
- **Settled mid-build:** none
- **Abandoned:** none

Round 4 (after verification round 3 FAIL; user chose to run a fourth round):

- **Boundary:** logout no longer leaks a rejection when offline (`GameShell.tsx`); a session lookup error now logs its `request_id` before `500 internal`; tests for in-flight `CRIAR DEV`, `aria-pressed`, `invalid_body` on `POST /api/players`, session lookup error; exit codes of every suite checked, not only the summary line; 5 self-mutations, all killed
- **Settled mid-build:** user approved a fourth verification round past the three-round bound
- **Abandoned:** none
