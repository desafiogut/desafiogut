// force deploy 2026-05-11 — reset versionado + MOCK_MODE removido
import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
// MC88.4 — plugin nativo do Capacitor para interceptar o deep link do OAuth
// (Privy/Google) no Android. Aliased para CapApp: o export chama-se App e
// colidiria com o componente App() abaixo.
import { App as CapApp } from "@capacitor/app";
import { AppProvider, useAppContext } from "./context/AppContext.jsx";
import AppLayout from "./widgets/layout/AppLayout.jsx";
import BackgroundCanvas from "./widgets/layout/BackgroundCanvas.jsx";
import { AppEnvironmentProvider } from "./context/useAppContextEnvironment.jsx";
import { IdiomaProvider } from "./context/IdiomaContext.jsx";
import { ToastContainer, useToast } from "./widgets/toast/Toast.jsx";
import ReferralRegistrar from "./components/ReferralRegistrar.jsx";
// MC39.19 (Onda 2, item 3) — code-splitting por rota. Páginas CRÍTICAS de entrada
// (Dashboard/Vitrine) ficam EAGER (evita flash de Suspense no first paint); as demais
// via React.lazy → saem do chunk inicial e carregam sob demanda. LazyBoundary trata
// chunk-404 pós-deploy (reload). ChatbotWidget é eager (botão flutuante global).
import Dashboard       from "./pages/Dashboard.jsx";
import Vitrine         from "./pages/Vitrine.jsx";
import ChatbotWidget   from "./components/ChatbotWidget.jsx";
import LazyBoundary    from "./components/LazyBoundary.jsx";

const MinhaCarteira        = lazy(() => import("./pages/MinhaCarteira.jsx"));
const MercadoLances        = lazy(() => import("./pages/MercadoLances.jsx"));
const ScheduleView         = lazy(() => import("./components/ScheduleView.jsx"));
const MeusAtivos           = lazy(() => import("./pages/MeusAtivos.jsx"));
const Seguranca            = lazy(() => import("./pages/Seguranca.jsx"));
const Configuracoes        = lazy(() => import("./pages/Configuracoes.jsx"));
const AdminPanel           = lazy(() => import("./pages/AdminPanel.jsx"));
const CorporativoDashboard = lazy(() => import("./pages/CorporativoDashboard.jsx"));
const CorporativoCotas     = lazy(() => import("./pages/CorporativoCotas.jsx"));
const CorporativoBanners   = lazy(() => import("./pages/CorporativoBanners.jsx"));
const CorporativoAnalytics = lazy(() => import("./pages/CorporativoAnalytics.jsx"));
const CorporativoCarteira  = lazy(() => import("./pages/CorporativoCarteira.jsx"));
const SejaNossoParceiro    = lazy(() => import("./pages/SejaNossoParceiro.jsx"));
const DetalheProduto       = lazy(() => import("./pages/DetalheProduto.jsx"));
const EdicaoDetalhe        = lazy(() => import("./pages/EdicaoDetalhe.jsx"));
// MC72 — página pública de exclusão de conta (Play Store). Standalone (fora do
// AppLayout) e fora do gate LGPD, mas dentro dos providers (Privy/AppContext).
const ExcluirConta         = lazy(() => import("./pages/ExcluirConta.jsx"));

// Fallback discreto enquanto um chunk de rota carrega (sem layout shift agressivo).
function RouteFallback() {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando…"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", color: "#94a3b8" }}>
      <span style={{ animation: "gut-fade 1.2s ease-in-out infinite" }}>⏳ Carregando…</span>
      <style>{`@keyframes gut-fade { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }`}</style>
    </div>
  );
}

// MC12.2 — CorporativoRoute usa tipoUsuario derivado de cotas blob.
// tipoCarregando evita redirect prematuro enquanto o fetch do blob está pendente.
// MC17 — query param ?rc=1: acesso direto sem Privy após cadastro.
// Usa window.location (full page reload garante search params corretos).
function CorporativoRoute({ children }) {
  const { tipoUsuario, tipoCarregando, isConnected, ready } = useAppContext();
  // MC39.4.1 — esperar o Privy inicializar antes de decidir o redirect. Sem isto, um
  // hard-reload de uma rota gated (ex.: /seguranca) bouncava o lojista para "/" porque
  // isConnected ainda era false durante a inicialização do Privy.
  if (!ready) return null;
  if (!isConnected) {
    if (!window.location.search.includes("rc=1")) return <Navigate to="/" replace />;
    return children;
  }
  if (tipoCarregando) return null;
  if (tipoUsuario !== "corporativo") return <Navigate to="/" replace />;
  return children;
}

// MC12.3 Item 4 — wrapper da rota raiz: lojistas autenticados NUNCA veem
// o Dashboard de leilão. Vão direto para /corporativo. Comuns/visitantes
// continuam vendo o Dashboard normal (zero regressão R1).
function DashboardOuCorporativo() {
  const { tipoUsuario, tipoCarregando, isConnected } = useAppContext();
  if (isConnected && tipoCarregando) return null;
  if (tipoUsuario === "corporativo") return <Navigate to="/corporativo" replace />;
  return <Dashboard />;
}

/**
 * App — Raiz da aplicação DesafioGUT.
 *
 * Responsabilidades:
 *  1. Provedor global de estado (AppProvider)
 *  2. Roteamento com react-router-dom v7
 *
 * MC82.2 — o gate de consentimento LGPD deixou de viver aqui: passou para o
 * Boot.jsx, que é quem decide carregar este chunk. Continua a valer que o
 * utilizador tem de aceitar antes de ver qualquer conteúdo — só que agora a
 * aplicação (e o Privy) nem sequer são descarregados até lá.
 */
export default function App() {
  const { toasts, add, remove } = useToast();
  const navigate = useNavigate();

  // MC88.4/88.5 — Deep link do OAuth (Capacitor/Android). Google bloqueia OAuth
  // em WebView embutido, então o consent abre no browser externo e o Privy volta
  // via App Link HTTPS (customOAuthRedirectUrl → https://…/redirect?privy_oauth_code=…).
  // O Android (autoVerify + assetlinks.json) intercepta esse retorno e reabre a
  // app com o evento appUrlOpen.
  //
  // MC88.5 — quando o deep link traz os params privy_oauth_*, NÃO basta um navigate
  // client-side: o SDK do Privy lê esses params de window.location durante a
  // inicialização da página. Fazemos window.location.assign() para a origem LOCAL
  // (https://localhost) com os params, forçando um reload em que o SDK completa o
  // OAuth e gera o JWT (padrão documentado: docs.privy.io/recipes/capacitor-oauth).
  // Deep links sem params OAuth caem no navigate normal do React Router.
  // No-op fora do Capacitor (web puro): window.Capacitor é undefined.
  useEffect(() => {
    if (typeof window === "undefined" || !window.Capacitor) return;

    let listenerHandle;
    const handleDeepLink = ({ url }) => {
      try {
        console.log("🔗 Deep link interceptado:", url);
        const { pathname, search, hash } = new URL(url);
        if (/[?&]privy_oauth_/.test(search)) {
          // Reinjeta os params na origem local → reload → Privy completa o login.
          window.location.assign(`/${search}`);
          return;
        }
        navigate(`${pathname || "/carteira"}${search}${hash}`);
      } catch (err) {
        console.warn("[MC88.5] falha ao processar deep link:", err);
      }
    };

    // addListener é assíncrono (retorna Promise<PluginListenerHandle>).
    const registo = CapApp.addListener("appUrlOpen", handleDeepLink);
    registo.then((handle) => { listenerHandle = handle; });

    return () => {
      registo.then((handle) => (listenerHandle || handle)?.remove());
    };
  }, [navigate]);

  // MC82.2 — o gate LGPD saiu daqui para o Boot.jsx. Este componente só é montado
  // depois de o consentimento estar aceite (ou na rota pública /excluir-conta),
  // porque é o próprio Boot que decide carregar o chunk que contém este ficheiro.
  // Motivo: o gate vivia dentro do <PrivyProvider> e por isso o arranque pagava
  // 4.002 KB de JS para desenhar quatro checkboxes (ver MC82.2 / MC82-BASELINE).

  // ── Aplicação principal ────────────────────────────────────────────────────
  return (
    <>
    {/* MC20.2 — Arena oficial (-z-50) GLOBAL atrás de tudo (paridade body-level MC19.1). */}
    <BackgroundCanvas />
    {/* MC22.1 — Provider i18n (PT/EN/ES) ANINHADO no topo; compõe, não substitui (R1). */}
    <IdiomaProvider>
    <AppProvider toastApi={{ add, remove }}>
      {/* MC20.2 FASE 1 · ITEM 3 — Provider de ambiente ANINHADO (appState/gutoMood/
          activeTab) a envolver Routes + ChatbotWidget, para sincronizar as 3 camadas
          e o GUTO em qualquer rota. Compõe com o AppProvider, nunca o substitui (R1). */}
      <AppEnvironmentProvider>
      {/* MC17.3.1.1 — regista o vínculo de indicação (?ref=) quando address+authToken prontos. */}
      <ReferralRegistrar />
      <ToastContainer toasts={toasts} onDismiss={remove} />
      {/* MC39.19 (Onda 2, item 3) — LazyBoundary (chunk-404 pós-deploy → reload) +
          Suspense (fallback enquanto o chunk da rota carrega). Zero regressão de rotas. */}
      <LazyBoundary>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* MC72 — rota pública STANDALONE (fora do AppLayout e do gate LGPD): página
            de exclusão de conta exigida pela Google Play Store. */}
        <Route path="/excluir-conta" element={<ExcluirConta />} />
        {/* MC20.2 FASE 1 · ITEM 2 — AppLayout (3 camadas) substitui Layout como
            rota-mãe; renderiza o Layout existente intacto na superfície (zero
            regressão de rotas/navegação — R1). */}
        <Route element={<AppLayout />}>
          <Route index              element={<DashboardOuCorporativo />} />
          <Route path="/carteira"   element={<MinhaCarteira />} />
          <Route path="/mercado"    element={<MercadoLances />} />
          <Route path="/vitrine"       element={<Vitrine />} />
          <Route path="/vitrine/:slot" element={<Vitrine />} />
          {/* MC15 ITEM 4 — detalhe de produto do marketplace */}
          <Route path="/produto/:id" element={<DetalheProduto />} />
          {/* MC45 — informações de uma edição (destino do banner clicável) */}
          <Route path="/edicao/:id" element={<EdicaoDetalhe />} />
          <Route path="/programacao"   element={<ScheduleView />} />
          <Route path="/ativos"     element={<MeusAtivos />}    />
          {/* MC39.3.1 (#7): checklist de segurança é só para o lojista (corporativo).
              Comum/visitante → CorporativoRoute redireciona para "/". */}
          <Route path="/seguranca"  element={<CorporativoRoute><Seguranca /></CorporativoRoute>} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/admin"      element={<AdminPanel />} />
          {/* MC11.1 — rota pública: Seja Nosso Parceiro. Sem proteção. */}
          <Route path="/seja-nosso-parceiro" element={<SejaNossoParceiro />} />
          {/* MC17 — rota direta pós-cadastro (sem gate). */}
          <Route path="/corp" element={<CorporativoDashboard />} />
          {/* MC11 — rotas corporativas (gated por CorporativoRoute). */}
          <Route path="/corporativo"            element={<CorporativoRoute><CorporativoDashboard /></CorporativoRoute>} />
          <Route path="/corporativo/cotas"      element={<CorporativoRoute><CorporativoCotas /></CorporativoRoute>} />
          <Route path="/corporativo/banners"    element={<CorporativoRoute><CorporativoBanners /></CorporativoRoute>} />
          <Route path="/corporativo/analytics"  element={<CorporativoRoute><CorporativoAnalytics /></CorporativoRoute>} />
          {/* MC17.1 — carteira do lojista + mercado dedicado (isolamento R4 preservado). */}
          <Route path="/corporativo/carteira"   element={<CorporativoRoute><CorporativoCarteira /></CorporativoRoute>} />
          <Route path="/corporativo/mercado"    element={<CorporativoRoute><MercadoLances /></CorporativoRoute>} />
        </Route>
      </Routes>
      </Suspense>
      </LazyBoundary>
      {/* MC9 — IA Cognitiva: chatbot RAG 24/7 (botão flutuante em todas as rotas). */}
      <ChatbotWidget />
      </AppEnvironmentProvider>
    </AppProvider>
    </IdiomaProvider>
    </>
  );
}

