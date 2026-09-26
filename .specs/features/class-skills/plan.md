# Skills por classe

Sources:

- conversa 2026-09-26 - cada classe tem skills próprias e uma árvore de evolução; FRONTEND suporte, BACKEND ataque, DEVOPS defesa
- `.specs/features/skills/plan.md` - trilhas, desbloqueio em sequência, 1 ponto por nó, HP gravado, SP e dano derivados
- `api/catalog/skills.json`, `api/catalog/combat.json` - os 9 nós e os comandos atuais
- `api/internal/player/player.go` - classes `FRONTEND`, `BACKEND`, `DEVOPS`, `FULLSTACK`; o comentário as chama de cosméticas
- `.specs/STATE.md` AD-003 (números só no catálogo), AD-012 (bônus numa regra só)

## Problem

A classe escolhida no onboarding não muda o que o dev aprende. As três trilhas (FRONTEND, BACKEND, INFRA) estão abertas para todo mundo, os comandos ligados a elas não seguem um papel (os nós de frontend são ataques, o segundo de backend cura, infra mistura), e DEVOPS e FULLSTACK não têm trilha com o próprio nome. Dois devs no mesmo nível, de classes diferentes, desbloqueiam os mesmos comandos e os mesmos bônus. A evidência é o código e o catálogo; a conversa não traz número de jogadores nem meta.

Quando isto for entregue, a trilha que o dev vê e pode comprar é a da classe dele: suporte, ataque, defesa ou o híbrido. O kit básico de combate (FIX, TEST, REFACTOR, PLAIN, ROLLBACK) continua de todo mundo. Quem já gastou ponto nas skills antigas recebe os pontos de volta e perde o HP que aqueles nós gravaram.

## Out of scope

| Excluded | Why |
| --- | --- |
| Trocar de classe depois do onboarding | não existe hoje; a porta 1 diz o que um respec futuro teria de devolver |
| Redistribuir pontos (respec) sem trocar de classe | o plano de skills já excluiu; sem pedido novo |
| Árvore com ramificação (dois filhos de um nó) | a regra atual é "o nó anterior"; um galho é outra regra de desbloqueio |
| Efeito novo de combate (provocação, redução de dano diferente de metade, buff em aliado) | o combate não tem aliado nem outro escudo; defesa usa HP gravado, cura e o escudo que já existe |
| Tirar FIX, TEST, REFACTOR, PLAIN e ROLLBACK | sem eles a classe de suporte não bate e ninguém luta antes do primeiro ponto |
| Rebalancear HP e dano dos inimigos | os comandos novos ficam na faixa dos atuais; mexer no mob é outro corte |
| Nó com custo diferente de 1 ponto | igual ao plano de skills |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Papel das três classes nomeadas | FRONTEND suporte, BACKEND ataque, DEVOPS defesa | pedido nesta conversa | y |
| Uma trilha por classe, exclusiva | o jogador só vê e só desbloqueia a trilha cujo `class` é igual a `player.class` | trilha compartilhada é o que torna a classe cosmética | y |
| FULLSTACK | trilha `fullstack`, papel HÍBRIDO: um nó de cura, um de dano e um de escudo, cada um mais fraco que o primeiro nó do especialista daquele papel | as quatro classes já existem no onboarding; abrir as outras três para o FULLSTACK o torna estritamente melhor | y |
| Forma da evolução | 3 nós em sequência, 1 ponto cada, o primeiro sempre disponível; a trilha fecha com o ponto inicial mais 2 níveis | a mesma regra do plano de skills; mais nós é outro corte de progressão | y |
| Kit básico | `fix`, `test`, `refactor`, `plain` e `rollback` permanecem, com os mesmos números de hoje, sem `skill` | todo mundo luta antes de gastar ponto e tem uma ferramenta fora do papel | y |
| Comando da skill | continua em `combat.json`, `id` = id do nó, campo `skill` = id do nó; o nó guarda só o bônus passivo | a batalha já lê `commands` e já recusa comando cuja skill não está desbloqueada | y |
| Skills antigas | a migração apaga toda `player_skills`, devolve 1 ponto por linha e tira do HP e do HP máximo 10 por `f1`, 10 por `b1` e 15 por `i2`; os outros ids antigos não tinham HP gravado | SP e dano são derivados e somem com a linha; o HP não, porque foi somado na hora do desbloqueio | y |
| Faixa de bônus na tela | continua `bônus ativo: +<hp> HP · +<sp> SP · +<dmg>% dano`, inclusive com zero | é a faixa que a tela de skills já tem; esconder o zero mudaria o contrato sem pedido | y |
| Ícone ao lado do nome da trilha | `frontend` → `code`, `backend` → `server`, `devops` → `shield`, `fullstack` → `laptop` | os quatro já existem em `web/art/icon`; não são número de balanceamento | y |

**Open questions:** none - all resolved or logged above.

### Catálogo proposto

Trilhas, nesta ordem. `class` é o valor gravado no jogador. O bônus é o do nó; o efeito é o do comando.

| Nó | Glifo | Nome | Bônus | Comando |
| --- | --- | --- | --- | --- |
| `fe1` | `</>` | HOTFIX DE CSS | `sp` 8 | cura 26, custo 12 |
| `fe2` | `{}` | PAIR REVIEW | `hp` 10 | expõe fraqueza e +4 SP, custo 10 |
| `fe3` | `~` | DESIGN SYSTEM | `sp` 12 | cura 32 e +8 SP, custo 18 |
| `be1` | `$_` | ENDPOINT | `dmg` 8 | dano 18–24, custo 12 |
| `be2` | `[]` | QUERY PESADA | `dmg` 10 | dano 24–32, custo 16 |
| `be3` | `##` | DEADLOCK | `dmg` 12 | dano 32–42, custo 22 |
| `do1` | `>_` | HEALTHCHECK | `hp` 15 | escudo e cura 10, custo 10 |
| `do2` | `::` | FIREWALL | `hp` 12 | escudo e cura 16, custo 14 |
| `do3` | `^` | CIRCUIT BREAKER | `hp` 18 | escudo e +6 SP, custo 12 |
| `fs1` | `</>` | SNACK DE CSS | `sp` 6 | cura 22, custo 12 |
| `fs2` | `$_` | SCRIPT | `dmg` 6 | dano 16–22, custo 12 |
| `fs3` | `::` | PAGER | `hp` 10 | escudo e cura 8, custo 10 |

Trilha `frontend` nome FRONTEND classe FRONTEND papel SUPORTE: `fe1` `fe2` `fe3`.
Trilha `backend` nome BACKEND classe BACKEND papel ATAQUE: `be1` `be2` `be3`.
Trilha `devops` nome DEVOPS classe DEVOPS papel DEFESA: `do1` `do2` `do3`.
Trilha `fullstack` nome FULLSTACK classe FULLSTACK papel HÍBRIDO: `fs1` `fs2` `fs3`.

Descrição de cada nó, o texto do bônus: `+8 SP máximo em combate`, `+10 HP máximo permanente`, `+12 SP máximo em combate`, `+8% de dano em todos os ataques`, `+10% de dano em todos os ataques`, `+12% de dano em todos os ataques`, `+15 HP máximo permanente`, `+12 HP máximo permanente`, `+18 HP máximo permanente`, `+6 SP máximo em combate`, `+6% de dano em todos os ataques`, `+10 HP máximo permanente`.

Hint de cada comando: `cura 26 HP`, `expõe a fraqueza e recupera 4 SP`, `cura 32 HP e recupera 8 SP`, `golpe forte · 18-24 dano`, `query pesada · 24-32`, `deadlock · 32-42`, `escuda e cura 10 HP`, `escuda e cura 16 HP`, `escuda e recupera 6 SP`, `cura 22 HP`, `golpe · 16-22 dano`, `escuda e cura 8 HP`.

Referência do especialista contra o híbrido, no primeiro nó de cada papel: cura 26 contra 22, dano 18–24 contra 16–22, cura-com-escudo 10 e +15 HP contra cura-com-escudo 8 e +10 HP. REFACTOR continua curando 18 por 14 de SP; FIX continua em 14–20 por 10.

## Criteria

### S1: Catálogo e desbloqueio da própria classe (P1)

**Acceptance Criteria**

1. WHEN `GET /api/catalog` responde THEN a api SHALL servir `skillTrees` com exatamente 4 trilhas nesta ordem: `frontend`/`FRONTEND`/`FRONTEND`/`SUPORTE`, `backend`/`BACKEND`/`BACKEND`/`ATAQUE`, `devops`/`DEVOPS`/`DEVOPS`/`DEFESA`, `fullstack`/`FULLSTACK`/`FULLSTACK`/`HÍBRIDO`, cada uma com os 3 ids de nó da tabela acima, e SHALL não servir trilha `infra` nem nó `f1`, `f2`, `f3`, `b1`, `b2`, `b3`, `i1`, `i2` ou `i3`
2. The api SHALL servir cada um dos 12 nós com o glifo, o nome, a descrição e o bônus da tabela acima, e cada um dos 12 comandos com `skill` igual ao id do nó, o efeito, o custo e o hint da tabela acima
3. The api SHALL servir `fix`, `test`, `refactor`, `plain` e `rollback` com os mesmos campos de hoje: dano 14–20 custo 10; expõe fraqueza custo 8; cura 18 custo 14; escudo e +3 SP custo 0; fuga custo 0; nenhum deles com `skill`
4. WHEN `POST /api/me/skills/{id}/unlock` recebe o primeiro nó da classe do jogador e ele tem ao menos 1 skill point THEN a api SHALL gravar o nó, tirar 1 skill point e responder `200` com `player`; para `fe2`, `do1`, `do2`, `do3` e `fs3` SHALL somar o bônus ao HP e ao HP máximo; para os outros 7 SHALL deixar HP e HP máximo como estavam
5. IF o nó pertence a outra classe THEN a api SHALL responder `409` com `error.code` = `skill_wrong_class` e `error.message` = `essa habilidade é de outra classe`, e SHALL não mudar skill points, HP, HP máximo nem `skills`
6. The api SHALL decidir o desbloqueio nesta ordem, e o primeiro caso ganha: id fora do catálogo → `422` `unknown_skill`; outra classe → `409` `skill_wrong_class`; já desbloqueado → `409` `skill_already_unlocked`; nó anterior da mesma trilha ausente → `409` `skill_locked`; 0 skill points → `409` `no_skill_points`
7. The api SHALL gravar cada nó no máximo 1 vez por jogador, inclusive com dois desbloqueios simultâneos do mesmo nó da própria classe
8. The api SHALL incluir em todo `player` a lista `skills` com os ids desbloqueados na ordem do catálogo, `[]` quando não há nenhum

**Independent test:** um BACKEND com 1 ponto desbloqueia `be1` (HP intacto, ponto 0) e recebe `409 skill_locked` em `be2`; `fe1` recebe `409 skill_wrong_class` com o jogador intacto; `nope` recebe `422 unknown_skill`.

### S2: A tela mostra só a trilha da classe (P1)

**Acceptance Criteria**

9. WHEN o jogador abre `/skills` THEN o web SHALL mostrar um único grupo, o da trilha cujo `class` é igual a `player.class`, com o título visível `<NOME> · <PAPEL>` (exemplo `FRONTEND · SUPORTE`), os 3 nós na ordem do catálogo, cada um com `/art/icon/skill-<id>.png`, nome e descrição, e o ícone `code`, `server`, `shield` ou `laptop` conforme a trilha
10. The web SHALL marcar cada nó como `ATIVA`, `1 PT` ou `BLOQ.` pela mesma regra de antes: desbloqueado, primeiro nó ou anterior desbloqueado, caso contrário bloqueado; `BLOQ.` leva o ícone `ic-lock`; botão que não está `1 PT` fica desabilitado
11. The web SHALL não renderizar o nome das outras três trilhas nem um nó de outra classe
12. The web SHALL exibir `PONTOS: <n>` e `bônus ativo: +<hp> HP · +<sp> SP · +<dmg>% dano` somando só os nós desbloqueados a partir do catálogo, com zero quando a trilha não tem aquele tipo
13. WHEN o jogador clica num nó `1 PT` THEN o web SHALL chamar o desbloqueio, repassar o `player` ao HUD e exibir `> <NOME> desbloqueada · <descrição>`
14. IF o desbloqueio responde erro THEN o web SHALL exibir a mensagem da api na faixa de mensagem e não mudar o estado dos nós
15. WHILE o desbloqueio está em andamento o web SHALL desabilitar os nós
16. The web SHALL exibir em "ATIVAS EM COMBATE" um chip por skill desbloqueada, ou o texto `nenhuma habilidade equipada`; o HUD SHALL exibir no card SKILL PTS o ícone de cada skill desbloqueada com `alt` = nome do nó, ou o texto `sem habilidades ativas`
17. The web SHALL ter, para cada um dos 12 ids, `web/art/icon/skill-<id>.json` e o PNG 16×16 em `web/public/art/icon/`; os 9 arquivos `skill-f1`, `skill-f2`, `skill-f3`, `skill-b1`, `skill-b2`, `skill-b3`, `skill-i1`, `skill-i2` e `skill-i3` SHALL deixar de existir
18. WHEN `/skills` abre sem nenhuma skill desbloqueada THEN a faixa de mensagem SHALL ser `> gaste pontos na trilha da sua classe.`

**Independent test:** um FRONTEND com 1 ponto e nenhuma skill vê só FRONTEND · SUPORTE, `fe1` em `1 PT`, `fe2` e `fe3` em `BLOQ.`, e não vê a palavra BACKEND.

### S3: O comando em combate é o da classe (P1)

**Acceptance Criteria**

19. WHEN um FRONTEND com `fe1` desbloqueado usa o comando `fe1` com HP 50 de 100 THEN o evento `heal` SHALL ter `amount` 26; WHEN o HP está em 90 de 100 THEN o evento `heal` SHALL ter `amount` 26 e o HP SHALL ficar em 100 antes do contra-ataque
20. WHEN um BACKEND com só `be1` desbloqueado (o bônus de dano é 8, o desse nó, AD-012) e a fraqueza ainda não exposta usa `be1` THEN o dano de base 18 SHALL sair 19 e o de base 24 SHALL sair 26, `round(base × 1.08)`
21. WHEN um DEVOPS com `do1` desbloqueado usa `do1` com HP 50 e o contra-ataque sorteado é 7 THEN os eventos SHALL incluir `heal` com `amount` 10 e `shield`, e o contra-ataque SHALL ser 4
22. WHEN um FULLSTACK com `fs1` e `fs2` desbloqueados (o bônus de dano é 6, só de `fs2`) e a fraqueza não exposta usa `fs2` THEN o dano de base 16 SHALL sair 17 e o de base 22 SHALL sair 23, `round(base × 1.06)`
23. IF o comando tem `skill` e esse id não está em `player.skills` THEN a api SHALL responder `409` com `error.code` = `command_locked` e não mudar HP nem SP
24. The web SHALL listar no Bug Fight os 5 comandos sem `skill` e, além deles, só o comando cuja `skill` está em `player.skills`
25. The web SHALL usar o efeito visual `data` nos comandos de dano `be1`, `be2`, `be3` e `fs2`; qualquer outro id de comando, inclusive os 9 removidos, SHALL usar `slash`

**Independent test:** um DEVOPS sem skills não vê `do1` no Bug Fight e `POST` de `do1` responde `command_locked`; depois de desbloquear `do1`, o botão aparece e o turno cura 10 e escuda.

### S4: Quem já tinha skill antiga recebe o ponto de volta (P1)

**Acceptance Criteria**

26. WHEN a migração sobe num jogador com linhas `f1`, `b1` e `i2`, `skill_points` 1, HP 80 e HP máximo 135 THEN o jogador SHALL ficar com `skills` = `[]`, `skill_points` 4, HP máximo 100 e HP 45
27. WHEN a migração sobe num jogador cuja única linha é `f3` THEN o jogador SHALL ficar com `skills` = `[]` e 1 skill point a mais, e o HP e o HP máximo SHALL permanecer os de antes
28. WHEN a migração sobe num jogador sem linhas em `player_skills` THEN skill points, HP, HP máximo e `skills` SHALL permanecer os de antes
29. IF o HP menos o bônus antigo é menor que 1, ou o HP máximo menos o bônus antigo é menor que 1, THEN a migração SHALL gravar 1 nesse atributo e o HP SHALL ficar menor ou igual ao HP máximo

**Independent test:** inserir `f1`+`b1`+`i2` e `f3` em dois jogadores, rodar o Up, ler os dois estados da tabela acima.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| CSKILL-01 | S1 | 1, 2, 3 | Pending |
| CSKILL-02 | S1 | 4, 5, 6, 7, 8 | Pending |
| CSKILL-03 | S2 | 9, 10, 11, 12, 13, 14, 15, 16, 17, 18 | Pending |
| CSKILL-04 | S3 | 19, 20, 21, 22, 23, 24, 25 | Pending |
| CSKILL-05 | S4 | 26, 27, 28, 29 | Pending |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen `/skills` | empty state | AC 16 |
| screen `/skills` | loading state | n/a - a cena só renderiza com `player` e catálogo já carregados pelo `GameShell` |
| screen `/skills` | error state | AC 14 |
| screen `/skills` | unauthorised state | existing - `GameShell` mostra login em `401` |
| screen `/skills` | ordering | AC 9 |
| screen `/skills` | destructive action confirms | n/a - desbloquear gasta 1 ponto e não desfaz; o custo continua visível no nó (`1 PT`), como no plano de skills |
| screen `hud` | empty state | AC 16 |
| screen Bug Fight | empty state | AC 24 |
| screen Bug Fight | error state | AC 23 |
| screen Bug Fight | ordering | AC 24 |
| screen Bug Fight | loading state | existing - o encontro só lista comandos com a batalha já aberta |
| screen Bug Fight | unauthorised state | existing - `GameShell` mostra login em `401` |
| screen Bug Fight | destructive action confirms | n/a - o comando gasta SP e o custo já está no botão |
| API `POST /api/me/skills/{id}/unlock` | response shape | AC 4 |
| API `POST /api/me/skills/{id}/unlock` | error shape and codes | AC 5 |
| API `POST /api/me/skills/{id}/unlock` | who may call it | existing - `RequireSession` |
| API `POST /api/me/skills/{id}/unlock` | versioning | n/a - único consumidor é o `web/` publicado junto |
| API `POST /api/me/skills/{id}/unlock` | rate limit behaviour | n/a - limitado pelos skill points e pela trilha da classe |
| API `GET /api/catalog` | response shape | AC 1 |
| API `GET /api/catalog` | error shape and codes | n/a - a rota não ganha erro novo; continua `200` e `304` |
| API `GET /api/catalog` | who may call it | existing - catálogo público |
| API `GET /api/catalog` | versioning | n/a - único consumidor é o `web/` publicado junto |
| API `GET /api/catalog` | rate limit behaviour | n/a - leitura do catálogo embutido |
| API `POST /api/me/battle/commands` | response shape | AC 19 |
| API `POST /api/me/battle/commands` | error shape and codes | AC 23 |
| API `POST /api/me/battle/commands` | who may call it | existing - `RequireSession` |
| API `POST /api/me/battle/commands` | versioning | n/a - único consumidor é o `web/` publicado junto |
| API `POST /api/me/battle/commands` | rate limit behaviour | n/a - limitado pelo SP do encontro |
| API `GET /api/me` and every `player` | response shape | AC 8 |

## Flow

Reusa o desbloqueio que já trava o jogador, cobra 1 ponto e grava o HP do nó, e a batalha que já esconde o comando cuja skill não está em `player.skills`. O que muda é o catálogo (uma trilha por classe) e a recusa quando a trilha não é a da classe. Não há segunda regra de bônus: SP e dano continuam saindo de `player.Bonus`.

1. `GET /api/catalog` -> `catalog` (exists) - serve as 4 trilhas e os comandos (door 1)
2. `POST /api/me/skills/{id}/unlock` -> `RequireSession` (exists) -> `player.WithLocked` (exists) -> `skills.Unlock` (exists) - recusa outra classe (door 2), depois predecessor, ponto e HP como hoje; grava `PlayerSkill` (exists)
3. migration Up (door 3) - devolve pontos, tira o HP antigo, apaga `player_skills`
4. web `/skills` -> `SkillsScene` (exists) - desenha só a trilha cujo `class` é o do jogador
5. `POST /api/me/battle/commands` -> `battle` (exists) - comando com `skill` só entra se o id está em `player.skills`
6. out: `player.skills` e os eventos do turno

## Relations

None - no stored-data shape change. `PlayerSkill` continua uma linha por nó desbloqueado, com o índice único que o plano de skills já gravou. O id deixa de ser chave estrangeira, como hoje, porque o catálogo não está no banco.

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `POST /api/me/skills/{id}/unlock` | - | `player` · `{error}` | `200`, `401`, `404`, `409`, `422`, `500` |
| `GET /api/catalog` (changed) | `If-None-Match` | `skillTrees` gains `class` and `role`; nodes replaced | `200`, `304` |
| `POST /api/me/battle/commands` (changed) | `command` | `battle`, `player`, `events` · `{error}` | `200`, `401`, `404`, `409`, `422`, `500` |
| `GET /api/me` (changed only by the migration; same for every route returning `player`) | cookie `ds_session` | `player.skills` loses the old ids | `200`, `401`, `404`, `500` |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. quatro trilhas, uma por classe | `skills.json` `trees[]` com `id`, `name`, `class`, `role`, `nodes` (3); `class` é exatamente `FRONTEND`, `BACKEND`, `DEVOPS` ou `FULLSTACK`, um por trilha; ids de nó `fe1`–`fe3`, `be1`–`be3`, `do1`–`do3`, `fs1`–`fs3` | uma trilha só com um campo de papel em cada nó - o jogador continuaria comprando o nó de outra classe, que é o que esta mudança existe para impedir; FULLSTACK desbloquear as outras três - a classe vira estritamente melhor e a escolha no onboarding deixa de importar |
| 2. código novo | `skill_wrong_class` `409`, mensagem `essa habilidade é de outra classe` | reusar `skill_locked` - a mensagem diria que falta o nó anterior, e isso é falso |
| 3. migração dos desbloqueios antigos | Up: para cada jogador, `hp_bonus` = 10×(`f1`) + 10×(`b1`) + 15×(`i2`); `skill_points` += quantidade de linhas; `hp_max` = max(1, `hp_max` − `hp_bonus`); `hp` = min(max(1, `hp` − `hp_bonus`), `hp_max`); depois apaga todas as linhas de `player_skills`. Down não reinsere linha | deixar as linhas - os ids saem do catálogo, o ponto fica gasto e o HP de `f1`/`b1`/`i2` fica para sempre; recalcular o HP máximo a partir do nível - gear e level-up também vivem nesse número |

- Nothing else in this change is hard to reverse
- A porta 1 passa desta feature: trocar de classe no futuro tem de devolver pontos e o HP gravado do mesmo jeito que a porta 3. Na confirmação deste plano isso vira uma linha em `.specs/STATE.md` (AD-018): a classe do onboarding é a única trilha que o jogador desbloqueia.

## Impact

| Front | What changes |
| --- | --- |
| domain | existing term: `class` deixa de ser cosmética e passa a escolher a trilha; quem lê hoje é o onboarding (`player.Classes`), `skills.Unlock` (ignora a classe) e `SkillsScene` (mostra as três trilhas) |
| domain | existing term: a trilha `infra` some; entram `devops` e `fullstack`. Os ids `f1`–`i3` somem de `skills.json`, de `combat.json` (`skill`) e do mapa de efeito em `battleFx` |
| domain | new term: `role` - o rótulo da trilha (`SUPORTE`, `ATAQUE`, `DEFESA`, `HÍBRIDO`), servido no catálogo e só exibido; o combate não lê esse campo |
| stored data | migração da porta 3 sobre as linhas que já existem; jogador sem skill não muda; não há tabela nova |
| screen | `/skills` passa de 3 colunas para a trilha da classe; o Bug Fight deixa de oferecer `f1`–`i3` e passa a oferecer o comando do nó desbloqueado |
| code | `player.Bonus` não ganha tipo novo; o comentário que chama a classe de cosmética deixa de valer |
