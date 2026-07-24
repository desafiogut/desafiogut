// MC82.2 — Raiz do Privy, carregada SOB DEMANDA (lazy) a partir de Boot.jsx.
//
// PORQUÊ: o gate LGPD é a primeira tela e não usa Privy para nada, mas vivia
// dentro do <PrivyProvider>. Medido no aparelho (MC82-BASELINE): 4.002 KB de JS
// para desenhar quatro checkboxes, sendo 2.745 KB só do chunk `privy`. Ao mover
// o provider (e a árvore da app inteira) para este ficheiro lazy, o gate deixa
// de pagar esse custo.
//
// ⚠️ Não bastava adiar o <PrivyProvider>: `AppContext.jsx` importa
// `@privy-io/react-auth` de forma estática e o `App.jsx` importa o AppProvider,
// portanto o chunk vinha na mesma por esse caminho. É por isso que este ficheiro
// carrega o <App/> INTEIRO, e não só o provider.
//
// Todo o conteúdo abaixo veio do main.jsx SEM alteração de lógica — o histórico
// de crashes do arranque do Privy (MC17.3.1.x, race do createWallet) tornaria
// arriscado "melhorar" qualquer coisa aqui de passagem.
import { Component } from "react";
import { PrivyProvider, useLogin, useCreateWallet } from "@privy-io/react-auth";
import { sepolia as sepoliaChain, mainnet as mainnetChain } from "viem/chains"; // viem instalado como dep do Privy
import App from "./App.jsx";

// App ID validado via Privy Management API em 2026-04-28.
// NÃO usar import.meta.env — o dashboard Netlify tem o valor ERRADO (cmo5113v)
// que sobrescreve qualquer fallback em tempo de build. Hardcode obrigatório até
// o env var VITE_PRIVY_APP_ID ser corrigido no painel Netlify para cmo51f3v.
const PRIVY_APP_ID_RAW = "cmo51f3v300l90clgzksivvad";

// Sanity check anti-whitespace/zero-width sneaky chars.
// Strip de \s + zero-width space (U+200B), zero-width non-joiner (U+200C),
// zero-width joiner (U+200D), BOM (U+FEFF). Garante que typo invisível nunca
// degrade o appId em runtime. (MC88.5.1: escrito com \u… para robustez de encoding.)
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

// Contexto de debug que depende das chains do viem (por isso vive aqui, e não no
// main.jsx: importar viem lá voltaria a puxar o chunk do Privy para o arranque).
// Os listeners globais de error/unhandledrejection/CSP continuam no main.jsx,
// para capturarem falhas desde o primeiro instante.
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
}

// MC17.3.1.2.1 — rede de segurança: se (residualmente) o crash da race do
// createWallet ainda escapar, auto-recupera com UM reload (guardado por 30s para
// nunca entrar em loop). Erros NÃO relacionados são RE-LANÇADOS intactos para o
// Sentry.ErrorBoundary acima — zero regressão no reporting/UX existente.
class PrivyCrashBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null, reloading: false }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) {
    const msg = String(err?.message || err || "");
    const race = /createWallet/i.test(msg) && /(onSuccess|undefined)/i.test(msg);
    if (!race) return; // não relacionado → render() re-lança para o Sentry boundary
    let last = 0;
    try { last = Number(sessionStorage.getItem("gut_privy_autoreload") || 0); } catch { /* sem storage */ }
    if (Date.now() - last > 30000) {
      try { sessionStorage.setItem("gut_privy_autoreload", String(Date.now())); } catch { /* sem storage */ }
      console.warn("[GUT] crash createWallet detetado — auto-reload único (MC17.3.1.2.1)");
      this.setState({ reloading: true });
      window.location.reload();
    }
    // else: loop-guard (já recarregou < 30s) → render() re-lança → Sentry fallback (sem loop)
  }
  render() {
    if (this.state.reloading) return null;
    if (this.state.err) throw this.state.err;
    return this.props.children;
  }
}

// MC17.3.1.1 → MC17.3.1.2.1 — PrivyEventsBridge.
// O crash "Cannot destructure property 'onSuccess' of 'i.createWallet' as it is
// undefined" vinha do despacho AUTOMÁTICO de createWallet (createOnLogin:"all-users"):
// no 1.º login de utilizador NOVO o SDK auto-criava a wallet e lia
// events.createWallet ANTES de o handler do useCreateWallet estar registado (race),
// rebentando o destructure. MC17.3.1.1 registou o handler (mitigou o caso comum) mas
// a race persistia no cold start (confirmado no MC17.5.1).
//
// MC17.3.1.2.1 — elimina a race na ORIGEM: createOnLogin passa a "off" (sem
// auto-criação), e a embedded wallet é criada EXPLICITAMENTE no onComplete do login,
// momento em que o useCreateWallet (e o seu onSuccess) já está montado. Como a
// chamada parte do próprio hook, NÃO há leitura de events.createWallet por um
// caminho sem handler. onComplete corre tanto no login novo como no já-autenticado
// (cobre um eventual utilizador autenticado sem wallet). Sem UI.
function temEmbeddedWallet(user) {
  if (!user) return false;
  return (user.linkedAccounts || []).some(
    (a) => a?.type === "wallet" && a?.walletClientType === "privy",
  );
}

function PrivyEventsBridge() {
  const { createWallet } = useCreateWallet({
    onSuccess: ({ wallet }) =>
      console.info("[GUT] embedded wallet criada", { address: wallet?.address }),
    onError: (error) => console.warn("[GUT] createWallet erro", error),
  });

  useLogin({
    onComplete: async ({ user, isNewUser, wasAlreadyAuthenticated }) => {
      console.info("[GUT] login completo", { isNewUser, wasAlreadyAuthenticated });
      // Criação EXPLÍCITA quando ainda não há embedded wallet. createWallet() lança
      // se o user já tiver wallet → guard + try/catch (idempotente e anti-corrida).
      if (!temEmbeddedWallet(user)) {
        try {
          await createWallet();
        } catch (err) {
          console.warn("[GUT] createWallet() no onComplete falhou (pode já existir)", err?.message);
        }
      }
    },
    onError: (error) => console.warn("[GUT] login erro", error),
  });
  return null;
}

export default function PrivyRoot() {
  return (
    <PrivyCrashBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          // ── Métodos de login: Google (modal público) + E-mail (OTP corporativo) ──
          // MC62: "apple" removido (config morta — desabilitado no painel Privy).
          // MC88.5.2: "email" RESTAURADO — é necessário para o login corporativo
          // headless (useLoginWithEmail em SejaNossoParceiro.jsx). O MODAL PÚBLICO
          // continua restrito a Google via login({loginMethods:["google"]}) em
          // AppContext.abrirModal (o OAuth App Link mobile só usa Google).
          loginMethods: ["google", "email"],

          // ── MC88.5 — OAuth em WebView nativo (Capacitor/Android) ─────────────
          // Google bloqueia OAuth dentro de WebView embutido, então o consent
          // abre no browser externo e o Privy precisa redirecionar de volta para
          // a app. Privy EXIGE um HTTPS App Link (não esquema custom): configuramos
          // customOAuthRedirectUrl para o domínio de produção, que serve o
          // /.well-known/assetlinks.json (autoVerify no AndroidManifest). O Android
          // intercepta o retorno https://…/redirect → dispara appUrlOpen → o
          // listener em App.jsx reinjeta os params privy_oauth_* na origem local.
          // No browser web puro este campo é inócuo (o fluxo popup/redirect normal
          // continua a valer). Ver MC88.4 (listener) + docs.privy.io/recipes/capacitor-oauth.
          customOAuthRedirectUrl: "https://silly-stardust-ca71bc.netlify.app/redirect",

          // ── Embedded Wallet: criação EXPLÍCITA (não automática) ──────────────
          // MC17.3.1.2.1 — createOnLogin:"off". A auto-criação no login era o
          // gatilho do crash "Cannot destructure ... createWallet" (despacho do
          // evento antes do handler registar, no cold start de utilizador novo).
          // Com "off", o SDK NÃO auto-cria; a wallet é criada explicitamente no
          // onComplete do PrivyEventsBridge (quando o handler já está montado),
          // eliminando a race sem necessidade de reload. A forma continua aninhada
          // por chain (exigida pelo Privy v3). Callbacks vêm de useLogin/useCreateWallet.
          // MC39.3.1 (#6) — showWalletUIs:false suprime o modal de confirmação de
          // assinatura da embedded wallet em ações INICIADAS PELA APP (login direto
          // sem prompt + assinatura EIP-191 do lance sem modal). Trade-off de UX
          // aceite pelo operador: reduz fricção; a posse é garantida via Privy + JWT,
          // e o valor do lance é validado no backend (anti-sniping MC28).
          embeddedWallets: {
            showWalletUIs: false,
            ethereum: { createOnLogin: "off" },
          },

          // ── Rede: Sepolia (default atual) + Mainnet disponível (MC39.1, prep MC40) ──
          // defaultChain permanece Sepolia até o cutover (MC40). Mainnet listada como
          // suportada para permitir switchChain(1) sem regressão (login segue Sepolia).
          defaultChain: sepoliaChain,
          supportedChains: [sepoliaChain, mainnetChain],

          // ── Aparência: alinhada ao design DESAFIOGUT ─────────────────────────
          appearance: {
            theme: "dark",
            accentColor: "#ff6b35",
            // MC67: logo same-origin (o favicon.ico cross-origin era bloqueado pela CSP
            // img-src → ícone quebrado no topo do modal de login). accentColor alinhado
            // à paleta oficial (#ff6b35) — antes era o teal antigo #00d4aa.
            // MC78: ícone do topo do modal ("Log in or sign up") passa a ser o rosto do
            // GUTO (recorte apertado, fundo transparente) em vez do ícone da marca.
            // Same-origin (mantém compatibilidade com a CSP img-src do MC67).
            logo: "/assets/guto/guto-login.png",
            showWalletLoginFirst: false,
            // walletList removido: causava WalletConnect bloqueado pelo CSP
            // → TypeError: Failed to fetch → ready: false permanente
          },
        }}
      >
        {/* MC17.3.1.1 — regista os callbacks de evento (fix do crash createWallet). */}
        <PrivyEventsBridge />
        <App />
      </PrivyProvider>
    </PrivyCrashBoundary>
  );
}
