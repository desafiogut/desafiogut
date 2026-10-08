# VEREDICTO — Refutação da auditoria UTAC108b

**Subagente validador adversarial** · worktree `C:\Users\Moltbot\tmp-108b-val\wt` · 2026-10-07
**Alvo:** `_logs/UTAC108b-auditoria-producao.md`
**Método:** releitura do documento + re-medição independente contra produção pública
(`https://silly-stardust-ca71bc.netlify.app/`), por `urllib` (nunca `curl -o /dev/null`), classificação
por `content-type`, e git/suíte no worktree.

---

## VEREDICTO: **APROVADO COM RESSALVAS** — **0 bloqueantes**

Tentei derrubar as 10 alegações-núcleo (A1–A10) e o diagnóstico dos 4 erros. **Não derrubei nenhuma.**
Cada alegação-núcleo foi **reproduzida independentemente** e bateu ao detalhe. Encontrei **4 imprecisões
menores** (nenhuma altera o veredicto nem o número de endpoints): 1 ⚠️ nota de reprodutibilidade +
3 ℹ️ de precisão de redacção. **A auditoria é sólida e não bloqueia o 108c.**

---

## 1. Reproduzido por execução (comandos e saída real)

### R1 — Suíte canónica (a alegação A8 / (h))
```
$ cd C:/Users/Moltbot/tmp-108b-val/wt && node scripts/mc966-suite-harness.mjs ambos < /dev/null
frontend: VERDE 849/849 pass
backend: VERDE 1095/1101 pass
VEREDITO: VERDE
EXIT=0
```
✅ **A8 confirmada ao número.** Corrida em **foreground** com `< /dev/null` (o método exigido; em
background daria `stdin is not a tty` = falso-verde). **(h) NÃO refutada.**

### R2 — Inventário de endpoints em produção (A2 / (e))
84 `.mjs` locais na raiz de `netlify/functions/` sondados em produção (`urllib`, status + content-type):
```
local root .mjs: 84
statuses: {200: 8, 400: 13, 401: 27, 403: 7, 405: 26, 410: 2, 503: 1}   # = 84, HTML: 0
NON-JSON endpoints (text/plain, NÃO html): 8
  backup-blobs-scheduled(403) fila-processor-scheduled(403) ia-preditiva-scheduled(403)
  img-proxy(400) monitor-onchain-scheduled(403) purge-logs-scheduled(403)
  scheduled-anuncio-especial(403) scheduled-encerrar-especial(403)
errors: [] ; text/html: 0
```
✅ **A2 confirmada: 84/84 servidos, 0 em falta.** A distribuição de status é **idêntica** à do §4 da
auditoria. Sem `netlify/edge-functions/` (só existe `functions/`), logo o inventário não omite famílias
de endpoints. **(e) NÃO refutada.**

### R3 — Sincronia local↔produção (A1 / (c)) — *a prova mais frágil, atacada a fundo*
Descarreguei o `index.html` e fiz BFS por `assets/*.js`; **todos os 17 literais da tabela §3 da auditoria
contados por-chunk em produção** (não por substring), contra os números que a auditoria afirma:
```
'Trocar R$'              prod_chunks=0   audit=0   OK      'Seu lance (em centavos)' prod=1 audit=1 OK
'useTrocarPorSenhas'     prod_chunks=4   audit=4   OK      'Palpites'                prod=1 audit=1 OK
'Ofertas Programadas'    prod_chunks=4   audit=4   OK      'NÃO FOI DESSA VEZ'       prod=1 audit=1 OK
'Comprar Passe'          prod_chunks=1   audit=1   OK      'Seja Nosso Parceiro'     prod=2 audit=2 OK
'Passe Desafio'          prod_chunks=4   audit=4   OK      '/edicao/'                prod=0 audit=0 OK
'Total de Lances'        prod_chunks=3   audit=3   OK      '"/corp"'                 prod=0 audit=0 OK
'Lances Únicos'          prod_chunks=3   audit=3   OK      '/redirect'               prod=1 audit=1 OK
'Quanto você oferta'     prod_chunks=0   audit=0   OK      'Você tem'                prod=2 audit=2 OK
'ninguém repetir'        prod_chunks=1   audit=1   OK
```
**17/17 batem EXACTAMENTE.** Sondas adicionais de desincronia:
```
'[GUT] login completo' prod_chunks=1   (e src/PrivyRoot.jsx:143 tem a string) → sincronizado
'trocaInfo' 0 · 'trocaErro' 0 · 'creditoTxHash' 0 em produção  → prod NÃO tem código removido (não é stale)
entry chunk servido: assets/index-Ci4XuUO-.js   → confirma o nome do bundle de produção da auditoria
```
✅ **A1 confirmada: produção sincronizada.** Procurei um literal num lado e não no outro — não existe
(nem código removido localmente a sobreviver em produção, nem código local ausente de produção).
**(c) NÃO refutada.**

### R4 — Código inalterado (A9 / (f)) e `.bak-*` (g)
```
$ git diff --name-only 86ffe2c..HEAD
CLAUDE.md
_logs/UTAC108a-manifesto.md
_logs/UTAC108b-auditoria-producao.md
_logs/UTAC109a-inventario.md
docs/aprovacoes-operador.md
$ git log --oneline 86ffe2c..HEAD -- desafio-gut/frontend/src desafio-gut/frontend/netlify   # (vazio)
$ git status --porcelain | grep -v '^??'                                                    # (vazio)
$ git ls-files | grep -c '\.bak-'   →  5   (intocados; working tree limpo)
```
✅ **A9 confirmada: ZERO alterações em `src/` ou `netlify/`.** **(f) e (g) NÃO refutadas.**

### R5 — Os 404 de `/cotas` são por desenho (A3) e a armadilha D-7 (A6)
```
/.netlify/functions/cotas              -> 200 application/json  {"resumo":{"bronze":{"total_atribuidas":1},...}}
/.netlify/functions/cotas?cliente=test -> 200 application/json  (resumo agregado)
/.netlify/functions/cotas?email=x@y.z  -> 401 application/json  {"error":{"code":"token_ausente",...}}
/.netlify/functions/debug-pedido       -> 503 application/json  {"error":{"code":"config_ausente",...}}
/netlify/functions/cotas               -> 200 text/html          (index.html da SPA — SEM o ponto) ✓ D-7
/netlify/functions/nao-existe-xyz      -> 200 text/html          (catch-all engole paths inexistentes) ✓ D-7
```
Código: `netlify/functions/cotas.mjs` tem **exactamente** os 6 ramos 404 citados (`:214 :241 :291 :316
:609 :713`); `src/lib/retornoOAuth.js:12-15` documenta-os; `src/lib/api.js:23` = `const BASE =
"/.netlify/functions/"` (**com** o ponto). ✅ **A3 e A6 confirmadas.**

### R6 — Privy é ruído do SDK (erros 1 e 2, §1.1)
```
$ grep -rn "privy\.io" src/        # (sem .bak) → 4 ocorrências, TODAS documentais (App.jsx:387,
                                   #  Privacidade.jsx:161, PrivyRoot.jsx:198, shims/farcaster-...:6)
$ grep -rn "api\.privy\.io" src/ --include=*.js --include=*.jsx | grep -v '\.bak' | wc -l  ->  0
```
✅ **0 chamadas nossas** a `api.privy.io`. **(a) NÃO refutada** — os 4 erros estão diagnosticados.

### R7 — D-6 (a auditoria afirma que o manifesto sobre-declara; confirmei)
`src/components/CardLance.jsx:25` = `import useTrocarPorSenhas from "../hooks/useTrocarPorSenhas.js"`
`src/pages/CorporativoBanners.jsx:12` = `import { useTrocarPorSenhas } from "../hooks/useTrocarPorSenhas.js"`
Além disso `CreditoStatus` existe em `components/CreditoStatus.jsx`, `hooks/useCreditoStatus.js`,
`lib/creditoPolling.js`. O manifesto (`docs/aprovacoes-operador.md:83 e :273`) afirma que os 5 nomes
«foram removidos também» → **falso para 2 dos 5**. ✅ **D-6 confirmada** (é um achado da auditoria, não
uma falha dela).

---

## 2. Tabela de achados

| # | Severidade | Achado | Tratamento proposto |
|---|---|---|---|
| F-1 | ⚠️ grave (reprodutibilidade) | A10: `HEAD`/`origin/main`. O worktree tem `HEAD = 644c6ce` (o **próprio commit da auditoria**), não `08f78b3`; e `git rev-parse origin/main` **falha** neste worktree (`fatal: Needed a single revision`) ⇒ a frase «origin/main = `08f78b3` (iguais)» **não é reproduzível a partir do artefacto entregue** | Registar na auditoria que o baseline foi medido *antes* do commit do próprio documento (`08f78b3` = pai de `644c6ce`); ou medir `origin/main` no clone principal. Não invalida nada (o diff `86ffe2c..HEAD` continua só com docs) |
| F-2 | ℹ️ nota (precisão) | §4: «os `401/405` provam que a função está lá — **a resposta é JSON**, não HTML». Medido: **8 dos 84** respondem **`text/plain`** (7× `*-scheduled` → 403; `img-proxy` → 400), não JSON | Reescrever para «content-type ≠ `text/html`» (JSON **ou** `text/plain`). O discriminador `text/html` = fallback mantém-se e a contagem 84/84 **não muda** |
| F-3 | ℹ️ nota (precisão) | §0/§4 citam «**137** chunks baixados». O BFS mais largo encontrou **187** ficheiros `assets/*.js` reais (1.ª passagem 194 nomes, todos resolvidos) | Actualizar para «≥137» / recontar. Amostra maior ⇒ conclusão de sincronia **mais forte**, não mais fraca |
| F-4 | ℹ️ nota (cosmético) | §0 diz «+ **6 chunks de vendor**». O `index.html` servido declara **4** `modulepreload` (`rolldown-runtime`, `react`, `router`, `motion`) + entry = 5 | Corrigir a contagem; sem impacto |

---

## 3. Alegações REFUTADAS

**Nenhuma alegação-núcleo (A1–A10) foi refutada.** Tentei activamente (b)(c)(e)(f)(h) — todas resistiram.
O que **corrigi** são **imprecisões de redacção**, não conclusões:

- **Refutada (parcial) — §4, frase de método:** «a resposta é JSON, não HTML» é **imprecisa para 8/84**
  endpoints (`text/plain`). A conclusão operacional («um 200 `text/html` = fallback, não prova de
  função») **mantém-se intacta** — é aliás o achado D-7, que verifiquei.
- **Refutada (factual) — A10/`origin/main`:** não reproduzível no worktree entregue (F-1).
- **Refutada (factual) — contagens de crawl:** «137 chunks» e «6 vendor chunks» não batem com a medição
  (F-3, F-4). Não afectam a prova de sincronia.

**Isto é: 0 das 10 alegações-núcleo derrubadas; 4 imprecisões menores assinaladas.**

---

## 4. Alegações que NÃO consegui refutar

| Alegação | Estado | Prova independente |
|---|---|---|
| A1 produção sincronizada (137 chunks, 16/17 literais) | **NÃO refutada** | R3: 17/17 literais com contagem por-chunk **idêntica** |
| A2 84/84 endpoints servidos, 0 em falta, 23 sem chamador | **NÃO refutada** | R2: 84 sondados, 0 `text/html`, distribuição de status idêntica |
| A3 404 de `/cotas` por desenho (`cotas.mjs:291/316`), documentado em `retornoOAuth.js:12-15` | **NÃO refutada** | R5: 200 JSON / 401 JSON medidos; 6 ramos 404 no código |
| A4 nenhum endpoint removido em produção | **NÃO refutada** | R2 (0 em falta) + R3 (`trocaInfo`/`trocaErro`/`creditoTxHash` = 0 em prod) |
| A5 / D-6 manifesto sobre-declara remoção dos «órfãos» | **NÃO refutada** (e reconfirmada) | R7: `useTrocarPorSenhas` e `CreditoStatus` existem com consumidores vivos |
| A6 D-7 caminho sem ponto = 200 `text/html` | **NÃO refutada** | R5: `/netlify/functions/cotas` e nome inexistente → 200 `text/html` |
| A7 / D-8 «25 órfãos» do manifesto vs 23 medidos | **não re-medido por mim** | A auditoria declarou o método; o manifesto (`:250`) diz literalmente «25 de frontend» ⇒ a divergência de régua é real e está declarada |
| A8 suíte VERDE 849/849 · 1095/1101 | **NÃO refutada** | R1: reproduzida ao número |
| A9 zero alterações de código / `86ffe2c..HEAD` só docs | **NÃO refutada** | R4 |
| A10 HEAD `08f78b3` (enunciado esperava `740eb7e`) | **parcialmente refutada** | F-1: no entregável o HEAD é `644c6ce` e `origin/main` não resolve |
| (a) os 4 erros diagnosticados | **NÃO refutada** | §1.1 (Privy, 0 chamadas) + §1.2 (cotas por desenho) |

---

## 5. O que NÃO medi e porquê

1. **Réplica do 404 exacto de `/cotas` com sessão autenticada** — **NÃO MEDI**: exige Bearer/token e as
   credenciais estão **PROIBIDAS (R5)**. Medi os ramos sem sessão (200 `resumo` agregado; 401
   `token_ausente`) e confirmei os 6 ramos 404 **no código** (`cotas.mjs:214/241/291/316/609/713`).
   A auditoria já declara esta mesma limitação (§8.1). ✅ coerente.
2. **A contagem exacta de «23 endpoints sem chamador»** — não re-executei o algoritmo de sítios de
   chamada item a item; confirmei o **total** (84) e o **estado em produção** (0 em falta), não a
   atribuição individual chamador/órfão. Fica como ponto para o UTAC dos órfãos.
3. **Privy CORS/422 em runtime** — não reproduzi na consola (é telemetria do SDK, fora do nosso código;
   confirmei que **não existe chamada nossa**, 0 ocorrências de `api.privy.io` em `src/`).
4. **Amostragem completa dos 52 itens do manifesto** — verifiquei os **17** que a auditoria amostrou
   (todos batem); não varri os outros 35, pela mesma regra de mínimo declarada (§3 da auditoria).
5. **`node_modules`/285 `.mjs` sob `netlify/`** — só contei os **84 da raiz `functions/`** (o conjunto
   correcto de endpoints); `_lib/` e `_tests/` são suporte, não endpoints.

---

## 6. Conclusão

A auditoria UTAC108b **passa na verificação adversarial**. Reproduzi por execução independente: a
sincronia local↔produção (17/17 literais), o inventário (84/84, 0 em falta), a suíte canónica (849/849 ·
1095/1101 VERDE), o diagnóstico dos 4 erros, e as discrepâncias D-6/D-7. **0 bloqueantes.** As 4
imprecisões (F-1..F-4) são de redacção/reprodutibilidade e devem ser corrigidas por errata, sem alterar
o veredicto nem travar o 108c.

**VEREDICTO FINAL: APROVADO COM RESSALVAS — 0 bloqueantes.**


---

# RESPOSTA DO EXECUTOR AO VEREDICTO

Veredicto **APROVADO COM RESSALVAS — 0 bloqueantes**. Tabela `ressalva -> tratamento`:

| Achado | Grav. | Tratamento | Onde |
|---|---|---|---|
| **F-1** — `HEAD`/`origin/main` não reprodutível a partir do entregável | ⚠️ | **Errata E-1**: re-medido — `origin/main = 08f78b3` no clone principal **e** no worktree; `08f78b3` é o pai de `644c6ce`. O baseline foi medido antes do commit do próprio documento | log §10 |
| **F-2** — «a resposta é JSON» imprecisa para 8/84 | ℹ️ | **Errata E-2**: medido 76 `application/json` + 8 `text/plain`, 0 `text/html`. Frase corrigida para «não é `text/html`». Contagem 84/84 inalterada | log §10 |
| **F-3** — «137 chunks» vs 187 do validador | ℹ️ | **Errata E-3**: re-medido — o meu BFS dá **137** (5,75 MB); registo as duas réguas e **não** adopto a dele sem reproduzir. Conclusão de sincronia inalterada | log §10 |
| **F-4** — «6 chunks de vendor» | ℹ️ | **Errata E-4**: o `index.html` servido declara **4 `modulepreload` + 1 entry = 5** | log §10 |

**Alegações REFUTADAS: nenhuma das 10 núcleo.** As 4 são imprecisões de redacção/reprodutibilidade.

**Erros dos meus instrumentos que esta ronda expôs** (para o registo da série):
1. §0 dava «+6 vendor chunks» sem os contar (lido de um `head` da listagem, não medido) — **mesma
   classe** de erro que a série já catalogou («número não-medido apresentado como facto»).
2. Escrevi «a resposta é JSON» generalizando a partir do que vi em 3 endpoints — **8 dos 84** são
   `text/plain`. Generalizar de 3 para 84 é o que o validador apanhou.
3. Correcções pós-veredicto **não re-validadas** (declarado).
