// _stubs-provider/fingerprint.js — UTAC000.15. Duplo de `src/lib/fingerprint.js`.
// MEDIDO no SEG0: o `@fingerprintjs` real, sem DOM verdadeiro, entra num ciclo de `wait(50)` que
// nunca termina e mantém o processo vivo (o `node --test` acabava por timeout). É uma fronteira de
// browser (lê canvas/áudio/fontes), não lógica do Provider. Mesmas duas exportações do real.
export async function getVisitorId() { return "visitante-arnes"; }
export function getCachedVisitorId() { return null; }
