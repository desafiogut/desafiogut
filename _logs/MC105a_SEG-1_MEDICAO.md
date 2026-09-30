# MC105a — SEG-1 · Medição (2026-09-30)

Baseline real **`b31dbd8`** (MC104.3 fechado). O enunciado diz `7648192`, que é anterior ao MC104.3. Nada foi alterado neste segmento.

## -1.1 Suíte
frontend **VERDE 530/530** · backend **VERDE 842/848**. O enunciado diz 528/826: esse número é de antes do MC104.3 (+2/+16).

## -1.2 `_lib/saldoRs.mjs` (229 linhas, NÃO alterado)
| função | assinatura | retorno |
|---|---|---|
| `lerSaldoRsCentavos(endereco)` | — | centavos; Supabase com fallback para o Blob legado; 0 se ausente |
| `creditarSaldoRsIdempotente({pedidoId, endereco, valorCentavos, fonte})` | idempotente por `pedidoId` (`saldo_rs_creditos`) | `{ok, idempotent, resultado}` |
| **`debitarSaldoRs({endereco, valorCentavos, motivo})`** | **atómico por CAS** (`casSaldo`, até 5 tentativas); recusa se `saldo < valor` → **o saldo nunca fica negativo** | `{ok, resultado:{saldoAntesCentavos, saldoDepoisCentavos, valorCentavos}}` ou `{ok:false, code:"saldo_insuficiente"\|"conflito_concorrencia"\|…}` |
| `reembolsarSaldoRs({endereco, valorCentavos, motivo})` | compensação atómica (CAS) | `{ok, resultado}` |

⛔ **`debitarSaldoRsIdempotente` NÃO EXISTE.** O débito é atómico (não há double-spend), mas **não tem chave de
idempotência**: duas chamadas debitam duas vezes. `saldo_rs_debitos` e `setDebito` existem no store, mas o `saldoRs.mjs`
não os usa no débito.

## -1.3 `comprar-senhas.mjs` (referência, NÃO alterado)
Por ordem: preflight CORS → só POST → rate-limit 5/min → kill switch (`sistemaPausado`) → JWT **lance-auth** + MFA gate
→ `validarEndereco` → `jwt.endereco === body.endereco` (403) → saldo (400 `saldo_insuficiente`) → `debitarSaldoRs` →
acção → **em falha, `reembolsarSaldoRs`** + `captureSecurityAlert` se o reembolso falhar. Não tem idempotência por
chave (uma 2.ª compra compra outra vez). Os logs usam o endereço em claro em `console.info`.

## -1.4 Supabase (produção `vjslwowwrpcawijdiksm`, confirmado por `get_project_url`; só SELECT)
- `saldo_rs`, `saldo_rs_creditos`, `saldo_rs_debitos`, `lances` e `pontuacoes` existem, todas com RLS.
- **`passes` não existe.**
- 10 migrações; a última é `mc93b_pontuacoes`. O padrão de acesso é `getSupabase()` (service_role, env-only).
- As tabelas recentes seguem o padrão `pontuacoes`: CHECKs, RLS, `REVOKE … FROM PUBLIC, anon, authenticated`, `GRANT … TO service_role`.

## -1.5 Voucher (só leitura)
**`voucher.mjs` está na raiz das functions, não em `_lib/`** (o enunciado tem o caminho errado). É um Blob `voucher`,
com código `GUT-XXXXXXXX` e `{emissor, criadoEm, resgatadoPor, resgatadoEm}`; as acções são gerar (admin), consultar
(público) e resgatar (lance-auth). É a referência para o MC105b.

## -1.6 Padrão de endpoint
`pedidos.mjs` autentica o comprador por **user-session** (`verificarUserSession(bearer)` → `endereco` em minúsculas).
O `comprar-senhas` usa lance-auth. O enunciado pede user-session.
- **Edições:** `buscarEdicao(id)` (Blob `edicoes-metadata`) devolve `{id, tipo:"programado"|"relampago", status,
  inicio_em, termino_em, produtoId?}`; `verificarJanelaLance(meta)` recusa `encerrado`/`apurado`, «agendada» e «terminada».
- **Produtos:** Blob `produtos`, chave `produto:${id}`, `status` ∈ rascunho/ativo/vendido/entregue. Não há leitor
  exportado (o `pedidos.mjs` lê-o internamente).

## -1.7 Disco
**17 G livres** (> 5 GB).

## ⚠️ Conflitos / ambiguidades para o operador (R20)
1. **Idempotência do débito:** a função pedida não existe. O que é possível sem tocar no `saldoRs.mjs`: verificar se o
   passe existe → `debitarSaldoRs` → `INSERT`. Se o `INSERT` bater no `UNIQUE` (compra concorrente), faz-se
   **`reembolsarSaldoRs`** e devolve-se o passe existente (200). Este é o padrão de compensação do `comprar-senhas`.
   O efeito líquido é 1 débito, mas **durante uma corrida o saldo desce 2× por instantes**. Se o reembolso falhar,
   há alerta e fica dinheiro por reconciliar. O enunciado manda PARAR se o débito não for idempotente.
2. **Que edições aceitam passe:** qualquer edição aberta, ou só `tipo === "programado"`? O `produtoId` tem de ser o
   produto vinculado à edição (`meta.produtoId`)?
3. **Migração** (`_logs/MC105a_MIGRACAO.sql`): o SQL do enunciado + CHECKs (endereço normalizado, `status` fechado,
   `cupons_ids` array) + RLS/REVOKE/GRANT ao service_role (sem DELETE). Precisa de autorização (HG15).

## -1.9 Veredito: **AJUSTAR** — parado à espera das autorizações e das decisões acima.
