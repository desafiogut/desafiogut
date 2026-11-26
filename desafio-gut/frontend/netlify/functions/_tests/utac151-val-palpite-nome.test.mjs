// UTAC151-val (SEG4 ℹ️) — ramos do nome que o utac151-palpite-nome não exercitava: a verificação do identity token a
// REBENTAR (o `.catch(() => null)` do handler era removível com a suíte verde) e a REPETIÇÃO com token. Em ambos o
// palpite não é bloqueado e o Passe Programado fica certo (1 por palpite registado). Arnês copiado do utac151-palpite-nome.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac151-val-palpite-nome-comprim-suficiente";
const A = "0xaaa0000000000000000000000000000000000151";

let S, palpites, pontos, EDICAO, chamadasIdentidade;
function novoDuplo() {
  S = criarSupabase();
  S.g.passesIniciais = { relampago: 0, programado: 3 };
  palpites = []; pontos = [{ endereco: A, pontos: 0, historico: [] }];
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
        if (db.some((p) => p.endereco === st.dados.endereco && p.edicao_id === st.dados.edicao_id)) return { data: null, error: { code: "23505" } };
        const l = { id: db.length + 1, apurado: false, criado_em: "2026-11-26T00:00:00Z", ...st.dados }; db.push(l);
        return { data: l, error: null };
      }
      const ls = db.filter((l) => st.filtros.every(([c, v]) => l[c] === v));
      return st.terminal === "maybe" ? { data: ls[0] ?? null, error: null } : { data: ls, error: null };
    }
    return api;
  };
  return {
    from: (t) => (t === "palpites" || t === "pontos" ? tabela(t) : S.cliente.from(t)),
    rpc: (n, p) => S.cliente.rpc(n, p),
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
// Duplo da verificação: o token «ok:<nome>» confere com a carteira A; qualquer outro = não verificado (null).
mock.module("../_lib/privy-identidade.mjs", { namedExports: {
  verificarIdentidadePrivy: async (tok, endereco) => {
    chamadasIdentidade.push({ tok, endereco });
    if (tok === "explode") throw new Error("JWKS indisponível");
    return typeof tok === "string" && tok.startsWith("ok:") && endereco === A ? { nome: tok.slice(3) || null } : null;
  } } });

const registarPalpite = (await import("../registar-palpite.mjs")).default;
const lerPalpites = (await import("../ler-palpites.mjs")).default;
const post = (corpo) => registarPalpite(new Request("https://x/registar-palpite", {
  method: "POST", headers: { authorization: "Bearer x", "content-type": "application/json" }, body: JSON.stringify(corpo) }));
const ler = () => lerPalpites(new Request("https://x/ler-palpites?edicaoId=ESPECIAL-PALPITE1", { headers: { authorization: "Bearer x" } }));

beforeEach(() => {
  cliente = novoDuplo(); chamadasIdentidade = [];
  EDICAO = { id: "ESPECIAL-PALPITE1", tipo: "programado", status: "aberto",
    inicio_em: new Date(Date.now() - 86_400_000).toISOString(), termino_em: new Date(Date.now() + 86_400_000).toISOString() };
});

const passesProgramado = () => S.tabelas.passes_inventario.find((l) => l.endereco === A)?.passes_programado;

test("V1 · a verificação do identity token REBENTA ⇒ o palpite entra na mesma (201), sem nome, e gasta 1 só Passe", async () => {
  const r = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 77, identityToken: "explode" });
  assert.equal(r.status, 201, JSON.stringify(await r.clone().json()));
  assert.equal(chamadasIdentidade.length, 1, "a verificação nem foi chamada");
  assert.equal(palpites.length, 1);
  assert.equal("nome_exibicao" in palpites[0], false);
  assert.equal(passesProgramado(), 2, "o Passe Programado não ficou em 3 − 1");
});

test("V2 · repetição com token válido ⇒ 200 idempotente, o Passe volta (líquido 1) e o palpite original não muda", async () => {
  const r1 = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 40, identityToken: "ok:Ana Souza" });
  assert.equal(r1.status, 201);
  const r2 = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 99, identityToken: "ok:Outro Nome" });
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).idempotent, true);
  assert.equal(palpites.length, 1);
  assert.equal(palpites[0].valor, 40);
  assert.equal(palpites[0].nome_exibicao, "Ana S.");
  assert.equal(passesProgramado(), 2, "a repetição gastou um 2.º Passe");
});
