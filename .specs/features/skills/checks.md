# Skills - checks

Profile: standard
Plan: `.specs/features/skills/plan.md`

## Intent

26 checks in 2 slices · 6 one-way doors · 0 open

Pré-requisitos: os mesmos da foundation (`docker compose up -d --wait db`; vitest com `fetch` mockado; Playwright sobe a stack).

## Checks

### S1 - Desbloquear uma habilidade · ~8 files · ~25 KB · ~7k

**C1** - Jogador com 1 skill point desbloqueia `f1`: `200`, `player.skillPoints` = 0, `player.skills` = `["f1"]` e 1 linha em `player_skills` (SKILL-01, AC 1)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_SpendsPointAndRecords$'`

**C2** - Desbloquear `f1`, `b1` e `i2` (depois de `i1`) soma 10, 10 e 15 ao HP máximo e ao HP atual (SKILL-01, AC 2)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_HPBonus$'`

**C3** - Desbloquear `f2` (SP) e `f3` (dano) deixa nível, XP, XP máximo, HP, HP máximo, coins, gems, região e skin iguais; só `skillPoints` cai 1 por nó (SKILL-01, AC 3)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_NonHPBonusChangesOnlyPoints$'`

**C4** - `f2` sem `f1` e `i3` com só `i1` respondem `409 skill_locked` sem gastar ponto (SKILL-01, AC 4)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_PreviousRequired$'`

**C5** - Desbloquear `f1` de novo responde `409 skill_already_unlocked` sem gastar ponto (SKILL-01, AC 5)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_AlreadyUnlocked$'`

**C6** - Com 0 skill points, desbloquear `f1` responde `409 no_skill_points` e não grava linha (SKILL-01, AC 6)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_NoPoints$'`

**C7** - `x9` responde `422 unknown_skill` (SKILL-01, AC 7)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_UnknownSkill$'`

**C8** - 10 desbloqueios simultâneos de `f1` com 3 pontos resultam em 1 `200`, 9 `409 skill_already_unlocked` e 2 pontos restantes (SKILL-01, AC 8)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_ConcurrentOnce$'`

**C9** - Inserir direto no banco o mesmo (jogador, nó) duas vezes falha com `unique_violation` (SKILL-01, AC 8; door 1)
Proof: `cd api && go test ./internal/skills -run '^TestPlayerSkills_UniquePerNode$'`

**C10** - Jogador novo recebe `skills` = `[]` (não `null`) em `POST /api/players` e `GET /api/me`; depois de desbloquear `b1` e então `f1`, a resposta desse desbloqueio, `GET /api/me` e `POST /api/me/travel` devolvem `skills` = `["f1","b1"]` (SKILL-01, AC 9; door 4)
Proof: `cd api && go test ./internal/skills -run '^TestPlayerSkills_InEveryPlayerInCatalogOrder$'`

**C11** - Sem sessão responde `401 unauthenticated`, sessão sem jogador responde `404 player_not_found` e erro inesperado de banco responde `500 internal` com log do `request_id`, em `POST /api/me/skills/f1/unlock` (SKILL-01)
Proof: `cd api && go test ./internal/skills -run '^TestUnlockRoute_SessionPlayerAndUnexpected$'`

**C12** - `GET /api/catalog` inclui `skillTrees` = `frontend`, `backend`, `infra` nessa ordem, cada um com `name` e os nós da tabela do plano com `id`, `glyph`, `name`, `description` e `bonus` (`type`, `amount`) (SKILL-02, AC 19; door 3)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesSkillTrees$'`

### S2 - Ver a árvore · ~6 files · ~22 KB · ~6k

**C13** - A cena exibe as 3 trilhas na ordem do catálogo, cada uma com seus 3 nós na ordem, com glifo, nome e descrição (SKILL-02, AC 10)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "renders trees in catalog order"`

**C14** - Com `skills` = `["f1"]`: `f1` `ATIVA`, `f2` `1 PT`, `f3` `BLOQ.`, `b1` `1 PT`, `b2` `BLOQ.`, `i1` `1 PT` (SKILL-02, AC 11)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "marks node states"`

**C15** - Com 3 skill points a cena exibe `PONTOS: 3` (SKILL-02, AC 12)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "shows points"`

**C16** - Com `skills` = `["f1","f2","b1","b2","b3"]` a faixa exibe `bônus ativo: +20 HP · +18 SP · +12% dano`; sem skills, `+0 HP · +0 SP · +0% dano` (SKILL-02, AC 13)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "sums active bonus"`

**C17** - Clicar em `API REST` (`1 PT`) chama `POST /api/me/skills/b1/unlock`, repassa o `player` ao HUD e exibe `> API REST desbloqueada · +10 HP máximo permanente` (SKILL-02, AC 14)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "unlock calls api and reports"`

**C18** - Erro `409 no_skill_points`, erro sem corpo e erro de rede exibem a mensagem da api, `erro ao desbloquear` e `SERVIDOR FORA DO AR`, sem mudar os estados dos nós nem chamar `setPlayer` (SKILL-02, AC 15)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "unlock error shows message"`

**C19** - Com o desbloqueio pendente, todos os 9 nós ficam desabilitados (SKILL-02, AC 16)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "disables nodes while unlocking"`

**C20** - Nós `ATIVA` e `BLOQ.` ficam desabilitados e não chamam a api (SKILL-02, AC 11)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "only available nodes are clickable"`

**C21** - "ATIVAS EM COMBATE" mostra um chip com glifo por skill desbloqueada, em ordem do catálogo, ou `nenhuma habilidade equipada` (SKILL-02, AC 17)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "lists active skills"`

**C22** - O HUD mostra no card SKILL PTS os glifos `</>` e `$_` para `skills` = `["f1","b1"]`, e `sem habilidades ativas` para `[]` (SKILL-02, AC 18)
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "shows active skill glyphs"`

**C23** - Com um catálogo mockado em que `f1` se chama `HTML PURO` e dá `+99 HP`, a cena mostra `HTML PURO` e a faixa `+99 HP` com `skills` = `["f1"]` (SKILL-02, AC 19)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "tree comes from catalog"`

**C24** - A rota `/skills` renderiza a cena de skills e não mais `EM BREVE` (SKILL-02, AC 10)
Proof: `cd web && npx vitest run src/components/SkillsScene.test.tsx -t "skills page renders the scene"`

**C25** - No navegador, um dev novo desbloqueia `MARKUP SEMÂNTICO`, vê `ATIVA`, `PONTOS: 0`, `HP 110/110` e o glifo `</>` no HUD, e o estado continua após reload (SKILL-01, SKILL-02)
Proof: `cd web && npx playwright test e2e/skills.spec.ts -g "unlock persists"`

**C26** - `POST /api/me/skills/f1/unlock` passa pelo mesmo `player.WithLocked`: com uma transação de teste segurando `FOR UPDATE` na linha do jogador, o desbloqueio só responde depois do `COMMIT`, e lê os pontos gravados por ela (SKILL-01, AC 8)
Proof: `cd api && go test ./internal/skills -run '^TestUnlock_SerializesOnPlayerRowLock$'`

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

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/me/skills/{id}/unlock` statuses (6) | 200 C1 · 401 C11 · 404 C11 · 409 C4 · 422 C7 · 500 C11 | - |
| `GET /api/me` body with `skills` (1) | 200 C10 | - |
| `GET /api/catalog` new key (1) | `skillTrees` C12 | - |
| skill nodes (9) | C12, table-driven over all 9 | - |
| bonus types (3) | `hp` C2 · `sp` C3 · `dmg` C3 | - |
| HP nodes (3) | `f1` C2 · `b1` C2 · `i2` C2 | - |
| new error codes (4) | `skill_locked` C4 · `skill_already_unlocked` C5 · `no_skill_points` C6 · `unknown_skill` C7 | - |
| `409` on unlock (3) | `skill_locked` C4 · `skill_already_unlocked` C5 · `no_skill_points` C6 | - |
| node states on screen (3) | `ATIVA` C14 · `1 PT` C14 · `BLOQ.` C14 | - |
| HUD receives catalog from `GameShell` (1) | `GameShell.test.tsx` shows glyphs C22 | - |
| active-skill displays (4) | cena com skills C21 · cena vazia C21 · HUD com skills C22 · HUD vazio C22 | - |
| unlock outcomes on screen (4) | 200 C17 · erro com mensagem C18 · sem corpo C18 · rede C18 | - |
| routes returning `player` with `skills` (4) | `POST /api/players` C10 · `GET /api/me` C10 · `POST /api/me/travel` C10 · `POST /api/me/skills/{id}/unlock` C10 | - |
| Landing doors (6) | 1 C9 · 2 C2, C3 · 3 C12 · 4 C10 · 5 C4 · 6 C1 | - |
| entities (1) | `PlayerSkill` C9 | - |

- Claims naming a status code, route or response shape: C1–C8, C10–C12, C26 - each proof issues a real HTTP request through `NewRouter`, except C9 (constraint, straight SQL)
- Web claims at unit level assert the rendered screen; the browser round trip is C25
- `GET /api/me` statuses 401, 404 and 500 are untouched by this feature and stay proven by the foundation checks (C9, C38, C49 there)

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- unlock rule: 4 guards (known node, already unlocked, previous unlocked, points) + HP bonus -> decides, reached across a boundary (C1–C8)
- `player.skills` ordering: 1 sort by catalog position -> decides, boundary C10
- `SkillsScene`: node state, bonus sum, chips -> decides at screen level (C13–C24)
- closest analogue: `api/internal/deploy/deploy.go` claim (guards inside `WithLocked`), proven at the boundary

## Swept

- validation: C7
- failure modes: C11, C18
- idempotency: C5, C8
- authorization: C11
- concurrency: C8, C26
- data lifecycle: n/a - nó desbloqueado é permanente (sem respec, decisão do plano)
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C11
- state transitions: C4, C14
- observability: C11

## Impact on earlier checks

- foundation C28: `/skills` sai do conjunto "EM BREVE", que fica com `/bug-fight`, `/loja`, `/avatar`

## Handoff

- S1–S2 ≈ 7k + 6k ≈ 13k de leitura, abaixo do budget de 150k - um builder, sem handoff

- **Boundary:** C1-C26 closed on `feat/skills`
- **Settled mid-build:** `player.Get`/`WithLocked` load skills and sort them by `catalog.Default()` (catalog loaded once); unreachable `nil` guard in `SortSkills` removed; C10 strengthened to assert the unlock response order
- **Abandoned:** none; 24 self-mutations (12 api, 12 web) before verification - 3 survivors (unlock response order, dead nil guard, HUD not receiving the catalog) closed by C10, removal of the dead code, and a `GameShell` HUD test
