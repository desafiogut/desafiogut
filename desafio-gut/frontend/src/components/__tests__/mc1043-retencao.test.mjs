// MC104.3 Frente C (DEC-104.3-2) — o texto de retenção da exclusão de conta menciona a NF-e (nº/série/chave,
// 5 anos), o histórico de pedidos anonimizado e a auditoria on-chain; e NÃO diz que o consentimento fica retido
// (o conta-delete apaga o consent-log — decisão do operador: omitir essa linha).
//  - modal (Configurações): RENDERIZAÇÃO real (Vite + react-dom/server), texto visível;
//  - página /excluir-conta: depende do AppContext + Privy (não renderizável aqui) → lê-se a fonte SEM comentários.
// node --test src/components/__tests__/mc1043-retencao.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderizar, texto, fechar } from "../meus-ativos/__tests__/_render.mjs";

after(fechar);

const PAGINA = fileURLToPath(new URL("../../pages/ExcluirConta.jsx", import.meta.url));
// Remove comentários JSX `{/* … */}`, de bloco e de linha, antes de olhar (um comentário não é texto do ecrã).
const semComentarios = (s) => s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const OBRIGATORIOS = [
  ["NF-e", /NF-e \(número, série e chave de acesso\)/],
  ["5 anos", /5 anos \(obrigação fiscal/],
  ["histórico anonimizado", /Histórico de pedidos — (mantido )?em forma anonimizada/],
  ["on-chain", /auditoria on-chain \(txHash, commitmentHash\)/],
];

test("modal (renderizado): NF-e, histórico anonimizado e on-chain; sem «consentimento retido»", async () => {
  const t = texto(await renderizar("/src/components/ExcluirContaModal.jsx",
    { aberto: true, onFechar: () => {}, address: "0xabc", authToken: "t", onExcluido: () => {} }));
  assert.match(t, /O QUE É RETIDO POR LEI/, "controlo: o bloco de retenção foi renderizado");
  for (const [nome, re] of OBRIGATORIOS) assert.match(t, re, nome);
  assert.doesNotMatch(t, /consentimento/i);
});

test("página /excluir-conta (fonte sem comentários): as mesmas menções + o que é anonimizado", () => {
  const src = semComentarios(readFileSync(PAGINA, "utf8"));
  for (const [nome, re] of OBRIGATORIOS) assert.match(src, re, nome);
  assert.match(src, /Eliminado ou anonimizado/);
  assert.match(src, /Nome, CPF, endereço de entrega e telefone — anonimizados nos pedidos e notificações/);
  assert.match(src, /Lances Relâmpago — sua carteira é substituída por um identificador anônimo/);
  assert.doesNotMatch(src, /consentimento/i);
});
