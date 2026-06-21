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
import { supabaseConfigurado, getSupabaseBrowser } from "../lib/supabaseClient";
import { useRealtimeConfig } from "./useRealtimeConfig";

const DEFAULT_RECURSOS = {
  isLeilaoAtivo:          { ios: false, android: false, pwa: true },
  isPagamentoNativoAtivo: { ios: false, android: false, pwa: false },
};

const CHAVE_RECURSOS = "recursos_app";

/** Resolve os booleanos da plataforma a partir do objeto de config (espelha
 *  resolverRecursos do backend — _lib/recursos-app-config.mjs). */
function resolverParaPlataforma(config, plataforma) {
  const plat = ["ios", "android", "pwa"].includes(plataforma) ? plataforma : "pwa";
  const cfg = config && typeof config === "object" ? config : DEFAULT_RECURSOS;
  const ler = (chave) => {
    const mapa = cfg[chave] && typeof cfg[chave] === "object" ? cfg[chave] : DEFAULT_RECURSOS[chave];
    return Boolean(mapa?.[plat]);
  };
  return {
    plataforma: plat,
    isLeilaoAtivo: ler("isLeilaoAtivo"),
    isPagamentoNativoAtivo: ler("isPagamentoNativoAtivo"),
  };
}

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

  // MC32.1 — leitura direta de config_remota via Supabase (ANON_KEY, RLS pública),
  // só quando VITE_SUPABASE_* estão definidos. Sem config → cai no caminho atual
  // (função recursos-app) → ZERO regressão. Falha de leitura → fail-soft p/ função.
  if (supabaseConfigurado()) {
    try {
      const sb = await getSupabaseBrowser();
      if (sb) {
        const { data, error } = await sb
          .from("config_remota")
          .select("valor")
          .eq("chave", CHAVE_RECURSOS)
          .maybeSingle();
        if (error) throw error;
        return resolverParaPlataforma(data?.valor, plataforma);
      }
    } catch (err) {
      console.warn("[useRecursosApp] Supabase indisponível, fallback função:", err?.message);
    }
  }

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

  // MC34 — atualização em tempo real: quando config_remota:recursos_app muda,
  // re-resolve para a plataforma atual sem recarregar a página. Inerte sem
  // VITE_SUPABASE_* (mantém o carregamento inicial como fallback → zero regressão).
  useRealtimeConfig(CHAVE_RECURSOS, (valor) => {
    setEstado({ ...resolverParaPlataforma(valor, detectarPlataforma()), isLoading: false });
  });

  return estado;
}
