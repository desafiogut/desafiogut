# UTAC129 — SEG4 VALIDADOR ADVERSARIAL

- Commit validado: `e8533c6` (worktree isolado `C:/Users/Moltbot/tmp-utac129-val/wt`, detached)
- Validador: subagente adversarial (Opus 5.5). Não executou nada fora do worktree. Sem Supabase, Netlify, deploy, commit nem push.
- Ficheiros mutados: todos restaurados, `md5sum -c` OK nos 8. `git status --short` vazio no fim.

## Veredicto: **APROVADO COM RESSALVAS**

As três frentes fazem o que dizem, dentro do escopo autorizado. Os testes novos não são vácuos: 14 dos 16 mutantes morreram. Não consegui refutar o núcleo do trabalho:
- o lance já não toca no inventário;
- a missão +10 é creditada a quem tem 0 Passes;
- as boas-vindas creditam uma só vez, mesmo com concorrência, e só depois de a assinatura ser verificada;
- os dois links de convite usam a origem de produção.

As ressalvas: 1 achado ⚠️, que é a lição aplicada a metade dos sítios (o GUTO continua a mandar para o domínio morto), e 6 notas ℹ️.

---

## Testes do executor (re-corridos por mim, ficheiro a ficheiro)

| Ficheiro | Resultado |
|---|---|
| `_tests/utac129-lance-sem-passe.test.mjs` | 5/5 |
| `_tests/utac129-boas-vindas.test.mjs` | 7/7 |
| `_tests/utac120-inventario.test.mjs` | 8/8 |
| `src/__tests__/utac129-front.test.mjs` | 5/5 |
| `src/__tests__/utac110i1-front-billing.test.mjs` | 16/16 |
| `eslint` nos 6 ficheiros do frontend tocados | 0 erros (1 aviso `no-console` pré-existente em `apiOrigin.js:75`) |

---

## Achados

### ⚠️1 — O GUTO (backend) continua a mandar os utilizadores do app para o domínio morto `desafiogut.com`
- **Onde:** `netlify/functions/_lib/guto-perfis.mjs:90` («acessível pelo navegador em desafiogut.com») e `:96` («(desafiogut.com) e ofereça ajuda com a loja»), dentro de `PROMPT_CONFORMIDADE`.
- **Porque importa:** é o mesmo defeito que a Frente C diz ter corrigido em `MercadoLances.jsx` e `useComprarPasse.js`. O prompt é usado quando `!resolverRecursos(config, plataforma).isLeilaoAtivo` (`chatbot.mjs:1436-1440`). Hoje é o caso do APK v7: quem perguntar ao GUTO por lances ou carteira é mandado para um domínio que não responde (UTAC124: curl → 000). Como é do servidor, corrigi-lo valeria já na v7, ao contrário do texto do `MercadoLances` (que vive dentro do .apk).
- **Atenuante:** quando o operador virar `isLeilaoAtivo.android=true` (Frente D), o Android deixa de usar este prompt. Continua activo em qualquer plataforma com o leilão desligado (iOS, ou se a flag voltar atrás).
- **Prova:**
  ```
  $ grep -rnE "desafiogut\.com($|[^.]|\.[^b])" src netlify/functions | grep -v _tests
  netlify/functions/_lib/guto-perfis.mjs:96:  (desafiogut.com) e ofereça ajuda com a loja. ...
  (e :90 com grep -n "desafiogut.com")
  ```
- **Escopo:** `guto-perfis.mjs` não está nas entregas do spec. O executor fez bem em não lhe tocar sem autorização (GATE 3). Mesmo assim, o C3 do `utac129-front.test.mjs` afirma «nenhum código aponta para https://desafiogut.com», e isso só é verdade para os 2 ficheiros que ele lê.
- **Correcção sugerida (pedir R18):** usar a origem de produção (`silly-stardust-ca71bc.netlify.app`) nas 2 linhas do `PROMPT_CONFORMIDADE`, mais um teste que procure o domínio morto também em `netlify/functions/_lib/guto-perfis.mjs`.

### ℹ️1 — As boas-vindas podem pendurar o login se o Supabase não responder, e acrescentam sempre uma ida à base de dados
- **Onde:** `auth-user.mjs:125-127`. O `await creditarBoasVindas(endereco)` corre sem limite de tempo, e o cliente Supabase (`_lib/supabase-client.mjs`) não tem timeout.
- **Prova:** sonda temporária com controlo positivo (ficheiro criado no worktree e apagado; `registarAtividade` também com duplo, para isolar as boas-vindas):
  ```
  SONDA_MODO=ok   → ok 1 - sonda (ok): login responde em < 3 s
  SONDA_MODO=hang → not ok 1 - sonda (hang): login responde em < 3 s   actual: 'PENDURADO'
  ```
  O fail-soft cobre erros, não paragens. O comentário «NUNCA bloqueia o login» não é verdade com o Supabase parado. Em uso normal, cada login, para sempre, faz +1 SELECT (o caso «já creditado»). Com contenção podem ser até 5 × (SELECT + UPDATE).
- **Porque não é ⚠️:** o `registarAtividade` (MC89.43), logo acima, tem o mesmo padrão (Supabase com await e sem timeout). O risco já existia. O UTAC129 duplica a exposição, não cria uma classe nova.
- **Correcção sugerida:** limitar o tempo com `Promise.race([creditarBoasVindas(e), timeout(1500)])`, que adia o bónus para o próximo login. Não usar fire-and-forget: na Netlify a função pode congelar depois da resposta, e o mutante MB3 mostra que os testes o apanham.

### ℹ️2 — Os ramos de devolução do Passe no lance ficaram como código morto armado (o mutante MA2 sobrevive)
- **Onde:** `lance-relampago.mjs:35` (`import { devolverPasse }`), `:202` (`let passeConsumido = false; // UTAC120 — true quando o inventário já pagou…`) e `:321-325`, `:364-368`.
- **Prova:** com `let passeConsumido = true;` as suítes `utac129-lance-sem-passe` (5/5) e `utac120-inventario` (8/8) continuam verdes. Nenhum teste cobre o caminho de falha (blindagem ou persistência) a afirmar «não devolve Passe». Se alguém virar a flag, cada lance falhado cria um Passe Relâmpago que nunca foi consumido.
- **Correcção sugerida:** apagar a variável, os dois blocos `if (passeConsumido)` e o import de `devolverPasse`, o que é coerente com «o lance não toca no inventário». Em alternativa, um teste de falha da blindagem que afirme `chamadasInventario == []`.

### ℹ️3 — Incoerências que sobram noutros consumidores do Passe Relâmpago
- `src/pages/MinhaCarteira.jsx:357` (comentário) e `:384` (texto visível): «Ainda não tem Passes — compre abaixo para **dar lances** e palpites.» Já não é preciso Passe para licitar. Além disso, o contador «Meus Passes → Passe Relâmpago» passa a só crescer (o `validar-compra-google.mjs:214` continua a creditar inventário) e nunca é gasto em lado nenhum.
- `netlify/functions/_lib/guto-perfis.mjs:221`: «Passe Relâmpago (1 lance)». Desde o UTAC129 deixou de ser verdade (o Passe dá +200 pontos e o lance não o consome).
- Comentários obsoletos: `CardLance.jsx:34-35` («o lance Relâmpago consome 1 PASSE…») e `lance-relampago.mjs:202`.
- Nenhum destes ficheiros (excepto os comentários) está nas entregas, por isso é uma nota para o próximo UTAC e não um defeito do executor.
- Consumidores de `sem_passes_disponiveis` no frontend: **nenhum** sobra (grep vazio fora dos testes). O único emissor no backend é o `registar-palpite.mjs:84`, que é o palpite e está correcto pelo R18-129-3.

### ℹ️4 — O bloqueio do botão de lance pelos pontos não tem teste (o mutante MC5 sobrevive)
- **Onde:** `CardLance.jsx:388-389` (`desabilitado = … || semPontosFlash`).
- **Prova:** sem `|| semPontosFlash`, `utac129-front` dá 5/5 e `utac110j5-pontos-lance` dá 12/12. O comentário do C4 («continua governado pelos PONTOS») só afirma a mensagem, não o `disabled`.
- **Impacto:** baixo. O servidor continua a recusar com 400 `saldo_pontos_insuficiente`. O buraco é anterior ao UTAC129 (UTAC110j.5).
- **Correcção sugerida:** acrescentar `assert.match(c, /saldoErro \|\| semPontosFlash;/)` ao C4, ou um teste de render.

### ℹ️5 — Boas-vindas e Sybil: creditar de novo depois de apagar a conta, e o ciclo de missões encurta
- **Conta apagada:** `_lib/conta-delete.mjs:339` apaga a linha de `pontos` (e com ela o `historico_lance`). Se a mesma carteira voltar a fazer login, a ref `boas-vindas` já não existe e recebe +50 outra vez, em cada ciclo apagar → entrar. Uma carteira nova já recebia +5/dia de graça; agora recebe +55 no primeiro dia. As carteiras são gratuitas e o único limite é o rate limit de 10/min do `auth-user`, por isso o ganho marginal de quem farma é 10× maior. A decisão foi do operador (R18-129-1), mas o vector fica registado.
- **Ciclo de missões:** `"boas-vindas"` já estava em `MOTIVOS_GRATUITOS` (`fontes-lance.mjs:64`, desde o UTAC110n). Os +50 contam para os 225 do ciclo: são ~12 dias em vez de 15. Isto é coerente com o desenho do 110n, não é defeito.
- **Correcção sugerida (se o operador quiser):** guardar um tombstone `boas-vindas` por endereço (hash) fora da linha apagada, ou aceitar e registar como dívida conhecida.

### ℹ️6 — A missão continua inalcançável na prática (já declarado)
`EM_BREVE_MODE = true` (R18-129-2) esconde o formulário. Do lado do servidor, não encontrei outra condição escondida:
- `auth-lance.mjs` não tem gate de Passe, cota ou saldo;
- `DEBITO_SALDO_LANCE_ATIVO = false` (`:51`) manda o relâmpago para o ramo de pontos;
- `ehProgramado` só desvia as edições `tipo:"programado"` (que, de qualquer forma, não pagam a missão, `:382`);
- `LANCE_MIN_CENTAVOS = 1`, e com o login diário (+5) ou as boas-vindas (+50) uma conta nova consegue pagar o primeiro lance;
- a única fonte de `passeConsumido = true` foi removida.

---

## Perguntas do enunciado, uma a uma

1. **A missão ainda está bloqueada por outro caminho no lance?** Não no servidor (ver ℹ️6). Os ramos de devolução estão inertes, mas armados (ℹ️2).
2. **As boas-vindas podem creditar 2×?**
   - Não pelo login normal. A ref é fixa e o CAS cobre `pontos_lance`, `creditos_lance` e `atualizado_em`. O INSERT concorrente cai no UNIQUE (23505 → relê → vê a ref).
   - O endereço é posto em minúsculas em `validarEndereco` (`validate.mjs:29`) e outra vez em `ledger-lance.normalizar`, por isso EIP-55 e minúsculas dão a mesma linha.
   - Nenhum outro escritor reescreve `historico_lance`: o `passe-pontos.mjs` só mexe em `pontos`/`historico`, e as refs de cliente têm prefixo (`lance:`, `passe-<tipo>:`).
   - **Sim** depois de apagar a conta (ℹ️5).
   - Bloquear: com o Supabase parado, sim (ℹ️1). Creditar a quem falhou a autenticação: não, porque o bónus corre depois de `verifyMessage` e de `assinarUserSession` (mutante MB4 morto).
3. **Ainda há `window.location.origin` em links partilhados, ou `desafiogut.com`?**
   - `window.location.origin` sobra só em `PrivyRoot.jsx:77` (diagnóstico) e `lib/imagem.js:18` (comparação de origem). Nenhum dos dois é um link partilhado.
   - `desafiogut.com`: sobra no GUTO (⚠️1). No `mercadopago.mjs:38` é `@desafiogut.com.br`, que está correcto.
4. **O CardLance ficou coerente?** Sim. Não há variáveis órfãs nem imports mortos: `useState`, `motion`, `reduce`, `refetchSaldoRs` e `boxAvisoNeutro` continuam usados, e o eslint dá 0 erros. Não sobra nenhuma referência a inventário ou ao balão. Sem pontos, o botão fica desligado e a mensagem de pontos aparece (a lógica não mudou; só falta o teste, ℹ️4).
5. **Os testes são vácuos?** Não. 14 de 16 mutantes morreram (tabela abaixo). Os sobreviventes são MA2 (código morto) e MC5 (buraco anterior ao UTAC).
6. **Escopo (GATE 3 / R20)?** Todos os ficheiros tocados estão nas entregas das frentes A, B e C, ou são testes que codificavam o comportamento removido (`utac120-inventario`, `utac110i1-front-billing`). `registar-palpite.mjs` e `Dashboard.jsx` não foram tocados (R18-129-3). O executor não inventou nada fora do pedido: o valor 50, a ref fixa e o fail-soft vêm do R18-129-1.
7. **Outros consumidores incoerentes?** Ver ℹ️3 (o texto da Carteira, o contador de Passe Relâmpago que nunca é gasto, o texto do GUTO).

---

## Mutantes (aplicados com assert de 1 ocorrência; cada ficheiro restaurado e md5 confirmado)

| # | Mutante | Suítes | Resultado |
|---|---|---|---|
| MA1 | repor `consumirPasse` + 400 `sem_passes_disponiveis` no lance | utac129-lance-sem-passe; utac120-inventario | **MORTO** (3 RED: A1, A2, A3; 1 RED no utac120) |
| MA2 | `let passeConsumido = true;` | as mesmas | **SOBREVIVE** (5/5; 8/8), ver ℹ️2 |
| MA3 | missão só no programado (`if (ehProgramado)`) | utac129-lance-sem-passe | **MORTO** (A1) |
| MB1 | `PONTOS_BOAS_VINDAS = 500` | utac129-boas-vindas | **MORTO** (6 RED) |
| MB2 | ref por dia `boas-vindas:<dia>` | utac129-boas-vindas | **MORTO** (B1, só pela ref literal; B2/B3 passariam no mesmo dia) |
| MB3 | sem `await` (fire-and-forget) | utac129-boas-vindas | **MORTO** (B1, B4, B6) |
| MB4 | crédito ANTES da verificação da assinatura | utac129-boas-vindas | **MORTO** (B5) |
| MB5 | sem `.catch` | utac129-boas-vindas | **MORTO** (B6) |
| MB6 | motivo `login` em vez de `boas-vindas` | utac129-boas-vindas | **MORTO** (B1-B3) |
| MC1 | `window.location.origin` só no PainelIndicacao | utac129-front | **MORTO** (C2) |
| MC2 | `window.location.origin` só no ChatbotWidget | utac129-front | **MORTO** (C2) |
| MC2b | `location.origin` (sem `window.`) no ChatbotWidget | utac129-front | **MORTO** (C2, porque falta o padrão `${ORIGEM_PRODUCAO}/?ref=`) |
| MC3 | `"https://desafiogut.com"` de volta no MercadoLances | utac129-front | **MORTO** (C3) |
| MC4 | `PWA_PASSE = "https://desafiogut.com"` | utac129-front; utac110i1-front-billing | **MORTO** (C3; 2 RED no 110i1) |
| MC5 | tirar `semPontosFlash` do `desabilitado` do botão | utac129-front; utac110j5-pontos-lance | **SOBREVIVE** (5/5; 12/12), ver ℹ️4 |
| MC6 | esconder o botão sem pontos | — | não aplicado (o padrão multi-linha não casou por causa do CRLF); descartado |

Sonda extra (não é mutante): Supabase parado → login `PENDURADO` aos 3 s, com controlo positivo verde (ℹ️1).

## Correcções sugeridas, por prioridade
1. ⚠️1: domínio morto no `PROMPT_CONFORMIDADE` do GUTO (precisa de autorização: ficheiro fora das entregas). Corrigir antes de virar a flag, ou aceitar a janela até lá.
2. ℹ️2: apagar o código morto `passeConsumido`/`devolverPasse` do lance.
3. ℹ️1: timeout de ~1,5 s nas boas-vindas (e, no mesmo UTAC, no `registarAtividade`).
4. ℹ️3/ℹ️4/ℹ️5: textos da Carteira e do GUTO, teste do `disabled` do botão, tombstone das boas-vindas. Para UTAC próprio.

---

## Resposta do executor (tratamento dos achados) — correcções NÃO re-validadas por 2.ª ronda (declarado)
| Achado | Tratamento | Prova |
|---|---|---|
| ⚠️ GUTO manda para `desafiogut.com` (`_lib/guto-perfis.mjs:90/96`, prompt de conformidade) | **ESCALADO ao operador** (GATE 3/12): ficheiro fora das entregas do spec e com âncoras verbatim vigiadas por testes. Atenuante: no Android deixa de ser usado quando `isLeilaoAtivo.android=true` (Frente D) | — |
| ℹ️1 login pendura com o Supabase pendurado | **CORRIGIDO** em `auth-user.mjs` (ficheiro autorizado): `Promise.race` com teto `TIMEOUT_BOAS_VINDAS_MS = 1500` + `clearTimeout`; o crédito continua idempotente | teste B7 (cliente que nunca responde → 200 em < 3 s) · mutante **M5** (sem teto) → **RED** (pendura até ao timeout) |
| ℹ️2 / MA2 código morto armado (`passeConsumido` + `devolverPasse`) em `lance-relampago.mjs` | **CORRIGIDO**: import, variável e os 2 ramos de devolução removidos (−13 linhas) | teste A6 (blindagem falha → 502, pontos devolvidos, inventário intocado + fonte sem `devolverPasse`/`passeConsumido`) · mutante **M6** → **RED** |
| ℹ️3 textos e contadores incoerentes (`MinhaCarteira.jsx:384`, `guto-perfis.mjs:221`, contador de Passe Relâmpago que só cresce, comentários `CardLance.jsx:34-35`) | **PENDÊNCIA declarada**: ficheiros fora das entregas | — |
| ℹ️4 / MC5 o bloqueio do botão pelos pontos não tem teste | **PENDÊNCIA** (pré-existente ao UTAC129; o servidor recusa com 400) | — |
| ℹ️5 boas-vindas repetíveis com apagar e recriar a conta / Sybil | **REGISTADO** (decisão R18-129-1 do operador); vector para UTAC de anti-abuso | — |
| ℹ️6 missão inalcançável por `EM_BREVE_MODE` | já declarado (R18-129-2) | — |
