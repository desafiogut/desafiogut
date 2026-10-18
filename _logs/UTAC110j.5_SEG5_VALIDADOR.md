# UTAC110j.5 — SEG5 — VALIDADOR ADVERSARIAL

**Worktree:** `C:/Users/Moltbot/tmp-110j5-val/wt` (base `74dd5e2` + diff do executor, NÃO commitado). Só leitura de código,
testes e mutantes (todos restaurados, md5 idêntico; `git diff --stat` final = o mesmo do início: 17 ficheiros, +467/−125).

## VEREDICTO: **APROVADO COM RESSALVAS — 0 bloqueantes**

Nenhuma alegação central foi refutada como comportamento. Refutei duas alegações NA LETRA (A7 «nenhuma frase diverge»
e a força da prova da A6) e encontrei 6 mutantes de comportamento que a suíte não apanha.

## Alegações

| # | Resultado | Prova |
|---|---|---|
| A1 CardLance | **CONFIRMADA** | `estadoPontosLance` liga `valor` do campo + `lance.pontos` lido (CardLance.jsx diff: `pontos: pontosLanceLidos?.pontos, valor`); fail-closed em carregando/erro/ilegível/0/valor>saldo (teste A bidireccional + 7 entradas ilegíveis). 400 usa `error.pontosLance`/`pontosNecessarios`, que é exactamente o formato real (`jsonError` espalha `extra` dentro de `error`, `_lib/validate.mjs:121`; `lance-relampago.mjs:250-253`). 201 usa `pontosLanceConsumidos/Restantes` (`lance-relampago.mjs:409-415`). `consumo_pontos_falhou` existe no backend (`:255`). Render real do CardLance em `utac110d-front` D (40/41/0 pontos, 400 com relê, Programado independente). |
| A2 Carteira | **CONFIRMADA** | `textoSaldo(saldoPontosLance)`; bloco ilegível → «—» (teste C de `utac110d-front`); nota só com movimento (teste B bidireccional). `passes.js` beneficio/sucesso = +200. |
| A3 Regras | **CONFIRMADA (com ressalva V1)** | Bloco `data-proporcoes` antes do 1.º `<section>`; números amarrados à FONTE do backend por regex (`utac110j5` P), mais literais. Constantes conferidas por mim: `fontes-lance.mjs:33-36,56-58`, `pontuacao-store.mjs:45`, `ledger-lance.mjs:35`, `passe-pontos.mjs:466`, `pontuacao-utils.mjs:48`, `eco-quildo.mjs:35`. |
| A4 Meus Ativos | **CONFIRMADA** | `BonusSequenciaPontos` com +50 / 5 acertos, sem «senha»; painel com Passe Relâmpago/Conversão/Lance (teste D). |
| A5 escopo | **CONFIRMADA** | `git diff --stat`: só `desafio-gut/frontend/src/**` (17) + 2 untracked (teste novo, `scripts/utac110j5-prova-mutacao.mjs`). Zero em `netlify/`, `supabase/`, `docs/`. |
| A6 testes/mutação | **CONFIRMADA na contagem, REFUTADA como «garantia»** | `utac110j5-pontos-lance.test.mjs` 9/9 (o ficheiro tem 10 ocorrências de `test(`, 9 testes reais). Mutação do executor re-corrida por mim: **15/15 PROVADOS, md5 restaurado** (baseline dos alvos 140/0). Mas 6 mutantes meus sobrevivem (abaixo). Testes alterados: texto antigo em comentário em todos os 10; invariantes preservadas, salvo a nota V4. Suíte canónica no worktree: **`frontend: VERDE 1236/1236`** (`mc966-suite-harness.mjs frontend`, EXIT=0). |
| A7 coerência UI/backend | **REFUTADA NA LETRA** (não bloqueante) | ver V1 (frase do ciclo) e V2 (CardEdicaoEspecial ainda diz «1 crédito de lance»). |

## Mutantes do validador (alvo: 8 ficheiros de teste tocados; todos «entrou=true», «restaurado=true»)

| # | Mutação | Resultado |
|---|---|---|
| VM1 | Carteira: tirar a guarda `!saldosIlegiveis` da nota de conversão | **SOBREVIVEU** |
| VM2 | `conversoesFeitas`: ignorar `delta > 0` em `conversao-senhas` | **SOBREVIVEU** |
| VM3 | CardLance: «Este lance custa N» mostrado sem sessão (`isConnected` fora) | **SOBREVIVEU** |
| VM4 | `BonusSequenciaPontos`: `bonusEmitido === true` → truthy | **SOBREVIVEU** |
| VM5 | `ganhosPorFonte`: só `conversao-creditos` conta como conversão (senhas → «Outros») | **SOBREVIVEU** |
| VM6 | apagar `conversao-senhas` de `CONVERSOES` (rótulo → «Outro») | **SOBREVIVEU** |

Script: `C:/Users/Moltbot/tmp-110j5-val/vm/vm.mjs`; saída `vm/out.txt` (pass=124 fail=0 em todos).

## Achados

- **⚠️ V1 — frase falsa como escrita.** `src/lib/pontosLance.js` (PROPORCOES_TEXTO, linha do ciclo): «Como cada lance gasta o seu valor, ficam garantidos **pelo menos** 210 pontos líquidos.» Só é verdade se cada lance da missão for de 1 ponto; com lances maiores o líquido desce (o backend diz exactamente isso: `fontes-lance.mjs:42-48`, «A 1 ponto/dia o líquido é … 14/dia»). O teste C **fixa** a frase enganadora. Sugestão: «se cada lance da missão for de 1 ponto, sobram 210».
- **⚠️ V2 — resto do modelo antigo visível ao utilizador (fora dos ficheiros tocados).** `src/components/edicao-especial/CardEdicaoEspecial.jsx:193` + `src/i18n/pt.js:131`: «cada lance consome 1 crédito de lance», mostrado junto de um CardLance Relâmpago. Só aparece com edição especial em retenção, mas contradiz o backend.
- **⚠️ V3 — caminho `conversao-senhas` sem rede no painel/ganhos** (VM5, VM6): os testes D só usam `conversao-creditos`. A nota da Carteira para senhas está testada; a contagem/rotulagem no painel não.
- **ℹ️ V4 — asserção vácua em `MeusAtivos.test.mjs`**: `assert.match(t, /\+50 pontos de lance/, "não mostra o bónus em pontos de lance")` passa também no estado `sem-bonus` («…para ganhar +50 pontos de lance»). As asserções vizinhas (`com-bonus`, «creditados») cobrem a ligação, logo não abre buraco, mas a mensagem promete mais do que mede. VM4 (truthy) sobrevive porque nenhum teste passa um `bonusEmitido` não-booleano.
- **ℹ️ V5 — limite de indicações incompleto.** «até 10 indicações por mês» vale só para o INDICANTE; o indicado recebe +50 sempre (`fontes-lance.mjs:233-268`). Não é falso; é parcial.
- **ℹ️ V6 — «Missão do dia (dar 1 lance)»**: só o lance Relâmpago credita (`lance-relampago.mjs:365`); palpite/Programado não.
- **ℹ️ V7 — boas-vindas omitidas**: o Art. 16º I promete pontos de lance de boas-vindas e o backend não tem constante nem crédito (só ECOQUILDO). A UI não as promete — coerente com o código, divergente do Regulamento.
- **ℹ️ V8 — Art. 17º fala de «Passe Desafio» genérico com 200 pontos**; o backend só dá 200 ao Relâmpago. A UI diz Relâmpago (correcto face ao código).
- **ℹ️ V9 — legado**: linhas antigas com `bonus_emitido = true` (bónus pago em senhas) passam a mostrar «+50 pontos de lance creditados». Em produção há 0 dívidas abertas (CLAUDE.md 110n.1), por isso o impacto é baixo.
- **ℹ️ V10**: `lib/passes.js:67-75` mantém mensagens de «créditos de lance» em `estadoCreditosLance`. É código morto (sem consumidor fora de testes, por grep), declarado como legado.
- pt-BR: nenhuma forma «teus/tens/vais» nas linhas novas visíveis (grep nos `+` sem comentários).

## O que NÃO medi
- (Suíte canónica do frontend MEDIDA: VERDE 1236/1236, depois de restaurar os mutantes.)
- Nenhuma renderização em browser real; tudo SSR/arnês.
- Backend não corrido (o diff não lhe toca).

---

## RESPOSTA DO EXECUTOR (depois do veredicto — o texto acima é do validador e não foi alterado)

| achado | o que fiz | prova |
|---|---|---|
| ⚠️ V1 «pelo menos 210» | **CORRIGIDO**: «Como a missão exige um lance e cada lance gasta o seu valor, com lances de 1 ponto ficam 210 pontos líquidos (com lances maiores, ficam menos).» Teste C actualizado + asserção que proíbe «garantidos pelo menos». | mutante **V1** (repor a frase antiga) → RED |
| ⚠️ V2 CardEdicaoEspecial/pt.js | **NÃO corrigido** — fora dos ficheiros autorizados. Fica na DEBT-075 (aberta, parcial). | — |
| ⚠️ V3 / VM5 / VM6 senhas convertidas no painel | **FECHADO** com teste (linha «Conversão do modelo antigo +200», rótulo «Senhas antigas convertidas», nada em «Outros»). | VM5 → RED · VM6 → RED |
| ℹ️ V4 asserção vácua | **CORRIGIDO**: passa a exigir «+50 pontos de lance creditados» (só existe no estado com bónus). | MeusAtivos.test 34/34 |
| VM4 bonusEmitido não-booleano | **FECHADO** com teste ("true", 1, {}, "sim" → sem-bonus). | VM4 → RED |
| VM2 conversão com delta ≤ 0 | **FECHADO** com teste unitário de `conversoesFeitas`. | VM2 → RED |
| VM1 nota com saldo ilegível | **NÃO fechado** (declarado): a guarda `!saldosIlegiveis` existe no código; falta o teste que a morda (exige releitura a falhar depois de um sucesso). | — |
| VM3 custo sem sessão | **NÃO fechado** (declarado): a guarda `isConnected` existe; falta teste do CardLance sem sessão. | — |
| ℹ️ V5–V9 | Declarados, sem alteração: V5/V6 são parciais mas não falsos; V7/V8 são divergências Regulamento × backend (decisão do operador); V9 impacto baixo (0 dívidas abertas em produção). | — |

Depois das correcções: mutação **20/20 PROVADOS** (15 + VM2, VM4, VM5, VM6, V1), restauro md5 idêntico; suíte canónica
**frontend VERDE 1237/1237** (19:02, RAM 1876 MB no arranque). **As correcções pós-veredicto NÃO foram re-validadas** por 2.ª ronda.

Worktree do validador `C:/Users/Moltbot/tmp-110j5-val/wt`: o helper A13 **recusou** removê-lo (contém o diff não commitado:
«contains modified or untracked files») — **não forcei**. Fica em disco; `node_modules` reais intactos (frontend 499 · functions 414).


---

## Fecho dos dois mutantes sobreviventes (decisão do operador, 2026-10-18 ~19:30)

O operador decidiu que **VM1 e VM3 não vão para dívida**: «a regra R16 exige que todo teste verde tenha
mutação provada; um mutante sobrevivente é uma lacuna no teste».

Feito: dois testes novos em `src/__tests__/utac110j5-pontos-lance.test.mjs`, ambos **de FONTE** —
e o limite está declarado dentro de cada um:

- **VM1** (a nota da conversão sem `!saldosIlegiveis`): o harness não tem DOM nem gatilho de releitura
  isolado, e o estado «dados antigos + erro novo» só nasce de um `refetch` que falha depois de um
  sucesso (dispara dentro dos balões de resgate/compra). Fixa-se a guarda na condição da nota **e** a
  definição `saldosIlegiveis = pontosCarregando || Boolean(pontosErro)`.
- **VM3** (a linha do custo sem `isConnected`): a linha é markup e o `valor` é estado interno, sem DOM
  para escrever no campo. Fixa-se a guarda no markup **e** a razão dela — `estadoPontosLance` devolve
  `custo: 37` mesmo com `isConnected: false` (medido no próprio teste), logo sem a guarda um utilizador
  desligado veria «Este lance custa 37 pontos».

Os dois mutantes foram acrescentados ao `scripts/utac110j5-prova-mutacao.mjs`.

**Resultado: 22/22 PROVADOS**, com md5 restaurado em todos (baseline dos alvos: pass=143 fail=0).
Arquivo de saída: `VM1 → fail=2` · `VM3 → fail=1`.

Suíte do frontend re-corrida pelo executor e **re-verificada pelo Hermes**: **VERDE 1239/1239**
(1237 + os 2 testes novos), a 1732 MB livres (portão A14 cumprido).
