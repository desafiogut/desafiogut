// UTAC111 — prova de mutação (R16) dos testes novos. Cada mutante: aplica 1 substituição (tem de casar 1×),
// corre o teste alvo, exige VERMELHO, restaura da cópia de segurança e confere o md5.
// node scripts/utac111-prova-mutacao.mjs   (a partir de desafio-gut/frontend)
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FN = "netlify/functions";
const md5 = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
const BACK = mkdtempSync(join(tmpdir(), "utac111-mut-"));
const T_BACK = ["--test", "--experimental-test-module-mocks", "_tests/utac111-pix-produto.test.mjs"];
const T_CARTAO = ["--test", "--test-concurrency=1", "src/components/meus-ativos/__tests__/utac111-pagar-produto.test.mjs"];
const T_CARTEIRA = ["--test", "src/__tests__/utac111-carteira-sem-pix-apk.test.mjs"];

const M = [
  ["M1 valor vem do corpo", `${FN}/iniciar-pagamento.mjs`, "const valorCentavos = pedido.valorPagoCentavos;", "const valorCentavos = Math.round(Number(body.valorBRL ?? pedido.valorPagoCentavos / 100) * 100);", T_BACK, FN],
  ["M2 sem verificação do dono", `${FN}/iniciar-pagamento.mjs`, "if (!pedido || pedido.comprador !== endereco)", "if (!pedido)", T_BACK, FN],
  ["M3 webhook sem ramo do produto", `${FN}/webhook-mercadopago.mjs`, `if (meta?.tipo === "produto") {`, "if (false) {", T_BACK, FN],
  ["M4 sem conferência do valor", `${FN}/_lib/pedidos.mjs`, "valorCentavos !== pedido.valorPagoCentavos) return", "false) return", T_BACK, FN],
  ["M5 sem idempotência", `${FN}/_lib/pedidos.mjs`, "if (pedido.pago_em) {\n      // Outro PIX", "if (false) {\n      // Outro PIX", T_BACK, FN],
  ["M6 consulta sem ramo do produto", `${FN}/confirmar-pagamento.mjs`, `if (tipo === "produto") {`, `if (false) {`, T_BACK, FN], // UTAC112 (achado 4 do validador): âncora sem fim de linha — reproduzível em checkout LF
  ["M7 produto sem paymentId aceite", `${FN}/confirmar-pagamento.mjs`, "(!produtoId || !paymentId)", "(!produtoId)", T_BACK, FN],
  ["M8 pede pagamento depois do envio", "src/lib/pedidos.js", "p.pago_em || p.rastreio) return false;", "p.pago_em) return false;", T_CARTAO, "."],
  ["M9 rótulo pago perdido", "src/lib/pedidos.js", `if (p?.pago_em && passo === "aguarda_envio") return "Pago — aguardando envio";`, "", T_CARTAO, "."],
  ["M10 cartão não renderiza", "src/components/meus-ativos/MeusPedidos.jsx", "{porPagar && <PagarProduto", "{false && <PagarProduto", T_CARTAO, "."],
  ["M11 hook envia valor", "src/hooks/usePagarProduto.js", `{ tipo: "produto", produtoId }`, `{ tipo: "produto", produtoId, valorBRL: 0.01 }`, T_CARTAO, "."],
  ["M12 hook desiste no 402", "src/hooks/usePagarProduto.js", "r.status !== 402 && ", "", T_CARTAO, "."],
  ["M13 depósito sempre visível", "src/pages/MinhaCarteira.jsx", "const depositoPix = !androidNativo();", "const depositoPix = true;", T_CARTEIRA, "."],
  ["M15 PIX para pedido já enviado", `${FN}/iniciar-pagamento.mjs`, "if (pedido.rastreio) return jsonError", "if (false) return jsonError", T_BACK, FN],
  ["M16 2.º pagamento sem alerta", `${FN}/_lib/pedidos.mjs`, "...(duplicado ? { pagamentoDuplicado: String(paymentId) } : {})", "", T_BACK, FN],
  ["M17 (X1) marcar pago sem dono", `${FN}/_lib/pedidos.mjs`, `if (!pedido || pedido.comprador !== String(endereco).toLowerCase()) return { ok: false, code: "pedido_nao_encontrado" };
    if (pedido.pago_em) {`, `if (!pedido) return { ok: false, code: "pedido_nao_encontrado" };
    if (pedido.pago_em) {`, T_BACK, FN],
  ["M18 (X3) produto sem produtoId aceite", `${FN}/confirmar-pagamento.mjs`, "(!produtoId || !paymentId)", "(!paymentId)", T_BACK, FN],
  ["M19 (X5) valor 0 aceite", `${FN}/iniciar-pagamento.mjs`, "pedido.valorPagoCentavos <= 0)", "pedido.valorPagoCentavos < 0)", T_BACK, FN],
  ["M20 texto do depósito no APK", "src/pages/MinhaCarteira.jsx", "{depositoPix && <p style={{", "{<p style={{", T_CARTEIRA, "."],
  ["M21 não reaproveita o PIX pendente", `${FN}/iniciar-pagamento.mjs`, "if (pend?.paymentId && pend.valorCentavos", "if (false && pend?.paymentId && pend.valorCentavos", T_BACK, FN],
  ["M22 PIX descartado não é substituído", `${FN}/_lib/pedidos.mjs`, " && atual.paymentId !== descartado) {", ") {", T_BACK, FN],
  ["M23 pendente aprovado volta a cobrar", `${FN}/iniciar-pagamento.mjs`, `if (status === "approved") {`, "if (false) {", T_BACK, FN],
  ["M24 PIX do produto sem expiração", `${FN}/iniciar-pagamento.mjs`, "gerarPedidoPix({ pedidoId, valorBRL, expiraEmMs })", "gerarPedidoPix({ pedidoId, valorBRL })", T_BACK, FN],
  ["M25 JWT volta aos 15 min", `${FN}/iniciar-pagamento.mjs`, "token = await assinarPedido(payload, ttlSec);", "token = await assinarPedido(payload, TTL_SEC);", T_BACK, FN],
  ["M26 depósito também leva expiração", `${FN}/_lib/pix-provider/mercadopago.mjs`, "if (Number.isFinite(expiraEmMs)) body", "if (true) body", T_BACK, FN],
  ["M27 hook ignora a expiração", "src/hooks/usePagarProduto.js", "if (Date.parse(pix.validUntil) < Date.now()) {", "if (false) {", T_CARTAO, "."],
  ["M14 modal sem a condição", "src/pages/MinhaCarteira.jsx", "aberto={depositoPix && comprarAberto}", "aberto={comprarAberto}", T_CARTEIRA, "."],
];

let provados = 0;
for (const [nome, f, de, para, args, cwd] of M) {
  const orig = md5(f);
  const bak = join(BACK, f.replace(/[\\/]/g, "_"));
  copyFileSync(f, bak);
  const txt = readFileSync(f, "utf8");
  const n = txt.split(de).length - 1;
  if (n !== 1) { console.log(`ABORTA ${nome}: âncora casou ${n}×`); process.exit(2); }
  writeFileSync(f, txt.replace(de, () => para));
  if (md5(f) === orig) { console.log(`ABORTA ${nome}: o mutante não entrou`); process.exit(2); }
  let r;
  try {
    r = spawnSync(process.execPath, args.map((a) => (cwd === FN && a.startsWith("_tests") ? a : a)), { cwd, encoding: "utf8", input: "" });
  } finally {
    copyFileSync(bak, f);
  }
  if (md5(f) !== orig) { console.log(`ABORTA ${nome}: restauro com md5 diferente`); process.exit(3); }
  const fail = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
  const ok = fail > 0;
  if (ok) provados++;
  console.log(`${ok ? "PROVADO" : "SOBREVIVEU"}  ${nome}  (fail=${fail})`);
}
console.log(`\n${provados}/${M.length} PROVADOS · restauro md5 idêntico em todos`);
process.exit(provados === M.length ? 0 : 1);
