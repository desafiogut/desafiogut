# Configuração — `ADMIN_TOKEN` (Netlify Env)

**Data:** 2026-05-12
**Aplica-se a:** desafiogut.com.br (Netlify deploy `silly-stardust-ca71bc.netlify.app`)

---

## O que destrava

Sem `ADMIN_TOKEN` configurado, os endpoints abaixo retornam `503 admin_token_nao_configurado` e ficam **inúteis em produção**:

| Endpoint | Método | Operações gated |
|---|---|---|
| `/.netlify/functions/wallet` | `POST` | `operacao=credito` · `operacao=debito` (Vale-Crédito) |
| `/.netlify/functions/voucher` | `POST` | `acao=gerar` (criar voucher Diamante) |

GET nesses endpoints (leitura) continua público — não afetado.

---

## Como configurar

### 1. Gerar o token

Qualquer segredo aleatório de pelo menos 32 bytes serve. Sugestão:

```bash
# Linux / macOS / Git Bash
openssl rand -base64 48

# Node.js (cross-platform)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Cole o valor gerado num gestor de senhas seguro (1Password, Bitwarden, etc.). Esse valor **não pode vazar publicamente** — quem tiver o token pode mintar Vale-Crédito e vouchers à vontade.

### 2. Setar no Netlify

1. Acesse o painel: https://app.netlify.com/sites/silly-stardust-ca71bc/settings/env
2. Vá em **Site settings → Environment variables**
3. Botão **Add a variable** → **Add a single variable**
4. **Key:** `ADMIN_TOKEN`
5. **Values:**
   - **Scopes:** marque apenas **Functions** (não precisa em Builds/Runtime/Post processing)
   - **Deploy contexts:** marque **Production** (e opcionalmente **Deploy previews** se quiser testar lá; em **Branch deploys** evite a menos que tenha um valor diferente por branch)
6. **Values:** cole o segredo gerado no passo 1
7. **Create variable**
8. Netlify NÃO faz redeploy automático ao mudar env vars — dispare um redeploy manual: **Deploys → Trigger deploy → Deploy site** (sem cache).

### 3. Testar se está ativo

```bash
TOKEN="seu-token-aqui"
URL="https://silly-stardust-ca71bc.netlify.app"

# (a) Wallet — POST sem token deve retornar 401 (não 503)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/.netlify/functions/wallet" \
  -H "Content-Type: application/json" \
  -d '{"endereco":"0x0000000000000000000000000000000000000000","operacao":"credito","valorCentavos":100,"motivo":"test"}'
# Esperado: 401 (admin_token_invalido) — confirma que ADMIN_TOKEN está SET

# (b) Wallet — POST com token correto: 200 e cria a transação
curl -s -X POST "$URL/.netlify/functions/wallet" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  -d '{"endereco":"0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E","operacao":"credito","valorCentavos":10000,"motivo":"smoke-test","idempotencyKey":"smoke-001"}'
# Esperado: { transacaoId, saldoAntesCentavos: 0, saldoDepoisCentavos: 10000, ... }

# (c) Voucher — gerar
curl -s -X POST "$URL/.netlify/functions/voucher" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  -d '{"acao":"gerar","endereco_emissor":"0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E"}'
# Esperado: { codigo: "GUT-XXXXXXXX", emissor, criadoEm, resgatadoPor: null, ... }
```

**Códigos de resposta de diagnóstico:**

| HTTP | Code | Significado |
|---|---|---|
| 503 | `admin_token_nao_configurado` | `ADMIN_TOKEN` ausente no env do Netlify. Reconfigurar |
| 401 | `admin_token_invalido` | Token presente mas header `x-admin-token` errado ou ausente |
| 200/201 | (sucesso) | Token bate. Operação executada |

### 4. Rotacionar

Para invalidar o token atual e emitir um novo:

1. Gere um novo (passo 1)
2. **Update variable** no Netlify Env com o novo valor
3. Dispare redeploy (não cacheado)
4. Token antigo passa a retornar 401 imediatamente após o deploy

Rotações periódicas (a cada 90 dias, por ex.) reduzem janela de exposição se houver vazamento.

---

## Por que esse gate existe

Hoje o sistema **não tem um Admin real** (UI + role-based access). Os endpoints de mutação de Wallet e Voucher precisam de algum nível de proteção até que isso exista — o `x-admin-token` é a versão mais leve possível dessa proteção: um header secreto que só o operador conhece.

Quando a frente Admin for implementada (REQ-20 ainda ⚠️ PARCIAL: depende disso para fechar), a recomendação é:

1. Substituir `x-admin-token` por **JWT com role `admin`** emitido pelo Privy (verificável via JWKS).
2. Manter `ADMIN_TOKEN` como fallback de emergência apenas para scripts de manutenção.
3. Documentar a transição no relatório de ondas correspondente.

---

## Onde isso é verificado no código

| Arquivo | Linha | Operação |
|---|---|---|
| `netlify/functions/wallet.mjs` | ~68-73 | Wallet POST gate |
| `netlify/functions/voucher.mjs` | ~85-90 | Voucher `acao=gerar` gate |

Padrão idêntico — qualquer endpoint novo de mutação deve seguir o mesmo template.

---

## Risco se o token vazar

- Qualquer um pode creditar saldo Wallet ilimitado para qualquer endereço Ethereum.
- Qualquer um pode gerar vouchers em nome de qualquer "emissor", inflacionando o pool de bônus.
- **Não dá acesso on-chain** — o contrato `LeilaoGUT` continua protegido pelas chaves Privy de cada usuário.

Mitigação imediata se houver suspeita de vazamento: rotacionar (passo 4) **e** rodar `/.netlify/functions/purge-lances` (e similares de manutenção) para zerar dados sujos se necessário.
