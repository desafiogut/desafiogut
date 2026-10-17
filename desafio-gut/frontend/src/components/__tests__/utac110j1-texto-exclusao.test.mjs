// UTAC110j.1 — FRENTE C/D: o ecrã de exclusão diz a VERDADE (o que sai, o que fica, de quem é a app).
//
//  - modal: RENDERIZAÇÃO real (Vite + react-dom/server) — o texto que o utilizador lê;
//  - página /excluir-conta: depende do AppContext + Privy (não renderizável aqui) → lê-se a fonte
//    SEM comentários (um comentário não é texto do ecrã).
//
// node --test src/components/__tests__/utac110j1-texto-exclusao.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderizar, texto, fechar } from "../meus-ativos/__tests__/_render.mjs";

after(fechar);

const PAGINA = fileURLToPath(new URL("../../pages/ExcluirConta.jsx", import.meta.url));
const MODAL = fileURLToPath(new URL("../ExcluirContaModal.jsx", import.meta.url));
const semComentarios = (s) => s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("modal renderizado: lista o que é ELIMINADO e o que é RETIDO (as duas, não só uma)", async () => {
  const t = texto(await renderizar("/src/components/ExcluirContaModal.jsx",
    { aberto: true, onFechar: () => {}, address: "0xabc", authToken: "t", onExcluido: () => {} }));
  assert.match(t, /O QUE É ELIMINADO/, "controlo: o bloco do que sai foi renderizado");
  assert.match(t, /O QUE É RETIDO POR LEI/, "controlo: o bloco do que fica foi renderizado");
  // A lacuna do UTAC110j: nenhuma destas linhas existia antes.
  assert.match(t, /Palpites do Passe Desafio/);
  // R18-110j.1-4b: o resgate passou de ELIMINADO a RETIDO (morada tokenizada, registo fica).
  assert.match(t, /Resgates do cartão colecionável — o registo da entrega \(data e produto\) fica/);
  assert.doesNotMatch(t, /Resgates do cartão colecionável — incluindo a morada de entrega/,
    "a frase antiga (resgate eliminado) não pode voltar");
  assert.match(t, /[Pp]ontos de fidelidade/);
  assert.match(t, /v[íi]nculos de indica/i);
  assert.match(t, /ECOQUILDO/);
  assert.match(t, /Google Play/);
  assert.match(t, /Marco Civil da Internet/);
  // A promessa absoluta que era FALSA não pode voltar.
  assert.doesNotMatch(t, /todos os dados pessoais ser[ãa]o permanentemente removidos/);
});

test("página pública: nomeia a APP e o DESENVOLVEDOR (requisito Google Play) e mostra os PASSOS", () => {
  const src = semComentarios(readFileSync(PAGINA, "utf8"));
  assert.ok(src.includes("App: <strong"), "a etiqueta «App:» esta no ecra");
  assert.ok(src.includes(">DesafioGUT<"), "nome da app (o v5 proibe «torneio» na UI; o nome completo fica na ficha da Play)");
  assert.match(src, /Desenvolvedor:/);
  assert.match(src, /Associação Recreativa dos Nordestinos no Amazonas/);
  assert.match(src, /23\.040\.066\/0001-00/, "CNPJ do controlador");
  assert.match(src, /Passos para pedir a exclusão/);
  assert.ok((src.match(/<li>/g) ?? []).length >= 10, "as listas do que sai e do que fica estão no ecrã");
});

test("página pública: promete só o que o backend faz (palpites, resgates, ECOQUILDO, Google Play, indicações)", () => {
  const src = semComentarios(readFileSync(PAGINA, "utf8"));
  for (const [nome, re] of [
    ["palpites", /palpites do Passe Desafio/i],
    ["resgates", /Resgates do cartão colecionável — o registo da entrega fica/],
    ["pontos", /Pontos de fidelidade/],
    ["eco_quildo", /ECOQUILDO/],
    ["google_play", /Google Play/],
    ["indicacoes", /c[óo]digo e v[íi]nculos de indica/i],
    ["auditoria", /Logs de auditoria/],
  ]) assert.match(src, re, nome);
  // «vínculos de indicação» deixou de ser uma promessa vazia: o backend apaga-os (ver
  // utac110j1-exclusao-lgpd.test.mjs, «indicações: código, vínculos e bónus … APAGADOS»).
  assert.doesNotMatch(src, /todos\s+os dados pessoais associados ser[ãa]o apagados permanentemente/i);
});

test("achado do validador: o ecrã de SUCESSO não diz «dados removidos» quando há pendência", () => {
  const src = semComentarios(readFileSync(MODAL, "utf8"));
  // O backend devolve ok:true com `blobs.pendente` (lances de edição aberta — mc1043 prova a parte do
  // backend). Se o ecrã ignorasse esse campo, diria «removidos» com dados pessoais ainda lá.
  assert.match(src, /manifesto\?\.blobs\?\.pendente/, "o modal tem de LER a pendência da resposta");
  assert.match(src, /ficaram com a sua carteira associada/, "e tem de a dizer ao utilizador");
  assert.match(src, /Conta encerrada\. Os seus dados pessoais foram eliminados ou anonimizados/,
    "a frase de sucesso deixa de ser um absoluto");
});

test("3.ª ronda/ressalva 1: a PÁGINA também não pode prometer «dados pessoais foram removidos»", () => {
  const src = semComentarios(readFileSync(PAGINA, "utf8"));
  // Antes: `✅ Sua conta foi excluída. Os dados pessoais foram removidos.` — absoluto, num ramo que
  // não lia a pendência. As guardas anteriores só procuravam a variante com «todos», e esta passava.
  assert.doesNotMatch(src, /dados pessoais foram removidos/i,
    "a página voltou a prometer remoção total");
  assert.match(src, /eliminados ou anonimizados/);
  assert.match(src, /lance\(s\) de uma edição ainda em curso/,
    "a página tem de dizer a pendência quando existe");
  assert.match(src, /setConcluido\(pend > 0 \? pend : true\)/, "a pendência tem de chegar à página");
});
