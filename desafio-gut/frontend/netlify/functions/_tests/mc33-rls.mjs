// mc33-rls.mjs — MC33.1 FASE B: validação de RLS (MANUAL, exige credenciais).
// NÃO é *.test.mjs: faz pedidos REST reais ao staging com ANON e SERVICE_ROLE.
//
// Uso:
//   set -a; . ~/.mc33-staging.env; set +a
//   node netlify/functions/_tests/mc33-rls.mjs
//
// B1 leitura anónima de lances  → DEVE devolver [] (RLS sem policy SELECT p/ anon)
// B2 escrita anónima de lances  → DEVE ser bloqueada (401/403)
// B3 acesso total service_role  → GET e POST DEVEM funcionar (e limpamos o POST)

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function h(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}
async function req(method, path, key, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: h(key, body ? { "Content-Type": "application/json", Prefer: "return=representation" } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let json = null; try { json = JSON.parse(txt); } catch { /* texto */ }
  return { status: r.status, ok: r.ok, json, txt: txt.slice(0, 140) };
}

const NOVO = { edicao_id: "MC33-RLS-PROBE", endereco: "0x00000000000000000000000000000000000000aa", valor_centavos: 1 };
const linhas = [];
function reg(id, descricao, esperado, observado, pass) {
  linhas.push({ teste: id, descricao, esperado, observado, resultado: pass ? "✅ PASS" : "❌ FAIL" });
  return pass;
}

let todasOk = true;

// B1 — leitura anónima de lances → 200 + array vazio
{
  const r = await req("GET", "lances?limit=1", ANON);
  const vazio = r.status === 200 && Array.isArray(r.json) && r.json.length === 0;
  todasOk &= reg("B1", "GET lances (anon)", "200 + []", `${r.status} ${Array.isArray(r.json) ? `len=${r.json.length}` : r.txt}`, vazio);
}

// B2 — escrita anónima de lances → 401/403 (bloqueado por RLS)
{
  const r = await req("POST", "lances", ANON, NOVO);
  const bloqueado = r.status === 401 || r.status === 403;
  todasOk &= reg("B2", "POST lances (anon)", "401/403", `${r.status} ${r.txt}`, bloqueado);
  if (r.ok) console.warn("[B2] ⚠️ ALERTA: insert anónimo NÃO foi bloqueado — falha de RLS!");
}

// B3a — leitura com service_role → 200
{
  const r = await req("GET", "lances?limit=1", SERVICE);
  todasOk &= reg("B3a", "GET lances (service_role)", "200", `${r.status}`, r.status === 200);
}

// B3b — escrita com service_role → 201/200 (e limpeza)
{
  const r = await req("POST", "lances", SERVICE, NOVO);
  const criado = r.status === 201 || r.status === 200;
  todasOk &= reg("B3b", "POST lances (service_role)", "201", `${r.status}`, criado);
  // limpeza da linha de prova
  await req("DELETE", `lances?edicao_id=eq.MC33-RLS-PROBE`, SERVICE);
  const v = await req("GET", `lances?edicao_id=eq.MC33-RLS-PROBE&select=id`, SERVICE);
  todasOk &= reg("B3c", "limpeza da prova (service_role)", "[]", Array.isArray(v.json) ? `len=${v.json.length}` : v.txt, Array.isArray(v.json) && v.json.length === 0);
}

console.log("\n[FASE B] MATRIZ RLS:");
console.table(linhas);
console.log(todasOk ? "\n[FASE B] ✅ RLS CONFORME" : "\n[FASE B] ❌ RLS NÃO CONFORME");
process.exit(todasOk ? 0 : 1);
