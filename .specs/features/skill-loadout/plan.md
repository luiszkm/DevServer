# Loadout de skills, upgrade e especial por classe

Sources:

- conversa 2026-09-26 - "o usuário pode ter no máximo 4 skills + a skill especial do avatar"; refinar a tela de skills e poder upar uma skill
- respostas na mesma conversa: loadout de 4 equipadas dentre um pool maior; trilha da classe com 8 skills em corrente; passivo só conta equipado; upgrade Nv 1 a 3 com pontos de skill; especial = limit break da barra de poder, um por classe
- `.specs/features/class-skills/plan.md` - trilha exclusiva da classe, HP gravado no desbloqueio, comando `skill` = id do nó
- `.specs/features/limit-break/plan.md` - barra `players.power`, carga por acerto e crítico, comando `limit`
- `.specs/STATE.md` - AD-002, AD-003, AD-004, AD-005, AD-011, AD-012, AD-018

## Problem

Hoje cada classe tem 3 skills e todas as desbloqueadas ficam ativas para sempre. Não há escolha: quem tem os pontos tem tudo, e o ponto de skill acaba no nível 3. Também não existe um golpe especial da classe.

Quando isto for entregue, a trilha tem 8 skills; o jogador equipa no máximo 4 (só elas viram comando e só elas somam passivo), sobe cada skill desbloqueada até o nível 3 com pontos, e tem um especial fixo da classe que dispara quando a barra de poder enche.

## Out of scope

| Excluded | Why |
| --- | --- |
| Skills de outra classe | AD-018 continua valendo |
| Upar o especial | o especial é fixo; a resposta da conversa sobe só as skills da trilha |
| Trocar slot com o loadout cheio | equipar com os 4 ocupados responde erro; remover é explícito |
| Respec / devolver pontos | sem pedido |
| Arte de efeito por classe | os 4 especiais usam a mesma faixa `ship` |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tamanho do loadout | `skills.json` `slots` = 4 | pedido | y |
| Custo | desbloquear 1 PT, Nv 2 custa 2, Nv 3 custa 3 (`levels[].cost`) | ponto vira recurso de longo prazo | n |
| Escala do comando | dano, cura e SP ganho × `levels[].scale` / 100: 100, 125, 150, arredondado | proporcional ao bônus | n |
| Bônus passivo | Nv 1 = o bônus de hoje, Nv 2 ≈ ×1,5, Nv 3 = ×2 | o mesmo desenho da escala | n |
| Desbloquear | equipa no primeiro slot livre; com 4 ocupados fica desequipada | como `rack.Buy`; mantém o fluxo de hoje para quem tem até 4 skills | n |
| HP do passivo | soma ao HP e HP máximo ao equipar (e no upgrade de uma equipada), tira ao remover, HP mínimo 1 | a regra `changeHP` do gear | y |
| Loadout durante a luta | permitido; o SP máximo fica congelado no início | o comando lê o loadout atual | n |
| Especial | um comando `limit` por classe; exige `power` = `combat.power.max`; zera a barra antes do dano e não recarrega | limit-break door 3, uma por classe | y |
| Efeito dos especiais | BACKEND `SHIP IT` 80 dano; FRONTEND `HOT RELOAD` 40 dano, cura 60, +50 SP; DEVOPS `ZERO DOWNTIME` escudo, cura 60, 50 dano; FULLSTACK `MONOLITO` 60 dano, cura 30 | cada um no papel da classe; "cura total" virou número porque o catálogo não tem "total" | n |
| Jogadores existentes | a migration equipa as skills já desbloqueadas (máximo 3) no Nv 1, na ordem do catálogo | o HP gravado já inclui o passivo delas | y |

**Open questions:** none - todos os defaults acima podem ser trocados só no catálogo, menos o tamanho do loadout no schema (porta 1).

### Catálogo proposto

Nós 1–3 de cada trilha mantêm id, nome, glifo e comando de hoje. Bônus por nível e comando (Nv 1):

| Nó | Nome | Bônus Nv1/2/3 | Comando |
| --- | --- | --- | --- |
| `fe1` | HOTFIX DE CSS | sp 8/12/16 | cura 26, custo 12 |
| `fe2` | PAIR REVIEW | hp 10/15/20 | expõe fraqueza +4 SP, custo 10 |
| `fe3` | DESIGN SYSTEM | sp 12/18/24 | cura 32 +8 SP, custo 18 |
| `fe4` | ACESSIBILIDADE | hp 12/18/24 | escudo e cura 20, custo 14 |
| `fe5` | MEDIA QUERY | sp 10/15/20 | +16 SP, custo 6 |
| `fe6` | LIGHTHOUSE | dmg 6/9/12 | expõe fraqueza e cura 12, custo 12 |
| `fe7` | SERVICE WORKER | hp 15/23/30 | cura 40, custo 20 |
| `fe8` | HYDRATION | sp 16/24/32 | cura 45 +12 SP, custo 26 |
| `be1` | ENDPOINT | dmg 8/12/16 | 18–24, custo 12 |
| `be2` | QUERY PESADA | dmg 10/15/20 | 24–32, custo 16 |
| `be3` | DEADLOCK | dmg 12/18/24 | 32–42, custo 22 |
| `be4` | CACHE HIT | sp 8/12/16 | 12–16 +6 SP, custo 10 |
| `be5` | MIGRATION | dmg 8/12/16 | expõe fraqueza e 10–14, custo 14 |
| `be6` | THREAD POOL | dmg 10/15/20 | 34–42, custo 24 |
| `be7` | HOT PATH | hp 10/15/20 | 36–46, custo 28 |
| `be8` | SHARDING | dmg 14/21/28 | 40–50, custo 30 |
| `do1` | HEALTHCHECK | hp 15/23/30 | escudo e cura 10, custo 10 |
| `do2` | FIREWALL | hp 12/18/24 | escudo e cura 16, custo 14 |
| `do3` | CIRCUIT BREAKER | hp 18/27/36 | escudo +6 SP, custo 12 |
| `do4` | BACKUP | hp 14/21/28 | cura 30, custo 16 |
| `do5` | LOAD BALANCER | sp 10/15/20 | escudo +10 SP, custo 8 |
| `do6` | CANARY | hp 16/24/32 | escudo e expõe fraqueza, custo 12 |
| `do7` | RÉPLICA | hp 20/30/40 | escudo e cura 28, custo 20 |
| `do8` | TERRAFORM | dmg 8/12/16 | escudo e 20–26, custo 22 |
| `fs1` | SNACK DE CSS | sp 6/9/12 | cura 22, custo 12 |
| `fs2` | SCRIPT | dmg 6/9/12 | 16–22, custo 12 |
| `fs3` | PAGER | hp 10/15/20 | escudo e cura 8, custo 10 |
| `fs4` | STACK OVERFLOW | sp 8/12/16 | expõe fraqueza +3 SP, custo 9 |
| `fs5` | FREELA | dmg 8/12/16 | 20–28, custo 16 |
| `fs6` | CRUD | hp 12/18/24 | 12–16 e cura 12, custo 16 |
| `fs7` | DEPLOY NA SEXTA | dmg 10/15/20 | 28–38, custo 22 |
| `fs8` | MVP | hp 15/23/30 | escudo, cura 20 +6 SP, custo 20 |

## Criteria

### S1: catálogo e dados (P1)

1. The api SHALL servir em `GET /api/catalog` `skillSlots` = 4 e, em cada trilha, os 8 nós da tabela na ordem `x1`…`x8`, cada nó com `bonus.type` e `levels` de 3 entradas `{cost, bonus, scale}` = `{1, Nv1, 100}`, `{2, Nv2, 125}`, `{3, Nv3, 150}`
2. The api SHALL servir um comando por nó com `id` = `skill` = id do nó e o efeito/custo da tabela, e 4 comandos `limit` (`ship`, `hot_reload`, `zero_downtime`, `monolito`) com `class`, custo 0 e sem `skill`, depois dos comandos de skill e antes de `rollback`, e `combat.power` = `{max:100, perHit:10, perCrit:20}`
3. The api SHALL incluir em todo `player` `skills` (desbloqueadas, ordem do catálogo), `skillLevels` (id → nível), `loadout` (4 posições, id ou null) e `power`
4. WHEN a migration sobe num jogador com `fe1`,`fe2` THEN `loadout` SHALL ser `[fe1, fe2, null, null]`, os níveis 1, e HP/HP máximo/pontos os de antes; `power` SHALL ser 0
5. The schema SHALL recusar `level` fora de 1..3, `slot` fora de 0..3 e dois nós no mesmo slot do mesmo jogador

### S2: desbloquear, equipar, remover, upar (P1)

6. WHEN `unlock` é aceito (regras de hoje, custo `levels[0].cost`) e há slot livre THEN a skill SHALL entrar no primeiro slot livre no Nv 1 e o HP SHALL subir pelo bônus `hp` Nv 1; WHEN os 4 slots estão ocupados THEN a skill SHALL ficar desequipada e o HP SHALL não mudar
7. WHEN `POST /api/me/skills/{id}/equip` recebe uma skill desbloqueada, desequipada, com slot livre THEN a api SHALL pô-la no primeiro slot livre e somar o bônus `hp` do nível; já equipada → `200` sem mudança
8. IF os 4 slots estão ocupados THEN `equip` SHALL responder `409` `skill_loadout_full` `loadout cheio. remova uma habilidade antes` sem mudar nada
9. WHEN `POST /api/me/skills/{id}/unequip` recebe uma skill equipada THEN a api SHALL liberar o slot e tirar o bônus `hp` do nível do HP máximo e do HP (HP mínimo 1); desequipada → `200` sem mudança
10. WHEN `POST /api/me/skills/{id}/upgrade` recebe uma skill no Nv n < 3 e o jogador tem ao menos `levels[n].cost` pontos THEN a api SHALL gravar Nv n+1, tirar o custo e, se equipada com bônus `hp`, somar a diferença ao HP e ao HP máximo
11. `equip`, `unequip` e `upgrade` SHALL decidir nesta ordem: id fora do catálogo → `422 unknown_skill`; outra classe → `409 skill_wrong_class`; não desbloqueada → `409 skill_not_unlocked` `desbloqueie a habilidade primeiro`; (upgrade) Nv 3 → `409 skill_max_level` `habilidade já está no nível máximo`; (upgrade) pontos < custo → `409 no_skill_points`
12. Toda rota desta seção SHALL passar por `player.WithLocked`, responder `{"player": ...}`, `404 player_not_found` sem jogador e `500` quando a escrita falha, sem mudar o jogador

### S3: combate (P1)

13. IF o comando tem `skill` e ela não está em `loadout` THEN a api SHALL responder `409 command_locked` com a mensagem `equipe a skill para usar este comando`
14. WHEN um comando de skill no Nv n é usado THEN dano (os dois limites), cura e SP ganho SHALL sair × `levels[n-1].scale`/100 arredondado, antes da fraqueza e do bônus de dano
15. `player.Bonus` SHALL somar das skills só as equipadas, com o bônus do nível de cada uma
16. A barra de poder SHALL seguir limit-break AC 1–11 (carga +10 por acerto, +20 crítico, teto 100, sobrevive à luta)
17. IF o comando `limit` é de outra classe THEN `409 command_locked`; IF `power` < max THEN `409 power_not_ready` `a barra de poder ainda não encheu`; WHEN aceito THEN `power` SHALL ir a 0 antes do dano, e o golpe SHALL não recarregar

### S4: tela de skills (P1)

18. The web SHALL mostrar 4 slots de loadout na ordem de `player.loadout` (vazio = `VAZIO`) e um 5º slot `ESPECIAL` com o comando `limit` da classe e `PODER <power>/<max>`
19. The web SHALL listar os 8 nós da trilha com estado `BLOQ.`, `1 PT` ou `Nv <n>`; nó desbloqueado SHALL ter `EQUIPAR` ou `REMOVER` e `UPAR · <custo> PT` (ou `NV MÁX.`), desabilitado sem pontos, no nível 3, ou com loadout cheio para `EQUIPAR`
20. The web SHALL mostrar `bônus ativo: +<hp> HP · +<sp> SP · +<dmg>% dano` somando só o loadout no nível de cada skill
21. WHEN uma ação responde THEN o web SHALL repassar o `player`; IF erro THEN SHALL exibir `error.message` na faixa de mensagem
22. Clicar num slot ocupado SHALL remover a skill; o HUD SHALL mostrar os ícones do loadout
23. WHILE a largura é menor que 1200px os slots e a trilha SHALL caber sem rolagem horizontal

### S5: Bug Fight (P1)

24. The web SHALL listar os comandos sem `skill` e sem `limit`, os comandos das skills do loadout, e o especial da classe; o botão de uma skill no Nv n > 1 SHALL escrever `<hint> · Nv <n> <scale>% · <custo> SP`, e o especial SHALL escrever `PODER` no lugar do custo
25. The web SHALL mostrar `PODER <power>/<max>` com a barra; o especial SHALL estar habilitado só com `power` = max e a luta ativa
26. WHEN o evento `damage` vem de um comando `limit` THEN o web SHALL tocar a faixa `/art/fx/ship.png` (128px, 1,2s, `steps(4)`) e o float `-<n> <LABEL>!`

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| LOAD-01 | S1 | 1–5 | Pending |
| LOAD-02 | S2 | 6–12 | Pending |
| LOAD-03 | S3 | 13–17 | Pending |
| LOAD-04 | S4 | 18–23 | Pending |
| LOAD-05 | S5 | 24–26 | Pending |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. loadout no banco | `player_skills.level smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3)`, `player_skills.slot smallint NULL CHECK (slot BETWEEN 0 AND 3)`, `UNIQUE (player_id, slot)`; JSON `loadout` como `rack` | tabela `player_loadout` separada - duas fontes para "desbloqueada" |
| 2. barra no jogador | `players.power integer NOT NULL DEFAULT 0 CHECK (power >= 0)` | coluna em `battles` (limit-break door 1) |
| 3. códigos novos | `409 skill_not_unlocked`, `409 skill_max_level`, `409 skill_loadout_full`, `409 power_not_ready` | reusar `skill_locked` - a mensagem fala do nó anterior |

Na confirmação, `.specs/STATE.md` ganha AD-019 (loadout e níveis) e AD-020 (barra de poder e especial por classe).
