# UTAC106g — Resgate do cartão (50 pontos) + R2 + validação da edição

**Tipo:** backend + frontend + migração de produção · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-04/05 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `8efa43145c14209b82162b2d3c267a7277534053` (= `origin/main`) ·
**Commit deste UTAC:** `7923e7a`. **Frentes:** 2 (resgate + R2).

> **Objectivo:** fechar o ciclo do programa de fidelidade — o titular troca **50 pontos de CARTÃO** pelo
> cartão colecionável físico (novo endpoint + nova tabela + modal de morada), corrigir a **R2**
> (idempotência da apuração por edição) e validar que `registar-palpite` só aceita edição activa.

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `8efa43145c14209b82162b2d3c267a7277534053` | `git rev-parse HEAD` |
| Suíte (baseline) | **frontend VERDE 754/754 · backend VERDE 1037/1043** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) — intacto | leitura do ficheiro |
| Migrações existentes | até `20261005_mc106f_palpites.sql` | `ls supabase/migrations/` |
| Saldo API — abertura | **US$ 5,21** | `curl https://api.deepseek.com/user/balance` |

### §SEG-1.a — ⚠️ PREMISSA DO ENUNCIADO REFUTADA POR MEDIÇÃO (GATE 1 · GATE 2)

O enunciado (decisão #5) mandava *«a chave de idempotência da apuração passa a incluir `edicaoId`
(`palpite-certo:${edicaoId}`)»*, medindo a chave actual como `palpite-certo:${endereco}` **(ou equivalente)**.
**Medido:** a chave **JÁ** é `palpite-certo:${edicaoId}` (`_lib/passe-pontos.mjs:171`, export
`refBonusPalpite`, usada em `:246`). ⇒ Executar a letra seria um **no-op** (GATE 2: não inventar trabalho).

O **defeito real da R2** (medido pelo validador do R1v, mantido à vista em
`_logs/UTAC106f_SEG8_VALIDADOR.md`): a `ref` é verificada no histórico **DE CADA ENDEREÇO**, não
globalmente por edição ⇒ um palpite NOVO numa edição **já apurada** + uma 2.ª apuração creditava **+2 a
OUTRO endereço** — a mesma edição pagava 4 (A=2, C=2).

**Mecanismo escolhido (a INTENÇÃO, não a letra):** `edicaoApurada(edicaoId)` → **uma edição já apurada
recusa palpites novos**. Sem palpite novo, a 2.ª apuração não encontra nada por apurar ⇒ não há pagamento
duplo. É a correcção que fecha o buraco **de facto**, não a que mexe numa chave que já estava certa.

### §SEG-1.b — Segunda divergência medida (nomes de campo)

O enunciado (decisão #6) pedia validar `tipo === "programada"` e `estado === "aberta"`. **Medido** em
`_lib/edicoes-core.mjs`: os campos são **`tipo`** (`"programado"` | `"relampago"`) e **`status`**
(`"agendado"` | `"aberto"` | `"encerrado"` | `"apurado"`). Usar os nomes do enunciado seria validar
contra valores que nunca existem ⇒ a guarda nunca dispararia **e** o caminho legítimo seria sempre
recusado. Implementado com os nomes **medidos**, declarado no código.

---

## §SEG0 — R2 + validação de `registar-palpite`

**`_lib/passe-pontos.mjs` (só adição):**
- `edicaoApurada(edicaoId)` — existe pelo menos um palpite com `apurado:true` nesta edição?
- `registarPalpite()` passa a recusar com `EDICAO_APURADA` quando a edição já foi apurada.

**`registar-palpite.mjs`:** a edição tem de existir **e** estar activa — `tipo === "programado"` (409
`edicao_nao_programada`) e `status === "aberto"` (409 `edicao_nao_aberta`); `EDICAO_APURADA` → 409.

**Testes** (`_tests/palpite.test.mjs`, +3): a edição apurada recusa palpites novos **e** a 2.ª apuração
não paga nada (o cenário da R2, agora fechado); `edicaoApurada()` false→true; a recusa é POR EDIÇÃO
(uma edição nova continua a aceitar).

```
$ node --test --experimental-test-module-mocks _tests/palpite.test.mjs
# tests 19 · # pass 19 · # fail 0        (16 antes, +3 da R2)
```

---

## §SEG1 — Migração `public.resgates` (aplicada em produção)

**Ficheiro:** `desafio-gut/frontend/supabase/migrations/20261006_mc106g_resgates.sql` — **aditiva**:
`CREATE TABLE IF NOT EXISTS public.resgates` (endereco FK→`public.pontos`, cartao_id, morada JSONB,
status CHECK, `idempotency_key` UNIQUE, timestamps) + 2 índices + RLS/policy/GRANT `service_role` +
`GRANT USAGE, SELECT ON SEQUENCE` (padrão herdado do 106d-v2/106f; sem o GRANT da sequência o INSERT do
`service_role` falha em silêncio). **0 instruções** que toquem em `public.pontos`, `public.palpites` ou
`public.passes`.

**Aplicada** com a técnica §15.g (dir temporário **sem `.env`** — o CLI quebra aí; placeholders vazios com
o prefixo de cada versão remota; só a nova fica pendente):

```
$ node <supabase>/dist/supabase.js db push --linked --dry-run
Would push these migrations:
 • 20261006_mc106g_resgates.sql
$ node <supabase>/dist/supabase.js db push --linked      # respondido 'y'
Applying migration 20261006_mc106g_resgates.sql...
Finished supabase db push.
$ node <supabase>/dist/supabase.js migration list
   20261004 | 20261004 | 20261004
   20261005 | 20261005 | 20261005
   20261006 | 20261006 | 20261006      ← par novo registado
```

**Limite declarado:** sem `psql`/credenciais directas não há segunda leitura do schema — a prova é o
`migration list` + o `NOTICE` da política + a leitura estática do SQL (0 instruções sobre outras tabelas).

---

## §SEG2 — Endpoint `resgatar-cartao` + `_lib/resgates.mjs`

- **`_lib/resgates.mjs`** (novo): store de `public.resgates` — `criarResgate` (idempotente por
  `idempotency_key`, 23505 → devolve o existente), `lerResgatePorChave`, `lerResgates`. **Não** toca em
  `public.pontos`/`palpites`/`passes`. **LGPD:** a `morada` nunca vai para logs.
- **`_lib/passe-pontos.mjs`** (só adição): `registarResgate()` orquestra a ordem **atómica** —
  (1) idempotência pela chave → (2) gate do CARTÃO por **`podeResgatarCartaoComCompra()`** (a NOVA, nunca
  a antiga) → (3) **débito** atómico dos 50 pontos (`ref` `resgate:<chave>`) → (4) **registo** do pedido →
  (5) **ROLLBACK** se o registo falhar: compensação do MESMO tipo (`resgate`), para o total **e** o
  contador do cartão voltarem exactamente ao valor anterior.
- **`resgatar-cartao.mjs`** (novo endpoint): Bearer → `endereco`; valida `cartaoId`, `idempotencyKey`
  e a morada pelo **contrato da entrega** (`validarMorada` de `_lib/pedidos.mjs`, reutilizado — não
  duplicado); 201 criado · 200 idempotente · 400 morada/cartão/chave · 401 sem token · 402 pontos
  insuficientes · 502 resgate falhou (com `devolvido`).
- **Notificação ao titular** in-app (`adicionarNotificacao`, fail-soft). ⚠️ **ESCALADO:** a notificação à
  **Associação** (email) **não** foi implementada — não há endereço/canal dela configurado no repo e
  inventá-lo violaria o GATE 2; o pedido fica em `public.resgates` (status `pendente`) para a operação.

---

## §SEG3 — UI do resgate

- **`src/hooks/useResgatarCartao.js`** (novo): padrão do `useComprarPasse` (apiPost + Bearer +
  `gerarIdempotencyKey` + guarda de corrida por `useRef`); trata 200/201/400/401/402/5xx.
- **`src/components/ResgatarCartaoModal.jsx`** (novo): título «Resgatar cartão colecionável», texto «Vais
  trocar 50 pontos…», **formulário de morada** que reutiliza `ENDERECO_VAZIO`/`UFS`/`erroDoEndereco`/
  `formatarCep` de `src/lib/pedidos.js`, «Confirmar resgate» + «Cancelar», estados de loading/erro.
- **`OfertasProgramadas.jsx`**: o botão «Resgatar cartão» **deixa de estar `disabled`** e abre o balão;
  em sucesso → toast «Pedido de resgate criado» + `refetch` dos pontos. A guarda do 106f que exigia
  `disabled` («o resgate só abre no UTAC106g») foi **actualizada mantendo a invariante** (visível a ≥50 e
  operável) — **extensão de escopo declarada** (GATE 3), como manda a série quando um UTAC parte um guarda.

---

## §SEG4 — Testes + mutação

| Suíte | Antes | Depois |
|---|---|---|
| Backend | 1037/1043 | **1051/1057** (+14: 11 resgates + 3 R2) |
| Frontend | 754/754 | **760/760** (+6: `utac106g-resgate.test.mjs`) |
| `vite build` | — | **OK (16,84 s)** · bundle `index-DMkhbsy0.js` · **`package-lock.json` NÃO foi sujado** |

`_tests/resgates.test.mjs` (11): 201 com 50 de compra (debita e cria pendente) · **402 com 48+2** (o
cartão conta só a compra) · 200 idempotente sem debitar 2× · 400 morada inválida · **ROLLBACK** (registo
falha → 50 voltam, débito+compensação no histórico) · 401 sem Bearer · e os 5 do palpite (404 / 409
relâmpago / 409 encerrada / 409 **apurada** / 201 feliz).

`scripts/mc106g-prova-mutacao.mjs` (versionado):

```
controlo palpite: 19/19 (fail 0) · controlo resgate: 11/11 (fail 0)
R2-a chave do bónus deixa de incluir a edição: PROVADO (RED)
R2-b edição apurada volta a aceitar palpites novos: PROVADO (RED)
Nota validação da edição aberta removida: PROVADO (RED)
Resgate usa a podeResgatarCartao() ANTIGA (total): PROVADO (RED)
Resgate sem ROLLBACK quando o registo falha: PROVADO (RED)
── equivalentes ──
Resgate sem o early-check de idempotência (3 camadas): EQUIVALENTE (sobrevive, como esperado)
VEREDITO: 5/5 PROVADOS + 1 EQUIVALENTE(S) DECLARADO(S)
```

⚠️ **Mutante EQUIVALENTE declarado (não é falha de cobertura):** a idempotência do resgate tem **três
camadas independentes** (early-check por `idempotency_key` + `ref` do débito + UNIQUE da tabela) —
desligar UMA deixa as outras duas a cobrir o caso, logo o comportamento **não regride** e o verde é o
resultado correcto. Um mutante só vale se a sua remoção for uma **regressão**.

---

## §SEG5 — Verificação ponta a ponta

**Suíte canónica:** `frontend: VERDE 760/760 · backend: VERDE 1051/1057 · VEREDITO: VERDE`.
**Build:** OK. Verificação **ad-hoc** própria (`%TEMP%/hermes-verify-106g.py`, corrida e removida):
**TODOS PASS** (11/11 resgates · 19/19 palpite com R2 · 6/6 render · mutação 5/5+1 equivalente com 2
restauros md5 · migração aditiva · `registarResgate` usa `podeResgatarCartaoComCompra` ·
`ler-pontos`/`comprar-passe-pontos` sem referência a resgates).

⚠️ **Erro do MEU instrumento (declarado):** a 1.ª corrida do verificador deu **FALSO FAIL** na migração —
procurava `public.passes` no texto cru, e o **cabeçalho do SQL cita-o de propósito** («NÃO toca em …»).
Corrigido o instrumento (ignorar comentários antes de comparar) e re-executado.

---

## §SEG6 — Validador adversarial (1.ª ronda — PARCIAL)

**Subagente:** `deleg_c9968b20` (47 api_calls · 502 s) · **worktree próprio** `C:/Users/Moltbot/tmp-106g-val/wt`
(detached em `7923e7a`, helper A13) · baseline `8efa431`. Veredicto-fonte: `C:/Users/Moltbot/tmp-106g-val/VEREDICTO-106g.md`.

### Veredicto (verbatim)

--- INÍCIO DO VEREDICTO VERBATIM ---

# VEREDICTO — UTAC106g (commit 7923e7a)

**VALIDADOR ADVERSARIAL · worktree isolado `C:/Users/Moltbot/tmp-106g-val/wt` (detached em 7923e7a)**
Baseline: `8efa431`. Medição por execução real. Mutantes só no worktree.

---

## VEREDICTO: **PARCIAL**

**Bloqueantes: 1 (B1) · Médios: 1 (B2) · Qualificação de prova: 1 (Q1)**

O RESGATE **não é atómico** como o UTAC declara: existe um caminho determinista e reproduzível em que
o **pedido é criado SEM que os 50 pontos sejam debitados** (cartão grátis). A correcção R2 funciona no
caso central, mas o guarda `edicaoApurada()` tem um buraco (B2). O resto do UTAC (validação da edição,
não-regressão de ficheiros proibidos, suíte verde, EM_BREVE_MODE) **verifica-se** — 9 de 11 alvos de
refutação NÃO foram derrubados. A alegação «5/5 PROVADOS + 1 EQUIVALENTE» está sobrestimada (Q1).

---

## ALEGAÇÕES REFUTADAS (cenário + resultado medido)

### B1 · BLOQUEANTE — `resgatar-cartao` cria o pedido SEM debitar (o inverso do declarado)
O UTAC afirma «ROBUSTO/atómico na prática» e «nunca se cobra pontos sem criar o pedido». O contrário
acontece: **cria-se o pedido sem cobrar**. A causa é o rollback compensar com uma `ref` **diferente**
(`resgate-rollback:<k>`) e deixar no histórico o débito original (`resgate:<k>`): no retry, o débito é
um **no-op** (idempotência por `ref` em `aplicarMovimento`), mas o gate do cartão volta a passar (os
pontos foram devolvidos) e o pedido é criado. Cenário: falha transitória do INSERT em `public.resgates`
(ou 23505/42501/erro de rede) seguida de retry do cliente com a **mesma** `idempotencyKey`.

Medido (probe `_probes/zz-refuta-106g.test.mjs`, teste R1):
```
[R1] tentativa 1 (registo falha): 502 | pontos: 50 | resgates: 0
[R1] tentativa 2 (registo OK, MESMA chave): 201 {"ok":true,"idempotent":false,"resgateId":1,
     "status":"pendente","pontos":50} | pontos: 50 | pontosDeCompra: 50 | resgates: 1
```
Resultado: **HTTP 201, `public.resgates` com 1 linha, e o titular continua com 50 pontos de compra.**
Repetindo com chaves novas → vários cartões sem nunca pagar os 50 pontos. O próprio teste de rollback
do UTAC (`resgates.test.mjs`) cobre a tentativa-1 e **nunca** faz o retry — o buraco ficou por medir.

### B2 · MÉDIO — o guarda R2 (`edicaoApurada`) tem um buraco quando a 1.ª apuração teve 0 palpites
`edicaoApurada()` infere «apurada» pela existência de uma linha de palpite com `apurado=true`. Mas
`apurarPalpite` numa edição **sem palpites** devolve `total:0` e **não marca nada**. Como
`apurar-palpite.mjs` **não altera o `status` da edição**, o endpoint continua a aceitar palpites
(`status=="aberto"`) e a 2.ª apuração **paga +2** a um palpite registado depois da edição estar apurada.

Medido (probe R2):
```
[R2] 1.ª apuração (sem palpites): {"ok":true,"total":0,"vencedor":null,"pontosCreditados":0}
[R2] edicaoApurada() depois da 1.ª apuração: false
[R2] registarPalpite(C) post-apuração: {"ok":true,"criado":true}
[R2] 2.ª apuração: {"ok":true,"total":1,"vencedor":{...C...},"pontosCreditados":2} | pontos(C): 2
```
Nota: paga **uma** vez (não duas), logo não é o defeito exacto do R1v; é uma **reabertura parcial** da
propriedade «edição apurada não aceita palpites novos». O probe modela o DEFAULT real da DDL
(`apurado BOOLEAN NOT NULL DEFAULT FALSE`, migração `20261005_mc106f_palpites.sql`).

### Q1 · QUALIFICAÇÃO DE PROVA — o «1 EQUIVALENTE DECLARADO» NÃO é equivalente no caso-limiar
O mutante declarado equivalente («remover o early-check de idempotência») muda o comportamento no caso
natural do resgate (**exactamente 50 pontos**): o retry passa a devolver **402** em vez de **200
idempotente** — o gate do cartão vê 0 pontos de compra. O harness não o vê porque o seu teste de
idempotência semeia **100** pontos.

Medido (`eq-exploit.mjs`, mutação com md5 entrada/saída confirmados):
```
controlo (sem mutação) zz-equiv-50: {pass:1, fail:0, tests:1}
mutação ENTROU (md5 difere): true
MUTADO zz-equiv-50:                {pass:0, fail:1, tests:1}   ← morre: 201+retry = 402
MUTADO resgates.test.mjs:          {pass:11, fail:0, tests:11}  ← o ALVO do harness não o vê
restauração md5 IDÊNTICO: true
```
O código embarcado tem o early-check (logo não é defeito de produto), mas a alegação «1 EQUIVALENTE»
é falsa: o mutante **não** é neutro. «EQUIVALENTE» só vale para a seed do harness.

---

## O QUE **NÃO** CONSEGUI REFUTAR (alegações que resistiram)

| Alvo | Resultado medido |
|---|---|
| (a) debita sem registar / vice-versa | **REFUTADO o vice-versa** = B1. O caminho directo (debitar→criar) está coberto pelo rollback. |
| (b) rollback não dispara em falha | **FALSO**: rollback dispara. `resgates.test.mjs` → 11/11; probe tentativa-1 = 502 + pontos 50→0→50. |
| (c) idempotência não funciona | **FALSO** no caminho normal: retry mesma chave = 200, 1 linha, 1 débito (seed 100). |
| (d) débito não verifica `podeResgatarCartaoComCompra` | **FALSO**: `_lib/passe-pontos.mjs:364` usa-a; mutar para a `podeResgatarCartao()` antiga morre (RED). |
| (e) R2 permite +2 na mesma edição | **Parcialmente**: o duplo-pagamento exacto está fechado; B2 reabre um pagamento em edição apurada degenerada. |
| (f) registar-palpite aceita edição fechada | **FALSO**: `edicao.status!=="aberto"` → 409 (código + teste encerrada/Relâmpago). |
| (g) `ler-pontos.mjs`/`comprar-passe-pontos.mjs`/`_lib/passe.mjs` alterados | **FALSO**: não constam do diff `8efa431..7923e7a`; `passe-pontos.mjs` é +89/-0 (só adição). |
| (h) `MinhaCarteira.jsx`/`ComprarPasseModal.jsx` alterados | **FALSO**: não constam do diff. |
| (i) `.bak-*` tocado | **FALSO**: nenhum no diff; `git status --porcelain` limpo (os `.bak-*` existentes são trackeados/pré-existentes). |
| (j) suíte canónica vermelha | **FALSO**: `mc966-suite-harness.mjs ambos` → `frontend: VERDE 760/760` · `backend: VERDE 1051/1057` · `VEREDITO: VERDE`. |
| (k) `EM_BREVE_MODE` desligado | **FALSO**: `src/lib/leilaoLock.js:10` = `export const EM_BREVE_MODE = true;` — idêntico ao baseline. |

Ouroboros extra verificado: a guarda do botão do 106f (`disabled`) foi actualizada para **ACTIVO** com
justificação explícita; mantém a invariante «só aparece a ≥50 pontos de CARTÃO» (`podeResgatarCartao`).
Não é enfraquecimento de guarda — é a evolução que o 106f tinha diferido para o 106g.

---

## O QUE **NÃO** MEDI (limites)

- **DDL/RLS/GRANT reais e a migração em produção** — sem `psql`, não há 2.ª leitura do schema (limite
  declarado pelo UTAC). Li o SQL de `20261006_mc106g_resgates.sql`: coerente com o store
  (`idempotency_key TEXT UNIQUE`, FK a `public.pontos(endereco)`, status CHECK, GRANT + USAGE na sequence).
- **HTTP/Lambda real, rate-limiter, entrega da notificação** — modelos/duplos.
- **A janela de crash entre o débito e o registo** (duas chamadas Supabase, sem transação) — a
  atomicidade depende do processo não morrer no meio; não reproduzi com um kill determinista.
- **Corrida concorrência** (`apurarPalpite` a ler `apurado=false` enquanto `registarPalpite` insere) — TOCTOU não orquestrado.
- **O modal `ResgatarCartaoModal` visualmente** — só o teste de render (6/6) corre.

---

## DECISÃO

UTAC106g **não aprovável como está**. B1 é um bloqueante de produto (lucro/cartões grátis, 50 pontos =
R$100 em passes) que contradiz a alegação central de atomicidade; B2 exige apertar o guarda R2 (detectar
«apurada» sem depender de uma linha `apurado=true`, p.ex. marca no próprio termo/edição). Q1 exige
corrigir a alegação de mutação (o mutante não é equivalente). O núcleo do R2 (fechar a edição a palpites
novos), a validação da edição, os invariantes «cartão só por pontos de compra» e a não-regressão dos
ficheiros proibidos **estão correctos e medidos**.

### Reprodução
```
cd C:/Users/Moltbot/tmp-106g-val/wt
node scripts/mc966-suite-harness.mjs ambos < /dev/null        # frontend 760/760, backend 1051/1057, VERDE
node scripts/mc106g-prova-mutacao.mjs                        # 5/5 PROVADOS + 1 "EQUIVALENTE" (ver Q1)
cd desafio-gut/frontend/netlify/functions
node --test --experimental-test-module-mocks "_tests/resgates.test.mjs"   # 11/11
node --test --experimental-test-module-mocks "_tests/palpite.test.mjs"    # 19/19
node --test --experimental-test-module-mocks "_probes/zz-refuta-106g.test.mjs"  # 0/2 (B1+B2 — defeitos)
node --test --experimental-test-module-mocks "_probes/zz-equiv-50.test.mjs"     # 1/1 (verde; sob mutação = 0/1)
cd C:/Users/Moltbot/tmp-106g-val && node eq-exploit.mjs     # prova Q1 (md5 entrada/saída confirmados)
```
Mutação em **foreground**; `git status --porcelain` limpo após cada mutante; `md5` de entrada/saída
confirmados; árvore do worktree sem alterações a ficheiros trackeados no fim.
--- FIM DO VEREDICTO VERBATIM ---

### §SEG6.b — Resposta do executor: ACEITE (B1 e Q1 corrigidos; B2 escalado)

**Os três achados foram ACEITES.** Dois foram corrigidos na mesma ronda (commit `e392726`); um exige
ficheiros **fora do AUTORIZA** e vai escalado, com a medição feita.

**B1 (BLOQUEANTE) — CORRIGIDO.** A causa era o rollback **compensar com outra `ref`**
(`resgate-rollback:<k>`), deixando o débito original (`resgate:<k>`) no histórico: no retry, o débito era
um **no-op** (idempotência por `ref`) mas o gate do cartão voltava a passar ⇒ **criava-se o pedido SEM
cobrar**. Correção: **`reverterMovimento(endereco, ref)`** — remove a entrada do histórico e devolve o
delta ao total, com CAS. O retry passa a debitar **de facto**. Teste novo que reproduz o cenário
(`502 → retry → 201` com os 50 pontos **debitados**) + mutante que reintroduz a compensação e **morre**
(2 falhas). **Erro do meu instrumento, declarado:** o meu teste de rollback cobria a tentativa-1 e
**nunca** fazia o retry — o buraco ficou por medir, exactamente como o validador apontou.

**Q1 (QUALIFICAÇÃO) — CORRIGIDO.** A alegação «1 EQUIVALENTE» era **falsa**: o mutante do early-check
muda o retry no caso-limiar (**exactamente 50 pontos**: 200 idempotente → 402). Deixei de o declarar
equivalente, **acrescentei o teste do caso-limiar** (o harness semeava 100 pontos e por isso não o via) e
passei-o a mutante que **tem de morrer**. A mutação passou de «5/5 + 1 equivalente» para **6/6 PROVADOS**,
sem nenhuma alegação de equivalência.

**B2 (MÉDIO) — NÃO corrigido aqui; ESCALADO com medição.** O guarda `edicaoApurada()` infere «apurada»
por existir uma linha `apurado=true`; numa 1.ª apuração **sem palpites** nada é marcado e o
`apurar-palpite.mjs` **não muda o `status`** da edição ⇒ o endpoint continua a aceitar palpites
(`status === "aberto"`) e a 2.ª apuração paga +2. **Impacto medido (concordo com o validador): paga UMA
vez, não duas** — logo **não** é o defeito exacto do R1v (duplo pagamento); é a reabertura parcial da
propriedade «edição apurada não aceita palpites novos».

O fix correcto exige **marcar a edição na apuração**, e isso vive em `apurar-palpite.mjs` e/ou
`_lib/edicoes-core.mjs` — **nenhum dos dois está no AUTORIZA** deste UTAC (RESSALVA 1: se for preciso
alterar código de produção fora do escopo, **PARAR e reportar**). Fica escalado com duas opções:
**(A)** `apurar-palpite.mjs` passa a encerrar/apurar a edição (1 linha, ficheiro fora do escopo);
**(B)** `apurarPalpite()` (em `_lib/passe-pontos.mjs`, **in-escopo**) passa a chamar `encerrarEdicao()`
de `edicoes-core.mjs` — fecha o buraco mas **introduz um efeito lateral novo** sobre estado partilhado
(a edição passa a aparecer encerrada noutros ecrãs), o que exige decisão do operador (GATE 12: o
executor não concebe).

### §SEG6.c — 2.ª ronda (refutar as correcções)

**Subagente:** `deleg_2ee98533` · worktree `C:/Users/Moltbot/tmp-106g-val/wt` **re-criado em `e392726`** ·
alvo: (1) o B1 está mesmo fechado? (2) o mutante do Q1 morre? (3) reavaliar o B2 (impacto real, caminho de
pagamento **duplo**, fix in-escopo). Veredicto em §SEG6.d.


### §SEG6.d — 2.ª ronda (verbatim)

**Subagente:** `deleg_2ee98533` (36 api_calls · 392 s) · worktree **re-criado em `e392726`** ·
veredicto-fonte `C:/Users/Moltbot/tmp-106g-val/VEREDICTO-106g-r2.md`.

--- INÍCIO DO VEREDICTO VERBATIM (2.ª RONDA) ---

# VEREDICTO — UTAC106g · 2.ª RONDA (correcções do commit e392726)

**VALIDADOR ADVERSARIAL · worktree isolado `C:/Users/Moltbot/tmp-106g-val/wt` (detached em `e392726`)**
Baseline: `8efa431` → `7923e7a` (1.ª entrega) → `e392726` (correcções B1+Q1). Medição por execução real.
Mutação sempre em foreground; `git status --porcelain` limpo depois de cada mutante; md5 entrada/saída confirmados.

---

## VEREDICTO: **PARCIAL** — 0 BLOQUEANTES

As **correcções B1 e Q1 NÃO foram refutadas** — medi-as e comportam-se como declarado. O bloqueante da
1.ª ronda está **fechado**. Subsiste **1 médio (B2)** que o executor escalou: confirmei que é real mas
**re-gradei o impacto** (não toca cartão nem dinheiro) e **refutei parcialmente a alegação de escopo**
(há um caminho de pagamento duplo que ele não viu e, para ESSE facet, existe fix in-escopo).

| Item | 1.ª ronda | Agora (2.ª ronda) | Estado |
|---|---|---|---|
| B1 (rollback compensava) | BLOQUEANTE | corrigido e **medido** (retry debita; sem cartão grátis) | **FECHADO** |
| Q1 (mutante «equivalente») | QUALIFICAÇÃO | corrigido: mutante **morre** no alvo oficial; alegação removida | **FECHADO** |
| B2 (guarda `edicaoApurada`) | MÉDIO | **ainda aberto** — real, mas alcance/impacto re-avaliados | **ABERTO (escalado)** |

---

## Reproduzido por execução

```
node scripts/mc106g-prova-mutacao.mjs         → 6/6 PROVADOS (sem equivalentes); md5 reposto idêntico
node scripts/mc966-suite-harness.mjs ambos    → frontend 760/760 · backend 1053/1059 · VERDE
_tests/resgates.test.mjs (13)                 → 13/13 · _tests/palpite.test.mjs (19) → 19/19
_probes/zz-r2-b1.test.mjs (adversarial B1)    → 6/6
_probes/zz-r2-b2.test.mjs (adversarial B2)    → 5/5
_probes/zz-refuta-106g.test.mjs (1.ª ronda)   → R1 PASSA (B1 fechado) · R2 FALHA (B2 aberto)
eq-exploit.mjs                                → mutante do early-check: resgates.test.mjs 12/13 (morre!)
```
Suíte subiu de 1051/1057 → **1053/1059** (os +2 são os testes novos B1-retry e Q1).

---

## B1 — CORRECÇÃO **NÃO REFUTADA** (bloqueante fechado)

`reverterMovimento()` remove a entrada do débito do histórico e devolve o delta ao total (CAS). Medido:

- **Retry volta a debitar?** SIM. `[T1] tent.1 = 502 (devolvido:true, pontos 50)` → `tent.2 (mesma chave) = 201,
  pontos 0, pontosDeCompra 0, 1 resgate, exactamente 1 entrada 'resgate:<k>'`. O caminho do «cartão grátis»
  da 1.ª ronda (502→201 com 50 intactos) **desapareceu**.
- **Pedido criado SEM débito?** Nenhum caminho encontrado. No retry, o gate (`pontosDeCompra ≥ 50`) e o
  débito idempotente por `ref` são coerentes: se a `ref` do débito estiver presente, o −50 já conta no gate.
- **Crash entre débito e registo** (débito sobrevive, sem rollback) — `[T3]`: retry com a mesma chave cria o
  pedido e a compra líquida reflecte o débito (net 50). **Não é grátis** (a tentativa que morreu já cobrou).
- **A reversão pode corromper histórico/total?** Só se houver **refs duplicadas** — `[T4b]` remove 2 entradas
  mas subtrai 1 (total 100 ≠ soma 150). Estado **não alcançável** pelo fluxo normal (`aplicarMovimento` é
  idempotente por `ref` + CAS em `pontos`), logo é fragilidade defensiva, não defeito de produto.
- **E se a reversão falhar?** `[T2]`: 502 com `devolvido:false` (honesto), os 50 ficam debitados **sem pedido**
  (o INVERSO). Retry → **402** (não cria grátis). É um estado fail-closed: o titular perde 50 pontos e fica sem
  cartão, sem auto-recuperação — resíduo de risco (janela de falha de DB/crash), **não** um bloqueante.

**Não refutado:** a correcção B1 é sólida no caminho medido; nenhum caminho de criação sem débito foi achado.

## Q1 — CORRECÇÃO **NÃO REFUTADA** (qualificação fechada)

- O mutante «remove o early-check de idempotência» **morre agora no ALVO OFICIAL**: `resgates.test.mjs` →
  **12/13, fail 1** (1.ª ronda: 11/11 sobrevivia). O teste novo `RESGATE · Q1 … EXACTAMENTE 50 pontos → 200`
  é não-vácuo e é ele que o morde.
- A alegação «1 EQUIVALENTE» foi **removida** de `scripts/mc106g-prova-mutacao.mjs` (o array `EQUIVALENTES`
  e o seu loop apagados) e o veredicto passou a `6/6 PROVADOS` (sem equivalentes). `grep -i equivalente` nos
  3 ficheiros do commit → **nada**.
- Restauração do ficheiro mutado com md5 **IDÊNTICO**.

**Não refutado:** o mutante morre e a alegação sobrestimada desapareceu.

## B2 — **AINDA ABERTO**; impacto re-avaliado e alegação de escopo parcialmente refutada

`[B2-1]` reproduz o defeito (1.ª apuração com 0 palpites → `edicaoApurada()=false` → aceita palpite novo →
2.ª apuração paga +2). `[B2-2]` mostra que, depois de um palpite novo ser apurado, a edição fecha aos outros
⇒ no caso dos 0 palpites o pagamento extra é **ÚNICO** — a alegação «paga UMA vez» do executor **confirma-se**.

**Re-gradação de impacto (medida):**
- `[B2-5]`: o bónus é `tipo:"palpite"` ⇒ **não conta para o cartão** (`pontosDeCompra`=0; `podeResgatar…`=false).
  Dano = **+2 pontos de prestígio** (≈ 2 passes), **nunca cartão nem dinheiro**.
- `[B2-3]`: o endpoint `registar-palpite` exige `status==="aberto"` ⇒ B2 só é **alcançável se o admin apurar
  uma edição ainda aberta**; no fluxo normal (encerrar → apurar) é **inalcançável** (409).

**REFUTAÇÃO PARCIAL da alegação «fix exige ficheiros fora do AUTORIZA»:**
- Para o buraco principal (guarda sem sinal persistente de «apurada»): **a alegação é correcta** — `edicoes-core`
  não tem função que ponha `status="apurado"` (só `encerrarEdicao`→"encerrado") e nada no código o faz; sem
  esse sinal persistente não há guarda fiável. Fix fora da AUTORIZA (3 ficheiros). **OK, escalado.**
- **MAS existe um caminho de PAGAMENTO DUPLO que ele não viu** — `[B2-4]`: o crédito é aplicado **antes** da
  marcação; se a marcação falhar (erro de DB), o guarda fica false e uma 2.ª apuração paga +2 a **outro**
  endereço ⇒ a mesma edição paga **4**. E para ESTE facet **há fix in-escopo**: `apurarPalpite` vive em
  `_lib/passe-pontos.mjs` (1 dos 3 ficheiros autorizados) e já pode usar o novo `reverterMovimento()` para
  desfazer o crédito do bónus quando a marcação falha (`credito.criado===true`).

---

## Alegações REFUTADAS (cenário + medida)

1. **«O fix do B2 exige sempre ficheiros fora do AUTORIZA»** — REFUTADA em parte: o facet do pagamento duplo
   por falha de marcação tem fix **dentro** de `_lib/passe-pontos.mjs` (`[B2-4]` + `reverterMovimento` já existe).
2. **«O impacto do B2 poderia ser maior»** — REFUTADA a favor do executor: o bónus não conta para o cartão
   (`[B2-5]`), logo o dano é 2 pontos de prestígio por edição degenerada.

## O que NÃO consegui refutar

- A correcção **B1** (retry debita; sem criação sem débito; inverso só fail-closed).
- A correcção **Q1** (mutante morre no alvo oficial; alegação removida; 6/6 sem equivalentes).
- A suíte canónica verde e a não-regressão de ficheiros (o diff são só os 3 ficheiros; `passe-pontos.mjs`
  é aditivo fora das funções novas).
- A alegação «paga UMA vez» para o caso degenerado de 0 palpites (`[B2-2]`).

## O que NÃO medistei (limites)

- **DDL/RLS/GRANT reais** (`public.resgates`, `public.pontos`, `public.palpites`) — duplo PostgREST, sem `psql`.
- **HTTP/Lambda/rate-limiter/notificação reais** e o **deploy**.
- **Corrida TOCTOU** concorrência real entre `apurarPalpite` e `registarPalpite` (modelado, não orquestrado com paralelismo real).
- Se, em produção, o operador **apura antes ou depois** de encerrar a edição (define o alcance real do B2).
- O modal visual do resgate (só teste de render).

## DECISÃO

- **B1:** correcção **APROVADA** (não refutada). O bloqueante da 1.ª ronda está fechado.
- **Q1:** correcção **APROVADA** (não refutada). A sobrestimação de prova foi corrigida.
- **B2:** **permanece aberto** (médio, escalado legitimamente). Re-gradado: dano = +2 pontos de prestígio,
  alcance condicionado a apurar-com-edição-aberta. **Contudo**, a alegação «exige forçosamente ficheiros fora
  do AUTORIZA» é **parcialmente falsa**: o facet de pagamento duplo tem fix in-escopo em `passe-pontos.mjs`.
  Recomendo ao operador **autorizar** esse fix mínimo (desfazer o crédito do bónus se a marcação falhar),
  a par da decisão sobre o guarda principal (registar status "apurado" na edição).

**VEREDICTO GLOBAL: PARCIAL — 0 bloqueantes · 1 médio aberto (B2, com facet in-escopo) · B1 e Q1 aprovados.**
--- FIM DO VEREDICTO VERBATIM (2.ª RONDA) ---

**Leitura do executor.** A 2.ª ronda **fechou o bloqueante B1** (medido: o retry volta a debitar; o
caminho do «cartão grátis» desapareceu) e **fechou o Q1** (o mutante morre no alvo oficial; a alegação
de equivalência foi removida). Sobrou **1 médio (B2)** — mas o validador **refutou em parte** a minha
alegação de escopo: encontrou um *facet* de **pagamento duplo** (o crédito do bónus é aplicado **antes**
da marcação; se a marcação falhar, o guarda `edicaoApurada()` fica falso e uma 2.ª apuração paga +2 a
**outro** endereço ⇒ a mesma edição paga **4**) e mostrou que **esse** facet tem fix **dentro** de
`_lib/passe-pontos.mjs` — um dos ficheiros AUTORIZADOS.

⇒ **Corrigido (commit `27c9583`)**: `apurarPalpite` passa a chamar `reverterMovimento()` para **desfazer
o crédito recém-criado** quando a marcação falha (e só nesse caso: se a `ref` já existia, o bónus é de
uma apuração anterior). Teste novo do facet (duplo com falha forçada na marcação) + mutante que **morre**.
Mutação: 6/6 → **7/7 PROVADOS**.

**Permanece ABERTO (escalado, sem fix em escopo):**
1. **O guarda principal do B2** — `edicaoApurada()` não tem sinal persistente de «apurada» quando a 1.ª
   apuração teve **0 palpites**. O fix exige **marcar a edição** na apuração, o que vive em
   `apurar-palpite.mjs` e/ou `_lib/edicoes-core.mjs` (**fora do AUTORIZA**). Impacto re-gradado pelo
   validador: **+2 pontos de prestígio** (o bónus NÃO conta para o cartão), alcançável só se o admin
   apurar uma edição **ainda aberta**. Opções: **(A)** `apurar-palpite.mjs` encerra/apura a edição (1
   linha, fora do escopo); **(B)** `apurarPalpite()` chama `encerrarEdicao()` — in-escopo mas introduz
   um **efeito lateral** sobre estado partilhado (exige decisão do operador, GATE 12).
2. **Auto-recuperação quando a própria REVERSÃO falha** (medido pelo validador, `[T2]`): 502 com
   `devolvido:false`, os 50 pontos ficam debitados **sem pedido** — estado *fail-closed* (o retry dá 402,
   não cria nada grátis), mas sem auto-recuperação. Resíduo de risco numa janela de falha de DB/crash.
3. **Refs duplicadas no histórico** (`[T4b]`): a reversão remove 2 entradas e subtrai 1. Estado **não
   alcançável** pelo fluxo normal (`aplicarMovimento` é idempotente por `ref` + CAS) — **fragilidade
   defensiva**, declarada.

## §SEG7 — Deploy

O repo **não tem** workflow de deploy — o Netlify publica por **integração Git** ao push. Push feito
(`8efa431..27c9583`) e **deploy verificado em produção** (`https://silly-stardust-ca71bc.netlify.app`):

| Verificação em produção | Resultado |
|---|---|
| `GET /` | **200** |
| `POST /.netlify/functions/resgatar-cartao` (sem Bearer) | **401 `token_ausente`** |
| `GET /.netlify/functions/resgatar-cartao` | **405 `metodo_invalido`** (só POST) |
| `GET /.netlify/functions/ler-pontos` | **401** (inalterado) |
| `GET /.netlify/functions/comprar-passe-pontos` | **405** (inalterado) |
| chunk servido `assets/OfertasProgramadas-*.js` | contém «Resgatar cartão», «Resgatar cartão colecionável», `rg-nome` e `resgatar-cartao` ⇒ **o resgate está no ar** (e mantém «não conta para o cartão», da R1) |

**Build:** `npx vite build` **OK** · bundle local `index-DMkhbsy0.js` · **`package-lock.json` NÃO foi
sujado** (md5 `c648a597…` igual antes e depois) — nada a restaurar.

⚠️ **Declarado (instrumento):** a 1.ª sonda, ~100 s após o push, mediu `POST /resgatar-cartao → 400` —
**transitório** de propagação do deploy (a função nova ainda não estava no edge). Re-medido segundos
depois com **dois instrumentos independentes** (`curl` e o probe Python): **401 `token_ausente`** em
ambos. A produção final está coerente.

## §SEG8 — Registo, escalada e custo

### Escalada ao operador (decisão pendente — NÃO corrigido aqui)

| # | Pendência | Porque não foi feita | Opções |
|---|---|---|---|
| 1 | **Guarda principal do B2**: sinal persistente de «edição apurada» | exige `apurar-palpite.mjs`/`edicoes-core.mjs` — **fora do AUTORIZA**; e a opção in-escopo cria efeito lateral sobre estado partilhado | (A) `apurar-palpite` encerra/apura a edição · (B) `apurarPalpite` chama `encerrarEdicao()` · (C) aceitar (dano = +2 de prestígio, condicionado a apurar com a edição aberta) |
| 2 | **Auto-recuperação** se a reversão do resgate falhar | exige um mecanismo novo (fila/retry) — fora do escopo | (A) UTAC próprio · (B) aceitar *fail-closed* com alerta |
| 3 | **Notificação à Associação** (pedido de cartão) | não há endereço/canal dela no repo (GATE 2: não inventar) | (A) operador fornece o canal · (B) a operação consome `public.resgates` (status `pendente`) |
| 4 | **Rótulo do modal da Carteira** (`pontosCartao` vs total) | herdado do R1t — fora do escopo deste UTAC | (A) autorizar `MinhaCarteira`/endpoint (R1t §SEG5) |

### Registo em 3 lugares (R18)

| Lugar | Ficheiro |
|---|---|
| Detalhado | `_logs/UTAC106g-resgate.md` (este) |
| Doc de estado (bloco R14) | `CLAUDE.md` (apêndice no EOF; 4 bytes de controlo intactos) |
| Relatório do operador | `Desktop/RELATORIO-UTAC106g-RESGATE.txt` |

### Custo e commits

A plataforma **partilha a sessão CLI** entre UTACs (§8.d) ⇒ mede-se por diferença.

| Sessão | `source` | chamadas | custo estimado |
|---|---|---|---|
| `20261004_205634_2804b6` — no fecho do R1t era 130 chamadas / US$ 0,1138; agora **262 / US$ 0,3112** ⇒ **Δ deste UTAC ≈ US$ 0,197** | `cli` | +132 | ≈ 0,197 |
| `20261004_232507_2a15ab` (validador, 1.ª ronda) | `subagent` | 47 | 0,0326 |
| `20261004_233822_118d6e` (validador, 2.ª ronda) | `subagent` | 36 | 0,0323 |
| **Total estimado do UTAC** | | | **≈ US$ 0,262** |

- **Saldo da API:** abertura (referência, 23:03) **US$ 5,21** → fecho **US$ 4,66** ⇒ **Δ = US$ 0,55**
  (medida **real**, conta as delegações). ⚠️ As duas leituras **não reconciliam** (0,262 estimado vs 0,55
  medido) — a contabilidade da base é instável; reportam-se **as duas, separadas**.

**Commits (foreground, ficheiros individuais — NUNCA `git add -A`):**

- `8efa431` — baseline (HEAD de arranque).
- `7923e7a` — 1.ª entrega (13 ficheiros: endpoint, store, migração, UI, testes, mutação).
- `e392726` — correcções da 1.ª ronda (**B1** rollback por reversão + **Q1** mutante/alegação).
- `27c9583` — correcção do **facet do B2** (fix in-escopo) + registo. Empurrado: `8efa431..27c9583`.

**Limpeza:** worktree `C:/Users/Moltbot/tmp-106g-val/wt` removido pelo helper A13 (rmdir das 4 junctions
primeiro); `node_modules` real conferido antes/depois: **380/568/498/414 → 380/568/498/414** (idêntico).
**Nenhum** processo node dos subagentes ficou pendurado (medido: só os 2 MCP do utilizador). Temporários
(`%TEMP%/hermes-verify-106g*.py`, `%TEMP%/sb106g`) removidos. Veredictos e probes preservados em
`C:/Users/Moltbot/tmp-106g-val/` (a prova que este registo cita).
