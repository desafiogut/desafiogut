// src/lib/pontosLance.js — UTAC110j.4b (Frente B, só-UI). O PROGRESSO PESSOAL dos pontos de lance em Meus Ativos.
// Puro: sem React, sem rede — testável com `node --test`.
//
// Fonte (backend, NÃO tocado): `GET /ler-pontos` → `lance: { creditos, pontos, historico }`, cada movimento
// `{ data, campo, motivo, delta, ref }` (`_lib/ledger-lance.mjs:92`). Uma reversão APAGA a entrada do histórico
// (`reverterMovimentoLance`), logo somar o histórico não conta movimentos desfeitos.
// Só os pontos do PRÓPRIO: um ranking de todos exige endpoint novo (UTAC do Hermes, `_logs/UTAC110n.spec-HERMES.md`).
// UTAC110j.5 — + as PROPORÇÕES FIXAS (Play), o estado do lance em pontos (CardLance) e as conversões (Carteira).

export const CAMPO_PONTOS = "pontos_lance";

/** As fontes de pontos de lance (Art. 16º), pela ordem do ecrã. Os rótulos casam com `MOTIVOS_PONTOS_LANCE`. */
export const FONTES = Object.freeze([
  Object.freeze({ motivo: "login", rotulo: "Login diário" }),
  Object.freeze({ motivo: "missao", rotulo: "Missão do dia" }),
  Object.freeze({ motivo: "indicacao", rotulo: "Indicação" }),
  Object.freeze({ motivo: "sequencia", rotulo: "Sequência" }),
  Object.freeze({ motivo: "boas-vindas", rotulo: "Boas-vindas" }),
  // UTAC110j.5 — o bónus de +200 do Passe Relâmpago (Art. 16º VI, UTAC110n). Sem ele caía em «Outros».
  Object.freeze({ motivo: "passe-relampago", rotulo: "Passe Relâmpago" }),
]);

/**
 * UTAC110j.5 — as conversões do modelo antigo (migrações 110n / 110n.1). NÃO são motivos do ledger
 * (`MOTIVOS_PONTOS_LANCE`): são escritas uma vez pela migração, com estes `motivo`s no `historico_lance`.
 */
export const CONVERSOES = Object.freeze([
  Object.freeze({ motivo: "conversao-creditos", rotulo: "Créditos antigos convertidos" }),
  Object.freeze({ motivo: "conversao-senhas", rotulo: "Senhas antigas convertidas" }),
]);

/** O débito do próprio lance (cada lance gasta o seu valor em pontos — UTAC110n). */
export const MOTIVO_GASTO_LANCE = "lance";

export function rotuloMotivo(motivo) {
  const f = FONTES.find((x) => x.motivo === motivo) ?? CONVERSOES.find((x) => x.motivo === motivo);
  if (f) return f.rotulo;
  return motivo === MOTIVO_GASTO_LANCE ? "Lance" : "Outro";
}

/**
 * UTAC110j.5 — PROPORÇÕES FIXAS do programa (exigência da Google Play: visíveis no app). Fonte única do
 * FRONTEND; cada número está amarrado à constante do backend por teste (`utac110j5-pontos-lance.test.mjs`),
 * que lê o código-fonte do backend — se um lado mudar sem o outro, a suíte cai.
 */
export const PROPORCOES = Object.freeze({
  login: 5, //               fontes-lance.mjs PONTOS_LOGIN_DIARIO
  missao: 10, //             fontes-lance.mjs PONTOS_MISSAO_LANCE
  indicacao: 50, //          fontes-lance.mjs PONTOS_INDICACAO
  indicacoesPorMes: 10, //   fontes-lance.mjs LIMITE_INDICACOES_MES
  sequencia: 50, //          pontuacao-store.mjs PONTOS_LANCE_BONUS_SEQUENCIA
  acertosSequencia: 5, //    pontuacao-utils.mjs REGRAS.ACERTOS_PARA_BONUS
  cicloPontos: 225, //       fontes-lance.mjs PONTOS_CICLO_MISSOES
  cicloDias: 15, //          fontes-lance.mjs DIAS_CICLO_MISSOES (ceil(225 / 15))
  passeRelampago: 200, //    ledger-lance.mjs PONTOS_LANCE_POR_PASSE_RELAMPAGO
  fidelidadePorPasse: 10, // passe-pontos.mjs PONTOS_FIDELIDADE_POR_PASSE
  ecoPorPasse: 1, //         R18-110e-1 (comprar-passe-tipado.mjs)
});
/** Pontos por dia de ciclo (login + missão). */
export const CICLO_POR_DIA = PROPORCOES.login + PROPORCOES.missao;
/** A missão exige um lance e o lance mínimo custa 1 ponto ⇒ o ciclo garante, no mínimo, isto LÍQUIDO. */
export const CICLO_LIQUIDO = PROPORCOES.cicloPontos - PROPORCOES.cicloDias;

/**
 * UTAC110j.5 — as proporções em texto (para as Regras Oficiais). Cada linha é FACTO do código: nada
 * aqui é decidido pela UI. O texto que VINCULA é o Regulamento; isto é o resumo dos números.
 */
export const PROPORCOES_TEXTO = Object.freeze([
  Object.freeze({
    id: "ganhar",
    titulo: "Como ganhar pontos de lance (gratuitos)",
    linhas: Object.freeze([
      `Login diário: +${PROPORCOES.login} pontos de lance.`,
      `Missão do dia (dar 1 lance): +${PROPORCOES.missao} pontos de lance.`,
      `Indicação convertida: +${PROPORCOES.indicacao} pontos de lance (até ${PROPORCOES.indicacoesPorMes} indicações por mês).`,
      `Sequência de ${PROPORCOES.acertosSequencia} acertos seguidos: +${PROPORCOES.sequencia} pontos de lance.`,
      `Ciclo completo de missões: ${PROPORCOES.cicloPontos} pontos de lance em ${PROPORCOES.cicloDias} dias (${PROPORCOES.cicloDias} × ${CICLO_POR_DIA} pontos por dia, já contando o login e a missão diária). Como a missão exige um lance e cada lance gasta o seu valor, com lances de 1 ponto ficam ${CICLO_LIQUIDO} pontos líquidos (com lances maiores, ficam menos).`,
    ]),
  }),
  Object.freeze({
    id: "usar",
    titulo: "Como usar os pontos de lance",
    linhas: Object.freeze([
      "Cada lance gasta o valor do lance em pontos de lance: um lance de 37 gasta 37 pontos.",
      "Só é possível dar um lance até o saldo de pontos de lance que você tem.",
      "Quem vence compra o produto pelo valor do seu lance, à razão de 1 ponto = R$ 0,01 (Art. 18º).",
    ]),
  }),
  Object.freeze({
    id: "passe",
    titulo: "O que o Passe Relâmpago dá",
    linhas: Object.freeze([
      `+${PROPORCOES.passeRelampago} pontos de lance (bônus: não é condição para dar lances).`,
      `${PROPORCOES.fidelidadePorPasse} pontos de fidelidade (rumo ao cartão colecionável).`,
      `${PROPORCOES.ecoPorPasse} ECOQUILDO.`,
      "Acesso às métricas da edição e ao GUTO.",
      "O Passe Desafio é um produto; os pontos de lance são um benefício suplementar, não uma taxa para participar. Os pontos de lance também se ganham de graça pelo engajamento no app (Art. 17º).",
    ]),
  }),
]);

const inteiro = (n) => (typeof n === "number" && Number.isSafeInteger(n) ? n : null);

/** Um movimento de PONTOS legível, ou `null` (sem coerção: delta inteiro ≠ 0, data parseável). */
function movimento(h) {
  if (h === null || typeof h !== "object" || h.campo !== CAMPO_PONTOS) return null;
  const delta = inteiro(h.delta);
  if (delta === null || delta === 0) return null;
  const t = typeof h.data === "string" ? Date.parse(h.data) : NaN;
  if (!Number.isFinite(t)) return null;
  return { data: h.data, t, motivo: typeof h.motivo === "string" ? h.motivo : "", delta };
}

/**
 * O bloco `lance` do `ler-pontos`, lido SEM coerção. Ilegível → `null` (a UI não inventa zeros).
 * @returns {{ pontos:number, movimentos:Array }|null}
 */
export function pontosLanceDaResposta(data) {
  const l = data?.lance;
  if (l === null || typeof l !== "object") return null;
  const pontos = inteiro(l.pontos);
  if (pontos === null || pontos < 0 || !Array.isArray(l.historico)) return null;
  return { pontos, movimentos: l.historico.map(movimento).filter(Boolean) };
}

/** Pontos GANHOS por fonte (só deltas positivos). Fontes sem ganhos vêm a 0; motivos desconhecidos → «outro». */
export function ganhosPorFonte(lance) {
  const r = Object.fromEntries(FONTES.map((f) => [f.motivo, 0]));
  r.conversao = 0; // UTAC110j.5 — as duas conversões somam numa linha só
  r.outro = 0;
  for (const m of lance?.movimentos ?? []) {
    if (m.delta <= 0) continue;
    if (CONVERSOES.some((c) => c.motivo === m.motivo)) r.conversao += m.delta;
    else if (Object.hasOwn(r, m.motivo) && m.motivo !== "outro" && m.motivo !== "conversao") r[m.motivo] += m.delta;
    else r.outro += m.delta;
  }
  return r;
}

/**
 * UTAC110j.5 — que conversão do modelo antigo aconteceu a este titular (para a nota da Carteira).
 * @returns {{ creditos:boolean, senhas:boolean }}
 */
export function conversoesFeitas(lance) {
  const ms = lance?.movimentos ?? [];
  return {
    creditos: ms.some((m) => m.motivo === "conversao-creditos" && m.delta > 0),
    senhas: ms.some((m) => m.motivo === "conversao-senhas" && m.delta > 0),
  };
}

const inteiroNaoNeg = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);

/**
 * UTAC110j.5 (Frente A) — estado do «Dar lance» no Relâmpago: o lance GASTA o seu valor em pontos de
 * lance (UTAC110n). Fail-closed: sem saldo CONHECIDO, ou com o valor acima do saldo, o botão fica
 * desligado e a mensagem diz porquê. `valor` é o que está no campo (centavos = pontos, Art. 18º);
 * vazio ⇒ só se olha para o saldo.
 * @returns {{ estado:string, podeLancar:boolean, mensagem:string, saldo:number|null, custo:number|null }}
 */
export function estadoPontosLance({ isConnected, pontos, loading, erro, valor }) {
  const n = typeof valor === "string" && /^[0-9]+$/.test(valor) ? Number(valor) : valor;
  const c = inteiroNaoNeg(n);
  const base = { saldo: null, custo: c !== null && c > 0 ? c : null };
  if (!isConnected) return { ...base, estado: "sem_sessao", podeLancar: false, mensagem: "" };
  if (loading) return { ...base, estado: "carregando", podeLancar: false, mensagem: "⏳ Carregando seus pontos de lance…" };
  const saldo = inteiroNaoNeg(pontos);
  if (erro || saldo === null) {
    return { ...base, estado: "erro", podeLancar: false,
      mensagem: "⚠️ Não foi possível ler seus pontos de lance. Tente de novo em instantes." };
  }
  if (saldo < 1) {
    return { ...base, saldo, estado: "sem_pontos", podeLancar: false,
      mensagem: `Você não tem pontos de lance. Ganhe pontos grátis: login diário (+${PROPORCOES.login}) e missão do dia (+${PROPORCOES.missao}).` };
  }
  if (base.custo !== null && base.custo > saldo) {
    return { ...base, saldo, estado: "insuficiente", podeLancar: false,
      mensagem: `Saldo insuficiente: este lance custa ${base.custo} pontos de lance e você tem ${saldo}. Ganhe pontos grátis com o login diário (+${PROPORCOES.login}) e a missão do dia (+${PROPORCOES.missao}).` };
  }
  return { ...base, saldo, estado: "ok", podeLancar: true, mensagem: "" };
}

/** «1 ponto de lance» / «N pontos de lance». */
export function rotuloPontosLance(n) {
  return `${n} ${n === 1 ? "ponto de lance" : "pontos de lance"}`;
}

/** Os N movimentos mais recentes (mais recente primeiro). */
export function recentes(lance, n = 5) {
  return [...(lance?.movimentos ?? [])].sort((a, b) => b.t - a.t).slice(0, n);
}

/** dd/mm no dia de Manaus (o dia das missões, UTAC110f). */
export function diaMes(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Manaus" }).format(t);
  } catch {
    const d = new Date(t - 4 * 3600 * 1000).toISOString();
    return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  }
}
