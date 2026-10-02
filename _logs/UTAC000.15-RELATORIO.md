# UTAC000.15 — Relatório: arnês de runtime do Provider (DEBT-010)

**Data:** 2026-10-02 · **Executor:** Claude Code (Opus 5.5) · **Base medida:** `49bc141` = `origin/main` = HEAD
**Commits:** `ab244aa` (arnês) + commit da 2.ª ronda/fecho
**VEREDICTO: CONCLUÍDO** — DEBT-010 **fechada**; validador **APROVADO COM RESSALVAS** (⚠️ corrigidas). **Zero código de produção.**

---

## 1. SEG-1 — o buraco medido (`_logs/UTAC000.15_SEG-1_MEDICAO.md` + `_EVIDENCIA.txt`)
- Suíte baseline **664/664 · 967/973**.
- **O M12 passava a suíte frontend INTEIRA (664/664 VERDE)** — a DEBT-010 dizia «5/5»; o buraco era toda a suíte.
- **Premissa do spec corrigida:** o Provider **importa-se** (41 s, Privy real); o que falha é **executar**: `useLocation()` fora de `<Router>` (l. 371), Privy sem Provider, RPC em `web3.js` — e, medido no SEG0, o **`@fingerprintjs` real fica em ciclo de `wait(50)` sem DOM**: os testes passavam e o processo **nunca terminava** (rc=124; sonda de temporizadores apontou `fp.cjs.js:22`).

## 2. SEG0 — o arnês (`src/__tests__/_arnes-provider.mjs` + `_stubs-provider/`)
1. Vite SSR (A12: `_ponte-ssr.mjs` primeiro — **usado, não alterado**) carrega o `AppContext.jsx` **real**.
2. O `AppProvider` real corre no **`_hook-runner.mjs`** (MC94): os `useEffect` **reais** correm.
3. **Duplos só nas fronteiras de I/O** (por `resolve.alias`): Privy (visitante pronto) · `web3.js` (sem RPC; `LanceDado` emitível) · `fingerprint.js` · leitura on-chain do resultado oficial (o **hook `useResultadoOficial` real corre**) · `CardLance` · `useRecursosApp` · `dompurify`. O **`apiGet` é real** (só o `fetch` é duplo) — é por ele que chegam os lances locais.
4. O router recebe valor pelos contextos internos do react-router (`UNSAFE_LocationContext/NavigationContext`), como um `<Router>` faria.
5. A árvore que o Provider devolve é renderizada em SSR com a **página real** (`MercadoLances`) como filha.
6. Modo `leilaoAberto` (`EM_BREVE_MODE = false`) para exercitar o overlay do fim.
**Sem dependências novas; `_render.mjs`, `vite.config.js`, `package.json` intocados.**

## 3. SEG1 — o teste (`src/__tests__/utac0015-provider-cablagem.test.mjs`, 6 casos)
- CONTROLO: os lances locais chegam ao Provider pelo efeito real; sem oficial → reserva local.
- Com oficial: o contexto expõe EU/300 e a página lê-o (não o local OUTRO/100); **o 1.º render não tem vencedor** (o oficial chega depois, assíncrono).
- Programado (com/sem oficial): 4 `LanceDado` on-chain, com repetidos.
- `MercadoLances` com o leilão aberto: o **Provider real** encerra, acende o relâmpago e, 1200 ms depois, **abre o overlay** — que mostra o OFICIAL.
- EM BREVE real: o mesmo fim **não** abre o overlay (runtime do gate do UTAC000.14).

**Provas:** M12 contra a suíte inteira **664/664 VERDE → VERMELHO 3** · **mutação 8/8 RED** (M12, M12b, M16, M11 + V1/V2/V9/V11 do validador) com restauro md5 idêntico · anti-flaky (espera por condição, não relógio fixo) **30/30 sequencial + 20/20 sob carga** · suíte **670/670 · 967/973**.

## 4. SEG3 — validador adversarial (`_logs/UTAC000.15_SEG-3_VALIDADOR.md`)
**APROVADO COM RESSALVAS.** Confirmou que o arnês não é vácuo (14 mutantes dele, 10 mortos na 1.ª versão) e sem handles pendurados. As ⚠️ que levantou, **corrigidas**:
- **⚠️1** o duplo do oficial devolvia o valor **no 1.º render** (o real só depois) ⇒ «congelar o 1.º render» (V11 = o defeito da DEBT-009) passava. Agora o hook **real** corre ⇒ V11 → 3 RED.
- **⚠️2** a modalidade `programado` não era coberta ⇒ V1 sobrevivia. Agora coberta ⇒ RED.
- **ℹ️** fixture de ponto único (V2, V9) e avisos nunca verificados ⇒ corrigidos.
As correcções **não passaram por 2.ª validação** (declarado).

## 5. O que NÃO está provado (declarado)
`Dashboard` e `MeusAtivos` (lêem o oficial por si — o M12 é invisível neles), ramos com sessão Privy, a fidelidade do condutor de hooks (deps/agendamento implementados pelo condutor, não pelo React). V1/V2/V9 são apanhados por **um** teste só.

## 6. Erros meus (declarados)
1. Duas edições por script falharam por escapes da shell (âncoras com `\\.` e `\r\n` mutilados) — os scripts abortaram **antes** de escrever (nada corrompido); refeitos por ficheiro (`Write`).
2. Deixei uma asserção vácua (`>= 0`) no 1.º rascunho do teste — retirada antes de correr.
3. A 1.ª versão esperava 1400 ms fixos pelo temporizador de 1200 ms — trocada por espera por condição (lição do UTAC000.13).

## 7. Custo
**USD não medido** — sessão Claude Code, sem `state.db`; e **não é sessão dedicada** (mesma conversa dos UTAC000.14/16). Medido: validador **109 996 tokens** (19 chamadas, 613 s).

## 8. Deploy
Nenhum necessário (só testes). Push pendente de autorização do operador.
