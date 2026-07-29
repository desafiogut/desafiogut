// MC88.43 — FONTE ÚNICA DE VERDADE do estado de uma edição.
//
// PORQUÊ ESTE FICHEIRO EXISTE
// O MC88.41 (B3/B4) apanhou o mesmo cartão a dizer "Encerrada" + "EM BREVE" +
// "Aguardando abertura" sob o título "em Andamento", e a edição R-1 a ser
// "Ativa" no /mercado e "Aguardando abertura" no Dashboard no MESMO instante.
// O S0 do MC88.43 mostrou que a causa não era uma função com entradas
// diferentes: era a AUSÊNCIA de função. Cada ecrã re-derivava o estado da fonte
// que tinha à mão (ver desafio-gut/docs/MC88.43-EDICAO-DIAGNOSTICO.txt):
//
//   FONTE A  AppContext.encerrado  — prazoTimestamp (on-chain/localStorage), só R-1
//   FONTE B  timeLeftEdicaoSegundos(edicao.termino_em) — todas as outras
//   FONTE C  edicao.status do backend — existia e NINGUÉM lia
//   TRAVA    EM_BREVE_MODE — aplicada em 4 ecrãs, ausente noutros 5
//
// Agora há um sítio só. Quem exibe estado de edição PERGUNTA aqui e usa o que
// vier — rótulo, cronómetro, cor e ícone. Nenhum ecrã volta a escolher texto.
//
// ISTO NÃO ALTERA LÓGICA DE NEGÓCIO. Continua a ser apresentação: quem
// habilita/bloqueia o lance é o `encerrado` do AppContext e o contrato
// on-chain, exatamente como antes (mesma promessa do lib/leilaoLock.js).

import { EM_BREVE_MODE, EM_BREVE_LABEL } from "../lib/leilaoLock.js";

/** Estados possíveis. Um e um só por edição, a qualquer instante. */
export const ESTADO_EDICAO = {
  EM_BREVE:      "em_breve",
  ATIVA:         "ativa",
  ENCERRADA:     "encerrada",
  INDISPONIVEL:  "indisponivel",
};

// Paleta alinhada com a que já estava espalhada pelos ecrãs (MC63: o token do
// laranja é #ff6b35; o dourado local #f5a623 mantém-se onde já era usado).
const COR_ESTADO = {
  em_breve:     "#ff6b35",
  ativa:        "#10b981",
  encerrada:    "#ef4444",
  indisponivel: "#6b7db8",
};

// Cada estado traz TODOS os textos de que os ecrãs precisam. Se um ecrã
// precisar de uma variante nova, ela nasce aqui — não no ecrã.
const PERFIL_ESTADO = {
  [ESTADO_EDICAO.EM_BREVE]: {
    rotulo:      "Em breve",
    rotuloLongo: "Aguardando abertura",
    badge:       "🕒 Em breve",
    timer:       EM_BREVE_LABEL,
    icone:       "🕒",
  },
  [ESTADO_EDICAO.ATIVA]: {
    rotulo:      "Ativa",
    rotuloLongo: "Em andamento — lance já!",
    badge:       "🟢 Ativo",
    timer:       null,          // null = o ecrã desenha a contagem viva
    icone:       "🟢",
  },
  [ESTADO_EDICAO.ENCERRADA]: {
    rotulo:      "Encerrada",
    rotuloLongo: "Leilão encerrado",
    badge:       "🔴 Encerrado",
    timer:       null,
    icone:       "🔴",
  },
  [ESTADO_EDICAO.INDISPONIVEL]: {
    rotulo:      "Indisponível",
    rotuloLongo: "Sem informação de prazo",
    badge:       "⚪ Indisponível",
    timer:       "—",
    icone:       "⚪",
  },
};

/**
 * Deriva o estado de uma edição. Função PURA: mesmos argumentos → mesmo
 * resultado (o `agora` é injetável precisamente para ser testável).
 *
 * ORDEM DE AUTORIDADE (fora da trava), da mais forte para a mais fraca:
 *   1. opts.encerrado — FONTE A. É o veredito do prazo on-chain/AppContext.
 *      Só `true` decide; `false` não impede o backend de dizer "encerrado".
 *   2. edicao.status  — FONTE C. O backend é autoridade sobre o seu próprio
 *      catálogo ("aberto" | "encerrado").
 *   3. edicao.termino_em — FONTE B. Derivação local, o último recurso.
 *
 * O buraco que isto tapa: `timeLeftEdicaoSegundos` devolvia 0 para uma edição
 * SEM `termino_em`, e 0 era lido como "encerrada". Agora sem prazo e sem
 * status é INDISPONIVEL — "não sei" deixou de se disfarçar de "acabou".
 *
 * @param {{ id?: string, termino_em?: string, status?: string }|null} edicao
 * @param {{ encerrado?: boolean, agora?: number }} [opts]
 *   - encerrado: veredito da FONTE A (Dashboard/TabelaLances/CardLance passam-no)
 *   - agora: epoch ms; default Date.now(). Existe para os testes.
 * @returns {{ estado: string, rotulo: string, rotuloLongo: string, badge: string,
 *             timer: string|null, cor: string, icone: string,
 *             emBreve: boolean, encerrada: boolean, ativa: boolean }}
 */
export function getEstadoEdicao(edicao, opts = {}) {
  return montar(derivar(edicao, opts));
}

function derivar(edicao, opts) {
  // 1. A TRAVA GANHA A TUDO. Decisão do operador no MC88.43: "tudo precisa
  //    estar como em breve". Enquanto EM_BREVE_MODE === true não há ecrã
  //    nenhum que possa contradizer outro, porque não há nada a derivar.
  if (EM_BREVE_MODE) return ESTADO_EDICAO.EM_BREVE;

  // 2. FONTE A — o prazo real (on-chain para o Programado). Só `true` decide.
  if (opts.encerrado === true) return ESTADO_EDICAO.ENCERRADA;

  // 3. FONTE C — o backend, autoridade sobre o seu catálogo.
  const status = typeof edicao?.status === "string" ? edicao.status.toLowerCase() : null;
  if (status === "encerrado" || status === "encerrada") return ESTADO_EDICAO.ENCERRADA;

  // 4. FONTE B — derivação local do termino_em.
  const fim = edicao?.termino_em ? Date.parse(edicao.termino_em) : NaN;
  if (Number.isNaN(fim)) {
    // Sem prazo utilizável. Se o backend disse "aberto", acreditamos nele;
    // caso contrário assumimos ignorância — nunca "encerrada".
    return status === "aberto" ? ESTADO_EDICAO.ATIVA : ESTADO_EDICAO.INDISPONIVEL;
  }

  const agora = Number.isFinite(opts.agora) ? opts.agora : Date.now();
  return fim <= agora ? ESTADO_EDICAO.ENCERRADA : ESTADO_EDICAO.ATIVA;
}

function montar(estado) {
  const perfil = PERFIL_ESTADO[estado];
  return {
    estado,
    ...perfil,
    cor:       COR_ESTADO[estado],
    emBreve:   estado === ESTADO_EDICAO.EM_BREVE,
    encerrada: estado === ESTADO_EDICAO.ENCERRADA,
    ativa:     estado === ESTADO_EDICAO.ATIVA,
  };
}
