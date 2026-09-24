# Torneio de habilidade — especificação do motor de pontuação

> **Origem:** MC93-A (2026-09-23) · **Estado:** motor puro implementado; persistência, endpoints e emissão de senhas **por fazer** (MC93-B).
> **Código:** `desafio-gut/frontend/netlify/functions/_lib/pontuacao-utils.mjs`
> **Testes:** `desafio-gut/frontend/netlify/functions/_tests/mc93-pontuacao.test.mjs`

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
