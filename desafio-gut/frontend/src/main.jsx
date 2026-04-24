import "./globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia as sepoliaChain } from "viem/chains"; // viem instalado como dep do Privy
import App from "./App.jsx";

/**
 * PRIVY_APP_ID — credencial pública de frontend (semelhante ao Firebase API Key).
 * É seguro estar no bundle; a segurança do Privy baseia-se em Allowed Origins,
 * não em manter o App ID secreto.
 *
 * Fallback garante que o SDK sempre inicializa, mesmo que a env var seja omitida
 * no painel Netlify ou num build local sem .env.local.
 */
const PRIVY_APP_ID =
  import.meta.env.VITE_PRIVY_APP_ID ?? "cmo51f3v300l90clgzksivvad";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          // ── Métodos de login ─────────────────────────────────────────────────
          loginMethods: ["google", "email", "apple"],

          // ── Embedded Wallet criado automaticamente para todos os usuários ───
          embeddedWallets: {
            createOnLogin: "all-users",
            noPromptOnSignature: false,
          },

          // ── Rede padrão: Sepolia Testnet ─────────────────────────────────────
          defaultChain: sepoliaChain,
          supportedChains: [sepoliaChain],

          // ── Aparência alinhada ao design DESAFIOGUT ──────────────────────────
          appearance: {
            theme: "dark",
            accentColor: "#00d4aa",
            logo: "/favicon.ico",
            showWalletLoginFirst: false,
            walletList: ["metamask", "coinbase_wallet"],
          },
        }}
      >
        <App />
      </PrivyProvider>
    </BrowserRouter>
  </StrictMode>
);
