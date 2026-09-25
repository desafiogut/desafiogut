// scheduled-encerrar-especial.mjs — MC94.3 (HARD GATE 6). Scheduled function
// (padrão dos *-scheduled.mjs do projeto: `schedule()` no próprio ficheiro, sem
// entrada no netlify.toml).
//
// A cada minuto, para cada edição ESPECIAL-* cujo `termino_em` já passou:
//   1) se ainda está "aberto" → encerrarEdicao (status "encerrado", auditoria,
//      resumos pós-edição) — o mesmo que o admin faria à mão;
//   2) consolida-a UMA vez (`_lib/consolidacao.mjs`, o mesmo núcleo do
//      consolidar-lances) — transacção on-chain paga em gas pela coordenação
//      (autorização do operador, R18, 2026-09-25: "encerrar e consolidar").
//
// ⛔ NUNCA REENVIA UMA TRANSACÇÃO (ITEM 4.2 do consolidar-lances). Um cron que
// repetisse a cada falha reenviaria 60 vezes por hora. Por isso:
//   - o marcador (Blob "consolidacao-automatica") é gravado ANTES da chamada —
//     se o Netlify matar a função a meio (limite ~30 s), o tick seguinte não repete;
//   - 202 pendente, 502 envio_falhou, 200 ou excepção → FINAL: o caminho
//     automático acaba; o que falte faz-se à mão (POST /consolidar-lances);
//   - só as falhas de ANTES do envio (409 fora de mainnet, 422 sem vencedor,
//     503 configuração) se repetem, no máximo MAX_TENTATIVAS_ANTES_DO_ENVIO.
//
// Fronteira: `agora > termino_em`, igual à guarda de lances (`edicao-janela.mjs`
// aceita lances NO último milissegundo). Encerrar em `>=` fecharia um lance
// que o backend acabou de aceitar.
//
// FAIL-SOFT: qualquer erro é registado e o tick termina; o caminho manual existe.

import { schedule } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { listarEdicoes, encerrarEdicao } from "./_lib/edicoes-core.mjs";
import { consolidarEdicao } from "./_lib/consolidacao.mjs";
import { EDICAO_ESPECIAL_RE, msDe } from "./_lib/edicao-janela.mjs";

export const CRON = "* * * * *";
export const STORE_MARCAS = "consolidacao-automatica";
export const MAX_TENTATIVAS_ANTES_DO_ENVIO = 5;
/** Espera pela mineração: tem de caber no limite de ~30 s de uma scheduled. */
export const TIMEOUT_MINER_SCHEDULED_MS = 20_000;

// Estados em que se sabe que NÃO saiu transacção nenhuma — seguro repetir.
const ANTES_DO_ENVIO = new Set([400, 409, 422, 503]);

function abrirMarcas() {
  try { return getStore({ name: STORE_MARCAS, consistency: "strong" }); }
  catch (err) {
    console.warn("[scheduled-encerrar-especial] store de marcas indisponível:", err?.message);
    return null;
  }
}

/**
 * Consolida uma especial se o marcador o permitir. Nunca lança.
 * @returns {Promise<object>} o que aconteceu, para o log
 */
async function consolidarUmaVez(marcas, id, agoraMs) {
  const anterior = (await marcas.get(id, { type: "json" })) || { tentativas: 0 };
  if (anterior.final) return { id, consolidacao: "ja_tratada", ...anterior };
  if (anterior.tentativas >= MAX_TENTATIVAS_ANTES_DO_ENVIO) return { id, consolidacao: "tentativas_esgotadas" };

  // Marcador ANTES da chamada: se morrermos a meio, o próximo tick não reenvia.
  const marca = { tentativas: anterior.tentativas + 1, final: true, tentadaEm: new Date(agoraMs).toISOString() };
  await marcas.setJSON(id, marca);

  let r;
  try {
    r = await consolidarEdicao(id, { timeoutMinerMs: TIMEOUT_MINER_SCHEDULED_MS });
  } catch (err) {
    console.error("[scheduled-encerrar-especial] consolidação lançou — NÃO se repete; fazer à mão", id, err?.message);
    await marcas.setJSON(id, { ...marca, erro: String(err?.message || err).slice(0, 200) });
    return { id, consolidacao: "excepcao" };
  }

  const final = !ANTES_DO_ENVIO.has(r.status);
  await marcas.setJSON(id, {
    ...marca, final, status: r.status,
    code: r.erro?.code ?? r.corpo?.status ?? null,
    txHash: r.corpo?.txHash ?? null,
  });
  if (r.status === 202) {
    console.warn("[scheduled-encerrar-especial] tx PENDENTE — não será reenviada; seguir à mão", id, r.corpo?.txHash);
  }
  return { id, consolidacao: r.status, final };
}

/**
 * Um tick do cron. Exportado para os testes (relógio injectável).
 * @param {number} [agoraMs]
 * @returns {Promise<object[]>} relatório por edição
 */
export async function tick(agoraMs = Date.now()) {
  const relatorio = [];
  let edicoes;
  try {
    ({ edicoes } = await listarEdicoes(agoraMs));
  } catch (err) {
    console.error("[scheduled-encerrar-especial] listarEdicoes falhou", err?.message);
    return relatorio;
  }

  // Só `edicoes`: uma especial em `agendadas` ainda nem abriu.
  const vencidas = Object.values(edicoes || {}).filter((e) => {
    const fim = msDe(e?.termino_em);
    return e && EDICAO_ESPECIAL_RE.test(e.id) && fim != null && agoraMs > fim;
  });
  if (vencidas.length === 0) return relatorio;

  const marcas = abrirMarcas();
  for (const e of vencidas) {
    const linha = { id: e.id };
    if (e.status === "aberto") {
      try {
        const r = await encerrarEdicao({ edicaoId: e.id, origem: "scheduled" });
        linha.encerrada = r?.ok === true;
      } catch (err) {
        // Fail-soft: a guarda de lances já recusa depois do fim, logo consolidar
        // com o status ainda "aberto" é seguro.
        console.error("[scheduled-encerrar-especial] encerrar falhou", e.id, err?.message);
        linha.encerrada = false;
      }
    }
    if (marcas) {
      try {
        Object.assign(linha, await consolidarUmaVez(marcas, e.id, agoraMs));
      } catch (err) {
        console.error("[scheduled-encerrar-especial] marcador falhou — sem consolidação automática", e.id, err?.message);
      }
    }
    console.info("[scheduled-encerrar-especial]", JSON.stringify(linha));
    relatorio.push(linha);
  }
  return relatorio;
}

export const handler = schedule(CRON, async () => {
  await tick();
  return { statusCode: 200 };
});
