// UTAC140 (Frente D) — lógica PURA do Top 10 completo (sem React: testável com node --test).

/**
 * PURO — o que mostrar a partir da resposta do endpoint. `null` = não mostrar nada.
 * @param {{ok?:boolean, data?:any}|null} resp
 * @returns {{top10:object[], vencedor:object|null, produto:string|null}|null}
 */
export function decidirTop10Passe(resp) {
  const d = resp?.ok ? resp.data : null;
  if (!d || typeof d !== "object" || d.pronto !== true || d.valoresRestritos !== false) return null;
  if (!Array.isArray(d.top10) || d.top10.length === 0) return null;
  return { top10: d.top10, vencedor: d.vencedor ?? null, produto: typeof d.produto === "string" ? d.produto : null };
}

