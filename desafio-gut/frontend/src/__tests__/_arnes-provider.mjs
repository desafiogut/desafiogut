// _arnes-provider.mjs — UTAC000.15 (DEBT-010). Arnês de RUNTIME do `AppProvider` REAL.
//
// O BURACO QUE FECHA (medido no SEG-1): o mutante M12 do validador do UTAC000.10 — texto da regra
// intacto, travessia desligada em runtime (`vencedor` sobrescrito com o local antes de ser exposto) —
// passava a suíte frontend INTEIRA (664/664): os testes do `AppContext` são de contrato (regex) e os
// das páginas usam um DUPLO do contexto. Nenhum teste corria o Provider verdadeiro.
//
// COMO FUNCIONA
//   1. Vite SSR (A12: a `_ponte-ssr.mjs` primeiro) carrega o `AppContext.jsx` REAL. Medido no SEG0: o
//      import do Privy real até funciona (41 s); o que falha é EXECUTAR — `useLocation()` fora de um
//      <Router> e, a seguir, o SDK do Privy sem o seu Provider.
//   2. Duplos SÓ nas fronteiras de I/O (por `resolve.alias`; nenhum ficheiro de produção muda):
//        @privy-io/react-auth  → `_stubs-provider/privy.js` (visitante não autenticado)
//        ../utils/web3.js      → `_stubs-provider/web3.js` (sem RPC)
//        ../lib/fingerprint.js → `_stubs-provider/fingerprint.js` (o real fica em ciclo sem DOM)
//        ../components/edicao-especial/useResultadoEspecial.js → `_stubs-provider/resultado-onchain.js`
//          (SÓ a leitura on-chain; o `useResultadoOficial.js` REAL corre — 1.º render `null`, oficial depois)
//        ../components/CardLance.jsx     → o duplo já existente (o formulário real puxa o Privy/ethers)
//        (opcional) ../lib/leilaoLock.js → `_stubs-provider/leilaoLock-aberto.js` (EM_BREVE_MODE=false)
//      O `apiGet` é o REAL: só o `fetch` global é duplo (lição do MC94: nunca duplo de `apiGet`). É
//      por ele que chegam os lances LOCAIS (`lances-flash`), pelo efeito de polling real do Provider.
//   3. O `AppProvider` corre no condutor `_hook-runner.mjs` (MC94): os `useEffect` REAIS correm, o
//      estado actualiza, o Provider re-renderiza — sem DOM. O router recebe valor pelos contextos
//      internos do react-router (como um <Router> faria), não por duplo.
//   4. A árvore que o Provider DEVOLVE (`<AppContext.Provider value>…{children}`) é renderizada em SSR
//      com a PÁGINA real como `children` ⇒ a página lê o contexto verdadeiro com o valor calculado
//      pelo código verdadeiro.
//
// ⚠️ LIMITES DECLARADOS: a comparação de deps/agendamento é do condutor (ver `_hook-runner.mjs`); o
// Privy é sempre «visitante pronto» (ramos com sessão NÃO exercitados); `window`/`document`/
// `localStorage` são globais mínimos (abaixo). Cobre o `MercadoLances` (o consumidor do `vencedor` do
// contexto); `Dashboard`/`MeusAtivos` lêem o oficial por si e ficam FORA do que este arnês prova.
// A modalidade `programado` exercita-se mudando `setModalidade` e emitindo `LanceDado` pelo duplo.

import { createServer } from "vite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { opcoesServidorTeste, ALIASES } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const STUBS = join(AQUI, "_stubs-provider");
const STUBS_PAGINAS = join(AQUI, "..", "pages", "__tests__", "_stubs");

/** Armazenamento em memória com a API do `Storage` do browser. */
function armazenamento(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

/** Instala os globais de browser que o Provider toca (medido: `grep` ao AppContext.jsx no SEG-1). */
function instalarGlobais(local = {}, sessao = {}) {
  const antes = {};
  for (const k of ["window", "document", "localStorage", "sessionStorage", "navigator"]) {
    antes[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  }
  const ouvintes = () => ({ addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
  const localStorage = armazenamento(local);
  // UTAC000.17bc (17c) — o `authToken` do Provider é hidratado do sessionStorage (`gut_auth_user`);
  // poder semeá-lo é o que permite provar o caminho AUTENTICADO (participações) no arnês.
  const sessionStorage = armazenamento(sessao);
  const window = {
    ...ouvintes(),
    location: { pathname: "/", search: "", hash: "", href: "http://localhost/", origin: "http://localhost" },
    scrollY: 0, innerWidth: 1280, innerHeight: 800,
    requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    localStorage, sessionStorage,
  };
  const document = {
    ...ouvintes(),
    visibilityState: "visible", hidden: false, referrer: "",
    documentElement: { scrollHeight: 0, clientHeight: 0, scrollTop: 0, lang: "pt-BR" },
  };
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def("window", window); def("document", document);
  def("localStorage", localStorage); def("sessionStorage", sessionStorage);
  def("navigator", { userAgent: "node-arnes-provider", language: "pt-BR" });
  return () => {
    for (const [k, d] of Object.entries(antes)) {
      if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k];
    }
  };
}

/**
 * Cria o arnês. `leilaoAberto: true` troca o `leilaoLock.js` por `EM_BREVE_MODE = false`.
 * Devolve `{ montarProvider, carregar, fechar }`.
 */
export async function criarArnes({ leilaoAberto = false } = {}) {
  const alias = [...ALIASES,
    { find: /^@privy-io\/react-auth$/, replacement: join(STUBS, "privy.js") },
    { find: /^\.\.\/utils\/web3\.js$/, replacement: join(STUBS, "web3.js") },
    // MEDIDO (SEG0): o @fingerprintjs real fica em ciclo de wait(50) sem DOM e o processo nunca termina.
    { find: /^\.\.\/lib\/fingerprint\.js$/, replacement: join(STUBS, "fingerprint.js") },
    // Resposta à ⚠️1 do validador: o hook REAL do resultado oficial corre; o duplo é só a leitura on-chain.
    { find: /^\.\.\/components\/edicao-especial\/useResultadoEspecial\.js$/, replacement: join(STUBS, "resultado-onchain.js") },
    { find: /^\.\.\/components\/CardLance\.jsx$/, replacement: join(STUBS_PAGINAS, "CardLance.jsx") },
    // Só para as PÁGINAS (o Provider não os importa) — os mesmos duplos do teste do UTAC000.10:
    // em SSR o `useRecursosApp` real fica em `isLoading` (só resolve por I/O num efeito) e o
    // `dompurify` UMD não sobrevive ao interop do Vite SSR (medido no UTAC000.9).
    { find: /^\.\.\/hooks\/useRecursosApp\.js$/, replacement: join(STUBS_PAGINAS, "useRecursosApp.js") },
    { find: /^dompurify$/, replacement: join(AQUI, "..", "components", "__tests__", "_stubs", "dompurify.js") },
  ];
  if (leilaoAberto) alias.push({ find: /^\.\.\/lib\/leilaoLock\.js$/, replacement: join(STUBS, "leilaoLock-aberto.js") });

  const vite = await createServer({
    ...opcoesServidorTeste(),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    envDir: mkdtempSync(join(tmpdir(), "utac0015-env-")), // sem VITE_* reais
    resolve: { alias },
  });
  // A ponte PRIMEIRO (A12) — fixa a instância de React do processo.
  const ponte = await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs");
  const { montar, duploDeFetch } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs");
  const rr = await vite.ssrLoadModule("/src/__tests__/_stubs-provider/rr-contextos.mjs");
  const ctx = await vite.ssrLoadModule("/src/context/AppContext.jsx");
  const oficial = await vite.ssrLoadModule(join(STUBS, "resultado-onchain.js"));
  const web3 = await vite.ssrLoadModule(join(STUBS, "web3.js"));

  /**
   * Monta o `AppProvider` REAL com `children`, deixa os efeitos reais correrem e devolve um controlo.
   * @param {object} o
   * @param {*} o.children            o que o Provider envolve (a página)
   * @param {Array} [o.lancesFlash]   o que o servidor responde em `lances-flash` (os lances LOCAIS)
   * @param {object|null} [o.resultadoOficial] `{ vencedor, menorUnicoCentavos }` consolidado on-chain (ou null)
   * @param {object} [o.localStorage] conteúdo inicial do localStorage
   */
  async function montarProvider({ children, lancesFlash = [], resultadoOficial = null, localStorage = {}, edicoes = null, participacoes = null, sessao = {} }) {
    oficial.definirOnchain(resultadoOficial);
    const repor = instalarGlobais(localStorage, sessao);
    const navegacoes = [];
    const locVal = rr.UNSAFE_LocationContext._currentValue;
    const navVal = rr.UNSAFE_NavigationContext._currentValue;
    rr.UNSAFE_LocationContext._currentValue = {
      location: { pathname: "/", search: "", hash: "", state: null, key: "default" }, navigationType: "POP",
    };
    rr.UNSAFE_NavigationContext._currentValue = {
      basename: "/", static: false, future: {},
      navigator: { push: (to) => navegacoes.push(to), replace: (to) => navegacoes.push(to), go() {}, createHref: (to) => String(to), encodeLocation: (to) => to },
    };
    const fetchDuplo = duploDeFetch((url) => {
      if (url.includes("lances-flash")) return { json: { lances: lancesFlash } };
      // UTAC000.17bc (17c) — as participações do titular (endpoint do 17a) para o overlay agregado.
      if (participacoes && url.includes("minhas-participacoes")) {
        return { json: { participacoes, total: participacoes.length, filtro: null } };
      }
      // UTAC000.17bc (GATE 23) — o arnês passa a poder servir `/edicoes` com edições REAIS (com
      // `termino_em` do servidor): é por aqui que se prova a travessia servidor → AppContext → página
      // do prazo real. Sem esta opção o arnês responde 404 e o cliente cai na edição SINTÉTICA
      // (marcada) — que por desenho já não encerra o leilão.
      if (edicoes && url.includes("edicoes")) {
        return { json: { edicoes, agendadas: {}, agora: new Date().toISOString() } };
      }
      return { status: 404, json: { code: "nao_existe_no_arnes" } };
    });
    const avisos = [];
    const [w, e] = [console.warn, console.error];
    console.warn = (...a) => avisos.push(a.map(String).join(" "));
    console.error = (...a) => avisos.push(a.map(String).join(" "));
    let c;
    let valorInicial = null;
    try {
      c = montar(ctx.AppProvider, [{ children }]);
      valorInicial = c.resultado().props.value; // o 1.º render, ANTES de qualquer efeito assentar
      await c.assentar();
      await oficial.aguardarLeituras(); // a leitura on-chain do resultado oficial é assíncrona (5 ms)
      await c.assentar();
    } catch (err) {
      console.warn = w; console.error = e;
      fetchDuplo.restaurar(); repor();
      rr.UNSAFE_LocationContext._currentValue = locVal;
      rr.UNSAFE_NavigationContext._currentValue = navVal;
      throw err;
    }
    return {
      /** A árvore que o Provider REAL devolveu na última renderização. */
      arvore: () => c.resultado(),
      /** O `value` do `AppContext.Provider` (o que as páginas recebem). */
      valor: () => c.resultado().props.value,
      /** Renderiza a árvore devolvida (com as páginas como filhas) em HTML. */
      html: () => ponte.renderToStaticMarkup(c.resultado()),
      chamadasFetch: () => fetchDuplo.chamadas.map((x) => x.url),
      /** O `value` do 1.º render (síncrono, antes dos efeitos). */
      valorInicial: () => valorInicial,
      /** Edições cujo resultado on-chain o hook REAL pediu. */
      edicoesPedidas: () => oficial.pedidosOnchain(),
      /** Emite um `LanceDado` on-chain (modalidade `programado`) e deixa assentar. */
      async emitirLanceDado(lance) { const n = web3.emitirLanceDado("R-1", lance); await c.assentar(); return n; },
      avisos: () => avisos.slice(),
      navegacoes: () => navegacoes.slice(),
      assentar: () => c.assentar(),
      async desmontar() {
        try { await c.desmontar(); } finally {
          console.warn = w; console.error = e;
          fetchDuplo.restaurar(); repor();
          rr.UNSAFE_LocationContext._currentValue = locVal;
          rr.UNSAFE_NavigationContext._currentValue = navVal;
        }
      },
    };
  }

  return {
    React: ponte.React,
    MemoryRouter: ponte.MemoryRouter,
    contexto: ctx,
    montarProvider,
    /** Carrega um módulo do projecto pelo MESMO servidor (mesma instância do contexto). */
    carregar: (caminho) => vite.ssrLoadModule(caminho),
    fechar: () => vite.close(),
  };
}
