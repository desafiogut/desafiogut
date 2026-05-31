// _lib/wizard-session.mjs — MC15.6 ITEM 3 (Wizard de Criação de Edição)
//
// Estado efémero da sessão guiada do admin, persistido em Blob "wizard-session"
// (chave = endereço do admin, lowercased). Netlify Blobs não tem TTL nativo, por
// isso guardamos `expiraEm` (epoch ms) e tratamos sessões expiradas como ausentes
// (limpando-as preguiçosamente). TTL = 10 min.
//
// Forma da sessão:
//   { etapa: 1|2|3|"confirmacao",
//     produto, valorBaseCentavos, tipo, duracaoSegundos, incrementoCentavos,
//     criadoEm (ISO), expiraEm (epoch ms) }
//
// 100% fail-soft: erro de Blob → null (o wizard recomeça; nunca quebra o GUTO).

import { getStore } from "@netlify/blobs";

export const STORE_WIZARD = "wizard-session";
export const WIZARD_TTL_MS = 10 * 60 * 1000; // 10 min

function abrirStore() {
  try { return getStore({ name: STORE_WIZARD, consistency: "strong" }); }
  catch (err) {
    console.warn("[wizard-session] Blobs indisponível:", err?.message);
    return null;
  }
}

/** Lê a sessão do admin. Expirada/ausente/erro → null (limpa expirada). */
export async function lerSessaoWizard(endereco) {
  const chave = String(endereco || "").toLowerCase();
  if (!chave) return null;
  const store = abrirStore();
  if (!store) return null;
  try {
    const s = await store.get(chave, { type: "json" });
    if (!s) return null;
    if (typeof s.expiraEm === "number" && Date.now() > s.expiraEm) {
      await store.delete(chave).catch(() => {});
      return null;
    }
    return s;
  } catch (err) {
    console.warn("[wizard-session] leitura falhou:", err?.message);
    return null;
  }
}

/** Grava/atualiza a sessão, renovando o TTL (10 min). Fail-soft → false. */
export async function salvarSessaoWizard(endereco, sessao) {
  const chave = String(endereco || "").toLowerCase();
  if (!chave) return false;
  const store = abrirStore();
  if (!store) return false;
  const payload = {
    ...sessao,
    criadoEm: sessao.criadoEm || new Date().toISOString(),
    expiraEm: Date.now() + WIZARD_TTL_MS,
  };
  try {
    await store.setJSON(chave, payload);
    return true;
  } catch (err) {
    console.warn("[wizard-session] gravação falhou:", err?.message);
    return false;
  }
}

/** Remove a sessão do admin (concluída ou cancelada). Fail-soft. */
export async function limparSessaoWizard(endereco) {
  const chave = String(endereco || "").toLowerCase();
  if (!chave) return;
  const store = abrirStore();
  if (!store) return;
  try { await store.delete(chave); } catch (err) {
    console.warn("[wizard-session] limpeza falhou:", err?.message);
  }
}
