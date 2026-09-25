// _estilo.js — MC94. Paleta e utilitários partilhados pelas secções do torneio.
//
// Reproduz a paleta local de `MeusAtivos.jsx` em vez de inventar outra: as
// secções novas ficam a viver dentro da tela e têm de parecer parte dela.

export const COR = {
  primary: "#f5a623",
  primaryDim: "rgba(245,166,35,0.15)",
  text: "#e8f0fe",
  muted: "#6b7db8",
  success: "#10b981",
  danger: "#ef4444",
  gold: "#f5a623",
  // ⚠️ Roxo é a cor SEMÂNTICA de senhas em todo o app (KPI Senhas, "Trocar por
  // senhas"). Usa-se aqui porque `senhasACreditar` fala de senhas — não por
  // gosto. Trocar isto por laranja quebraria a leitura que o utilizador já tem.
  senhas: "#a78bfa",
  senhasDim: "rgba(167,139,250,0.14)",
  borda: "rgba(245,166,35,0.12)",
};

/** Tradutor por omissão: devolve o fallback, para os componentes renderizarem
 *  fora de um `<IdiomaProvider>` (é o caso em SSR e nos testes). */
export const T_PADRAO = (_chave, fallback) => fallback;

/**
 * Centavos para reais, no formato pt-BR.
 * @param {number} centavos
 * @returns {string} ex.: "R$ 9,00"
 */
export function reais(centavos) {
  const n = Number(centavos);
  if (!Number.isFinite(n)) return "—";
  return `R$ ${(n / 100).toFixed(2).replace(".", ",")}`;
}

/**
 * Encurta um endereço para exibição.
 *
 * ⚠️ R4: um ranking mostra endereços de OUTRAS pessoas, e as capturas de ecrã
 * deste MC vão para o repositório. Nunca se mostra o endereço inteiro.
 *
 * @param {string} endereco
 * @returns {string} ex.: "0x1111…1111"
 */
export function encurtar(endereco) {
  const e = String(endereco ?? "");
  if (e.length <= 12) return e;
  return `${e.slice(0, 6)}…${e.slice(-4)}`;
}

/** Cartão de secção, no mesmo desenho dos cartões existentes da tela. */
export function caixa(isMobile) {
  return {
    border: `1px solid ${COR.borda}`,
    borderRadius: "14px",
    padding: isMobile ? "0.9rem" : "1.1rem",
    background: "rgba(255,255,255,0.02)",
  };
}

/** Título de secção. */
export function tituloSecao(isMobile) {
  return {
    margin: "0 0 0.6rem",
    fontSize: isMobile ? "0.92rem" : "1rem",
    fontWeight: 800,
    color: COR.text,
  };
}

/** Texto secundário/legenda. */
export function legenda(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? "0.76rem" : "0.8rem",
    color: COR.muted,
    lineHeight: 1.45,
  };
}
