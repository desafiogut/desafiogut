# UTAC147 — SEG4 · VALIDADOR ADVERSARIAL (2026-11-21, Opus 5.5)

Commits validados: `1474237` (backend) + `b75fee0` (frontend/Regulamento), base `9108312`.
Ambiente: worktree próprio `C:/Users/Moltbot/tmp-utac147-val/wt` (detached em `b75fee0`), com o `node_modules` ligado
por junction. Não toquei em produção, no working tree principal, em push nem em deploy.

## Veredicto: **APROVADO COM RESSALVAS**

O núcleo aguenta: o lance gasta exactamente 1 Passe Relâmpago, o palpite 1 Passe Programado, a compra PIX credita o
inventário N vezes por compra, a devolução não cria Passes e o Play Billing ficou intacto. Encontrei **3 defeitos de
código/teste**, que corrigi no meu worktree (3 commits, com teste e mutante), e **2 ressalvas que não são minhas para
corrigir**: uma de UI (Meus Ativos) e uma de coerência normativa (Regulamento, gate e GUTO), que precisa de decisão do
operador **antes do deploy**.

---

## ⚠️ Achados graves

### ⚠️1 — A trava do lance ficava órfã com a biblioteca REAL do @netlify/blobs (409 para sempre) — **CORRIGIDO `9bbd81d`**
- `lance-relampago.mjs:276-282` (em `b75fee0`): `set("trava:<key>", …, { onlyIfNew: true })`; `modified:false` ⇒ 409.
- A biblioteca real (`netlify/functions/node_modules/@netlify/blobs`, v10.0.0) repete sozinha o pedido:
  `dist/chunk-BGMFLNF6.js:142-158` (`fetchAndRetry`, 5 repetições em erro de rede ou status ≥ 500). Se a 1.ª tentativa
  **gravou** e a resposta se perdeu, a repetição recebe 412 ⇒ `{ modified:false }` (`dist/main.js:168-170`) para a trava
  **do próprio pedido**. O handler respondia 409 sem gastar o Passe, mas **não apagava a trava**.
- A `idempotencyKey` do CardLance é determinística (`CardLance.jsx:281`: `keccak256(endereco:valor:edição)`) ⇒ esse
  valor ficava **bloqueado para sempre** para aquele utilizador nessa edição («Este lance já está sendo processado»).
- Os testes do executor trocam o `@netlify/blobs` inteiro por um duplo que não repete (`mc9112-integracao-lance.test.mjs:47-51`).
- **Prova:** teste novo `_tests/utac147-val-trava-blobs-real.test.mjs`. Usa o `getStore` **real** (dist importada por URL
  com query, para escapar ao mock) contra um servidor Blobs falso em memória com `If-None-Match ⇒ 412`. No código do executor:
  `V3 … ✖ a trava gravada pelo PRÓPRIO pedido foi tomada por alheia (status 409)`. V1, V2 e V4 passam.
- **Correcção:** com `modified:false`, relê-se a trava. Se o `lanceId` for o deste pedido (UUID novo por pedido), o pedido segue.
  Se for outro, 409 como antes. Depois: 4/4. Também verdes: `mc9112` 12/12, `mc941` 7/7, `utac120` 8/8, `utac142` 1+9 skip,
  `utac145` 3+5 skip, `utac110f-lance-missao`, `utac129-lance-sem-passe`.

### ⚠️2 — O ecrã do palpite dizia «Palpite inválido» a quem não tinha Passe Programado — **CORRIGIDO `fcd07a8`**
- `registar-palpite.mjs` passou a responder `400 sem_passes_disponiveis` e `502 inventario_indisponivel`.
- `src/lib/palpite.js:57-63` traduzia **qualquer** 400 por «Palpite inválido». A Frente D só tratou o CardLance.
  A UI do palpite não sabe que o palpite passou a custar 1 Passe.
- **Correcção:** mensagens por código para os dois casos. Os outros 400 e o `sem_passe` (FK) ficam iguais. A guarda do
  UTAC137-SEG3 continua verde (4/4), tal como `utac107g2` 3/3 e `utac106f` 29/29.
  Teste V5, bidireccional, em `utac147-front-passes.test.mjs`.
- Fica de fora (decisão de UX): o botão «Palpitar» continua activo com 0 Passes Programados. Só a mensagem mudou.

### ⚠️3 — Nenhum teste activo garantia que login, boas-vindas, missão e sequência deixaram de creditar — **CORRIGIDO `fd21fb2`**
- Os testes positivos destas fontes ficaram em `test.skip` (`utac110f-fontes-lance` A1-A9, `utac129-boas-vindas` B1-B6,
  `utac110f-lance-missao` L1/L2/L4/L6, `utac110n` C1-C5, `mc93b` 8 testes), sem nenhum teste inverso activo.
- **Mutante VM8** (`BONUS_SEQUENCIA_ATIVO = true` em `_lib/pontuacao-store.mjs:48`): **SOBREVIVEU** com o código do
  executor (fail 0 em `mc93b-pontuacao-store` + `utac110n-pontos-lance`).
- **Correcção:** 4 testes inversos nos arneses que já existiam. V-C1: 5 acertos ⇒ 0 pontos e nenhum movimento «sequencia».
  V-A7: login-diario ⇒ 200 `desativado`, ledger intocado. V-B1: conta nova ⇒ 0 pontos. V-L1: lance 201 ⇒ 0 missões.
  Mutantes VM8, VM9, VM10 e VM11: todos RED.

### ⚠️4 — Meus Ativos continua a prometer as regras retiradas — **NÃO corrigido (fica para o executor)**
- `pages/MeusAtivos.jsx:242-273` ainda desenha três painéis com regras que saíram:
  - `PainelPontosLance` (`components/meus-ativos/PainelPontosLance.jsx:71,76`): «Ganhos pelo engajamento… bônus de
    100 pontos… Cada lance gasta o seu valor em pontos» e «Comece pelo login de hoje».
  - `ProgressoBonus`: «🎯 Progresso para o bônus».
  - `BonusSequenciaPontos` (`MeusAtivos.jsx:86`): «Complete 5 acertos seguidos para ganhar +50 pontos de lance».
- `lib/pontosLance.js:10-12` diz que o interruptor é «único (Carteira, **Meus Ativos**)», e o título do teste P5
  (`utac147-front-passes.test.mjs`) diz «Carteira e **Meus Ativos**». Mas `MOSTRAR_PONTOS_ENGAJAMENTO` só é usado em
  `MinhaCarteira.jsx`, e o P5 só verifica a Carteira. **A afirmação é falsa.** O próprio `UTAC147_SEG0-2_PARAGEM-HI5.md`
  (item 1) tinha isto na lista de por fazer.
- Porque não corrigi: esconder os 3 painéis mexe na grelha de Meus Ativos e parte cerca de 10 testes de
  `MeusAtivos.test.mjs` (linhas 142-190, 347-415, 495-575). É trabalho de Frente D, não de validador.

### ⚠️5 — Coerência normativa: o texto que VINCULA diz o contrário do sistema — **decisão do operador antes do deploy**
- **Regulamento v6.1** (é o que o site publica, via `RegrasOficiais.jsx:26` `?raw`, e o que o GUTO lê):
  - Art. 6º: os pontos para lances são «gratuitos, obtidos por… login contínuo, cumprimento de missões».
  - Art. 7º: o Passe Relâmpago dá «bônus de 100 pontos de lance».
  - Art. 15: «os pontos de lance utilizados na ação são consumidos».
  - Art. 3º: o Passe não é requisito para a «obtenção gratuita de pontos de engajamento».
  - **Art. 10: alterar as regras de pontuação exige «aviso prévio de 30 (trinta) dias» na interface do app.** O UTAC147 aplica a mudança de imediato.
- **Gate legal 3.5** (`TermosConsentimento.jsx:181`): «o Passe Relâmpago concede ainda um bônus de 100 pontos de lance».
  No site (PIX) isto deixou de ser verdade (R18-147-C).
- **GUTO** (`_lib/guto-perfis.mjs`):
  - `:231-235` «MODELO DE HOJE»: «O palpite não exige Passe», pontos «obtidos por engajamento diário, login contínuo e
    cumprimento de missões».
  - `:305`, no protocolo da **edição especial** (a que está aberta): «Como ganho? → … Cada lance gasta o seu valor em pontos de lance».
- O executor levantou isto no SEG-1 (conflito 7). O operador só decidiu o Art. 18. Não corrigi, porque reescrever o
  Regulamento ou o GUTO é decisão de produto (R20) e o GUTO está obrigado a «descrever SÓ o que o Regulamento diz».

---

## ℹ️ Notas

1. **Compra PIX «a meio»: a janela é maior do que a declarada.** O risco é descrito como «entre o ECOQUILDO e o
   `passes_creditar`». Na verdade vai do CAS dos pontos (`creditarBeneficios`) até `creditarPasse`, e cobre o
   ECOQUILDO, o lastro e a conversão. O retry passa por `respostaIdempotente` → `completarPendentes`, que **nunca**
   credita o inventário, e responde 200 `ok:true` sem Passe. Concordo com o executor em não creditar no retry: fazê-lo
   abria uma exploração (2.º pedido com a mesma chave enquanto o 1.º está entre o CAS e o inventário ⇒ 2N Passes).
   Fechar a janela exige uma RPC idempotente por `ref` (migração, ST3).
2. **`passes-inventario.mjs:36-38` falha ABERTO.** `temRpc()` apanha a excepção do `getSupabase()` (sem
   `SUPABASE_URL`/`SERVICE_ROLE_KEY`) e cai no stock em memória de **99 Passes** (`STOCK_DUPLO`). Num contexto do
   Netlify sem essas variáveis, o lance e o palpite ficam de graça. A lib é anterior (UTAC120), mas passou a ser o
   portão do lance com este UTAC. Recomendo fail-closed fora dos testes. Não verifiquei o env dos contextos do Netlify.
3. **A idempotência não é por endereço.** O registo `lance-idem/<key>` e a `trava:<key>` são globais. Com
   `idempotencyKey = "trava:<k>"`, o passo 5 lê a trava de outro pedido e devolve `{ endereco, lanceId }` alheios como
   200 idempotente (fuga menor). A parte do registo `<key>` já vinha de antes.
4. **Especial com 1 Passe por lance**: decisão do executor, declarada. `_lib/especial-config.mjs:23,44` continua a
   validar `passeACadaLances: 3`, que agora é código morto.
5. **Art. 18 alterado no v6.1 sem subir a versão do gate** (continua 3.5). A spec dizia v6.2. Redacção literal:
   «O produto correspondente, consistente em produto fornecido…» (redundante). As 3 cópias são iguais (md5 da linha
   `8fe70bc4…` nas três) e o `docs/REGULAMENTO-v6.md` está intacto (diff vazio; continua com «prêmio»).
6. **Os 89 `test.skip` com «[UTAC147 …]»** (cerca de 96 em execução, por haver um em ciclo) correspondem todos, pelo
   título e pelo corpo, a regras retiradas. Nenhum esconde uma regressão que eu tenha visto. Alguns levaram consigo
   invariantes que **continuam válidas** e não foram adaptadas: `utac110e-front:153` (ECOQUILDO 0 vs 5),
   `utac110g1-carteira-resgate:176` (posição do «Resgatar cartão»), `utac110j5:196` (proporções antes do 1.º capítulo),
   `utac110j3` O2. Há perda de cobertura, mas não verifiquei por render se houve regressão.
7. **Comentários e mensagens que deixaram de ser verdade:** `registar-palpite.mjs:107-108` («Qualquer login cria a
   linha (login diário / boas-vindas)») e `lib/palpite.js:55` («Entre de novo…»). Na prática, quem tem um Passe
   Programado comprado tem linha em `pontos`.
8. **A indicação** continua a creditar +50 pontos de lance (`fontes-lance.mjs:259-264`), e o PainelIndicacao, o
   ChatbotWidget e o GUTO anunciam esses pontos. Os pontos já não servem para nada. A UI das Regras só fala do ECOQUILDO.
9. **Perdas a favor da casa, só registadas em log:** `consumirPasse` com timeout depois do commit no Postgres ⇒ 502 e o
   Passe perde-se; `devolverPasse` falha ⇒ o Passe perde-se. Já era assim na família do UTAC120.
10. **Compras PIX anteriores ao UTAC147 não estão no inventário** (produção: 3 linhas, medido pelo executor). Quem
    comprou por PIX antes fica sem Passes para licitar.
11. **Play Billing (R18-147-A), confirmado:**
    - `git diff 9108312 b75fee0 -- validar-compra-google.mjs`: vazio.
    - O corpo de `creditarPasseGoogle` está igual. Os auxiliares partilhados passaram de `ehRelampago` para
      `comBonusLance`, que é `ehRelampago` por omissão.
    - O meu mutante VM4 (Google com `bonusLance:false`) dá RED, logo o bónus do Google está guardado por teste.
12. **Faixa da especial e layouts oficiais:** a única mudança no `CartaoEdicao` é a prop opcional `semNomeNaFaixa`
    (por omissão `false`), e só o `CardEdicaoEspecial` a passa. `TabelaLances` e `_formAcaoEdicao` sem diff.
13. **CardLance:**
    - `estadoPassesLance` é fail-closed: sem sessão, a carregar, com erro, ilegível ou com 0 Passes, não licita.
      Com 1 ou mais, licita.
    - `useInventarioPasses` trata «com endereço mas sem token» como a carregar.
    - Validado por lógica pura e pela fonte (não há DOM).

---

## Mutações (minhas, diferentes das M1-M5 do executor)
Script: `…/scratchpad/mut147/mut.mjs` e `mut2.mjs`. Cópia de segurança **fora do repo**, âncora com ocorrência única,
restauro por cópia e md5 comparado.

| # | Mutante | Resultado | Restauro |
|---|---|---|---|
| VM1 | PIX credita sempre 1 Passe (ignora o pacote) | RED (2) | md5 IDÊNTICO |
| VM2 | `desfazerPagamento` devolve sem condição (cria Passes) | RED (1) | md5 IDÊNTICO |
| VM3 | palpite devolve o Passe mesmo com o palpite criado | RED (3) | md5 IDÊNTICO |
| VM4 | Play Billing perde o +100 (R18-147-A) | RED (1) | md5 IDÊNTICO |
| VM5 | PIX volta a dar o +100 (R18-147-C) | RED (7) | md5 IDÊNTICO |
| VM6 | sem o reconhecimento da trava própria (o meu fix) | RED (1) | md5 IDÊNTICO |
| VM7 | palpite sem a mensagem de Passes (o meu fix) | RED (1) | md5 IDÊNTICO |
| VM8 | sequência volta a creditar | **SOBREVIVEU** no código do executor → RED (1) com `fd21fb2` | md5 IDÊNTICO |
| VM9 | login-diario volta a creditar +5 | RED (1) com `fd21fb2` | md5 IDÊNTICO |
| VM10 | auth-user volta a dar boas-vindas +50 | RED (1) com `fd21fb2` | md5 IDÊNTICO |
| VM11 | lance volta a creditar a missão +10 | RED (1) com `fd21fb2` | md5 IDÊNTICO |

⚠️ **Incidente do meu instrumento:** a 1.ª versão do VM10 fazia `await` do crédito, e o teste B7 (Supabase pendurado)
nunca terminava. Parei a tarefa, repus `auth-user.mjs` a partir da cópia de segurança (md5 `ffc53066…`, igual ao HEAD)
e voltei a correr com `Promise.race` e `timeout` por ficheiro.

## Os meus commits (para cherry-pick, por esta ordem)
1. `9bbd81d` — fix(UTAC147-val): trava do lance reconhece a própria escrita repetida pelo @netlify/blobs
2. `fcd07a8` — fix(UTAC147-val): palpite sem Passe Programado mostra a mensagem certa
3. `fd21fb2` — fix(UTAC147-val): guardas negativas das fontes de pontos retiradas

## O que NÃO verifiquei
- **Produção**: env do Supabase por contexto do Netlify; se a API real dos Blobs devolve `etag` num PUT condicional
  com sucesso. O precedente é `_lib/pedidos.mjs:316-318`, do MC102; eu não o medi.
- **Suítes completas** (por falta de RAM). Corri só ficheiros dirigidos, que estão listados acima.
- O render de Meus Ativos, da Carteira e do CardLance num browser, e as respostas do GUTO ao vivo.
- O comportamento real das RPCs `passes_consumir/creditar/devolver` no Postgres. Usei duplos, como o executor.
