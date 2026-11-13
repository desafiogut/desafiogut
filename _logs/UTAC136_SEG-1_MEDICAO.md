# UTAC136 — SEG-1 MEDIÇÃO

- **-1.1** HEAD `f08b572` = baseline. `origin/main..HEAD` = 1 commit (`f08b572`, UTAC133, docs). Árvore com
  ficheiros alheios modificados (`.agents/…`, `.gitignore`, `.mcp.json`, `package-lock.json`) — não são deste UTAC, não se tocam.
- **-1.2** Caminhos do enunciado: `validar-compra-google.mjs` ✓, `_lib/comprar-passe-tipado.mjs` ✓, `_lib/fontes-lance.mjs` ✓,
  `_lib/passe-pontos.mjs` ✓, `registar-palpite.mjs` ✓, `_lib/eco-quildo.mjs` ✓ (todos em `desafio-gut/frontend/netlify/functions/`).
- **-1.3 Onde os pontos/ECOQUILDO são creditados (medido por grep):**
  | Regra | Local | Valor actual |
  |---|---|---|
  | +200 pontos de lance por Passe Relâmpago | `_lib/ledger-lance.mjs:35` `PONTOS_LANCE_POR_PASSE_RELAMPAGO`, usado só em `_lib/comprar-passe-tipado.mjs:82` (cadeia `creditarBeneficios`/`completarPendentes`/`estadoDaCompra`/`desfazerCompra`) e no helper `creditarPontosLanceDoPasseRelampago` (sem chamadores de produção) | 200 |
  | Fidelidade por Passe | `_lib/passe-pontos.mjs:466` `PONTOS_FIDELIDADE_POR_PASSE` (**não** está em `fontes-lance.mjs`) | 10 |
  | Palpite consome Passe | `registar-palpite.mjs` `consumirPasse({tipo:"programado"})` + 3 `devolverPasse` | 1 Passe Programado |
  | Paridade do ECOQUILDO | `_lib/eco-quildo.mjs:32` `CENTAVOS_POR_ECOQUILDO` (+ `reservaDe`); lido por `lastro-eco-quildo.mjs`, `ler-eco-quildo.mjs` | 100 |
  | Emissões de ECOQUILDO | `creditarEcoQuildo` ← `comprar-passe-tipado.mjs:117` (Passe PIX e Google), `fontes-lance.mjs:207/213` (indicação), `creditar-eco-quildo.mjs:109` (admin) | — |
  O Passe Google passa por `validar-compra-google.mjs:190` → `creditarPasseGoogle` (mesma cadeia) e depois `creditarPasse` (inventário).
- **-1.4 Produção (Supabase, só SELECT agregado):** `eco_quildo` 3 linhas, soma 18, máx. 13, **0 com saldo ≥ 50** ⇒ a conversão
  não dispara para ninguém no deploy. Lastro `{emitido 18, usado 0, reserva 1800}`. 14 compras de Passe no histórico de
  fidelidade (10 ou 50 pontos por compra), **0 a meio** (todas com o ECOQUILDO). Inventário 3 linhas, 4 Relâmpago / 9 Programado.
  A tabela `eco_quildo_lastro` **não tem** CHECK de igualdade `reserva = circulação × 100` (só `>= 0`) ⇒ mudar a constante não
  parte escritas; o COMMENT da coluna fica desactualizado (alterá-lo é DDL, fora do âmbito).
  O cliente v9 **não lê** `pontosLance` da resposta da compra (grep em `src/`).
- **-1.5 Disco** 6,6 GB livres (≥ 5 GB ✓). **RAM** 627 MB livres — abaixo dos 1 500 da A14: re-medir antes da suíte.

## ⚠️ Conflitos e ambiguidades (perguntados ao operador — R18)
1. Tipo de Passe da conversão e benefícios → **R18-136-1: Passe Programado + 1 ponto de fidelidade (tipo «compra»), sem ECOQUILDO.**
2. Lastro na conversão → **R18-136-2: os 50 contam como «usado» (reserva −R$ 25), motivo próprio `conversao-passe`.**
3. Reserva gravada a R$ 1,00 → **R18-136-3: recalcular já (UPDATE CAS id=1, 1800 → 900).**
4. Push → **R18-136-4: push para origin/main incluindo `f08b572`; deploy `--prod --build`.**
5. (declarado, sem pergunta) O enunciado põe a fidelidade em `fontes-lance.mjs` ou `passe-pontos.mjs`: está só no segundo.
6. (declarado) `registarPalpite` tem FK para `public.pontos`: quem nunca teve linha de pontos recebe 409 `sem_passe`. Qualquer
   login cria a linha (login diário +5 / boas-vindas +50), por isso na prática não bloqueia; não se altera schema.

**Veredito: SEGUIR** (com R18-136-1..4).
