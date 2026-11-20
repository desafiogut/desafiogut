# UTAC142 + UTAC142.1 · SEG4 — VALIDADOR ADVERSARIAL (HARD GATE 9)

Validador: Claude (Opus 5.5), sessão independente. Não escrevi o código validado. Data: 2026-11-20 (~05:00–05:45Z).
Base validada: `4961aa8` (= origin/main). Commits: `7988b4e` (UTAC141/Hermes), `64c61bc` (UTAC142), `9646895` (UTAC142.1). Base anterior: `3bbdebe`.
Worktree: `C:/Users/Moltbot/tmp-utac142-val/wt` (detached em 4961aa8 → branch local `utac142-val`), com junctions para os node_modules reais.

## VEREDICTO: **APROVADO COM RESSALVAS**

As afirmações centrais aguentaram a refutação: o CAS com a lib real, o débito de 1 e 2 pontos no fluxo real,
nenhuma recusa por falta de Passe, nenhuma devolução de Passe, o `valor_oculto` oculto ao anon em produção, e o nome
reduzido sem «@» nem HTML. Encontrei **1 ⚠️**: avisos FALSOS «perdeu/voltou» do GUTO quando há uma falha transitória.
Corrigi-o no meu branch (patch abaixo). **Não está em produção**: o executor tem de o aplicar e publicar.
Registei também um defeito ℹ️ de nome, que corrigi, e mais notas sem correcção.

---

## Achados

### ⚠️1 — O GUTO diz ao líder que ainda está a ganhar «deixou de ser o menor único» quando o Supabase falha uma vez · CORRIGIDO (e5ef05a)
- **Onde:** `netlify/functions/scheduled-lider-especial.mjs:36-41` (`predicadoPortador`) + `_lib/lider-especial.mjs:58-59`.
- **Mecanismo:** quando o inventário (ou a contagem) não se lê, o predicado devolve `false`. O
  `avaliarLider` põe então `lider = null` e o ex-líder recebe `lider_perdeu`. Na janela seguinte, com a leitura de
  volta, recebe `lider_voltou`. Os lances não mudaram, e o portador continua o menor único.
  A mensagem falsa pode levar a pessoa a gastar pontos em lances novos, numa edição real e aberta.
- **Prova executável** (`sondas/s2-lider-falha-transitoria.sonda.mjs`, saída em `sondas/S2.txt`):
  `node --experimental-test-module-mocks _sondas_val/s2-lider-falha-transitoria.sonda.mjs`
  → antes: `[[0,"0xaaaa","lider_menor_unico"],[1,"0xaaaa","lider_perdeu"],[2,"0xaaaa","lider_voltou"]]`
  → depois da correcção: `[[0,"0xaaaa","lider_menor_unico"]]`.
- **Correcção:** uma leitura falhada (do inventário ou da contagem de Passes gastos) passa a ser **indeterminada** e lança
  `portador_indeterminado`. O `tick` já apanha erros por edição, por isso salta essa janela: não envia avisos e não grava estado.
  Continua **fail-closed**, porque nada se envia sem uma leitura boa. Também o NaN deixou de ser possível (`Number(x) || 0`).
- **Testes:** E13 (falha transitória → só o aviso inicial) e E14 (contagem ilegível → rejeita) estavam **RED antes e
  GREEN depois**. O E8 passou a exigir a rejeição em vez de `false` (o comportamento é o mesmo: não avisa).
  Os mutantes S2/S5 sobre a correcção morrem.

### ℹ️2 — «PrimeiroNome I.» parte letras fora do BMP (surrogate solto) · CORRIGIDO (99d467e)
- **Onde:** `_lib/nome-exibicao.mjs:18` e `src/lib/nomeExibicao.js:18` (`segundo[0]`).
- **Prova** (`sondas/S4.txt`): `formatarNome("Ana 𠀋mei")` → `"Ana \ud840."`; `formatarNome("Ana 𝓢ouza")` → `"Ana \ud835."`.
  O efeito é um «�» na tabela, ou um erro do PostgREST/Postgres ao gravar (nesse caso é fail-soft e o lance não aparece na tabela ao vivo).
- **Correcção:** `String.fromCodePoint(segundo.codePointAt(0))` nos dois espelhos. Casos novos em `CASOS` (D1 e o espelho
  D2) **RED→GREEN**. Os mesmos casos matam os mutantes N2/N3, que sobreviviam (ver Mutação).

### ℹ️3 — Contagem dupla quando o Blobs grava mas responde 5xx (prova com a LIB REAL 10.0.0)
- **Onde:** `_lib/passe-a-cada-lances.mjs:24-36` + `@netlify/blobs/dist/chunk-BGMFLNF6.js:142-158` (`fetchAndRetry`).
- **O que li no dist:** `set()` com condição devolve `{modified:false}` só para **412** e `{etag, modified:true}`
  para **qualquer outro estado** (`main.js:157-170`). O cliente **repete sozinho** os PUT que recebem 5xx ou 429, até 5 vezes,
  com o mesmo `If-Match`. O código assume `modified && etag`, e isso está certo em condições normais
  (`sondas/S1.txt (a)`: `onlyIfNew` 1.º → `{etag, modified:true}`, 2.º → `{modified:false}`; o mesmo com `onlyIfMatch`).
- **Defeito:** se o PUT fica gravado e a resposta é 503, o retry interno leva 412 e o CAS do código conclui que houve
  conflito e soma **outra vez**. Provado com a lib real e um `fetch` falso (`sondas/S1.txt (c)`): **1 lance → `lances: 2`**
  (servidor: `gravou+503,412,200`). Consequência: o Passe é cobrado um lance antes da conta, ou saltado. É raro, porque exige uma
  degradação do Blobs. Recomendação: tornar a contagem idempotente por `lanceId` (guardar os últimos K ids com o número
  de cada um). Não corrigi: é ℹ️ e mexe no caminho do lance em produção.
- **Também:** se o 5xx persistir, `set` devolve `{etag:"", modified:true}`. O código trata isso bem (`w.etag` vazio
  → repete), mas **nenhum teste o prende** (o mutante V1 sobrevive).

### ℹ️4 — Concorrência: contagem correcta até 15 lances simultâneos do mesmo endereço; perde 1 com 20
- `sondas/S1.txt (b)`, lib real com latência de 20–80 ms: N=5/6/9/12/13/15 → contagem exacta e Passes = ⌊N/3⌋; N=20 → `lances=19`,
  1 falhado (fail-soft, a favor do utilizador). O rate limit é **por IP** (`aplicarRateLimit(req,…,5)`), não por carteira
  como diz o comentário de `passe-a-cada-lances.mjs:14`. Com vários IPs, a mesma carteira passa os 5.

### ℹ️5 — O nome vem do cliente e não é verificado; a R18-142-D («só nome Google») não se pode garantir no servidor
- `lance-relampago.mjs:177-179` aceita `body.nomeExibicao` livre (a raiz já estava no SEG-1 do executor e não foi resolvida).
  `AppContext.jsx:586` cai para o `empresa` corporativo e para e-mails (estes são recusados). Prova (`S4.txt`): `"GUTO"` → `"GUTO"`,
  `"Administrador DesafioGUT"` → `"Administrador D."`, `"Padaria Pão Quente Ltda"` → `"Padaria P."`. Com um JWT próprio, qualquer pessoa
  escreve o que quiser na tabela pública (só letras, até 40). Não há injecção de HTML nem e-mail (S4: `<img…>`, `＠`, `\u202E`, `\u200B` → null).

### ℹ️6 — A minimização vale só para a `ranking_especial`; o Top 10 e o vencedor saem com o nome COMPLETO
- `_lib/apuracao-especial.mjs:53-58` (`nomePublico`, até 80 caracteres, sem «@») → `ResultadosEdicao.jsx:52` e `PainelVencedorEspecial.jsx:85`.
  Depois da apuração (30/11) a tabela ao vivo mostra «Ana S.» e o Top 10 público mostra «Ana Paula Souza». O Key-Per-Bid, o
  `lance-idem` e a resposta do lance continuam a guardar o `nomeExibicao` cru, que pode ser um e-mail (já era assim antes). Está
  preso por `utac138-seg4 V-B1` (que exige «Ana Souza»), por isso **é uma decisão do operador** e não a corrigi.

### ℹ️7 — O consumo do Passe não se vê
- `passeConsumido` e `passesRelampagoRestantes` vêm na resposta (`lance-relampago.mjs:456-457`), mas **nada em `src/`** os lê (grep vazio).
  O utilizador perde um Passe no 3.º lance sem aviso, e o tile do inventário no Início fica desactualizado até ao próximo refetch.

### ℹ️8 — A ausência de CLS no Início não está medida
- `Dashboard.jsx` `EsqueletoAcao` reserva 4.6rem (cerca de 74 px). O formulário real tem o rótulo, a linha de 48 px, a dica «Mín 1 ponto…»,
  a linha de custo e, sem sessão, o botão «⚡ Aceito o DesafioGUT» de 48 px por cima (`CardLance.jsx:481-530`): o esqueleto provavelmente
  **subestima**. Não medi num browser (os MCP chrome-devtools e claude-eyes não ligaram). A altura não é testada (o mutante D1 sobrevive).
  O gate de plataforma MC29.1 é respeitado, porque o próprio CardLance o aplica (`CardLance.jsx:454`).

### ℹ️9 — Registo de produção: os IDs de deploy «verificados» foram substituídos minutos depois
- `netlify api listSiteDeploys` (só leitura): `6affcbf4` (cli, 04:30Z) foi substituído por `6affcd0f` (commit 42ebf6e, 04:33Z), e `6affd2db`
  (cli, 04:59Z) por **`6affd3ec` (commit 4961aa8, publicado às 05:03:08Z)**, que é a produção actual. A produção serve `index-DBOaOT0z.js`
  (61 339 B, o mesmo tamanho do `FfbOXuQZ` local). O chunk `PrivyRoot-ByFWPsNW.js` contém `esqueleto-acao-especial` e `lider_menor_unico`,
  e o `MercadoLances-CsIwxuD_.js` contém `nome_exibicao`. O código é do mesmo commit, mas os logs `_logs/UTAC142*_SEG-1` nomeiam o deploy errado.
  O CLAUDE.md diz «não há auto-deploy», e há builds disparados por commit.

### ℹ️10 — Nenhum lance real desde a migração
- RPC anon `get_ranking_especial('ESPECIAL-RELAMPAGO1')` (só leitura, `sondas/rpc.json`): 6 linhas, a última às **03:30:53Z**, todas `0x5baf…32b8`,
  `valor_oculto` **null em 6/6**, `nome_exibicao` null em 6/6. `SELECT *` anon → **401** (`42501`). Os caminhos `p_nome` e o contador do
  Passe **nunca correram em produção**.

### ℹ️11 — Assimetrias menores dos avisos
- O Passe **Programado** conta como «portador» (`scheduled-lider-especial.mjs`, a soma dos dois tipos), mas a especial só consome o **Relâmpago**.
- O ex-líder recebe `lider_perdeu` sem que se volte a verificar se é portador. Não expõe valores.

### ℹ️12 — 2 falhas na suíte do frontend são do ambiente
- `src/__tests__/mc9952-seguranca-gate.test.mjs:100` e `:135`: `exemplo.com` não resolve (`dns.lookup` → `ENOTFOUND`, medido). O teste depende de DNS vivo
  de um domínio de terceiros. Não foi tocado pelo UTAC142.

---

## O que tentei refutar e AGUENTOU (com prova)

| Alegação | Prova | Resultado |
|---|---|---|
| `set` com `onlyIfNew`/`onlyIfMatch` na 10.0.0 devolve `modified`/`etag` | leitura de `dist/main.js:157-240` + `S1 (a)` com a lib real | ✔ (excepto o ℹ️3) |
| A contagem com concorrência real | `S1 (b)`, lib real e latência | ✔ até 15; ℹ️4 |
| Lance falhado não conta | C5 do executor + leitura (a contagem vem depois de `addLance`/`setJSON` e de todos os `return` de erro) | ✔ |
| Retry com a mesma idempotencyKey não conta 2× | idem-hit devolve antes (passo 5); a chave concorrente dá `criado:false` → 409 antes da contagem | ✔ |
| Nenhum caminho recusa o lance por falta de Passe | `grep sem_passes_disponiveis` vazio no código; C3; `S3` (lances 4–6 sem Passe → 201) | ✔ |
| Nenhuma devolução de Passe | `grep devolverPasse(` → só a definição em `_lib/passes-inventario.mjs` | ✔ |
| Débito de 1 e 2 no FLUXO REAL | `S3`: lance-relampago + ledger + inventário + contador **reais**, Supabase duplo com CHECKs → saldo 50→49→47→44, deltas `[-1,-2,-3]`, Passe 1→0 no 3.º | ✔ |
| Nome: e-mail/HTML/nome completo para a BD | `S4` + CHECK da migração (sem «@», 1..44) + `formatarNome` no `registarNoRankingEspecial` | ✔ (ℹ️2, ℹ️5, ℹ️6) |
| `valor_oculto` oculto ao anon | migração (`case … service_role`) + RPC anon em produção: 0/6 com valor; SELECT directo 401 | ✔ |
| Avisos sem valores | `mensagemAviso` sem dígitos de valor (E5), `valor: null` (mutante S4 morre), estado por janela (E4/E9) | ✔ |
| O cron respeita a janela, a edição fechada e `avisosLider` | E10 + mutante S1 morre | ✔ |
| Predicado fail-closed | ✔ para o envio. **Mas o fail-closed criava avisos falsos** → ⚠️1 |
| ChatbotWidget mostra os tipos novos | `ChatbotWidget.jsx:109-111` → o card com `n.mensagem` (`:321-322`) | ✔ (sem teste) |
| Início: props do CardLance, lazy, sem especial | iguais ao MercadoLances (`MercadoLances.jsx:416-427`), excepto o wrapper do nonce (sem tabela no Início, OK); B1/B3 | ✔ (ℹ️8) |
| Escopo / guardas antigas | utac120 (+ asserções estruturais), utac129 A6 (só sai `passeConsumido` da regex, justificado: agora é um campo da resposta), utac140 B5/K1 (campos novos), Dashboard UTAC138 (invertido por ordem do operador) | ✔ justificadas |
| Escopo de ficheiros | 7988b4e traz `.agents/skills/utac-edicoes/SKILL.md` (do Hermes, coberto pela R18-142-A). Os ficheiros de 64c61bc e 9646895 estão nas listas das specs | ✔ |

---

## Suíte completa (uma corrida canónica)

- RAM livre antes: **1541 MB** (≥ 1500, A14 OK).
- `node scripts/mc966-suite-harness.mjs ambos` (no worktree, em 4961aa8, antes das minhas correcções) → `SUITE-COMPLETA.txt`:
  - **frontend: VERMELHO 2 falha(s)**. Como o harness não diz quais, fiz uma 2.ª corrida só do frontend em TAP
    (`SUITE-FRONTEND-DETALHE.tap`, RAM 1518 MB): **1380/1382**. As 2 falhas são as do ℹ️12 (DNS de `exemplo.com`).
  - **backend: VERDE 1553/1559** (os 6 restantes são os conhecidos).
  - Referência anterior: 1370/1370 · 1519/1525 → +12 / +34 testes.
- Depois das correcções (regressão dirigida, sem suíte completa): backend `utac142-*`, `utac140`, `utac120`, `utac129`, `utac138-*` → **91/91**;
  frontend `utac142-inicio-especial`, `utac140-especial-aberta`, `utac140-tabela-especial` → **19/19**.

## Mutação (minha) — `sondas/mutar.mjs`, restauro com sha256 confirmado em todos

| Mutante | Ficheiro | Resultado |
|---|---|---|
| V2 sem CAS · V3 2 tentativas · V5 «consumido» sem Passe | passe-a-cada-lances | MORTOS |
| **V1** aceita escrita sem etag | passe-a-cada-lances | **SOBREVIVEU** — falta de teste (ℹ️3) |
| **V4** sem recuo aleatório | passe-a-cada-lances | **SOBREVIVEU** — C9 não o distingue |
| V6 (consumirPasse lança) · V7 (aCada 0) | passe-a-cada-lances | sobrevivem — **equivalentes** no handler (fail-soft / só se chama com aCada>0) |
| V8 `passesConsumidosNaEdicao` devolve `lances` | passe-a-cada-lances | sobrevive — antes já não era discriminado (E8 tinha 3/1); depois do e5ef05a é código morto |
| R1 restantes=null · R2 conta fora da especial · R3 nome nulo no ranking | lance-relampago | MORTOS |
| L1 · L3 (portador sempre true) | lider-especial | MORTOS |
| L2 sem o teste «@» | lider-especial | equivalente (a regex PALAVRA já recusa «@») |
| S1 sem janela · S2/S5 (correcção) · S3 sem gravar estado · S4 valor no aviso | scheduled-lider-especial | MORTOS |
| N1 sem partículas | nome-exibicao | MORTO |
| **N2** INICIAL aceita tudo (→ `"Ana <."`) · **N3** 1.º nome com 80 | nome-exibicao | **SOBREVIVIAM** → mortos pelos casos do 99d467e |
| C1 passeACadaLances mín. 1 | especial-config | MORTO |
| F1 nome sem formatar na RPC | _ranking-especial.js | MORTO |
| **D1** esqueleto sem altura · **D2** `encerrado={true}` no Início | Dashboard.jsx | **SOBREVIVEM** — o B2 é uma regex de fonte e o CardLance lazy não renderiza em SSR |
| (sem teste) mapa `lider_*` do ChatbotWidget | ChatbotWidget.jsx | nenhum teste cobre |

O M4 do executor ser equivalente: concordo.

## Correcções feitas (branch local `utac142-val`, SEM push, main intocada)

- `e5ef05a` fix(UTAC142-SEG4): avisos do líder — leitura falhada do inventário é indeterminado, não «não portador»
- `99d467e` fix(UTAC142-SEG4): «PrimeiroNome I.» — a inicial é o 1.º code point, não meia letra UTF-16
- Patches: `C:/Users/Moltbot/tmp-utac142-val/patches/0001-fix-UTAC142-SEG4-avisos-do-l-der-leitura-falhada-do-.patch`,
  `C:/Users/Moltbot/tmp-utac142-val/patches/0002-fix-UTAC142-SEG4-PrimeiroNome-I.-a-inicial-o-1.-code.patch`
- Para chegarem à produção é preciso aplicar os patches, correr a suíte e fazer deploy. Fica com o executor e o operador.
- O ref `utac142-val` fica no repositório (os worktrees partilham os refs). Pode apagar-se com `git branch -D utac142-val`.

## Por validar

- CLS real do Início num browser (ℹ️8).
- Produção: `registar_lance_especial` com `p_nome` e o contador do Passe nunca correram (ℹ️10). Não fiz lances (proibido).
- O comportamento do PostgREST com o surrogate solto (antes da correcção).
- O GUTO/chat (`/chatbot`) como vector de oráculo (o `especialParaGuto` é anterior a este UTAC e não foi revisto).
- A suíte completa **depois** das minhas correcções (só corri a regressão dirigida).

## Higiene

Sondas em `C:/Users/Moltbot/tmp-utac142-val/sondas/` (s1–s4 `.sonda.mjs` + saídas S1–S4, `mutar.mjs`, MUTANTES-*.txt, `rpc.json`).
A chave anon foi copiada do bundle para a sonda e **apagada** no fim. Não escrevi nada em Supabase, Netlify, Blobs nem na produção.
