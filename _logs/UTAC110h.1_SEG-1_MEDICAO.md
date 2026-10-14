# UTAC110h.1 — SEG-1 MEDIÇÃO (pendências do 110h: gate legal + GUTO + vocabulário)

Executor: Claude Code (Opus 5.5) · 2026-10-14 · skill `desafio-gut/frontend/skills/utac/` (tipo `saneamento`)
**Nada alterado neste segmento.**

## -1.1 Estado do repo
- `git rev-parse --short HEAD` → **`ec2028d`** (= baseline declarado) · `git log -1`: «fix(UTAC110h): ressalvas do validador SEG5 + fecho».
- `git status --porcelain`: só pré-existentes (`.agents/skills/*`, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`, `_logs/MC1xx_*` não versionados). Nada deste UTAC.

## -1.2 Recursos (A14) — ⛔ SEG-1 NÃO VÁLIDO PARA MEDIR A SUÍTE
- RAM livre 3× (`Win32_OperatingSystem.FreePhysicalMemory`): **639 / 631 / 630 MB** (limiar 1 500) ⇒ **PARAR e pedir trim ao operador**.
- Disco C: 14,3 GB livres (≥ 5 GB ✓).
- Suíte baseline **não corrida** (seria NAO_MEDI).

## -1.3 Inventário (medido, `ficheiro:linha`)

### P1 — Gate legal `src/components/TermosConsentimento.jsx` (310 l.)
- Regulamento resumido com numeração **v4**: Art. 1, 4, 5, 6, 7, **8 («senhas»)**, 14, 13, **20 («senhas… R$ 2,00»)**, 21 (PIX/TED/BB), 24, 25, 26, 34, 29, 37 (`:83-180`).
- Cabeçalho «Vigência: a partir de **5 de outubro de 2026**» (`:67-68`) — v5 Art. 4º: **02 de novembro de 2026**.
- 4 caixas obrigatórias `{lido, maiores, termos, privacidade}` (`:17-22`, `:193-219`); textos citam **Art. 7, Art. 26, Art. 29**.
- `VERSAO_CONSENTIMENTO = "2.0"` (`:14`) — comentário: «Subir … invalida os aceites anteriores de propósito».
- Backend `netlify/functions/_lib/consentimento.mjs:18` `VERSAO_GATE = "2.0"`, «tem de ser igual» (há teste); valida as **4 chaves exactamente `true`** (MC104).
- Testes que fixam o texto v4 do gate: `citacoesRegulamento.test.mjs`, `dadosPagamento.test.mjs`, `artigosUI.test.mjs`, `mc9951-gate-legal.test.mjs`, `mc9952-seguranca-gate.test.mjs`, `consentimento.test.mjs` (+ menções em 106b/106c).

### P2 — GUTO `netlify/functions/_lib/guto-perfis.mjs:367-370` (intent `indique_e_ganhe`)
- 4 perfis prometem «**+1 senha**» por indicação (e «senhas ganhas»).
- **v5 Art. 51º:** «Cada indicação … concede **2 (dois) ECOQUILDO ao indicante e 1 (um) ECOQUILDO ao indicado**» (+1 de boas-vindas).
- **Código actual (UTAC110f):** a indicação credita **+50 pontos de lance** a cada um (`referral.mjs` → `creditarIndicacao`); **não existe** crédito de ECOQUILDO por indicação (pendência declarada no UTAC110e: «wiring automático de boas-vindas/indicação (Art. 51)»).

### P3 — Vocabulário
| termo | ocorrência VISÍVEL | classe |
|---|---|---|
| «torneio de habilidade» | `src/pages/Privacidade.jsx:77` (o enunciado diz `:125` — desvio declarado) | MÉDIA |
| «torneio de habilidade» | `src/i18n/pt.js:60` `ativos.torneio.titulo` = «🏆 Torneio de habilidade» + fallback `PainelTorneio.jsx:31` (Meus Ativos) | MÉDIA — **fora do AUTORIZA** |
| «pontos de compra» | `src/hooks/useResgatarCartao.js:26` (erro 402 mostrado ao utilizador) | MÉDIA |
| «pontos de compra» | `netlify/functions/resgatar-cartao.mjs:187` (mensagem 402 do servidor) | MÉDIA |
- Restantes ocorrências = **comentários/testes** (BAIXA): `usePalpite.js:3`, `usePontos.js:61`, `MinhaCarteira.jsx:110,429`, `OfertasProgramadas.jsx:21,71`, `ler-pontos.mjs:75`, `registar-palpite.mjs:4`, `resgatar-cartao.mjs:31`, `_lib/passe-pontos.mjs` (6), `guto-perfis.mjs:109,200`, `fila-processor-scheduled.mjs:16`, `pontuacao-*.mjs`, `MeusAtivos.jsx:178`, testes.
- Guardas que **exigem** o termo antigo: `src/i18n/__tests__/glossario.test.mjs:55` (`GLOSSARIO_PT = [/torneio de habilidade/i, /\bsenhas?\b/i]`), `artigosUI.test.mjs:27`, `utac106g-resgate.test.mjs:206` (frase «pontos de compra»).
- Total visível em escopo: **≤ 20** ⇒ sem paragem pela regra das 20.

## -1.4 Factos v5 que o novo gate pode citar (verbatim, `docs/REGULAMENTO-v5.md`)
Art. 1º (programa de fidelidade gamificado, Associação, CNPJ) · Art. 2º (Relâmpago = menor lance único; Programada = palpite) · Art. 4º (02/11/2026) · Art. 5º (18 anos) · Art. 6º (Passe R$ 2,00) · Art. 8º (10 pontos) · Art. 9º (50 pontos → 1 cartão) · Art. 14º (competição de habilidade) · Art. 47º (ECOQUILDO = R$ 1,00) · Art. 49º (não convertível) · Art. 66º (cessão de imagem; o gate cita Art. 29).

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **A14:** RAM 630 MB. Libertar o quê?
2. **Versão do consentimento:** mudar o texto sem subir `VERSAO_CONSENTIMENTO` mantém válidos os aceites do regulamento antigo (o problema que P1 descreve). Subir para "3.0" força novo aceite a todos **e** exige editar `_lib/consentimento.mjs` (VERSAO_GATE) — **fora do AUTORIZA**.
3. **GUTO:** «2 ECOQUILDO» (v5) é uma promessa que o app **não cumpre hoje** (dá +50 pontos de lance; ECOQUILDO por indicação não está ligado). O enunciado manda seguir o v5.
4. **Meus Ativos** mostra «🏆 Torneio de habilidade» (`pt.js:60`) — fora do AUTORIZA e protegido pelo `glossario.test.mjs`.
5. **Estrutura das 4 caixas:** o exemplo do enunciado troca a 4.ª por «comunicações (opcional)» — o backend exige as 4 obrigatórias com as chaves actuais (alterar = «gate legal estrutural», proibido). Proposta: manter as 4 chaves e semântica, mudar só o texto.

## -1.7 Veredicto
**PARAR** (A14) **e AJUSTAR** (conflitos 2-5) — perguntar ao operador antes do SEG0.

## -1.8 Decisões do operador (R18, 2026-10-14)
- **R18-110h.1-A** (A14): «fechar o necessário» — servidores MCP desta sessão sem uso + Claude Desktop da bandeja; browsers e WhatsApp ficam.
- **R18-110h.1-B** (conflito 2): **subir `VERSAO_CONSENTIMENTO` para "3.0"**; autorizada 1 linha em `netlify/functions/_lib/consentimento.mjs` (`VERSAO_GATE`) + o teste da igualdade. Todos voltam a aceitar (agora o v5).
- **R18-110h.1-C** (conflito 3): o GUTO diz **o que o app faz** (+50 pontos de lance a cada um); o ECOQUILDO do Art. 51º fica **pendência** (ligação no backend). ⇒ **substitui a R18-110h.1-2 do enunciado** («2 ECOQUILDO»).
- **R18-110h.1-D** (conflito 4): corrigir também Meus Ativos («🏆 Competição de habilidade»); autorizados `src/i18n/pt.js`, `PainelTorneio.jsx` e as guardas `glossario`/`artigosUI`.
- Conflito 5 (estrutura das 4 caixas): segue a proposta do executor — mantêm-se as 4 chaves obrigatórias, muda só o texto (gate estrutural proibido).

## -1.9 A14 cumprida + baseline
- Fechados (R18-110h.1-A): servidores MCP sem uso (tapsite, claude-eyes, validkit, jetbrains-proxy, sportscore, mockit, pythonanywhere, binance), `vite preview` órfão do UTAC110h (scratchpad `build110h`) e o Claude Desktop. Mantidos: chrome-devtools (screenshots), browsers, WhatsApp, esta sessão.
- RAM: 630 → **1578 / 1578 / 1566 MB** ✓.
- Suíte (`scripts/mc966-suite-harness.mjs ambos`, foreground): **frontend VERDE 1066/1066 · backend VERDE 1227/1233** = declarado.
