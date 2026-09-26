# Region path checks

Profile: standard
Plan: `.specs/features/region-path/plan.md`

32 checks in 6 slices · 5 one-way doors · 0 open

## Checks

### S1 - Caminho e chefes no catálogo · ~4 files · ~30 KB · ~8k

**C1** - Cada uma das seis regiões tem `path` de 5 nós, ids `<região>-1` a `<região>-5`, o 5º com `boss` true, e os inimigos comuns na ordem do AC 2, cada um da própria região (PATH-01, AC 1, AC 2)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_RegionPaths'`

**C2** - Os seis chefes batem id, região, nome, nível, HP, SP, fraqueza, drop, glyph e `boss` true do AC 3 (PATH-01, AC 3)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_Bosses'`

**C3** - `EnemiesIn` devolve vila `vila`,`slime`; floresta `floresta`,`slime_verde`; mercado `mercado`; caverna `caverna`,`monstro`; torre `torre`; nuvem `nuvem` (PATH-01, AC 4)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_EnemiesInSkipsBosses'`

### S2 - Começar a luta de um nó · ~4 files · ~40 KB · ~10k

**C4** - `POST /api/me/battle` sem corpo, com corpo `"   "` e com `{}` responde `200`, o JSON de `battle` não tem `node`, e `player.progress` é `{}` (PATH-02, AC 5)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NoBodyOmitsNode'`

**C5** - `{"node":"vila-1"}` na vila com cleared 0 responde `200`, `enemy` `slime`, `enemyHp` `45`, `enemyHpMax` `45`, `node` `vila-1`, `status` `active` (PATH-02, AC 6)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeFrontier'`

**C6** - Corpo `{` responde `422` `invalid_body` (PATH-02, AC 7)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeInvalidBody'`

**C7** - `{"node":"nao-existe"}` responde `422` `unknown_node` (PATH-02, AC 8)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeUnknown'`

**C8** - Na vila, `{"node":"floresta-1"}` responde `409` `wrong_region` e a batalha anterior continua com o mesmo `enemy` (PATH-02, AC 9)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeWrongRegion'`

**C9** - Na vila com cleared 0, `{"node":"vila-2"}` responde `409` `node_locked` (PATH-02, AC 10)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeLocked'`

**C10** - Com `progress.vila` 2, `{"node":"vila-1"}` responde `200` e `battle.enemy` é `slime` (PATH-02, AC 11)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeReplay'`

**C11** - Com `progress.vila` `1` e uma luta `active` de `vila-2` já com `enemyHp` `10`, `{"node":"vila-1"}` responde `200` com `node` `vila-2` e `enemyHp` `10` (PATH-02, AC 12)
Proof: `cd api && go test ./internal/battle -run 'TestStart_ActiveBattleKeepsNode'`

**C12** - Sessão sem jogador e corpo `{"node":"vila-1"}` responde `404` `player_not_found` (PATH-02, AC 13)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodePlayerNotFound'`

**C13** - Depois de `DROP TABLE region_progress`, `{"node":"vila-1"}` responde `500` `internal` (PATH-02, AC 14)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeProgressTableMissing'`

**C14** - Na vila com cleared 0, `{"node":"floresta-5"}` responde `409` `wrong_region` (PATH-02, AC 15)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NodeWrongRegionBeforeLocked'`

**C31** - `POST /api/me/battle` sem sessão responde `401` `unauthenticated` (PATH-02)
Proof: `cd api && go test ./internal/battle -run 'TestRoutes_SessionPlayerAndUnexpected'`

### S3 - Vencer, rejogar e morrer · ~3 files · ~20 KB · ~5k

**C15** - Vencer `vila-1` grava `player.progress.vila` `1`, e `GET /api/me` devolve `1` (PATH-03, AC 16)
Proof: `cd api && go test ./internal/battle -run 'TestTurn_NodeVictoryAdvances'`

**C16** - Com cleared já em 2, vencer `vila-1` de novo deixa `progress.vila` em `2` (PATH-03, AC 17)
Proof: `cd api && go test ./internal/battle -run 'TestTurn_NodeReplayDoesNotAdvance'`

**C17** - Morrer em `vila-2` depois de ter `progress.vila` `1` deixa `region` `vila`, `hp` igual a `hpMax` e `progress.vila` `1` (PATH-03, AC 18)
Proof: `cd api && go test ./internal/battle -run 'TestTurn_DefeatKeepsProgress'`

**C32** - `GET /api/me` sem sessão responde `401` `unauthenticated` e, com sessão sem jogador, `404` `player_not_found` (PATH-03)
Proof: `cd api && go test ./internal/httpx -run 'TestAuthMiddleware_RejectsEveryProtectedRoute'`
Proof: `cd api && go test ./internal/player -run 'TestPlayerNotFound_OnPlayerRoutes'`

### S4 - Mapa da região · ~6 files · ~40 KB · ~10k

**C18** - Em `/mundo/floresta` com região `floresta` e sem progresso, o fundo é `/art/background/region-floresta.png`, há 5 `[data-node]`, só `floresta-1` habilitado, `floresta-5` contém a coroa, e `VOLTAR AO MUNDO` aponta para `/mundo` (PATH-04, AC 19, AC 27)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "region map opens the first node"`

**C19** - Com `progress.floresta` `2`, `floresta-1` e `floresta-2` têm a bandeira e estão desabilitados, só `floresta-3` está habilitado, e o herói tem `data-at` `floresta-2` (PATH-04, AC 20)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "cleared nodes wear the flag"`

**C20** - Clicar em `floresta-1` faz `POST /api/me/battle` com `{"node":"floresta-1"}` e, no `200`, navega para `/bug-fight` (PATH-04, AC 21)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "clicking the next node starts it"`

**C21** - Com `player.region` `vila` em `/mundo/floresta`, aparece `você não está nesta região`, o link `VOLTAR AO MUNDO` vai para `/mundo`, e os 5 nós estão desabilitados (PATH-04, AC 22)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "other region is locked"`

**C22** - `/mundo/nao-existe` mostra `região desconhecida` e o link `VOLTAR AO MUNDO` para `/mundo` (PATH-04, AC 23)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "unknown region"`

**C23** - Com `prefers-reduced-motion: reduce`, o clique dispara o `POST` sem `transitionend` (PATH-04, AC 24)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "reduced motion starts without the walk"`

**C24** - Resposta `409` `node_locked` com message `o nó ainda está trancado` mostra esse texto e não navega (PATH-04, AC 25)
Proof: `cd web && npx vitest run src/components/RegionScene.test.tsx -t "a locked node shows the api message"`

**C25** - A 360px, em `/mundo/floresta`, `documentElement.scrollWidth` é menor ou igual a `innerWidth` (PATH-04, AC 26)
Proof: `cd web && npx playwright test e2e/region.spec.ts -g "region map fits phone"`

**C33** - ENTRAR na FLORESTA abre `/mundo/floresta` com 5 nós e só o primeiro habilitado; o clique leva a `/bug-fight` com o texto `SLIME DE LOG` (PATH-04, AC 19, AC 21)
Proof: `cd web && npx playwright test e2e/region.spec.ts -g "entering floresta opens its path"`

### S5 - Entrar no mapa e voltar da luta · ~4 files · ~25 KB · ~6k

**C26** - ENTRAR em `floresta` com `200` chama `push` com `/mundo/floresta`. No browser, o mesmo ENTRAR cai em `/mundo/floresta`, VOLTAR AO MUNDO mostra `região atual: FLORESTA DE LOGS`, e isso sobrevive a um reload (PATH-05, AC 28)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "ENTRAR opens the region map"`
Proof: `cd web && npx playwright test e2e/world.spec.ts -g "travel persists"`

**C27** - No painel da vila, estando na vila, o botão é `EXPLORAR`, o clique vai para `/mundo/vila` e não há `POST /api/me/travel` (PATH-05, AC 29)
Proof: `cd web && npx vitest run src/components/WorldScene.test.tsx -t "EXPLORAR skips travel"`

**C28** - Com `battle.node` `floresta-1` e `status` `won`, há um link `VOLTAR AO MAPA` para `/mundo/floresta` (PATH-05, AC 30)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "won node links back to the region"`

**C29** - Com `status` `won` e sem `node`, não há `VOLTAR AO MAPA` (PATH-05, AC 31)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "a random win has no map link"`

### S6 - Arte · ~14 files · ~80 KB · ~20k

**C30** - Os 6 fundos `region-<id>.png` e os 6 sprites `enemy-boss_<id>.png` existem, e `make art-check` termina 0 (PATH-06, AC 32)
Proof: `cd web && npx vitest run src/lib/region-art.test.tsx -t "region art files exist"`
Proof: `make art-check`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| regions (6) | `vila` C1 · `floresta` C1 · `mercado` C1 · `caverna` C1 · `torre` C1 · `nuvem` C1 | - |
| bosses (6) | `boss_vila` C2 · `boss_floresta` C2 · `boss_mercado` C2 · `boss_caverna` C2 · `boss_torre` C2 · `boss_nuvem` C2 | - |
| EnemiesIn (6) | `vila` C3 · `floresta` C3 · `mercado` C3 · `caverna` C3 · `torre` C3 · `nuvem` C3 | - |
| `POST /api/me/battle` statuses (6) | `200` C4 · `401` C31 · `404` C12 · `409` C8 · `422` C6 · `500` C13 | - |
| `409` codes (2) | `wrong_region` C8 · `node_locked` C9 | - |
| `422` codes (2) | `invalid_body` C6 · `unknown_node` C7 | - |
| node start (5) | sem corpo C4 · fronteira C5 · replay C10 · trancado C9 · luta ativa C11 | - |
| validation order (2) | `invalid_body` antes de procurar o nó C6 · `wrong_region` antes de `node_locked` C14 | - |
| victory (3) | fronteira avança C15 · replay não avança C16 · derrota mantém C17 | - |
| `GET /api/me` statuses (3) | `200` C15 · `401` C32 · `404` C32 | - |
| screen node states (4) | primeiro aberto C18 · vencidos C19 · outra região C21 · id desconhecido C22 | - |
| Landing doors (5) | path C1 · progresso C15 · nó da luta C5 · chefe fora do sorteio C3 · `player.progress` C4 | - |
| entities (2) | RegionProgress C15 · Battle C5 | - |
| art files (12) | C30, table-driven over all 12 | - |
| startup config (1 shared assembly) | `app.NewRouter` em `main` e em `apptest` C5 | - |

- Claims naming a status code or response shape go through `NewRouter`: C4–C17, C31, C32
- Screen claims assert the rendered nodes; the phone width is C25 and the browser path is C33

## Test policy

Same rows as `AGENTS.md` `## Test policy`.

Evidence:

- `battle.Start` com nó: despacha em corpo inválido, nó desconhecido, região errada, luta ativa, índice maior que cleared, índice menor, índice igual. 7 ramos. Decisão atravessada em `POST /api/me/battle`: fronteira C4–C14. O catálogo (`path`, `boss`) é decisão na própria camada: C1–C3
- `battle.turn` ao vencer: avança só se o índice é o cleared; derrota não mexe. 3 ramos. C15–C17 na fronteira, que é onde o `progress` sai no JSON
- estados do nó na tela: vencido, próximo, trancado, outra região, id desconhecido. C18–C22
- closest analogue: `POST /api/me/battle` sem nó em `TestStart_PicksEnemyByRand` e `TestStart_SingleEnemyNoDraw`; a tela de mapa em `WorldScene.test.tsx`

Cost: os ramos novos do start e da vitória são provados no HTTP, porque é lá que o código e o status se encontram. `EnemiesIn` tem a própria camada em C3 para o filtro do chefe não depender de um start que calhou de não sorteá-lo.

## Swept

- validation: C6, C7, C8, C9, C14
- failure modes: C13 — a leitura de `region_progress` caída responde `500` e não grava luta; C24 mostra a `message` sem navegar
- idempotency: C11 — repetir o nó da luta ativa devolve a mesma luta; C16 — vencer de novo não soma `cleared`
- authorization: C31, C32
- concurrency: existing - `player.WithLocked` já serializa as mutações do jogador; o avanço do `cleared` escreve na mesma transação
- data lifecycle: n/a - tabela nova vazia; lutas antigas ficam sem nó; não há TTL nem backfill
- dependency failure: n/a - sem serviço externo; a falha de query é o `500` de C13
- state transitions: C15 (cleared 0 → 1), C16 (cleared permanece), C17 (região volta a `vila`, progresso fica)
- observability: n/a - sem log novo; o `500` usa o request id que `Handle` já grava

## Handoff

- Catálogo + api + web + 12 artes. `battle-vila.json` tem ~700 linhas; seis fundos nessa densidade dariam ~120 KB, seis sprites ~40 KB, código ~80 KB. ~240 KB / 4 ≈ 60k, abaixo do budget de 150k: um builder, sem handoff
