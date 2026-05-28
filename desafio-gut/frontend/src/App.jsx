// force deploy 2026-05-11 — reset versionado + MOCK_MODE removido
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useAppContext } from "./context/AppContext.jsx";
import TermosConsentimento from "./components/TermosConsentimento.jsx";
import Layout from "./widgets/layout/Layout.jsx";
import { ToastContainer, useToast } from "./widgets/toast/Toast.jsx";
import Dashboard       from "./pages/Dashboard.jsx";
import MinhaCarteira   from "./pages/MinhaCarteira.jsx";
import MercadoLances   from "./pages/MercadoLances.jsx";
import Vitrine         from "./pages/Vitrine.jsx";
import ScheduleView    from "./components/ScheduleView.jsx";
import MeusAtivos      from "./pages/MeusAtivos.jsx";
import Seguranca       from "./pages/Seguranca.jsx";
import Configuracoes   from "./pages/Configuracoes.jsx";
import AdminPanel      from "./pages/AdminPanel.jsx";
import ChatbotWidget   from "./components/ChatbotWidget.jsx";
// MC11 — páginas do Usuário Corporativo (Lojista).
import CorporativoDashboard from "./pages/CorporativoDashboard.jsx";
import CorporativoCotas     from "./pages/CorporativoCotas.jsx";
import CorporativoBanners   from "./pages/CorporativoBanners.jsx";
import CorporativoAnalytics from "./pages/CorporativoAnalytics.jsx";
// MC11.1 — Seção pública (porta de entrada para o fluxo corporativo).
import SejaNossoParceiro    from "./pages/SejaNossoParceiro.jsx";
// MC15 ITEM 4 — página de detalhe de produto
import DetalheProduto      from "./pages/DetalheProduto.jsx";

// MC12.2 — CorporativoRoute usa tipoUsuario derivado de cotas blob.
// tipoCarregando evita redirect prematuro enquanto o fetch do blob está pendente.
// MC17 — query param ?rc=1: acesso direto sem Privy após cadastro.
// Usa window.location (full page reload garante search params corretos).
function CorporativoRoute({ children }) {
  const { tipoUsuario, tipoCarregando, isConnected } = useAppContext();
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
 *  1. Gate de consentimento LGPD (TermosConsentimento)
 *  2. Provedor global de estado (AppProvider)
 *  3. Roteamento com react-router-dom v7
 *
 * O gate de consentimento renderiza ANTES do router:
 * o usuário precisa aceitar antes de ver qualquer conteúdo.
 */
export default function App() {
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);
  const { toasts, add, remove } = useToast();

  // Recupera consentimento da sessão (recarregamento de página)
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem("gut_consentimento");
      if (salvo && JSON.parse(salvo).aceito) setConsentimentoAceito(true);
    } catch {
      sessionStorage.removeItem("gut_consentimento");
    }
  }, []);

  // ── Gate LGPD ─────────────────────────────────────────────────────────────
  if (!consentimentoAceito) {
    return <TermosConsentimento onAceitar={() => setConsentimentoAceito(true)} />;
  }

  // ── Aplicação principal ────────────────────────────────────────────────────
  return (
    <AppProvider toastApi={{ add, remove }}>
      <ToastContainer toasts={toasts} onDismiss={remove} />
      <Routes>
        <Route element={<Layout />}>
          <Route index              element={<DashboardOuCorporativo />} />
          <Route path="/carteira"   element={<MinhaCarteira />} />
          <Route path="/mercado"    element={<MercadoLances />} />
          <Route path="/vitrine"       element={<Vitrine />} />
          <Route path="/vitrine/:slot" element={<Vitrine />} />
          {/* MC15 ITEM 4 — detalhe de produto do marketplace */}
          <Route path="/produto/:id" element={<DetalheProduto />} />
          <Route path="/programacao"   element={<ScheduleView />} />
          <Route path="/ativos"     element={<MeusAtivos />}    />
          <Route path="/seguranca"  element={<Seguranca />}     />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/admin"      element={<AdminPanel />} />
          {/* MC11.1 — rota pública: Seja Nosso Parceiro. Sem proteção. */}
          <Route path="/seja-nosso-parceiro" element={<SejaNossoParceiro />} />
          {/* MC11 — rotas corporativas (gated por CorporativoRoute). */}
          <Route path="/corporativo"            element={<CorporativoRoute><CorporativoDashboard /></CorporativoRoute>} />
          <Route path="/corporativo/cotas"      element={<CorporativoRoute><CorporativoCotas /></CorporativoRoute>} />
          <Route path="/corporativo/banners"    element={<CorporativoRoute><CorporativoBanners /></CorporativoRoute>} />
          <Route path="/corporativo/analytics"  element={<CorporativoRoute><CorporativoAnalytics /></CorporativoRoute>} />
        </Route>
      </Routes>
      {/* MC9 — IA Cognitiva: chatbot RAG 24/7 (botão flutuante em todas as rotas). */}
      <ChatbotWidget />
    </AppProvider>
  );
}

