# UTAC106x.6 — Pendências da série x (HERMES)

**Tipo:** fecho de pendências declaradas da série UTAC106x (pré-`UTAC106a`) · **Skill:** `skills/utac`
(protocolo) · **Data:** 2026-10-04 · **Modelo:** deepseek-v4-flash (Hermes Agent) · **HEAD de arranque:**
`1a5fbd23efaf951b40bc6ad43535eb8e603e81e7` (= `origin/main`).

> **Escopo:** 3 frentes de documentação/verificação + 1 avaliação. **Zero código de produção**, **zero
> testes alterados**, **zero alteração ao `package-lock.json`**, **4 bytes de controlo do `CLAUDE.md`
> intactos**. Ficheiros alterados: `desafio-gut/frontend/skills/utac/protocol/regras/A-ambiente.md`,
> `desafio-gut/frontend/skills/utac/protocol/regras-legado.md`, `_logs/DEBT.md`, `CLAUDE.md` (só o bloco
> R14 + anotação na NORTE) + este log. `docs/gabarito-play-console.md` **não** foi tocado (fora do escopo
> autorizado — anotado em DEBT).

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| `HEAD` | `1a5fbd23efaf951b40bc6ad43535eb8e603e81e7` | `git rev-parse HEAD` |
| `origin/main` | `1a5fbd2…` (== HEAD) | `git rev-parse origin/main` |
| Último commit | `1a5fbd2 docs(UTAC106x.5): corrige as incoerencias de registo…` | `git log -1 --oneline` |
| Sujeira (tracked) | **0** modificados no arranque (só `??` pré-existentes: `_logs/MC100_*`, `_logs/MC101_*`, `docs/MC100_*`) | `git status --porcelain` |
| Suíte (HARD GATE 1 · HI1) | **frontend VERDE 694/694 · backend VERDE 992/998** — `VEREDITO: VERDE` | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Disco | OK (≥5 GB livres) | `df -h /c` |

**Comandos de reprodução do baseline** (da raiz `C:/Users/Moltbot/Desktop/DESAFIOGUT`):

```bash
git rev-parse HEAD
node scripts/mc966-suite-harness.mjs ambos < /dev/null     # stdio: o harness exige stdin definido
git status --porcelain | grep -v '^??'
```

> ⚠️ **Nota de instrumento:** a 1.ª corrida em `background=true` deu `stdin is not a tty` e **não mediu**
> nada (exit 0, saída vazia). O harness **não** precisa de TTY — precisa de **stdin ligado**; com
> `< /dev/null` corre e dá `VEREDITO: VERDE`. (Lição já registada na série x.)

### Estado dos alvos lidos no arranque
| Alvo | Estado medido |
|---|---|
| `_logs/DEBT.md` | 98 linhas · **DEBT-001 `aberta`** · **DEBT-005 `aberta`** (as duas pendências deste UTAC) |
| `protocol/regras/A-ambiente.md` | **A13** documenta a criação de **2** junctions; o helper cria **4** ⇒ divergência **2 vs 4** |
| `protocol/regras-legado.md` | linha 45: «Total: **61 regras** em 9 categorias (… A8 …)» — obsoleto |
| NORTE do `CLAUDE.md` | secção `## 🎯 NORTE DO PRODUTO` — **linhas 260–414** |
| `docs/gabarito-play-console.md` | existe (126 linhas) |
| `scripts/worktree-helper.mjs` | `JUNCTIONS` = **4** raízes |

---

## §Frente A — A13 vs helper (divergência 2 vs 4)

**Objectivo:** a A13 documentava **2** junctions; o helper cria **4**. Corrigir a A13 para documentar
exactamente o que o helper faz.

**Medições:**
- `scripts/worktree-helper.mjs` → `const JUNCTIONS = ["node_modules", "desafio-gut/node_modules",
  "desafio-gut/frontend/node_modules", "desafio-gut/frontend/netlify/functions/node_modules"]` (**4**).
- `A-ambiente.md` §A13 → bloco «Criar» com **2** linhas `mklink` e §«Remover» a citar 2 → **divergência**.

**Correcção aplicada** (em `protocol/regras/A-ambiente.md` §A13, só o bloco «Criar» e o passo 1 de
«Remover»; **19 inserções / 5 remoções, 2 hunks**):
- a secção «Criar» passa a listar as **4** raízes, com a nota de que o array `JUNCTIONS` do helper é a
  **fonte de verdade** da contagem, e o «porquê 4» (DEBT-006: a resolução a partir de `_tests/` sobe a
  árvore toda);
- a secção «Remover» passa a mandar `rmdir` das **4**;
- deixou-se **declarada** a correcção (2 → 4) dentro da própria regra (nada apagado).

**Consistência com A9** (passo 5): a **A9** dá o **procedimento** (`mklink /J`, `rmdir`, nunca `rm -rf`)
mas **não fixa contagem** — não há contradição; a A13 (que cita A9 como cross-ref) é agora a única que
enumera as raízes.

**Teste de comportamento (GATE 16 — exemplo funcional, executado):**

```bash
# 1) ANTES — contagens dos node_modules REAIS
ls -1 desafio-gut/frontend/node_modules | wc -l                 # 499
ls -1 desafio-gut/frontend/netlify/functions/node_modules | wc -l  # 414
# 2) criar worktree + junctions com o PRÓPRIO helper
node scripts/worktree-helper.mjs criar C:/Users/Moltbot/AppData/Local/Temp/tmp-utac106x6/wt HEAD
#    -> "junctions": [node_modules, desafio-gut/node_modules,
#                     desafio-gut/frontend/node_modules,
#                     desafio-gut/frontend/netlify/functions/node_modules]   (= 4)
# 3) conferir os reparse points
node scripts/worktree-helper.mjs check .../wt                    # 4 reparse points
# 4) remover (rmdir das 4 primeiro, depois o worktree)
node scripts/worktree-helper.mjs remover .../wt                  # rmdir x4 OK · git worktree remove -> exit 0
# 5) DEPOIS — contagens dos node_modules REAIS
ls -1 desafio-gut/frontend/node_modules | wc -l                 # 499  (inalterado)
ls -1 desafio-gut/frontend/netlify/functions/node_modules | wc -l  # 414  (inalterado)
```

⇒ **A A13 corrigida reproduz o comportamento do helper**: `criar` devolve **as 4** raízes, o `check`
encontra **4** reparse points e o `remover` faz `rmdir` das **4** antes de retirar o worktree, deixando
os `node_modules` reais **intactos** (499 · 414). Pasta temporária removida no fim (`Temp/` limpo).

> ℹ️ **Achado lateral (declarado, não corrigido — `scripts/worktree-helper.mjs` está fora do escopo
> autorizado):** os números do **comentário** do helper e do `DEBT.md` **não reconciliam**: o helper diz
> «**105** pacotes» para a raiz do git; o `DEBT.md` (DEBT-006) diz «~**450** pacotes top-level; **93**
> alcançáveis a partir de `_tests/`». **Medido agora:** raiz do git = **380** entradas top-level
> (360 com `package.json`) · `desafio-gut/node_modules` = **568**. As três figuras medem coisas diferentes
> e nenhuma bate com as outras — fica registado (não se inventa um número; «alcançáveis a partir de
> `_tests/`» exigiria simular a resolução). Candidato a dívida de documentação.

---

## §Frente B — DEBT-001 (6 skipped) + DEBT-005 (regras-legado)

### B.1 — DEBT-001: os 6 testes `skipped` do backend, **enumerados**

Medido com `node --test --test-reporter=tap` em `desafio-gut/frontend/netlify/functions` → `# skipped 6`.
São **dois grupos**, ambos **bloqueados por credenciais do operador** (não por código):

| # | Ficheiro | Teste | Razão do skip (verbatim) |
|---|---|---|---|
| 1 | `_tests/mc93d-contrato-onchain.test.mjs` | «FORK DE MAINNET: o CONTRATO_ADDRESS de produção tem bytecode» | «BLOQUEADO PELA R5 enquanto não houver RPC autorizado: ler mainnet exige um endpoint… o operador define `MAINNET_RPC_URL` (só leitura)» |
| 2 | `_tests/mc93d-contrato-postgrest.test.mjs` | «SERVIDOR: `.eq(col,null)` numa TIMESTAMPTZ devolve erro» | «sem `SUPABASE_CONTRATO_URL/KEY` — servidor real não disponível» |
| 3 | `_tests/mc93d-contrato-postgrest.test.mjs` | «SERVIDOR: `.is(col,null)` numa TIMESTAMPTZ funciona» | idem |
| 4 | `_tests/mc93d-contrato-postgrest.test.mjs` | «SERVIDOR: o compare-and-set real só afecta uma linha» | idem |
| 5 | `_tests/mc93d-contrato-postgrest.test.mjs` | «SERVIDOR: upsert parcial PRESERVA as colunas não listadas» | idem |
| 6 | `_tests/mc93d-contrato-postgrest.test.mjs` | «SERVIDOR: os CHECKs da migração recusam o que devem recusar» | idem |

**Trivial desbloquear? (Ponytail) — NÃO.** Os 6 dependem de **variáveis de ambiente/credenciais do
operador** (RPC de mainnet e credenciais Supabase). São testes **condicionais** (`t.skip` sob guarda de
env) ⇒ passam a correr **sozinhos** quando as variáveis existirem, sem alterar código.
⇒ **DEBT-001 → FECHADA (aceite com enumeração).** Nada tocado (não se toca em testes — RESSALVA 1).

### B.2 — DEBT-005: contagem do `regras-legado.md`

- **Declarado (linha 45):** «Total: **61 regras** em 9 categorias (E9 · T5 · G6 · L6 · S6 · **A8** · P7 ·
  AU4 · ST10)».
- **Re-medido literalmente por ficheiro** (`grep -cE '^## [A-Z]+[0-9]+' protocol/regras/*.md`):

  | ficheiro | regras |
  |---|---|
  | E-engenharia | 9 |
  | T-testes | 5 |
  | G-git-deploy | 6 |
  | L-lgpd | 6 |
  | S-seguranca | 6 |
  | A-ambiente | **13** |
  | P-processo | 7 |
  | AU-autonomia | 4 |
  | ST-stop | 10 |
  | HI-higiene | **10** |
  | **TOTAL** | **76 regras · 10 categorias** |

- **Coerência:** `protocol/regras/README.md` («76 regras», categoria `A1-A13`, «Total: 76 regras») e
  `SKILL.md` («76 regras em 10 categorias», árvore `A-ambiente.md ← A1-A13`) **já estavam correctos** —
  a lacuna era **só** o `regras-legado.md`.
- **Correcção aplicada:** a linha passou a «Total: **76 regras** em **10 categorias** (… **A13** … **HI10**)»
  + bloco de **errata** (o ficheiro é **legado**/histórico de R1-R20 — **anotado**, não substituído).
- ⇒ **DEBT-005 → FECHADA.**

---

## §Frente C — Verificação do NORTE + do gabarito Play

### C.1 — NORTE (`CLAUDE.md`, secção `## 🎯 NORTE DO PRODUTO`, linhas 260–414) vs consolidação do chat

| # | Item da consolidação | Estado | Onde (NORTE) |
|---|---|---|---|
| 1 | Passe R$ 2,00 = 1 ponto | ✅ | §2.1 |
| 2 | 50 pontos = 1 cartão | ✅ | §2.3 |
| 3 | Palpite = +2 pontos (bónus) | ✅ | §2.4 |
| 4 | Lojistas = patrocinadores (não vendem, não entram no app) | ✅ | §4.3 |
| 5 | NF-e CFOP 5.910 (patrocínio) + 5.102 (venda) | ✅ | §5.1 / §5.2 |
| 6 | Associação como vendedor legal (não MEI) | ✅ | §3.1–3.3 |
| 7 | Isenção IR/CSLL/Cofins | ✅ | §3.4 |
| 8 | Sem SPA/MF (programa de fidelidade) | ✅ | §6.3 |
| 9 | Google Play: loyalty program | ✅ | §7.1 |
| 10 | Apple: bem físico, sem IAP | ✅ | §7.2 |
| 11 | **Limite 5%: NÃO se aplica** | ❌ **AUSENTE** | — |

**Resultado: 10 ✅ / 1 ❌.** O item 11 **não existe** na NORTE — e **nem em fonte alguma medida**:
`grep -in "5%"` no `CLAUDE.md` → **0 ocorrências** na NORTE/série x; 0 nos logs da série x
(`_logs/UTAC106x*.md`) e no `RELATORIO-UTAC106x-CONSOLIDADO.txt`.

**Tratamento:** **anotado** na NORTE (nota do UTAC106x.6, inserida **sem substituir** nada) e reportado
ao operador. **Não inventado** (GATE 2 — o referente do «limite 5%» não está documentado em lado nenhum).
**Não é bloqueio do `UTAC106a`** (que mapeia o **fluxo do código**, não o enquadramento legal) — mas fica
**por esclarecer pelo operador**.

### C.2 — Gabarito Play (`docs/gabarito-play-console.md`) vs requisitos (briefing B1 §9.1)

Lido integralmente (126 linhas, 8 secções). Cobertura dos 8 requisitos do briefing:

| # | Requisito (B1 §9.1) | Estado | Onde |
|---|---|---|---|
| 1 | Programa de Fidelidade Gamificado | ✅ | §1 + §2 (categoria) |
| 2 | **Transacção separada e genuína** | ❌ **ausente do §6** | ausente do §6 do gabarito; **presente** em `CLAUDE.md:204` (secção `ESCOPO-ALVO` histórica) |
| 3 | Benefício complementar | ✅ | §6 #10 («benefício suplementar e subordinado»; §1 «palpite é bónus») |
| 4 | **Regras oficiais no app** | ✅ (com ressalva) | gabarito §7 row #14 («concursos: regras oficiais», ❓ não avaliado) + `CLAUDE.md:205` («regras publicadas») — **NÃO é lacuna** |
| 5 | Proporção fixa de acúmulo/resgate | ✅ | §6 #10 («rácio fixo») |
| 6 | Classificação AO | ✅ (a refazer) | §2 («AO» **não** é classificação IARC/Play — é ClassInd 18; R-17) |
| 7 | Data Safety | ✅ | §4 #1 e #2 |
| 8 | Ficha da Play (título, descrição, categoria) | ✅ | §3 (+ medidor `mc97`: 29/30 · 74/80 · 1285/4000) |

**Resultado (pós-veredicto do validador): 7 ✅ / 0 ⚠️ / 1 ❌.** Lacuna real:
- **(2) «transacção separada e genuína»** — requisito do *Gamified Loyalty* da Play **ausente do §6** do
  gabarito (a row #10 lista «benefício suplementar e subordinado; nº fixo de vencedores; prazo de entrada;
  data de entrega; rácio fixo», mas não essa expressão) — **embora exista no repo** (`CLAUDE.md:204`).
- **CANDIDATA (não medida contra o B1 §9.1, que não é artefacto do repo):** o §4 **omite** as declarações
  obrigatórias da consola **«Ads»** e **«App access»** (0 ocorrências no gabarito).

> ⚠️ **ERRATA (achado ⚠1 do validador adversarial — afirmação minha REFUTADA, mantida à vista).** A minha
> 1.ª redacção desta tabela marcava **dois** requisitos como lacuna, incluindo o **(4) «regras oficiais no
> app»** («aparece só na NORTE §10, não no gabarito»). **É FALSO** — medido pelo validador:
> `docs/gabarito-play-console.md:92` (row #14) diz «concursos: regras oficiais» e `CLAUDE.md:205` diz
> «regras publicadas». O item (4) **não** é lacuna. E o item (2), que eu dizia «não documentado em lado
> nenhum», **está em `CLAUDE.md:204`** (ESCOPO-ALVO histórico). ⇒ **1 lacuna real + 1 candidata.**
> A causa-raiz do erro (declarada): o `grep` que usei só varreu termos exactos no §6, **sem varrer a §7**,
> e **sem confrontar** o `ESCOPO-ALVO` histórico. Veredicto: `_logs/UTAC106x.6_SEG4_VALIDADOR.md`.

**Tratamento:** **anotadas** neste log + **registadas em `_logs/DEBT.md` (DEBT-020)**. O
`docs/gabarito-play-console.md` **NÃO foi editado** — está **fora da lista de autorizações** deste UTAC
(GATE 2/3). **Não bloqueiam o `UTAC106a`**; são conteúdo a completar **antes da submissão à Play** (o
gabarito já traz DEC-01/R-01/R-02/R-17/DEC-04/DEC-08 em aberto). Escalado ao operador: se considerar o
ponto (2) crítico, o fix é **uma linha** no gabarito — exige autorização (o ficheiro não estava no escopo).

---

## §Frente D — `package-lock` solc/edr (avaliar, NÃO alterar)

**Premissa do briefing** («confirmar que `solc`/`@nomicfoundation/edr` **não** estão no
`package-lock.json`») — **REFUTADA por medição**:

| Lock | `solc` | `@nomicfoundation/edr` |
|---|---|---|
| `package-lock.json` (raiz do git) | **ESTÁ** (`node_modules/solc`, 5 linhas) | **ESTÁ** (24 linhas) |
| `desafio-gut/package-lock.json` | **0** | **ESTÁ** (24 linhas) |
| `desafio-gut/frontend/package-lock.json` | 0 | 0 |

**Impacto real em CI — MC93-E salta? NÃO.** `.github/workflows/ci.yml` tem um job **dedicado**
`test-onchain` que faz `npm ci` em `desafio-gut` (comentário do próprio CI: «*raiz — traz o
`@nomicfoundation/edr`*») e depois **exige** `# skipped ≤ 1` **e** prova, por nome, que o teste decisivo
(«saldo on-chain DECREMENTA») e o controlo negativo correram. O **único** skip tolerado é o da
**recompilação com `solc`** (o **próprio CI** o declara: «*1 salto e o tolerado: a recompilacao com solc,
que nao vem no package-lock.json*») — e `solc` **não está** no `desafio-gut/package-lock.json`
(nem no `package.json` de `desafio-gut`).

⇒ **Conclusão:** o cenário da EVM (**MC93-E**) **não** salta em CI (é instalado e verificado); o que
salta é **1** teste de recompilação com `solc`, no contexto do `desafio-gut`.

**Opções documentadas (decisão do operador — NÃO alterado neste UTAC):**
- **(a)** acrescentar `solc` ao `desafio-gut/package-lock.json` — **afecta build**;
- **(b)** declarar `solc` como **devDependency** em `desafio-gut/package.json`;
- **(c)** aceitar o skip (o verde local + a verificação do CI são o que temos).

**Registo:** **DEBT-019** (aberta, severidade baixa, decisão do operador). `package-lock.json` **NÃO foi
alterado** (verificável: `git status --porcelain -- package-lock.json` → vazio).

---

## §Validador adversarial (SEG4)

**Despachado:** subagente Hermes independente, em **worktree próprio** (`tmp-utac106x6-val`) criado e
removido com o próprio helper, instruído a **TENTAR REFUTAR** (veredicto verbatim + resposta do executor em
`_logs/UTAC106x.6_SEG4_VALIDADOR.md`).

> **VEREDICTO: PARCIAL · 0 bloqueantes.** Os **5 fechos substantivos sobrevivem** à refutação (A/B/C/E/F,
> todos reproduzidos por execução). A frente **(D/gabarito)** tinha **1 afirmação factual falsa** minha.

| # | Grav. | Achado | Tratamento |
|---|---|---|---|
| 1 | ⚠ grave | **DEBT-020 item (4) FALSO** — «regras oficiais publicadas no app» **está** no gabarito (`:92`, row #14) e «regras publicadas» em `CLAUDE.md:205`; e «transação separada e genuína» existe em `CLAUDE.md:204` | **CORRIGIDO** — `DEBT-020` reescrita (1 lacuna real + 1 candidata); erro **mantido à vista marcado REFUTADA**; n.º de ficheiros/`DEBT` actualizados |
| 2 | ℹ nota | O resumo do `CLAUDE.md` dizia «1 skip **local** do solc» — localmente **não** há | **CORRIGIDO** no bloco R14 e neste log/relatório («no CI o único skip tolerado é o solc») |
| 3 | ℹ nota | `solc` instalado em `desafio-gut/node_modules` mas ausente do respectivo lock | Já em **DEBT-019**; redacção alinhada |
| 4 | ℹ nota | O §4 do gabarito omite as declarações **«Ads»** e **«App access»** | **REGISTADO** em `DEBT-020` como **candidata** (o B1 §9.1 não é artefacto do repo — o validador não o mediu) |
| 5 | ℹ nota | `grep "5%"` no `CLAUDE.md` imprime «Binary file matches» (bytes de controlo) | **Declarado** (limite de instrumento); a conclusão mantém-se |

**Alegações que o validador conseguiu REFUTAR (minhas):** (1) a «lacuna» do item 4 do gabarito; (2) o
«skip local do solc»; (3) a ideia de que «transação separada e genuína» não estava documentada no repo.
**Alegações que NÃO conseguiu refutar:** A13 = 4 junctions exactas (reproduzido end-to-end; 499/414
intactos) · DEBT-001 (6 skips, 1+5, env-gated) e DEBT-005 (76/10) · NORTE 10/11 · `package-lock` fora do
diff · 2×NUL + 2×0x1F inalterados.
**O que o validador NÃO mediu** (declarado por ele): o briefing B1 §9.1 em si; a suíte **frontend** (correu
só o backend); os runners de CI (leu o `ci.yml`, não os executou).

**Correcções feitas depois do veredicto ficam declaradas como «não re-validadas»** (sem 2.ª ronda).

---

## §Registos, arquivos e custo (SEG5)

**Registo em 3 lugares (R18):**
1. `_logs/UTAC106x.6-pendencias.md` (este log, detalhado) + `_logs/UTAC106x.6_SEG4_VALIDADOR.md` (veredicto).
2. `CLAUDE.md` — bloco **R14** resumido (no fim do ficheiro) + **anotação** na secção NORTE (§11), sem
   substituir nada; **4 bytes de controlo intactos** (2×NUL + 2×0x1F).
3. `Desktop/RELATORIO-UTAC106x.6-PENDENCIAS.txt` (relatório ao operador).

**Ficheiros alterados/criados** (commits `73cdd59` + o commit de errata pós-veredicto):
- `desafio-gut/frontend/skills/utac/protocol/regras/A-ambiente.md` (+19/−5)
- `desafio-gut/frontend/skills/utac/protocol/regras-legado.md` (+8/−1)
- `_logs/DEBT.md` (DEBT-001/005 fechadas · DEBT-019/020 novas · errata da DEBT-020)
- `CLAUDE.md` (bloco R14 + nota NORTE + errata; +29/−0 no 1.º commit)
- `_logs/UTAC106x.6-pendencias.md` (novo)
- `_logs/UTAC106x.6_SEG4_VALIDADOR.md` (novo — veredicto + resposta)

**Dívidas:** DEBT-001 **fechada** · DEBT-005 **fechada** · DEBT-019 **aberta** (package-lock/solc) ·
DEBT-020 **aberta** (lacuna do gabarito Play — 1 real + 1 candidata).

**Suíte:** frontend 694/694 · backend 992/998 (medida no baseline; **zero** código/testes alterados por
este UTAC). **Não re-medida** após o fecho (o validador correu só o backend, também verde).

**Custo de API (medido no fecho):**
- Sessão do executor (Hermes CLI `20261004_104512_7dad39`, `source=cli`): 144 mensagens · 86 tool calls ·
  148 854 tokens in · 71 365 out · **`estimated_cost_usd` ≈ US$ 0,0621**.
- Validador adversarial (sessão própria `20261004_105746_79b0e6`, `source=subagent`): 62 mensagens ·
  39 tool calls · 72 275 in · 30 597 out · **≈ US$ 0,0221**.
- **Total estimado: ≈ US$ 0,084.** ⚠️ A plataforma **não** abriu sessão nova por UTAC (a CLI é uma só) —
  o valor é estimativa da `state.db`.
- **Saldo real da API (medido):** arranque **US$ 7,48** → fecho **US$ 7,34** ⇒ **consumo real ≈ US$ 0,14**
  (conta também as delegações, que têm sessão própria). Reportadas as duas leituras separadas — *estimativa
  da base* vs *saldo real*.
