// utac107g-prova-mutacao.mjs — UTAC107g (GATE 7). Prova que os testes novos MORDEM.
//
//   node scripts/utac107g-prova-mutacao.mjs            (a partir da raiz do repo)
//
// Para cada mutante: lê os bytes, aplica UMA substituição (tem de casar exactamente 1 vez e
// mudar o ficheiro — senão aborta: um mutante que não entra dá um verde falso), corre os
// ficheiros de teste do alvo e exige VERMELHO; restaura os bytes originais em `finally` e
// confirma md5 idêntico. O restauro é da CÓPIA EM MEMÓRIA, nunca do HEAD (lição UTAC000.11:
// restaurar do git apaga trabalho por commitar).

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FE = join(RAIZ, "desafio-gut", "frontend");
const md5 = (b) => createHash("md5").update(b).digest("hex");

const T_DASH = "src/pages/__tests__/Dashboard.test.mjs";
const T_ATIV = "src/pages/__tests__/utac105c-meus-ativos.test.mjs";
const T_CART = "src/__tests__/utac106c-carteira-render.test.mjs";
const T_NAV  = "src/__tests__/utac107g-navegacao.test.mjs";
const T_ROT  = "src/__tests__/mc991-rotas.test.mjs";

const MUTANTES = [
  { id: "M1", o: "reintroduzir o atalho duplicado «Converter Ficha» → /carteira", f: "src/pages/Dashboard.jsx",
    de: 'const ATALHOS = [', para: 'const ATALHOS = [\n  { label: "Converter Ficha",   icon: "🎫", to: "/carteira"      },', t: [T_DASH] },
  { id: "M2", o: "reintroduzir «Dar Lance» → /mercado (duplica o CTA da Edição Ativa)", f: "src/pages/Dashboard.jsx",
    de: 'const ATALHOS = [', para: 'const ATALHOS = [\n  { label: "Dar Lance",         icon: "🎯", to: "/mercado"       },', t: [T_DASH] },
  { id: "M3", o: "remover o indicador de senhas da Carteira", f: "src/pages/MinhaCarteira.jsx",
    de: "{senhasAntigas > 0 && (", para: "{false && (", t: [T_CART] },
  // M4 (1.ª versão) mutava `saldoSenhas > 0` → `>= 0` no cálculo de `senhasAntigas` e SOBREVIVEU:
  // é EQUIVALENTE por construção — com 0 senhas o valor calculado é 0 e a guarda do render
  // (`senhasAntigas > 0 &&`) esconde na mesma. O mutante que mede «aparece com 0» é o da guarda:
  { id: "M4", o: "indicador aparece com 0 senhas (guarda do render >= em vez de >)", f: "src/pages/MinhaCarteira.jsx",
    de: "{senhasAntigas > 0 && (", para: "{senhasAntigas >= 0 && (", t: [T_CART] },
  { id: "M5", o: "indicador com coerção: «7» (string) passa", f: "src/pages/MinhaCarteira.jsx",
    de: "Number.isSafeInteger(saldoSenhas) && saldoSenhas > 0 &&", para: "Number(saldoSenhas) > 0 &&", t: [T_CART] },
  { id: "M6", o: "indicador ignora o status de erro", f: "src/pages/MinhaCarteira.jsx",
    de: 'saldoSenhas > 0 && saldoSenhasStatus !== "error"', para: "saldoSenhas > 0", t: [T_CART] },
  { id: "M7", o: "indicador leva à Carteira em vez de Meus Ativos", f: "src/pages/MinhaCarteira.jsx",
    de: 'onClick={() => navigate("/ativos")}', para: 'onClick={() => navigate("/carteira")}', t: [T_CART] },
  { id: "M8", o: "Meus Ativos: a secção de senhas desaparece", f: "src/pages/MeusAtivos.jsx",
    de: 'data-secao="senhas-antigas"', para: 'data-secao="senhas-x"', t: [T_ATIV] },
  { id: "M9", o: "Meus Ativos: a contagem coage (Number.isSafeInteger → Number.isFinite(Number()))", f: "src/pages/MeusAtivos.jsx",
    de: "const conhecido = Number.isSafeInteger(saldoSenhas) && saldoSenhas >= 0;",
    para: "const conhecido = Number.isFinite(Number(saldoSenhas)) && Number(saldoSenhas) >= 0;", t: [T_ATIV] },
  { id: "M10", o: "Meus Ativos: secção ganha botão «usar» (R18-D proíbe)", f: "src/pages/MeusAtivos.jsx",
    de: "{\" \"}São usadas no Lance Programado do Menor Lance Único.",
    para: "{\" \"}São usadas no Lance Programado do Menor Lance Único. <button type=\"button\">Usar</button>", t: [T_ATIV] },
  { id: "M11", o: "repor a rota /corp", f: "src/App.jsx",
    de: '<Route path="/corporativo"            element=', para: '<Route path="/corp" element={<CorporativoDashboard />} />\n          <Route path="/corporativo"            element=', t: [T_NAV, T_ROT] },
  { id: "M12", o: "repor a rota /edicao/:id", f: "src/App.jsx",
    de: '<Route path="/programacao"', para: '<Route path="/edicao/:id" element={<Vitrine />} />\n          <Route path="/programacao"', t: [T_NAV] },
  { id: "M13", o: "tirar o catch-all", f: "src/App.jsx",
    de: '<Route path="*" element={<Navigate to="/" replace />} />', para: "", t: [T_NAV] },
  { id: "M14", o: "catch-all manda para /carteira em vez do Início", f: "src/App.jsx",
    de: '<Route path="*" element={<Navigate to="/" replace />} />', para: '<Route path="*" element={<Navigate to="/carteira" replace />} />', t: [T_NAV] },
  { id: "M15", o: "destino duplicado no «Mais» (segundo /ativos)", f: "src/widgets/layout/BottomNav.jsx",
    de: '{ path: "/configuracoes",       label: "Configurações",          Icon: IconSettings },',
    para: '{ path: "/configuracoes",       label: "Configurações",          Icon: IconSettings },\n  { path: "/ativos", label: "Senhas", Icon: IconTrending },', t: [T_NAV] },
];

let falhas = 0;
for (const m of MUTANTES) {
  const alvo = join(FE, m.f);
  const original = readFileSync(alvo);
  const antes = md5(original);
  const txt = original.toString("utf8");
  const n = txt.split(m.de).length - 1;
  if (n !== 1) { console.log(`${m.id} ABORTA: âncora casa ${n}× em ${m.f}`); falhas++; continue; }
  const eol = txt.includes("\r\n") ? "\r\n" : "\n";
  const mutado = txt.replace(m.de, () => m.para.replace(/\n/g, eol));
  if (mutado === txt) { console.log(`${m.id} ABORTA: o mutante não mudou o ficheiro`); falhas++; continue; }
  let veredito;
  try {
    writeFileSync(alvo, mutado);
    if (!readFileSync(alvo, "utf8").includes(m.para.split("\n")[0])) throw new Error("o mutante não entrou");
    const r = spawnSync(process.execPath, ["--test", ...m.t], { cwd: FE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const fail = (r.stdout.match(/ℹ fail (\d+)/) || [])[1];
    veredito = r.status !== 0 ? `RED (fail ${fail ?? "?"})` : "VERDE ⛔ SOBREVIVEU";
    if (r.status === 0) falhas++;
  } finally {
    writeFileSync(alvo, original);
  }
  const depois = md5(readFileSync(alvo));
  if (depois !== antes) { console.log(`${m.id} ⛔ RESTAURO FALHOU (${antes} → ${depois})`); process.exit(2); }
  console.log(`${m.id} ${veredito} · md5 restaurado ${depois.slice(0, 8)} · ${m.o}`);
}
console.log(falhas === 0 ? `\nMUTAÇÃO ${MUTANTES.length}/${MUTANTES.length} PROVADOS` : `\n⛔ ${falhas} mutante(s) sobreviveram/abortaram`);
process.exit(falhas === 0 ? 0 : 1);
