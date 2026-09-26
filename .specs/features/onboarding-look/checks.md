# Onboarding look checks

Profile: standard
Plan: `.specs/features/onboarding-look/plan.md`

25 checks in 2 slices · 1 one-way door · 0 open

## Checks

### S1 - Montar o visual antes de criar · ~4 files · ~25 KB · ~6k

**C1** - Com o catálogo carregado e nenhum corpo escolhido, CRIE SEU DEV mostra um botão por corpo do catálogo e nenhum `[data-part]` (ONB-01, AC 1)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "hides parts until a body is chosen"`

**C2** - Com corpo `masculino`, as partes aparecem nesta ordem: `tone`, `eyes`, `hair`, `hairColor`, `beard`, `glasses`, `top`, `topColor`, `bottomColor`, `laptop`. Em CABELO não há `hair_moicano`; em COR DO CABELO não há `hair_azul`; em ROUPA não há `top_jaqueta`, `top_hoodie_trace` nem `top_moletom_gear`; em ÓCULOS não há `glasses_cyber`; em NOTEBOOK não há `laptop_gamer` nem `laptop_macbook` (ONB-01, AC 2, AC 4)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "lists free masculino parts"`

**C3** - Com corpo `feminino`, nenhum botão de parte se chama `BARBA` (ONB-01, AC 3)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "feminino has no beard"`

**C4** - Escolher `CLARA` e `CAMISETA` veste a prévia `.onboarding-hero` (`data-look` contém `#b07858` e `top-camiseta`) antes de criar, `CLARA` fica `aria-pressed` `true` e `PADRÃO` fica `false` (ONB-01, AC 5)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "preview wears the picked option"`

**C5** - No masculino, `CLARA` e `BIGODE` entram na prévia; ao trocar para `feminino` a prévia perde `beard-bigode`, mantém `#b07858`, não mostra `BARBA`, e o `POST` manda `appearance.tone` = `tone_clara` sem a chave `beard` (ONB-01, AC 6)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "switching body keeps wearable picks"`

**C6** - `CRIAR DEV` fica desabilitado com só a classe, só o corpo, ou nenhum dos dois, e habilitado com classe e corpo sem tocar numa parte (ONB-01, AC 7)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "CRIAR DEV needs class and body only"`

**C7** - Criar sem tocar numa parte manda `{ devName, class, body }` sem a chave `appearance` (ONB-01, AC 8)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "create without picks omits appearance"`

**C8** - Depois de `tone_clara` e `top_camiseta`, o `POST` inclui `appearance` com exatamente essas duas chaves (ONB-01, AC 9)
Proof: `cd web && npx vitest run src/components/Onboarding.test.tsx -t "create sends touched parts only"`

**C9** - A 360px, com um corpo escolhido e o seletor aberto, `documentElement.scrollWidth` ≤ `innerWidth` e a caixa de `CRIAR DEV` fica inteira em x ∈ [0, 360] (ONB-01, AC 10)
Proof: `cd web && npx playwright test e2e/onboarding-look.spec.ts -g "onboarding look fits phone"`

### S2 - O servidor grava a escolha e recusa o que a Loja vende · ~3 files · ~20 KB · ~5k

**C10** - `POST /api/players` sem `appearance`, corpo `masculino`, responde `201`; `player.appearance` é o padrão do catálogo para esse corpo; `coins` é `100` e `gems` é `20`; a coluna `appearance` é `{}` (ONB-02, AC 11)
Proof: `cd api && go test ./internal/player -run '^TestCreate_OmittedAppearance$'`

**C11** - O mesmo pedido com `appearance` `{}` tem o mesmo resultado do C10, inclusive a coluna `{}` (ONB-02, AC 12)
Proof: `cd api && go test ./internal/player -run '^TestCreate_EmptyAppearance$'`

**C12** - Com `appearance` `{tone: tone_clara, top: top_camiseta}` e corpo `masculino`, responde `201`, `player.appearance` resolve esses dois ids e o resto no padrão, `coins` é `100`, `gems` é `20`, `GET /api/me` devolve a mesma aparência, e a coluna guarda só `tone` e `top` (ONB-02, AC 13; door 1)
Proof: `cd api && go test ./internal/player -run '^TestCreate_StoresFreeLooks$'`

**C13** - `appearance` com `hairColor` `hair_azul` responde `409` `not_owned` e `players` fica em 0 (ONB-02, AC 14)
Proof: `cd api && go test ./internal/player -run '^TestCreate_RefusesPricedLook$'`

**C14** - `appearance` com `top` `top_hoodie_trace` responde `422` `gear_only` e `players` fica em 0 (ONB-02, AC 15)
Proof: `cd api && go test ./internal/player -run '^TestCreate_RefusesGearOnly$'`

**C15** - Corpo `masculino` com `hair` `hair_rabo` responde `422` `wrong_body` e `players` fica em 0 (ONB-02, AC 16)
Proof: `cd api && go test ./internal/player -run '^TestCreate_RefusesWrongBody$'`

**C16** - `appearance` com a parte `capa` responde `422` `unknown_part` e `players` fica em 0 (ONB-02, AC 17)
Proof: `cd api && go test ./internal/player -run '^TestCreate_RefusesUnknownPart$'`

**C17** - `tone` `tone_nope` e `tone` `hair_espetado` respondem cada um `422` `unknown_look` e `players` fica em 0 (ONB-02, AC 18)
Proof: `cd api && go test ./internal/player -run '^TestCreate_RefusesUnknownLook$'`

**C18** - Corpo `outro` junto com `hairColor` `hair_azul` responde `422` `unknown_body`. JSON truncado que nomeia `hair_azul` responde `422` `invalid_body`. Nos dois, `players` fica em 0 (ONB-02, AC 19, AC 20)
Proof: `cd api && go test ./internal/player -run '^TestCreate_AppearanceBeforeInsert$'`

**C19** - `tone_clara` junto com `hair_azul` responde `409` `not_owned` e `players` fica em 0 (ONB-02, AC 21)
Proof: `cd api && go test ./internal/player -run '^TestCreate_RefusesOneOfMany$'`

**C20** - Um segundo `POST` na mesma sessão, agora com `tone_clara`, responde `409` `player_exists`, a coluna continua `{}` e `GET /api/me` continua no padrão (ONB-02, AC 22)
Proof: `cd api && go test ./internal/player -run '^TestCreate_SecondDoesNotApplyLook$'`

**C21** - Sem sessão, `POST /api/players` responde `401` `unauthenticated` (ONB-02, Surface)
Proof: `cd api && go test ./internal/httpx -run '^TestAuthMiddleware_RejectsEveryProtectedRoute$'`

**C22** - Um dev chamado `DEV_01` já existe; criar `dev_01` em outra sessão responde `409` `dev_name_taken` (ONB-02, Surface)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_DevNameTakenCaseInsensitive$'`

**C23** - `AB`, `ABCDEFGHIJKLMNOPQ`, `DEV-01`, `DÉV_01` e vazio respondem `422` `invalid_dev_name` e não criam linha (ONB-02, Surface)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_DevNameBounds$'`

**C24** - Classe `WIZARD` responde `422` `invalid_class` e `players` fica em 0 (ONB-02, Surface)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_InvalidClass$'`

**C25** - Corpo ausente, `""`, `outro` e `FEMININO` respondem `422` `unknown_body` e não criam linha (ONB-02, Surface)
Proof: `cd api && go test ./internal/player -run '^TestCreatePlayer_UnknownBody$'`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `POST /api/players` statuses (13) | `201` C10, C12 · `401` `unauthenticated` C21 · `409` `player_exists` C20 · `409` `dev_name_taken` C22 · `409` `not_owned` C13, C19 · `422` `invalid_body` C18 · `422` `invalid_dev_name` C23 · `422` `invalid_class` C24 · `422` `unknown_body` C18, C25 · `422` `unknown_part` C16 · `422` `unknown_look` C17 · `422` `gear_only` C14 · `422` `wrong_body` C15 | - |
| masculino parts shown (10) | `tone` C2 · `eyes` C2 · `hair` C2 · `hairColor` C2 · `beard` C2 · `glasses` C2 · `top` C2 · `topColor` C2 · `bottomColor` C2 · `laptop` C2 | - |
| feminino beard (1) | parte `beard` ausente C3 | - |
| priced or gear-only hidden (8) | `hair_moicano` C2 · `hair_azul` C2 · `top_jaqueta` C2 · `glasses_cyber` C2 · `laptop_gamer` C2 · `top_hoodie_trace` C2 · `laptop_macbook` C2 · `top_moletom_gear` C2 | - |
| body switch (2) | escolha vestível fica C5 · escolha do outro corpo sai da prévia e do POST C5 | - |
| CRIAR DEV enabled (4) | sem classe e sem corpo C6 · só classe C6 · só corpo C6 · classe e corpo sem partes C6 | - |
| appearance on create (3) | omitido C7, C10 · `{}` C11 · picks grátis C8, C12 | - |
| refused look, no row (6) | `not_owned` C13 · `gear_only` C14 · `wrong_body` C15 · `unknown_part` C16 · `unknown_look` id inexistente C17 · `unknown_look` opção de outra parte C17 | - |
| validation order (2 pairs) | `unknown_body` antes de `not_owned` C18 · `invalid_body` antes de `not_owned` C18 | - |
| partial refusal (1) | um pick válido e um pago não grava C19 | - |
| second create (1) | `player_exists` não aplica o visual C20 | - |
| Landing doors (1) | 1 C10, C12, C13 | - |
| entities (0) | none - Relations `None` | - |
| stored data (0) | nothing to migrate - Impact; coluna já existe, C10 lê `{}` e C12 lê os picks | - |
| startup config (1 shared assembly) | `app.NewRouter` usado por `main` e por `apptest` C10 | - |

- Claims naming a status code, route or response shape go through `NewRouter` (C10-C20)
- Web claims assert the rendered screen; the browser boundary for layout is C9

## Test policy

Same rows as the repo's guide in `AGENTS.md` (`## Test policy`).

Evidence:

- `player.Create` applying `avatar.Choose` per pick, then inserting or not -> decides, reached at `POST /api/players`: boundary C10-C20. `avatar.Choose` already has its own layer in `TestChoose_Rows`
- Onboarding part filter (price, gearOnly, body, layer or ramp) -> decides at the screen: C2, C3
- closest analogue: `PUT /api/me/appearance` (`avatar.Update` + `TestChoose_Rows`) and the VISUAL editor in `AvatarScene`

Cost: the create proofs are at the HTTP boundary because that is where a refused pick must not insert. `Choose` is not re-proven row by row.

## Swept

- validation: C13, C14, C15, C16, C17, C18
- failure modes: C13-C19 — a refused pick creates no row; one bad pick among valid ones saves none
- idempotency: C20 — a second create does not apply appearance
- authorization: C21
- concurrency: existing - `TestCreatePlayer_ConcurrentSameUser` already serializes two creates of the same user; C20 covers the loser not writing appearance. No new lock
- data lifecycle: n/a - no migration; rows already stored with `{}` stay; C10 and C12 read the column this feature writes
- dependency failure: n/a - no external dependency; a failed insert is the existing `500` of `POST /api/players`
- state transitions: C12 (no player → player wearing the picks), C20 (player exists → still the first appearance)
- observability: n/a - no new log; refused creates use the existing error envelope

## Handoff

- Leitura: `Onboarding.tsx` + `handlers.go` + `router.go` + testes ≈ 40 KB / 4 ≈ 10k, mais o código novo — abaixo do budget de 150k: um builder, sem handoff

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
