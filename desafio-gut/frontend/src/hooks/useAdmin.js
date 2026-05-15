// useAdmin — verifica se o endereço Privy atual é admin (REQ-20).
//
// Consulta GET /admin-list e compara com o endereço atual.
// A coordenação é admin automaticamente (já vem na lista do backend).
// Cache em sessionStorage por 5 min para evitar polling excessivo.

import { useEffect, useState } from "react";

const CACHE_KEY    = "gut_admin_check";
const CACHE_TTL_MS = 5 * 60 * 1000;

function lerCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.em !== "number") return null;
    if (Date.now() - parsed.em > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function gravarCache(payload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, em: Date.now() }));
  } catch {}
}

function limparCache() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

export function useAdmin(endereco) {
  const [estado, setEstado] = useState(() => {
    const c = lerCache();
    if (c && c.endereco === (endereco || "").toLowerCase()) {
      return { isAdmin: !!c.isAdmin, role: c.role || (c.isAdmin ? "admin" : "user"), loading: false, error: null, admins: c.admins || [], coordenacao: c.coordenacao || null };
    }
    return { isAdmin: false, role: "user", loading: !!endereco, error: null, admins: [], coordenacao: null };
  });

  const carregar = async (force = false) => {
    if (!endereco) {
      setEstado({ isAdmin: false, role: "user", loading: false, error: null, admins: [], coordenacao: null });
      return;
    }
    const enderecoLower = endereco.toLowerCase();
    if (!force) {
      const c = lerCache();
      if (c && c.endereco === enderecoLower) {
        setEstado({ isAdmin: !!c.isAdmin, role: c.role || (c.isAdmin ? "admin" : "user"), loading: false, error: null, admins: c.admins || [], coordenacao: c.coordenacao || null });
        return;
      }
    }
    setEstado((s) => ({ ...s, loading: true, error: null }));
    try {
      const resp = await fetch(`/.netlify/functions/admin-list?endereco=${encodeURIComponent(enderecoLower)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data    = await resp.json();
      const admins  = Array.isArray(data?.admins) ? data.admins.map((a) => String(a).toLowerCase()) : [];
      const coord   = (data?.coordenacao || "").toLowerCase() || null;
      const isAdmin = admins.includes(enderecoLower);
      const role    = data?.role || (isAdmin ? "admin" : "user");
      gravarCache({ endereco: enderecoLower, isAdmin, role, admins, coordenacao: coord });
      setEstado({ isAdmin, role, loading: false, error: null, admins, coordenacao: coord });
    } catch (err) {
      setEstado({ isAdmin: false, role: "user", loading: false, error: err?.message || "falha", admins: [], coordenacao: null });
    }
  };

  useEffect(() => { carregar(false); /* eslint-disable-next-line */ }, [endereco]);

  return {
    ...estado,
    refresh: () => carregar(true),
    invalidate: () => { limparCache(); carregar(true); },
  };
}
