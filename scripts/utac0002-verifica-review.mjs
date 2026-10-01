// UTAC000.2 — verificador da infraestrutura de review da Skill UTAC01. node scripts/utac0002-verifica-review.mjs [A|B|C|D|todos] [--raiz <dir>]
// Lê os ficheiros (sem os alterar) e verifica as propriedades de cada frente. Sai 0 só se tudo VERDE.
// Usado também pela prova de mutação (scripts/utac0002-prova-mutacao.mjs), que corre este verificador sobre cópias adulteradas.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const frente = args.find((a) => !a.startsWith("--")) ?? "todos";
const RAIZ = args.includes("--raiz") ? args[args.indexOf("--raiz") + 1] : process.cwd();
const SK = path.join(RAIZ, "desafio-gut/frontend/skills/utac01");
const ler = (p) => { try { return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"); } catch { return null; } };
const R = [];
const chk = (f, nome, cond) => R.push([f, nome, !!cond]);
const SECOES = ["1. Veredicto", "2. Padrões bons", "3. Padrões maus", "4. Novas regras sugeridas", "5. Novas lições sugeridas", "6. Para o próximo UTAC", "7. Notas de contexto"];
const temSecoes = (t) => t && SECOES.every((s) => new RegExp(`^## ${s.replace(/[.]/g, "\\.")}`, "m").test(t))
  && JSON.stringify([...t.matchAll(/^## (\d+)\. /gm)].map((m) => m[1])) === JSON.stringify(["1", "2", "3", "4", "5", "6", "7"]); // exactamente 1..7, sem repetidas

if (frente === "A" || frente === "todos") {
  const rd = ler(path.join(SK, "review/README.md")), tp = ler(path.join(SK, "review/template.md")), ix = ler(path.join(RAIZ, "_logs/REVIEWS/INDEX.md"));
  chk("A", "README existe e é auto-contido", rd && /\*\*Auto-contido\.\*\*/.test(rd));
  chk("A", "README: fluxo executor → revisor → operador → aplicador → versão", rd && /Executor/.test(rd) && /Revisor/.test(rd) && /Operador/.test(rd) && /aplicador\.md/.test(rd) && /VERSAO\.md/.test(rd));
  chk("A", "README: o review não altera código nem a skill e não aplica sugestões", rd && /Não altera código/.test(rd) && /nem a skill/.test(rd) && /Não aplica sugestões/.test(rd));
  chk("A", "template: as 7 secções, por ordem", tp && temSecoes(tp) && SECOES.every((s, i) => i === 0 || tp.indexOf(`## ${s}`) > tp.indexOf(`## ${SECOES[i - 1]}`)));
  chk("A", "template: evidência obrigatória + L1 + IDs provisórios", tp && /ficheiro:linha/.test(tp) && /Sem dados pessoais/.test(tp) && /provisórios/.test(tp));
  chk("A", "INDEX existe com coluna de decisão do operador", ix && /\| data \| UTAC \| report \|/.test(ix) && /decisão do operador/.test(ix));
  chk("A", "template: secção vazia → «— nada»; «já coberta por?» nas DUAS tabelas", tp && /— nada/.test(tp) && (tp.match(/já coberta por\?/g) || []).length >= 2);
  for (const [n, t] of [["README", rd], ["template", tp], ["INDEX", ix]]) chk("A", `${n}: sem referências a «este MC/UTAC»`, t && !/\beste (MC|UTAC)\b/i.test(t));
}

if (frente === "B" || frente === "todos") {
  const p = ler(path.join(SK, "review/prompt.md"));
  const proib = p && p.slice(p.indexOf("## PROIBIDO"), p.indexOf("## Passo 4"));
  chk("B", "prompt existe, auto-contido, input <UTAC>", p && /\*\*Auto-contido\.\*\*/.test(p) && /## Input/.test(p));
  chk("B", "pré-condição: UTAC sem logs → PARA com erro claro", p && /sem logs: PARA/.test(p) && /ERRO: <UTAC> sem logs/.test(p));
  chk("B", "pré-condição: sem relatório → PARA; review já existe → PARA (não sobrescrever)", p && /ERRO: <UTAC> não está fechado/.test(p) && /não sobrescrever/.test(p));
  chk("B", "lê: logs + relatório + commits do UTAC + skill actual", p && /_logs\/<P>_\*/.test(p) && /RELATORIO\.md/.test(p) && /protocol\/regras/.test(p) && /licoes\.md/.test(p));
  chk("B", "prefixo MC para UTACs antigos (logs e commits)", p && p.includes("**Prefixo `<P>`:**") && p.includes("trocado por `MC`") && p.includes("ls _logs/<P>_*"));
  chk("B", "commits por âmbito exacto; diff = união de git show (um intervalo não se filtra)", p && p.includes("**âmbito exacto**") && p.includes('grep -E "\\(<P') && p.includes("git show --stat <commit>") && p.includes("não se filtra"));
  chk("B", "lê reviews anteriores, ambiente.md e o CLAUDE.md (lições fora da skill)", p && p.includes("Reviews anteriores") && p.includes("protocol/ambiente.md") && p.includes("`CLAUDE.md` do repo"));
  chk("B", "PROIBIDO inclui CLAUDE.md; Passo 4 desfaz a própria alteração", proib && proib.includes("CLAUDE.md") && p.includes("desfaz a TUA alteração"));
  chk("B", "escreve só o report (template, 7 secções) + 1 linha no INDEX", p && /ÚNICOS 2 ficheiros/.test(p) && /_logs\/REVIEWS\/<UTAC>_REVIEW\.md/.test(p) && /as 7 secções/.test(p) && /INDEX\.md/.test(p) && /pendente/.test(p));
  for (const [n, re] of [["código", /Não alterar código/], ["skill", /Não alterar a skill/], ["aplicar sugestões", /Não aplicar sugestões/],
    ["UTACs fechados", /Não alterar UTACs fechados/], ["commit/push", /Não fazer commit, push/], ["dados pessoais (L1)", /Sem dados pessoais/], ["inventar", /Não inventar/]]) {
    chk("B", `PROIBIDO explícito: ${n}`, proib && re.test(proib));
  }
  chk("B", "confirma com git status no fim", p && /git status --short/.test(p));
}

if (frente === "C" || frente === "todos") {
  const a = ler(path.join(SK, "review/aplicador.md")), v = ler(path.join(SK, "review/VERSAO.md")), s = ler(path.join(SK, "SKILL.md"));
  chk("C", "aplicador existe, auto-contido e declara-se MANUAL", a && /\*\*Auto-contido\.\*\*/.test(a) && /\*\*MANUAL — o operador decide\. Nada é automático\.\*\*/.test(a));
  chk("C", "aplicador: só sugestões aceites pelo operador, uma a uma", a && /aceite\*\*, \*\*rejeitada\*\* ou \*\*adiada/.test(a) && /Só as aceites seguem/.test(a));
  chk("C", "regra: categoria → protocol/regras/<categoria>.md → FIM → ID+texto+Origem", a && /protocol\/regras\/<categoria>\.md/.test(a) && /no FIM da lista/.test(a) && /nunca reutilizar um ID/.test(a) && /Origem: <UTAC de origem>\./.test(a));
  chk("C", "regra: actualizar as contagens (README, regras-legado, SKILL)", a && /regras\/README\.md/.test(a) && /regras-legado\.md/.test(a) && /`SKILL\.md`/.test(a));
  chk("C", "lição: licoes.md → fim → número seguinte → UTAC de origem", a && /protocol\/licoes\.md/.test(a) && /número seguinte|Número\*\* = o seguinte/.test(a) && /\*\(<UTAC de origem>\)\*/.test(a));
  const s3 = a && a.slice(a.indexOf("## 3. Bump de versão"), a.indexOf("## 4."));
  chk("C", "§3 bump: em review/VERSAO.md — versão actual sobe + changelog", s3 && /Em `review\/VERSAO\.md`:/.test(s3) && /Versão actual\*\* sobe/.test(s3) && /Changelog/.test(s3) && /minor/.test(s3));
  chk("C", "R18 em 3 lugares (INDEX, VERSAO, CLAUDE.md)", a && /Registo R18 em 3 lugares/.test(a) && /INDEX\.md/.test(a) && /CLAUDE\.md/.test(a));
  chk("C", "nunca reescrever/renumerar o existente; faixa por categoria nas contagens", a && a.includes("nunca reescrever regras existentes") && a.includes("Nunca renumerar lições existentes") && a.includes("`T1-T5` → `T1-T6`"));
  chk("C", "VERSAO.md: versão actual 1.0 + changelog com versão/data/UTAC/o que entrou", v && /\*\*Versão actual: \d+\.\d+\*\*/.test(v) && /\| versão \| data \| UTAC de origem \| o que entrou \|/.test(v));
  chk("C", "SKILL.md aponta para review/ e para VERSAO.md", s && /`review\/`/.test(s) && /review\/VERSAO\.md/.test(s));
}

// ⚠️ Frente D é um TESTE PONTUAL do UTAC000.2 (achado ℹ️-2 do validador): ancora no baseline FIXO 5e7ed24 e prova que o review
// do UTAC105b não aplicou nada. Depois da 1.ª aplicação legítima (VERSAO 1.1) estas verificações ficam VERMELHAS — é esperado.
const BASE = "5e7ed24";
if (frente === "D" || frente === "todos") {
  const rv = ler(path.join(RAIZ, "_logs/REVIEWS/UTAC105b_REVIEW.md")), ix = ler(path.join(RAIZ, "_logs/REVIEWS/INDEX.md"));
  const v = ler(path.join(SK, "review/VERSAO.md"));
  const sec = (t, a, b) => t && t.slice(t.indexOf(a), b ? t.indexOf(b) : undefined);
  chk("D", "Review Report do UTAC105b existe com as 7 secções (1..7, sem repetidas)", temSecoes(rv));
  chk("D", "report declara as fontes lidas (logs, relatório, commits do UTAC)", rv && /Fontes lidas:/.test(rv) && /_logs\/UTAC105b_\*/.test(rv) && /RELATORIO\.md/.test(rv) && /b6e8488 0811c2b 4cbb9f3 5e7ed24/.test(rv));
  const s4 = sec(rv, "## 4. Novas regras sugeridas", "## 5."), s5 = sec(rv, "## 5. Novas lições sugeridas", "## 6.");
  chk("D", "§4 tem as regras sugeridas com origem e «já coberta por?»", s4 && /\| T-novo-1 \|/.test(s4) && /já coberta por\?/.test(s4) && (s4.match(/UTAC105b — `/g) || []).length >= 3);
  chk("D", "§5 tem as lições sugeridas com origem e «já coberta por?»", s5 && /\| L-novo-1 \|/.test(s5) && /já coberta por\?/.test(s5) && (s5.match(/UTAC105b — `/g) || []).length >= 3);
  chk("D", "L1: sem endereço 0x completo, e-mail, CPF nem JWT no report", rv && !/0x[0-9a-fA-F]{40}/.test(rv) && !/[\w.+-]+@[\w-]+\.[\w.]+/.test(rv)
    && !/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(rv) && !/eyJ[\w-]{10,}\./.test(rv));
  chk("D", "INDEX tem a linha do UTAC105b com decisão «pendente»", ix && /\| UTAC105b \| \[UTAC105b_REVIEW\.md\]\(UTAC105b_REVIEW\.md\) \|.*\| pendente \| 1\.0 \|/.test(ix));
  chk("D", "nada aplicado: versão 1.0 e nenhuma outra linha de versão no changelog", v && /\*\*Versão actual: 1\.0\*\*/.test(v) && !/^\| (?!1\.0 \|)\d+\.\d+/m.test(v));
  // Nada aplicado à skill: TODOS os ficheiros que existiam no baseline continuam iguais (ficheiro apagado = falha);
  // SKILL.md = baseline + exactamente a linha do ponteiro para review/ (R18-A).
  const { execFileSync } = await import("node:child_process");
  const g = (...a) => execFileSync("git", a, { encoding: "utf8", cwd: process.cwd() }).replace(/\r\n/g, "\n");
  const lista = g("ls-tree", "-r", "--name-only", BASE, "desafio-gut/frontend/skills/utac01/").split("\n").filter(Boolean);
  const diferentes = [];
  for (const rel of lista) {
    const base = g("show", `${BASE}:${rel}`), atual = ler(path.join(RAIZ, rel));
    if (rel.endsWith("/SKILL.md")) {
      const extra = (atual ?? "").split("\n").filter((l) => !base.split("\n").includes(l));
      const removidas = base.split("\n").filter((l) => !(atual ?? "").split("\n").includes(l));
      if (atual === null || removidas.length || extra.length !== 1 || !/review\/VERSAO\.md/.test(extra[0])) diferentes.push(rel);
    } else if (atual !== base) diferentes.push(rel);
  }
  chk("D", `nada aplicado: ${lista.length} ficheiros da skill do baseline ${BASE} intactos (SKILL.md só +1 ponteiro)`, lista.length === 30 && diferentes.length === 0);
  if (diferentes.length) console.log("  diferentes:", diferentes.join(", "));
}

for (const [f, n, ok] of R) console.log(`${ok ? "VERDE   " : "VERMELHO"} [${f}] ${n}`);
const falhas = R.filter((x) => !x[2]).length;
console.log(R.length === 0 ? "NAO_MEDI (nenhuma verificação correu)" : falhas ? `VEREDITO: VERMELHO (${falhas}/${R.length})` : `VEREDITO: VERDE (${R.length}/${R.length})`);
process.exit(R.length && !falhas ? 0 : 1);
