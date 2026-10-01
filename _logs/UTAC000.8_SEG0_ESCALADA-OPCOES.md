# UTAC000.8 — SEG0 · ESCALADA AO OPERADOR (GATE 11) — 2026-10-01

**Estado:** **PARADO** antes de escrever qualquer linha de produção.
**Porquê:** a Frente A tal como especificada (endpoint com `getLanceDadoEvents` + `getBlocoAtual`)
**não serve a produção** — medido, não suposto. E a alternativa que serviria exige **revelar valores
blindados**, o que é **decisão de produto** (o spec não autoriza) e **quebra o MC28.1 R9 / G-2**.
**Base:** `_logs/UTAC000.8_SEG-1_MEDICAO.md` §-1.9 (M1-M10) · `_logs/UTAC000.8_SEG-1_EVIDENCIA.txt`.

---

## 1. O que está provado (produção, leitura pública)
1. A produção corre em **mainnet** (`/lances-flash` devolve `ocultoAteConsolidar:true` — campo que só
   existe no ramo mainnet).
2. Em mainnet **o valor real nunca vai para a cadeia** (vai o `keccak256` do lance) → os eventos
   on-chain são `LanceComprometido` (hash), **não** `LanceDado` (valor).
3. Em mainnet **o Blob do relâmpago nunca é escrito** — tudo vai para o **Key-Per-Bid**
   (`bid:{edicao}:{endereco}:{sufixo}`). Resultado medido: `/lances-flash?edicaoId=R-1` →
   `{"lances":[]}`. **A lista que o utilizador vê está vazia.**
4. O **vencedor oficial** é apurado **fora da cadeia**, exactamente a partir desse Key-Per-Bid
   (`apurarMenorUnico(getLances(edicaoId))`, `_lib/consolidacao.mjs`). É a **única fonte de verdade**
   com valores.
5. Durante o leilão esses valores são **blindados de propósito** (anti-bot): a lista pública devolve
   `valor:null, repetido:null` e a verificação de unicidade dá **403**.

Conclusão dura: **o 🏆 só pode ser honesto com informação que, por desenho, não existe no browser
antes da consolidação.** Durante o leilão o que é honesto mostrar é «a decorrer / N participações».

## 2. Porque NÃO implementei a Frente A do spec
| razão | medição |
|---|---|
| Não há valores nos eventos on-chain em produção | M6 |
| Não há `fromBlock` honesto (não existe bloco de arranque da edição no repo) | M10 |
| Paginação de 10 blocos/query (limite documentado) × edição de ~24 h ⇒ inviável | M10 |
| A cadeia **não** decide o vencedor — quem decide é o Key-Per-Bid (off-chain) | M7 |
| Um endpoint que devolva os valores em claro durante o leilão quebra MC28.1 R9/G-2 e é decisão de produto | M8 |

## 3. OPÇÕES (medidas; nenhuma toca contrato, GUTO, Passe, Concurso, 75 regras ou o `_render`/`_ponte-ssr`)

### Opção 1 — Histórico de PARTICIPAÇÕES + resultado oficial no fecho *(recomendada)*
- **Backend (~45 min):** novo `netlify/functions/lances-onchain.mjs` (GET `?edicaoId=`), que lê
  `getLances(edicaoId)` pela **fachada `data-store.mjs`** (não fala com o Blob/Supabase directamente —
  mantém o anti-split-brain R11) e devolve a lista **ofuscada** em mainnet
  (`endereco`, `nomeExibicao`, `commitmentHash`, `txHash=lanceId`, `valor:null`, `oculto:true`,
  `repetido:null`) + contagem; e, quando `resultados(edicaoId).consolidado === true` (já no ABI),
  devolve também o **resultado oficial** (`menorUnico`, `vencedor`).
- **Frontend (~60 min):** carga inicial no `AppContext` (espelhando o padrão do `lancesFlash`,
  l. 757-776) e, em `MeusAtivos.jsx`/Dashboard, o 🏆 e o cartão «Menor Lance» passam a ler o
  **resultado oficial** quando existe; **durante o leilão** mostram «a decorrer» com o número de
  participações (nunca um valor — que seria inventado).
- **Testes + mutação (~45 min):** endpoint (lista completa, inclui lances de outros, ofuscação em
  mainnet), carga inicial no contexto, e mutação que repõe o defeito → RED.
- **Custo total: ~2,5-3 h.** **Muda o visível:** hoje a lista está vazia; depois mostra as
  participações (sem valores). O 🏆 deixa de poder mostrar um valor antes do fecho.
- **Risco:** baixo (só leitura; zero alteração de contrato).

### Opção 2 — Mínimo absoluto: só o resultado oficial pós-consolidação
- Lê `resultados(edicaoId)` on-chain (já no ABI) e corrige 🏆 / «Menor Lance» / `vencedor` do Dashboard
  para o valor **oficial** depois do fecho. Durante o leilão fica «—» (como hoje).
- **Custo: ~1 h.** **Não resolve** o histórico durante o leilão — a lista continua vazia. Honesto e
  sem exposição nova, mas deixa a DEBT-007 meio aberta.

### Opção 3 — Revelar os valores durante o leilão (o que a DEBT-007 pedia à letra)
- **Não recomendo.** Quebra MC28.1 R9/G-2 (anti-bot: quem vir a lista fica a saber exactamente qual
  o menor valor único e cobre-o), exige alterar regras de produto/75 regras — **fora do autorizado**.
  Só com decisão explícita do operador e novo UTAC.

### Opção 4 — Não implementar agora
- Manter a DEBT-007 **aberta**, com o diagnóstico corrigido (já registado) e re-escopar o UTAC000.9
  para a Opção 1 ou 2.

## 4. O que fica feito nesta sessão (mesmo parando)
- Baseline reconfirmado e **evidência bruta arquivada** (HI10).
- Diagnóstico da DEBT-007 **corrigido por medição de produção**; as conclusões refutadas do SEG-1
  ficam **à vista** e marcadas (P2/GATE 14).
- Erros dos meus próprios instrumentos declarados (§-1.11 da medição).
- **Zero código de produção tocado** (confirmável por `git status`: só `_logs/`, `CLAUDE.md` e o
  relatório do Desktop).

## 5. Pergunta ao operador
Qual das opções autorizo? (1, 2, 3 ou 4.) Se for 1 ou 2, confirmo também se posso **commit + push em
foreground** no fim — as alterações ficam em `_logs/`/`CLAUDE.md` (docs) + o endpoint + o contexto.

## 6. Resolução desta sessão (registada no fecho)
A pergunta foi feita (com as 4 opções) e o **operador não respondeu dentro do prazo**. Decisão do
executor, pelo protocolo (**GATE 11 + «NÃO AUTORIZA tomar decisões de produto» + commit só «após
autorização»**): **não implementar nada e não commitar nada.** Estado entregue:
- diagnóstico corrigido, opções medidas e evidência bruta **no disco** (3 lugares);
- **zero código de produção alterado**;
- ficheiros **não commitados** — para commitar quando o operador decidir:
  `CLAUDE.md`, `_logs/DEBT.md`, `_logs/UTAC000.8-RELATORIO.md`, `_logs/UTAC000.8_SEG-1_MEDICAO.md`
  (modificados) + `_logs/UTAC000.8_SEG-1_EVIDENCIA.txt`, `_logs/UTAC000.8_SEG0_ESCALADA-OPCOES.md`,
  `_logs/utac0008-evidencia.sh` (novos), + `Desktop/UTAC000.8-RELATORIO.md` (fora do repo).
  **Nunca `git add -A`** — cada ficheiro à mão.
- DEBT-007 **aberta**; o UTAC fecha como **PARADO/ESCALADO** (como no fecho da 1.ª sessão).

