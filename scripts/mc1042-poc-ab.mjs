// MC104.2 — PoC + A/B pareado do conta-delete sobre pedidos reais (campo `comprador`).
// Uso: node scripts/mc1042-poc-ab.mjs <caminho-do-conta-delete.mjs> [<outro-caminho> ...]
// Cada caminho corre sobre o MESMO conjunto de dados sintéticos (cópia fresca por braço).
// Dados 100 % sintéticos: nenhum dado pessoal real entra nem sai daqui (P9).
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const ALVO = "0xabc0000000000000000000000000000000000abc";
const OUTRO = "0xdef0000000000000000000000000000000000def";
const NFE = { numero: "123", serie: "1", chave: "3".repeat(44), registada_em: "2026-09-01T00:00:00.000Z" };
const morada = (nome) => ({ nome, cpf: "52998224725", cep: "69027010", logradouro: "Rua X", numero: "86",
  complemento: "", bairro: "Centro", cidade: "Manaus", uf: "AM", telefone: "92999999999" });
const pedido = (id, comprador) => ({
  produtoId: id, edicaoId: "R-1", ...(comprador ? { comprador } : {}), lojista: "0x1110000000000000000000000000000000000111",
  produtoNome: "Air Fryer", valorPagoCentavos: 1234, prazo_entrega_dias: 10, txHash: "0xtx",
  morada: morada("Fulano Teste"), rastreio: { codigo: "AA123456789BR", transportadora: "Correios" }, nfe: { ...NFE },
  criado_em: "2026-09-01T00:00:00.000Z", atualizado_em: "2026-09-01T00:00:00.000Z", historico: [{ evento: "venda_registada" }],
});

function dados() {
  return {
    pedidos: new Map([
      ["pedido:P1", pedido("P1", ALVO)],
      ["pedido:P2", pedido("P2", OUTRO)],
      ["pedido:P3", pedido("P3", null)],
      [`comprador:${ALVO}`, { ids: ["P1"] }],
    ]),
  };
}

function getStoreDe(stores) {
  return ({ name }) => {
    const m = stores[name] ?? (stores[name] = new Map());
    return {
      async get(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
      async setJSON(k, v) { m.set(k, structuredClone(v)); },
      async delete(k) { m.delete(k); },
      async list() { return { blobs: [...m.keys()].map((key) => ({ key })) }; },
    };
  };
}

for (const arg of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(resolve(arg)).href);
  const stores = dados();
  const antes = structuredClone(stores.pedidos);
  const r = await mod.excluirBlobs(getStoreDe(stores), ALVO, { dryRun: false });
  const p1 = stores.pedidos.get("pedido:P1");
  const out = {
    braco: arg.replace(/\\/g, "/").split("/").slice(-1)[0],
    anonimizadoPedidos: r.anonimizado.pedidos,
    P1_comprador_anon: p1.comprador === mod.ENDERECO_ANONIMO,
    P1_morada_anon: Object.values(p1.morada ?? {}).every((v) => v === "***"),
    P1_cpf_ainda_real: p1.morada?.cpf === "52998224725",
    P1_nfe_preservada: isDeepStrictEqual(p1.nfe, NFE),
    P1_registo_existe: stores.pedidos.has("pedido:P1"),
    P2_terceiro_intacto: isDeepStrictEqual(stores.pedidos.get("pedido:P2"), antes.get("pedido:P2")),
    P3_sem_comprador_intacto: isDeepStrictEqual(stores.pedidos.get("pedido:P3"), antes.get("pedido:P3")),
    total_chaves: `${antes.size}->${stores.pedidos.size}`,
  };
  console.log(JSON.stringify(out));
}
