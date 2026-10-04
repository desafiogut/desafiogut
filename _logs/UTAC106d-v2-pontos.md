# UTAC106d-v2 — Modelo do Passe Via B (ADITIVO + Supabase)

**Tipo:** código de backend (Functions + migração) · **Skill:** `mc-driven-projects` (protocolo UTAC) ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque:** `8b927d314e0657c038bb021dbb82ae758b74d6c0` (= `origin/main`) ·
**Commit do código:** `8abf84a`. **Baseline (Via A intacto):** `8b927d3` / fecho do 106c `ffdfcc3`.

> **Objectivo:** criar o modelo **Via B** do Passe (programa de fidelidade) de forma **ADITIVA** —
> nova tabela `public.pontos`, novo módulo `_lib/passe-pontos.mjs`, novo endpoint
> `comprar-passe-pontos.mjs` — sem tocar em `_lib/passe.mjs`, `comprar-passe.mjs`, `public.passes`,
> nos 4 testes do Via A nem nos 2 scripts de mutação do Via A. Regra: **1 Passe = 1 ponto**;
> **50 pontos = 1 cartão**. Reutiliza os padrões do Via A (Bearer, débito atómico, idempotência,
> reembolso) por **leitura**, não por cópia.
> ⚠️ HI4/GATE 3/GATE 6 violados por decisão do operador (incorporado); HI5 alargado a 2 h.

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| Data | 2026-10-04 | `date` |
| `HEAD` / `origin/main` | `8b927d314e0657c038bb021dbb82ae758b74d6c0` (== ) | `git rev-parse HEAD` |
| Suíte (baseline) | **frontend VERDE 725/725 · backend VERDE 992/998** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) | leitura do ficheiro |
| `.bak-*` versionados | 5 (+ `netlify.toml.backup-*`), **intocados** | `git ls-files \| grep .bak` |
| `_lib/passe.mjs` / `comprar-passe.mjs` | **existiam**, lidos (read-only) para reutilizar padrões | `read_file` |
| Saldo da API — arranque | **US$ 6,36** | `curl https://api.deepseek.com/user/balance` |

Traços do modelo Via A medidos (para reutilizar, não copiar): store Supabase `public.passes`
(1 linha/compra: edição, produto, cupons); auth Bearer; débito atómico CAS (`saldoRs.mjs`);
idempotência pela chave natural (UNIQUE 23505); auto-reembolso com `captureSecurityAlert`; P10
(sem endereço em logs). **Contrato diferente:** Via B = 1 linha/endereço com pontos acumulados.

---

## §SEG0 — Migração Supabase (`public.pontos`)

**Ficheiro:** `desafio-gut/frontend/supabase/migrations/20261004_mc106dv2_pontos.sql`.
Esquema: `endereco text PK · pontos integer NOT NULL DEFAULT 0 CHECK (pontos >= 0) · historico jsonb
NOT NULL DEFAULT '[]' CHECK (jsonb_typeof = 'array') · atualizado_em timestamptz`. Mais: índice
`idx_pontos_atualizado`, RLS + política service_role, `REVOKE` de anon/authenticated e
`GRANT SELECT, INSERT, UPDATE TO service_role` (convenções do MC105a — sem GRANT o service_role leva
42501 em silêncio). **Só CREATE** — nada de ALTER/DROP/DELETE.

**Aplicação em produção (projeto `vjslwowwrpcawijdiksm`):** o `supabase db push --linked` a partir do
repo aplicaria as **16 migrações locais** (os nomes locais `YYYYMMDD` não batem com o histórico remoto,
que usa timestamps completos do `apply_migration`). Para aplicar **só** esta, replicou-se o histórico
remoto com placeholders em `%TEMP%` e correu-se o push de lá:

| Passo | Resultado |
|---|---|
| `db push --linked --dry-run` (dir isolado) | **«Would push these migrations: • 20261004_mc106dv2_pontos.sql»** |
| `db push --linked` | **`Applying migration 20261004_mc106dv2_pontos.sql...`** + `Finished supabase db push` |
| `migration list` (depois) | **`20261004 | 20261004`** (registada no histórico remoto) |

**`public.passes` intacta — provado por:** (a) o push aplicou **só** o ficheiro `...pontos.sql`;
(b) leitura estática do SQL — **zero** instruções que mencionem `passes` (só em comentários; os
`ALTER/DROP/REVOKE` são todos sobre `public.pontos`). *Limite declarado:* `db dump` (para inspeccionar
o esquema remoto) exige Docker, indisponível; sem `psql`/credenciais de BD não foi possível uma
segunda leitura directa.

---

## §SEG1 — Módulo `_lib/passe-pontos.mjs`

Funções: `lerPontos` (null se inválido/inexistente; **lança** em erro do Supabase), `getPontos`,
`creditarPontos`, `debitarPontos` (`PONTOS_INSUFICIENTES` se não chega; **nunca** negativo),
`podeResgatarCartao`. Constantes: `PONTOS_POR_PASSE=1`, `PONTOS_POR_CARTAO=50`, `VALOR_PASSE_RS=2.00`,
`VALOR_PASSE_CENTAVOS=200` (derivado). Movimento aplicado com **CAS** (`update ... .eq("pontos", base)`)
e **idempotência por `ref`** (histórico). Tipos: `compra` · `palpite` (106f) · `resgate` (106g).
Erros: `ENDERECO_INVALIDO`, `QUANTIDADE_INVALIDA`, `TIPO_INVALIDO`, `REF_INVALIDA`,
`PONTOS_INSUFICIENTES`, `ERRO_DB`, `CONFLITO_CONCORRENCIA`.

Padrões herdados **por leitura** (referências cruzadas no código): normalização (`_lib/passe.mjs:15,21`),
escrita devolve `{ok:false,code}` (`:37,43`), leitura lança (`:22,25`), CAS (`_lib/saldoRs.mjs:57-66`),
ISO8601 (`:60`), idempotência pelo 23505 (`_lib/passe.mjs:40-47`), P10.

---

## §SEG2 — Endpoint `comprar-passe-pontos.mjs`

POST · Bearer (o comprador é o **do token**) · `idempotencyKey` (header `x-idempotency-key` ou corpo).
Fluxo: preflight → só POST (405) → rate-limit 5/min → kill-switch (503) → Bearer (401) →
`idempotencyKey` (400) → idempotência (ref no histórico → **200** sem tocar no saldo) →
**débito atómico R$ 2,00** (`debitarSaldoRs`; insuficiente → 402) → **crédito de 1 ponto** →
**201**; corrida/falha após o débito → **auto-reembolso** (reembolso falhado → alerta Sentry).
Sem tocar em `comprar-passe.mjs`.

---

## §SEG3 — Testes

`_tests/passe-pontos.test.mjs` — **19 testes** (constantes K1; funções F1-F8; endpoint E1-E10).
Duplos só nas fronteiras de I/O: `@netlify/blobs` (duplo CAS), Supabase (duplo do Via A para o saldo R$
**+ uma tabela `pontos` modelada inline**, para não tocar no duplo partilhado do Via A), Sentry espiado.
`saldoRs.mjs` é o REAL. Resultado isolado: **19/19 pass**.

---

## §SEG4 — Verificação ponta a ponta

1. **Suíte canónica:** `node scripts/mc966-suite-harness.mjs ambos < /dev/null` →
   **frontend VERDE 725/725 · backend VERDE 1011/1017** (+19 = os testes novos; base 992/998).
2. **`vite build`:** `node node_modules/vite/bin/vite.js build` → **✓ built in 12.90s**.
3. **Mutação (GATE 7/8)** — runner ad-hoc em `%TEMP%`, TAP, RED dirigido, restauro byte-idêntico (md5):
   **8/8 mortos** (controlo 19/19 verde).

| # | Mutante | Resultado |
|---|---|---|
| M1 | `PONTOS_POR_PASSE` 1→2 | **RED** (fail 3) |
| M2 | `PONTOS_POR_CARTAO` 50→100 | **RED** (fail 2) |
| M3 | `debitarPontos` sem guarda de negativo | **RED** (fail 1) |
| M4 | idempotência por `ref` removida (lib) | **RED** (fail 2) |
| M5 | fast-path de idempotência removido (endpoint) | **RED** (fail 1) |
| M6 | auto-reembolso removido | **RED** (fail 2) |
| M7 | `idempotencyKey` sem validação | **RED** (fail 1) |
| M8 | gate de Bearer removido | **RED** (fail 1) |

4. **Verificação ad-hoc** (`hermes-verify-utac106dv2.mjs` em `%TEMP%`, corrida e removida): **13 PASS /
   0 FAIL** — teste dedicado 19/19; os **4 testes do Via A verdes** (mc105a-passe 10/10 · mc105a-e2e
   22/22 · mc105a1-passes-lgpd 11/11 · utac105b-ligacao 8/8); `_lib/passe.mjs`/`comprar-passe.mjs` e os
   4 testes do Via A **não modificados**; nenhum `.bak-*` tocado; `package.json`/`package-lock` intactos;
   `EM_BREVE_MODE` ligado; constantes da regra fixas; a migração não altera `passes`.

---

## §SEG5 — Validador adversarial

**Veredicto: APROVADO COM RESSALVAS · 0 bloqueadores.** Subagente independente em worktree próprio
(`scripts/worktree-helper.mjs criar … 8abf84a`); tentou refutar as 11 alíneas (a)-(k) — **10 resistiram**.
Veredicto **verbatim** + resposta do executor: `_logs/UTAC106d-v2_SEG5_VALIDADOR.md`.

**Refutação ACEITE (ℹ️A):** o mutante da remoção do CAS (`.eq("pontos", base)`) **sobreviveu** aos 19
testes — a via de concorrência do UPDATE não estava coberta. **Fechado com código/teste** na mesma ronda:
novo teste **F9** (escritor concorrente → o módulo relê e aplica) faz o mutante do CAS (**M10**) cair em
**RED** ⇒ **20/20 testes · 10/10 mutantes**. ℹ️B (prova não reproduzível do repo) fechado com
`scripts/mc106dv2-prova-mutacao.mjs` (**extensão de escopo declarada**, GATE 3 — recomendada pelo próprio
validador). ℹ️C (produção não medida pelo validador) e ℹ️D (endpoint não referenciado pela UI) **declarados**.

**Correcções pós-veredicto: NÃO re-validadas** (sem 2.ª ronda) — são de teste/aparelho, não de código de
produção. Commit `9f7402a`; suíte e build re-corridos depois: **1012/1018 · 725/725 · VERDE**.

---

## §SEG6 — Deploy (foreground, GATE 10)

**ANTES:** home 200 · health 200 · bundle **`index-DrXuiYji.js`** · `comprar-passe-pontos` → **400**
(«Bad request, missing form» — indistinguível de endpoint inexistente; controlo `nao-existe-xyz` = 400).

**DEPLOY:** `npx netlify deploy --prod` (foreground) → **`✔ Deploy is live!`** · build **3m18,1s** ·
**1 função** enviada, 0 assets (o frontend **não** mudou: este UTAC não toca em `src/**`). Unique deploy:
`6ac2c00805839c48c2f2e9df--silly-stardust-ca71bc.netlify.app`.

| # | Verificação (depois) | Resultado |
|---|---|---|
| 1 | Site responde | **home 200 · health 200** ✅ |
| 2 | Bundle do frontend | **`index-DrXuiYji.js` (IGUAL)** — esperado: nenhum ficheiro de `src/**` mudou, logo o hash de conteúdo não muda. O objectivo do deploy é a **função nova**. |
| 3 | **Endpoint novo ao vivo** | `POST /.netlify/functions/comprar-passe-pontos` → **401 `token_ausente`** (era 400) ⇒ publicado e **a validar o Bearer** ✅ |
| 4 | Controlo | endpoint inexistente → 400 ✅ |

**⚠️ Efeito colateral medido e REVERTIDO (igual ao 106c):** o build da Netlify corre `npm install` e
**alterou `desafio-gut/frontend/package-lock.json`** (sha256 `5b40f11c…` → `d1f12aaf…`) — ficheiro do
**NÃO AUTORIZA**. O mutado foi **arquivado fora do repo** (`%TEMP%/utac106dv2-deploy-dirt/`) e o ficheiro
**restaurado ao HEAD** (sha256 volta a `5b40f11c…`). **Suíte re-corrida depois do deploy: 725/725 ·
1012/1018 · VERDE.**

---

## §SEG7 — Registo, commit e push

**Registo em 3 lugares (R18):** (1) este log + `_logs/UTAC106d-v2_SEG5_VALIDADOR.md` (veredicto verbatim
+ resposta do executor); (2) `CLAUDE.md` **bloco R14** (anexado ao EOF em bytes; 4 bytes de controlo
intactos, **0 remoções**); (3) `Desktop/RELATORIO-UTAC106d-v2-PONTOS.txt`.

**Commits:** `8abf84a` (código + migração + testes; **o commit validado**) → `9f7402a` (fecho dos ℹ️:
teste F9 + script de mutação) → **este** (registo). Push em foreground, ficheiros individuais
(**nunca `git add -A`**).

**Ficheiros deste UTAC:** 4 novos (migração, módulo, endpoint, teste) + `scripts/mc106dv2-prova-mutacao.mjs`
(extensão declarada) + `_logs/` (2 ficheiros) + bloco R14 no `CLAUDE.md`. **Zero** `.bak-*`, **zero**
`package.json`/`package-lock` (o lock foi sujo pelo deploy e **restaurado ao HEAD**), **zero** bytes de
controlo alterados, **zero** alterações a `src/**`, `_lib/passe.mjs`, `comprar-passe.mjs`, `public.passes`,
aos 4 testes do Via A ou aos 2 scripts de mutação do Via A.

---

## §Custo (API) e duração

| Medição | Valor |
|---|---|
| Saldo da API — arranque (1.ª chamada da sessão) | **US$ 6,36** |
| Saldo da API — fecho | **US$ 6,23** |
| **Consumo REAL (diferença de saldo)** | **≈ US$ 0,13** (inclui a delegação do validador) |
| Duração | arranque ≈ **17:46** → fecho ≈ **18:17** ⇒ **≈ 31 min**, dentro do HI5 alargado (2 h) |

⚠️ O validador adversarial corre em **sessão própria** (subagente); o custo dele está incluído na
diferença de saldo, não na estimativa da sessão do executor.
