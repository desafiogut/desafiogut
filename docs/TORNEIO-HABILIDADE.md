# Torneio de habilidade — especificação do motor de pontuação

> **Origem:** MC93-A (motor) + MC93-B (persistência) + MC93-C (liquidação) + MC93-D (contrato medido + sweeper), 2026-09-23/24.
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

## 4c. Liquidação do bónus — e como se activa (MC93-C)

> **Estado hoje: DRY-RUN.** O handler existe, está registado na fila e corre de
> 5 em 5 minutos — e **não emite nada**. Confirmado por execução:
> com uma dívida perfeita em aberto, a decisão é `{"emitir":false,"motivo":"flag_desligada"}`.

### Quem faz o quê

```
pontuacao-store.mjs          fila_tarefas              worker-bonus.mjs
  completa 5 acertos    →    "creditar-senhas-bonus"  →  cron */5
  grava a DÍVIDA             (payload é uma PISTA)       lê a dívida no
  liquidado_em = NULL                                    LIVRO-RAZÃO
                                                              ↓
                                                      podeEmitir(3 condições)
                                                              ↓
                                                    RECLAMAR → CREDITAR
```

Antes deste MC o tipo `creditar-senhas-bonus` **não tinha handler**: a tarefa
esgotava 5 tentativas com backoff exponencial e caía na DLQ. Era a ressalva nº 2
do MC93-B.

### Três condições, não uma

O MC pedia "wire-up desligado por default" através de uma flag. Uma flag sozinha
é **fail-open por omissão de disciplina**: basta alguém pôr
`BONUS_EMISSAO_ATIVA=true` no painel do Netlify para o sistema começar a emitir
R$ 40,00 por sequência, sem mais barreira nenhuma. Por isso exige-se, em
simultâneo:

| # | Condição | Porquê |
|---|---|---|
| 1 | `BONUS_EMISSAO_ATIVA === "true"` (string exacta) | o interruptor do operador. `"1"`, `"sim"`, `"TRUE"` **não** contam |
| 2 | dívida existe e `liquidado_em IS NULL` em `rankings_ciclo` | a idempotência ancora no **livro-razão**, não na fila: uma tarefa pode ser reprocessada, o registo é que é a verdade |
| 3 | payload coincide com o livro-razão em ciclo, endereço e quantidade | um payload divergente é **recusado**, nunca "ajustado" — divergir já é sinal de problema |

A quantidade emitida vem sempre do **livro-razão**, nunca do payload.

### Reclamar antes de creditar

```
UPDATE rankings_ciclo
   SET liquidado_em = now()
 WHERE ciclo_id = $1 AND endereco = $2 AND liquidado_em IS NULL
RETURNING *
```

Só uma execução afecta linha. Se o `RETURNING` vier vazio, outra já reclamou e
o handler sai **sem creditar**.

> ⚠️ No cliente isto escreve-se `.is("liquidado_em", null)` — **nunca** `.eq()`.
> O postgrest-js traduz `.eq(col, null)` para `col=eq.null`, que o PostgREST
> rejeita numa coluna TIMESTAMPTZ com HTTP 400 (`22007`). A primeira versão do
> handler usava `.eq()`: o compare-and-set **não existia** e, com a flag ligada,
> teria falhado em 100% das execuções. Há um teste que exige `.is()` e um duplo
> que rebenta se alguém voltar a `.eq(col, null)`.

É a disciplina do `_lib/worker-credito.mjs` ("CLAIM ANTES do reembolso"): grava-se
o marcador antes de mover dinheiro, para que um processo que morra a meio nunca
pague duas vezes. **Entre pagar a dobrar e pagar a menos, escolhe-se pagar a
menos** — o excesso é irreversível on-chain; a falta reconcilia-se à mão.

⚠️ Se o crédito on-chain falhar, a reclamação **não é desfeita**: a tx pode ter
sido submetida e ter falhado só a confirmação, e reabrir a dívida criaria a
janela de pagamento duplo. Sai um alerta `error`
(`worker_bonus_credito_falhou`) para reconciliação manual.

### Em dry-run, o handler NÃO lança

Termina em silêncio e a tarefa fica `done`. Lançar faria a fila re-enfileirar
com backoff e, ao fim de 5 tentativas, encher a DLQ de tarefas que só estão à
espera de uma decisão — que é precisamente o problema que este MC veio resolver.

### Caminho de activação — três passos, todos do operador

1. **Aplicar a migração** `20260923_mc93b_pontuacoes.sql`. Sem ela as tabelas
   não existem e nada disto funciona (a leitura da dívida falha).
2. **Reativar a R2** com autorização de custo explícita: cada liquidação são
   20 senhas × R$ 2,00 = **R$ 40,00**, mais gas na mainnet. Confirmar que a EOA
   coordenadora tem saldo.
3. **Definir `BONUS_EMISSAO_ATIVA=true`** no contexto certo do Netlify
   (⚠️ o env é **por contexto**: `production` ≠ `deploy-preview`).

Antes do passo 3, vale correr uma consulta de controlo — quanto se vai emitir:

```sql
SELECT count(*) AS dividas, sum(senhas_a_creditar) AS senhas,
       sum(senhas_a_creditar) * 2.00 AS reais
  FROM rankings_ciclo
 WHERE liquidado_em IS NULL AND senhas_a_creditar > 0;
```

### ⛔ Bloqueador: a dívida órfã

Em dry-run o handler consome a tarefa (fica `done`) **sem liquidar a dívida**.
E `enfileirar` só corre dentro do compare-and-set que transita `bonus_emitido`
de `false` para `true` — ou seja, **uma dívida só gera tarefa uma vez, no
instante em que nasce**.

Consequência: toda a dívida criada enquanto a flag estiver desligada fica
**permanentemente fora do alcance da fila**. Quando o operador ligar a emissão,
essas dívidas antigas não são pagas por ninguém — não há sweeper, não há
backfill, não há runbook. Achado da validação independente (MC93-C, Validador B).

**Antes de ligar a flag, é preciso re-enfileirar o que está em aberto.** A
consulta que as identifica:

```sql
SELECT ciclo_id, endereco, senhas_a_creditar
  FROM rankings_ciclo
 WHERE bonus_emitido = true
   AND liquidado_em IS NULL
   AND senhas_a_creditar > 0;
```

Para cada linha, uma tarefa `creditar-senhas-bonus` com
`{ cicloId, endereco, quantidade }`. Re-enfileirar é seguro: o handler valida
contra o livro-razão e o compare-and-set impede pagamento duplo.

⚠️ **Não está implementado.** É a primeira coisa a fazer no MC seguinte, antes
de qualquer activação.

### Outros pontos em aberto (validação independente)

- **`txHash` não é persistido.** Se o processo morrer entre a reclamação e a
  confirmação, não há prova de que a transação foi submetida — a reconciliação
  manual fica sem âncora.
- **`err.code` é descartado** no `catch`: uma tx revertida (`TX_REVERTED`) é
  tratada como qualquer outra falha e a dívida fica marcada como liquidada
  sem o ter sido.
- **`GET /ranking` é público** e, desde que se passou a gravar uma linha por
  participante (MC93-B), enumera e posiciona **todas as carteiras que
  licitaram** — o que enfraquece a razão declarada do anti-IDOR do `/feedback`.
  Decidir se o placar deve mostrar endereços completos ou mascarados.
- **A migração SQL tem cobertura de teste zero** — CHECKs, RLS e GRANTs só
  podem ser exercidos contra um PostgreSQL real.

### O que NÃO está feito

- **Não há limite global de emissão.** O limite é 1 bónus por ciclo por
  participante; nada trava o total. Com muitos ciclos, o custo acumula.
- **Não há notificação** ao operador quando se acumula dívida por liquidar
  (`_lib/notificacoes-usuario.mjs` está reservado ao bloco B2 do MC00.0).
- **Nada foi exercido contra o Supabase real nem contra a mainnet.**

---

## 4d. O contrato real, medido (MC93-D)

> Os três P0 do MC93-C nasceram todos da mesma causa: os duplos de teste foram
> escritos por quem escreveu o código e herdaram as suas suposições. Um duplo
> assim mede **coerência**, não **contrato**. Este secção regista o que foi
> medido contra software real.

### PostgREST — medido contra um servidor a sério

Supabase local (Postgres 17.6 + PostgREST), com a migração `20260923_mc93b_*`
**aplicada pela primeira vez**. Até aqui esse SQL tinha cobertura **zero**.

| O que se mediu | Resultado |
|---|---|
| `.eq(col, null)` numa `TIMESTAMPTZ` | **ERRO `22007 invalid input syntax`** — confirma o P0 do MC93-C |
| `.is(col, null)` | funciona (`is.null`) |
| `.eq(col, false)` num booleano | funciona (`eq.false`) — o CAS do `pontuacao-store` estava certo |
| compare-and-set real | a 1.ª reclamação devolve 1 linha, a 2.ª devolve **0** |
| upsert parcial | **preserva** as colunas não listadas no `ON CONFLICT` |
| CHECKs da migração | recusam endereço em maiúsculas, pontos negativos, liquidar sem bónus |

**Regra permanente do projeto:** para `IS NULL` usa-se `.is()`, nunca `.eq()`.
Há um teste que varre **toda** a árvore de produção e falha se algum ficheiro
voltar a usar `.eq(col, null)`.

> ⚠️ **`.select()` no fim do compare-and-set não é decoração.** Sem ele o
> PostgREST devolve `204` e `data: null`; o código conclui que perdeu a corrida
> e **o bónus nunca é concedido nem creditado**. Os duplos não viam isto porque
> devolviam as linhas na mesma. Há agora um guarda que exige `.select()` em
> todo o UPDATE de corrida cujo resultado seja lido.

### On-chain — o que foi medido, e o que não foi

**Não houve fork de mainnet.** `anvil`/`forge` estão ausentes e o `hardhat`
v3.4.0 está partido (o `@nomicfoundation/hardhat-ethers` instalado é da série 2).
O operador decidiu não instalar Foundry (R18, 2026-09-24), e a razão de mérito
é que o teste proposto não mediria o que dizia: **o handler está em dry-run e o
MC proíbe activá-lo**, logo não há "saldo emitido pelo handler" para exercer;
o que se mediria era o `Leilao.sol`, inalterado desde o MC60 e já coberto por
Foundry + Echidna no CI.

Em vez disso mede-se, sem nó:

- **Drift ABI ↔ `Leilao.sol`**: toda a função e todo o evento que o backend
  declara têm de existir no Solidity. ⚠️ Contando que uma variável de estado
  `public` gera um **getter implícito** — `saldoSenhas`, `coordenacao`,
  `edicaoNonce` e `resultados` são mappings/variáveis públicas, não funções.
- **A invariante `saldoEfetivo ≤ saldoOnChain`**: a fórmula de
  `saldo-senhas.mjs` tem de continuar subtractiva, e `senhas_a_creditar` não
  pode aparecer lá. É por isso que o bónus é **dívida**, não saldo.
- **A emissão está desarmada**: `emissaoArmada()` só aceita a string `"true"`.

Os dois testes de fork ficam **explicitamente saltados**, com a razão escrita.
Um `skip` justificado é honesto; um `skip` que finge cobertura não é.

### O sweeper da dívida órfã

Re-enfileira o que ficou por liquidar. Três decisões que o distinguem do que o
enunciado propunha:

1. **Critério de estado, não de idade.** O enunciado propunha
   `atualizado_em < now() - interval 'X'`. Em dry-run a tarefa é consumida no
   minuto seguinte ao nascimento — a dívida é órfã **e** recente. Uma janela
   esconderia o caso mais comum. (E a coluna chama-se `atualizado_em`;
   `updated_at` não existe.)
2. **No-op enquanto a emissão estiver desarmada.** Sem isto era um
   moto-contínuo: o handler em dry-run consome a tarefa sem liquidar, a dívida
   continua órfã, o sweeper reenfileira 5 minutos depois — **~51.840 linhas por
   dia** em `fila_tarefas`, medido pela validação independente. Re-enfileirar
   só faz sentido quando há quem liquide.
3. **`order` e `limit` no servidor, mais dedup contra a fila.** O PostgREST
   trunca em `db-max-rows` (1000): com `.slice()` no cliente, o total reportado
   mentiria. Sem ordenação não havia garantia de progresso. E como `enfileirar`
   é um INSERT puro sem deduplicação, o sweeper salta as dívidas que já têm
   tarefa por concluir.

### O que os duplos ainda NÃO medem

A validação independente mediu 16 métodos e encontrou **8 divergências, todas
na direcção permissiva**: `update` sem `.select()` (o real devolve `null`),
o tecto de 1000 linhas, `maybeSingle` com mais de uma linha (o real dá
`PGRST116`), `select("a,b")` a ser ignorado, upsert sem `onConflict`, upsert a
omitir colunas `NOT NULL`.

⚠️ E os testes de nível 2 — os únicos que exercem a migração — **estavam
saltados em CI**, porque o `ci.yml` não definia `SUPABASE_CONTRATO_URL/KEY`.
✅ **RESOLVIDO no MC93-E** — ver §4e.

---

## 4e. O CI que corre mesmo, e a EVM local (MC93-E)

O MC93-D deixou duas pendências nomeadas. Esta secção regista o que fechou cada
uma, e — mais importante — **o que continua por fechar e porquê**.

### ⛔ Pendência 1: os testes de contrato saltavam em CI

`ci.yml` não definia `SUPABASE_CONTRATO_URL`/`KEY`, logo os cinco testes
`SERVIDOR:` — **os únicos que exercem a migração `20260923_mc93b_pontuacoes.sql`** —
eram saltados em todos os PRs. Um verde silencioso durante um MC inteiro.

O job `test-functions` passou a levantar **Postgres 17** como `service:`, criar os
papéis que a migração pressupõe (`anon`, `authenticated`, `service_role`,
`authenticator`), aplicar a migração, e correr **PostgREST v12.2.3** com um JWT
de `service_role` assinado no próprio job.

> ⚠️ **O PostgREST NÃO é um `service:`, e a ordem é a razão.** Os papéis e a
> migração têm de existir **antes** de ele ligar e ler o schema; um `service:`
> arranca antes de qualquer passo. Fica num `docker run --network host`, depois.

**Medido:** sem servidor `# skipped 5`; com servidor `# skipped 0`. A suíte
completa nas condições do CI: **590 testes · 589 verdes · 0 falhas · 1 saltado**
(a base do MC93-D era 543 · 535 · 8).

> ⛔ **E o job não podia ficar verde, por uma razão que nada tinha a ver com
> isto.** Dois testes do MC30.2.1 fazem `mock.module("@aws-sdk/client-kms")`, e
> `mock.module` exige que o especificador RESOLVA. Esse pacote não está no
> lockfile das *functions* — resolve por subida de directórios a partir de
> `frontend/node_modules`. Em CI dava `ERR_MODULE_NOT_FOUND`. O job passou a
> fazer `npm ci` também no frontend, e há uma guarda que varre `_tests/*.mjs` e
> exige que **cada pacote importado venha de um lockfile que algum job instala**.

### A guarda que impede a regressão

Corrigir uma vez não chega — a configuração pode desaparecer num merge sem que
nada fique vermelho. Por isso há **duas** camadas:

1. um passo no próprio CI que lê o número de saltados e **falha** se não for 0;
2. `_tests/mc93e-ci-config.test.mjs`, que lê o `ci.yml` e exige o serviço, o
   `env:` no passo certo, a máscara do token, a migração existente, e que o
   `desafio-gut/scripts/ci-postgrest-local.sh` use **as mesmas imagens**.

> ⚠️ `--test-reporter=tap` está **fixado de propósito**. O repórter por defeito
> escreve `ℹ skipped N`, que o parse não apanha — a guarda ficaria vermelha para
> sempre. Medido.

> ⛔ **E contar saltos não chega.** Um `describe` saltado **não conta** em
> `# skipped` e os filhos nem são emitidos: medido, o gate via `skipped 0` com a
> EVM inteira por correr. O gate exige agora, **pelo nome**, o teste
> "saldo on-chain DECREMENTA" e o "CONTROLO NEGATIVO".
> Um `grep` por `adicionarSenhas` não servia: era satisfeito pelo teste de
> selectores, que nem toca na EVM.

### ⛔ Pendência 2: o cenário on-chain

`_tests/mc93e-fork-onchain.test.mjs` levanta uma **EVM em-processo** (chainId
31337), deploya o bytecode do `LeilaoGUT` e corre o cenário completo em ~2 s:

```
adicionarSenhas(participante, 20)  -> saldoSenhas == 20
abrirEdicao("R-MC93E", ...)
darLance("R-MC93E", 1234)          -> saldoSenhas == 19
controlo negativo: sem senhas      -> revert "Voce nao possui senhas disponiveis"
controlo positivo: com 1 senha     -> a MESMA chamada passa
```

### ⚠️ NÃO É UM FORK DE MAINNET — e a diferença importa

O enunciado pedia fork via `ALCHEMY_URL`. Medido no SEG-1: é uma **credencial**
(R5 proíbe), e sem credencial não há fork — `eth.llamarpc.com` devolve 525,
`cloudflare-eth.com` rate-limit, `rpc.ankr.com` 401.

⚠️ **Três endpoints é uma amostra estreita**, e a validação independente teve
razão em dizê-lo: a afirmação honesta é *"os três que testei recusaram"*, não
*"não existe RPC público utilizável"*. E o salto passou a ter **alavanca**: se o
operador definir `MAINNET_RPC_URL`, o teste corre e lê o bytecode de produção
(só `eth_getCode` — nunca transacção). Antes dizia "desbloqueia com autorização
do operador" e não havia mecanismo nenhum.

**Consequência que fica declarada:** isto exerce a **lógica** do contrato, não o
**bytecode realmente deployado** em `0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd`.
A deriva entre fonte e deployado continua **por medir**.

O que se cobre dessa lacuna são as **assinaturas** que o backend usa. E aqui há
uma armadilha que o teste do MC93-D não via **e a primeira versão deste também
não**: `topic0 = keccak(sighash)`, e o sighash **não inclui `indexed`, nem os
nomes, nem a mutabilidade**.

> ⛔ Tirar `indexed` de `LanceDado.lancador` **mantém o mesmo topic0**. Medido:
> a descodificação passa a devolver lançador errado, `valor: 0`,
> `repetido: true` — e **não lança excepção nenhuma**, porque
> `getLanceDadoEvents` lê `args[0..4]` por posição. Corrupção silenciosa.
> O teste compara agora `indexed`, os nomes dos parâmetros e a
> `stateMutability`, depois de casar o selector.

### ⚠️ Três verdades diferentes: node_modules, package.json, package-lock.json

| fonte | hardhat | edr | solc |
|---|---|---|---|
| `node_modules` (esta árvore) | 2.28.0 | next.17 | 0.8.26 |
| `package.json` | `^3.4.0` | — | — |
| **`package-lock.json` (o que o CI instala)** | **3.4.2** | **next.29** | **ausente** |

Reproduzido com `npm ci` numa pasta isolada. Por isso o arnês fala **só com a API
pública do EDR** (cujo `createProvider` é idêntico nas duas versões) e **nunca**
com `hardhat/internal/...`, que existe numa e não na outra.

E por isso o ABI+bytecode vivem numa **fixture versionada**
(`_tests/fixtures/leilao-gut.evm.json`): `artifacts/` está em `.gitignore`, logo
o CI nunca teria o artefacto compilado. A fixture guarda o **sha256 da fonte**, e
há um teste que falha se o `Leilao.sol` mudar sem ela ser regenerada
(`node scripts/gerar-fixture-evm.cjs`).

> ⚠️ Mas o sha256 cobre só a **fonte**. O que ligava a fixture ao seu próprio
> ABI era a recompilação com `solc` — que **salta em CI**, porque o `solc` não
> vem no `package-lock.json`. Editar o ABI da fixture à mão passava despercebido.
> Fechado sem acrescentar dependência: o **selector de cada função do ABI tem de
> aparecer literalmente no bytecode** da própria fixture (é assim que o
> despachante do Solidity funciona). Adulterar só os `settings` continua
> invisível em CI — pendência nomeada.

### Os saltos, corrigidos (R15)

Dois dos três saltos "FORK" do MC93-D deixaram de existir — o trabalho foi feito.
O terceiro mudou de razão, porque foi **medido**:

> "POR FAZER" ⇒ **"BLOQUEADO PELA R5"**. Ler a mainnet exige um RPC com
> credencial. Não é falta de trabalho; desbloqueia com uma **decisão do
> operador** (autorizar um RPC de leitura), não com código.

### O que continua por fazer

1. ⛔ **Deriva entre `contracts/Leilao.sol` e o bytecode em mainnet** — só um fork
   a mede. Desbloqueia com `MAINNET_RPC_URL` autorizado pelo operador.
2. ⛔ **O `ci.yml` nunca correu num runner do GitHub.** Foi validado com o
   equivalente local (`ci-postgrest-local.sh`, mesmas imagens) e com um teste que
   impede os dois de divergirem; `act` não está instalado nesta máquina.
   Por provar: `${{ env.X }}` dentro de `run`, `$GITHUB_ENV` entre passos,
   `if: always()`, e `--network host` a alcançar um `services:` mapeado.
3. ⚠️ Adulterar os `settings` da fixture continua invisível em CI — fecha-se com
   `npm i -D solc@0.8.26` na raiz de `desafio-gut/` e `saltados == 0`.
4. Antes de activar a emissão: migração em produção + R2 reativada.

## 4f. A UI do torneio, dentro de "Meus Ativos" (MC94)

Decisão do operador: **tudo numa só tela**, a que o utilizador já conhece. Sem
rota nova, sem página nova, sem tocar na navegação. As secções entram **entre as
estatísticas e o histórico**, e nada do que já existia foi removido ou reordenado.

⚠️ **DUAS validações independentes, ambas REPROVADO.** A maioria dos defeitos
descritos abaixo foi encontrada por elas, não por mim, e os números válidos são os
desta versão. Ver `_logs/MC94_SEG4_EXECUTOR.txt`.

### As cinco secções

| secção | fonte | o que mostra |
|---|---|---|
| `PainelTorneio` | `GET /ranking?recurso=feedback` | posição · pontos · acertos |
| `ProgressoBonus` | idem (`sequenciaAtual`, `faltamParaBonus`) | barra N/5 e quantos faltam |
| `EstadoBonus` | idem (`senhasACreditar`, `bonusEmitido`, `liquidado`) | senhas a creditar, pendente vs liquidado |
| `FeedbackLance` | `lances` do `AppContext` | quanto cada lance **vale** pela regra |
| `RankingCiclo` | `GET /ranking?cicloId=` (público) | top 10 + a própria posição |

Todos **apresentacionais**: recebem dados por props e não fazem I/O. O I/O vive em
`useRanking` e `useFeedback`, que usam o helper `apiGet` — e por isso herdam o
shim de origem do APK sem alteração a `apiOrigin.js`.

### ⛔ CADA SECÇÃO PESSOAL TEM QUATRO ESTADOS, E ISSO NÃO É ZELO

A primeira versão tinha **um** estado — "com dados" — nas três secções pessoais.
Consequência, observada em produção: um utilizador **anónimo** lia

> `0 / 5 acertos seguidos · Faltam 5 acertos`
> `Nenhum bónus conquistado neste ciclo`

— duas afirmações de facto sobre uma pessoa que a app **não identificou**. E uma
falha de rede produzia exactamente o mesmo texto. Um zero inventado é pior do que
um aviso, porque o utilizador **acredita nele**: vê "0 pontos" e conclui que não
pontuou, quando o que aconteceu foi o endpoint não responder.

Os quatro estados são portanto obrigatórios em `PainelTorneio`, `ProgressoBonus` e
`EstadoBonus`, e cada um marca-se no markup com `data-estado`:

| estado | quando | `data-estado` |
|---|---|---|
| sem sessão | `semSessao` do hook (inclui 401 e 403) | `sem-sessao` |
| erro | `erro` do hook | `erro` |
| a carregar | pedido em curso | `carregando` |
| com dados | resposta válida | `dados` |

> `PainelTorneio` tem um quinto, `sem-dados`: **"a carregar" e "não há dados"
> estavam colapsados na mesma frase**, e um `feedback` nulo sem erro mostrava
> "A carregar a sua pontuação…" **para sempre**. Um indicador de espera que nunca
> acaba é uma afirmação falsa sobre o que o sistema está a fazer.

O `data-estado` não é decoração: é por ele que os testes da **página** provam que
o `erro`, o `carregando` e o `semSessao` chegam mesmo às três secções. Sem esse
marcador, a única alternativa era procurar prosa por regex — e este projeto já foi
mordido três vezes por asserções que leem comentários em vez de código.

### ⛔ ESTA SECÇÃO NÃO DECLARA "BÓNUS CONQUISTADO"

`ProgressoBonus` derivava-o de uma conta **local** (`faltam === 0`) e escrevia
"Bónus conquistado!". Ao lado, `EstadoBonus` lia `bonusEmitido` do livro-razão e
escrevia "Nenhum bónus conquistado neste ciclo". **As duas frases apareciam na
mesma página, uma por cima da outra.** Só o backend pode afirmar que há bónus —
a concessão tem um cadeado de três condições (§4c) e custa senhas reais.

Hoje `ProgressoBonus` diz que a **sequência** está completa, que é o que esta
secção observa, e remete a confirmação para a coordenação. Há um teste na página
inteira que falha se as duas secções voltarem a contradizer-se.

### ⚠️ A palavra "saldo" é proibida nestas secções

`senhasACreditar` é um **direito por liquidar**. O saldo que autoriza um lance é
`saldoSenhas` **no contrato** (`Leilao.sol:88` exige `> 0` e decrementa em `:107`).
Chamar-lhe saldo faria o utilizador tentar licitar e a transacção reverteria — é
exactamente o que o MC93-B evitou ao escolher "direito, liquidação depois".

> Há **dois** testes a garanti-lo: um no componente (nos cinco estados) e um na
> página inteira, para que ninguém a introduza num título ao juntar as secções.

E `liquidado` chega **`undefined`** quando não há linha (o default `vazio` de
`lerFeedback` não inclui o campo). Tratado explicitamente como **pendente**: dizer
"já creditado" sem saber é a única leitura que causa prejuízo. `liquidado === true`,
nunca `Boolean(liquidado)`.

### ⚠️ "Vale", nunca "ganhou"

Medido: **nenhum endpoint devolve pontos por lance**. A pontuação é atribuída pelo
backend no fecho da rodada. `FeedbackLance` mostra a **projecção pela regra**
(único = 1, menor único = 3, repetido = 0) e diz que o menor único da rodada
depende dos lances de todos. Há um teste que falha se alguém trocar a palavra.

### ⛔ `Number(null) === 0` chegou ao ecrã — outra vez

O MC93-A pagou esta armadilha no motor (`Number.isInteger(Number(null))` é `true`
→ lance nulo eleito vencedor). Eu reproduzi-a na UI e a validação independente
apanhou-a: um lance com `valor: null` aparecia como

> `R$ 0,00 · menor único seu · vale 3 pontos`

E há caminho real para o `null`: `_lib/data-store-supabase.mjs` grava
`valor_centavos = null` **de propósito** para marcar lance inválido.

`_estilo.js` tem agora duas guardas **sem coerção**, e é por elas que passa tudo o
que vai ao ecrã:

| função | recusa | devolve |
|---|---|---|
| `valorUtilizavel(c)` | não-número, `NaN`, `Infinity`, negativo, string | `boolean` |
| `reais(c)` | o mesmo | `"—"`, nunca `"R$ 0,00"` |
| `inteiroSeguro(n)` | o mesmo + fraccionários + `> 2^53` | `number \| null` |

`inteiroSeguro` nasceu do mesmo achado do outro lado: `senhasACreditar: Infinity`
renderizava **"Infinity senhas"** e `1e21` renderizava **"1e+21 senhas"**, porque
`Number(x) || 0` deixa ambos passar.

### ⚠️ Com empate no menor valor, marcam-se TODOS os empatados

A versão anterior escolhia um arbitrariamente, e a tela mostrava dois lances de
`R$ 1,00` lado a lado — um a "vale 3 pontos", o outro a "vale 1 ponto". Quem
desempata de facto é o backend, no fecho (§4b: desempate por **mais acertos**).

### ⚠️ A posição e a contagem são as do backend, não as da lista

Três defeitos na mesma secção, todos de assumir que a lista *é* a verdade:

1. `posicao: null` (o `lerFeedback` devolve `linha.posicao || null`) renderizava um
   **"º" solto**, e `posicao: 0` renderizava **"0º"**. Hoje cai-se na ordem da lista.
2. `pontosTotais` ausente renderizava **`0`** — um zero inventado. Hoje mostra `—`.
3. `total` vem do endpoint e `useRanking` faz `Number(data?.total) || 0`: um
   endpoint que o omita escrevia **"0 participantes."** por baixo de 4 linhas
   visíveis. Reconcilia-se com `Math.max(total, lista.length)`.

> ⛔ E o (3) sobreviveu à primeira correcção. Calculei `totalReal` e apliquei-o
> **só ao ramo** "a mostrar os N primeiros de M" — o ramo `else`, que é o caso
> **comum** (menos de 10 participantes), continuava a escrever `total` cru. É o
> mesmo padrão do MC93-E: aplicar a lição a metade dos sítios e o teste de
> configuração passar verde com a assimetria dentro. Encontrado por mim, ao
> escrever o teste antes de olhar para o código.

### ⛔ O `index.html` com status 200 passava por resposta válida

`netlify.toml:34` reescreve `/*` para `/index.html` com **status 200**. Uma função
ausente, mal deployada ou inalcançável (o caso do APK, onde a origem é
`https://localhost`) devolve **HTML com 200**, e o `apiGet` devolve
`{ ok: true, data: null }` porque o `JSON.parse` falhou.

Os dois hooks aceitavam isso: `useRanking` mostrava "Ainda não há pontuações neste
ciclo" e `useFeedback` mostrava a secção pessoal vazia — **com o backend em baixo**.
É a regra que o MC93-F já tinha registado (validar por corpo JSON, nunca pelo
código HTTP) aplicada onde faltava. Hoje: `!ok || !corpoEhJson(data)` → erro.

### ⚠️ 401 e 403 não são erros de rede

O endpoint aplica o anti-IDOR do MC93-B: sem `Bearer` responde **401
`sessao_invalida`**, com sessão de outro endereço responde **403 `acesso_negado`**.
"Não tens sessão" e "não consegui ligar" pedem acções **opostas** ao utilizador, e
por isso `useFeedback` mapeia ambos para `semSessao`, não para `erro`. E não chama
nada sem `endereco` **e** `token` — poupa um 401 certo.

### `EvolucaoPontos` não foi entregue, e a razão está medida

O enunciado condicionava-o a "se o SEG-1 atestar que há dados". Medido via MCP:
`pontuacoes` tem **0 linhas** em produção e **0 ciclos distintos**. Não há série
temporal para desenhar. Fica para quando houver rodadas processadas.

### Como isto é testado sem runner de React — dois instrumentos

O frontend **não tem** vitest, jest, Testing Library nem jsdom, e nenhum se
instalou: o MC93-G mediu que `npm install --legacy-peer-deps` (o comando do
`netlify.toml` e do `build:apk`) **reverte o `package-lock.json` em silêncio**.
Medido também neste MC: `jsdom` · `linkedom` · `happy-dom` ·
`react-test-renderer` · `@testing-library/react` → **todos ausentes**.

**1. Renderização** (`__tests__/_render.mjs`): **`vite` transpila o JSX** e
**`react-dom/server` renderiza sem DOM**. Renderização real — corpo do componente,
props, ramos condicionais, filhos. O que não corre são efeitos e eventos.

**2. Hooks a correr** (`src/hooks/__tests__/_hook-runner.mjs`): toda a lógica dos
hooks vive num `useEffect`, que em SSR **nunca corre**. O condutor instala um
despachante próprio em `ReactCurrentDispatcher` e chama a função-hook directamente,
com `useState`/`useEffect` reais do lado do hook: a ordem das chamadas, o corpo do
efeito, o `AbortController`, o array de dependências e a limpeza são os do projeto.

> ⚠️ **O duplo é de `fetch`, NÃO de `apiGet`** — de propósito. O que corre é o
> `apiGet` verdadeiro: a montagem do `Authorization: Bearer`, o `BASE` das Netlify
> Functions, a leitura do corpo **uma** vez e o mapeamento
> `{ok, status, data, text, headers}`. Este projeto pagou duas vezes por duplos
> permissivos (MC93-B: mock que ignorava o argumento deu verde a um endpoint
> avariado a 100%; MC93-C: duplo que aceitava `.eq(col,null)`). Um duplo de
> `apiGet` teria escondido exactamente o defeito do `index.html` com 200.

> ⚠️ **O limite, declarado:** a comparação de dependências e o agendamento do
> re-render são implementados no condutor, não pelo React. Um erro meu ali daria
> verde a um hook com deps erradas. É por isso que a suíte abre com **quatro
> controlos positivos** — deps `[]`, deps corretas, efeito sem limpeza, e um
> `fetch` que honra o `AbortSignal` — que partem coisas de propósito e **têm** de
> ser vistos. Se um deles passar, o instrumento é cego e o resto não vale nada.

O teste da página troca `AppContext`, `IdiomaContext`, os dois hooks e o
`BotaoLoginPrincipal` (que arrasta 2,68 MB de Privy e estoura a heap em SSR) por
duplos, via `resolve.alias` do Vite — **sem alterar ficheiro nenhum do projeto**.

> ⚠️ **O duplo dos hooks REGISTA os argumentos.** A primeira versão ignorava-os, e
> por isso uma página que se esquecesse de ligar `address` ou `authToken` passava
> **todos** os testes: o componente correcto, ligado a `undefined`, renderiza o
> estado "sem dados" e a suíte fica verde. Os testes de **cablagem** existem por
> causa disso, e são o que mata os achados V22/V23/V24 da validação independente.

### ⛔ ERRATA: a minha afirmação sobre a concorrência dos testes era falsa

`_render.mjs` dizia: *"cada ficheiro levanta o SEU servidor Vite; em paralelo
colidem e os dois ficheiros falham — medido `# fail 2`"*. **Remedido:** os três
ficheiros do MC94 em paralelo, sem `--test-concurrency=1`, dão **91/91 verdes, 3
corridas de 3**. Não há colisão nenhuma.

O `# fail 2` foi real, mas a **causa** que lhe atribuí não: na altura o teste da
página importava o `BotaoLoginPrincipal` sem duplo e estourava a heap; dois
ficheiros em paralelo duplicavam o consumo. Diagnostiquei "colisão" a partir de
**uma** observação e de um palpite — o mesmo erro que o MC93-E já me tinha
apanhado a fazer com a cache do ethers. A série continua a ser preferível, mas por
outra razão (o pico de memória é a soma), e isso é uma escolha de recursos, não a
correcção de um defeito.

### ⛔ A 2.ª VALIDAÇÃO INDEPENDENTE TAMBÉM REPROVOU — e o padrão é sempre o mesmo

Dois ⛔, ambos alcançáveis em produção, ambos a **mesma** falta que a 1.ª ronda já
tinha apanhado noutro sítio: **afirmar um facto sobre uma pessoa que a app não
identificou**.

| | defeito | onde estava a lição |
|---|---|---|
| ⛔1 | `FeedbackLance` não tinha estado de sessão: dizia a um **anónimo** "Ainda não há lances seus nesta edição.", ao lado de três secções a dizer "Entre na sua conta" | aplicada a 3 das 4 secções pessoais |
| ⛔2 | A **janela do `authToken`**: `useFeedback` devolve `semSessao` sem token, e a página lia isso como "não tens sessão" — mandava entrar quem já tinha entrado **e** mostrava-lhe os lances dele ao lado | `AppContext.jsx:937` já documentava que o `address` chega ~2 s antes do token; o MC88.39 já corrigira isto para o saldo em R$ |

O ⛔1 estava na **captura de produção que eu próprio tirei e olhei**
(`_logs/MC94_captura-producao-1a-ronda-68a09a5.png`). Olhar não é ver: a captura só
serve se alguém a confrontar com uma regra, e a regra estava escrita nesta mesma
secção.

**"Sem sessão" e "sessão sem token ainda" são estados diferentes.** Quem sabe se há
sessão é o contexto (`isConnected` + `address`), não o hook. A espera pelo token é
o que é — **estar a carregar** — e é assim que o resto da app já a trata
(`AppContext.jsx:458`).

### ⛔ "Sequência completa" era CÓDIGO MORTO — e o ecrã mentia a quem fechava a série

`_lib/pontuacao-store.mjs:314` calcula `faltam = max(0, 5 - (sequenciaAtual % 5))`,
cujo domínio é **[1..5] — nunca 0**. Medido: `sequencia=5 -> faltam=5`. Como o
componente decidia "completa" por `faltam === 0`, o ramo era inalcançável **e** quem
completava cinco acertos lia:

> `0 / 5 acertos seguidos · Faltam 5 acertos`

— a app a dizer-lhe que não tem acertos nenhuns no instante exacto em que fechou a
série. Hoje deriva-se de `sequenciaAtual`, que é o número do **próprio backend**;
derivar a posição dentro do ciclo (`% alvo`) é aritmética de apresentação, não
recalcular a regra. O backend é de outro MC e não foi tocado.

### ⚠️ Três "meias correcções" — a lição aplicada a alguns sítios e não a todos

1. `inteiroSeguro` chegou ao `EstadoBonus` e ao `RankingCiclo` na 1.ª ronda, e não
   ao `PainelTorneio`: `{posicao: 1.5, pontosTotais: Infinity}` renderizava
   **"1.5º · Infinity Pontos · 1e+21 Acertos"**.
2. O 5.º estado `sem-dados` (o spinner que nunca acaba) foi separado no
   `PainelTorneio` e não no `ProgressoBonus`.
3. `valorUtilizavel` exigia "finito" enquanto `inteiroSeguro` exigia inteiro
   seguro: `reais(3.7)` dava `"R$ 0,04"`. Um lance é em **centavos**.

É o mesmo padrão do `if: always()` do MC93-E, e agora com três instâncias num só MC.

### ⛔ O instrumento tinha um ponto cego que tornava duas asserções minhas vácuas

O condutor de hooks **engolia** as escritas de estado posteriores ao desmonte
(`if (desmontado) return` no agendamento). Logo `resultado()` nunca podia reflectir
uma fuga, e dois testes que diziam "não escreveu estado depois de desmontar" **não
podiam falhar**. O 3.º controlo positivo cobria a metade errada: afirmava que o
temporizador disparou, não que a escrita era **observável**.

E a minha primeira tentativa de corrigir isto também não matava o mutante, pela
mesma razão: os testes de desmonte usavam respostas **lentas**, que o `abort`
rejeita, e o `catch` do `AbortError` tratava tudo. A janela real é a outra — a
resposta **chega**, e só depois o componente desmonta. O duplo passou a saber
exprimi-la (`aposResposta`), e o mutante morre.

### ⚠️ O dicionário divergia do fallback — e é o fallback que os testes leem

`ativos.lance.aviso` tinha **"Projecção"** no fallback e **"Projeção"** no
dicionário. Parece cosmético e não é: todos os testes de componente renderizam com
`T_PADRAO`, que devolve o **fallback** — a suíte media um texto e o utilizador lia
outro. Havia ainda `ativos.bonus.completo`, **órfã nos três idiomas**, a guardar
exactamente a frase ("bónus conquistado!") que esta secção proíbe.

E o **dialecto**: medido, a app é **pt-BR** (`Carregando` 93× vs `A carregar` 3×;
`bônus` em 3 ficheiros vs `bónus` em 1, que era o meu). A minha copy nova era a
única em pt-PT, no mesmo ecrã que "Nenhum lance registrado". Corrigida.

A correcção estrutural é `src/i18n/__tests__/ativos-i18n.test.mjs`: as entradas `pt`
são geradas a partir dos fallbacks e há uma guarda que exige que continuem iguais,
que não haja chaves órfãs nem em falta nos três idiomas, que nenhuma declare o bónus
e que nenhuma use a palavra "saldo".

### ⛔ ERRATA: o comentário sobre o `apiGet` e a origem do APK era falso

Dizia-se que se usa `apiGet` "porque é ele que aplica a origem correcta no APK
(`src/lib/apiOrigin.js`)". **`src/lib/api.js` nunca importa `apiOrigin.js`** e faz
`fetch` com caminho relativo; quem reescreve a origem é um patch do `fetch`
**global**, instalado em `main.jsx`. Um `fetch` cru teria o mesmo tratamento.
Quarta vez neste projeto que um comentário meu satisfaz a asserção do autor. A
escolha de `apiGet` continua certa, por outra razão: exercita o contrato partilhado
de headers e de parse.

### Estado final

**137 testes · 137 verdes.** Mutação: **64 mutantes, 63 mortos**; o único
sobrevivente era **equivalente por redundância minha** (um ternário cujo ramo nunca
chegava ao ecrã), e a redundância saiu do código em vez de se fingir que morria.

> ⚠️ **Os 137 testes NÃO são um portão.** O `ci.yml` só corre
> `netlify/functions/_tests/*.test.mjs`; nenhum workflow corre a suíte do frontend.
> Não é regressão — o HARD GATE 5 proibia tocar no `ci.yml` — mas "137 verdes" é
> uma medição, não protecção contínua. Fica para um MC que possa alterar a CI.

### Achado não corrigido: o formato de moeda divergente

A tela existente formata o "Menor Lance" com `.toFixed(2)` e mostra **`R$ 1.00`**
— ponto, não vírgula. Está errado para pt-BR, mas é o comportamento actual e o
HARD GATE 5 manda não o alterar. As secções novas usam `R$ 1,00`. **A divergência
fica registada para o MC97** (copy).

### O que um teste não vê

O fundo das secções foi um defeito **encontrado só na captura de ecrã**: a primeira
versão usava `rgba(255,255,255,0.02)` e a ilustração de fundo do app atravessava o
texto. O markup estava correcto, por isso **nenhum teste falhou** — e a minha
segunda tentativa inventou `rgba(5,8,24,0.82)`, que continua a deixar passar os
electrodomésticos brancos. O valor certo já existia no projeto:
`.gut-glass--solid` = `rgba(13,18,53,0.92)` (`globals.css:429`, MC25.7, reutilizado
no MC89.4 pelo mesmo sintoma).

Depois de a captura ver, prende-se: há agora um bloco de testes que exige o vidro
sólido nas cinco secções, proíbe `backdrop-filter` (o custo é por **camada** —
medido: 11 camadas custaram 29 fps) e fixa o roxo `#a78bfa` como cor semântica de
senhas. Um teste não descobre isto; depois de descoberto, guarda-o.

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
