// UTAC109d.1 — o carrossel do GUTO tem de TOCAR no 1.º carregamento da página.
//
// node --test "src/__tests__/utac109d1-carrossel-play.test.mjs"
//
// O DEFEITO (medido no Chrome, 375px e 1440px): num carregamento novo os dois <video> ficavam
// `paused:true, readyState:4, currentTime:0` para sempre. O efeito que chama `play()` dependia só de
// `[cur, reduce]`; os <video> só montam DEPOIS de `pronto` (useAposPrimeiraPintura, MC88.36) virar true,
// e nessa altura o efeito já tinha corrido sem vídeos e não voltava a correr. Consequência dupla: o GUTO
// parado E «só aparece 1 dos 8» (a troca de slide só dispara quando o vídeo activo passa a metade da
// duração — como nunca toca, nunca avança). Só animava depois de sair do Início e voltar (o sinalizador
// `jaPintou` é de MÓDULO), que foi o caso que o 109d viu no desktop.
//
// COMO SE PROVA SEM DOM: o `_hook-runner` corre o componente REAL (os seus useState/useEffect/useRef) e
// corre os efeitos logo a seguir ao render. O wrapper `comRefs` liga os refs dos <video> devolvidos ANTES
// de os efeitos correrem — a mesma ordem do commit do React (refs antes dos efeitos passivos). Os vídeos
// são duplos que só contam as chamadas a `play()`.
//
// Ordem dos testes IMPORTA: o 1.º exercita o carregamento a frio (`jaPintou` ainda false no módulo);
// o 2.º, a montagem depois de a app já ter pintado (navegação de volta ao Início).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { opcoesServidorTeste } from "./_servidor-teste.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

let vite = null;
let montar = null;
let Carrossel = null; // a função interna (o default é React.memo)

/** fila dos callbacks de requestIdleCallback — o teste decide quando a «primeira pintura» acontece */
const ociosos = [];

before(async () => {
  const { createServer } = await import(pathToFileURL(resolve(AQUI, "..", "..", "node_modules", "vite", "dist", "node", "index.js")).href);
  vite = await createServer({
    ...opcoesServidorTeste({ alias: [] }),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  await vite.ssrLoadModule("/src/__tests__/_ponte-ssr.mjs");
  ({ montar } = await vite.ssrLoadModule("/src/hooks/__tests__/_hook-runner.mjs"));
  // `window` só existe DEPOIS de carregar React/framer (o `useReducedMotion` fica em null = sem redução).
  globalThis.window = {
    requestIdleCallback: (cb) => { ociosos.push(cb); return ociosos.length; },
    cancelIdleCallback: () => {},
  };
  const mod = await vite.ssrLoadModule("/src/components/CarrosselGUTO.jsx");
  Carrossel = mod.default.type;
  assert.equal(typeof Carrossel, "function", "o default deixou de ser memo(função) — o arnês ficou cego");
});
after(async () => {
  delete globalThis.window;
  if (vite) await vite.close();
});

function elementos(raiz) {
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

/** Duplos de <video>: um por slide, persistentes entre renders (como o elemento DOM real). */
function duplos() {
  const plays = [];
  const porSlide = new Map();
  const obter = (src) => {
    if (!porSlide.has(src)) {
      porSlide.set(src, {
        src,
        currentTime: 0,
        duration: NaN,
        play() { plays.push(src); return Promise.resolve(); },
      });
    }
    return porSlide.get(src);
  };
  return { plays, obter };
}

/** Componente REAL + ligação dos refs antes dos efeitos (ordem do commit do React). */
function comRefs(d) {
  return (props) => {
    const saida = Carrossel(props);
    for (const el of elementos(saida)) {
      if (el.type === "video" && typeof el.ref === "function") el.ref(d.obter(el.props.src));
    }
    return saida;
  };
}

const videos = (ctrl) => elementos(ctrl.resultado()).filter((e) => e.type === "video");

test("controlo: antes da 1.ª pintura só há o poster (nenhum <video>), e há um callback ocioso pendente", async () => {
  // Este teste NÃO consome o callback: o seguinte usa uma montagem nova e o seu próprio callback.
  const d = duplos();
  const ctrl = montar(comRefs(d), [{}]);
  await ctrl.assentar();
  assert.equal(videos(ctrl).length, 0, "os <video> montaram antes da primeira pintura (MC88.36 revertido?)");
  assert.equal(elementos(ctrl.resultado()).filter((e) => e.type === "img").length, 1, "esperava o poster");
  assert.ok(ociosos.length >= 1, "useAposPrimeiraPintura não agendou o callback — o arnês ficou cego");
  await ctrl.desmontar();
  ociosos.length = 0;
});

test("1.º carregamento: quando os <video> montam (pronto=true), o vídeo ACTIVO recebe play()", async () => {
  const d = duplos();
  const ctrl = montar(comRefs(d), [{}]);
  await ctrl.assentar();
  assert.equal(videos(ctrl).length, 0, "pré-condição: ainda sem vídeos");
  assert.equal(ociosos.length, 1, "pré-condição: um callback ocioso por consumir");
  ociosos.shift()(); // a «primeira pintura» aconteceu
  await ctrl.assentar();
  const vs = videos(ctrl);
  assert.equal(vs.length, 2, "esperava 2 <video> (activo + próximo)");
  assert.deepEqual(
    d.plays,
    [vs[0].props.src],
    `o vídeo activo não recebeu play() ao montar — o GUTO fica parado em t=0 e o carrossel preso no slide 1 (plays=${JSON.stringify(d.plays)})`,
  );
  assert.match(vs[0].props.src, /guto-1\.webm/, "o activo devia ser o slide 1");
  await ctrl.desmontar();
});

test("depois de a app já ter pintado (voltar ao Início): toca logo na 1.ª montagem", async () => {
  const d = duplos();
  const ctrl = montar(comRefs(d), [{}]);
  await ctrl.assentar();
  const vs = videos(ctrl);
  assert.equal(vs.length, 2, "com jaPintou=true os <video> montam logo");
  assert.deepEqual(d.plays, [vs[0].props.src], "o activo devia receber exactamente um play()");
  await ctrl.desmontar();
});
