// UTAC110f — duplo da tabela `public.pontos` com as colunas e CHECKs REAIS (migrações 20261004 + 20261013).
// Copiado POR LEITURA do duplo do `utac110d-dois-passes.test.mjs` (que não se altera — GATE 15):
//   coluna inexistente → 42703 · contador negativo → 23514 · 2.ª linha do mesmo endereço → 23505.
// O UPDATE aplica os filtros `.eq()` todos (é o CAS do ledger) e, sem `.select()`, devolve data:null.
// `g.antesDeActualizar(tabela)` corre UMA vez antes do próximo UPDATE (simula um escritor concorrente).
export function criarTabelaPontos() {
  const tabela = [];
  const g = { chamadas: [], falhar: null, antesDeActualizar: null };
  const COLS = ["endereco", "pontos", "historico", "atualizado_em", "creditos_lance", "pontos_lance", "historico_lance"];
  const erro = (code, message) => ({ data: null, error: { code, message, details: null, hint: null } });
  let relogio = 0;

  function from() {
    const st = { op: "select", filtros: [], retorno: false, dados: null, terminal: null };
    const api = {
      select() { if (st.op !== "select") st.retorno = true; return api; },
      insert(d) { st.op = "insert"; st.dados = d; return api; },
      update(d) { st.op = "update"; st.dados = d; return api; },
      eq(c, v) { st.filtros.push([c, v]); return api; },
      maybeSingle() { st.terminal = "maybe"; return api; },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej); },
    };
    for (const m of ["neq", "gt", "lt", "in", "is", "or", "filter", "limit", "range", "order", "delete", "upsert", "single"]) {
      api[m] = () => { throw new Error(`duplo: .${m}() não modelado`); };
    }
    function validar(l) {
      for (const c of Object.keys(l)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
      for (const c of ["pontos", "creditos_lance", "pontos_lance"]) {
        if (!Number.isInteger(l[c]) || l[c] < 0) return erro("23514", `${c}_check`);
      }
      if (!Array.isArray(l.historico) || !Array.isArray(l.historico_lance)) return erro("23514", "array_check");
      return null;
    }
    function exec() {
      g.chamadas.push(`pontos:${st.op}`);
      const f = g.falhar;
      if (f && (!f.op || f.op === st.op)) return erro(f.code ?? "XX000", "falha simulada");
      const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
      // `atualizado_em` muda a cada escrita (como o now() do Postgres), para o CAS ver os concorrentes.
      const carimbo = () => `t${++relogio}`;
      let linhas;
      if (st.op === "insert") {
        const nova = { pontos: 0, historico: [], creditos_lance: 0, pontos_lance: 0, historico_lance: [],
          ...st.dados, atualizado_em: carimbo() };
        const e = validar(nova); if (e) return e;
        if (tabela.some((o) => o.endereco === nova.endereco)) return erro("23505", "duplicate key");
        tabela.push(nova); linhas = [nova];
      } else if (st.op === "update") {
        for (const c of Object.keys(st.dados)) if (!COLS.includes(c)) return erro("42703", `column "${c}" does not exist`);
        if (g.antesDeActualizar) { const hh = g.antesDeActualizar; g.antesDeActualizar = null; hh(tabela); }
        linhas = tabela.filter(casa);
        for (const l of linhas) { const e = validar({ ...l, ...st.dados }); if (e) return e; }
        linhas.forEach((l) => Object.assign(l, st.dados, { atualizado_em: carimbo() }));
      } else {
        linhas = tabela.filter(casa);
      }
      const copia = linhas.map((l) => structuredClone(l));
      if (st.op !== "select" && !st.retorno) return { data: null, error: null };
      if (st.terminal === "maybe") return { data: copia[0] ?? null, error: null };
      return { data: copia, error: null };
    }
    return api;
  }
  return { tabela, g, from, linha: (e) => tabela.find((l) => l.endereco === e) };
}
