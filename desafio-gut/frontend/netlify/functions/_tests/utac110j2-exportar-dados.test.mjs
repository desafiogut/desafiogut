// UTAC110j.2 — PORTABILIDADE COMPLETA (LGPD art. 18, II e V) — DEBT-046.
//
// O que este teste vigia:
//   1. COBERTURA: as 6 tabelas que o 110j.1 passou a apagar/anonimizar entram na exportação. Era o
//      buraco da DEBT-046: o titular podia ELIMINAR o que a PORTABILIDADE nunca lhe mostrou.
//   2. METADADOS: schema, controlador, base legal por categoria, o que fica retido e porquê (art. 18, II).
//   3. TERCEIROS: no programa de indicação, o endereço da contraparte NUNCA sai (sai `anon:<hash>`).
//   4. CSV: formato longo legível (cabeçalho, escape de vírgula/aspas/quebra, BOM).
//
// node --test --experimental-test-module-mocks _tests/utac110j2-exportar-dados.test.mjs

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const TITULAR = "0xaaa0000000000000000000000000000000000aaa";
const OUTRO   = "0xbbb0000000000000000000000000000000000bbb";

// ── Blobs em memória ─────────────────────────────────────────────────────────────────────────────
const blobs = new Map();
mock.module("@netlify/blobs", {
  namedExports: {
    getStore: ({ name }) => {
      if (!blobs.has(name)) blobs.set(name, new Map());
      const m = blobs.get(name);
      return {
        async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
        async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : (type === "json" ? JSON.parse(v) : v); },
        async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
      };
    },
  },
});

// ── Supabase em duplo (aplica .eq, como o PostgREST) ─────────────────────────────────────────────
let db = {};
const ctx = { configurado: true, falharTabela: null };
mock.module("../_lib/supabase-client.mjs", {
  namedExports: {
    supabaseConfigurado: () => ctx.configurado,
    getSupabaseReadOnly: () => ({
      from(tabela) {
        const filtros = [];
        const chain = {
          select: () => chain,
          eq: (col, val) => { filtros.push([col, val]); return chain; },
          or: () => chain,
          then: (resolve) => {
            if (ctx.falharTabela === tabela) return resolve({ data: null, error: { message: "indisponivel" } });
            let linhas = db[tabela] ?? [];
            for (const [col, val] of filtros) {
              if (col.includes("->>")) {
                const campo = col.split("->>")[1];
                linhas = linhas.filter((r) => String(r.payload?.[campo] ?? "") === String(val));
              } else {
                linhas = linhas.filter((r) => String(r[col] ?? "") === String(val));
              }
            }
            resolve({ data: linhas, error: null });
          },
        };
        return chain;
      },
    }),
  },
});

// ⚠️ ORDEM: todos os `mock.module` ANTES do `import` do handler. Depois seria tarde — o módulo já
// teria ligado as dependências reais (foi assim que o 1.º esboço falhou: o JWT real recusava o token).
mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({ endereco: TITULAR, papel: "owner" }) } });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/jwt-fail-counter.mjs", { namedExports: { registrarFalhaJwt: async () => {} } });

const { default: handler } = await import("../exportar-dados.mjs");

const exportar = async (qs = "") => {
  const res = await handler(new Request(`https://x/.netlify/functions/exportar-dados${qs}`, {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify({ endereco: TITULAR }),
  }));
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("csv")) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    // `Response.text()` remove o BOM (regra da especificação) — por isso os testes do BOM olham aos bytes.
    return { status: res.status, ct, bytes, texto: new TextDecoder().decode(bytes) };
  }
  return { status: res.status, ct, corpo: await res.json(), texto: null };
};

const blob = (store, key, v) => { if (!blobs.has(store)) blobs.set(store, new Map()); blobs.get(store).set(key, JSON.stringify(v)); };

function semear() {
  // as 6 tabelas da DEBT-046 (cada uma com uma linha do terceiro, para provar o filtro)
  db = {
    pontos: [{ endereco: TITULAR, pontos: 42, historico: [{ tipo: "credito" }] }, { endereco: OUTRO, pontos: 1 }],
    palpites: [{ id: 1, endereco: TITULAR, edicao_id: "P-1", valor: 12, resultado: "mais_proximo" }, { id: 2, endereco: OUTRO, valor: 3 }],
    resgates: [{ id: 1, endereco: TITULAR, cartao_id: "c-1", morada: { nome: "Ana", cpf: "111", cep: "69000-000" }, status: "enviado" }, { id: 2, endereco: OUTRO, cartao_id: "c-2" }],
    eco_quildo: [{ endereco: TITULAR, saldo: 40, historico: [{ tipo: "lastro" }] }, { endereco: OUTRO, saldo: 2 }],
    google_play_compras: [{ purchase_token: "tok-1", order_id: "GPA.1", produto_id: "passe", tipo_passe: "relampago", endereco: TITULAR, estado: "creditada", pontos: 10 }, { purchase_token: "tok-2", endereco: OUTRO, order_id: "GPA.2" }],
    cotas_pagas: [{ pedido_id: "cp1", payload: { endereco: TITULAR, valorCentavos: 55000 } }, { pedido_id: "cp2", payload: { endereco: OUTRO } }],
  };
  // indicações: o titular é indicador de OUTRO e indicado POR outro
  blob("referral-codes", `referral-code:${TITULAR}`, { codigo: "ABC123", endereco: TITULAR, criadoEm: "2026-10-01T00:00:00Z" });
  blob("referral-codes", "referral-code-reverso:ABC123", { endereco: TITULAR, criadoEm: "2026-10-01T00:00:00Z" });
  blob("referral-links", `referral:ABC123:${OUTRO}`, { codigo: "ABC123", indicador: TITULAR, indicado: OUTRO, status: "convertido", criadoEm: "2026-10-02T00:00:00Z" });
  blob("referral-links", `referral:QQQ777:${TITULAR}`, { codigo: "QQQ777", indicador: OUTRO, indicado: TITULAR, status: "pendente" });
  blob("referral-links", "referral-convertido:ABC123:" + OUTRO, { txHash: "0xfeed", em: "2026-10-03T00:00:00Z" });
  blob("referral-bonus", `referral-bonus:${TITULAR}`, { total: 3, ultimos: [{ endereco: OUTRO, em: "2026-10-02T00:00:00Z" }] });
  blob("referral-bonus", `referral-monthly:${TITULAR}:2026-10`, { conversoes: 2 });
  blob("referral-log", "log:2026-10-02", { eventos: [{ tipo: "conversao", indicador: TITULAR, indicado: OUTRO }, { tipo: "outro", indicado: "0xccc0000000000000000000000000000000000ccc" }] });
  blob("referral-induzido", `${TITULAR}:2026-10-02`, { n: 2 });
  blob("auditoria", "2026-10-02T10:00:00Z", { acao: "edicao-criada", endereco: TITULAR, edicaoId: "R-1" });
}

beforeEach(() => { blobs.clear(); db = {}; ctx.configurado = true; ctx.falharTabela = null; });

// ───────────────────────── 1. COBERTURA (o buraco da DEBT-046) ─────────────────────────

test("COBERTURA: as 6 tabelas da DEBT-046 + wallet_idem vêm na exportação, só com dados do titular", async () => {
  semear();
  const { status, corpo } = await exportar();
  assert.equal(status, 200);
  const t = corpo.dados.supabase.tabelas;
  for (const tabela of ["pontos", "palpites", "resgates", "eco_quildo", "google_play_compras", "cotas_pagas", "wallet_idem"]) {
    assert.ok(Object.hasOwn(t, tabela), `DEBT-046: ${tabela} tem de estar na exportação`);
  }
  assert.deepEqual(t.pontos.map((r) => r.endereco), [TITULAR]);
  assert.deepEqual(t.resgates.map((r) => r.endereco), [TITULAR]);
  assert.equal(t.resgates[0].morada.cpf, "111", "a morada do titular sai (é dado dele)");
  assert.deepEqual(t.cotas_pagas.map((r) => r.pedido_id), ["cp1"], "cotas_pagas filtra por payload->>endereco");
});

test("COBERTURA: cada tabela que o conta-delete trata aparece na exportação", async () => {
  semear();
  const { corpo } = await exportar();
  const tabelas = Object.keys(corpo.dados.supabase.tabelas);
  // Lista mínima exigida pelo UTAC (Frente A). Se alguém acrescentar uma tabela à exclusão e esquecer
  // a exportação, este teste não apanha sozinho — mas fixa o contrato que a DEBT-046 pedia.
  for (const exigida of ["pontos", "palpites", "resgates", "eco_quildo", "google_play_compras", "cotas_pagas"]) {
    assert.ok(tabelas.includes(exigida), `exportação sem ${exigida}`);
  }
  assert.ok(corpo.dados.indicacoes, "indicações (5 stores) têm de vir");
  assert.ok(corpo.dados.auditoria, "store auditoria (110j.1) tem de vir");
});

// ───────────────────────── 2. METADADOS (Frente B e D) ─────────────────────────

test("METADADOS: schema, controlador com CNPJ e DPO, base legal e retenção", async () => {
  semear();
  const { corpo } = await exportar();
  assert.equal(corpo.schema, "2.0");
  const m = corpo.exportacao;
  assert.equal(m.controlador.cnpj, "23.040.066/0001-00");
  assert.match(m.controlador.encarregado, /dpo@desafiogut\.com\.br/);
  assert.match(m.direito, /art\. 18, II.*art\. 19, II/s);
  assert.ok(Object.keys(m.baseLegalPorCategoria).length >= 6, "base legal por categoria");
  assert.match(m.notaPseudonimizacao, /Pseudonimização NÃO é anonimização/);
  assert.equal(m.segredosComerciais.includes("Nenhum"), true, "art. 18, §4º declarado");
});

test("METADADOS: diz o que fica retido depois da exclusão e porquê (art. 18, II)", async () => {
  semear();
  const { corpo } = await exportar();
  const r = corpo.exportacao.retencaoAposExclusao;
  const texto = JSON.stringify(r);
  for (const item of ["PIX", "resgates", "ECOQUILDO", "auditoria", "on-chain"]) {
    assert.ok(texto.includes(item), `retenção tem de explicar ${item}`);
  }
  assert.match(texto, /10 anos/);   // fiscal
  assert.match(texto, /13 meses/);  // Marco Civil
});

// ───────────────────────── 3. TERCEIROS (indicações) ─────────────────────────

test("INDICAÇÕES: o titular vê o seu código, os seus vínculos e bónus", async () => {
  semear();
  const { corpo } = await exportar();
  const i = corpo.dados.indicacoes;
  assert.equal(i.codigo.codigo, "ABC123");
  assert.equal(i.vinculos.length, 2);
  assert.deepEqual(i.vinculos.map((v) => v.papel).sort(), ["indicado", "indicador"]);
  assert.equal(i.bonus.total, 3);
  assert.equal(i.contadoresMensais[0].mes, "2026-10");
  assert.equal(i.induzido[0].n, 2);
});

test("INDICAÇÕES: o endereço da CONTRAPARTE nunca sai — sai anon:<hash>", async () => {
  semear();
  const { corpo } = await exportar();
  const txt = JSON.stringify(corpo);
  assert.ok(!txt.includes(OUTRO), "endereço de terceiro na exportação de indicações");
  for (const v of corpo.dados.indicacoes.vinculos) {
    assert.match(v.contraparte, /^anon:[0-9a-f]{16}$/, "contraparte tem de vir pseudonimizada");
  }
  // o bónus guarda `ultimos[].endereco` — esse campo também tem de estar mascarado
  assert.match(corpo.dados.indicacoes.bonus.ultimos[0].endereco, /^anon:/);
});

test("INDICAÇÕES: o log só traz eventos do titular, com terceiros mascarados", async () => {
  semear();
  const { corpo } = await exportar();
  const log = corpo.dados.indicacoes.log;
  assert.equal(log.length, 1, "só o dia com eventos do titular");
  const txt = JSON.stringify(log);
  assert.ok(!txt.includes(OUTRO));
  assert.ok(!txt.includes("0xccc0000000000000000000000000000000000ccc"), "terceiro do 2.º evento");
});

// ───────────────────────── 4. CSV (Frente B) ─────────────────────────

test("CSV: cabeçalho, uma linha por campo e valores com vírgula/aspas escapados", async () => {
  semear();
  // um valor com vírgula, aspas e quebra de linha, para exercitar o escape
  db.resgates[0].morada = { nome: 'Ana "A", Silva', cep: "69000-000", obs: "linha1\nlinha2" };
  const { status, ct, texto, bytes } = await exportar("?formato=csv");
  assert.equal(status, 200);
  assert.match(ct, /text\/csv/);
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "BOM UTF-8 nos primeiros 3 bytes (Excel)");
  const linhas = texto.replace(/^\ufeff/, "").split("\r\n");
  assert.equal(linhas[0], "categoria,caminho,valor");
  // Formato longo: categoria,caminho,valor — o caminho é relativo à categoria.
  assert.ok(linhas.some((l) => l === "dados,supabase.tabelas.resgates[0].morada.cep,69000-000"),
    `campo achatado com caminho (linhas: ${linhas.filter((l) => l.includes("morada")).slice(0, 3).join(" | ")})`);
  assert.ok(texto.includes('"Ana ""A"", Silva"'), "aspas duplicadas dentro das aspas");
  assert.ok(texto.includes('"linha1\nlinha2"'), "quebra de linha dentro de aspas");
  assert.ok(linhas.length > 30, `CSV curto demais (${linhas.length} linhas)`);
});

test("CSV e JSON contam a MESMA história (o CSV não perde o titular nem os metadados)", async () => {
  semear();
  const j = await exportar();
  const c = await exportar("?formato=csv");
  for (const agulha of [j.corpo.titular, "23.040.066/0001-00", "ABC123"]) {
    assert.ok(c.texto.includes(agulha), `CSV sem ${agulha}`);
  }
});

// ───────────────────────── 5. falha declarada, não silenciosa ─────────────────────────

test("uma tabela em erro não some: vem null e o erro é DECLARADO", async () => {
  semear();
  ctx.falharTabela = "resgates";
  const { corpo } = await exportar();
  assert.equal(corpo.dados.supabase.tabelas.resgates, null);
  assert.ok(corpo.dados.supabase.erros.some((e) => e.includes("resgates")), "o erro tem de estar visível");
});
