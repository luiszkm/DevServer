# Notebook checks

Profile: standard
Plan: `.specs/features/notebook/plan.md`

44 checks in 5 slices · 6 one-way doors · 0 open

## Checks

### S1 - O notebook existe e sobe de nível · ~16 files · ~230 KB · ~58k

**C1** - `GET /api/catalog` `notebook` tem `rarities` `basico`/`BÁSICO`/1, `raro`/`RARO`/4/`laptop_raro`, `epico`/`ÉPICO`/7/`laptop_epico`, `lendario`/`LENDÁRIO`/10/`laptop_lendario` (sem `look` no básico); `levels` com os 10 `{cost, dmg, hp}` da tabela do plano (`cost` null no Nv 1, Nv 10 = 1200 coins, 10, 50); e os 4 `upgrades` com `id`, `name`, `description`, `bonus` e os 3 `{minLevel, cost, amount}` da tabela, por valor (NOTE-01, AC 1)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_Notebook$'`

**C2** - Um dev recém-criado lê em `POST /api/players` e em `GET /api/me` `notebook` = `{"level":1,"rarity":"basico","upgrades":{"cpu_turbo":0,"bateria":0,"ssd_nvme":0,"rede_5g":0}}` (NOTE-01, AC 2, AC 3)
Proof: `cd api && go test ./internal/notebook -run 'TestMe_NotebookDefaults'`

**C3** - Um jogador gravado na migration 14, com HP 80/120, lê depois da migration 15 `notebook.level` 1, `rarity` `basico`, todos os upgrades 0 e HP 80/120 (NOTE-01, AC 3)
Proof: `cd api && go test ./internal/notebook -run 'TestMigration_NotebookExistingPlayers'`

**C4** - A raridade do nível é `basico` em 1 e 3, `raro` em 4 e 6, `epico` em 7 e 9, `lendario` em 10, e `lendario` em 12 (acima do catálogo) (NOTE-01, AC 4, AC 9)
Proof: `cd api && go test ./internal/catalog -run 'TestNotebookRarity_Bands'`

**C5** - `POST /api/me/notebook/enhance` no Nv 1 com 1000 coins e HP 90/100 responde `200` com `notebook.level` 2, `rarity` `basico`, coins 900, HP 95/105; no Nv 3 → 4 responde `rarity` `raro`, coins −250, HP +5/+5 (NOTE-01, AC 5)
Proof: `cd api && go test ./internal/notebook -run 'TestEnhance_PaysLevelsAndHP'`

**C6** - No Nv 3, coins 250 pagam e sobem para o Nv 4 com coins 0; coins 249 respondem `409` `not_enough_coins` e o jogador lido depois tem Nv 3, coins 249 e o mesmo HP (NOTE-01, AC 5, AC 7)
Proof: `cd api && go test ./internal/notebook -run 'TestEnhance_BalanceBoundary'`

**C7** - No Nv 10 com coins 0, `enhance` responde `409` `notebook_max_level` `o notebook já está no nível máximo` (não `not_enough_coins`) e nada muda (NOTE-01, AC 6)
Proof: `cd api && go test ./internal/notebook -run 'TestEnhance_MaxLevelBeforeCoins'`

**C8** - `UPDATE players SET notebook_level = 0` falha com violação de `CHECK`; `DEFAULT` é 1 num `INSERT` sem a coluna (NOTE-01, AC 8)
Proof: `cd api && go test ./internal/notebook -run 'TestTables_NotebookConstraints'`

**C9** - Com `notebook_level` gravado 12, `GET /api/me` lê `level` 12 e `rarity` `lendario`, `player.Bonus` dá `dmg` 10 e `hp` 50 (as do Nv 10), e `enhance` responde `409` `notebook_max_level` (NOTE-01, AC 9)
Proof: `cd api && go test ./internal/notebook -run 'TestNotebook_LevelAboveCatalog'`

**C10** - `player.Bonus` soma do notebook: Nv 1 sem upgrades → `dmg` 0, `hp` 0; Nv 4 → `dmg` 3, `hp` 15; Nv 10 → `dmg` 10, `hp` 50; Nv 4 com `cpu_turbo` 2, `bateria` 1, `ssd_nvme` 3, `rede_5g` 1 → `dmg` 7, `hp` 25, `sp` 15, `spregen` 1; `bateria` 5 (acima de 3) → `hp` +30; upgrade `sumiu` 2 → nada; junto de um MACBOOK PRO em `acessorio` (`dmg` 8) o `dmg` do Nv 4 é 11 (NOTE-01, NOTE-02, AC 10, AC 21, AC 22)
Proof: `cd api && go test ./internal/player -run 'TestBonus_Notebook'`

**C11** - Com `ssd_nvme` Nv 1, `POST /api/me/battle` na vila contra `slime` (SP 40) começa com `spMax` 45; com `cpu_turbo` Nv 3 e Rand fixo, FIX tira do inimigo o dano base × 1,06 arredondado como a regra de `DamageBonus` (NOTE-01, NOTE-02, AC 10, AC 22)
Proof: `cd api && go test ./internal/battle -run 'TestStart_NotebookBonus'`

**C12** - `enhance` e `upgrades/cpu_turbo` sem sessão respondem `401` `unauthenticated`; com sessão sem jogador, `404` `player_not_found`; depois de `DROP TABLE player_notebook_upgrades`, `enhance`, `upgrades/cpu_turbo` e `GET /api/me` respondem `500` `internal`, e as coins gravadas não mudam (NOTE-01, NOTE-02, AC 5, AC 18)
Proof: `cd api && go test ./internal/httpx -run 'TestAuthMiddleware_RejectsEveryProtectedRoute'`
Proof: `cd api && go test ./internal/notebook -run 'TestNotebookRoutes_NoPlayer'`
Proof: `cd api && go test ./internal/notebook -run 'TestNotebook_LoadFailure'`

**C13** - Dentro de uma transação que trava a linha e grava coins 100, um `enhance` concorrente no Nv 1 espera, lê coins 100, sobe para o Nv 2 e termina com coins 0; com coins para um nível só, dois `enhance` simultâneos dão um `200` e um `409` `not_enough_coins` (NOTE-01, AC 5)
Proof: `cd api && go test ./internal/notebook -run 'TestEnhance_ConcurrentSerialize'`

**C14** - `/notebook` com Nv 4, `cpu_turbo` 1, `bateria` 2, `ssd_nvme` 0, `rede_5g` 1 mostra `img` `/art/sprite/notebook-raro.png`, `NOTEBOOK RARO`, `NÍVEL 4/10` com a barra em `aria-valuenow` 4 de `aria-valuemax` 10, e as linhas nesta ordem: `PODER +5%`, `VIDA +35`, `SP +0`, `REGEN SP +1` (NOTE-01, AC 11)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "shows the notebook at its level"`

**C15** - No Nv 3 o botão diz `APRIMORAR · 250c`; o clique faz um `POST /api/me/notebook/enhance` sem corpo, e o `player` da resposta (Nv 4) aparece na tela (`NOTEBOOK RARO`); enquanto a resposta não chega, o botão e os de upgrade estão desabilitados, e um segundo clique não faz outro `POST` (NOTE-01, AC 12)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "APRIMORAR sends the intent and renders the answer"`
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "buttons wait for the pending answer"`

**C16** - No Nv 10 aparece `NÍVEL MÁXIMO` e não existe botão `APRIMORAR` (NOTE-01, AC 13)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "max level has no APRIMORAR"`

**C17** - No Nv 3 com coins 249 o botão está desabilitado e diz `COINS INSUFICIENTES`; com coins 250 está habilitado e diz `APRIMORAR · 250c` (NOTE-01, AC 14)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "APRIMORAR needs the coins"`

**C18** - Resposta `409` `notebook_max_level` com message `o notebook já está no nível máximo` mostra esse texto na faixa de mensagem da cena e não troca o `player`; uma rede que rejeita mostra `falha na conexão. tente de novo.` (NOTE-01, AC 15)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "errors show the api message"`

**C19** - A ficha do AVATAR tem um link `NOTEBOOK` com `href` `/notebook` contendo `img` `/art/sprite/notebook-epico.png`, `ÉPICO` e `NV 7` para um jogador no Nv 7 (NOTE-01, AC 16)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "notebook card links to the notebook"`

**C20** - `totalBonus` e `notebookBonus` do web somam como `player.Bonus`: Nv 4 com `cpu_turbo` 2 → `dmg` 7; Nv 12 → `dmg` 10; `bateria` 5 → `hp` 30; upgrade fora do catálogo → 0; e a ficha do AVATAR com Nv 4 e `ssd_nvme` 1 lê `dano +3%` e `SP +5` (NOTE-01, AC 11, AC 17)
Proof: `cd web && npx vitest run src/lib/notebook.test.tsx -t "notebookBonus mirrors the api"`
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "ficha totals include the notebook"`

**C21** - No browser, um dev novo abre AVATAR, clica em `NOTEBOOK`, cai em `/notebook` com `NOTEBOOK BÁSICO` e `NÍVEL 1/10`, aperta APRIMORAR três vezes e lê `NOTEBOOK RARO` e `NÍVEL 4/10`; depois de um reload continua `NÍVEL 4/10` (NOTE-01, AC 11, AC 12, AC 16)
Proof: `cd web && npx playwright test e2e/notebook.spec.ts -g "enhance to raro persists"`

### S2 - Upgrades · ~6 files · ~90 KB · ~22k

**C22** - `POST /api/me/notebook/upgrades/cpu_turbo` com Nv 1 e 1000 coins responde `200` com `upgrades.cpu_turbo` 1 e coins 700; `bateria` 0 → 1 com HP 90/100 leva a HP 100/110, e 1 → 2 (notebook Nv 4) a HP 110/120 com coins −400 (NOTE-02, AC 18)
Proof: `cd api && go test ./internal/notebook -run 'TestUpgrade_PaysAndLevels'`

**C23** - `upgrades/{id}` recusa sem mudar nada, nesta ordem: `nao_existe` com sessão sem jogador → `422` `unknown_upgrade` `upgrade desconhecido`; `cpu_turbo` Nv 3 com notebook Nv 1 e coins 0 → `409` `upgrade_max_level` `o upgrade já está no nível máximo`; `cpu_turbo` Nv 1 com notebook Nv 3 e coins 0 → `409` `notebook_level_too_low` `aprimore o notebook para liberar este nível`; `cpu_turbo` Nv 1 com notebook Nv 4 e coins 499 → `409` `not_enough_coins`; a 500 coins paga (NOTE-02, AC 19)
Proof: `cd api && go test ./internal/notebook -run 'TestUpgrade_ValidationOrder'`
Proof: `cd api && go test ./internal/notebook -run 'TestUpgrade_Boundaries'`

**C24** - O Nv 3 de `rede_5g` fica trancado com notebook Nv 6 (`409` `notebook_level_too_low`) e abre com notebook Nv 7 (`200`, `rede_5g` 3) (NOTE-02, AC 19)
Proof: `cd api && go test ./internal/notebook -run 'TestUpgrade_Boundaries'`

**C25** - Em `player_notebook_upgrades`, `level` 0 falha com violação de `CHECK`, um segundo registro do mesmo (jogador, upgrade) falha com violação de chave primária, e apagar o jogador apaga os registros (NOTE-02, AC 20)
Proof: `cd api && go test ./internal/notebook -run 'TestTables_NotebookConstraints'`

**C26** - Com os registros `sumiu` Nv 2 e `bateria` Nv 5 gravados, `GET /api/me` lê `upgrades` só com as 4 chaves do catálogo e `bateria` 5; `upgrades/bateria` responde `409` `upgrade_max_level` (NOTE-02, AC 21)
Proof: `cd api && go test ./internal/notebook -run 'TestMe_NotebookSkipsUpgradesOutsideCatalog'`

**C27** - A cena lista 4 cartões na ordem `CPU TURBO`, `BATERIA ESTENDIDA`, `SSD NVME`, `CONECTIVIDADE 5G`, cada um com `img` `/art/icon/nbup-<id>.png`, a descrição do catálogo e `NV <k>/3`; com notebook Nv 7, `cpu_turbo` 1, `bateria` 0, `ssd_nvme` 2, `rede_5g` 1 os efeitos são `+2% → +4% DANO`, `+0 → +10 HP`, `+10 → +15 SP`, `+1 → +2 REGEN SP` e os botões `UPGRADE · 500c`, `UPGRADE · 250c`, `UPGRADE · 700c`, `UPGRADE · 350c` (NOTE-02, AC 23)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "upgrade cards follow the catalog"`

**C28** - Um upgrade no Nv 3 mostra `NV 3/3`, `NV MÁX.` e nenhum botão `UPGRADE` (NOTE-02, AC 24)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "maxed upgrade has no button"`

**C29** - `cpu_turbo` Nv 1 com notebook Nv 3 e coins 0 mostra o botão desabilitado com `REQUER NOTEBOOK NV 4` (não `COINS INSUFICIENTES`); com notebook Nv 4 e coins 499, desabilitado com `COINS INSUFICIENTES`; com 500, habilitado (NOTE-02, AC 25)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "locked upgrade names the level it needs"`

**C30** - Clicar em `UPGRADE` da CPU TURBO faz `POST /api/me/notebook/upgrades/cpu_turbo` sem corpo e renderiza o `player` da resposta; uma resposta `409` `notebook_level_too_low` mostra `aprimore o notebook para liberar este nível` na faixa; durante a chamada todos os botões da cena estão desabilitados (NOTE-02, AC 26)
Proof: `cd web && npx vitest run src/components/NotebookScene.test.tsx -t "upgrade sends the intent"`

**C31** - No browser, um dev novo compra CPU TURBO em `/notebook`, lê `NV 1/3` e `REQUER NOTEBOOK NV 4` no mesmo cartão, e o HUD mostra coins −300 (NOTE-02, AC 18, AC 25)
Proof: `cd web && npx playwright test e2e/notebook.spec.ts -g "upgrade then locked"`

### S3 - O slot de gear `notebook` sai · ~10 files · ~150 KB · ~38k

**C32** - `gearSlots` é exatamente `cabeca`, `oculos`, `brinco`, `colar`, `torso`, `cinto`, `pernas`, `pe`, `maos`, `acessorio`, `bebida`; MACBOOK PRO e MONITOR ULTRAWIDE têm `slot` `acessorio` e nenhum `look` (NOTE-03, AC 27)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_GearSlots'`
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_NotebookGearMoved'`

**C33** - `player.equipment` de um dev novo tem exatamente as 11 chaves de `gearSlots`, sem `notebook`; `POST /api/me/gear/macbook/equip` depois de comprar grava em `acessorio` (NOTE-03, AC 28)
Proof: `cd api && go test ./internal/shop -run 'TestEquip_NotebookGearGoesToAcessorio'`

**C34** - Um jogador gravado na migration 14 com MACBOOK PRO no slot `notebook`, `acessorio` vazio e HP 70/100 lê depois da migration 15 `equipment.acessorio` `macbook`, sem chave `notebook`, e HP 70/100 (NOTE-03, AC 29)
Proof: `cd api && go test ./internal/notebook -run 'TestMigration_NotebookSlotMoves'`

**C35** - Um jogador com MONITOR ULTRAWIDE no slot `notebook` e FONE COM CANCELAMENTO em `acessorio` lê depois da migration 15 `equipment.acessorio` `fone`, `monitor` em `gear` e em nenhum slot (NOTE-03, AC 30)
Proof: `cd api && go test ./internal/notebook -run 'TestMigration_NotebookSlotMoves'`

**C36** - A parte `laptop` do avatar não tem `gearSlot`; a opção `laptop_macbook` não existe; `laptop_raro`, `laptop_epico`, `laptop_lendario` existem com `part` `laptop`, `layer` `laptop-raro`/`laptop-epico`/`laptop-lendario`, `fixed` e `gearOnly`; `PUT /api/me/appearance` com `laptop` = `laptop_raro` responde `422` `gear_only` (NOTE-03, AC 31)
Proof: `cd api && go test ./internal/catalog -run 'TestCatalog_LaptopRarityOptions'`
Proof: `cd api && go test ./internal/avatar -run 'TestUpdate_RarityLaptopIsGearOnly'`

**C37** - Na ficha do AVATAR as linhas de slot seguem `gearSlots` (11, sem `NOTEBOOK`), o MACBOOK PRO equipado aparece na linha `ACESSÓRIO`, e o editor não lista `laptop_raro`, `laptop_epico` nem `laptop_lendario` entre as opções de NOTEBOOK (NOTE-03, AC 27, AC 31)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "slots follow the catalog without notebook"`

### S4 - O laptop do herói segue a raridade · ~42 files · ~120 KB · ~30k

**C38** - `resolveLook` com `laptop_gamer` escolhido dá, na parte `laptop`: raridade `basico` → `laptop_gamer` por `player`; `raro` → `laptop_raro` por `notebook`; `epico` → `laptop_epico` por `notebook`; `lendario` → `laptop_lendario` por `notebook`; raridade desconhecida → `laptop_gamer` por `player`; no corpo `feminino` com `raro` o layer é `/art/sprite/hero/laptop-raro-f.png` (NOTE-04, AC 32, AC 33)
Proof: `cd web && npx vitest run src/lib/avatar.test.tsx -t "laptop follows the notebook rarity"`

**C39** - `HeroAvatar` com `anim` `walk` e raridade `lendario` desenha `/art/sprite/hero/anim/laptop-lendario-walk.png`; o HUD de um jogador Nv 4 desenha um layer `laptop-raro` (NOTE-04, AC 33)
Proof: `cd web && npx vitest run src/components/HeroAvatar.test.tsx -t "rarity laptop in every animation"`
Proof: `cd web && npx vitest run src/components/Hud.test.tsx -t "hero holds the rarity laptop"`

**C40** - No editor do AVATAR, com o notebook Nv 7, a parte NOTEBOOK mostra `definido pelo notebook`; no Nv 3 não mostra (NOTE-04, AC 33)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "laptop part is set by the notebook"`

**C41** - Existem os 44 PNGs com seus specs: `sprite/notebook-{basico,raro,epico,lendario}`, `icon/nbup-{cpu_turbo,bateria,ssd_nvme,rede_5g}`, `sprite/hero/laptop-{raro,epico,lendario}{,-f}` e `sprite/hero/anim/laptop-{raro,epico,lendario}{,-f}-{idle,walk,run,jump,interact}`; nenhum `laptop-macbook*` sobra em `web/art` nem em `web/public/art`; `make art-check` termina 0 (NOTE-04, AC 11, AC 23, AC 33)
Proof: `cd web && npx vitest run src/lib/notebook-art.test.tsx -t "notebook art files exist"`
Proof: `make art-check`

### S5 - Layout · ~2 files · ~55 KB · ~14k

**C42** - A 390px de largura, em `/notebook`, `documentElement.scrollWidth` <= `innerWidth`, o topo do primeiro cartão de upgrade fica abaixo do fundo do painel do notebook e os 4 cartões têm a mesma `x`; o mesmo vale com a faixa de erro visível depois de um `409` (NOTE-05, AC 34)
Proof: `cd web && npx playwright test e2e/notebook.spec.ts -g "notebook fits phone"`

**C43** - A 1280px o painel do notebook e a lista de upgrades ficam lado a lado (mesmo `top`, `x` do painel menor) (NOTE-05, AC 34)
Proof: `cd web && npx playwright test e2e/notebook.spec.ts -g "notebook desktop arrangement"`

**C44** - `make ci-build` termina 0 com `next build` tipando a rota `/notebook` e o `switch` sobre `LookSource` exaustivo (NOTE-01..05)
Proof: `make ci-build`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| rarity bands (8) | 1 C4 · 3 C4 · 4 C4 · 6 C4 · 7 C4 · 9 C4 · 10 C4 · 12 C4 | - |
| catalog `notebook` sections (3) | `rarities` C1 · `levels` C1 · `upgrades` C1 | - |
| upgrades (4) | `cpu_turbo` C10 · `bateria` C10 · `ssd_nvme` C10 · `rede_5g` C10 | - |
| `Bonus` notebook rows (6) | nível C10 · upgrade no nível C10 · Nv 0 C10 · nível acima do catálogo C9 · upgrade acima de 3 C10 · upgrade fora do catálogo C10 | - |
| `Bonus` consumers (2) | `battle` sp C11 · `battle` dmg C11 | - |
| `POST /api/me/notebook/enhance` statuses (5) | `200` C5 · `401` C12 · `404` C12 · `409` C7 · `500` C12 | - |
| `enhance` decision (4) | sobe C5 · coins = custo C6 · coins < custo C6 · Nv máximo C7 | - |
| `POST /api/me/notebook/upgrades/{id}` statuses (6) | `200` C22 · `401` C12 · `404` C12 · `409` C23 · `422` C23 · `500` C12 | - |
| `upgrades` `409` codes (3) | `upgrade_max_level` C23 · `notebook_level_too_low` C23 · `not_enough_coins` C23 | - |
| `upgrades` validation order (4 pairs) | id antes do jogador C23 · máximo antes do nível C23 · nível antes das coins C23 · coins no limite C23 | - |
| `minLevel` edges (4) | 3 → Nv 2 trancado C23 · 4 → Nv 2 aberto C23 · 6 → Nv 3 trancado C24 · 7 → Nv 3 aberto C24 | - |
| HP delta sources (2) | nível C5 · `bateria` C22 | - |
| `GET /api/catalog` statuses (1) | `200` C1 | - |
| `GET /api/me` statuses (3) | `200` C2 · `401` C12 · `500` C12 | - |
| screen `/notebook` states (8) | normal C14 · pendente C15 · nível máximo C16 · sem coins C17 · erro api C18 · erro rede C18 · upgrade máximo C28 · upgrade trancado C29 | - |
| upgrade card effect types (4) | `dmg` C27 · `hp` C27 · `sp` C27 · `spregen` C27 | - |
| upgrade button priority (3) | trancado vence coins C29 · só coins C29 · habilitado C29 | - |
| `resolveLook` laptop rows (6) | `basico` C38 · `raro` C38 · `epico` C38 · `lendario` C38 · desconhecida C38 · corpo feminino C38 | - |
| hero animations (5) | `idle` C41 · `walk` C39, C41 · `run` C41 · `jump` C41 · `interact` C41 (C41 é table-driven sobre as 5 × 3 raridades × 2 corpos) | - |
| art files (44) | C41, table-driven over all 44 | - |
| migration 15 equipment rows (3) | `acessorio` livre C34 · `acessorio` ocupado C35 · jogador sem slot `notebook` C3 | - |
| Landing doors (6) | nível no jogador C8 · tabela de upgrades C25 · slot removido C34 · `Bonus` C10 · contrato do catálogo C1 · fonte de look C38 | - |
| entities (3) | `players` (nível) C5 · `player_notebook_upgrades` C22 · `player_equipment` C34 | - |
| layout widths (2) | 390px C42 · 1280px C43 | - |
| startup config (1 shared assembly) | `app.NewRouter` em `cmd/api` e em `apptest` C5; `catalog.Default()` embutido em ambos C1 | - |

- Claims naming a status code or response shape go through `app.NewRouter`: C2, C5–C7, C9, C12, C13, C22–C26, C33, C36
- Screen claims assert rendered text, `href`, `src` and order; CSS-decided layout is C42–C43 in Playwright; the browser path is C21 and C31

## Test policy

Same rows as `AGENTS.md` `## Test policy`.

Evidence:

- `notebook` handlers `Enhance`: máximo, coins, sobe; 3 ramos, atravessado em `POST /api/me/notebook/enhance` -> decide; fronteira C5–C7, C9, C12, C13 (a regra vive no handler, como `rack.Buy`, então a camada própria é a mesma)
- `notebook` handlers `Upgrade`: id, máximo, `minLevel`, coins, delta de HP da `bateria`; 5 ramos -> decide; fronteira C22–C26
- `catalog` raridade do nível: tabela de 4 faixas + teto -> decide, camada própria C4, fronteira C2/C9
- `player.Bonus` + `notebookBonus`: nível, upgrade por nível, clamps, id fora do catálogo; 6 linhas -> decide, camada própria C10, fronteira C11
- `player` carga do notebook: pula upgrade fora do catálogo -> decide, C26
- web `notebookBonus` (espelho) -> decide, C20; `NotebookScene`: 8 estados + prioridade do botão -> decide, C14–C18, C27–C30; `resolveLook` laptop -> decide, C38
- `Tabs`/rota `/notebook` `page.tsx` -> instrumentation (uma linha que renderiza a cena), coberta por C21
- closest analogue: `rack` (`rack_test.go` prova compra, limite de saldo, concorrência, 401/404/500 e migration pelo HTTP), `skills.Upgrade` para nível 1..3 pago

Cost: ~30 testes Go em `internal/notebook`, `catalog`, `player`, `battle`, `shop`, `avatar`; ~20 testes vitest em 5 arquivos; 5 Playwright em `e2e/notebook.spec.ts`. Sem as linhas de camada própria, a tabela de raridade e o `Bonus` só seriam provados pelos caminhos que o HTTP calhou de percorrer.

## Swept

- validation: C23 (id desconhecido, ordem), C6 (limite de coins), C24 (`minLevel`), C36 (`gear_only`)
- failure modes: C12 - leitura de `player_notebook_upgrades` caída responde `500` sem cobrar; C18, C30 - a tela mostra a `message` e mantém o `player`
- idempotency: n/a - cada `POST` é a intenção "mais um nível", como `skills/{id}/upgrade`; um retry depois de uma resposta perdida sobe de novo e paga de novo, e a tela desabilita os botões durante a chamada (C15)
- authorization: C12 - `RequireSession` em `401`; cada rota só lê e grava o jogador da sessão (`WithLocked` pelo `GithubUserID`)
- concurrency: C13 - o waiter lê as coins gravadas pela transação que segurava a linha
- data lifecycle: C3 (jogadores existentes no Nv 1 sem backfill), C34, C35 (equipamento migrado), C25 (cascade na remoção), C9, C26 (catálogo que encolhe)
- dependency failure: n/a - sem serviço externo; a falha de query é o `500` de C12
- state transitions: C5 (Nv n → n+1, raridade muda em 4), C7 (Nv 10 terminal), C22 (upgrade k → k+1), C28 (Nv 3 terminal)
- observability: n/a - sem log novo; o `500` passa por `httpx.Handle`, que já registra o erro inesperado

## Handoff

- Leitura: api ~160 KB (catalog.go 21, catalog_test 55, player.go 20, rack como modelo 21, router/errors 13, migrations e testes novos ~30); web ~180 KB (AvatarScene + teste 46, helpers 31, globals.css 50, avatar.ts + teste 14, types/gear 11, cena nova + teste ~30); arte ~70 KB (44 specs de ~1–2 KB, mais o recorte da keyart). ~410 KB / 4 ≈ 100k, abaixo do budget de 150k: um builder, sem handoff. S4 (arte do herói) é a fatia mais separável se o orçamento estourar no meio
