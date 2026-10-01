# UTAC105b.2 — SEG2 · Frente C: o POST genérico preserva `endereco` (2026-10-01)

## 2.1 Baseline (confirmado por leitura **e** por execução)
- `cotas.mjs:563` **já lia** `const existente = await getCota(endereco);`
- `cotas.mjs:567-578` construía o `registro` **sem** o campo `endereco` (tinha `cliente_id`, `categoria`,
  `vendida`, `disponivel`, `cliente_nome`, `produto_nome`, `produto_url`, `valor`, `criadoEm`, `atualizadoEm`).
- `_lib/cotas-store.mjs:28` — `colunas()` grava **`endereco: registro?.endereco ?? null`**.
  ⇒ o upsert **apagava a coluna**. Medido no PoC (§FC): `endereco=null` depois do POST.
- **Porque isto passou a importar:** o ramo (b) do MC89.38 (UTAC105b.1) decide a posse por
  `cota.endereco`; sem a coluna, essa cota **perde o vínculo** e o dono legítimo passa a levar **403**.
  Efeito **latente** — foi o validador do UTAC105b.1 que o apontou (ℹ️ N2) e o co-construtor que o
  promoveu a Frente C deste UTAC.

## 2.2 A correcção (1 linha, como o enunciado propunha)
`endereco: existente?.endereco ?? null,` acrescentado ao `registro` do POST genérico, com comentário a
explicar o mecanismo. Nada mais foi tocado em `:563-580` (a leitura do `existente` já existia — não foi
preciso introduzi-la).

## 2.3 Teste bidireccional
- **`C1`** — POST genérico de admin sobre cota **com** `endereco` → **preserva** (`endereco` == DONO).
- **`C2`** — POST genérico sobre cota **nova** → `endereco: null` (não inventa vínculo).
- **Mutante `MA6`** (remover a linha) → `C1` **RED ✅** (ver SEG0 §0.4).
- ⚠️ Correcção à minha própria expectativa: eu escrevi **200** no `C2`; o código devolve **201** para
  cota nova (`cotas.mjs:650`, `existente ? 200 : 201`). Expectativa **inventada**, corrigida.

## 2.4 A/B
Antes: `endereco=null` (coluna apagada) → Depois: `endereco=0xaabb…ccdd` (preservado). Sem alteração no
contrato de resposta (200 existente / 201 novo — inalterado).

## 2.5 O que a Frente C **não** resolve (declarado, fora do escopo)
O POST genérico continua a **destruir o resto do payload corporativo** (`tipo`, `empresa`, `segmento`,
`site`, `logoUrl`, `origem`, `cadastradoEm`) — porque `colunas()` grava `payload: registro`
(`cotas-store.mjs:34`) e o registo do POST genérico só tem os campos de lance. Medido no PoC §FC2 (cada
campo listado como «DESAPARECEU do payload»). Consequência grave: a cota **deixa de ter
`tipo:"corporativo"`** e o `update-corporativo` passa a responder **404** ao próprio dono. É
**pré-existente** e exige **decisão de desenho** (que campos o POST genérico pode substituir) → **achado
F-1**, escalado como candidato a UTAC (R20/AU3: o executor não decide).

## 2.5b ⚠️ CORRECÇÃO PÓS-SEG3 — o que escrevi em 2.5 está DESACTUALIZADO (fica à vista, marcado)
O validador adversarial do SEG3 mediu (⚠️ **V-2**, e reformulou o meu **F-1**) que a Frente C, **como
estava, não cumpria o objectivo que declara**: preservava `endereco`, mas o POST genérico continuava a
apagar `tipo` → como o `update-corporativo` exige `tipo === "corporativo"`, o **dono continuava a levar
404**. Ou seja, eu tinha declarado o F-1 como «achado grave fora do escopo» e o validador mostrou que ele
**é o próprio objectivo por cumprir da Frente C**.
**Corrigido** por decisão do operador (R18-3) com o tratamento proposto pelo validador: o registo do POST
genérico passa a ser `{ ...(existente ?? {}), <campos da operação> }`. Medido depois (PoC §FC2): o payload
corporativo **inteiro** sobrevive — `tipo`, `empresa`, `segmento`, `site`, `logoUrl`, `origem`,
`cadastradoEm`, `endereco`, `pedidoId` — e o dono volta a conseguir `update-corporativo` (**200**).
⇒ A afirmação de 2.5 («o POST genérico continua a destruir o resto do payload») **era verdadeira e deixou
de ser**. Não é apagada: é o registo de que o meu enquadramento inicial era insuficiente.

## 2.6 VEREDITO DO SEG2: **FECHADO** para o que o UTAC autoriza (`endereco` preservado, com teste e
mutante) · **1 achado escalado** (F-1) fora do escopo.
