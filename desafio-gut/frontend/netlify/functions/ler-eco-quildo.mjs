// GET /.netlify/functions/ler-eco-quildo — UTAC110e. Saldo + histórico de ECOQUILDO do TITULAR.
//
// PORQUE UM ENDPOINT E NÃO O SDK: `public.eco_quildo` é uma tabela com RLS LIGADO e SEM policy para
// `anon`/`authenticated`, e com os privilégios de tabela REVOGADOS desses dois papéis (ver o bloco de
// segurança da migração `20261014_utac110e_eco_quildo.sql`) — o cliente anónimo do frontend NÃO a pode
// ler. O `endereco` sai do Bearer, nunca do query.
// ⚠️ CORRECÇÃO de um comentário MEU, FALSO, apanhado pelo validador adversarial (UTAC110e / SEG5, achado
//    A1): a 1.ª versão dizia «tem RLS só para `service_role` (a migração … não abre policy a
//    anon/authenticated)». Era FALSO — a migração não ligava RLS nenhum e não revogava grants, pelo que
//    o papel `anon` (a chave pública que vai no bundle) podia inserir/actualizar/apagar saldo e lastro.
//    O texto errado fica à vista, marcado; a correcção foi feita na migração E aqui.
//
// Header: Authorization: Bearer ***
//
// 200 { ok, saldo, historico, centavosPorEcoQuildo }
// 401 token_ausente|token_invalido · 405 metodo_invalido · 503 sistema_pausado|store_indisponivel
//
// Padrão herdado POR LEITURA de `ler-pontos.mjs` (Bearer → endereco; erros snake_case).
// ⚠️ Este ficheiro NÃO escreve nada — é leitura pura do titular.
import { jsonResponse, jsonError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { lerEcoQuildo, CENTAVOS_POR_ECOQUILDO } from "./_lib/eco-quildo.mjs";

async function titular(req) {
  const h = req.headers.get("authorization") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!bearer) return { erro: "token_ausente" };
  try {
    const p = await verificarUserSession(bearer);
    const e = String(p?.endereco || "").toLowerCase();
    return /^0x[0-9a-f]{40}$/.test(e) ? { endereco: e } : { erro: "token_invalido" };
  } catch { return { erro: "token_invalido" }; }
}

export default async (req) => {
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "GET") return jsonError(405, "metodo_invalido", "use GET", { allowed: ["GET"] });

  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  let registo;
  try {
    registo = await lerEcoQuildo(t.endereco);
  } catch {
    return jsonError(503, "store_indisponivel", "não foi possível ler o ECOQUILDO");
  }

  return jsonResponse({
    ok: true,
    saldo: Number(registo?.saldo ?? 0),
    historico: Array.isArray(registo?.historico) ? registo.historico : [],
    // Art. 47º — a razão do lastro vai na resposta para a UI poder escrever «1 ECOQUILDO = R$ 1,00»
    // sem a duplicar no frontend (fonte única: `_lib/eco-quildo.mjs`).
    centavosPorEcoQuildo: CENTAVOS_POR_ECOQUILDO,
  });
};
