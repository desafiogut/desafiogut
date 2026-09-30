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

// MC103 — flags de TRANSIÇÃO para a remodelação v6.0 (aplicada no MC111). São
// GLOBAIS (escalares, não por plataforma). Os defaults reproduzem o comportamento
// actual e, neste MC, NENHUM consumidor as lê — só ficam expostas. Valor do config
// com tipo errado (ex.: "false" em string) → default (fail-soft, sem coerção).
export const DEFAULT_FLAGS_TRANSICAO = {
  isProgramadaSenhasAtiva:  true,
  isTorneioVisivel:         true,
  isSenhaBonusAtiva:        true,
  isCampanhaIndicacaoAtiva: false,
  limitePassesIndicacao:    5,
};

/** Normaliza a plataforma recebida; desconhecida/ausente → "pwa". */
export function normalizarPlataforma(p) {
  return PLATAFORMAS.includes(p) ? p : "pwa";
}

/**
 * Resolve os booleanos da plataforma a partir da config (ou do default).
 * @param {object|null} config  conteúdo do Blob config-experiencia:recursos_app
 * @param {string} plataforma   "ios" | "android" | "pwa"
 * @returns {{ plataforma: string, isLeilaoAtivo: boolean, isPagamentoNativoAtivo: boolean }
 *           & typeof DEFAULT_FLAGS_TRANSICAO}
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
  const lerTransicao = (chave) => {
    const padrao = DEFAULT_FLAGS_TRANSICAO[chave];
    // Object.hasOwn: uma chave herdada (poluição de protótipo) não conta como config.
    const v = Object.hasOwn(cfg, chave) ? cfg[chave] : undefined;
    if (typeof padrao === "boolean") return typeof v === "boolean" ? v : padrao;
    return Number.isSafeInteger(v) && v >= 0 ? v : padrao;
  };
  const transicao = {};
  for (const chave of Object.keys(DEFAULT_FLAGS_TRANSICAO)) transicao[chave] = lerTransicao(chave);
  return {
    plataforma: plat,
    isLeilaoAtivo: ler("isLeilaoAtivo"),
    isPagamentoNativoAtivo: ler("isPagamentoNativoAtivo"),
    ...transicao,
  };
}
