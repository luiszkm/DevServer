# Project state

## Decisions

| ID | Decision | Rationale | Status | Date |
| --- | --- | --- | --- | --- |
| AD-001 | Stack: Next.js (App Router, TypeScript) em `web/`, Go em `api/`, Postgres, monorepo | pedido do usuário; um PR por feature sem skew de versão | active | 2026-09-23 |
| AD-002 | Servidor autoritativo: economia, progressão, combate e tempo de deploy calculados no Go; cliente envia só intenção (id do comando, id do item) | jogo online - valor vindo do cliente é trapaça | active | 2026-09-23 |
| AD-003 | Catálogo (regiões, inimigos, itens, gear, skins, skills, níveis de deploy) é dado embutido no Go e servido em `GET /api/catalog`; o front nunca hardcoda números de balanceamento | balancear sem deploy do front e sem duas fontes de verdade | active | 2026-09-23 |
| AD-004 | Toda mutação do jogador roda em uma transação com `SELECT ... FOR UPDATE` na linha do player e responde `{"player": {...}}` | serializa duplo clique e duas abas; HUD atualiza sem novo GET | active | 2026-09-23 |
| AD-005 | Erro da API: `{"error":{"code":"<snake_case>","message":"<pt-BR>"}}` em todo 4xx/5xx | decidido uma vez antes do primeiro handler, senão vira acidente copiado | active | 2026-09-23 |
| AD-006 | Login só via OAuth GitHub; sessão opaca em cookie `ds_session` | decisão do usuário no levantamento | active | 2026-09-23 |
| AD-007 | UI pt-BR, desktop-first 1200px, identidade visual do protótipo (Press Start 2P + VT323, paleta azul/ciano/verde/roxo/amarelo, grade 32px) | protótipo `docs/DevServer RPG.html` é a referência visual | superseded by AD-015 | 2026-09-23 |
| AD-008 | MVP = foundation, deploy-pipelines, skills, bug-fight, shop-inventory-avatar; office, ranking-season, server-room depois | decisão do usuário no levantamento | active | 2026-09-23 |
| AD-009 | Level-up tem uma regra só, `player.GainXP`; toda recompensa de XP passa por ela | evita regras de progressão divergentes entre deploy, combate e futuras fontes | active | 2026-09-23 |
| AD-010 | Tempo de jogo vem de `app.Deps.Now` (relógio injetado) e as respostas com tempo trazem `serverTime` | testes avançam o tempo; o cliente nunca decide quando algo terminou | active | 2026-09-23 |
| AD-011 | Todo sorteio do jogo vem de `app.Deps.Rand` (injetado), nunca de `rand` global | testes fixam o resultado e provam as regras; o cliente nunca sorteia | active | 2026-09-23 |
| AD-012 | Bônus de combate e de HP têm uma regra só, `player.Bonus(cat, p, type)`: skills + equipamentos equipados + skin vestida; toda fonte nova entra nela | evita que a próxima fonte (office) seja esquecida em algum chamador | active | 2026-09-23 |
| AD-013 | `player.Bonus` também soma os móveis do escritório nos tipos `xp`, `deploy` e `spregen`; `deploy` é limitado por `office.maxDeployCut` (40); o deploy congela duração e XP com bônus no início | estende AD-012 sem segunda regra; congelar no início segue o snapshot de recompensa de `deploy_jobs` (decisão do usuário) | active | 2026-09-23 |
| AD-014 | `player.Bonus` também soma os stats do rack (POWER → `dmg`, RAM → `sp`, UPTIME → `coins`): stat = `min(max, base + Σ efeitos)`, bônus = `floor((stat − base) / step)`, tudo no catálogo `rack`; tipo novo `coins` = % sobre as coins do deploy, congelado no início como a XP | estende AD-013 sem segunda regra; decisão do usuário (stats viram bônus) | active | 2026-09-24 |
| AD-015 | UI pt-BR com identidade visual do protótipo; layout desktop 1200px a partir de 1200px de largura, abaixo disso uma coluna com menu hambúrguer (max-width: 1199px) | jogar pelo celular em retrato (decisão do usuário: reflow + menu hambúrguer); substitui a parte de layout de AD-007 | active | 2026-09-24 |

## Handoff

**Feature**: game-menu
**Where**: C1–C18 fechados; falta o Verifier
**In progress**: nenhum
**Next step**: Verifier independente sobre `80fd17e..HEAD`; depois push e PR de `feat/office`, `feat/server-room`, `feat/game-art`, `feat/responsive` e `feat/game-menu` quando o usuário pedir
**Blockers**: none
**Uncommitted**: none
**Branch**: feat/game-menu (sobre feat/responsive)
