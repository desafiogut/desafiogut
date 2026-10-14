// UTAC110g (FRENTE B — cobertura em falta) — o HOOK do resgate: `useResgatarCartao`.
//
// PORQUE EXISTE: o endpoint `resgatar-cartao` já tinha 13 testes de servidor (`_tests/resgates.test.mjs`,
// incl. a bateria do B4: 50→201, 48+2→402, idempotência→200, CEP inválido→400, rollback, retry, exactamente
// 50, sem Bearer→401) e o ecrã 6 testes de render/clique (`utac106g-resgate.test.mjs`). Faltava medir a
// ÚNICA peça que o servidor NÃO consegue proteger: **o duplo clique no MESMO tick**. `loading` é ESTADO —
// dois `resgatar()` sem `await` entre eles leriam o valor ANTIGO e dariam DUAS chaves de idempotência
// DIFERENTES, logo dois resgates (e dois débitos de 50). A guarda é o `emCurso` (useRef) do hook.
//
// Instrumentos do PRÓPRIO repo (nenhum ficheiro de produção alterado): `_servidor-teste.mjs` +
// `_ponte-ssr.mjs` (instância única de React — regra A12) · `_hook-runner.mjs` (`montar`) ·
// `duploDeFetch` (substitui só o `fetch` global — o `apiPost` REAL corre, logo o Bearer é testado a sério).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
];

let vite, montar, duploDeFetch, definirContexto, useResgatarCartao;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ useResgatarCartao } = await vite.ssrLoadModule("/src/hooks/useResgatarCartao.js"));
});
after(async () => { if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const CONECTADO = {
  isConnected: true, abrirModal: () => {}, address: A, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  saldoSenhas: 7, saldoSenhasStatus: "ok", userLabel: "Teste", desconectar: () => {}, authToken: "AUTHCTX-110g",
};

const MORADA = {
  nome: "Maria Quildo", cpf: "11144477735", cep: "69027010", logradouro: "Rua das Flores",
  numero: "42", complemento: "", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999",
};
const URL_RESGATE = /\/\.netlify\/functions\/resgatar-cartao$/;

async function comFetch(responder, corpo) {
  const corpos = [];
  const dup = duploDeFetch((url, opts) => { corpos.push(opts?.body ? JSON.parse(opts.body) : null); return responder(url, opts); });
  try { return { r: await corpo(dup), corpos, dup }; } finally { dup.restaurar(); }
}

// ═══ A guarda de corrida — o defeito que o servidor NÃO pode apanhar ══════════════════════════════
test("HOOK · corrida no MESMO tick: 2 resgatar() sem await → SÓ 1 ida à rede (guarda `emCurso`)", async () => {
  definirContexto(CONECTADO);
  const { r, corpos, dup } = await comFetch(
    () => ({ status: 201, json: { ok: true, resgateId: 7, status: "pendente", idempotent: false, pontos: 0 } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      return await Promise.all([
        c.resultado().resgatar({ cartaoId: "cartao-familia-quildo", morada: MORADA }),
        c.resultado().resgatar({ cartaoId: "cartao-familia-quildo", morada: MORADA }),
      ]);
    },
  );
  assert.equal(dup.chamadas.length, 1, `o 2.º resgatar() do mesmo tick foi à rede: ${dup.chamadas.length} pedidos`);
  assert.equal(corpos.length, 1);
  assert.equal(r[0].ok, true);
  assert.equal(r[1].ok, false);
  assert.equal(r[1].code, "em_curso", "o 2.º clique é recusado localmente");
});

test("HOOK · 201 → ok com resgateId/status; Bearer user-session; chave NOVA por clique", async () => {
  definirContexto(CONECTADO);
  const { r, corpos, dup } = await comFetch(
    () => ({ status: 201, json: { ok: true, resgateId: 12, status: "pendente", idempotent: false, pontos: 0 } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      return await c.resultado().resgatar({ cartaoId: "cartao-familia-quildo", morada: MORADA });
    },
  );
  assert.equal(r.ok, true);
  assert.equal(r.id, 12);
  assert.equal(r.status, "pendente");
  assert.match(dup.chamadas[0].url, URL_RESGATE);
  assert.equal(dup.chamadas[0].headers.Authorization, "Bearer AUTHCTX-110g");
  assert.match(corpos[0].idempotencyKey, /^[A-Za-z0-9._:-]{8,200}$/, "a chave tem de casar a regex do servidor");
});

test("HOOK · 2 chamadas com uma chave NOVA cada (o retry do MESMO pedido é que a reusa)", async () => {
  definirContexto(CONECTADO);
  const { corpos } = await comFetch(
    () => ({ status: 201, json: { ok: true, resgateId: 1, status: "pendente" } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      await c.resultado().resgatar({ cartaoId: "c", morada: MORADA });
      await c.assentar();
      await c.resultado().resgatar({ cartaoId: "c", morada: MORADA });
    },
  );
  assert.equal(corpos.length, 2);
  assert.notEqual(corpos[0].idempotencyKey, corpos[1].idempotencyKey, "duas chamadas com a mesma chave seriam o MESMO pedido");
});

test("HOOK · 402 → mensagem do limiar, sem inventar sucesso", async () => {
  definirContexto(CONECTADO);
  const { r, dup } = await comFetch(
    () => ({ status: 402, json: { error: { code: "pontos_insuficientes" } } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      return await c.resultado().resgatar({ cartaoId: "c", morada: MORADA });
    },
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 402);
  assert.match(r.message, /50 pontos/);
  assert.equal(dup.chamadas.length, 1);
});

test("HOOK · sem sessão (authToken ausente) → erro LOCAL `sem_sessao`, 0 idas à rede", async () => {
  definirContexto({ ...CONECTADO, authToken: null });
  const { r, dup } = await comFetch(
    () => ({ status: 201, json: { ok: true } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      return await c.resultado().resgatar({ cartaoId: "c", morada: MORADA });
    },
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, "sem_sessao");
  assert.equal(dup.chamadas.length, 0, "sem token não se vai à rede");
});

// ═══ C1-email — o destino da confirmação SAI do e-mail do login (Privy) ═══════════════════════════
test("HOOK (C1-email) o e-mail do LOGIN vai no corpo — é o único destino que o sistema conhece", async () => {
  definirContexto(CONECTADO); // user.email.address = "a@b.c"
  const { corpos } = await comFetch(
    () => ({ status: 201, json: { ok: true, resgateId: 3, status: "pendente" } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      await c.resultado().resgatar({ cartaoId: "c", morada: MORADA });
    },
  );
  assert.equal(corpos[0].email, "a@b.c", "sem `email` no corpo o servidor não teria para onde enviar");
  assert.equal(typeof corpos[0].cartaoId, "string");
  assert.ok(corpos[0].morada);
});

test("HOOK (C1-email) CONTROLO NEGATIVO — sessão sem e-mail ⇒ o campo NÃO vai no corpo (resgate igual)", async () => {
  definirContexto({ ...CONECTADO, user: { google: {} } });
  const { corpos } = await comFetch(
    () => ({ status: 201, json: { ok: true, resgateId: 4, status: "pendente" } }),
    async () => {
      const c = montar(useResgatarCartao, []);
      await c.assentar();
      await c.resultado().resgatar({ cartaoId: "c", morada: MORADA });
    },
  );
  assert.equal("email" in corpos[0], false, "sem e-mail de sessão não se inventa um destino");
  assert.equal(corpos[0].idempotencyKey !== undefined, true);
});
