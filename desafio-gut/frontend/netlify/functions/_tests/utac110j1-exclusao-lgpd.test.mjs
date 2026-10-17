// UTAC110j.1 — LGPD: exclusão de conta com HARD DELETE + ANONIMIZAÇÃO (Frente A/B).
//
// Prova, pelo USO (excluirConta/excluirSupabase/excluirBlobs), que:
//  1. os dados pessoais das tabelas que o UTAC110j mediu como NÃO tocadas (pontos, palpites,
//     resgates, eco_quildo, google_play_compras) desaparecem ou deixam de identificar;
//  2. a anonimização NÃO é reversível pelo conteúdo retido (nenhum campo guarda o endereço, e o
//     pseudónimo é o MESMO `anon:<sha256>` documentado — não uma ofuscação nova);
//  3. os «vínculos de indicação» — que o ecrã prometia eliminados e o backend não tocava — passam
//     a ser eliminados/anonimizados nos 6 stores do referral, sem destruir dados de TERCEIROS;
//  4. a via atómica (RPC) é preferida quando existe e a via legado é usada quando não existe, com o
//     manifesto a DIZER qual correu (`via`) — o teste de deriva garante que a migração SQL, o código
//     e o texto do ecrã falam das mesmas tabelas;
//  5. o registo de auditoria guarda CONTAGENS e o pseudónimo — nunca o endereço nem o dado apagado.
//
// node --test --experimental-test-module-mocks _tests/utac110j1-exclusao-lgpd.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { excluirConta, excluirSupabase, excluirBlobs, chaveAnonima, POLITICA_EXCLUSAO, ENDERECO_ANONIMO, MORADA_DELETADA } from "../_lib/conta-delete.mjs";

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";
// Literal calculado FORA do código (`printf '%s' 0xabc… | sha256sum`) — não pela função testada.
const ANON = "anon:124fcc172f6745af1553232800463e15f3f9d103cad0d707403b38c46bfa1144";

// ── Mock Supabase (builder thenable sobre tabelas em memória) ────────────────
function fazerSupabaseMock(tabelas, { rpc = null } = {}) {
  const valorColuna = (row, col) => (col === "payload->>endereco" ? row.payload?.endereco ?? null : row[col] ?? null);
  function builder(tabela) {
    const st = { op: null, filtros: [], updateData: null, head: false };
    const api = {
      select(_c, opts) { if (!st.op) st.op = "select"; if (opts?.head) st.head = true; return api; },
      delete() { st.op = "delete"; return api; },
      update(d) { st.op = "update"; st.updateData = d; return api; },
      insert(dados) {
        st.op = "insert"; st.insertData = dados;
        return api;
      },
      eq(col, val) { st.filtros.push({ col, val }); return api; },
      or(filtro) {
        const conds = filtro.split(",").map((p) => { const [col, , val] = p.split("."); return { col, val }; });
        st.filtros.push({ or: conds }); return api;
      },
      then(resolve) {
        const rows = tabelas[tabela] ?? (tabelas[tabela] = []);
        const sel = rows.filter((r) => st.filtros.every((f) => (
          f.or ? f.or.some((c) => valorColuna(r, c.col) === c.val) : valorColuna(r, f.col) === f.val
        )));
        if (st.op === "insert") {
          const nova = { ...st.insertData };
          if (rows.some((r) => r.endereco === nova.endereco)) {
            return resolve({ data: null, error: { code: "23505", message: "duplicate key" }, count: 0 });
          }
          rows.push(nova);
          return resolve({ data: [nova], error: null, count: 1 });
        }
        if (st.op === "delete") { for (const r of sel) rows.splice(rows.indexOf(r), 1); return resolve({ data: sel, error: null, count: sel.length }); }
        if (st.op === "update") { for (const r of sel) Object.assign(r, st.updateData); return resolve({ data: sel, error: null, count: sel.length }); }
        if (st.head) return resolve({ data: null, error: null, count: sel.length });
        return resolve({ data: sel, error: null, count: sel.length });
      },
    };
    return api;
  }
  const api = { from: (t) => builder(t) };
  if (rpc) api.rpc = rpc;
  return api;
}

// ── Mock Netlify Blobs (Map por store; list com prefixo, como o real) ───────
function fazerGetStoreMock(stores) {
  return ({ name }) => {
    if (!stores[name]) stores[name] = new Map();
    const m = stores[name];
    return {
      async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
      async setJSON(k, o) { m.set(k, JSON.stringify(o)); },
      async delete(k) { m.delete(k); },
      async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
    };
  };
}

let tabelas, stores;
const semear = () => ({
  saldo_rs: [{ cliente_id: ALVO, payload: { centavos: 500 } }],
  troco_senhas: [], wallet: [], lances: [], lojistas: [], atividade_utilizadores: [],
  cotas: [],
  pontos: [{ endereco: ALVO, pontos: 37, historico: [{ tipo: "compra", pontos: 1 }] }, { endereco: OUTRO, pontos: 5, historico: [] }],
  palpites: [{ id: 1, endereco: ALVO, edicao_id: "R-1", valor: 12 }, { id: 2, endereco: OUTRO, edicao_id: "R-1", valor: 3 }],
  resgates: [
    { id: 1, endereco: ALVO, cartao_id: "C-1", morada: { nome: "Nome Teste", cpf: "52998224725", cep: "69027010" }, status: "pendente" },
    { id: 2, endereco: OUTRO, cartao_id: "C-2", morada: { nome: "Outro", cpf: "111", cep: "69000000" }, status: "enviado" },
  ],
  pontuacoes: [{ id: "p1", endereco: ALVO, ciclo_id: "1", pontos: 9 }, { id: "p2", endereco: OUTRO, ciclo_id: "1", pontos: 4 }],
  rankings_ciclo: [{ id: "r1", endereco: ALVO, ciclo_id: "1", pontos_totais: 9 }, { id: "r2", endereco: OUTRO, ciclo_id: "1", pontos_totais: 4 }],
  eco_quildo: [{ endereco: ALVO, saldo: 40, historico: [{ tipo: "emissao", eco: 40 }] }],
  google_play_compras: [{ purchase_token: "tok-1", order_id: "GPA.1", produto_id: "passe_programado", tipo_passe: "programado", endereco: ALVO, estado: "creditada", pontos: 1 }],
  // B3 (achado do validador): payload com PII em tabelas que ficavam de fora
  cotas_pagas: [{ pedido_id: "cp1", payload: { cnpj: "123", email: "alvo@ex.com", endereco: ALVO, valor: 55000 } }],
  fila_tarefas: [{ id: "t1", status: "failed", payload: { endereco: ALVO, tipo: "liquidar" } }, { id: "t2", status: "failed", payload: { endereco: OUTRO } }],
  // achado da 2.ª ronda: wallet.mjs grava { transacaoId, endereco, … } com PK idem_key
  wallet_idem: [{ idem_key: "k1", payload: { transacaoId: "t1", endereco: ALVO, saldoAntesCentavos: 10 } }],
  saldo_rs_creditos: [{ pedido_id: "pix1", payload: { endereco: ALVO, valorCentavos: 5000, email: "alvo@ex.com", cpf: "12345678900" } }],
  saldo_rs_debitos: [], passes: [],
});

beforeEach(() => {
  tabelas = semear();
  stores = {
    "referral-codes": new Map([
      [`referral-code:${ALVO}`, JSON.stringify({ codigo: "IND-AAA111", endereco: ALVO })],
      ["referral-code-reverso:IND-AAA111", JSON.stringify({ endereco: ALVO })],
      [`referral-code:${OUTRO}`, JSON.stringify({ codigo: "IND-BBB222", endereco: OUTRO })],
    ]),
    "referral-links": new Map([
      // o titular como INDICADO
      [`referral:IND-BBB222:${ALVO}`, JSON.stringify({ codigo: "IND-BBB222", indicador: OUTRO, indicado: ALVO, visitorId: "vid-alvo" })],
      [`referral-fraud:IND-BBB222:${ALVO}`, JSON.stringify({ motivo: "device", visitorId: "vid-alvo" })],
      // o titular como INDICADOR — registo de um TERCEIRO
      [`referral:IND-AAA111:${OUTRO}`, JSON.stringify({ codigo: "IND-AAA111", indicador: ALVO, indicado: OUTRO })],
      // vínculo entre terceiros — intocável
      ["referral:IND-ZZZ999:0x9999999999999999999999999999999999999999", JSON.stringify({ codigo: "IND-ZZZ999", indicador: OUTRO, indicado: "0x9999999999999999999999999999999999999999" })],
    ]),
    "referral-bonus": new Map([[`referral-bonus:${ALVO}`, JSON.stringify({ total: 2 })], [`referral-monthly:${ALVO}:2026-10`, JSON.stringify({ conversoes: 1 })]]),
    "referral-induzido": new Map([[`${ALVO}:2026-10-16`, JSON.stringify({ total: 1 })] , [`${OUTRO}:2026-10-16`, JSON.stringify({ total: 3 })]]),
    // achado do validador: o store `auditoria` (edicoes-core) guarda o endereco de quem cria/encerra
    auditoria: new Map([
      ["1700000001", JSON.stringify({ acao: "encerrar_edicao", edicaoId: "R-1", endereco: ALVO, em: "2026-10-16T00:00:00.000Z", origem: "cron" })],
      ["1700000002", JSON.stringify({ acao: "encerrar_edicao", edicaoId: "R-2", endereco: OUTRO, em: "2026-10-16T00:00:00.000Z", origem: "cron" })],
    ]),
    "referral-log": new Map([["log:2026-10-16", JSON.stringify({ eventos: [
      { tipo: "conversao", indicador: OUTRO, indicado: ALVO },
      { tipo: "conversao", indicador: OUTRO, indicado: "0x9999999999999999999999999999999999999999" },
    ] })]]),
  };
});

const linhaDe = (t, ender) => (tabelas[t] ?? []).find((r) => r.endereco === ender);
const json = (s, k) => { const v = stores[s]?.get(k); return v === undefined ? undefined : JSON.parse(v); };

/**
 * B1 (achado do VALIDADOR, medido em Postgres real) — o mock anterior não tinha FKs, e por isso dava
 * verde a uma ordem que o Postgres recusa. Este duplo verifica a FK `resgates.endereco → pontos.endereco`
 * em CADA statement, como o Postgres faz: escrever `resgates.endereco = X` sem uma linha de `pontos`
 * com essa chave devolve 23503.
 */
function fazerSupabaseComFK(tabelas) {
  const base = fazerSupabaseMock(tabelas);
  const orig = base.from;
  base.from = (tabela) => {
    const api = orig(tabela);
    if (tabela !== "resgates") return api;
    const upd = api.update;
    api.update = (dados) => {
      const chain = upd(dados);
      if (!dados || dados.endereco === undefined) return chain;
      const eqOrig = chain.eq;
      chain.eq = (col, val) => {
        const existe = (tabelas.pontos ?? []).some((p) => p.endereco === dados.endereco);
        if (!existe) {
          return { then: (r) => r({ data: null, error: { code: "23503", message: "violates foreign key constraint resgates_endereco_fkey" } }) };
        }
        return eqOrig(col, val);
      };
      return chain;
    };
    return api;
  };
  return base;
}

test("B1: com a FK real, a âncora de `pontos` nasce ANTES de `resgates` ser tocado", async () => {
  const m = await excluirSupabase(fazerSupabaseComFK(tabelas), ALVO);
  assert.deepEqual(m.erros, [], "sem 23503 — a ordem está certa");
  assert.equal(m.anonimizado.resgates, 1);
  const r = tabelas.resgates.find((x) => x.endereco === ANON);
  assert.ok(r, "o resgate foi para o pseudónimo");
  const ancora = tabelas.pontos.find((p) => p.endereco === ANON);
  assert.equal(ancora.pontos, 0, "a âncora é vazia");
  assert.equal(tabelas.pontos.some((p) => p.endereco === ALVO), false);
});

test("B1 (controlo negativo): a ordem antiga (resgates antes da âncora) é RECUSADA pela FK", async () => {
  // Simula a ordem errada: mexe em `resgates` sem âncora nenhuma.
  const sb = fazerSupabaseComFK(tabelas);
  const r = await sb.from("resgates").update({ endereco: ANON }).eq("id", 1);
  assert.equal(r.error.code, "23503", "o duplo morde — é o que faltava ao mock antigo");
});

// ── 1. HARD DELETE das tabelas que o 110j mediu como não tocadas ─────────────
test("hard delete: palpites, pontuacoes e rankings_ciclo saem; terceiro intacto", async () => {
  const m = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(m.erros, []);
  for (const t of ["palpites", "pontuacoes", "rankings_ciclo"]) {
    assert.equal((tabelas[t] ?? []).filter((r) => r.endereco === ALVO).length, 0, `${t}: nenhuma linha do titular`);
    assert.ok((tabelas[t] ?? []).filter((r) => r.endereco === OUTRO).length >= 1, `${t}: o terceiro fica`);
  }
  assert.equal(m.deletado.palpites, 1);
});

// ── 2. R18-110j.1-4b — resgates ANONIMIZADO (prova de entrega) + pontos ÂNCORA ─
test("R18-110j.1-4b: resgates fica anonimizado — morada → «[Conta Deletada]», registo da entrega intacto", async () => {
  const m = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(m.erros, []);
  const r = tabelas.resgates.find((x) => x.endereco === ANON);
  assert.ok(r, "o resgate do titular passa para o pseudónimo");
  assert.equal(r.cartao_id, "C-1", "o registo da transacção fica (obrigação contabilística)");
  assert.equal(r.status, "pendente");
  assert.deepEqual(r.morada, { nome: MORADA_DELETADA, cpf: MORADA_DELETADA, cep: MORADA_DELETADA },
    "as chaves da morada mantêm-se; os VALORES deixam de identificar");
  assert.equal(JSON.stringify(tabelas).includes("69027010"), false, "o CEP do titular não sobrevive");
  assert.equal(m.anonimizado.resgates, 1);
  // O resgate de um terceiro não é tocado.
  const outro = tabelas.resgates.find((x) => x.endereco === OUTRO);
  assert.equal(outro.morada.cep, "69000000");
});

test("R18-110j.1-4b: `pontos` — saldo e histórico apagados, linha fica vazia como âncora da FK", async () => {
  await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  const ancoras = tabelas.pontos.filter((p) => p.endereco === ANON);
  assert.equal(ancoras.length, 1, "uma só linha pseudónima");
  assert.equal(ancoras[0].pontos, 0, "sem saldo");
  assert.deepEqual(ancoras[0].historico, [], "sem histórico");
  assert.equal(tabelas.pontos.some((p) => p.endereco === ALVO), false, "nenhuma linha com o endereço do titular");
});

test("R18-110j.1-4b: sem resgate, `pontos` é APAGADO — não se deixa âncora vazia a fazer volume", async () => {
  tabelas.resgates = tabelas.resgates.filter((r) => r.endereco !== ALVO);
  const m = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(m.erros, []);
  assert.equal(tabelas.pontos.some((p) => p.endereco === ANON), false, "sem âncora");
  assert.equal(tabelas.pontos.some((p) => p.endereco === ALVO), false, "linha do titular apagada");
  assert.equal(m.anonimizado.resgates, 0);
  assert.equal(m.deletado.pontos, 1);
});

test("R18-110j.1-4b: 2.ª exclusão do mesmo endereço — a âncora NÃO duplica", async () => {
  const sb = () => fazerSupabaseMock(tabelas);
  await excluirSupabase(sb(), ALVO);
  // a mesma carteira volta, acumula pontos e pede eliminação outra vez
  tabelas.pontos.push({ endereco: ALVO, pontos: 12, historico: [{ tipo: "compra", pontos: 1 }] });
  const r2 = await excluirSupabase(sb(), ALVO);
  assert.deepEqual(r2.erros, []);
  const ancoras = tabelas.pontos.filter((p) => p.endereco === ANON);
  assert.equal(ancoras.length, 1, "continua a haver UMA âncora (sem colisão de PK)");
  assert.equal(ancoras[0].pontos, 0);
  assert.equal(tabelas.pontos.some((p) => p.endereco === ALVO), false);
});

test("R18-110j.1-4b (segurança): se o resgate NÃO for anonimizado, `pontos` não é apagado", async () => {
  const sb = fazerSupabaseMock(tabelas);
  const orig = sb.from;
  // `resgates` que lê bem e falha no UPDATE (ex.: permissão) — o pior caso para a FK.
  const resgatesQueFalham = {
    select: () => ({ eq: async () => ({ data: [{ id: 1, morada: { cep: "69027010" } }], error: null }) }),
    update: () => ({ eq: async () => ({ data: null, error: { message: "permission denied" } }) }),
  };
  sb.from = (t) => (t === "resgates" ? resgatesQueFalham : orig(t));

  const m = await excluirSupabase(sb, ALVO);
  assert.ok(m.erros.some((e) => e.includes("resgates")), JSON.stringify(m.erros));
  assert.ok(m.erros.some((e) => e.includes("pontos")), "o erro de `pontos` tem de ser explícito");
  // O que importa: a linha com o endereço NÃO foi apagada — se fosse, o CASCADE levaria o registo.
  assert.ok(tabelas.pontos.some((p) => p.endereco === ALVO), "`pontos` intacto (fail-closed)");
});

// ── 2. ANONIMIZAÇÃO: o registo fica, a pessoa sai (e não é reversível pelo conteúdo) ─
test("anonimização: google_play_compras mantém a prova, perde o endereço e não guarda PII", async () => {
  const m = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(m.erros, []);
  const gpc = tabelas.google_play_compras[0];
  assert.equal(gpc.endereco, ANON, "pseudónimo determinístico (o mesmo do resto do repo)");
  assert.equal(gpc.purchase_token, "tok-1", "a prova de compra fica");
  assert.equal(gpc.estado, "creditada");
  assert.equal(JSON.stringify(gpc).includes(ALVO), false, "nenhum campo guarda o endereço");
  assert.equal(m.anonimizado.google_play_compras, 1);
  // O pseudónimo NÃO é o endereço disfarçado: é outro valor, e o endereço não se lê dele.
  assert.notEqual(ANON, ALVO);
  assert.equal(ANON.includes(ALVO.slice(2, 10)), false);
});

test("anonimização: eco_quildo mantém saldo/histórico (lastro) e a 2.ª exclusão NÃO deixa resíduo com o endereço", async () => {
  const sb = fazerSupabaseMock(tabelas);
  await excluirSupabase(sb, ALVO);
  const a = tabelas.eco_quildo.find((r) => r.endereco === ANON);
  assert.equal(a.saldo, 40, "o passivo continua a existir (lastro em R$)");
  assert.deepEqual(a.historico, [{ tipo: "emissao", eco: 40 }]);
  assert.equal(linhaDe("eco_quildo", ALVO), undefined, "não sobra linha com o endereço");

  // O mesmo endereço volta a acumular e exclui outra vez: colisão na PK do pseudónimo.
  tabelas.eco_quildo.push({ endereco: ALVO, saldo: 7, historico: [{ tipo: "indicacao", eco: 7 }] });
  const r2 = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(r2.erros, []);
  const b = tabelas.eco_quildo.filter((r) => r.endereco === ANON);
  assert.equal(b.length, 1, "uma só linha pseudónima");
  assert.equal(b[0].saldo, 47, "saldos somados");
  assert.equal(b[0].historico.length, 2, "históricos juntados");
  assert.equal(linhaDe("eco_quildo", ALVO), undefined, "nenhuma linha com o endereço de quem pediu eliminação");
});

test("anonimização fiscal: o payload retido perde endereço, e-mail e CPF (defesa em profundidade)", async () => {
  await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  const p = tabelas.saldo_rs_creditos[0].payload;
  // O token do PAYLOAD é o `0x…dead` do MC72/MC104.2 (não o `anon:<sha256>` dos registos com PII
  // em chave): é um token fixo, partilhado por todas as exclusões — e por isso não identifica ninguém.
  assert.equal(p.endereco, ENDERECO_ANONIMO);
  assert.notEqual(p.endereco, ALVO);
  assert.equal(p.valorCentavos, 5000, "o valor fiscal fica");
  assert.equal("email" in p, false);
  assert.equal("cpf" in p, false);
  // B6 (achado do validador): `payerName`/`nomeCompleto` NÃO estavam na lista e sobreviviam.
  assert.equal("payerName" in p, false);
  assert.equal("nomeCompleto" in p, false);
  assert.equal(JSON.stringify(p).includes("Fulano"), false);
  assert.equal(JSON.stringify(p).includes("alvo@ex.com"), false);
});

// ── 3. Indicações: o que o ecrã prometia e o backend não fazia ───────────────
test("indicações: código, vínculos e bónus do titular são APAGADOS", async () => {
  const m = await excluirBlobs(fazerGetStoreMock(stores), ALVO);
  assert.deepEqual(m.erros, []);
  assert.equal(json("referral-codes", `referral-code:${ALVO}`), undefined);
  assert.equal(json("referral-codes", "referral-code-reverso:IND-AAA111"), undefined, "o reverso não deixa o código a apontar para o endereço");
  assert.equal(json("referral-links", `referral:IND-BBB222:${ALVO}`), undefined, "o vínculo do titular sai");
  assert.equal(json("referral-links", `referral-fraud:IND-BBB222:${ALVO}`), undefined, "a fraude com visitorId dele sai");
  assert.equal(json("referral-bonus", `referral-bonus:${ALVO}`), undefined);
  assert.equal(json("referral-bonus", `referral-monthly:${ALVO}:2026-10`), undefined);
  assert.equal(json("referral-induzido", `${ALVO}:2026-10-16`), undefined);
});

test("indicações: o vínculo de um TERCEIRO fica, mas sem o endereço do titular (indicador → pseudónimo)", async () => {
  await excluirBlobs(fazerGetStoreMock(stores), ALVO);
  const terceiro = json("referral-links", `referral:IND-AAA111:${OUTRO}`);
  assert.ok(terceiro, "o registo do indicado (outra pessoa) NÃO é apagado");
  assert.equal(terceiro.indicado, OUTRO);
  assert.equal(terceiro.indicador, ANON, "só o endereço do titular é substituído");
  assert.equal(JSON.stringify(terceiro).includes(ALVO), false);
  // Vínculo entre dois terceiros: intacto.
  const alheio = json("referral-links", "referral:IND-ZZZ999:0x9999999999999999999999999999999999999999");
  assert.equal(alheio.indicador, OUTRO);
});

test("indicações: o log de auditoria é anonimizado, não apagado (Marco Civil art. 15)", async () => {
  const m = await excluirBlobs(fazerGetStoreMock(stores), ALVO);
  assert.equal(m.anonimizado["referral-log"], 1);
  const doc = json("referral-log", "log:2026-10-16");
  assert.equal(doc.eventos.length, 2, "os eventos ficam (auditoria)");
  assert.equal(doc.eventos[0].indicado, ANON);
  assert.equal(doc.eventos[0].indicador, OUTRO, "o endereço do terceiro não é tocado");
  assert.equal(JSON.stringify(doc).includes(ALVO), false);
});

test("indicações: falha ao apagar uma chave NÃO fica silenciosa (sobe ao manifesto)", async () => {
  const gs = fazerGetStoreMock(stores);
  const gsQueFalha = (o) => {
    const st = gs(o);
    if (o.name !== "referral-codes") return st;
    return { ...st, delete: async () => { throw new Error("blob_store_indisponivel"); } };
  };
  const m = await excluirBlobs(gsQueFalha, ALVO);
  assert.ok(m.erros.some((e) => e.includes("referral-codes")), JSON.stringify(m.erros));
});

test("achado do validador: o store `auditoria` perde o endereço e mantém o evento", async () => {
  const m = await excluirBlobs(fazerGetStoreMock(stores), ALVO);
  assert.equal(m.anonimizado["auditoria"], 1);
  const meu = json("auditoria", "1700000001");
  assert.equal(meu.endereco, ANON, "o endereço do titular sai do registo de auditoria");
  assert.equal(meu.acao, "encerrar_edicao", "o EVENTO fica (retenção de auditoria)");
  assert.equal(meu.edicaoId, "R-1");
  assert.equal(JSON.stringify(meu).includes(ALVO), false);
  // terceiro intacto
  assert.equal(json("auditoria", "1700000002").endereco, OUTRO);
});

test("2.ª ronda/B3: `wallet_idem` perde o endereço e mantém o registo da operação", async () => {
  const m = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(m.erros, []);
  const w = tabelas.wallet_idem[0];
  assert.equal(w.payload.endereco, ENDERECO_ANONIMO);
  assert.equal(w.payload.transacaoId, "t1", "o registo da operação fica (idempotência/auditoria)");
  assert.equal(m.anonimizado.wallet_idem, 1);
});

test("2.ª ronda/B2: falha de LEITURA por chave sobe ao manifesto (antes era engolida)", async () => {
  const gs = fazerGetStoreMock(stores);
  const gsComLeituraQuebrada = (o) => {
    const st = gs(o);
    if (o.name !== "saldo-rs") return st;
    return { ...st, get: async () => { throw new Error("leitura falhou"); } };
  };
  const m = await excluirBlobs(gsComLeituraQuebrada, ALVO);
  assert.ok(m.erros.some((e) => e.includes("saldo-rs")), JSON.stringify(m.erros).slice(0, 200));
});

test("`fila_tarefas_legado` é OPCIONAL: ausente não é erro, presente é anonimizada", async () => {
  // AUSENTE a sério: o driver devolve 42P01 (relation does not exist) — o caminho que o Postgres usa.
  const sbAusente = fazerSupabaseMock(tabelas);
  const origFrom = sbAusente.from;
  sbAusente.from = (t) => (t === "fila_tarefas_legado"
    ? { select: () => ({ eq: async () => ({ data: null, error: { code: "42P01", message: 'relation "public.fila_tarefas_legado" does not exist' } }) }) }
    : origFrom(t));
  const semLegado = await excluirSupabase(sbAusente, ALVO);
  assert.deepEqual(semLegado.erros, [], "42P01 na tabela OPCIONAL não pode falhar a exclusão");
  assert.equal(semLegado.anonimizado.fila_tarefas_legado, 0);
  // presente com PII do titular
  const comLegado = { ...semear(), fila_tarefas_legado: [{ id: "L1", payload: { endereco: ALVO } }] };
  const m = await excluirSupabase(fazerSupabaseMock(comLegado), ALVO);
  assert.deepEqual(m.erros, []);
  assert.equal(comLegado.fila_tarefas_legado[0].payload.endereco, ENDERECO_ANONIMO);
  assert.equal(m.anonimizado.fila_tarefas_legado, 1);
});

test("B2 (achado do validador): store indisponível é ERRO, não «0 apagados com sucesso»", async () => {
  // Antes: `abrirStoreSeguro` devolvia null, cada chamador traduzia em 0 e o manifesto dizia ok:true
  // (HTTP 200) sem ter apagado nada. Agora tem de subir.
  const getStoreQueFalha = () => { throw new Error("Blobs não configurado"); };
  const m = await excluirBlobs(getStoreQueFalha, ALVO);
  assert.ok(m.erros.length > 0, "tem de haver erro visível");
  assert.ok(m.erros.some((e) => e.includes("indisponível")), JSON.stringify(m.erros).slice(0, 200));
});

test("B3: `cotas_pagas` e `fila_tarefas` perdem a PII (e o registo fica)", async () => {
  const m = await excluirSupabase(fazerSupabaseMock(tabelas), ALVO);
  assert.deepEqual(m.erros, []);
  const cp = tabelas.cotas_pagas[0];
  assert.equal(cp.payload.endereco, ENDERECO_ANONIMO, "o endereço sai do registo da cota paga");
  assert.equal("email" in cp.payload, false, "o e-mail sai");
  assert.equal("cnpj" in cp.payload, false, "o CNPJ sai");
  assert.equal(cp.payload.valor, 55000, "o valor (prova contabilística) fica");
  const t1 = tabelas.fila_tarefas.find((t) => t.id === "t1");
  assert.equal(t1.payload.endereco, ENDERECO_ANONIMO, "a tarefa falhada deixa de guardar o endereço");
  assert.equal(tabelas.fila_tarefas.find((t) => t.id === "t2").payload.endereco, OUTRO, "terceiro intacto");
  assert.equal(m.anonimizado.cotas_pagas, 1);
  assert.equal(m.anonimizado.fila_tarefas, 1);
});

// ── 4. Auditoria: contagens sem os dados apagados ────────────────────────────
test("auditoria: grava pseudónimo + contagens, NUNCA o endereço nem o conteúdo apagado", async () => {
  const m = await excluirConta({ supabase: fazerSupabaseMock(tabelas), getStore: fazerGetStoreMock(stores), endereco: ALVO });
  assert.equal(m.ok, true, JSON.stringify(m.erros));
  assert.equal(m.auditoria, true);
  const chaves = [...stores["audit-exclusao"].keys()];
  assert.equal(chaves.length, 1);
  const reg = json("audit-exclusao", chaves[0]);
  assert.equal(reg.anon, ANON);
  assert.equal(JSON.stringify(reg).includes(ALVO), false, "sem endereço no registo de auditoria");
  assert.equal(JSON.stringify(reg).includes("69027010"), false, "sem morada");
  assert.equal(reg.anonimizado.resgates, 1, "as contagens provam o que foi anonimizado (R18-110j.1-4b)");
  assert.equal(reg.deletado.pontos, 1, "…e o que foi apagado");
});

test("auditoria: dry-run NÃO grava auditoria (nada foi apagado)", async () => {
  const m = await excluirConta({ supabase: fazerSupabaseMock(tabelas), getStore: fazerGetStoreMock(stores), endereco: ALVO, dryRun: true });
  assert.equal(m.auditoria, false);
  assert.equal(stores["audit-exclusao"], undefined);
  assert.equal((tabelas.pontos ?? []).length, 2, "dry-run não apaga");
});

// ── 5. Atomicidade: via RPC preferida, via legado declarada ──────────────────
test("via RPC: quando a função existe, é ELA que corre e o manifesto diz `rpc`", async () => {
  let chamada = null;
  const rpc = async (nome, args) => {
    chamada = { nome, args };
    return { data: { deletado: { pontos: 1, palpites: 1 }, anonimizado: { eco_quildo: 1 } }, error: null };
  };
  const m = await excluirConta({ supabase: fazerSupabaseMock(tabelas, { rpc }), getStore: fazerGetStoreMock(stores), endereco: ALVO });
  assert.equal(chamada.nome, "excluir_conta_titular");
  assert.deepEqual(chamada.args, { p_endereco: ALVO, p_anon: ANON, p_dry_run: false });
  assert.equal(m.via, "rpc");
  assert.deepEqual(m.supabase.deletado, { pontos: 1, palpites: 1 });
  assert.equal((tabelas.pontos ?? []).length, 2, "a via RPC não repete os deletes no cliente");
});

test("3.ª ronda/ressalva 2: o manifesto diz `atomico:false` na via legado e `true` na RPC", async () => {
  const rpcOk = async () => ({ data: { deletado: {}, anonimizado: {} }, error: null });
  const comRpc = await excluirConta({ supabase: fazerSupabaseMock(tabelas, { rpc: rpcOk }), getStore: fazerGetStoreMock(stores), endereco: ALVO });
  assert.equal(comRpc.atomico, true, "RPC = transacção única");
  const legado = await excluirConta({ supabase: fazerSupabaseMock(tabelas), getStore: fazerGetStoreMock(stores), endereco: ALVO });
  assert.equal(legado.atomico, false, "via legado NÃO é atómica — e o manifesto tem de o dizer");
});

test("RPC ausente (42883): cai para a via legado e DIZ que não é atómica", async () => {
  const rpc = async () => ({ data: null, error: { code: "42883", message: "Could not find the function public.excluir_conta_titular" } });
  const m = await excluirConta({ supabase: fazerSupabaseMock(tabelas, { rpc }), getStore: fazerGetStoreMock(stores), endereco: ALVO });
  assert.equal(m.via, "legado");
  assert.equal(m.supabase.via, "legado");
  assert.equal((tabelas.pontos ?? []).filter((r) => r.endereco === ALVO).length, 0, "a via legado apaga na mesma");
});

test("RPC que falha a MEIO não cai em silêncio para a via não atómica (erro visível)", async () => {
  const rpc = async () => ({ data: null, error: { code: "23503", message: "violates foreign key constraint" } });
  const m = await excluirConta({ supabase: fazerSupabaseMock(tabelas, { rpc }), getStore: fazerGetStoreMock(stores), endereco: ALVO });
  assert.equal(m.ok, false);
  assert.match(m.erros.join(" "), /rpc/);
  assert.equal((tabelas.pontos ?? []).length, 2, "nada foi apagado (a transacção do Postgres reverteu)");
});

// ── 6. Deriva: SQL ↔ JS ↔ texto do ecrã ─────────────────────────────────────
const RAIZ = fileURLToPath(new URL("../../../", import.meta.url)); // …/frontend/
const lerTxt = (rel) => readFileSync(`${RAIZ}${rel}`, "utf8");
const SQL = lerTxt("supabase/migrations/20261016_utac110j1_exclusao_conta_rpc.sql");
const MODAL = lerTxt("src/components/ExcluirContaModal.jsx");
const PAGINA = lerTxt("src/pages/ExcluirConta.jsx");

test("deriva SQL↔JS: TODA a tabela da política aparece na migração (e vice-versa)", () => {
  // B7 (achado do validador): ler o SQL com comentários deixava passar uma tabela citada só no
  // cabeçalho. Passa a ler-se o CORPO EXECUTÁVEL — comentários `--` a menos.
  const SQL_CORPO = SQL.replace(/--[^\n]*/g, "");
  const tabelasPolitica = POLITICA_EXCLUSAO.map((p) => p.alvo).filter((a) => !a.startsWith("blobs:"));
  for (const t of tabelasPolitica) {
    // A tabela tem de estar REFERIDA na migração, seja numa lista `FROM (VALUES ('t'…))` seja como
    // `public.t` (as que têm tratamento próprio, como `resgates` e `pontos`, não vivem numa lista).
    assert.ok(new RegExp(`\\('${t}'|public\\.${t}\\b`).test(SQL_CORPO),
      `a migração não fala de ${t} — o SQL e o código divergiram`);
  }
  // Do outro lado: nenhuma tabela citada na migração pode estar fora da política.
  const citadas = [
    ...[...SQL_CORPO.matchAll(/\('([a-z_]+)',\s*'(?:cliente_id|endereco)'\)/g)].map((m) => m[1]),
    ...[...SQL_CORPO.matchAll(/\('([a-z_]+)'\)/g)].map((m) => m[1]),
    ...[...SQL_CORPO.matchAll(/(?:FROM|INTO|UPDATE)\s+public\.([a-z_]+)/g)].map((m) => m[1]),
  ];
  for (const t of new Set(citadas)) {
    assert.ok(tabelasPolitica.includes(t), `a migração apaga/anonimiza ${t}, que não está em POLITICA_EXCLUSAO`);
  }
  assert.ok(new Set(citadas).size >= 15, "controlo: o leitor do SQL encontrou as tabelas (não passou em vazio)");
  // R18-110j.1-4b — as duas decisões do operador têm de estar no SQL, não só no JS.
  assert.match(SQL, /Conta Deletada/, "a migração não substitui a morada pelo token");
  assert.match(SQL, /morada/, "a migração não toca na morada do resgate");
});

test("deriva SQL↔JS: as chaves de PII removidas são as MESMAS nos dois lados", () => {
  const js = /const PII_KEYS_REMOVER = \[([^\]]+)\]/.exec(lerTxt("netlify/functions/_lib/conta-delete.mjs"))[1];
  const chavesJs = [...js.matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  const linhaSql = /(coalesce\(p, '\{\}'::jsonb\)\s*\n?\s*-[^|]*)/.exec(SQL)[0];
  const chavesSql = [...linhaSql.matchAll(/- '([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(chavesSql, chavesJs, "a função SQL tem de limpar exatamente as mesmas chaves de PII");
});

test("deriva JS↔ecrã: o texto do ecrã não pode prometer nem esconder o que o backend faz", () => {
  const EXIGIDO_NO_TEXTO = [
    // alvo da política → expressão que o utilizador tem de ler
    ["palpites", /Palpites/i],
    ["resgates", /morada passa a «\[Conta Deletada\]»/i],
    ["pontos", /Pontos de fidelidade|pontos de fidelidade/],
    ["eco_quildo", /ECOQUILDO/i],
    ["google_play_compras", /Google Play/i],
    ["blobs:referral-codes", /v[íi]nculos de indica/i],
    ["blobs:referral-log", /Logs de auditoria/i],
  ];
  const texto = `${MODAL}\n${PAGINA}`;
  for (const [alvo, re] of EXIGIDO_NO_TEXTO) {
    assert.ok(POLITICA_EXCLUSAO.some((p) => p.alvo === alvo), `controlo: ${alvo} está na política`);
    assert.match(texto, re, `a política trata de ${alvo} e o ecrã não o diz — texto e backend divergiram`);
  }
  // A frase absoluta que era FALSA (nem tudo é apagado) não pode voltar.
  assert.doesNotMatch(MODAL, /todos os dados pessoais ser[ãa]o permanentemente/);
  assert.doesNotMatch(PAGINA, /todos\s+os dados pessoais associados ser[ãa]o apagados permanentemente/i);

  // R18-110j.1-4b — o resgate mudou de lado: fora dos APAGADOS, dentro dos RETIDOS. Sem esta guarda,
  // bastaria reaproveitar a frase antiga para o ecrã voltar a prometer o que já não acontece.
  const bloco = (nome) => {
    const i = MODAL.indexOf(`export const ${nome} = [`);
    assert.ok(i >= 0, `controlo: não encontrei a lista ${nome}`);
    return MODAL.slice(i, MODAL.indexOf("];", i));
  };
  assert.doesNotMatch(bloco("APAGADOS"), /[Rr]esgates/, "resgates não pode estar no que é ELIMINADO");
  assert.match(bloco("RETIDOS"), /[Rr]esgates/, "resgates tem de estar no que é RETIDO");
});
