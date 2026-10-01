# DESAFIOGUT v6.0 — contexto do projeto (protocolo UTAC)

**Auto-contido.** Descreve o que é o projeto onde os UTACs correm. Fonte: `CLAUDE.md` (secção
«ESCOPO-ALVO v6.0») + `_logs/MC100_*.md`.

---

## O produto

**Plataforma de e-commerce por dropshipping** (vende produtos físicos) com duas modalidades:

| Modalidade | Mecânica | Paga com | Critério de vitória | Autorização SPA/MF |
|---|---|---|---|---|
| **Oferta Relâmpago** | menor lance único | **saldo em R$** (PIX), lance ≥ R$ 0,01 | menor lance único | ❌ dispensada (jogo de habilidade) |
| **Oferta Programada** | **concurso de previsões** | **Passe Desafio (R$ 2,00)** | palpite mais próximo do nº real e exacto de lances | ✅ requerida (Lei 5.768/1971 + Dec. 70.951/1972) |

- **Passe Desafio (R$ 2,00):** produto digital real, **não** taxa de participação. Inclui cupons de
  lojistas + dados analíticos + GUTO + direito a 1 palpite (rácio 1 Passe = 1 palpite).
- **Prémio:** sempre o bem físico, **sem conversão em dinheiro**. O vencedor adquire o produto pelo
  valor do lance/palpite vencedor.
- **Posicionamento:** «Não é leilão, não é aposta e não é sorteio: é uma compra inteligente com benefícios.»
- **Nas lojas:** Programa de Fidelidade Gamificado (Play), ClassInd **AO / 18+**.
- **Torneio:** Programa de Fidelidade Gamificado por edição. **Indicação:** campanha de lançamento
  (1 mês, limite 5 passes).

## Os 4 pilares
1. **Comprador:** login Google (Privy) → gate legal (LGPD + Termos) → carteira embedded → 18+ → PIX
   → saldo R$ → Relâmpago (lance) ou Programada (Passe + palpite) → vitória → morada → NF-e →
   rastreio → «recebi» → 7 dias de arrependimento com estorno via Mercado Pago.
2. **Plataforma (MEI):** vende o Passe; organiza as edições; apura; notifica pelo GUTO; emite NF-e;
   gere logística; repassa ao lojista após confirmação de entrega; gere cotas.
3. **Lojista:** onboarding com CNPJ validado → cota de visibilidade (Diamante/Ouro/Prata/Bronze =
   Nível 1..4) → produtos nos slots → emite cupons para o Passe → despacha → recebe repasse → leads.
4. **GUTO (IA):** análise de dados, suporte, educação de regras, pós-compra (NF-e, rastreio,
   devolução), triagem para humano por e-mail.

## Estrutura legal
- **Titular:** associação — CNPJ **23.040.066/0001-00**. Autorização **SPA/MF** para a Programada.
- **NF-e** emitida em 100% das vendas com entrega física.
- **Glossário (proibição):** nunca escrever «sorteio» para a mecânica — é concurso de habilidade
  (art. 38 nega; `docs/GLOSSARIO-OFICIAL.md`).

## O que NÃO é
Leilão · aposta · sorteio · jogo de azar.

## Plataforma técnica (onde os UTACs tocam)
- Repo: `C:/Users/Moltbot/Desktop/DESAFIOGUT`. Frontend: `desafio-gut/frontend/`
  (Vite/React; `src/`, `netlify/functions/`, `_lib/`, `supabase/migrations/`, `_tests/`, `scripts/`).
- Backend: Netlify Functions + Supabase (produção) + `@netlify/blobs`. On-chain: Ethereum MAINNET
  (pipeline de lance), `DATA_STORE_BACKEND=supabase` em produção.
- Suíte: harness `scripts/mc966-suite-harness.mjs` (frontend `node --test --test-concurrency=1`;
  backend com `--experimental-test-module-mocks`).
- Ferramentas que leem markdown do repo: Hermes Agent + Claude Code.
