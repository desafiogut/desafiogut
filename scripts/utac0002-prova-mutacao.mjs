// UTAC000.2 — prova de mutação (T1/T5) do verificador. node scripts/utac0002-prova-mutacao.mjs [A|B|C|D|todos]
// Cada mutante: copia a skill + _logs/REVIEWS para um directório temporário, adultera UM ficheiro da CÓPIA (confirma que
// ENTROU), corre o verificador com --raiz na cópia e exige VERMELHO. Os ficheiros reais nunca são tocados.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REAL = process.cwd();
const SK = "desafio-gut/frontend/skills/utac01";
const MUT = {
  A: [
    ["A-M1 README sem a proibição de alterar código", `${SK}/review/README.md`, "- Não altera código, logs", "- Altera código, logs"],
    ["A-M2 template sem a secção 5", `${SK}/review/template.md`, "## 5. Novas lições sugeridas", "## 5. Ideias"],
    ["A-M3 template com secções trocadas", `${SK}/review/template.md`, "## 6. Para o próximo UTAC", "## 6. Para o próximo UTAC\n\n## 2. Padrões bons (manter)"],
    ["A-M4 template sem L1", `${SK}/review/template.md`, "Sem dados pessoais", "Com dados"],
    ["A-M5 INDEX sem coluna de decisão", "_logs/REVIEWS/INDEX.md", "| decisão do operador |", "| estado |"],
    ["A-M6 README fala de «este UTAC»", `${SK}/review/README.md`, "## Porquê", "## Porquê\nEste UTAC criou isto."],
    ["A-V9 template sem «já coberta por?» nas lições", `${SK}/review/template.md`, "| origem | já coberta por? |", "| origem |"],
    ["A-V12 template sem «— nada»", `${SK}/review/template.md`, "escrever «— nada»", "omitir"],
  ],
  B: [
    ["B-M1 remove a proibição de alterar a skill", `${SK}/review/prompt.md`, "- **Não alterar a skill** (`skills/utac01/**`, incluindo `review/` e `VERSAO.md`). **Não aplicar sugestões** — isso é do operador, pelo `aplicador.md`.\n", ""],
    ["B-M2 remove a proibição de alterar código", `${SK}/review/prompt.md`, "- **Não alterar código**", "- **Pode alterar código**"],
    ["B-M3 UTAC sem logs não pára", `${SK}/review/prompt.md`, "→ **sem logs: PARA**", "→ sem logs: continuar"],
    ["B-M4 diff por intervalo em vez de git show por commit", `${SK}/review/prompt.md`, "git show --stat <commit>", "git diff --stat <baseline>..HEAD"],
    ["B-V7 sem âmbito exacto (grep apanha sub-UTACs)", `${SK}/review/prompt.md`, "**âmbito exacto**", "nome"],
    ["B-V8 não lê reviews anteriores", `${SK}/review/prompt.md`, "6. Reviews anteriores em", "6. Outros ficheiros em"],
    ["B-V11 Passo 4 sem desfazer", `${SK}/review/prompt.md`, "desfaz a TUA alteração e reporta", "reporta"],
    ["B-V14 CLAUDE.md fora do PROIBIDO", `${SK}/review/prompt.md`, "(`_logs/<UTAC>_*`, relatórios, `Desktop/`), nem `CLAUDE.md`.", "(`_logs/<UTAC>_*`, relatórios, `Desktop/`)."],
    ["B-V15 sem prefixo MC", `${SK}/review/prompt.md`, "trocado por `MC`", "igual"],
    ["B-V16 não lê o CLAUDE.md", `${SK}/review/prompt.md`, "`CLAUDE.md` do repo", "nada"],
    ["B-M5 proibição movida para fora da secção PROIBIDO", `${SK}/review/prompt.md`, "- Não fazer commit, push, deploy, nem tocar em Supabase/Netlify. Não instalar nada.\n", ""],
    ["B-M6 sobrescreve review existente", `${SK}/review/prompt.md`, "(não sobrescrever)", "(sobrescrever)"],
  ],
  C: [
    ["C-M1 aplicador deixa de ser manual", `${SK}/review/aplicador.md`, "**MANUAL — o operador decide. Nada é automático.**", "Aplica-se automaticamente."],
    ["C-M2 regra sem Origem", `${SK}/review/aplicador.md`, "   Origem: <UTAC de origem>.\n", ""],
    ["C-M3 regra no meio / ID reutilizável", `${SK}/review/aplicador.md`, "no FIM da lista** — nunca no meio, nunca reutilizar um ID", "onde fizer sentido**"],
    ["C-M4 sem bump de versão", `${SK}/review/aplicador.md`, "Em `review/VERSAO.md`:", "Em algum sítio:"],
    ["C-M5 R18 sem os 3 lugares", `${SK}/review/aplicador.md`, "## 4. Registo R18 em 3 lugares", "## 4. Registo"],
    ["C-M6 SKILL.md sem o ponteiro", `${SK}/SKILL.md`, "versão actual da skill em `review/VERSAO.md`", "versão algures"],
    ["C-M7 VERSAO sem versão actual", `${SK}/review/VERSAO.md`, "**Versão actual: 1.0**", "Versão: ?"],
    ["C-V10 aplicador permite reescrever regras", `${SK}/review/aplicador.md`, "nunca reescrever regras existentes", "pode-se reescrever regras existentes"],
    ["C-V17 aplicador permite renumerar lições", `${SK}/review/aplicador.md`, "Nunca renumerar lições existentes.", "Renumerar se preciso."],
  ],
  D: [
    ["D-M1 report sem a secção 3", "_logs/REVIEWS/UTAC105b_REVIEW.md", "## 3. Padrões maus (evitar)", "## Coisas"],
    ["D-M2 sugestão aplicada à skill (regra nova em T-testes.md)", `${SK}/protocol/regras/T-testes.md`, "Origem: UTAC100.\n", "Origem: UTAC100.\n\n## T6 — Testar auth com módulos reais\nOrigem: UTAC105b.\n"],
    ["D-M3 versão subida sem decisão", `${SK}/review/VERSAO.md`, "**Versão actual: 1.0**", "**Versão actual: 1.1**"],
    ["D-M4 endereço completo no report (L1)", "_logs/REVIEWS/UTAC105b_REVIEW.md", "## 7. Notas de contexto", "## 7. Notas de contexto\n- lojista 0xcccccccccccccccccccccccccccccccccccccccc"],
    ["D-M5 INDEX com decisão tomada pelo revisor", "_logs/REVIEWS/INDEX.md", "| pendente | 1.0 |", "| aceite | 1.1 |"],
    ["D-M6 lição acrescentada a licoes.md", `${SK}/protocol/licoes.md`, "## Sobre o que corre mal", "## Sobre o que corre mal\n\n19. **x** *(UTAC105b)*. y"],
    ["D-M7 report sem as fontes lidas", "_logs/REVIEWS/UTAC105b_REVIEW.md", "Fontes lidas:", "Fontes:"],
    ["D-V1 ficheiro da skill apagado (A-ambiente.md)", `${SK}/protocol/regras/A-ambiente.md`, "# ", "__APAGAR__"],
    ["D-V2 revisor altera hard-gates.md", `${SK}/protocol/hard-gates.md`, "# ", "# (alterado) "],
    ["D-V3 contagem 61→64 no SKILL.md", `${SK}/SKILL.md`, "61 regras em 9 categorias, lições", "64 regras em 9 categorias, lições"],
    ["D-V4 §4 vazia com a tabela movida para o fim", "_logs/REVIEWS/UTAC105b_REVIEW.md", "## 4. Novas regras sugeridas", "__MOVER_S4__"],
    ["D-V5 e-mail no report (L1)", "_logs/REVIEWS/UTAC105b_REVIEW.md", "## 7. Notas de contexto", "## 7. Notas de contexto\n- contacto fulano@exemplo.com"],
    ["D-V5b CPF no report (L1)", "_logs/REVIEWS/UTAC105b_REVIEW.md", "## 7. Notas de contexto", "## 7. Notas de contexto\n- cpf 529.982.247-25"],
    ["D-V6 linha 2.0 no changelog", `${SK}/review/VERSAO.md`, "| 1.0 | 2026-09-30 |", "| 2.0 | 2026-10-01 | x | y |\n| 1.0 | 2026-09-30 |"],
  ],
};

function copia() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "utac0002-mut-"));
  fs.cpSync(path.join(REAL, SK), path.join(d, SK), { recursive: true });
  fs.cpSync(path.join(REAL, "_logs/REVIEWS"), path.join(d, "_logs/REVIEWS"), { recursive: true });
  return d;
}
const alvo = process.argv[2] || "todos";
const frentes = alvo === "todos" ? Object.keys(MUT) : [alvo];
let mortos = 0, total = 0;
for (const f of frentes) for (const [nome, rel, de, para] of MUT[f]) {
  total += 1;
  const d = copia(); const p = path.join(d, rel);
  const txt = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  if (!txt.includes(de)) { console.log(`${nome}: NAO ENTROU (alvo ausente)`); fs.rmSync(d, { recursive: true, force: true }); continue; }
  if (para === "__APAGAR__") fs.rmSync(p);                       // mutante: ficheiro apagado
  else if (para === "__MOVER_S4__") {                               // mutante: §4 vazia, a tabela vai para o fim do ficheiro
    const i = txt.indexOf("## 4. Novas regras sugeridas"), j = txt.indexOf("## 5.");
    const corpo = txt.slice(i, j).replace("## 4. Novas regras sugeridas", "");
    fs.writeFileSync(p, txt.slice(0, i) + "## 4. Novas regras sugeridas\n— nada\n\n" + txt.slice(j) + "\n" + corpo);
  } else fs.writeFileSync(p, txt.replace(de, () => para));
  const r = spawnSync(process.execPath, [path.join(REAL, "scripts/utac0002-verifica-review.mjs"), f, "--raiz", d], { encoding: "utf8" });
  fs.rmSync(d, { recursive: true, force: true });
  const morto = r.status !== 0 && /VEREDITO: VERMELHO/.test(r.stdout);
  if (morto) mortos += 1;
  console.log(`${nome}: ENTROU → ${morto ? "VERMELHO (morto)" : "VERDE (SOBREVIVEU)"}`);
}
// Controlo: a cópia SEM mutação tem de dar VERDE (senão o RED dos mutantes não prova nada).
{ const d = copia(); const r = spawnSync(process.execPath, [path.join(REAL, "scripts/utac0002-verifica-review.mjs"), alvo, "--raiz", d], { encoding: "utf8" });
  fs.rmSync(d, { recursive: true, force: true }); console.log(`CONTROLO cópia intacta: ${r.status === 0 ? "VERDE" : "VERMELHO (instrumento inválido)"}`); if (r.status !== 0) process.exit(2); }
console.log(`RESULTADO ${alvo}: ${mortos}/${total} mortos`);
process.exit(total > 0 && mortos === total ? 0 : 1);
