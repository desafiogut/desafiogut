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
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3000,
  },
  headers: {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' http://127.0.0.1:8545 https://eth-sepolia.g.alchemy.com; style-src 'self' 'unsafe-inline' https://cdn.iubenda.com;",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
});
