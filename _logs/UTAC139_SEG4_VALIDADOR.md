# UTAC139 — SEG4 · VEREDICTO DO VALIDADOR ADVERSARIAL

⚠️ **Nota de registo (limite declarado):** este ficheiro foi **transcrito pelo executor** a partir do resumo final
do subagente validador. O validador **esgotou o orçamento de iterações antes de gravar** o seu próprio
`C:\Users\Moltbot\_validador-utac139\VEREDICTO.md` (declarou-o ele próprio na primeira linha do resumo).
O conteúdo abaixo é o dele, **verbatim**; nada foi acrescentado ou corrigido por mim. Nenhum ficheiro do repo
foi alterado por ele (verificado: `git status --porcelain` do repo sem alterações novas).

Contexto: subagente independente, contexto próprio, instruído a **REFUTAR** a alegação «o layout customizado/
transparente já foi substituído pelo cartão padrão e a especial aparece no Início e no Menor Lance Único».
Duração 946,6 s · fim por `max_iterations`.

---

## ⚠️ Entrega incompleta: `VEREDICTO.md` NÃO foi gravado

Atingi o limite de iterações antes de escrever `C:\Users\Moltbot\_validador-utac139\VEREDICTO.md`. Todo o trabalho de medição está feito; o conteúdo do veredicto segue abaixo, pronto a gravar. Nenhum ficheiro do repo foi alterado.

---

# VEREDICTO — APROVADO COM RESSALVAS · 0 bloqueantes

## Reproduzido por execução

| # | Medição | Comando/ferramenta | Saída real |
|---|---|---|---|
| 1 | API de edições | `curl .../.netlify/functions/edicoes` | `HTTP 200 bytes=1682`; `agora=2026-11-18T06:09:09Z`; `agendadas: ESPECIAL-RELAMPAGO1` (`inicio_em 2026-11-30T22:00Z`, `termino 23:00Z`, `status agendado`, arte Supabase `especial-relampago-1.jpg`) |
| 2 | DOM Início | `browser_console` | `{estado:"agendada", edicao:"ESPECIAL-RELAMPAGO1", temGlass:true, bg:"rgba(13, 18, 53, 0.88)", backdrop:"none", opacidade:"1", objectFit:"cover", aspect:"16 / 9", cssW:928, cssH:522, natural:"1254x1254", tempo:"12d 15:48:41"}` |
| 3 | DOM /mercado | idem | mesmo cartão, `904x509`, `tempo:"12d 15:45"`, `formsNoCartao:0`, `artesNaPagina:1`, `produtoOcorrencias:1`, título da tabela «Lances — Edição ESPECIAL-RELAMPAGO1» |
| 4 | Invólucro sem transparência | idem | `wrapperBg:"rgba(0, 0, 0, 0)"`, `wrapperOp:"1"`, `wrapperFilter:"none"`, `wrapperBackdrop:"none"` |
| 5 | Arte byte-idêntica | `sha256sum` + PIL | ambos `1a3c474a333a2c6c7f6c8dd2629f13c0ceea829ab281dd21ed62edcd70d79699`, 478740 B, `1254x1254` |
| 6 | Testes do módulo | `node --test src/components/edicao-especial/__tests__/*.test.mjs` | `pass 64 / fail 0` |
| 7 | Páginas | `node --test Dashboard.test.mjs` · `utac108e1-mlc-op.test.mjs` | `54/54` · `24/24` |
| 8 | Suíte inteira | `node scripts/mc966-suite-harness.mjs frontend` | `frontend: VERMELHO 2 falha(s)` → `tests 1346 / pass 1344 / fail 2`, ambas `mc9952-seguranca-gate.test.mjs` com `AssertionError: exemplo.com foi BLOQUEADO` (ambiente DNS, esperado) |
| 9 | Código | `git show cb2748f` | `CardEdicaoEspecial.jsx +149/-…`; removidos `EdicaoBanner`, `GutoSpritePlayer`, `ContagemDecrescente`, `const caixa = … rgba(245,166,35,0.07)`, `ROTULO` |
| 10 | Recorte real da arte (desktop) | PIL, s=max(928/1254,522/1254) | janela visível `y 274–980 de 1254` → **56,2 % visível, 43,8 % cortado**; crop gravado em `_validador-utac139/crop-16x9-visible.jpg` + `arte-esp.jpg` |

## Achados

| # | Severidade | Achado | Tratamento proposto |
|---|---|---|---|
| 1 | ⚠️ grave (visual) | A arte é **1:1 (1254×1254)** e o cartão mostra **16:9 com `objectFit:"cover"`** → **43,8 % da arte desaparece**. No recorte exacto medido, perdeu-se o título **«EDIÇÃO ESPECIAL 1»**, o troféu, a data cortada a meio («17 a 30 de novembro/2026» ilegível), o logótipo **DesafioGUT** e o GUTO. Sobrevive só «QUANTO VOCÊ PAGA POR ESTA FRITADEIRA…» + produto + «O MENOR LANCE ÚNICO GANHA!». **Não é regressão da especial** — `public/artes/edicao-especial-airfryer.jpg` também é 1254×1254, logo atinge todas as edições — mas desmente o «arte grande» do briefing. | `CartaoEdicao.jsx:84` — quando a arte for 1:1 usar `formato = "1 / 1"` (ou `objectFit:"contain"` com fundo navy), ou exigir arte 16:9 no upload. Repetir no telemóvel (`formato = isMobile ? "1 / 1" : "16 / 9"`, linha 84). |
| 2 | ℹ️ nota | **«Sem estilos órfãos relevantes» é literalmente falso.** `ContagemDecrescente.jsx` não é montado em lado nenhum (`grep "<ContagemDecrescente"` → 0), mas é importado por testes; `caixa` continua re-exportado em `_estilo-especial.js:15` sem um único consumidor; `janelaEmBrasilia` (`:198`) com 0 consumidores; 5 chaves i18n (`sincronizando`, `dias`, `horas`, `min`, `seg`) só servem o componente morto. | Apagar `ContagemDecrescente.jsx`, a linha 15 (manter `COR`, `T_PADRAO`, `encurtar`, `reais`, `inteiroSeguro`), `janelaEmBrasilia` e as 5 chaves; ajustar os 3 testes que referenciam o componente morto. |
| 3 | ℹ️ nota | **A especial «agendada» não tem acção nenhuma.** No Início, `renderLance` só é chamado em `estado === ACTIVA` (`CardEdicaoEspecial.jsx:121-123`) → o cartão mede **636 px com `botoes:0, inputs:0, links:0`**. Uma edição normal mostra sempre «⚡ Dar lance». É coerente (não se licita antes de abrir) mas o «padrão igual» fica com uma zona vazia. | Aceitável; se se quiser paridade visual, passar um `BotaoDarLance encerrada` desactivado no estado `agendada`. |
| 4 | ℹ️ nota | Comentários históricos contraditórios em `CardEdicaoEspecial.jsx:10-39`, incluindo a frase partida `// (histórico) desenhado` / `// para viver DENTRO do slot "🎯 Edição Ativa"` deixada pelo rewrite, e as linhas 6/19/81 a falar de «caixa amarela» e «GUTO ao lado do cronómetro». | Limpar 10-39 para um único parágrafo histórico. |
| 5 | ℹ️ nota | O cartão só é visível **depois de aceitar o gate de termos** (`gut_consentimento` v3.5). Tive de injectar o consentimento para medir. Não é bug, mas qualquer validação futura por browser precisa deste passo. | Documentar no guião de validação. |

## Alegações REFUTADAS
- **«sem estilos órfãos relevantes»** — refutada na letra: 1 ficheiro morto (`ContagemDecrescente.jsx`), 2 exports mortos (`caixa`, `janelaEmBrasilia`), 5 chaves i18n mortas. Sem impacto visual.
- **«com a arte grande»** — refutada em parte: a arte ocupa a largura toda, mas **44 % dela é cortada** (título da edição, data, troféu, logótipo e GUTO fora do enquadramento) — medido no recorte exacto, não por leitura.

## Não consegui refutar
- **Layout próprio/transparência/caixa amarela:** `CardEdicaoEspecial.jsx:128-143` devolve apenas `<div data-slot="edicao-especial">` + `<CartaoEdicao>`; `caixa`/`ROTULO` só sobrevivem em comentários. `cb2748f` (Opus 5.5, 2026-11-18 01:35) é o commit que **remove** o layout transparente (`rgba(245,166,35,0.07)`, GUTO, cronómetro grande, `janelaEmBrasilia`).
- **Transparência em produção:** `.gut-glass-standard` → `rgba(13,18,53,0.88)`, `backdrop-filter none`, `opacity 1`; o `<div>` invólucro é totalmente transparente mas sem fundo nem filtro (neutro). Confirmado no Início **e** em /mercado.
- **Visibilidade nas duas páginas:** presente com `data-edicao="ESPECIAL-RELAMPAGO1"` nas duas. `escolherEspecial` (`_estilo-especial.js:151`) lê `edicoes` **e** `agendadas`, o regex `/^ESPECIAL-[A-Z0-9]+$/` aceita o id real (dígitos permitidos), `dentroDaRetencao` só corta 24 h após o fim (fim em 2026-11-30).
- **Nenhum filtro bloqueia a especial** em `Dashboard.jsx:223-225` nem `MercadoLances.jsx:282-284`. O único filtro (`Dashboard.jsx:231`, `!ehEspecial`) exclui-a **de propósito** do vidro «🎫 Programada» para não aparecer duas vezes.
- **Cronómetro** conta para o INÍCIO (`alvoDaContagem` → `inicio_em` em `agendada`), coerente com o badge «🕒 Em breve» e com o estado `agendado` da API.
- **Arte byte-idêntica** ao `EDICAO ESPECIAL.jpeg` do Desktop (mesmo sha256, 478740 B).
- **Distorção do cartão:** não há — `objectFit:"cover"` + `aspectRatio` fixo nunca estica; o problema é corte, não distorção.

## Confronto briefing ↔ repo
O briefing diz que o executor «criou um layout customizado e transparente». O repo **desmente no HEAD `fd770db`**: o mesmo autor (Opus 5.5) assinou `cb2748f` precisamente para o **desmontar**. A frase do briefing descreve um estado **anterior** a `cb2748f` (MC94.2/94.3.1) ou outro trabalho — não o estado actual.

## O que não medi
- Estados `activa` / `encerrada` em produção (a edição só abre a 2026-11-30) — o formulário e o painel do vencedor só estão provados por testes.
- Telemóvel real / viewport < 768 px (onde `formato = "1 / 1"` e o corte é diferente).
- APK/WebView, e os 2 fallos de DNS (confirmados como ambiente: `exemplo.com foi BLOQUEADO`).

## Decisão
**APROVADO COM RESSALVAS — 0 bloqueantes.** O problema do briefing (layout transparente próprio, invisibilidade no Início/MLC) **já não existe**: medido no código e no DOM de produção. Fica 1 defeito visual ⚠️ (44 % da arte cortada, incluindo o título «EDIÇÃO ESPECIAL 1» e o logótipo) e 4 notas de limpeza.

---

**Ficheiros criados fora do repo:** `C:\Users\Moltbot\_validador-utac139\arte-esp.jpg`, `crop-16x9-visible.jpg`. **Falta:** `VEREDICTO.md` (conteúdo acima).