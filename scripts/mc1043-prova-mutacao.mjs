// MC104.3 — prova de mutação (R16) das 4 frentes. Cada mutante: alvo único exigido, ficheiro confirmado a MUDAR,
// testes em TAP, RED exigido, bytes originais repostos e md5 confirmado. Uso: node scripts/mc1043-prova-mutacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = join(RAIZ, "desafio-gut/frontend");
const FN = join(FRONT, "netlify/functions");
const CD = join(FN, "_lib/conta-delete.mjs");
const MODAL = join(FRONT, "src/components/ExcluirContaModal.jsx");
const PAGINA = join(FRONT, "src/pages/ExcluirConta.jsx");

const BACK = { cwd: FN, args: ["--experimental-test-module-mocks", "--test", "--test-reporter=tap",
  "_tests/mc1043-conta-delete.test.mjs", "_tests/mc1042-conta-delete-pedidos.test.mjs", "_tests/mc72-conta-delete.test.mjs"] };
const FRENTE_C = { cwd: FRONT, args: ["--test", "--test-reporter=tap", "src/components/__tests__/mc1043-retencao.test.mjs"] };

const MUTANTES = [
  // Frente A
  ["A1 índice antigo não sai", CD, "    await store.delete(antiga);", "", BACK],
  ["A2 índice não esvaziado", CD, "await store.setJSON(chaveAnonima(endereco), { ids: [] });", "await store.setJSON(chaveAnonima(endereco), existente);", BACK],
  ["A3 hash não determinístico", CD, '.update(normalizar(endereco))', '.update(normalizar(endereco) + Date.now())', BACK],
  ["A4 hash sem normalizar", CD, '.update(normalizar(endereco))', '.update(String(endereco))', BACK],
  // Frente B
  ["B1 notificação fica na chave do endereço", CD, "    await store.delete(endereco);", "", BACK],
  ["B2 bids casa qualquer endereço", CD, "if (!m || normalizar(m[2]) !== endereco) continue;", "if (!m) continue;", BACK],
  ["B3 nomeExibicao fica", CD, 'if ("nomeExibicao" in out) out.nomeExibicao = "***";', "", BACK],
  ["B4 legado não anonimizado", CD, "(doTitular(l) ? anonimizarLance(l, endereco) : l)", "l", BACK],
  ["B5 commitmentHash perdido", CD, "const out = { ...lance, endereco: chaveAnonima(endereco) };",
    "const out = { ...lance, endereco: chaveAnonima(endereco) }; delete out.commitmentHash;", BACK],
  // Frente D
  ["D1 repor escrita directa (sem CAS)", CD, 'if (nome === "pedidos" && key.startsWith("pedido:")) {\n', "if (false) {\n", BACK],
  ["D2 falha do CAS silenciosa", CD, "if (falhas.length) throw", "if (false) throw", BACK],
  ["D3 guarda do dono não reavaliada", CD, "normalizar(pedido.endereco ?? pedido.address ?? pedido.comprador) !== endereco", "false", BACK],
  // Fiscal (HG13)
  ["F1 NF-e apagada", CD, 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;', 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO; obj.nfe = null;', BACK],
  ["F2 txHash apagado", CD, 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO;', 'if ("comprador" in obj) obj.comprador = ENDERECO_ANONIMO; delete obj.txHash;', BACK],
  // Frente C
  ["C1 modal sem NF-e", MODAL, '  "NF-e (número, série e chave de acesso) — mantida por 5 anos (obrigação fiscal, CTN arts. 173 e 174).",', "", FRENTE_C],
  ["C2 página sem histórico anonimizado", PAGINA, "<li>Histórico de pedidos — em forma anonimizada.</li>", "", FRENTE_C],
  ["C3 modal sem on-chain", MODAL, "Dados de auditoria on-chain (txHash, commitmentHash), saldo", "Saldo", FRENTE_C],
  ["C4 modal diz consentimento retido", MODAL, "const RETIDOS = [", 'const RETIDOS = [\n  "Registros de consentimento — 5 anos.",', FRENTE_C],
];

const md5 = (b) => createHash("md5").update(b).digest("hex");
const originais = new Map([CD, MODAL, PAGINA].map((f) => [f, readFileSync(f)]));

function correr({ cwd, args }) {
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 300000 });
  const n = (k) => Number((r.stdout.match(new RegExp(`^# ${k} (\\d+)`, "m")) || [])[1]);
  return { pass: n("pass"), fail: n("fail"), tests: n("tests") };
}

let falhas = 0;
for (const suite of [BACK, FRENTE_C]) {
  const b = correr(suite);
  if (!(b.tests > 0 && b.fail === 0)) { console.log("CONTROLO não VERDE:", suite.args.at(-1), b); process.exit(2); }
  console.log(`controlo ${suite === BACK ? "backend" : "frente C"}: ${b.pass}/${b.tests} VERDE`);
}
try {
  for (const [nome, f, de, para, suite] of MUTANTES) {
    const orig = originais.get(f);
    const txt = orig.toString("utf8");
    // CRLF-tolerante: o alvo com \n casa também \r\n no ficheiro.
    const alvo = txt.includes("\r\n") ? de.replace(/\n/g, "\r\n") : de;
    const n = txt.split(alvo).length - 1;
    if (n !== 1) { console.log(`${nome}: ALVO ${n}× — mutante inválido`); falhas++; continue; }
    writeFileSync(f, txt.replace(alvo, txt.includes("\r\n") ? para.replace(/\n/g, "\r\n") : para));
    if (md5(readFileSync(f)) === md5(orig)) { console.log(`${nome}: NÃO ENTROU`); falhas++; continue; }
    const r = correr(suite);
    const morto = r.tests > 0 && r.fail > 0;
    console.log(`${nome}: ${morto ? "PROVADO (RED)" : "SOBREVIVEU"} — ${r.pass}/${r.tests}, fail ${r.fail}`);
    if (!morto) falhas++;
    writeFileSync(f, orig);
  }
} finally {
  for (const [f, orig] of originais) {
    writeFileSync(f, orig);
    const ok = md5(readFileSync(f)) === md5(orig);
    if (!ok) falhas++;
    console.log(`restauração ${f.split(/[\\/]/).pop()}: md5 ${ok ? "IDÊNTICO" : "DIFERENTE!"}`);
  }
}
console.log(falhas === 0 ? `VEREDITO: ${MUTANTES.length}/${MUTANTES.length} PROVADOS` : `VEREDITO: ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
