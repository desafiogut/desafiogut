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
  for (const [n, t] of [["README", rd], ["template", tp], ["INDEX", ix]]) chk("A", `${n}: sem referências a «este MC/UTAC»`, t && !/\beste (MC|UTAC)\b/i.test(t));
}

if (frente === "B" || frente === "todos") {
  const p = ler(path.join(SK, "review/prompt.md"));
  const proib = p && p.slice(p.indexOf("## PROIBIDO"), p.indexOf("## Passo 4"));
  chk("B", "prompt existe, auto-contido, input <UTAC>", p && /\*\*Auto-contido\.\*\*/.test(p) && /## Input/.test(p));
  chk("B", "pré-condição: UTAC sem logs → PARA com erro claro", p && /sem logs: PARA/.test(p) && /ERRO: <UTAC> sem logs/.test(p));
  chk("B", "pré-condição: sem relatório → PARA; review já existe → PARA (não sobrescrever)", p && /ERRO: <UTAC> não está fechado/.test(p) && /não sobrescrever/.test(p));
  chk("B", "lê: logs + relatório + diff (baseline..commits do UTAC) + skill actual", p && /_logs\/<UTAC>_\*/.test(p) && /RELATORIO\.md/.test(p) && /git diff --stat <baseline>/.test(p) && /git log --oneline --grep/.test(p) && /protocol\/regras/.test(p) && /licoes\.md/.test(p));
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
  chk("C", "VERSAO.md: versão actual 1.0 + changelog com versão/data/UTAC/o que entrou", v && /\*\*Versão actual: \d+\.\d+\*\*/.test(v) && /\| versão \| data \| UTAC de origem \| o que entrou \|/.test(v));
  chk("C", "SKILL.md aponta para review/ e para VERSAO.md", s && /`review\/`/.test(s) && /review\/VERSAO\.md/.test(s));
}

if (frente === "D" || frente === "todos") {
  const rv = ler(path.join(RAIZ, "_logs/REVIEWS/UTAC105b_REVIEW.md")), ix = ler(path.join(RAIZ, "_logs/REVIEWS/INDEX.md"));
  const v = ler(path.join(SK, "review/VERSAO.md"));
  chk("D", "Review Report do UTAC105b existe com as 7 secções (1..7, sem repetidas)", temSecoes(rv));
  chk("D", "report declara as fontes lidas (logs, relatório, diff)", rv && /Fontes lidas:/.test(rv) && /_logs\/UTAC105b_\*/.test(rv) && /RELATORIO\.md/.test(rv) && /diff `5cac238\.\.5e7ed24`/.test(rv));
  chk("D", "sugestões com ID provisório e origem", rv && /\| T-novo-1 \|/.test(rv) && /\| L-novo-1 \|/.test(rv) && (rv.match(/UTAC105b — `/g) || []).length >= 4);
  chk("D", "L1: nenhum endereço 0x completo no report", rv && !/0x[0-9a-fA-F]{40}/.test(rv));
  chk("D", "INDEX tem a linha do UTAC105b com decisão «pendente»", ix && /\| UTAC105b \| \[UTAC105b_REVIEW\.md\]\(UTAC105b_REVIEW\.md\) \|.*\| pendente \| 1\.0 \|/.test(ix));
  chk("D", "nada aplicado: versão continua 1.0 e o changelog só tem a 1.0", v && /\*\*Versão actual: 1\.0\*\*/.test(v) && !/^\| 1\.[1-9]/m.test(v));
  // Nada aplicado à skill: regras e lições iguais ao HEAD do repo real (comparação de conteúdo, LF).
  const { execFileSync } = await import("node:child_process");
  const prot = ["protocol/licoes.md", ...fs.readdirSync(path.join(SK, "protocol/regras")).map((f) => `protocol/regras/${f}`)];
  const iguais = prot.every((rel) => {
    let head; try { head = execFileSync("git", ["show", `HEAD:desafio-gut/frontend/skills/utac01/${rel}`], { encoding: "utf8" }).replace(/\r\n/g, "\n"); } catch { return false; }
    return ler(path.join(SK, rel)) === head;
  });
  chk("D", `nada aplicado: ${prot.length} ficheiros de regras/lições iguais ao HEAD`, iguais);
}

for (const [f, n, ok] of R) console.log(`${ok ? "VERDE   " : "VERMELHO"} [${f}] ${n}`);
const falhas = R.filter((x) => !x[2]).length;
console.log(R.length === 0 ? "NAO_MEDI (nenhuma verificação correu)" : falhas ? `VEREDITO: VERMELHO (${falhas}/${R.length})` : `VEREDITO: VERDE (${R.length}/${R.length})`);
process.exit(R.length && !falhas ? 0 : 1);
