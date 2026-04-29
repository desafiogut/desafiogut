import "./globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia as sepoliaChain } from "viem/chains"; // viem instalado como dep do Privy
import App from "./App.jsx";

// App ID validado via Privy Management API em 2026-04-28.
// NÃO usar import.meta.env — o dashboard Netlify tem o valor ERRADO (cmo5113v)
// que sobrescreve qualquer fallback em tempo de build. Hardcode obrigatório até
// o env var VITE_PRIVY_APP_ID ser corrigido no painel Netlify para cmo51f3v.
const PRIVY_APP_ID = "cmo51f3v300l90clgzksivvad";

// ── Instrumentação Tentativa 6 — captura verbosa de falhas do Privy ──────────
// Imprime QUALQUER erro/rejeição não tratada com tag [GUT-DEBUG] para que o
// usuário consiga colar o erro completo do console quando o modal trava.
if (typeof window !== "undefined") {
  window.__GUT_DEBUG__ = {
    appId: PRIVY_APP_ID,
    origin: window.location.origin,
    href:   window.location.href,
    bundleBuiltAt: new Date().toISOString(),
  };
  console.info("[GUT-DEBUG] boot", window.__GUT_DEBUG__);

  window.addEventListener("error", (ev) => {
    console.error("[GUT-DEBUG] window.error", {
      message:  ev.message,
      source:   ev.filename,
      line:     ev.lineno,
      col:      ev.colno,
      error:    ev.error,
      errorStr: ev.error?.stack || String(ev.error),
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    console.error("[GUT-DEBUG] unhandledrejection", {
      reason:    ev.reason,
      reasonStr: ev.reason?.stack || String(ev.reason),
      message:   ev.reason?.message,
      name:      ev.reason?.name,
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      onSuccess={(user, isNewUser) => {
        console.info("[GUT-DEBUG] PrivyProvider.onSuccess", {
          isNewUser,
          userId: user?.id,
          linkedAccounts: user?.linkedAccounts?.map((a) => a.type),
        });
      }}
      config={{
        // ── Métodos de login: Google, E-mail, Apple ──────────────────────────
        loginMethods: ["google", "email"],  // Apple desabilitado no painel Privy — ativar em Settings → Login Methods

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
          logo: "https://silly-stardust-ca71bc.netlify.app/favicon.ico",
          showWalletLoginFirst: false,
          // walletList removido: causava WalletConnect bloqueado pelo CSP
          // → TypeError: Failed to fetch → ready: false permanente
        },
      }}
    >
      <App />
    </PrivyProvider>
    </BrowserRouter>
  </StrictMode>
);
