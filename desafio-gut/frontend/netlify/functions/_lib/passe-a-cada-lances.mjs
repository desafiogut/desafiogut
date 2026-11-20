// _lib/passe-a-cada-lances.mjs — UTAC142.1 (decisão do operador, substitui a R18-142-C «1 Passe por lance»).
// Na edição especial o lance gasta SÓ pontos. Quem tem Passe Relâmpago gasta 1 a cada N lances (omissão 3: no 3.º,
// 6.º, 9.º…). Sem Passe nessa altura, o lance passa na mesma: o Passe é opcional e nunca bloqueia. O bónus de +100
// pontos continua na COMPRA (Regulamento v6.1, Art. 7º), não aqui.
//
// Corre DEPOIS de o lance existir, logo nunca há Passe a devolver (o risco MA2 do UTAC129 não volta).
// Contador por (edição, endereço) num Blob com escrita condicional por ETag: dois lances em paralelo recebem números
// DIFERENTES, e só um deles cai no múltiplo de N (nem dois consumos, nem nenhum). FAIL-SOFT: devolve sempre.

export const STORE_CONTAGEM = "especial-lances-passe";
export const LANCES_POR_PASSE_PADRAO = 3;
// Achado no próprio UTAC142.1 (C9): com 5 tentativas e 6 lances simultâneos do mesmo utilizador, 2 ficavam por contar.
// Cada ronda de conflito só deixa passar UM; com recuo aleatório curto, 12 tentativas cobrem rajadas bem acima do
// limite real (rate limit 5 lances/min por carteira).
const TENTATIVAS = 12;
const recuo = () => new Promise((r) => setTimeout(r, Math.floor(Math.random() * 25)));

export const chaveContagem = (edicaoId, endereco) => `${edicaoId}:${String(endereco).toLowerCase()}`;

/**
 * Lê → muta → grava condicional (até 12 vezes, com recuo aleatório). `set`, nunca `setJSON` (no @netlify/blobs 10.0–10.4 o setJSON não
 * envia o If-Match — `_lib/pedidos.mjs` MC102.0). Só um `etag` na resposta confirma a escrita.
 */
async function casAtualizar(store, chave, mutar) {
  for (let i = 0; i < TENTATIVAS; i++) {
    const lido = await store.getWithMetadata(chave, { type: "json" });
    const atual = lido?.data ?? { lances: 0, passesConsumidos: 0 };
    const novo = mutar({ lances: Number(atual.lances) || 0, passesConsumidos: Number(atual.passesConsumidos) || 0 });
    novo.atualizadoEm = new Date().toISOString();
    const cond = lido?.etag ? { onlyIfMatch: lido.etag } : { onlyIfNew: true };
    const w = await store.set(chave, JSON.stringify(novo), cond);
    if (w?.modified && w.etag) return novo;
    await recuo();
  }
  throw new Error("conflito_contagem");
}

/**
 * Conta o lance (já gravado) e, se for o N-ésimo, tenta gastar 1 Passe Relâmpago.
 * @returns {Promise<{ok:boolean, lances?:number, passeConsumido:boolean, passesRelampagoRestantes?:number|null, code?:string}>}
 */
export async function contarLanceEConsumirPasse({ store, edicaoId, endereco, consumirPasse, aCada = LANCES_POR_PASSE_PADRAO }) {
  if (!store || !Number.isInteger(aCada) || aCada < 1) return { ok: false, passeConsumido: false, code: "desligado" };
  const chave = chaveContagem(edicaoId, endereco);
  let contagem;
  try { contagem = await casAtualizar(store, chave, (c) => ({ ...c, lances: c.lances + 1 })); }
  catch (err) { return { ok: false, passeConsumido: false, code: err?.message || "contagem_falhou" }; }

  if (contagem.lances % aCada !== 0) return { ok: true, lances: contagem.lances, passeConsumido: false };

  let p;
  try { p = await consumirPasse({ endereco, tipo: "relampago" }); }
  catch { p = { ok: false, code: "inventario_indisponivel" }; }
  if (!p?.ok) return { ok: true, lances: contagem.lances, passeConsumido: false, code: p?.code ?? "sem_passes" };

  // Registo do consumo (serve o «portador» dos avisos do GUTO). Best-effort: o Passe já foi gasto.
  await casAtualizar(store, chave, (c) => ({ ...c, passesConsumidos: c.passesConsumidos + 1 })).catch(() => {});
  return { ok: true, lances: contagem.lances, passeConsumido: true, passesRelampagoRestantes: Number.isInteger(p.restantes) ? p.restantes : null };
}

/** Quantos Passes este endereço já gastou nesta edição (0 sem registo ou em falha). */
export async function passesConsumidosNaEdicao(store, edicaoId, endereco) {
  try {
    const d = await store?.get(chaveContagem(edicaoId, endereco), { type: "json" });
    return Number(d?.passesConsumidos) || 0;
  } catch { return 0; }
}
