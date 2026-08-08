// tempo — formatação temporal para o painel ADM.
// MC89.26 (Fase 2). Usa Intl.RelativeTimeFormat (nativo, sem dependências).
// Devolve "há 3 min", "hoje 14:30", "ontem", "31/07/2026".

const minuto = 60; const hora = 3600; const dia = 86400;

export function tempoRelativo(iso) {
  if (!iso) return "—";
  const data = new Date(iso);
  if (isNaN(data.getTime())) return iso;
  const agora = new Date();
  const diffSeg = Math.floor((agora - data) / 1000);

  if (diffSeg < 0) {
    // Data futura — improvável mas trata
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (diffSeg < minuto) return rtf.format(-Math.floor(diffSeg), "second");
  if (diffSeg < hora)   return rtf.format(-Math.floor(diffSeg / minuto), "minute");
  if (diffSeg < dia)    return rtf.format(-Math.floor(diffSeg / hora), "hour");
  if (diffSeg < 2 * dia) return "ontem";
  if (diffSeg < 7 * dia) return rtf.format(-Math.floor(diffSeg / dia), "day");
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Data absoluta para tooltip (sempre dd/mm/aaaa hh:mm). */
export function dataAbsoluta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
