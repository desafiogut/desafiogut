// Exportação de dados do titular — LGPD art. 18 / Mega Comando 3 / Item 2.
//
// POST /.netlify/functions/exportar-dados
// Headers: Authorization: Bearer <user-session>
// Body:    { "endereco": "0x..." }
//
// Retorna JSON único com TODOS os dados do address. Autorização granular:
//   - owner (JWT.endereco === body.endereco) OU
//   - admin (admin-access JWT).
//
// Stores coletados: saldo-rs, wallet, cotas, renovacao-adesao, voucher,
// consent-log (entradas do address), lance-idem (idem) e pedidos (idem).
//
// MC104 (LGPD art. 18 — acesso a TODOS os dados do titular, e SÓ aos dele):
//   - pedidos casam também por `comprador` (é o campo do pedido; antes nunca casavam);
//   - `lances_relampago`: só os lances DO titular dentro do Blob legado por edição;
//   - `supabase`: as tabelas onde o sistema vive desde o MC36.1 (saldo R$, créditos/débitos PIX,
//     Vale-Crédito, troco, cotas, lances, lojista, actividade, pontuação e ranking da competição),
//     cada uma filtrada pelo titular. Os Blobs legados continuam exportados como antes (HARD GATE 4).
//   - `consent_log` já inclui o aceite do gate legal (MC104 Frente A).

import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import {
  jsonResponse, jsonError, validarEndereco, ValidationError,
  parseJsonBody, validarOwnerOuAdmin, mascararEndereco,
} from "./_lib/validate.mjs";
import { getSupabaseReadOnly, supabaseConfigurado } from "./_lib/supabase-client.mjs";
import { aplicarRateLimit } from "./_lib/rate-limiter.mjs";
import { verificarUserSession } from "./_lib/jwt.mjs";
import { getAdminAddresses } from "./_lib/admin-helpers.mjs";
import { registrarFalhaJwt } from "./_lib/jwt-fail-counter.mjs";
import { respostaPreflight } from "./_lib/cors.mjs";

const STORES_POR_CHAVE = ["saldo-rs", "wallet", "cotas", "renovacao-adesao", "voucher"];

function abrirStore(name) {
  try { return getStore({ name, consistency: "strong" }); }
  catch (err) {
    console.warn(`[exportar-dados] Blobs ${name} indisponível:`, err?.message);
    return null;
  }
}

async function coletarPorChave(nome, endereco) {
  const store = abrirStore(nome);
  if (!store) return null;
  try {
    return await store.get(endereco, { type: "json" });
  } catch (err) {
    console.warn(`[exportar-dados] get ${nome}:${mascararEndereco(endereco)} falhou:`, err?.message);
    return null;
  }
}

async function coletarConsentLog(endereco) {
  const store = abrirStore("consent-log");
  if (!store) return [];
  const out = [];
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      if (!key.endsWith(":" + endereco)) continue;
      try {
        const obj = await store.get(key, { type: "json" });
        if (obj) out.push({ key, ...obj });
      } catch {}
    }
  } catch (err) {
    console.warn("[exportar-dados] list consent-log falhou:", err?.message);
  }
  return out;
}

async function coletarPorValor(nome, endereco) {
  const store = abrirStore(nome);
  if (!store) return [];
  const out = [];
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      try {
        const obj = await store.get(key, { type: "json" });
        const enderecoObj = String(obj?.endereco || obj?.address || obj?.comprador || "").toLowerCase();
        if (enderecoObj === endereco) out.push({ key, ...obj });
      } catch {}
    }
  } catch (err) {
    console.warn(`[exportar-dados] list ${nome} falhou:`, err?.message);
  }
  return out;
}

// Blob legado `lances-relampago`: chave = edição, valor = { lances:[…de TODOS…] }. Só os do titular.
async function coletarLancesLegado(endereco) {
  const store = abrirStore("lances-relampago");
  if (!store) return [];
  const out = [];
  try {
    const { blobs } = await store.list();
    for (const { key } of blobs) {
      try {
        const obj = await store.get(key, { type: "json" });
        for (const l of Array.isArray(obj?.lances) ? obj.lances : []) {
          if (String(l?.endereco || "").toLowerCase() === endereco) out.push({ edicaoId: key, ...l });
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[exportar-dados] list lances-relampago falhou:", err?.message);
  }
  return out;
}

// [tabela, coluna do titular]. `payload->>endereco` = registos fiscais (JSONB).
const SUPA_POR_COLUNA = [
  ["saldo_rs", "cliente_id"],
  ["troco_senhas", "cliente_id"],
  ["wallet", "cliente_id"],
  ["saldo_rs_creditos", "payload->>endereco"],
  ["saldo_rs_debitos", "payload->>endereco"],
  ["lances", "endereco"],
  ["lojistas", "endereco"],
  ["atividade_utilizadores", "endereco"],
  ["pontuacoes", "endereco"],
  ["rankings_ciclo", "endereco"],
  ["passes", "endereco"],   // MC105a.1 — Passe Desafio (LGPD art. 18)
  // UTAC110j.2 (DEBT-046) — tabelas que o 110j.1 passou a apagar/anonimizar e que a exportação nunca
  // mostrava: o titular podia ELIMINAR dados que a PORTABILIDADE nunca lhe deu (art. 18, II e V).
  ["pontos", "endereco"],                 // fidelidade (saldo + histórico)
  ["palpites", "endereco"],               // histórico de palpites
  ["resgates", "endereco"],               // resgates do cartão — inclui a morada, que é dado DELE
  ["eco_quildo", "endereco"],             // saldo e histórico do ECOQUILDO
  ["google_play_compras", "endereco"],    // compras feitas no Android
  ["cotas_pagas", "payload->>endereco"],  // pagamentos de cotas (prova fiscal)
  ["wallet_idem", "payload->>endereco"],  // idempotência de operações de carteira
];

async function coletarSupabase(endereco) {
  if (!supabaseConfigurado()) return { disponivel: false };
  const sb = getSupabaseReadOnly();
  const tabelas = {};
  const erros = [];
  for (const [tabela, coluna] of SUPA_POR_COLUNA) {
    const { data, error } = await sb.from(tabela).select("*").eq(coluna, endereco);
    if (error) { erros.push(`${tabela}: ${error.message}`); tabelas[tabela] = null; continue; }
    tabelas[tabela] = data ?? [];
  }
  // cotas: o titular pode estar em cliente_id OU em endereco (como no conta-delete).
  const { data: cotas, error: errCotas } = await sb.from("cotas").select("*")
    .or(`cliente_id.eq.${endereco},endereco.eq.${endereco}`);
  if (errCotas) { erros.push(`cotas: ${errCotas.message}`); tabelas.cotas = null; }
  else tabelas.cotas = cotas ?? [];
  return { disponivel: true, tabelas, erros };
}

// ─────────────────────── UTAC110j.2 — INDICAÇÕES (Blobs) ───────────────────────
// O programa de indicação vive em 5 stores e não entrava na exportação. O titular tem direito ao SEU
// código, aos SEUS bónus e aos vínculos em que participou — mas NÃO ao endereço de quem o indicou nem
// de quem ele indicou: terceiros saem pseudonimizados, como no `conta-delete`.

const pseudo = (addr) =>
  "anon:" + createHash("sha256").update(String(addr).toLowerCase()).digest("hex").slice(0, 16);

const RE_ENDERECO = /0x[0-9a-fA-F]{40}/g;
/** Copia o objecto trocando QUALQUER endereço que não seja o do titular por `anon:<hash>`. */
function mascararTerceiros(obj, endereco, vistos = new Set()) {
  if (obj == null) return obj;
  if (typeof obj === "string") {
    return obj.replace(RE_ENDERECO, (m) =>
      m.toLowerCase() === endereco ? m : (vistos.add(m), pseudo(m)));
  }
  if (Array.isArray(obj)) return obj.map((v) => mascararTerceiros(v, endereco, vistos));
  if (typeof obj === "object") {
    const o = {};
    for (const [k, v] of Object.entries(obj)) o[k] = mascararTerceiros(v, endereco, vistos);
    return o;
  }
  return obj;
}

async function coletarIndicacoes(endereco) {
  const end = endereco.toLowerCase();
  const out = {
    disponivel: true, codigo: null, vinculos: [], bonus: null,
    contadoresMensais: [], conversoes: [], fraude: [], log: [], induzido: [], erros: [],
  };
  const codes = abrirStore("referral-codes");
  const links = abrirStore("referral-links");
  const bonusS = abrirStore("referral-bonus");
  const logS = abrirStore("referral-log");
  const indS = abrirStore("referral-induzido");
  const lista = async (store, nome) => {
    if (!store) { out.erros.push(`${nome}: store indisponível`); return []; }
    try { return (await store.list()).blobs.map((b) => b.key); }
    catch (err) { out.erros.push(`${nome}: list falhou (${err?.message})`); return []; }
  };

  // 1) o MEU código (e o registo reverso, que contém o meu endereço)
  if (codes) {
    try {
      const meu = await codes.get(`referral-code:${end}`, { type: "json" });
      if (meu) {
        out.codigo = { codigo: meu.codigo ?? null, criadoEm: meu.criadoEm ?? null };
        const rev = meu.codigo ? await codes.get(`referral-code-reverso:${meu.codigo}`, { type: "json" }) : null;
        if (rev) out.codigo.registoReverso = { endereco: rev.endereco ?? end, criadoEm: rev.criadoEm ?? null };
      }
    } catch (err) { out.erros.push(`referral-codes: ${err?.message}`); }
  }

  // 2) vínculos em que o titular é indicador OU indicado (o outro lado sai mascarado)
  for (const key of await lista(links, "referral-links")) {
    if (!key.startsWith("referral:")) continue;
    let v = null;
    try { v = await links.get(key, { type: "json" }); } catch (err) { out.erros.push(`${key}: ${err?.message}`); continue; }
    if (!v) continue;
    const ind = String(v.indicador ?? "").toLowerCase();
    const ado = String(v.indicado ?? "").toLowerCase();
    if (ind !== end && ado !== end) continue;
    out.vinculos.push({
      papel: ind === end ? "indicador" : "indicado",
      codigo: v.codigo ?? null,
      status: v.status ?? null,
      criadoEm: v.criadoEm ?? null,
      contraparte: pseudo(ind === end ? ado : ind), // NUNCA o endereço do terceiro
    });
  }

  // 3) conversões e marcas de fraude que mencionem o titular
  for (const key of await lista(links, "referral-links")) {
    if (!key.startsWith("referral-convertido:") && !key.startsWith("referral-fraud:")) continue;
    if (!key.endsWith(":" + end)) continue;
    let v = null;
    try { v = await links.get(key, { type: "json" }); } catch { continue; }
    const destino = key.startsWith("referral-convertido:") ? out.conversoes : out.fraude;
    destino.push(mascararTerceiros({ codigo: key.split(":")[1] ?? null, ...(v ?? {}) }, end));
  }

  // 4) bónus e contador mensal
  if (bonusS) {
    try {
      const bruto = await bonusS.get(`referral-bonus:${end}`, { type: "json" });
      // `ultimos[]` guarda os endereços dos indicados — são TERCEIROS: mascaram-se.
      out.bonus = mascararTerceiros(bruto, end);
    } catch (err) { out.erros.push(`referral-bonus: ${err?.message}`); }
    for (const key of await lista(bonusS, "referral-bonus")) {
      if (!key.startsWith(`referral-monthly:${end}:`)) continue;
      try { out.contadoresMensais.push({ mes: key.split(":")[2] ?? null, ...(await bonusS.get(key, { type: "json" }) ?? {}) }); }  // só contagens
      catch { /* contador ilegível: não impede a exportação do resto */ }
    }
  }

  // 5) log de auditoria do programa e indução agrupada — só eventos que mencionem o titular
  const vistos = new Set();
  for (const key of await lista(logS, "referral-log")) {
    let doc = null;
    try { doc = await logS.get(key, { type: "json" }); } catch { continue; }
    const eventos = Array.isArray(doc?.eventos) ? doc.eventos : [];
    const meus = eventos.filter((e) => JSON.stringify(e).toLowerCase().includes(end));
    if (meus.length) out.log.push({ chave: key, eventos: meus.map((e) => mascararTerceiros(e, end, vistos)) });
  }
  for (const key of await lista(indS, "referral-induzido")) {
    if (!key.startsWith(end + ":")) continue;
    try { out.induzido.push({ data: key.split(":")[1] ?? null, ...(await indS.get(key, { type: "json" }) ?? {}) }); } catch { continue; }
  }
  out.terceirosPseudonimizados = vistos.size;
  return out;
}

/** Store `auditoria` (criado no UTAC110j.1): eventos de edição que mencionem o titular. */
async function coletarAuditoria(endereco) {
  const end = endereco.toLowerCase();
  const store = abrirStore("auditoria");
  const out = { disponivel: !!store, eventos: [], erros: [] };
  if (!store) { out.erros.push("auditoria: store indisponível"); return out; }
  let chaves = [];
  try { chaves = (await store.list()).blobs.map((b) => b.key); }
  catch (err) { out.erros.push(`auditoria: list falhou (${err?.message})`); return out; }
  for (const key of chaves) {
    let doc = null;
    try { doc = await store.get(key, { type: "json" }); } catch { continue; }
    if (!doc) continue;
    if (!JSON.stringify(doc).toLowerCase().includes(end)) continue;
    out.eventos.push({ chave: key, ...mascararTerceiros(doc, end) });
  }
  return out;
}

// ───────────────── UTAC110j.2 — METADADOS (formato, base legal, retenção) ─────────────────
export const SCHEMA_EXPORTACAO = "2.0";

const BASE_LEGAL_POR_CATEGORIA = {
  conta_e_identificacao: "Execução de contrato (LGPD art. 7º, V) — autenticação e uso do serviço",
  lance_e_competicao: "Execução de contrato (art. 7º, V) — registro de lances, palpites, pontuação",
  fidelidade_e_premios: "Execução de contrato (art. 7º, V) — pontos, resgates e ECOQUILDO",
  pagamentos: "Execução de contrato (art. 7º, V) + obrigação legal (art. 7º, II) — prova fiscal por 10 anos",
  indicacoes: "Execução de contrato (art. 7º, V) + legítimo interesse (art. 7º, IX) — anti-fraude do programa",
  consentimento: "Obrigação legal (art. 7º, II + art. 8º, §6º) — prova do aceite por 5 anos",
  auditoria: "Obrigação legal (Marco Civil, art. 15) — logs de acesso por 13 meses",
};

const RETIDO_APOS_EXCLUSAO = {
  "registos de pagamento (PIX e Google Play)": "pseudonimizados, 10 anos — obrigação fiscal",
  "resgates do cartão": "morada passa a «[Conta Deletada]»; data/produto ficam — prova de entrega",
  "saldo e histórico de ECOQUILDO": "pseudonimizado — lastro contabilístico da Associação",
  "logs de auditoria": "pseudonimizados, 13 meses — Marco Civil art. 15",
  "dados on-chain (LeilaoGUT)": "imutáveis por natureza da blockchain; endereço é público",
  "lances de edição ainda aberta": "ficam com a carteira até a edição fechar (apuração em curso)",
};

function metadados(endereco, papel) {
  return {
    schema: SCHEMA_EXPORTACAO,
    geradoEm: new Date().toISOString(),
    titular: endereco,
    solicitadoPor: papel,
    controlador: {
      nome: "Associação Recreativa dos Nordestinos no Amazonas",
      nomeFantasia: "Grupo União e Trabalho",
      cnpj: "23.040.066/0001-00",
      encarregado: "Francisco Canindé Marinho — dpo@desafiogut.com.br",
    },
    direito: "LGPD art. 18, II (acesso) e V (portabilidade); art. 19, II (prazo de 30 dias)",
    formatos: ["JSON (este documento)", "CSV (?formato=csv — uma linha por campo)"],
    baseLegalPorCategoria: BASE_LEGAL_POR_CATEGORIA,
    retencaoAposExclusao: RETIDO_APOS_EXCLUSAO,
    notaPseudonimizacao:
      "Onde aparece «anon:<hash>» trata-se de identificador pseudónimo derivado do endereço da carteira. " +
      "Pseudonimização NÃO é anonimização (ANPD): o dado continua a ser pessoal e o titular mantém, sobre " +
      "ele, os direitos do art. 18 — incluindo pedir informação ao Encarregado.",
    segredosComerciais: "Nenhum campo deste documento é segredo comercial (LGPD art. 18, §4º).",
  };
}

// ───────────────────────────── UTAC110j.2 — CSV ─────────────────────────────
/** Formato longo: uma linha por campo. Legível por humanos e por qualquer folha de cálculo. */
function paraCsv(objeto) {
  const linhas = [["categoria", "caminho", "valor"]];
  const aspas = (v) => {
    const s = v === null || v === undefined ? "" : (typeof v === "string" ? v : JSON.stringify(v));
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const andar = (valor, categoria, caminho) => {
    if (valor === null || valor === undefined) { linhas.push([categoria, caminho, ""]); return; }
    if (Array.isArray(valor)) {
      if (valor.length === 0) { linhas.push([categoria, caminho, "[]"]); return; }
      valor.forEach((v, i) => andar(v, categoria, `${caminho}[${i}]`));
      return;
    }
    if (typeof valor === "object") {
      const chaves = Object.keys(valor);
      if (chaves.length === 0) { linhas.push([categoria, caminho, "{}"]); return; }
      for (const k of chaves) andar(valor[k], categoria, caminho ? `${caminho}.${k}` : k);
      return;
    }
    linhas.push([categoria, caminho, valor]);
  };
  for (const [cat, conteudo] of Object.entries(objeto)) andar(conteudo, cat, "");
  return linhas.map((l) => l.map(aspas).join(",")).join("\r\n") + "\r\n";
}

export default async (req) => {
  // MC88.12 — preflight CORS do APK. Tem de ser a primeira coisa: o OPTIONS não
  // leva corpo nem Authorization, logo qualquer validação a montante responderia
  // 4xx e o browser abortaria a chamada real.
  const preflight = respostaPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonError(405, "metodo_invalido", "use POST", { allowed: ["POST"] });
  }
  const rl = await aplicarRateLimit(req, "exportar-dados", 6);
  if (rl) return rl;

  let body;
  try {
    body = await parseJsonBody(req);
    if (!body) return jsonError(400, "body_obrigatorio", "envie JSON com endereco");
  } catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  let endereco;
  try { endereco = validarEndereco(body.endereco); }
  catch (err) {
    if (err instanceof ValidationError) return jsonError(400, err.code, err.message);
    throw err;
  }

  // Auth: user-session (owner) OU admin.
  const authHeader = req.headers.get("authorization") || "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    await registrarFalhaJwt(req, "exportar-dados");
    return jsonError(401, "token_ausente", "Authorization: Bearer <user-session> obrigatório");
  }
  let jwtPayload;
  try { jwtPayload = await verificarUserSession(token); }
  catch (err) {
    await registrarFalhaJwt(req, "exportar-dados");
    const code = err?.code === "ERR_JWT_EXPIRED" ? "token_expirado" : "token_invalido";
    return jsonError(401, code, "token de sessão inválido ou expirado");
  }
  const admins = await getAdminAddresses();
  const guard  = validarOwnerOuAdmin(jwtPayload, endereco, admins);
  if (!guard.ok) {
    return jsonError(403, "acesso_negado", "token não pertence ao endereço solicitado e não é admin");
  }

  // ── Coleta ─────────────────────────────────────────────────────────────────
  const dados = {};
  for (const nome of STORES_POR_CHAVE) {
    dados[nome] = await coletarPorChave(nome, endereco);
  }
  dados.consent_log = await coletarConsentLog(endereco);
  dados.lance_idem  = await coletarPorValor("lance-idem", endereco);
  dados.pedidos     = await coletarPorValor("pedidos", endereco);
  dados.lances_relampago = await coletarLancesLegado(endereco);
  dados.supabase = await coletarSupabase(endereco);
  dados.indicacoes = await coletarIndicacoes(endereco);
  dados.auditoria  = await coletarAuditoria(endereco);

  // Compatível com o contrato anterior (titular/geradoEm/geradoPor/politicaRetencao/dados) e acrescenta
  // `schema` + `exportacao` (metadados da FRENTE B: controlador, base legal, retenção, formatos).
  const payload = {
    titular:   endereco,
    geradoEm:  new Date().toISOString(),
    geradoPor: guard.papel,           // "owner" ou "admin"
    politicaRetencao: "/docs/lgpd-politica-retencao.md",
    schema:    SCHEMA_EXPORTACAO,
    exportacao: metadados(endereco, guard.papel),
    dados,
  };

  const formato = (() => { try { return new URL(req.url).searchParams.get("formato"); } catch { return null; } })();

  console.info("[exportar-dados] exportação concluída", {
    endereco: mascararEndereco(endereco), papel: guard.papel, formato: formato || "json",
    tabelas: Object.keys(dados.supabase?.tabelas ?? {}).length,
  });

  if (formato === "csv") {
    // FRENTE B — CSV longo (uma linha por campo). O BOM faz o Excel abrir em UTF-8.
    return new Response("\ufeff" + paraCsv(payload), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="desafiogut-dados-${endereco.slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  return jsonResponse(payload);
};
