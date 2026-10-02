# UTAC000.17a — SEG-1 · Medição: o store de lances, o `exportar-dados` e a premissa do «índice» — 2026-10-02

**Objectivo:** implementar `GET /minhas-participacoes` (endpoint de backend), pré-requisito do overlay
agregado (17c). **Só o endpoint + os testes** (GATE 2). Sem tocar no `exportar-dados`, sem migração nova.

## -1.1 Estado actual (medido)

| item | valor medido |
|---|---|
| `HEAD` | `7db1ff3` = `origin/main` ✓ (confere com o spec) |
| árvore | limpa (só o `package-lock.json` pré-existente) |
| suíte frontend | **670/670 VERDE** |
| suíte backend | **967/973 VERDE** |
| comando | `node scripts/mc966-suite-harness.mjs ambos` (foreground; em background o harness aborta por stdin) |

## -1.2 O «índice por endereço» — premissa **CONFIRMADA, com nuance** (é o ponto central deste UTAC)

O validador do UTAC000.17 deixou escrito: «o 17a não deve precisar de migração [existe índice por
endereço na tabela de lances]». **Medido — e a nuance importa:**

**(a) Backend Blobs (o ACTIVO — `DATA_STORE_BACKEND` não definido ⇒ default `"blobs"`):**
`_lib/bids-store.mjs` guarda cada lance numa chave isolada (Key-Per-Bid, MC28.1):
```
chave: bid:{edicaoId}:{endereco}:{sufixo aleatorio}     (store: "bids", consistency strong)
```
- **Não há um índice por endereço no sentido de `list({prefix: endereco})`** — o prefixo primário é a
  **edição**. `listarChavesBids(edicaoId)` lista por `bid:{edicaoId}:` (paginado por cursor).
- **MAS o endereço está DENTRO da chave** ⇒ as participações deduzem-se **de uma única listagem das
  chaves**, filtrando as que contêm `:{endereco}:`, **sem ler um único valor** — o que encaixa
  perfeitamente no GATE 22 («não devolver valores»). É esse o «índice» que existe hoje.

**(b) Backend Supabase (a implementação preparada para o flip, `data-store-supabase.mjs`):**
a tabela `lances` tem **colunas planas** `edicao_id`, `endereco`, `hash_lance`, `valor_centavos` e o
`payload` JSONB com o registo completo (migração `20260620_amend_jsonb_payload.sql`) ⇒ aqui sim há um
**índice por `endereco`** consultável com `.eq("endereco", …)` — é o índice que o validador mediu.

**Conclusão (medida, não suposta):** não é preciso migração nenhuma (GATE 23 ✓) — mas o endpoint **não
pode assumir um só backend**, porque o flip `DATA_STORE_BACKEND=supabase` está preparado e um endpoint
que só soubesse ler Blobs partir-se-ia em silêncio no dia do flip. ⇒ A consulta nova vai para a
**camada de abstracção existente** (`_lib/data-store.mjs` + as duas implementações), que é precisamente
o sítio para onde o projecto manda pôr o acesso a dados («o resto do backend deve falar com este módulo
e NUNCA importar @netlify/blobs directamente» — cabeçalho do `data-store.mjs`).

## -1.3 `exportar-dados` — existe, mas **não serve** (confirmado)

`netlify/functions/exportar-dados.mjs` (216 linhas) é a exportação **LGPD art. 18**:
- `POST` + `Authorization: Bearer` (owner **ou** admin) + body `{endereco}`;
- **`aplicarRateLimit(req, "exportar-dados", 6)`** ← é ESTE o «limite de 6» do validador: um **rate
  limit de 6 pedidos**, não 6 edições (medição que corrige a leitura apressada);
- devolve **dados completos** (saldo, wallet, cotas, voucher, consent-log, pedidos, `lances-relampago`
  do titular e tabelas Supabase) — inclusive **valores** (`valor_centavos` via payload) ⇒ **não serve**
  para o overlay, como o validador disse;
- lê os lances do titular **por valor** (`coletarPorValor`) e o Supabase `lances` por `endereco` — mas
  não expõe «edições em que participei» nem tem a forma adequada (nem deve ser alterado: HI9/escopo).

## -1.4 `lances-flash` — sempre vazio (Key-Per-Bid), confirmado

O `lances-flash.mjs` **não chama** `listarBids`/`getLances`: os lances vivem em chaves Key-Per-Bid
individuais, cada uma imutável; o «melhor lance» só existe **após consolidação**
(`_lib/consolidacao.mjs` → `resultados(edicaoId)`). Logo o filtro por utilizador **não é observável**
sem um endpoint novo — que é exactamente a razão de ser do 17a.

## -1.5 Evidência preservada ANTES (HI10)
`_logs/UTAC000.17a_SEG-1_EVIDENCIA.txt` — estrutura das chaves, colunas do Supabase, o rate limit do
`exportar-dados`, o `lances-flash` e o comando da suíte. **Nada foi tocado antes de estar medido.**

## -1.6 Saúde global (HI1)
Disco/processos OK · nenhum worktree montado · `node_modules` real intacto (505 frontend · 417 backend)
· suíte verde no baseline · árvore limpa.

## -1.7 Veredito do SEG-1: **SEGUIR**
A premissa do UTAC confere (com a nuance dos dois backends), não há migração a criar e o endpoint
mínimo é claro: **o endereço vem do JWT** (nunca do pedido), a consulta vai à abstracção existente e a
resposta traz **só edições + contagem** — zero valores (GATE 21/22).
