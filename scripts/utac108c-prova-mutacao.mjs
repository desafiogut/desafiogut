// utac108c-prova-mutacao.mjs — UTAC108c (D-1). Prova de que os testes MORDEM (GATE 7).
// Uso (raiz do repo):  node scripts/utac108c-prova-mutacao.mjs < /dev/null
// Cada mutante: confirma que ENTROU (o ficheiro mudou), corre o teste-alvo e exige RED; restaura da
// cópia em memória e confirma md5 idêntico. O repo nunca fica mutado (restauro em `finally`).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(RAIZ, "desafio-gut", "frontend");
const CART = resolve(FRONT, "src/pages/MinhaCarteira.jsx");
const MLC = resolve(FRONT, "src/pages/MercadoLances.jsx");
const BAN = resolve(FRONT, "src/components/SemSaldoBanner.jsx");
const T_CART = "src/__tests__/utac108c-carteira-mlc.test.mjs";
const T_MLC = "src/pages/__tests__/utac108c-mlc-aviso.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");

const MUTANTES = [
  { id: "M1", desc: "reintroduzir disabled={!saldoReais} no botão MLC da Carteira", f: CART, t: T_CART,
    de: "onClick={irParaMenorLanceUnico}\n", para: "onClick={irParaMenorLanceUnico}\n                  disabled={!saldoReais}\n" },
  { id: "M2", desc: "remover a mensagem «Sem saldo» do MLC", f: MLC, t: T_MLC,
    de: " && <SemSaldoBanner />}", para: " && null}" },
  { id: "M3", desc: "aviso também com saldo desconhecido (null) — viola R18-A", f: BAN, t: T_MLC,
    de: "return saldoRsCentavos === 0;", para: "return !saldoRsCentavos;" },
  { id: "M4", desc: "«Carregar PIX» navega para o sítio errado", f: BAN, t: T_MLC,
    de: 'navigate("/carteira")', para: 'navigate("/mercado")' },
  { id: "M5", desc: "aviso também a contas corporativas — viola R18-B", f: BAN, t: T_MLC,
    de: 'if (tipoProvavel === "corporativo") return false;\n', para: "" },
  { id: "M6", desc: "aviso fora de vidro (Regra 1)", f: BAN, t: T_MLC,
    de: "<GlassCard role=", para: "<div role=" , tambem: ["</GlassCard>", "</div>"] },
  { id: "M7", desc: "o aviso passa a BLOQUEAR (esconde o formulário do lance)", f: MLC, t: T_MLC,
    de: "            <CardLance\n", para: "            {!mostrarAvisoSemSaldo({ isConnected, saldoRsCentavos, saldoRsStatus, tipoProvavel }) && <CardLance\n",
    tambem: ["              ready={ready}\n            />\n", "              ready={ready}\n            />}\n"] },
  // Mutantes sobreviventes do validador (N1/N2), agora cobertos:
  { id: "M8", desc: "(V4) botão MLC com pointerEvents:none", f: CART, t: T_CART,
    de: 'boxShadow: "none",\n                  }}\n                  title="Ir para', para: 'boxShadow: "none", pointerEvents: "none",\n                  }}\n                  title="Ir para' },
  { id: "M9", desc: "(V5) botão MLC com hidden", f: CART, t: T_CART,
    de: 'title="Ir para o Menor Lance Único"', para: 'hidden={!saldoReais} title="Ir para o Menor Lance Único"' },
  { id: "M10", desc: "(V10) «Carregar PIX» com disabled", f: BAN, t: T_MLC,
    de: 'onClick={() => navigate("/carteira")}', para: 'disabled onClick={() => navigate("/carteira")}' },
  { id: "M11", desc: "(V11) aviso inteiro com display:none", f: BAN, t: T_MLC,
    de: 'display: "flex", alignItems', para: 'display: "none", alignItems' },
  { id: "M12", desc: "(V7) aviso fora do <main>", f: MLC, t: T_MLC,
    de: "          {mostrarAvisoSemSaldo({ isConnected, saldoRsCentavos, saldoRsStatus, tipoProvavel }) && <SemSaldoBanner />}\n", para: "",
    tambem: ["        <main style={{", "        {mostrarAvisoSemSaldo({ isConnected, saldoRsCentavos, saldoRsStatus, tipoProvavel }) && <SemSaldoBanner />}\n        <main style={{"] },
];

let provados = 0;
for (const m of MUTANTES) {
  const orig = readFileSync(m.f);
  const md5Orig = md5(orig);
  const txt = orig.toString("utf8").replace(/\r\n/g, "\n");
  const crlf = orig.includes("\r\n");
  try {
    if (txt.split(m.de).length - 1 !== 1) throw new Error(`âncora não única/ausente (${txt.split(m.de).length - 1})`);
    let mut = txt.replace(m.de, () => m.para);
    if (m.tambem) {
      if (mut.split(m.tambem[0]).length - 1 < 1) throw new Error("âncora secundária ausente");
      mut = mut.replace(m.tambem[0], () => m.tambem[1]);
    }
    const bytes = Buffer.from(crlf ? mut.replace(/\n/g, "\r\n") : mut, "utf8");
    if (md5(bytes) === md5Orig) throw new Error("o mutante NÃO entrou (ficheiro igual)");
    writeFileSync(m.f, bytes);
    const r = spawnSync(process.execPath, ["--test", m.t], { cwd: FRONT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const fail = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
    const pass = Number((r.stdout.match(/ℹ pass (\d+)/) || [])[1] ?? NaN);
    const red = r.status !== 0 && fail > 0;
    if (red) provados++;
    console.log(`${m.id} ${red ? "PROVADO (RED)" : "SOBREVIVEU"} · fail=${fail} pass=${pass} · ${m.desc}`);
  } catch (e) {
    console.log(`${m.id} INVÁLIDO · ${e.message} · ${m.desc}`);
  } finally {
    writeFileSync(m.f, orig);
    const ok = md5(readFileSync(m.f)) === md5Orig;
    if (!ok) { console.log(`!!! ${m.id} RESTAURO FALHOU — PARAR`); process.exit(2); }
  }
}
console.log(`\nMUTAÇÃO: ${provados}/${MUTANTES.length} PROVADOS · restauro md5 idêntico em todos`);
process.exit(provados === MUTANTES.length ? 0 : 1);
