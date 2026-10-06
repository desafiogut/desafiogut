# UTAC107d — Menor Lance Único: alinhamento, frase, rótulo, tabela

**Tipo:** produto (frontend) · **Skill:** `utac` · **Data:** 2026-10-06 · **Modelo:** claude-opus-5-5 (Claude Code) ·
**Baseline:** `cc77fd3` (= `origin/main`) · **Frentes:** 1 (MLC).

> **Estado: PARADO no SEG0** (Ressalva 3 + 3 conflitos). Nada alterado no código.
> ⤷ *Superado:* respondido pelo operador (R18-A..D) → **FECHADO** (ver §SEG9). A linha acima fica à vista (GATE 15).

---

## §Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| Arranque | 2026-10-06 05:00 | `date` |
| `HEAD` / `origin/main` | `cc77fd3` (iguais); sujeira tracked **0** | `git rev-parse`, `git status` |
| Disco | 11 GB livres | `df -h /c` |
| Suíte | **frontend 783/783 · backend 1061/1067 VERDE** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` |
| Deploy vivo | 200, entry `index-DtERdRDD.js` (auto-deploy do push de `cc77fd3`; o deploy CLI do 107c servia `index-CTjgmNWO.js`) | `curl` |

## §SEG0 — Medição

### Envelope do vidro superior (`ficheiro:linha`)

| | contentor exterior (mobile / desktop) | vidro | padding interno do vidro |
|---|---|---|---|
| **MLC** | `GlassHeader.jsx:17` → `1rem 1rem 0` / `1.5rem 2rem 0`; **acima dele** a frase solta `MercadoLances.jsx:305-313` (`0.85rem 1rem 0` / `1rem 2rem 0`, fora de vidro) | `GlassCard as="header"` (r14) | secções `p-4` / **`px-8 py-5`** (32/20 px) — `GlassHeader.jsx:21` |
| **Carteira** | `MinhaCarteira.jsx:102,123` → `1rem` / **`2rem`** | `GlassCard` (r14) | `cardCls` `p-4` / `p-5` (16/20 px) — `:106` |
| **Início** | `Dashboard.jsx:230` → `1rem` / **`1.25rem`** | `motion.header .gut-glass-standard` (r14) | `1.25rem 1rem` / `1.5rem` — `:252` |

- **Mobile:** os três têm `1rem` de lado ⇒ o vidro do MLC já bate em largura; o desvio é o **topo** (a frase solta empurra o vidro
  para baixo) e o padding interno (`p-4` igual).
- **Desktop:** o lado do MLC (`2rem`) = Carteira; **Carteira (2rem) e Início (1.25rem) divergem entre si** ⇒ não há «um» valor de referência.
  Padding interno: MLC `px-8` (32 px) vs 20 px nos outros. `main` do MLC: `1rem` / `1.5rem 2rem` (`MercadoLances.jsx:344`). Raio: **r14 em todos**.

### Frase
`MercadoLances.jsx:234` — `FRASE_MENOR_LANCE_UNICO = "Quanto você oferta por esse item? O menor lance único leva!"` (o enunciado diz «…passa»;
o texto real termina em «leva!»). Render em `:305-313`, **fora de vidro**. Testes que a fixam: `utac106b-navegacao-frases.test.mjs` (lista `AUTORIZADAS`).

### Mockup `docs/mockups-107a/menor-lance-unico.html` (variante A, aprovada — R18-H)
3 vidros: **título «Menor Lance Único» + frase «Ganha o menor lance que ninguém repetir.»** · edição + lance (rótulo **só para leitor de ecrã**
`Valor do lance em reais`, placeholder **«R$ 0,01»**, `inputmode="decimal"`) · tabela 3 colunas (#, Participante, Valor; 🔒 até ao fecho).

### Campo do lance — `CardLance.jsx:421-436`
Já tem rótulo **visível** «Valor do lance (em centavos)» (`<label>` sem `htmlFor`), `type="number"`, **valor em CENTAVOS**
(`sanitizeLance(valor)` `:142`; pré-visualização `parseInt(valor)/100` `:299`), placeholder «Ex: 5 = R$ 0,05», **sem `inputMode`**.
`CardLance` é usado também em `Dashboard.jsx:353` (slot da edição especial — Início, 107c fechado).

### Tabela — `TabelaLances`
**Já existe no MLC**: `MercadoLances.jsx:368` (coluna direita no desktop; depois do lance no mobile). Vidro próprio
`rgba(10,16,42,.6)` + **`backdrop-filter: blur(20px)`** + r12 (`TabelaLances.jsx:348-350`) e colunas extra («ID do Lance» `:277`, Estado) —
diverge do padrão da Regra 2 (`.tabela-especial`: 0,88 · r14 · sem blur · 3 colunas).

### ⚠️ Conflitos (R20/AU3 — não resolvidos pelo executor)
1. **Ressalva 3 accionada:** o mockup aprovado mostra **outra frase** («Ganha o menor lance que ninguém repetir.», dentro do vidro do título).
   Remover só, ou substituir pela do mockup?
2. **Alinhamento desktop:** Carteira (`2rem`) e Início (`1.25rem`) divergem. Qual é a referência?
3. **Rótulo/placeholder:** «O teu lance (R$)» + «0,01» + `inputMode="decimal"` pressupõe valor em **reais**; o campo hoje recebe **centavos**
   (digitar «1» = R$ 0,01). Mudar só o texto faria o utilizador licitar 100× menos do que pensa. Opções: (a) mudar a unidade para reais
   (conversão no `CardLance`, que também serve o Início/especial); (b) manter centavos e só ligar o rótulo existente (`htmlFor`).
   E «O teu» é pt-PT — o app é pt-BR («Seu lance (R$)»).
4. **Tabela:** já existe. «No fim» = movê-la para largura total depois do lance? E o vidro/colunas da Regra 2 (sem blur, 3 colunas) entram aqui?

**Veredito SEG0: PARAR** — aguarda o operador.

### Respostas do operador (R18, 2026-10-06 — 3 lugares: aqui, R14, relatório)
- **R18-A (frase):** sai «Quanto você oferta…» e entra a do mockup **«Ganha o menor lance que ninguém repetir.»**, dentro de vidro.
- **R18-B (alinhamento):** referência = **Carteira** (lado `2rem` desktop / `1rem` mobile; padding interno 20 px). O padding interno vive em
  `components/glass/GlassHeader.jsx` (**usado SÓ pelo MLC** — medido por grep) ⇒ alteração **declarada** como parte da R18-B.
- **R18-C (rótulo):** o campo **mantém CENTAVOS**; rótulo visível **«Seu lance (em centavos)»** (pt-BR), ligado ao campo (`htmlFor`);
  placeholder «Ex: 5 = R$ 0,05» e pré-visualização em R$ mantêm-se. Nada de «(R$)»/«0,01» (evita licitar 100× menos do que se pensa).
- **R18-D (tabela):** **mockup completo** — tabela no fim (largura total, último vidro), vidro da Regra 2 (0,88 · r14 · sem blur) e
  **3 colunas** (#, Participante, Valor): saem «ID do Lance» e «Estado».

**Veredito: AJUSTAR → respondido → SEGUIR.**


---

## §SEG1–SEG5 — Aplicado (commit `46e21b5`)

| Segmento | O que mudou | Onde |
|---|---|---|
| SEG1 envelope (R18-B) | contentor `1rem 1rem 0` / **`2rem 2rem 0`** (topo desktop era 1.5rem); secções desktop `px-8` → **`px-5`** (20 px); mobile secção 2 `px-3` → **`px-4`** (16 px, ressalva V4) | `components/glass/GlassHeader.jsx` (**só o MLC o usa** — grep) |
| SEG2 frase (R18-A) | `<p>` solto fora de vidro removido; constante = **«Ganha o menor lance que ninguém repetir.»**, passada ao `GlassHeader` (`frase`) e desenhada DENTRO do vidro, acima do «EM BREVE»; cor preservada (`COR.gold` do `glassTokens` = `#ff9500`, a mesma de antes) | `MercadoLances.jsx`, `GlassHeader.jsx` |
| SEG3 rótulo (R18-C) | «Valor do lance (em centavos)» (solto) → **«Seu lance (em centavos)»** ligado por `htmlFor`/`useId`; `inputMode="numeric"`; placeholder «Ex: 5 = R$ 0,05» e pré-visualização R$ mantidos; unidade = centavos. ⚠️ também visível no slot da especial do Início (`Dashboard.jsx:353` usa o `CardLance`) — só muda o texto | `CardLance.jsx` |
| SEG4 tabela (R18-D) | grelha `1fr 1.6fr` → **`1fr`**; tabela no fim (último vidro); vidro = classe **`.gut-glass-standard`** (saiu o `blur(20px)` + r12); **3 colunas** (#, Participante, Valor) — saíram «Status (Art. 24)»/selos, «ID do Lance», txHash e o rodapé «Dados sanitizados · Art. 25» | `MercadoLances.jsx`, `TabelaLances.jsx` |
| SEG5 Regra 1 | todos os textos do corpo dentro de vidro (teste de render com detector de pilha de tags + controlo positivo). Contraste sobre o vidro: `#ff9500` 8,36 · `#f5a623` 9,07 · `#6b7db8` 4,60 · `#e8f0fe` 16,05 · `#fbbf24` 11,02. **Resíduo declarado:** `LanceStatusBadge.jsx` (vidro próprio com `backdrop-blur-sm`) — fora do AUTORIZA | — |

## §SEG6 — Testes + mutação

| Ficheiro | Alteração (declarada) |
|---|---|
| `src/pages/__tests__/utac107d-mlc.test.mjs` | **novo** — 9 testes (página renderizada a sério: frase antiga ausente, frase nova 1× dentro de vidro, Regra 1 em todo o corpo, tabela último bloco, 3 colunas, vidro padrão; envelope e rótulo pela fonte sem comentários) |
| `src/__tests__/utac106b-navegacao-frases.test.mjs` | invariante «menor + único» (`regraInteira`); render = `frase={…}` + `{frase}`; frase do mockup entra em `AUTORIZADAS` |
| `src/__tests__/utac106c-carteira.test.mjs` | copy decidida passa à do mockup; mantém «nunca paga», verbo «ganha», menor + «ninguém repetir» |
| `src/components/__tests__/utac0009-tabela-vencedor.test.mjs` | instrumento lê a **linha** (`<tr>`) com 🏆 (o selo «Menor e Único» saiu); `trofeus` 2 → 1; controlo «Blindado» → 2 linhas desenhadas |
| `src/components/__tests__/citacoesRegulamento.test.mjs` | `TabelaLances`: sem citação obrigatória (rodapé removido); mantém a guarda contra «Art. 26: apuração» |

Suíte **792/792 · 1061/1067 VERDE** (783 + 9). `vite build` OK. ESLint limpo nos 4 ficheiros. **Mutação 9/9 RED** (frase antiga, frase fora de vidro,
sem `htmlFor`, rótulo «(R$)», 2 colunas, tabela removida, blur de volta, `px-8`, coluna Status de volta), restauro sha256 idêntico.

⚠️ **Erros dos meus instrumentos (declarados):**
1. O controlo positivo da verificação de escopo voltou a não morder (o mesmo `sed` do 107c) — refeito com lista explícita.
2. Um recorte de HTML começava a meio da tag `<section` (regex não casava) — sondado e corrigido.
3. A 1.ª versão da tabela **imitava** o vidro com estilo inline em vez de usar a classe — o detector apanhou-o; passou a `.gut-glass-standard`.
4. Cheguei a trocar a cor da frase para `#f5a623` julgando-a «original» — medido: a página também usa `COR` do `glassTokens` (`#ff9500`); revertido.
5. A 1.ª tentativa de escrever este registo por heredoc foi rejeitada pelo shell (nada escrito; confirmado) — refeito por ficheiro.

## §SEG7 — Verificação ad-hoc
Escopo (só os 9 ficheiros permitidos; controlo positivo FAIL ao tirar `TabelaLances` da lista) · backend/`_lib` intactos · 5 `.bak-*` intactos ·
App.jsx, AppContext, package*, Carteira, Início, BottomNav, Sidebar, `LanceStatusBadge`, OP intactos · `EM_BREVE_MODE = true` · CLAUDE.md 2×0x00 + 2×0x1F.

## §SEG8 — Validador
**APROVADO COM RESSALVAS** — verbatim e tratamento em **`_logs/UTAC107d_SEG8_VALIDADOR.md`**. V3/V4 corrigidos (`0f1b317`, não re-validados);
⚠️ V1 (perda do estado por linha) declarado como decisão de produto da R18-D; ⚠️ **V2 escalado**: o mockup diz «🏆 só com o resultado oficial», o código mantém o
🏆 do apuramento local sem oficial (UTAC000.9). Worktree removido (A13; `node_modules` 498 · 414).

## §SEG9 — Deploy + registo

| Item | Medido |
|---|---|
| Comando | `npx netlify deploy --prod` (raiz), **foreground**, 05:31:05 → 05:35:29, `Deploy is live!` |
| Deploy único | `https://6ac4b1f7c480915c08774d71--silly-stardust-ca71bc.netlify.app` |
| Produção | home **200** · health **200** · entry `index-DtERdRDD.js` → **`index-0Ua5yTN9.js`** |
| Chunk do MLC | `MercadoLances-BzsBE-zI.js` → **`MercadoLances-DNDUvu_w.js`** (`application/javascript`) |
| Literais (antes → depois) | «Quanto você oferta» 1→**0** · «Ganha o menor lance» 0→**1** · «ID do Lance» 1→**0** · «Status (Art. 24)» 1→**0** · `blur(20px)` 2→**0** · `tabela-fim` 0→**1** · `gut-glass-standard` 0→**1** |
| Chunk do CardLance | `CardLance-DjZZ8WaF.js`: «Seu lance (em centavos)» **1** · «Valor do lance (em centavos)» **0** |

`package-lock.json` sujo pelo build → arquivado no scratchpad e **restaurado**; suíte re-corrida depois do deploy: **VERDE 792/792 · 1061/1067**.

**Commits:** `46e21b5` (código) → `0f1b317` (ressalvas V3/V4) → registo.
**Custo:** USD **não medido** (Claude Code sem `state.db`); validador ≈ **115 k tokens**. **Duração:** 05:00 → ~05:40 ≈ **40 min** (HI5 2 h — dentro).

**Veredito final: FECHADO** (V3/V4 não re-validados; V2 escalado).
