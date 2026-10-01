# UTAC000.7 — Relatório de fecho: regra A12 (instância do React no runner SSR)

**Data:** 2026-10-01 · **Executor:** Hermes Agent · **Baseline:** `34b087b`
**Objectivo:** escrever a regra **A12** na skill UTAC · **VEREDICTO: FECHADO**

---

## 1. Entregue
| # | entrega | detalhe |
|---|---|---|
| A | **A12** | `protocol/regras/A-ambiente.md` — **+23 linhas, 0 removidas** (nenhuma regra A1-A11 alterada) |
| B | **versão 1.2** | `review/VERSAO.md` — bump **minor** (regra nova) + linha no changelog |
| C | **contagem 75** | `SKILL.md` (×3) e `README.md` (×2): 74 → **75**; `A1-A11` → **A1-A12** |

## 2. O que a A12 diz (só o que foi MEDIDO — GATE 17)
- **Mecanismo:** o runner SSR do Vite 8 serve a um módulo carregado **mais tarde** uma instância de
  React **diferente** da do primeiro → `ReactCurrentDispatcher` a `null`
  (`Cannot read properties of null (reading 'useState')`). O **primeiro** `ssrLoadModule` de um
  processo acerta; os seguintes não.
- **Solução:** o **primeiro** módulo que o servidor de testes carrega tem de importar os pacotes que
  trazem React (`react`, `react-dom/server`, `react-router-dom`, `framer-motion`) — papel de
  `src/__tests__/_ponte-ssr.mjs`. Dependências com React próprio (react-router, framer-motion) vêm
  daí, não de um `import` do Node.
- **Como se verifica:** mutação que desliga o load da ponte → **RED** (suíte **15 falhas**); religar →
  **VERDE 535/535**.
- **Armadilha de medição (declarada na regra):** com `.vite` **apagado** o mutante dá **0/15**; com
  cache **quente**, **6/15**. Declarar sempre o estado da cache — foi esta divergência que o validador
  do UTAC000.6 apanhou.
- **Origem:** `op: 2026-10-01 (UTAC000.6)` · **Cross-ref:** HI10, A9, A11, T4.

## 3. Verificação de consistência (GATE 6)
| verificação | esperado | medido |
|---|---|---|
| `grep -c "^## A"` | 12 | **12** ✅ |
| ID `A12` único | 1 | **1** ✅ |
| linhas removidas em `A-ambiente.md` | 0 | **0** ✅ |
| `grep -rn -i utac01` na skill | 0 | **0** ✅ |
| «75 regras» declarado | coerente | **5 ocorrências**, todas 75 ✅ |
| `A1-A12` | 2 sítios | **2** ✅ |
| versão | 1.2 | **1.2** ✅ |
| suíte | 535/535 · 967/973 | **VERDE · VERDE** ✅ |

## 4. Escopo (GATE 2 / HI4)
Alterados: `A-ambiente.md`, `review/VERSAO.md`, `SKILL.md`, `protocol/regras/README.md`, `_logs/*`,
`CLAUDE.md`. **Zero código de produção**; `_ponte-ssr.mjs`, `_render.mjs` e `vite.config.js` **não
foram tocados** (medido por `git diff`). GATE 9 respeitado: as 74 regras anteriores **intactas**
(`0` linhas removidas).

## 5. Validador adversarial (GATE 8)
Despachado subagente independente, instruído a **TENTAR REFUTAR**: contagem real da soma das regras,
veracidade da ligação causal («sem ponte → RED»), reprodutibilidade das cifras (15 falhas; 0/15 vs
6/15 conforme a cache), existência das cross-references e estilo. **Veredicto registado em
`_logs/UTAC000.7_SEG-2_VALIDADOR.md`** (e, se refutar, corrigido — o erro fica à vista, marcado
REFUTADO, nunca apagado).

## 6. Dívida (GATE 14)
Nada de novo. **DEBT-004** continua **fechada** (UTAC000.6). **DEBT-001/002/003** inalteradas.

## 7. Registo R18 (3 lugares)
> **R18 (UTAC000.7):** o operador autorizou escrever a **A12** num UTAC de skill próprio, fechando a
> lacuna de escopo do UTAC000.6 (que não podia tocar na skill). A regra documenta **apenas** o que foi
> medido no UTAC000.6, incluindo a armadilha da condição de cache que o validador daquele UTAC apanhou.
> — `_logs/UTAC000.7-RELATORIO.md` · `CLAUDE.md` · `Desktop/UTAC000.7-RELATORIO.md`.

## 8. Custo
Ver fecho da sessão (`sessions` do `state.db`). **GATE 16:** a sessão é partilhada pelos UTAC105b.3,
000.3, 000.4, 000.5, 000.6 e 000.7 — o custo por UTAC **não é separável**; os validadores **são**
discrimináveis individualmente.
