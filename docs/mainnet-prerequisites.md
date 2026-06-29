# Pré-requisitos operacionais antes do MC40 (Mainnet)

> Consolida as configurações **operacionais** (env/segredos) que o operador deve aplicar antes do
> deploy do contrato `LeilaoGUT` na Mainnet. Não envolve código — apenas configuração no Netlify.
> Relacionado: `security_audit.md` §MC39.17/§MC39.17.2/§MC39.17.3 e `Desktop/MC40-checklist.md`.

---

## 1. Ativar o HMAC do webhook do Mercado Pago (`MP_WEBHOOK_SECRET`)

**Por quê:** `webhook-mercadopago` valida a assinatura `x-signature` via HMAC-SHA256
(`_lib/mp-signature.mjs`). Enquanto `MP_WEBHOOK_SECRET` **não** está configurado, a validação é
**fail-open** (pulada) — o webhook continua funcionando porque o valor/status são re-buscados na API
do MP e há idempotência por `pedidoId`. Ao configurar o segredo, o endpoint passa a ser **fail-closed**:
toda notificação sem assinatura válida é rejeitada com **HTTP 401**.

**Passos:**

1. **Obter o segredo no painel do Mercado Pago:**
   `Suas integrações` → (a aplicação) → `Webhooks` / `Notificações` → **"Assinatura secreta"**
   (*signature secret*). Copiar o valor.

2. **Configurar no Netlify (contexto de produção):**
   ```bash
   netlify env:set MP_WEBHOOK_SECRET "COLE_O_SECRET_AQUI" --context production
   ```
   (ou pelo painel: `Site configuration` → `Environment variables` → `Add a variable`,
   key `MP_WEBHOOK_SECRET`, scope **Production**). NUNCA committar o valor (R9/R14).

3. **Redeploy** para o runtime ler a nova env (deploy automático no próximo push, ou
   `Deploys` → `Trigger deploy` → `Clear cache and deploy site`).

4. **Verificar (fail-closed ativo):**
   - Webhook real do MP (assinatura válida) → processa normalmente (`200`, crédito/cota).
   - `POST` sem `x-signature` (ou inválida) → **`401 assinatura_invalida`**.
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     -H "Content-Type: application/json" -d '{"type":"payment","data":{"id":"1"}}' \
     https://silly-stardust-ca71bc.netlify.app/.netlify/functions/webhook-mercadopago
   # Esperado APÓS configurar o secret: 401  (antes: 200 fail-open)
   ```

> ⚠️ O manifest assinado é `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. O MP envia `data.id` na
> query string e `x-request-id`/`x-signature` nos headers — o helper já trata isso. Se o painel do MP
> gerar um novo secret, repetir o passo 2.

---

## 2. Demais gates pré-Mainnet (referência)

- **P1-1 — Coordenação:** transferir `coordenacao` para Gnosis Safe 2/3 **ou** owner KMS via two-step do
  contrato, **após** o deploy MC40 (ver `cloud.md` §MC39.17.2). Não flipar `NETWORK_STAGE=mainnet` antes
  do contrato mainnet existir.
- **Segredos KMS/Biconomy:** `APP_AWS_*`, `KMS_KEY_ID`, `BICONOMY_*` (ver `.env.example`).
- **Auditoria externa do contrato** antes do deploy irreversível (recomendação forte).
- **Foundry/Echidna/AgentShield no CI** (N/A local).
