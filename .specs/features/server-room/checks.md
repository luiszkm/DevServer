# Server room checks

Profile: standard
Plan: `.specs/features/server-room/plan.md`

44 checks in 4 slices · 9 one-way doors · 0 open

## Checks

### S1 - Catálogo e forma do jogador · ~5 files · ~35 KB · ~9k

**C1** - `GET /api/catalog` serve `rack` com `slots` = 6; `stats` na ordem `power` (`POWER`, `#45b7ff`, base 20, max 100, step 10, bonus `dmg`), `ram` (`RAM`, `#6bd425`, 15, 100, 5, `sp`), `uptime` (`UPTIME`, `#ffc93c`, 60, 99, 1, `coins`); e os 6 `components` na ordem `cpu` (`CPU 8-CORE`, `::`, `#45b7ff`, 80 coins, power +25), `ram` (`RAM 32GB`, `[]`, `#6bd425`, 60, ram +30), `ssd` (`SSD NVME`, `=`, `#ffc93c`, 70, power +12 e uptime +8), `cache` (`CACHE REDIS`, `~`, `#e05252`, 90, power +18), `lb` (`LOAD BALANCER`, `>>`, `#b46cf0`, 120, uptime +20), `gpu` (`GPU EDGE`, `#`, `#45b7ff`, 150, power +40), todos os campos comparados por valor (RACK-01, AC 1; door 2; L-007, L-012)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesRack$'`

**C2** - Com `gpu` no slot 1 e `ram` no slot 5, `GET /api/me` devolve `rack` = `[null, "gpu", null, null, null, "ram"]` (RACK-01, AC 2; door 4)
Proof: `cd api && go test ./internal/rack -run '^TestMe_RackField$'`

**C3** - `POST /api/players` responde `201` com `rack` = 6 `null` (RACK-01, AC 3)
Proof: `cd api && go test ./internal/rack -run '^TestCreatePlayer_RackDefaults$'`

### S2 - Comprar e remover · ~4 files · ~30 KB · ~8k

**C4** - Com 100 coins, `POST /api/me/rack` com `{"component":"ram"}` responde `200` com coins 40 e `rack` = `["ram", null × 5]`; a linha `player_rack` (slot 0, `ram`) existe (RACK-02, AC 4; door 5)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_PaysAndPlaces$'`

**C5** - Com slots 0 e 1 ocupados, a compra grava no slot 2; com slot 1 ocupado e 0 livre, grava no slot 0; com slots 0-4 ocupados, grava no slot 5 (RACK-02, AC 5)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_FirstFreeSlot$'`

**C6** - Com 59 coins, `ram` responde `409 not_enough_coins` e coins e `player_rack` ficam iguais; com 60 coins paga e deixa 0 (RACK-02, AC 6)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_BalanceBoundary$'`

**C7** - Com os 6 slots ocupados e 1000 coins, `cpu` responde `409 rack_full` com `error.message` = `rack cheio. remova um componente antes`, coins 1000 e o rack igual; com 5 ocupados compra no slot 5 (RACK-02, AC 7)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_RackFull$'`

**C8** - `{"component":"x"}` e `{}` respondem `422 unknown_component` sem mudar nada (RACK-02, AC 8)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_UnknownComponent$'`

**C9** - Corpo `{` e `{"component": 1}` respondem `422 invalid_body` sem mudar nada (RACK-02, AC 9; L-008)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_InvalidBody$'`

**C10** - A ordem das validações é a do plano: corpo `{` com rack cheio responde `invalid_body`; `{"component":"x"}` com rack cheio responde `unknown_component`; `cpu` com rack cheio e 0 coins responde `rack_full`; `cpu` com 1 slot livre e 0 coins responde `not_enough_coins` (RACK-02, AC 6-9; plan Assumptions; L-013)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_ValidationOrder$'`

**C11** - Com 120 coins, `ram` duas vezes responde `200` nas duas e deixa coins 0 e `rack` = `["ram", "ram", null × 4]` (RACK-02, AC 10)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_Duplicates$'`

**C12** - Remover responde `200`, esvazia o slot e soma o preço inteiro: `gpu` no slot 3 +150 coins, `ram` no slot 0 +60 coins; os outros slots ficam iguais (RACK-02, AC 11; door 5)
Proof: `cd api && go test ./internal/rack -run '^TestRemove_RefundsFullPrice$'`

**C13** - Remover o slot 4 vazio responde `200` com jogador e `player_rack` iguais; remover duas vezes o mesmo slot devolve o preço uma vez só (RACK-02, AC 12)
Proof: `cd api && go test ./internal/rack -run '^TestRemove_EmptySlot$'`

**C14** - `rack/-1/remove`, `rack/6/remove` e `rack/a/remove` respondem `422 unknown_slot`; `rack/0/remove` e `rack/5/remove` são aceitos (RACK-02, AC 13)
Proof: `cd api && go test ./internal/rack -run '^TestRemove_SlotBounds$'`

**C15** - Com 1 slot livre e 1000 coins, duas compras simultâneas de `cpu` terminam com um `200` e um `409 rack_full` e coins 920; com 6 livres e 80 coins, duas simultâneas de `cpu` terminam com um `200` e um `409 not_enough_coins` e coins 0 (RACK-02, AC 14; AD-004; L-003)
Proof: `cd api && go test ./internal/rack -run '^TestBuy_ConcurrentSerialize$'`

### Cross-cutting api · ~3 files · ~20 KB · ~5k

**C16** - Sem sessão, `POST /api/me/rack` e `POST /api/me/rack/0/remove` respondem `401 unauthenticated` (RACK-02)
Proof: `cd api && go test ./internal/rack -run '^TestRackRoutes_RequireSession$'`

**C17** - Com `player_rack` indisponível, `GET /api/me`, `POST /api/me/deploys`, `POST /api/me/battle`, a compra e o remover respondem `500 internal`, o log traz o `request_id` e a causa `player_rack`, e o jogador não muda (RACK-01, RACK-02; AD-005; L-001, L-011)
Proof: `cd api && go test ./internal/rack -run '^TestRack_LoadFailure$'`

**C18** - O banco recusa uma segunda linha `player_rack` no mesmo (jogador, slot) e uma linha com `slot` = -1 (door 1)
Proof: `cd api && go test ./internal/rack -run '^TestTables_RackConstraints$'`

**C19** - Os códigos novos `rack_full` (409), `unknown_component` (422) e `unknown_slot` (422) chegam como `{"error":{"code":"<código>","message":"<mensagem do plano>"}}` com as mensagens `rack cheio. remova um componente antes`, `componente desconhecido`, `slot do rack desconhecido` (door 8; AD-005)
Proof: `cd api && go test ./internal/rack -run '^TestRack_ErrorCodes$'`

**C20** - A migração 00007 cria `player_rack` vazia sobre jogadores existentes, e `GET /api/me` responde `200` com `rack` = 6 `null` (door 1; stored data)
Proof: `cd api && go test ./internal/rack -run '^TestMigration_RackExistingPlayers$'`

### S3 - Bônus do rack · ~6 files · ~45 KB · ~11k

**C21** - `player.Bonus` soma o rack na própria camada: vazio `dmg` 0, `sp` 0, `coins` 0; `gpu` `dmg` 4; `cpu` `dmg` 2; `cache` `dmg` 1 (POWER 38); `cpu` + `gpu` `dmg` 6 (POWER 85, 6,5); 6 `gpu` `dmg` 8 (POWER limitado a 100); `ram` `sp` 6; 6 `ram` `sp` 17 (RAM limitado a 100); `lb` `coins` 20; 6 `lb` `coins` 39 (UPTIME limitado a 99); `ssd` `dmg` 1 e `coins` 8; o rack soma 0 em `hp`, `xp`, `deploy` e `spregen`; o rack soma junto com skills, equipamentos e skin no mesmo tipo (RACK-03, AC 15; door 3, door 9)
Proof: `cd api && go test ./internal/player -run '^TestBonus_Rack$'`

**C22** - `POST /api/me/battle` na vila responde SP 56/56 com um `ram`, 67/67 com 6 `ram` e 50/50 sem rack (RACK-03, AC 16)
Proof: `cd api && go test ./internal/battle -run '^TestBattle_RackSPMax$'`

**C23** - Na vila, FIX com sorteio 6 causa 20 sem rack, 21 com um `gpu` (20,8) e 22 com 6 `gpu` (21,6) (RACK-03, AC 17)
Proof: `cd api && go test ./internal/battle -run '^TestBattle_RackDamage$'`

**C24** - `POST /api/me/deploys` NV.1 (40 coins) grava coins 40 sem rack, 48 com um `lb`, 43 com um `ssd` (43,2), 56 com 6 `lb` (55,6); NV.2 (70 coins) com 6 `lb` grava 97 (97,3); XP, gems e `ends_at` iguais aos sem rack; a coleta responde `reward.coins` = coins gravadas e soma ao jogador (RACK-03, AC 18; door 6; L-009)
Proof: `cd api && go test ./internal/deploy -run '^TestStart_RackBoostsCoins$'`

**C25** - NV.1 iniciado com um `lb` (coins 48); remover o `lb` e comprar 6 `lb` não muda `deploy_jobs.coins`; a coleta responde `reward.coins` = 48 (RACK-03, AC 19; door 6)
Proof: `cd api && go test ./internal/deploy -run '^TestDeploy_RackFrozenAtStart$'`

**C26** - Com `quantum` (fora do catálogo) gravado no slot 0 e 1000 coins: com os slots 1-5 ocupados, `cpu` responde `409 rack_full`; com só o slot 0 gravado, `cpu` vai para o slot 1; `player.Bonus` com `quantum` soma 0 em `dmg`, `sp` e `coins`; remover o slot 0 responde `200` com coins iguais e o slot fica `null` (RACK-03, AC 20; L-015)
Proof: `cd api && go test ./internal/rack -run '^TestUnknownComponent_OccupiesAndRemoves$'`
Proof: `cd api && go test ./internal/player -run '^TestBonus_Rack$'`

**C27** - Com linhas gravadas nos slots 6 e 9 e `gpu` no slot 0, `GET /api/me` responde `200` com `rack` = `["gpu", null × 5]` e `player.Bonus` `dmg` 4 (RACK-03, AC 21)
Proof: `cd api && go test ./internal/rack -run '^TestMe_SkipsSlotsOutsideCatalog$'`

### S4 - Tela SERVER · ~9 files · ~70 KB · ~18k

**C28** - As abas são `TÍTULO`, `MUNDO`, `SERVER`, `DEPLOY`, `BUG FIGHT`, `SKILLS`, `LOJA`, `AVATAR`, `OFFICE` numeradas 01-09, com `SERVER` → `/server` como 03 (RACK-04, AC 22; door 7)
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "tab order and routes"`

**C29** - A tela-título tem o link `SERVER` sem chip em left 17.1% top 46.7% width 14.6% height 5.2% e o link `SALA DE SERVIDORES` com o chip `SALA DE SERVIDORES` em left 68.5% top 39.2% width 26.4% height 33%, ambos para `/server`; os 4 hotspots anteriores não mudam (RACK-04, AC 23)
Proof: `cd web && npx vitest run src/components/TitleScene.test.tsx -t "server hotspots"`

**C30** - Rack vazio em `/server`: barras `POWER` `20`, `RAM` `15`, `UPTIME` `60%` nessa ordem com larguras `20%`, `15%`, `60%`; `RACK LOCALHOST-01` com 6 slots; `LOJA DE COMPONENTES` com 6 cartões na ordem `CPU 8-CORE`, `RAM 32GB`, `SSD NVME`, `CACHE REDIS`, `LOAD BALANCER`, `GPU EDGE`; o terminal exibe `> selecione um componente para instalar no rack.` (RACK-04, AC 24)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "empty rack"`

**C31** - As barras seguem a regra da api nos limites: `gpu` → `POWER` `60` e `DANO +4%`; 6 `gpu` → `POWER` `100` (largura `100%`) e `DANO +8%`; `ram` → `RAM` `45` e `SP MÁX +6`; 6 `ram` → `RAM` `100` e `SP MÁX +17`; `lb` → `UPTIME` `80%` e `COINS DE DEPLOY +20%`; 6 `lb` → `UPTIME` `99%` e `COINS DE DEPLOY +39%`; vazio → `DANO +0%`, `SP MÁX +0`, `COINS DE DEPLOY +0%` (RACK-04, AC 25; L-009)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "stats and bonuses"`

**C32** - Slot vazio exibe `-`, `SLOT 0<n> VAZIO` e `livre` (`SLOT 01 VAZIO` … `SLOT 06 VAZIO`); `gpu` no slot 1 exibe `#`, `GPU EDGE` e `power +40`; `ssd` exibe `power +12 · uptime +8`; `quantum` exibe `?` (RACK-04, AC 26)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "slot states"`

**C33** - Cada cartão exibe glifo, nome, efeitos e preço: `::` `CPU 8-CORE` `power +25` `80C` … `#` `GPU EDGE` `power +40` `150C`, `SSD NVME` `power +12 · uptime +8`; com 100 coins, `LOAD BALANCER` e `GPU EDGE` têm opacidade reduzida e `CPU 8-CORE` não; com 80 coins `CPU 8-CORE` não é reduzido (RACK-04, AC 27)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "shop cards"`

**C34** - Com 6 slots ocupados, clicar `CPU 8-CORE` exibe `> rack cheio. remova um componente antes.` sem chamar `fetch` (RACK-04, AC 28)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "rack full"`

**C35** - Com 79 coins, clicar `CPU 8-CORE` exibe `> coins insuficientes para CPU 8-CORE.` e o aviso `COINS INSUFICIENTES` sem chamar `fetch`; com 80 chama a compra (RACK-04, AC 29)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "insufficient coins"`

**C36** - Clicar `RAM 32GB` chama `POST /api/me/rack` com `{"component":"ram"}`, repassa o `player` recebido e, com a resposta gravando no slot 2, exibe `> RAM 32GB instalado no slot 03 · ram +30` (RACK-04, AC 30)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "buy"`

**C37** - Clicar o slot 1 com `gpu` chama `POST /api/me/rack/1/remove`, repassa o `player` e exibe `> GPU EDGE removido. 150 coins devolvidos.`; clicar slot com `quantum` chama o remover e exibe `> componente removido.` (RACK-04, AC 31)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "remove"`

**C38** - Clicar o slot 4 vazio exibe `> slot 05 vazio. compre um componente ao lado.` sem chamar `fetch` (RACK-04, AC 32)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "empty slot"`

**C39** - Na compra e no remover: `409` com `error.message` `rack cheio. remova um componente antes` exibe `> rack cheio. remova um componente antes`; `500` sem corpo e falha de rede exibem `> falha na conexão. tente de novo.`; o rack continua na tela (RACK-04, AC 33)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "action errors"`

**C40** - Com uma compra pendente, os 6 cartões e os 6 slots ficam desabilitados, e voltam ao responder (RACK-04, AC 34)
Proof: `cd web && npx vitest run src/components/ServerScene.test.tsx -t "pending disables"`

**C41** - Com `gpu` e `ram` no rack e nenhuma outra fonte, o AVATAR exibe `dano +4%` e `SP +6`; com também `macbook` equipado (dmg 8), `dano +12%` (RACK-04, AC 35)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "rack bonuses"`

### Round trip · ~3 files · ~10 KB · ~3k

**C42** - No navegador, novo dev com 100 coins: SERVER → `RAM 32GB` exibe `> RAM 32GB instalado no slot 01 · ram +30`, o HUD 40 coins, `RAM` `45` e `SP MÁX +6`; recarregar mantém o slot e 40; clicar o slot exibe `> RAM 32GB removido. 60 coins devolvidos.` e o HUD 100 (RACK-04)
Proof: `cd web && npx playwright test e2e/server.spec.ts -g "buy and remove"`

**C43** - Nenhuma das 9 rotas, `/server` incluída, exibe `EM BREVE` (office C41; plan Impact)
Proof: `cd web && npx vitest run src/components/ComingSoon.test.tsx -t "no scene shows EM BREVE"`

**C44** - No navegador, o hotspot `SALA DE SERVIDORES` da tela-título e a aba `SERVER` levam a `/server` (RACK-04, AC 22, AC 23)
Proof: `cd web && npx playwright test e2e/server.spec.ts -g "entries"`

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

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/me/rack` statuses (7) | 200 C4 · 401 C16 · 409 `rack_full` C7 · 409 `not_enough_coins` C6 · 422 `invalid_body` C9 · 422 `unknown_component` C8 · 500 C17 | - |
| `POST /api/me/rack/{slot}/remove` statuses (4) | 200 C12, C13 · 401 C16 · 422 `unknown_slot` C14 · 500 C17 | - |
| `POST /api/me/deploys` statuses (8) | 201 C24, deploy-pipelines C1 · 401 deploy-pipelines C9 · 409 `deploy_running` deploy-pipelines C2 · 422 `invalid_body` deploy-pipelines C39 · 422 `unknown_deploy_type` deploy-pipelines C4 · 422 `unknown_deploy_level` deploy-pipelines C5 · 422 `level_too_low` deploy-pipelines C3 · 500 C17, deploy-pipelines C38 | - |
| `GET /api/me` statuses (4) | 200 C2 · 401 foundation C9 · 404 `player_not_found` foundation C38 · 500 C17 | - |
| `GET /api/catalog` new fields (1) | `rack` C1 | - |
| `player` new fields (1) | `rack` C2, C3 | - |
| components catalog (6) | C1, table-driven over all 6 | - |
| stats catalog (3) | `power` C1, C21 · `ram` C1, C21 · `uptime` C1, C21 | - |
| slot bounds (5) | -1 C14 · 0 C14 · 5 C14 · 6 C14 · não inteiro C14 | - |
| first free slot (3) | depois de ocupados C5 · buraco antes de ocupado C5 · último C5 | - |
| balance boundary (2) | coins abaixo C6 · coins igual C6 | - |
| validation order (3) | `invalid_body` antes de `unknown_component` C10 · `unknown_component` antes de `rack_full` C10 · `rack_full` antes de `not_enough_coins` C10 | - |
| bonus types (3) | `dmg` C21, C23 · `sp` C21, C22 · `coins` C21, C24 | - |
| stat cap (3) | POWER 100 C21, C31 · RAM 100 C21, C31 · UPTIME 99 C21, C31 | - |
| floor per step (3) | POWER step 10 com resto (38 → 1) C21 · RAM step 5 C21 · UPTIME step 1 C21 | - |
| bonus exclusions and sum (2) | rack fora de `hp`/`xp`/`deploy`/`spregen` C21 · rack somado a outras fontes C21, C41 | - |
| multi-effect component (1) | `ssd` C21, C24, C32, C33 | - |
| coins rounding (2) | para baixo C24 · para cima C24 | - |
| deploy snapshot (1) | coins congeladas C25 | - |
| stored component outside the catalog (4) | ocupa slot C26 · soma 0 C26 · remover sem reembolso C26 · slot ≥ 6 ignorado C27; tela `?` C32, C37 | - |
| new error codes (3) | C19, table-driven over all 3 | - |
| entries to `/server` (3) | aba C28, C44 · placa C29 · prédio C29, C44 | - |
| screen stat bars (3) | `POWER` C30, C31 · `RAM` C30, C31 · `UPTIME` C30, C31 | - |
| screen bonus lines (3) | `DANO +N%` C31 · `SP MÁX +N` C31 · `COINS DE DEPLOY +N%` C31 | - |
| screen slot states (3) | vazio C32 · ocupado C32 · fora do catálogo C32 | - |
| screen card affordability (2) | com saldo C33 · sem saldo C33 | - |
| screen terminal messages (8) | inicial C30 · rack cheio C34 · coins insuficientes C35 · instalado C36 · removido C37 · componente removido C37 · slot vazio C38 · erro C39 | - |
| action outcomes on screen (8) | comprar: 200 C36 · erro com mensagem C39 · sem corpo C39 · rede C39; remover: 200 C37 · erro com mensagem C39 · sem corpo C39 · rede C39 | - |
| avatar totals (2) | `dano +N%` C41 · `SP +N` C41 | - |
| Landing doors (9) | 1 C18, C20 · 2 C1 · 3 C21 · 4 C2 · 5 C4, C12 · 6 C24, C25 · 7 C28 · 8 C19 · 9 C21, C24 | - |
| entities (1) | `PlayerRackSlot` C18 | - |
| stored data (1) | jogadores existentes C20 | - |
| startup config: catalog (1 shared assembly) | `app.Deps.Catalog` em `main` e em `apptest` C1 | - |

- Claims naming a status code, route or response shape go through `NewRouter`, except C21 (own layer) and C18 (constraints)
- Web claims at unit level assert the rendered screen; the browser round trip is C42, the entries C44

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- `player.Bonus`: 5 fontes (skills, equipamentos, skin, escritório, rack) × 7 tipos, teto por stat, `floor` por step -> decides, own layer C21 and boundary C22, C23, C24
- rack handlers: componente conhecido, primeiro slot livre, rack cheio, saldo, slot no limite, slot vazio, componente fora do catálogo no reembolso -> decides, boundary C4-C15, C26
- `deploy.Start`: coins com bônus e arredondamento -> decides, boundary C24, C25
- `ServerScene` + helper web do rack: stat por limite, bônus por step, estado do slot, pré-checagem de rack cheio e saldo, mensagens -> decides at screen level (C30-C40)
- web `totalBonus`: soma por fonte -> decides, screen level C41 (AVATAR), as office did
- catalog additions: data plus lookups -> instrumentation, covered by C1
- closest analogue: `api/internal/office` (guards inside `WithLocked`, reembolso, id fora do catálogo) and `player.Bonus` (own layer + boundary, office C21)

## Swept

- validation: C6, C8, C9, C10, C14, C26, C27
- failure modes: C17, C39
- idempotency: C13 (remover vazio e remover duas vezes), C7 (rack cheio não cobra)
- authorization: C16
- concurrency: C15
- data lifecycle: C20 (jogadores existentes); remover apaga a linha (C12), sem arquivamento; componente ou slot que saiu do catálogo C26, C27
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C17
- state transitions: C4, C12 (livre → ocupado → livre), C25 (coins congeladas no início)
- observability: C17 (500 com `request_id` e causa); nenhum evento de log novo, como o `office`

## Impact on earlier checks

- office C27 (8 abas): passa a 9 com `SERVER` → `/server` como 03; C28 substitui a prova da ordem das abas
- office C41 (`ComingSoon` sobre 8 cenas): C43 passa a cobrir 9
- foundation tela-título (4 hotspots): C29 acrescenta 2 sem mudar os 4
- office C20 (`TestMigration_OfficeExistingPlayers`): o teste migrava só até 00006 e servia o router atual, que agora lê `player_rack`; passa a aplicar todas as migrações depois de afirmar `player_office` vazia em 00006, como shop C47 - a afirmação não muda

## Handoff

- Leitura: api ~79 KB + web ~61 KB ≈ 140 KB / 4 ≈ 35k, mais ~45k de código novo - abaixo do budget de 150k: um builder, sem handoff
- **Boundary:** one builder, C1–C44 closed, `a0a9412..HEAD` (specs `a7532b0`, api `1c0b1d5`, web `61d7f69`); every proof and the api, web and e2e suites green at HEAD; `make ci-build` green
- **Settled mid-build:** C21 dizia `cpu` + `gpu` `dmg` 8; a fórmula aprovada (AC 15) dá `floor(65 / 10)` = 6 - erro aritmético do check, corrigido para 6 com o aval do usuário (2026-09-24)
