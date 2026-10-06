# UTAC107e.2 — Validação adversarial independente

Commit `1798893` (base `5c1886a`) · worktree `C:/Users/Moltbot/tmp-107e2-val/wt` · 2026-10-06
Validador: sessão independente (não escrevi o código). Sem commits, push nem deploy. Worktree deixado limpo (`git status` vazio, sha256 dos ficheiros mutados conferidos).

## VEREDICTO: **PARCIAL**

Os 14 pontos (a)–(n) passam **dentro das premissas R18 do operador**: suíte VERDE, 17/17 mutantes do executor RED, 16/22 mutantes meus mortos, nenhuma fuga de valores numa edição que esteja por consolidar, anti-bot 403 intacto.
**Não é APROVADO** por causa de 1 achado ⚠️ alto (A1). A premissa R18-A, «consolidado ⇒ edição encerrada», **não é garantida por nenhum código**. Nenhum ponto impede que se consolide uma edição que ainda aceita lances. Daí que **o R-1 de produção (sintetizado, sem janela) passaria a revelar os valores ao vivo** se alguém o consolidasse. Há ainda 2 lacunas de teste (A3, A4).

## Tabela (a)–(n)

| # | Pergunta | Resultado | Evidência |
|---|---|---|---|
| a | anti-bot MC28.1 quebrado (403 já não acontece)? | **NÃO quebrado** | `acao=verificar` continua a ser o 1.º ramo, inalterado (`lances-flash.mjs:111-116`). Sonda P2: 403 com edição aberta E consolidada. Teste A5 verde. Mutante executor M4 RED. Produção (commit anterior): `curl …lances-flash?edicaoId=R-1&acao=verificar&valor=100` → `verificacao_indisponivel` |
| b | valores visíveis durante a edição activa? | **NÃO, se a premissa R18-A se cumprir** ⚠️ ver A1 | Por consolidar ⇒ ramo blindado (`valor:null`, `repetido:null`), e o KPB nem é lido (sonda P5: `leituras=0`; teste A1). Marcador ilegível ⇒ blindado (A3 / mutante V9 morto). **Mas** a revelação depende SÓ do marcador, sem olhar para o estado ou a janela da edição (sonda P9: um lance com `processadoEm` posterior à consolidação sai em claro) |
| c | valores NÃO revelados após o fecho? | **Revelados** após a consolidação (ℹ️ limitação declarada) | Sonda P1: `encerrado:true`, `valor`, `repetido` correctos, sem `saldo*` nem `commitmentHash` no corpo. Mutante V2 (valor null) morto. ℹ️ Uma edição **sem lance único** (422 `sem_vencedor`) ou com a tx pendente (202) **nunca** é marcada ⇒ nunca revela nem mostra etiqueta. Está declarado no SEG-1 e foi aceite em R18-A |
| d | etiqueta aparece durante a edição? | **NÃO** | Há 2 guardas: o ecrã (`estAtiva.encerrada &&` no Início; `encerrado` no MLC) e o servidor (`meu-estado` devolve `estado:null` e não lê o KPB antes do marcador: sonda P5, teste E2). Mutantes M3, M13, M15, V10, V19 e V20 mortos. Com o relógio do cliente adulterado, o servidor continua a devolver null |
| e | etiqueta mostra o estado de OUTROS? | **NÃO** | O endereço vem só do token user-session (P7: `?endereco=<B>` com o token de A devolve o estado de A, e o corpo não traz `0xbbb` nem valores). Um token lance-auth, lixo ou ausente dá 401 (P3). O EIP-55 no KPB, no token e no marcador casa (P4). Mutante M8 morto |
| f | 3 estados incorrectos? | **Correctos** | P6b: A100 → B50 (vencedor B) dá A=`deixou_de_ser`, B=`menor`, C200=`nao_menor`. P6c: A100, C50, B50 (C repetido, A volta a liderar e vence) dá A=`menor`, B=`nao_menor`, C=`deixou_de_ser`. Frontend: `SEU LANCE` em #e8f0fe e `(estado)` na cor do estado (B2, M14) |
| g | `ler-palpites` expõe valores durante a edição? | **NÃO** | Status `aberto`/`agendado` e não apurada ⇒ sem chave `valor` (C3, C4, C7). Mutantes M9, V11 e V13 mortos. Uma edição agendada está gravada com `status:"aberto"` (o `"agendado"` só existe na listagem), por isso também fica escondida. O ecrã esconde mesmo que o servidor mande `valor` com `revelado:false` (C4 FE) |
| h | `ler-palpites` não devolve valores após o fecho? | **Devolve** | `encerrado`/`apurado` revela (C5); `aberto` mas já apurada também revela (C6). Mutantes M10 e V12 mortos. Coerente com o `registar-palpite` (`status !== "aberto"` ⇒ 409) |
| i | registo silencioso do laranja não acontece? | **Conforme R18-B** (não há registo, por decisão do operador) | A liderança é reconstruída no fecho por `processadoEm`. Não há gravação durante a edição: o diff não toca no `lance-relampago.mjs`. Mutante M5 morto |
| j | laranja calculado errado (não distingue «nunca foi» de «deixou de ser»)? | **Distingue** (ℹ️ casos-limite em A5) | P6a: A100 → B100 dá A=`deixou_de_ser`, B=`nao_menor`. M6 e M7 mortos. Os casos-limite (mesmo ms, auto-repetição, `processadoEm` ausente) estão descritos em A5 |
| k | outros ecrãs quebraram (Carteira, Início, MLC)? | **NÃO detectado** | Suíte frontend 817/817. Os 5 ficheiros JSX/JS alterados compilam (`transformWithOxc` do vite → OK). `authToken`, `EDICAO_ATIVA` e `estAtiva` existem no âmbito. Os consumidores do `lances-flash` (`AppContext` polling, `useResultadoEspecial`/`metricasDeLances`/`nomeDoVencedor`, `TabelaLances`) só lêem `lances[]` com `endereco`/`valor`/`oculto`/`nomeExibicao`. O formato novo é compatível e até corrige as métricas das especiais (antes eram 0 em mainnet). A Carteira não importa nada do diff. **Não abri o browser** |
| l | backend alterado fora do escopo? | **NÃO** | `git diff --name-only 5c1886a..HEAD`: backend = `lances-flash.mjs`, `ler-palpites.mjs` (novo), `_lib/passe-pontos.mjs` (só +`listarPalpitesDaEdicao`) e 2 testes. Sem `netlify.toml`, migrações nem `lance-relampago` |
| m | algum `.bak-*` tocado? | **NÃO** | `git ls-files \| grep .bak-` dá 5 ficheiros, e nenhum aparece no diff. A árvore está limpa |
| n | suíte canónica vermelha? | **VERDE** | `node scripts/mc966-suite-harness.mjs ambos` → `frontend: VERDE 817/817 · backend: VERDE 1088/1094 · VEREDITO: VERDE` (1m30s). Dirigidos: backend 27/27, frontend 16/16. Mutação do executor: **17/17 RED**, com restauro sha256 conferido |

## Achados

**A1 ⚠️ (alto, condicional): «consolidado» ≠ «encerrado». A revelação pode acontecer com a edição ainda a aceitar lances.**
- `lances-flash` revela os valores e o `repetido` quando existe `bid:{id}:consolidado`, sem consultar `status`/`termino_em` (`lances-flash.mjs:167-186`).
- `consolidarEdicao` (`_lib/consolidacao.mjs:63-84`) e `consolidar-lances.mjs` **não verificam** se a janela já fechou. Só a scheduled das ESPECIAL encerra antes de consolidar.
- `lance-relampago.mjs` **não verifica** o marcador. Apenas `verificarJanelaLance(meta)` o protege, e com `meta === null` devolve `null` (medido: `verificarJanelaLance(null) = null`).
- **Produção (leitura):** `GET /edicoes` mostra `"R-1": {…, "status":"aberto", "sintetizada":true}`. O R-1 não tem metadata, logo `buscarEdicao("R-1")` dá null e **o R-1 aceita lances sem limite de tempo**. O R-1 é o `EDICAO_ATIVA` do MLC e do Início.
- **Consequência:** basta que um admin consolide o R-1 (ou uma PROG/RELAMP antes do `termino_em`) para que, com este commit, todos os lances seguintes apareçam publicamente com valor e `repetido` em tempo real. É exactamente a informação que o MC28.1 esconde, e o 403 do `verificar` deixa de servir para alguma coisa. Também fica errada a etiqueta de quem licitar depois (P9: um lance menor e único posterior ao fecho seria «deixou de ser»).
- Antes deste commit, consolidar cedo era inofensivo para a privacidade. **Este commit transforma isso numa fuga.**
- Correcção mínima sugerida: revelar só com marcador **e** edição fechada (`status ∈ {encerrado, apurado}` ou `termino_em` passado, com `meta` existente). Alternativa: o `lance-relampago` recusar edições já consolidadas.
- **Não medido:** se `bid:R-1:consolidado` já existe hoje em produção (não tenho acesso aos Blobs). Se existir, o deploy deste commit revela o R-1 de imediato.

**A2 ⚠️ (médio): custo e amplificação no endpoint público.**
- Em mainnet, cada GET do `lances-flash` passa a fazer +1 leitura de Blob (o marcador), e o `AppContext` faz polling a cada 3 s/15 s por cliente.
- Depois da consolidação, **cada** GET anónimo faz `getLances` completo: `list` paginado mais N `get` em lotes de 75. Isto acontece por cliente e por poll, sem cache nem autenticação.
- Um bot pode martelar `?edicaoId=<consolidada>` e gerar N leituras por pedido.
- Sugestão: cachear a lista revelada, que é imutável depois do marcador, por exemplo num blob `bid:{id}:revelado` escrito uma vez.

**A3 ⚠️ (baixo, lacuna de teste): o B8 afirma «volta a perguntar depois» mas não o verifica.** O mutante V16 (remover `setTimeout(ler, 60_000)`) e o V17 sobrevivem. Se a re-pergunta morrer, quem estiver no ecrã entre o fim e a consolidação nunca vê a etiqueta.

**A4 ℹ️ (lacuna de teste): `ler-palpites` sem teste de sistema pausado.** O mutante V15 (pausa ignorada) sobrevive.

**A5 ℹ️ (casos-limite do laranja, sem impacto provável):**
- (i) Dois lances iguais no **mesmo ms**: a ordem é a da chave, ou seja o endereço, e não a chegada real. P6d: A=`deixou_de_ser`, B=`nao_menor` só porque `0xaaa < 0xbbb`. O mutante V5 (sem desempate) sobrevive.
- (ii) Auto-repetição: A300 seguido de A300 dá `deixou_de_ser` (P6e). É semanticamente defensável.
- (iii) `processadoEm` ausente vai para o fim (P6f). Hoje todos os lances têm `processadoEm`.
- (iv) `eLiderFinal ||` é quase equivalente (V4 sobrevive): só difere se o vencedor oficial não constar do replay.

**A6 ℹ️:**
- O regex de endereço no `titular()` é defesa em profundidade sem teste (V7 sobrevive). O `verificarUserSession` já garante o endereço.
- O `ler-palpites` expõe a qualquer sessão o endereço e o `criado_em` de quem palpitou durante a edição. É por desenho («quem participou»), tal como a tabela de lances.
- O `registar-palpite` aceita palpites com `status:"aberto"` depois do `termino_em`. É pré-existente, e o `ler-palpites` herda-o de forma coerente, como foi declarado.
- Uma edição com metadata sem `status` é revelada pelo `ler-palpites` (o `registar` também recusa), mas a UI mostra-a como «aberto» (`shapeEdicao`). É pré-existente e coerente com a regra declarada.

## Mutantes do validador (22, diferentes dos 17 do executor)

Script: `C:/Users/Moltbot/tmp-107e2-val/mutantes-validador.mjs`. Restauro byte a byte e sha256 conferido (`sha256sum -c` OK).

| Mutante | Resultado |
|---|---|
| V1 `repetido >= 1` após o fecho | MORTO |
| V2 valor null após o fecho | MORTO |
| V3 vencedor oficial ignorado | MORTO |
| V4 `foiLider` sem `eLiderFinal ||` | **SOBREVIVE** (quase equivalente) |
| V5 desempate pela chave removido | **SOBREVIVE** (A5) |
| V6 filtro de valor válido removido | MORTO |
| V7 `titular()` sem regex | **SOBREVIVE** (A6) |
| V8 titular sem lance passa a `nao_menor` | MORTO |
| V9 marcador ilegível dá 503 na lista | MORTO |
| V10 `meu-estado` com `encerrado:true` sem marcador | MORTO |
| V11 agendado deixa de esconder | MORTO |
| V12 `apurada &&` | MORTO |
| V13 valor no ramo escondido | MORTO |
| V14 `ler-palpites` sem autenticação | MORTO |
| V15 pausa ignorada | **SOBREVIVE** (A4) |
| V16 etiqueta sem re-pergunta | **SOBREVIVE** (A3) |
| V17 etiqueta ignora `data.encerrado` | **SOBREVIVE** (A3) |
| V18 `temLance` ignorado | MORTO |
| V19 MLC com `encerrado` forçado | MORTO |
| V20 Início com gate invertido | MORTO |
| V21 hook com `revelado` forçado | MORTO |
| V22 MLC com etiqueta de outra edição | MORTO |

**16/22 mortos.** Nenhum sobrevivente cobre uma fuga de valores durante a edição. Os sobreviventes são casos-limite, defesa em profundidade ou a re-pergunta da etiqueta.

## Sondas próprias (handler REAL, JWT real, mocks só de I/O)

Ficheiro temporário `_tests/zzval-probe-lf.mjs`, já apagado. Correu com `node --test --experimental-test-module-mocks`: **11/11**, saídas citadas acima.
- P1 revelação sem saldos
- P2 403 aberta e consolidada
- P3 401 ×3
- P4 EIP-55
- P5 KPB não lido antes do fecho
- P6 cenários do laranja
- P7 isolamento por token
- P8 Sepolia: lista legado inalterada; `meu-estado` devolve `encerrado:false`
- P9 lance pós-consolidação revelado
- P10 405
- P11 marcador a falhar dá 503 sem ler o KPB

## O que NÃO medi

- Se o marcador `bid:R-1:consolidado` (ou outro de uma edição ainda aberta) existe em produção: não tenho acesso aos Blobs nem li o contrato on-chain.
- Render real no browser ou APK do MLC, do Início e da OP, incluindo contraste e layout no ecrã. Só correram os testes SSR/fonte do executor e a compilação JSX.
- Carga real: custo do `getLances` por poll (A2) e limites do Netlify Blobs.
- Backend `DATA_STORE_BACKEND=supabase` no `getLances` em produção (só o caminho mockado).
- Comportamento com o deploy deste commit: produção = commit anterior.

---

# 2.ª ronda — commit `6a05324` (fix sobre `1798893`)

## VEREDICTO 2.ª ronda: **PARCIAL**

As correcções de A1, A3 e A4 estão **confirmadas**: não encontrei nenhum caminho em que um lance ainda aceite pelo `lance-relampago` coexista com a revelação.
A correcção do A2 (cache `REVELADOS`) **introduz uma regressão nova** (R1 ⚠️): a cache não tem TTL, por isso serve dados que a eliminação de conta (LGPD, MC104.3) já anonimizou. A correcção é pequena (TTL ou cache por `consolidadoEm` com expiração). Corrigida a R1, eu passaria a APROVADO.

## Medições

| Item | Resultado |
|---|---|
| Suíte canónica | `frontend: VERDE 818/818 · backend: VERDE 1093/1099 · VEREDITO: VERDE` (= esperado) |
| Mutação do executor | **23/23 RED**, restauro sha256 conferido |
| Mutantes do validador (re-corridos + 3 novos) | **19/25 mortos** (o V10 foi abortado porque a âncora mudou; o mesmo caso está coberto pelo M19 do executor) |
| Árvore no fim | `git status` vazio, HEAD `6a05324`. As sondas temporárias foram apagadas |

## A1 — matriz «lance aceite» × «revela» (sonda Q1, handler real + `edicao-janela` real, 10 casos, lista E `meu-estado`)

| meta da edição (com marcador) | `lance-relampago` aceita? | revela? |
|---|---|---|
| aberto, termino futuro | sim | não |
| aberto, termino ilegível (`"lixo"`) | sim | não |
| aberto, sem termino | sim | não |
| agendado (inicio futuro) | não (`nao_iniciada`) | não |
| inicio futuro + termino passado (incoerente) | não | não |
| sem meta / meta sem id (R-1 sintetizado) | sim | **não** |
| status desconhecido (`pausado`), termino futuro | sim | não |
| encerrado | não | sim |
| apurado | não | sim |
| aberto, termino passado | não | sim |

- **Nunca há «aceita E revela».**
- `buscarEdicao` a lançar dá não revela (Q2). O `buscarEdicao` real nem lança: apanha os erros e devolve null.
- Testes novos A7/A8/A9 verdes; M18–M20 RED.

**Coexistência residual (ℹ️, pré-existente, não é deste commit):** o `lance-relampago` é *fail-open* quando o `buscarEdicao` devolve null por falha transitória dos Blobs (`lance-relampago.mjs:167-172` → `verificarJanelaLance(null) = null`). Nessa janela, uma edição **fechada e já revelada** pode aceitar um lance tardio. O vencedor já está fixado on-chain, por isso não altera o resultado; o licitante só perde o lance. A correcção, se se quiser, fica no `lance-relampago`, que está fora do escopo deste UTAC.

## A2 — cache `REVELADOS` (sonda Q3/Q4)

- **Edição errada:** não acontece. A chave é o `edicaoId` exacto. Com R-2 aberta e marcador, a resposta é `encerrado:false` e `[]` (Q3).
- **Revela antes do fecho:** não acontece. O `set` só corre depois de marcador + `edicaoFechada` + `getLances` com sucesso. O mutante V25 (set sem o gate) morre.
- **Envenenamento por erro:** não acontece. Um `getLances` a falhar dá 503 e não popula a cache (Q4).
- **Fora de mainnet:** a cache não é usada (Q3).
- **R1 ⚠️ (médio, NOVO, regressão LGPD):** a cache **não expira**. O `conta-delete` (MC104.3, `_lib/conta-delete.mjs:383-413`) anonimiza os lances **precisamente nas edições já consolidadas**, que são as que estão em cache. Medido (Q3): depois de o KPB passar a `anon:…`/`nomeExibicao:null`, a instância quente continua a devolver `0xaaa…01 / Nomeaaa`.
  - O endpoint é **público e sem autenticação**: o endereço e o nome do titular apagado continuam expostos em cada instância quente, sem limite de tempo além do reciclo da instância.
  - Antes do fix, a lista revelada reflectia logo a anonimização.
  - Sugestão: TTL curto (por exemplo 60–300 s) na entrada da cache.
- **ℹ️ Parcial:** o marcador continua a ser lido em cada poll, antes da verificação da cache. A cache poupa o KPB mas não essa leitura. Com o marcador ilegível, a cache continua a servir, o que está correcto porque a edição estava fechada.
- **ℹ️ Pegajosa:** se um `get` do KPB devolver null transitoriamente (`listarBids` ignora-o em silêncio), a lista incompleta fica em cache durante a vida da instância.

## A3 / A4

- **B8b:** verifica a re-pergunta e que pára depois de consolidar. **V16 e V17 morrem agora**, e o M23 do executor também está RED.
- **C11:** sistema pausado dá 503 `sistema_pausado` sem ler os palpites. **V15 morre agora**, e o M22 também está RED.

## Mutantes do validador — sobreviventes na 2.ª ronda

| Mutante | Estado | Leitura |
|---|---|---|
| V4 `foiLider` sem `eLiderFinal ||` | SOBREVIVE | quase equivalente (já reportado em A5) |
| V5 desempate pela chave removido | SOBREVIVE | caso-limite mesmo ms (A5) |
| V7 `titular()` sem regex | SOBREVIVE | defesa em profundidade (A6) |
| **V23** (novo) `=== "edicao_encerrada"` → `!= null` (agendada conta como fechada) | **SOBREVIVE** | ℹ️ falta um teste de «consolidada + inicio_em futuro». Na prática é inalcançável: sem lances não há vencedor, logo não há marcador. Mesmo assim é a guarda que impede revelar uma edição por iniciar |
| **V24** (novo) `edicaoFechada` fail-open no catch | **SOBREVIVE** | ℹ️ equivalente em produção: o `buscarEdicao` real nunca lança |

Mortos: V1–V3, V6, V8, V9, V11–V22, V25.

## O que NÃO medi (2.ª ronda)

- Vida real das instâncias Netlify, que é o que define quanto tempo dura a R1.
- Existência de marcadores em produção.
- Browser.
- Produção continua no commit anterior: este fix não está deployado.

---

## Tratamento pelo executor (transcrito acima: 1.ª e 2.ª rondas, verbatim do validador)

| # | Ronda | Grav. | Tratamento | Commit |
|---|---|---|---|---|
| A1 | 1.ª | ⚠️ alto | **Corrigido:** revelação e `meu-estado` exigem marcador **e** `verificarJanelaLance(meta) = edicao_encerrada` (critério do `lance-relampago`); sem meta (R-1 sintetizado) nunca revela. Testes A7–A9; mutantes M18–M20 | `6a05324` |
| A2 | 1.ª | ⚠️ médio | **Corrigido:** cache por instância da lista revelada (teste A10, M21) | `6a05324` |
| A3 | 1.ª | ⚠️ baixo | **Corrigido:** teste B8b (re-pergunta) + `intervaloMs` injectável; M23 | `6a05324` |
| A4 | 1.ª | ℹ️ | **Corrigido:** teste C11 (pausa); M22 | `6a05324` |
| A5/A6 | 1.ª | ℹ️ | Registados (casos-limite: mesmo ms, auto-repetição; defesa em profundidade) | — |
| R1 | 2.ª | ⚠️ médio (LGPD) | **Corrigido:** TTL 60 s na cache (teste A11 com lance anonimizado; M24) | `e255003` |
| V23 | 2.ª | ℹ️ | **Corrigido:** teste A12 (consolidada com início futuro; M25) | `e255003` |
| lance tardio | 2.ª | ℹ️ (pré-existente) | Registado: `lance-relampago` aceita lance se a leitura da edição falhar — fora do escopo | — |

**Correcção R1/V23 NÃO re-validada por 3.ª ronda** (o validador declarou que, feita ela, passaria a APROVADO). Final: suíte **818/818 · 1095/1101 VERDE**, mutação **25/25 RED**.
