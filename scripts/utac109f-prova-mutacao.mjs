// utac109f-prova-mutacao.mjs — UTAC109f. Prova de que os testes MORDEM (GATE 7/8).
// Uso (raiz do repo):  node scripts/utac109f-prova-mutacao.mjs < /dev/null
// Mesmo motor do utac109e (âncora única, mutante tem de ENTRAR, RED exigido, restauro md5 em `finally`).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONT = resolve(RAIZ, "desafio-gut", "frontend");
const F = (p) => resolve(FRONT, "src", p);
const CARTAO = F("components/CartaoEdicao.jsx");
const INICIO = F("pages/Dashboard.jsx");
const EDICAO = F("utils/edicao.js");
const T_INICIO = "src/pages/__tests__/Dashboard.test.mjs";
const T_OP = "src/pages/__tests__/utac106f-ofertas.test.mjs";
const T_UNICO = "src/components/__tests__/utac109e-cartao-unico.test.mjs";
const md5 = (b) => createHash("md5").update(b).digest("hex");

const MUTANTES = [
  { id: "F1", desc: "P1 desligada: a Programada ativa volta a «lance já!»", f: EDICAO, t: [T_INICIO],
    de: 'edicao?.tipo === "programado";', para: 'edicao?.tipo === "programado" && false;' },
  { id: "F2", desc: "P1 alargada: a frase do palpite também nas Relâmpago", f: EDICAO, t: [T_INICIO],
    de: 'estado === ESTADO_EDICAO.ATIVA && edicao?.tipo === "programado"', para: 'estado === ESTADO_EDICAO.ATIVA' },
  { id: "F3", desc: "P2 desligada: o palpite vazio volta ao texto genérico", f: CARTAO, t: [T_INICIO, T_OP],
    de: 'palpite: Object.freeze({ mensagem: "Sem edições programadas no momento."', para: 'palpite: Object.freeze({ mensagem: "Nenhuma edição em andamento"' },
  { id: "F4", desc: "P2 só na OP: o Início força a frase antiga", f: INICIO, t: [T_INICIO],
    de: '          vazio={!edicaoProgramada}\n', para: '          vazio={!edicaoProgramada}\n          mensagemVazio="Nenhuma edição Programada em andamento"\n' },
  { id: "F5", desc: "P4: o tempo volta a `flex: none` (espreme o nome)", f: CARTAO, t: [T_INICIO],
    de: 'flex: "0 1 auto", minWidth: 0, textAlign: "right"', para: 'flex: "none", minWidth: 0, textAlign: "right"' },
  { id: "F6", desc: "ordem: o glass final sobe para antes dos acessos", f: INICIO, t: [T_INICIO],
    de: '      <GlassCard as="section" className={cardCls} data-testid="acessos-rapidos"', para: '      <section data-testid="vencedores" />\n      <GlassCard as="section" className={cardCls} data-testid="acessos-rapidos"' },
  { id: "F7", desc: "acessos: «Perfil» volta a /ativos", f: INICIO, t: [T_INICIO],
    de: '{ label: "Perfil",   icon: "👤", to: "/configuracoes"   },', para: '{ label: "Perfil",   icon: "👤", to: "/ativos"   },' },
  { id: "F8", desc: "acessos: toque abaixo de 48 px", f: INICIO, t: [T_INICIO],
    de: 'minHeight: "48px", padding: "0.65rem 0.85rem"', para: 'minHeight: "36px", padding: "0.65rem 0.85rem"' },
  { id: "F9", desc: "glass MLC: o Início volta à R-1 «Em breve» (sem o cartão vazio)", f: INICIO, t: [T_INICIO],
    de: ') : estAtiva.emBreve ? (', para: ') : false ? (' },
  { id: "F10", desc: "glass final com 🏆 (troféu sem resultado oficial)", f: INICIO, t: [T_INICIO],
    de: '<h3 style={cardTitulo}>🏅 Vencedores</h3>', para: '<h3 style={cardTitulo}>🏆 Vencedores</h3>' },
  { id: "F11", desc: "Suporte deixa de ser o e-mail oficial", f: INICIO, t: [T_INICIO],
    de: 'export const EMAIL_SUPORTE = "desafiogut01@gmail.com";', para: 'export const EMAIL_SUPORTE = "suporte@exemplo.com";' },
  { id: "F12", desc: "um dos 4 glass pequenos desaparece (Passe Desafio)", f: INICIO, t: [T_INICIO],
    de: '    passeStat,\n', para: '' },
];

let provados = 0;
for (const m of MUTANTES) {
  const orig = readFileSync(m.f);
  const md5Orig = md5(orig);
  const txt = orig.toString("utf8").replace(/\r\n/g, "\n");
  const crlf = orig.includes("\r\n");
  try {
    if (txt.split(m.de).length - 1 !== 1) throw new Error(`âncora não única/ausente (${txt.split(m.de).length - 1})`);
    const mut = txt.replace(m.de, () => m.para);
    const bytes = Buffer.from(crlf ? mut.replace(/\n/g, "\r\n") : mut, "utf8");
    if (md5(bytes) === md5Orig) throw new Error("o mutante NÃO entrou (ficheiro igual)");
    writeFileSync(m.f, bytes);
    let fail = 0, pass = 0, red = false;
    for (const t of m.t) {
      const r = spawnSync(process.execPath, ["--test", t], { cwd: FRONT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const f = Number((r.stdout.match(/ℹ fail (\d+)/) || [])[1] ?? NaN);
      const p = Number((r.stdout.match(/ℹ pass (\d+)/) || [])[1] ?? NaN);
      if (!Number.isFinite(f)) throw new Error(`não medi ${t} (saída sem resumo)`);
      fail += f; pass += p;
      if (r.status !== 0 && f > 0) red = true;
    }
    if (red) provados++;
    console.log(`${m.id} ${red ? "PROVADO (RED)" : "SOBREVIVEU"} · fail=${fail} pass=${pass} · ${m.desc}`);
  } catch (e) {
    console.log(`${m.id} INVÁLIDO · ${e.message} · ${m.desc}`);
  } finally {
    writeFileSync(m.f, orig);
    if (md5(readFileSync(m.f)) !== md5Orig) { console.log(`!!! ${m.id} RESTAURO FALHOU — PARAR`); process.exit(2); }
  }
}
console.log(`\nMUTAÇÃO: ${provados}/${MUTANTES.length} PROVADOS · restauro md5 idêntico em todos`);
process.exit(provados === MUTANTES.length ? 0 : 1);
