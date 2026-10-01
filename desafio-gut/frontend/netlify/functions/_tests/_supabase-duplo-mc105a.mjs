// MC105a — duplo do cliente Supabase (postgrest-js) para `passes` e para o saldo R$ (`saldo_rs*`).
// Fiel ao REAL nas direcções que já enganaram esta série (MC93-B/C/D, MC104):
//  - colunas conhecidas por tabela: coluna desconhecida → erro 42703 (não é ignorada);
//  - UNIQUE → 23505; CHECK → 23514 (as CHECKs de produção: MC105a + MC105a.1, que aceita `anon:<sha256>`); NOT NULL → 23502;
//  - `select(col, { count: "exact", head: true })` → `data: null` + `count` (como o HEAD do PostgREST);
//  - DEFAULTs aplicados como a tabela (id uuid, comprado_em, palpite_usado false, cupons_ids [], status 'activo');
//  - `.eq(col, null)` LANÇA (o PostgREST gera `eq.null` e dá 400 — usar `.is()`);
//  - `insert`/`update` SEM `.select()` devolvem `data: null` (o real devolve 204);
//  - `single()` com ≠1 linha e `maybeSingle()` com >1 → PGRST116; `eq("id", <não-uuid>)` em uuid → 22P02;
//  - filtro `payload->>centavos` compara TEXTO (como o `->>` do Postgres);
//  - método não implementado → LANÇA (um duplo permissivo esconde o defeito — MC93-D).
// `g.antesDeInserir(tabela, linha, tabelas)` simula um escritor concorrente antes do INSERT; `g.falhar[tabela]` força erro.
import { randomUUID } from "node:crypto";

const ESQUEMA = {
  passes: {
    colunas: ["id", "endereco", "edicao_id", "produto_id", "comprado_em", "palpite_usado", "cupons_ids", "status"],
    notNull: ["endereco", "edicao_id", "produto_id"],
    unicos: [["id"], ["endereco", "edicao_id", "produto_id"]],
    uuid: ["id"],
    defaults: () => ({ id: randomUUID(), comprado_em: new Date().toISOString(), palpite_usado: false, cupons_ids: [], status: "activo" }),
    checks: [
      (l) => /^0x[0-9a-f]{40}$/.test(l.endereco) || /^anon:[0-9a-f]{64}$/.test(l.endereco),
      (l) => ["activo", "expirado", "usado"].includes(l.status),
      (l) => Array.isArray(l.cupons_ids),
    ],
  },
  saldo_rs: { colunas: ["cliente_id", "payload", "atualizado_em"], notNull: ["cliente_id"], unicos: [["cliente_id"]], uuid: [], defaults: () => ({}), checks: [] },
  saldo_rs_creditos: { colunas: ["pedido_id", "payload", "criado_em"], notNull: ["pedido_id"], unicos: [["pedido_id"]], uuid: [], defaults: () => ({ criado_em: new Date().toISOString() }), checks: [] },
  saldo_rs_debitos: { colunas: ["operacao_id", "payload", "criado_em"], notNull: ["operacao_id"], unicos: [["operacao_id"]], uuid: [], defaults: () => ({ criado_em: new Date().toISOString() }), checks: [] },
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });

export function criarSupabase() {
  const tabelas = Object.fromEntries(Object.keys(ESQUEMA).map((t) => [t, []]));
  const g = { antesDeInserir: null, falhar: {}, chamadas: [] };

  function valor(linha, col) {
    const m = /^(\w+)->>(\w+)$/.exec(col);
    if (m) { const v = linha[m[1]]?.[m[2]]; return v == null ? null : String(v); }
    return linha[col];
  }
  function validar(tab, linha) {
    const esq = ESQUEMA[tab];
    for (const c of Object.keys(linha)) if (!esq.colunas.includes(c)) return erro("42703", `column "${c}" does not exist`);
    for (const c of esq.notNull) if (linha[c] == null) return erro("23502", `null value in column "${c}"`);
    for (const ch of esq.checks) if (!ch(linha)) return erro("23514", "new row violates check constraint");
    return null;
  }
  function colide(tab, linha, ignorar = null) {
    return ESQUEMA[tab].unicos.some((cols) => tabelas[tab].some((o) => o !== ignorar && cols.every((c) => o[c] === linha[c])));
  }

  function from(tab) {
    if (!ESQUEMA[tab]) throw new Error(`duplo: tabela ${tab} não modelada`);
    const st = { op: "select", filtros: [], ordem: null, retorno: false, dados: null, opcoes: {} };
    const api = {
      select(_c, o) { if (st.op === "select") { if (o?.head) st.head = true; } else st.retorno = true; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      upsert(d, o = {}) { st.op = "upsert"; st.dados = d; st.opcoes = o; return api; },
      eq(col, v) {
        if (v === null || v === undefined) throw new Error(`duplo: .eq("${col}", null) — o PostgREST rejeita; usar .is()`);
        st.filtros.push([col, v]); return api;
      },
      order(col, { ascending = true } = {}) { st.ordem = [col, ascending]; return api; },
      single() { st.terminal = "single"; return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      then(res, rej) { return Promise.resolve().then(executar).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "in", "is", "or", "filter", "limit", "range", "delete"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado — acrescentar com a semântica real`); };
    }

    function executar() {
      g.chamadas.push(`${tab}:${st.op}`);
      const f = g.falhar[tab];
      if (f && (!f.op || f.op === st.op)) return erro(f.code ?? "XX000", "falha simulada");
      const esq = ESQUEMA[tab];
      for (const [c, v] of st.filtros) {
        const base = c.split("->>")[0];
        if (!esq.colunas.includes(base)) return erro("42703", `column "${c}" does not exist`);
        if (esq.uuid.includes(c) && !UUID_RE.test(String(v))) return erro("22P02", "invalid input syntax for type uuid");
      }
      const casa = (l) => st.filtros.every(([c, v]) => valor(l, c) === (typeof v === "boolean" ? v : String(v)) || valor(l, c) === v);
      let linhas;
      if (st.op === "insert") {
        if (g.antesDeInserir) { const h = g.antesDeInserir; g.antesDeInserir = null; h(tab, st.dados, tabelas); }
        const nova = { ...esq.defaults(), ...st.dados };
        const e = validar(tab, nova); if (e) return e;
        if (colide(tab, nova)) return erro("23505", "duplicate key value violates unique constraint");
        tabelas[tab].push(nova); linhas = [nova];
      } else if (st.op === "upsert") {
        const alvoCols = String(st.opcoes.onConflict || "").split(",").filter(Boolean);
        const nova = { ...esq.defaults(), ...st.dados };
        const e = validar(tab, nova); if (e) return e;
        const ex = tabelas[tab].find((o) => alvoCols.every((c) => o[c] === nova[c]));
        if (ex) { if (!st.opcoes.ignoreDuplicates) Object.assign(ex, st.dados); linhas = st.opcoes.ignoreDuplicates ? [] : [ex]; }
        else { tabelas[tab].push(nova); linhas = [nova]; }
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!esq.colunas.includes(c)) return erro("42703", `column "${c}" does not exist`);
        linhas = tabelas[tab].filter(casa);
        for (const l of linhas) { const cand = { ...l, ...st.dados }; const e = validar(tab, cand); if (e) return e; Object.assign(l, st.dados); }
      } else {
        linhas = tabelas[tab].filter(casa);
        if (st.ordem) { const [c, asc] = st.ordem; linhas = [...linhas].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1)); }
      }
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.head) return { data: null, count: copia.length, error: null };
      if (st.terminal === "single") return copia.length === 1 ? { data: copia[0], error: null } : erro("PGRST116", "JSON object requested, multiple (or no) rows returned");
      if (st.terminal === "maybe") return copia.length > 1 ? erro("PGRST116", "multiple rows") : { data: copia[0] ?? null, error: null };
      return { data: copia, error: null };
    }
    return api;
  }
  return { cliente: { from }, tabelas, g };
}
