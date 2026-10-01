# UTAC105b.2 — SEG-1 · Medição (2026-10-01)

Baseline do enunciado: `966a587`. **Medido: `966a587` ✅ confere** (é o commit de fecho do UTAC105b.1).
Nada foi alterado neste segmento.

## -1.1 Suíte
`node scripts/mc966-suite-harness.mjs ambos` (da raiz, foreground) →
**frontend VERDE 535/535 · backend VERDE 931/937 · VEREDITO VERDE.** Confere **exactamente** com o
enunciado.

## -1.2 O ramo `register-corporativo` (`cotas.mjs:353-468`) — o P0, medido por leitura
| # | medido |
|---|---|
| autenticação | **NENHUMA.** `accessToken` é **opcional** (MC12.3.1) e, quando vem, só se verifica que **começa por `"eyJ"`** (l.368) — **não é verificado**. Não há `resolverChamador`. |
| identidade | **l.396: `const clienteId = endereco ?? \`cnpj:${cnpjNums}\`;`** — o `clienteId` vem do **CORPO**, sem prova nenhuma (`endereco` só passa por `validarEndereco`, l.379) |
| anti-duplicidade | `getCotaByCnpj(cnpjNums)` → 409 **só se** o CNPJ existir **com outro `cliente_id`** (l.402-405). Se o atacante usar o `endereco` **e** o CNPJ da vítima, o `cliente_id` coincide → **não dispara** |
| anti-Sybil | 1 CNPJ por `X-Visitor-ID` a cada 24h (l.409-421) — limita o *volume* por dispositivo, **não** a posse |
| escrita | **l.442 `await upsertCota(clienteId, registro)`** com um registo **completo** que fixa `categoria:null`, `vendida:false`, `disponivel:false`, `valor:0` (l.437-440) → **substitui** a cota existente, destruindo o que a pessoa pagou |
| resposta | `201` sempre (l.467) |

## -1.3 POST genérico de admin (`cotas.mjs:563-580`) — Frente C, confirmado
`existente` **já é lido** na l.563, mas o registo construído nas l.567-578 **não tem `endereco`**
(tem `cliente_id`, `categoria`, `vendida`, `disponivel`, `cliente_nome`, `produto_nome`, `produto_url`,
`valor`, `criadoEm`, `atualizadoEm`). Como o `cotas-store.colunas()` grava
`endereco: registro?.endereco ?? null`, o upsert **apaga a coluna**. ⇒ corrigível com **1 linha**:
`endereco: existente?.endereco ?? null,`.

## -1.4 Consumidores (medidos) — e porque é que P10 **NÃO** dispara
`src/pages/SejaNossoParceiro.jsx` — «Seja nosso parceiro», **cadastro DIRETO sem login Privy**:
1. **FASE B** (l.171): `GET cotas?cnpj=<cnpj>&empresa=<empresa>` — verificação de duplicidade **primeiro**.
   Se o CNPJ **já existe** (`checkRes.ok`), a página **NÃO faz o POST**: navega para o painel (se for o
   dono), mostra «CNPJ já registrado em outra conta», ou envia OTP. **Nunca chega à FASE C.**
2. **FASE C** (l.201-212) — o `POST register-corporativo` só é alcançado **quando o GET deu 404**
   (*CNPJ não existe*). Envia `cnpj`, `empresa`, `segmento`, `site`, `logoUrl`, `email` + o header
   `X-Visitor-ID`. **NÃO envia `accessToken` nem `endereco`.**

⇒ **O fluxo legítimo cria apenas cotas NOVAS.** O caminho «sobrescrever uma cota existente» **não tem
consumidor legítimo**: é **só de ataque** (chamada directa à API). Logo a guarda «cota existente + sem
prova de posse → recusar» **não pode quebrar o cadastro legítimo** — e o cadastro legítimo passa a ser
verificado por A/B como manda o P9/P10.

## -1.5 PoC (antes) — o P0 reproduzido por execução
`C:/Users/Moltbot/tmp-utac105b2/poc-utac105b2.mjs` (fora do repo; correu via cópia temporária em
`_tests/`, **apagada**). Handler **real**, duplos só nas fronteiras. CNPJs **sintéticos** (nunca reais).
Saída completa: `C:/Users/Moltbot/tmp-utac105b2/poc_ANTES.txt`.

```
CNPJs de teste (validos): vitima=11122233000183 atacante=44455566000183 novo=77788899000183

=== R1 — ATACANTE anonimo passa o `endereco` DA VITIMA (cnpj novo) ===
   status=201 escreveu=true clienteId=0xaabbccddeeff00112233445566778899aabbccdd
   cota da vitima agora: empresa="INVASOR LTDA" cat=null vendida=false valor=0

=== R2 — ATACANTE anonimo com o `endereco` E o CNPJ DA VITIMA ===
   status=201 escreveu=true
   cota da vitima agora: empresa="INVASOR 2" cat=null vendida=false valor=0

=== R3 — CADASTRO LEGITIMO: anonimo, cota NOVA (sem endereco) ===
   status=201 escreveu=true clienteId=cnpj:77788899000183

=== R4 — RE-REGISTO do mesmo CNPJ ===
   status=201 escreveu=true

=== FC — POST GENERICO de admin sobre cota que TEM `endereco` ===
   status=200
   cota depois: empresa="undefined" cat=prata vendida=true valor=55000 endereco=null
```
Estado da cota da vítima: **antes** `empresa="LOJA DA VITIMA" cat=ouro vendida=true valor=55000 email="vitima@loja.com"` → **depois de R1** `empresa="INVASOR LTDA" cat=null vendida=false valor=0`.
⇒ **P0 CONFIRMADO: um pedido anónimo destrói a cota e o valor pago de outra pessoa.** E o POST genérico
**apaga a coluna `endereco`** (Frente C confirmada por execução).

## -1.6 Disco
`df -h /c` → **17 G livres** (≥ 5 GB). **SEGUE.**

## -1.7 ⚠️ Tensão de requisitos identificada (declarada, resolvida por medição — não por decisão)
O SEG0 §0.3 pede «idempotente (repetir o próprio registo → **200** não 201)». Medido: **não há forma de
distinguir** «repetição do próprio registo» de «ataque» — o endpoint **não tem prova de posse nenhuma**
(o `accessToken` não é verificado) e o CNPJ é semi-público. Dar **200** exigiria ou **(a)** escrever
(destruir, como hoje) ou **(b)** devolver o registo existente ao chamador — o que **confirmaria a
associação CNPJ ↔ carteira a um anónimo**, exactamente o que o **MC87 (P0-1)** proibiu («o registo
completo só sai para o DONO»). Nenhuma das duas é aceitável.
⇒ **Decisão de execução (declarada, não concebida):** com cota existente e **sem** prova de posse →
**401 (anónimo) / 403 (utilizador) sem qualquer escrita**, mesmo que o CNPJ coincida. **Não parte nenhum
caso legítimo** (ver -1.4: o fluxo legítimo nunca faz POST sobre cota existente). Se o operador quiser
o 200 idempotente, é 1 linha — mas com o custo de informação descrito.

## -1.8 VEREDITO DO SEG-1: **SEGUIR**
P0 confirmado por leitura **e** por execução; Frente C confirmada; **P10 não dispara** (medido: o
cadastro legítimo cria sempre cota nova). Avança para a Frente A.
