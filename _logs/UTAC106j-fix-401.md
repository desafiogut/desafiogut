# UTAC106j-fix — Correcção do 401 nos 4 hooks da Via B (fonte do token: auth-lance → authToken)

**Tipo:** CORRECÇÃO DE CÓDIGO (frontend + testes) · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-05 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**Baseline/HEAD:** `96094bb` (= `origin/main`) · **Commit do fix:** `4933629` · **Frentes:** 2 (4 hooks + testes com token real).

> **Objectivo:** alinhar os 4 hooks da Via B (`useComprarPasse`, `usePontos`, `usePalpite`,
> `useResgatarCartao`) com o verificador que os 4 endpoints já usam — trocar a fonte do Bearer de
> `getAuthToken()` (`auth-lance`, JWT `tipo:"lance-auth"`) para o `authToken` (**user-session**) do
> `AppContext`, o MESMO que o `saldo-rs` já usa (Opção A decidida pelo operador). Corrigir a cegueira
> dos testes e provar com **token REAL**. Não alargar a superfície de auth; não tocar na Via A.

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `96094bb` (idênticos) | `git rev-parse` |
| Suíte (baseline) | **VERDE** — frontend 774/774 · backend 1054/1060 | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `POST /comprar-passe-pontos` sem Bearer | **401** ✅ | `curl` |
| `GET /ler-pontos` sem Bearer | **401** ✅ | `curl` (⚠️ ver erro de instrumento abaixo) |
| `POST /registar-palpite` sem Bearer | **401** ✅ | `curl` |
| `POST /resgatar-cartao` sem Bearer | **401** ✅ | `curl` |
| `POST /nao-existe-xyz` (controlo de existência) | **404** | `curl` |
| `EM_BREVE_MODE` | `true` (`src/lib/leilaoLock.js`) | leitura |

⚠️ **Erro de instrumento (declarado):** a 1.ª sonda do `GET /ler-pontos` foi feita com
`curl -X GET -d '{}'` e devolveu **502** (o curl com corpo num GET faz o Netlify falhar antes de chegar
ao handler) — parecia «o endpoint não responde». Re-medido **sem corpo** (`curl -s -i .../ler-pontos`) →
**401** com `token_ausente`. A leitura errada fica à vista; o controlo `/nao-existe-xyz` → 404 confirma
que os 4 endpoints existem e respondem (a lição do §15.h: um endpoint ausente dá 400/404, não 401).

---

## §SEG0-3 — Os 4 hooks: só a fonte do token

Modificação cirúrgica: o token passa a vir do `useAppContext()`; deixa de se importar/chamar
`useTrocarPorSenhas().getAuthToken()`. Mais nada mudou (débito, idempotência, guardas de corrida e
contratos intactos). Guarda nova `sem_sessao` porque o `authToken` é cunhado em `POST /auth-user` e
chega DEPOIS do `address`.

| Hook | Antes (fonte) | Depois (fonte) | `ficheiro:linha` (depois) |
|---|---|---|---|
| `useComprarPasse.js` | `getAuthToken()` — `useTrocarPorSenhas` (`:32`/`:50`) | `authToken` do `useAppContext()` | `:31` (destructure), `:41` (guarda), `:53` (uso), `:76` (deps) |
| `usePontos.js` | `getAuthToken()` via ref (`:22-24`/`:35`) | `authToken` do `useAppContext()` | `:22` (destructure), `:31` (guarda), `:33` (uso), `:56` (deps) |
| `usePalpite.js` | `getAuthToken()` via ref (`:15-17`/`:37`) | `authToken` do `useAppContext()` | `:16` (destructure), `:35` (guarda), `:38` (uso), `:58` (deps) |
| `useResgatarCartao.js` | `getAuthToken()` — `useTrocarPorSenhas` (`:31`/`:48`) | `authToken` do `useAppContext()` | `:30` (destructure), `:47` (guarda), `:52` (uso), `:72` (deps) |

`usePontos` precisou de uma mudança de dependências: o efeito de leitura passa a depender de
`[address, authToken]` (antes `[address]`, com o `getAuthToken` num `ref` para não re-disparar em ciclo).
Como o `authToken` é uma string primitiva, a dependência é estável e faz o efeito RE-CORRER quando o
token chega (o `address` chega antes). O `ref` deixou de ser necessário e foi removido.

`git diff --numstat` (só linhas pretendidas — EOL **LF** preservado, verificado com `file`):
`useComprarPasse 10/9 · usePontos 10/13 · usePalpite 9/8 · useResgatarCartao 8/7`.

---

## §SEG4 — Teste com token REAL + mutação

### 4.1 Cegueira fechada (duas camadas)

1. **Backend** — `_tests/ler-pontos.test.mjs` fazia
   `mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({…}) } })`:
   **substituía o próprio verificador**, logo passava com QUALQUER token (mesmo `lance-auth`).
   Corrigido: o `_lib/jwt.mjs` passou a ser o **REAL**; os tokens são ASSINADOS com o `JWT_SECRET` de
   teste via `assinarUserSession`/`assinarLanceAuth`. Testes novos:
   `AUTH — user-session → NÃO é 401` e `AUTH — lance-auth → 401 token_invalido`.
2. **Frontend** — os testes 106e/106f/106g providenciavam ao contexto um `authToken` com o **mesmo
   valor** que o duplo de `getAuthToken` (`"TOKEN-DE-TESTE-106e"`), pelo que a asserção do Bearer era
   **vacuosa** (passava com qualquer das duas fontes). Corrigido: o `authToken` do contexto passou a
   valor DISTINTO (`AUTHCTX-106e/106f/106g`) e a asserção exige esse valor — se um hook voltar ao
   `getAuthToken`, o teste cai. Foi também acrescentada a asserção do Bearer do `ler-pontos` (antes só
   se assertava a URL), sem a qual a mutação do `usePontos` seria vacuosa.

### 4.2 Teste novo dos 4 endpoints com token real

`_tests/auth-via-b-401.test.mjs` (NOVO, `_lib/jwt.mjs` REAL, duplos só em `@netlify/blobs` /
`supabase-client` / `sentry-server`). 5 testes:

| Teste | O que prova |
|---|---|
| NEGATIVO — `lance-auth` → 401 `token_invalido` em TODOS | o 401 de produção, agora medido como teste |
| POSITIVO — `user-session` → NÃO é 401 em TODOS | o efeito do fix (passa a autenticação) |
| CONTROLO — sem Bearer → 401 `token_ausente` | a decisão não é pública |
| CONTROLO — Bearer não assinado → 401 `token_invalido` | assinatura verificada a sério |
| INVERSÃO Via A — `comprar-senhas` aceita `lance-auth` e rejeita `user-session` | a Via A não foi afectada |

### 4.3 Mutação (GATE 7/8) — 5/5 RED, restaurado byte-idêntico

Mutador próprio (`%TEMP%/utac106jfix/mutar.py`): âncoras em **bytes**, `assert count==1`, backup **fora
do repo**, sha256 antes/depois. Cada mutação foi aplicada, o teste correspondente correu (**RED**) e o
ficheiro foi restaurado do backup.

| # | Mutação | Teste | Resultado |
|---|---|---|---|
| M1 | `useComprarPasse` → volta a `getAuthToken` (Via A) | `utac106e` | **1 RED** (asserção do Bearer) |
| M2 | `usePontos` → idem | `utac106f` | **1 RED** (Bearer do `ler-pontos`) |
| M3 | `usePalpite` → idem | `utac106f` | **1 RED** (Bearer do `registar-palpite`) |
| M4 | `useResgatarCartao` → idem | `utac106g` | **1 RED** (Bearer do `resgatar-cartao`) |
| M5 | `ler-pontos.test.mjs` → re-introduz o mock do verificador | `ler-pontos.test.mjs` | **1 RED** (o teste `AUTH — lance-auth → 401` cai: com o verificador mockado, o token falso passa) |

SHAs restaurados **byte-idênticos** ao original (M1 `ccf9b642…`, M2 `de7e7e00…`, M3 `39f5fab6…`,
M4 `844fb9f9…`, M5 `92942f60…`). Sem vestígios `MUTANTE-VIA-A`/`fake-` no repo.

**Leitura da M5:** é a prova de que o teste novo **não é vacuoso** — basta re-introduzir o mock do
verificador (a técnica que escondia o bug) para o controlo negativo FALHAR. A correcção do teste é o que
faz a suíte passar a morder.

---

## §SEG5 — Verificação

| Verificação | Resultado |
|---|---|
| Suíte canónica (após o fix) | **VERDE** — frontend **774/774** · backend **1061/1067** (+7 testes: 2 AUTH no `ler-pontos` + 5 novos) |
| `npx vite build` | **OK** — 3668 módulos, `built in 14.86s`, exit 0 |
| Verificação ad-hoc (`%TEMP%/hermes-verify-utac106jfix.mjs`) | **36 PASS / 0 FAIL** |
| Auto-teste do verificador ad-hoc (mutar M1 → deve FALHAR) | **2 FAIL** ✅ (o instrumento morde; restaurado) |

O ad-hoc verifica: os 4 hooks usam `authToken` (e já não `getAuthToken`/`useTrocarPorSenhas` fora de
comentário) · os 4 endpoints continuam com `verificarUserSession` · `comprar-senhas` continua com
`verificarLanceAuth` · `api.js` monta `Bearer ${token}` · `AppContext.jsx` NÃO modificado · nenhum
`.bak-*` tocado · `_lib/jwt.mjs`/`_lib/auth.mjs` intocados · endpoints Via A/B intocados ·
`package*.json` intocados · `MinhaCarteira.jsx`/`ComprarPasseModal.jsx` intocados · 5 `.bak-*` intactos ·
`EM_BREVE_MODE = true` · `CLAUDE.md` com 2×`0x00` + 2×`0x1F` · `HEAD == origin/main`.

**Teste integrado (in-process):** com token `user-session` real, o `comprar-passe-pontos` faz o fluxo
completo até 201 em `_tests/passe-pontos.test.mjs` (E1, já existente, com `assinarUserSession` REAL); os
outros 3 passam a autenticação no `auth-via-b-401.test.mjs` (não-401). O 201/200 de produção é medido no
SEG7.

---

## §SEG6 — Validador adversarial

**Subagente:** `deleg_6c1f65a2` · worktree isolado `C:/Users/Moltbot/tmp-106jfix-val/wt` (detached
`4933629`, 4 junctions A13) · veredicto-fonte `C:/Users/Moltbot/tmp-106jfix-val/VEREDICTO-106jfix.md`.

**Veredicto: APROVADO COM RESSALVAS · 0 bloqueantes.** Das 9 hipóteses de refutação (a)-(i), **nenhuma
se confirmou**; as ressalvas são notas ℹ️ não-bloqueantes, não defeitos.

--- INÍCIO DO VEREDICTO VERBATIM ---

# VEREDICTO — UTAC106j-fix (401 Via B) — auditoria ADVERSARIAL (tentativa de refutação)

**Veredicto: APROVADO COM RESSALVAS · 0 bloqueantes**
(equivalente a APROVADO: das 9 hipóteses de refutação (a)–(i), **nenhuma se confirmou**; as ressalvas são notas não-bloqueantes, não defeitos.)

- Repo de referência (leitura): `C:/Users/Moltbot/Desktop/DESAFIOGUT`
- Alvo auditado: worktree isolado `C:/Users/Moltbot/tmp-106jfix-val/wt` @ `4933629` (detached)
- Diff auditado: `96094bb..4933629` — **9 ficheiros**, 235 inserções / 50 remoções
- O worktree auditado ficou **limpo (`git status` vazio) e em `4933629`** depois de toda a auditoria — não foi tocado.

---

## «Reproduzido por execução» (comandos + saída real)

### 1. Suíte canónica (worktree auditado)
```
$ cd C:/Users/Moltbot/tmp-106jfix-val/wt
$ node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 774/774 pass
backend: VERDE 1061/1067 pass
VEREDITO: VERDE            (exit 0)
```
⚠️ Nota de instrumento: a primeira tentativa em `background` com `| tee` produziu **saída vazia** (artefacto de tty do Windows). Repetida em foreground → acima. Saída vazia **não** foi lida como verde.

### 2. Testes individuais (worktree auditado)
```
node --test --experimental-test-module-mocks _tests/auth-via-b-401.test.mjs   → ℹ tests 5  pass 5  fail 0
node --test --experimental-test-module-mocks _tests/ler-pontos.test.mjs        → ℹ tests 11 pass 11 fail 0
node --test --test-concurrency=1 src/pages/__tests__/utac106e-compra-passe.test.mjs → 14/14
node --test --test-concurrency=1 src/pages/__tests__/utac106f-ofertas.test.mjs      → 15/15
node --test --test-concurrency=1 src/pages/__tests__/utac106g-resgate.test.mjs      → 6/6
```

### 3. Greps / diffs (worktree auditado)
```
$ grep -nE "lance-auth|useTrocarPorSenhas|getAuthToken|auth-lance" \
    src/hooks/useComprarPasse.js src/hooks/usePontos.js src/hooks/usePalpite.js src/hooks/useResgatarCartao.js
  → 4 ocorrências, TODAS em linhas de COMENTÁRIO (`// …`). Zero em código.
$ git diff --name-only 96094bb 4933629 | wc -l        → 9
$ git diff 96094bb 4933629 -- '*.bak-*' '*AppContext.jsx' '*comprar-senhas.mjs' \
    '*_lib/jwt.mjs' '*comprar-passe-pontos.mjs' '*ler-pontos.mjs' '*registar-palpite.mjs' \
    '*resgatar-cartao.mjs' '*_lib/auth.mjs'
  → VAZIO (nenhum destes ficheiros foi alterado)
$ grep -rnE "comprar-passe-pontos|ler-pontos|registar-palpite|resgatar-cartao" src --include=*.js --include=*.jsx
  → os ÚNICOS call-sites são os 4 hooks (todos com `token: authToken`); sem 5.º fluxo Via B.
```

### 4. Sonda própria (b) — status REAL de cada endpoint com `user-session` assinado a sério
Instrumento escrito **fora do worktree auditado** (sandbox separado), importando os handlers REAIS + `_lib/jwt.mjs` REAL, `assinarUserSession()`; mocks só de I/O (`@netlify/blobs`, `supabase-client`, `sentry-server`):
```
SONDA_B_RESULTADO
comprar-passe-pontos: HTTP 402 (saldo_insuficiente)
ler-pontos:           HTTP 200
registar-palpite:     HTTP 404 (edicao_inexistente)
resgatar-cartao:      HTTP 400 (morada_invalida)
```
⇒ **nenhum** rejeita `user-session`; nenhum dá 401 nem 500. Todos passam a autenticação e chegam à lógica de negócio.

### 5. Mutação (em sandbox separado, jamais no worktree auditado)
- **M1–M4** — token trocado pelo valor que a Via A produz (`_stubs-106e` = `"TOKEN-DE-TESTE-106e"`) em cada um dos 4 hooks:
```
utac106e: ✖ 1 falha (pass 13/14)   utac106f: ✖ 2 falhas (pass 13/15)   utac106g: ✖ 1 falha (pass 5/6)
```
⇒ as asserções do Bearer **MORDEM** (o teste fica vermelho se o hook voltar a enviar o token da Via A).
- **M5** — reintroduzido `mock.module("../_lib/jwt.mjs", { verificarUserSession: …sucesso… })` no `auth-via-b-401.test.mjs`:
```
✖ NEGATIVO — lance-auth → 401 token_invalido   ✖ CONTROLO — Bearer não assinado → 401
ℹ tests 5  pass 3  fail 2
```
⇒ o teste novo **não é vacuosamente verde**; se o verificador for mockado, cai.

### 6. Site vivo (produção actual, pré-deploy)
```
GET (sem corpo, sem Bearer):
  comprar-passe-pontos 405 · ler-pontos 401 (token_ausente) · registar-palpite 405 ·
  resgatar-cartao 405 · comprar-senhas 405
```
Os 4 endpoints existem e estão vivos. **Não** consegui assinar um `lance-auth` de produção (sem `JWT_SECRET`) — logo **não medi** o 401 real do fluxo antigo contra produção; medi-o **in-process** (M5/NEGATIVO: `lance-auth → 401 token_invalido`).

---

## Tabela de achados

| # | Gravidade | Achado | Tratamento proposto |
|---|-----------|--------|---------------------|
| 1 | ℹ️ nota | O teste POSITIVO do novo ficheiro (`auth-via-b-401.test.mjs`) só assere `!= 401`; um 400/402/500 passaria. | Reforçar com `assert.notEqual(status,500)` ou status esperado por endpoint. A minha sonda (b) mostra que hoje é 200/400/402/404 — sem 500. Não bloqueante. |
| 2 | ℹ️ nota | (e) é **verdadeiro e esperado**: produção ainda dá 401 ao fluxo antigo porque o deploy é SEG7 e **não foi feito** (frontend antigo + 4 endpoints inalterados). | Fechar apenas após o deploy (SEG7). Não é defeito do fix; é ordem de execução. |
| 3 | ℹ️ nota | A mensagem do commit alega «`vite build` OK» — **não corri o build**. | Correr `vite build` no fecho, se quiser fechar essa alegação. |
| 4 | ℹ️ nota | A ressalva de robustez de sessão: `authToken` chega depois do `address`; os 4 hooks guardam `sem_sessao` e `usePontos` re-corre em `[address, authToken]`. | Já tratado no fix. Sem acção. |
| 5 | ℹ️ nota (housekeeping) | Deixei `C:/Users/Moltbot/tmp-106jfix-val/mut` órfão em disco (sandbox de mutação; remoção travou por «Filename too long» dentro de um `node_modules` parcial). **Já desregistado do repo** (`git worktree prune`/`remove` — `git worktree list` só mostra main, o scratchpad do Claude e o `wt`). | Apagar `mut` manualmente (painel/`robocopy /MIR` de vazio) quando for conveniente. Fora do repo. |

---

## Alegações REFUTADAS
**Nenhuma alegação do executor foi derrubada.** As 9 hipóteses de refutação (a)–(i) foram todas testadas e **falharam** — ou seja, o fix resiste.

## Alegações que NÃO consegui refutar (verificadas)
- **(a)** Nenhum dos 4 hooks envia `lance-auth` em código — só comentários. ✅ (grep)
- **(b)** Nenhum endpoint rejeita `user-session`. ✅ (sonda própria: 200/400/402/404, nunca 401) — hipótese REFUTADA.
- **(c)** Nada que usava `lance-auth` ficou quebrado: `useTrocarPorSenhas` intacto (exports `getAuthToken`); consumidores Via A intactos e fora do diff (`CardLance`, `CorporativoBanners`, `CorporativoCarteira`, `MinhaCarteira`, `BannerUpload`, `comprar-senhas`). ✅
- **(d)** O teste novo **não** mocka o verificador (importa o `_lib/jwt.mjs` REAL). ✅ (grep + leak): só mocka `@netlify/blobs`/`supabase-client`/`sentry-server`. Hipótese REFUTADA. E o teste morde (M5).
- **(f)** `AppContext.jsx` **não** foi alterado (diff vazio). ✅
- **(g)** Nenhum `.bak-*` tocado (diff `*.bak-*` vazio; os 5 `.bak-*` presentes e intactos). ✅
- **(h)** `comprar-senhas.mjs` (Via A) **não** foi tocado (diff vazio). ✅
- **(i)** A suíte canónica NÃO está vermelha: **VERDE** (774/774 + 1061/1067). ✅
- Extra: só os 4 hooks chamam os 4 endpoints; não há 5.º fluxo Via B esquecido. ✅
- Extra: `_lib/jwt.mjs` REAL: `verificarUserSession` aceita `user-session`/`admin-access` e rejeita o resto (linha 81); `verificarLanceAuth` exige `lance-auth`. ✅

## O que NÃO medi
- O 401 real do fluxo antigo **contra produção** (não tenho `lance-auth` de produção; medi-o in-process via `jwt.mjs` REAL → 401 `token_invalido`).
- `vite build` (alegação do commit; não corrida por mim).
- Se o deploy SEG7 já ocorreu (por contrato, não; o frontend de produção serve o bundle antigo — não inspeccionei o bundle vivo).

## Decisão
**APROVADO COM RESSALVAS (0 bloqueantes).** O fix faz exactamente o que afirma — troca a FONTE do token nos 4 hooks para o `authToken` (user-session) do AppContext — sem tocar em endpoints, `_lib/jwt.mjs`, `comprar-senhas`, `AppContext.jsx` nem `.bak-*`; a cegueira de teste (mock do verificador) foi fechada e provada por mutação; a suíte canónica está verde. Ressalvas: reforçar o assert do teste positivo (nota 1), fechar o deploy SEG7 (nota 2) e a alegação de build (nota 3).

--- FIM DO VEREDICTO VERBATIM ---

### Resposta do executor ao veredicto

| Ressalva | Tratamento |
|---|---|
| ℹ️1 — o teste POSITIVO só assertava `!= 401` (um 400/402/500 passaria) | **FECHADA com código** no commit `7dc291f`: `ESPERADO_USER` fixa o status por endpoint (`ler-pontos` 200; os 3 POST 400 na validação do corpo, DEPOIS da auth) e exclui explicitamente o 500. Teste 5/5 verde. ⚠️ **Não re-validada** (feita depois do veredicto). |
| ℹ️2 — (e) é verdadeiro e esperado: produção ainda dá 401 ao fluxo antigo (deploy = SEG7, não feito) | **FECHADA pelo deploy** (§SEG7): o bundle novo está em produção e a prova de ponta a ponta com token real mostra 402/200/404/400. |
| ℹ️3 — a mensagem do commit alega «`vite build` OK» e o validador **não** correu o build | Declarado: o build **foi** medido pelo executor (`npx vite build` → `built in 14.86s`, exit 0) e repetido pelo Netlify no deploy. O validador limitou-se a não o correr (declarou-o em «o que não mediu»). |
| ℹ️4 — robustez de sessão (`authToken` chega depois do `address`) | Já tratado no fix (guarda `sem_sessao`; `usePontos` re-corre em `[address, authToken]`). Sem acção. |
| ℹ️5 — dir `mut` órfão em `C:/Users/Moltbot/tmp-106jfix-val/mut` (sandbox de mutação; `node_modules` parcial) | Housekeeping **fora do repo**, no fecho (removido com o resto do `tmp-106jfix-val`, após rmdir dos reparse points). Não afecta o repo. |

**Erros dos meus PRÓPRIOS instrumentos (declarados):**
1. O verificador ad-hoc tinha um check `HEAD == origin/main` (estado PRÉ-commit) que deu **FAIL falso**
   depois do commit local do fix — corrigido para `origin/main é ancestral do HEAD`.
2. A 1.ª sonda de `GET /ler-pontos` usou `curl -X GET -d '{}'` → **502** (artefacto do curl com corpo num
   GET). Re-medida sem corpo → **401**. Leitura errada mantida à vista no §SEG-1.
3. O `netlify deploy --prod` sujou `desafio-gut/frontend/package-lock.json` (reincidente) — arquivado
   fora do repo e restaurado ao HEAD.
4. Caminhos POSIX `/c/...` passados a binários nativos (`node`, `curl -o`) deram `MODULE_NOT_FOUND` /
   ficheiro em `C:\tmp` — re-corridos com `C:/...`.
5. **A junction A13 faz um `npm install` do subagente LEAKAR para o `node_modules` REAL.** O validador
   correu `npm install @aws-sdk/client-kms` (para uma sonda própria) e verificou que o `package.json`/
   `package-lock` ficavam intactos (o que é verdade) — mas como o `node_modules` do worktree é uma
   **junction** para o real, os 31 pacotes aterraram no `desafio-gut/frontend/netlify/functions/node_modules`
   REAL: a contagem subiu **414 → 418** (+`@aws-sdk`, `@smithy`, `@aws-crypto`, `@aws`, mtime 04:29). Detetado
   pela contagem antes/depois (a regra «415/417 é a única prova»), arquivado fora do repo e removido →
   contagem **restaurada a 414** e suíte re-verificada **VERDE** (1061/1067). ⚠️ Lição: um instrumento que
   faz `npm install` **dentro de um worktree com junctions** altera o `node_modules` real — medir as
   contagens DOS DOIS LADOS antes e depois.

---

## §SEG7 — Deploy (foreground)

| Item | Medido |
|---|---|
| Comando | `npx netlify deploy --prod` (da raiz, onde está o `netlify.toml`) — **foreground** (GATE 10) |
| Netlify CLI | autenticado (DESAFIO GUT · projeto `silly-stardust-ca71bc`) |
| Build remoto | `Netlify Build Complete` — 6m 3.7s · 267 ficheiros + 83 funções · 51 assets |
| Deploy URL único | `https://6ac3515352aac10da13e60db--silly-stardust-ca71bc.netlify.app` |
| Produção | `https://silly-stardust-ca71bc.netlify.app` |
| Site 200 · health 200 | ✅ |
| **Bundle MUDOU** | entry `index-BEKI8mOb.js` (sha256 `e770da0ae19b87d2`) → `index-B5dFqsDB.js` (sha256 `2c4f619f2b3624bb`) |
| 4 endpoints sem Bearer | **401** (inalterado) — comprar-passe-pontos, ler-pontos, registar-palpite, resgatar-cartao |
| `package-lock.json` (frontend) | sujo pelo `npm install` do build → arquivado fora do repo e **restaurado** ao HEAD ✅ |
| Suíte pós-deploy | **VERDE** — frontend 774/774 · backend 1061/1067 |

### Prova de ponta a ponta em PRODUÇÃO (token REAL, mesma carteira descartável)

`%TEMP%/utac106jfix/probe-prod-106jfix.mjs` gerou a carteira `0x0052D253c4Cd70af59680669098998c4045665ac`,
assinou `DESAFIOGUT-AUTH:<ts>:<addr>` e obteve **os dois** tokens do site vivo: `POST /auth-user` → 200
(`user-session`) e `POST /auth-lance` → 200 (`lance-auth`). Com cada token, os 4 endpoints:

| Endpoint | `user-session` (o que o fix passa a enviar) | `lance-auth` (o que os hooks enviavam) |
|---|---|---|
| `POST /comprar-passe-pontos` | **402** `saldo_insuficiente` | **401** `token_invalido` |
| `GET /ler-pontos` | **200** | **401** `token_invalido` |
| `POST /registar-palpite` | **404** `edicao_inexistente` | **401** `token_invalido` |
| `POST /resgatar-cartao` | **400** `morada_invalida` | **401** `token_invalido` |

⇒ **inversão perfeita** medida em produção: com o token que o fix envia, os 4 fluxos passam a
autenticação (402/200/404/400); com o token antigo continuam **401 `token_invalido`**. A variável isolada
é o TIPO do token. Os 4 fluxos da Via B deixaram de estar inoperáveis.

---

## §SEG8 — Registo, custo e fecho

### Registo em 3 lugares (R18)

| Lugar | Ficheiro |
|---|---|
| Detalhado | `_logs/UTAC106j-fix-401.md` (este) |
| Doc de estado (bloco R14) | `CLAUDE.md` (apêndice no EOF; 2×`0x00` + 2×`0x1F` intactos) |
| Relatório do operador | `Desktop/RELATORIO-UTAC106j-fix-401.txt` |

### Commits (foreground, ficheiros individuais — NUNCA `git add -A`)

| SHA | O que fez |
|---|---|
| `96094bb` | baseline (heredado do UTAC106j) |
| `4933629` | fix: 4 hooks + testes com token real + `auth-via-b-401.test.mjs` |
| `7dc291f` | correcção pós-veredicto (ℹ️1): reforça o teste positivo com o status esperado |
| *(este registo)* | log + bloco R14 do `CLAUDE.md` |

### Custo (por diferença; a plataforma pode partilhar sessão)

| Sessão | `source` | msgs | chamadas | custo estimado |
|---|---|---|---|---|
| `20261005_034921_8e41d0` (esta ronda) | `cli` | 199 | 114 | ≈ US$ 0,0931 |
| `20261005_040338_0936cc` (validador adversarial) | `subagent` | 126 | 74 | ≈ US$ 0,0337 |
| **Total estimado do UTAC** | | | | **≈ US$ 0,127** |

- **Duração:** arranque `03:49:53` → fecho `04:37:35` = **≈ 48 min** (dentro de HI5 = 2 h).
- **Saldo da API:** arranque **US$ 3,70** → fecho **US$ 3,46** ⇒ **Δ = US$ 0,24** (medida REAL). ⚠️ As duas
  leituras **não reconciliam** (0,127 estimado vs 0,24 medido) — a base é instável; reportam-se as duas,
  separadas (a de `state.db` é estimativa; a do saldo é real).

---
