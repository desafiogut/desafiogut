// encaminhamento — para onde vai quem abre a app na rota "/".
//
// MC89.36. Esta decisão vivia dentro de `DashboardOuCorporativo` (App.jsx) como
// dois `if` encadeados. Saiu para aqui por uma razão prática: o frontend não tem
// runner de React, portanto a única forma de a testar — e de provar cada teste
// por mutação — é ela ser uma função pura. Não mudou de comportamento ao mudar
// de sítio; os testes em encaminhamento.test.mjs fixam isso.
//
// ⚠️ ESTA FUNÇÃO SÓ ENCAMINHA. NÃO AUTORIZA NADA.
// Quem decide se a porta abre continua a ser, intocado:
//   · /admin       → AdminLayout (isAdmin real) + AdminAuthContext + backend
//   · /corporativo → CorporativoRoute (App.jsx) + backend
// Um palpite errado leva alguém a uma porta que não abre. É o mesmo contrato do
// MC89.31, e o cabeçalho de lib/dicaSessao.js detalha as defesas.

/** Destinos possíveis. Strings e não símbolos, para os testes lerem bem. */
export const DESTINO = {
  ADMIN:        "/admin",
  CORPORATIVO:  "/corporativo",
  ESTADO_NEUTRO: "estado-neutro",
  DASHBOARD:    "dashboard",
};

// MC89.36 (R-C) — prazo do estado neutro. Passado isto, mostra-se o Dashboard
// comum mesmo sem resposta: falhar para o lado ABERTO.
//
// PORQUE É QUE ISTO TEM DE EXISTIR: `apiGet` (lib/api.js) aceita um `signal` mas
// não impõe timeout próprio. Um fetch que nunca resolve deixaria `tipoResolvido`
// false para sempre, e o utilizador preso num esqueleto. Pior do que o defeito
// que este MC corrige.
//
// ⚠️ O NÚMERO. 10 000 ms foi a decisão do operador e cobre o caso que ele
// reporta: sair da conta e voltar a entrar acontece com as funções Netlify
// QUENTES, e aí a cadeia /cotas termina aos 5 707 ms (medido, MC89.35).
// Num arranque A FRIO essa cadeia mediu 11 950 ms — ou seja, o prazo dispara
// ~1,2 s antes da resposta e o lojista chega a ver o Dashboard comum nesse
// intervalo. Fecha-se subindo este número para 15 000; está isolado aqui de
// propósito, para ser a troca de um único valor e não uma caça pelo ficheiro.
export const PRAZO_ESTADO_NEUTRO_MS = 10_000;

/**
 * Decide o destino de quem está na rota "/".
 *
 * A ORDEM É O CONTRATO, e cada degrau existe por um motivo medido:
 *
 *  1. ADM — vai para o painel dele. Enquanto não há `address` vale o palpite;
 *     assim que há, vale só a resposta confirmada, para que o palpite nunca
 *     sobreviva à verdade. (MC89.12 / MC89.31)
 *
 *  2. LOJISTA — confirmado ou provável. É incondicional para o palpite e espera
 *     por `!tipoCarregando` no caso confirmado. (MC88.42)
 *
 *  3. ESTADO NEUTRO — parece autenticado, mas ainda NÃO SABEMOS quem é.
 *     É o degrau que o MC89.36 acrescenta. Antes disto, este caso caía no
 *     Dashboard comum, o que é AFIRMAR "é um utilizador comum" sem base:
 *     medido entre 5,7 s e 12,0 s a mostrar o produto errado a um lojista.
 *
 *  4. DASHBOARD — visitante, ou utilizador comum confirmado, ou prazo esgotado.
 *
 * @param {object} e
 * @param {string|null}  e.address           endereço Privy (null durante o restauro)
 * @param {boolean}      e.isAdmin           resposta CONFIRMADA do backend
 * @param {boolean}      e.adminLoading      a resposta de admin ainda vem a caminho
 * @param {boolean}      e.adminProvavel     palpite de admin lido em disco a t=0
 * @param {string}       e.tipoProvavel      "corporativo" | "comum"
 * @param {string}       e.tipoUsuario       "corporativo" | "comum" (confirmado)
 * @param {boolean}      e.tipoCarregando    /cotas em voo
 * @param {boolean}      e.tipoResolvido     /cotas JÁ RESPONDEU (sucesso ou erro)
 * @param {boolean}      e.pareceAutenticado há sessão (confirmada ou saldo em cache)
 * @param {boolean}      e.restaurandoSessao há sessão Privy em disco a ser restaurada
 * @param {boolean}      e.loginEmCurso      há um login OAuth a decorrer agora
 * @param {boolean}      e.prazoEsgotado     passaram PRAZO_ESTADO_NEUTRO_MS
 * @returns {string} um valor de DESTINO
 */
export function decidirDestino({
  address,
  isAdmin,
  adminLoading,
  adminProvavel,
  tipoProvavel,
  tipoUsuario,
  tipoCarregando,
  tipoResolvido,
  pareceAutenticado,
  restaurandoSessao,
  loginEmCurso,
  prazoEsgotado,
}) {
  // 1. ADM — inalterado face ao MC89.31/89.34. O encaminhamento é incondicional
  //    por decisão do operador: as telas comuns não existem para o ADM.
  if (address ? (isAdmin && !adminLoading) : adminProvavel) return DESTINO.ADMIN;

  // 2. LOJISTA — inalterado face ao MC88.42. O palpite basta para ENCAMINHAR;
  //    para o caso confirmado espera-se que já não esteja a carregar.
  if (tipoProvavel === "corporativo" && (tipoUsuario === "corporativo" ? !tipoCarregando : true)) {
    return DESTINO.CORPORATIVO;
  }

  // 3. ESTADO NEUTRO — o degrau novo.
  //
  //    ⚠️ R-B: a porta de entrada é `pareceAutenticado`. Um VISITANTE anónimo
  //    nunca entra aqui, porque para ele o Dashboard não é "o produto errado" —
  //    é a página pública de entrada, e tem de aparecer de imediato.
  //
  //    ⚠️ O SINAL É `tipoResolvido` E NÃO `tipoCarregando`. Medido no MC89.36-S0:
  //    `tipoCarregando` só passa a true quando /cotas dispara (4 422 ms), mas o
  //    Dashboard já está pintado desde os 568 ms. Entre os dois há 3,9 s — 76%
  //    da janela — em que `tipoCarregando` é FALSE e o utilizador está a ver o
  //    produto errado. Uma condição ancorada nele mudava o código sem mudar o
  //    ecrã.
  //
  //    ⚠️ R-C: `prazoEsgotado` é a válvula. Sem ela, um /cotas que nunca resolva
  //    prendia o utilizador aqui para sempre.
  //
  //    MC89.36.1 — A PORTA TEVE DE ALARGAR, E CADA CHAVE COBRE UM CASO MEDIDO.
  //    `pareceAutenticado` sozinho não bastava: ele ancora no `gut_saldo_cache`,
  //    que NÃO existe num login fresco (foi apagado no logout). Medido no
  //    aparelho: 1 889 ms de Dashboard comum logo após o retorno do OAuth.
  //      · pareceAutenticado → reabertura com saldo em cache (o caso comum)
  //      · restaurandoSessao → reabertura com sessão em disco mas SEM cache de
  //                            saldo (o caso que o MC89.31 mediu no ADM: 737 ms)
  //      · loginEmCurso      → login FRESCO, em que nenhum dos dois existe ainda
  //                            e o único sinal é o OAuth no URL
  //    Nenhuma delas é verdadeira para um visitante anónimo, que é o que R-B
  //    protege — há testes a fixar isso para as três.
  const esperaVale = pareceAutenticado || restaurandoSessao || loginEmCurso;
  if (esperaVale && !tipoResolvido && !prazoEsgotado) return DESTINO.ESTADO_NEUTRO;

  // 4. Visitante, comum confirmado, ou desistimos de esperar.
  return DESTINO.DASHBOARD;
}
