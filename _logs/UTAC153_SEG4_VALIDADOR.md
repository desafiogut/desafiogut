# UTAC153 — SEG4 VALIDADOR ADVERSARIAL INDEPENDENTE (2026-11-28)

**Em revisão:** `44a90b4` sobre `a80a4b0`, que fecha a DEBT-117: CORS para `capacitor://localhost` e `ionic://localhost` por reflexão a partir de uma lista fechada.
**Método:** li o código; corri sondas `node` (no meu worktree) que importam os módulos da árvore principal só para leitura; corri mutantes numa CÓPIA de `_lib/cors.mjs` dentro do meu worktree; fiz um bundle `esbuild` num directório temporário.
A árvore principal é **igual a `44a90b4`** em todos os `.mjs` de `netlify/functions` (`diff --strip-trailing-cr`, 0 diferenças). Nada foi escrito na árvore principal. Não houve push, deploy, Supabase nem Netlify.

## Veredicto: **APROVADO COM RESSALVAS**

O núcleo aguenta as tentativas de refutação:
- a comparação é exacta;
- nunca sai `*`;
- o Android e o site recebem exactamente os mesmos cabeçalhos de antes;
- `respostaPreflight` é de facto a 1.ª instrução das 85 functions;
- o pedido REAL (não só o preflight) leva a origem do iOS em 84/85 functions, e a que falta não tinha CORS antes (pré-existente).

Não há achados graves (⚠️). Há 7 notas (ℹ️). Uma delas **refuta uma afirmação do executor** (o require do relatório CSV «rebentava sempre») e outra **refuta parcialmente um comentário do código** (o contexto «por pedido» passa de uma invocação para a seguinte).

---

## 1. Fuga de contexto / origem errada (`enterWith`)

**«1.ª linha das 85» — CONFIRMADO lendo o código, não o log.**
- 96 functions; 85 contêm `respostaPreflight(`.
- Formas do default export: 82× `export default async (req) => {`, 2× `async (req) => respostaPreflight(req) ?? comprarPasseTipado(...)` (`comprar-passe-programado.mjs:9`, `comprar-passe-relampago.mjs:8`) e 1× `export default async function handler(req) {` (`validar-compra-google.mjs:85`).
- Entre `export default` e `respostaPreflight(` há **0 linhas que não sejam comentário** nas 85. Script: para cada ficheiro, extraí as linhas entre as duas e filtrei comentários e linhas vazias; o resultado foi vazio.
- Não há wrapper (`withX(...)`) à volta de nenhum default export.
- Cada function chama `respostaPreflight` uma única vez.
- `aplicarRateLimit`/`jsonError` vêm sempre DEPOIS.
- Não existem respostas montadas ao nível do módulo, `Response` em cache entre pedidos, outro `AsyncLocalStorage`/`enterWith` nem `waitUntil` (grep).

**Pedido real, sonda `_seg4/sonda-real.mjs`.** Para cada uma das 85, enviei GET e POST sem auth, com `fetch` bloqueado e o env vazio (`env -i`). Verifiquei `access-control-allow-origin` e `vary` na resposta que vier (401/405/400/500…):

| Origem enviada | ACAO esperado | Respostas certas (de 170) | Erradas | Sem CORS |
|---|---|---|---|---|
| `capacitor://localhost` | a mesma | **168** | 0 | 2 (`img-proxy` GET/POST 400 text/plain, pré-existente) |
| `ionic://localhost` | a mesma | **168** | 0 | 2 (idem) |
| `https://localhost` | `https://localhost` | **168** | 0 | 2 (idem) |
| `https://evil.example` | `https://localhost` | **168** | 0 | 2 (idem) |

Nenhuma excepção, nenhum timeout, `Vary: Origin` sempre presente. O pedido passou por pelo menos um `await` (sessão, rate-limit ou store) antes da resposta, e a origem sobreviveu.

**ℹ️1 — o contexto NÃO é estritamente «por pedido»: passa para a invocação seguinte no mesmo contexto do chamador. Medido; sem impacto hoje.**
Sonda `_seg4/sonda-fuga.mjs`, Node v24.14.1. Deu o mesmo com e sem `--no-async-context-frame`.
- O `enterWith` chamado dentro do handler **muta o contexto de quem chama o handler**.
- Um "runtime" que faz `await handler(req1); await handler(req2)` no mesmo contexto passa a origem de req1 a req2:
  - `b_semPreflight_depois_do_ios = capacitor://localhost`: um handler SEM `respostaPreflight` (como os scheduled, `webhook-frenet` e `mc302-*`) herdou a origem do iOS;
  - `c_respostaAntes_depois_do_ios = capacitor://localhost`: uma resposta montada ANTES do `respostaPreflight` levou a origem do pedido ANTERIOR.
- Quando cada invocação nasce num callback novo (`setImmediate`), não herda nada (`g_semPreflight_isolado = https://localhost`).
- Pedidos concorrentes também não se misturam (confirma o teste do executor).

Porque não há impacto hoje:
- em produção cada function é uma Lambda própria, que corre uma invocação de cada vez;
- as 85 sobrescrevem o contexto na 1.ª instrução;
- as 11 sem preflight nunca o preenchem na sua própria Lambda;
- só num processo partilhado (`netlify dev`, que a memória do projecto diz estar avariado) é que uma function server-to-server poderia herdar `capacitor://localhost`, e aí é inócuo.

**Risco de regressão:** uma function futura que responda antes de `respostaPreflight` (por exemplo, rate-limit primeiro) devolve a origem do pedido anterior do mesmo contentor. O teste «85 functions» só exercita o OPTIONS e **não impõe** «1.ª instrução».

O comentário `cors.mjs` «Contexto POR PEDIDO (não variável global)» é verdadeiro para pedidos concorrentes, mas exagera para pedidos sequenciais.

Sugestões, não bloqueantes:
- um teste de FONTE que exija `respostaPreflight(req)` como 1.ª instrução do default export;
- ou envolver com `contextoCors.run(...)` em vez de `enterWith`, o que obrigaria a mudar o handler.

## 2. Segurança

- **Comparação exacta:** `ORIGENS_NATIVAS_PERMITIDAS.includes(origem)` sobre um array congelado (`_lib/cors.mjs:39-41`).
- **Origens duplicadas:** a Fetch API junta-as em `"capacitor://localhost, https://evil.example"`, que não casa e cai em `https://localhost` (medido, `h_origin_duplicada_*`).
- **Espaços:** a Fetch API apara-os (`"  capacitor://localhost  "` → `"capacitor://localhost"`). O valor reflectido é então exactamente o da lista: inócuo.
- **Injecção de CR/LF:** impossível; os `Headers` recusam esses caracteres.
- **Outros valores rejeitados:** `"null"`, `null`, `*`, caixa diferente, porta, sufixo — todos caem em `https://localhost` (teste do executor; os mutantes MV2 e MV4 abaixo mordem).
- **Superfície:** não há `access-control-allow-credentials` e a autenticação é por Bearer. Uma página web não consegue ter origem `capacitor://`/`ionic://`, por isso a superfície é a mesma do `https://localhost` do Android. Não encontrei mais nenhuma verificação por `origin`/`referer` nas functions (grep).
- **`Vary: Origin` presente em todas as respostas dos helpers:**
  - preflight 204;
  - `jsonResponse`/`jsonError`;
  - `jsonCacheavel` 200 **e 304** (o mesmo objecto `headers`, `_lib/http-cache.mjs:34-42`);
  - 429 (`_lib/rate-limiter.mjs:87`);
  - CSV do ADM.
- **Chave de cache do CDN para `jsonCacheavel` (public, max-age=60):** depende de a Netlify respeitar `Vary`. O executor cita a documentação; **não verifiquei em produção** (não há deploy). Se a Netlify ignorasse o `Vary`, o efeito seria de disponibilidade (uma app recebia o ACAO da outra durante até 60 s + swr), não de segurança: todos os valores possíveis são origens da própria app.

## 3. Regressões no Android/web

Não há. `cabecalhosCors()` devolve **o próprio objecto `CABECALHOS_CORS`** (`_lib/cors.mjs:108`) para qualquer origem que não seja a do iOS, inclusive sem origem e sem contexto. Por isso os cabeçalhos são iguais, um a um, aos de `a80a4b0`. A sonda confirma 168/168 com `https://localhost` (Android) e sem origem estranha. `mc8816-cors-todas-respostas` (testes anteriores do CORS do APK) passa.

## 4. Respostas que não passam pelos helpers

`new Response(` sem CORS, todas pré-existentes:
- `banners.mjs:140,166` (`?raw`, imagem);
- `img-proxy.mjs:204,244`;
- `exportar-dados.mjs:444` (só com `?formato=csv`).

Medido no frontend de `44a90b4`:
- `Configuracoes.jsx:53` chama `exportar-dados` **sem** `formato`, logo segue por `jsonResponse` e tem CORS;
- `img-proxy` só é usado em `<img src>` (`lib/imagem.js:22`), que não precisa de CORS;
- nenhum `fetch` do app cai nestas respostas. Está declarado no SEG-1 («Fica fora do âmbito e é registado»).

O frontend absolutiza as chamadas no iOS: `apiOrigin.js:ehNativo()` usa `Capacitor.isNativePlatform()`, que também é true no iOS. Logo o CORS era mesmo a peça que faltava.

**ℹ️2 (fora do âmbito, pré-existente, não é CORS):** `lib/imagem.js:22` devolve um caminho RELATIVO `/.netlify/functions/img-proxy?...` para `<img>`. O `fetch` é reescrito pelo shim, mas o `<img>` não. No nativo (Android e iOS), esse caminho resolve-se no servidor local do WebView, que devolve o index.html: imagens externas partidas. Não é regressão deste UTAC.

## 5. `admin-financeiro-relatorio.mjs`: `require` → `import`

**A mudança está correcta e não tem efeito lateral.** A ordem dos cabeçalhos mantém-se (CORS depois de `content-disposition`, sem chaves em colisão). A resposta é montada depois de `respostaPreflight` e dos `await`, por isso leva a origem certa.

**ℹ️3 — afirmação do executor REFUTADA quanto à produção:**
- **Afirmação:** «O export CSV do ADM rebentava sempre», com a prova `node --input-type=module -e "require('x')"`.
- **O que essa prova mostra:** só o Node cru.
- **Como a produção é construída:** com `node_bundler = "esbuild"` (`netlify.toml:23`), e o esbuild **empacota** `require("./x.mjs")` literal mesmo em ESM.
- **Reprodução** (dir temporário, `netlify/functions/node_modules/.bin/esbuild --bundle --format=esm --platform=node`):
  - `a.mjs` com `...require("./b.mjs").X`, executado em bruto: `ReferenceError require is not defined`;
  - o mesmo ficheiro **depois do bundle**: `bundled ok { a: '1', z: 2 }`.
- **Conclusão:** em produção o CSV muito provavelmente funcionava. O defeito existia só em execução directa (testes e scripts). A correcção é inócua e é melhor código; o que fica errado é o relato da HI.
- **Limite da prova:** a versão do esbuild local pode diferir da da Netlify, mas o comportamento (bundling estático de `require` literal) é antigo e estável.

## 6. Qualidade dos testes

- `_tests/utac153-cors-ios.test.mjs` + `mc8816` + `utac146` (um dos mocks editados): **28/28** na árvore principal (`node --test --experimental-test-module-mocks …`, stdin `/dev/null`).
- **O teste «85 functions» é real:** importa os 85 handlers verdadeiros, conta-os (`>= 85`) e verifica OPTIONS iOS → 204 + ACAO, e origem estranha → `https://localhost`. Limite: só o OPTIONS (a minha sonda cobre o GET/POST).
- **Mutantes meus** (`_seg4/mutar.mjs`), sobre uma cópia de `cors.mjs` no meu worktree. A baseline da cópia tem 1 falha esperada: o teste das 85 vê 0 functions na cópia. Todos os mutantes mordem, e o restauro deu md5 idêntico:

| Mutante | Resultado |
|---|---|
| MV1 regista a origem só no OPTIONS | fail 1→3 RED |
| MV2 compara trim+lowercase e reflecte o valor cru | fail 1→2 RED |
| MV3 a variante iOS perde `Vary: Origin` | fail 1→4 RED |
| MV4 `startsWith` em vez de igualdade | fail 1→2 RED |
| MV5 `timing-allow-origin` fica no do APK | fail 1→4 RED |

- **Os 8 mocks editados:**
  - nenhum dos 8 faz asserções sobre cabeçalhos CORS (grep: 0 asserts `access-control`), logo a semântica não muda;
  - os outros 4 ficheiros que tocam no `cors.mjs` usam o módulo real ou só o citam;
  - **ℹ️4:** o log diz que o `cabecalhosCors` do mock devolve «o MESMO objecto do `CABECALHOS_CORS` desse mock». É um objecto **novo** com o mesmo conteúdo (`() => ({ "access-control-allow-origin": "*" })`). Imprecisão sem efeito.
- **ℹ️5 — lacunas de cobertura:**
  - nenhum teste exercita o **429** (`rate-limiter.mjs:87`) nem o **CSV** (`admin-financeiro-relatorio.mjs:77`) com origem iOS (grep: `capacitor://` só aparece em `utac153-cors-ios.test.mjs`, e este não importa o `rate-limiter` nem pede 429);
  - o mutante «o 429 volta a `CABECALHOS_CORS`» **sobreviveria** (raciocínio estático: não o corri, por falta de `node_modules` no meu worktree);
  - o código dos dois sítios está correcto, por leitura (a mesma chamada `cabecalhosCors()` que o `jsonResponse`, que está provado).
- **ℹ️6 — a prova de mutação 8/8 não é reproduzível:** só existe a saída (`_logs/UTAC153_mutacao_saida.txt`); o script não está no repo nem nos logs.

## 7. Âmbito / R20

- O diff cabe na autorização: `cors`/`validate`/`http-cache`/`rate-limiter`, a linha de cabeçalhos do relatório, 8 mocks e 1 teste novo.
- **Zero linhas de lógica de negócio** (pontos, lances, palpites): verificado no `git diff a80a4b0..44a90b4`.
- A troca `require` → `import` está declarada como HI na linha que já era tocada.
- Sem push nem deploy (o log diz que só chega ao iOS com `netlify deploy --prod --build` autorizado).
- O frontend não importa nenhum destes `_lib`, logo o `node:async_hooks` não entra no bundle do browser (grep em `src/`). Não há edge functions.
- **ℹ️7 — comentário desactualizado:** o bloco acima de `CABECALHOS_CORS` (`_lib/cors.mjs:55-62`) continua a dizer «Constante (não reflete a origem do pedido) de propósito … refletir não traria nada». Isso contradiz o novo `cabecalhosCors()`. A nota UTAC153 da l.76 atenua, mas o parágrafo antigo devia ser marcado como superado.

---

## O que NÃO consegui verificar

1. O comportamento real no WKWebView (aparelho/simulador iOS) e se envia exactamente `Origin: capacitor://localhost` em todos os pedidos.
2. Que o CDN da Netlify respeita `Vary: Origin` nas respostas de functions com `cache-control: public` (sem deploy; aceitei a citação do executor sem a reler).
3. O modelo de invocação do runtime v2 da Netlify (se envolve o handler num `run()` próprio). Isso só mudaria o ℹ️1 para melhor.
4. Os caminhos profundos dos handlers (depois de autenticação válida, com Supabase/Blobs reais). A sonda só cobre as saídas precoces (401/405/400/500) e a do iOS. A preservação do contexto através de `await` está provada, mas não ramo a ramo.
5. A suíte backend completa (RAM ~600 MB). Corri só 3 ficheiros (28/28) e as sondas. Os 1552/1641 vêm do log do executor.
6. O mutante do 429/CSV (ℹ️5), por falta de `node_modules` no meu worktree e por não poder criar junctions. Fica por raciocínio estático.
7. A versão do esbuild usada pela Netlify (ℹ️3); usei a de `netlify/functions/node_modules`.

## Artefactos do validador (no worktree `agent-a2793452f8cffe266`, não commitados)

- `_seg4/sonda-real.mjs` — GET/POST reais às 85 functions, por origem.
- `_seg4/sonda-fuga.mjs` — semântica do `enterWith` (fuga entre invocações, origens duplicadas, espaços).
- `_seg4/mutar.mjs` + `_seg4/mut/` — mutantes MV1–MV5 sobre uma cópia.
- Este relatório: `_logs/UTAC153_SEG4_VALIDADOR.md`.

---
## Tratamento pelo executor (2026-11-28, `c471bde`) — correcções NÃO re-validadas por 2.ª ronda
- **ℹ️1 (contexto herdável via `enterWith`)** — aceite. Novo teste de fonte: `respostaPreflight(req)` é a 1.ª instrução nas 85 functions, nas 3 formas medidas. Mutante M9 (uma instrução antes do preflight no `admin-config`) → RED. O comentário do `cors.mjs` passou a avisar.
- **ℹ️3 (o CSV «rebentava sempre»)** — **REFUTAÇÃO ACEITE.** A produção passa pelo esbuild (`netlify.toml:23`), que resolve o `require` em ESM. O `ReferenceError` só existe no Node cru. A afirmação do SEG0-2 foi corrigida lá, à vista. A troca para `import` fica: é inócua e correcta no Node cru.
- **ℹ️4** — o mock devolve um objecto NOVO com o mesmo conteúdo, não «o MESMO objecto». Corrigido no SEG0-2.
- **ℹ️5 (sem teste do 429 com origem iOS)** — teste novo no `mc8816`. Mutante M10 (o 429 volta à constante) → RED. O CSV continua sem teste com origem iOS (é ADM, não é app).
- **ℹ️6** — os scripts de mutação foram guardados: `_logs/UTAC153_mutacao.py` e `_logs/UTAC153_mutacao2.py`.
- **ℹ️7** — o comentário desactualizado do `cors.mjs` foi reescrito.
- **ℹ️2 (`img-proxy` relativo em `<img>` no WebView nativo)** — pré-existente e fora do âmbito → DEBT-121.
