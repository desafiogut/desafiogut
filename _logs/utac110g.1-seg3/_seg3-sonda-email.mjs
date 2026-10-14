// SEG3 / UTAC110g.1 — SONDA PRÓPRIA do e-mail de confirmação (instrumento do validador).
// Duplos MÍNIMOS escritos por mim (não é o teste do autor): modela só as queries que o código real faz.
// Imprime o `para` e o corpo, e testa o desvio declarado (e-mail do Privy viaja no corpo).
// Uso: node --experimental-test-module-mocks netlify/functions/_tests/_seg3-sonda-email.mjs
import { mock } from "node:test";

const A = "0xbbb0000000000000000000000000000000000002";
process.env.JWT_SECRET = "segredo-seg3-com-comprimento-suficiente-000";

// ── duplo Supabase: SÓ as 5 queries que o caminho real usa ──────────────────────────────────────
let ENVIADOS = [];
let RESGATES = [];
let pontosLinha = {
  endereco: A, pontos: 50, atualizado_em: "2026-10-13T00:00:00.000Z",
  historico: [{ tipo: "compra", pontos: 50, ref: "c50", data: "2026-10-01T00:00:00.000Z" }],
};
let seq = 0;
function from(tabela) {
  const st = { op: "select", dados: null, filtros: [], term: null };
  const api = {};
  api.select = () => api;
  api.insert = (d) => { st.op = "insert"; st.dados = d; return api; };
  api.update = (d) => { st.op = "update"; st.dados = d; return api; };
  api.eq = (c, v) => { st.filtros.push([c, v]); return api; };
  api.order = () => api;
  api.maybeSingle = () => { st.term = "maybe"; return api; };
  api.single = () => { st.term = "single"; return api; };
  api.then = (res, rej) => Promise.resolve().then(exec).then(res, rej);
  for (const m of ["neq", "gt", "lt", "gte", "lte", "in", "is", "or", "not", "filter", "limit", "range", "delete", "upsert", "ilike"]) {
    api[m] = () => { throw new Error(`sonda: .${m}() não modelado (o caminho real mudou?)`); };
  }
  const casa = (l) => st.filtros.every(([c, v]) => l[c] === v);
  function exec() {
    if (tabela === "pontos") {
      if (st.op === "insert") return { data: [pontosLinha = { ...st.dados }], error: null };
      if (st.op === "update") {
        if (!casa(pontosLinha)) return { data: [], error: null };       // CAS perdido
        Object.assign(pontosLinha, st.dados);
        return { data: [{ endereco: pontosLinha.endereco }], error: null };
      }
      return st.term === "maybe" ? { data: pontosLinha ?? null, error: null } : { data: [pontosLinha], error: null };
    }
    if (tabela === "resgates") {
      if (st.op === "insert") {
        const l = { ...st.dados, id: ++seq };
        RESGATES.push(l);
        return { data: l, error: null };
      }
      const achados = RESGATES.filter(casa);
      return st.term === "maybe" ? { data: achados[0] ?? null, error: null } : { data: achados, error: null };
    }
    throw new Error(`sonda: tabela ${tabela} não modelada`);
  }
  return api;
}

mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => ({ from }), getSupabaseReadOnly: () => ({ from }), supabaseConfigurado: () => true } });
mock.module("../_lib/jwt.mjs", { namedExports: { verificarUserSession: async () => ({ endereco: A, tipo: "user-session" }) } });
mock.module("../_lib/system-state.mjs", { namedExports: { sistemaPausado: () => false, lerEstadoSistema: async () => ({ status: "ativo" }), escreverEstadoSistema: async () => {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/notificacoes-usuario.mjs", { namedExports: { adicionarNotificacao: async () => true, gerarResumosPosEdicao: async () => [], lerNotificacoes: async () => [], marcarLidas: async () => true, MAX_NOTIF: 50 } });
mock.module("../_lib/email.mjs", { namedExports: { enviarEmail: async (o) => { ENVIADOS.push(o); return { ok: true, id: "sg" }; } } });

const handler = (await import("../resgatar-cartao.mjs")).default;

const MORADA = { nome: "Maria Quildo", cpf: "11144477735", cep: "69027010", logradouro: "Rua das Flores",
  numero: "42", complemento: "Casa 2", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999" };

const post = (corpo, key = "k-seg3-0001") => handler(new Request("https://ex.test/x", {
  method: "POST", headers: { authorization: "Bearer x" },
  body: JSON.stringify({ cartaoId: "cartao-familia-quildo", morada: MORADA, idempotencyKey: key, ...corpo }),
}));

function resetar() {
  ENVIADOS = []; RESGATES = []; seq = 0;
  pontosLinha = { endereco: A, pontos: 50, atualizado_em: "2026-10-13T00:00:00.000Z",
    historico: [{ tipo: "compra", pontos: 50, ref: "c50", data: "2026-10-01T00:00:00.000Z" }] };
}

// ══ S1 — o e-mail carrega mesmo a Nota Técnica estruturada? ══════════════════════════════════════
resetar();
let res = await post({ email: "privy.maria@example.com" });
console.log("S1 status:", res.status, "| e-mails enviados:", ENVIADOS.length);
console.log("S1 para:", JSON.stringify(ENVIADOS[0]?.para));
console.log("S1 assunto:", JSON.stringify(ENVIADOS[0]?.assunto));
console.log("--- CORPO S1 ---\n" + ENVIADOS[0]?.mensagem + "\n--- FIM ---");
console.log("S1 linha do resgate gravado:", JSON.stringify(RESGATES[0]).slice(0, 220));

// ══ S2 — o servidor tem ALGUMA outra fonte de destino? (morada com e-mail escondido) ═════════════
resetar();
res = await post({ morada: { ...MORADA, nome: "atacante@evil.test", complemento: "outro@evil.test" } });
console.log("\nS2 (sem campo email, e-mail 'escondido' na morada) status:", res.status,
  "| enviados:", ENVIADOS.length, "(0 = o servidor não inventa destino)");
console.log("S2 Nota Técnica com nome e-mail-like (é NOME, não destino):",
  /atacante@evil\.test/.test(ENVIADOS[0]?.mensagem ?? "") ? "aparece no NOME — ok" : "n/a");

// ══ S3 — o destino é literalmente o do corpo? (o desvio declarado, medido) ═══════════════════════
resetar();
res = await post({ email: "o-que-o-cliente-disser@example.com" });
console.log("\nS3 destino == campo do CORPO (não do JWT, que não tem e-mail):",
  ENVIADOS[0].para === "o-que-o-cliente-disser@example.com");

// ══ S4 — o porteiro do e-mail: sem e-mail não se envia; com e-mail inválido → 400 e nada debita ══
resetar();
const semEmail = await post({});
console.log("\nS4 sem email → status", semEmail.status, "| enviados", ENVIADOS.length);
resetar();
const invalido = await post({ email: "sem-arroba" });
console.log("S4 email inválido → status", invalido.status, "| code", (await invalido.json()).error?.code,
  "| resgates", RESGATES.length, "| pontos", pontosLinha.pontos);
