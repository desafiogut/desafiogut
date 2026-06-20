// useRecursosApp — MC29.1
//
// Controla as funcionalidades disponíveis por PLATAFORMA (modelo de entrega
// híbrido e transparente). Lê a config remota em /.netlify/functions/recursos-app
// (que por dentro usa o adapter data-store). Expõe:
//   { isLeilaoAtivo, isPagamentoNativoAtivo, plataforma, isLoading }
//
// Deteção de plataforma — honesta e SEM regressão para o utilizador real:
//   1. override explícito ?plataforma= (validação/MCP) ou window.__GUT_PLATAFORMA__
//   2. marcador de wrapper nativo window.GUT_NATIVE.platform (build da loja)
//   3. caso contrário → "pwa" (browser puro NUNCA é classificado como nativo,
//      logo o utilizador iOS/Android em Safari/Chrome continua a ver o leilão).
//
// Fail-soft: se a função 404/erro (ex.: vite puro sem Netlify Functions), cai no
// DEFAULT local resolvido para a plataforma detetada — pwa mantém o leilão ativo.

import { useState, useEffect } from "react";

const DEFAULT_RECURSOS = {
  isLeilaoAtivo:          { ios: false, android: false, pwa: true },
  isPagamentoNativoAtivo: { ios: false, android: false, pwa: false },
};

export function detectarPlataforma() {
  if (typeof window === "undefined") return "pwa";
  try {
    const q = new URLSearchParams(window.location.search).get("plataforma");
    if (q === "ios" || q === "android" || q === "pwa") return q;
    if (window.__GUT_PLATAFORMA__) return window.__GUT_PLATAFORMA__;
    const nativa = window.GUT_NATIVE && window.GUT_NATIVE.platform;
    if (nativa === "ios" || nativa === "android") return nativa;
  } catch {
    /* fail-soft */
  }
  return "pwa";
}

function fallbackLocal(plataforma) {
  const plat = ["ios", "android", "pwa"].includes(plataforma) ? plataforma : "pwa";
  return {
    plataforma: plat,
    isLeilaoAtivo: Boolean(DEFAULT_RECURSOS.isLeilaoAtivo[plat]),
    isPagamentoNativoAtivo: Boolean(DEFAULT_RECURSOS.isPagamentoNativoAtivo[plat]),
  };
}

// Cache de módulo: a config é a mesma para toda a app → uma única requisição
// partilhada por todos os consumidores (evita waterfall / duplo fetch).
let _promessa = null;

async function carregarRecursos() {
  const plataforma = detectarPlataforma();
  try {
    const resp = await fetch(`/.netlify/functions/recursos-app?plataforma=${plataforma}`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return {
      plataforma: data.plataforma ?? plataforma,
      isLeilaoAtivo: Boolean(data.isLeilaoAtivo),
      isPagamentoNativoAtivo: Boolean(data.isPagamentoNativoAtivo),
    };
  } catch (err) {
    console.warn("[useRecursosApp] fallback local (config indisponível):", err?.message);
    return fallbackLocal(plataforma);
  }
}

export function useRecursosApp() {
  const [estado, setEstado] = useState({
    isLeilaoAtivo: true, // durante o load o gate é isLoading; default não penaliza PWA
    isPagamentoNativoAtivo: false,
    plataforma: "pwa",
    isLoading: true,
  });

  useEffect(() => {
    let vivo = true;
    if (!_promessa) _promessa = carregarRecursos();
    _promessa
      .then((d) => { if (vivo) setEstado({ ...d, isLoading: false }); })
      .catch(() => {
        _promessa = null; // permite retry numa próxima montagem
        if (vivo) setEstado((s) => ({ ...s, isLoading: false }));
      });
    return () => { vivo = false; };
  }, []);

  return estado;
}
