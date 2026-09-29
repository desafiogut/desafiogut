// Adaptador REAL de rastreio: Frenet (MC102.1b). Implementa o contrato de `_lib/rastreio.mjs`:
//   consultar(codigo, transportadora) → { eventos: [{ data, codigo }] }   ou lança (→ fallback lá em cima)
//
// Medido no PoC do SEG-1 (2026-09-29), não só lido na doc:
//   - a API responde HTTP 200 também aos erros; o erro vem em `ErrorMessage` → tem de ser lido;
//   - um código sem eventos devolve 200 sem `TrackingEvents` e sem erro → lista vazia, não é falha;
//   - sem `ShippingServiceCode` recusa. DEC-102.1b-10: só Correios, serviço fixo SEDEX 03220.
// DEC-102.1b-5 (LGPD): daqui só saem `data` e `codigo`. `EventLocation`/`EventDescription` nunca passam.
// O token vem de `process.env.FRENET_TOKEN` (Netlify) — NUNCA de código (HARD GATE 15).

export const URL_FRENET = "https://api.frenet.com.br/tracking/trackinginfo";
export const SERVICO_CORREIOS = "03220";

/** EventType da Frenet → código genérico de `src/lib/rastreio.js` (DEC-102.1b-9). O resto ignora-se. */
export const MAPA_FRENET = Object.freeze({
  "0": "0",   // Postado
  "1": "1",   // Em trânsito → A caminho
  "5": "3",   // Saiu para entrega
  "9": "4",   // Entregue
  "18": "A2", // Aguardando retirada
  "3": "A3",  // Devolvido
  "2": "A4",  // Atrasado → Entrega atrasada
  "4": "A5",  // Extraviado → Objeto extraviado
});

/**
 * "10/02/2017 16:48" (formato da doc da Frenet) → ISO em hora de Brasília ("2017-02-10T16:48:00-03:00").
 * ⚠️ Assume Brasília (UTC-3, sem horário de verão desde 2019): a doc não indica o fuso. Um ISO já válido
 * passa como vem; o resto → null (o evento conta, sem data).
 */
export function dataFrenetParaIso(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    // Ida e volta: o Date.parse do V8 aceita "2026-02-31" (salta para Março) — um dia inexistente é lixo.
    const [, d, mes, a, h, min, seg = "00"] = m;
    const cal = new Date(Date.UTC(+a, +mes - 1, +d));
    if (cal.getUTCDate() !== +d || cal.getUTCMonth() !== +mes - 1 || +h > 23 || +min > 59 || +seg > 59) return null;
    return `${a}-${mes}-${d}T${h}:${min}:${seg}-03:00`;
  }
  return /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}

/** TrackingEvents da Frenet → `[{ data, codigo }]`, só os tipos mapeados. */
export function mapearEventosFrenet(trackingEvents) {
  if (!Array.isArray(trackingEvents)) return [];
  const out = [];
  for (const e of trackingEvents) {
    const tipo = String(e?.EventType ?? "").trim();
    if (!Object.hasOwn(MAPA_FRENET, tipo)) continue;
    out.push({ data: dataFrenetParaIso(e?.EventDateTime), codigo: MAPA_FRENET[tipo] });
  }
  return out;
}

export const ehCorreios = (transportadora) => /correios/i.test(String(transportadora ?? ""));

/**
 * @param {{ token?: () => string|undefined, fetchImpl?: typeof fetch, timeoutMs?: number }} [deps]
 */
export function criarAdaptadorFrenet({ token = () => process.env.FRENET_TOKEN, fetchImpl = (...a) => fetch(...a), timeoutMs = 8000 } = {}) {
  return {
    async consultar(codigo, transportadora) {
      if (!ehCorreios(transportadora)) throw new Error("transportadora_nao_suportada");
      const t = token();
      if (!t) throw new Error("frenet_token_ausente");
      const res = await fetchImpl(URL_FRENET, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", token: t },
        body: JSON.stringify({ ShippingServiceCode: SERVICO_CORREIOS, TrackingNumber: String(codigo ?? "") }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`frenet_http_${res.status}`);
      const corpo = await res.json();
      if (corpo?.ErrorMessage) throw new Error("frenet_erro"); // a mensagem não se propaga (pode citar dados)
      return { eventos: mapearEventosFrenet(corpo?.TrackingEvents) };
    },
  };
}

export const adaptadorFrenet = criarAdaptadorFrenet();
