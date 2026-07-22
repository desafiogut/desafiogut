import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  optimizeDeps: {
    include: ["@privy-io/react-auth"],
  },
  // MC11.16-T1 — Separa React em chunk próprio para quebrar dependência circular:
  //   index-chunk importa privy-chunk (PrivyProvider)
  //   privy-chunk importa React do index-chunk → CICLO → TDZ
  // Com React em chunk separado (react-chunk), o grafo fica acíclico:
  //   react-chunk (sem deps customizadas) ← privy-chunk ← index-chunk
  // Também amplia cobertura Privy para incluir @coinbase/* e deps afins.
  // MC87 (P3-2) — os ~65 console.* de src/ chegavam ao bundle de produção: o
  // index-*.js publicado tinha 14 ocorrências de "console." e 2 de "GUT-DEBUG".
  // Os dados expostos são do próprio utilizador (o seu endereço, o seu saldo), o
  // que limita o impacto — mas os logs [GUT-DEBUG] documentavam gratuitamente a
  // superfície de API e os fluxos de autenticação para quem quisesse atacá-los.
  //
  // `console.error` e `console.warn` FICAM: alimentam o Sentry e os relatos de
  // suporte. Só saem os informativos (log/info/debug/trace), que são ruído em prod.
  esbuild: {
    pure: ["console.log", "console.info", "console.debug", "console.trace"],
  },
  build: {
    rollupOptions: {
      output: {
        // MC82.2 — advancedChunks (API nativa do Rolldown, que é o bundler do
        // Vite 8). O `manualChunks` abaixo era silenciosamente ignorado para o
        // React: a função devolvia "react" para react/react-dom/scheduler
        // (verificado por log), mas o Rolldown mantinha-os dentro do chunk
        // `privy`, deixando `react-*.js` com 0,2 KB — um shim que reimportava do
        // privy. Consequência: qualquer ecrã, incluindo o gate LGPD, tinha de
        // descarregar 2.745 KB só para ter React, e o lazy-load do Privy não
        // produzia ganho nenhum. A ordem dos grupos define a prioridade.
        advancedChunks: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            // react-router e Sentry são usados pelo ARRANQUE (main.jsx/Boot.jsx).
            // Sem grupo próprio acabavam dentro do chunk `privy`, obrigando o
            // index a importá-lo estaticamente — o que anulava o lazy-load.
            { name: "router", test: /node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/ },
            { name: "sentry", test: /node_modules[\\/]@sentry/ },
            // motion vem ANTES do privy: é usado pelo gate (Modal,
            // BackgroundCanvas) e não pode acabar preso ao chunk do Privy.
            { name: "motion", test: /node_modules[\\/]framer-motion[\\/]/ },
            { name: "privy", test: /node_modules[\\/](@privy-io|@coinbase)/ },
          ],
        },
        manualChunks(id) {
          // MC82.2 — normaliza o id ANTES de testar. Os módulos CJS do React
          // (react-dom/cjs/*.js) passam pelo plugin CommonJS e chegam aqui com
          // prefixo "\0" e/ou sufixo de query (?commonjs-module), pelo que um
          // `id.includes("node_modules/react-dom/")` cru não os apanhava — o
          // React acabava dentro do chunk `privy` e o chunk `react` ficava com
          // 0,2 KB (um mero shim que reimportava do privy). Efeito prático: o
          // gate LGPD tinha de descarregar 2.745 KB só para ter React.
          const norm = id.replace(/\0/g, "").replace(/\\/g, "/").split("?")[0];

          // React core (+ scheduler que é peer dep do react-dom) → chunk isolado
          if (/node_modules\/(react|react-dom|scheduler)\//.test(norm))
            return "react";
          // Privy SDK + dependências Coinbase/WalletConnect → chunk isolado
          if (
            norm.includes("node_modules/@privy-io") ||
            norm.includes("node_modules/@coinbase")
          )
            return "privy";
          // MC39.19 (Onda 2, item 2) — framer-motion (usado em ~17 componentes) → chunk
          // próprio, fora do chunk `index` do caminho crítico. NÃO super-fragmentar:
          // um único chunk "motion" (vite-patterns). @xenova/transformers NÃO entra
          // (é backend-only, ausente do bundle do cliente); ethers/viem ficam com privy
          // por entrelaçamento (evita ciclo TDZ, ver nota acima).
          if (norm.includes("node_modules/framer-motion"))
            return "motion";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // MC11.16 — alias para shim da dep opcional `@farcaster/mini-app-solana`
      // que o Privy SDK referencia mas não usamos. Evita throw em runtime.
      "@farcaster/mini-app-solana": path.resolve(
        __dirname,
        "./src/shims/farcaster-mini-app-solana.js",
      ),
    },
  },
  server: {
    port: 3000,
    // Vite 8: desativa o forwardConsole. Por default ele envolve console.error/warn
    // e registra listeners globais de error/unhandledrejection que chamam ws.send()
    // sem checar readyState. Como main.jsx loga via console na inicialização (antes
    // do handshake do HMR) e dentro de handlers de erro, isso lança recursivamente
    // "Cannot read properties of undefined (reading 'send')" e inunda o console.
    forwardConsole: false,
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://privy.io https://*.privy.io; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://privy.io https://*.privy.io; frame-src https://privy.io https://*.privy.io https://accounts.google.com; connect-src 'self' http://127.0.0.1:8545 https://privy.io https://*.privy.io wss://*.privy.io https://auth.privy.io https://telemetry.privy.io https://api.privy.io https://eth-sepolia.g.alchemy.com https://rpc.sepolia.org; worker-src blob:; object-src 'none'; base-uri 'self';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
