# UTAC149 — SEG4 VALIDADOR ADVERSARIAL (2026-11-26, Opus 5.5, worktree `tmp-utac149-val/wt`, base `c003716`)

## Veredicto: **APROVADO COM RESSALVAS**

O que foi pedido está entregue e não mexe na especial Relâmpago: a `ESPECIAL-RELAMPAGO1` (`tipo:"relampago"`) passa por
todas as guardas novas sem mudar de comportamento. Em leitura de código e nos testes, a especial palpite fica fora do slot ⚡,
do Top 10, da apuração do cron, da consolidação on-chain, dos avisos de líder e do anúncio do GUTO. Não há componente,
sub-cartão nem estilo novo.

Há 3 achados ⚠️, todos corrigidos aqui com teste e mutante. Os 2 primeiros são de servidor e continuam abertos em
**produção** até haver deploy: o validador não faz deploy. Há também 1 achado ⚠️ que exige uma **decisão do operador**,
mais 4 lacunas de teste (3 fechadas) e várias notas ℹ️.

Commits do validador (locais, HEAD destacado, sem push): `cf5b699`, `eefd6d9`, `4ce290e`, `98f5c59` e o deste relatório.

---

## Achados

### ⚠️1 — Depois de 09/12 23:59 o servidor continuava a aceitar palpites (o fecho automático não acontece em produção) · CORRIGIDO `cf5b699`
**Evidência.**
- `registar-palpite.mjs:77-82` só verifica `tipo` e `status === "aberto"`. Não lê o `termino_em`, e o comentário de
  `ler-palpites.mjs:15-17` diz isso mesmo.
- O status só passa a «encerrado» pelo cron `scheduled-encerrar-especial`. Ele lê as edições com
  `listarEdicoes` → `abrirStore` → `getStore()` simples (`_lib/edicoes-core.mjs:52-58`), dentro de um handler
  `schedule()` em modo de compatibilidade Lambda que não chama `connectLambda(event)`. `grep -rln connectLambda` em
  `netlify/functions` → 0 ficheiros.
- O próprio repo registou que, «nas scheduled functions o runtime da Netlify não injeta o contexto dos Blobs», o
  `getStore` falha (`_lib/blobs-manual.mjs:3-11`, MC88.31, observado em produção). O `abrirStore` engole o erro e
  devolve `null`, o `listarEdicoes` devolve só a R-1 sintética e o cron não encontra nenhuma especial vencida.
- Prova em produção, só por GET público (`/.netlify/functions/edicoes`, `agora = 2026-11-26T09:51:04Z`):
  `ESPECIAL-AIRFRYER` está `status:"aberto"` com `termino_em:"2026-10-04T23:30:00.000Z"`, 53 dias depois do fim. Se o
  cron corresse, tê-la-ia encerrado no 1.º minuto.

**Consequência.** A `ESPECIAL-PALPITE1` fica «aberto» para sempre depois de 09/12 23:59. O servidor aceita palpites
(e gasta Passes Programados) depois do fecho anunciado no cartão, e o `ler-palpites` nunca revela os valores. O UTAC149
dizia que o cron fazia o fecho: isso é verdade no código, mas não em produção.

**Correcção (só a especial).** O `registar-palpite` aplica `verificarJanelaLance(edicao)` quando o id é `ESPECIAL-*`:
é a mesma regra e a mesma fronteira da guarda de lances (o último ms ainda aceita). A resposta é 409
`edicao_nao_aberta` antes de tocar no inventário. Os PROG-N ficam iguais.

**Prova.** `_tests/utac149-val-palpite-janela.test.mjs` (4 testes: dentro da janela, depois do fim, antes do início,
e PROG-N com prazo passado = 201).
- VM1 (guarda desligada): **2 RED**.
- VM1b (guarda aplicada a todas as edições): **1 RED** (V4).
- md5 restaurado `ccbea173…`.
- `utac147-palpite-passe` + `utac136` + `palpite`: 32/32 (2 skips).

### ⚠️2 — Um POST directo dava LANCES na especial palpite (gas, senha on-chain, ranking) · CORRIGIDO `eefd6d9`
**Evidência.** `lance-relampago.mjs:194-208`: numa edição `tipo:"programado"` o caminho é o legado do PROG-N.
- Lê `lerSaldoSenhas` on-chain e regista o consumo de 1 senha.
- Faz `comprometerLanceOnchain` (l. 358 após a correcção): a **coordenação paga o gas**.
- Grava o lance (`addLance`) e, por ser `ESPECIAL-*`, regista-o no ranking ao vivo (`registarNoRankingEspecial`, l. 420 após a correcção).

O executor declarou isto como «não tocado; a UI não o oferece». Mas o endpoint é público (JWT `lance-auth`), e antes do
UTAC149 não havia nenhuma edição programada aberta. Agora há uma durante 15 dias, e a própria arte pergunta «quantos
lances terá essa edição»: quem palpita pode mexer na contagem que vai ser apurada.

**Correcção.** Com `ehProgramado && EDICAO_ESPECIAL_RE`, a resposta é 409 `edicao_so_palpite` antes de qualquer
pagamento. As especiais Relâmpago e os PROG-N ficam intocados.

**Prova.** Mais 2 testes em `_tests/mc941-lance-janela.test.mjs`: a especial palpite dá 409 sem consumo nem gas, e o
controlo PROG-1 continua a dar 201 pelo caminho da senha.
- VM2 (guarda desligada): **1 RED**.
- VM2b (guarda em todos os programados): **1 RED**.
- md5 restaurado `d550acd5…`.
- As 7 suítes do lance (mc9112, utac120/129/138/140/142/145) dão 51/51 (19 skips).

### ⚠️3 — Depois do fim, o cartão dizia «🔴 Encerrada» e, ao lado, «SEM PALPITE» com o formulário activo · CORRIGIDO `4ce290e`
**Evidência.** O selo e a faixa vêm de `estadoEdicaoProgramada`, que usa o relógio. A pílula e o formulário vêm de
`estadoPalpite`, que usa o `status` (`lib/palpite.js`). Como o status não muda (⚠️1), os dois divergem a partir de
09/12 23:59:00.001, no Início e na OP.

**Correcção.** `estadoPalpite(edicao, palpite, agoraMs)`: a especial Programada já encerrada pelo relógio dá
«encerrada». No Início, o relógio é o do servidor (o mesmo do `estProgramada`). Os PROG-N ficam iguais.

**Prova.**
- 4 testes puros em `src/lib/__tests__/utac149-especial-palpite.test.mjs`: fronteira do último ms / +1 ms,
  `com_palpite` depois do fim, PROG-N com `inicio_em` e prazo passado.
- P4 em `utac142-inicio-especial.test.mjs`: sem zona de palpite e pílula «ENCERRADA».
- OP-E3 na OP.
- VM3 (ramo desligado): 2 RED + P4 RED + OP-E3 RED.
- VM3b (ramo em todas as Programadas): sobreviveu à 1.ª versão do teste, porque a PROG não tinha `inicio_em`. O teste
  foi reforçado e dá **1 RED**.
- md5 restaurado `3cf9e279…`.

### ⚠️4 — DECISÃO DO OPERADOR (não implementada): a janela do palpite deixa ver a resposta
O DEBT-111(b) já regista que falta definir **que lances contam**. O risco concreto é este.
- Se a resposta for o nº de lances da `ESPECIAL-RELAMPAGO1` (fecha a **30/11 23:00Z**), os palpites ficam abertos até
  **09/12**. Durante 9 dias quem palpita já sabe a resposta.
- Mesmo antes de 30/11, o ranking ao vivo da Relâmpago (`TabelaLances` com as linhas 🔒, `get_ranking_especial` anon)
  mostra publicamente **quantos** lances existem.
- Se a resposta for «os lances desta edição», a especial palpite não recebe lances: com a ⚠️2 corrigida, a resposta é
  0 por construção.

Qualquer uma das saídas é decisão de produto e de regulamento (Art. 18 v7):
- fechar o palpite antes da edição contada;
- esconder a contagem;
- contar outra coisa.

O validador **não decide**.

---

## Lacunas de teste (testes vácuos) — 3 fechadas em `98f5c59`
- **ℹ️ E10 do `utac142-lider-especial` era vácuo** para o caso `tipo:"programado"`. Sem `lerInv`, o líder não tem Passe
  e nunca seria avisado (E12). O MX5 (guarda do `scheduled-lider-especial` desligada) **sobrevivia**: 33/33. Com o E10b
  (líder portador, mais o controlo Relâmpago que avisa), dá **1 RED**.
- **ℹ️ A faixa «Palpites até …» só era testada no fuso da máquina** (America/Sao_Paulo). O MX7 (tirar o `timeZone` do
  formatador) **sobrevivia** aqui (119/119) e só morria com `TZ=UTC`. O `utac149-val-fuso.test.mjs` corre o processo em
  Asia/Tokyo com controlo e dá **1 RED**.
- **ℹ️ A mudança da OP (cartão e selo da tabela) não tinha nenhum teste.** O MX8 e o MX9 (voltar ao `getEstadoEdicao`)
  **sobreviviam**: 172/172 nas suítes da OP. O `utac149-val-op-especial.test.mjs` (OP-E1..E3, com o EM BREVE ligado)
  dá 1 e 2 RED.
- **ℹ️ Não coberto (declarado):** o argumento `agoraMs` com `offsetRelogioMs` que o Início passa a
  `estadoEdicaoProgramada`/`estadoPalpite`. Trocá-lo por `Date.now()` não é detectado.

## Notas ℹ️ (não corrigidas)
1. **Pré-existente e fora do âmbito, mas grave para o operador:** o cron `scheduled-encerrar-especial` (e os outros
   wrappers `schedule()` que usam `getStore` sem `connectLambda`) está **cego** em produção. A especial Relâmpago não
   depende dele para a apuração (o `resultado-edicao` apura no 1.º acesso) nem para fechar lances
   (`verificarJanelaLance`). Mas a **consolidação on-chain automática e o status «encerrado» não acontecem**.
   ⛔ **Não ligar o cron às cegas.** No 1.º tick consolidaria on-chain (gas) a `ESPECIAL-AIRFRYER` de outubro, que
   continua «aberto». É decisão do operador (DEBT-079 / BLOBS_TOKEN).
2. **Vitrine** (`Vitrine.jsx:479-490`): o cronómetro dos slots Diamante/Ouro usa «a 1.ª edição programado aberta». Hoje
   essa edição é a `ESPECIAL-PALPITE1`, e antes era o fallback local. O efeito é uma contagem até 10/12 nesses slots
   (quando o tier está activo). Não corrigido: a lógica é pré-existente e a decisão é de produto.
3. **`resultado-edicao`** (público) sobre a especial palpite, depois do fim, apura um «Top 10» vazio e grava-o no Blob
   `edicoes-resultados`. Nenhum ecrã o lê (o Top 10 tem guarda), mas o `apurarEspecial` não tem guarda de `tipo`.
4. **`apurar-palpite`** (admin) não verifica o fim da edição: um admin pode apurar antes das 23:59 de 09/12.
   Pré-existente.
5. A **OP** calcula o estado com o relógio do aparelho (`Date.now()`) e o Início com o do servidor (offset). O «Prazo:»
   da tabela usa `toLocaleString("pt-BR")` no fuso do aparelho, enquanto a faixa usa o de Brasília. Num aparelho fora
   do fuso de Brasília os dois mostram horas diferentes. Pré-existente no «Prazo:».
6. `termino_em = 02:59:00.000Z` fecha às **23:59:00** de Brasília: o último minuto 23:59:xx fica de fora. Está dentro
   da letra da R18-149-A.
7. **GATE 3:** o spec entregava só `Dashboard.jsx` e `OfertasProgramadas.jsx` no frontend. O executor tocou mais 6
   ficheiros de produção: `_estilo-especial.js`, `_top10-passe.js`, `palpite.js` e os 3 do backend. Declarou-os como
   consequência do conflito 4 do SEG-1, mas a R18-149 não os autoriza explicitamente. São justificados, porque sem eles
   a palpite entrava no circuito Relâmpago. As correcções deste validador acrescentam mais 2: `registar-palpite.mjs` e
   `lance-relampago.mjs`.
8. A troca dos fixtures `ESPECIAL-AIRFRYER tipo:"programado"` → `"relampago"` **não esconde regressão**. Em produção a
   AIRFRYER é `relampago` (GET acima), e o caminho «especial programado = senha» foi revertido no MC94.4.1
   (`mc941-lance-janela.test.mjs:124`). Nenhum consumidor dependia de uma especial `programado` ser Relâmpago: verifiquei
   `CardEdicaoEspecial` (fixo em flash), `useEdicoes`, `lance-relampago` e `consolidacao`.

## Afirmações do executor
**Confirmadas (medidas):**
- especial Relâmpago intacta (as guardas só actuam sobre `tipo:"programado"`; a `ESPECIAL-RELAMPAGO1` em produção é
  `relampago`, aberta até 30/11 23:00Z);
- slot ⚡ / Top 10 / GUTO / avisos de líder / cron sem apuração nem consolidação para a palpite (mutantes MX3, MX3b,
  MX4, MX6 e MX10 morrem);
- zero diff nas Programadas normais (`estadoEdicaoProgramada` = `getEstadoEdicao`; a ordem estável de
  `edicoesProgramadasDe` não muda sem especial);
- sem duplicação no Início (MX2 → 4 RED);
- nenhum componente, sub-cartão ou estilo novo;
- id `ESPECIAL-PALPITE1` aceite pelos 3 regex;
- `registar-palpite` aceita `tipo:"programado"` + `status:"aberto"` e consome o Passe Programado;
- valores ocultos até status ≠ aberto ou apurada;
- suíte e mutação 3/3 do executor (verdes também aqui).

**Refutadas ou incompletas:**
- «cron de encerramento (só fecha…) — status «encerrado» trava novos palpites». Verdade no código, **falso em
  produção** (⚠️1).
- «lance-relampago não tocado; a UI não o oferece». O endpoint aceitava e gastava gas (⚠️2).
- «mutação 3/3» como prova de cobertura: 4 mutantes meus sobreviviam (MX5, MX7, MX8, MX9).

## Números
- **Suíte completa** (harness `mc966-suite-harness.mjs ambos`, RAM livre 2228 MB antes): ver o bloco «SUÍTE FINAL»
  abaixo.
- **Direccionados:**
  - frontend `utac149-especial-palpite` 15/15;
  - `utac142-inicio-especial` 7/7;
  - `utac149-val-op-especial` 3/3;
  - `utac149-val-fuso` 2/2;
  - backend `utac149-val-palpite-janela` 4/4;
  - `mc941-lance-janela` 9/9;
  - `utac142-lider-especial` 15/15.
- **Mutantes** (todos restaurados de `.bak`, md5 conferido):
  - correcções: VM1 2 RED · VM1b 1 · VM2 1 · VM2b 1 · VM3 2+1+1 · VM3b 1 (após reforço);
  - código do executor: MX1 1 RED · MX2 4 · MX3 1 · MX3b 1 · MX4 1 · MX5 0→1 (após E10b) · MX6 1 · MX7 0→1 (após
    teste de fuso) · MX8 0→1 · MX9 0→2 (após OP-E) · MX10 3.

### SUÍTE FINAL (HEAD `98f5c59`, `node ../../scripts/mc966-suite-harness.mjs ambos < /dev/null`, exit 0)
```
frontend: VERDE 1369/1421 pass
backend: VERDE 1535/1624 pass
VEREDITO: VERDE
```
O executor tinha 1359/1411 · 1528/1617. As diferenças são +10 testes no frontend (4 puros + P4 + 2 de fuso + 3 da OP) e
+7 no backend (4 da janela + 2 no mc941 + 1 E10b), todos verdes. Os não-pass são skips, como na referência.

### Estado em produção (por fazer pelo operador)
As correcções `cf5b699`/`eefd6d9`/`4ce290e` estão **só neste worktree**, sem deploy e sem push. Até haver deploy, em
produção:
- a `ESPECIAL-PALPITE1` aceita palpites depois de 09/12 23:59 (⚠️1);
- aceita lances por POST directo (⚠️2).
