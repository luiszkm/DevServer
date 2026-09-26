# Onboarding look

Sources:

- conversation - na criação o jogador escolhe as opções grátis do catálogo (pele, olhos, cabelo e cor, barba, óculos, roupa e cor, calça, notebook), com o herói atualizando na hora; looks pagos ficam na Loja; o corpo continua travado e o token de redesign não muda

## Problem

Quem cria um dev escolhe nome, classe e corpo, e entra no jogo vestindo o padrão do catálogo. Pele, cabelo e roupa só mudam depois, na aba VISUAL do avatar. A primeira impressão do herói não é a da pessoa.

Quando isto existir, a mesma pessoa monta esse visual grátis antes de CRIAR DEV e o servidor grava essas escolhas. Quem não mexe em nada continua com o padrão de hoje.

## Out of scope

| Excluded | Why |
| --- | --- |
| Cor livre (qualquer tom fora das rampas) | a arte troca quatro tons por peça; a loja vende algumas dessas cores |
| Comprar look pago na criação | o jogador nasce com 100 moedas e 20 gemas; gastar isso antes de jogar esvazia a carteira |
| Trocar o corpo sem token | já decidido: só o TOKEN DE REDESIGN, na aba VISUAL |
| Editor novo para quem já tem dev | a aba VISUAL já faz isso |
| Peças, cores ou roupas que o catálogo não tem | o catálogo é a lista; isto não desenha arte nova |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| O que aparece na criação | as opções sem `price` e sem `gearOnly`, da parte, disponíveis para o corpo escolhido, que desenham (`layer` ou `ramp`); ordem do catálogo | é o editor da aba VISUAL menos o que a Loja vende | y |
| Quem não mexe numa parte | o rascunho começa vazio; parte intocada não é gravada e segue o padrão do corpo | é como `players.appearance` já funciona: só o que a pessoa escolheu | n |
| CRIAR DEV | continua habilitado com classe e corpo, mesmo sem tocar numa parte | o padrão já é um visual válido; exigir cada parte trava quem só quer entrar | n |
| Trocar o corpo no meio | escolhas que o novo corpo veste ficam; as outras voltam ao padrão desse corpo | a mesma regra de `ResolveAppearance` | n |
| Uma tela | nome, classe, corpo, prévia e partes no mesmo formulário; sem assistente em passos | a criação já é um painel; um passo a mais esconde o herói | n |
| `appearance` ausente ou `{}` | não grava escolha nenhuma | todo cliente que já cria um dev (testes, e2e) continua válido | n |
| Looks pagos na tela | não aparecem, nem bloqueados | a pessoa confirmou "só as opções grátis"; o servidor ainda recusa se alguém mandar um | y |

**Open questions:** none - all resolved or logged above.

## Criteria

### S1: montar o visual antes de criar (P1)

**Acceptance Criteria**

1. WHEN o catálogo carregou e nenhum corpo está escolhido THEN a tela CRIE SEU DEV SHALL mostrar os corpos do catálogo e SHALL NOT mostrar o seletor de partes.
2. WHEN um corpo está escolhido THEN a tela SHALL mostrar uma prévia do herói com os padrões desse corpo e SHALL listar, na ordem do catálogo, cada parte que tenha ao menos uma opção sem `price`, sem `gearOnly`, disponível para esse corpo e com `layer` ou `ramp`.
3. WHEN o corpo é `feminino` THEN a lista de partes SHALL NOT incluir `beard`.
4. WHEN o corpo é `masculino` THEN a lista SHALL incluir `tone`, `eyes`, `hair`, `hairColor`, `beard`, `glasses`, `top`, `topColor`, `bottomColor` e `laptop`, e SHALL NOT incluir `hair_moicano`, `hair_azul`, `top_jaqueta`, `glasses_cyber` nem `laptop_gamer`.
5. WHEN a pessoa escolhe uma opção de uma parte THEN a prévia SHALL vestir essa opção antes de CRIAR DEV, e o botão dessa opção SHALL ficar `aria-pressed` `true`.
6. WHEN a pessoa troca o corpo THEN uma escolha que o novo corpo veste SHALL permanecer na prévia, e uma escolha que ele não veste SHALL voltar ao padrão desse corpo.
7. WHILE falta classe ou corpo, CRIAR DEV SHALL permanecer desabilitado. Tocar ou não numa parte não muda isso.
8. WHEN CRIAR DEV é enviado sem nenhuma parte tocada THEN o corpo do `POST /api/players` SHALL ser `{ devName, class, body }` sem `appearance`.
9. WHEN CRIAR DEV é enviado depois de escolher `tone_clara` e `top_camiseta` THEN o corpo SHALL incluir `appearance` com `tone` `tone_clara` e `top` `top_camiseta`, e SHALL NOT incluir partes que não foram tocadas.
10. WHILE a viewport tem 360px de largura e um corpo está escolhido, the tela CRIE SEU DEV SHALL NOT ter rolagem horizontal, e o botão CRIAR DEV SHALL caber inteiro nessa largura.

**Independent test:** abrir CRIE SEU DEV, escolher FEMININO, trocar a cor da pele e a camiseta, ver o herói mudar, criar, e o dev entrar com essa pele e essa camiseta.

### S2: o servidor grava a escolha e recusa o que a Loja vende (P1)

**Acceptance Criteria**

11. WHEN `POST /api/players` omite `appearance` THEN a resposta SHALL ser `201` com `player.appearance` igual aos padrões daquele corpo, e a linha SHALL guardar `appearance` `{}`.
12. WHEN `POST /api/players` manda `appearance` `{}` THEN o resultado SHALL ser o mesmo do critério 11.
13. WHEN `POST /api/players` manda `appearance` com opções grátis válidas para o corpo THEN a resposta SHALL ser `201`, `player.appearance` SHALL resolver essas opções, a linha SHALL guardar só esses pares, e `coins` SHALL ser `100` e `gems` SHALL ser `20`.
14. IF uma das escolhas tem `price` THEN a resposta SHALL ser `409` `not_owned` e SHALL NOT existir linha de jogador.
15. IF uma das escolhas é `gearOnly` THEN a resposta SHALL ser `422` `gear_only` e SHALL NOT existir linha de jogador.
16. IF uma escolha não é do corpo enviado THEN a resposta SHALL ser `422` `wrong_body` e SHALL NOT existir linha de jogador.
17. IF a parte não existe no catálogo THEN a resposta SHALL ser `422` `unknown_part` e SHALL NOT existir linha de jogador.
18. IF a opção não existe ou não é da parte THEN a resposta SHALL ser `422` `unknown_look` e SHALL NOT existir linha de jogador.
19. IF o corpo já falha em `unknown_body` e `appearance` também seria recusado THEN a resposta SHALL ser `422` `unknown_body`.
20. IF o JSON não decodifica THEN a resposta SHALL ser `422` `invalid_body`, antes de qualquer recusa de `appearance`.
21. IF uma de várias escolhas é recusada THEN nenhuma SHALL ser gravada e SHALL NOT existir linha de jogador.
22. The criação SHALL recusar uma segunda vez com `409` `player_exists` e SHALL NOT aplicar o `appearance` dessa segunda requisição.

**Independent test:** criar com `tone_clara` e ler `/api/me`; tentar criar de novo com `hair_azul` numa sessão sem jogador e ver `409` sem linha.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| ONB-01 | S1 | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 | Pending |
| ONB-02 | S2 | 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 | Pending |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen CRIE SEU DEV | empty state | AC 1 - sem corpo, sem seletor de partes |
| screen CRIE SEU DEV | loading state | existing - `CARREGANDO...` enquanto onboarding ou catálogo não voltaram |
| screen CRIE SEU DEV | error state | existing - `error.message` da api, `SERVIDOR FORA DO AR` sem rede, `erro ao carregar` / `erro ao criar dev` sem corpo |
| screen CRIE SEU DEV | unauthorised | n/a - a tela só monta com sessão; `POST /api/players` já responde `401` sem ela |
| screen CRIE SEU DEV | density and ordering | AC 2 - partes e opções na ordem do catálogo |
| screen CRIE SEU DEV | destructive action confirms | n/a - criar não apaga nada; não há confirmação extra |
| API `POST /api/players` | response shape | AC 11, AC 13 - `{"player": {...}}` como hoje |
| API `POST /api/players` | error shape and codes | AC 14 a AC 20 - envelope AD-005, códigos já existentes |
| API `POST /api/players` | who may call it | existing - sessão; sem sessão, `401` |
| API `POST /api/players` | versioning | n/a - um único cliente, o `web/` |
| API `POST /api/players` | rate limit | n/a - a rota não tem limite hoje e esta mudança não adiciona um |

## Flow

Reusa `avatar.Choose` para cada par do mapa e `player.ResolveAppearance` para pintar e para responder. Não cria uma segunda lista de looks de iniciante.

1. A tela manda nome, classe, corpo e, se alguma parte foi tocada, `appearance` -> `player.Create` (exists)
2. `player.Create` (exists) valida nome, classe e corpo como hoje; para cada par chama `avatar.Choose` (exists), ligado em `app.NewRouter` porque `player` não importa `avatar`; a primeira recusa não insere
3. `player.insert` (exists) grava a linha com os picks aceitos em `players.appearance`
4. out: `201 {"player"}` com a aparência resolvida; a próxima leitura usa a mesma coluna

## Relations

`None - no stored-data shape change`

`players.appearance` já guarda só os picks. Esta mudança escreve nessa coluna na inserção, que hoje deixa o default `{}`.

## Surface

| Route | In | Out | Status |
| --- | --- | --- | --- |
| `POST /api/players` | `devName`, `class`, `body`, `appearance` opcional (parte → opção) | `player` | `201`, `401`, `409` `player_exists`, `409` `dev_name_taken`, `409` `not_owned`, `422` `invalid_body`, `422` `invalid_dev_name`, `422` `invalid_class`, `422` `unknown_body`, `422` `unknown_part`, `422` `unknown_look`, `422` `gear_only`, `422` `wrong_body` |

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| A criação aceita o mesmo mapa de visual que o editor | `appearance` opcional em `POST /api/players`, parte → opção, cada par passa por `avatar.Choose`; ausente ou `{}` grava `{}` | uma lista própria de looks de iniciante ao lado de `Choose` — as duas divergem no primeiro look pago ou `gearOnly` |

- Nothing else in this change is hard to reverse

## Impact

| Front | What changes |
| --- | --- |
| domain | existing term: `appearance` continua sendo os picks explícitos, parte → opção. Quem cria sem tocar numa parte segue com `{}`. Quem ramifica hoje: `PUT /api/me/appearance`, a aba VISUAL, `ResolveAppearance` |
| stored data | nada a migrar. Linhas já criadas ficam com `{}`. Linhas novas podem nascer com picks |
| callers | `POST /api/players` sem `appearance` permanece válido: testes da api, `newDev` do e2e e o onboarding atual |
