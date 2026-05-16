# Cloudflare WAF — Execução automatizada (MC6)

> Atualizado em 2026-05-16. Mega Comando 6 / Item 1.
> Versão script-driven do `cloudflare-waf-setup.md` (MC4).

O playbook do MC4 documentou as 3 regras manualmente em `curl`. O MC6 transformou isso em um script idempotente: `scripts/apply-waf.mjs`. **Use este doc como referência de operação**; consulte o do MC4 apenas para entender a teoria por trás das regras.

---

## 1. Pré-requisitos

- Domínio no Cloudflare (seguir Seção 2 do `cloudflare-waf-setup.md` — onboarding manual da zona).
- **API Token** Cloudflare com os escopos abaixo. Criar em **Dashboard → My Profile → API Tokens → Create Token → Custom**:

  | Escopo | Nível |
  |---|---|
  | `Zone:Read` | Read |
  | `Zone Settings:Edit` | Edit |
  | `Account Rulesets:Edit` | Edit |

  Limitar a zona específica em **Zone Resources → Include → Specific zone → `desafiogut.com.br`** (ou equivalente).

- **Zone ID** da zona — visível em **Dashboard → seu domínio → Overview → API → Zone ID**.

- Node ≥ 18 (usa `fetch` nativo). O CI roda Node 24 — compatível.

---

## 2. Execução

```bash
export CLOUDFLARE_API_TOKEN="cf_eyJhbG..."
export CLOUDFLARE_ZONE_ID="abc123..."

node scripts/apply-waf.mjs
```

Saída esperada (primeira execução):
```
[apply-waf] 2026-05-16T... INFO iniciando provisionamento WAF {"zone":"abc123..."}
[apply-waf] 2026-05-16T... INFO rate-limit ruleset CREATED {"id":"<uuid>"}
[apply-waf] 2026-05-16T... INFO OWASP managed ruleset entrypoint UPDATED {"managed_id":"4814384a9e5d4951ca4e3d97527332ec"}
[apply-waf] 2026-05-16T... INFO bot-challenge ruleset CREATED {"id":"<uuid>"}
[apply-waf] 2026-05-16T... INFO WAF provisionado com sucesso (3 rulesets aplicados)
```

Em execuções subsequentes, `CREATED` vira `UPDATED` — o script é **idempotente**: pode rodar quantas vezes quiser sem duplicar regras.

---

## 3. Verificação pós-execução

### 3.1 Sanity — headers Cloudflare presentes

```bash
curl -I https://app.desafiogut.com.br/ | grep -Ei "^(cf-ray|server|cf-cache-status)"
```

Esperado:
```
cf-ray: 7a3b9c2f0a8e0001-GRU
server: cloudflare
cf-cache-status: DYNAMIC
```

### 3.2 Inspecionar rulesets aplicados

```bash
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets" \
  | jq '.result[] | select(.name | startswith("desafiogut")) | {id, name, phase}'
```

Esperado: 2 entradas (`desafiogut-rate-limit`, `desafiogut-bot-challenge`).

Para o OWASP managed (não tem nome próprio porque é o entrypoint do phase):
```bash
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets/phases/http_request_firewall_managed/entrypoint" \
  | jq '.result.rules[0].action_parameters.id'
```

Esperado: `"4814384a9e5d4951ca4e3d97527332ec"`.

### 3.3 Smoke test funcional

Reaproveite os tests 7.2-7.4 do `cloudflare-waf-setup.md`:

- **Rate limit (Regra 1)**: 60 requests em loop → primeiros ~50 retornam 200, depois `429`.
- **XSS (Regra 2)**: `curl -I "...?q=<script>alert(1)</script>"` → `403`.
- **Bot (Regra 3)**: `curl -A "Wget/1.21" -I "..."` → `403` ou `cf-mitigated: challenge` (depende do `threat_score` da Cloudflare para esse UA).

---

## 4. Rollback manual

O script **não tem flag de rollback** (escopo do MC6: apenas provisionar). Se precisar remover, use:

```bash
# 1. Listar rulesets para pegar IDs:
curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets" \
  | jq '.result[] | select(.name | startswith("desafiogut"))'

# 2. Deletar rate-limit:
curl -sS -X DELETE \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets/<RATE_LIMIT_ID>"

# 3. Deletar bot-challenge:
curl -sS -X DELETE \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets/<BOT_CHALLENGE_ID>"

# 4. Esvaziar OWASP managed entrypoint:
curl -sS -X PUT \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rules": []}' \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/rulesets/phases/http_request_firewall_managed/entrypoint"
```

**Em emergência absoluta** (falsos positivos massivos bloqueando usuários reais): Dashboard → **Security → WAF → Custom rules → Disable all** desativa tudo em ~10 segundos.

---

## 5. Divergências da spec original (registro)

| Item | Spec original | Implementado | Por quê |
|---|---|---|---|
| Métrica de bot | `cf.bot_management.score < 30` | `cf.threat_score gt 30` | Bot Management exige plano Pro+ ($20/mês). Free plan usa `threat_score` |
| Ação de bot | `managed_challenge` | `managed_challenge` ✓ | Aderente — action moderna recomendada pela CF |
| OWASP ID | `4814384a9e5d4951ca4e3d97527332ec` | `4814384a9e5d4951ca4e3d97527332ec` ✓ | Aderente — corrige typo do doc MC4 (`efb7b8c...`) |

---

## 6. Plano Pro+ no futuro

Quando migrar para Pro+, **substituir 1 linha** no `apply-waf.mjs`:

```js
// const expr = `(cf.threat_score gt 30) and not (http.request.uri.path matches "${HEALTH_PATH_RE}")`;
const expr = `(cf.bot_management.score lt 30) and not (http.request.uri.path matches "${HEALTH_PATH_RE}")`;
```

Rodar `node scripts/apply-waf.mjs` de novo — o script vai **atualizar** o ruleset existente (idempotente).
