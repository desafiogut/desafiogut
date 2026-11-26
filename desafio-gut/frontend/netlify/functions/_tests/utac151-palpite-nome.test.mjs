// UTAC151 (R18-151-A) — «PrimeiroNome I.» na tabela de palpites. Handlers REAIS `registar-palpite.mjs` e `ler-palpites.mjs`
// contra o duplo das tabelas (arnês do utac147). A verificação do identity token do Privy é um duplo aqui: a lib real
// (`_lib/privy-identidade.mjs`: assinatura ES256, iss, aud, exp, carteira) já é provada no utac146-nome-origem.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

process.env.JWT_SECRET = "segredo-de-teste-utac151-palpite-nome-comprimento-suficiente";
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

test("N1 · identity token verificado ⇒ guarda SÓ «PrimeiroNome I.» (nunca o nome completo) e verifica contra a carteira da sessão", async () => {
  const r = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 120, identityToken: "ok:Ramon da Silva Souza" });
  assert.equal(r.status, 201, JSON.stringify(await r.clone().json()));
  assert.equal(palpites.length, 1);
  assert.equal(palpites[0].nome_exibicao, "Ramon S.");
  assert.deepEqual(chamadasIdentidade, [{ tok: "ok:Ramon da Silva Souza", endereco: A }]);
});

test("N2 · sem identity token, token inválido, ou conta sem nome Google ⇒ sem nome (o insert nem leva a coluna)", async () => {
  for (const [i, corpo] of [{}, { identityToken: "forjado" }, { identityToken: "ok:" }, { identityToken: 42 }].entries()) {
    cliente = novoDuplo();
    const r = await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 10 + i, ...corpo });
    assert.equal(r.status, 201, `caso ${i}`);
    assert.equal("nome_exibicao" in palpites[0], false, `caso ${i}: não devia gravar nome`);
  }
});

test("N3 · o `nomeExibicao` do body é IGNORADO (forjável) e um e-mail nunca vira nome", async () => {
  await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 5, nomeExibicao: "Presidente X." });
  assert.equal("nome_exibicao" in palpites[0], false);
  cliente = novoDuplo();
  await post({ edicaoId: "ESPECIAL-PALPITE1", valor: 6, identityToken: "ok:alguem@gmail.com" });
  assert.equal("nome_exibicao" in palpites[0], false, "e-mail não é nome de pessoa");
});

test("N4 · ler-palpites devolve `nomeExibicao` (ou null) e continua a esconder o valor durante a edição", async () => {
  palpites.push({ endereco: A, edicao_id: "ESPECIAL-PALPITE1", valor: 120, criado_em: "t1", nome_exibicao: "Ramon S." });
  palpites.push({ endereco: "0xbbb0000000000000000000000000000000000002", edicao_id: "ESPECIAL-PALPITE1", valor: 90, criado_em: "t2" });
  const r = await ler();
  const b = await r.json();
  assert.equal(r.status, 200, JSON.stringify(b));
  assert.equal(b.revelado, false);
  assert.deepEqual(b.palpites.map((p) => p.nomeExibicao), ["Ramon S.", null]);
  assert.ok(b.palpites.every((p) => !("valor" in p)), "o valor não pode sair durante a edição");
});
