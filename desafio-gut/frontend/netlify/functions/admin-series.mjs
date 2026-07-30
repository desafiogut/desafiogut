// GET /.netlify/functions/admin-series                          [ADMIN]
//
// MC89.7 (Fase 1 do plano do MC89.5) — séries diárias para os gráficos da
// Visão Geral. Duas séries: receita PIX e utilizadores com atividade, ambas
// lidas do Supabase com agrupamento por dia.
//
// ⚠️ NÃO IMPORTA `ethers`. Este endpoint fala só com o Postgres. O que precisa
// de RPC (saldo da EOA, alertas on-chain) vive em `admin-onchain.mjs` e, em
// breve, em `admin-alerts.mjs`.
//
// HONESTIDADE DOS DADOS (RNF-06 do MC89): o backend tem 18 créditos em 6 dias
// distintos e 7 cotas criadas no mesmo dia. O gráfico vai ter muitos dias sem
// dados — e é assim que tem de ser. Preencher com zeros ou interpolar seria
// inventar números. O frontend recebe os dias EXATAMENTE como estão e decide
// como os mostrar.
//
// ⚠️ COTAS NÃO ENTRAM como "novos utilizadores": todas as 7 foram criadas no
// mesmo dia (2026-06-21). Um gráfico com um pico de 7 seguido de 40 dias de
// zero não acrescenta ao cartão "Cotas: 7" que já existe. Em vez disso, a
// série de utilizadores conta endereços DISTINTOS por dia, em todas as fontes.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdmin } from "./_lib/admin-auth.mjs";
import { cacheGet, cacheSet } from "./_lib/cache.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const CHAVE_CACHE = "admin:series:v1";
const TTL_SEG     = 45;

function diasNoIntervalo(dias) {
  const out = [];
  const hoje = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Mapa dia→valor, para preencher a grelha sem inventar zeros. */
function mapaDasLinhas(linhas, chaveDia, chaveValor) {
  const m = new Map();
  for (const l of linhas || []) {
    const dia = String(l[chaveDia] || "").slice(0, 10);
    const val = Number(l[chaveValor]) || 0;
    if (!dia) continue;
    m.set(dia, (m.get(dia) || 0) + val);
  }
  return m;
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-series", 20);
  if (rl) return rl;

  const negado = await guardAdmin(req);
  if (negado) return negado;

  const hit = await cacheGet(CHAVE_CACHE);
  if (hit) return jsonResponse({ ...hit, cache: "hit" });

  const sb = getSupabaseReadOnly();
  const parciais = [];
  const dias = 90;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  // Duas consultas em paralelo. Cada uma degrada sozinha: se uma falhar, a
  // outra continua, e o nome da que falhou entra em `parciais`. O frontend
  // mostra o que tiver e omite o que não tiver — nunca preenche com zero.
  const [rReceita, rUsers] = await Promise.allSettled([
    sb.from("saldo_rs_creditos")
      .select("criado_em, payload")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: true }),
    sb.from("fila_tarefas")
      .select("criado_em, payload")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: true }),
  ]);

  const dados = (r, nome) => {
    if (r.status !== "fulfilled" || r.value?.error) {
      const motivo = r.status === "rejected" ? r.reason?.message : r.value?.error?.message;
      console.warn(`[admin-series] ${nome} falhou:`, motivo);
      parciais.push(nome);
      return null;
    }
    return r.value.data || [];
  };

  const creditos = dados(rReceita, "receita");
  const tarefas  = dados(rUsers,  "fila");

  // ── Receita ───────────────────────────────────────────────────────────────
  const mapaReceita = new Map();
  if (creditos) {
    for (const c of creditos) {
      const dia = String(c.criado_em || "").slice(0, 10);
      const v = Number(c.payload?.valorCentavos) || 0;
      if (!dia) continue;
      mapaReceita.set(dia, (mapaReceita.get(dia) || 0) + v);
    }
  }

  // ── Utilizadores ──────────────────────────────────────────────────────────
  // Só temos uma projeção fiável de endereços por dia a partir das tabelas que
  // já estão no Supabase. A consulta UNION é feita em duas partes (creditos e
  // fila) e complementada com uma terceira consulta às cotas e ao saldo_rs.
  const [rCotas, rSaldo] = await Promise.allSettled([
    sb.from("cotas")
      .select("cliente_id, criado_em")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: true }),
    sb.from("saldo_rs")
      .select("cliente_id, atualizado_em")
      .gte("atualizado_em", desde)
      .order("atualizado_em", { ascending: true }),
  ]);

  const cotas  = dados(rCotas, "cotas");
  const saldo  = dados(rSaldo, "saldo_rs");

  // Agregação: um Set de endereços por dia.
  const mapaUsers = new Map();
  const normalizar = (v) => {
    const s = String(v || "").trim().toLowerCase();
    return /^0x[0-9a-f]{40}$/.test(s) ? s : null;
  };

  const contar = (linhas, campoDia, campoEndereco) => {
    if (!linhas) return;
    for (const l of linhas) {
      const dia = String(l[campoDia] || "").slice(0, 10);
      const end = normalizar(l[campoEndereco]);
      if (!dia || !end) continue;
      if (!mapaUsers.has(dia)) mapaUsers.set(dia, new Set());
      mapaUsers.get(dia).add(end);
    }
  };

  contar(creditos, "criado_em", { payload: (c) => c?.endereco });
  // Para os créditos o endereço está dentro do payload
  if (creditos) {
    for (const c of creditos) {
      const dia = String(c.criado_em || "").slice(0, 10);
      const end = normalizar(c.payload?.endereco);
      if (!dia || !end) continue;
      if (!mapaUsers.has(dia)) mapaUsers.set(dia, new Set());
      mapaUsers.get(dia).add(end);
    }
  }
  contar(cotas,  "criado_em",      "cliente_id");
  contar(saldo,  "atualizado_em",  "cliente_id");
  if (tarefas) {
    for (const t of tarefas) {
      const dia = String(t.criado_em || "").slice(0, 10);
      const end = normalizar(t.payload?.endereco);
      if (!dia || !end) continue;
      if (!mapaUsers.has(dia)) mapaUsers.set(dia, new Set());
      mapaUsers.get(dia).add(end);
    }
  }

  // ── Montar resposta ──────────────────────────────────────────────────────
  // Devolve arrays paralelos: dias[i] → receitaCentavos[i] e usuarios[i].
  // Dias sem dados NÃO APARECEM. O frontend é que decide se mostra o vazio ou
  // omite. Nós não inventamos zero — zero é uma afirmação sobre o mundo, e
  // "não tenho dados desse dia" não é zero.
  const todosOsDias = [...new Set([...mapaReceita.keys(), ...mapaUsers.keys()])].sort();
  const receitaSerie  = todosOsDias.map((d) => mapaReceita.get(d) || null);
  const usuariosSerie = todosOsDias.map((d) => {
    const s = mapaUsers.get(d);
    return s ? s.size : null;
  });

  const payload = {
    dias: todosOsDias,
    receitaCentavos: receitaSerie,
    usuarios:       usuariosSerie,
    totalDias:      todosOsDias.length,
    totalCreditos:  creditos ? creditos.length : null,
    geradoEm: new Date().toISOString(),
    parciais,
  };

  await cacheSet(CHAVE_CACHE, payload, TTL_SEG);
  return jsonResponse({ ...payload, cache: "miss" });
};
