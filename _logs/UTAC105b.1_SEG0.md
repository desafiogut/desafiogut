# UTAC105b.1 — SEG0 · Frente A: medir o fluxo actual (2026-09-30)

## 0.1 PoC PRIMEIRO — o defeito, provado por execução (não por leitura)
Script ad-hoc `C:/Users/Moltbot/tmp-utac105b1/poc-utac105b1.mjs` (fora do repo; correu em
`_tests/` por uma cópia temporária e **apagada** — o duplo `@netlify/blobs` só resolve dentro da
árvore do `frontend`). Corre contra o `cotas.mjs` **real**, com duplos só nas fronteiras externas
(`cotas-store`, `jwt`, `admin-auth`, `admin-helpers`, `rate-limiter`, `@netlify/blobs`);
`validate.mjs`, `cors.mjs` e `cota-ativacao.mjs` ficaram **reais** (menos duplos = mais fiel).

```
=== ANTES DA CORRECCAO ===
200  escreveu=SIM  empresa="ALTERADO"  <- SEM TOKEN nenhum
200  escreveu=SIM  empresa="ALTERADO"  <- TOKEN DE OUTRO
200  escreveu=SIM  empresa="ALTERADO"  <- TOKEN DO DONO (legitimo)
200  escreveu=SIM  empresa="ALTERADO"  <- ADMIN (legitimo)
sem token      -> 200  ⛔ ESCREVEU (VULNERABILIDADE CONFIRMADA)
token de outro -> 200  ⛔ ESCREVEU (VULNERABILIDADE CONFIRMADA)
```
⇒ **Confirmado.** A escrita acontecia e a cota mudava de «Original» para «ALTERADO», sem token e
com token alheio. Os dois últimos casos (dono, admin) são os **controlos positivos** — sem eles, um
«recusou» seria indistinguível de um endpoint quebrado.

## 0.2 O fluxo, documentado
| | |
|---|---|
| ficheiro | `netlify/functions/cotas.mjs`, ação `update-corporativo` (HEAD: linhas 470-501) |
| método/rota | `POST /.netlify/functions/cotas?action=update-corporativo` |
| autenticação actual | **NENHUMA** — devolve antes do `guardAdmin(req)` da linha 503 |
| comentário no código | l.484: «auth: verifica se o email do body bate com o registro (simples, mas eficaz)» → **FALSO**: nenhuma comparação de email existe |
| o que lê do body | `cliente_id`, `empresa`, `segmento`, `site`, `logoUrl`, `email` |
| o que escreve | `empresa`, `segmento`, `site`, `logoUrl`, `email`, `updatedAt` (via `upsertCota`) |
| campos protegidos | `cnpj`, `tipo`, `categoria`, `vendida`, `valor` — não vêm do body; o dano é de identidade/contacto |
| erro observável | 404 `cota_nao_encontrada` se a cota não existir ou não for `corporativo` |

## 0.3 Consumidores (todos os que existem)
```
src/pages/CorporativoDashboard.jsx:100   apiPost("cotas?action=update-corporativo", {…})   ← 2 argumentos
netlify/functions/cotas.mjs:471          (definição)
```
Os hits em `desafio-gut/frontend/dist/` e `android/app/build/.../assets/` são o **mesmo código já
compilado** — ruído, não consumidores. Não há mais nenhum chamador em `src/` nem em `netlify/`.

## 0.4 Estado (nada alterado neste segmento)
Suíte 535/535 · 913/919 VERDE (enunciado: 535/535 · 913/919 — **confere exactamente**).
Disco 13 G. Ficheiros alterados: **nenhum**.
