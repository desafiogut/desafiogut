// UTAC000.17bc (17c / GATE 22) — «marcar como visto» do overlay agregado, no APARELHO (decisão do
// operador: opção A, `localStorage`).
//
// Porquê: com o prazo REAL (DEBT-016) o overlay passou a abrir uma vez por edição que termine. Sem
// memória, um refresh (ou um novo mount das páginas) voltava a abri-lo. Aqui guarda-se, por endereço
// e por edição, que o utilizador já viu o resultado — e o overlay não reabre (GATE 22).
//
// Chave: `gut_overlay_visto` = JSON `{ "<endereco>": ["R-1", ...] }` (endereço em minúsculas).
// Guardas: sem `window`/`localStorage` (SSR, testes) ou JSON corrompido → comporta-se como «nada
// visto» (nunca lança: um erro aqui não pode derrubar o fim do leilão). Limite de 50 edições por
// endereço (as mais recentes) para o valor não crescer sem fim.

const CHAVE = "gut_overlay_visto";
const MAX_POR_ENDERECO = 50;

function lerTudo() {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return {};
    const obj = JSON.parse(bruto);
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {}; // corrompido/sem storage → nada visto
  }
}

function gravarTudo(obj) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(obj));
  } catch { /* quota/privado: o overlay reabre; nunca lança */ }
}

const normalizarEndereco = (e) => (typeof e === "string" ? e.trim().toLowerCase() : "");
const normalizarId = (id) => (id == null ? "" : String(id));

/** Lista (array de ids) das edições que este endereço já viu. */
export function lerVistos(endereco) {
  const e = normalizarEndereco(endereco);
  if (!e) return [];
  const lista = lerTudo()[e];
  return Array.isArray(lista) ? lista.filter((x) => typeof x === "string") : [];
}

/** true se esta edição já foi vista por este endereço. */
export function jaVisto(endereco, edicaoId) {
  const id = normalizarId(edicaoId);
  if (!id) return false;
  return lerVistos(endereco).includes(id);
}

/** Marca a edição como vista (idempotente). Devolve true se gravou. */
export function marcarVisto(endereco, edicaoId) {
  const e = normalizarEndereco(endereco);
  const id = normalizarId(edicaoId);
  if (!e || !id) return false;
  const tudo = lerTudo();
  const atual = Array.isArray(tudo[e]) ? tudo[e].filter((x) => typeof x === "string" && x !== id) : [];
  tudo[e] = [...atual, id].slice(-MAX_POR_ENDERECO);
  gravarTudo(tudo);
  return true;
}

/** Apaga a memória deste endereço (usado nos testes e por um eventual «limpar histórico»). */
export function limparVistos(endereco) {
  const e = normalizarEndereco(endereco);
  if (!e) return;
  const tudo = lerTudo();
  delete tudo[e];
  gravarTudo(tudo);
}
