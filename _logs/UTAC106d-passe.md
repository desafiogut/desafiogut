# UTAC106d — Modelo do Passe + fecho das pendências do 106c

**Tipo:** reconhecimento read-only + fecho editorial · **Skill:** `mc-driven-projects` (protocolo UTAC) ·
**Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD de arranque/fecho:** `ffdfcc37b57838d765aabfdf230cacfacf961497` (= `origin/main`) ·
**Baseline anterior:** `ffdfcc3` (fecho do UTAC106c).

> **Estado: o MODELO do Passe (SEG0–SEG2) NÃO foi construído — PARADO por premissa refutada (GATE 1).**
> O FECHO EDITORIAL das 3 pendências do 106c (SEG3) **foi executado**. O reconhecimento read-only do
> Passe existente (pedido do operador) está no relatório `Desktop/RELATORIO-UTAC106d-PASSE-RECON.txt`.
> **Nenhum ficheiro de código foi criado, alterado ou apagado.** `HEAD == origin/main`.

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Data | 2026-10-04 | `date` |
| `HEAD` | `ffdfcc37b57838d765aabfdf230cacfacf961497` | `git rev-parse HEAD` |
| `origin/main` | `ffdfcc3…` (== HEAD) | `git rev-parse origin/main` |
| Suíte backend (baseline) | **VERDE 992/998 pass · VEREDITO: VERDE** | `node scripts/mc966-suite-harness.mjs backend < /dev/null` |
| `EM_BREVE_MODE` | **`true`** | `src/lib/leilaoLock.js:10` |
| `.bak-*` versionados | 5 (+ `netlify.toml.backup-*`), **intocados** | `git ls-files \| grep .bak` |
| Saldo da API — arranque | **US$ 6,44** | `curl https://api.deepseek.com/user/balance` |

---

## §SEG-1 — Premissa refutada por medição (GATE 1)

O enunciado assumia que o Passe era um conceito **por criar**. A medição refuta:

| # | O enunciado assume | MEDIDO | Prova |
|---|---|---|---|
| P1 | «**Criar** `_lib/passe.mjs`» | **JÁ EXISTE** (74 l., MC105a + UTAC105b) | `git log -- …/_lib/passe.mjs` → `b6e8488`, `e95003f`, `18e9fb9` |
| P2 | «**Criar** `comprar-passe.mjs`» | **JÁ EXISTE** (129 l.) | `git ls-files \| grep -i passe` |
| P3 | «Passe em Blob `passe-pontos:${address}` — **mesmo padrão do saldo** `saldo-rs`» | **FALSO.** O saldo de produção vive em **Supabase** (`saldoRs-store.mjs`, R11); o Blob `saldo-rs` é **legado/fallback**. E os passes vivem em **Supabase `public.passes`**, não em Blob | `_lib/saldoRs.mjs:17,32`; `_lib/financeiro-fallback.mjs:59`; `_lib/passe.mjs:1` |
| P4 | O Blob `passe-pontos` | **0 ocorrências** no corpus | `git grep -n "passe-pontos"` → vazio |

**Causa raiz:** o enunciado foi redigido a partir do mapeamento do UTAC106a (navegação/UI/i18n), que
não surfou a camada de Functions anterior (MC105a/UTAC105b).

### Colisão medida (o que se partiria se eu executasse SEG0/SEG1 como escrito)

Ficheiros que seriam sobrescritos: `_lib/passe.mjs` · `comprar-passe.mjs`.
Testes da suíte canónica que ficariam **vermelhos** (não constam do AUTORIZA):
`_tests/mc105a-passe.test.mjs` · `_tests/mc105a-e2e.test.mjs` · `_tests/mc105a1-passes-lgpd.test.mjs` ·
`_tests/utac105b-ligacao.test.mjs`. Aparelho que deixaria de reproduzir: `scripts/mc105a-prova-mutacao.mjs`
e `scripts/utac105b-prova-mutacao.mjs` (âncoras nos 2 ficheiros). Documentação: `CLAUDE.md:4216-4218`.

**Contradição interna do enunciado:** a ENTREGA FINAL exige «Suíte canónica verde», mas o AUTORIZA não
inclui esses 4 testes ⇒ executar como escrito violaria a própria entrega (ST4 manda PARAR).

---

## §SEG0 (reconhecimento read-only — pedido do operador)

Relatório completo: **`Desktop/RELATORIO-UTAC106d-PASSE-RECON.txt`**. Síntese:

| Pergunta | Resposta medida |
|---|---|
| O que `_lib/passe.mjs` faz | Store Supabase `public.passes`; `lerPasse`/`criarPasse` (23505 idempotente)/`listarPassesDoComprador`/`marcarPalpiteUsado` (CAS) |
| O que `comprar-passe.mjs` faz | POST com Bearer; edição **Programada** na janela + produto vinculado `ativo` + cupons activos do lojista; **débito R$ 2,00 atómico** (CAS) → **201**; idempotente → **200**; **reembolso automático** em falha pós-débito |
| Os 4 testes cobrem | **Via A**: edição Programada, `palpite_usado`, cupons, LGPD, débito/reembolso/idempotência. **Zero** asserções de pontos/cartão |
| Os 2 scripts de mutação | 30 + 19 mutantes, âncoras em `passe.mjs`/`comprar-passe.mjs`; deixam de reproduzir se reescritos |
| Dados a migrar | **0.** Blob `passe-pontos` não existe; store é Supabase; última medição de produção = **0 linhas** (`MC105a.1_SEG-1_MEDICAO.md:9`); sem consumidor no frontend |
| Avaliação | **(a) VIA A PURO** (não parcialmente Via B). Só a **infraestrutura** de compra é reutilizável |

**Comandos de reprodução:** ver §7 do relatório `Desktop/RELATORIO-UTAC106d-PASSE-RECON.txt`.

---

## §SEG3 — Fecho das 3 pendências editoriais do 106c (EXECUTADO)

Adenda **§9** acrescentada a `_logs/UTAC106c-carteira.md` — **sem alterar o corpo original**
(RESSALVA 6). Provas:

| Verificação | Medido |
|---|---|
| `git diff --numstat -- _logs/UTAC106c-carteira.md` | **`24  0`** (24 inserções, **0 remoções**) |
| `git diff -U0 \| grep -c '^-[^-]'` | **0** |
| EOL | LF puro (0 CRLF), 458 → 482 linhas |

Conteúdo (decisão do operador): **#1** — `mc99-limpeza-ui.test.mjs` **dentro do escopo** do 106b
(teste de navegação), não é dívida; **#2** — «paga»→«oferta» é **correcção** (Regulamento Art. 7),
**não** dívida, não vai a `DEBT.md`; **#3** — **BottomNav é a referência**, a Sidebar alinha-se.

---

## §SEG0–SEG2, SEG4–SEG6 — NÃO executados

O modelo do Passe (Blob + funções puras), o endpoint, os testes+mutação, a verificação ponta a ponta,
o validador adversarial e o deploy **não** se executaram: dependem da decisão do operador
(aditivo / substitutivo / reutilizável). **Sem validador, não fecha (GATE 9)** — logo este UTAC fica
**PARCIAL** por decisão, não por falha.

---

## §Custo (API) e duração

| Medição | Valor |
|---|---|
| Saldo da API — arranque (1.ª chamada da sessão) | **US$ 6,44** |
| Saldo da API — fecho | **US$ 6,44** |
| Consumo real (diferença de saldo) | **≈ US$ 0,00** (abaixo da resolução da leitura) |
| Duração | curta; dentro do HI5 (2 h) |

---

## §Ficheiros deste UTAC (para commit — ficheiros individuais, nunca `git add -A`)

1. `_logs/UTAC106d-passe.md` (este log)
2. `_logs/UTAC106c-carteira.md` (adenda §9 — 24 inserções, 0 remoções)

**Zero** ficheiros de código · **zero** `.bak-*` · **zero** `package.json`/`package-lock` · **zero**
bytes de controlo do `CLAUDE.md` · `EM_BREVE_MODE` intacto. Relatório read-only em
`Desktop/RELATORIO-UTAC106d-PASSE-RECON.txt` (fora do repo).

---

## §Pendências (declaradas — GATE 11)

1. **Decisão do modelo do Passe** — aditivo (nomes novos) / substitutivo (autorizar reescrever
   `passe.mjs` + `comprar-passe.mjs` + 4 testes + 2 scripts + migrações) / reutilizável (infraestrutura).
2. **Premissa de armazenamento** — a decisão #1 do operador (Blob) assenta na premissa P3, refutada;
   reconfirmar o desenho (Supabase vs Blob) antes de construir.
3. **Validador adversarial** — pendente para o UTAC que construir o modelo.
