# UTAC110h — SEG-1 — MEDIÇÃO

**Data:** 2026-10-14 · **Executor:** Claude Code (Opus 5.5) · **Spec:** `_logs/UTAC110h.spec.yml` · **Nada alterado neste segmento.**

## -1.1 Estado do repo
- `git rev-parse HEAD` → `649ffd113303547b5725f7db32faad08539a9053` = baseline declarado `649ffd1` ✓ (desvio 0).
- `git log --oneline -5`: `649ffd1` (errata custo 110g.1) · `3e69eff` · `41e5768` · `a78626f` · `30292b6`.
- `git status --porcelain`: só pré-existentes (`.agents/skills/*`, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json` sujo de sessões anteriores, `_logs/MC100_*`… não rastreados). Nada meu.

## -1.2 Caminhos nomeados pelo enunciado
| enunciado | medido |
|---|---|
| `docs/GUTO-REGULAMENTO.md` | ✓ existe (20 361 B) — 12 capítulos, 72 artigos |
| `docs/regras-oficiais.md` | ✓ existe (11 487 B) — **«Regras Oficiais v1.0», 9 secções** |
| `src/pages/RegrasOficiais.jsx` | ✓ `desafio-gut/frontend/src/pages/RegrasOficiais.jsx` (326 l.) — **conteúdo HARDCODED** (não lê o `.md`) |
| `netlify/functions/_tests/mc106h-regras.test.mjs` | ✗ **NÃO EXISTE.** O teste real é `desafio-gut/frontend/src/pages/__tests__/utac106h-regras.test.mjs` (223 l., frontend) |
| `_lib/guto-perfis.mjs` | ✓ (só leitura). O texto do Regulamento vem de `_lib/guto-regulamento.mjs`, cópia byte-a-byte de `docs/GUTO-REGULAMENTO.md` (guarda `mc963`) |
| `docs/REGULAMENTO-v5.md` | ✗ não existe (a criar — esperado) |

## -1.3 Inventário das fontes
- **GUTO-REGULAMENTO.md**: preâmbulo de transcrição + ERRATA DA FONTE (l. 1-38, anotação, não é texto do Regulamento) + corpo «REGULAMENTO OFICIAL DO DESAFIOGUT … Versão 5.0» (l. 40-312). Cap. I-XII, Art. 1º-72º.
- **regras-oficiais.md (v1.0, vigente 2026-10-05)**: §1 Identificação · §2 Programa (2.1 Passe · 2.2 Ponto · 2.3 Cartão) · §3 Acúmulo · §4 Resgate · §5 Validade · §6 Arrependimento · §7 «NÃO é concurso» · §8 LGPD · §9 Finais.
- **RegrasOficiais.jsx**: espelho hardcoded do v1.0 (1 `h1` + 9 `h2`); guarda `utac106h-regras.test.mjs` fixa **exactamente 9 `h2`**, «1 Passe = 1 ponto», «pontos de compra», md↔página.
- **Links para `/regras-oficiais`**: `Dashboard.jsx:63` (acesso rápido «Regras», 109f), `OfertasProgramadas.jsx:340`, BottomNav «Mais», Sidebar. Rota em `App.jsx`. ⇒ B3 já satisfeito.

## -1.4 Divergências medidas (v1.0 da página vs v5.0)
| tema | página / regras-oficiais.md (v1.0) | Regulamento v5.0 |
|---|---|---|
| rácio de acúmulo | **1 Passe = 1 ponto** | **1 Passe = 10 pontos** (Arts. 8º, 37º) — e o código já credita 10 (`PONTOS_FIDELIDADE_POR_PASSE = 10`, 110d) |
| nome dos pontos | «pontos **de compra**» | «pontos **de fidelidade**» |
| Menor Lance Único | «**torneio de habilidade**» (termo PROIBIDO pelo enunciado) | «competição de habilidade» (Art. 14º) |
| ECOQUILDO | ausente | Cap. VII inteiro (Arts. 47-51) |
| Passe Relâmpago / Programado | ausente (um só Passe) | dois Passes (Arts. 13º, 25º) |
| prazo de entrega do cartão | 30 dias | ausente («prazo divulgado nas regras oficiais de cada edição», Art. 40º) |
| obtenção do cartão | «resgate» debitando 50 pontos | Art. 9º «poderá **adquirir**» + Art. 53º PIX para o cartão |
| pagamento do Passe | (não diz) | **exclusivamente Google Play Billing** (Art. 52º) — **não implementado** (110i) |
| estrutura | 9 secções | 12 capítulos / 72 artigos |

Contagem de termos (grep):
| termo | GUTO-REG (v5) | regras-oficiais.md | RegrasOficiais.jsx |
|---|---|---|---|
| senha | 0 | 0 | 0 |
| cota(s) | **6** | 0 | 0 |
| torneio de habilidade | 0 | **1** | **1** |
| 1.207 | 0 | 0 | 0 |
| pontos de fidelidade | 17 | 0 | 0 |
| ECOQUILDO | 16 | 0 | 0 |
| competição de habilidade | 1 | 0 | 0 |

**Coerência GUTO ↔ v5:** por construção (o GUTO lê `guto-regulamento.mjs` = `docs/GUTO-REGULAMENTO.md` byte-a-byte, teste `mc963`). **Página ↔ v5 e página ↔ GUTO: INCOERENTES** (tabela acima).

## -1.5 Recursos
- Disco C: 15 GB livres ✓.
- **RAM livre (A14, 3×): 432 / 437 / 458 MB — abaixo de 1 500 MB ⇒ SEG-1 NÃO VÁLIDO para medir a suíte.** Suíte baseline **não corrida** (seria NAO_MEDI).

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **§15 dispara:** «Se o `regras-oficiais.md` estiver muito diferente do v5.0 → PARAR». Está: documento diferente (v1.0, 9 secções), rácio 1 vs 10, «torneio de habilidade», sem ECOQUILDO.
2. **Termo proibido «cotas» está DENTRO do v5.0 aprovado** (Arts. 12º, 18º, 24º, 30º — Cotas Bronze/Prata/Ouro/Diamante). C2 manda dar RED a «cotas» e R18-110h-4 manda não alterar o texto. Impossível ter os dois.
3. **Forma da página:** publicar o Regulamento integral (72 artigos) na página, ou manter um resumo «Regras Oficiais» alinhado com o v5 (o próprio Art. 40º trata «regras oficiais de cada edição» como documento distinto)?
4. **Factos do v5 não implementados** que a página passaria a afirmar: Play Billing exclusivo (Art. 52º), cartão «adquirido» com PIX (Arts. 9º/53º) vs resgate por débito de pontos, perda de acesso às métricas (Arts. 21º/32º). O v5 só vigora a 02/11/2026.
5. **Teste:** o `mc106h-regras.test.mjs` em `netlify/functions/_tests/` não existe; o real é `src/pages/__tests__/utac106h-regras.test.mjs` (fora do «src/__tests__/» autorizado à letra).
6. **A14:** RAM ~440 MB — pedir trim ao operador antes de qualquer suíte.

## -1.7 Veredito
**PARAR** — escalado ao operador (conflitos 1-6). Nada alterado.

## -1.8 Decisões do operador (R18, 2026-10-14) — registadas em 3 lugares (este log, relatório, R14)
- **R18-110h-A** — a página `/regras-oficiais` passa a mostrar o **Regulamento v5.0 integral** (12 capítulos, 72 artigos), lido de `docs/REGULAMENTO-v5.md`. Uma só fonte; nenhum texto jurídico novo.
- **R18-110h-B** — «cotas» **sai** da lista de termos proibidos (o v5 aprovado usa «Cotas Bronze/Prata/Ouro/Diamante»). Continuam proibidos: senha, torneio de habilidade, Portaria SPA/MF 1.207/2024.
- **R18-110h-C** — A14: «feche o necessário». Fechados 7 servidores MCP desta sessão sem uso (sportscore, binance, validkit, jetbrains-proxy, tapsite, mockit, pythonanywhere). O fecho do Claude Desktop da bandeja foi **recusado pelo classificador de permissões** e não foi contornado. RAM: 432/437/458 → **1625/1637/1638 MB** ✓.

## -1.9 Baseline (A14 cumprida)
`node scripts/mc966-suite-harness.mjs ambos` (foreground): **frontend VERDE 1059/1059 · backend VERDE 1227/1233** = declarado.

## -1.10 Veredito final do SEG-1
**SEGUIR** com R18-110h-A/B/C.
