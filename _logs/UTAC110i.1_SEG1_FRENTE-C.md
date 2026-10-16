# UTAC110i.1 — SEG1 · FRENTE C (Backend de validação + migração)

**Auto-contido.** Validação server-side do recibo do Google Play, crédito dos benefícios do Passe
**sem débito de saldo R$** (R18-110i.1-1) e a tabela de idempotência. HARD GATES 2, 3, 4, 5, 7, 8, 14.

---

## 1.1 O que a frente entrega

| entregável | estado | caminho |
|---|---|---|
| `_lib/google-play-billing.mjs` | FEITO | 300 linhas: `lerCredencial`, `obterAccessToken`, `validarCompra`, `reconhecerCompra`, `lerCompra`, `registarCompra`, `fecharCompra` |
| `validar-compra-google.mjs` | FEITO | endpoint Netlify (valida + credita; 503 fail-closed sem credencial) |
| migração `google_play_compras` | FEITO (ficheiro) | `supabase/migrations/20261016_utac110i1_google_play_compras.sql` |
| env `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` lida de env | FEITO | `lerCredencial()` — **nunca** hardcoded, **nunca** em log |
| cadeia de crédito reusada (sem débito) | FEITO | `creditarPasseGoogle()` em `_lib/comprar-passe-tipado.mjs` |
| testes do endpoint | FEITO | `_tests/utac110i1-validar-compra-google.test.mjs` — **34 testes** |
| prova de mutação | FEITO | `_tests/utac110i1-prova-mutacao.mjs` — **14/14 RED**, md5 reposto |

## 1.2 DECISÃO D-2 (declarada no SEG-1): sem `googleapis`

A cadeia é **`jose`** (já é dependência declarada de `netlify/functions` e já é usada no repo para os
tokens de sessão) + `fetch`:

```
1) JWT RS256 assinado com a chave da service account
   { iss: client_email, scope: .../auth/androidpublisher, aud: oauth2.googleapis.com/token }
2) POST oauth2.googleapis.com/token (grant_type=jwt-bearer) → access_token (CACHEADO até
   expires_in − 60 s)
3) GET androidpublisher.googleapis.com/androidpublisher/v3/applications/<pkg>/purchases/products/
   <sku>/tokens/<token>
```

Razão: o `googleapis` (186.0.0) é um pacote pesado que entraria no bundle da função **sem medição de
tamanho**; o `jose` já está instalado e já é usado. GATE 5 (Ponytail). Nenhuma dependência nova.

## 1.3 O fluxo do endpoint (e porquê esta ordem)

1. `Bearer` de **sessão de utilizador** (`verificarUserSession` — o mesmo dos endpoints PIX).
2. **O tipo fixa o SKU**: `TIPOS_PASSE` + `SKU_PASSE[tipo] === sku` ⇒ 400 `sku_divergente`
   (defesa em profundidade R18-110i-7: o cliente manda os dois, o servidor decide).
3. `purchaseToken` 8–512 chars.
4. **Credencial**: sem `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ⇒ **503 `google_play_nao_configurado`,
   ZERO idas à Google** (fail-closed; é a pendência A3 declarada no SEG-1, agora com efeito de código).
5. **Idempotência pelo RECIBO**: `lerCompra(purchase_token)` → se `estado='creditada'`, responde
   **200 idempotente** com os números ENTREGUES, **sem voltar a consultar a Google**.
   Registo de OUTRA conta ⇒ **409**, alerta de segurança e nada creditado.
6. `registarCompra` (INSERT; PK = `purchase_token`; `23505` = corrida → re-lê).
7. `validarCompra` contra a Google → `purchaseState === 0` (purchased). Cancelada (1) / pendente (2) /
   HTTP 4xx-5xx / rede em baixo ⇒ **409/503 e NADA creditado**, registo `'falhada'`.
8. `creditarPasseGoogle({ endereco, tipoPasse, ref })` — **a MESMA cadeia de crédito do PIX**
   (`creditarBeneficios`), **sem débito nem reembolso de R$**.
9. `fecharCompra(..., 'creditada', números)`.

`ref` da compra = `passe-<tipo>:gpl-<sha256(purchaseToken)[0..32]>` (≈46 chars, limite da `ref` é 200;
o `purchaseToken` da Google chega a ~200 e NÃO caberia).

## 1.4 A refactorização da cadeia partilhada (GATE 4)

`_lib/comprar-passe-tipado.mjs` passou a ter as peças em **âmbito de módulo** — `contexto(tipoPasse)`,
`estadoDaCompra`, `garantirEcoDoPasse`, `completarPendentes`, `creditarBeneficios`, `desfazerCompra`,
`respostaIdempotente` — usadas por **`comprarPasseTipado` (PIX, intacto em comportamento)** e por
**`creditarPasseGoogle` (novo)**. O que muda entre os dois é **só o pagamento**: o PIX debita R$ 2,00
e reembolsa em qualquer falha; o Google não debita nem reembolsa (o dinheiro já é da Google).

Rede de segurança desta refactorização: as suítes do 110d e do 110e (**45/45 VERDE**, re-medido antes
e depois) e os mutantes B13 (idempotência por `ref`) e B14 (ordem ECOQUILDO por último) — que são
mutantes **desenhados sobre a cadeia partilhada**.

## 1.5 Migração — estado e pendências DECLARADAS

`20261016_utac110i1_google_play_compras.sql`: tabela aditiva, PK = `purchase_token`,
`CHECK` de `tipo_passe`/`estado`/não-negativos, índice por `endereco`, RLS ligada sem políticas,
`REVOKE DELETE, TRUNCATE FROM service_role` (saneamento herdado do 105a.1 — um registo de compra é
prova contabilística).

⚠️ **Não aplicada em produção por este UTAC** — mesmo procedimento do UTAC110e (decisão do operador;
`supabase db push` dispara o auto-deploy). Com a flag desligada o endpoint nem é alcançável pela UI,
e sem a tabela ele responde 502/503 sem creditar nada.
⚠️ **LGPD — PENDÊNCIA DECLARADA, não executada:** a tabela guarda `endereco` (dado pessoal no
tratamento do repo) e os fluxos `conta-delete` (anonimização) e `exportar-dados` (portabilidade)
ainda não a cobrem. Vai para o relatório de fecho e para o `_logs/DEBT.md`.

## 1.6 Provas

```
controlo (sem mutação): VERDE 32/32 (endpoint)   ·   VERDE 45/45 (110d+110e, rede de segurança)
mutantes RED: 14/14
  B1  o Google Play passa a DEBITAR saldo R$          B2  o Google Play deixa de creditar o ECOQUILDO
  B3  'creditada' deixa de travar a 2.ª entrega       B4  o 23505 deixa de ser tratado (corrida)
  B5  compra CANCELADA passa a ser aceite             B6  compra PENDENTE passa a ser aceite
  B7  falha HTTP da Google vira recibo bom            B8  o guarda do SKU↔tipo cai
  B9  a env var deixa de ser exigida                  B10 recibo de OUTRA conta credita no atacante
  B11 o `ref` deixa de levar o token                  B12 o fecho deixa de marcar 'creditada'
  B13 a cadeia partilhada perde a idempotência        B14 o ECOQUILDO passa a ser creditado primeiro
md5 dos 3 ficheiros: == inicial
```

**Achado da própria mutação (declarado):** a 1.ª corrida deu **12/14** — B4 e B14 **sobreviveram**.
Não se declararam equivalentes: **medidos como lacunas de teste** e fechados com dois testes novos no
mesmo ficheiro:
- **B4** ⇒ teste «CORRIDA: o mesmo recibo chega 2× ao mesmo tempo (o INSERT colide na PK) ⇒ 200
  idempotente» — a interleaving que o `23505` existe para apanhar (o concorrente ganha a corrida e a
  linha já entra `creditada`).
- **B14** ⇒ teste «o ECOQUILDO é o ÚLTIMO passo: se o crédito de LANCE falhar, o ECOQUILDO NÃO é
  emitido» — o invariante que a ordem da cadeia (fixada no 110e) protege; uma falha no lance não pode
  deixar um ECOQUILDO emitido e lastreado.

Bidireccional (GATE 8) no mesmo ficheiro: **(a)** recibo válido ⇒ 201 com os benefícios e saldo R$
**intacto**; **(b)** cancelada/pendente/estado desconhecido/404/410/403/500/rede em baixo/OAuth2
recusado/sem env var ⇒ 409-503 e **nada** creditado; **(c)** tipo/sku/token/sessão inválidos ⇒ 400/401
**antes** de ir à Google. Mais o **A/B contra o PIX no mesmo ficheiro**: o PIX debita R$ 2,00
(500→300) e o Google não debita (500→500), com os **mesmos** benefícios.

⚠️ **Limite declarado:** não há compras reais (exige A1 no Play Console + A4 License Testing + perfil
de pagamentos). O que está provado é o contrato do endpoint contra um duplo FIEL da Google API (a
forma da resposta 200 do `purchases.products.get` e os códigos HTTP reais). O teste real é posterior.
