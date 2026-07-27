// MC82.2 — Arranque leve: decide se já é preciso carregar a app (e o Privy).
//
// O gate LGPD é a PRIMEIRA tela e não usa Privy para nada. Antes ele renderizava
// dentro do <PrivyProvider>, o que obrigava o arranque a parsear 4.002 KB de JS
// (2.745 KB só do chunk `privy`) para desenhar quatro checkboxes — medido no
// aparelho em MC82-BASELINE.txt (LCP 2.220 ms, FCP 1.292 ms).
//
// Este componente só importa o que o gate precisa. Tudo o resto (PrivyProvider,
// AppContext, rotas, ethers/viem) vive atrás do import dinâmico de PrivyRoot.jsx.
import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import TermosConsentimento, {
  CHAVE_CONSENTIMENTO,
  VERSAO_CONSENTIMENTO,
} from "./components/TermosConsentimento.jsx";
import BackgroundCanvas from "./widgets/layout/BackgroundCanvas.jsx";
import { carregarSentry } from "./lib/sentryLazy.js";

const PrivyRoot = lazy(() => import("./PrivyRoot.jsx"));

// Lê o consentimento de forma SÍNCRONA no primeiro render. Antes isto era um
// useEffect no App.jsx, o que fazia o gate piscar por um frame em quem já tinha
// aceite nesta sessão.
//
// MC88.31 (Achado 7 do MC88.30) — lê primeiro o localStorage (novo) e só depois
// o sessionStorage (antigo), para quem já aceitou na sessão em curso não ser
// questionado outra vez durante a transição. O aceite só vale para a versão
// corrente do regulamento.
function consentimentoJaAceito() {
  try {
    const salvo = localStorage.getItem(CHAVE_CONSENTIMENTO)
               ?? sessionStorage.getItem(CHAVE_CONSENTIMENTO);
    if (!salvo) return false;
    const c = JSON.parse(salvo);
    return !!(c?.aceito && c?.versao === VERSAO_CONSENTIMENTO);
  } catch {
    try { localStorage.removeItem(CHAVE_CONSENTIMENTO); } catch { /* sem storage */ }
    try { sessionStorage.removeItem(CHAVE_CONSENTIMENTO); } catch { /* sem storage */ }
    return false;
  }
}

export default function Boot() {
  const { pathname } = useLocation();
  const [aceito, setAceito] = useState(consentimentoJaAceito);

  // MC72 — a página pública de exclusão de conta (exigência Play Store) tem de ser
  // acessível sem passar pelo gate; continua dentro dos providers, por isso entra
  // pelo caminho normal do PrivyRoot.
  const rotaPublicaExclusao = pathname === "/excluir-conta";
  const carregarApp = aceito || rotaPublicaExclusao;

  // NOTA (MC82.2): houve aqui um prefetch em requestIdleCallback para adiantar o
  // chunk enquanto o utilizador lia o regulamento. Foi REMOVIDO após medição: um
  // `import()` não descarrega apenas — também AVALIA o módulo, portanto os
  // 2,6 MB do Privy voltavam a ser parseados poucos instantes depois do gate
  // aparecer (17 chunks carregados, verificado no preview). Num aparelho lento
  // isso devolve o jank logo a seguir ao primeiro paint, que é exatamente o que
  // este MC quer evitar. O custo passa a ser pago uma única vez, ao aceitar, com
  // o fallback do Suspense visível — e no APK os assets são locais, sem rede.
  // Se um dia se quiser adiantar o download SEM avaliar, o caminho é
  // <link rel="prefetch">, não import().

  // MC82.3 — sobe o Sentry (257,8 KB) assim que a aplicação vai montar, nunca no
  // gate. É deliberadamente DEPOIS do chunk da app entrar em carregamento, para
  // não competir com ele pelo mesmo instante de CPU. Até aqui, tudo o que a app
  // quisesse reportar ficou em fila no sentryLazy e é drenado no init.
  useEffect(() => {
    if (!carregarApp) return;
    const subir = () => { carregarSentry(); };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(subir, { timeout: 5000 });
      return () => cancelIdleCallback?.(id);
    }
    const t = setTimeout(subir, 2000);
    return () => clearTimeout(t);
  }, [carregarApp]);

  if (!carregarApp) {
    return (
      <>
        {/* MC20.2 — Arena oficial (-z-50), visível também no gate (paridade R1/R5). */}
        <BackgroundCanvas />
        {/* O próprio TermosConsentimento já grava `gut_consentimento` no
            localStorage (MC88.31; era sessionStorage) antes de chamar
            onAceitar, por isso aqui só se comuta o estado — duplicar a escrita
            arriscava sobrepor o objeto que ele monta. */}
        <TermosConsentimento onAceitar={() => setAceito(true)} />
      </>
    );
  }

  // O BackgroundCanvas do fallback mantém a arena na tela enquanto o chunk chega,
  // evitando um flash preto entre o gate e a aplicação.
  return (
    <Suspense fallback={<BackgroundCanvas />}>
      <PrivyRoot />
    </Suspense>
  );
}
