# DevServer

RPG 16-bit sobre a vida de dev. Monorepo: `web/` (Next.js, TypeScript), `api/` (Go) e Postgres.
O servidor é autoritativo: economia, combate e tempo de deploy são calculados na api; o front só
envia intenção. O front chama `/api/*` na própria origem e o Next repassa para a api.

## Pré-requisitos

- Go 1.26+
- Node 24+ e npm
- Docker (para o Postgres)
- Python 3 (só para gerar arte)

## Rodar localmente

### 1. Banco

```bash
make db-up
```

Sobe o Postgres 16 em `localhost:5433` (usuário, senha e banco `devserver`). Na primeira vez,
`infra/postgres/init.sql` também cria os bancos `devserver_test` e `devserver_e2e`. As migrations
rodam sozinhas quando a api sobe.

### 2. Dependências do front

```bash
cd web && npm install
```

### 3. Login

O login é só com OAuth do GitHub. Escolha um dos modos abaixo.

**Modo A: GitHub fake (sem credenciais).** Útil para desenvolver. O fake aprova todo login
como o usuário `octocat`. Em três terminais:

```bash
# terminal 1: GitHub fake em :9180
cd api && go run ./cmd/fakegithub
```

```bash
# terminal 2: api em :8080
cd api && \
  GITHUB_CLIENT_ID=dev GITHUB_CLIENT_SECRET=dev \
  GITHUB_AUTH_URL=http://localhost:9180/login/oauth/authorize \
  GITHUB_TOKEN_URL=http://localhost:9180/login/oauth/access_token \
  GITHUB_API_URL=http://localhost:9180 \
  go run ./cmd/api
```

```bash
# terminal 3: web em :3000
cd web && npm run dev
```

Para entrar com outro usuário, antes de clicar em login:

```bash
curl -X POST localhost:9180/fake/next-user -d '{"id":2,"login":"hubot"}'
```

**Modo B: GitHub de verdade.** Crie um OAuth App em GitHub → Settings → Developer settings →
OAuth Apps. Use `http://localhost:3000` como *Homepage URL* e
`http://localhost:3000/api/auth/github/callback` como *Authorization callback URL*. Depois:

```bash
# terminal 1: api em :8080
cd api && GITHUB_CLIENT_ID=<client id> GITHUB_CLIENT_SECRET=<client secret> go run ./cmd/api
```

```bash
# terminal 2: web em :3000
cd web && npm run dev
```

### 4. Jogar

Abra <http://localhost:3000>, clique em entrar com GitHub e crie o seu dev no onboarding.

## Variáveis de ambiente

api (`api/cmd/api/main.go`):

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `ADDR` | `:8080` | porta da api |
| `DATABASE_URL` | `postgres://devserver:devserver@localhost:5433/devserver?sslmode=disable` | banco |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | vazio | credenciais do OAuth App |
| `OAUTH_REDIRECT_URL` | `http://localhost:3000/api/auth/github/callback` | callback do OAuth (passa pelo Next) |
| `GITHUB_AUTH_URL` / `GITHUB_TOKEN_URL` / `GITHUB_API_URL` | GitHub real | apontar para o GitHub fake |
| `COOKIE_SECURE` | `false` | `true` em produção (HTTPS) |

web:

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `API_URL` | `http://localhost:8080` | para onde o Next repassa `/api/*` |

## Testes

```bash
make test-api    # go test contra o Postgres real (banco devserver_test)
make test-web    # vitest (telas)
make e2e         # Playwright: sobe GitHub fake (:9180), api (:8180, banco devserver_e2e) e web (:3100) sozinho
make ci-build    # go build + go vet + next build
```

Na primeira vez que rodar o e2e, instale o browser: `cd web && npx playwright install chromium`.

## Arte do jogo

A arte é pixel art gerada a partir de specs JSON pela skill `.claude/skills/pixel-assets`. Os
specs ficam em `web/art/<categoria>/<nome>.json` e os PNGs em `web/public/art/`. Os dois são
commitados juntos, e o PNG só muda quando o spec muda.

```bash
# gerar de novo tudo depois de mudar um spec
python3 .claude/skills/pixel-assets/scripts/render.py web/art --out web/public/art

# conferir que os PNGs commitados batem com os specs e seguem a paleta
make art-check
```

## Estrutura

- `api/`: servidor Go (`cmd/api`, `cmd/fakegithub`, `internal/*`, `migrations/`); o catálogo do jogo fica em `api/catalog/*.json` e é servido em `GET /api/catalog`
- `web/`: Next.js App Router (`src/app`, `src/components`, `e2e/`)
- `infra/`: init do Postgres
- `docs/DevServer RPG.html`: protótipo, a referência visual
- `.specs/`: planos, checks e verificações de cada feature
