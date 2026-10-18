⚠️ **Não consegui gravar o ficheiro** — atingi o limite de iterações de ferramentas imediatamente antes do `write_file` final. O texto integral do veredicto está abaixo; basta gravá-lo em `wt/_logs/UTAC110n_SEG8_VALIDADOR.md`. Deixei também dois artefactos que devem ser apagados: `wt/_logs/_probe-utac110n.mjs` (sonda, não é código de produção) e a base PostgreSQL `utac110n_s8` (local, `dropdb`).

---

# UTAC110n — VALIDADOR SEG8 (adversarial) · o lance gasta PONTOS DE LANCE

Worktree `C:/Users/Moltbot/tmp-utac110n-val/wt` @ `c784b9f` (detached) · nada tocado fora de `wt/_logs/` e `C:/Users/Moltbot/tmp-utac110n-val/`.
Sonda própria (9 medições, todas executadas): `wt/_logs/_probe-utac110n.mjs`, corre com
`cd wt/_logs && node --test --experimental-test-module-mocks _probe-utac110n.mjs` → **9/9 pass**.
Migração executada em **PostgreSQL 16.14 real** (não em regex): base `utac110n_s8`, schema fiel de `20261004`+`20261013`.

## VEREDICTO: **APROVADO COM RESSALVAS**

O núcleo está provado e é sólido: o lance debita pontos pelo valor, o saldo insuficiente não escreve nada, o Passe dá +200 e zero créditos, o rollback desfaz, a conversão **é** idempotente (medida em Postgres real) e a invariante do Regulamento é byte a byte. As ressalvas são de **borda** (um ramo que queima pontos, um número do enunciado que não fecha, o índice do ranking ausente em produção e o duplo do Supabase a mentir sobre `order`+`limit`).

### Suítes
```
cd wt/desafio-gut/frontend/netlify/functions && node --test --experimental-test-module-mocks "_tests/*.test.mjs"
ℹ tests 1387 · pass 1381 · fail 0 · skipped 6
cd wt && node scripts/mc966-suite-harness.mjs ambos
frontend: VERDE 1227/1227 pass
backend:  VERDE 1381/1387 pass
VEREDITO: VERDE
```
(`utac110n-pontos-lance.test.mjs` isolado: **30/30**.)

---

## 1. O lance gasta pontos — **CONFIRMADA**
```
P1 · ENDPOINT com o ledger REAL → status 201 | pontosLanceConsumidos 37 | restantes 63 | saldo final 73
     creditos_lance 0 · pontos (fidelidade) 0 · histórico [["pontos_lance","lance",-37],["pontos_lance","missao",10]]
P9 · 10 pontos + lance de 37 → status 400 | code saldo_pontos_insuficiente | pontosLance 10 | necessarios 37
     saldo 10 | entradas 1 → 1   (nenhuma escrita)
P2 · mesma idempotencyKey → 200 idempotente | saldo 73 → 73 (sem 2.º débito)
A3 (suite) · mesma ref → criado:false, 100−40 uma só vez
```
Um lance de 37 debita **37** (não 1), o insuficiente **não escreve**, é idempotente pela ref, e **não toca** `creditos_lance` nem `pontos`. Ressalva: o `pontosLanceRestantes` devolvido (63) é o saldo **antes** do +10 da missão do dia — o saldo real é 73 (ver ⚠️2).

## 2. Passe Relâmpago +200, zero créditos, rollback — **CONFIRMADA**
```
P7 · PIX → 201 | pontosLance 200 | creditosLance 0 | creditos_lance na BD 0 | movimento campo=pontos_lance delta=200
P8 · ECOQUILDO falha → 502 creditar_eco_quildo_falhou | saldo pontos_lance 0 | entrada passe-relampago removida | reembolsado true
P4 · mesmo ref Google 2× → 1.ª true 200 / 2.ª ok idempotent:true (200, uma vez)
```
Caminhos procurados onde os 200 pudessem sair sem cobrança ou duas vezes: PIX exige `debitarSaldoRs` antes (`comprar-passe-tipado.mjs:243`); Google exige recibo validado; `creditarPasseGoogle` só tem um chamador (`validar-compra-google.mjs:166`); retry/concorrência caem no mesmo `ref` → idempotente. **Não encontrei caminho de crédito duplo.** O `ref` só é único **por endereço** — o mesmo recibo noutro endereço credita outros 200 (P4), mas a defesa está no endpoint (`validar-compra-google.mjs:132-136` + UNIQUE do token, `:141`). É defesa a montante, não no ledger (ℹ️3).

## 3. Bónus de 5 acertos = +50, 1/ciclo, anti-cumulativa — **CONFIRMADA**
Suite C1–C5 (30/30) + leitura: `pontuacao-store.mjs:198-215`, `reclamarBonus:262-276`, `libertarBonus:282-291`.
`sequencia:R-5`, `delta 50`, `senhas_a_creditar` 0. **Tentei o pagamento duplo via `libertarBonus` e não existe**: `creditarPontosLance` devolve `ok:false` só quando **não escreveu** (ERRO_DB/CONFLITO/INSUFICIENTES/REF_INVALIDA), e mesmo que tivesse escrito, o retry usa o **mesmo ref** e o ledger devolve `criado:false` → no-op. C5 mede o retry a pagar uma só vez (1 → 51).
⚠️ A afirmação «nada mais enfileira `creditar-senhas-bonus`» é **falsa ao nível do texto**: `_lib/sweeper-divida-orfa.mjs:99` ainda enfileira `TIPO_TAREFA_BONUS` (quando `BONUS_EMISSAO_ATIVA=true`), a partir de dívidas **legadas** (`senhas_a_creditar > 0`). Para o bónus novo não há produtor — para o legado há (ver ⚠️5).

## 4. Ciclo de 200 pontos «alcançável de graça em 14 dias × 15» — **CONFIRMADA na substância, REFUTADO o número**
`fontes-lance.mjs:48-50,120-136`; suite D1–D3. `progressoCicloMissoes` conta só `campo==="pontos_lance"`, `delta>0`, `MOTIVOS_GRATUITOS` — não conta o gasto do lance nem o Passe. Alcançável de graça: **sim**.
Mas **14 dias × 15 = 210 é bruto**: a missão de +10 exige dar um lance, e um lance custa ≥1 ponto (`LANCE_MIN_CENTAVOS=1`). Net por dia = 5 + 10 − 1 = **14**; 14 dias = **196 < 200**. O medidor diz «completo» (conta bruto) enquanto a carteira tem 196 — e não há saldo para um lance de 200. Ver ⚠️2.

## 5. Migração 1 crédito = 200 pontos — **CONFIRMADA** (executada em Postgres real)
```
1.ª exec: BEGIN / UPDATE 2 / CREATE INDEX / COMMIT
          A: 3 créd → 600 (1 entrada, ref conversao-creditos:0xaaaa…:3)
          B: 0 créd → 900 intacto, 1 entrada
          C: 1 créd + 500 → 700, 2 entradas (último delta 200, ref …:1)
2.ª exec: UPDATE 0  → nada muda (A 600/1, B 900/1, C 700/2)
Verificação (1) créditos sobrantes = 0
Verificação (2) pontos_lance ≠ soma(historico) = 0
3.ª exec com créditos REINTRODUZIDOS de propósito: pontos 1200, 2 entradas, **2 refs iguais**
```
Idempotente **por construção**, como alegado — a 2.ª execução é um no-op real, e o histórico fica coerente (as duas verificações do próprio ficheiro devolvem 0). **Não encontrei forma de duplicar pontos numa 2.ª execução legítima.** A única via de duplicação exige reintroduzir `creditos_lance > 0` na mesma linha depois de convertida: aí o `ref` (`conversao-creditos:<endereco>:<creditos>`) **repete-se**, violando a invariante de unicidade de `ref` que todos os outros escritores assumem (⚠️4).

## 6. Ranking — **CONFIRMADA** (mascaramento real), com ressalvas
`ranking-pontos-lance.mjs:38-53` mascara via `mascararEndereco` (`0x1234…abcd`); F2 mede que nenhuma resposta contém o endereço inteiro; o endpoint **não loga nada**. Desempate por endereço, posições 1-2-2-4, `gt(pontos_lance,0)`, `limite` inteiro 1..200 (400 fora), rate limit 30/min. `limite` **não** é abusável em cardinalidade; o abuso possível é de **custo** (⚠️3). `total` é o número de linhas devolvidas, não de participantes (ℹ️4).

## 7. Invariante do Regulamento — **CONFIRMADA** (md5, não a olho)
```
corpo(v5)   len 18599 bytes · md5 73bf30643e60060507a4915026aae965
corpo(GUTO) len 18599 bytes · md5 73bf30643e60060507a4915026aae965   → IGUAIS
módulo guto-regulamento (texto desescapado) 21145 bytes · md5 70c435a90e23addc2779c0a16c12ccfb
docs/GUTO-REGULAMENTO.md                    21145 bytes · md5 70c435a90e23addc2779c0a16c12ccfb   → IGUAIS
Art. 17º (ambos): «…dá acesso a métricas, GUTO, ECOQUILDO e 200 pontos de lance. Os pontos de lance são
um benefício suplementar e não são condição para participar…»
```

---

## Achados ⚠️ (accionável)

**⚠️1 — Pontos QUEIMADOS quando a persistência do lance falha fora de mainnet.** `lance-relampago.mjs:314-341`: o ramo legado trata a falha de `setJSON` como `não-fatal` (só `console.warn`) e segue para **201 com `ok:true`**. A reversão dos pontos só existe no ramo mainnet (`:308-311`). Antes do 110n a falha custava 1 crédito; agora custa `valorCentavos` (até 999 999). Medido:
`P3 · status 201 | ok true | saldo 73 (os 37 gastos) | lances guardados: null`
`P6 (controlo mainnet) · 502 blindagem_falhou | saldo 100 (revertido)`
Correcção: reverter também no ramo legado (ou tornar a escrita condição de sucesso). Severidade real depende de `NETWORK_STAGE` (produção é mainnet), mas o dano é silencioso.

**⚠️2 — O medidor do ciclo conta BRUTO e a carteira conta LÍQUIDO.** `fontes-lance.mjs:120-136` ignora o gasto do lance (por desenho), mas o alvo é «200 pontos **para licitar**». 14 dias de 5+10 com um lance de 1 ponto/dia = **196 líquidos**, não 200: `progressoCicloMissoes` diz `completo:true` no dia 14 e o utilizador não consegue dar o lance de 200. O enunciado/commit («14 × 15 = 210») e o teste D2 medem o lado bruto. Além disso `lance-relampago.mjs:265` devolve `pontosLanceRestantes: 63` quando o saldo final é **73** (o +10 da missão entra depois, `:343-357`) — o cliente mostra um saldo errado até refrescar.

**⚠️3 — O ranking público é servido SEM o índice que ele usa, porque a migração não está aplicada.** `ranking-pontos-lance.mjs:76-81` faz `order by pontos_lance desc limit N` sobre `public.pontos`; o índice `pontos_pontos_lance_idx` só nasce em `20261018_utac110n_conversao_creditos_lance.sql:42-43`, que (correctamente) **não** foi aplicada. As únicas colunas indexadas hoje são `endereco` (PK) e `atualizado_em` (`idx_pontos_atualizado`) ⇒ **seq scan + sort de toda a tabela** num endpoint público, 30×/min por IP. O índice é independente da conversão e podia ir numa migração própria. Não é bug de correção; é de disponibilidade.

**⚠️4 — Re-conversão reintroduzida duplica o `ref` no histórico.** `…conversao_creditos_lance.sql:35`: `'ref', 'conversao-creditos:' || endereco || ':' || creditos_lance`. Se a coluna voltar a ter o **mesmo** valor (restauro de backup, re-execução de um caminho legado que ainda a escreva), a 2.ª conversão cria uma **segunda entrada com ref idêntico** — medido: `pontos_lance 1200, 2 entradas, refs iguais: 2`. A aritmética continua coerente (verificação (2) = 0), mas quebra a invariante «`ref` é única» de que dependem `aplicar()`/`reverterMovimentoLance`. Sugestão: sufixar a ref com o instante, ou usar `ON CONFLICT`-style guard no próprio histórico.

**⚠️5 — «Sem produtor» é falso para o legado, e o sweeper ainda produz o tipo do worker.** `_lib/sweeper-divida-orfa.mjs:99` enfileira `creditar-senhas-bonus` a partir de linhas antigas com `senhas_a_creditar > 0` e `liquidado_em IS NULL` (`fila-processor-scheduled.mjs:44`, `BONUS_EMISSAO_ATIVA`). Não duplica os +50 (as linhas novas nascem com 0), mas a frase do commit (`«nada mais enfileira»`) e o comentário `pontuacao-store.mjs:37` estão errados como afirmação absoluta — devem dizer «sem produtor **para o bónus novo**».

**⚠️6 — O duplo do Supabase inverte a semântica de `order` e mente com `limit`.** `_tests/_supabase-duplo-mc105a.mjs:200-203` aplica as ordens **sequencialmente**, de modo que a **última** manda (o PostgREST usa a **primeira** como primária). Com `.limit()`, o duplo devolve o **conjunto errado**:
`P5 · duplo devolveu lim=1 → 0xaaaa… (10 pontos) · é o MAIOR saldo? false`
Hoje o endpoint safa-se porque `ordenarPorPontosLance` re-ordena no cliente — mas o corte já foi feito com a ordem errada na BD: qualquer teste novo que combine multi-order+limit fica **vacuamente verde**. É exactamente o «duplo mais permissivo que o PostgREST» que se suspeitava.

## Achados ℹ️ (informativos)
1. **Testes E2/E4 da migração não executam SQL** — E2 é regex («idempotente por construção» é prova por leitura) e E4 extrai o factor do próprio SQL e depois afirma `factor*3 == 600` (tautologia). A idempotência **real** ficou provada por mim em PG16 (§5); sugiro que passe a ser um teste de verdade.
2. `MOTIVOS_CREDITO` ainda lista `"lance"` e `creditarCreditoLance`/`consumirCreditoLance` (`ledger-lance.mjs:136-143`) são **exports mortos** (0 chamadores fora de testes). Inofensivo; o cabeçalho explica porquê.
3. O `ref` do Google é único **por endereço**: `creditarPasseGoogle` credita 200 a outro endereço com o mesmo `ref` (P4). A defesa vive no endpoint (`validar-compra-google.mjs:132-136`) — quem alguma vez chamar `creditarPasseGoogle` de outro sítio herda o buraco.
4. `total` no ranking é `ranking.length` (linhas devolvidas), não o número de participantes — um cliente que pagine lê «total 50» eternamente.
5. `progressoCicloMissoes` é **monotónico de vida**, não «por ciclo»: nunca reinicia, e `indicacao` (+50, até 10/mês) fecha os 200 com 4 indicações. O nome «ciclo» promete o que o código não faz (não há reset); se a UI disser «200 por ciclo», é promessa falsa.
6. O duplo não modela `checks` para `pontuacoes`/`rankings_ciclo` (`checks: []`) — aceita linhas que a BD real recusaria.

## Erros do executor (UTAC110n)
1. **`_logs/UTAC110n_SEG-1_MEDICAO.md` §G e a mensagem do commit dizem «17700 bytes»** — são 17700 **caracteres**, **18599 bytes** (medido). Unidade trocada; os ficheiros estão certos, o número reportado não.
2. **«worker-bonus.mjs fica no código, sem produtor» / «nada mais enfileira `creditar-senhas-bonus`»** — falso como afirmação absoluta (⚠️5: o sweeper enfileira, para dívidas legadas). A afirmação correcta é «sem produtor para o bónus novo».
3. **«14 dias × 15 = 210 ≥ 200»** — não fecha do lado líquido (⚠️2): o +10 exige um lance que custa ≥1 ponto ⇒ 196 em 14 dias.
4. **`pontosLanceRestantes` devolvido antes do +10 da missão** (63 vs 73 reais) — o campo novo nasce já desactualizado.
5. **Reversão dos pontos só existe no ramo mainnet** (⚠️1) — o ramo legado, que é o que responde `ok:true` mesmo sem gravar, ficou sem compensação.
6. **Duplo do Supabase ganhou `gt`/`limit`/multi-`order` sem respeitar a semântica do PostgREST** (⚠️6) — a extensão que veio «para testar o ranking novo» é a peça menos fiel do conjunto.
7. (Meus, do validador, para o registo: a 1.ª corrida da suíte em background morreu com `stdin is not a tty` e foi repetida em foreground; a 1.ª versão da sonda resolveu `@netlify/blobs` a partir de `wt/` e falhou com `ERR_MODULE_NOT_FOUND` — corrigido com a URL absoluta do pacote.)

---

## Resumo para quem decide
Pode ir a produção **o núcleo** (1, 2, 3, 5, 7 estão provados com medição, não com leitura), mas antes:
fechar ⚠️1 (pontos queimados), corrigir ⚠️2 (número dos 14 dias + saldo devolvido), publicar o índice do ranking (⚠️3) e consertar a semântica de `order` no duplo (⚠️6) — os quatro são pequenos e todos com teste a acompanhar.