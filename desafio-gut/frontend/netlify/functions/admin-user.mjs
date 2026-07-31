// GET /.netlify/functions/admin-user                            [ADMIN]
//
// MC89.14 (Fase 4). Perfil completo de um utilizador: dados da view,
// saldo R$, créditos, débitos, estado de bloqueio.
//
// ⚠️ NÃO inclui saldo de senhas on-chain (D2 do MC89.5: pedido separado).
// Gate: operador+. Sem cache.

import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { guardAdminNivel } from "./_lib/admin-auth.mjs";
import { getSupabaseReadOnly } from "./_lib/supabase-client.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") {
    return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });
  }

  const rl = await aplicarRateLimit(req, "admin-user", 30);
  if (rl) return rl;

  const negado = await guardAdminNivel(req, "operador");
  if (negado) return negado;

  const url = new URL(req.url);
  const endereco = (url.searchParams.get("endereco") || "").trim().toLowerCase();
  if (!endereco || !/^0x[0-9a-f]{40}$/.test(endereco)) {
    return jsonError(400, "endereco_invalido", "forneça um endereço Ethereum válido");
  }

  const sb = getSupabaseReadOnly();

  // Quatro consultas em paralelo
  const [rView, rSaldo, rCreditos, rDebitos, rBloqueio] = await Promise.allSettled([
    sb.from("vw_utilizadores").select("*").eq("cliente_id", endereco).maybeSingle(),
    sb.from("saldo_rs").select("payload,atualizado_em").eq("cliente_id", endereco).maybeSingle(),
    sb.from("saldo_rs_creditos").select("pedido_id,payload,criado_em").eq("payload->>endereco", endereco).order("criado_em", { ascending: false }).limit(20),
    sb.from("saldo_rs_debitos").select("operacao_id,payload,criado_em").eq("payload->>endereco", endereco).order("criado_em", { ascending: false }).limit(20),
    sb.from("usuarios_bloqueio").select("bloqueado_em,bloqueado_por,justificativa,desbloqueado_em").eq("cliente_id", endereco).order("bloqueado_em", { ascending: false }).limit(1),
  ]);

  const dados = (r, nome) => {
    if (r.status !== "fulfilled" || r.value?.error) return null;
    return r.value.data;
  };

  const perfil  = dados(rView, "view");
  const saldo   = dados(rSaldo, "saldo_rs");
  const creditos = dados(rCreditos, "creditos");
  const debitos  = dados(rDebitos, "debitos");
  const bloqueio = dados(rBloqueio, "bloqueio");

  const bloqueado = bloqueio && Array.isArray(bloqueio) && bloqueio.length > 0
    && !bloqueio[0].desbloqueado_em;

  return jsonResponse({
    perfil: perfil || null,
    saldoRs: saldo ? {
      centavos: saldo.payload?.centavos ?? null,
      atualizadoEm: saldo.atualizado_em,
    } : null,
    creditos: creditos || [],
    debitos: debitos || [],
    bloqueado: !!bloqueado,
    bloqueioDetalhe: bloqueado ? bloqueio[0] : null,
    // ⚠️ saldoSenhas NÃO incluído — é on-chain, pedido separado (D2)
    saldoSenhas: { disponivel: false, motivo: "On-chain — use /admin-user-onchain para carregar" },
  });
};
