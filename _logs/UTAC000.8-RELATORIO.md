# UTAC000.8 — Relatório: histórico de lances completo (DEBT-007)

**Data:** 2026-10-01 · **Executor:** Hermes Agent · **Base real medida:** `93c286d` = `origin/main`
**Objectivo:** fechar DEBT-007 (🏆 «Menor e Único» honesto) · **VEREDICTO: PARADO no fim do SEG-1**

---

## 1. Porque parou
A **investigação está feita e a abordagem decidida** (é o que o SEG0 pedia). O que falta é a
**implementação, que é cross-stack** — endpoint de backend + efeito de carga inicial no `AppContext` +
testes + validador adversarial. Isso **não cabe no orçamento desta sessão**, e uma correcção de
produção deixada a meio (frontend + backend alterados sem verificação) é pior do que não a começar.
Accionados o **HI5 / GATE 4** e o **GATE 13**.

## 2. O defeito, com precisão (medido)
Em `src/context/AppContext.jsx`:
- **`lancesFlash`** (modalidade *flash*) — **já vem completo** do blob, por polling no mount
  (`lances-flash?edicaoId=…`, l. 768-770). **Sem defeito.**
- **`lances`** (modalidade *on-chain*) — só tem eventos `LanceDado` **em tempo real** (l. 780-781) e os
  lances do **próprio** utilizador (l. 1297-1303). **Falta a carga inicial do histórico da edição.**
  ← **É aqui que está a DEBT-007.**

Logo, no on-chain, o 🏆 «Menor e Único» (`MeusAtivos.jsx`), o cartão «Menor Lance» e o `vencedor` do
Dashboard significam **«o menor único que este browser viu desde que abriu»**. Pré-existente
(confirmado pelo validador do UTAC105c).

## 3. A abordagem decidida (Ponytail — a infraestrutura já existe)
| peça | onde | estado |
|---|---|---|
| `getLanceDadoEvents(ini, fim)` + `getBlocoAtual()` | `netlify/functions/_lib/contract.mjs` | **já existe** |
| paginação da varredura de `LanceDado` | `netlify/functions/monitor-onchain.mjs` (l. 138) | **já existe (modelo a copiar)** |
| leitura de TODOS os lances com paginação | `consolidar-lances.mjs` | **já existe** |
| carga inicial no mount (padrão) | `AppContext.jsx` l. 768-770 (`lancesFlash`) | **já existe (modelo a copiar)** |

**Fix mínimo:** endpoint que sirva o histórico da edição a partir dos eventos `LanceDado` desde o bloco
de arranque (reutilizando `getLanceDadoEvents`), + **uma** carga inicial para `setLances` no modo
on-chain, espelhando o que já se faz para `lancesFlash`. **Sem** tocar em contratos, GUTO, Passe ou
Concurso. **Sem** alterar o comportamento visível além do 🏆 (GATE 18).

## 4. Desvios spec↔realidade (declarados)
| # | spec dizia | medido |
|---|---|---|
| 1 | base `f0f02a6` | **`93c286d`** (UTAC105c fechado noutra sessão, entretanto) |
| 2 | DEBT-007 severidade **ALTA** | **`média`** em `_logs/DEBT.md` — não a alterei (é decisão do operador) |
| 3 | suíte frontend 535 | **547** (UTAC105c acrescentou 12) |
Nenhum altera o diagnóstico: o defeito existe igual.

## 5. Não feito (declarado, não escondido)
- **Frentes B, C, D, E** (implementação, `MeusAtivos.jsx`, verificação, fecho da DEBT-007): **não
  executadas.**
- **GATE 8 — validador adversarial: não despachado.** Não há correcção nova para refutar; validar um
  diagnóstico seria pedir confirmação. Fica para o UTAC que implementar.
- **DEBT-007: mantida aberta** (agora com o ponto de partida escrito).

## 6. Evidência e registo
- `_logs/UTAC000.8_SEG-1_MEDICAO.md` — medição + investigação + abordagem.
- **R18 (UTAC000.8):** o executor **parou** por orçamento em vez de deixar produção a meio; a dívida
  fica aberta com o caminho traçado. — `_logs/` · `CLAUDE.md` · `Desktop/UTAC000.8-RELATORIO.md`.

## 7. Custo
Ver fecho da sessão (`sessions` do `state.db`).
