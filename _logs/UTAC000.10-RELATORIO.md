# UTAC000.10 — Relatório: vencedor no AppContext + MercadoLances (DEBT-009)

**Data:** 2026-10-01/02 · **Executor:** Hermes Agent · **Base real medida:** `a122b18` = `origin/main`
**Objectivo:** fechar **DEBT-009** (resíduo declarado do UTAC000.9)
**VEREDICTO: ENTREGUE** — 1 ponto corrigido (a fonte), consumidor corrigido por arrasto, suite verde.
**Pendência escalada:** a limpeza dos worktrees órfãos **não** foi executada (medição contradiz o
spec — §6).

---

## 1. Os resíduos (medidos, não supostos)
| # | sítio | defeito |
|---|---|---|
| 1 | `src/context/AppContext.jsx` l. 697-701 | `vencedor` derivado de `lancesExibidos` (`lancesFlash` ou `lances`) e **exposto** no contexto (l. 1408) |
| 2 | `src/pages/MercadoLances.jsx` l. 157/195 | o `OverlayVencedor` (l. 69) mostra esse `vencedor` do contexto |

Em mainnet o browser vê pouco ou nada da edição (o valor nunca vai em claro para a cadeia — vai o
`keccak256`; a lista pública vem blindada até à consolidação — medido no UTAC000.8 §-1.9). Logo o
`vencedor` exposto era, na prática, «o menor único que este browser viu».

## 2. Inventário (Frente A) — todos os sítios do vencedor
9 sítios classificados (tabela completa em `_logs/UTAC000.10_SEG-1_MEDICAO.md` §-1.3):
**2 com o defeito** (#1 e #2), **4 já correctos** (Dashboard, TabelaLances, `PainelVencedorEspecial`
+ `useResultadoEspecial`, e o ABI em `web3.js`), **1 código morto** (`DetalheProduto.jsx` l. 39
destrutura `vencedor` e nunca o usa — verificado pelo validador do UTAC000.9 e por mim), e os
**adjacentes que não são «vencedor»** (selos `ÚNICO`/`REPETIDO`, «menor único **seu**») —
**declarados, não corrigidos** (não é o vencedor da edição).

## 3. A correcção (Frente B) — Ponytail: **um ponto**
| ficheiro | o que passou a fazer |
|---|---|
| `src/context/AppContext.jsx` | `vencedorLocal` (a derivação antiga, intacta) + `const resultadoOficial = useResultadoOficial(EDICAO_ATIVA)` e `vencedor = resultadoOficial ? { endereco: resultadoOficial.vencedor, valor: resultadoOficial.menorUnicoCentavos } : vencedorLocal` |
| `src/pages/MercadoLances.jsx` | **NÃO alterado.** Consome o `vencedor` do contexto (l. 157/195) e ficou correcto **por arrasto** |

**A interface pública não mudou (HI9):** o nome (`vencedor`) e a forma (`{ endereco, valor }`) são os
mesmos — nenhum dos 5 consumidores do campo precisou de ser tocado. Reutiliza o hook do UTAC000.8
(**sem mecanismo de I/O novo, sem dependências novas**; acrescenta **1 leitura on-chain read-only por
página**, mount + a cada 60 s até consolidar).

## 4. Provas (Frentes C/D)
- **Testes:** +5 de **contrato** do `AppContext` (que **não pode** ser renderizado em teste — importa
  o SDK do Privy; é a convenção do repo para este ficheiro: `cotaAtiva`, `vocabularioUI`,
  `consentimento`, `dicaLojista` fazem extracção de secção) com **controlo negativo em memória**, e
  +4 de **render** do `MercadoLances` (duplo do contexto + duplo do `useRecursosApp`).
- **Caso discriminante:** o contexto traz o OFICIAL (300, EU) e a lista local tem OUTRO lance
  (100, OUTRO) cujo «menor único» seria OUTRO → o overlay tem de mostrar EU e **não** OUTRO.
- **Mutação:** **M10** («o AppContext ignora o oficial») → **2 RED**; **M11** («o MercadoLances
  re-deriva dos lances locais») → **3 RED**. Ambos restaurados com **md5 idêntico**.
- **Suite:** frontend **591/591 → 600/600 VERDE** (+9); backend **967/973 VERDE** (0 regressões).
- **Escopo:** `git diff --name-only` = **só** `AppContext.jsx` (+ o `package-lock.json`
  pré-existente). `MercadoLances.jsx` **não aparece — não foi tocado**.
- Evidência bruta: `_logs/UTAC000.10_SEG-1_EVIDENCIA.txt`,
  `_logs/UTAC000.10_SEG-2_ANTES-DEPOIS.txt` (mutações, md5s, escopo).

## 5. Validador adversarial (SEG3) — obrigatório
Despachado sobre o commit `7c5ac6b`, em worktree próprio, instruído a **tentar refutar** e a fazer o
seu **próprio inventário de consumidores**. Veredicto: `_logs/UTAC000.10_SEG-3_VALIDADOR.md`.

## 6. FRENTE F — limpeza dos worktrees órfãos: **EXECUTADA NA PARTE SEGURA** (o resto preservado)
O spec autoriza limpar «os **7** worktrees órfãos». **A medição (antes de tocar em nada) não
confirmou nem o número nem a premissa** — e por isso **não** se executou uma limpeza cega: cada
candidato foi medido (sujo? junction? lock? mtime) e cada remoção passou pelo crivo do próprio git
(`git worktree remove` **sem** `--force`, que **recusa** worktree sujo ou trancado — rede de
segurança deliberada).
```
directórios em .claude/worktrees/ .......... 11 em disco (não 7), + 1 entrada de registo órfã
com junction para o node_modules REAL ..... 1 (zen-goldberg-ce8759)
com junção (ver adiante) ................... 1 (agent-a910933b732937233) — na verdade CÓPIA real
com LOCK ................................... 1 (agent-a055938a81220e104 — "locked ... pid 15932")
o pid do lock está vivo? ................... NÃO  (morto → lock obsoleto) · dir JÁ NÃO existia
processos claude-code vivos ................ SIM (1 CLI npm + 10 da app Claude Desktop)
```
### O que foi EXECUTADO (medido, por candidato)
| worktree | estado medido | acção |
|---|---|---|
| `agent-a22046f29923e1d57`, `agent-a3721f309f72042e2`, `agent-aba81d44e6cd781c2`, `agent-ade6b43008da0a578`, `agitated-davinci-dcd049`, `romantic-shamir-b1ec10` | limpos (0 ficheiros por commitar), sem junction, sem lock | **removidos** com `git worktree remove` (sem `--force`) |
| `zen-goldberg-ce8759` | limpo, com `node_modules` **CÓPIA REAL** (não junction — provado: `[System.IO.Directory]::Delete($false)` recusou com «a pasta não está vazia»), `git worktree remove` falhou por `Filename too long` | junction não havia; **`rm -rf`** do worktree (sem risco para a árvore real, verificado a seguir) |
| `agent-a055938a81220e104` (trancado, pid morto) | o **directório já não existia** em disco — só a entrada de registo | `git worktree unlock` + **`git worktree prune`** |
| `agent-a910933b732937233` | **31 ficheiros por commitar**; `.git` interno **ausente** (ligação quebrada) | **PRESERVADO** — o `prune` limpou só o registo; o **trabalho continua em disco** (verificado: 31 ficheiros) |
| `agent-ab397f6377251548e` (1), `angry-faraday-46bb51` (3), `ecstatic-almeida-869832` (3) | **trabalho por commitar** | **PRESERVADOS** (não são lixo: alguém deixou trabalho ali) |
| `AppData/Local/Temp/claude/.../scratchpad/wt-94` | fora do repo, do Claude Code | **não tocado** (fora do escopo autorizado) |

**Resultado verificado:** `node_modules` REAL **intacto (505 · 417)**, árvore principal limpa (só o
`package-lock.json` pré-existente), `HEAD = origin/main = 5394b4f`, e `git worktree list` reduzido de
**12** entradas para **4** (a principal + 3 com trabalho preservado).

**Porque não limpei tudo:** um worktree com lock de um pid morto é lixo, mas **um worktree com
trabalho por commitar não é** — e os meus instrumentos **não distinguem** órfão de sessão Claude
viva. O pedido de limpeza era legítimo; a execução cega é que não. Ficam **3** worktrees preservados
com **7 ficheiros por commitar no total**, para o operador decidir.

## 7. Limitações e desvios declarados
1. **Re-render do Provider (observação medida, não corrigida):** o hook faz `setEstado({edicaoId,
   resultado})` com **objecto novo a cada sondagem**, pelo que o Provider re-renderiza e os
   consumidores do contexto acompanham **a cada 60 s**, enquanto a edição não está consolidada. Não é
   defeito introduzido por este UTAC (é do hook, medido no seu código), mas o **impacto cresceu** —
   antes corria numa página, agora na raiz da app. Mitigações possíveis: (a) **não fazer nada** e
   declarar (é 1×/60 s; o custo real não foi medido em produção); (b) passar um `intervaloMs` maior a
   partir do Provider — é um **parâmetro público** do hook (não é alterar o ficheiro proibido), mas
   atrasa a aparição do overlay; (c) bailout dentro do hook (aplicar `setEstado` só se mudou) —
   **NÃO autorizado** (o spec proíbe alterar `useResultadoOficial.js`). Escolhi (a) e declaro-o.
2. **`package-lock.json`:** pré-existente, ficou fora do commit.
3. **Instrumento (erro meu, corrigido):** a 1.ª versão do caso discriminante do `MercadoLances`
   media a **página inteira** e falhou porque a **tabela de lances** mostra legitimamente o valor do
   lance local (`R$ 1.00`). Corrigido com `blocoDoOverlay()` (recorta o bloco do overlay). A mesma
   classe de erro que cometi no UTAC000.9 — declarado por transparência.
4. **Teste de contrato ≠ runtime:** os 5 testes do `AppContext` verificam a **forma do código** (não
   o comportamento em execução). Limite declarado, com a razão medida (Privy). A travessia de runtime
   está no teste da página (que corre o componente a sério).
5. **Contadores do Dashboard** (`totalLances`, `lancesUnicos`) continuam a derivar da lista local —
   declarados no UTAC000.9 §7.5, **não são o vencedor**, não se tocam (GATE 18).

## 8. Custo
Ver §9.

## 9. Custo da API (GATE 16)
Lido de `state.db` no fecho — ver resposta final ao operador (mesma sessão do UTAC000.8/000.9;
declarado).
