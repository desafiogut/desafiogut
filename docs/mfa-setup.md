# MFA — Setup e Política de Enforcement

> Mega Comando 7 / Item 1. Atualizado em 2026-05-16.

O DesafioGUT usa **Privy** como provider de autenticação (Google, Email, Apple). Privy oferece MFA nativo (SMS, TOTP, Passkeys) que pode ser exigido por **dois caminhos**: configuração do Dashboard Privy + gate server-side no DesafioGUT.

Este documento cobre os dois e o estado atual de cada um.

---

## 1. Política de exigência

| Papel | MFA exigido | Quando |
|---|---|---|
| **admin** | **Obrigatório** | Toda operação admin (aprovação de cliente, crédito wallet, geração de voucher) |
| **cliente** | **Obrigatório** para operações sensíveis | comprar-senhas, lance-relampago, voucher-resgatar, wallet POST |
| **user** | Opcional, recomendado | Login básico permite MFA opcional via Privy |

"Operações sensíveis" = qualquer endpoint que move R$, créditos on-chain, ou estado de aprovação.

---

## 2. Setup no Dashboard Privy

### 2.1 Habilitar MFA por método

1. Logar em `https://dashboard.privy.io/` com a conta do projeto.
2. Selecionar **app `cmo51f3v300l90clgzksivvad`** (DesafioGUT).
3. **Settings → Multi-Factor Authentication**:
   - ☑ Enable for **embedded wallets**
   - ☑ Enable methods:
     - **TOTP** (Authenticator apps — Google Authenticator, Authy, 1Password)
     - **Passkeys** (FIDO2, recomendado)
     - **SMS** (último recurso — vulnerável a SIM swap)
4. Em **Enforcement**: selecionar **Required for embedded wallet actions** (força MFA antes de assinar tx ou ler chave privada).

### 2.2 Política de admins

Para os endereços listados em `admin-list:admins` (Blob), exigir MFA **obrigatório**:

- Cada admin enrolla TOTP via Privy SDK no primeiro login após este MC.
- Backup codes Privy: cada admin baixa e armazena offline (cofre físico ou 1Password Vault).

### 2.3 Recovery flow

- Se um admin perde acesso ao TOTP:
  1. Admin acessa `https://dashboard.privy.io/recovery`.
  2. Verifica e-mail + 1 backup code.
  3. Re-enrolla.
- Se também perdeu o e-mail: contato com Privy Support (`support@privy.io`) com prova de identidade (escaneamento de documento + signature da carteira recovery).

---

## 3. Enforcement server-side (este MC)

### 3.1 Componentes

- **`_lib/require-mfa.mjs`** (MC7) — middleware que lê o claim `mfa_verified` do JWT autenticado e bloqueia conforme `MFA_ENFORCEMENT`.
- **`_lib/jwt.mjs`** (modificado em MC7) — `assinarAdminAccess`, `assinarUserSession`, `assinarLanceAuth` aceitam param opcional `mfaVerified` que injeta `mfa_verified: true` no payload.
- **5 endpoints integrados** (MC7) — admin-aprovacao, comprar-senhas, lance-relampago, wallet (POST), voucher (gerar + resgatar).

### 3.2 Feature flag `MFA_ENFORCEMENT`

Configurada via variável de ambiente Netlify (Site settings → Environment variables):

| Valor | Comportamento | Quando usar |
|---|---|---|
| `off` (default) | Middleware é no-op. Compatibilidade total com mundo pré-MFA | Hoje (Phase 1 — apenas scaffolding) |
| `warn` | Loga violações em `console.warn` mas permite. Vai pro Sentry como warning | Janela de observabilidade (~1 semana) antes do enforce — mapeia quem ainda não tem MFA |
| `enforce` | Bloqueia com **HTTP 403** e body `{ mfa_required: true, docs: "docs/mfa-setup.md" }` | Phase 2 — depois de todos admins enrollados |

Default `off` significa que **o deploy do MC7 não muda comportamento de prod**. O switch é manual e reversível.

### 3.3 Como o middleware decide

```
JWT chega → caller valida (verificarLanceAuth, autenticarAdmin, etc.) → caller extrai payload
       → requireMfa(req, payload, "contexto")
            ├─ MFA_ENFORCEMENT=off → return null (passa)
            ├─ payload.mfa_verified === true → return null (passa)
            ├─ MFA_ENFORCEMENT=warn → console.warn + return null (passa, mas logado)
            └─ MFA_ENFORCEMENT=enforce → 403 mfa_required (bloqueia)
```

ADMIN_TOKEN legado (`x-admin-token` sem JWT) chega ao middleware com `payload: null` → tratado como "sem MFA". Em modo `enforce`, **legacy admin não passa** — intencional: ADMIN_TOKEN não deveria existir num mundo MFA.

---

## 4. Phase 2 — wiring `/auth-admin` e `/auth-user` (FUTURO, fora do MC7)

Para que `mfa_verified: true` apareça nos JWTs, o flow de autenticação precisa consultar Privy MFA status. Roadmap:

### 4.1 Em `/auth-admin`

Hoje, `/auth-admin` recebe assinatura EIP-191 e emite JWT chamando `assinarAdminAccess(endereco)`. Phase 2:

1. Após validar assinatura, chamar Privy API: `GET /api/v1/users/{userId}/mfa-status` com `Authorization: Bearer <PRIVY_APP_SECRET>`.
2. Se response inclui `mfa_verified: true` e `last_verified_at` dentro da janela (ex: 5min):
   ```js
   const token = await assinarAdminAccess(endereco, 900, true /* mfaVerified */);
   ```
3. Caso contrário, emitir JWT sem o claim (cliente deve re-autenticar com MFA via Privy SDK no frontend).

### 4.2 Em `/auth-user` e `/auth-lance`

Mesma lógica. Privy SDK no frontend executa o desafio MFA e injeta um header `x-privy-mfa-token: <token>` no request para `/auth-user`. Backend valida esse token via Privy API.

### 4.3 Dependências para Phase 2

- Privy plano pago (MFA exige >= Builder tier — ~$99/mês no nível atual).
- Variável `PRIVY_APP_SECRET` configurada na Netlify (server-side, nunca no frontend).
- Frontend integra `usePrivyMfa()` (hook do SDK Privy) nos componentes admin e operações sensíveis.

---

## 5. Verificação pós-deploy

Após cada deploy do MC7, validar que o gate está corretamente instalado mas inativo:

```bash
# 1. /health deve reportar o modo atual (se /health for atualizado em PR futuro)
curl https://app.desafiogut.com.br/.netlify/functions/health | jq '.mfa_enforcement'
# Esperado: "off" (default)

# 2. Operação sensível continua funcionando (modo off)
curl -X POST https://app.desafiogut.com.br/.netlify/functions/lance-relampago \
  -H "Authorization: Bearer <jwt>" \
  -d '{"endereco":"0x...", "valorCentavos":100}'
# Esperado: 200 ou 201 (sem 403 mfa_required)

# 3. Liga warn em staging, repete operação
# → log no Sentry: "[require-mfa:warn] lance-relampago sem MFA verificado"

# 4. Liga enforce em staging, repete operação SEM mfa_verified no JWT
# → 403 mfa_required (esperado em Phase 2; hoje é só validação do gate)
```

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Enforce ligado antes da Phase 2 → produção inteira 403 | Default `off`. Switch manual via Netlify env var, com rollback em 1 redeploy (~3 min) |
| MFA SMS comprometido via SIM swap | TOTP/Passkeys preferidos no Dashboard. SMS apenas como fallback recovery |
| Admin perde acesso TOTP em momento crítico | Backup codes obrigatórios + Privy recovery flow (Seção 2.3) |
| Phase 2 nunca implementada → middleware fica em `off` indefinidamente | Não introduz dívida — código atual é defensivo (no-op em off). Pode permanecer até Privy MFA virar prioridade |
| Privy API down → `/auth-admin` falha em emitir JWT com claim | Phase 2 deve fail-soft: se Privy MFA API timeout, emite JWT sem claim e bloqueia operações sensíveis (degraded mode) |
