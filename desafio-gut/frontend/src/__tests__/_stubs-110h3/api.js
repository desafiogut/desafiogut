// _stubs-110h3/api.js — duplo de `src/lib/api.js` para o teste de comportamento do PainelIndicacao.
// Controla o que cada endpoint devolve, para o contador do mês (P1/DEBT-028) poder ser medido em 0/5/10.
let creditadas = null;   // null = o `ler-pontos` FALHA (prova do fail-soft do painel)
let codigo = "IND-ABC123";

export function definirIndicacoesMes(v) { creditadas = v; }
export function definirCodigo(v) { codigo = v; }

export function apiGet(caminho) {
  if (String(caminho).startsWith("referral?")) {
    return Promise.resolve({ ok: true, status: 200, data: {
      codigo, total_indicados: 3, total_convertidos: 2, senhas_ganhas: 7 } });
  }
  if (String(caminho) === "ler-pontos") {
    if (creditadas === null) return Promise.resolve({ ok: false, status: 503, data: null });
    return Promise.resolve({ ok: true, status: 200, data: {
      indicacoesMes: { mes: "2026-10", creditadas, limite: 10 } } });
  }
  return Promise.resolve({ ok: false, status: 404, data: null });
}

export function apiPost() { return Promise.resolve({ ok: false, status: 404, data: null }); }
export default { apiGet, apiPost };
