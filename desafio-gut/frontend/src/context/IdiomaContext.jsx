// MC22.1 — Infraestrutura i18n leve (sem dependência nova; PILAR otimizar > criar).
// Provider ANINHADO (compõe com AppProvider, nunca o substitui — R1).
//
// MC98 — DECLARAÇÃO PT-BR ONLY. O DesafioGUT tem UM idioma.
//   · `en.js` e `es.js` foram REMOVIDOS (imports redireccionados para `pt.js`).
//   · `SUPPORTED` está FECHADO a `["pt"]` — antes aceitava "en"/"es", e uma instalação
//     com `gut_lang=en` em localStorage ficava com `lang="en"` e dicionário PT.
//   · A detecção automática por `navigator.language` foi REMOVIDA: deixava o idioma do
//     aparelho decidir o idioma de um app que só tem um.
//   · `t(key, fallback)` mantém-se — a UI escreve PT nos fallbacks e o dicionário PT é
//     a única fonte. Nenhuma string de UI foi alterada.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import pt from "../i18n/pt.js";

const DICTS = { pt };
const SUPPORTED = ["pt"];
const IDIOMA_PADRAO = "pt";
// O <html> de index.html já diz `lang="pt-BR"`. Antes o runtime sobrescrevia-o com "pt"
// (genérico, lê-se como pt-PT). Mantém-se o `pt-BR`, que é o que este app declara.
const LANG_HTML = "pt-BR";
const STORAGE_KEY = "gut_lang";

function normalize(v) {
  if (!v) return IDIOMA_PADRAO;
  const base = String(v).toLowerCase().split("-")[0];
  return SUPPORTED.includes(base) ? base : IDIOMA_PADRAO;
}

const IdiomaContext = createContext(null);

export function IdiomaProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      // Sem `navigator.language`: só o valor guardado, e sempre saneado por
      // `normalize`. Uma instalação antiga com `gut_lang=en` cai em «pt».
      return normalize(localStorage.getItem(STORAGE_KEY));
    } catch {
      return IDIOMA_PADRAO;
    }
  });

  useEffect(() => {
    try { document.documentElement.lang = LANG_HTML; } catch { /* noop */ }
  }, []);

  const setLang = useCallback((v) => {
    const n = normalize(v);
    setLangState(n);
    try { localStorage.setItem(STORAGE_KEY, n); } catch { /* noop */ }
  }, []);

  // t(key, fallback?) → dicionário PT → fallback → a própria chave.
  const t = useCallback((key, fallback) => {
    const dict = DICTS[lang] || pt;
    return dict[key] ?? pt[key] ?? fallback ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, SUPPORTED }), [lang, setLang, t]);
  return <IdiomaContext.Provider value={value}>{children}</IdiomaContext.Provider>;
}

export function useIdioma() {
  const ctx = useContext(IdiomaContext);
  if (!ctx) throw new Error("useIdioma() requer <IdiomaProvider>");
  return ctx;
}

// Hook de conveniência quando só é preciso o tradutor.
export function useT() {
  return useIdioma().t;
}
