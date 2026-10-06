# UTAC107e — Ofertas Programadas + privacidade de valores + 3 estados do lance + V2

**Tipo:** produto (frontend + backend declarado) · **Skill:** `utac` · **Data:** 2026-10-06 · **Modelo:** claude-opus-5-5 (Claude Code) ·
**Baseline:** `eab760d` (= `origin/main`) · **Frentes:** 4 (+ custo).

> **Estado: PARADO no SEG0** — conflitos com decisões de segurança já em produção (R20/AU3). Nada alterado.

---

## §Baseline (SEG-1)

| Item | Medido |
|---|---|
| Arranque | 2026-10-06 07:01 |
| `HEAD` / `origin/main` | `eab760d` (iguais); sujeira tracked **0** |
| Suíte | **frontend 792/792 · backend 1061/1067 VERDE** (`mc966-suite-harness.mjs ambos`) |
| Deploy vivo | 200 |
| `EM_BREVE_MODE` | `true` (nenhuma edição corre hoje) |

### Componentes partilhados (consumidores medidos por grep)
- `CardLance.jsx` → `MercadoLances.jsx:348` (MLC) e `Dashboard.jsx:353` (slot da especial do Início). **Não é usado na OP.**
- `TabelaLances.jsx` → só `MercadoLances.jsx`.
- `useLanceFeedback.js` (estado do PRÓPRIO lance: `unico`/`repetido`/`mudou`, polling 5 s) → só `MercadoLances.jsx`.

## §SEG0 — Medição backend (privacidade)

| Endpoint | O que devolve | Fonte |
|---|---|---|
| `GET /lances-flash?edicaoId=` (**mainnet** = produção) | **sem valor nunca** — `valor:null, oculto:true, repetido:null`, `ocultoAteConsolidar:true`, **mesmo depois do fecho** (não há ramo de revelação) | `lances-flash.mjs:82-97` |
| idem, Sepolia/local | valores em claro + `repetido`, em tempo real | `:99-115` |
| `GET /lances-flash?acao=verificar&valor=` (unicidade de UM valor) | **mainnet → 403 `verificacao_indisponivel`** «blindada durante o leilão (anti-bot)» | `:36-42` (MC28.1 R9 / G-2) |
| Lances reais em mainnet | vivem no Key-Per-Bid (`bids`), não no blob que o `lances-flash` lê ⇒ em produção a tabela vem **vazia** | UTAC000.8 (registo no CLAUDE.md) |
| Palpites de uma edição (de todos) | **não existe endpoint**; `GET /ler-pontos` devolve só os do titular | `ler-pontos.mjs` |
| Lances de uma edição Programada | **não existe endpoint** (achado E-1 do 107a-front) | mockup `ofertas-programadas.html` |

**Conclusão SEG0:** a produção **já esconde** os valores durante a edição (e esconde também depois — não há revelação). A Frente B, em produção,
é **construir a revelação após o fecho** (ler o Key-Per-Bid depois da consolidação), não esconder.

### V2 — onde o 🏆 vem do apuramento local
`TabelaLances.jsx:70` (`findIndex(!repetido)` sem oficial) · `MeusAtivos.jsx:93` (`menorUnicoLocal` sem oficial) · `AppContext.jsx:707-723`
(`vencedorLocal` → `FimEdicaoOverlay`/`OverlayVencedor`, hoje não abrem por causa do `EM_BREVE_MODE`).

### Mockup OP (variante A)
Título em vidro · pontos 12/50 + histórico em `<details>` · cartão Quildo · **carrossel de edições Programadas com o palpite dentro (5 estados)** ·
**tabela «Lances — Edição PROG-1»** no fim (o enunciado pede «Palpites — Edição <id>» com coluna Palpite) · link das Regras como botão de 48 px dentro de vidro.

### Custo (Frente E) — medido
A skill `mc-driven-projects` existe em `~/AppData/Local/hermes/skills/productivity/mc-driven-projects/` (skill do Hermes). Em Claude Code eu **não
tenho acesso aos tokens da sessão principal** (o operador vê-os com `/cost`); os dos subagentes são reportados ao fecho de cada um.

### ⚠️ Conflitos (R20/AU3 — não resolvidos pelo executor)
1. **Frente C × anti-bot (MC28.1 R9 / G-2):** a etiqueta «SEU LANCE É O MENOR LANCE ÚNICO» em tempo real exige comparar com os valores dos outros
   durante a edição — a produção recusa isso de propósito (403). Dar o estado ao próprio deixa qualquer pessoa (ou bot) dar vários lances e
   descobrir quais valores estão livres; e contradiz a Frente B. Na OP, o alvo do palpite (nº de lances) só existe no fecho ⇒ verde/vermelho
   «conforme mais próximo» não é calculável durante a edição.
2. **Frente B:** em produção falta a REVELAÇÃO após o fecho (backend novo sobre o Key-Per-Bid). É trabalho de backend próprio.
3. **Tabela da OP:** mockup = «Lances — Edição PROG-1»; enunciado = «Palpites — Edição <id>». Nenhuma das duas tem endpoint.
4. **V2:** dois dos três sítios (`MeusAtivos.jsx`, `AppContext.jsx`) estão fora do AUTORIZA.
5. **Orçamento:** 4 frentes + 2 endpoints novos não cabem em 2 h (Ressalva 11 já prevê a divisão).

**Veredito SEG0: PARAR** — aguarda o operador.

### Respostas do operador (R18, 2026-10-06 — 3 lugares: aqui, R14, relatório)
- **R18-A (etiqueta):** **só depois do fecho** — mantém-se o anti-bot MC28.1 (sem estado em tempo real durante a edição).
- **R18-B (âmbito):** **dividir** (Ressalva 11): **107e.1 = OP + V2 (este UTAC)**; **107e.2 = privacidade (revelação após o fecho) + etiqueta**.
- **R18-C (tabela da OP):** **só estrutura, sem endpoint** — a tabela aparece no fim com estado vazio; os dados ligam-se num UTAC próprio.
  Título escolhido: «Palpites — Edição <id>» (enunciado; na Via B a OP tem palpites, não lances) — declarado.
- **R18-D (V2):** **os 3 sítios** — `TabelaLances.jsx` + extensão declarada a `MeusAtivos.jsx` e `AppContext.jsx` (só a derivação do vencedor local).

**Veredito: AJUSTAR → respondido → SEGUIR como UTAC107e.1.**


---

> ⤷ *Superado:* o «PARADO no SEG0» do topo foi respondido (R18-A..D) → **UTAC107e.1 FECHADO** (abaixo). A linha fica à vista (GATE 15).

## §SEG1–SEG3 — Ofertas Programadas (commit `6c0436c` + `23a4bae`)
- Título em **vidro** (era `<header>` solto) com o subtítulo do mockup «Junte 50 pontos e troque pelo cartão da Família Quildo».
- **Carrossel** «🎫 Edições programadas»: título em vidro + rolagem lateral (estrutura das «Outras Edições» do Início: flex · overflowX auto ·
  snap x mandatory · itens `0 0 100%`), **1 GlassCard por edição Programada** (abertas primeiro): id · estado · 🎁 prémio · tempo (fonte única).
- **Palpite dentro do cartão**, 6 estados (os 5 do mockup + `abre_em_breve`, achado V1): sem palpite (rótulo ligado + campo + «Palpitar», 48 px) ·
  com palpite («Resultado no fim da edição.») · mais próximo («🎯 +2 pontos!») · não foi dessa vez · encerrada · abre em breve. Copy do **mockup**, não do
  enunciado: o backend premeia o **mais próximo** (`apurar-palpite`), «Acertou!» seria falso (E-2). Secção «Palpite» separada **removida**.
- `usePalpite.registar(valor, edicaoId)` — extensão declarada (só a OP usa o hook); erro mostrado só no cartão que falhou.
- **Regras Oficiais** como botão de 48 px dentro de vidro (era link de ≈ 13 px fora de vidro).
- **Tabela «Palpites — Edição <id>»** no fim (R18-C, só estrutura): `.gut-glass-standard`, #/Participante/Palpite, «Ainda não há palpites.».
- Resíduo pt-PT pré-existente fora das secções tocadas (pontos, cartão, histórico, vazio) — declarado.

## §SEG6 — V2 (🏆 só com resultado oficial) — R18-D, 3 sítios
`TabelaLances.jsx` (`idxVencedor = -1` sem oficial; desktop e mobile) · `MeusAtivos.jsx` (`menorUnico = null`; o cartão «Menor Lance» mantém o VALOR local) ·
`AppContext.jsx` (só `vencedor = oficial ? {...} : null`; a derivação `vencedorLocal` saiu). **Impacto declarado:** muda o contrato do UTAC000.8/9/10/15 e do
UTAC105c — testes actualizados para «sem oficial ⇒ nenhum 🏆» (com o comprimento verificado, não `.every` sobre lista vazia, e controlos de linhas desenhadas).
Pendência ⚠️ V2 do validador → **107e.2**: os overlays dizem «Nenhum lance único registrado.» antes do oficial (hoje fechados pelo `EM_BREVE_MODE`).

## §SEG7 — Custo (Frente E)
Skill `mc-driven-projects` (Hermes) actualizada: `SKILL.md` (secção «Métrica de custo do Opus») + `references/custo-e-fecho-por-utac.md` +
`references/instrumentos-de-medicao.md` (+30 linhas cada, só acrescento; backups no scratchpad). Preços da referência oficial (cache 2026-09-25):
**Opus 5.5 = 400 ¢ input · 2 000 ¢ output · 20 ¢ cache read, por 1M tokens**. Fórmula:
`custo_¢ = (in × 400 + out × 2000 + cache × 20) / 1e6`.
**Este UTAC:** validador **113 338 tokens** (medido) ⇒ entre **2,3 ¢** (tudo cache) e **227 ¢** (tudo output); com 400 ¢/1M (tudo input fresco) = **45 ¢**.
Sessão principal: **não medida** pelo agente (Claude Code não expõe os tokens da própria sessão — o operador vê-os com `/cost`).

## §SEG8 — Testes + mutação
Suíte **801/801 · 1061/1067 VERDE** (792 + 9). `vite build` OK. ESLint sem novos avisos (AppContext 5 / MeusAtivos 2 = HEAD).
Ficheiros de teste alterados (declarados): `utac106f-ofertas` (contrato da OP + 9 testes novos), `utac0009-tabela-vencedor`, `utac0010-vencedor-contexto`,
`utac0008-resultado-oficial`, `utac105c-meus-ativos`, `utac0015-provider-cablagem`.
**Mutação 10/10 RED** (V2 ×3, carrossel, edição do cartão, mais próximo, tabela, encerrada aceita, erro em todos os cartões, agendado=encerrada); restauro sha256.
⚠️ **Erros dos meus instrumentos:** backspace literal (`\b` do Python) e `\n` expandidos em dois heredocs — apanhados pelo `node --check`/`od` e corrigidos;
âncora do M2 ambígua (3 casamentos) e do M8 desactualizada pela correcção — o mutador recusa aplicar (não conta como sobrevivente) e foram refeitas.

## §SEG10 — Validador
**APROVADO COM RESSALVAS** — `_logs/UTAC107e_SEG8_VALIDADOR.md`. V1/V3 corrigidos (`23a4bae`, não re-validados); V2 escalado para o 107e.2.

## §SEG11 — Deploy + registo
| Item | Medido |
|---|---|
| Comando | `npx netlify deploy --prod`, **foreground**, 07:44:22 → 07:49:07, `Deploy is live!` |
| Produção | home 200 · health 200 · entry `index-B5st0TCZ.js` → **`index-CFzvYOmT.js`** |
| Chunk OP | `OfertasProgramadas-rXEPT1cw.js` (`application/javascript`): `op-edicoes-scroll` 1 · «Palpites — Edição» 2 · «ABRE EM BREVE» 1 · «MAIS PRÓXIMO» 1 · «Junte 50 pontos» 1 · «Palpite — bónus» **0** · subtítulo antigo **0** |

`package-lock.json` sujo pelo build → arquivado e **restaurado**; suíte depois do deploy **VERDE 801/801 · 1061/1067**.
**Commits:** `6c0436c` → `23a4bae` → registo. **Duração:** 07:01 → 07:53 ≈ **52 min** (HI5 2 h — dentro).

**Veredito final: UTAC107e.1 FECHADO.** **Fica para o 107e.2:** revelação dos valores após o fecho (backend sobre o Key-Per-Bid), etiqueta do próprio lance
**só depois do fecho** (R18-A), copy dos overlays sem oficial, e os dados reais da tabela de palpites (endpoint).
