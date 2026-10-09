# VEREDICTO — Validador adversarial UTAC109b (limpeza geral)

**Commit auditado:** `67b7e34` (base `aa1eba9`) · **Repo:** `C:/Users/Moltbot/Desktop/DESAFIOGUT`
**Worktree isolado:** `C:/Users/Moltbot/tmp-109b-val/wt` (HEAD `67b7e34`, árvore limpa)
**Modo:** read-only adversarial — o repo e o worktree NÃO foram alterados (as mutações correram num
sandbox próprio, fora do repo, em `C:/Users/Moltbot/tmp-109b-val/sandbox/`).
**Data:** 2026-10-09 · **Auditor:** Hermes (validador independente)

---

## Veredicto

# ✅ APROVADO — 0 bloqueantes

A limpeza faz **exactamente** o que o log `_logs/UTAC109b-limpeza-geral.md` declara, nem mais nem menos.
Todas as 7 pendências do UTAC108g foram endereçadas conforme as decisões R18 do operador; as invariantes
declaradas estão intactas; a suíte canónica verde foi reproduzida ao teste; as 3 mutações declaradas
mordem de facto (reproduzidas 3/3). Nenhuma alegação do log foi desmentida pelo código.

**Nº de bloqueantes: 0.** (5 notas ℹ️, nenhuma grave.)

---

## Reproduzido por execução (pelo validador)

Todos os comandos abaixo foram corridos por mim; saída real, não copiada do log.

| # | Comando | Saída REAL (validador) | Confere? |
|---|---|---|---|
| 1 | `git diff --name-status aa1eba9 67b7e34` | 8 ficheiros: `M _logs/DEBT.md` · `A _logs/UTAC109b-…md` · `M …/public/robots.txt` · `D …/scripts/test-mc12{,-3,.3.1}.mjs` (×3) · `A …/src/__tests__/utac109b-limpeza.test.mjs` · `M …/src/i18n/pt.js` | ✅ |
| 2 | `git diff --name-only aa1eba9 67b7e34 -- desafio-gut/frontend/netlify/` | **(vazio)** — 0 ficheiros backend | ✅ (g) |
| 3 | `node ../../scripts/mc966-suite-harness.mjs ambos` | `frontend: VERDE 910/910 pass` · `backend: VERDE 1095/1101 pass` · `VEREDITO: VERDE` (1m42,957s) | ✅ (h) |
| 4 | `node --test src/__tests__/utac109b-limpeza.test.mjs` | `ℹ tests 6 / pass 6 / fail 0` | ✅ |
| 5 | Mutação **M1** (reintroduzir `"dash.outrasEdicoes"` em `pt.js`) — *em sandbox* | `✖ P-1 … saiu do dicionário` → `fail 1` | ✅ RED |
| 6 | Mutação **M2** (reintroduzir `Disallow: /corporativo`) — *em sandbox* | `✖ P-2 … saiu do robots.txt` → `fail 1` | ✅ RED |
| 7 | Mutação **M3** (apagar o irmão `dash.edicaoAtiva`) — *em sandbox* | `✖ controlo positivo…` → `fail 1` | ✅ RED |
| 8 | `npx vite build` | `✓ built in 5.53s` · `EXIT=0` | ✅ |
| 9 | `git show 67b7e34:…/robots.txt \| wc -c` / `md5sum` | `309` · `5e74ac1660d23615124612689244ddeb` (**= log**) | ✅ |
| 10 | `git show aa1eba9:…/robots.txt \| wc -c` / `md5sum` | `332` · `43473b56dbd2bc582a862a2e9dd61942` (**= log**) | ✅ |
| 11 | `git show 67b7e34:…/pt.js \| wc -c` / `md5sum` | `8441` · `7b3f708c6f3003f3e0369325a39a20dc` (**= log**) · baseline `8493` | ✅ |
| 12 | `grep -rn outrasEdicoes` | 0 em código de produção; só comentário `mc8843-…test.mjs:194` + docs/logs + o próprio teste novo | ✅ |
| 13 | `grep -c corporativo public/robots.txt` | `0` | ✅ |
| 14 | `grep -rn "test-mc12"` (todo o corpus, excl. node_modules) | só docs (`CLAUDE_DEBUG.md`, `docs/MC89.47-RELATORIO.txt:38`) + `_logs/` | ✅ |
| 15 | `grep -rn "mc12"` em `.github/` · `*/package.json` · `netlify.toml` · `scripts/` | **(vazio)** — 0 chamadores | ✅ |
| 16 | existência de `netlify/functions/{info-pagamento,debug-pedido}.mjs` | **ambos presentes** | ✅ (c) |
| 17 | `mc87-seguranca.test.mjs:29` | `await import("../debug-pedido.mjs")` — chamador real (P1-3 em `:138`) | ✅ |
| 18 | `netlify.toml` refs a `corporativo`/endpoints | **(vazio)** | ✅ |
| 19 | `grep -n 'path="/corporativo"' src/` | **0** (só no `App.jsx.bak-…`); rota inexistente ⇒ remover o `Disallow` é correcto | ✅ (P-2) |
| 20 | `core.autocrlf` + `.gitattributes` | `core.autocrlf=true`; `* text=auto` + `eol=lf` só p/ código ⇒ `robots.txt` sai CRLF no disco (318 B) mas o **blob é LF (309 B)** — artefacto de ambiente, não do commit | ℹ️ |
| 21 | bytes de controlo do `CLAUDE.md` | `0x00: 2 · 0x1F: 2` — iguais ao baseline `aa1eba9` | ✅ |
| 22 | `git diff --summary aa1eba9 67b7e34` | só 3 `delete mode` + 2 `create mode`; **0 mudanças de modo/permissões** | ✅ |

---

## Tabela de achados ⚠️ grave / ℹ️ nota

| Sev | Achado | Tratamento proposto |
|---|---|---|
| ℹ️ | **N1 — `SRC` morto no teste novo.** `src/__tests__/utac109b-limpeza.test.mjs:24` declara `const SRC = fileURLToPath(new URL("..", import.meta.url));` e **nunca o usa** (usa `RAIZ`). | Cosmético. Remover a linha num toque futuro; não afecta a cobertura (o teste morde — ver M1/M2/M3). |
| ℹ️ | **N2 — comentário do `mc8843` sobre a chave removida é INEXACTO (pré-existente).** `netlify/functions/_tests/mc8843-estado-edicao.test.mjs:194` diz que o dicionário i18n tinha «**a MESMA frase**» (⇔ `/Outras Edições em Andamento/`, guarda em `:195`), mas o valor real da chave `dash.outrasEdicoes` era `"🗓️ Outras Edições"` — **sem** «em Andamento». Logo essa guarda nunca poderia ter apanhado a chave. | Inexactidão **anterior a este commit** (não introduzida aqui). A remoção do P-1 não a piora nem a melhora. Candidato a DEBT/doc-fix, fora do escopo do 109b. |
| ℹ️ | **N3 — nome de doc no log.** O log escreve `docs/aprovações-operador.md` (com ç); o ficheiro real é `docs/aprovacoes-operador.md`. | Cosmético (diacrítico). O conteúdo citado («#4 … candidatos a desligar: … info-pagamento») confere. |
| ℹ️ | **N4 — CRLF no disco vs LF no blob.** Neste worktree, `public/robots.txt` tem 318 B (CRLF) porque `core.autocrlf=true` e o `.gitattributes` não lista `.txt`. O **blob commitado é LF e 309 B**, exactamente como o log declara. O teste usa `/…$/m`, que lida com ambos. | Artefacto do ambiente do validador, não defeito do commit. Nenhuma acção. |
| ℹ️ | **N5 — log commitado com SEG11/SEG12 vazios.** `_logs/UTAC109b-limpeza-geral.md` tem as secções «Validador adversarial» e «Deploy + registo» com placeholders «_(preenchido no fecho)_». | Esperado: a validação (eu) e o deploy correm DEPOIS do commit. Não bloqueante. |

**Nenhum achado ⚠️ grave.**

---

## Alegações REFUTADAS

**Nenhuma.** Tentei refutar, uma a uma, todas as alegações verificáveis do log e do enunciado — incluindo
os números aos **bytes** (robots 332→309 · pt.js 8493→8441), md5, contagens da suíte, exit do build, e a
vacuidade do teste novo — e **todas resistiram**. Em particular:

- Confrontei o log com o **blob real** (não só a working tree): `robots.txt` `5e74ac1…`, `pt.js` `7b3f708…`
  — md5 idênticos aos que o log afirma.
- Testei a **vacuidade do teste novo** com 3 mutações reais (M1/M2/M3) num sandbox fora do repo: todas
  produzem RED no teste esperado. O log **também** admite um erro do seu instrumento (contador inflado);
  reproduzi a contagem correcta (**1** teste cai por mutação), a corroborar a nota de errata do executor.

---

## Alegações que NÃO consegui refutar (⇒ confirmadas)

- **(a) as 7 pendências do 108g:** P-1 removida (`pt.js`) · P-2 removida (`robots.txt`) · P-3 os 3 scripts
  `test-mc12*` removidos (`git rm`) · P-4 endpoints **preservados** (R18-D1) · P-5 `Privacidade.jsx` **não
  tocado** · P-6 `DEBT.md` +DEBT-022/+DEBT-023 + errata da 021 · P-7 registado no DEBT-023. **Nenhuma
  ficou por fechar e nenhuma piorou.**
- **(b) nada quebrado:** as invariantes citadas estão **intactas** — `SemSaldoBanner.jsx` (lógica
  `tipoProvavel === "corporativo"`), `AppContext.jsx`, `encaminhamento.js`, `MercadoLances.jsx`,
  `OfertasProgramadas.jsx`, `Dashboard.jsx` (Início), `Carteira.jsx`, `admin/Cotas.jsx`, `cotas.mjs`,
  `CardLance.jsx` — todas com `git diff` **vazio** vs `aa1eba9`.
- **(c) nenhum endpoint removido:** 0 ficheiros alterados em `…/netlify/`; `info-pagamento.mjs` e
  `debug-pedido.mjs` presentes; o chamador do `debug-pedido` (`mc87-seguranca.test.mjs:29`) intacto.
- **(d) `tipoProvavel === "corporativo"` (R18-B, aviso «Sem saldo») NÃO foi tocado** — `SemSaldoBanner.jsx`
  e `AppContext.jsx` com diff vazio.
- **(e) `cotas.mjs` e `admin/Cotas.jsx` NÃO foram tocados** — diff vazio.
- **(f) nenhum `.bak-*` tocado** — os 5 ficheiros (`capacitor.config.ts.bak-…`, `App.jsx.bak-…`,
  `PrivyRoot.jsx.bak-…`, `PrivyRoot.jsx.bak-custom-scheme-…`, `PrivyRoot.jsx.bak-oauth`) com diff vazio.
- **(g) backend intocado:** 0 ficheiros em `netlify/` (excepto no sentido em que o teste novo apenas o LÊ).
  Na verdade, o backend está intocado **na totalidade** — nem sequer os 2 endpoints mortos foram mexidos.
- **(h) suíte canónica VERDE:** reproduzi **910/910** (frontend) e **1095/1101** (backend), VEREDITO VERDE.
- `EM_BREVE_MODE = true` (`src/lib/leilaoLock.js:10`) intacto · `CLAUDE.md` com 2×`0x00`+2×`0x1F` intactos ·
  `npx vite build` exit 0 · o teste novo **não é vácuo** (M1/M2/M3 mordem; o controlo positivo usa literais-irmãos
  conhecidos `dash.edicaoAtiva` e `Disallow: /admin`).

---

## O que NÃO medi

- **Não re-corri o baseline `aa1eba9`** para medir os 904/904 e 1095/1101 declarados. O `+6` do frontend é
  consistente por construção (o único ficheiro de teste acrescentado em `src/` tem exactamente 6 testes e
  mais nada em `src/__tests__/` mudou) — **inferido, não medido no baseline**.
- **Não reproduzi a falha dos 3 scripts `test-mc12*`** (estão apagados; não os ressuscitei no worktree por
  ser auditória read-only). Verifiquei só o que é verificável sem os correr: **0 chamadores** em
  código/CI/`package.json` e que referenciam artefactos apagados (`SejaNossoParceiro.jsx`, `corporativoWallet`).
- **Não validei o deploy em produção** (SEG12 do log está vazio; fora do escopo desta auditoria).
- **Não auditei o mérito individual dos 910/1095 testes** — confiei no agregado do harness `mc966`.
- **Não verifiquei byte-identidade total do `CLAUDE.md`** — só os 4 bytes de controlo (conforme pedido).
- **Não corri o `vite build` no tempo/máquina do executor** (o log diz 18,15 s; aqui 5,53 s — cache/CPU
  diferentes; **exit 0 em ambos**).

---

## Decisão final

**APROVADO. 0 bloqueantes.**

O commit `67b7e34` é uma limpeza cirúrgica e honesta: altera **2 linhas** (1 em `pt.js`, 1 em
`robots.txt`), **remove 3 scripts mortos**, **acrescenta 1 teste versionado** e **actualiza o DEBT**,
não tocando em **nenhum** ficheiro de `netlify/` nem em nenhuma das invariantes declaradas. O log
confronta-se com o código **ao byte** e resistiu a todas as tentativas de refutação. As notas ℹ️
(N1–N5) são cosméticas ou artefactos de ambiente/pré-existentes, **nenhuma bloqueante**. As pendências
P-4 e P-5 foram **correctamente deixadas abertas por decisão explícita do operador (R18-D1/R18-D3)**,
com dívida nova registada (DEBT-022/023) — «fechar não apaga».

*Nota de higiene da auditoria:* as 3 mutações correram em `C:/Users/Moltbot/tmp-109b-val/sandbox/`
(cópia dos ficheiros), nunca no repo nem no worktree; o worktree terminou limpo em `67b7e34`
(`git status --short` vazio) e o processo de build foi morto/polled por PID (exit 0).

---

# RESPOSTA DO EXECUTOR AO VEREDICTO

**Veredicto lido integralmente: ✅ APROVADO — 0 bloqueantes** (5 notas ℹ️, nenhuma grave).
Nenhuma alegação do executor foi refutada. As 5 notas foram tratadas assim:

| Nota | Achado | Tratamento |
|---|---|---|
| ℹ️ **N1** | `SRC` morto no teste novo (`utac109b-limpeza.test.mjs:24`) | **FECHADA** — constante removida (o teste continua 6/6). |
| ℹ️ **N2** | comentário INEXACTO **pré-existente** em `netlify/functions/_tests/mc8843-estado-edicao.test.mjs:194` (diz que a chave tinha «a MESMA frase» do padrão `/Outras Edições em Andamento/`; o valor era «🗓️ Outras Edições») | **DECLARADA + DÍVIDA** — ficheiro de teste **fora do escopo** deste UTAC (GATE 3/HI4); registada como item **(c) da DEBT-023**. Não corrigida aqui. |
| ℹ️ **N3** | o log escrevia `docs/aprovações-operador.md` (com ç); o ficheiro real é `docs/aprovacoes-operador.md` | **FECHADA** — diacrítico corrigido no log. |
| ℹ️ **N4** | `robots.txt` com CRLF no disco do validador (318 B) vs **LF no blob** (309 B) — `core.autocrlf=true`, `.gitattributes` só fixa `eol=lf` para código | **NENHUMA ACÇÃO** — artefacto de ambiente; o blob commitado é LF, como o log declara. |
| ℹ️ **N5** | o log commitado tem o SEG11/SEG12 com placeholders | **ESPERADO** — a validação e o deploy correm depois do commit; preenchidos no fecho. |

**Correcções feitas DEPOIS do veredicto** (N1, N3) **NÃO foram re-validadas** por uma 2.ª ronda
(nem o eram: são cosméticas — 1 linha de código morto removida de um ficheiro de teste e 1 diacrítico
num `.md`). Declarado.

## Erros dos MEUS instrumentos, expostos nesta ronda (declarados)

1. **Contador de mutações inflacionado.** O meu script de mutação somava a linha `✖ <teste>` **e** a
   linha-resumo `failing tests:`, contando 2 por cada teste caído (3/3/2 em vez de **1/1/1**). O
   validador reproduziu a contagem correcta (**1** teste por mutação) num sandbox próprio — a nota de
   errata já constava do próprio log (§SEG9), e fica agora confirmada por medição independente.
2. **Contagem de `passes` do reporter.** O mesmo script lia `passes=0` no original porque procurava o
   prefixo `ok ` em vez do glifo `✔` do reporter `spec` do node. O sinal fiável — e que usei — é o
   **`exit code`** (0) e o **nome** do teste caído, não o contador. Declarado no log desde o início.

## O que o validador NÃO mediu

- Não re-correu o baseline `aa1eba9` (o `+6` do frontend é inferido por construção: o único ficheiro de
  teste acrescentado tem 6 testes e mais nada em `src/__tests__/` mudou). O executor **mediu** o
  baseline: `904/904` (arranque) → `910/910` (fecho) — coerente com o `+6`.
- Não validou o deploy em produção (fora do escopo dele; é o SEG12 abaixo).
- Não reproduziu a falha dos 3 scripts apagados (read-only) — verificou que **0 chamadores** existem em
  código/CI/`package.json`. O executor guardou a saída real dos 3 no §SEG3 do log (evidência HI10).
