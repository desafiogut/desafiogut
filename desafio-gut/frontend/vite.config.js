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
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["@privy-io/react-auth"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3000,
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://privy.io https://*.privy.io; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://privy.io https://*.privy.io; frame-src https://privy.io https://*.privy.io https://accounts.google.com; connect-src 'self' http://127.0.0.1:8545 https://privy.io https://*.privy.io wss://*.privy.io https://auth.privy.io https://telemetry.privy.io https://api.privy.io https://eth-sepolia.g.alchemy.com https://rpc.sepolia.org; worker-src blob:; object-src 'none'; base-uri 'self';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
