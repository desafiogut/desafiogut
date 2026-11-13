// palpite.js — UTAC108h.3. As regras do PALPITE das Ofertas Programadas, numa só casa.
//
// PORQUE EXISTE: até aqui estas regras viviam dentro de `pages/OfertasProgramadas.jsx`. Com o
// UTAC108h.3 o Início passou a mostrar o vidro «🎫 Programada» **com a zona de palpite lá dentro**,
// e as duas telas têm de responder à MESMA pergunta da MESMA maneira — senão passam a existir duas
// verdades sobre quando é que se pode palpitar (a classe de defeito que esta série combate).
// Movidas VERBATIM: nenhum comportamento mudou; só a casa.
//
// ⚠️ O palpite é BÓNUS — NÃO decide o cartão (requisito crítico da Google Play: jogo de habilidade).

/** Edição Programada ainda a aceitar palpites (o backend exige `status === "aberto"`). */
export const estaAberta = (e) => e?.status === "aberto";

/**
 * UTAC107e.1 — TODAS as edições Programadas, abertas primeiro (era só a 1.ª aberta: o palpite
 * ficava longe do produto e só servia uma edição — achado do mockup `ofertas-programadas.html`).
 */
export function edicoesProgramadasDe(edicoes) {
  const lista = Object.values(edicoes ?? {}).filter((e) => e?.tipo === "programado" && e?.id);
  return lista.sort((a, b) => Number(estaAberta(b)) - Number(estaAberta(a)));
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
export function mensagemErroPalpite(status, codigo) {
  if (status === 401) return "Sessão expirada";
  if (status === 409) return MENSAGEM_409[codigo] ?? "Esta edição não aceita palpites agora";
  if (status === 404) return "Essa edição não existe";
  if (status === 400) return "Palpite inválido";
  return "Erro do servidor";
}
