# UTAC000.17a — Relatório: endpoint «minhas participações por edição» (backend)

**Data:** 2026-10-02 · **Executor:** Hermes Agent · **Base medida:** `7db1ff3` (= `origin/main`)
**Objectivo:** implementar `GET /minhas-participacoes` — pré-requisito do overlay agregado (17c).

**VEREDICTO: ENTREGUE** — endpoint + camada de dados + 15 testes (todos verdes), 3 mutantes que mordem,
DEBT-018 **fechada por medição**. Zero alterações fora do escopo (o `exportar-dados` não foi tocado;
nenhuma migração criada; nenhuma dependência nova).

---

## 1. O que foi medido ANTES de tocar (SEG-1)

| pergunta | resposta medida |
|---|---|
| Onde vive o «índice por endereço»? | **Nuance:** no backend **Blobs** (activo) não há índice — o endereço está **dentro da chave** `bid:{edicaoId}:{endereco}:{rand}`; no **Supabase** há colunas planas `endereco`/`edicao_id` (o índice que o validador do 17 mediu) |
| Precisa de migração? | **Não** (GATE 23 ✓) |
| `exportar-dados` serve? | **Não** — é a exportação LGPD (POST, rate limit **6** = o «limite de 6»; devolve **valores**) |
| `lances-flash` vê os lances novos? | **Não** — lê o blob **legado** `lances-relampago`; os lances novos são Key-Per-Bid |
| Suíte no baseline | frontend **670/670** · backend **967/973** VERDE |

## 2. O que foi entregue

- **`netlify/functions/minhas-participacoes.mjs`** (novo, 96 linhas): `GET` com preflight CORS, 405 fora
  de GET, rate limit **30** (par dos `*-get` de leitura leve), **auth obrigatória** e **o endereço vem
  sempre do token** (não existe parâmetro de utilizador ⇒ não há como pedir dados de terceiros);
  resposta `{ participacoes: [{edicaoId, lances}], total, filtro }` — **zero valores** (GATE 22);
  filtro opcional `?edicaoId=X`.
- **Camada de dados** (4 ficheiros, +85/−1): `listarEdicoesPorEndereco(endereco)` na facade
  `_lib/data-store.mjs` + implementações:
  - **blobs** (`bids-store.mjs`): lista as **chaves** `bid:*` (cursor) e filtra `:{endereco}:` →
    **lê zero valores**; ignora o marcador `:consolidado`;
  - **supabase** (`data-store-supabase.mjs`): `select("edicao_id")` com `.eq("endereco")` e paginação
    por `.range` — usa a coluna indexada e **nunca pede `payload`**.
  ⇒ **Sem migração** e **backend-agnóstico**: um endpoint só-Blobs partir-se-ia em silêncio no dia do
  flip `DATA_STORE_BACKEND=supabase`.
- **15 testes novos** (12 blobs + 3 supabase): 401 (sem token/inválido/sem endereço), só as edições do
  titular (com terceiro **e** endereço «parecido» semeados), nenhum valor no corpo, marcador
  `:consolidado`, filtro, titular sem lances, 405, store em baixo → 503, **EIP-55** a casar com a chave
  em minúsculas, paginação por cursor; e no Supabase: o filtro por `endereco` aplicado, a query a
  **nunca** mencionar payload, o filtro por edição.
- **Suíte:** frontend **670/670** · backend **967/973 → 982/988** (+15 ✓ contagem confere).

## 3. Mutações (GATE 6b/T4) — as três mordem

| mutante | defeito reposto | resultado |
|---|---|---|
| **M16** | `bids-store`: filtro do endereço neutralizado | **2 RED** |
| **M17** | endpoint: valores acrescentados à resposta | **1 RED** |
| **M18** | endpoint: filtro `?edicaoId=` ignorado | **1 RED** |
Restauros: **md5 idêntico** ao backup nos três (backups fora do repo).

## 4. DEBT-018 — FECHADA por medição (GATE 14)

A dívida dizia: «o Blob `bids` não entra no `exportar-dados` — **não medido se tem dados**; primeiro
passo: contar chaves (sem ler valores)». **Medido** (CLI `netlify blobs:list`, contagem sem imprimir
chaves — contêm endereços):

| store | chaves |
|---|---|
| `bids` (Key-Per-Bid) | **0** |
| `lances-relampago` (legado) | **0** |

⇒ **Não há lacuna de direito de acesso hoje: não existe nada no Blob que devesse ser exportado.**
Fecha-se a dívida **com a condição de vigilância declarada**: se o `bids` passar a ter lances de
titulares, a lacuna materializa-se (o `exportar-dados` não o lê) — nota registada na DEBT.md.

## 5. Erros MEUS de instrumento (declarados)
1. Patchei o `import` do `data-store-blobs.mjs` e **esqueci a função delegada** — os **testes**
   apanharam-no imediatamente (503 + `listarEdicoesPorEndereco is not a function`);
2. o helper de semente dos testes gerava o **mesmo sufixo** para todos os lances (o `Map` deduplicava
   e a contagem esperada falhava) — bug do teste, corrigido com sufixo único (fiel ao `randomUUID`);
3. o meu parser de mutações lia `# fail N` mas o reporter actual imprime `ℹ fail N` → li «fail=0» e
   classifiquei 3 mutantes **válidos** como inválidos; corrigido e remedido (todos mordem);
4. corrigi um gomo («duplu»→«duplo») no ficheiro de evidência.

## 6. Custo e tempo (sessão dedicada, GATE 16)

| | input | output | cache-read | ≈ USD |
|---|---|---|---|---|
| leitura no fecho do UTAC000.13 | 1 229 982 | 615 546 | 166 787 840 | 0,8766 |
| leitura no fecho do UTAC000.17a | 1 316 732 | 741 503 | 225 018 112 | 1,0220 |
| **diferença = UTAC000.17a (pai)** | **+86 750** | **+125 957** | **+58 230 272** | **≈ 0,1454** |

Mais o **validador adversarial** (subagente `20261002_045842_9ba342`): **US$ 0,0349**
⇒ **UTAC000.17a ≈ US$ 0,180**.
**Saldo da API:** **US$ 1,09** no fecho (era 1,42 no fecho do UTAC000.13).
**Tempo:** excedeu as 2 h (R18-2) — **declarado**: o excedente é o fecho das 4 ressalvas do validador
(correcção do custo + 2 testes de sobreviventes + relabel + correcções de EOL) e a verificação de
produção; não houve escopo novo.

## 7-bis. Deploy verificado em produção (6/6)
| verificação | resultado |
|---|---|
| GET sem token | **401** `token_ausente` |
| GET token forjado | **401** `token_invalido` |
| POST | **405** `metodo_invalido` (`allowed:["GET"]`) |
| `?edicaoId=R-1` sem token | **401** (a query não contorna a auth) |
| `?endereco=<terceiro>` | **401** — **não existe parâmetro de utilizador** ⇒ pedir dados de terceiros é **estruturalmente impossível** |
| OPTIONS (preflight) | **204** com `Access-Control-Allow-*` |
⚠️ Antes do deploy terminar, o caminho devolvia o **`index.html` do SPA** (200, `text/html`, 5207 bytes) —
o *catch-all* do SPA engole qualquer função ainda não publicada: quem verificar produção cedo pode
confundir 200 com «endpoint a funcionar». **Medir o `content-type`**, não só o status.

## 7. REVISÃO (2.ª ronda, 2026-10-02) — fecho das ressalvas do validador adversarial

**Veredicto dele: APROVA (com ressalvas)** — veredicto integral em `_logs/UTAC000.17a_SEG2_VALIDADOR.md`.
As quatro ressalvas foram **fechadas nesta mesma ronda**:

| ressalva dele | correcção | prova |
|---|---|---|
| **B.3.1 custo/escala** — cada pedido listava a store INTEIRA; `?edicaoId=` não estreitava (60 003 chaves → 916 ms) | prefixo estreito `bid:{edicaoId}:` em blobs + `.eq("edicao_id")` em supabase (o caso normal do 17c) | **M19 → 2 RED** |
| **B.3.2 instrumento** — o laço de cursor é código morto com a lib v10 (`list()` sem `paginate` devolve tudo) e o meu teste de paginação pinava o **duplo** | teste **RELABELADO**: «defensivo: … (a lib v10 devolve tudo de uma vez)» + a citação da medição dele | honestidade do rótulo |
| **B.3.3/D.3 2 SOBREVIVENTES** — o `.toLowerCase()` do alvo nas 2 camadas sem teste (consumidor directo com EIP-55 recebia `[]` em silêncio) | 1 teste **directo** por camada com `0xAAA…aAa` | **M20 e M21 → 2 RED cada** (mortos) |
| **C imprecisão minha** — a evidência §7 dizia «CRLF»; medido, o endpoint é **LF** | evidência corrigida (LM) e EOLs re-medidos | todos puros |

**Contagens REAIS das mutações (2.ª ronda, contra os DOIS ficheiros):**
M16 **4 RED** · M17 **2** · M18 **0 (mutante EQUIVALENTE)** · M19 **2** · M20 **2** · M21 **2**
— todos restaurados com md5 idêntico ao backup.
⚠️ O §3 acima diz «M18 → 1 RED»: é o **número da 1.ª ronda** (e o validador mostrou que era
**sub-declarado** — 2 RED com os dois ficheiros). Depois da correcção do custo, o M18 deixa de ter
efeito: o **estreitamento da listagem** já restringe o resultado ⇒ as duas defesas do filtro tornaram-se
**redundantes** e o caminho do filtro passa a ser coberto pelo **M19**. O histórico fica à vista.

**Testes:** 15 → **17** casos (13 blobs + 4 supabase), todos verdes.
**Suíte:** frontend **670/670** · backend **967/973 → 984/990** (+17 ✓ contagem confere).

**Erros MEUS adicionais desta ronda (além dos 4 do §5):**
5. o meu script de mutação **reutilizou um backup da 1.ª ronda** (M16/M17/M18) e restaurou a versão
   **anterior ao estreitamento** — a minha guarda de `md5 identico?` **apanhou-o e abortou**; re-apliquei
   a edição e corrigi o script (backup sempre fresco);
6. o meu helper de substituição escolhe o EOL **tentando CRLF primeiro**, e para âncoras de **1 linha**
   as duas variantes casam ⇒ inseriu **1 linha CRLF** num ficheiro LF (medido: `CRLF=1`) — **a mesma
   classe** da imprecisão que o validador apontou; corrigido ao byte;
7. um erro de sintaxe meu num f-string (script nem correu; sem dano).

**Consequência declarada para o 17c:** `total` = nº de **EDIÇÕES** (agora documentado no cabeçalho do
endpoint); sem filtro a listagem varre a store (custo documentado; hoje **0 chaves** em produção);
com `?edicaoId=` é **estreita** — é o caminho que o 17c deve usar.
