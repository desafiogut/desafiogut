# UTAC110e — ECOQUILDO: MOEDA SOCIAL COM LASTRO EM R$ (Hermes backend + Opus 5.5 frontend)

Skill: `desafio-gut/frontend/skills/utac/` (tipo `produto`; SKILL.md, protocol/hard-gates.md, segments/).
Baseline: **`bb51343`** (= HEAD == `origin/main`; bate certo com o enunciado, desvio ZERO).
SEG-1: `_logs/UTAC110e_SEG-1_MEDICAO.md` · Validador: `_logs/UTAC110e_SEG5_VALIDADOR.md`.
Relatório do operador: `Desktop/RELATORIO-UTAC110e-ECOQUILDO.txt`.

## 0. Decisões do operador (R18) — registadas nos 3 lugares (log, relatório, R14 do CLAUDE.md)
- **R18-110e-1** — **1 (um) ECOQUILDO por Passe** comprado.
- **R18-110e-2** — o ECOQUILDO usa-se **só no site oficial** `www.grupouniaoetrabalho.com.br` (**não no app**).
- **R18-110e-3** — Registo no Banco Central (PL 4476/23): **avançar com disclaimer**; o ECOQUILDO é **interno,
  não convertível em dinheiro, não transaccionável**; registo **pendente**.
- **A14 (RAM)** — o operador autorizou por escrito, **duas vezes**, fechar o que fosse necessário
  («feche o que for necessário» / «sempre que precisar de RAM feche o que for necessário») e escolheu, na
  escalada, **fechar o WhatsApp + os 2 MCP `@mcpware`** para tentar chegar aos 1 500 MB (ver §1).
- **R20 (conflitos)** — os conflitos 3, 4 e 5 do SEG-1 (§-1.9) ficam **escalados**; os conflitos 1, 2 e 6 foram
  resolvidos pela INTENÇÃO medida e estão declarados (abaixo).

## 1. A14 — recursos (a regra custou ~1 hora; registo completo no SEG-1 §-1.6)
Medições com o comando canónico `[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)`:
- **Início: 462 · 460 · 519 · 521 · 525 MB** → abaixo do limiar (máquina: 5 877 MB total, 93-95 % load, 212 processos).
- Limpeza autorizada (Edge **sem janela** `--no-startup-window`, webviews não-WhatsApp, SearchHost/StartMenu/
  OneDrive/RadeonSoftware/Windows Update, PowerShell órfãos) → **1 346-1 452 MB**, a oscilar até 780.
- Autorização explícita para **WhatsApp + 2 MCP `@mcpware`** + **trim de working sets** (`EmptyWorkingSet`, não
  fecha nada) → pico **1 484 MB** — **16 MB abaixo do limiar**.
- **Re-trim + medições concordantes: 1 676 · 1 678 · 1 664 MB** ✅ (≥ 1 500). Antes da suíte: **2 281-2 219**;
  depois: **1 827 · 1 819 · 1 818**.
- **A14 SATISFEITA** (13 leituras ≥ 1 500 MB, incluindo antes e depois das suítes). **Intactos**: esta sessão, o
  agente Hermes, o `MsMpEng` (Defender) e o `explorer`.
- **Instrumento próprio declarado:** o `Get-Counter` (`\Memory\Available MBytes`) **não existe** nesta máquina
  (`CounterApiError`) — a leitura foi pelo comando canónico e cruzada com `GlobalMemoryStatusEx`.

## 2. FRENTE A — modelo de dados (ficheiro novo; ADITIVO, nada existente alterado)
| peça | o quê |
|---|---|
| `supabase/migrations/20261014_utac110e_eco_quildo.sql` (novo) | `CREATE TABLE IF NOT EXISTS public.eco_quildo` (`endereco` PK, `saldo` INTEGER NOT NULL DEFAULT 0 CHECK ≥ 0, `historico` JSONB NOT NULL DEFAULT `'[]'` CHECK array, `atualizado_em` TIMESTAMPTZ) **+** `public.eco_quildo_lastro` (linha ÚNICA: `id` INTEGER PK DEFAULT 1 CHECK `id = 1`, `total_emitido`/`total_usado`/`reserva_rs_centavos` INTEGER NOT NULL DEFAULT 0 CHECK ≥ 0, `atualizado_em`) **+** `INSERT … (id) VALUES (1) ON CONFLICT DO NOTHING` **+** 8 `COMMENT ON` **+** o rollback (2 `DROP TABLE`) escrito no cabeçalho |
| `_lib/eco-quildo.mjs` (novo) | `CENTAVOS_POR_ECOQUILDO = 100` · `ECOQUILDO_POR_PASSE = 1` · `MOTIVOS_EMISSAO` (congelado) · `MOTIVO_USO` · `refUso`/`refCreditoAdmin` · `reservaDe` · `lerEcoQuildo` · `lerLastro` · `creditarEcoQuildo` · `debitarEcoQuildo` · `reverterEcoQuildo` · `registarEmissaoNoLastro` · `registarUsoNoLastro` · `reverterEmissaoNoLastro` · `reverterUsoNoLastro` |

**Unidades (o erro mais caro possível):** `saldo`/`total_emitido`/`total_usado` contam **ECOQUILDO** (inteiros);
`reserva_rs_centavos` conta **centavos de R$**. A conversão vive **só** em `CENTAVOS_POR_ECOQUILDO`/`reservaDe`
(1 ECOQUILDO = R$ 1,00 = 100 centavos, Art. 47º). **A reserva é DERIVADA** — `reserva = (emitido − usado) × 100` —
nunca somada à mão, para que os três números não possam divergir.
**Extensão declarada:** a reserva derivada de `(emitido − usado)` é a aritmética do **enunciado** (§8 B2/B3, §9 C1);
o **Art. 50º** diz literalmente «reserva correspondente ao total **emitido**». Seguiu-se o enunciado (R18), e a
tensão fica registada aqui e como pendência (§9).
**Não existe** — e não pode passar a existir aqui — nenhuma função de conversão em dinheiro nem de transferência
entre endereços: o `endereco` é sempre o do Bearer, e o `usar` não aceita destinatário (Art. 49º).

**Migração testada numa transacção REVERTIDA** (bloco `DO` + `RAISE EXCEPTION`, técnica do MC105a.1/110d), via MCP
`supabase` no Claude Code (instrumento: só o executor Hermes não tem servidor `supabase`; a sessão Claude Code tem,
`✔ Connected`). **Saída literal (a medição, não uma paráfrase):**
```
(1) Mensagem de erro da 1.ª consulta:
Failed to run sql query: ERROR:  P0001: UTAC110e_REVERTER_SEMPRE
CONTEXT:  PL/pgSQL function inline_code_block line 62 at RAISE
(2) NOTICE: a ferramenta não devolveu nenhum (só a mensagem de erro acima).
(3) tabelas_eco = 0
```
O bloco correu **até à linha 62** — ou seja, **todas as asserções antes dele passaram**: `apply_ok` (4 colunas em
`eco_quildo`, 5 em `eco_quildo_lastro`), a linha **única** do lastro com os defaults a 0, e **os 6 CHECK a recusarem
o que devem recusar** (saldo negativo, histórico não-array, `id = 2`, `total_emitido`/`total_usado`/`reserva`
negativos). O erro final é o teste: **a transacção reverteu**. A 2.ª consulta confirma-o de fora —
**`tabelas_eco = 0`**. ⚠️ **A migração NÃO foi aplicada em produção** — aplicar é decisão do operador (e o push
dispara o auto-deploy do Netlify; sem as tabelas, os endpoints novos respondem 502).
⚠️ **Limite do instrumento (declarado):** o `execute_sql` do MCP **não devolveu os `RAISE NOTICE`** (só o erro final),
logo a contagem de `pontos`/colunas do 110d não ficou visível nesta corrida — o que se prova aqui é que a migração é
**aditiva** (2 `CREATE TABLE IF NOT EXISTS` + 1 `INSERT … ON CONFLICT DO NOTHING`, zero `ALTER`/`DROP` sobre tabelas
existentes) e que **nada ficou aplicado**. O validador re-corre o mesmo bloco no worktree dele.

## 3. FRENTE B — endpoints (4 ficheiros novos)
| endpoint | contrato |
|---|---|
| `GET /ler-eco-quildo` | Bearer **user-session** → 200 `{ok, saldo, historico, centavosPorEcoQuildo}` · 401 `token_ausente\|token_invalido` · 405 · 503 |
| `POST /usar-eco-quildo` | Bearer user-session + `{valor, idempotencyKey}` (ou header `x-idempotency-key`) → debita + `total_usado`/reserva; 200 `{ok, idempotent, saldo, usado, lastro}` · 400 `valor_invalido\|idempotencyKey_invalida\|saldo_insuficiente` · 409 · 502 |
| `POST /creditar-eco-quildo` | **[ADMIN]** `{endereco, valor, motivo, chave, justificativa?}` → emite + `total_emitido`/reserva; 201/200 |
| `GET /lastro-eco-quildo` | **[ADMIN]** → 200 `{ok, total_emitido, total_usado, reserva_rs_centavos, em_circulacao, centavos_por_eco_quildo, coerente}` |

- **Padrões herdados por leitura** (`ler-pontos.mjs` / `comprar-passe-tipado.mjs` / `admin-user-ajuste.mjs`):
  `respostaPreflight` PRIMEIRO · 405 com `allowed` · `aplicarRateLimit` (10 no `usar`, 5 no `creditar`) ·
  `sistemaPausado` → 503 · `titular(req)` (o `endereco` sai SEMPRE do token, nunca do corpo/query) · erros em
  `snake_case` dentro de `jsonError`.
- **`lastro-eco-quildo` publica `coerente`**: compara a reserva LIDA com `(emitido − usado) × 100` — um lastro
  desalinhado (escrita fora da lib) é **denunciado**, não presumido.
- **`creditar-eco-quildo` usa `autenticarAdmin`** (a MESMA guarda que o `guardAdmin` envolve) em vez do
  `guardAdmin`: o registo de auditoria **fail-CLOSED** em `admin_logs` precisa do endereço/nível do admin, que o
  `guardAdmin` (só `null`/`Response`) não expõe — é o que o `admin-user-ajuste` faz. **Sem registo, a moeda NÃO é
  emitida** (503 `log_indisponivel`).
- **Medido antes de escrever:** `admin_logs` **não tem CHECK em `tipo_acao`** (0 linhas em `pg_constraint` para
  `contype='c'`; coerente com os ≥ 6 valores distintos já usados pelos 9 endpoints) ⇒ o valor novo
  `creditar_eco_quildo` é aceite.
- **Bidirecional em cada endpoint:** 401 sem token **e** com `lance-auth` (propósito errado) → 401; token de OUTRO
  endereço → debita a conta do titular do TOKEN (0) e responde 400, **sem tocar** na do corpo; `GET` nos POST → 405.

## 4. FRENTE C — integração com a compra dos Passes
**O ponto de integração real é UM ficheiro, não dois** (conflito 1 do SEG-1): `comprar-passe-relampago.mjs` (8 l.) e
`comprar-passe-programado.mjs` (9 l.) são **wrappers** de `_lib/comprar-passe-tipado.mjs`, que serve os dois pelo
parâmetro `tipoPasse`. O ECOQUILDO entra **uma vez** nesse handler ⇒ **os DOIS Passes** passam a creditar **1
ECOQUILDO** + lastro **+R$ 1,00**, com o **mesmo `ref`** da compra (idempotência herdada de graça).
- **`garantirEcoQuildo()`** é o ÚNICO lugar que credita ECOQUILDO na compra: idempotente pelo `ref`; só actualiza o
  lastro quando `criado === true`; **se o lastro falhar, reverte a própria emissão** e devolve
  `lastro:<code>`.
- **`desfazerCompra()`** (novo) desfaz **tudo** — ECOQUILDO, crédito de lance, 10 pontos — e devolve os R$ 2,00;
  qualquer reversão falhada dispara `captureSecurityAlert`.
- **O ECOQUILDO é o ÚLTIMO passo de propósito:** uma falha dele desfaz pontos + crédito + R$ ⇒ **nenhuma compra fica
  entregue a meio só por causa do ECOQUILDO**.
- **Retry de compra a MEIO** (pontos sim, ECOQUILDO não) → o 200 idempotente **completa o ECOQUILDO sem cobrar**.
- **Intactos:** idempotência pela `ref` tipada, CAS do `saldoRs`, reversão+reembolso do 110d, motivo do ECOQUILDO
  dependente do tipo (`passe-relampago`/`passe-programado` — o `MOTIVOS_EMISSAO` não tem motivo genérico «compra»).

## 5. Testes e verificação (SEG4)
| instrumento | resultado |
|---|---|
| Suíte canónica `node scripts/mc966-suite-harness.mjs ambos` (foreground, RAM 2 893-2 896 MB) | **frontend VERDE 1010/1010** (= baseline +11) · **backend VERDE 1152/1158** (baseline 1128/1134 **+24**) · `VEREDITO: VERDE` |
| Testes novos `_tests/utac110e-eco-quildo.test.mjs` | **24/24** — Frente A (constantes, CHECKs da migração no duplo fiel, ler/creditar/debitar/reverter, **CAS**, lastro derivado, `LASTRO_AUSENTE`, estado impossível), Frente B (4 endpoints, bidirecional de auth, idempotência, auditoria fail-CLOSED, **+B2b/B4b: os ramos de REVERSÃO dos endpoints quando o lastro falha**) e Frente C (compra → +1 ECOQUILDO + lastro; falha do ECOQUILDO → tudo desfeito; falha do lastro → emissão desfeita; 5 cliques = 1 ECOQUILDO; ciclo comprar→usar; compra a meio) |
| Testes do 110d (contrato partilhado) | **21/21 mantidos** — a única alteração foi **aditiva**: o `beforeEach` semeia a linha única do lastro (que a migração cria), com o motivo escrito no ficheiro. As asserções do 110d ficaram **intactas** (GATE 15) |
| Mutação (GATE 7) | **17/17 PROVADOS** (`_tests/utac110e-prova-mutacao.mjs`), **restauro md5 IDÊNTICO** em todos |
| Migração | testada numa transacção revertida via MCP `supabase` (saída abaixo); **NÃO aplicada em produção** |

**Mutantes (todos mordem):** M1 lastro a 1 centavo (14 RED) · M2 reserva não derivada (12) · M3 estado impossível aceite ·
M4 CAS do lastro removido · M5 lastro ausente inventa zeros · M6 1 ECOQUILDO → 0 (19) · M7 motivos aceitam «compra» ·
M8 débito com sinal trocado (6) · M9 guarda de negativo removida · M10 CAS do saldo removido · M11 ref do uso
constante (4) · M12 a compra deixa de creditar (6) · M13 falha do ECOQUILDO não desfaz · M14 falha do lastro
silenciada · M15 o uso não actualiza o lastro.
**Mutantes EQUIVALENTES declarados (não escondidos):** a 1.ª versão de **M4** (remover só `.eq("total_emitido").eq("total_usado")`)
e de **M10** (remover só `.eq("saldo", saldo)`) **sobrevivia** — porque o CAS também inclui `atualizado_em` (e a reserva),
que sozinho já apanha o escritor concorrente. Foram endurecidos para «CAS removido por inteiro» e passaram a morder.
A 1.ª versão de **M14** sobrevivia por **defesa em profundidade** (o `desfazerCompra` revertia o ECOQUILDO à mesma) —
substituída por um mutante que **silencia** a falha do lastro (que morde). Fica registado: **a redundância existe e é
proposital**.

### Migração — teste em transacção revertida
A saída literal está no **§2** deste log (bloco `DO` → `ERROR: P0001: UTAC110e_REVERTER_SEMPRE` na linha 62, e
`tabelas_eco = 0` na verificação posterior). O validador re-corre o mesmo bloco no worktree dele.

## 6. FRENTE D — UI (Opus 5.5 / Claude Code)
Subagente **independente e de outro modelo** (Claude Code / Opus 5.5), com brief fechado (autorizações e proibições
explícitas do §4 do enunciado). Ficheiros: `src/hooks/useEcoQuildo.js` (novo), `src/pages/MinhaCarteira.jsx`
(+31/−2) e `src/__tests__/utac110e-front.test.mjs` (novo, 11 testes).
- **Hook `useEcoQuildo`** — mesmo padrão do `usePontos`: `apiGet("ler-eco-quildo", { token: authToken })` (o
  `authToken` **user-session**, não o do lance); devolve `{saldo, historico, loading, erro, refetch}`.
  **Leitura honesta e sem coerção:** `saldo` só é aceite como `Number.isSafeInteger(v) && v >= 0`; qualquer outra
  coisa (texto, negativo, fracção, ausente) dá **`null` + erro** — a UI mostra **«—»**, nunca um `0` inventado
  (lição do 110d). Sem `address`/`authToken` não faz pedido e não inventa erro.
- **3.º cartão** `data-saldo="eco-quildo"`: rótulo **«🪙 ECOQUILDO»**, o valor, e a nota **«Usável no site oficial»**;
  os MESMOS tokens dos irmãos (`rgba(245,166,35,0.06)` / borda `rgba(245,166,35,0.25)`), rótulo em `COR.text`
  (o cinza `#6b7db8` já foi REFUTADO por contraste no 110d) e valor em `COR.gold`. **SEM botão, SEM link, SEM
  `onClick`** — não se compra ECOQUILDO.
- **Grelha:** `isMobile ? "1fr" : "repeat(3, 1fr)"` — empilhada a 375 px (3 colunas apertariam os rótulos).
- **D3 — releitura:** `refetchEco()` corre logo após `refetchPontos()` no sucesso da compra de Passe.
- **Aviso de erro** dedicado (`data-erro-eco-quildo`, texto vermelho), sem contaminar os outros dois saldos.

**Verificação da FRENTE D (medida por MIM, não aceite do auto-relato):**
| instrumento | resultado |
|---|---|
| Suíte canónica **frontend** (`mc966`, foreground, RAM 2 137-2 141 MB) | **VERDE 1010/1010** (baseline 999 **+11**) |
| `src/__tests__/utac110e-front.test.mjs` | **11/11** — inclui o par **BIDIRECIONAL 0 vs 5** (0 mostra «🪙 ECOQUILDO 0»; 5 mostra 5, **sem** os confundir com pontos 30 nem créditos 3), leitura ilegível → «—», grelha 1/3 colunas, releitura pós-compra (4→5), 402 **não** relê, e a **guarda anti-regressão** (nenhum botão/link/`onClick` de ECOQUILDO, nenhum `POST`, nenhum endpoint `usar/creditar/comprar/converter/transferir-eco-quildo` na página nem no hook) |
| ESLint (3 ficheiros tocados) | **0 erros**; 2 avisos **pré-existentes** (`ON_GOLD`, `cardPad`) |
| **Capturas inspeccionadas com os meus olhos** (`_logs/utac110e-browser/`) | 375 px: **3 cartões empilhados** («Pontos de fidelidade 30/50» + barra · «Créditos de lance 3 / disponíveis» · **«🪙 ECOQUILDO 5 / Usável no site oficial»**), **sem overflow**; 1280 px: **3 cartões lado a lado**. Os valores são **distintos** (30/3/5) ⇒ o ECOQUILDO **não** mostra pontos nem créditos |
| Contraste medido pelo executor Opus (fundo composto `#1a1a30`) | rótulo **14,88:1** · nota **11,01:1** · valor **8,41:1** — todos ≥ 4,5 (AA) |
| Overflow lateral / erros de página (Playwright, 375 e 1280) | **0** / **0** |

⚠️ **O Opus NÃO conseguiu correr a suíte canónica** — a RAM caiu a **108 MB** com o Chromium do Playwright a correr
(A14). Corri-a **eu** depois de libertar RAM: **1010/1010 VERDE**. A limitação fica declarada, não convertida em
silêncio. ⚠️ O harness das capturas monta a `MinhaCarteira` real com respostas sintéticas, **sem** o AppLayout
(sidebar/fundo da app) — mesma limitação do 110d.

## 7. Erros dos MEUS instrumentos (declarados, GATE 2)
1. **Homoglifo cirílico** — escrevi `ecoLinhа()` (com `а` U+0430) numa linha do teste novo; o `node --check` passaria
   e o erro só apareceria como `ReferenceError` em execução. Apanhado por uma **varredura própria de caracteres
   não-ASCII/CIRÍLICO** nos 10 ficheiros escritos (1 suspeito em 1 ficheiro) e corrigido **em bytes**. Varredura
   repetida no fim: **0**.
2. **`GET` com corpo** — na 1.ª versão do teste do 405 pus um corpo num `GET`; o runtime recusa (`Request with
   GET/HEAD method cannot have body`) — é o **mesmo erro já registado na publicação do 110d**. Corrigido: `GET` sem corpo.
3. **4 bugs meus nos testes** (todos meus, não do código): (a) li `reembolsado`/`motivo` no topo do corpo, mas o
   `jsonError` põe o extra **dentro** de `error`; (b) chaves de idempotência com 5 caracteres (o contrato pede 8-180);
   (c) escrevi `0x1` a pensar «endereço inválido» — é **o número 1** e creditou de facto; (d) semeei R$ 5,00 e comprei
   3 Passes (R$ 6,00) → o 3.º deu 402. Corrigidos os quatro; os testes passaram de 16/22 a **22/22**.
4. **Um bug MEU no código de produção, apanhado por mim:** o `creditar-eco-quildo` levava
   `admin_endereco: "desconhecido"` com um comentário a dizer «sobrescrito abaixo» — e **nunca era sobrescrito**
   (o `guardAdmin` não expõe o endereço). Corrigido para `autenticarAdmin` + `admin_endereco`/`admin_nivel` reais,
   com um teste que **verifica o endereço do admin na auditoria** (não um literal).
5. O `_supabase-duplo-mc105a.mjs` **não modelava** `eco_quildo`/`eco_quildo_lastro` (lançaria «tabela não modelada») —
   acrescentadas com os CHECKs da migração, para o duplo ser fiel ao REAL.

## 7b. VALIDADOR ADVERSARIAL (SEG5) — **PARCIAL, 1 BLOQUEANTE** — e o que eu fiz com ele
Veredicto integral: `_logs/UTAC110e_SEG5_VALIDADOR.md` (worktree próprio A13 no sha `0a1350b`, 4 junctions,
sem `rm -rf`; zero alterações de código da parte dele). Ele **refutou-me** — como se espera que faça.

**A1 — ⛔ BLOQUEANTE ACEITE: a migração não ligava RLS nem revogava grants.** Medido em PRODUÇÃO numa transacção
revertida, com `SET LOCAL ROLE anon`: `INSERT` de saldo do nada, `UPDATE` do saldo de **outra pessoa**,
`UPDATE` do lastro e `SELECT` do ledger de todos. Com a chave `anon` (`VITE_SUPABASE_ANON_KEY`, que vai no
**bundle público**), aplicada a migração qualquer pessoa no browser fabricava ECOQUILDO e apagava saldos alheios —
anulando, ao nível da **base de dados**, o Art. 49º e o Art. 50º que a lib defende. Todas as irmãs (`pontos`,
`passes`, `palpites`, `resgates`, `cupons`) já tinham `relrowsecurity = true`.
⚠️ **E ele apanhou o comentário FALSO que tornava isto invisível:** o meu `ler-eco-quildo.mjs` afirmava «tem RLS só
para `service_role`». **Corrigido** na migração (bloco `ENABLE ROW LEVEL SECURITY` + `POLICY` para `service_role` +
`REVOKE ALL … FROM PUBLIC, anon, authenticated` + `GRANT` — o idiom das 4 tabelas irmãs) **e** no comentário, onde
**a alegação errada fica À VISTA, marcada como CORRECÇÃO** (nunca apagada).

**A2 — sobreviventes V3/V4 ACEITES e FECHADOS.** Os ramos de **reversão** do `usar` e do `creditar` (lastro falha →
devolver/desfazer) não estavam presos por teste nenhum. Acrescentei **B2b** e **B4b** e os mutantes **M16/M17**:
**17/17 PROVADOS** — morrem os dois.

**A3 — ACEITE como PENDÊNCIA, não corrigida.** Com crédito escrito + lastro falhado + reversão falhada, a entrada
fica no histórico e o retry (`criado:false`) **salta** o lastro ⇒ moeda acima de `total_emitido` com resposta
200/201. O `lastro-eco-quildo` **não apanha**, porque compara a reserva com (emitido, usado) e **não** com a soma
dos saldos. Corrigir exige decisão de desenho + agregação (RPC) ⇒ **declarada**, severidade média (só na dupla falha).

**A4/A5/A6/A7 — ACEITES e declarados:** A4 é análise de código dele (não reproduzida); A5 é **latente** (medido em
produção: `count(ref like 'passe-%:') = 0`); A6 é a dependência dura da migração (declarado por mim, **confirmado**
por ele); A7 é o `ler-eco-quildo` sem rate limit (o `ler-pontos` também não tem).

**Erros dos MEUS instrumentos que ele apontou (5/5 aceites):** (1) o comentário falso de RLS; (2) «semeia-a como a
produção a tem» no teste do 110d era falso (`to_regclass` é `null` em produção) — corrigido com o texto errado à
vista; (3) **o duplo Supabase não modela privilégios nem RLS** ⇒ nenhum teste *podia* apanhar A1 (a lacuna
estrutural que deixou passar o bloqueante); (4) a minha mutação corria só 4 ficheiros e não tinha mutantes nos
ramos de reversão; (5) o baseline «999/999» do enunciado é pré-UTAC — ambos medimos **1010/1010**.
**Ele reproduziu os meus 15/15 mutantes e a suíte (1010/1010 · 1150/1156 antes das correcções).**
**Não houve 2.ª ronda** (prática da série, declarada): as correcções são minhas e ninguém as atacou — **em especial
a sonda `SET LOCAL ROLE anon` NÃO foi re-corrida depois da correcção**. Isso é agora **condição de liberação**.

## 8. Pendências / escalado ao operador
1. **Aplicar a migração `20261014` em produção ANTES do push** — o push dispara o auto-deploy; sem as tabelas, os 4
   endpoints novos dão 502 e as compras ficam sem ECOQUILDO. **Decisão do operador.**
2. **Registo no Banco Central (PL 4476/23)** — R18-110e-3: avançar com disclaimer, **registo pendente**. O
   disclaimer tem de ficar À VISTA na UI (§FRENTE D) e no relatório.
3. **CORS/site (conflito 4)** — `_lib/cors.mjs` só autoriza a origem do APK (`https://localhost`); o **site oficial**
   é terceira origem ⇒ um browser não lê a resposta do `usar-eco-quildo` a partir do site. Opções: (a) o site chama
   **server-to-server**; (b) acrescentar o domínio ao allowlist (**toca `cors.mjs`, global a 86 functions — fora do
   AUTORIZA**); (c) fica como está (integração do site é externa). **Nada do `cors.mjs` foi tocado.**
4. **Art. 48º II contradiz R18-110e-2 (conflito 3)** — o Regulamento diz que o ECOQUILDO serve para «aquisição de
   novos Passes Desafio **no aplicativo**»; a decisão do operador diz «só no site». Correcção do Regulamento é
   update futuro (como o Art. 16º VI do 110d).
5. **Nível do `creditar-eco-quildo` (conflito 5)** — implementado com `guardAdmin` (como o enunciado diz), mas é o
   endpoint que **emite moeda com lastro em R$**; o único que mexe em R$ (`admin-user-ajuste`) exige `super-admin`.
   Subir é **1 linha** (`guardAdminNivel`). **Decisão do operador.**
6. **Art. 50º vs reserva derivada** — o Regulamento fala da reserva do «total emitido»; o enunciado subtrai o usado.
   Seguiu-se o enunciado; alinhar o texto do Regulamento é update futuro.
7. **Boas-vindas e indicação (Art. 51º)** — os motivos existem na lib e o admin pode emiti-los; **o wiring
   automático** (registo de conta / painel de indicação) **não está no escopo** deste UTAC.
8. `_logs/DEBT.md` — **não alterado** (o 110d leu-o como fora do AUTORIZA). As pendências acima ficam neste log e
   no relatório; levá-las ao DEBT.md precisa de autorização explícita.

## 9. Próximo
SEG5 (validador adversarial, worktree próprio — A13) → SEG6 (fecho: R14 no `CLAUDE.md`, relatório no Desktop,
`git add` individual, commit + push **foreground**, custo reportado).
