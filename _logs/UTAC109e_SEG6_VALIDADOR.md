# UTAC109e — SEG6 Validador adversarial independente

Worktree: C:\Users\Moltbot\tmp-109e-val\wt @ dcf8460 (baseline 2e40488). Worktree restaurado: `git status --short` vazio; md5 dos 5 ficheiros mutados = OK (md5sum -c).

## VEREDICTO: APROVADO (com ressalvas ⚠️ não-bloqueantes)

Nenhuma das 10 alíneas (a)–(j) se confirmou. 14 mutantes próprios: 8 mortos, 6 sobrevivem. Os sobreviventes são lacunas de teste, não defeitos: o código actual está correcto nesses pontos.

## Alíneas

| # | Tentativa de refutação | Resultado | Prova |
|---|---|---|---|
| a | MLC e OP não usam o mesmo cartão | NÃO refutado | MLC: `<CartaoEdicao vazio acao="lance" …/>` + `<CartaoEdicao acao="lance" …>`; OP: `<CartaoEdicao vazio acao="palpite" …/>` + `<CartaoEdicao id={ed.id} acao="palpite" …>`. O CartaoEdicao.jsx novo tem um só ramo de render (sem `destaque`). O teste «formato IDÊNTICO» compara o HTML com/sem edição tirando só os textos da acção. |
| b | botão da OP diz «Dar lance» | NÃO refutado | OP: `{aPalpitar ? "Enviando…" : ACOES.palpite.botao}` = «Dar palpite»; vazio → `<button disabled>Dar palpite</button>`. `grep "Dar lance\|centavos\|Lance Rel" OfertasProgramadas.jsx` → vazio. |
| c | botão da MLC diz «Dar palpite» | NÃO refutado | `grep palpite\|Palpit MercadoLances.jsx CardLance.jsx` → 0. CardLance:358 `: "Dar lance";`, label 427 «Seu lance (em centavos)». |
| d | input da OP com «(em centavos)» | NÃO refutado | OP label `{ACOES.palpite.rotulo}` = «Seu palpite (nº de lances)»; o vazio usa o mesmo par. |
| e | GUTO 7 com edição activa | NÃO refutado | O CarrosselGUTO só existe no ramo `vazio ?`. Testes SSR (cartão, OP, Início) exigem a ausência de `guto-animado-7`/`guto-7.png` com edição; o mutante V13/M3 morre. |
| f | GUTO 7 ausente sem edições | NÃO refutado | SSR do vazio: `data-testid="guto-animado-7"` → `<img src="/assets/guto/carrossel/guto-7.png?v=mc60">` (poster antes da 1.ª pintura). Com 1 slide o `<video>` tem `loop`; o `handleTimeUpdate` sai cedo quando n<=1, por isso não há crossfade partido. |
| g | outro ecrã quebrou (Carteira/Início/MLC/OP) | NÃO refutado | A suíte inteira está verde; MinhaCarteira.jsx não foi tocado; o Início só perdeu props mortas e passou de «Palpitar» para «Dar palpite». O carrossel do topo continua com `slides = SLIDES` (8). |
| h | backend alterado | NÃO refutado | `git diff --name-only 2e40488..dcf8460 \| grep -Ei "netlify/\|package"` → vazio. |
| i | `.bak-*` tocado | NÃO refutado | o mesmo grep para `\.bak-` → vazio; os 5 `.bak-*` versionados estão fora do diff. EM_BREVE_MODE aparece só como linha de contexto. |
| j | suíte canónica vermelha | NÃO refutado | `node scripts/mc966-suite-harness.mjs ambos` → frontend VERDE 933/933, backend VERDE 1095/1101, VEREDITO: VERDE. |

Âmbito: 11 ficheiros, todos autorizados. O CardLance tem numstat 1/1 (só a linha R18-B). O CarrosselGUTO só mudou `const SLIDES` → `export const SLIDES`.

## Mutantes próprios (scratchpad/val-mut.mjs; cada um corre 6 ficheiros: cartao-unico, 106f-ofertas, 108e1-mlc-op, Dashboard, 109d-carrossel, 109d1-carrossel-play)

| id | mutação | resultado |
|---|---|---|
| V1 | wrapper do carrossel antes da pintura sem `aria-hidden` | SOBREVIVE ⚠️ |
| V2 | `<video>` sem `loop` (o GUTO 7, com 1 slide, pára ao fim de 5–10 s) | SOBREVIVE ⚠️ |
| V3 | GUTO_ANIMADO_7 com 2 slides | morto (cartao-unico) |
| V4 | formato 1:1/16:9 invertido | morto (108e1) |
| V5 | vazio sem `role="status"` | SOBREVIVE ℹ️ (lacuna anterior ao UTAC) |
| V6 | OP com edição `acao="lance"` | morto |
| V7 | cache-bust mc60→mc59 | morto (109d-carrossel) |
| V8 | carrossel do topo com 7 vídeos (`SLIDES.slice(0,7)`) | SOBREVIVE ⚠️ (a alegação «topo não alterado» não tem guarda) |
| V9 | OP `tempo={est.timer}` (a OP encerrada perde «Edição encerrada») | SOBREVIVE ⚠️ |
| V10 | vidro Programada do Início nunca vazio | morto (Dashboard) |
| V11 | GUTO 7 `size={0}` | SOBREVIVE ℹ️ (a regex `size=\{[^}]+\}` aceita qualquer valor) |
| V12 | botão desligado sem `disabled` | morto |
| V13 | AcaoDesativada também com edição | morto |
| V14 | MLC com edição sem `acao` | morto |

## Achados

- ⛔ nenhum.
- ⚠️ **Lacunas de teste (V1, V2, V8, V9).** O código actual está correcto nos quatro pontos, mas nenhum teste os guarda. V2 é o mais relevante: o GUTO 7 depende de `loop` por ter um só slide. V1 é a acessibilidade do GUTO decorativo; o código tem `aria-hidden="true"` nos 4 ramos do carrossel e no `<video>`.
- ⚠️ **Informação «Encerrada» na OP.** A variante compacta mostrava o rótulo «Encerrada»/«Termina em» + tempo. Agora a OP encerrada mostra `est.rotuloLongo` = «Edição encerrada» na faixa (o tempo não se perdeu). Com palpite registado a pílula diz «COM PALPITE», não «ENCERRADA», e por isso «Edição encerrada» na faixa passa a ser o único sinal. Nenhum teste o guarda (V9).
- ⚠️ **(não medido: o browser do chrome-devtools estava ocupado)** A OP aberta passa `rotuloLongo` = «Em andamento — lance já!» (24 caracteres, Orbitron 1.15rem, `flex: none`) para a faixa por baixo da arte. A 375 px estima-se ~380 px contra ~311 px úteis: o nome do produto fica espremido a 0 e o texto é cortado pelo `overflow:hidden`. O vidro Programada do Início já tinha este padrão antes do UTAC; agora estende-se à aba OP. Além disso, a copy «lance já!» no cartão do palpite contradiz a regra «a única diferença é a acção». Recomenda-se uma medição visual a 375 px.
- ℹ️ O vazio da OP perdeu a frase «Sem edições programadas no momento. Volte quando houver.» (a asserção foi removida). Fica o genérico «Nenhuma edição em andamento» / «Volte quando houver».
- ℹ️ O vidro Programada vazio do Início não passa `acao`, logo não mostra o formulário desligado (diferente da aba OP). Fora do escopo alegado.
- ℹ️ Custo: cada cartão vazio monta 1 `<video preload="auto">` do guto-7.webm. No Início com o vidro Programada vazio isto soma-se aos 2 vídeos do carrossel do topo. Só monta depois da 1.ª pintura (useAposPrimeiraPintura), sem risco de CLS (caixa de tamanho fixo).
- ℹ️ A regex do cache-bust no teste novo é `?v=mc\d+`, que aceita mc59; quem prende mc60 é o 109d-carrossel (V7 morto).
- ℹ️ O index.html continua a pré-carregar guto-bemvindo.png. É válido: o TermosConsentimento ainda o usa.
- ℹ️ Testes vácuos / satisfeitos por comentários: o teste novo tira comentários (`codigo()`) antes das asserções de fonte, e as asserções de render são SSR reais. Não encontrei asserções vácuas. Mesmo assim, as asserções de cablagem por regex de fonte são frágeis: `acao={"palpite"}` falharia sem ser um defeito.
