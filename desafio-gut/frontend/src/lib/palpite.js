// palpite.js — UTAC108h.3. As regras do PALPITE das Ofertas Programadas, numa só casa.
//
// PORQUE EXISTE: até aqui estas regras viviam dentro de `pages/OfertasProgramadas.jsx`. Com o
// UTAC108h.3 o Início passou a mostrar o vidro «🎫 Programada» **com a zona de palpite lá dentro**,
// e as duas telas têm de responder à MESMA pergunta da MESMA maneira — senão passam a existir duas
// verdades sobre quando é que se pode palpitar (a classe de defeito que esta série combate).
// Movidas VERBATIM: nenhum comportamento mudou; só a casa.
//
// ⚠️ O palpite é BÓNUS — NÃO decide o cartão (requisito crítico da Google Play: jogo de habilidade).

// UTAC149 — a especial Programada (palpite): estado lido da edição, como a especial Relâmpago.
import { getEstadoEdicao } from "../utils/edicao.js";
import {
  ehEspecialProgramada, estadoEspecial, SELO_ESPECIAL, ESTADO_ESPECIAL,
} from "../components/edicao-especial/_estilo-especial.js";

/** Edição Programada ainda a aceitar palpites (o backend exige `status === "aberto"`). */
export const estaAberta = (e) => e?.status === "aberto";

/**
 * UTAC107e.1 — TODAS as edições Programadas, abertas primeiro (era só a 1.ª aberta: o palpite
 * ficava longe do produto e só servia uma edição — achado do mockup `ofertas-programadas.html`).
 */
export function edicoesProgramadasDe(edicoes) {
  const lista = Object.values(edicoes ?? {}).filter((e) => e?.tipo === "programado" && e?.id);
  // UTAC149 — entre as abertas, a ESPECIAL Programada vem primeiro: é ela que o vidro «🎫 Programada» do Início
  // mostra (logo abaixo do «⚡ Relâmpago») e a 1.ª da aba Ofertas Programadas. Sem especial, a ordem é a de sempre.
  const peso = (e) => Number(estaAberta(e)) * 2 + Number(ehEspecialProgramada(e));
  return lista.sort((a, b) => peso(b) - peso(a));
}

/**
 * UTAC149 — estado VISUAL de uma edição Programada, na forma do `getEstadoEdicao` (badge/cor/timer/rotuloLongo).
 *
 * Uma edição normal segue o `getEstadoEdicao` (fonte única do MC88.43, com a trava `EM_BREVE_MODE`). A ESPECIAL
 * Programada é a excepção já declarada para a especial Relâmpago (MC94.2/UTAC141): o operador abre-a com data e hora,
 * por isso o estado lê-se DA EDIÇÃO (`estadoEspecial` + `SELO_ESPECIAL`), nunca da flag global. Sem isto o cartão
 * dizia «EM BREVE» na faixa e «SEM PALPITE» na pílula, a divergência que o operador já corrigiu no UTAC141.
 *
 * Sem relógio de 1 s (a aba Ofertas Programadas não tem tick): a faixa mostra a DATA do fecho em hora de Brasília,
 * que não envelhece, e não uma contagem que ficaria parada.
 *
 * @param {object|null} edicao
 * @param {number} [agoraMs] relógio do servidor (default: o do aparelho)
 * @returns {object|null}
 */
export function estadoEdicaoProgramada(edicao, agoraMs = Date.now()) {
  if (!edicao) return null;
  if (!ehEspecialProgramada(edicao)) return getEstadoEdicao(edicao);
  const estado = estadoEspecial(edicao, agoraMs);
  if (!estado) return getEstadoEdicao(edicao); // sem datas legíveis não se inventa um estado
  const selo = SELO_ESPECIAL[estado];
  const quando = (iso) => {
    const ms = Date.parse(iso);
    const opts = { timeZone: "America/Sao_Paulo", hour12: false };
    const dia = new Intl.DateTimeFormat("pt-BR", { ...opts, day: "2-digit", month: "2-digit" }).format(ms);
    const hora = new Intl.DateTimeFormat("pt-BR", { ...opts, hour: "2-digit", minute: "2-digit" }).format(ms);
    return `${dia} às ${hora}`;
  };
  let rotuloLongo = "Edição encerrada";
  if (estado === ESTADO_ESPECIAL.ACTIVA) rotuloLongo = `Palpites até ${quando(edicao.termino_em)}`;
  else if (estado !== ESTADO_ESPECIAL.ENCERRADA) rotuloLongo = `Abre ${quando(edicao.inicio_em)}`;
  return {
    estado,
    badge: selo.texto,
    rotulo: selo.texto,
    rotuloLongo,
    timer: null, // null ⇒ o cartão mostra o `rotuloLongo` e a tabela mostra «Prazo:»
    cor: selo.cor,
    emBreve: estado === ESTADO_ESPECIAL.AGENDADA || estado === ESTADO_ESPECIAL.A_ABRIR,
    encerrada: estado === ESTADO_ESPECIAL.ENCERRADA,
    ativa: estado === ESTADO_ESPECIAL.ACTIVA,
  };
}

/**
 * UTAC107e.1 — os 5 estados do palpite, cartão a cartão (mockup, variante A). A copy segue o
 * mockup e não o enunciado: o backend premeia o palpite MAIS PRÓXIMO, não o exacto
 * (`apurar-palpite`, `mais_proximo`/`perdeu`) — «Acertou!» seria falso (achado E-2 do validador
 * do 107a-front).
 */
export function estadoPalpite(edicao, palpite) {
  if (palpite?.apurado === true) return palpite.resultado === "mais_proximo" ? "mais_proximo" : "perdeu";
  if (palpite) return "com_palpite";
  if (estaAberta(edicao)) return "sem_palpite";
  // Achado do validador: `agendado` ainda não abriu — dizer «encerrada» seria falso.
  return edicao?.status === "agendado" ? "abre_em_breve" : "encerrada";
}

export const PILULA = {
  sem_palpite:   { texto: "SEM PALPITE",       cor: "#e8f0fe" },
  com_palpite:   { texto: "COM PALPITE",       cor: "#f5a623" },
  mais_proximo:  { texto: "MAIS PRÓXIMO",      cor: "#3ddc84" },
  perdeu:        { texto: "NÃO FOI DESSA VEZ", cor: "#ff8a8d" },
  encerrada:     { texto: "ENCERRADA",         cor: "#6b7db8" },
  abre_em_breve: { texto: "ABRE EM BREVE",     cor: "#f5a623" },
};

// UTAC137-SEG3 (validador) — mensagem do erro do `registar-palpite`, por CÓDIGO do servidor.
// O `usePalpite` traduzia TODO o 409 por «Você precisa ter comprado um Passe para palpitar», mas no
// Regulamento v6.0 o palpite é gratuito (Arts. 3º/19) e o servidor (UTAC136) devolve 409 sobretudo por
// edição não aberta / já apurada / não Programada. `sem_passe` (FK para public.pontos) já não é um Passe
// por comprar: é uma conta sem linha de pontos, que qualquer login cria.
const MENSAGEM_409 = Object.freeze({
  edicao_apurada: "Esta edição já foi apurada e não aceita palpites novos",
  edicao_nao_aberta: "O palpite desta edição não está aberto",
  edicao_nao_programada: "Só se palpita em edições Programadas",
  sem_passe: "Sua conta ainda não está pronta. Entre de novo e tente outra vez",
});
// UTAC147-val (SEG4) — no modelo de Passes diretos o servidor exige 1 Passe Programado por palpite e responde
// 400 `sem_passes_disponiveis` / 502 `inventario_indisponivel`. Sem isto o ecrã dizia «Palpite inválido».
const MENSAGEM_PASSES = Object.freeze({
  sem_passes_disponiveis: "Você não tem Passes Programados. Compre Passes para participar: cada palpite usa 1 Passe Programado",
  inventario_indisponivel: "Não foi possível verificar seus Passes. Tente novamente",
});
export function mensagemErroPalpite(status, codigo) {
  if (Object.hasOwn(MENSAGEM_PASSES, codigo ?? "")) return MENSAGEM_PASSES[codigo];
  if (status === 401) return "Sessão expirada";
  if (status === 409) return MENSAGEM_409[codigo] ?? "Esta edição não aceita palpites agora";
  if (status === 404) return "Essa edição não existe";
  if (status === 400) return "Palpite inválido";
  return "Erro do servidor";
}
