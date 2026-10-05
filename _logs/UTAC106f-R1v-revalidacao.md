# UTAC106f-R1v — Re-validação focada da R1 (o cartão conta SÓ pontos de compra)

**Tipo:** verificação independente (sem código) · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `586f372d4f116bac84acc3e7a75cf631e88b4ab3` (= `origin/main`) ·
**Frente:** 1 (re-validação da R1). **Não** altera código, testes, `_lib`, ecrã, endpoints, `EM_BREVE_MODE`
nem deploya.

> **Objectivo:** submeter a correcção R1 (commit `1eb3ca1`) a uma ronda independente de validador
> adversarial que **tenta refutar**. A R1 já está em produção; foi corrigida **depois** do veredicto
> original (`_logs/UTAC106f_SEG8_VALIDADOR.md`) e nunca re-validada. Se a R1 resistir, o UTAC106g
> (resgate do cartão) pode arrancar. Se cair, PARAR e escalar — a correcção é UTAC próprio.

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `586f372d4f116bac84acc3e7a75cf631e88b4ab3` | `git rev-parse HEAD` / `git rev-parse origin/main` |
| Commit da correcção R1 | `1eb3ca1` (docs de registo: `fd30bc6`, `4ec7424`, `586f372`) | `git log --oneline -5` |
| Suíte no repo principal | **frontend VERDE 753/753 · backend VERDE 1028/1034 → VERDE** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Correccção **commitada** | SIM — `1eb3ca1` está em `main` e em `origin/main` | `git branch -a --contains 1eb3ca1` |
| Correcção **deployada** | SIM — ver §Deploy abaixo | crawler sobre `https://silly-stardust-ca71bc.netlify.app` |
| Saldo API — abertura (referência) | **US$ 5,63** | `curl https://api.deepseek.com/user/balance` |

### §SEG-1.a — O que a R1 mudou (medido no diff do commit `1eb3ca1`)

| Sítio | Antes | Depois |
|---|---|---|
| `_lib/passe-pontos.mjs` | `podeResgatarCartao(e) = getPontos(e) >= 50` (TOTAL) | **adição** de `TIPOS_QUE_CONTAM_PARA_CARTAO = [compra, resgate]`, `pontosDeCompra(registo)` e `podeResgatarCartaoComCompra(e)`. A `podeResgatarCartao()` ANTIGA fica **à vista**, marcada «NÃO usar para decidir o cartão» |
| `ler-pontos.mjs` | `podeResgatarCartao: pontos >= PONTOS_POR_CARTAO` | devolve `pontosCartao = pontosDeCompra(registo)` + `bonusPalpite = pontos - pontosCartao`; o limiar usa `pontosCartao` |
| `usePontos.js` | só `pontos` | passa a expor `pontosCartao` e `bonusPalpite` |
| `OfertasProgramadas.jsx` | barra e «X / 50» sobre `pontos` | barra e «X / 50» sobre `pontosCartao`; linha própria para o bónus («não conta para o cartão») |

### §SEG-1.b — Onde o palpite entra na mesma coluna (é o ponto da R1)

`apurarPalpite()` credita o bónus com `creditarPontos(vencedor.endereco, PONTOS_POR_PALPITE_CERTO, TIPO_PALPITE, refBonusPalpite(edicaoId))`
(`_lib/passe-pontos.mjs:245-247`) — ou seja, escreve uma entrada `{tipo:"palpite", pontos:+2}` no **mesmo**
`historico`/coluna `pontos`. A R1 não impede o bónus de existir; impede-o de **contar para o cartão**,
porque `pontosDeCompra()` filtra por `tipo ∈ {compra, resgate}` (`:284-290`) e o limiar
(`:293-295`) compara esse valor com 50.

### §SEG-1.c — Deploy verificado (produção real)

Crawler BFS a partir da home (132 chunks alcançados):

- Home → `/assets/index-B4RcYwTO.js`; o chunk lazy `assets/OfertasProgramadas-_TtyRUmV.js` **contém**
  «não conta para o cartão», `pontosCartao`, «Ofertas Programadas», «Já palpitou» e «Palpitar».
- `GET /.netlify/functions/ler-pontos` → **401** (sem Bearer).
- ⚠️ **Observação declarada:** os nomes do bundle ao vivo (`index-B4RcYwTO.js` / `OfertasProgramadas-_TtyRUmV.js`)
  **diferem** dos registados no fecho do 106f (`index-JXLwGXQc.js` / `OfertasProgramadas-CLkhBthM.js`) ⇒
  houve **re-deploy posterior** (os commits seguintes de docs disparam build no Netlify) que re-emitiu os
  nomes dos chunks. O conteúdo da R1 está presente **em ambos** (o build local `dist/` também traz
  «não conta para o cartão»). Não é indício de correcção ausente — é re-emissão de nomes.

---

## §SEG0 — Veredicto do validador (verbatim)

**Subagente:** `deleg_27fae8b8` (1 tarefa · 50 api_calls · 1671 s) · **worktree próprio**
`C:/Users/Moltbot/tmp-r1v-val/wt` (detached em `586f372`, 4 junctions do helper A13) ·
**alvo:** commit `1eb3ca1` (a correcção) · **ANTES de referência:** `e713c3e`.
**Ficheiro-fonte do veredicto:** `C:/Users/Moltbot/tmp-r1v-val/VEREDICTO-R1.md` (fora do repo).
**Evidência do validador:** `C:/Users/Moltbot/tmp-r1v-val/evidencia-r1/` (`_val_r1/ab-puro.mjs`,
`_val_r1/prova-r1-mutantes.mjs`, `ler-pontos.endpoint.test.mjs`, cópias `old-/new-passe-pontos.mjs`, `mut-out.txt`).

> Nota do executor: a cópia abaixo é **integral**, com EOL normalizado para **LF** (regra A2 do repo);
> não há edição de conteúdo. É a prova — não se editorializa.

--- INÍCIO DO VEREDICTO VERBATIM ---

# VEREDICTO R1 — UTAC106f (cartão colecionável = SÓ pontos de compra/resgate)

**Data:** 2026-10-04 · **Validador adversarial** (worktree isolado `C:/Users/Moltbot/tmp-r1v-val/wt`, detached em `586f372`)
**Alvo:** commit `1eb3ca1` (correcção R1) · **ANTES** de referência: `e713c3e`
**Veredicto: PARCIAL** — **1 bloqueante** (na *garantia de teste*, não no comportamento entregue).

> Em uma linha: **o comportamento do código entregue está CORRECTO** — nenhum caminho (directo ou
> indirecto) faz o bónus de palpite (+2) decidir o cartão; (a)–(d) medidos por execução real. O que cai
> é a **alegação de garantia** do commit («mutação 7/7 mata a regressão R1»): o **endpoint
> `ler-pontos.mjs` — a única camada que a UI consulta para desbloquear o cartão — não tem UM único teste**,
> e reabrir o defeito lá (1 linha) mantém a **suíte canónica inteira VERDE (753/753 + 1028/1034)** e o
> gate de mutação **7/7 PROVADOS**.

> **Re-verificação AD-HOC (fecho, árvore limpa, 15/15 PASS):** contra a árvore sem alterações, um script
> temporário (`%TEMP%/hermes-verify-r1.mjs`, prefixo `hermes-verify-`, removido no fim) reconfirmou:
> C0 árvore limpa · C1 suíte canónica VERDE · C2 A/B divergências 0 + cópia byte-idêntica ao ficheiro real ·
> C3 endpoint 4/4 (`pontosCartao:48`, `podeResgatarCartao:false`) · C4/C5 os mutantes R-C/R-D deixam a
> suíte canónica VERDE *e* morrem no medidor ad-hoc (2/4) · C6 blob-hash dos 4 ficheiros = `HEAD` e árvore
> limpa. Isto é **verificação ad-hoc** (script próprio), não "suíte verde" do repo — a suíte canónica
> (753/753 + 1028/1034) é citada à parte e **não** apanhava R-C/R-D.

---

## 1 · Reproduzido por execução

### 1.1 Suíte canónica (o portão do projecto) — VERDE
```
$ cd C:/Users/Moltbot/tmp-r1v-val/wt && node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 753/753 pass
backend: VERDE 1028/1034 pass
VEREDITO: VERDE   (exit 0)
```

### 1.2 Mutação versionada do repo — 7/7 PROVADOS (mas ver §3!)
```
$ node scripts/mc106f-prova-mutacao.mjs
controlo frontend: 14/14 (fail 0)   ·   controlo backend: 16/16 (fail 0)
MP1..MP4 PROVADO (RED) · MP5 PROVADO (RED) · MP6 PROVADO (RED) · MP7 R1: cartão volta a contar o bónus (total) PROVADO (RED)
restauração passe-pontos.mjs: md5 IDÊNTICO   ·   restauração OfertasProgramadas.jsx: md5 IDÊNTICO
VEREDITO: 7/7 PROVADOS (exit 0)
```

### 1.3 A/B PAREADO (o instrumento mais forte) — `_val_r1/ab-puro.mjs`
Cópias dos ficheiros reais com **md5 verificado** (`new-passe-pontos.mjs` = `5a1afb2f…` = o ficheiro do worktree;
`old-passe-pontos.mjs` = `ab254d01…` = `e713c3e`). Duplo Supabase em memória com semântica PostgREST.
```
cenário                                              | ANTES podeResgatarCartao(total) | DEPOIS pontosDeCompra | DEPOIS podeResgatarCartaoComCompra
(a) 48 compra + 2 palpite (total 50)                 |            true                |          48           |          false
(b) 50 compra                                        |            true                |          50           |          true
(c1) só palpite 2 (total 2)                          |            false               |           0           |          false
(c2) só palpite 60 (total 60)                        |            true  <-- DEFEITO   |           0           |          false
(d1) 50 compra + resgate 50 (total 0)                |            false               |           0           |          false
(d2) 60 compra + resgate 50 (total 10)               |            false               |          10           |          false
(d3) 50 compra + resgate 50 + 10 compra (total 10)   |            false               |          10           |          false
(e) 60 compra + 2 palpite + resgate 50 (total 12)    |            false               |          10           |          false
(f) historico VAZIO mas coluna pontos=50             |            true                |           0           |          false
RESUMO A/B: divergências de R1 = 0        (exit 0)
```
⇒ **(a)**, **(b)**, **(c)**, **(d)** todos confirmados. ANTES reproduz o defeito (`48+2=50 → true`;
só palpite 60 → `true`, prova de que o palpite fazia o cartão).

### 1.4 ENDPOINT REAL medido por HTTP — `_val_r1_ab.test.mjs` (`ler-pontos.mjs` + duplo + mocks de JWT/system-state)
```
[endpoint] (a) 48+2         -> HTTP 200 {"pontos":50,"pontosCartao":48,"bonusPalpite":2,"pontosParaCartao":50,"podeResgatarCartao":false,...}
[endpoint] (b) 50           -> HTTP 200 {"pontos":50,"pontosCartao":50,"bonusPalpite":0,...,"podeResgatarCartao":true,...}
[endpoint] (c) só palpite 60-> HTTP 200 {"pontos":60,"pontosCartao":0,"bonusPalpite":60,...,"podeResgatarCartao":false,...}
[endpoint] (d) resgate      -> HTTP 200 {"pontos":0,"pontosCartao":0,...,"podeResgatarCartao":false,...}
ℹ tests 4 · ℹ pass 4 · ℹ fail 0
```
⇒ é **esta** a resposta que a UI consome, e o limiar `podeResgatarCartao` usa `pontosCartao`.

### 1.5 UI (barra do cartão) — o ecrã real
`utac106f-ofertas.test.mjs` (14/14): `✔ R1 REGRESSÃO · 48 de COMPRA + 2 de bónus (total 50) NÃO mostra
«Resgatar»`, com asserções `48 / 50 pontos` presente, `50 / 50 pontos` ausente, `aria-valuenow="48"`, e
«Bónus de palpite: +2 … não conta para o cartão».

### 1.6 Backend isolado (o teste REAL do repo) — 16/16
`✔ R1 · pontosDeCompra conta compra/resgate e IGNORA bónus` · `✔ R1 REGRESSÃO 48+2 não desbloqueia` ·
`✔ R1 · 50 compra desbloqueia` · `✔ R1 · bónus sozinho nunca desbloqueia`.

---

## 2 · Alegações REFUTADAS (cenário + resultado medido)

### BLOQUEANTE 1 — a camada ENDPOINT está sem teste; reabrir o R1 lá deixa tudo verde
`ler-pontos.mjs` é o **único** sítio de produção que decide o cartão (`:56` `pontosCartao = pontosDeCompra(registo)`
e `:63` `podeResgatarCartao: pontosCartao >= PONTOS_POR_CARTAO`). **Nenhum** ficheiro de teste importa
`ler-pontos.mjs` (medido: `grep -rln "ler-pontos.mjs" _tests src/__tests__ src/pages/__tests__` → **0**); os
testes do ecrã **injectam** a resposta HTTP. Logo a decisão do cartão no endpoint é **indecidível** pela suíte.

Mutantes meus (`_val_r1/prova-r1-mutantes.mjs`, cada um verificado «ENTROU» e reposto por md5):

| mutante | alvo | suíte canónica INTEIRA | meu teste de endpoint |
|---|---|---|---|
| R-A `pontosDeCompra` devolve o TOTAL | `_lib/passe-pontos.mjs` | **VERMELHO 2 falhas** ✔ morre | — |
| R-B `TIPOS_QUE_CONTAM` inclui `palpite` | `_lib/passe-pontos.mjs` | **VERMELHO 2 falhas** ✔ morre | — |
| **R-C** `const pontosCartao = pontos;` | `ler-pontos.mjs:56` | **VERDE 753/753 + 1028/1034 (exit 0)** ✘ **SOBREVIVE** | RED (50≠48, 60≠0) |
| **R-D** `podeResgatarCartao: pontos >= 50` | `ler-pontos.mjs:63` | **VERDE (exit 0)** ✘ **SOBREVIVE** | RED (true≠false) |
| R-E `pontosCartao <- pontos` no hook | `usePontos.js` | **VERMELHO 1 falha** ✔ morre | — |
| **R-F** `progresso` usa o TOTAL | `OfertasProgramadas.jsx:68` | **VERDE (exit 0)** ✘ **SOBREVIVE** | — (só a barra, visual) |
| restauração | 4 ficheiros | md5 **IDÊNTICO** | |
`VEREDITO: 3 FALHA(S) — a correcção NÃO está toda guardada`

**Sequência concreta que reproduz a falha (comando real):**
```
$ cd C:/Users/Moltbot/tmp-r1v-val/wt
# reabrir o defeito no endpoint (a linha que a UI consome):
$ python -c "p='desafio-gut/frontend/netlify/functions/ler-pontos.mjs';s=open(p,encoding='utf-8').read();open(p,'w',encoding='utf-8',newline='').write(s.replace('const pontosCartao = pontosDeCompra(registo);','const pontosCartao = pontos;'))"
$ node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 753/753 pass
backend: VERDE 1028/1034 pass
VEREDITO: VERDE            <-- 48+2 volta a mostrar 50/50 e «Resgatar cartão»; NADA falha
$ node scripts/mc106f-prova-mutacao.mjs    # o gate do próprio commit
VEREDITO: 7/7 PROVADOS     <-- continua 7/7
```
Contraste (controlo positivo do meu medidor, mesma mutação):
```
$ cd desafio-gut/frontend/netlify/functions && node --test --experimental-test-module-mocks _val_r1_ab.test.mjs
✖ R1(a) actual: 50  expected: 48   · ✖ R1(c) actual: 60  expected: 0   -> fail 2
```
⇒ **A alegação «mutação 7/7 (novo MP7 mata a regressão R1)» é falsa como garantia do R1**: o MP7 versionado
só muda o **texto** da barra na página (`{pontosCartao} / {pontosParaCartao} pontos` → `{pontos} / …`); a
**decisão do cartão no endpoint** não tem mutante nem teste. Uma regressão futura nesta camada é silenciosa
até produção.

### NÃO bloqueante 2 — a *largura* da barra de progresso não está guardada (R-F sobrevive)
`OfertasProgramadas.jsx:68` (`progresso`) reverte para `pontos` e a suíte fica verde. O texto «48 / 50» e o
`aria-valuenow` estão guardados; a largura/percentagem não. Impacto: **cosmético** (a barra encheria a 100%
enquanto o texto diz 48/50); o botão de resgate continua dependente do flag do endpoint.

### NÃO bloqueante 3 — `ComprarPasseModal` mostra o TOTAL como «Teus pontos»
`ComprarPasseModal.jsx:37-40` mostra `{pontos}` (o campo `pontos` devolvido por `comprar-passe-pontos`, que é
o **TOTAL**, incluindo bónus) e promete `{pontos + PONTOS_POR_PASSE}`. Não é «a barra do cartão» nem decide o
cartão (checklist §3), mas é uma **incoerência de rótulo** com o ecrã Ofertas: um titular com 48 de compra + 2
bónus vê «Teus pontos: 50 → 51» na Carteira e «48 / 50 pontos» nas Ofertas. Não medido em produção (a UI não
é executada aqui) — declarado como observação, não como bloqueante.

---

## 3 · O que NÃO consegui refutar

- **(1) Caminho onde o palpite contribui para o cartão:** não existe no código entregue. `TIPOS_QUE_CONTAM_PARA_CARTAO = [compra, resgate]` (`passe-pontos.mjs:278`); `pontosDeCompra` ignora `palpite` e qualquer tipo desconhecido (`includes(undefined) === false`). Medido: (a), (c2), (e).
- **(2) Outra função/endpoint que some o total para o cartão:** **não existe**. O único limiar de produção é `ler-pontos.mjs:63`, e usa `pontosCartao` (medido §1.4). `podeResgatarCartao()` (antiga, total) **não tem um único importador de produção** (só testes e comentários).
- **(4) `apurar-palpite` a influenciar o cartão:** não. `apurarPalpite` credita com `TIPO_PALPITE` (`passe-pontos.mjs:245-247`). Medido: o mutante R-B (pôr `palpite` a contar) morre na suíte; o cenário (e) dá 10 de cartão com 2 de bónus na soma.
- **(5) Inconsistência antiga/nova:** existe **de propósito** e está documentada — A/B mede `podeResgatarCartao(48+2) = true` vs `podeResgatarCartaoComCompra(48+2) = false`. A antiga ficou «à vista» com aviso em `passe-pontos.mjs:73-80` e no teste F7; risco residual: continua exportada (um chamador futuro pode pegá-la) — mitigado por documentação, não por teste.
- **(6) `tipo === 'palpite'` dentro de `pontosDeCompra`:** não existe (medido em §1.3 e no mutante R-B).
- **(3) UI a mostrar o total na barra do cartão:** a barra real usa `pontosCartao` (14/14). Ressalvas não bloqueantes: R-F (largura) e `ComprarPasseModal` (§2).

## 4 · O que NÃO medi

- **Produção/deploy real** (não fiz deploy; não li `.env` nem chaves). Tudo acima é execução local no worktree.
- **DDL/Postgres real**: CHECK/UNIQUE/FK e um eventual cap/trigger em `historico` — não há migrações do `pontos` no repo (medido: `desafio-gut/supabase/migrations` sem ficheiros `pontos`). O duplo não modela o Postgres.
- **`.env`/chaves** — deliberadamente não lidos.
- **`ComprarPasseModal` renderizado** (observação por leitura de código, não por execução).
- **UTAC106g (resgate)**: não existe endpoint; `resgate` só foi exercido ao nível da função pura (§1.3 d1–d3) e do endpoint com histórico semeado (§1.4 d). O botão está `disabled`.
- **Deploy skew** (bundle antigo ↔ endpoint novo): raciocinado, não medido; em qualquer das direcções **falha fechado** para o cartão (`pontosCartao ?? 0` → 0).

## 5 · Decisão

- **Comportamento entregue pelo `1eb3ca1`: APROVADO** — o palpite NÃO decide o cartão em nenhum caminho medido; (a) 48+2 não desbloqueia, (b) 50 de compra desbloqueia, (c) palpite sozinho nunca desbloqueia, (d) o resgate subtrai. A/B pareado com o `e713c3e` reproduz o defeito **antes** e o conserto **depois**.
- **Garantia de regressão da correcção: REFUTADA (1 bloqueante)** — `ler-pontos.mjs` não tem teste; R-C/R-D reabrem o R1 e a suíte canónica **e** o gate de mutação `7/7` ficam verdes. O commit afirma uma garantia que o próprio gate não dá.
- **Remediação mínima (1 ficheiro de teste, sem tocar no código):** promover o teste de endpoint usado aqui
  (`_val_r1_ab.test.mjs`: duplo PostgREST + mocks de `jwt`/`system-state` → `ler-pontos.mjs`) para
  `netlify/functions/_tests/ler-pontos.test.mjs` e acrescentar ao `mc106f-prova-mutacao.mjs` os mutantes
  **R-C** e **R-D** (alvo `ler-pontos.mjs`). Opcional: **R-F** (largura da barra) e alinhar o rótulo do
  `ComprarPasseModal`.
- **Estado da árvore:** mutantes todos repostos — `passe-pontos.mjs`, `ler-pontos.mjs`, `usePontos.js`,
  `OfertasProgramadas.jsx` com md5 originais; `git status --short` limpo (só artefactos de validação não
  versionados, removidos no fecho).

--- FIM DO VEREDICTO VERBATIM ---

## §SEG0.b — Resposta do executor: PARADO (RESSALVA do enunciado)

O veredicto é **PARCIAL — 1 bloqueante**. O enunciado (SEG1 §2) é taxativo: *«Se REFUTADO ou PARCIAL:
**PARAR. Não corrigir. Não deployar.** Registar o cenário concreto. Escalar ao operador. Abrir UTAC
próprio para a correcção (não este).»* ⇒ **PARADO nesta linha.** Este UTAC **não** altera testes nem
código; a remediação proposta pelo validador é **só de teste** e vai para UTAC próprio (§SEG1/§SEG2).

**Leitura do veredicto em duas partes (o validador separou-as explicitamente):**

| Dimensão | Veredicto do validador | Consequência |
|---|---|---|
| **Comportamento** do `1eb3ca1` (o palpite NÃO decide o cartão; (a)(b)(c)(d)) | **APROVADO** | A base legal da R1 (o palpite é bónus, não decisor) **está provada** — não há contradição a submeter à Play Console |
| **Garantia de regressão** do commit («mutação 7/7 mata a regressão R1») | **REFUTADA — 1 bloqueante** | `ler-pontos.mjs` (a camada que a UI consome para decidir o cartão) **não tem teste**; reabrir o R1 ali (1 linha) deixa a suíte canónica **e** o gate `7/7` verdes |
| Barra de progresso (largura) vs texto | ℹ️ não bloqueante | `progresso` pode reverter ao total e ficar verde (cosmético) |
| `ComprarPasseModal` «Teus pontos» | ℹ️ não bloqueante | Mostra o **TOTAL** (48+2 → «50 → 51») em vez de pontos de cartão — incoerência de rótulo (não decide o cartão) |

## §SEG1 — Análise do veredicto

**1. O validador tentou refutar a sério?** SIM — e a evidência é forte, não vaga:

- **A/B PAREADO** (`_val_r1/ab-puro.mjs`) com cópias byte-verificadas por **md5** (`e713c3e` vs `1eb3ca1`),
  duplo Supabase em memória com semântica PostgREST: **9 cenários** medidos — o **ANTES reproduz o defeito**
  (`48+2 → true`; e `só palpite 60 → true`, a prova de que o palpite fazia o cartão) e o **DEPOIS** dá
  `48 / false`, `50 / true`, `palpite só / false`, resgate subtrai correctamente. `divergências de R1 = 0`.
- **ENDPOINT REAL medido por HTTP** (`ler-pontos.mjs` + mocks de jwt/system-state): 4/4 — a resposta que a
  UI consome traz `pontosCartao:48 · podeResgatarCartao:false` para 48+2.
- **6 mutantes ADVERSARIAIS PRÓPRIOS** (o MP7 versionado só muda o *texto* da barra): **3 sobrevivem à
  suíte canónica inteira** (R-C `pontosCartao = pontos`, R-D `podeResgatarCartao: pontos >= 50`,
  R-F `progresso` usa o total) — com **controlo positivo** do seu próprio medidor (os 3 morrem no teste
  de endpoint que ele escreveu) e **restauração por md5** confirmada. Isto é o oposto de um veredicto vago.
- **Cenário concreto + comando real** (§2 do veredicto): `python -c "…replace('const pontosCartao =
  pontosDeCompra(registo);','const pontosCartao = pontos;')"` → suíte **VERDE 753/753 + 1028/1034** e
  mutação **7/7** → e **nada falha**.

⇒ Critérios do SEG1 §3 (tentou refutar? deu cenário concreto? mediu?) **satisfeitos**. A validação **vale**.

**2. Veredicto = PARCIAL ⇒ PARAR, não corrigir, escalar.** Cumprido: parado antes de qualquer edição.

**3. Erro dos MEUS instrumentos (declarado — GATE 15, exigido pelo enunciado).** O commit `1eb3ca1`
afirmou *«mutação 7/7 (novo MP7 mata a regressão R1)»*. Medido pelo validador: o **MP7 versionado só
muta o TEXTO da barra** na página; a **decisão do cartão no endpoint** (`ler-pontos.mjs:56` e `:63`)
**não tem teste nem mutante**. A minha alegação de garantia era **falsa como garantia** — o gate passava
7/7 com o defeito reaberto. É a **segunda vez** na série 106f que um instrumento meu deu confiança falsa
(a 1.ª foi o teste 11, que codificou o defeito original). Fica declarado.

**4. O que NÃO está em causa.** O validador **não** refutou: (1) qualquer caminho onde o palpite contribua
para o cartão; (2) outra função/endpoint a somar o total (a `podeResgatarCartao()` antiga **não tem
importador de produção**); (4) o `apurarPalpite` a influenciar o cartão; (6) `tipo==='palpite'` dentro de
`pontosDeCompra`. Ou seja: **a R1, como comportamento, resistiu a todas as tentativas de refutação.**

**5. Não medido (limite honesto, herdado do validador).** Produção/deploy (não deployou), DDL/Postgres
real, `ComprarPasseModal` renderizado, deploy skew (raciocinado — falha fechado nas duas direcções).

## §SEG2 — Registo, escalada e custo

### Escalada ao operador (decisão pendente — NÃO corrigido aqui)

**Facto:** a R1 **não** contradiz a Google Play — o palpite **não** decide o cartão (medido, A/B + endpoint).
**O que falta:** uma **garantia de teste** na camada `ler-pontos.mjs` (endpoint), que hoje não existe.

**Remediação proposta (SÓ teste, sem tocar no código) — vai para UTAC próprio:**

1. Promover o teste de endpoint que o validador escreveu (`evidencia-r1/ler-pontos.endpoint.test.mjs`:
   duplo PostgREST + mocks de `jwt`/`system-state`) para `netlify/functions/_tests/ler-pontos.test.mjs`.
2. Acrescentar ao `scripts/mc106f-prova-mutacao.mjs` os mutantes **R-C** (alvo `ler-pontos.mjs:56`) e
   **R-D** (`:63`) — que **hoje sobrevivem** à suíte canónica.
3. Opcional: **R-F** (largura da barra) e alinhar o rótulo do `ComprarPasseModal` (total vs cartão).

**Estimativa:** ~30-45 min, só testes; exige autorização nova (este UTAC proíbe tocar em testes).

### Nota sobre o UTAC106g

- **Comportamento:** a R1 está **provada** — o 106g (resgate do cartão) **não** herda contradição legal.
- **Gate de processo:** o enunciado manda **PARAR em PARCIAL**. A decisão de arrancar o 106g **antes**
  da remediação de teste, ou **depois**, é do operador — fica escalada, não decidida por mim.

### Registo em 3 lugares (R18)

| Lugar | Ficheiro |
|---|---|
| Detalhado | `_logs/UTAC106f-R1v-revalidacao.md` (este) |
| Doc de estado (bloco R14) | `CLAUDE.md` (apêndice no EOF; 4 bytes de controlo intactos) |
| Relatório do operador | `Desktop/RELATORIO-UTAC106f-R1v-REVALIDACAO.txt` |

### §SEG2.b — Custo do UTAC e commits

**Custo (estimativa da base + saldo real da API):**

| Sessão | `source` | chamadas | custo estimado |
|---|---|---|---|
| `20261004_205634_2804b6` (executor, esta sessão) | `cli` | 53 | US$ 0,0388 |
| `20261004_210331_c9672a` (validador adversarial) | `subagent` | 50 | US$ 0,0340 |
| **Total do UTAC** | | **103** | **≈ US$ 0,073** |

- **Saldo da API:** abertura (referência, lida após o reconhecimento) **US$ 5,63** → fecho **US$ 5,52**
  ⇒ **Δ = US$ 0,11** (o saldo conta também as delegações, que têm sessão própria). As duas leituras são
  declaradas separadamente: uma é **estimativa da base** (`cost_status='estimated'`), a outra é **medida real**.

**Commits (em foreground, ficheiros individuais — NUNCA `git add -A`):**

- `1eb3ca1` — a **correcção R1** validada (pré-existente, UTAC106f).
- `586f372` — HEAD de arranque deste UTAC (= baseline + `origin/main`).
- `d86142c` — **registo deste UTAC** (`_logs/UTAC106f-R1v-revalidacao.md` + bloco R14 no `CLAUDE.md`;
  2 inserções, 0 remoções; 4 bytes de controlo intactos). Empurrado: `586f372..d86142c main -> main`.

**Limpeza:** worktree `C:/Users/Moltbot/tmp-r1v-val/wt` removido pelo helper A13 (4 junctions por `rmdir`
primeiro; `node_modules` real conferido antes/depois: **380/568/498/414 → 380/568/498/414**, idêntico).
O veredicto-fonte e a evidência do validador ficam preservados em `C:/Users/Moltbot/tmp-r1v-val/`
(`VEREDICTO-R1.md` + `evidencia-r1/`) — é a prova que este registo cita. Nenhum processo node do
subagente ficou pendurado (medido: só os 2 MCP do utilizador, das 20:56).
