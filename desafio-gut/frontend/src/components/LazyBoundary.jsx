// LazyBoundary — MC39.19 (Onda 2, item 3).
//
// Error boundary para rotas carregadas com React.lazy(). Quando um chunk
// dinâmico falha ao carregar — o caso mais comum é um DEPLOY novo que troca os
// hashes dos arquivos enquanto o usuário está com uma sessão antiga aberta
// (o chunk antigo vira 404) — força UM reload da página para buscar o manifesto
// novo. Guarda contra loop de reload via sessionStorage (gotcha vite-patterns).
//
// Para erros não relacionados a chunk, mostra um fallback discreto (sem crashar o app).

import { Component } from "react";

const RELOAD_FLAG = "gut_lazy_reload";

function isChunkLoadError(err) {
  const msg = String(err?.message || err || "");
  return (
    /failed to fetch dynamically imported module/i.test(msg) ||
    /loading chunk [\d]+ failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg)
  );
}

export default class LazyBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro) {
    if (isChunkLoadError(erro) && typeof window !== "undefined") {
      // Recarrega UMA vez (chunk 404 pós-deploy). Flag evita loop se o reload
      // não resolver (ex.: offline real).
      let jaRecarregou = false;
      try { jaRecarregou = sessionStorage.getItem(RELOAD_FLAG) === "1"; } catch { /* noop */ }
      if (!jaRecarregou) {
        try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch { /* noop */ }
        window.location.reload();
      }
    }
  }

  componentDidMount() {
    // Sucesso ao montar → limpa a flag para permitir um futuro reload se outro
    // deploy acontecer nesta sessão.
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* noop */ }
  }

  render() {
    if (this.state.erro && !isChunkLoadError(this.state.erro)) {
      return (
        this.props.fallback ?? (
          <div role="alert" style={{ padding: "2rem", color: "#e8f0fe", textAlign: "center" }}>
            <p style={{ color: "#94a3b8" }}>Não foi possível carregar esta seção.</p>
            <button
              onClick={() => { try { window.location.reload(); } catch { /* noop */ } }}
              style={{ marginTop: "0.75rem", padding: "0.5rem 1rem", background: "#f5a623", color: "#0a0f1a", border: "none", borderRadius: "8px", fontWeight: 800, cursor: "pointer" }}
            >↻ Recarregar</button>
          </div>
        )
      );
    }
    // Erro de chunk → o componentDidCatch já disparou reload; renderiza vazio no intervalo.
    if (this.state.erro) return null;
    return this.props.children;
  }
}
