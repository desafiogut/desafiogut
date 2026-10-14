# VEREDICTO — VALIDADOR UTAC110g

**Commit sob teste:** 6418a25 (`feat(UTAC110g): cartoes — F2/P-1/P-2 do 110f-front + resgate (C1/C2 e-mail) + mutacao 12/12`)
**Baseline:** 2579b51 · **Repo:** C:/Users/Moltbot/Desktop/DESAFIOGUT (main) · **Worktree:** C:/Users/Moltbot/tmp-110g-val/wt
**Data:** 2026-10-14 · **Mandato:** REFUTAR, não confirmar. Só conta o que foi medido por execução própria.

---

## VEREDICTO: **ATENÇÃO — 1 BLOQUEANTE**

As 4 frentes (A/B/C/D), a suíte canónica, a prova de mutação e o A/B bidirecional **foram reproduzidos ao
número** e **NÃO foram refutados**. Mas a entrega contém **uma afirmação falsa dirigida ao utilizador**,
introduzida por este commit, não coberta por nenhum teste e em contradição com o próprio log do executor.

---

## BLOQUEANTES

### B-110g-1 — O e-mail de confirmação (C1-email, NOVO neste commit) afirma uma funcionalidade que não existe (C3)

`desafio-gut/frontend/netlify/functions/resgatar-cartao.mjs:67` — função `montarEmailResgate`:

```
"· O estado do pedido aparece na sua Carteira.",
```

**Medido:**
- C3 («estado do pedido visível») **NÃO foi implementado** — o próprio log do executor o declara
  (`_logs/UTAC110g-cartoes.md:14` e `:124`: «C3 … ❌ NÃO FEITA … exige endpoint e ecrã novos, fora do AUTORIZA»).
- `lerResgates` existe em `_lib/resgates.mjs:48` e **não tem consumidor** (grep só devolve a definição).
- `MinhaCarteira.jsx` **não** mostra nada do resgate: `grep -in "resgate|historico" MinhaCarteira.jsx` → **vazio**
  (não renderiza nem o estado do pedido NEM a linha de débito do histórico).
- **Nenhum teste** guarda ou proíbe essa linha — `utac110g-c1c2-email.test.mjs` assere prazo, pagador e
  Nota Técnica, mas **não** esta frase.

⇒ O e-mail transacional (que é também o veículo da Nota Técnica / C2) **mente ao titular**: promete um ecrã
que não existe. Correção = 1 linha. É a única coisa que impede o aceite.

---

## NÃO REFUTADO (medido por execução própria)

| Alegação | Como medi | Resultado |
|---|---|---|
| Suíte canónica de fecho | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (raiz) | **frontend VERDE 1049/1049 · backend VERDE 1211/1217** — igual ao declarado |
| Baseline | idem, no worktree em `2579b51` | **1033/1033 · 1194/1200** — igual ⇒ Δ **+16 / +17** confirmado |
| Mutação própria | `node scripts/utac110g-prova-mutacao.mjs` | **12 MORDEU · 0 SOBREVIVENTES · 0 âncoras falhadas** |
| A/B bidirecional | 6 ficheiros de teste novos/actualizados contra o código de `2579b51` | **11 falhas (backend) + 9 falhas (frontend)** |
| … contra o código novo | os mesmos 6 ficheiros em `6418a25` | **24/24 back · 21/21 front · 0 falhas** |
| P-1 (2.º SELECT da MESMA linha) | `lerLedgerLance` (`_lib/ledger-lance.mjs:38,56`) lê `TABELA="pontos"` — a mesma de `lerPontos` (`select("*")`); o antigo `ler-pontos` chamava `estadoMissoesHoje` em série | **VERDADEIRO** — havia 2 SELECTs da mesma linha; agora 1 (M1/M2 mortos, teste conta leituras) |
| Premissa do enunciado «P-1 = par pontos/pontosCartao» | `pontosCartao = pontosDeCompra(registo)` é **pura** (sem rede) | **premissa FALSA** — a leitura dupla real era a do F4 (missões) |
| Endpoint do 106g já cumpria o B2 | `registarResgate` → `podeResgatarCartaoComCompra`/`pontosDeCompra`, `validarMorada`, `criarResgate` (status `pendente`), débito 50, `idempotency_key UNIQUE`, `reverterMovimento` | **VERDADEIRO** — Frente B era verificação, não construção |
| «já tinha 13 testes» | `_tests/resgates.test.mjs` | **13** (confirmado) |
| «não foi precisa migração nova» | `20261006_mc106g_resgates.sql` vs `criarResgate` | **TODAS as colunas presentes** (cartao_id, morada, status, idempotency_key…) ⇒ VERDADEIRO |
| FRENTE D — UI já existia | `OfertasProgramadas.jsx:327-336` (botão) + `ResgatarCartaoModal.jsx` (precede o commit) + hook | **VERDADEIRO** — não duplicado |
| E-mail do login no corpo (cliente) | `AppContext` expõe `user` (`:1383`); precedente idêntico já em `MinhaCarteira.jsx:88` | **VERDADEIRO** (não é dead code) |
| M4 reescrito, invariante preservada | diff de `_tests/utac110f-front-missoes.test.mjs` + novo M5 que conta leituras | **VERDADEIRO** — reescrita declarada, instrumento reforçado |
| Âmbito: ficheiros não tocados | `git show --stat 6418a25` = 15 ficheiros; `EM_BREVE_MODE = true` (`lib/leilaoLock.js:10`); `package-lock` ausente do commit | **VERDADEIRO** (a sujidade do working tree é PRÉ-EXISTENTE: 6 M + 30 ??) |

## ACHADOS NÃO-BLOQUEANTES / OBSERVAÇÕES

1. **Desvio declarado sem ratificação:** o enunciado pedia o botão «na Carteira»; o executor manteve-o em
   `OfertasProgramadas.jsx` (declarado §5, GATE 3/4 — não duplicar). Está no log mas **não** na tabela de
   decisões escaladas (§6). Merece ratificação do operador, não é defeito.
2. **D-110g-1 pendente de ratificação:** `email?` acrescenta um campo ao contrato do corpo. Declarado.
   Risco residual declarado: o destino do e-mail vem do cliente (a um autenticado com 50 pontos, permite
   enviar e-mail de marca a terceiros) — mitigado por rate-limit 5/min + custo de 50 pontos. Padrão
   pré-existente (`emailPagador` do PIX).
3. **Evidência do P-2 é em parte «source-scraping»:** 5 dos 6 casos de `utac110g-p2-refetch-horario.test.mjs`
   fazem `assert.match` sobre o TEXTO de `AppContext.jsx`/`usePontos.js`. Ainda assim os mutantes M4/M5/M6
   morrem ⇒ mordem, mas é evidência mais fraca que o P-1 (execução real com contador de leituras).
4. **RAM:** medida AGORA `1304 / 1296 / 1307 MB` livres — **abaixo** dos `1722/1726/1734` declarados no SEG-1
   (gate A14 ≥ 1500). Não é defeito do commit (é estado da máquina no momento do meu teste); a alegação
   histórica não é refutável por mim, mas **não se reproduz hoje**.

## HIGIENE

- Worktree `C:/Users/Moltbot/tmp-110g-val/wt` usado para A/B e baseline; **restaurado**, `git status
  --porcelain` **VAZIO**.
- Repo principal **não tocado** (6 M + 30 ?? pré-existentes, iguais antes e depois).
- `.env` **não lido** (R5).

---

# RESPOSTA DO EXECUTOR AO VEREDICTO (UTAC110g)

Executado por Hermes, 2026-10-14. O veredicto acima é **cópia integral** do ficheiro do validador
(`C:/Users/Moltbot/tmp-110g-val/VEREDICTO-VALIDADOR.md`) — não foi editorializado.

## 1. Tratamento dos achados

| # | Achado | Classificação | Tratamento | Morde? |
|---|---|---|---|---|
| **B-110g-1** | O e-mail de confirmação dizia «· O estado do pedido aparece na sua Carteira.» — e a **C3 não existe** (`lerResgates` sem consumidor; `MinhaCarteira.jsx` não mostra nada do resgate). Afirmação **falsa** dirigida ao titular, sem teste. | ⛔ **bloqueante** | **FECHADO.** A frase foi trocada por uma **verdadeira**: «· Guarde este e-mail: é o comprovante do seu pedido.» Duas provas novas: (a) teste `B-110g-1` que exige `doesNotMatch(/Carteira/)` **e** `match(/comprovante do seu pedido/)` — e que confirma que prazo, pagador e Nota Técnica continuam lá; (b) **mutante M13** que reintroduz a frase antiga e morre (RED). O comentário no código cita o bloqueante. | ✅ sim |
| 1 (ℹ️) | Desvio declarado (botão na Carteira vs `OfertasProgramadas`) **fora** da tabela de decisões escaladas | ℹ️ nota | **FECHADO na documentação:** passa a constar como **D-110g-4** na §6 de `_logs/UTAC110g-cartoes.md`, para ratificação do operador. | — |
| 2 (ℹ️) | Risco residual: o destino do e-mail vem **do cliente** ⇒ um autenticado com 50 pontos pode enviar o e-mail de marca para um terceiro | ℹ️ nota | **DECLARADO** (aqui e na §6/§9 do log), com as mitigações medidas: `aplicarRateLimit(req, "resgatar-cartao", 5)` (5/min), custo de **50 pontos de COMPRA** por tentativa e o precedente `emailPagador` (PIX) que já aceita e-mail do cliente. **Não mitigado por código** — fechar exigiria o e-mail no JWT/servidor (decisão do operador, D-110g-1). | — |
| 3 (ℹ️) | A evidência do **P-2** é em parte *source-scraping* (`assert.match` sobre o fonte de `AppContext.jsx`/`usePontos.js` em 5 de 6 casos) | ℹ️ nota | **ACEITE como limite declarado** (§9 do log). O P-2 não tem como ser provado por execução sem montar o provider inteiro (Privy); a fraqueza é compensada pelo M4/M5/M6 morrerem. O **P-1** mantém a prova forte (execução real + contador de leituras com controlo de vitalidade). | — |
| 4 (ℹ️) | O validador mediu a RAM agora em **1304/1296/1307 MB** (< 1500 da A14), contra os 1722/1726/1734 do SEG-1 | ℹ️ nota | **Não é defeito do commit.** Declarado: o gate foi cumprido **no SEG-1** (1722/1726/1734) e **no fecho** (1707 MB antes da última suíte canónica, que deu VERDE). A leitura do validador é do **estado da máquina** durante o trabalho dele (ele e o executor corriam suítes na mesma máquina). | — |

## 2. ERRATA — o erro do EXECUTOR (mantido à vista, marcado REFUTADO)

O validador **derrubou uma afirmação minha** (não uma medição, mas um **artefacto**): no e-mail de
confirmação do resgate (C1-email, novo neste UTAC) eu escrevi, no commit `6418a25`:

> ~~«· O estado do pedido aparece na sua Carteira.»~~

**REFUTADO** — está **FALSO** e a razão é medida: a C3 («estado do pedido visível») **não** foi
implementada neste UTAC (o meu próprio log o declara; `git grep lerResgates` só devolve a definição e
`MinhaCarteira.jsx` não renderiza nada do resgate). Ou seja: o e-mail **prometia um ecrã que não existe** —
exactamente a classe «afirmação dirigida ao utilizador sem lastro» que a série persegue. Corrigido no
commit de fecho (frase verdadeira + teste-guarda `doesNotMatch(/Carteira/)` + mutante M13), **não
re-validado** por uma 2.ª ronda independente (ver §3).

**Porque é que os MEUS três instrumentos não apanharam isto:** a suíte, a mutação e o A/B medem
alegação↔código; nenhum deles pergunta *«o texto promete algo que o sistema cumpre?»*. O mutante M8
(o prazo) existia para o conteúdo **decidido pelo operador** — o que faltava era um teste sobre o
conteúdo **verdadeiro**, não apenas sobre o conteúdo **esperado**. É a mesma lição do UTAC106f (§15.l):
um teste que passa só prova que o código faz o que o teste diz.

## 3. Não re-validado (declarado)

A correcção do B-110g-1 foi feita **depois** do veredicto e **não** passou por uma 2.ª validação
adversarial independente. O que a sustenta: teste novo **e** mutante M13 morto **e** a suíte canónica a
passar **e** os 13 mutantes mortos (`scripts/utac110g-prova-mutacao.mjs`). O validador tinha pedido
exactamente esta correcção («Correcção = 1 linha»), pelo que o risco de deriva é o da implementação, não
o do diagnóstico.

## 4. Erros dos meus próprios instrumentos nesta ronda (declarados por regra da série)

1. **Dois controlos negativos do verificador ad-hoc estavam mal formulados.** (a) Um afirmava «NÃO (a
   suíte está verde E o fix está lá)» — verde+fix é precisamente o que se quer: asserção sem sentido.
   (b) O outro procurava `lerLedgerLance` no ficheiro **cru** e apanhou o símbolo citado no **comentário
   que explica o fix** (a armadilha do §17/§19.4). Corrigidos: o (b) passa a fazer o strip de comentários
   **sem apagar newlines**, com um controlo de vitalidade que confirma que o strip não apaga código; o (a)
   passou a ser um controlo real («a suíte diz VERMELHO» tem de ser falso).
2. **Um VERMELHO transitório declarado:** a 1.ª execução do verificador ad-hoc deu `frontend VERMELHO
   2 falha(s)` — e foi executada **enquanto o validador adversarial corria a suíte dele na mesma máquina**.
   A RAM medida nesse instante era **1707 MB** (A14 cumprida), logo o suspeito é **contenção de CPU/IO**
   (os testes de render sobem um servidor vite + esbuild). **Não reproduzível:** 3 corridas isoladas (1
   canónica + 2 com a lista exacta dos 85 ficheiros de teste) deram **1049/1049** nas três. **Limite: não
   consegui nomear os 2 testes em falha** (o harness só publica contagens) — declarado em vez de ignorado.
3. **1.º mutador (fora do repo, descartado): 5 de 12 âncoras falhadas** por heurística de EOL errada
   (ficheiros em **LF**, âncoras escritas com `\r\n`). Corrigido na versão versionada: âncoras **sem EOL**
   com o EOL derivado do ficheiro em disco + `assert count == 1` + backup em `%TEMP%` + restauro por sha256.
