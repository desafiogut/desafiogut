# UTAC109g — Ofertas Programadas: alinhamento com o MLC + padrão «Palpites»

**Data:** 2026-10-09 · **Executor:** Claude Code (Opus 5.5) · **Baseline:** `fee1609` · **Commits:** `1fc7321` (código) → correcções do validador → registo
Spec: `_logs/UTAC109g.spec.yml` · Medição: `_logs/UTAC109g_SEG-1_MEDICAO.md` · Validador: `_logs/UTAC109g_SEG3_VALIDADOR.md`

## Decisões do operador (R18)
| # | Decisão |
|---|---|
| R18-A | A OP usa o **mesmo `GlassHeader`** do MLC e o **mesmo envelope** (sem o limite de 640 px no desktop). |
| R18-B | O aviso do bónus («🎫 Edições programadas», texto intacto) passa para **logo abaixo da edição**. |
| R18-C | B4 **na fonte**: mínimo do nome no `CartaoEdicao` 9rem → **12,5rem** (vale também para Início/MLC; ficheiros deles intocados). |
| R18-D | Frase da OP: «…cartão da Família Quildo» quebrava a 375 px (21 px de diferença). Proposta do operador «…cartão Quildo» **ainda quebrava** (medido 320 vs 299) ⇒ recurso indicado por ele: **«Junte 50 pontos e troque pelo cartão»** ⇒ 0 px. «Quildo» saiu da frase. (No questionário tinha sido escolhida antes «50 pontos valem um cartão colecionável.»; prevaleceu a mensagem posterior do operador.) |

## O que mudou
- `src/pages/OfertasProgramadas.jsx` — 1.º vidro = `GlassHeader` (identidade + login + título/frase/selo + rodapé CNPJ); `<main>` com o envelope do MLC + `alignContent: "start"` (sem ele as linhas da grelha esticavam e os vidros ficavam com vazio em baixo — achado meu no browser); a **edição é o 2.º vidro** e já não depende de os pontos terem carregado; aviso do bónus logo abaixo; nova `TabelaPalpites` local moldada na `TabelaLances` (que é do MLC e não foi tocada).
- `src/components/CartaoEdicao.jsx` — `flex: "1 1 12.5rem"` no nome (+ comentário).
- Testes: novo `src/pages/__tests__/utac109g-op-alinhamento.test.mjs` (11) + `_stubs-109g/useIsMobile.js`; contratos actualizados (`utac106f-ofertas`, `utac108e1-mlc-op`, `Dashboard.test` 9rem→12,5rem, `utac107e2-etiqueta` 🔒 por linha). Scripts `scripts/utac109g-prova-mutacao.mjs` e `scripts/utac109g-medir-alinhamento.mjs`.

## Medições (browser local, protocolo R18-D do 109f, perfil descartável apagado; 0 perfis e porta livre no fim)
| | MLC 1.º vidro | MLC edição top | OP 1.º vidro | OP edição top | largura MLC/OP | cartão vazio MLC/OP |
|---|---|---|---|---|---|---|
| **antes 375** | 267 | 299 | 147 | **969** | 343/343 | — |
| **depois 375** | 267 | 299 | 267 | **299** | 343/343 | 465/465 |
| **antes 1280** | 255 | 311 | 104 | **898** | 964/**640** | — |
| **depois 1280** | 255 | 311 | 255 | **311** | 964/964 | 684/684 |
Nome do produto na OP a 375 px: **151 → 283 px**. Overflow lateral 0. Capturas: `_logs/utac109g-browser/mlc-vs-op-375.png` e `-1280.png` (linha verde = topo da edição).

## Verificação
- Suíte: **frontend 961/961** (947 + 14) · **backend 1095/1101** — VERDE (harness foreground).
- Mutação **16/16** (`scripts/utac109g-prova-mutacao.mjs`, 3 lotes; M11-M16 = sobreviventes do validador), restauro md5-idêntico.
- `vite build` OK. Diff zero: `MercadoLances.jsx`, `TabelaLances.jsx`, `components/glass/*`, `Dashboard.jsx`, `MinhaCarteira.jsx`, `leilaoLock.js` (`EM_BREVE_MODE = true`), `netlify/`, `package*`; 5 `.bak-*` intactos.
- **P1**: com `EM_BREVE_MODE = true` não é observável no browser (o estado é sempre EM BREVE); provado por teste com o duplo `definirEmBreve(false)` — Programada → «palpite já!», Relâmpago → «lance já!».
- **P2**: medido no browser e em teste («Sem edições programadas no momento.»).

## As 4 skills de design (Hermes)
- **mobile-ux-design** — conteúdo/acção primeiro: a edição (onde se palpita) sobe para o 2.º vidro, acima dos pontos; alvos ≥ 48 px mantidos nos controlos da OP; auditoria de toque no browser.
- **claude-design** — «partir do contexto, não da vibe»: reutilizar o `GlassHeader` e moldar a tabela na `TabelaLances` em vez de desenhar algo novo; superfície «Operate».
- **popular-web-designs** — só referência de padrão (lista em cartões no telemóvel / tabela no desktop, comum aos dashboards de dados densos); nenhum tema externo importado.
- **design-md** — só tokens existentes (`#f5a623`, `#6b7db8`, `#e8f0fe`, Orbitron) do `docs/mockups-107a/DESIGN.md`/`glassTokens`; nenhuma cor nova.

## Lacunas / declarado
- ⚠️ **Botão de login do `GlassHeader` (`AuthArea`) com 33 px a 375 / 40 px a 1280** — já existia no MLC; ao reutilizar o componente passa a aparecer também na OP. Corrigir é tocar no componente do MLC (fora do escopo) ⇒ candidato a UTAC.
- O `data-testid="frase-mlc"` do `GlassHeader` passa a aparecer também na OP (nome herdado do componente partilhado).
- Tabela «Palpites»: ordem do servidor (no palpite vence o mais próximo; ordenar por valor não tem significado); vazio com 1 linha (a 2.ª do molde é copy de lance); sem coluna «tempo» (o molde não a tem); `usePalpitesDaEdicao` lê 1× (o MLC tem tempo real do contexto) — não alterado.
- **Erro do meu instrumento:** o 1.º lote de mutação foi cortado por um `timeout` externo e **deixou o M10 aplicado** no `CartaoEdicao.jsx` (o `finally` não corre quando o processo é morto). Detectado por verificação, reposto à mão, e o script passou a correr por lotes + handler de SIGTERM.
- **Erro do meu instrumento:** a 1.ª reestruturação extraiu blocos por substring `"        )}\n"` que casava dentro de linhas mais indentadas ⇒ JSX partido (o build apanhou). Recomposto a partir do HEAD com âncoras de linha inteira.

## Validador adversarial (SEG3) — **PARCIAL, 0 bloqueantes** (worktree próprio A13; verbatim em `_logs/UTAC109g_SEG3_VALIDADOR.md`)
- **Confirmado:** alinhamento **0 px** em 6 larguras (320 → 320/320 · 375 → 299/299 · 414 → 299/299 · 768 → 414/414 · 1024 → 334/334 · 1280 → 311/311), com e sem edição, sem overflow; estrutura em todos os estados; P1 (só teste), P2 (browser); nome 283 px a 375 e 228 a 320; diff zero MLC/Início/Carteira/backend/package/`.bak-*`; mutação 10/10 reproduzida; suíte 958/958 · 1095/1101.
- ⚠️ **Refutou a minha alegação de contraste AA:** o selo de estado da tabela (texto branco, copiado do molde) dava 2,84 / 2,54 / 3,76:1. **Corrigido:** texto navy `#0a0f1a` ⇒ 6,76 · 7,55 · 5,09 · 4,79:1 (4 estados). O selo da `TabelaLances` do MLC tem o mesmo defeito — **fora do escopo, registado**.
- ⚠️ Login da OP sem teste (V6/V7/V8 sobreviviam) e fuga MC88.43 «Prazo» ao lado de EM BREVE sem teste (V5) — **fechados** com 3 testes «SEG3 ·» + mutantes M11-M16 (todos RED). ℹ️ V2 (`alignContent`) também fechado.
- ⚠️ Botão de login 33 px até 414 — confirmado (já declarado).
- ℹ️ declarados, não corrigidos: `<main>` dentro do `<main>` do Layout (mesmo padrão do MLC); a 320 a frase quebra, o id «PROG-1» parte e «DesafioGUT» trunca; a 768 o nome fica com 252 px (o tempo cabe na mesma linha); 12,5rem também vale para o MLC (R18-C); lista de palpites revelados no telemóvel só provada em SSR.
- Correcções pós-veredicto **não re-validadas** em 2.ª ronda.
