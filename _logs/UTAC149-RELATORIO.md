# UTAC149 — Edição Especial Programada (palpite) — RELATÓRIO (2026-11-26, Opus 5.5)

**Estado: PUBLICADO** — commits `e86c865`+`c003716` com **push** para main (`a023a5d..c003716`, pedido do operador), deploy `6b07f8cb` (bundle `index-BZIsVHZE.js`).

## Checklist
- [x] Arte no Supabase: `artes-edicoes/especial-palpite-1.jpg` (200, sha256 = o ficheiro do Desktop).
- [x] Edição criada no Blob `edicoes-metadata`: **`ESPECIAL-PALPITE1`**, `tipo:"programado"`, 25/11 00:00 → 09/12 23:59 BRT, `status:"aberto"`.
- [x] Início: no vidro «🎫 Programada», abaixo do «⚡ Relâmpago» (`UTAC149-INICIO.png`).
- [x] Ofertas Programadas: cartão de palpite + `FormularioAcao` + tabela «📋 Palpites» com selo 🟢 Aberta e valores 🔒 (`UTAC149-OFERTAS-PROGRAMADAS.png`).
- [x] Nenhum componente, sub-card ou estilo novo.
- [x] Suíte VERDE (1359/1411 · 1528/1617) + deploy. AAB não gerado.

## Desvios do enunciado (decididos pelo operador, R18-149-A..E)
- Id `ESPECIAL-PALPITE1`: o `ESPECIAL-PALPITE-1` falhava o regex e a edição ficava invisível.
- Layout = o da Programada (`CartaoEdicao` + `FormularioAcao`), não o `CardEdicaoEspecial` (preso à Relâmpago).
- Tabela = `TabelaPalpites`, o padrão da aba OP, que já oculta os valores (a `TabelaLances` é a do MLC).
- Produto «air fryer». Sem nome dado, reusei o da Relâmpago.
- RAM: Edge, WhatsApp e Widgets fechados (1033 → 1666 MB).

## O que mudou no código
Guardas de `tipo` para a especial palpite não entrar no circuito Relâmpago: slot ⚡ do Início e do MLC, Top 10, cron de encerramento (só fecha, sem apuração nem gas on-chain), avisos de líder e anúncio do GUTO. Estado da especial palpite lido da própria edição (`estadoEdicaoProgramada`). A especial Relâmpago foi verificada intacta em produção.

## Pendências
DEBT-110 (validador adversarial por correr) · DEBT-111 (nome do produto, apuração manual e que lances contam, texto «+2 pontos», gate «v6.0», APK). Para desfazer: `node scripts/utac149-seed-especial-palpite.mjs --reverter`.

## SEG4 — validador adversarial (2026-11-26)
**APROVADO COM RESSALVAS** (`_logs/UTAC149_SEG4_VALIDADOR.md`). O validador corrigiu 3 ⚠️ no worktree dele, cada um com teste e mutante: palpite aceite depois de 09/12 (o cron não fecha a edição em produção), lance aceite na especial palpite pelo `lance-relampago`, e cartão «Encerrada» com o formulário activo. Também fechou lacunas de teste. Integração por cherry-pick (`0952ae5..db68c49`), suíte em main **1369/1421 · 1535/1624 VERDE**, deploy **`6b080a6c`** (bundle `index-C9FRH1jW.js`), com push. Pendentes: DEBT-111 (inclui a ⚠️4: que lances conta a apuração) e DEBT-112 (cron das especiais cego em produção, anterior a este UTAC).
