// MC22.1 — Infraestrutura i18n leve (sem dependência nova; PILAR otimizar > criar).
// Provider ANINHADO (compõe com AppProvider, nunca o substitui — R1). Persiste o
// idioma em localStorage (gut_lang) e atualiza <html lang>. Fallback: PT por chave.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import pt from "../i18n/pt.js";
import en from "../i18n/en.js";
import es from "../i18n/es.js";

const DICTS = { pt, en, es };
const SUPPORTED = ["pt", "en", "es"];
const STORAGE_KEY = "gut_lang";

function normalize(v) {
  if (!v) return "pt";
  const base = String(v).toLowerCase().split("-")[0];
  return SUPPORTED.includes(base) ? base : "pt";
}

const IdiomaContext = createContext(null);

export function IdiomaProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY) || navigator.language);
    } catch {
      return "pt";
    }
  });

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch { /* noop */ }
  }, [lang]);

  const setLang = useCallback((v) => {
    const n = normalize(v);
    setLangState(n);
    try { localStorage.setItem(STORAGE_KEY, n); } catch { /* noop */ }
  }, []);

  // t(key, fallback?) → dict[lang] -> PT -> fallback -> a própria chave.
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
