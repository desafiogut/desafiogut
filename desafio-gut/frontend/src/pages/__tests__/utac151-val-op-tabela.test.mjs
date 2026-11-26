// utac151-val-op-tabela.test.mjs — UTAC151-val (SEG4). A OP passou a desenhar a `TabelaLances` (variante «palpite»).
// ⚠️1 medido: o «Prazo:» e o selo saíam do `getEstadoEdicao({id})` da TabelaLances (trava EM_BREVE global) em vez do
// `estadoEdicaoProgramada` (UTAC149) que a `TabelaPalpites` antiga usava. Arnês copiado do utac149-val.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "../../__tests__/_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..", "..");
const STUBS_106C = resolve(SRC, "__tests__", "_stubs-106c");
const STUBS_106E = resolve(AQUI, "..", "__tests__", "_stubs-106e");
const STUB_CONTEXTO = resolve(AQUI, "_stubs", "AppContext.jsx");
const ALIASES = [
  // UTAC151 — a OP passou a desenhar a `TabelaLances` (sanitize.js → DOMPurify, cujo UMD não sobrevive ao SSR do Vite).
  { find: /^dompurify$/, replacement: resolve(AQUI, "../../components/__tests__/_stubs/dompurify.js") },
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: STUB_CONTEXTO },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_106E}/useTrocarPorSenhas.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
  { find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: resolve(AQUI, "_stubs", "leilaoLock.js") },
  { find: /^\.\.\/hooks\/useIsMobile\.js$/, replacement: resolve(AQUI, "_stubs-109g", "useIsMobile.js") },
  // UTAC151-val — o `usePalpite` importa `getIdentityToken` dinamicamente; duplo controlável.
  { find: /^@privy-io\/react-auth$/, replacement: resolve(AQUI, "_stubs-151val", "privy.js") },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, OP, definirEmBreve, definirMobile, getEstadoEdicao, usePalpite, definirIdentidade;
before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({ ...opcoesServidorTeste({ alias: ALIASES }), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  OP = (await vite.ssrLoadModule("/src/pages/OfertasProgramadas.jsx")).default;
  ({ definirEmBreve } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/leilaoLock.js"));
  ({ definirMobile } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs-109g/useIsMobile.js"));
  ({ getEstadoEdicao } = await vite.ssrLoadModule("/src/utils/edicao.js"));
  ({ usePalpite } = await vite.ssrLoadModule("/src/hooks/usePalpite.js"));
  ({ definirIdentidade } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs-151val/privy.js"));
});
after(async () => { definirEmBreve?.(true); definirMobile?.(false); if (vite) await vite.close(); });

const A = "0xAbC1230000000000000000000000000000004567";
const B = "0xBbB0000000000000000000000000000000009999";
const PROG = { "PROG-7": { id: "PROG-7", tipo: "programado", status: "aberto", produto: "Air Fryer", termino_em: "2030-12-31T00:00:00.000Z" } };
const LEITURA = { ok: true, pontos: 7, pontosCartao: 7, bonusPalpite: 0, pontosParaCartao: 50, podeResgatarCartao: false, historico: [], palpites: [] };
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const codigo = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");

async function render({ edicoes = PROG, palpites = { ok: true, revelado: false, palpites: [] }, mobile = false, pendente = false, leitura = LEITURA } = {}) {
  definirMobile(mobile);
  definirContexto({
    isConnected: true, address: A, user: null, authToken: "AUTH-151val", userLabel: "T", edicoes, ready: true,
    refetchSaldo: () => {}, saldoRsCentavos: 0, saldoRsStatus: "ok", refetchSaldoRs: () => {}, setModalidade: () => {},
    privyWallet: null, abrirModal: () => {},
  });
  const dup = duploDeFetch((url) => (url.includes("/ler-palpites?") ? { status: 200, json: palpites }
    : pendente ? { demora: 60000, status: 200, json: leitura } : { status: 200, json: leitura }));
  const ctrl = montar(OP, []);
  if (!pendente) await ctrl.assentar();
  const h = renderToStaticMarkup(React.createElement(React.Fragment, null, ctrl.resultado()));
  return { h, t: semTags(h), fim: () => { ctrl.desmontar(); dup.restaurar(); definirMobile(false); } };
}
// UTAC151 — a tabela (TabelaLances, variante «palpite») subiu para logo abaixo do cartão: fatia-se só a SUA secção.
const tabelaDe = (h) => { const i = h.indexOf('data-testid="op-tabela-fim"'); return h.slice(i, h.indexOf("</section>", i)); };

const iso = (ms) => new Date(ms).toISOString();
const DIA = 86_400_000;
const especial = (extra = {}) => ({ "ESPECIAL-PALPITE1": {
  id: "ESPECIAL-PALPITE1", tipo: "programado", status: "aberto", produto: "Air Fryer Palpite",
  inicio_em: iso(Date.now() - DIA), termino_em: iso(Date.now() + 13 * DIA), imagem_url: "x.jpg", ...extra } });
const cabecalho = (h) => { const t = semTags(tabelaDe(h)); const i = t.indexOf("📋"); return t.slice(i, t.indexOf("📭") > i ? t.indexOf("📭") : i + 200); };

test("V1 · especial Programada com EM BREVE ligado: a tabela mostra «Prazo: <termino_em>» (como a TabelaPalpites do UTAC149)", async () => {
  definirEmBreve(true);
  const v = await render({ edicoes: especial() });
  try {
    const c = cabecalho(v.h);
    assert.match(c, /Prazo: \d{2}\/\d{2}\/\d{4}/, `sem o prazo da especial: «${c}»`);
    assert.match(c, /🟢 Aberta/);
  } finally { v.fim(); }
});

test("V2 · controlo MC88.43: PROG-N com EM BREVE continua SEM «Prazo:» e com «🕒 Em breve»", async () => {
  definirEmBreve(true);
  const v = await render();
  try {
    const c = cabecalho(v.h);
    assert.doesNotMatch(c, /Prazo:/);
    assert.match(c, /🕒 Em breve/);
  } finally { v.fim(); }
});

for (const emBreve of [true, false]) {
  test(`V3 · sem edição (EM BREVE ${emBreve ? "ligado" : "desligado"}): «📋 Palpites» sem selo e sem prazo (o cartão diz «SEM EDIÇÃO»)`, async () => {
    definirEmBreve(emBreve);
    try {
      const v = await render({ edicoes: {} });
      try {
        const c = cabecalho(v.h);
        assert.match(c, /📋 Palpites/);
        assert.doesNotMatch(c, /Prazo:/, `prazo sem edição: «${c}»`);
        assert.doesNotMatch(c, /Em breve|Ativ|Aberta|Encerrada/, `selo sem edição: «${c}»`);
      } finally { v.fim(); }
    } finally { definirEmBreve(true); }
  });
}

test("V4 · «Seu palpite: N lances» aparece UMA vez e FORA do carrossel dos cartões (R18-151-C), antes da tabela", async () => {
  const leitura = { ...LEITURA, palpites: [{ edicaoId: "PROG-7", valor: 120 }] };
  const v = await render({ leitura });
  try {
    assert.equal((v.t.match(/Seu palpite: 120 lances/g) || []).length, 1, "o «Seu palpite» repetiu-se (voltou ao cartão?)");
    const iScroll = v.h.indexOf('data-testid="op-edicoes-scroll"');
    const iMeu = v.h.indexOf('data-testid="op-meu-palpite"');
    assert.ok(iScroll > 0 && iMeu > iScroll, "o «Seu palpite» tem de vir depois do carrossel");
    const entre = v.h.slice(iScroll, iMeu);
    const profundidade = (entre.match(/<div\b/g) || []).length - (entre.match(/<\/div>/g) || []).length;
    assert.ok(profundidade <= 0, `o «Seu palpite» está DENTRO do carrossel/cartão (profundidade ${profundidade})`);
    assert.ok(iMeu < v.h.indexOf('data-testid="op-tabela-fim"'), "o «Seu palpite» tem de vir antes da tabela");
  } finally { v.fim(); }
});

test("V5 · Início: o vidro «🎫 Programada» já não escreve «Seu palpite: N lances» (R18-151-C; fica a pílula)", () => {
  const dash = codigo("pages/Dashboard.jsx").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(dash, /Seu palpite:\s*\{/, "o «Seu palpite: N lances» voltou ao cartão do Início");
});

async function palpitarCom(identidade) {
  definirIdentidade(identidade);
  definirContexto({ isConnected: true, address: A, authToken: "AUTH-151val", edicoes: PROG, ready: true });
  let corpo = null;
  const dup = duploDeFetch((url, opts) => {
    if (url.includes("registar-palpite")) { corpo = JSON.parse(String(opts?.body ?? "{}")); return { status: 201, json: { ok: true, idempotent: false, palpite: { edicaoId: "ESPECIAL-PALPITE1", valor: 120 } } }; }
    return { status: 200, json: LEITURA };
  });
  const ctrl = montar(usePalpite, ["ESPECIAL-PALPITE1"]);
  try { await ctrl.assentar(); const r = await ctrl.resultado().registar(120); await ctrl.assentar(); return { r, corpo }; }
  finally { ctrl.desmontar(); dup.restaurar(); definirIdentidade(async () => null); }
}

test("V6 · usePalpite envia o identity token do Privy no corpo (é ele que dá «PrimeiroNome I.» ao servidor; R18-151-A)", async () => {
  const { r, corpo } = await palpitarCom(async () => "IDTOKEN.151.val");
  assert.equal(r.ok, true);
  assert.deepEqual(corpo, { edicaoId: "ESPECIAL-PALPITE1", valor: 120, identityToken: "IDTOKEN.151.val" });
});

test("V7 · sem identity token (null ou o SDK a lançar) o palpite segue na mesma, sem o campo (best-effort)", async () => {
  for (const idt of [async () => null, async () => { throw new Error("privy não pronto"); }]) {
    const { r, corpo } = await palpitarCom(idt);
    assert.equal(r.ok, true);
    assert.deepEqual(corpo, { edicaoId: "ESPECIAL-PALPITE1", valor: 120 });
  }
});
