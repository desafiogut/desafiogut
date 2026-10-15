# UTAC110h.2 — COERÊNCIA: ECOQUILDO NA INDICAÇÃO + 3 SÍTIOS «+1 SENHA»
> Log consolidado. Executor: Hermes (deepseek-v4-flash). Baseline `3f5aac6` → commit `80ce770` (+ fecho).
> Tipo: produto/saneamento (backend + UI + GUTO + docs de UI). Data: 2026-10-15.

---

## 1. O que este UTAC resolveu

| divergência (do enunciado) | estado depois |
|---|---|
| **D1** — o backend não creditava ECOQUILDO por indicação (o Art. 51º do v5 manda +2 ao indicante e +1 ao indicado) | **RESOLVIDA** — `_lib/fontes-lance.mjs::creditarIndicacao` credita os dois, em paralelo com os +50 pontos de lance (R18-110h.2-1/-2) |
| **D2** — 3 sítios ainda diziam «+1 senha» e contradiziam o GUTO e o Regulamento | **RESOLVIDA** — `PainelIndicacao.jsx`, `ChatbotWidget.jsx` e `mensagemInducao` de `_lib/referral.mjs` (R18-110h.2-3) |
| **D3** — pendências menores (Privacidade «senhas», `pt.js` «torneio», caixa de contacto do gate) | **RESOLVIDA** (R18-110h.2-5) |

## 2. Desvios e decisões declarados (GATE 1/2/12)

1. **⚠️ O sítio do crédito não era o do enunciado.** O §4 autorizava `_lib/referral.mjs` e o §7-A1 dizia que
   aí vivia o `creditarIndicacao` «que credita os +50 pontos». **Medido (SEG-1):** os +50 vivem em
   `_lib/fontes-lance.mjs::creditarIndicacao`, chamado pelo endpoint `referral.mjs:171` com endereços
   **REAIS**; o `_lib/referral.mjs::registrarConversao` recebe endereços **MASCARADOS** (endpoint :160-163,
   DEBT-025) e o crédito lá ficaria **verde e inerte**. **PARADO** (GATE 12) e escalado; o operador
   autorizou o sítio correcto (**R18-110h.2-A**): `_lib/fontes-lance.mjs`.
2. **⚠️ A assinatura real de `creditarEcoQuildo` é `(endereco, valor, motivo, ref)`** — `ref` obrigatória
   (idempotência) e `motivo` numa lista FECHADA. A letra do §7-A2 (`creditarEcoQuildo(indicante, 2,
   "indicacao")` e motivo `"indicacao-recebida"`) devolveria `REF_INVALIDA`/`MOTIVO_INVALIDO` **em
   silêncio** (fail-soft): um UTAC «verde» que não creditava nada. Executou-se a INTENÇÃO: refs explícitas
   `eco-indicacao:<indicado>` e `eco-indicacao-recebida`, motivo `indicacao` (já existente na lista ⇒
   **zero alterações** a `_lib/eco-quildo.mjs`).
3. **Limite mensal:** o ECOQUILDO ao **indicante** respeita o mesmo `LIMITE_INDICACOES_MES = 10` dos +50
   pontos; o do **indicado** é independente (como os +50 e a senha do 110f). Proposto no SEG-1 e aceite
   pelo operador (R18-110h.2-A).
4. **Lastro:** `reserva_rs_centavos` é **derivada** (`aplicarLastro`), nunca somada à mão (§7-A3 pedia
   «+300 à mão»). Usa-se `registarEmissaoNoLastro(emitido real)` — 3 no caso normal, 1 quando o indicante
   está no limite — e, se o lastro falhar, as emissões daquele passo são **revertidas** (Art. 50º).
5. **Contador `senhas_ganhas` deixou de ser exibido** no painel e no chat: mede o bónus on-chain do modelo
   antigo (morto, DEBT-025) e mostrá-lo sob o rótulo da recompensa nova seria falso. O campo continua a vir
   da API (o endpoint está fora do escopo autorizado) — **pendência P1**.
6. **`FeedbackLance.jsx:136` (fallback i18n) foi corrigido fora da lista de autorizações** porque o
   contrato «dicionário == fallbacks» (`ativos-i18n.test.mjs`) o exigia: sem isso a suíte ficava VERMELHA.
   Ministrado ao operador no relatório.
7. **`utac109h2-carteira.test.mjs` e `utac110h1-guto-indicacao.test.mjs` actualizados** (testes de UTACs
   fechados): guardavam a **copy antiga** («🎁 Senhas ganhas») e a **proibição** de o GUTO falar de
   ECOQUILDO. Ambas as guardas ficaram falsas por desenho com as decisões R18-110h.2-3/-4. As restantes
   asserções mantêm-se intactas; o texto antigo fica à vista no git (GATE 15).

## 3. Provas

| prova | resultado medido |
|---|---|
| Suíte (baseline) | frontend **1077/1077** · backend **1232/1238** (confirmado antes de mexer) |
| Suíte (depois) | frontend **1088/1088** · backend **1246/1252** — VERDE |
| Testes novos | **25** (8 backend FRENTE A, 6 backend GUTO/notificação, 6 front UI/notificação, 5 front pendências) + **4** de render real |
| Prova de mutação | `_tests/utac110h2-prova-mutacao.mjs` — **23/23 PROVADOS**, md5 restaurado em todos (2 mutantes sobreviveram na 1.ª ronda e corrigiram o instrumento) |
| Bidirecional | em cada frente: o texto/código antigo reprova e o novo passa (GATE 8) |
| Render real | `src/__tests__/utac110h2-render-indicacao.test.mjs` — painel renderizado nos 2 ramos de layout |
| Capturas | `_logs/utac110h.2-browser/` — painel 375 e 1280 (sem overflow), `/privacidade` 375/1280, gate 375/1280 |
| RAM (A14) | 241 MB → trim `liberar-ram.ps1` (pico 2093) → **1943 · 1960 · 1947 MB** ⇒ portão cumprido |
| Disco | 15 GB livres (≥ 5 GB) |
| Validador adversarial | ver §4 |

## 4. Validador adversarial (SEG5)

Subagente independente, worktree próprio em `C:/Users/Moltbot/tmp-utac110h2-val/wt` (commit `80ce770`,
4 junctions pela regra A13), instruído a **TENTAR REFUTAR**. Relatório integral:
`_logs/UTAC110h.2_SEG5_VALIDADOR.md` (541 linhas).

**VEREDICTO: APROVADO COM RESSALVAS — 0 alegações refutadas** (8/8 confirmadas com prova reproduzível).
Ele reproduziu a suíte, os 19+11 testes dirigidos e a prova de mutação (23/23) e fez **12 mutantes
próprios**, dos quais **3 sobreviveram** — todos viraram acção:

| achado | o que era | tratamento |
|---|---|---|
| **⚠️-1** (V13) | a minha reescrita da guarda numérica do GUTO (`utac110h1-guto-indicacao.test.mjs`) trocou a varredura genérica `+\d+` por duas escopadas: «+7 bónus» inventado passava a escapar (A/B medido: guard antigo `fail 2`, novo `fail 0`) | **CORRIGIDO**: reposta a varredura genérica com conjunto fechado `{50, 2, 1}`; mutante V13 acrescentado à prova (fica RED). Erro meu de instrumento, declarado |
| **⚠️-2** | na **dupla falha** (lastro falha **e** a reversão também falha) o ECOQUILDO ficava sem lastro e **sem alerta** (violação do Art. 50º) — o `comprar-passe-tipado.mjs` alerta, eu não alertava | **CORRIGIDO**: `reverterEcoQuildo` passa a ser inspeccionado (`rev.ok && rev.revertido`) e, se falhar, `captureSecurityAlert("indicacao_eco_reversao_falhou", …, "error")`; o retorno ganha `reversaoCompleta` |
| ℹ️-1 (V7) | o ramo anti-fraude por IP não estava pinado quanto ao ECO/pontos | **CORRIGIDO**: teste **R9** novo (3.º pedido do mesmo IP → vincula, não credita pontos nem ECO, lastro parado); mutante V7 → RED |
| ℹ️-4 (V10, V12) | as guardas do 3.º card e da caixa de contacto pinavam o FICHEIRO e uma fatia de 280 caracteres, não o ELEMENTO | **CORRIGIDO**: o teste de render passa a verificar o **bloco do card** (`+2`, nunca `+1`); a guarda do gate passa a varrer o **componente inteiro** sem comentários; mutantes V10 e V12 → RED |
| ℹ️-2, ℹ️-3, ℹ️-5 | `registrarConversao` ainda credita +1 senha on-chain (DEBT-025, declarado); `senhas_ganhas` continua na API mas não é renderizado; `creditarIndicacao(A, inválido)` credita o indicante (assimetria herdada do 110f, **inalcançável** por HTTP — o endpoint valida o endereço antes) | **declarados** (P2/P5 e nota) — arrumar exige decisão sobre a DEBT-025 |
| **lacuna de implantação** (sonda P6) | se a linha única do lastro (`eco_quildo_lastro id = 1`, migração `20261014_utac110e_eco_quildo.sql`) **não existir em produção**, todo o ECO é revertido e o crédito fica inerte (`lastro:LASTRO_AUSENTE`) | **declarado como risco de implantação** — o comportamento é o correcto (falha FECHADO, nunca ECO sem reserva, Art. 50º). Não foi possível verificar produção neste UTAC (sem acesso a Supabase) ⇒ **pendência P6** |

Re-validação depois das correcções: **não** despachado um 2.º validador (precedente da série: correcções
pós-veredicto ficam declaradas como **NÃO re-validadas**). O que as substitui: os 4 mutantes do validador
foram acrescentados à prova de mutação e ficam **RED** (27/27 PROVADOS), e a suíte subiu para
**1092/1092** e **1247/1253** VERDE.

## 5. Pendências declaradas (GATE 11)

- **P1** — contador de recompensa numérico no painel/chat exige campo novo em `GET /referral?acao=meu-codigo`.
- **P2** — `gerarRelatorioIndicacoes` (relatório **admin**) continua a dizer «Senhas creditadas: N», contando
  o crédito on-chain legado. Fora do R18-110h.2 (fala dos 3 sítios do utilizador); depende da decisão da
  DEBT-025.
- **P3** — «torneio» continua em comentários (`FeedbackLance.jsx:4,11`), nas **chaves** i18n
  `ativos.torneio.*` e em nomes de ficheiro (`PainelTorneio.jsx`). Nada é texto visível.
- **P4** — a data «Última atualização: 15 de agosto de 2026» da Privacidade não foi actualizada (não pedido).
- **P5** — `_lib/referral.mjs` continua a ter o crédito on-chain legado (+1 senha) em `concederBonus`, vivo
  apenas pelo caminho `comprar-senhas` (DEBT-025, aberta). Não foi tocado: o UTAC só autorizou o **texto**
  nesse ficheiro.
- **P6** (risco de implantação, levantado pela sonda P6 do validador do SEG5) — o ECOQUILDO da indicação
  **depende** da linha única do lastro (`public.eco_quildo_lastro`, `id = 1`, migração
  `desafio-gut/frontend/supabase/migrations/20261014_utac110e_eco_quildo.sql`). Se a migração não estiver
  aplicada em produção, `aplicarLastro` devolve `LASTRO_AUSENTE`, as emissões são revertidas e o crédito
  fica **inerte** — comportamento **correcto e deliberado** (falha FECHADO: nunca ECOQUILDO sem reserva,
  Art. 50º), mas o operador tem de **confirmar a migração aplicada** para o crédito existir de facto.
  Não foi verificado neste UTAC (sem acesso a Supabase).

## 6. Ficheiros tocados (18 no commit `80ce770` + os do fecho)

Produção: `_lib/fontes-lance.mjs` · `_lib/referral.mjs` · `_lib/guto-perfis.mjs` ·
`src/components/PainelIndicacao.jsx` · `src/components/ChatbotWidget.jsx` · `src/components/TermosConsentimento.jsx` ·
`src/components/meus-ativos/FeedbackLance.jsx` · `src/pages/Privacidade.jsx` · `src/i18n/pt.js`.
Testes: `_tests/utac110h2-eco-indicacao.test.mjs` · `_tests/utac110h2-guto-eco.test.mjs` ·
`_tests/utac110h2-prova-mutacao.mjs` · `_tests/utac110h1-guto-indicacao.test.mjs` ·
`src/__tests__/utac110h2-indicacao-copy.test.mjs` · `src/__tests__/utac110h2-pendencias.test.mjs` ·
`src/__tests__/utac110h2-render-indicacao.test.mjs` · `src/__tests__/utac109h2-carteira.test.mjs`.
Logs: `_logs/UTAC110h.2_SEG-1_MEDICAO.md` · `_logs/UTAC110h.2_SEG0_FRENTE-A_ECOQUILDO.md` ·
`_logs/UTAC110h.2_SEG1-3_FRENTES-B-C-D.md` · este ficheiro.

## 7. Intocados (verificado por `git diff 3f5aac6..80ce770 --stat`)

`docs/REGULAMENTO-v5.md` · `docs/GUTO-REGULAMENTO.md` · `docs/regras-oficiais.md` · contrato on-chain
(`contracts/`, `_lib/contract.mjs`, `ignition/`) · env vars / `EM_BREVE_MODE` · Google Play Billing ·
`_lib/eco-quildo.mjs` (nenhuma alteração — o motivo `indicacao` já existia).
