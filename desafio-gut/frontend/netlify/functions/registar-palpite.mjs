// POST /.netlify/functions/registar-palpite — UTAC106f. Palpite do Passe Desafio Via B (BÓNUS).
//
// ⚠️ O palpite é BÓNUS (50 ECOQUILDO se for o mais próximo — UTAC150, v8.0; eram +2 pontos) — **NÃO decide o cartão**. O cartão é
//    SÓ por pontos de COMPRA (50) — requisito crítico da Google Play (jogo de habilidade).
//
// Header: Authorization: Bearer ***   ·   Body: { edicaoId, valor }   (idempotencyKey opcional:
// a chave natural é (endereco, edicaoId) — 1 palpite por edição).
//
// 201 { ok, idempotent:false, palpite }   palpite registado
// 200 { ok, idempotent:true,  palpite }   já tinha palpitado nesta edição (nada mudou)
// 400 edicaoId_invalido|valor_invalido · 401 token_ausente|token_invalido
// 404 edicao_inexistente · 405 metodo_invalido · 409 sem_passe (nunca comprou um Passe)
// 400 sem_passes_disponiveis (UTAC147: 1 Passe Programado = 1 palpite) · 502 inventario_indisponivel
// 503 sistema_pausado|store_indisponivel
//
// Padrão herdado POR LEITURA de `comprar-passe-pontos.mjs` (Bearer → endereco; códigos de erro
// em snake_case; sem dados pessoais em logs).
import { jsonResponse, jsonError, parseJsonBody, ValidationError } from "./_lib/validate.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";
import { sistemaPausado, lerEstadoSistema } from "./_lib/system-state.mjs";
import { buscarEdicao } from "./_lib/edicoes-core.mjs";
import { registarPalpite } from "./_lib/passe-pontos.mjs";
import { EDICAO_ESPECIAL_RE, verificarJanelaLance } from "./_lib/edicao-janela.mjs"; // UTAC149-val — janela da especial
// UTAC136 — Regulamento v6.0: o palpite era GRATUITO (bónus de engajamento).
// ⛔ UTAC147 (decisão do operador, 2026-11-21 — modelo de Passes diretos): **1 Passe Programado = 1 palpite**.
// Volta o consumo do inventário (o padrão do UTAC120): consome antes de registar e DEVOLVE quando o registo
// falha ou é idempotente (já tinha palpitado) — o efeito líquido é sempre 1 Passe por palpite registado.
import { consumirPasse, devolverPasse } from "./_lib/passes-inventario.mjs";

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
  if (req.method !== "POST") return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });

  const rl = await aplicarRateLimit(req, "registar-palpite", 10);
  if (rl) return rl;
  if (sistemaPausado(await lerEstadoSistema())) {
    return jsonError(503, "sistema_pausado", "Sistema em manutenção. Tente novamente em breve.");
  }

  const t = await titular(req);
  if (t.erro) return jsonError(401, t.erro, "Authorization: Bearer *** válido obrigatório");

  let body;
  try { body = await parseJsonBody(req); }
  catch (err) { if (err instanceof ValidationError) return jsonError(400, err.code, err.message); throw err; }

  const edicaoId = typeof body?.edicaoId === "string" ? body.edicaoId : "";
  const valor = body?.valor;
  // Inteiro ≥ 0 (nº de lances previstos). `Number.isInteger` rejeita "12", 12.5, null, Infinity.
  if (!Number.isInteger(valor) || valor < 0 || valor > 1000000) {
    return jsonError(400, "valor_invalido", "envie { valor } inteiro entre 0 e 1000000");
  }

  // A edição tem de existir E estar ACTIVA (UTAC106g, decisão #6): Programada (`tipo:"programado"`)
  // e aberta (`status:"aberto"`). Sem isto, pela API podia palpitar-se numa edição Relâmpago ou já
  // encerrada/terminada — desvio do contrato que o próprio ficheiro declarava.
  // ⚠️ Medido no repo: os campos são `tipo` ("programado"|"relampago") e `status`
  // ("agendado"|"aberto"|"encerrado"|"apurado") — NÃO `tipo:"programada"` nem `estado:"aberta"`
  // (o enunciado usava esses nomes; refutados por medição em `_lib/edicoes-core.mjs`).
  let edicao;
  try { edicao = await buscarEdicao(edicaoId); }
  catch { return jsonError(503, "store_indisponivel", "não foi possível ler a edição"); }
  if (!edicao) return jsonError(404, "edicao_inexistente", "edição não encontrada");
  if (edicao.tipo !== "programado") {
    return jsonError(409, "edicao_nao_programada", "só se palpita em edições Programadas");
  }
  if (edicao.status !== "aberto") {
    return jsonError(409, "edicao_nao_aberta", `a edição está "${edicao.status}" — o palpite só abre enquanto decorre`);
  }
  // UTAC149-val (SEG4 ⚠️1) — a ESPECIAL Programada (ex.: ESPECIAL-PALPITE1) tem janela própria inicio_em..termino_em
  // («Palpites até 09/12 às 23:59», R18-149-A). O `status` só passa a «encerrado» pelo cron
  // `scheduled-encerrar-especial`, que em produção não lê o Blob (scheduled sem contexto de Blobs, MC88.31): a
  // ESPECIAL-AIRFRYER continua «aberto» 53 dias depois do fim. Sem esta guarda, um palpite entrava DEPOIS do fecho
  // anunciado. Mesma regra (e mesma fronteira: o último ms ainda aceita) da guarda de lances. PROG-N: inalteradas.
  if (EDICAO_ESPECIAL_RE.test(edicaoId) && verificarJanelaLance(edicao)) {
    return jsonError(409, "edicao_nao_aberta", "o palpite desta edição especial está fora do prazo");
  }

  // UTAC147 — paga-se com 1 Passe Programado (atómico no Postgres: só desconta com stock ⇒ nunca negativo).
  const passe = await consumirPasse({ endereco: t.endereco, tipo: "programado" })
    .catch(() => ({ ok: false, code: "inventario_indisponivel" }));
  if (!passe.ok) {
    if (passe.code === "sem_passes") {
      return jsonError(400, "sem_passes_disponiveis",
        "Precisa de 1 Passe Programado para palpitar. Compre Passes para participar.", { passesProgramado: 0 });
    }
    return jsonError(502, "inventario_indisponivel", "não foi possível verificar os seus Passes; tente de novo", { motivo: passe.code });
  }
  // O Passe volta quando o palpite não foi registado AGORA (falha ou repetição). Best-effort: uma falha fica no log.
  const devolver = async () => {
    const d = await devolverPasse({ endereco: t.endereco, tipo: "programado" }).catch(() => ({ ok: false }));
    if (!d.ok) console.error("[registar-palpite] devolver o Passe Programado falhou");
  };

  let r;
  try { r = await registarPalpite(t.endereco, edicaoId, valor); }
  catch { await devolver(); return jsonError(503, "store_indisponivel", "não foi possível registar o palpite"); }

  if (!r.ok || !r.criado) await devolver();

  if (!r.ok) {
    // `SEM_PASSE` = FK para public.pontos (endereço sem linha de pontos). Qualquer login cria a linha
    // (login diário / boas-vindas), por isso na prática não bloqueia; mudar isto exigiria schema.
    if (r.code === "SEM_PASSE") {
      return jsonError(409, "sem_passe", "é preciso ter comprado pelo menos 1 Passe para palpitar");
    }
    if (r.code === "EDICAO_INVALIDA") return jsonError(400, "edicaoId_invalido", "edicaoId inválido");
    if (r.code === "VALOR_INVALIDO") return jsonError(400, "valor_invalido", "valor inválido");
    // UTAC106g (R2): a edição já foi apurada ⇒ não aceita palpites novos.
    if (r.code === "EDICAO_APURADA") {
      return jsonError(409, "edicao_apurada", "esta edição já foi apurada — não aceita palpites novos");
    }
    return jsonError(502, "palpite_falhou", "não foi possível registar o palpite", { motivo: r.code });
  }

  const palpite = { edicaoId: r.palpite.edicao_id, valor: r.palpite.valor, criadoEm: r.palpite.criado_em };
  return r.criado
    ? jsonResponse({ ok: true, idempotent: false, palpite, passeConsumido: true,
        passesProgramadoRestantes: Number.isInteger(passe.restantes) ? passe.restantes : null }, 201)
    : jsonResponse({ ok: true, idempotent: true, palpite, passeConsumido: false }, 200);
};
