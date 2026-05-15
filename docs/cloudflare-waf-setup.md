# Cloudflare WAF — Setup do edge

> MC4 / Item 4. Última camada da defesa em profundidade.
> Atualizado em 2026-05-15.

O DesafioGUT é servido pelo Netlify (`silly-stardust-ca71bc.netlify.app`). MC1 já trouxe rate-limit server-side (in-function, 5/min/IP em `/comprar-senhas`, 10/min em `/auth-*`), MC3 trouxe alertas Sentry server-side. Cloudflare WAF coloca um filtro **antes** do Netlify — bloqueia ataques na borda, reduz custo de invocação Lambda, e dá observabilidade unificada de tráfego.

## 1. Pré-requisitos

- Domínio registrado (ex: `desafiogut.com.br`).
- Conta Cloudflare (Free plan já cobre 99% dos casos; ver Seção 8 para limites).
- Acesso ao DNS do registrar para apontar nameservers.
- API token Cloudflare com escopos:
  - `Zone:Read`
  - `Zone Settings:Edit`
  - `Account Rulesets:Edit`

## 2. Onboarding do domínio

### 2.1 Adicionar zona

Dashboard Cloudflare → **Add a site** → digitar `desafiogut.com.br` → Plano **Free**.

Cloudflare retorna 2 nameservers (ex: `gina.ns.cloudflare.com`, `kirk.ns.cloudflare.com`).

### 2.2 Apontar nameservers no registrar

No painel do registrar (Registro.br, GoDaddy etc.) substituir nameservers pelos dois retornados acima. Propagação leva ~15 min a ~24h.

### 2.3 DNS interno na zona Cloudflare

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `app` | `silly-stardust-ca71bc.netlify.app` | 🟧 Proxied |
| CNAME | `@` | `silly-stardust-ca71bc.netlify.app` | 🟧 Proxied |

⚠️ O proxy (laranja) é obrigatório — sem ele o WAF nem vê o tráfego.

### 2.4 SSL/TLS mode

Cloudflare Dashboard → **SSL/TLS** → modo **Full (strict)**.

Netlify expõe certificado Let's Encrypt válido — Full Strict garante TLS end-to-end.

### 2.5 Configurar Netlify para aceitar o domínio

No Netlify Dashboard → **Domain settings** → **Add custom domain** → `desafiogut.com.br` e `app.desafiogut.com.br`. Netlify verifica via TXT/CNAME (já criado acima).

⚠️ Após adicionar, o redirect/CSP do `netlify.toml` continua válido pois aplica em qualquer host.

## 3. Variáveis (preencher antes de rodar API calls)

```bash
export CF_API_TOKEN="cf_eyJhbG..."   # criado em Dashboard > My Profile > API Tokens
export CF_ZONE_ID="abc123..."         # Dashboard > Overview > Zone ID
```

## 4. Regra 1 — Rate Limit (50 req/min/IP)

```bash
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "desafiogut-rate-limit",
    "kind": "zone",
    "phase": "http_ratelimit",
    "rules": [
      {
        "action": "block",
        "expression": "true",
        "description": "MC4 / regra 1 — 50 req/min/IP",
        "ratelimit": {
          "characteristics": ["ip.src"],
          "requests_per_period": 50,
          "period": 60,
          "mitigation_timeout": 600
        }
      }
    ]
  }' | jq '.result.id'
```

A resposta retorna o `ruleset_id` — guardar para rollback.

## 5. Regra 2 — OWASP Managed Ruleset

Ativa o **Cloudflare OWASP Core Ruleset** (id fixo `efb7b8c949ac4650a09736fc376e9aee`) no phase `http_request_firewall_managed`.

```bash
curl -sS -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_firewall_managed/entrypoint" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "action": "execute",
        "expression": "true",
        "description": "MC4 / regra 2 — OWASP Core Ruleset paranoia 1",
        "action_parameters": {
          "id": "efb7b8c949ac4650a09736fc376e9aee",
          "overrides": {
            "action": "block",
            "categories": [
              {"category": "paranoia-level-1", "enabled": true},
              {"category": "paranoia-level-2", "enabled": false},
              {"category": "paranoia-level-3", "enabled": false},
              {"category": "paranoia-level-4", "enabled": false}
            ]
          }
        }
      }
    ]
  }' | jq '.result.id'
```

Bloqueia SQLi, XSS, RCE, path traversal, LFI/RFI — o que está em paranoia level 1 do OWASP CRS (cobre o "OWASP Top 10" essencial).

## 6. Regra 3 — JS Challenge para bots suspeitos

```bash
curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "desafiogut-bot-challenge",
    "kind": "zone",
    "phase": "http_request_firewall_custom",
    "rules": [
      {
        "action": "js_challenge",
        "expression": "(cf.bot_management.score lt 30) and not (http.request.uri.path matches \"^/\\.netlify/functions/health\")",
        "description": "MC4 / regra 3 — JS Challenge bots score<30, exceto /health"
      }
    ]
  }' | jq '.result.id'
```

⚠️ **`cf.bot_management.score` exige plano Pro+** (US$ 20/mês/site). No Free plan, substituir por:

```
"expression": "(cf.threat_score gt 30) and not (http.request.uri.path matches \"^/\\.netlify/functions/health\")"
```

`cf.threat_score` é menos preciso mas funciona no Free plan e cobre boa parte dos casos (scraping óbvio, padrões de scanner conhecidos).

A exceção `/.netlify/functions/health` garante que monitores externos (UptimeRobot, etc.) não sejam desafiados.

## 7. Verificação pós-setup

### 7.1 Sanity — headers Cloudflare presentes

```bash
curl -I https://app.desafiogut.com.br/ | grep -E "^(cf-ray|server|cf-cache-status)"
```

Esperado:
```
cf-ray: 7a3b9c2f0a8e0001-GRU
server: cloudflare
cf-cache-status: DYNAMIC
```

### 7.2 Simular flood (Regra 1)

```bash
for i in $(seq 60); do
  curl -s -o /dev/null -w "%{http_code}\n" https://app.desafiogut.com.br/.netlify/functions/health
done | sort | uniq -c
```

Esperado: primeiros ~50 retornos `200`, a partir do 51º retornos `429` (Cloudflare 1015 rate limit).

### 7.3 Simular XSS payload (Regra 2)

```bash
curl -sI "https://app.desafiogut.com.br/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E" | head -3
```

Esperado: `HTTP/2 403` (Cloudflare). Em modo "Bypass" durante setup retornaria 200 — confirme antes de marcar como pronto.

### 7.4 Verificar bot challenge (Regra 3)

```bash
curl -A "Wget/1.21.3 (linux-gnu)" -sI https://app.desafiogut.com.br/ | head -3
```

User-agents conhecidos como bot triviais geralmente caem no `js_challenge`. Resposta esperada: `HTTP/2 403` com header `cf-mitigated: challenge`.

## 8. Limitações conhecidas

- **Free plan: 5 regras customizadas** por zona; estamos usando 3. Em planos Pro+ o limite sobe pra 50.
- **Bot management score (Regra 3)**: precisa Pro+; em Free, o fallback `cf.threat_score` é menos sensível mas suficiente para padrões óbvios.
- **JS Challenge bloqueia clientes sem JS** — afeta wallets externos batendo direto na API. Quando o usuário usar carteira injetada (MetaMask) chamando `/.netlify/functions/auth-lance`, o request vem do browser e tem JS — sem impacto. APIs server-to-server (Sentry webhook, Netlify build hook) precisam de paths excluídos.
- **OWASP CRS paranoia level 1**: cobre o essencial. Subir para level 2 aumenta falsos positivos (até 5-10% em apps que usam JSON com chars especiais).

## 9. Rollback

Cada regra criada retorna um `ruleset_id` (item 4-6). Remoção:

```bash
curl -sS -X DELETE \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/${RULESET_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}"
```

Para a Regra 2 (Managed), basta esvaziar o entrypoint:

```bash
curl -sS -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_firewall_managed/entrypoint" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"rules": []}'
```

Para desativar tudo de uma vez (emergência), no Dashboard: **Security → WAF → Custom rules → Disable all**. O Managed Ruleset desativa em **Security → WAF → Managed rules → OWASP → toggle off**.

## 10. Observabilidade

Cloudflare Dashboard → **Analytics & Logs → Security** mostra em tempo real:
- Total de requests bloqueadas por regra.
- Top IPs hostis.
- Distribuição geográfica.

Para alertas: configurar **Notifications** (Dashboard → Notifications → Add) para "WAF Spike" — recebe e-mail/webhook quando o volume de blocks sobe acima de baseline.

Encaminhar logs para Sentry: usar **Logpush** (Pro+) ou um workflow externo que faz `GET /zones/.../logs` e publica como `breadcrumb` no Sentry.

---

## Checklist final

- [ ] Domínio adicionado, nameservers apontados.
- [ ] CNAMEs `app` e `@` proxied (laranja).
- [ ] SSL/TLS Full (strict).
- [ ] Netlify aceita o domínio customizado.
- [ ] Regra 1 (rate-limit 50/min) criada — `ruleset_id` registrado.
- [ ] Regra 2 (OWASP CRS) criada — entrypoint atualizado.
- [ ] Regra 3 (JS challenge) criada — `ruleset_id` registrado.
- [ ] Verificações 7.1–7.4 passam (`cf-ray`, 429 flood, 403 XSS, 403 bot).
- [ ] Notification "WAF Spike" configurada.
- [ ] Procedimento de rollback validado (testar `DELETE` numa regra de teste).
