// blobs-manual.mjs — MC88.31 (Achado 3 do MC88.30).
//
// PROBLEMA: nas *scheduled functions* o runtime da Netlify não injeta o contexto
// dos Blobs. `getStore({ name })` falha com:
//   "The environment has not been configured to use Netlify Blobs.
//    To use it manually, supply the following properties when creating a store:
//    siteID, token"
// Observado em produção: 12x em monitor-onchain e 4x em ia-preditiva em 6 h.
// Consequência em cadeia: o monitor-onchain nunca gravava o checkpoint
// `ultimo-bloco-processado`, portanto recomeçava sempre da janela de fallback e
// o erro nunca se autocorrigia.
//
// SOLUÇÃO: tentar primeiro o modo automático (que funciona nas functions de
// pedido normais, onde nada muda) e, só se falhar, repetir com siteID+token
// explícitos vindos do ambiente.
//
// NOMES DAS VARIÁVEIS: usamos `BLOBS_SITE_ID` / `BLOBS_TOKEN` como principais
// de propósito — a Netlify reserva/filtra alguns prefixos (o projeto já
// tropeçou nisso com `AWS_*` no MC30.2.1, que obrigou a usar `APP_AWS_*`).
// Os nomes que a própria plataforma injeta são aceites como alternativa.
//
// SEGREDOS: este módulo apenas LÊ do ambiente. Os valores são definidos pelo
// operador (R5) e nunca aparecem em logs — em erro registamos só quais nomes
// estão em falta, jamais o conteúdo.
import { getStore } from "@netlify/blobs";

function credenciaisManuais() {
  const siteID = process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID || process.env.SITE_ID || "";
  const token  = process.env.BLOBS_TOKEN   || process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_API_TOKEN || "";
  return { siteID, token };
}

/**
 * Abre um store de Blobs resistente à ausência de contexto automático.
 *
 * @param {string} name          nome do store
 * @param {object} [opcoes]
 * @param {"strong"|"eventual"} [opcoes.consistency="strong"]
 * @param {string} [opcoes.etiqueta]  prefixo usado nos logs (ex.: "monitor-onchain")
 * @returns {import("@netlify/blobs").Store | null} null se não for possível abrir
 */
export function abrirStoreResiliente(name, { consistency = "strong", etiqueta = "blobs" } = {}) {
  try {
    return getStore({ name, consistency });
  } catch (errAuto) {
    const { siteID, token } = credenciaisManuais();
    if (!siteID || !token) {
      const faltam = [!siteID && "BLOBS_SITE_ID", !token && "BLOBS_TOKEN"].filter(Boolean).join(" + ");
      console.warn(
        `[${etiqueta}] Blobs ${name} indisponível (contexto automático ausente) e sem credenciais manuais — definir ${faltam}. Causa: ${errAuto?.message}`,
      );
      return null;
    }
    try {
      return getStore({ name, consistency, siteID, token });
    } catch (errManual) {
      console.warn(`[${etiqueta}] Blobs ${name} indisponível mesmo com credenciais manuais:`, errManual?.message);
      return null;
    }
  }
}
