# UTAC110h.2 · SEG1–SEG3 — FRENTES B, C e D
> 3 sítios «+1 senha» (R18-110h.2-3) · GUTO com os dois créditos (R18-110h.2-4) · pendências menores (R18-110h.2-5).
> Baseline `3f5aac6` → commit `80ce770`. Suíte: frontend **1088/1088**, backend **1246/1252** (era 1077 e 1232).

---

## FRENTE B — os 3 sítios «+1 senha»

| sítio | antes (medido no SEG-1) | depois |
|---|---|---|
| `src/components/PainelIndicacao.jsx:87` (convite partilhado) | «…nós dois ganhamos **+1 senha**.» | «…você ganha +50 pontos de lance e +1 ECOQUILDO, e eu ganho +50 pontos e +2 ECOQUILDO.» |
| `src/components/PainelIndicacao.jsx:163` (parágrafo) | «1º lance, vocês dois ganham **+1 senha!**» | «Quando um amigo cria a conta com o seu código, você ganha **+50 pontos de lance e +2 ECOQUILDO** (e ele ganha +50 pontos e +1 ECOQUILDO).» |
| `src/components/PainelIndicacao.jsx:225-232` (3.º card) | «🎁 **Senhas ganhas**» + contador `dados.senhas_ganhas` | «🎁 **Recompensa por indicação**» + «+50 pontos de lance e +2 ECOQUILDO» |
| `src/components/ChatbotWidget.jsx:183` (card do chat) | `stat("Senhas ganhas", indicacao?.senhas_ganhas)` | `stat("Recompensa por indicação", "+50 pontos de lance e +2 ECOQUILDO")` |
| `netlify/functions/_lib/referral.mjs:142-155` (`mensagemInducao`) | «+1 senha creditada!» / «+N senhas creditadas.» | «+50 pontos de lance e +2 ECOQUILDO creditados!» / «+N×50 pontos de lance e +N×2 ECOQUILDO creditados.» |

**Decisões declaradas dentro da frente (não inventadas — justificadas pelo que o SEG-1 mediu):**

1. **O contador `senhas_ganhas` deixou de ser MOSTRADO** (painel e chat). Ele mede o bónus on-chain do
   modelo antigo (`referral-bonus.total`, alimentado só por `concederBonus`) — morto no caminho do
   endpoint (DEBT-025) e alheio ao modelo do v5. Mostrá-lo sob o rótulo «ECOQUILDO» seria **mentir**
   (o número não é ECOQUILDO); mantê-lo sob «Senhas ganhas» contradiz o GUTO e o Regulamento. O campo
   continua a vir da API (o produtor é o endpoint, FORA do escopo autorizado) — só não é exibido.
   ⇒ **Pendência P1** (abaixo): um contador real de recompensa exige mexer no endpoint.
2. **`mensagemInducao` usa `n × 50` e `n × 2`.** O contador `n` só conta conversões **creditadas**
   (`registrarConversao` grava a indução apenas quando o bónus entrou), logo os produtos são exactos.
3. **O `_lib/referral.mjs` NÃO foi tocado no crédito** (só no texto) — como o operador fixou (R18-110h.2-A).
   O comentário do topo do ficheiro mantém a descrição do crédito on-chain legado (ele existe em
   `concederBonus`), mas diz explicitamente que o TEXTO visível deixou de o prometer.
4. **`src/i18n/pt.js`**: mudou só o **valor** de `ativos.lance.aviso`. As **chaves** `ativos.torneio.*`
   (7) ficam: renomeá-las partiria os consumidores (e o enunciado pede o valor, não a chave).

**Provas (FRENTE B)** — `src/__tests__/utac110h2-indicacao-copy.test.mjs` (6 testes):
- ZERO `\bsenhas?\b` no **código** dos 2 componentes (comentários removidos pelo extractor `codigo()`);
- o painel/chat dizem «+50 pontos de lance» **e** «+2 ECOQUILDO»;
- o convite partilhado diz também o que o **amigo** ganha («+1 ECOQUILDO»);
- `dados.senhas_ganhas` deixou de ser renderizado;
- a **notificação** (B3) diz os dois créditos, sem «senha», com `n=1` → +50/+2 e `n=3` → +150/+6;
- **BIDIRECCIONAL**: as 6 cópias antigas (verbatim) são reprovadas pelo verificador, incluindo a cópia do
  UTAC110h.1 (já sem «senha», mas sem ECOQUILDO) — o instrumento não se contenta com «não diz senha».
- **RENDER REAL** — `src/__tests__/utac110h2-render-indicacao.test.mjs` (4 testes): o painel é
  renderizado (SSR, `_servidor-teste.mjs` + duplo do `AppContext` por alias) nos **dois** ramos de layout
  (`isMobile` true/false) e o HTML contém a copy nova, não contém «senha», e o **controlo positivo** prova
  que o instrumento distingue o estado deslogado (que NÃO mostra a recompensa).

## FRENTE C — o GUTO (`_lib/guto-perfis.mjs`, `indique_e_ganhe`, 4 perfis)

| perfil | texto depois |
|---|---|
| visitante | «…você ganha **+50 pontos de lance e +2 ECOQUILDO** (e o seu amigo ganha **+50 pontos de lance e +1 ECOQUILDO**). 😊» |
| comum | «…você ganha +50 pontos de lance e +2 ECOQUILDO na hora (e o seu amigo ganha +50 pontos de lance e +1 ECOQUILDO), até 10 indicações por mês. Código: X.» |
| corporativo | «…: +50 pontos de lance e +2 ECOQUILDO para si, +50 pontos de lance e +1 ECOQUILDO para o indicado, creditados no cadastro (até 10 indicações creditadas por mês).…» |
| admin | «…Recompensa: +50 pontos de lance e +2 ECOQUILDO ao indicante, +50 pontos de lance e +1 ECOQUILDO ao indicado (até 10 por mês por indicante).» |

- A **pendência** que o UTAC110h.1 tinha deixado escrita no código («o ECOQUILDO ainda não está ligado no
  backend — quando estiver, este texto muda com ele») **fechou**: com a FRENTE A ligada, o texto mudou ✓.
- Regra de redacção adoptada e documentada no ficheiro: **escrever sempre «+N pontos de lance» por extenso**,
  porque os verificadores varrem `+N` e amarram cada número às constantes (achados X9/X10 do SEG4 do 110h.1).
- **Provas**: `_tests/utac110h2-guto-eco.test.mjs` (6 testes) — os 4 perfis dizem os 2 créditos; os números
  batem com as **constantes do código** E com o **Art. 51º lido de `docs/REGULAMENTO-v5.md`** (o teste faz
  o parsing da frase do Regulamento — se o v5 mudar, o teste cai antes de o GUTO mentir); a **ORDEM**
  («1.º ECOQUILDO dito = indicante = +2») é verificada; BIDIRECCIONAL contra as 4 respostas do 110h.1.
- **Alteração declarada em teste de UTAC FECHADO**: `_tests/utac110h1-guto-indicacao.test.mjs` — o
  verificador dele exigia o **silêncio** sobre ECOQUILDO («promete ECOQUILDO (Art. 51º ainda não ligado)»)
  e o teste «TODOS os números» assumia que **todo** `+N` era `PONTOS_INDICACAO`. Com o crédito ligado
  (R18-110h.2-4) as duas asserções ficaram **falsas por desenho**: passou a EXIGIR os dois créditos, com
  os números do ECOQUILDO também amarrados às constantes, e a guarda antiga ficou à vista no git (GATE 15).
  As 4 asserções originais (sem senha, limite mensal, verbatim antigos) **mantêm-se intactas**.

## FRENTE D — pendências menores

| # | ficheiro | antes | depois |
|---|---|---|---|
| D1 | `src/pages/Privacidade.jsx:78,99,108` | «produtos/senhas», «compras de **senhas**», «saldo de **senhas**» | «adquirir **Passes Desafio**», «compras de **Passes Desafio**», «saldo de **Passes Desafio**» (vocabulário do v5.0) |
| D2 | `src/i18n/pt.js:100` | «Projeção pela regra do **torneio**.» | «Projeção pela regra da **competição**.» |
| D3 | `src/components/TermosConsentimento.jsx:164-169` | e-mail **·** 📞 (92) 98428-5774 **·** 🌐 www.grupouniaoetrabalho.com.br | «📧 Dúvidas: desafiogut01@gmail.com» (Art. 69º: «exclusivamente através do e-mail») |

**Achado fora do escopo declarado, resolvido por exigência de contrato (⚠️ declarado):**
`src/components/meus-ativos/FeedbackLance.jsx:136` continha o **fallback** do mesmo aviso i18n, com «regra
do torneio». O contrato «dicionário pt == fallbacks, entrada a entrada» (`src/i18n/__tests__/ativos-i18n.test.mjs`)
tornou a correcção OBRIGATÓRIA: com `pt.js` corrigido e o fallback não, a suíte ficou VERMELHA (medido: 1
falha). Corrigiu-se o fallback (1 palavra) e registou-se aqui — o ficheiro **não estava** na lista de
autorizações; a alternativa era deixar a suíte vermelha. **Pendência P3** (abaixo) para o resto das
ocorrências de «torneio» que são só comentários.
`TermosConsentimento.jsx` manteve o texto a começar por «Dúvidas:» de propósito: é a forma que a guarda
`src/components/__tests__/dadosPagamento.test.mjs:48` fixa (lição GATE 4: não partir uma guarda que funciona).

**Provas (FRENTE D)** — `src/__tests__/utac110h2-pendencias.test.mjs` (5 testes): zero `\bsenhas?\b` na
Privacidade (comentários removidos antes de medir); nenhum **valor** i18n diz «torneio» e as chaves
`ativos.torneio.*` continuam lá; a caixa de contacto mostra o e-mail e NÃO mostra telefone nem site (e o
Art. 69º é lido do ficheiro do Regulamento); controlo positivo que apanha a caixa antiga; BIDIRECCIONAL
com os textos verbatim de `3f5aac6`.

## MUTAÇÃO (GATE 7) — `_tests/utac110h2-prova-mutacao.mjs` → **23/23 PROVADOS** (md5 restaurado em todos)

10 mutantes da FRENTE A (backend), 3 do GUTO (backend) + 2 da notificação (backend), 6 de UI (frontend:
painel ×4, chat, e as 3 pendências = D1/D2/D3). Exemplos: número do ECOQUILDO trocado (fail=10), papéis
trocados (fail=6), motivo fora da lista fechada (fail=5), sem lastro (fail=5), sem reversão do lastro (fail=1),
GUTO sem ECOQUILDO (fail=3), painel de volta a «+1 senha» (fail=1..2), caixa de contacto com telefone (fail=1).

**⚠️ Dois mutantes SOBREVIVERAM na 1.ª ronda e o achado corrigiu o instrumento** (é para isto que a prova
existe): (a) trocar os papéis no perfil **admin** do GUTO passava, porque o verificador olhava só aos
NÚMEROS presentes; (b) os mutantes da **notificação** sobreviviam porque a guarda da notificação vivia num
ficheiro de teste do **frontend** e o mutador corria o lado **backend**. Correcções: um teste novo de
**ORDEM/papéis** no GUTO e a mudança da guarda da notificação para `_tests/` (backend). Segunda ronda: 23/23.

## Pendências (não executadas, declaradas — GATE 11)

- **P1** — o contador de recompensa do painel/chat precisa de um campo novo na resposta de
  `GET /referral?acao=meu-codigo` (endpoint **fora** do escopo autorizado). Hoje o painel mostra a
  recompensa em texto, não em número.
- **P2** — `_lib/referral.mjs::gerarRelatorioIndicacoes` (relatório **admin**, não visível ao utilizador)
  continua a dizer «Senhas creditadas: N», contando o crédito on-chain legado. Fora do escopo do R18-110h.2
  (que fala dos 3 sítios do utilizador); arrumar exige decidir o que fazer com esse crédito (DEBT-025).
- **P3** — «torneio» continua em **comentários** de `FeedbackLance.jsx:4,11` e no prefixo das **chaves** i18n
  `ativos.torneio.*` (`pt.js:60-68`) e nos nomes de ficheiro (`PainelTorneio.jsx`). Nenhum é texto visível;
  renomear chaves/ficheiros é um saneamento com dono próprio.
- **P4** — a página `/privacidade` mostra «Última atualização: 15 de agosto de 2026»; a copy mudou agora.
  Actualizar a data da política é decisão do operador (não foi pedido neste UTAC).
