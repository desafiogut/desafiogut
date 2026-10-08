# UTAC108e.1 — Implementar MLC B + OP A + corrigir 108d + 3 pendências (Claude Code, Opus 5.5)

**Fecho:** 2026-10-08 · **Baseline:** `abfb476` (= origin/main) · **Commits:** `46e536a` (feat) → `546f0c2` (achados do validador) → registo.
**Suíte:** baseline 885/885 · 1095/1101 → **909/909 · 1095/1101 VERDE** · `vite build` OK · lint OK.
**Deploy:** push = auto-deploy. Entry `index-BwrYbmL7.js` → **`index-Dn0gx2pr.js`**; arte md5 `30f3e240…` → `5a555caa…`.

## Baseline (SEG-1)
HEAD = origin/main = `abfb476` (o esperado). Mockups lidos: `Desktop/MOCKUPS-APROVADOS-107a/mlc-op-v2/` (`mlc.html` painel B, `op.html` painel A, `v2.css`, capturas `mobile/`). Código lido: MercadoLances, OfertasProgramadas, GlassHeader, CardLance, TabelaLances, glassTokens, SemEdicaoAviso, ModeSelector. Disco 9,7 GB livres.

## SEG0 — Decisões do operador (R18, AskUserQuestion no arranque)
| # | Decisão | Valor |
|---|---|---|
| 1 | MLC | **B · Produto em destaque** (já confirmado) |
| 2 | OP | **A · Família** |
| 3 | Dourado | **#f5a623** (vs #ff9500) — a pergunta nomeava `glassTokens.js / globals.css` |
| 4 | Seletor de modo | **Fixar Relâmpago** |
| 5 | Air Fryer «PAGA» | **Sim, mudar** → «OFERTA» |

## SEG1 — MLC B
- Novo `src/components/CartaoEdicao.jsx` (declarado: reutilizado MLC+OP). Casco: topo (id + estado) → produto (arte + nome) → tempo → **acção (`children`)**. `destaque` = variante B (arte largura toda, 1:1 telemóvel / 16:9 desktop, faixa com nome + tempo); compacto = OP A (arte 64 px + GUTO + tempo).
- MLC: cabeçalho (GlassHeader) com título «Menor Lance Único» + frase + selo «⚡ Relâmpago»; cartão da edição com o `CardLance` real dentro; tabela no fim.

## SEG2 — OP A
Cabeçalho com selo «🎫 Programadas»; vidro dos pontos («Seus pontos», «faltam N», «X / 50 pontos», barra, Histórico em `<details>` 48 px); cartão Quildo + resgate no mesmo vidro; intro «🎫 Edições programadas»; carrossel com o **mesmo** `CartaoEdicao`; Regras; tabela «Palpites» **sempre** no fim.

## SEG3 — Correcção do 108d
`SemEdicaoAviso` saiu do MLC. Sem edição (`EM_BREVE_MODE`) o **cartão fica**, vazio: GUTO + «Nenhuma edição em andamento» + «Volte quando houver» (`role="status"`) + lance **desligado** (campo + botão `disabled`; o `CardLance` não monta). Idem na OP (palpite desligado). «Sem saldo» (108c) intacto: só com edição.

## SEG4 — Pendências
1. **Dourado:** `glassTokens.js` gold `#ff9500`→`#f5a623`; `globals.css` `--color-gut-gold` (+dim) → `#f5a623` (token sem consumidores). Por achado do guarda novo: `TabelaLances.jsx` 5× `#fbbf24`→`#f5a623` (só cor, extensão «só se necessário» declarada) e o botão da vista de conformidade do MLC (gradiente → `COR.gold`).
2. **Seletor:** `ModeSelector` saiu do GlassHeader; o único setter da `modalidade` na UI era ele ⇒ fica no valor inicial `"flash"` (`AppContext useState("flash")`).
3. **Air Fryer:** `public/artes/edicao-especial-airfryer.jpg` editada com PIL (determinística, sem custo): apagadas só as 4 componentes ligadas das letras «PAGA» (scipy `ndimage.label`), «OFERTA» em Impact prateado inclinado. «Quanto você» e «por esta» intactos (o 1.º polígono mordia «você» — trocado pelo método por componentes). Script no scratchpad da sessão.

## SEG5 — Testes + mutação
Novo `src/pages/__tests__/utac108e1-mlc-op.test.mjs` (20). Actualizados (contrato mudou, declarado): `utac108d-mlc-sempre` (aviso solto → cartão vazio), `utac108c-mlc-aviso`, `utac107d-mlc`, `utac106f-ofertas` (+2 render, +T2/T3; «sem campo» → campo desligado).
**Mutação 13/13 mortos**, restauro md5-idêntico: aviso solto de volta, arte fora do cartão, #ff9500, seletor de volta, OP com cartão próprio, tabela da OP condicional, arte com «PAGA», CardLance fora do cartão, + os 4 sobreviventes do validador (V-M2/M5/M6/M10) e #fbbf24 na tabela.

## SEG6 — Verificação
Browser local (vite :3000, chrome-devtools, contexto isolado; gate aceite só no localStorage de teste) a 375 e 1024: MLC vazio = mockup B; OP vazia = mockup A. **Dois defeitos meus achados e corrigidos:** 27 px de overflow lateral na OP (nome `nowrap` alargava a grelha → `minWidth: 0` no cartão) e a frase vazia cortada («em and…» → quebra de linha). Após: `scrollWidth = clientWidth` nas duas abas. O estado **com edição** não é visível hoje (EM_BREVE ligado) — coberto por testes.

## SEG7 — Validador adversarial
Veredicto verbatim: `_logs/UTAC108e.1_SEG7_VALIDADOR.md`. **APROVADO (com ressalvas; 0 bloqueantes)**; (h) parcial. Parou a meio por limite de sessão e foi retomado.
- **Fechados:** T1–T4 (4 mutantes sobreviventes → todos RED), R4 parte (dourados #fbbf24 na tabela e #e89400 na conformidade).
- **Declarados, não corrigidos:**
  - **R1** com edição a faixa mostra «Ativa» em vez de contagem (o MLC não tem relógio vivo desde o MC66) — invisível com EM_BREVE; tratar antes de o desligar.
  - **R2** sem edição a tabela diz «Lances — Edição R-1 · 🕒 Em breve» (TabelaLances; mockup diz «Lances»).
  - **R3** com edição, `CardLance` (Card próprio) fica cartão-dentro-de-cartão e não compacto — CardLance proibido.
  - **R4 resto** `#e89400` no botão do `CardLance.jsx:595` (proibido) e `#fbbf24` nos overlays do MLC (não abrem hoje).
  - Órfãos: `ModeSelector.jsx`, `SemEdicaoAviso.jsx` (não apagados). Ramo «programado» do 108c.1 inalcançável no MLC.
  - «OFERTA» em fonte condensada, diferente do pincel itálico (cosmético).

## SEG8 — Deploy + registo
Push `abfb476..546f0c2` (só os 2 commits do UTAC). Site 200; entry nova; crawl de 134 chunks: `CartaoEdicao-*`, `MercadoLances-*` (lance-desativado, ⚡ Relâmpago), `OfertasProgramadas-*` (🎫 Programadas, palpite-desativado); 0 ocorrências de `"sem-edicao"`, `#ff9500`, «Modo:». `package-lock.json` não sujo.

## Escopo
Backend, `_lib`, CardLance, SemSaldoBanner, `EM_BREVE_MODE` (continua `true`), 5 `.bak-*`, package* — intactos. Extensões declaradas: `globals.css` (dourado), `TabelaLances.jsx` (só cor), `CartaoEdicao.jsx` (novo).

## Custo (¢/1M tokens; Opus 5.5: 400 in · 2000 out · 20 cache)
Validador 577 331 tokens = 11,5–1155 ¢ (231 ¢ se tudo input). Sessão principal não medida (`/cost`). Duração ≈ 1 h 50 (dentro do HI5 de 3 h), sem contar a pausa do limite de sessão.
