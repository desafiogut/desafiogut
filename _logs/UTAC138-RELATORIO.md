# UTAC138 — Edição Especial Relâmpago, bónus +100, apuração instantânea, Top 10, Regulamento v6.1

Executor: Opus 5.5 · 2026-11-17/18 · baseline `8d216d2` → `e9fff51` (main, publicado) · deploy de produção `6afd3105…`

## Checklist do enunciado
| | Entrega | Estado |
|---|---|---|
| A | 400 pontos de lance aos testadores | ✅ **em produção** — 28 carteiras (`atividade_utilizadores`, R18-138-C), ref `recompensa-teste-v1`, idempotente (ensaiado 2× em ROLLBACK). Σ +11 200. Lista congelada em `scripts/utac138-recompensa-testadores.sql` |
| B | Edição Especial 19h–20h BRT com a arte | ✅ **em produção** — `ESPECIAL-RELAMPAGO1`, 30/11/2026 19:00–20:00 (22:00Z–23:00Z), «Fritadeira Elétrica Sem Óleo Quad Fry 4,2 L Elgin», arte no bucket público `artes-edicoes` |
| C | Bónus +100 pontos no Passe Relâmpago | ✅ PIX e Google Play, motivo `bonus-passe-relampago`, × N, 1× por compra; falha ⇒ desfaz e reembolsa |
| D | Painel de resultados 24 h + UI do Passe | ✅ web (Top 10 + vencedor); textos do Passe com o bónus. ⚠️ APK só com o v12 |
| E | Regulamento v6.1 + gate 3.5 + PDF/QR | ✅ `docs/REGULAMENTO-v6.1.md`, gate 3.5 (app+backend), GUTO no v6.1, `Desktop/REGULAMENTO-DesafioGUT-v6.1.pdf` + `QRCODE-Regulamento-v6.1.png` |
| F | AAB v12 (versionCode 12 / 1.2.0) | ⏸️ **adiado pelo operador** (R18-138-F: «vamos para a v12 posteriormente») |
| G | Apuração instantânea | ✅ cron (a cada minuto, depois da margem de fecho de 65 s) + 1.º acesso a `GET /resultado-edicao`; Blob `edicoes-resultados` |

## A especial no padrão das edições (pedido do operador durante o UTAC)
«A edição deve aparecer em Menor Lance Único e em Início, ocupando o espaço da edição relâmpago … não ter um próprio.»
- O `CardEdicaoEspecial` passou a desenhar o **`CartaoEdicao`** (o mesmo das outras edições): topo id + estado → arte na largura
  toda → faixa nome + tempo → acção. Saiu o layout próprio (caixa amarela, ícone pequeno, GUTO ao lado, cronómetro grande).
- **Início:** a especial ocupa o vidro «⚡ Relâmpago», com o mesmo botão «⚡ Dar lance».
- **Menor Lance Único:** a especial ocupa o cartão Relâmpago (também com o EM BREVE ligado), licita na edição dela, e a
  tabela por baixo é a dela. Verificado em produção: `Desktop/UTAC138-INICIO.png`, `Desktop/UTAC138-MENOR-LANCE-UNICO.png`.

## Decisões do operador (R18-138)
A arte com «17 a 30 de novembro» fica · B data 30/11 19h · C 28 testadores · D repor +100 (risco Gamified Loyalty aceite) ·
E push + deploy · F AAB v12 depois · G aceitar «3.4» do APK v11 até ao v12 · H consolidação on-chain espera a margem de
65 s · I retry de compra a meio credita o bónus só depois do corte (2026-11-18T04:00Z) · layout padrão nos dois ecrãs.

## Desvios do enunciado (declarados)
- A tabela Supabase `edicoes` não existe: as edições vivem no Blob `edicoes-metadata` (padrão MC94.1).
- O id `ESPECIAL-RELAMPAGO-1` é recusado pelo regex (`ESPECIAL-[A-Z0-9]+`) ⇒ `ESPECIAL-RELAMPAGO1`.
- Não há lista de testadores no `closed-testing/` ⇒ decisão do operador (as 28 com actividade).
- CSP `img-src` passou a aceitar o Storage do projecto Supabase (sem isso a arte não carregava no site).

## Validador adversarial (SEG4)
**APROVADO COM RESSALVAS** (`_logs/UTAC138_SEG4_VALIDADOR.md`). Corrigiu ele: margem de fecho 3 s → 65 s (lances pagos em voo
ficavam fora), e-mails fora do Top 10 público, mensagem 400 com «+200», Top 10 contraditório com o vencedor on-chain.
Os seus 6 pontos a escalar viraram as decisões G/H/I e as dívidas abaixo.
⚠️ Não re-validados: as R18-138-G/H/I e a mudança para o cartão padrão (`989b399`, `cb2748f`, `e9fff51`).

## Provas
- Backend **1499/1505** (0 falhas, 6 skipped); frontend **1346/1346**.
- Mutação **25/25** (+ M26 manual), md5 restaurado em todos (`_logs/UTAC138_SEG5_MUTACAO-FINAL.txt`).
- Produção: `GET /edicoes` mostra a especial em `agendadas`; `GET /resultado-edicao` → `{pronto:false, motivo:"agendada"}`;
  arte 200 image/jpeg; bundle com o contrato mainnet `0x0052477A…` e sem o contrato abandonado.

## Dívidas novas (`_logs/DEBT.md`)
DEBT-092 retirar o aceite «3.4» com o v12 · **DEBT-093 v6.1 por rever pelo jurídico e por registar no RTD** (Art. 6º reescrito
pelo executor; contradições apontadas pelo validador) · **DEBT-094 risco Gamified Loyalty do bónus** · DEBT-095 APK v11 sem o
UTAC138 até ao v12 · DEBT-096 `lances-flash` expõe e-mails durante a edição (pré-existente) · DEBT-097 limites declarados.

## O que vem a seguir
1. Rever o texto do v6.1 (Arts. 6º/7º) com o jurídico antes de o levar ao RTD.
2. UTAC do AAB v12 (versionCode 12 / 1.2.0): leva o Top 10, o cartão padrão e o gate 3.5 ao Android; depois retirar o «3.4».
3. No dia 30/11: o resultado e o Top 10 saem ~1–2 min depois das 20:00 (margem de fecho), e a consolidação on-chain logo a seguir.
