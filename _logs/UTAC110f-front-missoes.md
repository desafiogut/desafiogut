# UTAC110f-front — «Missões de hoje» na Carteira

**Executor:** Claude Code (Opus 5.5) · **Data:** 2026-10-13 · **Skill:** UTAC (spec `_logs/UTAC110f-front.spec.yml`).
**Baseline:** `2e6e43c` (pós-110f) · **Commit de código:** `c93d269` · fecho: commit seguinte.
**SEG-1:** `_logs/UTAC110f-front_SEG-1_MEDICAO.md` (A14 satisfeita após trim autorizado; baseline 1015/1015 · 1187/1193).

## Decisões do operador (R18 — também no SEG-1, no R14 e no relatório do Desktop)
- **R18-110f-front-A** — ✓ (feito) a **amarelo `#f5a623`** (a decisão de cor única do 109h.2 prevalece sobre o «verde» do enunciado).
- **R18-110f-front-B** — `pontosHoje` = **só as missões**: 5·login + 10·lance (0/5/10/15).
- **R18-110f-front-C** — copy **pt-BR «você»**: «Você ganhou X pontos hoje.» / «Volte amanhã!».

## SEG0 — backend mínimo (`ler-pontos.mjs`, único ficheiro do backend tocado)
- `missoesDeHoje(endereco)` chama `estadoMissoesHoje` e soma as constantes exportadas `PONTOS_LOGIN_DIARIO`/`PONTOS_MISSAO_LANCE`.
  Resposta (aditiva): `missoesHoje: { dia, loginFeito, lanceFeito, pontosHoje }`.
- **Fail-soft:** a leitura das missões é feita DEPOIS de os pontos estarem lidos; se lançar → `missoesHoje: null`, resto igual, 200.
- `_lib/fontes-lance.mjs` **não tocado** (a premissa §4 «devolve `pontosHoje`» era falsa — medido; calculado no endpoint).
- ⚠️ **Custo declarado:** o `ler-pontos` passa a ler a linha `pontos` **duas vezes** (o `lerPontos` faz `select("*")` e o
  `estadoMissoesHoje` relê via `lerLedgerLance`). Mantido por ser o caminho que o enunciado nomeia e por não tocar no
  `fontes-lance`; a alternativa (derivar do `registo.historico_lance` já lido) duplicaria a regra das refs no endpoint.

## SEG1 — hook (Ponytail: **sem** `useMissoes.js`)
- `usePontos` ganha `missoesHoje` (`VAZIO.missoesHoje = null`) via `missoesDaResposta(data)` exportada: aceita só
  `loginFeito`/`lanceFeito` booleanos e `pontosHoje` inteiro seguro ≥ 0; qualquer outra coisa → `null` (neutro).

## SEG2 — UI (`MinhaCarteira.jsx`)
- `<section data-missoes-hoje data-estado>` **dentro do 1.º vidro**, depois dos avisos de erro dos 3 saldos e **antes** da grelha
  dos botões. Título `<h4>` «🎯 Missões de hoje» (amarelo, caixa alta, como a etiqueta «Saldo Disponível»).
- Linhas `<li data-missao data-feito>`: glifo + rótulo + valor. Feito: **«✓»** (U+2713, glifo de texto — o emoji ✅ seria
  verde pela fonte do sistema) e **+N** a `#f5a623`; pendente: **⏳** e **+N** a muted `#6b7db8`, rótulo a 85 %.
  Texto só para leitores de ecrã «— feito/— pendente» (o estado não depende só da cor nem do glifo).
- Rodapé: «Você ganhou X pontos hoje.» e « Volte amanhã!» **só** com as duas feitas.
- Neutro: «…» a carregar; «—» com erro/ilegível/sem sessão — nunca «feito»/«pendente» inventados.
- **Sem botões** (só visualização). Lista com `maxWidth: 26rem` (a 1280 px o «+5» ficava a ~1 000 px do rótulo).
- Os 3 saldos, CardLance, CartaoEdicao, GlassHeader e `EM_BREVE_MODE` (= `true`) **não tocados**.

### As 4 skills de design (Hermes: `skills/mobile-ux-design`, `creative/design-md`, `creative/claude-design`, `creative/popular-web-designs`)
| skill | o que foi aplicado |
|---|---|
| claude-design | superfície **Monitor** (estado de relance, sem moldura de marketing); «contexto antes de vibes»: tokens do próprio ecrã (`COR`), nada novo |
| design-md | **zero tokens novos** — só `COR.gold`/`COR.muted`/`COR.text` já existentes; raio 12 px e borda `rgba(245,166,35,0.25)` iguais aos 3 saldos |
| mobile-ux-design | conteúdo primeiro e sem acção (não compete com os CTAs abaixo); hierarquia título → linhas → rodapé; espaçamento em grelha de ~8 px; contraste AA; sem alvos de toque (não há controlos) |
| popular-web-designs | referência de **checklist de estado em UI escura** (padrão Linear: glifo + rótulo + valor alinhado), sem importar tokens de terceiros — a identidade do app manda |

## SEG3 — verificação
| item | resultado |
|---|---|
| Suíte canónica (foreground) | **frontend VERDE 1029/1029** (1015 + 14) · **backend VERDE 1194/1200** (1187 + 7) |
| ⚠️ RAM durante essa corrida | **1 366 · 1 376 · 1 372 MB** (< 1 500 — declarado; a A14 estava satisfeita no SEG-1, não nesta corrida) |
| `vite build` (para o scratchpad, não para o `dist/` do APK) | exit 0 |
| Testes novos | backend 7 (4 estados, indicação fora, ontem não conta, fail-soft com controlo) · frontend 14 → **18** após o SEG4 (hook, 4 estados, bidireccional, neutro, sem sessão, sítio/Regra 1, saldos intactos, cor, contraste AA) |
| Mutação (`scripts/utac110f-front-prova-mutacao.mjs`) | **9/9 PROVADOS**, restauro sha256 verificado (M1 pontosHoje sem lance · M2 sem fail-soft · M3 campo fora · M4 coerção · M5 hook não lê · M6 «Volte amanhã» sempre · M7 cor · M8 neutro inventa · M9 login↔lance) |
| Contraste (sobre o vidro `#0c1131`) | amarelo 9,07 · muted 4,60 · texto 85 % ≥ 4,5 — com controlo negativo |
| Screenshots | `_logs/utac110f-front-browser/carteira-missoes-{375,1280}.png` — overflow lateral **0**, **0** erros de página, inspeccionadas a olho |
| Escopo (`git diff 2e6e43c c93d269 --stat`) | 3 ficheiros de produção (ler-pontos, usePontos, MinhaCarteira) + 2 testes + mutador + logs/capturas |

⚠️ **Limite das capturas:** harness temporário (apagado) que monta a `MinhaCarteira` REAL com o CSS real, sessão SINTÉTICA e
`ler-pontos` sintético (estado ✓⏳), sem o AppLayout. A Carteira em produção com sessão real não foi aberta (gate LGPD).

## Erros dos MEUS instrumentos (declarados)
1. O controlo do fail-soft (M4 do backend) comparava históricos com `new Date()` por movimento → diferiam no `data`; corrigido
   com uma só marca de tempo. Não era defeito do código.
2. A 1.ª corrida de testes do backend com `grep "^# tests"` não mostrou nada — o repórter actual escreve `ℹ tests`.

## Pendências / riscos declarados
- **Corrida login→leitura:** o `POST /login-diario` dispara 1× por sessão no `AppContext`; se a Carteira ler o `ler-pontos`
  antes de ele terminar, mostra o login como pendente até à próxima leitura (o `usePontos` relê ao montar a Carteira e após
  compras). Não há releitura dirigida após o login — candidato a UTAC próprio, se o operador quiser.
- 2.ª leitura da linha `pontos` por pedido (ver SEG0).
- «pontos» do rodapé são **pontos de lance**; a Carteira não mostra hoje o saldo de pontos de lance (só créditos de lance) —
  a copy segue R18-C à letra.

## SEG4 — validador adversarial (1 ronda; Boulder máx. 3)
Subagente independente, worktree próprio (A13, `worktree-helper`, removido com exit 0; `node_modules` real intacto 498/414).
Veredicto integral: `_logs/UTAC110f-front_SEG4_VALIDADOR.md`.

**APROVADO COM RESSALVAS — 0 bloqueantes.** 9 das 10 alegações não refutadas; reproduziu a suíte (1029/1029 · 1194/1200, RAM
1 342-1 357 MB — evidência fraca, declarado por ele) e o martelo (9/9). Os mutantes dele: **9/12 mortos**.
- ⚠️ **F1 (refutou em parte a alegação 4):** o estado do bloco não consultava `pontosErro`, e o `refetch` do `usePontos` não
  repõe os dados quando falha ⇒ depois de uma compra com releitura falhada, os saldos iam a «—» mas as missões ficavam ✓/⏳
  **desactualizadas**. **CORRIGIDO** (`(pontosErro || !missoesHoje) ? "neutro" : "ok"`) + teste F1 (compra → releitura 500 →
  neutro) + mutante **M10**.
- ℹ️ **Sobreviventes V4/V8/V10** (sr-only invertido, glifo sem `aria-hidden`, rodapé recalculado no cliente) — **fechados** com
  testes e mutantes **M11/M12/M13**. Também corrigidos: 🎯 com `aria-hidden`; sr-only com `margin:-1`/`nowrap`/`border:0`.
- ⚠️ **F2 (corrida login→leitura)** e as notas ℹ️ restantes (leitura dupla, muted com margem curta 4,61 por o vidro ser
  translúcido, +5/+10 literais na UI, sem releitura à meia-noite de Manaus) — **declarados, não corrigidos** (pendências).
- Erro do meu instrumento: ao acrescentar o M12, o `\n` da âncora entrou no `.mjs` como quebra real (SyntaxError); corrigido.
  E o M8 deixou de casar depois do F1 — o próprio script recusou contá-lo («âncora casou 0×»); âncora actualizada.

**Correcções pós-veredicto NÃO re-validadas por 2.ª ronda** (declarado). Depois delas: teste do ecrã **18/18**, martelo
**13/13 PROVADOS**, suíte **frontend VERDE 1033/1033 · backend VERDE 1194/1200** com RAM **1 551 · 1 555 · 1 561 MB** (A14 ✓).
