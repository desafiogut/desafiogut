# MC103 — SEG0 · FRENTE A: FLAGS DE TRANSIÇÃO

## 0.1 PoC (estado antes de tocar)
- Default no código = valor vivo em `config_remota.recursos_app` (só as 2 chaves antigas).
- Produção `GET /recursos-app?plataforma=` (200, `application/json`):
  ios `{isLeilaoAtivo:false, isPagamentoNativoAtivo:false}` · android idem · pwa `{true, false}`.
- Formato do `config_remota.valor`: JSONB objecto, chave → mapa `{ios,android,pwa}`.

## 0.2 Alteração (único ficheiro de produção: `_lib/recursos-app-config.mjs`, +23 linhas)
- `export const DEFAULT_FLAGS_TRANSICAO = { isProgramadaSenhasAtiva:true, isTorneioVisivel:true,
  isSenhaBonusAtiva:true, isCampanhaIndicacaoAtiva:false, limitePassesIndicacao:5 }`.
- `resolverRecursos` acrescenta as 5 chaves ao objecto devolvido, lidas do config com **tipo estrito**:
  boolean só se `typeof === "boolean"`; `limitePassesIndicacao` só se `Number.isInteger(v) && v >= 0`.
  Qualquer outra coisa (ausente, `"false"`, `-1`, `2.5`, `"5"`) → default. Sem coerção.
- **Interpretação do executor (D5, a confirmar):** as novas flags são **escalares globais**, como o enunciado
  as escreve (`true`, `5`), e NÃO mapas por plataforma como as 2 antigas. Reversível antes do MC111
  (nenhum consumidor as lê). Se o MC111 precisar de por-plataforma, é uma mudança de ~5 linhas.
- `recursos-app.mjs`: **não alterado** — devolve o objecto do resolvedor, logo as chaves chegam sozinhas.
- `leilaoLock.js`: **não alterado** — não lê flags (D1 do SEG-1).
- `data-store.mjs` / `getConfig`: **não alterado**.
- Nenhum consumidor lê as chaves novas → zero efeito em comportamento (HARD GATE 15).

## 0.3 Testes — `_tests/mc103-flags-transicao.test.mjs` (9 testes, 9/9)
(a) defaults literais; com config nulo/vazio/string/produção → default nas 3 plataformas; flags antigas iguais ao antes.
(b) cada flag booleana, isolada, inverte com valor explícito — e só ela muda; limite 7 e 0 respeitados.
(c) tipo errado → default (7 formas de lixo boolean, 8 numéricas).
USO: handler `recursos-app.mjs` real (data-store em duplo): output = output de produção de antes + 5 chaves no default;
leitura falhada → fail-soft com defaults; valor gravado no config chega ao endpoint.

**Mutação (R16): 15/15 RED, todos confirmados a ENTRAR** (`assert alvo in texto` antes de aplicar), restauro byte-idêntico:
5× default trocado · 5× config ignorado para uma flag · coerção `Boolean()` · aceitar negativo · coerção `Number()` ·
chaves não expostas · mexer na antiga `isLeilaoAtivo`.

## 0.4 A/B pareado (HARD GATE 2)
Mesmos 30 inputs (6 configs × 5 plataformas, incl. o valor vivo de produção, `null`, `{}`, string, chave malformada,
plataforma inválida) antes/depois do `resolverRecursos`:
- **diferenças nas chaves antigas: 0 / 30**
- **casos com chaves novas fora do default: 0 / 30**
Produção antes: capturada (acima). Produção depois: medida no SEG4 após o auto-deploy.

## 0.5 Suíte
frontend **508/508** · backend **797/803** (= 788 + 9 novos; 6 saltados herdados; 0 falhas). 0 regressões.

## Achado para o MC111 (não executado — R20)
O cliente tem **dois caminhos**: `/recursos-app` (passa as chaves novas) e **Supabase directo** em
`useRecursosApp.js` (espelho próprio `resolverParaPlataforma`, que só devolve as 2 chaves antigas). Com
`VITE_SUPABASE_*` definido em produção, o cliente **não vê** as chaves novas. O MC111, para ler uma flag no
cliente, tem de estender esse espelho (ficheiro não autorizado neste MC).

## Veredito SEG0: **VERDE**

## Pós-validador (SEG2, R15)
Endurecido nas 5 flags novas: `Object.hasOwn` (chave herdada do protótipo não conta) + `Number.isSafeInteger`.
+3 testes (mapa por plataforma → default; inteiro não seguro → default; `Object.prototype` poluído → default) = **12 testes**.
Mutação **18/18 RED** (15 + 3 do validador). A/B **0/30**. Suíte **508/508 · 800/806**.
