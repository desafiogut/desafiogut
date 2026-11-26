// UTAC149-val (SEG4 ⚠️1) — o palpite numa ESPECIAL Programada respeita a janela inicio_em..termino_em da edição,
// mesmo com o `status` ainda «aberto» (o cron que o passa a «encerrado» não lê o Blob em produção: scheduled sem
// contexto de Blobs, MC88.31; a ESPECIAL-AIRFRYER continua «aberto» 53 dias depois do fim). PROG-N: inalteradas.
// Arnês copiado do utac147-palpite-passe (handler REAL `registar-palpite.mjs`; a janela `edicao-janela.mjs` é a REAL).
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac149val-palpite-comprimento-suficiente";
const A = "0xaaa0000000000000000000000000000000000147";

let S, palpites, pontos, rpcs, EDICAO;
function novoDuplo() {
  S = criarSupabase();
  S.g.passesIniciais = { relampago: 0, programado: 0 };
  palpites = []; pontos = [{ endereco: A, pontos: 0, historico: [] }]; rpcs = [];
  const tabela = (t) => {
    const st = { op: "select", dados: null, filtros: [], terminal: null };
    const api = {
      select() { return api; }, insert(d) { st.op = "insert"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; }, maybeSingle() { st.terminal = "maybe"; return api; },
      order() { return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    function exec() {
      const db = t === "palpites" ? palpites : pontos;
      if (st.op === "insert") {
        if (t === "palpites" && !pontos.some((p) => p.endereco === st.dados.endereco)) return { data: null, error: { code: "23503" } };
        if (db.some((p) => p.endereco === st.dados.endereco && p.edicao_id === st.dados.edicao_id)) return { data: null, error: { code: "23505" } };
        const l = { id: db.length + 1, apurado: false, criado_em: "2026-11-13T00:00:00Z", ...st.dados }; db.push(l);
        return { data: l, error: null };
      }
      const ls = db.filter((l) => st.filtros.every(([c, v]) => l[c] === v));
      return st.terminal === "maybe" ? { data: ls[0] ?? null, error: null } : { data: ls, error: null };
    }
    return api;
  };
  return {
    from: (t) => (t === "palpites" || t === "pontos" ? tabela(t) : S.cliente.from(t)),
    rpc: (n, p) => { rpcs.push(n); return S.cliente.rpc(n, p); },
  };
}
let cliente = novoDuplo();

mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => cliente, getSupabaseReadOnly: () => cliente, supabaseConfigurado: () => true } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({ endereco: A, tipo: "user-session" }) } });
mock.module("../_lib/system-state.mjs", { namedExports: {
  sistemaPausado: () => false, lerEstadoSistema: async () => ({ status: "ativo" }),
  STORE_SYSTEM_STATE: "system-state", KEY_SYSTEM_STATE: "state", escreverEstadoSistema: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/edicoes-core.mjs", { namedExports: {
  buscarEdicao: async () => EDICAO, EDICAO_ID_RE: /^(?:(PROG|RELAMP|R)-\d+|ESPECIAL-[A-Z0-9]+)$/ } });

const registarPalpite = (await import("../registar-palpite.mjs")).default;
const post = (corpo) => registarPalpite(new Request("https://x/registar-palpite", {
  method: "POST", headers: { authorization: "Bearer x", "content-type": "application/json" }, body: JSON.stringify(corpo) }));


beforeEach(() => { cliente = novoDuplo(); });

const iso = (ms) => new Date(ms).toISOString();
// Datas relativas ao relógio real (o handler não recebe o relógio injectado): uma data fixa envelheceria.
const especial = (inicioMs, fimMs, extra = {}) => ({
  id: "ESPECIAL-PALPITE1", tipo: "programado", status: "aberto", inicio_em: iso(inicioMs), termino_em: iso(fimMs), ...extra,
});

const comPasses = (n) => { S.g.passesIniciais = { relampago: 0, programado: n }; };

test("V1 · especial dentro da janela ⇒ 201 (controlo positivo: a guarda não fecha a especial aberta)", async () => {
  comPasses(1);
  const agora = Date.now();
  EDICAO = especial(agora - 86_400_000, agora + 86_400_000);
  const r = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 42 });
  assert.equal(r.status, 201, JSON.stringify(await r.json()));
  assert.equal(palpites.length, 1);
});

test("V2 · especial DEPOIS do termino_em com status ainda «aberto» ⇒ 409 edicao_nao_aberta, sem gastar Passe", async () => {
  comPasses(1);
  const agora = Date.now();
  EDICAO = especial(agora - 86_400_000, agora - 1_000);
  const r = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 42 });
  const b = await r.json();
  assert.equal(r.status, 409, JSON.stringify(b));
  assert.equal(b.error.code, "edicao_nao_aberta");
  assert.equal(palpites.length, 0);
  assert.deepEqual(rpcs, [], "recusa ANTES de tocar no inventário");
});

test("V3 · especial ANTES do inicio_em (raw com status «aberto») ⇒ 409, sem gastar Passe", async () => {
  comPasses(1);
  const agora = Date.now();
  EDICAO = especial(agora + 60_000, agora + 86_400_000);
  const r = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 42 });
  assert.equal(r.status, 409);
  assert.equal(palpites.length, 0);
  assert.deepEqual(rpcs, []);
});

test("V4 · PROG-N com termino_em no passado e status «aberto» ⇒ 201 como antes (zero diff nas normais)", async () => {
  comPasses(1);
  EDICAO = { id: "PROG-7", tipo: "programado", status: "aberto", termino_em: iso(Date.now() - 86_400_000) };
  const r = await post({ edicaoId: "PROG-7", valor: 42 });
  assert.equal(r.status, 201, JSON.stringify(await r.json()));
});
