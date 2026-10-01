// UTAC105b — prova de mutação (T1/T5). node scripts/utac105b-prova-mutacao.mjs [A|B|C|todos]
// Cada mutante: confirma que o alvo existe (ENTROU), aplica, corre os testes, repõe byte a byte. RED = morto.
import fs from "node:fs";
import { execSync } from "node:child_process";

const F = "desafio-gut/frontend/netlify/functions/";
const SRC = "desafio-gut/frontend/src/";
const T = (ficheiros) => ({ cwd: F, cmd: `node --test --experimental-test-module-mocks --test-reporter=tap ${ficheiros}` });
const TA = T("_tests/utac105b-cupom.test.mjs");
const TB = T("_tests/utac105b-cupons-endpoint.test.mjs");
const TC = T("_tests/mc105a-e2e.test.mjs _tests/utac105b-ligacao.test.mjs");
const TF = { cwd: "desafio-gut/frontend", cmd: "node --test --test-reporter=tap src/__tests__/utac105b-painel.test.mjs src/__tests__/mc991-rotas.test.mjs" };

const MUT = {
  A: [
    ["A-M1 valor 15 aceite", F + "_lib/cupom.mjs", "[5, 10, 20]); // R$", "[5, 10, 15, 20]); // R$", TA],
    ["A-M2 coerção de string", F + "_lib/cupom.mjs", 'typeof v === "number" && VALORES_CUPOM.includes(v)', "VALORES_CUPOM.includes(Number(v))", TA],
    ["A-M3 validade 31", F + "_lib/cupom.mjs", "VALIDADE_CUPOM_DIAS = 30;", "VALIDADE_CUPOM_DIAS = 31;", TA],
    ["A-M4 23505 → falha (não idempotente)", F + "_lib/cupom.mjs", "if (error.code !== UNIQUE_VIOLATION) return", "if (true) return", TA],
    ["A-M5 activos incluem inactivos", F + "_lib/cupom.mjs", "c.ativo === true && ", "", TA],
    ["A-M6 actualizar ignora o estado pedido", F + "_lib/cupom.mjs", ".update({ ativo, atualizado_em", ".update({ ativo: true, atualizado_em", TA],
    ["A-M8 corrida: estado pedido perdido (V3)", F + "_lib/cupom.mjs", "if (c.criado || c.cupom.ativo === ativo) return", "if (true) return", TA],
    ["A-M9 activos sem filtro de valores (V2)", F + "_lib/cupom.mjs", " && VALORES_CUPOM.includes(Number(c.valor_rs))", "", TA],
    ["A-M7 listar sem filtro de lojista", F + "_lib/cupom.mjs", '.select("*").eq("lojista_id", l)\n    .order', '.select("*")\n    .order', TA],
  ],
  B: [
    ["B-M1 endpoint aceita valor fora da lista", F + "cupons.mjs", "if (itens.some((i) => !valorValido(i.valorRs))) return", "if (false) return", TB],
    ["B-M2 posse: qualquer JWT é dono", F + "cupons.mjs", "  if (lojistaId === quem.endereco) return true;", "  return true;", TB],
    ["B-M10 sem ramo admin (⛔-1 do validador)", F + "cupons.mjs", "  try { if ((await autenticarAdmin(req))?.ok) return true; } catch { /* segue: não é admin */ }\n", "", TB],
    ["B-M11 cliente_id sem normalizar (V4)", F + "cupons.mjs", 'String(clienteId ?? "").trim().toLowerCase()', 'String(clienteId ?? "")', TB],
    ["B-M3 posse fail-open na leitura da cota", F + "cupons.mjs", "} catch { return false; } // fail-closed", "} catch { return true; }", TB],
    ["B-M4 inexistente/inactivo mostrado como activo", F + "cupons.mjs", "Number(c.valor_rs) === v && c.ativo === true", "Number(c.valor_rs) === v", TB],
    ["B-M5 erro de leitura vira 3 desactivados", F + "cupons.mjs", 'catch { return jsonError(503, "store_indisponivel", "não foi possível ler os cupons"); }', "catch { return jsonResponse({ cupons: [] }, 200); }", TB],
    ["B-M6 painel aceita valor em string", SRC + "pages/CorporativoCupons.jsx", 'typeof c?.valorRs === "number" && ', "", TF],
    ["B-M7 Guardar perde o estado", SRC + "pages/CorporativoCupons.jsx", "cupons: cupons.map((c) => ({ valorRs: c.valorRs, ativo: c.ativo }))", "cupons: cupons.map((c) => ({ valorRs: c.valorRs, ativo: true }))", TF],
    ["B-M8 rota não registada", SRC + "App.jsx", '          <Route path="/corporativo/cupons"', '          <Route path="/corporativo/cupons-x"', TF],
    ["B-M9 entrada no painel aponta a outro sítio", SRC + "pages/CorporativoDashboard.jsx", 'to: "/corporativo/cupons" }', 'to: "/corporativo/cotas" }', TF],
  ],
  C: [
    ["C-M1 passe criado sem cupons", F + "comprar-passe.mjs", "criarPasse({ endereco, edicaoId, produtoId, cuponsIds })", "criarPasse({ endereco, edicaoId, produtoId })", TC],
    ["C-M2 sem cupons não recusa", F + "comprar-passe.mjs", "if (cupons.length === 0) return jsonError", "if (false) return jsonError", TC],
    ["C-M3 erro dos cupons engolido", F + "comprar-passe.mjs", 'catch { return jsonError(503, "store_indisponivel", "não foi possível ler os cupons"); }', "catch { cupons = []; }", TC],
    ["C-M4 inactivos entram", F + "_lib/cupom.mjs", "c.ativo === true && ", "", TC],
    ["C-M5 cupons de qualquer lojista", F + "comprar-passe.mjs", "listarCuponsAtivosDoLojista(produto.lojista)", "listarCuponsAtivosDoLojista(\"0xcccccccccccccccccccccccccccccccccccccccc\")", TC],
    ["C-M6 passe.mjs ignora cuponsIds no INSERT", F + "_lib/passe.mjs", "cupons_ids: [...cuponsIds] })", "cupons_ids: [] })", TC],
    ["C-M7 passe.mjs aceita ids repetidos", F + "_lib/passe.mjs", "\n    || new Set(cuponsIds).size !== cuponsIds.length) return", ") return", TC],
  ],
};

function correr(nome, ficheiro, de, para, teste) {
  const orig = fs.readFileSync(ficheiro);
  const txt = orig.toString("utf8");
  const crlf = txt.includes("\r\n");
  const a = crlf ? de.replace(/\n/g, "\r\n") : de, b = crlf ? para.replace(/\n/g, "\r\n") : para;
  if (!txt.includes(a)) return console.log(`${nome}: NAO ENTROU (alvo ausente)`), false;
  fs.writeFileSync(ficheiro, txt.replace(a, () => b));
  let out = "";
  try { out = execSync(teste.cmd, { cwd: teste.cwd, encoding: "utf8", stdio: "pipe" }); } catch (e) { out = e.stdout || ""; }
  fs.writeFileSync(ficheiro, orig);
  if (!fs.readFileSync(ficheiro).equals(orig)) throw new Error(`restauro falhou: ${ficheiro}`);
  const fail = Number(/# fail (\d+)/.exec(out)?.[1]), tests = Number(/# tests (\d+)/.exec(out)?.[1]);
  const morto = fail > 0;
  console.log(`${nome}: ENTROU · tests=${tests} fail=${fail} → ${morto ? "RED (morto)" : "VERDE (SOBREVIVEU)"}`);
  return morto;
}

const alvo = process.argv[2] || "todos";
const lista = alvo === "todos" ? [...MUT.A, ...MUT.B, ...MUT.C] : MUT[alvo] ?? [];
export { MUT, SRC, TF };
let mortos = 0;
for (const [n, f, de, para, t] of lista) if (correr(n, f, de, para, t)) mortos += 1;
console.log(`RESULTADO ${alvo}: ${mortos}/${lista.length} mortos`);
process.exit(mortos === lista.length && lista.length > 0 ? 0 : 1);
