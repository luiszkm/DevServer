# Bug fight - checks

Profile: standard
Plan: `.specs/features/bug-fight/plan.md`

## Intent

56 checks in 4 slices · 10 one-way doors · 0 open

Pré-requisitos: os mesmos da foundation. Testes Go fixam o sorteio por `apptest.Env.Rand` (door 3): cada `Intn(n)` consome o próximo valor empurrado, na ordem dano → contra-ataque → drop → poção; sem valor empurrado, devolve 0.

## Checks

### S1 - Começar um encontro · ~8 files · ~30 KB · ~8k

**C1** - Na Vila, `POST /api/me/battle` sem combate responde `200` com `battle` = região `vila`, HP do inimigo 60/60, SP 50/50, `status` `active`, fraqueza `false`, e `player` (FIGHT-01, AC 1)
Proof: `cd api && go test ./internal/battle -run '^TestStart_CreatesBattle$'`

**C2** - Com combate ativo na mesma região e inimigo vivo, `POST /api/me/battle` devolve o combate como está (HP do inimigo 40/60 depois de um turno), sem reiniciar (FIGHT-01, AC 2)
Proof: `cd api && go test ./internal/battle -run '^TestStart_ResumesActiveBattle$'`

**C3** - Depois de viajar para `floresta`, `POST /api/me/battle` troca para LOG WISP 70/70; depois de vencer, `POST /api/me/battle` cria um inimigo novo com HP cheio (FIGHT-01, AC 3)
Proof: `cd api && go test ./internal/battle -run '^TestStart_ReplacesOtherRegionOrWonBattle$'`

**C4** - Na `floresta`, SP máximo = 55 sem skills, 63 com `f2`, 81 com `f2`, `b2` e `i1` (FIGHT-01, AC 4)
Proof: `cd api && go test ./internal/battle -run '^TestStart_SPMaxIncludesSkillBonus$'`

**C5** - `GET /api/me/battle` responde `200` com o combate atual e `404 battle_not_found` sem combate (FIGHT-01, AC 5)
Proof: `cd api && go test ./internal/battle -run '^TestGet_CurrentOrNotFound$'`

**C6** - Começar em cada uma das 6 regiões cria o inimigo da tabela do plano com HP e SP do catálogo (FIGHT-01, AC 1)
Proof: `cd api && go test ./internal/battle -run '^TestStart_EveryRegionEnemy$'`

### S2 - Jogar um turno · ~6 files · ~40 KB · ~10k

**C7** - FIX com sorteio de dano 6 (valor 20) e de contra-ataque 0 (valor 7): inimigo 60→40, SP 50→40→45, HP do jogador 100→93 (FIGHT-02, AC 6, 11)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_DamageCostCounterRegen$'`

**C8** - TEST e depois FIX 20 causam 36 com `weakness` = `true` no evento; o FIX seguinte, 20 com `weakness` = `false` (FIGHT-02, AC 7)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_WeaknessMultipliesOnce$'`

**C9** - Com `f3` (10%), FIX 20 causa 22; com `f3` e fraqueza exposta, FIX 20 causa 40 (36 × 1.1 = 39.6 → 40) (FIGHT-02, AC 6)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_DamageBonusFromSkills$'`

**C10** - REFACTOR com HP 50 soma 18 antes do contra-ataque; com HP 95 e HP máximo 100, a cura para em 100 (FIGHT-02, AC 8)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_HealCapped$'`

**C11** - Com PLAIN, contra-ataque 14 vira 7 e 13 vira 7 (6.5 arredondado); no turno seguinte sem escudo, 14 continua 14 (FIGHT-02, AC 9)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_ShieldHalvesOneCounter$'`

**C12** - PLAIN com SP 40/50 fica 43 antes do contra-ataque e 48 depois; com SP 49/50, fica 50 (FIGHT-02, AC 10, 11)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_PlainRestoresSPCapped$'`

**C13** - Contra-ataque com sorteio 0 é 7 e com sorteio 7 é 14; a regeneração de SP para no máximo (FIGHT-02, AC 11)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_CounterRange$'`

**C14** - `events` sai em ordem: FIX = `damage`, `counter`; TEST = `weakness`, `counter`; PLAIN = `shield`, `sp`, `counter`; REFACTOR = `heal`, `counter`; cada um com seus campos (FIGHT-02, AC 12; door 5)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_EventsInOrder$'`

**C15** - Com SP 5 e com SP 9, FIX (custo 10) responde `409 not_enough_sp` e combate e jogador ficam iguais; com SP 10, FIX joga e deixa SP 5 (FIGHT-02, AC 13)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_NotEnoughSP$'`

**C16** - `f1` sem a skill responde `409 command_locked`; com `f1` desbloqueada, responde `200` (FIGHT-02, AC 14)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_SkillCommandNeedsSkill$'`

**C17** - `hadouken` responde `422 unknown_command` (FIGHT-02, AC 15)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_Unknown$'`

**C18** - Sem combate, `POST /api/me/battle/commands` e `POST /api/me/battle/items` respondem `404 battle_not_found` (FIGHT-02, AC 16)
Proof: `cd api && go test ./internal/battle -run '^TestTurn_NoBattle$'`

**C19** - Com o inimigo vencido, comandos e itens respondem `409 battle_over` (FIGHT-02, AC 17)
Proof: `cd api && go test ./internal/battle -run '^TestTurn_BattleOver$'`

**C20** - ROLLBACK responde `200` com `battle` = `null` e evento `fled`, sem contra-ataque nem recompensa; `GET /api/me/battle` passa a responder `404` (FIGHT-02, AC 18)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_RollbackEndsBattle$'`

**C21** - Um corpo com `"damage": 999` e `"hp": 1` junto do `command` é ignorado: o dano segue o sorteio (FIGHT-02, AC 19)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_IgnoresClientNumbers$'`

**C22** - 3 FIX simultâneos com sorteio 0 terminam em 3 turnos inteiros: inimigo 60→18, SP 35, HP 79 (FIGHT-02, AC 20)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_ConcurrentTurnsSerialize$'`

**C23** - Com as 9 skills desbloqueadas, cada comando de skill cobra o custo do catálogo e aplica o efeito: dano mínimo com sorteio 0 e máximo com o maior sorteio; `b2` cura 24; `i1` dá dano e expõe a fraqueza; `i2` dá escudo (FIGHT-02, AC 6–9)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_EverySkillCommand$'`

**C24** - Comandos base custam FIX 10, TEST 8, REFACTOR 14, PLAIN 0, ROLLBACK 0 (FIGHT-02, AC 6)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_BaseCosts$'`

**C25** - Na própria camada, `battle.ApplyCommand`/`EndTurn`: fraqueza 14 → 25, 15 → 27 e 17 → 31; bônus 10% sobre 25 → 28; escudo sobre 7 → 4 e sobre 14 → 7; SP nunca passa do máximo nem fica negativo, inclusive o +3 do PLAIN quando o jogador cai no mesmo turno (FIGHT-02, AC 6, 7, 9, 10, 11)
Proof: `cd api && go test ./internal/battle -run '^TestRules_'`

### S3 - Vencer, perder e usar itens · ~6 files · ~30 KB · ~8k

**C26** - Com o inimigo em 10, FIX derruba para 0: `status` `won`, sem evento `counter`, e jogador +90 XP, +40 coins, +1 gem; `events` = `damage`, `victory`, `reward` e os drops (FIGHT-03, AC 21)
Proof: `cd api && go test ./internal/battle -run '^TestVictory_CreditsReward$'`

**C27** - Vitória com XP 450/500 sobe para nível 2 com XP 40/750 e `reward.levelsGained` = 1 (FIGHT-03, AC 21)
Proof: `cd api && go test ./internal/battle -run '^TestVictory_LevelsUpThroughGainXP$'`

**C28** - Sorteio de drop 64 soma 1 `null_shard`; 65 não soma (FIGHT-03, AC 22)
Proof: `cd api && go test ./internal/battle -run '^TestVictory_DropChanceBoundary$'`

**C29** - Sorteio de poção 29 soma 1 `sp_potion`; 30 não soma (FIGHT-03, AC 23)
Proof: `cd api && go test ./internal/battle -run '^TestVictory_PotionChanceBoundary$'`

**C30** - Com HP 7 e contra-ataque 7, o jogador cai: HP = HP máximo, região `vila`, `battle` = `null`, evento `defeat`, sem recompensa; com HP 8, fica com 1 e o combate segue (FIGHT-03, AC 24)
Proof: `cd api && go test ./internal/battle -run '^TestDefeat_RespawnAtVila$'`

**C31** - `sp_potion` com 2 no inventário deixa 1, gera o evento `item` com `item` = `sp_potion`, `stat` = `sp` e `amount` = 30, soma 30 SP sem passar do máximo e aplica o contra-ataque; `hp_potion` soma 40 HP sem passar do máximo (FIGHT-03, AC 25)
Proof: `cd api && go test ./internal/battle -run '^TestItem_PotionsRestoreAndCostTurn$'`

**C32** - `hp_potion` sem nenhuma no inventário responde `409 no_item` e não joga o turno (FIGHT-03, AC 26)
Proof: `cd api && go test ./internal/battle -run '^TestItem_NoItem$'`

**C33** - `null_shard` (não usável) e `x` respondem `422 unknown_item` (FIGHT-03, AC 27)
Proof: `cd api && go test ./internal/battle -run '^TestItem_UnknownOrNotUsable$'`

**C34** - Jogador novo recebe `inventory` = `[{"item":"sp_potion","quantity":2}]` em `POST /api/players` e `GET /api/me`; itens em ordem do catálogo; depois de usar as 2 poções, `sp_potion` some da lista (FIGHT-03, AC 28, 29)
Proof: `cd api && go test ./internal/battle -run '^TestInventory_InEveryPlayer$'`

**C35** - Um jogador criado antes da migration `00004` tem 2 `sp_potion` depois dela (FIGHT-03, AC 29)
Proof: `cd api && go test ./internal/battle -run '^TestMigration_GivesExistingPlayersPotions$'`

**C36** - `UPDATE player_items SET quantity = -1` falha com `check_violation`; segundo `Battle` ou segundo (jogador, item) falham com `unique_violation` (doors 1, 2)
Proof: `cd api && go test ./internal/battle -run '^TestTables_Constraints$'`

**C37** - `GET /api/catalog` inclui `enemies` (6, com `region`, `name`, `level`, `hp`, `sp`, `weakness`, `drop`, `glyph` da tabela do plano), `commands` (14, com `label`, `cost`, `damage`, `heal`, `exposesWeakness`, `shield`, `spGain`, `flee`, `skill`), `items` (8, com `name`, `glyph`, `rarity`, `description`, `restore`) e `combat` (`counter`, `spRegen`, `weaknessMultiplier`, `victory`, `dropChance`, `potionChance`, `potion`, `startingItems` = `sp_potion` × 2) (FIGHT-04, AC 40; door 4)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesCombat$'`

**C38** - Nas 4 rotas de combate: sem sessão `401 unauthenticated`, sessão sem jogador `404 player_not_found`, erro inesperado de banco `500 internal` com log do `request_id`; e `GET /api/me` com a tabela de itens indisponível responde `500 internal` (FIGHT-01, FIGHT-02, FIGHT-03)
Proof: `cd api && go test ./internal/battle -run '^TestRoutes_SessionPlayerAndUnexpected$'`

**C39** - JSON malformado e `command`/`item` como número respondem `422 invalid_body` em comandos e itens (FIGHT-02, FIGHT-03; foundation door 12)
Proof: `cd api && go test ./internal/battle -run '^TestTurn_InvalidBody$'`

**C40** - Com uma transação de teste segurando `FOR UPDATE` na linha do jogador, um FIX só responde depois do `COMMIT` e lê o SP gravado por ela (FIGHT-02, AC 20)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_SerializesOnPlayerRowLock$'`

### S4 - A cena de combate · ~6 files · ~40 KB · ~10k

**C41** - Ao abrir, a cena chama `POST /api/me/battle` e exibe `ENCONTRO · VILA LOCALHOST`, `NULL SLIME`, `Lv.3`, `HP 60/60` e `fraqueza: null-check` (FIGHT-04, AC 30)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "starts and shows the enemy"`

**C42** - Com `skills` = `["f1"]` e SP 11, os comandos aparecem na ordem FIX, TEST, REFACTOR, PLAIN, `</> MARKUP`, ROLLBACK, cada um com seu rótulo e descrição do catálogo e com `10 SP`, `8 SP`, `14 SP`, `grátis`, `12 SP`, `grátis`; REFACTOR e `</> MARKUP` ficam desabilitados (FIGHT-04, AC 31)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "lists commands with costs"`

**C43** - A cena exibe `HP 80/100` e `SP 40/50` do jogador e `POÇÃO DE CACHE x2` e `POÇÃO DE MEMÓRIA x0`, esta desabilitada; clicar na de cache chama `POST /api/me/battle/items` com `{"item":"sp_potion"}` (FIGHT-04, AC 32)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "shows hero bars and potions"`

**C44** - Cada tipo de evento (`damage` com e sem fraqueza, `heal`, `weakness`, `shield`, `sp`, `item`, `counter` com e sem escudo, `victory`, `reward`, `drop`, `defeat`, `fled`) vira a linha pt-BR do plano; o log guarda só as últimas 6 (FIGHT-04, AC 33)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "writes events to the log"`

**C45** - Um turno repassa o `player` recebido ao HUD e atualiza HP e SP do combate na tela (FIGHT-04, AC 34)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "turn updates player and battle"`

**C46** - Com o combate vencido, a cena exibe `RESOLVIDO` e `NOVO ENCONTRO`; clicar chama `POST /api/me/battle` de novo e mostra o inimigo com HP cheio (FIGHT-04, AC 35)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "won shows RESOLVIDO and new encounter"`

**C47** - Com `battle` = `null` depois de ROLLBACK ou derrota, a cena exibe `ENCONTRO ENCERRADO` e `NOVO ENCONTRO` (FIGHT-04, AC 36)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "ended shows new encounter"`

**C48** - Com um turno pendente, comandos e poções ficam desabilitados (FIGHT-04, AC 37)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "disables actions while a turn is pending"`

**C49** - Erro `409 not_enough_sp`, erro sem corpo e erro de rede escrevem a mensagem da api, `erro no combate` e `SERVIDOR FORA DO AR` no log, sem mudar HP, SP nem `setPlayer` (FIGHT-04, AC 38)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "turn error goes to the log"`

**C50** - Com o início pendente, a cena exibe `CARREGANDO...`; com `500` e com erro de rede, `SERVIDOR FORA DO AR` e `TENTAR DE NOVO`, que chama o início de novo (FIGHT-04, AC 39)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "loading and load failure"`

**C51** - Com um catálogo mockado em que o inimigo da Vila se chama `BUG DE TESTE` e FIX se chama `PATCH`, a cena mostra esses nomes (FIGHT-04, AC 40)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "enemy and commands come from catalog"`

**C52** - A rota `/bug-fight` renderiza a cena de combate e não mais `EM BREVE` (FIGHT-04, AC 30)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "bug-fight page renders the scene"`

**C53** - No navegador, um dev novo na Vila joga FIX até `RESOLVIDO` e o HUD mostra `90/500` de XP (FIGHT-01..04)
Proof: `cd web && npx playwright test e2e/battle.spec.ts -g "fight to victory"`

**C54** - Se a gravação dos itens iniciais falha, `POST /api/players` responde `500 internal` e nenhum jogador fica gravado (FIGHT-03, AC 29)
Proof: `cd api && go test ./internal/battle -run '^TestCreatePlayer_StartingItemsFailureRollsBack$'`

**C55** - Com a tabela de itens indisponível, mutações que passam por `player.WithLocked` respondem `500 internal`: `POST /api/me/travel` com log do `request_id`, causa `player_items` no log e jogador sem mudança, e `POST /api/me/skills/f1/unlock` com 0 pontos (onde uma guarda responderia `409`) (FIGHT-03, AC 28)
Proof: `cd api && go test ./internal/battle -run '^TestLockedMutation_InventoryLoadError$'`

**C56** - Com um catálogo de teste em que `startingItems` = `hp_potion` × 3 e `sp_potion` × 1, um jogador novo recebe exatamente esse inventário, na ordem do catálogo (FIGHT-03, AC 29; door 4a)
Proof: `cd api && go test ./internal/battle -run '^TestCreatePlayer_StartingItemsFromCatalog$'`

**C57** - Com SP 10, FIX (`10 SP`) fica habilitado e TEST (`8 SP`) também; REFACTOR (`14 SP`) fica desabilitado: SP igual ao custo paga o comando (FIGHT-04, AC 31)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "SP equal to cost pays"`

**C58** - Com o combate ativo, a cena não exibe `NOVO ENCONTRO` (FIGHT-04, AC 35, AC 36)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "active fight hides new encounter"`

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
- [x] C45
- [x] C46
- [x] C47
- [x] C48
- [x] C49
- [x] C50
- [x] C51
- [x] C52
- [x] C53
- [x] C54
- [x] C55
- [x] C56
- [x] C57
- [x] C58

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `GET /api/me/battle` statuses (4) | 200 C5 · 401 C38 · 404 C5 · 500 C38 | - |
| `POST /api/me/battle` statuses (4) | 200 C1 · 401 C38 · 404 C38 · 500 C38 | - |
| `POST /api/me/battle/commands` statuses (6) | 200 C7 · 401 C38 · 404 C18 · 409 C15 · 422 C17 · 500 C38 | - |
| `POST /api/me/battle/items` statuses (6) | 200 C31 · 401 C38 · 404 C18 · 409 C32 · 422 C33 · 500 C38 | - |
| `GET /api/me` new failure cause (1) | inventory load C38 | - |
| regions × enemies (6) | C6, table-driven over all 6 | - |
| skill commands (9) | C23, table-driven over all 9 | - |
| base commands (5) | C24, table-driven over all 5 | - |
| command effects (6) | dano C7 · fraqueza C8 · cura C10 · escudo C11 · SP C12 · fuga C20 | - |
| new error codes (7) | `battle_not_found` C5 · `battle_over` C19 · `not_enough_sp` C15 · `command_locked` C16 · `no_item` C32 · `unknown_command` C17 · `unknown_item` C33 | - |
| rounding points (3) | fraqueza C25 · bônus de dano C25 · escudo C25 | - |
| chance boundaries (4) | drop 64 C28 · drop 65 C28 · poção 29 C29 · poção 30 C29 | - |
| defeat boundary (2) | HP = golpe C30 · HP = golpe + 1 C30 | - |
| `Battle` states (4) | criado C1 · ativo C2 · vencido C26 · encerrado C20, C30 | - |
| usable items (2) | `sp_potion` C31 · `hp_potion` C31 | - |
| event types on screen (14) | C44, table-driven over all 14 | - |
| screen end states (2) | vencido C46 · encerrado C47 | - |
| command button enabled vs SP, AC 31 (3) | SP > custo C42 · SP == custo C57 · SP < custo C42, C57 | - |
| `NOVO ENCONTRO` visibility by screen state (3) | ativo C58 · vencido C46 · encerrado C47 | - |
| turn outcomes on screen (4) | 200 C45 · erro com mensagem C49 · sem corpo C49 · rede C49 | - |
| start outcomes on screen (3) | pendente C50 · 5xx C50 · rede C50 | - |
| Landing doors (10) | 1 C36 · 1a C11 · 2 C36 · 3 C7 · 3a C25 · 4 C37 · 4a C37, C56 · 5 C14 · 6 C15 · 7 C1 | - |
| `POST /api/players` statuses changed by this feature (2) | 201 com inventário C34 · 500 na gravação dos itens C54 | - |
| `WithLocked` load failures (1) | inventário C55 | - |
| `item` event fields (3) | `item` C31 · `stat` C31 · `amount` C31 | - |
| command button text (3) | rótulo C42 · descrição C42 · custo C42 | - |
| entities (2) | `Battle` C36 · `PlayerItem` C36 | - |
| stored data (1) | backfill de poções C35 | - |
| startup config: rand (1 shared assembly) | `app.Deps.Rand` em `main` e em `apptest` C7 | - |

- Claims naming a status code, route or response shape go through `NewRouter`, except C25 (own layer), C35 (migration) and C36 (constraints)
- Web claims at unit level assert the rendered screen; the browser round trip is C53
- Round 2 found the earlier "equivalent mutant" note wrong: swallowing the inventory load error changes the answer of a guard-first route (skills unlock with 0 points answers 409 instead of 500); C55 now pins that route and the logged cause

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- turn rules (`battle.ApplyCommand`, `EndTurn`): dano, fraqueza, bônus, cura, escudo, SP, contra-ataque, vitória, derrota -> decides, own layer C25 and boundary C7–C31
- handler guards: combate existe, vencido, skill, SP, item -> decides, boundary C15–C19, C32, C33
- `BattleScene`: comandos, custos, poções, log, estados de fim -> decides at screen level (C41–C52, C57, C58)
- closest analogue: `api/internal/deploy` (guards inside `WithLocked`, injected clock) and `player.GainXP` (own layer + boundary)

## Swept

- validation: C17, C33, C39
- failure modes: C38, C49, C50
- idempotency: C19, C22
- authorization: C38
- concurrency: C22, C40
- data lifecycle: C20, C30 (combate apagado ao encerrar), C35 (backfill)
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C38
- state transitions: C2, C3, C19, C26, C30
- observability: C38

## Impact on earlier checks

- foundation C28: `/bug-fight` sai do conjunto "EM BREVE", que fica com `/loja`, `/avatar`

## Handoff

- S1–S4 ≈ 8k + 10k + 8k + 10k ≈ 36k de leitura, abaixo do budget de 150k - um builder, sem handoff

- **Boundary:** C1-C53 closed on `feat/bug-fight`
- **Settled mid-build:** `player.AddItem` uses an UPDATE to decrement (the CHECK runs before ON CONFLICT); player creation and its starting items share one transaction; unreachable catalog-lookup fallbacks in the scene removed
- **Abandoned:** none; 40 self-mutations (24 api, 16 web) before verification - 3 api survivors (weakness rounding case, PLAIN cap on a defeat turn, SP boundary) closed by stronger C15 and C25; e2e C53 fixed for a turn-end race and an ambiguous `RESOLVIDO` locator (test harness, not assertions)

Round 2 (after verification round 1 FAIL):

- **Boundary:** C54 (starting-item failure rolls the player back) and C55 (inventory load failure under `WithLocked`) added; C31 asserts the `item` event's `item`; C42 asserts label and description of every visible command; plan `Landing` gains 1a (shield not stored), 3a (`IntN`), 4a (`startingItems`), `Surface` gains the changed `POST /api/players`
- **Settled mid-build:** none
- **Abandoned:** none

Round 3 (after verification round 2 FAIL):

- **Boundary:** C55 extended to a guard-first route and the logged cause (kills the inventory-load survivor); C37 asserts `combat.startingItems`; C56 proves creation reads the starting items from the catalog; `player.Handlers` receives the catalog instead of `catalog.Default()`, and `apptest.NewWithCatalog` lets a test change it
- **Settled mid-build:** none
- **Abandoned:** the round-2 "equivalent mutant" note, which the Verifier showed false

Round 4 (after verification round 3 FAIL):

- **Boundary:** C57 pins the AC 31 boundary SP == cost (kills the `<=` survivor F4); C58 asserts `NOVO ENCONTRO` is absent during an active fight (kills the always-rendered survivor F5); coverage gains both sweep rows
- **Settled mid-build:** the two round-3 notes are resolved by documenting the real reach of a test catalog, not by threading it further: `apptest.NewWithCatalog` changes the catalog handlers receive through `app.Deps`, while `GET /api/catalog` and inventory order stay on the embedded data (`loadInventory` orders by `catalog.Default()`, same as `SortSkills`); no check relies on either
- **Abandoned:** none
