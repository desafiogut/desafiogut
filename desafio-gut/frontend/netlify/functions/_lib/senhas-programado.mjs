// MC91.11 — Ledger off-chain de senhas consumidas em lances programados.
//
// Modelo: o contrato mainnet NAO tem funcao de debito de senha para a
// coordenacao (darLance usa msg.sender e exige gas do usuario). O saldo
// on-chain (saldoSenhas) atua como TETO; o gasto em lances programados e
// registrado AQUI (mesmo padrao do troco-senhas). O lance so e aceito
// enquanto consumidas < saldoOnChain.
//
// Blob: senhas-programado-consumo:{endereco_lowercase}
//   { consumidas: int, atualizadoEm: ISO, ultimoLance: { edicaoId, em } }

export const BLOB_SENHAS_CONSUMO = "senhas-programado-consumo";

export function chaveConsumo(endereco) {
  return String(endereco || "").toLowerCase();
}

/** Le o ledger (fail-soft). Retorna registro (vazio se nao existir). */
export async function lerConsumoSenhas(store, endereco) {
  try {
    const reg = await store.get(chaveConsumo(endereco), { type: "json" });
    return reg || { consumidas: 0, atualizadoEm: null };
  } catch {
    return { consumidas: 0, atualizadoEm: null };
  }
}

/**
 * Registra o consumo de 1 senha (CAS best-effort; store consistency strong).
 * Regras de negocio (Artigo XX): saldoOnChain >= 1 e consumidas < saldoOnChain.
 *
 * Retorna:
 *   { ok: true,  consumidas }                                — senha consumida
 *   { ok: false, code: "store_indisponivel", message }       — sem store
 *   { ok: false, code: "senhas_insuficientes", message, saldoOnChain, consumidas }
 *   { ok: false, code: "consumo_falhou", message }           — escrita falhou
 */
export async function registrarConsumoSenha({ store, endereco, saldoOnChain, edicaoId = null }) {
  if (!store) {
    return { ok: false, code: "store_indisponivel", message: "ledger de consumo de senhas indisponível" };
  }
  const saldo = Number(saldoOnChain ?? 0);
  if (saldo < 1) {
    return {
      ok: false, code: "senhas_insuficientes",
      message: "Saldo de senhas insuficiente (Art. 20: R$ 2,00/senha) — converta saldo R$ em senhas antes de lançar.",
      saldoOnChain: saldo,
    };
  }
  const consumo = await lerConsumoSenhas(store, endereco);
  const consumidas = Number(consumo?.consumidas ?? 0);
  if (consumidas >= saldo) {
    return {
      ok: false, code: "senhas_insuficientes",
      message: "Todas as senhas on-chain já foram consumidas em lances programados — adquira ou converta mais (Art. 20).",
      saldoOnChain: saldo, consumidas,
    };
  }
  const atualizadoEm = new Date().toISOString();
  try {
    await store.setJSON(chaveConsumo(endereco), {
      ...consumo,
      consumidas: consumidas + 1,
      atualizadoEm,
      ultimoLance: { edicaoId, em: atualizadoEm },
    });
  } catch {
    return { ok: false, code: "consumo_falhou", message: "não foi possível registrar o consumo da senha" };
  }
  return { ok: true, consumidas: consumidas + 1 };
}
