// MC104.3 — PoC + A/B pareado das 4 frentes do conta-delete (NÃO é teste da suíte: corre-se à mão).
// Uso (cwd = netlify/functions):
//   node --experimental-test-module-mocks _tests/mc1043-ab.script.mjs <conta-delete.mjs> [<outro> ...]
// Cada braço corre sobre os MESMOS dados sintéticos, num Blobs fresco. O @netlify/blobs é trocado pelo
// duplo com ETag real, para que o `atualizarPedido` do `_lib/pedidos.mjs` (Frente D) escreva no mesmo sítio.
// Um escritor concorrente (evento de rastreio) entra entre a leitura e a escrita do pedido do titular.
// Dados 100 % sintéticos (P9).
import { mock } from "node:test";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { criarBlobs } from "./_blobs-cas-duplo.mjs";

let atual = criarBlobs();
mock.module("@netlify/blobs", { namedExports: { getStore: (o) => atual.getStore(o) } });
mock.module("../_lib/cache.mjs", { namedExports: { cacheAside: async (_k, f) => f(), cacheDel: async () => {} } });

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";
const ANON = "anon:" + createHash("sha256").update(ALVO).digest("hex");
const NFE = { numero: "123", serie: "1", chave: "3".repeat(44) };
const pedido = (id, c) => ({ produtoId: id, edicaoId: "R-1", comprador: c, valorPagoCentavos: 1234, txHash: "0xtx",
  morada: { nome: "Nome Teste", cpf: "52998224725", cep: "69027010" }, nfe: { ...NFE },
  rastreio: { codigo: "AA123456789BR", transportadora: "Correios", eventos: [] }, historico: [] });
const notif = (m) => ({ notificacoes: [{ id: "n1", timestamp: "2026-09-01T00:00:00.000Z", lida: false, tipo: "nfe_emitida",
  edicaoId: "R-1", valor: null, mensagem: m, ref: "1-123" }] });
const lance = (e, n) => ({ lanceId: n, edicaoId: "R-1", endereco: e, valorCentavos: 5, nomeExibicao: "Fulano",
  processadoEm: "2026-09-01T00:00:00.000Z", commitmentHash: "0xcommit" + n });

function semear(b) {
  b.gravar("pedidos", "pedido:P1", pedido("P1", ALVO));
  b.gravar("pedidos", "pedido:P2", pedido("P2", OUTRO));
  b.gravar("pedidos", `comprador:${ALVO}`, { ids: ["P1"] });
  b.gravar("pedidos", `comprador:${OUTRO}`, { ids: ["P2"] });
  b.gravar("notificacoes", ALVO, notif("NF-e nº 123 do titular"));
  b.gravar("notificacoes", OUTRO, notif("NF-e do terceiro"));
  b.gravar("bids", `bid:R-1:${ALVO}:aaaa1111`, { ...lance(ALVO, "a"), key: `bid:R-1:${ALVO}:aaaa1111` });
  b.gravar("bids", `bid:R-1:${OUTRO}:bbbb2222`, { ...lance(OUTRO, "b"), key: `bid:R-1:${OUTRO}:bbbb2222` });
  b.gravar("bids", "bid:R-1:consolidado", { consolidadoEm: "x" });
  b.gravar("lances-relampago", "R-1", { lances: [lance(ALVO, "c"), lance(OUTRO, "d")] });
}

for (const arg of process.argv.slice(2)) {
  atual = criarBlobs();
  semear(atual);
  const terceiros = JSON.stringify([atual.ler("pedidos", "pedido:P2"), atual.ler("pedidos", `comprador:${OUTRO}`),
    atual.ler("notificacoes", OUTRO), atual.ler("bids", `bid:R-1:${OUTRO}:bbbb2222`)]);
  // Escritor concorrente: um evento de rastreio grava no pedido do titular entre a leitura e a escrita.
  atual.g.antesDeGravar = (name, m, k) => {
    if (name !== "pedidos" || k !== "pedido:P1") return false;
    const p = JSON.parse(m.get(k)); p.rastreio.eventos.push({ data: "2026-09-02T00:00:00.000Z", codigo: "1" });
    m.set(k, JSON.stringify(p)); return true;
  };
  const mod = await import(pathToFileURL(resolve(arg)).href + `?braco=${encodeURIComponent(arg)}`);
  const r = await mod.excluirConta({ supabase: null, getStore: atual.getStore, endereco: ALVO });
  const b = atual, p1 = b.ler("pedidos", "pedido:P1");
  const bidsKeys = [...(b.blobs.get("bids")?.keys() ?? [])];
  const bidAnonKey = bidsKeys.find((k) => k.includes(":anon:"));
  const lr = b.ler("lances-relampago", "R-1").lances;
  const out = {
    braco: arg.replace(/\\/g, "/").split("/").pop(),
    erros: r.erros.filter((e) => !e.startsWith("supabase:")),
    A_indice_antigo_existe: b.ler("pedidos", `comprador:${ALVO}`) !== undefined,
    A_indice_anon: JSON.stringify(b.ler("pedidos", ANON) ?? null),
    B_notif_chave_endereco: b.ler("notificacoes", ALVO) !== undefined,
    B_notif_chave_anon_msg_igual: b.ler("notificacoes", ANON)?.notificacoes?.[0]?.mensagem === "NF-e nº 123 do titular",
    B_bids_endereco_na_chave: bidsKeys.some((k) => k.includes(ALVO)),
    B_bid_anon: bidAnonKey ? { endereco_anon: b.ler("bids", bidAnonKey).endereco === ANON,
      nome: b.ler("bids", bidAnonKey).nomeExibicao, commit: b.ler("bids", bidAnonKey).commitmentHash } : null,
    B_legado_endereco_titular: lr.some((l) => l.endereco === ALVO),
    B_legado_titular_anon: lr.find((l) => l.lanceId === "c")?.endereco === ANON,
    D_evento_concorrente_preservado: p1.rastreio.eventos.length === 1,
    D_pedido_anonimizado: p1.comprador !== ALVO && p1.morada?.cpf === "***",
    fiscal_nfe_txhash_rastreio: JSON.stringify(p1.nfe) === JSON.stringify(NFE) && p1.txHash === "0xtx"
      && p1.rastreio.codigo === "AA123456789BR",
    terceiros_intactos: JSON.stringify([b.ler("pedidos", "pedido:P2"), b.ler("pedidos", `comprador:${OUTRO}`),
      b.ler("notificacoes", OUTRO), b.ler("bids", `bid:R-1:${OUTRO}:bbbb2222`)]) === terceiros
      && lr.find((l) => l.lanceId === "d")?.endereco === OUTRO,
  };
  console.log(JSON.stringify(out));
}
