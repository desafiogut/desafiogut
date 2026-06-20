// _lib/data-store.mjs — MC29.1 (Camada de Abstração de Dados)
//
// Facade ÚNICO de acesso a dados. O resto do backend deve falar com este módulo
// e NUNCA importar @netlify/blobs (ou, no futuro, o cliente Supabase) diretamente.
// Trocar de backend = mudar a env DATA_STORE_BACKEND e criar a implementação
// correspondente — a lógica de negócio não muda (preparação Supabase, R-D).
//
// Backends:
//   "blobs"    (default) → data-store-blobs.mjs  (Netlify Blobs, hoje)
//   "supabase"           → data-store-supabase.mjs (a criar no MC-Supabase)
//
// Interface (assíncrona):
//   getConfig(chave)            → valor | null
//   setConfig(chave, valor)     → void
//   getLances(edicaoId)         → Lance[]
//   addLance(edicaoId, lance)   → chave (string)
//
// A implementação é carregada uma única vez (singleton, lazy) via import dinâmico,
// para que adicionar o backend Supabase não exija tocar neste ficheiro.

const BACKEND = process.env.DATA_STORE_BACKEND || "blobs";

const CARREGADORES = {
  blobs:    () => import("./data-store-blobs.mjs"),
  supabase: () => import("./data-store-supabase.mjs"),
};

let _impl = null;

/** Carrega (uma vez) a implementação do backend configurado. */
async function impl() {
  if (_impl) return _impl;
  const carregar = CARREGADORES[BACKEND];
  if (!carregar) {
    throw new Error(`[data-store] DATA_STORE_BACKEND desconhecido: "${BACKEND}"`);
  }
  _impl = await carregar();
  return _impl;
}

/** Lê uma configuração genérica (ex.: "recursos_app"). */
export async function getConfig(chave) {
  return (await impl()).getConfig(chave);
}

/** Escreve uma configuração genérica. Admin-only é garantido no chamador. */
export async function setConfig(chave, valor) {
  return (await impl()).setConfig(chave, valor);
}

/** Lê todos os lances de uma edição. */
export async function getLances(edicaoId) {
  return (await impl()).getLances(edicaoId);
}

/** Acrescenta um lance a uma edição. Devolve a chave criada. */
export async function addLance(edicaoId, lance) {
  return (await impl()).addLance(edicaoId, lance);
}

/** Nome do backend ativo (diagnóstico/observabilidade). */
export function backendAtivo() {
  return BACKEND;
}
