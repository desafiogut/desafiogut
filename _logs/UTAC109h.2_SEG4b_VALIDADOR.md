# UTAC109h.2 — SEG4b (2.ª ronda) · VEREDICTO DO VALIDADOR ADVERSARIAL SOBRE A CORRECÇÃO

Validador independente (subagente Hermes, 2.ª ronda). Alvo: commit local `f509e21` — a **CORRECÇÃO** dos achados da 1.ª ronda sobre `11f6416`. Missão: **TENTAR REFUTAR**, não confirmar. Main tree só leitura (nunca `add`/`commit`/`checkout`). Dois worktrees próprios criados e removidos com `scripts/worktree-helper.mjs` (junctions A13): um em `f509e21` (o alvo) e um em `1a41cf7` (o estado pré-109h, para o teste aritmético do `961`). Cópias de trabalho em `%TEMP%/utac109h2-val2/`.

## Veredicto
APROVADO COM RESSALVAS — 0 bloqueantes

Tentei derrubar as 6 alegações da correcção com as técnicas que expuseram o defeito na 1.ª ronda (worktree CRLF real, mutação com baseline, detector próprio, contraste recalculado). **Nenhuma caiu**: as 6 reproduziram por execução minha. As ressalvas são de arrumação/documentação (causa-raiz de EOL não corrigida; o log SEG-1 ainda com redacção sem escopo e por commitar) — não do artefacto nem da guarda.

## Reproduzido por execução (pelo validador)

Cada linha: comando → saída REAL (verbatim, resumida).

1. `git show --stat f509e21` → **exactamente 4 ficheiros**: `.../__tests__/utac109h2-carteira.test.mjs` (+5-2), `components/PainelIndicacao.jsx` (+7), `pages/MinhaCarteira.jsx` (+2), `scripts/utac109h2-prova-mutacao.mjs` (+18) · `4 files changed, 29 insertions(+), 7 deletions(-)`. `git diff --name-status 11f6416 f509e21` → 4× `M`, nenhum outro. `HEAD` = `f509e21` (nada empurrado).
2. **Worktree @ `f509e21` (fonte CRLF real):** `MinhaCarteira.jsx: CR=405 LF=405` · `PainelIndicacao.jsx: CR=270 LF=270` (teste/mutador em LF). ⇒ o checkout limpo entrega `*.jsx` em CRLF, como a 1.ª ronda mediu.
3. `node --test src/__tests__/utac109h2-carteira.test.mjs` no worktree CRLF → `ℹ tests 9 · ℹ pass 9 · ℹ fail 0`. No main tree (LF) → 9/9. ⇒ **F1 fechado** (era 7/9 com 2 falhas em CRLF).
4. `node scripts/utac109h2-prova-mutacao.mjs` no worktree CRLF → `baseline do teste: fail=0` · `M1 2RED M2 2RED M3 2RED M4 2RED M5 1RED M6 1RED M7 1RED M8 2RED M9 1RED M10 1RED` (todos `> baseline 0`) · `restauro MinhaCarteira.jsx: md5 idêntico` · `restauro PainelIndicacao.jsx: md5 idêntico` · `MUTAÇÃO 10/10 PROVADOS` · EXIT=0 · `git status --porcelain` do worktree **VAZIO**. ⇒ **F2 fechado** (M6/M10 já não são vacuosos).
5. **A asserção de baseline MORDE** (teste adversarial meu): acrescentei `test("FALHA DELIBERADA do validador", () => { assert.equal(1, 2); });` ao teste (backup em `%TEMP%`) e corri o mutador → `baseline do teste: fail=1` · `BASELINE VERMELHA — a prova de mutação seria vacuosa; PARAR (correr num worktree/checkout com a guarda verde).` · **EXIT=2**, sem reportar PROVADOS. Restaurei o backup: md5 `f878a501296af708183d27c9601bc7fc` antes **=** depois; `git status` do worktree limpo. ⇒ a guarda **não é decorativa**.
6. `git show f509e21:…/PainelIndicacao.jsx` → cabeçalho: «Saíram o verde-água `#00d4aa`, o gradiente `#0aa37e`, o verde `#10b981` e o `#fbbf24`». `git grep "verde-água \`#f5a623\`" f509e21` → **rc=1 (0 ocorrências)**. ⇒ **F8 fechado** (o blob commitado deixou de ser auto-contraditório).
7. **Detector próprio** (strip de bloco/JSX/`//`, preserva newlines) sobre `frontend/src` — **283 ficheiros visitados** (vitalidade): nas **2 peças** as proibidas em código = **0** e os rgb retirados = **0** (`#f5a623`×7 em MinhaCarteira, ×5 em PainelIndicacao). Repo-wide as cores retiradas continuam **vivas**: `#ff6b35`=18, `#00d4ff`=11, `#00d4aa`=9, `#0aa37e`=2, `#10b981`=35, `#fbbf24`=52, `#a78bfa`=9, `#e89400`=9, `#f97316`=9 (ex.: `glassTokens.js`, `globals.css`, `OfertasProgramadas.jsx`, `ComprarFichasModal.jsx`).
8. **Contraste recalculado por mim** (sRGB→luminância→(L1+0,05)/(L2+0,05)): amarelo/vidro **9,09** · amarelo sobre o tingido `rgba(245,166,35,.14)` sobre vidro (=`#2d262f`) **7,25** · navy `#0a0f1a`/amarelo **9,45** · vermelho `#ef4444`/vidro **4,89** · CONTROLO branco/amarelo **2,03** (reprova). ⇒ reproduz ao centésimo (não confirmei por amostragem de pixéis).
9. **Suíte canónica NO WORKTREE CRLF** — `node scripts/mc966-suite-harness.mjs ambos < /dev/null` da raiz do worktree: `frontend: VERDE 970/970 pass` · `backend: VERDE 1095/1101 pass` · `VEREDITO: VERDE`. ⇒ fecha o limite declarado pela 1.ª ronda («a suíte correu só no main tree») e mostra que **nenhum outro teste** é frágil a EOL.
10. **Aritmética `970 = 961 + 9`:** worktree @ `1a41cf7` (= `93e17ac^`, o estado pré-109h) → `frontend: VERDE 961/961 pass`. ⇒ `961` confirmado; o `+9` é o ficheiro de teste novo (`utac109h2-carteira.test.mjs`, 9 testes).
11. **Nota de ESCOPO nos 2 ficheiros** (blobs `f509e21`): «uma só cor vale para as DUAS peças deste ecrã»; modais (`ComprarPasse`/`ComprarFichas`) e tokens globais (`glassTokens`/`globals.css`) fora do âmbito. Confirmado que as modais **continuam** com as cores retiradas: `ComprarFichasModal.jsx` = `#f5a623`,`#e89400`,`#fbbf24`,`#10b981`,`#a78bfa`, `linear-gradient(135deg,#f5a623,#e89400)`; `ComprarPasseModal.jsx` = `#f5a623`,`#e89400`, idem gradiente.
12. **Arrumação:** `worktree-helper.mjs remover` (×2) → `git worktree remove -> exit 0` + `{"ok": true, "nota": "removido"}`, **sem** `Permission denied`. `frontend/node_modules` = **498 antes e depois**; `frontend/netlify/functions/node_modules` = **414 antes e depois** (junctions não seguidas). `git worktree list` = só o main + 2 órfãos **pré-existentes** de outros executores (P-109h.2-2). Main tree rastreado: só ` M _logs/UTAC109h.2_SEG-1.md` (pré-existente, não meu).

## Achados

| id | ⚠️/ℹ️ | alegação afectada | evidência | tratamento proposto |
|---|---|---|---|---|
| R1 | ℹ️ | 1/2 (raiz do F1) | O fix é **só o leitor** (`ler()` normaliza `\r\n`); o `.gitattributes` de `f509e21` **continua sem** `*.jsx`/`*.tsx`/`*.css text eol=lf`. Um clone limpo entrega `.jsx` CRLF e o teste passou a ser **cego a EOL** (por desenho). Medido: a suíte CRLF dá 970/970 VERDE ⇒ sem impacto hoje. | Aceitar como dívida declarada **ou** acrescentar `*.jsx/.tsx/.css text eol=lf` ao `.gitattributes` (a 2.ª frente do antídoto da skill). Não bloqueia. |
| R2 | ℹ️ | 3/F3 (redacção) | O log `_logs/UTAC109h.2_SEG-1.md` **do commit** ainda afirma (§-1.2, linha 24) «o laranja `#ff6b35` **não existe** em nenhum ponto» — **refutado** repo-wide (18×). A reparação («duas peças / modais fora») só existe na parte **NÃO COMMITADA**. O ponteiro feito a partir do `PainelIndicacao.jsx` («escopo declarado em SEG-1») apoia-se em §-1.4 («0 nos dois ficheiros»), que é escopado — mas o log contradiz-se com a linha 24. | Reparar a linha 24 e commitar a adenda antes do fecho. Não bloqueia (F3 era ℹ️). |
| R3 | ℹ️ | 5 (ficheiros do commit) | Verdadeiro (4 ficheiros), **mas** `_logs/UTAC109h.2_SEG-1.md` está ` M` (modificado, **não commitado**, `git diff --stat HEAD` = `41 insertions(+)`). A adenda que documenta F1/F2/F7/F8 e a prova no worktree **não faz parte de `f509e21`**. | Commitar a adenda no fecho; a alegação 5 fica intacta (o *commit* toca 4). |
| R4 | ℹ️ | 6 (RAM/A14) | O `scripts/mc966-suite-harness.mjs` **não tem** gate de RAM (lido: imprime só `VERDE`/`VERMELHO`/`NAO_MEDI`). O «1 504 MB ≥ 1500 (A14)» do SEG-1 é número **por execução**, não saída de instrumento. Não o reproduzi (não medi RAM). F7 mantém-se. | Reportar a RAM por execução; não a usar como prova. |
| R5 | ℹ️ | 2 (granularidade) | O mutador prova «**algum** teste ficou RED (delta > base)», não «a asserção visada ficou RED»: não verifica *qual* teste caiu. | Nota de rigor; os 10 mutantes são distintos e as deltas (1–2 RED), sem sinal de contaminação cruzada. |
| R6 | ℹ️ | F6 (1.ª ronda) | §-1.3 do log **já declara** «(`#[0-9a-f]{3,8}` / `rgba(...)` / **nomes de cor**)» ⇒ o remédio do F6 («dizer que o detector inclui nomes de cor») **já lá estava**. | Nada a fazer; registo para não reabrir. |
| R7 | ℹ️ | 3 (cosmético) | O cabeçalho do `PainelIndicacao` diz «o gradiente `#0aa37e`», mas o gradiente era `linear-gradient(135deg,#00d4aa,#0aa37e)` — cita só o 2.º stop. | Cosmético. |

## Alegações REFUTADAS

**Nenhuma.** Tentei derrubar as 6 alegações da correcção e todas resistiram (técnicas na secção seguinte). Veredicto sobre a CORRECÇÃO: **0 alegações refutadas**.

Nota de honestidade: a 1.ª ronda refutara F3 («0 no código» sem escopo) e F4 («tom único» sem escopo). O `f509e21` **não torna essas frases verdadeiras** — tornou-as **escopadas** nos 2 ficheiros (R2/R7). Para o efeito desta ronda isso cumpre o que a correcção se propôs (a nota de escopo), pelo que **não as re-refuto aqui**; a redacção do *log* (R2) continua por reparar.

## Alegações que NÃO consegui refutar

Tentativas e resultado:

- **1** (worktree CRLF ⇒ 9/9) — criei o meu worktree no sha, **confirmei CRLF** (CR=405/270) e corri o teste isolado: **9/9**. A tentativa de refutação (procurar falha residual em CRLF) **falhou**.
- **2** (10/10 com baseline 0, não vacuoso) — corri o mutador no worktree CRLF: baseline `fail=0`, 10/10, deltas 1–2 RED. Depois **ataquei o guarda**: teste deliberadamente vermelho ⇒ `BASELINE VERMELHA` + **exit 2**, sem PROVADOS, md5 restaurado, worktree limpo. **Resistiu.**
- **3** (F8 corrigido) — li o blob commitado (`#00d4aa`/`#0aa37e`/`#10b981`/`#fbbf24`); o padrão mutilado dá **0** no corpus do commit. **Resistiu.**
- **4** (nota de ESCOPO nos 2 ficheiros) — presente em ambos; modais/tokens confirmados fora do âmbito (cores retiradas ainda vivas neles). **Resistiu.**
- **5** (exactamente 4 ficheiros) — `--stat` e `--name-status` = 4. **Resistiu** (com a ressalva R3: o log está por commitar).
- **6** (suíte VERDE + invariante de cor única) — suíte canónica **no worktree CRLF** = 970/970 · 1095/1101 · VERDE; `970 = 961 (worktree @1a41cf7) + 9`; detector próprio = 0 proibidas nas 2 peças; contrastes ao centésimo. **Resistiu.**
- **Coerência dos RED vs 1.ª ronda** — a 1.ª ronda mediu `M1 4RED` (worktree CRLF, teste **sem** `ler()`: baseline 2 RED = testes 5 e 8). Eu meço `M1 2RED` (CRLF com `ler()`: baseline 0). Diferença = a baseline contaminada (4 = 2+2). **Sem divergência inexplicada.**
- **Fix criar defeito novo?** — a normalização `\r\n`→`\n` torna o teste cego a EOL: é de **desenho** (a invariante é cor/layout, não EOL), e a suíte CRLF verde mostra que nenhum outro consumidor quebra. Não encontrei defeito novo introduzido pelo fix.

## O que NÃO foi medido

- **Sem medição no browser/render.** Toda a prova (minha e da correcção) é **estática sobre o texto-fonte**. Não vi o écran da Carteira a correr.
- **RAM:** não medi RAM livre; verifiquei apenas que o harness **não** a mede (R4).
- **Mutador no main tree:** não o corri no main tree (regra «só leitura»); corri-o no worktree CRLF, onde a portabilidade é o caso difícil. Como `ler()` é no-op em texto LF, o veredicto do mutador é independente do ambiente.
- **`.gitattributes`:** verifiquei que `*.jsx` **não** está fixado a LF; **não** isolei `.tsx`/`.css` (a suíte CRLF verde sugere que nenhum outro teste sofre, mas não testei cada extensão).
- **Backend 1095/1101** — não investiguei as 6 não-passadas (pré-existentes, fora do UTAC).
- **Os 2 worktrees órfãos** de outros executores (P-109h.2-2) não foram tocados nem validados.
- Não auditei o conteúdo das modais contra o resto do programa de fidelidade (fora do âmbito).

## Decisão

A CORRECÇÃO **fecha o bloqueante** da 1.ª ronda: num worktree limpo com fonte **CRLF** o teste dá **9/9** (era 7/9) e a mutação dá **10/10 com baseline 0** (era vacuosa), e o guarda de baseline **morde** (exit 2) quando o teste está vermelho — os 10/10 são reais (deltas 1–2 RED). O F8 está corrigido no blob, a nota de ESCOPO está nos 2 ficheiros, o commit toca 4 ficheiros, e a suíte canónica está VERDE **no próprio worktree CRLF** (970/970 · 1095/1101), com `970 = 961 + 9` verificado.

Antes do fecho, o executor deve (por ordem):

1. **[Arrumação R2/R3]** Commitar a adenda SEG-1b (hoje ` M`, +41 linhas) **e**, na mesma, reparar o §-1.2 linha 24 («o laranja `#ff6b35` **não existe** em nenhum ponto» → «não existe **nas duas peças do ecrã**»), para que o log deixe de contradizer o seu próprio §-1.4 e o ponteiro feito a partir do `PainelIndicacao.jsx`.
2. **[Dívida declarada R1 — não bloqueante]** Decidir: ou acrescentar `*.jsx text eol=lf` (+`.tsx`/`.css`) ao `.gitattributes` (mata a causa-raiz), ou registrar explicitamente que a guarda ficou EOL-tolerante **no leitor** e que a dívida passa a UTAC próprio.
3. **[R4/R5]** Não usar a RAM como evidência (reportar por execução) e, se se quiser rigor, fazer o mutador asserir **qual** teste caiu, não só o delta.

Nada disto contesta o artefacto: os 2 componentes estão correctos, LF no índice, com uma só cor de destaque nas 2 peças, e as duas frentes do bloqueante (F1/F2) estão fechadas por medição independente.

---
*Veredicto do validador adversarial independente (2.ª ronda) · UTAC109h.2 · commit local `f509e21` (não empurrado) · o veredicto da 1.ª ronda fica intacto em `_logs/UTAC109h.2_SEG4_VALIDADOR.md`.*
