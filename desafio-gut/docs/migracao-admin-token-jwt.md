# Migração ADMIN_TOKEN → JWT Admin (15 min) + Refresh (7 dias)

Status: **Compatibilidade dupla ativa**. Endpoints admin aceitam tanto `x-admin-token` (legado) quanto `Authorization: Bearer <admin-JWT>` (novo) durante a janela de transição.

## Por que mudar

`ADMIN_TOKEN` é uma string env-var stateless eterna. Não rotaciona, não expira, não revoga. Vazamento implica troca manual da env var + restart de toda a função. JWT de 15 min + refresh hasheado em Blob (`admin-refresh:{endereco}`) atende OWASP ASVS 5.0 §V3 (sessões) e permite revogação imediata.

## Arquitetura

| Camada | Antes | Depois |
|---|---|---|
| Auth header | `x-admin-token: <ADMIN_TOKEN>` | `Authorization: Bearer <access JWT>` |
| Token TTL | infinito (env-var) | access 15 min, refresh 7 dias |
| Rotação | manual (env-var) | automática (refresh consumido emite par novo) |
| Revogação | trocar env-var + restart | `POST /auth-admin {acao:"logout", endereco}` (instantâneo) |
| Storage refresh | n/a | Blob `admin-refresh:{endereco}` → hash SHA-256 |
| Vínculo identidade | nenhum | endereço wallet Privy do admin |

## Endpoints

### `POST /.netlify/functions/auth-admin`

Tri-modo:

```json
// 1) Login (primeira vez)
{
  "acao": "login",
  "endereco": "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E",
  "signature": "0x...",                                    // EIP-191 (Privy signMessage)
  "message":   "DESAFIOGUT-ADMIN:<unix-ms>:<endereco-lowercase>",
  "adminToken": "<ADMIN_TOKEN legado — usado APENAS aqui>"
}
// Resposta 200
{
  "accessToken":      "eyJhbGciOiJI...",
  "refreshToken":     "ae74...64 hex chars...",
  "accessExpiresIn":  900,
  "refreshExpiresIn": 604800,
  "tokenType":        "Bearer"
}
```

```json
// 2) Refresh (a cada ~12 min, antes do access expirar)
{
  "acao": "refresh",
  "endereco": "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E",
  "refreshToken": "ae74...64 hex chars..."
}
// Retorna novo par. O refresh antigo é INVALIDADO (rotação).
```

```json
// 3) Logout (revoga TODOS os refresh tokens do endereco)
{
  "acao": "logout",
  "endereco": "0xDa3a83A24b25aa71e1a9b5A74503fFA93487e84E"
}
```

### Validações

- Login: assinatura EIP-191 (formato `DESAFIOGUT-ADMIN:<ts>:<addr-lowercase>`, skew máx 5 min) **+** `adminToken === process.env.ADMIN_TOKEN` **+** `endereco ∈ adminAddresses` (Blob `admin-list:admins` ∪ coordenação).
- Refresh: re-checa que `endereco` ainda é admin (admin removido perde acesso imediatamente).
- Endpoints admin: `Authorization: Bearer <access>` aceito primeiro; fallback para `x-admin-token` legado.

## Cronograma

1. **Agora (este PR)**: dual-mode ativo. AdminPanel continua usando `x-admin-token` (legado). Backend aceita ambos.
2. **+1 PR (em até 7 dias)**: AdminPanel migra para JWT. Inclui fluxo de login (paste do `ADMIN_TOKEN` legado UMA vez por sessão para troca → access+refresh em memória + refresh em sessionStorage).
3. **+30 dias após AdminPanel migrar**: remover `x-admin-token` dos endpoints. Auditoria de logs antes — se ainda houver tráfego com header legado, atrasa.
4. **+90 dias**: remover env var `ADMIN_TOKEN` do Netlify após confirmação que zero tráfego legado restou. Rotação de `JWT_SECRET` em paralelo para invalidar todos os JWTs antigos.

## Procedimentos operacionais

### Adicionar um admin
```bash
curl -X POST https://<site>/.netlify/functions/admin-list \
  -H "Authorization: Bearer <seu-admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"acao":"adicionar","endereco":"0x..."}'
```

### Revogar acesso de um admin específico
1. `POST /auth-admin {acao:"logout", endereco}` — invalida todos os refresh do endereço (efeito em até 15 min: access tokens já emitidos continuam até expirar).
2. `POST /admin-list {acao:"remover", endereco}` — remove do array de admins, bloqueando `refresh` futuro.

### Revogar TODOS os admins (incidente)
Trocar `JWT_SECRET` no Netlify Dashboard. Todos os JWTs (admin, user-session, lance-auth) ficam inválidos no próximo cold-start. Não afeta a Blob `admin-list:admins` (lista de quem PODE ser admin permanece).

### Blob `admin-refresh:{endereco}`
Schema:
```json
{
  "tokens": [
    { "hash": "<sha256>", "jti": "<8 hex>", "createdAt": 1715750000000, "expiresAt": 1716354800000 }
  ],
  "atualizadoEm": "2026-05-15T..."
}
```
Máximo 5 entradas por admin (refresh paralelos). Cleanup automático: entradas expiradas são removidas na próxima rotação/login.

## Como o frontend deve consumir (próximo PR)

```js
// Login do admin (executar UMA vez por sessão)
const ts = Date.now();
const message = `DESAFIOGUT-ADMIN:${ts}:${address.toLowerCase()}`;
const provider = await privyWallet.getEthereumProvider();
const { signer } = await getSignerFromProvider(provider);
const signature = await signer.signMessage(message);
const resp = await fetch("/.netlify/functions/auth-admin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    acao: "login",
    endereco: address.toLowerCase(),
    signature,
    message,
    adminToken: prompt("Cole o ADMIN_TOKEN legado (último uso):"),  // descartar logo após
  }),
});
const { accessToken, refreshToken, accessExpiresIn } = await resp.json();

// accessToken vai em useRef (memória). refreshToken vai em sessionStorage.
// Timer dispara refresh aos accessExpiresIn - 180s (3 min de margem).

// Em cada chamada admin:
fetch("/.netlify/functions/admin-list", {
  method: "POST",
  headers: {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${accessTokenRef.current}`,
  },
  body: JSON.stringify({ acao: "adicionar", endereco: "0x..." }),
});
```
