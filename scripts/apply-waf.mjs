#!/usr/bin/env node
// apply-waf.mjs — Mega Comando 6 / Item 1.
//
// Provisiona/atualiza as 3 regras de WAF da Cloudflare (rate-limit, OWASP CRS,
// JS Challenge para bots) de forma idempotente. Substitui o playbook manual
// em docs/cloudflare-waf-setup.md (MC4) por automação reproducível.
//
// Uso:
//   export CLOUDFLARE_API_TOKEN=cf_xxx
//   export CLOUDFLARE_ZONE_ID=abc123
//   node scripts/apply-waf.mjs
//
// API ref: https://developers.cloudflare.com/api/operations/listZoneRulesets
//          https://developers.cloudflare.com/ruleset-engine/managed-rulesets/

const TOKEN   = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

if (!TOKEN || !ZONE_ID) {
  console.error("[apply-waf] FALTA env: CLOUDFLARE_API_TOKEN e/ou CLOUDFLARE_ZONE_ID");
  process.exit(1);
}

const BASE    = "https://api.cloudflare.com/client/v4";
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

// Constantes das 3 regras (fonte única — facilita revisão e rollback).
const NOME_RATELIMIT  = "desafiogut-rate-limit";
const NOME_BOT        = "desafiogut-bot-challenge";
const OWASP_CRS_ID    = "4814384a9e5d4951ca4e3d97527332ec"; // ID oficial Cloudflare OWASP Core Ruleset
const HEALTH_PATH_RE  = "^/\\\\.netlify/functions/health";  // escapa para JSON (\\. → \.)

function log(level, msg, extra) {
  const ts = new Date().toISOString();
  const tail = extra === undefined ? "" : ` ${JSON.stringify(extra)}`;
  console[level === "error" ? "error" : "log"](`[apply-waf] ${ts} ${level.toUpperCase()} ${msg}${tail}`);
}

async function cf(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const errs = json.errors?.map(e => `${e.code}:${e.message}`).join(" | ") || res.statusText;
    throw new Error(`CF API ${res.status} ${path} → ${errs}`);
  }
  return json.result;
}

// Lista rulesets da zona e devolve o que casar com (name + phase). Null se não existir.
async function findRulesetByName(name, phase) {
  const rulesets = await cf(`/zones/${ZONE_ID}/rulesets`);
  return rulesets.find(r => r.name === name && r.phase === phase) || null;
}

// ── Regra 1: Rate Limit 50 req/min/IP ───────────────────────────────────────
async function applyRateLimit() {
  const phase = "http_ratelimit";
  const body  = {
    name: NOME_RATELIMIT,
    kind: "zone",
    phase,
    rules: [{
      action: "block",
      expression: "true",
      description: "MC6 / regra 1 — 50 req/min/IP",
      ratelimit: {
        characteristics: ["ip.src"],
        requests_per_period: 50,
        period: 60,
        mitigation_timeout: 600,
      },
    }],
  };

  const existing = await findRulesetByName(NOME_RATELIMIT, phase);
  if (existing) {
    await cf(`/zones/${ZONE_ID}/rulesets/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({ rules: body.rules }),
    });
    log("info", "rate-limit ruleset UPDATED", { id: existing.id });
  } else {
    const created = await cf(`/zones/${ZONE_ID}/rulesets`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    log("info", "rate-limit ruleset CREATED", { id: created.id });
  }
}

// ── Regra 2: OWASP CRS Managed Ruleset ──────────────────────────────────────
async function applyOwaspManaged() {
  // O Managed entrypoint não é criado/deletado — sempre PUT (idempotente by design).
  const phase = "http_request_firewall_managed";
  const body  = {
    rules: [{
      action: "execute",
      expression: "true",
      description: "MC6 / regra 2 — OWASP Core Ruleset paranoia 1",
      action_parameters: {
        id: OWASP_CRS_ID,
        overrides: {
          action: "block",
          categories: [
            { category: "paranoia-level-1", enabled: true  },
            { category: "paranoia-level-2", enabled: false },
            { category: "paranoia-level-3", enabled: false },
            { category: "paranoia-level-4", enabled: false },
          ],
        },
      },
    }],
  };

  await cf(`/zones/${ZONE_ID}/rulesets/phases/${phase}/entrypoint`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  log("info", "OWASP managed ruleset entrypoint UPDATED", { managed_id: OWASP_CRS_ID });
}

// ── Regra 3: Bot Challenge (managed_challenge para threat_score > 30) ───────
async function applyBotChallenge() {
  const phase = "http_request_firewall_custom";
  // cf.threat_score (Free plan); spec original tinha cf.bot_management.score que exige Pro+.
  const expr  = `(cf.threat_score gt 30) and not (http.request.uri.path matches "${HEALTH_PATH_RE}")`;
  const body  = {
    name: NOME_BOT,
    kind: "zone",
    phase,
    rules: [{
      action: "managed_challenge",
      expression: expr,
      description: "MC6 / regra 3 — managed challenge para threat_score>30 (exceto /health)",
    }],
  };

  const existing = await findRulesetByName(NOME_BOT, phase);
  if (existing) {
    await cf(`/zones/${ZONE_ID}/rulesets/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({ rules: body.rules }),
    });
    log("info", "bot-challenge ruleset UPDATED", { id: existing.id });
  } else {
    const created = await cf(`/zones/${ZONE_ID}/rulesets`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    log("info", "bot-challenge ruleset CREATED", { id: created.id });
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  log("info", "iniciando provisionamento WAF", { zone: ZONE_ID });
  try {
    await applyRateLimit();
    await applyOwaspManaged();
    await applyBotChallenge();
    log("info", "WAF provisionado com sucesso (3 rulesets aplicados)");
  } catch (err) {
    log("error", "FALHA no provisionamento", { message: err.message });
    process.exitCode = 1;
  }
}

main();
