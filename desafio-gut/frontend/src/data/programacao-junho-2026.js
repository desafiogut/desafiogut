// Programação Junho/2026 — fonte: docs/analise-programacao-junho-2026.md
//
// Modelo compacto: ao invés de hardcoded 168 sessões, codificamos as REGRAS:
//   • Horários por tipo de dia (weekdays / saturday / sunday)
//   • Quais tiers aparecem em cada horário (sempre Diamante+Ouro; Bronze/Prata
//     variam conforme dia e semana — usamos um padrão didático)
//   • Regra de domingo: filtro automático (apenas Prata repetições + Diamante)
//   • Mês: 4 semanas seg-sáb + domingos exclusivos
//
// Esse modelo serve como UI representativa da grade. A versão "número exato
// de bronze_XX em cada horário" exige o painel Admin (Fase D do roadmap) que
// permite atribuir clientes a slots — não é estática.

export const HORARIOS = {
  weekday:  ["07:00", "11:00", "15:00", "19:00", "21:00"],
  saturday: ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
  sunday:   ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
};

export const NOTA_OVERNIGHT = "Slot 21:00 é overnight — vai até 07:00 do dia seguinte (~10h).";

export const DIAS = [
  { key: "sunday",    label: "Domingo",   short: "Dom", tipo: "sunday"   },
  { key: "monday",    label: "Segunda",   short: "Seg", tipo: "weekday"  },
  { key: "tuesday",   label: "Terça",     short: "Ter", tipo: "weekday"  },
  { key: "wednesday", label: "Quarta",    short: "Qua", tipo: "weekday"  },
  { key: "thursday",  label: "Quinta",    short: "Qui", tipo: "weekday"  },
  { key: "friday",    label: "Sexta",     short: "Sex", tipo: "weekday"  },
  { key: "saturday",  label: "Sábado",    short: "Sáb", tipo: "saturday" },
];

// Datas de Junho/2026 por dia da semana e número de semana (4 semanas).
export const DATAS_JUNHO = {
  monday:    ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"],
  tuesday:   ["2026-06-02", "2026-06-09", "2026-06-16", "2026-06-23"],
  wednesday: ["2026-06-03", "2026-06-10", "2026-06-17", "2026-06-24"],
  thursday:  ["2026-06-04", "2026-06-11", "2026-06-18", "2026-06-25"],
  friday:    ["2026-06-05", "2026-06-12", "2026-06-19", "2026-06-26"],
  saturday:  ["2026-06-06", "2026-06-13", "2026-06-20", "2026-06-27"],
  sunday:    ["2026-06-07", "2026-06-14", "2026-06-21", "2026-06-28"],
};

// Regra de tiers visíveis por dia, conforme spec §3.1 + §8.
//   sempreVisivel: Ouro + Diamante (programado 24h, fixados no topo)
//   variavel: Bronze + Prata (relâmpago, rotacionam conforme grade)
//   sunday: APENAS Prata (repetição) + Diamante (REQ-29)
export function tiersPorHorario({ diaKey, semana, horario }) {
  // Domingo: apenas Prata (repeat) + Diamante fixo
  if (diaKey === "sunday") {
    const tiers = ["diamante"];
    // Spec §8 prevê bônus do Diamante em domingos 19:00/21:00 da 4ª semana
    const ehBonusDomingo = semana === 4 && (horario === "19:00" || horario === "21:00");
    return {
      tiers: [...tiers, "prata"],
      tags: [
        ...(tiers.includes("diamante") ? [{ texto: "Diamante fixo", cor: "#00d4ff" }] : []),
        { texto: "Prata (repetição)", cor: "#cbd5e1" },
        ...(ehBonusDomingo ? [{ texto: "Bônus Diamante", cor: "#fbbf24" }] : []),
      ],
    };
  }
  // Dias úteis e sábado: Ouro + Diamante sempre; Bronze + Prata em revezamento.
  const tags = [
    { texto: "Diamante", cor: "#00d4ff" },
    { texto: "Ouro",     cor: "#f5a623" },
    { texto: "Prata",    cor: "#cbd5e1" },
    { texto: "Bronze",   cor: "#cd7f32" },
  ];
  return { tiers: ["diamante", "ouro", "prata", "bronze"], tags };
}

// Conjunto de horários a renderizar para um dia (segunda).
export function horariosDoDia(diaKey) {
  const dia = DIAS.find((d) => d.key === diaKey);
  if (!dia) return [];
  return HORARIOS[dia.tipo] || [];
}

import { apiGet } from "../lib/api.js";

// Tenta buscar a grade publicada pelo Admin (Blob `schedule:{mes}`).
// Se 404 ou erro de rede, retorna null e o consumidor deve cair no fallback
// estático exportado deste módulo. Não bloqueia render — pode rodar em useEffect.
export async function buscarGradeRemota(mes = "2026-06") {
  try {
    const { ok, data } = await apiGet(`schedule?mes=${encodeURIComponent(mes)}`);
    if (!ok) return null;
    return data?.grade ?? null;
  } catch {
    return null;
  }
}

// Resolve "qual dia da semana é hoje" no fuso configurável.
// TZ vem de import.meta.env.VITE_TIMEZONE; default "America/Sao_Paulo".
export function diaDaSemanaHoje(timezone) {
  const tz = timezone || "America/Sao_Paulo";
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz });
  const nome = fmt.format(new Date()).toLowerCase();
  // Mapa: "monday" → "monday", etc. (já vem em inglês minúsculo)
  return nome;
}

// Resolve hora atual no fuso (HH:MM). Útil para "qual slot está ativo agora".
export function horaAgora(timezone) {
  const tz = timezone || "America/Sao_Paulo";
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
  });
  return fmt.format(new Date()); // "14:23"
}

// Tiers visíveis agora, considerando dia da semana corrente no fuso configurado.
// Aplica regra de §8 da spec (domingo exclusivo: apenas Prata + Diamante).
// Retorna: { tiers: string[], regra: "weekday"|"saturday"|"sunday", diaKey }
export function tiersAgoraVisiveis(timezone) {
  const diaKey = diaDaSemanaHoje(timezone);
  if (diaKey === "sunday") {
    return { tiers: ["diamante", "prata"], regra: "sunday", diaKey };
  }
  // Dias úteis e sábado: todos os 4 tiers visíveis na vitrine.
  // Bronze/Prata aparecem como "agendados" se não há sessão ativa no momento.
  return {
    tiers: ["diamante", "ouro", "prata", "bronze"],
    regra: diaKey === "saturday" ? "saturday" : "weekday",
    diaKey,
  };
}

// Determina se o tier tem sessão ativa AGORA no fuso configurado.
// Diamante e Ouro são "programado 24h" → sempre ativos durante o dia.
// Bronze e Prata são "relâmpago 30-60min" → ativos se hora atual cai em algum slot.
export function tierAtivoAgora(tier, timezone) {
  const diaKey = diaDaSemanaHoje(timezone);
  if (diaKey === "sunday") {
    // Domingo: só Diamante + Prata (repeats) ativos
    return tier === "diamante" || tier === "prata";
  }
  if (tier === "diamante" || tier === "ouro") return true;   // programado 24h
  // Bronze / Prata: ativo se hora atual está dentro de algum slot do dia.
  const horarios = horariosDoDia(diaKey);
  const agora    = horaAgora(timezone);
  return horarios.some((h) => slotAtivoAgora(h, horarios, agora));
}

// Determina se um slot está ativo no momento (considerando overnight 21h → 07h).
export function slotAtivoAgora(horarioSlot, todosHorarios, agora) {
  if (!agora) return false;
  const [h, m] = horarioSlot.split(":").map(Number);
  const [hA, mA] = agora.split(":").map(Number);
  const inicio = h * 60 + m;
  const agoraMin = hA * 60 + mA;
  // Próximo slot define o fim. Se for o último (21:00), vai até 07:00 do dia seguinte.
  const idx = todosHorarios.indexOf(horarioSlot);
  const proximo = todosHorarios[idx + 1];
  let fim;
  if (proximo) {
    const [hP, mP] = proximo.split(":").map(Number);
    fim = hP * 60 + mP;
  } else {
    fim = 7 * 60 + 24 * 60; // overnight: 07:00 do dia seguinte
  }
  if (fim > 24 * 60) {
    // Overnight: ativo se agora >= inicio (mesmo dia) OU agora < (fim - 24*60) (madrugada)
    return agoraMin >= inicio || agoraMin < (fim - 24 * 60);
  }
  return agoraMin >= inicio && agoraMin < fim;
}
