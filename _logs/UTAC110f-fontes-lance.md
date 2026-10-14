# UTAC110f — FONTES DE PONTOS DE LANCE: LOGIN, INDICAÇÃO, MISSÃO

Executor: Claude Code (Opus 5.5). Skill: `desafio-gut/frontend/skills/utac/`. Baseline `926c5df`.
Commit de código: **`602e3ad`** (local até ao veredicto do SEG5). Medição: `_logs/UTAC110f_SEG-1_MEDICAO.md`.

## 0. Resumo
O ledger do UTAC110d tinha `creditarPontosLance`, mas nenhuma fonte ligada. Agora há três:
| fonte | pontos | regra | onde |
|---|---|---|---|
| Login diário (Art. 16º II) | **+5** | 1× por dia de Manaus | `POST /login-diario`, chamado pelo `AppContext` 1× por sessão |
| Missão «1 lance» (Art. 16º III) | **+10** | 1× por dia de Manaus, só MLC | dentro do `lance-relampago`, depois do lance persistido |
| Indicação (Art. 16º IV) | **+50 / +50** | indicante ≤ 10/mês; indicado 1× na vida | dentro do `POST /referral?acao=usar-codigo` existente |

Os pontos de lance **não expiram** (R18-110f-5): nada neste UTAC os retira.

## 1. Decisões do operador (R18) — 3 lugares (este log, SEG-1, R14)
- **R18-110f-1..5** (enunciado): login +5 · indicação +50 · missão +10 · missão 1×/dia com reset à meia-noite UTC-4 · sem expiração.
- **R18-110f-A** dia UTC-4 também para o login (não 24 h deslizantes) + `ref` diária no ledger, **sem migração**.
- **R18-110f-B** +50 aos dois dentro do `usar-codigo`, só no ramo que passa o throttle de IP, indicante ≤ 10/mês.
- **R18-110f-C** missão creditada pelo servidor no lance, sem endpoint público.
- **R18-110f-D** Frente D (UI) adiada para 110f-front.

## 2. O que mudou (desvios ao enunciado, todos declarados)
- **Sem migração** (A1/C1 pediam 2 colunas). O `aplicar()` do ledger já é CAS + idempotente por `ref`: com
  `login:AAAA-MM-DD` e `missao-lance:AAAA-MM-DD`, dois logins em paralelo dão **um** crédito, e não há uma 2.ª escrita
  fora do CAS. O estado «hoje feito» lê-se do `historico_lance` (`estadoMissoesHoje`, pronto para o 110f-front).
- **Sem `/indicar` nem tabela `indicacoes`** (B1/B2): o `_lib/referral.mjs` já existia (vínculo em Blobs, auto-indicação,
  «uma carteira só pode ser indicada uma vez», Sybil, throttle por IP). Os +50 ligam-se lá. Códigos HTTP herdados:
  auto-indicação **400**, já-indicado **409** (o enunciado dizia 400), código inexistente 404.
- **Sem `/completar-missao`** (C2): um endpoint público deixaria o cliente reclamar a missão sem lance.
- Assinatura real: `creditarPontosLance(endereco, quantidade, motivo, ref)` (o enunciado escreve `(motivo)`).
- Refs da indicação: indicante `indicacao:<indicado>` (o mesmo indicado nunca paga 2×), indicado `indicacao-recebida`
  (1× na vida). O mês do limite é **UTC** — o MESMO recorte do limite mensal já existente em `_lib/referral.mjs`.

## 3. Ficheiros (`desafio-gut/frontend/…`)
- novo `netlify/functions/_lib/fontes-lance.mjs` — `diaManaus`, `creditarLoginDiario`, `creditarMissaoLance`,
  `creditarIndicacao`, `estadoMissoesHoje`, constantes 5/10/50/10.
- novo `netlify/functions/login-diario.mjs` — POST, Bearer user-session (endereço só do token), 401/405/502/503.
- `netlify/functions/lance-relampago.mjs` — bloco «7b» (+18 linhas): `if (!ehProgramado)` → missão, fail-soft;
  resposta ganha `missaoLance`.
- `netlify/functions/referral.mjs` — +17 linhas: `creditarIndicacao(r.indicador, endereco)` com os endereços **reais**;
  resposta ganha `pontosLance`.
- `src/context/AppContext.jsx` — +14 linhas: efeito `[address, authToken]`, `Set` por endereço, re-tenta se falhar.
- testes: `_tests/utac110f-fontes-lance.test.mjs` (20), `_tests/utac110f-lance-missao.test.mjs` (6),
  `_tests/utac110f-referral.test.mjs` (7), `src/__tests__/utac110f-login-diario.test.mjs` (5), duplo
  `_tests/_pontos-duplo-110f.mjs`; **mocks** do ledger em `mc9112`/`mc941` ganham `creditarPontosLance`/`lerLedgerLance`
  (+3 linhas cada, aditivo — sem eles o import do `lance-relampago` partia; nenhuma asserção alterada).
- `_tests/utac110f-prova-mutacao.mjs` — martelo.

## 4. Verificação
- **Suíte** (harness `mc966`, foreground, RAM 1 983-2 002 MB): **frontend VERDE 1015/1015** (+5) · **backend VERDE
  1185/1191** (+33 = 20+6+7). Baseline 1010/1010 · 1152/1158.
- **Bidireccionais** (todos em teste): login 1.º +5 / 2.º 0 / dia seguinte +5; missão 1.º +10 / 2.º 0 / dia seguinte +10;
  indicação válida +50+50 / auto-indicação recusada / 2.ª indicação 409 / throttle de IP ⇒ sem pontos.
- **Paralelo:** 5 logins simultâneos ⇒ 1 crédito; 5 missões simultâneas ⇒ 1 crédito; escritor concorrente entre a
  leitura e a escrita é respeitado (CAS relê).
- **Fronteira de Manaus:** 03:59Z e 04:01Z do mesmo dia UTC = 2 dias; 04:01Z → 03:59Z do dia seguinte = 1 dia.
- **Mutação: 17/17 PROVADOS**, restauro md5 idêntico (M2 = «dia de Brasília UTC-3», M12 = «indicação com endereços
  mascarados», M15-M17 no AppContext).
- **Migração:** nenhuma (decisão R18-110f-A) — o código só escreve `pontos_lance`, `historico_lance`, `atualizado_em`,
  colunas da migração `20261013` já aplicada em produção (110d-push).

## 5. Escopo
Intocados: GUTO, contrato on-chain (`creditarSenhas` do referral continua igual), gate legal, env vars,
`EM_BREVE_MODE = true`, `_lib/ledger-lance.mjs` (só consumido), `package*`.

## 6. Achado pré-existente → DEBT-025
O `referral.mjs` passa endereços **mascarados** a `registrarConversao` desde o commit `0ec7d13` (MC87), por isso o bónus
**on-chain** de indicação nunca dispara. Não corrigido (reactivaria o contrato = fora do autorizado). Os pontos de lance
deste UTAC usam os endereços reais, e o mutante M12 impede a mesma classe de erro.

## 7. Pendências / limites
- **Limite mensal fora do CAS:** dois indicados creditados em paralelo no 10.º slot podem dar 11 (declarado no código).
- **Missão em mainnet:** o crédito corre depois do `addLance`; se a missão falhar, o lance fica e a missão não re-tenta
  (próximo lance do dia credita).
- **Frente D** (UI «Missões de hoje», `GET /missoes`, `useMissoes`, screenshots) → **110f-front**.
- A resposta do `/referral` passa a ter `pontosLance`; o frontend ainda não a mostra.

## 8. Validador adversarial (SEG5) — **APROVADO COM RESSALVAS · 0 bloqueantes**
Verbatim em `_logs/UTAC110f_SEG5_VALIDADOR.md`. Worktree próprio (helper A13, removido com exit 0). Reproduziu a suíte
(1015/1015 · 1185/1191) e o martelo (17/17). **Nada refutado** em (a)-(j): 10+10 logins em paralelo na viragem de ano →
exactamente 2 créditos; 40 em paralelo → 1; UTC-4 independente do fuso da máquina; CAS com escritor concorrente sem perdas;
escopo limpo; sem `.sql`.
**⚠️ tratados na mesma ronda (não re-validados por 2.ª ronda):**
- **Bomba-relógio no B5** (o ledger data com o relógio real; o teste usava um `agora` fixo de Outubro → vermelho a partir de
  2026-11-01): datas RELATIVAS ao relógio real. Provado com o relógio deslocado para 2026-11-15 e 2027-02-10 → 29/29.
- **3 mutantes sobreviventes** (O2 limite conta o bónus de indicado; O7 papéis trocados no referral; O8 `/login-diario` a ler o
  endereço do corpo): testes B7, R1 (refs) e A9 novos; os 3 entram no martelo → **20/20 PROVADOS**.
- Comentário do limite corrigido: o excesso em paralelo é até N−1 (medido: 14), não «11».
**⚠️ declarados → DEBT-026:** limite fora do CAS; TOCTOU pré-existente no vínculo (agora com custo em pontos); throttle de IP
só atrasa; ≥ 6 escritores concorrentes perdem o crédito.
**ℹ️:** em modo legado (não-mainnet) a missão credita mesmo se a gravação do lance falhar (o legado é fail-soft); indicante
inválido não impede o bónus do indicado; `/login-diario` sem rate-limit (idempotente por dia).

## 9. Fecho
Suíte final (RAM 1 655 MB): **frontend VERDE 1015/1015 · backend VERDE 1187/1193**. Mutação **20/20**.
Custo: validador 410 720 tokens = 8,2–821 ¢ (164 ¢ se tudo input); sessão principal não medida (`/cost`).
