// UTAC000.2 SEG6 — verificação ad-hoc (nome único, corre UMA vez). Reutiliza o verificador versionado e acrescenta o âmbito por commit.
// Controlo positivo: o verificador tem de dar VERMELHO numa cópia com o template adulterado (sem a secção 6).
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
const r = []; const ok = (n, c, d = "") => r.push([c ? "OK " : "FALHA", n, d]);
const v = spawnSync(process.execPath, ["scripts/utac0002-verifica-review.mjs", "todos"], { encoding: "utf8" });
ok("verificador versionado: ficheiros, prompt, template 7 secções, aplicador, review, nada aplicado", v.status === 0, (v.stdout.match(/VEREDITO.*$/m) || [""])[0]);
// Âmbito: os commits DESTE UTAC (âmbito exacto) só tocam ficheiros autorizados.
const commits = execFileSync("git", ["log", "--format=%h %s"], { encoding: "utf8" }).split("\n").filter((l) => /\(UTAC000\.2\):/.test(l)).map((l) => l.split(" ")[0]);
const fich = [...new Set(commits.flatMap((c) => execFileSync("git", ["show", "--name-only", "--format=", c], { encoding: "utf8" }).split("\n").filter(Boolean)))];
const permitido = (f) => /^desafio-gut\/frontend\/skills\/utac01\/(review\/|SKILL\.md$)/.test(f) || /^_logs\/(REVIEWS\/|UTAC000\.2)/.test(f) || /^scripts\/utac0002-/.test(f) || f === "CLAUDE.md";
ok(`commits do UTAC000.2 (${commits.length}) só tocam ficheiros autorizados`, commits.length >= 3 && fich.every(permitido), fich.filter((f) => !permitido(f)).join(","));
ok("nenhum código de produção (src/, netlify/functions/) nos commits", !fich.some((f) => /desafio-gut\/frontend\/(src|netlify)\//.test(f)));
ok("nenhum UTAC fechado alterado (_logs de outros UTACs/MCs)", !fich.some((f) => /^_logs\/(?!REVIEWS\/|UTAC000\.2)/.test(f)));
// Controlo positivo.
const d = fs.mkdtempSync(path.join(os.tmpdir(), "u0002-seg6-")), SK = "desafio-gut/frontend/skills/utac01";
fs.cpSync(SK, path.join(d, SK), { recursive: true }); fs.cpSync("_logs/REVIEWS", path.join(d, "_logs/REVIEWS"), { recursive: true });
const t = path.join(d, SK, "review/template.md"); fs.writeFileSync(t, fs.readFileSync(t, "utf8").replace("## 6. Para o próximo UTAC", "## Seis"));
const c = spawnSync(process.execPath, ["scripts/utac0002-verifica-review.mjs", "A", "--raiz", d], { encoding: "utf8" }); fs.rmSync(d, { recursive: true, force: true });
ok("CONTROLO: verificador detecta template adulterado", c.status !== 0 && /VERMELHO/.test(c.stdout));
for (const l of r) console.log(l.join(" | "));
const f = r.filter((l) => l[0] !== "OK ").length;
console.log(f ? `VEREDITO: VERMELHO (${f})` : `VEREDITO: VERDE (${r.length}/${r.length})`); process.exit(f ? 1 : 0);
