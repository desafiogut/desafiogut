# UTAC137 — SEG3 — Validador adversarial

**Base:** `7640ff8` (worktree `C:/Users/Moltbot/tmp-utac137-val/wt`, HEAD destacado). **Commits do validador (locais, sem push):**
`414fe62` · `54dde79` · `7d89847` · `94ab84c`.

## Veredicto: **REFUTADO** (na forma em que foi publicado) — o conteúdo v6 aguenta; a entrega não

O núcleo do UTAC137 confirmou-se por medição: as Regras Oficiais desenham o v6 inteiro e exacto, o gate tem 12 blocos
literais do v6, a versão 3.4 é igual no app e no backend, o GUTO leva o v6 byte a byte com 14 âncoras literais, e a
guarda «P» está verde. Mas o commit publicado **parte o build num clone limpo** (o CI de `main` está vermelho por isso,
medido no GitHub) e ficaram **três textos que contradizem o v6** (dois visíveis no app, um no prompt do GUTO), um deles
sem nenhuma guarda. Os quatro defeitos estão corrigidos no worktree, cada um com teste e mutante que morde. Como o
`7640ff8` já foi enviado (push), publicado (deploy) e compilado (AAB v10), as correcções **não estão** em produção nem no
AAB v10: é o operador que decide se segue para um AAB v11.

## Achados

### ⚠️1 — `docs/REGULAMENTO-v6.md` fora do git: build e testes partem num clone limpo (CORRIGIDO `414fe62`)
- `RegrasOficiais.jsx` faz `import … from "../../../../docs/REGULAMENTO-v6.md?raw"` e 9 testes lêem o ficheiro, mas ele está
  **por versionar** no repo principal (`git status` → `?? docs/REGULAMENTO-v6.md`; `git ls-tree origin/main docs/` não o tem).
- Reprodução no worktree (checkout limpo de `7640ff8`):
  `node --test src/pages/__tests__/utac106h-regras.test.mjs src/components/__tests__/citacoesRegulamento.test.mjs`
  → `Error: ENOENT … wt\docs\REGULAMENTO-v6.md` · `ℹ pass 0 · ℹ fail 2`.
- **Em produção do CI:** `gh run view` do CI em `2dff292` (e em `7640ff8`, `cce5e75`) →
  `[UNRESOLVED_IMPORT] Could not resolve '../../../../docs/REGULAMENTO-v6.md?raw' in src/pages/RegrasOficiais.jsx`.
  O deploy e o AAB saíram bem só porque foram feitos a partir da árvore local, onde o ficheiro existe.
- Correcção: o ficheiro foi versionado **byte a byte** (md5 `4f72defc17aa1b9ae364ef25c1e1faa6`, o mesmo do repo principal;
  o texto não foi alterado). Guarda nova: `src/__tests__/utac137-seg3-validador.test.mjs` «todo o docs/*?raw importado por
  src/ está versionado no git». Mutante MA (`git rm --cached`) → 1 RED.
- ⚠️ **Para o operador:** no repo principal basta `git add docs/REGULAMENTO-v6.md` + commit + push. Até lá o CI de `main`
  falha no build.

### ⚠️2 — Qualquer 409 do palpite mostrava «Você precisa ter comprado um Passe para palpitar» (CORRIGIDO `54dde79`)
- `usePalpite.js` traduzia **todo** o 409 por essa frase. Desde o UTAC136 o `registar-palpite` devolve 409 por
  `edicao_nao_programada`, `edicao_nao_aberta`, `edicao_apurada` e `sem_passe` (conta sem linha em `public.pontos`,
  não um Passe por comprar). Ou seja: quem palpitasse numa edição que acabou de fechar ou de ser apurada lia que
  precisava de comprar um Passe, o que contradiz o v6 (palpite gratuito, Art. 3º). O UTAC137 desbloqueou o botão e
  deixou esta mensagem.
- Correcção: `mensagemErroPalpite(status, codigo)` em `src/lib/palpite.js` (mensagem por código, nenhuma fala em Passe);
  `usePalpite` passa `data?.error?.code`. O `utac107g2-pt-br` deixou de exigir a frase antiga e passou a guardar a nova
  (pt-BR). Guardas: «cada 409 do registar-palpite tem mensagem própria e nenhuma pede Passe» (lê os códigos do
  código-fonte do backend) e «o usePalpite usa mensagemErroPalpite com o código do servidor».
  Mutantes: MB (apurada volta a pedir Passe) 1 RED · MC (um código 409 sem mensagem) 1 RED · MD (hook volta ao 409
  antigo) 1 RED.

### ⚠️3 — Carteira sem Passes: «compre abaixo para dar lances e palpites» (CORRIGIDO `7d89847`)
- `MinhaCarteira.jsx` (aviso `data-sem-passes`, visível a quem tem 0 Passes): contradiz o Art. 3º (Passe opcional), o
  Art. 6º (pontos de lance gratuitos) e o palpite gratuito. Nenhum teste o via (o grep do executor procurou «Precisa de
  1 Passe», não esta frase).
- Correcção: «Ainda não tem Passes. O Passe é opcional (Art. 3º): lances e palpites não precisam dele.» Guarda nova;
  mutante ME (frase antiga) → 1 RED.

### ⚠️4 — Prosa do GUTO sem guarda + Art. 6º citado para «indicações» (CORRIGIDO `94ab84c`)
- O bloco «MODELO DE HOJE» de `REGRA_REGULAMENTO` (`_lib/guto-perfis.mjs`) é prosa do executor, não texto do v6, e
  **nenhum teste a amarrava**. Medido com os 9 ficheiros de teste do GUTO/consentimento (102 testes):
  `1 ECOQUILDO = R$ 0,50` → `R$ 1,00` (MV3): **102/102 verdes**; «O palpite não exige Passe.» → «O palpite exige 1 Passe
  Programado.» (MV6): **102/102 verdes**. O M10 do executor só cobre as âncoras.
- A prosa dizia «pontos de lance … ganhos por login, missões e **indicações** (Art. 6º)». O Art. 6º diz
  «obtidos **exclusivamente** por meio de engajamento diário, login contínuo e cumprimento de missões»; a indicação é o
  Art. 24 (dá ECOQUILDOs). O GUTO citava um artigo para o que ele exclui.
- Correcção: a frase passou às palavras do Art. 6º. Teste novo `_tests/utac137-seg3-guto-modelo.test.mjs` compara cada
  número da prosa com o artigo do v6 que ela cita (R$ do Art. 21., preço do Art. 5º, 1 ponto do Art. 7º, 50 do Art. 23.)
  e proíbe «indica» na frase do Art. 6º. Mutantes MV3 2 RED · MV6 2 RED · MV7 (volta «indicações») 1 RED · MV8
  («10 pontos de fidelidade») 2 RED. Testes do GUTO afectados: 81/81 verdes.

### ℹ️ Notas (não corrigidas)
- **ℹ️1 Indicação dá +50 pontos de lance** (servidor, `PainelIndicacao`, «Proporções fixas» das Regras Oficiais) — o
  Art. 6º diz «exclusivamente» engajamento, login e missões, e o Art. 24 dá à indicação 2/1 ECOQUILDOs, não pontos de
  lance. Também o «+1 ECOQUILDO» por Passe (`passes.js`, proporções) não está no Art. 7º. Mudar isto é regra de negócio
  do servidor: fora do âmbito; não está na DEBT-091 — sugiro acrescentá-lo lá.
- **ℹ️2 DEBT-091 declarada e visível:** «Cartão colecionável físico … Acumule 50 pontos para trocar por ele» e «O palpite
  dá pontos EXTRA» (`OfertasProgramadas.jsx`), «Confirme os dados de entrega» (`ResgatarCartaoModal`) contradizem os
  Arts. 8º (cartão digital, crédito automático) e 17/18 (produto ao vencedor do palpite). O executor declarou-o.
- **ℹ️3 Gate — frases que não são literais do v6** (fora dos 12 blocos, que são literais): a caixa da idade diz
  «capacidade civil plena» (o v6 não fala nisso); a vigência diz «registo» (o v6 diz «registro», pt-BR — e o app é pt-BR)
  e «(Art. 30)» sem o ponto do rótulo; a caixa da privacidade cita «Art. 27.» (assunto certo: LGPD). O resumo inclui o
  Art. 25 («exclusivamente … Google Billing»), mas o PWA vende o Passe por PIX: o texto é o do cartório, a contradição é
  de produto.
- **ℹ️4 O prompt do GUTO leva o cabeçalho de `GUTO-REGULAMENTO.md`**, que fala em «transcrição do v5.1 (com a ERRATA DA
  FONTE do PDF) … commit `b740046`». Não ensina regra do v5, mas põe «v5.1» e «ERRATA» à frente do modelo.
- **ℹ️5 Código morto com texto antigo:** `estadoCreditosLance` (`lib/passes.js:89`, «Adquira um Passe Relâmpago … para
  dar um lance») não tem chamador fora dos testes. Os comentários com «+200»/«10 pontos»/«v5» são só comentários.
- **ℹ️6 Instalações v9 e aceite 3.4:** declarado pelo executor (R18-137-1); a v9 envia 3.3 e o servidor recusa até
  actualizar.

## O que se tentou refutar e aguentou (com prova)
- **Regras Oficiais = v6 inteiro e exacto:** extraí o `lerRegulamento` de `7640ff8` e reconstruí o texto desenhado:
  igual ao v6 (sem «#», espaços normalizados), 6 capítulos, 30 artigos `Art. 1º…Art. 9º, Art. 10.…Art. 30.`, 0 blocos
  partidos (o «conforme o Art. 19.» do Art. 15 fica dentro do Art. 15, porque o v6 tem um artigo por linha). O parser
  novo dá **a mesma estrutura** que o antigo sobre o v5. Nenhum import do v5 no `src/` (só em comentário).
- **Gate:** os 12 blocos `Art. N` são literais do artigo do v6 com o mesmo rótulo (script próprio, 12/12).
  `VERSAO_CONSENTIMENTO = "3.4"` = `VERSAO_GATE = "3.4"`.
- **GUTO:** corpo de `GUTO-REGULAMENTO.md` = v6 (diff vazio depois do cabeçalho); as 14 âncoras de `ARTIGOS_V4` estão
  dentro do artigo do v6 com o rótulo certo; nos 8 prompts (4 perfis × conformidade) não há «10 pontos», «+200»,
  «R$ 1,00», «físico», «Art. NNº», «senha» nem «crédito de lance» antes do documento.
- **Palpite na UI:** Início e Ofertas Programadas só desligam o botão enquanto envia; o servidor (UTAC136) não consome
  Passe. Defeito vizinho = ⚠️2.
- **Testes enfraquecidos:** revi todas as asserções trocadas no diff: são migrações v5 → v6 com a mesma força (a guarda
  da ERRATA saiu porque o v6 não tem o defeito do PDF; os limites de tamanho baixaram com o documento). Mutantes extra
  meus no frontend — parser sem quebra por linha (3 RED), `pt.js` volta ao +200 (1 RED), `PainelPontosLance` volta ao
  Passe (1 RED), proporções dizem que o palpite exige Passe (1 RED): todos morrem. Os que sobreviviam eram os do GUTO
  (⚠️4).
- **Âmbito:** o diff toca só frontend, `_lib/consentimento.mjs`, `_lib/guto-*.mjs`, testes, docs do GUTO e o
  `build.gradle` (`versionCode 10`, `versionName "1.1.0"`). `EM_BREVE_MODE` intacto; Regulamento/PDF não alterados.

## Suítes no worktree (depois das correcções)
- **Frontend** (todos os `src/**/*.test.mjs`, `--test-concurrency=1`): **1327/1329**. Os 2 vermelhos são o
  `mc9952-seguranca-gate` (DNS de `exemplo.com`, instável por rede). Corrido logo a seguir, sozinho: **8/8**. 1329 =
  baseline 1325 + 4 testes novos do validador.
- **Backend** (`_tests/*.test.mjs`): **1467 pass · 0 fail · 7 skipped (1474)**. A diferença para o 1472/1478 do executor
  é do ambiente do worktree: `desafio-gut/node_modules` não existe aqui (só há as junctions do frontend e das funções),
  por isso o `mc93e-fork-onchain` fica num único skip («@nomicfoundation/edr não resolve»). Os 3 testes novos do validador
  passam. Os testes do GUTO afectados correram à parte: 81/81.

## O que fica para o operador
1. No repo principal: `git add docs/REGULAMENTO-v6.md`, commit e push. Sem isto o CI de `main` continua a falhar no build.
2. Trazer `54dde79`, `7d89847` e `94ab84c` para `main`. O `94ab84c` (GUTO) passa a valer com um deploy. Os outros dois
   (textos do app) só chegam ao APK num AAB novo, porque o AAB v10 já foi gerado sobre o `7640ff8`.
3. Acrescentar à DEBT-091 a indicação (+50 pontos de lance, contra os Arts. 6º e 24) e o «+1 ECOQUILDO por Passe», que
   não está no Art. 7º (ℹ️1).
