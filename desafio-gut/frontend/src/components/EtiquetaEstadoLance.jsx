// src/components/EtiquetaEstadoLance.jsx — UTAC107e.2 (Frente B). Etiqueta do PRÓPRIO lance, só depois do fecho.
//
// «SEU LANCE» (fixo, cor neutra) + «(estado)» (variável, na cor do estado) — decisão 3 do operador:
// só o que muda tem cor diferente.
//   🟢 menor          «(É O MENOR E ÚNICO)»
//   🔴 nao_menor      «(NÃO É O MENOR E ÚNICO)»
//   🟠 deixou_de_ser  «(DEIXOU DE SER O MENOR E ÚNICO)»
//
// ⚠️ Anti-bot MC28.1: nada disto existe durante a edição. Duas guardas: o ecrã só monta com
// `encerrado` (o chamador decide) e o servidor (`lances-flash?acao=meu-estado`, Bearer user-session)
// só calcula depois da CONSOLIDAÇÃO — antes devolve `estado:null`. O endereço sai do token: cada
// pessoa só recebe o estado dela.
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

// Cores medidas sobre o vidro padrão (#0d1235): ver o teste de contraste (WCAG ≥ 4,5:1).
export const COR_FIXA = "#e8f0fe";
export const ESTADOS_ETIQUETA = Object.freeze({
  menor:         Object.freeze({ texto: "(É O MENOR E ÚNICO)", cor: "#3ddc84" }),
  nao_menor:     Object.freeze({ texto: "(NÃO É O MENOR E ÚNICO)", cor: "#ff8a8d" }),
  deixou_de_ser: Object.freeze({ texto: "(DEIXOU DE SER O MENOR E ÚNICO)", cor: "#f5a623" }),
});

/** SEG3.4 — o estado da etiqueta a partir dos 2 flags do apuramento. */
export function estadoDaEtiqueta({ foiLiderAlgumaVez, eLiderFinal } = {}) {
  if (eLiderFinal === true) return "menor";
  if (foiLiderAlgumaVez === true) return "deixou_de_ser";
  return "nao_menor";
}

export default function EtiquetaEstadoLance({ estado }) {
  if (typeof estado !== "string" || !Object.hasOwn(ESTADOS_ETIQUETA, estado)) return null;
  const { texto, cor } = ESTADOS_ETIQUETA[estado];
  return (
    <div role="status" data-etiqueta-lance={estado} aria-label={`Seu lance ${texto}`}
      style={{
        display: "inline-flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
        gap: "0.35rem", alignSelf: "center", maxWidth: "100%",
        padding: "0.35rem 0.75rem", borderRadius: "999px",
        border: `1px solid ${cor}66`, background: `${cor}1f`,
        fontSize: "0.74rem", fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1.3, textAlign: "center",
      }}>
      <span style={{ color: COR_FIXA }}>SEU LANCE</span>
      <span style={{ color: cor }}>{texto}</span>
    </div>
  );
}

/**
 * Etiqueta do lance do titular numa edição — pergunta ao servidor e só desenha depois do fecho.
 * Sem `encerrado`, sem `authToken` ou sem lance do titular ⇒ não desenha nada.
 */
export function EtiquetaMeuLance({ edicaoId, encerrado, authToken, buscar = apiGet }) {
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    setEstado(null);
    if (!encerrado || !authToken || !edicaoId) return undefined;
    let cancelado = false;
    let id = null;
    const ler = async () => {
      try {
        const { ok, data } = await buscar(
          `lances-flash?acao=meu-estado&edicaoId=${encodeURIComponent(edicaoId)}`, { token: authToken });
        if (cancelado || !ok || !data) return;
        if (data.encerrado === true) {
          setEstado(data.temLance === true ? estadoDaEtiqueta(data) : null);
          return; // consolidado: o estado é final, não se volta a perguntar
        }
      } catch { /* fail-soft: sem etiqueta */ }
      // Encerrada no ecrã mas ainda por consolidar no servidor ⇒ volta a perguntar daqui a 60 s.
      if (!cancelado) id = setTimeout(ler, 60_000);
    };
    ler();
    return () => { cancelado = true; if (id) clearTimeout(id); };
  }, [edicaoId, encerrado, authToken, buscar]);

  return <EtiquetaEstadoLance estado={estado} />;
}
