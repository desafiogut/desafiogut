# UTAC000.9 — Relatório: vencedor do Dashboard (DEBT-008)

**Data:** 2026-10-01/02 · **Executor:** Hermes Agent · **Base real medida:** `e19306e` = `origin/main`
**Objectivo:** fechar **DEBT-008** (resíduo declarado do UTAC000.8)
**VEREDICTO: ENTREGUE** — 2 sítios corrigidos no escopo, 2 declarados fora do escopo (escalados), suite verde.

---

## 1. O defeito (medido, não suposto)
O card «🏆 Menor Lance Único» do **Dashboard** mostrava o `vencedor` do `AppContext`, que é
**derivado localmente** dos lances que o browser viu:
`AppContext.jsx` l. 697-700 — `[...lancesExibidos].filter(!repetido).sort(valor)[0]`.
Em produção (mainnet) o browser vê **pouco ou nada** da edição: o valor do lance nunca vai em
claro para a cadeia (vai o `keccak256` → evento `LanceComprometido`) e os valores vivem no
servidor, **blindados durante o leilão** — medido e documentado no UTAC000.8
(`_logs/UTAC000.8_SEG-1_MEDICAO.md` §-1.9). Logo o card dizia, na prática, «o menor único que
este browser viu». É a mesma classe de defeito da DEBT-007, **noutro sítio** — e o mesmo defeito
estava no 🏆 da tabela de lances (`TabelaLances`).

## 2. Inventário (Frente A) — todos os sítios, com veredito
| # | sítio | o que faz | estado |
|---|---|---|---|
| 1 | `src/context/AppContext.jsx` l. 697-700 | derivação local do `vencedor`, exposta no contexto | **DEFEITO** — **fora do escopo** (não autorizado) |
| 2 | `src/pages/Dashboard.jsx` l. 391-405 + 499-500 | card «🏆 Menor Lance Único» + prop do overlay de fim | **DEFEITO** — **CORRIGIDO** |
| 3 | `src/components/FimEdicaoOverlay.jsx` | mostra o vencedor que **recebe por prop** | **DEFEITO indirecto** — **CORRIGIDO sem o tocar** (o Dashboard passa-lhe o oficial; a forma `{endereco, valor}` é a mesma) |
| 4 | `src/components/TabelaLances.jsx` l. 51/161/268 | `idxVencedor = findIndex(!repetido)` → 🏆 da tabela (MercadoLances) | **DEFEITO** — **CORRIGIDO** |
| 5 | `src/pages/MercadoLances.jsx` l. 69-73/157/195 | `OverlayVencedor` recebe o `vencedor` do contexto | **DEFEITO** — **fora do escopo** (não autorizado) |
| 6 | `src/components/edicao-especial/PainelVencedorEspecial.jsx` | lê o resultado **oficial** (via `useResultadoEspecial`) | **JÁ CORRECTO** (MC94) |
| 7 | `src/pages/DetalheProduto.jsx` l. 39 | destrutura `vencedor` do contexto mas usa `produto.vencedor` | não é sítio de defeito — variável **morta** |
| 8 | `src/pages/MeusAtivos.jsx` | já usa o `useResultadoOficial` (UTAC000.8) | **JÁ CORRECTO** — fora do escopo |

**4 sítios com o defeito; 2 corrigidos dentro do escopo (+1 por arrasto, sem o tocar); 2 declarados
fora do escopo (escalados, GATE 10/19).**

## 3. A correcção (Frente B) — Ponytail: zero código novo de I/O
| ficheiro | o que passou a fazer |
|---|---|
| `src/pages/Dashboard.jsx` | `vencedorExibido = resultadoOficial ? { endereco: vencedor, valor: menorUnicoCentavos } : vencedor`. O card e o `FimEdicaoOverlay` usam-no. **A forma é a mesma que já esperavam** — por isso o overlay ficou corrigido **sem ser tocado**. |
| `src/components/TabelaLances.jsx` | Com o oficial, `idxVencedor` casa **endereço + valor** do vencedor publicado; o index vem `-1` quando o vencedor não está na lista (nenhum 🏆 — não se assinala por aproximação). Linhas **blindadas** (`oculto`, `valor null`) **nunca** casam → durante o leilão a mainnet continua **sem 🏆**, como estava (GATE 18). |

**Reutiliza** o `useResultadoOficial.js` do UTAC000.8 (já em produção). **Nenhuma dependência nova**
(package.json intocado). Em SSR, o `useEffect` do hook não corre → devolve `null` → **comportamento
antigo**, sem regressões.

## 4. Provas (Frentes C/D)
- **Testes:** +4 no `src/pages/__tests__/Dashboard.test.mjs` (card, overlay, regressão, cablagem) e
  **novo** `src/components/__tests__/utac0009-tabela-vencedor.test.mjs` (6 testes, com duplo do hook
  em `_stubs/` que **regista a edição pedida**).
- **Caso discriminante** em ambos: o apuramento **local** (100, OUTRO) ≠ o **oficial** (300, EU).
  Sem a correcção o 🏆 ia para o lado errado — é isso que faz os testes morderem.
- **Mutação:** **M7** («o Dashboard ignora o oficial») → **3 RED**; **M8** («a Tabela ignora o
  oficial») → **3 RED**. Ambos restaurados com **md5 idêntico** ao pré-mutação.
- **Suite:** frontend **579/579 → 589/589 VERDE** (+10); backend **967/973 VERDE** (0 regressões).
- **Escopo:** `git diff --name-only` contra `e19306e` = Dashboard.jsx, TabelaLances.jsx,
  Dashboard.test.mjs (+ `package-lock.json`, **pré-existente**). **Nada fora do escopo.**
- Evidência bruta: `_logs/UTAC000.9_SEG-1_EVIDENCIA.txt` (ANTES) e
  `_logs/UTAC000.9_SEG-2_ANTES-DEPOIS.txt` (antes/depois, mutações, md5s, escopo).

## 5. Validador adversarial (SEG3) — obrigatório
Despachado sobre o commit `e1aacda`, em worktree próprio, instruído a **tentar refutar** (e a fazer
o seu PRÓPRIO inventário de sítios). Veredicto: ver **`_logs/UTAC000.9_SEG-3_VALIDADOR.md`**.

## 6. Fora do escopo — ESCALADO ao operador (GATE 10)
Dois sítios com o mesmo defeito **não** foram corrigidos porque o spec não os autoriza
(`src/context/**` e `src/pages/**` fora do Dashboard):
1. `src/context/AppContext.jsx` l. 697-700 — a derivação local do `vencedor` (continua exposta no
   contexto);
2. `src/pages/MercadoLances.jsx` l. 157/195 — o `OverlayVencedor` do fim da rodada mostra esse
   `vencedor`.
**Registado como DEBT-009** (não escondido). Corrigi-los é análogo (o hook já existe): ~45 min,
mas exige autorização nova.

## 7. Desvios declarados
1. **`package-lock.json`:** aparece modificado mas é **pré-existente** (não meu) e ficou **de fora**
   do commit.
2. **Instrumento:** o teste do overlay **não** pode assentar num marcador do markup (o
   `FimEdicaoOverlay` não tem `data-*`); a prova é por **contagem** do endereço oficial na página
   (1× sem overlay, 2× com ele). Um `indexOf("FimEdicaoOverlay")` teria dado **0** e medido a página
   inteira — teste vácuo, evitado de propósito.
3. **Duplo do `dompurify`** no teste da TabelaLances: o `import DOMPurify from "dompurify"` **não
   sobrevive** ao interop do Vite SSR (medido: `default.sanitize is not a function`). O
   `src/utils/sanitize.js` **real** corre; só a biblioteca é substituída. Declarado no próprio
   `_stubs/dompurify.js`.
4. **Worktree do UTAC000.8** (`tmp-utac0008-val/fe`) continua montado: o `cmd //c rmdir` das
   junctions é manglado pelo MSYS e a alternativa arriscava o `node_modules` real. Receita segura
   no relatório daquele UTAC.

## 8. Custo
Ver §9.

## 9. Custo da API (sessão dedicada a este UTAC)
Lido de `state.db` no fecho — ver a resposta final ao operador.
