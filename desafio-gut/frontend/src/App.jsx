import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext.jsx";
import TermosConsentimento from "./components/TermosConsentimento.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard       from "./pages/Dashboard.jsx";
import MinhaCarteira   from "./pages/MinhaCarteira.jsx";
import MercadoLances   from "./pages/MercadoLances.jsx";
import MeusAtivos      from "./pages/MeusAtivos.jsx";
import Seguranca       from "./pages/Seguranca.jsx";
import Configuracoes   from "./pages/Configuracoes.jsx";

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
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index              element={<Dashboard />}     />
          <Route path="/carteira"   element={<MinhaCarteira />} />
          <Route path="/mercado"    element={<MercadoLances />} />
          <Route path="/ativos"     element={<MeusAtivos />}    />
          <Route path="/seguranca"  element={<Seguranca />}     />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
