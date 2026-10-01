# UTAC000.10 — SEG-1 · Medição, inventário e veredito — 2026-10-01

**Objectivo:** fechar **DEBT-009** (os 2 sítios que o UTAC000.9 declarou fora do escopo: o
`vencedor` do `AppContext` e o `OverlayVencedor` do `MercadoLances`).
**Veredito do SEG-1: SEGUIR** — os resíduos são pré-existentes, estão localizados, e a correcção
mínima é **um único ponto** (a fonte), com o resto a ser corrigido por arrasto.

## -1.1 Estado MEDIDO (antes de tocar)
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`a122b18`** = `origin/main` (como o spec declara) |
| suíte frontend | **VERDE 591/591** |
| suíte backend | **VERDE 967/973** |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (**pré-existente**) |
| evidência bruta | `_logs/UTAC000.10_SEG-1_EVIDENCIA.txt` |

## -1.2 É PRÉ-EXISTENTE (HI2) — confirmado
O `vencedor` derivado localmente em `AppContext.jsx` (l. 697-701) e o `OverlayVencedor` que o
consome (`MercadoLances.jsx` l. 157/195) **existem desde antes deste UTAC** — estão registados como
**DEBT-009** desde o fecho do UTAC000.9 e o validador daquele UTAC confirmou-os por inventário
independente. **Nenhuma linha deste UTAC os introduziu.**

## -1.3 INVENTÁRIO — sítios do vencedor (vencedor derivado dos lances LOCAIS)
Comandos: `grep -rn "menorUnico\|vencedor\|OverlayVencedor\|apurarMenor" src/` (sem testes) + leitura
de cada ocorrência.

| # | sítio | o que faz | estado |
|---|---|---|---|
| 1 | `src/context/AppContext.jsx` l. 697-701 | deriva `vencedor` de `lancesExibidos` (`lancesFlash` ou `lances`, conforme a modalidade) e **expõe-o** (l. 1408) | **DEFEITO — CORRIGIDO (na fonte)** |
| 2 | `src/pages/MercadoLances.jsx` l. 157/195 | destrutura `vencedor` do contexto e passa-o ao `OverlayVencedor` (l. 69) | **DEFEITO — corrigido por ARRASTO** (não precisou de ser tocado) |
| 3 | `src/pages/Dashboard.jsx` l. 91/516 | card + `FimEdicaoOverlay` — já usa o hook do oficial | **JÁ CORRECTO** (UTAC000.9) |
| 4 | `src/components/edicao-especial/PainelVencedorEspecial.jsx` + `useResultadoEspecial.js` | lê `resultados()` on-chain (fonte autoritativa) | **JÁ CORRECTO** (MC94) |
| 5 | `src/pages/DetalheProduto.jsx` l. 39 | destrutura `vencedor` do contexto e **nunca o usa** (usa `produto.vencedor`, do servidor, na l. 268) | **não é sítio de exibição** — variável morta |
| 6 | `src/components/TabelaLances.jsx` | 🏆 da tabela — já usa o hook do oficial | **JÁ CORRECTO** (UTAC000.9) |
| 7 | `src/utils/web3.js` l. 19 | ABI (`resultados(...)` devolve `menorUnico, vencedor, consolidado`) | não é cálculo |

**Sítios ADJACENTES que derivam localmente e NÃO são «vencedor»** (declarados no UTAC000.9 §7.4,
fora da alegação — continuam por declarar, não corrigidos): selos `ÚNICO`/`REPETIDO` do histórico em
`DetalheProduto.jsx` e «menor único **seu**» em `FeedbackLance.jsx`/`MinhaCarteira.jsx`. Não são o
vencedor da edição (são classificação dos lances do próprio utilizador / do histórico).

**Conclusão:** **2 sítios** com o defeito; **1 corrigido na fonte** (#1) e o outro **corrigido por
arrasto** (#2). **Zero resíduos de «vencedor» ficam por corrigir.**

## -1.4 Evidência preservada (HI10/GATE 5)
`_logs/UTAC000.10_SEG-1_EVIDENCIA.txt` — baseline, suíte, inventário com os comandos, TAP dos dois
ficheiros novos, escopo (`git diff --name-only`), md5 e saúde global.

## -1.5 Saúde global (HI1)
Disco OK · suíte **591/591 · 967/973 VERDE** · árvore limpa (só o `package-lock.json` pré-existente)
· nenhum worktree de validação montado neste UTAC.

**⚠️ Achado de infraestrutura (GATE 10 — ESCALADO, não executado):** a limpeza dos «7 worktrees
órfãos» autorizada no spec **não corresponde à medição**: há **12** directórios em
`.claude/worktrees/` (mais 1 em `AppData/Local/Temp/claude/.../scratchpad/wt-94`), **2 deles com
junctions** para o `node_modules` real, **1 com lock** (`agent-a055938a81220e104`, trancado por
`pid 15932`) — esse pid está **morto** (lock obsoleto), mas **há processos `claude-code` vivos**
nesta máquina. Apagar worktrees de uma sessão Claude viva **destrói trabalho em curso**: paro e
escalo em vez de executar (HI8/GATE 10). Opções medidas no relatório §6.

## -1.6 VEREDITO: **SEGUIR**
Correcção mínima de **um ponto** (a fonte), com o consumidor corrigido por arrasto — a mesma
estratégia que o UTAC000.9 usou com o `FimEdicaoOverlay`, validada e aprovada pelo validador
adversarial daquele UTAC. Limpo o resto do escopo (docs, testes, mutação) e escalo apenas a
limpeza dos worktrees, que a medição provou não ser inofensiva.
