// _lib/simulador.mjs — MC15.6 ITEM 5 (Motor de Simulação de Vencedor)
//
// Reproduz EXATAMENTE a regra oficial on-chain apurarVencedor (R7 / Art. VIII):
//   vencedor = MENOR valor cuja contagem == 1 (lance único mais baixo).
// Função PURA (apurarMenorLanceUnico) testável sem IO + wrapper que lê o Blob
// de lances (simularVencedorMenorLance). Sem dependências externas (D2).
//
// Blob "lances-relampago": chave = edicaoId, valor = { lances: [
//   { endereco, valorCentavos, nomeExibicao?, processadoEm, ... } ] }.

import { getStore } from "@netlify/blobs";

const BLOB_LANCES = "lances-relampago";

/** Formata centavos como BRL "R$ 5,00". */
export function brlCentavos(centavos) {
  if (!Number.isInteger(centavos)) return "—";
  return "R$ " + (centavos / 100).toFixed(2).replace(".", ",");
}

/**
 * Função PURA — apura o menor lance único a partir de uma lista de lances.
 * Espelha apurarVencedor: agrupa por valorCentavos, filtra frequência === 1,
 * devolve o MENOR. Vencedor = o (único) lançador desse valor.
 *
 * @param {Array<{endereco?:string, valorCentavos:number, nomeExibicao?:string}>} lances
 * @returns {{
 *   ok: boolean, vencedorEndereco: string|null, vencedorNome: string|null,
 *   valorCentavos: number|null, totalLances: number, lancesUnicos: number
 * }}
 */
export function apurarMenorLanceUnico(lances) {
  const lista = Array.isArray(lances) ? lances : [];
  const totalLances = lista.length;

  // contagem por valor + memória do (último) lançador de cada valor.
  const contagem = new Map();
  const lancadorPorValor = new Map();
  for (const l of lista) {
    const v = Number(l?.valorCentavos);
    if (!Number.isInteger(v)) continue;
    contagem.set(v, (contagem.get(v) || 0) + 1);
    lancadorPorValor.set(v, l); // último vence em caso de repetição (irrelevante p/ únicos)
  }

  let menorUnico = null;
  let lancesUnicos = 0;
  for (const [v, c] of contagem) {
    if (c === 1) {
      lancesUnicos++;
      if (menorUnico === null || v < menorUnico) menorUnico = v;
    }
  }

  if (menorUnico === null) {
    return { ok: false, vencedorEndereco: null, vencedorNome: null, valorCentavos: null, totalLances, lancesUnicos: 0 };
  }
  const vencedor = lancadorPorValor.get(menorUnico) || {};
  return {
    ok: true,
    vencedorEndereco: vencedor.endereco || null,
    vencedorNome: vencedor.nomeExibicao || null,
    valorCentavos: menorUnico,
    totalLances,
    lancesUnicos,
  };
}

/** Rótulo curto do vencedor: nome de exibição ou endereço encurtado. */
export function rotuloVencedor(res) {
  if (res.vencedorNome) return res.vencedorNome;
  const e = res.vencedorEndereco;
  if (e && e.length >= 10) return `${e.slice(0, 6)}…${e.slice(-4)}`;
  return e || "—";
}

/**
 * Lê os lances do Blob da edição e apura o menor lance único. Fail-soft:
 * erro de Blob → { ok:false, erro:true }.
 * @param {string} edicaoId
 */
export async function simularVencedorMenorLance(edicaoId) {
  const id = String(edicaoId || "R-1");
  let lances = [];
  try {
    const store = getStore({ name: BLOB_LANCES, consistency: "strong" });
    const doc = await store.get(id, { type: "json" });
    lances = Array.isArray(doc?.lances) ? doc.lances : [];
  } catch (err) {
    console.warn("[simulador] leitura de lances falhou:", err?.message);
    return { ok: false, erro: true, edicaoId: id, totalLances: 0, lancesUnicos: 0 };
  }
  return { ...apurarMenorLanceUnico(lances), edicaoId: id };
}
