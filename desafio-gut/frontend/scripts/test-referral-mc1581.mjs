// Smoke-test MC15.8.1 — não-regressão do sistema de referral.
// Verifica que o módulo _lib/referral.mjs carrega (todos os imports resolvem),
// que a API pública usada pelos endpoints/ganchos continua exportada, e que o
// helper puro diaBRT (fuso de Brasília, UTC-3) está correto. Sem IO/rede.
//
// Uso: node scripts/test-referral-mc1581.mjs   (a partir de desafio-gut/frontend)

import * as ref from "../netlify/functions/_lib/referral.mjs";

let falhas = 0;
function ok(cond, msg) {
  if (cond) { console.log("  ✓", msg); }
  else { console.error("  ✗", msg); falhas++; }
}

console.log("MC15.8.1 — smoke-test referral");

// 1) API pública intacta (consumida por referral.mjs endpoint, comprar-senhas.mjs,
//    lance-relampago.mjs e pela camada indutiva MC15.8.1).
const requeridas = [
  // existentes (não-regressão MC10)
  "gerarCodigoIndicacao", "validarCodigoIndicacao", "registrarIndicacao",
  "estatisticasIndicador", "referralAtivo", "buscarVinculoPorIndicado",
  "registrarConversao", "concederBonus", "verificarLimiteMensal", "verificarFraude",
  // novas (MC15.8.1)
  "appendReferralLog", "lerReferralLog", "diaBRT",
  "mensagemInducao", "registrarInducaoConvertida", "lerInducoesPendentes", "marcarInducoesLidas",
];
for (const f of requeridas) ok(typeof ref[f] === "function", `exporta ${f}()`);

// 1b) mensagemInducao — singular (com e sem nome) vs plural.
ok(ref.mensagemInducao(1, "Ana").includes("O teu amigo Ana") && ref.mensagemInducao(1, "Ana").includes("+1 senha"),
  "mensagemInducao singular com nome");
ok(ref.mensagemInducao(1, null).includes("Um amigo teu"), "mensagemInducao singular sem nome");
ok(ref.mensagemInducao(3, "Ana").includes("3 amigos") && ref.mensagemInducao(3, "Ana").includes("+3 senhas"),
  "mensagemInducao plural agregado");

// 2) diaBRT — fuso Brasília (UTC-3). 01:00Z cai no dia anterior em BRT; 12:00Z
//    (= 09:00 BRT, hora do relatório) cai no mesmo dia.
ok(ref.diaBRT(new Date("2026-06-01T01:00:00Z")) === "2026-05-31", "diaBRT 01:00Z -> dia anterior (BRT)");
ok(ref.diaBRT(new Date("2026-06-01T12:00:00Z")) === "2026-06-01", "diaBRT 12:00Z -> mesmo dia (BRT)");
ok(/^\d{4}-\d{2}-\d{2}$/.test(ref.diaBRT()), "diaBRT() formato YYYY-MM-DD");

if (falhas > 0) { console.error(`\nFALHOU: ${falhas} verificação(ões).`); process.exit(1); }
console.log("\nOK — referral MC15.8.1 íntegro.");
