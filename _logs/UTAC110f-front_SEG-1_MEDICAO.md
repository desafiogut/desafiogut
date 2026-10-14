# UTAC110f-front — SEG-1 · MEDIÇÃO

**Executor:** Claude Code (Opus 5.5) · **Data:** 2026-10-13 · **Skill:** UTAC (`skills/utac/`), spec `_logs/UTAC110f-front.spec.yml`.
**Nada foi alterado neste segmento** (só leitura + este log + o spec). Excepção declarada: trim de working sets autorizado pelo
operador («libere espaço») — ver -1.5.

## -1.1 Estado do repo
- `git rev-parse HEAD` → **`2e6e43ce075b503a1f8af1492d5ae5bd8c3924c8`** (= fecho do UTAC110f, `fix(UTAC110f): achados do validador SEG5 + fecho`). Baseline = HEAD pós-110f ✅.
- `git status --porcelain` → **NÃO limpo**, mas sujidade PRÉ-EXISTENTE e alheia ao UTAC: `.agents/skills/aidesigner-frontend/*` (M),
  `.gitignore` (M), `.mcp.json` (M), `desafio-gut/frontend/package-lock.json` (M — artefacto conhecido do `netlify deploy`),
  `_logs/MC100_*.md` (??). **Nenhum destes é tocado nem adicionado** (git add individual).

## -1.2 Caminhos nomeados
| caminho | existe |
|---|---|
| `src/pages/MinhaCarteira.jsx` | ✅ 526 linhas |
| `src/hooks/usePontos.js` | ✅ 66 linhas |
| `netlify/functions/ler-pontos.mjs` | ✅ 80 linhas |
| `netlify/functions/_lib/fontes-lance.mjs` | ✅ 109 linhas |
| `src/hooks/useMissoes.js` | ❌ não existe (o enunciado autoriza criar; ver decisão Ponytail abaixo) |

## -1.3 Inventário
- **MinhaCarteira.jsx** — 1.º vidro (`GlassCard`, l. ~197): cabeçalho «Carteira» + ↻ → «Saldo Disponível» + valor R$ → grelha
  `data-saldos-passe` com os **3 saldos** (`data-saldo="fidelidade"` / `"creditos"` / `"eco-quildo"`, l. ~269-325) → avisos de erro
  (`pontosErro` l. ~326, `ecoErro` l. ~331) → grelha dos **4 botões** (l. ~340). O bloco novo entra **entre os avisos de erro e a
  grelha dos botões** («a seguir aos 3 saldos, antes dos botões de compra»).
- **usePontos.js** — `GET ler-pontos` com o `authToken` (user-session); `VAZIO` congelado; leitura sem coerção para `creditosLance`
  (`creditosDaResposta`). Padrão para o campo novo.
- **ler-pontos.mjs** — leitura pura do titular; resposta já tem `fidelidade` e `lance` (aditivo, UTAC110d). O `lance.historico`
  vem da MESMA linha (`select("*")`).
- **fontes-lance.mjs `estadoMissoesHoje(endereco, agora)`** → **`{ dia, loginFeito, lanceFeito }`** — **SEM `pontosHoje`**
  (o enunciado §4 diz que devolve `pontosHoje`: **premissa errada, medida**). **Lança** em erro de leitura. Faz uma 2.ª leitura
  (`lerLedgerLance`, mesma tabela `pontos`).
- Constantes: `PONTOS_LOGIN_DIARIO = 5`, `PONTOS_MISSAO_LANCE = 10` (exportadas).

## -1.4 EM_BREVE_MODE
`src/lib/leilaoLock.js` → `EM_BREVE_MODE = true` (o stub de testes também `true`). **Não será alterado.**

## -1.5 Recursos (A14) e disco
| momento | leituras (MB) | |
|---|---|---|
| inicial | **401 · 403 · 411** | < 1 500 ⇒ SEG-1 inválido |
| + trim de working sets (`EmptyWorkingSet`, 154 processos, **nada fechado**) | 711 · 908 · 1 188 (a subir) → **1 669 · 1 663 · 1 666** | ✅ A14 satisfeita |
Autorização: mensagem do operador «libere espaço» (2026-10-13), no mesmo procedimento do UTAC110f («libere ram»).
Disco: `df -h /c` → **11 GB livres** (> 5 GB) — nada apagado.

## -1.6 Suíte baseline
`npm test` (harness `mc966`, ambos) no HEAD `2e6e43c`, com A14 satisfeita: **frontend VERDE 1015/1015 · backend VERDE
1187/1193** — igual ao declarado no enunciado. (Corrida em background com saída redirigida para ficheiro; exit 0 e números
presentes — não é o falso-verde «stdin is not a tty».)

## ⚠️ Conflitos entre o enunciado e o medido (AU3 / GATE 12 — escalados ao operador ANTES do SEG0)
1. **§3 NÃO AUTORIZA «Editar netlify/functions/»** vs **§6 A1 manda editar `ler-pontos.mjs`** e §13 diz «NÃO tocar no backend
   fora do ler-pontos (se A1 feito)». ⇒ o próprio enunciado resolve-o pela intenção (§6/§13 mais específicos): **só
   `ler-pontos.mjs`** é tocado no backend. Declarado, não perguntado.
2. **«✅ verde»** (§8 C1) vs **R18 do UTAC109h.2** «uma só cor de destaque, o amarelo `#f5a623`» — e o teste
   `src/__tests__/utac109h2-carteira.test.mjs:79` **proíbe `#10b981`** na Carteira. → **PERGUNTADO**.
3. **`pontosHoje`** não existe em `estadoMissoesHoje` → definição necessária. → **PERGUNTADO**.
4. **Copy «Ganhaste X pontos hoje» / «Volta amanhã!»** (tu, pt-PT) vs Carteira em pt-BR «você» (e a guarda global
   `utac107g2-pt-br.test.mjs`). → **PERGUNTADO**.

### Respostas do operador (R18 — registadas em 3 lugares: este log, o relatório do Desktop, o bloco R14)
- **R18-110f-front-A:** ✅ (feito) = **amarelo `#f5a623`**; ⏳ (pendente) = muted. A decisão do 109h.2 prevalece.
- **R18-110f-front-B:** `pontosHoje` = **só as missões**: 5·login + 10·lance (0, 5, 10 ou 15). Calculado no `ler-pontos` a partir
  de `estadoMissoesHoje` + as constantes exportadas (sem tocar no `fontes-lance.mjs`).
- **R18-110f-front-C:** copy **pt-BR «você»** — «Você ganhou X pontos hoje» / «Volte amanhã!».

## Decisões do executor (declaradas, dentro da autorização)
- **Ponytail:** **não** se cria `useMissoes.js`; o `usePontos` (já existente, já lê `ler-pontos`) passa a expor `missoesHoje`
  (o enunciado prefere explicitamente esta via — §7 e §13).
- **Ícone do «feito»:** o emoji ✅ é desenhado **verde** pela fonte de emoji do sistema — contradiria R18-A. Usa-se o glifo de
  texto **«✓»** (U+2713, não-emoji) pintado em `#f5a623`; o pendente mantém **⏳**.

## -1.7 Veredicto
**SEGUIR** — conflitos 2-4 respondidos pelo operador (R18-A/B/C); conflito 1 resolvido pelo próprio enunciado.
