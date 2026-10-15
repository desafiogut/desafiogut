# UTAC110h.3 — PENDÊNCIAS FECHADAS (P1–P5) + TESTE DO `Boot.jsx`
> Baseline `9117402` (pós-110h.2) → commit `3d72419`. Suíte: **1108/1108** (frontend) · **1253/1259** (backend).
> Leitura prévia obrigatória: `_logs/UTAC110h.3_SEG-1_MEDICAO.md` (medição, inventário, conflitos).

---

## 1. O que este UTAC fecha

| pendência | origem | estado |
|---|---|---|
| **P1 / DEBT-028** — contador de recompensa na UI | 110h.2 (o card mostrava a recompensa em texto, sem número) | **FECHADA** |
| **P2 / DEBT-029** — relatório admin dizia «Senhas creditadas» | 110h.2 (vocabulário legado) | **FECHADA** |
| **P3** — «torneio» em comentários internos | 110h.2 (varredura de higiene) | **FECHADA** |
| **P4** — data da Privacidade desactualizada | 110h.2 | **FECHADA** |
| **P5 / DEBT-025** — bug dos endereços mascarados (bónus on-chain morto desde o MC87) | 110h.2 (medido pelo validador) | **FECHADA** |
| **F** — `Boot.jsx` sem teste de comportamento (X7 do 110h.1) | 110h.1 | **FECHADA** |
| **P6** — migração `20261014` em produção | 110h.2 (sonda P6 do validador) | **ENTREGUE AO OPERADOR** (SQL de leitura) |

---

## 2. FRENTE A (P1) — contador de indicações do mês

**Onde o número passou a existir — e porquê ali.** O painel mostrava a recompensa só em TEXTO porque não
havia contador: nem no `ler-pontos`, nem no endpoint de referral. Em vez de inventar uma contagem nova
(que poderia divergir da do servidor), extraiu-se para **fonte única** a conta que o `creditarIndicacao`
**já** fazia para aplicar o limite de 10/mês:

| peça | onde | papel |
|---|---|---|
| `indicacoesDoMes(registo, agora)` | `netlify/functions/_lib/fontes-lance.mjs` | **PURA**. Conta as entradas de `historico_lance` com `motivo === "indicacao"`, `ref` a começar por `"indicacao:"` e **mês UTC** corrente. Devolve `{mes, creditadas, limite}` |
| `creditarIndicacao` | mesmo ficheiro | passou a **usar** `indicacoesDoMes` para decidir o limite (antes tinha a filtragem inline — duas cópias da mesma regra) |
| `indicacoesMes` | `netlify/functions/ler-pontos.mjs` | campo **aditivo** na resposta (os campos antigos ficam iguais); **fail-soft → `null`** |
| «Este mês: X / 10 indicações» | `src/components/PainelIndicacao.jsx` | 3.º card; o painel passa a buscar `ler-pontos` **em paralelo** com o `/referral` (`Promise.all`), e se falhar esconde-se a linha |

**Custo declarado:** o painel faz **2 pedidos** em paralelo onde fazia 1 (o `ler-pontos` é o mesmo
endpoint que a Carteira já usa para as «Missões de hoje»). Alternativas rejeitadas: campo novo no endpoint
de referral (criaria uma 2.ª fonte da mesma conta) e prop-drilling pela `MinhaCarteira` (o painel ficaria
dependente de quem o monta).

**Provas:** `_tests/utac110h3-pendencias.test.mjs` (unitário: 2 no mês corrente, ignora mês anterior,
ignora `indicacao-recebida` do indicado e login; endpoint: 0 → 1 após indicação real, e o **indicado** conta
0) e `src/__tests__/utac110h3-pendencias-front.test.mjs` (render com os **hooks reais** em **0, 5 e 10** —
o `_hook-runner` é o que permite exercer o `useEffect`, que em SSR não corre — e o **fail-soft**: com o
endpoint em baixo, nenhum número inventado e o código de indicação continua visível).

---

## 3. FRENTE B (P2) — vocabulário do relatório admin

- `_lib/referral.mjs`: «Senhas creditadas: N» → **«Recompensas on-chain creditadas: N»**. Comentários
  alinhados (docstring + o cálculo).
- **O campo `senhasCreditadas` MANTÉM-SE** — é **chave da resposta**, consumida por `notificacoes.mjs:163`
  e amarrada por `_tests/test-conversao-e2e-mc1581.mjs:102` (`=== 4`). Numeração, aritmética e limite
  mensal intactos (Ponytail + HI9: não se mexe em chaves por causa de vocabulário).
- **Escolha do rótulo (declarada):** o número conta os **créditos on-chain** (+1 indicado, +1 indicador),
  não pontos — e depois do P5 são **transacções a sério**. «Pontos de fidelidade creditados» seria
  **falso**; «Recompensas on-chain creditadas» é o que o número mede.
- **NÃO se tocou** em `src/hooks/useTrocarPorSenhas.js:72` («✓ N senhas creditadas on-chain»): é o
  Passe/on-chain a sério, outro contexto.

---

## 4. FRENTE C (P3) — «torneio»

20 substituições (vocabulário → «competição») em **14 ficheiros de produção**, cada uma com âncora
verificada a casar **exactamente 1×** (`git diff --stat` confere). Ficaram **intocados, por desenho** — e
cada um por uma razão diferente:

| ficou | porquê |
|---|---|
| `isTorneioVisivel` (`recursos-app-config.mjs:29`, `useRecursosApp.js:34`) | **chave** de configuração/API (HI9) |
| `ativos.torneio.*` (7 chaves em `pt.js`) | **chaves** de i18n — o R18-110h.3-3 permite-as; os **valores** já dizem «Competição» (110h.1) |
| `PainelTorneio` (componente, `import` em `MeusAtivos.jsx`, referências em `ProgressoBonus.jsx`) | **identificador** — renomear partiria consumidores e testes |
| `data-secao="painel-torneio"` | **chave** de DOM, amarrada por testes |
| `guto-perfis.mjs:84,109,200` | **anotação histórica**: registam que «torneio» e «senhas» SAÍRAM. Apagar seria apagar a prova (doutrina «manter à vista») |
| ficheiros de `_tests/` | **GATE 15**: não se reescrevem testes de UTACs fechados por cosmética |

---

## 5. FRENTE D (P4) — data da Privacidade

`src/pages/Privacidade.jsx:45`: «15 de agosto de 2026» → **«15 de outubro de 2026»** (formato longo, o do
ficheiro). A linha `:288` fala da data em abstracto e **não** se toca.

---

## 6. FRENTE E (P5) — o bug dos endereços mascarados (DEBT-025)

### 6.1 O defeito, medido
O commit `0ec7d13` («fix(security): … P3 logs mascarados») pôs `mascararEndereco()` **nos argumentos** do
`registrarConversao`, no **endpoint** `netlify/functions/referral.mjs`:

```js
// ANTES (bug)            registrarConversao({ codigo, indicador: mascararEndereco(r.indicador), indicado: mascararEndereco(endereco) })
// DEPOIS                 registrarConversao({ codigo, indicador: r.indicador,               indicado: endereco })
```
O `console.log` **continua** a mascarar — que era o objectivo original.

### 6.2 A cadeia do dano (medida, não suposta)
`concederBonus(indicador)` valida `/^0x[a-f0-9]{40}$/` → com «0x1234…abcd» devolve **`endereco_invalido`**
→ `registrarConversao` faz `return bonus` **antes** de marcar convertido ⇒ (a) **nunca** creditava a senha
on-chain, (b) **nunca** gravava `referral-convertido:{codigo}:{indicado}`, (c) **nunca** gravava o log de
conversão nem a indução agrupada do GUTO. O caminho do `comprar-senhas.mjs:353` (que passa o vínculo REAL)
sempre funcionou — o morto era o caminho **normal**, o do registo.

### 6.3 O que a correcção faz — e o que custa
- `creditarSenhas` passa a ser chamada **2× por indicação confirmada** (+1 ao indicador, +1 ao indicado),
  com os endereços verdadeiros.
- ⚠️ **GAS REAL**: na **Ethereum mainnet** (activa desde o MC60), pago pela carteira de coordenação.
  Não é medível sem transaccionar (proibido) ⇒ **flag ao operador** (CONFLITO 2 do SEG-1). Se o gasto tiver
  de ser limitado, as opções são tecto mensal, lote, ou manter o bónus só no `comprar-senhas`.
- **O contrato NÃO foi tocado** — medido: `creditarSenhas(endereco, qtd)` não valida endereços; o defeito
  era só do argumento mascarado. A autorização «`contract.mjs` se necessário» **não foi necessária**.
- **Nenhum teste gasta gas**: `_lib/contract.mjs` é sempre um **duplo espiado** nos testes
  (`creditos.push`), e um `relatorioDeGas()` explícito falha se algum endereço capturado não tiver a forma
  real. Prova bidireccional: com os endereços mascarados (o bug), a conversão devolve
  `endereco_invalido` e o contrato recebe **zero** chamadas.

### 6.4 ⚠️ DESVIO DECLARADO (a autorização apontava para o ficheiro errado)
A §4-110h.3 autoriza editar `netlify/functions/_lib/referral.mjs` «(P5 — corrigir endereços mascarados)».
**Medido:** o `_lib/referral.mjs` **não mascara nada** — recebe o que lhe dão; o mascaramento vive no
**chamador** (`netlify/functions/referral.mjs:160`). Não existe forma de corrigir o bug sem tocar no
endpoint, e o **R18-110h.3-5** ordena a correcção ⇒ executou-se a **intenção** no sítio correcto.
Precedente da mesma família de erro: **R18-110h.2-A**. Registado no R14.

---

## 7. FRENTE F — teste de comportamento do `Boot.jsx`

`src/__tests__/utac110h3-boot-comportamento.test.mjs` — SSR real do componente, com o storage simulado:

| estado | esperado | prova |
|---|---|---|
| sem consentimento | **GATE** | ✔ |
| aceite na versão **corrente** | **app** (gate fora do caminho) | ✔ |
| aceite numa versão **antiga** | **GATE** outra vez (MC88.31: subir a versão obriga a re-aceitar) | ✔ **bidireccional** |
| só `sessionStorage` | **app** (compatibilidade) | ✔ |
| JSON corrompido | **GATE** (fail-closed, sem lançar) | ✔ |
| `aceito:true` sem `versao` | **GATE** | ✔ |
| arranque leve (MC82.2) | `PrivyRoot` continua em `import()` **dinâmico** + `lazy()` | ✔ |

**Controlo positivo** dentro do ficheiro: o instrumento tem de distinguir «gate» de «app» — se não
distinguisse, o teste passaria por acidente. **LIMITE DECLARADO:** em SSR o `useEffect` não corre, logo o
carregamento do Sentry (`requestIdleCallback`) e o `import()` do PrivyRoot **não** são exercidos (prova-se a
**decisão** do arranque, não o carregamento).

---

## 8. FRENTE G (P6) — SQL de verificação (para o OPERADOR)

`_logs/UTAC110h.3_VERIFICACAO-P6.sql` — **7 consultas de LEITURA**, com o resultado esperado indicado em
cada uma e instruções do que fazer. **O Hermes NÃO corre SQL** (não toca em Supabase). Serve para confirmar
que a migração `20261014_utac110e_eco_quildo.sql` está aplicada em produção — sem ela, o ECOQUILDO fica
**inerte em silêncio** (é o modo fail-closed do lastro, medido pela sonda P6 do validador do 110h.2).

---

## 9. Verificação (SEG7)

| item | medido |
|---|---|
| Suíte canónica (`node scripts/mc966-suite-harness.mjs ambos`) | **frontend 1108/1108** · **backend 1255/1261** · **VEREDITO VERDE** |
| Baseline | 1092/1092 · 1247/1253 (re-medido no SEG-1) ⇒ **+16 e +8** |
| Testes novos | **33** (8 backend P1/P2/P5 + 8 front P1/P3/P4 + 8 Boot + 9 de suporte/asserções) |
| Prova de mutação (GATE 7) | `_tests/utac110h3-prova-mutacao.mjs` → **16/16 PROVADOS**, md5 restaurado em todos |
| Bidireccionais | P1 (0/5/10 + fail-soft), P2 (rótulo novo vs antigo + campo), P3 (vocabulário vs chave + controlo negativo do filtro), P4 (data nova vs antiga), P5 (endereços reais vs mascarados), F (6 estados, incluindo a versão antiga) |
| Capturas | `_logs/utac110h.3-browser/{painel-indicacao-contador,privacidade-data}-{375,1280}.png` — contador «Este mês: 5 / 10 indicações» e «15 de outubro de 2026» visíveis; sem overflow |
| Ficheiros alterados | 27 (14 de produção do P3 + 5 de produção das outras frentes + 5 de teste + 2 logs + 1 stub) |
| RAM (A14) | **1475/1458/1463 MB** antes (abaixo) → trim → **2154/2148/2123 MB** ✅ |
| Ficheiros protegidos | `REGULAMENTO-v5.md`, `GUTO-REGULAMENTO.md`, `regras-oficiais.md`, contrato on-chain, env vars: **intocados** (diff + md5) |

### 9.b Erros meus, declarados
1. **Backticks no `git commit -m`** comeram o corpo da mensagem (o shell interpretou-os): o commit saiu com
   o texto truncado e teve de ser corrigido com `git commit --amend -F <ficheiro>`. **Padrão conhecido e
   reincidente** — a mensagem passa a ser sempre escrita em ficheiro.
2. **Âncora de ficheiro no arnês de UI**: o caminho do stub do `AppContext` foi montado sem o `..`, o que
   fez os 8 testes falharem de uma vez (o erro aparece como falha do `before`, não do teste — parecia muito
   mais grave do que era).
3. **`git add` a partir da raiz com caminhos relativos à `frontend`**: o `git -C <raiz>` resolve os
   caminhos pela raiz ⇒ `pathspec did not match`. Nada foi adicionado (0 ficheiros) — sem dano.
4. **Instrumento a ler um ficheiro em movimento**: li `Privacidade.jsx` **dentro do worktree do
   validador** enquanto ele tinha lá o mutante da data aplicado, e concluí (mal) que o commit tinha a data
   velha. A verdade autoritária — `git show 3d72419:<ficheiro>` + md5 — estava correcta (`9b67b4e…`).
   **Regra que fica:** um worktree sob validação activa é **alvo móvel**; para julgar o entregável lê-se o
   **commit**, nunca a cópia de trabalho de outro processo.

---

## 10. Validador adversarial (SEG8)

Subagente independente, worktree próprio em `C:/Users/Moltbot/tmp-utac110h3-val/wt` (commit `3d72419`,
4 junctions pela regra A13), instruído a **TENTAR REFUTAR**. Relatório: `_logs/UTAC110h.3_SEG8_VALIDADOR.md`.

**VEREDICTO: APROVADO COM RESSALVAS — 0 das 8 alegações refutadas.** Reproduziu a suíte canónica
(1108/1108 · 1253/1259), os 15 mutantes, e correu **os seus próprios mutantes**.

### ⚠️-1 (grave) — a quota do bónus on-chain: **ESCALADO ao operador, por decisão própria**
O P5 não reactiva só o gas: **move o Momento e a Quota** do bónus. Se o indicador **já estiver no limite
mensal** no instante do registo, `concederBonus` devolve `limite_mensal_excedido` — e o
`registrarConversao` **grava o marcador de convertido na mesma** (`semBonusIndicador: true`). Como o
marcador é definitivo por `(codigo, indicado)`, **aquele indicado nunca mais gera a senha on-chain do
indicador**, nem depois de o mês virar (o caminho do `comprar-senhas` fica no-op idempotente). Com o
bónus a disparar no **registo** (o momento de maior volume) e não na compra, a janela desse dano
**alarga-se**.

**Acção: NÃO inventei a correcção.** Este efeito **não estava na decisão do operador** (R18-110h.3-5
decidiu reactivar o bónus; não se pronunciou sobre a quota). Pelas regras do processo — *se um trade-off
parte um caso legítimo, PARAR e escalar* — fica registado como **DEBT-030** e entregue ao operador com as
três opções (aceitar · tecto/lote mensal · manter o bónus só no `comprar-senhas`). O código autorizado
**fica como está** (não reverti uma ordem explícita). Derivado **por leitura de código**, não medido
on-chain (proibido neste UTAC).

### ⚠️-2 (média) — a «fonte única» do contador não estava amarrada por teste: **FECHADA com prova**
O mutante de divergência dele (o `ler-pontos` a derivar por conta própria, **sem recorte de mês**)
**sobrevivia à suíte canónica completa**. Não refutava a alegação (no código é mesmo uma função só), mas
faltava a guarda. **Correcção:** 2 testes novos que amarram o número da UI ao recorte de mês **e** ao
limite que o servidor usa — (a) com indicações **só do mês anterior** o contador tem de dizer **0**;
(b) aos **10** creditados o contador diz **10** *e* o 11.º é travado (`codeIndicante: "LIMITE_MENSAL"`,
pontos e ECOQUILDO do indicador intactos, o indicado a receber a parte dele). **Prova:** reproduzi o
mutante dele (**P1f**) e ele passou a **MORRER** (`fail=2`); mutação global **16/16**.

### ℹ️ — notas do validador, tratadas uma a uma
| nota | tratamento |
|---|---|
| «Senhas creditadas» em `CLAUDE_DEBUG.md:884` e `docs/runbook-credito-pendente.md:42` | **não tocados**: não são código e não estão no escopo autorizado (GATE 2/HI4) — declarado |
| Comentário obsoleto `_lib/referral.mjs:6` («morto no caminho do endpoint») | **CORRIGIDO** — passou a registar o P5, o gas e a ressalva ⚠️-1 |
| Expectativa errada na consulta 6 do SQL («leitura do titular») | **CORRIGIDO** — a migração **não** cria policy para o titular (só `service_role` + REVOKE) |
| DEBT-025/028/029 fechadas mas não commitadas | **resolvido no commit de fecho** (a observação era do estado intermédio) |
| Fuga de grafo social pré-existente (`referral.mjs:193` loga endereços reais) | **pré-existente** (idêntico em `9117402`), contradiz o objectivo do `0ec7d13` — **registada como DEBT-031**, não corrigida (fora do escopo) |
| «`md5` cru engana por CRLF» | confirmado; o validador evitou a armadilha com `tr -d '\r'` |
| A autorização do operador (R18-110h.3-5) só consta do documento do autor | **aceite**: o validador não tem acesso ao enunciado; a ordem está citada no R14 e na mensagem do commit |

### Regressões em testes pré-existentes
O validador confirmou: **nenhum ficheiro de teste pré-existente foi alterado** nesta UTAC (só
acrescentados) e nenhuma guarda antiga enfraqueceu (medido: `tests` 1253→1259, `pass` 1247→1253, `fail 0`
nos dois pontos, `skipped 6` **idêntico** nos dois — não se desactivou nada).

---

## 11. Os 3 mutantes do validador que SOBREVIVIAM — todos fechados com prova

Ele correu 8 mutantes próprios; **5 morreram** e **3 sobreviveram**. Li-os um a um, reproduzi-os e fechei
os três. (O §5 do relatório dele descreve o estado **antes** deste fecho — mantém-se à vista, como o
processo manda.)

| # | o que fazia | 1.ª medição | agora |
|---|---|---|---|
| **M1** | `ler-pontos` deriva o contador por conta própria, **sem** recorte de mês (divergência UI↔servidor) | ✗ sobrevivia à **suíte completa** | **MORRE** — mutante `P1f` → `fail=2`. As 2 guardas novas (mês anterior → 0; aos 10 o 11.º é travado) |
| **M3a** | «torneio» visível introduzido **fora** dos 14 ficheiros do P3 | ✗ sobrevivia à suíte completa | **MORRE** — mutante `P3b` (em `useRecursosApp.js`) → `fail=1`. A guarda passou a varrer **todo** o `src/` + `netlify/` de produção |
| **M3b** | «**TORNEIO**» em MAIÚSCULAS dentro dos 14 | ✗ sobrevivia (o token era `[Tt]orneio`) | **MORRE** — mutante `P3c` → `fail=1`. O varrimento passou a ser **sem distinção de caixa** |

**A guarda do P3 ficou assim:** varre `src/` + `netlify/` de produção (fora de testes), aceita só tokens
que sejam **chave/identificador/caminho** (`isTorneioVisivel`, `PainelTorneio[.jsx]`, `ativos.torneio.*`,
`painel-torneio`, `TORNEIO-HABILIDADE.md`) e exige **contagem EXACTA** nas anotações históricas
(`guto-perfis.mjs` = 3; comentário do `pt.js` = 1) — uma ocorrência nova em qualquer lado reprova. Tem
**controlo positivo** (vê as chaves reais) para não ser um passe automático. Mutação: **18/18**.

### Evidência extra do validador sobre o gas (a mais forte que existe hoje)
Ele provou que **nenhum teste toca a rede de três formas**, incluindo correr os testes com o `RPC_URL` a
apontar para um **destino morto** — continuam verdes, logo o contrato é sempre duplo. Isto fecha o
«ALARME DE GAS» que eu lhe pedi para tentar disparar: não há transacção real em teste nenhum.

### Não testável (declarado por ele e por mim)
Custo real de gas em produção · efeito no bónus do `comprar-senhas` **depois** de o registo gravar o
marcador (derivado por leitura, não medido) · migração `20261014` aplicada em produção (é o P6, do
operador) · vacuidade «profunda» do teste do `Boot` quanto ao `useEffect`/Sentry (o próprio teste declara
o limite).
