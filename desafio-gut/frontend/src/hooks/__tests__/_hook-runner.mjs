// _hook-runner.mjs — MC94. Condutor mínimo de hooks, sem DOM e sem dependências.
//
// PORQUÊ ESTE FICHEIRO EXISTE
// A validação independente do MC94 exigiu testar `useRanking`/`useFeedback` com um
// duplo de rede: 401, 403, `ok:false`, abort e mudança de `cicloId`. Toda essa
// lógica vive DENTRO de um `useEffect` — e o arnês de renderização (`_render.mjs`)
// usa `renderToStaticMarkup`, onde o `useEffect` **nunca corre**. Medido:
//
//   jsdom · linkedom · happy-dom · react-test-renderer · @testing-library/react
//   -> AUSENTES (todos). `react-dom/client` precisa de DOM. Node 24 não tem.
//
// E instalar um deles cai no ciclo que o MC93-G mediu: `npm install
// --legacy-peer-deps` (o que o `netlify.toml:3` corre) reverte o
// `package-lock.json` a byte-idêntico, em silêncio.
//
// COMO FUNCIONA
// Os hooks importam `useState`/`useEffect` de "react", e essas funções despacham
// para `ReactCurrentDispatcher.current`. Este ficheiro instala aí um despachante
// próprio e chama a função-hook directamente. Logo o código EXERCITADO é o do
// projeto, sem alterações: a ordem das chamadas, o corpo do efeito, o `AbortController`,
// o array de dependências e a função de limpeza são os reais.
//
// ⚠️ O LIMITE, declarado em vez de escondido: a COMPARAÇÃO de dependências e o
// agendamento do re-render são implementados aqui, não pelo React. Um erro meu
// nesta comparação daria verde a um hook com deps erradas. É por isso que o
// ficheiro de teste inclui CONTROLOS POSITIVOS — hooks deliberadamente partidos
// (deps `[]`, sem limpeza) que o condutor TEM de reprovar. Se algum deles passar,
// o instrumento é cego e a suíte não vale nada.
// (Regra do projeto: "sonda precisa de controlo positivo".)
//
// ⚠️ NÃO implementa: Suspense, transições, concorrência, refs de DOM, contexto com
// Provider (o `useContext` devolve o valor por omissão). Nenhum é usado por estes
// dois hooks.

import React from "react";

const INTERNOS = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
if (!INTERNOS?.ReactCurrentDispatcher) {
  throw new Error(
    "ReactCurrentDispatcher indisponível — este condutor assume React 18. "
    + `Instalado: ${React.version}`,
  );
}

/** `Object.is` elemento a elemento, com a mesma regra de comprimento do React. */
function depsIguais(anteriores, novas) {
  if (anteriores === null || novas === null) return false;
  if (anteriores.length !== novas.length) return false;
  for (let i = 0; i < novas.length; i += 1) {
    if (!Object.is(anteriores[i], novas[i])) return false;
  }
  return true;
}

/**
 * Monta uma função-hook e devolve um controlador.
 *
 * @param {Function} hook a função a exercitar (ex.: `useRanking`)
 * @param {Array<unknown>} [args] argumentos da primeira renderização
 * @returns {{
 *   resultado: () => unknown,
 *   renderizacoes: () => number,
 *   actualizar: (args?: Array<unknown>) => Promise<void>,
 *   assentar: () => Promise<void>,
 *   desmontar: () => Promise<void>,
 * }}
 */
export function montar(hook, args = []) {
  /** @type {Array<{estado: unknown, setter: Function}>} */
  const estados = [];
  /** @type {Array<{deps: Array<unknown>|null, limpeza: Function|undefined, efeito: Function|null}>} */
  const efeitos = [];
  /** @type {Array<{deps: Array<unknown>|null, valor: unknown}>} */
  const memos = [];
  const refs = [];

  let argsActuais = args;
  let indiceEstado = 0;
  let indiceEfeito = 0;
  let indiceMemo = 0;
  let indiceRef = 0;
  let resultado;
  let renderizacoes = 0;
  let desmontado = false;
  let rerenderPendente = null;
  /** Escritas de estado que chegaram DEPOIS do desmonte — a fuga que se procura. */
  const tardias = [];

  function agendarRerender() {
    if (desmontado) return;
    // Um microtask, como o React agrupa actualizações fora de eventos. Várias
    // chamadas a `setEstado` na mesma volta dão UMA renderização.
    if (rerenderPendente !== null) return;
    rerenderPendente = Promise.resolve().then(() => {
      rerenderPendente = null;
      if (!desmontado) renderizar();
    });
  }

  const despachante = {
    useState(inicial) {
      const i = indiceEstado;
      indiceEstado += 1;
      if (estados.length <= i) {
        const slot = {
          estado: typeof inicial === "function" ? inicial() : inicial,
          setter: (proximo) => {
            const valor = typeof proximo === "function" ? proximo(slot.estado) : proximo;
            // ⚠️ UMA ESCRITA DEPOIS DO DESMONTE É REGISTADA, NÃO ENGOLIDA.
            // A primeira versão do condutor saía em `agendarRerender` com
            // `if (desmontado) return`, e portanto `resultado()` NUNCA podia
            // reflectir um `setEstado` tardio: duas asserções de "não escreveu
            // depois de desmontar" eram vácuas — não podiam falhar — e um mutante
            // que removesse a guarda `if (!vivo) return` do hook sobrevivia à
            // suíte inteira. Achado da 2.ª validação independente.
            // O React também não re-renderiza um componente desmontado; o que
            // estava errado era o instrumento não deixar VER a fuga. Agora regista.
            if (desmontado) {
              tardias.push(valor);
              return;
            }
            // Bail-out do React: mesmo valor não re-renderiza. Sem isto, um hook
            // que escreve o mesmo objecto a cada resposta entraria em ciclo
            // infinito AQUI e não em produção — falso defeito.
            if (Object.is(valor, slot.estado)) return;
            slot.estado = valor;
            agendarRerender();
          },
        };
        estados.push(slot);
      }
      return [estados[i].estado, estados[i].setter];
    },
    useReducer(redutor, inicial) {
      const [estado, set] = despachante.useState(inicial);
      return [estado, (accao) => set((a) => redutor(a, accao))];
    },
    useEffect(efeito, deps) {
      const i = indiceEfeito;
      indiceEfeito += 1;
      const novasDeps = deps === undefined ? null : deps;
      if (efeitos.length <= i) {
        efeitos.push({ deps: novasDeps, limpeza: undefined, efeito });
        return;
      }
      const anterior = efeitos[i];
      // `deps === undefined` (sem array) corre sempre, como no React.
      if (novasDeps === null || !depsIguais(anterior.deps, novasDeps)) {
        anterior.deps = novasDeps;
        anterior.efeito = efeito;
      } else {
        anterior.efeito = null; // nada a correr nesta volta
      }
    },
    useMemo(fabrica, deps) {
      const i = indiceMemo;
      indiceMemo += 1;
      const novasDeps = deps === undefined ? null : deps;
      if (memos.length <= i || novasDeps === null || !depsIguais(memos[i].deps, novasDeps)) {
        const valor = fabrica();
        memos[i] = { deps: novasDeps, valor };
      }
      return memos[i].valor;
    },
    useRef(inicial) {
      const i = indiceRef;
      indiceRef += 1;
      if (refs.length <= i) refs.push({ current: inicial });
      return refs[i];
    },
    useContext(contexto) {
      return contexto?._currentValue;
    },
    useDebugValue() {},
    useId: () => "teste",
  };
  despachante.useCallback = (fn, deps) => despachante.useMemo(() => fn, deps);
  despachante.useLayoutEffect = despachante.useEffect;
  despachante.useInsertionEffect = despachante.useEffect;

  function correrEfeitos() {
    for (const e of efeitos) {
      if (e.efeito === null) continue;
      const aCorrer = e.efeito;
      e.efeito = null;
      if (typeof e.limpeza === "function") e.limpeza();
      const devolvido = aCorrer();
      e.limpeza = typeof devolvido === "function" ? devolvido : undefined;
    }
  }

  function renderizar() {
    indiceEstado = 0;
    indiceEfeito = 0;
    indiceMemo = 0;
    indiceRef = 0;
    const anterior = INTERNOS.ReactCurrentDispatcher.current;
    INTERNOS.ReactCurrentDispatcher.current = despachante;
    try {
      resultado = hook(...argsActuais);
      renderizacoes += 1;
    } finally {
      INTERNOS.ReactCurrentDispatcher.current = anterior;
    }
    correrEfeitos();
  }

  /**
   * Deixa assentar: esgota microtasks E macrotasks até não haver re-render
   * pendente. Sem isto, uma resposta de rede que chega num `await` fica a meio.
   */
  async function assentar() {
    for (let i = 0; i < 24; i += 1) {
      await new Promise((r) => setTimeout(r, 0));
      if (rerenderPendente === null) {
        // Uma volta extra: um efeito pode ter agendado outro.
        await new Promise((r) => setTimeout(r, 0));
        if (rerenderPendente === null) return;
      }
    }
    throw new Error("o hook não estabilizou em 24 voltas (ciclo de renderização?)");
  }

  renderizar();

  return {
    resultado: () => resultado,
    renderizacoes: () => renderizacoes,
    /** Escritas de estado ocorridas depois de `desmontar()`. Deve ser vazio. */
    tardias: () => tardias.slice(),
    async actualizar(novosArgs) {
      if (novosArgs !== undefined) argsActuais = novosArgs;
      renderizar();
      await assentar();
    },
    assentar,
    async desmontar() {
      desmontado = true;
      for (const e of efeitos) {
        if (typeof e.limpeza === "function") e.limpeza();
        e.limpeza = undefined;
      }
      // Dá uma volta para que qualquer `setEstado` tardio (o defeito que se quer
      // apanhar) tenha oportunidade de acontecer e ser observado.
      await new Promise((r) => setTimeout(r, 0));
    },
  };
}

/**
 * Duplo de `fetch` global — para exercitar o `apiGet` REAL.
 *
 * ⚠️ De propósito NÃO se faz duplo de `apiGet`. O projeto já pagou duas vezes por
 * duplos permissivos (MC93-B: mock que ignorava o argumento deu verde a um endpoint
 * avariado a 100%; MC93-C: duplo que aceitava `.eq(col,null)`). Substituindo só o
 * `fetch`, o que corre é o `apiGet` de `src/lib/api.js`: a montagem do
 * `Authorization: Bearer`, o `BASE = "/.netlify/functions/"`, a leitura do corpo
 * UMA vez e o mapeamento de `{ok, status, data, text, headers}`. Se o contrato
 * desse helper mudar, estes testes vêem.
 *
 * @param {(url: string, opts: object) => (object|Promise<object>)} responder
 *   devolve `{ status?, corpo?, json?, demora?, aposResposta? }` ou lança.
 *
 * ⚠️ `aposResposta` corre no instante em que a resposta JÁ EXISTE e ainda não foi
 * lida pelo chamador. É a única forma de exprimir a janela que a guarda `vivo` dos
 * hooks existe para travar: a resposta chegou, e SÓ DEPOIS o componente desmontou —
 * altura em que o `abort` já não desfaz nada, porque não há nada em voo. Sem isto,
 * qualquer teste de desmonte usava respostas lentas, o `abort` rejeitava-as, o
 * `catch` do `AbortError` tratava tudo, e um mutante que removesse a guarda
 * sobrevivia à suíte inteira. Achado da 2.ª validação independente — e a primeira
 * tentativa de teste que eu escrevi para ele TAMBÉM não o matava, pela mesma razão.
 * @returns {{chamadas: Array<{url: string, headers: object, signal: AbortSignal|undefined}>, restaurar: () => void}}
 */
export function duploDeFetch(responder) {
  const original = globalThis.fetch;
  const chamadas = [];

  globalThis.fetch = async (url, opts = {}) => {
    const registo = { url: String(url), headers: opts.headers ?? {}, signal: opts.signal };
    chamadas.push(registo);
    const r = (await responder(String(url), opts, chamadas.length - 1)) ?? {};

    if (r.demora) {
      await new Promise((resolve, reject) => {
        const temporizador = setTimeout(resolve, r.demora);
        // Um `fetch` real rejeita com AbortError quando o sinal dispara. Um duplo
        // que ignore o sinal esconderia exactamente o defeito que se procura.
        opts.signal?.addEventListener("abort", () => {
          clearTimeout(temporizador);
          const erro = new Error("The operation was aborted.");
          erro.name = "AbortError";
          reject(erro);
        });
      });
    }
    if (opts.signal?.aborted) {
      const erro = new Error("The operation was aborted.");
      erro.name = "AbortError";
      throw erro;
    }

    // A resposta existe a partir daqui. O que acontecer agora acontece DEPOIS de
    // o pedido ter sido bem-sucedido — um `abort` a esta altura já não o desfaz.
    if (typeof r.aposResposta === "function") await r.aposResposta();

    const texto = r.corpo !== undefined
      ? r.corpo
      : (r.json !== undefined ? JSON.stringify(r.json) : "");
    const status = r.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Map(),
      text: async () => texto,
    };
  };

  return { chamadas, restaurar: () => { globalThis.fetch = original; } };
}
