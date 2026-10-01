# UTAC000.9 — SEG-1 · Medição, inventário e veredito — 2026-10-01/02

**Objectivo:** fechar **DEBT-008** (o vencedor do **Dashboard** derivava dos lances locais — o
mesmo defeito da DEBT-007, noutro sítio).
**Veredito do SEG-1: SEGUIR** — o defeito é pré-existente, está localizado, e a correcção é
mínima (reutiliza o `useResultadoOficial.js` do UTAC000.8, já em produção).

## -1.1 Estado MEDIDO (antes de tocar em código)
| item | medido |
|---|---|
| `git rev-parse HEAD` | **`e19306e`** = `origin/main` (como o spec declara) |
| suíte frontend | **VERDE 579/579** |
| suíte backend | **VERDE 967/973** (0 fail, 6 skipped) |
| árvore | limpa excepto `desafio-gut/frontend/package-lock.json` (**pré-existente**, de fora do commit) |
| evidência bruta | `_logs/UTAC000.9_SEG-1_EVIDENCIA.txt` (harness + resumos TAP + inventário + md5 ANTES) |

## -1.2 É PRÉ-EXISTENTE (HI2) — confirmado
O `vencedor` do contexto (`AppContext.jsx` l. 697-700) existe desde antes deste UTAC e é a
**mesma classe de defeito** que o UTAC000.8 fechou nas `MeusAtivos` (DEBT-007): derivação local
de um valor que o browser não consegue conhecer (em mainnet o valor do lance nunca vai em claro
para a cadeia e a lista pública vem blindada — medido e documentado no UTAC000.8, §-1.9 da
medição daquele UTAC). **Nenhuma linha deste UTAC o introduziu.**

## -1.3 INVENTÁRIO — todos os sítios onde o vencedor é calculado a partir dos lances locais
Comando: `grep -rn "vencedor\|menorUnico\|apurarMenor\|Menor Lance\|Menor e" src/` (+ leitura de
cada ocorrência). Resultado, por ficheiro:

| # | sítio | o que faz | estado |
|---|---|---|---|
| 1 | `src/context/AppContext.jsx` l. 697-700 | `vencedor = [...lancesExibidos].filter(!repetido).sort(valor)[0]` — **a derivação local**, exposta no contexto (l. 1392) | **DEFEITO** — fora do escopo autorizado |
| 2 | `src/pages/Dashboard.jsx` l. 391-405 + l. 499-500 | card «🏆 Menor Lance Único» (endereço + valor) e o `vencedor` que passa ao `FimEdicaoOverlay` | **DEFEITO** — **corrigido neste UTAC** |
| 3 | `src/components/FimEdicaoOverlay.jsx` | mostra `{endereco, valor}` do vencedor que **recebe por prop** | **DEFEITO indirecto** — corrigido **sem o tocar**: o Dashboard passa a dar-lhe o oficial, e a forma é a mesma |
| 4 | `src/components/TabelaLances.jsx` l. 51/161/268 | `idxVencedor = findIndex(!repetido)` → o 🏆 da tabela de lances (usada pelo `MercadoLances`) | **DEFEITO** — **corrigido neste UTAC** |
| 5 | `src/pages/MercadoLances.jsx` l. 69-73, 157, 195 | `OverlayVencedor` recebe o `vencedor` **do contexto** e mostra-o no fim da rodada | **DEFEITO** — fora do escopo autorizado |
| 6 | `src/components/edicao-especial/PainelVencedorEspecial.jsx` | lê o resultado **oficial** por props (`useResultadoEspecial` → `resultados()`) | **JÁ CORRECTO** (MC94) — não se toca |
| 7 | `src/pages/DetalheProduto.jsx` l. 39 | destrutura `vencedor` do contexto mas **usa `produto.vencedor`** (do servidor) na l. 268 | **não é sítio de defeito** — variável do contexto **morta** ali (medido) |
| 8 | `src/pages/MeusAtivos.jsx` | 🏆 e «Menor Lance» **já** usam o `useResultadoOficial` (UTAC000.8) | **JÁ CORRECTO** — explicitamente fora do escopo |
| 9 | `src/i18n/pt.js` (`dash.menorLanceUnico`) | só a etiqueta | não é cálculo |

**Resumo:** 4 sítios com o defeito (#1, #2, #4, #5; #3 por arrasto do #2); **2 corrigidos** dentro
do escopo (#2 → arrasta #3, #4); **2 fora do escopo** (#1, #5) ⇒ declarados e escalados (GATE 10),
não corrigidos por falta de autorização.

## -1.4 Evidência preservada (HI10/GATE 5)
`_logs/UTAC000.9_SEG-1_EVIDENCIA.txt` — veredicto do harness, resumos TAP das duas suítes, o
inventário com os comandos e o `md5` de cada ficheiro em jogo **antes** de qualquer alteração.
Desvio declarado: guardei os **resumos** TAP (não o TAP integral) — o mesmo limite já declarado
no UTAC000.8 (I1).

## -1.5 Saúde global (HI1)
Disco OK · suíte **579/579 · 967/973 VERDE** · árvore limpa (só o `package-lock.json`
pré-existente) · nenhum processo de fundo · o worktree do validador do UTAC000.8 continua montado
em `C:/Users/Moltbot/tmp-utac0008-val/fe` (**declarado**: não o removi porque o `cmd //c rmdir`
das junctions é manglado pelo MSYS e a alternativa arriscava o `node_modules` real — receita
segura registada no relatório do UTAC000.8).

## -1.6 VEREDITO: **SEGUIR**
Defeito pré-existente, localizado, com correcção mínima disponível (reutilizar o hook do
UTAC000.8 — zero código novo de I/O, zero dependências novas). Os dois sítios **fora do escopo**
(#1 e #5) são declarados e escalados ao operador ao mesmo tempo que a correcção é entregue
(GATE 10 + GATE 19: inventariar todos, corrigir os do escopo, declarar os que ficam).
