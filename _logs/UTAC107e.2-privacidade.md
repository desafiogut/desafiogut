# UTAC107e.2 — Revelação pós-fecho + etiqueta de estado + endpoint de palpites + liderança reconstruída

**Tipo:** produto (backend + frontend) · **Skill:** `utac` · **Data:** 2026-10-06 · **Modelo:** claude-opus-5-5 (Claude Code, sessão nova) ·
**Baseline:** `5c1886a` (= `origin/main`) · **Frentes:** 4 (A revelação · B etiqueta · C palpites · D laranja).

## §Baseline (SEG-1)
| Item | Medido |
|---|---|
| `HEAD` / `origin/main` | `5c1886a` (= enunciado); sujeira tracked 0 |
| Suíte | **801/801 · 1061/1067 VERDE** (= enunciado) |
| Deploy vivo | 200 · entry `index-CjvvGF-9.js` (⚠️ ≠ `index-CFzvYOmT.js` declarado no fecho do 107e.1 — ver §SEG9) |
| Anti-bot MC28.1 | `lances-flash?acao=verificar` → **403 `verificacao_indisponivel`** (produção) |
| `ler-palpites` antes | 200 = fallback da SPA (não existia) |
| Disco | 12 GB livres |

Medição completa + conflitos + respostas do operador: `_logs/UTAC107e.2_SEG-1_MEDICAO.md`.

## §SEG0 — Medição (resumo)
- Endpoint de lances = **`lances-flash.mjs`** (público). Em mainnet devolvia **sempre** `valor:null` (sem ramo de revelação) e lia o **blob legado**,
  que está **vazio** — os lances reais vivem no **Key-Per-Bid** (`lance-relampago.mjs:245-261` → `addLance`).
- «Encerrado» no backend = **marcador `bid:{id}:consolidado`** (`bids-store.mjs:95-105`), escrito depois do recibo on-chain.
- Anti-bot = `lances-flash.mjs:37-42` (`acao=verificar` → 403 em mainnet).
- Palpites: não havia leitura por edição. **O `registar-palpite` aceita com `status === "aberto"` e não olha o `termino_em`.**
- Liderança: não guardada; **reconstruível** — cada lance KPB tem `processadoEm`. `public.pontos` só tem linha para quem comprou Passe.

### Decisões do operador (R18, 2026-10-06 — 3 lugares: aqui, R14, relatório)
- **R18-A** revelar **após consolidar** (marcador). **R18-B** laranja **reconstruído no fecho** (sem migração, sem tocar no `lance-relampago`).
- **R18-C** estado do titular por **acção autenticada** `lances-flash?acao=meu-estado`. **R18-D** **sem etiqueta na OP**.

### Desvios declarados (não decididos pelo executor como produto — leituras do enunciado)
1. **Cor da etiqueta:** decisão 3 do operador («só o que muda tem cor diferente») × SEG2 («tudo da cor do estado») → seguida a **decisão do operador**:
   «SEU LANCE» neutro `#e8f0fe`, «(estado)» na cor.
2. **Tabela de lances durante a edição:** mantém **🔒** (mockup 107a/107d) em vez de «—» (enunciado) — mockup > enunciado. A `TabelaLances` **não foi tocada**:
   já mostrava 🔒 com `valor:null` e o valor quando chega.
3. **Critério do `ler-palpites`:** revela exactamente quando o `registar-palpite` passa a recusar (status ≠ aberto/agendado, ou edição apurada) —
   revelar pelo prazo mostraria valores enquanto ainda se palpita.
4. **Frente D sem migração** (R18-B): o enunciado sugeria `pontos.lider_em`; não foi criada nenhuma migração.

## §SEG1 — Frente A: revelação (backend)
`lances-flash.mjs`, mainnet:
- **por consolidar** → ramo blindado de sempre (`valor:null`, `repetido:null`) + `encerrado:false`; o Key-Per-Bid **nem é lido**;
- **consolidada** → valores do **Key-Per-Bid** (`getLances`) com `valor` e `repetido`, `encerrado:true`, `ocultoAteConsolidar:false`; **sem** `processadoEm`;
- marcador ilegível → trata-se como por consolidar (nunca revela por engano); KPB a falhar com a edição consolidada → **503**.
- `acao=verificar` **inalterado** (403 antes e depois do fecho). Fora de mainnet: legado intacto.
Frontend: nenhuma alteração necessária (a `TabelaLances` desenha 🔒 com `valor:null` e o valor quando chega).

## §SEG2 — Frente B: componente `EtiquetaEstadoLance.jsx`
- `default EtiquetaEstadoLance({estado})` — `menor` 🟢 `#3ddc84` «(É O MENOR E ÚNICO)» · `nao_menor` 🔴 `#ff8a8d` «(NÃO É O MENOR E ÚNICO)» ·
  `deixou_de_ser` 🟠 `#f5a623` «(DEIXOU DE SER O MENOR E ÚNICO)»; «SEU LANCE» `#e8f0fe`; estado desconhecido/`null`/do protótipo → nada; `role="status"`.
- `estadoDaEtiqueta({foiLiderAlgumaVez, eLiderFinal})` (SEG3.4) — sem coerção.
- `EtiquetaMeuLance({edicaoId, encerrado, authToken})` — só pergunta com `encerrado` **e** `authToken`; servidor por consolidar → nada e volta a perguntar em 60 s;
  `temLance:false`/erro → nada.
- **Contraste medido** sobre o fundo REAL da pílula (cor a 12 % sobre o vidro `rgba(13,18,53,.88)` sobre `#04080f`): todos ≥ 4,5:1 (teste B4).

## §SEG3 — Frente B: aplicação
- **MLC** (`MercadoLances.jsx`): `<EtiquetaMeuLance edicaoId={EDICAO_ATIVA} encerrado={encerrado} authToken={authToken} />` a seguir ao `LanceStatusBadge` (+4 linhas).
- **Início** (`Dashboard.jsx`): dentro de `{estAtiva.encerrada && (…)}` (fonte única MC88.43 — com `EM_BREVE_MODE` nunca monta), antes do botão do mercado (+9 linhas).
- **OP**: **sem etiqueta** (R18-D).

## §SEG4 — Frente C: `ler-palpites.mjs` (novo)
`GET ?edicaoId=` · Bearer user-session · 400/401/404/405/503 · `{ok, edicaoId, revelado, palpites}`; durante: `{endereco, data}`; depois: `{endereco, valor, data}`.
`_lib/passe-pontos.mjs`: **+`listarPalpitesDaEdicao`** (só adição, 13 linhas). `apurar-palpite.mjs` não tocado.
Frontend: `usePalpitesDaEdicao(edicaoId)` (extensão declarada de `usePalpite.js`; o `registar` não mudou) → tabela da OP: #, Participante (curto), Palpite
(«N lances» só com `revelado` **e** inteiro; senão 🔒); vazio → «Ainda não há palpites.».

## §SEG5 — Frente D: liderança reconstruída
`reconstruirLideranca(lances)` (exportada de `lances-flash.mjs`): ordena por `processadoEm` (empate pela chave), e depois de cada lance regista o dono do menor
valor com contagem 1. `estadoDoTitular` — `eLiderFinal` = vencedor **oficial** do marcador (EIP-55 tolerado); `foiLiderAlgumaVez` = replay **ou** líder final.
Nada é gravado nem exposto durante a edição. ⚠️ Limites: lances no mesmo milissegundo ordenam-se pela chave (arbitrário); lance sem `processadoEm` legível vai para o fim.

## §SEG6 — Testes + mutação
- Backend: `_tests/utac107e2-lances-flash.test.mjs` (17: A1–A6, D1–D4, E1–E7) + `_tests/utac107e2-ler-palpites.test.mjs` (10: C1–C10). JWT **real** (tokens assinados).
- Frontend: `src/__tests__/utac107e2-etiqueta.test.mjs` (16: B1–B12 + C1–C4), componente/hooks reais no Vite SSR; cablagem lida **sem comentários**.
- Suíte: **frontend 817/817 · backend 1088/1094 VERDE** (801 + 16 · 1061 + 27). `vite build` ✓ (para o scratchpad).
- **Mutação 17/17 RED** (`scripts/utac107e2-prova-mutacao.mjs`): valor em claro durante a edição · revela sem consolidar · meu-estado sem guarda · **anti-bot
  desligado** · laranja não registado · laranja = vermelho · ordem do lote · endereço do query · palpites revelados durante · nunca revelados · de todas as edições ·
  estado errado · etiqueta durante a edição · «SEU LANCE» colorido · Início sem gate · OP sem `revelado` · OP sem dados. Âncora tem de casar 1×; restauro por sha256.
- ⚠️ Erros dos MEUS instrumentos: (1) o heredoc expandiu `\r\n` ao corrigir o mutador (apanhado pelo `node --check`, refeito); (2) o mutador original tinha âncoras
  CRLF fixas e abortaria num checkout LF — tornado agnóstico antes do validador.

## §SEG7 — Verificação
- Suíte canónica final: **frontend 818/818 · backend 1095/1101 VERDE** (801 + 17 · 1061 + 34). `vite build` ✓. Mutação **25/25 RED** (restauro sha256).
- Dirigidos: `utac107e2-lances-flash` 23 · `utac107e2-ler-palpites` 11 · `utac107e2-etiqueta` 17.
- Transversal: `acao=verificar` → 403 (teste A5 + mutante M4); `.bak-*` intactos (5, fora do diff); `EM_BREVE_MODE = true`; `package*` intactos (lock sha256 `5b40f11c…`).
- ⚠️ Verificação em PRODUÇÃO **por fazer** — o deploy está bloqueado (§SEG9).

## §SEG8 — Validador
2 rondas, subagente em worktree próprio (`tmp-107e2-val/wt`, helper A13). Verbatim + tratamento: `_logs/UTAC107e.2_SEG8_VALIDADOR.md`.
- **1.ª ronda (`1798893`): PARCIAL** — (a)–(n) passam; **A1 ⚠️ alto**: «consolidado ≠ encerrado» — revelaria os valores de uma edição consolidada ainda a aceitar
  lances (ex.: o R-1 sintetizado, sem janela). **O meu desenho criava a fuga** — a premissa R18-A estava certa como sinal, faltava-lhe a guarda da janela.
  A2 custo/amplificação · A3/A4 lacunas de teste → **todos corrigidos** (`6a05324`).
- **2.ª ronda (`6a05324`): PARCIAL** — A1/A3/A4 confirmados (10 casos de metadata, nunca revelação com lance aceite); **R1 ⚠️ LGPD**: a cache da A2 não expirava
  e serviria o endereço real depois de uma exclusão de conta → **TTL 60 s** + teste com lance anonimizado; V23 (agendada) com teste (`e255003`).
  Correcção R1/V23 **não re-validada** em 3.ª ronda (o validador declarou que passaria a APROVADO).
- Registados, não corrigidos: lances no mesmo ms ordenam pela chave; o `lance-relampago` aceita lance se a leitura da edição falhar (pré-existente, fora do escopo).

## §SEG9 — Deploy + registo
| Item | Medido |
|---|---|
| Bundle em produção (antes) | `index-CjvvGF-9.js` — deploy automático `6ac4d313…` (commit_ref `5c1886a`, 10:53Z). O `index-CFzvYOmT.js` do 107e.1 foi o deploy MANUAL; o push redeployou o mesmo código com outro hash |
| `netlify deploy --prod` (foreground, 09:45 e 2 repetições, uma com `--debug`) | ⛔ **`JSONHTTPError: Forbidden`** em `api.createSiteDeploy` (antes de qualquer build/upload) |
| Diagnóstico (só leitura) | CLI autenticado (desafiogut), site ligado; site `disabled:false`, `locked:null`, `stop_builds:false`; conta `credit-pro`, `configurable_limits_exceeded: []` ⇒ causa **não identificada** do lado do executor (credencial/permissão — R5, do operador) |
| Deploy | **NÃO feito.** Não contornado. `package-lock.json` intacto (o build nem correu) |
| Push | Decisão do operador (R18-E, «push agora»): `5c1886a..1674bd8` às 12:57Z |
| Deploy automático do push | `6ac4f048…` **`error`** — «**Skipped due to account credit usage exceeded**» ⇒ **a causa do 403 do CLI é a conta SEM CRÉDITOS** (período 25/09→25/10; `plan_credits 3000`). O campo `configurable_limits_exceeded:[]` não o mostrava |
| Produção | **inalterada** (`5c1886a`, `index-CjvvGF-9.js`) — nada deste UTAC está no ar |
| **Deploy (após recarga de créditos, R18-F)** | `npx netlify deploy --prod`, **foreground**, 11:24:47 → 11:29:00, `CDN requesting 47 files and 2 functions` · **`Deploy is live!`** · deploy `6ac504c24e32204be13af4f0` |
| Produção depois | home 200 · health 200 · entry `index-CjvvGF-9.js` → **`index-3xsil5SO.js`** |
| Endpoints | `ler-palpites` sem token → **401** `token_ausente` (JSON) · `acao=verificar` → **403** `verificacao_indisponivel` (anti-bot intacto) · `acao=meu-estado` sem token → **401** · lista R-1 → 200 `{encerrado:false, ocultoAteConsolidar:true, lances:[]}` |
| Chunks | `EtiquetaEstadoLance-BzG6tbkB.js` (estados + `acao=meu-estado`) · `MercadoLances-DnW1_yze.js` e `PrivyRoot-D7CmN8UY.js` (Início) com a etiqueta · `OfertasProgramadas-CWrXSR5g.js` com `ler-palpites` e **sem** etiqueta (R18-D) |
| `package-lock.json` | sujo pelo build (`d1f12aaf…`) → arquivado fora do repo e **restaurado** (`5b40f11c…`); suíte depois do deploy **VERDE 818/818 · 1095/1101** |

**Duração:** ≈ 08:55 → 09:55 (≈ 1 h; HI5 2 h — dentro).
**Custo (¢/1M tokens, Opus 5.5: 400 in · 2000 out · 20 cache):** validador 1.ª ronda **187 599** tokens + 2.ª ronda **212 091** (reportados pelo harness) = **399 690** ⇒
entre **8,0 ¢** (tudo cache) e **799 ¢** (tudo output); **160 ¢** se tudo input fresco. Sessão principal **não medida** (Claude Code não expõe os tokens da própria sessão — `/cost`).

**Veredicto: UTAC107e.2 FECHADO — código validado, empurrado e EM PRODUÇÃO (11:29, após a recarga de créditos).** ~~Bloqueio anterior:~~ DEPLOY BLOQUEADO POR FALTA DE CRÉDITOS NETLIFY — com créditos (recarga ou 25/10) basta `netlify deploy --prod` (ou novo push) e a verificação em produção (ler-palpites 401, verificar 403, chunks com a etiqueta).
