# UTAC000.8 — SEG-1 · Medição, investigação (Frente A) e PARAGEM (GATE 4) — 2026-10-01

**Objectivo:** fechar **DEBT-007** (histórico de lances completo; 🏆 «Menor e Único» honesto).
**Veredito: PARAR no fim do SEG-1/Frente A.** A investigação **ficou feita e a abordagem decidida**
(o que o SEG0 pedia), mas a implementação é **cross-stack** (backend + frontend) e **não cabe no
orçamento desta sessão** — começá-la e deixá-la a meio seria pior (HI5/GATE 4, GATE 13).

## -1.1 Estado MEDIDO (≠ do que o spec supunha — ver §-1.6)
| item | spec dizia | **medido** |
|---|---|---|
| base | `f0f02a6` | **`93c286d`** = `origin/main` |
| suíte frontend | 547/547 | **VERDE 547/547** ✅ |
| suíte backend | 967/973 | **VERDE 967/973** ✅ |
| severidade da DEBT-007 | **ALTA** | **`média`** (é o que está em `_logs/DEBT.md`) |

## -1.2 É PRÉ-EXISTENTE (HI2) — confirmado
O próprio achado é do validador do **UTAC105c** (ressalva 2 do `_logs/UTAC105c_SEG4_VALIDADOR.md`), que
o registou como **já existente**: «Isto já existia: afeta o cartão «Menor Lance» e o `vencedor` do
Dashboard da mesma forma». Nenhuma linha deste UTAC o introduziu.

## -1.3 O DEFEITO, com precisão (medido no código)
`src/context/AppContext.jsx`:
- **`lancesFlash`** (modalidade *flash*) — **CARREGADO INTEIRO no mount**, por polling ao blob:
  `apiGet("lances-flash?edicaoId=…")` → `setLancesFlash(data.lances)` (linhas **768-770**).
  **Não tem o defeito.**
- **`lances`** (modalidade *on-chain*/*programado*) — **só** se enche com (a) eventos `LanceDado` em
  tempo real (`subscribeLanceDado`, l. **780-781**) e (b) os lances do próprio utilizador
  (l. **1297-1303**). **Não há carga inicial do histórico da edição.** ← **é aqui que está o defeito.**

Logo: o 🏆 «Menor e Único» (`MeusAtivos.jsx`), o cartão «Menor Lance» e o `vencedor` do Dashboard
(`l. 698`) dizem, na modalidade on-chain, **«o menor único que ESTE browser viu desde que abriu»**.

## -1.4 Frente A — a abordagem (DECIDIDA, Ponytail)
**A infraestrutura já existe — não é preciso inventar nada:**
- `netlify/functions/_lib/contract.mjs` exporta **`getLanceDadoEvents(ini, fim)`** e **`getBlocoAtual()`**;
- `netlify/functions/monitor-onchain.mjs` já os usa **com paginação** (`lote = await getLanceDadoEvents(ini, fim)`, l. 138) para varrer `LanceDado` de `ultimoBloco+1` até `blocoAtual`;
- `consolidar-lances.mjs` já lê TODOS os lances (Key-Per-Bid) com paginação.

**Opção escolhida (mínima):** um endpoint que sirva o histórico da edição a partir dos **eventos
`LanceDado` desde o bloco de arranque da edição** (reutilizando `getLanceDadoEvents`, com a paginação
que o `monitor-onchain` já demonstra), e o `AppContext` a fazer **uma carga inicial** para `setLances`
no modo on-chain — espelhando o efeito de polling que já existe para `lancesFlash` (l. 768-770).
Não é preciso tocar em contratos nem no GUTO.

**Opções descartadas:** (B) pôr a página a falar directamente com a chain — duplicaria a paginação no
browser e exporia o RPC; (C) servidor de índice novo — desproporcionado.

## -1.5 Saúde global (HI1)
Disco OK · suíte **547/547 · 967/973 VERDE** · árvore limpa (só `package-lock.json` pré-existente) ·
`_logs/UTAC105c*` presentes mas **alheios** (outra sessão; não tocados) · nenhum processo em execução.

## -1.6 DESVIOS SPEC↔REALIDADE (declarados, não corrigidos por mim)
1. **Base errada no spec:** diz `f0f02a6`; o real é **`93c286d`** (o UTAC105c foi fechado e pusheado
   noutra sessão, entretanto).
2. **Severidade:** o spec diz **ALTA**; a `DEBT.md` regista **`média`**. Não alterei — atribuir
   severidade é decisão de prioridade do operador (GATE 12/AU3).
3. **Contagem da suíte:** o spec diz 535; são **547** (o UTAC105c acrescentou 12 testes).
   Nenhum destes desvios altera o trabalho: o defeito existe igual.

## -1.7 VEREDITO DO SEG-1: **PARAR** (GATE 4/HI5)
Entregue: medição completa, confirmação de pré-existência, localização exacta do defeito, inventário da
infraestrutura existente e **abordagem decidida**. Não entregue: implementação, testes, validador.
A implementação fica com um ponto de partida concreto e sem ambiguidade para o UTAC seguinte.
