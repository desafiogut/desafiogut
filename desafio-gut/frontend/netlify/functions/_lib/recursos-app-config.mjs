// _lib/recursos-app-config.mjs — MC29.1
//
// Semântica do recurso "recursos_app": que funcionalidades estão ativas por
// PLATAFORMA. Partilhado pelo endpoint recursos-app.mjs e pelo chatbot.mjs para
// evitar duplicação (PILAR 2 — modular).
//
// Modelo de conformidade TRANSPARENTE:
//   - "pwa": experiência completa (leilão Web3 real).
//   - "ios"/"android": app de loja submetida às lojas — o leilão é DECLARADO
//     como disponível na versão Web (PWA), nunca escondido (ver placeholders).
//
// Fail-soft: na ausência de config, vale DEFAULT_RECURSOS_APP. O default do PWA
// mantém o leilão ATIVO para nunca penalizar o utilizador real por falha de
// leitura do Blob.

export const PLATAFORMAS = ["ios", "android", "pwa"];

export const DEFAULT_RECURSOS_APP = {
  isLeilaoAtivo:          { ios: false, android: false, pwa: true },
  isPagamentoNativoAtivo: { ios: false, android: false, pwa: false },
};

/** Normaliza a plataforma recebida; desconhecida/ausente → "pwa". */
export function normalizarPlataforma(p) {
  return PLATAFORMAS.includes(p) ? p : "pwa";
}

/**
 * Resolve os booleanos da plataforma a partir da config (ou do default).
 * @param {object|null} config  conteúdo do Blob config-experiencia:recursos_app
 * @param {string} plataforma   "ios" | "android" | "pwa"
 * @returns {{ plataforma: string, isLeilaoAtivo: boolean, isPagamentoNativoAtivo: boolean }}
 */
export function resolverRecursos(config, plataforma) {
  const cfg = config && typeof config === "object" ? config : DEFAULT_RECURSOS_APP;
  const plat = normalizarPlataforma(plataforma);
  const ler = (chave) => {
    const mapa = (cfg[chave] && typeof cfg[chave] === "object")
      ? cfg[chave]
      : DEFAULT_RECURSOS_APP[chave];
    return Boolean(mapa?.[plat]);
  };
  return {
    plataforma: plat,
    isLeilaoAtivo: ler("isLeilaoAtivo"),
    isPagamentoNativoAtivo: ler("isPagamentoNativoAtivo"),
  };
}
