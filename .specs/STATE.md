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
| AD-007 | UI pt-BR, desktop-first 1200px, identidade visual do protótipo (Press Start 2P + VT323, paleta azul/ciano/verde/roxo/amarelo, grade 32px) | protótipo `docs/DevServer RPG.html` é a referência visual | active | 2026-09-23 |
| AD-008 | MVP = foundation, deploy-pipelines, skills, bug-fight, shop-inventory-avatar; office, ranking-season, server-room depois | decisão do usuário no levantamento | active | 2026-09-23 |

## Handoff

**Feature**: foundation
**Where**: C1–C50 fechados; rounds 1–3 do Verifier FAIL; correções do round 4 aplicadas
**In progress**: nenhum
**Next step**: Verifier round 4 (aprovado pelo usuário além do limite de 3)
**Blockers**: none (pergunta aberta 1 - LGPD - bloqueia go-live)
**Uncommitted**: none
**Branch**: feat/foundation
