# UTAC136 — Backend alinhado ao Regulamento v6.0 (sem frontend, sem AAB) — FECHADO

**Commits:** `9936e9e` (frentes A-C + testes) · `95ca244` (correcção do validador, cherry-pick do `aab3068`) · `f11f6d9` (logs) + fecho.
Push `029fbe3..f11f6d9` para `origin/main` (incluiu o `f08b572` do UTAC133, R18-136-4). **Deploy de produção `6af696fce63ac4fd6f9c3314`**
(rascunho validado antes: `6af69571…`).

## Checklist
| Item | Estado | Prova |
|---|---|---|
| +200 pontos de lance removidos da compra do Passe | ✅ | cadeia `comprar-passe-tipado.mjs` sem passo de lance (PIX + Google); testes 110d B1/B8/B9, 110i1, 110n B1/B2, 136 USO; mutante M3 RED |
| Fidelidade por Passe = 1 | ✅ | `PONTOS_FIDELIDADE_POR_PASSE = 1`; mutante M1 RED (19 falhas) |
| Palpite sem consumo de Passe | ✅ | `registar-palpite.mjs`; `utac136-palpite-gratis` (inventário a 0 ⇒ 201, 0 RPCs); mutante M4 RED |
| ECOQUILDO = R$ 0,50 | ✅ | `CENTAVOS_POR_ECOQUILDO = 50`; reserva de produção recalculada 1800 → 900 (CAS, R18-136-3); mutante M2 RED |
| Conversão 50 ECOQUILDO → 1 Passe | ✅ | `_lib/conversao-eco-passe.mjs` nos 3 emissores; 12 testes + indicação; concorrência 10× ⇒ 2 Passes; mutantes M5-M12 RED |
| Suíte de testes verde | ✅ backend | **1472/1478 VERDE** (6 skipped pré-existentes). ⚠️ Frontend: guarda `utac110j5 «P»` VERMELHA de propósito (DEBT-089) |
| Deploy do backend | ✅ | `netlify deploy --prod --build`; funções vivas em produção (401 JSON dos handlers; controlo inexistente = 400) |

## Decisões do operador (R18)
- **R18-136-1** o Passe convertido é **Programado** + **1 ponto** (tipo compra), sem ECOQUILDO.
- **R18-136-2** os 50 contam como **«usado»** no lastro (motivo `conversao-passe`).
- **R18-136-3** recalcular a reserva já (UPDATE CAS id=1: 1800 → 900).
- **R18-136-4** push com o `f08b572` + deploy `--prod --build`.
- **R18-136-5** A14: o operador mandou fechar programas; fechei Edge, WebView2, WhatsApp e OneDrive (RAM 469 → ~900 MB). Os 1 500 MB
  não são alcançáveis numa máquina de 5,9 GB sem fechar as sessões do Claude; a suíte correu abaixo do limiar.

## Validador adversarial (SEG2) — APROVADO COM RESSALVAS
⚠️1 **real e corrigido pelo validador** (`aab3068` → `95ca244`): o `k` da conversão era «nº de conversões + 1»; uma conversão desfeita
ao lado de uma concorrente deixava um buraco e o endereço **nunca mais convertia** (em silêncio). Passou a «maior k + 1», com teste
que reproduz a ordem e 2 mutantes. O construtor só integrou o commit (regra «quem corrige é o validador»). Notas ℹ️ A-F → DEBT-090/089.

## Pendências (não executadas)
- **DEBT-089**: o app v9 continua a mostrar +200 pontos, 10 pontos por Passe, palpite com Passe, R$ 1,00; Regras Oficiais e GUTO no v5.
  Resolve-se no UTAC do AAB v10. Até lá, a interface promete o que o servidor já não faz.
- **DEBT-090**: limites da conversão (crash a meio, retry admin idempotente, compras antigas a meio, COMMENT SQL).
- Em produção: 0 saldos ≥ 50 ⇒ a conversão ainda não disparou para ninguém (não observada ao vivo; provada por testes).
- HI5 (1,5 h): **excedido** — as 2 perguntas ao operador, a corrida da RAM e a regressão do grafo de imports (29 falhas, corrigida) consumiram o tempo extra.
