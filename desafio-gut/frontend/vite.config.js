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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core (+ scheduler que é peer dep do react-dom) → chunk isolado
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          )
            return "react";
          // Privy SDK + dependências Coinbase/WalletConnect → chunk isolado
          if (
            id.includes("node_modules/@privy-io") ||
            id.includes("node_modules/@coinbase")
          )
            return "privy";
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
