# UTAC110j.4b — Meus Ativos: pontos de lance no lugar do motor MC93 (parte só-UI) + «Produto patrocinado»

Executor: Claude Code (Opus 5.5). Baseline `e995f1c`. **Sem commit/push** (não autorizado).
Diagnóstico e decisões: `_logs/UTAC110j.4b_SEG-1_DIAGNOSTICO.md` (R18-110j.4b-1..8). Backend → `_logs/UTAC110n.spec-HERMES.md`.

## A14 (RAM)
O operador fechou as janelas e autorizou libertar RAM. O fecho dos servidores MCP desta sessão foi **recusado pelo
classificador** (não contornado). Fiz um trim de working sets (`EmptyWorkingSet`, nada fechado), repetido antes de
cada medição: 2 134–2 361 · 1 577–1 647 · 2 160–2 177 MB. ⚠️ No arranque da última corrida da suíte: **1 477 MB**
(ligeiramente abaixo do limiar; resultado VERDE, sem falha inexplicada — declarado).

## Feito
### Frente C — «Prêmio a anunciar» → «Produto patrocinado»
`CartaoEdicao.jsx:83`, `EdicaoCard.jsx:96`. Nome do patrocinador não existe nos dados (medido). Teste novo
`src/components/__tests__/utac110j4-produto-patrocinado.test.mjs` (4). Mutação 2/2.

### Frente B (só-UI) — «⭐ Seus pontos de lance»
- `src/lib/pontosLance.js` (NOVO, puro): leitura estrita do bloco `lance` do `ler-pontos`, ganhos por fonte (só
  deltas positivos; créditos fora; motivo desconhecido → «Outros»), últimos movimentos, dia de Manaus.
- `src/components/meus-ativos/PainelPontosLance.jsx` (NOVO): saldo, ganhos por fonte, últimos 5 movimentos;
  4 estados (sem sessão · a carregar · erro · dados). Copy só diz o que o código faz (os pontos hoje só se ganham).
- `src/pages/MeusAtivos.jsx`: renderiza o painel novo no lugar do `PainelTorneio`; `pontosCarregando` inclui a
  janela do token. `PainelTorneio.jsx`, `EstadoBonus.jsx`, `ProgressoBonus.jsx` **não foram apagados**; o bónus
  (Progresso/Estado) continua a ser mostrado até o backend mudar (UTAC110n).
- `src/hooks/usePontos.js`: **+1 campo `lance`** (aditivo). ⚠️ Extensão de escopo declarada (ficheiro fora da lista
  autorizada; sem ele o painel não tem dados).

### Testes alterados (declarados, invariantes mantidas)
- `MeusAtivos.test.mjs`: alias para o duplo `usePontos`; «painel-torneio» → «pontos-lance» nas listas de secções e
  no teste de ordem (+ asserção de que o painel MC93 saiu); os laços erro/carregando/semSessao do feedback passam a
  valer para as 2 secções do bónus que ficam; saíram as 3 asserções de posição/pontos do painel antigo; o teste
  «a carregar» passou a pôr também os pontos a carregar; +1 describe (6 testes) da cablagem do painel novo.
- `artigosUI.test.mjs`: +`"16": ["pontos de lance", "engajamento"]` (a UI cita o Art. 16º). O guarda continua a
  morder (um «Art. 99º» volta a pô-lo vermelho).
- `_stubs/usePontos.js`: +`lance: null`, `missoesHoje: null` (a forma vazia do real).
### Testes novos
`src/lib/pontosLance.test.mjs` (6) · `src/__tests__/utac110j4b-usepontos-lance.test.mjs` (2, hook REAL).

## Verificação
- Suíte: **frontend 1226/1226 · backend 1351/1357 — VERDE** (baseline 1208/1208 · 1351/1357).
- Mutação **7/7 PROVADOS** (`scripts/utac110j4b-prova-mutacao.mjs`), restauro md5 idêntico + Frente C 2/2.
- 1.ª corrida da suíte VERMELHO 1: o guarda `artigosUI` apanhou o Art. 16º fora do mapa — corrigido acima.
- Não aberto em browser (gate LGPD): prova por SSR + testes.

## Erros/desvios meus (declarados)
- Comecei a implementar a 1.ª versão (errada) do enunciado; trabalho desfeito e arquivado no scratchpad.
- Um comentário meu com «torneio» foi apanhado pelo guarda de vocabulário do 110h.3 (corrigido para «motor MC93»).
- O patch por heredoc falhou uma vez com «º» (stdin cp1252); refeito por ficheiro UTF-8. Verificado: sem mojibake.

## Pendentes / resíduos (fora do escopo)
- Bónus de 5 acertos → pontos de lance, lance a gastar pontos, Passe +200, conversão de créditos (DEBT-071),
  ranking por saldo, Art. 17º → **UTAC110n (Hermes)**.
- `RankingCiclo` continua a mostrar a pontuação MC93; `FeedbackLance` continua a dizer «vale 3 / 1 ponto» (regra
  MC93) — mudam quando o backend mudar.

## SEG4 — validador adversarial: APROVADO COM RESSALVAS, 0 bloqueantes
`_logs/UTAC110j.4b_SEG4_VALIDADOR.md`. Worktree próprio (A13), RAM 1714 MB, suíte 1226/1226 · 1351/1357 VERDE,
7/7 do executor reproduzido; 15 mutantes dele: 14 morrem. **V15** (limite de 5 «Últimos movimentos») sobrevivia →
FECHADO com teste novo em `MeusAtivos.test.mjs` (mutante 5→50 dá RED; restauro md5 idêntico) — **não re-validado**.
⚠️ A1 dois sistemas de «pontos» na mesma página (FeedbackLance «vale 3 pontos», RankingCiclo MC93, bónus «senhas»)
— resíduo declarado, muda com o UTAC110n. ⚠️ A2 os pontos de lance ainda não servem para licitar (backend).
ℹ️ «A mostrar os» em pt-PT no RankingCiclo (pré-existente); +1 pedido ao `/ler-pontos` em Meus Ativos.
