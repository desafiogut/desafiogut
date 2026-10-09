# UTAC109e — Padronizar edições: CartaoEdicao único + GUTO animado 7

**Tipo:** produto (frontend) · **Owner:** Claude Code (Opus 5.5) · **Data:** 2026-10-09 · **HI5:** 2 h
**Depende de:** UTAC109d.1 (`2e40488`).

---

## Baseline (SEG-1)

| Item | Medido | Comando |
|---|---|---|
| HEAD = origin/main | **`2e40488`** (= o esperado) | `git rev-parse --short HEAD` / `origin/main` após `git fetch` |
| Árvore | sem código modificado (só `??` de logs antigos MC100-102 e `UTAC106x.2.spec.yml`, alheios) | `git status --short` |
| Suíte canónica | frontend **VERDE 917/917** · backend **VERDE 1095/1101** (= o esperado) | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (foreground) |
| Disco | 7,7 GB livres (> 5 GB) | `df -h /c` |
| Logs lidos | 108e.1, 108h.2, 109c, 109d, 109d.1 | — |

---

## SEG0 — Inventário (medido antes de tocar)

### 1. O cartão de edição
- **Um só componente**: `src/components/CartaoEdicao.jsx` (146 linhas). Não há segundo cartão.
- Props: `id, estado, produto, arteUrl, tempo, tempoRotulo, vazio, destaque, titulo, mensagemVazio, ajudaVazio, isMobile, children` (`:33-38`). **Não há prop `acao`**: a acção entra como `children`.
- **O que distingue MLC de OP hoje é a prop `destaque`** — duas apresentações do mesmo casco (`:70-140`):
  - `destaque` (MLC, variante B): arte largura toda 1:1/16:9, nome + tempo numa faixa (`:70-102`);
  - compacto (OP, variante A): arte 64 px + nome; **GUTO 44 px estático ao lado do tempo, sempre** (`:104-139`, `:128`).
- Consumidores: MLC `pages/MercadoLances.jsx:395` (vazio) e `:402` (com edição) — ambos `destaque`; OP `pages/OfertasProgramadas.jsx:128` (com edição) e `:338` (vazio) — **sem `destaque`**; Início `pages/Dashboard.jsx:382` e `:426` — ambos `destaque`.

### 2. Botões actuais
| Ecrã | Estado | Botão | Prova |
|---|---|---|---|
| MLC | sem edição (`EM_BREVE_MODE`, hoje) | «**Dar lance**» desligado, rótulo «Seu lance (em centavos)» | `MercadoLances.jsx:262-276` (`LanceDesativado`) |
| MLC | com edição | o **`CardLance`** real: «**⚡ Lance Relâmpago**» (flash) | `components/CardLance.jsx:358` — ficheiro **fora do AUTORIZA** |
| OP | sem edição | «**Palpitar**» desligado, rótulo «Seu palpite (nº de lances)» | `OfertasProgramadas.jsx:338-351` |
| OP | com edição | «**Palpitar**» / «Enviando…» | `OfertasProgramadas.jsx:148-153` |
| Início | vidro Programada | «**Palpitar**» | `Dashboard.jsx:453-458` |

⇒ O rótulo da OP **já é** «Seu palpite (nº de lances)», sem «(em centavos)». Falta o botão.

### 3. O GUTO actual
- **Cabeçalho do Início:** `<CarrosselGUTO size={isMobile ? 116 : 176} />` (`Dashboard.jsx:282`) — **animado (8 vídeos), sempre**, independentemente de haver edições.
- **«GUTO estático antigo»:** `GUTO_URL = "/assets/guto/custom/guto-bemvindo.png"` (`CartaoEdicao.jsx:18`), PNG estático, usado em **dois** sítios do cartão:
  - no cartão **vazio** `destaque` (72 px, `:81`) — MLC vazio, e o vidro Programada do Início quando vazio;
  - no compacto, ao lado do tempo, **também com edição** (44 px, `:128`) — OP.

### 4. O GUTO animado 7
- Os 8 vídeos do carrossel (109d/109d.1): `public/assets/guto/carrossel/guto-{1..8}.webm` + poster `.png`, VP9 alfa 512², cache-bust `V = "mc60"` (`CarrosselGUTO.jsx:27`).
- **`guto-7`** = o 7.º vídeo novo (`Desktop/NOVO GUTO animado oficial/7.mp4`, fundo removido no 109d; byte-idêntico ao mc59 no 109d.1). Conteúdo (poster medido): GUTO de pé a olhar para o telemóvel, ao lado de caixas de cartão com chaleira e liquidificador — vibe e-commerce, **sem texto de leilão**.
- **São os mesmos do carrossel.** O `CarrosselGUTO` aceita `slides` por prop (`:37`); com 1 slide não há crossfade (`n <= 1`, `:73`) e o `<video loop>` repete. Reutilizável sem duplicar.

### ⚠️ Conflitos / ambiguidades (AU3 / GATE 12) — levados ao operador
1. **Qual GUTO é substituído pelo «animado 7».** A leitura que casa com a decisão 4 («só enquanto não há edições — quando há, o cartão toma o lugar») é o `guto-bemvindo.png` do cartão **vazio**. O carrossel do cabeçalho do Início já é animado e aparece sempre.
2. **MLC com edição usa o `CardLance`**, cujo botão diz «⚡ Lance Relâmpago» e é ficheiro **fora do AUTORIZA**. Hoje está invisível (`EM_BREVE_MODE = true`).
3. **O vidro Programada do Início diz «Palpitar»** e o `Dashboard.jsx` só está autorizado para o GUTO.
4. **Formato da OP:** a decisão 1 manda a Programada seguir o formato Relâmpago (`destaque`), o que reverte a variante «A · Família» escolhida pelo operador no 108e.1 (arte 64 px + GUTO ao lado do tempo).

**Veredicto SEG0:** AJUSTAR → perguntar ao operador antes do SEG1.

### Decisões do operador (R18, 2026-10-09, AskUserQuestion no fim do SEG0)
| # | Decisão |
|---|---|
| R18-A | GUTO animado 7 **no cartão vazio** (substitui o `guto-bemvindo.png`); o carrossel do topo do Início fica como está |
| R18-B | **autorizada 1 linha** do `CardLance.jsx`: «⚡ Lance Relâmpago» → «Dar lance» (os outros estados do botão intactos) |
| R18-C | o vidro Programada do Início também passa a «**Dar palpite**» (só o texto) |
| — | Formato da OP: a decisão 1 do enunciado (Relâmpago = padrão) reverte a variante «A · Família» do 108e.1 — aplicado, sem pergunta |

---

## SEG1 — Cartão unificado
- `CartaoEdicao.jsx`: **um só formato** (topo → arte na largura toda 1:1/16:9 → nome + tempo na faixa → acção). Saíram a variante compacta, a prop `destaque`, a `tempoRotulo` e o `GUTO_URL`.
- Nova prop **`acao`** + tabela **`ACOES`** (congelada): `lance` = «Dar lance» / «Seu lance (em centavos)»; `palpite` = «Dar palpite» / «Seu palpite (nº de lances)». Validada por **`Object.hasOwn`** (o teste da entrada inválida apanhou que `ACOES["constructor"]` era verdadeiro — corrigido antes do commit).
- Sem edição, o formulário **desligado** passa a viver no cartão (`AcaoDesativada`, `data-testid="<acao>-desativado"`, input `type="number"`); o `LanceDesativado` do MLC e o bloco próprio da OP saíram.
- Consumidores: MLC `acao="lance"` (2), OP `acao="palpite"` (2); Início sem `acao` (estrutura intocada — 109f) e sem as props mortas `destaque`/`tempoRotulo` (extensão declarada, consequência da unificação).

## SEG2 — «Dar palpite» na OP
Botão real `ACOES.palpite.botao`, rótulo `ACOES.palpite.rotulo` (sem «(em centavos)»). R18-B: `CardLance` flash → «Dar lance». R18-C: Início → «Dar palpite».

## SEG3 — GUTO animado 7
`CarrosselGUTO` exporta `SLIDES`; o cartão vazio monta `<CarrosselGUTO size={112|128} slides={GUTO_ANIMADO_7} />` (`[SLIDES[6]]`, referência de módulo para o `memo`; 1 slide ⇒ sem crossfade, `<video loop>`). Com edição a arte toma o lugar — não há GUTO no cartão. Vale para MLC, OP e o vidro Programada vazio do Início. `aria-hidden` herdado do carrossel.

## SEG4 — Testes + mutação
- Novo `src/components/__tests__/utac109e-cartao-unico.test.mjs` (**16**): textos da acção, formato **idêntico** por comparação de HTML (vazio e com edição), entrada inválida (`constructor`, `toString`, `xpto`…), GUTO 7 só no vazio, reutilização do carrossel, cablagem MLC/OP/Início/CardLance, V1/V2/V8 do validador.
- `Dashboard.test` +2 (GUTO 7 dentro do vidro vazio; ausente com edição). Contratos actualizados (declarado): `utac108e1-mlc-op` (destaque → `data-acao`, GUTO 7, import com `ACOES`), `utac106f-ofertas` («Palpitar» → «Dar palpite»; vazio medido no HTML; cartão com edição sem GUTO).
- **Mutação 13/13** (`scripts/utac109e-prova-mutacao.mjs`), restauro md5 idêntico: M1 «Dar palpite»→«Dar lance» (7 RED) · M2 esconder GUTO 7 (4) · M3 GUTO 7 com edição (3) · M4 «(em centavos)» no palpite · M5 OP sem acção · M6 «Palpitar» na OP · M7 MLC com palpite · M8 Início «Palpitar» · M9 CardLance antigo · M10 sem `Object.hasOwn` · M11 formato diverge · M12 sem `loop` · M13 topo com 7 vídeos.

## SEG5 — Verificação
Suíte **935/935 · 1095/1101 VERDE** (917 + 16 + 2) · `vite build` exit 0 (para o scratchpad). OP encerrada: `timer` nulo ⇒ a faixa mostra «Edição encerrada» (`utils/edicao.js:61`). **Browser não aberto** (gate LGPD; prova por SSR das páginas reais).

## SEG6 — Validador adversarial
Worktree A13 em `dcf8460`. Veredicto: **APROVADO, 0 bloqueantes** (verbatim: `_logs/UTAC109e_SEG6_VALIDADOR.md`). (a)-(j) nenhuma confirmada. 14 mutantes próprios: 8 mortos, 6 sobreviventes (código certo, sem teste). **Fechados:** V1 aria-hidden, V2 loop, V8 topo 8 vídeos (testes + M12/M13). **Declarados (não corrigidos):** V5 `role="status"` (pré-existente); V9 «Edição encerrada» na OP sem teste próprio; V11 `size={0}`; ⚠️ **faixa da OP aberta a 375 px** — recebe «Em andamento — lance já!» (copy de lance num cartão de palpite, e o nome do produto pode ficar espremido) — padrão que o vidro Programada do Início já tinha; estimado, não medido → **109g**; ℹ️ o vazio da OP perdeu a frase «Sem edições programadas no momento…» (fica o texto genérico do cartão).

## SEG7 — Deploy + registo
Push `2e40488..0daf3af` (só os 2 commits do UTAC) = auto-deploy; entry `index-Bez_-42d.js` → **`index-DnndOoX6.js`** (~135 s); site 200. Crawl de 125 chunks: «Dar palpite» em `PrivyRoot`/`CartaoEdicao`, «Dar lance» em `CartaoEdicao`/`CardLance`, `guto-animado-7` em `CartaoEdicao`, **0** «Palpitar». `package-lock.json` não sujo. Worktree removido pelo helper; `node_modules` frontend 498 · functions 414 (contagem do frontend antes **não medida** nesta sessão — o 106x.6 registou 499).

## Erros dos meus instrumentos (declarados)
1. Neste ambiente, `\b`/`\n` dentro de Python em heredoc chegaram ao ficheiro como **0x08** e quebra de linha real — 3 vezes (teste do Início, teste novo, script de mutação). Apanhados por varredura de bytes de controlo / erro de sintaxe; corrigidos por valor de byte e com o Edit.
2. Escrevi o `utac106f-ofertas.test.mjs` em CRLF por defeito; reposto LF.
3. O 1.º commit saiu com uma identidade de autor errada (sobrepus a do repo); corrigido com `--amend --reset-author` antes do push.

## Escopo
Backend (`netlify/`), `package*`, os 5 `.bak-*`, Carteira, `EM_BREVE_MODE = true`, bytes de controlo do `CLAUDE.md` (2/2/2) — intactos. HI5: ≈ 1 h 40 (dentro de 2 h).
