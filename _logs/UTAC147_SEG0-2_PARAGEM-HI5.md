# UTAC147 — SEG0..SEG2 + PARAGEM POR HI5 (2026-11-21, Opus 5.5)

## Decisões do operador (R18, respostas ao SEG-1)
- **R18-147-A** — «não mude a parte do play billing»: `validar-compra-google.mjs` e `creditarPasseGoogle` **intactos** (diff 0; teste I5 vigia isto).
- **R18-147-B** — a compra PIX/saldo passa a **creditar o inventário** de Passes (idempotente pela `ref` da compra).
- **R18-147-C** — mínimo literal: saem login diário, missão, sequência, **boas-vindas** e o **+100 do Passe Relâmpago no PIX**. Fica a indicação (pontos + ECOQUILDO). Os saldos de pontos ficam guardados, mas deixam de ter uso.
- **R18-147-D** — o deploy pode levar o UTAC146 (2 commits por publicar).
- **R18-147-E** — RAM: o operador fecha programas; medir antes da suíte. Medido depois: **1216 / 1269 MB** (< 1500). A suíte completa **não foi corrida**.

Decididas pelo executor a partir do texto do enunciado (declaradas, não perguntadas): pacotes **1/3/5** no PIX (o 10 saiu); na especial **1 Passe por lance** (o «1 a cada 3» do UTAC142.1/145 saiu); faixa da especial **sem nome em todos os estados** (o nome continua no `alt` da arte).

## Feito (backend — Frente A)
| Ficheiro | Mudança |
|---|---|
| `_lib/fontes-lance.mjs` | saíram `creditarLoginDiario`, `creditarBoasVindas`, `creditarMissaoLance` (+ `creditarDoDia`); a indicação fica |
| `login-diario.mjs` | 200 `{creditado:false, desativado:true}` sem tocar no ledger (clientes instalados continuam a chamá-lo) |
| `auth-user.mjs` | sem o crédito de boas-vindas |
| `_lib/pontuacao-store.mjs` | `BONUS_SEQUENCIA_ATIVO = false` (nem reclama nem credita) |
| `lance-relampago.mjs` | **1 Passe Relâmpago = 1 lance** (`consumirPasse`); sem Passe → 400 `sem_passes_disponiveis`; sem pontos, sem missão, sem «a cada N». Idempotência: trava `trava:<idempotencyKey>` no Blob `lance-idem` com `onlyIfNew` (etag vazio → 503 fail-closed); o Passe e a trava voltam se a blindagem/persistência falhar |
| `registar-palpite.mjs` | **1 Passe Programado = 1 palpite**; devolve o Passe se o registo falhar ou for repetição; valida a edição antes de gastar |
| `_lib/comprar-passe-tipado.mjs` | PIX: `creditarPasse` no inventário depois da `ref` ganhar (CAS dos pontos); falha → compra desfeita + R$ devolvido (502 `creditar_passes_falhou`); sem o +100 (`contexto(..., {bonusLance:false})`); `QUANTIDADES_PASSE = [1,3,5]`. O ramo Google mantém o default (bónus ligado) |

## Feito (frontend — Frente C)
`CartaoEdicao.jsx` ganhou a prop opcional `semNomeNaFaixa` (desligada por omissão: os 2 layouts oficiais não mudam). `CardEdicaoEspecial.jsx` passa-a ⇒ a faixa mostra só o tempo («A apuração será em: …» com a edição aberta).

## Testes
- Dirigida do backend (37 ficheiros que tocam no lance/palpite/compra/fontes): **386 pass · 0 fail · 66 skipped** antes dos testes novos; depois `utac110d` 32/0/2, `utac147-palpite-passe` 6/0, `mc9112` 12/0, `mc941` 7/0, `utac120` 8/0.
- **66 skips com motivo escrito no nome** (`[UTAC147 …]`): são testes de regras retiradas (login, missão, boas-vindas, sequência, «a cada N», lance sem Passe, palpite grátis, +100 no PIX). Não se apagaram, para preservar o histórico (GATE 15).
- Novos/reescritos: lance (1 Passe, sem Passe, blindagem devolve, 2 lances = 2 Passes, **10 pedidos simultâneos com a mesma chave ⇒ 1 lance/1 Passe**, trava existente ⇒ 409, trava não confirmada ⇒ 503, legado devolve e liberta a trava); palpite P1-P6 (incl. **10 simultâneos ⇒ 1 palpite, 1 Passe líquido**); PIX I1-I5 (inventário +1/+5, 5 cliques ⇒ 1 Passe, falha ⇒ reembolso, Google intocado).
- Frontend: testes da especial **44/44** (o teste UTAC138 da faixa foi ajustado à regra nova).
- **Mutação 5/5 RED**, restauro md5 idêntico: `_logs/UTAC147_SEG3_MUTACAO.txt`.
- ℹ️ Declarado: no palpite, os duplicados concorrentes que chegam com o stock a 0 recebem 400 em vez de 200. O efeito líquido continua a ser 1 Passe e nunca há 2 palpites.

## ⛔ NÃO feito (paragem por HI5 — limite de 1,5 h do operador)
1. **Frente D (bloqueante para o site):** o `CardLance` ainda **bloqueia o botão pelo saldo de PONTOS** (`estadoPontosLance`, fail-closed). Com o backend novo, quem tem 0 pontos e tem Passes não consegue licitar pela UI. Tem de passar a usar `useInventarioPasses` (passesRelampago ≥ 1), mostrar «Custo: 1 Passe Relâmpago» e tratar o 400 `sem_passes_disponiveis`. Também: Carteira e Início sem «Pontos de Lance» (tile do Dashboard, secção da Carteira, `PainelPontosLance` em Meus Ativos e o bónus de sequência em `MeusAtivos.jsx:86-99`); `lib/passes.js` ainda tem `QUANTIDADES_PASSE = [1,3,5,10]`; `mensagemSaldoInsuficiente` fala em login/missão.
2. **Frente B:** Art. 18 do v6.1 (+ as cópias byte a byte do GUTO: `GUTO-REGULAMENTO.md`, `guto-regulamento.mjs`) e os textos «Compre Passes para participar» na UI.
3. **Frente E:** suíte completa (RAM < 1500), build, validador adversarial (SEG4), deploy.
4. ⚠️ O commit deste UTAC é **LOCAL**: **não fazer push nem deploy** antes da Frente D. Com o backend novo e o frontend antigo, o site fica sem conseguir licitar.

## Riscos declarados
- A trava do lance fica no Blob depois do sucesso: se a gravação do registo de idempotência falhar (não-fatal), um retry com a mesma chave recebe 409 em vez de 200. É o mesmo comportamento que o modelo antigo tinha com a `ref` do ledger.
- Compra PIX: se o processo morrer entre o ECOQUILDO e o `passes_creditar`, o retry vê a `ref` e responde 200 **sem** creditar o Passe. A janela é pequena e da mesma família dos «a meio» já aceites. Fechar exige uma RPC idempotente por `ref` (migração, ST3).
- O RPC `passes_creditar` pode ter gravado e o cliente ter visto erro (timeout). Nesse caso a compra é desfeita e o R$ devolvido, e o Passe fica oferecido: o erro é a favor do utilizador.
