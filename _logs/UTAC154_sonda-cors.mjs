// UTAC154 — sonda de CORS: preflight + pedido real, 4 origens, 2 endpoints. Só lê cabeçalhos.
const BASE = process.argv[2];
const ORIGENS = ["capacitor://localhost", "ionic://localhost", "https://localhost", "https://evil.example"];
const ESPERADO = { "capacitor://localhost": "capacitor://localhost", "ionic://localhost": "ionic://localhost", "https://localhost": "https://localhost", "https://evil.example": "https://localhost" };
const ALVOS = ["/.netlify/functions/recursos-app", "/.netlify/functions/edicoes"];
let falhas = 0;
for (const alvo of ALVOS) for (const o of ORIGENS) {
  const pf = await fetch(BASE + alvo, { method: "OPTIONS", headers: { Origin: o, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" } });
  const get = await fetch(BASE + alvo, { headers: { Origin: o } });
  const a1 = pf.headers.get("access-control-allow-origin"), a2 = get.headers.get("access-control-allow-origin");
  const ok = pf.status === 204 && a1 === ESPERADO[o] && a2 === ESPERADO[o] && (get.headers.get("vary") || "").includes("Origin");
  if (!ok) falhas++;
  console.log(`${ok ? "✓" : "✖"} ${alvo.split("/").pop().padEnd(13)} ${o.padEnd(22)} OPTIONS ${pf.status} ACAO=${a1} | GET ${get.status} ACAO=${a2} vary=${get.headers.get("vary")} cache=${get.headers.get("cache-control") || "-"} age=${get.headers.get("age") || "-"}`);
}
console.log(falhas ? `FALHAS: ${falhas}` : "TODOS OK");
process.exitCode = falhas ? 1 : 0;
