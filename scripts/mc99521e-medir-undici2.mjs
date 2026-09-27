// mc99521e-medir-undici2.mjs — SEG0.1 (2.ª medição): contrato CORRIGIDO (`all: true` -> array).
// O 1.º instrumento mediu a assinatura e mostrou que o meu callback estava errado
// ("Invalid IP address: undefined") — o undici chama lookup com {hints:0, all:true} e espera
// um ARRAY de {address, family}. Corrigido e re-medido. Corre UMA VEZ.
import { createServer } from "node:http";
import { lookup as dnsLookup } from "node:dns/promises";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5e0000000049454e44ae426082", "hex");
let atingido = 0;
const isco = createServer((_q, r) => { atingido++; r.writeHead(200, { "Content-Type": "image/png" }); r.end(PNG); });
await new Promise((ok, err) => { isco.once("error", err); isco.listen(0, "::1", ok); });
const PORTA = isco.address().port;

const u = await import("undici");
let chamadas = 0;
// assinatura correcta: (err, [{address, family}])
const pin = (endereco, family) => function (hostname, options, callback) {
  chamadas++;
  console.log("  [lookup] host=" + hostname + " all=" + options?.all + " -> devolvo [" + endereco + "/" + family + "]");
  setImmediate(() => callback(null, [{ address: endereco, family }]));
};

console.log("=== Q2: pin para ::1, fetch a um NOME -> o isco responde? ===");
chamadas = 0;
try {
  const ag = new u.Agent({ connect: { lookup: pin("::1", 6) } });
  const r = await u.fetch("http://exemplo.com:" + PORTA + "/x.png", { dispatcher: ag, redirect: "error" });
  const ct = r.headers.get("content-type");
  console.log("  undici.fetch: status=" + r.status + " ct=" + ct + " -> " + (r.status === 200 && /image/.test(ct) ? "FIXOU no ::1 (isco respondeu)" : "NAO fixou"));
} catch (e) { console.log("  undici.fetch: ERRO " + (e.cause?.message || e.message)); }
console.log("  resolucoes DNS proprias: " + chamadas + " (esperado 1)");

console.log("\n=== Q3: HTTPS/SNI — pin no IPv4 real do i.imgur.com, fetch por NOME ===");
chamadas = 0;
try {
  const reais = await dnsLookup("i.imgur.com", { all: true });
  const v4 = reais.find((x) => x.family === 4);
  const ag = new u.Agent({ connect: { lookup: pin(v4.address, 4) } });
  const r = await u.fetch("https://i.imgur.com/qualquer-coisa-inexistente.png", { dispatcher: ag, headers: { Accept: "image/*" }, redirect: "error" });
  console.log("  status=" + r.status + " ct=" + r.headers.get("content-type") + " -> " + (r.status < 500 ? "TLS+SNI OK (o CDN respondeu pelo nome)" : "FALHOU"));
} catch (e) { console.log("  ERRO " + (e.cause?.message || e.message) + "  (404 seria ok: prova que o TLS fechou)"); }

console.log("\n=== Q4: o `fetch` GLOBAL do Node 24 aceita um Agent do undici do npm? ===");
chamadas = 0;
try {
  const ag = new u.Agent({ connect: { lookup: pin("::1", 6) } });
  const r = await fetch("http://exemplo.com:" + PORTA + "/x.png", { dispatcher: ag, redirect: "error" });
  const ct = r.headers.get("content-type");
  console.log("  fetch GLOBAL: status=" + r.status + " ct=" + ct + " lookups=" + chamadas + " -> " + (r.status === 200 && chamadas === 1 ? "COMPATIVEL (usa o meu lookup)" : "usou OUTRO resolver -> INCOMPATIVEL"));
} catch (e) { console.log("  fetch GLOBAL: ERRO " + (e.cause?.message || e.message) + " lookups=" + chamadas + " -> INCOMPATIVEL (symbols de versoes diferentes)"); }

console.log("\n=== Q3c: HTTPS via fetch GLOBAL + Agent npm ===");
chamadas = 0;
try {
  const reais = await dnsLookup("cdn.jsdelivr.net", { all: true });
  const v4 = reais.find((x) => x.family === 4);
  const ag = new u.Agent({ connect: { lookup: pin(v4.address, 4) } });
  const r = await fetch("https://cdn.jsdelivr.net/npm/react@18.2.0/package.json", { dispatcher: ag, redirect: "error" });
  console.log("  status=" + r.status + " lookups=" + chamadas);
} catch (e) { console.log("  ERRO " + (e.cause?.message || e.message) + " lookups=" + chamadas); }

console.log("\n=== Q6: lookup que RECUSA -> o fetch falha e o marcador propaga? ===");
try {
  const ag = new u.Agent({ connect: { lookup: (_h, _o, cb) => cb(new Error("__HOST_BLOQUEADO__")) } });
  await u.fetch("http://exemplo.com:" + PORTA + "/x.png", { dispatcher: ag, redirect: "error" });
  console.log("  NAO falhou (mau sinal)");
} catch (e) {
  const t = String(e) + " " + String(e.cause) + " " + String(e.cause?.cause);
  console.log("  falhou: " + e.message + " | cause=" + e.cause?.message + " | marcador=" + (/__HOST_BLOQUEADO__/.test(t) ? "PROPAGADO (-> posso devolver 403)" : "perdido (-> 502)"));
}
console.log("\nISCO atingido: " + atingido);
isco.close();
