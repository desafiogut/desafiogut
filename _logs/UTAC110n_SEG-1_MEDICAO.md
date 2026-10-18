# UTAC110n — O LANCE PASSA A GASTAR PONTOS DE LANCE (backend) · registo de medição

Executado por Hermes · 2026-10-18 · base `8b08d86` (= origin/main) · **backend only** (UI é do Opus).
Fontes: `_logs/UTAC110n.spec-HERMES.md` (rascunho do Opus) + `_logs/UTAC110j.4b_SEG-1_DIAGNOSTICO.md`.

## 0. Medições de partida (SEG-1)

| O que | Medido |
|---|---|
| Repo | `C:/Users/Moltbot/Desktop/DESAFIOGUT` (git root) · app em `desafio-gut/frontend` |
| HEAD | `8b08d86` (= origin/main) |
| Suíte de partida | frontend 1227/1227 · backend **1381/1387** (6 skipped, os de sempre) |
| `lance-relampago.mjs` | consumia **1 crédito** (UTAC110d, R18-110d-2); sem crédito → 400 `sem_creditos_lance` |
| `_lib/ledger-lance.mjs` | `creditos_lance` + `pontos_lance` + `historico_lance` (migração `20261013`); CAS sobre os dois contadores + `atualizado_em`; `MOTIVOS_PONTOS_LANCE` = boas-vindas/login/missao/indicacao/sequencia |
| `comprar-passe-tipado.mjs` | Passe Relâmpago = +10 fidelidade + **+1 crédito** + ECOQUILDO; `ref` da compra em cada ledger |
| `pontuacao-store.mjs` | bónus de 5 acertos → `senhas_a_creditar = REGRAS.SENHAS_BONUS` (20) + **fila** `creditar-senhas-bonus` |
| `worker-bonus.mjs` | handler on-chain da fila; `BONUS_EMISSAO_ATIVA` em dry-run |
| `fontes-lance.mjs` | login +5/dia, missão +10/dia, indicação +50 (limite 10/mês) — **nada somava 200** |
| `public.pontos` | `creditos_lance` / `pontos_lance` **integer NOT NULL DEFAULT 0**, CHECK `>= 0`; `historico_lance` jsonb array |
| Gate legal | **não cita o Art. 17º** (medido: 0 ocorrências de «17» em `TermosConsentimento.jsx`) ⇒ fica em **3.3** |
| RAM (A14, 3 leituras) | 991 · 1015 · 1008 MB **antes** → escada → pico 1686, arranque da 1.ª suíte 1967 MB |

## 1. O que mudou, frente a frente

### A — o lance gasta PONTOS (não créditos)
`_lib/ledger-lance.mjs`: nova `consumirPontosLance(endereco, quantidade, ref)` → `aplicar(CAMPO_PONTOS,
-quantidade, "lance", ref)`. Saldo a menos ⇒ `PONTOS_LANCE_INSUFICIENTES` **sem escrita**; idempotente
pela `ref`; CAS mantido. `lance-relampago.mjs`: o ramo flash usa-a com `valorCentavos`; erro novo
**`saldo_pontos_insuficiente`** (400) com `pontosLance`/`pontosNecessarios`; falha do ledger →
`consumo_pontos_falhou`; resposta passa a `pontosLanceConsumidos`/`pontosLanceRestantes`
(legado `creditoLanceConsumido`/`creditosLanceRestantes` mantidos a `false`/`null` para clientes antigos).

### B — o Passe dá +200 pontos
`MOTIVOS_PONTOS_LANCE` ganhou `passe-relampago`; `PONTOS_LANCE_POR_PASSE_RELAMPAGO = 200`;
`creditarPontosLanceDoPasseRelampago`. `comprar-passe-tipado.mjs` usa-a na **mesma `ref`** da compra
(rollback pela `reverterMovimentoLance`), em todos os caminhos (PIX, retry, Google). O Passe **deixou de
creditar o crédito** (`creditosLance: 0` na resposta). Códigos 502: `creditar_pontos_lance_falhou`
(também em `validar-compra-google.mjs`, etapa «lance»).

### C — bónus de 5 acertos = +50 pontos
`pontuacao-store.mjs`: `creditarPontosLance(endereco, 50, "sequencia", "sequencia:<ciclo>")`; deixou de
enfileirar; `senhas_a_creditar` deixou de ser escrita; se o crédito falhar a reclamação é **libertada**
(`libertarBonus`) para o bónus não se perder. Regra «1 por ciclo» + anti-cumulativa MC93-C intactas.
`worker-bonus.mjs` **não apagado**, sem produtor. `REGRAS.SENHAS_BONUS` fica (o motor puro não foi tocado).

### D — ciclo de missões = 200 pontos · **14 dias × 15 = 210** (APROVADO pelo operador)
`fontes-lance.mjs`: `PONTOS_CICLO_MISSOES=200`, `PONTOS_DIA_MISSOES=15`, `DIAS_CICLO_MISSOES=14`,
`MOTIVOS_GRATUITOS`, e `progressoCicloMissoes(registo)` (pura): conta só ganhos gratuitos, ignora o
gasto do lance. Medido: 14 dias de login+missão = **210 pontos**, ciclo completo sem Passe.

### E — conversão de créditos (DEBT-071)
`supabase/migrations/20261018_utac110n_conversao_creditos_lance.sql`: **um** UPDATE
(`pontos_lance += creditos_lance*200`, entrada `conversao-creditos` no histórico, `creditos_lance = 0`,
`WHERE creditos_lance > 0` ⇒ idempotente por construção) + índice `pontos_pontos_lance_idx`.
**NÃO APLICADA EM PRODUÇÃO** (autorização + credenciais) — registado em DEBT-071.

### F — ranking de pontos de lance
`netlify/functions/ranking-pontos-lance.mjs` (novo): `GET ?limite=1..200` (50 por omissão), ordena pelo
**saldo actual**, posições 1-2-2-4, **endereços mascarados**, exclui `pontos_lance = 0`, 502 em erro de
leitura. Sem sessão (não identifica ninguém).

### G — Art. 17º
Texto novo nos **3 sítios** da invariante (+ âncora `ARTIGOS_V4["17"]` em `guto-perfis.mjs`):
«…dá acesso a métricas, GUTO, ECOQUILDO e **200 pontos de lance**. Os pontos de lance são um benefício
suplementar e **não são condição para participar**: o aplicativo concede-os também gratuitamente por
engajamento, e a aquisição do Passe apenas antecipa esse saldo, não sendo uma taxa separada.»
`corpo(v5) == corpo(GUTO)` = **17700 caracteres** (18599 bytes — ver §5, erro meu n.º 1).
Módulo do runtime regenerado e idêntico à fonte (md5 `70c435a9…`).

## 2. Testes

- Novo `_tests/utac110n-pontos-lance.test.mjs`: **30/30** (A1–A6, B1–B4, C1–C5, D1–D3, E1–E4, F1–F4, G1–G4).
- Duplo partilhado `_supabase-duplo-mc105a.mjs`: **aditivo** — tabelas `pontos`, `pontuacoes`,
  `rankings_ciclo` (colunas/CHECKs reais) + `.gt()` + `.limit()` + multi-`order`.
- Testes que fixavam o modelo antigo, actualizados **com o texto antigo preservado em comentário**:
  `mc9112-integracao-lance` (crédito→pontos, 37 gastos), `utac110d-dois-passes` (A4/B1/B3/B4/B5/B8/B9/B11),
  `mc941-lance-janela`, `utac110f-lance-missao`, `mc93b-pontuacao-store` (bónus: fila→crédito),
  `utac110i1-validar-compra-google`, `utac110e-eco-quildo` (C1), `utac110k1-conformidade-pre-aab` (Art. 17º).

## 3. Portão de RAM (A14) — duas corridas

| Corrida | Leitura no arranque (wrapper) | Resultado |
|---|---|---|
| 1.ª | anterior à correcção do K1: 1967 MB | backend verde, frontend **1 vermelho** (teste do Art. 17º do 110k.1) |
| 2.ª | **1300 MB** (abaixo do portão; trim só chegou a 1297) | **VERDE** 1227/1227 · 1381/1387 — **desvio declarado** |
| 3.ª | **2187 MB** (fechados 9 `msedge` sem janela, 389 MB + trim 63 procs) | **VERDE com os MESMOS números** |

O par «verde a 1300 + verde a 2187 com contagens iguais» é o que transforma «correu bem» em «não depende
da memória». Não houve falha inexplicada em nenhum regime.

## 4. Mutação (R16) — 10/10 mortos

M1 lance debita 1 · M2 sem guarda de saldo negativo · M3 Passe 20 em vez de 200 · M4 rollback não desfaz ·
M5 bónus 20 em vez de 50 · M6 bónus falhado não liberta · M7 ciclo com 10 dias · M8 ranking invertido ·
M9 ranking sem máscara · M10 Regulamento volta a «1 crédito». Restauro do `.bak` (fora do repo) com **md5
confirmado** em todos.

## 5. Desvios declarados e erros meus

1. **Desvio (premissa da decisão)**: R18-110j.4b-7 diz «endereços mascarados, como o `/ranking` actual».
   **Medido: o `/ranking` actual devolve o endereço INTEIRO** (`lerRankingCiclo` → `endereco: l.endereco`;
   nenhum mascaramento no endpoint nem no front). O endpoint novo mascara — que é o que a decisão pede.
2. **Desvio (autorização)**: `validar-compra-google.mjs` teve de ser tocado (2 linhas) para o código 502 da
   etapa «lance» não mentir (`creditar_credito_lance_falhou` → `creditar_pontos_lance_falhou`). Declarado.
3. **Erro meu, medido e corrigido**: a receita de regeneração documentada no cabeçalho de
   `guto-regulamento.mjs` estava incompleta (`cab` já termina no nome; faltava só o ` = `). A 1.ª execução
   partiu o ficheiro com `SyntaxError: Missing initializer in const declaration`; restaurou-se do `.bak` e a
   receita foi corrigida **no próprio ficheiro** para ninguém repetir o erro.
4. **Erro meu, repetido da série**: corri `mc963` com o CWD errado (`frontend` em vez de
   `netlify/functions`) e li um `ENOENT` como falha do teste. Não era — o teste resolve a raiz a partir do
   CWD. Re-corrido no CWD do harness: 10/10.
5. **Não feito (deliberado)**: a migração da conversão **não** foi aplicada; o PDF do Regulamento **não** foi
   regerado (o gate não cita o Art. 17º ⇒ sem subida 3.3→3.4; a regeneração fica para quando o texto for
   publicado como v5.1 final).

## 6. Ficheiros

Ver a lista do commit (`git show --stat`), um a um — **nunca `git add -A`**.
Não tocados: UI (`src/` de produção), GUTO (vocabulário), Data Safety, contratos on-chain, `worker-bonus.mjs`.

---

## 7. 2.ª RONDA — validador adversarial (SEG8) · **APROVADO COM RESSALVAS**

Worktree próprio `C:/Users/Moltbot/tmp-utac110n-val/wt` @ `c784b9f`. Veredicto integral em
`_logs/UTAC110n_SEG8_VALIDADOR.md`. Ele mediu o que eu **não** medi: executou a migração em
**PostgreSQL 16.14 real** (base local, schema fiel) e provou a idempotência por execução, em vez de a
ler no SQL. Suíte confirmada por ele no worktree: 1227/1227 · 1381/1387.

### O que ele REFUTOU (conclusões minhas, mantidas à vista e corrigidas)

| # | O que eu afirmei | O que a medição mostrou | Tratamento |
|---|---|---|---|
| ⚠️1 | «o lance não é gravado ⇒ os pontos voltam» (só no ramo mainnet) | Fora de mainnet a falha de `setJSON` era **não-fatal** e o endpoint respondia **201 `ok:true`** com os pontos gastos (medido: saldo 73, 37 gastos, `lances: null`) | **CORRIGIDO**: o ramo legado passou a ser fatal como a mainnet — reverter + 502 `persistencia_falhou`. Testes novos em `mc9112` (com e sem falha de Blob) |
| ⚠️2 | «14 dias × 15 = 210 ≥ 200» | **210 é BRUTO**: a missão de +10 exige um lance que custa ≥1 ponto ⇒ **196 líquidos** em 14 dias. E `pontosLanceRestantes` devolvia **63** quando o saldo final era **73** | **CORRIGIDO no que é corrigível**: o comentário passa a dizer bruto≠líquido (e que 15 dias fechariam no líquido — decisão do operador); o campo da resposta passou a incluir o +10 da missão. Testes D2b e a asserção 273 |
| ⚠️3 | o índice do placar nascia na migração da conversão | Essa migração **não** está aplicada ⇒ o endpoint público corria **sem índice** (seq scan + sort, 30×/min) | **CORRIGIDO**: migração própria `20261018_utac110n_indice_ranking.sql` (pode ser aplicada já). Teste E6 |
| ⚠️4 | a ref da conversão é única | Re-converter créditos **reintroduzidos** na mesma linha repetia a ref (medido: 2 entradas, refs iguais) | **CORRIGIDO**: a ref leva o instante da execução (`…:YYYYMMDDHH24MISSMS`). Teste E5 |
| ⚠️5 | «o worker fica sem produtor; nada mais enfileira `creditar-senhas-bonus`» | **FALSO como absoluto**: `_lib/sweeper-divida-orfa.mjs:99` continua a enfileirar para dívidas **legadas** | **CORRIGIDO no texto**: «sem produtor **para o bónus novo**» (código e DEBT-076). O comportamento estava certo; a frase não |
| ⚠️6 | o duplo do Supabase ganhou `order`/`limit` fiéis | Aplicava as ordens «por ordem» ⇒ a **última** mandava (PostgREST usa a **primeira**), e com `limit` devolvia o **conjunto errado** (lim=1 → o menor saldo) | **CORRIGIDO**: aplica-as em ordem inversa (a primeira é a primária). Teste F5 — sem ele, qualquer teste multi-order+limit ficaria vacuamente verde |

### Erros meus declarados (do veredicto)

1. «17700 **bytes**» → são 17700 **caracteres** (18599 bytes). Corrigido no §G.
2. «sem produtor / nada mais enfileira» → qualificado (⚠️5).
3. «14 × 15 = 210 ≥ 200» → bruto, não líquido (⚠️2).
4. `pontosLanceRestantes` nascia desactualizado → corrigido.
5. Reversão só em mainnet → corrigido.
6. Duplo infiel (⚠️6) → corrigido.

### Informativos do validador que NÃO corrigi (declarados)

- E2/E4 da migração são prova por leitura/regex; a idempotência **real** foi provada por ele em PG16.
  Sugestão aceite para UTAC próprio (não há Postgres no CI).
- `creditarCreditoLance`/`consumirCreditoLance` são exports mortos (0 chamadores fora de testes) — ficam
  de propósito, documentados, até a conversão ser aplicada.
- O `ref` do Google é único **por endereço** (defesa no endpoint, não no ledger).
- `total` do ranking é o número de linhas devolvidas, não de participantes (documentado no ficheiro).
- `progressoCicloMissoes` é monotónico de vida (não reinicia por ciclo) — o nome «ciclo» promete mais do
  que faz; fica registado para o UTAC do front, onde a UI terá de o apresentar.
- O duplo não modela CHECKs para `pontuacoes`/`rankings_ciclo`.

### Registo do instrumento

O subagente validador atingiu o limite de iterações **antes** de gravar o ficheiro do veredicto (2.ª vez
na série). O texto integral foi recuperado do resumo da delegação e gravado em
`_logs/UTAC110n_SEG8_VALIDADOR.md`. Artefactos dele a limpar: `wt/_logs/_probe-utac110n.mjs` e a base
local `utac110n_s8`.
