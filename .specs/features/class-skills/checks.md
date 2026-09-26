# Skills por classe — checks

Profile: standard
Plan: `.specs/features/class-skills/plan.md`

## Intent

39 checks in 4 slices · 3 one-way doors · 0 open

Pré-requisitos: Postgres de teste (`make db-up`); `go test` no `api/`; vitest com `fetch` mockado; Playwright sobe a stack (`make e2e` quando o check pede o navegador).

## Checks

### S1 - Catálogo e desbloqueio · ~6 files · ~90 KB · ~23k

**C1** - `GET /api/catalog` serve exatamente 4 `skillTrees` nesta ordem, com `id`/`name`/`class`/`role` e os 3 ids de nó: `frontend`/`FRONTEND`/`FRONTEND`/`SUPORTE` `fe1 fe2 fe3`; `backend`/`BACKEND`/`BACKEND`/`ATAQUE` `be1 be2 be3`; `devops`/`DEVOPS`/`DEVOPS`/`DEFESA` `do1 do2 do3`; `fullstack`/`FULLSTACK`/`FULLSTACK`/`HÍBRIDO` `fs1 fs2 fs3`. Não há trilha `infra` nem nó `f1` `f2` `f3` `b1` `b2` `b3` `i1` `i2` `i3` (CSKILL-01, AC 1; door 1)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesSkillTrees$'`

**C2** - Cada um dos 12 nós sai com glifo, nome, descrição e bônus da tabela do plano: `fe1` `</>` HOTFIX DE CSS `sp` 8 `+8 SP máximo em combate`; `fe2` `{}` PAIR REVIEW `hp` 10 `+10 HP máximo permanente`; `fe3` `~` DESIGN SYSTEM `sp` 12 `+12 SP máximo em combate`; `be1` `$_` ENDPOINT `dmg` 8 `+8% de dano em todos os ataques`; `be2` `[]` QUERY PESADA `dmg` 10 `+10% de dano em todos os ataques`; `be3` `##` DEADLOCK `dmg` 12 `+12% de dano em todos os ataques`; `do1` `>_` HEALTHCHECK `hp` 15 `+15 HP máximo permanente`; `do2` `::` FIREWALL `hp` 12 `+12 HP máximo permanente`; `do3` `^` CIRCUIT BREAKER `hp` 18 `+18 HP máximo permanente`; `fs1` `</>` SNACK DE CSS `sp` 6 `+6 SP máximo em combate`; `fs2` `$_` SCRIPT `dmg` 6 `+6% de dano em todos os ataques`; `fs3` `::` PAGER `hp` 10 `+10 HP máximo permanente` (CSKILL-01, AC 2; door 1)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesSkillTrees$'`

**C3** - Os comandos são, nesta ordem, os 5 de sempre e os 12 novos, e `rollback` por último (17). Os 5 de sempre: `fix|FIX|10|14-20|0|false|false|0|false|` hint `corrige o bug · 14-20 dano`; `test|TEST|8||0|true|false|0|false|` hint `expõe a fraqueza · crítico`; `refactor|REFACTOR|14||18|false|false|0|false|` hint `recupera 18 HP`; `plain|PLAIN|0||0|false|true|3|false|` hint `defende e recupera 3 SP`; `rollback|ROLLBACK|0||0|false|false|0|true|` hint `volta para o mapa`. Os 12, no formato `id|label|cost|dmg|heal|exposesWeakness|shield|spGain|flee|skill` e hint: `fe1|</> HOTFIX|12||26|false|false|0|false|fe1` `cura 26 HP`; `fe2|{} PAIR|10||0|true|false|4|false|fe2` `expõe a fraqueza e recupera 4 SP`; `fe3|~ DESIGN|18||32|false|false|8|false|fe3` `cura 32 HP e recupera 8 SP`; `be1|$_ ENDPOINT|12|18-24|0|false|false|0|false|be1` `golpe forte · 18-24 dano`; `be2|[] QUERY|16|24-32|0|false|false|0|false|be2` `query pesada · 24-32`; `be3|## DEADLOCK|22|32-42|0|false|false|0|false|be3` `deadlock · 32-42`; `do1|>_ HEALTHCHECK|10||10|false|true|0|false|do1` `escuda e cura 10 HP`; `do2|:: FIREWALL|14||16|false|true|0|false|do2` `escuda e cura 16 HP`; `do3|^ CIRCUIT|12||0|false|true|6|false|do3` `escuda e recupera 6 SP`; `fs1|</> SNACK|12||22|false|false|0|false|fs1` `cura 22 HP`; `fs2|$_ SCRIPT|12|16-22|0|false|false|0|false|fs2` `golpe · 16-22 dano`; `fs3|:: PAGER|10||8|false|true|0|false|fs3` `escuda e cura 8 HP`. Nenhum comando `f1`–`i3` (CSKILL-01, AC 2, AC 3; door 1)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesCombat$'`

**C4** - Para cada classe, o primeiro nó da trilha dela (`fe1`, `be1`, `do1`, `fs1`) com 1 ponto responde `200`, `skillPoints` 0, `skills` = esse id e 1 linha em `player_skills` (CSKILL-02, AC 4)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_OwnClassFirstNode$'`

**C5** - Desbloquear `fe2`, `do1`, `do2`, `do3` e `fs3` (cada um na classe certa, com os anteriores da trilha) soma 10, 15, 12, 18 e 10 ao HP e ao HP máximo (CSKILL-02, AC 4)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_HPBonus$'`

**C6** - Desbloquear `fe1`, `fe3`, `be1`, `be2`, `be3`, `fs1` e `fs2` (com os anteriores) deixa HP e HP máximo iguais e tira 1 ponto por nó (CSKILL-02, AC 4)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_NonHPBonus$'`

**C7** - Cada classe tentando o primeiro nó de cada uma das outras 3 responde `409` `skill_wrong_class`, mensagem `essa habilidade é de outra classe`, e não muda skill points, HP, HP máximo nem `skills`. O segundo nó de outra classe, com 0 pontos e sem o anterior, também responde `skill_wrong_class` e não `skill_locked` nem `no_skill_points` (CSKILL-02, AC 5, AC 6; door 2)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_WrongClass$'`

**C8** - A ordem do desbloqueio, o primeiro caso ganha: `nope` com 0 pontos → `422 unknown_skill`; primeiro nó de outra classe com 0 pontos → `409 skill_wrong_class`; nó da própria classe já desbloqueado com 0 pontos → `409 skill_already_unlocked`; segundo nó da própria classe sem o primeiro, com 0 pontos → `409 skill_locked`; primeiro nó da própria classe com 0 pontos → `409 no_skill_points` (CSKILL-02, AC 6)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_Order$'`

**C9** - 10 desbloqueios simultâneos de `be1` num BACKEND com 3 pontos: 1 `200`, 9 `409 skill_already_unlocked`, 2 pontos restantes (CSKILL-02, AC 7)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_ConcurrentOnce$'`

**C10** - Inserir o mesmo (jogador, nó) duas vezes falha com `unique_violation` (CSKILL-02, AC 7)
Proof: `cd api && go test ./internal/skills -run '^TestPlayerSkills_UniquePerNode$'`

**C11** - Jogador novo: `skills` = `[]` (não null) em `POST /api/players` e `GET /api/me`. Um BACKEND que desbloqueia `be1` e depois `be2` recebe `["be1","be2"]` nesse desbloqueio, em `GET /api/me` e em `POST /api/me/travel`. `GET /api/me` sem sessão continua `401 unauthenticated` e sessão sem jogador continua `404 player_not_found` (CSKILL-02, AC 8; Surface)
Proof: `cd api && go test ./internal/skills -run '^TestPlayerSkills_InEveryPlayerInCatalogOrder$'`
Proof: `cd api && go test ./internal/httpx -run '^TestAuthMiddleware_RejectsEveryProtectedRoute$'`
Proof: `cd api && go test ./internal/player -run '^TestPlayerNotFound_OnPlayerRoutes$'`

**C12** - `POST /api/me/skills/be1/unlock` sem sessão: `401 unauthenticated`; sessão sem jogador: `404 player_not_found`; falha inesperada de banco: `500 internal` com `request_id` no log (CSKILL-02; Surface)
Proof: `cd api && go test ./internal/skills -run '^TestUnlockRoute_SessionPlayerAndUnexpected$'`

**C13** - Na própria camada, `SkillPosition` dá 0..11 para `fe1`..`fs3` na ordem do catálogo e 12 para um id de fora; `SortSkills` ordena `["fs3","zz","be1","fe2","fe1"]` como `["fe1","fe2","be1","fs3","zz"]` (CSKILL-02, AC 8)
Proof: `cd api && go test ./internal/catalog ./internal/player -run '^(TestCatalog_SkillPosition|TestSortSkills)$'`

**C14** - Com `FOR UPDATE` segurando a linha, o desbloqueio só responde depois do `COMMIT` e lê os pontos gravados por ela (CSKILL-02, AC 7)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_SerializesOnPlayerRowLock$'`

**C15** - Se o INSERT do nó falha, o desbloqueio responde `500 internal` e o jogador fica igual (CSKILL-02, AC 4)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_InsertError$'`

**C16** - Com `player_skills` indisponível, `GET /api/me` responde `500 internal` com `request_id` no log (CSKILL-02, AC 8)
Proof: `cd api && go test ./internal/skills -run '^TestMe_SkillsLoadError$'`

### S2 - A tela da classe · ~5 files · ~40 KB · ~10k

**C17** - Para cada classe, `/skills` mostra um único grupo, título `<NOME> · <PAPEL>` (`FRONTEND · SUPORTE`, `BACKEND · ATAQUE`, `DEVOPS · DEFESA`, `FULLSTACK · HÍBRIDO`), os 3 nós na ordem, ícone `code` / `server` / `shield` / `laptop`, e não renderiza o nome das outras trilhas (CSKILL-03, AC 9, AC 11)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "shows only the class tree"`

**C18** - Com `skills` = `["fe1"]` num FRONTEND: `fe1` `ATIVA`, `fe2` `1 PT`, `fe3` `BLOQ.` com `ic-lock`; `ATIVA` e `BLOQ.` desabilitados e sem chamar a api (CSKILL-03, AC 10)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "marks node states"`

**C19** - `PONTOS: 3` com 3 pontos. Com `fe1` e `fe2`, a faixa é `bônus ativo: +10 HP · +8 SP · +0% dano`. Sem skills, `+0 HP · +0 SP · +0% dano` (CSKILL-03, AC 12)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "shows points and bonus"`

**C20** - Clicar em `ENDPOINT` (`1 PT`) chama `POST /api/me/skills/be1/unlock`, repassa o `player` ao HUD e exibe `> ENDPOINT desbloqueada · +8% de dano em todos os ataques` (CSKILL-03, AC 13)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "unlock calls api and reports"`

**C21** - Erro `409 skill_wrong_class` mostra `essa habilidade é de outra classe`; erro sem corpo mostra `erro ao desbloquear`; erro de rede mostra `SERVIDOR FORA DO AR`; os estados dos nós não mudam e `setPlayer` não é chamado (CSKILL-03, AC 14)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "unlock error shows message"`

**C22** - Com o desbloqueio pendente, os 3 nós ficam desabilitados (CSKILL-03, AC 15)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "disables nodes while unlocking"`

**C23** - "ATIVAS EM COMBATE" mostra um chip por skill desbloqueada, em ordem do catálogo, ou `nenhuma habilidade equipada`. O HUD mostra o ícone `/art/icon/skill-<id>.png` com `alt` = nome do nó, ou `sem habilidades ativas` (CSKILL-03, AC 16)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "lists active skills"`
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "shows active skill glyphs"`

**C24** - Para cada um dos 12 ids existem `web/art/icon/skill-<id>.json` e o PNG 16×16; os 9 arquivos `skill-f1`, `skill-f2`, `skill-f3`, `skill-b1`, `skill-b2`, `skill-b3`, `skill-i1`, `skill-i2` e `skill-i3` não existem (CSKILL-03, AC 17)
Proof: `cd web && npx vitest run src/lib/art.test.tsx -t "skill icons"`

**C25** - Sem skill desbloqueada, a faixa é `> gaste pontos na trilha da sua classe.` (CSKILL-03, AC 18)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "asks to spend on the class tree"`

**C26** - Com o catálogo mockado em que a trilha do BACKEND se chama `SERVIDOR` e o papel é `DANO`, a cena mostra `SERVIDOR · DANO` e o nome do nó que o mock trocou (CSKILL-03, AC 9, AC 12)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "tree comes from catalog"`

**C27** - No navegador, um FRONTEND novo desbloqueia `HOTFIX DE CSS`, vê `ATIVA`, `PONTOS: 0` e o ícone no HUD, e o estado continua após reload (CSKILL-02, CSKILL-03)
Proof: `cd web && npx playwright test e2e/skills.spec.ts -g "unlock persists"`

### S3 - Comando em combate · ~4 files · ~50 KB · ~13k

**C28** - FRONTEND com `fe1`, HP 50 de 100, contra-ataque sorteado 7: evento `heal` com `amount` 26 e HP final 69. Com HP 90 de 100 e o mesmo contra-ataque: evento `heal` 26 e HP final 93 (CSKILL-04, AC 19)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_FrontendHeal$'`

**C29** - BACKEND com só `be1`, fraqueza off: base 18 sai dano 19; base 24 sai dano 26 (CSKILL-04, AC 20)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_BackendDamage$'`

**C30** - DEVOPS com `do1`, HP 50, contra-ataque sorteado 7: eventos incluem `heal` 10 e `shield`, o contra-ataque é 4 e o HP final é 56 (CSKILL-04, AC 21)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_DevopsShield$'`

**C31** - FULLSTACK com `fs1` e `fs2`, fraqueza off: base 16 sai dano 17; base 22 sai dano 23 (CSKILL-04, AC 22)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_FullstackDamage$'`

**C32** - Comando cuja `skill` não está em `player.skills` responde `409 command_locked` e não muda HP nem SP. `hadouken` responde `422 unknown_command` (CSKILL-04, AC 23)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_SkillCommandNeedsSkill$'`
Proof: `cd api && go test ./internal/battle -run '^TestCommand_Unknown$'`

**C33** - Cada um dos 12 comandos, desbloqueada só a cadeia da classe até ele, gasta o custo, aplica cura, dano (com o bônus de dano dos nós já desbloqueados dessa trilha), fraqueza, SP e escudo do catálogo, e o contra-ataque vem bloqueado só quando o comando tem escudo (CSKILL-04, AC 2)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_EverySkillCommand$'`

**C34** - O Bug Fight lista `fix`, `test`, `refactor`, `plain` e `rollback`, e além deles só o comando cuja skill está desbloqueada: com `be1`, aparece `be1` e não aparece `fe1` (CSKILL-04, AC 24)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "lists the class command"`

**C35** - `fxOf` de `be1`, `be2`, `be3` e `fs2` é `data`; `fxOf` de `fix`, `fe1`, `f1`, `b1`, `i3` e de um id desconhecido é `slash` (CSKILL-04, AC 25)
Proof: `cd web && npx vitest run src/lib/battleFx.test.tsx -t "fxOf"`

**C36** - `POST /api/me/battle/commands` sem sessão: `401 unauthenticated`; sessão sem jogador: `404 player_not_found`; sem batalha: `404 battle_not_found`; falha de banco: `500 internal` com `request_id` no log (CSKILL-04; Surface)
Proof: `cd api && go test ./internal/battle -run '^(TestRoutes_SessionPlayerAndUnexpected|TestTurn_NoBattle)$'`

### S4 - Migração · ~2 files · ~8 KB · ~2k

**C37** - Up a partir do schema anterior, três jogadores: um com `f1`+`b1`+`i2`, 1 ponto, HP 80, HP máximo 135 fica com `skills` vazio, 4 pontos, HP máximo 100, HP 45; um com só `f3` fica sem skills, +1 ponto, HP e HP máximo iguais; um sem linhas fica igual. HP 5 e HP máximo 20 com `f1`+`b1`+`i2` (bônus 35) ficam HP 1 e HP máximo 1 (CSKILL-05, AC 26, AC 27, AC 28, AC 29; door 3)
Proof: `cd api && go test ./internal/battle -run '^TestMigration_RefundsClassSkills$'`

**C38** - `GET /api/catalog` com `If-None-Match` igual ao ETag responde `304` com corpo vazio; com outro valor responde `200` (CSKILL-01; Surface)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ETag$'`

**C39** - `.specs/STATE.md` tem a linha `AD-018` com status `active` e o texto de que a classe do onboarding é a única trilha e que trocar de classe devolve pontos e HP (door 1)
Proof: `cd api && go test ./internal/skills -run '^TestState_AD018$'`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| skill trees (4) | `frontend` C1 · `backend` C1 · `devops` C1 · `fullstack` C1 | - |
| skill nodes (12) | C2, table-driven over all 12 | - |
| node descriptions (12) | C2, table-driven over all 12 | - |
| skill commands (12) | C3, table-driven over all 12 | - |
| shared commands (5) | `fix` C3 · `test` C3 · `refactor` C3 · `plain` C3 · `rollback` C3 | - |
| removed skill ids (9) | C1, table-driven over all 9 | - |
| first node per class (4) | `fe1` C4 · `be1` C4 · `do1` C4 · `fs1` C4 | - |
| HP bonus nodes (5) | `fe2` C5 · `do1` C5 · `do2` C5 · `do3` C5 · `fs3` C5 | - |
| non-HP nodes (7) | `fe1` C6 · `fe3` C6 · `be1` C6 · `be2` C6 · `be3` C6 · `fs1` C6 · `fs2` C6 | - |
| wrong-class pairs (12) | C7, table-driven over all 12 | - |
| unlock precedence (5) | `unknown_skill` C8 · `skill_wrong_class` C8 · `skill_already_unlocked` C8 · `skill_locked` C8 · `no_skill_points` C8 | - |
| `POST /api/me/skills/{id}/unlock` statuses (6) | 200 C4 · 401 C12 · 404 C12 · 409 C7 · 422 C8 · 500 C12, C15 | - |
| `GET /api/catalog` statuses (2) | 200 C1 · 304 C38 | - |
| `POST /api/me/battle/commands` statuses (6) | 200 C28 · 401 C36 · 404 C36 · 409 C32 · 422 C32 · 500 C36 | - |
| `GET /api/me` statuses (4) | 200 C11 · 401 C11 · 404 C11 · 500 C16 | - |
| screen trees (4) | FRONTEND C17 · BACKEND C17 · DEVOPS C17 · FULLSTACK C17 | - |
| node states (3) | `ATIVA` C18 · `1 PT` C18 · `BLOQ.` C18 | - |
| battle role samples (4) | `fe1` C28 · `be1` C29 · `do1` C30 · `fs2` C31 | - |
| applied skill commands (12) | C33, table-driven over all 12 | - |
| fx ids (6) | `be1` C35 · `be2` C35 · `be3` C35 · `fs2` C35 · removed `f1` C35 · unknown C35 | - |
| migration players (4) | three old skills C37 · only `f3` C37 · no rows C37 · floor at 1 C37 | - |
| skill icons (12) | C24, table-driven over all 12 | - |
| removed icon files (9) | C24, table-driven over all 9 | - |
| Landing doors (3) | 1 C1, C3, C39 · 2 C7 · 3 C37 | - |
| skill ordering (2) | known ids C13 · id outside the catalog C13 | - |

- Claims naming a status code, route or response shape: C1, C3, C4, C7, C8, C11, C12, C15, C16, C28–C32, C36, C38 — each proof issues a real HTTP request through `NewRouter`, except C37 (migration SQL) and C39 (the decision row)
- `GET /api/me` 401 and 404 are unchanged by this feature; the proofs named in Coverage are the ones that already issue those requests
- Web claims assert the rendered screen; the browser round trip is C27

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- `skills.Unlock`: 5-way precedence plus the class gate (12 pairs) and the HP/non-HP split -> decides, reached across a boundary (C4–C8) and the row lock at C14
- `catalog.SkillPosition` / `SortSkills`: one ordering rule -> decides, own layer C13 and boundary C11
- migration Up: one formula over 4 fixtures -> decides, own layer C37 (the migration is the code)
- `SkillsScene`: which tree, node state, bonus sum -> decides at screen level (C17–C26)
- `fxOf`: mapping table -> decides, own layer C35
- `battle.ApplyCommand` is unchanged; the new commands are catalog rows proven at the boundary (C28–C33)
- closest analogue: `api/internal/skills/skills.go` unlock guards, already proven at the boundary in the skills feature

## Swept

- validation: C8
- failure modes: C12, C15, C16, C21, C36
- idempotency: C8, C9, C10
- authorization: existing - `RequireSession`; C12 and C36 re-prove 401 and 404 on the routes this feature touches
- concurrency: C9, C14
- data lifecycle: C37
- dependency failure: n/a - no external service; a database failure is the 500 in C12, C15 and C16
- state transitions: C5, C7, C18
- observability: n/a - no new log line; the existing 500 path still logs `request_id` (C12, C16, C36)

## Handoff

Intended split, with the arithmetic, written before any code:

- S1–S4 touch about 121k tokens of existing files (`wc -c` / 4 on catalog, skills, battle, player and the skill/battle screens). Under the 150k budget, one builder, no handoff.

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

- **Boundary:** C1–C39 closed in this build
- **Settled mid-build:** AC 20 and AC 22 now state the damage after the node's own `dmg` bonus (AD-012). A BACKEND with only `be1` cannot have bonus 0, because that node is +8% dano. The catalog intervals stay 18–24 and 16–22.
- **Abandoned:** nothing
