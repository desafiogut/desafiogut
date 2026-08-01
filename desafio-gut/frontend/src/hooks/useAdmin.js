// useAdmin — verifica se o endereço Privy atual é admin (REQ-20).
//
// Consulta GET /admin-list e compara com o endereço atual.
// A coordenação é admin automaticamente (já vem na lista do backend).
// Cache por 5 min para evitar polling excessivo.
//
// MC88.34 (P1) — o cache vivia em sessionStorage, que morre com o processo da
// WebView: no APK, TODO arranque a frio era cache-miss e chamava admin-list
// (612–933 ms medidos no MC88.33), inclusive para quem nunca será admin.
// Passa a localStorage mantendo o MESMO TTL de 5 min — a resposta continua a
// ser reavaliada com a mesma frequência, só deixa de ser refeita apenas porque
// a app foi reaberta. O TTL curto é deliberado (promover/remover um admin tem
// de propagar depressa), por isso NÃO foi alongado.

import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";
// MC89.31 — a dica de ENCAMINHAMENTO (24 h) é escrita aqui, onde a resposta do
// backend chega. Não substitui o cache abaixo nem lhe mexe no TTL: são coisas
// diferentes com prazos diferentes de propósito. Ver o cabeçalho de dicaSessao.js.
import { gravarDicaAdmin } from "../lib/dicaSessao.js";

const CACHE_KEY    = "gut_admin_check";
const CACHE_TTL_MS = 5 * 60 * 1000;

function lerCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
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
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, em: Date.now() }));
  } catch {}
}

function limparCache() {
  if (typeof window === "undefined") return;
  // Limpa nos dois: o sessionStorage pode ter um resto da versão anterior.
  try { localStorage.removeItem(CACHE_KEY); } catch {}
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
      const { ok, status, data } = await apiGet(`admin-list?endereco=${encodeURIComponent(enderecoLower)}`);
      if (!ok) throw new Error(`HTTP ${status}`);
      // MC87 (P2-4) — o ramo ?endereco= deixou de devolver a lista de admins (era
      // reconhecimento gratuito para um atacante). Passa a devolver o booleano
      // `isAdmin` sobre o endereço perguntado. O fallback para `data.admins`
      // mantém compatibilidade caso o frontend rode contra um backend antigo.
      const admins  = Array.isArray(data?.admins) ? data.admins.map((a) => String(a).toLowerCase()) : [];
      const coord   = (data?.coordenacao || "").toLowerCase() || null;
      const isAdmin = typeof data?.isAdmin === "boolean"
        ? data.isAdmin
        : admins.includes(enderecoLower);
      const role    = data?.role || (isAdmin ? "admin" : "user");
      gravarCache({ endereco: enderecoLower, isAdmin, role, admins, coordenacao: coord });
      // Só aqui — depois de uma resposta REAL do backend. Um `isAdmin` false
      // apaga a dica, corrigindo um ex-admin no primeiro restauro (não em 24 h).
      gravarDicaAdmin(enderecoLower, isAdmin);
      setEstado({ isAdmin, role, loading: false, error: null, admins, coordenacao: coord });
    } catch (err) {
      // ⚠️ A dica NÃO é apagada aqui. Uma falha de rede não é uma resposta: se
      // apagasse, um admin offline perdia o encaminhamento por causa do WiFi.
      // Só uma negativa VINDA DO BACKEND a remove.
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
