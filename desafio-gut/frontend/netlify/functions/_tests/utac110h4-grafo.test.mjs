// UTAC110h.4 — FRENTE C: o GRAFO SOCIAL não pode sair em log (DEBT-031).
//
// Dois instrumentos, porque um só não chega:
//   A) COMPORTAMENTAL (decide) — corre o fluxo REAL e captura TODA a saída de `console.*` (backend) e
//      TODOS os payloads de alerta de segurança (Sentry). Depois procura endereços COMPLETOS. Não
//      depende de nomes de variáveis: apanha qualquer log novo que fure, seja qual for o identificador.
//   B) ESTÁTICO (varre) — percorre os ficheiros de produção (backend + `src/`) e reprova qualquer
//      `console.*` OU `captureSecurityAlert(...)` cujo payload leve um identificador de endereço sem
//      mascarar. Tem CONTROL POSITIVO (o varrimento tem de VER a forma crua quando ela existe).
//
// ⚠️ LIMITES DECLARADOS deste ficheiro (não são omissões, são fronteiras medidas):
//   1. O comportamento **transitivo** não é visível estaticamente: `contexto` é um objecto que
//      transporta `indicado` por dentro. Só o teste COMPORTAMENTAL o apanha (é ele que decide).
//   2. O caminho `indicacao_eco_reversao_falhou` (Art. 50º) exige lastro E reversão a falhar — não é
//      exercido aqui; é coberto pelo varrimento ESTÁTICO da chamada, o que é mais fraco. Declarado.
//
// ⚠️ O que NÃO se mascara, por desenho (declarado em `_logs/UTAC110h.4-GRAFO.md` §4): o Blob de
// auditoria `referral-log`. O relatório admin precisa do endereço REAL para agregar o «top 3
// indicadores» e mascara na SAÍDA. Este ficheiro prova as DUAS coisas: o log fica, a saída é anónima.
//
// node --test --experimental-test-module-mocks _tests/utac110h4-grafo.test.mjs
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";
import { criarTabelaPontos } from "./_pontos-duplo-110f.mjs";
import { criarSupabase } from "./_supabase-duplo-mc105a.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), ".."); // netlify/functions
const FRONT = join(RAIZ, "..", "..");                             // desafio-gut/frontend

process.env.JWT_SECRET = "segredo-de-teste-utac110h4-grafo-comprimento-suficiente";
delete process.env.REFERRAL_ATIVO;

const ENDERECO_COMPLETO = /0x[a-fA-F0-9]{40}/;

let BL, P, E, creditos, saidaConsole, alertas;
let sybilSuspeito = false, sybilEnderecos = [], falharCredito = false;

function duploPalpites() {
  const api = {};
  for (const m of ["select", "eq", "in", "order", "limit", "range", "is", "neq", "gte", "lte", "not", "or", "filter", "ilike"]) api[m] = () => api;
  api.maybeSingle = () => api; api.single = () => api;
  api.then = (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej);
  return api;
}
mock.module("../_lib/contract.mjs", { namedExports: {
  creditarSenhas: async (endereco, qtd) => {
    if (falharCredito) throw new Error("RPC indisponível (simulado)");
    creditos.push({ endereco, qtd }); return { txHash: "0xmock" };
  },
  lerSaldoSenhas: async () => 0, CONTRATO_ADDRESS: "0xC0" } });
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => BL.getStore(typeof o === "string" ? { name: o } : o) } });
mock.module("../_lib/supabase-client.mjs", { namedExports: {
  getSupabase: () => ({ from: (t) => (t === "pontos" ? P.from() : t === "palpites" ? duploPalpites() : E.cliente.from(t)) }),
  getSupabaseReadOnly: () => ({ from: (t) => (t === "pontos" ? P.from() : t === "palpites" ? duploPalpites() : E.cliente.from(t)) }),
  supabaseConfigurado: () => true } });
mock.module("../_lib/sybil-check.mjs", { namedExports: {
  checkSybil: async () => ({ suspeito: sybilSuspeito, addresses: sybilEnderecos }),
  registerVisitor: async () => {} } });
// O Sentry é CAPTURADO, não silenciado: é a superfície mais exposta (sai do ambiente — regra S6).
mock.module("../_lib/sentry-server.mjs", { namedExports: {
  captureSecurityAlert: async (kind, payload = {}, level) => { alertas.push({ kind, texto: inspect(payload, { depth: 8 }), level }); },
  Sentry: {} } });
mock.module("../_lib/rate-limiter.mjs", { namedExports: { aplicarRateLimit: async () => null } });
mock.module("../_lib/admin-helpers.mjs", { namedExports: { getAdminAddresses: async () => [] } });

const { default: handler } = await import("../referral.mjs");
const R = await import("../_lib/referral.mjs");
const { assinarUserSession } = await import("../_lib/jwt.mjs");

// Endereços gerados (não escritos à mão: 42 hex por engano num literal custou uma depuração).
const hex = (c) => "0x" + String(c).repeat(40);
const A = hex("a"); // indicante
const B = hex("b"); // indicado
const C = hex("c"); // 2.º indicado (ramo de suspeita)

const CONSOLE_METODOS = ["log", "info", "warn", "error", "debug", "trace"];
let originais = null;
beforeEach(() => {
  BL = criarBlobs(); P = criarTabelaPontos(); E = criarSupabase();
  creditos = []; saidaConsole = []; alertas = [];
  sybilSuspeito = false; sybilEnderecos = []; falharCredito = false;
  E.tabelas.eco_quildo_lastro.push({ id: 1, total_emitido: 0, total_usado: 0, reserva_rs_centavos: 0, atualizado_em: "t0" });
  // Captura TODA a saída de console do backend (o stdout da Lambda, que é a superfície INTERNA).
  if (!originais) originais = Object.fromEntries(CONSOLE_METODOS.map((m) => [m, console[m]]));
  for (const m of CONSOLE_METODOS) console[m] = (...a) => { saidaConsole.push(inspect(a, { depth: 8, breakLength: Infinity })); };
});
/** Restaura o console (chamado no fim de cada teste que o substitui, para o reporter falar). */
function restaurarConsole() { if (originais) for (const m of CONSOLE_METODOS) console[m] = originais[m]; }

let nIp = 0;
async function usar(codigo, quem, ip) {
  const tk = await assinarUserSession(quem);
  const req = new Request("https://x/.netlify/functions/referral?acao=usar-codigo", {
    method: "POST", body: JSON.stringify({ codigo_indicacao: codigo, endereco: quem }),
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip || `10.7.0.${++nIp % 250}`,
      authorization: `Bearer ${tk}` },
  });
  const r = await handler(req);
  return { status: r.status, corpo: await r.json().catch(() => null) };
}
const semEnderecoCru = (linhas, onde) => {
  for (const l of linhas) assert.doesNotMatch(l, ENDERECO_COMPLETO, `endereço COMPLETO ${onde}: ${String(l).slice(0, 300)}`);
};
/** Quantas vezes o contrato foi chamado para `endereco`. */
const creditosDe = (e) => creditos.filter((c) => c.endereco === e).length;

// ══ A) COMPORTAMENTAL ════════════════════════════════════════════════════════════════════════════
test("GRAFO/console: uma conversão real NÃO põe nenhum endereço completo em `console.*`", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const r = await usar(codigo, B);
  assert.equal(r.status, 200);
  assert.ok(saidaConsole.length > 0, "CONTROL POSITIVO: o fluxo tem de escrever em `console.*` (senão o teste não mede nada)");
  const tudo = saidaConsole.join("\n");
  // O instrumento VÊ as chaves do grafo — mascaradas (se não as visse, o verde seria por cegueira).
  assert.match(tudo, /0xaaaa…aaaa/, "o log do indicante desapareceu por completo (o diagnóstico perdeu-se)");
  assert.match(tudo, /0xbbbb…bbbb/, "o log do indicado desapareceu por completo");
  semEnderecoCru(saidaConsole, "na saída de console");
  restaurarConsole();
});

// A janela e a chave do throttle por IP são as MESMAS que `_lib/referral.mjs` usa
// (`ip:{sha256(ip).slice(0,16)}:{AAAA-MM-DD-HH}` em UTC) — semear a chave é o que torna este teste
// DETERMINÍSTICO: não depende de o contador acumular entre chamadas (que é frágil a reordenações).
function semearIp(ip, count) {
  const h = createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
  const d = new Date();
  const janela = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCHours()).padStart(2, "0")}`;
  BL.gravar("referral-ip", `ip:${h}:${janela}`, { count, atualizadoEm: Date.now() });
  return { h, janela };
}

test("GRAFO/console: o caminho de SUSPEITA (fraude por IP) também não expõe endereços", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  const ip = "10.7.0.99";
  // Bidireccional, com o contador do IP como única variável:
  //  (a) contador ABAIXO do limite (1 < 2) → a conversão corre normalmente;
  semearIp(ip, 1);
  const rOk = await usar(codigo, B, ip);
  assert.equal(rOk.corpo.conversao.ok, true, `esperava conversão normal — corpo: ${JSON.stringify(rOk.corpo)}`);
  //  (b) contador NO limite (2 >= 2) → ramo de SUSPEITA: vincula mas NÃO credita.
  semearIp(ip, 2);
  const rSus = await usar(codigo, C, ip);
  assert.equal(rSus.corpo?.conversao?.code, "suspeita_sybil_ip",
    `o ramo de suspeita não foi exercido — corpo: ${JSON.stringify(rSus)}`);
  assert.equal(creditosDe(C), 0, "no ramo de suspeita NADA pode ser creditado");
  // E o log do ramo de suspeita também não leva endereços completos:
  assert.ok(saidaConsole.some((l) => l.includes("suspeita_sybil_ip") || l.includes("ipCount")),
    "CONTROL POSITIVO: o ramo de suspeita tem de ter produzido log");
  semEnderecoCru(saidaConsole, "na saída de console (ramo de suspeita)");
  restaurarConsole();
});

test("GRAFO/Sentry: os alertas de segurança NÃO levam o par indicador↔indicado (regra S6)", async () => {
  // (a) `referral_fraude` — exige sybil suspeito a apontar para o indicador (motivo `mesmo_dispositivo`)
  const { codigo } = await R.gerarCodigoIndicacao(A);
  sybilSuspeito = true; sybilEnderecos = [A];
  const fraude = await R.registrarIndicacao(codigo, B, "visitor-1");
  assert.equal(fraude.code, "mesmo_dispositivo", "o alerta de fraude não foi exercido");
  // (b) `referral_bonus_falhou` — o `contexto` transporta `{codigo, indicado}` para dentro do alerta
  sybilSuspeito = false; sybilEnderecos = [];
  falharCredito = true;
  const bonus = await R.registrarConversao({ codigo, indicador: A, indicado: B });
  assert.equal(bonus.code, "credito_onchain_falhou", "o alerta de falha do bónus não foi exercido");
  falharCredito = false;

  const tipos = alertas.map((a) => a.kind);
  assert.ok(tipos.includes("referral_fraude"), `alerta referral_fraude ausente: ${JSON.stringify(tipos)}`);
  assert.ok(tipos.includes("referral_bonus_falhou"), `alerta referral_bonus_falhou ausente: ${JSON.stringify(tipos)}`);
  // CONTROL POSITIVO: o alerta do bónus TEM de trazer o código (senão o payload foi esvaziado por engano).
  const doBonus = alertas.find((a) => a.kind === "referral_bonus_falhou");
  assert.match(doBonus.texto, /codigo/, "o alerta perdeu o `codigo` (o diagnóstico ficou inútil)");
  // A asserção que decide:
  semEnderecoCru(alertas.map((a) => `${a.kind} ${a.texto}`), "num payload de Sentry");
  restaurarConsole();
});

test("GRAFO/relatório: o log de auditoria GUARDA o par, mas a SAÍDA do relatório é anónima", async () => {
  const { codigo } = await R.gerarCodigoIndicacao(A);
  await usar(codigo, B);
  // O dado em repouso fica (decisão declarada — o relatório precisa dele para agregar):
  const log = await R.lerReferralLog();
  const conv = log.find((e) => e?.tipo === "conversao");
  assert.equal(conv.indicador, A, "o log de auditoria perdeu o indicador (o «top 3» do relatório parte-se)");
  assert.equal(conv.indicado, B, "e o indicado");
  // …e a SAÍDA (o que o admin lê) não traz endereços completos:
  const rel = await R.gerarRelatorioIndicacoes();
  assert.doesNotMatch(rel.texto, ENDERECO_COMPLETO, `o relatório admin expõe um endereço completo: «${rel.texto}»`);
  assert.match(rel.texto, /0xaaaa…aaaa \(1\)/, "o «top 3 indicadores» tem de continuar a agregar por indicador");
  restaurarConsole();
});

// ══ B) ESTÁTICO ══════════════════════════════════════════════════════════════════════════════════
const IDENT = /(\bendereco\b|\benderecos\b|\baddresses\b|\baddress\b|\bindicador\b|\bindicado\b|\bindicante\b|\bnovoEndereco\b|\bsubject\b|\blancador\b|\bwallet\b|\bcarteira\b|\bcomprador\b|\bvendedor\b|\bcliente_id\b)/g;
const MASCARADO = /mascararEndereco(?:Log)?\(\s*[\w.?,[\]' ]*$/;

/**
 * Branqueia o CONTEÚDO de literais de string MAS guardando o comprimento (para os índices não
 * mentirem). Sem isto o varrimento reprova a palavra «indicador» dentro do PRÓPRIO texto do log
 * (ex.: `console.log("T6 concederBonus(indicador)", …)`) — falso positivo medido.
 * Num template literal as substituições `${…}` são PRESERVADAS (é lá que vive o valor).
 */
function semStrings(src) {
  return src.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (m) => {
    const branco = (s) => "·".repeat(s.length);
    if (m[0] !== "`") return branco(m);
    // Template literal: branqueia o TEXTO e PRESERVA as substituições `${…}` (é lá que vive o valor).
    return m.split(/(\$\{(?:[^{}]|\{[^{}]*\})*\})/g)
      .map((p) => (p.startsWith("${") ? p : branco(p))).join("");
  });
}

/**
 * Violações de UM texto: identificador de endereço cru no payload de `console.*` ou de
 * `captureSecurityAlert(...)`. `padrao` é a expressão que abre a chamada.
 */
function violacoesDe(texto, ficheiro, padrao) {
  const out = [];
  // 1. tira comentários (o que é comentário não é log) e branqueia strings literais
  const limpo = semStrings(texto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 "));
  const re = new RegExp(padrao.source, "g");
  let m;
  while ((m = re.exec(limpo))) {
    let i = re.lastIndex - 1, nivel = 0, fim = -1;
    for (; i < limpo.length; i++) {
      if (limpo[i] === "(") nivel++;
      else if (limpo[i] === ")") { nivel--; if (nivel === 0) { fim = i; break; } }
    }
    if (fim < 0) continue;
    const corpo = limpo.slice(re.lastIndex, fim);
    IDENT.lastIndex = 0;
    let t;
    while ((t = IDENT.exec(corpo))) {
      const pos = t.index;
      const antes = corpo.slice(Math.max(0, pos - 60), pos);
      const depois = corpo.slice(pos + t[0].length);
      if (/^\s*:/.test(depois) && !/^\s*::/.test(depois)) continue;  // é CHAVE de objecto
      if (/^=/.test(depois) && !/^==/.test(depois)) continue;        // é rótulo de template literal
      if (MASCARADO.test(antes)) continue;                           // já mascarado
      if (/!!\s*[\w.?[\]' ]*$/.test(antes)) continue;                // reduzido a booleano
      if (/Boolean\(\s*[\w.?[\]' ]*$/.test(antes)) continue;         // idem
      if (/^\s*[\w.[\]'"]*\.(slice|length|substring|substr)\b/.test(depois.replace(/\?/g, ""))) continue; // truncado
      // `String(x).slice(...)` — truncado por dentro de um `String()`
      if (/String\(\s*$/.test(antes) && /^\)\s*\.(slice|length|substring|substr)\b/.test(depois)) continue;
      if (/^(mascarar|validar)/.test(t[0])) continue;                // é o NOME de uma função
      out.push(`${ficheiro}: «${t[0]}» cru no payload → …${corpo.slice(Math.max(0, pos - 40), pos + t[0].length + 40).replace(/\s+/g, " ")}…`);
    }
  }
  return out;
}
const PADRAO_CONSOLE = /console\.(?:log|info|warn|error|debug|trace)\s*\(/;
/**
 * Wrappers de alerta que MASCARAAM no próprio wrapper (ponto de estrangulamento, UTAC110h.4/S6):
 * `_lib/sentry-server.mjs::captureSecurityAlert` (servidor) e `src/lib/sentry-alerts.js::captureAlert`
 * (cliente) aplicam `mascararEnderecosProfundo(payload)` ao payload antes de o enviar. Um endereço
 * CRU dentro destas chamadas é portanto **seguro por desenho** — e a prova de que o wrapper mascara
 * não é estática: é o teste COMPORTAMENTAL `GRAFO/Sentry: o wrapper mascara...`, que faz stub ao
 * `@sentry/node` (não ao wrapper) e inspecciona o que sai.
 */
const WRAPPERS = ["_lib/sentry-server.mjs", "src/lib/sentry-alerts.js", "src/lib/sentryLazy.js"];
const PADRAO_SENTRY_DIRETO = /Sentry\.capture(?:Message|Exception|Event)\s*\(/;

function ficheirosDeProducao(dir, exts, ignorar) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      if (ignorar.includes(e)) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.some((x) => e.endsWith(x))) out.push(p);
    }
  })(dir);
  return out;
}

test("GRAFO/estático: CONTROL POSITIVO — o varrimento VÊ a forma crua e NÃO reprova a mascarada", () => {
  const cru = [
    'console.info("[auth-admin] login ok", { endereco, jti: par.jti });',
    'console.log("[X] par", { indicado: endereco, indicador: r.indicador });',
    'console.warn(`[require-mfa] endereco=${subject}`);',
    // ⚠️ nomes que a 1.ª versão da guarda NÃO via (achado F2 do validador: mutante V4 sobreviveu):
    'console.log("[Z]", { addresses, lancador, wallet });',
  ].join("\n");
  const v = violacoesDe(cru, "sintetico", PADRAO_CONSOLE).length;
  assert.equal(v, 7, `o varrimento não vê as formas cruas (viu ${v}, esperado 7: endereco, indicado, endereco, indicador, subject, addresses, lancador, wallet — os 3 últimos são os nomes que a 1.ª versão NÃO via)`);
  const limpo = [
    'console.info("[a]", { endereco: mascararEndereco(endereco) });',
    'console.info("[b]", { temAddress: !!address, hasEndereco: !!meta?.endereco });',
    'console.warn(`notificar ${String(endereco).slice(0, 10)}…`);',
    'console.warn(`não a notificar ${mascararEndereco(endereco)}`);',
    'console.warn(`mascarado ${mascararEndereco(wallet)}`);',
  ].join("\n");
  assert.deepEqual(violacoesDe(limpo, "sintetico", PADRAO_CONSOLE), [], "o varrimento reprova código JÁ mascarado");
});

test("GRAFO/estático: nenhum `console.*` de produção leva endereço sem mascarar", () => {
  const alvos = [
    ...ficheirosDeProducao(RAIZ, [".mjs"], ["_tests", "node_modules", "dist"]),
    ...ficheirosDeProducao(join(FRONT, "src"), [".js", ".jsx"], ["__tests__", "node_modules", "dist"]),
  ];
  assert.ok(alvos.length > 100, `CONTROL POSITIVO: varreram-se ${alvos.length} ficheiros (esperado >100)`);
  const violacoes = [];
  for (const f of alvos) {
    const txt = readFileSync(f, "utf8");
    const rel = f.replace(FRONT + "\\", "").replace(FRONT + "/", "");
    violacoes.push(...violacoesDe(txt, rel, PADRAO_CONSOLE));
  }
  assert.deepEqual(violacoes, [], `endereços em console.*:\n${violacoes.join("\n")}`);
});

test("GRAFO/estático: `Sentry.capture*` só DENTRO dos dois wrappers (nada escapa ao mascaramento)", () => {
  const alvos = [
    ...ficheirosDeProducao(RAIZ, [".mjs"], ["_tests", "node_modules", "dist"]),
    ...ficheirosDeProducao(join(FRONT, "src"), [".js", ".jsx"], ["__tests__", "node_modules", "dist"]),
  ];
  const fora = [];
  for (const f of alvos) {
    // ⚠️ separadores normalizados: no Windows o `rel` vem com `\` e um `endsWith("src/lib/x.js")`
    // com barras FALHA — foi o que fez o 1.º varrimento acusar os PRÓPRIOS wrappers (falso positivo
    // medido). E os comentários são retirados antes de procurar: `monitor-onchain.mjs:13` tem
    // `Sentry.captureMessage(...)` DENTRO de um comentário de documentação.
    const rel = f.replace(FRONT + "\\", "").replace(FRONT + "/", "").replace(/\\/g, "/");
    const ehWrapper = WRAPPERS.some((w) => rel.endsWith(w));
    const txt = readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    if (ehWrapper) {
      // O wrapper TEM de aplicar o mascaramento ao payload — senão a garantia estrutural não existe.
      assert.match(txt, /mascararEnderecosProfundo\(\s*payload\s*\)|mascararEnderecosProfundo\(\s*event\s*\)/,
        `${rel} é wrapper mas não mascara o payload/evento (a garantia de S6 deixaria de existir)`);
      continue;
    }
    if (PADRAO_SENTRY_DIRETO.test(txt)) fora.push(rel);
  }
  assert.deepEqual(fora, [],
    `chamam Sentry DIRECTAMENTE (fora dos wrappers mascaradores) — o payload sai sem mascarar:\n${fora.join("\n")}`);
});
