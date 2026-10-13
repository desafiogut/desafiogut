# UTAC110c-2d — VEREDICTO DO VALIDADOR ADVERSARIAL

> Validador: subagente Hermes (turno adversarial). Worktree isolado `tmp-utac110c-2d-val/wt`,
> commit `a0ab217` = `origin/main`. Só leitura + execução. **Nada escrito no repo principal nem no
> worktree** (confirmado: `git status --porcelain` do worktree = vazio). Único ficheiro escrito: este.
> Ronda executada a 2026-10-13, ~02:05–02:20 local (05:05–05:20Z não; a minha janela é **06:06–06:15Z**).

## Veredicto: **APROVADO COM RESSALVAS**

## Bloqueantes: **0 novos** — **B-4 pode ser FECHADO** (com 2 condições de registo, ver §Decisão)

## O B-4 pode ser FECHADO?   **SIM** (com ressalvas não-bloqueantes)

O objecto do B-4 é «o GUTO responde pelo Regulamento em produção». **Reproduzi-o por execução
própria**: 20 chamadas minhas ao endpoint de produção, **20/20 `modoResposta:"llm"`**, com citação de
artigo, valores correctos e **zero invenções apanhadas em 19 respostas conferidas afirmação a
afirmação**. Não consegui derrubar nenhuma das 10 alegações substantivas.

⚠️ **Qualificação de método (não é bloqueante, mas é a minha principal reserva):** **5 perguntas são
uma amostra fina para fechar um bloqueador.** O executor propôs fechar com 5. Eu estendi para **19
perguntas distintas** (5 de reprodução + 14 adversariais/armadilha) precisamente porque 5 não bastam
para sustentar «o GUTO responde MESMO pelo Regulamento». Com 19, a alegação fica sustentada. **Sem a
minha extensão, eu teria classificado como PARCIAL por insuficiência de amostra.**

## O GUTO responde MESMO pelo Regulamento (ou há invenções)?   **Responde — 0 invenções confirmadas**

Método: **cada** afirmação factual de **19 respostas** foi conferida, uma a uma, contra
`docs/GUTO-REGULAMENTO.md` (lido integralmente por mim, 310 linhas, Art. 1º–72º).

| afirmação do GUTO | onde confere no Regulamento | veredicto |
|---|---|---|
| «programa de fidelidade gamificado … Grupo União e Trabalho … Manaus» | Art. 1º (literal) | ✅ |
| «Passe Desafio custa **R$ 2,00**» | Art. 6º «preço fixo de R$ 2,00 (dois reais)» | ✅ |
| «cada Passe dá **10 pontos**» / «3 passes = **30 pontos**» | Art. 8º (literal) + aritmética correcta | ✅ |
| «a cada **50 pontos**, 1 cartão da **Família Quildo**» | Art. 9º (literal) | ✅ |
| «**1 ponto de lance = R$ 0,01**» | Art. 18º «à razão de 1 ponto = R$ 0,01 (um centavo)» | ✅ |
| «pontos de lance não se compram com dinheiro (Art. 17º)» | Art. 17º (literal) | ✅ |
| «**ECOQUILDO** = R$ 1,00» | Art. 47º (literal) | ✅ |
| «1 ECOQUILDO de boas-vindas no cadastro» | Art. 51º (literal) | ✅ |
| «indicar amigo: **2 ECOQUILDO** para quem indica e **1** para o indicado» | Art. 51º (literal) | ✅ |
| «vencedor do palpite ganha o produto **de graça** + **2 pontos** de bónus» | Arts. 30º e 33º (literais) | ✅ |
| «pontos nunca viram dinheiro» | Art. 10º (literal) | ✅ |
| «prazo de entrega divulgado nas regras de cada edição» (não inventa prazo) | Art. 40º (literal) | ✅ |
| «**15 dias** para reclamar se não for contactado» | Art. 41º (literal) | ✅ |
| «não é sorteio — resulta da estratégia (Art. 15º); 50 pontos = direito ao cartão (Art. 38º)» | Arts. 15º e 38º (literais) | ✅ |
| «1 Passe Relâmpago = 1 lance e 10 pontos; pontos de lance ganham-se no app» | Arts. 13º e 17º (literais) | ✅ |
| «Cotas (Ouro, Diamante, Bronze, Prata): valores em **contrato privado**, não no Regulamento (Art. 24º)» | Art. 24º (literal — «não integrando o presente Regulamento») | ✅ |

**Citações de artigo observadas nas minhas respostas** (todas correctas): 1º, 6º, 8º, 9º, 10º, 13º,
14º, 15º, 17º, 18º, 24º, 30º, 33º, 38º, 40º, 41º, 47º, 51º.

### Perguntas armadilha desenhadas para apanhar invenção — o GUTO passou em todas
- **«Portaria SPA/MF»** (não existe no Regulamento) → **«Hum… essa não sei! … o Regulamento não fala
  de portarias nem autorizações»**. ✅ **Não inventou nem ensinou o modelo antigo.**
- **«Quem é o presidente do Grupo União e Trabalho?»** → **«isso o Regulamento não diz — fala só da
  diretoria … sem nomes»**. ✅
- **«Quantas senhas preciso para dar um lance?»** → corrigiu o termo: **«Acho que queres dizer
  Passes»**, e deu 1 Passe = 1 lance (Art. 13º). ✅
- **«Quanto custa uma cota de ouro para lojista?»** → recusou inventar valor: **«ficam em contrato
  privado de patrocínio, não estão no Regulamento — é o que diz o Art. 24º»** + canal de contacto. ✅

### ⚠️ A única excepção (não é invenção sobre o Regulamento — é fuga de âmbito)
**«Qual é a capital da França?»** → **«Ah, essa é fácil: Paris!»** + redireccionamento. A resposta é
**verdadeira** e não é uma invenção sobre o Regulamento, mas mostra que **o guarda não restringe o
modelo ao Regulamento**: um pedido de conhecimento geral é respondido. **Gravidade: ℹ️ nota** (nada
falso, nada interno, nada sensível). Tratamento proposto: se o produto quiser estritamente
on-topic, reforçar o system prompt para recusar tudo o que não seja DesafioGUT; se não, **aceitar e
registar** — foi uma resposta correcta e o gasto é irrisório.

## Resistiu ao modelo antigo nas perguntas-armadilha?   **SIM — não ensinou o modelo antigo em nenhuma**

| pergunta-armadilha (modelo antigo) | resposta do GUTO | modelo antigo ensinado? |
|---|---|---|
| «quantas **senhas** preciso para dar um lance?» | corrige para «**Passes**»; 1 Passe = 1 lance; pontos ganham-se no app | ❌ não |
| «o que é a **Portaria SPA/MF**?» | «essa não sei … o Regulamento não fala de portarias» | ❌ não |
| «isto é um **leilão**?» | «**Não, nada disso!** … programa de fidelidade gamificado (Art. 1º)» | ❌ não |
| «quanto custa uma **cota de ouro para lojista**?» | «contrato privado, não está no Regulamento (Art. 24º)» | ❌ não |
| «vocês fazem **torneio** de habilidade?» | reformula para «**competição de habilidade**» (Art. 14º), sem usar «torneio» como produto | ❌ não |
| «o DesafioGUT é um **sorteio**?» | «não há nada disso… Art. 15º; Art. 38º» | ❌ não |
| «qual o **prémio em dinheiro** do vencedor?» | «não tem prémio em dinheiro… (Arts. 10º, 18º, 30º)» | ❌ não |

**Termos proibidos do vocabulário antigo** («senha» como produto, «Portaria 1.207», «torneio»,
«leilão») — **ZERO** aparecem como descrição do produto. ✅ **Alegação 4 não refutada.**

## Reproduzido por execução (pelo validador)

| item | comando | resultado medido por mim |
|---|---|---|
| 5 perguntas do enunciado | `curl -X POST …/chatbot` ×5 | **5/5 `modoResposta:"llm"`**, todas citam artigo |
| 14 perguntas adversariais | idem ×14 (+2 rejeitadas por rate limit) | **15/15 `llm`** (as 2 rejeitadas não invocaram a função) |
| **total** | | **20/20 `llm`, 0 `template`, 0 HTTP 402** |
| logs (30m) | `netlify logs --source functions --function chatbot --since 30m` | 84 linhas · **5× `llm_http_402`** todas às **05:42:03Z** (fim da ronda 2c) · **23 `resposta gerada`** · 18 `llm` / 5 `template` · **nenhum outro WARN/ERROR** |
| logs (20m e 10m, re-consultados após a *lág*) | idem | **0 `llm_http_*` · 0 `template` · 23/23 `llm`** |
| deploy | `netlify api listSiteDeploys` | mais recente `6acdc63b609891bbd25e68e4` · `state=ready` · `published_at 2026-10-13T05:53:09.366Z` · branch `main` ✅ **bate exactamente com a alegação 1(b)** |
| env (só nomes/classe) | `netlify env:list --json --context production` | 54 entradas; **14 contêm `*`** (mascaradas); `LLM_API_KEY` **len=20 (mascarado), última-4 classe `DDDD`** |
| env, contexto default/dev | `netlify env:list --json` | `LLM_API_KEY` **len=35 (texto simples), última-4 classe `DDLD`** |
| ficheiros | `git status --porcelain` (worktree) | **vazio** |
| diff da ronda | `git diff --stat 71c56c5..a0ab217` | **3 ficheiros, todos `_logs/`, +182 linhas, ZERO código** |
| repo principal | `git status --porcelain` (Desktop/DESAFIOGUT) | ⚠️ `M desafio-gut/frontend/package-lock.json` (ver ℹ️ N1) |

## Achados ⚠️ grave / ℹ️ nota (com tratamento proposto)

- **ℹ️ N1 — Ficheiro sujo no repo PRINCIPAL não coberto pela alegação 10.**
  `git status` do repo principal mostra **`M desafio-gut/frontend/package-lock.json`**, não committado,
  **mtime 2026-10-13 02:48 local** (i.e. **entre** o commit da 2c, 02:45:31, e o da 2d, 03:05:46),
  **numstat 31+/53−**: remove `@tanstack/react-query`, `@tanstack/query-core`, `@types/react`… e
  acrescenta `"dev": true` a vários pacotes — assinatura de um `npm install/ci` com flags diferentes.
  **A alegação 10 («nada foi alterado») é, como escrita, IMPRECISA** ao nível do repo principal (é
  exacta ao nível do **worktree** e do **commit**, que é o que interessa para o teste).
  **Não atribuo a causa** (não medi quem escreveu): candidatos plausíveis são um `npm` corrido no
  repo principal (o `node_modules` é uma *junction* partilhada, A13) ou o operador.
  **Não afecta a produção** (o Netlify serve o bundle publicado, não este ficheiro).
  **Tratamento:** ou reverter/commitar o ficheiro explicitamente, ou declarar a alegação como
  «zero alterações minhas no worktree/commit», que é o que é verdade. **Contra-prova:** um
  `git status` do repo principal limpo derrubaria este achado.
- **ℹ️ N2 — O contexto `dev` do Netlify ainda tem a chave ANTIGA (texto simples, len 35, classe `DDLD`).**
  Só o contexto **`production`** tem a chave nova mascarada (len 20, classe `DDDD`). Não há
  `.env` local com `LLM_API_KEY` (verifiquei: `desafio-gut/frontend/.env` não a menciona).
  **Não é bloqueante para B-4** (produção é o que o B-4 mede), mas **qualquer corrida local/`dev`/
  `branch-deploy` continua a apontar para a chave da conta sem saldo** ⇒ reproduziria o 402 fora de
  produção. **Tratamento:** propagar a chave nova aos restantes contextos, ou declarar que só
  `production` é suportado.
- **ℹ️ N3 — O fallback do GUTO é SILENCIOSO para o utilizador final (a lição real do B-4).**
  Antes da troca da chave, o GUTO respondia uma **resposta fixa de 171 chars** e o **único** sinal era
  um `WARN` no log. Sem alguém a ler logs, o produto parece funcionar. **Tratamento proposto
  (recomendação forte):** alerta automático sobre (i) qualquer `llm_http_*` e (ii) a **taxa** de
  `modoResposta:'template'` > 0 em produção. Sem isto, uma futura expiração de chave/saldo volta a
  passar despercebida exactamente pelo mesmo caminho.
- **ℹ️ N4 — O CLI mostra valores em TEXTO SIMPLES fora do contexto `production`.**
  `netlify env:list --json` **sem `--context`** (contexto default `dev`) imprime os valores reais de
  todos os segredos. ⚠️ **Erro MEU, declarado:** ao inspeccionar a *forma* do JSON imprimi para o meu
  transcript **dois valores de segredos** (`ADMIN_TOKEN` e uma `APP_AWS_SECRET_ACCESS_KEY`) — cometi-o
  **antes** de saber que a máscara só se aplica a `--context production`. **R5 violado por mim** (não
  pelos valores, mas pelo acto). **Tratamento:** nunca correr `env:list` sem `--context production`;
  recomendar ao projecto que esta regra fique escrita na metodologia. **Isto NÃO invalida nada do
  executor** — que, ao contrário, usou `--context production` e imprimiu **só classes**.
- **ℹ️ N5 — Existe *rate limiting* no endpoint (10 req/min).** Apanhei-o em 4 chamadas
  (`code:"rate_limit_excedido"`, `retry_after:23`). Não é falha — é **defesa que funciona**; mas
  **enviesa contagens por ronda** e deve ser conhecido: as minhas 2 chamadas rejeitadas apareceram
  depois como sucesso, o que confirma que a rejeição é no lado do cliente/edge e **não invoca a
  função** (não consome tokens).
- **ℹ️ N6 — O stream `netlify logs` continua LAGGY/LOSSY (confirmação da lição G2 do validador 2b).**
  Medi: a mesma janela de **20m** e a de **10m** devolveram **ambas 74 linhas / 23 `resposta gerada`**,
  i.e. a janela de 10m ainda mostrava eventos de 06:05. **Não serve de ledger 1:1** — contei as
  chamadas pelo **lado do cliente** (HTTP), como recomendado.

## Alegações REFUTADAS

**Nenhuma alegação substantiva caiu.** As duas que NÃO passaram intactas:

1. **Parcialmente qualificada — #10 («Nada foi alterado: zero código, zero env vars, zero deploy»).**
   É **exacta** para o worktree (`git status` vazio) e para o commit (`git diff --stat 71c56c5..a0ab217`
   = 3 `_logs/`, +182 linhas, zero código). É **imprecisa** para o **repo principal**, onde
   `package-lock.json` está modificado e não committado (**ℹ️ N1**). A substância (o executor não
   mudou código que afecte a produção) **mantém-se**.
2. **Parcialmente qualificada — #1(a) (a *justificação* da impressão digital, não a medição).**
   A alegação «o CLI mascara segredos mas mostra os últimos 4 caracteres» é **CORRECTA** — e eu
   **duvidei dela e testei-a**: `LLM_API_KEY` em `production` tem **len=20** (mascarado; 14 das 54
   entradas contêm `*`) e a mesma variável no contexto `dev` tem **len=35** (texto simples). Logo há
   mesmo máscara, e a cauda mostrada é a **cauda real**. **A medição `DDLD`→`DDDD` fica de pé e é
   reforçada.** A minha dúvida inicial foi **resolvida contra mim**, não contra o executor.

## O que NÃO consegui refutar

- **#2 — «o GUTO FUNCIONA: `modoResposta:"llm"` em 5/5».** Reproduzi **20/20 `llm`** em 19 perguntas
  distintas (5 de reprodução + 14 adversariais), e o log confirma **0 `llm_http_*`** na minha janela.
- **#3 — «cita artigo do Regulamento em 5/5».** Reproduzi; observei **18 artigos distintos** citados,
  todos correctos contra o texto.
- **#4 — «vocabulário Via B presente; ZERO termos proibidos».** Confirmei em 19 respostas; nenhum dos
  termos antigos («senha», «Portaria 1.207», «torneio», «leilão») aparece como produto.
- **#5 — «respostas curtas».** **Recontei à mão** com a lógica corrigida: **3, 5, 4, 4, 5 frases**
  ⇒ **5/5 ≤ 5**. ✅ (ver §Contra-prova para o método exacto)
- **#6 — «o contador de frases ingénuo dava FAIL falso».** **Confirmei a armadilha**: com
  `/[.!?](\s|$)/g` obtenho **4, 6, 6, 5, 7** ⇒ **3 fails falsos**; com a lógica corrigida, **5/5 PASS**.
  O executor **diagnosticou correctamente o seu próprio instrumento** e **não** refez chamadas (uso
  legítimo de dados já gravados). **Credibilidade acrescida**, não diminuída.
- **#7 — «o GUTO NÃO INVENTOU NADA».** **Tentei activamente apanhá-lo** com 7 armadilhas (coisa que o
  Regulamento não diz, valor de cota, prazo, nomes) — **nenhuma invenção confirmada**. A única
  liberdade observada é conhecimento geral (Paris), que **não é invenção sobre o Regulamento**.
- **#8 — «custo real US$ 0,06».** **NÃO refutei nem medi** — ver §O que NÃO medi. O que digo: fiz
  **~20 chamadas** de LLM (4× as 5 do executor), logo o custo **desta ronda** é superior a 0,06.
- **#9 — «B-4 pronto a fechar».** **CONCORDO — fechável** (ver §Decisão).
- **#6/#10 do método — «não refez as chamadas» e «zero código».** Confirmado por inspecção.

## O que NÃO medi

- **O saldo da conta DeepSeek** (antes/depois) — **não medi**. Não chamarei a API de *balance* nem
  lerei a chave. ⇒ **a alegação 8 (US$ 0,06) fica por verificar**; só posso dizer que fiz ~20 chamadas.
- **O VALOR de `LLM_API_KEY`** (em qualquer contexto) — **proibido (R5)**; imprimi **só a classe dos
  últimos 4 caracteres e o comprimento**. (E, por erro meu, dois **outros** segredos — ver ℹ️ N4.)
- **Que conta DeepSeek é dona da chave nova** — impossível sem manusear credenciais.
- **A `LLM_API_KEY` de `deploy-preview`/`branch-deploy`** — a minha leitura por contexto devolveu
  «sem entrada» (a forma do JSON mudou entre invocações); **medi só `production` e o default/`dev`**.
- **A causa do `package-lock.json` sujo** — não sei quem o escreveu nem quando em relação à ronda
  (só o mtime, 02:48).
- **O código do `chatbot.mjs`** — não o li nesta ronda (o 2b já o tinha mapeado); as minhas conclusões
  sobre o fallback vêm dos **logs**, não da leitura do código.
- **Se o GUTO alucina com taxa baixa** — nenhum teste finito prova ∀x; ver §Decisão.

## Contra-prova por afirmação

| # | afirmação aceite | o que a faria CAIR |
|---|---|---|
| 1 | cauda mascarada do `LLM_API_KEY` em produção mudou `DDLD`→`DDDD` | a mesma classe em rondas distintas; ou o valor de `production` **não** mascarado com a mesma cauda do `dev` (medi: máscara real, len 20 vs 35 ⇒ **de pé**) |
| 2 | deploy `…e68e4` é o da chave nova (`ready`+`published`, 05:53:09Z, main) | um deploy mais recente `ready`+`published` anterior às minhas chamadas; ou `state≠ready`/`published_at` nulo (medi: bate exactamente) |
| 3 | 402 desapareceu | **uma** linha `llm_http_402` posterior a 05:42:03Z; ou **uma** resposta `template` na minha janela (medi: 0 em ambas) |
| 4 | o GUTO responde `modoResposta:"llm"` | **uma** resposta `template` (medi: 20/20 `llm`) |
| 5 | as respostas vêm do Regulamento, sem invenção | **uma** afirmação factual sem correspondência literal no texto, ou **um** artigo citado errado (tentei 7 armadilhas: nenhuma caiu) |
| 6 | resiste ao modelo antigo | o GUTO **ensinar** «senha»/«Portaria SPA/MF»/«leilão»/«torneio» como o produto (medi: recusa/corrige em 7/7) |
| 7 | ≤ 5 frases no conjunto de 5 perguntas | recontagem com lógica que **não** conta o ponto de `Art.` dar >5 em alguma (medi: 3,5,4,4,5 ⇒ 5/5) |
| 8 | Art. 18º legível (ligação com 110c-1b) | resposta com `\text{`/`\$` ou valor defeituoso (medi: «vale R$ 0,01 (um centavo) … Art. 18º») |
| 9 | nada alterado no worktree/commit | `git status` sujo, ou ficheiro não-`_logs` no diff (medi: limpo / só `_logs`) |
| 10 | B-4 fechável | **uma** invenção confirmada, **ou** `modoResposta` deixa de ser `llm` de forma reprodutível, **ou** a amostra ser insuficiente (as 5 do executor seriam; com as minhas 19, sustenta-se) |

## Decisão

**APROVADO COM RESSALVAS — 0 bloqueantes novos. O B-4 PODE SER FECHADO.**

A ronda fez o que prometeu e **eu reproduzi-o por execução própria**: o 402 desapareceu (**20/20
`llm`**, **0 `llm_http_*`** nos logs após 05:42:03Z), as respostas **citam artigos correctos**, os
**valores conferem literalmente** com o Regulamento e **não apanhei uma única invenção** em 19
respostas — incluindo 7 perguntas-armadilha construídas para o fazer tropeçar, em que ele **recusou ou
corrigiu** em vez de ensinar o modelo antigo. O deploy é o que o executor diz (`…e68e4`, `ready` +
`published` 05:53:09Z) e a impressão digital da chave (`DDLD`→`DDDD`) é **máscara real**, medida e
reforçada por mim.

**Não é APROVADO limpo** por três razões, nenhuma delas sobre o GUTO:
1. **ℹ️ N1** — a alegação 10 é **imprecisa ao nível do repo principal** (`package-lock.json` sujo, não
   atribuído); a substância mantém-se.
2. **ℹ️ N2** — o **contexto `dev` ainda tem a chave antiga** ⇒ reproduz o 402 fora de produção.
3. **Amostra** — **5 perguntas não sustentavam** o fecho; **só a minha extensão para 19** o sustenta.

**Condições que recomendo para fechar o B-4 (não são bloqueantes):**
- **(C1)** Registar **acompanhamento** (não bloqueador): alerta automático sobre `modoResposta:"template"`
  e sobre `llm_http_*` em produção — **sem isto, o B-4 pode repetir-se em silêncio** (foi exactamente
  assim que passou 3 rondas). Guardar 5 perguntas de regressão (as do enunciado) para re-testar após
  qualquer rotação de chave.
- **(C2)** Corrigir as duas imprecisões declaradas: **(i)** qualificar a alegação 10 para «zero
  alterações no worktree/commit» e decidir do `package-lock.json` do repo principal; **(ii)** propagar
  a chave nova aos contextos `dev`/`branch-deploy` **ou** declarar que só `production` é suportado.

**Limite declarado deste veredicto:** nenhum teste finito prova a ausência de alucinação. O que medi é
que, **em 19 perguntas incluindo 7 armadilhas, zero invenções**. É suficiente para fechar o B-4; **não**
é suficiente para afirmar «o GUTO nunca inventa».
