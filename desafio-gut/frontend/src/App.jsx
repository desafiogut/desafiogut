// force deploy 2026-05-11 — reset versionado + MOCK_MODE removido
import { lazy, Suspense, useEffect, useState } from "react";
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
import { useAdmin } from "./hooks/useAdmin.js";
// MC39.19 (Onda 2, item 3) — code-splitting por rota. Páginas CRÍTICAS de entrada
// (Dashboard/Vitrine) ficam EAGER (evita flash de Suspense no first paint); as demais
// via React.lazy → saem do chunk inicial e carregam sob demanda. LazyBoundary trata
// chunk-404 pós-deploy (reload). ChatbotWidget é eager (botão flutuante global).
import Dashboard       from "./pages/Dashboard.jsx";
import Vitrine         from "./pages/Vitrine.jsx";
// MC89.36 — EAGER de propósito. É o que se mostra ANTES de tudo o resto quando
// a app ainda não sabe quem é o utilizador; se fosse `lazy`, o primeiro render
// pagava um fallback de Suspense — trocaríamos um ecrã errado por um ecrã
// vazio, que é exatamente o que o MC88.37 corrigiu. São ~2 KB.
import EstadoNeutro    from "./components/EstadoNeutro.jsx";
import ChatbotWidget   from "./components/ChatbotWidget.jsx";
// MC88.25 (P3) — avisa se a app nao estiver na rede de producao. Silencioso em mainnet.
import AvisoRede       from "./components/AvisoRede.jsx";
import LazyBoundary    from "./components/LazyBoundary.jsx";
// MC89.6 — sessão admin. Import ESTÁTICO é seguro: o contexto não importa
// `utils/web3.js` no topo (faz import dinâmico ao assinar), por isso não arrasta
// ethers nem hash-wasm para o chunk inicial. Há um teste a fixar isso.
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
// MC89.36 — a decisão de para onde vai quem abre a rota "/" saiu deste ficheiro
// para uma função pura, porque o frontend não tem runner de React e era a única
// forma de a testar (e de provar cada teste por mutação).
import { decidirDestino, DESTINO, PRAZO_ESTADO_NEUTRO_MS } from "./lib/encaminhamento.js";

const MinhaCarteira        = lazy(() => import("./pages/MinhaCarteira.jsx"));
const MercadoLances        = lazy(() => import("./pages/MercadoLances.jsx"));
const ScheduleView         = lazy(() => import("./components/ScheduleView.jsx"));
const MeusAtivos           = lazy(() => import("./pages/MeusAtivos.jsx"));
const Seguranca            = lazy(() => import("./pages/Seguranca.jsx"));
const Configuracoes        = lazy(() => import("./pages/Configuracoes.jsx"));
// MC89.6 (Fase 0 / D-NAV) — o AdminPanel monolítico deu lugar a uma casca
// (AdminLayout) com uma rota por tela. Cada tela é um chunk seu: quem abre
// /admin não paga o custo de parse das outras oito, e o arranque da app não
// muda (nenhuma delas entra no chunk inicial).
const AdminLayout          = lazy(() => import("./components/admin/AdminLayout.jsx"));
const AdminVisaoGeral      = lazy(() => import("./pages/admin/VisaoGeral.jsx"));
const AdminUsuarios        = lazy(() => import("./pages/admin/GestaoUsuarios.jsx"));
const AdminPerfilUsuario   = lazy(() => import("./pages/admin/PerfilUsuario.jsx"));
const AdminFinanceiro      = lazy(() => import("./pages/admin/GestaoFinanceira.jsx"));
const AdminOperacoes       = lazy(() => import("./pages/admin/Operacoes.jsx"));
const AdminLogs            = lazy(() => import("./pages/admin/LogsAuditoria.jsx"));
const AdminNotificacoes    = lazy(() => import("./pages/admin/Comunicacao.jsx"));
const AdminConfiguracoes   = lazy(() => import("./pages/admin/ConfiguracoesAdmins.jsx"));
const AdminAprovacoes      = lazy(() => import("./pages/admin/Aprovacoes.jsx"));
const AdminCotas           = lazy(() => import("./pages/admin/Cotas.jsx"));
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
  const { tipoUsuario, tipoProvavel, tipoCarregando, cotaCorporativa, isConnected, pareceAutenticado, ready } = useAppContext();
  // MC39.4.1 — esperar o Privy inicializar antes de decidir o redirect. Sem isto, um
  // hard-reload de uma rota gated (ex.: /seguranca) bouncava o lojista para "/" porque
  // isConnected ainda era false durante a inicialização do Privy.
  //
  // MC88.42 — com o palpite otimista, o lojista chega aqui ANTES de as cotas
  // responderem. Se esta guarda continuasse a devolver `null` nesse intervalo,
  // ele trocava o Dashboard errado por um ECRÃ EM BRANCO — que é exatamente o
  // defeito que o MC88.37 corrigiu. Medido antes desta alteração: /corporativo
  // ficava vazio ~74 ms antes de o painel aparecer.
  //
  // Por isso o `tipoProvavel` também é aceite AQUI: o encaminhamento e a guarda
  // passam a usar a MESMA fonte. Sem isto, o redirect otimista mandava o
  // utilizador para uma porta que o mandava de volta.
  if (!ready) return null;
  // ⚠️ MC88.42 — `!isConnected` NÃO significa "não autenticado" durante o
  // restauro do Privy; é a mesma armadilha do MC88.38. Com o encaminhamento
  // otimista isto criou um CICLO que eu próprio medi: `/` mandava para
  // `/corporativo`, esta guarda via `isConnected` false e mandava de volta para
  // `/`, que mandava outra vez — SETE voltas entre os 1974 e os 5064 ms, com o
  // ecrã em branco. Enquanto a sessão está a ser restaurada (`pareceAutenticado`)
  // espera-se, em vez de expulsar.
  if (!isConnected) {
    if (pareceAutenticado) return children;
    if (!window.location.search.includes("rc=1")) return <Navigate to="/" replace />;
    return children;
  }
  if (tipoCarregando) return tipoProvavel === "corporativo" ? children : null;

  // ⚠️ A EXPULSÃO EXIGE UMA RESPOSTA POSITIVA, não a ausência de resposta.
  //
  // O efeito que busca as cotas (AppContext:338) tem `user.google.email` e
  // `user.apple.email` nas dependências, e esses campos só resolvem A MEIO do
  // restauro do Privy — portanto o efeito CORRE VÁRIAS VEZES. Entre corridas,
  // `tipoCarregando` volta a false com `cotaCorporativa` ainda a null, o que
  // fazia `tipoUsuario` cair para "comum" e esta linha expulsar o lojista.
  //
  // Medido: a rota saltava /corporativo ↔ / sete vezes entre os 3,4 s e os
  // 5,4 s. O operador viu-o como "o ícone do painel está a piscar".
  //
  // `cotaCorporativa == null` é ambíguo — significa "ainda não encontrei" E
  // "não é lojista". Enquanto o palpite disser corporativo (última sessão
  // CONFIRMADA neste endereço), essa ambiguidade não pode expulsar ninguém.
  // Só uma cota devolvida que NÃO seja corporativa o faz.
  const confirmadoNaoCorporativo = cotaCorporativa != null && tipoUsuario !== "corporativo";
  if (confirmadoNaoCorporativo) return <Navigate to="/" replace />;
  if (tipoUsuario !== "corporativo" && tipoProvavel !== "corporativo") {
    return <Navigate to="/" replace />;
  }
  return children;
}

// MC12.3 Item 4 — wrapper da rota raiz: lojistas autenticados NUNCA veem
// o Dashboard de leilão. Vão direto para /corporativo. Comuns/visitantes
// continuam vendo o Dashboard normal (zero regressão R1).
// MC88.37 — ANTES existia aqui `if (isConnected && tipoCarregando) return null;`.
//
// O QUE ISSO PROVOCAVA (medido, ver docs/MC88.37-CLS-DIAGNOSTICO.txt): quando o
// Privy conclui o restauro da sessão (~4,3 s no APK) `isConnected` passa a true
// e, no mesmo instante, o `authToken` passa a existir e liga
// `setTipoCarregando(true)` (AppContext.jsx:350) para ir buscar as cotas. As
// duas condições ficavam verdadeiras ao mesmo tempo, o Outlet esvaziava-se e o
// Dashboard — já pintado desde os ~1,7 s — DESAPARECIA durante ~1,2 s.
// Sintoma medido: CLS 0,373, em duas deslocações do rodapé de altura 0 ↔ 154.
//
// PORQUE É QUE DEVOLVER null NÃO PROTEGIA NADA: o Dashboard comum já é mostrado
// durante os ~4,3 s anteriores, enquanto `isConnected` ainda é false. Apagá-lo
// só DEPOIS disso não impede que um utilizador corporativo veja o ecrã comum —
// apenas acrescenta um ecrã em branco a meio.
//
// A intenção declarada em AppContext.jsx:252 é "evita redirect prematuro" —
// evitar um REDIRECT, não apagar a página. É isso que se preserva: durante a
// deteção mostra-se o Dashboard, e o `<Navigate>` continua a esperar que
// `tipoCarregando` termine. O caso corporativo tem ainda a segunda camada de
// AppContext.jsx:409-424, que também espera por `tipoCarregando` antes de
// navegar.
//
// MC88.42 — passa a encaminhar pelo `tipoProvavel`. Medido no aparelho com a
// sessão corporativa real: o lojista via o Dashboard COMUM durante 9012/3994/
// 3873 ms antes do redirect. `tipoProvavel` já vale "corporativo" no primeiro
// render quando a última sessão CONFIRMADA neste mesmo endereço foi corporativa
// (ver AppContext), portanto o redirect acontece de imediato em vez de esperar
// pelas cotas.
//
// MC89.36 — acrescenta um terceiro degrau ANTES do Dashboard comum: o estado
// neutro. O que existia era uma escolha binária — "é lojista" ou "é comum" — e
// o segundo ramo servia também de resposta a "ainda não sei". Isso não é um
// palpite conservador: é uma AFIRMAÇÃO falsa, mantida no ecrã entre 5,7 s
// (funções quentes) e 12,0 s (a frio), medidas no aparelho no MC89.35.
//
// A lógica em si mudou-se para `lib/encaminhamento.js` — ver o comentário do
// import. Aqui fica só o que é React: os hooks e o prazo.
function DashboardOuCorporativo() {
  const {
    tipoProvavel, tipoUsuario, tipoCarregando, address, adminProvavel,
    // MC89.36 — `tipoResolvido` é "a pergunta /cotas já foi RESPONDIDA", e não
    // "está a carregar". A diferença não é cosmética: medi que `tipoCarregando`
    // só passa a true aos 4 422 ms, quando o Dashboard já está pintado desde os
    // 568 ms — 76% da janela ficaria de fora. Ver docs/MC89.36-DIAGNOSTICO.txt §1.
    tipoResolvido,
    // MC89.36 (R-B) — a porta de entrada do estado neutro. Um visitante anónimo
    // NUNCA passa por ele: para ele o Dashboard é a página pública de entrada.
    pareceAutenticado,
  } = useAppContext();
  const { isAdmin, loading: adminLoading } = useAdmin(address);

  // MC89.36 (R-C) — a válvula de segurança do estado neutro.
  //
  // `apiGet` não impõe timeout próprio: um fetch que nunca resolva deixaria
  // `tipoResolvido` false para sempre e prenderia o utilizador no esqueleto —
  // pior do que o defeito que este MC corrige. Passado o prazo, mostra-se o
  // Dashboard comum: falha-se para o lado ABERTO, e o pior caso fica exatamente
  // como estava antes deste MC.
  //
  // O prazo conta a partir da MONTAGEM deste componente (~FCP), não do início da
  // navegação — dá alguns milissegundos de folga face aos números do MC89.35,
  // que são medidos desde o `navigationStart`.
  const [prazoEsgotado, setPrazoEsgotado] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPrazoEsgotado(true), PRAZO_ESTADO_NEUTRO_MS);
    return () => clearTimeout(t);
  }, []);

  // ── A DECISÃO ──────────────────────────────────────────────────────────────
  // A ordem dos degraus, e o porquê de cada um, vive em lib/encaminhamento.js.
  // Três notas de história que NÃO se devem perder e que continuam a valer:
  //
  // MC89.12 — o ADM é testado DEPOIS do corporate na intenção original, mas na
  // prática vem primeiro: um lojista-que-também-é-admin vai para /admin. Se o
  // operador quiser inverter, é trocar a ordem dos dois primeiros degraus na
  // função pura — e há um teste a fixar a ordem atual.
  //
  // MC89.31 — a condição do ADM exigia `address`, que só existe depois de o
  // Privy restaurar a sessão; media-se 1314/1430 ms de Dashboard comum a quem
  // abriu a app para administrar. Daí o `address ? confirmado : palpite`.
  //
  // MC89.34 — ⚠️ O ENCAMINHAMENTO DO ADM É INCONDICIONAL, E É ASSIM DE PROPÓSITO.
  // Chegou a existir uma "pausa" (sessionStorage) para o botão "Sair do painel"
  // levar o ADM ao Dashboard comum. Foi implementada, testada, validada no
  // aparelho — e revertida por decisão do operador: as telas de utilizador comum
  // NÃO devem existir para o ADM. Quem for acrescentar aqui uma exceção deve
  // primeiro perguntar se o que falta não é, outra vez, apenas uma forma de SAIR.
  const destino = decidirDestino({
    address, isAdmin, adminLoading, adminProvavel,
    tipoProvavel, tipoUsuario, tipoCarregando, tipoResolvido,
    pareceAutenticado, prazoEsgotado,
  });

  if (destino === DESTINO.ADMIN)         return <Navigate to="/admin" replace />;
  if (destino === DESTINO.CORPORATIVO)   return <Navigate to="/corporativo" replace />;
  if (destino === DESTINO.ESTADO_NEUTRO) return <EstadoNeutro />;
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
          {/* MC89.6 (D-NAV) — a Visão Geral é o ÍNDICE de /admin, não um separador
              entre outros. A lista canónica das telas vive em lib/adminNav.js e é a
              mesma que gera a navegação, por isso um link nunca pode apontar para
              uma rota que não exista. O AdminAuthProvider envolve SÓ estas rotas:
              a sessão admin não tem nada que existir no resto da aplicação. */}
          <Route path="/admin" element={<AdminAuthProvider><AdminLayout /></AdminAuthProvider>}>
            <Route index                   element={<AdminVisaoGeral />} />
            <Route path="usuarios"         element={<AdminUsuarios />} />
            <Route path="usuarios/:endereco" element={<AdminPerfilUsuario />} />
            <Route path="financeiro"       element={<AdminFinanceiro />} />
            <Route path="operacoes"        element={<AdminOperacoes />} />
            <Route path="logs"             element={<AdminLogs />} />
            <Route path="notificacoes"     element={<AdminNotificacoes />} />
            <Route path="configuracoes"    element={<AdminConfiguracoes />} />
            {/* T-2 — funcionalidades vivas sem lugar na estrutura de 7 telas.
                Autónomas até o operador decidir onde pertencem. */}
            <Route path="aprovacoes"       element={<AdminAprovacoes />} />
            <Route path="cotas"            element={<AdminCotas />} />
          </Route>
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
      <AvisoRede />
      </AppEnvironmentProvider>
    </AppProvider>
    </IdiomaProvider>
    </>
  );
}

