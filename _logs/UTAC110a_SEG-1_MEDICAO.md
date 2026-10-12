# UTAC110a — SEG-1: MEDIÇÃO (Selo do Mercado · contraste WCAG AA)

> **Executor:** Hermes / DeepSeek-v4-flash (sessão CLI). **Data:** 2026-10-12.
> **Frente única:** A (cor do texto do selo de estado da `TabelaLances.jsx`).
> **Estado do UTAC:** ⛔ **PARADO no SEG-1** — gate **A14 REPROVADO** (§1). Nenhuma linha de código tocada.

---

## §0 · Identificação e âmbito

| Campo | Valor |
|---|---|
| Repo | `C:\Users\Moltbot\Desktop\DESAFIOGUT` |
| Componente alvo | `desafio-gut/frontend/src/components/TabelaLances.jsx` (selo = `estilos.statusBadge`, linha **317**) |
| Referência (solução OP) | `desafio-gut/frontend/src/pages/OfertasProgramadas.jsx` (badge, linha **411**) — fix do UTAC109g, commit `12a2731` |
| Autorizado | ler repo, editar `TabelaLances.jsx` + testes, correr suíte, commit/push foreground |
| Proibido | deploy, `git add -A`, tocar em `CartaoEdicao` / `GlassHeader` / OfertasProgramadas / MinhaCarteira |

**md5 (antes de qualquer edição, para o restauro R16):**

```
6a98ff5b6131b25718fb977924631a03  TabelaLances.jsx
b2687e76799f8eec7390e5676a80c8b3  OfertasProgramadas.jsx
be3e83f4825638e86e1c742fe27341fa  utils/edicao.js
```

---

## §1 · A14 — RAM livre · ⛔ REPROVADO → ✅ **RESOLVIDO** (intervenção do operador)

Regra A14 (CLAUDE.md, R14 do UTAC109h): `[int](FreePhysicalMemory/1024)` **≥ 1 500 MB**, senão
**o SEG-1 não é válido**; o executor escala ao operador para libertar memória antes de continuar.

Medições desta sessão (todos os valores **reais**, nenhum apagado):

| # | RAM livre (MB) | Nota |
|---|---|---|
| 1 | **566** | `FreePhysicalMemory` no arranque do SEG-1 |
| 2 | **591** | `AvailableMBytes` (perf counter, mesma janela) |
| 3 | **256** | 2.ª medição, minutos depois (variação do sistema) |
| 4 | **460 / 470 / 434** | 3 medições consecutivas (última janela) |

- Total de RAM física: **5 877 MB**.
- Mínimo exigido: **1 500 MB** · observado máximo: **591 MB** · **défice ≈ 910 MB**.
- **Veredicto: A14 REPROVADO em todas as 6 medições.**

**Classificação de processos (regra do 109h: só se fecha o que o executor lançou, browsers
*sem* janela e sessões claude terminadas; árvores com janela / sessão actual / MCPs ficam):**

| Processo | PID | WS | Classe | Acção |
|---|---|---|---|---|
| `msedge.exe --no-startup-window` | 10400 | 107 MB | browser sem janela (prelaunch Edge) | fechável mas **insuficiente** — máx. +107 MB |
| `chrome.exe` (janela: YouTube) | 14244 | 201 MB | **árvore COM janela** | INTOCÁVEL (A14) |
| Chrome/Edge consumers (renderers, GPU, etc.) | vários | ≈ 1 400 MB | árvores com janela | INTOCÁVEL (A14) |
| `node.exe` @mcpware (npx) | 6904 / 4024 | 146 MB | **MCP do operador** | INTOCÁVEL |
| `python.exe` → `hermes.exe` | 18408 / 17680 | 206 MB | **sessão actual** | INTOCÁVEL |
| `msedgewebview2` (hosts WebView2) | 3080 + … | ≈ 700 MB | apps do operador (não classificável) | INTOCÁVEL |

- **Nada foi lançado por este executor** (não há `vite`, nem Chrome headless, nem órfãos de UTAC anterior).
- **Conclusão: nada fechável** dentro da autorização A14. O único candidato (Edge sem janela, 107 MB)
  não fecha um défice de ≈ 910 MB; os ≈ 1,4 GB que faltam vivem nas **árvores Chrome/Edge COM janela**
  do operador, que a A14 proíbe fechar sem ordem dele.
- ⇒ **Escalado ao operador** (§7). Sem operador disponível, o protocolo manda **PARAR** — foi o que se fez.

---

## §2 · Baseline git — **DERIVA declarada** (premissa medida, não assumida)

O UTAC declara `Baseline: a9feb9b (HEAD = origin/main)`. **Medido:**

| Item | Declarado no UTAC | Real | Diferença |
|---|---|---|---|
| `HEAD` | `a9feb9b` | **`ee476e2`** | +2 commits |
| `origin/main` | `a9feb9b` | **`ee476e2`** | idem |
| Branch | — | `main` (a par de `origin/main`) | — |
| `a9feb9b` vs `HEAD` | — | **`a9feb9b` é ancestral de `HEAD`** | — |

Commits entre os dois (medidos com `git diff --stat a9feb9b..HEAD`, **só documentação**):

```
CLAUDE.md                        |  17 ++
_logs/UTAC109i-auditoria.md      | 577 +++++++++++++++
_logs/UTAC109i_PERGUNTAS-OPUS.md |  83 ++++++
3 files changed, 677 insertions(+)
```

- **Nenhum ficheiro de código** entre `a9feb9b` e `HEAD` — a deriva é **só de `_logs/` + `CLAUDE.md`**
  (são os dois commits de fecho do UTAC109i, `2de0ead` e `ee476e2`, que a auditoria 109i cita como `2de0ead`).
- **Impacto na premissa:** nulo para o alvo — `TabelaLances.jsx` e `OfertasProgramadas.jsx` estão
  **byte-iguais** a `a9feb9b`. A premissa «`HEAD = a9feb9b`» é **falsa na letra** e **verdadeira na
  substância**; registada à vista (regra 15/GATE 15), não apagada.

`git status --porcelain`: apenas `??` antigos (`_logs/MC100_*`, `MC101_*`, `MC102_*`, `UTAC106x.2.spec.yml`)
— **working tree limpo** nos ficheiros versionados. Confere com o estado conhecido do UTAC.

---

## §3 · Suíte — **NÃO CORRIDA** (baseline inválido por A14)

Comando canónico: `npm test` no frontend → `node ../../scripts/mc966-suite-harness.mjs ambos`.

Exigido pelo UTAC (§5g, §7): frontend **970/970**, backend **1095/1101**.
**Não corrida**: correr com 256–591 MB livres repete exactamente o incidente que criou a A14
(no UTAC109h, com 220 MB livres, o Windows deu **erro 1450**, o `vite` caiu **3×** e a suíte deu
**3 falhas falsas**). Um baseline assim é **contaminado** — e o próprio UTAC proíbe avançar com ele.
⇒ **Sem baseline de suíte; nada medido, nada afirmado.**

---

## §4 · Factos de código (leitura, sem edição)

**Selo do Mercado — `TabelaLances.jsx`** (a corrigir):

```js
// L124 (uso):   <span style={{ ...estilos.statusBadge, background: est.cor }}>
// L125 (texto):   {est.badge}
// L315-318 (estilo):
  statusBadge: {
    padding: "0.22rem 0.75rem", borderRadius: "20px",
    fontSize: "0.7rem", fontWeight: "700", color: "#fff",   // ← L317 · BRANCO (o problema)
  },
```

**Selo da OP — `OfertasProgramadas.jsx`** (a referência, já em produção desde o 109g):

```js
// L407-411 (fix do 109g, commit 12a2731):
  // ⚠️ achado do validador (SEG3): o branco do molde dá 2,54–3,76:1 sobre as cores de estado (< AA).
  // Aqui o texto é o navy do app (#0a0f1a, o mesmo do botão dourado)…
  badge: { padding: "0.22rem 0.75rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, color: "#0a0f1a" },
```

**Fundo do selo — `utils/edicao.js` L34-39** (fonte única das cores de estado; idêntica nos dois ecrãs):

```js
  em_breve:     "#ff6b35",   ativa: "#10b981",   encerrada: "#ef4444",   indisponivel: "#6b7db8",
```

⇒ **O fundo do selo é `est.cor` OPACO** (não é o vidro, não há `alpha`, não há `backdrop-filter`).
Logo a ressalva do UTAC («se a cor da OP não servir no Mercado por causa do fundo») **não se aplica**:
o par texto/fundo é **o mesmo par exacto** nos dois ecrãs. O fix do 109g é replicável **literalmente**.

---

## §5 · Medição de contraste (calculada — WCAG 2.x, luminância relativa)

Implementação: `L = 0.2126·R + 0.7152·G + 0.0722·B` com linearização
`c/12.92` (c ≤ 0.03928) senão `((c+0.055)/1.055)^2.4`; razão `(L_claro+0.05)/(L_escuro+0.05)`.

**Antes (texto `#fff` — o que está no Mercado hoje):**

| Estado | Fundo (`est.cor`) | Contraste | WCAG AA (4,5:1 p/ texto normal) |
|---|---|---|---|
| EM BREVE | `#ff6b35` | **2,84:1** | ⛔ REPROVA |
| ATIVA | `#10b981` | **2,54:1** | ⛔ REPROVA |
| ENCERRADA | `#ef4444` | **3,76:1** | ⛔ REPROVA |
| INDISPONÍVEL* | `#6b7db8` | 4,00:1 | ⛔ REPROVA |

\* O UTAC só exige 3 estados; o 4.º (`INDISPONIVEL`, herdado de `edicao.js`) foi medido por completude —
e **também reprova** com branco, logo a correcção tem de cobrir os 4.

**Depois (texto `#0a0f1a`, o navy da OP):**

| Estado | Fundo | Contraste | AA |
|---|---|---|---|
| EM BREVE | `#ff6b35` | **6,76:1** | ✅ |
| ATIVA | `#10b981` | **7,55:1** | ✅ |
| ENCERRADA | `#ef4444` | **5,09:1** | ✅ |
| INDISPONÍVEL | `#6b7db8` | **4,79:1** | ✅ |

**Cruzamento com a fonte independente:** os 3 valores do «antes» batem **ao centésimo** com os do
UTAC109i (2,84 / 2,54 / 3,76) e com o comentário do 109g. Os 4 do «depois» batem **ao centésimo**
com o comentário do 109g (`6,76 · 7,55 · 5,09 · 4,79`). Três medições independentes concordam ⇒
a medição deste SEG-1 está **validada por concordância**, e o **pior caso do «depois» é 4,79:1**
(> 4,5:1), com **margem de apenas 0,29** no estado `INDISPONÍVEL`.

⚠️ **Nota para o SEG0:** o mínimo do fix é **4,79:1** e não «6,8–7,6:1» como o UTAC §4 sugere — o
intervalo 6,8–7,6 cobre só EM BREVE/ATIVA; ENCERRADA é 5,09 e INDISPONÍVEL 4,79. Nada bloqueia, mas
o valor declarado no relatório final tem de ser o **mínimo real (4,79:1)**, não o intervalo.

---

## §6 · Checklist do SEG-1

| Item | Exigido | Medido | Estado |
|---|---|---|---|
| a) RAM (A14) | ≥ 1 500 MB | **434–591 MB** | ⛔ **REPROVADO** |
| b) `HEAD` | `a9feb9b` | `ee476e2` (ancestral ok) | ⚠️ deriva docs-only declarada |
| c) `git status --porcelain` | vazio | só `??` antigos | ✅ |
| d) Cor actual do selo (L317) | registar | `"#fff"` | ✅ |
| e) Cor da solução OP (L411) | registar | `"#0a0f1a"` | ✅ |
| f) Contraste actual (3 estados) | registar | 2,84 / 2,54 / 3,76 | ✅ |
| g) Suíte baseline verde | 970/970 | **não corrida** (A14) | ⛔ bloqueado |

---

## §7 · Conclusão do SEG-1

1. **Gate A14 REPROVADO**: RAM livre 434–591 MB contra os 1 500 MB exigidos (défice ≈ 910 MB),
   em 6 medições. O protocolo A14 é explícito: **SEG-1 inválido**, escalar ao operador; sem
   operador, **PARAR**. **Nada fechável** dentro da autorização (a RAM que falta está nas árvores
   Chrome/Edge **com janela** do operador).
2. **Baseline git com deriva declarada** (docs-only; código intacto vs `a9feb9b`).
3. **A correcção está integralmente caracterizada** e pronta a aplicar: **1 linha**,
   `TabelaLances.jsx:317`, `color: "#fff"` → `color: "#0a0f1a"`, replicando
   `OfertasProgramadas.jsx:411` (109g / `12a2731`). O fundo do selo é **o mesmo par opaco** nos dois
   ecrãs ⇒ sem risco de fundo diferente.
4. **Contraste do «depois» medido e validado por tripla concordância:** 6,76 / 7,55 / 5,09 / **4,79**
   (o mínimo, no estado INDISPONÍVEL) — todos ≥ 4,5:1.
5. **Nenhum ficheiro foi editado; nenhum teste escrito; nenhum commit feito.**

**Acção tomada:** escalado ao operador; o operador fechou as janelas dos browsers e autorizou
(«pode fechar o que for necessário»). **A árvore Edge do operador foi identificada e NÃO precisou de ser
fechada** (a RAM subiu sozinha quando as janelas fecharam); os `msedgewebview2` são do WhatsApp
(pai = PID 16076 `WhatsApp.Root`), nada foi tocado, e nenhum MCP foi tocado. Ver §8.

---

## §8 · ADENDA — A14 fechado e SEG-1 concluído (mesma sessão)

### §8.1 · A14 satisfeito
Depois de o operador fechar as janelas dos browsers, a RAM livre medida (6 leituras consecutivas, 5 s
entre elas) foi **1751 / 1751 / 1750 / 1750 / 1746 / 1746 MB** — todas **≥ 1 500 MB**. **A14 satisfeito**,
com margem de ~246 MB. Total da máquina: 5 877 MB.

⚠️ **Nota de método:** o pico de 256 MB medido em §1 (2.ª leitura) mostra que a RAM desta máquina
**oscila em segundos**. Um SEG-1 que se decidisse com uma leitura isolada seria uma moeda ao ar —
as 6 leituras concordantes é que sustentam a decisão.

### §8.2 · Suíte de baseline (o item (g) que faltava)
`node scripts/mc966-suite-harness.mjs ambos` no repo, **com A14 satisfeito**:

| Suíte | Resultado | Declarado no UTAC |
|---|---|---|
| frontend | **VERDE 970/970** | 970/970 ✅ |
| backend | **VERDE 1095/1101** | 1095/1101 ✅ |

⇒ **Baseline verde confirmado e coincidente com o declarado.** O SEG-1 fica **válido**.

### §8.3 · Estado final do SEG-1
| Item | Estado |
|---|---|
| a) RAM (A14) | ✅ **1746–1751 MB** (após intervenção do operador) |
| b) `HEAD` | ⚠️ deriva docs-only declarada (`ee476e2` = `a9feb9b` + 2 commits de `_logs`/`CLAUDE.md`) |
| c) working tree | ✅ limpo (só `??` antigos) |
| d–f) cor actual / cor da OP / contraste | ✅ medidos (ver §4 e §5) |
| g) suíte baseline | ✅ frontend 970/970 · backend 1095/1101 |

⇒ **SEG-1 VÁLIDO. Autorizado a avançar para o SEG0.**

