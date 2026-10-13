# UTAC110d — SEG-1 MEDIÇÃO (dois Passes: modelo de dados + lógica)

Skill: `desafio-gut/frontend/skills/utac/` (SKILL.md, comandos.md, segments/seg-1.md, types/produto.md, protocol/hard-gates.md).
Nada foi alterado neste segmento (só leitura + este log).

## -1.1 Estado do repo
- Raiz git: `C:/Users/Moltbot/Desktop/DESAFIOGUT`
- `git rev-parse HEAD` → **b677e92** (enunciado: `a0ab217`). Desvio: +1 commit, só docs —
  `b677e92 docs(UTAC110c-2d): fecho -- B-4 FECHADO`. Sem código novo.
- `git status --porcelain` → **NÃO limpo** (enunciado: limpo):
  - ` M desafio-gut/frontend/package-lock.json` — pré-existente, não é deste UTAC.
  - `??` dezenas de `_logs/MC10x_*.md` e `_logs/UTAC106x.2.spec.yml` não versionados — pré-existentes.
  - Consequência: com G1 (ficheiros nomeados), não bloqueia; não se toca nesses ficheiros.

## -1.2 Caminhos nomeados (todos existem, `netlify/functions/` relativo a `desafio-gut/frontend/`)
`comprar-passe-pontos.mjs` (113 l.) · `ler-pontos.mjs` (70) · `registar-palpite.mjs` (99) ·
`apurar-palpite.mjs` (51) · `resgatar-cartao.mjs` (124) · `lance-relampago.mjs` (332) ·
`_lib/passe-pontos.mjs` · `_lib/saldoRs.mjs` · `_lib/passe.mjs` (Via A) · `comprar-passe.mjs` (Via A).
`_lib/pontos.mjs` → **não existe** (a lógica vive em `_lib/passe-pontos.mjs`).
`docs/GUTO-REGULAMENTO.md` → existe na raiz do repo.

## -1.3 Modelo de dados actual (medido)
- `public.pontos` — `supabase/migrations/20261004_mc106dv2_pontos.sql`:
  `endereco text PRIMARY KEY, pontos integer, historico jsonb, atualizado_em` + CHECK `pontos >= 0`.
  **1 linha por ENDEREÇO** (acumulado + histórico JSONB), **não** 1 linha por movimento.
  Não há coluna `utilizador_id`. Não há coluna `tipo` de ledger (o `tipo` vive dentro de cada entrada do
  histórico: `compra|palpite|resgate`).
- `public.palpites` (20261005_mc106f) com FK para `public.pontos` (sem linha de pontos ⇒ `SEM_PASSE`).
- `public.resgates` (20261006_mc106g).
- `_lib/passe-pontos.mjs`: `PONTOS_POR_PASSE = 1` · `PONTOS_POR_CARTAO = 50` · `VALOR_PASSE_RS = 2.00`;
  CAS por `eq("pontos", base)`, idempotência por `ref` no histórico, `reverterMovimento`.
- **Passe genérico**: `comprar-passe-pontos.mjs` debita R$ 2,00 e credita `PONTOS_POR_PASSE` (=1)
  com `tipo:"compra"`; **não** distingue relâmpago/programado. (esperado — confirmado)
- **Ledger de pontos de lance / créditos de lance**: **não existe** (grep). (esperado — confirmado)

## -1.4 MLC — `lance-relampago.mjs` (medido)
- Passo 6c (l.~190): edição relâmpago/desconhecida → `debitarSaldoRs({ valorCentavos })` — **o lance
  debita do saldo R$ o PRÓPRIO VALOR do lance** (não R$ 2,00, não um crédito).
- Passo 6a/6b: edição `programado` → gate `lerSaldoSenhas` on-chain + ledger Blob `senhas-consumo`.
- Passo 7: em `NETWORK_STAGE=mainnet` → `keccak256(abi.encode(valor,endereco))` + `comprometerLanceOnchain`
  + `addLance` (Key-Per-Bid). Esta parte é a "lógica on-chain" a preservar.
- Idempotência por Blob `lance-idem`.

## -1.5 Regulamento (docs/GUTO-REGULAMENTO.md)
- Art. 13º: Passe Relâmpago = I 1 lance · II 10 pontos de fidelidade · III–V.
- Art. 14º: vence o menor **valor em pontos de lance** único.
- Art. 16º: o lance é registado em pontos de lance, obtidos por: I boas-vindas · II login · III missões ·
  IV indicação · V sequências · **VI — «Bónus incluído na aquisição do Passe Relâmpago»**.
- Art. 17º: pontos de lance não são comprados com dinheiro.
- Art. 18º: o vencedor paga o valor do lance (1 ponto = R$ 0,01) **via PIX depois de vencer**.
- Art. 23º: bloqueia lance com pontos de lance «repetidos, inexistentes ou não creditados».
- Art. 8º/37º: 1 Passe = **10** pontos de fidelidade; 50 pontos = 1 cartão. Código actual: **1**.
- Art. 34º/35º: bónus do palpite não conta para o cartão (já implementado — `pontosDeCompra`).

## -1.6 Recursos
- RAM livre (A14, 3×, `Win32_OperatingSystem.FreePhysicalMemory`): **625 · 627 · 622 MB** — **todas < 1.500 MB**.
- Disco C: 17 GB livres (> 5 GB).
- Suíte baseline: **NÃO corrida** — a regra A14 do enunciado manda PARAR com RAM < 1.500 MB.

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **RAM < 1.500 MB nas 3 medições** → o enunciado (§5a) manda PARAR e reportar.
2. **Razão estrutural contra a Opção 1 (Ponytail)** — `pontos` tem `PRIMARY KEY (endereco)`: 1 linha por
   endereço. `ADD COLUMN tipo` + índice `(utilizador_id, tipo)` não dá dois ledgers sem trocar a PK para
   `(endereco, tipo)`, o que mexe na FK de `palpites` e em todo o CAS (`eq("endereco")`). A coluna
   `utilizador_id` do enunciado não existe. O enunciado diz: razão estrutural para a Opção 2 → PARAR.
   Alternativas a decidir: (a) trocar a PK para `(endereco,tipo)` + migrar a FK; (b) colunas novas na mesma
   linha (`pontos_lance int`, `creditos_lance int`) com CHECK ≥ 0 — 1 linha, sem tocar na PK/FK;
   (c) tabela nova `pontos_lance`.
3. **Art. 16º VI contradiz a decisão do operador.** A decisão diz «o Passe Relâmpago NÃO credita pontos de
   lance»; o regulamento (fonte de verdade, não editável neste UTAC) lista entre as fontes de pontos de lance
   o «Bónus incluído na aquisição do Passe Relâmpago».
4. **O que o lance consome.** Art. 14º/18º/23º: o VALOR do lance é expresso em pontos de lance (1 ponto =
   R$ 0,01) e o vencedor paga via PIX depois. A decisão do operador diz «o lance consome 1 crédito de
   lance»; o §8 C2 diz «se tem pontos de lance suficientes → aceita». Falta decidir: o lance de valor N
   consome (i) só 1 crédito; (ii) 1 crédito **e** N pontos de lance; (iii) só N pontos de lance?
5. **Débito do saldo R$ no lance (mainnet viva).** Hoje o lance relâmpago debita `valorCentavos` do saldo R$.
   O validador (§10) considera falha «o lance ainda consome saldo R$». Retirar esse débito muda o fluxo de
   dinheiro de produção — precisa de confirmação explícita (e o que acontece aos saldos R$ existentes).
6. **10 pontos por Passe vs `PONTOS_POR_PASSE = 1`.** Mudar para 10 altera o ritmo do cartão (5 Passes em vez
   de 50). Os pontos já creditados (1 por compra) ficam como estão, ou são convertidos ×10 (Art. 39º)?
7. **Fontes de pontos de lance (login, missões, indicações) não estão no escopo** deste UTAC. Sem elas, o
   ledger de pontos de lance nasce sempre a 0 — o lance (se exigir pontos) fica impossível para todos.
8. **Edições `programado` no `lance-relampago`** (senhas on-chain) — ficam intactas? (assumido: sim).

## -1.6b Re-medição (A14) — 2.ª tentativa
- Operador fechou as janelas: RAM 754/757/751 MB (ainda < 1.500).
- Operador: «feche o que for necessário» (R18). Fechados SÓ processos sem janela: 8 servidores MCP
  lançados por esta sessão e não usados neste UTAC (chrome-devtools, claude-eyes, tapsite, sportscore,
  binance, validkit, jetbrains-proxy, mockit) → 1.341/1.359/1.360 MB; depois o Claude Desktop na bandeja
  (PID 11268, sem janela) → **1.648/1.642/1.657 MB** ✅. Intactos: esta sessão, WhatsApp, Hermes, Defender.
- Suíte baseline (harness `mc966`, foreground): **frontend VERDE 979/979 · backend VERDE 1104/1110** = declarado.
- O conflito 1 (RAM) está FECHADO. Os conflitos 2–8 continuam abertos e à espera do operador.

## -1.7 Veredito: **PARAR**
Motivos: ~~(1) RAM < 1.500 MB ×3~~ (fechado na §-1.6b); (2) razão estrutural contra a Opção 1;
(3)–(5) ambiguidades de produto que o executor não resolve (GATE 12 / AU3). Nada foi alterado.
