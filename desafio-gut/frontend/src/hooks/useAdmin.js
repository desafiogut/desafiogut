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

// Estado que corresponde a UM endereço, calculado de forma síncrona: cache se
// existir para ESTE endereço, senão "a carregar". Carrega o `endereco` consigo
// para que se possa saber, mais tarde, a quem é que este estado pertence.
export function estadoPara(endereco) {
  const lower = (endereco || "").toLowerCase();
  const c = lerCache();
  if (c && c.endereco === lower) {
    return { isAdmin: !!c.isAdmin, role: c.role || (c.isAdmin ? "admin" : "user"), loading: false, error: null, admins: c.admins || [], coordenacao: c.coordenacao || null, endereco: lower };
  }
  return { isAdmin: false, role: "user", loading: !!endereco, error: null, admins: [], coordenacao: null, endereco: lower };
}

/**
 * Devolve o estado que vale AGORA para `endereco`.
 *
 * Se o estado guardado pertencer a outro endereço (tipicamente ao "endereço
 * nenhum" do arranque), ele não é resposta a esta pergunta e é substituído pelo
 * estado deste endereço — cache se houver, `loading:true` se não houver. É esta
 * função que garante que NUNCA se devolve um `isAdmin:false` definitivo sobre
 * uma pergunta que ainda não foi feita.
 *
 * Exportada para poder ser testada sem React (não há runner de React aqui).
 */
export function reconciliar(estado, endereco) {
  return estado.endereco === (endereco || "").toLowerCase()
    ? estado
    : estadoPara(endereco);
}

export function useAdmin(endereco) {
  const [estado, setEstado] = useState(() => estadoPara(endereco));

  // MC89.31 — RECONCILIAÇÃO SÍNCRONA quando o `endereco` muda.
  //
  // DEFEITO MEDIDO no aparelho (fix-q1, marca `portao_acesso_restrito` aos
  // 1582 ms): `endereco` começa null e só resolve quando o Privy restaura. O
  // estado guardado era, nesse instante, `{ isAdmin:false, loading:false }` —
  // um NÃO definitivo sobre uma pergunta que ainda não tinha sido feita. Quem
  // atualizava era o `useEffect` abaixo, que corre DEPOIS da renderização; no
  // fotograma pelo meio, `isConnected` já era true e o AdminLayout mostrava
  // "Acesso restrito. Seu endereço … não está na lista de admins" a um admin
  // legítimo.
  //
  // Antes do MC89.31 isto quase nunca se via, porque o ADM só chegava a /admin
  // DEPOIS de `isAdmin` já ser true. Ao encaminhar cedo, o encontro passou a
  // ser garantido. O encaminhamento não criou o defeito — tornou-o visível.
  //
  // A correção é derivar durante a renderização em vez de esperar pelo efeito:
  // enquanto o estado guardado for de OUTRO endereço, ele não vale, e o que
  // vale é o estado deste — cache se houver, `loading:true` se não houver.
  // Nunca um false definitivo. Beneficia todos os consumidores: a Sidebar, o
  // BottomNav e o ChatbotWidget também escondiam o acesso admin nesse fotograma.
  const estadoAtual = reconciliar(estado, endereco);

  const carregar = async (force = false) => {
    if (!endereco) {
      setEstado({ isAdmin: false, role: "user", loading: false, error: null, admins: [], coordenacao: null, endereco: "" });
      return;
    }
    const enderecoLower = endereco.toLowerCase();
    if (!force) {
      const c = lerCache();
      if (c && c.endereco === enderecoLower) {
        setEstado({ isAdmin: !!c.isAdmin, role: c.role || (c.isAdmin ? "admin" : "user"), loading: false, error: null, admins: c.admins || [], coordenacao: c.coordenacao || null, endereco: enderecoLower });
        return;
      }
    }
    // Parte do estado DESTE endereço, não do que lá estava: se o anterior era
    // de outra conta, `...s` arrastaria o `isAdmin` dela para dentro do
    // carregamento seguinte.
    setEstado({ ...estadoPara(endereco), loading: true, error: null });
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
      setEstado({ isAdmin, role, loading: false, error: null, admins, coordenacao: coord, endereco: enderecoLower });
    } catch (err) {
      // ⚠️ A dica NÃO é apagada aqui. Uma falha de rede não é uma resposta: se
      // apagasse, um admin offline perdia o encaminhamento por causa do WiFi.
      // Só uma negativa VINDA DO BACKEND a remove.
      setEstado({ isAdmin: false, role: "user", loading: false, error: err?.message || "falha", admins: [], coordenacao: null, endereco: enderecoLower });
    }
  };

  useEffect(() => { carregar(false); /* eslint-disable-next-line */ }, [endereco]);

  return {
    ...estadoAtual,
    refresh: () => carregar(true),
    invalidate: () => { limparCache(); carregar(true); },
  };
}
