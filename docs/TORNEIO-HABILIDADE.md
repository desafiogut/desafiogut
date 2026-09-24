# Torneio de habilidade — especificação do motor de pontuação

> **Origem:** MC93-A (motor puro) + MC93-B (persistência, endpoints, integração), 2026-09-23/24.
> **Estado:** implementado e testado. ⚠️ **A migração SQL ainda NÃO foi aplicada** e a
> **emissão on-chain do bónus continua por fazer** — ambas dependem do operador.
> **Código:** `_lib/pontuacao-utils.mjs` (motor) · `_lib/pontuacao-store.mjs` (persistência) ·
> `pontuacao.mjs` · `ranking.mjs` · `supabase/migrations/20260923_mc93b_pontuacoes.sql`
> **Testes:** `_tests/mc93-pontuacao.test.mjs` · `mc93b-pontuacao-store.test.mjs` · `mc93b-endpoints.test.mjs`

---

## 1. O que este documento é, e o que não é

É a especificação do **cálculo**: dadas as jogadas, quantos pontos e que posição.

**Não é** o regulamento. O regulamento em vigor (`src/components/TermosConsentimento.jsx`) continua a dizer, no Art. 8, que *"O MENOR LANCE ÚNICO GANHA"*, e no Art. 14 que o contemplado recebe **prémio** em dinheiro. Enquanto o MC95 não o reescrever, **o regulamento é que vale juridicamente**, não este documento nem o código. As regras aqui descritas são decisões de produto do operador, ainda não ratificadas.

---

## 2. Regras implementadas

| Regra | Valor | Constante |
|---|---|---|
| Lance mínimo aceite (Art. XXIII) | **1 centavo** | `REGRAS.VALOR_MINIMO_CENTAVOS` |
| Ponto por acerto de lance único | **+1** | `REGRAS.PONTOS_ACERTO_UNICO` |
| Bónus pelo **menor** lance único da rodada | **+3** | `REGRAS.PONTOS_MENOR_UNICO` |
| Acertos consecutivos para bónus de sequência | **5** | `REGRAS.ACERTOS_PARA_BONUS` |
| Pontos por sequência completa | **+5** | `REGRAS.PONTOS_BONUS` |
| Senhas por sequência completa | **20** | `REGRAS.SENHAS_BONUS` |

Todas as constantes vivem em `REGRAS`, congelado com `Object.freeze`. **Quando o MC95 fixar o regulamento, muda-se ali — num sítio só — e a lógica não se toca.** Foi essa a razão de o motor nascer antes da integração.

Há um teste que fixa estes cinco números **em literal**. Se forem alterados, a suíte falha de propósito: a mudança passa a ser uma decisão consciente, não um deslize.

---

## 3. Definições

**Acerto** — ter feito, na rodada, um lance cujo valor aparece **exactamente uma vez** entre todos os lances da rodada. É a única leitura compatível com o enunciado "+1 ponto por acerto de lance único".

**Menor lance único** — não é redefinido aqui. É decidido por `apurarMenorLanceUnico` (`_lib/simulador.mjs`), a função que o projeto já usa e que espelha o `apurarVencedor` do contrato. Se o Artigo VIII mudar, muda num sítio só.

**Participante** — identificado pelo **`endereco`** da carteira, normalizado para minúsculas. Não existe `usuario_id` no projeto: não há tabela `usuarios`, a identidade vem do Privy e a chave é a carteira.

**Rodada** — uma edição (`edicaoId`). Os lances vivem em Netlify Blobs (`_lib/bids-store.mjs`, Key-Per-Bid do MC28.1), **não** na tabela Postgres `lances`, que tem 0 linhas.

**Lance válido** — para contar, um lance tem de cumprir as três condições, verificadas **antes** de qualquer apuração:

1. `valorCentavos` é um inteiro (`Number.isInteger`, sem coerção);
2. `valorCentavos ≥ 1` (Art. XXIII);
3. tem `endereco` atribuível.

> ⚠️ **Porque a guarda 1 é estrita.** `Number.isInteger(Number(null))` é `true`, porque `Number(null) === 0`. Sem esta guarda, um lance com `valorCentavos: null` tornava-se um lance de 0 centavos — único, o mais baixo, **vencedor**. E há caminho real para isso: `_lib/data-store-supabase.mjs:117` grava `valor_centavos = null` **de propósito** para marcar um lance inválido. As duas convenções eram opostas: o que um módulo marca como lixo, o outro elegia como campeão. Defeito encontrado por validação independente no SEG4 do MC93-A.
>
> ⚠️ **Porque a guarda 3 existe.** Um lance sem dono, se ficasse na lista, era eleito menor único e os +3 **evaporavam-se** em vez de passarem ao menor lance atribuível seguinte.

A lista é filtrada **uma vez** e a mesma lista é passada à contagem interna e a `apurarMenorLanceUnico` — assim as duas leituras não podem divergir sobre o que é um lance.

---

## 4. As três funções

### `calcularPontosRodada(lances)`

```js
calcularPontosRodada([
  { endereco: "0xA…", valorCentavos: 30 },   // único E menor → 1 + 3 = 4
  { endereco: "0xB…", valorCentavos: 70 },   // único        → 1
  { endereco: "0xC…", valorCentavos: 50 },   // repetido     → 0
  { endereco: "0xC…", valorCentavos: 50 },
])
// Map { "0xa…" => { pontos: 4, acertos: 1, menorUnico: true },
//       "0xb…" => { pontos: 1, acertos: 1, menorUnico: false } }
```

- Um mesmo endereço pode acertar **mais do que uma vez** na mesma rodada; cada lance único soma.
- Participantes **sem nenhum acerto não aparecem** no mapa. Rodada sem lances únicos devolve mapa vazio.
- Valores não inteiros são ignorados — mesmo critério de `apurarMenorLanceUnico`, para que as duas funções nunca discordem sobre o que é um lance válido.

### `detectarConsecutivos(historico)`

```js
detectarConsecutivos([true, true, true, true, true])
// { bonus: 1, sequenciaAtual: 5, maiorSequencia: 5, pontosBonus: 5, senhasBonus: 20 }
```

- Aceita `boolean[]` ou `{acertou:boolean}[]`, por ordem cronológica. **Falha fechado:** só `true` estrito conta. `{acertou:"sim"}` não paga — este contador decide a emissão de R$ 40,00 em senhas, e quando a dúvida vale dinheiro, a dúvida não paga.
- O bónus é **a cada 5**: dez acertos numa corrida valem dois bónus; duas corridas de cinco separadas por uma falha valem igualmente dois.
- Uma falha parte a corrente.
- **Devolve o que seria devido. Não credita nada.**

### `atualizarRanking(pontuacoes)`

```js
atualizarRanking([{endereco:"0xA…",pontosTotais:10},{endereco:"0xB…",pontosTotais:7},{endereco:"0xC…",pontosTotais:7}])
// [ {…A, posicao:1}, {…B, posicao:2}, {…C, posicao:2} ]   e o seguinte seria 4º
```

- Aceita o `Map` de `calcularPontosRodada` ou uma lista `{endereco, pontosTotais}`.
- Empates **partilham posição e a seguinte salta** (padrão 1-2-2-4, como em competição).
- Dentro do empate, ordem por **endereço ascendente** — determinística de propósito: o ranking decide prémio, logo a ordem de chegada dos dados nunca pode alterar o resultado. Há um teste que inverte o input e exige o mesmo output.
- **Agrega por carteira**: a mesma carteira nunca ocupa duas posições.
- Entradas sem endereço utilizável (incluindo chaves não-textuais num `Map`) são descartadas. Uma só política para o caminho do `Map` e o da lista.

---

## 4b. Persistência, endpoints e integração (MC93-B)

> **Estado:** implementado; a migração SQL **ainda não foi aplicada** — execução do operador.

### Tabelas

`pontuacoes` — um registo por participante por ciclo, escrito no fecho da rodada.
`ciclo_id` é **TEXT**, porque o ciclo é a edição e os ids são strings ("R-1");
`lances.edicao_id` é `VARCHAR(66)`, logo um UUID impediria o join.
`UNIQUE (ciclo_id, endereco)` dá a idempotência do fecho.

`rankings_ciclo` — agregado do ciclo mais o estado do bónus:
`pontos_totais`, `acertos_totais`, `posicao`, `bonus_emitido`,
`senhas_a_creditar`, `liquidado_em`.

RLS activa nas duas, com política **só para `service_role`**. A chave `anon` não
lê estas tabelas: o placar é servido pelo endpoint, do lado do servidor. É a
brecha A-04 que o MC87 fechou.

### A sequência de acertos vive na própria tabela

`registrarPontuacaoRodada` lê o histórico de `pontuacoes` sozinho — o chamador
não passa histórico nenhum. ⚠️ A primeira versão exigia-o por parâmetro e a
integração em `consolidar-lances.mjs` nunca o passava: `detectarConsecutivos([])`
devolvia sempre `bonus: 0` e **o bónus de sequência era inalcançável no único
caminho de produção**. Achado da validação independente.

Por isso grava-se uma linha para **cada participante da rodada**, incluindo quem
não acertou (`acertos: 0`): sem as falhas registadas, a corrente nunca se parte
e o contador que paga 20 senhas conta a mais.

### Concorrência: o bónus é reclamado, não escrito

`reclamarBonus` faz um **compare-and-set** — `UPDATE … WHERE bonus_emitido = false`
— e só enfileira a dívida se tiver afectado alguma linha. ⚠️ Com read-then-write,
duas consolidações em paralelo liam ambas `false`, ambas gravavam 20 senhas e
ambas enfileiravam: o livro-razão dizia 20 e a fila mandava creditar 40.

### O bónus é um DIREITO, não um saldo

⚠️ **`senhas_a_creditar` nunca entra em `saldoEfetivo`.** O contrato é a única
autoridade: `darLance` exige `saldoSenhas[msg.sender] > 0` on-chain
(`Leilao.sol:88`) e decrementa-o (`:107`). Uma senha creditada fora da cadeia
não habilita lance nenhum — o utilizador veria "+20 senhas" e a transação
reverteria com "Voce nao possui senhas disponiveis". E `saldo-senhas.mjs`
calcula `saldoEfetivo = saldoOnChain − senhasConsumidas`: somar-lhe um termo
off-chain quebraria a invariante `saldoEfetivo ≤ saldoOnChain`.

Por isso o store grava a dívida (`liquidado_em = NULL`) e enfileira
`creditar-senhas-bonus` em `fila_tarefas` — o mesmo caminho que o projeto já
usa para creditar senhas depois do PIX. A emissão on-chain acontece quando o
operador a autorizar.

**A UI (MC94) tem de dizer "20 senhas a creditar", não "+20 senhas".**

### Desempate: duas regras, de propósito

O operador fixou **"mais acertos totais"** (2026-09-23). O motor do MC93-A
desempata por endereço, e o MC93-B não podia alterá-lo. Por isso o ranking do
ciclo é ordenado **no store**: `pontos desc → acertos desc → endereço asc`.
Há um teste que exige que as duas regras **coincidam quando os acertos são
iguais**, para que a divergência deliberada não se alargue.
⇒ Quando o MC95 ratificar a regra, leva-se o desempate ao motor e o store
delega.

### Endpoints

| | Acesso | Resposta |
|---|---|---|
| `POST /pontuacao` | admin (`guardAdmin`) | `{ok, cicloId, participantes, bonusRegistados}` |
| `GET /ranking?cicloId=` | público, rate-limited | `{cicloId, total, ranking[]}` |
| `GET /ranking?recurso=feedback&cicloId=&endereco=` | **dono ou admin** | pontos, posição, sequência, quanto falta, direito |

⚠️ O `feedback` exige `validarOwnerOuAdmin`, não só sessão válida: os endereços
são públicos na blockchain, logo "ter sessão" não é autorização para ler a
atividade de outrem. Mesmo guarda de `saldo-rs.mjs:51`.

### Integração no fecho da rodada

Em `consolidar-lances.mjs`, **depois do recibo confirmado** e **antes de
`marcarConsolidado`**, em `try/catch` **fail-soft**:

- *depois do recibo* — uma tx pendente (202) ou falhada (502) sai antes, logo
  não gera pontos;
- *fail-soft* — a transação já está minerada e é irreversível; a pontuação é
  reconstituível, a tx não é. Rebentar aqui faria o caller crer que a
  consolidação falhou.

> ⚠️ **Consequência assumida.** Como o `catch` engole, o `marcarConsolidado`
> corre na mesma: se a pontuação falhar, a edição fica **consolidada sem
> pontos**, e a segunda chamada sai logo no `estaConsolidado`. **O estado
> parcial é permanente por este caminho.** A recuperação é manual e existe de
> propósito: `POST /pontuacao` com o mesmo `cicloId` repontua a edição (é
> idempotente por ciclo+endereço, e preserva bónus e liquidação já feitos).
> A resposta da consolidação devolve `pontuacao: null` precisamente para que a
> coordenação veja que há uma edição por repontuar.
>
> *(Uma versão anterior desta secção afirmava que a edição ficava por marcar e
> que a repetição resolvia sozinha. Era falso — o `catch` impede-o. Corrigido
> depois de a validação independente o apanhar.)*

---

## 5. O que o motor NÃO faz (por decisão, não por esquecimento)

Não grava, não lê banco, não chama rede, não toca no on-chain, não emite senhas. Há um **teste de estrutura** que falha se alguém importar Netlify Blobs, Supabase, `ethers`, `fetch`, `node:fs` ou `process.env` dentro do módulo.

> ⚠️ **Limite conhecido dessa garantia.** O teste é uma regex sobre o texto do próprio ficheiro, logo é **cego através do import**: `_lib/simulador.mjs` importa `@netlify/blobs` (linha 11), portanto carregar `pontuacao-utils.mjs` carrega o SDK dos Blobs. As *funções* são puras — não executam I/O, não mutam a entrada — mas o *grafo de imports* não é. Há um teste que fixa este facto por escrito em vez de o esconder.
>
> **Decisão para o MC93-B:** ou se inverte a dependência (passar `apurarMenorLanceUnico` como argumento), ou se aceita o peso no bundle da função. Não deixar implícito.

A razão é o SEG-1 do MC93: o "bónus de 20 senhas" **não é um `UPDATE`**. As senhas são creditadas on-chain, na Ethereum mainnet, via `creditarSenhas` → `adicionarSenhas` (`_lib/contract.mjs`). Cada bónus é uma transação assinada pela coordenação, que custa gas real e emite **R$ 40,00 de valor** (20 × R$ 2,00). Isso exige autorização de custo (R2) e uma política de limite que ainda não existe.

---

## 6. Lacunas — decidir antes do MC93-B

| # | Lacuna | Default adoptado no MC93-A | Quem decide |
|---|---|---|---|
| G1 | Definição de "acerto" | lance cujo valor é único na rodada | MC95 / advogado |
| G2 | Critério de desempate | endereço ascendente, posição partilhada | MC95 — **afecta prémio** |
| G3 | 10 acertos seguidos = 1 bónus ou 2? | **2** (a cada 5) | MC95 — **afecta custo** |
| G4 | O que é um "ciclo" (`rankings_ciclo.ciclo_id`) | **não implementado** — não existe definição em lado nenhum | operador |
| G5 | Limite de bónus por participante/ciclo | **nenhum** — o motor não limita | operador — **afecta custo** |
| G6 | Natureza jurídica do "torneio de habilidade" | **em aberto** (D2/D4 do MC00.0) | advogado |

G2, G3 e G5 têm efeito financeiro directo. G6 determina se o torneio é sequer executável na forma desenhada.

---

## 7. O que falta para o MC93-B

1. Definir "ciclo" (G4) — sem isso, `rankings_ciclo` não é implementável.
2. Resolver G2, G3, G5 — têm efeito no prémio e no custo.
3. Reativar **R2** (custo financeiro) para o crédito on-chain das senhas.
4. Tabelas `pontuacoes` e `rankings_ciclo` + RLS.
5. Endpoints `pontuacao.mjs` e `ranking.mjs`, no padrão `guardAdmin` de `_lib/admin-auth.mjs`.
6. Gancho de fecho de rodada em **`consolidar-lances.mjs`** — logo após a apuração e antes da submissão on-chain. **Não** em `lance-relampago.mjs` (é endpoint por lance, não por rodada) e **não** em `lance-programado.mjs` (não existe).
7. Idempotência do crédito de senhas — o padrão do projeto está em `comprar-senhas.mjs` e `wallet_idem`.

> ⚠️ O leilão está hoje travado: `EM_BREVE_MODE = true` (`src/lib/leilaoLock.js:10`) e `isLeilaoAtivo:{ios:false, android:false}` (`_lib/recursos-app-config.mjs:19`). Não há rodadas reais a processar. O motor foi validado só com dados sintéticos — é o que a suíte cobre, e é tudo o que existe até o leilão reabrir.
