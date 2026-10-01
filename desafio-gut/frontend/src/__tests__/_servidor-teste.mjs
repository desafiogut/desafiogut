// _servidor-teste.mjs — opções do servidor Vite usado pelos TESTES de renderização.
//
// ⚠️ PORQUE ESTE FICHEIRO EXISTE (regressão medida a 2026-10-01, corrigida no fecho do UTAC105b.3):
// os testes transpilam `.jsx` pelo Vite e renderizam com `react-dom/server` importado pelo Node.
// Enquanto o servidor carregava `vite.config.js`, o `@vitejs/plugin-react` dessa config injectava
// `react`, `react-dom`, `react/jsx-runtime` e `react/jsx-dev-runtime` no `optimizeDeps.include`;
// o optimizador pré-empacotava o `react` num bundle PRÓPRIO e o componente passava a usar ESSA
// cópia — instância diferente da do Node — deixando o `ReactCurrentDispatcher` a `null`:
//     TypeError: Cannot read properties of null (reading 'useState')
// (medido: 68 falhas na suíte; A/B do mesmo ficheiro, com e sem o plugin, isolado por sonda).
//
// A correcção: `configFile: false` (o build de produção não tem nada que ver com o transporte dos
// testes) e SEM `@vitejs/plugin-react` (existe para o Fast Refresh do dev; em testes só serve de
// veneno). O JSX continua a ser transpilado pelo transform nativo do Vite. O build NÃO é afectado.
//
// Os aliases da `vite.config.js` têm de ser repetidos aqui, porque a config deixou de ser lida.
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Raiz do frontend (este ficheiro vive em `src/__tests__/`). */
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Aliases da `vite.config.js` que os testes também precisam (formato array, para concatenar). */
export const ALIASES = [
  { find: "@", replacement: path.join(RAIZ, "src") },
  { find: "@farcaster/mini-app-solana", replacement: path.join(RAIZ, "src", "shims", "farcaster-mini-app-solana.js") },
];

/**
 * Opções base de um servidor Vite para testes de renderização.
 * @param {object} [extra] opções adicionais; `alias` é CONCATENADO com `ALIASES`.
 */
export function opcoesServidorTeste(extra = {}) {
  const { alias = [], resolve, ...resto } = extra;
  return {
    root: RAIZ,
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    // ⚠️ O runner SSR do Vite avalia o React por conta própria (grafo de módulos separado do
    // `require` do Node) e o componente ficava com uma SEGUNDA instância. Externalizar força
    // a virem pelo mesmo caminho nativo do Node que o ficheiro de teste usa.
    ssr: { external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "scheduler"] },
    ...resto,
    // Uma só instância de React em TODO o grafo (sem isto, pacotes que trazem o seu próprio
    // `react` — react-router, por ex. — ficam com um dispatcher diferente do renderizador).
    resolve: { ...resolve, dedupe: ["react", "react-dom"], alias: [...ALIASES, ...alias] },
  };
}
