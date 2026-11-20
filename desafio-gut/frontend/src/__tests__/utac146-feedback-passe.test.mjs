// UTAC146 — Frente B (ℹ️7): aviso quando o lance gasta 1 Passe Relâmpago; e Frente A (ℹ️5) do lado do app: o CardLance manda
// o identity token do Privy ao auth-lance e deixa de mandar o nome no corpo do lance.
// Arnês copiado de utac110d-front.test.mjs (CardLance REAL; Privy/web3/AppContext duplos; sem DOM — o clique chama o handler).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(AQUI, "..");
const STUBS_106C = resolve(AQUI, "_stubs-106c");
const STUBS_110D = resolve(AQUI, "_stubs-110d");
const STUBS_PAG = resolve(SRC, "pages", "__tests__", "_stubs");
const STUBS_106E = resolve(SRC, "pages", "__tests__", "_stubs-106e");

const ALIASES = [
  { find: /^\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS_PAG}/AppContext.jsx` },
  { find: /^\.\.\/\.\.\/context\/AppContext\.jsx$/, replacement: `${STUBS_PAG}/AppContext.jsx` },
  { find: /^\.\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_110D}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useTrocarPorSenhas\.js$/, replacement: `${STUBS_110D}/useTrocarPorSenhas.js` },
  { find: /^\.\.\/hooks\/useRecursosApp\.js$/, replacement: `${STUBS_PAG}/useRecursosApp.js` },
  { find: /^@privy-io\/react-auth$/, replacement: `${STUBS_110D}/privy.js` },
  { find: /^\.\.\/utils\/web3\.js$/, replacement: `${STUBS_110D}/web3.js` },
  { find: /^\.\.\/components\/ComprarFichasModal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/PainelIndicacao\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/components\/BotaoLoginPrincipal\.jsx$/, replacement: `${STUBS_106C}/child.jsx` },
  { find: /^\.\.\/\.\.\/hooks\/useAdmin\.js$/, replacement: `${STUBS_106C}/useAdmin.js` },
  { find: /^react-router-dom$/, replacement: `${STUBS_106C}/rr.jsx` },
];

let vite, React, renderToStaticMarkup, montar, duploDeFetch, definirContexto, definirIdentityToken;
let CardLance, mensagemPasseConsumido;

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(SRC, "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: ALIASES }),
    server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true },
  });
  ({ React, renderToStaticMarkup } = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs"));
  ({ montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  ({ definirContexto } = await vite.ssrLoadModule("/src/pages/__tests__/_stubs/AppContext.jsx"));
  ({ default: CardLance, mensagemPasseConsumido } = await vite.ssrLoadModule("/src/components/CardLance.jsx"));
  ({ definirIdentityToken } = await vite.ssrLoadModule(`${STUBS_110D}/privy.js`));
});
after(async () => { if (vite) await vite.close(); });

let nEndereco = 0;
/** Endereço NOVO por teste: o rate limiter do lance é por endereço e em memória (cooldown 3 s). */
const novoEndereco = () => `0x${String(++nEndereco).padStart(40, "a")}`;
const contexto = (address) => ({
  isConnected: true, abrirModal: () => {}, address, user: { email: { address: "a@b.c" } },
  refetchSaldo: () => {}, saldoRsCentavos: 1234, saldoRsStatus: "ok", refetchSaldoRs: () => {},
  saldoSenhas: 0, saldoSenhasStatus: "ok", userLabel: "Teste", authToken: "AUTH-110D",
});
const LER_PONTOS = /\/\.netlify\/functions\/ler-pontos$/;
const semTags = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// ═══ A — lib/passes.js ═══════════════════════════════════════════════════════════════
function arvore(raiz) {
  const fora = [];
  (function walk(n) {
    if (n == null || typeof n === "boolean") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    fora.push(n);
    if (n.props) walk(n.props.children);
  })(raiz);
  return fora;
}
const textoDe = (n) => n == null || typeof n === "boolean" ? ""
  : (typeof n === "string" || typeof n === "number") ? String(n)
  : Array.isArray(n) ? n.map(textoDe).join("") : n.props ? textoDe(n.props.children) : "";

/** Monta o CardLance real com um servidor duplo. `estado.pontos` é o ledger de PONTOS de lance do servidor.
 *  ⚠️ UTAC110j.5 — ALTERADO (declarado): o lance gasta PONTOS de lance pelo seu valor (backend UTAC110n).
 *  Antes: `estado.creditos`, 1 crédito por lance, 400 `sem_creditos_lance`. Agora espelha `lance-relampago.mjs`:
 *  debita o VALOR, 400 `saldo_pontos_insuficiente` com `pontosLance`/`pontosNecessarios`, 201 com
 *  `pontosLanceConsumidos`/`pontosLanceRestantes`. */
async function cardLance({ pontos, modalidade = "flash", lerFalha = false, ctx = {}, passe = null, variante }) {
  const address = novoEndereco();
  definirContexto({ ...contexto(address), ...ctx });
  const estado = { pontos, lances: 0, corpoAuth: null, corpoLance: null };
  const dup = duploDeFetch((url, opts) => {
    if (LER_PONTOS.test(url)) {
      return lerFalha ? { status: 500, json: {} }
        : { status: 200, json: { ok: true, pontos: 0, pontosCartao: 0, lance: { creditos: 0, pontos: estado.pontos, historico: [] } } };
    }
    if (/auth-lance$/.test(url)) { estado.corpoAuth = JSON.parse(opts.body); return { status: 200, json: { token: "LANCE-AUTH", ttl: 600 } }; }
    if (/lance-relampago$/.test(url)) {
      const corpo = JSON.parse(opts.body);
      estado.corpoLance = corpo;
      const v = corpo.valorCentavos;
      if (estado.pontos < v) {
        return { status: 400, json: { error: { code: "saldo_pontos_insuficiente", message: "x", pontosLance: estado.pontos, pontosNecessarios: v } } };
      }
      estado.pontos -= v; estado.lances += 1;
      return { status: 201, json: { ok: true, lanceId: `L-${estado.lances}`, edicaoId: corpo.edicaoId,
        creditoLanceConsumido: false, creditosLanceRestantes: null,
        pontosLanceConsumidos: v, pontosLanceRestantes: estado.pontos, ...(passe ?? {}) } };
    }
    return { status: 404, json: {} };
  });
  // O duplo do repo responde como o `fetch` real mas SÓ com `text()` (o `api.js` só usa isso); o
  // CardLance faz `resp.json()`. Acrescenta-se `json()` à MESMA resposta — o servidor duplo é o mesmo.
  const fetchDuplo = globalThis.fetch;
  globalThis.fetch = async (...a) => {
    const r = await fetchDuplo(...a);
    if (typeof r.json !== "function") r.json = async () => JSON.parse(await r.text());
    return r;
  };
  const restaurar = () => { globalThis.fetch = fetchDuplo; dup.restaurar(); };
  const props = { ...(variante ? { variante } : {}), idEdicao: "R-1", address, isConnected: true, encerrado: false, modalidade, onConnect: () => {}, onDisconnect: () => {} };
  const c = montar(CardLance, [props]);
  await c.assentar();
  const nos = () => arvore(c.resultado());
  // UTAC146 — na variante «embutida» o botão vive dentro do FormularioAcao (filho não expandido pelo arnês): usa-se
  // a acção que o CardLance lhe passa (`onEnviar`), exposta como `onClick` para o resto do teste ser igual.
  const botaoLance = () => {
    const f = nos().find((n) => typeof n.props?.onEnviar === "function");
    if (f) return { props: { ...f.props, onClick: f.props.onEnviar, disabled: f.props.desabilitado } };
    return nos().find((n) => n.props?.onClick && /Dar lance|Confirmar Lance|Converter/i.test(textoDe(n)));
  };
  const html = () => renderToStaticMarkup(React.createElement(React.Fragment, null, c.resultado()));
  const escrever = async (v) => {
    const input = nos().find((n) => n.type === "input") ?? nos().find((n) => typeof n.props?.onEnviar === "function");
    input.props.onChange({ target: { value: v } });
    await c.assentar();
  };
  return { c, dup, estado, botaoLance, html, escrever, fim: restaurar };
}

test("F1 · puro: passeConsumido true → «Você usou 1 Passe Relâmpago. Restam: N.»; false/ausente → nada", () => {
  assert.equal(mensagemPasseConsumido({ passeConsumido: true, passesRelampagoRestantes: 2 }), "Você usou 1 Passe Relâmpago. Restam: 2.");
  assert.equal(mensagemPasseConsumido({ passeConsumido: true, passesRelampagoRestantes: 0 }), "Você usou 1 Passe Relâmpago. Restam: 0.");
  assert.equal(mensagemPasseConsumido({ passeConsumido: true, passesRelampagoRestantes: null }), "Você usou 1 Passe Relâmpago.");
  assert.equal(mensagemPasseConsumido({ passeConsumido: false, passesRelampagoRestantes: 2 }), null);
  assert.equal(mensagemPasseConsumido({}), null);
  assert.equal(mensagemPasseConsumido({ passeConsumido: "true", passesRelampagoRestantes: 2 }), null, "só true booleano conta");
});

for (const variante of [undefined, "embutida"]) {
  const nome = variante ?? "cartao";
  test(`F2 · [${nome}] lance que GASTA Passe → toast «Restam: 2.» (role=status, aria-live=polite)`, async () => {
    const x = await cardLance({ pontos: 50, passe: { passeConsumido: true, passesRelampagoRestantes: 2 }, variante });
    try {
      await x.escrever("3");
      await x.botaoLance().props.onClick();
      await x.c.assentar();
      assert.equal(x.estado.lances, 1, "o lance não chegou ao servidor");
      const h = x.html();
      assert.match(semTags(h), /Você usou 1 Passe Relâmpago\. Restam: 2\./, `o aviso do Passe não aparece: «${semTags(h).slice(0, 300)}»`);
      assert.match(h, /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/, "o aviso não é anunciado (aria-live)");
    } finally { x.fim(); }
  });

  test(`F3 · [${nome}] lance SEM consumo → nenhum aviso de Passe`, async () => {
    const x = await cardLance({ pontos: 50, passe: { passeConsumido: false, passesRelampagoRestantes: 3 }, variante });
    try {
      await x.escrever("3");
      await x.botaoLance().props.onClick();
      await x.c.assentar();
      assert.equal(x.estado.lances, 1);
      assert.doesNotMatch(semTags(x.html()), /Passe Relâmpago\. Restam|usou 1 Passe/);
    } finally { x.fim(); }
  });
}

test("F4 · Frente A no app: o auth-lance recebe o identity token do Privy; o corpo do lance já NÃO leva o nome", async () => {
  definirIdentityToken("ID-TOKEN-PRIVY");
  const x = await cardLance({ pontos: 50 });
  try {
    await x.escrever("3");
    await x.botaoLance().props.onClick();
    await x.c.assentar();
    assert.equal(x.estado.corpoAuth?.identityToken, "ID-TOKEN-PRIVY", "o identity token não foi enviado ao auth-lance");
    assert.equal("nomeExibicao" in (x.estado.corpoLance ?? {}), false, "o corpo do lance ainda leva o nome (forjável/e-mail)");
  } finally { x.fim(); definirIdentityToken(null); }
});

test("F5 · sem identity token (opção desligada no painel), o login do lance segue normal e sem o campo", async () => {
  definirIdentityToken(null);
  const x = await cardLance({ pontos: 50 });
  try {
    await x.escrever("3");
    await x.botaoLance().props.onClick();
    await x.c.assentar();
    assert.equal(x.estado.lances, 1);
    assert.equal("identityToken" in (x.estado.corpoAuth ?? {}), false);
  } finally { x.fim(); }
});
