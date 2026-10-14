// UTAC110f-front — prova de mutação. Cada mutante tem de ENTRAR (o ficheiro muda) e pôr o teste-alvo VERMELHO;
// o restauro é por snapshot binário e verificado por sha256. Correr: node scripts/utac110f-front-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "desafio-gut", "frontend");
const FN = resolve(FE, "netlify", "functions");
const T_FE = ["--test", "src/__tests__/utac110f-front-missoes.test.mjs"];
const T_BE = ["--test", "--experimental-test-module-mocks", "_tests/utac110f-front-missoes.test.mjs"];
const sha = (b) => createHash("sha256").update(b).digest("hex");

const MUTANTES = [
  ["M1 pontosHoje ignora o lance", resolve(FN, "ler-pontos.mjs"), "+ (lanceFeito ? PONTOS_MISSAO_LANCE : 0)", "+ 0", FN, T_BE],
  ["M2 sem fail-soft (missões derrubam o ler-pontos)", resolve(FN, "ler-pontos.mjs"), "  } catch {\n    return null;\n  }\n}", "  } catch (e) {\n    throw e;\n  }\n}", FN, T_BE],
  ["M3 missoesHoje fora da resposta", resolve(FN, "ler-pontos.mjs"), "    missoesHoje,\n", "", FN, T_BE],
  ["M4 hook aceita com coerção", resolve(FE, "src/hooks/usePontos.js"), 'if (typeof loginFeito !== "boolean" || typeof lanceFeito !== "boolean") return null;', "", FE, T_FE],
  ["M5 hook não lê missoesHoje", resolve(FE, "src/hooks/usePontos.js"), "missoesHoje: missoesDaResposta(data),", "missoesHoje: null,", FE, T_FE],
  ["M6 «Volte amanhã!» sempre", resolve(FE, "src/pages/MinhaCarteira.jsx"), '{todasFeitas ? " Volte amanhã!" : ""}', '{" Volte amanhã!"}', FE, T_FE],
  ["M7 feito a muted (cor)", resolve(FE, "src/pages/MinhaCarteira.jsx"), "color: m.feito ? COR.gold : COR.muted,\n                          }}>", "color: COR.muted,\n                          }}>", FE, T_FE],
  ["M8 neutro inventa «pendente»", resolve(FE, "src/pages/MinhaCarteira.jsx"), 'pontosCarregando ? "carregando" : (pontosErro || !missoesHoje) ? "neutro" : "ok"', 'pontosCarregando ? "carregando" : "ok"', FE, T_FE],
  ["M9 login lê o lance", resolve(FE, "src/pages/MinhaCarteira.jsx"), "feito: missoesHoje.loginFeito", "feito: missoesHoje.lanceFeito", FE, T_FE],
  // SEG4 — achados do validador adversarial (F1) e os seus sobreviventes (V4, V8, V10).
  ["M10 F1: estado ignora pontosErro", resolve(FE, "src/pages/MinhaCarteira.jsx"), "(pontosErro || !missoesHoje) ? \"neutro\"", "(!missoesHoje) ? \"neutro\"", FE, T_FE],
  ["M11 V4: sr-only invertido", resolve(FE, "src/pages/MinhaCarteira.jsx"), '{m.feito ? " — feito" : " — pendente"}', '{m.feito ? " — pendente" : " — feito"}', FE, T_FE],
  ["M12 V8: glifo sem aria-hidden", resolve(FE, "src/pages/MinhaCarteira.jsx"), '<span aria-hidden="true" style={{\n                            width: "1.25rem"', '<span style={{\n                            width: "1.25rem"', FE, T_FE],
  ["M13 V10: rodapé recalculado no cliente", resolve(FE, "src/pages/MinhaCarteira.jsx"), "Você ganhou ${missoesHoje.pontosHoje} pontos", "Você ganhou ${(missoesHoje.loginFeito ? 5 : 0) + (missoesHoje.lanceFeito ? 10 : 0)} pontos", FE, T_FE],
];

let provados = 0;
for (const [nome, ficheiro, de, para, cwd, args] of MUTANTES) {
  const orig = readFileSync(ficheiro);
  const txt = orig.toString("utf8");
  const crlf = txt.includes("\r\n");
  const a = crlf ? de.replaceAll("\n", "\r\n") : de;
  const b = crlf ? para.replaceAll("\n", "\r\n") : para;
  const n = txt.split(a).length - 1;
  if (n !== 1) { console.log(`✗ ${nome}: âncora casou ${n}× (mutante NÃO entrou) — instrumento inválido`); continue; }
  try {
    writeFileSync(ficheiro, txt.replace(a, () => b));
    if (sha(readFileSync(ficheiro)) === sha(orig)) { console.log(`✗ ${nome}: ficheiro não mudou`); continue; }
    const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const fail = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
    const ok = fail > 0;
    if (ok) provados++;
    console.log(`${ok ? "✓ PROVADO" : "✗ SOBREVIVE"} ${nome} — fail ${fail}`);
  } finally {
    writeFileSync(ficheiro, orig);
    if (sha(readFileSync(ficheiro)) !== sha(orig)) { console.log(`⛔ RESTAURO FALHOU em ${ficheiro}`); process.exit(3); }
  }
}
console.log(`\n${provados}/${MUTANTES.length} PROVADOS`);
process.exit(provados === MUTANTES.length ? 0 : 1);
