// UTAC110h.2 · FRENTE D — as 3 pendências menores (R18-110h.2-5).
//   D1 `Privacidade.jsx` — zero «senhas» (o produto chama-se «Passe Desafio» no Regulamento v5.0);
//   D2 `pt.js` — «regra do torneio» → «regra da competição» (vocabulário do v5);
//   D3 `TermosConsentimento.jsx` — a caixa de contacto mostra SÓ o e-mail (Art. 69º: «exclusivamente
//      através do e-mail desafiogut01@gmail.com»).
//
// Análise estática sobre o texto-fonte; os comentários são removidos antes de medir (o próprio
// comentário do D3 cita o telefone e o site para explicar o que saiu — sem os remover, o instrumento
// acusaria o corrector). Contraste/overflow provam-se nas 2 capturas do SEG4.
//
// node --test src/__tests__/utac110h2-pendencias.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => readFileSync(resolve(SRC, p), "utf8").replace(/\r\n/g, "\n");
function codigo(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => "\n".repeat(m.split("\n").length - 1))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/[^\n]*/g, "");
}

// ── D1 — Privacidade.jsx ───────────────────────────────────────────────────────────────────────
test("D1 Privacidade: zero «senha»/«senhas» no texto visível (passa a «Passe Desafio»)", () => {
  const P = ler("pages/Privacidade.jsx");
  const semComentarios = codigo(P);
  const ocorrencias = [...semComentarios.matchAll(/\bsenhas?\b/gi)].map((m) => m[0]);
  assert.deepEqual(ocorrencias, [], `a Privacidade ainda diz: ${ocorrencias.join(", ")}`);
  // O produto é nomeado como o Regulamento v5.0 o nomeia.
  assert.match(semComentarios, /adquirir Passes Desafio/, "o 1.º sítio não passou a «Passes Desafio»");
  assert.match(semComentarios, /Histórico de compras de Passes Desafio/, "o 2.º sítio não passou a «Passes Desafio»");
  assert.match(semComentarios, /saldo de Passes Desafio/, "o 3.º sítio não passou a «Passes Desafio»");
});

// ── D2 — pt.js ─────────────────────────────────────────────────────────────────────────────────
const PT = ler("i18n/pt.js");
/** Todos os VALORES de `"chave": "valor"` — as CHAVES (`ativos.torneio.*`) NÃO se renomeiam. */
const valores = [...PT.matchAll(/^\s*"[^"]+":\s*"([^"]*)"/gm)].map((m) => m[1]);

test("D2 pt.js: nenhum VALOR i18n diz «torneio»; o aviso do lance diz «competição»", () => {
  const comTorneio = valores.filter((v) => /\btorneio\b/i.test(v));
  assert.deepEqual(comTorneio, [], `valores com «torneio»: ${comTorneio.join(" | ")}`);
  const aviso = valores.find((v) => v.startsWith("Projeção pela regra"));
  assert.ok(aviso, "não encontrei o aviso do lance em pt.js");
  assert.match(aviso, /^Projeção pela regra da competição\./, `aviso: «${aviso}»`);
  // As CHAVES continuam a ser `ativos.torneio.*` (renomeá-las partiria os consumidores).
  assert.match(PT, /"ativos\.torneio\.titulo"/, "a chave i18n `ativos.torneio.titulo` desapareceu");
});

// ── D3 — TermosConsentimento.jsx (a caixa de contacto) ──────────────────────────────────────────
/** Verificador da caixa de contacto: só o e-mail do Art. 69º. */
function problemasContato(txt) {
  const p = [];
  if (/\(\d{2}\)\s*\d{4,5}[-.\s]?\d{4}/.test(txt)) p.push("mostra telefone");
  if (/www\.|https?:\/\//.test(txt)) p.push("mostra site");
  if (!/desafiogut01@gmail\.com/.test(txt)) p.push("não mostra o e-mail do Art. 69º");
  return p;
}
const blocoContato = (fonte) => {
  const i = fonte.indexOf("estilos.contatoBox}>");
  assert.ok(i > 0, "não encontrei a caixa de contacto");
  return fonte.slice(i, i + 280);
};

test("D3 Termos: a caixa de contacto mostra SÓ o e-mail (Art. 69º do v5.0)", () => {
  const T = ler("components/TermosConsentimento.jsx");
  assert.deepEqual(problemasContato(blocoContato(T)), [], `caixa: «${blocoContato(T)}»`);
  // ⚠️ ALCANCE (mutante V12 do validador do SEG5, que SOBREVIVEU): a janela de 280 caracteres só olha para
  // DENTRO da caixa — um telefone posto noutra parte do MESMO componente passaria. Agora o componente
  // inteiro (sem comentários) é varrido: nenhum telefone e nenhum site em lado nenhum do gate.
  const codigoT = codigo(T);
  assert.doesNotMatch(codigoT, /\(\d{2}\)\s*\d{4,5}[-.\s]?\d{4}/, "apareceu um TELEFONE no gate");
  assert.doesNotMatch(codigoT, /www\.|https?:\/\//, "apareceu um SITE no gate");
  // A fonte legal, lida do ficheiro: o Art. 69º mandava «exclusivamente» e-mail e passou a dar o DPO
  // como canal de LGPD (UTAC110m.2) — a caixa continua a ser o canal de DÚVIDAS (ver abaixo).
  const REG = readFileSync(resolve(SRC, "..", "..", "..", "docs", "REGULAMENTO-v5.md"), "utf8");
  const art69 = (REG.match(/Art\. 69º[^\n]*/) ?? [])[0] ?? "";
  // ⚠️ UTAC110m.2 (2026-10-18) — a justificação legal desta caixa mudou: o Art. 69º deixou de
  // dizer «exclusivamente» e passou a dar o DPO como canal de LGPD. A asserção anterior era
  //   assert.match(art69, /exclusivamente através do e-mail desafiogut01@gmail\.com/, …)
  // e fica preservada aqui, REFUTADA. O que se exige agora: a caixa continua a ser o canal de
  // DÚVIDAS (Gmail) — e o Regulamento, esse, já nomeia o DPO para a LGPD (que a caixa ainda NÃO
  // mostra: é a DEBT-063, a fechar no UTAC da UI).
  assert.match(art69, /Dúvidas, informações e sugestões deverão ser encaminhadas através do e-mail desafiogut01@gmail\.com/, `Art. 69º: «${art69}»`);
  assert.match(art69, /dpo@grupouniaoetrabalho\.com\.br/, `Art. 69º: o DPO tem de estar lá — «${art69}»`);
});

test("controlo positivo: o verificador da caixa de contacto apanha a caixa ANTIGA (verbatim)", () => {
  const antiga = '📧 Dúvidas: desafiogut01@gmail.com &nbsp;·&nbsp;\n              📞 (92) 98428-5774 &nbsp;·&nbsp;\n              🌐 www.grupouniaoetrabalho.com.br';
  assert.deepEqual(problemasContato(antiga), ["mostra telefone", "mostra site"]);
  assert.deepEqual(problemasContato("📧 Dúvidas, informações e sugestões: desafiogut01@gmail.com"), []);
});

// ── BIDIRECCIONAL (GATE 8) — os textos antigos das 3 pendências são reprovados ──────────────────
test("BIDIRECCIONAL: os textos antigos das 3 pendências reprovam os verificadores", () => {
  // D1 — verbatim do estado anterior (git 3f5aac6).
  const d1 = [
    "participam em edições, lançam lances e podem adquirir produtos/senhas mediante pagamento.",
    "Histórico de compras de senhas e transações de pagamento PIX processadas através do Mercado Pago.",
    "Registos de interações: lances, histórico de compras, saldo de senhas e visualizações.",
  ];
  for (const t of d1) assert.match(t, /\bsenhas?\b/i, `a guarda não apanhou: «${t}»`);
  // D2 — verbatim do estado anterior.
  const d2 = "Projeção pela regra do torneio. Os pontos são apurados pela coordenação no fechamento da rodada.";
  assert.match(d2, /\btorneio\b/i, "a guarda não apanhou o aviso antigo");
  // D3 — verbatim (já coberto no controlo positivo acima, aqui declarado para o leitor do log).
  assert.ok(problemasContato("📞 (92) 98428-5774").includes("mostra telefone"));
});
