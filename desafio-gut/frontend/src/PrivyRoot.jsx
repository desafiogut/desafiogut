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
  /[\s\u200B-\u200D\uFEFF]/g, ""
);
if (PRIVY_APP_ID !== PRIVY_APP_ID_RAW) {
  console.error("[GUT-DEBUG] PRIVY_APP_ID continha caracteres invisíveis", {
    raw: JSON.stringify(PRIVY_APP_ID_RAW),
    cleaned: JSON.stringify(PRIVY_APP_ID),
  });
}

// MC88.36 — `appearance.logo` só serve o modal "Log in or sign up" (MC78), mas
// o Privy pré-carrega-o na configuração: o MC88.35 mediu `guto-login.png`
// (456 KB) pedido aos 1885 ms, ANTES da pintura, numa sessão já autenticada que
// nunca chegaria a ver o modal.
//
// A deteção é por EXISTÊNCIA de chaves de sessão, nunca pela leitura do seu
// conteúdo (R5): não abrimos, não copiamos e não usamos qualquer valor. Exige-se
// que AMBAS existam, porque o Privy limpa o seu armazenamento no logout — assim
// um utilizador que se desautenticou volta a ver o logo.
//
// Se a deteção falhar, falha para o lado SEGURO: na dúvida mostra-se o logo, o
// que apenas repõe o comportamento anterior ao MC88.36.
function temSessaoPrivy() {
  try {
    return (
      localStorage.getItem("privy:connections") !== null &&
      localStorage.getItem("privy:token") !== null
    );
  } catch {
    return false;
  }
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
        // MC88.9 — NÃO adicionar `clientId` aqui sem antes reproduzir o teste.
        // Passar clientId="client-WY6YV4f8xhKTGnCG79Po1DgiEMQwWhcHfnCkHxoZQCjBG"
        // (o App Client criado no dashboard) faz o SDK NUNCA ficar `ready`: o
        // modal fica preso em "Carregando…" para sempre, sem erro no console.
        // Confirmado por isolamento — acontece na mesma com o App Link HTTPS,
        // portanto o culpado é o clientId e não o esquema do redirect.
        // E não traria benefício: GET /api/v1/apps/<appId> devolve EXATAMENTE a
        // mesma config com e sem o header privy-client-id, incluindo
        // `allowed_native_app_url_schemes: []` — vazio, que é a verdadeira razão
        // de "Redirect URL scheme is not allowed" (ver comentário do redirect).
        config={{
          // ── Métodos de login: Google (modal público) + E-mail (OTP corporativo) ──
          // MC62: "apple" removido (config morta — desabilitado no painel Privy).
          // MC88.5.2: "email" RESTAURADO — é necessário para o login corporativo
          // headless (useLoginWithEmail em SejaNossoParceiro.jsx). O MODAL PÚBLICO
          // continua restrito a Google via login({loginMethods:["google"]}) em
          // AppContext.abrirModal (o OAuth App Link mobile só usa Google).
          loginMethods: ["google", "email"],

          // ── MC88.5 → MC88.7 — OAuth em WebView nativo (Capacitor/Android) ────
          // Google bloqueia OAuth dentro de WebView embutido, então o consent abre
          // no browser externo e o Privy precisa de redirecionar de volta para a app.
          //
          // MC88.5 usava App Link HTTPS (…netlify.app/redirect). Funciona — validado
          // end-to-end no MC88.5.3 — mas SÓ com browsers que cedem a navegação: o
          // Android só resolve App Links para intents vindos de FORA do browser, e o
          // redirect final do OAuth é navegação INTERNA. O Chrome cede; o Opera não
          // (carrega o /redirect ele próprio e o utilizador nunca volta à app).
          //
          // MC88.7 tentou o esquema custom ("desafiogut://oauth" e
          // "capacitor://localhost/oauth") e o backend recusou os dois com
          //     Error: Redirect URL scheme is not allowed
          //
          // MC88.9 encontrou o campo exato que comanda isso. A config do app
          // (GET https://auth.privy.io/api/v1/apps/<appId>) tem DOIS campos:
          //     allowed_domains: [http://localhost, https://localhost,
          //                       capacitor://localhost, …netlify.app, …]
          //     allowed_native_app_url_schemes: []      ← VAZIO
          // É o segundo que autoriza redirects para esquemas nativos, e está
          // vazio — daí a recusa. Criar o App Client no dashboard com o URL
          // scheme NÃO preencheu este campo, e passar o `clientId` do cliente
          // também não muda nada: a resposta da API é idêntica com e sem o
          // header privy-client-id (medido). Pior, o clientId parte o arranque
          // do SDK — ver comentário na prop acima.
          //
          // → Enquanto `allowed_native_app_url_schemes` estiver vazio, NENHUM
          //   esquema custom funciona, por mais correto que esteja o lado
          //   Android (o intent-filter scheme="desafiogut" está no manifest e o
          //   roteamento foi verificado com `am start`).
          //
          // Portanto: App Link HTTPS, validado end-to-end (MC88.5.3, MC88.8).
          // Custo conhecido — só fecha o ciclo em browsers que cedem a
          // navegação: Chrome sim, Opera não.
          customOAuthRedirectUrl: "https://silly-stardust-ca71bc.netlify.app/redirect",
          // MC88.5.3 — o customOAuthRedirectUrl sozinho não chegava: o SDK trata o
          // WebView do Capacitor como "embedded browser" e ABORTA o OAuth antes de
          // sequer montar o URL de consent (default false). Este flag destrava esse
          // guard, deixando o fluxo App Link acima acontecer. Marcado @experimental
          // pelo Privy — reconfirmar ao subir de major do @privy-io/react-auth.
          // (Não confundir com `oauth: { redirect: true }`: essa chave NÃO existe em
          // PrivyClientConfig 3.22.1 e era descartada em silêncio.)
          allowOAuthInEmbeddedBrowsers: true,

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
            // MC88.36: numa sessão já autenticada o modal nunca abre, logo o
            // logo é 456 KB pedidos para nada no arranque. `undefined` faz o
            // Privy usar o seu próprio ícone — que só seria visto se o modal
            // aparecesse, o que nesse estado não acontece.
            logo: temSessaoPrivy() ? undefined : "/assets/guto/guto-login.png",
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
