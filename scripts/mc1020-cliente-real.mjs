// MC102.0 — o CAS com o CLIENTE REAL (@netlify/blobs instalado nas functions) e o _lib/pedidos.mjs
// REAL, contra um servidor HTTP local que aplica If-Match (412) e devolve ETag no GET e no PUT.
// Não usa duplos de @netlify/blobs: é a medição que os testes unitários não conseguem fazer.
//   node scripts/mc1020-cliente-real.mjs            (foreground; sai 0 se tudo bater)
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const FN = join(dirname(fileURLToPath(import.meta.url)), "..", "desafio-gut", "frontend", "netlify", "functions");
const req = createRequire(join(FN, "package.json"));
const versao = req("@netlify/blobs/package.json").version;

const dados = new Map();
const puts = [];
const etagDe = (b) => `"${createHash("sha1").update(b).digest("hex")}"`;
const servidor = createServer((q, r) => {
  const k = decodeURIComponent(new URL(q.url, "http://x").pathname);
  const partes = []; q.on("data", (c) => partes.push(c)); q.on("end", () => {
    const atual = dados.get(k);
    if (q.method === "GET" || q.method === "HEAD") {
      if (!atual) { r.writeHead(404).end(); return; }
      r.writeHead(200, { etag: etagDe(atual), "content-type": "application/json" }).end(q.method === "GET" ? atual : undefined);
      return;
    }
    if (q.method === "PUT") {
      const ifMatch = q.headers["if-match"] ?? null;
      puts.push({ k, ifMatch });
      if (ifMatch !== null && (!atual || etagDe(atual) !== ifMatch)) { r.writeHead(412).end(); return; }
      const corpo = Buffer.concat(partes).toString("utf8");
      dados.set(k, corpo);
      r.writeHead(200, { etag: etagDe(corpo) }).end();
      return;
    }
    r.writeHead(405).end();
  });
});
await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${servidor.address().port}`;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({
  edgeURL: base, uncachedEdgeURL: base, token: "t", siteID: "site",
})).toString("base64");

const L = await import(pathToFileURL(join(FN, "_lib", "pedidos.mjs")).href);
const { getStore } = await import(pathToFileURL(req.resolve("@netlify/blobs")).href);
const s = getStore({ name: "pedidos", consistency: "strong" });

const PID = "11111111-2222-3333-4444-555555555555";
const COMPRADOR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const K = `pedido:${PID}`;
const semear = () => s.set(K, JSON.stringify({ produtoId: PID, comprador: COMPRADOR, produtoNome: "Air Fryer",
  morada: { nome: "x" }, rastreio: { codigo: "AA123456789BR", transportadora: "Correios" }, nfe: null, historico: [] }));
let falhas = 0;
const conferir = (nome, cond, info) => { console.log(`${cond ? "OK  " : "FALHA"} ${nome}${info ? " — " + info : ""}`); if (!cond) falhas++; };

console.log(`@netlify/blobs instalado: ${versao}`);
try {
  // CONTROLO: o setJSON real com onlyIfMatch — sai o If-Match?
  await semear();
  const { etag } = await s.getWithMetadata(K, { type: "json" });
  puts.length = 0;
  await s.setJSON(K, { teste: 1 }, { onlyIfMatch: etag });
  conferir("CONTROLO setJSON(onlyIfMatch) NÃO envia If-Match (defeito da biblioteca)", puts[0]?.ifMatch === null,
    `if-match=${puts[0]?.ifMatch}`);
  puts.length = 0;
  await s.set(K, "{}", { onlyIfMatch: etag });
  conferir("CONTROLO set(onlyIfMatch) envia If-Match", puts[0]?.ifMatch === etag);

  // ALVO: «Recebi» + NF-e em paralelo pelo código real.
  await semear();
  puts.length = 0;
  const [a, b] = await Promise.all([L.marcarRecebido(PID, COMPRADOR), L.definirNfe(PID, { numero: "123", serie: "1" })]);
  const f = JSON.parse(dados.get([...dados.keys()].find((k) => k.endsWith(K))));
  const putsPedido = puts.filter((p) => p.k.endsWith(K));
  conferir("recebido ok", a.ok === true, JSON.stringify(a.code ?? ""));
  conferir("nfe ok", b.ok === true, JSON.stringify(b.code ?? ""));
  conferir("recebido_em sobreviveu", !!f.recebido_em);
  conferir("nfe sobreviveu", f.nfe?.numero === "123");
  conferir("todos os PUT do pedido levaram If-Match", putsPedido.length > 0 && putsPedido.every((p) => p.ifMatch),
    `${putsPedido.length} PUT: ${putsPedido.map((p) => p.ifMatch ? "if-match" : "SEM").join(",")}`);
  conferir("houve pelo menos um 412 e retry (a corrida existiu)", putsPedido.length >= 3, `${putsPedido.length} PUT`);
  conferir("histórico sem duplicados", JSON.stringify(f.historico.map((h) => h.evento).sort()) === '["nfe_registada","recebido"]',
    JSON.stringify(f.historico.map((h) => h.evento)));
} finally {
  servidor.closeAllConnections();
  await new Promise((ok) => servidor.close(ok));
}
console.log(falhas === 0 ? "VEREDITO: VERDE" : `VEREDITO: VERMELHO (${falhas})`);
process.exitCode = falhas === 0 ? 0 : 1; // sem process.exit: evita o abort do libuv com handles a fechar
