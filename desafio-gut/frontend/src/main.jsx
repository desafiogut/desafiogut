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
const PRIVY_APP_ID_RAW = "cmo51f3v300l90clgzksivvad";

// Sanity check anti-whitespace/zero-width sneaky chars.
// Strip de \s + zero-width space (U+200B), zero-width non-joiner (U+200C),
// zero-width joiner (U+200D), BOM (U+FEFF). Garante que typo invisível nunca
// degrade o appId em runtime.
const PRIVY_APP_ID = PRIVY_APP_ID_RAW.replace(
  /[\s​‌‍﻿]/g, ""
);
if (PRIVY_APP_ID !== PRIVY_APP_ID_RAW) {
  console.error("[GUT-DEBUG] PRIVY_APP_ID continha caracteres invisíveis", {
    raw: JSON.stringify(PRIVY_APP_ID_RAW),
    cleaned: JSON.stringify(PRIVY_APP_ID),
  });
}
if (!/^[a-z0-9]{20,30}$/.test(PRIVY_APP_ID)) {
  console.error("[GUT-DEBUG] PRIVY_APP_ID não bate com [a-z0-9]{20,30}", PRIVY_APP_ID);
}

// ── Instrumentação verbosa — captura falhas do Privy/CSP ────────────────────
// Imprime QUALQUER erro/rejeição não tratada com tag [GUT-DEBUG] para que o
// usuário consiga colar o erro completo do console quando o modal trava.
if (typeof window !== "undefined") {
  window.__GUT_DEBUG__ = {
    appId: PRIVY_APP_ID,
    appIdLen: PRIVY_APP_ID.length,
    origin: window.location.origin,
    href:   window.location.href,
    sepoliaChainId: sepoliaChain?.id,
    sepoliaName:    sepoliaChain?.name,
    bundleBuiltAt:  new Date().toISOString(),
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

  // Captura QUALQUER violação CSP (frame-ancestors, frame-src, script-src…)
  // com o detalhe que o erro do console esconde.
  document.addEventListener("securitypolicyviolation", (ev) => {
    console.error("[GUT-DEBUG] CSP violation", {
      directive:    ev.violatedDirective,
      effective:    ev.effectiveDirective,
      blockedURI:   ev.blockedURI,
      documentURI:  ev.documentURI,
      sourceFile:   ev.sourceFile,
      lineNumber:   ev.lineNumber,
      sample:       ev.sample,
      disposition:  ev.disposition,
      originalPolicy: ev.originalPolicy?.slice(0, 200),
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
