// MC20.2 FASE 1 · ITEM 3 — Contexto e Hook de Sincronização do Ambiente.
//
// Provider NOVO, ANINHADO com o AppContext existente (nunca o substitui — achado D
// do MC20). Expõe o estado "ambiental" que orquestra as 3 camadas (Arena/Atmosfera/
// Superfície) e o GUTO animado, SEM tocar no estado de negócio (saldo on-chain,
// edições, perfis) — zero regressão (R1).
//
// Verdades expostas:
//   appState  : 'idle' | 'processing' | 'thinking' | 'success' | 'error'
//   gutoMood  : 'breathing' | 'analyzing' | 'celebrating'   (derivado de appState)
//   activeTab : 'lances' | 'carteira' | 'perfil' | 'guto'   (derivado da rota)
//
// Comportamento das animações (MC20.1):
//   idle        → respiração contínua, estado PADRÃO permanente.
//   thinking    → disparado quando o utilizador pergunta ao GUTO no chatbot.
//   celebration → disparado no fim de uma rodada de leilão com vencedor.
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";

const EnvironmentContext = createContext(null);

// appState → gutoMood (ITEM 3, tabela de verdade da Camada -z-40 / GUTO).
function moodFromState(appState) {
  switch (appState) {
    case "thinking":
    case "processing":
      return "analyzing";
    case "success":
      return "celebrating";
    case "idle":
    case "error":
    default:
      return "breathing";
  }
}

// rota → activeTab (derivado do react-router; não depende do AppContext).
function tabFromPath(pathname) {
  const p = (pathname || "/").toLowerCase();
  if (p === "/" || p.startsWith("/mercado") || p.startsWith("/corporativo/mercado")) return "lances";
  if (p.startsWith("/carteira") || p.startsWith("/corporativo/carteira") || p.startsWith("/corporativo")) return "carteira";
  if (p.startsWith("/seguranca") || p.startsWith("/configuracoes") || p.startsWith("/ativos")) return "perfil";
  if (p.startsWith("/vitrine") || p.startsWith("/produto") || p.startsWith("/programacao")) return "guto";
  return "lances";
}

// Durações de auto-reset (ms): a celebração e o erro são transientes e voltam a idle.
const SUCCESS_HOLD_MS = 3200; // ~ duração do loop de celebração
const ERROR_HOLD_MS = 900; // pulso curto de alerta

export function AppEnvironmentProvider({ children }) {
  const [appState, setAppStateRaw] = useState("idle");
  const location = useLocation();
  const resetTimer = useRef(null);

  // Limpa qualquer auto-reset pendente.
  const clearReset = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  }, []);

  // Define o estado e agenda auto-reset para os estados transientes.
  const setAppState = useCallback(
    (next) => {
      clearReset();
      setAppStateRaw(next);
      if (next === "success") {
        resetTimer.current = setTimeout(() => setAppStateRaw("idle"), SUCCESS_HOLD_MS);
      } else if (next === "error") {
        resetTimer.current = setTimeout(() => setAppStateRaw("idle"), ERROR_HOLD_MS);
      }
    },
    [clearReset],
  );

  useEffect(() => clearReset, [clearReset]);

  // Atalhos semânticos (optimistic-friendly, minimalistas — @taste-engineering).
  const signalIdle = useCallback(() => setAppState("idle"), [setAppState]);
  const signalThinking = useCallback(() => setAppState("thinking"), [setAppState]);
  const signalProcessing = useCallback(() => setAppState("processing"), [setAppState]);
  const signalSuccess = useCallback(() => setAppState("success"), [setAppState]);
  const signalError = useCallback(() => setAppState("error"), [setAppState]);

  const activeTab = useMemo(() => tabFromPath(location.pathname), [location.pathname]);
  const gutoMood = useMemo(() => moodFromState(appState), [appState]);

  const value = useMemo(
    () => ({
      appState,
      setAppState,
      gutoMood,
      activeTab,
      signalIdle,
      signalThinking,
      signalProcessing,
      signalSuccess,
      signalError,
    }),
    [appState, setAppState, gutoMood, activeTab, signalIdle, signalThinking, signalProcessing, signalSuccess, signalError],
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}

/**
 * useAppEnvironment — acede ao estado ambiental.
 * Seguro fora do provider: devolve um stub inerte (idle) para nunca quebrar
 * componentes que ainda não foram migrados (anti-regressão).
 */
export function useAppEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    return {
      appState: "idle",
      setAppState: () => {},
      gutoMood: "breathing",
      activeTab: "lances",
      signalIdle: () => {},
      signalThinking: () => {},
      signalProcessing: () => {},
      signalSuccess: () => {},
      signalError: () => {},
    };
  }
  return ctx;
}

export default AppEnvironmentProvider;
