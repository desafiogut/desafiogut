# UTAC110b — SEG-1 · MEDIÇÃO

> **Estado do UTAC:** ⛔ **PARADO no SEG-1** — gate **A14 REPROVADO** (§1). Nenhuma linha de código tocada,
> nenhuma chamada a produção, nenhuma env var lida. Spec: `_logs/UTAC110b.spec.yml` (skill UTAC, tipo `diagnostico`).

## §1 · A14 — RAM livre (3 leituras, `FreePhysicalMemory/1024`) · ⛔ REPROVADO

| # | hora (2026-10-12) | RAM livre | ≥ 1 500 MB? |
|---|---|---|---|
| 1 | 18:30:49 | **375 MB** | ❌ |
| 2 | 18:30:54 | **361 MB** | ❌ |
| 3 | 18:30:59 | **374 MB** | ❌ |

Total físico: **5 877 MB**. Disco C: **17 GB** livres (≥ 5 GB ✅).
Regra do enunciado (§5a): «Se todas < 1 500 MB → PARAR e reportar». **Todas < 1 500 ⇒ PARAR.**

Maiores consumidores (Working Set agregado por nome, medido às 18:31):

| processo | nº | MB |
|---|---|---|
| node | 17 | 1 199 |
| svchost | 89 | 976 |
| chrome | 9 | 606 |
| msedge | 9 | 460 |
| claude | 1 | 430 |
| MsMpEng | 1 | 323 |
| msedgewebview2 | 19 | 226 |

O executor **não lançou** nenhum destes processos neste UTAC ⇒ pela A14 não fecha nenhum
(precedente UTAC110a: o operador fechou janelas e a RAM subiu para ~1 750 MB).

## §2 · Estado do repo (medido antes de parar)

| item | esperado | medido |
|---|---|---|
| HEAD | `e64bf28` | **`e64bf28994f86e24e325bea2362f65610971dc50`** ✅ |
| `git status --porcelain` | limpo | **30 entradas `??`**, todas pré-existentes e não deste UTAC: `_logs/MC100_*` (10+), `_logs/MC101_*`, `_logs/MC102_*`, `_logs/UTAC106x.2.spec.yml` — **desvio declarado**; zero modificados (`M`) |
| suíte baseline | 979/979 · 1095/1101 | **não corrida** (A14 reprovado — correr a suíte com 360 MB livres falsearia o resultado) |

## §3 · Contexto já lido (sem custo de RAM)

- `_logs/UTAC109i-auditoria.md` §SEG6 (R-1 a R-4) — fonte das 5 fraquezas e de B-4.
- Memória do projecto: o índice RAG vive no Netlify Blob store `rag` (fora do repo); só muda com
  `scripts/build-rag-index.mjs --yes` + `OPENAI_API_KEY`/`NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` (operador).

## ⚠️ Conflitos / perguntas ao operador (AU3)
1. **A14:** fechar janelas/processos para libertar RAM (≥ 1 500 MB) e mandar retomar? (Os 17 `node`
   = ~1,2 GB são provavelmente servidores MCP/dev — decisão do operador.)
2. O working tree tem 30 ficheiros `??` antigos (`MC100_*`, `MC101_*`, `MC102_*`, `UTAC106x.2.spec.yml`);
   o enunciado diz «limpo». Prosseguir ignorando-os (nunca `git add -A`, logo não entram no commit)?

## Veredito
**PARAR** — A14 reprovado nas 3 leituras. Retomar o SEG-1 (passos d–g) após o operador libertar RAM.

## §1b · A14 — 2.ª tentativa (operador: «tente novamente») · ⛔ REPROVADO

| # | hora | RAM livre |
|---|---|---|
| 4 | 18:32:11 | **741 MB** |
| 5 | 18:32:16 | **672 MB** |
| 6 | 18:32:21 | **717 MB** |

Subiu ~+340 MB, mas as três continuam < 1 500 MB ⇒ **PARAR** mantém-se.

## §1c · A14 — 3.ª tentativa após intervenção autorizada · ✅ SATISFEITO

Operador: «feche o que for necessário». Fechados **31 processos** (node/cmd/npx) de servidores MCP
**não usados por este UTAC**: sportscore, jetbrains mcp-proxy, validkit, claude-eyes, tapsite, mockit,
binance, instagram-mcp, chrome-devtools-mcp. **Browsers (Chrome/Edge) e Hermes NÃO tocados.**

| # | hora | RAM livre |
|---|---|---|
| 7 | 18:33:29 | **1 603 MB** |
| 8 | 18:33:34 | **1 609 MB** |
| 9 | 18:33:39 | **1 623 MB** |

Todas ≥ 1 500 ⇒ **A14 satisfeito** (margem curta: ~100 MB; re-medir antes da suíte).

## §4 · Retoma do SEG-1 (após A14 ✅)

| passo | medido |
|---|---|
| d) suíte baseline (`npm test` em `desafio-gut/frontend` → `mc966-suite-harness.mjs ambos`) | **frontend 979/979 · backend 1095/1101 · VEREDITO VERDE** = esperado ✅ |
| e) fluxo do GUTO | `chatbot.mjs:1446-1513` (embedding → busca semântica → textual → LLM → template) — detalhe no diagnóstico §2 |
| f) cabeçalhos vs código | `rag.mjs:10` «float[1536]» · `build-rag-index.mjs:5,10,19` «OpenAI 1536 / OPENAI_API_KEY» vs `rag.mjs:28` MiniLM + `rag:meta.dimensao=384` ✅ contradição confirmada |
| g) 5 fraquezas do 109i | todas confirmadas no código actual (diagnóstico §5) |

Desvios do enunciado: (1) working tree com 30 `??` pré-existentes; (2) a fonte `docs/chatbot/regulamento.md`
está na **raiz do git** (`DESAFIOGUT/docs/…`), não em `desafio-gut/docs/`; (3) a env var é `HF_API_TOKEN`
(não `HUGGING_FACE_TOKEN`) e o LLM é DeepSeek via `LLM_API_KEY` (não `OPENAI_API_KEY`).

## Veredito final do SEG-1
**SEGUIR** (A14 satisfeito, HEAD = baseline, suíte = baseline).
