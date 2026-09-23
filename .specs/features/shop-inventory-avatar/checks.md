# Shop, inventory and avatar checks

Profile: standard
Plan: `.specs/features/shop-inventory-avatar/plan.md`

47 checks in 7 slices · 10 one-way doors · 0 open

## Checks

### S1 - Catálogo e forma do jogador · ~6 files · ~45 KB · ~11k

**C1** - `GET /api/catalog` serve os 6 equipamentos com `slot`, `rarity`, `price` e `bonus` do plano (macbook setup RARO 120 gems dmg 8 · monitor setup LENDÁRIO 200 gems sp 20 · cafe bebida COMUM 50 coins sp 12 · moletom vestuario COMUM 70 coins hp 15 · cadeira vestuario RARO 150 gems hp 30 · fone acessorio INCOMUM 90 gems dmg 6), as 4 skins (default 0 gems `bonus` nulo · neon 60 dmg 5 · shadow 80 sp 10 · golden 150 hp 20, cada uma com `filter` não vazio exceto `default` = `none`), os slots `setup` CONFIGURAÇÃO · `bebida` BEBIDA · `vestuario` VESTUÁRIO · `acessorio` ACESSÓRIO, e `price` `{gems, 15}` em `sp_potion`, `{gems, 12}` em `hp_potion` e `{gems, 35}` no novo `boost_deploy` ACELERADOR DE DEPLOY `>>` COMUM; `null_shard` sem `price` (SHOP-01, AC 1; door 4)
Proof: `cd api && go test ./internal/catalog -run '^TestCatalog_ServesShop$'`

**C2** - Com `macbook`, `cafe` possuídos, `macbook` equipado, e skins `neon` possuída, `GET /api/me` devolve `gear` = `["macbook","cafe"]`, `equipment` = `{"setup":"macbook","bebida":null,"vestuario":null,"acessorio":null}` e `skins` = `["default","neon"]` (SHOP-01, AC 2; door 7)
Proof: `cd api && go test ./internal/shop -run '^TestMe_ShopFields$'`

**C3** - `POST /api/players` responde com `gear` = `[]`, as 4 chaves de `equipment` = `null`, `skins` = `["default"]` e `skin` = `default` (SHOP-01, AC 3)
Proof: `cd api && go test ./internal/shop -run '^TestCreatePlayer_ShopDefaults$'`

### S2 - Comprar na loja · ~4 files · ~30 KB · ~8k

**C4** - Com 20 gems e 2 POÇÕES DE CACHE, `POST /api/me/shop/items/sp_potion` responde `200` com gems 5 e `sp_potion` 3; com 12 gems, `hp_potion` deixa gems 0 e `hp_potion` 1; com 35 gems, `boost_deploy` deixa gems 0 e `boost_deploy` 1 (SHOP-02, AC 4)
Proof: `cd api && go test ./internal/shop -run '^TestBuyItem_PaysAndAdds$'`

**C5** - Com 100 coins, `POST /api/me/shop/gear/cafe` responde `200` com coins 50, `gear` = `["cafe"]` e `equipment.bebida` = `cafe`; com `macbook` equipado e 200 gems, comprar `monitor` deixa gems 0, `gear` = `["macbook","monitor"]` e `equipment.setup` = `monitor` (SHOP-02, AC 5)
Proof: `cd api && go test ./internal/shop -run '^TestBuyGear_PaysOwnsEquips$'`

**C6** - Com 60 gems, `POST /api/me/shop/skins/neon` responde `200` com gems 0, `skins` = `["default","neon"]` e `skin` = `neon` (SHOP-02, AC 6)
Proof: `cd api && go test ./internal/shop -run '^TestBuySkin_PaysOwnsWears$'`

**C7** - Com 14 gems, `sp_potion` responde `409 not_enough_gems` e nada muda; com 15 gems paga e deixa 0; com 49 coins, `cafe` responde `409 not_enough_coins` e nada muda; com 50 coins paga; com 119 gems, `macbook` responde `409 not_enough_gems`; com 59 gems, `neon` responde `409 not_enough_gems`; com um catálogo de teste em que `hp_potion` custa 10 coins, 9 coins responde `409 not_enough_coins` e 10 paga (SHOP-02, AC 7)
Proof: `cd api && go test ./internal/shop -run '^TestBuy_BalanceBoundary$'`

**C8** - Comprar de novo `cafe` possuído e `neon` possuída responde `409 already_owned` sem mudar saldo, posse ou equipamento; comprar `default` responde `409 already_owned` (SHOP-02, AC 8)
Proof: `cd api && go test ./internal/shop -run '^TestBuy_AlreadyOwned$'`

**C9** - `shop/items/x` responde `422 unknown_item`, `shop/gear/x` `422 unknown_gear`, `shop/skins/x` `422 unknown_skin` (SHOP-02, AC 9)
Proof: `cd api && go test ./internal/shop -run '^TestBuy_Unknown$'`

**C10** - `POST /api/me/shop/items/null_shard` responde `422 not_for_sale` sem mudar saldo (SHOP-02, AC 10)
Proof: `cd api && go test ./internal/shop -run '^TestBuyItem_NotForSale$'`

### S3 - Equipar, remover e vestir · ~5 files · ~50 KB · ~12k

**C11** - Com `macbook` e `monitor` possuídos e `monitor` equipado, `POST /api/me/gear/macbook/equip` responde `200` com `equipment.setup` = `macbook`; repetir responde `200` com o mesmo `player` (SHOP-03, AC 11)
Proof: `cd api && go test ./internal/shop -run '^TestEquipGear_ReplacesSlot$'`

**C12** - Com `cafe` equipado, `POST /api/me/gear/cafe/unequip` responde `200` com `equipment.bebida` = `null` e `gear` ainda com `cafe`; repetir responde `200` sem mudança (SHOP-03, AC 12)
Proof: `cd api && go test ./internal/shop -run '^TestUnequipGear_ClearsSlot$'`

**C13** - Com `neon` possuída e vestida, `POST /api/me/skins/default/equip` responde `200` com `skin` = `default`, e `skins/neon/equip` volta a `neon` (SHOP-03, AC 13)
Proof: `cd api && go test ./internal/shop -run '^TestEquipSkin_Wears$'`

**C14** - `gear/macbook/equip` sem possuir responde `409 not_owned`, `skins/golden/equip` sem possuir `409 not_owned`; `gear/x/equip`, `gear/x/unequip` respondem `422 unknown_gear` e `skins/x/equip` `422 unknown_skin` (SHOP-03, AC 14)
Proof: `cd api && go test ./internal/shop -run '^TestEquip_NotOwnedOrUnknown$'`

**C15** - Com HP 100/100: comprar `moletom` dá 115/115; comprar `cadeira` (troca no vestuário) dá 130/130; `cadeira/unequip` dá 100/100; com HP 10/130 e `cadeira` equipada, `unequip` dá 1/100; comprar `golden` dá 120/120 e vestir `neon` volta a 100/100 (SHOP-03, AC 15; door 5)
Proof: `cd api && go test ./internal/shop -run '^TestHPBonus_EquipAndRemove$'`

**C16** - Na vila (SP 50) com skill `f2`, `cafe` equipado, `monitor` possuído e não equipado e skin `shadow`, `POST /api/me/battle` cria o combate com SP 80/80 (SHOP-03, AC 16; door 6)
Proof: `cd api && go test ./internal/battle -run '^TestStart_SPMaxIncludesGearAndSkin$'`

**C17** - Com `macbook` e `fone` equipados e skin `neon`, FIX com sorteio 6 causa 24 de dano; com `fone` removido (ainda possuído), 23 (SHOP-03, AC 17; door 6)
Proof: `cd api && go test ./internal/battle -run '^TestCommand_DamageBonusFromGearAndSkin$'`

**C18** - `player.Bonus` soma por tipo: só skills `f3` dmg 10; só `macbook` equipado dmg 8; só skin `neon` dmg 5; `f2` + `cafe` + `shadow` sp 30; `moletom` + `golden` + `f1` hp 45; equipamento possuído e não equipado soma 0; skin `default` soma 0 (SHOP-03, AC 15–17; door 6)
Proof: `cd api && go test ./internal/player -run '^TestBonus_SumsSources$'`

### S4 - Descartar e acelerar · ~4 files · ~30 KB · ~8k

**C19** - Com `sp_potion` 2, `POST /api/me/items/sp_potion/discard` responde `200` com `sp_potion` 1; com `null_shard` 1, descartar deixa `null_shard` fora de `inventory` (SHOP-04, AC 18)
Proof: `cd api && go test ./internal/shop -run '^TestDiscard_RemovesOne$'`

**C20** - `items/x/discard` responde `422 unknown_item`; `items/hp_potion/discard` com 0 responde `409 no_item` (SHOP-04, AC 19)
Proof: `cd api && go test ./internal/shop -run '^TestDiscard_Rejects$'`

**C21** - Deploy NV.2 (30 min) iniciado em T e acelerado em T responde `200` com `deploy.endsAt` = T+15min, `ready` false, `boost_deploy` 1 -> 0 e `serverTime`; deploy NV.1 (15 min) iniciado em T e acelerado em T+5min fica com `endsAt` = T+5min e `ready` true (SHOP-04, AC 20; door 8)
Proof: `cd api && go test ./internal/shop -run '^TestBoost_CutsFifteenMinutes$'`

**C22** - Sem deploy `backend`: `deploys/backend/boost` responde `404 deploy_not_found`; com deploy pronto `409 deploy_ready`; sem acelerador `409 no_item`; `deploys/x/boost` `422 unknown_deploy_type`; em todos `boost_deploy` e `endsAt` não mudam (SHOP-04, AC 21)
Proof: `cd api && go test ./internal/shop -run '^TestBoost_Rejects$'`

### Cross-cutting api · ~3 files · ~20 KB · ~5k

**C23** - Sem sessão, as 8 rotas novas (`shop/items`, `shop/gear`, `shop/skins`, `gear/equip`, `gear/unequip`, `skins/equip`, `items/discard`, `deploys/{type}/boost`) respondem `401 unauthenticated` (SHOP-02..04)
Proof: `cd api && go test ./internal/shop -run '^TestShopRoutes_RequireSession$'`

**C24** - Com `player_gear` indisponível, `GET /api/me` e as 8 rotas novas respondem `500 internal`, o log traz o `request_id` e a causa `player_gear`, e o jogador não muda (SHOP-01..04; AD-005)
Proof: `cd api && go test ./internal/shop -run '^TestShop_LoadFailure$'`

**C25** - Com 15 gems, duas compras simultâneas de `sp_potion` terminam com um `200` e um `409 not_enough_gems`, gems 0 e `sp_potion` 3 (SHOP-02, AC 7; AD-004)
Proof: `cd api && go test ./internal/shop -run '^TestBuy_ConcurrentSerialize$'`

**C26** - O banco recusa: segunda linha `player_gear` do mesmo jogador e equipamento; segunda linha `player_equipment` no mesmo slot; `player_equipment` de um equipamento que o jogador não possui; segunda linha `player_skins` da mesma skin (door 1, door 2, door 3)
Proof: `cd api && go test ./internal/shop -run '^TestTables_ShopConstraints$'`

**C27** - Cada um dos 8 códigos novos (`not_enough_gems`, `not_enough_coins`, `already_owned`, `not_for_sale`, `unknown_gear`, `unknown_skin`, `not_owned`, `deploy_ready`) chega como `{"error":{"code":"<código>","message":"<não vazio>"}}` (door 10; AD-005)
Proof: `cd api && go test ./internal/shop -run '^TestShop_ErrorCodes$'`

### S5 - Tela LOJA · ~4 files · ~35 KB · ~9k

**C28** - `/loja` exibe `LOJA DEVSERVER`, `GEMS: 20`, e as seções `POÇÕES` (POÇÃO DE CACHE `possui: 2` `15g`, POÇÃO DE MEMÓRIA `possui: 0` `12g`, ACELERADOR DE DEPLOY `possui: 0` `35g`), `EQUIPAMENTOS DO DEV` com os 6 na ordem do catálogo e `SKINS DO AVATAR` com as 4; sem `EM BREVE` (SHOP-05, AC 22)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "shows the three sections"`

**C29** - Com `macbook` equipado, `moletom` possuído, `neon` vestida e `shadow` possuída, os cartões exibem `+8% DMG` `EQUIPADO`, `+15 HP` `NO INVENTÁRIO`, `+20 SP` `200g`, `+12 SP` `50c`; skins `sem bônus` `NO GUARDA-ROUPA` (default), `+5% DMG` `EQUIPADA`, `+10 SP` `NO GUARDA-ROUPA`, `+20 HP` `150g` (SHOP-05, AC 23)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "cards show bonus and status"`

**C30** - O detalhe exibe nome, raridade, `RARO · CONFIGURAÇÃO` para `macbook`, `bônus: +8% de dano` e `custo: 120 GEMS` ou `já possui`, com o botão: poção `COMPRAR`; `monitor` não possuído `COMPRAR E EQUIPAR`; `moletom` possuído `EQUIPAR`; `macbook` equipado `EQUIPADO` desabilitado e `REMOVER EQUIPAMENTO`; skin `golden` `COMPRAR E EQUIPAR`; `shadow` `EQUIPAR`; `neon` `EQUIPADA` desabilitado (SHOP-05, AC 24)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "detail button per state"`

**C31** - Com 14 gems a POÇÃO DE CACHE mostra `GEMS INSUFICIENTES` desabilitado; com 15, `COMPRAR` habilitado; com 49 coins o `cafe` mostra `COINS INSUFICIENTES` desabilitado; com 50, `COMPRAR E EQUIPAR` (SHOP-05, AC 25)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "insufficient balance"`

**C32** - Cada botão chama sua rota e mostra o aviso, repassando o `player` recebido: `COMPRAR` -> `POST /api/me/shop/items/sp_potion` `+1 POÇÃO DE CACHE`; `COMPRAR E EQUIPAR` equipamento -> `shop/gear/monitor` `ITEM COMPRADO E EQUIPADO`; skin -> `shop/skins/golden` `SKIN COMPRADA E EQUIPADA`; `EQUIPAR` -> `gear/moletom/equip` `ITEM EQUIPADO`; skin -> `skins/shadow/equip` `SKIN EQUIPADA`; `REMOVER EQUIPAMENTO` -> `gear/macbook/unequip` `ITEM REMOVIDO` (SHOP-05, AC 26)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "actions call their route"`

**C33** - Resposta `409` com `error.message` `gems insuficientes` exibe essa mensagem; `500` sem corpo e falha de rede exibem `falha na conexão. tente de novo.`; a loja continua na tela (SHOP-05, AC 27)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "action errors"`

**C34** - Com uma compra pendente, os botões do painel ficam desabilitados (SHOP-05, AC 28)
Proof: `cd web && npx vitest run src/components/ShopScene.test.tsx -t "pending disables panel"`

### S6 - Tela AVATAR com mochila · ~4 files · ~40 KB · ~10k

**C35** - Com skills `f2`, `f3`, `macbook`, `cafe` e `moletom` equipados, skin `shadow` e `hpMax` 125, `/avatar` exibe a prévia com o `filter` de `shadow`, `devName`, `DEV SOMBRIO`, `HP máx 125`, `dano +18%` e `SP +30`; sem `EM BREVE` (SHOP-06, AC 29)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "preview and totals"`

**C36** - Os slots aparecem à esquerda CONFIGURAÇÃO, VESTUÁRIO e à direita ACESSÓRIO, BEBIDA; `macbook` equipado exibe `[Mac]` e `MACBOOK PRO`; slot vazio exibe `[ ]` e o nome do slot (SHOP-06, AC 30)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "paper doll slots"`

**C37** - A faixa `SKINS` lista as 4; `golden` não possuída tem `aria-disabled` e o clique mostra `SKIN BLOQUEADA — COMPRE NA LOJA` sem chamar `fetch`; `neon` possuída chama `POST /api/me/skins/neon/equip` (SHOP-06, AC 31)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "skin strip"`

**C38** - As abas `EQUIP`, `POÇÕES`, `LOOT`, `SKINS` exibem as dicas `clique para equipar`, `use no Bug Fight`, `material de craft`, `clique para vestir`; EQUIP lista `macbook` com `EQUIP` e `moletom` com `roupa`; POÇÕES lista `sp_potion` `x2`, `hp_potion` `x1`, `boost_deploy` `x1`; LOOT lista `null_shard` `x3`; SKINS lista `default` e `shadow` com `EM USO` (SHOP-06, AC 32)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "bag tabs"`

**C39** - No detalhe: `moletom` mostra `EQUIPAR` -> `gear/moletom/equip`; `macbook` mostra `REMOVER` -> `gear/macbook/unequip`; skin `default` mostra `VESTIR` -> `skins/default/equip`; `shadow` mostra `EM USO` desabilitado; `null_shard` mostra `quantidade: 3` e `DESCARTAR 1` -> `POST /api/me/items/null_shard/discard`; cada `200` repassa o `player` (SHOP-06, AC 33, AC 35)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "bag detail actions"`

**C40** - Sem equipamentos, a aba EQUIP exibe `MOCHILA VAZIA` e `nada nesta aba ainda — derrote bugs e compre na Loja.` (SHOP-06, AC 34)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "empty bag"`

**C41** - No AVATAR, `409` exibe a `error.message`; sem corpo e rede exibem `falha na conexão. tente de novo.`; com ação pendente os botões do detalhe ficam desabilitados (SHOP-06, AC 35)
Proof: `cd web && npx vitest run src/components/AvatarScene.test.tsx -t "avatar errors and pending"`

### S7 - Acelerador no deploy e skin no combate · ~4 files · ~40 KB · ~10k

**C42** - Com deploy de 30 min em andamento e 1 acelerador, o cartão exibe `ACELERAR (-15min) · 1 disponíveis`, que chama `POST /api/me/deploys/backend/boost`; com 0, `SEM ACELERADORES · veja a Loja` desabilitado; deploy pronto não exibe o botão (SHOP-07, AC 36)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "boost button"`

**C43** - Com `29:00 restante`, o acelerador respondendo `endsAt` 15 min antes faz o cartão exibir `14:00 restante` e repassa o `player` recebido (SHOP-07, AC 37)
Proof: `cd web && npx vitest run src/components/DeployScene.test.tsx -t "boost updates remaining"`

**C44** - Com skin `neon`, o cartão `dev em combate` exibe o sprite `hero.png` com o `filter` de `neon`; com `default`, `filter` `none` (SHOP-07, AC 38; door 9)
Proof: `cd web && npx vitest run src/components/BattleScene.test.tsx -t "hero sprite wears skin"`

### Round trip · ~3 files · ~15 KB · ~4k

**C45** - No navegador, com 100 coins: comprar CAFÉ EXPRESSO em `/loja` mostra `ITEM COMPRADO E EQUIPADO`; em `/avatar`, depois de recarregar, a BEBIDA exibe `CAFÉ EXPRESSO` e o HUD mostra 50 coins (SHOP-05, SHOP-06)
Proof: `cd web && npx playwright test e2e/shop.spec.ts -g "buy and wear"`

**C46** - As 7 abas continuam `TÍTULO`, `MUNDO`, `DEPLOY`, `BUG FIGHT`, `SKILLS`, `LOJA`, `AVATAR` e nenhuma rota exibe `EM BREVE` (foundation AC 22, AC 24; plan Out of scope)
Proof: `cd web && npx vitest run src/components/ComingSoon.test.tsx -t "no scene shows EM BREVE"`
Proof: `cd web && npx vitest run src/components/Tabs.test.tsx -t "tab order and routes"`

**C47** - Migration 00005 cria `player_gear`, `player_equipment`, `player_skins` vazias sobre jogadores existentes, que continuam com `skin` = `default` e `GET /api/me` `200` com `skins` = `["default"]` (door 1–3; stored data)
Proof: `cd api && go test ./internal/shop -run '^TestMigration_ExistingPlayers$'`

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
- [ ] C45
- [x] C46
- [x] C47

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/me/shop/items/{id}` statuses (7) | 200 C4 · 401 C23 · 409 `not_enough_gems` C7 · 409 `not_enough_coins` C7 (catálogo de teste) · 422 `unknown_item` C9 · 422 `not_for_sale` C10 · 500 C24 | - |
| `POST /api/me/shop/gear/{id}` statuses (7) | 200 C5 · 401 C23 · 409 `not_enough_gems` C7 · 409 `not_enough_coins` C7 · 409 `already_owned` C8 · 422 `unknown_gear` C9 · 500 C24 | - |
| `POST /api/me/shop/skins/{id}` statuses (6) | 200 C6 · 401 C23 · 409 `not_enough_gems` C7 · 409 `already_owned` C8 · 422 `unknown_skin` C9 · 500 C24 | - |
| `POST /api/me/gear/{id}/equip` statuses (5) | 200 C11 · 401 C23 · 409 `not_owned` C14 · 422 `unknown_gear` C14 · 500 C24 | - |
| `POST /api/me/gear/{id}/unequip` statuses (4) | 200 C12 · 401 C23 · 422 `unknown_gear` C14 · 500 C24 | - |
| `POST /api/me/skins/{id}/equip` statuses (5) | 200 C13 · 401 C23 · 409 `not_owned` C14 · 422 `unknown_skin` C14 · 500 C24 | - |
| `POST /api/me/items/{id}/discard` statuses (5) | 200 C19 · 401 C23 · 409 `no_item` C20 · 422 `unknown_item` C20 · 500 C24 | - |
| `POST /api/me/deploys/{type}/boost` statuses (7) | 200 C21 · 401 C23 · 404 `deploy_not_found` C22 · 409 `deploy_ready` C22 · 409 `no_item` C22 · 422 `unknown_deploy_type` C22 · 500 C24 | - |
| `GET /api/me` statuses (4) | 200 C2 · 401 foundation C9 · 404 `player_not_found` foundation C38 · 500 C24 | - |
| `GET /api/catalog` new fields (4) | `gearSlots` C1 · `gear` C1 · `skins` C1 · `items[].price` C1 | - |
| `player` new fields (3) | `gear` C2, C3 · `equipment` C2, C3 · `skins` C2, C3 | - |
| gear catalog (6) | C1, table-driven over all 6 | - |
| skins catalog (4) | C1, table-driven over all 4 | - |
| priced items (3) | `sp_potion` C1, C4 · `hp_potion` C1, C4 · `boost_deploy` C1, C4 | - |
| balance boundary (4) | gems abaixo C7 · gems igual C7 · coins abaixo C7 · coins igual C7 | - |
| balance check by route and currency (5) | item gems C7 · item coins C7 · gear gems C7 · gear coins C7 · skin gems C7 | - |
| bonus sources (3) × types (3) | skills C18 · equipamento C18 · skin C18; `hp` C15, C18 · `sp` C16, C18 · `dmg` C17, C18 | - |
| bonus exclusions (2) | possuído e não equipado C16, C17, C18 · skin `default` C18 | - |
| HP transitions (5) | equipar C15 · trocar no slot C15 · remover C15 · mínimo 1 C15 · trocar skin C15 | - |
| boost outcome (2) | corta 15 min C21 · limita a agora C21 | - |
| new error codes (8) | C27, table-driven over all 8 | - |
| shop card status, gear (3) | `EQUIPADO` C29 · `NO INVENTÁRIO` C29 · preço `g`/`c` C29 | - |
| shop card status, skin (3) | `EQUIPADA` C29 · `NO GUARDA-ROUPA` C29 · preço C29 | - |
| shop bonus short (4) | `+N% DMG` C29 · `+N SP` C29 · `+N HP` C29 · `sem bônus` C29 | - |
| shop detail buttons (8) | `COMPRAR` C30 · `COMPRAR E EQUIPAR` gear C30 · `EQUIPAR` gear C30 · `EQUIPADO` C30 · `REMOVER EQUIPAMENTO` C30 · `COMPRAR E EQUIPAR` skin C30 · `EQUIPAR` skin C30 · `EQUIPADA` C30 | - |
| shop insufficient (2) | `GEMS INSUFICIENTES` C31 · `COINS INSUFICIENTES` C31 | - |
| shop toasts (6) | `+1 <nome>` C32 · `ITEM COMPRADO E EQUIPADO` C32 · `SKIN COMPRADA E EQUIPADA` C32 · `ITEM EQUIPADO` C32 · `SKIN EQUIPADA` C32 · `ITEM REMOVIDO` C32 | - |
| action outcomes on screen (8) | LOJA: 200 C32 · erro com mensagem C33 · sem corpo C33 · rede C33; AVATAR: 200 C39 · erro C41 · sem corpo C41 · rede C41 | - |
| bag tabs (4) | EQUIP C38 · POÇÕES C38 · LOOT C38 · SKINS C38 | - |
| bag detail actions (5) | `EQUIPAR` C39 · `REMOVER` C39 · `VESTIR` C39 · `EM USO` C39 · `DESCARTAR 1` C39 | - |
| paper doll slots (4) | `setup` C36 · `vestuario` C36 · `acessorio` C36 · `bebida` C36 | - |
| skin strip states (2) | bloqueada C37 · possuída C37 | - |
| boost button states (3) | com acelerador C42 · sem acelerador C42 · pronto C42 | - |
| Landing doors (10) | 1 C26 · 2 C26 · 3 C26, C47 · 4 C1 · 5 C15 · 6 C16, C17, C18 · 7 C2 · 8 C21 · 9 C44 · 10 C27 | - |
| entities (3) | `PlayerGear` C26 · `PlayerEquipment` C26 · `PlayerSkin` C26 | - |
| stored data (1) | jogadores existentes C47 | - |
| startup config: catalog (1 shared assembly) | `app.Deps.Catalog` em `main` e em `apptest` C1 | - |

- Claims naming a status code, route or response shape go through `NewRouter`, except C18 (own layer) and C26 (constraints)
- Web claims at unit level assert the rendered screen; the browser round trip is C45
- `not_enough_coins` on `shop/items`: no item costs coins in the real catalog, so C7 proves it with `apptest.NewWithCatalog`

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- `player.Bonus`: 3 fontes × 3 tipos, exclui não equipado e `default` -> decides, own layer C18 and boundary C15–C17
- shop handlers: item/gear/skin conhecido, à venda, possuído, saldo por moeda, slot a substituir, HP a somar/subtrair, mínimo 1 -> decides, boundary C4–C15, C19–C22
- boost: tipo conhecido, job existe, pronto, tem acelerador, limite em agora -> decides, boundary C21, C22
- `ShopScene`: estado de cartão e botão por posse, uso e saldo; avisos -> decides at screen level (C28–C34)
- `AvatarScene`: abas, estados do detalhe, faixa bloqueada -> decides at screen level (C35–C41)
- catalog additions: data plus one lookup per kind -> instrumentation, covered by C1
- closest analogue: `api/internal/skills` (guards inside `WithLocked`, HP gravado) and `player.GainXP` (own layer + boundary)

## Swept

- validation: C9, C10, C14, C20
- failure modes: C24, C33, C41
- idempotency: C8, C11, C12 (repetir não muda nada)
- authorization: C23
- concurrency: C25
- data lifecycle: C19 (descarte até 0 some do inventário), C47 (jogadores existentes)
- dependency failure: n/a - nenhuma dependência externa nova; falha de banco coberta por C24
- state transitions: C11, C12, C13, C15, C21
- observability: C24

## Impact on earlier checks

- foundation C28 (unshipped scenes show `EM BREVE`): its set becomes empty; C46 replaces the proof
- `ComingSoon` had no scene left to render once `/loja` and `/avatar` shipped: the component and its `.coming-soon` styles are removed, and `ComingSoon.test.tsx` now holds only C46 over the 7 scene pages
- bug-fight C37 (`items` = 8): `boost_deploy` makes 9; `TestCatalog_ServesCombat` now requires the ninth row `boost_deploy` with no `restore` (plan `Impact`)
- bug-fight C44-C52 and C53: the hero card gains a sprite; no asserted text changes

## Handoff

- Leitura: api ~89 KB + web ~52 KB ≈ 141 KB / 4 ≈ 35k, mais ~40k de código novo - abaixo do budget de 150k: um builder, sem handoff
