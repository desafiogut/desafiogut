// _render.mjs — MC94. Arnês de renderização REAL para componentes .jsx.
//
// PORQUÊ ESTE FICHEIRO EXISTE
// O HARD GATE 3 do MC94 exige testes que exercitem os componentes "por
// renderização real (Testing Library ou equivalente), não por regex sobre o
// texto". Medido no SEG-1: o frontend NÃO TEM runner de testes — zero vitest,
// zero jest, zero @testing-library/react, zero jsdom, nenhum script `test`, e
// nem um único ficheiro `.test.jsx` em todo o `src/`.
//
// ⚠️ PORQUE NÃO SE INSTALOU UM RUNNER, apesar de ser o caminho óbvio:
// o MC93-G mediu que `npm install --legacy-peer-deps` — o comando que o
// `netlify.toml:3` e o `npm run build:apk` correm — REVERTE o
// `package-lock.json` do frontend a byte-idêntico, em silêncio ("up to date").
// Acrescentar devDependencies aqui entraria nesse ciclo: o lock seria revertido
// na primeira vez que alguém reproduzisse o build, e o CI voltava a partir.
// Custo alto, e desnecessário — porque já está tudo instalado para renderizar:
//
//   vite 8.1.0 (devDependency)  -> transpila o JSX
//   react-dom/server (react-dom 18.3.1) -> renderiza sem DOM
//
// MEDIDO: 33 s na primeira corrida (optimização de dependências a frio) e
// **915 ms a quente** — arranque 501 ms + 2 módulos 402 ms.
//
// ⚠️ O LIMITE, declarado em vez de escondido: em SSR o `useEffect` NÃO corre.
// Logo isto testa componentes APRESENTACIONAIS, que recebem os dados por props.
// É por isso que o I/O deste MC vive nos hooks e não nos componentes — a
// restrição do instrumento e a fronteira certa coincidem, mas foi o instrumento
// que a impôs, não o gosto.
//
// ⚠️ Os ficheiros de teste são `.test.mjs`, não `.test.jsx`: nenhum runner
// presente sabe executar JSX DENTRO de um ficheiro de teste. Os componentes
// continuam `.jsx` e são carregados através do Vite.
//
// ⚠️ CORRER A SUÍTE EM SÉRIE:
//     node --test --test-concurrency=1 src/**/__tests__/*.test.mjs
// Cada ficheiro levanta o SEU servidor Vite. Em paralelo colidem e os dois
// ficheiros falham — medido: `# fail 2` em conjunto, 23/23 e 12/12 em separado.
// Sem `--test-concurrency=1` veem-se falhas que não são dos testes.

import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

let servidor = null;

/**
 * Levanta (uma vez por processo) o servidor Vite que transpila os componentes.
 *
 * `optimizeDeps.noDiscovery` evita o varrimento de dependências, que é o que
 * custava 33 s na primeira corrida e não serve de nada em SSR.
 *
 * @returns {Promise<import("vite").ViteDevServer>}
 */
async function obterServidor() {
  if (servidor === null) {
    servidor = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
      logLevel: "error",
      optimizeDeps: { noDiscovery: true },
    });
  }
  return servidor;
}

/**
 * Carrega um componente `.jsx` pelo caminho do projeto e devolve-o.
 *
 * @param {string} caminho caminho a partir da raiz do frontend,
 *   ex.: "/src/components/meus-ativos/PainelTorneio.jsx"
 * @returns {Promise<Function>} o export default
 */
export async function carregar(caminho) {
  const vite = await obterServidor();
  const mod = await vite.ssrLoadModule(caminho);
  if (typeof mod.default !== "function") {
    throw new Error(`${caminho} não exporta um componente por default`);
  }
  return mod.default;
}

/**
 * Renderiza um componente com props e devolve o HTML.
 *
 * ⚠️ É renderização a sério: executa o corpo do componente, as props, os ramos
 * condicionais e os filhos. O que NÃO faz é correr efeitos nem eventos.
 *
 * @param {Function} Componente
 * @param {Record<string, unknown>} [props]
 * @returns {string} markup
 */
export function render(Componente, props = {}) {
  return renderToStaticMarkup(React.createElement(Componente, props));
}

/** Atalho: carrega e renderiza de uma vez. */
export async function renderizar(caminho, props = {}) {
  return render(await carregar(caminho), props);
}

/** Fecha o servidor. Chamar no `after()` de cada ficheiro de teste. */
export async function fechar() {
  if (servidor !== null) {
    await servidor.close();
    servidor = null;
  }
}

/**
 * Texto visível, sem etiquetas — para assertar o que o utilizador LÊ.
 *
 * ⚠️ Assertar sobre o HTML cru deixaria passar texto escondido dentro de
 * atributos (um `aria-label` ou um `title` a dizer o que o corpo não diz). Isto
 * remove as etiquetas primeiro, e é sobre o resultado que se afirma.
 *
 * @param {string} html
 * @returns {string}
 */
export function texto(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
