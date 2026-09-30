// MC105a — prova de mutação (R16): repositório (_lib/passe.mjs) e endpoint (comprar-passe.mjs). Cada mutante: alvo
// único exigido, ficheiro confirmado a MUDAR, testes em TAP, RED exigido, bytes repostos e md5 confirmado.
// Uso: node scripts/mc105a-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FN = join(RAIZ, "desafio-gut/frontend/netlify/functions");
const LIB = join(FN, "_lib/passe.mjs");
const EP = join(FN, "comprar-passe.mjs");
const ARGS = ["--experimental-test-module-mocks", "--test", "--test-reporter=tap", "_tests/mc105a-passe.test.mjs", "_tests/mc105a-e2e.test.mjs"];

const MUTANTES = [
  // Frente A — repositório
  ["A1 23505 não é idempotente", LIB, "if (error.code !== UNIQUE_VIOLATION) return { ok: false, code: \"gravar_passe_falhou\" };", "return { ok: false, code: \"gravar_passe_falhou\" };"],
  ["A2 lerPasse sem filtro de produto", LIB, '.eq("edicao_id", edicaoId).eq("produto_id", produtoId).maybeSingle()', '.eq("edicao_id", edicaoId).maybeSingle()'],
  ["A3 endereço não normalizado", LIB, 'const normalizar = (e) => String(e ?? "").toLowerCase();', 'const normalizar = (e) => String(e ?? "");'],
  ["A4 marcarPalpiteUsado sem CAS", LIB, '.eq("id", passeId).eq("palpite_usado", false).select("*")', '.eq("id", passeId).select("*")'],
  ["A5 listar sem filtro do comprador", LIB, '.select("*").eq("endereco", e)\n    .order(', '.select("*")\n    .order('],
  ["A6 chave inválida chega ao Supabase", LIB, "if (!chaveValida(e, edicaoId, produtoId)) return null;", ""],
  // Frente B — endpoint
  ["B1 sem verificação de idempotência", EP, "if (existente) return jsonResponse({ ok: true, idempotent: true, passe: existente }, 200);", ""],
  ["B2 corrida sem reembolso", EP, 'const reembolso = await reembolsarSaldoRs({ endereco, valorCentavos: VALOR_PASSE_CENTAVOS, motivo: "comprar-passe" });', "const reembolso = { ok: true };"],
  ["B3 saldo insuficiente vira 502", EP, 'return jsonError(402, "saldo_insuficiente",', 'return jsonError(502, "saldo_insuficiente",'],
  ["B4 aceita edição não Programada", EP, 'if (meta.tipo !== "programado") return', 'if (false) return'],
  ["B5 sem janela da edição", EP, "if (janela) return jsonError(409, janela.code, janela.message);", ""],
  ["B6 produto não vinculado aceite", EP, 'if (meta.produtoId !== produtoId) return', 'if (false) return'],
  ["B7 produto não activo aceite", EP, 'if (produto.status !== "ativo") return', 'if (false) return'],
  ["B8 preço errado", EP, "export const VALOR_PASSE_CENTAVOS = 200;", "export const VALOR_PASSE_CENTAVOS = 100;"],
  ["B9 criação responde 200", EP, "saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,\n    }, 201);", "saldoRsDepoisCentavos: debito.resultado.saldoDepoisCentavos,\n    }, 200);"],
  ["B10 sem rate-limit", EP, "  if (rl) return rl;\n", "\n"],
  ["B11 sem kill switch", EP, "if (sistemaPausado(await lerEstadoSistema())) {", "if (false) {"],
  ["B12 endereço no log", EP, 'console.error("[comprar-passe] gravar passe falhou", { code: r.code,', 'console.error("[comprar-passe] gravar passe falhou", { endereco, code: r.code,'],
  ["B13 endereço no alerta", EP, "{ edicaoId, code: reembolso.code }", "{ edicaoId, endereco, code: reembolso.code }"],
  ["B14 falha do INSERT sem reembolso visível", EP, "return jsonError(502, \"gravar_passe_falhou\", \"não foi possível registar o Passe\", { reembolsado: reembolso.ok });",
    "return jsonError(502, \"gravar_passe_falhou\", \"não foi possível registar o Passe\", { reembolsado: true });"],
  // Achados do validador (SEG3) — correcções + lacunas N1–N6
  ["F1 releitura da corrida sem try", LIB, "try { existente = await lerPasse({ endereco: e, edicaoId, produtoId }); } catch { existente = null; }",
    "existente = await lerPasse({ endereco: e, edicaoId, produtoId });"],
  ["F2 excepção depois do débito sem reembolso", EP, 'try { r = await criarPasse({ endereco, edicaoId, produtoId }); }\n  catch { r = { ok: false, code: "gravar_passe_falhou" }; }',
    "r = await criarPasse({ endereco, edicaoId, produtoId });"],
  ["F3 402 falso em cliques concorrentes", EP, "if (jaTem) return jsonResponse({ ok: true, idempotent: true, passe: jaTem }, 200);", ""],
  ["N1 leitura falhada segue para o débito", EP, 'catch { return jsonError(503, "store_indisponivel", "não foi possível ler os passes"); }', "catch { existente = null; }"],
  ["N2 catálogo indisponível ignorado", EP, "if (indisponivel) return jsonError(503,", "if (false) return jsonError(503,"],
  ["N3 debito_falhou vira 402", EP, 'return jsonError(502, "debito_falhou"', 'return jsonError(402, "debito_falhou"'],
  ["N4 releitura vazia passa por sucesso", LIB, 'return existente ? { ok: true, criado: false, passe: existente } : { ok: false, code: "gravar_passe_falhou" };',
    "return { ok: true, criado: false, passe: existente };"],
  ["N5 token com endereço inválido aceite", EP, 'return /^0x[0-9a-f]{40}$/.test(e) ? { endereco: e } : { erro: "token_invalido" };', "return { endereco: e };"],
  ["N6 produtoId permissivo", EP, "const PRODUTO_ID_RE = /^[0-9a-f-]{10,64}$/i;", "const PRODUTO_ID_RE = /^.+$/;"],
  ["B15 aceita token de outro tipo", EP, "const p = await verificarUserSession(bearer);", "const p = JSON.parse(Buffer.from(bearer.split(\".\")[1], \"base64url\").toString());"],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map([LIB, EP].map((f) => [f, readFileSync(f)]));
const correr = () => {
  const r = spawnSync(process.execPath, ARGS, { cwd: FN, encoding: "utf8", timeout: 300000 });
  const n = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
};

let falhas = 0;
const base = correr();
if (!(base.tests > 0 && base.fail === 0)) { console.log("CONTROLO não VERDE:", base); process.exit(2); }
console.log(`controlo: ${base.pass}/${base.tests} VERDE`);
try {
  for (const [nome, f, de, para] of MUTANTES) {
    const orig = originais.get(f); const txt = orig.toString("utf8");
    const alvo = txt.includes("\r\n") ? de.replace(/\n/g, "\r\n") : de;
    const n = txt.split(alvo).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — mutante inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(alvo, txt.includes("\r\n") ? para.replace(/\n/g, "\r\n") : para));
    if (md5(readFileSync(f)) === md5(orig)) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr(); const morto = r.tests > 0 && r.fail > 0;
    console.log(`${nome}: ${morto ? "PROVADO (RED)" : "SOBREVIVEU"} — ${r.pass}/${r.tests}, fail ${r.fail}`);
    if (!morto) falhas++;
    writeFileSync(f, orig);
  }
} finally {
  for (const [f, orig] of originais) {
    writeFileSync(f, orig); const ok = md5(readFileSync(f)) === md5(orig); if (!ok) falhas++;
    console.log(`restauração ${f.split(/[\\/]/).pop()}: md5 ${ok ? "IDÊNTICO" : "DIFERENTE!"}`);
  }
}
console.log(falhas === 0 ? `VEREDITO: ${MUTANTES.length}/${MUTANTES.length} PROVADOS` : `VEREDITO: ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
