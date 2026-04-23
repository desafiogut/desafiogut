import "./globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia as sepoliaChain } from "viem/chains"; // viem instalado como dep do Privy
import App from "./App.jsx";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "cmo51f3v300l90clgzksivvad";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // ── Métodos de login: Google, E-mail, Apple ──────────────────────────
        loginMethods: ["google", "email", "apple"],

        // ── Embedded Wallet: criado automaticamente para todos os usuários ──
        embeddedWallets: {
          createOnLogin: "all-users",
          noPromptOnSignature: false,
        },

        // ── Rede: Sepolia via viem/chains (definição oficial) ────────────────
        defaultChain: sepoliaChain,
        supportedChains: [sepoliaChain],

        // ── Aparência: alinhada ao design DESAFIOGUT ─────────────────────────
        appearance: {
          theme: "dark",
          accentColor: "#00d4aa",
          logo: "https://frontend-one-tawny-20.vercel.app/favicon.ico",
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
