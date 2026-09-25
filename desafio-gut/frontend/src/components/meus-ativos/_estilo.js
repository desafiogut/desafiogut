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
 * Diz se um valor de lance é utilizável — sem coerção.
 *
 * ⚠️ `Number(null)` é `0`, e `0` é finito. Esta é a armadilha EXACTA que o
 * projeto já pagou no MC93-A: `Number.isInteger(Number(null))` devolvia `true` e
 * um lance com `valorCentavos: null` era eleito o MENOR ÚNICO da rodada. E há
 * caminho real para o `null`: `_lib/data-store-supabase.mjs` grava
 * `valor_centavos = null` DE PROPÓSITO para marcar lance inválido.
 * Reproduzi a mesma armadilha aqui, e a validação independente apanhou-a: um
 * lance `null` aparecia como "R$ 0,00 · menor único seu · vale 3 pontos".
 *
 * @param {unknown} centavos
 * @returns {boolean}
 */
export function valorUtilizavel(centavos) {
  return typeof centavos === "number" && Number.isFinite(centavos) && centavos >= 0;
}

/**
 * Centavos para reais, no formato pt-BR.
 *
 * ⚠️ NÃO COAGE. `null`, `undefined`, strings e negativos dão "—", não "R$ 0,00".
 * Ver `valorUtilizavel` para a razão.
 *
 * @param {unknown} centavos
 * @returns {string} ex.: "R$ 9,00"
 */
export function reais(centavos) {
  if (!valorUtilizavel(centavos)) return "—";
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

/**
 * Inteiro não-negativo para exibição — ou `null` se não for utilizável.
 *
 * ⚠️ Mesma razão: `senhasACreditar: Infinity` renderizava "Infinity senhas" e
 * `1e21` renderizava "1e+21 senhas". Achado da validação independente.
 *
 * @param {unknown} n
 * @returns {number|null}
 */
export function inteiroSeguro(n) {
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
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

/**
 * Cartão de secção.
 *
 * ⚠️ O FUNDO É QUASE OPACO, E A RAZÃO VEIO DA CAPTURA DE PRODUÇÃO.
 * A primeira versão usava `rgba(255,255,255,0.02)` — quase transparente. Na
 * captura, a imagem de fundo do app (electrodomésticos, confetes, luzes) passava
 * através do texto e as secções ficavam ilegíveis. Nenhum teste apanhava isto:
 * o markup estava correcto.
 * É a regra que o projeto já tinha registado para texto longo — vidro SÓLIDO
 * (navy ~0.9), não o vidro padrão translúcido.
 *
 * ⚠️ E SEM `backdrop-filter`, de propósito: o projeto mediu que o custo é por
 * CAMADA (11 camadas de blur custaram 29 fps). Cinco secções novas com blur
 * seriam cinco camadas a mais. Um fundo sólido custa zero e lê-se melhor.
 *
 * ⚠️ O VALOR É O DO PROJETO, NÃO UM INVENTADO. `rgba(13,18,53,0.92)` é o
 * `.gut-glass--solid` de `globals.css:429`, criado no MC25.7 e reutilizado no
 * MC89.4 pelo MESMO sintoma: "o texto assentava DIRECTAMENTE na ilustração de
 * fundo e havia frases que não se liam". A minha primeira tentativa usou
 * `rgba(5,8,24,0.82)` — 18% de transparência, que chega para os
 * electrodomésticos brancos do fundo atravessarem a secção do ranking.
 * Não se inventa fundo novo: usa-se o navy que já existe.
 */
export function caixa(isMobile) {
  return {
    border: `1px solid ${COR.borda}`,
    borderRadius: "14px",
    padding: isMobile ? "0.9rem" : "1.1rem",
    background: "rgba(13, 18, 53, 0.92)",
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
